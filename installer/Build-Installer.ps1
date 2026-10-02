param(
    [Parameter(Mandatory = $true)][string]$PayloadDir,
    [Parameter(Mandatory = $true)][string]$IsccPath,
    [string]$Version = '0.1.10',
    [switch]$TestPackage,
    [string]$PawnIOMinVersion = '',
    [string]$PawnIOMaxVersion = '',
    [string]$PawnIOInstallerPath = '',
    [string]$OutputDirectory = ''
)
$ErrorActionPreference = 'Stop'
if (($PawnIOMinVersion -eq '') -ne ($PawnIOMaxVersion -eq '')) {
    throw 'Supply both tested PawnIO version bounds, or neither.'
}
if ($PawnIOMinVersion -ne '') {
    foreach ($bound in @($PawnIOMinVersion, $PawnIOMaxVersion)) {
        if ($bound -notmatch '^\d{1,5}(\.\d{1,5}){1,3}$' -or
            @($bound.Split('.') | Where-Object { [int]$_ -gt 65535 }).Count -gt 0) {
            throw 'Invalid PawnIO version bound.'
        }
    }
    if ([version]$PawnIOMinVersion -ge [version]$PawnIOMaxVersion) {
        throw 'PawnIO upper version bound must be exclusive and greater than the minimum.'
    }
}
if ($Version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
    throw 'Version must be a stable three-part version.'
}
$payload = (Resolve-Path -LiteralPath $PayloadDir).Path
$compiler = (Resolve-Path -LiteralPath $IsccPath).Path
# Deliberately require a separately assembled payload; never scoop up the private workspace.
$required = @(
    'LICENSE', 'app\index.html', 'app\pixel-rgb-canvas.cjs', 'app\pixel-animation-designs.cjs', 'app\pixel-animation-engine.cjs', 'app\pixel-clock-renderer.cjs', 'app\pixel-animation-catalog.cjs', 'app\pixel-animation-runtime.js', 'app\pixel-output-protocols.cjs', 'app\pixel-output-transports.cjs', 'app\pixel-render-settings.cjs', 'app\pixel-frame-mapping.cjs', 'app\pixel-frame-pipeline.cjs', 'app\pixel-browser-media.cjs', 'app\pixel-browser-playback.cjs', 'app\pixel-browser-output.cjs', 'app\pixel-studio-web-ui.js',
    'app\pixel-studio-web-ui.css', 'app\pixel-studio-web-language.js',
    'app\pixel-studio-web-palettes.js', 'app\pixel-circuit-palette.cjs',
    'app\pixel-headless-renderer.cjs', 'app\pixel-stream-worker.cjs',
    'app\pixel-ddp-bridge.cjs', 'app\openrgb-plugin\pixel-studio-host.cjs',
    'app\openrgb-plugin\dist\PixelStudioSerial.exe',
    'runtime\node.exe', 'runtime\LICENSE', 'plugin\PixelStudioPlugin.dll',
    'desktop\Pixel Studio Desktop.exe', 'desktop\resources\app.asar'
)
foreach ($name in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $payload $name) -PathType Leaf)) {
        throw "Missing payload file: $name"
    }
}
$approvalFile = Join-Path $payload 'release-review.json'
if (-not $TestPackage -and -not (Test-Path -LiteralPath $approvalFile -PathType Leaf)) {
    throw 'Missing release-review.json. Review the release payload before packaging.'
}
if (-not $TestPackage) {
    $review = Get-Content -LiteralPath $approvalFile -Raw | ConvertFrom-Json
    if ($review.version -ne $Version -or $review.privacyReviewed -ne $true -or
        $review.assetsReviewed -ne $true -or $review.matchingBinariesBuilt -ne $true) {
        throw 'Review record must confirm this version, privacy, asset rights and matching binaries.'
    }
}
$output = if ($OutputDirectory) { [IO.Path]::GetFullPath($OutputDirectory) } else { Join-Path $PSScriptRoot 'dist' }
New-Item -ItemType Directory -Path $output -Force | Out-Null
$extra = @()
if ($TestPackage) { $extra += '/DTestPackage=1' }
if ([version]$Version -ge [version]'0.1.11') {
    $pawnIOSetup = & (Join-Path $PSScriptRoot 'Prepare-PawnIO.ps1') -InstallerPath $PawnIOInstallerPath
    $extra += "/DPawnIOSetupPath=$pawnIOSetup"
}
if ($PawnIOMinVersion -ne '') {
    $extra += "/DPawnIOMinVersion=$PawnIOMinVersion"
    $extra += "/DPawnIOMaxVersion=$PawnIOMaxVersion"
}
& $compiler "/DPayloadDir=$payload" "/DAppVersion=$Version" "/DOutputPath=$output" @extra (Join-Path $PSScriptRoot 'PixelStudio.iss')
if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed: $LASTEXITCODE" }
Write-Output "Installer build completed in $output. Nothing was installed or published."
