using System.Text.RegularExpressions;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>system.sfcScan — verifica/repara arquivos protegidos do Windows. Admin, longo.</summary>
public sealed class SfcScanCapability : ICapability
{
    public string Id => "system.sfcScan";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);

        ctx.Progress.Stage(-1, "Verificando a integridade do sistema (SFC)…");
        var r = await ProcessRunner.RunAsync(
            ProcessRunner.System32("sfc.exe"), "/scannow", ctx.Progress, ct,
            timeout: TimeSpan.FromMinutes(30));

        // sfc escreve em Unicode; ao redirecionar podem sobrar '\0' — limpamos antes de parsear.
        var o = r.Output.Replace("\0", "").ToLowerInvariant();
        string result =
            o.Contains("did not find any integrity") || o.Contains("não encontrou nenhuma violação") ? "healthy"
            : o.Contains("successfully repaired") || o.Contains("reparou") ? "repaired"
            : o.Contains("unable to fix") || o.Contains("não foi possível corrigir") ? "unrepairable"
            : r.ExitCode == 0 ? "healthy" : "unrepairable";

        return result == "unrepairable"
            ? CapabilityResult.Failure("system.sfcUnrepairable")
            : CapabilityResult.Success(new Dictionary<string, object?> { ["result"] = result });
    }
}

/// <summary>system.dismRestoreHealth — repara a imagem de componentes do Windows. Admin, longo, internet.</summary>
public sealed class DismRestoreHealthCapability : ICapability
{
    public string Id => "system.dismRestoreHealth";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);

        ctx.Progress.Stage(-1, "Reparando a imagem do Windows (DISM)…");
        var r = await ProcessRunner.RunAsync(
            ProcessRunner.System32("dism.exe"), "/Online /Cleanup-Image /RestoreHealth",
            ctx.Progress, ct, timeout: TimeSpan.FromMinutes(30));

        var o = r.Output.Replace("\0", "").ToLowerInvariant();
        if (o.Contains("0x800f0906") || o.Contains("could not connect") || o.Contains("source files could not be"))
            return CapabilityResult.Failure("system.noInternet");

        return r.ExitCode == 0
            ? CapabilityResult.Success(new Dictionary<string, object?> { ["result"] = "ok" })
            : CapabilityResult.Failure("system.dismFailed");
    }
}

/// <summary>system.chkdsk — verifica disco; se o volume está em uso, agenda no próximo boot. Admin.</summary>
public sealed class ChkdskCapability : ICapability
{
    public string Id => "system.chkdsk";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);

        var drive = ctx.ParamString("drive") ?? "C:";
        if (!Regex.IsMatch(drive, "^[A-Za-z]:$")) return CapabilityResult.Failure(CommonErrors.Unexpected);

        var fix = ctx.Param("fix", true);
        var scan = ctx.Param("scanSectors", true);
        var args = drive + (fix ? " /f" : "") + (scan ? " /r" : "");

        ctx.Progress.Stage(-1, $"Verificando o disco {drive}…");
        // volume em uso → chkdsk pergunta se deseja agendar no boot; respondemos "S/Y".
        var r = await ProcessRunner.RunAsync(
            ProcessRunner.System32("chkdsk.exe"), args, ctx.Progress, ct,
            standardInput: "Y\n", timeout: TimeSpan.FromMinutes(10));

        var o = r.Output.Replace("\0", "").ToLowerInvariant();
        bool scheduled = o.Contains("schedule") || o.Contains("next time") || o.Contains("restart")
                         || o.Contains("agendad") || o.Contains("reiniciar");

        if (scheduled)
            return CapabilityResult.Success(new Dictionary<string, object?> { ["result"] = "scheduledOnReboot" });
        if (r.ExitCode == 0)
            return CapabilityResult.Success(new Dictionary<string, object?> { ["result"] = "completed" });
        return CapabilityResult.Failure("system.chkdskFailed");
    }
}

/// <summary>system.rebootPrompt — sinaliza que um reinício é necessário (a confirmação é na UI).</summary>
public sealed class RebootPromptCapability : ICapability
{
    public string Id => "system.rebootPrompt";

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var reason = ctx.ParamString("reason") ?? "Concluir a operação";
        ctx.Progress.Stage(100, $"Reinício recomendado: {reason}");
        // O serviço roda em sessão 0 (sem UI); quem pergunta ao usuário é o app desktop.
        return Task.FromResult(CapabilityResult.Success(
            new Dictionary<string, object?> { ["accepted"] = false }, rebootRequired: true));
    }
}
