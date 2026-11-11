using System.Text.Json.Nodes;
using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

/// <summary>
/// Anexos dos módulos genéricos (ex.: PDF do certificado). O arquivo vai para o FileStore
/// (disco) e o nome original é gravado no campo do registro (EntityRepo) para exibir/baixar.
///   POST   /api/files/{entity}/{id}/{field}   → envia (multipart 'file')
///   GET    /api/files/{entity}/{id}/{field}   → baixa/visualiza (inline)
///   DELETE /api/files/{entity}/{id}/{field}   → remove
/// </summary>
public static class FilesApi
{
    public static void MapFilesApi(this WebApplication app)
    {
        app.MapPost("/api/files/{entity}/{id}/{field}", async (
            string entity, string id, string field, HttpContext ctx, FileStore files, EntityRepo repo) =>
        {
            var def = EntityRegistry.Find(entity);
            if (def is null || !def.Fields.Any(f => f.Key == field && f.Type == "file")) return Results.NotFound();

            if (!ctx.Request.HasFormContentType) return Results.BadRequest(new { error = "Envie um arquivo (multipart)." });
            var form = await ctx.Request.ReadFormAsync(ctx.RequestAborted);
            var file = form.Files["file"] ?? form.Files.FirstOrDefault();
            if (file is null || file.Length == 0) return Results.BadRequest(new { error = "Arquivo vazio." });
            if (file.Length > 25 * 1024 * 1024) return Results.BadRequest(new { error = "Arquivo acima de 25 MB." });

            await using var s = file.OpenReadStream();
            var name = await files.SaveAsync(entity, id, field, file.FileName, s, ctx.RequestAborted);

            // grava o nome no registro para a UI saber que há anexo
            var row = repo.List(entity).FirstOrDefault(r => r.Id == id);
            var data = (row is null ? null : JsonNode.Parse(row.Data) as JsonObject) ?? new JsonObject();
            data[field] = name;
            repo.Upsert(entity, id, data.ToJsonString());

            return Results.Json(new { ok = true, name });
        }).DisableAntiforgery();

        app.MapGet("/api/files/{entity}/{id}/{field}", (string entity, string id, string field, FileStore files) =>
        {
            var found = files.Find(entity, id, field);
            if (found is null) return Results.NotFound();
            var (path, name) = found.Value;
            var stream = File.OpenRead(path);
            // sem fileDownloadName → Content-Disposition inline: PDF/imagem abrem no navegador.
            return Results.File(stream, ContentType(name), enableRangeProcessing: true);
        });

        app.MapDelete("/api/files/{entity}/{id}/{field}", (string entity, string id, string field, FileStore files, EntityRepo repo) =>
        {
            var removed = files.DeleteField(entity, id, field);
            var row = repo.List(entity).FirstOrDefault(r => r.Id == id);
            if (row is not null && JsonNode.Parse(row.Data) is JsonObject data && data.ContainsKey(field))
            {
                data.Remove(field);
                repo.Upsert(entity, id, data.ToJsonString());
            }
            return removed ? Results.Ok() : Results.NotFound();
        });
    }

    private static string ContentType(string name) => Path.GetExtension(name).ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".txt" => "text/plain",
        _ => "application/octet-stream",
    };
}
