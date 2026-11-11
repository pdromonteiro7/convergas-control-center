using Microsoft.Data.Sqlite;

namespace ConvergasControl.Agent.Store;

public sealed class Computer
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Serial { get; set; }
    public string? Sector { get; set; }
    public string? AssignedTo { get; set; }
    public string? Office { get; set; }
    public string? Antivirus { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public string? UpdatedAt { get; set; }
}

/// <summary>CRUD da Frota (tabela computers). Padrão replicável para as demais áreas.</summary>
public sealed class ComputersRepo
{
    private readonly AppDb _db;
    public ComputersRepo(AppDb db) => _db = db;

    public List<Computer> List()
    {
        using var c = _db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id,name,serial,sector,assignedTo,office,antivirus,status,notes,updatedAt FROM computers ORDER BY name COLLATE NOCASE";
        using var r = cmd.ExecuteReader();
        var list = new List<Computer>();
        while (r.Read()) list.Add(Map(r));
        return list;
    }

    public Computer Upsert(Computer x)
    {
        if (string.IsNullOrWhiteSpace(x.Id)) x.Id = Guid.NewGuid().ToString("N");
        x.UpdatedAt = DateTimeOffset.UtcNow.ToString("o");

        using var c = _db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            INSERT INTO computers (id,name,serial,sector,assignedTo,office,antivirus,status,notes,updatedAt)
            VALUES ($id,$name,$serial,$sector,$assignedTo,$office,$antivirus,$status,$notes,$updatedAt)
            ON CONFLICT(id) DO UPDATE SET
                name=$name, serial=$serial, sector=$sector, assignedTo=$assignedTo,
                office=$office, antivirus=$antivirus, status=$status, notes=$notes, updatedAt=$updatedAt;
            """;
        Bind(cmd, x);
        cmd.ExecuteNonQuery();
        return x;
    }

    public bool Delete(string id)
    {
        using var c = _db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "DELETE FROM computers WHERE id=$id";
        cmd.Parameters.AddWithValue("$id", id);
        return cmd.ExecuteNonQuery() > 0;
    }

    private static void Bind(SqliteCommand cmd, Computer x)
    {
        cmd.Parameters.AddWithValue("$id", x.Id);
        cmd.Parameters.AddWithValue("$name", x.Name);
        cmd.Parameters.AddWithValue("$serial", (object?)x.Serial ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$sector", (object?)x.Sector ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$assignedTo", (object?)x.AssignedTo ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$office", (object?)x.Office ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$antivirus", (object?)x.Antivirus ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$status", (object?)x.Status ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$notes", (object?)x.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$updatedAt", (object?)x.UpdatedAt ?? DBNull.Value);
    }

    private static Computer Map(SqliteDataReader r) => new()
    {
        Id = r.GetString(0),
        Name = r.GetString(1),
        Serial = r.IsDBNull(2) ? null : r.GetString(2),
        Sector = r.IsDBNull(3) ? null : r.GetString(3),
        AssignedTo = r.IsDBNull(4) ? null : r.GetString(4),
        Office = r.IsDBNull(5) ? null : r.GetString(5),
        Antivirus = r.IsDBNull(6) ? null : r.GetString(6),
        Status = r.IsDBNull(7) ? null : r.GetString(7),
        Notes = r.IsDBNull(8) ? null : r.GetString(8),
        UpdatedAt = r.IsDBNull(9) ? null : r.GetString(9),
    };
}
