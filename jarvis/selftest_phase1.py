"""
JARVIS Phase 1 self-test.

Run on the target PC:   python selftest_phase1.py

Tests the AI engine WITHOUT needing a network (no real API call). It checks:
  - config load/save round-trip
  - backend selection (freellm vs local)
  - FreeLLMAPI readiness detection
  - message building (system prompt + history)
  - local backend raises a clear "not built yet" error
  - URL normalization

If you also pass a real base_url + key, it will attempt ONE live request:
  python selftest_phase1.py --live "https://your-api" "YOUR_KEY" "model-id"
"""

import os
import sys
import json
import tempfile

# Make 'core' and 'ai' importable when run from the jarvis folder.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import Config, load_config, save_config, DEFAULT_CONFIG, CONFIG_PATH
from ai.engine import AIEngine, FreeLLMApiBackend, LocalBackend, api_base, AIError

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


def test_url_normalization():
    print("\n[1] URL normalization")
    check("adds /v1", api_base("https://x.com") == "https://x.com/v1")
    check("keeps /v1", api_base("https://x.com/v1") == "https://x.com/v1")
    check("strips slash", api_base("https://x.com/") == "https://x.com/v1")
    check("empty", api_base("") == "")


def test_config():
    print("\n[2] Config load/save round-trip")
    # Use a temp config path so we don't clobber the real one.
    import core.config as cfgmod
    tmp = os.path.join(tempfile.gettempdir(), "jarvis_test_config.json")
    if os.path.exists(tmp):
        os.remove(tmp)
    old = cfgmod.CONFIG_PATH
    cfgmod.CONFIG_PATH = tmp
    try:
        cfg = load_config()
        check("default backend", cfg["ai_backend"] == "freellm")
        check("default in-memory", cfg["model"] == DEFAULT_CONFIG["model"])
        cfg["model"] = "test-model"
        cfg["local"]["n_ctx"] = 1234
        save_config(cfg)
        cfg2 = load_config()
        check("persisted model", cfg2["model"] == "test-model")
        check("nested persisted", cfg2["local"]["n_ctx"] == 1234)
    finally:
        cfgmod.CONFIG_PATH = old
        if os.path.exists(tmp):
            os.remove(tmp)


def test_backend_selection():
    print("\n[3] Backend selection")
    cfg = Config(json.loads(json.dumps(DEFAULT_CONFIG)))
    cfg["ai_backend"] = "freellm"
    eng = AIEngine(cfg)
    check("freellm backend", isinstance(eng.backend(), FreeLLMApiBackend))

    cfg["ai_backend"] = "local"
    eng = AIEngine(cfg)
    check("local backend", isinstance(eng.backend(), LocalBackend))


def test_readiness():
    print("\n[4] FreeLLMAPI readiness")
    cfg = Config(json.loads(json.dumps(DEFAULT_CONFIG)))
    cfg["ai_backend"] = "freellm"
    eng = AIEngine(cfg)
    check("not ready (no key)", eng.is_ready() is False)

    cfg["base_url"] = "https://example.com"
    cfg["api_key"] = "abc"
    eng = AIEngine(cfg)
    check("ready (has url+key)", eng.is_ready() is True)


def test_message_building():
    print("\n[5] Message building (system prompt + history)")
    cfg = Config(json.loads(json.dumps(DEFAULT_CONFIG)))
    eng = AIEngine(cfg)
    hist = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    msgs = eng.build_messages(hist)
    check("system first", msgs[0]["role"] == "system")
    check("history preserved", msgs[1]["content"] == "hi" and msgs[2]["content"] == "hello")


def test_local_not_built():
    print("\n[6] Local backend graceful error")
    cfg = Config(json.loads(json.dumps(DEFAULT_CONFIG)))
    cfg["ai_backend"] = "local"
    eng = AIEngine(cfg)
    try:
        eng.chat([{"role": "user", "content": "hi"}])
        check("raises AIError", False, "no error raised")
    except AIError as e:
        check("raises AIError", "not built yet" in str(e).lower() or "phase 2" in str(e).lower())


def test_live(base_url, key, model):
    print("\n[7] LIVE FreeLLMAPI request")
    cfg = Config(json.loads(json.dumps(DEFAULT_CONFIG)))
    cfg["base_url"] = base_url
    cfg["api_key"] = key
    cfg["model"] = model
    eng = AIEngine(cfg)
    print("  fetching models...")
    try:
        models = eng.list_models()
        check("got model list", len(models) > 0, f"({len(models)} models)")
        print("    first few:", models[:5])
    except AIError as e:
        check("list models", False, str(e)[:120])
        return
    print("  sending a tiny chat request (streaming)...")
    pieces = []
    try:
        eng.chat([{"role": "user", "content": "Say hello in one short sentence."}],
                 on_token=lambda t: pieces.append(t))
        full = "".join(pieces)
        check("got streamed reply", len(full) > 0)
        print("    reply:", full[:200])
    except AIError as e:
        check("chat", False, str(e)[:120])


def main():
    print("=" * 60)
    print(" J.A.R.V.I.S  Phase 1 self-test")
    print("=" * 60)
    test_url_normalization()
    test_config()
    test_backend_selection()
    test_readiness()
    test_message_building()
    test_local_not_built()

    args = sys.argv[1:]
    if "--live" in args:
        i = args.index("--live")
        rest = args[i + 1:]
        if len(rest) >= 2:
            base_url = rest[0]
            key = rest[1]
            model = rest[2] if len(rest) > 2 else ""
            test_live(base_url, key, model)
        else:
            print("\n[7] LIVE skipped: need --live <base_url> <api_key> [model]")

    print("\n" + "=" * 60)
    print(f" RESULT: {PASS} passed, {FAIL} failed")
    print("=" * 60)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()