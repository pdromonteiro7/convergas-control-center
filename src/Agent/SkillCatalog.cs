using System.Text.Json;
using ConvergasControl.Agent.Capabilities;

namespace ConvergasControl.Agent;

/// <summary>Um passo do manifesto, já com params normalizados pelo registry.</summary>
public sealed record SkillStepDef(string Capability, IReadOnlyDictionary<string, object?> Params);

/// <summary>Manifesto de Skill carregado e validado (espelha skills/*.json).</summary>
public sealed class SkillManifest
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Category { get; init; }
    public required string Icon { get; init; }
    public required string Description { get; init; }
    public required bool RequiresAdmin { get; init; }
    public required int EstimatedSeconds { get; init; }
    public required IReadOnlyList<SkillStepDef> Steps { get; init; }
    public required string Expected { get; init; }
    public required IReadOnlyDictionary<string, string> OnError { get; init; }

    public string ErrorMessage(string? code) =>
        (code is not null && OnError.TryGetValue(code, out var m)) ? m
        : OnError.TryGetValue("default", out var d) ? d
        : "Falha ao executar a ação.";
}

/// <summary>
/// Carrega os manifestos de skills/ e VALIDA cada um contra o capability-registry na subida.
/// Skills inválidas (capacidade inexistente, param fora de tipo/whitelist) são recusadas e
/// registradas no log — nunca chegam a ser executadas.
/// </summary>
public sealed class SkillCatalog
{
    private readonly Dictionary<string, SkillManifest> _skills;
    public IReadOnlyCollection<SkillManifest> Skills => _skills.Values;
    public SkillManifest? Find(string id) => _skills.GetValueOrDefault(id);

    private SkillCatalog(Dictionary<string, SkillManifest> skills) => _skills = skills;

    public static SkillCatalog Load(string dir, CapabilityRegistry registry, ILogger log)
    {
        var loaded = new Dictionary<string, SkillManifest>(StringComparer.Ordinal);

        if (!Directory.Exists(dir))
        {
            log.LogWarning("Pasta de skills não encontrada: {Dir}", dir);
            return new SkillCatalog(loaded);
        }

        foreach (var file in Directory.EnumerateFiles(dir, "*.json"))
        {
            try
            {
                var skill = ParseAndValidate(file, registry, log);
                if (skill is not null) loaded[skill.Id] = skill;
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Falha ao carregar skill {File}", Path.GetFileName(file));
            }
        }

        log.LogInformation("Skills carregadas: {Count}", loaded.Count);
        return new SkillCatalog(loaded);
    }

    private static SkillManifest? ParseAndValidate(string file, CapabilityRegistry registry, ILogger log)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(file));
        var r = doc.RootElement;

        var steps = new List<SkillStepDef>();
        foreach (var s in r.GetProperty("steps").EnumerateArray())
        {
            var cap = s.GetProperty("capability").GetString()!;
            var raw = new Dictionary<string, object?>(StringComparer.Ordinal);
            if (s.TryGetProperty("params", out var p) && p.ValueKind == JsonValueKind.Object)
                foreach (var kv in p.EnumerateObject())
                    raw[kv.Name] = Unwrap(kv.Value);

            var v = registry.ValidateAndNormalize(cap, raw);
            if (!v.Ok)
            {
                log.LogError("Skill {File} rejeitada: {Error}", Path.GetFileName(file), v.Error);
                return null;
            }
            steps.Add(new SkillStepDef(cap, v.Params));
        }

        var onError = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kv in r.GetProperty("onError").EnumerateObject())
            onError[kv.Name] = kv.Value.GetString() ?? "";

        return new SkillManifest
        {
            Id = r.GetProperty("id").GetString()!,
            Name = r.GetProperty("name").GetString()!,
            Category = r.GetProperty("category").GetString()!,
            Icon = r.GetProperty("icon").GetString()!,
            Description = r.GetProperty("description").GetString()!,
            RequiresAdmin = r.GetProperty("requiresAdmin").GetBoolean(),
            EstimatedSeconds = r.GetProperty("estimatedSeconds").GetInt32(),
            Steps = steps,
            Expected = r.GetProperty("expected").GetString()!,
            OnError = onError,
        };
    }

    private static object? Unwrap(JsonElement e) => e.ValueKind switch
    {
        JsonValueKind.String => e.GetString(),
        JsonValueKind.Number => e.TryGetInt32(out var i) ? i : e.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        _ => null,
    };
}
