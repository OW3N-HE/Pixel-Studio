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
SetupArchitecture=x64
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
; Interactive Setup lists the affected apps and asks before closing them.
; Force is limited to Restart Manager's file owners, never every node.exe.
CloseApplications=force
CloseApplicationsFilter=*.exe,*.dll,*.asar
RestartApplications=no
LicenseFile={#PayloadDir}\LICENSE
UninstallDisplayName=Pixel Studio
UsePreviousAppDir=yes
UsePreviousTasks=yes
UsePreviousSetupType=no
SetupIconFile=..\desktop\assets\pixel-studio.ico
UninstallDisplayIcon={uninstallexe}

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "zh"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Messages]
en.ApplicationsFound=These applications are using Pixel Studio files. Save your work, then allow Setup to close them. If closing them yourself, quit Pixel Studio Desktop and OpenRGB from the system tray; closing their windows may leave them running.
zh.ApplicationsFound=以下程序正在占用 Pixel Studio 文件。请先保存工作，再允许安装程序关闭它们。若自行关闭，请从系统托盘完全退出 Pixel Studio Desktop 和 OpenRGB；仅关闭窗口可能仍在后台运行。
en.ErrorCloseApplications=Some files are still in use. Quit Pixel Studio Desktop and OpenRGB from the system tray, and stop any Pixel Studio DDP bridge you started. Retry after they exit; do not skip files or end unrelated Node.js processes.
zh.ErrorCloseApplications=部分文件仍被占用。请从系统托盘退出 Pixel Studio Desktop 和 OpenRGB，并停止自己启动的 Pixel Studio DDP 桥接服务。完全退出后重试；不要跳过文件，也不要结束其他软件的 Node.js 进程。

