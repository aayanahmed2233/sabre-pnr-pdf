@echo off
REM ==========================================================================
REM  JARVIS - optional dependencies (voice + browser agent).
REM  These are NOT needed for core chat. Run only when you want voice / Chrome.
REM
REM  IMPORTANT: your Python is 3.15, which is very new. Some of these libraries
REM  (vosk, pywin32, playwright) may not have wheels for 3.15 yet. It is best to
REM  install Python 3.12 (tick "Add to PATH") and run this with it.
REM ==========================================================================
cd /d "%~dp0"

echo.
echo === JARVIS optional deps installer ===
echo Using Python:
python --version
echo.

echo Installing voice libraries (vosk, sounddevice, pywin32)...
python -m pip install --upgrade pip
python -m pip install vosk sounddevice pywin32
echo.

echo Installing Playwright (browser agent)...
python -m pip install playwright
python -m playwright install chromium
echo.

echo === Done ===
echo.
echo Next: download a Vosk speech model from:
echo   https://alphacephei.com/vosk/models
echo (e.g. vosk-model-small-en-us-0.15, ~40 MB)
echo Extract it, then in JARVIS Settings paste its folder path into
echo "Vosk model path" and tick "Enable voice".
pause