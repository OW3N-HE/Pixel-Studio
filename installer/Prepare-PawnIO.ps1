param(
    [string]$InstallerPath = ''
)
$ErrorActionPreference = 'Stop'
$expectedHash = '1f519a22e47187f70a1379a48ca604981c4fcf694f4e65b734aaa74a9fba3032'
if (-not $InstallerPath) {
    $directory = Join-Path (Split-Path $PSScriptRoot -Parent) '.tools\pawnio\2.2.0'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $InstallerPath = Join-Path $directory 'PawnIO_setup.exe'
    if (-not (Test-Path -LiteralPath $InstallerPath -PathType Leaf)) {
        $temporary = Join-Path $directory ([guid]::NewGuid().ToString() + '.download.exe')
        try {
            Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/namazso/PawnIO.Setup/releases/download/2.2.0/PawnIO_setup.exe' -OutFile $temporary
            if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
                throw 'Official PawnIO installer SHA-256 mismatch.'
            }
            if ((Get-AuthenticodeSignature -LiteralPath $temporary).Status -ne 'Valid') {
                throw 'Official PawnIO installer signature is not valid.'
            }
            Move-Item -LiteralPath $temporary -Destination $InstallerPath -ErrorAction Stop
        } finally {
            if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
        }
    }
}
$resolved = (Resolve-Path -LiteralPath $InstallerPath).Path
if ((Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
    throw 'PawnIO installer does not match the pinned official 2.2.0 release.'
}
if ((Get-AuthenticodeSignature -LiteralPath $resolved).Status -ne 'Valid') {
    throw 'PawnIO installer signature validation failed; packaging stopped.'
}
# Return only the validated path. Never execute the driver installer here.
Write-Output $resolved
