# Plano — Módulo "Programação" (Gestão & PCP) · Convergas Control Center

> Documento de plano. Nome do módulo ainda a definir (trabalhando com **"Programação"**;
> alternativas: "Gestão", "PCP"). Blueprint para execução e para circular internamente.
> Última revisão da visão: nov/2026.

---

## 1. Por que este sistema existe (o fundamento)

Hoje a Convergas tem dois problemas que o módulo resolve de uma vez:

1. **Operação no feeling.** Quando chega um pedido com prazo, quem responde "dá ou não dá"
   responde de cabeça — sem enxergar se a peça está livre (e não só "no estoque"), se a
   equipe está disponível e se dá tempo de comprar o que falta. O erro só aparece **no dia
   do serviço**, quando não dá mais pra corrigir.
2. **Controle de processo frágil para IATF 16949 / ISO 9001.** O planejamento de segunda é
   um Excel que muda, não guarda histórico e não prova nada ao auditor.

**A proposta:** um sistema onde **cada setor alimenta as próprias atividades**, o planejador
**apresenta em vez de atualizar**, **nenhum pedido é aceito sem uma análise de viabilidade**, e
**toda a evidência de controle de processo nasce automaticamente** (responsável, prazo, status,
histórico, RNC, parecer). A operação se organiza sozinha e a certificação vem de brinde.

### O que a Convergas ganha
- Para de prometer prazo que não fecha.
- Para de deixar caminhão/equipe parado esperando peça que não chegaria a tempo.
- Compra na hora certa (nem cedo demais, nem tarde demais).
- Não aloca a mesma pessoa em dois lugares no mesmo período.
- Decisão deixa de depender de "quem tem o estoque na cabeça".
- Aprende a duração real dos serviços e passa a sugerir prazos honestos.
- Gera evidência pronta para auditoria IATF/ISO.

---

## 2. Princípios de design (inegociáveis)

- **Robusto, nunca "simples".** Cada peça (inclusive a RNC) é feita no modo completo.
- **Lindo e óbvio.** Nível de UX premium: calendário com **cards arrastáveis** entre dias,
  3 vistas da mesma informação, mobile impecável (tab bar, listas-card, scroll-lock — padrão já
  estabelecido no Control Center).
- **Motor determinístico + IA que narra.** Os números e conflitos vêm de um motor matemático;
  a IA só **conversa e explica** — nunca inventa. Proteção contra alucinação em ambiente de fábrica.
- **Alimentação distribuída.** Cada pessoa atualiza o que é seu. Pra isso funcionar, o to-do
  individual tem que ser **genuinamente útil pra pessoa** — ela alimenta porque ganha com isso.
- **Decisão humana registrada.** A IA monta tudo e mostra o parecer; a pessoa **revisa e confirma**.
  Esse clique é a decisão documentada que a norma exige.

---

## 3. Onde vive e arquitetura

- **Nova área na roda** do Control Center (ao lado de T.I, Qualidade, Sistemas, Manutenção).
- **Stack atual, sem nada novo:** HTML/CSS/JS puro + `Store` (Supabase `ftwdwvthbigybggepcxn`
  + localStorage, offline-first). Herda dark/premium, tab bar mobile, listas-card, scroll-lock.
- **Motor portado do DayDay** (`lib/engine.ts`, `learning.ts`, `alerts.ts`) para um módulo JS puro
  `js/prog-engine.js` — a matemática é a mesma, só muda a casca.
- **Integração OMIE** via proxy serverless (`api/omie.js`), chaves só no Vercel (env).

---

## 4. Modelo de dados (coleções no Store → Supabase)

| Coleção | Campos principais |
|---|---|
| `progPessoas` | id, nome, funcao, setores[] (pode pertencer a +1), papel, ativo |
| `progSetores` | id, nome (Engenharia, Qualidade, TI, Produção, Compras) |
| `progFamilias` | id, nome, baselineDias, pessoasNecessarias |
| `progFornecedores` | id, nome, contato, leadTimeDias |
| `progEstoque` | pn, descricao, quantidade, atualizadoEm (**cache do OMIE**) |
| `progAtividades` | id, titulo, detalhe, responsavelId, **setoresVinculados[]**, prazo, status, pedidoId?, prioridade, comentarios[], anexos[], rncId? |
| `progPedidos` | id, titulo, cliente, produto, quantidade, ritmo, inicio, deadline, familiaId, equipeIds[], bom[], status, nivelSnapshot, parecer, concluidaEm? |
| `progRNC` | id, numero, data, registradoPor, origem, severidade, descricao, correcao, disposicao, causaRaiz, planoAcao[], verificacaoEficacia, status, evidencias[], historico[] |
| `progConfig` | leadTimeReposicaoPadrao, estoqueAtualizadoEm |

