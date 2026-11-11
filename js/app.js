/* =====================================================================
   CONVERGAS · IT OPS CENTER — App (router, views, modals, helpers)
   ===================================================================== */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n) => `<span data-icon="${n}"></span>`;
  const initials = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  /* ---------- mobile: rotular células das tabelas (vira card rótulo→valor) ---------- */
  function labelizeTable(tbl) {
    try {
      const ths = $$('thead th', tbl).map((th) => th.textContent.trim());
      if (!ths.length) return;
      $$('tbody tr', tbl).forEach((tr) => {
        const cells = tr.children;
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          if (c.tagName === 'TD' && ths[i] && !c.hasAttribute('data-label')) c.setAttribute('data-label', ths[i]);
        }
      });
    } catch (e) {}
  }
  // observa o DOM e rotula qualquer table.data que apareça (páginas, modais, re-renders)
  try {
    new MutationObserver((muts) => {
      muts.forEach((m) => m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('table.data')) labelizeTable(n);
        if (n.querySelectorAll) n.querySelectorAll('table.data').forEach(labelizeTable);
      }));
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  const view = $('#view');
  const crumb = $('#crumbCur');

  /* ---------- helpers: toast / copy / modal ---------- */
  function toast(msg, kind) {
    kind = kind || 'ok';
    const map = { ok: 'check', info: 'activity', warn: 'alert' };
    const wrap = $('#toastWrap');
    // only one toast at a time — clear any existing before showing the new one
    $$('.toast', wrap).forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = `<span class="t-ico">${ic(map[kind] || 'check')}</span><span class="t-tx">${esc(msg)}</span>`;
    wrap.appendChild(el);
    Icons.apply(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {} ta.remove();
    }
    toast((label || 'Copiado') + ' para a área de transferência', 'ok');
  }

  // trava o scroll da tela de trás sempre que QUALQUER overlay está aberto
  function syncScrollLock() {
    const open = ($('#modalRoot') && $('#modalRoot').classList.contains('open'))
      || ($('#msheet') && $('#msheet').classList.contains('open'))
      || ($('.side') && $('.side').classList.contains('open'));
    document.documentElement.classList.toggle('scroll-lock', !!open);
  }

  let modalCloser = null;
  // `dialog:true` => diálogo pequeno centralizado (confirmações). Padrão => SHEET de tela
  // cheia (abre como uma aba/página, fundo opaco, cabeçalho com "Voltar"). Pedro não quer
  // card flutuante sobrepondo a tela — então todo formulário vira fluxo guiado em página.
  function modal({ title, sub, body, footer, wide, dialog }) {
    const root = $('#modalRoot'), card = $('#modalCard');
    card.className = 'modal-card' + (wide ? ' wide' : '') + (dialog ? ' dialog' : ' sheet');
    card.innerHTML = `
      <div class="modal-head">
        <button class="mh-back" data-close aria-label="Voltar">${ic('chevron')}<span>Voltar</span></button>
        <div class="mh-tt"><h3>${esc(title)}</h3>${sub ? `<div class="mh-sub">${esc(sub)}</div>` : ''}</div>
        <button class="icon-btn mh-x" data-close aria-label="Fechar">${ic('x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}`;
    root.classList.add('open'); root.setAttribute('aria-hidden', 'false');
    Icons.apply(card);
    modalCloser = closeModal;
    $$('[data-close]', card).forEach((b) => (b.onclick = closeModal));
    syncScrollLock();
    return card;
  }
  function closeModal() { const root = $('#modalRoot'); root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); $('#modalCard').innerHTML = ''; modalCloser = null; syncScrollLock(); }
  $('#modalRoot').addEventListener('mousedown', (e) => { if (e.target === $('#modalRoot')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalCloser) modalCloser(); });

  function confirmDialog(msg, onYes, kind) {
    modal({
      title: 'Confirmar', sub: msg, dialog: true,
      body: `<p style="color:var(--text-2);font-size:.9rem">Esta ação não pode ser desfeita.</p>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn ${kind || 'danger'}" id="cfYes">Confirmar</button>`,
    });
    $('#cfYes').onclick = () => { closeModal(); onYes(); };
  }

  /* status badge helpers */
  const STATUS = {
    ativo: { cls: 'ok', label: 'Ativo' }, manutencao: { cls: 'warn', label: 'Manutenção' }, inativo: { cls: 'neutral', label: 'Inativo' },
    em_uso: { cls: 'info', label: 'Em uso' }, disponivel: { cls: 'ok', label: 'Disponível' }, reserva: { cls: 'warn', label: 'Reserva' },
  };
  const sBadge = (s) => { const m = STATUS[s] || { cls: 'neutral', label: s }; return `<span class="badge ${m.cls}">${esc(m.label)}</span>`; };
  const yn = (v) => v ? `<span class="yn y">${ic('check')}Sim</span>` : `<span class="yn n">${ic('x')}Não</span>`;
  const userName = (id) => { const u = Store.find('team', id); return u ? u.name : null; };
  const compName = (id) => { const c = Store.find('computers', id); return c ? c.hostname : null; };

  /* date + license helpers */
  const fmtDate = (s) => { if (!s) return '—'; const p = s.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };
  function licStatus(dateStr) {
    if (!dateStr) return { key: 'na', label: 'Sem data', cls: 'neutral', days: null };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    const days = Math.round((d - today) / 86400000);
    if (isNaN(days)) return { key: 'na', label: 'Sem data', cls: 'neutral', days: null };
    if (days < 0) return { key: 'vencido', label: `Vencido há ${-days}d`, cls: 'danger', days };
    if (days <= 30) return { key: 'vencendo', label: `Vence em ${days}d`, cls: 'warn', days };
    if (days <= 60) return { key: 'atencao', label: `${days}d restantes`, cls: 'info', days };
    return { key: 'ok', label: `${days}d restantes`, cls: 'ok', days };
  }
  const avBadge = (av) => {
    if (!av || av === '—') return '<span class="badge neutral plain">Sem AV</span>';
    if (/instalar|verificar/i.test(av)) return `<span class="badge warn">${esc(av)}</span>`;
    return `<span class="badge ok plain">${esc(av)}</span>`;
  };

  /* copy button factory (delegated via data-copy) */
  function copyBtn(value, label) {
    return `<button class="mini-btn" data-copy="${esc(value)}" data-copy-label="${esc(label || 'Copiado')}" title="Copiar">${ic('copy')}</button>`;
  }

  /* =====================================================================
     PAGES
     ===================================================================== */
  const PAGES = {};

  /* ---- alerts computation (shared) ---- */
  function computeAlerts() {
    const a = [];
    Store.get('computers').forEach((c) => { if (!c.userId) a.push({ kind: 'warn', t: `Computador ${c.hostname} sem usuário atribuído`, s: 'Atribua um responsável no módulo Computadores' }); });
    Store.get('printers').forEach((p) => { if (!p.driverUrl) a.push({ kind: 'warn', t: `Impressora ${p.name} sem link de driver`, s: 'Adicione a Driver URL para instalação rápida' }); });
    Store.get('inventory').forEach((i) => { if (i.status === 'em_uso' && (!i.assignments || !i.assignments.length)) a.push({ kind: 'danger', t: `Item "${i.brandModel}" em uso sem responsável`, s: 'Vincule um colaborador no módulo Periféricos' }); });
    Store.get('licenses').forEach((l) => {
      const st = licStatus(l.renewalDate);
      if (st.key === 'vencido') a.push({ kind: 'danger', t: `Licença "${l.name}" vencida`, s: `Renovação em ${fmtDate(l.renewalDate)} — renove o quanto antes` });
      else if (st.key === 'vencendo') a.push({ kind: 'warn', t: `Licença "${l.name}" ${st.label.toLowerCase()}`, s: `Renovação em ${fmtDate(l.renewalDate)}` });
    });
    return a;
  }

  /* ============ DASHBOARD ============ */
  // donut (round) card from mutually-exclusive segments
  function donutCard(icon, title, segments, total, unit) {
    let acc = 0;
    const active = segments.filter((s) => s.value > 0);
    const stops = active.map((s) => {
      const start = total ? (acc / total) * 100 : 0;
      acc += s.value;
      const end = total ? (acc / total) * 100 : 0;
      return `${s.color} ${start}% ${end}%`;
    }).join(', ');
    const bg = total ? `conic-gradient(${stops})` : 'conic-gradient(var(--line) 0 100%)';
    const legend = segments.map((s) => `
      <div class="lg-row">
        <span class="lg-dot" style="background:${s.color}"></span>
        <span class="lg-name">${esc(s.label)}</span>
        <span class="lg-val">${s.value}</span>
        <span class="lg-pct">${total ? Math.round((s.value / total) * 100) : 0}%</span>
      </div>`).join('');
    return `
      <div class="dcard feature" style="grid-row:span 1">
        <div class="dcard-head"><span class="dh-ico">${ic(icon)}</span><h3>${esc(title)}</h3>
          <span class="badge neutral plain">${total} total</span></div>
        <div class="donut-wrap">
          <div class="donut" style="background:${bg}"><div class="donut-hole"><span class="dh-v">${total}</span><span class="dh-k">${esc(unit)}</span></div></div>
          <div class="legend">${legend}</div>
        </div>
      </div>`;
  }
  // percentage gauge card (site / systems)
  function gaugeCard(icon, title, pct, name, sub) {
    const col = pct >= 90 ? 'var(--ok)' : pct >= 70 ? 'var(--warn)' : 'var(--danger)';
    const bg = `conic-gradient(${col} 0% ${pct}%, var(--bg-3) ${pct}% 100%)`;
    return `
      <div class="dcard gauge-card">
        <div class="dcard-head" style="width:100%"><span class="dh-ico">${ic(icon)}</span><h3>${esc(title)}</h3></div>
        <div class="gauge" style="background:${bg}"><div class="gauge-hole"><span class="gh-v">${pct}%</span><span class="gh-k">uptime</span></div></div>
        <div class="gc-name">${esc(name)}</div>
        <div class="gc-sub">${esc(sub)}</div>
      </div>`;
  }

  PAGES.dashboard = () => {
    const comps = Store.get('computers'), printers = Store.get('printers'), team = Store.get('team'), inv = Store.get('inventory');
    const alerts = computeAlerts();
    const sysOk = alerts.length === 0;

    // --- computers breakdown (mutually exclusive) ---
    let cUso = 0, cDisp = 0, cManut = 0, cInativo = 0;
    comps.forEach((c) => {
      if (c.status === 'manutencao') cManut++;
      else if (c.status === 'inativo') cInativo++;
      else if (c.userId) cUso++;
      else cDisp++;
    });

    // --- printers ---
    const pAtivas = printers.filter((p) => p.status === 'ativo').length;
    const pRede = printers.filter((p) => p.type === 'rede').length;
    const pDriverOk = printers.filter((p) => p.driverUrl).length;
    const pDriverBad = printers.length - pDriverOk;

    // --- team ---
    const tComMaq = team.filter((u) => u.machineId).length;
    const tSemMaq = team.length - tComMaq;
    const tVpn = team.filter((u) => u.vpn).length;
    const tEng = team.filter((u) => u.engServer).length;

    // --- inventory by type ---
    const byType = {};
    inv.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + (Number(i.qty) || 0); });
    const invTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const invTotal = invTypes.reduce((s, [, q]) => s + q, 0);
    const invMax = invTypes.reduce((m, [, q]) => Math.max(m, q), 1);
    const invIco = { Mouse: 'mouse', Teclado: 'keyboard', Monitor: 'monitor', Headset: 'activity', Webcam: 'monitor', Cabo: 'link' };

    // --- site & systems health ---
    const domains = Store.get('infra').domains;
    const dOnline = domains.filter((d) => d.status === 'ativo').length;
    const sitePct = domains.length ? Math.round((dOnline / domains.length) * 100) : 100;
    const sysPct = sysOk ? 100 : Math.max(60, 100 - alerts.length * 10);

    const qa = (icon, title, sub, route, action) => `
      <button class="qa" data-qa="${action}" data-route-go="${route}">
        <span class="qa-ico">${ic(icon)}</span>
        <span class="qa-tx"><b>${title}</b><span>${sub}</span></span>
      </button>`;

    const printersCard = `
      <div class="dcard">
        <div class="dcard-head"><span class="dh-ico">${ic('printer')}</span><h3>Impressoras</h3>
          <span class="badge neutral plain">${printers.length} total</span></div>
        <div class="mlist">
          <div class="mrow"><span class="mr-l"><span class="mr-dot" style="background:var(--ok)"></span>Online</span><span class="mr-r"><span class="mr-v">${pAtivas}</span></span></div>
          <div class="mrow"><span class="mr-l"><span class="mr-dot" style="background:var(--accent)"></span>Em rede</span><span class="mr-r"><span class="mr-v">${pRede}</span></span></div>
          <div class="mrow"><span class="mr-l"><span class="mr-dot" style="background:var(--blue-future)"></span>Drivers</span><span class="mr-r"><span class="badge ${pDriverBad ? 'warn' : 'ok'}">${pDriverBad ? pDriverBad + ' instável' : 'OK'}</span></span></div>
        </div>
        <div class="chiprow">
          <div class="minichip"><span class="mc-v">${team.length}</span><span class="mc-k">${ic('link')}Conexões</span></div>
          <div class="minichip"><span class="mc-v">${pDriverOk}</span><span class="mc-k">${ic('check')}Drivers OK</span></div>
        </div>
      </div>`;

    const teamCard = `
      <div class="dcard">
        <div class="dcard-head"><span class="dh-ico">${ic('users')}</span><h3>Equipe</h3>
          <span class="badge neutral plain">${team.length} total</span></div>
        <div class="mlist">
          <div class="mrow"><span class="mr-l"><span class="mr-dot" style="background:var(--ok)"></span>Com máquina</span><span class="mr-r"><span class="mr-v">${tComMaq}</span></span></div>
          <div class="mrow"><span class="mr-l"><span class="mr-dot" style="background:var(--warn)"></span>Sem alocação</span><span class="mr-r"><span class="mr-v">${tSemMaq}</span></span></div>
        </div>
        <div class="chiprow">
          <div class="minichip"><span class="mc-v">${tVpn}</span><span class="mc-k">${ic('shield')}Acesso VPN</span></div>
          <div class="minichip"><span class="mc-v">${tEng}</span><span class="mc-k">${ic('server')}Servidor Eng.</span></div>
        </div>
      </div>`;

    const stockCard = `
      <div class="dcard feature">
        <div class="dcard-head"><span class="dh-ico">${ic('box')}</span><h3>Itens em estoque</h3>
          <span class="badge neutral plain">${invTotal} unid.</span></div>
        <div class="bars">
          ${invTypes.length ? invTypes.map(([t, q]) => `
            <div class="bar-row">
              <span class="br-lbl">${ic(invIco[t] || 'box')}${esc(t)}</span>
              <span class="br-track"><span class="br-fill" style="width:${Math.round((q / invMax) * 100)}%"></span></span>
              <span class="br-val">${q}</span>
            </div>`).join('') : '<div class="cell-sub">Sem itens cadastrados.</div>'}
        </div>
      </div>`;

    view.innerHTML = `
      <div class="page-head">
        <div class="page-title">
          <span class="eyebrow">Visão geral</span>
          <h1>Dashboard</h1>
          <p>Single source of truth da infraestrutura de TI da Convergas.</p>
        </div>
        <div class="page-actions">
          <span class="badge ${sysOk ? 'ok' : 'warn'}" style="height:38px;padding:0 14px;font-size:.8rem">${sysOk ? 'Sistema operacional' : alerts.length + ' alerta(s)'}</span>
        </div>
      </div>

      <div class="bento">
        ${donutCard('monitor', 'Computadores', [
          { label: 'Em uso', value: cUso, color: 'var(--ok)' },
          { label: 'Disponíveis', value: cDisp, color: 'var(--accent)' },
          { label: 'Em manutenção', value: cManut, color: 'var(--warn)' },
          { label: 'Inativos', value: cInativo, color: 'var(--text-3)' },
        ], comps.length, 'máquinas')}
        ${teamCard}
        ${printersCard}
      </div>

      <div class="bento">
        ${stockCard}
        ${gaugeCard('globe', 'Site', sitePct, sitePct === 100 ? 'Funcionamento 100%' : 'Atenção', `${dOnline}/${domains.length} domínios online`)}
        ${gaugeCard('activity', 'Sistemas', sysPct, sysPct === 100 ? 'Funcionamento 100%' : 'Requer atenção', sysOk ? 'Nenhum alerta ativo' : `${alerts.length} alerta(s) ativo(s)`)}
      </div>

      <div class="section-head"><h2><span class="sh-ico">${ic('flash')}</span>Atalhos rápidos</h2></div>
      <div class="qa-grid">
        ${qa('plus', 'Adicionar computador', 'Cadastrar nova máquina', 'computadores', 'add-computer')}
        ${qa('plus', 'Adicionar impressora', 'Registrar impressora', 'impressoras', 'add-printer')}
        ${qa('terminal', 'Criar comando', 'Novo comando operacional', 'command', 'add-command')}
        ${qa('book', 'Criar runbook', 'Novo procedimento', 'runbooks', 'add-runbook')}
      </div>

      <div class="section-head"><h2><span class="sh-ico">${ic('alert')}</span>Alertas do sistema</h2>
        <span class="badge ${sysOk ? 'ok' : 'warn'}">${alerts.length} ativo(s)</span></div>
      <div class="panel">
        ${sysOk
        ? `<div class="empty-ok"><span class="eo-ico">${ic('check')}</span><div><b style="color:var(--text)">Tudo certo.</b><div style="font-size:.82rem;color:var(--text-3)">Nenhum item pendente de atenção no momento.</div></div></div>`
        : alerts.map((al) => `
            <div class="alert-row al-${al.kind}">
              <span class="al-ico">${ic('alert')}</span>
              <span class="al-tx"><b>${esc(al.t)}</b><span>${esc(al.s)}</span></span>
            </div>`).join('')}
      </div>`;

    Icons.apply(view);
    $$('[data-qa]', view).forEach((b) => (b.onclick = () => {
      go(b.dataset.routeGo);
      const act = b.dataset.qa;
      setTimeout(() => {
        if (act === 'add-computer') formComputer();
        else if (act === 'add-printer') formPrinter();
        else if (act === 'add-command') formCommand();
        else if (act === 'add-runbook') formRunbook();
      }, 60);
    }));
  };

  /* ============ EQUIPE ============ */
  PAGES.equipe = () => {
    pageShell('Equipe', 'Colaboradores', 'Pessoas, máquinas e recursos vinculados do estoque.', `<button class="btn primary" id="addBtn">${ic('plus')}Novo colaborador</button>`);
    const rows = () => Store.get('team').map((u) => {
      const mine = Store.itemsForUser(u.id);
      const resCell = mine.length
        ? `<div class="chips">${mine.slice(0, 3).map((i) => `<span class="chip">${ic(invIcon(i.type))}${esc(i.type)}</span>`).join('')}${mine.length > 3 ? `<span class="chip">+${mine.length - 3}</span>` : ''}</div>`
        : '<span class="cell-sub">Nenhum</span>';
      return `<tr class="tr-click" data-detail="${u.id}" title="Ver detalhes de ${esc(u.name)}">
        <td><div class="id-cell"><span class="avatar">${esc(initials(u.name))}</span><div><div class="cell-main">${esc(u.name)}</div><div class="cell-sub">${u.email ? esc(u.email) : '—'}</div></div></div></td>
        <td class="hide-sm">${u.sector ? `<span class="badge neutral plain">${esc(u.sector)}</span>` : '<span class="cell-sub">—</span>'}</td>
        <td>${u.machineId && compName(u.machineId) ? `<span class="mono">${esc(compName(u.machineId))}</span>` : '<span class="cell-sub">—</span>'}</td>
        <td class="hide-sm">${yn(u.vpn)}</td>
        <td class="hide-sm">${yn(u.engServer)}</td>
        <td class="hide-sm">${resCell}</td>
        <td><div class="row-actions">
          <button class="mini-btn" data-link="${u.id}" title="Vincular recursos">${ic('box')}</button>
          ${copyBtn(u.email, 'E-mail copiado')}
          <button class="mini-btn" data-edit="${u.id}" title="Editar">${ic('edit')}</button>
          <button class="mini-btn danger" data-del="${u.id}" title="Excluir">${ic('trash')}</button>
        </div></td>
      </tr>`;
    }).join('');
    renderTable(['Colaborador', 'Setor', 'Máquina', 'VPN', 'Servidor Eng.', 'Recursos', ''], rows, 'team');
    $('#addBtn').onclick = () => formTeam();
    bindRowActions('team', formTeam, (u) => `${u.name}`);
    $$('[data-link]', view).forEach((b) => (b.onclick = () => manageUserResources(Store.find('team', b.dataset.link))));
    $$('tr[data-detail]', view).forEach((r) => (r.onclick = (e) => {
      if (e.target.closest('.row-actions') || e.target.closest('button')) return; // não abre ao clicar nas ações
      teamDetail(Store.find('team', r.dataset.detail));
    }));
  };

  /* ============ COMPUTADORES ============ */
  PAGES.computadores = () => {
    pageShell('Computadores', 'Inventário de máquinas', 'Frota real PC00–PC30 — service tags, contas Office e antivírus.', `<button class="btn primary" id="addBtn">${ic('plus')}Novo computador</button>`);
    statusFilter('computers', ['ativo', 'manutencao', 'inativo'], (list) => {
      const rows = list.map((c) => `<tr class="tr-click" data-detail="${c.id}" title="Ver detalhes de ${esc(c.hostname)}">
        <td><div class="id-cell"><span class="st-ico" style="width:34px;height:34px;border-radius:9px">${ic(c.type === 'notebook' ? 'laptop' : 'desktop')}</span><div><div class="cell-main mono${c.admin ? ' is-admin' : ''}"${c.admin ? ' title="Acesso administrador"' : ''}>${esc(c.hostname)}</div><div class="cell-sub">${c.serial && c.serial !== '—' ? esc(c.serial) : (c.type === 'notebook' ? 'Notebook' : 'Desktop')}</div></div></div></td>
        <td>${c.userId && userName(c.userId) ? esc(userName(c.userId)) : '<span class="badge warn">Sem usuário</span>'}</td>
        <td class="hide-sm">${c.office ? `<span class="mono" style="font-size:.78rem">${esc(c.office)}</span>` : '<span class="cell-sub">—</span>'}</td>
        <td class="hide-sm">${avBadge(c.antivirus)}</td>
        <td>${sBadge(c.status)}</td>
        <td><div class="row-actions">
          <button class="mini-btn" data-copy="${esc(c.hostname)}" data-copy-label="Hostname copiado" title="Copiar hostname">${ic('copy')}</button>
          <button class="mini-btn" data-maint="${c.id}" title="${c.status === 'manutencao' ? 'Tirar de manutenção' : 'Marcar manutenção'}">${ic('wrench')}</button>
          <button class="mini-btn" data-edit="${c.id}" title="Editar">${ic('edit')}</button>
          <button class="mini-btn danger" data-del="${c.id}" title="Excluir">${ic('trash')}</button>
        </div></td>
      </tr>`).join('');
      return { head: ['Máquina', 'Usuário', 'Conta Office', 'Antivírus', 'Status', ''], rows };
    });
    $('#addBtn').onclick = () => formComputer();
  };

  /* ---------- painéis 360°: helpers compartilhados ---------- */
  const kvRow = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const dtDash = '<span class="cell-sub">—</span>';
  // máquina como link-item clicável (abre computerDetail)
  const machineLinkItem = (p) => `<div class="link-item detail-pc" data-detail-pc="${p.id}" title="Ver ${esc(p.hostname)}">
      <span class="li-ico">${ic(p.type === 'notebook' ? 'laptop' : 'desktop')}</span>
      <div class="li-tx"><b class="mono${p.admin ? ' is-admin' : ''}">${esc(p.hostname)}</b><span>${p.serial && p.serial !== '—' && p.serial !== '?' ? esc(p.serial) + ' · ' : ''}${p.type === 'notebook' ? 'Notebook' : 'Desktop'}</span></div>
      ${sBadge(p.status)}
    </div>`;
  const licChips = (lics) => lics.length
    ? `<div class="chips">${lics.map((l) => `<span class="chip chip-link" data-detail-lic="${l.id}" title="Ver assentos">${ic(licTypeIcon(l.type))}${esc(l.name)}</span>`).join('')}</div>`
    : `<div class="cell-sub">Nenhuma licença vinculada.</div>`;
  const phoneChips = (phs) => phs.length
    ? `<div class="chips">${phs.map((p) => `<span class="chip">${ic('phone')}<span class="mono">${esc(p.number || '—')}</span>${p.plan ? ' · ' + esc(p.plan) : ''}</span>`).join('')}</div>`
    : '';
  const vaultChips = (vs) => vs.length
    ? `<div class="chips">${vs.map((v) => `<span class="chip">${ic(vaultIcon(v.category))}${esc(v.label)}</span>`).join('')}</div>`
    : '';
  // liga chips/itens clicáveis dentro de um painel à navegação cruzada
  function bindDetailLinks(card) {
    $$('[data-detail-pc]', card).forEach((el) => (el.onclick = () => { closeModal(); computerDetail(Store.find('computers', el.dataset.detailPc)); }));
    $$('[data-detail-user]', card).forEach((el) => (el.onclick = () => { const id = el.dataset.detailUser; if (id) { closeModal(); teamDetail(Store.find('team', id)); } }));
    $$('[data-detail-lic]', card).forEach((el) => (el.onclick = () => { closeModal(); licenseDetail(Store.find('licenses', el.dataset.detailLic)); }));
  }

  // Painel 360° da MÁQUINA: dados + usuário + periféricos DESTA máquina + licenças + cofre.
  function computerDetail(c) {
    if (!c) return;
    const L = Store.linksForMachine(c.id);
    const u = L.user;
    const avLic = c.antivirusLicenseId ? Store.find('licenses', c.antivirusLicenseId) : null;
    const periphs = L.peripherals.length
      ? `<div class="chips">${L.peripherals.map((i) => { const a = (i.assignments || []).find((x) => x.machineId === c.id) || {}; const hu = a.userId ? Store.find('team', a.userId) : null; return `<span class="chip">${ic(invIcon(i.type))}${esc(i.type)} · ${esc(i.brandModel)}${hu ? ` <span class="chip-mach">${esc(hu.name.split(' ')[0])}</span>` : ''}</span>`; }).join('')}</div>`
      : `<div class="cell-sub">Nenhum periférico nesta máquina.</div>`;
    const body = `
      <div class="detail-hero">
        <span class="st-ico lg${c.status === 'manutencao' ? ' tone-warn' : c.status === 'inativo' ? ' tone-danger' : ''}">${ic(c.type === 'notebook' ? 'laptop' : 'desktop')}</span>
        <div>
          <div class="dh-name mono${c.admin ? ' is-admin' : ''}">${esc(c.hostname)}</div>
          <div class="dh-tags">${sBadge(c.status)}<span class="badge neutral plain">${c.type === 'notebook' ? 'Notebook' : 'Desktop'}</span>${c.admin ? `<span class="badge warn plain">${ic('shield')}Admin</span>` : ''}</div>
        </div>
      </div>

      <div class="form-sec">${ic('monitor')}Máquina</div>
      <dl class="kv">
        ${kvRow('Service Tag', c.serial && c.serial !== '—' && c.serial !== '?' ? `<span class="mono">${esc(c.serial)}</span>${copyBtn(c.serial, 'Service tag copiada')}` : dtDash)}
        ${kvRow('Antivírus', avBadge(c.antivirus) + (avLic ? ` <span class="chip chip-link" data-detail-lic="${avLic.id}" title="Ver licença">${ic('key')}${esc(avLic.name)}</span>` : ''))}
        ${kvRow('Conta Office', c.office && c.office !== '—' ? `<span class="mono">${esc(c.office)}</span>${copyBtn(c.office, 'Conta copiada')}` : dtDash)}
        ${c.notes ? kvRow('Notas', esc(c.notes)) : ''}
      </dl>

      <div class="form-sec">${ic('users')}Usuário vinculado</div>
      ${u ? `
        <div class="detail-user detail-pc" data-detail-user="${u.id}" title="Ver ${esc(u.name)}">
          <span class="avatar lg">${esc(initials(u.name))}</span>
          <div class="du-main">
            <div class="du-name">${esc(u.name)}</div>
            <div class="du-mail">${u.email ? `<span class="mono">${esc(u.email)}</span>` : '<span class="cell-sub">Sem e-mail</span>'}${u.sector ? ` · <span class="cell-sub">${esc(u.sector)}</span>` : ''}</div>
          </div>
          <span class="badge neutral plain">${ic('external')}Abrir</span>
        </div>
      ` : `<div class="link-note">${ic('alert')}Nenhum usuário vinculado a esta máquina.</div>`}

      <div class="form-sec">${ic('box')}Periféricos nesta máquina</div>
      ${periphs}

      <div class="form-sec">${ic('key')}Licenças da máquina</div>
      ${licChips(L.licenses)}

      ${L.vault.length ? `<div class="form-sec">${ic('shield')}Cofre</div>${vaultChips(L.vault)}` : ''}`;

    const footer = `<button class="btn ghost" data-close>Fechar</button>${u ? `<button class="btn" id="dtUser">${ic('users')}Ver colaborador</button>` : ''}<button class="btn primary" id="dtEdit">${ic('edit')}Editar</button>`;
    const card = modal({ title: 'Detalhes da máquina', sub: c.hostname, wide: true, body, footer });
    bindCopy(card); bindDetailLinks(card);
    $('#dtEdit', card).onclick = () => { closeModal(); formComputer(c); };
    const uBtn = $('#dtUser', card);
    if (uBtn) uBtn.onclick = () => { closeModal(); teamDetail(Store.find('team', u.id)); };
  }

  // Painel 360° do COLABORADOR: dados + máquinas(N) + periféricos + licenças + telefones + cofre.
  function teamDetail(u) {
    if (!u) return;
    const L = Store.linksForUser(u.id);
    const pc = Store.primaryMachine(u.id);
    const otherPcs = L.machines.filter((c) => !pc || c.id !== pc.id);
    const sect = (u.sector || '').toLowerCase();
    const spLinks = Store.get('sharepoint').filter((s) => sect && s.name && sect.includes(s.name.toLowerCase()));
    const periphs = L.peripherals.length
      ? `<div class="chips">${L.peripherals.map((i) => { const a = (i.assignments || []).find((x) => x.userId === u.id) || {}; return `<span class="chip">${ic(invIcon(i.type))}${esc(i.type)} · ${esc(i.brandModel)}${a.machineId ? ` <span class="chip-mach">${esc(a.machineId)}</span>` : ''}</span>`; }).join('')}</div>`
      : `<div class="cell-sub">Nenhum periférico vinculado.</div>`;
    const body = `
      <div class="detail-hero">
        <span class="avatar lg">${esc(initials(u.name))}</span>
        <div>
          <div class="dh-name">${esc(u.name)}</div>
          <div class="dh-tags">${u.sector ? `<span class="badge neutral plain">${esc(u.sector)}</span>` : ''}${u.email ? `<span class="chip">${ic('mail')}<span class="mono">${esc(u.email)}</span></span>` : ''}</div>
        </div>
      </div>

      <div class="form-sec">${ic('users')}Colaborador</div>
      <dl class="kv">
        ${kvRow('E-mail', u.email ? `<span class="mono">${esc(u.email)}</span>${copyBtn(u.email, 'E-mail copiado')}` : dtDash)}
        ${kvRow('Setor', u.sector ? `<span class="badge neutral plain">${esc(u.sector)}</span>` : dtDash)}
        ${kvRow('VPN', yn(u.vpn))}
        ${kvRow('Servidor Eng.', yn(u.engServer))}
      </dl>

      <div class="form-sec">${ic('monitor')}Máquinas${L.machines.length > 1 ? ` <span class="sec-count">${L.machines.length}</span>` : ''}</div>
      ${pc ? machineLinkItem(pc) : (otherPcs.length ? '' : `<div class="cell-sub">Nenhuma máquina vinculada.</div>`)}
      ${otherPcs.length ? `<div class="du-others">${pc ? '<span class="cell-sub">Outras máquinas</span>' : ''}${otherPcs.map(machineLinkItem).join('')}</div>` : ''}

      <div class="form-sec">${ic('box')}Periféricos</div>
      ${periphs}

      <div class="form-sec">${ic('key')}Licenças</div>
      ${licChips(L.licenses)}

      ${L.phones.length ? `<div class="form-sec">${ic('phone')}Telefonia</div>${phoneChips(L.phones)}` : ''}
      ${L.vault.length ? `<div class="form-sec">${ic('shield')}Cofre</div>${vaultChips(L.vault)}` : ''}
      ${spLinks.length ? `<div class="form-sec">${ic('globe')}SharePoint do setor</div><div class="chips">${spLinks.map((s) => `<a class="chip chip-link" href="${esc(s.url)}" target="_blank" rel="noopener">${ic('globe')}${esc(s.name)}</a>`).join('')}</div>` : ''}`;

    const footer = `<button class="btn ghost" data-close>Fechar</button><button class="btn" id="dtLink">${ic('box')}Vincular recursos</button><button class="btn primary" id="dtEdit">${ic('edit')}Editar</button>`;
    const card = modal({ title: 'Detalhes do colaborador', sub: u.name, wide: true, body, footer });
    bindCopy(card); bindDetailLinks(card);
    $('#dtEdit', card).onclick = () => { closeModal(); formTeam(u); };
    $('#dtLink', card).onclick = () => { closeModal(); manageUserResources(Store.find('team', u.id)); };
  }

  // Painel 360° da LICENÇA: dados + assentos ocupados (usuários/máquinas clicáveis).
  function licenseDetail(l) {
    if (!l) return;
    const used = l.assignments || [];
    const total = Number(l.seatsTotal) || 0, free = Store.licenseSeatsFree(l);
    const st = licStatus(l.renewalDate);
    const seatRow = (a) => {
      const u = a.userId ? Store.find('team', a.userId) : null;
      const c = a.machineId ? Store.find('computers', a.machineId) : null;
      const title = u ? u.name : (c ? c.hostname : '(vazio)');
      const sub = [u && c ? c.hostname : '', u ? (u.email || '') : (c ? 'Máquina' : '')].filter(Boolean).join(' · ') || '—';
      const tgt = u ? `data-detail-user="${u.id}"` : (c ? `data-detail-pc="${c.id}"` : '');
      return `<div class="link-item ${tgt ? 'detail-pc' : ''}" ${tgt}>
          <span class="li-ico">${ic(u ? 'users' : 'monitor')}</span>
          <div class="li-tx"><b>${esc(title)}</b><span>${esc(sub)}</span></div>
          ${tgt ? `<span class="badge neutral plain">${ic('external')}</span>` : ''}
        </div>`;
    };
    const body = `
      <div class="detail-hero">
        <span class="st-ico lg">${ic(licTypeIcon(l.type))}</span>
        <div>
          <div class="dh-name">${esc(l.name)}</div>
          <div class="dh-tags"><span class="badge neutral plain">${esc(l.type || '—')}</span><span class="badge ${st.cls}">${esc(st.label)}</span></div>
        </div>
      </div>

      <div class="form-sec">${ic('key')}Licença</div>
      <dl class="kv">
        ${kvRow('Fornecedor', l.vendor ? esc(l.vendor) : dtDash)}
        ${kvRow('Abrangência', l.seats ? esc(l.seats) : dtDash)}
        ${kvRow('Responsável', l.owner ? `<span class="mono">${esc(l.owner)}</span>` : dtDash)}
        ${kvRow('Renovação', l.renewalDate ? fmtDate(l.renewalDate) : dtDash)}
        ${l.code ? kvRow('Código', `<span class="mono">${esc(l.code)}</span>${copyBtn(l.code, 'Código copiado')}`) : ''}
      </dl>

      <div class="form-sec">${ic('users')}Assentos</div>
      <div class="alloc-summary">
        <div class="as-cell"><span class="as-v">${total || '—'}</span><span class="as-k">Total</span></div>
        <div class="as-cell"><span class="as-v" style="color:var(--warn)">${used.length}</span><span class="as-k">Usados</span></div>
        <div class="as-cell"><span class="as-v" style="color:var(--ok)">${free}</span><span class="as-k">Livres</span></div>
      </div>
      <div class="link-list">${used.length ? used.map(seatRow).join('') : '<div class="link-empty">Nenhum assento ocupado ainda.</div>'}</div>`;

    const footer = `<button class="btn ghost" data-close>Fechar</button><button class="btn" id="dtSeats">${ic('users')}Vincular assentos</button><button class="btn primary" id="dtEdit">${ic('edit')}Editar</button>`;
    const card = modal({ title: 'Detalhes da licença', sub: l.name, wide: true, body, footer });
    bindCopy(card); bindDetailLinks(card);
    $('#dtEdit', card).onclick = () => { closeModal(); formLicense(l); };
    $('#dtSeats', card).onclick = () => { closeModal(); manageLicenseAssignments(l); };
  }

  /* ============ IMPRESSORAS ============ */
  PAGES.impressoras = () => {
    pageShell('Impressoras', 'Gestão de impressão', 'Endereços, localização e drivers diretos.', `<button class="btn primary" id="addBtn">${ic('plus')}Nova impressora</button>`);
    const rows = () => Store.get('printers').map((p) => `<tr>
      <td><div class="id-cell"><span class="st-ico" style="width:34px;height:34px;border-radius:9px">${ic('printer')}</span><div><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${esc(p.location || '—')}</div></div></div></td>
      <td>${p.ip ? `<span class="mono">${esc(p.ip)}</span>` : '<span class="cell-sub">USB</span>'}</td>
      <td class="hide-sm"><span class="badge plain neutral">${p.type === 'rede' ? 'Rede' : 'USB'}</span></td>
      <td>${sBadge(p.status)}</td>
      <td><div class="row-actions">
        ${p.driverUrl ? `<a class="mini-btn" href="${esc(p.driverUrl)}" target="_blank" rel="noopener" title="Abrir driver">${ic('external')}</a>` : `<span class="mini-btn" style="opacity:.35" title="Sem driver">${ic('external')}</span>`}
        ${p.ip ? `<button class="mini-btn" data-copy="${esc(p.ip)}" data-copy-label="IP copiado" title="Copiar IP">${ic('copy')}</button>` : ''}
        <button class="mini-btn" data-guide="${p.id}" title="Guia de instalação">${ic('book')}</button>
        <button class="mini-btn" data-edit="${p.id}" title="Editar">${ic('edit')}</button>
        <button class="mini-btn danger" data-del="${p.id}" title="Excluir">${ic('trash')}</button>
      </div></td>
    </tr>`).join('');
    renderTable(['Impressora', 'IP', 'Tipo', 'Status', ''], rows, 'printers');
    $('#addBtn').onclick = () => formPrinter();
    bindRowActions('printers', formPrinter, (p) => p.name);
    $$('[data-guide]', view).forEach((b) => (b.onclick = () => printerGuide(Store.find('printers', b.dataset.guide))));
  };

  function printerGuide(p) {
    modal({
      title: 'Guia de instalação', sub: p.name,
      body: `
        <ol class="steps">
          <li><span>Baixe o driver ${p.driverUrl ? 'pelo botão abaixo' : '(link não cadastrado — adicione a Driver URL)'}.</span></li>
          <li><span>Abra <b>Painel de Controle → Dispositivos e Impressoras → Adicionar impressora</b>.</span></li>
          ${p.type === 'rede' ? `<li><span>Escolha <b>Adicionar por TCP/IP</b> e informe o IP <span class="mono">${esc(p.ip || '—')}</span>.</span></li>` : `<li><span>Conecte o cabo USB e aguarde a detecção automática.</span></li>`}
          <li><span>Selecione o driver baixado e conclua a instalação.</span></li>
          <li><span>Imprima uma <b>página de teste</b> para validar.</span></li>
        </ol>`,
      footer: `${p.driverUrl ? `<a class="btn primary" href="${esc(p.driverUrl)}" target="_blank" rel="noopener">${ic('external')}Abrir driver</a>` : ''}<button class="btn ghost" data-close>Fechar</button>`,
    });
  }

  /* ============ COMMAND CENTER ============ */
  const CMD_CATS = ['Sistema', 'Rede', 'Diagnóstico', 'Office'];
  const cmdCatIcon = (c) => ({ 'Sistema': 'cpu', 'Rede': 'globe', 'Diagnóstico': 'activity', 'Office': 'grid' }[c] || 'terminal');
  // bold the leading "Label:" of each line and keep line breaks
  const fmtHowto = (t) => esc(t || 'Sem instruções adicionais.').split('\n').map((line) => {
    const m = line.match(/^([^:]{2,42}:)(.*)$/);
    return m ? `<b>${m[1]}</b>${m[2]}` : line;
  }).join('\n');
  const cmdTags = (c) => `<span class="cat-pill">${esc(c.category)}</span>${c.shell ? `<span class="cmd-tag">${esc(c.shell)}</span>` : ''}${c.admin ? `<span class="cmd-tag admin">${ic('shield')}Admin</span>` : ''}`;
  PAGES.command = () => {
    pageShell('Command Center', 'Biblioteca de comandos', 'Comandos operacionais prontos para copiar. O sistema nunca executa — apenas orienta.', `<button class="btn primary" id="addBtn">${ic('plus')}Novo comando</button>`);
    const wrap = document.createElement('div');
    const state = { cat: 'all', q: '' };
    const tb = document.createElement('div');
    tb.className = 'toolbar';
    tb.innerHTML = `
      <div class="filter-input">${ic('search')}<input id="cmdSearch" placeholder="Buscar comando…"></div>
      <div class="seg" id="cmdCats">
        <button data-c="all" class="on">Todos</button>
        ${CMD_CATS.map((c) => `<button data-c="${c}">${c}</button>`).join('')}
      </div>`;
    const grid = document.createElement('div'); grid.className = 'cmd-grid';
    wrap.appendChild(tb); wrap.appendChild(grid);
    view.appendChild(wrap); Icons.apply(tb);

    function render() {
      const items = Store.get('commands').filter((c) =>
        (state.cat === 'all' || c.category === state.cat) &&
        (c.title + c.desc + c.command + c.category).toLowerCase().includes(state.q.toLowerCase()));
      grid.innerHTML = items.length ? items.map((c) => `
        <div class="cmd-card">
          <div class="cmd-head">
            <span class="cmd-cat-ico cat-${esc(c.category)}">${ic(cmdCatIcon(c.category))}</span>
            <div class="cmd-htx">
              <div class="cmd-title">${esc(c.title)}</div>
              <div class="cmd-tags">${cmdTags(c)}</div>
            </div>
          </div>
          <div class="cmd-desc">${esc(c.desc)}</div>
          <div class="cmd-code">${esc(c.command)}</div>
          <div class="cmd-foot">
            <button class="btn sm primary" data-copy="${esc(c.command)}" data-copy-label="Comando copiado">${ic('copy')}Copiar</button>
            <button class="btn sm ghost" data-how="${c.id}">${ic('book')}Como usar</button>
            <span class="spacer" style="flex:1"></span>
            <button class="mini-btn" data-edit="${c.id}" title="Editar">${ic('edit')}</button>
            <button class="mini-btn danger" data-del="${c.id}" title="Excluir">${ic('trash')}</button>
          </div>
        </div>`).join('') : emptyState('terminal', 'Nenhum comando encontrado', 'Ajuste a busca ou crie um novo comando.');
      Icons.apply(grid);
      bindCopy(grid);
      $$('[data-how]', grid).forEach((b) => (b.onclick = () => howto(Store.find('commands', b.dataset.how))));
      $$('[data-edit]', grid).forEach((b) => (b.onclick = () => formCommand(Store.find('commands', b.dataset.edit))));
      $$('[data-del]', grid).forEach((b) => (b.onclick = () => confirmDialog(`Excluir o comando?`, () => { Store.remove('commands', b.dataset.del); render(); toast('Comando excluído', 'info'); })));
    }
    $('#cmdSearch', tb).oninput = (e) => { state.q = e.target.value; render(); };
    $$('#cmdCats button', tb).forEach((b) => (b.onclick = () => { state.cat = b.dataset.c; $$('#cmdCats button', tb).forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(); }));
    $('#addBtn').onclick = () => formCommand();
    render();
  };

  function howto(c) {
    modal({
      title: c.title, sub: 'Como usar',
      body: `
        <div class="howto-meta">${cmdTags(c)}</div>
        <div class="cmd-code" style="margin-bottom:16px">${esc(c.command)}</div>
        <div class="howto-body">${fmtHowto(c.howto)}</div>
        <div class="howto-warn">${ic('alert')}<span>O Ops Center <b>não executa</b> comandos — copie e rode manualmente no terminal indicado${c.admin ? ' <b>como Administrador</b>' : ''}.</span></div>`,
      footer: `<button class="btn primary" data-copy="${esc(c.command)}" data-copy-label="Comando copiado">${ic('copy')}Copiar comando</button><button class="btn ghost" data-close>Fechar</button>`,
    });
    bindCopy($('#modalCard'));
  }

  /* ============ RUNBOOKS ============ */
  PAGES.runbooks = () => {
    pageShell('Runbooks', 'Procedimentos operacionais', 'Passo a passo padronizado para reduzir dependência de memória.', `<button class="btn primary" id="addBtn">${ic('plus')}Novo runbook</button>`);
    const grid = document.createElement('div'); grid.className = 'rb-grid'; view.appendChild(grid);
    const render = () => {
      const items = Store.get('runbooks');
      grid.innerHTML = items.length ? items.map((r) => `
        <div class="rb-card" data-open="${r.id}">
          <div class="rb-top"><span class="rb-ico">${ic('book')}</span><h3>${esc(r.title)}</h3></div>
          <div class="rb-desc">${esc(r.desc)}</div>
          <div class="rb-meta">
            <span>${ic('list')}${r.steps.length} passos</span>
            <span>${ic('terminal')}${(r.related || []).length} comandos</span>
          </div>
        </div>`).join('') : emptyState('book', 'Nenhum runbook', 'Crie procedimentos para padronizar a operação.');
      Icons.apply(grid);
      $$('[data-open]', grid).forEach((b) => { b.onclick = () => openRunbook(Store.find('runbooks', b.dataset.open)); });
    };
    $('#addBtn').onclick = () => formRunbook();
    render();
    PAGES.runbooks._render = render;
  };

  function openRunbook(r) {
    const related = (r.related || []).map((id) => Store.find('commands', id)).filter(Boolean);
    modal({
      wide: true, title: r.title, sub: 'Runbook · ' + r.steps.length + ' passos',
      body: `
        <p style="color:var(--text-2);font-size:.9rem;margin-bottom:18px">${esc(r.desc)}</p>
        <ol class="steps">${r.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol>
        ${related.length ? `<div class="section-head" style="margin:22px 0 12px"><h2 style="font-size:1.05rem"><span class="sh-ico">${ic('terminal')}</span>Comandos relacionados</h2></div>
          ${related.map((c) => `<div class="cmd-card" style="margin-bottom:10px;box-shadow:none">
            <div class="cmd-top"><div class="cmd-title" style="font-size:.92rem">${esc(c.title)}</div><span class="cat-pill">${esc(c.category)}</span></div>
            <div class="cmd-code" style="margin:8px 0 0">${esc(c.command)}</div>
            <div class="cmd-foot" style="margin-top:10px"><button class="btn sm primary" data-copy="${esc(c.command)}" data-copy-label="Comando copiado">${ic('copy')}Copiar</button></div>
          </div>`).join('')}` : ''}`,
      footer: `<button class="btn ghost" data-edit-rb="${r.id}">${ic('edit')}Editar</button><button class="btn primary" data-close>Fechar</button>`,
    });
    bindCopy($('#modalCard'));
    const eb = $('[data-edit-rb]', $('#modalCard'));
    if (eb) eb.onclick = () => { closeModal(); formRunbook(r); };
  }

  /* ============ DOMÍNIO & INFRA ============ */
  PAGES.infra = () => {
    pageShell('Domínio & Infra', 'Infraestrutura web', 'Domínios, provedores, DNS e IPs atuais.', `<button class="btn primary" id="addDom">${ic('plus')}Novo domínio</button>`);
    const doms = Store.get('webDomains'), dnsList = Store.get('dnsRecords');
    const wrap = document.createElement('div'); wrap.className = 'grid'; wrap.style.gap = '20px';

    const domains = `
      <div class="section-head"><h2><span class="sh-ico">${ic('globe')}</span>Domínios</h2><span class="badge plain">${doms.length}</span></div>
      <div class="dom-grid">
        ${doms.length ? doms.map((d) => `
          <div class="dom-card">
            <div class="dom-top">
              <div class="dom-id"><span class="dom-ico">${ic('globe')}</span><div><div class="dom-name">${esc(d.domain)}</div><div class="cell-sub">${esc(d.provider || '—')}</div></div></div>
              ${sBadge(d.status)}
            </div>
            <dl class="kv">
              <dt>IP atual</dt><dd><span class="mono">${esc(d.ip || '—')}</span>${d.ip ? copyBtn(d.ip, 'IP copiado') : ''}</dd>
              <dt>Provedor</dt><dd>${esc(d.provider || '—')}</dd>
              ${d.notes ? `<dt>Obs.</dt><dd>${esc(d.notes)}</dd>` : ''}
            </dl>
            <div class="dom-actions">
              ${d.adminUrl ? `<a class="btn sm" href="${esc(d.adminUrl)}" target="_blank" rel="noopener">${ic('external')}Abrir painel${d.provider ? ' ' + esc(d.provider) : ''}</a>` : ''}
              <button class="mini-btn" data-edom="${d.id}" title="Editar">${ic('edit')}</button>
              <button class="mini-btn danger" data-ddom="${d.id}" title="Excluir">${ic('trash')}</button>
            </div>
          </div>`).join('') : emptyState('globe', 'Nenhum domínio cadastrado', 'Clique em "Novo domínio" para adicionar.')}
      </div>`;

    const dns = `
      <div class="section-head"><h2><span class="sh-ico">${ic('server')}</span>Registros DNS</h2>
        <div style="display:flex;gap:8px">${dnsList.length ? `<button class="btn sm" id="copyAllDns">${ic('copy')}Copiar todos</button>` : ''}<button class="btn sm primary" id="addDns">${ic('plus')}Novo registro</button></div></div>
      <div class="tbl-wrap">
        ${dnsList.length ? `<table class="data">
          <thead><tr><th>Tipo</th><th>Nome</th><th>Valor</th><th></th></tr></thead>
          <tbody>${dnsList.map((r) => `<tr>
            <td><span class="badge plain info">${esc(r.type)}</span></td>
            <td class="mono">${esc(r.name)}</td>
            <td class="mono">${esc(r.value)}</td>
            <td><div class="row-actions">${copyBtn(`${r.type} ${r.name} ${r.value}`, 'Registro copiado')}<button class="mini-btn" data-edns="${r.id}" title="Editar">${ic('edit')}</button><button class="mini-btn danger" data-ddns="${r.id}" title="Excluir">${ic('trash')}</button></div></td>
          </tr>`).join('')}</tbody>
        </table>` : emptyState('server', 'Nenhum registro DNS', 'Clique em "Novo registro" para adicionar.')}
      </div>`;

    wrap.innerHTML = domains + dns;
    view.appendChild(wrap); Icons.apply(view); bindCopy(view);
    const cad = $('#copyAllDns'); if (cad) cad.onclick = () => copy(dnsList.map((r) => `${r.type}\t${r.name}\t${r.value}`).join('\n'), 'Todos os registros DNS copiados');
    $('#addDom').onclick = () => formDomain();
    $('#addDns').onclick = () => formDns();
    $$('[data-edom]', view).forEach((b) => (b.onclick = () => formDomain(Store.find('webDomains', b.dataset.edom))));
    $$('[data-ddom]', view).forEach((b) => (b.onclick = () => { const d = Store.find('webDomains', b.dataset.ddom); confirmDialog(`Excluir o domínio "${esc(d.domain)}"?`, () => { Store.remove('webDomains', d.id); refreshPage(); toast('Domínio removido', 'info'); }); }));
    $$('[data-edns]', view).forEach((b) => (b.onclick = () => formDns(Store.find('dnsRecords', b.dataset.edns))));
    $$('[data-ddns]', view).forEach((b) => (b.onclick = () => { const r = Store.find('dnsRecords', b.dataset.ddns); confirmDialog('Excluir este registro DNS?', () => { Store.remove('dnsRecords', r.id); refreshPage(); toast('Registro removido', 'info'); }); }));
  };

  function formDomain(d) {
    const editing = !!(d && d.id); d = d || {};
    const card = modal({
      title: editing ? 'Editar domínio' : 'Novo domínio', sub: 'Infraestrutura',
      body: `<div class="form-grid">
        ${field('Domínio', 'domain', d.domain, 'text', { full: true, ph: 'Ex: convergasapp.com.br' })}
        ${field('Provedor / registrador', 'provider', d.provider, 'text', { ph: 'Ex: Registro.br' })}
        ${field('IP atual', 'ip', d.ip, 'text', { ph: 'Ex: 199.36.158.100' })}
        ${field('Status', 'status', d.status || 'ativo', 'select', { options: [{ v: 'ativo', t: 'Ativo' }, { v: 'inativo', t: 'Inativo' }] })}
        ${field('URL do painel', 'adminUrl', d.adminUrl, 'text', { full: true, ph: 'https://registro.br/' })}
        ${field('Observações', 'notes', d.notes, 'textarea', { full: true })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const v = readForm(card);
      if (!v.domain) return toast('Informe o domínio', 'warn');
      let adminUrl = (v.adminUrl || '').trim(); if (adminUrl && !/^https?:\/\//i.test(adminUrl)) adminUrl = 'https://' + adminUrl;
      const rec = { domain: v.domain, provider: v.provider, ip: v.ip, status: v.status, adminUrl, notes: v.notes };
      if (editing) Store.update('webDomains', d.id, rec); else Store.add('webDomains', rec);
      toast(editing ? 'Domínio atualizado' : 'Domínio cadastrado'); closeModal(); if (PAGES[currentRoute]) refreshPage();
    };
  }

  function formDns(r) {
    const editing = !!(r && r.id); r = r || {};
    const card = modal({
      title: editing ? 'Editar registro DNS' : 'Novo registro DNS', sub: 'Infraestrutura',
      body: `<div class="form-grid">
        ${field('Tipo', 'type', r.type || 'A', 'select', { options: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'].map((t) => ({ v: t, t })) })}
        ${field('Nome', 'name', r.name, 'text', { ph: '@ ou www' })}
        ${field('Valor', 'value', r.value, 'text', { full: true, ph: 'IP ou destino' })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const v = readForm(card);
      if (!v.name) return toast('Informe o nome do registro', 'warn');
      const rec = { type: v.type, name: v.name, value: v.value };
      if (editing) Store.update('dnsRecords', r.id, rec); else Store.add('dnsRecords', rec);
      toast(editing ? 'Registro atualizado' : 'Registro criado'); closeModal(); if (PAGES[currentRoute]) refreshPage();
    };
  }

  /* ============ INVENTÁRIO ============ */
  PAGES.inventario = () => {
    pageShell('Periféricos', 'Ativos físicos', 'Periféricos e equipamentos — estoque vinculado aos colaboradores.', `<button class="btn primary" id="addBtn">${ic('plus')}Novo item</button>`);
    statusFilter('inventory', ['em_uso', 'disponivel', 'reserva'], (list) => {
      const rows = list.map((i) => {
        const used = i.assignments || [];
        const avail = Store.availableOf(i);
        const allocCell = used.length
          ? `<div class="alloc-cell">
               <span class="avastack">${used.slice(0, 3).map((a) => { const u = Store.find('team', a.userId); return `<span class="avatar mini" title="${esc((u ? u.name : '?') + (a.machineId ? ' · ' + a.machineId : ''))}">${esc(initials(u ? u.name : '?'))}</span>`; }).join('')}</span>
               <span class="cell-sub">${used.length}/${i.qty} em uso</span>
             </div>`
          : '<span class="cell-sub">Livre</span>';
        return `<tr>
          <td><div class="id-cell"><span class="st-ico" style="width:34px;height:34px;border-radius:9px">${ic(invIcon(i.type))}</span><div><div class="cell-main">${esc(i.brandModel)}</div><div class="cell-sub">${esc(i.type)}</div></div></div></td>
          <td><span class="mono">${i.qty}</span> <span class="cell-sub">· ${avail} livre${avail === 1 ? '' : 's'}</span></td>
          <td>${sBadge(i.status)}</td>
          <td>${allocCell}</td>
          <td><div class="row-actions">
            <button class="mini-btn" data-link="${i.id}" title="Vincular a usuário">${ic('users')}</button>
            <button class="mini-btn" data-edit="${i.id}" title="Editar">${ic('edit')}</button>
            <button class="mini-btn danger" data-del="${i.id}" title="Excluir">${ic('trash')}</button>
          </div></td>
        </tr>`;
      }).join('');
      return { head: ['Item', 'Estoque', 'Status', 'Alocação', ''], rows };
    });
    $('#addBtn').onclick = () => formInventory();
  };
  const invIcon = (t) => ({ Mouse: 'mouse', Teclado: 'keyboard', Monitor: 'monitor', Headset: 'activity' }[t] || 'box');

  /* ============ TELEFONIA ============ */
  PAGES.telefonia = () => {
    pageShell('Telefonia', 'Telefonia & atendimento', 'Linhas móveis, planos, titulares e custos — vinculados aos colaboradores.', `<button class="btn primary" id="addBtn">${ic('plus')}Nova linha</button>`);
    const phones = Store.get('phones');
    if (phones.length) {
      const total = phones.reduce((s, p) => s + (Number(p.value) || 0), 0);
      const owned = phones.filter((p) => /convergas/i.test(p.owner || '')).length;
      const head = document.createElement('div'); head.className = 'grid g3'; head.style.marginBottom = '20px';
      head.innerHTML = `${miniStat('phone', phones.length, 'Linhas')}${miniStat('shield', owned, 'Da empresa')}${miniStat('activity', brl(total), 'Custo mensal')}`;
      view.appendChild(head); Icons.apply(head); animateStats(head);
    }
    const rows = () => Store.get('phones').map((p) => {
      const u = p.userId ? Store.find('team', p.userId) : null;
      return `<tr class="${u ? 'tr-click' : ''}" data-detail-user="${p.userId || ''}" ${u ? `title="Ver ${esc(u.name)}"` : ''}>
        <td><div class="id-cell"><span class="st-ico" style="width:34px;height:34px;border-radius:9px">${ic('phone')}</span><div><div class="cell-main mono">${esc(p.number || '—')}</div><div class="cell-sub">${esc(p.model || '—')}</div></div></div></td>
        <td>${u ? `<b>${esc(u.name)}</b>` : (p.user ? esc(p.user) : '<span class="cell-sub">—</span>')}${p.sector ? `<div class="cell-sub">${esc(p.sector)}</div>` : ''}</td>
        <td class="hide-sm">${p.plan ? `<span class="badge neutral plain">${esc(p.plan)}</span>` : '<span class="cell-sub">—</span>'}</td>
        <td class="hide-sm">${p.value ? `<span class="mono">${esc(brl(p.value))}</span>` : '<span class="cell-sub">—</span>'}</td>
        <td>${p.owner ? `<span class="badge ${/convergas/i.test(p.owner) ? 'ok' : 'neutral'} plain">${esc(p.owner)}</span>` : '<span class="cell-sub">—</span>'}</td>
        <td><div class="row-actions">
          ${copyBtn(p.number || '', 'Número copiado')}
          <button class="mini-btn" data-edit="${p.id}" title="Editar">${ic('edit')}</button>
          <button class="mini-btn danger" data-del="${p.id}" title="Excluir">${ic('trash')}</button>
        </div></td>
      </tr>`;
    }).join('');
    renderTable(['Linha', 'Titular', 'Plano', 'Custo', 'Titularidade', ''], rows, 'phones');
    $('#addBtn').onclick = () => formPhone();
    bindRowActions('phones', formPhone, (p) => p.number || p.user || 'linha');
    $$('tr[data-detail-user]', view).forEach((r) => (r.onclick = (e) => {
      if (e.target.closest('.row-actions') || e.target.closest('button')) return;
      const uid = r.dataset.detailUser; if (uid) teamDetail(Store.find('team', uid));
    }));
  };

  function formPhone(p) {
    const editing = !!p; p = p || {};
    const uOpts = [{ v: '', t: '— Nenhum (usar nome livre) —' }].concat(Store.get('team').map((u) => ({ v: u.id, t: u.name })));
    const card = modal({
      wide: true, title: editing ? 'Editar linha' : 'Nova linha', sub: 'Telefonia',
      body: `<div class="form-grid">
        ${field('Número', 'number', p.number, 'text', { ph: '19 99999-9999' })}
        ${field('Titular (colaborador)', 'userId', p.userId, 'select', { options: uOpts })}
        ${field('Nome livre (se não for do time)', 'user', p.user, 'text', { ph: 'Ex: Braulio' })}
        ${field('Setor', 'sector', p.sector, 'text', { ph: 'Ex: Comercial' })}
        ${field('Plano', 'plan', p.plan, 'text', { ph: 'Ex: 8 GB' })}
        ${field('Custo mensal (R$)', 'value', p.value, 'number', { ph: '0,00' })}
        ${field('Aparelho', 'model', p.model, 'text', { ph: 'Ex: Motorola Moto G04' })}
        ${field('Titularidade', 'owner', p.owner || 'Convergas', 'select', { options: [{ v: 'Convergas', t: 'Convergas' }, { v: 'Próprio', t: 'Próprio' }] })}
        ${field('PIN / desbloqueio', 'pin', p.pin, 'text', { ph: 'Opcional' })}
        ${field('Observações', 'notes', p.notes, 'textarea', { full: true })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.number && !d.userId && !d.user) return toast('Informe ao menos o número', 'warn');
      d.value = Number((d.value || '').toString().replace(',', '.')) || 0;
      if (d.userId) { const u = Store.find('team', d.userId); if (u) d.user = u.name; } // rótulo segue o colaborador
      if (editing) Store.update('phones', p.id, d); else Store.add('phones', d);
      toast(editing ? 'Linha atualizada' : 'Linha adicionada'); afterSave();
    };
  }

  /* ============ LICENÇAS ============ */
  const LIC_TYPES = ['Antivírus', 'Autodesk', 'Microsoft'];
  const licTypeIcon = (t) => ({ 'Antivírus': 'shield', 'Autodesk': 'cpu', 'Microsoft': 'grid' }[t] || 'key');
  PAGES.licencas = () => {
    pageShell('Licenças', 'Licenças & assinaturas', 'Software, assentos e datas de renovação — com alertas automáticos.', `<button class="btn primary" id="addBtn">${ic('plus')}Nova licença</button>`);
    const lics = Store.get('licenses');
    if (lics.length) {
      const venc = lics.filter((l) => licStatus(l.renewalDate).key === 'vencido').length;
      const soon = lics.filter((l) => licStatus(l.renewalDate).key === 'vencendo').length;
      const head = document.createElement('div'); head.className = 'grid g3'; head.style.marginBottom = '20px';
      head.innerHTML = `
        ${miniStat('key', lics.length, 'Licenças')}
        ${miniStat('calendar', soon, 'Vencendo (30d)', soon ? 'warn' : '')}
        ${miniStat('alert', venc, 'Vencidas', venc ? 'danger' : '')}`;
      view.appendChild(head); Icons.apply(head); animateStats(head);
    }

    const grid = document.createElement('div'); grid.className = 'lic-grid'; view.appendChild(grid);
    const render = () => {
      const items = Store.get('licenses');
      grid.innerHTML = items.length ? items.map((l) => {
        const st = licStatus(l.renewalDate);
        const total = Number(l.seatsTotal) || 0, used = Store.licenseSeatsUsed(l), free = Store.licenseSeatsFree(l);
        return `<div class="lic-card tr-click" data-detail-lic="${l.id}" title="Ver assentos de ${esc(l.name)}">
          <div class="lic-top">
            <span class="lic-ico">${ic(licTypeIcon(l.type))}</span>
            <div class="lic-id"><div class="lic-name" title="${esc(l.name)}">${esc(l.name)}</div><div class="lic-vendor">${esc(l.type || '—')}${l.seats ? ' · ' + esc(l.seats) : ''}</div></div>
            <span class="badge ${st.cls}">${esc(st.label)}</span>
          </div>
          <div class="lic-seatbar"><span class="lsb-k">${ic('users')}${used}/${total || '—'} assentos</span><span class="lsb-free ${free > 0 ? 'ok' : 'warn'}">${total ? free + ' livre' + (free === 1 ? '' : 's') : 'sem limite'}</span></div>
          <div class="lic-foot">
            <span class="lic-renew">${ic('calendar')}${fmtDate(l.renewalDate)}</span>
            <span style="flex:1"></span>
            <button class="mini-btn" data-lic-link="${l.id}" title="Vincular assentos">${ic('users')}</button>
            ${l.adminUrl ? `<a class="mini-btn" href="${esc(l.adminUrl)}" target="_blank" rel="noopener" title="Abrir painel">${ic('external')}</a>` : ''}
            <button class="mini-btn" data-edit="${l.id}" title="Editar">${ic('edit')}</button>
            <button class="mini-btn danger" data-del="${l.id}" title="Excluir">${ic('trash')}</button>
          </div>
        </div>`;
      }).join('') : `<div style="grid-column:1/-1">${emptyState('key', 'Nenhuma licença cadastrada', 'Clique em “Nova licença” para começar o controle.')}</div>`;
      Icons.apply(grid);
      $$('[data-edit]', grid).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); formLicense(Store.find('licenses', b.dataset.edit)); }));
      $$('[data-del]', grid).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); confirmDialog('Excluir esta licença?', () => { Store.remove('licenses', b.dataset.del); refreshPage(); toast('Licença excluída', 'info'); }); }));
      $$('[data-lic-link]', grid).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); manageLicenseAssignments(Store.find('licenses', b.dataset.licLink)); }));
      $$('[data-detail-lic]', grid).forEach((c) => (c.onclick = (e) => { if (e.target.closest('button') || e.target.closest('a')) return; licenseDetail(Store.find('licenses', c.dataset.detailLic)); }));
    };
    $('#addBtn').onclick = () => formLicense();
    render();
    PAGES.licencas._render = render;
  };

  function formLicense(l) {
    const editing = !!l; l = l || {};
    const card = modal({
      wide: true, title: editing ? 'Editar licença' : 'Nova licença', sub: 'Licenças',
      body: `<div class="form-grid">
        ${field('Nome', 'name', l.name, 'text', { full: true, ph: 'Ex: Kaspersky — 10 PCs' })}
        ${field('Fornecedor', 'vendor', l.vendor, 'text', { ph: 'Ex: Kaspersky / Nexway' })}
        ${field('Tipo', 'type', l.type || 'Antivírus', 'select', { options: LIC_TYPES.map((x) => ({ v: x, t: x })) })}
        ${field('Assentos (total)', 'seatsTotal', l.seatsTotal, 'number', { ph: 'Ex: 10', hint: 'Nº de licenças/assentos disponíveis para vincular.' })}
        ${field('Abrangência (texto livre)', 'seats', l.seats, 'text', { ph: 'Ex: 10 PCs' })}
        ${field('Responsável / conta', 'owner', l.owner, 'text', { ph: 'conta@convergas.com.br' })}
        ${field('Data da compra', 'purchaseDate', l.purchaseDate, 'date')}
        ${field('Data de renovação', 'renewalDate', l.renewalDate, 'date')}
        ${field('Painel administrativo (URL)', 'adminUrl', l.adminUrl, 'url', { full: true, ph: 'https://…' })}
        ${field('Código de ativação', 'code', l.code, 'text', { full: true, hint: 'Opcional — prefira guardar no Cofre.' })}
        ${field('Observações', 'notes', l.notes, 'textarea', { full: true })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome', 'warn');
      d.seatsTotal = Number(d.seatsTotal) || 0;
      if (editing) Store.update('licenses', l.id, d); else Store.add('licenses', Object.assign({ assignments: [] }, d));
      toast(editing ? 'Licença atualizada' : 'Licença adicionada'); afterSave();
    };
  }

  // gerencia os assentos de uma licença (ocupados por usuário e/ou máquina)
  function manageLicenseAssignments(lic) {
    const render = () => {
      const l = Store.find('licenses', lic.id);
      if (!l) return closeModal();
      const used = l.assignments || [];
      const total = Number(l.seatsTotal) || 0;
      const free = Store.licenseSeatsFree(l);
      const teamOpts = `<option value="">— nenhum —</option>` + Store.get('team').map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
      const compOpts = `<option value="">— nenhuma —</option>` + Store.get('computers').map((c) => `<option value="${c.id}">${esc(c.hostname)}</option>`).join('');
      const off = free <= 0;
      const body = `
        <div class="alloc-summary">
          <div class="as-cell"><span class="as-v">${total || '—'}</span><span class="as-k">Assentos</span></div>
          <div class="as-cell"><span class="as-v" style="color:var(--warn)">${used.length}</span><span class="as-k">Usados</span></div>
          <div class="as-cell"><span class="as-v" style="color:var(--ok)">${free}</span><span class="as-k">Livres</span></div>
        </div>
        ${off ? `<div class="link-note">${ic('alert')}Sem assentos livres — aumente o total na edição da licença.</div>` : `
        <div class="link-add link-add-3">
          <select id="licUser" title="Usuário">${teamOpts}</select>
          <select id="licMach" title="Máquina">${compOpts}</select>
          <button class="btn primary" id="licAddBtn">${ic('plus')}Ocupar</button>
        </div>`}
        <div class="link-list">
          ${used.length ? used.map((a, idx) => {
            const u = a.userId ? Store.find('team', a.userId) : null;
            const c = a.machineId ? Store.find('computers', a.machineId) : null;
            const title = u ? u.name : (c ? c.hostname : '(vazio)');
            const sub = [u && c ? c.hostname : '', u ? (u.email || '') : (c ? 'Máquina' : '')].filter(Boolean).join(' · ') || '—';
            return `
            <div class="link-item">
              <span class="li-ico">${ic(u ? 'users' : 'monitor')}</span>
              <div class="li-tx"><b>${esc(title)}</b><span>${esc(sub)}</span></div>
              <button class="mini-btn danger" data-unseat="${idx}" title="Liberar assento">${ic('x')}</button>
            </div>`; }).join('') : '<div class="link-empty">Nenhum assento ocupado ainda.</div>'}
        </div>`;
      modal({ title: 'Assentos da licença', sub: lic.name, body, footer: `<button class="btn ghost" data-close>Fechar</button>` });
      const card = $('#modalCard');
      const ab = $('#licAddBtn', card);
      if (ab) ab.onclick = () => {
        const uid = $('#licUser', card).value, mid = $('#licMach', card).value;
        if (!uid && !mid) return toast('Escolha um usuário ou máquina', 'warn');
        if (Store.assignLicense(lic.id, { userId: uid, machineId: mid })) { toast('Assento ocupado'); refreshPage(); render(); }
        else toast('Sem assentos livres', 'warn');
      };
      $$('[data-unseat]', card).forEach((b) => (b.onclick = () => { Store.unassignLicense(lic.id, Number(b.dataset.unseat)); toast('Assento liberado', 'info'); refreshPage(); render(); }));
    };
    render();
  }

  /* ============ COFRE ============ */
  const VAULT_CATS = ['WiFi', 'Conta Admin', 'E-mail'];
  PAGES.cofre = () => {
    pageShell('Cofre', 'Cofre de senhas', 'Credenciais sensíveis — ocultas por padrão. Tudo fica só neste dispositivo.', `<button class="btn primary" id="addBtn">${ic('plus')}Nova credencial</button>`);
    const warn = document.createElement('div'); warn.className = 'vault-warn';
    warn.innerHTML = `${ic('shield')}<span><b>Zona sensível.</b> Os segredos ficam no armazenamento local do navegador. Clique no olho para revelar.</span>`;
    view.appendChild(warn);

    const state = { cat: 'all', q: '' };
    const tb = document.createElement('div'); tb.className = 'toolbar';
    tb.innerHTML = `<div class="filter-input">${ic('search')}<input id="vflt" placeholder="Buscar…"></div>
      <div class="seg" id="vCats"><button data-c="all" class="on">Todas</button>${VAULT_CATS.map((c) => `<button data-c="${c}">${c}</button>`).join('')}</div>`;
    view.appendChild(tb); Icons.apply(tb);
    const holder = document.createElement('div'); view.appendChild(holder);

    const render = () => {
      const items = Store.get('vault').filter((v) =>
        (state.cat === 'all' || v.category === state.cat) &&
        (v.label + v.identifier + v.category + (v.notes || '')).toLowerCase().includes(state.q.toLowerCase()));
      holder.innerHTML = '';
      const tw = document.createElement('div'); tw.className = 'tbl-wrap';
      tw.innerHTML = items.length ? `<table class="data"><thead><tr><th>Credencial</th><th>Identificador</th><th>Segredo</th><th></th></tr></thead><tbody>${items.map((v) => `<tr>
        <td><div class="id-cell"><span class="st-ico" style="width:34px;height:34px;border-radius:9px">${ic(vaultIcon(v.category))}</span><div><div class="cell-main">${esc(v.label)}</div><div class="cell-sub">${esc(v.category)}</div></div></div></td>
        <td class="mono">${esc(v.identifier || '—')}</td>
        <td><span class="secret" data-secret-id="${v.id}"><span class="sec-dots">${v.secret ? '••••••••' : '<span class="cell-sub">vazio</span>'}</span></span></td>
        <td><div class="row-actions">
          ${v.secret ? `<button class="mini-btn" data-reveal="${v.id}" title="Revelar">${ic('eye')}</button>${copyBtn(v.secret, 'Segredo copiado')}` : ''}
          <button class="mini-btn" data-edit="${v.id}" title="Editar">${ic('edit')}</button>
          <button class="mini-btn danger" data-del="${v.id}" title="Excluir">${ic('trash')}</button>
        </div></td>
      </tr>`).join('')}</tbody></table>` : emptyState('shield', 'Cofre vazio', 'Adicione credenciais (WiFi, admin, BitLocker…).');
      holder.appendChild(tw); Icons.apply(tw); bindCopy(tw);
      $$('[data-edit]', tw).forEach((b) => (b.onclick = () => formVault(Store.find('vault', b.dataset.edit))));
      $$('[data-del]', tw).forEach((b) => (b.onclick = () => confirmDialog('Excluir esta credencial?', () => { Store.remove('vault', b.dataset.del); render(); toast('Credencial excluída', 'info'); })));
      $$('[data-reveal]', tw).forEach((b) => (b.onclick = () => {
        const v = Store.find('vault', b.dataset.reveal);
        const span = $(`[data-secret-id="${v.id}"] .sec-dots`, tw);
        const shown = b.dataset.shown === '1';
        span.innerHTML = shown ? '••••••••' : `<span class="mono">${esc(v.secret)}</span>`;
        b.dataset.shown = shown ? '0' : '1';
        b.dataset.iconDone = ''; b.innerHTML = ''; b.setAttribute('data-icon', shown ? 'eye' : 'eyeoff'); Icons.apply(b);
      }));
    };
    $('#vflt', tb).oninput = (e) => { state.q = e.target.value; render(); };
    $$('#vCats button', tb).forEach((b) => (b.onclick = () => { state.cat = b.dataset.c; $$('#vCats button', tb).forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(); }));
    $('#addBtn').onclick = () => formVault();
    render();
  };
  const vaultIcon = (c) => ({ WiFi: 'globe', 'Conta Admin': 'shield', 'E-mail': 'mail' }[c] || 'shield');

  function formVault(v) {
    const editing = !!v; v = v || {};
    const card = modal({
      title: editing ? 'Editar credencial' : 'Nova credencial', sub: 'Cofre',
      body: `<div class="form-grid">
        ${field('Categoria', 'category', v.category || 'WiFi', 'select', { options: VAULT_CATS.map((x) => ({ v: x, t: x })) })}
        ${field('Rótulo', 'label', v.label, 'text', { ph: 'Ex: Wi-Fi Convergas' })}
        ${field('Identificador (SSID / usuário / host)', 'identifier', v.identifier, 'text', { full: true, ph: 'Ex: leonardo@convergas.com.br' })}
        ${field('Segredo (senha / chave)', 'secret', v.secret, 'text', { full: true, ph: '••••••••' })}
        ${field('Usuário vinculado (opcional)', 'userId', v.userId, 'select', { options: [{ v: '', t: '— Nenhum —' }].concat(Store.get('team').map((u) => ({ v: u.id, t: u.name }))) })}
        ${field('Máquina vinculada (opcional)', 'machineId', v.machineId, 'select', { options: [{ v: '', t: '— Nenhuma —' }].concat(Store.get('computers').map((c) => ({ v: c.id, t: c.hostname }))) })}
        ${field('Observações', 'notes', v.notes, 'textarea', { full: true })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.label) return toast('Informe o rótulo', 'warn');
      if (editing) Store.update('vault', v.id, d); else Store.add('vault', d);
      toast(editing ? 'Credencial atualizada' : 'Credencial adicionada'); afterSave();
    };
  }

  // small stat block used by Telefonia / Licenças headers
  function miniStat(icon, val, label, tone) {
    return `<div class="stat"><div class="st-top"><div class="st-ico${tone ? ' tone-' + tone : ''}">${ic(icon)}</div></div><div class="st-val">${esc(String(val))}</div><div class="st-label">${esc(label)}</div></div>`;
  }

  // placeholder for modules still to be structured
  function comingSoon(icon, title, desc, bullets) {
    return `<div class="coming">
      <div class="coming-ico">${ic(icon)}</div>
      <span class="coming-tag">Em construção</span>
      <h2>${esc(title)}</h2>
      <p>${esc(desc)}</p>
      ${bullets && bullets.length ? `<ul class="coming-list">${bullets.map((b) => `<li>${ic('check')}<span>${esc(b)}</span></li>`).join('')}</ul>` : ''}
    </div>`;
  }

  /* ============ SERVIDOR ============ */
  PAGES.servidor = () => {
    pageShell('Servidor', 'Servidor', 'Gestão do servidor corporativo.', '');
    const w = document.createElement('div');
    w.innerHTML = comingSoon('server', 'Módulo Servidor', 'Esta área será estruturada em breve para centralizar o controle do servidor da Convergas.', [
      'Configuração e especificações (CPU, RAM, discos)',
      'Contas e níveis de acesso ao servidor',
      'Rotina e status de backups',
      'Serviços, compartilhamentos e monitoramento',
    ]);
    view.appendChild(w); Icons.apply(view);
  };

  /* ============ BITLOCKER ============ */
  PAGES.bitlocker = () => {
    pageShell('BitLocker', 'BitLocker', 'Chaves de recuperação da frota.', '');
    const w = document.createElement('div');
    w.innerHTML = comingSoon('lock', 'Módulo BitLocker', 'Em elaboração — um controle dedicado às chaves de recuperação, vinculado à frota de máquinas.', [
      'Chave de recuperação por máquina (PCxx)',
      'Vínculo direto com o módulo Computadores',
      'Busca por hostname e cópia rápida da chave',
      'Status de criptografia por dispositivo',
    ]);
    view.appendChild(w); Icons.apply(view);
  };

  /* ============ SHAREPOINT — portais por setor (T.I) ============ */
  PAGES.sharepoint = () => {
    pageShell('SharePoint', 'SharePoint', 'Portais de documentos por setor (Microsoft SharePoint).', `<button class="btn primary" id="addBtn">${ic('plus')}Novo site</button>`);
    const all = Store.get('sharepoint').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const grid = document.createElement('div'); grid.className = 'sp-grid';
    grid.innerHTML = all.length ? all.map((s) => `
      <div class="sp-card" data-open="${esc(s.id)}" title="Abrir ${esc(s.name)} no SharePoint">
        <div class="sp-top"><span class="sp-ico">${ic('globe')}</span>
          <div class="sp-actions">
            <button class="mini-btn" data-edit="${s.id}" title="Editar">${ic('edit')}</button>
            <button class="mini-btn danger" data-del="${s.id}" title="Excluir">${ic('trash')}</button>
          </div>
        </div>
        <h3>${esc(s.name)}</h3>
        <span class="sp-cta">Abrir no SharePoint ${ic('arrowUpRight')}</span>
      </div>`).join('') : emptyState('globe', 'Nenhum site cadastrado', 'Clique em "Novo site" para adicionar.');
    view.appendChild(grid); Icons.apply(grid);
    $$('.sp-card', grid).forEach((c) => (c.onclick = (e) => { if (e.target.closest('.mini-btn')) return; const s = Store.find('sharepoint', c.dataset.open); if (s && s.url) window.open(s.url, '_blank', 'noopener'); }));
    $$('[data-edit]', grid).forEach((b) => (b.onclick = () => formSharePoint(Store.find('sharepoint', b.dataset.edit))));
    $$('[data-del]', grid).forEach((b) => (b.onclick = () => { const s = Store.find('sharepoint', b.dataset.del); confirmDialog(`Excluir o site "${esc(s.name)}"?`, () => { Store.remove('sharepoint', s.id); refreshPage(); toast('Site removido', 'info'); }); }));
    $('#addBtn').onclick = () => formSharePoint();
  };

  function formSharePoint(s) {
    const editing = !!(s && s.id); s = s || {};
    const card = modal({
      title: editing ? 'Editar site' : 'Novo site do SharePoint', sub: 'T.I',
      body: `<div class="form-grid">
        ${field('Setor / nome', 'name', s.name, 'text', { full: true, ph: 'Ex: Financeiro' })}
        ${field('URL do site', 'url', s.url, 'text', { full: true, ph: 'https://convergasfs.sharepoint.com/sites/...' })}
        ${field('Observações', 'notes', s.notes, 'textarea', { full: true })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o setor/nome', 'warn');
      if (!d.url) return toast('Informe a URL do site', 'warn');
      let url = d.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const rec = { name: d.name, url, notes: d.notes };
      if (editing) Store.update('sharepoint', s.id, rec); else Store.add('sharepoint', rec);
      toast(editing ? 'Site atualizado' : 'Site cadastrado'); closeModal(); if (PAGES[currentRoute]) refreshPage();
    };
  }

  /* ============ SISTEMAS — plataformas da Convergas ============ */
  const SISTEMAS = [
    { icon: 'award', name: 'Convergas Homologa', desc: 'Sistema de homologação da Convergas.', tag: 'Homologação', url: 'https://convergashomologa.com.br', color: 'var(--ok)' },
    { icon: 'activity', name: 'Convergas App', desc: 'Sistema de produção da Convergas.', tag: 'Produção', url: 'https://convergasapp.com.br', color: 'var(--accent)' },
    { icon: 'monitor', name: 'Dashboard de Produção', desc: 'Painel de produção em tela cheia, ideal para TV.', tag: 'Visualização', url: 'https://convergasapp.com.br/tv', color: 'var(--blue-future)' },
    { icon: 'clipboard', name: 'Convergas Homologa · Diagnóstico', desc: 'Calcula os gastos de uma homologação a partir dos requisitos INMETRO.', tag: 'Diagnóstico', url: 'https://convergas-diagnostico.vercel.app', color: 'var(--warn)' },
  ];
  PAGES['sistemas-home'] = () => {
    pageShell('Sistemas', 'Sistemas', 'Sistemas e plataformas da Convergas — acesso rápido.', '');
    const w = document.createElement('div');
    w.className = 'sys-grid';
    w.innerHTML = SISTEMAS.map((s) => `
      <a class="sys-card" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" style="--sc:${s.color}">
        <span class="sys-glow"></span>
        <div class="sys-top">
          <span class="sys-ico">${ic(s.icon)}</span>
          <span class="sys-tag">${esc(s.tag)}</span>
        </div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.desc)}</p>
        <span class="sys-cta">Acessar sistema <span class="sys-arrow">${ic('arrowUpRight')}</span></span>
      </a>`).join('');
    view.appendChild(w); Icons.apply(view);
  };

  /* =====================================================================
     PÓS-VENDAS — gestão de chamados de clientes (IATF 16949 · ISO 9001)
     Fluxo: 1 Abertura (Comercial) → 2 Triagem → 3 Tratativa (contenção + atendimento)
            → 4 RNC (só quando necessária — a Qualidade anexa) → 5 Verificação e encerramento
     A RNC não é criada aqui: o chamado só registra se ela é necessária e guarda o arquivo.
     ===================================================================== */
  const PV_TIPOS = {
    reclamacao: { label: 'Reclamação de qualidade', short: 'Reclamação', icon: 'alert', desc: 'Defeito ou produto fora do especificado' },
    falha_campo: { label: 'Falha em campo', short: 'Falha em campo', icon: 'activity', desc: 'Produto instalado que falhou em uso' },
    garantia: { label: 'Solicitação de garantia', short: 'Garantia', icon: 'shield', desc: 'Pedido de reparo ou troca na garantia' },
    assistencia: { label: 'Assistência técnica', short: 'Assistência', icon: 'wrench', desc: 'Correção, ajuste ou instalação em campo' },
    devolucao: { label: 'Devolução / logística', short: 'Devolução', icon: 'box', desc: 'Material errado, avaria ou falta' },
    informacao: { label: 'Dúvida / informação', short: 'Informação', icon: 'mail', desc: 'Pedido de informação ou documento' },
  };
  const PV_STATUS = {
    aberto: { label: 'Aguardando triagem', cls: 'info' },
    tratativa: { label: 'Em tratativa', cls: 'warn' },
    verificacao: { label: 'Em verificação', cls: 'info' },
    encerrado: { label: 'Encerrado', cls: 'ok' },
    cancelado: { label: 'Cancelado', cls: 'neutral' },
  };
  const PV_PRIO = {
    baixa: { label: 'Baixa', cls: 'neutral', dias: 20 },
    media: { label: 'Média', cls: 'info', dias: 10 },
    alta: { label: 'Alta', cls: 'warn', dias: 5 },
    critica: { label: 'Crítica', cls: 'danger', dias: 2 },
  };
  const PV_RNC = {
    cliente: { label: 'Sim — o cliente emitiu RNC', short: 'RNC do cliente' },
    interna: { label: 'Sim — abrir RNC interna', short: 'RNC interna' },
    nao: { label: 'Não requer RNC', short: 'Sem RNC' },
  };
  const PV_RNC_ST = {
    pendente: { label: 'Aguardando Qualidade', cls: 'danger' },
    anexada: { label: 'RNC anexada', cls: 'warn' },
    respondida: { label: 'Respondida ao cliente', cls: 'info' },
    fechada: { label: 'RNC encerrada', cls: 'ok' },
  };
  const PV_CANAIS = ['E-mail', 'Telefone', 'WhatsApp', 'Visita', 'Portal do cliente', 'Representante'];
  const PV_SEGMENTOS = ['Montadora / OEM', 'Distribuidor / Revenda', 'Convertedora / Oficina', 'Frotista', 'Consumidor final', 'Outro'];
  const PV_UF = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
  const PV_LOCAIS_CONT = ['Estoque Convergas', 'Em trânsito', 'Cliente', 'Fornecedor', 'Produção (WIP)'];
  const PV_DOCS = ['DFMEA', 'PFMEA', 'Plano de controle', 'Instrução de trabalho', 'Dispositivo à prova de erro', 'Lições aprendidas'];
  const PV_GRUPOS = {
    abertura: 'Evidências da abertura', rnc_cliente: 'RNC / reclamação do cliente', atendimento: 'Relatório de atendimento',
    rnc: 'RNC (Qualidade)', d8: '8D / relatório de análise', verificacao: 'Evidência de eficácia',
  };
  const PV_MAX_MB = 15;

  let pvCurrentId = null;
  try { pvCurrentId = sessionStorage.getItem('pv_current') || null; } catch (e) {}
  const pvFilt = { st: 'abertos', q: '', tipo: '', cli: '', rnc: false };
  let pvNovoDraft = null; // edição da abertura (reaproveita o formulário de novo chamado)

  function pvMe() { try { return localStorage.getItem('pv_me') || ''; } catch (e) { return ''; } }
  function setPvMe(n) { try { localStorage.setItem('pv_me', n || ''); } catch (e) {} }
  const pvNow = () => new Date().toISOString();
  const pvFmtDT = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return fmtDate(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  const pvDay = (iso) => (iso || '').slice(0, 10);
  const pvMoney = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pvBadge = (map, k) => { const m = map[k]; return m ? `<span class="badge ${m.cls}">${esc(m.label)}</span>` : ''; };
  const pvKb = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const pvOpt = (v, list) => list.map((o) => { const val = typeof o === 'string' ? o : o.v, t = typeof o === 'string' ? o : o.t; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(t)}</option>`; }).join('');

  function pvLog(ch, acao, det) { const h = (ch.historico || []).slice(); h.push({ at: pvNow(), by: pvMe() || 'Usuário', acao, det: det || '' }); return h; }
  function pvSave(ch, patch, acao, det) { if (acao) patch.historico = pvLog(Object.assign({}, ch, patch), acao, det); patch.atualizadoEm = pvNow(); return Store.update('pvChamados', ch.id, patch); }
  function pvNextNumero() {
    const pre = 'PV-' + new Date().getFullYear() + '-';
    const nums = Store.get('pvChamados').filter((c) => (c.numero || '').startsWith(pre)).map((c) => parseInt(c.numero.slice(pre.length), 10)).filter((n) => !isNaN(n));
    return pre + String((nums.length ? Math.max.apply(null, nums) : 0) + 1).padStart(4, '0');
  }
  const pvCliente = (id) => Store.find('pvClientes', id);
  const pvClienteNome = (c) => { const k = c.clienteId && pvCliente(c.clienteId); return k ? k.nome : (c.clienteNome || '—'); };
  const pvAberto = (c) => c.status !== 'encerrado' && c.status !== 'cancelado';
  function pvRncDecisao(c) { if (c.triagem && c.triagem.rnc) return c.triagem.rnc; return (c.rncCliente && c.rncCliente.tem) ? 'cliente' : ''; }
  const pvPrecisaRnc = (c) => { const d = pvRncDecisao(c); return d === 'cliente' || d === 'interna'; };
  const pvAnexos = (c, g) => (c.anexos || []).filter((a) => !g || a.grupo === g);
  function pvRncStatus(c) {
    if (!pvPrecisaRnc(c)) return null;
    if (!pvAnexos(c, 'rnc').length) return 'pendente';
    const s = (c.rnc || {}).status;
    return PV_RNC_ST[s] && s !== 'pendente' ? s : 'anexada';
  }
  const pvAtrasado = (c) => pvAberto(c) && c.prazo && c.prazo < todayISO();
  function pvPrazoBadge(c) {
    if (!c.prazo) return '<span class="badge neutral plain">Sem prazo</span>';
    if (!pvAberto(c)) return `<span class="badge neutral plain">${fmtDate(c.prazo)}</span>`;
    const d = Math.round((new Date(c.prazo + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 86400000);
    if (d < 0) return `<span class="badge danger">Atrasado ${-d}d</span>`;
    if (d === 0) return '<span class="badge warn">Vence hoje</span>';
    if (d <= 2) return `<span class="badge warn">Vence em ${d}d</span>`;
    return `<span class="badge neutral plain">${fmtDate(c.prazo)}</span>`;
  }
  function pvRncBadge(c) {
    const s = pvRncStatus(c);
    if (s) return pvBadge(PV_RNC_ST, s);
    if (pvRncDecisao(c) === 'nao') return '<span class="badge neutral plain">Sem RNC</span>';
    return '<span class="badge neutral plain">A definir</span>';
  }

  // o que ainda falta para poder encerrar (a mesma lista aparece na tela do chamado)
  function pvPendencias(c) {
    const p = [];
    const t = c.triagem || {};
    if (!t.rnc) p.push({ step: 2, t: 'Fazer a triagem e decidir se é necessária RNC' });
    else if (t.rnc === 'nao' && !(t.justificativa || '').trim()) p.push({ step: 2, t: 'Justificar por que o chamado não requer RNC' });
    const at = c.atendimento || {};
    if (!(at.descricao || '').trim() || !at.resultado) p.push({ step: 3, t: 'Registrar a tratativa (o que foi feito e o resultado)' });
    if (pvPrecisaRnc(c)) {
      const ct = c.contencao || {};
      if (!ct.data) p.push({ step: 3, t: 'Registrar a contenção (ação imediata)' });
      if (!pvAnexos(c, 'rnc').length) p.push({ step: 4, t: 'Qualidade: anexar a RNC' });
      if (pvRncDecisao(c) === 'cliente' && !(c.rnc || {}).respostaEm) p.push({ step: 4, t: 'Informar a data de resposta da RNC ao cliente' });
      if ((c.verificacao || {}).eficaz !== 'Sim') p.push({ step: 5, t: 'Verificar a eficácia da ação corretiva' });
    }
    if (!(c.encerramento || {}).aceite) p.push({ step: 5, t: 'Registrar o retorno / aceite do cliente' });
    return p;
  }
  // etapa atual do fluxo (1..5) e estado de cada uma
  function pvSteps(c) {
    const pend = pvPendencias(c);
    const has = (n) => pend.some((x) => x.step === n);
    const t = c.triagem || {};
    const st = [
      { n: 1, t: 'Abertura', s: 'Comercial', state: 'done' },
      { n: 2, t: 'Triagem', s: 'Precisa de RNC?', state: has(2) ? 'todo' : 'done' },
      { n: 3, t: 'Tratativa', s: 'Contenção e atendimento', state: has(3) ? 'todo' : 'done' },
      { n: 4, t: 'RNC', s: pvPrecisaRnc(c) ? 'Qualidade anexa' : (t.rnc === 'nao' ? 'Não aplicável' : 'A definir'), state: pvPrecisaRnc(c) ? (has(4) ? 'todo' : 'done') : (t.rnc === 'nao' ? 'na' : 'todo') },
      { n: 5, t: 'Encerramento', s: 'Eficácia e aceite', state: c.status === 'encerrado' ? 'done' : 'todo' },
    ];
    const cur = st.find((x) => x.state === 'todo');
    if (cur && pvAberto(c)) cur.state = 'cur';
    return st;
  }

  /* ---------- anexos: IndexedDB local + bucket da nuvem (best-effort) ---------- */
  async function pvAttach(ch, grupo, files) {
    const list = Array.from(files || []);
    if (!list.length) return 0;
    const metas = [];
    for (const f of list) {
      if (f.size > PV_MAX_MB * 1048576) { toast(`"${f.name}" passa de ${PV_MAX_MB} MB`, 'warn'); continue; }
      const id = Store.uid('ax');
      const cloudName = id + '__' + f.name.replace(/[^\w.\-]+/g, '_');
      await Store.blobs.put(id, f, { name: f.name, type: f.type, size: f.size });
      try { if (window.Cloud && window.Cloud.ok) await window.Cloud.addFile('pvChamados', ch.id, grupo, new File([f], cloudName, { type: f.type || 'application/octet-stream' })); } catch (e) {}
      metas.push({ id, grupo, name: f.name, cloudName, type: f.type || '', size: f.size, at: pvNow(), by: pvMe() || 'Usuário' });
    }
    if (!metas.length) return 0;
    const cur = Store.find('pvChamados', ch.id);
    pvSave(cur, { anexos: (cur.anexos || []).concat(metas) }, 'Anexo adicionado', `${PV_GRUPOS[grupo] || grupo}: ${metas.map((m) => m.name).join(', ')}`);
    return metas.length;
  }
  async function pvOpenFile(ch, ax) {
    let blob = null;
    const rec = await Store.blobs.get(ax.id);
    if (rec && rec.blob) blob = rec.blob;
    else if (window.Cloud && window.Cloud.ok) { blob = await window.Cloud.fetchFileBlob('pvChamados', ch.id, ax.grupo, ax.cloudName); if (blob) Store.blobs.put(ax.id, blob, { name: ax.name, type: ax.type, size: ax.size }); }
    if (!blob) { toast('Arquivo indisponível neste computador e na nuvem', 'warn'); return; }
    const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: ax.type || 'application/octet-stream' }));
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
    if (!/^(application\/pdf|image\/)/.test(ax.type || blob.type || '')) a.download = ax.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function pvRemoveFile(ch, ax) {
    await Store.blobs.del(ax.id);
    try { if (window.Cloud && window.Cloud.ok) await window.Cloud.removeFile('pvChamados', ch.id, ax.grupo, ax.cloudName); } catch (e) {}
    const cur = Store.find('pvChamados', ch.id);
    pvSave(cur, { anexos: (cur.anexos || []).filter((a) => a.id !== ax.id) }, 'Anexo removido', ax.name);
  }
  function pvFileList(c, grupo, opts) {
    opts = opts || {};
    const list = pvAnexos(c, grupo);
    const items = list.map((a) => `<div class="pvx-file">
        <span class="pvx-file-ico">${ic(/^image\//.test(a.type) ? 'eye' : 'file')}</span>
        <button class="pvx-file-tx" data-pvopen="${a.id}" title="Abrir"><b>${esc(a.name)}</b><span>${pvKb(a.size)} · ${esc(a.by || '')} · ${pvFmtDT(a.at)}</span></button>
        ${opts.readonly ? '' : `<button class="mini-btn danger" data-pvrm="${a.id}" title="Remover anexo">${ic('trash')}</button>`}
      </div>`).join('');
    const add = opts.readonly ? '' : `<label class="pvx-drop${opts.required && !list.length ? ' req' : ''}">${ic('upload')}<span>${esc(opts.cta || 'Anexar arquivo')}</span><small>PDF, imagem ou documento · até ${PV_MAX_MB} MB</small><input type="file" multiple data-pvadd="${grupo}" hidden></label>`;
    return `<div class="pvx-files">${items}${add}${!items && opts.readonly ? '<span class="pvx-muted">Nenhum arquivo.</span>' : ''}</div>`;
  }
  function pvBindFiles(root, c, after) {
    $$('[data-pvopen]', root).forEach((b) => (b.onclick = () => { const ax = (Store.find('pvChamados', c.id).anexos || []).find((a) => a.id === b.dataset.pvopen); if (ax) pvOpenFile(c, ax); }));
    $$('[data-pvrm]', root).forEach((b) => (b.onclick = () => { const ax = (Store.find('pvChamados', c.id).anexos || []).find((a) => a.id === b.dataset.pvrm); if (ax) confirmDialog(`Remover o anexo "${esc(ax.name)}"?`, async () => { await pvRemoveFile(c, ax); toast('Anexo removido', 'info'); after(); }); }));
    $$('[data-pvadd]', root).forEach((inp) => (inp.onchange = async () => { const n = await pvAttach(c, inp.dataset.pvadd, inp.files); if (n) { toast(n > 1 ? `${n} arquivos anexados` : 'Arquivo anexado'); after(); } }));
  }

  /* ---------- números para painel, home e alertas ---------- */
  function pvStats() {
    const all = Store.get('pvChamados') || [];
    const abertos = all.filter(pvAberto);
    return {
      all, abertos,
      atrasados: abertos.filter(pvAtrasado),
      semTriagem: abertos.filter((c) => !(c.triagem || {}).rnc),
      rncPend: all.filter((c) => c.status !== 'cancelado' && pvRncStatus(c) === 'pendente'),
    };
  }
  function pvAlerts() {
    const s = pvStats(); const a = [];
    s.atrasados.forEach((c) => a.push({ kind: 'danger', t: `${c.numero} atrasado`, s: pvClienteNome(c) }));
    s.rncPend.forEach((c) => a.push({ kind: 'warn', t: `${c.numero} aguardando RNC da Qualidade`, s: pvClienteNome(c) }));
    return a;
  }

  /* =========================== PAINEL =========================== */
  PAGES['pv-painel'] = () => {
    pageShell('Pós-Vendas', 'Painel de pós-vendas', 'Reclamações, garantias e atendimento ao cliente — indicadores para IATF 16949 e ISO 9001.',
      `<button class="btn primary" id="pvNew">${ic('plus')}Novo chamado</button>`);
    $('#pvNew').onclick = () => pvGoNovo();
    const s = pvStats(); const all = s.all;
    const today = todayISO(); const ym = today.slice(0, 7); const y = today.slice(0, 4);
    const enc = all.filter((c) => c.status === 'encerrado' && c.encerramento && c.encerramento.data);
    const encMes = enc.filter((c) => c.encerramento.data.slice(0, 7) === ym);
    const ano = enc.filter((c) => c.encerramento.data.slice(0, 4) === y);
    const dias = ano.map((c) => Math.max(0, daysBetween(pvDay(c.criadoEm), c.encerramento.data)));
    const tMedio = dias.length ? (dias.reduce((a, b) => a + b, 0) / dias.length) : null;
    const noPrazo = ano.length ? Math.round(100 * ano.filter((c) => !c.prazo || c.encerramento.data <= c.prazo).length / ano.length) : null;
    const custo = all.filter((c) => pvDay(c.criadoEm).slice(0, 4) === y).reduce((acc, c) => acc + (Number((c.atendimento || {}).custoTotal) || 0), 0);
    const notas = all.map((c) => Number((c.encerramento || {}).satisfacao)).filter((n) => n > 0);
    const sat = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length) : null;

    const kpi = (icon, val, label, meta, tone, go2) => `<div class="ind-card${tone ? ' t-' + tone : ''}${go2 ? ' pvx-click' : ''}" ${go2 ? `data-pvgo="${go2}"` : ''}><div class="ind-head"><span class="ind-ico">${ic(icon)}</span><span class="ind-label">${esc(label)}</span></div><div class="ind-val">${esc(val)}</div><div class="ind-foot">${meta ? `<span class="ind-pill">${esc(meta)}</span>` : ''}</div></div>`;
    const w = document.createElement('div');
    w.innerHTML = `
      <div class="section-head"><h2><span class="sh-ico">${ic('activity')}</span>Situação agora</h2></div>
      <div class="ind-grid">
        ${kpi('list', s.abertos.length, 'Chamados em aberto', s.semTriagem.length ? `${s.semTriagem.length} sem triagem` : 'Todos triados', s.semTriagem.length ? 'warn' : 'ok', 'abertos')}
        ${kpi('clock', s.atrasados.length, 'Atrasados', s.atrasados.length ? 'Fora do prazo' : 'Nenhum', s.atrasados.length ? 'danger' : 'ok', 'atrasados')}
        ${kpi('award', s.rncPend.length, 'Aguardando RNC', 'Fila da Qualidade', s.rncPend.length ? 'warn' : 'ok', 'qualidade')}
        ${kpi('check', encMes.length, 'Encerrados no mês', new Date().toLocaleDateString('pt-BR', { month: 'long' }), '')}
      </div>
      <div class="section-head"><h2><span class="sh-ico">${ic('flash')}</span>Desempenho em ${y}</h2></div>
      <div class="ind-grid">
        ${kpi('clock', tMedio == null ? '—' : tMedio.toFixed(1) + ' d', 'Tempo médio até encerrar', `${ano.length} encerrado(s)`, '')}
        ${kpi('check', noPrazo == null ? '—' : noPrazo + '%', 'Encerrados no prazo', 'Meta 90%', noPrazo == null ? '' : noPrazo >= 90 ? 'ok' : 'warn')}
        ${kpi('shield', pvMoney(custo), 'Custo de garantia/atendimento', 'No ano', '')}
        ${kpi('users', sat == null ? '—' : sat.toFixed(1) + ' / 5', 'Satisfação do cliente', `${notas.length} avaliação(ões)`, sat == null ? '' : sat >= 4 ? 'ok' : 'warn')}
      </div>
      <div class="pvx-charts">
        <div class="panel panel-pad"><div class="pvx-ch-h"><b>Chamados por mês</b><span>últimos 12 meses</span></div><div id="pvChMes"></div></div>
        <div class="panel panel-pad"><div class="pvx-ch-h"><b>Por tipo de ocorrência</b><span>${all.length} no total</span></div><div id="pvChTipo"></div></div>
        <div class="panel panel-pad"><div class="pvx-ch-h"><b>Clientes com mais chamados</b><span>reincidência</span></div><div id="pvChCli"></div></div>
        <div class="panel panel-pad"><div class="pvx-ch-h"><b>Procedência</b><span>após triagem</span></div><div id="pvChProc"></div></div>
      </div>
      <div class="section-head"><h2><span class="sh-ico">${ic('alert')}</span>Precisam de atenção</h2></div>
      <div id="pvAtt"></div>`;
    view.appendChild(w);

    // chamados por mês (12 meses)
    const meses = []; const d0 = new Date(); d0.setDate(1);
    for (let i = 11; i >= 0; i--) { const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1); meses.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); }
    const porMes = meses.map((m) => all.filter((c) => pvDay(c.criadoEm).slice(0, 7) === m).length);
    const max = Math.max(1, ...porMes);
    $('#pvChMes', w).innerHTML = `<div class="pvx-cols">${meses.map((m, i) => `<div class="pvx-col" title="${porMes[i]} chamado(s)"><span class="pvx-col-v">${porMes[i] || ''}</span><span class="pvx-col-b" style="height:${Math.round((porMes[i] / max) * 100)}%"></span><span class="pvx-col-l">${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m.slice(5) - 1]}</span></div>`).join('')}</div>`;
    const hbars = (rows, empty) => {
      const mx = Math.max(1, ...rows.map((r) => r[1]));
      return rows.length && rows.some((r) => r[1]) ? `<div class="pvx-hbars">${rows.map(([l, v, col]) => `<div class="pvx-hb"><span class="pvx-hb-l">${esc(l)}</span><span class="pvx-hb-t"><span style="width:${Math.round((v / mx) * 100)}%${col ? ';background:' + col : ''}"></span></span><span class="pvx-hb-v">${v}</span></div>`).join('')}</div>` : `<div class="pvx-muted pvx-empty">${esc(empty)}</div>`;
    };
    $('#pvChTipo', w).innerHTML = hbars(Object.keys(PV_TIPOS).map((k) => [PV_TIPOS[k].short, all.filter((c) => c.tipo === k).length]).filter((r) => r[1]).sort((a, b) => b[1] - a[1]), 'Sem chamados ainda.');
    const porCli = {}; all.forEach((c) => { const n = pvClienteNome(c); porCli[n] = (porCli[n] || 0) + 1; });
    $('#pvChCli', w).innerHTML = hbars(Object.entries(porCli).sort((a, b) => b[1] - a[1]).slice(0, 6), 'Sem chamados ainda.');
    const proc = { Procedente: 0, Improcedente: 0, 'Sem defeito (NTF)': 0, 'Em análise': 0 };
    all.filter((c) => c.status !== 'cancelado').forEach((c) => { if ((c.atendimento || {}).ntf) proc['Sem defeito (NTF)']++; else { const p = (c.triagem || {}).procedencia || 'Em análise'; proc[p] = (proc[p] || 0) + 1; } });
    $('#pvChProc', w).innerHTML = hbars([['Procedente', proc.Procedente, 'var(--danger)'], ['Improcedente', proc.Improcedente, 'var(--ok)'], ['Sem defeito (NTF)', proc['Sem defeito (NTF)'], 'var(--blue-future)'], ['Em análise', proc['Em análise'], 'var(--text-3)']], 'Sem chamados ainda.');

    const att = []; const seen = {};
    const push = (c, why, cls) => { if (seen[c.id]) return; seen[c.id] = 1; att.push({ c, why, cls }); };
    s.atrasados.forEach((c) => push(c, 'Prazo vencido', 'danger'));
    s.rncPend.filter(pvAberto).forEach((c) => push(c, 'Aguardando RNC da Qualidade', 'warn'));
    s.semTriagem.forEach((c) => push(c, 'Sem triagem', 'info'));
    $('#pvAtt', w).innerHTML = att.length ? `<div class="pvx-list">${att.slice(0, 12).map(({ c, why, cls }) => pvRow(c, `<span class="badge ${cls}">${esc(why)}</span>`)).join('')}</div>`
      : `<div class="tbl-wrap">${emptyState('check', 'Nada pendente', 'Nenhum chamado atrasado, sem triagem ou aguardando RNC.')}</div>`;
    Icons.apply(view);
    pvBindRows(w);
    $$('[data-pvgo]', w).forEach((el) => (el.onclick = () => {
      const g = el.dataset.pvgo;
      if (g === 'qualidade') return go('pv-qualidade');
      pvFilt.st = g === 'atrasados' ? 'atrasados' : 'abertos'; go('pv-chamados');
    }));
  };

  // linha compacta de chamado (usada no painel e na fila)
  function pvRow(c, extra) {
    const t = PV_TIPOS[c.tipo] || PV_TIPOS.reclamacao;
    return `<button class="pvx-row" data-pvid="${c.id}">
      <span class="pvx-row-ico">${ic(t.icon)}</span>
      <span class="pvx-row-main"><span class="pvx-row-top"><b class="mono">${esc(c.numero)}</b><span>${esc(pvClienteNome(c))}</span></span>
      <span class="pvx-row-sub">${esc(t.short)} · ${esc((c.produto || {}).descricao || c.descricao || '').slice(0, 90)}</span></span>
      <span class="pvx-row-tags">${extra || ''}${pvPrazoBadge(c)}</span>
    </button>`;
  }
  function pvBindRows(root) { $$('[data-pvid]', root).forEach((b) => (b.onclick = () => pvOpen(b.dataset.pvid))); }
  function pvOpen(id) { pvCurrentId = id; try { sessionStorage.setItem('pv_current', id); } catch (e) {} go('pv-detalhe'); }

  /* =========================== LISTA DE CHAMADOS =========================== */
  PAGES['pv-chamados'] = () => {
    pageShell('Pós-Vendas', 'Chamados', 'Todos os chamados de clientes — da abertura pelo Comercial até o encerramento.',
      `<button class="btn primary" id="pvNew">${ic('plus')}Novo chamado</button>`);
    $('#pvNew').onclick = () => pvGoNovo();
    const all = Store.get('pvChamados');
    const cnt = (f) => all.filter(f).length;
    const segs = [
      ['abertos', 'Em aberto', cnt(pvAberto)], ['aberto', 'Triagem', cnt((c) => c.status === 'aberto')], ['tratativa', 'Tratativa', cnt((c) => c.status === 'tratativa')],
      ['verificacao', 'Verificação', cnt((c) => c.status === 'verificacao')], ['atrasados', 'Atrasados', cnt(pvAtrasado)], ['encerrado', 'Encerrados', cnt((c) => c.status === 'encerrado')], ['todos', 'Todos', all.length],
    ];
    const tb = document.createElement('div'); tb.className = 'toolbar pvx-toolbar';
    const clis = Store.get('pvClientes').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    tb.innerHTML = `
      <div class="filter-input">${ic('search')}<input id="pvQ" placeholder="Buscar nº, cliente, produto, lote…" value="${esc(pvFilt.q)}"></div>
      <select class="pvx-sel" id="pvTipo"><option value="">Todos os tipos</option>${Object.keys(PV_TIPOS).map((k) => `<option value="${k}" ${pvFilt.tipo === k ? 'selected' : ''}>${esc(PV_TIPOS[k].short)}</option>`).join('')}</select>
      <select class="pvx-sel" id="pvCli"><option value="">Todos os clientes</option>${clis.map((k) => `<option value="${k.id}" ${pvFilt.cli === k.id ? 'selected' : ''}>${esc(k.nome)}</option>`).join('')}</select>
      <label class="pvx-chk"><input type="checkbox" id="pvRncOnly" ${pvFilt.rnc ? 'checked' : ''}>Só com RNC</label>
      <div class="seg pvx-seg" id="pvSeg">${segs.map(([k, l, n]) => `<button data-s="${k}" class="${pvFilt.st === k ? 'on' : ''}">${l}<span class="pvx-n">${n}</span></button>`).join('')}</div>`;
    view.appendChild(tb); Icons.apply(tb);
    const holder = document.createElement('div'); view.appendChild(holder);
    const render = () => {
      let l = all.slice();
      const f = pvFilt.st;
      if (f === 'abertos') l = l.filter(pvAberto); else if (f === 'atrasados') l = l.filter(pvAtrasado); else if (f !== 'todos') l = l.filter((c) => c.status === f);
      if (pvFilt.tipo) l = l.filter((c) => c.tipo === pvFilt.tipo);
      if (pvFilt.cli) l = l.filter((c) => c.clienteId === pvFilt.cli);
      if (pvFilt.rnc) l = l.filter(pvPrecisaRnc);
      if (pvFilt.q) { const q = pvFilt.q.toLowerCase(); l = l.filter((c) => (c.numero + ' ' + pvClienteNome(c) + ' ' + JSON.stringify(c.produto || {}) + ' ' + (c.descricao || '') + ' ' + ((c.rncCliente || {}).numero || '') + ' ' + ((c.rnc || {}).numero || '')).toLowerCase().includes(q)); }
      l.sort((a, b) => (pvAtrasado(b) - pvAtrasado(a)) || String(b.criadoEm).localeCompare(String(a.criadoEm)));
      holder.innerHTML = l.length ? `<div class="tbl-wrap"><table class="data pvx-table"><thead><tr><th>Chamado</th><th>Cliente</th><th>Tipo</th><th>Produto</th><th>Prioridade</th><th>Prazo</th><th>RNC</th><th>Status</th></tr></thead><tbody>${l.map((c) => {
        const t = PV_TIPOS[c.tipo] || PV_TIPOS.reclamacao; const pr = c.produto || {};
        return `<tr data-pvid="${c.id}" class="pvx-tr">
          <td><div class="cell-main mono">${esc(c.numero)}</div><div class="cell-sub">${fmtDate(pvDay(c.criadoEm))}</div></td>
          <td><div class="cell-main">${esc(pvClienteNome(c))}</div><div class="cell-sub">${esc([(c.local || {}).cidade, (c.local || {}).uf].filter(Boolean).join(' / ') || '—')}</div></td>
          <td><span class="pvx-tipo">${ic(t.icon)}${esc(t.short)}</span></td>
          <td><div class="cell-main">${esc(pr.descricao || '—')}</div><div class="cell-sub">${esc([pr.codigo, pr.lote ? 'Lote ' + pr.lote : ''].filter(Boolean).join(' · ') || '')}</div></td>
          <td>${pvBadge(PV_PRIO, c.prioridade || 'media')}${c.seguranca ? ` <span class="badge danger plain" title="Afeta segurança ou requisito legal">Segurança</span>` : ''}</td>
          <td>${pvPrazoBadge(c)}</td>
          <td>${pvRncBadge(c)}</td>
          <td>${pvBadge(PV_STATUS, c.status)}</td></tr>`;
      }).join('')}</tbody></table></div>`
        : `<div class="tbl-wrap">${emptyState('list', all.length ? 'Nenhum chamado neste filtro' : 'Nenhum chamado ainda', all.length ? 'Ajuste os filtros acima.' : 'Clique em "Novo chamado" para registrar a primeira ocorrência de um cliente.')}</div>`;
      Icons.apply(holder);
      $$('tr[data-pvid]', holder).forEach((tr) => (tr.onclick = () => pvOpen(tr.dataset.pvid)));
    };
    $('#pvQ', tb).oninput = (e) => { pvFilt.q = e.target.value; render(); };
    $('#pvTipo', tb).onchange = (e) => { pvFilt.tipo = e.target.value; render(); };
    $('#pvCli', tb).onchange = (e) => { pvFilt.cli = e.target.value; render(); };
    $('#pvRncOnly', tb).onchange = (e) => { pvFilt.rnc = e.target.checked; render(); };
    $$('#pvSeg button', tb).forEach((b) => (b.onclick = () => { pvFilt.st = b.dataset.s; $$('#pvSeg button', tb).forEach((x) => x.classList.toggle('on', x === b)); render(); }));
    render();
  };

  /* =========================== FILA DA QUALIDADE =========================== */
  PAGES['pv-qualidade'] = () => {
    pageShell('Pós-Vendas', 'Fila da Qualidade', 'A Qualidade só atua quando o chamado precisa de RNC: aqui estão os que aguardam a RNC, a resposta ao cliente ou a verificação de eficácia.', '');
    const all = Store.get('pvChamados').filter((c) => c.status !== 'cancelado' && pvPrecisaRnc(c));
    const pend = all.filter((c) => pvRncStatus(c) === 'pendente');
    const resp = all.filter((c) => pvRncStatus(c) !== 'pendente' && pvRncDecisao(c) === 'cliente' && !(c.rnc || {}).respostaEm);
    const efic = all.filter((c) => pvRncStatus(c) !== 'pendente' && pvAberto(c) && (c.verificacao || {}).eficaz !== 'Sim' && !resp.includes(c));
    const w = document.createElement('div');
    const block = (icon, title, sub, list, tag) => `<div class="section-head"><h2><span class="sh-ico">${ic(icon)}</span>${esc(title)}<span class="pvx-count">${list.length}</span></h2><span class="pvx-muted">${esc(sub)}</span></div>
      ${list.length ? `<div class="pvx-list">${list.map((c) => pvRow(c, tag(c))).join('')}</div>` : `<div class="pvx-none">${ic('check')}Nada aqui.</div>`}`;
    w.innerHTML = `
      <div class="mstat-grid" style="margin-bottom:6px">
        <div class="mstat t-danger"><div class="mstat-ring plain"><span class="mstat-v">${pend.length}</span></div><span class="mstat-k">${ic('upload')}RNC a anexar</span></div>
        <div class="mstat t-warn"><div class="mstat-ring plain"><span class="mstat-v">${resp.length}</span></div><span class="mstat-k">${ic('mail')}Resposta ao cliente</span></div>
        <div class="mstat t-info"><div class="mstat-ring plain"><span class="mstat-v">${efic.length}</span></div><span class="mstat-k">${ic('check')}Verificar eficácia</span></div>
        <div class="mstat"><div class="mstat-ring plain"><span class="mstat-v">${all.length}</span></div><span class="mstat-k">${ic('award')}Chamados com RNC</span></div>
      </div>
      ${block('upload', 'Anexar RNC', 'Chamados que precisam de RNC e ainda não têm o arquivo', pend, (c) => `<span class="badge ${pvRncDecisao(c) === 'cliente' ? 'warn' : 'info'} plain">${esc(PV_RNC[pvRncDecisao(c)].short)}</span>`)}
      ${block('mail', 'Responder ao cliente', 'RNC do cliente já tratada, falta registrar o envio da resposta', resp, (c) => (c.rncCliente || {}).prazoResposta ? `<span class="badge neutral plain">Cliente pede até ${fmtDate(c.rncCliente.prazoResposta)}</span>` : '')}
      ${block('check', 'Verificar eficácia', 'Ação corretiva implantada — confirmar se funcionou', efic, () => '')}`;
    view.appendChild(w); Icons.apply(w); pvBindRows(w);
  };

  /* =========================== CLIENTES =========================== */
  PAGES['pv-clientes'] = () => {
    pageShell('Pós-Vendas', 'Clientes', 'Cadastro de clientes, contatos e requisitos específicos (CSR) que valem para os chamados.',
      `<button class="btn primary" id="pvNewCli">${ic('plus')}Novo cliente</button>`);
    $('#pvNewCli').onclick = () => pvFormCliente();
    const clis = Store.get('pvClientes').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const ch = Store.get('pvChamados');
    const tb = document.createElement('div'); tb.className = 'toolbar';
    tb.innerHTML = `<div class="filter-input">${ic('search')}<input id="pvCq" placeholder="Buscar cliente, CNPJ, cidade…"></div>`;
    view.appendChild(tb); Icons.apply(tb);
    const holder = document.createElement('div'); view.appendChild(holder);
    const render = (q) => {
      const l = q ? clis.filter((k) => JSON.stringify(k).toLowerCase().includes(q.toLowerCase())) : clis;
      holder.innerHTML = l.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>Cliente</th><th>Segmento</th><th>Contato</th><th>Prazo de resposta</th><th>Chamados</th><th></th></tr></thead><tbody>${l.map((k) => {
        const mine = ch.filter((c) => c.clienteId === k.id); const ab = mine.filter(pvAberto).length;
        return `<tr data-cli="${k.id}" class="pvx-tr"><td><div class="cell-main">${esc(k.nome)}</div><div class="cell-sub">${esc([k.cnpj, [k.cidade, k.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · ') || '—')}</div></td>
          <td>${esc(k.segmento || '—')}</td>
          <td><div class="cell-main">${esc(k.contatoNome || '—')}</div><div class="cell-sub">${esc(k.contatoEmail || k.contatoFone || '')}</div></td>
          <td>${k.prazoRespostaDias ? `${esc(k.prazoRespostaDias)} dias` : '—'}${k.exige8D ? ' <span class="badge info plain">Exige 8D</span>' : ''}</td>
          <td><b>${mine.length}</b>${ab ? ` <span class="badge warn plain">${ab} em aberto</span>` : ''}</td>
          <td class="row-actions"><button class="mini-btn" data-clied="${k.id}" title="Editar">${ic('edit')}</button></td></tr>`;
      }).join('')}</tbody></table></div>` : `<div class="tbl-wrap">${emptyState('users', clis.length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado', clis.length ? 'Ajuste a busca.' : 'Cadastre aqui ou direto ao abrir um chamado.')}</div>`;
      Icons.apply(holder);
      $$('tr[data-cli]', holder).forEach((tr) => (tr.onclick = (e) => { if (e.target.closest('[data-clied]')) return; pvFilt.cli = tr.dataset.cli; pvFilt.st = 'todos'; go('pv-chamados'); }));
      $$('[data-clied]', holder).forEach((b) => (b.onclick = () => pvFormCliente(Store.find('pvClientes', b.dataset.clied))));
    };
    $('#pvCq', tb).oninput = (e) => render(e.target.value.trim());
    render('');
  };
  function pvFormCliente(k, onDone) {
    const editing = !!k; k = k || {};
    const card = modal({
      title: editing ? 'Editar cliente' : 'Novo cliente', sub: 'Pós-Vendas · cadastro',
      body: `<div class="form-grid">
        <div class="form-sec">${ic('users')}Identificação</div>
        ${field('Nome / razão social', 'nome', k.nome, 'text', { full: true })}
        ${field('CNPJ', 'cnpj', k.cnpj, 'text', { ph: '00.000.000/0000-00' })}
        <div class="field"><label>Segmento</label><select name="segmento">${pvOpt(k.segmento || '', [''].concat(PV_SEGMENTOS))}</select></div>
        ${field('Cidade', 'cidade', k.cidade)}
        <div class="field"><label>UF</label><select name="uf">${pvOpt(k.uf || '', [''].concat(PV_UF))}</select></div>
        <div class="form-sec">${ic('phone')}Contato principal</div>
        ${field('Nome', 'contatoNome', k.contatoNome)}
        ${field('E-mail', 'contatoEmail', k.contatoEmail, 'email')}
        ${field('Telefone', 'contatoFone', k.contatoFone)}
        ${field('Cargo / área', 'contatoCargo', k.contatoCargo)}
        <div class="form-sec">${ic('award')}Requisitos do cliente (CSR)</div>
        ${field('Prazo de resposta à RNC (dias)', 'prazoRespostaDias', k.prazoRespostaDias, 'number', { hint: 'Usado como prazo padrão quando o cliente envia RNC' })}
        <div class="field"><label>Formato de resposta</label><select name="exige8D">${pvOpt(k.exige8D ? 'sim' : 'nao', [{ v: 'nao', t: 'Livre / relatório próprio' }, { v: 'sim', t: 'Exige 8D' }])}</select></div>
        ${field('Requisitos específicos', 'csr', k.csr, 'textarea', { full: true, ph: 'Ex.: contenção em 24h, resposta pelo portal do cliente, formulário próprio, PPAP…' })}
        ${field('Observações', 'obs', k.obs, 'textarea', { full: true })}
      </div>`,
      footer: `${editing ? `<button class="btn danger" id="pvCliDel">${ic('trash')}Excluir</button><span style="flex:1"></span>` : ''}<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="saveBtn">${ic('check')}${editing ? 'Salvar' : 'Cadastrar'}</button>`,
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.nome) return toast('Informe o nome do cliente', 'warn');
      d.exige8D = d.exige8D === 'sim'; d.prazoRespostaDias = d.prazoRespostaDias ? Number(d.prazoRespostaDias) : '';
      const saved = editing ? Store.update('pvClientes', k.id, d) : Store.add('pvClientes', d);
      toast(editing ? 'Cliente atualizado' : 'Cliente cadastrado'); closeModal();
      if (onDone) onDone(saved); else go(currentRoute);
    };
    const del = $('#pvCliDel', card);
    if (del) del.onclick = () => {
      const n = Store.get('pvChamados').filter((c) => c.clienteId === k.id).length;
      if (n) return toast(`Cliente tem ${n} chamado(s) — não pode ser excluído`, 'warn');
      confirmDialog(`Excluir o cliente "${esc(k.nome)}"?`, () => { Store.remove('pvClientes', k.id); toast('Cliente excluído', 'info'); go(currentRoute); });
    };
  }

  /* =========================== NOVO CHAMADO (Comercial) =========================== */
  function pvGoNovo(ch) { pvNovoDraft = ch || null; go('pv-novo'); }
  PAGES['pv-novo'] = () => {
    const editing = !!(pvNovoDraft && pvNovoDraft.id);
    const c = editing ? Store.find('pvChamados', pvNovoDraft.id) || {} : {};
    pvNovoDraft = null;
    pageShell('Pós-Vendas', editing ? `Editar abertura · ${c.numero}` : 'Novo chamado', editing ? 'Dados registrados pelo Comercial na abertura.' : 'Etapa 1 · Comercial — registre o que o cliente relatou. A triagem vem em seguida.',
      `<button class="btn" id="pvBack">${ic('chevron')}Voltar</button>`);
    $('#pvBack').onclick = () => editing ? pvOpen(c.id) : go('pv-chamados');
    const clis = Store.get('pvClientes').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const pr = c.produto || {}, lc = c.local || {}, ct = c.contato || {}, rc = c.rncCliente || {};
    const tipo = c.tipo || 'reclamacao';
    const pending = []; // arquivos escolhidos antes de salvar
    const w = document.createElement('div'); w.className = 'pvx-form';
    w.innerHTML = `
      <div class="panel panel-pad"><div class="form-grid">
        <div class="form-sec">${ic('users')}Cliente</div>
        <div class="field full"><label>Cliente</label><div class="pvx-inline"><select name="clienteId" id="pvCliSel"><option value="">— selecione —</option>${clis.map((k) => `<option value="${k.id}" ${c.clienteId === k.id ? 'selected' : ''}>${esc(k.nome)}${k.cidade ? ' · ' + esc(k.cidade) : ''}</option>`).join('')}</select><button type="button" class="btn" id="pvCliAdd">${ic('plus')}Novo cliente</button></div><span class="hint" id="pvCsr"></span></div>
        ${field('Contato no cliente', 'contatoNome', ct.nome)}
        ${field('E-mail / telefone do contato', 'contatoInfo', ct.info)}
        ${field('Local da ocorrência (cidade)', 'cidade', lc.cidade)}
        <div class="field"><label>UF</label><select name="uf">${pvOpt(lc.uf || '', [''].concat(PV_UF))}</select></div>
        ${field('Endereço / unidade / oficina', 'endereco', lc.endereco, 'text', { full: true, ph: 'Onde o produto está ou onde aconteceu' })}

        <div class="form-sec">${ic('alert')}Ocorrência</div>
        <div class="field full"><label>Tipo de chamado</label><div class="pvx-tipos" id="pvTipos">${Object.keys(PV_TIPOS).map((k) => `<button type="button" class="pvx-tp${tipo === k ? ' on' : ''}" data-tp="${k}"><span class="pvx-tp-i">${ic(PV_TIPOS[k].icon)}</span><b>${esc(PV_TIPOS[k].label)}</b><small>${esc(PV_TIPOS[k].desc)}</small></button>`).join('')}</div><input type="hidden" name="tipo" value="${tipo}"></div>
        ${field('Descrição do problema', 'descricao', c.descricao, 'textarea', { full: true, ph: 'O que o cliente relatou, com as palavras dele: sintoma, quando começou, condições de uso…' })}
        ${field('Data da ocorrência', 'dataOcorrencia', c.dataOcorrencia || todayISO(), 'date')}
        <div class="field"><label>Canal de entrada</label><select name="canal">${pvOpt(c.canal || 'E-mail', PV_CANAIS)}</select></div>
        <div class="field"><label>Prioridade</label><select name="prioridade" id="pvPrio">${pvOpt(c.prioridade || 'media', Object.keys(PV_PRIO).map((k) => ({ v: k, t: `${PV_PRIO[k].label} — prazo ${PV_PRIO[k].dias} dias` })))}</select></div>
        <div class="field"><label>Afeta segurança ou requisito legal?</label><select name="seguranca" id="pvSeg">${pvOpt(c.seguranca ? 'sim' : 'nao', [{ v: 'nao', t: 'Não' }, { v: 'sim', t: 'Sim — tratar como crítico' }])}</select></div>

        <div class="form-sec">${ic('box')}Produto envolvido <span class="lbl-hint">rastreabilidade</span></div>
        ${field('Código / referência', 'codigo', pr.codigo)}
        ${field('Descrição do produto', 'prodDescricao', pr.descricao, 'text', { ph: 'Ex.: Redutor de pressão, válvula de cilindro…' })}
        ${field('Lote', 'lote', pr.lote)}
        ${field('Nº de série', 'serie', pr.serie)}
        ${field('Nota fiscal', 'nf', pr.nf)}
        ${field('Data de fabricação / entrega', 'dataFabricacao', pr.dataFabricacao, 'date')}
        ${field('Aplicação / veículo', 'aplicacao', pr.aplicacao, 'text', { ph: 'Modelo, placa, km…' })}
        ${field('Quantidade afetada', 'quantidade', pr.quantidade, 'number')}

        <div class="form-sec">${ic('file')}RNC do cliente</div>
        <div class="field full"><label>O cliente já enviou uma RNC ou reclamação formal?</label><select name="rncTem" id="pvRncTem">${pvOpt(rc.tem ? 'sim' : 'nao', [{ v: 'nao', t: 'Não' }, { v: 'sim', t: 'Sim — veio com RNC do cliente' }])}</select><span class="hint">Se não veio, a triagem decide depois se é preciso abrir uma RNC interna.</span></div>
        <div class="pvx-rncbox full" id="pvRncBox" ${rc.tem ? '' : 'hidden'}>
          <div class="form-grid">
            ${field('Nº da RNC do cliente', 'rncNumero', rc.numero)}
            ${field('Prazo de resposta exigido', 'rncPrazo', rc.prazoResposta, 'date', { hint: 'Vira o prazo do chamado' })}
          </div>
          ${editing ? '' : `<label class="pvx-drop">${ic('upload')}<span>Anexar a RNC do cliente</span><small>Também pode anexar depois</small><input type="file" multiple id="pvRncFile" hidden></label><div class="pvx-picked" id="pvRncPicked"></div>`}
        </div>

        ${editing ? '' : `<div class="form-sec">${ic('upload')}Evidências <span class="lbl-hint">fotos, e-mails, laudos</span></div>
        <div class="full"><label class="pvx-drop">${ic('upload')}<span>Anexar fotos ou documentos</span><small>Opcional · até ${PV_MAX_MB} MB por arquivo</small><input type="file" multiple id="pvEvFile" hidden></label><div class="pvx-picked" id="pvEvPicked"></div></div>`}

        <div class="form-sec">${ic('users')}Registro</div>
        ${field('Aberto por', 'abertoPor', c.abertoPor || pvMe(), 'text', { hint: 'Fica salvo neste computador para os próximos registros' })}
      </div></div>
      <div class="prog-form-actions"><button class="btn primary" id="pvSave">${ic('check')}${editing ? 'Salvar alterações' : 'Abrir chamado'}</button><button class="btn ghost" id="pvCancel">Cancelar</button></div>`;
    view.appendChild(w); Icons.apply(w);

    const csr = () => { const k = pvCliente($('#pvCliSel', w).value); const el = $('#pvCsr', w); el.textContent = k && (k.csr || k.prazoRespostaDias) ? `Requisitos do cliente: ${[k.prazoRespostaDias ? 'resposta em ' + k.prazoRespostaDias + ' dias' : '', k.exige8D ? 'exige 8D' : '', k.csr || ''].filter(Boolean).join(' · ')}` : ''; };
    $('#pvCliSel', w).onchange = () => {
      const k = pvCliente($('#pvCliSel', w).value); csr(); if (!k) return;
      const set = (n, v) => { const el = $(`[name="${n}"]`, w); if (el && !el.value && v) el.value = v; };
      set('contatoNome', k.contatoNome); set('contatoInfo', [k.contatoEmail, k.contatoFone].filter(Boolean).join(' · ')); set('cidade', k.cidade); set('uf', k.uf);
    };
    csr();
    $('#pvCliAdd', w).onclick = () => pvFormCliente(null, (k) => {
      const sel = $('#pvCliSel', w); sel.insertAdjacentHTML('beforeend', `<option value="${k.id}">${esc(k.nome)}</option>`); sel.value = k.id; sel.onchange();
    });
    $$('.pvx-tp', w).forEach((b) => (b.onclick = () => { $$('.pvx-tp', w).forEach((x) => x.classList.toggle('on', x === b)); $('[name="tipo"]', w).value = b.dataset.tp; }));
    $('#pvSeg', w).onchange = (e) => { if (e.target.value === 'sim') $('#pvPrio', w).value = 'critica'; };
    $('#pvRncTem', w).onchange = (e) => { $('#pvRncBox', w).hidden = e.target.value !== 'sim'; };
    const picker = (inpId, listId, grupo) => {
      const inp = $('#' + inpId, w); if (!inp) return;
      const draw = () => { $('#' + listId, w).innerHTML = pending.filter((p) => p.grupo === grupo).map((p, i) => `<span class="file-chip">${ic('file')}${esc(p.file.name)}<button type="button" data-unpick="${pending.indexOf(p)}">${ic('x')}</button></span>`).join(''); Icons.apply($('#' + listId, w)); $$('[data-unpick]', $('#' + listId, w)).forEach((b) => (b.onclick = () => { pending.splice(+b.dataset.unpick, 1); draw(); })); };
      inp.onchange = () => { Array.from(inp.files).forEach((f) => pending.push({ grupo, file: f })); inp.value = ''; draw(); };
    };
    picker('pvRncFile', 'pvRncPicked', 'rnc_cliente');
    picker('pvEvFile', 'pvEvPicked', 'abertura');
    $('#pvCancel', w).onclick = () => $('#pvBack').onclick();

    $('#pvSave', w).onclick = async () => {
      const d = readForm(w);
      if (!d.clienteId) return toast('Selecione o cliente (ou cadastre um novo)', 'warn');
      if (!d.descricao) return toast('Descreva o problema relatado pelo cliente', 'warn');
      if (!d.abertoPor) return toast('Informe quem está abrindo o chamado', 'warn');
      setPvMe(d.abertoPor);
      const k = pvCliente(d.clienteId);
      const rncTem = d.rncTem === 'sim';
      const obj = {
        clienteId: d.clienteId, clienteNome: k ? k.nome : '',
        contato: { nome: d.contatoNome, info: d.contatoInfo },
        local: { cidade: d.cidade, uf: d.uf, endereco: d.endereco },
        tipo: d.tipo, descricao: d.descricao, dataOcorrencia: d.dataOcorrencia, canal: d.canal,
        prioridade: d.seguranca === 'sim' ? 'critica' : d.prioridade, seguranca: d.seguranca === 'sim',
        produto: { codigo: d.codigo, descricao: d.prodDescricao, lote: d.lote, serie: d.serie, nf: d.nf, dataFabricacao: d.dataFabricacao, aplicacao: d.aplicacao, quantidade: d.quantidade },
        rncCliente: { tem: rncTem, numero: rncTem ? d.rncNumero : '', prazoResposta: rncTem ? d.rncPrazo : '' },
        abertoPor: d.abertoPor,
      };
      if (editing) {
        if (rncTem && d.rncPrazo && d.rncPrazo !== (c.rncCliente || {}).prazoResposta) obj.prazo = d.rncPrazo;
        pvSave(c, obj, 'Abertura editada');
        toast('Chamado atualizado'); pvOpen(c.id); return;
      }
      let prazo = addDays(todayISO(), PV_PRIO[obj.prioridade].dias);
      if (rncTem) prazo = d.rncPrazo || (k && k.prazoRespostaDias ? addDays(todayISO(), k.prazoRespostaDias) : prazo);
      Object.assign(obj, { numero: pvNextNumero(), criadoEm: pvNow(), status: 'aberto', prazo, anexos: [], triagem: rncTem ? { rnc: '' } : {}, historico: [] });
      obj.historico = [{ at: obj.criadoEm, by: d.abertoPor, acao: 'Chamado aberto', det: `${PV_TIPOS[obj.tipo].label} · canal ${obj.canal}${rncTem ? ' · com RNC do cliente' : ''}` }];
      const novo = Store.add('pvChamados', obj);
      for (const g of ['rnc_cliente', 'abertura']) { const fs = pending.filter((p) => p.grupo === g).map((p) => p.file); if (fs.length) await pvAttach(novo, g, fs); }
      toast(`Chamado ${novo.numero} aberto`);
      pvOpen(novo.id);
    };
  };

  /* =========================== DETALHE DO CHAMADO =========================== */
  PAGES['pv-detalhe'] = () => {
    const c = pvCurrentId && Store.find('pvChamados', pvCurrentId);
    if (!c) { go('pv-chamados'); return; }
    const t = PV_TIPOS[c.tipo] || PV_TIPOS.reclamacao;
    const rerender = () => { if (currentRoute === 'pv-detalhe') { view.innerHTML = ''; PAGES['pv-detalhe'](); } };
    pageShell('Pós-Vendas', `${c.numero} · ${pvClienteNome(c)}`, `${t.label} · aberto em ${pvFmtDT(c.criadoEm)} por ${c.abertoPor || '—'}`,
      `<button class="btn" id="pvBack">${ic('chevron')}Chamados</button><button class="btn" id="pvPrint">${ic('download')}Imprimir / PDF</button>`);
    $('#pvBack').onclick = () => go('pv-chamados');
    $('#pvPrint').onclick = () => pvPrint(Store.find('pvChamados', c.id));

    const steps = pvSteps(c);
    const pend = pvPendencias(c);
    const precisa = pvPrecisaRnc(c);
    const tr = c.triagem || {}, ct = c.contencao || {}, at = c.atendimento || {}, rn = c.rnc || {}, vf = c.verificacao || {}, en = c.encerramento || {};
    const kv = (k, v) => `<div class="pvx-kv"><span>${esc(k)}</span><b>${v == null || v === '' ? '—' : v}</b></div>`;
    const kvt = (k, v) => kv(k, v == null || v === '' ? '' : esc(v));
    const sec = (n, icon, title, state, body, actions) => `<section class="pvx-sec${state ? ' s-' + state : ''}" id="pvSec${n}">
        <header class="pvx-sec-h"><span class="pvx-sec-n">${n}</span><div class="pvx-sec-t"><b>${esc(title)}</b></div><span class="pvx-sec-ico">${ic(icon)}</span><div class="pvx-sec-a">${actions || ''}</div></header>
        <div class="pvx-sec-b">${body}</div></section>`;
    const btn = (id, icon, label, kind) => pvAberto(c) ? `<button class="btn ${kind || ''} sm" id="${id}">${ic(icon)}${esc(label)}</button>` : '';
    const stState = (n) => (steps.find((s) => s.n === n) || {}).state;

    const w = document.createElement('div');
    w.innerHTML = `
      <div class="pvx-head">
        <div class="pvx-head-badges">${pvBadge(PV_STATUS, c.status)}${pvBadge(PV_PRIO, c.prioridade || 'media')}${c.seguranca ? '<span class="badge danger">Segurança / legal</span>' : ''}<span class="pvx-tipo">${ic(t.icon)}${esc(t.short)}</span></div>
        <div class="pvx-head-meta"><span>Prazo</span>${pvPrazoBadge(c)}<span>RNC</span>${pvRncBadge(c)}</div>
      </div>
      <ol class="pvx-steps">${steps.map((s) => `<li class="st-${s.state}"><span class="pvx-st-dot">${s.state === 'done' ? ic('check') : s.state === 'na' ? '–' : s.n}</span><span class="pvx-st-tx"><b>${esc(s.t)}</b><small>${esc(s.s)}</small></span></li>`).join('')}</ol>
      ${c.status === 'cancelado' ? `<div class="pvx-banner neutral">${ic('x')}<div><b>Chamado cancelado</b><span>${esc(c.cancelamento ? c.cancelamento.motivo : '')}</span></div><button class="btn sm" id="pvReopen">${ic('refresh')}Reabrir</button></div>` : ''}
      ${c.status === 'encerrado' ? `<div class="pvx-banner ok">${ic('check')}<div><b>Chamado encerrado em ${fmtDate(en.data)}</b><span>por ${esc(en.por || '—')} · aceite do cliente: ${esc(en.aceite || '—')}</span></div><button class="btn sm" id="pvReopen">${ic('refresh')}Reabrir</button></div>` : ''}
      <div class="pvx-cols2">
        <div class="pvx-main">
          ${sec(1, 'file', 'Abertura — Comercial', 'done', `
            <p class="pvx-desc">${esc(c.descricao || '')}</p>
            <div class="pvx-kvs">
              ${kvt('Cliente', pvClienteNome(c))}${kvt('Contato', [ (c.contato || {}).nome, (c.contato || {}).info ].filter(Boolean).join(' · '))}
              ${kvt('Local', [(c.local || {}).endereco, (c.local || {}).cidade, (c.local || {}).uf].filter(Boolean).join(' · '))}${kvt('Data da ocorrência', fmtDate(c.dataOcorrencia))}
              ${kvt('Canal', c.canal)}${kvt('Produto', [(c.produto || {}).codigo, (c.produto || {}).descricao].filter(Boolean).join(' — '))}
              ${kvt('Lote / série', [(c.produto || {}).lote, (c.produto || {}).serie].filter(Boolean).join(' / '))}${kvt('Nota fiscal', (c.produto || {}).nf)}
              ${kvt('Fabricação / entrega', fmtDate((c.produto || {}).dataFabricacao))}${kvt('Aplicação / veículo', (c.produto || {}).aplicacao)}
              ${kvt('Quantidade afetada', (c.produto || {}).quantidade)}${kvt('RNC do cliente', (c.rncCliente || {}).tem ? `Sim${c.rncCliente.numero ? ' · nº ' + c.rncCliente.numero : ''}${c.rncCliente.prazoResposta ? ' · resposta até ' + fmtDate(c.rncCliente.prazoResposta) : ''}` : 'Não')}
            </div>
            <div class="pvx-subh">Evidências</div>${pvFileList(c, 'abertura', { readonly: !pvAberto(c) })}
            ${(c.rncCliente || {}).tem ? `<div class="pvx-subh">RNC / reclamação do cliente</div>${pvFileList(c, 'rnc_cliente', { readonly: !pvAberto(c), cta: 'Anexar RNC do cliente' })}` : ''}`,
            btn('pvEdAb', 'edit', 'Editar', 'ghost'))}

          ${sec(2, 'clipboard', 'Triagem — precisa de RNC?', stState(2), tr.rnc ? `
            <div class="pvx-decision ${tr.rnc === 'nao' ? 'no' : 'yes'}">${ic(tr.rnc === 'nao' ? 'check' : 'alert')}<div><b>${esc(PV_RNC[tr.rnc].label)}</b>${tr.rnc === 'nao' ? `<span>Justificativa: ${esc(tr.justificativa || '—')}</span>` : '<span>A Qualidade é acionada e anexa a RNC na etapa 4.</span>'}</div></div>
            <div class="pvx-kvs">${kvt('Responsável pela tratativa', tr.responsavel)}${kvt('Procedência', tr.procedencia)}${kvt('Triado em', pvFmtDT(tr.em))}${kvt('Triado por', tr.por)}${kvt('Prazo do chamado', fmtDate(c.prazo))}${kvt('Observações', tr.obs)}</div>`
            : `<div class="pvx-cta">${ic('clipboard')}<div><b>Chamado aguardando triagem</b><span>Defina o responsável, o prazo e se é necessária RNC. ${(c.rncCliente || {}).tem ? 'Este chamado veio com RNC do cliente.' : ''}</span></div>${btn('pvTriar', 'clipboard', 'Fazer triagem', 'primary')}</div>`,
            tr.rnc ? btn('pvTriar', 'edit', 'Editar', 'ghost') : '')}

          ${sec(3, 'wrench', 'Tratativa — contenção e atendimento', stState(3), `
            ${precisa || ct.data ? `<div class="pvx-subh">Contenção <small>ação imediata para proteger o cliente</small></div>
              ${ct.data ? `<div class="pvx-kvs">${kvt('Ações de contenção', ct.acoes)}${kvt('Onde', (ct.locais || []).join(', '))}${kvt('Quantidade segregada', ct.qtd)}${kvt('Data', fmtDate(ct.data))}${kvt('Responsável', ct.responsavel)}</div>` : `<div class="pvx-cta sm">${ic('shield')}<div><b>Contenção não registrada</b><span>Recomendado em até 24 h quando há RNC.</span></div>${btn('pvCont', 'shield', 'Registrar contenção', 'primary')}</div>`}` : ''}
            <div class="pvx-subh">Atendimento <small>o que foi feito para resolver</small></div>
            ${at.descricao ? `<div class="pvx-kvs">${kvt('Modalidade', at.modalidade)}${kvt('Técnico / responsável', at.tecnico)}${kvt('Data', fmtDate(at.data))}${kvt('Resultado', at.resultado)}${kvt('O que foi feito', at.descricao)}${kvt('Peças trocadas', at.pecas)}${kv('Análise sem defeito (NTF)', at.ntf ? 'Sim' : 'Não')}${kvt('Garantia', at.garantia)}${kv('Custo total', pvMoney(at.custoTotal))}</div>
              <div class="pvx-subh">Relatório de atendimento</div>${pvFileList(c, 'atendimento', { readonly: !pvAberto(c) })}`
              : `<div class="pvx-cta sm">${ic('wrench')}<div><b>Atendimento não registrado</b><span>Correção em campo, análise da peça, troca em garantia…</span></div>${btn('pvAtend', 'wrench', 'Registrar atendimento', 'primary')}</div>`}`,
            `${ct.data ? btn('pvCont', 'shield', 'Contenção', 'ghost') : ''}${at.descricao ? btn('pvAtend', 'edit', 'Atendimento', 'ghost') : ''}`)}

          ${sec(4, 'award', 'RNC — Qualidade', stState(4), precisa ? `
            <div class="pvx-rnc-st">${pvBadge(PV_RNC_ST, pvRncStatus(c))}<span>${pvRncDecisao(c) === 'cliente' ? 'O cliente emitiu RNC: a Qualidade trata e responde ao cliente.' : 'RNC interna: a Qualidade abre no sistema dela e anexa aqui.'}</span></div>
            <div class="pvx-subh">Arquivo da RNC <small>obrigatório para encerrar</small></div>
            ${pvFileList(c, 'rnc', { readonly: !pvAberto(c), required: true, cta: 'Anexar RNC' })}
            <div class="pvx-subh">8D / relatório de análise</div>
            ${pvFileList(c, 'd8', { readonly: !pvAberto(c), cta: 'Anexar 8D ou relatório' })}
            <div class="pvx-kvs">${kvt('Nº da RNC', rn.numero)}${kvt('Responsável (Qualidade)', rn.responsavel)}${kvt('Causa raiz', rn.causa)}${kvt('Ação corretiva', rn.acao)}${kvt('Resposta enviada ao cliente em', fmtDate(rn.respostaEm))}</div>`
            : tr.rnc === 'nao' ? `<div class="pvx-na">${ic('check')}<span>Não aplicável — a triagem decidiu que este chamado não requer RNC.</span></div>`
            : `<div class="pvx-na">${ic('clock')}<span>Definido na triagem (etapa 2).</span></div>`,
            precisa ? btn('pvRnc', 'edit', 'Dados da RNC', 'ghost') : '')}

          ${sec(5, 'check', 'Verificação e encerramento', stState(5), `
            ${precisa ? `<div class="pvx-subh">Eficácia da ação corretiva</div>
              ${vf.data ? `<div class="pvx-kvs">${kvt('Verificado em', fmtDate(vf.data))}${kvt('Foi eficaz?', vf.eficaz)}${kvt('Evidência', vf.evidencia)}${kvt('Documentos atualizados', (vf.docs || []).join(', '))}${kvt('Lições aprendidas', vf.licoes)}</div>
                ${pvFileList(c, 'verificacao', { readonly: !pvAberto(c), cta: 'Anexar evidência' })}` : `<div class="pvx-cta sm">${ic('check')}<div><b>Eficácia ainda não verificada</b><span>Confirme, depois de um tempo, que o problema não voltou.</span></div>${btn('pvVerif', 'check', 'Verificar eficácia', 'primary')}</div>`}` : ''}
            <div class="pvx-subh">Retorno do cliente</div>
            ${en.aceite ? `<div class="pvx-kvs">${kvt('Aceite do cliente', en.aceite)}${kv('Satisfação', en.satisfacao ? '★'.repeat(en.satisfacao) + '<span class="pvx-off">' + '★'.repeat(5 - en.satisfacao) + '</span>' : '')}${kvt('Comentário', en.comentario)}</div>` : '<span class="pvx-muted">Registrado ao encerrar.</span>'}
            ${pvAberto(c) ? `<div class="pvx-close">${pend.length ? `<div class="pvx-close-p">${ic('alert')}<span>Faltam ${pend.length} item(ns) para encerrar — veja em Pendências.</span></div>` : `<div class="pvx-close-p ok">${ic('check')}<span>Tudo pronto. Registre o retorno do cliente e encerre.</span></div>`}<button class="btn primary" id="pvClose">${ic('check')}Encerrar chamado</button></div>` : ''}`,
            precisa && vf.data ? btn('pvVerif', 'edit', 'Eficácia', 'ghost') : '')}
        </div>

        <aside class="pvx-side">
          <div class="panel panel-pad pvx-card">
            <div class="pvx-card-h">${ic('alert')}<b>Pendências</b><span class="pvx-count">${pend.length}</span></div>
            ${pvAberto(c) ? (pend.length ? `<ul class="pvx-pend">${pend.map((p) => `<li><button data-pvjump="${p.step}"><span class="pvx-pend-n">${p.step}</span>${esc(p.t)}</button></li>`).join('')}</ul>` : `<div class="pvx-ok">${ic('check')}Nada pendente</div>`) : '<div class="pvx-muted">Chamado fechado.</div>'}
          </div>
          <div class="panel panel-pad pvx-card">
            <div class="pvx-card-h">${ic('clock')}<b>Histórico</b><span class="pvx-count">${(c.historico || []).length}</span></div>
            <ul class="timeline pvx-tl">${(c.historico || []).slice().reverse().map((h) => `<li><span class="tl-dot"></span><div class="tl-c"><div class="tl-top"><b>${esc(h.acao)}</b></div>${h.det ? `<div class="tl-detail">${esc(h.det)}</div>` : ''}<div class="tl-who">${ic('users')}${esc(h.by || '—')} · ${pvFmtDT(h.at)}</div></div></li>`).join('')}</ul>
            ${pvAberto(c) ? `<div class="pvx-note"><textarea id="pvNote" placeholder="Adicionar comentário ao histórico (contato com cliente, retorno do técnico…)"></textarea><button class="btn sm" id="pvNoteBtn">${ic('plus')}Comentar</button></div>` : ''}
          </div>
          <div class="pvx-danger">
            ${pvAberto(c) ? `<button class="btn ghost sm" id="pvCancel">${ic('x')}Cancelar chamado</button>` : ''}
            <button class="btn ghost sm danger-tx" id="pvDel">${ic('trash')}Excluir</button>
          </div>
        </aside>
      </div>`;
    view.appendChild(w); Icons.apply(w);
    pvBindFiles(w, c, rerender);

    const on = (id, fn) => { $$('#' + id, w).forEach((b) => (b.onclick = fn)); };
    on('pvEdAb', () => pvGoNovo(c));
    on('pvTriar', () => pvFormTriagem(c, rerender));
    on('pvCont', () => pvFormContencao(c, rerender));
    on('pvAtend', () => pvFormAtendimento(c, rerender));
    on('pvRnc', () => pvFormRnc(c, rerender));
    on('pvVerif', () => pvFormVerificacao(c, rerender));
    on('pvClose', () => pvFormEncerrar(c, rerender));
    on('pvReopen', () => confirmDialog(`Reabrir o ${c.numero}?`, () => { pvSave(c, { status: (c.triagem || {}).rnc ? 'tratativa' : 'aberto' }, 'Chamado reaberto'); toast('Chamado reaberto'); rerender(); }, 'primary'));
    on('pvCancel', () => pvFormCancelar(c, rerender));
    on('pvDel', () => confirmDialog(`Excluir definitivamente o ${c.numero}? Para auditoria, prefira "Cancelar".`, async () => {
      for (const a of (c.anexos || [])) { await Store.blobs.del(a.id); try { if (window.Cloud && window.Cloud.ok) await window.Cloud.removeFile('pvChamados', c.id, a.grupo, a.cloudName); } catch (e) {} }
      Store.remove('pvChamados', c.id); toast('Chamado excluído', 'info'); go('pv-chamados');
    }));
    const nb = $('#pvNoteBtn', w);
    if (nb) nb.onclick = () => { const v = $('#pvNote', w).value.trim(); if (!v) return; pvSave(c, {}, 'Comentário', v); rerender(); };
    $$('[data-pvjump]', w).forEach((b) => (b.onclick = () => { const el = $('#pvSec' + b.dataset.pvjump); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }));
  };

  // ---- formulários de cada etapa (abrem como página/sheet, padrão do app) ----
  function pvSheet(c, title, sub, body, onSave) {
    const card = modal({ title, sub: `${c.numero} · ${pvClienteNome(c)}${sub ? ' · ' + sub : ''}`, body: `<div class="form-grid">${body}</div>`, footer: submitFooter(true) });
    $('#saveBtn', card).onclick = () => { if (onSave(readForm(card), card) !== false) closeModal(); };
    return card;
  }
  function pvFormTriagem(c, after) {
    const tr = c.triagem || {};
    const dec = tr.rnc || ((c.rncCliente || {}).tem ? 'cliente' : '');
    const card = pvSheet(c, 'Triagem', 'etapa 2', `
      <div class="form-sec">${ic('alert')}Foi necessária RNC?</div>
      <div class="field full"><div class="pvx-radio" id="pvDec">${Object.keys(PV_RNC).map((k) => `<label class="pvx-rd${dec === k ? ' on' : ''}"><input type="radio" name="rnc" value="${k}" ${dec === k ? 'checked' : ''}><b>${esc(PV_RNC[k].label)}</b><small>${k === 'cliente' ? 'O cliente mandou RNC/reclamação formal. A Qualidade responde.' : k === 'interna' ? 'Problema de qualidade nosso: a Qualidade abre a RNC e anexa.' : 'Ex.: correção em campo, dúvida, logística. Precisa justificar.'}</small></label>`).join('')}</div></div>
      <div class="field full" id="pvJust" ${dec === 'nao' ? '' : 'hidden'}><label>Justificativa (obrigatória)</label><textarea name="justificativa" placeholder="Por que não é uma não conformidade? Ex.: erro de instalação pelo cliente, ajuste de regulagem…">${esc(tr.justificativa || '')}</textarea></div>
      <div class="form-sec">${ic('users')}Responsável e prazo</div>
      ${field('Responsável pela tratativa', 'responsavel', tr.responsavel || pvMe())}
      <div class="field"><label>Procedência</label><select name="procedencia">${pvOpt(tr.procedencia || 'Em análise', ['Em análise', 'Procedente', 'Improcedente'])}</select><span class="hint">Pode ser ajustada depois da análise</span></div>
      ${field('Prazo para concluir', 'prazo', c.prazo, 'date')}
      ${field('Seu nome', 'por', pvMe())}
      ${field('Observações da triagem', 'obs', tr.obs, 'textarea', { full: true })}`,
      (d, card2) => {
        const picked = $('#pvDec input:checked', card2); d.rnc = picked ? picked.value : '';
        if (!d.rnc) { toast('Escolha se é necessária RNC', 'warn'); return false; }
        if (d.rnc === 'nao' && !d.justificativa) { toast('Justifique por que não requer RNC', 'warn'); return false; }
        if (!d.por) { toast('Informe seu nome', 'warn'); return false; }
        setPvMe(d.por);
        const triagem = { rnc: d.rnc, justificativa: d.rnc === 'nao' ? d.justificativa : '', responsavel: d.responsavel, procedencia: d.procedencia, obs: d.obs, em: tr.em || pvNow(), por: d.por };
        pvSave(c, { triagem, prazo: d.prazo || c.prazo, status: c.status === 'aberto' ? 'tratativa' : c.status }, tr.rnc ? 'Triagem atualizada' : 'Triagem concluída', `${PV_RNC[d.rnc].label} · responsável ${d.responsavel || '—'}`);
        toast(d.rnc === 'nao' ? 'Triagem salva' : 'Triagem salva — Qualidade acionada'); after();
      });
    $$('#pvDec input', card).forEach((r) => (r.onchange = () => { $$('.pvx-rd', card).forEach((l) => l.classList.toggle('on', l.contains(r) && r.checked)); $('#pvJust', card).hidden = r.value !== 'nao'; }));
  }
  function pvFormContencao(c, after) {
    const ct = c.contencao || {};
    const card = pvSheet(c, 'Contenção', 'ação imediata', `
      <div class="form-sec">${ic('shield')}Proteger o cliente enquanto a causa é investigada</div>
      ${field('Ações de contenção', 'acoes', ct.acoes, 'textarea', { full: true, ph: 'Ex.: bloqueio do lote em estoque, inspeção 100%, troca preventiva no cliente…' })}
      <div class="field full"><label>Onde foi aplicada</label><div class="chk-chips">${PV_LOCAIS_CONT.map((l) => `<label class="chk-chip"><input type="checkbox" data-loc="${esc(l)}" ${(ct.locais || []).includes(l) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div></div>
      ${field('Quantidade segregada / inspecionada', 'qtd', ct.qtd)}
      ${field('Data da contenção', 'data', ct.data || todayISO(), 'date')}
      ${field('Responsável', 'responsavel', ct.responsavel || pvMe())}`,
      (d, card2) => {
        if (!d.acoes) { toast('Descreva as ações de contenção', 'warn'); return false; }
        const locais = $$('[data-loc]', card2).filter((x) => x.checked).map((x) => x.dataset.loc);
        pvSave(c, { contencao: { acoes: d.acoes, locais, qtd: d.qtd, data: d.data, responsavel: d.responsavel } }, ct.data ? 'Contenção atualizada' : 'Contenção registrada', d.acoes.slice(0, 120));
        toast('Contenção salva'); after();
      });
    return card;
  }
  function pvFormAtendimento(c, after) {
    const at = c.atendimento || {};
    const card = pvSheet(c, 'Atendimento', 'tratativa', `
      <div class="form-sec">${ic('wrench')}O que foi feito</div>
      <div class="field"><label>Modalidade</label><select name="modalidade">${pvOpt(at.modalidade || 'Em campo', ['Em campo', 'Remoto / telefone', 'Análise na fábrica (peça devolvida)', 'Troca / reposição', 'Somente informação'])}</select></div>
      ${field('Técnico / responsável', 'tecnico', at.tecnico || pvMe())}
      ${field('Data do atendimento', 'data', at.data || todayISO(), 'date')}
      <div class="field"><label>Resultado</label><select name="resultado">${pvOpt(at.resultado || '', ['', 'Resolvido', 'Resolvido parcialmente', 'Não resolvido — nova intervenção', 'Aguardando peça'])}</select></div>
      ${field('Descrição do serviço / análise', 'descricao', at.descricao, 'textarea', { full: true, ph: 'Diagnóstico, o que foi corrigido, testes feitos…' })}
      ${field('Peças trocadas', 'pecas', at.pecas, 'text', { full: true })}
      <div class="field full"><label class="pvx-chk"><input type="checkbox" name="ntf" ${at.ntf ? 'checked' : ''}>Análise não encontrou defeito (NTF — "no trouble found")</label><span class="hint">A IATF pede que peças de garantia sem defeito também sejam analisadas e registradas.</span></div>
      <div class="form-sec">${ic('shield')}Garantia e custos</div>
      <div class="field"><label>Garantia</label><select name="garantia">${pvOpt(at.garantia || 'Não se aplica', ['Não se aplica', 'Procedente — coberta', 'Improcedente — não coberta', 'Cortesia comercial'])}</select></div>
      ${field('Mão de obra (R$)', 'custoMao', at.custoMao, 'number')}
      ${field('Peças (R$)', 'custoPecas', at.custoPecas, 'number')}
      ${field('Deslocamento / frete (R$)', 'custoDesl', at.custoDesl, 'number')}`,
      (d) => {
        if (!d.descricao) { toast('Descreva o que foi feito', 'warn'); return false; }
        if (!d.resultado) { toast('Informe o resultado', 'warn'); return false; }
        const custoTotal = (Number(d.custoMao) || 0) + (Number(d.custoPecas) || 0) + (Number(d.custoDesl) || 0);
        const atendimento = Object.assign({}, d, { custoTotal });
        const patch = { atendimento };
        if (d.ntf && c.triagem && c.triagem.procedencia === 'Em análise') patch.triagem = Object.assign({}, c.triagem, { procedencia: 'Improcedente' });
        pvSave(c, patch, at.descricao ? 'Atendimento atualizado' : 'Atendimento registrado', `${d.modalidade} · ${d.resultado}`);
        toast('Atendimento salvo'); after();
      });
    return card;
  }
  function pvFormRnc(c, after) {
    const rn = c.rnc || {};
    pvSheet(c, 'Dados da RNC', 'Qualidade', `
      <div class="form-sec">${ic('award')}Registro da Qualidade <span class="lbl-hint">o arquivo é anexado na tela do chamado</span></div>
      ${field('Nº da RNC', 'numero', rn.numero, 'text', { ph: 'Número no sistema da Qualidade' })}
      ${field('Responsável (Qualidade)', 'responsavel', rn.responsavel || pvMe())}
      <div class="field"><label>Situação da RNC</label><select name="status">${pvOpt(rn.status && rn.status !== 'pendente' ? rn.status : 'anexada', [{ v: 'anexada', t: 'Em tratamento' }, { v: 'respondida', t: 'Respondida ao cliente' }, { v: 'fechada', t: 'Encerrada' }])}</select></div>
      ${field('Resposta enviada ao cliente em', 'respostaEm', rn.respostaEm, 'date', { hint: pvRncDecisao(c) === 'cliente' ? 'Obrigatório: o cliente emitiu RNC' : 'Se houve resposta formal' })}
      ${field('Causa raiz (resumo)', 'causa', rn.causa, 'textarea', { full: true, ph: 'Resumo do 8D / 5 porquês / Ishikawa' })}
      ${field('Ação corretiva (resumo)', 'acao', rn.acao, 'textarea', { full: true })}`,
      (d) => {
        if (d.respostaEm && d.status === 'anexada') d.status = 'respondida';
        pvSave(c, { rnc: d }, 'Dados da RNC atualizados', [d.numero ? 'RNC ' + d.numero : '', d.respostaEm ? 'resposta ao cliente em ' + fmtDate(d.respostaEm) : ''].filter(Boolean).join(' · '));
        toast('RNC atualizada'); after();
      });
  }
  function pvFormVerificacao(c, after) {
    const vf = c.verificacao || {};
    pvSheet(c, 'Verificação de eficácia', 'etapa 5', `
      <div class="form-sec">${ic('check')}A ação corretiva resolveu?</div>
      ${field('Data da verificação', 'data', vf.data || todayISO(), 'date')}
      <div class="field"><label>Foi eficaz?</label><select name="eficaz">${pvOpt(vf.eficaz || '', ['', 'Sim', 'Não — reabrir análise'])}</select></div>
      ${field('Evidência', 'evidencia', vf.evidencia, 'textarea', { full: true, ph: 'Ex.: 3 lotes sem reincidência, auditoria de processo, retorno do cliente…' })}
      <div class="field full"><label>Documentos atualizados</label><div class="chk-chips">${PV_DOCS.map((l) => `<label class="chk-chip"><input type="checkbox" data-doc="${esc(l)}" ${(vf.docs || []).includes(l) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div><span class="hint">IATF 10.2.3 — refletir o aprendizado nos FMEAs e planos de controle.</span></div>
      ${field('Lições aprendidas', 'licoes', vf.licoes, 'textarea', { full: true })}`,
      (d, card) => {
        if (!d.eficaz) { toast('Informe se foi eficaz', 'warn'); return false; }
        d.docs = $$('[data-doc]', card).filter((x) => x.checked).map((x) => x.dataset.doc);
        const patch = { verificacao: d };
        if (d.eficaz === 'Sim' && c.status === 'tratativa') patch.status = 'verificacao';
        pvSave(c, patch, 'Eficácia verificada', d.eficaz);
        toast('Verificação salva'); after();
      });
  }
  function pvFormEncerrar(c, after) {
    const pend = pvPendencias(c).filter((p) => !/aceite do cliente/i.test(p.t));
    if (pend.length) {
      modal({ title: 'Ainda não dá para encerrar', sub: `${c.numero} · faltam ${pend.length} item(ns)`, dialog: true,
        body: `<ul class="pvx-pend static">${pend.map((p) => `<li><span class="pvx-pend-n">${p.step}</span>${esc(p.t)}</li>`).join('')}</ul>`,
        footer: '<button class="btn primary" data-close>Entendi</button>' });
      return;
    }
    const en = c.encerramento || {};
    const card = pvSheet(c, 'Encerrar chamado', 'retorno do cliente', `
      <div class="form-sec">${ic('users')}Retorno do cliente</div>
      <div class="field"><label>O cliente aceitou a solução?</label><select name="aceite">${pvOpt(en.aceite || '', ['', 'Sim', 'Sim, com ressalvas', 'Não', 'Sem retorno do cliente'])}</select></div>
      <div class="field"><label>Satisfação (1 a 5)</label><div class="pvx-stars" id="pvStars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-st="${n}" class="${(en.satisfacao || 0) >= n ? 'on' : ''}">★</button>`).join('')}</div><input type="hidden" name="satisfacao" value="${en.satisfacao || ''}"></div>
      ${field('Comentário do cliente', 'comentario', en.comentario, 'textarea', { full: true })}
      ${field('Data de encerramento', 'data', todayISO(), 'date')}
      ${field('Encerrado por', 'por', pvMe())}`,
      (d) => {
        if (!d.aceite) { toast('Informe o retorno do cliente', 'warn'); return false; }
        if (!d.por) { toast('Informe seu nome', 'warn'); return false; }
        setPvMe(d.por);
        d.satisfacao = Number(d.satisfacao) || 0;
        pvSave(c, { encerramento: d, status: 'encerrado' }, 'Chamado encerrado', `Aceite: ${d.aceite}${d.satisfacao ? ' · satisfação ' + d.satisfacao + '/5' : ''}`);
        toast(`${c.numero} encerrado`); after();
      });
    $$('#pvStars button', card).forEach((b) => (b.onclick = () => { const n = +b.dataset.st; $('[name="satisfacao"]', card).value = n; $$('#pvStars button', card).forEach((x) => x.classList.toggle('on', +x.dataset.st <= n)); }));
  }
  function pvFormCancelar(c, after) {
    pvSheet(c, 'Cancelar chamado', 'o registro é mantido para auditoria', `
      ${field('Motivo do cancelamento', 'motivo', '', 'textarea', { full: true, ph: 'Ex.: aberto em duplicidade, cliente desistiu…' })}`,
      (d) => {
        if (!d.motivo) { toast('Informe o motivo', 'warn'); return false; }
        pvSave(c, { status: 'cancelado', cancelamento: { motivo: d.motivo, em: pvNow(), por: pvMe() } }, 'Chamado cancelado', d.motivo);
        toast('Chamado cancelado', 'info'); after();
      });
  }

  /* ---------- impressão / PDF (relatório do chamado para auditoria) ---------- */
  function pvPrint(c) {
    const t = PV_TIPOS[c.tipo] || PV_TIPOS.reclamacao;
    const tr = c.triagem || {}, ct = c.contencao || {}, at = c.atendimento || {}, rn = c.rnc || {}, vf = c.verificacao || {}, en = c.encerramento || {}, pr = c.produto || {};
    const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v == null || v === '' ? '—' : v)}</td></tr>`;
    const block = (title, rows) => `<h2>${esc(title)}</h2><table>${rows}</table>`;
    const files = (g) => pvAnexos(c, g).map((a) => a.name).join(', ');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(c.numero)}</title><style>
      body{font:12px/1.45 Arial,Helvetica,sans-serif;color:#111;margin:28px}
      header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0b3d6b;padding-bottom:8px;margin-bottom:14px}
      h1{font-size:20px;margin:0;color:#0b3d6b} .sub{color:#555} h2{font-size:13px;margin:18px 0 6px;color:#0b3d6b;text-transform:uppercase;letter-spacing:.05em}
      table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccd;padding:5px 7px;text-align:left;vertical-align:top} th{width:30%;background:#f1f4f8;font-weight:600}
      .tl td{font-size:11px} footer{margin-top:24px;color:#777;font-size:10px;border-top:1px solid #ccd;padding-top:6px}
    </style></head><body>
      <header><div><h1>Chamado de pós-vendas ${esc(c.numero)}</h1><div class="sub">${esc(pvClienteNome(c))} · ${esc(t.label)}</div></div><div class="sub">Status: <b>${esc((PV_STATUS[c.status] || {}).label || c.status)}</b><br>Emitido em ${esc(pvFmtDT(pvNow()))}</div></header>
      ${block('1. Abertura', row('Aberto em / por', pvFmtDT(c.criadoEm) + ' · ' + (c.abertoPor || '')) + row('Canal', c.canal) + row('Prioridade', (PV_PRIO[c.prioridade] || {}).label) + row('Afeta segurança / legal', c.seguranca ? 'Sim' : 'Não') + row('Contato', [(c.contato || {}).nome, (c.contato || {}).info].filter(Boolean).join(' · ')) + row('Local', [(c.local || {}).endereco, (c.local || {}).cidade, (c.local || {}).uf].filter(Boolean).join(' · ')) + row('Data da ocorrência', fmtDate(c.dataOcorrencia)) + row('Descrição', c.descricao) + row('Produto', [pr.codigo, pr.descricao].filter(Boolean).join(' — ')) + row('Lote / série / NF', [pr.lote, pr.serie, pr.nf].filter(Boolean).join(' / ')) + row('Aplicação', pr.aplicacao) + row('Quantidade afetada', pr.quantidade) + row('RNC do cliente', (c.rncCliente || {}).tem ? `Sim ${c.rncCliente.numero || ''} · prazo ${fmtDate(c.rncCliente.prazoResposta)}` : 'Não') + row('Anexos', files('abertura') + (files('rnc_cliente') ? ' · ' + files('rnc_cliente') : '')))}
      ${block('2. Triagem', row('Necessária RNC', tr.rnc ? PV_RNC[tr.rnc].label : 'Não triado') + row('Justificativa', tr.justificativa) + row('Responsável', tr.responsavel) + row('Procedência', tr.procedencia) + row('Prazo', fmtDate(c.prazo)) + row('Triado por / em', [tr.por, pvFmtDT(tr.em)].filter(Boolean).join(' · ')))}
      ${block('3. Tratativa', row('Contenção', ct.acoes) + row('Contenção — onde / qtd / data', [(ct.locais || []).join(', '), ct.qtd, fmtDate(ct.data)].filter(Boolean).join(' · ')) + row('Atendimento', [at.modalidade, at.tecnico, fmtDate(at.data)].filter(Boolean).join(' · ')) + row('O que foi feito', at.descricao) + row('Resultado', at.resultado) + row('Peças', at.pecas) + row('Sem defeito (NTF)', at.ntf ? 'Sim' : 'Não') + row('Garantia', at.garantia) + row('Custo total', pvMoney(at.custoTotal)))}
      ${block('4. RNC', pvPrecisaRnc(c) ? row('Situação', (PV_RNC_ST[pvRncStatus(c)] || {}).label) + row('Nº', rn.numero) + row('Responsável', rn.responsavel) + row('Causa raiz', rn.causa) + row('Ação corretiva', rn.acao) + row('Resposta ao cliente', fmtDate(rn.respostaEm)) + row('Arquivos', [files('rnc'), files('d8')].filter(Boolean).join(' · ')) : row('Situação', 'Não aplicável'))}
      ${block('5. Verificação e encerramento', row('Eficácia', [fmtDate(vf.data), vf.eficaz].filter((x) => x && x !== '—').join(' · ')) + row('Evidência', vf.evidencia) + row('Documentos atualizados', (vf.docs || []).join(', ')) + row('Lições aprendidas', vf.licoes) + row('Aceite do cliente', en.aceite) + row('Satisfação', en.satisfacao ? en.satisfacao + ' / 5' : '') + row('Encerrado em / por', [fmtDate(en.data), en.por].filter((x) => x && x !== '—').join(' · ')))}
      <h2>Histórico</h2><table class="tl">${(c.historico || []).map((h) => `<tr><th>${esc(pvFmtDT(h.at))} · ${esc(h.by || '')}</th><td><b>${esc(h.acao)}</b>${h.det ? ' — ' + esc(h.det) : ''}</td></tr>`).join('')}</table>
      <footer>Convergas · Control Center — Pós-Vendas. Registro mantido conforme IATF 16949 (7.5, 8.7, 10.2) e ISO 9001 (7.5, 8.2, 10.2).</footer>
    </body></html>`;
    const win = window.open('', '_blank');
    if (!win) { toast('Permita pop-ups para imprimir', 'warn'); return; }
    win.document.open(); win.document.write(html); win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch (e) {} }, 300);
  }

  /* =========================== FLUXO & NORMAS =========================== */
  PAGES['pv-guia'] = () => {
    pageShell('Pós-Vendas', 'Fluxo & Normas', 'Como um chamado anda — e onde cada requisito da IATF 16949 e da ISO 9001 é atendido no sistema.', '');
    const flow = [
      ['1', 'Abertura', 'Comercial', 'Registra cliente, contato, local, produto (lote/série/NF), descrição e evidências. Se o cliente mandou RNC, anexa e informa o prazo de resposta.'],
      ['2', 'Triagem', 'Pós-vendas / responsável', 'Decide: o chamado precisa de RNC? (do cliente, interna, ou não). Se não, a justificativa é obrigatória. Define responsável, prazo e procedência.'],
      ['3', 'Tratativa', 'Responsável + técnico', 'Contenção imediata quando há RNC (estoque, trânsito, cliente). Atendimento: o que foi feito, peças, resultado, garantia, custos, análise NTF.'],
      ['4', 'RNC', 'Qualidade', 'Só quando necessária. A Qualidade abre/trata a RNC no sistema dela e anexa aqui o arquivo e o 8D. Registra causa, ação corretiva e a data de resposta ao cliente.'],
      ['5', 'Encerramento', 'Responsável + Qualidade', 'Verificação de eficácia (com RNC), documentos atualizados (FMEA, plano de controle), retorno e satisfação do cliente. O sistema bloqueia o encerramento enquanto houver pendências.'],
    ];
    const reqs = [
      ['IATF 10.2.6', 'Reclamações de clientes e análise de falhas em campo', 'Tipos "Reclamação" e "Falha em campo", análise registrada no atendimento, inclusive peças sem defeito (NTF).'],
      ['IATF 10.2.5', 'Sistema de gestão de garantia', 'Campo garantia (procedente / improcedente / cortesia), custos e indicador de custo no Painel.'],
      ['IATF 10.2.3 · 10.2.4', 'Solução de problemas e à prova de erro', 'Anexo do 8D, causa raiz, ação corretiva e checklist de documentos atualizados (FMEA, plano de controle, poka-yoke).'],
      ['ISO 10.2 · IATF 10.2.1', 'Não conformidade e ação corretiva', 'Decisão de RNC na triagem, contenção, ação corretiva e verificação de eficácia obrigatória para encerrar.'],
      ['IATF 8.7 · 4.4.1.2', 'Saída não conforme e segurança do produto', 'Contenção (onde, quantidade segregada) e marcação "afeta segurança/legal", que torna o chamado crítico.'],
      ['ISO 8.2.1 · IATF 8.2.1.1', 'Comunicação com o cliente', 'Canal de entrada, contato, prazo de resposta exigido, data de resposta e comentários no histórico.'],
      ['IATF 4.3.2', 'Requisitos específicos do cliente (CSR)', 'Cadastro de clientes com prazo de resposta, exigência de 8D e requisitos próprios exibidos na abertura.'],
      ['ISO 9.1.2', 'Satisfação do cliente', 'Aceite e nota de satisfação no encerramento; média, prazo e reincidência no Painel.'],
      ['ISO 7.5 · IATF 7.5.3.2.1', 'Informação documentada e retenção', 'Histórico automático (quem, quando, o quê), anexos e relatório para impressão/PDF. Cancelar mantém o registro.'],
      ['ISO 8.5.2', 'Identificação e rastreabilidade', 'Código, lote, nº de série, nota fiscal, data de fabricação e aplicação do produto.'],
    ];
    const w = document.createElement('div');
    w.innerHTML = `
      <div class="section-head"><h2><span class="sh-ico">${ic('list')}</span>O fluxo do chamado</h2></div>
      <div class="pvx-flow">${flow.map(([n, t, who, d]) => `<div class="pvx-fl"><span class="pvx-fl-n">${n}</span><b>${t}</b><span class="pvx-fl-who">${who}</span><p>${d}</p></div>`).join('')}</div>
      <div class="pvx-branch panel panel-pad">
        <b>As três saídas da triagem</b>
        <div class="pvx-br3">
          <div><span class="badge warn plain">RNC do cliente</span><p>Cliente enviou RNC. Qualidade trata, anexa a RNC/8D e registra a data de resposta ao cliente.</p></div>
          <div><span class="badge info plain">RNC interna</span><p>Problema de qualidade nosso. Qualidade abre a RNC no sistema dela e anexa no chamado.</p></div>
          <div><span class="badge neutral plain">Sem RNC</span><p>Correção em campo, dúvida, logística. Fica só no Pós-vendas — com justificativa registrada.</p></div>
        </div>
      </div>
      <div class="section-head"><h2><span class="sh-ico">${ic('award')}</span>Requisitos atendidos</h2></div>
      <div class="tbl-wrap"><table class="data"><thead><tr><th>Requisito</th><th>Assunto</th><th>Onde está no sistema</th></tr></thead><tbody>${reqs.map(([r, a, o]) => `<tr><td><span class="badge info plain">${esc(r)}</span></td><td><b>${esc(a)}</b></td><td>${esc(o)}</td></tr>`).join('')}</tbody></table></div>
      <p class="pvx-muted" style="margin-top:12px">Referência de apoio. A interpretação final dos requisitos é da Qualidade e do auditor.</p>`;
    view.appendChild(w); Icons.apply(w);
  };

  /* =====================================================================
     MANUTENÇÃO — Ordens de Serviço + Equipamentos
     ===================================================================== */
  const EQ_STATUS = { operante: { cls: 'ok', label: 'Operando' }, manutencao: { cls: 'warn', label: 'Em manutenção' }, parado: { cls: 'danger', label: 'Parado' }, desativado: { cls: 'neutral', label: 'Desativado' } };
  const EQ_CATS = ['Compressor', 'Prensa', 'Serra', 'Furadeira', 'Soldadora', 'Ponte Rolante', 'Bancada de Testes', 'Empilhadeira', 'Ferramenta Especial'];
  const OS_TYPE = { corretiva: 'Corretiva', preventiva: 'Preventiva', inspecao: 'Inspeção' };
  const RESULT = { resolvido: 'Resolvido', parcial: 'Resolvido parcialmente', nova_intervencao: 'Necessita nova intervenção', substituicao: 'Substituição recomendada' };
  // Tipos de ORDEM (Interna / Externa / Terceirizada / Emergencial) — o wizard adapta os campos conforme o tipo
  const ORDER_TYPE = {
    interna: { label: 'Interna', icon: 'cpu', cls: 'info', desc: 'Manutenção de máquina/ativo interno' },
    externa: { label: 'Externa', icon: 'pin', cls: 'ok', desc: 'Serviço no cliente / em campo' },
    terceirizada: { label: 'Terceirizada', icon: 'users', cls: 'warn', desc: 'Executada por prestador externo' },
    emergencial: { label: 'Emergencial', icon: 'alert', cls: 'danger', desc: 'Corretiva urgente / parada não programada' },
  };
  const orderTypeOf = (o) => ORDER_TYPE[o.orderType] ? o.orderType : 'interna';
  const otBadge = (o) => { const m = ORDER_TYPE[orderTypeOf(o)]; return `<span class="badge ${m.cls}">${esc(m.label)}</span>`; };
  const PRIO = { baixa: { cls: 'neutral', label: 'Baixa' }, media: { cls: 'info', label: 'Média' }, alta: { cls: 'warn', label: 'Alta' }, urgente: { cls: 'danger', label: 'Urgente' } };
  const OC_STATUS = { pendente: { cls: 'neutral', label: 'Pendente' }, ordem_gerada: { cls: 'info', label: 'Ordem gerada' }, em_execucao: { cls: 'warn', label: 'Em execução' }, finalizada: { cls: 'ok', label: 'Finalizada' } };
  const OS_STATUS = { pendente: { cls: 'info', label: 'Agendada' }, andamento: { cls: 'warn', label: 'Em andamento' }, finalizada: { cls: 'ok', label: 'Realizada' } };
  const PREV_STATUS = { aberta: { cls: 'info', label: 'Programada' }, andamento: { cls: 'warn', label: 'Em execução' }, concluida: { cls: 'ok', label: 'Concluída' }, cancelada: { cls: 'neutral', label: 'Cancelada' } };

  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + (Number(n) || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const daysBetween = (a, b) => { const d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00'); return Math.abs(Math.round((d2 - d1) / 86400000)); };
  const eqName = (id) => { const e = Store.find('equipments', id); return e ? e.name : ''; };
  const equipDisplay = (o) => o.equipmentId ? (eqName(o.equipmentId) || '—') : (o.equipName || '—');
  const osNumberOf = (id) => { const o = Store.find('serviceOrders', id); return o ? o.number : ''; };
  const osOpenFor = (eqId) => Store.get('serviceOrders').filter((o) => o.equipmentId === eqId && (o.kind === 'os' || o.kind === 'preventiva') && o.status !== 'finalizada' && o.status !== 'concluida' && o.status !== 'cancelada').length;
  function nextNum(prefix) {
    const nums = Store.get('serviceOrders').filter((o) => (o.number || '').startsWith(prefix)).map((o) => parseInt(String(o.number).replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
    return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, '0');
  }
  const kindOf = (o) => o.kind || 'os';
  const KIND_LABEL = { ocorrencia: 'Ocorrência', os: 'Ordem de Serviço', preventiva: 'Preventiva' };
  const isOverdue = (o) => o.status !== 'concluida' && o.status !== 'finalizada' && o.status !== 'cancelada' && o.dueDate && o.dueDate < todayISO();
  const statusMapFor = (o) => o.kind === 'ocorrencia' ? OC_STATUS : (o.kind === 'preventiva' ? PREV_STATUS : OS_STATUS);
  const stBadge = (o) => { const overdue = o.kind === 'preventiva' && isOverdue(o); const m = statusMapFor(o)[o.status] || { cls: 'plain', label: o.status || '—' }; return `<span class="badge ${overdue ? 'danger' : m.cls}">${esc(overdue ? 'Atrasada' : m.label)}</span>`; };
  const prioBadge = (p) => `<span class="badge ${(PRIO[p] || {}).cls || 'plain'}">${esc((PRIO[p] || {}).label || p || '—')}</span>`;
  const eqBadge = (s) => `<span class="badge ${(EQ_STATUS[s] || {}).cls || 'plain'}">${esc((EQ_STATUS[s] || {}).label || s || '—')}</span>`;
  const qbtnM = (icon, title, sub, route, action) => `<button class="qa" data-qa="${action || ''}" data-route-go="${route}"><span class="qa-ico">${ic(icon)}</span><span class="qa-tx"><b>${title}</b><span>${sub}</span></span></button>`;
  const mstat = (icon, val, label, tone, frac) => {
    const s = String(val), isNum = /^\d+$/.test(s);
    const f = isNum ? Math.max(0, Math.min(1, frac == null ? 0 : frac)) : 0;
    const ring = isNum
      ? `<div class="mstat-ring"><svg class="mstat-svg" viewBox="0 0 44 44" aria-hidden="true"><circle class="mr-track" cx="22" cy="22" r="19"/><circle class="mr-arc" cx="22" cy="22" r="19" data-p="${f}"/></svg><span class="mstat-v" data-count="${esc(s)}">0</span></div>`
      : `<div class="mstat-ring plain"><span class="mstat-v">${esc(s)}</span></div>`;
    return `<div class="mstat${tone ? ' t-' + tone : ''}">${ring}<span class="mstat-k">${ic(icon)}${esc(label)}</span></div>`;
  };
  const frac = (n, d) => (d > 0 ? n / d : 0);
  function animateStats(container) {
    if (!container) return;
    const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const C = 2 * Math.PI * 19;
    $$('.mr-arc', container).forEach((arc) => {
      const p = Math.max(0, Math.min(1, parseFloat(arc.dataset.p) || 0)), target = C * (1 - p);
      if (rm) { arc.style.strokeDashoffset = target; return; }
      arc.style.strokeDashoffset = C;
      requestAnimationFrame(() => requestAnimationFrame(() => { arc.style.strokeDashoffset = target; }));
    });
    $$('.mstat-v[data-count]', container).forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      if (isNaN(target)) { el.textContent = el.dataset.count; return; }
      if (rm || target <= 0) { el.textContent = String(target); return; }
      const dur = 850, t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = String(Math.round(k * target)); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }
  const formSec = (icon, t) => `<div class="form-sec">${ic(icon)}${esc(t)}</div>`;
  const cloudFileUrl = (entity, id, field, name) => (window.Cloud && window.Cloud.ok && name) ? window.Cloud.filePublicUrl(entity, id, field, name) : '';
  async function uploadCloudFile(entity, id, field, file) { if (!(window.Cloud && window.Cloud.ok)) { toast('Nuvem indisponível — arquivo não enviado', 'warn'); return false; } try { await window.Cloud.uploadFile(entity, id, field, file); return true; } catch (e) { toast('Falha ao enviar arquivo', 'warn'); return false; } }
  const osFact = (icon, label, val) => `<div class="os-fact"><span class="of-ico">${ic(icon)}</span><div><span class="of-k">${esc(label)}</span><span class="of-v">${esc(val || '—')}</span></div></div>`;
  function durationText(o) { if (!o.openDate || !o.closeDate) return ''; const a = new Date(o.openDate + 'T' + (o.openTime || '00:00')), b = new Date(o.closeDate + 'T' + (o.closeTime || '00:00')); let min = Math.round((b - a) / 60000); if (isNaN(min) || min < 0) return ''; const dd = Math.floor(min / 1440); min -= dd * 1440; const hh = Math.floor(min / 60), mm = min % 60; return [dd ? dd + 'd' : '', hh ? hh + 'h' : '', (mm || (!dd && !hh)) ? mm + 'min' : ''].filter(Boolean).join(' '); }
  // curto resumo de texto p/ card
  const short = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n) + '…' : t; };
  const osTitleOf = (o) => orderTypeOf(o) === 'externa' ? (o.clientName || o.vehicle || 'Atendimento externo') : equipDisplay(o);
  const osCard = (o) => `<div class="iv-card" data-open="${o.id}" data-kind="os" title="Ver ${esc(o.number || '')}">
      <div class="iv-top"><span class="iv-num mono">${esc(o.number || '—')}</span>${stBadge(o)}</div>
      <h3 class="iv-title">${esc(osTitleOf(o))}</h3>
      <div class="iv-machine">${ic('file')}<span>${esc(short(o.description, 52) || '—')}</span></div>
      <div class="iv-type">${otBadge(o)}</div>
      <div class="iv-foot">${prioBadge(o.priority)}<span class="iv-date">${ic('calendar')}${fmtDate(o.openDate) || '—'}</span></div>
    </div>`;
  const prevCard = (o) => `<div class="iv-card" data-open="${o.id}" data-kind="preventiva" title="Ver ${esc(o.number || '')}">
      <div class="iv-top"><span class="iv-num mono">${esc(o.number || '—')}</span>${stBadge(o)}</div>
      <h3 class="iv-title">${esc(o.title || '—')}</h3>
      <div class="iv-machine">${ic('cpu')}<span>${esc(equipDisplay(o))}</span></div>
      <div class="iv-foot">${prioBadge(o.priority)}<span class="iv-date">${ic('calendar')}${fmtDate(o.dueDate) || '—'}</span></div>
      ${o.assignee ? `<div class="iv-who">${ic('wrench')}${esc(o.assignee)}</div>` : ''}
    </div>`;
  // versão em LINHA (modo lista — economiza espaço com muito histórico)
  const osRow = (o) => `<tr class="tr-click" data-open="${o.id}" data-kind="os" title="Ver ${esc(o.number || '')}">
      <td><span class="mono">${esc(o.number || '—')}</span></td>
      <td><div class="cell-main">${esc(osTitleOf(o))} ${otBadge(o)}</div><div class="cell-sub hide-sm">${esc(short(o.description, 70) || '—')}</div></td>
      <td>${prioBadge(o.priority)}</td>
      <td>${stBadge(o)}</td>
      <td class="hide-sm"><span class="cell-sub">${fmtDate(o.openDate) || '—'}</span></td>
      <td class="hide-sm"><span class="cell-sub">${o.status === 'finalizada' ? (durationText(o) || '—') : (o.assignee ? esc(o.assignee) : '—')}</span></td>
    </tr>`;

  /* ---------- Dashboard / Indicadores ---------- */
  const brl = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseBRL = (c) => { const n = parseFloat(String(c).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const hoursOf = (o) => { if (!o.openDate || !o.closeDate) return NaN; const a = new Date(o.openDate + 'T' + (o.openTime || '00:00')), b = new Date(o.closeDate + 'T' + (o.closeTime || '00:00')); const h = (b - a) / 3600000; return (isNaN(h) || h < 0) ? NaN : h; };
  const anyCard = (o) => o.kind === 'preventiva' ? prevCard(o) : osCard(o);
  function openRecord(o) { if (!o) return; if (o.kind === 'preventiva') viewPreventiva(o); else viewOS(o); }
  function bindIvCards(container) {
    $$('.iv-card', container).forEach((c) => (c.onclick = () => openRecord(Store.find('serviceOrders', c.dataset.open))));
  }
  PAGES['manutencao-home'] = () => {
    const all = Store.get('serviceOrders'), eq = Store.get('equipments'), t = todayISO();
    const oss = all.filter((o) => o.kind === 'os'), prevs = all.filter((o) => o.kind === 'preventiva');
    const done = oss.filter((o) => o.status === 'finalizada');
    const backlog = oss.filter((o) => o.status !== 'finalizada').length;
    const atrasadas = prevs.filter(isOverdue).length;
    const durs = done.map(hoursOf).filter((n) => !isNaN(n));
    const mttr = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null;
    const win = 90, machines = Math.max(1, eq.length);
    const failWin = done.filter((o) => o.openDate && daysBetween(o.openDate, t) <= win).length;
    const mtbf = failWin ? (win * machines) / failWin : null;
    const downWin = done.filter((o) => o.closeDate && daysBetween(o.closeDate, t) <= win).map(hoursOf).filter((n) => !isNaN(n)).reduce((a, b) => a + b, 0);
    const disp = Math.max(0, Math.min(100, 100 * (1 - (downWin / (machines * win * 24)))));
    const donePrev = prevs.filter((o) => o.status === 'concluida');
    const pctPrev = donePrev.length ? Math.round(100 * donePrev.filter((o) => o.dueDate && o.closeDate && o.closeDate <= o.dueDate).length / donePrev.length) : null;
    let custo = 0; done.forEach((o) => (o.usedParts || []).forEach((u) => { const p = Store.find('parts', u.partId); if (p) custo += (Number(u.qty) || 0) * parseBRL(p.cost); }));
    const T = Store.get('settings').mntTargets || { disp: 95, mttr: 4, prev: 90 };
    const kpi = (icon, val, label, meta, tone) => `<div class="ind-card${tone ? ' t-' + tone : ''}"><div class="ind-head"><span class="ind-ico">${ic(icon)}</span><span class="ind-label">${esc(label)}</span></div><div class="ind-val">${esc(val)}</div><div class="ind-foot">${meta ? `<span class="ind-pill">${esc(meta)}</span>` : ''}</div></div>`;
    view.innerHTML = `
      <div class="page-head"><div class="page-title"><span class="eyebrow">Manutenção</span><h1>Indicadores</h1><p>Gestão da manutenção dos ativos.</p></div>
        <div class="page-actions"><button class="btn" id="mMetas">${ic('settings')}Metas</button><button class="btn primary" id="newOc">${ic('plus')}Nova Ordem de Serviço</button></div></div>
      <div class="section-head"><h2><span class="sh-ico">${ic('activity')}</span>Desempenho da manutenção</h2><span class="badge plain">Últimos 90 dias</span></div>
      <div class="ind-grid">
        ${kpi('activity', disp.toFixed(1) + '%', 'Disponibilidade', 'Meta ' + T.disp + '%', disp >= T.disp ? 'ok' : (disp >= T.disp - 5 ? 'warn' : 'danger'))}
        ${kpi('clock', mttr == null ? '—' : mttr.toFixed(1) + 'h', 'MTTR · tempo de reparo', 'Meta ≤ ' + T.mttr + 'h', mttr == null ? '' : (mttr <= T.mttr ? 'ok' : 'warn'))}
        ${kpi('refresh', mtbf == null ? '—' : Math.round(mtbf) + 'd', 'MTBF · entre falhas', 'Estimado', '')}
        ${kpi('check', pctPrev == null ? '—' : pctPrev + '%', 'Preventivas no prazo', 'Meta ' + T.prev + '%', pctPrev == null ? '' : (pctPrev >= T.prev ? 'ok' : 'warn'))}
      </div>
      <div class="section-head"><h2><span class="sh-ico">${ic('clipboard')}</span>Operação</h2></div>
      <div class="ind-grid">
        ${kpi('clipboard', backlog, 'Ordens em aberto', backlog ? 'Requer ação' : 'Tudo em dia', backlog ? 'warn' : 'ok')}
        ${kpi('alert', atrasadas, 'Preventivas atrasadas', atrasadas ? 'Reprogramar' : 'Nenhuma', atrasadas ? 'danger' : 'ok')}
      </div>
      <div class="section-head"><h2><span class="sh-ico">${ic('activity')}</span>Manutenções por mês</h2></div>
      <div id="mntChart"></div>
      <div class="section-head"><h2><span class="sh-ico">${ic('clipboard')}</span>Atividade recente</h2></div>
      <div id="recentIv"></div>`;
    Icons.apply(view);
    const recent = all.filter((o) => o.kind === 'os' || o.kind === 'preventiva').sort((a, b) => (b.openDate || b.dueDate || '').localeCompare(a.openDate || a.dueDate || '')).slice(0, 6);
    $('#recentIv').innerHTML = recent.length ? `<div class="iv-grid">${recent.map(anyCard).join('')}</div>` : emptyState('clipboard', 'Nada por aqui', 'Abra a primeira ordem de serviço.');
    Icons.apply($('#recentIv')); bindIvCards($('#recentIv'));
    $('#newOc').onclick = () => formOS();
    $('#mMetas').onclick = () => formMetas();
    const chartState = { year: parseInt(todayISO().slice(0, 4), 10) };
    function renderChart() {
      const host = $('#mntChart'); if (!host) return;
      const Y = chartState.year;
      const months = Array.from({ length: 12 }, (_, m) => {
        const key = Y + '-' + String(m + 1).padStart(2, '0');
        const list = Store.get('serviceOrders').filter((o) => o.kind === 'os' && (o.openDate || '').startsWith(key));
        return { m, total: list.length, done: list.filter((o) => o.status === 'finalizada').length };
      });
      const max = Math.max(1, ...months.map((x) => x.total)), totalYear = months.reduce((s, x) => s + x.total, 0);
      host.innerHTML = `<div class="chart-card">
        <div class="chart-head"><div class="chart-tt">${ic('file')}<b>Ordens de Serviço</b><span class="chart-sub">${totalYear} no ano</span></div>
          <div class="chart-nav"><button class="icon-btn cn-btn" id="cyPrev">${ic('chevron')}</button><b class="cy-label">${Y}</b><button class="icon-btn cn-btn" id="cyNext">${ic('chevron')}</button></div></div>
        <div class="chart-bars">${months.map((x) => {
          const h = x.total ? Math.max(6, Math.round((x.total / max) * 100)) : 0, dh = x.total ? Math.round((x.done / x.total) * 100) : 0;
          return `<button class="cbar${x.total ? '' : ' empty'}" data-m="${x.m}" title="${MES_PT[x.m]} ${Y} · ${x.total} OS${x.total ? ` (${x.done} realizadas)` : ''}"><span class="cbar-val">${x.total || ''}</span><span class="cbar-track"><span class="cbar-fill" style="height:${h}%;animation-delay:${x.m * 35}ms"><span class="cbar-done" style="height:${dh}%"></span></span></span><span class="cbar-lbl">${MES_PT[x.m].slice(0, 3)}</span></button>`;
        }).join('')}</div>
        <div class="chart-legend"><span class="cl-item"><span class="cl-dot done"></span>Realizadas</span><span class="cl-item"><span class="cl-dot open"></span>Em aberto</span><span class="chart-hint">Clique em um mês para ver as ordens</span></div>
      </div>`;
      Icons.apply(host);
      $('#cyPrev').onclick = () => { chartState.year--; renderChart(); };
      $('#cyNext').onclick = () => { chartState.year++; renderChart(); };
      $$('.cbar', host).forEach((b) => (b.onclick = () => monthDetail(chartState.year, +b.dataset.m)));
    }
    renderChart();
  };
  function monthDetail(year, m) {
    const key = year + '-' + String(m + 1).padStart(2, '0');
    const os = Store.get('serviceOrders').filter((o) => o.kind === 'os' && (o.openDate || '').startsWith(key)).sort((a, b) => (b.openDate || '').localeCompare(a.openDate || ''));
    const done = os.filter((o) => o.status === 'finalizada').length;
    const card = modal({
      wide: true, title: `${MES_PT[m]} de ${year}`, sub: `${os.length} ordem(ns) de serviço · ${done} realizada(s)`,
      body: os.length ? `<div class="iv-grid">${os.map(osCard).join('')}</div>` : emptyState('clipboard', 'Sem ordens neste mês', `Nenhuma OS aberta em ${MES_PT[m]} de ${year}.`),
      footer: `<button class="btn ghost" data-close>Fechar</button>`,
    });
    Icons.apply(card);
    $$('.iv-card', card).forEach((c) => (c.onclick = () => { closeModal(); viewOS(Store.find('serviceOrders', c.dataset.open)); }));
  }
  function formMetas() {
    const T = Store.get('settings').mntTargets || { disp: 95, mttr: 4, prev: 90 };
    const card = modal({
      title: 'Metas de manutenção', sub: 'Objetivos e metas dos indicadores',
      body: `<div class="form-grid">
        ${field('Disponibilidade mínima (%)', 'disp', String(T.disp), 'text', { ph: '95' })}
        ${field('MTTR máximo (horas)', 'mttr', String(T.mttr), 'text', { ph: '4' })}
        ${field('Preventivas no prazo (%)', 'prev', String(T.prev), 'text', { ph: '90' })}
      </div>`, footer: submitFooter(true),
    });
    $('#saveBtn', card).onclick = () => { const d = readForm(card); Store.setSetting('mntTargets', { disp: parseFloat(d.disp) || 95, mttr: parseFloat(d.mttr) || 4, prev: parseFloat(d.prev) || 90 }); toast('Metas salvas', 'ok'); closeModal(); if (PAGES[currentRoute]) refreshPage(); };
  }

  /* ---------- Listas (Ordens de Serviço / Preventivas) ---------- */
  function mntListPage(cfg) {
    pageShell(cfg.title, cfg.title, cfg.sub, cfg.add ? `<button class="btn primary" id="addBtn">${ic('plus')}${cfg.add}</button>` : '');
    const all = Store.get('serviceOrders').filter(cfg.filter);
    const head = document.createElement('div'); head.className = 'mstat-grid'; head.style.marginBottom = '20px';
    head.innerHTML = cfg.stats(all); view.appendChild(head); Icons.apply(head);
    const state = { status: 'all', q: '' };
    const tb = document.createElement('div'); tb.className = 'toolbar';
    tb.innerHTML = `<div class="filter-input">${ic('search')}<input id="flt" placeholder="Filtrar…"></div><div class="seg" id="stSeg"><button data-s="all" class="on">Todas</button>${cfg.statuses.map(([k, l]) => `<button data-s="${k}">${esc(l)}</button>`).join('')}</div>`;
    const holder = document.createElement('div'); view.appendChild(tb); view.appendChild(holder); Icons.apply(tb);
    function render() {
      let list = all.filter((o) => state.status === 'all' || o.status === state.status);
      if (state.q) { const q = state.q.toLowerCase(); list = list.filter((o) => JSON.stringify(o).toLowerCase().includes(q) || (equipDisplay(o) || '').toLowerCase().includes(q)); }
      list = list.slice().sort((a, b) => (b.openDate || b.dueDate || '').localeCompare(a.openDate || a.dueDate || ''));
      holder.innerHTML = '';
      if (!list.length) { holder.innerHTML = emptyState(cfg.icon || 'clipboard', cfg.empty, cfg.emptySub); Icons.apply(holder); return; }
      if (cfg.list) { // modo LISTA (tabela) — melhor com muito histórico
        const tw = document.createElement('div'); tw.className = 'tbl-wrap';
        tw.innerHTML = `<table class="data"><thead><tr>${cfg.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${list.map(cfg.row).join('')}</tbody></table>`;
        holder.appendChild(tw); Icons.apply(tw);
        $$('tr[data-open]', tw).forEach((r) => (r.onclick = (e) => { if (e.target.closest('button')) return; openRecord(Store.find('serviceOrders', r.dataset.open)); }));
        return;
      }
      const grid = document.createElement('div'); grid.className = 'iv-grid';
      grid.innerHTML = list.map(cfg.card).join('');
      holder.appendChild(grid); Icons.apply(grid); bindIvCards(grid);
    }
    $('#flt', tb).oninput = (e) => { state.q = e.target.value; render(); };
    $$('#stSeg button', tb).forEach((b) => (b.onclick = () => { state.status = b.dataset.s; $$('#stSeg button', tb).forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(); }));
    render();
    if (cfg.add) $('#addBtn').onclick = cfg.addFn;
  }
  PAGES['mnt-os'] = () => mntListPage({
    title: 'Ordens de Serviço', sub: 'Abertura, execução e finalização das manutenções.', add: 'Nova Ordem de Serviço', addFn: () => formOS(), filter: (o) => o.kind === 'os', card: osCard, list: true, row: osRow, head: ['Nº', 'Equipamento / descrição', 'Prioridade', 'Status', 'Abertura', 'Duração / Resp.'], icon: 'file', empty: 'Nenhuma ordem de serviço', emptySub: 'Abra a primeira ordem de serviço.',
    statuses: [['pendente', 'Agendada'], ['andamento', 'Em andamento'], ['finalizada', 'Realizada']],
    stats: (all) => { const st = (k) => all.filter((o) => o.status === k).length, n = all.length; return `${mstat('clipboard', n, 'Total', '', 1)}${mstat('file', st('pendente'), 'Agendadas', st('pendente') ? 'info' : '', frac(st('pendente'), n))}${mstat('wrench', st('andamento'), 'Em andamento', st('andamento') ? 'warn' : '', frac(st('andamento'), n))}${mstat('check', st('finalizada'), 'Realizadas', st('finalizada') ? 'ok' : '', frac(st('finalizada'), n))}`; },
  });
  PAGES['mnt-prev'] = () => mntListPage({
    title: 'Preventivas', sub: 'Manutenção planejada e recorrente (ex.: anual).', add: 'Nova preventiva', addFn: () => formPreventiva(), filter: (o) => o.kind === 'preventiva', card: prevCard, icon: 'refresh', empty: 'Nenhuma preventiva', emptySub: 'Programe a primeira preventiva.',
    statuses: [['aberta', 'Programada'], ['andamento', 'Em execução'], ['concluida', 'Concluída']],
    stats: (all) => { const st = (k) => all.filter((o) => o.status === k).length, n = all.length, atr = all.filter(isOverdue).length; return `${mstat('clipboard', n, 'Total', '', 1)}${mstat('flash', st('aberta'), 'Programadas', st('aberta') ? 'info' : '', frac(st('aberta'), n))}${mstat('alert', atr, 'Atrasadas', atr ? 'danger' : 'ok', frac(atr, n))}${mstat('check', st('concluida'), 'Concluídas', st('concluida') ? 'ok' : '', frac(st('concluida'), n))}`; },
  });

  /* ---- Abertura de Ordem de Serviço (intake + registro num só passo) ---- */
  function formOS(o, after) {
    o = o || {}; const editing = !!o.id;
    const eqs = Store.get('equipments').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const noEquip = editing && !o.equipmentId && !!o.equipName;
    const eqOpts = [{ v: '', t: '— selecione a máquina —' }].concat(eqs.map((e) => ({ v: e.id, t: e.name + (e.tag ? ` (${e.tag})` : '') }))).concat([{ v: '__none__', t: 'Equipamento não cadastrado' }]);
    const localSet = new Set(['Produção', 'Almoxarifado', 'Manutenção', 'Engenharia', 'Expedição', 'Escritório']);
    Store.get('equipments').forEach((e) => { if (e.sector) localSet.add(e.sector); });
    Store.get('serviceOrders').forEach((s) => { if (s.local) localSet.add(s.local); });
    const team = Store.get('team').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const regInTeam = team.some((u) => u.name === o.regBy);
    const regByInit = !o.regBy ? '' : (regInTeam ? o.regBy : '__outro__');
    const regByOpts = [{ v: '', t: '— selecione —' }].concat(team.map((u) => ({ v: u.name, t: u.name + (u.sector ? ` · ${u.sector}` : '') }))).concat([{ v: '__outro__', t: 'Outro (digitar)' }]);
    const curPhoto = editing ? cloudFileUrl('serviceOrders', o.id, 'photo', o.photoName) : '';
    const curType = orderTypeOf(o);
    let pickedPhoto = null;

    const typePills = Object.entries(ORDER_TYPE).map(([v, m]) => `<button type="button" class="pill pill-type${curType === v ? ' on' : ''}" data-val="${v}">${ic(m.icon)}${m.label}</button>`).join('');
    const prioPills = [['baixa', 'Baixa', 'neutral'], ['media', 'Média', 'info'], ['alta', 'Alta', 'warn'], ['urgente', 'Urgente', 'danger']]
      .map(([v, t, cls]) => `<button type="button" class="pill pill-${cls}${(o.priority || 'media') === v ? ' on' : ''}" data-val="${v}">${t}</button>`).join('');

    // Etapa 2 — sugestões de segurança (checklist)
    const SAFETY = ['Usar EPI', 'Bloqueio (LOTO)', 'Isolar local', 'Desenergizar', 'Aliviar pressão', 'Trabalho a quente', 'Sinalizar área'];
    const chosenSafety = new Set(o.safetyItems || []);
    const safetyChips = SAFETY.map((s) => `<label class="chk-chip${chosenSafety.has(s) ? ' on' : ''}"><input type="checkbox" value="${esc(s)}" ${chosenSafety.has(s) ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('');

    // Etapa 3 — materiais necessários (planejados, sem baixa de estoque)
    let matRows = (o.plannedMaterials || []).map((m) => ({ name: m.name || '', qty: m.qty || '', unit: m.unit || 'un' }));
    if (!matRows.length) matRows = [{ name: '', qty: '', unit: 'un' }];
    const matRowsHtml = () => matRows.map((m, i) => `<div class="part-row plan" data-i="${i}"><input class="pm-name" placeholder="Material" value="${esc(m.name)}"><input class="pm-qty" placeholder="Qtd" value="${esc(String(m.qty))}"><input class="pm-unit" placeholder="Un" value="${esc(m.unit || 'un')}"><button class="mini-btn danger pm-del" type="button">${ic('trash')}</button></div>`).join('');

    // campos que dependem do tipo (Etapa 1)
    const equipmentBlock = () => `
        ${field('Equipamento', 'equipmentId', noEquip ? '__none__' : (o.equipmentId || ''), 'select', { full: true, options: eqOpts })}
        <div class="field full" id="equipMeta" style="display:none"></div>
        <div class="field full" id="equipNameWrap" style="${noEquip ? '' : 'display:none'}">${field('Nome do equipamento (não cadastrado)', 'equipName', o.equipName, 'text', { full: true, ph: 'Digite o equipamento' })}</div>
        <div class="field full"><label>Local</label><input name="local" list="ocLocalList" value="${esc(o.local || '')}" placeholder="Ex: Produção, Almoxarifado"><datalist id="ocLocalList">${Array.from(localSet).map((s) => `<option value="${esc(s)}"></option>`).join('')}</datalist></div>`;
    const typeFieldsHTML = (t) => {
      if (t === 'externa') return `
        ${field('Cliente', 'clientName', o.clientName, 'text', { full: true, ph: 'Nome do cliente / empresa' })}
        ${field('Telefone', 'clientPhone', o.clientPhone, 'text', { ph: '(19) 90000-0000' })}
        ${field('Veículo', 'vehicle', o.vehicle, 'text', { ph: 'Modelo / ano' })}
        ${field('Placa', 'plate', o.plate, 'text', { ph: 'ABC1D23' })}
        ${field('Endereço do atendimento', 'clientAddress', o.clientAddress, 'text', { full: true, ph: 'Rua, nº — bairro, cidade' })}`;
      if (t === 'terceirizada') return equipmentBlock() + `
        ${field('Fornecedor / prestador', 'supplierName', o.supplierName, 'text', { full: true, ph: 'Empresa que executa o serviço' })}
        ${field('Contato do fornecedor', 'supplierContact', o.supplierContact, 'text', { ph: 'Telefone / e-mail' })}
        ${field('Custo estimado', 'cost', o.cost, 'text', { ph: 'R$' })}`;
      return equipmentBlock(); // interna, emergencial
    };

    const body = `<div class="wiz" id="osWiz">
      <div class="wiz-head">
        <div class="wiz-step on" data-step="1"><span class="ws-n">1</span><span class="ws-t">Dados da ordem</span></div>
        <div class="wiz-sep"></div>
        <div class="wiz-step" data-step="2"><span class="ws-n">2</span><span class="ws-t">Segurança</span></div>
        <div class="wiz-sep"></div>
        <div class="wiz-step" data-step="3"><span class="ws-n">3</span><span class="ws-t">Materiais</span></div>
      </div>

      <div class="wiz-pane on" data-pane="1">
        <div class="form-grid">
          <div class="form-sec">${ic('clipboard')}Tipo & destino</div>
          <div class="field full"><label>Tipo de ordem</label><div class="pill-select pill-type-sel" id="typeSel">${typePills}<input type="hidden" name="orderType" value="${curType}"></div><span class="hint" id="typeHint">${esc(ORDER_TYPE[curType].desc)}</span></div>
          <div class="field full" id="typeFields"></div>
          <div class="form-sec">${ic('file')}Dados da ordem</div>
          ${field('Data de abertura', 'openDate', o.openDate || todayISO(), 'date')}
          <div class="field"><label>Solicitante</label><select name="regBy" id="regBySel">${regByOpts.map((op) => `<option value="${esc(op.v)}" ${op.v === regByInit ? 'selected' : ''}>${esc(op.t)}</option>`).join('')}</select></div>
          <div class="field" id="regByOutroWrap" style="${regByInit === '__outro__' ? '' : 'display:none'}"><label>Nome (outro)</label><input name="regByOutro" value="${esc(regInTeam ? '' : (o.regBy || ''))}" placeholder="Digite o nome"></div>
          <div class="field full"><label>Prioridade</label><div class="pill-select" id="prioSel">${prioPills}<input type="hidden" name="priority" value="${o.priority || 'media'}"></div></div>
          ${field('Descrição da ordem', 'description', o.description, 'textarea', { full: true, ph: 'O que precisa ser feito — sintoma, quando começou, impacto' })}
        </div>
      </div>

      <div class="wiz-pane" data-pane="2">
        <div class="form-grid">
          <div class="form-sec">${ic('activity')}Operação</div>
          ${field('Tipo de manutenção', 'osType', o.osType || 'corretiva', 'select', { options: [{ v: 'corretiva', t: 'Corretiva' }, { v: 'preventiva', t: 'Preventiva' }, { v: 'inspecao', t: 'Inspeção' }] })}
          <div class="field"><label>Parada de máquina</label>${sw('Vai precisar parar', 'maqParada', o.maqParada)}</div>
          <div class="form-sec">${ic('shield')}Segurança</div>
          <div class="field full"><label>Sugestões de segurança <span class="lbl-hint">marque os cuidados aplicáveis</span></label><div class="chk-chips" id="safetyChips">${safetyChips}</div></div>
          ${field('Observações de segurança', 'safetyNotes', o.safetyNotes, 'textarea', { full: true, ph: 'Cuidados adicionais, procedimentos, recomendações' })}
          <div class="form-sec">${ic('upload')}Evidência</div>
          <div class="field full"><label>Foto (antes) <span class="lbl-hint">opcional</span></label>
            <div class="oc-photo-row">
              <label class="file-drop sm" id="ocPhotoDrop"><input type="file" id="ocPhotoIn" accept="image/*" hidden><span class="fd-ico">${ic(o.photoName ? 'eye' : 'upload')}</span><span class="fd-tx" id="ocPhotoTx">${o.photoName ? esc(o.photoName) : 'Clique para anexar uma foto'}</span></label>
              <div class="oc-photo-prev" id="ocPhotoPrev" style="${curPhoto ? '' : 'display:none'}">${curPhoto ? `<img src="${esc(curPhoto)}" alt="">` : ''}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="wiz-pane" data-pane="3">
        <div class="form-grid">
          <div class="form-sec">${ic('box')}Materiais necessários</div>
          <div class="field full"><div class="parts-head"><span>Material</span><span>Qtd</span><span>Un</span><span></span></div><div id="matList" class="parts-list">${matRowsHtml()}</div><button class="btn sm ghost addrow" type="button" id="addMat">${ic('plus')}Adicionar material</button><span class="hint">Itens previstos para executar a ordem. A baixa no estoque acontece na finalização.</span></div>
        </div>
      </div>
    </div>`;

    const card = modal({
      wide: true, title: editing ? `Editar ${o.number || 'OS'}` : 'Nova Ordem de Serviço', sub: 'Emissão em 3 etapas',
      body,
      footer: `<button class="btn ghost" id="wizBack" style="visibility:hidden">Voltar</button><div class="wiz-spacer"></div><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="wizNext">Próximo</button>`,
    });
    Icons.apply(card);

    // ---- campos por tipo + equipamento ----
    const typeFields = $('#typeFields', card);
    function bindEquip() {
      const sel = typeFields.querySelector('[name="equipmentId"]'); if (!sel) return;
      const wrap = $('#equipNameWrap', card), meta = $('#equipMeta', card), localIn = typeFields.querySelector('[name="local"]');
      const upd = () => {
        const v = sel.value; if (wrap) wrap.style.display = v === '__none__' ? '' : 'none';
        const eq = (v && v !== '__none__') ? Store.find('equipments', v) : null;
        if (eq && meta) { meta.style.display = ''; meta.innerHTML = `<div class="oc-eqctx">${eq.tag ? `<span class="mono">${esc(eq.tag)}</span>` : ''}${critBadge(eq.criticality)}${eq.sector ? `<span class="cell-sub">${ic('pin')}${esc(eq.sector)}</span>` : ''}</div>`; Icons.apply(meta); if (eq.sector && localIn && !localIn.value) localIn.value = eq.sector; }
        else if (meta) { meta.style.display = 'none'; meta.innerHTML = ''; }
      };
      sel.onchange = upd; upd();
    }
    function renderTypeFields(t) { typeFields.innerHTML = typeFieldsHTML(t); Icons.apply(typeFields); bindEquip(); }
    renderTypeFields(curType);

    // ---- pills de tipo ----
    function setPrio(v) { $$('#prioSel .pill', card).forEach((x) => x.classList.toggle('on', x.dataset.val === v)); card.querySelector('#prioSel input[name="priority"]').value = v; }
    $$('#typeSel .pill', card).forEach((b) => (b.onclick = () => {
      $$('#typeSel .pill', card).forEach((x) => x.classList.remove('on')); b.classList.add('on');
      const t = b.dataset.val; card.querySelector('#typeSel input[name="orderType"]').value = t;
      $('#typeHint', card).textContent = ORDER_TYPE[t].desc;
      renderTypeFields(t);
      if (t === 'emergencial') setPrio('urgente');
    }));
    $$('#prioSel .pill', card).forEach((b) => (b.onclick = () => setPrio(b.dataset.val)));

    // ---- solicitante "outro" ----
    const regSel = $('#regBySel', card), regOutro = $('#regByOutroWrap', card);
    if (regSel) regSel.onchange = () => { regOutro.style.display = regSel.value === '__outro__' ? '' : 'none'; };

    // ---- checklist de segurança ----
    $$('#safetyChips .chk-chip', card).forEach((l) => { const cb = l.querySelector('input'); cb.onchange = () => l.classList.toggle('on', cb.checked); });

    // ---- materiais ----
    const mlist = $('#matList', card);
    const readMats = () => { matRows = $$('.part-row.plan', mlist).map((r) => ({ name: $('.pm-name', r).value, qty: $('.pm-qty', r).value, unit: $('.pm-unit', r).value || 'un' })); };
    const bindMats = () => { $$('.pm-del', mlist).forEach((b) => (b.onclick = () => { readMats(); matRows.splice(+b.closest('.part-row').dataset.i, 1); if (!matRows.length) matRows = [{ name: '', qty: '', unit: 'un' }]; mlist.innerHTML = matRowsHtml(); Icons.apply(mlist); bindMats(); })); };
    bindMats();
    $('#addMat', card).onclick = () => { readMats(); matRows.push({ name: '', qty: '', unit: 'un' }); mlist.innerHTML = matRowsHtml(); Icons.apply(mlist); bindMats(); };

    // ---- foto ----
    const pin = $('#ocPhotoIn', card), ptx = $('#ocPhotoTx', card), prev = $('#ocPhotoPrev', card);
    if (pin) pin.onchange = () => { const f = pin.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('Selecione uma imagem', 'warn'); pickedPhoto = f; ptx.textContent = f.name; prev.style.display = ''; prev.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`; };

    // ---- navegação do wizard ----
    let step = 1; const panes = $$('.wiz-pane', card), stepsEl = $$('.wiz-step', card);
    const wizBack = $('#wizBack', card), wizNext = $('#wizNext', card);
    function showStep(n) {
      step = n;
      panes.forEach((p) => p.classList.toggle('on', +p.dataset.pane === n));
      stepsEl.forEach((s) => { s.classList.toggle('on', +s.dataset.step <= n); s.classList.toggle('cur', +s.dataset.step === n); });
      wizBack.style.visibility = n === 1 ? 'hidden' : 'visible';
      wizNext.textContent = n === 3 ? (editing ? 'Salvar' : 'Gerar ordem') : 'Próximo';
    }
    wizBack.onclick = () => { if (step > 1) showStep(step - 1); };
    wizNext.onclick = () => {
      if (step === 1) { const dsc = card.querySelector('[name="description"]'); if (!dsc.value.trim()) { dsc.focus(); return toast('Descreva a ordem', 'warn'); } }
      if (step < 3) showStep(step + 1); else submit();
    };
    showStep(1);
    setTimeout(() => { const dsc = card.querySelector('[name="description"]'); if (dsc && !editing) dsc.focus(); }, 60);

    async function submit() {
      const d = readForm(card); readMats();
      if (!d.description) { showStep(1); return toast('Descreva a ordem', 'warn'); }
      const orderType = ORDER_TYPE[d.orderType] ? d.orderType : 'interna';
      const safetyItems = $$('#safetyChips input:checked', card).map((i) => i.value);
      const plannedMaterials = matRows.filter((m) => (m.name || '').trim()).map((m) => ({ name: m.name.trim(), qty: m.qty, unit: m.unit || 'un' }));
      const regBy = d.regBy === '__outro__' ? (d.regByOutro || '') : (d.regBy || '');
      const rec = { kind: 'os', orderType, priority: d.priority, osType: d.osType, maqParada: d.maqParada, safetyItems, safetyNotes: d.safetyNotes, plannedMaterials, regBy, openDate: d.openDate, openTime: o.openTime || nowHM(), description: d.description };
      if (orderType === 'externa') { rec.clientName = d.clientName; rec.clientPhone = d.clientPhone; rec.clientAddress = d.clientAddress; rec.vehicle = d.vehicle; rec.plate = d.plate; rec.equipmentId = ''; rec.equipName = ''; rec.local = d.clientAddress || ''; }
      else { rec.equipmentId = d.equipmentId === '__none__' ? '' : (d.equipmentId || ''); rec.equipName = d.equipmentId === '__none__' ? (d.equipName || '') : ''; rec.local = d.local; if (orderType === 'terceirizada') { rec.supplierName = d.supplierName; rec.supplierContact = d.supplierContact; rec.cost = d.cost; } }
      let saved;
      if (editing) saved = Store.update('serviceOrders', o.id, rec);
      else { rec.status = 'andamento'; rec.number = nextNum('OS-'); saved = Store.add('serviceOrders', rec); }
      if (pickedPhoto) { if (await uploadCloudFile('serviceOrders', saved.id, 'photo', pickedPhoto)) Store.update('serviceOrders', saved.id, { photoName: pickedPhoto.name }); }
      logHistory('serviceOrders', saved.id, editing ? 'Edição' : 'Abertura', editing ? 'OS editada' : `${saved.number} aberta (em andamento)`, regBy);
      if (saved.equipmentId && !editing) logHistory('equipments', saved.equipmentId, 'Ordem de Serviço', `${saved.number} — ${short(d.description, 40)}`, regBy);
      toast(editing ? 'OS atualizada' : `${saved.number} aberta e em andamento`); closeModal();
      if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    }
  }

  /* ---- Ordem de Serviço ---- */
  const critFromPriority = (p) => ({ urgente: 'A', alta: 'A', media: 'B', baixa: 'C' }[p] || 'B');
  // Documento da Ordem de Serviço (mesmo layout na tela e no PDF). Compacto, elegante, foto embutida. Sem bloco de EPI.
  function osDocHTML(o) {
    const eq = o.equipmentId ? Store.find('equipments', o.equipmentId) : null;
    const used = o.usedParts || [];
    const planned = o.plannedMaterials || [];
    const otype = orderTypeOf(o); const otm = ORDER_TYPE[otype];
    const crit = o.criticidade || critFromPriority(o.priority);
    const area = o.area || (eq && eq.sector) || '';
    const dt = (iso) => iso ? fmtDate(iso) : '';
    const simNao = (v) => v ? 'Sim' : 'Não';
    const dur = durationText(o);
    const oc = o.occurrenceId ? Store.find('serviceOrders', o.occurrenceId) : null;
    const photoBefore = cloudFileUrl('serviceOrders', o.id, 'photo', o.photoName) || (oc ? cloudFileUrl('serviceOrders', oc.id, 'photo', oc.photoName) : '');
    const photosDone = (o.donePhotos || []).map((n) => cloudFileUrl('serviceOrders', o.id, 'done', n)).filter(Boolean);
    const f = (k, v, wide) => `<div class="odf${wide ? ' wide' : ''}"><span>${esc(k)}</span><b>${(v == null || v === '') ? '—' : esc(String(v))}</b></div>`;
    const fig = (u, cap) => `<figure class="od-fig"><img src="${esc(u)}" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>`;
    const resBadge = o.result ? `<span class="od-resbadge ${o.result === 'resolvido' ? 'ok' : 'bad'}">${esc(RESULT[o.result] || '')}</span>` : '';
    const co = Store.get('settings').company || {};
    const coLine2 = [co.city && co.uf ? co.city + '/' + co.uf : (co.city || ''), co.cep ? 'CEP ' + co.cep : '', co.phone || '', co.site || ''].filter(Boolean).join(' · ');
    return `<div class="osdoc">
      <div class="od-top">
        <div class="od-brand"><img src="assets/logo-icone.png" alt="">
          <div class="od-co">
            <b>${esc(co.name || 'Convergas Fuel Systems')}</b>
            ${co.legal ? `<span class="od-co-legal">${esc(co.legal)}</span>` : ''}
            <span class="od-co-line">CNPJ ${esc(co.cnpj || '—')}${co.address ? ' · ' + esc(co.address) : ''}</span>
            ${coLine2 ? `<span class="od-co-line">${esc(coLine2)}</span>` : ''}
          </div>
        </div>
        <div class="od-id"><span class="od-id-k">Ordem de Serviço · ${esc(otm.label)}</span><span class="od-id-n">Nº ${esc(o.number || '—')}</span></div>
      </div>
      <div class="od-meta">
        ${f('Planta', co.name || 'Convergas')}${f('Tipo de ordem', otm.label)}${f('Data', dt(o.openDate))}
        ${f('Local', otype === 'externa' ? (o.clientAddress || o.local) : o.local)}${f('Solicitante', o.regBy)}${f('Prioridade', (PRIO[o.priority] || {}).label)}
        ${f('Manutenção', OS_TYPE[o.osType] || 'Corretiva')}${f('Máquina parada', simNao(o.maqParada))}${f('Criticidade', crit)}
        ${otype === 'externa'
          ? f('Cliente / Veículo', [o.clientName, o.vehicle, o.plate].filter(Boolean).join(' · '), true)
          : f('Equipamento / Subconjunto', equipDisplay(o) + (eq && eq.tag ? ' · ' + eq.tag : ''), true)}
        ${otype === 'externa' && o.clientPhone ? f('Contato', o.clientPhone) : ''}
        ${otype === 'terceirizada' && o.supplierName ? f('Fornecedor', [o.supplierName, o.supplierContact].filter(Boolean).join(' · '), true) : ''}
      </div>
      <div class="od-block">
        <h5>Descrição da anomalia${resBadge}</h5>
        <p class="od-p">${esc(o.description || '—')}</p>
        ${o.obsAnomalia ? `<p class="od-obs"><span>Observação:</span> ${esc(o.obsAnomalia)}</p>` : ''}
      </div>
      ${o.recQualidade ? `<div class="od-block"><h5>Recomendações de qualidade</h5><p class="od-p">${esc(o.recQualidade)}</p></div>` : ''}
      ${((o.safetyItems || []).length || o.safetyNotes) ? `<div class="od-block"><h5>Segurança</h5>${(o.safetyItems || []).length ? `<ul class="od-ul">${(o.safetyItems || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}${o.safetyNotes ? `<p class="od-p">${esc(o.safetyNotes)}</p>` : ''}</div>` : ''}
      ${planned.length ? `<div class="od-block"><h5>Materiais necessários</h5><table class="od-mattbl"><thead><tr><th>Material</th><th class="tc">Qtd</th><th class="tc">Unid</th></tr></thead><tbody>${planned.map((m) => `<tr><td>${esc(m.name || '')}</td><td class="tc">${esc(String(m.qty || ''))}</td><td class="tc">${esc(m.unit || 'un')}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${(photoBefore || photosDone.length) ? `<div class="od-block"><h5>Registro fotográfico</h5><div class="od-photos">${photoBefore ? fig(photoBefore, 'Antes') : ''}${photosDone.map((u) => fig(u, 'Depois')).join('')}</div></div>` : ''}
      <div class="od-block">
        <h5>Descrição do técnico</h5>
        <p class="od-p">${esc(o.executed || '—')}</p>
      </div>
      <div class="od-grid2">
        ${f('Data início', dt(o.openDate))}${f('Hora início', o.openTime)}${f('Data conclusão', dt(o.closeDate))}${f('Hora final', o.closeTime)}
        ${f('Executado por', o.closedBy)}${f('Tempo total', dur)}${f('Parada de produção', simNao(o.paradaProd))}${f('Hora extra', o.horaExtra ? (o.horaExtraQtd || 'Sim') : 'Não')}
      </div>
      ${used.length ? `<div class="od-block"><h5>Materiais utilizados</h5><table class="od-mattbl"><thead><tr><th>Material</th><th class="tc">Qtd</th><th class="tc">Unid</th></tr></thead><tbody>${used.map((u) => `<tr><td>${esc(u.name || '')}${u.code ? ` <span class="od-mcode">(${esc(u.code)})</span>` : ''}</td><td class="tc">${esc(String(u.qty || ''))}</td><td class="tc">${esc(u.unit || 'un')}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="od-sign"><div><i></i>Solicitante do serviço</div><div><i></i>Executor do serviço</div></div>
      <div class="od-foot">${esc(co.legal || co.name || 'Convergas')}${co.cnpj ? ' · CNPJ ' + esc(co.cnpj) : ''}${co.address ? ' · ' + esc(co.address) + (co.city ? ', ' + esc(co.city) + '/' + esc(co.uf || '') : '') : ''}${co.site ? ' · ' + esc(co.site) : ''}</div>
    </div>`;
  }
  function viewOS(o) {
    if (!o) return;
    const oc = o.occurrenceId ? Store.find('serviceOrders', o.occurrenceId) : null;
    const photoBefore = cloudFileUrl('serviceOrders', o.id, 'photo', o.photoName) || (oc ? cloudFileUrl('serviceOrders', oc.id, 'photo', oc.photoName) : '');
    const photosDone = (o.donePhotos || []).map((n) => cloudFileUrl('serviceOrders', o.id, 'done', n)).filter(Boolean);
    const used = o.usedParts || [], dur = durationText(o);
    const card = modal({
      wide: true, title: `${o.number || ''} · Ordem de Serviço`, sub: equipDisplay(o),
      body: `<div class="os-view-wrap">
        <div class="os-statusbar">${stBadge(o)}${otBadge(o)}${prioBadge(o.priority)}<span class="badge plain">${esc(OS_TYPE[o.osType] || 'Corretiva')}</span>${o.result ? `<span class="badge ${o.result === 'resolvido' ? 'ok' : (o.result === 'parcial' ? 'warn' : 'danger')}">${esc(RESULT[o.result] || '')}</span>` : ''}${o.occurrenceId ? `<span class="badge info plain">${ic('clipboard')}${esc(osNumberOf(o.occurrenceId))}</span>` : ''}</div>
        ${osDocHTML(o)}
      </div>`,
      footer: `<button class="btn ghost" data-close>Fechar</button><button class="btn" id="osPdf">${ic('download')}PDF</button>${o.status === 'pendente' ? `<button class="btn" id="osStart">${ic('wrench')}Iniciar</button>` : ''}<button class="btn" id="osEdit">${ic('edit')}Editar</button>${o.status !== 'finalizada' ? `<button class="btn primary" id="osFin">${ic('check')}Finalizar</button>` : ''}`,
    });
    Icons.apply(card);
    const pdf = $('#osPdf', card); if (pdf) pdf.onclick = () => exportOSPdf(o);
    const start = $('#osStart', card); if (start) start.onclick = () => { closeModal(); iniciarOS(o); };
    const ed = $('#osEdit', card); if (ed) ed.onclick = () => { closeModal(); formOS(o); };
    const fin = $('#osFin', card); if (fin) fin.onclick = () => { closeModal(); finalizarOS(o); };
  }
  function iniciarOS(o) {
    Store.update('serviceOrders', o.id, { status: 'andamento' });
    logHistory('serviceOrders', o.id, 'Início', `${o.number} em execução`, '');
    toast(`${o.number} iniciada`, 'ok'); if (PAGES[currentRoute]) refreshPage();
  }
  function finalizarOS(o, after) {
    if (!o) return;
    const partsStock = Store.get('parts').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    let usedRows = (o.usedParts || []).map((p) => ({ partId: p.partId, qty: p.qty }));
    const partOpts = [{ v: '', t: '— peça —' }].concat(partsStock.map((p) => ({ v: p.id, t: p.name + (p.code ? ` (${p.code})` : '') + ` — estoque: ${p.qty || 0}` })));
    const usedRowsHtml = () => usedRows.map((u, i) => `<div class="part-row used" data-i="${i}"><select class="ur-part">${partOpts.map((op) => `<option value="${esc(op.v)}" ${op.v === u.partId ? 'selected' : ''}>${esc(op.t)}</option>`).join('')}</select><input class="ur-qty" type="number" min="1" placeholder="Qtd" value="${esc(String(u.qty || ''))}"><button class="mini-btn danger ur-del" type="button">${ic('trash')}</button></div>`).join('');
    let pickedPhoto = null;
    const card = modal({
      wide: true, title: `Finalizar ${o.number || ''}`, sub: 'Execução da OS',
      body: `<div class="form-grid">
        ${(o.plannedMaterials || []).length ? `<div class="field full"><label>Materiais previstos na abertura</label><div class="plan-ref">${(o.plannedMaterials || []).map((m) => `<span class="plan-chip">${esc(m.name)}${m.qty ? ` · ${esc(String(m.qty))} ${esc(m.unit || 'un')}` : ''}</span>`).join('')}</div></div>` : ''}
        ${field('Tipo de manutenção', 'osType', o.osType || 'corretiva', 'select', { options: [{ v: 'corretiva', t: 'Corretiva' }, { v: 'preventiva', t: 'Preventiva' }, { v: 'inspecao', t: 'Inspeção' }] })}
        ${field('Serviço executado', 'executed', o.executed, 'textarea', { full: true, ph: 'Ex: Solda refeita, rolamento substituído, lubrificação' })}
        <div class="field full"><label>Materiais utilizados (baixa no estoque)</label><div id="usedList" class="parts-list">${usedRowsHtml()}</div><button class="btn sm" type="button" id="addUsed">${ic('plus')}Adicionar material</button></div>
        ${field('Resultado', 'result', o.result || 'resolvido', 'select', { options: [{ v: 'resolvido', t: 'Resolvido' }, { v: 'parcial', t: 'Resolvido parcialmente' }, { v: 'nova_intervencao', t: 'Necessita nova intervenção' }, { v: 'substituicao', t: 'Substituição recomendada' }] })}
        ${field('Qtd. de horas extras', 'horaExtraQtd', o.horaExtraQtd, 'text', { ph: 'Ex: 2h' })}
        <div class="field">${sw('Máquina precisou parar', 'maqParada', o.maqParada)}</div>
        <div class="field">${sw('Gerou parada de produção', 'paradaProd', o.paradaProd)}</div>
        <div class="field">${sw('Gerou hora extra', 'horaExtra', o.horaExtra)}</div>
        ${field('Observações', 'notes', o.notes, 'textarea', { full: true })}
        ${field('Responsável pela execução', 'closedBy', o.closedBy, 'text', { full: true, ph: 'Seu nome — registrado como evidência' })}
        <div class="field full"><label>Foto da manutenção (depois)</label><label class="file-drop sm" id="finPhotoDrop"><input type="file" id="finPhotoIn" accept="image/*" hidden><span class="fd-ico">${ic('upload')}</span><span class="fd-tx" id="finPhotoTx">Clique para anexar</span></label></div>
      </div>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="finSave">${ic('check')}Finalizar Ordem</button>`,
    });
    const pin = $('#finPhotoIn', card), ptx = $('#finPhotoTx', card);
    if (pin) pin.onchange = () => { const f = pin.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('Selecione uma imagem', 'warn'); pickedPhoto = f; ptx.textContent = f.name; };
    const ulist = $('#usedList', card);
    const readUsed = () => { usedRows = $$('.part-row.used', ulist).map((r) => ({ partId: $('.ur-part', r).value, qty: parseInt($('.ur-qty', r).value, 10) || 0 })).filter((u) => u.partId && u.qty > 0); };
    const bindUsed = () => { $$('.ur-del', ulist).forEach((b) => (b.onclick = () => { readUsed(); usedRows.splice(+b.closest('.part-row').dataset.i, 1); ulist.innerHTML = usedRowsHtml(); bindUsed(); })); };
    bindUsed();
    const addU = $('#addUsed', card); if (addU) addU.onclick = () => { readUsed(); usedRows.push({ partId: '', qty: 1 }); ulist.innerHTML = usedRowsHtml(); bindUsed(); };
    $('#finSave', card).onclick = async () => {
      const d = readForm(card); readUsed();
      const used = [];
      usedRows.forEach((u) => { const p = Store.find('parts', u.partId); if (p) { used.push({ partId: p.id, name: p.name, code: p.code || '', qty: u.qty, unit: p.unit || 'un' }); Store.update('parts', p.id, { qty: Math.max(0, (Number(p.qty) || 0) - u.qty) }); logHistory('parts', p.id, 'Saída', `-${u.qty} ${p.unit || ''} — ${o.number}`, d.closedBy || ''); } });
      const rec = { status: 'finalizada', osType: d.osType, executed: d.executed, usedParts: used, result: d.result, notes: d.notes, closedBy: d.closedBy || '', maqParada: d.maqParada, paradaProd: d.paradaProd, horaExtra: d.horaExtra, horaExtraQtd: d.horaExtraQtd, closeDate: todayISO(), closeTime: nowHM() };
      if (!o.openDate) { rec.openDate = todayISO(); rec.openTime = o.openTime || nowHM(); }
      Store.update('serviceOrders', o.id, rec);
      if (pickedPhoto) { try { if (window.Cloud && window.Cloud.ok) { await window.Cloud.addFile('serviceOrders', o.id, 'done', pickedPhoto); const dp = (o.donePhotos || []).slice(); if (!dp.includes(pickedPhoto.name)) dp.push(pickedPhoto.name); Store.update('serviceOrders', o.id, { donePhotos: dp }); } } catch (e) { toast('Falha ao enviar foto', 'warn'); } }
      const dur = durationText(Store.find('serviceOrders', o.id));
      logHistory('serviceOrders', o.id, 'Conclusão', `${o.number} finalizada${dur ? ' — ' + dur : ''}`, d.closedBy || '');
      if (o.equipmentId) logHistory('equipments', o.equipmentId, 'Conclusão', `${o.number} — ${RESULT[d.result] || ''}`, d.closedBy || '');
      toast(`${o.number} finalizada`, 'ok'); closeModal();
      if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    };
  }

  /* ---- Preventivas ---- */
  function formPreventiva(o, after) {
    o = o || {}; const editing = !!o.id;
    const eqs = Store.get('equipments').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const eqOpts = [{ v: '', t: '— selecione a máquina —' }].concat(eqs.map((e) => ({ v: e.id, t: e.name + (e.tag ? ` (${e.tag})` : '') })));
    const card = modal({
      wide: true, title: editing ? `Editar ${o.number || 'preventiva'}` : 'Nova preventiva', sub: 'Manutenção preventiva',
      body: `<div class="form-grid">
        ${field('Serviço / atividade', 'title', o.title, 'text', { full: true, ph: 'Ex: Troca de óleo, revisão anual' })}
        ${field('Máquina', 'equipmentId', o.equipmentId || '', 'select', { full: true, options: eqOpts })}
        ${field('Frequência', 'frequencyDays', String(o.frequencyDays || '365'), 'select', { options: [{ v: '7', t: 'Semanal (7 dias)' }, { v: '15', t: 'Quinzenal (15 dias)' }, { v: '30', t: 'Mensal (30 dias)' }, { v: '90', t: 'Trimestral (90 dias)' }, { v: '180', t: 'Semestral (180 dias)' }, { v: '365', t: 'Anual (365 dias)' }], hint: 'Ao concluir, a próxima é agendada automaticamente.' })}
        ${field('Data prevista', 'dueDate', o.dueDate || todayISO(), 'date')}
        ${field('Responsável', 'assignee', o.assignee, 'text', { ph: 'Quem executa' })}
        ${field('Prioridade', 'priority', o.priority || 'media', 'select', { options: [{ v: 'baixa', t: 'Baixa' }, { v: 'media', t: 'Média' }, { v: 'alta', t: 'Alta' }, { v: 'urgente', t: 'Urgente' }] })}
        ${field('Escopo / instruções', 'description', o.description, 'textarea', { full: true })}
      </div>`, footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.title) return toast('Informe o serviço', 'warn');
      const rec = { kind: 'preventiva', title: d.title, equipmentId: d.equipmentId, frequencyDays: parseInt(d.frequencyDays, 10) || 365, dueDate: d.dueDate, assignee: d.assignee, priority: d.priority, description: d.description };
      let saved;
      if (editing) saved = Store.update('serviceOrders', o.id, rec); else { rec.status = 'aberta'; rec.openDate = todayISO(); rec.number = nextNum('MP-'); saved = Store.add('serviceOrders', rec); }
      logHistory('serviceOrders', saved.id, editing ? 'Edição' : 'Programação', editing ? 'Preventiva editada' : `Preventiva ${saved.number} programada p/ ${fmtDate(d.dueDate)}`, d.assignee || '');
      if (saved.equipmentId && !editing) logHistory('equipments', saved.equipmentId, 'Preventiva', `${saved.number} — ${d.title}`, d.assignee || '');
      toast(editing ? 'Preventiva atualizada' : `Preventiva ${saved.number} programada`); closeModal();
      if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    };
  }
  function viewPreventiva(o) {
    if (!o) return;
    const card = modal({
      wide: true, title: `${o.number || ''} · Preventiva`, sub: o.title || '',
      body: `<div class="os-detail">
        <div class="os-badges">${stBadge(o)}${prioBadge(o.priority)}</div>
        <div class="os-facts">
          ${osFact('cpu', 'Máquina', equipDisplay(o))}
          ${osFact('refresh', 'Frequência', o.frequencyDays ? o.frequencyDays + ' dias' : '')}
          ${osFact('calendar', 'Data prevista', fmtDate(o.dueDate))}
          ${osFact('wrench', 'Responsável', o.assignee || o.closedBy)}
          ${osFact('check', 'Conclusão', o.closeDate ? fmtDate(o.closeDate) + (o.closeTime ? ' ' + o.closeTime : '') : '')}
        </div>
        ${o.description ? `<div class="os-block"><b>Escopo</b><p>${esc(o.description)}</p></div>` : ''}
        ${o.solution ? `<div class="os-block"><b>Observações da execução</b><p>${esc(o.solution)}</p></div>` : ''}
      </div>`,
      footer: `<button class="btn ghost" data-close>Fechar</button>${o.status !== 'concluida' ? `<button class="btn primary" id="pvFin">${ic('check')}Concluir</button>` : ''}<button class="btn" id="pvEdit">${ic('edit')}Editar</button><button class="btn danger" id="pvDel">${ic('trash')}</button>`,
    });
    Icons.apply(card);
    const fin = $('#pvFin', card); if (fin) fin.onclick = () => { closeModal(); finalizePreventiva(o); };
    const ed = $('#pvEdit', card); if (ed) ed.onclick = () => { closeModal(); formPreventiva(o); };
    const del = $('#pvDel', card); if (del) del.onclick = () => { confirmDialog(`Excluir a ${esc(o.number || 'preventiva')}?`, () => { Store.remove('serviceOrders', o.id); closeModal(); if (PAGES[currentRoute]) refreshPage(); toast('Preventiva excluída', 'info'); }); };
  }
  function finalizePreventiva(o, after) {
    if (!o) return;
    let pickedPhoto = null;
    const card = modal({
      title: `Concluir ${o.number || ''}`, sub: 'Preventiva',
      body: `<div class="form-grid">
        ${field('Responsável pela execução', 'closedBy', o.closedBy, 'text', { full: true, ph: 'Seu nome' })}
        ${field('Observações', 'solution', o.solution, 'textarea', { full: true, ph: 'O que foi feito' })}
        <div class="field full"><label>Foto (opcional)</label><label class="file-drop sm" id="pvPhotoDrop"><input type="file" id="pvPhotoIn" accept="image/*" hidden><span class="fd-ico">${ic('upload')}</span><span class="fd-tx" id="pvPhotoTx">Clique para anexar</span></label></div>
      </div>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="pvSave">${ic('check')}Concluir</button>`,
    });
    const pin = $('#pvPhotoIn', card), ptx = $('#pvPhotoTx', card);
    if (pin) pin.onchange = () => { const f = pin.files[0]; if (!f) return; pickedPhoto = f; ptx.textContent = f.name; };
    $('#pvSave', card).onclick = async () => {
      const d = readForm(card);
      Store.update('serviceOrders', o.id, { status: 'concluida', closedBy: d.closedBy || '', solution: d.solution, closeDate: todayISO(), closeTime: nowHM(), openTime: o.openTime || nowHM() });
      if (pickedPhoto) { try { if (window.Cloud && window.Cloud.ok) { await window.Cloud.addFile('serviceOrders', o.id, 'done', pickedPhoto); const dp = (o.donePhotos || []).slice(); dp.push(pickedPhoto.name); Store.update('serviceOrders', o.id, { donePhotos: dp }); } } catch (e) {} }
      logHistory('serviceOrders', o.id, 'Conclusão', `${o.number} concluída`, d.closedBy || '');
      if (o.equipmentId) logHistory('equipments', o.equipmentId, 'Preventiva concluída', `${o.number} — ${o.title}`, d.closedBy || '');
      if (o.frequencyDays) { const next = addDays(o.dueDate || todayISO(), Number(o.frequencyDays) || 365); const ns = Store.add('serviceOrders', { kind: 'preventiva', number: nextNum('MP-'), title: o.title, equipmentId: o.equipmentId, priority: o.priority, description: o.description, frequencyDays: o.frequencyDays, assignee: o.assignee, dueDate: next, openDate: todayISO(), status: 'aberta' }); logHistory('serviceOrders', ns.id, 'Programação', `Próxima ${ns.number} agendada p/ ${fmtDate(next)}`, ''); }
      toast(`${o.number} concluída`, 'ok'); closeModal();
      if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    };
  }

  /* ---- PDF / impressão da Ordem ---- */
  // carrega um script externo uma única vez
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (Array.from(document.scripts).some((s) => s.src === src || s.src.endsWith(src))) return res();
      const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s);
    });
  }
  // Gera um PDF REAL da OS (rasteriza o documento como imagem e monta um .pdf A4). Fallback: impressão do navegador.
  async function exportOSPdf(o) {
    toast('Gerando PDF…', 'info');
    let holder;
    try {
      await loadScript('js/vendor/html2canvas.min.js');
      await loadScript('js/vendor/jspdf.umd.min.js');
      holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;background:#fff;padding:16px;z-index:-1;';
      holder.innerHTML = osDocHTML(o);
      document.body.appendChild(holder);
      const imgs = Array.from(holder.querySelectorAll('img'));
      await Promise.all(imgs.map((im) => (im.complete && im.naturalWidth) ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; })));
      const canvas = await window.html2canvas(holder.querySelector('.osdoc'), { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(holder); holder = null;
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 8, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const imgW = pw - margin * 2, pxPerMm = canvas.width / imgW, pageHpx = (ph - margin * 2) * pxPerMm;
      let renderedH = 0;
      while (renderedH < canvas.height) {
        const sh = Math.min(pageHpx, canvas.height - renderedH);
        const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = sh;
        const ctx = slice.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, slice.width, sh);
        ctx.drawImage(canvas, 0, renderedH, canvas.width, sh, 0, 0, canvas.width, sh);
        if (renderedH > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, sh / pxPerMm);
        renderedH += sh;
      }
      pdf.save(`OS-${String(o.number || 'servico').replace(/\s+/g, '')}.pdf`);
      toast('PDF gerado', 'ok');
    } catch (e) {
      if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
      console.error(e); toast('Não foi possível gerar o arquivo — abrindo impressão', 'warn'); printOS(o);
    }
  }
  function printOS(o) {
    let root = $('#printRoot'); if (!root) { root = document.createElement('div'); root.id = 'printRoot'; document.body.appendChild(root); }
    root.innerHTML = osDocHTML(o);
    document.body.classList.add('printing');
    // só imprime quando TODAS as imagens (logo + fotos) terminarem de carregar — senão o PDF sai bugado/em branco
    const imgs = Array.from(root.querySelectorAll('img'));
    const waits = imgs.map((im) => (im.complete && im.naturalWidth) ? Promise.resolve() : new Promise((res) => { im.onload = im.onerror = res; }));
    let done = false;
    const fire = () => { if (done) return; done = true; window.print(); setTimeout(() => document.body.classList.remove('printing'), 600); };
    Promise.all(waits).then(() => setTimeout(fire, 120));
    setTimeout(fire, 4000); // rede lenta: não trava para sempre
  }

  /* ---------- Máquinas & Equipamentos ---------- */
  const CRIT = { baixa: { cls: 'ok', label: 'Baixa' }, media: { cls: 'warn', label: 'Média' }, alta: { cls: 'orange', label: 'Alta' }, critica: { cls: 'danger', label: 'Crítica' } };
  const normCrit = (c) => ({ critico: 'critica', importante: 'alta', normal: 'baixa' }[c]) || (CRIT[c] ? c : 'baixa');
  const critBadge = (c) => { const k = normCrit(c); return `<span class="badge ${CRIT[k].cls}">${esc(CRIT[k].label)}</span>`; };
  function fmtDateTime(iso) {
    if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—';
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // trilha de auditoria — histórico automático (quem/quando/o quê)
  function logHistory(entity, entityId, action, detail, who) {
    Store.add('history', { entity, entityId, action, detail: detail || '', who: who || '', ts: new Date().toISOString() });
  }
  const equipFileUrl = (id, field, name) => (window.Cloud && window.Cloud.ok && name) ? window.Cloud.filePublicUrl('equipments', id, field, name) : '';
  async function uploadEquipFile(id, field, file) { if (!(window.Cloud && window.Cloud.ok)) { toast('Nuvem indisponível — arquivo não enviado', 'warn'); return false; } try { await window.Cloud.uploadFile('equipments', id, field, file); return true; } catch (e) { toast('Falha ao enviar arquivo', 'warn'); return false; } }
  async function addEquipFile(id, field, file) { if (!(window.Cloud && window.Cloud.ok)) { toast('Nuvem indisponível — arquivo não enviado', 'warn'); return false; } try { await window.Cloud.addFile('equipments', id, field, file); return true; } catch (e) { toast('Falha ao enviar arquivo', 'warn'); return false; } }
  async function removeEquipField(id, field) { try { if (window.Cloud && window.Cloud.ok) await window.Cloud.removeField('equipments', id, field); } catch (e) {} }
  async function removeEquipFileOne(id, field, name) { try { if (window.Cloud && window.Cloud.ok) await window.Cloud.removeFile('equipments', id, field, name); } catch (e) {} }
  const removeAllEquipFiles = (e) => ['photo', 'manual', 'diagram'].forEach((f) => removeEquipField(e.id, f));

  const machineCard = (e) => {
    const open = osOpenFor(e.id), photo = equipFileUrl(e.id, 'photo', e.photoName);
    return `<div class="mc-card" data-open="${e.id}" title="Abrir ${esc(e.name)}">
      <div class="mc-photo">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : `<span class="mc-ph">${ic('cpu')}</span>`}${critBadge(e.criticality)}</div>
      <div class="mc-body">
        <div class="mc-top"><h3>${esc(e.name)}</h3><button class="mc-stbtn" data-status="${e.id}" title="Alterar status">${eqBadge(e.status)}${ic('chevron')}</button></div>
        <div class="mc-sub mono">${e.tag ? esc(e.tag) : (e.serial ? esc(e.serial) : '—')}</div>
        <div class="mc-meta">${[e.brand, e.sector].filter(Boolean).map(esc).join(' · ') || '—'}</div>
        <div class="mc-foot"><span class="mc-os">${ic('wrench')}${open} OS aberta${open === 1 ? '' : 's'}</span><span class="mc-open">Abrir ${ic('arrowUpRight')}</span></div>
      </div>
    </div>`;
  };

  PAGES['mnt-equip'] = () => {
    pageShell('Máquinas', 'Máquinas & Equipamentos', 'Ativos de produção — cadastro, arquivos e histórico de manutenção.', `<button class="btn primary" id="addBtn">${ic('plus')}Nova máquina</button>`);
    const all = Store.get('equipments');
    const cnt = (k) => all.filter((e) => e.status === k).length;
    const head = document.createElement('div'); head.className = 'mstat-grid'; head.style.marginBottom = '20px';
    head.innerHTML = `${mstat('cpu', all.length, 'Máquinas', '', 1)}${mstat('check', cnt('operante'), 'Operando', cnt('operante') ? 'ok' : '', frac(cnt('operante'), all.length))}${mstat('wrench', cnt('manutencao'), 'Em manutenção', cnt('manutencao') ? 'warn' : '', frac(cnt('manutencao'), all.length))}${mstat('alert', cnt('parado'), 'Paradas', cnt('parado') ? 'danger' : '', frac(cnt('parado'), all.length))}`;
    view.appendChild(head); Icons.apply(head); animateStats(head);
    const state = { status: 'all', q: '' };
    const tb = document.createElement('div'); tb.className = 'toolbar';
    tb.innerHTML = `<div class="filter-input">${ic('search')}<input id="flt" placeholder="Filtrar máquinas…"></div><div class="seg" id="stSeg"><button data-s="all" class="on">Todas</button>${['operante', 'manutencao', 'parado', 'desativado'].map((s) => `<button data-s="${s}">${EQ_STATUS[s].label}</button>`).join('')}</div>`;
    const holder = document.createElement('div'); view.appendChild(tb); view.appendChild(holder); Icons.apply(tb);
    function render() {
      let list = all.filter((e) => state.status === 'all' || e.status === state.status);
      if (state.q) { const q = state.q.toLowerCase(); list = list.filter((e) => JSON.stringify(e).toLowerCase().includes(q)); }
      list = list.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      holder.innerHTML = '';
      if (!list.length) { holder.innerHTML = emptyState('cpu', 'Nenhuma máquina', 'Clique em "Nova máquina" para cadastrar.'); Icons.apply(holder); return; }
      const grid = document.createElement('div'); grid.className = 'mc-grid';
      grid.innerHTML = list.map(machineCard).join('');
      holder.appendChild(grid); Icons.apply(grid);
      $$('.mc-card', grid).forEach((c) => (c.onclick = (ev) => { if (ev.target.closest('[data-status]')) return; openMachine(c.dataset.open); }));
      $$('[data-status]', grid).forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); statusPicker(Store.find('equipments', b.dataset.status), render); }));
    }
    $('#flt', tb).oninput = (e) => { state.q = e.target.value; render(); };
    $$('#stSeg button', tb).forEach((b) => (b.onclick = () => { state.status = b.dataset.s; $$('#stSeg button', tb).forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(); }));
    render();
    $('#addBtn').onclick = () => formEquipment();
  };

  /* ---- tela da máquina (abas internas) ---- */
  function machineDados(e) {
    const row = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : '';
    const kv = `<dl class="kv mach-kv">
      ${row('Código / Patrimônio', e.tag)}${row('Fabricante', e.brand)}${row('Modelo', e.model)}${row('Nº de série', e.serial)}
      ${row('Localização', e.sector)}${e.acquired ? `<dt>Data de instalação</dt><dd>${fmtDate(e.acquired)}</dd>` : ''}
      <dt>Criticidade</dt><dd>${critBadge(e.criticality)}</dd><dt>Status</dt><dd>${eqBadge(e.status)}</dd>
    </dl>`;
    const parts = (e.parts && e.parts.length) ? `<div class="mach-block"><div class="mb-head">${ic('box')}<b>Lista de peças</b><span class="badge plain">${e.parts.length}</span></div>
      <div class="tbl-wrap"><table class="data"><thead><tr><th>Peça</th><th>Código</th><th>Qtd</th></tr></thead><tbody>${e.parts.map((p) => `<tr><td>${esc(p.name || '')}</td><td class="mono cell-sub">${esc(p.code || '—')}</td><td>${esc(String(p.qty || '—'))}</td></tr>`).join('')}</tbody></table></div></div>` : '';
    const notes = e.notes ? `<div class="mach-block"><div class="mb-head">${ic('file')}<b>Observações</b></div><p class="mach-notes">${esc(e.notes)}</p></div>` : '';
    const reg = `<div class="mach-block"><div class="mb-head">${ic('shield')}<b>Registro no sistema</b></div><div class="reg-grid">
      <div><span>Criado por</span><b>${esc(e.createdBy || '—')}</b><em>${e.createdAt ? fmtDateTime(e.createdAt) : '—'}</em></div>
      <div><span>Última alteração</span><b>${esc(e.updatedBy || '—')}</b><em>${e.updatedAt ? fmtDateTime(e.updatedAt) : '—'}</em></div>
    </div></div>`;
    return kv + parts + notes + reg;
  }
  function machineHist(e) {
    const os = Store.get('serviceOrders').filter((o) => o.equipmentId === e.id).sort((a, b) => (b.openDate || '').localeCompare(a.openDate || ''));
    const log = Store.get('history').filter((h) => h.entity === 'equipments' && h.entityId === e.id).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const osHtml = os.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>Nº</th><th class="hide-sm">Tipo</th><th>Status</th><th class="hide-sm">Data</th></tr></thead><tbody>${os.map((o) => `<tr class="os-tr" data-row="${o.id}"><td><div class="cell-main mono">${esc(o.number || '—')}</div><div class="cell-sub">${esc(o.title || short(o.description, 40) || '')}</div></td><td class="hide-sm cell-sub">${esc(KIND_LABEL[o.kind] || '—')}</td><td>${stBadge(o)}</td><td class="hide-sm cell-sub">${fmtDate(o.openDate || o.dueDate) || '—'}</td></tr>`).join('')}</tbody></table></div>` : `<div class="mach-empty">${ic('clipboard')}<span>Nenhuma intervenção registrada.</span></div>`;
    const logHtml = log.length ? `<ul class="timeline">${log.map((h) => `<li><span class="tl-dot"></span><div class="tl-c"><div class="tl-top"><b>${esc(h.action)}</b><span class="tl-when">${fmtDateTime(h.ts)}</span></div>${h.detail ? `<div class="tl-detail">${esc(h.detail)}</div>` : ''}${h.who ? `<div class="tl-who">${ic('users')}${esc(h.who)}</div>` : ''}</div></li>`).join('')}</ul>` : `<div class="mach-empty">${ic('list')}<span>Sem alterações registradas.</span></div>`;
    return `<div class="mach-block"><div class="mb-head">${ic('clipboard')}<b>Intervenções</b>${os.length ? `<span class="badge plain">${os.length}</span>` : ''}</div>${osHtml}</div>
      <div class="mach-block"><div class="mb-head">${ic('list')}<b>Registro de alterações</b></div>${logHtml}</div>`;
  }
  function machineArquivos(e) {
    const manualUrl = equipFileUrl(e.id, 'manual', e.manualName), diagrams = e.diagrams || [];
    const manual = `<div class="mach-block"><div class="mb-head">${ic('file')}<b>Manual (PDF)</b></div>
      ${e.manualName ? `<div class="file-chip"><span class="fc-ico">${ic('file')}</span><span class="fc-name">${esc(e.manualName)}</span><a class="mini-btn" href="${esc(manualUrl)}" target="_blank" rel="noopener" title="Abrir">${ic('eye')}</a><button class="mini-btn danger" data-rmmanual title="Remover">${ic('trash')}</button></div>` : `<div class="mach-empty">${ic('file')}<span>Nenhum manual anexado.</span></div>`}
      <label class="btn sm file-btn">${ic('upload')}${e.manualName ? 'Substituir manual' : 'Anexar manual (PDF)'}<input type="file" accept="application/pdf" id="manualIn" hidden></label></div>`;
    const diag = `<div class="mach-block"><div class="mb-head">${ic('grid')}<b>Diagramas</b>${diagrams.length ? `<span class="badge plain">${diagrams.length}</span>` : ''}</div>
      ${diagrams.length ? `<div class="file-list">${diagrams.map((n) => `<div class="file-chip"><span class="fc-ico">${ic('file')}</span><span class="fc-name">${esc(n)}</span><a class="mini-btn" href="${esc(equipFileUrl(e.id, 'diagram', n))}" target="_blank" rel="noopener">${ic('eye')}</a><button class="mini-btn danger" data-rmdiag="${esc(n)}">${ic('trash')}</button></div>`).join('')}</div>` : `<div class="mach-empty">${ic('grid')}<span>Nenhum diagrama anexado.</span></div>`}
      <label class="btn sm file-btn">${ic('upload')}Adicionar diagrama<input type="file" id="diagIn" hidden></label></div>`;
    const photo = `<div class="mach-block"><div class="mb-head">${ic('eye')}<b>Foto da máquina</b></div>
      <label class="btn sm file-btn">${ic('upload')}${e.photoName ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" id="photoIn" hidden></label></div>`;
    return manual + diag + photo;
  }
  function bindArquivos(e, reopen) {
    const mIn = $('#manualIn'); if (mIn) mIn.onchange = async () => { const f = mIn.files[0]; if (!f) return; if (f.type !== 'application/pdf') return toast('Selecione um PDF', 'warn'); toast('Enviando…', 'info'); if (await uploadEquipFile(e.id, 'manual', f)) { Store.update('equipments', e.id, { manualName: f.name }); logHistory('equipments', e.id, 'Arquivo', 'Manual anexado: ' + f.name, ''); toast('Manual anexado', 'ok'); reopen(); } };
    const dIn = $('#diagIn'); if (dIn) dIn.onchange = async () => { const f = dIn.files[0]; if (!f) return; toast('Enviando…', 'info'); if (await addEquipFile(e.id, 'diagram', f)) { const diagrams = (e.diagrams || []).slice(); if (!diagrams.includes(f.name)) diagrams.push(f.name); Store.update('equipments', e.id, { diagrams }); logHistory('equipments', e.id, 'Arquivo', 'Diagrama anexado: ' + f.name, ''); toast('Diagrama anexado', 'ok'); reopen(); } };
    const pIn = $('#photoIn'); if (pIn) pIn.onchange = async () => { const f = pIn.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('Selecione uma imagem', 'warn'); toast('Enviando…', 'info'); if (await uploadEquipFile(e.id, 'photo', f)) { Store.update('equipments', e.id, { photoName: f.name }); logHistory('equipments', e.id, 'Arquivo', 'Foto atualizada', ''); toast('Foto atualizada', 'ok'); reopen(); } };
    const rmM = $('[data-rmmanual]'); if (rmM) rmM.onclick = async () => { await removeEquipField(e.id, 'manual'); Store.update('equipments', e.id, { manualName: '' }); logHistory('equipments', e.id, 'Arquivo', 'Manual removido', ''); toast('Manual removido', 'info'); reopen(); };
    $$('[data-rmdiag]').forEach((b) => (b.onclick = async () => { const n = b.dataset.rmdiag; await removeEquipFileOne(e.id, 'diagram', n); Store.update('equipments', e.id, { diagrams: (e.diagrams || []).filter((x) => x !== n) }); logHistory('equipments', e.id, 'Arquivo', 'Diagrama removido: ' + n, ''); toast('Diagrama removido', 'info'); reopen(); }));
  }
  function machineCustos(e) {
    const rows = [];
    Store.get('serviceOrders').filter((o) => o.equipmentId === e.id && (o.usedParts || []).length).forEach((o) => {
      let c = 0; (o.usedParts || []).forEach((u) => { const p = Store.find('parts', u.partId); c += (Number(u.qty) || 0) * parseBRL(p ? p.cost : 0); });
      rows.push({ o, c });
    });
    const total = rows.reduce((s, r) => s + r.c, 0);
    const list = rows.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>Nº</th><th class="hide-sm">Data</th><th>Peças</th><th>Custo</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="mono">${esc(r.o.number || '—')}</td><td class="hide-sm cell-sub">${fmtDate(r.o.closeDate || r.o.openDate) || '—'}</td><td class="cell-sub">${(r.o.usedParts || []).length}</td><td>${brl(r.c)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="mach-empty">${ic('box')}<span>Sem custos de peças registrados.</span></div>`;
    return `<div class="mach-costsum"><span class="mcs-k">Custo total em peças</span><span class="mcs-v">${brl(total)}</span></div>${list}`;
  }
  function openMachine(id) {
    const e = Store.find('equipments', id); if (!e) return go('mnt-equip');
    const cc = $('#crumbCur'); if (cc) cc.textContent = e.name;
    const photo = equipFileUrl(e.id, 'photo', e.photoName);
    view.innerHTML = `<div class="mdetail">
      <button class="btn ghost sm mdetail-back" id="mBack">${ic('chevron')}Voltar para Máquinas</button>
      <div class="mdetail-head">
        <div class="mdh-photo">${photo ? `<img src="${esc(photo)}" alt="">` : `<span class="mc-ph">${ic('cpu')}</span>`}</div>
        <div class="mdh-info"><div class="mdh-badges">${eqBadge(e.status)}${critBadge(e.criticality)}</div><h1>${esc(e.name)}</h1><div class="mdh-sub mono">${e.tag ? esc(e.tag) : ''}${e.tag && e.serial ? ' · ' : ''}${e.serial ? 'S/N ' + esc(e.serial) : ''}</div></div>
        <div class="mdh-actions"><button class="btn sm" id="mOs">${ic('plus')}Nova O.S.</button><button class="btn sm" id="mEdit">${ic('edit')}Editar</button><button class="btn sm danger" id="mDel">${ic('trash')}</button></div>
      </div>
      <div class="mtabs" id="mtabs"><button class="mtab on" data-t="dados">${ic('grid')}<span>Dados Gerais</span></button><button class="mtab" data-t="hist">${ic('list')}<span>Histórico</span></button><button class="mtab" data-t="arq">${ic('file')}<span>Arquivos</span></button><button class="mtab" data-t="custos">${ic('box')}<span>Custos</span></button></div>
      <div class="mtab-body" id="mtabBody"></div></div>`;
    Icons.apply(view);
    $('#mBack').onclick = () => go('mnt-equip');
    $('#mOs').onclick = () => formOS({ equipmentId: e.id }, () => openMachine(id));
    $('#mEdit').onclick = () => formEquipment(e, () => openMachine(id));
    $('#mDel').onclick = () => { const n = osOpenFor(e.id); confirmDialog(`Excluir a máquina "${esc(e.name)}"?${n ? ` Há ${n} OS aberta(s) vinculada(s).` : ''}`, () => { Store.remove('equipments', e.id); logHistory('equipments', e.id, 'Exclusão', `Máquina "${e.name}" excluída`, ''); removeAllEquipFiles(e); go('mnt-equip'); toast('Máquina excluída', 'info'); }); };
    const body = $('#mtabBody');
    const renderTab = (t) => {
      if (t === 'dados') body.innerHTML = machineDados(e);
      else if (t === 'hist') { body.innerHTML = machineHist(e); $$('.os-tr', body).forEach((tr) => (tr.onclick = () => openRecord(Store.find('serviceOrders', tr.dataset.row)))); }
      else if (t === 'arq') { body.innerHTML = machineArquivos(e); bindArquivos(e, () => openMachine(id)); }
      else if (t === 'custos') body.innerHTML = machineCustos(e);
      Icons.apply(body); bindCopy(body);
    };
    $$('.mtab', $('#mtabs')).forEach((b) => (b.onclick = () => { $$('.mtab').forEach((x) => x.classList.remove('on')); b.classList.add('on'); renderTab(b.dataset.t); }));
    renderTab('dados');
  }

  function formEquipment(e, after) {
    const editing = !!(e && e.id); e = e || {};
    let pickedPhoto = null, pickedManual = null;
    let parts = (e.parts || []).map((p) => ({ ...p }));
    const partsRows = () => parts.map((p, i) => `<div class="part-row" data-i="${i}"><input class="pr-name" placeholder="Peça" value="${esc(p.name || '')}"><input class="pr-code" placeholder="Código" value="${esc(p.code || '')}"><input class="pr-qty" placeholder="Qtd" value="${esc(String(p.qty || ''))}"><button class="mini-btn danger pr-del" type="button">${ic('trash')}</button></div>`).join('');
    const card = modal({
      wide: true, title: editing ? 'Editar máquina' : 'Nova máquina', sub: 'Cadastro de máquina / equipamento',
      body: `<div class="form-grid form-compact">
        ${formSec('cpu', 'Identificação')}
        ${field('Nome da máquina ou equipamento *', 'name', e.name, 'text', { full: true, ph: 'Ex: Compressor de Ar' })}
        ${field('Código / Patrimônio *', 'tag', e.tag, 'text', { ph: 'Ex: CV-MAQ-001' })}
        ${field('Localização *', 'sector', e.sector, 'text', { ph: 'Ex: Linha de Montagem' })}
        ${field('Fabricante', 'brand', e.brand, 'text', { ph: 'Ex: Schulz' })}
        ${field('Modelo', 'model', e.model, 'text', { ph: 'Ex: CPM-0001' })}
        ${field('Nº de série (se houver)', 'serial', e.serial, 'text', { ph: 'Ex: 005512' })}
        ${field('Data de instalação', 'acquired', e.acquired || todayISO(), 'date')}
        ${formSec('shield', 'Classificação')}
        ${field('Status *', 'status', e.status || 'operante', 'select', { options: [{ v: 'operante', t: '🟢 Operando' }, { v: 'manutencao', t: '🟡 Em manutenção' }, { v: 'parado', t: '🔴 Parado' }, { v: 'desativado', t: '⚫ Desativado' }] })}
        ${field('Criticidade *', 'criticality', normCrit(e.criticality || 'baixa'), 'select', { options: [{ v: 'baixa', t: '🟢 Baixa' }, { v: 'media', t: '🟡 Média' }, { v: 'alta', t: '🟠 Alta' }, { v: 'critica', t: '🔴 Crítica' }] })}
        ${formSec('file', 'Anexos')}
        <div class="field"><label>Foto do equipamento</label><label class="file-drop sm" id="photoDrop"><input type="file" id="photoIn2" accept="image/*" hidden><span class="fd-ico">${ic(e.photoName ? 'eye' : 'upload')}</span><span class="fd-tx" id="photoTx">${e.photoName ? esc(e.photoName) : 'Selecionar imagem'}</span></label></div>
        <div class="field"><label>Manual técnico (PDF)</label><label class="file-drop sm" id="manualBtn"><input type="file" id="manualIn2" accept="application/pdf" hidden><span class="fd-ico">${ic(e.manualName ? 'file' : 'upload')}</span><span class="fd-tx" id="manualTx">${e.manualName ? esc(e.manualName) : 'Anexar PDF'}</span></label></div>
        ${formSec('box', 'Peças & observações')}
        <div class="field full"><label>Lista de peças</label><div id="partsList" class="parts-list">${partsRows()}</div><button class="btn sm" type="button" id="addPart">${ic('plus')}Adicionar peça</button></div>
        ${field('Observações', 'notes', e.notes, 'textarea', { full: true })}
        ${formSec('users', 'Responsável')}
        ${field('Seu nome *', 'responsible', '', 'text', { full: true, ph: 'Futuramente virá do login — por ora, digite seu nome' })}
      </div>`,
      footer: submitFooter(editing),
    });
    const pIn = $('#photoIn2', card), pTx = $('#photoTx', card);
    if (pIn) pIn.onchange = () => { const f = pIn.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('Selecione uma imagem', 'warn'); pickedPhoto = f; pTx.textContent = f.name; };
    const mIn = $('#manualIn2', card), mTx = $('#manualTx', card);
    if (mIn) mIn.onchange = () => { const f = mIn.files[0]; if (!f) return; if (f.type !== 'application/pdf') return toast('Selecione um PDF', 'warn'); pickedManual = f; mTx.textContent = f.name; };
    const plist = $('#partsList', card);
    const readParts = () => { parts = $$('.part-row', plist).map((r) => ({ name: $('.pr-name', r).value.trim(), code: $('.pr-code', r).value.trim(), qty: $('.pr-qty', r).value.trim() })).filter((p) => p.name || p.code || p.qty); };
    const bindParts = () => { $$('.pr-del', plist).forEach((b) => (b.onclick = () => { readParts(); parts.splice(+b.closest('.part-row').dataset.i, 1); plist.innerHTML = partsRows(); bindParts(); })); };
    bindParts();
    $('#addPart', card).onclick = () => { readParts(); parts.push({ name: '', code: '', qty: '' }); plist.innerHTML = partsRows(); bindParts(); };
    $('#saveBtn', card).onclick = async () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome da máquina', 'warn');
      if (!d.tag) return toast('Informe o código / patrimônio', 'warn');
      if (!d.sector) return toast('Informe a localização', 'warn');
      if (!d.responsible) return toast('Informe o responsável (seu nome)', 'warn');
      readParts();
      const nowIso = new Date().toISOString();
      const rec = { name: d.name, tag: d.tag, brand: d.brand, model: d.model, serial: d.serial, sector: d.sector, acquired: d.acquired, status: d.status, criticality: d.criticality, parts, notes: d.notes };
      let saved, changes = [];
      if (editing) {
        [['name', 'Nome'], ['tag', 'Código'], ['brand', 'Fabricante'], ['model', 'Modelo'], ['serial', 'Nº série'], ['sector', 'Localização'], ['acquired', 'Instalação'], ['status', 'Status'], ['criticality', 'Criticidade'], ['notes', 'Observações']].forEach(([k, l]) => { if ((e[k] || '') !== (rec[k] || '')) changes.push(l); });
        if (JSON.stringify(e.parts || []) !== JSON.stringify(parts)) changes.push('Peças');
        rec.updatedBy = d.responsible; rec.updatedAt = nowIso;
        saved = Store.update('equipments', e.id, rec);
      } else { rec.createdBy = d.responsible; rec.createdAt = nowIso; rec.updatedBy = d.responsible; rec.updatedAt = nowIso; saved = Store.add('equipments', rec); }
      if (pickedPhoto) { if (await uploadEquipFile(saved.id, 'photo', pickedPhoto)) Store.update('equipments', saved.id, { photoName: pickedPhoto.name }); }
      if (pickedManual) { if (await uploadEquipFile(saved.id, 'manual', pickedManual)) Store.update('equipments', saved.id, { manualName: pickedManual.name }); }
      logHistory('equipments', saved.id, editing ? 'Edição' : 'Cadastro', editing ? (changes.length ? 'Alterado: ' + changes.join(', ') : 'Sem alterações de dados') : `Máquina "${rec.name}" cadastrada`, d.responsible || '');
      toast(editing ? 'Máquina atualizada' : 'Máquina cadastrada'); closeModal();
      if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    };
  }
  // troca rápida de status pelo card (sem entrar na edição)
  function statusPicker(e, after) {
    if (!e) return;
    const opts = [['operante', '🟢 Operando'], ['manutencao', '🟡 Em manutenção'], ['parado', '🔴 Parado'], ['desativado', '⚫ Desativado']];
    const card = modal({
      title: 'Alterar status', sub: e.name,
      body: `<div class="status-pick">${opts.map(([v, t]) => `<button class="status-opt${e.status === v ? ' on' : ''}" data-st="${v}">${t}</button>`).join('')}</div>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button>`,
    });
    $$('.status-opt', card).forEach((b) => (b.onclick = () => {
      if (b.dataset.st !== e.status) { Store.update('equipments', e.id, { status: b.dataset.st, updatedAt: new Date().toISOString() }); logHistory('equipments', e.id, 'Status', `Status → ${(EQ_STATUS[b.dataset.st] || {}).label || b.dataset.st}`, ''); toast('Status atualizado', 'ok'); }
      closeModal(); if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    }));
  }

  /* ---------- Calendário de manutenção ---------- */
  const MES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DOW_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const evColor = (o) => o.kind === 'preventiva' ? (isOverdue(o) ? 'danger' : 'info') : 'warn';
  function mntEvents() { const map = {}; Store.get('serviceOrders').forEach((o) => { if (o.kind !== 'os' && o.kind !== 'preventiva') return; const dt = (o.kind === 'preventiva' ? o.dueDate : o.openDate); if (!dt) return; (map[dt] = map[dt] || []).push(o); }); return map; }
  PAGES['mnt-cal'] = () => {
    pageShell('Calendário', 'Calendário de manutenção', 'Ordens de Serviço e manutenções preventivas agendadas.', '');
    const state = { view: 'mes', ref: todayISO() };
    const bar = document.createElement('div'); bar.className = 'cal-bar';
    const holder = document.createElement('div');
    view.appendChild(bar); view.appendChild(holder);
    const isoOf = (y, m, d) => y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const parts = () => state.ref.split('-').map(Number);
    const shift = (dir) => { const [y, m, d] = parts(); const dt = new Date(y, m - 1, d); if (state.view === 'mes') dt.setMonth(dt.getMonth() + dir); else if (state.view === 'semana') dt.setDate(dt.getDate() + 7 * dir); else dt.setDate(dt.getDate() + dir); state.ref = isoOf(dt.getFullYear(), dt.getMonth(), dt.getDate()); render(); };
    const evChip = (o) => `<button class="cal-ev t-${evColor(o)}" data-ev="${o.id}" title="${esc(o.title || o.description || '')}">${esc((o.number || '') + ' ' + (o.title || short(o.description, 16) || ''))}</button>`;
    function render() {
      const ev = mntEvents(); const [y, mm, d] = parts(); const m = mm - 1; let title = '', grid = '';
      if (state.view === 'mes') {
        title = MES_PT[m] + ' ' + y;
        const startDow = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
        let cells = DOW_PT.map((dn) => `<div class="cal-dow">${dn}</div>`).join('');
        for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell empty"></div>`;
        for (let dd = 1; dd <= dim; dd++) { const key = isoOf(y, m, dd), list = ev[key] || [], today = key === todayISO(); cells += `<div class="cal-cell${today ? ' today' : ''}"><span class="cal-num">${dd}</span><div class="cal-evs">${list.slice(0, 4).map(evChip).join('')}${list.length > 4 ? `<span class="cal-more">+${list.length - 4}</span>` : ''}</div></div>`; }
        grid = `<div class="cal-month">${cells}</div>`;
      } else if (state.view === 'semana') {
        const ws = new Date(y, m, d); ws.setDate(d - ws.getDay());
        const days = [...Array(7)].map((_, i) => { const x = new Date(ws); x.setDate(ws.getDate() + i); return x; });
        title = `${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[6].getDate()}/${days[6].getMonth() + 1}`;
        grid = `<div class="cal-week">${days.map((x) => { const key = isoOf(x.getFullYear(), x.getMonth(), x.getDate()), list = ev[key] || [], today = key === todayISO(); return `<div class="cal-day${today ? ' today' : ''}"><div class="cal-day-h">${DOW_PT[x.getDay()]} ${x.getDate()}</div><div class="cal-day-evs">${list.map(evChip).join('') || '<span class="cal-none">—</span>'}</div></div>`; }).join('')}</div>`;
      } else {
        title = `${d} de ${MES_PT[m]} ${y}`; const key = isoOf(y, m, d), list = ev[key] || [];
        grid = `<div class="cal-dayview">${list.length ? list.map((o) => `<div class="cal-row" data-ev="${o.id}"><span class="cal-dot t-${evColor(o)}"></span><div class="cal-row-c"><b>${esc((o.number || '') + ' ' + (o.title || short(o.description, 40) || ''))}</b><span>${esc((KIND_LABEL[o.kind] || '') + ' · ' + (equipDisplay(o) || '—'))}</span></div>${stBadge(o)}</div>`).join('') : emptyState('calendar', 'Sem atividades', 'Nada agendado para este dia.')}</div>`;
      }
      bar.innerHTML = `<div class="cal-nav"><button class="icon-btn" id="cprev">${ic('chevron')}</button><b class="cal-title">${esc(title)}</b><button class="icon-btn" id="cnext">${ic('chevron')}</button><button class="btn sm" id="ctoday">Hoje</button></div><div class="seg" id="cview"><button data-v="dia" class="${state.view === 'dia' ? 'on' : ''}">Dia</button><button data-v="semana" class="${state.view === 'semana' ? 'on' : ''}">Semana</button><button data-v="mes" class="${state.view === 'mes' ? 'on' : ''}">Mês</button></div>`;
      holder.innerHTML = grid; Icons.apply(view);
      $('#cprev').onclick = () => shift(-1); $('#cnext').onclick = () => shift(1); $('#ctoday').onclick = () => { state.ref = todayISO(); render(); };
      $$('#cview button', bar).forEach((b) => (b.onclick = () => { state.view = b.dataset.v; render(); }));
      $$('[data-ev]', holder).forEach((el) => (el.onclick = () => openRecord(Store.find('serviceOrders', el.dataset.ev))));
    }
    render();
  };

  /* ---------- Estoque de peças ---------- */
  PAGES['mnt-pecas'] = () => {
    pageShell('Peças', 'Estoque de peças', 'Peças de reposição — controle de estoque e mínimo.', `<button class="btn primary" id="addBtn">${ic('plus')}Nova peça</button>`);
    const all = Store.get('parts');
    const isLow = (p) => (p.minQty != null && p.minQty !== '') && Number(p.qty || 0) <= Number(p.minQty || 0);
    const low = all.filter(isLow);
    const val = all.reduce((s, p) => s + (Number(p.qty || 0) * parseBRL(p.cost)), 0);
    const head = document.createElement('div'); head.className = 'mstat-grid'; head.style.marginBottom = '20px';
    head.innerHTML = `${mstat('box', all.length, 'Itens', '', 1)}${mstat('alert', low.length, 'Abaixo do mínimo', low.length ? 'danger' : 'ok', frac(low.length, all.length))}${mstat('activity', brl(val), 'Valor em estoque')}`;
    view.appendChild(head); Icons.apply(head); animateStats(head);
    const state = { q: '' };
    const tb = document.createElement('div'); tb.className = 'toolbar';
    tb.innerHTML = `<div class="filter-input">${ic('search')}<input id="flt" placeholder="Filtrar peças…"></div>`;
    const holder = document.createElement('div'); view.appendChild(tb); view.appendChild(holder); Icons.apply(tb);
    function render() {
      let list = all.slice();
      if (state.q) { const q = state.q.toLowerCase(); list = list.filter((p) => JSON.stringify(p).toLowerCase().includes(q)); }
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      holder.innerHTML = '';
      const tw = document.createElement('div'); tw.className = 'tbl-wrap';
      tw.innerHTML = list.length ? `<table class="data"><thead><tr><th>Peça</th><th class="hide-sm">Código</th><th class="hide-sm">Local</th><th>Estoque</th><th class="hide-sm">Mín.</th><th></th></tr></thead><tbody>${list.map((p) => `<tr><td><div class="cell-main">${esc(p.name)}</div>${p.category ? `<div class="cell-sub">${esc(p.category)}</div>` : ''}</td><td class="hide-sm mono cell-sub">${esc(p.code || '—')}</td><td class="hide-sm cell-sub">${esc(p.location || '—')}</td><td>${isLow(p) ? `<span class="badge danger">${esc(String(p.qty || 0))} ${esc(p.unit || '')}</span>` : `<b>${esc(String(p.qty || 0))}</b> <span class="cell-sub">${esc(p.unit || '')}</span>`}</td><td class="hide-sm cell-sub">${esc(String(p.minQty != null && p.minQty !== '' ? p.minQty : '—'))}</td><td><div class="row-actions"><button class="mini-btn" data-mov="${p.id}" title="Movimentar estoque">${ic('refresh')}</button><button class="mini-btn" data-edit="${p.id}" title="Editar">${ic('edit')}</button><button class="mini-btn danger" data-del="${p.id}" title="Excluir">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table>` : emptyState('box', 'Nenhuma peça', 'Clique em "Nova peça" para cadastrar.');
      holder.appendChild(tw); Icons.apply(tw);
      $$('[data-edit]', tw).forEach((b) => (b.onclick = () => formPart(Store.find('parts', b.dataset.edit), render)));
      $$('[data-mov]', tw).forEach((b) => (b.onclick = () => movePart(Store.find('parts', b.dataset.mov), render)));
      $$('[data-del]', tw).forEach((b) => (b.onclick = () => { const p = Store.find('parts', b.dataset.del); confirmDialog(`Excluir "${esc(p.name)}"?`, () => { Store.remove('parts', p.id); render(); toast('Peça excluída', 'info'); }); }));
    }
    $('#flt', tb).oninput = (e) => { state.q = e.target.value; render(); };
    render();
    $('#addBtn').onclick = () => formPart(null, render);
  };
  function formPart(p, after) {
    const editing = !!(p && p.id); p = p || {};
    const card = modal({
      title: editing ? 'Editar peça' : 'Nova peça', sub: 'Estoque',
      body: `<div class="form-grid">
        ${field('Nome da peça', 'name', p.name, 'text', { full: true, ph: 'Ex: Rolamento 6204 ZZ' })}
        ${field('Código', 'code', p.code, 'text', { ph: 'SKU / fabricante' })}
        ${field('Categoria', 'category', p.category, 'text', { ph: 'Ex: Rolamentos' })}
        ${field('Localização', 'location', p.location, 'text', { ph: 'Ex: Prateleira A3' })}
        ${field('Quantidade em estoque', 'qty', String(p.qty != null ? p.qty : ''), 'text', { ph: '0' })}
        ${field('Estoque mínimo', 'minQty', String(p.minQty != null ? p.minQty : ''), 'text', { ph: 'Alerta abaixo disso' })}
        ${field('Unidade', 'unit', p.unit, 'text', { ph: 'un, m, kg…' })}
        ${field('Custo unitário (R$)', 'cost', p.cost, 'text', { ph: 'Ex: 25,00' })}
        ${field('Observações', 'notes', p.notes, 'textarea', { full: true })}
      </div>`, footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome da peça', 'warn');
      const rec = { name: d.name, code: d.code, category: d.category, location: d.location, qty: Number(d.qty) || 0, minQty: d.minQty === '' ? '' : (Number(d.minQty) || 0), unit: d.unit, cost: d.cost, notes: d.notes };
      let saved;
      if (editing) saved = Store.update('parts', p.id, rec); else saved = Store.add('parts', rec);
      logHistory('parts', saved.id, editing ? 'Edição' : 'Cadastro', editing ? 'Peça atualizada' : `Peça "${rec.name}" cadastrada`, '');
      toast(editing ? 'Peça atualizada' : 'Peça cadastrada'); closeModal(); if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    };
  }
  function movePart(p, after) {
    if (!p) return;
    const card = modal({
      title: `Movimentar — ${p.name}`, sub: `Estoque atual: ${p.qty || 0} ${p.unit || ''}`,
      body: `<div class="form-grid">
        ${field('Tipo', 'mtype', 'entrada', 'select', { options: [{ v: 'entrada', t: 'Entrada (+)' }, { v: 'saida', t: 'Saída (−)' }] })}
        ${field('Quantidade', 'mqty', '', 'text', { ph: '0' })}
        ${field('Motivo', 'mreason', '', 'text', { full: true, ph: 'Ex: compra, uso em OS, ajuste' })}
      </div>`, footer: submitFooter(true),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card); const q = Number(d.mqty) || 0; if (q <= 0) return toast('Informe a quantidade', 'warn');
      const cur = Number(p.qty) || 0, nv = d.mtype === 'saida' ? Math.max(0, cur - q) : cur + q;
      Store.update('parts', p.id, { qty: nv });
      logHistory('parts', p.id, d.mtype === 'saida' ? 'Saída' : 'Entrada', `${d.mtype === 'saida' ? '-' : '+'}${q} ${p.unit || ''}${d.mreason ? ' — ' + d.mreason : ''} (estoque: ${nv})`, '');
      toast('Estoque atualizado', 'ok'); closeModal(); if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    };
  }

  /* =====================================================================
     QUALIDADE — certificações
     ===================================================================== */
  function certStatus(dateStr) {
    if (!dateStr) return { key: 'na', label: 'Sem validade', cls: 'neutral', days: null };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00'); const days = Math.round((d - today) / 86400000);
    if (isNaN(days)) return { key: 'na', label: 'Sem validade', cls: 'neutral', days: null };
    if (days < 0) return { key: 'vencido', label: `Vencido há ${-days}d`, cls: 'danger', days };
    if (days <= 90) return { key: 'vencendo', label: `Vence em ${days}d`, cls: 'warn', days };
    if (days <= 180) return { key: 'atencao', label: `${days}d restantes`, cls: 'info', days };
    return { key: 'ok', label: 'Válido', cls: 'ok', days };
  }
  function qaAlerts() {
    const a = [];
    Store.get('certificates').slice().sort((x, y) => (certStatus(x.expiryDate).days ?? 1e9) - (certStatus(y.expiryDate).days ?? 1e9)).forEach((c) => {
      const st = certStatus(c.expiryDate);
      if (st.key === 'vencido') a.push({ kind: 'danger', t: `Certificado "${c.name}" vencido`, s: `Validade ${fmtDate(c.expiryDate)} — renovar com o laboratório` });
      else if (st.key === 'vencendo') a.push({ kind: 'warn', t: `Certificado "${c.name}" ${st.label.toLowerCase()}`, s: `Validade ${fmtDate(c.expiryDate)}` });
    });
    return a.concat(epiAlerts());
  }

  // stat card de acompanhamento (ícone redondo animado)
  function qaStat(icon, val, label, tone) {
    return `<div class="qstat${tone ? ' t-' + tone : ''}">
      <span class="qstat-ico">${ic(icon)}</span>
      <div class="qstat-tx"><span class="qstat-v">${esc(String(val))}</span><span class="qstat-k">${esc(label)}</span></div>
    </div>`;
  }
  // linha de certificado (modo lista)
  const certRow = (c) => {
    const st = certStatus(c.expiryDate); const hasFile = !!(c.fileName || certPdfUrl(c));
    return `<tr class="cert-tr s-${st.key} cert-clickable" data-view="${c.id}" title="${hasFile ? 'Clique para visualizar o certificado' : 'Sem PDF anexado'}">
      <td><div class="id-cell"><span class="cert-ico"><span class="ci-bar"></span>${ic(c.type === 'equipamento' ? 'activity' : 'award')}</span>
        <div><div class="cell-main">${esc(c.name)}${hasFile ? ` <span class="cell-view">${ic('eye')}</span>` : ''}</div><div class="cell-sub mono">${esc(c.number || '—')}${c.process ? ' · ' + esc(c.process) : ''}${hasFile ? '' : ' · <span class="no-file">sem PDF</span>'}</div></div></div></td>
      <td class="hide-sm cell-sub">${fmtDate(c.issueDate)}</td>
      <td><b>${fmtDate(c.expiryDate)}</b></td>
      <td><span class="badge ${st.cls}">${esc(st.label)}</span></td>
      <td><div class="row-actions">
        <button class="mini-btn${hasFile ? '' : ' off'}" data-share="${c.id}" title="Compartilhar PDF">${ic('share')}</button>
        <button class="mini-btn${hasFile ? '' : ' off'}" data-download="${c.id}" title="Baixar PDF">${ic('download')}</button>
        <button class="mini-btn renew" data-renew="${c.id}" title="Renovar (laboratório)">${ic('refresh')}</button>
        <button class="mini-btn" data-edit="${c.id}" title="Editar">${ic('edit')}</button>
        <button class="mini-btn danger" data-del="${c.id}" title="Excluir">${ic('trash')}</button>
      </div></td>
    </tr>`;
  };
  function bindCertActions(root) {
    $$('.cert-clickable', root).forEach((tr) => (tr.onclick = (e) => { if (e.target.closest('.mini-btn')) return; viewCert(Store.find('certificates', tr.dataset.view)); }));
    $$('[data-share]', root).forEach((b) => (b.onclick = () => shareCert(Store.find('certificates', b.dataset.share))));
    $$('[data-download]', root).forEach((b) => (b.onclick = () => downloadCert(Store.find('certificates', b.dataset.download))));
    $$('[data-renew]', root).forEach((b) => (b.onclick = () => renewCert(Store.find('certificates', b.dataset.renew))));
    $$('[data-edit]', root).forEach((b) => (b.onclick = () => formCert(Store.find('certificates', b.dataset.edit))));
    $$('[data-del]', root).forEach((b) => (b.onclick = () => { const c = Store.find('certificates', b.dataset.del); confirmDialog(`Excluir o certificado "${esc(c.name)}"?`, () => { Store.remove('certificates', c.id); Store.files.del(c.id).catch(() => {}); refreshPage(); toast('Certificado excluído', 'info'); }); }));
  }
  // Certificados cujo PDF é servido estaticamente pelo site (assets/certs/{numero}.pdf).
  // Calculado pelo NÚMERO do certificado — assim abre sempre, mesmo que a nuvem sobrescreva o registro.
  const CERT_PDF_NUMS = new Set(['23101152', '26091902', '24041163', '24041164', '25011480', '25011481', '24111457', '25081675', '25101702', '26011759', '25101701', '24041162', 'P2024-04A', '2208843', '24081371', '24031156', '24081373', '26071866', '24081369', '26031810']);
  // Equipamentos de medição (calibração): PDF estático em assets/certs/{número com "/" -> "."}.pdf
  const EQUIP_PDF_NUMS = new Set(['01811/26', '01814/26', '01815/26', 'CCM62605/26', 'CCM62516/26', 'CCM62604/26', '13242/24', '16242054', 'CCM62603/26', 'CCM59926/25', '01813/26', '01878/26', '01879/26', '01700/26', '01706/26', 'CCM57533/25', '9105/25', '5572/25', 'CCM56911/25', 'CCM55866/25', 'CCM57660/25']);
  const certPdfUrl = (c) => {
    if (!c || !c.number) return (c && c.viewUrl) || '';
    if (EQUIP_PDF_NUMS.has(c.number)) return 'assets/certs/' + c.number.replace(/\//g, '.') + '.pdf';
    if (CERT_PDF_NUMS.has(c.number)) return 'assets/certs/' + c.number + '.pdf';
    return c.viewUrl || '';
  };

  async function shareCert(c) {
    const vu = certPdfUrl(c);
    if (!c.fileName && !vu) return toast('Anexe o PDF (Editar) primeiro', 'warn');
    // PDF estático do site (assets/certs) — abre direto, sem depender de backend
    if (vu) { window.open(vu, '_blank', 'noopener'); return toast('Certificado aberto em nova aba', 'info'); }
    const rec = await Store.files.get(c.id);
    if (!rec || !rec.blob) return toast('Arquivo não encontrado — reanexe o PDF', 'warn');
    const file = new File([rec.blob], c.fileName, { type: c.fileType || 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: c.name }); } catch (e) {}
    } else {
      const url = URL.createObjectURL(rec.blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast('Certificado aberto — use o navegador para compartilhar', 'info');
    }
  }
  async function downloadCert(c) {
    const vu = certPdfUrl(c);
    if (!c.fileName && !vu) return toast('Anexe o PDF (Editar) primeiro', 'warn');
    if (vu) { const a = document.createElement('a'); a.href = vu; a.download = c.fileName || ((c.number || 'certificado') + '.pdf'); a.click(); return; }
    const rec = await Store.files.get(c.id);
    if (!rec || !rec.blob) return toast('Arquivo não encontrado — reanexe o PDF', 'warn');
    const url = URL.createObjectURL(rec.blob); const a = document.createElement('a'); a.href = url; a.download = c.fileName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  // visualização inline do PDF (clique na linha do certificado)
  async function viewCert(c) {
    const vu = certPdfUrl(c);
    if (!c || (!c.fileName && !vu)) return toast('Este certificado ainda não tem PDF anexado — use Editar para anexar.', 'warn');
    const card = modal({
      wide: true, title: c.name, sub: `Certificado${c.number ? ' · ' + esc(c.number) : ''}`,
      body: `<div class="pdf-view" id="pdfView"><div class="pdf-loading">${ic('refresh')}<span>Carregando PDF…</span></div></div>`,
      footer: `<button class="btn ghost" data-close>Fechar</button><button class="btn" id="pvOpen">${ic('external')}Abrir em nova aba</button><button class="btn primary" id="pvDown">${ic('download')}Baixar</button>`,
    });
    const host = $('#pdfView', card); Icons.apply(card);
    // PDF estático do site (assets/certs): abre direto por URL, independente de backend/cache
    if (vu) {
      const dlName = c.fileName || ((c.number || 'certificado') + '.pdf');
      host.innerHTML = `<iframe class="pdf-frame" src="${esc(vu)}" title="${esc(c.name)}"></iframe>`;
      const openBtn = $('#pvOpen', card); if (openBtn) openBtn.onclick = () => window.open(vu, '_blank', 'noopener');
      const downBtn = $('#pvDown', card); if (downBtn) downBtn.onclick = () => { const a = document.createElement('a'); a.href = vu; a.download = dlName; a.click(); };
      return;
    }
    let objUrl = '';
    try {
      const rec = await Store.files.get(c.id);
      if (!rec || !rec.blob) { host.innerHTML = `<div class="pdf-fail">${ic('alert')}<span>Não foi possível carregar o PDF. Tente baixar pelo botão abaixo.</span></div>`; Icons.apply(host); return; }
      objUrl = URL.createObjectURL(rec.blob);
      // sem fragmento (#...) — em blob: o Chrome não carrega o visualizador de PDF com fragmento
      host.innerHTML = `<iframe class="pdf-frame" src="${objUrl}" title="${esc(c.name)}"></iframe>`;
      const openBtn = $('#pvOpen', card); if (openBtn) openBtn.onclick = () => window.open(objUrl, '_blank', 'noopener');
      const downBtn = $('#pvDown', card); if (downBtn) downBtn.onclick = () => { const a = document.createElement('a'); a.href = objUrl; a.download = c.fileName; a.click(); };
    } catch (e) {
      host.innerHTML = `<div class="pdf-fail">${ic('alert')}<span>Erro ao abrir o PDF.</span></div>`; Icons.apply(host);
    }
    if (objUrl) setTimeout(() => { try { URL.revokeObjectURL(objUrl); } catch (e) {} }, 600000);
  }
  function renewCert(c) {
    const lab = labOf(c);
    const email = (lab && lab.email) || c.labEmail || '';
    const phone = (lab && lab.phone) || c.labPhone || '';
    const labName = c.lab || (lab && lab.name) || 'Laboratório não informado';
    const tel = phone.replace(/[^0-9+]/g, '');
    modal({
      title: 'Renovar certificado', sub: c.name,
      body: `
        <p class="howto-body">Para renovar, entre em contato com o laboratório responsável pela certificação/calibração:</p>
        <div class="renew-lab"><span class="rl-ico">${ic('flask')}</span><div><b>${esc(labName)}</b><span>${c.process ? 'Processo ' + esc(c.process) : ''}${c.number ? ' · Cert. ' + esc(c.number) : ''}</span></div></div>
        <div class="renew-contacts">
          ${email ? `<a class="btn" href="mailto:${esc(email)}?subject=${encodeURIComponent('Renovação certificado ' + (c.number || c.name))}">${ic('mail')}${esc(email)}</a>` : ''}
          ${tel ? `<a class="btn" href="tel:${esc(tel)}">${ic('phone')}${esc(phone)}</a>` : ''}
          ${(!email && !tel) ? `<div class="form-inline-note">${ic('alert')}<span>Cadastre o e-mail/telefone deste laboratório na aba <b>Laboratórios parceiros</b>.</span></div>` : ''}
        </div>`,
      footer: `<button class="btn ghost" data-close>Fechar</button><button class="btn primary" id="renewEdit">${ic('edit')}Editar dados</button>`,
    });
    $('#renewEdit', $('#modalCard')).onclick = () => { closeModal(); formCert(c); };
  }

  // página genérica de lista de certificados por tipo (modo lista)
  function certListPage(type, crumbName, title, sub, emptyMsg) {
    pageShell(crumbName, title, sub, `<button class="btn primary" id="addBtn">${ic('plus')}Novo certificado</button>`);
    const all = Store.get('certificates').filter((c) => c.type === type);
    const venc = all.filter((c) => certStatus(c.expiryDate).key === 'vencido').length;
    const soon = all.filter((c) => certStatus(c.expiryDate).key === 'vencendo').length;
    if (all.length) {
      const head = document.createElement('div'); head.className = 'qstat-grid'; head.style.marginBottom = '20px';
      head.innerHTML = `${qaStat(type === 'equipamento' ? 'activity' : 'award', all.length, 'Certificados')}${qaStat('calendar', soon, 'Vencendo (90d)', soon ? 'warn' : '')}${qaStat('alert', venc, 'Vencidos', venc ? 'danger' : '')}`;
      view.appendChild(head); Icons.apply(head); animateStats(head);
    }
    const items = all.slice().sort((a, b) => (certStatus(a.expiryDate).days ?? 1e9) - (certStatus(b.expiryDate).days ?? 1e9));
    const tw = document.createElement('div'); tw.className = 'tbl-wrap';
    tw.innerHTML = items.length
      ? `<table class="data cert-table"><thead><tr><th>Certificado</th><th class="hide-sm">Emissão</th><th>Validade</th><th>Status</th><th></th></tr></thead><tbody>${items.map(certRow).join('')}</tbody></table>`
      : emptyState(type === 'equipamento' ? 'activity' : 'award', 'Nenhum certificado', emptyMsg);
    view.appendChild(tw); Icons.apply(view); bindCertActions(tw);
    $('#addBtn').onclick = () => formCert({ type });
  }

  PAGES['qa-dashboard'] = () => {
    const certs = Store.get('certificates');
    const cata = certs.filter((c) => c.type === 'cata').length;
    const instr = certs.filter((c) => c.type === 'equipamento').length;
    const alerts = qaAlerts();
    const venc = certs.filter((c) => certStatus(c.expiryDate).key === 'vencido').length;
    const soon = certs.filter((c) => certStatus(c.expiryDate).key === 'vencendo').length;
    const qbtn = (icon, title, sub, route, action) => `<button class="qa" data-qa="${action || ''}" data-route-go="${route}"><span class="qa-ico">${ic(icon)}</span><span class="qa-tx"><b>${title}</b><span>${sub}</span></span></button>`;
    view.innerHTML = `
      <div class="page-head">
        <div class="page-title"><span class="eyebrow">Qualidade</span><h1>Dashboard</h1><p>Certificados, vencimentos e laboratórios.</p></div>
        <div class="page-actions"><span class="badge ${alerts.length ? 'warn' : 'ok'}" style="height:38px;padding:0 14px;font-size:.8rem">${alerts.length ? alerts.length + ' aviso(s)' : 'Tudo em dia'}</span></div>
      </div>
      <div class="qstat-grid g4">
        ${qaStat('award', certs.length, 'Certificados')}
        ${qaStat('check', cata, 'InMetro')}
        ${qaStat('calendar', soon, 'Vencendo (90d)', soon ? 'warn' : '')}
        ${qaStat('alert', venc, 'Vencidos', venc ? 'danger' : '')}
      </div>
      <div class="section-head"><h2><span class="sh-ico">${ic('flash')}</span>Atalhos rápidos</h2></div>
      <div class="qa-grid">
        ${qbtn('plus', 'Novo certificado', 'Cadastrar certificado', 'qa-cata', 'add-cert')}
        ${qbtn('award', 'Certificados InMetro', 'Produtos · INMETRO', 'qa-cata', '')}
        ${qbtn('activity', 'Calibração de Equipamentos', 'Equipamentos de medição', 'qa-equipamentos', '')}
        ${qbtn('refresh', 'Manutenção Certificados', 'Manutenção · validade', 'qa-manutencao', '')}
        ${qbtn('shield', 'Controle de EPI', 'CA, validade e entregas', 'epi', '')}
        ${qbtn('flask', 'Laboratórios parceiros', 'Cadastro e contatos', 'qa-labs', '')}
      </div>
      <div class="section-head"><h2><span class="sh-ico">${ic('alert')}</span>Vencimentos</h2><span class="badge ${alerts.length ? 'warn' : 'ok'}">${alerts.length} aviso(s)</span></div>
      <div class="panel">${alerts.length ? alerts.map((al) => `<div class="alert-row al-${al.kind}"><span class="al-ico">${ic('alert')}</span><span class="al-tx"><b>${esc(al.t)}</b><span>${esc(al.s)}</span></span></div>`).join('') : `<div class="empty-ok"><span class="eo-ico">${ic('check')}</span><div><b style="color:var(--text)">Sem vencimentos próximos.</b><div style="font-size:.82rem;color:var(--text-3)">Nenhum certificado vencido ou a vencer em 90 dias.</div></div></div>`}</div>`;
    Icons.apply(view);
    $$('[data-qa]', view).forEach((b) => (b.onclick = () => { const act = b.dataset.qa; go(b.dataset.routeGo); if (act === 'add-cert') setTimeout(() => formCert({ type: 'cata' }), 60); }));
  };

  PAGES['qa-cata'] = () => certListPage('cata', 'Certificados InMetro', 'Certificados InMetro', 'Certificados de produtos (INMETRO) — emissão, validade e renovação.', 'Cadastre o primeiro certificado InMetro.');
  PAGES['qa-equipamentos'] = () => certListPage('equipamento', 'Calibração de Equipamentos', 'Calibração de Equipamentos', 'Equipamentos de medição — calibração, validade e renovação.', 'Cadastre o primeiro equipamento.');
  PAGES['qa-manutencao'] = () => certListPage('manutencao', 'Manutenção Certificados', 'Manutenção Certificados', 'Certificados de manutenção — emissão, validade e renovação.', 'Cadastre o primeiro certificado de manutenção.');

  /* ---------- Laboratórios parceiros ---------- */
  // laboratório vinculado a um certificado (casamento pelo nome)
  function labOf(c) {
    const nm = (c && c.lab || '').trim().toLowerCase();
    if (!nm) return null;
    return Store.get('labs').find((l) => (l.name || '').trim().toLowerCase() === nm) || null;
  }
  // quantos certificados usam este laboratório
  function certCountForLab(lab) {
    const nm = (lab.name || '').trim().toLowerCase();
    return Store.get('certificates').filter((c) => (c.lab || '').trim().toLowerCase() === nm).length;
  }

  PAGES['qa-labs'] = () => {
    pageShell('Laboratórios parceiros', 'Laboratórios parceiros', 'Cadastre uma vez e vincule aos certificados na hora do cadastro.', `<button class="btn primary" id="addBtn">${ic('plus')}Novo laboratório</button>`);
    const labs = Store.get('labs').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const grid = document.createElement('div'); grid.className = 'lab-grid';
    grid.innerHTML = labs.length ? labs.map((l) => {
      const n = certCountForLab(l);
      return `<div class="lab-card">
        <div class="lab-top"><span class="lab-ico">${ic('flask')}</span>
          <div class="lab-actions"><button class="mini-btn" data-edit="${l.id}" title="Editar">${ic('edit')}</button><button class="mini-btn danger" data-del="${l.id}" title="Excluir">${ic('trash')}</button></div>
        </div>
        <h3>${esc(l.name)}</h3>
        <div class="lab-meta">
          ${l.email ? `<a href="mailto:${esc(l.email)}">${ic('mail')}${esc(l.email)}</a>` : ''}
          ${l.phone ? `<a href="tel:${esc((l.phone || '').replace(/[^0-9+]/g, ''))}">${ic('phone')}${esc(l.phone)}</a>` : ''}
          ${l.site ? `<a href="${esc(l.site)}" target="_blank" rel="noopener">${ic('globe')}Site</a>` : ''}
          ${(!l.email && !l.phone && !l.site) ? `<span class="lab-empty">Sem contato cadastrado</span>` : ''}
        </div>
        ${l.notes ? `<p class="lab-notes">${esc(l.notes)}</p>` : ''}
        <span class="lab-count">${ic('award')}${n} certificado${n === 1 ? '' : 's'} vinculado${n === 1 ? '' : 's'}</span>
      </div>`;
    }).join('') : emptyState('flask', 'Nenhum laboratório', 'Cadastre o primeiro laboratório parceiro.');
    view.appendChild(grid); Icons.apply(view);
    $('#addBtn').onclick = () => formLab();
    $$('[data-edit]', grid).forEach((b) => (b.onclick = () => formLab(Store.find('labs', b.dataset.edit))));
    $$('[data-del]', grid).forEach((b) => (b.onclick = () => {
      const l = Store.find('labs', b.dataset.del); const n = certCountForLab(l);
      const warn = n ? ` Há ${n} certificado(s) vinculado(s) — eles ficarão sem laboratório.` : '';
      confirmDialog(`Excluir o laboratório "${esc(l.name)}"?${warn}`, () => { Store.remove('labs', l.id); refreshPage(); toast('Laboratório excluído', 'info'); });
    }));
  };

  function formLab(l) {
    const editing = !!(l && l.id); l = l || {};
    const oldName = l.name || '';
    const card = modal({
      title: editing ? 'Editar laboratório' : 'Novo laboratório parceiro', sub: 'Qualidade',
      body: `<div class="form-grid">
        ${field('Nome do laboratório', 'name', l.name, 'text', { full: true, ph: 'Ex: LG METROLOGIA' })}
        ${field('E-mail', 'email', l.email, 'email', { ph: 'contato@laboratorio.com' })}
        ${field('Telefone', 'phone', l.phone, 'text', { ph: '(11) 0000-0000' })}
        ${field('Site', 'site', l.site, 'text', { full: true, ph: 'https://…' })}
        ${field('Observações', 'notes', l.notes, 'textarea', { full: true })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome do laboratório', 'warn');
      const rec = { name: d.name, email: d.email, phone: d.phone, site: d.site, notes: d.notes };
      if (editing) {
        Store.update('labs', l.id, rec);
        // se renomeou, mantém os certificados vinculados (atualiza o nome neles)
        if (oldName && oldName !== d.name) {
          Store.get('certificates').filter((c) => (c.lab || '').trim().toLowerCase() === oldName.trim().toLowerCase())
            .forEach((c) => Store.update('certificates', c.id, { lab: d.name }));
        }
      } else Store.add('labs', rec);
      toast(editing ? 'Laboratório atualizado' : 'Laboratório cadastrado'); closeModal(); if (PAGES[currentRoute]) refreshPage();
    };
  }

  function formCert(c) {
    const editing = !!(c && c.id); c = c || {};
    let pickedFile = null;
    const card = modal({
      wide: true, title: editing ? 'Editar certificado' : 'Novo certificado', sub: 'Qualidade',
      body: `<div class="form-grid">
        ${field('Nome / equipamento', 'name', c.name, 'text', { full: true, ph: 'Ex: Torquímetro Gedore (20-100 Nm)' })}
        ${field('Tipo', 'type', c.type || 'cata', 'select', { options: [{ v: 'cata', t: 'Certificado CATA (produto)' }, { v: 'equipamento', t: 'Calibração de equipamento' }, { v: 'manutencao', t: 'Manutenção de certificado' }] })}
        ${field('Nº do certificado', 'number', c.number, 'text', { ph: 'Ex: CCM62604/26' })}
        ${field('Processo / TAG', 'process', c.process, 'text', { ph: 'CATA: 2024MEC171 · Equip.: EM 013' })}
        ${field('Serial / Nº de série', 'serial', c.serial, 'text', { ph: 'Ex: F210418' })}
        ${field('Intervalo (dias)', 'intervalDays', c.intervalDays || '365', 'text', { ph: '365', hint: 'Periodicidade da calibração (equipamentos).' })}
        ${field('Data de emissão / calibração', 'issueDate', c.issueDate, 'date')}
        ${field('Data de validade / próxima calibração', 'expiryDate', c.expiryDate, 'date')}
        <div class="field full"><label>Arquivo do certificado (PDF)</label>
          <label class="file-drop" id="certDrop">
            <input type="file" id="certFile" accept="application/pdf" hidden>
            <span class="fd-ico">${ic(c.fileName ? 'file' : 'upload')}</span>
            <span class="fd-tx" id="certFileTx">${c.fileName ? esc(c.fileName) : 'Clique para selecionar ou arraste o PDF aqui'}</span>
          </label>
          <span class="hint">O PDF fica salvo na nuvem (Supabase) e no navegador, alimentando os botões compartilhar e baixar.${c.fileName ? ' Selecione outro para substituir.' : ''}</span></div>
        ${field('Laboratório parceiro', 'lab', c.lab || '', 'select', { full: true, options: [{ v: '', t: '— selecione um laboratório —' }].concat(Store.get('labs').slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((l) => ({ v: l.name, t: l.name }))), hint: 'E-mail e telefone vêm do cadastro em Qualidade → Laboratórios parceiros.' })}
        ${field('Observações', 'notes', c.notes, 'textarea', { full: true })}
      </div>`,
      footer: submitFooter(editing),
    });
    const fileInput = $('#certFile', card), drop = $('#certDrop', card), txEl = $('#certFileTx', card);
    const setFile = (f) => { if (!f) return; if (f.type && f.type !== 'application/pdf') return toast('Selecione um arquivo PDF', 'warn'); pickedFile = f; txEl.textContent = f.name; };
    fileInput.onchange = () => setFile(fileInput.files[0]);
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drag'); setFile(e.dataTransfer.files[0]); });
    $('#saveBtn', card).onclick = async () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome do certificado', 'warn');
      const rec = { name: d.name, type: d.type, number: d.number, process: d.process, serial: d.serial, intervalDays: d.intervalDays, issueDate: d.issueDate, expiryDate: d.expiryDate, lab: d.lab, notes: d.notes };
      if (editing) { rec.fileName = c.fileName || ''; rec.fileType = c.fileType || ''; rec.fileSize = c.fileSize || 0; }
      const saved = editing ? Store.update('certificates', c.id, rec) : Store.add('certificates', rec);
      if (pickedFile) {
        if (pickedFile.size > 12 * 1024 * 1024) { toast('PDF muito grande (máx 12 MB)', 'warn'); }
        else {
          try { await Store.files.put(saved.id, pickedFile, { name: pickedFile.name, type: pickedFile.type, size: pickedFile.size }); Store.update('certificates', saved.id, { fileName: pickedFile.name, fileType: pickedFile.type || 'application/pdf', fileSize: pickedFile.size }); }
          catch (e) { toast('Falha ao salvar o arquivo', 'warn'); }
        }
      }
      toast(editing ? 'Certificado atualizado' : 'Certificado adicionado'); afterSave();
    };
  }

  /* ============ SETTINGS ============ */
  PAGES.settings = () => {
    pageShell('Settings', 'Configurações', 'Aparência, dados e preferências do Ops Center.', '');
    const s = Store.get('settings');
    const theme = s.theme || 'dark';
    const co = s.company || {};

    // about metrics
    const colls = ['team', 'computers', 'printers', 'commands', 'runbooks', 'inventory'];
    const records = colls.reduce((n, c) => n + Store.get(c).length, 0) + Store.get('infra').domains.length + Store.get('infra').dns.length;
    let kb = 0; try { kb = Math.max(1, Math.round((localStorage.getItem('convergas_itops_v2') || '').length / 1024)); } catch (e) {}

    // theme tile preview (uses each theme's own colors regardless of active theme)
    const tile = (val, name, icon, c) => `
      <button class="theme-tile ${theme === val ? 'on' : ''}" data-theme-tile="${val}">
        <span class="tt-check">${ic('check')}</span>
        <span class="tt-prev" style="background:${c.bg}">
          <span class="tp-side" style="background:${c.side};border-right:1px solid ${c.line}"></span>
          <span class="tp-main">
            <span class="tp-bar" style="width:55%;background:${c.accent}"></span>
            <span class="tp-bar" style="width:82%;background:${c.b1}"></span>
            <span class="tp-bar" style="width:68%;background:${c.b2}"></span>
          </span>
        </span>
        <span class="tt-name">${ic(icon)}${name}</span>
      </button>`;

    const wrap = document.createElement('div'); wrap.className = 'settings';
    wrap.innerHTML = `
      <div class="set-section">
        <div class="set-grouplabel"><span class="sg-ico">${ic('settings')}</span>Aparência</div>
        <div class="panel set-theme">
          <div class="st-lead">
            <span class="sr-ico">${ic('moon')}</span>
            <div class="sr-tx"><b>Tema da interface</b><span>Escolha entre modo escuro e claro.</span></div>
          </div>
          <div class="theme-picker">
            ${tile('dark', 'Escuro', 'moon', { bg: '#07111F', side: 'linear-gradient(180deg,#122438,#0a1626)', line: 'rgba(255,255,255,.06)', accent: '#5CE1E6', b1: 'rgba(255,255,255,.20)', b2: 'rgba(255,255,255,.12)' })}
            ${tile('light', 'Claro', 'sun', { bg: '#EEF3F9', side: 'linear-gradient(180deg,#ffffff,#f1f5fa)', line: 'rgba(11,27,46,.10)', accent: '#0E9AA2', b1: 'rgba(11,27,46,.22)', b2: 'rgba(11,27,46,.12)' })}
          </div>
        </div>
        <div class="panel">
          <div class="set-row">
            <div class="sr-main"><span class="sr-ico">${ic('flash')}</span>
              <div class="sr-tx"><b>Fundo animado</b><span>Aurora suave em movimento atrás das telas.</span></div></div>
            <label class="switch sr-ctl"><input type="checkbox" id="setBgfx" ${s.bgfx !== false ? 'checked' : ''}><span class="sl"></span></label>
          </div>
        </div>
      </div>

      <div class="set-section">
        <div class="set-grouplabel"><span class="sg-ico">${ic('external')}</span>Links externos</div>
        <div class="panel panel-pad">
          <div class="field full"><label>Guideline / Manual da marca (URL)</label>
            <input id="setGuideUrl" type="url" value="${esc(s.guidelineUrl || '')}" placeholder="https://…">
            <span class="hint">Aberto pela opção GUIDELINE na roda da Home.</span></div>
        </div>
      </div>

      <div class="set-section">
        <div class="set-grouplabel"><span class="sg-ico">${ic('file')}</span>Dados da empresa (documentos)</div>
        <div class="panel panel-pad">
          <div class="form-grid form-compact">
            <div class="field full"><label>Razão social</label><input id="coLegal" value="${esc(co.legal || '')}" placeholder="Convergas Equipamentos e Serviços Ltda"></div>
            <div class="field"><label>CNPJ</label><input id="coCnpj" value="${esc(co.cnpj || '')}" placeholder="00.000.000/0000-00"></div>
            <div class="field"><label>Telefone</label><input id="coPhone" value="${esc(co.phone || '')}" placeholder="(19) 3876-4363"></div>
            <div class="field full"><label>Endereço</label><input id="coAddress" value="${esc(co.address || '')}" placeholder="Rua, número — bairro"></div>
            <div class="field"><label>Cidade</label><input id="coCity" value="${esc(co.city || '')}" placeholder="Vinhedo"></div>
            <div class="field"><label>UF</label><input id="coUf" value="${esc(co.uf || '')}" placeholder="SP" maxlength="2"></div>
            <div class="field"><label>CEP</label><input id="coCep" value="${esc(co.cep || '')}" placeholder="13284-072"></div>
            <div class="field"><label>E-mail</label><input id="coEmail" value="${esc(co.email || '')}" placeholder="atendimento@convergas.com.br"></div>
            <div class="field"><label>Site</label><input id="coSite" value="${esc(co.site || '')}" placeholder="www.convergas.com.br"></div>
          </div>
          <span class="hint">Aparecem no timbre das Ordens de Serviço (tela e PDF). Preencha o CNPJ para constar nos documentos.</span>
        </div>
      </div>

      <div class="set-section">
        <div class="set-grouplabel"><span class="sg-ico">${ic('box')}</span>Dados &amp; backup</div>
        <div class="panel">
          <div class="set-row">
            <div class="sr-main"><span class="sr-ico">${ic('external')}</span>
              <div class="sr-tx"><b>Exportar dados</b><span>Baixa um JSON com todo o inventário (backup completo).</span></div></div>
            <button class="btn sr-ctl" id="expBtn">${ic('external')}Exportar JSON</button>
          </div>
          <div class="set-row danger-row">
            <div class="sr-main"><span class="sr-ico">${ic('trash')}</span>
              <div class="sr-tx"><b>Restaurar dados de exemplo</b><span>Apaga as alterações e recarrega os dados de demonstração.</span></div></div>
            <button class="btn danger sr-ctl" id="resetBtn">${ic('trash')}Restaurar seed</button>
          </div>
        </div>
      </div>

      <div class="set-section">
        <div class="set-grouplabel"><span class="sg-ico">${ic('activity')}</span>Sobre o sistema</div>
        <div class="panel panel-pad">
          <div class="about-grid">
            <div class="ab"><span class="ab-v">v1.0</span><span class="ab-k">Versão · MVP</span></div>
            <div class="ab"><span class="ab-v">${records}</span><span class="ab-k">Registros</span></div>
            <div class="ab"><span class="ab-v">${kb} KB</span><span class="ab-k">Armazenamento</span></div>
            <div class="ab"><span class="ab-v">1</span><span class="ab-k">Administrador</span></div>
          </div>
        </div>
        <div class="set-foot">${ic('shield')}Dados salvos localmente no navegador (localStorage). Nenhuma informação sai do dispositivo.</div>
      </div>`;
    view.appendChild(wrap); Icons.apply(view);

    $$('[data-theme-tile]', wrap).forEach((b) => (b.onclick = () => {
      setTheme(b.dataset.themeTile);
      $$('[data-theme-tile]', wrap).forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('#setBgfx', wrap).onchange = (e) => { Store.setSetting('bgfx', e.target.checked); toggleBgfx(e.target.checked); toast(e.target.checked ? 'Fundo animado ativado' : 'Fundo animado desativado', 'info'); };
    $('#setGuideUrl', wrap).onchange = (e) => { Store.setSetting('guidelineUrl', e.target.value.trim()); toast('Link do guideline salvo', 'ok'); };
    const saveCompany = (k, v) => { const c = Object.assign({}, Store.get('settings').company || {}); c[k] = v; Store.setSetting('company', c); };
    [['coLegal', 'legal'], ['coCnpj', 'cnpj'], ['coPhone', 'phone'], ['coAddress', 'address'], ['coCity', 'city'], ['coUf', 'uf'], ['coCep', 'cep'], ['coEmail', 'email'], ['coSite', 'site']]
      .forEach(([id, k]) => { const el = $('#' + id, wrap); if (el) el.onchange = () => { saveCompany(k, el.value.trim()); toast('Dados da empresa salvos', 'ok'); }; });
    $('#expBtn').onclick = () => {
      const blob = new Blob([Store.export()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'convergas-itops-backup.json'; a.click();
      toast('Backup exportado', 'ok');
    };
    $('#resetBtn').onclick = () => confirmDialog('Restaurar todos os dados de exemplo?', () => { Store.reset(); toast('Dados restaurados', 'info'); go('settings'); });
  };

  /* =====================================================================
     SHARED RENDER HELPERS
     ===================================================================== */
  /* ============================ CONTROLE DE EPI ============================ */
  // o status/validade do CA reusa certStatus (mesma lógica de cores dos certificados)
  const funcNameOf = (id) => { const u = Store.find('team', id); return u ? u.name : ''; };
  const epiEntregaCount = (epiId) => Store.get('epiEntregas').filter((e) => e.epiId === epiId).length;
  const epiPeopleCount = (epiId) => new Set(Store.get('epiEntregas').filter((e) => e.epiId === epiId).map((e) => e.funcionarioId)).size;
  const epiNames = () => Array.from(new Set(Store.get('epis').map((e) => e.name).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const epiCadRow = (e) => { const n = epiPeopleCount(e.id); return `<tr>
      <td><div class="epi-name">${ic('shield')}<span class="cell-main">${esc(e.name)}</span></div></td>
      <td><span class="ppl-badge">${ic('users')}${n}</span> <span class="cell-sub hide-sm">pessoa${n === 1 ? '' : 's'} vinculada${n === 1 ? '' : 's'}</span></td>
      <td><div class="row-actions"><button class="mini-btn" data-epi-edit="${e.id}" title="Editar nome">${ic('edit')}</button><button class="mini-btn danger" data-epi-del="${e.id}" title="Excluir">${ic('trash')}</button></div></td>
    </tr>`; };
  // alertas de validade das ENTREGAS (a validade/CA vem na entrega)
  function epiAlerts() {
    const a = [];
    Store.get('epiEntregas').slice().sort((x, y) => (certStatus(x.expiryDate).days ?? 1e9) - (certStatus(y.expiryDate).days ?? 1e9)).forEach((en) => {
      if (!en.expiryDate) return;
      const st = certStatus(en.expiryDate); const who = en.funcName || funcNameOf(en.funcionarioId) || '—';
      const nm = en.epiName || (Store.find('epis', en.epiId) || {}).name || 'EPI';
      if (st.key === 'vencido') a.push({ kind: 'danger', t: `EPI "${nm}" de ${who} vencido`, s: `CA ${en.ca || '—'} · validade ${fmtDate(en.expiryDate)}` });
      else if (st.key === 'vencendo') a.push({ kind: 'warn', t: `EPI "${nm}" de ${who} ${st.label.toLowerCase()}`, s: `CA ${en.ca || '—'} · validade ${fmtDate(en.expiryDate)}` });
    });
    return a;
  }

  // FICHA por colaborador — criada na 1ª entrega, numerada em ordem
  function ensureFicha(funcionarioId, u) {
    let f = Store.get('epiFichas').find((x) => x.funcionarioId === funcionarioId);
    if (f) return f;
    const seq = Store.get('epiFichas').reduce((m, x) => Math.max(m, x.seq || 0), 0) + 1;
    return Store.add('epiFichas', { funcionarioId, funcName: u ? u.name : funcNameOf(funcionarioId), funcSector: u ? (u.sector || '') : '', seq, createdAt: todayISO() });
  }
  const fichaEntregas = (funcId) => Store.get('epiEntregas').filter((e) => e.funcionarioId === funcId).slice().sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || ''));
  function fichaStatus(funcId) {
    const list = fichaEntregas(funcId);
    return { count: list.length, venc: list.filter((e) => certStatus(e.expiryDate).key === 'vencido').length, soon: list.filter((e) => certStatus(e.expiryDate).key === 'vencendo').length };
  }
  const initialsOf = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0] || '').join('').toUpperCase() || '?';
  const fichaCard = (f) => {
    const s = fichaStatus(f.funcionarioId);
    const tone = s.venc ? 'danger' : (s.soon ? 'warn' : 'ok');
    const badge = s.venc ? `<span class="badge danger">${s.venc} vencido${s.venc > 1 ? 's' : ''}</span>` : (s.soon ? `<span class="badge warn">${s.soon} vencendo</span>` : `<span class="badge ok">Em dia</span>`);
    return `<button class="ficha-card t-${tone}" data-ficha="${f.id}">
      <div class="fc-top"><span class="fc-num">Ficha Nº ${esc(String(f.seq))}</span>${badge}</div>
      <div class="fc-id"><span class="fc-av">${esc(initialsOf(f.funcName))}</span><div class="fc-tx"><b>${esc(f.funcName || '—')}</b><span>${esc(f.funcSector || 'Colaborador')}</span></div></div>
      <div class="fc-foot"><span class="fc-count">${ic('shield')}${s.count} EPI${s.count === 1 ? '' : 's'}</span><span class="fc-open">Abrir ficha ${ic('external')}</span></div>
    </button>`;
  };
  const fichaEntregaItem = (en) => {
    const st = certStatus(en.expiryDate); const nm = en.epiName || (Store.find('epis', en.epiId) || {}).name || '—';
    return `<div class="ficha-item">
      <div class="fi-main"><span class="fi-ico">${ic('shield')}</span><div class="fi-tx"><b>${esc(nm)}${en.signature ? ` <span class="fi-check" title="Assinado">${ic('check')}</span>` : ''}</b><span>CA ${esc(en.ca || '—')} · entrega ${fmtDate(en.deliveryDate) || '—'}${en.notes ? ' · ' + esc(en.notes) : ''}</span></div></div>
      <div class="fi-val">${en.expiryDate ? `<span class="badge ${st.cls}">${esc(st.label)}</span><span class="fi-date">val. ${fmtDate(en.expiryDate)}</span>` : '<span class="cell-sub">sem validade</span>'}</div>
      <div class="row-actions"><button class="mini-btn" data-ent-doc="${en.id}" title="Baixar atestado (PDF)">${ic('download')}</button><button class="mini-btn" data-ent-edit="${en.id}" title="Editar">${ic('edit')}</button><button class="mini-btn danger" data-ent-del="${en.id}" title="Excluir">${ic('trash')}</button></div>
    </div>`;
  };

  PAGES['epi'] = () => {
    pageShell('Controle de EPI', 'Controle de EPI', 'EPIs usados na Convergas, entregas aos colaboradores e atestados de recebimento.', `<button class="btn" id="addEpiBtn">${ic('shield')}Novo EPI</button><button class="btn primary" id="addEntregaBtn">${ic('plus')}Nova entrega</button>`);
    const epis = Store.get('epis'), entregas = Store.get('epiEntregas');
    const venc = entregas.filter((e) => certStatus(e.expiryDate).key === 'vencido').length;
    const soon = entregas.filter((e) => certStatus(e.expiryDate).key === 'vencendo').length;

    const head = document.createElement('div'); head.className = 'qstat-grid g4'; head.style.marginBottom = '20px';
    head.innerHTML = `${qaStat('shield', epis.length, 'EPIs cadastrados')}${qaStat('users', entregas.length, 'Entregas')}${qaStat('calendar', soon, 'Vencendo (90d)', soon ? 'warn' : '')}${qaStat('alert', venc, 'Vencidos', venc ? 'danger' : '')}`;
    view.appendChild(head); Icons.apply(head); animateStats(head);

    // FICHAS de EPI (perfis de colaboradores) — conteúdo principal
    const fichas = Store.get('epiFichas').slice().sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const fSec = document.createElement('div'); fSec.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('users')}</span>Fichas de EPI</h2><span class="badge plain">${fichas.length}</span></div>`;
    view.appendChild(fSec); Icons.apply(fSec);
    let grid;
    if (fichas.length) {
      grid = document.createElement('div'); grid.className = 'ficha-grid';
      grid.innerHTML = fichas.map(fichaCard).join('');
      view.appendChild(grid); Icons.apply(grid);
      $$('.ficha-card', grid).forEach((b) => (b.onclick = () => viewFicha(Store.find('epiFichas', b.dataset.ficha))));
    } else {
      const emp = document.createElement('div'); emp.className = 'tbl-wrap';
      emp.innerHTML = emptyState('users', 'Nenhuma ficha ainda', 'Registre uma entrega para criar a ficha de um colaborador.');
      view.appendChild(emp); Icons.apply(emp);
    }

    // dashboard de vencimento (validade das entregas)
    const alerts = epiAlerts();
    const alSec = document.createElement('div');
    alSec.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('alert')}</span>Vencimento de validade</h2><span class="badge ${alerts.length ? 'warn' : 'ok'}">${alerts.length} aviso(s)</span></div>
      <div class="panel">${alerts.length ? alerts.map((al) => `<div class="alert-row al-${al.kind}"><span class="al-ico">${ic('alert')}</span><span class="al-tx"><b>${esc(al.t)}</b><span>${esc(al.s)}</span></span></div>`).join('') : `<div class="empty-ok"><span class="eo-ico">${ic('check')}</span><div><b style="color:var(--text)">Nenhuma validade vencida ou a vencer.</b><div style="font-size:.82rem;color:var(--text-3)">Todas as entregas estão válidas por mais de 90 dias.</div></div></div>`}</div>`;
    view.appendChild(alSec); Icons.apply(alSec);

    // EPIs cadastrados (tabela: nome · pessoas vinculadas · editar/excluir)
    const catSec = document.createElement('div'); catSec.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('shield')}</span>EPIs cadastrados</h2><span class="badge plain">${epis.length}</span></div>`;
    view.appendChild(catSec); Icons.apply(catSec);
    const catItems = epis.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const catTw = document.createElement('div'); catTw.className = 'tbl-wrap';
    catTw.innerHTML = catItems.length
      ? `<table class="data"><thead><tr><th>EPI</th><th>Pessoas vinculadas</th><th></th></tr></thead><tbody>${catItems.map(epiCadRow).join('')}</tbody></table>`
      : emptyState('shield', 'Nenhum EPI cadastrado', 'Use “Novo EPI” para registrar os EPIs usados na Convergas.');
    view.appendChild(catTw); Icons.apply(catTw);

    $('#addEpiBtn').onclick = () => formEpi();
    $('#addEntregaBtn').onclick = () => { if (!Store.get('epis').length) return toast('Cadastre um EPI primeiro (Novo EPI)', 'warn'); formEpiEntrega(); };
    $$('[data-epi-edit]', catTw).forEach((b) => (b.onclick = () => formEpi(Store.find('epis', b.dataset.epiEdit))));
    $$('[data-epi-del]', catTw).forEach((b) => (b.onclick = () => { const e = Store.find('epis', b.dataset.epiDel); if (!e) return; const n = epiEntregaCount(e.id); const w = n ? ` Há ${n} entrega(s) que citam este EPI.` : ''; confirmDialog(`Excluir o EPI "${esc(e.name)}"?${w}`, () => { Store.remove('epis', e.id); refreshPage(); toast('EPI excluído', 'info'); }); }));
  };

  // Novo EPI — apenas o nome (mantém a lista dos EPIs usados na Convergas)
  function formEpi(e) {
    const editing = !!(e && e.id); e = e || {};
    const names = epiNames();
    const card = modal({
      title: editing ? 'Editar EPI' : 'Novo EPI', sub: 'Cadastro do EPI (nome)',
      body: `<div class="form-grid">
        <div class="field full"><label>Nome do EPI</label><input name="name" list="epiNameList" value="${esc(e.name || '')}" placeholder="Ex: Luva nitrílica, Óculos de proteção, Protetor auricular"><datalist id="epiNameList">${names.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist><span class="hint">Cadastra o EPI usado na Convergas. O CA e a validade são informados na entrega.</span></div>
      </div>`,
      footer: submitFooter(editing),
    });
    setTimeout(() => { const el = card.querySelector('[name="name"]'); if (el) el.focus(); }, 60);
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome do EPI', 'warn');
      if (editing) Store.update('epis', e.id, { name: d.name }); else Store.add('epis', { name: d.name });
      toast(editing ? 'EPI atualizado' : 'EPI cadastrado'); closeModal(); if (PAGES[currentRoute]) refreshPage();
    };
  }

  // Nova entrega — EPI + colaborador + CA + datas + observação + assinatura
  function formEpiEntrega(en, after) {
    const editing = !!(en && en.id); en = en || {};
    const epis = Store.get('epis').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const team = Store.get('team').slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const epiOpts = [{ v: '', t: '— selecione o EPI —' }].concat(epis.map((x) => ({ v: x.id, t: x.name })));
    const funcOpts = [{ v: '', t: '— selecione o colaborador —' }].concat(team.map((u) => ({ v: u.id, t: u.name + (u.sector ? ` · ${u.sector}` : '') })));
    const card = modal({
      wide: true, title: editing ? 'Editar entrega' : 'Nova entrega de EPI', sub: 'Recebimento pelo colaborador',
      body: `<div class="form-grid">
        ${field('EPI', 'epiId', en.epiId || '', 'select', { full: true, options: epiOpts })}
        ${field('Colaborador (recebe)', 'funcionarioId', en.funcionarioId || '', 'select', { full: true, options: funcOpts })}
        ${field('Nº do CA', 'ca', en.ca, 'text', { ph: 'Ex: 38.842' })}
        ${field('Data de entrega', 'deliveryDate', en.deliveryDate || todayISO(), 'date')}
        ${field('Validade', 'expiryDate', en.expiryDate, 'date')}
        ${field('Observação', 'notes', en.notes, 'text', { ph: 'Opcional' })}
        <div class="field full"><label>Assinatura de quem recebe</label>
          <div class="sig-wrap"><canvas id="sigPad" class="sig-pad" width="640" height="200"></canvas><button type="button" class="btn ghost sm sig-clear" id="sigClear">${ic('trash')}Limpar</button></div>
          <span class="hint">Assine no quadro acima — dedo no celular, mouse no computador.</span></div>
      </div>`,
      footer: submitFooter(editing),
    });
    const sig = initSignaturePad($('#sigPad', card), en.signature);
    $('#sigClear', card).onclick = () => sig.clear();
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.epiId) return toast('Selecione o EPI', 'warn');
      if (!d.funcionarioId) return toast('Selecione o colaborador', 'warn');
      const epi = Store.find('epis', d.epiId), u = Store.find('team', d.funcionarioId);
      ensureFicha(d.funcionarioId, u); // cria a ficha do colaborador se ainda não existir
      const rec = { epiId: d.epiId, epiName: epi ? epi.name : '', funcionarioId: d.funcionarioId, funcName: u ? u.name : '', funcSector: u ? (u.sector || '') : '', ca: d.ca, deliveryDate: d.deliveryDate, expiryDate: d.expiryDate, notes: d.notes, signature: sig.isEmpty() ? (en.signature || '') : sig.toDataURL() };
      if (editing) Store.update('epiEntregas', en.id, rec); else Store.add('epiEntregas', rec);
      toast(editing ? 'Entrega atualizada' : 'Entrega registrada'); closeModal();
      if (after) after(); else if (PAGES[currentRoute]) refreshPage();
    };
  }

  // pad de assinatura (desenho no canvas) — funciona com mouse e toque
  function initSignaturePad(canvas, initialDataUrl) {
    if (!canvas) return { clear() {}, isEmpty: () => true, toDataURL: () => '' };
    const ctx = canvas.getContext('2d');
    let drawing = false, empty = true, last = null;
    const paintBg = () => { ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); };
    paintBg();
    ctx.strokeStyle = '#0f1720'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (initialDataUrl) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height); img.src = initialDataUrl; empty = false; }
    const pos = (ev) => { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * (canvas.width / r.width), y: (ev.clientY - r.top) * (canvas.height / r.height) }; };
    const start = (ev) => { ev.preventDefault(); drawing = true; empty = false; last = pos(ev); try { canvas.setPointerCapture(ev.pointerId); } catch (x) {} };
    const move = (ev) => { if (!drawing) return; ev.preventDefault(); const p = pos(ev); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; };
    const end = () => { drawing = false; };
    canvas.addEventListener('pointerdown', start); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', end); canvas.addEventListener('pointerleave', end);
    return { clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); paintBg(); empty = true; }, isEmpty: () => empty, toDataURL: () => canvas.toDataURL('image/png') };
  }

  // Atestado de recebimento de EPI (PDF A4, fundo branco, texto técnico + assinatura)
  function epiAtestadoHTML(en) {
    const co = Store.get('settings').company || {};
    const u = Store.find('team', en.funcionarioId);
    const nome = en.funcName || (u && u.name) || '—';
    const setor = en.funcSector || (u && u.sector) || '';
    const epiNome = en.epiName || (Store.find('epis', en.epiId) || {}).name || '—';
    const linhaCo = [co.legal || co.name || 'Convergas Fuel Systems', co.cnpj ? 'CNPJ ' + co.cnpj : '', co.address || ''].filter(Boolean).join(' · ');
    const f = (k, v) => `<tr><td class="atk">${esc(k)}</td><td class="atv">${(v == null || v === '') ? '—' : esc(String(v))}</td></tr>`;
    return `<div class="atestado">
      <div class="at-head"><img src="assets/logo-icone.png" alt=""><div><b>${esc(co.name || 'Convergas Fuel Systems')}</b><span>${esc(linhaCo)}</span></div></div>
      <h1 class="at-title">Termo de Recebimento de Equipamento de Proteção Individual — EPI</h1>
      <p class="at-p">Eu, <b>${esc(nome)}</b>${setor ? `, do setor <b>${esc(setor)}</b>` : ''}, declaro para os devidos fins que recebi da empresa <b>${esc(co.name || 'Convergas Fuel Systems')}</b>, de forma gratuita, o Equipamento de Proteção Individual (EPI) abaixo discriminado, em perfeitas condições de uso, tendo sido devidamente orientado(a) quanto à sua correta utilização, higienização, guarda e conservação, nos termos da Norma Regulamentadora NR-06 do Ministério do Trabalho e Emprego.</p>
      <table class="at-tbl"><tbody>${f('EPI', epiNome)}${f('Certificado de Aprovação (CA)', en.ca)}${f('Data de entrega', fmtDate(en.deliveryDate))}${f('Validade', fmtDate(en.expiryDate))}${en.notes ? f('Observação', en.notes) : ''}</tbody></table>
      <p class="at-p">Comprometo-me a utilizar o referido EPI exclusivamente para a finalidade a que se destina, a zelar por sua guarda e conservação, a comunicar ao empregador qualquer alteração que o torne impróprio para uso e a devolvê-lo quando solicitado ou ao término de sua validade. Declaro estar ciente de que o uso é obrigatório e de que a sua não utilização constitui ato faltoso, nos termos do art. 158 da CLT e da NR-06.</p>
      <div class="at-sign"><div class="at-sig-box">${en.signature ? `<img class="at-sig-img" src="${esc(en.signature)}" alt="assinatura">` : ''}<i></i><span>${esc(nome)}</span><small>Assinatura do colaborador</small></div></div>
      <div class="at-foot">${esc(linhaCo)}${co.city ? ' · ' + esc(co.city) + '/' + esc(co.uf || '') : ''} — documento gerado em ${fmtDate(todayISO())}</div>
    </div>`;
  }
  // rasteriza um documento branco (.atestado) e salva como PDF A4 (compartilhado atestado/ficha)
  async function epiDocToPdf(innerHTML, filename) {
    toast('Gerando PDF…', 'info');
    let holder;
    try {
      await loadScript('js/vendor/html2canvas.min.js');
      await loadScript('js/vendor/jspdf.umd.min.js');
      holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;background:#fff;z-index:-1;';
      holder.innerHTML = innerHTML;
      document.body.appendChild(holder);
      const imgs = Array.from(holder.querySelectorAll('img'));
      await Promise.all(imgs.map((im) => (im.complete && im.naturalWidth) ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; })));
      const canvas = await window.html2canvas(holder.querySelector('.atestado'), { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(holder); holder = null;
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 12, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const imgW = pw - margin * 2, pxPerMm = canvas.width / imgW, pageHpx = (ph - margin * 2) * pxPerMm;
      let renderedH = 0;
      while (renderedH < canvas.height) {
        const sh = Math.min(pageHpx, canvas.height - renderedH);
        const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = sh;
        const cx = slice.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, slice.width, sh);
        cx.drawImage(canvas, 0, renderedH, canvas.width, sh, 0, 0, canvas.width, sh);
        if (renderedH > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, sh / pxPerMm);
        renderedH += sh;
      }
      pdf.save(filename);
      toast('PDF gerado', 'ok');
    } catch (e) {
      if (holder) { try { document.body.removeChild(holder); } catch (x) {} }
      toast('Falha ao gerar o PDF', 'warn');
    }
  }
  const exportEpiAtestadoPdf = (en) => { if (en) epiDocToPdf(epiAtestadoHTML(en), `Atestado-EPI-${String(en.funcName || 'colaborador').replace(/\s+/g, '_')}.pdf`); };

  // Ficha de EPI (documento consolidado A4) — todos os EPIs do colaborador
  function epiFichaHTML(f) {
    const co = Store.get('settings').company || {};
    const linhaCo = [co.legal || co.name || 'Convergas Fuel Systems', co.cnpj ? 'CNPJ ' + co.cnpj : '', co.address || ''].filter(Boolean).join(' · ');
    const list = fichaEntregas(f.funcionarioId).slice().sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
    const rows = list.map((en, i) => {
      const nm = en.epiName || (Store.find('epis', en.epiId) || {}).name || '—';
      return `<tr><td class="tc">${i + 1}</td><td>${esc(nm)}</td><td>${esc(en.ca || '—')}</td><td class="tc">${fmtDate(en.deliveryDate) || '—'}</td><td class="tc">${fmtDate(en.expiryDate) || '—'}</td><td class="at-sigcell">${en.signature ? `<img src="${esc(en.signature)}" alt="">` : ''}</td></tr>`;
    }).join('');
    return `<div class="atestado ficha-doc">
      <div class="at-head"><img src="assets/logo-icone.png" alt=""><div><b>${esc(co.name || 'Convergas Fuel Systems')}</b><span>${esc(linhaCo)}</span></div><span class="at-ficha-n">Ficha Nº ${esc(String(f.seq))}</span></div>
      <h1 class="at-title">Ficha de Controle e Entrega de Equipamentos de Proteção Individual — EPI</h1>
      <table class="at-tbl"><tbody><tr><td class="atk">Colaborador</td><td class="atv">${esc(f.funcName || '—')}</td></tr><tr><td class="atk">Setor</td><td class="atv">${esc(f.funcSector || '—')}</td></tr><tr><td class="atk">Ficha aberta em</td><td class="atv">${fmtDate(f.createdAt)}</td></tr></tbody></table>
      <p class="at-p">Declaro ter recebido da empresa <b>${esc(co.name || 'Convergas Fuel Systems')}</b>, de forma gratuita, os Equipamentos de Proteção Individual (EPI) relacionados abaixo, em perfeitas condições de uso, comprometendo-me a utilizá-los de forma correta e obrigatória, a zelar por sua guarda e conservação e a devolvê-los quando solicitado, nos termos da Norma Regulamentadora NR-06 e do art. 158 da CLT. A assinatura em cada linha comprova o recebimento do respectivo EPI.</p>
      <table class="at-tbl at-list"><thead><tr><th class="tc">#</th><th>EPI</th><th>CA</th><th class="tc">Entrega</th><th class="tc">Validade</th><th class="tc">Assinatura</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="tc">Nenhum EPI registrado.</td></tr>`}</tbody></table>
      <div class="at-foot">${esc(linhaCo)}${co.city ? ' · ' + esc(co.city) + '/' + esc(co.uf || '') : ''} — documento gerado em ${fmtDate(todayISO())}</div>
    </div>`;
  }
  const exportEpiFichaPdf = (f) => { if (f) epiDocToPdf(epiFichaHTML(f), `Ficha-EPI-${String(f.funcName || 'colaborador').replace(/\s+/g, '_')}.pdf`); };

  // Modal da FICHA de um colaborador
  function viewFicha(f) {
    if (!f) return;
    const list = fichaEntregas(f.funcionarioId); const s = fichaStatus(f.funcionarioId);
    const reopen = () => { if (PAGES[currentRoute]) refreshPage(); const cur = Store.find('epiFichas', f.id); if (cur) viewFicha(cur); };
    const card = modal({
      wide: true, title: `Ficha de EPI Nº ${esc(String(f.seq))}`, sub: `${esc(f.funcName || '')}${f.funcSector ? ' · ' + esc(f.funcSector) : ''}`,
      body: `<div class="ficha-view">
        <div class="ficha-hd"><span class="fc-av lg">${esc(initialsOf(f.funcName))}</span><div class="fh-tx"><b>${esc(f.funcName || '—')}</b><span>${esc(f.funcSector || 'Colaborador')} · ${s.count} EPI(s) · aberta em ${fmtDate(f.createdAt)}</span></div></div>
        ${list.length ? `<div class="ficha-list">${list.map(fichaEntregaItem).join('')}</div>` : `<div class="tbl-wrap">${emptyState('shield', 'Sem EPIs nesta ficha', 'Adicione uma entrega para esta pessoa.')}</div>`}
      </div>`,
      footer: `<button class="btn ghost" data-close>Fechar</button><button class="btn danger" id="fichaDel">${ic('trash')}Excluir ficha</button><button class="btn" id="fichaPdf">${ic('download')}Baixar ficha</button><button class="btn primary" id="fichaAdd">${ic('plus')}Nova entrega</button>`,
    });
    Icons.apply(card);
    $('#fichaAdd', card).onclick = () => { closeModal(); formEpiEntrega({ funcionarioId: f.funcionarioId }, reopen); };
    $('#fichaPdf', card).onclick = () => exportEpiFichaPdf(f);
    $('#fichaDel', card).onclick = () => confirmDialog(`Excluir a ficha de ${esc(f.funcName || '')} e as ${s.count} entrega(s)?`, () => { fichaEntregas(f.funcionarioId).forEach((e) => Store.remove('epiEntregas', e.id)); Store.remove('epiFichas', f.id); closeModal(); refreshPage(); toast('Ficha excluída', 'info'); });
    $$('[data-ent-doc]', card).forEach((b) => (b.onclick = () => exportEpiAtestadoPdf(Store.find('epiEntregas', b.dataset.entDoc))));
    $$('[data-ent-edit]', card).forEach((b) => (b.onclick = () => { closeModal(); formEpiEntrega(Store.find('epiEntregas', b.dataset.entEdit), reopen); }));
    $$('[data-ent-del]', card).forEach((b) => (b.onclick = () => confirmDialog('Excluir esta entrega?', () => { Store.remove('epiEntregas', b.dataset.entDel); reopen(); toast('Entrega excluída', 'info'); })));
  }

  function pageShell(crumbName, title, sub, actions) {
    crumb.textContent = crumbName;
    view.innerHTML = `
      <div class="page-head">
        <div class="page-title"><span class="eyebrow">${esc(crumbName)}</span><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
        <div class="page-actions">${actions || ''}</div>
      </div>`;
    Icons.apply(view);
  }

  function renderTable(head, rowsFn, coll) {
    const tw = document.createElement('div'); tw.className = 'tbl-wrap';
    const rowsHtml = rowsFn();
    tw.innerHTML = `<table class="data"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rowsHtml || ''}</tbody></table>`;
    if (!rowsHtml) tw.innerHTML = emptyState('list', 'Nenhum registro', 'Adicione o primeiro item.');
    view.appendChild(tw); Icons.apply(tw); bindCopy(tw);
  }

  function statusFilter(coll, statuses, build) {
    const state = { status: 'all', q: '' };
    const tb = document.createElement('div'); tb.className = 'toolbar';
    tb.innerHTML = `
      <div class="filter-input">${ic('search')}<input id="flt" placeholder="Filtrar…"></div>
      <div class="seg" id="stSeg"><button data-s="all" class="on">Todos</button>${statuses.map((s) => `<button data-s="${s}">${(STATUS[s] || {}).label || s}</button>`).join('')}</div>`;
    const holder = document.createElement('div');
    view.appendChild(tb); view.appendChild(holder); Icons.apply(tb);

    function render() {
      let list = Store.get(coll).filter((x) => state.status === 'all' || x.status === state.status);
      if (state.q) { const q = state.q.toLowerCase(); list = list.filter((x) => JSON.stringify(x).toLowerCase().includes(q)); }
      const { head, rows } = build(list);
      holder.innerHTML = '';
      const tw = document.createElement('div'); tw.className = 'tbl-wrap';
      tw.innerHTML = rows ? `<table class="data"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>` : emptyState('list', 'Nenhum registro encontrado', 'Ajuste o filtro ou adicione um item.');
      holder.appendChild(tw); Icons.apply(tw); bindCopy(tw);
      // row actions
      $$('[data-edit]', tw).forEach((b) => (b.onclick = () => editFor(coll, Store.find(coll, b.dataset.edit))));
      $$('[data-del]', tw).forEach((b) => (b.onclick = () => confirmDialog('Excluir este registro?', () => { Store.remove(coll, b.dataset.del); render(); toast('Registro excluído', 'info'); })));
      $$('[data-maint]', tw).forEach((b) => (b.onclick = () => { const c = Store.find('computers', b.dataset.maint); Store.update('computers', c.id, { status: c.status === 'manutencao' ? 'ativo' : 'manutencao' }); render(); toast(c.status === 'manutencao' ? 'Marcado como manutenção' : 'Manutenção encerrada', 'info'); }));
      $$('[data-link]', tw).forEach((b) => (b.onclick = () => { if (coll === 'inventory') manageItemAssignments(Store.find('inventory', b.dataset.link)); }));
      $$('tr[data-detail]', tw).forEach((r) => (r.onclick = (e) => {
        if (e.target.closest('.row-actions') || e.target.closest('button')) return; // não abre ao clicar nas ações
        if (coll === 'computers') computerDetail(Store.find('computers', r.dataset.detail));
      }));
    }
    statusFilter._refresh = render;
    $('#flt', tb).oninput = (e) => { state.q = e.target.value; render(); };
    $$('#stSeg button', tb).forEach((b) => (b.onclick = () => { state.status = b.dataset.s; $$('#stSeg button', tb).forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(); }));
    render();
  }
  const editFor = (coll, item) => ({ computers: formComputer, printers: formPrinter, inventory: formInventory, team: formTeam }[coll])(item);

  function bindRowActions(coll, formFn, nameFn) {
    $$('[data-edit]', view).forEach((b) => (b.onclick = () => formFn(Store.find(coll, b.dataset.edit))));
    $$('[data-del]', view).forEach((b) => (b.onclick = () => { const it = Store.find(coll, b.dataset.del); confirmDialog(`Excluir "${esc(nameFn(it))}"?`, () => { if (coll === 'team') Store.unassignAllForUser(it.id); Store.remove(coll, b.dataset.del); go(currentRoute); toast('Registro excluído', 'info'); }); }));
  }

  function bindCopy(root) {
    $$('[data-copy]', root).forEach((b) => { if (b.dataset.copyBound) return; b.dataset.copyBound = '1'; b.addEventListener('click', () => copy(b.dataset.copy, b.dataset.copyLabel)); });
  }
  function emptyState(icon, title, sub) {
    return `<div class="empty"><div class="em-ico">${ic(icon)}</div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div>`;
  }
  // rebuild the current page in-place (keeps any open modal, which lives in #modalRoot)
  function refreshPage() { view.innerHTML = ''; PAGES[currentRoute](); refreshSysPulse(); }

  /* =====================================================================
     INVENTORY ⇄ USER LINKING (modals)
     ===================================================================== */
  // opções de máquina de um usuário (para pinar o periférico/assento a um PC)
  const machOptsForUser = (userId, sel) => `<option value="">— sem máquina —</option>` +
    Store.machinesForUser(userId).map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.hostname)}</option>`).join('');

  // manage which users hold units of an inventory item (com máquina opcional por unidade)
  function manageItemAssignments(item) {
    const render = () => {
      const it = Store.find('inventory', item.id);
      if (!it) return closeModal();
      const used = it.assignments || [];
      const avail = Store.availableOf(it);
      const candidates = Store.get('team').filter((u) => !used.some((a) => a.userId === u.id));
      const locked = it.status === 'reserva';
      const off = (avail <= 0 || !candidates.length || locked);
      const body = `
        <div class="alloc-summary">
          <div class="as-cell"><span class="as-v">${it.qty}</span><span class="as-k">Total</span></div>
          <div class="as-cell"><span class="as-v" style="color:var(--warn)">${used.length}</span><span class="as-k">Em uso</span></div>
          <div class="as-cell"><span class="as-v" style="color:var(--ok)">${avail}</span><span class="as-k">Livres</span></div>
        </div>
        ${locked ? `<div class="link-note">${ic('alert')}Item marcado como <b>Reserva</b> — libere o status para vincular.</div>` : ''}
        <div class="link-add">
          <select id="linkSel" ${off ? 'disabled' : ''}>
            ${candidates.length ? candidates.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('') : '<option value="">Todos os colaboradores já têm uma unidade</option>'}
          </select>
          <select id="machSel" ${off ? 'disabled' : ''} title="Máquina (opcional)">${candidates.length ? machOptsForUser(candidates[0].id, '') : ''}</select>
          <button class="btn primary" id="linkBtn" ${off ? 'disabled' : ''}>${ic('plus')}Vincular</button>
        </div>
        ${avail <= 0 && !locked ? `<div class="link-note">${ic('alert')}Todas as unidades estão alocadas.</div>` : ''}
        <div class="link-list">
          ${used.length ? used.map((a) => { const u = Store.find('team', a.userId); return `
            <div class="link-item">
              <span class="avatar">${esc(initials(u ? u.name : '?'))}</span>
              <div class="li-tx"><b>${esc(u ? u.name : '(usuário removido)')}</b><span>${esc(u ? (u.email || '—') : '—')}</span></div>
              <select class="li-mach" data-mach-user="${a.userId}" title="Máquina onde está">${machOptsForUser(a.userId, a.machineId)}</select>
              <button class="mini-btn danger" data-unlink="${a.userId}" title="Desvincular">${ic('x')}</button>
            </div>`; }).join('') : '<div class="link-empty">Nenhuma unidade vinculada ainda.</div>'}
        </div>`;
      modal({ title: 'Vincular recurso', sub: `${item.type} · ${item.brandModel}`, body, footer: `<button class="btn ghost" data-close>Fechar</button>` });
      const card = $('#modalCard');
      const us = $('#linkSel', card);
      if (us) us.onchange = () => { const m = $('#machSel', card); if (m) m.innerHTML = machOptsForUser(us.value, ''); };
      const lb = $('#linkBtn', card);
      if (lb) lb.onclick = () => { const uid = us.value, mid = $('#machSel', card).value; if (uid && Store.assign(item.id, uid, mid)) { toast('Recurso vinculado'); refreshPage(); render(); } };
      $$('.li-mach', card).forEach((s) => (s.onchange = () => { Store.setItemMachine(item.id, s.dataset.machUser, s.value); toast('Máquina atualizada', 'info'); refreshPage(); }));
      $$('[data-unlink]', card).forEach((b) => (b.onclick = () => { Store.unassign(item.id, b.dataset.unlink); toast('Recurso desvinculado', 'info'); refreshPage(); render(); }));
    };
    render();
  }

  // manage which inventory items a user holds
  function manageUserResources(user) {
    const render = () => {
      const u = Store.find('team', user.id);
      if (!u) return closeModal();
      const mine = Store.itemsForUser(u.id);
      const avail = Store.get('inventory').filter((i) => i.status !== 'reserva' && Store.availableOf(i) > 0 && !(i.assignments || []).some((a) => a.userId === u.id));
      const primary = Store.primaryMachine(u.id);
      const body = `
        <div class="link-add">
          <select id="linkSel" ${avail.length ? '' : 'disabled'}>
            ${avail.length ? avail.map((i) => `<option value="${i.id}">${esc(i.type)} · ${esc(i.brandModel)} — ${Store.availableOf(i)} livre(s)</option>`).join('') : '<option value="">Nenhum item disponível no estoque</option>'}
          </select>
          <select id="machSel" ${avail.length ? '' : 'disabled'} title="Máquina (opcional)">${machOptsForUser(u.id, primary ? primary.id : '')}</select>
          <button class="btn primary" id="linkBtn" ${avail.length ? '' : 'disabled'}>${ic('plus')}Vincular</button>
        </div>
        <div class="link-list">
          ${mine.length ? mine.map((i) => { const a = (i.assignments || []).find((x) => x.userId === u.id) || {}; return `
            <div class="link-item">
              <span class="li-ico">${ic(invIcon(i.type))}</span>
              <div class="li-tx"><b>${esc(i.brandModel)}</b><span>${esc(i.type)}${a.machineId ? ' · ' + esc(a.machineId) : ''}</span></div>
              <select class="li-mach" data-mach-item="${i.id}" title="Máquina onde está">${machOptsForUser(u.id, a.machineId)}</select>
              <button class="mini-btn danger" data-unlink="${i.id}" title="Desvincular">${ic('x')}</button>
            </div>`; }).join('') : `<div class="link-empty">Nenhum recurso vinculado a ${esc(u.name)}.</div>`}
        </div>`;
      modal({ title: 'Recursos do colaborador', sub: `${u.name} · ${u.email}`, body, footer: `<button class="btn ghost" data-close>Fechar</button>` });
      const card = $('#modalCard');
      const lb = $('#linkBtn', card);
      if (lb) lb.onclick = () => { const id = $('#linkSel', card).value, mid = $('#machSel', card).value; if (id && Store.assign(id, u.id, mid)) { toast('Recurso vinculado'); refreshPage(); render(); } };
      $$('.li-mach', card).forEach((s) => (s.onchange = () => { Store.setItemMachine(s.dataset.machItem, u.id, s.value); toast('Máquina atualizada', 'info'); refreshPage(); }));
      $$('[data-unlink]', card).forEach((b) => (b.onclick = () => { Store.unassign(b.dataset.unlink, u.id); toast('Recurso desvinculado', 'info'); refreshPage(); render(); }));
    };
    render();
  }

  /* =====================================================================
     FORMS (create / edit)
     ===================================================================== */
  function field(label, name, value, type, opts) {
    type = type || 'text'; opts = opts || {};
    const full = opts.full ? ' full' : '';
    if (type === 'select') {
      return `<div class="field${full}"><label>${esc(label)}</label><select name="${name}">${opts.options.map((o) => `<option value="${esc(o.v)}" ${o.v === value ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}</div>`;
    }
    if (type === 'textarea') {
      return `<div class="field${full}"><label>${esc(label)}</label><textarea name="${name}" placeholder="${esc(opts.ph || '')}">${esc(value || '')}</textarea>${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}</div>`;
    }
    return `<div class="field${full}"><label>${esc(label)}</label><input name="${name}" type="${type}" value="${esc(value == null ? '' : value)}" placeholder="${esc(opts.ph || '')}">${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}</div>`;
  }
  const sw = (label, name, on) => `<div class="switch-row"><span>${esc(label)}</span><label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span class="sl"></span></label></div>`;

  function submitFooter(editing) {
    return `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="saveBtn">${ic('check')}${editing ? 'Salvar' : 'Adicionar'}</button>`;
  }
  function readForm(card) {
    const data = {};
    $$('input,select,textarea', card).forEach((el) => {
      if (!el.name) return;
      data[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return data;
  }
  function afterSave() { closeModal(); go(currentRoute); }

  /* ---- Team form ---- */
  function formTeam(u) {
    const editing = !!u; u = u || {};
    const compOpts = [{ v: '', t: '— Nenhuma —' }].concat(Store.get('computers').map((c) => ({ v: c.id, t: c.hostname })));
    const linkedNote = editing
      ? `<div class="field full"><label>Recursos do estoque</label>
           <div class="form-inline-note">${ic('box')}<span>${Store.itemsForUser(u.id).length} item(ns) vinculado(s). Gerencie pelo botão <b>Vincular recursos</b> na lista.</span></div></div>`
      : '';
    const card = modal({
      title: editing ? 'Editar colaborador' : 'Novo colaborador', sub: 'Equipe',
      body: `<div class="form-grid">
        ${field('Nome', 'name', u.name, 'text', { full: true, ph: 'Nome completo' })}
        ${field('E-mail (Office 365)', 'email', u.email, 'email', { full: true, ph: 'nome.sobrenome@convergas.com.br' })}
        ${field('Setor', 'sector', u.sector, 'text', { ph: 'Ex: Engenharia' })}
        ${field('Máquina principal', 'machineId', u.machineId, 'select', { options: compOpts, hint: 'Um usuário pode ter várias máquinas; esta é a principal.' })}
        <div class="field full">${sw('Acesso VPN', 'vpn', u.vpn)}</div>
        <div class="field full">${sw('Acesso servidor de engenharia', 'engServer', u.engServer)}</div>
        ${linkedNote}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome', 'warn');
      const obj = { name: d.name, email: d.email, sector: d.sector, machineId: d.machineId, vpn: d.vpn, engServer: d.engServer };
      const uid2 = editing ? u.id : Store.add('team', obj).id;
      if (editing) Store.update('team', u.id, obj);
      if (obj.machineId) {
        Store.get('team').forEach((t) => { if (t.id !== uid2 && t.machineId === obj.machineId) Store.update('team', t.id, { machineId: '' }); });
        Store.linkUserMachine(uid2, obj.machineId);
      }
      toast(editing ? 'Colaborador atualizado' : 'Colaborador adicionado'); afterSave();
    };
  }

  /* ---- Computer form ---- */
  function formComputer(c) {
    const editing = !!c; c = c || {};
    const userOpts = [{ v: '', t: '— Sem usuário —' }].concat(Store.get('team').map((u) => ({ v: u.id, t: u.name })));
    const avLicOpts = [{ v: '', t: '— Nenhuma —' }].concat(Store.get('licenses').filter((l) => l.type === 'Antivírus').map((l) => ({ v: l.id, t: l.name })));
    const card = modal({
      title: editing ? 'Editar computador' : 'Novo computador', sub: 'Computadores',
      body: `<div class="form-grid">
        ${field('Hostname', 'hostname', c.hostname, 'text', { ph: 'PCxx' })}
        ${field('Usuário associado', 'userId', c.userId, 'select', { options: userOpts })}
        ${field('Service Tag / Serial', 'serial', c.serial, 'text', { ph: 'Ex: PE0FAE2C' })}
        ${field('Conta Office 365', 'office', c.office, 'text', { ph: 'usuario@convergas.com.br' })}
        ${field('Tipo', 'type', c.type || 'desktop', 'select', { options: [{ v: 'desktop', t: 'Desktop' }, { v: 'notebook', t: 'Notebook' }] })}
        ${field('Antivírus (texto)', 'antivirus', c.antivirus, 'text', { ph: 'Kaspersky / Verificar / —' })}
        ${field('Licença de antivírus', 'antivirusLicenseId', c.antivirusLicenseId, 'select', { options: avLicOpts, hint: 'Vincula esta máquina a um assento da licença.' })}
        ${field('Status', 'status', c.status || 'ativo', 'select', { options: [{ v: 'ativo', t: 'Ativo' }, { v: 'manutencao', t: 'Manutenção' }, { v: 'inativo', t: 'Inativo' }] })}
        <div class="field">${sw('Acesso administrador', 'admin', c.admin)}</div>
        ${field('Observações', 'notes', c.notes, 'textarea', { full: true, ph: 'Modelo, detalhes, pendências…' })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.hostname) return toast('Informe o hostname', 'warn');
      if (editing) Store.update('computers', c.id, d); else Store.add('computers', d);
      const machId = editing ? c.id : Store.get('computers').slice(-1)[0].id;
      // fonte única Usuário↔Máquina (sem drift): limpa quem apontava pra cá e religa
      Store.get('team').forEach((t) => { if (t.machineId === machId && t.id !== d.userId) Store.update('team', t.id, { machineId: '' }); });
      if (d.userId) Store.linkUserMachine(d.userId, machId);
      // mantém a licença de antivírus coerente (assento por máquina)
      Store.setMachineAntivirus(machId, d.antivirusLicenseId, d.userId);
      toast(editing ? 'Computador atualizado' : 'Computador adicionado'); afterSave();
    };
  }

  /* ---- Printer form ---- */
  function formPrinter(p) {
    const editing = !!p; p = p || {};
    const card = modal({
      title: editing ? 'Editar impressora' : 'Nova impressora', sub: 'Impressoras',
      body: `<div class="form-grid">
        ${field('Nome da impressora', 'name', p.name, 'text', { full: true, ph: 'Marca e modelo' })}
        ${field('IP', 'ip', p.ip, 'text', { ph: '192.168.0.50' })}
        ${field('Localização', 'location', p.location, 'text', { ph: 'Setor / sala' })}
        ${field('Tipo', 'type', p.type || 'rede', 'select', { options: [{ v: 'rede', t: 'Rede' }, { v: 'usb', t: 'USB' }] })}
        ${field('Status', 'status', p.status || 'ativo', 'select', { options: [{ v: 'ativo', t: 'Ativo' }, { v: 'manutencao', t: 'Manutenção' }, { v: 'inativo', t: 'Inativo' }] })}
        ${field('Driver URL', 'driverUrl', p.driverUrl, 'url', { full: true, ph: 'https://…', hint: 'Link direto para download do driver.' })}
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.name) return toast('Informe o nome', 'warn');
      if (editing) Store.update('printers', p.id, d); else Store.add('printers', d);
      toast(editing ? 'Impressora atualizada' : 'Impressora adicionada'); afterSave();
    };
  }

  /* ---- Command form ---- */
  function formCommand(c) {
    const editing = !!c; c = c || {};
    const card = modal({
      title: editing ? 'Editar comando' : 'Novo comando', sub: 'Command Center',
      wide: true,
      body: `<div class="form-grid">
        ${field('Título', 'title', c.title, 'text', { full: true, ph: 'Ex: Limpar cache DNS' })}
        ${field('Categoria', 'category', c.category || 'Sistema', 'select', { options: CMD_CATS.map((x) => ({ v: x, t: x })) })}
        ${field('Terminal', 'shell', c.shell || 'CMD', 'select', { options: ['CMD', 'PowerShell', 'Executar'].map((x) => ({ v: x, t: x })) })}
        ${field('Descrição — o que o comando faz', 'desc', c.desc, 'textarea', { full: true, ph: 'Explique de forma clara o que o comando faz e por quê.' })}
        ${field('Comando', 'command', c.command, 'textarea', { full: true, ph: 'ipconfig /flushdns' })}
        ${field('Como usar (quando usar, passos, cuidados)', 'howto', c.howto, 'textarea', { full: true, ph: 'Quando usar: …\nPasso a passo:\n1. …\nCuidado: …', hint: 'Comece linhas com "Rótulo:" — elas ficam em destaque no guia.' })}
        <div class="field full">${sw('Requer privilégios de administrador', 'admin', c.admin)}</div>
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.title || !d.command) return toast('Título e comando são obrigatórios', 'warn');
      if (editing) Store.update('commands', c.id, d); else Store.add('commands', d);
      toast(editing ? 'Comando atualizado' : 'Comando adicionado'); closeModal(); PAGES.command();
    };
  }

  /* ---- Runbook form ---- */
  function formRunbook(r) {
    const editing = !!r; r = r || { steps: [], related: [] };
    const cmdOpts = Store.get('commands');
    const card = modal({
      wide: true, title: editing ? 'Editar runbook' : 'Novo runbook', sub: 'Runbooks',
      body: `<div class="form-grid">
        ${field('Título', 'title', r.title, 'text', { full: true, ph: 'Ex: Setup de novo computador' })}
        ${field('Descrição', 'desc', r.desc, 'text', { full: true })}
        ${field('Passos (um por linha)', 'steps', (r.steps || []).join('\n'), 'textarea', { full: true, ph: 'Atualizar Windows\nRenomear hostname\n…', hint: 'Cada linha vira um passo numerado.' })}
        <div class="field full"><label>Comandos relacionados</label>
          <div class="chips" style="margin-top:2px">${cmdOpts.map((c) => `<label class="chip ${(r.related || []).includes(c.id) ? '' : 'off'}" style="cursor:pointer"><input type="checkbox" name="rel_${c.id}" ${(r.related || []).includes(c.id) ? 'checked' : ''} style="display:none">${esc(c.title)}</label>`).join('')}</div>
          <span class="hint">Clique para vincular comandos do Command Center.</span></div>
      </div>`,
      footer: submitFooter(editing),
    });
    // toggle chip visual
    $$('.chip input', card).forEach((inp) => inp.addEventListener('change', () => inp.closest('.chip').classList.toggle('off', !inp.checked)));
    $$('.chip', card).forEach((ch) => ch.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') { const i = $('input', ch); i.checked = !i.checked; i.dispatchEvent(new Event('change')); } }));
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card);
      if (!d.title) return toast('Informe o título', 'warn');
      const steps = (d.steps || '').split('\n').map((s) => s.trim()).filter(Boolean);
      const related = cmdOpts.filter((c) => d['rel_' + c.id]).map((c) => c.id);
      const obj = { title: d.title, desc: d.desc, steps, related };
      if (editing) Store.update('runbooks', r.id, obj); else Store.add('runbooks', obj);
      toast(editing ? 'Runbook atualizado' : 'Runbook criado'); closeModal(); PAGES.runbooks();
    };
  }

  /* ---- Inventory form ---- */
  function formInventory(i) {
    const editing = !!i; i = i || {};
    const used = editing ? (i.assignments || []).length : 0;
    // status follows allocation: while units are in use it stays "Em uso" (locked).
    const statusField = used > 0
      ? `<div class="field"><label>Status</label><div class="form-inline-note">${ic('users')}<span><b>Em uso</b> — definido por ${used} vínculo(s). Desvincule para alterar.</span></div></div>`
      : field('Status', 'status', i.status === 'reserva' ? 'reserva' : 'disponivel', 'select', { options: [{ v: 'disponivel', t: 'Disponível' }, { v: 'reserva', t: 'Reserva' }] });
    const card = modal({
      title: editing ? 'Editar item' : 'Novo item', sub: 'Periféricos',
      body: `<div class="form-grid">
        ${field('Tipo', 'type', i.type || 'Mouse', 'select', { options: ['Mouse', 'Teclado', 'Monitor', 'Headset', 'Webcam', 'Cabo', 'Outro'].map((x) => ({ v: x, t: x })) })}
        ${field('Quantidade total', 'qty', i.qty != null ? i.qty : 1, 'number', { hint: used > 0 ? `${used} unidade(s) em uso — não reduza abaixo disso.` : '' })}
        ${field('Marca / Modelo', 'brandModel', i.brandModel, 'text', { full: true, ph: 'Ex: Logitech M170' })}
        ${statusField}
        <div class="field full"><div class="form-inline-note">${ic('link')}<span>Para atribuir a colaboradores use o botão <b>Vincular</b> na lista — o status é ajustado automaticamente.</span></div></div>
      </div>`,
      footer: submitFooter(editing),
    });
    $('#saveBtn', card).onclick = () => {
      const d = readForm(card); d.qty = Number(d.qty) || 0;
      if (!d.brandModel) return toast('Informe marca/modelo', 'warn');
      if (editing && d.qty < used) return toast(`Quantidade não pode ser menor que ${used} (unidades em uso)`, 'warn');
      if (editing) {
        const patch = { type: d.type, qty: d.qty, brandModel: d.brandModel };
        if (used === 0) patch.status = d.status;          // only settable when nothing allocated
        const it = Store.update('inventory', i.id, patch);
        Store.recalcItem(it); Store.update('inventory', it.id, {});
      } else {
        const it = Store.add('inventory', { type: d.type, qty: d.qty, brandModel: d.brandModel, status: d.status || 'disponivel', assignments: [] });
        Store.recalcItem(it); Store.update('inventory', it.id, {});
      }
      toast(editing ? 'Item atualizado' : 'Item adicionado'); afterSave();
    };
  }

  /* =====================================================================
     ROUTER
     ===================================================================== */
  let currentRoute = 'dashboard';
  let currentArea = 'ti';

  // navegação por área (a sidebar é montada conforme a área atual)
  const NAV = {
    ti: { label: 'T.I', groups: [
      { label: 'Operação', items: [ { r: 'dashboard', t: 'Dashboard', s: 'Painel', i: 'grid' }, { r: 'equipe', t: 'Equipe', s: 'Equipe', i: 'users' } ] },
      { label: 'Conhecimento', items: [ { r: 'command', t: 'Command Center', s: 'Comandos', i: 'terminal' }, { r: 'runbooks', t: 'Runbooks', s: 'Runbooks', i: 'book' }, { r: 'sharepoint', t: 'SharePoint', s: 'Portais', i: 'globe' } ] },
      { label: 'Infraestrutura', items: [ { r: 'infra', t: 'Domínio & Infra', s: 'Infra', i: 'globe' }, { r: 'computadores', t: 'Computadores', s: 'PCs', i: 'monitor' }, { r: 'impressoras', t: 'Impressoras', s: 'Impr.', i: 'printer' }, { r: 'telefonia', t: 'Telefonia', s: 'Fones', i: 'phone' }, { r: 'inventario', t: 'Periféricos', s: 'Perif.', i: 'box' }, { r: 'licencas', t: 'Licenças', s: 'Licenças', i: 'key' } ] },
      { label: 'Segurança', items: [ { r: 'cofre', t: 'Cofre', s: 'Cofre', i: 'shield' }, { r: 'bitlocker', t: 'BitLocker', s: 'BitLock', i: 'lock' } ] },
      { label: 'Sistema', items: [ { r: 'settings', t: 'Settings', s: 'Config', i: 'settings' } ] },
    ] },
    qualidade: { label: 'Qualidade', groups: [
      { label: 'Qualidade', items: [ { r: 'qa-dashboard', t: 'Dashboard', s: 'Painel', i: 'grid' }, { r: 'qa-cata', t: 'Certificados InMetro', s: 'Certif.', i: 'award' }, { r: 'qa-equipamentos', t: 'Calibração de Equipamentos', s: 'Calibr.', i: 'activity' }, { r: 'qa-manutencao', t: 'Manutenção Certificados', s: 'Renov.', i: 'refresh' }, { r: 'epi', t: 'Controle de EPI', s: 'EPI', i: 'shield' }, { r: 'qa-labs', t: 'Laboratórios parceiros', s: 'Labs', i: 'flask' } ] },
    ] },
    sistemas: { label: 'Sistemas', groups: [
      { label: 'Sistemas', items: [ { r: 'sistemas-home', t: 'Visão geral', s: 'Geral', i: 'grid' } ] },
    ] },
    'pos-vendas': { label: 'Pós-Vendas', groups: [
      { label: 'Atendimento', items: [ { r: 'pv-painel', t: 'Painel', s: 'Painel', i: 'grid' }, { r: 'pv-chamados', t: 'Chamados', s: 'Chamados', i: 'list' }, { r: 'pv-qualidade', t: 'Fila da Qualidade', s: 'Qualidade', i: 'award' } ] },
      { label: 'Cadastros & normas', items: [ { r: 'pv-clientes', t: 'Clientes', s: 'Clientes', i: 'users' }, { r: 'pv-guia', t: 'Fluxo & Normas', s: 'Normas', i: 'book' } ] },
    ] },
    manutencao: { label: 'Manutenção', groups: [
      { label: 'Manutenção', items: [ { r: 'manutencao-home', t: 'Indicadores', s: 'Painel', i: 'grid' }, { r: 'mnt-equip', t: 'Máquinas', s: 'Máquinas', i: 'cpu' }, { r: 'mnt-os', t: 'Ordens de Serviço', s: 'OS', i: 'file' }, { r: 'mnt-prev', t: 'Preventivas', s: 'Prevent.', i: 'refresh' }, { r: 'mnt-cal', t: 'Calendário', s: 'Agenda', i: 'calendar' }, { r: 'mnt-pecas', t: 'Peças', s: 'Peças', i: 'box' } ] },
    ] },
    programacao: { label: 'Programação', groups: [
      { label: 'Operação', items: [ { r: 'prog-atividades', t: 'Atividades', s: 'Atividades', i: 'list' }, { r: 'prog-pedidos', t: 'Pedidos', s: 'Pedidos', i: 'file' }, { r: 'prog-rnc', t: 'Não Conformidades', s: 'RNC', i: 'alert' } ] },
      { label: 'Cadastros', items: [ { r: 'prog-cadastros', t: 'Equipe & Setores', s: 'Equipe', i: 'users' }, { r: 'prog-catalogo', t: 'Famílias, Fornecedores & Estoque', s: 'Catálogo', i: 'box' } ] },
    ] },
  };
  const TITLES = {}; const ROUTE_AREA = {};
  Object.keys(NAV).forEach((area) => NAV[area].groups.forEach((g) => g.items.forEach((it) => { TITLES[it.r] = it.t; if (it.r !== 'settings') ROUTE_AREA[it.r] = area; })));
  // páginas internas (fora do menu) que pertencem a uma área
  ROUTE_AREA['pv-novo'] = 'pos-vendas'; ROUTE_AREA['pv-detalhe'] = 'pos-vendas';
  TITLES['pv-novo'] = 'Novo chamado'; TITLES['pv-detalhe'] = 'Chamado';
  const AREA_HOME = { ti: 'dashboard', qualidade: 'qa-dashboard', sistemas: 'sistemas-home', 'pos-vendas': 'pv-painel', manutencao: 'manutencao-home', programacao: 'prog-atividades' };

  function renderSidebar(area) {
    const cfg = NAV[area]; const nav = $('#nav');
    nav.innerHTML = cfg.groups.map((g) => `<p class="nav-label">${esc(g.label)}</p>` +
      g.items.map((it) => `<a class="nav-item" data-route="${it.r}"><span class="ni-ico" data-icon="${it.i}"></span><span class="ni-tx">${esc(it.t)}</span></a>`).join('')).join('');
    $('#brandArea').textContent = cfg.label;
    Icons.apply(nav);
    $$('.nav-item', nav).forEach((a) => (a.onclick = (e) => { e.preventDefault(); go(a.dataset.route); }));
  }

  /* ---------- navegação mobile: tab bar + bottom sheet (ref. LifeGas) ---------- */
  function openSheet() { $('#msheet').classList.add('open'); $('#msheetScrim').classList.add('show'); $('#msheet').setAttribute('aria-hidden', 'false'); syncScrollLock(); }
  function closeSheet() { $('#msheet').classList.remove('open'); $('#msheetScrim').classList.remove('show'); $('#msheet').setAttribute('aria-hidden', 'true'); syncScrollLock(); }

  function renderMobileNav(area, route) {
    const cfg = NAV[area]; if (!cfg) return;
    const flat = []; cfg.groups.forEach((g) => g.items.forEach((it) => { if (it.r !== 'settings') flat.push(it); }));
    const tabs = flat.slice(0, 4);
    // tab bar: até 4 atalhos da área + botão Menu
    const mnav = $('#mnav');
    mnav.innerHTML = tabs.map((it) => `<button class="mtab${it.r === route ? ' on' : ''}" data-route="${it.r}"><span class="mt-ico" data-icon="${it.i}"></span><span class="mt-tx">${esc(it.s || it.t)}</span></button>`).join('')
      + `<button class="mtab mtab-menu" id="mtabMenu"><span class="mt-ico" data-icon="menu"></span><span class="mt-tx">Menu</span></button>`;
    Icons.apply(mnav);
    $$('.mtab[data-route]', mnav).forEach((b) => (b.onclick = () => go(b.dataset.route)));
    $('#mtabMenu').onclick = openSheet;
    // bottom sheet: navegação completa da área + trocar de área + tema
    const body = $('#msheetBody');
    body.innerHTML = cfg.groups.map((g) => `<p class="ms-label">${esc(g.label)}</p>` +
      g.items.map((it) => `<button class="ms-item${it.r === route ? ' on' : ''}" data-route="${it.r}"><span data-icon="${it.i}"></span><span>${esc(it.t)}</span></button>`).join('')).join('')
      + `<div class="ms-foot">
           <button id="msArea"><span data-icon="grid"></span>Trocar de área</button>
           <button id="msTheme"><span data-icon="moon"></span>Tema</button>
         </div>`;
    Icons.apply(body);
    $$('.ms-item', body).forEach((b) => (b.onclick = () => { closeSheet(); go(b.dataset.route); }));
    $('#msArea').onclick = () => { closeSheet(); goHome(); };
    $('#msTheme').onclick = () => { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); };
  }

  function showApp() { document.body.classList.remove('home-on'); $('#homeScreen').classList.remove('show'); $('#homeScreen').setAttribute('aria-hidden', 'true'); $('.app-shell').style.display = ''; }
  function goHome() {
    document.body.classList.add('home-on'); closeSheet();
    try { buildHome(); } catch (e) {}
    $('#homeScreen').classList.add('show'); $('#homeScreen').setAttribute('aria-hidden', 'false');
    $('.app-shell').style.display = 'none';
    if (location.hash !== '#home') history.replaceState(null, '', '#home');
  }
  function enterArea(area) { currentArea = area; renderSidebar(area); go(AREA_HOME[area]); }

  function go(route) {
    if (!PAGES[route]) route = AREA_HOME[currentArea] || 'dashboard';
    const area = ROUTE_AREA[route];
    if (area && area !== currentArea) { currentArea = area; renderSidebar(area); }
    currentRoute = route;
    showApp();
    $('#crumbRoot').textContent = (NAV[currentArea] || {}).label || 'Control Center';
    crumb.textContent = TITLES[route] || route;
    $$('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
    renderMobileNav(currentArea, route);
    view.innerHTML = '';
    PAGES[route]();
    if (location.hash !== '#' + route) history.replaceState(null, '', '#' + route);
    closeSidebar();
    // sempre começa no topo absoluto da página (não apenas no topo da .view, que fica abaixo da topbar)
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
    refreshSysPulse();
  }
  window.go = go;

  $('#brandHome').onclick = goHome;
  $('#homeLink').onclick = goHome;
  $('#tbHome').onclick = goHome;

  /* ---------- Home: seletor orbital de áreas ----------
     Roda de seleção estilo "instrumento": anel com marcações, arco seletor com mola que segue o
     cursor (ângulo em relação ao centro), núcleo de vidro com o conteúdo da área e números ao vivo.
     Mouse, teclado (← → ↵ 1–6) e toque (1º toque seleciona, 2º entra). */
  const HOME_AREAS = [
    { area: 'qualidade', label: 'Qualidade', icon: 'award', color: '#46D39A', desc: 'Certificados INMETRO, calibração, EPI e laboratórios parceiros.',
      stat: () => { const n = qaAlerts().length; return n ? { v: n, l: n === 1 ? 'alerta de validade' : 'alertas de validade', tone: 'warn' } : { v: '✓', l: 'Certificados em dia', tone: 'ok' }; } },
    { area: 'pos-vendas', label: 'Pós-Vendas', icon: 'phone', color: '#F472B6', desc: 'Chamados de clientes, garantias e RNC — IATF 16949 e ISO 9001.', isNew: true,
      stat: () => { const s = pvStats(); if (s.atrasados.length) return { v: s.atrasados.length, l: `atrasado(s) · ${s.abertos.length} em aberto`, tone: 'danger' }; if (s.rncPend.length) return { v: s.rncPend.length, l: `aguardando RNC · ${s.abertos.length} em aberto`, tone: 'warn' }; return { v: s.abertos.length, l: s.abertos.length === 1 ? 'chamado em aberto' : 'chamados em aberto', tone: s.abertos.length ? 'info' : 'ok' }; } },
    { area: 'manutencao', label: 'Manutenção', icon: 'wrench', color: '#F5B840', desc: 'Ordens de serviço, preventivas, máquinas, peças e calendário.',
      stat: () => { const n = Store.get('serviceOrders').filter((o) => o.kind === 'os' && !['finalizada', 'concluida', 'cancelada'].includes(o.status)).length; return { v: n, l: n === 1 ? 'ordem de serviço aberta' : 'ordens de serviço abertas', tone: n ? 'info' : 'ok' }; } },
    { area: 'programacao', label: 'Programação', icon: 'calendar', color: '#A78BFA', desc: 'Atividades do PCP, pedidos, não conformidades e cadastros.',
      stat: () => { const t = todayISO(); const l = Store.get('progAtividades') || []; const late = l.filter((a) => a.status !== 'done' && a.prazo && a.prazo < t).length; return late ? { v: late, l: 'atividade(s) atrasada(s)', tone: 'warn' } : { v: l.filter((a) => a.status !== 'done').length, l: 'atividades em andamento', tone: 'info' }; } },
    { area: 'ti', label: 'T.I', icon: 'cpu', color: '#5CE1E6', desc: 'Computadores, impressoras, telefonia, licenças, comandos e cofre.',
      stat: () => { const n = computeAlerts().length; return n ? { v: n, l: n === 1 ? 'alerta de infraestrutura' : 'alertas de infraestrutura', tone: 'warn' } : { v: '✓', l: 'Infraestrutura sem alertas', tone: 'ok' }; } },
    { area: 'sistemas', label: 'Sistemas', icon: 'grid', color: '#3FA9F5', desc: 'Plataformas da Convergas: Homologa, App de produção e TV.',
      stat: () => ({ v: SISTEMAS.length, l: 'plataformas disponíveis', tone: 'info' }) },
  ];
  const GUIDELINE = { area: 'guideline', ext: true };
  const HX = { sel: -1, cur: 0, vel: 0, target: 0, raf: null, leaving: false, touch: false, stats: [] };
  const hxReduce = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  function buildHome() {
    const mount = $('#wheelMount'); if (!mount) return;
    const N = HOME_AREAS.length, step = 360 / N;
    HX.stats = HOME_AREAS.map((a) => { try { return a.stat(); } catch (e) { return { v: '—', l: '', tone: '' }; } });
    // marcações do anel (estilo mostrador de instrumento)
    let ticks = '';
    for (let i = 0; i < 120; i++) { const big = i % 10 === 0, mid = i % 5 === 0; ticks += `<line x1="500" y1="${big ? 18 : mid ? 24 : 28}" x2="500" y2="36" transform="rotate(${i * 3} 500 500)" class="${big ? 'tk-b' : mid ? 'tk-m' : ''}"/>`; }
    const arc = (r, a0, a1) => { const p = (a) => [500 + r * Math.sin(a * Math.PI / 180), 500 - r * Math.cos(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    mount.innerHTML = `
      <svg class="hx-dial" viewBox="0 0 1000 1000" aria-hidden="true">
        <circle class="hx-r hx-r-out" cx="500" cy="500" r="482"/>
        <g class="hx-ticks">${ticks}</g>
        <circle class="hx-r hx-r-dash" cx="500" cy="500" r="446"/>
        <circle class="hx-r hx-r-track" cx="500" cy="500" r="372"/>
        ${HOME_AREAS.map((a, i) => `<path class="hx-seg" data-i="${i}" d="${arc(372, i * step - step / 2 + 4, i * step + step / 2 - 4)}" style="--c:${a.color}"/>`).join('')}
        <g class="hx-sel" id="hxSel">
          <path class="hx-arc-glow" d="${arc(372, -step / 2 + 3, step / 2 - 3)}"/>
          <path class="hx-arc" d="${arc(372, -step / 2 + 3, step / 2 - 3)}"/>
          <line class="hx-beam" x1="500" y1="236" x2="500" y2="166"/>
          <circle class="hx-pip" cx="500" cy="54" r="7"/>
        </g>
        <circle class="hx-r hx-r-in" cx="500" cy="500" r="262"/>
      </svg>
      ${HOME_AREAS.map((a, i) => { const st = HX.stats[i]; const alert = st.tone === 'warn' || st.tone === 'danger';
        return `<button class="hx-node" role="option" data-i="${i}" style="--a:${i * step}deg;--c:${a.color};--d:${i * 60}ms" aria-label="${esc(a.label)}">
          <span class="hx-orb"><span class="hx-orb-i" data-icon="${a.icon}"></span>${alert ? `<span class="hx-flag t-${st.tone}">${esc(String(st.v))}</span>` : ''}</span>
          <span class="hx-lbl"><small>${String(i + 1).padStart(2, '0')}</small>${esc(a.label)}</span>
        </button>`; }).join('')}
      <div class="hx-hub" id="hxHub"><div class="hx-hub-in" id="hxHubIn"></div></div>`;
    Icons.apply(mount);
    hxHub(-1);
    // mantém a seleção anterior ao voltar para a Home
    if (HX.sel >= 0) { const s = HX.sel; HX.sel = -1; hxSelect(s, true); }

    $$('.hx-node', mount).forEach((b) => {
      b.onpointerenter = (e) => { if (e.pointerType === 'mouse') hxSelect(+b.dataset.i); };
      b.onclick = (e) => {
        const i = +b.dataset.i;
        if (HX.touch && HX.sel !== i) { hxSelect(i); return; } // toque: 1º seleciona, 2º entra
        hxSelect(i); hxEnter();
      };
    });
    $('#hxHub', mount).onclick = () => { if (HX.sel >= 0) hxEnter(); };
    // índice lateral (telas largas): mesma seleção da roda
    const ix = $('#homeIndex');
    if (ix) {
      ix.innerHTML = HOME_AREAS.map((a, i) => { const st = HX.stats[i]; return `<button class="hx-ix" data-i="${i}" style="--c:${a.color};--d:${200 + i * 50}ms"><span class="hx-ix-n">${String(i + 1).padStart(2, '0')}</span><span class="hx-ix-t">${esc(a.label)}</span><span class="hx-ix-s t-${st.tone || 'none'}">${esc(String(st.v))}</span></button>`; }).join('');
      $$('.hx-ix', ix).forEach((b) => { b.onmouseenter = () => hxSelect(+b.dataset.i); b.onclick = () => { hxSelect(+b.dataset.i); hxEnter(); }; });
    }
    const h = new Date().getHours();
    const greet = $('#homeGreet'); if (greet) greet.textContent = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    homeClock();
    hxIntro();
  }

  // conteúdo do núcleo (crossfade a cada troca)
  function hxHub(i) {
    const host = $('#hxHubIn'); if (!host) return;
    const el = document.createElement('div'); el.className = 'hx-hub-c';
    if (i < 0) {
      el.innerHTML = `<img class="hx-hub-logo" src="assets/logo-icone.png" alt="">
        <b class="hx-hub-t">Control Center</b>
        <p class="hx-hub-d">Passe o cursor pela roda ou use as setas para escolher uma área.</p>`;
    } else {
      const a = HOME_AREAS[i], st = HX.stats[i] || {};
      el.innerHTML = `<span class="hx-hub-k"><span class="hx-hub-ic" data-icon="${a.icon}"></span>${String(i + 1).padStart(2, '0')} / ${String(HOME_AREAS.length).padStart(2, '0')}${a.isNew ? '<em>Novo</em>' : ''}</span>
        <b class="hx-hub-t">${esc(a.label)}</b>
        <p class="hx-hub-d">${esc(a.desc)}</p>
        <span class="hx-hub-s t-${st.tone || 'none'}"><b>${esc(String(st.v))}</b>${esc(st.l || '')}</span>
        <span class="hx-hub-cta">Entrar <span data-icon="arrowUpRight"></span></span>`;
    }
    Icons.apply(el);
    $$('.hx-hub-c', host).forEach((old) => { old.classList.add('out'); setTimeout(() => old.remove(), 260); });
    host.appendChild(el);
  }

  function hxSelect(i, instant) {
    const mount = $('#wheelMount'); if (!mount || HX.leaving) return;
    const N = HOME_AREAS.length;
    i = ((i % N) + N) % N;
    if (i === HX.sel) return;
    const first = HX.sel < 0;
    HX.sel = i;
    const a = HOME_AREAS[i];
    const scr = $('#homeScreen'); if (scr) scr.style.setProperty('--hx-sel', a.color);
    $$('#homeIndex .hx-ix').forEach((n) => n.classList.toggle('on', +n.dataset.i === i));
    mount.classList.add('has-sel');
    $$('.hx-node', mount).forEach((n) => { const on = +n.dataset.i === i; n.classList.toggle('on', on); n.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $$('.hx-seg', mount).forEach((s) => s.classList.toggle('on', +s.dataset.i === i));
    // ângulo alvo pelo caminho mais curto (a mola cuida do resto)
    const want = i * (360 / N);
    let d = ((want - HX.cur) % 360 + 540) % 360 - 180;
    HX.target = HX.cur + d;
    if (first || instant || hxReduce()) { HX.cur = HX.target; HX.vel = 0; hxApply(); }
    else hxSpring();
    hxHub(i);
  }
  function hxApply() { const g = $('#hxSel'); if (g) g.setAttribute('transform', `rotate(${HX.cur.toFixed(2)} 500 500)`); }
  function hxSpring() {
    if (HX.raf) return;
    const tick = () => {
      // mola criticamente amortecida (rápida, sem quicar demais)
      HX.vel += (HX.target - HX.cur) * 0.14; HX.vel *= 0.68; HX.cur += HX.vel;
      hxApply();
      if (Math.abs(HX.target - HX.cur) < 0.05 && Math.abs(HX.vel) < 0.05) { HX.cur = HX.target; hxApply(); HX.raf = null; return; }
      HX.raf = requestAnimationFrame(tick);
    };
    HX.raf = requestAnimationFrame(tick);
  }
  function hxIntro() {
    const mount = $('#wheelMount'); if (!mount) return;
    HX.leaving = false;
    mount.classList.remove('hx-leave', 'hx-ready'); void mount.offsetWidth;
    mount.classList.add('hx-ready');
  }
  function hxEnter() {
    if (HX.sel < 0 || HX.leaving) return;
    const a = HOME_AREAS[HX.sel];
    const mount = $('#wheelMount');
    HX.leaving = true;
    if (mount && !hxReduce()) mount.classList.add('hx-leave');
    setTimeout(() => { HX.leaving = false; selectWheel(a); }, hxReduce() ? 0 : 420);
  }

  // seleção pelo ângulo do cursor em relação ao centro da roda (como um menu radial)
  (function hxPointer() {
    const stage = $('#homeStage'); if (!stage) return;
    stage.addEventListener('pointermove', (e) => {
      const scr = $('#homeScreen'); if (scr) { scr.style.setProperty('--mx', e.clientX + 'px'); scr.style.setProperty('--my', e.clientY + 'px'); }
      if (e.pointerType !== 'mouse') return;
      HX.touch = false;
      const w = $('#wheelMount'); if (!w) return;
      const r = w.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, dist = Math.hypot(dx, dy);
      if (dist < r.width * 0.27 || dist > r.width * 0.62) return; // núcleo e fora da roda não mudam a seleção
      const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      hxSelect(Math.round(ang / (360 / HOME_AREAS.length)));
    });
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') HX.touch = true; });
    stage.addEventListener('click', (e) => {
      if (e.target.closest('.hx-node, .hx-hub')) return;
      const w = $('#wheelMount'); if (!w || HX.sel < 0 || HX.touch) return;
      const r = w.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d > r.width * 0.27 && d < r.width * 0.55) hxEnter();
    });
  })();
  document.addEventListener('keydown', (e) => {
    const scr = $('#homeScreen');
    if (!scr || !scr.classList.contains('show') || modalCloser) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    const N = HOME_AREAS.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); hxSelect(HX.sel < 0 ? 0 : HX.sel + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); hxSelect(HX.sel < 0 ? N - 1 : HX.sel - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { if (HX.sel >= 0) { e.preventDefault(); hxEnter(); } }
    else if (/^[1-9]$/.test(e.key) && +e.key <= N) { hxSelect(+e.key - 1); }
  });

  function homeClock() {
    const el = $('#homeClock'); if (!el) return;
    const d = new Date();
    const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    el.textContent = dia.charAt(0).toUpperCase() + dia.slice(1) + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  setInterval(() => { if ($('#homeScreen').classList.contains('show')) homeClock(); }, 30000);
  const gl = $('#homeGuideline'); if (gl) gl.onclick = () => selectWheel(GUIDELINE);
  const thHome = $('#themeToggleHome'); if (thHome) thHome.onclick = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

  function selectWheel(w) {
    if (w.ext) { const url = (Store.get('settings').guidelineUrl || '').trim(); if (url) window.open(url, '_blank', 'noopener'); else toast('Configure o link do Guideline em Settings', 'warn'); return; }
    enterArea(w.area);
  }

  function refreshSysPulse() {
    const alerts = currentArea === 'qualidade' ? qaAlerts() : currentArea === 'ti' ? computeAlerts() : currentArea === 'pos-vendas' ? pvAlerts() : [];
    const pulse = $('#sysPulse'), tx = $('.pulse-tx', pulse);
    pulse.classList.toggle('warn', alerts.length > 0);
    tx.textContent = alerts.length ? `${alerts.length} alerta(s)` : (currentArea === 'qualidade' ? 'Qualidade em dia' : currentArea === 'pos-vendas' ? 'Chamados em dia' : 'Sistema operacional');
  }

  /* ---------- theme ---------- */
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    Store.setSetting('theme', t);
    ['#themeToggle', '#themeToggleHome'].forEach((sel) => { const tt = $(sel); if (!tt) return; tt.dataset.iconDone = ''; tt.innerHTML = ''; tt.setAttribute('data-icon', t === 'dark' ? 'sun' : 'moon'); Icons.apply(tt); });
    toast(t === 'dark' ? 'Modo escuro' : 'Modo claro', 'info');
  }
  $('#themeToggle').onclick = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

  /* ---------- fullscreen ---------- */
  function syncFsBtn() {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.querySelectorAll('#fsToggle, #fsToggleHome').forEach((fb) => {
      fb.dataset.iconDone = ''; fb.innerHTML = '';
      fb.setAttribute('data-icon', on ? 'minimize' : 'maximize');
      fb.setAttribute('aria-label', on ? 'Sair da tela cheia' : 'Tela cheia');
      fb.setAttribute('title', on ? 'Sair da tela cheia' : 'Tela cheia');
      fb.classList.toggle('on', on);
      Icons.apply(fb);
    });
  }
  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);
    } else {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen || function(){ toast('Tela cheia não suportada neste navegador', 'warn'); }).call(el);
    }
  }
  const fsBtn = $('#fsToggle'); if (fsBtn) fsBtn.onclick = toggleFullscreen;
  const fsBtnHome = $('#fsToggleHome'); if (fsBtnHome) fsBtnHome.onclick = toggleFullscreen;
  document.addEventListener('fullscreenchange', syncFsBtn);
  document.addEventListener('webkitfullscreenchange', syncFsBtn);

  /* ---------- sidebar mobile ---------- */
  function openSidebar() { $('.side').classList.add('open'); $('#scrim').classList.add('show'); syncScrollLock(); }
  function closeSidebar() { $('.side').classList.remove('open'); $('#scrim').classList.remove('show'); syncScrollLock(); }
  $('#menuBtn').onclick = openSidebar;
  $('#scrim').onclick = closeSidebar;
  $('#msheetScrim').onclick = closeSheet;


  /* ---------- particle background ---------- */
  // fundo animado: aurora suave em CSS (substitui as partículas). Desligado = fundo estático.
  function toggleBgfx(on) {
    const cv = $('#bgfx'); if (cv) cv.style.display = 'none';
    document.documentElement.classList.toggle('fx-off', !on);
  }

  /* =====================================================================
     PROGRAMAÇÃO (PCP / Gestão) — Fase 1: atividades (3 vistas) + RNC + cadastros
     O motor de viabilidade (DayDay) entra na Fase 2. Aqui é a base viva:
     cada setor alimenta suas atividades; toda atividade pode abrir uma RNC.
     ===================================================================== */
  // --- datas (local, sem fuso bagunçando) ---
  const pToday = () => pIso(new Date());
  function pIso(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}`; }
  function pParse(iso) { return new Date(`${iso}T12:00:00`); }
  function pAddDays(iso, n) { const d = pParse(iso); d.setDate(d.getDate() + n); return pIso(d); }
  function pDiff(a, b) { return Math.round((pParse(b) - pParse(a)) / 86400000); }
  function pFmtBR(iso) { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
  function pWeekStart(iso) { const wd = (pParse(iso).getDay() + 6) % 7; return pAddDays(iso, -wd); } // segunda=0

  const PROG_ATV_STATUS = { todo: { label: 'A fazer', cls: 'neutral' }, doing: { label: 'Fazendo', cls: 'info' }, blocked: { label: 'Travada', cls: 'danger' }, done: { label: 'Concluída', cls: 'ok' } };
  const PROG_ATV_COLS = ['todo', 'doing', 'blocked', 'done'];
  const PROG_PRIOR = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  const PROG_RNC_STATUS = { aberta: 'Aberta', analise: 'Em análise', acao: 'Em ação', verificacao: 'Verificação', fechada: 'Fechada' };
  const PROG_PA_STATUS = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída' };
  const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  function progMe() { try { return localStorage.getItem('prog_me') || ''; } catch (e) { return ''; } }
  function setProgMe(id) { try { localStorage.setItem('prog_me', id || ''); } catch (e) {} }
  function progSetorNome(id) { const s = Store.find('progSetores', id); return s ? s.nome : '—'; }
  function progPessoaNome(id) { const p = Store.find('progPessoas', id); return p ? p.nome : '—'; }
  function progPessoaSetores(id) { const p = Store.find('progPessoas', id); return p ? (p.setores || []) : []; }
  function progBadge(cls, txt) { return `<span class="prog-badge prog-b-${cls}">${esc(txt)}</span>`; }
  function progStatusBadge(st) { const s = PROG_ATV_STATUS[st] || PROG_ATV_STATUS.todo; return progBadge(s.cls, s.label); }
  function pPrazoBadge(iso) {
    if (!iso) return progBadge('neutral', 'sem prazo');
    const d = pDiff(pToday(), iso);
    if (d < 0) return progBadge('danger', `atrasada ${-d}d`);
    if (d === 0) return progBadge('warn', 'hoje');
    if (d <= 2) return progBadge('warn', `em ${d}d`);
    return progBadge('info', pFmtBR(iso));
  }

  let progView = 'meu';
  let progWeek = null;
  let progFilterSetor = '';

  // ---------- editor em PÁGINA (fluxo guiado, sem modal sobrepondo a tela) ----------
  let progFormSpec = null;
  PAGES['prog-form'] = () => progRenderForm();
  function progOpenForm(spec) { progFormSpec = spec; go('prog-form'); }
  function progRenderForm() {
    const spec = progFormSpec;
    if (!spec) { go('prog-atividades'); return; }
    pageShell('Programação', spec.title, spec.sub || '', `<button class="btn" id="fBack">${ic('chevron')}Voltar</button>`);
    const wrap = document.createElement('div'); wrap.className = 'prog-formwrap';
    wrap.innerHTML = spec.html + `<div class="prog-form-actions"><button class="btn primary" id="fSave">${ic('check')}${spec.editing ? 'Salvar alterações' : 'Criar'}</button>${(spec.editing && spec.onDelete) ? `<button class="btn danger" id="fDel">${ic('trash')}Excluir</button>` : ''}<button class="btn ghost" id="fCancel">Cancelar</button></div>`;
    view.appendChild(wrap); Icons.apply(wrap);
    if (spec.afterRender) spec.afterRender(wrap);
    const back = () => go(spec.back);
    $('#fBack', wrap).onclick = back;
    $('#fCancel', wrap).onclick = back;
    $('#fSave', wrap).onclick = () => { if (spec.onSave(readForm(wrap), wrap) !== false) back(); };
    const del = $('#fDel', wrap); if (del) del.onclick = () => confirmDialog(spec.delMsg || 'Excluir este registro?', () => { spec.onDelete(); back(); });
  }

  // ---------------- ATIVIDADES (3 vistas) ----------------
  PAGES['prog-atividades'] = () => {
    pageShell('Programação', 'Atividades', 'Cada setor alimenta o que é seu — a mesma informação em três vistas.',
      `<button class="btn primary" id="progNew">${ic('plus')}Nova atividade</button>`);
    const tb = document.createElement('div'); tb.className = 'toolbar prog-toolbar';
    tb.innerHTML = `
      <div class="seg" id="progViewSeg">
        <button data-v="meu" class="${progView === 'meu' ? 'on' : ''}">Meu dia</button>
        <button data-v="quadro" class="${progView === 'quadro' ? 'on' : ''}">Quadro</button>
        <button data-v="cal" class="${progView === 'cal' ? 'on' : ''}">Calendário</button>
      </div>
      <div class="spacer"></div>
      <div class="prog-filt">${ic('grid')}<select id="progSetFilt"><option value="">Todos os setores</option>${Store.get('progSetores').map((s) => `<option value="${s.id}" ${progFilterSetor === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></div>
      <div class="prog-me">${ic('users')}<select id="progMeSel"><option value="">— quem é você? —</option>${Store.get('progPessoas').map((p) => `<option value="${p.id}" ${progMe() === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>`;
    view.appendChild(tb); Icons.apply(tb);
    const body = document.createElement('div'); body.id = 'progBody'; body.className = 'prog-body'; view.appendChild(body);
    $$('#progViewSeg button', tb).forEach((b) => (b.onclick = () => { progView = b.dataset.v; $$('#progViewSeg button', tb).forEach((x) => x.classList.toggle('on', x === b)); progRenderView(); }));
    $('#progSetFilt').onchange = (e) => { progFilterSetor = e.target.value; progRenderView(); };
    $('#progMeSel').onchange = (e) => { setProgMe(e.target.value); progRenderView(); };
    $('#progNew').onclick = () => progFormAtividade();
    progRenderView();
  };

  function progAtividadesList() { let l = Store.get('progAtividades').slice(); if (progFilterSetor) l = l.filter((a) => (a.setores || []).includes(progFilterSetor)); return l; }

  function progRenderView() {
    const body = $('#progBody'); if (!body) return;
    if (progView === 'quadro') progRenderQuadro(body);
    else if (progView === 'cal') progRenderCalendario(body);
    else progRenderMeuDia(body);
  }

  function progRenderMeuDia(body) {
    const me = progMe(); const mySet = me ? progPessoaSetores(me) : [];
    let list = progAtividadesList();
    if (me) list = list.filter((a) => a.responsavelId === me || (a.setores || []).some((s) => mySet.includes(s)));
    list = list.filter((a) => a.status !== 'done').concat(list.filter((a) => a.status === 'done'));
    list.sort((a, b) => (a.status === 'done') - (b.status === 'done') || String(a.prazo || '9').localeCompare(String(b.prazo || '9')));
    body.innerHTML = list.length
      ? `<div class="prog-list">${list.map(progAtvRow).join('')}</div>`
      : emptyState('list', me ? 'Nada na sua fila' : 'Nenhuma atividade ainda', me ? 'Crie com "Nova atividade".' : 'Diga quem você é no seletor acima, ou crie a primeira atividade.');
    Icons.apply(body);
    $$('[data-atv]', body).forEach((c) => (c.onclick = (e) => { if (e.target.closest('[data-rnc-atv]')) return; const a = Store.find('progAtividades', c.dataset.atv); if (a) progFormAtividade(a); }));
    $$('[data-rnc-atv]', body).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const a = Store.find('progAtividades', b.dataset.rncAtv); progFormRNC({ atividadeId: a.id, descricao: a.titulo }); }));
  }

  function progAtvRow(a) {
    return `<div class="prog-row" data-atv="${a.id}">
      <span class="pc-prio prio-${a.prioridade || 'media'}" title="Prioridade ${PROG_PRIOR[a.prioridade] || 'Média'}"></span>
      <div class="pr-main">
        <b>${esc(a.titulo)}</b>
        ${a.detalhe ? `<span class="pr-sub">${esc(a.detalhe)}</span>` : ''}
        <div class="pc-chips">${(a.setores || []).map((s) => `<span class="pc-chip">${esc(progSetorNome(s))}</span>`).join('')}${a.responsavelId ? `<span class="pc-chip resp">${ic('users')}${esc((progPessoaNome(a.responsavelId) || '').split(' ')[0])}</span>` : ''}${a.rncId ? `<span class="pc-chip rnc">${ic('alert')}RNC</span>` : ''}</div>
      </div>
      <div class="pr-right">
        ${progStatusBadge(a.status)}${pPrazoBadge(a.prazo)}
        <button class="mini-btn" data-rnc-atv="${a.id}" title="Abrir RNC a partir desta atividade">${ic('alert')}</button>
      </div>
    </div>`;
  }

  function progAtvCardMini(a, withResp) {
    return `<div class="prog-card" data-atv="${a.id}" draggable="true">
      <div class="pc-top"><span class="pc-prio prio-${a.prioridade || 'media'}"></span><b>${esc(a.titulo)}</b></div>
      ${(a.setores || []).length ? `<div class="pc-chips">${a.setores.map((s) => `<span class="pc-chip">${esc(progSetorNome(s))}</span>`).join('')}</div>` : ''}
      <div class="pc-foot">${pPrazoBadge(a.prazo)}${withResp && a.responsavelId ? `<span class="pc-resp">${esc((progPessoaNome(a.responsavelId) || '').split(' ')[0])}</span>` : ''}</div>
    </div>`;
  }

  function progRenderQuadro(body) {
    const list = progAtividadesList();
    body.innerHTML = `<div class="kb">${PROG_ATV_COLS.map((col) => {
      const items = list.filter((a) => (a.status || 'todo') === col);
      return `<div class="kb-col">
        <div class="kb-head"><span class="kb-dot ${PROG_ATV_STATUS[col].cls}"></span>${PROG_ATV_STATUS[col].label}<span class="kb-count">${items.length}</span></div>
        <div class="kb-drop" data-drop="${col}">${items.map((a) => progAtvCardMini(a, true)).join('') || '<div class="kb-empty">Arraste aqui</div>'}</div>
      </div>`;
    }).join('')}</div>`;
    Icons.apply(body);
    progBindDnd(body, (id, col) => { Store.update('progAtividades', id, { status: col }); progRenderView(); });
  }

  function progRenderCalendario(body) {
    if (!progWeek) progWeek = pWeekStart(pToday());
    const days = Array.from({ length: 7 }, (_, i) => pAddDays(progWeek, i));
    const list = progAtividadesList();
    body.innerHTML = `
      <div class="cal-nav">
        <button class="btn sm" id="calPrev">${ic('chevron')}<span>Semana anterior</span></button>
        <div class="cal-range">${pFmtBR(days[0])} — ${pFmtBR(days[6])}</div>
        <button class="btn sm" id="calToday">Hoje</button>
        <button class="btn sm" id="calNext"><span>Próxima</span>${ic('chevron')}</button>
      </div>
      <div class="cal7">${days.map((d, i) => {
        const items = list.filter((a) => a.prazo === d);
        const isToday = d === pToday();
        return `<div class="cal7-day${isToday ? ' today' : ''}" data-drop="${d}">
          <div class="c7-head"><span class="c7-dow">${DIAS_SEMANA[i]}</span><span class="c7-day">${d.split('-')[2]}</span></div>
          <div class="c7-body">${items.map((a) => progAtvCardMini(a, false)).join('')}</div>
        </div>`;
      }).join('')}</div>
      <p class="cal-hint">${ic('calendar')} Arraste um card de um dia para o outro para remarcar o prazo.</p>`;
    Icons.apply(body);
    $('#calPrev', body).onclick = () => { progWeek = pAddDays(progWeek, -7); progRenderView(); };
    $('#calNext', body).onclick = () => { progWeek = pAddDays(progWeek, 7); progRenderView(); };
    $('#calToday', body).onclick = () => { progWeek = pWeekStart(pToday()); progRenderView(); };
    progBindDnd(body, (id, day) => { Store.update('progAtividades', id, { prazo: day }); progRenderView(); });
  }

  // drag-and-drop genérico: cards [data-atv] → zonas [data-drop]
  function progBindDnd(scope, onDrop) {
    $$('[data-atv]', scope).forEach((c) => {
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', c.dataset.atv); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
      c.addEventListener('click', () => { const a = Store.find('progAtividades', c.dataset.atv); if (a) progFormAtividade(a); });
    });
    $$('[data-drop]', scope).forEach((z) => {
      z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('over'); });
      z.addEventListener('dragleave', () => z.classList.remove('over'));
      z.addEventListener('drop', (e) => { e.preventDefault(); z.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (id) onDrop(id, z.dataset.drop); });
    });
  }

  function progFormAtividade(a) {
    const editing = !!(a && a.id); a = a || {};
    const pessoaOpts = [{ v: '', t: '— ninguém —' }].concat(Store.get('progPessoas').map((p) => ({ v: p.id, t: p.nome })));
    const setores = Store.get('progSetores');
    const sel = new Set(a.setores || []);
    progOpenForm({
      title: editing ? 'Editar atividade' : 'Nova atividade', sub: 'Programação · atividade', back: 'prog-atividades', editing,
      html: `<div class="panel panel-pad"><div class="form-grid">
        ${field('Título', 'titulo', a.titulo, 'text', { full: true, ph: 'O que precisa ser feito' })}
        ${field('Detalhe', 'detalhe', a.detalhe, 'textarea', { full: true, ph: 'Contexto, cliente, exigências…' })}
        ${field('Responsável', 'responsavelId', a.responsavelId, 'select', { options: pessoaOpts })}
        ${field('Prazo', 'prazo', a.prazo || pToday(), 'date')}
        ${field('Status', 'status', a.status || 'todo', 'select', { options: PROG_ATV_COLS.map((s) => ({ v: s, t: PROG_ATV_STATUS[s].label })) })}
        ${field('Prioridade', 'prioridade', a.prioridade || 'media', 'select', { options: Object.keys(PROG_PRIOR).map((k) => ({ v: k, t: PROG_PRIOR[k] })) })}
        <div class="field full"><label>Setores vinculados <span class="lbl-hint">aparece no To-do de cada um</span></label>
          <div class="wrap prog-setchips">${setores.length ? setores.map((s) => `<button type="button" class="chip prog-chip ${sel.has(s.id) ? 'on' : ''}" data-set="${s.id}">${esc(s.nome)}</button>`).join('') : '<span class="hint">Cadastre setores em Equipe & Setores.</span>'}</div>
        </div>
      </div></div>`,
      afterRender: (w) => { $$('.prog-chip', w).forEach((c) => (c.onclick = () => c.classList.toggle('on'))); },
      onSave: (d, w) => {
        if (!d.titulo) { toast('Dê um título à atividade', 'warn'); return false; }
        const obj = { titulo: d.titulo, detalhe: d.detalhe, responsavelId: d.responsavelId, prazo: d.prazo, status: d.status, prioridade: d.prioridade, setores: $$('.prog-chip.on', w).map((c) => c.dataset.set) };
        if (editing) { Store.update('progAtividades', a.id, obj); toast('Atividade atualizada'); }
        else { obj.criadoEm = pToday(); Store.add('progAtividades', obj); toast('Atividade criada'); }
      },
      onDelete: editing ? () => { Store.remove('progAtividades', a.id); toast('Atividade excluída', 'info'); } : null,
      delMsg: 'Excluir esta atividade?',
    });
  }

  // ---------------- RNC (Registro de Não Conformidade) ----------------
  PAGES['prog-rnc'] = () => {
    pageShell('Programação', 'Não Conformidades', 'Registro, tratativa e ação corretiva — rastreável para IATF 16949 / ISO 9001.',
      `<button class="btn primary" id="progNewRnc">${ic('plus')}Abrir RNC</button>`);
    $('#progNewRnc').onclick = () => progFormRNC();

    const me = progMe(); const mySet = me ? progPessoaSetores(me) : [];
    const rncs = Store.get('progRNC');

    // Painel "minhas ações de RNC" (plano de ação que caiu no meu setor)
    if (me) {
      const acoes = [];
      rncs.forEach((r) => (r.planoAcao || []).forEach((pa, idx) => { if (mySet.includes(pa.setorId) && pa.status !== 'concluida') acoes.push({ r, pa, idx }); }));
      const pan = document.createElement('div');
      pan.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('alert')}</span>Minhas ações de RNC</h2></div>`;
      if (acoes.length) {
        pan.innerHTML += `<div class="prog-list">${acoes.map(({ r, pa }) => `<div class="prog-row" data-rnc="${r.id}">
          <span class="pc-prio prio-alta"></span>
          <div class="pr-main"><b>${esc(pa.acao || '(ação)')}</b><span class="pr-sub">${esc(r.numero)} · ${esc(r.descricao || '')}</span></div>
          <div class="pr-right">${progBadge(pa.status === 'em_andamento' ? 'info' : 'warn', PROG_PA_STATUS[pa.status] || 'Pendente')}${pPrazoBadge(pa.prazo)}</div>
        </div>`).join('')}</div>`;
      } else {
        pan.innerHTML += `<div class="tbl-wrap">${emptyState('check', 'Nenhuma ação de RNC pra você', 'Quando uma RNC distribuir uma ação pro seu setor, ela aparece aqui.')}</div>`;
      }
      view.appendChild(pan); Icons.apply(pan);
      $$('[data-rnc]', pan).forEach((el) => (el.onclick = () => { const r = Store.find('progRNC', el.dataset.rnc); if (r) progFormRNC(r); }));
    }

    const sh = document.createElement('div');
    sh.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('list')}</span>Todas as RNCs</h2></div>`;
    view.appendChild(sh); Icons.apply(sh);
    const tw = document.createElement('div'); tw.className = 'tbl-wrap';
    tw.innerHTML = rncs.length
      ? `<table class="data"><thead><tr><th>RNC</th><th>Descrição</th><th>Origem</th><th>Ações</th><th>Status</th></tr></thead><tbody>${rncs.map((r) => `<tr data-rnc="${r.id}">
          <td><b>${esc(r.numero)}</b></td>
          <td>${esc(r.descricao || '—')}</td>
          <td>${esc(r.origem || '—')}</td>
          <td>${(r.planoAcao || []).length} ação(ões)</td>
          <td>${progBadge(r.status === 'fechada' ? 'ok' : r.status === 'aberta' ? 'danger' : 'warn', PROG_RNC_STATUS[r.status] || 'Aberta')}</td>
        </tr>`).join('')}</tbody></table>`
      : emptyState('alert', 'Nenhuma RNC registrada', 'Clique em "Abrir RNC" ou use o botão de alerta numa atividade.');
    view.appendChild(tw); Icons.apply(tw);
    $$('tr[data-rnc]', tw).forEach((tr) => (tr.onclick = () => { const r = Store.find('progRNC', tr.dataset.rnc); if (r) progFormRNC(r); }));
  };

  function progPaRowHtml(pa) {
    pa = pa || {};
    const setores = Store.get('progSetores'), pessoas = Store.get('progPessoas');
    return `<div class="pa-row">
      <input class="pa-acao" placeholder="Ação corretiva a tomar" value="${esc(pa.acao || '')}">
      <select class="pa-setor"><option value="">Setor…</option>${setores.map((s) => `<option value="${s.id}" ${pa.setorId === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select>
      <select class="pa-resp"><option value="">Responsável…</option>${pessoas.map((p) => `<option value="${p.id}" ${pa.responsavelId === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
      <input class="pa-prazo" type="date" value="${esc(pa.prazo || '')}">
      <select class="pa-status">${Object.keys(PROG_PA_STATUS).map((k) => `<option value="${k}" ${(pa.status || 'pendente') === k ? 'selected' : ''}>${PROG_PA_STATUS[k]}</option>`).join('')}</select>
      <button type="button" class="mini-btn danger pa-del" title="Remover ação">${ic('x')}</button>
    </div>`;
  }

  function progFormRNC(r) {
    const editing = !!(r && r.id);
    const fromAtv = r && r.atividadeId && !r.id;
    r = r || {};
    const numero = editing ? r.numero : ('RNC-' + String(Store.get('progRNC').length + 1).padStart(3, '0'));
    const opt = (v, list) => list.map((o) => `<option value="${o}" ${v === o ? 'selected' : ''}>${o}</option>`).join('');
    const atividadeId = editing ? r.atividadeId : (r.atividadeId || null);
    progOpenForm({
      title: editing ? `Editar ${numero}` : `Abrir ${numero}`, sub: 'Programação · não conformidade', back: 'prog-rnc', editing,
      html: `<div class="panel panel-pad rnc-form">
        <div class="form-sec">${ic('alert')}O problema</div>
        <div class="form-grid">
          ${field('Descrição da não conformidade', 'descricao', r.descricao, 'textarea', { full: true, ph: 'O que aconteceu, onde, quando…' })}
          <div class="field"><label>Origem</label><select name="origem">${opt(r.origem || (fromAtv ? 'Atividade' : 'Processo'), ['Atividade', 'Cliente', 'Auditoria', 'Processo', 'Fornecedor'])}</select></div>
          <div class="field"><label>Severidade</label><select name="severidade">${opt(r.severidade || 'Média', ['Baixa', 'Média', 'Alta', 'Crítica'])}</select></div>
        </div>
        <div class="form-sec">${ic('shield')}Contenção e disposição</div>
        <div class="form-grid">
          ${field('Correção imediata (contenção)', 'correcao', r.correcao, 'textarea', { full: true, ph: 'O que foi feito na hora pra conter' })}
          <div class="field full"><label>Disposição do produto não conforme</label><select name="disposicao">${opt(r.disposicao || '', ['', 'Usar como está', 'Retrabalhar', 'Refugar', 'Devolver'])}</select></div>
        </div>
        <div class="form-sec">${ic('activity')}Causa raiz</div>
        <div class="form-grid">${field('Análise de causa (5 porquês / Ishikawa)', 'causaRaiz', r.causaRaiz, 'textarea', { full: true, ph: 'Por que aconteceu, na raiz?' })}</div>
        <div class="form-sec">${ic('list')}Plano de ação <span class="lbl-hint">cada linha cai no painel de RNC do setor</span></div>
        <div class="parts-head pa-head"><span>Ação</span><span>Setor</span><span>Responsável</span><span>Prazo</span><span>Status</span><span></span></div>
        <div id="paRows">${(r.planoAcao || []).map(progPaRowHtml).join('')}</div>
        <button type="button" class="btn ghost sm addrow" id="paAdd">${ic('plus')}Adicionar ação</button>
        <div class="form-sec">${ic('check')}Verificação de eficácia</div>
        <div class="form-grid">
          ${field('Data da verificação', 'verifData', (r.verificacao || {}).data, 'date')}
          <div class="field"><label>Foi eficaz?</label><select name="verifEficaz">${opt((r.verificacao || {}).eficaz || '', ['', 'Sim', 'Não'])}</select></div>
          ${field('Observação', 'verifObs', (r.verificacao || {}).obs, 'text', { full: true })}
        </div>
        <div class="form-sec">${ic('activity')}Situação</div>
        <div class="form-grid"><div class="field full"><label>Status da RNC</label><select name="status">${Object.keys(PROG_RNC_STATUS).map((k) => `<option value="${k}" ${(r.status || 'aberta') === k ? 'selected' : ''}>${PROG_RNC_STATUS[k]}</option>`).join('')}</select></div></div>
      </div>`,
      afterRender: (w) => {
        const bindPaDel = () => $$('.pa-del', w).forEach((b) => (b.onclick = () => b.closest('.pa-row').remove()));
        bindPaDel();
        $('#paAdd', w).onclick = () => { const wrap = $('#paRows', w); wrap.insertAdjacentHTML('beforeend', progPaRowHtml()); Icons.apply(wrap); bindPaDel(); };
      },
      onSave: (d, w) => {
        if (!d.descricao) { toast('Descreva a não conformidade', 'warn'); return false; }
        const planoAcao = $$('.pa-row', w).map((row) => ({ acao: $('.pa-acao', row).value.trim(), setorId: $('.pa-setor', row).value, responsavelId: $('.pa-resp', row).value, prazo: $('.pa-prazo', row).value, status: $('.pa-status', row).value })).filter((x) => x.acao);
        const obj = { numero, descricao: d.descricao, origem: d.origem, severidade: d.severidade, correcao: d.correcao, disposicao: d.disposicao, causaRaiz: d.causaRaiz, planoAcao, verificacao: { data: d.verifData, eficaz: d.verifEficaz, obs: d.verifObs }, status: d.status, atividadeId };
        if (editing) { Store.update('progRNC', r.id, obj); toast('RNC atualizada'); }
        else { obj.criadoEm = pToday(); const novo = Store.add('progRNC', obj); if (novo.atividadeId) Store.update('progAtividades', novo.atividadeId, { rncId: novo.id }); toast('RNC aberta'); }
      },
      onDelete: editing ? () => { Store.remove('progRNC', r.id); toast('RNC excluída', 'info'); } : null,
      delMsg: `Excluir a ${numero}?`,
    });
  }

  // ---------------- CADASTROS (equipe & setores) ----------------
  PAGES['prog-cadastros'] = () => {
    pageShell('Programação', 'Equipe & Setores', 'Quem alimenta o sistema e a que setores pertence.',
      `<button class="btn primary" id="progNewP">${ic('plus')}Nova pessoa</button>`);
    $('#progNewP').onclick = () => progFormPessoa();

    const sh = document.createElement('div');
    sh.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('grid')}</span>Setores</h2><button class="btn sm" id="progNewSet">${ic('plus')}Novo setor</button></div>
      <div class="wrap prog-setores">${Store.get('progSetores').map((s) => `<span class="chip prog-set-chip" data-set="${s.id}">${esc(s.nome)}<button class="chip-x" data-delset="${s.id}" title="Remover">${ic('x')}</button></span>`).join('') || '<span class="hint">Nenhum setor ainda.</span>'}</div>`;
    view.appendChild(sh); Icons.apply(sh);
    $('#progNewSet').onclick = () => progFormSetor();
    $$('[data-set]', sh).forEach((c) => (c.onclick = (e) => { if (e.target.closest('[data-delset]')) return; progFormSetor(Store.find('progSetores', c.dataset.set)); }));
    $$('[data-delset]', sh).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const s = Store.find('progSetores', b.dataset.delset); confirmDialog(`Remover o setor "${esc(s.nome)}"?`, () => { Store.remove('progSetores', s.id); refreshPage(); toast('Setor removido', 'info'); }); }));

    const sh2 = document.createElement('div');
    sh2.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('users')}</span>Pessoas</h2></div>`;
    view.appendChild(sh2); Icons.apply(sh2);
    const pessoas = Store.get('progPessoas');
    const tw = document.createElement('div'); tw.className = 'tbl-wrap';
    tw.innerHTML = pessoas.length
      ? `<table class="data"><thead><tr><th>Nome</th><th>Função</th><th>Setores</th><th>Status</th><th></th></tr></thead><tbody>${pessoas.map((p) => `<tr data-p="${p.id}">
          <td><b>${esc(p.nome)}</b></td>
          <td>${esc(p.funcao || '—')}</td>
          <td>${(p.setores || []).map((s) => `<span class="pc-chip">${esc(progSetorNome(s))}</span>`).join('') || '—'}</td>
          <td>${progBadge(p.ativo === false ? 'neutral' : 'ok', p.ativo === false ? 'Inativo' : 'Ativo')}</td>
          <td><div class="row-actions"><button class="mini-btn" data-editp="${p.id}" title="Editar">${ic('edit')}</button><button class="mini-btn danger" data-delp="${p.id}" title="Excluir">${ic('trash')}</button></div></td>
        </tr>`).join('')}</tbody></table>`
      : emptyState('users', 'Nenhuma pessoa cadastrada', 'Clique em "Nova pessoa".');
    view.appendChild(tw); Icons.apply(tw);
    $$('[data-editp]', tw).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); progFormPessoa(Store.find('progPessoas', b.dataset.editp)); }));
    $$('[data-delp]', tw).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const p = Store.find('progPessoas', b.dataset.delp); confirmDialog(`Excluir ${esc(p.nome)}?`, () => { Store.remove('progPessoas', p.id); refreshPage(); toast('Pessoa removida', 'info'); }); }));
    $$('tr[data-p]', tw).forEach((tr) => (tr.onclick = () => progFormPessoa(Store.find('progPessoas', tr.dataset.p))));
  };

  function progFormSetor(s) {
    const editing = !!(s && s.id); s = s || {};
    progOpenForm({ title: editing ? 'Editar setor' : 'Novo setor', sub: 'Programação · setor', back: 'prog-cadastros', editing,
      html: `<div class="panel panel-pad"><div class="form-grid">${field('Nome do setor', 'nome', s.nome, 'text', { full: true, ph: 'Ex: Engenharia' })}</div></div>`,
      onSave: (d) => { if (!d.nome) { toast('Informe o nome', 'warn'); return false; } if (editing) Store.update('progSetores', s.id, { nome: d.nome }); else Store.add('progSetores', { nome: d.nome }); toast('Setor salvo'); },
      onDelete: editing ? () => { Store.remove('progSetores', s.id); toast('Setor removido', 'info'); } : null, delMsg: 'Remover este setor?' });
  }

  function progFormPessoa(p) {
    const editing = !!(p && p.id); p = p || {};
    const setores = Store.get('progSetores'); const sel = new Set(p.setores || []);
    progOpenForm({ title: editing ? 'Editar pessoa' : 'Nova pessoa', sub: 'Programação · equipe', back: 'prog-cadastros', editing,
      html: `<div class="panel panel-pad"><div class="form-grid">
        ${field('Nome', 'nome', p.nome, 'text', { full: true, ph: 'Nome completo' })}
        ${field('Função', 'funcao', p.funcao, 'text', { full: true, ph: 'Ex: Instalador, Analista, Comprador' })}
        <div class="field full"><label>Setores</label><div class="wrap prog-setchips">${setores.length ? setores.map((s) => `<button type="button" class="chip prog-chip ${sel.has(s.id) ? 'on' : ''}" data-set="${s.id}">${esc(s.nome)}</button>`).join('') : '<span class="hint">Cadastre setores primeiro.</span>'}</div></div>
        ${sw('Ativo', 'ativo', p.ativo !== false)}
      </div></div>`,
      afterRender: (w) => { $$('.prog-chip', w).forEach((c) => (c.onclick = () => c.classList.toggle('on'))); },
      onSave: (d, w) => { if (!d.nome) { toast('Informe o nome', 'warn'); return false; } const obj = { nome: d.nome, funcao: d.funcao, ativo: d.ativo, setores: $$('.prog-chip.on', w).map((c) => c.dataset.set) }; if (editing) Store.update('progPessoas', p.id, obj); else Store.add('progPessoas', obj); toast('Pessoa salva'); },
      onDelete: editing ? () => { Store.remove('progPessoas', p.id); toast('Pessoa removida', 'info'); } : null, delMsg: `Excluir ${p.nome || 'esta pessoa'}?` });
  }

  /* =====================================================================
     PROGRAMAÇÃO — Fase 2: motor de viabilidade + pedidos + catálogo
     Motor determinístico (porta do DayDay, com faseamento de material no
     tempo). A IA só vai narrar isto na Fase 3 — aqui são contas.
     ===================================================================== */
  const PROG_PED_STATUS = { rascunho: 'Rascunho', analise: 'Em análise', aprovado: 'Aprovado', execucao: 'Em execução', concluido: 'Concluído' };
  const PROG_PED_FIRM = ['aprovado', 'execucao'];
  const PROG_NIVEL_CLS = { verde: 'ok', amarelo: 'warn', vermelho: 'danger' };
  let progDraftId = null;

  function progAddMonths(iso, m) { return pAddDays(iso || pToday(), Math.round(m * 30)); }
  function progOverlap(aI, aF, bI, bF) { if (!aI || !aF || !bI || !bF) return false; return pParse(aI) <= pParse(bF) && pParse(bI) <= pParse(aF); }
  function progConfig() { return Store.get('progConfig')[0] || { leadTimeReposicaoPadrao: 7 }; }

  // ----- O MOTOR: dá ou não dá, e por quê -----
  function progAvaliar(pedido) {
    const outros = Store.get('progPedidos').filter((p) => p.id !== pedido.id);
    const empenho = {};
    outros.forEach((p) => { if (!PROG_PED_FIRM.includes(p.status)) return; (p.bom || []).forEach((b) => { const tot = (Number(b.qtdPorUnidade) || 0) * (Number(p.quantidade) || 1); empenho[b.pn] = (empenho[b.pn] || 0) + tot; }); });
    const estoqueMap = {}; Store.get('progEstoque').forEach((e) => (estoqueMap[e.pn] = e));
    const qtd = Number(pedido.quantidade) || 1;
    const ritmo = Number(pedido.ritmoMensal) || 0;
    const forns = Store.get('progFornecedores').slice().sort((a, b) => (a.leadTimeDias || 0) - (b.leadTimeDias || 0));
    const leadTime = forns[0] ? forns[0].leadTimeDias : progConfig().leadTimeReposicaoPadrao;
    const fornecedorSugerido = forns[0] ? forns[0].nome : null;
    const inicio = pedido.inicio || pToday();

    const itens = (pedido.bom || []).map((b) => {
      const e = estoqueMap[b.pn];
      const estoque = e ? (Number(e.quantidade) || 0) : 0;
      const empenhadoOutros = empenho[b.pn] || 0;
      const livre = estoque - empenhadoOutros;
      const porUnidade = Number(b.qtdPorUnidade) || 0;
      const precisaTotal = porUnidade * qtd;
      const falta = Math.max(0, precisaTotal - livre);
      let cobreMeses = null, dataLimitePedido = null, precisaReabastecer = false, podePedirATempo = true;
      const consumoMes = porUnidade * ritmo;
      if (ritmo > 0 && consumoMes > 0) {
        cobreMeses = livre / consumoMes;
        if (cobreMeses < (qtd / ritmo)) {
          precisaReabastecer = true;
          dataLimitePedido = pAddDays(progAddMonths(inicio, Math.max(0, cobreMeses)), -leadTime);
          podePedirATempo = pDiff(pToday(), dataLimitePedido) >= 0;
        }
      } else if (falta > 0) {
        precisaReabastecer = true;
        dataLimitePedido = pAddDays(inicio, -leadTime);
        podePedirATempo = pDiff(pToday(), dataLimitePedido) >= 0;
      }
      return { pn: b.pn, descricao: b.descricao || (e ? e.descricao : '') || '', porUnidade, precisaTotal, estoque, empenhadoOutros, livre, falta, desconhecido: !e, cobreMeses, dataLimitePedido, precisaReabastecer, podePedirATempo };
    });

    const familia = Store.find('progFamilias', pedido.familiaId);
    const necessarias = familia ? (familia.pessoasNecessarias || 0) : 0;
    const alocadas = (pedido.equipeIds || []).length;
    const insuficiente = !!familia && alocadas < necessarias;
    const conflitos = [];
    (pedido.equipeIds || []).forEach((pid) => {
      const pessoa = Store.find('progPessoas', pid);
      outros.forEach((o) => { if (o.status === 'concluido' || o.status === 'rascunho') return; if (!(o.equipeIds || []).includes(pid)) return; if (progOverlap(pedido.inicio, pedido.deadline, o.inicio, o.deadline)) conflitos.push({ pessoa: pessoa ? pessoa.nome : '—', pedido: o.titulo }); });
    });

    let duracaoDias = 0;
    if (ritmo > 0) duracaoDias = Math.ceil((qtd / ritmo) * 30);
    else if (familia) duracaoDias = (familia.baselineDias || 0) * qtd;
    const janelaDias = (pedido.inicio && pedido.deadline) ? pDiff(pedido.inicio, pedido.deadline) + 1 : 0;
    const cabe = !duracaoDias || janelaDias >= duracaoDias;
    const inicioNecessario = (pedido.deadline && duracaoDias) ? pAddDays(pedido.deadline, -(duracaoDias - 1)) : null;

    const motivos = [];
    if (!familia) motivos.push({ nivel: 'amarelo', titulo: 'Sem família de serviço', detalhe: 'Selecione uma família pra eu estimar a duração e a capacidade de equipe.' });
    else if (!cabe) motivos.push({ nivel: 'vermelho', titulo: 'Janela curta demais', detalhe: `A execução estimada leva ${duracaoDias} dia(s), mas entre início e deadline só há ${janelaDias}. Comece até ${pFmtBR(inicioNecessario)} ou estenda o prazo.` });
    itens.forEach((i) => {
      if (i.desconhecido) { motivos.push({ nivel: 'amarelo', titulo: `"${i.pn}" não está no estoque`, detalhe: 'Esse código não existe na fonte de estoque — confira o de-para do BOM ou atualize o estoque.' }); return; }
      if (i.precisaReabastecer) {
        if (!i.podePedirATempo) motivos.push({ nivel: 'vermelho', titulo: `Sem tempo de repor "${i.pn}"`, detalhe: `${i.cobreMeses != null ? `O estoque livre cobre ~${i.cobreMeses.toFixed(1)} mês(es). ` : `Faltam ${i.falta} un. `}Era pra pedir até ${pFmtBR(i.dataLimitePedido)} (já passou). Entregar no prazo fica inviável.` });
        else motivos.push({ nivel: 'amarelo', titulo: `Repor "${i.pn}"${i.descricao ? ` (${i.descricao})` : ''}`, detalhe: `${i.cobreMeses != null ? `Cobre ~${i.cobreMeses.toFixed(1)} mês(es) — ` : `Faltam ${i.falta} un. — `}peça${fornecedorSugerido ? ` ao ${fornecedorSugerido}` : ''} até ${pFmtBR(i.dataLimitePedido)} (lead ${leadTime}d).` });
      }
    });
    conflitos.forEach((c) => motivos.push({ nivel: 'vermelho', titulo: `${c.pessoa} em dois lugares`, detalhe: `Já alocado(a) em "${c.pedido}" no mesmo período. Troque a pessoa ou remarque.` }));
    if (insuficiente) motivos.push({ nivel: 'amarelo', titulo: 'Mão de obra abaixo do ideal', detalhe: `Essa família pede ${necessarias} pessoa(s), você alocou ${alocadas}.` });

    const nivel = motivos.some((m) => m.nivel === 'vermelho') ? 'vermelho' : motivos.some((m) => m.nivel === 'amarelo') ? 'amarelo' : 'verde';
    const resumo = nivel === 'verde' ? 'Tudo certo: material coberto, equipe disponível e dá tempo.' : nivel === 'amarelo' ? 'Dá pra fazer, mas depende de resolver os pontos abaixo.' : 'Do jeito que está, não é viável. Veja os impedimentos.';
    return { nivel, itens, equipe: { alocadas, necessarias, insuficiente, conflitos }, prazo: { temFamilia: !!familia, duracaoDias, janelaDias, cabe, inicioNecessario }, leadTime, fornecedorSugerido, motivos, resumo };
  }

  function progParecerTexto(a) {
    const l = [`[${a.nivel.toUpperCase()}] ${a.resumo}`];
    a.motivos.forEach((m) => l.push(`• ${m.titulo}: ${m.detalhe}`));
    return l.join('\n');
  }

  // contexto PRONTO pra IA (a IA só narra isto; não recalcula nada)
  function progMontarContexto(a, p) {
    const L = [];
    L.push(`Pedido: "${p.titulo || '(sem título)'}" — cliente ${p.cliente || '—'}, ${p.quantidade || 1} un.${p.ritmoMensal ? `, ritmo ${p.ritmoMensal}/mês` : ''}.`);
    L.push(`Produto/serviço: ${p.produto || '—'}. Início ${pFmtBR(p.inicio)} · Deadline ${pFmtBR(p.deadline)}.`);
    L.push(`Veredito do motor: ${a.nivel.toUpperCase()} — ${a.resumo}`);
    if (a.prazo.temFamilia) L.push(`Prazo: duração estimada ${a.prazo.duracaoDias}d, janela disponível ${a.prazo.janelaDias}d, começar até ${pFmtBR(a.prazo.inicioNecessario)}.`);
    else L.push('Prazo: sem família de serviço selecionada (duração não estimada).');
    if (a.itens.length) {
      L.push('Material (PN · precisa · livre · situação):');
      a.itens.forEach((i) => L.push(`  - ${i.pn}${i.descricao ? ` (${i.descricao})` : ''} · precisa ${i.precisaTotal} · livre ${i.livre}${i.precisaReabastecer ? ` · REPOR${i.cobreMeses != null ? ` (estoque cobre ~${i.cobreMeses.toFixed(1)} mês)` : ''} até ${pFmtBR(i.dataLimitePedido)}${i.podePedirATempo ? '' : ' [prazo de pedir já passou]'}` : ' · ok'}${i.desconhecido ? ' · NÃO cadastrado no estoque' : ''}`));
      L.push(`Fornecedor mais rápido: ${a.fornecedorSugerido || '—'} (lead ${a.leadTime}d).`);
    }
    if (a.equipe.conflitos.length) L.push(`Conflitos de equipe: ${a.equipe.conflitos.map((c) => `${c.pessoa} já em "${c.pedido}"`).join('; ')}.`);
    L.push(`Equipe alocada: ${a.equipe.alocadas} / necessárias ${a.equipe.necessarias}.`);
    if (a.motivos.length) { L.push('Impedimentos/ressalvas:'); a.motivos.forEach((m) => L.push(`  - [${m.nivel}] ${m.titulo}: ${m.detalhe}`)); }
    return L.join('\n');
  }

  // ----- LISTA de pedidos -----
  PAGES['prog-pedidos'] = () => {
    pageShell('Programação', 'Pedidos', 'Cada pedido passa pelo motor de viabilidade antes de virar compromisso.',
      `<button class="btn primary" id="pedNew">${ic('plus')}Novo pedido</button>`);
    $('#pedNew').onclick = () => { progDraftId = null; go('prog-pedido'); };
    const peds = Store.get('progPedidos');
    if (!peds.length) { const tw = document.createElement('div'); tw.className = 'tbl-wrap'; tw.innerHTML = emptyState('file', 'Nenhum pedido ainda', 'Clique em "Novo pedido" pra avaliar a viabilidade.'); view.appendChild(tw); Icons.apply(tw); return; }
    const list = document.createElement('div'); list.className = 'prog-list';
    list.innerHTML = peds.map((p) => { const a = progAvaliar(p); const cls = PROG_NIVEL_CLS[a.nivel]; return `<div class="prog-row" data-ped="${p.id}">
      <span class="pv-dot ${cls}" title="${a.nivel}"></span>
      <div class="pr-main"><b>${esc(p.titulo)}</b><span class="pr-sub">${esc(p.cliente || '')}${p.quantidade ? ` · ${p.quantidade} un.` : ''}${p.deadline ? ` · entrega ${pFmtBR(p.deadline)}` : ''}</span></div>
      <div class="pr-right">${progBadge(cls, a.nivel.charAt(0).toUpperCase() + a.nivel.slice(1))}${progBadge('neutral', PROG_PED_STATUS[p.status] || 'Em análise')}</div>
    </div>`; }).join('');
    view.appendChild(list); Icons.apply(list);
    $$('[data-ped]', list).forEach((el) => (el.onclick = () => { progDraftId = el.dataset.ped; go('prog-pedido'); }));
  };

  // ----- EDITOR de pedido com análise ao vivo -----
  PAGES['prog-pedido'] = () => progPedidoEditor(progDraftId);

  function progBomRowHtml(b) {
    b = b || {};
    return `<div class="bom-row"><input class="bom-pn" placeholder="PN" value="${esc(b.pn || '')}"><input class="bom-desc" placeholder="Descrição" value="${esc(b.descricao || '')}"><input class="bom-qtd" type="number" min="0" placeholder="Qtd/un." value="${b.qtdPorUnidade != null ? b.qtdPorUnidade : ''}"><button type="button" class="mini-btn danger bom-del" title="Remover">${ic('x')}</button></div>`;
  }

  function progReadPedidoForm(scope, base) {
    const d = Object.assign({}, base);
    $$('[name]', scope).forEach((el) => { if (el.closest('.bom-row')) return; d[el.name] = el.value; });
    d.quantidade = Number(d.quantidade) || 1;
    d.ritmoMensal = Number(d.ritmoMensal) || 0;
    d.equipeIds = $$('.ped-eq.on', scope).map((c) => c.dataset.p);
    d.bom = $$('.bom-row', scope).map((r) => ({ pn: $('.bom-pn', r).value.trim(), descricao: $('.bom-desc', r).value.trim(), qtdPorUnidade: Number($('.bom-qtd', r).value) || 0 })).filter((x) => x.pn);
    return d;
  }

  function progKV(k, v, tone) { return `<div class="pv-kv"><span>${esc(k)}</span><b${tone ? ` style="color:var(--${tone})"` : ''}>${esc(v)}</b></div>`; }
  function progMatSit(i) {
    if (i.desconhecido) return progBadge('neutral', 'não cadastrado');
    if (i.precisaReabastecer && !i.podePedirATempo) return progBadge('danger', 'repor — sem tempo');
    if (i.precisaReabastecer) return progBadge('warn', (i.cobreMeses != null ? `cobre ~${i.cobreMeses.toFixed(1)}m · ` : '') + 'pedir até ' + pFmtBR(i.dataLimitePedido));
    return progBadge('ok', 'ok');
  }
  function progAnaliseHtml(a) {
    const cls = PROG_NIVEL_CLS[a.nivel];
    return `<div class="panel panel-pad prog-verdict v-${a.nivel}">
      <div class="pv-head"><span class="pv-dot ${cls} big"></span><div class="pv-ht"><b>Análise do motor</b><span class="pv-resumo">${esc(a.resumo)}</span></div></div>
      ${a.motivos.length ? `<div class="pv-motivos">${a.motivos.map((m) => `<div class="pv-motivo n-${m.nivel}"><b>${esc(m.titulo)}</b><span>${esc(m.detalhe)}</span></div>`).join('')}</div>` : `<div class="pv-okbox">${ic('check')}Nenhum impedimento. Pode tocar.</div>`}
      ${a.prazo.temFamilia ? `<div class="pv-sec"><div class="pv-sec-t">Prazo</div>${progKV('Duração estimada', a.prazo.duracaoDias + ' dia(s)')}${progKV('Janela disponível', a.prazo.janelaDias + ' dia(s)')}${progKV('Começar até', pFmtBR(a.prazo.inicioNecessario), a.prazo.cabe ? '' : 'danger')}</div>` : ''}
      ${a.itens.length ? `<div class="pv-sec"><div class="pv-sec-t">Material</div><div class="tbl-wrap"><table class="data"><thead><tr><th>PN</th><th>Precisa</th><th>Livre</th><th>Situação</th></tr></thead><tbody>${a.itens.map((i) => `<tr><td><b>${esc(i.pn)}</b></td><td>${i.precisaTotal}</td><td style="color:${(i.falta > 0 || i.precisaReabastecer) ? 'var(--danger)' : 'var(--ok)'}">${i.livre}</td><td>${progMatSit(i)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    </div>`;
  }

  function progPedidoEditor(id) {
    const editing = !!id;
    const base = id ? Store.find('progPedidos', id) : null;
    const p = base ? Object.assign({}, base) : { titulo: '', cliente: '', produto: '', quantidade: 1, ritmoMensal: 0, inicio: pToday(), deadline: pAddDays(pToday(), 30), familiaId: '', equipeIds: [], bom: [], status: 'analise' };
    pageShell('Programação', editing ? 'Editar pedido' : 'Novo pedido', 'Preencha e veja o veredito recalcular ao vivo — o motor mostra o que impacta.',
      `<button class="btn" id="pedBack">${ic('chevron')}Voltar</button>`);
    const famOpts = [{ v: '', t: '— selecione —' }].concat(Store.get('progFamilias').map((f) => ({ v: f.id, t: `${f.nome} · ${f.baselineDias}d · ${f.pessoasNecessarias}p` })));
    const grid = document.createElement('div'); grid.className = 'prog-ped-grid';
    grid.innerHTML = `
      <div class="prog-formcol">
        <div class="panel panel-pad"><div class="form-grid">
          ${field('Título', 'titulo', p.titulo, 'text', { full: true, ph: 'Ex: VW — 100 caminhões dual-fuel' })}
          ${field('Cliente', 'cliente', p.cliente, 'text', { ph: 'Ex: Volkswagen' })}
          ${field('Produto / serviço', 'produto', p.produto, 'text', { ph: 'Ex: Instalação dual-fuel' })}
          ${field('Quantidade', 'quantidade', p.quantidade, 'number')}
          ${field('Ritmo (un./mês)', 'ritmoMensal', p.ritmoMensal, 'number', { hint: '0 = sem faseamento no tempo' })}
          ${field('Início', 'inicio', p.inicio, 'date')}
          ${field('Deadline', 'deadline', p.deadline, 'date')}
          ${field('Família de serviço', 'familiaId', p.familiaId, 'select', { options: famOpts })}
          ${field('Status', 'status', p.status, 'select', { options: Object.keys(PROG_PED_STATUS).map((k) => ({ v: k, t: PROG_PED_STATUS[k] })) })}
        </div></div>
        <div class="panel panel-pad">
          <label class="prog-flabel">Equipe alocada</label>
          <div class="wrap ped-eqwrap">${Store.get('progPessoas').filter((x) => x.ativo !== false).map((x) => `<button type="button" class="chip ped-eq ${(p.equipeIds || []).includes(x.id) ? 'on' : ''}" data-p="${x.id}">${esc(x.nome)}</button>`).join('') || '<span class="hint">Cadastre pessoas em Equipe & Setores.</span>'}</div>
        </div>
        <div class="panel panel-pad">
          <div class="prog-bom-top"><label class="prog-flabel">BOM — material por unidade</label><button type="button" class="btn ghost sm" id="bomAdd">${ic('plus')}Adicionar item</button></div>
          <div class="parts-head bom-head"><span>PN</span><span>Descrição</span><span>Qtd/un.</span><span></span></div>
          <div id="bomRows">${(p.bom || []).map(progBomRowHtml).join('')}</div>
        </div>
        <div class="panel panel-pad"><div class="wrap">
          <button class="btn primary" id="pedSave">${ic('check')}${editing ? 'Salvar pedido' : 'Criar pedido'}</button>
          ${editing ? `<button class="btn danger" id="pedDel">${ic('trash')}Excluir</button>` : ''}
        </div></div>
      </div>
      <div class="prog-rightcol">
        <div id="pedAnalise" class="prog-analise"></div>
        <div id="pedIA" class="prog-ia panel panel-pad">
          <div class="ia-head">${ic('activity')}<b>Consultor IA</b><span class="ia-tag">Claude</span></div>
          <div class="ia-body" id="iaBody"><p class="ia-hint">A IA lê o veredito do motor e explica em conversa — pergunte coisas tipo "e se eu empurrar o início em 1 mês?".</p></div>
          <button class="btn sm" id="iaAsk">${ic('activity')}Explicar com IA</button>
          <div class="ia-ask" id="iaAskRow" hidden><input id="iaQ" placeholder="Pergunte algo…"><button class="btn sm primary" id="iaSend">${ic('arrowUpRight')}</button></div>
        </div>
      </div>`;
    view.appendChild(grid); Icons.apply(grid);

    const renderAnalise = () => { const draft = progReadPedidoForm(grid, { id: id || '__novo' }); const an = $('#pedAnalise'); an.innerHTML = progAnaliseHtml(progAvaliar(draft)); Icons.apply(an); };

    // ----- Consultor IA (narra o parecer do motor; degrada sem chave) -----
    const iaHist = [];
    const iaAskFn = async (pergunta) => {
      const bodyEl = $('#iaBody', grid);
      if ($('.ia-hint', bodyEl)) bodyEl.innerHTML = '';
      bodyEl.insertAdjacentHTML('beforeend', `<div class="ia-msg user">${esc(pergunta || 'Explicar o parecer')}</div><div class="ia-msg bot loading">Analisando…</div>`);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      const draft = progReadPedidoForm(grid, { id: id || '__novo' });
      const contexto = progMontarContexto(progAvaliar(draft), draft);
      let r;
      try { const resp = await fetch('/api/ia', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contexto, pergunta, historico: iaHist }) }); r = await resp.json(); } catch (e) { r = { ok: false, motivo: 'rede' }; }
      $$('.ia-msg.loading', bodyEl).forEach((x) => x.remove());
      if (r.ok && r.texto) {
        bodyEl.insertAdjacentHTML('beforeend', `<div class="ia-msg bot">${esc(r.texto).replace(/\n/g, '<br>')}</div>`);
        iaHist.push({ role: 'user', content: pergunta || 'Explique o parecer.' }, { role: 'assistant', content: r.texto });
        $('#iaAskRow', grid).hidden = false;
      } else if (r.motivo === 'sem-chave') {
        bodyEl.insertAdjacentHTML('beforeend', `<div class="ia-msg bot warn">IA ainda não configurada — defina <b>ANTHROPIC_API_KEY</b> no Vercel pra ativar o chat. O parecer acima já é o veredito completo do motor.</div>`);
      } else {
        bodyEl.insertAdjacentHTML('beforeend', `<div class="ia-msg bot warn">Não consegui falar com a IA agora (${esc(r.motivo || 'erro')}).</div>`);
      }
      bodyEl.scrollTop = bodyEl.scrollHeight;
    };
    $('#iaAsk', grid).onclick = () => iaAskFn('');
    $('#iaSend', grid).onclick = () => { const q = $('#iaQ', grid).value.trim(); if (q) { $('#iaQ', grid).value = ''; iaAskFn(q); } };
    $('#iaQ', grid).addEventListener('keydown', (e) => { if (e.key === 'Enter') { const q = e.target.value.trim(); if (q) { e.target.value = ''; iaAskFn(q); } } });
    $('#pedBack', grid).onclick = () => go('prog-pedidos');
    $$('.ped-eq', grid).forEach((c) => (c.onclick = () => { c.classList.toggle('on'); renderAnalise(); }));
    const bindBomDel = () => $$('.bom-del', grid).forEach((b) => (b.onclick = () => { b.closest('.bom-row').remove(); renderAnalise(); }));
    bindBomDel();
    $('#bomAdd', grid).onclick = () => { const w = $('#bomRows', grid); w.insertAdjacentHTML('beforeend', progBomRowHtml()); Icons.apply(w); bindBomDel(); };
    grid.addEventListener('input', renderAnalise);
    grid.addEventListener('change', renderAnalise);
    $('#pedSave', grid).onclick = () => {
      const d = progReadPedidoForm(grid, {});
      if (!d.titulo) { toast('Dê um título ao pedido', 'warn'); return; }
      const a = progAvaliar(Object.assign({ id: id || '__novo' }, d));
      d.nivelSnapshot = a.nivel; d.parecer = progParecerTexto(a);
      if (editing) { Store.update('progPedidos', id, d); toast('Pedido atualizado'); }
      else { d.criadoEm = pToday(); Store.add('progPedidos', d); toast('Pedido criado'); }
      go('prog-pedidos');
    };
    const pedDel = $('#pedDel', grid); if (pedDel) pedDel.onclick = () => confirmDialog('Excluir este pedido?', () => { Store.remove('progPedidos', id); go('prog-pedidos'); toast('Pedido excluído', 'info'); });
    renderAnalise();
  }

  // ----- CATÁLOGO: famílias, fornecedores, estoque -----
  PAGES['prog-catalogo'] = () => {
    pageShell('Programação', 'Catálogo', 'Famílias de serviço, fornecedores e estoque — a base que o motor usa pra decidir.',
      `<button class="btn primary" id="famNew">${ic('plus')}Nova família</button>`);
    $('#famNew').onclick = () => progFormFamilia();

    const secFam = document.createElement('div');
    secFam.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('grid')}</span>Famílias de serviço</h2></div>`;
    view.appendChild(secFam); Icons.apply(secFam);
    const twF = document.createElement('div'); twF.className = 'tbl-wrap';
    const fams = Store.get('progFamilias');
    twF.innerHTML = fams.length ? `<table class="data"><thead><tr><th>Família</th><th>Duração base</th><th>Pessoas</th><th></th></tr></thead><tbody>${fams.map((f) => `<tr data-fam="${f.id}"><td><b>${esc(f.nome)}</b></td><td>${f.baselineDias} dia(s)</td><td>${f.pessoasNecessarias}</td><td><div class="row-actions"><button class="mini-btn" data-editfam="${f.id}">${ic('edit')}</button><button class="mini-btn danger" data-delfam="${f.id}">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table>` : emptyState('grid', 'Nenhuma família', 'Crie a primeira em "Nova família".');
    view.appendChild(twF); Icons.apply(twF);

    const secFor = document.createElement('div');
    secFor.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('box')}</span>Fornecedores</h2><button class="btn sm" id="forNew">${ic('plus')}Novo fornecedor</button></div>`;
    view.appendChild(secFor); Icons.apply(secFor);
    $('#forNew').onclick = () => progFormFornecedor();
    const twR = document.createElement('div'); twR.className = 'tbl-wrap';
    const forns = Store.get('progFornecedores');
    twR.innerHTML = forns.length ? `<table class="data"><thead><tr><th>Fornecedor</th><th>Contato</th><th>Lead time</th><th></th></tr></thead><tbody>${forns.map((f) => `<tr data-for="${f.id}"><td><b>${esc(f.nome)}</b></td><td>${esc(f.contato || '—')}</td><td>${f.leadTimeDias} dia(s)</td><td><div class="row-actions"><button class="mini-btn" data-editfor="${f.id}">${ic('edit')}</button><button class="mini-btn danger" data-delfor="${f.id}">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table>` : emptyState('box', 'Nenhum fornecedor', 'Adicione um fornecedor e o lead time.');
    view.appendChild(twR); Icons.apply(twR);

    const secEst = document.createElement('div');
    secEst.innerHTML = `<div class="section-head"><h2><span class="sh-ico">${ic('server')}</span>Estoque <span class="prog-src">manual · OMIE na Fase 3</span></h2><button class="btn sm" id="estNew">${ic('plus')}Novo item</button></div>`;
    view.appendChild(secEst); Icons.apply(secEst);
    $('#estNew').onclick = () => progFormEstoque();
    const twE = document.createElement('div'); twE.className = 'tbl-wrap';
    const est = Store.get('progEstoque');
    twE.innerHTML = est.length ? `<table class="data"><thead><tr><th>PN</th><th>Descrição</th><th>Quantidade</th><th></th></tr></thead><tbody>${est.map((e) => `<tr data-est="${e.pn}"><td><b>${esc(e.pn)}</b></td><td>${esc(e.descricao || '—')}</td><td>${e.quantidade}</td><td><div class="row-actions"><button class="mini-btn" data-editest="${esc(e.pn)}">${ic('edit')}</button><button class="mini-btn danger" data-delest="${esc(e.pn)}">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table>` : emptyState('server', 'Estoque vazio', 'Adicione itens manualmente (na Fase 3 vem do OMIE).');
    view.appendChild(twE); Icons.apply(twE);

    $$('[data-editfam]', view).forEach((b) => (b.onclick = () => progFormFamilia(Store.find('progFamilias', b.dataset.editfam))));
    $$('[data-delfam]', view).forEach((b) => (b.onclick = () => { const f = Store.find('progFamilias', b.dataset.delfam); confirmDialog(`Remover a família "${esc(f.nome)}"?`, () => { Store.remove('progFamilias', f.id); refreshPage(); toast('Família removida', 'info'); }); }));
    $$('[data-editfor]', view).forEach((b) => (b.onclick = () => progFormFornecedor(Store.find('progFornecedores', b.dataset.editfor))));
    $$('[data-delfor]', view).forEach((b) => (b.onclick = () => { const f = Store.find('progFornecedores', b.dataset.delfor); confirmDialog(`Remover "${esc(f.nome)}"?`, () => { Store.remove('progFornecedores', f.id); refreshPage(); toast('Fornecedor removido', 'info'); }); }));
    $$('[data-editest]', view).forEach((b) => (b.onclick = () => progFormEstoque(Store.get('progEstoque').find((x) => x.pn === b.dataset.editest))));
    $$('[data-delest]', view).forEach((b) => (b.onclick = () => { const pn = b.dataset.delest; confirmDialog(`Remover o item "${pn}" do estoque?`, () => { const arr = Store.get('progEstoque').filter((x) => x.pn !== pn); Store.get('progEstoque').length = 0; arr.forEach((x) => Store.get('progEstoque').push(x)); Store.save(); refreshPage(); toast('Item removido', 'info'); }); }));
  };

  function progFormFamilia(f) {
    const editing = !!(f && f.id); f = f || {};
    progOpenForm({ title: editing ? 'Editar família' : 'Nova família', sub: 'Programação · catálogo', back: 'prog-catalogo', editing,
      html: `<div class="panel panel-pad"><div class="form-grid">
        ${field('Nome da família', 'nome', f.nome, 'text', { full: true, ph: 'Ex: Instalação dual-fuel caminhão' })}
        ${field('Duração base (dias)', 'baselineDias', f.baselineDias, 'number')}
        ${field('Pessoas necessárias', 'pessoasNecessarias', f.pessoasNecessarias, 'number')}
      </div></div>`,
      onSave: (d) => { if (!d.nome) { toast('Informe o nome', 'warn'); return false; } const obj = { nome: d.nome, baselineDias: Number(d.baselineDias) || 0, pessoasNecessarias: Number(d.pessoasNecessarias) || 0 }; if (editing) Store.update('progFamilias', f.id, obj); else Store.add('progFamilias', obj); toast('Família salva'); },
      onDelete: editing ? () => { Store.remove('progFamilias', f.id); toast('Família removida', 'info'); } : null, delMsg: 'Remover esta família?' });
  }
  function progFormFornecedor(f) {
    const editing = !!(f && f.id); f = f || {};
    progOpenForm({ title: editing ? 'Editar fornecedor' : 'Novo fornecedor', sub: 'Programação · catálogo', back: 'prog-catalogo', editing,
      html: `<div class="panel panel-pad"><div class="form-grid">
        ${field('Nome', 'nome', f.nome, 'text', { full: true, ph: 'Ex: Cilindros Brasil' })}
        ${field('Contato', 'contato', f.contato, 'text', { ph: '(19) 3000-0000' })}
        ${field('Lead time (dias)', 'leadTimeDias', f.leadTimeDias, 'number', { hint: 'Prazo de entrega padrão' })}
      </div></div>`,
      onSave: (d) => { if (!d.nome) { toast('Informe o nome', 'warn'); return false; } const obj = { nome: d.nome, contato: d.contato, leadTimeDias: Number(d.leadTimeDias) || 0 }; if (editing) Store.update('progFornecedores', f.id, obj); else Store.add('progFornecedores', obj); toast('Fornecedor salvo'); },
      onDelete: editing ? () => { Store.remove('progFornecedores', f.id); toast('Fornecedor removido', 'info'); } : null, delMsg: 'Remover este fornecedor?' });
  }
  function progFormEstoque(e) {
    const editing = !!(e && e.pn); e = e || {};
    progOpenForm({ title: editing ? 'Editar item de estoque' : 'Novo item de estoque', sub: 'Programação · catálogo', back: 'prog-catalogo', editing,
      html: `<div class="panel panel-pad"><div class="form-grid">
        ${field('PN (código)', 'pn', e.pn, 'text', { full: true, ph: 'Ex: CIL-120' })}
        ${field('Descrição', 'descricao', e.descricao, 'text', { full: true })}
        ${field('Quantidade em estoque', 'quantidade', e.quantidade, 'number')}
      </div></div>`,
      onSave: (d) => { if (!d.pn) { toast('Informe o PN', 'warn'); return false; } const arr = Store.get('progEstoque'); const idx = arr.findIndex((x) => x.pn === (editing ? e.pn : d.pn)); const obj = { pn: d.pn, descricao: d.descricao, quantidade: Number(d.quantidade) || 0 }; if (idx >= 0) arr[idx] = obj; else arr.push(obj); Store.save(); toast('Estoque salvo'); },
      onDelete: editing ? () => { const arr = Store.get('progEstoque').filter((x) => x.pn !== e.pn); const ref = Store.get('progEstoque'); ref.length = 0; arr.forEach((x) => ref.push(x)); Store.save(); toast('Item removido', 'info'); } : null, delMsg: 'Remover este item do estoque?' });
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  function boot() {
    // autolimpeza: abrir convergascontrol.vercel.app/?reset zera o estado local e recarrega da nuvem
    if (/[?&#]reset\b/i.test(location.href)) {
      try { localStorage.removeItem('convergas_itops_v2'); } catch (e) {}
      try { indexedDB.deleteDatabase('convergas_files_v1'); } catch (e) {}
      location.replace(location.origin + location.pathname);
      return;
    }
    const s = Store.get('settings');
    document.documentElement.setAttribute('data-theme', s.theme || 'dark');
    document.documentElement.setAttribute('data-density', s.density || 'comfortable');
    Icons.apply(document);
    ['#themeToggle', '#themeToggleHome'].forEach((sel) => { const tt = $(sel); if (!tt) return; tt.dataset.iconDone = ''; tt.innerHTML = ''; tt.setAttribute('data-icon', (s.theme || 'dark') === 'dark' ? 'sun' : 'moon'); Icons.apply(tt); });
    toggleBgfx(s.bgfx !== false);
    buildHome();
    const hash = (location.hash || '').replace('#', '');
    try {
      if (hash && hash !== 'home' && PAGES[hash]) {
        const area = ROUTE_AREA[hash]; if (area) currentArea = area;
        renderSidebar(currentArea);
        go(hash);
      } else {
        renderSidebar('ti');
        goHome();
      }
    } catch (e) {
      // qualquer erro de rota/render não pode travar a abertura — cai na Home
      try { console.error('boot render falhou, indo p/ Home:', e); } catch (_) {}
      try { renderSidebar('ti'); goHome(); } catch (_) {}
    }
    // tela definida — liberar a renderização (remove o estado de carregamento)
    document.body.classList.remove('booting');
    // offline-first: já renderizou do cache local; agora sincroniza com a nuvem por cima
    syncCloud();
  }

  // Puxa dados reais do Supabase e re-renderiza a tela atual quando algo muda.
  function syncCloud() {
    if (!window.Store || !Store.syncFromCloud) return;
    Store.syncFromCloud((changed) => {
      if (!changed) return;
      // reflete os dados novos: home (roda/alertas), sidebar e página atual
      try { buildHome(); } catch (e) {}
      try { if (!$('#homeScreen').classList.contains('show') && PAGES[currentRoute]) { view.innerHTML = ''; PAGES[currentRoute](); } } catch (e) {}
      try { refreshSysPulse(); } catch (e) {}
    }).catch(() => {});
  }
  window.syncCloud = syncCloud;

  boot();
})();
