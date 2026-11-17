/* =============================================================================
   Login do Control Center (Supabase Auth).
   - CCAuth.start() resolve quando há um usuário logado e ativo (ou quando o login
     ainda não foi configurado no banco → modo "aberto", como era antes).
   - Senha temporária: no 1º acesso a pessoa define a própria senha.
   - Perfil (cc_perfis): nome, admin, ativo e permissões por aba.
   ============================================================================= */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const PERFIL_KEY = 'cc_perfil';
  const STORE_KEY = 'convergas_itops_v2';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SB = () => (window.Cloud && Cloud.SB) || null;

  const CCAuth = {
    modo: 'aberto',          // 'aberto' (login não configurado) | 'login'
    perfil: null,            // { id, email, nome, admin, ativo, permissoes:{abas,areas}, team_id }
    session: null,
    async token() { const sb = SB(); if (!sb) return ''; const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ''; },
    async sair() {
      try { const sb = SB(); if (sb) await sb.auth.signOut(); } catch (e) {}
      try { localStorage.removeItem(PERFIL_KEY); localStorage.removeItem(STORE_KEY); sessionStorage.clear(); } catch (e) {}
      location.replace(location.origin + location.pathname);
    },
    trocarSenha() { return telaSenha(false); },
  };
  window.CCAuth = CCAuth;

  /* ---------- tela (login / troca de senha / aviso) ---------- */
  let root = null;
  function montar() {
    if (root) return root;
    try { const st = (window.Store && Store.get('settings')) || {}; document.documentElement.setAttribute('data-theme', st.theme || 'dark'); } catch (e) {}
    root = document.createElement('div');
    root.className = 'lg-screen'; root.id = 'lgScreen';
    root.innerHTML = `<div class="hx-bg" aria-hidden="true"><span class="hx-aur a1"></span><span class="hx-aur a2"></span><span class="hx-aur a3"></span><span class="hx-dots"></span><span class="hx-grain"></span></div>
      <div class="lg-wrap"><div class="lg-card" id="lgCard"></div><p class="lg-foot">Convergas · Control Center</p></div>`;
    document.body.appendChild(root);
    document.body.classList.add('lg-on');
    return root;
  }
  function desmontar() {
    if (!root) return;
    const r = root; root = null;
    r.classList.add('out'); document.body.classList.remove('lg-on');
    setTimeout(() => r.remove(), 450);
  }
  const card = () => $('#lgCard', montar());
  const head = (titulo, sub) => `<div class="lg-brand"><span class="lg-logo"><img src="assets/logo-icone.png" alt="Convergas"></span><span><small>Convergas</small><b>Control Center</b></span></div>
    <h1>${esc(titulo)}</h1>${sub ? `<p class="lg-sub">${sub}</p>` : ''}`;
  const icons = (el) => { try { window.Icons && Icons.apply(el); } catch (e) {} };
  function erro(el, msg) { const e = $('.lg-err', el); e.innerHTML = msg ? `<span data-icon="alert"></span><span>${esc(msg)}</span>` : ''; e.classList.toggle('show', !!msg); icons(e); if (msg) { el.classList.remove('lg-shake'); void el.offsetWidth; el.classList.add('lg-shake'); } }
  const olho = (inp, btn) => { btn.onclick = () => { const on = inp.type === 'password'; inp.type = on ? 'text' : 'password'; btn.innerHTML = `<span data-icon="${on ? 'eyeOff' : 'eye'}"></span>`; btn.setAttribute('aria-label', on ? 'Esconder senha' : 'Mostrar senha'); icons(btn); }; };

  function telaLogin(resolve, msgInicial) {
    const c = card();
    c.innerHTML = `${head('Entrar', 'Use o e-mail e a senha que o administrador passou para você.')}
      <form class="lg-form" id="lgForm" novalidate>
        <label class="lg-f"><span>E-mail</span><span class="lg-in"><span data-icon="mail"></span><input id="lgEmail" type="email" autocomplete="username" inputmode="email" placeholder="nome@convergas.com.br" required></span></label>
        <label class="lg-f"><span>Senha</span><span class="lg-in"><span data-icon="lock"></span><input id="lgPass" type="password" autocomplete="current-password" placeholder="Sua senha" required><button type="button" class="lg-eye" id="lgEye" aria-label="Mostrar senha"><span data-icon="eye"></span></button></span></label>
        <div class="lg-err" role="alert"></div>
        <button class="lg-btn" id="lgGo" type="submit"><span class="lg-btn-t">Entrar</span><span class="lg-spin" aria-hidden="true"></span></button>
        <p class="lg-help">Esqueceu a senha? Peça ao administrador do sistema para gerar uma nova.</p>
      </form>`;
    icons(c);
    try { const last = localStorage.getItem('cc_last_email'); if (last) $('#lgEmail', c).value = last; } catch (e) {}
    olho($('#lgPass', c), $('#lgEye', c));
    setTimeout(() => { const f = $('#lgEmail', c).value ? $('#lgPass', c) : $('#lgEmail', c); if (!('ontouchstart' in window)) f.focus(); }, 300);
    if (msgInicial) erro(c, msgInicial);
    $('#lgForm', c).onsubmit = async (ev) => {
      ev.preventDefault();
      const email = $('#lgEmail', c).value.trim().toLowerCase(), pass = $('#lgPass', c).value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return erro(c, 'Digite um e-mail válido.');
      if (!pass) return erro(c, 'Digite a senha.');
      const btn = $('#lgGo', c); btn.disabled = true; btn.classList.add('busy'); erro(c, '');
      try {
        const { data, error } = await SB().auth.signInWithPassword({ email, password: pass });
        if (error || !data.session) {
          const m = String((error && error.message) || '');
          erro(c, /invalid login|credentials/i.test(m) ? 'E-mail ou senha incorretos.' : /banned|disabled/i.test(m) ? 'Seu acesso está desativado. Fale com o administrador.' : /fetch|network/i.test(m) ? 'Sem conexão com o servidor. Verifique a internet.' : 'Não foi possível entrar. Tente novamente.');
          btn.disabled = false; btn.classList.remove('busy'); return;
        }
        try { localStorage.setItem('cc_last_email', email); } catch (e) {}
        CCAuth.session = data.session;
        await depoisDoLogin(resolve);
      } catch (e) { erro(c, 'Sem conexão com o servidor. Verifique a internet.'); btn.disabled = false; btn.classList.remove('busy'); }
    };
  }

  function forca(s) { let n = 0; if (s.length >= 8) n++; if (s.length >= 12) n++; if (/[a-z]/.test(s) && /[A-Z]/.test(s)) n++; if (/\d/.test(s)) n++; if (/[^A-Za-z0-9]/.test(s)) n++; return Math.min(4, n); }
  function telaSenha(obrigatoria, resolve) {
    return new Promise((done) => {
      const c = card();
      c.innerHTML = `${head(obrigatoria ? 'Crie a sua senha' : 'Trocar senha', obrigatoria ? `Olá, <b>${esc((CCAuth.perfil && CCAuth.perfil.nome || '').split(' ')[0])}</b>! No primeiro acesso, troque a senha temporária por uma só sua.` : 'Escolha uma nova senha para a sua conta.')}
        <form class="lg-form" id="lgForm" novalidate>
          <label class="lg-f"><span>Nova senha</span><span class="lg-in"><span data-icon="lock"></span><input id="lgN1" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres"><button type="button" class="lg-eye" id="lgEye" aria-label="Mostrar senha"><span data-icon="eye"></span></button></span></label>
          <div class="lg-meter" id="lgMeter"><i></i><i></i><i></i><i></i><span></span></div>
          <ul class="lg-rules" id="lgRules"><li data-r="len">Pelo menos 8 caracteres</li><li data-r="let">Letras e números</li></ul>
          <label class="lg-f"><span>Repita a nova senha</span><span class="lg-in"><span data-icon="check"></span><input id="lgN2" type="password" autocomplete="new-password" placeholder="Digite de novo"></span></label>
          <div class="lg-err" role="alert"></div>
          <button class="lg-btn" id="lgGo" type="submit"><span class="lg-btn-t">${obrigatoria ? 'Salvar e entrar' : 'Salvar nova senha'}</span><span class="lg-spin" aria-hidden="true"></span></button>
          ${obrigatoria ? '<button type="button" class="lg-link" id="lgOut">Sair</button>' : '<button type="button" class="lg-link" id="lgCancel">Cancelar</button>'}
        </form>`;
      icons(c);
      const n1 = $('#lgN1', c), n2 = $('#lgN2', c);
      olho(n1, $('#lgEye', c));
      const upd = () => { const v = n1.value, f = forca(v); $('#lgMeter', c).dataset.f = v ? f : ''; $('#lgMeter span', c).textContent = v ? ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][f] : ''; $('[data-r="len"]', c).classList.toggle('ok', v.length >= 8); $('[data-r="let"]', c).classList.toggle('ok', /[A-Za-z]/.test(v) && /\d/.test(v)); };
      n1.addEventListener('input', upd); upd();
      setTimeout(() => { if (!('ontouchstart' in window)) n1.focus(); }, 300);
      const out = $('#lgOut', c); if (out) out.onclick = () => CCAuth.sair();
      const cancel = $('#lgCancel', c); if (cancel) cancel.onclick = () => { desmontar(); done(false); };
      $('#lgForm', c).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = n1.value;
        if (v.length < 8) return erro(c, 'A senha precisa ter pelo menos 8 caracteres.');
        if (!(/[A-Za-z]/.test(v) && /\d/.test(v))) return erro(c, 'Use letras e números.');
        if (/^CC-/.test(v)) return erro(c, 'Escolha uma senha diferente da temporária.');
        if (v !== n2.value) return erro(c, 'As duas senhas não são iguais.');
        const btn = $('#lgGo', c); btn.disabled = true; btn.classList.add('busy'); erro(c, '');
        const { error } = await SB().auth.updateUser({ password: v });
        if (error) { erro(c, /different|same/i.test(error.message) ? 'A nova senha precisa ser diferente da atual.' : 'Não foi possível salvar a senha. Tente de novo.'); btn.disabled = false; btn.classList.remove('busy'); return; }
        try { await SB().rpc('cc_senha_trocada'); } catch (e) {}
        if (CCAuth.perfil) CCAuth.perfil.trocar_senha = false;
        try { localStorage.setItem(PERFIL_KEY, JSON.stringify(CCAuth.perfil)); } catch (e) {}
        if (obrigatoria) { desmontar(); resolve && resolve(); }
        else { desmontar(); try { window.toast && toast('Senha alterada'); } catch (e) {} }
        done(true);
      };
    });
  }

  function telaAviso(titulo, msg) {
    const c = card();
    c.innerHTML = `${head(titulo, esc(msg))}<div class="lg-form"><button class="lg-btn" id="lgOut" type="button"><span class="lg-btn-t">Sair</span></button></div>`;
    icons(c); $('#lgOut', c).onclick = () => CCAuth.sair();
  }

  async function carregarPerfil() {
    const { data, error } = await SB().rpc('cc_me');
    if (error) throw error;
    const p = Array.isArray(data) ? data[0] : data;
    return p && p.id ? p : null;
  }

  async function depoisDoLogin(resolve) {
    let p = null;
    try { p = await carregarPerfil(); } catch (e) {
      // sem rede: usa o perfil guardado deste mesmo usuário
      try { const c = JSON.parse(localStorage.getItem(PERFIL_KEY) || 'null'); const s = CCAuth.session; if (c && s && c.id === s.user.id) p = c; } catch (_) {}
      if (!p) return telaLogin(resolve, 'Sem conexão com o servidor. Verifique a internet.');
    }
    if (!p) return telaAviso('Acesso não liberado', 'Sua conta existe, mas ainda não tem permissões no Control Center. Fale com o administrador.');
    if (!p.ativo) return telaAviso('Acesso desativado', 'Seu acesso ao Control Center foi desativado. Fale com o administrador.');
    p.permissoes = p.permissoes || {};
    CCAuth.perfil = p;
    // os dados guardados no navegador são de quem estava logado antes? então limpa
    try { const prev = localStorage.getItem('cc_store_owner'); if (prev && prev !== p.id) { localStorage.removeItem(STORE_KEY); localStorage.setItem('cc_store_owner', p.id); location.reload(); return; } localStorage.setItem('cc_store_owner', p.id); } catch (e) {}
    try { localStorage.setItem(PERFIL_KEY, JSON.stringify(p)); } catch (e) {}
    if (p.trocar_senha) return telaSenha(true, resolve);
    desmontar(); resolve();
  }

  CCAuth.start = function () {
    return new Promise(async (resolve) => {
      const sb = SB();
      if (!sb) { CCAuth.modo = 'aberto'; return resolve(); }
      // o login só vale depois que o SQL (supabase/login.sql) foi rodado no banco
      let configurado = true;
      try {
        const { error } = await sb.rpc('cc_me');
        if (error && (error.code === 'PGRST202' || /could not find the function|not find/i.test(error.message || ''))) configurado = false;
        // sem conexão: decide pelo que este navegador já conhece
        else if (error && !error.code && /fetch|network|load failed/i.test(String(error.message || error.details || ''))) configurado = !!localStorage.getItem(PERFIL_KEY);
      } catch (e) { configurado = !!localStorage.getItem(PERFIL_KEY); }
      if (!configurado) { CCAuth.modo = 'aberto'; return resolve(); }
      CCAuth.modo = 'login';
      sb.auth.onAuthStateChange((ev, s) => { CCAuth.session = s; if (ev === 'SIGNED_OUT' && CCAuth.perfil) location.replace(location.origin + location.pathname); });
      let s = null; try { s = (await sb.auth.getSession()).data.session; } catch (e) {}
      CCAuth.session = s;
      if (!s) return telaLogin(resolve);
      depoisDoLogin(resolve);
    });
  };
})();
