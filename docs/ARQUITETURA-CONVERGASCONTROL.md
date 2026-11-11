# ConvergasControl — Arquitetura da Plataforma Desktop Profissional

> Documento de proposta (v1). Nada foi implementado. Objetivo: definir a arquitetura,
> justificar as decisões técnicas e apresentar o plano de migração do sistema atual
> (site estático de biblioteca de comandos) para a nova plataforma "clique e resolva".

---

## 1. Visão e o princípio que muda tudo

Hoje o produto **orienta**. Amanhã ele **executa com segurança**.

A mudança central não é "colocar em Electron". É introduzir um **componente que executa
ações no Windows** — e, com ele, um **problema de segurança novo**: se algo pode executar,
esse algo vira alvo. Toda a arquitetura abaixo gira em torno de **um único princípio**:

> **O sistema nunca interpreta comandos arbitrários. Ele só sabe executar uma lista
> fechada, assinada e auditada de _capacidades_. A IA e a web apenas escolhem, dentro
> dessa lista, o que rodar — nunca escrevem o "o quê".**

Isso é o que separa um produto profissional (NinjaOne, Action1, Atera) de um "executador
de scripts" perigoso. Guardem esta frase; ela justifica 80% das decisões técnicas.

---

## 1.1 O app INTEIRO vira desktop: 1 instalador, 2 binários

Não é só a biblioteca de comandos que vira `.exe`. **Todo** o ConvergasControl atual —
áreas **QUALIDADE** (certificados CATA/instrumentos + PDFs), **T.I** (frota PC00–PC30,
impressoras, telefonia, licenças, cofre, inventário), **SISTEMAS**, a roda central, dark/
light — passa a viver **dentro da casca Tauri**, como aplicativo nativo instalado. É a mesma
UI web de hoje, sem a aba do navegador.

**Tecnicamente são 2 binários, empacotados em 1 instalador** (`ConvergasControl-Setup`):

| Binário | Papel | Privilégio |
|---|---|---|
| `ConvergasControl.exe` | A UI (Tauri) — **todo** o app + Skills + IA | sessão do usuário, **sem** privilégio |
| `ConvergasControl Agent` | Serviço Windows em segundo plano | executa ações privilegiadas |

Para o usuário é **um programa só**: um ícone, uma janela. Os dois binários existem apenas
porque a UI (superfície exposta) **não pode** executar ações privilegiadas com segurança —
quem executa é o Agent, e a UI só **pede**. Unificar tudo num `.exe` só significaria dar
poder de execução à UI, destruindo a blindagem da §1.

- Áreas **sem execução** (Qualidade, Cofre, Licenças, Frota…) rodam 100% na UI, **sem** Agent.
- O Agent só entra quando há uma **Skill** para rodar ou métrica de **Saúde do PC** a coletar.

**Dados locais:** hoje `localStorage` + PDFs em IndexedDB → no desktop viram **SQLite**
(metadados) + **arquivos em disco** (PDFs). Sem limite de storage do navegador; backup =
copiar uma pasta. A **Plataforma Web** (Fase 4) é camada **opcional** de sync por cima —
o desktop é **local-first** e funciona offline.

---

## 2. Componentes (visão macro)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          PLATAFORMA WEB (nuvem)                            │
│  ASP.NET Core API + SignalR  ·  catálogo de Skills (fonte da verdade)      │
│  registro de dispositivos · logs/telemetria · RBAC · feed de updates      │
│  Orquestrador de IA (tool-use restrito ao catálogo)                       │
└───────▲───────────────────────────────────────────────────────▲───────────┘
        │ HTTPS/WebSocket (saída, autenticado por cert)          │ HTTPS
        │                                                        │
┌───────┴────────────────────┐                        ┌──────────┴───────────┐
│   MÁQUINA WINDOWS (endpoint)│                        │  ADMIN (navegador)   │
│                             │                        │  Web.Admin (SPA)     │
│  ┌───────────────────────┐  │                        │  catálogo, frota,    │
│  │ Desktop App (UI)      │  │                        │  logs, IA, releases  │
│  │ sessão do usuário     │  │                        └──────────────────────┘
│  │ SEM privilégio        │  │
│  └──────────▲────────────┘  │
│             │ gRPC local     │   ← named pipe com ACL (só executa quem pode)
│  ┌──────────┴────────────┐  │
│  │ AGENT (Windows Service)│  │   ← ÚNICO que toca o Windows
│  │ LocalSystem            │  │   ← allow-list de capacidades assinadas
│  │ motor de Skills        │  │   ← monitor CPU/RAM/disco/rede
│  │ auditoria + telemetria │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

