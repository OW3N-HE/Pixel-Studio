using System.Text.Json;
using System.Security.Principal;
using System.Diagnostics;
using LibreHardwareMonitor.Hardware;

// Private stdio protocol only. No HTTP listener, driver installer, fan control,
// arbitrary commands, file access API, or implicit privilege elevation.
internal static class Program
{
    private sealed record Reading(string Id, string Name, string Sensor, string Brand, float Temperature, long SampledAt);
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private static void Send(object value) => Console.WriteLine(JsonSerializer.Serialize(value, Json));

    private static void Visit(IHardware hardware, string kind, string brand, List<Reading> result)
    {
        hardware.Update();
        long sampledAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        foreach (ISensor sensor in hardware.Sensors)
        {
            if (sensor.SensorType != SensorType.Temperature || !sensor.Value.HasValue) continue;
            float value = sensor.Value.Value;
            if (!float.IsFinite(value) || value < -50 || value > 150) continue;
            result.Add(new Reading(sensor.Identifier.ToString(), hardware.Name, sensor.Name, brand, value, sampledAt));
        }
        foreach (IHardware child in hardware.SubHardware) Visit(child, kind, brand, result);
    }

    private static int Priority(Reading reading, bool cpu)
    {
        string name = reading.Sensor.ToLowerInvariant();
        if (cpu && (name.Contains("package") || name.Contains("tctl/tdie"))) return 0;
        if (!cpu && (name == "gpu core" || name == "gpu temperature")) return 0;
        if (name.Contains("hot spot") || name.Contains("hotspot") || name.Contains("memory")) return 3;
        return 1;
    }

    private static async Task Main(string[] args)
    {
        if (args.Length == 2 && args[0] == "--service" && (args[1] == "Desktop" || args[1] == "Shared"))
        {
            System.ServiceProcess.ServiceBase.Run(new TemperatureWindowsService(args[1]));
            return;
        }
        if (args.Length != 0) return;
        using WindowsIdentity identity = WindowsIdentity.GetCurrent();
        bool elevated = new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
        Computer? computer = null;
        try
        {
            // The owning backend schedules reads independently of UI requests.
            // Reuse one Computer, with no overlapping hardware updates.
            while (true)
            {
                Task<string?> read = Console.In.ReadLineAsync();
                if (await Task.WhenAny(read, Task.Delay(TimeSpan.FromSeconds(30))) != read) break;
                string? command = await read;
                if (command == null || command == "quit") break;
                if (command != "sample") { Send(new { status = "invalid_request" }); continue; }
                Stopwatch duration = Stopwatch.StartNew();
                long attemptedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                List<Reading> cpus = new(), gpus = new();
                List<string> errors = new();
                try
                {
                    if (computer == null)
                    {
                        computer = new Computer { IsCpuEnabled = true, IsGpuEnabled = true };
                        computer.Open();
                    }
                    foreach (IHardware hardware in computer.Hardware)
                    {
                        string type = hardware.HardwareType.ToString();
                        string brand = type.Contains("Nvidia", StringComparison.OrdinalIgnoreCase) ? "nvidia"
                            : type.Contains("Amd", StringComparison.OrdinalIgnoreCase) || hardware.Name.Contains("AMD", StringComparison.OrdinalIgnoreCase) ? "amd"
                            : type.Contains("Intel", StringComparison.OrdinalIgnoreCase) || hardware.Name.Contains("Intel", StringComparison.OrdinalIgnoreCase) ? "intel" : "unknown";
                        try
                        {
                            if (hardware.HardwareType == HardwareType.Cpu) Visit(hardware, "cpu", brand, cpus);
                            else if (type.StartsWith("Gpu", StringComparison.Ordinal)) Visit(hardware, "gpu", brand, gpus);
                        }
                        catch (Exception error)
                        {
                            // A failed device must not discard the other device's reading.
                            errors.Add(type + ": " + error.GetType().Name);
                        }
                    }
                    // This library can return an uninitialized zero for AMD CPU
                    // sensors when driver access is denied. Do not display it as healthy.
                    if (!elevated) cpus.RemoveAll(r => r.Temperature == 0);
                }
                catch (Exception error)
                {
                    errors.Add("Computer: " + error.GetType().Name);
                    try { computer?.Close(); } catch { }
                    computer = null;
                }
                bool cpuUpdated = cpus.Count > 0, gpuUpdated = gpus.Count > 0;
                // Use LHM's current sensor values. Do not invent a separate age limit
                // or restore a value that the hardware adapter explicitly made null.
                Reading? cpu = cpus.OrderBy(r => Priority(r, true)).ThenBy(r => r.Id, StringComparer.Ordinal).FirstOrDefault();
                Reading? gpu = gpus.OrderBy(r => Priority(r, false)).ThenBy(r => r.Id, StringComparer.Ordinal).FirstOrDefault();
                Send(new {
                    status = cpu != null && gpu != null ? "ready" : cpu != null || gpu != null ? "partial" : "unavailable",
                    sampledAt = cpus.Concat(gpus).Select(r => r.SampledAt).DefaultIfEmpty(0).Max(),
                    cpu, gpu, cpuSensors = cpus, gpuSensors = gpus,
                    diagnostics = new {
                        elevated, cpuAvailable = cpu != null, gpuAvailable = gpu != null,
                        cpuUpdated, gpuUpdated, attemptedAt, readDurationMs = duration.ElapsedMilliseconds,
                        samplingErrors = errors
                    }
                });
            }
        }
        finally { try { computer?.Close(); } catch { } }
    }
}
