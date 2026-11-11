using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>system.screenshot — captura a tela primária para um arquivo (suporte). Sessão 0 vê tela preta.</summary>
public sealed class ScreenshotCapability : ICapability
{
    public string Id => "system.screenshot";

    [DllImport("user32.dll")] private static extern int GetSystemMetrics(int nIndex);

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        try
        {
            int w = GetSystemMetrics(0), h = GetSystemMetrics(1); // SM_CXSCREEN / SM_CYSCREEN
            if (w <= 0 || h <= 0) return Task.FromResult(CapabilityResult.Failure(CommonErrors.Unexpected));

            using var bmp = new Bitmap(w, h);
            using (var g = Graphics.FromImage(bmp)) g.CopyFromScreen(0, 0, 0, 0, new Size(w, h));

            var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "ConvergasControl", "screenshots");
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, $"screenshot-{DateTime.Now:yyyyMMdd-HHmmss}.jpg");
            bmp.Save(path, ImageFormat.Jpeg);

            return Task.FromResult(CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true, ["path"] = path, ["size"] = $"{w}x{h}" }));
        }
        catch { return Task.FromResult(CapabilityResult.Failure(CommonErrors.Unexpected)); }
    }
}

/// <summary>system.lock — bloqueia a estação (tela de login).</summary>
public sealed class LockWorkstationCapability : ICapability
{
    public string Id => "system.lock";
    [DllImport("user32.dll", SetLastError = true)] private static extern bool LockWorkStation();

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var ok = LockWorkStation();
        return Task.FromResult(ok
            ? CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true })
            : CapabilityResult.Failure(CommonErrors.Unexpected));
    }
}

/// <summary>system.restart — reinicia o Windows com 60s de aviso (cancelável por "shutdown /a"). Admin.</summary>
public sealed class RestartCapability : ICapability
{
    public string Id => "system.restart";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);
        ctx.Progress.Stage(-1, "Agendando reinício em 60s…");
        var r = await ProcessRunner.RunAsync(ProcessRunner.System32("shutdown.exe"),
            "/r /t 60 /c \"Reinício solicitado pela TI (ConvergasControl). Salve seu trabalho.\"",
            ctx.Progress, ct, timeout: TimeSpan.FromSeconds(15));
        return r.ExitCode == 0
            ? CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true, ["inSeconds"] = 60 }, rebootRequired: true)
            : CapabilityResult.Failure(CommonErrors.Unexpected);
    }
}

/// <summary>system.shutdown — desliga o Windows com 60s de aviso (cancelável por "shutdown /a"). Admin.</summary>
public sealed class ShutdownCapability : ICapability
{
    public string Id => "system.shutdown";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);
        ctx.Progress.Stage(-1, "Agendando desligamento em 60s…");
        var r = await ProcessRunner.RunAsync(ProcessRunner.System32("shutdown.exe"),
            "/s /t 60 /c \"Desligamento solicitado pela TI (ConvergasControl). Salve seu trabalho.\"",
            ctx.Progress, ct, timeout: TimeSpan.FromSeconds(15));
        return r.ExitCode == 0
            ? CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true, ["inSeconds"] = 60 })
            : CapabilityResult.Failure(CommonErrors.Unexpected);
    }
}

/// <summary>remote.getRustDeskId — devolve o ID do RustDesk (acesso remoto), se instalado.</summary>
public sealed class RustDeskIdCapability : ICapability
{
    public string Id => "remote.getRustDeskId";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        var exe = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "RustDesk", "rustdesk.exe");
        if (!File.Exists(exe)) return CapabilityResult.Failure("remote.notInstalled");

        ctx.Progress.Stage(-1, "Consultando ID do RustDesk…");
        var r = await ProcessRunner.RunAsync(exe, "--get-id", ctx.Progress, ct, timeout: TimeSpan.FromSeconds(15));
        var id = (r.Output ?? "").Replace("\0", "").Trim();
        return string.IsNullOrWhiteSpace(id)
            ? CapabilityResult.Failure(CommonErrors.Unexpected)
            : CapabilityResult.Success(new Dictionary<string, object?> { ["installed"] = true, ["id"] = id });
    }
}
