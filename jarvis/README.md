# J.A.R.V.I.S — Windows AI Assistant

A modular, Jarvis-style desktop assistant for Windows.

- **Brain:** FreeLLMAPI (cloud, primary) — base URL + key, fetches **all** models
  your key can access; replies **stream live**. An optional local offline brain
  (no-AVX llama.cpp) is scaffolded for later.
- **Voice + Windows control + browser + coding agent + memory:** local.
- **Security layer:** every action passes a single permission/validation gate.
- **Emergency Stop** button halts all active work.

> Status legend: ✅ built & self-testable now · 🔌 needs an external dependency
> (install + test on your PC) · ⏳ later phase.
> **Nothing is claimed "working" until you run the test on your machine and
> paste the output.**

---

## Quick start

1. Install **Python 3.12** (tick "Add python.exe to PATH").
2. Double-click **`run.bat`** (or `python main.py` in the `jarvis` folder).
3. **Settings** (opens on first run): choose brain `freellm`, paste Base URL +
   API Key, Save. Models load into the dropdown.
4. Chat. Use **EMERGENCY STOP** (red) any time to halt everything.

No third-party packages are needed to run the core app (stdlib + Tkinter only).

---

## Self-tests (run these!)

```
python selftest_phase1.py      # AI engine, config, message building (no network)
python selftest_phase1.py --live "https://your-api" "KEY" "model-id"   # one live call
python selftest_phase2.py      # security, tools, file/coding agents, memory, emergency stop
```

Paste the PASS/FAIL lines back so features get marked done.

---

## Phase status

| # | Phase | Status | Notes |
|---|---|---|---|
| 1 | Desktop foundation (UI, chat, FreeLLMAPI brain, model loading/status, settings) | ✅ | Animated HD UI + live chat + models + settings |
| 2 | Voice (mic, STT, TTS, Hinglish, wake word/interrupt) | 🔌 | Vosk STT + SAPI TTS wired; needs `vosk`, `sounddevice`, `pywin32` + a Vosk model; wake word later |
| 3 | Windows control (file/folder search, open apps, **keyboard/mouse**, system monitor, **screen reader**) | ✅ partial | File/app/system/input/OCR tools built & gated; OCR needs Tesseract |
| 4 | Chrome agent (launch, research, navigate, download, summarize) | 🔌 | Playwright module built; needs `playwright install chromium`; dedicated profile only |
| 5 | Coding agent (site dev, edit, projects, debug, terminal, web test) | ✅ | Workspace + backups + terminal + local server; gated |
| 6 | Memory (history, project, prefs, task recovery) | ✅ | Local JSON memory; history auto-saved |
| 7 | Multi-agent (researcher/developer/tester/file manager/coordinator) | ✅ | Deterministic coordinator; can wire to LLM later |
| 8 | Final build (optimize, bugfix, offline test, PyInstaller EXE, installer/docs) | ⏳ | Build scripts present; final pass later |
| — | Security layer (permission tiers + Emergency Stop) | ✅ | All tools route through `core/security.py` |

### UI highlights
- Animated **arc-reactor** (spins faster + pulses while "thinking").
- **Splash animation** on launch (fades in/out).
- **Hover effects** on all buttons, cyan-accent dark theme, card-style chat.
- **Status dot** (green ready / cyan thinking / red error).

### Security permission map (as implemented)

| Action | Permission |
|---|---|
| Search files / read files | Automatic |
| Open applications / folders | Automatic (open) |
| Create files | Confirm |
| Edit code | Confirm + backup (change tracking) |
| Download files | Confirm, approved folder only |
| Delete / overwrite files | Confirmation |
| Install software | Confirmation |
| Run unknown EXE | Confirmation / blockable by policy |
| Shutdown / restart | Confirmation |
| **Emergency Stop** | One click stops all tasks + local servers |

---

## Optional dependencies (for later phases)

Only install what you need; the core app runs without them.

```
pip install vosk sounddevice pywin32     # voice (STT + TTS)
pip install playwright && playwright install chromium   # browser agent
```

Local offline brain (Phase 2 optional): build llama.cpp **without AVX** (your
CPU has no AVX/SSSE3) and point Settings at a small Q4 GGUF model.

---

## Project layout

```
jarvis/
  main.py                # GUI + wiring (chat, tools, emergency stop, voice toggle)
  core/  config.py security.py logging_setup.py
  ai/    engine.py       # FreeLLMAPI primary + local placeholder
  tools/ registry.py file_agent.py app_agent.py system_monitor.py
  agents/ coding_agent.py browser_agent.py
  memory/ store.py
  voice/ engine.py       # Vosk STT + SAPI TTS
  multiagent/ coordinator.py
  audit_hardware.py  selftest_phase1.py  selftest_phase2.py
  build.bat  run.bat  requirements.txt
```

---

## Build a standalone jarvis.exe

Double-click **`build.bat`** (Python 3.12, Add to PATH). Output:
`dist\jarvis.exe`. Settings live in `config.json` next to the exe.

## Notes

- Your machine (from the audit): AMD64 Family 16, ~3.75 GB RAM, Windows 10,
  no AVX/SSE4.2. FreeLLMAPI brain runs fine; a local brain needs a no-AVX build
  and a tiny model; Chromium should run (needs SSE3) — verify in Phase 4.
- API keys are never hardcoded; they live in `config.json` on your PC.