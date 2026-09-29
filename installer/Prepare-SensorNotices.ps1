param([Parameter(Mandatory = $true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$assets = Get-Content -LiteralPath (Join-Path $root 'temperature\obj\project.assets.json') -Raw | ConvertFrom-Json
$cache = @($assets.packageFolders.PSObject.Properties.Name)[0]
$output = (Resolve-Path -LiteralPath $OutputDirectory).Path
$notices = Join-Path $output 'third-party'
New-Item -ItemType Directory -Path $notices -Force | Out-Null
Copy-Item -Path (Join-Path $root 'temperature\third-party\*.txt') -Destination $notices
$lines = [Collections.Generic.List[string]]::new()
$lines.Add('# Temperature component: third-party notices')
$lines.Add('')
$lines.Add('Dependencies are used as distributed by their publishers. Their licenses remain unchanged.')
$lines.Add('MPL-covered sources are available at the exact upstream commit links below. No modifications to these libraries are made by Pixel Studio.')
$lines.Add('The inventory includes transitive restore dependencies; platform-specific assets may not be installed on Windows.')
$lines.Add('')
$lines.Add('| Package | Version | License | Copyright | Source / project |')
$lines.Add('| --- | --- | --- | --- | --- |')
foreach ($entry in ($assets.libraries.PSObject.Properties | Sort-Object Name)) {
    if ($entry.Value.type -ne 'package') { continue }
    $directory = Join-Path $cache $entry.Value.path
    $spec = @(Get-ChildItem -LiteralPath $directory -Filter '*.nuspec')
    if ($spec.Count -ne 1) { throw "Missing package metadata: $($entry.Name)" }
    [xml]$xml = Get-Content -LiteralPath $spec[0].FullName -Raw
    $m = $xml.package.metadata
    $license = [string]$m.license.'#text'
    if ($m.license.type -eq 'file') {
        $destination = "$($m.id)-$($m.version)-LICENSE.txt"
        Copy-Item -LiteralPath (Join-Path $directory $license) -Destination (Join-Path $notices $destination)
        $license = $destination
    } elseif ($m.id -eq 'Mono.Posix.NETStandard') {
        $license = 'Mono-LICENSE.txt (MIT and component notices)'
    } elseif ($license -notin @('MIT', 'MPL-2.0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause')) {
        throw "License needs manual handling: $($entry.Name): $license"
    }
    $source = [string]$m.projectUrl
    if ($m.repository.url) {
        $source = [string]$m.repository.url
        if ($m.repository.commit) { $source = $source.TrimEnd('/') + '/tree/' + [string]$m.repository.commit }
    }
    $copyright = ([string]$m.copyright -replace '[\r\n|]', ' ')
    $lines.Add("| $($m.id) | $($m.version) | $license | $copyright | $source |")
}
$config = Get-Content -LiteralPath (Join-Path $output 'PixelStudio.Sensors.runtimeconfig.json') -Raw | ConvertFrom-Json
$framework = @($config.runtimeOptions.includedFrameworks | Where-Object { $_.name -eq 'Microsoft.NETCore.App' })[0]
if (-not $framework.version) { throw 'Missing self-contained runtime version.' }
$runtime = Join-Path $cache ('microsoft.netcore.app.runtime.win-x64/' + $framework.version)
Copy-Item -LiteralPath (Join-Path $runtime 'LICENSE.TXT') -Destination (Join-Path $notices 'dotnet-LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $runtime 'THIRD-PARTY-NOTICES.TXT') -Destination (Join-Path $notices 'dotnet-THIRD-PARTY-NOTICES.txt')
$lines.Add('')
$lines.Add("Self-contained Microsoft.NETCore.App win-x64 runtime: $($framework.version). See dotnet-LICENSE.txt and dotnet-THIRD-PARTY-NOTICES.txt.")
$lines.Add('See LibreHardwareMonitor-LICENSE.txt for its complete upstream notices, MPL-2.0.txt for other MPL dependencies, and HidSharp license text for Apache-2.0 terms.')
$lines.Add('PawnIO 2.2.0 is an optional, separately consented official driver installation. See PawnIO-COPYING.txt and PawnIO-README.txt. Source: https://github.com/namazso/PawnIO/tree/2.2.0 . Official installer: https://github.com/namazso/PawnIO.Setup/releases/tag/2.2.0 . Pixel Studio does not modify that installer.')
$lines.Add('Pixel Studio corresponding source: https://github.com/OW3N-HE/Pixel-Studio/releases . OpenRGB, Electron, Chromium and Node.js notices accompany their respective distribution components.')
[IO.File]::WriteAllLines((Join-Path $notices 'THIRD-PARTY-NOTICES.md'), $lines, [Text.UTF8Encoding]::new($false))
Write-Output 'Sensor dependency notices prepared; no driver was executed.'
