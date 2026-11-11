namespace ConvergasControl.Agent.Capabilities;

/// <summary>Catálogo em memória das capacidades compiladas. É a lista fechada de execução.</summary>
public sealed class CapabilityCatalog
{
    private readonly Dictionary<string, ICapability> _caps;

    public CapabilityCatalog(IEnumerable<ICapability> caps) =>
        _caps = caps.ToDictionary(c => c.Id, StringComparer.Ordinal);

    public bool TryGet(string id, out ICapability cap) => _caps.TryGetValue(id, out cap!);
    public IReadOnlyCollection<string> Ids => _caps.Keys;
    public int Count => _caps.Count;

    /// <summary>As 15 capacidades implementadas.</summary>
    public static CapabilityCatalog Default() => new(new ICapability[]
    {
        // probe.*
        new SystemInfoCapability(),
        new ListProcessesCapability(),
        new GetIpConfigCapability(),
        new HealthSnapshotCapability(),
        // network.*
        new FlushDnsCapability(),
        new RenewIpCapability(),
        new WinsockResetCapability(),
        new PingCapability(),
        // system.*
        new SfcScanCapability(),
        new DismRestoreHealthCapability(),
        new ChkdskCapability(),
        new RebootPromptCapability(),
        new SetWallpaperCapability(),
        new ScreenshotCapability(),
        new LockWorkstationCapability(),
        new RestartCapability(),
        new ShutdownCapability(),
        new RustDeskIdCapability(),
        // service.* / office.* / policy.*
        new ServiceRestartCapability(),
        new OfficeRepairCapability(),
        new GpUpdateCapability(),
        new ApplyWebBlockCapability(),
        new RemoveWebBlockCapability(),
    });

    /// <summary>
    /// Confere que o catálogo compilado bate EXATAMENTE com o capability-registry.json:
    /// nenhuma capacidade declarada sem implementação, nenhuma implementação fora do registry.
    /// </summary>
    public IReadOnlyList<string> Reconcile(CapabilityRegistry registry)
    {
        var problems = new List<string>();
        foreach (var id in registry.Capabilities.Keys)
            if (!_caps.ContainsKey(id))
                problems.Add($"registry declara '{id}' mas não há implementação");
        foreach (var id in _caps.Keys)
            if (!registry.Capabilities.ContainsKey(id))
                problems.Add($"implementação '{id}' não está no registry");
        return problems;
    }
}