[CustomMessages]
en.SensorServiceConsent=Enable CPU/GPU temperature monitoring (administrator permission required)
zh.SensorServiceConsent=启用 CPU/GPU 温度采集（需要管理员授权）
en.ComponentsHint=Required animation libraries and runtime components are installed automatically. The OpenRGB plugin requires OpenRGB.
zh.ComponentsHint=所选版本需要的动画库和运行组件将自动安装。OpenRGB 插件需已安装 OpenRGB。
en.SelectEdition=Select at least one edition.
zh.SelectEdition=请至少选择一个版本。
en.SharedFiles=Shared animation library and runtime (required for Web / OpenRGB)
zh.SharedFiles=共用动画库与运行组件（网页版 / OpenRGB 必选）
en.SensorServiceFailed=The temperature service could not be configured. Animation playback is still available. CPU temperatures may remain unavailable; do not change PawnIO or Fan Control settings. Run the installer again with administrator permission to retry this optional feature.
zh.SensorServiceFailed=温度采集服务配置失败，动画播放不受影响，CPU 温度可能仍不可用。请勿更改 PawnIO 或 Fan Control 设置；可使用管理员权限重新运行安装程序，重试这一可选功能。
en.UpdateCloseAppsHint=Save your work and OpenRGB settings before installing.%nSetup will list applications using the files being updated. If you choose automatic closing, unresponsive applications may be forcibly closed and unsaved changes lost. Alternatively quit them from the tray yourself.%nOnly owners of the affected files are targeted, not unrelated Node.js processes or Fan Control. Do not skip locked files.
zh.UpdateCloseAppsHint=安装前请保存工作和 OpenRGB 设置。%n安装程序会列出占用待更新文件的应用。选择自动关闭后，无响应的应用可能被强制关闭，未保存的更改会丢失；也可自行从托盘退出。%n仅处理占用目标文件的程序，不会批量结束 Node.js 或关闭 Fan Control。请不要跳过被占用的文件。
zh.DesktopOnly=桌面版（推荐，支持托盘与开机启动）
en.DesktopOnly=Desktop edition (recommended, tray and login startup)
zh.DesktopFiles=桌面版
en.DesktopFiles=Desktop
zh.WebOnly=仅使用网页版（USB，无需其他软件）
en.WebOnly=Web edition only (USB, no extra software)
zh.Full=全部安装（桌面版、网页版、OpenRGB 插件）
en.Full=All editions (desktop, web and OpenRGB plugin)
zh.Custom=自定义安装
en.Custom=Custom installation
zh.WebFiles=网页版
en.WebFiles=Web
zh.PluginFiles=OpenRGB 插件
en.PluginFiles=OpenRGB plugin
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
zh.UninstallHint=已保留个人设置和升级备份。安装器安装的 OpenRGB 插件随程序移除；若提示重启，请重启后再打开 OpenRGB。
en.UninstallHint=Personal settings and upgrade backups were preserved. The OpenRGB plugin installed by Setup is removed with the application; restart Windows if requested before reopening OpenRGB.
zh.UninstallTitle=卸载 Pixel Studio
en.UninstallTitle=Uninstall Pixel Studio
zh.RemoveSettingsPrompt=请先从托盘完全退出 Pixel Studio Desktop 和 OpenRGB。%n%n两种方式都会移除程序及安装器安装的插件。完全清除还会删除当前卸载账户的设置、缓存、记住的串口及升级备份。%n%n不会删除其他插件、PawnIO、开发项目、外部媒体或其他账户的数据。浏览器中的网页版设置需另行清除。
en.RemoveSettingsPrompt=Quit Pixel Studio Desktop and OpenRGB from the tray first.%n%nBoth options remove the application and its installed plugin. Complete cleanup also deletes settings, caches, remembered ports and upgrade backups for the account running this uninstaller.%n%nOther plugins, PawnIO, projects, external media and other accounts are kept. Web settings in browser profiles must be cleared separately.
zh.UninstallKeep=卸载并保留设置（默认）
en.UninstallKeep=Uninstall and keep settings (default)
zh.UninstallPurge=卸载并完全清除
en.UninstallPurge=Uninstall and completely clear data
zh.UninstallCancel=取消
en.UninstallCancel=Cancel
zh.UninstallName=卸载 Pixel Studio
en.UninstallName=Uninstall Pixel Studio
zh.UninstallBlocked=尚未开始删除文件。无法完成占用检查，或部分程序未能关闭。%n%n请保存工作，从托盘退出相关程序后点击“重试”。不要关闭 Fan Control 或无关 Node.js 程序。%n%n检查结果：%n%1
en.UninstallBlocked=No files have been deleted. The ownership check failed, or some applications could not be closed.%n%nSave work, quit the affected applications from the tray, and click Retry. Do not stop Fan Control or unrelated Node.js processes.%n%nCheck results:%n%1
zh.UninstallCloseApps=以下程序正在占用 Pixel Studio 文件：%n%1%n%n请先保存工作和 OpenRGB 设置。%n是：允许卸载器关闭这些程序；无响应的程序可能被强制结束，未保存内容可能丢失。%n否：自行从托盘退出相关程序，然后重新检查。%n取消：取消卸载，不删除文件。%n%n仅处理目标文件的占用者，不关闭 Fan Control 或无关 Node.js 程序。
en.UninstallCloseApps=These applications are using Pixel Studio files:%n%1%n%nSave your work and OpenRGB settings first.%nYes: allow the uninstaller to close them; unresponsive applications may be forcibly closed and unsaved work lost.%nNo: quit them from the tray yourself, then check again.%nCancel: cancel uninstall without deleting files.%n%nOnly owners of the affected files are targeted, not Fan Control or unrelated Node.js processes.
zh.PurgeConfirm=完全清除后，本账户的个人设置、缓存和升级备份无法恢复。确定继续？
en.PurgeConfirm=This permanently deletes this account's personal settings, caches and upgrade backups. Continue?
zh.SettingsRemovedHint=已清除本账户的 Pixel Studio 设置、缓存和升级备份。安装器安装的插件随程序移除；若提示重启，请重启完成删除。其他插件和共享驱动未改动。
en.SettingsRemovedHint=This account's Pixel Studio settings, caches and upgrade backups were cleared. The installed plugin is removed with the application; restart if requested to finish removal. Other plugins and shared drivers were not changed.
zh.CleanupFailed=程序已卸载，但个人数据或自启动清理未全部完成。请查看清理记录：%n%1%n%n请勿将此结果视为完全清除。
en.CleanupFailed=The application was uninstalled, but data or startup cleanup did not fully complete. See the cleanup report:%n%1%n%nComplete cleanup has not been confirmed.
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
en.PawnIOTitle=Temperature sensor driver
zh.PawnIOTitle=温度采集驱动
en.PawnIOSubtitle=Prepare the driver before continuing with Pixel Studio.
zh.PawnIOSubtitle=完成驱动准备后，继续安装 Pixel Studio。
en.PawnIOReuse=PawnIO %1 is registered within this build's tested version range. Setup will reuse it without reinstalling or downgrading. Sensor access is checked when temperature monitoring starts.
zh.PawnIOReuse=已登记的 PawnIO %1 在本安装包已测试的版本范围内，将直接复用，不重复安装或降级。实际传感器访问能力在启动温度采集时检查。
en.PawnIOMissing=PawnIO has not been detected. Complete the official driver installation first. Next will become available once the driver is detected.
zh.PawnIOMissing=未检测到 PawnIO。请先完成官方驱动安装；检测到驱动后，即可点击“下一步”继续安装 Pixel Studio。
en.PawnIORequired=The driver has not been detected yet. Use the installation action on this page, or install it from the official website and click Check again.
zh.PawnIORequired=暂未检测到驱动。请使用本页的安装按钮，或从官方网站完成安装后点击“重新检测”。
en.PawnIOOld=PawnIO %1 is registered, but this build requires at least %2. No automatic upgrade will run. Close other monitoring tools before a driver update and follow the official installer instructions.
zh.PawnIOOld=已登记 PawnIO %1，本安装包要求至少 %2。不会自动升级；更新驱动前请退出其他监控软件，并按官方安装程序的提示操作。
en.PawnIONewer=PawnIO %1 is registered, but is outside this build's tested version range. Setup will not downgrade or replace it. Compatibility must be checked before using temperature monitoring.
zh.PawnIONewer=已登记 PawnIO %1，但超出本安装包已测试的版本范围。不会降级或覆盖；使用温度采集前需确认兼容性。
en.PawnIODetected=PawnIO %1 was found and will be kept. Click Next to continue. Compatibility has not been confirmed by this build; check temperature readings after installation.
zh.PawnIODetected=已检测到 PawnIO %1，将保留现有驱动。可点击“下一步”继续；本版本尚未确认其兼容性，请在安装后检查温度读数。
en.PawnIOUnknown=PawnIO registration exists, but its version could not be determined. Setup will not reinstall or replace it. Check the existing driver before making changes.
zh.PawnIOUnknown=存在 PawnIO 安装记录，但无法确定版本。不会重复安装或覆盖，请先确认已有驱动的状态。
en.PawnIOConflict=Conflicting PawnIO version records were found. Setup will not modify the driver. Resolve the registration conflict before updating it.
zh.PawnIOConflict=发现不一致的 PawnIO 版本记录。安装程序不会修改驱动，请先确认已有安装状态再更新。
en.PawnIOHint=PawnIO is a shared system driver, possibly used by Fan Control or other tools. Pixel Studio will not install or change it without your approval. Removing Pixel Studio leaves PawnIO installed.
zh.PawnIOHint=PawnIO 是系统共享驱动，Fan Control 等软件可能正在使用。未经你确认，不会安装或更改驱动。卸载 Pixel Studio 时会保留 PawnIO。
en.PawnIORefresh=Check again
zh.PawnIORefresh=重新检测
en.PawnIOOpenConfirm=Open the official PawnIO website? This only opens a page; it does not download or install a driver automatically. Choose the signed official edition. After completing installation, return here and click Check again.
zh.PawnIOOpenConfirm=打开 PawnIO 官方网站吗？此操作仅打开网页，不会自动下载或安装驱动。请选择官方签名版，完成安装后回到这里点击“重新检测”。
en.PawnIOOpenFailed=The browser could not be opened. Visit https://pawnio.eu/ manually. After installing the driver, return to this page and click Check again.
zh.PawnIOOpenFailed=无法打开浏览器。请手动访问 https://pawnio.eu/；完成驱动安装后，返回本页点击“重新检测”。
en.MigrationFinalizeFailed=Installed, but startup migration failed. Reconfigure login startup in desktop settings.
zh.MigrationFinalizeFailed=程序已安装，但自启动迁移失败。请在桌面版设置中重新设置自启动。
en.MigrationPrepareFailed=Backup or migration did not complete. No application files have been replaced. Quit Pixel Studio Desktop from the tray if it is still running, then retry Setup. Error details: %1
zh.MigrationPrepareFailed=备份或迁移未完成，尚未替换应用文件。如果 Pixel Studio 桌面版仍在运行，请从托盘退出后重试安装。错误详情：%1

