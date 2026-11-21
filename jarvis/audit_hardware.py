#!/usr/bin/env python3
"""
JARVIS - Phase 0 hardware & compatibility audit.

Run this ON THE TARGET WINDOWS PC (the Dell Inspiron 560) with the Python that
will run/build JARVIS:

    python audit_hardware.py

It prints a report to the screen AND writes audit_report.txt next to itself.
It does not modify anything else.

Purpose: verify the real CPU instruction set (AVX / AVX2 / SSE4.2 / SSE3),
RAM, OS, and Python, and recommend which AI runtime / model to use.

NOTE: this is a *probe*. It never claims a component works - it only reports
what the hardware actually supports. Use the output to choose the no-AVX build.
"""

import ctypes
import json
import os
import platform
import sys
from datetime import datetime

# IsProcessorFeaturePresent constants (winbase.h)
PF = {
    "SSE3": 13,               # PF_SSE3_INSTRUCTIONS_AVAILABLE
    "SSSE3": 36,              # PF_SSSE3_INSTRUCTIONS_AVAILABLE (approx id)
    "SSE4.1": 37,             # PF_SSE41_INSTRUCTIONS_AVAILABLE
    "SSE4.2": 38,             # PF_SSE42_INSTRUCTIONS_AVAILABLE
    "AVX": 39,                # PF_AVX_INSTRUCTIONS_AVAILABLE
    "AVX2": 40,               # PF_AVX2_INSTRUCTIONS_AVAILABLE
}


def detect_cpu_features_windows():
    """Use kernel32!IsProcessorFeaturePresent to probe CPU features."""
    features = {}
    try:
        k32 = ctypes.windll.kernel32
        for name, pid in PF.items():
            try:
                features[name] = bool(k32.IsProcessorFeaturePresent(pid))
            except Exception:
                features[name] = None
    except Exception as e:
        features["error"] = f"IsProcessorFeaturePresent unavailable: {e}"
    return features


def total_ram_gb():
    """Total physical RAM via GlobalMemoryStatusEx on Windows."""
    try:
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
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            return round(stat.ullTotalPhys / (1024 ** 3), 2)
    except Exception:
        pass
    return None


def recommend(features, ram_gb):
    """Turn raw capabilities into concrete JARVIS guidance."""
    avx = features.get("AVX")
    avx2 = features.get("AVX2")
    sse42 = features.get("SSE4.2")
    lines = []

    if avx or avx2:
        lines.append("AVX/AVX2 detected -> official llama.cpp Windows CPU builds "
                      "should run. You MAY use prebuilt binaries.")
    else:
        lines.append("NO AVX/AVX2 -> DO NOT use official llama.cpp binaries "
                      "(they crash with 0xC000001D). You MUST self-compile "
                      "llama.cpp with AVX off (GGML_AVX=OFF, GGML_AVX2=OFF, "
                      "GGML_NATIVE=OFF).")

    if sse42:
        lines.append("SSE4.2 detected -> modern Chromium (Playwright) is fine.")
    else:
        lines.append("No SSE4.2 -> still fine for Chromium (needs SSE3), but "
                      "avoid apps that require SSE4.2. Verify with a Playwright "
                      "launch test in Phase 6.")

    if ram_gb is not None:
        if ram_gb < 4.5:
            lines.append(f"Only ~{ram_gb} GB RAM -> very tight. Use the smallest "
                          "model (<=0.5B Q4) and lazy-load voice/browser; do not "
                          "keep LLM + Chromium loaded together.")
        else:
            lines.append(f"~{ram_gb} GB RAM -> OK for a 0.5B Q4 model plus voice, "
                          "but still avoid running LLM + Chromium simultaneously.")

    lines.append("FreeLLMAPI (cloud brain) works regardless of CPU, as long as "
                  "the PC has internet + a valid base URL/key.")
    return lines


def main():
    print("=" * 68)
    print(" J.A.R.V.I.S  -  Phase 0 Hardware & Compatibility Audit")
    print("=" * 68)

    report = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "python_version": sys.version.split()[0],
        "python_executable": sys.executable,
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor() or "(unknown)",
    }

    print(f"\nPython      : {report['python_version']}  ({report['python_executable']})")
    print(f"OS          : {report['platform']}")
    print(f"Machine     : {report['machine']}")
    print(f"CPU         : {report['processor']}")

    if sys.platform == "win32":
        feats = detect_cpu_features_windows()
    else:
        feats = {"note": "Not Windows - feature probe only meaningful on target PC."}
    report["cpu_features"] = feats

    print("\nCPU instruction-set probe (IsProcessorFeaturePresent):")
    if "error" in feats:
        print(f"  ERROR: {feats['error']}")
    elif "note" in feats:
        print(f"  {feats['note']}")
    else:
        for name in ["SSE3", "SSSE3", "SSE4.1", "SSE4.2", "AVX", "AVX2"]:
            val = feats.get(name)
            mark = {True: "YES", False: "no ", None: "???"}[val]
            print(f"  {name:<7}: {mark}")

    ram = total_ram_gb() if sys.platform == "win32" else None
    report["total_ram_gb"] = ram
    print(f"\nTotal RAM   : {ram if ram is not None else '(probe on Windows only)'} GB")

    # Python dependency outlook (informational, does not install anything)
    print("\nDependency outlook for Python", report["python_version"] + ":")
    major_minor = tuple(int(x) for x in report["python_version"].split(".")[:2])
    if major_minor >= (3, 14):
        print("  WARNING: very new Python. Some deps (llama-cpp-python, "
              "onnxruntime, vosk) may lack wheels yet. Consider Python 3.11/3.12 "
              "for building.")
    else:
        print("  OK: mainstream Python version, wheels should be available.")

    print("\n--- Recommendations for JARVIS ---")
    recs = recommend(feats, ram)
    for r in recs:
        print("  * " + r)
    report["recommendations"] = recs

    # Save report next to this script
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "audit_report.txt")
    try:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("JARVIS hardware audit\n")
            f.write(json.dumps(report, indent=2))
        print(f"\nReport saved to: {out_path}")
    except OSError as e:
        print(f"\n(Could not save report file: {e})")

    print("\nDone. Please share this output (or audit_report.txt).")


if __name__ == "__main__":
    main()