Quatro peças, responsabilidades separadas:

1. **Agent (Windows Service, .NET 9)** — o **único** componente autorizado a executar
   ações e a coletar métricas. Roda em segundo plano como serviço (`LocalSystem` ou conta
   de serviço dedicada). É a **fronteira de segurança**.
2. **Desktop App (UI)** — roda na sessão do usuário, **sem privilégios elevados**. Não
   executa nada por conta própria: pede ao Agent via IPC local e mostra o progresso ao vivo.
   Aqui vivem: Saúde do PC, Skills, chat de IA.
3. **Plataforma Web (Backend + Admin)** — fonte da verdade do catálogo de Skills, registro
   da frota, logs, RBAC, distribuição de updates e o **orquestrador de IA**.
4. **IA** — traduz intenção do usuário → **seleção de Skill** com parâmetros tipados.
   Nunca gera comando; só escolhe dentro do catálogo.

**Por que separar UI e Agent?** Porque a UI é a superfície mais exposta (renderiza
conteúdo, fala com a rede). Mantê-la sem privilégios e isolar a execução no serviço
significa que comprometer a UI **não** dá poder de execução — o Agent só aceita Skills
válidas do catálogo assinado, não "faça X" cru.

---

## 3. O coração: modelo de Skills e Capacidades

Esta é a decisão mais importante do projeto. "Transformar cada comando em Skill" pode ser
feito de três formas — e só uma é segura **e** atualizável sem reinstalar tudo:

| Abordagem | Adiciona Skill sem atualizar Agent? | Seguro? | Veredito |
|---|---|---|---|
| A) Skill = código C# compilado no Agent | ❌ (precisa release) | ✅✅ | Rígido demais |
| B) Skill = script arbitrário (PowerShell) | ✅ | ❌ (é um interpretador) | Viola o princípio |
| **C) Híbrido: manifesto declarativo + capacidades compiladas assinadas** | ✅ (recombinação) | ✅✅ | **Escolhido** |

### 3.1 Capacidades (o vocabulário fechado)

Uma **Capacidade** é um bloco de execução **compilado e revisado** dentro de
`Agent.Capabilities`. É a única coisa que toca o Windows. Exemplos:

- `network.flushDns` → chama a rotina conhecida (`ipconfig /flushdns`) com args **fixos**.
- `network.winsockReset`, `network.renewIp`
- `service.restart(serviceName ∈ whitelist)` → ex.: Spooler
- `system.sfcScan`, `system.dismRestoreHealth`
- `office.repair(mode: quick|online)`
- `cleanup.temp(paths ∈ whitelist)`
- `policy.gpUpdate`
- `probe.systemInfo`, `probe.diskHealth`, `probe.network`

Repare: `flushdns` **não** é "rode esta string". É a capacidade `network.flushDns`, que
internamente executa a chamada conhecida com parâmetros **tipados e validados**. Nenhum
texto de comando trafega pela rede ou pela IA.

### 3.2 Skill (o manifesto declarativo, dado assinado)

Uma **Skill** é **dado** (JSON/YAML assinado), não código. Ela referencia capacidades por
id e descreve a experiência. Novas Skills que só **recombinam capacidades existentes** são
publicadas como dado — **sem novo release do Agent**. Só quando você precisa de uma
capacidade nova é que sai uma versão nova (assinada, revisada) do Agent.

```jsonc
{
  "id": "net.flush-dns",
  "name": "Limpar Cache DNS",
  "category": "Rede",
  "icon": "globe",
  "description": "Limpa o cache de resolução DNS. Use quando um site específico não carrega.",
  "requiresAdmin": false,
  "estimatedSeconds": 5,
  "steps": [
    { "capability": "network.flushDns" }
  ],
  "expected": "Cache DNS limpo com sucesso.",
  "onError": {
    "network.flushDns.denied": "Sem permissão para limpar o cache. Rode como administrador.",
    "default": "Não foi possível limpar o cache DNS. Veja o log."
  },
  "signature": "…"   // assinada pelo backend; o Agent rejeita se inválida
}
```