[Types]
Name: custom; Description: "{cm:Custom}"; Flags: iscustom

[Components]
Name: desktop; Description: "{cm:DesktopFiles}"; Types: custom
Name: web; Description: "{cm:WebFiles}"
Name: plugin; Description: "{cm:PluginFiles}"
Name: core; Description: "{cm:SharedFiles}"; Flags: fixed

[Tasks]
Name: desktopicon; Description: "{cm:Desktop}"
Name: temperatureservice; Description: "{cm:SensorServiceConsent}"; Check: IsAdminInstallMode

[Files]
Source: "Migrate-Legacy.ps1"; Flags: dontcopy
; This must remain the first copied file: its guard runs after Restart Manager,
; but before any application file is replaced. The preceding entry is dontcopy.
Source: "..\desktop\assets\pixel-studio.ico"; DestDir: "{app}"; DestName: "pixel-studio-brand2.ico"; Flags: ignoreversion; BeforeInstall: PrepareMigrationBeforeCopy
Source: "{#PayloadDir}\desktop\*"; DestDir: "{app}\desktop"; Components: desktop; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadDir}\app\*"; DestDir: "{app}\app"; Components: core; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadDir}\app\GETTING-STARTED.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#PayloadDir}\runtime\*"; DestDir: "{app}\runtime"; Components: web or plugin; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadDir}\plugin\PixelStudioPlugin.dll"; DestDir: "{code:PluginDirectory}"; Components: plugin; Flags: ignoreversion uninsrestartdelete
Source: "{#PayloadDir}\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "Manage-SensorServices.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "Uninstall-Cleanup.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "Uninstall-Preflight.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
Root: HKA; Subkey: "Software\PixelStudio\Installer"; ValueType: string; ValueName: "ProjectPath"; ValueData: "{app}\app"; Components: web or plugin; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\PixelStudio\Installer"; ValueType: string; ValueName: "NodePath"; ValueData: "{app}\runtime\node.exe"; Components: plugin; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\PixelStudio\Installer"; ValueType: string; ValueName: "PluginPath"; ValueData: "{code:PluginDirectory}\PixelStudioPlugin.dll"; Components: plugin; Flags: uninsdeletevalue

