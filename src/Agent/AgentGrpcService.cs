using System.Reflection;
using System.Security.Principal;
using System.Text.Json;
using ConvergasControl.Agent.Capabilities;
using ConvergasControl.Agent.V1;
using Grpc.Core;

namespace ConvergasControl.Agent;

/// <summary>Implementa o contrato gRPC agent.v1. Único ponto de entrada da UI para o Agent.</summary>
public sealed class AgentGrpcService : AgentService.AgentServiceBase
{
    private readonly SkillCatalog _skills;
    private readonly CapabilityCatalog _caps;
    private readonly CapabilityRegistry _registry;
    private readonly AuditLog _audit;
    private static readonly bool Elevated = IsElevated();

    private static readonly IReadOnlyDictionary<string, object?> Empty = new Dictionary<string, object?>();

    public AgentGrpcService(SkillCatalog skills, CapabilityCatalog caps, CapabilityRegistry registry, AuditLog audit)
    {
        _skills = skills;
        _caps = caps;
        _registry = registry;
        _audit = audit;
    }

    public override Task<ListSkillsResponse> ListSkills(ListSkillsRequest req, ServerCallContext ctx)
    {
        var resp = new ListSkillsResponse();
        foreach (var s in _skills.Skills)
        {
            if (!string.IsNullOrEmpty(req.Category) &&
                !s.Category.Equals(req.Category, StringComparison.OrdinalIgnoreCase)) continue;
            if (!string.IsNullOrEmpty(req.Query) &&
                !(s.Name + " " + s.Description).Contains(req.Query, StringComparison.OrdinalIgnoreCase)) continue;
            resp.Skills.Add(ToProto(s));
        }
        return Task.FromResult(resp);
    }

    public override Task<Skill> GetSkill(GetSkillRequest req, ServerCallContext ctx)
    {
        var s = _skills.Find(req.SkillId)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Skill não encontrada: {req.SkillId}"));
        return Task.FromResult(ToProto(s));
    }

    public override async Task ExecuteSkill(
        ExecuteSkillRequest req, IServerStreamWriter<ExecutionEvent> stream, ServerCallContext ctx)
    {
        var skill = _skills.Find(req.SkillId)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Skill não encontrada: {req.SkillId}"));

        var execId = string.IsNullOrEmpty(req.ExecutionId) ? Guid.NewGuid().ToString("N") : req.ExecutionId;
        var executor = new SkillExecutor(_caps, _registry, _audit);
        await executor.RunAsync(
            skill, req.ParamsOverrideJson, req.AdminConfirmed, new GrpcExecSink(stream),
            Elevated, execId, ctx.CancellationToken);
    }

    /// <summary>Adapta os eventos neutros do executor para o stream gRPC.</summary>
    private sealed class GrpcExecSink : IExecSink
    {
        private readonly IServerStreamWriter<ExecutionEvent> _stream;
        public GrpcExecSink(IServerStreamWriter<ExecutionEvent> stream) => _stream = stream;

        public async ValueTask EmitAsync(ExecEvent ev)
        {
            ExecutionEvent pe = ev.Kind switch
            {
                "accepted" => new ExecutionEvent
                {
                    Accepted = new Accepted
                    {
                        ExecutionId = ev.ExecutionId ?? "", SkillId = ev.SkillId ?? "",
                        TotalSteps = ev.TotalSteps, RequiresAdmin = ev.RequiresAdmin,
                    }
                },
                "stage" => new ExecutionEvent
                {
                    Stage = new Stage
                    {
                        Phase = MapPhase(ev.Phase), StepIndex = ev.StepIndex,
                        Capability = ev.Capability ?? "", Percent = ev.Percent, Message = ev.Message ?? "",
                    }
                },
                "log" => new ExecutionEvent { Log = new LogLine { Text = ev.Text ?? "" } },
                "result" => new ExecutionEvent
                {
                    Result = new Result
                    {
                        Status = MapStatus(ev.Status), HumanMessage = ev.HumanMessage ?? "",
                        ResultJson = ev.ResultJson ?? "", ErrorCode = ev.ErrorCode ?? "",
                        RebootRequired = ev.RebootRequired,
                    }
                },
                _ => new ExecutionEvent(),
            };
            await _stream.WriteAsync(pe);
        }