Skill composta (equivale aos "Runbooks" atuais):

```jsonc
{
  "id": "net.repair-full", "name": "Reparar Rede", "category": "Rede",
  "requiresAdmin": true, "estimatedSeconds": 90,
  "steps": [
    { "capability": "network.winsockReset" },
    { "capability": "network.renewIp" },
    { "capability": "network.flushDns" },
    { "capability": "system.rebootPrompt", "params": { "reason": "Aplicar reset de rede" } }
  ],
  "expected": "Pilha de rede reparada; reinício recomendado."
}
```

**Campos da Skill** (cobrindo o que você listou): `id, name, category, description,
requiresAdmin, estimatedSeconds, icon, steps[], expected, onError`. `steps` é a tradução
segura de "passos de execução": cada passo é **uma capacidade + parâmetros tipados**,
nunca um texto livre.

### 3.3 Invariante de segurança (por que isso é blindado)

- A IA recebe o catálogo como **schema de ferramentas**; ela só consegue emitir
  `{ skillId, params }` válidos. **É fisicamente incapaz** de mandar um comando cru.
- O backend pode ser comprometido e ainda assim não injeta código: o Agent **só carrega
  manifestos assinados** e **só executa capacidades que já existem no seu binário assinado**.
- Todo artefato executável (binário do Agent, biblioteca de capacidades, manifestos) é
  **code-signed**; o Agent verifica assinatura antes de carregar/rodar.

---

## 4. Comunicação

### 4.1 UI ↔ Agent (local) — gRPC sobre Named Pipe
- **Named pipe** com **ACL** restrita ao usuário interativo (a UI sem privilégio fala com o
  serviço privilegiado de forma controlada). Sem porta TCP aberta no localhost.
- **gRPC com streaming server-side**: a UI dispara `ExecuteSkill(skillId, params)` e recebe
  um **stream de eventos** (`Iniciando → Executando(%/log) → Finalizado(resultado)`) — é
  exatamente o "acompanhar em tempo real" que você descreveu.
- Contrato (`.proto`) compartilhado em `Shared.Contracts`.

### 4.2 Agent ↔ Backend (nuvem) — saída apenas, persistente
- **Conexão de saída** (HTTPS + **SignalR/WebSocket**). O Agent **nunca abre porta de
  entrada** — funciona atrás de NAT/firewall corporativo e reduz superfície de ataque.
- Autenticação por **certificado de dispositivo** emitido no *enrollment* (cadastro).
- Canal usado para: baixar catálogo/updates, enviar telemetria/logs, e (futuro) receber
  ordens remotas do admin ("rode Diagnóstico na PC12").

---

## 5. Auto-update (experiência Discord / VS Code)

- **Desktop App:** [**Velopack**](https://velopack.io) (sucessor moderno do Squirrel, feito
  para .NET) — updates **delta**, download em segundo plano, aplica no próximo start. Canais
  de release (`stable` / `beta`) e rollout gradual (rings).
- **Agent (serviço):** um **bootstrapper/updater** enxuto supervisiona o worker e troca o
  binário (serviço não pode se auto-substituir com o processo em uso). Só aceita pacote
  **assinado**; valida assinatura antes de aplicar; rollback se o health-check pós-update
  falhar.
- **Skills (dado):** sincronizadas continuamente pelo canal do backend — publicar uma Skill
  nova é instantâneo e **não** exige update de binário.

Resultado: três velocidades de atualização — Skills (instantâneo), Desktop (rápido, delta),
Agent (raro, assinado, com rollback). Igual aos apps que você citou.

---

## 6. Stack por componente

| Componente | Stack recomendada | Por quê |
|---|---|---|
| Agent | **.NET 9 Worker Service** | pedido; nativo p/ serviços Windows, WMI, P/Invoke |
| Capacidades | **.NET 9 lib assinada** | superfície de execução isolada e revisável |
| Contratos | **gRPC/protobuf + JSON Schema** | contrato único UI/Agent/Backend |
| Backend API | **ASP.NET Core 9 + SignalR** | mesma linguagem; real-time nativo |
| Banco | **PostgreSQL (Supabase)** | você já usa Supabase nos outros projetos |
| Web Admin | **SPA** (evolução do site atual) | reaproveita o design que já existe |
| IA | **Claude API (tool-use, schema restrito)** | você já usa Claude; force schema = zero comando cru |
| Desktop UI | **decisão em aberto — ver §7** | maior bifurcação do projeto |
| Packaging | **Velopack + MSIX/MSI** | instala serviço + app; auto-update |

