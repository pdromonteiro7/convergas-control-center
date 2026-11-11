using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace ConvergasControl.Agent;

public sealed record Destination(string Id, string Label);
public sealed record AiResult(string Reply, string? SkillId, string? SkillName, string? ParamsJson, string? NavigateTo);

/// <summary>
/// Orquestrador do Vergas. Manda o problema + catálogo de Skills (tool select_skill) + destinos
/// de navegação (tool navigate) ao Groq. O modelo só consegue escolher uma Skill existente OU
/// um destino existente — nunca um comando cru nem uma tela inventada.
/// </summary>
public sealed class AiService
{
    private const string Endpoint = "https://api.groq.com/openai/v1/chat/completions";
    private readonly HttpClient _http;
    private readonly AiConfig _config;
    private readonly SkillCatalog _catalog;

    public AiService(HttpClient http, AiConfig config, SkillCatalog catalog)
    {
        _http = http;
        _config = config;
        _catalog = catalog;
    }

    public async Task<AiResult> AskAsync(string message, IReadOnlyList<Destination> destinations, CancellationToken ct)
    {
        if (!_config.Configured)
            return new AiResult("A IA ainda não foi configurada (falta a chave do Groq).", null, null, null, null);

        var skills = _catalog.Skills.ToList();
        var skillIds = new JsonArray(skills.Select(s => (JsonNode)s.Id).ToArray());
        var catalogText = string.Join("\n", skills.Select(s => $"- {s.Id}: {s.Name} — {s.Description}"));

        var tools = new JsonArray
        {
            Tool("select_skill", "Executa uma AÇÃO de TI (Skill) para resolver um problema do usuário.", new JsonObject
            {
                ["skillId"] = new JsonObject { ["type"] = "string", ["enum"] = skillIds },
                ["reason"] = new JsonObject { ["type"] = "string", ["description"] = "Mensagem curta e amigável NO SEU PERSONAGEM (Vergas): reconheça o problema e proponha a ação. 1 ou 2 frases." },
                ["params"] = new JsonObject { ["type"] = "object", ["description"] = "Parâmetros opcionais, ex.: {\"target\":\"8.8.8.8\"}." },
            }, "skillId", "reason"),
        };

        var navText = "";
        if (destinations.Count > 0)
        {
            var navIds = new JsonArray(destinations.Select(d => (JsonNode)d.Id).ToArray());
            navText = "\n\nTelas/abas que você pode ABRIR (ferramenta navigate):\n" +
                      string.Join("\n", destinations.Select(d => $"- {d.Id}: {d.Label}"));
            tools.Add(Tool("navigate", "Abre uma tela/aba do sistema (ou um link externo) quando o usuário pede para ir, ver ou abrir algo.", new JsonObject
            {
                ["target"] = new JsonObject { ["type"] = "string", ["enum"] = navIds },
                ["message"] = new JsonObject { ["type"] = "string", ["description"] = "Fala curta no personagem confirmando que está abrindo." },
            }, "target", "message"));
        }

        var body = new JsonObject
        {
            ["model"] = _config.Model,
            ["temperature"] = 0.6,
            ["messages"] = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] =
                    _config.Persona + "\n\n" +
                    "VOCÊ CONTROLA O SISTEMA ConvergasControl. Pode: (1) resolver problemas executando uma AÇÃO " +
                    "com select_skill; (2) ABRIR telas/abas do sistema com navigate quando o usuário pedir para " +
                    "ir/ver/abrir algo (links externos você apenas abre). Se for só conversa, responda em texto. " +
                    "NUNCA invente comandos, telas ou ações fora das listas. Escreva sempre na sua voz — caloroso, " +
                    "específico, nunca seco ou robótico.\n\nAções (select_skill):\n" + catalogText + navText },
                new JsonObject { ["role"] = "user", ["content"] = message },
            },
            ["tool_choice"] = "auto",
            ["tools"] = tools,
        };

        var payload = body.ToJsonString();

        async Task<HttpResponseMessage?> SendOnceAsync()
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.GroqApiKey);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            try { return await _http.SendAsync(req, ct); } catch { return null; }
        }

        // 1 retry: a API grátis do Groq às vezes devolve 400/429 esporádico.
        var resp = await SendOnceAsync();
        if (resp is null || !resp.IsSuccessStatusCode)
        {
            resp?.Dispose();
            try { await Task.Delay(500, ct); } catch { }
            resp = await SendOnceAsync();
        }
        if (resp is null)
            return new AiResult("Não consegui falar com a IA agora. Tente de novo.", null, null, null, null);

        var txt = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            return new AiResult($"A IA retornou erro ({(int)resp.StatusCode}). Tente de novo em instantes.", null, null, null, null);

        try
        {
            var msg = JsonNode.Parse(txt)?["choices"]?[0]?["message"];
            var call = msg?["tool_calls"]?.AsArray() is { Count: > 0 } tc ? tc[0] : null;
            if (call is not null)
            {
                var name = call["function"]?["name"]?.GetValue<string>();
                var args = JsonNode.Parse(call["function"]?["arguments"]?.GetValue<string>() ?? "{}")!.AsObject();

                if (name == "navigate")
                {
                    var target = args["target"]?.GetValue<string>();
                    var m = args["message"]?.GetValue<string>();
                    if (!string.IsNullOrEmpty(target))
                        return new AiResult(m ?? "Abrindo…", null, null, null, target);
                }
                else if (name == "select_skill")
                {
                    var skillId = args["skillId"]?.GetValue<string>();
                    var reason = args["reason"]?.GetValue<string>();
                    var pars = args["params"] is JsonObject po && po.Count > 0 ? po.ToJsonString() : null;
                    var skill = skillId is null ? null : _catalog.Find(skillId);
                    if (skill is not null)
                        return new AiResult(reason ?? $"Bora resolver: {skill.Name}", skill.Id, skill.Name, pars, null);
                }
            }

            string? content = null;
            try { content = msg?["content"]?.GetValue<string>(); } catch { }
            return new AiResult(
                string.IsNullOrWhiteSpace(content)
                    ? "Opa! Aqui é o Vergas, da TI 😄 Me conta um perrengue de computador, rede ou impressora — ou peça pra eu abrir alguma tela do sistema."
                    : content!,
                null, null, null, null);
        }
        catch
        {
            return new AiResult("Recebi uma resposta inesperada da IA.", null, null, null, null);
        }
    }

    /// <summary>
    /// 2ª chamada: depois de executar uma Skill, o Vergas resume o resultado em linguagem humana
    /// (o que aconteceu + próximo passo prático). Sem ferramentas — só texto.
    /// </summary>
    public async Task<string?> SummarizeAsync(string skillName, string status, string? humanMessage, string? resultJson, CancellationToken ct)
    {
        if (!_config.Configured) return null;

        var okTxt = status == "SUCCESS" ? "concluída com sucesso" : status == "CANCELLED" ? "cancelada pelo usuário" : "falhou";
        var data = resultJson;
        if (!string.IsNullOrWhiteSpace(data) && data!.Length > 1400) data = data[..1400] + "…"; // corta payloads grandes

        var body = new JsonObject
        {
            ["model"] = _config.Model,
            ["temperature"] = 0.5,
            ["messages"] = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] =
                    _config.Persona + "\n\n" +
                    "Uma AÇÃO de TI acabou de rodar. Resuma o resultado para o usuário LEIGO em 1 ou 2 frases curtas, " +
                    "na sua voz (calorosa, direta). Diga em bom português o que aconteceu e, se fizer sentido, o próximo " +
                    "passo prático (ex.: \"tenta abrir o site de novo\"). NÃO use jargão nem despeje dados técnicos crus." },
                new JsonObject { ["role"] = "user", ["content"] =
                    $"Ação: {skillName}\nResultado: {okTxt}\nMensagem do sistema: {humanMessage}\n" +
                    (string.IsNullOrWhiteSpace(data) ? "" : $"Dados: {data}") },
            },
        };
        var payload = body.ToJsonString();

        async Task<HttpResponseMessage?> SendAsync()
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.GroqApiKey);
            req.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            try { return await _http.SendAsync(req, ct); } catch { return null; }
        }

        var resp = await SendAsync();
        if (resp is null || !resp.IsSuccessStatusCode) { resp?.Dispose(); return null; }
        var txt = await resp.Content.ReadAsStringAsync(ct);
        try
        {
            var content = JsonNode.Parse(txt)?["choices"]?[0]?["message"]?["content"]?.GetValue<string>();
            return string.IsNullOrWhiteSpace(content) ? null : content!.Trim();
        }
        catch { return null; }
    }

    private static JsonObject Tool(string name, string desc, JsonObject props, params string[] required) => new()
    {
        ["type"] = "function",
        ["function"] = new JsonObject
        {
            ["name"] = name,
            ["description"] = desc,
            ["parameters"] = new JsonObject
            {
                ["type"] = "object",
                ["properties"] = props,
                ["required"] = new JsonArray(required.Select(r => (JsonNode)r).ToArray()),
            },
        },
    };
}
