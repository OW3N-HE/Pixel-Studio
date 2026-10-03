// Reuse the system driver. Only launch its official installer after consent.
// Bounds must be supplied by a release build after compatibility testing.
#ifdef PawnIOSetupPath
[Files]
Source: "{#PawnIOSetupPath}"; DestName: "PixelStudio-PawnIO-2.2.0-setup.exe"; Flags: dontcopy
#endif

[CustomMessages]
en.PawnIOInstall=Install PawnIO...
zh.PawnIOInstall=安装 PawnIO...
en.PawnIOUpgrade=Update PawnIO...
zh.PawnIOUpgrade=更新 PawnIO...
en.PawnIOInstallConfirm=Open the official PawnIO 2.2.0 installation wizard?%n%nSave your work and close Fan Control, LibreHardwareMonitor and other monitoring tools first. This installs or updates a shared system driver and may require administrator approval or a restart.%n%nThe official wizard will remain visible. When it closes, Pixel Studio will check the driver again. Choose No to return without installing it.
zh.PawnIOInstallConfirm=打开官方 PawnIO 2.2.0 安装向导吗？%n%n请先保存工作并退出 Fan Control、LibreHardwareMonitor 等监控软件。此操作会安装或更新系统共享驱动，可能需要管理员授权或重启。%n%n官方向导会正常显示，关闭后将自动重新检测驱动。选择“否”可返回本页，不安装驱动。
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
en.PawnIOStillMissing=PawnIO has not been detected yet. Check again or retry installation to continue.
zh.PawnIOStillMissing=暂未检测到 PawnIO。请重新检测或重试安装，完成后才能继续。
en.PawnIOSummaryMissing=Temperature monitoring needs this driver. Install it before continuing.
zh.PawnIOSummaryMissing=温度采集需要此驱动。完成安装后才能继续。
en.PawnIOSummaryPresent=PawnIO %1 was found. Your existing driver will be kept.
zh.PawnIOSummaryPresent=已检测到 PawnIO %1。将保留现有驱动，不重复安装。
en.PawnIOSummaryUnknown=Driver records were found, but the version could not be read. Nothing will be replaced.
zh.PawnIOSummaryUnknown=检测到驱动记录，但无法读取版本。不会覆盖现有驱动。
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
en.PawnIOReviewHint=Read the details before continuing.
zh.PawnIOReviewHint=请查看详细信息，确认状态后继续。
en.PawnIOManualHint=Install the signed driver from the official website, then choose Check again.
zh.PawnIOManualHint=请从官方网站安装签名版驱动，再点击“重新检测”。
en.PawnIODetailsShow=Show details
zh.PawnIODetailsShow=详细信息
en.PawnIODetailsHide=Hide details
zh.PawnIODetailsHide=收起详情
en.PawnIOWebsiteLink=Official website
zh.PawnIOWebsiteLink=官方网站

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
  PawnIOPageActive, PawnIOInstalling, PawnIODetailsExpanded: Boolean;

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
      CustomMessage('PawnIOInstall'), CustomMessage('PawnIOUpgrade')]) + ScaleX(16);
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
  PawnIOInstallButton.Visible := PawnIOCanInstall;
  if PawnIOMissingDetected then
    PawnIOInstallButton.Caption := CustomMessage('PawnIOInstall')
  else
    PawnIOInstallButton.Caption := CustomMessage('PawnIOUpgrade');
  if PawnIOCanInstall then
    PawnIODetailsMemo.Lines.Text := PawnIODetection + #13#10#13#10 + CustomMessage('PawnIOBundleHint');
#else
  if PawnIOMissingDetected then PawnIOHintLabel.Caption := CustomMessage('PawnIOManualHint');
#endif
  if PawnIOInstalling then begin
    PawnIOHeadingLabel.Caption := CustomMessage('PawnIOHeadingInstalling');
    PawnIOStatusLabel.Caption := CustomMessage('PawnIOWaiting');
    PawnIOHintLabel.Caption := '';
  end else if PawnIORestartRequired then begin
    PawnIOHeadingLabel.Caption := CustomMessage('PawnIOHeadingRestart');
    PawnIOHintLabel.Caption := CustomMessage('PawnIORestart');
    PawnIODetailsMemo.Lines.Text := PawnIODetailsMemo.Lines.Text + #13#10#13#10 + CustomMessage('PawnIORestart');
  end;
  PawnIOInstallButton.Enabled := PawnIOCanInstall and not PawnIOInstalling;
  PawnIOActionsLabel.Enabled := not PawnIOInstalling;
  if PawnIOPageActive then
    WizardForm.NextButton.Enabled := not PawnIOMissingDetected and not PawnIOInstalling;
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

procedure DetectPawnIO;
var
  Version64, Version32, Version, Minimum, Maximum: String;
  Present64, Present32, Valid64, Valid32: Boolean;
  Parts: TArrayOfInteger;
