using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

/// <summary>
/// Aplica/remove o bloqueio automaticamente conforme o expediente (Seg–Sex 08–12 e 13–18),
/// quando o autoSchedule está ligado. Checa a cada minuto e só age se o estado precisar mudar.
/// </summary>
public sealed class PolicyScheduler : BackgroundService
{
    private readonly PolicyStore _store;
    private readonly PolicyService _svc;
    private readonly ILogger<PolicyScheduler> _log;

    public PolicyScheduler(PolicyStore store, PolicyService svc, ILogger<PolicyScheduler> log)
    {
        _store = store;
        _svc = svc;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var cfg = _store.Get();
                if (cfg.AutoSchedule)
                {
                    var shouldBlock = InWorkWindow(DateTime.Now);
                    if (shouldBlock && !cfg.Enabled) { await _svc.ApplyAsync(); _log.LogInformation("Bloqueio aplicado (expediente)"); }
                    else if (!shouldBlock && cfg.Enabled) { await _svc.RemoveAsync(); _log.LogInformation("Bloqueio liberado (fora do expediente)"); }
                }
            }
            catch (Exception ex) { _log.LogWarning(ex, "PolicyScheduler"); }

            try { await Task.Delay(TimeSpan.FromSeconds(60), ct); } catch { break; }
        }
    }

    public static bool InWorkWindow(DateTime now)
    {
        if (now.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) return false;
        var t = now.TimeOfDay;
        return (t >= TimeSpan.FromHours(8) && t < TimeSpan.FromHours(12))
            || (t >= TimeSpan.FromHours(13) && t < TimeSpan.FromHours(18));
    }
}
