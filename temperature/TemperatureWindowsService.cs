using System.Diagnostics;
using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.ServiceProcess;
using System.Text;
using System.Text.Json;

// No TCP listener and no command protocol. Connecting only reads a snapshot.
// A fixed sibling executable performs CPU/GPU sampling, never fan control.
internal sealed class TemperatureWindowsService : ServiceBase
{
    private readonly string channel;
    private CancellationTokenSource? stopping;
    private Task? worker;
    private Process? sampler;

    internal TemperatureWindowsService(string channel)
    {
        this.channel = channel;
        ServiceName = "PixelStudioSensors" + channel;
        CanStop = true;
        AutoLog = false;
    }

    protected override void OnStart(string[] args)
    {
        stopping = new CancellationTokenSource();
        worker = Task.Run(() => Serve(stopping.Token));
    }

    protected override void OnStop()
    {
        stopping?.Cancel();
        // Do not wait here: Serve calls Stop itself after its idle timeout.
    }

    private async Task Serve(CancellationToken cancellation)
    {
        try
        {
            var security = new PipeSecurity();
            security.SetAccessRuleProtection(true, false);
            security.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.NetworkSid, null), PipeAccessRights.FullControl, AccessControlType.Deny));
            security.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), PipeAccessRights.FullControl, AccessControlType.Allow));
            security.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null), PipeAccessRights.FullControl, AccessControlType.Allow));
            security.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.BuiltinUsersSid, null), PipeAccessRights.ReadWrite, AccessControlType.Allow));
            using var pipe = NamedPipeServerStreamAcl.Create("PixelStudio.Sensors.v1." + channel,
                PipeDirection.InOut, 1, PipeTransmissionMode.Byte,
                PipeOptions.Asynchronous | PipeOptions.FirstPipeInstance, 256, 65536, security);
            while (!cancellation.IsCancellationRequested)
            {
                using var idle = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
                idle.CancelAfter(TimeSpan.FromSeconds(30));
                await pipe.WaitForConnectionAsync(idle.Token);
                try
                {
                    string snapshot = await ReadSnapshot(cancellation);
                    using var write = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
                    write.CancelAfter(TimeSpan.FromSeconds(2));
                    await pipe.WriteAsync(Encoding.UTF8.GetBytes(snapshot + "\n"), write.Token);
                    await pipe.FlushAsync(write.Token);
                }
                catch (IOException) { }
                catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { }
                finally { if (pipe.IsConnected) pipe.Disconnect(); }
            }
        }
        catch (OperationCanceledException) { }
        catch { ExitCode = 1; }
        finally
        {
            await CloseSampler();
            Stop();
        }
    }

    private async Task<string> ReadSnapshot(CancellationToken cancellation)
    {
        try
        {
            if (sampler == null || sampler.HasExited)
            {
                sampler?.Dispose();
                sampler = Process.Start(new ProcessStartInfo
                {
                    FileName = Path.Combine(AppContext.BaseDirectory, "PixelStudio.Sensors.exe"),
                    WorkingDirectory = AppContext.BaseDirectory,
                    UseShellExecute = false, CreateNoWindow = true,
                    RedirectStandardInput = true, RedirectStandardOutput = true
                }) ?? throw new IOException("Sampler did not start.");
            }
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
            timeout.CancelAfter(TimeSpan.FromSeconds(10));
            await sampler.StandardInput.WriteLineAsync("sample".AsMemory(), timeout.Token);
            string? line = await sampler.StandardOutput.ReadLineAsync(timeout.Token);
            if (line == null || line.Length > 131072) throw new IOException("Invalid sampler response.");
            return line;
        }
        catch
        {
            await CloseSampler();
            return JsonSerializer.Serialize(new { status = "unavailable", sampledAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), cpu = (object?)null, gpu = (object?)null });
        }
    }

    private async Task CloseSampler()
    {
        var owned = sampler;
        sampler = null;
        if (owned == null) return;
        try
        {
            if (!owned.HasExited)
            {
                owned.StandardInput.Close();
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                try { await owned.WaitForExitAsync(timeout.Token); }
                catch (OperationCanceledException) { owned.Kill(); await owned.WaitForExitAsync(); }
            }
        }
        catch { }
        finally { owned.Dispose(); }
    }
}
