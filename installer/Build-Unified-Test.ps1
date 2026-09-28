$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $root 'desktop\package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
    throw 'Desktop version must be a stable three-part version.'
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sourceName = "unified-source-$version-$stamp"
$source = Join-Path $root "release-staging\$sourceName"
$payload = Join-Path $root "release-staging\unified-payload-$version-$stamp"
& node (Join-Path $PSScriptRoot 'Prepare-Test-Payload.cjs') $sourceName
if ($LASTEXITCODE -ne 0) { throw 'Preparing sources failed.' }
& (Join-Path $source 'app\openrgb-plugin\Build-Plugin.ps1') -QtDir (Join-Path $root 'openrgb-plugin\.tools\qt\5.15.0\msvc2019_64')
Push-Location (Join-Path $root 'desktop')
try {
    & node '.\icons.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'Icon generation failed.' }
    & '.\node_modules\.bin\electron-builder.cmd' --dir --win --x64 --config electron-builder.unified.cjs --publish never
    if ($LASTEXITCODE -ne 0) { throw 'Desktop packaging failed.' }
} finally { Pop-Location }
if (Test-Path -LiteralPath $payload) { throw 'Payload exists; refusing overwrite.' }
New-Item -ItemType Directory -Path "$payload\app\openrgb-plugin\dist","$payload\runtime","$payload\plugin" -Force | Out-Null
$files = @('index.html','pixel-circuit-palette.cjs','pixel-ddp-bridge.cjs','pixel-headless-renderer.cjs','pixel-stream-worker.cjs','pixel-studio-web-language.js','pixel-studio-web-palettes.js','pixel-studio-web-ui.css','pixel-studio-web-ui.js','Start-Pixel-DDP.cmd','Start-Pixel-DDP.ps1','Start-Pixel-Studio.cmd','GETTING-STARTED.html','LICENSE')
foreach ($file in $files) { Copy-Item -LiteralPath "$source\app\$file" -Destination "$payload\app\$file" }
foreach ($file in @('Build-Plugin.ps1','CMakeLists.txt','plugin.json','pixel-studio-host.cjs','THIRD-PARTY.md','NATIVE-USB.md')) {
    Copy-Item -LiteralPath "$source\app\openrgb-plugin\$file" -Destination "$payload\app\openrgb-plugin\$file"
}
foreach ($dir in @('src','compat')) { Copy-Item -LiteralPath "$source\app\openrgb-plugin\$dir" -Destination "$payload\app\openrgb-plugin\$dir" -Recurse }
Copy-Item -LiteralPath "$source\LICENSE" -Destination "$payload\LICENSE"
Copy-Item -LiteralPath "$source\app\openrgb-plugin\dist\PixelStudioSerial.exe" -Destination "$payload\app\openrgb-plugin\dist\PixelStudioSerial.exe"
Copy-Item -LiteralPath "$source\app\openrgb-plugin\dist\PixelStudioPlugin.dll" -Destination "$payload\plugin\PixelStudioPlugin.dll"
foreach ($file in @('node.exe','LICENSE')) {
    Copy-Item -LiteralPath (Join-Path $root ".tools\installer-downloads\node-v22.23.3-win-x64\$file") -Destination "$payload\runtime\$file"
}
Copy-Item -LiteralPath (Join-Path $root 'desktop\dist-unified\win-unpacked') -Destination "$payload\desktop" -Recurse
& (Join-Path $PSScriptRoot 'Build-Installer.ps1') -PayloadDir $payload -IsccPath (Join-Path $root '.tools\inno-setup\ISCC.exe') -Version $version -TestPackage
Write-Output 'Unified test installer built. No installation or GitHub publication was performed.'
