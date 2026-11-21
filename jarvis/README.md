# J.A.R.V.I.S — Windows AI Assistant

A Jarvis-style desktop assistant for Windows. It connects to your
**FreeLLMAPI** (any OpenAI-compatible API) using a **base URL + key**, fetches
the models your key can access, and lets you chat with them in a clean,
dark, cyan-accented window. Replies **stream in live**.

> Status: **Phase 1 (FreeLLMAPI cloud brain) built.** Voice, Windows control,
> browser, coding agent, and the optional offline brain come in later phases.
> Nothing is marked "working" until you run the test on your PC and confirm.

---

## Requirements

- **Python 3.12** recommended (newer 3.14/3.15 may lack wheels for some libs).
  On the first install screen, tick **"Add python.exe to PATH"**.
- Internet + a FreeLLMAPI base URL and key.

No third-party Python packages are required to RUN — only the standard library
and Tkinter (bundled with the official Windows Python installer).

---

## Run

1. Double-click **`run.bat`** (or: `python main.py` in the `jarvis` folder).
2. On first launch, **Settings** opens. Enter:
   - **AI Brain:** `freellm`
   - **Base URL:** your FreeLLMAPI URL (`/v1` added automatically if missing)
   - **API Key:** your key
   - **Model:** blank to auto-pick the first available
3. Click **Save**. Models load into the dropdown. Pick one and chat.

Settings are saved to `config.json` next to the app. Your key stays local.

---

## Self-test (run this!)

Before trusting the app, run the Phase 1 self-test:

```
python selftest_phase1.py
```

It checks config, backend selection, readiness, message building, and graceful
handling of the not-yet-built local brain — **without any network**.

For one real live request against your FreeLLMAPI:

```
python selftest_phase1.py --live "https://your-free-llm-api.com" "YOUR_KEY" "model-id"
```

Report the printed PASS/FAIL lines back so each feature can be marked done.

---

## Build a standalone jarvis.exe

1. Install Python 3.12 (Add to PATH).
2. Double-click **`build.bat`**.
3. Output: `dist\jarvis.exe`. Copy it anywhere; settings go in `config.json`
   next to the exe.

`requirements.txt` is only for building (PyInstaller).

---

## Architecture (modular)

```
jarvis/
  main.py            # GUI + wiring (Tkinter)
  core/config.py     # settings (config.json), defaults
  ai/engine.py       # AI engine: backend selection + streaming
     ├─ FreeLLMApiBackend   (primary cloud brain)
     └─ LocalBackend        (offline llama.cpp — Phase 2 placeholder)
  audit_hardware.py  # CPU/RAM probe
  selftest_phase1.py # tests
  build.bat / run.bat
```

Design rule: the AI **never** executes anything directly. Tool execution will
go through a Security + Tool layer in a later phase.

---

## Hardware notes (from your audit)

Your machine reported: AMD64 Family 16, ~3.75 GB RAM, Windows 10, no
AVX/SSE4.2. Implications:
- FreeLLMAPI cloud brain runs fine (needs only internet).
- A local offline brain (Phase 2) would need a **self-compiled, no-AVX llama.cpp**
  build and a very small model; RAM is tight, so the cloud brain stays primary.
- Chromium (browser agent) should run (needs SSE3, which you have) — to be
  verified in Phase 6.