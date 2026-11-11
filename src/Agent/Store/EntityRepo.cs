using Microsoft.Data.Sqlite;

namespace ConvergasControl.Agent.Store;

public sealed record EntityRow(string Id, string Data, string UpdatedAt);

/// <summary>
/// Repositório GENÉRICO: guarda qualquer módulo numa única tabela `entities`, com os campos
/// serializados em JSON. Um repo, N módulos — o padrão SQLite da Frota generalizado.
/// </summary>
public sealed class EntityRepo
{
    private readonly AppDb _db;
    public EntityRepo(AppDb db) => _db = db;

    public List<EntityRow> List(string entity)
    {
        using var c = _db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id, data, updatedAt FROM entities WHERE entity=$e ORDER BY updatedAt DESC";
        cmd.Parameters.AddWithValue("$e", entity);
        using var r = cmd.ExecuteReader();
        var list = new List<EntityRow>();
        while (r.Read())
            list.Add(new EntityRow(r.GetString(0), r.IsDBNull(1) ? "{}" : r.GetString(1), r.IsDBNull(2) ? "" : r.GetString(2)));
        return list;
    }

    public (string id, string updatedAt) Upsert(string entity, string? id, string dataJson)
    {
        if (string.IsNullOrWhiteSpace(id)) id = Guid.NewGuid().ToString("N");
        var updatedAt = DateTimeOffset.UtcNow.ToString("o");

        using var c = _db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            INSERT INTO entities (entity, id, data, updatedAt)
            VALUES ($e, $id, $data, $u)
            ON CONFLICT(entity, id) DO UPDATE SET data=$data, updatedAt=$u;
            """;
        cmd.Parameters.AddWithValue("$e", entity);
        cmd.Parameters.AddWithValue("$id", id);
        cmd.Parameters.AddWithValue("$data", dataJson);
        cmd.Parameters.AddWithValue("$u", updatedAt);
        cmd.ExecuteNonQuery();
        return (id, updatedAt);
    }

    public bool Delete(string entity, string id)
    {
        using var c = _db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "DELETE FROM entities WHERE entity=$e AND id=$id";
        cmd.Parameters.AddWithValue("$e", entity);
        cmd.Parameters.AddWithValue("$id", id);
        return cmd.ExecuteNonQuery() > 0;
    }
}
