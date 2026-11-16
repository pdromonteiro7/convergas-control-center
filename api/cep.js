// Consulta de CEP pelo servidor (Vercel), com fontes de reserva.
// GET /api/cep?d=00000000

const TIMEOUT = 6000;

function send(res, obj, code) {
  res.statusCode = code || 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', obj && obj.ok ? 's-maxage=604800' : 'no-store');
  res.end(JSON.stringify(obj));
}
async function getJson(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    let j = null; try { j = JSON.parse(await r.text()); } catch (e) {}
    return { status: r.status, j };
  } finally { clearTimeout(t); }
}
const dig = (v) => String(v == null ? '' : v).replace(/\D/g, '');

const FONTES = [
  { url: (d) => `https://brasilapi.com.br/api/cep/v2/${d}`, map: (j) => j && j.city ? { logradouro: j.street, bairro: j.neighborhood, cidade: j.city, uf: j.state } : null },
  { url: (d) => `https://viacep.com.br/ws/${d}/json/`, map: (j) => j && !j.erro && j.localidade ? { logradouro: j.logradouro, bairro: j.bairro, cidade: j.localidade, uf: j.uf } : null },
  { url: (d) => `https://opencep.com/v1/${d}`, map: (j) => j && j.localidade ? { logradouro: j.logradouro, bairro: j.bairro, cidade: j.localidade, uf: j.uf } : null },
];

module.exports = async (req, res) => {
  const d = dig((req.query && (req.query.d || req.query.cep)) || new URL(req.url, 'http://x').searchParams.get('d'));
  if (d.length !== 8) return send(res, { ok: false, motivo: 'invalido' }, 400);
  for (const f of FONTES) {
    try {
      const { status, j } = await getJson(f.url(d));
      if (status !== 200) continue;
      const o = f.map(j);
      if (o) return send(res, { ok: true, logradouro: o.logradouro || '', bairro: o.bairro || '', cidade: o.cidade || '', uf: String(o.uf || '').toUpperCase() });
    } catch (e) {}
  }
  return send(res, { ok: false, motivo: 'nao' });
};
