; Compile through Build-Installer.ps1 with a reviewed, matching release payload.
#ifndef PayloadDir
  #error PayloadDir is required
#endif
#ifndef AppVersion
  #error AppVersion is required
#endif
#ifndef OutputPath
  #error OutputPath is required
#endif

[Setup]
AppId=PixelStudio.Standalone
AppName=Pixel Studio
AppVersion={#AppVersion}
AppPublisher=OWEN
AppPublisherURL=https://github.com/OW3N-HE/Pixel-Studio
AppUpdatesURL=https://github.com/OW3N-HE/Pixel-Studio/releases
DefaultDirName={autopf}\PixelStudio
DefaultGroupName=Pixel Studio
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
UsePreviousPrivileges=yes
DisableWelcomePage=yes
LanguageDetectionMethod=uilanguage
UsePreviousLanguage=no
ShowLanguageDialog=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputPath}
#ifdef TestPackage
OutputBaseFilename=PixelStudio-Setup-{#AppVersion}-TEST
AppVerName=Pixel Studio {#AppVersion} TEST
#else
OutputBaseFilename=PixelStudio-Setup-{#AppVersion}
#endif
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
CloseApplications=yes
CloseApplicationsFilter=*.exe,*.dll,*.asar
RestartApplications=no
LicenseFile={#PayloadDir}\LICENSE
UninstallDisplayName=Pixel Studio
UsePreviousAppDir=yes
UsePreviousTasks=yes
UsePreviousSetupType=yes
SetupIconFile=..\desktop\assets\pixel-studio.ico
UninstallDisplayIcon={app}\pixel-studio.ico

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "zh"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Messages]
en.ApplicationsFound=These applications are using Pixel Studio files. Save your work, then allow Setup to close them. If closing them yourself, quit Pixel Studio Desktop and OpenRGB from the system tray; closing their windows may leave them running.
zh.ApplicationsFound=以下程序正在占用 Pixel Studio 文件。请先保存工作，再允许安装程序关闭它们。若自行关闭，请从系统托盘完全退出 Pixel Studio Desktop 和 OpenRGB；仅关闭窗口可能仍在后台运行。
en.ErrorCloseApplications=Some files are still in use. Quit Pixel Studio Desktop and OpenRGB from the system tray, and stop any Pixel Studio DDP bridge you started. Retry after they exit; do not skip files or end unrelated Node.js processes.
zh.ErrorCloseApplications=部分文件仍被占用。请从系统托盘退出 Pixel Studio Desktop 和 OpenRGB，并停止自己启动的 Pixel Studio DDP 桥接服务。完全退出后重试；不要跳过文件，也不要结束其他软件的 Node.js 进程。

[CustomMessages]
en.UpdateCloseAppsHint=Before installing or updating:%nQuit Pixel Studio Desktop and OpenRGB from the system tray. Stop any Pixel Studio DDP bridge you started. Closing a window or stopping playback alone may not release the files.%nSetup will check for files in use before copying. If node.exe is listed, it may be Pixel Studio's bundled runtime. Do not skip locked files.
zh.UpdateCloseAppsHint=安装或更新前：%n请从系统托盘完全退出 Pixel Studio Desktop 和 OpenRGB，并停止自己启动的 Pixel Studio DDP 桥接服务。仅关闭窗口或停止播放不一定会释放文件。%n安装程序会在复制前检查文件占用。列表中的 node.exe 可能是 Pixel Studio 自带的运行环境，请不要跳过被占用的文件。
zh.DesktopOnly=桌面版（推荐，支持托盘与开机启动）
en.DesktopOnly=Desktop edition (recommended, tray and login startup)
zh.DesktopFiles=Electron 桌面版（托盘、自启动、串口记忆）
en.DesktopFiles=Electron desktop (tray, login startup, remembered port)
zh.SharedFiles=共用动画库及运行文件（必需）
en.SharedFiles=Shared animation library and application files (required)
zh.WebOnly=仅使用网页版（USB，无需其他软件）
en.WebOnly=Web edition only (USB, no extra software)
zh.Full=全部安装（桌面版、网页版、OpenRGB 插件）
en.Full=All editions (desktop, web and OpenRGB plugin)
zh.Custom=自定义安装
en.Custom=Custom installation
zh.WebFiles=网页版及内置服务（USB / DDP）
en.WebFiles=Web edition with bundled service (USB / DDP)
zh.PluginFiles=OpenRGB 插件及内置 Node.js（需兼容的 OpenRGB）
en.PluginFiles=OpenRGB plugin and private Node.js (compatible OpenRGB required)
zh.Desktop=在桌面创建快捷方式
en.Desktop=Create a desktop shortcut
zh.Guide=开始使用与安装帮助
en.Guide=Getting started and installation help
zh.OpenGuide=打开使用说明
en.OpenGuide=Open the getting-started guide
zh.PluginTitle=OpenRGB 插件位置
en.PluginTitle=OpenRGB plugin folder
zh.PluginSubtitle=通常无需更改默认位置。
en.PluginSubtitle=The default location normally does not need changing.
zh.PluginHint=请先退出 OpenRGB。标准安装使用默认目录；便携版请选择其实际 plugins 目录。已有动画库路径和偏好设置会保留。本安装包不包含 OpenRGB 主程序。
en.PluginHint=Close OpenRGB first. Use the default for a standard installation; select the actual plugins folder for a portable installation. Existing library paths and preferences are preserved. OpenRGB itself is not included.
zh.PluginFolder=插件文件夹：
en.PluginFolder=Plugins folder:
zh.UninstallHint=已保留偏好设置、备份和 OpenRGB 插件 DLL。如不再使用，请在 OpenRGB 插件目录移除 PixelStudioPlugin.dll。卸载运行环境后，不要继续启用该插件。
en.UninstallHint=Preferences, backups and the OpenRGB DLL were preserved. Remove PixelStudioPlugin.dll from the OpenRGB plugins folder if no longer needed. Do not enable it after its runtime is removed.
zh.RemoveSettingsPrompt=是否同时删除当前卸载账户的个人设置？%n%n是：删除下列设置、桌面缓存和保存的串口。%n否（默认）：保留，重装后继续使用。%n取消：取消卸载。%n%n涉及位置：%n%1%n%n不会删除开发项目、安装备份或其他 Windows 用户的设置。
en.RemoveSettingsPrompt=Also remove personal settings for the account running this uninstaller?%n%nYes: remove the settings, desktop cache and remembered port listed below.%nNo (default): keep them for reinstallation.%nCancel: cancel uninstall.%n%nLocations:%n%1%n%nDevelopment projects, installer backups and other Windows users' settings are not removed.
zh.SettingsRemovedHint=已请求删除所列个人设置。备份及外部 OpenRGB 插件 DLL 仍保留；不再使用时请从 OpenRGB 插件目录移除对应 DLL。
en.SettingsRemovedHint=Removal of the listed personal settings was requested. Backups and external OpenRGB plugin DLLs are retained; remove the corresponding DLL from OpenRGB if no longer needed.
en.ScopeTitle=Choose installation scope
zh.ScopeTitle=选择安装范围
en.ScopeSubtitle=Install for all users or only for your account.
zh.ScopeSubtitle=为所有用户安装，或仅为当前账户安装。
en.ScopeHint=All users requires administrator permission. Existing installations keep their original scope to avoid duplicate entries.
zh.ScopeHint=所有用户安装需要管理员权限。已有安装将保持原范围，避免重复条目。
en.ScopeAll=All users (recommended; administrator permission required)
zh.ScopeAll=所有用户（推荐，需要管理员权限）
en.ScopeUser=Only me (no administrator permission required)
zh.ScopeUser=仅当前用户（无需管理员权限）
en.ScopeError=Administrator permission was not granted. Try again or choose only me for a new installation.
zh.ScopeError=未获得管理员权限。请重试，或在全新安装时选择仅当前用户。

[Types]
Name: custom; Description: "{cm:Custom}"; Flags: iscustom

[Components]
Name: core; Description: "{cm:SharedFiles}"; Types: custom; Flags: fixed
Name: desktop; Description: "{cm:DesktopFiles}"; Types: custom
Name: web; Description: "{cm:WebFiles}"
Name: plugin; Description: "{cm:PluginFiles}"

[Tasks]
Name: desktopicon; Description: "{cm:Desktop}"

[Files]
Source: "Migrate-Legacy.ps1"; Flags: dontcopy
Source: "..\desktop\assets\pixel-studio.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#PayloadDir}\desktop\*"; DestDir: "{app}\desktop"; Components: desktop; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadDir}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadDir}\runtime\*"; DestDir: "{app}\runtime"; Components: web or plugin; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadDir}\plugin\PixelStudioPlugin.dll"; DestDir: "{code:PluginDirectory}"; Components: plugin; Flags: ignoreversion uninsneveruninstall
Source: "{#PayloadDir}\LICENSE"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
Root: HKA; Subkey: "Software\PixelStudio\Installer"; ValueType: string; ValueName: "ProjectPath"; ValueData: "{app}\app"; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\PixelStudio\Installer"; ValueType: string; ValueName: "NodePath"; ValueData: "{app}\runtime\node.exe"; Components: plugin; Flags: uninsdeletevalue

[Icons]
Name: "{group}\Pixel Studio Desktop"; Filename: "{app}\desktop\Pixel Studio Desktop.exe"; Components: desktop; AppUserModelID: "com.ow3nhe.pixelstudio.desktop"
Name: "{autodesktop}\Pixel Studio Desktop"; Filename: "{app}\desktop\Pixel Studio Desktop.exe"; Components: desktop; Tasks: desktopicon; AppUserModelID: "com.ow3nhe.pixelstudio.desktop"
Name: "{group}\Pixel Studio Web"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\app\Start-Pixel-DDP.ps1"""; WorkingDir: "{app}\app"; IconFilename: "{app}\pixel-studio.ico"; Components: web
Name: "{autodesktop}\Pixel Studio Web"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\app\Start-Pixel-DDP.ps1"""; WorkingDir: "{app}\app"; IconFilename: "{app}\pixel-studio.ico"; Components: web; Tasks: desktopicon
Name: "{group}\{cm:Guide}"; Filename: "{app}\app\GETTING-STARTED.html"
Name: "{group}\Uninstall Pixel Studio"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\app\GETTING-STARTED.html"; Description: "{cm:OpenGuide}"; Flags: shellexec postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{userappdata}\Pixel Studio Desktop"; Check: ShouldRemovePersonalSettings
Type: filesandordirs; Name: "{userappdata}\pixel-studio-desktop"; Check: ShouldRemovePersonalSettings
Type: filesandordirs; Name: "{userappdata}\Pixel Studio for OpenRGB"; Check: ShouldRemovePersonalSettings
Type: files; Name: "{userappdata}\PixelStudio\OpenRGBPlugin.ini"; Check: ShouldRemovePersonalSettings
Type: dirifempty; Name: "{userappdata}\PixelStudio"; Check: ShouldRemovePersonalSettings

[Code]
var
  PluginPage: TInputDirWizardPage;
  BackupComplete: Boolean;
  MigrationPrepared: Boolean;
  RemovePersonalSettings: Boolean;
  LanguageOK, LanguageCancel: TNewButton;




function ShouldRemovePersonalSettings: Boolean;
begin
  Result := RemovePersonalSettings;
end;

function InitializeUninstall: Boolean;
var
  Choice: Integer;
  Locations: String;
begin
  RemovePersonalSettings := False;
  Result := True;
  { Silent upgrades must preserve profiles without prompting. }
  if UninstallSilent then Exit;
  Locations := ExpandConstant('{userappdata}\Pixel Studio Desktop') + #13#10 +
    ExpandConstant('{userappdata}\pixel-studio-desktop') + #13#10 +
    ExpandConstant('{userappdata}\Pixel Studio for OpenRGB') + #13#10 +
    ExpandConstant('{userappdata}\PixelStudio\OpenRGBPlugin.ini');
  Choice := MsgBox(FmtMessage(CustomMessage('RemoveSettingsPrompt'), [Locations]),
    mbConfirmation, MB_YESNOCANCEL or MB_DEFBUTTON2);
  Result := Choice <> IDCANCEL;
  RemovePersonalSettings := Choice = IDYES;
end;

function RunMigration(Mode: String): Boolean;
var
  Parameters: String;
  ExitCode: Integer;
begin
  ExtractTemporaryFile('Migrate-Legacy.ps1');
  Parameters := '-NoProfile -ExecutionPolicy Bypass -File "' +
    ExpandConstant('{tmp}\Migrate-Legacy.ps1') + '" -Mode ' + Mode +
    ' -InstallDir "' + ExpandConstant('{app}') + '"';
  if WizardIsComponentSelected('desktop') then Parameters := Parameters + ' -DesktopSelected';
  Result := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    Parameters, '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
  if Result then Result := ExitCode = 0;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    if not RunMigration('Finalize') then
      MsgBox('程序已安装，但自启动迁移失败。请在桌面版设置中重新设置自启动。' + #13#10 +
        'Installed, but startup migration failed. Reconfigure login startup in desktop settings.', mbInformation, MB_OK);
end;

function PluginDirectory(Param: String): String;
begin
  Result := PluginPage.Values[0];
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo,
  MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := CustomMessage('UpdateCloseAppsHint');
  if MemoUserInfoInfo <> '' then
    Result := Result + NewLine + NewLine + MemoUserInfoInfo;
  if MemoDirInfo <> '' then
    Result := Result + NewLine + NewLine + MemoDirInfo;
  if MemoTypeInfo <> '' then
    Result := Result + NewLine + NewLine + MemoTypeInfo;
  if MemoComponentsInfo <> '' then
    Result := Result + NewLine + NewLine + MemoComponentsInfo;
  if MemoGroupInfo <> '' then
    Result := Result + NewLine + NewLine + MemoGroupInfo;
  if MemoTasksInfo <> '' then
    Result := Result + NewLine + NewLine + MemoTasksInfo;
end;

procedure InitializeWizard;
begin
  PluginPage := CreateInputDirPage(wpSelectComponents,
    CustomMessage('PluginTitle'), CustomMessage('PluginSubtitle'),
    CustomMessage('PluginHint'), False, '');
  PluginPage.Add(CustomMessage('PluginFolder'));
  PluginPage.Values[0] := ExpandConstant('{userappdata}\OpenRGB\plugins');
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := (PageID = PluginPage.ID) and not WizardIsComponentSelected('plugin');
end;



function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  OldDll, BackupDir, BackupFile: String;
begin
  Result := '';
  if not MigrationPrepared then begin
    if RegKeyExists(HKLM64, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\4049925d-f69c-5df6-8487-1535b0cf2717') or
       RegKeyExists(HKLM32, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\4049925d-f69c-5df6-8487-1535b0cf2717') or
       RegKeyExists(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\4049925d-f69c-5df6-8487-1535b0cf2717') then begin
      if WizardSilent then begin
        Result := 'Legacy desktop detected. Run the installer interactively to migrate.';
        Exit;
      end;
      if MsgBox('检测到旧独立桌面版。将先备份配置，再打开旧版卸载程序；请不要删除用户数据。卸载完成后继续安装三合一版本。是否继续？' + #13#10 +
        'The legacy desktop edition must be removed first. Back up settings and open its uninstaller? Keep user data when uninstalling.', mbConfirmation, MB_YESNO) <> IDYES then begin
        Result := 'Migration cancelled; no new files installed.';
        Exit;
      end;
    end;
    if not RunMigration('Prepare') then begin
      Result := '迁移或备份未完成，请先退出托盘中的桌面版。错误详情：' +
        ExpandConstant('{localappdata}\PixelStudio\Migration\last-error.txt');
      Exit;
    end;
    MigrationPrepared := True;
  end;
  if not WizardIsComponentSelected('plugin') or BackupComplete then Exit;
  if Trim(PluginPage.Values[0]) = '' then begin
    Result := 'Select an OpenRGB plugins folder.';
    Exit;
  end;
  OldDll := AddBackslash(PluginPage.Values[0]) + 'PixelStudioPlugin.dll';
  if FileExists(OldDll) then begin
    BackupDir := ExpandConstant('{localappdata}\PixelStudio\InstallerBackups');
    BackupFile := AddBackslash(BackupDir) + 'PixelStudioPlugin-' +
      GetDateTimeString('yyyymmdd-hhnnss-zzz', '-', '-') + '.dll';
    if not ForceDirectories(BackupDir) then begin
      Result := 'Unable to create the backup directory. Installation stopped.';
      Exit;
    end;
    if not FileCopy(OldDll, BackupFile, True) then begin
      Result := 'Unable to back up the existing plugin. Installation stopped.';
      Exit;
    end;
  end;
  BackupComplete := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    if not UninstallSilent then begin
      if RemovePersonalSettings then
        MsgBox(CustomMessage('SettingsRemovedHint'), mbInformation, MB_OK)
      else
        MsgBox(CustomMessage('UninstallHint'), mbInformation, MB_OK);
    end;
end;
