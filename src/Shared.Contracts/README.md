# Shared.Contracts

Contratos compartilhados entre **UI (Tauri)**, **Agent (.NET 9)** e o **catálogo de Skills**.
Esta pasta é a **fonte da verdade** das interfaces — todos os componentes geram código a
partir daqui.

```
schema/
  capability-registry.json   Fonte da verdade das 15 capacidades (params tipados, admin,
                             whitelists, códigos de erro). O Agent carrega isto (Fase 2).
  skill.schema.json          JSON Schema (2020-12) que valida os manifestos skills/*.json.
proto/
  agent.v1.proto             Contrato gRPC UI↔Agent (Named Pipe): listar, executar com
                             progresso em stream, cancelar, saúde do PC, info do agent.
tools/
  validate-skills.mjs        Validador offline (schema + registry). Sem dependências.
```

## Como as peças se encaixam

```
skills/*.json ──valida──►  skill.schema.json  +  capability-registry.json
     │                                                    │
     │ (Agent carrega)                                    │ (Agent implementa)
     ▼                                                    ▼
  Agent (.NET 9)  ◄── gRPC (agent.v1.proto) ──►  UI (Tauri)
```

- A **Skill** é dado; só referencia `capability` do registry. Params são **tipados e
  validados** contra o registry — inclusive **whitelists** (ex.: `service.restart` só aceita
  `Spooler`). Nenhum manifesto consegue pedir algo fora da lista.
- O **`.proto`** define o fluxo de execução que o produto promete: `Accepted → Stage/Log(n)
  → Result`, mapeando as fases `INITIALIZING → RUNNING → FINALIZING` ("iniciando / executando
  / finalizado") e o `Result` final com mensagem humana + dados estruturados.

## Validar as Skills

```bash
node src/Shared.Contracts/tools/validate-skills.mjs
```

Confere estrutura (schema) **e** semântica (registry): tipos de params, params
obrigatórios, whitelists, coerência de `requiresAdmin`, `onError.default`, ids únicos.
Sai com código ≠ 0 em qualquer erro (pronto para CI). Roda só com Node, sem instalar nada.

## Geração de código (Fases 2–3)

- **Agent (.NET):** `Grpc.Tools` compila `agent.v1.proto` → stubs C# (server).
- **UI (Tauri):** cliente gRPC-web / `@grpc/grpc-js` (ou um bridge Rust) a partir do mesmo `.proto`.
- **Registry:** desserializado em objetos fortemente tipados no Agent; usado para validar
  params em runtime antes de executar qualquer capacidade.

## Versionamento

- `package` do proto é `convergascontrol.agent.v1` — mudanças incompatíveis sobem para `v2`.
- `capability-registry.json` tem `version`; o Agent expõe `catalog_version` em `AgentInfo`.