        private static ExecutionPhase MapPhase(string? p) => p switch
        {
            ExecEvent.Phases.Initializing => ExecutionPhase.Initializing,
            ExecEvent.Phases.Running => ExecutionPhase.Running,
            ExecEvent.Phases.Finalizing => ExecutionPhase.Finalizing,
            _ => ExecutionPhase.Unspecified,
        };

        private static ExecutionStatus MapStatus(string? s) => s switch
        {
            ExecEvent.Statuses.Success => ExecutionStatus.Success,
            ExecEvent.Statuses.Failed => ExecutionStatus.Failed,
            ExecEvent.Statuses.Cancelled => ExecutionStatus.Cancelled,
            _ => ExecutionStatus.Unspecified,
        };
    }

    // O cancelamento real acontece quando o cliente encerra a chamada de streaming (ct do server).
    public override Task<CancelExecutionResponse> CancelExecution(CancelExecutionRequest req, ServerCallContext ctx)
        => Task.FromResult(new CancelExecutionResponse { Cancelled = true });

    public override async Task StreamHealth(
        StreamHealthRequest req, IServerStreamWriter<HealthSnapshot> stream, ServerCallContext ctx)
    {
        var health = new HealthSnapshotCapability();
        var interval = req.IntervalMs > 0 ? req.IntervalMs : 2000;
        var noop = new NoopProgress();

        while (!ctx.CancellationToken.IsCancellationRequested)
        {
            var res = await health.ExecuteAsync(
                new CapabilityContext { Params = Empty, Progress = noop, Elevated = Elevated },
                ctx.CancellationToken);
            await stream.WriteAsync(ToHealth(res.Data));
            await Task.Delay(interval, ctx.CancellationToken);
        }
    }

    public override Task<AgentInfo> GetAgentInfo(GetAgentInfoRequest req, ServerCallContext ctx)
        => Task.FromResult(new AgentInfo
        {
            Version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "0.0.0",
            CatalogVersion = _registry.Version.ToString(),
            ElevatedAvailable = Elevated,
            SkillsLoaded = _skills.Skills.Count,
        });

    // ---- mapeamento ----

    private static Skill ToProto(SkillManifest s)
    {
        var p = new Skill
        {
            Id = s.Id, Name = s.Name, Category = s.Category, Icon = s.Icon,
            Description = s.Description, RequiresAdmin = s.RequiresAdmin,
            EstimatedSeconds = s.EstimatedSeconds, Expected = s.Expected,
        };
        foreach (var step in s.Steps)
            p.Steps.Add(new SkillStep
            {
                Capability = step.Capability,
                ParamsJson = step.Params.Count > 0 ? JsonSerializer.Serialize(step.Params) : "",
            });
        foreach (var (k, v) in s.OnError) p.OnError[k] = v;
        return p;
    }

    private static HealthSnapshot ToHealth(IReadOnlyDictionary<string, object?> data)
    {
        var snap = new HealthSnapshot { CpuPct = Convert.ToDouble(data.GetValueOrDefault("cpuPct") ?? 0.0) };
        if (data.GetValueOrDefault("ram") is IReadOnlyDictionary<string, object?> ram)
        {
            snap.RamUsedMb = Convert.ToInt64(ram.GetValueOrDefault("usedMB") ?? 0L);
            snap.RamTotalMb = Convert.ToInt64(ram.GetValueOrDefault("totalMB") ?? 0L);
        }
        if (data.GetValueOrDefault("disks") is IEnumerable<object?> disks)
            foreach (var d in disks)
                if (d is IReadOnlyDictionary<string, object?> disk)
                    snap.Disks.Add(new DiskUsage
                    {
                        Drive = disk.GetValueOrDefault("drive")?.ToString() ?? "",
                        FreeGb = Convert.ToInt64(disk.GetValueOrDefault("freeGB") ?? 0L),
                        TotalGb = Convert.ToInt64(disk.GetValueOrDefault("totalGB") ?? 0L),
                    });
        return snap;
    }

    public static bool IsElevated()
    {
        try
        {
            using var id = WindowsIdentity.GetCurrent();
            return new WindowsPrincipal(id).IsInRole(WindowsBuiltInRole.Administrator);
        }
        catch { return false; }
    }

    private sealed class NoopProgress : ICapabilityProgress
    {
        public void Stage(int percent, string message) { }
        public void Log(string line) { }
    }
}
