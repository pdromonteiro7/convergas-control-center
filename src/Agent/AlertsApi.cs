using System.Text.Json;

namespace ConvergasControl.Agent;

/// <summary>GET /api/alerts — alertas acionáveis + contagens por severidade.</summary>
public static class AlertsApi
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static void MapAlertsApi(this WebApplication app)
    {
        app.MapGet("/api/alerts", async (AlertsService svc) =>
        {
            var alerts = await svc.ComputeAsync();
            var counts = new
            {
                danger = alerts.Count(a => a.Level == "danger"),
                warn = alerts.Count(a => a.Level == "warn"),
                info = alerts.Count(a => a.Level == "info"),
            };
            return Results.Json(new { counts, alerts }, Json);
        });
    }
}