[Icons]
Name: "{group}\Pixel Studio Desktop"; Filename: "{app}\desktop\Pixel Studio Desktop.exe"; IconFilename: "{app}\pixel-studio-brand2.ico"; Components: desktop; AppUserModelID: "com.ow3nhe.pixelstudio.desktop"
Name: "{autodesktop}\Pixel Studio Desktop"; Filename: "{app}\desktop\Pixel Studio Desktop.exe"; IconFilename: "{app}\pixel-studio-brand2.ico"; Components: desktop; Tasks: desktopicon; AppUserModelID: "com.ow3nhe.pixelstudio.desktop"
Name: "{group}\Pixel Studio Web"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\app\Start-Pixel-DDP.ps1"""; WorkingDir: "{app}\app"; IconFilename: "{app}\pixel-studio-brand2.ico"; Components: web
Name: "{autodesktop}\Pixel Studio Web"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\app\Start-Pixel-DDP.ps1"""; WorkingDir: "{app}\app"; IconFilename: "{app}\pixel-studio-brand2.ico"; Components: web; Tasks: desktopicon
Name: "{group}\{cm:Guide}"; Filename: "{app}\GETTING-STARTED.html"; IconFilename: "{app}\pixel-studio-brand2.ico"
Name: "{group}\{cm:UninstallName}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\GETTING-STARTED.html"; Description: "{cm:OpenGuide}"; Flags: shellexec postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Manage-SensorServices.ps1"" -Mode Remove"; Flags: runhidden waituntilterminated; Check: IsAdminInstallMode; RunOnceId: "RemovePixelStudioSensorServices"

