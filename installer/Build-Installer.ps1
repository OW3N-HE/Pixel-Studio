param(
    [Parameter(Mandatory = $true)][string]$PayloadDir,
    [Parameter(Mandatory = $true)][string]$IsccPath,
    [string]$Version = '0.1.8',
    [switch]$TestPackage
)
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
    throw 'Version must be a stable three-part version.'
}
$payload = (Resolve-Path -LiteralPath $PayloadDir).Path
$compiler = (Resolve-Path -LiteralPath $IsccPath).Path
# Deliberately require a separately assembled payload; never scoop up the private workspace.
$required = @(
    'LICENSE', 'app\index.html', 'app\pixel-studio-web-ui.js',
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
$output = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$extra = @()
if ($TestPackage) { $extra += '/DTestPackage=1' }
& $compiler "/DPayloadDir=$payload" "/DAppVersion=$Version" "/DOutputPath=$output" @extra (Join-Path $PSScriptRoot 'PixelStudio.iss')
if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed: $LASTEXITCODE" }
Write-Output "Installer build completed in $output. Nothing was installed or published."
