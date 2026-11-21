@echo off
REM ==========================================================================
REM  Build JARVIS into a single Windows .exe using PyInstaller.
REM  Just double-click this file (or run it from a command prompt).
REM ==========================================================================

echo.
echo === JARVIS build script ===
echo.

REM Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python was not found on PATH.
    echo Install Python 3 from https://www.python.org/downloads/windows/
    echo IMPORTANT: on the first install screen, tick "Add python.exe to PATH".
    echo Then re-run this script.
    pause
    exit /b 1
)

echo Installing / checking PyInstaller...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install build dependencies.
    pause
    exit /b 1
)

echo.
echo Building jarvis.exe (this can take a minute)...
python -m PyInstaller --noconfirm --clean --onefile --windowed ^
    --name jarvis ^
    main.py
if errorlevel 1 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo === Done! Your app is here:  dist\jarvis.exe ===
echo You can move jarvis.exe anywhere and run it. Your settings are saved in
echo config.json next to the .exe.
echo.
pause