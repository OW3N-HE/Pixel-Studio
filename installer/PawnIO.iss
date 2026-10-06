// Reuse the system driver. Only launch its official installer after consent.
// Bounds must be supplied by a release build after compatibility testing.
#ifdef PawnIOSetupPath
[Files]
Source: "{#PawnIOSetupPath}"; DestName: "PixelStudio-PawnIO-2.2.0-setup.exe"; Flags: dontcopy
#endif

[CustomMessages]
en.PawnIOInstall=Open official PawnIO installer...
zh.PawnIOInstall=打开官方 PawnIO 安装向导...
en.PawnIOUpgrade=Update PawnIO...
zh.PawnIOUpgrade=更新 PawnIO...
en.PawnIOInstallConfirm=Open the official PawnIO 2.2.0 installation wizard?%n%nSave your work and close other monitoring tools yourself first. This is a shared system driver and requires administrator approval.%n%nWhen existing or uncertain records are present, the official wizard may refuse installation. Follow its instructions; Pixel Studio will not bypass its checks, automatically uninstall a driver or force a downgrade. Review the version before approving changes.%n%nThe wizard will remain visible. When it closes, Pixel Studio will check again. Choose No to return without launching it.
zh.PawnIOInstallConfirm=打开官方 PawnIO 2.2.0 安装向导吗？%n%n请先保存工作并自行退出其他监控软件。这是系统共享驱动，需要管理员授权。%n%n存在已有或不确定记录时，官方向导可能拒绝安装。请按其说明处理；Pixel Studio 不会绕过检查、自动卸载驱动或强制降级。允许更改前请确认版本。%n%n官方向导会正常显示，关闭后将重新检测。选择“否”可返回，不启动向导。
en.PawnIOInstallFailed=The official installer was cancelled or returned an error (code %1). Check the status on this page and retry if the driver is still missing. Pixel Studio has not removed any shared driver.
zh.PawnIOInstallFailed=官方安装向导已取消或返回错误（代码 %1）。请查看本页检测结果；若仍缺少驱动，可重新安装。Pixel Studio 没有删除共享驱动。
en.PawnIOLaunchFailed=The official driver wizard could not be opened. Check administrator permission and security software, then try again. Details: %1
zh.PawnIOLaunchFailed=无法打开官方驱动安装向导。请检查管理员权限和安全软件提示后重试。详情：%1
en.PawnIOIntegrityFailed=The bundled PawnIO installer failed its integrity check and will not be run. Download Pixel Studio again from its official release page.
zh.PawnIOIntegrityFailed=内置 PawnIO 安装程序完整性校验失败，不会运行。请从 Pixel Studio 官方发布页面重新下载安装包。
en.PawnIORestart=A restart is required by the PawnIO installer. Save your work and restart Windows before testing temperature monitoring.
zh.PawnIORestart=PawnIO 安装程序要求重启。请保存工作并重启 Windows，再测试温度采集。
en.PawnIOBundleHint=Before installing or updating the driver, save your work and close other monitoring tools. The official wizard may require administrator approval or a restart. Uninstalling Pixel Studio leaves this shared driver installed.
zh.PawnIOBundleHint=安装或升级驱动前，请保存工作并退出其他监控软件。官方向导可能要求管理员授权或重启。卸载 Pixel Studio 不会删除这个共享驱动。
en.PawnIOHeadingMissing=PawnIO is required
zh.PawnIOHeadingMissing=需要安装 PawnIO
en.PawnIOHeadingReview=Check the existing driver
zh.PawnIOHeadingReview=请确认已有驱动
en.PawnIOHeadingPresent=PawnIO is installed
zh.PawnIOHeadingPresent=已安装 PawnIO
en.PawnIOHeadingUpgrade=PawnIO update available
zh.PawnIOHeadingUpgrade=可更新 PawnIO
en.PawnIOHeadingReady=PawnIO is installed
zh.PawnIOHeadingReady=已安装 PawnIO
en.PawnIOHeadingRestart=Restart needed for monitoring
zh.PawnIOHeadingRestart=温度采集需要重启后使用
en.PawnIOHeadingInstalling=Installing PawnIO
zh.PawnIOHeadingInstalling=正在安装 PawnIO
en.PawnIOWaiting=Complete the official PawnIO wizard. This page will check the driver again when it closes.
zh.PawnIOWaiting=请在 PawnIO 官方向导中完成安装。向导关闭后，本页会自动重新检测。
en.PawnIOHeadingChecking=Checking PawnIO installation...
zh.PawnIOHeadingChecking=正在检测 PawnIO 安装状态...
en.PawnIOCheckingHint=Checking installation records and actual files. Please wait; slower computers may take longer.
zh.PawnIOCheckingHint=正在核对安装记录和实际文件，请稍候；较慢的电脑可能需要更长时间。
en.PawnIOStillMissing=PawnIO has not been detected yet. Check again or retry installation to continue.
zh.PawnIOStillMissing=暂未检测到 PawnIO。请重新检测或重试安装，完成后才能继续。
en.PawnIOSummaryMissing=Temperature monitoring needs this driver. Install it before continuing.
zh.PawnIOSummaryMissing=温度采集需要此驱动。完成安装后才能继续。
en.PawnIOSummaryPresent=PawnIO %1 was found. Your existing driver will be kept.
zh.PawnIOSummaryPresent=已检测到 PawnIO %1。将保留现有驱动，不重复安装。
en.PawnIOSummaryUnknown=PawnIO installation could not be confirmed. Complete the official installation or repair, then check again. Unknown or newer drivers will not be overwritten.
zh.PawnIOSummaryUnknown=无法确认 PawnIO 安装完整。请完成官方安装或修复后重新检测，不会覆盖未知或较新驱动。
en.PawnIOSummaryConflict=The recorded driver versions do not match. Nothing will be replaced.
zh.PawnIOSummaryConflict=检测到不一致的驱动版本记录。不会覆盖现有驱动。
en.PawnIOSummaryOld=PawnIO %1 was found. This build requires version %2 or later.
zh.PawnIOSummaryOld=已检测到 PawnIO %1。本版本要求 %2 或更高版本。
en.PawnIOSummaryNewer=PawnIO %1 is outside this build's tested range. Your driver will be kept.
zh.PawnIOSummaryNewer=PawnIO %1 超出本版本已测试的范围。将保留现有驱动。
en.PawnIOContinueHint=Choose Next to continue installing Pixel Studio.
zh.PawnIOContinueHint=点击“下一步”继续安装 Pixel Studio。
en.PawnIOInstallHint=Close other hardware monitoring tools before installing or updating.
zh.PawnIOInstallHint=安装或更新前，请先退出其他硬件监控软件。
en.PawnIOReviewHint=Resolve incomplete installation through the official tools, then check again. If the official wizard reports an existing installation, follow its instructions and restart Windows if requested.
zh.PawnIOReviewHint=请通过官方工具完成安装或修复后重新检测。若提示已有安装，请按官方说明处理；要求重启时先重启 Windows。
en.PawnIOManualHint=Install the signed driver from the official website, then choose Check again.
zh.PawnIOManualHint=请从官方网站安装签名版驱动，再点击“重新检测”。
en.PawnIODetailsShow=Show details
zh.PawnIODetailsShow=详细信息
en.PawnIODetailsHide=Hide details
zh.PawnIODetailsHide=收起详情
en.PawnIOWebsiteLink=Official website
zh.PawnIOWebsiteLink=官方网站

