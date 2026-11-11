namespace ConvergasControl.Agent.Store;

/// <summary>Um campo de um módulo (renderizado como coluna na tabela e input no formulário).</summary>
public sealed record FieldDef(string Key, string Label, string Type = "text", bool Required = false, string? Placeholder = null);

/// <summary>
/// Definição de um módulo de dados (uma "entidade"). O motor genérico usa isto para criar a
/// UI (tabela + formulário) e persistir em SQLite — sem código específico por módulo.
/// </summary>
public sealed record EntityDef(
    string Name, string Label, string Icon, string Area,
    IReadOnlyList<FieldDef> Fields, IReadOnlyList<string> ListColumns);

/// <summary>Catálogo dos módulos genéricos das áreas (T.I e Qualidade).</summary>
public static class EntityRegistry
{
    public static readonly IReadOnlyList<EntityDef> All = new List<EntityDef>
    {
        // ---------------- T.I ----------------
        new("printers", "Impressoras", "printer", "ti",
            new FieldDef[]
            {
                new("name", "Nome", Required: true, Placeholder: "Brother DCP-8157DN"),
                new("model", "Modelo"),
                new("ip", "IP", Placeholder: "192.168.0.x"),
                new("location", "Local"),
                new("type", "Tipo", Placeholder: "rede / usb"),
                new("driverUrl", "Link do driver", "url"),
                new("status", "Status", Placeholder: "ativo"),
            },
            new[] { "name", "model", "ip", "location", "status" }),

        new("phones", "Telefonia", "phone", "ti",
            new FieldDef[]
            {
                new("assignedTo", "Responsável", Required: true),
                new("sector", "Setor"),
                new("number", "Número"),
                new("model", "Aparelho"),
                new("plan", "Plano"),
                new("value", "Valor (R$)"),
                new("owner", "Titularidade"),
                new("notes", "Observações"),
            },
            new[] { "assignedTo", "number", "model", "plan", "sector" }),

        new("licenses", "Licenças", "key", "ti",
            new FieldDef[]
            {
                new("name", "Licença", Required: true, Placeholder: "Microsoft 365"),
                new("vendor", "Fornecedor"),
                new("seats", "Assentos", "number"),
                new("key", "Chave / conta"),
                new("renewal", "Renovação", "date"),
                new("cost", "Custo"),
                new("status", "Status", Placeholder: "ativa"),
            },
            new[] { "name", "vendor", "seats", "renewal", "status" }),

        new("team", "Equipe", "users", "ti",
            new FieldDef[]
            {
                new("name", "Nome", Required: true),
                new("sector", "Setor"),
                new("role", "Cargo"),
                new("email", "E-mail", "email"),
                new("phone", "Telefone"),
            },
            new[] { "name", "sector", "role", "email" }),

        new("inventory", "Inventário", "box", "ti",
            new FieldDef[]
            {
                new("item", "Item", Required: true),
                new("category", "Categoria"),
                new("quantity", "Qtd.", "number"),
                new("location", "Local"),
                new("assignedTo", "Responsável"),
                new("status", "Status"),
            },
            new[] { "item", "category", "quantity", "location", "status" }),

        // ------------- Qualidade -------------
        new("certificates", "Certificados", "award", "qualidade",
            new FieldDef[]
            {
                new("name", "Nome", Required: true),
                new("type", "Tipo", Placeholder: "CATA / Instrumento"),
                new("number", "Número"),
                new("process", "Processo"),
                new("tag", "Tag"),
                new("serial", "Série"),
                new("issueDate", "Emissão", "date"),
                new("expiryDate", "Validade", "date"),
                new("lab", "Laboratório"),
                new("status", "Status"),
                new("pdf", "PDF do certificado", "file"),
            },
            new[] { "name", "type", "number", "expiryDate" }),
    };

    public static EntityDef? Find(string name) =>
        All.FirstOrDefault(e => e.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
}
