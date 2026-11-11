using System.Diagnostics;
using System.Text.Json;
using System.Threading.Channels;
using ConvergasControl.Agent.Capabilities;

namespace ConvergasControl.Agent;

/// <summary>
/// Executa uma Skill passo a passo, traduzindo capacidades e emitindo o fluxo
/// Accepted → Stage/Log(n) → Result num <see cref="IExecSink"/> (gRPC ou SSE).
/// Grava um registro de auditoria em todo término. Usa um Channel para serializar
/// os eventos (as capacidades chamam Progress de forma síncrona).
/// </summary>
public sealed class SkillExecutor
{
    private readonly CapabilityCatalog _caps;
    private readonly CapabilityRegistry _registry;
    private readonly AuditLog _audit;

    public SkillExecutor(CapabilityCatalog caps, CapabilityRegistry registry, AuditLog audit)
    {
        _caps = caps;
        _registry = registry;
        _audit = audit;
    }

    public async Task RunAsync(
        SkillManifest skill, string? overrideJson, bool adminConfirmed,
        IExecSink sink, bool serviceElevated, string executionId, CancellationToken ct)
    {
        var channel = Channel.CreateUnbounded<ExecEvent>(new UnboundedChannelOptions { SingleReader = true });
        var sw = Stopwatch.StartNew();

        var pump = Task.Run(async () =>
        {
            try
            {
                await foreach (var ev in channel.Reader.ReadAllAsync())
                    await sink.EmitAsync(ev);
            }
            catch (Exception) { /* consumidor desconectou */ }
        });

        void Emit(ExecEvent ev) => channel.Writer.TryWrite(ev);

        // Único ponto de término: emite o Result E grava a auditoria.
        void Finish(string status, string message, string? resultJson, string? errorCode, bool reboot)
        {
            Emit(ExecEvent.Result(status, message, resultJson, errorCode, reboot));
            _audit.Append(new AuditRecord(
                DateTimeOffset.UtcNow.ToString("o"), executionId, skill.Id, skill.Name,
                status, errorCode, serviceElevated, sw.ElapsedMilliseconds, reboot, message));
        }

        try
        {
            Emit(ExecEvent.Accepted(executionId, skill.Id, skill.Steps.Count, skill.RequiresAdmin));

            // Guarda: Skill de admin exige confirmação explícita (a UI a coleta).
            if (skill.RequiresAdmin && !adminConfirmed)
            {
                Finish(ExecEvent.Statuses.Failed, "Confirmação de administrador necessária para esta ação.",
                    null, CommonErrors.Denied, false);
                return;
            }

            var overrides = ParseOverride(overrideJson);
            IReadOnlyDictionary<string, object?>? lastData = null;
            var rebootRequired = false;

            for (var i = 0; i < skill.Steps.Count; i++)
            {
                var step = skill.Steps[i];

                if (!_caps.TryGet(step.Capability, out var cap) ||
                    !_registry.TryGet(step.Capability, out var spec))
                {
                    Finish(ExecEvent.Statuses.Failed, skill.ErrorMessage(CommonErrors.Unexpected), null, CommonErrors.Unexpected, false);
                    return;
                }

                if (spec.RequiresAdmin && !serviceElevated)
                {
                    Finish(ExecEvent.Statuses.Failed, skill.ErrorMessage(CommonErrors.Denied), null, CommonErrors.Denied, false);
                    return;
                }

                var v = _registry.ValidateAndNormalize(step.Capability, MergeOverride(spec, step, overrides));
                if (!v.Ok)
                {
                    Finish(ExecEvent.Statuses.Failed, skill.ErrorMessage(CommonErrors.Unexpected), null, CommonErrors.Unexpected, false);
                    return;
                }

                Emit(ExecEvent.Stage(ExecEvent.Phases.Initializing, i, step.Capability, 0, $"Iniciando: {step.Capability}"));

                CapabilityResult result;
                try
                {
                    var cctx = new CapabilityContext
                    {
                        Params = v.Params,
                        Progress = new ChannelProgress(channel.Writer, i, step.Capability),
                        Elevated = serviceElevated,
                    };
                    result = await cap.ExecuteAsync(cctx, ct);
                }
                catch (OperationCanceledException)
                {
                    Finish(ExecEvent.Statuses.Cancelled, "Ação cancelada.", null, CommonErrors.Cancelled, rebootRequired);
                    return;
                }
                catch (Exception)
                {
                    Finish(ExecEvent.Statuses.Failed, skill.ErrorMessage(CommonErrors.Unexpected), null, CommonErrors.Unexpected, false);
                    return;
                }

                if (!result.Ok)
                {
                    Finish(ExecEvent.Statuses.Failed, skill.ErrorMessage(result.ErrorCode), null, result.ErrorCode, rebootRequired || result.RebootRequired);
                    return;
                }

                if (result.Data.Count > 0) lastData = result.Data;
                rebootRequired = rebootRequired || result.RebootRequired;
            }

            Finish(ExecEvent.Statuses.Success, skill.Expected,
                lastData is { Count: > 0 } ? JsonSerializer.Serialize(lastData) : null,
                null, rebootRequired);
        }
        finally
        {
            channel.Writer.TryComplete();
            await pump;
        }
    }

    private static IReadOnlyDictionary<string, object?> ParseOverride(string? json)
    {
        var d = new Dictionary<string, object?>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(json)) return d;
        try
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var p in doc.RootElement.EnumerateObject())
                d[p.Name] = p.Value.ValueKind switch
                {
                    JsonValueKind.String => p.Value.GetString(),
                    JsonValueKind.Number => p.Value.TryGetInt32(out var i) ? i : p.Value.GetDouble(),
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    _ => null,
                };
        }
        catch { /* override inválido → ignorado */ }
        return d;
    }

    private static IReadOnlyDictionary<string, object?> MergeOverride(
        CapabilityRegistry.CapabilitySpec spec, SkillStepDef step,
        IReadOnlyDictionary<string, object?> overrides)
    {
        if (overrides.Count == 0) return step.Params;
        var merged = new Dictionary<string, object?>(
            step.Params.ToDictionary(k => k.Key, k => k.Value), StringComparer.Ordinal);
        foreach (var (k, val) in overrides)
            if (spec.Params.ContainsKey(k)) merged[k] = val;
        return merged;
    }

    private sealed class ChannelProgress : ICapabilityProgress
    {
        private readonly ChannelWriter<ExecEvent> _w;
        private readonly int _step;
        private readonly string _cap;

        public ChannelProgress(ChannelWriter<ExecEvent> w, int step, string cap)
        {
            _w = w; _step = step; _cap = cap;
        }

        public void Stage(int percent, string message) =>
            _w.TryWrite(ExecEvent.Stage(ExecEvent.Phases.Running, _step, _cap, percent, message));

        public void Log(string line) => _w.TryWrite(ExecEvent.Log(line));
    }
}
