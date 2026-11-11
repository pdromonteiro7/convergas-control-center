using System.Text.Json;
using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

/// <summary>Endpoints da Política de Acesso (bloqueio web).</summary>
public static class PolicyApi
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public const string ScheduleLabel = "Seg–Sex · 08–12 e 13–18 (almoço livre)";

    public static void MapPolicyApi(this WebApplication app)
    {
        app.MapGet("/api/policy", (PolicyStore s) =>
        {
            var c = s.Get();
            return Results.Json(new { enabled = c.Enabled, autoSchedule = c.AutoSchedule, schedule = ScheduleLabel, categories = c.Categories }, Json);
        });

        app.MapPost("/api/policy", async (HttpContext ctx, PolicyStore s) =>
        {
            PolicyConfig? cfg;
            try { cfg = await JsonSerializer.DeserializeAsync<PolicyConfig>(ctx.Request.Body, Json); }
            catch { cfg = null; }
            if (cfg is null) return Results.BadRequest();
            s.SaveCategories(cfg.Categories, cfg.AutoSchedule);
            return Results.Ok();
        });

        app.MapPost("/api/policy/apply", async (PolicyService svc) =>
        {
            var (ok, count, error) = await svc.ApplyAsync();
            return Results.Json(new { ok, count, error }, Json);
        });

        app.MapPost("/api/policy/remove", async (PolicyService svc) =>
            Results.Json(new { ok = await svc.RemoveAsync() }, Json));

        app.MapGet("/api/policy/attempts", (Store.AttemptsRepo repo, int? days) =>
        {
            var d = days is > 0 and <= 30 ? days.Value : 1;
            var since = DateTime.Now.Date.AddDays(-(d - 1)).ToString("yyyy-MM-dd");
            var machine = Environment.MachineName;
            return Results.Json(new { machine, days = d, attempts = repo.List(machine, since) }, Json);
        });
    }
}
