using System.Text.Json;

namespace ConvergasControl.Agent;

/// <summary>
/// Config da IA (chave do Groq) guardada FORA do código, em %ProgramData%\ConvergasControl\data\ai.json.
/// A IA é gratuita (Groq/Llama) e só orquestra Skills já registradas — nunca gera comandos.
/// </summary>
public sealed class AiConfig
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private readonly string _path;

    public const string DefaultPersona =
        "Você é o Vergas, o assistente de TI da Convergas. Fale como um colega de trabalho: " +
        "próximo, tranquilo, com bom humor leve e sem enrolação. Sempre em português do Brasil, " +
        "informal mas profissional. Antes de propor a ação, reconheça o problema do usuário em uma " +
        "frase curta e passe segurança. Seja objetivo (2 a 3 frases). Use no máximo 1 emoji, com moderação.";

    public string? GroqApiKey { get; set; }
    public string Model { get; set; } = "llama-3.3-70b-versatile";
    public string Persona { get; set; } = DefaultPersona;

    public bool Configured => !string.IsNullOrWhiteSpace(GroqApiKey);

    public AiConfig()
    {
        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "ConvergasControl", "data");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "ai.json");
        Load();
    }

    private sealed record AiFile(string? GroqApiKey, string? Model, string? Persona);

    private void Load()
    {
        try
        {
            if (!File.Exists(_path)) return;
            var c = JsonSerializer.Deserialize<AiFile>(File.ReadAllText(_path), Json);
            if (c is not null)
            {
                GroqApiKey = c.GroqApiKey;
                if (!string.IsNullOrWhiteSpace(c.Model)) Model = c.Model!;
                if (!string.IsNullOrWhiteSpace(c.Persona)) Persona = c.Persona!;
            }
        }
        catch { }
    }

    public void Save()
    {
        try { File.WriteAllText(_path, JsonSerializer.Serialize(new { GroqApiKey, Model, Persona }, Json)); } catch { }
    }
}
