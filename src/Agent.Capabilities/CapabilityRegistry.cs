using System.Reflection;
using System.Text.Json;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>
/// Carrega o capability-registry.json (embutido) e valida/normaliza params em runtime.
/// É a guarda executada ANTES de qualquer capacidade tocar o Windows: tipos, obrigatórios,
/// whitelists (enum) e params desconhecidos. Espelha o validador de Skills (Fase 1) em C#.
/// </summary>
public sealed class CapabilityRegistry
{
    public sealed record ParamSpec(string Type, bool Required, object? Default, IReadOnlyList<object?>? Enum);

    public sealed record CapabilitySpec(
        string Id, string Category, bool Read, bool RequiresAdmin, bool LongRunning,
        IReadOnlyDictionary<string, ParamSpec> Params,
        IReadOnlyList<string> ErrorCodes);

    private readonly Dictionary<string, CapabilitySpec> _caps;
    public int Version { get; }

    private CapabilityRegistry(int version, Dictionary<string, CapabilitySpec> caps)
    {
        Version = version;
        _caps = caps;
    }

    public IReadOnlyDictionary<string, CapabilitySpec> Capabilities => _caps;
    public bool TryGet(string id, out CapabilitySpec spec) => _caps.TryGetValue(id, out spec!);

    /// <summary>Carrega do recurso embutido "capability-registry.json".</summary>
    public static CapabilityRegistry Load()
    {
        var asm = Assembly.GetExecutingAssembly();
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("capability-registry.json", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("capability-registry.json não embutido no assembly.");
        using var stream = asm.GetManifestResourceStream(name)!;
        return Parse(stream);
    }

    public static CapabilityRegistry Parse(Stream json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var version = root.TryGetProperty("version", out var v) ? v.GetInt32() : 0;
        var caps = new Dictionary<string, CapabilitySpec>(StringComparer.Ordinal);

        foreach (var c in root.GetProperty("capabilities").EnumerateObject())
        {
            var e = c.Value;
            var pars = new Dictionary<string, ParamSpec>(StringComparer.Ordinal);
            if (e.TryGetProperty("params", out var pElem))
                foreach (var p in pElem.EnumerateObject())
                {
                    var pd = p.Value;
                    pars[p.Name] = new ParamSpec(
                        Type: pd.GetProperty("type").GetString()!,
                        Required: pd.TryGetProperty("required", out var r) && r.GetBoolean(),
                        Default: pd.TryGetProperty("default", out var d) ? Unwrap(d) : null,
                        Enum: pd.TryGetProperty("enum", out var en)
                            ? en.EnumerateArray().Select(Unwrap).ToList()
                            : null);
                }

            var errs = e.TryGetProperty("errorCodes", out var ec)
                ? ec.EnumerateArray().Select(x => x.GetString()!).ToList()
                : new List<string>();

            caps[c.Name] = new CapabilitySpec(
                Id: c.Name,
                Category: e.GetProperty("category").GetString()!,
                Read: e.TryGetProperty("read", out var rd) && rd.GetBoolean(),
                RequiresAdmin: e.TryGetProperty("requiresAdmin", out var ra) && ra.GetBoolean(),
                LongRunning: e.TryGetProperty("longRunning", out var lr) && lr.GetBoolean(),
                Params: pars,
                ErrorCodes: errs);
        }

        return new CapabilityRegistry(version, caps);
    }

    public sealed record Validation(bool Ok, string? Error, IReadOnlyDictionary<string, object?> Params);

    /// <summary>
    /// Valida os params de um passo contra a capacidade e devolve o dicionário NORMALIZADO
    /// (defaults aplicados, tipos coeridos). Rejeita: capacidade desconhecida, param obrigatório
    /// faltando, tipo errado, valor fora da whitelist, param desconhecido.
    /// </summary>
    public Validation ValidateAndNormalize(string capabilityId, IReadOnlyDictionary<string, object?>? raw)
    {
        if (!_caps.TryGetValue(capabilityId, out var cap))
            return new Validation(false, $"capacidade desconhecida: {capabilityId}", Empty);

        raw ??= Empty;
        var outp = new Dictionary<string, object?>(StringComparer.Ordinal);

        // params esperados
        foreach (var (pname, def) in cap.Params)
        {
            if (raw.TryGetValue(pname, out var val) && val is not null)
            {
                var (ok, coerced, err) = Coerce(def, val);
                if (!ok) return new Validation(false, $"{capabilityId}.{pname}: {err}", Empty);
                outp[pname] = coerced;
            }
            else if (def.Required)
            {
                return new Validation(false, $"{capabilityId}: falta param obrigatório '{pname}'", Empty);
            }
            else if (def.Default is not null)
            {
                outp[pname] = def.Default;
            }
        }

        // params desconhecidos
        foreach (var k in raw.Keys)
            if (!cap.Params.ContainsKey(k))
                return new Validation(false, $"{capabilityId}: param desconhecido '{k}'", Empty);

        return new Validation(true, null, outp);
    }

    private static (bool ok, object? value, string? err) Coerce(ParamSpec def, object raw)
    {
        object? value;
        switch (def.Type)
        {
            case "string":
                value = raw.ToString();
                break;
            case "int":
                if (raw is int i) value = i;
                else if (int.TryParse(raw.ToString(), out var pi)) value = pi;
                else return (false, null, $"esperava int, veio '{raw}'");
                break;
            case "bool":
                if (raw is bool b) value = b;
                else if (bool.TryParse(raw.ToString(), out var pb)) value = pb;
                else return (false, null, $"esperava bool, veio '{raw}'");
                break;
            default:
                return (false, null, $"tipo desconhecido '{def.Type}'");
        }

        if (def.Enum is { Count: > 0 })
        {
            var allowed = def.Enum.Select(x => x?.ToString());
            if (!allowed.Contains(value?.ToString()))
                return (false, null, $"'{value}' fora da whitelist [{string.Join(", ", def.Enum)}]");
        }

        return (true, value, null);
    }

    private static object? Unwrap(JsonElement e) => e.ValueKind switch
    {
        JsonValueKind.String => e.GetString(),
        JsonValueKind.Number => e.TryGetInt32(out var i) ? i : e.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        _ => null,
    };

    private static readonly IReadOnlyDictionary<string, object?> Empty =
        new Dictionary<string, object?>();
}
