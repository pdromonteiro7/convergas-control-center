using System.IO.Pipes;
using System.Net.Security;
using System.Security.Principal;
using System.Text.Json;
using ConvergasControl.Agent.V1;
using Grpc.Core;
using Grpc.Net.Client;

// Cliente de teste do Agent (Fase 2). Conecta no Named Pipe e exercita o contrato gRPC.
// Uso:
//   ccctl                      → lista as skills
//   ccctl info                 → info do agent
//   ccctl run <skillId> [json] → executa uma skill e mostra o progresso ao vivo
//   ccctl health               → 5 amostras de saúde do PC

const string PipeName = "ConvergasControlAgent";

// h2c (HTTP/2 sem TLS) sobre o named pipe
AppContext.SetSwitch("System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport", true);

var handler = new SocketsHttpHandler
{
    ConnectCallback = async (_, ct) =>
    {
        var pipe = new NamedPipeClientStream(".", PipeName, PipeDirection.InOut,
            PipeOptions.WriteThrough | PipeOptions.Asynchronous, TokenImpersonationLevel.Anonymous);
        try { await pipe.ConnectAsync(ct); return pipe; }
        catch { await pipe.DisposeAsync(); throw; }
    }
};

using var channel = GrpcChannel.ForAddress("http://localhost", new GrpcChannelOptions { HttpHandler = handler });
var client = new AgentService.AgentServiceClient(channel);

var cmd = args.Length > 0 ? args[0].ToLowerInvariant() : "list";

try
{
    switch (cmd)
    {
        case "list": await ListAsync(); break;
        case "info": await InfoAsync(); break;
        case "run": await RunAsync(args); break;
        case "health": await HealthAsync(); break;
        default:
            Console.WriteLine("Comandos: list | info | run <skillId> [jsonOverride] | health");
            break;
    }
    return 0;
}
catch (RpcException ex) when (ex.StatusCode == StatusCode.Unavailable)
{
    Console.Error.WriteLine($"✗ Não foi possível conectar ao Agent (pipe '{PipeName}'). Ele está rodando?");
    Console.Error.WriteLine($"  {ex.Status.Detail}");
    return 2;
}
catch (RpcException ex)
{
    Console.Error.WriteLine($"✗ {ex.StatusCode}: {ex.Status.Detail}");
    return 1;
}

async Task ListAsync()
{
    var resp = await client.ListSkillsAsync(new ListSkillsRequest());
    Console.WriteLine($"{resp.Skills.Count} skills:\n");
    foreach (var s in resp.Skills)
        Console.WriteLine($"  {s.Id,-22} {(s.RequiresAdmin ? "[admin]" : "       ")} {s.Category,-12} {s.Name}");
}

async Task InfoAsync()
{
    var i = await client.GetAgentInfoAsync(new GetAgentInfoRequest());
    Console.WriteLine($"versão............: {i.Version}");
    Console.WriteLine($"catálogo (registry): v{i.CatalogVersion}");
    Console.WriteLine($"skills carregadas.: {i.SkillsLoaded}");
    Console.WriteLine($"elevado (admin)...: {i.ElevatedAvailable}");
}

async Task RunAsync(string[] a)
{
    if (a.Length < 2) { Console.Error.WriteLine("uso: run <skillId> [jsonOverride]"); return; }
    var req = new ExecuteSkillRequest
    {
        SkillId = a[1],
        ExecutionId = Guid.NewGuid().ToString("N"),
        AdminConfirmed = true,
        ParamsOverrideJson = a.Length > 2 ? a[2] : "",
    };

    using var call = client.ExecuteSkill(req);
    await foreach (var ev in call.ResponseStream.ReadAllAsync())
    {
        switch (ev.EventCase)
        {
            case ExecutionEvent.EventOneofCase.Accepted:
                Console.WriteLine($"▶ {ev.Accepted.SkillId} · {ev.Accepted.TotalSteps} passo(s)" +
                                  $"{(ev.Accepted.RequiresAdmin ? " · admin" : "")}");
                break;
            case ExecutionEvent.EventOneofCase.Stage:
                var pct = ev.Stage.Percent >= 0 ? $"{ev.Stage.Percent,3}%" : "  …";
                Console.WriteLine($"  [{ev.Stage.Phase.ToString().Replace("ExecutionPhase", "")} {pct}] {ev.Stage.Message}");
                break;
            case ExecutionEvent.EventOneofCase.Log:
                Console.WriteLine($"    | {ev.Log.Text}");
                break;
            case ExecutionEvent.EventOneofCase.Result:
                var r = ev.Result;
                var mark = r.Status == ExecutionStatus.Success ? "✔" : r.Status == ExecutionStatus.Cancelled ? "⊘" : "✗";
                Console.WriteLine($"\n{mark} {r.Status}: {r.HumanMessage}");
                if (!string.IsNullOrEmpty(r.ErrorCode)) Console.WriteLine($"  código: {r.ErrorCode}");
                if (r.RebootRequired) Console.WriteLine("  ⟳ reinício necessário");
                if (!string.IsNullOrEmpty(r.ResultJson)) Console.WriteLine("  dados: " + Pretty(r.ResultJson));
                break;
        }
    }
}

async Task HealthAsync()
{
    using var call = client.StreamHealth(new StreamHealthRequest { IntervalMs = 1000 });
    var n = 0;
    await foreach (var h in call.ResponseStream.ReadAllAsync())
    {
        var disks = string.Join("  ", h.Disks.Select(d => $"{d.Drive}{d.FreeGb}/{d.TotalGb}GB"));
        Console.WriteLine($"CPU {h.CpuPct,5:0.0}%  RAM {h.RamUsedMb}/{h.RamTotalMb}MB  {disks}");
        if (++n >= 5) break;
    }
}

static string Pretty(string json)
{
    try
    {
        using var doc = JsonDocument.Parse(json);
        return JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true });
    }
    catch { return json; }
}
