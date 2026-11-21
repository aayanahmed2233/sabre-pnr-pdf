; ==========================================================================
;  JARVIS - Inno Setup installer script (Phase 8)
;  Builds a Windows installer (JARVIS-Setup.exe) from dist\jarvis.exe.
;
;  How to use:
;    1. Build jarvis.exe first (run build.bat).
;    2. Install Inno Setup: https://jrsoftware.org/isdl.php
;    3. Open this file in Inno Setup and click Compile (or run ISCC.exe).
;  Output: Output\JARVIS-Setup.exe
; ==========================================================================

#define MyAppName "JARVIS"
#define MyAppVersion "1.0"
#define MyAppPublisher "JARVIS"
#define MyAppExeName "jarvis.exe"

[Setup]
AppId={{8B2A1F3C-1E4D-4A7B-9C3E-JARVIS0001}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\JARVIS
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=JARVIS-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"

[Files]
Source: "dist\jarvis.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\JARVIS"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall JARVIS"; Filename: "{uninstallexe}"
Name: "{autodesktop}\JARVIS"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch JARVIS now"; Flags: nowait postinstall skipifsilent