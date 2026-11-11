// Consultor IA da Programação — Claude (Anthropic).
// Anti-alucinação: a IA SÓ narra/explica os números que vêm do CONTEXTO (motor
// determinístico). Degrada sozinha: sem ANTHROPIC_API_KEY devolve ok:false/sem-chave
// e o front cai no parecer determinístico do motor.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const SYSTEM = [
  'Você é o consultor de PCP (Planejamento e Controle da Produção) da Convergas, empresa de',
  'sistemas de combustível alternativo (GNV/dual-fuel) para veículos pesados.',
  'Você recebe um CONTEXTO com o resultado de um MOTOR DETERMINÍSTICO (estoque, empenho,',
  'equipe, prazos, faseamento de material). Esse contexto é a ÚNICA fonte da verdade.',
  'REGRAS: nunca invente números, datas ou peças que não estejam no contexto; se algo não',
  'estiver lá, diga que falta o dado. Fale em português do Brasil, tom direto e consultivo,',
  'como um planejador experiente conversando com o time. Seja curto e prático: comece pelo',
  'veredito, depois o que fazer (o que correr atrás, até quando). Sem travessões colando orações.',
].join(' ');

function send(res, obj, code) {
  res.statusCode = code || 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body != null) { try { resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); } catch (e) { resolve({}); } return; }
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, { ok: false, motivo: 'metodo' }, 405);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(res, { ok: false, motivo: 'sem-chave' });

  try {
    const body = await readBody(req);
    const contexto = String(body.contexto || '').slice(0, 8000);
    const pergunta = String(body.pergunta || '').slice(0, 1000);
    const historico = Array.isArray(body.historico) ? body.historico.slice(-8) : [];

    const primeiro = pergunta
      ? pergunta
      : 'Explique o parecer abaixo para o planejador: dê o veredito e, de forma objetiva, o que precisa acontecer para ficar viável (o que comprar/realocar e até quando).';

    const messages = historico.concat([{
      role: 'user',
      content: `CONTEXTO (saída do motor, fonte da verdade):\n${contexto}\n\n${primeiro}`,
    }]);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, system: SYSTEM, messages }),
    });
    if (!r.ok) { const t = await r.text(); return send(res, { ok: false, motivo: 'api', detalhe: t.slice(0, 300) }); }
    const data = await r.json();
    const texto = (data.content || []).map((b) => b.text || '').join('').trim();
    return send(res, { ok: true, texto });
  } catch (e) {
    return send(res, { ok: false, motivo: 'rede' });
  }
};
