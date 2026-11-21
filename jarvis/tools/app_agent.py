"""
JARVIS App agent: launch applications / open folders / system actions.

launch_app() is SMART: give it a name (e.g. "brave", "chrome", "notepad") and it
searches the system to find and launch the app:
  1. exact path / PATH
  2. known-app map
  3. Windows registry (App Paths + Uninstall entries)
  4. Start Menu shortcuts (.lnk)
  5. common install folders (Program Files, LocalAppData, ...)
  6. fallback: Windows shell "start" (resolves default apps / App Paths)

After launching it verifies the process actually started and reports the result.

All launches are Security-gated.
"""

import glob
import os
import shutil
import subprocess
import sys
import time

from core.security import Security, SecurityError, Risk

# Common app-name -> executable (fast path).
KNOWN_APPS = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "paint": "mspaint.exe",
    "explorer": "explorer.exe",
    "cmd": "cmd.exe",
    "powershell": "powershell.exe",
    "control": "control.exe",
    "task manager": "taskmgr.exe",
    "settings": "ms-settings:",
    "chrome": "chrome.exe",
    "msedge": "msedge.exe",
    "edge": "msedge.exe",
    "firefox": "firefox.exe",
    "brave": "brave.exe",
    "word": "winword.exe",
    "excel": "excel.exe",
}


# ---------------------------------------------------------------------------
# Resolution helpers
# ---------------------------------------------------------------------------

def _program_dirs():
    dirs = []
    for env in ("ProgramFiles", "ProgramFiles(x86)", "ProgramW6432",
                "LOCALAPPDATA", "APPDATA", "PROGRAMFILES(X86)"):
        v = os.environ.get(env)
        if v and v not in dirs:
            dirs.append(v)
    return dirs


def _start_menu_dirs():
    dirs = []
    for env in ("ProgramData", "APPDATA"):
        v = os.environ.get(env)
        if v:
            p = os.path.join(v, "Microsoft", "Windows", "Start Menu", "Programs")
            if os.path.isdir(p):
                dirs.append(p)
    return dirs


def _search_start_menu(name):
    """Find .lnk shortcuts whose filename contains name."""
    lower = name.lower()
    hits = []
    for base in _start_menu_dirs():
        for root, _dirs, files in os.walk(base):
            for f in files:
                if f.lower().endswith(".lnk") and lower in f.lower():
                    hits.append(os.path.join(root, f))
                    if len(hits) >= 5:
                        return hits
    return hits


def _search_program_files(name):
    """Find <name>.exe under common install folders (depth-limited)."""
    lower = name.lower()
    hits = []
    skip = {"windows", "winsxs", "dotnet", "microsoft shared", "installer",
            "$recycle.bin", "system volume information"}
    for base in _program_dirs():
        if not os.path.isdir(base):
            continue
        base_depth = base.rstrip(os.sep).count(os.sep)
        for root, dirs, files in os.walk(base):
            depth = root.rstrip(os.sep).count(os.sep) - base_depth
            if depth >= 5:
                dirs[:] = []
                continue
            dirs[:] = [d for d in dirs if d.lower() not in skip]
            for f in files:
                if f.lower().endswith(".exe") and lower in f.lower():
                    hits.append(os.path.join(root, f))
                    if len(hits) >= 5:
                        return hits
    return hits


