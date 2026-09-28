$ErrorActionPreference = 'Stop'
try {
    $entry = Join-Path $PSScriptRoot 'pixel-ddp-bridge.cjs'
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $rootId = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($PSScriptRoot.ToLowerInvariant())))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
    function Get-Bridge {
        try { return Invoke-RestMethod -Uri 'http://127.0.0.1:8766/health' -TimeoutSec 1 }
        catch { return $null }
    }
    $health = Get-Bridge
    if ($health -and ($health.service -ne 'PixelStudioDDP' -or $health.rootId -ne $rootId)) {
        throw 'A different DDP service is using port 8766. Close that service before starting this version.'
    }
    if (-not $health) {
        $node = $null
        foreach ($candidate in @((Join-Path (Split-Path $PSScriptRoot -Parent) 'runtime\node.exe'), (Join-Path $PSScriptRoot 'runtime\node.exe'))) {
            if (Test-Path -LiteralPath $candidate -PathType Leaf) { $node = $candidate; break }
        }
        if (-not $node) { $command = Get-Command node -ErrorAction SilentlyContinue; if ($command) { $node = $command.Source } }
        if (-not $node) { throw 'Node.js was not found. Use Pixel Studio Desktop for built-in DDP, or install Node.js for the standalone web bridge.' }
        $log = Join-Path $env:TEMP ('PixelStudio-DDP-' + [Guid]::NewGuid().ToString('N'))
        $child = Start-Process -FilePath $node -ArgumentList ('"' + $entry + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput ($log + '.log') -RedirectStandardError ($log + '.err.log')
        $deadline = [DateTime]::UtcNow.AddSeconds(12)
        do {
            $health = Get-Bridge
            if ($health -and $health.service -eq 'PixelStudioDDP' -and $health.rootId -eq $rootId) { break }
            if ($child.HasExited) { throw ('DDP service exited. See ' + $log + '.err.log (port 8766 may be occupied).') }
            Start-Sleep -Milliseconds 250
        } while ([DateTime]::UtcNow -lt $deadline)
        if (-not $health -or $health.service -ne 'PixelStudioDDP' -or $health.rootId -ne $rootId) {
            if (-not $child.HasExited) { $child.Kill() }
            throw ('DDP service did not become ready. See ' + $log + '.err.log')
        }
    }
    Start-Process 'http://127.0.0.1:8766/'
} catch {
    $message = $_.Exception.Message
    try {
        $popup = New-Object -ComObject WScript.Shell
        $null = $popup.Popup($message, 0, 'Pixel Studio Web', 16)
    } catch { Write-Error $message }
}
