using Microsoft.Data.Sqlite;

namespace ConvergasControl.Agent.Store;

public sealed record AttemptRow(string Domain, int Count, string LastSeen);

/// <summary>Persiste e agrega as tentativas de acesso a domínios monitorados (tabela blockhits).</summary>
public sealed class AttemptsRepo
{
    private readonly AppDb _db;
    public AttemptsRepo(AppDb db) => _db = db;

    /// <summary>Soma um lote de contagens (machine+domain+day). Upsert incremental.</summary>
    public void AddHits(string machine, string day, IReadOnlyDictionary<string, (int count, string lastSeen)> hits)
    {
        if (hits.Count == 0) return;
        using var c = _db.Open();
        using var tx = c.BeginTransaction();
        foreach (var (domain, v) in hits)
        {
            using var cmd = c.CreateCommand();
            cmd.CommandText = """
                INSERT INTO blockhits (machine, domain, day, count, lastSeen)
                VALUES ($m, $d, $day, $c, $l)
                ON CONFLICT(machine, domain, day) DO UPDATE SET count = count + $c, lastSeen = $l;
                """;
            cmd.Parameters.AddWithValue("$m", machine);
            cmd.Parameters.AddWithValue("$d", domain);
            cmd.Parameters.AddWithValue("$day", day);
            cmd.Parameters.AddWithValue("$c", v.count);
            cmd.Parameters.AddWithValue("$l", v.lastSeen);
            cmd.ExecuteNonQuery();
        }
        tx.Commit();
    }

    /// <summary>Tentativas de uma máquina desde um dia (agregado por domínio, mais frequentes primeiro).</summary>
    public List<AttemptRow> List(string machine, string sinceDay)
    {
        using var c = _db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            SELECT domain, SUM(count) AS c, MAX(lastSeen) AS l
            FROM blockhits WHERE machine = $m AND day >= $since
            GROUP BY domain ORDER BY c DESC;
            """;
        cmd.Parameters.AddWithValue("$m", machine);
        cmd.Parameters.AddWithValue("$since", sinceDay);
        using var r = cmd.ExecuteReader();
        var list = new List<AttemptRow>();
        while (r.Read())
            list.Add(new AttemptRow(r.GetString(0), r.GetInt32(1), r.IsDBNull(2) ? "" : r.GetString(2)));
        return list;
    }
}
