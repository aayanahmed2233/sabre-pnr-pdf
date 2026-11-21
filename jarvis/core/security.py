"""
JARVIS Security layer.

THE single chokepoint every tool/action must pass through. The AI never runs
anything directly; it asks a tool, and the tool asks Security.

Responsibilities:
  - Classify actions into risk tiers (SAFE / CONFIRM / BLOCKED).
  - Enforce filesystem containment (read/write only within allowed roots).
  - Require explicit user confirmation for sensitive actions.
  - Support an Emergency Stop that halts all active work.
  - Keep an audit log of every gated action.
"""

import os
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, List, Optional


# ---------------------------------------------------------------------------
# Risk model
# ---------------------------------------------------------------------------

class Risk:
    SAFE = "safe"            # read-only / harmless -> automatic
    CONFIRM = "confirm"      # sensitive -> needs user confirmation
    BLOCKED = "blocked"      # never allowed by default


# Human-readable confirmation labels for actions.
CONFIRM_LABELS = {
    "delete": "Permanently delete files?",
    "overwrite": "Overwrite an existing file?",
    "install": "Install software / packages?",
    "run_unknown_exe": "Run this program (not in the allowlist)?",
    "shutdown": "Shut down or restart the computer?",
    "system_change": "Change a system setting?",
    "write": "Create or modify a file?",
    "launch": "Launch an application?",
    "download": "Download a file from the internet?",
}


class SecurityError(Exception):
    """Raised when an action is blocked or not confirmed."""


class EmergencyStop(Exception):
    """Raised to abort work when the user hits Emergency Stop."""


@dataclass
class Security:
    """
    Construct with a config dict (config['security']). The UI installs a
    `confirm_callback(title, message) -> bool` so Confirm actions can prompt.
    """
    allowed_read_roots: List[str] = field(default_factory=list)
    allowed_write_roots: List[str] = field(default_factory=list)
    require_confirmation: List[str] = field(default_factory=list)
    block_run_unknown_exe: bool = True
    max_cmd_timeout: int = 120
    confirm_callback: Optional[Callable[[str, str], bool]] = None

    # internal
    _audit: List[dict] = field(default_factory=list)
    _stop: threading.Event = field(default_factory=threading.Event)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    # ---- lifecycle ----
    @classmethod
    def from_config(cls, cfg: dict) -> "Security":
        sec = (cfg or {}).get("security", {}) or {}
        return cls(
            allowed_read_roots=list(sec.get("allowed_read_roots", [])),
            require_confirmation=list(sec.get("require_confirmation", [])),
            block_run_unknown_exe=bool(sec.get("block_run_unknown_exe", True)),
            max_cmd_timeout=int(sec.get("max_cmd_timeout", 120)),
        )

    def add_read_root(self, path: str):
        p = os.path.abspath(path)
        if p not in self.allowed_read_roots:
            self.allowed_read_roots.append(p)

    def add_write_root(self, path: str):
        p = os.path.abspath(path)
        if p not in self.allowed_write_roots:
            self.allowed_write_roots.append(p)

    # ---- emergency stop ----
    def trigger_emergency_stop(self):
        self._stop.set()
        self._log("EMERGENCY_STOP", Risk.BLOCKED, "stop requested")

    def reset_emergency_stop(self):
        self._stop.clear()

    @property
    def stopped(self) -> bool:
        return self._stop.is_set()

    def checkpoint(self):
        """Call inside loops; raises EmergencyStop if requested."""
        if self._stop.is_set():
            raise EmergencyStop("Emergency stop requested by user.")

    # ---- path containment ----
    def _within(self, path: str, roots: List[str]) -> bool:
        try:
            rp = os.path.realpath(path)
        except OSError:
            return False
        for r in roots:
            rr = os.path.realpath(r)
            if rp == rr or rp.startswith(rr + os.sep):
                return True
        return False

    def can_read(self, path: str) -> bool:
        return self._within(path, self.allowed_read_roots)

    def can_write(self, path: str) -> bool:
        return self._within(path, self.allowed_write_roots)

    # ---- the main gate ----
    def authorize(self, action: str, risk: str = Risk.SAFE,
                  message: str = "") -> bool:
        """
        Decide whether an action may proceed. Returns True if allowed.
        Raises SecurityError if blocked or not confirmed.
        """
        self.checkpoint()
        label = CONFIRM_LABELS.get(action, action.replace("_", " ").title())

        if risk == Risk.BLOCKED:
            self._log(action, risk, "blocked")
            raise SecurityError(f"Action '{action}' is blocked by policy.")

        if risk == Risk.CONFIRM and action in self.require_confirmation:
            approved = False
            if self.confirm_callback:
                approved = bool(self.confirm_callback(label, message or label))
            self._log(action, risk, "confirmed" if approved else "denied")
            if not approved:
                raise SecurityError(f"User declined: {action}")
            return True

        self._log(action, risk, "allowed")
        return True

    def gate_write(self, path: str, action: str = "write") -> bool:
        """Check containment, then require confirmation if configured."""
        if not self.can_write(path):
            self._log(action, Risk.BLOCKED, f"outside write roots: {path}")
            raise SecurityError(f"Path is outside the allowed workspace: {path}")
        return self.authorize(action, Risk.CONFIRM, f"About to write: {path}")

    def gate_read(self, path: str) -> bool:
        if not self.can_read(path):
            self._log("read", Risk.BLOCKED, f"outside read roots: {path}")
            raise SecurityError(f"Path is outside allowed folders: {path}")
        return self.authorize("read", Risk.SAFE)

    # ---- audit ----
    def _log(self, action, risk, result):
        with self._lock:
            self._audit.append({
                "time": datetime.now().isoformat(timespec="seconds"),
                "action": action, "risk": risk, "result": result,
            })

    def audit(self) -> List[dict]:
        with self._lock:
            return list(self._audit)


def risk_for(action: str, cfg: dict) -> str:
    """Map an action to its risk tier using config defaults."""
    if action in ("delete", "install", "shutdown", "system_change",
                  "run_unknown_exe", "overwrite"):
        return Risk.CONFIRM
    if action in ("launch", "download", "write"):
        return Risk.CONFIRM
    return Risk.SAFE