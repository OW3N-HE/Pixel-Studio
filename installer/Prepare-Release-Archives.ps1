param(
    [Parameter(Mandatory = $true)][string]$PayloadDir,
    [Parameter(Mandatory = $true)][string]$SourceDir,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$Version
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$payload = (Resolve-Path -LiteralPath $PayloadDir).Path
$snapshot = (Resolve-Path -LiteralPath $SourceDir).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'A stable version is required.' }
if ((Get-Content -LiteralPath (Join-Path $root 'desktop\package.json') -Raw | ConvertFrom-Json).version -ne $Version) { throw 'Version mismatch.' }
if (Test-Path -LiteralPath $output) { throw 'Refusing to overwrite an existing release directory.' }
$source = Join-Path $output "PixelStudio-Source-$Version"
$web = Join-Path $output "PixelStudio-Web-$Version"
New-Item -ItemType Directory -Path $source,$web -Force | Out-Null
function Copy-SourceFile([string]$From, [string]$Relative) {
    $target = Join-Path $source $Relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $From -Destination $target
}
$appFiles = @('index.html','pixel-settings-schema.cjs','pixel-rgb-canvas.cjs','pixel-animation-designs.cjs','pixel-animation-engine.cjs','pixel-clock-renderer.cjs','pixel-animation-catalog.cjs','pixel-animation-runtime.js','pixel-output-protocols.cjs','pixel-output-transports.cjs','pixel-render-settings.cjs','pixel-frame-mapping.cjs','pixel-frame-pipeline.cjs','pixel-browser-media.cjs','pixel-browser-playback.cjs','pixel-browser-output.cjs','pixel-circuit-palette.cjs','pixel-temperature.cjs','pixel-temperature-service.cjs','pixel-temperature-ui.js','pixel-ddp-bridge.cjs','pixel-headless-renderer.cjs','pixel-stream-worker.cjs','pixel-studio-web-language.js','pixel-studio-web-palettes.js','pixel-studio-web-ui.css','pixel-studio-web-ui.js','Start-Pixel-DDP.cmd','Start-Pixel-DDP.ps1','Start-Pixel-Studio.cmd','GETTING-STARTED.html','LICENSE')
foreach ($file in $appFiles) {
    $from = Join-Path $snapshot "app\$file"
    if ((Get-FileHash -LiteralPath $from).Hash -ne (Get-FileHash -LiteralPath (Join-Path $payload "app\$file")).Hash) { throw "Snapshot/payload mismatch: $file" }
    Copy-SourceFile $from $file
}
foreach ($file in @('Build-Plugin.ps1','CMakeLists.txt','plugin.json','pixel-studio-host.cjs','THIRD-PARTY.md','NATIVE-USB.md')) {
    Copy-SourceFile (Join-Path $snapshot "app\openrgb-plugin\$file") "openrgb-plugin\$file"
}
foreach ($dir in @('src','compat')) {
    Get-ChildItem -LiteralPath (Join-Path $snapshot "app\openrgb-plugin\$dir") -File | Where-Object { $_.Extension -in @('.cpp','.h') } | ForEach-Object {
        Copy-SourceFile $_.FullName "openrgb-plugin\$dir\$($_.Name)"
    }
}
foreach ($file in @('main.cjs','preload.cjs','session-controller.js','media-playback.js','media-library.cjs','media-library-ui.js','media-thumbnails.js','ddp-service.cjs','updater.cjs','icons.cjs','package.json','package-lock.json','electron-builder.unified.cjs')) {
    Copy-SourceFile (Join-Path $root "desktop\$file") "desktop\$file"
}
# Explicit generated branding inputs; never sweep design drafts into an archive.
foreach ($file in @('pixel-studio.ico','brand-geometry.json')) {
    Copy-SourceFile (Join-Path $root "desktop\assets\$file") "desktop\assets\$file"
}
Get-ChildItem -LiteralPath (Join-Path $root 'temperature') -File | Where-Object { $_.Extension -in @('.cs','.csproj') } | ForEach-Object {
    Copy-SourceFile $_.FullName "temperature\$($_.Name)"
}
Get-ChildItem -LiteralPath (Join-Path $root 'temperature\third-party') -File -Filter '*.txt' | ForEach-Object {
    Copy-SourceFile $_.FullName "temperature\third-party\$($_.Name)"
}
foreach ($file in @('Build-Installer.ps1','Build-Unified-Test.ps1','Prepare-Test-Payload.cjs','Prepare-SensorNotices.ps1','Prepare-Release-Archives.ps1','Prepare-PawnIO.ps1','Manage-SensorServices.ps1','Migrate-Legacy.ps1','PixelStudio.iss','PawnIO.iss','GETTING-STARTED.html',"RELEASE-$Version.md")) {
    Copy-SourceFile (Join-Path $PSScriptRoot $file) "installer\$file"
}
foreach ($file in @('check-language-state.cjs','test-desktop-session.cjs','test-desktop-settings.cjs','test-updater.cjs','sync-guide-logo.cjs','test-engine-modules.cjs','test-output-transports.cjs','test-stream-worker.cjs','test-module-resources.cjs','test-temperature-service.cjs','test-frame-pipeline.cjs','test-browser-modules.cjs','test-media-thumbnails.cjs','test-openrgb-preview.cjs','test-web-shell.cjs','frame-pipeline-baseline.json','animation-module-baseline.json')) {
    Copy-SourceFile (Join-Path $root "tools\$file") "tools\$file"
}
Copy-SourceFile (Join-Path $root 'README.md') 'README.md'
Copy-SourceFile (Join-Path $root 'package.json') 'package.json'
Copy-SourceFile (Join-Path $root 'package-lock.json') 'package-lock.json'
Copy-SourceFile (Join-Path $root 'tools\run-tests.cjs') 'tools\run-tests.cjs'
Copy-SourceFile (Join-Path $root 'tools\test-release-notes.cjs') 'tools\test-release-notes.cjs'
Copy-SourceFile (Join-Path $root 'tools\test-dimension-settings.cjs') 'tools\test-dimension-settings.cjs'
Copy-SourceFile (Join-Path $PSScriptRoot 'SOURCE-BUILD.md') 'SOURCE-BUILD.md'
Copy-SourceFile (Join-Path $PSScriptRoot 'SOURCE-BUILD.md') 'installer\SOURCE-BUILD.md'
Copy-SourceFile (Join-Path $PSScriptRoot "RELEASE-$Version.md") 'RELEASE-NOTES.md'
Get-ChildItem -LiteralPath (Join-Path $payload 'app') -Force | Copy-Item -Destination $web -Recurse
Copy-Item -LiteralPath (Join-Path $payload 'runtime') -Destination (Join-Path $web 'runtime') -Recurse
foreach ($tree in @($source, $web)) {
    $bad = @(Get-ChildItem -LiteralPath $tree -Recurse -File | Where-Object { $_.Name -match '\.(pdb|log|bak)$|^\.env|clipboard' })
    if ($bad.Count) { throw 'Private or debug files in archive input.' }
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($tree in @($source, $web)) {
    $zip = $tree + '.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($tree, $zip, [IO.Compression.CompressionLevel]::Optimal, $true)
    Write-Output "Prepared $zip"
}
Write-Output 'Archives assembled from explicit source allowlists. Review before publishing.'
