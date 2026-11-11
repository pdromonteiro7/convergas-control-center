using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>network.flushDns — limpa o cache de resolução DNS.</summary>
public sealed class FlushDnsCapability : ICapability
{
    public string Id => "network.flushDns";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        ctx.Progress.Stage(-1, "Limpando cache DNS…");
        var r = await ProcessRunner.RunAsync(
            ProcessRunner.System32("ipconfig.exe"), "/flushdns", ctx.Progress, ct,
            timeout: TimeSpan.FromSeconds(30));

        return r.ExitCode == 0
            ? CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true })
            : CapabilityResult.Failure("network.flushFailed");
    }
}

/// <summary>network.renewIp — libera e renova o IP via DHCP.</summary>
public sealed class RenewIpCapability : ICapability
{
    public string Id => "network.renewIp";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        ctx.Progress.Stage(20, "Liberando IP atual…");
        await ProcessRunner.RunAsync(ProcessRunner.System32("ipconfig.exe"), "/release",
            ctx.Progress, ct, timeout: TimeSpan.FromSeconds(60));

        ctx.Progress.Stage(60, "Solicitando novo IP…");
        var ren = await ProcessRunner.RunAsync(ProcessRunner.System32("ipconfig.exe"), "/renew",
            ctx.Progress, ct, timeout: TimeSpan.FromSeconds(60));

        if (ren.ExitCode != 0) return CapabilityResult.Failure("network.renewFailed");

        var newIp = NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up
                        && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .FirstOrDefault(u => u.Address.AddressFamily == AddressFamily.InterNetwork)
            ?.Address.ToString();

        return CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true, ["newIp"] = newIp });
    }
}

/// <summary>network.winsockReset — restaura a pilha Winsock. Admin. Exige reinício.</summary>
public sealed class WinsockResetCapability : ICapability
{
    public string Id => "network.winsockReset";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);

        ctx.Progress.Stage(-1, "Restaurando a pilha de rede (Winsock)…");
        var r = await ProcessRunner.RunAsync(
            ProcessRunner.System32("netsh.exe"), "winsock reset", ctx.Progress, ct,
            timeout: TimeSpan.FromSeconds(60));

        return r.ExitCode == 0
            ? CapabilityResult.Success(
                new Dictionary<string, object?> { ["ok"] = true, ["rebootRequired"] = true },
                rebootRequired: true)
            : CapabilityResult.Failure("network.resetFailed");
    }
}

/// <summary>network.ping — N pacotes finitos com estatística (não é o ping -t contínuo).</summary>
public sealed class PingCapability : ICapability
{
    public string Id => "network.ping";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var target = ctx.ParamString("target") ?? "8.8.8.8";
        var count = ctx.Param("count", 4);

        using var ping = new Ping();
        int sent = 0, recv = 0;
        var times = new List<long>();

        for (int i = 0; i < count; i++)
        {
            ct.ThrowIfCancellationRequested();
            sent++;
            try
            {
                var reply = await ping.SendPingAsync(target, 4000);
                if (reply.Status == IPStatus.Success)
                {
                    recv++;
                    times.Add(reply.RoundtripTime);
                    ctx.Progress.Stage((i + 1) * 100 / count, $"Resposta de {target}: {reply.RoundtripTime} ms");
                }
                else
                {
                    ctx.Progress.Stage((i + 1) * 100 / count, $"Sem resposta ({reply.Status})");
                }
            }
            catch (PingException)
            {
                return CapabilityResult.Failure("network.dnsFail");
            }

            if (i < count - 1) await Task.Delay(500, ct);
        }

        if (recv == 0) return CapabilityResult.Failure("network.unreachable");

        var data = new Dictionary<string, object?>
        {
            ["sent"] = sent,
            ["received"] = recv,
            ["lostPct"] = (sent - recv) * 100 / sent,
            ["minMs"] = times.Min(),
            ["avgMs"] = (long)times.Average(),
            ["maxMs"] = times.Max(),
        };
        return CapabilityResult.Success(data);
    }
}
