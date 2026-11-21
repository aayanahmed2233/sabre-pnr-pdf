@echo off
REM ==========================================================================
REM  JARVIS - FINAL BUILD (Phase 8)
REM  Builds a single Windows exe: dist\jarvis.exe
REM
REM  Best with Python 3.10 - 3.13 (3.12 recommended). Python 3.15 may be too
REM  new for PyInstaller. If you have the "py" launcher with 3.12, this script
REM  prefers it automatically.
REM ==========================================================================
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo.
echo === JARVIS final build ===
echo Working in: %cd%
echo.

REM ---- pick a Python interpreter (prefer py -3.12) ----
set "PY=python"
py -3.12 --version >nul 2>&1
if not errorlevel 1 (
    set "PY=py -3.12"
    echo Using py launcher -^> Python 3.12
) else (
    echo Using default 'python'
)

%PY% --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.12 from
    echo         https://www.python.org/downloads/windows/
    echo         and TICK "Add python.exe to PATH".
    pause
    exit /b 1
)

REM ---- warn if Python is very new ----
%PY% -c "import sys; v=sys.version_info[:2]; sys.exit(0 if (3,10)<=v<=(3,13) else 1)" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [WARNING] Your Python may be too new for PyInstaller ^(3.14+^).
    echo           If the build fails, install Python 3.12 and re-run.
    echo.
)

if not exist "main.py" (
    echo [ERROR] main.py not found next to build.bat.
    echo Keep all JARVIS files and folders ^(core, ai, tools, ui, ...^) together.
    pause
    exit /b 1
)

echo Installing / checking PyInstaller...
%PY% -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo [ERROR] Failed to install PyInstaller. Check internet connection.
    pause
    exit /b 1
)

echo.
echo Building jarvis.exe ^(can take a few minutes^)...
%PY% -m PyInstaller --noconfirm --clean --onefile --windowed ^
    --name jarvis ^
    --paths "%cd%" ^
    main.py
if errorlevel 1 (
    echo [ERROR] Build failed. See messages above.
    pause
    exit /b 1
)

echo.
if exist "dist\jarvis.exe" (
    echo === SUCCESS ===
    echo Your app: %cd%\dist\jarvis.exe
    echo Copy it anywhere and run. Settings save to config.json next to it.
    echo.
    echo Optional: build an installer with Inno Setup using installer.iss
) else (
    echo [ERROR] Build finished but dist\jarvis.exe was not found.
)
echo.
pause