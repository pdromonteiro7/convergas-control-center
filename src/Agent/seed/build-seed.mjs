// Gera src/Agent/seed/seed.json a partir do js/store.js do app antigo (dados reais Convergas).
// Uso: node src/Agent/seed/build-seed.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const src = fs.readFileSync(path.join(root, "js", "store.js"), "utf8");

// --- extrai um literal (array/obj) após um token, respeitando strings ---
function balanced(text, start) {
  const open = text[start], close = open === "[" ? "]" : "}";
  let depth = 0, str = null, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (str) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === str) str = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { str = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  throw new Error("literal não balanceado após " + start);
}
function extract(token) {
  const idx = src.indexOf(token);
  if (idx < 0) throw new Error("token não achado: " + token);
  const br = src.indexOf("[", idx);
  return eval(balanced(src, br)); // literais puros, sem refs externas
}

const REAL_PRINTERS = extract("const REAL_PRINTERS =");
const CATA = extract("const CATA_CERTS =");
const EQUIP = extract("const EQUIP_CERTS =");
const team = extract("\n    team:");
const computers = extract("\n    computers:");
const phones = extract("\n    phones:");
const inventory = extract("\n    inventory:");

const byId = Object.fromEntries(team.map((t) => [t.id, t]));
const S = (v) => (v == null ? "" : String(v));
const statusMap = { manutencao: "manutenção", inativo: "inativo", ativo: "ativo", em_uso: "em uso", disponivel: "disponível", reserva: "reserva" };
const st = (v) => statusMap[v] || S(v);

const seed = {
  computers: computers.map((c) => ({
    id: c.hostname, name: c.hostname, serial: S(c.serial), sector: S(byId[c.userId]?.sector),
    assignedTo: S(byId[c.userId]?.name), office: S(c.office), antivirus: S(c.antivirus),
    status: st(c.status), notes: S(c.notes),
  })),
  entities: {
    printers: REAL_PRINTERS.map((p) => ({
      id: p.id, name: S(p.name), model: "", ip: S(p.ip), location: S(p.location),
      type: S(p.type), driverUrl: S(p.driverUrl), status: st(p.status),
    })),
    team: team.map((t) => ({ id: t.id, name: S(t.name), sector: S(t.sector), role: "", email: S(t.email), phone: "" })),
    phones: phones.map((p) => ({
      id: p.id, assignedTo: S(p.user), sector: S(p.sector), number: S(p.number), model: S(p.model),
      plan: S(p.plan), value: S(p.value), owner: S(p.owner), notes: S(p.notes),
    })),
    inventory: inventory.map((i) => ({
      id: i.id, item: S(i.brandModel), category: S(i.type), quantity: S(i.qty), location: "",
      assignedTo: S(byId[i.assignments?.[0]]?.name), status: st(i.status),
    })),
    certificates: [
      ...CATA.map((c) => ({
        id: c.id, name: S(c.name), type: "CATA", number: S(c.number), process: S(c.process),
        tag: "", serial: "", issueDate: S(c.issueDate), expiryDate: S(c.expiryDate), lab: S(c.lab), status: "",
      })),
      ...EQUIP.map((c) => ({
        id: c.id, name: S(c.name), type: "Instrumento", number: S(c.number), process: S(c.process),
        tag: S(c.tag), serial: S(c.serial), issueDate: S(c.issueDate), expiryDate: S(c.expiryDate), lab: S(c.lab), status: "",
      })),
    ],
  },
};

fs.writeFileSync(path.join(__dirname, "seed.json"), JSON.stringify(seed, null, 2));
const counts = { computers: seed.computers.length, ...Object.fromEntries(Object.entries(seed.entities).map(([k, v]) => [k, v.length])) };
console.log("seed.json gerado:", JSON.stringify(counts));
