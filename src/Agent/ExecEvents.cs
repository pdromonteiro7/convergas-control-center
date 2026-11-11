using ConvergasControl.Agent.Capabilities;

namespace ConvergasControl.Agent;

/// <summary>
/// Evento de execução NEUTRO (sem acoplamento a gRPC). O mesmo fluxo alimenta dois transportes:
/// o stream gRPC (named pipe) e o SSE (loopback HTTP, consumido pela UI web/Tauri).
/// </summary>
public sealed record ExecEvent
{
    public required string Kind { get; init; } // "accepted" | "stage" | "log" | "result"

    // accepted
    public string? ExecutionId { get; init; }
    public string? SkillId { get; init; }
    public int TotalSteps { get; init; }
    public bool RequiresAdmin { get; init; }

    // stage
    public string? Phase { get; init; } // INITIALIZING | RUNNING | FINALIZING
    public int StepIndex { get; init; }
    public string? Capability { get; init; }
    public int Percent { get; init; }
    public string? Message { get; init; }

    // log
    public string? Text { get; init; }

    // result
    public string? Status { get; init; } // SUCCESS | FAILED | CANCELLED
    public string? HumanMessage { get; init; }
    public string? ResultJson { get; init; }
    public string? ErrorCode { get; init; }
    public bool RebootRequired { get; init; }

    public static ExecEvent Accepted(string execId, string skillId, int totalSteps, bool requiresAdmin) =>
        new() { Kind = "accepted", ExecutionId = execId, SkillId = skillId, TotalSteps = totalSteps, RequiresAdmin = requiresAdmin };

    public static ExecEvent Stage(string phase, int stepIndex, string capability, int percent, string message) =>
        new() { Kind = "stage", Phase = phase, StepIndex = stepIndex, Capability = capability, Percent = percent, Message = message };

    public static ExecEvent Log(string text) => new() { Kind = "log", Text = text };

    public static ExecEvent Result(string status, string humanMessage, string? resultJson, string? errorCode, bool rebootRequired) =>
        new() { Kind = "result", Status = status, HumanMessage = humanMessage, ResultJson = resultJson, ErrorCode = errorCode, RebootRequired = rebootRequired };

    public static class Phases { public const string Initializing = "INITIALIZING", Running = "RUNNING", Finalizing = "FINALIZING"; }
    public static class Statuses { public const string Success = "SUCCESS", Failed = "FAILED", Cancelled = "CANCELLED"; }
}

/// <summary>Destino dos eventos de execução. Cada transporte implementa o seu.</summary>
public interface IExecSink
{
    ValueTask EmitAsync(ExecEvent ev);
}

/// <summary>Progresso que não vai a lugar nenhum (usado pelo StreamHealth / amostragens).</summary>
public sealed class NoopProgress : ICapabilityProgress
{
    public static readonly NoopProgress Instance = new();
    public void Stage(int percent, string message) { }
    public void Log(string line) { }
}
