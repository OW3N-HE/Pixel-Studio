param([ValidateSet('Install','Remove')][string]$Mode = 'Install', [string]$SourceDir = '')
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator approval is required.' }
# A fixed protected location, never the user's selectable application directory.
$programFiles = [Environment]::GetFolderPath('ProgramFiles')
$root = Join-Path $programFiles 'Pixel Studio Sensors'
$exe = Join-Path $root 'PixelStudio.Sensors.exe'
$sc = Join-Path $env:SystemRoot 'System32\sc.exe'
$marker = 'HKLM:\SOFTWARE\PixelStudio\SensorServices'
$ownerPath = [IO.Path]::GetFullPath($PSScriptRoot)
function Run-Sc([string[]]$ScArgs) {
    & $sc @ScArgs | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Service operation failed: $($ScArgs[0]) ($LASTEXITCODE)" }
}
function Assert-ProtectedDirectory([string]$Directory) {
    $item = Get-Item -LiteralPath $Directory
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse points are not allowed in the sensor service location.' }
    $acl = Get-Acl -LiteralPath $Directory
    $owner = $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
    if ($owner -notin @('S-1-5-18','S-1-5-32-544','S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')) { throw 'Sensor service directory has an untrusted owner.' }
    foreach ($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])) {
        # Inherit-only entries do not grant access to the object being checked.
        # Every existing descendant is checked separately below.
        if (($rule.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -ne 0) { continue }
        if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin @('S-1-5-18','S-1-5-32-544','S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464') -and
            ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]'Write,Delete,DeleteSubdirectoriesAndFiles,ChangePermissions,TakeOwnership')) { throw 'Sensor service location is writable by a non-administrator.' }
    }
}
try {
    if ($Mode -eq 'Remove' -and (Get-ItemProperty -LiteralPath $marker -Name InstallerPath -ErrorAction SilentlyContinue).InstallerPath -ne $ownerPath) { exit 0 }
    Assert-ProtectedDirectory $programFiles
    if (Test-Path -LiteralPath $root) {
        Assert-ProtectedDirectory $root
        Get-ChildItem -LiteralPath $root -Recurse -Force | ForEach-Object { Assert-ProtectedDirectory $_.FullName }
    }
    foreach ($channel in @('Desktop','Shared')) {
        $name = 'PixelStudioSensors' + $channel
        $service = Get-CimInstance Win32_Service -Filter "Name='$name'"
        if ($service) {
            if ($service.PathName -ne ('"' + $exe + '" --service ' + $channel)) { throw "Unexpected executable for $name; refusing to modify it." }
            if ($service.State -ne 'Stopped') {
                Stop-Service -Name $name
                (Get-Service -Name $name).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(20))
            }
            if ($Mode -eq 'Remove') { Run-Sc @('delete',$name) }
        }
    }
    if ($Mode -eq 'Remove') {
        if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
        Remove-Item -LiteralPath $marker -ErrorAction SilentlyContinue
        exit 0
    }
    $source = (Resolve-Path -LiteralPath $SourceDir).Path
    if (-not (Test-Path -LiteralPath (Join-Path $source 'PixelStudio.Sensors.exe') -PathType Leaf)) { throw 'Matching sensor payload is missing.' }
    if ($source -eq $root) { throw 'Source and destination must differ.' }
    Get-ChildItem -LiteralPath $source -Recurse -Force | ForEach-Object {
        if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Sensor payload contains a reparse point.' }
    }
    if (-not (Test-Path -LiteralPath $root)) {
        $acl = New-Object Security.AccessControl.DirectorySecurity
        $acl.SetAccessRuleProtection($true,$false)
        $acl.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
        foreach ($sid in @('S-1-5-18','S-1-5-32-544')) {
            $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($sid),'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
        }
        $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-32-545'),'ReadAndExecute','ContainerInherit,ObjectInherit','None','Allow'))
        [IO.Directory]::CreateDirectory($root,$acl) | Out-Null
    }
    Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $root -Recurse -Force
    foreach ($channel in @('Desktop','Shared')) {
        $name = 'PixelStudioSensors' + $channel
        $binaryPath = '"' + $exe + '" --service ' + $channel
        $existing = Get-CimInstance Win32_Service -Filter "Name='$name'"
        if ($existing) {
            if ($existing.PathName -ne $binaryPath) { throw "Unexpected executable for $name; refusing to modify it." }
            $changed = Invoke-CimMethod -InputObject $existing -MethodName Change -Arguments @{
                StartMode = 'Manual'
                StartName = 'LocalSystem'
                DisplayName = 'Pixel Studio Sensors (' + $channel + ')'
            }
            if ($changed.ReturnValue -ne 0) { throw "Service configuration failed for ${name}: $($changed.ReturnValue)" }
        } else {
            # Pass the complete quoted path directly to the service API, not
            # through Windows PowerShell's native-command quoting rules.
            New-Service -Name $name -BinaryPathName $binaryPath -StartupType Manual -DisplayName ('Pixel Studio Sensors (' + $channel + ')') -ErrorAction Stop | Out-Null
        }
        # Local users may query/start, never stop, reconfigure, or replace a service.
        Run-Sc @('sdset',$name,'D:(D;;GA;;;NU)(A;;GA;;;SY)(A;;GA;;;BA)(A;;LCRP;;;BU)')
    }
    New-Item -Path $marker -Force | Out-Null
    New-ItemProperty -LiteralPath $marker -Name InstallerPath -Value $ownerPath -PropertyType String -Force | Out-Null
} catch {
    $failure = $_
    # Keep the full exception even when the installer hides this console.
    # A unique filename avoids overwriting an existing diagnostic file.
    $errorLog = Join-Path ([IO.Path]::GetTempPath()) ('PixelStudio-SensorServices-' + [Guid]::NewGuid().ToString('N') + '.log')
    try {
        $details = @(
            'Pixel Studio sensor service configuration failed'
            ('Time: ' + [DateTime]::Now.ToString('o'))
            ('Mode: ' + $Mode)
            ('Source: ' + $SourceDir)
            ('Destination: ' + $root)
            ($failure | Format-List * -Force | Out-String)
            $failure.ScriptStackTrace
        ) -join [Environment]::NewLine
        $stream = [IO.File]::Open($errorLog,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
        try {
            $bytes = [Text.Encoding]::UTF8.GetBytes($details)
            $stream.Write($bytes,0,$bytes.Length)
        } finally { $stream.Dispose() }
        [Console]::Error.WriteLine('Details: ' + $errorLog)
    } catch { [Console]::Error.WriteLine('Could not write the installation diagnostic log.') }
    [Console]::Error.WriteLine($failure.ToString())
    exit 1
}
