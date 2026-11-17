// Avaliação de satisfação — endpoint PÚBLICO usado pela página /a/<token>.
// Só expõe o mínimo daquela avaliação (nome do cliente, nº do chamado, validade) e só aceita
// gravar a resposta uma única vez, dentro do prazo. Nada do restante do sistema é acessível aqui.
// GET  /api/avaliacao?t=<token>          → { ok, status, cliente, contato, chamado, expiraEm }
// POST /api/avaliacao  { t, resposta }   → { ok }

const SB_URL = process.env.CC_SUPABASE_URL || 'https://ftwdwvthbigybggepcxn.supabase.co';
// chave pública (anon) — a mesma que já está no site; pode ser trocada por variável de ambiente
const SB_KEY = process.env.CC_SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d2R3dnRoYmlneWJnZ2VwY3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjE0NzEsImV4cCI6MjA5OTY5NzQ3MX0.c8cxETNa1T1XfXJZ4EEKmy6MMOi3QvpLJz3VKAq6gmw';
const TOKEN_RE = /^[A-Za-z0-9]{20,48}$/;

function send(res, obj, code) {
  res.statusCode = code || 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-robots-tag', 'noindex, nofollow');
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    if (req.body != null) { try { resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); } catch (e) { resolve({}); } return; }
    let d = ''; req.on('data', (c) => { d += c; if (d.length > 20000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
async function sb(path, opts) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', ...(opts && opts.headers) },
  });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
  return { status: r.status, j };
}
const rowPath = (t) => `entities?entity=eq.pvAvaliacoes&id=eq.av_${t}`;
// Com o login ativo as tabelas ficam fechadas: a leitura/gravação passa pelas funções
// seguras cc_av_get / cc_av_responder (supabase/login.sql). Sem elas, usa a tabela direto.
async function lerAvaliacao(t) {
  const f = await sb('rpc/cc_av_get', { method: 'POST', body: JSON.stringify({ tok: t }) });
  if (f.status === 200) return { ok: true, d: f.j && typeof f.j === 'object' ? f.j : null, rpc: true };
  const { status, j } = await sb(`${rowPath(t)}&select=data`);
  if (status !== 200) return { ok: false };
  return { ok: true, d: Array.isArray(j) && j[0] ? j[0].data : null, rpc: false };
}
const estado = (d) => {
  if (!d) return 'invalido';
  if (d.status === 'respondida') return 'respondida';
  if (d.status === 'cancelada') return 'cancelada';
  if (!d.expiraEm || Date.now() > Date.parse(d.expiraEm)) return 'expirada';
  return 'aberta';
};
const nota = (v, min, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : null; };
const txt = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const t = String((req.query && req.query.t) || new URL(req.url, 'http://x').searchParams.get('t') || '');
      if (!TOKEN_RE.test(t)) return send(res, { ok: false, status: 'invalido' }, 404);
      const L = await lerAvaliacao(t);
      if (!L.ok) return send(res, { ok: false, status: 'erro' }, 502);
      const d = L.d;
      const st = estado(d);
      if (st === 'invalido') return send(res, { ok: false, status: st }, 404);
      return send(res, { ok: true, status: st, cliente: d.clienteNome || '', contato: txt(d.contatoNome, 60).split(' ')[0] || '', chamado: d.chamadoNumero || '', expiraEm: d.expiraEm });
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      const t = String(body.t || '');
      if (!TOKEN_RE.test(t)) return send(res, { ok: false, status: 'invalido' }, 404);
      const r = body.resposta || {};
      const resposta = {
        nota: nota(r.nota, 1, 5), rapidez: nota(r.rapidez, 1, 5), comunicacao: nota(r.comunicacao, 1, 5), solucao: nota(r.solucao, 1, 5),
        recomenda: nota(r.recomenda, 0, 10), comentario: txt(r.comentario, 1500), nome: txt(r.nome, 80),
      };
      if (resposta.nota == null) return send(res, { ok: false, status: 'incompleta' }, 400);
      const L = await lerAvaliacao(t);
      if (!L.ok) return send(res, { ok: false, status: 'erro' }, 502);
      const d = L.d;
      const st = estado(d);
      if (st !== 'aberta') return send(res, { ok: false, status: st }, 409);
      if (L.rpc) {
        const w = await sb('rpc/cc_av_responder', { method: 'POST', body: JSON.stringify({ tok: t, resposta }) });
        if (w.status !== 200 || w.j !== true) return send(res, { ok: false, status: 'respondida' }, 409);
        return send(res, { ok: true });
      }
      const agora = new Date().toISOString();
      const novo = { ...d, status: 'respondida', respostaEm: agora, resposta };
      // grava só se ainda estiver "enviada" (evita duas respostas ao mesmo tempo)
      const up = await sb(`${rowPath(t)}&data->>status=eq.enviada`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ data: novo, updated_at: agora }) });
      if (up.status !== 200 || !Array.isArray(up.j) || !up.j.length) return send(res, { ok: false, status: 'respondida' }, 409);
      return send(res, { ok: true });
    }
    res.setHeader('allow', 'GET, POST');
    return send(res, { ok: false }, 405);
  } catch (e) {
    return send(res, { ok: false, status: 'erro' }, 500);
  }
};
