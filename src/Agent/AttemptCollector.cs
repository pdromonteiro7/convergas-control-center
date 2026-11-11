using System.Collections.Concurrent;
using ConvergasControl.Agent.Store;
using Microsoft.Diagnostics.Tracing.Session;

namespace ConvergasControl.Agent;

/// <summary>
/// Escuta as consultas DNS do Windows (ETW, provider Microsoft-Windows-DNS-Client) e conta as
/// tentativas de acesso aos domínios MONITORADOS (os configurados na Política). Não guarda
/// navegação — só contagem por domínio/dia/máquina. Requer serviço elevado. Descarrega no
/// banco a cada 30s. Se DoH estiver ligado o Windows não vê o DNS — por isso a Política o desliga.
/// </summary>
public sealed class AttemptCollector : BackgroundService
{
    private readonly PolicyStore _policy;
    private readonly AttemptsRepo _repo;
    private readonly ILogger<AttemptCollector> _log;

    private readonly ConcurrentDictionary<string, int> _pending = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _lastSeen = new(StringComparer.Ordinal);
    // dedup: no máximo 1 tentativa por domínio por minuto (colapsa a rajada A+AAAA+retentativas)
    private readonly ConcurrentDictionary<string, string> _lastMinute = new(StringComparer.Ordinal);
    private volatile HashSet<string> _monitored = new(StringComparer.OrdinalIgnoreCase);
    private readonly string _machine = Environment.MachineName;
    private TraceEventSession? _session;

    public AttemptCollector(PolicyStore policy, AttemptsRepo repo, ILogger<AttemptCollector> log)
    {
        _policy = policy;
        _repo = repo;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!AgentGrpcService.IsElevated())
        {
            _log.LogWarning("Monitoramento de tentativas desativado: precisa de privilégio de administrador.");
            return;
        }

        RefreshDomains();
        try
        {
            _session = new TraceEventSession("ConvergasControlDnsMon") { StopOnDispose = true };
            _session.EnableProvider("Microsoft-Windows-DNS-Client");
            _session.Source.Dynamic.All += OnEvent;
            _ = Task.Run(() => { try { _session.Source.Process(); } catch { } }, ct);
            _log.LogInformation("Monitoramento de tentativas ativo (ETW DNS-Client).");
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Não foi possível iniciar o monitoramento ETW.");
            return;
        }

        while (!ct.IsCancellationRequested)
        {
            try { await Task.Delay(TimeSpan.FromSeconds(30), ct); }
            catch { break; }
            RefreshDomains();
            Flush();
        }

        Flush();
        try { _session?.Dispose(); } catch { }
    }

    private void RefreshDomains() => _monitored = new HashSet<string>(_policy.AllDomains(), StringComparer.OrdinalIgnoreCase);

    private void OnEvent(Microsoft.Diagnostics.Tracing.TraceEvent e)
    {
        if (!string.Equals(e.ProviderName, "Microsoft-Windows-DNS-Client", StringComparison.Ordinal)) return;

        string? q;
        try { q = e.PayloadByName("QueryName") as string; } catch { return; }
        if (string.IsNullOrEmpty(q)) return;

        q = q.TrimEnd('.').ToLowerInvariant();
        var monitored = _monitored;
        if (monitored.Count == 0) return;

        // casa domínio exato ou subdomínio (ex.: m.youtube.com → youtube.com)
        var hit = monitored.FirstOrDefault(d => q == d || q.EndsWith("." + d, StringComparison.Ordinal));
        if (hit is null) return;

        var now = DateTimeOffset.Now;
        var minute = now.ToString("yyyyMMddHHmm");
        if (_lastMinute.TryGetValue(hit, out var m) && m == minute) return; // já contado neste minuto
        _lastMinute[hit] = minute;

        _pending.AddOrUpdate(hit, 1, (_, v) => v + 1);
        _lastSeen[hit] = now.ToString("HH:mm");
    }

    private void Flush()
    {
        if (_pending.IsEmpty) return;
        var batch = new Dictionary<string, (int, string)>(StringComparer.Ordinal);
        foreach (var key in _pending.Keys.ToArray())
        {
            if (_pending.TryRemove(key, out var count) && count > 0)
                batch[key] = (count, _lastSeen.TryGetValue(key, out var t) ? t : "");
        }
        if (batch.Count == 0) return;
        try { _repo.AddHits(_machine, DateTime.Now.ToString("yyyy-MM-dd"), batch); }
        catch (Exception ex) { _log.LogWarning(ex, "Falha ao gravar tentativas"); }
    }
}
