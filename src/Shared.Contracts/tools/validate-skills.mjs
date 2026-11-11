// Validador offline de Skills — sem dependências externas.
// Confere cada skills/*.json contra:
//   1) o skill.schema.json (estrutura, tipos, campos obrigatórios, enums)
//   2) o capability-registry.json (params tipados, admin coerente, whitelists)
// Uso: node src/Shared.Contracts/tools/validate-skills.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");           // raiz do repo
const skillsDir = path.join(root, "skills");
const schemaPath = path.join(__dirname, "../schema/skill.schema.json");
const registryPath = path.join(__dirname, "../schema/capability-registry.json");

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const CAPS = registry.capabilities;

let errors = 0;
const err = (f, m) => { console.log(`  ✗ ${f}: ${m}`); errors++; };
const warn = (f, m) => console.log(`  ⚠ ${f}: ${m}`);

// --- mini-validador de JSON Schema (subset suficiente p/ skill.schema.json) ---
function validateSchema(f, obj, sch, pathStr = "") {
  const at = pathStr || "(raiz)";
  if (sch.type === "object") {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return err(f, `${at} deveria ser object`);
    for (const req of sch.required || []) if (!(req in obj)) err(f, `${at} falta campo obrigatório "${req}"`);
    if (sch.additionalProperties === false) {
      for (const k of Object.keys(obj)) if (!(k in (sch.properties || {}))) err(f, `${at}.${k} não é permitido`);
    }
    for (const [k, v] of Object.entries(obj)) {
      if (sch.properties && sch.properties[k]) validateSchema(f, v, sch.properties[k], `${at===""?"":at+"."}${k}`);
      else if (sch.additionalProperties && typeof sch.additionalProperties === "object")
        validateSchema(f, v, sch.additionalProperties, `${at}.${k}`);
    }
  } else if (sch.type === "array") {
    if (!Array.isArray(obj)) return err(f, `${at} deveria ser array`);
    if (sch.minItems && obj.length < sch.minItems) err(f, `${at} precisa de ≥${sch.minItems} itens`);
    obj.forEach((it, i) => validateSchema(f, it, sch.items, `${at}[${i}]`));
  } else if (sch.type === "string") {
    if (typeof obj !== "string") return err(f, `${at} deveria ser string`);
    if (sch.minLength && obj.length < sch.minLength) err(f, `${at} não pode ser vazio`);
    if (sch.pattern && !new RegExp(sch.pattern).test(obj)) err(f, `${at} não casa com o padrão ${sch.pattern}`);
    if (sch.enum && !sch.enum.includes(obj)) err(f, `${at}="${obj}" fora do enum permitido`);
  } else if (sch.type === "integer") {
    if (!Number.isInteger(obj)) return err(f, `${at} deveria ser inteiro`);
    if (sch.minimum !== undefined && obj < sch.minimum) err(f, `${at} deve ser ≥${sch.minimum}`);
  } else if (sch.type === "boolean") {
    if (typeof obj !== "boolean") err(f, `${at} deveria ser boolean`);
  }
}

// --- validação semântica contra o registry ---
function validateRegistry(f, skill) {
  let needsAdmin = false;
  for (const [i, step] of (skill.steps || []).entries()) {
    const cap = CAPS[step.capability];
    if (!cap) continue; // já reportado pelo enum do schema
    if (cap.requiresAdmin) needsAdmin = true;
    const spec = cap.params || {};
    const given = step.params || {};
    // params obrigatórios presentes
    for (const [p, def] of Object.entries(spec))
      if (def.required && !(p in given)) err(f, `steps[${i}] (${step.capability}) falta param obrigatório "${p}"`);
    // params fornecidos: existem e têm tipo/enum corretos
    for (const [p, val] of Object.entries(given)) {
      const def = spec[p];
      if (!def) { err(f, `steps[${i}] (${step.capability}) param desconhecido "${p}"`); continue; }
      const t = def.type;
      const ok = (t === "string" && typeof val === "string") ||
                 (t === "int" && Number.isInteger(val)) ||
                 (t === "bool" && typeof val === "boolean");
      if (!ok) err(f, `steps[${i}].${p} deveria ser ${t}, veio ${typeof val}`);
      if (def.enum && !def.enum.includes(val)) err(f, `steps[${i}].${p}="${val}" fora da whitelist [${def.enum.join(", ")}]`);
    }
  }
  if (needsAdmin && !skill.requiresAdmin) err(f, `usa capacidade admin mas requiresAdmin=false`);
  if (!needsAdmin && skill.requiresAdmin) warn(f, `requiresAdmin=true mas nenhuma capacidade exige admin`);
  // onError deve mapear (ao menos) default; bônus: avisa códigos não previstos
  const known = new Set([...(registry.commonErrorCodes || [])]);
  for (const step of skill.steps || []) (CAPS[step.capability]?.errorCodes || []).forEach(c => known.add(c));
  for (const code of Object.keys(skill.onError || {}))
    if (code !== "default" && !known.has(code)) warn(f, `onError."${code}" não é um código previsto pelas capacidades usadas`);
}

// --- run ---
console.log(`Validando Skills em ${path.relative(root, skillsDir)}/ …\n`);
const files = fs.readdirSync(skillsDir).filter(f => f.endsWith(".json"));
const ids = new Set();
for (const file of files) {
  let skill;
  try { skill = JSON.parse(fs.readFileSync(path.join(skillsDir, file), "utf8")); }
  catch (e) { err(file, `JSON inválido: ${e.message}`); continue; }
  validateSchema(file, skill, schema);
  validateRegistry(file, skill);
  if (ids.has(skill.id)) err(file, `id duplicado "${skill.id}"`);
  ids.add(skill.id);
}

console.log(`\n${files.length} skills · ${ids.size} ids únicos · ${Object.keys(CAPS).length} capacidades no registry · ${errors} erro(s)`);
process.exit(errors ? 1 : 0);
