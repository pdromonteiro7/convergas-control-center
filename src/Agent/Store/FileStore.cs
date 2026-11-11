using System.Text.RegularExpressions;

namespace ConvergasControl.Agent.Store;

/// <summary>
/// Armazenamento de ANEXOS dos módulos genéricos (ex.: PDF do certificado). Um arquivo por
/// (entidade, registro, campo). Os bytes ficam em disco em %ProgramData%\ConvergasControl\files,
/// fora do SQLite; o nome original vira o valor do campo no registro (para exibir/baixar).
/// Caminho: files\{entidade}\{id}\{campo}__{nomeOriginal}
/// </summary>
public sealed class FileStore
{
    public string Root { get; }

    public FileStore()
    {
        Root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "ConvergasControl", "files");
        Directory.CreateDirectory(Root);
    }

    // Segmentos de caminho vêm da rota/nome de arquivo → só permitimos caracteres seguros.
    private static string Safe(string s) => Regex.Replace(s ?? "", "[^A-Za-z0-9._-]", "_").Trim('.', ' ');

    private string Dir(string entity, string id) => Path.Combine(Root, Safe(entity), Safe(id));

    /// <summary>Salva (substituindo) o anexo do campo e devolve o nome original preservado.</summary>
    public async Task<string> SaveAsync(string entity, string id, string field, string originalName, Stream data, CancellationToken ct)
    {
        DeleteField(entity, id, field); // um arquivo por campo — remove o anterior
        var dir = Dir(entity, id);
        Directory.CreateDirectory(dir);
        var name = Safe(Path.GetFileName(originalName));
        if (string.IsNullOrWhiteSpace(name)) name = "arquivo";
        var path = Path.Combine(dir, $"{Safe(field)}__{name}");
        await using (var fs = File.Create(path))
            await data.CopyToAsync(fs, ct);
        return name;
    }

    /// <summary>Localiza o anexo do campo (caminho físico + nome original), se existir.</summary>
    public (string path, string name)? Find(string entity, string id, string field)
    {
        var dir = Dir(entity, id);
        if (!Directory.Exists(dir)) return null;
        var prefix = Safe(field) + "__";
        var hit = Directory.EnumerateFiles(dir, prefix + "*").FirstOrDefault();
        if (hit is null) return null;
        return (hit, Path.GetFileName(hit)[prefix.Length..]);
    }

    /// <summary>Remove o anexo de um campo. Devolve true se algo foi apagado.</summary>
    public bool DeleteField(string entity, string id, string field)
    {
        var found = Find(entity, id, field);
        if (found is null) return false;
        try { File.Delete(found.Value.path); } catch { return false; }
        return true;
    }

    /// <summary>Remove TODOS os anexos de um registro (ao excluir o registro).</summary>
    public void DeleteAll(string entity, string id)
    {
        var dir = Dir(entity, id);
        if (Directory.Exists(dir)) { try { Directory.Delete(dir, recursive: true); } catch { } }
    }
}