en.PawnIOFileDetails=Library version: %1%nDriver path: %2%nDriver file exists: %3%nInstallation checks complete: %4%nFile checks do not guarantee sensor access; monitoring checks that separately.
zh.PawnIOFileDetails=库文件版本：%1%n驱动路径：%2%n驱动文件存在：%3%n安装检查通过：%4%n文件检查不保证传感器可访问，实际访问在温度采集启动时检查。
en.PawnIOCheckYes=Yes
zh.PawnIOCheckYes=是
en.PawnIOCheckNo=No
zh.PawnIOCheckNo=否

[Code]
#ifndef PawnIOMinVersion
  #define PawnIOMinVersion ""
#endif
#ifndef PawnIOMaxVersion
  #define PawnIOMaxVersion ""
#endif

var
  PawnIOPage: TWizardPage;
  PawnIOHeadingLabel, PawnIOStatusLabel, PawnIOHintLabel: TNewStaticText;
  PawnIOInstallButton: TNewButton;
  PawnIOActionsLabel: TNewLinkLabel;
  PawnIODetailsMemo: TNewMemo;
  PawnIODetection, PawnIOHeading, PawnIOSummary, PawnIOPageHint: String;
  PawnIOCanInstall, PawnIOMissingDetected, PawnIORestartRequired: Boolean;
  PawnIOPageActive, PawnIOInstalling, PawnIOChecking, PawnIODetailsExpanded, PawnIOHasDetection: Boolean;