---

## 7. A bifurcação: stack da UI Desktop

Você disse — com razão — que **não** quer "só embrulhar o React em Electron". Há dois
caminhos legítimos, e a escolha molda manutenção e visual para sempre:

### Opção A — Stack .NET unificada (Avalonia UI ou WinUI 3)
- **Tudo em C#**: Agent + Backend + Desktop uma só linguagem/tooling.
- Nativo, leve, sem runtime web embutido. Avalonia é maduro (usado pela JetBrains).
- ✅ Máxima "facilidade de manutenção" (um dev, uma linguagem).
- ❌ Você **reaprende** styling (XAML) — seu DNA de design premium é CSS/web.

### Opção B — Shell web-tech re-arquitetado (Tauri 2 + web UI)
- Casca **Tauri** (Rust, ~3–10 MB, nativo, auto-update) renderizando **sua UI web**.
- ✅ Reaproveita 100% do seu talento de design (CSS/animações/glass premium).
- ✅ **Não** é "só Electron": leve, seguro, a lógica pesada vive no Agent .NET.
- ❌ Adiciona Rust/JS ao lado do .NET (mais superfícies de manutenção).

> ✅ **DECIDIDO: Opção B — Tauri 2 + UI web.** Reaproveita 100% do seu talento de design
> premium (CSS/animações/glass). A UI é **cliente fino** — toda regra de negócio/execução
> mora no Agent .NET. A UI web atual (`css/styles.css`, tokens, ícones) migra praticamente
> direto para dentro da casca Tauri.

---

## 8. IA — orquestradora, nunca executora

Fluxo "Meu computador está lento":

```
usuário → Backend (Orquestrador IA)
         a IA recebe o CATÁLOGO como schema de ferramentas (tool-use Claude)
         → devolve um PLANO: { skillId: "sys.diagnose-full", params: {…}, motivo }
usuário confirma (UI mostra o que será feito, tempo, se pede admin)
         → UI pede ao Agent → Agent executa capacidades → stream de progresso
         → resultado volta → IA transforma em relatório em linguagem humana
```

Garantias:
- A IA **só** consegue emitir `skillId` + `params` válidos (schema estrito + validação no
  backend). Não existe caminho para "comando arbitrário".
- **Confirmação obrigatória** antes de qualquer Skill com `requiresAdmin` ou destrutiva.
- Catálogo enviado com **prompt caching** (barato e rápido a cada pergunta).

---

## 9. Segurança (resumo dos controles)

- **Executor único** (Agent) com **allow-list** de capacidades — não é interpretador.
- **Assinatura de código** em Agent, capacidades e manifestos; verificação antes de carregar.
- **IPC local** por named pipe com ACL; UI sem privilégio.
- **Canal de nuvem** só de saída, TLS, cert de dispositivo.
- **Auditoria imutável** de toda ação (quem/o quê/quando/resultado) — local + nuvem.
- **Menor privilégio**: Skills de admin explicitamente marcadas, confirmadas e logadas;
  política opcional de aprovação por Skill.
- **Confirmação de UX** para ações destrutivas.

---

## 10. Estrutura do repositório (monorepo modular)

```
ConvergasControl/
  src/
    Shared.Contracts/     # .proto (gRPC) + JSON Schema das Skills + DTOs
    Agent/                # Windows Service .NET 9 (host, IPC, telemetria)
    Agent.Capabilities/   # biblioteca ASSINADA — única que toca o Windows
    Agent.Updater/        # bootstrapper de auto-update do serviço
    Desktop/              # UI (Avalonia OU Tauri — §7)
    Backend.Api/          # ASP.NET Core + SignalR
    Backend.Core/         # domínio: catálogo, frota, RBAC, orquestração
    Ai.Orchestrator/      # seleção de Skill via tool-use
    Web.Admin/            # SPA de administração (evolução do site atual)
  skills/                 # manifestos declarativos assinados (dado, versionado)
  build/                  # assinatura, Velopack, MSIX, CI/CD
  docs/                   # este documento
```

