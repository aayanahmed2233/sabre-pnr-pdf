"""
JARVIS configuration.

Single source of truth for settings. Stored as config.json next to the app.
No third-party dependencies.
"""

import json
import os
import sys


def app_dir() -> str:
    """Folder for config.json (next to the .exe when frozen, else this file)."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


CONFIG_PATH = os.path.join(app_dir(), "config.json")

# JARVIS persona + default brain settings.
DEFAULT_CONFIG = {
    # ---- Brain backend selection ----
    # "freellm" = cloud (FreeLLMAPI). "local" = offline llama.cpp (later phase).
    "ai_backend": "freellm",

    # ---- FreeLLMAPI (primary cloud brain) ----
    "base_url": "",          # e.g. https://your-free-llm-api.com
    "api_key": "",
    "model": "",             # blank -> auto-pick first available
    "system_prompt": (
        "You are J.A.R.V.I.S, a helpful, friendly AI assistant inspired by "
        "Tony Stark's AI. Answer clearly and concisely."
    ),
    "temperature": 0.7,
    "max_tokens": 1024,

    # ---- Local brain (optional, later phase) ----
    "local": {
        "enabled": False,
        "model_path": "",       # path to a .gguf file
        "runtime_path": "",     # path to llama-cli.exe / llama-server
        "n_ctx": 2048,
        "n_threads": 3,
    },

    # ---- Voice (later phase) ----
    "voice": {
        "enabled": False,
        "stt_engine": "vosk",   # "vosk" | "whisper"
        "tts_engine": "sapi",   # "sapi" | "espeak"
        "voice_name": "",
        "vosk_model": "",       # path to a Vosk model folder
        "wake_word": "jarvis",
        "language": "en-IN",    # Hinglish support handled in prompts
    },

    # ---- Security (permission + validation layer) ----
    "security": {
        # Roots the assistant may read/write within. Workspace & downloads are
        # added automatically at runtime if blank.
        "allowed_read_roots": [],
        "require_confirmation": [
            "delete", "overwrite", "install",
            "run_unknown_exe", "shutdown", "system_change",
            "input_control", "write",
        ],
        "block_run_unknown_exe": True,
        "max_cmd_timeout": 120,
    },

    # ---- Browser agent (Playwright, dedicated profile) ----
    "browser": {
        "enabled": False,
        "profile_dir": "",      # dedicated JARVIS profile; never the user's Chrome
        "headless": False,
        "download_dir": "",     # confined downloads
    },

    # ---- Coding agent ----
    "coding": {
        "workspace": "",        # dedicated project folder
        "backup_dir": "",       # change-tracking backups
    },

    # ---- Tools / agents toggles ----
    "tools": {"enabled": True},
    "multiagent": {"enabled": False},
}


class Config(dict):
    """A dict with attribute-style access and dotted helpers."""

    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError as e:
            raise AttributeError(item) from e

    def __setattr__(self, key, value):
        self[key] = value


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base (override wins)."""
    out = dict(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config() -> Config:
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))  # deep copy
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            user = json.load(f)
        cfg = _deep_merge(cfg, user)
    except (OSError, ValueError):
        pass
    return Config(cfg)


def save_config(cfg: dict) -> None:
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except OSError:
        pass