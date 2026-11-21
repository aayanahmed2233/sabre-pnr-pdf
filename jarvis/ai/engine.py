"""
JARVIS AI engine.

The engine is brain-agnostic: it talks to a backend (FreeLLMAPI cloud, or a
local llama.cpp runtime) through a common interface. The AI NEVER executes
anything itself - it only produces text/tool-call requests. Execution always
goes through the Security + Tool layer (added in a later phase).

This file (Phase 1) provides:
  - FreeLLMApiBackend : OpenAI-compatible streaming chat via stdlib urllib.
  - LocalBackend       : placeholder for the no-AVX llama.cpp runtime (Phase 2).
  - AIEngine           : chooses a backend from config, streams replies.

No third-party dependencies. Python standard library only.
"""

import json
import queue
import threading
import urllib.request
import urllib.error


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def api_base(base_url: str) -> str:
    """Normalize base URL so it ends with the version segment (/v1)."""
    url = (base_url or "").strip().rstrip("/")
    if not url:
        return ""
    if not url.endswith("/v1"):
        url += "/v1"
    return url


class AIError(Exception):
    """Raised for user-facing AI/backend errors."""


# ---------------------------------------------------------------------------
# Backend interface
# ---------------------------------------------------------------------------

class Backend:
    """Common interface every AI brain backend must implement."""

    name = "base"

    def is_ready(self, cfg) -> bool:
        raise NotImplementedError

    def ready_message(self) -> str:
        return "Not configured."

    def list_models(self, cfg):
        """Return a list of model ids, or [] if unsupported."""
        return []

    def chat(self, cfg, messages, on_token=None):
        """
        Stream a chat completion. Calls on_token(text_piece) as tokens arrive.
        Returns the full assistant text.
        """
        raise NotImplementedError


# ---------------------------------------------------------------------------
# FreeLLMAPI backend (primary cloud brain)
# ---------------------------------------------------------------------------

class FreeLLMApiBackend(Backend):
    name = "freellm"

    def is_ready(self, cfg) -> bool:
        return bool(cfg.get("base_url") and cfg.get("api_key"))

    def ready_message(self) -> str:
        return "Set Base URL and API Key in Settings."

    def _headers(self, api_key, stream=False):
        h = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "text/event-stream" if stream else "application/json",
        }
        return h

    def list_models(self, cfg):
        url = f"{api_base(cfg.get('base_url'))}/models"
        req = urllib.request.Request(
            url, headers=self._headers(cfg.get("api_key")), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8", "replace") or "{}")
        except urllib.error.HTTPError as e:
            raise AIError(f"HTTP {e.code}: {e.reason}") from e
        except Exception as e:  # noqa: BLE001
            raise AIError(str(e)) from e

        items = data.get("data") or data.get("models") or []
        ids = []
        for it in items:
            if isinstance(it, dict):
                mid = it.get("id") or it.get("name")
                if mid:
                    ids.append(mid)
            elif isinstance(it, str):
                ids.append(it)
        return sorted(set(ids))

    def chat(self, cfg, messages, on_token=None):
        url = f"{api_base(cfg.get('base_url'))}/chat/completions"
        payload = {
            "model": cfg.get("model") or "",
            "messages": messages,
            "temperature": float(cfg.get("temperature", 0.7)),
            "max_tokens": int(cfg.get("max_tokens", 1024)),
            "stream": bool(on_token),
        }
        data = json.dumps(payload).encode("utf-8")
        headers = self._headers(cfg.get("api_key"), stream=bool(on_token))
        headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers,
                                     method="POST")

        # Non-streaming
        if not on_token:
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    obj = json.loads(resp.read().decode("utf-8", "replace"))
                return obj["choices"][0]["message"]["content"]
            except urllib.error.HTTPError as e:
                detail = _read_err(e)
                raise AIError(f"HTTP {e.code}: {e.reason}\n{detail}") from e
            except Exception as e:  # noqa: BLE001
                raise AIError(str(e)) from e

        # Streaming (Server-Sent Events)
        full = []
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                for raw in resp:
                    line = raw.decode("utf-8", "replace").strip()
                    if not line or not line.startswith("data:"):
                        continue
                    chunk = line[len("data:"):].strip()
                    if chunk == "[DONE]":
                        break
                    try:
                        obj = json.loads(chunk)
                        piece = obj["choices"][0].get("delta", {}).get("content")
                        if piece:
                            full.append(piece)
                            on_token(piece)
                    except (ValueError, KeyError, IndexError):
                        continue
        except urllib.error.HTTPError as e:
            detail = _read_err(e)
            raise AIError(f"HTTP {e.code}: {e.reason}\n{detail}") from e
        except Exception as e:  # noqa: BLE001
            raise AIError(str(e)) from e
        return "".join(full)


# ---------------------------------------------------------------------------
# Local llama.cpp backend (placeholder - implemented in Phase 2)
# ---------------------------------------------------------------------------

class LocalBackend(Backend):
    name = "local"

    def is_ready(self, cfg) -> bool:
        loc = cfg.get("local", {}) or {}
        return bool(loc.get("enabled") and loc.get("model_path")
                    and loc.get("runtime_path"))

    def ready_message(self) -> str:
        return ("Local brain not configured yet (Phase 2). Requires a no-AVX "
                "llama.cpp build + a GGUF model path.")

    def list_models(self, cfg):
        return []

    def chat(self, cfg, messages, on_token=None):
        raise AIError(
            "Local (offline) brain is not built yet. It arrives in Phase 2 "
            "(no-AVX llama.cpp + a small GGUF model). Use the FreeLLMAPI brain "
            "for now by setting ai_backend to 'freellm' in Settings.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_err(e) -> str:
    try:
        return e.read().decode("utf-8", "replace")[:400]
    except Exception:  # noqa: BLE001
        return ""


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

BACKENDS = {
    "freellm": FreeLLMApiBackend,
    "local": LocalBackend,
}


class AIEngine:
    """Chooses a backend from config and streams chat replies."""

    def __init__(self, cfg):
        self.cfg = cfg
        self._backend = None
        self._backend_key = None

    def backend(self) -> Backend:
        key = self.cfg.get("ai_backend", "freellm")
        if self._backend is None or self._backend_key != key:
            cls = BACKENDS.get(key, FreeLLMApiBackend)
            self._backend = cls()
            self._backend_key = key
        return self._backend

    def is_ready(self) -> bool:
        return self.backend().is_ready(self.cfg)

    def ready_message(self) -> str:
        return self.backend().ready_message()

    def list_models(self):
        return self.backend().list_models(self.cfg)

    def build_messages(self, history):
        """Prepend the system prompt to a chat history."""
        msgs = []
        sp = self.cfg.get("system_prompt")
        if sp:
            msgs.append({"role": "system", "content": sp})
        msgs.extend(history)
        return msgs

    def chat(self, history, on_token=None):
        """Stream a reply. `history` is a list of {'role','content'} dicts."""
        return self.backend().chat(
            self.cfg, self.build_messages(history), on_token=on_token)