def _search_registry(name):
    """Search App Paths + Uninstall keys for a matching display name / exe."""
    try:
        import winreg
    except ImportError:
        return None
    lower = name.lower()

    # 1) App Paths (best: direct exe path)
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                            r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths") as k:
            i = 0
            while True:
                try:
                    sub = winreg.EnumKey(k, i)
                    i += 1
                except OSError:
                    break
                if lower in sub.lower():
                    try:
                        with winreg.OpenKey(k, sub) as sk:
                            val, _ = winreg.QueryValueEx(sk, "")
                            if val and os.path.isfile(val):
                                return val
                    except OSError:
                        pass
    except OSError:
        pass

    # 2) Uninstall keys (DisplayName match -> DisplayIcon / InstallLocation)
    roots = [
        (winreg.HKEY_LOCAL_MACHINE,
         r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_LOCAL_MACHINE,
         r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_CURRENT_USER,
         r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ]
    for hive, path in roots:
        try:
            with winreg.OpenKey(hive, path) as k:
                i = 0
                while True:
                    try:
                        sub = winreg.EnumKey(k, i)
                        i += 1
                    except OSError:
                        break
                    try:
                        with winreg.OpenKey(k, sub) as sk:
                            try:
                                disp, _ = winreg.QueryValueEx(sk, "DisplayName")
                            except OSError:
                                continue
                            if lower not in str(disp).lower():
                                continue
                            for ik in ("DisplayIcon", "InstallLocation"):
                                try:
                                    iv, _ = winreg.QueryValueEx(sk, ik)
                                except OSError:
                                    continue
                                p = str(iv).split(",")[0].strip().strip('"')
                                if os.path.isfile(p):
                                    return p
                                if os.path.isdir(iv):
                                    for f in os.listdir(iv):
                                        if f.lower().endswith(".exe"):
                                            return os.path.join(iv, f)
                    except OSError:
                        continue
        except OSError:
            continue
    return None


def resolve_app(name):
    """
    Resolve an app name to (kind, path).
    kind: 'exe' | 'lnk' | 'url' | 'builtin'
    Returns None if not found.
    """
    name = (name or "").strip()
    if not name:
        return None

    # URL?
    if name.startswith(("http://", "https://", "www.")):
        return ("url", name if "://" in name else "https://" + name)

    # exact file?
    if os.path.isfile(name):
        return ("exe", os.path.abspath(name))

    # PATH?
    w = shutil.which(name)
    if w:
        return ("exe", w)

    # known app
    key = name.lower()
    if key in KNOWN_APPS and KNOWN_APPS[key]:
        exe = KNOWN_APPS[key]
        w = shutil.which(exe)
        if w:
            return ("exe", w)
        if key == "settings":
            return ("builtin", "ms-settings:")

    # registry
    reg = _search_registry(name)
    if reg:
        return ("exe", reg)

    # start menu shortcut
    lnks = _search_start_menu(name)
    if lnks:
        return ("lnk", lnks[0])

    # program files
    exes = _search_program_files(name)
    if exes:
        return ("exe", exes[0])

    return None


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

def _running_pids():
    try:
        out = subprocess.run(["tasklist", "/fo", "csv", "/nh"],
                             capture_output=True, text=True, timeout=15).stdout
        return out.lower()
    except Exception:  # noqa: BLE001
        return ""


def _verify_running(name, timeout=2.5):
    """Wait up to `timeout` seconds for a process matching `name` to appear."""
    base = name.lower()
    for ext in (".exe", ".lnk", ".com", ".bat"):
        if base.endswith(ext):
            base = base[: -len(ext)]
    if not base:
        return False
    end = time.time() + timeout
    while time.time() < end:
        if base in _running_pids():
            return True
        time.sleep(0.3)
    return False


# ---------------------------------------------------------------------------
# Public actions
# ---------------------------------------------------------------------------

def launch_app(security: Security, app: str, args: str = "") -> str:
    """Launch an app by name (scans the system to find it) and verify."""
    key = (app or "").strip().lower()
    security.authorize("launch", Risk.CONFIRM, f"Launch '{app}'?")

    if key in ("browser", "default browser", "web"):
        import webbrowser
        webbrowser.open(args or "https://www.google.com")
        return "Opened the default browser."

    resolved = resolve_app(app)
    target = None
    if resolved:
        kind, target = resolved
        if kind == "url":
            import webbrowser
            webbrowser.open(target)
            return f"Opened {target} in the browser."
        if kind == "builtin":
            subprocess.Popen(["cmd", "/c", "start", target], shell=False)
            return f"Opened {target}."
        if kind == "lnk":
            try:
                os.startfile(target)  # type: ignore[attr-defined]
            except Exception:
                subprocess.Popen(["cmd", "/c", "start", "", target], shell=False)
            ok = _verify_running(os.path.splitext(os.path.basename(target))[0])
            if ok:
                return f"Launched {app} via {target} — confirmed running."
            return f"Launched {app} via {target} (could not confirm window)."
        if kind == "exe":
            try:
                subprocess.Popen([target] + (args.split() if args else []),
                                 shell=False)
            except Exception:
                subprocess.Popen(f'start "" "{target}"', shell=True)
            ok = _verify_running(os.path.basename(target))
            if ok:
                return f"Launched {app} ({target}) — confirmed running."
            return f"Launched {app} ({target}) (could not confirm window)."

    # Fallback: let the Windows shell resolve it (Start Menu / App Paths / PATH)
    try:
        subprocess.Popen(["cmd", "/c", "start", "", app], shell=False)
        ok = _verify_running(app)
        if ok:
            return f"Launched {app} via the Windows shell — confirmed running."
        return (f"Started '{app}' via the shell, but I could not confirm a "
                f"window. If it didn't open, tell me the app's exact name.")
    except Exception as e:  # noqa: BLE001
        raise SecurityError(f"Could not launch '{app}': {e}") from e


def find_app(security: Security, name: str) -> str:
    """Return the resolved path of an app (for debugging)."""
    security.authorize("read", Risk.SAFE)
    r = resolve_app(name)
    return f"{name} -> {r}" if r else f"'{name}' not found on this system."


def open_folder(security: Security, path: str) -> str:
    p = os.path.abspath(os.path.expanduser(path))
    if not security.can_read(p):
        raise SecurityError(f"Folder outside allowed roots: {p}")
    security.authorize("launch", Risk.SAFE, f"Open folder {p}")
    if sys.platform == "win32":
        os.startfile(p)  # type: ignore[attr-defined]
    else:
        subprocess.Popen(["xdg-open", p])
    return f"Opened folder: {p}"


def shutdown(security: Security, action: str = "shutdown") -> str:
    action = action.lower()
    if action not in ("shutdown", "restart", "logoff"):
        raise SecurityError("Unknown power action.")
    security.authorize("shutdown", Risk.CONFIRM, f"{action} the computer?")
    if sys.platform == "win32":
        flag = {"shutdown": "/s", "restart": "/r", "logoff": "/l"}[action]
        subprocess.Popen(["shutdown", flag, "/t", "5"])
    else:
        cmd = {"shutdown": "poweroff", "restart": "reboot", "logoff": "loginctl"}[action]
        subprocess.Popen([cmd])
    return f"Scheduled: {action} (cancel within 5s: shutdown /a)"