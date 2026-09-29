// Reuse the system driver. Only launch its official installer after consent.
// Bounds must be supplied by a release build after compatibility testing.
#ifdef PawnIOSetupPath
[Files]
Source: "{#PawnIOSetupPath}"; DestName: "PixelStudio-PawnIO-2.2.0-setup.exe"; Flags: dontcopy

[CustomMessages]
en.PawnIOInstall=Install official PawnIO
zh.PawnIOInstall=安装官方 PawnIO
en.PawnIOInstallConfirm=Run the bundled official PawnIO 2.2.0 installer? Save your work and close Fan Control, LibreHardwareMonitor and other monitoring tools first. This changes a shared system driver and may require administrator permission and a restart. Nothing will be installed silently. You may cancel and continue installing Pixel Studio without temperature monitoring.
zh.PawnIOInstallConfirm=运行内置的官方 PawnIO 2.2.0 安装程序吗？请先保存工作并退出 Fan Control、LibreHardwareMonitor 等监控软件。此操作会更改系统共享驱动，可能需要管理员权限和重启。不会静默安装；也可取消并继续安装 Pixel Studio，暂不使用温度采集。
en.PawnIOInstallFailed=PawnIO installation did not complete successfully, or was cancelled (code %1). You may continue installing Pixel Studio; some temperatures may remain unavailable. No shared driver will be removed.
zh.PawnIOInstallFailed=PawnIO 安装未成功完成或已取消（代码 %1）。可继续安装 Pixel Studio，部分温度可能暂不可用；不会删除共享驱动。
en.PawnIOIntegrityFailed=The bundled PawnIO installer failed its integrity check and will not be run. Download Pixel Studio again from its official release page.
zh.PawnIOIntegrityFailed=内置 PawnIO 安装程序完整性校验失败，不会运行。请从 Pixel Studio 官方发布页面重新下载安装包。
en.PawnIORestart=A restart is required by the PawnIO installer. Save your work and restart Windows before testing temperature monitoring.
zh.PawnIORestart=PawnIO 安装程序要求重启。请保存工作并重启 Windows，再测试温度采集。
en.PawnIOBundleHint=Official PawnIO 2.2.0 is bundled. Install it only if missing or if this build identifies an older supported upgrade. Existing compatible drivers are reused; unknown or newer versions are not replaced. Close other monitoring tools before installation. You can skip this step. Uninstalling Pixel Studio never removes the shared PawnIO driver.
zh.PawnIOBundleHint=已内置官方 PawnIO 2.2.0，仅在缺少驱动或确认旧版本需要升级时安装。兼容版本直接复用，版本不明或更新的版本不会覆盖。安装前请退出其他监控软件；也可跳过此步骤。卸载 Pixel Studio 不会删除共享 PawnIO 驱动。

[Code]
#endif
#ifndef PawnIOMinVersion
  #define PawnIOMinVersion ""
#endif
#ifndef PawnIOMaxVersion
  #define PawnIOMaxVersion ""
#endif

var
  PawnIOPage: TWizardPage;
  PawnIOStatusLabel, PawnIOHintLabel: TNewStaticText;
  PawnIORefreshButton, PawnIOWebsiteButton: TNewButton;
  PawnIODetection: String;
  PawnIOCanInstall, PawnIORestartRequired: Boolean;

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
  PawnIOCanInstall := False;
  PawnIOWebsiteButton.Enabled := True;
  if not Present64 and not Present32 then begin
    PawnIODetection := CustomMessage('PawnIOMissing');
    PawnIOCanInstall := True;
  end else if ((Present64 and not Valid64) or (Present32 and not Valid32)) then begin
    { Incomplete registrations are not proof that a driver is missing. }
  end else if Valid64 and Valid32 and (ComparePawnIOVersions(Version64, Version32) <> 0) then begin
    PawnIODetection := CustomMessage('PawnIOConflict');
  end else begin
    if Valid64 then Version := Version64 else Version := Version32;
    if ParsePawnIOVersion(Minimum, Parts) and ParsePawnIOVersion(Maximum, Parts) then begin
      if ComparePawnIOVersions(Version, Minimum) < 0 then begin
        PawnIODetection := FmtMessage(CustomMessage('PawnIOOld'), [Version, Minimum]);
        PawnIOCanInstall := (ComparePawnIOVersions(Version, '2.2.0.0') < 0) and
          (ComparePawnIOVersions('2.2.0.0', Minimum) >= 0) and
          (ComparePawnIOVersions('2.2.0.0', Maximum) < 0);
      end
      else if ComparePawnIOVersions(Version, Maximum) >= 0 then
        PawnIODetection := FmtMessage(CustomMessage('PawnIONewer'), [Version])
      else begin
        PawnIODetection := FmtMessage(CustomMessage('PawnIOReuse'), [Version]);
        PawnIOWebsiteButton.Enabled := False;
      end;
    end else
      PawnIODetection := FmtMessage(CustomMessage('PawnIODetected'), [Version]);
  end;
  PawnIOStatusLabel.Caption := PawnIODetection;
