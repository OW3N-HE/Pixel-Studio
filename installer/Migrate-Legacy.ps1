param(
    [ValidateSet('Prepare','Finalize')][string]$Mode = 'Prepare',
    [Parameter(Mandatory=$true)][string]$InstallDir,
    [switch]$DesktopSelected
)
$ErrorActionPreference = 'Stop'
$id = '4049925d-f69c-5df6-8487-1535b0cf2717'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName = 'com.ow3nhe.pixelstudio.desktop'
$stateDir = Join-Path $env:LOCALAPPDATA 'PixelStudio\Migration'
$stateFile = Join-Path $stateDir 'pending.json'
$allowed = @(
    (Join-Path $env:ProgramFiles 'Pixel Studio Desktop'),
    (Join-Path $env:LOCALAPPDATA 'Programs\pixel-studio-desktop'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Pixel Studio Desktop')
)
try {
    if ($Mode -eq 'Prepare') {
        if (Get-Process -Name 'Pixel Studio Desktop' -ErrorAction SilentlyContinue) {
            throw 'Exit Pixel Studio Desktop from the system tray before installing.'
        }
        $legacy = @()
        foreach ($hive in @('HKCU','HKLM')) {
            foreach ($branch in @('Software\Microsoft\Windows\CurrentVersion\Uninstall', 'Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall')) {
                $key = "${hive}:\$branch\$id"
                if (Test-Path -LiteralPath $key) {
                    $item = Get-ItemProperty -LiteralPath $key
                    if ($item.DisplayName -notlike 'Pixel Studio Desktop*') { throw 'Unexpected legacy product identity.' }
                    if ($item.UninstallString -notmatch '^"([^"]+\\Uninstall Pixel Studio Desktop\.exe)"\s*(/allusers|/currentuser)?\s*$') {
                        throw 'Unrecognized uninstall command. Use Windows Settings to remove the old desktop edition.'
                    }
                    $exe = [IO.Path]::GetFullPath($Matches[1]); $scope = $Matches[2]
                    if ($allowed -notcontains (Split-Path -Parent $exe)) { throw 'Custom legacy location: remove the old desktop edition in Windows Settings first.' }
                    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw 'Legacy uninstaller is missing. Repair the old installation before migrating.' }
                    $legacy += [pscustomobject]@{ Key=$key; Exe=$exe; Scope=$scope; Machine=($hive -eq 'HKLM') }
                }
            }
        }
        New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
        $backup = Join-Path $stateDir (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
        New-Item -ItemType Directory -Path $backup | Out-Null
        foreach ($name in @('pixel-studio-desktop','Pixel Studio Desktop','PixelStudio','Pixel Studio for OpenRGB')) {
            $source = Join-Path $env:APPDATA $name
            if (Test-Path -LiteralPath $source -PathType Container) {
                if ((Get-Item -LiteralPath $source).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to back up a redirected configuration folder automatically.' }
                & robocopy.exe $source (Join-Path $backup $name) /E /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
                if ($LASTEXITCODE -ge 8) { throw "Configuration backup failed: $name" }
            }
        }
        $run = (Get-ItemProperty -LiteralPath $runKey -ErrorAction SilentlyContinue).$runName
        $prior = $null
        if (Test-Path -LiteralPath $stateFile) { $prior = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json }
        $knownRun = $false
        foreach ($folder in $allowed) {
            if ($run -eq ('"' + (Join-Path $folder 'Pixel Studio Desktop.exe') + '" --login-start')) { $knownRun=$true }
        }
        $record = @{ Backup=$backup; MigrateLogin=($knownRun -or ($prior -and $prior.MigrateLogin)); OriginalRun=$run }
        $record | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
        $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backup 'migration.json') -Encoding UTF8
        foreach ($old in $legacy) {
            $arguments = @(); if ($old.Scope) { $arguments += $old.Scope }
            $options = @{ FilePath=$old.Exe; PassThru=$true; Wait=$true }
            if ($arguments.Count) { $options.ArgumentList=$arguments }
            # Interactive legacy uninstaller. Never request deletion of app data.
            if ($old.Machine) { $options.Verb='RunAs' }
            $process = Start-Process @options
            if ($process.ExitCode -ne 0 -or (Test-Path -LiteralPath $old.Key)) {
                throw 'Legacy uninstall was cancelled or is incomplete. New installation has not started.'
            }
        }
        # Rename only the known desktop profile after all desktop processes exit.
        # The original profile has already been backed up above.
        $roaming = [IO.Path]::GetFullPath($env:APPDATA).TrimEnd('\')
        $oldProfile = [IO.Path]::GetFullPath((Join-Path $roaming 'pixel-studio-desktop'))
        $newProfile = [IO.Path]::GetFullPath((Join-Path $roaming 'Pixel Studio Desktop'))
        if ((Split-Path -Parent $oldProfile) -ne $roaming -or (Split-Path -Parent $newProfile) -ne $roaming) {
            throw 'Unexpected desktop profile location.'
        }
        if ($DesktopSelected -and (Test-Path -LiteralPath $oldProfile -PathType Container) -and -not (Test-Path -LiteralPath $newProfile)) {
            if ((Get-Item -LiteralPath $oldProfile).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw 'Refusing to migrate a redirected desktop profile.'
            }
            Move-Item -LiteralPath $oldProfile -Destination $newProfile
        }
    } else {
        if (Test-Path -LiteralPath $stateFile) {
            $record = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
            if ($record.MigrateLogin -and $DesktopSelected) {
                $exe = Join-Path ([IO.Path]::GetFullPath($InstallDir)) 'desktop\Pixel Studio Desktop.exe'
                if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw 'New desktop executable is missing.' }
                New-Item -Path $runKey -Force | Out-Null
                New-ItemProperty -LiteralPath $runKey -Name $runName -PropertyType String -Value ('"'+$exe+'" --login-start') -Force | Out-Null
                $record.MigrateLogin=$false
                $record | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
            }
        }
    }
    exit 0
} catch {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    $_.Exception.Message | Set-Content -LiteralPath (Join-Path $stateDir 'last-error.txt') -Encoding UTF8
    exit 1
}
