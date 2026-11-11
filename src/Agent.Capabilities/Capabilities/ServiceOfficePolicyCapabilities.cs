using System.ServiceProcess;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>service.restart — reinicia um serviço da WHITELIST (nunca nome arbitrário). Admin.</summary>
public sealed class ServiceRestartCapability : ICapability
{
    // Defesa em profundidade: além do enum no registry, a whitelist também vive no código.
    private static readonly HashSet<string> Whitelist = new(StringComparer.OrdinalIgnoreCase) { "Spooler" };

    public string Id => "service.restart";

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return Task.FromResult(CapabilityResult.Failure(CommonErrors.Denied));

        var name = ctx.ParamString("serviceName") ?? "";
        if (!Whitelist.Contains(name))
            return Task.FromResult(CapabilityResult.Failure("service.notWhitelisted"));

        try
        {
            using var sc = new ServiceController(name);
            ctx.Progress.Stage(30, $"Parando {name}…");
            if (sc.Status != ServiceControllerStatus.Stopped)
            {
                sc.Stop();
                sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(30));
            }

            ctx.Progress.Stage(70, $"Iniciando {name}…");
            sc.Start();
            sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30));

            return Task.FromResult(CapabilityResult.Success(
                new Dictionary<string, object?> { ["ok"] = true, ["state"] = "running" }));
        }
        catch
        {
            return Task.FromResult(CapabilityResult.Failure("service.restartFailed"));
        }
    }
}

/// <summary>office.repair — repara o Microsoft 365 (quick/online) via OfficeC2RClient.</summary>
public sealed class OfficeRepairCapability : ICapability
{
    public string Id => "office.repair";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var mode = ctx.ParamString("mode") ?? "quick";
        var exe = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonProgramFiles),
            "microsoft shared", "ClickToRun", "OfficeC2RClient.exe");

        if (!File.Exists(exe)) return CapabilityResult.Failure("office.notInstalled");

        var repairType = mode == "online" ? "FullRepair" : "QuickRepair";
        ctx.Progress.Stage(-1, $"Reparando o Office ({mode})…");

        var r = await ProcessRunner.RunAsync(
            exe, $"scenario=Repair DisplayLevel=True RepairType={repairType}", ctx.Progress, ct,
            timeout: TimeSpan.FromMinutes(20));

        return r.ExitCode == 0
            ? CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true })
            : CapabilityResult.Failure("office.repairFailed");
    }
}

/// <summary>policy.gpUpdate — força a aplicação das políticas de grupo/domínio.</summary>
public sealed class GpUpdateCapability : ICapability
{
    public string Id => "policy.gpUpdate";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var force = ctx.Param("force", true);
        ctx.Progress.Stage(-1, "Aplicando as políticas de grupo…");

        var r = await ProcessRunner.RunAsync(
            ProcessRunner.System32("gpupdate.exe"), force ? "/force" : "", ctx.Progress, ct,
            timeout: TimeSpan.FromMinutes(5));

        var o = r.Output.Replace("\0", "").ToLowerInvariant();
        var data = new Dictionary<string, object?>
        {
            ["ok"] = r.ExitCode == 0,
            ["logoffRequired"] = o.Contains("logoff") || o.Contains("log off") || o.Contains("logon"),
            ["rebootRequired"] = o.Contains("restart") || o.Contains("reboot") || o.Contains("reiniciar"),
        };

        return r.ExitCode == 0
            ? CapabilityResult.Success(data)
            : CapabilityResult.Failure("policy.updateFailed");
    }
}