[Code]
var
  PluginPage: TInputDirWizardPage;
  BackupComplete: Boolean;
  MigrationPrepared: Boolean;
  RemovePersonalSettings: Boolean;
  CleanupScript: String;
  CleanupReport: String;
  CleanupPrepared: Boolean;
  UpdatingComponents: Boolean;
  ComponentsInitialized: Boolean;
  PreviousComponentsClick: TNotifyEvent;

#include "PawnIO.iss"

function CheckUninstallProcesses: Boolean;
var
  Script, ReportFile, Parameters, PluginFile, RecordedProject: String;
  Report: AnsiString;
  ExitCode, Choice, RootKey, CloseExitCode: Integer;
  Started: Boolean;
begin
  Result := False;
  Script := ExpandConstant('{tmp}\PixelStudio-Uninstall-Preflight.ps1');
  ReportFile := ExpandConstant('{tmp}\PixelStudio-Uninstall-Preflight.txt');
  if not FileCopy(ExpandConstant('{app}\Uninstall-Preflight.ps1'), Script, False) then begin
    Log('Unable to prepare uninstall preflight. No files will be deleted.');
    if not UninstallSilent then
      MsgBox(FmtMessage(CustomMessage('UninstallBlocked'), ['Unable to prepare the process check.']), mbError, MB_OK);
    Exit;
  end;
  PluginFile := '';
  if IsAdminInstallMode then RootKey := HKLM64 else RootKey := HKCU;
  if RegQueryStringValue(RootKey, 'Software\PixelStudio\Installer', 'ProjectPath', RecordedProject) then
    if CompareText(RecordedProject, ExpandConstant('{app}\app')) = 0 then
      RegQueryStringValue(RootKey, 'Software\PixelStudio\Installer', 'PluginPath', PluginFile);
  Parameters := '-NoProfile -ExecutionPolicy Bypass -File "' + Script +
    '" -InstallDir "' + ExpandConstant('{app}') + '" -ReportPath "' + ReportFile + '"';
  if PluginFile <> '' then Parameters := Parameters + ' -PluginFile "' + PluginFile + '"';
  if RemovePersonalSettings then Parameters := Parameters + ' -Purge';
  repeat
    Started := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      Parameters, '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
    if Started and (ExitCode = 0) then begin
      Result := True;
      Exit;
    end;
    Report := 'Unable to complete the process check.';
    LoadStringFromFile(ReportFile, Report);
    Log('Uninstall blocked: ' + String(Report));
    if UninstallSilent then Exit;
    if Started and (ExitCode = 20) then begin
      Choice := MsgBox(FmtMessage(CustomMessage('UninstallCloseApps'), [String(Report)]),
        mbConfirmation, MB_YESNOCANCEL or MB_DEFBUTTON2);
      if Choice = IDYES then begin
        Started := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
          Parameters + ' -CloseApplications', '', SW_HIDE, ewWaitUntilTerminated, CloseExitCode);
        if (not Started) or (CloseExitCode <> 0) then begin
          Report := 'Unable to close all affected applications.';
          LoadStringFromFile(ReportFile, Report);
          if MsgBox(FmtMessage(CustomMessage('UninstallBlocked'), [String(Report)]),
            mbError, MB_RETRYCANCEL) <> IDRETRY then Exit;
        end;
        Choice := IDRETRY;
      end else if Choice = IDNO then begin
        if MsgBox(FmtMessage(CustomMessage('UninstallBlocked'), [String(Report)]),
          mbInformation, MB_RETRYCANCEL) = IDRETRY then Choice := IDRETRY;
      end;
    end else
      Choice := MsgBox(FmtMessage(CustomMessage('UninstallBlocked'), [String(Report)]),
        mbError, MB_RETRYCANCEL);
  until Choice <> IDRETRY;