procedure LayoutPawnIOPage;
var
  Y, ButtonWidth, DetailsHeight: Integer;
  DetailsCaption: String;
begin
  { Keep the action beside its explanation, not at the bottom of the page. }
  PawnIOHeadingLabel.SetBounds(0, ScaleY(12), PawnIOPage.SurfaceWidth, ScaleY(24));
  PawnIOHeadingLabel.AdjustHeight;
  Y := PawnIOHeadingLabel.Top + PawnIOHeadingLabel.Height + ScaleY(8);
  PawnIOStatusLabel.SetBounds(0, Y, PawnIOPage.SurfaceWidth, ScaleY(40));
  PawnIOStatusLabel.AdjustHeight;
  Y := PawnIOStatusLabel.Top + PawnIOStatusLabel.Height + ScaleY(8);
  PawnIOHintLabel.SetBounds(0, Y, PawnIOPage.SurfaceWidth, ScaleY(32));
  PawnIOHintLabel.AdjustHeight;
  Y := PawnIOHintLabel.Top + PawnIOHintLabel.Height + ScaleY(16);
  if PawnIOInstallButton.Visible then begin
    ButtonWidth := WizardForm.CalculateButtonWidth([
      CustomMessage('PawnIOInstall')]) + ScaleX(16);
    if ButtonWidth < ScaleX(150) then ButtonWidth := ScaleX(150);
    if ButtonWidth > PawnIOPage.SurfaceWidth then ButtonWidth := PawnIOPage.SurfaceWidth;
    PawnIOInstallButton.SetBounds(0, Y, ButtonWidth, ScaleY(34));
    Y := Y + PawnIOInstallButton.Height + ScaleY(12);
  end;
  if PawnIODetailsExpanded then DetailsCaption := CustomMessage('PawnIODetailsHide')
  else DetailsCaption := CustomMessage('PawnIODetailsShow');
  PawnIOActionsLabel.Caption := '<a href="refresh">' + CustomMessage('PawnIORefresh') +
    '</a>    <a href="details">' + DetailsCaption +
    '</a>    <a href="website">' + CustomMessage('PawnIOWebsiteLink') + '</a>';
  PawnIOActionsLabel.SetBounds(0, Y, PawnIOPage.SurfaceWidth, ScaleY(20));
  PawnIOActionsLabel.AdjustHeight;
  Y := PawnIOActionsLabel.Top + PawnIOActionsLabel.Height + ScaleY(10);
  DetailsHeight := PawnIOPage.SurfaceHeight - Y - ScaleY(4);
  if DetailsHeight < 1 then DetailsHeight := 1;
  PawnIODetailsMemo.SetBounds(0, Y, PawnIOPage.SurfaceWidth, DetailsHeight);
  PawnIODetailsMemo.Visible := PawnIODetailsExpanded;
end;

procedure UpdatePawnIOPage;
begin
  PawnIOHeadingLabel.Caption := PawnIOHeading;
  PawnIOStatusLabel.Caption := PawnIOSummary;
  PawnIOHintLabel.Caption := PawnIOPageHint;
  PawnIODetailsMemo.Lines.Text := PawnIODetection + #13#10#13#10 + CustomMessage('PawnIOHint');
  PawnIOInstallButton.Visible := False;
