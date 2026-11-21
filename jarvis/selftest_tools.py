"""
JARVIS tool-calling self-test (no network).

Run:  python selftest_tools.py

Verifies:
  - parse_tool_call() detects tool calls (raw + fenced JSON) and ignores plain text
  - chat_with_tools() executes a tool then returns the final answer
  - the tool loop feeds the result back to the model
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import Config, DEFAULT_CONFIG
from ai.engine import AIEngine, parse_tool_call

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


class FakeBackend:
    """Returns scripted replies in order."""
    def __init__(self, scripted):
        self.scripted = scripted
        self.i = 0
    def chat(self, cfg, messages, on_token=None):
        r = self.scripted[min(self.i, len(self.scripted) - 1)]
        self.i += 1
        return r
    def is_ready(self, cfg):
        return True
    def ready_message(self):
        return "ok"
    def list_models(self, cfg):
        return []


def main():
    print("=" * 60)
    print(" J.A.R.V.I.S  tool-calling self-test")
    print("=" * 60)

    # ---- parse_tool_call ----
    print("\n[1] parse_tool_call")
    raw = '{"tool": "browser_search", "args": {"query": "weather"}}'
    r = parse_tool_call(raw)
    check("raw json", r == ("browser_search", {"query": "weather"}), str(r))

    fenced = "Here you go:\n```json\n{\"tool\": \"browser_open\", \"args\": {\"url\": \"x.com\"}}\n```"
    r = parse_tool_call(fenced)
    check("fenced json", r == ("browser_open", {"url": "x.com"}), str(r))

    plain = "The weather is sunny today."
    check("plain text -> None", parse_tool_call(plain) is None)

    name_only = '{"name": "system_status"}'
    r = parse_tool_call(name_only)
    check("name-only tool", r == ("system_status", {}), str(r))

    # ---- chat_with_tools ----
    print("\n[2] chat_with_tools loop")
    cfg = Config(json.loads(json.dumps(DEFAULT_CONFIG)))
    cfg["ai_backend"] = "freellm"
    eng = AIEngine(cfg)

    tool_call = '{"tool": "browser_search", "args": {"query": "weather"}}'
    final = "The weather in your city is sunny, 30°C."
    eng._backend = FakeBackend([tool_call, final])
    eng._backend_key = "freellm"

    calls = []
    def tool_runner(name, args):
        calls.append((name, args))
        return "Top result: Weather - 30C sunny"

    out = eng.chat_with_tools(
        [{"role": "user", "content": "weather?"}],
        tools_spec="You have tools.",
        tool_runner=tool_runner)

    check("tool was called once", len(calls) == 1, str(calls))
    check("tool name correct", calls and calls[0][0] == "browser_search")
    check("final answer returned", out == final, repr(out))

    # ---- on_tool callback ----
    print("\n[3] on_tool callback")
    cfg2 = Config(json.loads(json.dumps(DEFAULT_CONFIG)))
    eng2 = AIEngine(cfg2)
    eng2._backend = FakeBackend([tool_call, "Done."])
    eng2._backend_key = "freellm"
    seen = []
    eng2.chat_with_tools(
        [{"role": "user", "content": "x"}],
        tools_spec="t",
        tool_runner=lambda n, a: "RES",
        on_tool=lambda n, a, r: seen.append((n, r)))
    check("on_tool fired", seen and seen[0][1] == "RES", str(seen))

    print("\n" + "=" * 60)
    print(f" RESULT: {PASS} passed, {FAIL} failed")
    print("=" * 60)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()