end;


function InitializeUninstall: Boolean;
var
  Choice: Integer;
  Dialog: TSetupForm;
  Description: TNewStaticText;
  KeepButton, PurgeButton, CancelButton: TNewButton;
begin
  RemovePersonalSettings := False;
  Result := True;
  { Silent upgrades must preserve profiles without prompting. }
  if UninstallSilent then begin
    Result := CheckUninstallProcesses;
    Exit;
  end;
  Dialog := CreateCustomForm(ScaleX(560), ScaleY(300), False, True);
  try
    Dialog.Caption := CustomMessage('UninstallTitle');
    Dialog.ClientWidth := ScaleX(560);
    Dialog.ClientHeight := ScaleY(300);
    Description := TNewStaticText.Create(Dialog);
    Description.Parent := Dialog;
    Description.SetBounds(ScaleX(20), ScaleY(16), ScaleX(520), ScaleY(138));
    Description.AutoSize := False;
    Description.WordWrap := True;
    Description.Caption := CustomMessage('RemoveSettingsPrompt');
    KeepButton := TNewButton.Create(Dialog);
    KeepButton.Parent := Dialog;
    KeepButton.SetBounds(ScaleX(20), ScaleY(166), ScaleX(520), ScaleY(34));
    KeepButton.Caption := CustomMessage('UninstallKeep');
    KeepButton.ModalResult := mrNo;
    KeepButton.Default := True;
    PurgeButton := TNewButton.Create(Dialog);
    PurgeButton.Parent := Dialog;
    PurgeButton.SetBounds(ScaleX(20), ScaleY(208), ScaleX(520), ScaleY(34));
    PurgeButton.Caption := CustomMessage('UninstallPurge');
    PurgeButton.ModalResult := mrYes;
    CancelButton := TNewButton.Create(Dialog);
    CancelButton.Parent := Dialog;
    CancelButton.SetBounds(ScaleX(20), ScaleY(250), ScaleX(520), ScaleY(34));
    CancelButton.Caption := CustomMessage('UninstallCancel');
    CancelButton.ModalResult := mrCancel;
    CancelButton.Cancel := True;
    Dialog.ActiveControl := KeepButton;
    Choice := Dialog.ShowModal;
  finally
    Dialog.Free;
  end;
  Result := (Choice = mrYes) or (Choice = mrNo);
  if Result and (Choice = mrYes) then begin
    Result := MsgBox(CustomMessage('PurgeConfirm'), mbConfirmation,
      MB_YESNO or MB_DEFBUTTON2) = IDYES;
    RemovePersonalSettings := Result;
  end;
  if Result then Result := CheckUninstallProcesses;
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
var
  SensorExit: Integer;
  SensorOK: Boolean;
  SensorSource: String;
