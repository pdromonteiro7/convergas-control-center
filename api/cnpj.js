// Consulta de CNPJ pelo servidor (Vercel) — evita bloqueios de CORS/extensões do navegador.
// Tenta várias fontes públicas em sequência e devolve os dados num formato único.
// GET /api/cnpj?d=00000000000000

const TIMEOUT = 7000;

function send(res, obj, code) {
  res.statusCode = code || 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', obj && obj.ok ? 's-maxage=86400, stale-while-revalidate=604800' : 'no-store');
  res.end(JSON.stringify(obj));
}

async function getJson(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json', 'user-agent': 'ConvergasControlCenter/1.0' } });
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch (e) {}
    return { status: r.status, j };
  } finally { clearTimeout(t); }
}

const dig = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const clean = (o) => ({
  nome: o.nome || '', fantasia: o.fantasia || '', situacao: o.situacao || '',
  email: String(o.email || '').trim().toLowerCase(), telefone: dig(o.telefone).slice(0, 11),
  logradouro: [o.tipo, o.logradouro].filter(Boolean).join(' ').trim(), numero: o.numero || '', complemento: o.complemento || '', bairro: o.bairro || '',
  cidade: o.cidade || '', uf: String(o.uf || '').toUpperCase().slice(0, 2), cep: dig(o.cep).slice(0, 8),
});

const FONTES = [
  { nome: 'BrasilAPI', url: (d) => `https://brasilapi.com.br/api/cnpj/v1/${d}`, map: (j) => j && j.razao_social ? clean({
      nome: j.razao_social, fantasia: j.nome_fantasia, situacao: j.descricao_situacao_cadastral, email: j.email, telefone: j.ddd_telefone_1,
      tipo: j.descricao_tipo_de_logradouro, logradouro: j.logradouro, numero: j.numero, complemento: j.complemento, bairro: j.bairro, cidade: j.municipio, uf: j.uf, cep: j.cep }) : null },
  { nome: 'CNPJ.ws', url: (d) => `https://publica.cnpj.ws/cnpj/${d}`, map: (j) => { const e = j && j.estabelecimento; return j && j.razao_social && e ? clean({
      nome: j.razao_social, fantasia: e.nome_fantasia, situacao: e.situacao_cadastral, email: e.email, telefone: `${e.ddd1 || ''}${e.telefone1 || ''}`,
      tipo: e.tipo_logradouro, logradouro: e.logradouro, numero: e.numero, complemento: e.complemento, bairro: e.bairro,
      cidade: e.cidade && e.cidade.nome, uf: e.estado && e.estado.sigla, cep: e.cep }) : null; } },
  { nome: 'ReceitaWS', url: (d) => `https://receitaws.com.br/v1/cnpj/${d}`, map: (j) => j && j.status !== 'ERROR' && j.nome ? clean({
      nome: j.nome, fantasia: j.fantasia, situacao: j.situacao, email: j.email, telefone: String(j.telefone || '').split('/')[0],
      logradouro: j.logradouro, numero: j.numero, complemento: j.complemento, bairro: j.bairro, cidade: j.municipio, uf: j.uf, cep: j.cep }) : null },
  { nome: 'OpenCNPJ', url: (d) => `https://api.opencnpj.org/${d}`, map: (j) => { if (!j || !j.razao_social) return null; const t = Array.isArray(j.telefones) && j.telefones[0]; return clean({
      nome: j.razao_social, fantasia: j.nome_fantasia, situacao: j.situacao_cadastral, email: j.email, telefone: t ? `${t.ddd || ''}${t.numero || ''}` : '',
      tipo: j.tipo_logradouro, logradouro: j.logradouro, numero: j.numero, complemento: j.complemento, bairro: j.bairro, cidade: j.municipio, uf: j.uf, cep: j.cep }); } },
];

module.exports = async (req, res) => {
  const d = dig((req.query && (req.query.d || req.query.cnpj)) || new URL(req.url, 'http://x').searchParams.get('d'));
  if (d.length !== 14) return send(res, { ok: false, motivo: 'invalido' }, 400);
  let naoAchou = 0;
  for (const f of FONTES) {
    try {
      const { status, j } = await getJson(f.url(d));
      if (status === 404) { naoAchou++; continue; }
      if (status !== 200) continue;
      const out = f.map(j);
      if (out && out.nome) return send(res, { ok: true, fonte: f.nome, ...out });
    } catch (e) { /* tenta a próxima fonte */ }
  }
  return send(res, { ok: false, motivo: naoAchou ? 'nao' : 'falha' });
};
