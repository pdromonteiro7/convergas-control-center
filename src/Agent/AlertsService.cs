using System.Globalization;
using System.Text.Json;
using ConvergasControl.Agent.Capabilities;
using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

public sealed record Alert(string Level, string Category, string Title, string Detail);

/// <summary>
/// Calcula alertas acionáveis a partir dos dados que já temos: certificados/licenças vencendo,
/// antivírus pendente na frota e disco cheio (saúde da máquina). Nada de novo a cadastrar.
/// </summary>
public sealed class AlertsService
{
    private readonly ComputersRepo _computers;
    private readonly EntityRepo _entities;

    public AlertsService(ComputersRepo computers, EntityRepo entities)
    {
        _computers = computers;
        _entities = entities;
    }

    public async Task<IReadOnlyList<Alert>> ComputeAsync()
    {
        var list = new List<Alert>();
        var today = DateTime.Now.Date;

        // Certificados (Qualidade): vencidos ou vencendo em ≤60 dias
        foreach (var row in _entities.List("certificates"))
        {
            var o = Fields(row.Data);
            if (!TryDate(Get(o, "expiryDate"), out var exp)) continue;
            var name = Get(o, "name"); var type = Get(o, "type");
            var days = (exp - today).Days;
            if (days < 0) list.Add(new("danger", "Qualidade", $"Certificado vencido: {name}", $"{type} · venceu em {Fmt(exp)}"));
            else if (days <= 60) list.Add(new("warn", "Qualidade", $"Certificado vence em {days} dia(s): {name}", $"{type} · {Fmt(exp)}"));
        }

        // Licenças: vencidas ou a renovar em ≤30 dias
        foreach (var row in _entities.List("licenses"))
        {
            var o = Fields(row.Data);
            if (!TryDate(Get(o, "renewal"), out var ren)) continue;
            var name = Get(o, "name");
            var days = (ren - today).Days;
            if (days < 0) list.Add(new("danger", "Licenças", $"Licença vencida: {name}", $"renovação era {Fmt(ren)}"));
            else if (days <= 30) list.Add(new("warn", "Licenças", $"Licença renova em {days} dia(s): {name}", Fmt(ren)));
        }

        // Frota: antivírus pendente
        foreach (var c in _computers.List())
        {
            var av = (c.Antivirus ?? "").Trim();
            var low = av.ToLowerInvariant();
            if (av is "" or "—" || low.Contains("instalar") || low.Contains("verificar"))
                list.Add(new("warn", "Frota", $"Antivírus pendente: {c.Name}", av is "" or "—" ? "sem antivírus" : av));
        }

        // Saúde (esta máquina): disco com pouco espaço
        try
        {
            var health = new HealthSnapshotCapability();
            var r = await health.ExecuteAsync(
                new CapabilityContext { Params = new Dictionary<string, object?>(), Progress = NoopProgress.Instance, Elevated = false },
                CancellationToken.None);
            if (r.Data.TryGetValue("disks", out var dv) && dv is IEnumerable<object?> disks)
                foreach (var d in disks)
                    if (d is IReadOnlyDictionary<string, object?> disk)
                    {
                        long free = Convert.ToInt64(disk.GetValueOrDefault("freeGB") ?? 0L);
                        long total = Convert.ToInt64(disk.GetValueOrDefault("totalGB") ?? 1L);
                        var drive = disk.GetValueOrDefault("drive")?.ToString() ?? "";
                        var pct = total > 0 ? (double)free / total : 1;
                        if (pct < 0.10) list.Add(new("danger", "Saúde", $"Disco {drive} quase cheio", $"{free} GB livres de {total} GB"));
                        else if (pct < 0.20) list.Add(new("warn", "Saúde", $"Disco {drive} com pouco espaço", $"{free} GB livres de {total} GB"));
                    }
        }
        catch { }

        var rank = new Dictionary<string, int> { ["danger"] = 0, ["warn"] = 1, ["info"] = 2 };
        return list.OrderBy(a => rank.GetValueOrDefault(a.Level, 3)).ThenBy(a => a.Category).ToList();
    }

    private static Dictionary<string, string> Fields(string json)
    {
        var d = new Dictionary<string, string>(StringComparer.Ordinal);
        try
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var p in doc.RootElement.EnumerateObject())
                if (p.Value.ValueKind == JsonValueKind.String) d[p.Name] = p.Value.GetString() ?? "";
        }
        catch { }
        return d;
    }
    private static string Get(Dictionary<string, string> o, string k) => o.TryGetValue(k, out var v) ? v : "";
    private static bool TryDate(string s, out DateTime d) =>
        DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out d);
    private static string Fmt(DateTime d) => d.ToString("dd/MM/yyyy");
}