---

## 11. Plano de migração (incremental, sem "big bang")

O site atual **não é jogado fora** — ele vira semente do catálogo e do Web.Admin.

| Fase | Entrega | O que valida |
|---|---|---|
| **0. Fundação** | Extrair os 12 comandos atuais → manifestos de Skill (`skills/`). Definir vocabulário inicial de capacidades. | O modelo de dados fecha com a realidade. |
| **1. Contratos** | `Shared.Contracts`: `.proto` do IPC + JSON Schema de Skill + DTOs. | Interface estável entre times/peças. |
| **2. Agent MVP** | Serviço + ~5 capacidades (flushDns, service.restart, sfc, dism, probe.systemInfo) + gRPC local. Testado por um CLI. | Execução real e segura ponta-a-ponta. |
| **3. Desktop MVP** | Casca UI: **Saúde do PC** (CPU/RAM/disco/rede) + lista de Skills + **Executar** + progresso ao vivo. 100% local, sem nuvem. | O "clique e resolva" + tempo real. |
| **4. Backend + frota** | API + enrollment + sync de catálogo + ingestão de logs. Site atual evolui para **Web.Admin**. | Multi-máquina, fonte da verdade central. |
| **5. Auto-update** | Velopack (Desktop) + updater (Agent) + pipeline de assinatura + canais/rings. | Atualização estilo Discord/VS Code. |
| **6. IA** | Orquestrador (tool-use sobre o catálogo) + loop confirmar → executar → relatório. | "Meu PC está lento" → Skill certa. |
| **7. Hardening** | Instalador MSIX/MSI (serviço + app), RBAC, telemetria, testes, política de aprovação. | Pronto para uso profissional. |

### Mapa "de → para"
- **Command Center (biblioteca de comandos)** → **Biblioteca de Skills** (executáveis).
- **Botão "Copiar"** → **Botão "Executar"** (+ stream de progresso).
- **Runbooks** → **Skills compostas** (vários passos/capacidades).
- **Módulos Equipe / Computadores / Impressoras / Inventário** → entidades no backend,
  **auto-descobertas** pelo Agent (hardware, hostname, impressoras) e geridas no Web.Admin.
- **localStorage** → PostgreSQL/Supabase (nuvem) + cache local no Agent.

---

## 12. Decisões travadas (2026-07-06)

1. **UI Desktop → Tauri 2 + UI web** (§7). Reaproveita o design premium atual.
2. **Escala → 1 admin, 1 máquina (MVP local primeiro).** Frota/backend só na Fase 4.
3. **Hospedagem → decidir na Fase 4.** As Fases 0–3 são 100% locais.

### Consequência: foco imediato é um MVP local ponta-a-ponta

Sem nuvem, sem enrollment, sem assinatura pesada agora. O alvo das próximas fases é:

```
[Tauri UI]  ──gRPC (named pipe)──►  [Agent .NET 9 Service]  ──►  Windows
   Skills + Saúde do PC + Executar        motor de Skills
   progresso ao vivo                      capacidades assináveis (assinatura entra na Fase 5)
```

> Assinatura de código, canal de nuvem, IA e auto-update continuam no desenho, mas entram
> nas Fases 5–6. O caminho crítico agora é: **contratos → Agent com ~5 capacidades →
> Tauri mostrando "Executar" com progresso real**.

### Roteiro imediato (revisado para MVP local)

| Fase | Entrega | Stack |
|---|---|---|
| **0** | 12 comandos atuais → manifestos de Skill (`skills/*.json`) + vocabulário inicial de capacidades documentado | dado (JSON) |
| **1** | `Shared.Contracts`: `.proto` do IPC UI↔Agent + JSON Schema da Skill | protobuf |
| **2** | Agent MVP: serviço .NET 9 + 5 capacidades (`flushDns`, `service.restart`, `sfc`, `dism`, `probe.systemInfo`) + gRPC local, testado por um CLI | .NET 9 |
| **3** | Desktop Tauri: Saúde do PC + lista de Skills + **Executar** + stream de progresso | Tauri + web |

Próximo passo sugerido: **Fase 0** — extrair os 12 comandos do `js/store.js` atual para
manifestos de Skill e fechar o vocabulário de capacidades. É barato, não quebra nada e
valida o modelo de dados contra a realidade.
