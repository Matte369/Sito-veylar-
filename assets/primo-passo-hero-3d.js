/* ==========================================================================
   PRIMO PASSO — Hero 3D "Cameretta" (Three.js, scena 100% procedurale)
   --------------------------------------------------------------------------
   Modulo ES caricato on-demand da <pp-hero-3d> (assets/primo-passo.js).
   Riceve l'istanza THREE dall'esterno: nessun import "bare", così funziona
   da qualunque CDN o dall'asset del tema senza import map.

   Contenuto scena
   - Stanza: pavimento in rovere (texture canvas), pareti in intonaco caldo,
     finestra ad ARCO ritagliata nel muro (ExtrudeGeometry con hole)
   - Arco terracotta dipinto a parete (firma del brand)
   - Culla in legno chiaro con testate ad arco, doghe, materasso, coperta
   - Giostrina con pendenti che ruota dolcemente
   - Peluche orsetto tondo (materiale "sheen" da tessuto)
   - Tappeto tondo, pouf, mensola con libri e vaso, pianta, lampada a sospensione
   - Luce calda dal sole che entra dalla finestra (ombre morbide PCF),
     fascio volumetrico fake + pulviscolo animato in shader
   - Environment map PBR generata proceduralmente (PMREM)

   Prestazioni
   - Ombre statiche: shadow map calcolata una sola volta (autoUpdate = false)
   - Geometrie/materiali condivisi, pixel ratio limitato, qualità adattiva
   - Pulviscolo animato interamente su GPU (uniform uTime)
   ========================================================================== */

