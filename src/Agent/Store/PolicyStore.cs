using System.Text.Json;

namespace ConvergasControl.Agent.Store;

public sealed class PolicyCategory
{
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public bool Enabled { get; set; }
    public List<string> Domains { get; set; } = new();
}

public sealed class PolicyConfig
{
    public bool Enabled { get; set; }        // bloqueio atualmente aplicado?
    public bool AutoSchedule { get; set; }   // aplicar automaticamente no expediente?
    public List<PolicyCategory> Categories { get; set; } = new();
}

/// <summary>
/// Config da Política de Acesso (bloqueio web) em JSON. Categorias com domínios; o bloqueio
/// em si é aplicado pelas capacidades policy.applyWebBlock/removeWebBlock. Começa DESLIGADO.
/// </summary>
public sealed class PolicyStore
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private readonly object _lock = new();
    private readonly string _path;
    private PolicyConfig _cfg;

    public PolicyStore()
    {
        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "ConvergasControl", "data");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "policy.json");
        _cfg = Load();
        EnsurePersonalizado();
    }

    // Sempre existe uma categoria "Personalizado" (vazia) para o usuário adicionar sites livres.
    private void EnsurePersonalizado()
    {
        lock (_lock)
        {
            if (_cfg.Categories.Any(c => c.Key == "personalizado")) return;
            _cfg.Categories.Add(new PolicyCategory { Key = "personalizado", Label = "Personalizado", Enabled = true, Domains = new() });
            Save();
        }
    }

    public PolicyConfig Get() { lock (_lock) return _cfg; }

    public List<string> EnabledDomains()
    {
        lock (_lock)
            return _cfg.Categories.Where(c => c.Enabled).SelectMany(c => c.Domains)
                .Select(d => d.Trim().ToLowerInvariant()).Where(d => d.Length > 0)
                .Distinct().ToList();
    }

    /// <summary>Todos os domínios configurados (de todas as categorias) — usado pelo monitoramento.</summary>
    public List<string> AllDomains()
    {
        lock (_lock)
            return _cfg.Categories.SelectMany(c => c.Domains)
                .Select(d => d.Trim().ToLowerInvariant()).Where(d => d.Length > 0)
                .Distinct().ToList();
    }

    public void SetEnabled(bool enabled) { lock (_lock) { _cfg.Enabled = enabled; Save(); } }

    public void SaveCategories(List<PolicyCategory> categories, bool autoSchedule)
    {
        lock (_lock)
        {
            if (categories is { Count: > 0 }) _cfg.Categories = categories;
            _cfg.AutoSchedule = autoSchedule;
            Save();
        }
    }

    private PolicyConfig Load()
    {
        try { if (File.Exists(_path)) return JsonSerializer.Deserialize<PolicyConfig>(File.ReadAllText(_path), Json) ?? Default(); }
        catch { }
        var d = Default();
        try { File.WriteAllText(_path, JsonSerializer.Serialize(d, Json)); } catch { }
        return d;
    }

    private void Save() { try { File.WriteAllText(_path, JsonSerializer.Serialize(_cfg, Json)); } catch { } }

    private static PolicyConfig Default() => new()
    {
        Enabled = false,
        AutoSchedule = false,
        Categories = new()
        {
            new PolicyCategory { Key = "redes-sociais", Label = "Redes sociais", Enabled = true,
                Domains = new() { "instagram.com", "facebook.com", "tiktok.com", "x.com", "twitter.com", "kwai.com" } },
            new PolicyCategory { Key = "video", Label = "Vídeo / streaming", Enabled = true,
                Domains = new() { "youtube.com", "netflix.com", "twitch.tv" } },
            new PolicyCategory { Key = "jogos", Label = "Jogos", Enabled = false,
                Domains = new() { "steampowered.com", "epicgames.com", "roblox.com" } },
        },
    };
}
