using System.Text.Json;
using System.Text.Json.Nodes;
using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

/// <summary>
/// API genérica dos módulos de dados. A UI lê o schema em /api/schema e renderiza
/// tabela + formulário de qualquer módulo sem código dedicado.
///   GET    /api/schema              → todos os módulos (áreas + campos)
///   GET    /api/data/{entity}       → registros
///   POST   /api/data/{entity}       → cria/atualiza
///   DELETE /api/data/{entity}/{id}  → remove
/// </summary>
public static class EntityApi
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static void MapEntityApi(this WebApplication app)
    {
        app.MapGet("/api/schema", () => Results.Json(EntityRegistry.All, Json));

        app.MapGet("/api/data/{entity}", (string entity, EntityRepo repo) =>
        {
            if (EntityRegistry.Find(entity) is null) return Results.NotFound();
            var arr = new JsonArray();
            foreach (var row in repo.List(entity))
            {
                var obj = JsonNode.Parse(row.Data) as JsonObject ?? new JsonObject();
                obj["id"] = row.Id;
                obj["updatedAt"] = row.UpdatedAt;
                arr.Add(obj);
            }
            return Results.Content(arr.ToJsonString(), "application/json");
        });

        app.MapPost("/api/data/{entity}", async (string entity, HttpContext ctx, EntityRepo repo) =>
        {
            var def = EntityRegistry.Find(entity);
            if (def is null) return Results.NotFound();

            JsonObject? body;
            try { body = JsonNode.Parse(await new StreamReader(ctx.Request.Body).ReadToEndAsync()) as JsonObject; }
            catch { body = null; }
            if (body is null) return Results.BadRequest(new { error = "Corpo inválido." });

            var id = body["id"]?.GetValue<string>();
            body.Remove("id");
            body.Remove("updatedAt");

            foreach (var f in def.Fields)
                if (f.Required && string.IsNullOrWhiteSpace(body[f.Key]?.ToString()))
                    return Results.BadRequest(new { error = $"O campo '{f.Label}' é obrigatório." });

            var (savedId, updatedAt) = repo.Upsert(entity, id, body.ToJsonString());
            body["id"] = savedId;
            body["updatedAt"] = updatedAt;
            return Results.Content(body.ToJsonString(), "application/json");
        });

        app.MapDelete("/api/data/{entity}/{id}", (string entity, string id, EntityRepo repo, FileStore files) =>
        {
            var ok = repo.Delete(entity, id);
            if (ok) files.DeleteAll(entity, id); // remove anexos órfãos (ex.: PDFs)
            return ok ? Results.Ok() : Results.NotFound();
        });
    }
}
