using ConvergasControl.Agent;
using ConvergasControl.Agent.Capabilities;
using ConvergasControl.Agent.Store;
using Microsoft.AspNetCore.Server.Kestrel.Core;

const string PipeName = "ConvergasControlAgent";
const int UiPort = 8765; // loopback: UI web + REST/SSE

var builder = WebApplication.CreateBuilder(args);

// Roda como Serviço do Windows quando instalado; como console durante o desenvolvimento.
builder.Host.UseWindowsService();

builder.WebHost.ConfigureKestrel(o =>
{
    // IPC canônico UI↔Agent: gRPC sobre Named Pipe (sem porta TCP).
    o.ListenNamedPipe(PipeName, lo => lo.Protocols = HttpProtocols.Http2);
    // Transporte da UI web/Tauri: HTTP+SSE somente em loopback.
    o.ListenLocalhost(UiPort, lo => lo.Protocols = HttpProtocols.Http1);
});

var registry = CapabilityRegistry.Load();
var caps = CapabilityCatalog.Default();
var elevated = AgentGrpcService.IsElevated();

builder.Services.AddGrpc();
builder.Services.AddSingleton(registry);
builder.Services.AddSingleton(caps);
builder.Services.AddSingleton<AuditLog>();
builder.Services.AddSingleton<AppDb>();
builder.Services.AddSingleton<ComputersRepo>();
builder.Services.AddSingleton<EntityRepo>();
builder.Services.AddSingleton<FileStore>();
builder.Services.AddSingleton<Seeder>();
builder.Services.AddSingleton<PolicyStore>();
builder.Services.AddSingleton<PolicyService>();
builder.Services.AddHostedService<PolicyScheduler>();
builder.Services.AddSingleton<AlertsService>();
builder.Services.AddSingleton<AttemptsRepo>();
builder.Services.AddHostedService<AttemptCollector>();
builder.Services.AddSingleton<AiConfig>();
builder.Services.AddHttpClient<AiService>();
builder.Services.AddSingleton(sp => SkillCatalog.Load(
    Path.Combine(AppContext.BaseDirectory, "skills"),
    registry,
    sp.GetRequiredService<ILogger<SkillCatalog>>()));

var app = builder.Build();

// Falha rápida: o catálogo compilado precisa bater EXATAMENTE com o registry.
var problems = caps.Reconcile(registry);
if (problems.Count > 0)
{
    foreach (var p in problems) app.Logger.LogCritical("Reconcile: {Problem}", p);
    throw new InvalidOperationException("Catálogo de capacidades diverge do capability-registry.json.");
}

app.UseDefaultFiles();
// Sem cache: a UI evolui rápido; o navegador sempre pega a versão atual (evita "sumiu o módulo").
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate",
});

app.MapGrpcService<AgentGrpcService>();
app.MapAgentApi(elevated);
app.MapDataApi();
app.MapEntityApi();
app.MapFilesApi();
app.MapPolicyApi();
app.MapAlertsApi();
app.MapAiApi();

// Popula os dados reais da Convergas na primeira execução.
app.Services.GetRequiredService<Seeder>().SeedIfNeeded();

var skills = app.Services.GetRequiredService<SkillCatalog>();
app.Logger.LogInformation(
    "ConvergasControl Agent pronto · {Caps} capacidades · {Skills} skills · elevado={Elev}",
    caps.Count, skills.Skills.Count, elevated);
app.Logger.LogInformation("UI em http://127.0.0.1:{Port}  ·  gRPC em \\\\.\\pipe\\{Pipe}", UiPort, PipeName);

app.Run();
