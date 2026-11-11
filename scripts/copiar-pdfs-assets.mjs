// Copia os PDFs dos certificados para assets/certs/{numero}.pdf (servidos estaticamente pelo site).
// Assim o app abre o PDF por URL, sem depender de backend. Roda offline.
//   node scripts/copiar-pdfs-assets.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = 'C:/Users/Pedro Monteiro/CONVERGAS EQUIPAMENTOS E SERVICOS LTDA/Gestão da Qualidade - Documentos/CERTIFICACAO PRODUTOS/CERT VALIDOS';
const OLD = path.join(BASE, 'OLD');
const OUT = path.join(ROOT, 'assets', 'certs');

// número do certificado -> (opcional) arquivo específico fora da pasta CERT VALIDOS
const SPECIAL = {
  '2208843': path.join(OLD, 'CERTIFICADO 2208843 SUPORTE 4 CILINDROS.pdf'),
};
const NUMBERS = ['23101152','26091902','24041163','24041164','25011480','25011481','24111457','25081675','25101702','26011759','25101701','24041162','P2024-04A','2208843','24081371','24031156','24081373','26071866'];

fs.mkdirSync(OUT, { recursive: true });
const validFiles = fs.readdirSync(BASE).filter((f) => f.toLowerCase().endsWith('.pdf'));

let ok = 0, miss = 0;
for (const num of NUMBERS) {
  let src = SPECIAL[num] && fs.existsSync(SPECIAL[num]) ? SPECIAL[num] : null;
  if (!src) {
    const f = validFiles.find((x) => x.toLowerCase().includes(num.toLowerCase()));
    if (f) src = path.join(BASE, f);
  }
  if (!src) { miss++; console.log(`✗ ${num}: PDF não encontrado`); continue; }
  const dest = path.join(OUT, `${num}.pdf`);
  fs.copyFileSync(src, dest);
  ok++; console.log(`✓ ${num}.pdf  <=  ${path.basename(src)}`);
}
console.log(`\n${ok} copiados, ${miss} faltando -> ${OUT}`);