export function createHeroScene(THREE, canvas, options = {}) {
  const opts = Object.assign(
    {
      accent: '#C86D51',
      wall: '#F7F1EA',
      wood: '#E3CBA8',
      plush: '#EADBCB',
      shadows: true,
      dust: true,
      timeOfDay: 'golden',
      cameraIntensity: 5,
      scrollTravel: 6,
      autoOrbit: true,
      reducedMotion: false,
      isMobile: false
    },
    options
  );

  /* ------------------------------------------------------------------------
     0. Preset di luce
     ------------------------------------------------------------------------ */
  const LIGHT_PRESETS = {
    morning: { sun: '#fff4e2', sunI: 3.4, hemiSky: '#fff8ef', hemiGround: '#d9c3ad', hemiI: 1.25, lampI: 6, exposure: 1.08, skyTop: '#dfe9ee', skyBottom: '#fff6e6', shaft: 0.18 },
    golden: { sun: '#ffd6a3', sunI: 4.2, hemiSky: '#fff1e2', hemiGround: '#d6b79b', hemiI: 1.05, lampI: 9, exposure: 1.05, skyTop: '#f7dcc0', skyBottom: '#ffe9c9', shaft: 0.26 },
    dusk: { sun: '#ffb487', sunI: 2.6, hemiSky: '#f3dccd', hemiGround: '#b99580', hemiI: 0.85, lampI: 18, exposure: 1.1, skyTop: '#c9a4a2', skyBottom: '#f7c39b', shaft: 0.2 }
  };
  const L = LIGHT_PRESETS[opts.timeOfDay] || LIGHT_PRESETS.golden;

  const C = {
    accent: new THREE.Color(opts.accent),
    wall: new THREE.Color(opts.wall),
    wood: new THREE.Color(opts.wood),
    plush: new THREE.Color(opts.plush),
    cream: new THREE.Color('#FBF6EF'),
    sand: new THREE.Color('#E8D8CE'),
    ink: new THREE.Color('#2C2523')
  };

  /* ------------------------------------------------------------------------
     1. Renderer, scena, camera
     ------------------------------------------------------------------------ */
  const maxDPR = opts.isMobile ? 1.5 : 1.75;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDPR);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: dpr < 1.5,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false
  });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = L.exposure;
  renderer.setClearColor(C.wall, 1);
  renderer.shadowMap.enabled = !!opts.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // ombre statiche → aggiornate solo on-demand

  const scene = new THREE.Scene();
  scene.background = C.wall.clone().lerp(new THREE.Color('#ffffff'), 0.1);
  scene.fog = new THREE.Fog(scene.background, 9, 20);

  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 60);

  // Disposables
  const disposables = [];
  const track = (o) => (disposables.push(o), o);

  /* ------------------------------------------------------------------------
     2. Helpers: texture canvas, forme ad arco, geometrie arrotondate
     ------------------------------------------------------------------------ */
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.anisotropy = Math.min(8, maxAniso);
    return track(tex);
  }

  // PRNG deterministico: la stanza è identica ad ogni caricamento
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const hex = (c) => '#' + c.getHexString();
  const shade = (color, amt) => {
    const k = color.clone();
    if (amt >= 0) k.lerp(new THREE.Color('#ffffff'), amt);
    else k.lerp(new THREE.Color('#000000'), -amt);
    return hex(k);
  };

  /** Forma ad arco (semicerchio superiore) con base a y=0 */
  function archShape(w, h, shape = new THREE.Shape()) {
    const r = w / 2;
    shape.moveTo(-r, 0);
    shape.lineTo(-r, h - r);
    shape.absarc(0, h - r, r, Math.PI, 0, true);
    shape.lineTo(r, 0);
    shape.lineTo(-r, 0);
    return shape;
  }
  function archPath(w, h, ox = 0, oy = 0) {
    const r = w / 2;
    const p = new THREE.Path();
    p.moveTo(ox - r, oy);
    p.lineTo(ox + r, oy);
    p.lineTo(ox + r, oy + h - r);
    p.absarc(ox, oy + h - r, r, 0, Math.PI, false);
    p.lineTo(ox - r, oy);
    return p;
  }

  /** Box con spigoli arrotondati (extrude + bevel), centrato */
  function roundedBox(w, h, d, r, seg = 4) {
    const s = new THREE.Shape();
    const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
    s.moveTo(x, y - r);
    s.lineTo(x + ww, y - r);
    s.quadraticCurveTo(x + ww + r, y - r, x + ww + r, y);
    s.lineTo(x + ww + r, y + hh);
    s.quadraticCurveTo(x + ww + r, y + hh + r, x + ww, y + hh + r);
    s.lineTo(x, y + hh + r);
    s.quadraticCurveTo(x - r, y + hh + r, x - r, y + hh);
    s.lineTo(x - r, y);
    s.quadraticCurveTo(x - r, y - r, x, y - r);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.001, d - 2 * r),
      bevelEnabled: true,
      bevelThickness: r,
      bevelSize: r * 0.98,
      bevelSegments: seg,
      curveSegments: seg
    });
    g.translate(0, 0, -(d - 2 * r) / 2);
    g.computeVertexNormals();
    return track(g);
  }

  /** Solido di rotazione da profilo [[r,y], ...] */
  function lathe(points, seg = 40) {
    return track(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg));
  }

  function mesh(geo, mat, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  }

  /* ------------------------------------------------------------------------
     3. Texture procedurali
     ------------------------------------------------------------------------ */
  // Parquet in rovere chiaro a listoni
  const floorTex = canvasTexture(1024, 1024, (ctx, w, h) => {
    const base = new THREE.Color('#dcc3a1').lerp(C.wood, 0.35);
    const rows = 8, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rand() * 300;
      while (x < w) {
        const len = 260 + rand() * 360;
        const tint = (rand() - 0.5) * 0.12;
        ctx.fillStyle = shade(base, tint);
        ctx.fillRect(x, r * rh, len, rh);
        // venature
        ctx.globalAlpha = 0.09;
        for (let g = 0; g < 14; g++) {
          ctx.strokeStyle = rand() > 0.5 ? '#9c7a55' : '#f6e7d2';
          ctx.lineWidth = 0.6 + rand() * 1.6;
          ctx.beginPath();
          const gy = r * rh + rand() * rh;
          ctx.moveTo(x, gy);
          for (let k = 0; k <= len; k += 24) ctx.lineTo(x + k, gy + Math.sin(k * 0.02 + g) * 2.2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // giunto di testa
        ctx.fillStyle = 'rgba(90,60,40,0.35)';
        ctx.fillRect(x, r * rh, 2, rh);
        x += len;
      }
      ctx.fillStyle = 'rgba(90,60,40,0.4)';
      ctx.fillRect(0, r * rh, w, 2);
    }
  }, { repeat: [5, 5] });

  // Intonaco caldo (leggera grana)
  const plasterTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = hex(C.wall);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(120,90,70,0.035)';
      const s = 1 + rand() * 3;
      ctx.fillRect(rand() * w, rand() * h, s, s);
    }
  }, { repeat: [0.6, 0.6] });

  // Venatura legno chiaro per la culla
  const woodTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = hex(C.wood);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = rand() > 0.4 ? '#a7835c' : '#fff3e2';
      ctx.lineWidth = 0.5 + rand() * 2;
      ctx.beginPath();
      const y0 = rand() * h;
      ctx.moveTo(0, y0);
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y0 + Math.sin(x * 0.015 + i) * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { repeat: [2, 2] });

  // Tappeto tondo in lana: panna con bordo terracotta
  const rugTex = canvasTexture(1024, 1024, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2, R = w / 2;
    ctx.fillStyle = shade(C.sand, 0.45);
    ctx.fillRect(0, 0, w, h);
    const ring = (r0, r1, color) => {
      ctx.beginPath();
      ctx.arc(cx, cy, R * r1, 0, Math.PI * 2);
      ctx.arc(cx, cy, R * r0, 0, Math.PI * 2, true);
      ctx.fillStyle = color;
      ctx.fill();
    };
    ring(0.86, 0.95, hex(C.accent));
    ring(0.78, 0.8, shade(C.accent, 0.35));
    // punti decorativi
    ctx.fillStyle = shade(C.accent, 0.15);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * 0.7, cy + Math.sin(a) * R * 0.7, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // trama lana
    for (let i = 0; i < 26000; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(80,50,30,0.05)';
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
  });

  // Cielo / giardino fuori dalla finestra
  const skyTex = canvasTexture(512, 768, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, L.skyTop);
    g.addColorStop(0.65, L.skyBottom);
    g.addColorStop(1, '#fff7ea');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // alone del sole
    const sg = ctx.createRadialGradient(w * 0.7, h * 0.35, 10, w * 0.7, h * 0.35, w * 0.8);
    sg.addColorStop(0, 'rgba(255,250,235,1)');
    sg.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    // chiome sfocate di alberi
    if ('filter' in ctx) ctx.filter = 'blur(18px)';
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(${150 + rand() * 40},${165 + rand() * 30},${120 + rand() * 30},0.55)`;
      ctx.beginPath();
      ctx.arc(rand() * w, h * (0.72 + rand() * 0.3), 60 + rand() * 90, 0, Math.PI * 2);
      ctx.fill();
    }
    if ('filter' in ctx) ctx.filter = 'none';
  }, { repeat: [1, 1] });
  skyTex.wrapS = skyTex.wrapT = THREE.ClampToEdgeWrapping;

  // Sprite morbido per il pulviscolo
  const dotTex = canvasTexture(64, 64, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });

  /* ------------------------------------------------------------------------
     4. Materiali PBR
     ------------------------------------------------------------------------ */
  const M = {
    floor: track(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.62, metalness: 0 })),
    wall: track(new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 })),
    trim: track(new THREE.MeshStandardMaterial({ color: '#fbf7f1', roughness: 0.6 })),
    wood: track(new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.5 })),
    woodDark: track(new THREE.MeshStandardMaterial({ color: new THREE.Color('#b99069'), roughness: 0.55 })),
    accent: track(new THREE.MeshStandardMaterial({ color: C.accent, roughness: 0.92 })),
    accentSoft: track(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(shade(C.accent, 0.3)), roughness: 0.95, sheen: 1, sheenRoughness: 0.7, sheenColor: new THREE.Color('#ffe3d6') })),
    linen: track(new THREE.MeshPhysicalMaterial({ color: C.cream, roughness: 0.92, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff') })),
    sandFabric: track(new THREE.MeshPhysicalMaterial({ color: C.sand, roughness: 0.95, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color('#fff4ec') })),
    plush: track(new THREE.MeshPhysicalMaterial({ color: C.plush, roughness: 1, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color('#fff6ee') })),
    plushLight: track(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(shade(C.plush, 0.45)), roughness: 1, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') })),
    eye: track(new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.15, metalness: 0.1 })),
    rug: track(new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 })),
    ceramic: track(new THREE.MeshStandardMaterial({ color: '#f3ede4', roughness: 0.35 })),
    terracottaPot: track(new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(C.accent, -0.05)), roughness: 0.85 })),
    leaf: track(new THREE.MeshStandardMaterial({ color: '#7f8f68', roughness: 0.7, side: THREE.DoubleSide })),
    rattan: track(new THREE.MeshStandardMaterial({ color: '#d2b48c', roughness: 0.8, side: THREE.DoubleSide })),
    bulb: track(new THREE.MeshStandardMaterial({ color: '#fff3dc', emissive: '#ffd9a0', emissiveIntensity: 3 })),
    sky: track(new THREE.MeshBasicMaterial({ map: skyTex, fog: false })),
    string: track(new THREE.LineBasicMaterial({ color: '#cbb8a6', transparent: true, opacity: 0.8 })),
    book1: track(new THREE.MeshStandardMaterial({ color: '#d9c2ab', roughness: 0.8 })),
    book2: track(new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(C.accent, 0.15)), roughness: 0.8 })),
    book3: track(new THREE.MeshStandardMaterial({ color: '#efe6da', roughness: 0.8 }))
  };

  /* ------------------------------------------------------------------------
     5. Stanza: pavimento, pareti, finestra ad arco
     ------------------------------------------------------------------------ */
  const room = new THREE.Group();
  scene.add(room);

  const WALL_Z = -2.6;
  const WIN = { x: 2.55, y: 0.85, w: 1.15, h: 1.95 }; // finestra ad arco
  const WALL_H = 3.8;

  // Pavimento
  const floor = mesh(track(new THREE.PlaneGeometry(12, 12)), M.floor, { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 1;
  room.add(floor);

  // Parete di fondo con foro ad arco (spessore 0.22)
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-6, 0);
  wallShape.lineTo(6, 0);
  wallShape.lineTo(6, WALL_H);
  wallShape.lineTo(-6, WALL_H);
  wallShape.lineTo(-6, 0);
  wallShape.holes.push(archPath(WIN.w, WIN.h, WIN.x, WIN.y));
  const backWall = mesh(track(new THREE.ExtrudeGeometry(wallShape, { depth: 0.22, bevelEnabled: false, curveSegments: 36 })), M.wall);
  backWall.position.z = WALL_Z - 0.22;
  room.add(backWall);

  // Pareti laterali
  const sideGeo = track(new THREE.PlaneGeometry(8, WALL_H));
  const leftWall = mesh(sideGeo, M.wall, { cast: false });
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-4.2, WALL_H / 2, 1.4);
  room.add(leftWall);
  const rightWall = mesh(sideGeo, M.wall, { cast: false });
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(4.4, WALL_H / 2, 1.4);
  room.add(rightWall);

  // Battiscopa
  const skirting = mesh(track(new THREE.BoxGeometry(12, 0.09, 0.025)), M.trim, { cast: false });
  skirting.position.set(0, 0.045, WALL_Z + 0.012);
  room.add(skirting);

  // Telaio finestra ad arco + montanti
  const frameShape = archShape(WIN.w + 0.12, WIN.h + 0.06);
  frameShape.holes.push(archPath(WIN.w - 0.04, WIN.h - 0.02, 0, 0.02));
  const frame = mesh(track(new THREE.ExtrudeGeometry(frameShape, { depth: 0.06, bevelEnabled: false, curveSegments: 36 })), M.trim);
  frame.position.set(WIN.x, WIN.y - 0.03, WALL_Z - 0.02);
  room.add(frame);
  const mullionV = mesh(track(new THREE.BoxGeometry(0.035, WIN.h - 0.04, 0.035)), M.trim);
  mullionV.position.set(WIN.x, WIN.y + (WIN.h - 0.04) / 2, WALL_Z - 0.12);
  room.add(mullionV);
  const mullionH = mesh(track(new THREE.BoxGeometry(WIN.w - 0.04, 0.035, 0.035)), M.trim);
  mullionH.position.set(WIN.x, WIN.y + WIN.h - WIN.w / 2, WALL_Z - 0.12);
  room.add(mullionH);
  const sill = mesh(roundedBox(WIN.w + 0.3, 0.05, 0.22, 0.015), M.trim);
  sill.position.set(WIN.x, WIN.y - 0.02, WALL_Z + 0.06);
  room.add(sill);

  // Vista esterna
  const sky = new THREE.Mesh(track(new THREE.PlaneGeometry(3.2, 3.6)), M.sky);
  sky.position.set(WIN.x - 0.3, WIN.y + 1.0, WALL_Z - 1.4);
  room.add(sky);

  // Arco terracotta dipinto (firma del brand) dietro la culla
  const paintedArch = mesh(track(new THREE.ShapeGeometry(archShape(2.0, 2.35), 48)), M.accent, { cast: false });
  paintedArch.position.set(1.0, 0.0, WALL_Z + 0.004);
  room.add(paintedArch);

  /* ------------------------------------------------------------------------
     6. Culla in legno chiaro con testate ad arco
     ------------------------------------------------------------------------ */
  const crib = new THREE.Group();
  crib.position.set(1.0, 0, -1.65);
  crib.rotation.y = -0.08;
  room.add(crib);

  const CL = 1.3, CD = 0.72, CH = 1.02;
  const RAIL_TOP = 0.86, BASE_Y = 0.3;

  // Testate: pannello ad arco con foro circolare
  const headShape = archShape(CD, CH);
  const hole = new THREE.Path();
  hole.absarc(0, CH - CD / 2, 0.1, 0, Math.PI * 2, true);
  headShape.holes.push(hole);
  const headGeo = track(new THREE.ExtrudeGeometry(headShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 40 }));
  headGeo.translate(0, 0, -0.025);
  [-1, 1].forEach((side) => {
    const head = mesh(headGeo, M.wood);
    head.rotation.y = Math.PI / 2;
    head.position.x = (side * CL) / 2;
    crib.add(head);
  });

  // Corrimani e traverse sui lati lunghi
  const railGeo = track(new THREE.CylinderGeometry(0.022, 0.022, CL, 16));
  railGeo.rotateZ(Math.PI / 2);
  const slatGeo = track(new THREE.CylinderGeometry(0.012, 0.012, RAIL_TOP - BASE_Y, 10));
  [-1, 1].forEach((side) => {
    const z = (side * CD) / 2 * 0.94;
    const top = mesh(railGeo, M.wood);
    top.position.set(0, RAIL_TOP, z);
    crib.add(top);
    const bottom = mesh(railGeo, M.wood);
    bottom.position.set(0, BASE_Y, z);
    crib.add(bottom);
    for (let x = -CL / 2 + 0.09; x <= CL / 2 - 0.08; x += 0.082) {
      const s = mesh(slatGeo, M.wood);
      s.position.set(x, (RAIL_TOP + BASE_Y) / 2, z);
      crib.add(s);
    }
  });

  // Fondo, materasso, lenzuolo, cuscino, coperta piegata
  const base = mesh(track(new THREE.BoxGeometry(CL, 0.03, CD * 0.92)), M.woodDark);
  base.position.y = BASE_Y;
  crib.add(base);
  const mattress = mesh(roundedBox(CL - 0.06, 0.13, CD * 0.88, 0.04), M.linen);
  mattress.position.y = BASE_Y + 0.08;
  crib.add(mattress);
  const pillow = mesh(roundedBox(0.36, 0.07, 0.24, 0.03), M.linen);
  pillow.position.set(-CL / 2 + 0.26, BASE_Y + 0.18, 0);
  pillow.rotation.z = 0.06;
  crib.add(pillow);
  const blanket = mesh(roundedBox(0.62, 0.035, CD * 0.9, 0.015), M.accentSoft);
  blanket.position.set(0.24, BASE_Y + 0.165, 0);
  crib.add(blanket);
  const fold = mesh(roundedBox(0.14, 0.04, CD * 0.9, 0.018), M.accentSoft);
  fold.position.set(-0.04, BASE_Y + 0.19, 0);
  crib.add(fold);
  // piccolo coniglietto nella culla
  const bunny = new THREE.Group();
  const bBody = mesh(track(new THREE.SphereGeometry(0.065, 24, 16)), M.plushLight);
  bBody.scale.set(1, 0.9, 1);
  bunny.add(bBody);
  const bHead = mesh(track(new THREE.SphereGeometry(0.048, 24, 16)), M.plushLight);
  bHead.position.set(0, 0.085, 0);
  bunny.add(bHead);
  const earGeo = track(new THREE.CapsuleGeometry(0.014, 0.07, 4, 10));
  [-1, 1].forEach((s) => {
    const e = mesh(earGeo, M.plushLight);
    e.position.set(s * 0.022, 0.16, 0);
    e.rotation.z = -s * 0.25;
    bunny.add(e);
  });
  bunny.position.set(0.42, BASE_Y + 0.25, 0.12);
  crib.add(bunny);

  /* Giostrina (mobile) agganciata alla testata */
  const mobileArmMat = M.woodDark;
  const pole = mesh(track(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 10)), mobileArmMat);
  pole.position.set(CL / 2 - 0.05, RAIL_TOP + 0.45, CD / 2 - 0.1);
  crib.add(pole);
  const arm = mesh(track(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 10)), mobileArmMat);
  arm.rotation.z = Math.PI / 2 + 0.05;
  arm.position.set(CL / 2 - 0.36, RAIL_TOP + 0.91, CD / 2 - 0.1);
  crib.add(arm);

  const mobile = new THREE.Group();
  mobile.position.set(CL / 2 - 0.66, RAIL_TOP + 0.89, CD / 2 - 0.1);
  crib.add(mobile);
  const ring = mesh(track(new THREE.TorusGeometry(0.17, 0.006, 8, 48)), mobileArmMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.06;
  mobile.add(ring);
  const pendantMats = [M.accent, M.sandFabric, M.linen, M.accentSoft, M.plush];
  const pendantGeos = [
    track(new THREE.SphereGeometry(0.035, 20, 14)),
    track(new THREE.TorusGeometry(0.03, 0.012, 10, 24, Math.PI * 1.3)),
    track(new THREE.OctahedronGeometry(0.035, 0)),
    track(new THREE.SphereGeometry(0.028, 20, 14))
  ];
  const pendants = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const len = 0.12 + (i % 3) * 0.07;
    const px = Math.cos(a) * 0.17, pz = Math.sin(a) * 0.17;
    const lineGeo = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px, -0.06, pz), new THREE.Vector3(px, -0.06 - len, pz)]));
    mobile.add(new THREE.Line(lineGeo, M.string));
    const p = mesh(pendantGeos[i % pendantGeos.length], pendantMats[i % pendantMats.length], { cast: false });
    p.position.set(px, -0.06 - len - 0.03, pz);
    p.userData.phase = i * 1.3;
    mobile.add(p);
    pendants.push(p);
  }
  const mobileString = new THREE.Line(
    track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.06, 0)])),
    M.string
  );
  mobile.add(mobileString);

  /* ------------------------------------------------------------------------
     7. Tappeto, peluche, pouf
     ------------------------------------------------------------------------ */
  const rug = mesh(track(new THREE.CircleGeometry(1.35, 72)), M.rug, { cast: false });
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.75, 0.006, -0.55);
  room.add(rug);

  // Orsetto peluche tondo
  const bear = new THREE.Group();
  const sph = (r) => track(new THREE.SphereGeometry(r, 40, 28));
  const body = mesh(sph(0.21), M.plush);
  body.scale.set(1, 0.95, 0.9);
  body.position.y = 0.2;
  bear.add(body);
  const belly = mesh(sph(0.13), M.plushLight);
  belly.scale.set(1, 1.05, 0.5);
  belly.position.set(0, 0.19, 0.13);
  bear.add(belly);
  const head = mesh(sph(0.16), M.plush);
  head.position.set(0, 0.47, 0.01);
  bear.add(head);
  const snout = mesh(sph(0.06), M.plushLight);
  snout.scale.set(1.15, 0.85, 0.8);
  snout.position.set(0, 0.44, 0.145);
  bear.add(snout);
  const nose = mesh(sph(0.018), M.eye, { cast: false });
  nose.scale.set(1.3, 0.9, 0.8);
  nose.position.set(0, 0.46, 0.192);
  bear.add(nose);
  [-1, 1].forEach((s) => {
    const ear = mesh(sph(0.055), M.plush);
    ear.scale.set(1, 1, 0.6);
    ear.position.set(s * 0.115, 0.585, -0.01);
    bear.add(ear);
    const inner = mesh(sph(0.032), M.accentSoft, { cast: false });
    inner.scale.set(1, 1, 0.4);
    inner.position.set(s * 0.115, 0.585, 0.02);
    bear.add(inner);
    const eye = mesh(sph(0.016), M.eye, { cast: false });
    eye.position.set(s * 0.055, 0.5, 0.142);
    bear.add(eye);
    const armM = mesh(sph(0.065), M.plush);
    armM.scale.set(0.8, 1.2, 0.8);
    armM.position.set(s * 0.18, 0.22, 0.07);
    armM.rotation.z = s * 0.5;
    bear.add(armM);
    const foot = mesh(sph(0.075), M.plush);
    foot.scale.set(0.9, 0.75, 1.1);
    foot.position.set(s * 0.11, 0.055, 0.15);
    bear.add(foot);
    const pad = mesh(sph(0.045), M.plushLight, { cast: false });
    pad.scale.set(0.9, 0.9, 0.3);
    pad.position.set(s * 0.11, 0.06, 0.225);
    bear.add(pad);
  });
  // fiocco terracotta
  const bow = mesh(track(new THREE.TorusGeometry(0.11, 0.022, 10, 32)), M.accent);
  bow.rotation.x = Math.PI / 2;
  bow.position.y = 0.355;
  bear.add(bow);
  bear.position.set(0.2, 0.006, -0.35);
  bear.rotation.y = 0.35;
  room.add(bear);

  // Pouf in maglia
  const pouf = mesh(
    lathe([[0, 0], [0.3, 0], [0.36, 0.04], [0.38, 0.17], [0.36, 0.3], [0.3, 0.34], [0, 0.34]], 48),
    M.sandFabric
  );
  pouf.position.set(2.45, 0, 0.15);
  room.add(pouf);

  // Cubi in legno sul tappeto
  const cubeGeo = roundedBox(0.11, 0.11, 0.11, 0.012, 2);
  const cubeMats = [M.wood, M.accent, M.linen];
  [[0.75, 0.055, 0.1, 0.2], [0.88, 0.055, 0.02, -0.3], [0.8, 0.165, 0.06, 0.6]].forEach(([x, y, z, r], i) => {
    const c = mesh(cubeGeo, cubeMats[i]);
    c.position.set(x, y, z);
    c.rotation.y = r;
    room.add(c);
  });

  /* ------------------------------------------------------------------------
     8. Mensola, libri, vaso, pianta, lampada a sospensione
     ------------------------------------------------------------------------ */
  const shelf = mesh(roundedBox(1.0, 0.035, 0.22, 0.01), M.wood);
  shelf.position.set(-0.95, 1.55, WALL_Z + 0.11);
  room.add(shelf);
  [[-1.32, 0.2, M.book1, 0.03], [-1.27, 0.18, M.book2, 0.03], [-1.22, 0.22, M.book3, -0.12]].forEach(([x, h, m, rz]) => {
    const b = mesh(track(new THREE.BoxGeometry(0.04, h, 0.15)), m);
    b.position.set(x, 1.57 + h / 2, WALL_Z + 0.11);
    b.rotation.z = rz;
    room.add(b);
  });
  const vase = mesh(lathe([[0, 0], [0.05, 0], [0.07, 0.06], [0.06, 0.13], [0.03, 0.17], [0.035, 0.2], [0, 0.2]], 32), M.ceramic);
  vase.position.set(-0.7, 1.568, WALL_Z + 0.11);
  room.add(vase);
  // rametti secchi nel vaso
  for (let i = 0; i < 3; i++) {
    const stem = mesh(track(new THREE.CylinderGeometry(0.003, 0.004, 0.32, 5)), M.woodDark, { cast: false });
    stem.position.set(-0.7 + (i - 1) * 0.02, 1.85, WALL_Z + 0.11);
    stem.rotation.z = (i - 1) * 0.22;
    room.add(stem);
  }
  const ball = mesh(track(new THREE.SphereGeometry(0.05, 24, 16)), M.sandFabric);
  ball.position.set(-0.5, 1.618, WALL_Z + 0.12);
  room.add(ball);

  // Pianta in vaso di terracotta
  const plant = new THREE.Group();
  const pot = mesh(lathe([[0, 0], [0.16, 0], [0.2, 0.36], [0.215, 0.38], [0.215, 0.4], [0, 0.4]], 36), M.terracottaPot);
  plant.add(pot);
  const leafGeo = track(new THREE.SphereGeometry(0.16, 16, 10));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
    const leaf = mesh(leafGeo, M.leaf);
    leaf.scale.set(0.5, 0.08, 1.4);
    const tilt = 0.5 + rand() * 0.5;
    leaf.position.set(Math.cos(a) * 0.12, 0.55 + rand() * 0.45, Math.sin(a) * 0.12);
    leaf.rotation.set(tilt, -a + Math.PI / 2, 0, 'YXZ');
    plant.add(leaf);
  }
  plant.position.set(-2.55, 0, -1.9);
  room.add(plant);

  // Lampada a sospensione in rattan
  const LAMP = new THREE.Vector3(-0.25, 2.55, -0.9);
  const cord = new THREE.Line(
    track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(LAMP.x, 4, LAMP.z), new THREE.Vector3(LAMP.x, LAMP.y + 0.2, LAMP.z)])),
    track(new THREE.LineBasicMaterial({ color: '#8a7466' }))
  );
  room.add(cord);
  const dome = mesh(track(new THREE.SphereGeometry(0.28, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)), M.rattan, { cast: false });
  dome.position.copy(LAMP);
  room.add(dome);
  const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 20, 14)), M.bulb);
  bulb.position.copy(LAMP).add(new THREE.Vector3(0, -0.02, 0));
  room.add(bulb);

  /* ------------------------------------------------------------------------
     9. Luci: sole dalla finestra, cielo, lampada, environment PBR
     ------------------------------------------------------------------------ */
  const hemi = new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiI);
  scene.add(hemi);

  const WIN_CENTER = new THREE.Vector3(WIN.x, WIN.y + WIN.h * 0.5, WALL_Z);
  const sunDir = new THREE.Vector3(-0.42, -0.47, 0.77).normalize(); // direzione dei raggi
  const tFloor = WIN_CENTER.y / -sunDir.y;
  const SUN_HIT = WIN_CENTER.clone().addScaledVector(sunDir, tFloor);

  const sun = new THREE.DirectionalLight(L.sun, L.sunI);
  sun.position.copy(WIN_CENTER).addScaledVector(sunDir, -9);
  sun.target.position.copy(SUN_HIT);
  scene.add(sun, sun.target);
  if (opts.shadows) {
    sun.castShadow = true;
    const size = opts.isMobile ? 1024 : 2048;
    sun.shadow.mapSize.set(size, size);
    const cam = sun.shadow.camera;
    cam.left = -3.6; cam.right = 3.6; cam.top = 3.6; cam.bottom = -3.6;
    cam.near = 2; cam.far = 20;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
  }

  // Luce di riempimento morbida dalla finestra (simula il rimbalzo)
  const fill = new THREE.PointLight(L.sun, 4, 7, 2);
  fill.position.set(WIN.x - 0.6, 1.7, WALL_Z + 0.9);
  scene.add(fill);

  // Lampada (luce calda e vicina)
  const lamp = new THREE.PointLight('#ffcf94', L.lampI, 6, 2);
  lamp.position.copy(LAMP).add(new THREE.Vector3(0, -0.12, 0));
  if (opts.shadows && !opts.isMobile) {
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(512, 512);
    lamp.shadow.radius = 6;
    lamp.shadow.bias = -0.002;
  }
  scene.add(lamp);

  // Environment map procedurale (riflessi PBR morbidi)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envBox = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(L.hemiSky).multiplyScalar(0.55), side: THREE.BackSide })
  );
  envScene.add(envBox);
  const envWindow = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(L.sun).multiplyScalar(4) }));
  envWindow.position.set(2, 1, -4.9);
  envScene.add(envWindow);
  const envFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#c9a888').multiplyScalar(0.5) }));
  envFloor.rotation.x = -Math.PI / 2;
  envFloor.position.y = -4.9;
  envScene.add(envFloor);
  const envRT = pmrem.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55; // r163+ (ignorato in versioni precedenti)
  envScene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  pmrem.dispose();
  track(envRT);

  /* ------------------------------------------------------------------------
     10. Fascio di luce volumetrico (fake) + pulviscolo
     ------------------------------------------------------------------------ */
  const shaftLen = WIN_CENTER.distanceTo(SUN_HIT);
  const shaftGeo = track(new THREE.CylinderGeometry(WIN.w * 0.48, WIN.w * 0.95, shaftLen, 40, 1, true));
  const shaftMat = track(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(L.sun) },
      uIntensity: { value: L.shaft },
      uTime: { value: 0 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float along = smoothstep(0.0, 0.85, vUv.y) * (1.0 - smoothstep(0.96, 1.0, vUv.y) * 0.4);
        float flicker = 0.92 + 0.08 * sin(uTime * 0.7 + vUv.x * 12.0);
        float a = edge * along * uIntensity * flicker;
        gl_FragColor = vec4(uColor * a, a);
      }`
  }));
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.copy(WIN_CENTER).lerp(SUN_HIT, 0.5);
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir.clone().negate());
  shaft.renderOrder = 10;
  scene.add(shaft);

  let dust = null;
  if (opts.dust) {
    const COUNT = opts.isMobile ? 220 : 520;
    const pos = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // distribuiti attorno al fascio di luce
      const t = rand();
      const p = WIN_CENTER.clone().lerp(SUN_HIT, t);
      pos[i * 3] = p.x + (rand() - 0.5) * 1.4;
      pos[i * 3 + 1] = Math.max(0.1, p.y + (rand() - 0.5) * 1.2);
      pos[i * 3 + 2] = p.z + (rand() - 0.5) * 1.2;
      seeds[i] = rand() * 100;
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const dustMat = track(new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: dotTex },
        uSize: { value: 22 * dpr },
        uColor: { value: new THREE.Color('#fff1d6') }
      },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uSize; varying float vA;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.13 + aSeed) * 0.12;
          p.y += sin(uTime * 0.09 + aSeed * 1.7) * 0.16 + mod(uTime * 0.012 + aSeed, 0.3) - 0.15;
          p.z += cos(uTime * 0.11 + aSeed * 0.6) * 0.12;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (0.35 + fract(aSeed) * 0.65) / -mv.z;
          vA = 0.35 + 0.65 * abs(sin(uTime * 0.6 + aSeed * 3.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uColor; varying float vA;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * vA * 0.75;
          gl_FragColor = vec4(uColor * a, a);
        }`
    }));
    dust = new THREE.Points(g, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 11;
    scene.add(dust);
  }

  /* ------------------------------------------------------------------------
     11. Camera rig: framing responsive + fly-through + orbit morbido
     ------------------------------------------------------------------------ */
  const RIG = {
    desktop: {
      fov: 38,
      from: new THREE.Vector3(-0.35, 1.4, 3.75),
      to: new THREE.Vector3(0.7, 1.12, 0.95),     // fine fly-through (scroll)
      lookFrom: new THREE.Vector3(0.55, 1.0, -1.3),
      lookTo: new THREE.Vector3(1.05, 0.78, -1.6),
      intro: new THREE.Vector3(-1.4, 2.1, 5.6)
    },
    mobile: {
      fov: 54,
      from: new THREE.Vector3(0.85, 1.6, 3.2),
      to: new THREE.Vector3(1.0, 1.25, 0.95),
      lookFrom: new THREE.Vector3(1.0, 1.05, -1.4),
      lookTo: new THREE.Vector3(1.0, 0.8, -1.6),
      intro: new THREE.Vector3(0.2, 2.4, 5.0)
    }
  };
  let rig = RIG.desktop;

  const state = {
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    mx: 0, my: 0, scroll: 0,
    intro: opts.reducedMotion ? 1 : 0,
    bearBounce: 0,
    mobileSpin: 0
  };
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  const camK = opts.cameraIntensity / 5;      // 0..2
  const travelK = opts.scrollTravel / 10;     // 0..1
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function computeTarget(time) {
    const s = easeInOut(Math.min(1, state.scroll * 1.15)) * travelK;
    tmpPos.lerpVectors(rig.from, rig.to, s);
    tmpLook.lerpVectors(rig.lookFrom, rig.lookTo, s);

    // intro: arrivo morbido della camera dall'alto/indietro
    if (state.intro < 1) {
      const k = 1 - easeOut(state.intro);
      tmpPos.lerp(rig.intro, k);
    }

    // orbit morbido sul puntatore (parallasse) + "respiro" automatico
    const breathe = opts.autoOrbit && !opts.reducedMotion ? 1 : 0;
    const ox = state.mx * 0.42 * camK + Math.sin(time * 0.17) * 0.12 * breathe;
    const oy = -state.my * 0.2 * camK + Math.sin(time * 0.23) * 0.04 * breathe;
    tmpPos.x += ox;
    tmpPos.y += oy;
    tmpLook.x += ox * 0.25;
    tmpLook.y += oy * 0.2;
  }

  function resize(width, height) {
    const aspect = width / Math.max(1, height);
    rig = aspect < 0.95 ? RIG.mobile : RIG.desktop;
    camera.fov = rig.fov + (aspect < 1.4 && aspect >= 0.95 ? 6 : 0);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.shadowMap.needsUpdate = true;
  }

  /* ------------------------------------------------------------------------
     12. Interazione: click sul peluche (rimbalzo) e sulla giostrina (spin)
     ------------------------------------------------------------------------ */
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.01; // i fili della giostrina non devono "catturare" il click
  const ndc = new THREE.Vector2();
  function pointerDown(nx, ny) {
    ndc.set(nx, ny);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([bear, mobile, crib], true);
    if (!hits.length) return false;
    let o = hits[0].object;
    while (o) {
      if (o === bear) { state.bearBounce = 1; return true; }
      if (o === mobile) { state.mobileSpin = 1; return true; }
      if (o === crib) { state.mobileSpin = 0.6; return true; }
      o = o.parent;
    }
    return false;
  }

  /* ------------------------------------------------------------------------
     13. Render loop (chiamato dal web component)
     ------------------------------------------------------------------------ */
  // Prima passata: compila shader e calcola ombre una sola volta
  resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  computeTarget(0);
  state.pos.copy(tmpPos);
  state.look.copy(tmpLook);
  camera.position.copy(state.pos);
  camera.lookAt(state.look);
  renderer.shadowMap.needsUpdate = true;
  renderer.compile(scene, camera);

  let frameAvg = 16.7;
  let lowFrames = 0;

  function render(dt, time, input) {
    if (input) {
      state.mx = input.mx;
      state.my = input.my;
      state.scroll = input.scroll;
    }
    const d = Math.min(dt, 0.05);

    if (!opts.reducedMotion) {
      state.intro = Math.min(1, state.intro + d / 2.6);
    }

    // Camera: smorzamento critico (frame-rate indipendente)
    computeTarget(opts.reducedMotion ? 0 : time);
    const k = 1 - Math.exp(-d * 3.2);
    state.pos.lerp(tmpPos, opts.reducedMotion ? 1 : k);
    state.look.lerp(tmpLook, opts.reducedMotion ? 1 : k);
    camera.position.copy(state.pos);
    camera.lookAt(state.look);

    if (!opts.reducedMotion) {
      // Giostrina: rotazione lenta + spin al click
      state.mobileSpin = Math.max(0, state.mobileSpin - d * 0.35);
      mobile.rotation.y += d * (0.25 + state.mobileSpin * 3);
      for (const p of pendants) {
        p.rotation.y += d * 0.8;
        p.position.y += Math.sin(time * 1.4 + p.userData.phase) * 0.0004;
      }
      // Peluche: respiro + rimbalzo "squish" al click
      state.bearBounce = Math.max(0, state.bearBounce - d * 1.4);
      const b = Math.sin((1 - state.bearBounce) * Math.PI * 3) * state.bearBounce;
      const breath = Math.sin(time * 1.6) * 0.006;
      bear.scale.set(1 + b * 0.08 - breath, 1 - b * 0.1 + breath, 1 + b * 0.08 - breath);
      bear.position.y = 0.006 + Math.max(0, b) * 0.12;
      if (state.bearBounce > 0 && opts.shadows) renderer.shadowMap.needsUpdate = true; // ombra segue il rimbalzo

      shaftMat.uniforms.uTime.value = time;
      if (dust) dust.material.uniforms.uTime.value = time;
    }

    renderer.render(scene, camera);

    // Qualità adattiva: se il device fatica, riduce il pixel ratio
    frameAvg = frameAvg * 0.95 + dt * 1000 * 0.05;
    if (frameAvg > 24 && dpr > 1) {
      if (++lowFrames > 90) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        renderer.shadowMap.needsUpdate = true;
        lowFrames = 0;
      }
    } else {
      lowFrames = 0;
    }
  }

  function dispose() {
    disposables.forEach((d) => d && d.dispose && d.dispose());
    Object.values(M).forEach((m) => m.dispose());
    scene.traverse((o) => {
      if (o.geometry && !disposables.includes(o.geometry)) o.geometry.dispose();
    });
    renderer.dispose();
  }

  return { render, resize, dispose, pointerDown, renderer, scene, camera };
}

export default createHeroScene;
