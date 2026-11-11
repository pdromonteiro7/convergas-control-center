using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

/// <summary>Endpoints das áreas de dados persistidos (Frota; depois Qualidade, Cofre…).</summary>
public static class DataApi
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static void MapDataApi(this WebApplication app)
    {
        // ---- Frota ----
        app.MapGet("/api/computers", (ComputersRepo repo) => Results.Json(repo.List(), Json));

        app.MapPost("/api/computers", async (HttpContext ctx, ComputersRepo repo) =>
        {
            Computer? c;
            try { c = await JsonSerializer.DeserializeAsync<Computer>(ctx.Request.Body, Json); }
            catch { c = null; }
            if (c is null || string.IsNullOrWhiteSpace(c.Name))
                return Results.BadRequest(new { error = "O nome do computador é obrigatório." });
            return Results.Json(repo.Upsert(c), Json);
        });

        app.MapDelete("/api/computers/{id}", (string id, ComputersRepo repo) =>
            repo.Delete(id) ? Results.Ok() : Results.NotFound());

        // Auto-descoberta: dados da máquina local para pré-preencher o cadastro.
        app.MapGet("/api/computers/self", () => Results.Json(new
        {
            name = Environment.MachineName,
            os = RuntimeInformation.OSDescription,
            arch = RuntimeInformation.OSArchitecture.ToString(),
        }, Json));
    }
}
