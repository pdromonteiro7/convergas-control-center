using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>probe.systemInfo — edição, versão e build do Windows (equivale ao winver).</summary>
public sealed class SystemInfoCapability : ICapability
{
    public string Id => "probe.systemInfo";

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var data = new Dictionary<string, object?>
        {
            ["edition"] = RuntimeInformation.OSDescription,
            ["version"] = Environment.OSVersion.Version.ToString(),
            ["build"] = Environment.OSVersion.Version.Build,
            ["hostname"] = Environment.MachineName,
            ["uptimeSec"] = Environment.TickCount64 / 1000,
            ["arch"] = RuntimeInformation.OSArchitecture.ToString(),
        };
        return Task.FromResult(CapabilityResult.Success(data));
    }
}

/// <summary>probe.listProcesses — processos em execução com PID e memória (equivale ao tasklist).</summary>
public sealed class ListProcessesCapability : ICapability
{
    public string Id => "probe.listProcesses";

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var filter = ctx.ParamString("filter");
        var top = ctx.Param("top", 50);

        var procs = Process.GetProcesses()
            .Where(p => string.IsNullOrEmpty(filter)
                        || p.ProcessName.Contains(filter, StringComparison.OrdinalIgnoreCase))
            .Select(p =>
            {
                long mem;
                try { mem = p.WorkingSet64; } catch { mem = 0; }
                return (name: p.ProcessName, pid: p.Id, mem);
            })
            .OrderByDescending(x => x.mem)
            .Take(top)
            .Select(x => (object?)new Dictionary<string, object?>
            {
                ["name"] = x.name,
                ["pid"] = x.pid,
                ["memMB"] = x.mem / 1024 / 1024,
            })
            .ToList();

        var data = new Dictionary<string, object?> { ["processes"] = procs, ["total"] = procs.Count };
        return Task.FromResult(CapabilityResult.Success(data));
    }
}

/// <summary>probe.getIpConfig — configuração de rede de todas as interfaces (equivale ao ipconfig /all).</summary>
public sealed class GetIpConfigCapability : ICapability
{
    public string Id => "probe.getIpConfig";

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var ifaces = new List<object?>();
        foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (ni.OperationalStatus != OperationalStatus.Up) continue;
            if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

            var p = ni.GetIPProperties();
            var ipv4 = p.UnicastAddresses
                .FirstOrDefault(u => u.Address.AddressFamily == AddressFamily.InterNetwork);
            if (ipv4 is null) continue;

            bool dhcp = false;
            try { dhcp = p.GetIPv4Properties()?.IsDhcpEnabled ?? false; } catch { }

            ifaces.Add(new Dictionary<string, object?>
            {
                ["name"] = ni.Name,
                ["ipv4"] = ipv4.Address.ToString(),
                ["mask"] = ipv4.IPv4Mask?.ToString(),
                ["gateway"] = p.GatewayAddresses.FirstOrDefault()?.Address.ToString(),
                ["dns"] = p.DnsAddresses.Select(d => d.ToString()).ToList(),
                ["mac"] = ni.GetPhysicalAddress().ToString(),
                ["dhcp"] = dhcp,
            });
        }
        return Task.FromResult(CapabilityResult.Success(
            new Dictionary<string, object?> { ["interfaces"] = ifaces }));
    }
}

/// <summary>probe.healthSnapshot — CPU%, RAM, discos e rede. Base da área "Saúde do PC".</summary>
public sealed class HealthSnapshotCapability : ICapability
{
    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var (cpu, upKbps, downKbps) = await SampleAsync(ct);
        var (usedMb, totalMb) = MemoryInfo();

        var disks = DriveInfo.GetDrives()
            .Where(d => d.IsReady && d.DriveType == DriveType.Fixed)
            .Select(d => (object?)new Dictionary<string, object?>
            {
                ["drive"] = d.Name,
                ["freeGB"] = d.AvailableFreeSpace / 1_000_000_000,
                ["totalGB"] = d.TotalSize / 1_000_000_000,
            })
            .ToList();

        var data = new Dictionary<string, object?>
        {
            ["cpuPct"] = Math.Round(cpu, 1),
            ["ram"] = new Dictionary<string, object?> { ["usedMB"] = usedMb, ["totalMB"] = totalMb },
            ["disks"] = disks,
            ["net"] = new Dictionary<string, object?> { ["upKbps"] = Math.Round(upKbps), ["downKbps"] = Math.Round(downKbps) },
        };
        return CapabilityResult.Success(data);
    }

    public string Id => "probe.healthSnapshot";

    // Amostra CPU e rede na MESMA janela de 500ms.
    // CPU: soma do tempo de processador de todos os processos ÷ (tempo real × núcleos).
    // Rede: delta de bytes das interfaces ativas convertido em kbps. Sem pacote extra.
    private static async Task<(double cpu, double up, double down)> SampleAsync(CancellationToken ct)
    {
        var cpu0 = CpuTotal();
        var (rx0, tx0) = NetTotals();
        var sw = Stopwatch.StartNew();
        await Task.Delay(500, ct);
        var cpu1 = CpuTotal();
        var (rx1, tx1) = NetTotals();
        sw.Stop();

        var secs = Math.Max(0.001, sw.Elapsed.TotalSeconds);
        var used = (cpu1 - cpu0).TotalMilliseconds;
        var avail = sw.Elapsed.TotalMilliseconds * Environment.ProcessorCount;
        var cpu = avail <= 0 ? 0 : Math.Clamp(used / avail * 100.0, 0, 100);
        var down = Math.Max(0, rx1 - rx0) * 8 / 1000.0 / secs;
        var up = Math.Max(0, tx1 - tx0) * 8 / 1000.0 / secs;
        return (cpu, up, down);
    }

    private static TimeSpan CpuTotal()
    {
        var sum = TimeSpan.Zero;
        foreach (var p in Process.GetProcesses())
        {
            try { sum += p.TotalProcessorTime; } catch { }
        }
        return sum;
    }

    private static (long rx, long tx) NetTotals()
    {
        long rx = 0, tx = 0;
        foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (ni.OperationalStatus != OperationalStatus.Up ||
                ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
            try { var s = ni.GetIPv4Statistics(); rx += s.BytesReceived; tx += s.BytesSent; } catch { }
        }
        return (rx, tx);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    private static (long usedMb, long totalMb) MemoryInfo()
    {
        var m = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
        if (!GlobalMemoryStatusEx(ref m)) return (0, 0);
        long total = (long)(m.ullTotalPhys / 1024 / 1024);
        long avail = (long)(m.ullAvailPhys / 1024 / 1024);
        return (total - avail, total);
    }
}
