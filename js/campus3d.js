/* =============================================================================
   Planta 3D da Home (three.js) — maquete da empresa com os setores e os colaboradores.
   - Cada setor é uma sala (piso cerâmico, paredes, vidro, mesas com cadeira e monitor).
   - Cada colaborador é um bonequinho estilo cartoon que anda pela sala desviando dos
     móveis (A* numa grade com as mesas e cadeiras marcadas como obstáculo).
   - Câmera ortográfica isométrica que se afasta sozinha para caber a empresa toda.
   API: Campus3D.render(host, data) · Campus3D.resize() · Campus3D.stop()
   ============================================================================= */
(function () {
  'use strict';
  const T = () => window.THREE;
  let S = null; // estado da cena atual

  /* ---------- utilidades ---------- */
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (arr, seed) => arr[seed % arr.length];
  const SKIN = ['#F2C9A8', '#E8B48E', '#D69E74', '#C08158', '#9C6440', '#744A2E'];
  const HAIR = ['#1B1714', '#2E2119', '#4A3121', '#6B4528', '#8E6236', '#C9A36A', '#2A2A2E'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new (T().CanvasTexture)(c); t.colorSpace = T().SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function tileTex(base, grout) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = (hash(i * 7 + j * 13) % 14) - 7; g.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v) / 260})`; g.fillRect(i * 64, j * 64, 64, 64); }
      g.strokeStyle = grout; g.lineWidth = 2; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke(); }
    });
  }
  function rrectShape(w, d, r) {
    const s = new (T().Shape)(); const x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }

  /* ---------- materiais compartilhados ---------- */
  function mats(light) {
    const M = (o) => new (T().MeshStandardMaterial)(o);
    return {
      wall: M({ color: light ? '#FFFFFF' : '#E9EFF6', roughness: .85 }),
      wallTop: M({ color: '#F7FAFD', roughness: .7 }),
      glass: new (T().MeshPhysicalMaterial)({ color: '#BFE3FF', roughness: .05, metalness: 0, transmission: 0, transparent: true, opacity: .22 }),
      frame: M({ color: '#9AA9BC', roughness: .4, metalness: .6 }),
      deskTop: M({ color: '#F4F6F8', roughness: .45 }),
      deskLeg: M({ color: '#8C99A8', roughness: .4, metalness: .5 }),
      wood: M({ color: '#B98A5E', roughness: .6 }),
      monitor: M({ color: '#1A2230', roughness: .35, metalness: .3 }),
      screen: M({ color: '#2F7DD6', emissive: '#3FA9F5', emissiveIntensity: .9, roughness: .3 }),
      chair: M({ color: '#24344F', roughness: .7 }),
      chairBase: M({ color: '#3A3F47', roughness: .5, metalness: .4 }),
      pot: M({ color: '#ECEFF3', roughness: .6 }),
      leaf: M({ color: '#3E9A4E', roughness: .8, flatShading: true }),
      leaf2: M({ color: '#2F7D3F', roughness: .8, flatShading: true }),
      trunk: M({ color: '#6E4B2F', roughness: .9 }),
      slabTop: M({ color: light ? '#D9E3EE' : '#2A3B55', roughness: .9 }),
      slabSide: M({ color: light ? '#AFC0D4' : '#132036', roughness: .8 }),
      edge: M({ color: '#3FA9F5', emissive: '#3FA9F5', emissiveIntensity: 2.2, roughness: .3 }),
      road: M({ color: light ? '#C7D3E1' : '#1C2A40', roughness: .95 }),
      white: M({ color: '#F5F8FB', roughness: .6 }),
      dark: M({ color: '#0E1A2C', roughness: .5, metalness: .2 }),
      blue: M({ color: '#2E86D6', roughness: .45 }),
      lampPole: M({ color: '#5E6B7C', roughness: .4, metalness: .6 }),
      lampBulb: M({ color: '#EAF6FF', emissive: '#CDEBFF', emissiveIntensity: 3 }),
      hedge: M({ color: '#3C8F4A', roughness: .9, flatShading: true }),
      sofa: M({ color: '#2B4A7A', roughness: .8 }),
      cabinet: M({ color: '#DDE4EC', roughness: .6 }),
      shirt: M({ color: '#1F4E8C', roughness: .75 }),
      collar: M({ color: '#2C63AD', roughness: .7 }),
      pants: M({ color: '#26324A', roughness: .8 }),
      shoe: M({ color: '#14181F', roughness: .5 }),
      eye: M({ color: '#141414', roughness: .2 }),
      eyeHi: M({ color: '#FFFFFF', emissive: '#FFFFFF', emissiveIntensity: .4 }),
      hit: new (T().MeshBasicMaterial)({ visible: false }),
    };
  }

  /* ---------- geometrias compartilhadas (bonecos) ---------- */
  function geos() {
    const G = T();
    return {
      head: new G.SphereGeometry(.3, 32, 24),
      hairCap: new G.SphereGeometry(.318, 32, 18, 0, Math.PI * 2, 0, Math.PI * .5),
      hairBack: new G.SphereGeometry(.3, 24, 18),
      mouth: new G.TorusGeometry(.07, .014, 6, 16, Math.PI),
      brow: new G.CapsuleGeometry(.012, .06, 3, 6),
      curl: new G.SphereGeometry(.09, 10, 8),
      torso: new G.CapsuleGeometry(.21, .3, 6, 16),
      hip: new G.CylinderGeometry(.2, .19, .14, 16),
      leg: new G.CapsuleGeometry(.085, .36, 4, 10),
      shoe: new G.BoxGeometry(.13, .08, .22),
      arm: new G.CapsuleGeometry(.068, .32, 4, 10),
      hand: new G.SphereGeometry(.072, 12, 10),
      eye: new G.SphereGeometry(.036, 10, 8),
      eyeHi: new G.SphereGeometry(.012, 6, 6),
      nose: new G.SphereGeometry(.035, 10, 8),
      lens: new G.TorusGeometry(.065, .012, 6, 18),
      hit: new G.CylinderGeometry(.35, .35, 2, 8),
      ear: new G.SphereGeometry(.05, 10, 8),
    };
  }

  /* ---------- bonequinho ---------- */
  function makePerson(p, M, Gm) {
    const G = T(); const h = hash(p.name + p.id);
    const skin = new G.MeshStandardMaterial({ color: pick(SKIN, h >>> 3), roughness: .7 });
    const hair = new G.MeshStandardMaterial({ color: pick(HAIR, h >>> 7), roughness: .85 });
    const g = new G.Group(); const body = new G.Group(); g.add(body);
    const add = (geo, mat, x, y, z, parent) => { const m = new G.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; (parent || body).add(m); return m; };
    // pernas (com pivô no quadril)
    const legs = [-1, 1].map((sd) => { const piv = new G.Group(); piv.position.set(sd * .1, .72, 0); body.add(piv); add(Gm.leg, M.pants, 0, -.3, 0, piv); add(Gm.shoe, M.shoe, 0, -.58, .04, piv); return piv; });
    add(Gm.hip, M.pants, 0, .74, 0);
    const torso = add(Gm.torso, M.shirt, 0, 1.04, 0); torso.scale.set(1, 1, .82);
    const collar = add(new G.TorusGeometry(.12, .035, 8, 18), M.collar, 0, 1.3, .02); collar.rotation.x = Math.PI / 2;
    // braços (pivô no ombro)
    const arms = [-1, 1].map((sd) => { const piv = new G.Group(); piv.position.set(sd * .27, 1.24, 0); piv.rotation.z = sd * .08; body.add(piv); add(Gm.arm, M.shirt, 0, -.2, 0, piv); add(Gm.hand, skin, 0, -.42, 0, piv); return piv; });
    // cabeça
    const head = new G.Group(); head.position.set(0, 1.63, 0); body.add(head);
    add(Gm.head, skin, 0, 0, 0, head);
    [-1, 1].forEach((sd) => { add(Gm.ear, skin, sd * .295, -.02, 0, head); add(Gm.eye, M.eye, sd * .105, .03, .272, head); add(Gm.eyeHi, M.eyeHi, sd * .105 + .013, .045, .302, head); const b = add(Gm.brow, hair, sd * .105, .11, .27, head); b.rotation.z = Math.PI / 2 + sd * .15; });
    add(Gm.nose, skin, 0, -.03, .3, head);
    const mo = add(Gm.mouth, M.eye, 0, -.1, .27, head); mo.rotation.set(-.25, 0, Math.PI);
    const style = (h >>> 11) % 5;
    const cap = add(Gm.hairCap, hair, 0, .02, -.01, head); cap.rotation.x = -.22;
    if (style === 1 || style === 4) { const back = add(Gm.hairBack, hair, 0, -.13, -.1, head); back.scale.set(1.04, 1.15, .78); }
    if (style === 2) { for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; add(Gm.curl, hair, Math.cos(a) * .22, .19 + (i % 2) * .05, Math.sin(a) * .22 - .03, head); } add(Gm.curl, hair, 0, .29, 0, head).scale.setScalar(1.6); }
    if (style === 3) cap.scale.set(1, .7, 1);
    if ((h >>> 15) % 4 === 0) { [-1, 1].forEach((sd) => add(Gm.lens, M.eye, sd * .105, .03, .29, head)); }
    // área de clique
    const hit = new G.Mesh(Gm.hit, M.hit); hit.position.y = 1; hit.userData.personId = p.id; g.add(hit);
    // sombra-contato (anel luminoso no chão)
    const ring = new G.Mesh(new G.RingGeometry(.34, .4, 32), new G.MeshBasicMaterial({ color: '#3FA9F5', transparent: true, opacity: .55 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .012; g.add(ring);
    g.scale.setScalar(1.4);
    g.userData = { legs, arms, head, body, hit, ring, phase: (h % 100) / 16 };
    return g;
  }

  /* ---------- móveis ---------- */
  function box(w, h, d, mat, x, y, z, parent, shadow) {
    const m = new (T().Mesh)(new (T().BoxGeometry)(w, h, d), mat); m.position.set(x, y, z);
    m.castShadow = shadow !== false; m.receiveShadow = true; parent.add(m); return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, parent, seg) { const m = new (T().Mesh)(new (T().CylinderGeometry)(rt, rb, h, seg || 16), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  function desk(M, x, z, parent) {
    const g = new (T().Group)(); g.position.set(x, 0, z); parent.add(g);
    box(1.4, .05, .7, M.deskTop, 0, .74, 0, g);
    box(.05, .72, .64, M.deskLeg, -.66, .36, 0, g); box(.05, .72, .64, M.deskLeg, .66, .36, 0, g);
    box(1.3, .3, .03, M.deskLeg, 0, .5, -.3, g);
    box(.08, .22, .08, M.monitor, 0, .87, -.18, g); box(.25, .02, .16, M.monitor, 0, .775, -.18, g);
    const mon = box(.64, .4, .04, M.monitor, 0, 1.1, -.2, g);
    box(.58, .34, .005, M.screen, 0, 1.1, -.177, g, false);
    box(.42, .02, .14, M.dark, 0, .775, .08, g);
    // cadeira (do lado de cá da mesa)
    const c = new (T().Group)(); c.position.set(0, 0, .62); g.add(c);
    box(.48, .08, .46, M.chair, 0, .47, 0, c); box(.46, .5, .07, M.chair, 0, .78, .21, c);
    cyl(.03, .03, .4, M.chairBase, 0, .25, 0, c, 8); cyl(.24, .24, .03, M.chairBase, 0, .05, 0, c, 10);
    return mon;
  }
  function plant(M, x, z, parent, s) {
    s = s || 1; const g = new (T().Group)(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
    cyl(.2, .15, .42, M.pot, 0, .21, 0, g);
    const f = new (T().Mesh)(new (T().IcosahedronGeometry)(.36, 1), M.leaf); f.position.y = .72; f.castShadow = true; g.add(f);
    const f2 = new (T().Mesh)(new (T().IcosahedronGeometry)(.25, 1), M.leaf2); f2.position.set(.12, .98, .05); f2.castShadow = true; g.add(f2);
  }
  function tree(M, x, z, parent, s) {
    s = s || 1; const g = new (T().Group)(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
    cyl(.09, .13, 1.4, M.trunk, 0, .7, 0, g, 8);
    [[0, 1.9, 0, .8], [.35, 1.6, .2, .55], [-.3, 1.65, -.15, .55], [.05, 2.35, -.05, .5]].forEach(([a, b, c, r], i) => { const f = new (T().Mesh)(new (T().IcosahedronGeometry)(r, 1), i % 2 ? M.leaf2 : M.leaf); f.position.set(a, b, c); f.castShadow = true; g.add(f); });
  }
  function lamp(M, x, z, parent) {
    cyl(.05, .07, 2.6, M.lampPole, x, 1.3, z, parent, 8);
    const b = new (T().Mesh)(new (T().SphereGeometry)(.16, 16, 12), M.lampBulb); b.position.set(x, 2.7, z); parent.add(b);
    cyl(.2, .12, .08, M.lampPole, x, 2.82, z, parent, 12);
  }

  /* ---------- A* numa grade ---------- */
  function astar(grid, a, b) {
    const { cols, rows, blocked } = grid; const key = (c, r) => r * cols + c;
    const open = [[a.c, a.r]], came = new Map(), gS = new Map([[key(a.c, a.r), 0]]);
    const hf = (c, r) => Math.hypot(c - b.c, r - b.r); const fS = new Map([[key(a.c, a.r), hf(a.c, a.r)]]);
    let it = 0;
    while (open.length && it++ < 4000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if ((fS.get(key(...open[i])) || 1e9) < (fS.get(key(...open[bi])) || 1e9)) bi = i;
      const [c, r] = open.splice(bi, 1)[0];
      if (c === b.c && r === b.r) { const path = [[c, r]]; let k = key(c, r); while (came.has(k)) { const p = came.get(k); path.unshift(p); k = key(...p); } return path; }
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue; const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || blocked[key(nc, nr)]) continue;
        if (dc && dr && (blocked[key(c + dc, r)] || blocked[key(c, r + dr)])) continue; // não corta canto de móvel
        const ng = gS.get(key(c, r)) + (dc && dr ? 1.414 : 1);
        if (ng < (gS.get(key(nc, nr)) ?? 1e9)) { came.set(key(nc, nr), [c, r]); gS.set(key(nc, nr), ng); fS.set(key(nc, nr), ng + hf(nc, nr)); if (!open.some((o) => o[0] === nc && o[1] === nr)) open.push([nc, nr]); }
      }
    }
    return null;
  }
  function makeGrid(x0, z0, w, d, cell) {
    const cols = Math.floor(w / cell), rows = Math.floor(d / cell);
    return { x0, z0, cell, cols, rows, blocked: new Uint8Array(cols * rows),
      block(x1, z1, x2, z2) { for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const cx = x0 + (c + .5) * cell, cz = z0 + (r + .5) * cell; if (cx > x1 && cx < x2 && cz > z1 && cz < z2) this.blocked[r * cols + c] = 1; } },
      free() { const f = []; for (let i = 0; i < this.blocked.length; i++) if (!this.blocked[i]) f.push([i % cols, Math.floor(i / cols)]); return f; },
      pos(c, r) { return [x0 + (c + .5) * cell, z0 + (r + .5) * cell]; },
      cellOf(x, z) { return { c: Math.max(0, Math.min(cols - 1, Math.floor((x - x0) / cell))), r: Math.max(0, Math.min(rows - 1, Math.floor((z - z0) / cell))) }; } };
  }

  /* ---------- cena ---------- */
  function build(host, data) {
    const G = T(); const light = data.theme === 'light';
    const M = mats(light), Gm = geos();
    const scene = new G.Scene();
    const renderer = new G.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = G.PCFSoftShadowMap;
    renderer.toneMapping = G.ACESFilmicToneMapping; renderer.toneMappingExposure = light ? 1.0 : 1.08;
    renderer.outputColorSpace = G.SRGBColorSpace;
    const cv = renderer.domElement; cv.className = 'c3-canvas'; host.appendChild(cv);
    const overlay = document.createElement('div'); overlay.className = 'c3-ov' + (data.sectors.length > 6 ? ' many' : ''); host.appendChild(overlay);
    const tip = document.createElement('div'); tip.className = 'c3-tip'; overlay.appendChild(tip);

    /* layout */
    const secs = data.sectors; const N = secs.length;
    const maxP = Math.max(4, ...secs.map((s) => s.people.length));
    const perRow = 3, deskRows = Math.ceil(maxP / perRow);
    const RW = 8.6, RD = 2.8 + deskRows * 2.35, GAP = 2.6;
    const cells = N + 1;
    // colunas que menos desperdiçam espaço, mantendo um formato equilibrado
    let cols = 2, best = 1e9;
    for (let c = 2; c <= 6; c++) { const r = Math.ceil(cells / c); const sc = (r * c - cells) * 1.6 + Math.abs(c * RW - r * RD * 1.25) / 8; if (sc < best) { best = sc; cols = c; } }
    const rows = Math.ceil(cells / cols);
    const lobbyIdx = Math.min(cells - 1, Math.floor(rows / 2) * cols + Math.floor((cols - 1) / 2));
    const W = cols * RW + (cols - 1) * GAP, D = rows * RD + (rows - 1) * GAP;
    const MARGIN = 2.2, FRONT = 2.2;
    const SW = W + MARGIN * 2, SD = D + MARGIN * 2 + FRONT;
    const ox = -W / 2, oz = -D / 2 - FRONT / 2;
    const lastN = cells - (rows - 1) * cols; const lastOff = ((cols - lastN) * (RW + GAP)) / 2; // última fileira centralizada
    const cellXY = (i) => { const r = Math.floor(i / cols); return [ox + (i % cols) * (RW + GAP) + (r === rows - 1 ? lastOff : 0), oz + r * (RD + GAP)]; };

    /* base */
    const slab = new G.Mesh(new G.ExtrudeGeometry(rrectShape(SW, SD, 2.2), { depth: .7, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 3 }), [M.slabTop, M.slabSide]);
    slab.rotation.x = -Math.PI / 2; slab.position.y = -.78; slab.receiveShadow = true; scene.add(slab);
    const ringShape = rrectShape(SW + .5, SD + .5, 2.45); ringShape.holes.push(rrectShape(SW + .16, SD + .16, 2.3));
    const edge = new G.Mesh(new G.ExtrudeGeometry(ringShape, { depth: .1, bevelEnabled: false }), M.edge); edge.rotation.x = -Math.PI / 2; edge.position.y = -.82; scene.add(edge);
    const edge2 = edge.clone(); edge2.position.y = -.3; edge2.scale.set(1, 1, .4); scene.add(edge2);
    // ruas internas
    const road = new G.Mesh(new G.PlaneGeometry(SW - .6, SD - .6), M.road); road.rotation.x = -Math.PI / 2; road.position.y = .002; road.receiveShadow = true; scene.add(road);

    const floorTex = tileTex(light ? '#F1F4F8' : '#E6ECF3', light ? '#D3DCE6' : '#C7D2DE');
    const rooms = []; const people = []; const labels = []; const hits = []; const roomFloors = [];

    secs.forEach((s, i) => {
      const ci = i >= lobbyIdx ? i + 1 : i; const [x0, z0] = cellXY(ci);
      const g = new G.Group(); scene.add(g);
      const tint = new G.Color('#FFFFFF').lerp(new G.Color(s.cor), .2);
      const ft = floorTex.clone(); ft.needsUpdate = true; ft.wrapS = ft.wrapT = G.RepeatWrapping; ft.repeat.set(RW / 1.6, RD / 1.6);
      const fmat = new G.MeshStandardMaterial({ map: ft, color: tint, roughness: .55, emissive: new G.Color(s.cor), emissiveIntensity: 0 });
      const floor = new G.Mesh(new G.BoxGeometry(RW, .1, RD), fmat); floor.position.set(x0 + RW / 2, .05, z0 + RD / 2); floor.receiveShadow = true; floor.userData.room = s.nome; g.add(floor); roomFloors.push(floor);
      // paredes (fundo e lado esquerdo) + faixa na cor do setor
      const WH = 1.25, WT = .16;
      box(RW, WH, WT, M.wall, x0 + RW / 2, WH / 2 + .1, z0 + WT / 2, g); box(WT, WH, RD, M.wall, x0 + WT / 2, WH / 2 + .1, z0 + RD / 2, g);
      const accent = new G.MeshStandardMaterial({ color: s.cor, emissive: s.cor, emissiveIntensity: 1.2 });
      box(RW - .4, .06, .03, accent, x0 + RW / 2, WH - .05, z0 + WT + .02, g, false);
      box(.03, .06, RD - .4, accent, x0 + WT + .02, WH - .05, z0 + RD / 2, g, false);
      // vidro na frente e à direita, com porta
      const GH = 1.0; const door = 1.8;
      const gl = (w, d, x, z) => { box(w, GH, d, M.glass, x, GH / 2 + .1, z, g, false); };
      gl((RW - door) / 2, .04, x0 + (RW - door) / 4, z0 + RD - .02); gl((RW - door) / 2, .04, x0 + RW - (RW - door) / 4, z0 + RD - .02);
      gl(.04, (RD - door) / 2, x0 + RW - .02, z0 + (RD - door) / 4); gl(.04, (RD - door) / 2, x0 + RW - .02, z0 + RD - (RD - door) / 4);
      box(RW, .05, .05, M.frame, x0 + RW / 2, GH + .12, z0 + RD - .02, g); box(.05, .05, RD, M.frame, x0 + RW - .02, GH + .12, z0 + RD / 2, g);
      // grade de caminhada
      const grid = makeGrid(x0 + .55, z0 + .55, RW - 1.1, RD - 1.1, .4);
      // mesas
      const n = Math.max(1, s.people.length); const nd = Math.max(2, Math.min(perRow * deskRows, n));
      for (let k = 0; k < nd; k++) {
        const col = k % perRow, row = Math.floor(k / perRow);
        const dx = x0 + 1.55 + col * 2.75, dz = z0 + 1.35 + row * 2.35;
        desk(M, dx, dz, g);
        grid.block(dx - 1.15, dz - .75, dx + 1.15, dz + 1.25);
      }
      // planta e armário
      plant(M, x0 + RW - .55, z0 + .55, g, 1); grid.block(x0 + RW - 1, z0, x0 + RW, z0 + 1);
      box(1.2, .9, .45, M.cabinet, x0 + .55 + .6 + 4.2, .55, z0 + .38, g); grid.block(x0 + 4.6, z0, x0 + 6.1, z0 + .9);
      rooms.push({ nome: s.nome, floor, x0, z0 });
      labels.push({ el: null, pos: new G.Vector3(x0 + .6, 2.1, z0 + .6), html: `<span class="c3-tag" style="--c:${s.cor}"><i></i><b>${esc(s.nome)}</b><em>${s.people.length}</em></span>`, room: s.nome });
      s.people.forEach((p) => people.push({ p, grid, lead: s.lead === p.id }));
    });

    /* recepção */
    const [lx, lz] = cellXY(lobbyIdx); const lg = new G.Group(); scene.add(lg);
    const lt = tileTex(light ? '#F6F8FB' : '#EEF2F7', '#D6DEE8'); lt.wrapS = lt.wrapT = G.RepeatWrapping; lt.repeat.set(RW / 2.2, RD / 2.2);
    const lfloor = new G.Mesh(new G.BoxGeometry(RW, .1, RD), new G.MeshStandardMaterial({ map: lt, roughness: .25, metalness: .05 })); lfloor.position.set(lx + RW / 2, .05, lz + RD / 2); lfloor.receiveShadow = true; lg.add(lfloor);
    // parede com a marca
    const bw = Math.min(5.4, RW - 2);
    box(bw, 2.5, .35, M.dark, lx + RW / 2, 1.35, lz + 1.1, lg);
    box(bw + .1, .05, .4, M.edge, lx + RW / 2, 2.62, lz + 1.1, lg, false); box(bw + .1, .05, .4, M.edge, lx + RW / 2, .12, lz + 1.1, lg, false);
    const signTex = canvasTex(1024, 420, (c2, w, h) => { c2.clearRect(0, 0, w, h); c2.fillStyle = '#FFFFFF'; c2.font = '600 150px "DM Sans", "Segoe UI", sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.shadowColor = '#3FA9F5'; c2.shadowBlur = 30; c2.fillText('Convergas', w / 2, h * .72); });
    const sign = new G.Mesh(new G.PlaneGeometry(bw * .82, bw * .82 * 420 / 1024), new G.MeshBasicMaterial({ map: signTex, transparent: true })); sign.position.set(lx + RW / 2, 1.05, lz + 1.29); lg.add(sign);
    new G.TextureLoader().load('assets/logo-icone.png', (tx) => { tx.colorSpace = G.SRGBColorSpace; const lgo = new G.Mesh(new G.PlaneGeometry(1.1, 1.1), new G.MeshBasicMaterial({ map: tx, transparent: true })); lgo.position.set(lx + RW / 2, 2.0, lz + 1.29); lg.add(lgo); });
    // balcão, sofás e plantas
    box(3.2, .95, .7, M.white, lx + RW / 2, .58, lz + RD - 2.1, lg); box(3.24, .06, .74, M.blue, lx + RW / 2, 1.08, lz + RD - 2.1, lg); box(3.21, .5, .02, M.blue, lx + RW / 2, .5, lz + RD - 1.74, lg, false);
    box(1.6, .42, .7, M.sofa, lx + 1.3, .31, lz + RD / 2 + .4, lg); box(1.6, .45, .18, M.sofa, lx + 1.3, .6, lz + RD / 2 + .1, lg);
    box(1.6, .42, .7, M.sofa, lx + RW - 1.3, .31, lz + RD / 2 + .4, lg); box(1.6, .45, .18, M.sofa, lx + RW - 1.3, .6, lz + RD / 2 + .1, lg);
    plant(M, lx + .6, lz + .6, lg, 1.2); plant(M, lx + RW - .6, lz + .6, lg, 1.2);
    const lgrid = makeGrid(lx + .6, lz + .6, RW - 1.2, RD - 1.2, .4);
    lgrid.block(lx + RW / 2 - bw / 2 - .6, lz, lx + RW / 2 + bw / 2 + .6, lz + 1.95);
    lgrid.block(lx + RW / 2 - 2.2, lz + RD - 3.0, lx + RW / 2 + 2.2, lz + RD - 1.1);
    lgrid.block(lx, lz + RD / 2 - .6, lx + 2.6, lz + RD / 2 + 1.3); lgrid.block(lx + RW - 2.6, lz + RD / 2 - .6, lx + RW, lz + RD / 2 + 1.3);
    lgrid.block(lx, lz, lx + 1.4, lz + 1.4); lgrid.block(lx + RW - 1.4, lz, lx + RW, lz + 1.4);
    data.lobby.forEach((p) => people.push({ p, grid: lgrid }));

    /* exterior: árvores, postes, cerca viva, faixa */
    const ex = SW / 2 - 1.2, ez = SD / 2 - 1.2, fz = oz + D + FRONT / 2 + .4;
    [[-ex, -ez], [ex, -ez], [-ex, ez], [ex, ez]].forEach(([x, z], i) => { tree(M, x, z, scene, 1.15); if (i > 1) lamp(M, x + (x < 0 ? 1.6 : -1.6), z - .2, scene); });
    for (let i = 0; i < cols - 1; i++) { const x = ox + (i + 1) * (RW + GAP) - GAP / 2; tree(M, x, -ez, scene, .9); }
    for (let x = -SW / 2 + 2.6; x < SW / 2 - 2.6; x += 1.9) { if (Math.abs(x) < 2.2) continue; const hdg = new G.Mesh(new G.BoxGeometry(1.5, .55, .6), M.hedge); hdg.position.set(x, .28, fz + 1.1); hdg.castShadow = true; scene.add(hdg); }
    for (let k = -3; k <= 3; k++) box(.36, .015, 1.4, M.white, k * .62, .01, ez + .2, scene, false);
    const frontSign = new G.Group(); frontSign.position.set(SW / 2 - 4.5, 0, fz + .2); scene.add(frontSign);
    box(3.2, .9, .3, M.dark, 0, .55, 0, frontSign); box(3.25, .05, .34, M.edge, 0, 1.02, 0, frontSign, false);
    const fsTex = canvasTex(512, 140, (c2, w, h) => { c2.fillStyle = '#FFFFFF'; c2.font = 'italic 700 78px "DM Sans", sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('Convergas', w / 2, h / 2 + 4); });
    const fs = new G.Mesh(new G.PlaneGeometry(2.8, .76), new G.MeshBasicMaterial({ map: fsTex, transparent: true })); fs.position.set(0, .55, .16); frontSign.add(fs);

    /* luzes */
    scene.add(new G.HemisphereLight(light ? '#FFFFFF' : '#D4E3FF', light ? '#B8C6D8' : '#1A2A44', light ? 1.05 : .85));
    const sun = new G.DirectionalLight('#FFF3E2', light ? 2.2 : 2.1); sun.position.set(SW * .45, Math.max(SW, SD) * .9, SD * .3); sun.castShadow = true;
    const ext = Math.max(SW, SD) * .75; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: Math.max(SW, SD) * 3 });
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; sun.shadow.radius = 4;
    scene.add(sun); scene.add(sun.target);
    const fill = new G.DirectionalLight('#9CC7FF', light ? .4 : .55); fill.position.set(-SW, SD * .6, SD); scene.add(fill);

    /* pessoas */
    const actors = people.map((it, i) => {
      const m = makePerson(it.p, M, Gm); scene.add(m); hits.push(m.userData.hit);
      const free = it.grid.free(); const st = free[(hash(it.p.id) + i * 7) % Math.max(1, free.length)] || [0, 0];
      const [px, pz] = it.grid.pos(st[0], st[1]); m.position.set(px, .1, pz); m.rotation.y = (hash(it.p.id) % 628) / 100;
      if (it.lead) { const crown = new G.Mesh(new G.ConeGeometry(.12, .16, 5), new G.MeshStandardMaterial({ color: '#F5B840', emissive: '#F5B840', emissiveIntensity: .6, metalness: .5 })); crown.position.y = 2.0; m.add(crown); }
      return { m, it, path: null, wait: 1 + Math.random() * 5, speed: .9 + Math.random() * .3 };
    });

    /* câmera ortográfica que enquadra a empresa toda */
    const cam = new G.OrthographicCamera(-10, 10, 10, -10, .1, 500);
    const center = new G.Vector3(0, 0, 0); const dir = new G.Vector3(1, 1.02, 1).normalize();
    cam.position.copy(center).addScaledVector(dir, 120); cam.lookAt(center);
    function fit() {
      const r = host.getBoundingClientRect(); if (!r.width || !r.height) return false;
      renderer.setSize(r.width, r.height, false); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      cam.updateMatrixWorld();
      const pts = []; [-SW / 2 - .4, SW / 2 + .4].forEach((x) => [-SD / 2 - .4, SD / 2 + .4].forEach((z) => [-.9, 2.6].forEach((y) => pts.push(new G.Vector3(x, y, z)))));
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; const inv = cam.matrixWorldInverse;
      pts.forEach((p) => { const q = p.clone().applyMatrix4(inv); a = Math.min(a, q.x); b = Math.max(b, q.x); c = Math.min(c, q.y); d = Math.max(d, q.y); });
      const w = b - a, h = d - c, asp = r.width / r.height, pad = 1.04;
      let vw = w * pad, vh = h * pad; if (vw / vh > asp) vh = vw / asp; else vw = vh * asp;
      const cx = (a + b) / 2, cy = (c + d) / 2;
      Object.assign(cam, { left: cx - vw / 2, right: cx + vw / 2, top: cy + vh / 2, bottom: cy - vh / 2 }); cam.updateProjectionMatrix();
      return true;
    }

    /* rótulos HTML */
    labels.forEach((l) => { l.el = document.createElement('div'); l.el.className = 'c3-lab'; l.el.innerHTML = l.html; overlay.appendChild(l.el); });
    const v = new G.Vector3();
    function placeLabels() {
      const r = cv.getBoundingClientRect();
      labels.forEach((l) => { v.copy(l.pos).project(cam); l.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`; });
    }

    /* interação */
    const ray = new G.Raycaster(), mouse = new G.Vector2(); let hovP = null, hovR = null;
    function onMove(e) {
      const r = cv.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, cam);
      const hp = ray.intersectObjects(hits, false)[0]; const pid = hp ? hp.object.userData.personId : null;
      const hr = pid ? null : ray.intersectObjects(roomFloors, false)[0]; const rn = hr ? hr.object.userData.room : null;
      if (pid !== hovP) { hovP = pid; const a = actors.find((x) => x.it.p.id === pid); tip.innerHTML = a ? `<b>${esc(a.it.p.name)}</b><small>${esc(a.it.p.cargo || 'Sem cargo')}</small>` : ''; tip.classList.toggle('on', !!a); }
      if (hovP) tip.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top - 18}px) translate(-50%, -100%)`;
      if (rn !== hovR) { hovR = rn; roomFloors.forEach((f) => (f.material.emissiveIntensity = f.userData.room === rn ? .22 : 0)); labels.forEach((l) => l.el.classList.toggle('hov', l.room === rn)); }
      cv.style.cursor = data.interactive && (hovP || hovR) ? 'pointer' : 'default';
    }
    function onClick() { if (!data.interactive) return; if (hovP && data.onPerson) data.onPerson(hovP); else if (hovR && data.onRoom) data.onRoom(hovR); }
    function onLeave() { hovP = null; tip.classList.remove('on'); onMove({ clientX: -9999, clientY: -9999 }); }
    cv.addEventListener('pointermove', onMove); cv.addEventListener('click', onClick); cv.addEventListener('pointerleave', onLeave);

    /* animação */
    const clock = new G.Clock(); let raf = 0, alive = true;
    const reduce = () => document.documentElement.classList.contains('fx-off');
    function step(a, dt, t) {
      const ud = a.m.userData; const g = a.it.grid;
      if (a.path && a.path.length) {
        const [c, r] = a.path[0]; const [tx, tz] = g.pos(c, r);
        const dx = tx - a.m.position.x, dz = tz - a.m.position.z, dist = Math.hypot(dx, dz);
        const sp = a.speed * dt;
        if (dist <= sp) { a.m.position.x = tx; a.m.position.z = tz; a.path.shift(); }
        else { a.m.position.x += (dx / dist) * sp; a.m.position.z += (dz / dist) * sp; const ang = Math.atan2(dx, dz); let dA = ang - a.m.rotation.y; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); a.m.rotation.y += dA * Math.min(1, dt * 8); }
        const s = Math.sin(t * 7.5 * a.speed + ud.phase);
        ud.legs[0].rotation.x = s * .38; ud.legs[1].rotation.x = -s * .38; ud.arms[0].rotation.x = -s * .42; ud.arms[1].rotation.x = s * .42; ud.body.position.y = Math.abs(s) * .03;
        if (!a.path.length) { a.path = null; a.wait = 2 + Math.random() * 6; }
      } else {
        ud.legs.forEach((l) => (l.rotation.x *= .85)); ud.arms.forEach((l) => (l.rotation.x *= .85)); ud.body.position.y *= .85;
        ud.body.scale.y = 1 + Math.sin(t * 2 + ud.phase) * .008; ud.head.rotation.y = Math.sin(t * .6 + ud.phase) * .35;
        a.wait -= dt;
        if (a.wait <= 0 && !reduce()) {
          const from = g.cellOf(a.m.position.x, a.m.position.z);
          const ocup = actors.filter((o) => o !== a && o.it.grid === g).map((o) => o.goal || g.cellOf(o.m.position.x, o.m.position.z));
          const livre = g.free().filter(([c, r]) => ocup.every((o) => Math.abs(o.c - c) > 2 || Math.abs(o.r - r) > 2));
          const to = livre[Math.floor(Math.random() * livre.length)];
          const p = to && astar(g, from, { c: to[0], r: to[1] }); a.path = p && p.length > 1 ? p.slice(1) : null;
          a.goal = a.path ? { c: to[0], r: to[1] } : null; if (!a.path) a.wait = 1 + Math.random() * 2;
        }
      }
    }
    function loop() {
      if (!alive) return; raf = requestAnimationFrame(loop);
      if (!host.isConnected || host.offsetParent === null || document.hidden) return;
      const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
      actors.forEach((a) => step(a, dt, t));
      renderer.render(scene, cam); placeLabels();
    }
    fit(); loop();
    window.__c3pos = (i) => { const a = actors[i || 0]; if (!a) return null; const q = a.m.position.clone(); q.y += 1.6; q.project(cam); const r = cv.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; };
    window.__c3dbg = () => actors.map((a) => { const g = a.it.grid; const c = g.cellOf(a.m.position.x, a.m.position.z); return g.blocked[c.r * g.cols + c.c] ? 1 : 0; }).reduce((x, y) => x + y, 0);
    return {
      zoom(f, x, z) { cam.zoom = f || 1; if (x != null) { const c = new G.Vector3(x, 0, z); cam.position.copy(c).addScaledVector(dir, 120); cam.lookAt(c); } cam.updateProjectionMatrix(); },
      resize: () => { fit(); },
      stop() { alive = false; cancelAnimationFrame(raf); cv.removeEventListener('pointermove', onMove); scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); }); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); cv.remove(); overlay.remove(); },
    };
  }

  window.Campus3D = {
    render(host, data) { if (S) { S.stop(); S = null; } if (!T()) return false; S = build(host, data); return true; },
    resize() { if (S) S.resize(); },
    zoom(f, x, z) { if (S) S.zoom(f, x, z); },
    stop() { if (S) { S.stop(); S = null; } },
  };
})();
