using System.Text.Json;

namespace ConvergasControl.Agent;

/// <summary>Um registro imutável de execução (gravado em disco para auditoria).</summary>
public sealed record AuditRecord(
    string Timestamp, string ExecutionId, string SkillId, string SkillName,
    string Status, string? ErrorCode, bool Elevated, long DurationMs, bool RebootRequired, string Message);

/// <summary>
/// Log de auditoria append-only em JSONL, em %ProgramData%\ConvergasControl\logs.
/// Toda Skill executada deixa rastro (quem/o quê/quando/resultado) — base para o log
/// central da nuvem (Fase 4) e requisito de um produto de execução responsável.
/// </summary>
public sealed class AuditLog
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly object _lock = new();
    private readonly ILogger<AuditLog> _log;

    public string FilePath { get; }

    public AuditLog(ILogger<AuditLog> log)
    {
        _log = log;
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "ConvergasControl", "logs");
        Directory.CreateDirectory(dir);
        FilePath = Path.Combine(dir, "executions.jsonl");
    }

    public void Append(AuditRecord record)
    {
        try
        {
            var line = JsonSerializer.Serialize(record, Json) + "\n";
            lock (_lock) File.AppendAllText(FilePath, line);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Falha ao gravar auditoria");
        }
    }

    /// <summary>Últimos N registros, do mais recente para o mais antigo.</summary>
    public IReadOnlyList<AuditRecord> Tail(int limit)
    {
        try
        {
            if (!File.Exists(FilePath)) return Array.Empty<AuditRecord>();
            List<string> lines;
            lock (_lock) lines = File.ReadLines(FilePath).ToList();

            var list = new List<AuditRecord>();
            foreach (var l in lines.Skip(Math.Max(0, lines.Count - limit)))
            {
                if (string.IsNullOrWhiteSpace(l)) continue;
                try { if (JsonSerializer.Deserialize<AuditRecord>(l, Json) is { } r) list.Add(r); }
                catch { /* linha corrompida ignorada */ }
            }
            list.Reverse();
            return list;
        }
        catch { return Array.Empty<AuditRecord>(); }
    }
}
