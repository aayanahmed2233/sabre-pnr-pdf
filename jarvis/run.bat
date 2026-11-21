@echo off
REM Run JARVIS directly with Python (no need to build an .exe).
cd /d "%~dp0"
python main.py
if errorlevel 1 (
    echo.
    echo [ERROR] Could not start. Make sure Python 3 is installed and on PATH:
    echo         https://www.python.org/downloads/windows/  (tick "Add to PATH")
    pause
)