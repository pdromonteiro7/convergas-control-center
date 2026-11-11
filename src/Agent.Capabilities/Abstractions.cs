namespace ConvergasControl.Agent.Capabilities;

/// <summary>
/// Uma capacidade é a ÚNICA coisa que toca o Windows. Código compilado, revisado e (Fase 5)
/// assinado. Uma Skill (dado JSON) só pode invocar capacidades registradas aqui — nunca
/// texto de comando livre. Ver docs/CAPACIDADES.md e schema/capability-registry.json.
/// </summary>
public interface ICapability
{
    /// <summary>Id canônico, ex.: "network.flushDns". Deve existir no capability-registry.json.</summary>
    string Id { get; }

    Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct);
}

/// <summary>Contexto de uma execução: params já validados, canal de progresso, elevação.</summary>
public sealed class CapabilityContext
{
    public required IReadOnlyDictionary<string, object?> Params { get; init; }
    public required ICapabilityProgress Progress { get; init; }

    /// <summary>O serviço está rodando elevado (pode executar capacidades requiresAdmin)?</summary>
    public bool Elevated { get; init; }

    /// <summary>Lê um param tipado com valor padrão. Os params já vêm validados pelo registry.</summary>
    public T Param<T>(string name, T fallback)
    {
        if (Params.TryGetValue(name, out var v) && v is not null)
        {
            try { return (T)Convert.ChangeType(v, typeof(T)); }
            catch { return fallback; }
        }
        return fallback;
    }

    public string? ParamString(string name) => Params.TryGetValue(name, out var v) ? v?.ToString() : null;
}

/// <summary>Canal de progresso ao vivo — vira eventos Stage/Log no stream gRPC.</summary>
public interface ICapabilityProgress
{
    /// <param name="percent">0..100, ou -1 se indeterminado.</param>
    void Stage(int percent, string message);
    void Log(string line);
}

/// <summary>Resultado de uma capacidade.</summary>
public sealed class CapabilityResult
{
    public bool Ok { get; private init; }
    public string? ErrorCode { get; private init; }
    public bool RebootRequired { get; private init; }

    /// <summary>Dados estruturados para a UI (ipconfig, processos, ping…). Vira result_json.</summary>
    public IReadOnlyDictionary<string, object?> Data { get; private init; } =
        new Dictionary<string, object?>();

    public static CapabilityResult Success(
        IReadOnlyDictionary<string, object?>? data = null, bool rebootRequired = false) => new()
    {
        Ok = true,
        Data = data ?? new Dictionary<string, object?>(),
        RebootRequired = rebootRequired,
    };

    public static CapabilityResult Failure(string errorCode) => new()
    {
        Ok = false,
        ErrorCode = errorCode,
    };
}

/// <summary>Erros transversais (batem com commonErrorCodes do registry).</summary>
public static class CommonErrors
{
    public const string Denied = "denied";
    public const string Timeout = "timeout";
    public const string Cancelled = "cancelled";
    public const string Unexpected = "unexpected";
}
