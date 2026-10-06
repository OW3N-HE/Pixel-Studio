param(
    [Parameter(Mandatory = $true)][string]$InstallDir,
    [Parameter(Mandatory = $true)][string]$ReportPath,
    [string]$PluginFile = '',
    [switch]$Purge,
    [switch]$CloseApplications
)
$ErrorActionPreference = 'Stop'

try {
    $root = [IO.Path]::GetFullPath($InstallDir).TrimEnd('\') + '\'
    $owners = @{}
    $starts = @{}
    $scripts = @('app\Start-Pixel-DDP.ps1', 'app\pixel-ddp-bridge.cjs',
                 'app\openrgb-plugin\pixel-studio-host.cjs') |
        ForEach-Object { Join-Path $root $_ }
    $profiles = @('Pixel Studio Desktop', 'pixel-studio-desktop') |
        ForEach-Object { Join-Path $env:APPDATA $_ }
    foreach ($process in Get-CimInstance Win32_Process) {
        $exe = [string]$process.ExecutablePath
        $command = [string]$process.CommandLine
        $owned = $exe.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and
            $process.Name -notmatch '^unins\d+\.exe$'
        foreach ($script in $scripts) {
            if ($command -match ('(?i)(?:^|["\s])' + [regex]::Escape($script) + '(?:["\s]|$)')) {
                $owned = $true
            }
        }
        if ($Purge) {
            foreach ($profile in $profiles) {
                if ($command.IndexOf($profile, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
                    $owned = $true
                }
            }
        }
        if ($owned) {
            $owners[[int]$process.ProcessId] = [string]$process.Name
            $starts[[int]$process.ProcessId] = $process.CreationDate.ToFileTimeUtc()
        }
    }

    # Restart Manager identifies owners of our exact DLL/executable paths,
    # including a plugin loaded by an OpenRGB executable outside InstallDir.
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class PixelStudioUninstallOwners {
    [StructLayout(LayoutKind.Sequential)] public struct UniqueProcess {
        public uint Id;
        public System.Runtime.InteropServices.ComTypes.FILETIME Start;
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct ProcessInfo {
        public UniqueProcess Process;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string AppName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string ServiceName;
        public uint AppType;
        public uint Status;
        public uint Session;
        [MarshalAs(UnmanagedType.Bool)] public bool Restartable;
    }
    [DllImport("rstrtmgr.dll", CharSet = CharSet.Unicode)]
    static extern int RmStartSession(out uint session, uint flags, string key);
    [DllImport("rstrtmgr.dll", CharSet = CharSet.Unicode)]
    static extern int RmRegisterResources(uint session, uint count, string[] files,
        uint appCount, UniqueProcess[] apps, uint serviceCount, string[] services);
    [DllImport("rstrtmgr.dll")]
    static extern int RmGetList(uint session, out uint needed, ref uint count,
        [In, Out] ProcessInfo[] info, ref uint reasons);
    [DllImport("rstrtmgr.dll")] static extern int RmEndSession(uint session);
    [DllImport("rstrtmgr.dll")]
    static extern int RmShutdown(uint session, uint flags, IntPtr callback);
    public static ProcessInfo[] Find(string[] files, uint[] ids, long[] starts, bool close) {
        if (files.Length == 0 && ids.Length == 0) return new ProcessInfo[0];
        uint session;
        int error = RmStartSession(out session, 0, Guid.NewGuid().ToString("N"));
        if (error != 0) throw new InvalidOperationException("Restart Manager start: " + error);
        try {
            var apps = new UniqueProcess[ids.Length];
            for (int i = 0; i < ids.Length; i++) {
                apps[i].Id = ids[i];
                apps[i].Start.dwLowDateTime = unchecked((int)starts[i]);
                apps[i].Start.dwHighDateTime = unchecked((int)(starts[i] >> 32));
            }
            error = RmRegisterResources(session, (uint)files.Length, files,
                (uint)apps.Length, apps, 0, null);
            if (error != 0) throw new InvalidOperationException("Restart Manager register: " + error);
            if (close) {
                // Same Restart Manager force policy as Setup, with explicit UI consent.
                error = RmShutdown(session, 1, IntPtr.Zero);
                if (error != 0) throw new InvalidOperationException("Restart Manager shutdown: " + error);
            }
            uint needed, count = 0, reasons = 0;
            error = RmGetList(session, out needed, ref count, null, ref reasons);
            for (int attempt = 0; error == 234 && attempt < 5; attempt++) {
                count = needed;
                var info = new ProcessInfo[count];
                error = RmGetList(session, out needed, ref count, info, ref reasons);
                if (error == 0) {
                    Array.Resize(ref info, (int)count);
                    return info;
                }
            }
            if (error != 0) throw new InvalidOperationException("Restart Manager list: " + error);
            return new ProcessInfo[0];
        } finally { RmEndSession(session); }
    }
}
'@
    $files = @('desktop\Pixel Studio Desktop.exe', 'desktop\resources\app.asar',
               'runtime\node.exe', 'app\openrgb-plugin\dist\PixelStudioSerial.exe') |
        ForEach-Object { Join-Path $root $_ }
    if ($PluginFile) {
        if ([IO.Path]::GetFileName($PluginFile) -ne 'PixelStudioPlugin.dll' -or
            -not [IO.Path]::IsPathRooted($PluginFile)) {
            throw 'Invalid recorded plugin path.'
        }
        $files += $PluginFile
    }
    $existing = [string[]]@($files | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
    $ids = [uint32[]]@($starts.Keys | Sort-Object)
    $times = [long[]]@($ids | ForEach-Object { $starts[[int]$_] })
    $registered = [PixelStudioUninstallOwners]::Find($existing, $ids, $times, $CloseApplications.IsPresent)
    if ($CloseApplications) { $owners.Clear() }
    foreach ($owner in $registered) {
        $id = [int]$owner.Process.Id
        if (-not $owners.ContainsKey($id)) { $owners[$id] = $owner.AppName }
    }
    if ($owners.Count) {
        $lines = $owners.GetEnumerator() | Sort-Object Key |
            ForEach-Object { "$($_.Value) (PID $($_.Key))" }
        # ASCII keeps Inno Setup's diagnostic reader independent of code pages.
        $lines | Set-Content -LiteralPath $ReportPath -Encoding ASCII
        exit 20
    }
    'No processes are using the registered application resources.' |
        Set-Content -LiteralPath $ReportPath -Encoding ASCII
    exit 0
} catch {
    ("Process check failed: " + $_.Exception.Message) |
        Set-Content -LiteralPath $ReportPath -Encoding ASCII
    exit 30
}
