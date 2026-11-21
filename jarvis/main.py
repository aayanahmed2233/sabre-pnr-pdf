#!/usr/bin/env python3
"""
JARVIS - desktop AI assistant (Windows).

Animated, HD-style UI + modular backend:
  - Brain: FreeLLMAPI (cloud, primary) with live streaming; local stub for later.
  - Security layer: every tool/action passes the permission gate.
  - Tools: file, app, system, keyboard/mouse, screen reader.
  - Coding agent, memory, multi-agent, voice (optional).

Runs on the Python standard library only (plus Tkinter). No third-party
packages needed to RUN the core app.
"""

import os
import queue
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

from core.config import load_config, save_config, app_dir
from core.security import Security
from ai.engine import AIEngine, AIError
from tools.registry import ToolRegistry, Tool
from tools import (file_agent, app_agent, system_monitor,
                   keyboard_mouse, screen_reader)
from memory.store import Memory
from ui.widgets import ArcReactor, hoverify, palette

# Optional agents (disabled gracefully if deps missing)
try:
    from agents.coding_agent import CodingAgent
    from agents.browser_agent import BrowserAgent
except Exception:  # noqa: BLE001
    CodingAgent = None
    BrowserAgent = None

C = palette
BG = C["bg"]
PANEL = C["panel"]


class JarvisApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.cfg = load_config()
        self.engine = AIEngine(self.cfg)
        self.history = []
        self.ui_queue = queue.Queue()
        self.busy = False

        # ---- Security + tools foundation ----
        base = app_dir()
        self.security = Security.from_config(self.cfg)
        self.security.confirm_callback = self._confirm_prompt
        self.workspace_dir = self.cfg.get("coding", {}).get("workspace") or \
            os.path.join(base, "workspace")
        self.download_dir = self.cfg.get("browser", {}).get("download_dir") or \
            os.path.join(base, "downloads")
        self.backup_dir = self.cfg.get("coding", {}).get("backup_dir") or \
            os.path.join(base, "backups")
        for p in (base, self.workspace_dir, self.download_dir, self.backup_dir):
            try:
                os.makedirs(p, exist_ok=True)
            except OSError:
                pass
            self.security.add_read_root(p)
        for p in (self.workspace_dir, self.download_dir, self.backup_dir):
            self.security.add_write_root(p)

        self.registry = ToolRegistry(self.security, {"cfg": self.cfg})
        self._register_tools()

        # Memory + restore history
        self.memory = Memory(os.path.join(base, "memory"))
        try:
            prev = self.memory.load_history()
            if prev:
                self.history = prev
        except Exception:  # noqa: BLE001
            pass

        # Coding agent
        self.coding = None
        if CodingAgent is not None:
            try:
                self.coding = CodingAgent(self.security, self.workspace_dir,
                                          self.backup_dir)
            except Exception:  # noqa: BLE001
                self.coding = None

        # Browser agent (Playwright; dedicated or real-Chrome mode)
        self.browser = None
        if BrowserAgent is not None:
            try:
                b = self.cfg.get("browser", {}) or {}
                self.browser = BrowserAgent(
                    self.security,
                    profile_dir=b.get("profile_dir") or
                    os.path.join(base, "jarvis_browser_profile"),
                    download_dir=self.download_dir,
                    headless=bool(b.get("headless", False)),
                    mode=b.get("mode", "dedicated"),
                    real_profile_dir=b.get("real_profile_dir", ""),
                    profile_directory=b.get("profile_directory", "Default"),
                )
            except Exception:  # noqa: BLE001
                self.browser = None

        # Voice (optional)
        self.tts = None
        self.stt = None
        self.voice_on = tk.BooleanVar(value=False)
        self._init_voice_optional()

        # ---- window ----
        self.title("J.A.R.V.I.S")
        self.geometry("940x740")
        self.minsize(680, 520)
        self.configure(bg=BG)

        self._build_style()
        self._build_ui()
        self._poll_queue()

        self._append("system",
                     f"JARVIS online. Brain: {self.cfg.get('ai_backend')}."
                     f" Tools: {len(self.registry.names())}.")

        if not self.engine.is_ready():
            self.after(1500, self.open_settings)

        self.after(60, self._show_splash)

    # =====================================================================
    # UI construction
    # =====================================================================
    def _build_style(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TCombobox", fieldbackground=C["panel"],
                        background=C["panel"], foreground=C["text"],
                        arrowcolor=C["accent"], bordercolor=C["border"],
                        lightcolor=C["panel"], darkcolor=C["panel"])
        style.map("TCombobox", fieldbackground=[("readonly", C["panel"])],
                  foreground=[("readonly", C["text"])])

    def _mkbutton(self, parent, text, command, kind="normal"):
        if kind == "primary":
            b = tk.Button(parent, text=text, command=command, bg=C["accent"],
                          fg=C["bg"], relief="flat", bd=0, cursor="hand2",
                          activebackground=C["accent2"], activeforeground=C["bg"],
                          font=("Segoe UI", 10, "bold"), padx=16, pady=7)
            hoverify(b, C["accent"], C["accent2"])
        elif kind == "danger":
            b = tk.Button(parent, text=text, command=command, bg=C["danger"],
                          fg="white", relief="flat", bd=0, cursor="hand2",
                          activebackground=C["danger_hi"],
                          font=("Segoe UI", 9, "bold"), padx=12, pady=7)
            hoverify(b, C["danger"], C["danger_hi"])
        else:
            b = tk.Button(parent, text=text, command=command, bg=C["panel"],
                          fg=C["text"], relief="flat", bd=0, cursor="hand2",
                          activebackground=C["panel2"], activeforeground=C["text"],
                          font=("Segoe UI", 9), padx=12, pady=7)
            hoverify(b, C["panel"], C["dim"])
        return b

    def _build_ui(self):
        # ---- Header ----
        header = tk.Frame(self, bg=BG)
        header.pack(fill="x", padx=20, pady=(16, 6))

        self.reactor = ArcReactor(header, size=72, bg=BG)
        self.reactor.pack(side="left", padx=(0, 16))

        tb = tk.Frame(header, bg=BG)
        tb.pack(side="left")
        tk.Label(tb, text="J.A.R.V.I.S", bg=BG, fg=C["accent"],
                 font=("Segoe UI", 22, "bold")).pack(anchor="w")
        tk.Label(tb, text="AI Assistant", bg=BG, fg=C["muted"],
                 font=("Segoe UI", 9)).pack(anchor="w")

        right = tk.Frame(header, bg=BG)
        right.pack(side="right", fill="y")
        self.status_dot = tk.Label(right, text="●", bg=BG, fg=C["ok"],
                                   font=("Segoe UI", 12))
        self.status_dot.pack(side="right")
        self.status_var = tk.StringVar(value="Ready")
        tk.Label(right, textvariable=self.status_var, bg=BG, fg=C["muted"],
                 font=("Segoe UI", 10)).pack(side="right", padx=(0, 8))

        # accent separator
        tk.Frame(self, bg=C["dim"], height=2).pack(fill="x", padx=20)

        # ---- Control bar ----
        bar = tk.Frame(self, bg=C["bg2"])
        bar.pack(fill="x", padx=20, pady=10)

        tk.Label(bar, text="Brain", bg=C["bg2"], fg=C["muted"],
                 font=("Segoe UI", 9)).pack(side="left", padx=(10, 4))
        self.backend_var = tk.StringVar(value=self.cfg.get("ai_backend", "freellm"))
        self.backend_box = ttk.Combobox(bar, textvariable=self.backend_var,
                                        state="readonly", width=9,
                                        values=["freellm", "local"])
        self.backend_box.pack(side="left", padx=4)
        self.backend_box.bind("<<ComboboxSelected>>", self._on_backend_pick)

        tk.Label(bar, text="Model", bg=C["bg2"], fg=C["muted"],
                 font=("Segoe UI", 9)).pack(side="left", padx=(14, 4))
        self.model_var = tk.StringVar(value=self.cfg.get("model", ""))
        self.model_box = ttk.Combobox(bar, textvariable=self.model_var,
                                      state="readonly", width=32)
        self.model_box.pack(side="left", padx=4)
        self.model_box.bind("<<ComboboxSelected>>", self._on_model_pick)

        self._mkbutton(bar, "Refresh", self.refresh_models).pack(side="left", padx=4)
        self._mkbutton(bar, "Voice", self._toggle_voice).pack(side="left", padx=4)
        self._mkbutton(bar, "Settings", self.open_settings).pack(side="left", padx=4)

        # Emergency stop (right, red)
        self.stop_btn = self._mkbutton(bar, "⏹ EMERGENCY STOP",
                                        self.emergency_stop, "danger")
        self.stop_btn.pack(side="right", padx=4)
        self._mkbutton(bar, "Clear", self.clear_chat).pack(side="right", padx=4)

        # ---- Chat card ----
        card = tk.Frame(self, bg=C["bg2"], highlightthickness=1,
                        highlightbackground=C["border"])
        card.pack(fill="both", expand=True, padx=20, pady=8)
        self.chat = scrolledtext.ScrolledText(
            card, bg=C["bg2"], fg=C["text"], wrap="word", bd=0, padx=14, pady=12,
            font=("Segoe UI", 11), insertbackground=C["accent"],
            state="disabled", relief="flat", selectbackground=C["dim"])
        self.chat.pack(fill="both", expand=True, padx=2, pady=2)
        self.chat.tag_config("user", foreground=C["user"],
                             font=("Segoe UI", 11, "bold"))
        self.chat.tag_config("bot", foreground=C["bot"],
                             font=("Segoe UI", 11, "bold"))
        self.chat.tag_config("system", foreground=C["muted"],
                             font=("Segoe UI", 10, "italic"))
        self.chat.tag_config("body", foreground=C["text"],
                             font=("Segoe UI", 11))
        self.chat.tag_config("tool", foreground=C["accent2"],
                             font=("Segoe UI", 9, "italic"))

        # ---- Input row ----
        row = tk.Frame(self, bg=BG)
        row.pack(fill="x", padx=20, pady=(0, 16))
        inp = tk.Frame(row, bg=C["panel"], highlightthickness=1,
                       highlightbackground=C["border"])
        inp.pack(side="left", fill="both", expand=True)
        self.entry = scrolledtext.ScrolledText(
            inp, height=2, bg=C["panel"], fg=C["text"], wrap="word", bd=0,
            font=("Segoe UI", 11), insertbackground=C["accent"], relief="flat",
            padx=12, pady=10, selectbackground=C["dim"])
        self.entry.pack(fill="both", expand=True)
        self.entry.bind("<Return>", self._on_enter)
        self.entry.bind("<Shift-Return>", lambda e: None)

        self.send_btn = self._mkbutton(row, "Send  ➤", self.send_message, "primary")
        self.send_btn.pack(side="left", padx=(10, 0), fill="y")

    # =====================================================================
    # Splash animation
    # =====================================================================
    def _show_splash(self):
        try:
            self.withdraw()
        except tk.TclError:
            return
        sp = tk.Toplevel(self)
        sp.overrideredirect(True)
        W, H = 440, 260
        x = (sp.winfo_screenwidth() - W) // 2
        y = (sp.winfo_screenheight() - H) // 2
        sp.geometry(f"{W}x{H}+{x}+{y}")
        sp.configure(bg=BG)
        reactor = ArcReactor(sp, size=120, bg=BG)
        reactor.pack(pady=(30, 10))
        tk.Label(sp, text="J.A.R.V.I.S", bg=BG, fg=C["accent"],
                 font=("Segoe UI", 20, "bold")).pack()
        tk.Label(sp, text="Initializing systems", bg=BG, fg=C["muted"],
                 font=("Segoe UI", 9)).pack(pady=(2, 0))

        bar = tk.Frame(sp, bg=C["panel"], height=6, width=260)
        bar.pack(pady=16)
        bar.pack_propagate(False)
        fill = tk.Frame(bar, bg=C["accent"], height=6, width=0)
        fill.pack(side="left")

        try:
            sp.wm_attributes("-alpha", 0.0)
        except tk.TclError:
            pass

        state = {"i": 0}

        def step():
            state["i"] += 1
            i = state["i"]
            if i <= 12:
                a = i / 12.0
            elif i <= 26:
                a = 1.0
            else:
                a = max(0.0, (40 - i) / 14.0)
            try:
                sp.wm_attributes("-alpha", a)
            except tk.TclError:
                pass
            try:
                fill.configure(width=int(260 * min(1.0, i / 24.0)))
            except tk.TclError:
                pass
            if i >= 42:
                try:
                    reactor.destroy()
                    sp.destroy()
                except tk.TclError:
                    pass
                try:
                    self.deiconify()
                except tk.TclError:
                    pass
                return
            sp.after(25, step)

        sp.after(25, step)

    # =====================================================================
    # Thinking animation
    # =====================================================================
    def _start_thinking(self):
        self.reactor.set_active(True)
        self._think_frame = 0
        self._animate_thinking()

    def _animate_thinking(self):
        if not self.busy:
            return
        frames = ["Thinking", "Thinking.", "Thinking..", "Thinking..."]
        self.status_var.set(frames[self._think_frame % 4])
        self.status_dot.configure(fg=C["accent"])
        self._think_frame += 1
        self.after(360, self._animate_thinking)

    def _stop_thinking(self):
        self.reactor.set_active(False)

    # =====================================================================
    # Foundation: security, tools, voice
    # =====================================================================
    def _confirm_prompt(self, title, message) -> bool:
        return messagebox.askyesno(title or "Confirm", message or "Allow?",
                                    parent=self)

    def _register_tools(self):
        def reg(name, desc, func, risk, action, params=None):
            self.registry.register(Tool(name, desc, func, risk, action,
                                        params or {}))

        # NOTE: lambda parameter names MUST match the param names declared below,
        # so tool-calling can pass them by keyword.
        reg("search_files", "Search files/folders by name",
            lambda query, root=None: file_agent.search_files(self.security, query, root),
            "safe", "read", {"query": "text"})
        reg("open_path", "Open a file or folder",
            lambda path: file_agent.open_path(self.security, path),
            "safe", "read", {"path": "file/folder"})
        reg("create_file", "Create a new file",
            lambda path, content="": file_agent.create_file(self.security, path, content),
            "confirm", "write", {"path": "path", "content": "text"})
        reg("read_file", "Read a text file",
            lambda path: file_agent.read_file(self.security, path),
            "safe", "read", {"path": "file"})
        reg("edit_file", "Replace text in a file",
            lambda path, old, new: file_agent.edit_file(self.security, path, old, new),
            "confirm", "overwrite", {"path": "path", "old": "text", "new": "text"})
        reg("delete_path", "Delete a file or folder (needs confirmation)",
            lambda path: file_agent.delete_path(self.security, path),
            "confirm", "delete", {"path": "path"})

        reg("launch_app", "Launch an application (scans the system to find it)",
            lambda app, args="": app_agent.launch_app(self.security, app, args),
            "confirm", "launch", {"app": "name", "args": "optional"})
        reg("find_app", "Find where an app is installed (returns its path)",
            lambda name: app_agent.find_app(self.security, name),
            "safe", "read", {"name": "app name"})
        reg("open_folder", "Open a folder in Explorer",
            lambda path: app_agent.open_folder(self.security, path),
            "safe", "launch", {"path": "folder"})

        reg("system_status", "Show CPU / RAM / disk usage",
            lambda: system_monitor.system_status(self.security),
            "safe", "read", {})
        reg("list_processes", "List running processes",
            lambda: system_monitor.list_processes(self.security),
            "safe", "read", {})

        # keyboard / mouse
        reg("mouse_move", "Move the mouse",
            lambda x, y: keyboard_mouse.move_mouse(self.security, x, y),
            "confirm", "input_control", {"x": "x", "y": "y"})
        reg("mouse_click", "Click the mouse",
            lambda x=None, y=None: keyboard_mouse.click(self.security, x, y),
            "confirm", "input_control", {"x": "x", "y": "y"})
        reg("type_text", "Type text via keyboard",
            lambda text: keyboard_mouse.type_text(self.security, text),
            "confirm", "input_control", {"text": "text"})
        reg("press_key", "Press a key",
            lambda key: keyboard_mouse.press_key(self.security, key),
            "confirm", "input_control", {"key": "key name"})

        # screen reader
        reg("list_windows", "List open windows",
            lambda: screen_reader.list_windows(self.security),
            "safe", "read", {})
        reg("read_active_window", "Read the active window title",
            lambda: screen_reader.read_active_window(self.security),
            "safe", "read", {})
        reg("ocr_screen", "OCR the screen (needs Tesseract)",
            lambda: screen_reader.ocr_screen(self.security),
            "confirm", "write", {})

        # browser agent (Playwright)
        reg("browser_open", "Open a URL in the browser",
            lambda url: self._browser_call("goto", url),
            "confirm", "launch", {"url": "url"})
        reg("browser_search", "Google search; return top results",
            lambda query: self._browser_call("search", query),
            "confirm", "launch", {"query": "text"})
        reg("browser_summarize", "Fetch a page's text for summarization",
            lambda url: self._browser_call("summarize", url),
            "confirm", "launch", {"url": "url"})
        reg("browser_download", "Download a file to the approved folder",
            lambda url, filename="": self._browser_call("download", url, filename),
            "confirm", "download", {"url": "url", "filename": "optional"})

    def _init_voice_optional(self):
        v = self.cfg.get("voice", {}) or {}
        if not v.get("enabled"):
            return
        try:
            from voice.engine import TextToSpeech, SpeechToText
            self.tts = TextToSpeech(voice_name=v.get("voice_name", ""))
            self.stt = SpeechToText(model_path=v.get("vosk_model", ""))
        except Exception:  # noqa: BLE001
            self.tts = None
            self.stt = None

    def _browser_call(self, fn, *args, **kwargs):
        if not self.browser:
            return ("Browser agent not available. Install Playwright: "
                    "run setup_optional.bat (pip install playwright && "
                    "playwright install chromium).")
        try:
            return getattr(self.browser, fn)(*args, **kwargs)
        except Exception as e:  # noqa: BLE001
            return f"Browser error: {e}"

    def _build_tools_spec(self) -> str:
        """Describe available tools so the model knows how to call them."""
        lines = [
            "You have access to tools. When you need to use one, reply with "
            "ONLY a JSON object and nothing else, in this exact format:",
            '{"tool": "<tool_name>", "args": {<param>: <value>}}',
            "After a tool result is provided, continue and answer the user "
            "normally in a friendly way. Do not mention the JSON.",
            "IMPORTANT: To open an app, call launch_app with the app name "
            "(e.g. {\"tool\":\"launch_app\",\"args\":{\"app\":\"brave\"}}). It "
            "searches the whole system and confirms it launched. Do NOT use "
            "search_files to find apps, and do NOT guess. To just open a website "
            "in the default browser, use launch_app with app \"browser\".",
            "Available tools:",
        ]
        for t in self.registry.describe():
            params = ", ".join(t.get("params", {}).keys())
            lines.append(f"- {t['name']}({params}): {t['description']}")
        return "\n".join(lines)

    def _run_tool(self, name, args):
        """Execute a tool by name through the Security-gated registry."""
        try:
            return self.registry.run(name, **(args or {}))
        except Exception as e:  # noqa: BLE001
            from tools.registry import ToolResult
            return ToolResult(False, error=str(e))

    def emergency_stop(self):
        self.security.trigger_emergency_stop()
        try:
            if self.coding:
                self.coding.stop_all()
        except Exception:  # noqa: BLE001
            pass
        # Reset UI so the user isn't stuck
        self.busy = False
        self._stop_thinking()
        try:
            self.send_btn.configure(state="normal")
        except tk.TclError:
            pass
        self._append("system", "EMERGENCY STOP — all tasks halted.")
        self._set_status("Emergency stop engaged", C["danger"])

    def reset_emergency(self):
        self.security.reset_emergency_stop()
        self._append("system", "Emergency stop cleared. You can continue.")
        self._set_status("Ready", C["ok"])

    def _toggle_voice(self):
        if not self.stt or not self.stt.available():
            messagebox.showinfo("Voice",
                                "Voice input not available. Enable voice in "
                                "Settings and install Vosk + sounddevice.")
            return
        self._set_status("Listening…", C["accent"])

        def worker():
            try:
                for chunk in self.stt.transcribe_stream():
                    if chunk.get("final") and chunk.get("text"):
                        self.ui_queue.put(("voice_text", chunk["text"]))
                        break
            except Exception as e:  # noqa: BLE001
                self.ui_queue.put(("error", f"Voice: {e}"))

        threading.Thread(target=worker, daemon=True).start()

    # =====================================================================
    # Chat rendering
    # =====================================================================
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

    def _set_status(self, text, color=None):
        self.status_var.set(text)
        self.status_dot.configure(fg=color or C["ok"])

    def clear_chat(self):
        self.chat.configure(state="normal")
        self.chat.delete("1.0", "end")
        self.chat.configure(state="disabled")
        self.history = []
        try:
            self.memory.clear_history()
        except Exception:  # noqa: BLE001
            pass

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

    # =====================================================================
    # Settings
    # =====================================================================
    def open_settings(self):
        SettingsDialog(self, self.cfg, on_saved=self._settings_saved)

    def _settings_saved(self, new_cfg):
        self.cfg.update(new_cfg)
        save_config(self.cfg)
        self.engine = AIEngine(self.cfg)
        self.backend_var.set(self.cfg.get("ai_backend"))
        self.tts = None
        self.stt = None
        self._init_voice_optional()
        self.voice_on.set(bool((self.cfg.get("voice", {}) or {}).get("enabled", False)))
        # Re-create browser agent with new settings
        if BrowserAgent is not None:
            try:
                b = self.cfg.get("browser", {}) or {}
                self.browser = BrowserAgent(
                    self.security,
                    profile_dir=b.get("profile_dir") or
                    os.path.join(app_dir(), "jarvis_browser_profile"),
                    download_dir=self.download_dir,
                    headless=bool(b.get("headless", False)),
                    mode=b.get("mode", "dedicated"),
                    real_profile_dir=b.get("real_profile_dir", ""),
                    profile_directory=b.get("profile_directory", "Default"),
                )
            except Exception:  # noqa: BLE001
                self.browser = None
        self._append("system", "Settings saved.")
        self.refresh_models()

    # =====================================================================
    # Models
    # =====================================================================
    def refresh_models(self):
        if self.busy:
            return
        if not self.engine.is_ready():
            self._set_status(self.engine.ready_message(), C["muted"])
            if self.cfg.get("ai_backend") == "freellm":
                messagebox.showinfo("JARVIS", self.engine.ready_message())
                self.open_settings()
            return
        if self.cfg.get("ai_backend") == "local":
            self._set_status(self.engine.ready_message(), C["muted"])
            return

        self.busy = True
        self._set_status("Fetching models…", C["accent"])
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

    # =====================================================================
    # Send
    # =====================================================================
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
        self.send_btn.configure(state="disabled")
        self._start_thinking()
        self._begin_bot()

        tools_spec = self._build_tools_spec()

        def on_tool(name, args, result):
            self.ui_queue.put(("tool", (name, args, result)))

        def worker():
            try:
                full = self.engine.chat_with_tools(
                    self.history, tools_spec=tools_spec,
                    tool_runner=self._run_tool, on_tool=on_tool)
                self.ui_queue.put(("final", full or "(empty response)"))
            except AIError as e:
                self.ui_queue.put(("error", str(e)))
            except Exception as e:  # noqa: BLE001
                self.ui_queue.put(("error", str(e)))

        threading.Thread(target=worker, daemon=True).start()

    # =====================================================================
    # Queue pump
    # =====================================================================
    def _reveal_final(self, text):
        """Reveal the final answer with a typewriter effect, then finish."""
        self.chat.configure(state="normal")
        state = {"i": 0}
        chunk = 6

        def step():
            i = state["i"]
            if i >= len(text):
                self.chat.insert("end", "\n\n")
                self.chat.configure(state="disabled")
                self._finish_reply(text)
                return
            self.chat.insert("end", text[i:i + chunk], "body")
            self.chat.see("end")
            state["i"] += chunk
            self.after(10, step)

        step()

    def _finish_reply(self, text):
        self.history.append({"role": "assistant", "content": text})
        self._stop_thinking()
        self._set_status("Ready", C["ok"])
        self.busy = False
        try:
            self.send_btn.configure(state="normal")
        except tk.TclError:
            pass
        if self.voice_on.get() and self.tts and self.tts.available():
            try:
                self.tts.speak(text)
            except Exception:  # noqa: BLE001
                pass
        try:
            self.memory.append_history(self.history[-2])
            self.memory.append_history(self.history[-1])
        except Exception:  # noqa: BLE001
            pass

    def _poll_queue(self):
        try:
            while True:
                kind, payload = self.ui_queue.get_nowait()
                if kind == "token":
                    self._stream(payload)
                elif kind == "tool":
                    name, args, result = payload
                    self.chat.configure(state="normal")
                    self.chat.insert("end", f"🔧 {name}({args}) → {result[:300]}\n",
                                     "tool")
                    self.chat.see("end")
                    self.chat.configure(state="disabled")
                elif kind == "voice_text":
                    self.entry.delete("1.0", "end")
                    self.entry.insert("1.0", payload)
                    self._set_status("Ready", C["ok"])
                elif kind == "models":
                    self.model_box["values"] = payload
                    if payload and self.model_var.get() not in payload:
                        self.model_var.set(payload[0])
                        self.cfg["model"] = payload[0]
                        save_config(self.cfg)
                    self._set_status(f"{len(payload)} models available", C["ok"])
                    self.busy = False
                    self.send_btn.configure(state="normal")
                elif kind == "done":
                    self._finish_reply(payload)
                elif kind == "final":
                    self._reveal_final(payload)
                elif kind == "error":
                    self.chat.configure(state="normal")
                    self.chat.insert("end", f"[error: {payload}]\n\n")
                    self.chat.configure(state="disabled")
                    self._stop_thinking()
                    self._set_status("Error", C["danger"])
                    self.busy = False
                    self.send_btn.configure(state="normal")
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
        self.configure(bg=C["bg"])
        self.resizable(False, False)
        self.transient(master)
        self.grab_set()

        frm = tk.Frame(self, bg=C["bg"])
        frm.pack(fill="both", expand=True, padx=24, pady=20)

        tk.Label(frm, text="AI Brain", bg=C["bg"], fg=C["accent"], anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w")
        self.backend_var = tk.StringVar(value=cfg.get("ai_backend", "freellm"))
        ttk.Combobox(frm, textvariable=self.backend_var, state="readonly",
                     values=["freellm", "local"], width=44).grid(
                        row=1, column=0, sticky="we", pady=(2, 6))

        self.vars = {}
        fields = [
            ("base_url", "Base URL (FreeLLMAPI)"),
            ("api_key", "API Key"),
            ("model", "Model (blank = auto-pick)"),
            ("system_prompt", "System prompt"),
        ]
        r = 2
        for key, label in fields:
            tk.Label(frm, text=label, bg=C["bg"], fg=C["accent"], anchor="w",
                     font=("Segoe UI", 10, "bold")).grid(
                        row=r, column=0, sticky="w", pady=(6, 0))
            if key == "system_prompt":
                w = tk.Text(frm, height=3, width=46, bg=C["panel"], fg=C["text"],
                            insertbackground=C["accent"], relief="flat",
                            wrap="word", highlightthickness=1,
                            highlightbackground=C["border"])
                w.insert("1.0", str(cfg.get(key, "")))
                w.grid(row=r + 1, column=0, sticky="we", pady=(2, 6))
                self.vars[key] = w
            else:
                var = tk.StringVar(value=str(cfg.get(key, "")))
                self.vars[key] = var
                show = "•" if key == "api_key" and var.get() else ""
                tk.Entry(frm, textvariable=var, bg=C["panel"], fg=C["text"],
                         show=show, insertbackground=C["accent"], relief="flat",
                         width=44, highlightthickness=1,
                         highlightbackground=C["border"]).grid(
                            row=r + 1, column=0, sticky="we", pady=(2, 6))
            r += 2

        tk.Label(frm, text="Temperature", bg=C["bg"], fg=C["accent"], anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=r, column=0, sticky="w")
        self.temp_var = tk.DoubleVar(value=float(cfg.get("temperature", 0.7)))
        tk.Scale(frm, from_=0.0, to=1.5, resolution=0.1, orient="horizontal",
                 variable=self.temp_var, bg=C["bg"], fg=C["text"],
                 troughcolor=C["panel"], highlightthickness=0,
                 length=320).grid(row=r + 1, column=0, sticky="we")
        r += 2

        voice_cfg = cfg.get("voice", {}) or {}
        self.voice_enabled = tk.BooleanVar(value=bool(voice_cfg.get("enabled", False)))
        tk.Checkbutton(frm, text="Enable voice (speak replies)",
                       variable=self.voice_enabled, bg=C["bg"], fg=C["text"],
                       selectcolor=C["panel"], activebackground=C["bg"],
                       activeforeground=C["text"], anchor="w").grid(
                            row=r, column=0, sticky="w", pady=(6, 0))
        r += 1
        tk.Label(frm, text="Vosk model path (voice input)", bg=C["bg"],
                 fg=C["accent"], anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=r, column=0, sticky="w")
        self.vosk_var = tk.StringVar(value=str(voice_cfg.get("vosk_model", "")))
        tk.Entry(frm, textvariable=self.vosk_var, bg=C["panel"], fg=C["text"],
                 relief="flat", width=44, highlightthickness=1,
                 highlightbackground=C["border"]).grid(
                    row=r + 1, column=0, sticky="we", pady=(2, 6))
        r += 2

        # Browser settings
        br = cfg.get("browser", {}) or {}
        self.browser_enabled = tk.BooleanVar(value=bool(br.get("enabled", False)))
        tk.Checkbutton(frm, text="Enable browser agent (Playwright)",
                       variable=self.browser_enabled, bg=C["bg"], fg=C["text"],
                       selectcolor=C["panel"], activebackground=C["bg"],
                       activeforeground=C["text"], anchor="w").grid(
                            row=r, column=0, sticky="w", pady=(6, 0))
        r += 1
        tk.Label(frm, text="Browser mode", bg=C["bg"], fg=C["accent"], anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=r, column=0, sticky="w")
        self.browser_mode = tk.StringVar(value=br.get("mode", "dedicated"))
        ttk.Combobox(frm, textvariable=self.browser_mode, state="readonly",
                     values=["dedicated", "real"], width=42).grid(
                        row=r + 1, column=0, sticky="we", pady=(2, 6))
        r += 2
        tk.Label(frm, text="Chrome 'User Data' folder (real mode)", bg=C["bg"],
                 fg=C["accent"], anchor="w",
                 font=("Segoe UI", 10, "bold")).grid(row=r, column=0, sticky="w")
        self.real_profile_var = tk.StringVar(value=str(br.get("real_profile_dir", "")))
        tk.Entry(frm, textvariable=self.real_profile_var, bg=C["panel"],
                 fg=C["text"], relief="flat", width=44, highlightthickness=1,
                 highlightbackground=C["border"]).grid(
                    row=r + 1, column=0, sticky="we", pady=(2, 6))
        r += 2

        btns = tk.Frame(frm, bg=C["bg"])
        btns.grid(row=r + 1, column=0, sticky="e", pady=(16, 0))
        tk.Button(btns, text="Cancel", command=self.destroy, bg=C["panel"],
                  fg=C["text"], relief="flat", bd=0, padx=14, pady=6,
                  cursor="hand2").pack(side="right", padx=4)
        b = tk.Button(btns, text="Save", command=self._save, bg=C["accent"],
                      fg=C["bg"], relief="flat", bd=0, padx=18, pady=6,
                      cursor="hand2", font=("Segoe UI", 9, "bold"))
        hoverify(b, C["accent"], C["accent2"])
        b.pack(side="right", padx=4)

    def _save(self):
        out = dict(self.cfg)
        out["ai_backend"] = self.backend_var.get()
        out["base_url"] = self.vars["base_url"].get().strip()
        out["api_key"] = self.vars["api_key"].get().strip()
        out["model"] = self.vars["model"].get().strip()
        out["system_prompt"] = self.vars["system_prompt"].get("1.0", "end").strip()
        out["temperature"] = round(float(self.temp_var.get()), 2)
        voice = dict(out.get("voice", {}) or {})
        voice["enabled"] = bool(self.voice_enabled.get())
        voice["vosk_model"] = self.vosk_var.get().strip()
        out["voice"] = voice

        browser = dict(out.get("browser", {}) or {})
        browser["enabled"] = bool(self.browser_enabled.get())
        browser["mode"] = self.browser_mode.get()
        browser["real_profile_dir"] = self.real_profile_var.get().strip()
        out["browser"] = browser

        if browser["enabled"] and browser["mode"] == "real":
            ok = messagebox.askyesno(
                "Real Chrome (risky)",
                "Real mode will launch YOUR Chrome profile (logins, cookies, "
                "passwords are usable by automation). Continue?", parent=self)
            if not ok:
                return

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