begin
  if (CurStep = ssPostInstall) and IsAdminInstallMode and WizardIsTaskSelected('temperatureservice') then begin
    if WizardIsComponentSelected('web') or WizardIsComponentSelected('plugin') then
      SensorSource := ExpandConstant('{app}\app\temperature')
    else
      SensorSource := ExpandConstant('{app}\desktop\resources\web\temperature');
    SensorOK := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\Manage-SensorServices.ps1') +
      '" -Mode Install -SourceDir "' + SensorSource + '"', '', SW_HIDE, ewWaitUntilTerminated, SensorExit);
    if (not SensorOK) or (SensorExit <> 0) then
      MsgBox(CustomMessage('SensorServiceFailed'), mbError, MB_OK);
  end;
  if CurStep = ssPostInstall then
    if not RunMigration('Finalize') then
      MsgBox(CustomMessage('MigrationFinalizeFailed'), mbInformation, MB_OK);
end;

function PluginDirectory(Param: String): String;
begin
  Result := PluginPage.Values[0];
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo,
  MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := CustomMessage('UpdateCloseAppsHint');
  DetectPawnIO;
  Result := Result + NewLine + NewLine + CustomMessage('PawnIOTitle') + ':' + NewLine + PawnIODetection;
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

procedure SyncSharedComponent;
var
  Selected: String;
  NeedsShared: Boolean;
begin
  if UpdatingComponents then Exit;
  NeedsShared := WizardIsComponentSelected('web') or WizardIsComponentSelected('plugin');
  if WizardIsComponentSelected('core') = NeedsShared then Exit;
  UpdatingComponents := True;
  try
    Selected := '';
    if WizardIsComponentSelected('desktop') then Selected := 'desktop';
    if WizardIsComponentSelected('web') then Selected := Selected + ',web';
    if WizardIsComponentSelected('plugin') then Selected := Selected + ',plugin';
    if NeedsShared then Selected := Selected + ',core';
    if Copy(Selected, 1, 1) = ',' then Delete(Selected, 1, 1);
    WizardSelectComponents(Selected);
  finally
    UpdatingComponents := False;
  end;
end;

procedure ComponentsSelectionChanged(Sender: TObject);
begin
  PreviousComponentsClick(Sender);
  SyncSharedComponent;
end;

<event('CurPageChanged')>
procedure ComponentsPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpSelectComponents then begin
    if not ComponentsInitialized then begin
      ComponentsInitialized := True;
      WizardSelectComponents('desktop');
    end;
    SyncSharedComponent;
  end;
end;

procedure InitializeWizard;
var
  ComponentsHint: TNewStaticText;
begin
  PreviousComponentsClick := WizardForm.ComponentsList.OnClickCheck;
  WizardForm.ComponentsList.OnClickCheck := @ComponentsSelectionChanged;
  WizardForm.ComponentsList.Height := WizardForm.ComponentsList.Height - ScaleY(48);
  ComponentsHint := TNewStaticText.Create(WizardForm);
  ComponentsHint.Parent := WizardForm.SelectComponentsPage;
  ComponentsHint.Left := WizardForm.ComponentsList.Left;
  ComponentsHint.Top := WizardForm.ComponentsList.Top + WizardForm.ComponentsList.Height + ScaleY(8);
  ComponentsHint.Width := WizardForm.ComponentsList.Width;
  ComponentsHint.AutoSize := False;
  ComponentsHint.Height := ScaleY(40);
  ComponentsHint.WordWrap := True;
  ComponentsHint.Caption := CustomMessage('ComponentsHint');
  PluginPage := CreateInputDirPage(wpSelectComponents,
    CustomMessage('PluginTitle'), CustomMessage('PluginSubtitle'),
    CustomMessage('PluginHint'), False, '');
  PluginPage.Add(CustomMessage('PluginFolder'));
  PluginPage.Values[0] := ExpandConstant('{userappdata}\OpenRGB\plugins');
  CreatePawnIOPage(PluginPage.ID);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = PawnIOPage.ID then begin
    Result := ConfirmPawnIOPageNext;
    Exit;
  end;
  if CurPageID = wpSelectComponents then begin
    SyncSharedComponent;
    Result := WizardIsComponentSelected('desktop') or
      WizardIsComponentSelected('web') or WizardIsComponentSelected('plugin');
    if not Result then
      MsgBox(CustomMessage('SelectEdition'), mbInformation, MB_OK);
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := (PageID = PluginPage.ID) and not WizardIsComponentSelected('plugin');
end;



