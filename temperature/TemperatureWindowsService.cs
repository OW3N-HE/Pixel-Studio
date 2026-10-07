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
                    await SendSnapshotAsync(pipe, snapshot, cancellation);
                }
                catch (IOException) { }
                catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { }
                // ReadAsync marks a client-closed pipe as broken. It still
                // needs Disconnect to reset this instance before the next client.
                finally { pipe.Disconnect(); }
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

    private static async Task SendSnapshotAsync(PipeStream pipe, string snapshot, CancellationToken cancellation)
    {
        using var delivery = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
        delivery.CancelAfter(TimeSpan.FromSeconds(2));
        await pipe.WriteAsync(Encoding.UTF8.GetBytes(snapshot + "\n"), delivery.Token);
        // PipeStream.FlushAsync does not wait for the reader. The existing
        // client closes only after consuming its complete JSON line; wait for
        // that close before Disconnect can discard unread bytes. This also
        // works with older clients and has a bounded, cancellable wait.
        int input = await pipe.ReadAsync(new byte[1], delivery.Token);
        if (input != 0) throw new IOException("Temperature clients must close after reading.");
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
        catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { throw; }
        catch (Exception error)
        {
            await CloseSampler();
            string code = error is OperationCanceledException ? "SAMPLER_TIMEOUT"
                : error is IOException ? "SAMPLER_RESPONSE_FAILED" : "SAMPLER_FAILED";
            return JsonSerializer.Serialize(new {
                status = "unavailable", sampledAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                cpu = (object?)null, gpu = (object?)null,
                diagnostics = new { samplingErrors = new[] { code + ": " + error.GetType().Name } }
            });
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