#ifdef PawnIOSetupPath
  { Always provide the official wizard; detection only gates continuation. }
  PawnIOInstallButton.Visible := True;
  PawnIOInstallButton.Caption := CustomMessage('PawnIOInstall');
  if PawnIOCanInstall then
    PawnIODetailsMemo.Lines.Text := PawnIODetection + #13#10#13#10 + CustomMessage('PawnIOBundleHint');
#else
  if PawnIOMissingDetected then PawnIOHintLabel.Caption := CustomMessage('PawnIOManualHint');
#endif
  if PawnIOChecking then begin
    PawnIOHeadingLabel.Caption := CustomMessage('PawnIOHeadingChecking');
    PawnIOStatusLabel.Caption := CustomMessage('PawnIOCheckingHint');
    PawnIOHintLabel.Caption := '';
  end else if PawnIOInstalling then begin
    PawnIOHeadingLabel.Caption := CustomMessage('PawnIOHeadingInstalling');
    PawnIOStatusLabel.Caption := CustomMessage('PawnIOWaiting');
    PawnIOHintLabel.Caption := '';
  end else if PawnIORestartRequired then begin
    PawnIOHeadingLabel.Caption := CustomMessage('PawnIOHeadingRestart');
    PawnIOHintLabel.Caption := CustomMessage('PawnIORestart');
    PawnIODetailsMemo.Lines.Text := PawnIODetailsMemo.Lines.Text + #13#10#13#10 + CustomMessage('PawnIORestart');
  end;
  PawnIOInstallButton.Enabled := not PawnIOInstalling and not PawnIOChecking;
  PawnIOActionsLabel.Enabled := not PawnIOInstalling and not PawnIOChecking;
  if PawnIOPageActive then
    WizardForm.NextButton.Enabled := not PawnIOMissingDetected and not PawnIOInstalling and not PawnIOChecking;
  LayoutPawnIOPage;
end;

function ParsePawnIOVersion(Value: String; var Parts: TArrayOfInteger): Boolean;
var
  Index, Start, Count, Number: Integer;
  Item: String;
begin
  Result := False;
  SetArrayLength(Parts, 4);
  for Index := 0 to 3 do Parts[Index] := 0;
  Value := Trim(Value);
  if Value = '' then Exit;
  Start := 1;
  Count := 0;
  for Index := 1 to Length(Value) + 1 do begin
    if Index <= Length(Value) then begin
      if (Value[Index] <> '.') and ((Value[Index] < '0') or (Value[Index] > '9')) then Exit;
    end;
    if (Index > Length(Value)) or (Value[Index] = '.') then begin
      if Count >= 4 then Exit;
      Item := Copy(Value, Start, Index - Start);
      if (Item = '') or (Length(Item) > 5) then Exit;
      Number := StrToIntDef(Item, -1);
      if (Number < 0) or (Number > 65535) then Exit;
      Parts[Count] := Number;
      Count := Count + 1;
      Start := Index + 1;
    end;
  end;
  Result := Count >= 2;
end;

function ComparePawnIOVersions(Left, Right: String): Integer;
var
  A, B: TArrayOfInteger;
  Index: Integer;
begin
  Result := 0;
  { Callers validate both versions first. }
  if not ParsePawnIOVersion(Left, A) or not ParsePawnIOVersion(Right, B) then Exit;
  for Index := 0 to 3 do begin
    if A[Index] < B[Index] then begin Result := -1; Exit; end;
    if A[Index] > B[Index] then begin Result := 1; Exit; end;
  end;
end;

function PawnIOExpandPath(Value: String): String;
var
  First, Last: Integer;
  Name, EnvironmentValue: String;
