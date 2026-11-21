"""
JARVIS File agent.

Provides file/search/create/edit/open operations, all routed through Security.
Nothing here writes outside the allowed roots, and overwrites/deletes require
confirmation via the Security layer.

Every function raises SecurityError if the Security layer refuses.
"""

import os
import shutil
import subprocess
import sys

from core.security import Security, SecurityError, Risk

# Directories we never descend into during search (noise / permissions).
_SKIP_DIRS = {
    "windows", "program files", "program files (x86)", "$recycle.bin",
    "system volume information", "node_modules", ".git", "__pycache__",
    "appdata", "c:\\windows",
}


def _abs(path: str) -> str:
    return os.path.abspath(os.path.expanduser(path))


def search_files(security: Security, query: str, root: str = None,
                 limit: int = 50, max_depth: int = 6) -> str:
    """Find files/dirs whose name contains `query` (case-insensitive)."""
    security.authorize("read", Risk.SAFE)
    root = _abs(root) if root else (security.allowed_read_roots[0]
                                    if security.allowed_read_roots else os.getcwd())
    if not security.can_read(root):
        raise SecurityError(f"Root outside allowed folders: {root}")
    q = query.lower()
    results = []
    base_depth = root.rstrip(os.sep).count(os.sep)
    for dirpath, dirnames, filenames in os.walk(root):
        depth = dirpath.rstrip(os.sep).count(os.sep) - base_depth
        if depth >= max_depth:
            dirnames[:] = []
            continue
        # prune skip dirs
        dirnames[:] = [d for d in dirnames
                       if d.lower() not in _SKIP_DIRS and not d.startswith(".")]
        for name in list(dirnames) + filenames:
            if q in name.lower():
                results.append(os.path.join(dirpath, name))
                if len(results) >= limit:
                    return "\n".join(results)
    return "\n".join(results) if results else f"No matches for '{query}' under {root}"


def open_path(security: Security, path: str) -> str:
    """Open a file or folder with the default Windows application."""
    security.authorize("read", Risk.SAFE)
    p = _abs(path)
    if not security.can_read(p):
        raise SecurityError(f"Path outside allowed folders: {p}")
    if not os.path.exists(p):
        raise SecurityError(f"Does not exist: {p}")
    try:
        if sys.platform == "win32":
            os.startfile(p)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", p])
        else:
            subprocess.Popen(["xdg-open", p])
        return f"Opened: {p}"
    except Exception as e:  # noqa: BLE001
        raise SecurityError(f"Could not open: {e}") from e


def navigate_folder(security: Security, path: str) -> str:
    """Open a folder in Explorer / file manager."""
    return open_path(security, path)


def create_file(security: Security, path: str, content: str = "") -> str:
    """Create a new file (fails if it exists unless overwrite confirmed)."""
    p = _abs(path)
    if not security.can_write(p):
        raise SecurityError(f"Path outside allowed workspace: {p}")
    if os.path.exists(p):
        # overwrite requires confirmation
        security.authorize("overwrite", Risk.CONFIRM, f"Overwrite {p}?")
    else:
        security.authorize("write", Risk.CONFIRM, f"Create {p}?")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)
    return f"Created {p} ({len(content)} bytes)"


def read_file(security: Security, path: str, max_bytes: int = 200_000) -> str:
    """Read a text file (read-only, within allowed roots)."""
    security.authorize("read", Risk.SAFE)
    p = _abs(path)
    if not security.can_read(p):
        raise SecurityError(f"Path outside allowed folders: {p}")
    if not os.path.isfile(p):
        raise SecurityError(f"Not a file: {p}")
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        return f.read(max_bytes)


def edit_file(security: Security, path: str, old: str, new: str) -> str:
    """Replace an exact substring in a file (with change tracking/backup)."""
    p = _abs(path)
    if not security.can_write(p):
        raise SecurityError(f"Path outside allowed workspace: {p}")
    if not os.path.isfile(p):
        raise SecurityError(f"Not a file: {p}")
    security.authorize("overwrite", Risk.CONFIRM, f"Edit {p}?")
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    if old not in text:
        raise SecurityError("Substring to replace not found.")
    _backup(security, p)
    new_text = text.replace(old, new, 1)
    with open(p, "w", encoding="utf-8") as f:
        f.write(new_text)
    return f"Edited {p} (1 replacement)"


def delete_path(security: Security, path: str) -> str:
    """Delete a file or folder. Always requires confirmation."""
    p = _abs(path)
    if not security.can_write(p):
        raise SecurityError(f"Path outside allowed workspace: {p}")
    security.authorize("delete", Risk.CONFIRM, f"Delete {p}?")
    if os.path.isdir(p):
        shutil.rmtree(p)
        return f"Deleted folder {p}"
    os.remove(p)
    return f"Deleted {p}"


def _backup(security: Security, path: str):
    """Copy a file into a backup dir before overwriting (best effort)."""
    try:
        backup_root = security.context_backup_dir() if hasattr(
            security, "context_backup_dir") else None
        if not backup_root:
            return
        os.makedirs(backup_root, exist_ok=True)
        name = os.path.basename(path) + ".bak"
        dst = os.path.join(backup_root, name)
        shutil.copy2(path, dst)
    except Exception:  # noqa: BLE001
        pass