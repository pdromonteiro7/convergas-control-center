using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ConvergasControl.Agent.Capabilities;

namespace ConvergasControl.Agent;

/// <summary>
/// Fachada HTTP+SSE em loopback (127.0.0.1) para a UI web/Tauri. Reaproveita SkillCatalog e
/// SkillExecutor (mesmo motor do gRPC). Endpoints:
///   GET  /api/agent    → info do agent (JSON)
///   GET  /api/skills   → catálogo (JSON)
///   GET  /api/health   → SSE de saúde do PC
///   POST /api/execute  → SSE do fluxo de execução (accepted/stage/log/result)
/// </summary>
public static class HttpApi
{
    private static readonly IReadOnlyDictionary<string, object?> Empty = new Dictionary<string, object?>();
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static void MapAgentApi(this WebApplication app, bool elevated)
    {
        app.MapGet("/api/agent", (SkillCatalog s, CapabilityRegistry r) =>
            Results.Json(new { version = "1.0.0", catalogVersion = r.Version, skillsLoaded = s.Skills.Count, elevated }, Json));

        app.MapGet("/api/skills", (SkillCatalog s) =>
            Results.Json(s.Skills
                .OrderBy(x => x.Category).ThenBy(x => x.Name)
                .Select(x => new { x.Id, x.Name, x.Category, x.Icon, x.Description, x.RequiresAdmin, x.EstimatedSeconds, x.Expected }), Json));

        app.MapGet("/api/logs", (AuditLog audit, int? limit) =>
            Results.Json(audit.Tail(limit is > 0 and <= 500 ? limit.Value : 50), Json));

        app.MapGet("/api/health", async (HttpContext ctx) =>
        {
            PrepSse(ctx);
            var health = new HealthSnapshotCapability();
            while (!ctx.RequestAborted.IsCancellationRequested)
            {
                var res = await health.ExecuteAsync(
                    new CapabilityContext { Params = Empty, Progress = NoopProgress.Instance, Elevated = elevated },
                    ctx.RequestAborted);
                await WriteSse(ctx, "health", JsonSerializer.Serialize(res.Data, Json));
                try { await Task.Delay(2000, ctx.RequestAborted); } catch { break; }
            }
        });

        app.MapPost("/api/execute", async (HttpContext ctx, SkillCatalog skills, CapabilityCatalog caps, CapabilityRegistry reg, AuditLog audit) =>
        {
            ExecRequest? body;
            try { body = await JsonSerializer.DeserializeAsync<ExecRequest>(ctx.Request.Body, Json, ctx.RequestAborted); }
            catch { body = null; }

            PrepSse(ctx);
            if (body is null || string.IsNullOrEmpty(body.SkillId))
            {
                await EmitResult(ctx, "Requisição inválida.", "badRequest");
                return;
            }
            var skill = skills.Find(body.SkillId);
            if (skill is null)
            {
                await EmitResult(ctx, $"Skill não encontrada: {body.SkillId}", "notFound");
                return;
            }

            var sink = new SseSink(ctx);
            var exec = new SkillExecutor(caps, reg, audit);
            await exec.RunAsync(skill, body.ParamsOverrideJson, body.AdminConfirmed, sink, elevated,
                Guid.NewGuid().ToString("N"), ctx.RequestAborted);
        });
    }

    private static void PrepSse(HttpContext ctx)
    {
        ctx.Response.Headers.ContentType = "text/event-stream";
        ctx.Response.Headers.CacheControl = "no-cache";
        ctx.Response.Headers["X-Accel-Buffering"] = "no";
    }

    private static async Task WriteSse(HttpContext ctx, string ev, string data)
    {
        await ctx.Response.WriteAsync($"event: {ev}\ndata: {data}\n\n", Encoding.UTF8, ctx.RequestAborted);
        await ctx.Response.Body.FlushAsync(ctx.RequestAborted);
    }

    private static Task EmitResult(HttpContext ctx, string message, string code) =>
        WriteSse(ctx, "exec", JsonSerializer.Serialize(
            ExecEvent.Result(ExecEvent.Statuses.Failed, message, null, code, false), Json));

    public sealed record ExecRequest(string SkillId, string? ParamsOverrideJson, bool AdminConfirmed);

    private sealed class SseSink : IExecSink
    {
        private readonly HttpContext _ctx;
        public SseSink(HttpContext ctx) => _ctx = ctx;
        public async ValueTask EmitAsync(ExecEvent ev) =>
            await WriteSse(_ctx, "exec", JsonSerializer.Serialize(ev, Json));
    }
}