begin
  Version64 := '';
  Version32 := '';
  Present64 := RegKeyExists(HKLM64, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO');
  Present32 := RegKeyExists(HKLM32, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO');
  RegQueryStringValue(HKLM64, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO', 'DisplayVersion', Version64);
  RegQueryStringValue(HKLM32, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO', 'DisplayVersion', Version32);
  Valid64 := ParsePawnIOVersion(Version64, Parts);
  Valid32 := ParsePawnIOVersion(Version32, Parts);
  Minimum := '{#PawnIOMinVersion}';
  Maximum := '{#PawnIOMaxVersion}';
  PawnIODetection := CustomMessage('PawnIOUnknown');
  PawnIOHeading := CustomMessage('PawnIOHeadingReview');
  PawnIOSummary := CustomMessage('PawnIOSummaryUnknown');
  PawnIOPageHint := CustomMessage('PawnIOReviewHint');
  PawnIOCanInstall := False;
  PawnIOMissingDetected := False;
  if not Present64 and not Present32 then begin
    if not RegKeyExists(HKLM, 'SYSTEM\CurrentControlSet\Services\PawnIO') and
        not FileExists(ExpandConstant('{sys}\drivers\PawnIO.sys')) then begin
      PawnIODetection := CustomMessage('PawnIOMissing');
      PawnIOHeading := CustomMessage('PawnIOHeadingMissing');
      PawnIOSummary := CustomMessage('PawnIOSummaryMissing');
      PawnIOPageHint := CustomMessage('PawnIOInstallHint');
      PawnIOCanInstall := True;
      PawnIOMissingDetected := True;
    end;
  end else if ((Present64 and not Valid64) or (Present32 and not Valid32)) then begin
    { Incomplete registrations are not proof that a driver is missing. }
  end else if Valid64 and Valid32 and (ComparePawnIOVersions(Version64, Version32) <> 0) then begin
    PawnIODetection := CustomMessage('PawnIOConflict');
    PawnIOSummary := CustomMessage('PawnIOSummaryConflict');
  end else begin
    if Valid64 then Version := Version64 else Version := Version32;
    PawnIOHeading := CustomMessage('PawnIOHeadingPresent');
    PawnIOSummary := FmtMessage(CustomMessage('PawnIOSummaryPresent'), [Version]);
    PawnIOPageHint := CustomMessage('PawnIOContinueHint');
    if ParsePawnIOVersion(Minimum, Parts) and ParsePawnIOVersion(Maximum, Parts) then begin
      if ComparePawnIOVersions(Version, Minimum) < 0 then begin
        PawnIODetection := FmtMessage(CustomMessage('PawnIOOld'), [Version, Minimum]);
        PawnIOSummary := FmtMessage(CustomMessage('PawnIOSummaryOld'), [Version, Minimum]);
        PawnIOCanInstall := (ComparePawnIOVersions(Version, '2.2.0.0') < 0) and
          (ComparePawnIOVersions('2.2.0.0', Minimum) >= 0) and
          (ComparePawnIOVersions('2.2.0.0', Maximum) < 0);
        PawnIOHeading := CustomMessage('PawnIOHeadingReview');
        PawnIOPageHint := CustomMessage('PawnIOReviewHint');
        if PawnIOCanInstall then begin
          PawnIOHeading := CustomMessage('PawnIOHeadingUpgrade');
          PawnIOPageHint := CustomMessage('PawnIOInstallHint');
        end;
      end
      else if ComparePawnIOVersions(Version, Maximum) >= 0 then begin
        PawnIODetection := FmtMessage(CustomMessage('PawnIONewer'), [Version]);
        PawnIOHeading := CustomMessage('PawnIOHeadingReview');
        PawnIOSummary := FmtMessage(CustomMessage('PawnIOSummaryNewer'), [Version]);
        PawnIOPageHint := CustomMessage('PawnIOReviewHint');
      end
      else begin
        PawnIODetection := FmtMessage(CustomMessage('PawnIOReuse'), [Version]);
        PawnIOHeading := CustomMessage('PawnIOHeadingReady');
      end;
    end else
      PawnIODetection := FmtMessage(CustomMessage('PawnIODetected'), [Version]);
  end;
  UpdatePawnIOPage;
  Log('PawnIO registration detection: ' + PawnIODetection);
end;

procedure PawnIORefreshClick(Sender: TObject);
begin
  if PawnIOInstalling then Exit;
  DetectPawnIO;
end;

#ifdef PawnIOSetupPath
procedure PawnIOInstallClick(Sender: TObject);
var
  ErrorCode: Integer;
  Installer: String;
  BackEnabled, CancelEnabled: Boolean;
begin
  if PawnIOInstalling then Exit;
  DetectPawnIO;
  if PawnIOCanInstall then begin
    if MsgBox(CustomMessage('PawnIOInstallConfirm'), mbConfirmation,
        MB_YESNO or MB_DEFBUTTON2) <> IDYES then Exit;
    { Recheck immediately before launching; do not replace a new installation. }
    DetectPawnIO;
    if not PawnIOCanInstall then Exit;
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
  DetectPawnIO;
  if not PawnIOMissingDetected then Exit;
  { Silent setup cannot give informed consent for a shared driver install. }
  if WizardSilent then begin
    Log('PawnIO is missing; interactive driver consent is required.');
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
  DetectPawnIO;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = PawnIOPage.ID then begin
    PawnIOPageActive := True;
    DetectPawnIO;
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