begin
  Value := Trim(Value);
  if (Length(Value) >= 2) and (Value[1] = '"') and (Value[Length(Value)] = '"') then
    Value := Copy(Value, 2, Length(Value) - 2);
  Result := '';
  { Expand environment variables without launching another process. }
  while Value <> '' do begin
    First := Pos('%', Value);
    if First = 0 then begin Result := Result + Value; Break; end;
    Result := Result + Copy(Value, 1, First - 1);
    Value := Copy(Value, First + 1, Length(Value));
    Last := Pos('%', Value);
    if Last = 0 then begin Result := Result + '%' + Value; Break; end;
    Name := Copy(Value, 1, Last - 1);
    EnvironmentValue := GetEnv(Name);
    if EnvironmentValue = '' then EnvironmentValue := '%' + Name + '%';
    Result := Result + EnvironmentValue;
    Value := Copy(Value, Last + 1, Length(Value));
  end;
  if CompareText(Copy(Result, 1, 4), '\??\') = 0 then
    Result := Copy(Result, 5, Length(Result));
  if CompareText(Copy(Result, 1, 12), '\SystemRoot\') = 0 then
    Result := AddBackslash(ExpandConstant('{win}')) + Copy(Result, 13, Length(Result))
  else if CompareText(Copy(Result, 1, 9), 'System32\') = 0 then
    Result := AddBackslash(ExpandConstant('{win}')) + Result;
end;

procedure InspectPawnIOLibrary(Location: String; var Version: String;
  var HasFile, Conflict: Boolean);
var
  Filename, Candidate: String;
  Parts: TArrayOfInteger;
begin
  Location := PawnIOExpandPath(Location);
  if Location = '' then Exit;
  { Never probe a relative path or a network share from installation records. }
  if (Length(Location) < 3) or (Copy(Location, 2, 2) <> ':\') then Exit;
  Filename := AddBackslash(Location) + 'PawnIOLib.dll';
  if not FileExists(Filename) then Exit;
  HasFile := True;
  if not GetVersionNumbersString(Filename, Candidate) then begin
    Conflict := True;
    Exit;
  end;
  if not ParsePawnIOVersion(Candidate, Parts) then begin
    Conflict := True;
    Exit;
  end;
  if Version = '' then Version := Candidate
  else if ComparePawnIOVersions(Version, Candidate) <> 0 then Conflict := True;
end;

function PawnIOCheckText(Value: Boolean): String;
begin
  if Value then Result := CustomMessage('PawnIOCheckYes')
  else Result := CustomMessage('PawnIOCheckNo');
end;

procedure DetectPawnIO;
var
  RegistrationKey, ServiceKey: String;
  Location64, Location32, Version64, Version32, Version: String;
  Driver, Details, Minimum, Maximum, Status: String;
  Present64, Present32, ServicePresent, HasLibrary, Conflict: Boolean;
  DriverExists, ServiceValid, Complete, HasLegacyDriver: Boolean;
  DriverType, DriverStart, DeleteFlag: Cardinal;
  Parts: TArrayOfInteger;
begin
  RegistrationKey := 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO';
  ServiceKey := 'SYSTEM\CurrentControlSet\Services\PawnIO';
  PawnIOChecking := True;
  UpdatePawnIOPage;
  WizardForm.Repaint;
  PawnIODetection := CustomMessage('PawnIOUnknown');
  PawnIOHeading := CustomMessage('PawnIOHeadingReview');
  PawnIOSummary := CustomMessage('PawnIOSummaryUnknown');
  PawnIOPageHint := CustomMessage('PawnIOReviewHint');
  PawnIOCanInstall := False;
  PawnIOMissingDetected := True;
  Status := 'incomplete';
  Version := '';
  Version64 := '';
  Version32 := '';
  Location64 := '';
  Location32 := '';
  Driver := '';
  HasLibrary := False;
  Conflict := False;
  Present64 := RegKeyExists(HKLM64, RegistrationKey);
  Present32 := RegKeyExists(HKLM32, RegistrationKey);
  RegQueryStringValue(HKLM64, RegistrationKey, 'InstallLocation', Location64);
  RegQueryStringValue(HKLM32, RegistrationKey, 'InstallLocation', Location32);
  RegQueryStringValue(HKLM64, RegistrationKey, 'DisplayVersion', Version64);
  RegQueryStringValue(HKLM32, RegistrationKey, 'DisplayVersion', Version32);
  InspectPawnIOLibrary(Location64, Version, HasLibrary, Conflict);
  if CompareText(Location64, Location32) <> 0 then
    InspectPawnIOLibrary(Location32, Version, HasLibrary, Conflict);
  InspectPawnIOLibrary(ExpandConstant('{commonpf64}\PawnIO'), Version, HasLibrary, Conflict);
  if ParsePawnIOVersion(Version64, Parts) and (Version <> '') then
    if ComparePawnIOVersions(Version64, Version) <> 0 then Conflict := True;
  if ParsePawnIOVersion(Version32, Parts) and (Version <> '') then
    if ComparePawnIOVersions(Version32, Version) <> 0 then Conflict := True;
  ServicePresent := RegKeyExists(HKLM64, ServiceKey);
  DriverType := 0;
  DriverStart := 4;
  DeleteFlag := 0;
  ServiceValid := RegQueryDWordValue(HKLM64, ServiceKey, 'Type', DriverType);
  ServiceValid := RegQueryDWordValue(HKLM64, ServiceKey, 'Start', DriverStart) and ServiceValid;
  RegQueryDWordValue(HKLM64, ServiceKey, 'DeleteFlag', DeleteFlag);
  RegQueryStringValue(HKLM64, ServiceKey, 'ImagePath', Driver);
  Driver := PawnIOExpandPath(Driver);
  DriverExists := False;
  if (Length(Driver) >= 3) and (Copy(Driver, 2, 2) = ':\') then
    DriverExists := FileExists(Driver);
  HasLegacyDriver := FileExists(ExpandConstant('{sys}\drivers\PawnIO.sys'));
  Complete := ServicePresent and ServiceValid and (DriverType = 1) and
    (DriverStart <= 3) and (DeleteFlag = 0) and DriverExists and HasLibrary and
    (Version <> '') and not Conflict;
  if not Present64 and not Present32 and not ServicePresent and not HasLibrary and not HasLegacyDriver then begin
    Status := 'missing';
    PawnIODetection := CustomMessage('PawnIOMissing');
    PawnIOHeading := CustomMessage('PawnIOHeadingMissing');
    PawnIOSummary := CustomMessage('PawnIOSummaryMissing');
    PawnIOPageHint := CustomMessage('PawnIOInstallHint');
    PawnIOCanInstall := True;
  end else if Complete then begin
    Status := 'confirmed';
    PawnIOMissingDetected := False;
    PawnIOHeading := CustomMessage('PawnIOHeadingPresent');
    PawnIOSummary := FmtMessage(CustomMessage('PawnIOSummaryPresent'), [Version]);
    PawnIOPageHint := CustomMessage('PawnIOContinueHint');
    PawnIODetection := FmtMessage(CustomMessage('PawnIODetected'), [Version]);
    Minimum := '{#PawnIOMinVersion}';
    Maximum := '{#PawnIOMaxVersion}';
    if ParsePawnIOVersion(Minimum, Parts) then begin
      if ComparePawnIOVersions(Version, Minimum) < 0 then begin
        PawnIOMissingDetected := True;
        PawnIOSummary := FmtMessage(CustomMessage('PawnIOSummaryOld'), [Version, Minimum]);
        PawnIOPageHint := CustomMessage('PawnIOReviewHint');
        PawnIOHeading := CustomMessage('PawnIOHeadingReview');
      end;
    end;
    if ParsePawnIOVersion(Maximum, Parts) then begin
      if ComparePawnIOVersions(Version, Maximum) >= 0 then begin
        PawnIOHeading := CustomMessage('PawnIOHeadingReview');
        PawnIOSummary := FmtMessage(CustomMessage('PawnIOSummaryNewer'), [Version]);
      end;
    end;
  end else if Conflict then begin
    Status := 'conflict';
    PawnIODetection := CustomMessage('PawnIOConflict');
    PawnIOSummary := CustomMessage('PawnIOSummaryConflict');
  end;
  Details := FmtMessage(CustomMessage('PawnIOFileDetails'), [Version, Driver,
    PawnIOCheckText(DriverExists), PawnIOCheckText(Complete)]);
  PawnIODetection := PawnIODetection + #13#10#13#10 + Details;
  PawnIOChecking := False;
  PawnIOHasDetection := True;
  UpdatePawnIOPage;
  Log('PawnIO native installation inspection: ' + Status + ' ' + PawnIODetection);
end;
procedure PawnIORefreshClick(Sender: TObject);
begin
  if PawnIOInstalling or PawnIOChecking then Exit;
  DetectPawnIO;
end;

#ifdef PawnIOSetupPath
procedure PawnIOInstallClick(Sender: TObject);
var
  ErrorCode: Integer;
  Installer: String;
  BackEnabled, CancelEnabled: Boolean;
begin
  if PawnIOInstalling or PawnIOChecking then Exit;
  begin
    if MsgBox(CustomMessage('PawnIOInstallConfirm'), mbConfirmation,
        MB_YESNO or MB_DEFBUTTON2) <> IDYES then Exit;
    { Launch directly after consent. Recheck only after the wizard closes. }
    try
      ExtractTemporaryFile('PixelStudio-PawnIO-2.2.0-setup.exe');
      Installer := ExpandConstant('{tmp}\PixelStudio-PawnIO-2.2.0-setup.exe');
      if CompareText(GetSHA256OfFile(Installer),
          '1f519a22e47187f70a1379a48ca604981c4fcf694f4e65b734aaa74a9fba3032') <> 0 then begin
        MsgBox(CustomMessage('PawnIOIntegrityFailed'), mbError, MB_OK);
        Exit;
      end;
      BackEnabled := WizardForm.BackButton.Enabled;
      CancelEnabled := WizardForm.CancelButton.Enabled;
      PawnIOInstalling := True;
      try
        WizardForm.BackButton.Enabled := False;
        WizardForm.CancelButton.Enabled := False;
        UpdatePawnIOPage;
        WizardForm.Repaint;
        if not ShellExec('runas', Installer, '', '', SW_SHOWNORMAL,
            ewWaitUntilTerminated, ErrorCode) then
          MsgBox(FmtMessage(CustomMessage('PawnIOLaunchFailed'), [IntToStr(ErrorCode)]), mbInformation, MB_OK)
        else if (ErrorCode = 3010) or (ErrorCode = 1641) then
          PawnIORestartRequired := True
        else if ErrorCode <> 0 then
          MsgBox(FmtMessage(CustomMessage('PawnIOInstallFailed'), [IntToStr(ErrorCode)]), mbInformation, MB_OK);
      finally
        PawnIOInstalling := False;
        WizardForm.BackButton.Enabled := BackEnabled;
        WizardForm.CancelButton.Enabled := CancelEnabled;
      end;
    except
      Log('PawnIO installer launch failed: ' + GetExceptionMessage);
      MsgBox(FmtMessage(CustomMessage('PawnIOLaunchFailed'), [GetExceptionMessage]), mbError, MB_OK);
    end;
    DetectPawnIO;
    if PawnIOMissingDetected and not PawnIORestartRequired then begin
      PawnIOStatusLabel.Caption := CustomMessage('PawnIOStillMissing');
      LayoutPawnIOPage;
    end;
  end;
end;
#endif

procedure PawnIOWebsiteClick(Sender: TObject);
var
  ErrorCode: Integer;
begin
  if PawnIOInstalling then Exit;
  if MsgBox(CustomMessage('PawnIOOpenConfirm'), mbConfirmation,
      MB_YESNO or MB_DEFBUTTON2) <> IDYES then Exit;
  if not ShellExecAsOriginalUser('open', 'https://pawnio.eu/', '', '',
      SW_SHOWNORMAL, ewNoWait, ErrorCode) then
    MsgBox(CustomMessage('PawnIOOpenFailed'), mbInformation, MB_OK);
end;

procedure PawnIOActionsClick(Sender: TObject; const Link: String; LinkType: TSysLinkType);
begin
  if PawnIOInstalling then Exit;
  if Link = 'refresh' then PawnIORefreshClick(Sender)
  else if Link = 'website' then PawnIOWebsiteClick(Sender)
  else if Link = 'details' then begin
    PawnIODetailsExpanded := not PawnIODetailsExpanded;
    LayoutPawnIOPage;
  end;
end;

function ConfirmPawnIOPageNext: Boolean;
begin
  Result := True;
  if not PawnIOHasDetection then DetectPawnIO;
  if not PawnIOMissingDetected then Exit;
  { Silent setup cannot give informed consent for a shared driver install. }
  if WizardSilent then begin
    Log('PawnIO installation is unconfirmed; interactive review is required.');
    Result := False;
    Exit;
  end;
  { Navigation never launches a driver installer. Use the explicit page action. }
  Result := False;
  PawnIOStatusLabel.Caption := CustomMessage('PawnIORequired');
  LayoutPawnIOPage;
end;

procedure CreatePawnIOPage(AfterPage: Integer);
begin
  PawnIOPage := CreateCustomPage(AfterPage, CustomMessage('PawnIOTitle'), CustomMessage('PawnIOSubtitle'));
  PawnIOHeadingLabel := TNewStaticText.Create(PawnIOPage);
  PawnIOHeadingLabel.Parent := PawnIOPage.Surface;
  PawnIOHeadingLabel.AutoSize := False;
  PawnIOHeadingLabel.WordWrap := True;
  PawnIOHeadingLabel.Font.Style := [fsBold];
  PawnIOHeadingLabel.Font.Size := WizardForm.Font.Size + 2;
  PawnIOStatusLabel := TNewStaticText.Create(PawnIOPage);
  PawnIOStatusLabel.Parent := PawnIOPage.Surface;
  PawnIOStatusLabel.AutoSize := False;
  PawnIOStatusLabel.WordWrap := True;
  PawnIOHintLabel := TNewStaticText.Create(PawnIOPage);
  PawnIOHintLabel.Parent := PawnIOPage.Surface;
  PawnIOHintLabel.AutoSize := False;
  PawnIOHintLabel.WordWrap := True;
  PawnIOInstallButton := TNewButton.Create(PawnIOPage);
  PawnIOInstallButton.Parent := PawnIOPage.Surface;
  PawnIOInstallButton.Caption := CustomMessage('PawnIOInstall');
  PawnIOInstallButton.TabOrder := 0;
#ifdef PawnIOSetupPath
  PawnIOInstallButton.OnClick := @PawnIOInstallClick;
#endif
  PawnIOActionsLabel := TNewLinkLabel.Create(PawnIOPage);
  PawnIOActionsLabel.Parent := PawnIOPage.Surface;
  PawnIOActionsLabel.AutoSize := False;
  PawnIOActionsLabel.UseVisualStyle := True;
  PawnIOActionsLabel.TabStop := True;
  PawnIOActionsLabel.TabOrder := 1;
  PawnIOActionsLabel.OnLinkClick := @PawnIOActionsClick;
  PawnIODetailsMemo := TNewMemo.Create(PawnIOPage);
  PawnIODetailsMemo.Parent := PawnIOPage.Surface;
  PawnIODetailsMemo.ReadOnly := True;
  PawnIODetailsMemo.WordWrap := True;
  PawnIODetailsMemo.ScrollBars := ssVertical;
  PawnIODetailsMemo.TabOrder := 2;
  PawnIODetailsMemo.Visible := False;
  PawnIODetailsExpanded := False;
  { Defer inspection until this page is visible so the wait state can paint. }
  PawnIOHeading := CustomMessage('PawnIOHeadingChecking');
  PawnIOSummary := CustomMessage('PawnIOCheckingHint');
  PawnIOPageHint := '';
  UpdatePawnIOPage;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = PawnIOPage.ID then begin
    PawnIOPageActive := True;
    if not PawnIOHasDetection then DetectPawnIO else UpdatePawnIOPage;
  end else if PawnIOPageActive then begin
    PawnIOPageActive := False;
    WizardForm.NextButton.Enabled := True;
  end;
end;

<event('NeedRestart')>
function PawnIONeedRestart: Boolean;
begin
  Result := PawnIORestartRequired;
end;
