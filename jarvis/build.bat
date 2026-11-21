@echo off
REM ==========================================================================
REM  Build JARVIS into a single Windows .exe using PyInstaller.
REM  Just double-click this file (or run it from a command prompt).
REM ==========================================================================

REM Always work from the folder that contains THIS script, so main.py and
REM requirements.txt are found no matter where the script is launched from.
cd /d "%~dp0"

echo.
echo === JARVIS build script ===
echo Working in: %cd%
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

REM Make sure main.py is actually next to this script
if not exist "main.py" (
    echo [ERROR] main.py was not found next to build.bat.
    echo Keep build.bat, run.bat, requirements.txt and main.py in the SAME folder.
    echo Current folder: %cd%
    dir
    pause
    exit /b 1
)

echo Installing / checking PyInstaller...
python -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo [ERROR] Failed to install PyInstaller.
    echo Check your internet connection and try again.
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
echo === Done! Your app is here:  %cd%\dist\jarvis.exe ===
echo You can move jarvis.exe anywhere and run it. Your settings are saved in
echo config.json next to the .exe.
echo.
pause