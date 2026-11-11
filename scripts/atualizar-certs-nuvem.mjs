// Torna duráveis na NUVEM (Supabase entities) os nomes dos certificados CATA com o fabricante,
// e insere o certificado que faltava (ct17 — Válvula do cilindro Rodagás, 24081373).
// O PDF em si é servido estaticamente pelo site (assets/certs/{numero}.pdf) e o app calcula a URL
// pelo número, então aqui só cuidamos de NOME + metadados.
//   node scripts/atualizar-certs-nuvem.mjs
const URL_SB = 'https://ftwdwvthbigybggepcxn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d2R3dnRoYmlneWJnZ2VwY3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjE0NzEsImV4cCI6MjA5OTY5NzQ3MX0.c8cxETNa1T1XfXJZ4EEKmy6MMOi3QvpLJz3VKAq6gmw';
const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };
const now = new Date().toISOString();

// id na nuvem -> { name, number } (nome corrigido com fabricante, conforme PDF oficial)
const NAME_BY_ID = {
  ce_a2n7mju: { name: 'Cilindro de alta pressão para GNV (Anhui Clean Energy)', number: '26071866' },
  ct1:  { name: 'Indicador de pressão (Hunan Huke)', number: '23101152' },
  ct2:  { name: 'Suporte de cilindro individual (Convergas)', number: '26091902' },
  ct3:  { name: 'Tubos de alta pressão (Convergas)', number: '24041163' },
  ct4:  { name: 'Conexões (Convergas)', number: '24041164' },
  ct5:  { name: 'Receptáculo de abastecimento NGV2 (OMB Saleri)', number: '25011480' },
  ct6:  { name: 'Eletroválvula de cilindro (OMB Saleri)', number: '25011481' },
  ct7:  { name: 'Duto de baixa pressão, borracha nitrílica (Four Rubber)', number: '24111457' },
  ct8:  { name: 'Suporte de 4 cilindros, certificação nova (Convergas)', number: '25081675' },
  ct9:  { name: 'Redutor de pressão HPNGV58501 (ITT Enidine)', number: '25101702' },
  ct10: { name: 'Válvula de fechamento rápido em latão (Westport)', number: '26011759' },
  ct11: { name: 'Mangueira de baixa pressão crimpada (Convergas)', number: '25101701' },
  ct12: { name: 'Válvula de abastecimento externa NBR (ITA Industrial)', number: '24041162' },
  ct13: { name: 'Cilindros para GNV TP-1, aço SAE 4130 (Mat)', number: 'P2024-04A' },
  ct15: { name: 'Válvula de abastecimento com manípulo (Rodagás)', number: '24081371' },
  ct16: { name: 'Indicador de pressão (Wika)', number: '24031156' },
};

const CT17 = {
  entity: 'certificates', id: 'ct17',
  data: {
    name: 'Válvula do cilindro (Rodagás)', type: 'CATA', number: '24081373', process: '2024MEC075',
    issueDate: '2024-09-02', expiryDate: '2027-09-02', lab: 'CATA Certificações (INMETRO)',
    notes: 'Fabricante Rodagás do Brasil — Sistemas a gás LTDA.', pdf: '', viewUrl: 'assets/certs/24081373.pdf',
  },
  updated_at: now,
};

const certs = await (await fetch(`${URL_SB}/rest/v1/entities?entity=eq.certificates&select=id,data`, { headers: H })).json();
const byId = {}; certs.forEach((r) => { byId[r.id] = r.data || {}; });

let upd = 0, ins = 0, skip = 0;
for (const [id, info] of Object.entries(NAME_BY_ID)) {
  if (!byId[id]) { skip++; console.log(`• ${id} não existe na nuvem — pulado`); continue; }
  const data = { ...byId[id], name: info.name, viewUrl: 'assets/certs/' + info.number + '.pdf' };
  const res = await fetch(`${URL_SB}/rest/v1/entities?entity=eq.certificates&id=eq.${id}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ data, updated_at: now }),
  });
  if (res.ok) { upd++; console.log(`✓ ${id} -> ${info.name}`); }
  else { console.log(`✗ ${id}: ${res.status} ${await res.text()}`); }
}

// insere/garante ct17
{
  const res = await fetch(`${URL_SB}/rest/v1/entities?on_conflict=entity,id`, {
    method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([CT17]),
  });
  if (res.ok) { ins++; console.log(`✓ ct17 (24081373) inserido/garantido`); }
  else { console.log(`✗ ct17: ${res.status} ${await res.text()}`); }
}

console.log(`\nResumo: ${upd} nomes atualizados, ${ins} inserido, ${skip} pulados.`);
