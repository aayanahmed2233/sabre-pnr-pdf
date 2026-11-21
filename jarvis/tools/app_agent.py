"""
JARVIS App agent: launch applications / open folders / system actions.

All launches are Security-gated. Known apps are launched by name; unknown
executables require confirmation (and can be blocked entirely by policy).
"""

import os
import shutil
import subprocess

from core.security import Security, SecurityError, Risk

# Common app-name -> executable/command map (extendable).
KNOWN_APPS = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "paint": "mspaint.exe",
    "explorer": "explorer.exe",
    "cmd": "cmd.exe",
    "powershell": "powershell.exe",
    "settings": "ms-settings:",
    "control": "control.exe",
    "task manager": "taskmgr.exe",
    "browser": None,     # default browser handled specially
    "chrome": "chrome.exe",
    "firefox": "firefox.exe",
    "word": "winword.exe",
    "excel": "excel.exe",
}


def launch_app(security: Security, app: str, args: str = "") -> str:
    """Launch a known application by name (or a resolved executable)."""
    key = app.strip().lower()
    security.authorize("launch", Risk.CONFIRM, f"Launch '{app}'?")

    if key in ("browser",):
        return _open_default_browser(security, args)
    if key in ("settings",):
        subprocess.Popen(["cmd", "/c", "start", "ms-settings:"], shell=False)
        return "Opened Settings"

    exe = KNOWN_APPS.get(key, app)
    # If it doesn't look like a known app and doesn't exist on PATH, treat as
    # unknown executable -> policy may block.
    if key not in KNOWN_APPS and not shutil.which(exe):
        if security.block_run_unknown_exe:
            security.authorize("run_unknown_exe", Risk.CONFIRM,
                               f"Run unknown executable '{exe}'?")
    cmd = [exe] + (args.split() if args else [])
    try:
        subprocess.Popen(cmd, shell=False)
        return f"Launched: {app}"
    except FileNotFoundError as e:
        raise SecurityError(f"Application not found: {exe}") from e
    except Exception as e:  # noqa: BLE001
        raise SecurityError(f"Launch failed: {e}") from e


def _open_default_browser(security: Security, url: str):
    import webbrowser
    webbrowser.open(url or "https://www.google.com")
    return f"Opened browser: {url or 'home'}"


def open_folder(security: Security, path: str) -> str:
    """Open a folder in the file manager."""
    p = os.path.abspath(os.path.expanduser(path))
    if not security.can_read(p):
        raise SecurityError(f"Folder outside allowed roots: {p}")
    security.authorize("launch", Risk.SAFE, f"Open folder {p}")
    if os.sys.platform == "win32":  # noqa
        os.startfile(p)  # type: ignore[attr-defined]
    else:
        subprocess.Popen(["xdg-open", p])
    return f"Opened folder: {p}"


def shutdown(security: Security, action: str = "shutdown") -> str:
    """Shutdown / restart / logoff. Always requires confirmation."""
    action = action.lower()
    if action not in ("shutdown", "restart", "logoff"):
        raise SecurityError("Unknown power action.")
    security.authorize("shutdown", Risk.CONFIRM, f"{action} the computer?")
    if os.sys.platform == "win32":  # noqa
        flag = {"shutdown": "/s", "restart": "/r", "logoff": "/l"}.get(action)
        subprocess.Popen(["shutdown", flag, "/t", "5"])
    else:
        cmd = {"shutdown": "poweroff", "restart": "reboot", "logoff": "loginctl"}[action]
        subprocess.Popen([cmd])
    return f"Scheduled: {action} (cancel within 5s: shutdown /a)"