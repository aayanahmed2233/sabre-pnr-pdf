"""
JARVIS self-test for Security + Tools + Coding + Memory (no external deps).

Run on the target PC:   python selftest_phase2.py

Uses a throwaway temp workspace so it never touches real files.
Tests: security gating, path containment, emergency stop, file agent,
coding agent (create/edit/run/backup/diff), local memory, system monitor.
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import Config, DEFAULT_CONFIG
from core.security import (Security, Risk, SecurityError, EmergencyStop,
                           risk_for)
from tools.registry import ToolRegistry, Tool
from tools import file_agent, app_agent, system_monitor
from agents.coding_agent import CodingAgent
from memory.store import Memory

PASS = 0
FAIL = 0


def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}  {detail}")


def expect_error(name, fn, exc=SecurityError):
    try:
        fn()
        check(name, False, "no error raised")
    except exc:
        check(name, True)
    except Exception as e:  # noqa: BLE001
        check(name, False, f"wrong error: {e}")


def main():
    print("=" * 60)
    print(" J.A.R.V.I.S  Security + Tools self-test")
    print("=" * 60)

    tmp = tempfile.mkdtemp(prefix="jarvis_test_")
    ws = os.path.join(tmp, "workspace")
    dl = os.path.join(tmp, "downloads")
    bk = os.path.join(tmp, "backups")
    for p in (ws, dl, bk):
        os.makedirs(p, exist_ok=True)

    # auto-approve confirmations for the test
    sec = Security(require_confirmation=["delete", "overwrite", "install",
                                          "launch", "download", "write",
                                          "system_change"],
                   confirm_callback=lambda t, m: True)
    sec.add_read_root(tmp)
    sec.add_write_root(ws)
    sec.add_write_root(dl)
    sec.add_write_root(bk)

    # ---- 1. security gating ----
    print("\n[1] Security gating")
    check("safe allowed", sec.authorize("read", Risk.SAFE) is True)
    expect_error("blocked raises", lambda: sec.authorize("shutdown", Risk.BLOCKED))

    # ---- 2. path containment ----
    print("\n[2] Path containment")
    check("write inside ws", sec.can_write(os.path.join(ws, "a.txt")))
    check("write outside ws", not sec.can_write(os.path.join(tmp, "outside.txt")))
    expect_error("gate_write outside blocked",
                 lambda: sec.gate_write(os.path.join(tmp, "outside.txt")))

    # ---- 3. emergency stop ----
    print("\n[3] Emergency stop")
    sec.trigger_emergency_stop()
    expect_error("checkpoint raises after stop", lambda: sec.checkpoint(),
                 EmergencyStop)
    sec.reset_emergency_stop()
    check("cleared", sec.stopped is False)

    # ---- 4. tool registry ----
    print("\n[4] Tool registry")
    reg = ToolRegistry(sec, {})
    reg.register(Tool("read", "read", lambda: "ok", Risk.SAFE, "read"))
    reg.register(Tool("del", "delete", lambda: "deleted", Risk.CONFIRM, "delete"))
    r = reg.run("read")
    check("safe tool runs", r.ok and r.output == "ok")
    r = reg.run("del")
    check("confirm tool runs (auto-approved)", r.ok and r.output == "deleted")

    sec2 = Security(require_confirmation=["delete"],
                    confirm_callback=lambda t, m: False)  # deny
    sec2.add_write_root(ws)
    reg2 = ToolRegistry(sec2, {})
    reg2.register(Tool("del", "d", lambda: "x", Risk.CONFIRM, "delete"))
    r = reg2.run("del")
    check("confirm tool denied", (not r.ok) and "declined" in r.error.lower())

    # ---- 5. file agent ----
    print("\n[5] File agent")
    p = os.path.join(ws, "note.txt")
    out = file_agent.create_file(sec, p, "hello world")
    check("create_file", os.path.isfile(p) and "Created" in out)
    check("read_file", file_agent.read_file(sec, p) == "hello world")
    out = file_agent.edit_file(sec, p, "world", "JARVIS")
    check("edit_file", "JARVIS" in file_agent.read_file(sec, p))
    out = file_agent.search_files(sec, "note", root=ws)
    check("search_files", "note.txt" in out)

    # ---- 6. coding agent ----
    print("\n[6] Coding agent")
    ca = CodingAgent(sec, ws, bk)
    ca.ensure_workspace()
    out = ca.create_project("demo", "html")
    check("create_project", "Created project" in out
          and os.path.isfile(os.path.join(ws, "demo", "index.html")))
    out = ca.write_file("demo/index.html", "<h1>Hi</h1>")
    check("write_file", "Wrote" in out)
    out = ca.edit_file("demo/index.html", "Hi", "Hello")
    check("edit_file", "Hello" in ca.read_file("demo/index.html"))
    out = ca.list_backups()
    check("backup created", ".html" in out)
    out = ca.run_command("echo test123")
    check("run_command", "test123" in out)

    # ---- 7. memory ----
    print("\n[7] Memory")
    mem = Memory(os.path.join(tmp, "memory"))
    mem.remember("name", "Tony")
    check("remember/recall", mem.recall("name") == "Tony")
    mem.append_history({"role": "user", "content": "hi"})
    mem.append_history({"role": "assistant", "content": "hello"})
    check("history", len(mem.load_history()) == 2)
    mem.project_note("demo", "built index")
    check("project note", len(mem.project_notes("demo")) == 1)

    # ---- 8. system monitor ----
    print("\n[8] System monitor")
    status = system_monitor.system_status(sec)
    check("status string", "System status" in status)

    print("\n" + "=" * 60)
    print(f" RESULT: {PASS} passed, {FAIL} failed")
    print("=" * 60)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()