# J.A.R.V.I.S — Windows AI Assistant

A Jarvis-style desktop chat assistant for Windows. It connects to your
**FreeLLMAPI** (any OpenAI-compatible API) using a **base URL + API key**,
fetches the list of models it offers, and lets you chat with them in a
clean, dark, cyan-accented window.

Chat replies **stream in live**, so it feels like a real assistant.

---

## What you get

- `main.py` — the app (pure Python standard library + Tkinter; nothing else to install to run it)
- `build.bat` — turns the app into a single `jarvis.exe`
- `run.bat` — runs the app directly with Python (no build needed)
- `requirements.txt` — only used when building the .exe (PyInstaller)

---

## Option A — Run without building (quick test)

1. Install Python 3 from <https://www.python.org/downloads/windows/>.
   **On the first install screen, tick “Add python.exe to PATH”.**
2. Double-click **`run.bat`**.

The Settings window opens on first launch.

---

## Option B — Build a standalone `jarvis.exe` (recommended)

1. Install Python 3 (see above, remember “Add to PATH”).
2. Double-click **`build.bat`**.
3. When it finishes, your program is at **`dist\jarvis.exe`**.

`jarvis.exe` is a single file. Copy it anywhere (Desktop, etc.) and run it —
no Python needed on the target PC. Settings are stored in `config.json`
created **next to the .exe** the first time you save them.

> Tip: to give it a custom icon, add `--icon=myicon.ico` to the PyInstaller
> line in `build.bat`.

---

## First-time setup (Settings)

Open **Settings** and fill in:

| Field | What to enter |
|-------|---------------|
| **Base URL** | Your FreeLLMAPI base URL. `…/v1` is added automatically if missing. e.g. `https://your-free-llm-api.com` |
| **API Key** | Your FreeLLMAPI key |
| **Model** | Leave blank to auto-select the first available model |
| **System prompt** | The assistant's persona (a JARVIS-style default is included) |
| **Temperature** | 0 = focused, 1+ = creative |

Click **Save**. The app then calls **Refresh models** automatically and fills
the model dropdown with every model your key can access. Pick one and start
chatting.

Your key is saved locally in `config.json` on your own PC only — it is never
sent anywhere except your FreeLLMAPI.

---

## Using it

- Type a message and press **Enter** to send.
- **Shift+Enter** inserts a new line.
- **Refresh models** re-fetches the model list.
- **Clear chat** wipes the conversation history.
- **Settings** re-opens configuration any time.

---

## Troubleshooting

- **“Python was not found”** → install Python and tick *Add to PATH*, then reopen the terminal / re-run the script.
- **HTTP 401 / 403** → wrong or missing API key.
- **HTTP 404** → the Base URL is wrong. It should point at the API root; the app appends `/v1/chat/completions` and `/v1/models`.
- **No models returned** → some providers need the exact base path (with or without `/v1`). Try toggling the `/v1` suffix in the Base URL.
- **Antivirus flags jarvis.exe** → common for PyInstaller builds; it's a false positive from the packer. You can allow it or run via `run.bat` instead.

---

## How it works (short version)

- `GET  {base}/v1/models`            → list available models
- `POST {base}/v1/chat/completions`  → send chat (with `stream: true` for live text)

Uses only `urllib` from the standard library, so there are no runtime
dependencies. Tkinter ships with the official Windows Python installer.