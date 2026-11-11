using System.Text;
using Microsoft.Win32;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>Helpers compartilhados do bloqueio web (registro de navegador + hosts).</summary>
internal static class WebBlock
{
    public const string HostsBegin = "# ConvergasControl BEGIN (bloqueio de acesso)";
    public const string HostsEnd = "# ConvergasControl END";
    public static readonly string[] Browsers = { @"SOFTWARE\Policies\Google\Chrome", @"SOFTWARE\Policies\Microsoft\Edge" };

    public static string HostsPath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "drivers", "etc", "hosts");

    public static string StripSection(string text)
    {
        var b = text.IndexOf(HostsBegin, StringComparison.Ordinal);
        if (b < 0) return text;
        var e = text.IndexOf(HostsEnd, StringComparison.Ordinal);
        return e < 0 ? text[..b] : (text[..b] + text[(e + HostsEnd.Length)..]);
    }

    /// <summary>Limpa o cache DNS para o efeito (des)bloqueio valer imediatamente no lado do hosts.</summary>
    public static Task FlushDnsAsync(CapabilityContext ctx, CancellationToken ct) =>
        ProcessRunner.RunAsync(ProcessRunner.System32("ipconfig.exe"), "/flushdns", ctx.Progress, ct, timeout: TimeSpan.FromSeconds(15));
}

/// <summary>
/// policy.applyWebBlock — bloqueia domínios SEM filtro de rede/DNS: grava URLBlocklist do
/// Chrome/Edge, mapeia no hosts (→127.0.0.1) e DESLIGA o DoH (senão o navegador fura o hosts).
/// Admin. Param: domains (CSV).
/// </summary>
public sealed class ApplyWebBlockCapability : ICapability
{
    public string Id => "policy.applyWebBlock";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);

        var domains = (ctx.ParamString("domains") ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (domains.Length == 0) return CapabilityResult.Failure(CommonErrors.Unexpected);

        try
        {
            foreach (var b in WebBlock.Browsers) WriteBrowser(b, domains);
            WriteHosts(domains);
            await WebBlock.FlushDnsAsync(ctx, ct);
            return CapabilityResult.Success(new Dictionary<string, object?> { ["blocked"] = domains.Length });
        }
        catch
        {
            return CapabilityResult.Failure(CommonErrors.Unexpected);
        }
    }

    private static void WriteBrowser(string basePath, string[] domains)
    {
        using (var bl = Registry.LocalMachine.CreateSubKey(basePath + @"\URLBlocklist"))
        {
            foreach (var n in bl.GetValueNames()) bl.DeleteValue(n, false);
            for (var i = 0; i < domains.Length; i++) bl.SetValue((i + 1).ToString(), domains[i]);
        }
        using var pol = Registry.LocalMachine.CreateSubKey(basePath);
        pol.SetValue("DnsOverHttpsMode", "off", RegistryValueKind.String); // impede o navegador de furar o hosts
    }

    private static void WriteHosts(string[] domains)
    {
        var path = WebBlock.HostsPath;
        var text = File.Exists(path) ? File.ReadAllText(path) : "";
        var sb = new StringBuilder(WebBlock.StripSection(text).TrimEnd());
        sb.AppendLine(); sb.AppendLine(WebBlock.HostsBegin);
        foreach (var d in domains) { sb.AppendLine($"127.0.0.1 {d}"); sb.AppendLine($"127.0.0.1 www.{d}"); }
        sb.AppendLine(WebBlock.HostsEnd);
        File.WriteAllText(path, sb.ToString());
    }
}

/// <summary>policy.removeWebBlock — remove o bloqueio (limpa URLBlocklist, DoH e a seção do hosts). Admin.</summary>
public sealed class RemoveWebBlockCapability : ICapability
{
    public string Id => "policy.removeWebBlock";

    public async Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        if (!ctx.Elevated) return CapabilityResult.Failure(CommonErrors.Denied);
        try
        {
            foreach (var b in WebBlock.Browsers)
            {
                using var pol = Registry.LocalMachine.OpenSubKey(b, writable: true);
                if (pol is null) continue;
                try { pol.DeleteSubKeyTree("URLBlocklist", false); } catch { }
                pol.DeleteValue("DnsOverHttpsMode", false);
            }

            var path = WebBlock.HostsPath;
            if (File.Exists(path))
                File.WriteAllText(path, WebBlock.StripSection(File.ReadAllText(path)).TrimEnd() + Environment.NewLine);

            await WebBlock.FlushDnsAsync(ctx, ct);
            return CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true });
        }
        catch
        {
            return CapabilityResult.Failure(CommonErrors.Unexpected);
        }
    }
}
