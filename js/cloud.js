/* =============================================================================
   Convergas Control Center — camada de nuvem (Supabase).
   Backend real do app principal. Modelo genérico espelhando o Store local:
     - coleções (arrays) -> tabela `entities` (entity, id, data jsonb)
     - frota            -> tabela `computers` (id, data jsonb)
     - PDFs             -> bucket `files`, path `{entity}/{id}/{field}/{arquivo}`
   Desenho OFFLINE-FIRST: o app funciona 100% no localStorage; a nuvem
   hidrata e sincroniza por cima. Qualquer falha de rede é tolerada
   (best-effort) e nunca quebra a interface.
   Hoje sem login (RLS liberado p/ anônimo) — auth por setor volta depois.
   ============================================================================= */
(function () {
  const cfg = window.CC_CONFIG || {};
  const hasLib = !!(window.supabase && window.supabase.createClient && cfg.supabaseUrl && cfg.supabaseAnon);
  const SB = hasLib ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnon, { auth: { persistSession: false } }) : null;

  // Coleções sincronizadas (arrays de topo do Store). Ficam de fora:
  //  - vault (segredos: não expor em nuvem anônima)
  //  - infra/domains/dns (modelo aninhado; sync futuro)
  const ENTITY_COLLECTIONS = ['certificates', 'labs', 'team', 'printers', 'commands', 'runbooks', 'inventory', 'licenses', 'phones', 'equipments', 'serviceOrders', 'sharepoint', 'webDomains', 'dnsRecords', 'history', 'parts'];
  const SYNCED = ENTITY_COLLECTIONS.concat(['computers']);
  const SETTINGS_KEYS = ['prodDashboardUrl', 'guidelineUrl']; // do doc settings, só o que faz sentido compartilhar

  // Adaptadores de forma nuvem <-> local (só onde os campos divergem).
  const ADAPT = {
    certificates: {
      in: (d) => ({ ...d, type: d.type === 'CATA' ? 'cata' : d.type === 'Instrumento' ? 'equipamento' : d.type, fileName: d.fileName || d.pdf || '' }),
      out: (it) => { const o = { ...it }; o.type = it.type === 'cata' ? 'CATA' : it.type === 'equipamento' ? 'Instrumento' : it.type; o.pdf = it.fileName || it.pdf || ''; return o; },
    },
    computers: {
      in: (d) => ({ ...d, hostname: d.hostname || d.name || '', userId: d.userId != null ? d.userId : (d.assignedTo || '') }),
      out: (it) => ({ ...it, name: it.hostname || it.id, assignedTo: it.userId || '' }),
    },
  };
  const mapIn = (coll, d) => (ADAPT[coll] ? ADAPT[coll].in(d) : d);
  const mapOut = (coll, it) => { const o = ADAPT[coll] ? ADAPT[coll].out(it) : { ...it }; delete o.id; return o; };

  const log = (...a) => { try { console.debug('[cloud]', ...a); } catch (e) {} };

  const Cloud = {
    ok: !!SB,
    SB,
    SYNCED,
    ENTITY_COLLECTIONS,

    /* ---------- leitura ---------- */
    async pullCollection(coll) {
      if (!SB) return null;
      if (coll === 'computers') {
        const { data, error } = await SB.from('computers').select('id,data');
        if (error) throw error;
        return (data || []).map((r) => ({ id: r.id, ...mapIn('computers', r.data || {}) }));
      }
      const { data, error } = await SB.from('entities').select('id,data').eq('entity', coll);
      if (error) throw error;
      return (data || []).map((r) => ({ id: r.id, ...mapIn(coll, r.data || {}) }));
    },

    async pullSettings() {
      if (!SB) return null;
      const { data, error } = await SB.from('entities').select('data').eq('entity', 'settings').eq('id', 'app').maybeSingle();
      if (error) throw error;
      return data ? data.data : null;
    },

    /* ---------- escrita (best-effort) ---------- */
    async pushItem(coll, item) {
      if (!SB || SYNCED.indexOf(coll) === -1 || !item || !item.id) return false;
      const data = mapOut(coll, item);
      if (coll === 'computers') {
        const { error } = await SB.from('computers').upsert({ id: item.id, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await SB.from('entities').upsert({ entity: coll, id: item.id, data, updated_at: new Date().toISOString() }, { onConflict: 'entity,id' });
        if (error) throw error;
      }
      return true;
    },

    async deleteItem(coll, id) {
      if (!SB || SYNCED.indexOf(coll) === -1 || !id) return false;
      if (coll === 'computers') {
        const { error } = await SB.from('computers').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await SB.from('entities').delete().eq('entity', coll).eq('id', id);
        if (error) throw error;
      }
      return true;
    },

    async pushSettings(settings) {
      if (!SB || !settings) return false;
      const doc = {};
      SETTINGS_KEYS.forEach((k) => { if (settings[k] != null) doc[k] = settings[k]; });
      const { error } = await SB.from('entities').upsert({ entity: 'settings', id: 'app', data: doc, updated_at: new Date().toISOString() }, { onConflict: 'entity,id' });
      if (error) throw error;
      return true;
    },

    /* ---------- arquivos (PDFs) no bucket `files` ---------- */
    filePath(entity, id, field, name) { return `${entity}/${id}/${field}/${name}`; },
    filePublicUrl(entity, id, field, name) {
      if (!SB || !name) return '';
      const { data } = SB.storage.from('files').getPublicUrl(this.filePath(entity, id, field, name));
      return (data && data.publicUrl) || '';
    },
    async uploadFile(entity, id, field, file) {
      if (!SB || !file) return false;
      // limpa versões antigas nesse campo antes de subir a nova
      try { await this.removeField(entity, id, field); } catch (e) {}
      const path = this.filePath(entity, id, field, file.name);
      const { error } = await SB.storage.from('files').upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' });
      if (error) throw error;
      return true;
    },
    async removeField(entity, id, field) {
      if (!SB) return false;
      const prefix = `${entity}/${id}/${field}`;
      const { data } = await SB.storage.from('files').list(prefix);
      if (data && data.length) await SB.storage.from('files').remove(data.map((o) => `${prefix}/${o.name}`));
      return true;
    },
    // adiciona um arquivo SEM apagar os irmãos do mesmo campo (p/ múltiplos: diagramas)
    async addFile(entity, id, field, file) {
      if (!SB || !file) return false;
      const { error } = await SB.storage.from('files').upload(this.filePath(entity, id, field, file.name), file, { upsert: true, contentType: file.type || 'application/octet-stream' });
      if (error) throw error;
      return true;
    },
    async removeFile(entity, id, field, name) {
      if (!SB || !name) return false;
      const { error } = await SB.storage.from('files').remove([this.filePath(entity, id, field, name)]);
      if (error) throw error;
      return true;
    },
    async fetchFileBlob(entity, id, field, name) {
      if (!SB || !name) return null;
      try {
        const url = this.filePublicUrl(entity, id, field, name);
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.blob();
      } catch (e) { return null; }
    },
  };

  window.Cloud = Cloud;
  log('inicializado', SB ? 'ok' : 'sem lib/config');
})();
