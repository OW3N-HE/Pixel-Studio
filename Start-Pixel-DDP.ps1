$ErrorActionPreference = 'Stop'
try {
    $node = (Get-Command node -ErrorAction Stop).Source
    $entry = Join-Path $PSScriptRoot 'pixel-ddp-bridge.cjs'
    Start-Process -FilePath $node -ArgumentList ('"' + $entry + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    Start-Sleep -Milliseconds 500
    Start-Process 'http://127.0.0.1:8766/'
} catch {
    Write-Host $_.Exception.Message
    Read-Host 'Press Enter to close'
}
