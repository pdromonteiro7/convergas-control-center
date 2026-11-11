using System.Text.Json.Nodes;
using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

/// <summary>
/// Popula o banco com os dados reais da Convergas (seed/seed.json, gerado do store.js antigo)
/// na PRIMEIRA execução. Idempotente por arquivo-marcador — não sobrescreve edições depois.
/// </summary>
public sealed class Seeder
{
    private readonly ComputersRepo _computers;
    private readonly EntityRepo _entities;
    private readonly ILogger<Seeder> _log;

    public Seeder(ComputersRepo computers, EntityRepo entities, ILogger<Seeder> log)
    {
        _computers = computers;
        _entities = entities;
        _log = log;
    }

    public void SeedIfNeeded()
    {
        var dataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "ConvergasControl", "data");
        var marker = Path.Combine(dataDir, ".seeded");
        if (File.Exists(marker)) return;

        var file = Path.Combine(AppContext.BaseDirectory, "seed", "seed.json");
        if (!File.Exists(file)) { _log.LogWarning("seed.json não encontrado: {File}", file); return; }

        try
        {
            var root = JsonNode.Parse(File.ReadAllText(file))!.AsObject();
            var nc = 0;
            foreach (var it in root["computers"]!.AsArray())
            {
                var o = it!.AsObject();
                _computers.Upsert(new Computer
                {
                    Id = Str(o, "id") ?? "",
                    Name = Str(o, "name") ?? "",
                    Serial = Str(o, "serial"),
                    Sector = Str(o, "sector"),
                    AssignedTo = Str(o, "assignedTo"),
                    Office = Str(o, "office"),
                    Antivirus = Str(o, "antivirus"),
                    Status = Str(o, "status"),
                    Notes = Str(o, "notes"),
                });
                nc++;
            }

            var ne = 0;
            foreach (var kv in root["entities"]!.AsObject())
            {
                var entity = kv.Key;
                foreach (var it in kv.Value!.AsArray())
                {
                    var o = (JsonObject)it!;
                    var id = o["id"]?.GetValue<string>();
                    o.Remove("id");
                    _entities.Upsert(entity, id, o.ToJsonString());
                    ne++;
                }
            }

            Directory.CreateDirectory(dataDir);
            File.WriteAllText(marker, DateTimeOffset.UtcNow.ToString("o"));
            _log.LogInformation("Seed aplicado: {C} computadores + {E} registros de módulos", nc, ne);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Falha ao aplicar o seed");
        }
    }

    private static string? Str(JsonObject o, string k) => o[k]?.GetValue<string>();
}
