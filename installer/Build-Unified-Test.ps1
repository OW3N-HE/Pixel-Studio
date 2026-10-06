param([switch]$PrepareOnly)
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
$sdk = Join-Path $root '.tools\dotnet\dotnet.exe'
if (-not (Test-Path -LiteralPath $sdk -PathType Leaf)) { throw 'The local .NET SDK is required to build the sensor component.' }
& node (Join-Path $root 'desktop\icons.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Icon generation failed.' }
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
& $sdk publish (Join-Path $root 'temperature\PixelStudio.Sensors.csproj') -c Release -o (Join-Path $source 'app\temperature') "-p:PathMap=$root=/_/PixelStudio" --nologo
if ($LASTEXITCODE -ne 0) { throw 'Sensor component build failed.' }
& (Join-Path $PSScriptRoot 'Prepare-SensorNotices.ps1') -OutputDirectory (Join-Path $source 'app\temperature')
& (Join-Path $source 'app\openrgb-plugin\Build-Plugin.ps1') -QtDir (Join-Path $root 'openrgb-plugin\.tools\qt\5.15.0\msvc2019_64')
$oldWebSource = $env:PIXEL_STUDIO_WEB_SOURCE
$env:PIXEL_STUDIO_WEB_SOURCE = Join-Path $source 'app'
Push-Location (Join-Path $root 'desktop')
try {
    $electronDist = Join-Path $root 'desktop\node_modules\electron\dist'
    if (-not (Test-Path -LiteralPath (Join-Path $electronDist 'electron.exe') -PathType Leaf)) { throw 'The local Electron runtime is required.' }
    & '.\node_modules\.bin\electron-builder.cmd' --dir --win --x64 --config electron-builder.unified.cjs --publish never "-c.electronDist=$electronDist"
    if ($LASTEXITCODE -ne 0) { throw 'Desktop packaging failed.' }
} finally { Pop-Location; $env:PIXEL_STUDIO_WEB_SOURCE = $oldWebSource }
if (Test-Path -LiteralPath $payload) { throw 'Payload exists; refusing overwrite.' }
New-Item -ItemType Directory -Path "$payload\app\openrgb-plugin\dist","$payload\runtime","$payload\plugin" -Force | Out-Null
$files = @('index.html','pixel-settings-schema.cjs','pixel-rgb-canvas.cjs','pixel-animation-designs.cjs','pixel-animation-engine.cjs','pixel-clock-renderer.cjs','pixel-animation-catalog.cjs','pixel-animation-runtime.js','pixel-output-protocols.cjs','pixel-output-transports.cjs','pixel-render-settings.cjs','pixel-frame-mapping.cjs','pixel-frame-pipeline.cjs','pixel-browser-media.cjs','pixel-browser-playback.cjs','pixel-browser-output.cjs','pixel-circuit-palette.cjs','pixel-temperature.cjs','pixel-temperature-service.cjs','pixel-temperature-ui.js','pixel-ddp-bridge.cjs','pixel-headless-renderer.cjs','pixel-stream-worker.cjs','pixel-studio-web-language.js','pixel-studio-web-palettes.js','pixel-studio-web-ui.css','pixel-studio-web-ui.js','Start-Pixel-DDP.cmd','Start-Pixel-DDP.ps1','Start-Pixel-Studio.cmd','GETTING-STARTED.html','LICENSE')
foreach ($file in $files) { Copy-Item -LiteralPath "$source\app\$file" -Destination "$payload\app\$file" }
$sensorSource = Join-Path $source 'app\temperature'
$sensorTarget = Join-Path $payload 'app\temperature'
Get-ChildItem -LiteralPath $sensorSource -Recurse -File | Where-Object { $_.Extension -ne '.pdb' } | ForEach-Object {
    $relative = $_.FullName.Substring($sensorSource.Length + 1)
    $target = Join-Path $sensorTarget $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $target
}
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
if ($PrepareOnly) {
    Write-Output "Fresh source: $source"
    Write-Output "Fresh payload: $payload"
    Write-Output 'Compilation complete. Review this payload before invoking the formal installer compiler.'
    return
}
& (Join-Path $PSScriptRoot 'Build-Installer.ps1') -PayloadDir $payload -IsccPath (Join-Path $root '.tools\inno-setup-7\ISCC.exe') -Version $version -TestPackage
Write-Output 'Unified test installer built. No installation or GitHub publication was performed.'
