// Atualiza a CALIBRAÇÃO DE EQUIPAMENTOS DE MEDIÇÃO a partir da planilha-mestre
//   CONTROLE_CALIBRAÇÃO_EQUIPAMENTOS_MEDIÇÃO1.xlsx  (aba "Obs. Técnicas" = fonte).
// A planilha é a ÚNICA fonte da verdade. Regras aplicadas:
//   - registra só o que está na planilha (equipamentos Calibrados; vencidos OMITIDOS);
//   - anexa o PDF quando encontrado nas pastas e com certeza de que é dele;
//   - NÃO anexa certificado vencido nem quando há dúvida sobre o arquivo.
// Faz 2 coisas:
//   1) copia os PDFs confirmados p/ assets/certs/{stem}.pdf (servidos estáticos);
//   2) substitui no Supabase (entities/certificates) TODOS os certs de equipamento.
//   node scripts/atualizar-equip-2026.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = 'C:/Users/Pedro Monteiro/CONVERGAS EQUIPAMENTOS E SERVICOS LTDA/Gestão da Qualidade - Documentos/QUALIDADE/ISO 9001  Convergas VERSAO EM USO/Registros da qualidade/Controle de Equip Medicao/INDIVIDUAIS ATUAIS';
const OUT = path.join(ROOT, 'assets', 'certs');

const URL_SB = 'https://ftwdwvthbigybggepcxn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d2R3dnRoYmlneWJnZ2VwY3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjE0NzEsImV4cCI6MjA5OTY5NzQ3MX0.c8cxETNa1T1XfXJZ4EEKmy6MMOi3QvpLJz3VKAq6gmw';
const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };
const now = new Date().toISOString();

