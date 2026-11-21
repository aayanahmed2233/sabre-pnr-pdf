#!/usr/bin/env python3
"""
JARVIS - a desktop AI assistant for Windows.

Connects to any OpenAI-compatible API (your FreeLLMAPI) using a base URL + key,
fetches the available models, lets you pick one, and chats with it in a
Jarvis-styled window.

Runs with the Python standard library only (plus tkinter, which ships with the
official Windows Python installer). No third-party packages required to run.
"""

import json
import os
import sys
import threading
import queue
import urllib.request
import urllib.error
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

# ----------------------------------------------------------------------------
# Config handling
# ----------------------------------------------------------------------------

APP_NAME = "JARVIS"


def app_dir() -> str:
    """Folder where config.json lives (next to the .exe when frozen)."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


CONFIG_PATH = os.path.join(app_dir(), "config.json")

DEFAULT_CONFIG = {
    "base_url": "",
    "api_key": "",
    "model": "",
    "system_prompt": "You are JARVIS, a helpful, friendly AI assistant inspired by "
    "Tony Stark's AI. Answer clearly and concisely.",
    "temperature": 0.7,
}


def load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg.update(json.load(f))
    except (OSError, ValueError):
        pass
    return cfg


def save_config(cfg: dict) -> None:
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except OSError:
        pass


# ----------------------------------------------------------------------------
# API helpers
# ----------------------------------------------------------------------------

def api_base(base_url: str) -> str:
    """Normalize the base URL so it ends with the version segment."""
    url = (base_url or "").strip().rstrip("/")
    if not url:
        return ""
    if not url.endswith("/v1"):
        url += "/v1"
    return url


def http_json(url: str, api_key: str, payload=None, method="GET", timeout=60):
    """Make a JSON HTTP request. Returns parsed JSON or raises on error."""
    data = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
        method = "POST"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", "replace")
    return json.loads(body) if body else {}


def fetch_models(base_url: str, api_key: str):
    """Return a list of model ids available from the provider."""
    data = http_json(f"{api_base(base_url)}/models", api_key, timeout=30)
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


def chat_completion(base_url, api_key, model, messages, temperature,
                    on_token=None):
    """
    Call /chat/completions. If on_token is given and the server supports
    streaming, tokens are pushed to on_token as they arrive. Returns the full
    assistant text.
    """
    base = api_base(base_url)
    url = f"{base}/chat/completions"
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": bool(on_token),
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream" if on_token else "application/json",
    }
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers=headers, method="POST",
    )

    if not on_token:
        data = http_json(url, api_key, payload=payload, timeout=120)
        return data["choices"][0]["message"]["content"]

    # Streaming path: parse Server-Sent Events.
    full = []
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
                delta = obj["choices"][0].get("delta", {})
                piece = delta.get("content")
                if piece:
                    full.append(piece)
                    on_token(piece)
            except (ValueError, KeyError, IndexError):
                continue
    return "".join(full)


# ----------------------------------------------------------------------------
# GUI
# ----------------------------------------------------------------------------

BG = "#0a0e14"
PANEL = "#111722"
ACCENT = "#22d3ee"      # cyan
ACCENT_DIM = "#0e7490"
TEXT = "#e5eefc"
MUTED = "#7b8aa6"
USER_COLOR = "#7dd3fc"
BOT_COLOR = "#22d3ee"


class JarvisApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.cfg = load_config()
        self.messages = []          # conversation history
        self.ui_queue = queue.Queue()
        self.busy = False

        self.title(APP_NAME)
        self.geometry("860x680")
        self.minsize(640, 480)
        self.configure(bg=BG)

        self._build_style()
        self._build_ui()
        self._poll_queue()

        # Header greeting
        self._append("system", "JARVIS online. Configure your FreeLLMAPI in Settings to begin.")

        if not self.cfg.get("api_key") or not self.cfg.get("base_url"):
            self.after(300, self.open_settings)

    # ---- styling ----
    def _build_style(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TCombobox", fieldbackground=PANEL, background=PANEL,
                        foreground=TEXT, arrowcolor=ACCENT)
        style.configure("TButton", background=PANEL, foreground=TEXT,
                        bordercolor=ACCENT_DIM, focustext=TEXT)
        style.map("TButton", background=[("active", ACCENT_DIM)])

    def _build_ui(self):
        # Header
        header = tk.Frame(self, bg=BG)
        header.pack(fill="x", padx=16, pady=(14, 6))

        title = tk.Label(header, text="J.A.R.V.I.S", bg=BG, fg=ACCENT,
                         font=("Segoe UI", 20, "bold"))
        title.pack(side="left")

        self.status_var = tk.StringVar(value="Ready")
        tk.Label(header, textvariable=self.status_var, bg=BG, fg=MUTED,
                 font=("Segoe UI", 9)).pack(side="right")

        # Top bar: model selector + buttons
        bar = tk.Frame(self, bg=PANEL)
        bar.pack(fill="x", padx=16, pady=6)

        tk.Label(bar, text="Model", bg=PANEL, fg=MUTED,
                 font=("Segoe UI", 9)).pack(side="left", padx=(10, 4))
        self.model_var = tk.StringVar(value=self.cfg.get("model", ""))
        self.model_box = ttk.Combobox(bar, textvariable=self.model_var,
                                      state="readonly", width=34)
        self.model_box.pack(side="left", padx=4)
        self.model_box.bind("<<ComboboxSelected>>", self._on_model_pick)

        ttk.Button(bar, text="Refresh models",
                   command=self.refresh_models).pack(side="left", padx=6)
        ttk.Button(bar, text="Settings",
                   command=self.open_settings).pack(side="right", padx=6)
        ttk.Button(bar, text="Clear chat",
                   command=self.clear_chat).pack(side="right", padx=6)

        # Chat area
        self.chat = scrolledtext.ScrolledText(
            self, bg=BG, fg=TEXT, wrap="word", bd=0, padx=14, pady=12,
            font=("Segoe UI", 11), insertbackground=ACCENT,
            state="disabled", relief="flat")
        self.chat.pack(fill="both", expand=True, padx=16, pady=8)
        self.chat.tag_config("user", foreground=USER_COLOR,
                             font=("Segoe UI", 11, "bold"))
        self.chat.tag_config("bot", foreground=BOT_COLOR,
                             font=("Segoe UI", 11, "bold"))
        self.chat.tag_config("system", foreground=MUTED,
                             font=("Segoe UI", 10, "italic"))
        self.chat.tag_config("body", foreground=TEXT,
                             font=("Segoe UI", 11))

        # Input row
        row = tk.Frame(self, bg=BG)
        row.pack(fill="x", padx=16, pady=(0, 14))

        self.entry = scrolledtext.ScrolledText(
            row, height=3, bg=PANEL, fg=TEXT, wrap="word", bd=0,
            font=("Segoe UI", 11), insertbackground=ACCENT, relief="flat",
            padx=10, pady=8)
        self.entry.pack(side="left", fill="both", expand=True)
        self.entry.bind("<Return>", self._on_enter)
        self.entry.bind("<Shift-Return>", lambda e: None)  # allow newline

        self.send_btn = ttk.Button(row, text="Send", command=self.send_message)
        self.send_btn.pack(side="left", padx=(10, 0), fill="y")

    # ---- UI helpers ----
    def _append(self, kind, text):
        self.chat.configure(state="normal")
        label = {"user": "You", "bot": "JARVIS", "system": "›"}.get(kind, "")
        if label:
            self.chat.insert("end", f"{label}: ", kind)
        self.chat.insert("end", text + "\n\n", "body" if kind != "system" else "system")
        self.chat.configure(state="disabled")
        self.chat.see("end")

    def _append_bot_stream(self, text):
        self.chat.configure(state="normal")
        self.chat.insert("end", text, "body")
        self.chat.see("end")
        self.chat.configure(state="disabled")

    def _begin_bot(self):
        self.chat.configure(state="normal")
        self.chat.insert("end", "JARVIS: ", "bot")
        self.chat.configure(state="disabled")

    def _set_status(self, text):
        self.status_var.set(text)

    def clear_chat(self):
        self.chat.configure(state="normal")
        self.chat.delete("1.0", "end")
        self.chat.configure(state="disabled")
        self.messages = []

    def _on_model_pick(self, _evt=None):
        self.cfg["model"] = self.model_var.get()
        save_config(self.cfg)

    def _on_enter(self, event):
        if event.state & 0x0001:  # Shift held -> insert newline
            return
        self.send_message()
        return "break"

    # ---- settings ----
    def open_settings(self):
        SettingsDialog(self, self.cfg, on_saved=self._settings_saved)

    def _settings_saved(self, new_cfg):
        self.cfg.update(new_cfg)
        save_config(self.cfg)
        self._append("system", "Settings saved.")
        self.refresh_models()

    # ---- models ----
    def refresh_models(self):
        if self.busy:
            return
        if not self.cfg.get("base_url") or not self.cfg.get("api_key"):
            messagebox.showinfo(APP_NAME, "Add a base URL and API key in Settings first.")
            self.open_settings()
            return
        self.busy = True
        self._set_status("Fetching models…")
        self.send_btn.configure(state="disabled")

        def worker():
            try:
                models = fetch_models(self.cfg["base_url"], self.cfg["api_key"])
                self.ui_queue.put(("models", models))
            except urllib.error.HTTPError as e:
                self.ui_queue.put(("error", f"HTTP {e.code}: {e.reason}"))
            except Exception as e:  # noqa: BLE001
                self.ui_queue.put(("error", str(e)))

        threading.Thread(target=worker, daemon=True).start()

    # ---- send message ----
    def send_message(self):
        if self.busy:
            return
        text = self.entry.get("1.0", "end").strip()
        if not text:
            return
        if not self.cfg.get("base_url") or not self.cfg.get("api_key"):
            messagebox.showinfo(APP_NAME, "Configure Settings first.")
            self.open_settings()
            return
        if not self.cfg.get("model"):
            messagebox.showinfo(APP_NAME, "Pick a model first (Refresh models).")
            return

        self.entry.delete("1.0", "end")
        self._append("user", text)
        self.messages.append({"role": "user", "content": text})

        self.busy = True
        self.send_btn.configure(state="disabled", text="…")
        self._set_status("Thinking…")

        convo = []
        if self.cfg.get("system_prompt"):
            convo.append({"role": "system", "content": self.cfg["system_prompt"]})
        convo.extend(self.messages)

        self._begin_bot()

        def on_token(piece):
            self.ui_queue.put(("token", piece))

        def worker():
            try:
                full = chat_completion(
                    self.cfg["base_url"], self.cfg["api_key"],
                    self.cfg["model"], convo,
                    float(self.cfg.get("temperature", 0.7)),
                    on_token=on_token,
                )
                if not full:
                    full = "(empty response)"
                self.ui_queue.put(("done", full))
            except urllib.error.HTTPError as e:
                detail = ""
                try:
                    detail = e.read().decode("utf-8", "replace")[:300]
                except Exception:  # noqa: BLE001
                    pass
                self.ui_queue.put(("error", f"HTTP {e.code}: {e.reason}\n{detail}"))
            except Exception as e:  # noqa: BLE001
                self.ui_queue.put(("error", str(e)))

        threading.Thread(target=worker, daemon=True).start()

    # ---- queue polling (marshals worker results onto the UI thread) ----
    def _poll_queue(self):
        try:
            while True:
                kind, payload = self.ui_queue.get_nowait()
                if kind == "token":
                    self._append_bot_stream(payload)
                elif kind == "models":
                    self.model_box["values"] = payload
                    if payload and self.model_var.get() not in payload:
                        self.model_var.set(payload[0])
                        self.cfg["model"] = payload[0]
                        save_config(self.cfg)
                    self._set_status(f"{len(payload)} models available")
                    self.busy = False
                    self.send_btn.configure(state="normal", text="Send")
                elif kind == "done":
                    self.messages.append({"role": "assistant", "content": payload})
                    self.chat.configure(state="normal")
                    self.chat.insert("end", "\n\n")
                    self.chat.configure(state="disabled")
                    self._set_status("Ready")
                    self.busy = False
                    self.send_btn.configure(state="normal", text="Send")
                elif kind == "error":
                    # finish the bot block cleanly
                    self.chat.configure(state="normal")
                    self.chat.insert("end", f"[error: {payload}]\n\n")
                    self.chat.configure(state="disabled")
                    self._set_status("Error")
                    self.busy = False
                    self.send_btn.configure(state="normal", text="Send")
                    messagebox.showerror(APP_NAME, payload)
        except queue.Empty:
            pass
        self.after(60, self._poll_queue)


# ----------------------------------------------------------------------------
# Settings dialog
# ----------------------------------------------------------------------------

class SettingsDialog(tk.Toplevel):
    def __init__(self, master, cfg, on_saved):
        super().__init__(master)
        self.cfg = cfg
        self.on_saved = on_saved
        self.title("Settings")
        self.configure(bg=BG)
        self.resizable(False, False)
        self.transient(master)
        self.grab_set()

        frm = tk.Frame(self, bg=BG)
        frm.pack(fill="both", expand=True, padx=20, pady=18)

        self.vars = {}
        fields = [
            ("base_url", "Base URL", "e.g. https://your-free-llm-api.com/v1"),
            ("api_key", "API Key", "your FreeLLMAPI key"),
            ("model", "Model", "leave blank to auto-pick first"),
            ("system_prompt", "System prompt", "JARVIS persona / instructions"),
        ]
        for i, (key, label, hint) in enumerate(fields):
            tk.Label(frm, text=label, bg=BG, fg=ACCENT, anchor="w",
                     font=("Segoe UI", 10, "bold")).grid(
                        row=i * 2, column=0, sticky="w", pady=(6, 0))
            var = tk.StringVar(value=str(cfg.get(key, "")))
            self.vars[key] = var
            if key == "system_prompt":
                w = tk.Text(frm, height=3, width=46, bg=PANEL, fg=TEXT,
                            insertbackground=ACCENT, relief="flat", wrap="word")
                w.insert("1.0", var.get())
                w.grid(row=i * 2 + 1, column=0, sticky="we", pady=(2, 6))
                self.vars[key] = w
            else:
                show = "•" if key == "api_key" and var.get() else ""
                e = tk.Entry(frm, textvariable=var, bg=PANEL, fg=TEXT,
                             insertbackground=ACCENT, relief="flat", width=44,
                             show=show)
                e.grid(row=i * 2 + 1, column=0, sticky="we", pady=(2, 6))

        # temperature slider
        r = len(fields) * 2
        tk.Label(frm, text="Temperature", bg=BG, fg=ACCENT, anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=r, column=0, sticky="w", pady=(6, 0))
        self.temp_var = tk.DoubleVar(value=float(cfg.get("temperature", 0.7)))
        tk.Scale(frm, from_=0.0, to=1.5, resolution=0.1, orient="horizontal",
                 variable=self.temp_var, bg=BG, fg=TEXT, troughcolor=PANEL,
                 highlightthickness=0, length=320).grid(row=r + 1, column=0, sticky="we")

        btns = tk.Frame(frm, bg=BG)
        btns.grid(row=r + 2, column=0, sticky="e", pady=(16, 0))
        ttk.Button(btns, text="Cancel", command=self.destroy).pack(side="right", padx=4)
        ttk.Button(btns, text="Save", command=self._save).pack(side="right", padx=4)

    def _save(self):
        out = {
            "base_url": self.vars["base_url"].get().strip(),
            "api_key": self.vars["api_key"].get().strip(),
            "model": self.vars["model"].get().strip(),
            "system_prompt": self.vars["system_prompt"].get("1.0", "end").strip(),
            "temperature": round(float(self.temp_var.get()), 2),
        }
        if not out["base_url"] or not out["api_key"]:
            messagebox.showwarning("Settings", "Base URL and API Key are required.",
                                   parent=self)
            return
        self.on_saved(out)
        self.destroy()


def main():
    app = JarvisApp()
    app.mainloop()


if __name__ == "__main__":
    main()