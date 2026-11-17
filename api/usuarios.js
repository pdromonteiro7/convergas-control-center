// Usuários & permissões do Control Center — só ADMINISTRADOR logado.
// Cria/edita contas no Supabase Auth e o perfil (cc_perfis) com as permissões por aba.
// Precisa da variável de ambiente SUPABASE_SERVICE_ROLE_KEY na Vercel (nunca vai para o navegador).
//
// POST /api/usuarios  (Authorization: Bearer <token da sessão>)
//   { acao: 'listar' }
//   { acao: 'criar',   email, nome, admin, ativo, permissoes, teamId }      → { ok, senha }
//   { acao: 'editar',  id, nome, admin, ativo, permissoes, teamId }
//   { acao: 'senha',   id }                                                 → { ok, senha }
//   { acao: 'excluir', id }
// GET  /api/usuarios → { ok, configurado }  (só diz se a chave do servidor existe)

const { randomInt } = require('crypto');

const SB_URL = process.env.CC_SUPABASE_URL || 'https://ftwdwvthbigybggepcxn.supabase.co';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CC_SUPABASE_SERVICE_ROLE || '';
const NIVEIS = ['editar', 'ver', 'nenhum'];

function send(res, obj, code) {
  res.statusCode = code || 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    if (req.body != null) { try { resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); } catch (e) { resolve({}); } return; }
    let d = ''; req.on('data', (c) => { d += c; if (d.length > 100000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
async function call(path, opts, bearer) {
  const r = await fetch(`${SB_URL}${path}`, {
    ...opts,
    headers: { apikey: SERVICE, Authorization: `Bearer ${bearer || SERVICE}`, 'Content-Type': 'application/json', ...(opts && opts.headers) },
  });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return { status: r.status, j };
}
const rest = (path, opts) => call(`/rest/v1/${path}`, opts);

function senhaTemporaria() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = ''; for (let i = 0; i < 8; i++) s += c[randomInt(c.length)];
  return `CC-${s}`;
}
const txt = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
// normaliza { abas: {rota: nivel}, areas: {area: nivel} }
function limparPerms(p) {
  const out = { abas: {}, areas: {} };
  ['abas', 'areas'].forEach((k) => {
    const o = (p && p[k]) || {};
    Object.keys(o).slice(0, 200).forEach((key) => { if (/^[a-z0-9-]{1,40}$/.test(key) && NIVEIS.includes(o[key]) && o[key] !== 'nenhum') out[k][key] = o[key]; });
  });
  return out;
}

async function quemChama(req) {
  const h = String(req.headers.authorization || '');
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  const u = await call('/auth/v1/user', { method: 'GET' }, tok);
  if (u.status !== 200 || !u.j || !u.j.id) return null;
  const p = await rest(`cc_perfis?id=eq.${u.j.id}&select=*`, { method: 'GET' });
  const perfil = Array.isArray(p.j) ? p.j[0] : null;
  if (!perfil || !perfil.admin || !perfil.ativo) return null;
  return perfil;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return send(res, { ok: true, configurado: !!SERVICE });
    if (req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); return send(res, { ok: false }, 405); }
    if (!SERVICE) return send(res, { ok: false, erro: 'A chave do servidor (SUPABASE_SERVICE_ROLE_KEY) ainda não foi configurada na Vercel.' }, 503);
    const me = await quemChama(req);
    if (!me) return send(res, { ok: false, erro: 'Só administradores podem gerenciar usuários.' }, 403);
    const b = await readBody(req);

    if (b.acao === 'listar') {
      const [p, a] = await Promise.all([rest('cc_perfis?select=*&order=nome', { method: 'GET' }), call('/auth/v1/admin/users?per_page=1000', { method: 'GET' })]);
      const users = (a.j && a.j.users) || [];
      const last = new Map(users.map((u) => [u.id, u.last_sign_in_at || null]));
      return send(res, { ok: true, usuarios: (p.j || []).map((x) => ({ ...x, ultimoAcesso: last.get(x.id) || null })) });
    }

    if (b.acao === 'criar') {
      const email = txt(b.email, 120).toLowerCase(), nome = txt(b.nome, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, { ok: false, erro: 'E-mail inválido.' }, 400);
      if (nome.length < 3) return send(res, { ok: false, erro: 'Informe o nome.' }, 400);
      const senha = senhaTemporaria();
      const c = await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: { nome } }) });
      if (c.status >= 300 || !c.j || !c.j.id) {
        const dup = /registered|already|exists/i.test(JSON.stringify(c.j || ''));
        return send(res, { ok: false, erro: dup ? `Já existe um usuário com o e-mail ${email}.` : 'Não foi possível criar a conta.' }, 400);
      }
      const perfil = { id: c.j.id, email, nome, admin: !!b.admin, ativo: b.ativo !== false, permissoes: limparPerms(b.permissoes), team_id: txt(b.teamId, 60) || null, trocar_senha: true };
      const ins = await rest('cc_perfis', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(perfil) });
      if (ins.status >= 300) { await call(`/auth/v1/admin/users/${c.j.id}`, { method: 'DELETE' }); return send(res, { ok: false, erro: 'Não foi possível salvar o perfil (o SQL do login já foi rodado no Supabase?).' }, 500); }
      return send(res, { ok: true, id: c.j.id, senha });
    }

    const id = txt(b.id, 60);
    if (!/^[0-9a-f-]{36}$/.test(id)) return send(res, { ok: false, erro: 'Usuário inválido.' }, 400);

    if (b.acao === 'editar') {
      if (id === me.id && (b.admin === false || b.ativo === false)) return send(res, { ok: false, erro: 'Você não pode tirar o seu próprio acesso de administrador.' }, 400);
      const patch = { nome: txt(b.nome, 80), admin: !!b.admin, ativo: b.ativo !== false, permissoes: limparPerms(b.permissoes), team_id: txt(b.teamId, 60) || null, updated_at: new Date().toISOString() };
      if (patch.nome.length < 3) return send(res, { ok: false, erro: 'Informe o nome.' }, 400);
      const up = await rest(`cc_perfis?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      if (up.status >= 300) return send(res, { ok: false, erro: 'Não foi possível salvar.' }, 500);
      // desativado = conta bloqueada no Auth (derruba o acesso); reativado = libera
      await call(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ ban_duration: patch.ativo ? 'none' : '876000h', user_metadata: { nome: patch.nome } }) });
      return send(res, { ok: true });
    }

    if (b.acao === 'senha') {
      const senha = senhaTemporaria();
      const up = await call(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ password: senha }) });
      if (up.status >= 300) return send(res, { ok: false, erro: 'Não foi possível gerar a nova senha.' }, 500);
      await rest(`cc_perfis?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ trocar_senha: true, updated_at: new Date().toISOString() }) });
      return send(res, { ok: true, senha });
    }

    if (b.acao === 'excluir') {
      if (id === me.id) return send(res, { ok: false, erro: 'Você não pode excluir a sua própria conta.' }, 400);
      const del = await call(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      if (del.status >= 300) return send(res, { ok: false, erro: 'Não foi possível excluir.' }, 500);
      await rest(`cc_perfis?id=eq.${id}`, { method: 'DELETE' });
      return send(res, { ok: true });
    }
    return send(res, { ok: false, erro: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return send(res, { ok: false, erro: 'Erro no servidor.' }, 500);
  }
};
