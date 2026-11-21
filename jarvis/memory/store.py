"""
JARVIS local memory.

Stores conversation history, project memory, and user preferences as JSON
files in a memory directory (default: <app>/memory). No cloud, no deps.

Provides:
  - load/save chat history
  - remember/forget facts (user preferences)
  - project memory (per-workspace notes)
  - previous task recovery (last N tasks)
"""

import json
import os
import threading
from datetime import datetime


class Memory:
    def __init__(self, base_dir: str):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)
        self._lock = threading.Lock()
        self._files = {
            "history": os.path.join(self.base_dir, "history.json"),
            "prefs": os.path.join(self.base_dir, "preferences.json"),
            "projects": os.path.join(self.base_dir, "projects.json"),
            "tasks": os.path.join(self.base_dir, "tasks.json"),
        }

    def _read(self, key, default):
        try:
            with open(self._files[key], "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return default

    def _write(self, key, data):
        with self._lock:
            tmp = self._files[key] + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(tmp, self._files[key])

    # ---- conversation history ----
    def load_history(self):
        return self._read("history", [])

    def append_history(self, entry: dict):
        hist = self._read("history", [])
        hist.append(entry)
        # keep last 200 turns
        self._write("history", hist[-200:])

    def clear_history(self):
        self._write("history", [])

    # ---- preferences / facts ----
    def remember(self, key: str, value):
        prefs = self._read("prefs", {})
        prefs[key] = {"value": value, "updated": datetime.now().isoformat(timespec="seconds")}
        self._write("prefs", prefs)

    def recall(self, key: str, default=None):
        prefs = self._read("prefs", {})
        return prefs.get(key, {}).get("value", default)

    def all_prefs(self) -> dict:
        return {k: v.get("value") for k, v in self._read("prefs", {}).items()}

    def forget(self, key: str):
        prefs = self._read("prefs", {})
        prefs.pop(key, None)
        self._write("prefs", prefs)

    # ---- project memory ----
    def project_note(self, project: str, note: str):
        projects = self._read("projects", {})
        projects.setdefault(project, []).append(
            {"note": note, "time": datetime.now().isoformat(timespec="seconds")})
        self._write("projects", projects)

    def project_notes(self, project: str):
        return self._read("projects", {}).get(project, [])

    # ---- task recovery ----
    def record_task(self, task: str, status: str = "done"):
        tasks = self._read("tasks", [])
        tasks.append({"task": task, "status": status,
                      "time": datetime.now().isoformat(timespec="seconds")})
        self._write("tasks", tasks[-50:])

    def last_tasks(self, n=10):
        return self._read("tasks", [])[-n:]