// stem = nome do arquivo em assets/certs (sem extensão). Deriva do número trocando "/" por "."
const stemOf = (num) => num.replace(/\//g, '.');

// Registros autoritativos (planilha). srcPdf = arquivo em INDIVIDUAIS ATUAIS (ou null = sem PDF).
const RECS = [
  // --- Calibrados COM PDF confirmado ---
  { id: 'ce_em002', tag: 'EM 002', name: 'CALIBRE TAMPÃO CILINDRO GNV 3/4" NGT - 14 FIOS', serial: '28200002', number: '01811/26', issueDate: '2026-02-10', expiryDate: '2027-02-10', lab: 'LG METROLOGIA', srcPdf: '01811.26.pdf' },
  { id: 'ce_em003', tag: 'EM 003', name: 'CALIBRE ANEL CILINDRO GNV 3/4" NGT - 14 FIOS', serial: '28200001', number: '01814/26', issueDate: '2026-02-10', expiryDate: '2027-02-10', lab: 'LG METROLOGIA', srcPdf: '01814.26.pdf' },
  { id: 'ce_em005', tag: 'EM 005', name: 'CALIBRE ANEL CILINDRO 28.8 x 14 DIN 477 25E', serial: 'EM 005', number: '01815/26', issueDate: '2026-02-10', expiryDate: '2027-02-10', lab: 'LG METROLOGIA', srcPdf: '01815.26.pdf' },
  { id: 'ce_em006', tag: 'EM 006', name: 'CALIBRE TAMPÃO CILINDRO GNV 1.1/8" - 12UNF 2B', serial: 'EM 006', number: 'CCM62605/26', issueDate: '2026-01-23', expiryDate: '2027-01-23', lab: 'CEIME', srcPdf: 'EM-006_23-01-2026.PDF' },
  { id: 'ce_em007', tag: 'EM 007', name: 'CALIBRE ANEL CILINDRO GNV 1.1/8" - 12UNF 2A', serial: 'EM 007', number: 'CCM62516/26', issueDate: '2026-01-21', expiryDate: '2027-01-21', lab: 'CEIME', srcPdf: 'EM-007_21-01-2026.PDF' },
  { id: 'ce_em013', tag: 'EM 013', name: 'TORQUÍMETRO GEDORE (20-100 Nm)', serial: 'F210418', number: 'CCM62604/26', issueDate: '2026-01-23', expiryDate: '2027-01-23', lab: 'CEIME', srcPdf: 'EM-013_23-01-2026.PDF' },
  { id: 'ce_em023', tag: 'EM 023', name: 'MANÔMETRO 400 BAR WIKA', serial: 'WO004908222024', number: '13242/24', issueDate: '2026-03-25', expiryDate: '2027-03-25', lab: 'LG METROLOGIA', srcPdf: 'EM 023 LG 13242.24.pdf' },
  { id: 'ce_em024', tag: 'EM 024', name: 'Medidor de Gases de Exaustão Veicular (modelo TM 132)', serial: 'EM 024', number: '16242054', issueDate: '2026-02-20', expiryDate: '2027-02-20', lab: 'IPEM', srcPdf: 'EM 024 Analisador deGases16242054.pdf' },
  { id: 'ce_em032', tag: 'EM 032', name: 'Torquímetro SATA 68 Nm a 300 Nm', serial: '625030949', number: 'CCM62603/26', issueDate: '2026-01-23', expiryDate: '2027-01-23', lab: 'CEIME', srcPdf: 'EM-032_23-01-2026.PDF' },
  { id: 'ce_em033', tag: 'EM 033', name: 'Torquímetro SATA 100 Nm a 550 Nm', serial: '724070162', number: 'CCM59926/25', issueDate: '2025-11-27', expiryDate: '2026-11-27', lab: 'CEIME', srcPdf: 'EM-033_27-11-2025.PDF' },
  { id: 'ce_em034', tag: 'EM 034', name: 'CALIBRE TAMPÃO CILINDRO GNV 1.1/8" - 12UNF 2B', serial: 'EM034', number: '01813/26', issueDate: '2026-02-10', expiryDate: '2027-02-10', lab: '', srcPdf: '01813.26.pdf' },
  { id: 'ce_em035', tag: 'EM 035', name: 'CALIBRE ANEL CILINDRO GNV 1.1/8" - 12UNF 2A', serial: 'EM035', number: '01878/26', issueDate: '2026-02-11', expiryDate: '2027-02-11', lab: '', srcPdf: '01878.26.pdf' },
  { id: 'ce_em036', tag: 'EM 036', name: 'CALIBRE ANEL CILINDRO GNV 1.1/8" - 12UNF 2A', serial: 'EM036', number: '01879/26', issueDate: '2026-02-11', expiryDate: '2027-02-11', lab: '', srcPdf: '01879.26.pdf' },
  { id: 'ce_em037', tag: 'EM 037', name: 'CALIBRE DE FOLGA 0,05MM - 1,00MM', serial: 'EM037', number: '01700/26', issueDate: '2026-02-09', expiryDate: '2027-02-09', lab: '', srcPdf: '01700.26.pdf' },
  { id: 'ce_em038', tag: 'EM 038', name: 'CALIBRE DE FOLGA 0,05MM - 1,00MM', serial: 'EM038', number: '01706/26', issueDate: '2026-02-09', expiryDate: '2027-02-09', lab: '', srcPdf: '01706.26.pdf' },

  // --- Calibrados SEM número de certificado (sem PDF) ---
  { id: 'ce_em021', tag: 'EM 021', name: 'TORQUÍMETRO MTX 70-350 NM', serial: '141629', number: '', issueDate: '2025-12-01', expiryDate: '2026-12-01', lab: 'CEIME', srcPdf: null },
  { id: 'ce_em031', tag: 'EM 031', name: 'Torquímetro Gedore (60-300Nm)', serial: 'EM031', number: '', issueDate: '2025-12-01', expiryDate: '2026-12-01', lab: 'CEIME', srcPdf: null },
  { id: 'ce_em039', tag: 'EM 039', name: 'MANÔMETRO 400 BAR WIKA', serial: 'EM039', number: '', issueDate: '2026-03-25', expiryDate: '2027-03-25', lab: 'LG METROLOGIA', srcPdf: null },
  { id: 'ce_em040', tag: 'EM 040', name: 'MANÔMETRO 400 BAR WIKA', serial: 'EM040', number: '', issueDate: '2026-03-25', expiryDate: '2027-03-25', lab: 'LG METROLOGIA', srcPdf: null },

  // --- Calibrados (status da planilha) COM PDF localizado pelo número do certificado.
  //     Obs.: o PDF anexado é o certificado /25 (2025); as datas seguem a planilha. ---
  { id: 'ce_em010', tag: 'EM 010', name: 'TORQUÍMETRO (60-300Nm) (2016)', serial: 'A115 240', number: 'CCM57533/25', issueDate: '2026-10-28', expiryDate: '2027-10-28', lab: 'CEIME', srcPdf: 'EM 010 CCM57533_25.pdf' },
  { id: 'ce_em016', tag: 'EM 016', name: 'TORQUÍMETRO AXIAL (1,5 a 6,5 Nm) King Tony', serial: '2106110067', number: '9105/25', issueDate: '2026-10-28', expiryDate: '2027-10-28', lab: 'LG METROLOGIA', srcPdf: 'EM 16 LG 9105_25.pdf' },
  { id: 'ce_em017', tag: 'EM 017', name: 'PAQUÍMETRO 150mm DIGIMESS', serial: '21052297', number: '5572/25', issueDate: '2026-10-28', expiryDate: '2027-10-28', lab: 'LG METROLOGIA', srcPdf: 'EM 017 LG 05572.25.pdf' },
  { id: 'ce_em019', tag: 'EM 019', name: 'CALIBRE ANEL M30x2-6G NOGO', serial: 'EM 019', number: 'CCM56911/25', issueDate: '2026-10-28', expiryDate: '2027-10-28', lab: 'CEIME', srcPdf: 'EM 019 CCM56911_25.PDF' },
  { id: 'ce_em025', tag: 'EM 025', name: 'TORQUÍMETRO 70-350 NM', serial: 'EM025', number: 'CCM55866/25', issueDate: '2026-10-28', expiryDate: '2027-10-28', lab: 'CEIME', srcPdf: 'EM 025 CCM55866_25.PDF' },
  // EM 029: a planilha indica CCM57661/25, mas o arquivo "EM 029" contém CCM57660/25 (o 57661 é da EM 030).
  // Corrigido p/ o número real do arquivo da EM 029.
  { id: 'ce_em029', tag: 'EM 029', name: 'Trena 5 metros Starret', serial: 'EM029', number: 'CCM57660/25', issueDate: '2026-10-28', expiryDate: '2027-10-28', lab: 'CEIME', srcPdf: 'EM 029 CCM57660_25.PDF', notes: 'Certificado nº CCM57660/25 (a planilha indica 57661/25 — divergência; 57661 é o arquivo da EM 030).' },
];

// ---------- 1) copia os PDFs ----------
fs.mkdirSync(OUT, { recursive: true });
let copied = 0;
for (const r of RECS) {
  if (!r.srcPdf) continue;
  const src = path.join(SRC, r.srcPdf);
  if (!fs.existsSync(src)) { console.log(`✗ PDF não encontrado: ${r.srcPdf} (${r.tag})`); continue; }
  const dest = path.join(OUT, `${stemOf(r.number)}.pdf`);
  fs.copyFileSync(src, dest);
  copied++; console.log(`✓ ${path.basename(dest)}  <=  ${r.srcPdf}`);
}
console.log(`\n${copied} PDFs copiados p/ assets/certs\n`);

// ---------- 2) atualiza a nuvem ----------
// baixa os certs atuais e apaga os de equipamento (type Instrumento/equipamento)
const cur = await (await fetch(`${URL_SB}/rest/v1/entities?entity=eq.certificates&select=id,data`, { headers: H })).json();
const oldEquip = cur.filter((r) => { const t = (r.data?.type || '').toLowerCase(); return t.includes('instrument') || t === 'equipamento'; });
console.log(`Nuvem: ${cur.length} certs no total, ${oldEquip.length} de equipamento a substituir.`);
for (const r of oldEquip) {
  const res = await fetch(`${URL_SB}/rest/v1/entities?entity=eq.certificates&id=eq.${encodeURIComponent(r.id)}`, { method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' } });
  if (!res.ok) console.log(`✗ del ${r.id}: ${res.status} ${await res.text()}`);
}
console.log(`${oldEquip.length} certs antigos de equipamento removidos.`);

// insere os novos (type Instrumento no formato da nuvem — o app mapeia p/ "equipamento")
const payload = RECS.map((r) => ({
  entity: 'certificates', id: r.id, updated_at: now,
  data: {
    name: r.name, type: 'Instrumento', number: r.number, process: r.tag,
    tag: r.tag, serial: r.serial, issueDate: r.issueDate, expiryDate: r.expiryDate,
    lab: r.lab, labEmail: '', labPhone: '', notes: r.notes || '',
    pdf: '', viewUrl: r.srcPdf ? `assets/certs/${stemOf(r.number)}.pdf` : '',
  },
}));
const ins = await fetch(`${URL_SB}/rest/v1/entities?on_conflict=entity,id`, {
  method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(payload),
});
if (ins.ok) console.log(`✓ ${payload.length} certs de equipamento inseridos na nuvem.`);
else console.log(`✗ insert: ${ins.status} ${await ins.text()}`);

const withPdf = RECS.filter((r) => r.srcPdf).length;
console.log(`\nResumo: ${RECS.length} equipamentos registrados (${withPdf} com PDF, ${RECS.length - withPdf} sem PDF).`);
