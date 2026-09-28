param(
    [string]$QtDir = (Join-Path $PSScriptRoot '.tools\qt\5.15.0\msvc2019_64'),
    [string]$VisualStudioPath = ''
)
$ErrorActionPreference = 'Stop'

# Builds only. Never installs a plugin, replaces OpenRGB DLLs, or starts playback.
if (-not $VisualStudioPath) {
    $vswhere = Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswhere)) {
        throw 'Visual Studio Build Tools with Desktop development with C++ is required.'
    }
    $VisualStudioPath = (& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1)
}
if (-not $VisualStudioPath) { throw 'No Visual Studio C++ toolchain found.' }

$dev = Join-Path $VisualStudioPath 'Common7\Tools\VsDevCmd.bat'
$cmake = Join-Path $VisualStudioPath 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe'
if (-not (Test-Path -LiteralPath $cmake)) {
    $command = Get-Command cmake -ErrorAction SilentlyContinue
    if ($command) { $cmake = $command.Source }
}
foreach ($required in @($dev, $cmake, (Join-Path $QtDir 'lib\cmake\Qt5\Qt5Config.cmake'))) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Missing build dependency: $required" }
}
$QtDir = (Resolve-Path -LiteralPath $QtDir).Path
$projectRoot = Split-Path -Parent $PSScriptRoot
$hash = [System.Security.Cryptography.SHA256]::Create()
try {
    $key = ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectRoot)))).Replace('-', '').Substring(0, 12)
} finally { $hash.Dispose() }
$aliasRoot = Join-Path $env:TEMP ('PixelStudio-OpenRGB-' + $key)
New-Item -ItemType Directory -Path $aliasRoot -Force | Out-Null
function New-BuildAlias([string]$Name, [string]$Target) {
    $alias = Join-Path $aliasRoot $Name
    if (Test-Path -LiteralPath $alias) {
        $item = Get-Item -LiteralPath $alias -Force
        if ($item.LinkType -ne 'Junction' -or $item.Target -notcontains $Target) {
            throw "Build alias is already occupied: $alias"
        }
    } else {
        New-Item -ItemType Junction -Path $alias -Target $Target | Out-Null
    }
    return $alias
}
$projectAlias = New-BuildAlias 'project' $projectRoot
$source = Join-Path $projectAlias 'openrgb-plugin'
$QtDir = New-BuildAlias 'qt' $QtDir
$build = Join-Path $source '.build-msvc'
$env:VSLANG = '1033'
$commandLine = 'chcp 65001 >nul && call "{0}" -arch=x64 -host_arch=x64 >nul && "{1}" -S "{2}" -B "{3}" -G "NMake Makefiles" -DCMAKE_BUILD_TYPE=Release "-DCMAKE_PREFIX_PATH={4}" && "{1}" --build "{3}"' -f $dev, $cmake, $source, $build, $QtDir
& $env:ComSpec /d /s /c $commandLine
if ($LASTEXITCODE -ne 0) { throw "Plugin compilation failed with exit code $LASTEXITCODE." }
Write-Output ("Build completed: " + (Join-Path $PSScriptRoot 'dist\PixelStudioPlugin.dll'))
Write-Output ("USB writer: " + (Join-Path $PSScriptRoot 'dist\PixelStudioSerial.exe'))
Write-Output 'The DLL has not been installed or loaded into OpenRGB.'
