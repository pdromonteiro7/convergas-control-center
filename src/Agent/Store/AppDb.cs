using Microsoft.Data.Sqlite;

namespace ConvergasControl.Agent.Store;

/// <summary>
/// Banco local SQLite em %ProgramData%\ConvergasControl\data. Fonte da verdade local-first
/// das áreas do app (Frota, e futuramente Qualidade, Cofre, Licenças…). Substitui o
/// localStorage/IndexedDB do site antigo. A sincronização com a nuvem (Fase 4) é opcional.
/// </summary>
public sealed class AppDb
{
    public string Path { get; }
    private readonly string _connStr;

    public AppDb()
    {
        var dir = System.IO.Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "ConvergasControl", "data");
        Directory.CreateDirectory(dir);
        Path = System.IO.Path.Combine(dir, "convergascontrol.db");
        _connStr = new SqliteConnectionStringBuilder { DataSource = Path }.ToString();
        Init();
    }

    public SqliteConnection Open()
    {
        var c = new SqliteConnection(_connStr);
        c.Open();
        return c;
    }

    private void Init()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS computers (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                serial     TEXT,
                sector     TEXT,
                assignedTo TEXT,
                office     TEXT,
                antivirus  TEXT,
                status     TEXT,
                notes      TEXT,
                updatedAt  TEXT
            );

            -- Motor genérico: qualquer módulo (impressoras, licenças, certificados…)
            -- guardado aqui, com os campos serializados em JSON na coluna 'data'.
            CREATE TABLE IF NOT EXISTS entities (
                entity    TEXT NOT NULL,
                id        TEXT NOT NULL,
                data      TEXT,
                updatedAt TEXT,
                PRIMARY KEY (entity, id)
            );

            -- monitoramento: tentativas de acesso a domínios monitorados (contagem por dia)
            CREATE TABLE IF NOT EXISTS blockhits (
                machine  TEXT NOT NULL,
                domain   TEXT NOT NULL,
                day      TEXT NOT NULL,
                count    INTEGER NOT NULL DEFAULT 0,
                lastSeen TEXT,
                PRIMARY KEY (machine, domain, day)
            );
            """;
        cmd.ExecuteNonQuery();
    }
}