procedure RegisterExtraCloseApplicationsResources;
begin
  if WizardIsComponentSelected('plugin') then
    RegisterExtraCloseApplicationsResource(AddBackslash(PluginPage.Values[0]) + 'PixelStudioPlugin.dll');
  RegisterExtraCloseApplicationsResource(ExpandConstant('{app}\runtime\node.exe'));
  RegisterExtraCloseApplicationsResource(ExpandConstant('{app}\desktop\Pixel Studio Desktop.exe'));
  RegisterExtraCloseApplicationsResource(ExpandConstant('{autopf}\Pixel Studio Desktop\Pixel Studio Desktop.exe'));
  RegisterExtraCloseApplicationsResource(ExpandConstant('{localappdata}\Programs\pixel-studio-desktop\Pixel Studio Desktop.exe'));
  RegisterExtraCloseApplicationsResource(ExpandConstant('{localappdata}\Programs\Pixel Studio Desktop\Pixel Studio Desktop.exe'));
end;

function PrepareMigration: String;
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
      Result := FmtMessage(CustomMessage('MigrationPrepareFailed'), [ExpandConstant('{localappdata}\PixelStudio\Migration\last-error.txt')]);
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

procedure PrepareMigrationBeforeCopy;
var
  Failure: String;
begin
  Failure := PrepareMigration;
  if Failure <> '' then
    RaiseException(Failure);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Parameters: String;
  ExitCode: Integer;
  CleanupOK: Boolean;
begin
  if CurUninstallStep = usUninstall then begin
    CleanupScript := ExpandConstant('{tmp}\PixelStudio-Uninstall-Cleanup.ps1');
    { Keep failure reports outside Setup's temporary directory and purged profiles. }
    CleanupReport := ExpandConstant('{localappdata}\PixelStudio-Uninstall-') +
      GetDateTimeString('yyyymmdd-hhnnss-zzz', '-', '-') + '.txt';
    CleanupPrepared := FileCopy(ExpandConstant('{app}\Uninstall-Cleanup.ps1'), CleanupScript, False);
  end;
  if CurUninstallStep = usPostUninstall then begin
    CleanupOK := False;
    if CleanupPrepared then begin
      Parameters := '-NoProfile -ExecutionPolicy Bypass -File "' + CleanupScript +
        '" -InstallDir "' + ExpandConstant('{app}') + '" -ReportPath "' + CleanupReport + '"';
      if RemovePersonalSettings then Parameters := Parameters + ' -Purge';
      CleanupOK := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
        Parameters, '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
      if CleanupOK then CleanupOK := ExitCode = 0;
    end else
      SaveStringToFile(CleanupReport, 'Unable to prepare the cleanup script.', False);
    if not CleanupOK then begin
      Log('Pixel Studio cleanup did not complete: ' + CleanupReport);
      if not UninstallSilent then
        MsgBox(FmtMessage(CustomMessage('CleanupFailed'), [CleanupReport]), mbError, MB_OK);
    end else if not UninstallSilent then begin
      if RemovePersonalSettings then
        MsgBox(CustomMessage('SettingsRemovedHint'), mbInformation, MB_OK)
      else
        MsgBox(CustomMessage('UninstallHint'), mbInformation, MB_OK);
    end;
  end;
end;
