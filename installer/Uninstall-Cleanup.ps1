param(
    [Parameter(Mandatory = $true)][string]$InstallDir,
    [Parameter(Mandatory = $true)][string]$ReportPath,
    [switch]$Purge
)
$ErrorActionPreference = 'Stop'
$failures = New-Object 'System.Collections.Generic.List[string]'
$report = New-Object 'System.Collections.Generic.List[string]'

function Assert-NoLinks([string]$Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing to traverse a link: $cursor"
            }
        }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
}

function Remove-OwnedPath([string]$Root, [string]$Relative) {
    $base = [IO.Path]::GetFullPath($Root).TrimEnd('\')
    $target = [IO.Path]::GetFullPath((Join-Path $base $Relative))
    if (-not $target.StartsWith($base + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Cleanup target is outside its data root: $target"
    }
    Assert-NoLinks $target
    if (-not (Test-Path -LiteralPath $target)) { return }
    # Preflight the whole tree without following junctions or symbolic links.
    $pending = New-Object 'System.Collections.Generic.Stack[string]'
    $pending.Push($target)
    while ($pending.Count) {
        $item = Get-Item -LiteralPath $pending.Pop() -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw "Refusing to remove a tree containing a link: $($item.FullName)"
        }
        if ($item.PSIsContainer) {
            foreach ($child in Get-ChildItem -LiteralPath $item.FullName -Force) {
                $pending.Push($child.FullName)
            }
        }
    }
    # Allow handles released during normal shutdown a short time to close.
    for ($attempt = 0; $attempt -lt 4; $attempt++) {
        try {
            Remove-Item -LiteralPath $target -Recurse -Force
            break
        } catch {
            if ($attempt -eq 3) { throw }
            Start-Sleep -Milliseconds 500
            Assert-NoLinks $target
        }
    }
    $report.Add("Removed: $target")
}

try {
    $runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    $runName = 'com.ow3nhe.pixelstudio.desktop'
    $command = (Get-ItemProperty -LiteralPath $runKey -ErrorAction SilentlyContinue).$runName
    $exe = Join-Path ([IO.Path]::GetFullPath($InstallDir)) 'desktop\Pixel Studio Desktop.exe'
    # Do not remove a development checkout's or a different installation's entry.
    if ($command -and ($command -match '^"([^"]+)"(?:\s|$)') -and
        [string]::Equals($Matches[1], $exe, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-ItemProperty -LiteralPath $runKey -Name $runName
        $approved = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'
        if (Get-ItemProperty -LiteralPath $approved -Name $runName -ErrorAction SilentlyContinue) {
            Remove-ItemProperty -LiteralPath $approved -Name $runName
        }
        $report.Add('Removed this installation login startup entry.')
    }
} catch { $failures.Add($_.Exception.Message) }

if ($Purge) {
    foreach ($relative in @('Pixel Studio Desktop', 'pixel-studio-desktop',
                            'Pixel Studio for OpenRGB', 'PixelStudio\OpenRGBPlugin.ini')) {
        try { Remove-OwnedPath $env:APPDATA $relative }
        catch { $failures.Add("$relative : $($_.Exception.Message)") }
    }
    foreach ($relative in @('PixelStudio\InstallerBackups', 'PixelStudio\Migration')) {
        try { Remove-OwnedPath $env:LOCALAPPDATA $relative }
        catch { $failures.Add("$relative : $($_.Exception.Message)") }
    }
    # Never remove an entire shared namespace if it has other contents.
    foreach ($root in @($env:APPDATA, $env:LOCALAPPDATA)) {
        try {
            $directory = Join-Path $root 'PixelStudio'
            Assert-NoLinks $directory
            if ((Test-Path -LiteralPath $directory -PathType Container) -and
                -not @(Get-ChildItem -LiteralPath $directory -Force).Count) {
                Remove-Item -LiteralPath $directory
            }
        } catch { $failures.Add($_.Exception.Message) }
    }
}

$report.Add('Browser profiles, external media, other OpenRGB plugins and shared drivers were not modified.')
foreach ($failure in $failures) { $report.Add("FAILED: $failure") }
if ($failures.Count) {
    $report | Set-Content -LiteralPath $ReportPath -Encoding UTF8
    exit 1
}
exit 0
