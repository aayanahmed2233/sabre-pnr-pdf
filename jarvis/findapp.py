"""
Quick app resolver test.

Usage:  python findapp.py brave
Prints how JARVIS resolves an app name (registry / Start Menu / Program Files).

No third-party deps. Run on Windows for real results.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tools.app_agent import resolve_app


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "brave"
    print(f"Resolving '{name}'...")
    r = resolve_app(name)
    if not r:
        print(f"  NOT FOUND. Try the exact executable name or install path.")
    else:
        kind, path = r
        print(f"  FOUND ({kind}): {path}")


if __name__ == "__main__":
    main()