#ifdef PawnIOSetupPath
  if PawnIOCanInstall then
    PawnIOWebsiteButton.Caption := CustomMessage('PawnIOInstall')
  else
    PawnIOWebsiteButton.Caption := CustomMessage('PawnIOWebsite');
#endif
  Log('PawnIO registration detection: ' + PawnIODetection);
end;

procedure PawnIORefreshClick(Sender: TObject);
begin
  DetectPawnIO;
end;

procedure PawnIOWebsiteClick(Sender: TObject);
var
  ErrorCode: Integer;
#ifdef PawnIOSetupPath
  Installer: String;
#endif
begin
  DetectPawnIO;
#ifdef PawnIOSetupPath
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
      PawnIOWebsiteButton.Enabled := False;
      PawnIORefreshButton.Enabled := False;
      if not ShellExec('runas', Installer, '', '', SW_SHOWNORMAL,
          ewWaitUntilTerminated, ErrorCode) then
        MsgBox(FmtMessage(CustomMessage('PawnIOInstallFailed'), [IntToStr(ErrorCode)]), mbInformation, MB_OK)
      else if (ErrorCode = 3010) or (ErrorCode = 1641) then begin
        PawnIORestartRequired := True;
        MsgBox(CustomMessage('PawnIORestart'), mbInformation, MB_OK);
      end else if ErrorCode <> 0 then
        MsgBox(FmtMessage(CustomMessage('PawnIOInstallFailed'), [IntToStr(ErrorCode)]), mbInformation, MB_OK);
    except
      Log('PawnIO installer launch failed: ' + GetExceptionMessage);
      MsgBox(CustomMessage('PawnIOIntegrityFailed'), mbError, MB_OK);
    end;
    PawnIORefreshButton.Enabled := True;
    DetectPawnIO;
    Exit;
  end;
#endif
  if MsgBox(CustomMessage('PawnIOOpenConfirm'), mbConfirmation,
      MB_YESNO or MB_DEFBUTTON2) <> IDYES then Exit;
  if not ShellExecAsOriginalUser('open', 'https://pawnio.eu/', '', '',
      SW_SHOWNORMAL, ewNoWait, ErrorCode) then
    MsgBox(CustomMessage('PawnIOOpenFailed'), mbInformation, MB_OK);
end;

procedure CreatePawnIOPage(AfterPage: Integer);
begin
  PawnIOPage := CreateCustomPage(AfterPage, CustomMessage('PawnIOTitle'), CustomMessage('PawnIOSubtitle'));
  PawnIOStatusLabel := TNewStaticText.Create(PawnIOPage);
  PawnIOStatusLabel.Parent := PawnIOPage.Surface;
  PawnIOStatusLabel.SetBounds(0, 0, PawnIOPage.SurfaceWidth, ScaleY(82));
  PawnIOStatusLabel.AutoSize := False;
  PawnIOStatusLabel.WordWrap := True;
  PawnIOHintLabel := TNewStaticText.Create(PawnIOPage);
  PawnIOHintLabel.Parent := PawnIOPage.Surface;
  PawnIOHintLabel.SetBounds(0, ScaleY(88), PawnIOPage.SurfaceWidth, ScaleY(118));
  PawnIOHintLabel.AutoSize := False;
  PawnIOHintLabel.WordWrap := True;
  PawnIOHintLabel.Caption := CustomMessage('PawnIOHint');
#ifdef PawnIOSetupPath
  PawnIOHintLabel.Caption := CustomMessage('PawnIOBundleHint');
#endif
  PawnIORefreshButton := TNewButton.Create(PawnIOPage);
  PawnIORefreshButton.Parent := PawnIOPage.Surface;
  PawnIORefreshButton.SetBounds(0, ScaleY(214), (PawnIOPage.SurfaceWidth - ScaleX(12)) div 2, ScaleY(32));
  PawnIORefreshButton.Caption := CustomMessage('PawnIORefresh');
  PawnIORefreshButton.OnClick := @PawnIORefreshClick;
  PawnIOWebsiteButton := TNewButton.Create(PawnIOPage);
  PawnIOWebsiteButton.Parent := PawnIOPage.Surface;
  PawnIOWebsiteButton.SetBounds(PawnIORefreshButton.Width + ScaleX(12), ScaleY(214), PawnIORefreshButton.Width, ScaleY(32));
  PawnIOWebsiteButton.Caption := CustomMessage('PawnIOWebsite');
  PawnIOWebsiteButton.OnClick := @PawnIOWebsiteClick;
  DetectPawnIO;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = PawnIOPage.ID then DetectPawnIO;
end;

<event('NeedRestart')>
function PawnIONeedRestart: Boolean;
begin
  Result := PawnIORestartRequired;
end;
