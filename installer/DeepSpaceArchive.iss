#define MyAppName "DeepSpace Archive"
#define MyAppVersion GetEnv("DSA_VERSION")
#if MyAppVersion == ""
  #define MyAppVersion "0.1.0"
#endif
#define MyAppPublisher "DeepSpace Archive"
#define MyAppURL "https://github.com/rockerchick082-ship-it/DeepSpaceArchive"

[Setup]
AppId={{A02D3A4A-C65B-4DB3-A1E7-6D9C9D1B9D81}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={localappdata}\Programs\DeepSpaceArchive
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\release
OutputBaseFilename=DeepSpaceArchive-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupLogging=yes
Uninstallable=yes
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\installer-staging\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\DeepSpace Archive"; Filename: "{app}\Start-DeepSpaceArchive.bat"; WorkingDir: "{app}"
Name: "{autodesktop}\DeepSpace Archive"; Filename: "{app}\Start-DeepSpaceArchive.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\Start-DeepSpaceArchive.bat"; Description: "Launch DeepSpace Archive"; Flags: nowait postinstall skipifsilent
