#!/usr/bin/env python3
"""
JARVIS - desktop AI assistant (Windows).

Phase 1: FreeLLMAPI cloud brain (primary) via a modular AI engine.
  - Set Base URL + API Key in Settings.
  - Models are fetched from the provider and selectable.
  - Replies stream live.

Voice, Windows control, browser, coding agent, local brain = later phases.
Runs on the Python standard library only (plus Tkinter from the Windows
Python installer). No third-party packages needed to RUN.
"""

import queue
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

from core.config import load_config, save_config
from ai.engine import AIEngine, AIError

# ----------------------------------------------------------------------------
# Theme
# ----------------------------------------------------------------------------
BG = "#0a0e14"
PANEL = "#111722"
ACCENT = "#22d3ee"
ACCENT_DIM = "#0e7490"
TEXT = "#e5eefc"
MUTED = "#7b8aa6"
USER_COLOR = "#7dd3fc"
BOT_COLOR = "#22d3ee"


class JarvisApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.cfg = load_config()
        self.engine = AIEngine(self.cfg)
        self.history = []            # [{'role','content'}]
        self.ui_queue = queue.Queue()
        self.busy = False

        self.title("J.A.R.V.I.S")
        self.geometry("880x700")
        self.minsize(640, 480)
        self.configure(bg=BG)

        self._build_style()
        self._build_ui()
        self._poll_queue()

        self._append("system",
                     f"JARVIS online. Brain: {self.cfg.get('ai_backend')}.")

        if not self.engine.is_ready():
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
                        bordercolor=ACCENT_DIM)
        style.map("TButton", background=[("active", ACCENT_DIM)])
        style.configure("TNotebook", background=BG, borderwidth=0)
        style.configure("TNotebook.Tab", background=PANEL, foreground=TEXT,
                        padding=(12, 6))
        style.map("TNotebook.Tab", background=[("selected", ACCENT_DIM)])

    def _build_ui(self):
        header = tk.Frame(self, bg=BG)
        header.pack(fill="x", padx=16, pady=(14, 6))
        tk.Label(header, text="J.A.R.V.I.S", bg=BG, fg=ACCENT,
                 font=("Segoe UI", 20, "bold")).pack(side="left")
        self.status_var = tk.StringVar(value="Ready")
        tk.Label(header, textvariable=self.status_var, bg=BG, fg=MUTED,
                 font=("Segoe UI", 9)).pack(side="right")

        bar = tk.Frame(self, bg=PANEL)
        bar.pack(fill="x", padx=16, pady=6)

        tk.Label(bar, text="Brain", bg=PANEL, fg=MUTED,
                 font=("Segoe UI", 9)).pack(side="left", padx=(10, 4))
        self.backend_var = tk.StringVar(value=self.cfg.get("ai_backend", "freellm"))
        self.backend_box = ttk.Combobox(
            bar, textvariable=self.backend_var, state="readonly", width=10,
            values=["freellm", "local"])
        self.backend_box.pack(side="left", padx=4)
        self.backend_box.bind("<<ComboboxSelected>>", self._on_backend_pick)

        tk.Label(bar, text="Model", bg=PANEL, fg=MUTED,
                 font=("Segoe UI", 9)).pack(side="left", padx=(12, 4))
        self.model_var = tk.StringVar(value=self.cfg.get("model", ""))
        self.model_box = ttk.Combobox(bar, textvariable=self.model_var,
                                      state="readonly", width=34)
        self.model_box.pack(side="left", padx=4)
        self.model_box.bind("<<ComboboxSelected>>", self._on_model_pick)

        ttk.Button(bar, text="Refresh models",
                   command=self.refresh_models).pack(side="left", padx=6)
        ttk.Button(bar, text="Clear chat",
                   command=self.clear_chat).pack(side="right", padx=6)
        ttk.Button(bar, text="Settings",
                   command=self.open_settings).pack(side="right", padx=6)

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

        row = tk.Frame(self, bg=BG)
        row.pack(fill="x", padx=16, pady=(0, 14))
        self.entry = scrolledtext.ScrolledText(
            row, height=3, bg=PANEL, fg=TEXT, wrap="word", bd=0,
            font=("Segoe UI", 11), insertbackground=ACCENT, relief="flat",
            padx=10, pady=8)
        self.entry.pack(side="left", fill="both", expand=True)
        self.entry.bind("<Return>", self._on_enter)
        self.send_btn = ttk.Button(row, text="Send", command=self.send_message)
        self.send_btn.pack(side="left", padx=(10, 0), fill="y")

    # ---- chat rendering ----
    def _append(self, kind, text):
        self.chat.configure(state="normal")
        label = {"user": "You", "bot": "JARVIS", "system": "›"}.get(kind, "")
        if label:
            self.chat.insert("end", f"{label}: ", kind)
        self.chat.insert("end", text + "\n\n", kind if kind == "system" else "body")
        self.chat.configure(state="disabled")
        self.chat.see("end")

    def _begin_bot(self):
        self.chat.configure(state="normal")
        self.chat.insert("end", "JARVIS: ", "bot")
        self.chat.configure(state="disabled")

    def _stream(self, text):
        self.chat.configure(state="normal")
        self.chat.insert("end", text, "body")
        self.chat.see("end")
        self.chat.configure(state="disabled")

    def _set_status(self, text):
        self.status_var.set(text)

    def clear_chat(self):
        self.chat.configure(state="normal")
        self.chat.delete("1.0", "end")
        self.chat.configure(state="disabled")
        self.history = []

    def _on_model_pick(self, _evt=None):
        self.cfg["model"] = self.model_var.get()
        save_config(self.cfg)

    def _on_backend_pick(self, _evt=None):
        self.cfg["ai_backend"] = self.backend_var.get()
        self.engine = AIEngine(self.cfg)
        save_config(self.cfg)
        self._append("system", f"Brain switched to: {self.cfg['ai_backend']}")
        self.refresh_models()

    def _on_enter(self, event):
        if event.state & 0x0001:  # Shift -> newline
            return
        self.send_message()
        return "break"

    # ---- settings ----
    def open_settings(self):
        SettingsDialog(self, self.cfg, on_saved=self._settings_saved)

    def _settings_saved(self, new_cfg):
        self.cfg.update(new_cfg)
        save_config(self.cfg)
        self.engine = AIEngine(self.cfg)
        self.backend_var.set(self.cfg.get("ai_backend"))
        self._append("system", "Settings saved.")
        self.refresh_models()

    # ---- models ----
    def refresh_models(self):
        if self.busy:
            return
        if not self.engine.is_ready():
            self._set_status(self.engine.ready_message())
            if self.cfg.get("ai_backend") == "freellm":
                messagebox.showinfo("JARVIS", self.engine.ready_message())
                self.open_settings()
            return
        if self.cfg.get("ai_backend") == "local":
            self._set_status(self.engine.ready_message())
            return

        self.busy = True
        self._set_status("Fetching models…")
        self.send_btn.configure(state="disabled")

        def worker():
            try:
                models = self.engine.list_models()
                self.ui_queue.put(("models", models))
            except AIError as e:
                self.ui_queue.put(("error", str(e)))
            except Exception as e:  # noqa: BLE001
                self.ui_queue.put(("error", str(e)))

        threading.Thread(target=worker, daemon=True).start()

    # ---- send ----
    def send_message(self):
        if self.busy:
            return
        text = self.entry.get("1.0", "end").strip()
        if not text:
            return
        if not self.engine.is_ready():
            messagebox.showinfo("JARVIS", self.engine.ready_message())
            self.open_settings()
            return

        self.entry.delete("1.0", "end")
        self._append("user", text)
        self.history.append({"role": "user", "content": text})

        self.busy = True
        self.send_btn.configure(state="disabled", text="…")
        self._set_status("Thinking…")
        self._begin_bot()

        def on_token(piece):
            self.ui_queue.put(("token", piece))

        def worker():
            try:
                full = self.engine.chat(self.history, on_token=on_token)
                self.ui_queue.put(("done", full or "(empty response)"))
            except AIError as e:
                self.ui_queue.put(("error", str(e)))
            except Exception as e:  # noqa: BLE001
                self.ui_queue.put(("error", str(e)))

        threading.Thread(target=worker, daemon=True).start()

    # ---- queue pump ----
    def _poll_queue(self):
        try:
            while True:
                kind, payload = self.ui_queue.get_nowait()
                if kind == "token":
                    self._stream(payload)
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
                    self.history.append({"role": "assistant", "content": payload})
                    self.chat.configure(state="normal")
                    self.chat.insert("end", "\n\n")
                    self.chat.configure(state="disabled")
                    self._set_status("Ready")
                    self.busy = False
                    self.send_btn.configure(state="normal", text="Send")
                elif kind == "error":
                    self.chat.configure(state="normal")
                    self.chat.insert("end", f"[error: {payload}]\n\n")
                    self.chat.configure(state="disabled")
                    self._set_status("Error")
                    self.busy = False
                    self.send_btn.configure(state="normal", text="Send")
                    messagebox.showerror("JARVIS", payload)
        except queue.Empty:
            pass
        self.after(60, self._poll_queue)


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

        # Brain selector
        tk.Label(frm, text="AI Brain", bg=BG, fg=ACCENT, anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w")
        self.backend_var = tk.StringVar(value=cfg.get("ai_backend", "freellm"))
        ttk.Combobox(frm, textvariable=self.backend_var, state="readonly",
                     values=["freellm", "local"], width=42).grid(
                        row=1, column=0, sticky="we", pady=(2, 6))

        self.vars = {}
        fields = [
            ("base_url", "Base URL (FreeLLMAPI)", "e.g. https://your-free-llm-api.com"),
            ("api_key", "API Key", "your FreeLLMAPI key"),
            ("model", "Model", "blank = auto-pick first"),
            ("system_prompt", "System prompt", "JARVIS persona"),
        ]
        r = 2
        for key, label, _hint in fields:
            tk.Label(frm, text=label, bg=BG, fg=ACCENT, anchor="w",
                     font=("Segoe UI", 10, "bold")).grid(
                        row=r, column=0, sticky="w", pady=(6, 0))
            if key == "system_prompt":
                w = tk.Text(frm, height=3, width=46, bg=PANEL, fg=TEXT,
                            insertbackground=ACCENT, relief="flat", wrap="word")
                w.insert("1.0", str(cfg.get(key, "")))
                w.grid(row=r + 1, column=0, sticky="we", pady=(2, 6))
                self.vars[key] = w
            else:
                var = tk.StringVar(value=str(cfg.get(key, "")))
                self.vars[key] = var
                show = "•" if key == "api_key" and var.get() else ""
                tk.Entry(frm, textvariable=var, bg=PANEL, fg=TEXT, show=show,
                         insertbackground=ACCENT, relief="flat", width=44).grid(
                            row=r + 1, column=0, sticky="we", pady=(2, 6))
            r += 2

        tk.Label(frm, text="Temperature", bg=BG, fg=ACCENT, anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=r, column=0, sticky="w")
        self.temp_var = tk.DoubleVar(value=float(cfg.get("temperature", 0.7)))
        tk.Scale(frm, from_=0.0, to=1.5, resolution=0.1, orient="horizontal",
                 variable=self.temp_var, bg=BG, fg=TEXT, troughcolor=PANEL,
                 highlightthickness=0, length=320).grid(row=r + 1, column=0, sticky="we")

        btns = tk.Frame(frm, bg=BG)
        btns.grid(row=r + 2, column=0, sticky="e", pady=(16, 0))
        ttk.Button(btns, text="Cancel", command=self.destroy).pack(side="right", padx=4)
        ttk.Button(btns, text="Save", command=self._save).pack(side="right", padx=4)

    def _save(self):
        out = dict(self.cfg)
        out["ai_backend"] = self.backend_var.get()
        out["base_url"] = self.vars["base_url"].get().strip()
        out["api_key"] = self.vars["api_key"].get().strip()
        out["model"] = self.vars["model"].get().strip()
        out["system_prompt"] = self.vars["system_prompt"].get("1.0", "end").strip()
        out["temperature"] = round(float(self.temp_var.get()), 2)
        if out["ai_backend"] == "freellm" and (not out["base_url"] or not out["api_key"]):
            messagebox.showwarning("Settings",
                                   "Base URL and API Key are required for the "
                                   "FreeLLMAPI brain.", parent=self)
            return
        self.on_saved(out)
        self.destroy()


def main():
    app = JarvisApp()
    app.mainloop()


if __name__ == "__main__":
    main()