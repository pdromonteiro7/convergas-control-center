using System.Text.Json;

namespace ConvergasControl.Agent;

/// <summary>Endpoints do assistente de IA (orquestra Skills; nunca gera comandos).</summary>
public static class AiApi
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public sealed record AskRequest(string Message, List<Destination>? Destinations);
    public sealed record PersonaRequest(string Persona);
    public sealed record SummaryRequest(string SkillName, string Status, string? HumanMessage, string? ResultJson);

    public static void MapAiApi(this WebApplication app)
    {
        app.MapGet("/api/ai/status", (AiConfig c) =>
            Results.Json(new { configured = c.Configured, model = c.Model, persona = c.Persona }, Json));

        app.MapPost("/api/ai/persona", async (HttpContext ctx, AiConfig c) =>
        {
            PersonaRequest? body;
            try { body = await JsonSerializer.DeserializeAsync<PersonaRequest>(ctx.Request.Body, Json, ctx.RequestAborted); }
            catch { body = null; }
            if (body is null) return Results.BadRequest();
            c.Persona = string.IsNullOrWhiteSpace(body.Persona) ? AiConfig.DefaultPersona : body.Persona.Trim();
            c.Save();
            return Results.Ok();
        });

        app.MapPost("/api/ai/ask", async (HttpContext ctx, AiService ai) =>
        {
            AskRequest? body;
            try { body = await JsonSerializer.DeserializeAsync<AskRequest>(ctx.Request.Body, Json, ctx.RequestAborted); }
            catch { body = null; }
            if (body is null || string.IsNullOrWhiteSpace(body.Message)) return Results.BadRequest();
            var r = await ai.AskAsync(body.Message, body.Destinations ?? new List<Destination>(), ctx.RequestAborted);
            return Results.Json(r, Json);
        });

        app.MapPost("/api/ai/summarize", async (HttpContext ctx, AiService ai, AiConfig c) =>
        {
            if (!c.Configured) return Results.Json(new { reply = (string?)null }, Json);
            SummaryRequest? body;
            try { body = await JsonSerializer.DeserializeAsync<SummaryRequest>(ctx.Request.Body, Json, ctx.RequestAborted); }
            catch { body = null; }
            if (body is null || string.IsNullOrWhiteSpace(body.SkillName)) return Results.BadRequest();
            var reply = await ai.SummarizeAsync(body.SkillName, body.Status ?? "", body.HumanMessage, body.ResultJson, ctx.RequestAborted);
            return Results.Json(new { reply }, Json);
        });
    }
}