`planoAcao[]` (dentro da RNC) = linhas `{ acao, setorEnvolvido, responsavelId, prazo, status }`.

---

## 5. Módulos / telas

### 5.1 Atividades (a base viva)
- **Atividade** = trabalho do dia a dia. Campos: título, detalhe, **responsável**, **setores
  vinculados (1 ou vários)**, prazo, status (A fazer → Fazendo → Travada → Concluída), vínculo a
  um pedido (opcional), comentários/anexos (viram histórico/evidência), RNC vinculada (se houver).
- **Multi-setor:** a atividade aparece no To-do de **todos** os setores vinculados.
- **Três vistas da mesma informação:**
  - **Meu dia** — lista pessoal (o to-do que faz a pessoa querer usar).
  - **Quadro do setor** — Kanban por status, arrastável.
  - **Calendário** — semana; **arrastar o card de um dia para o outro** remarca o prazo.

### 5.2 Mesa do planejador (Lincoln)
- Visão **transversal** (todos os setores) já atualizada pelas pessoas.
- Substitui o Excel da reunião de segunda: ele **apresenta**, não atualiza.
- Visão da semana, prazos, andamento, agregado por pedido, e os alertas de "piorou sozinho".
- Gera a **ata automática** da reunião (o que foi revisado, pendências, decisões).

### 5.3 RNC — Registro de Não Conformidade (módulo robusto)
Qualquer atividade tem botão **"Abrir RNC"** (ou cria-se avulsa). A RNC é um módulo próprio,
com painel dedicado, no nível IATF 8.7 / 10.2:

| Parte | Conteúdo |
|---|---|
| Identificação | nº, data, quem registrou, **origem** (atividade/cliente/auditoria/processo), severidade |
| Descrição | o que é a não conformidade |
| Correção imediata | contenção (o apaga-incêndio) |
| Disposição | usar como está / retrabalhar / refugar / devolver |
| Causa raiz | 5 porquês / Ishikawa |
| **Plano de ação** | **várias linhas**: `ação · setor envolvido · responsável · prazo · status` |
| Verificação de eficácia | data + se resolveu de fato |
| Status geral | Aberta → Em análise → Em ação → Verificação → Fechada (eficaz / não eficaz) |
| Evidências + histórico | anexos e log datado |

- **Cada linha do plano de ação cai no painel de RNC do setor envolvido** — espaço separado das
  atividades normais ("minhas ações de RNC", com prazo e status). Uma RNC pode distribuir ações
  para Compras + Engenharia + Produção ao mesmo tempo (um 8D/5W2H colaborativo).
- A **Qualidade é a dona do fluxo** (acompanha e fecha).

### 5.4 Pedidos + motor de viabilidade
- Cadastro de pedido: cliente, produto, quantidade, **ritmo**, início, deadline, família, BOM.
- O motor avalia **no tempo (time-phased)** — não é janela única:
  - **Material mês a mês:** consumo × estoque × empenho × reposição. Ex.: "parafuso cobre até o
    3º mês; 4º–5º Compras pede até [data] (lead X)".
  - **Capacidade de equipe** por período.
  - **Choque entre demandas:** "este pedido empurra a obra X em 1 semana".
- Resultado: semáforo 🟢🟡🔴 + motivos + pendências com responsável/prazo.

### 5.5 IA por chat (a porta de entrada) — rota "conversar → criar → relatório"
1. Abre o **chat**, diz o que quer criar (pedido ou RNC).
2. A IA **entrevista** o que falta e **estuda o cenário real** (via motor + dados OMIE).
3. **Passa por todos os pontos** na conversa — conflitos, faltas, prazos, setores.
4. A pessoa **revisa e confirma** → a IA **cria o registro** estruturado.
5. Gera um **relatório anexado** ao registro:
   - **Pedido → "Parecer de Viabilidade":** veredito, material no tempo, capacidade de equipe,
     choque com outras demandas, pendências (responsável + prazo).
   - **RNC → rascunho do tratamento:** causa raiz sugerida, disposição, plano de ação pré-montado
     (ações, setores, prazos) pra Qualidade revisar.
