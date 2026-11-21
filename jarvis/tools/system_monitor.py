"""
JARVIS system monitor.

Read-only system information (CPU load, RAM, disk). On Windows uses ctypes
GlobalMemoryStatusEx + a lightweight CPU sample; on other OSes uses os/shutil.
No third-party deps required.
"""

import os
import shutil
import time

from core.security import Security, Risk


def _cpu_percent_windows(interval=0.3):
    try:
        import ctypes
        # Use GetSystemTimes to compute a quick CPU % sample.
        class FILETIME(ctypes.Structure):
            _fields_ = [("dwLowDateTime", ctypes.c_ulong),
                        ("dwHighDateTime", ctypes.c_ulong)]

        def to_int(ft):
            return (ft.dwHighDateTime << 32) | ft.dwLowDateTime

        k32 = ctypes.windll.kernel32
        idle1, kern1, user1 = FILETIME(), FILETIME(), FILETIME()
        k32.GetSystemTimes(ctypes.byref(idle1), ctypes.byref(kern1),
                           ctypes.byref(user1))
        time.sleep(interval)
        idle2, kern2, user2 = FILETIME(), FILETIME(), FILETIME()
        k32.GetSystemTimes(ctypes.byref(idle2), ctypes.byref(kern2),
                           ctypes.byref(user2))
        di = to_int(idle2) - to_int(idle1)
        dk = to_int(kern2) - to_int(kern1)
        du = to_int(user2) - to_int(user1)
        total = dk + du
        if total == 0:
            return 0.0
        return round(100.0 * (total - di) / total, 1)
    except Exception:
        return None


def _ram_windows():
    try:
        import ctypes
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
        gb = 1024 ** 3
        return {
            "total_gb": round(stat.ullTotalPhys / gb, 2),
            "available_gb": round(stat.ullAvailPhys / gb, 2),
            "used_percent": stat.dwMemoryLoad,
        }
    except Exception:
        return None


def system_status(security: Security) -> str:
    """Return a human-readable snapshot of CPU, RAM, and disks."""
    security.authorize("read", Risk.SAFE)
    lines = ["=== System status ==="]

    cpu = _cpu_percent_windows()
    if cpu is not None:
        lines.append(f"CPU load : {cpu}%")

    ram = _ram_windows()
    if ram:
        lines.append(f"RAM      : {ram['used_percent']}% used "
                     f"({ram['used_percent']}% = "
                     f"{ram['total_gb'] - ram['available_gb']:.2f}/"
                     f"{ram['total_gb']:.2f} GB)")
    else:
        # Fallback (non-Windows / error)
        try:
            with open("/proc/meminfo") as f:
                info = {}
                for line in f:
                    k, _, v = line.partition(":")
                    info[k] = v.strip()
            total = int(info["MemTotal"].split()[0]) // 1024 // 1024
            avail = int(info["MemAvailable"].split()[0]) // 1024 // 1024
            lines.append(f"RAM      : {total - avail} / {total} GB used")
        except Exception:
            pass

    # Disks (fixed drives)
    for drive in _fixed_drives():
        try:
            total, used, free = shutil.disk_usage(drive)
            gb = 1024 ** 3
            lines.append(f"Disk {drive} : {used/gb:.1f}/{total/gb:.1f} GB used "
                         f"({free/gb:.1f} GB free)")
        except Exception:
            continue
    return "\n".join(lines)


def _fixed_drives():
    if os.name == "nt":
        import string
        drives = []
        for letter in string.ascii_uppercase:
            d = f"{letter}:\\"
            if os.path.exists(d):
                drives.append(d)
        return drives
    return ["/"]


def list_processes(security: Security, limit: int = 15) -> str:
    """List top processes by memory (best effort, stdlib only)."""
    security.authorize("read", Risk.SAFE)
    if os.name != "nt":
        return "(process listing implemented for Windows via tasklist)"
    import subprocess
    try:
        out = subprocess.run(["tasklist", "/fo", "csv", "/nh"],
                             capture_output=True, text=True, timeout=15).stdout
        rows = []
        for line in out.splitlines()[:limit]:
            rows.append(line)
        return "\n".join(rows) if rows else "(no processes)"
    except Exception as e:  # noqa: BLE001
        return f"(could not list processes: {e})"