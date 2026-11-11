/* ConvergasControl — Centro de Operações (shell por áreas + módulos, motor genérico) */
(() => {
  "use strict";

  // ---------- ícones ----------
  const P = {
    shield: '<path d="M12 3 5 6v5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6Z"/>',
    bolt: '<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"/>',
    lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 15v2.5"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    play: '<path d="M7 4.5 19 12 7 19.5Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.3M21 4v5h-5"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
    printer: '<path d="M6 9V3.5h12V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><rect x="6.5" y="14" width="11" height="6.5" rx="1"/><circle cx="17.5" cy="12" r=".9" fill="currentColor" stroke="none"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8Z"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>',
    book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v15.5H7.5A2.5 2.5 0 0 0 5 20z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 20H19"/>',
    phone: '<path d="M6.6 3.5 9 3.9l1 4-2 1.4a13 13 0 0 0 6.7 6.7l1.4-2 4 1 .4 2.4a2 2 0 0 1-2 2.3A17 17 0 0 1 4.3 5.5a2 2 0 0 1 2.3-2Z"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.5 12.5 9-9M16 6l3 3M14 8l2.5 2.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.5 14.4A5.5 5.5 0 0 1 20.5 19.4"/>',
    box: '<path d="M21 7.5 12 3 3 7.5l9 4.5 9-4.5Z"/><path d="M3 7.5v9L12 21V12M21 7.5v9L12 21"/>',
    external: '<path d="M15 3h6v6M21 3l-9 9M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
  };
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[n] || P.box}</svg>`;
  const applyIcons = (root = document) =>
    root.querySelectorAll("[data-icon]").forEach((el) => { if (!el.dataset.done) { el.innerHTML = svg(el.dataset.icon); el.dataset.done = "1"; } });

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = (s) => (s < 60 ? `${s}s` : `~${Math.round(s / 60)} min`);

  // ---------- estado ----------
  let SKILLS = [], SCHEMA = [], COMPUTERS = [];
  let cat = "Todas", query = "", fq = "";
  let current = null, currentAbort = null, editingId = null;
  let curArea = "ti", curModule = null;
  let curEntity = null, ENT_ROWS = [], entQuery = "", entEditingId = null;
  let AI_CONFIGURED = false;

  const AREAS = [
    { id: "qualidade", label: "QUALIDADE", icon: "award", desc: "Certificações e produção", seg: "var(--ok)" },
    { id: "ti", label: "T.I", icon: "cpu", desc: "Infraestrutura, suporte e ativos", seg: "var(--accent)" },
    { id: "sistemas", label: "SISTEMAS", icon: "grid", desc: "Outros sistemas (em breve)", seg: "var(--accent-2)" },
    { id: "manutencao", label: "MANUTENÇÃO", icon: "wrench", desc: "Chamados e ativos (em breve)", seg: "var(--warn)" },
    { id: "guideline", label: "GUIDELINE", icon: "book", desc: "Manual da Marca", seg: "#f5a623", external: "https://convergas-brand-guideline.vercel.app" },
  ];

  // ---------- shell: áreas + módulos ----------
  function modulesFor(area) {
    const fixed = {
      ti: [
        { id: "alerts", label: "Alertas", icon: "alert", kind: "alerts" },
        { id: "ai", label: "Assistente IA", icon: "chat", kind: "ai" },
        { id: "ops", label: "Saúde & Ações", icon: "bolt", kind: "ops" },
        { id: "fleet", label: "Frota", icon: "monitor", kind: "fleet" },
        { id: "policy", label: "Segurança", icon: "lock", kind: "policy" },
      ],
      qualidade: [],
      sistemas: [{ id: "soon", label: "Em breve", icon: "grid", kind: "soon" }],
      manutencao: [{ id: "soon", label: "Em breve", icon: "wrench", kind: "soon" }],
      guideline: [],
    }[area] || [];
    const ents = SCHEMA.filter((e) => e.area === area).map((e) => ({ id: e.name, label: e.label, icon: e.icon, kind: "entity", entity: e.name }));
    const tail = area === "ti" ? [{ id: "history", label: "Histórico", icon: "list", kind: "history" }] : [];
    return [...fixed, ...ents, ...tail];
  }

  function renderAreaTabs() {
    $("#areaTabs").innerHTML = AREAS.map((a) =>
      `<button class="navbtn ${a.id === curArea ? "active" : ""}" data-area="${a.id}">${svg(a.icon)} ${esc(a.label)}${a.external ? svg("external") : ""}</button>`).join("");
    $("#areaTabs").querySelectorAll("[data-area]").forEach((b) => (b.onclick = () => selectArea(b.dataset.area)));
  }

  function selectArea(id) {
    const area = AREAS.find((a) => a.id === id);
    if (area && area.external) { window.open(area.external, "_blank"); return; }
    curArea = id;
    renderAreaTabs();
    renderSidebar();
    const mods = modulesFor(curArea);
    if (mods.length) selectModule(mods[0]);
    else { document.querySelectorAll(".module").forEach((m) => (m.hidden = true)); }
  }

  function renderSidebar() {
    const mods = modulesFor(curArea);
    $("#sidebar").innerHTML = `<div class="grp">${esc(AREAS.find((a) => a.id === curArea)?.label || "")}</div>` +
      mods.map((m) => `<div class="sideitem ${m.id === curModule ? "active" : ""}" data-mod="${m.id}">${svg(m.icon)} ${esc(m.label)}</div>`).join("");
    $("#sidebar").querySelectorAll("[data-mod]").forEach((el) => (el.onclick = () => selectModule(mods.find((m) => m.id === el.dataset.mod))));
  }

  function selectModule(mod) {
    if (!mod) return;
    curModule = mod.id;
    renderSidebar();
    document.querySelectorAll(".module").forEach((m) => (m.hidden = true));
    const host = mod.kind === "entity" ? "mod-entity" : "mod-" + mod.kind;
    const el = document.getElementById(host);
    if (el) el.hidden = false;
    if (mod.kind === "fleet") loadComputers();
    else if (mod.kind === "history") loadHistory();
    else if (mod.kind === "entity") showEntity(mod.entity);
    else if (mod.kind === "policy") loadPolicy();
    else if (mod.kind === "alerts") refreshAlerts();
    else if (mod.kind === "ai") loadAi();
  }

  // ---------- Vergas: IA (módulo + painel flutuante, navega o sistema) ----------
  async function loadAi() {
    try {
      const s = await (await fetch("/api/ai/status")).json();
      $("#aiHint").textContent = s.configured ? "descreva o problema — eu escolho a ação certa" : "IA não configurada (falta a chave do Groq)";
      if (s.persona) $("#aiPersona").value = s.persona;
    } catch { }
    greet($("#aiChat"));
  }
  function greet(chatEl) {
    if (chatEl.dataset.init) return;
    chatEl.dataset.init = "1";
    bubble(chatEl, "assistant", "E aí! Aqui é o Vergas, da TI. 😄 Me conta um perrengue (\"um site não abre\", \"o PC tá lento\") ou peça pra eu abrir uma tela — tipo \"abre a Frota\" ou \"mostra o Guideline\".");
  }
  async function savePersona(text) {
    await fetch("/api/ai/persona", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: text }) });
    toast("Personalidade salva ✔");
  }
  function bubble(chatEl, role, text) {
    const d = document.createElement("div");
    d.className = "ai-msg " + role; d.textContent = text;
    chatEl.appendChild(d); chatEl.scrollTop = chatEl.scrollHeight; return d;
  }
  function buildDestinations() {
    const out = [];
    for (const a of AREAS) {
      if (a.external) { out.push({ id: "area:" + a.id, label: a.label + " (link externo)" }); continue; }
      for (const m of modulesFor(a.id)) out.push({ id: m.id, label: a.label + " › " + m.label });
    }
    return out;
  }
  function vergasNavigate(targetId) {
    if (targetId.startsWith("area:")) {
      const a = AREAS.find((x) => x.id === targetId.slice(5));
      if (a && a.external) { window.open(a.external, "_blank"); return; }
      if (a) { $("#home").classList.remove("show"); selectArea(a.id); return; }
    }
    for (const a of AREAS) {
      if (a.external) continue;
      const m = modulesFor(a.id).find((x) => x.id === targetId);
      if (m) { $("#home").classList.remove("show"); selectArea(a.id); selectModule(m); return; }
    }
  }
  async function askVergas(msg, chatEl) {
    if (!msg) return;
    bubble(chatEl, "user", msg);
    const typing = bubble(chatEl, "assistant", "…");
    try {
      const r = await (await fetch("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, destinations: buildDestinations() }) })).json();
      typing.remove();
      const b = bubble(chatEl, "assistant", r.reply || "…");
      if (r.navigateTo) { vergasNavigate(r.navigateTo); }
      else if (r.skillId && SKILLS.some((s) => s.id === r.skillId)) {
        const btn = document.createElement("button");
        btn.className = "btn primary sm";
        btn.innerHTML = svg("play") + " Executar: " + esc(r.skillName || r.skillId);
        btn.onclick = () => {
          openModal(r.skillId);
          if (r.paramsJson) { try { const p = JSON.parse(r.paramsJson); if (r.skillId === "diag.ping" && p.target) $("#paramInput").value = p.target; } catch { } }
        };
        b.appendChild(btn); applyIcons(b);
      }
    } catch { typing.remove(); bubble(chatEl, "assistant", "Não consegui falar com a IA agora."); }
  }
  function sendAi() { const inp = $("#aiMsg"), m = inp.value.trim(); inp.value = ""; askVergas(m, $("#aiChat")); }
  function sendDock() { const inp = $("#dockMsg"), m = inp.value.trim(); inp.value = ""; askVergas(m, $("#dockChat")); }
  function toggleDock() {
    const d = $("#aiDock");
    if (d.hidden) { d.hidden = false; greet($("#dockChat")); setTimeout(() => $("#dockMsg").focus(), 60); }
    else d.hidden = true;
  }

  // ---------- Central de Alertas ----------
  let ALERTS = null;
  async function refreshAlerts() {
    try { ALERTS = await (await fetch("/api/alerts")).json(); } catch { ALERTS = null; }
    renderAlertsPill();
    if (curModule === "alerts") renderAlerts();
  }
  function renderAlertsPill() {
    const p = $("#pillAlerts");
    if (!ALERTS) { p.hidden = true; return; }
    const n = ALERTS.counts.danger + ALERTS.counts.warn;
    if (n <= 0) { p.hidden = true; return; }
    p.hidden = false;
    p.classList.toggle("crit", ALERTS.counts.danger > 0);
    p.innerHTML = `<span data-icon="alert"></span> <b>${n}</b>&nbsp;alerta(s)`;
    applyIcons(p);
  }
  function renderAlerts() {
    if (!ALERTS) return;
    const c = ALERTS.counts, total = c.danger + c.warn + c.info;
    $("#alertsHint").textContent = total ? `${total} item(ns) precisando de atenção` : "tudo em dia";
    $("#alertsSummary").innerHTML = `
      <div class="sum-card danger"><div class="sc-n">${c.danger}</div><div class="sc-l">Críticos</div></div>
      <div class="sum-card warn"><div class="sc-n">${c.warn}</div><div class="sc-l">Avisos</div></div>
      <div class="sum-card ok"><div class="sc-n">${total === 0 ? "✓" : (c.info || 0)}</div><div class="sc-l">${total === 0 ? "Tudo em dia" : "Informativos"}</div></div>`;
    $("#alertsEmpty").hidden = total > 0;
    $("#alertsList").innerHTML = ALERTS.alerts.map((a) => `
      <div class="alert-row ${a.level}">
        <div class="a-ic">${svg(a.level === "danger" ? "alert" : a.level === "warn" ? "clock" : "activity")}</div>
        <div class="a-body"><div class="a-title">${esc(a.title)}</div><div class="a-detail">${esc(a.detail)}</div></div>
        <div class="a-cat">${esc(a.category)}</div>
      </div>`).join("");
    applyIcons($("#alertsList"));
  }
  function gotoAlerts() {
    $("#home").classList.remove("show");
    selectArea("ti");
    const m = modulesFor("ti").find((x) => x.id === "alerts");
    if (m) selectModule(m);
  }

  // ---------- Políticas de Acesso ----------
  let POLICY = null;
  async function loadPolicy() { try { POLICY = await (await fetch("/api/policy")).json(); } catch { POLICY = null; } renderPolicy(); loadAttempts(); }
  async function loadAttempts() { try { renderAttempts(await (await fetch("/api/policy/attempts")).json()); } catch { } }
  function renderAttempts(d) {
    const list = (d && d.attempts) || [];
    $("#attHint").textContent = `${d && d.machine ? d.machine : "esta máquina"} · hoje`;
    if (!list.length) { $("#attList").innerHTML = '<div class="sub" style="color:var(--txt-mut);padding:8px 2px">Nenhuma tentativa registrada hoje.</div>'; return; }
    const max = Math.max(...list.map((a) => a.count), 1);
    $("#attList").innerHTML = list.map((a) => `
      <div class="att-row">
        <div class="att-dom">${esc(a.domain)}</div>
        <div class="att-bar"><i style="width:${Math.round((a.count / max) * 100)}%"></i></div>
        <div class="att-n">${a.count}<small>×</small></div>
        <div class="att-t">${esc(a.lastSeen || "")}</div>
      </div>`).join("");
  }
  function renderPolicy() {
    if (!POLICY) { $("#polStatus").innerHTML = '<div class="sub">indisponível</div>'; return; }
    const on = POLICY.enabled;
    $("#polStatus").innerHTML = `<div class="metric"><div class="pol-head">
        <div class="pol-badge ${on ? "on" : "off"}">${svg(on ? "lock" : "check")} Bloqueio ${on ? "ATIVO agora" : "desativado"}</div>
        <div class="pol-actions">
          <button class="btn ${on ? "ghost" : "primary"}" id="polApply">${svg("lock")} Ativar agora</button>
          <button class="btn ${on ? "primary" : "ghost"}" id="polRemove">${svg("check")} Desativar agora</button>
        </div>
        <label class="pol-auto"><input type="checkbox" id="polAuto" ${POLICY.autoSchedule ? "checked" : ""}/>
          Aplicar automaticamente no expediente <b>${esc(POLICY.schedule)}</b></label>
      </div></div>
      <div class="lgpd-note" style="background:rgba(63,169,245,.08);border-color:rgba(63,169,245,.28);color:#9fc9f2;margin-top:12px">
        <span data-icon="alert"></span>
        <div>Ao <b>ativar/desativar</b>, o navegador pode segurar a política em cache. Se um site continuar bloqueado (ou liberado) por engano, <b>feche e reabra o navegador</b> — ou acesse <b>chrome://policy</b> / <b>edge://policy</b> → <b>Recarregar políticas</b>.</div>
      </div>`;
    $("#polApply").onclick = applyPolicy;
    $("#polRemove").onclick = removePolicy;
    $("#polCats").innerHTML = POLICY.categories.map((c, i) => `
      <div class="pol-cat">
        <label class="pol-cat-h"><input type="checkbox" data-ci="${i}" ${c.enabled ? "checked" : ""}/> <b>${esc(c.label)}</b></label>
        <div class="pol-doms">${c.domains.length ? c.domains.map((d, j) => `<span class="dom">${esc(d)}<button class="dom-x" data-ci="${i}" data-dj="${j}" title="Remover">×</button></span>`).join("") : '<span style="font-size:12px;color:var(--txt-mut)">nenhum site</span>'}</div>
        <div class="dom-add"><input placeholder="adicionar site (ex.: olx.com.br)" data-add="${i}" /><button class="btn sm" data-addbtn="${i}">＋</button></div>
      </div>`).join("");
    $("#polCats").querySelectorAll("[data-dj]").forEach((b) => (b.onclick = () => removeDomain(+b.dataset.ci, +b.dataset.dj)));
    $("#polCats").querySelectorAll("[data-addbtn]").forEach((b) => (b.onclick = () => addDomain(+b.dataset.addbtn)));
    $("#polCats").querySelectorAll("[data-add]").forEach((inp) => (inp.onkeydown = (e) => { if (e.key === "Enter") addDomain(+inp.dataset.add); }));
    applyIcons($("#mod-policy"));
  }
  function syncPolCheckboxes() {
    POLICY.categories.forEach((c, i) => { const cb = document.querySelector(`#polCats [data-ci="${i}"]`); if (cb) c.enabled = cb.checked; });
  }
  function cleanDomain(v) {
    return (v || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split("?")[0];
  }
  function addDomain(i) {
    const inp = document.querySelector(`[data-add="${i}"]`);
    const d = cleanDomain(inp && inp.value);
    if (!d || !d.includes(".")) { toast("Digite um site válido (ex.: olx.com.br)"); return; }
    syncPolCheckboxes();
    if (!POLICY.categories[i].domains.includes(d)) POLICY.categories[i].domains.push(d);
    savePolicy(true);
  }
  function removeDomain(i, j) {
    syncPolCheckboxes();
    POLICY.categories[i].domains.splice(j, 1);
    savePolicy(true);
  }
  async function applyPolicy() {
    const r = await (await fetch("/api/policy/apply", { method: "POST" })).json();
    toast(r.ok ? `Bloqueio ativado (${r.count} domínios)` : (r.error || "Falha ao ativar"));
    loadPolicy();
  }
  async function removePolicy() {
    const r = await (await fetch("/api/policy/remove", { method: "POST" })).json();
    toast(r.ok ? "Bloqueio desativado" : "Falha ao desativar");
    loadPolicy();
  }
  async function savePolicy(quiet) {
    if (!POLICY) return;
    syncPolCheckboxes();
    POLICY.autoSchedule = $("#polAuto").checked;
    await fetch("/api/policy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: POLICY.categories, autoSchedule: POLICY.autoSchedule }) });
    if (POLICY.enabled) await fetch("/api/policy/apply", { method: "POST" }); // reaplica com a lista nova
    toast(quiet ? "Lista atualizada ✔" : "Políticas salvas ✔");
    loadPolicy();
  }

  // ---------- home / roda GTA (fiel ao original: 4 setores, rótulos empilhados, hub) ----------
  function buildWheel() {
    const cx = 220, cy = 220, rO = 200, rI = 100, gap = 2.6, rad = (d) => (d * Math.PI) / 180;
    const N = AREAS.length, span = 360 / N, half = span / 2;
    const ang = (i) => -90 + i * span; // primeiro setor no topo, distribuídos igualmente
    const pt = (r, a) => [(cx + r * Math.cos(rad(a))).toFixed(2), (cy + r * Math.sin(rad(a))).toFixed(2)];
    const sector = (a0, a1) => {
      const [x0, y0] = pt(rO, a0), [x1, y1] = pt(rO, a1), [x2, y2] = pt(rI, a1), [x3, y3] = pt(rI, a0);
      const big = (a1 - a0) > 180 ? 1 : 0;
      return `M${x0} ${y0} A${rO} ${rO} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${rI} ${rI} 0 ${big} 0 ${x3} ${y3} Z`;
    };
    const segs = AREAS.map((w, i) => `<path class="wheel-seg" data-i="${i}" d="${sector(ang(i) - half + gap, ang(i) + half - gap)}" style="--seg:${w.seg}"/>`).join("");
    const labels = AREAS.map((w, i) => {
      const [lx, ly] = pt((rO + rI) / 2, ang(i));
      return `<foreignObject class="wheel-fo" x="${lx - 58}" y="${ly - 38}" width="116" height="76"><div class="wheel-lbl" xmlns="http://www.w3.org/1999/xhtml"><span class="wl-ico">${svg(w.icon)}</span><span class="wl-tx">${esc(w.label)}</span></div></foreignObject>`;
    }).join("");
    $("#wheelMount").innerHTML = `<svg viewBox="0 0 440 440" class="wheel-svg" aria-label="Áreas">${segs}${labels}</svg>
      <div class="wheel-hub"><img src="assets/logo-icone.png" alt="" onerror="this.style.display='none'"/><div class="hub-tx"><b id="hubTitle">Selecione</b><span id="hubDesc">uma área</span></div></div>`;

    const segEls = [...$("#wheelMount").querySelectorAll(".wheel-seg")];
    const lbls = [...$("#wheelMount").querySelectorAll(".wheel-lbl")];
    const reset = () => { $("#hubTitle").textContent = "Selecione"; $("#hubDesc").textContent = "uma área"; segEls.forEach((s) => s.classList.remove("hot")); lbls.forEach((l) => (l.style.transform = "")); };
    segEls.forEach((p) => {
      const idx = +p.dataset.i, w = AREAS[idx];
      p.addEventListener("mouseenter", () => { $("#hubTitle").textContent = w.label; $("#hubDesc").textContent = w.desc; segEls.forEach((s) => s.classList.toggle("hot", s === p)); lbls.forEach((l, i) => (l.style.transform = i === idx ? "scale(1.13)" : "")); });
      p.addEventListener("click", () => enterArea(w.id));
    });
    $("#wheelMount").addEventListener("mouseleave", reset);
  }
  function enterArea(id) {
    const a = AREAS.find((x) => x.id === id);
    if (a && a.external) { window.open(a.external, "_blank"); return; }
    $("#home").classList.remove("show");
    selectArea(id);
  }
  function showHome() { $("#home").classList.add("show"); }

  // ---------- status do Agent ----------
  async function loadAgent() {
    try {
      const a = await (await fetch("/api/agent")).json();
      const conn = $("#pillConn"); conn.className = "pill live";
      conn.innerHTML = '<span class="dot"></span> Agent conectado';
      const ps = $("#pillSkills"); ps.hidden = false; ps.querySelector("b").textContent = a.skillsLoaded; applyIcons(ps);
      if (a.elevated) { $("#pillAdmin").hidden = false; applyIcons($("#pillAdmin")); }
    } catch {
      const conn = $("#pillConn"); conn.className = "pill off";
      conn.innerHTML = '<span class="dot"></span> Agent offline';
    }
  }

  // ---------- saúde do PC (SSE) ----------
  function connectHealth() {
    const es = new EventSource("/api/health");
    es.addEventListener("health", (e) => renderHealth(JSON.parse(e.data)));
    es.onerror = () => { $("#healthHint").textContent = "reconectando…"; };
  }
  function renderHealth(d) {
    $("#healthHint").textContent = "ao vivo";
    const cpu = Math.round(d.cpuPct || 0);
    $("#cpuVal").textContent = cpu; setBar($("#cpuBar"), cpu, cpu > 85);
    const used = d.ram?.usedMB || 0, total = d.ram?.totalMB || 1, pct = Math.round((used / total) * 100);
    $("#ramVal").textContent = (used / 1024).toFixed(1);
    $("#ramTotal").textContent = ` / ${(total / 1024).toFixed(0)} GB`;
    setBar($("#ramBar"), pct, pct > 85);
    $("#disks").innerHTML = (d.disks || []).map((k) => {
      const dp = Math.round((((k.totalGB || 0) - (k.freeGB || 0)) / (k.totalGB || 1)) * 100);
      return `<div class="disk-row"><b>${esc(k.drive)}</b><div class="bar"><i style="width:${dp}%" class="${dp > 88 ? "hot" : ""}"></i></div><span>${k.freeGB} GB livres</span></div>`;
    }).join("") || '<div class="sub">—</div>';
  }
  function setBar(el, pct, hot) { el.style.width = Math.min(100, pct) + "%"; el.classList.toggle("hot", !!hot); }

  // ---------- Skills ----------
  async function loadSkills() {
    SKILLS = await (await fetch("/api/skills")).json();
    const cats = ["Todas", ...[...new Set(SKILLS.map((s) => s.category))].sort()];
    $("#chips").innerHTML = cats.map((c) => `<div class="chip ${c === cat ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</div>`).join("");
    $("#chips").querySelectorAll(".chip").forEach((ch) => (ch.onclick = () => { cat = ch.dataset.cat; renderChips(); renderSkills(); }));
    renderSkills();
  }
  function renderChips() { $("#chips").querySelectorAll(".chip").forEach((ch) => ch.classList.toggle("active", ch.dataset.cat === cat)); }
  function renderSkills() {
    const items = SKILLS.filter((s) => (cat === "Todas" || s.category === cat) && (!query || (s.name + s.description + s.category).toLowerCase().includes(query)));
    $("#empty").hidden = items.length > 0;
    $("#grid").innerHTML = items.map((s) => `
      <div class="skill">
        <div class="head"><div class="ic">${svg(s.icon)}</div>
          <div class="title"><div class="cat">${esc(s.category)}</div><h3>${esc(s.name)}</h3></div></div>
        <div class="desc">${esc(s.description)}</div>
        <div class="foot"><div class="meta">${svg("clock")}${fmtTime(s.estimatedSeconds)}
          ${s.requiresAdmin ? '<span class="badge-admin">admin</span>' : ""}</div>
          <button class="btn primary" data-run="${esc(s.id)}">${svg("play")} Executar</button></div>
      </div>`).join("");
    $("#grid").querySelectorAll("[data-run]").forEach((b) => (b.onclick = () => openModal(b.dataset.run)));
  }

  // ---------- execução de Skill ----------
  function openModal(id) {
    current = SKILLS.find((s) => s.id === id); if (!current) return;
    $("#mIcon").dataset.done = ""; $("#mIcon").dataset.icon = current.icon; applyIcons($("#mIcon"));
    $("#mCat").textContent = current.category; $("#mName").textContent = current.name; $("#mDesc").textContent = current.description;
    $("#confirmView").style.display = ""; $("#execView").classList.remove("on");
    $("#console").innerHTML = ""; $("#resultBox").innerHTML = ""; $("#doneActions").hidden = true;
    $("#adminNote").hidden = !current.requiresAdmin;
    const pf = $("#paramField");
    if (current.id === "diag.ping") { pf.hidden = false; $("#paramLabel").textContent = "Endereço para testar"; $("#paramInput").value = "8.8.8.8"; }
    else pf.hidden = true;
    applyIcons($("#modal")); $("#modal").classList.add("open");
  }
  async function runSkill() {
    if (!current) return;
    let override = "";
    if (current.id === "diag.ping") override = JSON.stringify({ target: ($("#paramInput").value || "8.8.8.8").trim() });
    $("#confirmView").style.display = "none"; $("#execView").classList.add("on");
    $("#spin").style.display = ""; $("#runningActions").hidden = false; $("#doneActions").hidden = true;
    $("#phaseTxt").textContent = "Iniciando…"; $("#phaseSub").textContent = current.name;
    const pbar = $("#pbar"); pbar.style.width = ""; pbar.style.background = ""; pbar.classList.add("indet");
    currentAbort = new AbortController();
    try {
      await streamExec({ skillId: current.id, paramsOverrideJson: override, adminConfirmed: true }, onEvent, currentAbort.signal);
    } catch (e) {
      finish(e && e.name === "AbortError" ? { status: "CANCELLED", humanMessage: "Ação cancelada por você." } : { status: "FAILED", humanMessage: "Não foi possível falar com o Agent." });
    } finally { currentAbort = null; }
  }
  function onEvent(ev) {
    if (ev.kind === "accepted") $("#phaseSub").textContent = `${current.name} · ${ev.totalSteps} passo(s)`;
    else if (ev.kind === "stage") {
      const map = { INITIALIZING: "Iniciando…", RUNNING: "Executando…", FINALIZING: "Finalizando…" };
      $("#phaseTxt").textContent = map[ev.phase] || "Executando…";
      if (ev.message) $("#phaseSub").textContent = ev.message;
      const pbar = $("#pbar");
      if (ev.percent >= 0) { pbar.classList.remove("indet"); pbar.style.width = ev.percent + "%"; } else pbar.classList.add("indet");
      if (ev.message) appendConsole(ev.message, true);
    } else if (ev.kind === "log") appendConsole(ev.text, false);
    else if (ev.kind === "result") finish(ev);
  }
  function appendConsole(text, isStage) {
    if (!text || !text.trim()) return;
    const c = $("#console"), div = document.createElement("div");
    if (isStage) div.className = "stg";
    div.textContent = (isStage ? "▸ " : "  ") + text; c.appendChild(div); c.scrollTop = c.scrollHeight;
  }
  function finish(ev) {
    $("#spin").style.display = "none";
    const ok = ev.status === "SUCCESS", pbar = $("#pbar");
    pbar.classList.remove("indet"); pbar.style.width = "100%";
    pbar.style.background = ok ? "" : "linear-gradient(90deg,#f87171,#fb923c)";
    $("#phaseTxt").textContent = ok ? "Concluído" : ev.status === "CANCELLED" ? "Cancelado" : "Falhou";
    $("#phaseSub").textContent = "";
    let dataHtml = "";
    if (ev.resultJson) { try { dataHtml = renderData(JSON.parse(ev.resultJson)); } catch { } }
    $("#resultBox").innerHTML = `<div class="result ${ok ? "ok" : "err"}"><div class="rmark">${svg(ok ? "check" : "x")}</div>
      <div><div class="rmsg">${esc(ev.humanMessage || "")}</div>
      ${ev.rebootRequired ? '<div class="rreboot">⟳ Reinício recomendado para concluir.</div>' : ""}
      ${ev.errorCode ? `<div class="rreboot" style="color:var(--txt-mut)">código: ${esc(ev.errorCode)}</div>` : ""}</div></div>${dataHtml}`;
    applyIcons($("#resultBox"));
    $("#runningActions").hidden = true; $("#doneActions").hidden = false;
    toast(ok ? "Ação concluída ✔" : ev.status === "CANCELLED" ? "Ação cancelada" : "A ação falhou");
    if (AI_CONFIGURED && ev.status !== "CANCELLED") summarizeExec(ev);
    loadAgent();
  }
  // Vergas resume o resultado em linguagem humana (2ª chamada à IA).
  async function summarizeExec(ev) {
    const box = $("#resultBox");
    const note = document.createElement("div");
    note.className = "vergas-note";
    note.innerHTML = `<div class="vn-av">${svg("chat")}</div><div class="vn-body"><b>Vergas</b><span class="vn-tx">analisando…</span></div>`;
    box.appendChild(note); applyIcons(note);
    try {
      const r = await (await fetch("/api/ai/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: (current && current.name) || "Ação", status: ev.status, humanMessage: ev.humanMessage || "", resultJson: ev.resultJson || null }),
      })).json();
      if (r && r.reply) note.querySelector(".vn-tx").textContent = r.reply;
      else note.remove();
    } catch { note.remove(); }
  }
  function renderData(obj) { return `<table class="data-table">${Object.entries(obj).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${fmtVal(v)}</td></tr>`).join("")}</table>`; }
  function fmtVal(v) {
    if (Array.isArray(v)) {
      if (!v.length) return "—";
      if (typeof v[0] === "object") return v.slice(0, 8).map((o) => esc(Object.values(o).join(" · "))).join("<br>") + (v.length > 8 ? `<br>… +${v.length - 8}` : "");
      return esc(v.join(", "));
    }
    if (v && typeof v === "object") return esc(Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(" · "));
    return esc(String(v));
  }
  async function streamExec(body, cb, signal) {
    const res = await fetch("/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (line) { try { cb(JSON.parse(line.slice(5).trim())); } catch { } }
      }
    }
  }

  // ---------- histórico ----------
  async function loadHistory() { try { renderHistory(await (await fetch("/api/logs?limit=25")).json()); } catch { } }
  function renderHistory(list) {
    const h = $("#history");
    if (!list || !list.length) { h.innerHTML = '<div class="sub" style="color:var(--txt-mut);padding:8px 2px">Nenhuma execução ainda.</div>'; return; }
    h.innerHTML = list.map((r) => {
      const cls = r.status === "SUCCESS" ? "ok" : r.status === "CANCELLED" ? "cancel" : "err";
      return `<div class="hrow ${cls}"><div class="hmark">${svg(r.status === "SUCCESS" ? "check" : "x")}</div>
        <div class="hname">${esc(r.skillName)}<small>${esc(r.message || "")}</small></div>
        ${r.elevated ? '<span class="hbadge">admin</span>' : ""}
        <div class="htime">${fmtWhen(r.timestamp)}<br>${fmtDur(r.durationMs)}</div></div>`;
    }).join("");
  }
  function fmtWhen(iso) { try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } }
  function fmtDur(ms) { return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`; }

  // ---------- FROTA ----------
  async function loadComputers() { try { COMPUTERS = await (await fetch("/api/computers")).json(); } catch { COMPUTERS = []; } renderFleet(); }
  function renderFleet() {
    const items = COMPUTERS.filter((c) => !fq || (`${c.name} ${c.sector || ""} ${c.assignedTo || ""} ${c.serial || ""}`).toLowerCase().includes(fq));
    $("#fleetEmpty").hidden = items.length > 0;
    $("#fleetBody").innerHTML = items.map((c) => `<tr>
        <td class="name">${esc(c.name)}</td><td>${esc(c.serial || "—")}</td><td>${esc(c.sector || "—")}</td>
        <td>${esc(c.assignedTo || "—")}</td><td>${esc(c.office || "—")}</td><td>${esc(c.antivirus || "—")}</td>
        <td>${c.status ? `<span class="st ${(c.status || "").toLowerCase() === "ativo" ? "ativo" : ""}">${esc(c.status)}</span>` : "—"}</td>
        <td><div class="rowact"><button class="iconbtn" data-edit="${esc(c.id)}" title="Editar">${svg("edit")}</button>
          <button class="iconbtn danger" data-del="${esc(c.id)}" title="Excluir">${svg("trash")}</button></div></td></tr>`).join("");
    $("#fleetBody").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openFleetForm(COMPUTERS.find((c) => c.id === b.dataset.edit))));
    $("#fleetBody").querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => deleteComputer(b.dataset.del)));
  }
  function openFleetForm(c) {
    editingId = c ? c.id : null;
    $("#fmTitle").textContent = c ? `Editar ${c.name}` : "Novo computador";
    for (const k of ["name", "serial", "sector", "assignedTo", "office", "antivirus", "status", "notes"]) $("#f_" + k).value = (c && c[k]) || "";
    $("#fleetModal").classList.add("open"); setTimeout(() => $("#f_name").focus(), 50);
  }
  async function saveComputer() {
    const body = { id: editingId || "" };
    for (const k of ["name", "serial", "sector", "assignedTo", "office", "antivirus", "status", "notes"]) body[k] = $("#f_" + k).value.trim();
    if (!body.name) { toast("Informe o nome do computador"); return; }
    const res = await fetch("/api/computers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { toast("Falha ao salvar"); return; }
    $("#fleetModal").classList.remove("open"); toast(editingId ? "Computador atualizado ✔" : "Computador cadastrado ✔"); loadComputers();
  }
  function deleteComputer(id) {
    const c = COMPUTERS.find((x) => x.id === id);
    if (!confirm(`Excluir "${c ? c.name : "este computador"}" da frota?`)) return;
    fetch("/api/computers/" + id, { method: "DELETE" }).then(() => { toast("Computador excluído"); loadComputers(); });
  }
  async function addThisPc() {
    try { const s = await (await fetch("/api/computers/self")).json(); openFleetForm(null); $("#f_name").value = s.name || ""; $("#f_notes").value = s.os || ""; $("#f_status").value = "ativo"; toast("Dados desta máquina preenchidos pelo Agent"); }
    catch { openFleetForm(null); }
  }

  // ---------- MOTOR GENÉRICO (impressoras, licenças, certificados…) ----------
  function showEntity(name) {
    curEntity = SCHEMA.find((e) => e.name === name); if (!curEntity) return;
    entQuery = ""; $("#entSearch").value = ""; $("#entSearch").placeholder = `Buscar em ${curEntity.label.toLowerCase()}…`;
    $("#entTitle").textContent = curEntity.label.toUpperCase();
    $("#entHint").textContent = "persistido localmente (SQLite)";
    $("#entHead").innerHTML = `<tr>${curEntity.listColumns.map((k) => `<th>${esc(labelOf(k))}</th>`).join("")}<th></th></tr>`;
    loadEntity();
  }
  function labelOf(key) { return (curEntity.fields.find((f) => f.key === key) || {}).label || key; }
  async function loadEntity() { try { ENT_ROWS = await (await fetch("/api/data/" + curEntity.name)).json(); } catch { ENT_ROWS = []; } renderEntity(); }
  function fileUrl(entity, id, field) { return `/api/files/${entity}/${id}/${field}`; }
  function renderEntity() {
    const cols = curEntity.listColumns;
    const fileFields = curEntity.fields.filter((f) => f.type === "file");
    const items = ENT_ROWS.filter((r) => !entQuery || cols.some((k) => String(r[k] || "").toLowerCase().includes(entQuery)));
    $("#entEmpty").hidden = items.length > 0;
    $("#entBody").innerHTML = items.map((r) => `<tr>
        ${cols.map((k, i) => `<td class="${i === 0 ? "name" : ""}">${esc(r[k] || "—")}</td>`).join("")}
        <td><div class="rowact">
          ${fileFields.map((f) => r[f.key] ? `<button class="iconbtn" data-view="${esc(fileUrl(curEntity.name, r.id, f.key))}" title="Ver ${esc(f.label)}">${svg("book")}</button>` : "").join("")}
          <button class="iconbtn" data-e="${esc(r.id)}" title="Editar">${svg("edit")}</button>
          <button class="iconbtn danger" data-d="${esc(r.id)}" title="Excluir">${svg("trash")}</button></div></td></tr>`).join("");
    $("#entBody").querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => window.open(b.dataset.view, "_blank")));
    $("#entBody").querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => openEntityForm(ENT_ROWS.find((r) => r.id === b.dataset.e))));
    $("#entBody").querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => deleteEntity(b.dataset.d)));
  }
  function inputType(t) { return ["number", "date", "email", "url"].includes(t) ? t : "text"; }
  function fieldHtml(f, row) {
    const wide = f.type === "url" || f.type === "file";
    if (f.type === "file") {
      const has = row && row[f.key];
      const url = has ? fileUrl(curEntity.name, row.id, f.key) : "";
      return `<div class="field" style="grid-column:1/-1">
          <label>${esc(f.label)}</label>
          <div class="filefield" id="ff_${f.key}">
            ${has ? `<div class="file-cur"><span data-icon="book"></span><a href="${esc(url)}" target="_blank">${esc(row[f.key])}</a>
              <button type="button" class="iconbtn danger" data-rmfile="${f.key}" title="Remover">${svg("trash")}</button></div>` : ""}
            <input id="ef_${f.key}" type="file" ${row && row.id ? "" : ""} />
            <small class="ff-hint">${has ? "Escolha outro arquivo para substituir." : "PDF, imagem ou documento (até 25 MB)."}</small>
          </div></div>`;
    }
    return `<div class="field" ${wide ? 'style="grid-column:1/-1"' : ""}>
        <label>${esc(f.label)}${f.required ? " *" : ""}</label>
        <input id="ef_${f.key}" type="${inputType(f.type)}" placeholder="${esc(f.placeholder || "")}" value="${row ? esc(row[f.key] || "") : ""}" /></div>`;
  }
  function openEntityForm(row) {
    entEditingId = row ? row.id : null;
    $("#emIcon").dataset.done = ""; $("#emIcon").dataset.icon = curEntity.icon; applyIcons($("#emIcon"));
    $("#emArea").textContent = curEntity.label; $("#emTitle").textContent = row ? "Editar registro" : `Novo · ${curEntity.label}`;
    $("#emFields").innerHTML = curEntity.fields.map((f) => fieldHtml(f, row)).join("");
    applyIcons($("#emFields"));
    $("#emFields").querySelectorAll("[data-rmfile]").forEach((b) => (b.onclick = () => removeEntityFile(b.dataset.rmfile)));
    $("#entModal").classList.add("open"); setTimeout(() => { const el = $("#ef_" + curEntity.fields[0].key); if (el) el.focus(); }, 50);
  }
  async function removeEntityFile(field) {
    if (!entEditingId || !confirm("Remover o arquivo anexado?")) return;
    await fetch(fileUrl(curEntity.name, entEditingId, field), { method: "DELETE" });
    const cur = document.querySelector(`#ff_${field} .file-cur`); if (cur) cur.remove();
    const hint = document.querySelector(`#ff_${field} .ff-hint`); if (hint) hint.textContent = "PDF, imagem ou documento (até 25 MB).";
    const row = ENT_ROWS.find((r) => r.id === entEditingId); if (row) delete row[field];
    toast("Arquivo removido");
  }
  async function saveEntity() {
    const body = { id: entEditingId || "" };
    for (const f of curEntity.fields) if (f.type !== "file") body[f.key] = $("#ef_" + f.key).value.trim();
    const missing = curEntity.fields.find((f) => f.type !== "file" && f.required && !body[f.key]);
    if (missing) { toast(`Informe: ${missing.label}`); return; }
    const res = await fetch("/api/data/" + curEntity.name, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { toast("Falha ao salvar"); return; }
    let saved; try { saved = await res.json(); } catch { saved = null; }
    const id = (saved && saved.id) || entEditingId;
    // sobe os anexos escolhidos (um por campo de arquivo)
    let uploadFail = false;
    for (const f of curEntity.fields.filter((f) => f.type === "file")) {
      const inp = $("#ef_" + f.key), file = inp && inp.files && inp.files[0];
      if (!file || !id) continue;
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch(fileUrl(curEntity.name, id, f.key), { method: "POST", body: fd });
      if (!up.ok) { uploadFail = true; try { toast((await up.json()).error || "Falha no anexo"); } catch { toast("Falha no anexo"); } }
    }
    $("#entModal").classList.remove("open");
    if (!uploadFail) toast(entEditingId ? "Registro atualizado ✔" : "Registro criado ✔");
    loadEntity();
  }
  function deleteEntity(id) {
    if (!confirm("Excluir este registro?")) return;
    fetch(`/api/data/${curEntity.name}/${id}`, { method: "DELETE" }).then(() => { toast("Registro excluído"); loadEntity(); });
  }

  // ---------- toast ----------
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600); }

  // ---------- wire ----------
  $("#q").addEventListener("input", (e) => { query = e.target.value.toLowerCase(); renderSkills(); });
  $("#runBtn").addEventListener("click", runSkill);
  $("#cancelBtn").addEventListener("click", () => { if (currentAbort) currentAbort.abort(); });
  $("#fq").addEventListener("input", (e) => { fq = e.target.value.toLowerCase(); renderFleet(); });
  $("#addPcBtn").addEventListener("click", () => openFleetForm(null));
  $("#selfBtn").addEventListener("click", addThisPc);
  $("#fmSave").addEventListener("click", saveComputer);
  $("#entSearch").addEventListener("input", (e) => { entQuery = e.target.value.toLowerCase(); renderEntity(); });
  $("#entAdd").addEventListener("click", () => openEntityForm(null));
  $("#emSave").addEventListener("click", saveEntity);
  $("#polSave").addEventListener("click", savePolicy);
  $("#aiSend").addEventListener("click", sendAi);
  $("#aiMsg").addEventListener("keydown", (e) => { if (e.key === "Enter") sendAi(); });
  $("#aiPersonaSave").addEventListener("click", () => savePersona($("#aiPersona").value));
  $("#aiPersonaReset").addEventListener("click", () => { $("#aiPersona").value = ""; savePersona(""); });
  $("#aiFab").addEventListener("click", toggleDock);
  $("#dockClose").addEventListener("click", toggleDock);
  $("#dockSend").addEventListener("click", sendDock);
  $("#dockMsg").addEventListener("keydown", (e) => { if (e.key === "Enter") sendDock(); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) e.target.closest(".modal").classList.remove("open"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal.open").forEach((m) => m.classList.remove("open")); });

  $("#brandHome").addEventListener("click", showHome);
  $("#pillAlerts").addEventListener("click", gotoAlerts);

  // ---------- init ----------
  async function init() {
    applyIcons();
    loadAgent(); connectHealth(); loadSkills();
    try { AI_CONFIGURED = (await (await fetch("/api/ai/status")).json()).configured; } catch { }
    try { SCHEMA = await (await fetch("/api/schema")).json(); } catch { SCHEMA = []; }
    renderAreaTabs();
    buildWheel();
    curArea = "ti"; renderSidebar(); // prepara o shell por baixo do menu
    refreshAlerts();
    setInterval(refreshAlerts, 120000); // reavalia alertas a cada 2 min
    // #home começa visível (tela inicial estilo GTA)
  }
  init();
})();