- O relatório fica **salvo e carimbado** no registro → evidência de análise crítica / APQP.
- **Regra de ouro:** a IA conversa e estrutura; o motor acha os números. A IA narra, não inventa.

### 5.6 Integração OMIE (estoque)
- Proxy serverless `api/omie.js`; `OMIE_APP_KEY`/`OMIE_APP_SECRET` só no Vercel.
- Puxa posição de estoque e produtos; normaliza para `{pn, descricao, quantidade}`; grava em
  `progEstoque` com `atualizadoEm`.
- **O motor lê do cache** (não bate no OMIE a cada cálculo). Sync manual (botão) + cron diário depois.
- **Empenho fica local** (soma dos BOMs das obras firmes criadas aqui); o OMIE dá só o saldo físico.

---

## 6. Login e hierarquia

Dois eixos independentes:

**Eixo 1 — Papel (o que pode fazer):**

| Papel | Escopo |
|---|---|
| Colaborador | cria/atualiza as próprias atividades; vê o quadro do(s) seu(s) setor(es) |
| Líder de setor | tudo do setor; distribui e valida atividades; indicadores do setor |
| Planejador (Lincoln) | vê todos os setores; cadastra pedidos; roda viabilidade; conduz a reunião |
| Qualidade (transversal) | abre/trata/fecha RNC em qualquer setor; vê tudo (audita) |
| Admin / Diretoria | tudo + configurações + gestão de usuários |

**Eixo 2 — Setor (o que enxerga):** Engenharia / Qualidade / TI / Produção / Compras.
Uma pessoa pode pertencer a **mais de um setor**.

> **Pendências a definir com o Pedro (seção delicada):**
> 1. "Líder de setor" existe na prática, ou setor é plano?
> 2. Quem pode cadastrar pedido novo — só o planejador ou líderes também?
> 3. RNC: Qualidade **fecha**, ou o setor fecha e a Qualidade **valida a eficácia**?
> 4. Admin de usuários: só a diretoria ou TI também?
> 5. Confirmar: pessoa em +1 setor (atividade já é multi-setor).

---

## 7. Aderência IATF 16949 / ISO 9001 (o que o sistema cobre sozinho)

- **Controle de processo documentado** — atividades com responsável, prazo, status, histórico.
- **Análise crítica / reunião** — a mesa do planejador vira ata automática.
- **Produto não conforme (8.7)** — disposição registrada na RNC.
- **Ação corretiva (10.2)** — plano de ação com causa raiz, prazos e verificação de eficácia.
- **Planejamento / viabilidade (cheiro de APQP)** — parecer salvo em cada pedido.
- **Rastreabilidade** — tudo datado, com autor e evidências.

---

## 8. Fases de execução (ordem definida pelo Pedro)

- **Fase 1 — Dinâmica das atividades.** Área nova + modelo de dados + atividades multi-setor +
  as 3 vistas (Meu dia / Quadro / Calendário arrastável) + RNC completa com plano de ação por setor.
  *(Prova o valor e cria o hábito de alimentar o sistema.)*
- **Fase 2 — Rota de cadastro de pedidos.** Pedido + motor de viabilidade time-phased +
  cadastros (famílias, fornecedores, equipe) + mesa do planejador + alertas de reavaliação.
- **Fase 3 — IA + OMIE.** Proxy OMIE (estoque real) + chat "conversar → criar → relatório"
  (parecer de viabilidade / rascunho de RNC).

Login/hierarquia entra assim que as 5 pendências forem decididas (pode ser no início da Fase 1).

---

## 9. Riscos e fatores de sucesso

- **Risco nº 1 — adoção.** Se a alimentação virar "obrigação pro chefe ver", morre. Mitigação:
  o to-do individual tem que ser bom pra pessoa (organiza o dia dela). É princípio de design, não detalhe.
- **Qualidade do de-para OMIE.** O cruzamento só funciona se o PN do BOM casar com o código do
  produto OMIE. Precisa confirmar qual campo é o "PN".
- **Dados iniciais.** Famílias (baseline/pessoas), fornecedores (lead time) e equipe precisam ser reais.

---

## 10. O que preciso do Pedro para destravar

1. Respostas das **5 pendências de hierarquia** (seção 6).
2. **OMIE:** `app_key` + `app_secret`, método de posição de estoque usado, e **qual campo é o PN**.
3. **De onde vem o BOM** de cada pedido (Excel ou estrutura de produto no OMIE?).
4. Dados reais iniciais: **famílias de serviço, fornecedores, equipe de campo**.
5. Nome definitivo do módulo.
