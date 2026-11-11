// Atualiza os CERTIFICADOS InMetro (CATA) a partir da pasta oficial CERT VALIDOS.
// Fonte: .../CERTIFICACAO PRODUTOS/CERT VALIDOS  (apenas os PDFs da RAIZ; subpastas ignoradas).
// Faz:
//   1) copia os 19 PDFs válidos p/ assets/certs/{número}.pdf (servidos estáticos pelo site);
//   2) insere/garante na nuvem (entities/certificates, type CATA) os 2 certs novos
//      (24081369 Redutor Rodagás e 26031810 Cilindro GIFEL). Os demais já existem.
//   node scripts/atualizar-cata-2026.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = 'C:/Users/Pedro Monteiro/CONVERGAS EQUIPAMENTOS E SERVICOS LTDA/Gestão da Qualidade - Documentos/CERTIFICACAO PRODUTOS/CERT VALIDOS';
const OUT = path.join(ROOT, 'assets', 'certs');

const URL_SB = 'https://ftwdwvthbigybggepcxn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d2R3dnRoYmlneWJnZ2VwY3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjE0NzEsImV4cCI6MjA5OTY5NzQ3MX0.c8cxETNa1T1XfXJZ4EEKmy6MMOi3QvpLJz3VKAq6gmw';
const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };
const now = new Date().toISOString();

// Todos os números válidos (= 19 PDFs da pasta CERT VALIDOS). O arquivo é localizado por "inclui o número".
const NUMBERS = [
  '23101152', '24041163', '24041164', '24081371', '24041162', '24031156', '24081369', '24081373',
  '25011480', '25011481', '24111457', '25081675', '26031810', '25101702', '26011759', '25101701',
  '26071866', '26091902', 'P2024-04A',
];

// ---------- 1) copia os PDFs ----------
fs.mkdirSync(OUT, { recursive: true });
const pdfs = fs.readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.pdf'));
let ok = 0, miss = 0;
for (const num of NUMBERS) {
  const f = pdfs.find((x) => x.toLowerCase().includes(num.toLowerCase()));
  if (!f) { miss++; console.log(`✗ ${num}: PDF não encontrado na pasta`); continue; }
  fs.copyFileSync(path.join(SRC, f), path.join(OUT, `${num}.pdf`));
  ok++; console.log(`✓ ${num}.pdf  <=  ${f}`);
}
console.log(`\n${ok} PDFs copiados, ${miss} faltando -> assets/certs\n`);

// ---------- 2) insere/garante os 2 novos na nuvem ----------
const NEW = [
  { id: 'ct19', data: { name: 'Redutor de pressão (Rodagás)', type: 'CATA', number: '24081369', process: '2024MEC075', issueDate: '2024-09-02', expiryDate: '2027-09-02', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Rodagás do Brasil — Sistemas a gás LTDA. Mesmo contrato (2024MEC075) da Válvula do cilindro (24081373).', pdf: '', viewUrl: 'assets/certs/24081369.pdf' } },
  { id: 'ct20', data: { name: 'Cilindro de alta pressão para GNV (Gifel)', type: 'CATA', number: '26031810', process: '2025MEC099', issueDate: '2026-03-30', expiryDate: '2029-03-30', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Gifel. Cilindro de alta pressão para armazenamento de GNV a bordo de veículos.', pdf: '', viewUrl: 'assets/certs/26031810.pdf' } },
];
const payload = NEW.map((c) => ({ entity: 'certificates', id: c.id, data: c.data, updated_at: now }));
const res = await fetch(`${URL_SB}/rest/v1/entities?on_conflict=entity,id`, {
  method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(payload),
});
if (res.ok) console.log(`✓ ${payload.length} certs CATA novos inseridos/garantidos na nuvem (ct19, ct20).`);
else console.log(`✗ insert: ${res.status} ${await res.text()}`);

console.log('\nConcluído. InMetro: 17 existentes + 2 novos = 19 certificados.');
