"""
JARVIS coding agent.

Works inside a DEDICATED workspace only. Provides:
  - project creation / file editing (with change tracking + backups)
  - terminal execution (Security-gated; unknown exes confirmable)
  - dependency install (confirmable)
  - local website testing (start a simple server, report URL)

Nothing runs outside the workspace. All commands go through Security.
"""

import os
import shutil
import subprocess
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from core.security import Security, SecurityError, Risk


@dataclass
class CodingAgent:
    security: Security
    workspace: str
    backup_dir: str
    max_cmd_timeout: int = 120
    _backups: List[str] = field(default_factory=list)
    _servers: Dict[int, subprocess.Popen] = field(default_factory=dict)

    # ---- setup ----
    def ensure_workspace(self):
        os.makedirs(self.workspace, exist_ok=True)
        os.makedirs(self.backup_dir, exist_ok=True)
        self.security.add_write_root(self.workspace)
        self.security.add_read_root(self.workspace)
        self.security.add_write_root(self.backup_dir)

    # ---- project ----
    def create_project(self, name: str, template: str = "html") -> str:
        """Create a new project folder with a starter template."""
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
        path = os.path.join(self.workspace, safe)
        if not self.security.can_write(path):
            raise SecurityError(f"Workspace containment failed: {path}")
        self.security.authorize("write", Risk.CONFIRM, f"Create project {path}")
        os.makedirs(path, exist_ok=True)
        if template == "html":
            self._write(path, "index.html",
                        "<!doctype html>\n<html>\n<head><meta charset='utf-8'>"
                        "<title>" + safe + "</title></head>\n"
                        "<body><h1>" + safe + "</h1></body>\n</html>\n")
            self._write(path, "style.css", "body{font-family:sans-serif;margin:2rem;}\n")
        elif template == "python":
            self._write(path, "main.py", "def main():\n    print('hello')\n\n"
                        "if __name__ == '__main__':\n    main()\n")
        return f"Created project '{safe}' at {path}"

    # ---- files ----
    def _resolve(self, rel: str) -> str:
        p = os.path.abspath(os.path.join(self.workspace, rel))
        if not self.security.can_write(p):
            raise SecurityError(f"Outside workspace: {p}")
        return p

    def _write(self, path, rel_or_name, content):
        """Write starter content for a project template (inside workspace)."""
        os.makedirs(path, exist_ok=True)
        full = os.path.join(path, rel_or_name)
        with open(full, "w", encoding="utf-8") as f:
            f.write(content)

    def write_file(self, rel_path: str, content: str) -> str:
        p = self._resolve(rel_path)
        self.security.authorize("write", Risk.CONFIRM, f"Write {rel_path}")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if os.path.exists(p):
            self._backup(p)
            self.security.authorize("overwrite", Risk.CONFIRM, f"Overwrite {rel_path}")
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Wrote {rel_path} ({len(content)} bytes)"

    def edit_file(self, rel_path: str, old: str, new: str) -> str:
        p = self._resolve(rel_path)
        if not os.path.isfile(p):
            raise SecurityError(f"Not a file: {rel_path}")
        self.security.authorize("overwrite", Risk.CONFIRM, f"Edit {rel_path}")
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        if old not in text:
            raise SecurityError("Substring not found for replacement.")
        self._backup(p)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text.replace(old, new, 1))
        return f"Edited {rel_path} (1 replacement)"

    def read_file(self, rel_path: str) -> str:
        p = self._resolve(rel_path)
        self.security.authorize("read", Risk.SAFE)
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    def list_files(self, rel: str = ".") -> str:
        base = self._resolve(rel)
        self.security.authorize("read", Risk.SAFE)
        out = []
        for name in sorted(os.listdir(base)):
            full = os.path.join(base, name)
            tag = "DIR " if os.path.isdir(full) else "FILE"
            out.append(f"{tag} {name}")
        return "\n".join(out) if out else "(empty)"

    # ---- change tracking / backups ----
    def _backup(self, path: str):
        try:
            os.makedirs(self.backup_dir, exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dst = os.path.join(self.backup_dir,
                               f"{stamp}_{os.path.basename(path)}")
            shutil.copy2(path, dst)
            self._backups.append(dst)
            return dst
        except OSError:
            return None

    def list_backups(self) -> str:
        if not os.path.isdir(self.backup_dir):
            return "(no backups)"
        items = sorted(os.listdir(self.backup_dir))
        return "\n".join(items) if items else "(no backups)"

    def diff_file(self, rel_path: str, backup_name: str) -> str:
        """Line-by-line diff between current file and a stored backup."""
        import difflib
        cur = self._resolve(rel_path)
        bak = os.path.join(self.backup_dir, backup_name)
        if not os.path.isfile(bak):
            raise SecurityError(f"Backup not found: {backup_name}")
        a = open(bak, encoding="utf-8", errors="replace").read().splitlines()
        b = open(cur, encoding="utf-8", errors="replace").read().splitlines()
        return "\n".join(difflib.unified_diff(a, b, "backup", "current", lineterm=""))

    # ---- terminal ----
    def run_command(self, command: str, cwd_rel: str = ".",
                    timeout: Optional[int] = None) -> str:
        """
        Run a shell command inside the workspace. Security-gated.
        Note: this intentionally runs via the shell for flexibility, but ONLY
        within the workspace and only after Security authorization.
        """
        cwd = self._resolve(cwd_rel)
        if not os.path.isdir(cwd):
            raise SecurityError(f"Not a directory: {cwd_rel}")
        self.security.authorize("system_change", Risk.CONFIRM,
                                f"Run command: {command}")
        try:
            proc = subprocess.run(
                command, cwd=cwd, shell=True, capture_output=True, text=True,
                timeout=timeout or self.max_cmd_timeout)
            out = proc.stdout or ""
            err = proc.stderr or ""
            return (out + ("\n[stderr]\n" + err if err else "")).strip() \
                or f"(exit code {proc.returncode})"
        except subprocess.TimeoutExpired:
            raise SecurityError("Command timed out.") from None
        except Exception as e:  # noqa: BLE001
            raise SecurityError(f"Command failed: {e}") from e

    def install_dependency(self, package: str) -> str:
        """Install a Python/pip package (requires confirmation)."""
        self.security.authorize("install", Risk.CONFIRM, f"pip install {package}")
        cwd = self.workspace
        proc = subprocess.run(
            ["python", "-m", "pip", "install", package],
            cwd=cwd, capture_output=True, text=True, timeout=self.max_cmd_timeout)
        return (proc.stdout + proc.stderr).strip() or f"(exit {proc.returncode})"

    # ---- local website testing ----
    def start_local_server(self, port: int = 8000, root_rel: str = ".") -> str:
        """Start a static HTTP server in the workspace; returns the URL."""
        root = self._resolve(root_rel)
        self.security.authorize("system_change", Risk.CONFIRM,
                                f"Start local web server on :{port}")
        if port in self._servers:
            return f"Server already running at http://localhost:{port}"
        # Use python's http.server
        cmd = ["python", "-m", "http.server", str(port)]
        proc = subprocess.Popen(
            cmd, cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self._servers[port] = proc
        time.sleep(0.5)
        return f"Serving {root} at http://localhost:{port} (pid {proc.pid})"

    def stop_local_server(self, port: int = 8000) -> str:
        proc = self._servers.pop(port, None)
        if proc and proc.poll() is None:
            proc.terminate()
            return f"Stopped server on :{port}"
        return f"No server on :{port}"

    # ---- emergency stop integration ----
    def stop_all(self):
        for port, proc in list(self._servers.items()):
            try:
                if proc.poll() is None:
                    proc.terminate()
            except Exception:  # noqa: BLE001
                pass
        self._servers.clear()