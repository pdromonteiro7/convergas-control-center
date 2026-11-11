using ConvergasControl.Agent.Capabilities;
using ConvergasControl.Agent.Store;

namespace ConvergasControl.Agent;

/// <summary>Aplica/remove o bloqueio web chamando as capacidades e registrando auditoria.</summary>
public sealed class PolicyService
{
    private readonly CapabilityCatalog _caps;
    private readonly PolicyStore _store;
    private readonly AuditLog _audit;
    private readonly bool _elevated = AgentGrpcService.IsElevated();

    public PolicyService(CapabilityCatalog caps, PolicyStore store, AuditLog audit)
    {
        _caps = caps;
        _store = store;
        _audit = audit;
    }

    public async Task<(bool ok, int count, string? error)> ApplyAsync()
    {
        var domains = _store.EnabledDomains();
        if (domains.Count == 0) return (false, 0, "Nenhum domínio nas categorias ativas.");
        if (!_elevated) return (false, 0, "Sem privilégio de administrador.");
        if (!_caps.TryGet("policy.applyWebBlock", out var cap)) return (false, 0, "Capacidade ausente.");

        var ctx = new CapabilityContext
        {
            Params = new Dictionary<string, object?> { ["domains"] = string.Join(",", domains) },
            Progress = NoopProgress.Instance,
            Elevated = _elevated,
        };
        var r = await cap.ExecuteAsync(ctx, CancellationToken.None);
        if (r.Ok) { _store.SetEnabled(true); Audit("policy.applyWebBlock", "SUCCESS", $"{domains.Count} domínios bloqueados"); }
        else Audit("policy.applyWebBlock", "FAILED", r.ErrorCode ?? "falha");
        return (r.Ok, domains.Count, r.Ok ? null : "Falha ao aplicar o bloqueio.");
    }

    public async Task<bool> RemoveAsync()
    {
        if (!_elevated) return false;
        if (!_caps.TryGet("policy.removeWebBlock", out var cap)) return false;

        var ctx = new CapabilityContext
        {
            Params = new Dictionary<string, object?>(),
            Progress = NoopProgress.Instance,
            Elevated = _elevated,
        };
        var r = await cap.ExecuteAsync(ctx, CancellationToken.None);
        if (r.Ok) { _store.SetEnabled(false); Audit("policy.removeWebBlock", "SUCCESS", "bloqueio removido"); }
        return r.Ok;
    }

    private void Audit(string id, string status, string msg) => _audit.Append(new AuditRecord(
        DateTimeOffset.UtcNow.ToString("o"), Guid.NewGuid().ToString("N"), id, "Política de acesso",
        status, null, _elevated, 0, false, msg));
}
