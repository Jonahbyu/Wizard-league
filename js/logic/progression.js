// ===== mapCanvas.js =====
// ─── MAP CANVAS — Pixel art path map with animated player movement ────────────

// ═══ NODE SPRITES (12-col pixel art) ══════════════════════════════════════════
// Campfire: log base + animated flame (flame rows at top, drawn separately)
const MAP_SPRITE_CAMPFIRE_BASE = [
  '............',
  '............',
  '............',
  '....4444....',
  '...444444...',
  '..33333333..',
  '.3333333333.',
  '333...333.33',
  '333...333.33',
  '23....3..32.',
];
// Flame rows overlaid on top (animated color per frame)
const MAP_SPRITE_CAMPFIRE_FLAME = [
  '....3111....',
  '...311113...',
  '..31111113..',
  '..31111113..',
  '...311113...',
  '....3113....',
];

// Shop: market stall with awning and counter
const MAP_SPRITE_SHOP = [
  '111111111111',
  '122222222221',
  '111111111111',
  '1...1....1.1',
  '1...1....1.1',
  '1111111111..',
  '2222222222..',
  '1111111111..',
  '1...........',
  '1...........',
];

// Gym: greek temple with pillars
const MAP_SPRITE_GYM = [
  '111111111111',
  '111111111111',
  '.1111111111.',
  '..11111111..',
  '...111111...',
  '...1.11.1...',
  '...1.11.1...',
  '...1.11.1...',
  '...1.11.1...',
  '1111111111..',
];

const MAP_ICON_PLAYER = [
  '....hh..',
  '...hhhh.',
  '...ssss.',
  '...1111.',
  '..111111',
  '..111111',
  '...1111.',
  '...bb.b.',
];

// ═══ STATE ════════════════════════════════════════════════════════════════════
let _mapNodes      = [];     // { x, y, type, enc, color, sprites[] }
let _mapPlayerX    = 0;
let _mapPlayerY    = 0;
let _mapOriginX    = 0;
let _mapOriginY    = 0;
let _mapAnimTarget = null;   // { x, y, enc }
let _mapAnimT      = 0;
const MAP_ANIM_FRAMES = 72;
let _mapRAF        = null;
let _mapHovered    = -1;     // index of hovered node
let _mapCanvas     = null;

// ═══ SETUP ════════════════════════════════════════════════════════════════════
function showMapCanvas(nodes) {
  _mapNodes = nodes;
  _mapAnimTarget = null;
  _mapAnimT = 0;
  _mapHovered = -1;
  _starCache = null; // invalidate star cache when canvas resizes
  _clouds.length = 0; // reset clouds for new canvas size
  _lastCloudTick = 0;

  const canvas = document.getElementById('map-canvas');
  if (!canvas) return;
  _mapCanvas = canvas;

  // Canvas dimensions already set by _buildAndShowCanvas — just read them
  // Player starts at bottom center
  _mapOriginX = _mapPlayerX = Math.round(canvas.width * 0.5);
  _mapOriginY = _mapPlayerY = Math.round(canvas.height * 0.87);

  // Event wiring
  canvas.onclick      = _mapClick;
  canvas.onmousemove  = _mapHover;
  canvas.onmouseleave = () => { _mapHovered = -1; };

  _startMapLoop();
}

function stopMapCanvas() {
  if (_mapRAF) { cancelAnimationFrame(_mapRAF); _mapRAF = null; }
  if (_mapCanvas) {
    _mapCanvas.onclick     = null;
    _mapCanvas.onmousemove = null;
    _mapCanvas.onmouseleave = null;
  }
}

// ═══ NODE BUILDER (called from showMap in map.js) ════════════════════════════
// Returns a node array ready for showMapCanvas()
function buildMapNodes(encounters, specials, canvasW, canvasH) {
  const W = canvasW, H = canvasH;
  const horizY = H * 0.45;
  // Ground surface Y at x — follows gentle terrain rolls
  const gY = (x) => horizY + (H - horizY) * 0.22
    + Math.sin(x * 0.019 + 1.2) * (H - horizY) * 0.055
    + Math.sin(x * 0.009 + 0.5) * (H - horizY) * 0.09
    + Math.sin(x * 0.047 + 2.1) * (H - horizY) * 0.028;
  const nodes = [];

  // ── Combat nodes: lower foreground ──────────────────────────────────────
  const combatXFracs = encounters.length === 1 ? [0.5] : [0.22, 0.76];
  encounters.forEach((enc, i) => {
    const nx = Math.round(W * combatXFracs[i]);
    const ny = Math.round(gY(nx));
    // _isSpecial: campfire or shop replacing this slot
    if(enc._isSpecial) {
      const spColor = enc._specialType === 'campfire' ? '#d4822a' : '#2aaa7a';
      const spLabel = enc._specialType === 'campfire' ? 'Campfire' : 'Shop';
      nodes.push({ x: nx, y: ny, type: enc._specialType, enc, color: spColor, sprites: [], label: spLabel });
      return;
    }
    const nextSlot = zoneBattleCount + 1;
    const slotReward = enc._rewardType || getZoneRewardType(nextSlot, currentGymIdx);
    const _rewardNodeCfg = {
      primary_spell: { label:'Starting Spell', color:'#c080ff', icon:'✦'  },
      spell:         { label:'Spell Reward',   color:'#a080ff', icon:'📜' },
      incantation:   { label:'Incantation',    color:'#e08030', icon:'📜' },
      minor:         { label:'Pick Up',        color:'#c8a060', icon:'💰' },
      major:         { label:'Power Up',       color:'#e8d060', icon:'⚡' },
    }[slotReward] || { label:'Battle', color:'#888888', icon:'⚔' };
    nodes.push({
      x: nx, y: ny,
      type: enc.isPack ? 'pack' : 'combat',
      enc, sprites: [],
      color: _rewardNodeCfg.color,
      label: _rewardNodeCfg.label,
      rewardIcon: _rewardNodeCfg.icon,
      rewardType: slotReward,
    });
  });

  // ── Specials ──────────────────────────────────────────────────────────────
  const gymSpecials = specials.filter(s => s.type === 'gym');
  const midSpecials = specials.filter(s => s.type !== 'gym');

  // Fixed campfire center position — all specials orbit around it
  const cfX = Math.round(W * 0.50);
  const cfY = Math.round(horizY + (H - horizY) * 0.36);

  gymSpecials.forEach(sp => {
    // Gym: top-center foreground — above campfire but on ground level, path arcs right
    const gx = Math.round(W * 0.50);
    const gy = Math.round(horizY + (H - horizY) * 0.12); // near horizon, top of foreground
    nodes.push({ x: gx, y: gy,
      type: 'gym', enc: sp.enc, color: '#c8a060', sprites: [], label: 'Gym',
      pathBias: 'right' });
  });

  midSpecials.forEach(sp => {
    if (sp.type === 'rival') {
      // Rival: left side of map, midground level
      nodes.push({ x: Math.round(W * 0.25), y: Math.round(horizY + (H - horizY) * 0.30),
        type: 'rival', enc: sp.enc, color: '#9a6aee', sprites: [], label: 'Rival',
        pathBias: 'left' });
    }
    // campfire and shop no longer appear as midSpecials — they come through encounters
  });

  return nodes;
}

function _nodeRadius(node) {
  // Campfire and distant nodes get a touch-friendly radius
  if (node && node.type === 'campfire') return 32;
  return 30;
}

function _hitNode(ex, ey) {
  for (let i = 0; i < _mapNodes.length; i++) {
    const n = _mapNodes[i];
    const r = _nodeRadius(n);
    const dx = ex - n.x, dy = ey - n.y;
    if (dx * dx + dy * dy <= r * r) return i;
  }
  return -1;
}

function _drawNode(ctx, node, hovered, tick) {
  if (node.type === 'campfire') return; // rendered as world object by _drawWorldCampfire
  const { x, y, type, sprites, color } = node;
  const pulse = 0.9 + 0.1 * Math.sin(tick * 0.004);
  const r = _nodeRadius(node);

  // Glow ring
  ctx.save();
  ctx.globalAlpha = hovered ? 0.4 : 0.18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * (hovered ? 1.15 : 1) * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dark circle background
  ctx.save();
  ctx.globalAlpha = 0.80;
  ctx.fillStyle = '#08070a';
  ctx.beginPath();
  ctx.arc(x, y, r - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Border ring
  ctx.save();
  ctx.globalAlpha = hovered ? 0.9 : 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = hovered ? 2 : 1;
  ctx.beginPath();
  ctx.arc(x, y, r - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Content: reward icon (animated) or special icon
  if (type === 'combat' || type === 'pack') {
    // Float animation — different phase per x position so nodes don't sync
    const floatY = Math.sin(tick * 0.003 + node.x * 0.012) * 5;
    const scalePulse = type === 'major' ? 1 + 0.08 * Math.sin(tick * 0.005) : 1;
    ctx.save();
    ctx.font = `${Math.round((r - 6) * scalePulse)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = hovered ? 1.0 : 0.88;
    ctx.fillText(node.rewardIcon || '⚔', x, y + floatY);
    ctx.restore();
  } else {
    _drawNodeIcon(ctx, x, y, node, hovered, tick);
  }

  // Label below node
  ctx.save();
  ctx.font = `bold ${hovered ? 10 : 8}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = hovered ? '#ffe8a0' : color;
  ctx.globalAlpha = hovered ? 0.95 : 0.7;
  ctx.fillText(node.label || '', x, y + r + 10);
  ctx.restore();
}


function _mapHover(e) {
  if (_mapAnimTarget) return;
  const r = _mapCanvas.getBoundingClientRect();
  const scaleX = _mapCanvas.width  / r.width;
  const scaleY = _mapCanvas.height / r.height;
  _mapHovered = _hitNode(
    (e.clientX - r.left) * scaleX,
    (e.clientY - r.top)  * scaleY,
  );
  _mapCanvas.style.cursor = _mapHovered >= 0 ? 'pointer' : 'default';
}

function _mapClick(e) {
  if (_mapAnimTarget) return;   // mid-animation — ignore
  const r = _mapCanvas.getBoundingClientRect();
  const scaleX = _mapCanvas.width  / r.width;
  const scaleY = _mapCanvas.height / r.height;
  const idx = _hitNode(
    (e.clientX - r.left) * scaleX,
    (e.clientY - r.top)  * scaleY,
  );
  if (idx < 0) return;
  _startTravel(_mapNodes[idx]);
}

function _startTravel(node) {
  _mapAnimTarget = node;
  _mapAnimT = 0;
  _mapHovered = -1;
  _mapCanvas.style.cursor = 'default';
}

// ═══ RENDER LOOP ══════════════════════════════════════════════════════════════
function _startMapLoop() {
  if (_mapRAF) cancelAnimationFrame(_mapRAF);
  const tick = () => {
    _renderMap();
    if (_mapAnimTarget) {
      _mapAnimT++;
      const t = _mapAnimT / MAP_ANIM_FRAMES;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      _mapPlayerX = Math.round(_mapOriginX + (_mapAnimTarget.x - _mapOriginX) * ease);
      _mapPlayerY = Math.round(_mapOriginY + (_mapAnimTarget.y - _mapOriginY) * ease);
      if (_mapAnimT >= MAP_ANIM_FRAMES) {
        _mapPlayerX = _mapAnimTarget.x;
        _mapPlayerY = _mapAnimTarget.y;
        const target = _mapAnimTarget;
        _mapAnimTarget = null;
        stopMapCanvas();
        // Dispatch to correct handler
        setTimeout(() => _dispatchNode(target), 80);
        return;
      }
    }
    _mapRAF = requestAnimationFrame(tick);
  };
  _mapRAF = requestAnimationFrame(tick);
}

function _dispatchNode(node) {
  if (node.type === 'campfire') { enterCampfire(); return; }
  if (node.type === 'shop')     { enterShop();     return; }
  if (node.type === 'rival')    { showRivalIntro(); return; }
  if (node.type === 'gym')      {
    if (node.enc && node.enc._forced) showGymIntro(true);
    else showGymIntro(false);
    return;
  }
  // combat or pack
  loadBattle(node.enc);
}

// ═══ DRAWING ══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// NIGHT SCENE RENDERING
// ═══════════════════════════════════════════════════════════════════════════

function _renderMap() {
  const canvas = _mapCanvas;
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;
  const tick = Date.now();
  const horizY = Math.floor(H * 0.45);

  _drawNightSky(ctx, W, H, horizY, tick);
  _drawTerrain(ctx, W, H, horizY, tick);

  // Ground paths from origin to every node (drawn below nodes)
  const isAirZone = (typeof currentZoneElement !== 'undefined' && currentZoneElement === 'Air');
  if(!isAirZone){
    _mapNodes.forEach(node => {
      _drawGroundPath(ctx, _mapOriginX, _mapOriginY, node.x, node.y, node.color, W, H, horizY, node.pathBias);
    });
  } else {
    // Air: dotted cloud walkway path to each node (from static origin)
    _mapNodes.forEach(node => {
      _drawAirCloudPath(ctx, _mapOriginX, _mapOriginY, node.x, node.y);
    });
  }

  // World campfire — zone-themed, with cloud platform in Air zone
  _mapNodes.forEach((node, i) => {
    if (node.type === 'campfire') {
      if(isAirZone){
        // Cloud platform first, then fire on top
        _cloudPlatform(ctx, node.x, node.y + 12, 68, 18, false);
      }
      _drawZoneCampfire(ctx, node.x, node.y, i === _mapHovered, tick);
    }
  });

  // Warm origin glow under player start (non-air) or player cloud (air)
  if(isAirZone){
    _cloudPlatform(ctx, _mapOriginX, _mapOriginY - 4, 85, 20, true);
  } else {
    const og = ctx.createRadialGradient(_mapOriginX, _mapOriginY, 0, _mapOriginX, _mapOriginY, 18);
    og.addColorStop(0,   'rgba(200,160,60,0.28)');
    og.addColorStop(1,   'rgba(200,160,60,0)');
    ctx.fillStyle = og;
    ctx.fillRect(_mapOriginX-18, _mapOriginY-18, 36, 36);
  }

  // Destination nodes (non-campfire)
  _mapNodes.forEach((node, i) => {
    if (node.type !== 'campfire'){
      if(isAirZone){
        _drawAirCloudNode(ctx, node, i === _mapHovered, tick);
      } else {
        _drawNode(ctx, node, i === _mapHovered, tick);
      }
    }
  });

  // Foreground trees frame the scene
  _drawFgTrees(ctx, W, H, horizY);

  // Zone-specific foreground details (critters, particles, ambience)
  _drawZoneDetails(ctx, W, H, horizY, tick);

  // Player sprite
  _drawMapPlayer(ctx, _mapPlayerX, _mapPlayerY, tick);
}

// ── Night Sky ──────────────────────────────────────────────────────────────
function _drawNightSky(ctx, W, H, horizY, tick) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizY);
  sky.addColorStop(0,    '#020110');
  sky.addColorStop(0.45, '#050318');
  sky.addColorStop(1,    '#0d0820');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizY + 4);

  // Moon — upper right area
  _drawMoon(ctx, Math.round(W * 0.80), Math.round(H * 0.13), tick);

  // Stars
  const stars = _getStarField(W, H, horizY);
  stars.forEach(s => {
    const tw = s.bright * (0.4 + 0.6 * Math.sin(tick * s.spd + s.ph));
    ctx.globalAlpha = Math.max(0, tw);
    ctx.fillStyle   = s.col;
    ctx.fillRect(s.x, s.y, s.sz, s.sz);
  });
  ctx.globalAlpha = 1;

  _drawNebulae(ctx, W, horizY, tick);
  _drawClouds(ctx, W, H, horizY, tick);
}

let _starCache = null, _starCacheKey = '';
// ── Cloud state ───────────────────────────────────────────────────────────
const _clouds = [];
function _initClouds(W, H, horizY) {
  if (_clouds.length) return; // already initialised
  // Each cloud: x (world), y (fixed), w, h, speed, opacity, shape[]
  const CLOUD_DEFS = [
    { relW:0.22, relY:0.08, speed:0.008, opacity:0.13, shape:[
      [0,2,8,3],[2,1,12,4],[5,0,10,5],[10,1,8,4],[16,2,6,3] ]},
    { relW:0.15, relY:0.16, speed:0.013, opacity:0.10, shape:[
      [0,2,6,3],[2,0,9,4],[7,1,7,4],[12,2,5,3] ]},
    { relW:0.30, relY:0.05, speed:0.006, opacity:0.09, shape:[
      [0,3,10,3],[3,1,14,5],[9,0,12,6],[17,1,10,5],[23,2,8,4] ]},
    { relW:0.55, relY:0.12, speed:0.010, opacity:0.11, shape:[
      [0,2,7,3],[2,1,10,4],[7,0,8,5],[12,2,7,3] ]},
    { relW:0.75, relY:0.06, speed:0.007, opacity:0.08, shape:[
      [0,2,9,3],[3,0,13,5],[9,1,10,5],[17,2,7,3] ]},
  ];
  CLOUD_DEFS.forEach(def => {
    _clouds.push({
      x: def.relW * W,
      y: Math.round(def.relY * horizY),
      speed: def.speed,
      opacity: def.opacity,
      shape: def.shape,
      wrapW: W,
    });
  });
}

function _updateClouds(dt) {
  _clouds.forEach(c => {
    c.x += c.speed * dt;
    if (c.x > c.wrapW + 200) c.x = -200;
  });
}

let _lastCloudTick = 0;
function _drawClouds(ctx, W, H, horizY, tick) {
  _initClouds(W, H, horizY);
  const dt = _lastCloudTick ? Math.min(tick - _lastCloudTick, 50) : 16;
  _lastCloudTick = tick;
  _updateClouds(dt);

  _clouds.forEach(c => {
    const ps = 3; // pixel scale
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.fillStyle = '#c8d4f8';
    c.shape.forEach(([rx, ry, rw, rh]) => {
      ctx.fillRect(
        Math.round(c.x + rx * ps),
        Math.round(c.y + ry * ps),
        rw * ps, rh * ps
      );
    });
    // Slightly brighter top edge highlight
    ctx.globalAlpha = c.opacity * 0.5;
    ctx.fillStyle = '#e8eeff';
    c.shape.forEach(([rx, ry, rw]) => {
      ctx.fillRect(Math.round(c.x + rx*ps), Math.round(c.y + ry*ps), rw*ps, ps);
    });
    ctx.restore();
  });
}

function _getStarField(W, H, horizY) {
  const key = `${W}x${H}`;
  if (_starCache && _starCacheKey === key) return _starCache;
  const out = [];
  for (let i = 0; i < 90; i++) {
    const rx  = ((i*137.508+23.7) % 1000)/1000;
    const ry  = ((i*97.31 +11.1)  % 1000)/1000;
    const rs  = ((i*53.17 +5.3)   % 1000)/1000;
    const rp  = ((i*211.3 +7.7)   % 1000)/1000;
    const rsp = ((i*73.9  +3.3)   % 1000)/1000;
    const rc  = ((i*43.1  +9.1)   % 1000)/1000;
    out.push({
      x:     Math.round(rx * W),
      y:     Math.round(ry * horizY * 0.95),
      sz:    rs < 0.07 ? 2 : 1,
      bright:0.35 + rs * 0.55,
      ph:    rp * Math.PI * 2,
      spd:   0.0007 + rsp * 0.0018,
      col:   rc < 0.25 ? '#c8d0ff' : rc < 0.55 ? '#ffffff' : '#ffe8cc',
    });
  }
  _starCache = out; _starCacheKey = key;
  return out;
}

function _drawMoon(ctx, mx, my, tick) {
  // Outer glow
  const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 44);
  glow.addColorStop(0,   'rgba(180,210,255,0.14)');
  glow.addColorStop(0.5, 'rgba(140,180,240,0.05)');
  glow.addColorStop(1,   'rgba(100,130,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(mx-44, my-44, 88, 88);

  // Inner glow
  const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, 22);
  g2.addColorStop(0, 'rgba(220,235,255,0.18)');
  g2.addColorStop(1, 'rgba(180,210,255,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(mx-22, my-22, 44, 44);

  // Pixel moon disc (12 wide, 8 tall, scale 3)
  const moonRows = [
    '....1111....',
    '..11111111..',
    '.1112211111.',
    '111221111111',
    '112221111111',
    '.1122211111.',
    '..11111111..',
    '....1111....',
  ];
  const moonPal = { '1':'#ccd8f0', '2':'#e4eeff' };
  const ps = 3;
  const ox = mx - (12*ps)/2, oy = my - (moonRows.length*ps)/2;
  moonRows.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      if (!moonPal[ch]) return;
      ctx.fillStyle = moonPal[ch];
      ctx.fillRect(Math.round(ox + rx*ps), Math.round(oy + ry*ps), ps, ps);
    })
  );

  // Crescent shadow — dark overlay slightly offset right
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = '#030112';
  ctx.beginPath();
  ctx.ellipse(mx+6, my, 11, 14, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function _drawNebulae(ctx, W, horizY, tick) {
  const patches = [
    { x:W*0.15, y:horizY*0.22, rx:W*0.12, ry:horizY*0.09, col:'rgba(70,30,110,',  b:0.055 },
    { x:W*0.55, y:horizY*0.35, rx:W*0.10, ry:horizY*0.07, col:'rgba(30,50,120,',  b:0.045 },
    { x:W*0.38, y:horizY*0.12, rx:W*0.08, ry:horizY*0.06, col:'rgba(90,25,70,',   b:0.038 },
  ];
  patches.forEach(p => {
    const alpha = p.b + 0.018*Math.sin(tick*0.0009 + p.x);
    const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(p.rx,p.ry));
    g.addColorStop(0, p.col + alpha*2 + ')');
    g.addColorStop(1, p.col + '0)');
    ctx.save();
    ctx.scale(1, p.ry/p.rx);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y*(p.rx/p.ry), p.rx, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
}

// ── Terrain ────────────────────────────────────────────────────────────────
function _hillY(x, horizY, H) {
  const fg = (H || horizY * 1.6) - horizY;
  return horizY
    + fg * 0.055 * Math.sin(x * 0.019 + 1.2)
    + fg * 0.09  * Math.sin(x * 0.009 + 0.5)
    + fg * 0.028 * Math.sin(x * 0.047 + 2.1);
}

// Shared: distant jagged mountain range just above horizon
// cols: array of 1-3 fill colors from farthest to nearest layer
function _mountains(ctx, W, horizY, cols, seeds) {
  const layers = cols.length;
  for (let li = 0; li < layers; li++) {
    const seed  = seeds ? seeds[li] : li * 137;
    const depth = (li + 1) / layers;           // 1=nearest layer
    const peakH = horizY * (0.55 + depth * 0.25); // how high peaks reach above horizon
    ctx.fillStyle = cols[li];
    ctx.beginPath();
    ctx.moveTo(0, horizY);
    let px = 0;
    while (px <= W) {
      // jagged peak width varies
      const pw = 28 + ((seed * 7 + px * 3) % 55);
      const ph = peakH * (0.55 + 0.45 * (((seed + px) * 1031) % 100) / 100);
      const mx = px + pw * 0.45 + ((seed + px * 2) % 12) - 6;
      ctx.lineTo(Math.round(px), horizY);
      ctx.lineTo(Math.round(mx), Math.round(horizY - ph));
      ctx.lineTo(Math.round(px + pw), horizY);
      px += pw;
    }
    ctx.lineTo(W, horizY); ctx.closePath(); ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ZONE-AWARE TERRAIN SYSTEM
// Each element has a unique landscape: ground color, features, vegetation.
// _drawTerrain dispatches to zone-specific renderer based on playerElement.
// ═══════════════════════════════════════════════════════════════════════

// Shared: draw a filled ground shape from terrainY to H
function _groundShape(ctx, W, H, horizY, col1, col2, wave1, wave2, wave3) {
  const grd = ctx.createLinearGradient(0, horizY, 0, H);
  grd.addColorStop(0,   col1);
  grd.addColorStop(1,   col2);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x++) {
    const hy = _hillY(x, horizY, H) + (wave1||0)*Math.sin(x*0.02+1.1)
                                     + (wave2||0)*Math.sin(x*0.009+0.5)
                                     + (wave3||0)*Math.sin(x*0.047+2.1);
    x === 0 ? ctx.lineTo(0, Math.round(hy)) : ctx.lineTo(x, Math.round(hy));
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

// Shared silhouette hills (far background)
function _hillSilhouette(ctx, W, H, horizY, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let x = 0; x <= W; x++) {
    const hy = _hillY(x, horizY, H);
    x === 0 ? ctx.moveTo(0, Math.round(hy)) : ctx.lineTo(x, Math.round(hy));
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

// Second hill layer (mid-distance)
function _hill2(ctx, W, H, horizY, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let x = 0; x <= W; x++) {
    const hy = horizY + (H-horizY)*0.08
             + Math.sin(x*0.028+2.8)*(H-horizY)*0.045
             + Math.sin(x*0.013+1.4)*(H-horizY)*0.065;
    x === 0 ? ctx.moveTo(0,Math.round(hy)) : ctx.lineTo(x,Math.round(hy));
  }
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
}

// ──────────────────────────────────────────────────────────────────────────────
// FIRE ZONE — volcanic rock, lava veins, charred trees
// ──────────────────────────────────────────────────────────────────────────────
function _terrainFire(ctx, W, H, horizY, tick) {
  // Distant volcanic mountains with lava glow at peaks
  _mountains(ctx, W, horizY, ['#0e0200','#1a0400','#260602'], [13,53,97]);
  // Lava glow bleeding from mountain peaks
  for (let i=0;i<5;i++){
    const mx = Math.round(((i*211+43)%997)/997*W);
    const mg = ctx.createRadialGradient(mx, horizY, 2, mx, horizY, 18+i*4);
    mg.addColorStop(0,'rgba(255,80,0,0.22)'); mg.addColorStop(1,'rgba(255,40,0,0)');
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,horizY,18+i*4,0,Math.PI*2); ctx.fill();
  }
  _hillSilhouette(ctx, W, H, horizY, '#1a0603');
  _hill2(ctx, W, H, horizY, '#230808');
  _groundShape(ctx, W, H, horizY, '#1c0804', '#0e0402', 0, 0, 0);
  // Lava river — glowing channel across mid-ground
  const lavaY = Math.round(horizY + (H - horizY) * 0.55);
  const lavaH = Math.round((H - horizY) * 0.06);
  for (let x = 0; x < W; x++) {
    const wave = Math.sin(x * 0.04 + tick * 0.003) * 3;
    const glow = 0.5 + 0.5 * Math.sin(x * 0.08 + tick * 0.005);
    ctx.fillStyle = `rgb(${Math.round(200+55*glow)},${Math.round(40+30*glow)},0)`;
    ctx.fillRect(x, lavaY + Math.round(wave), 1, lavaH);
  }
  // Lava glow
  const lg = ctx.createLinearGradient(0, lavaY - 8, 0, lavaY + lavaH + 12);
  lg.addColorStop(0, 'rgba(255,80,0,0)');
  lg.addColorStop(0.4, 'rgba(255,80,0,0.18)');
  lg.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, lavaY-8, W, lavaH+20);
  // Cracked rock texture
  for (let i = 0; i < 18; i++) {
    const cx2 = ((i*173+31)%W);
    const cy2 = lavaY + lavaH + 4 + ((i*97+13)%(Math.round((H-lavaY)*0.7)));
    ctx.fillStyle = i%3===0 ? '#2a0d04' : '#1a0804';
    ctx.fillRect(cx2, cy2, 4+i%5, 2);
  }
  // Horizon glow
  const hg = ctx.createLinearGradient(0, horizY-15, 0, horizY+10);
  hg.addColorStop(0, 'rgba(200,50,0,0.18)'); hg.addColorStop(1, 'rgba(200,50,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, horizY-15, W, 25);
  // Charred dead trees
  _fireDeadTrees(ctx, W, H, horizY);
  _fireDeadTrees_fg(ctx, W, H, horizY);
  // Ash particles drifting down
  for (let i = 0; i < 12; i++) {
    const phase = (tick * 0.0003 + i * 0.21) % 1;
    const ax = ((i * 197 + 23) % W) + Math.round(Math.sin(tick * 0.0009 + i) * 6);
    const ay = Math.round(phase * H);
    const alpha = Math.sin(phase * Math.PI) * 0.4;
    if (alpha < 0.05) continue;
    ctx.fillStyle = `rgba(80,40,20,${alpha.toFixed(2)})`;
    ctx.fillRect(ax, ay, i % 4 === 0 ? 3 : 2, 1);
  }
  // Foreground lava pool with glow
  const poolX = Math.round(W * 0.38), poolY = Math.round(H * 0.88);
  const poolW = Math.round(W * 0.14), poolH = Math.round((H - horizY) * 0.05);
  for (let px2 = poolX; px2 < poolX + poolW; px2++) {
    const wave = Math.sin(px2 * 0.07 + tick * 0.004) * 2;
    const glow = 0.55 + 0.35 * Math.sin(px2 * 0.11 + tick * 0.006);
    ctx.fillStyle = `rgb(${Math.round(210+45*glow)},${Math.round(30+25*glow)},0)`;
    ctx.fillRect(px2, poolY + Math.round(wave), 1, poolH);
  }
  const plg = ctx.createRadialGradient(poolX + poolW/2, poolY, 0, poolX + poolW/2, poolY, poolW * 0.6);
  plg.addColorStop(0, 'rgba(255,80,0,0.22)'); plg.addColorStop(1, 'transparent');
  ctx.fillStyle = plg; ctx.fillRect(poolX - Math.round(poolW * 0.3), poolY - 8, Math.round(poolW * 1.6), poolH + 16);
  // Smoke columns rising from lava
  for (let i = 0; i < 3; i++) {
    const scx = Math.round(W * (0.22 + i * 0.28));
    const sPhase = (tick * 0.0006 + i * 0.38) % 1;
    const scy = Math.round(H * 0.62 - sPhase * H * 0.18);
    const salpha = Math.sin(sPhase * Math.PI) * 0.18;
    ctx.fillStyle = `rgba(60,30,15,${salpha.toFixed(2)})`;
    ctx.fillRect(scx - 4, scy, 8 + Math.round(sPhase * 4), 6);
  }
}

// Generic pine and oak (used by Nature zone and any zone that needs generic trees)
function _drawPine(ctx, cx, baseY, sc) {
  const s = Math.max(1, Math.round(sc * 2));
  ctx.fillStyle = '#200f06'; ctx.fillRect(cx-s, baseY-4*s, 2*s, 4*s);
  ctx.fillStyle = '#0d2a0f'; ctx.fillRect(cx-4*s, baseY-7*s,  8*s, 3*s);
  ctx.fillStyle = '#122e14'; ctx.fillRect(cx-3*s, baseY-8*s,  6*s, 2*s);
  ctx.fillStyle = '#0d2a0f'; ctx.fillRect(cx-3*s, baseY-12*s, 6*s, 4*s);
  ctx.fillStyle = '#122e14'; ctx.fillRect(cx-2*s, baseY-13*s, 4*s, 2*s);
  ctx.fillStyle = '#112c13'; ctx.fillRect(cx-2*s, baseY-16*s, 4*s, 4*s);
                             ctx.fillRect(cx-s,   baseY-17*s, 2*s, 2*s);
  ctx.fillStyle = '#173a1a'; ctx.fillRect(cx-s, baseY-19*s, 2*s, 3*s);
  ctx.fillStyle = '#1d4820';
  ctx.fillRect(cx-4*s, baseY-7*s,  s, 2*s);
  ctx.fillRect(cx-3*s, baseY-12*s, s, 2*s);
  ctx.fillRect(cx-2*s, baseY-16*s, s, 2*s);
  ctx.fillRect(cx-s,   baseY-19*s, s, s);
}

function _drawOak(ctx, cx, baseY, sc) {
  const s = Math.max(1, Math.round(sc * 2));
  ctx.fillStyle = '#200f06'; ctx.fillRect(cx-s, baseY-5*s, 2*s, 5*s);
  ctx.fillStyle = '#160a04'; ctx.fillRect(cx,   baseY-4*s, s,   4*s);
  ctx.fillStyle = '#112e14';
  ctx.fillRect(cx-4*s, baseY-13*s, 8*s,  8*s);
  ctx.fillRect(cx-3*s, baseY-15*s, 6*s,  3*s);
  ctx.fillRect(cx-5*s, baseY-12*s, 10*s, 4*s);
  ctx.fillRect(cx-4*s, baseY-8*s,  8*s,  2*s);
  ctx.fillStyle = '#0a1e0c';
  ctx.fillRect(cx+2*s, baseY-13*s, 2*s, 7*s);
  ctx.fillRect(cx+s,   baseY-15*s, 3*s, 3*s);
  ctx.fillStyle = '#193a1c'; ctx.fillRect(cx-4*s, baseY-14*s, 3*s, 3*s);
  ctx.fillStyle = '#214a24'; ctx.fillRect(cx-3*s, baseY-15*s, 2*s, 2*s);
  ctx.fillStyle = '#173818'; ctx.fillRect(cx-5*s, baseY-11*s, 2*s, 2*s);
}

function _fireDeadTrees(ctx, W, H, horizY) {
  for (let i = 0; i < 10; i++) {
    const tx = Math.round(((i*211+53)%997)/997 * W);
    const ty = Math.round(_hillY(tx, horizY, H));
    const h  = 10 + (i*7)%12;
    const s  = 1;
    ctx.fillStyle = '#100604';
    ctx.fillRect(tx-s, ty-h, s*2, h);
    if (i%3!==0) { ctx.fillRect(tx+s, ty-h+3, s*3, s); ctx.fillRect(tx-s*3, ty-h+6, s*3, s); }
  }
}
function _fireDeadTrees_fg(ctx, W, H, horizY) {
  [[W*0.05,H*0.89],[W*0.93,H*0.89]].forEach(([tx,ty]) => {
    const s=2; const h=34;
    ctx.fillStyle='#180806'; ctx.fillRect(tx-s,ty-h,s*2,h);
    ctx.fillRect(tx+s,ty-h+8,s*4,s*2); ctx.fillRect(tx-s*5,ty-h+14,s*4,s*2);
    ctx.fillRect(tx+s,ty-h+20,s*3,s); ctx.fillRect(tx-s*4,ty-h+25,s*3,s);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// WATER ZONE — sandy beach, ocean waves, palm trees
// ──────────────────────────────────────────────────────────────────────────────
function _terrainWater(ctx, W, H, horizY, tick) {
  // Distant ocean cliffs and islands on horizon
  _mountains(ctx, W, horizY, ['#081420','#0c1e2e'], [23,71]);
  // Distant island silhouettes (low, flat-topped)
  [[0.2,0.6],[0.55,0.35],[0.78,0.5]].forEach(([xf,wf])=>{
    const ix=Math.round(W*xf), iw=Math.round(W*wf*0.15), ih=Math.round(horizY*0.25);
    ctx.fillStyle='#091828';
    ctx.beginPath(); ctx.ellipse(ix, horizY, iw, ih, 0, Math.PI, Math.PI*2); ctx.fill();
  });
  _hillSilhouette(ctx, W, H, horizY, '#0a1820');
  _hill2(ctx, W, H, horizY, '#0f2030');
  // Sandy beach ground
  const bg = ctx.createLinearGradient(0, horizY, 0, H);
  bg.addColorStop(0, '#1a3040'); bg.addColorStop(0.35, '#8a7a4a'); bg.addColorStop(1, '#c8b060');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W;x++) {
    const hy = _hillY(x,horizY,H);
    x===0?ctx.lineTo(0,Math.round(hy)):ctx.lineTo(x,Math.round(hy));
  }
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  // Ocean at bottom — waves
  const oceanTop = Math.round(H * 0.82);
  const og = ctx.createLinearGradient(0, oceanTop, 0, H);
  og.addColorStop(0, '#1a6888'); og.addColorStop(1, '#0a3a55');
  ctx.fillStyle = og; ctx.fillRect(0, oceanTop, W, H - oceanTop);
  // Wave lines
  for (let wi = 0; wi < 5; wi++) {
    const wy = oceanTop + wi * 5;
    const phase = tick * 0.002 + wi * 1.2;
    ctx.fillStyle = `rgba(160,220,255,${0.12 - wi*0.02})`;
    for (let x = 0; x < W; x++) {
      const wave = Math.sin(x * 0.03 + phase) * 3;
      if (Math.abs(wave) > 1.5) ctx.fillRect(x, wy + Math.round(wave), 1, 2);
    }
  }
  // Seafoam edge
  const sf = tick * 0.0015;
  for (let x = 0; x < W; x++) {
    const foam = Math.sin(x * 0.05 + sf) * 2 + Math.sin(x * 0.13 + sf*1.3);
    if (foam > 1.8) {
      ctx.fillStyle = 'rgba(220,240,255,0.4)';
      ctx.fillRect(x, oceanTop + Math.round(foam * 0.5), 1, 2);
    }
  }
  // Horizon glow (teal)
  const hg = ctx.createLinearGradient(0, horizY-12, 0, horizY+8);
  hg.addColorStop(0, 'rgba(20,120,150,0.2)'); hg.addColorStop(1, 'rgba(20,120,150,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, horizY-12, W, 20);
  // Palm trees
  _palmTree(ctx, Math.round(W*0.08), Math.round(H*0.78), 1.0);
  _palmTree(ctx, Math.round(W*0.14), Math.round(H*0.80), 0.8);
  _palmTree(ctx, Math.round(W*0.90), Math.round(H*0.78), 0.9);
  _palmTree(ctx, Math.round(W*0.84), Math.round(H*0.80), 0.75);
  for (let i = 0; i < 8; i++) {
    const tx = Math.round(((i*211+53)%997)/997 * W);
    const ty = Math.round(_hillY(tx, horizY, H)) - 4;
    _palmTree(ctx, tx, ty, 0.4 + (i%3)*0.15);
  }
  // Distant ship silhouette
  const shipX = Math.round(W * 0.68), shipY = Math.round(horizY - 6);
  ctx.fillStyle = '#060e18';
  ctx.fillRect(shipX - 12, shipY, 24, 5);
  ctx.fillRect(shipX - 8,  shipY - 2, 16, 2);
  ctx.fillRect(shipX - 2,  shipY - 14, 2, 12);
  ctx.fillRect(shipX + 1,  shipY - 14, 8, 2);
  ctx.fillRect(shipX + 1,  shipY - 10, 6, 4);
  // Shore sheen at tide line
  for (let x = 0; x < W; x++) {
    const sheen = Math.sin(x * 0.04 + tick * 0.0012) * 0.5 + 0.5;
    const sheenY = Math.round(H * 0.82 - sheen * 3);
    ctx.fillStyle = `rgba(120,200,240,${(sheen * 0.08).toFixed(2)})`;
    ctx.fillRect(x, sheenY, 1, 2);
  }
  // Reef tint in shallow water
  const reefG = ctx.createLinearGradient(0, Math.round(H * 0.82), 0, Math.round(H * 0.88));
  reefG.addColorStop(0, 'rgba(0,120,80,0.10)'); reefG.addColorStop(1, 'rgba(0,80,60,0)');
  ctx.fillStyle = reefG; ctx.fillRect(0, Math.round(H * 0.82), W, Math.round(H * 0.06));
}

function _palmTree(ctx, cx, baseY, sc) {
  const s = Math.max(1, Math.round(sc * 3));
  // Curved trunk (pixel steps)
  ctx.fillStyle = '#7a5c2a';
  for (let i = 0; i < 12*s; i++) {
    const lean = Math.round(Math.sin(i*0.15)*s*0.8);
    ctx.fillRect(cx - s + lean, baseY - i, s*2, 1);
  }
  // Fronds
  const topX = cx + Math.round(Math.sin(12*s*0.15)*s*0.8);
  const topY = baseY - 12*s;
  const fronds = [[-1,-1],[-3,-2],[-5,-2],[-6,-1],[1,-1],[3,-2],[5,-2],[6,-1],[0,-3],[0,-4]];
  fronds.forEach(([dx,dy]) => {
    ctx.fillStyle = '#2a6a18';
    ctx.fillRect(topX + dx*s, topY + dy*s, s*2, s);
    ctx.fillStyle = '#1a4a10';
    ctx.fillRect(topX + dx*s, topY + dy*s + s, s*2, s);
  });
  // Coconuts
  ctx.fillStyle = '#8a6020';
  ctx.fillRect(topX - s, topY, s*2, s*2);
}

// ──────────────────────────────────────────────────────────────────────────────
// ICE ZONE — snow-covered ground, icicles, frozen trees
// ──────────────────────────────────────────────────────────────────────────────
function _terrainIce(ctx, W, H, horizY, tick) {
  // Distant glacial peaks — sharp, pale
  _mountains(ctx, W, horizY, ['#60a8d0','#80c0e8','#a0d4f0'], [17,61,103]);
  // Snow caps on mountain tips
  for (let i=0;i<8;i++){
    const mx=Math.round(((i*173+29)%997)/997*W);
    const capH=Math.round(horizY*(0.12+0.08*(i%3)));
    ctx.fillStyle='rgba(240,250,255,0.55)';
    ctx.beginPath(); ctx.moveTo(mx-8,horizY-capH+6); ctx.lineTo(mx,horizY-capH); ctx.lineTo(mx+8,horizY-capH+6); ctx.closePath(); ctx.fill();
  }
  _hillSilhouette(ctx, W, H, horizY, '#a0c8e8');
  _hill2(ctx, W, H, horizY, '#b8d8f0');
  const ig = ctx.createLinearGradient(0, horizY, 0, H);
  ig.addColorStop(0, '#c8e0f8'); ig.addColorStop(0.5, '#d8eeff'); ig.addColorStop(1, '#e8f4ff');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W;x++) {
    const hy = _hillY(x,horizY,H);
    x===0?ctx.lineTo(0,Math.round(hy)):ctx.lineTo(x,Math.round(hy));
  }
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  // Snow sparkle texture
  for (let i=0;i<40;i++) {
    const sx = ((i*173+31)%W);
    const sy = Math.round(_hillY(sx,horizY,H)) + ((i*97+13)%(Math.round((H-horizY)*0.9)));
    const bright = 0.3 + 0.4*Math.sin(tick*0.004 + i*0.8);
    ctx.fillStyle = `rgba(255,255,255,${bright.toFixed(2)})`;
    ctx.fillRect(sx, sy, 2, 2);
  }
  // Frozen pond (teal circle mid-ground)
  const pondX = Math.round(W*0.5), pondY = Math.round(horizY + (H-horizY)*0.6);
  const pondW = Math.round(W*0.18), pondH = Math.round((H-horizY)*0.06);
  ctx.fillStyle = '#7ab8d8'; ctx.fillRect(pondX - pondW, pondY, pondW*2, pondH);
  ctx.fillStyle = 'rgba(200,235,255,0.4)'; ctx.fillRect(pondX - pondW + 4, pondY + 2, pondW, pondH*0.4);
  // Icicles hanging from hill edges
  for (let i=0; i<20; i++) {
    const ix = Math.round(((i*197+41)%997)/997 * W);
    const iy = Math.round(_hillY(ix, horizY, H));
    const ih = 4 + (i*7)%10;
    ctx.fillStyle = '#a0d0f0';
    ctx.fillRect(ix-1, iy, 2, ih);
    ctx.fillStyle = '#c8e8ff';
    ctx.fillRect(ix, iy, 1, ih-2);
  }
  // Horizon shimmer
  const hg = ctx.createLinearGradient(0, horizY-10, 0, horizY+10);
  hg.addColorStop(0, 'rgba(180,220,255,0.3)'); hg.addColorStop(1, 'rgba(180,220,255,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, horizY-10, W, 20);
  // Snow-capped pines
  for (let i=0;i<12;i++) {
    const tx=Math.round(((i*197+41)%997)/997*W);
    const ty=Math.round(_hillY(tx,horizY,H));
    _snowPine(ctx, tx, ty, 0.4+(i%3)*0.15);
  }
  _snowPine(ctx, Math.round(W*0.05), Math.round(H*0.88), 0.9);
  _snowPine(ctx, Math.round(W*0.93), Math.round(H*0.88), 0.85);
  _snowPine(ctx, Math.round(W*0.11), Math.round(H*0.91), 0.7);
  _snowPine(ctx, Math.round(W*0.87), Math.round(H*0.91), 0.7);
  // Aurora bands in sky
  const aurColors = ['rgba(0,220,160,', 'rgba(60,120,255,', 'rgba(180,80,255,'];
  for (let i = 0; i < 3; i++) {
    const aY = Math.round(horizY * (0.12 + i * 0.16) + Math.sin(tick * 0.005 + i * 1.2) * 6);
    const aH = Math.round(horizY * 0.07);
    const ag = ctx.createLinearGradient(0, aY, 0, aY + aH);
    ag.addColorStop(0, 'transparent');
    ag.addColorStop(0.4, aurColors[i] + (0.14 + 0.08 * Math.sin(tick * 0.007 + i)) + ')');
    ag.addColorStop(1, 'transparent');
    ctx.fillStyle = ag; ctx.fillRect(0, aY, W, aH);
  }
  // Frozen cliff waterfall (right side)
  const fwX = Math.round(W * 0.80), fwTopY = Math.round(horizY + (H-horizY)*0.06);
  const fwBotY = Math.round(horizY + (H-horizY)*0.44);
  ctx.fillStyle = '#3a4858'; ctx.fillRect(fwX - 7, fwTopY, 14, fwBotY - fwTopY);
  for (let i = 0; i < 5; i++) {
    const iAlpha = 0.55 + 0.25 * Math.sin(tick * 0.004 + i);
    ctx.fillStyle = `rgba(180,230,255,${iAlpha.toFixed(2)})`;
    ctx.fillRect(fwX - 4 + i * 2, fwTopY, 2, fwBotY - fwTopY);
  }
  // Ice crack patterns on ground surface
  for (let i = 0; i < 8; i++) {
    const icx = Math.round(((i * 211 + 41) % 997) / 997 * W);
    const icy = Math.round(_hillY(icx, horizY, H)) + Math.round((i * 73 + 7) % ((H - horizY) * 0.4));
    ctx.strokeStyle = 'rgba(180,220,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(icx, icy);
    ctx.lineTo(icx + (i % 2 ? 12 : -10), icy + 4 + i % 4); ctx.stroke();
  }
}

function _snowPine(ctx, cx, baseY, sc) {
  const s = Math.max(1, Math.round(sc*2));
  ctx.fillStyle = '#5a3a18'; ctx.fillRect(cx-s, baseY-4*s, s*2, s*4);
  const layers = [[8,3],[6,4],[5,4],[3,5]];
  layers.forEach(([w,h], i) => {
    const ly = baseY - (8 + i*4.5)*s;
    ctx.fillStyle = '#1a3a50'; ctx.fillRect(cx - w*s/2, ly, w*s, h*s);
    // Snow cap
    ctx.fillStyle = '#e8f4ff'; ctx.fillRect(cx - (w-2)*s/2, ly, (w-2)*s, s);
    ctx.fillStyle = '#cce4f8'; ctx.fillRect(cx - w*s/2, ly, s, s);
  });
  // Tip snow
  ctx.fillStyle = '#f0f8ff'; ctx.fillRect(cx-s, baseY-26*s, s*2, s*3);
}

// ──────────────────────────────────────────────────────────────────────────────
// LIGHTNING ZONE — cracked dark earth, purple-yellow, storm arcs
// ──────────────────────────────────────────────────────────────────────────────
function _terrainLightning(ctx, W, H, horizY, tick) {
  // Distant jagged storm mountains
  _mountains(ctx, W, horizY, ['#080615','#0e0c22','#150f2e'], [31,73,113]);
  // Lightning glow on distant peaks
  for (let i=0;i<4;i++){
    const mx=Math.round(((i*257+41)%997)/997*W);
    const mg=ctx.createRadialGradient(mx,horizY,1,mx,horizY,20+i*5);
    mg.addColorStop(0,'rgba(180,150,255,0.18)'); mg.addColorStop(1,'rgba(100,80,200,0)');
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,horizY,20+i*5,0,Math.PI*2); ctx.fill();
  }
  _hillSilhouette(ctx, W, H, horizY, '#0e0c1a');
  _hill2(ctx, W, H, horizY, '#120f20');
  const lg = ctx.createLinearGradient(0, horizY, 0, H);
  lg.addColorStop(0, '#16122a'); lg.addColorStop(1, '#0c0a18');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W;x++) {
    const hy = _hillY(x,horizY,H);
    x===0?ctx.lineTo(0,Math.round(hy)):ctx.lineTo(x,Math.round(hy));
  }
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  // Cracked earth texture
  for (let i=0;i<25;i++) {
    const cx2 = ((i*173+31)%W);
    const cy2 = Math.round(_hillY(cx2,horizY,H)) + ((i*97+13)%(Math.round((H-horizY)*0.85)));
    const len = 8 + (i*7)%20;
    ctx.strokeStyle = '#1e1830'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx2, cy2);
    ctx.lineTo(cx2 + (i%2?len:-len)*0.6, cy2 + (i%3)*3);
    ctx.stroke();
  }
  // Lightning arc (periodic)
  const arcPhase = Math.floor(tick / 1800) % 3;
  if ((tick % 1800) < 200) {
    const ax = Math.round(W * [0.3,0.6,0.75][arcPhase]);
    const ay1 = Math.round(horizY * 0.6);
    ctx.strokeStyle = '#ffffaa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, ay1);
    for (let seg=0;seg<6;seg++) {
      ctx.lineTo(ax+(Math.random()-0.5)*20, ay1+seg*14);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,200,255,0.3)'; ctx.lineWidth = 6;
    ctx.stroke();
  }
  // Horizon glow (yellow-purple)
  const hg = ctx.createLinearGradient(0, horizY-12, 0, horizY+8);
  hg.addColorStop(0, 'rgba(180,150,20,0.18)'); hg.addColorStop(1, 'rgba(80,40,150,0.05)');
  ctx.fillStyle = hg; ctx.fillRect(0, horizY-12, W, 20);
  // Bare struck trees
  for (let i=0;i<8;i++) {
    const tx=Math.round(((i*197+41)%997)/997*W);
    const ty=Math.round(_hillY(tx,horizY,H));
    _lightningTree(ctx,tx,ty,0.5+(i%3)*0.2);
  }
  _lightningTree(ctx,Math.round(W*0.05),Math.round(H*0.88),0.9);
  _lightningTree(ctx,Math.round(W*0.93),Math.round(H*0.88),0.85);
  // Rain streaks
  for (let i = 0; i < 30; i++) {
    const rx2 = ((i * 173 + 41) % W);
    const rPhase = (tick * 0.0014 + i * 0.17) % 1;
    const ry2 = Math.round(rPhase * H * 1.2 - H * 0.1);
    const rAlpha = Math.sin(rPhase * Math.PI) * 0.22;
    if (rAlpha < 0.03) continue;
    ctx.fillStyle = `rgba(160,180,220,${rAlpha.toFixed(2)})`;
    ctx.fillRect(rx2, ry2, 1, 6 + Math.round(rPhase * 4));
  }
  // Storm cloud mass layered over horizon
  for (let ci = 0; ci < 4; ci++) {
    const cX2 = Math.round(W * (0.12 + ci * 0.22));
    const cY2 = Math.round(horizY * (0.55 + ci * 0.08));
    const cW2 = Math.round(W * (0.18 + ci * 0.04));
    const cg = ctx.createRadialGradient(cX2, cY2, 4, cX2, cY2, Math.round(cW2 * 0.55));
    cg.addColorStop(0, 'rgba(18,12,35,0.55)'); cg.addColorStop(1, 'rgba(8,5,18,0)');
    ctx.fillStyle = cg; ctx.fillRect(cX2 - Math.round(cW2 * 0.6), cY2 - Math.round(horizY * 0.12), Math.round(cW2 * 1.2), Math.round(horizY * 0.24));
  }
}

function _lightningTree(ctx, cx, baseY, sc) {
  const s = Math.max(1, Math.round(sc*2));
  ctx.fillStyle = '#1a1428';
  ctx.fillRect(cx-s, baseY-14*s, s*2, 14*s);
  // Singed branches
  ctx.fillRect(cx+s, baseY-12*s, s*5, s);
  ctx.fillRect(cx-s*5, baseY-9*s, s*4, s);
  ctx.fillRect(cx+s, baseY-6*s, s*4, s);
  // Yellow tip glow
  const glow = 0.4 + 0.4*Math.sin(Date.now()*0.008 + cx);
  ctx.fillStyle = `rgba(220,200,40,${glow.toFixed(2)})`;
  ctx.fillRect(cx-s, baseY-14*s, s*2, s);
}

// ──────────────────────────────────────────────────────────────────────────────
// EARTH ZONE — rocky brown terrain, stone formations, cave
// ──────────────────────────────────────────────────────────────────────────────
function _terrainEarth(ctx, W, H, horizY, tick) {
  // Distant mesa plateaus and rock formations
  _mountains(ctx, W, horizY, ['#180e04','#221408','#301a0a'], [19,67,107]);
  // Flat-topped mesa caps (distinctive Earth silhouette)
  [[0.15,0.12],[0.42,0.18],[0.68,0.1],[0.85,0.14]].forEach(([xf,wf],i)=>{
    const mx=Math.round(W*xf), mw=Math.round(W*wf);
    const mh=Math.round(horizY*(0.3+0.15*(i%3)));
    ctx.fillStyle=i%2===0?'#1e1208':'#280f05';
    ctx.fillRect(mx-mw, horizY-mh, mw*2, mh+4);
    // Mesa top highlight
    ctx.fillStyle='#3a1e08';
    ctx.fillRect(mx-mw, horizY-mh, mw*2, 3);
  });
  _hillSilhouette(ctx, W, H, horizY, '#2a1a08');
  _hill2(ctx, W, H, horizY, '#361f08');
  const eg = ctx.createLinearGradient(0, horizY, 0, H);
  eg.addColorStop(0, '#3d2010'); eg.addColorStop(0.5, '#5a3018'); eg.addColorStop(1, '#3a2010');
  ctx.fillStyle = eg;
  ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W;x++) {
    const hy = _hillY(x,horizY,H);
    x===0?ctx.lineTo(0,Math.round(hy)):ctx.lineTo(x,Math.round(hy));
  }
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  // Rock texture rows
  for (let i=0;i<20;i++) {
    const rx = ((i*173+31)%W);
    const ry = Math.round(_hillY(rx,horizY,H)) + ((i*97+13)%(Math.round((H-horizY)*0.85)));
    const rw = 8+(i%7)*3; const rh = 3+(i%3);
    ctx.fillStyle = i%3===0?'#6a4020':i%3===1?'#4a2c10':'#5a3818';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = '#2a1808'; ctx.fillRect(rx+rw, ry, 2, rh);
    ctx.fillStyle = '#7a5028'; ctx.fillRect(rx, ry, rw, 1);
  }
  // Stone formation (right side)
  const stX = Math.round(W*0.75), stY = Math.round(horizY + (H-horizY)*0.35);
  [[0,0,16,28],[16,8,12,20],[28,4,10,24]].forEach(([dx,dy,sw,sh]) => {
    ctx.fillStyle = '#5a3818'; ctx.fillRect(stX+dx, stY+dy, sw, sh);
    ctx.fillStyle = '#7a5030'; ctx.fillRect(stX+dx, stY+dy, sw, 3);
    ctx.fillStyle = '#3a2010'; ctx.fillRect(stX+dx+sw-3, stY+dy, 3, sh);
  });
  // Horizon warm glow
  const hg = ctx.createLinearGradient(0, horizY-12, 0, horizY+8);
  hg.addColorStop(0, 'rgba(140,80,20,0.22)'); hg.addColorStop(1, 'rgba(140,80,20,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, horizY-12, W, 20);
  // Sparse scrubby trees
  for (let i=0;i<10;i++) {
    const tx=Math.round(((i*211+53)%997)/997*W);
    const ty=Math.round(_hillY(tx,horizY,H));
    _scrubTree(ctx,tx,ty,0.4+(i%3)*0.15);
  }
  _scrubTree(ctx,Math.round(W*0.07),Math.round(H*0.87),0.9);
  _scrubTree(ctx,Math.round(W*0.91),Math.round(H*0.87),0.85);
  // Cave entrance in cliff
  const caveX = Math.round(W * 0.10), caveY = Math.round(horizY + (H-horizY)*0.28);
  const caveW = Math.round(W * 0.07), caveH = Math.round((H-horizY) * 0.12);
  ctx.fillStyle = '#0e0804';
  ctx.beginPath(); ctx.ellipse(caveX, caveY, caveW/2, caveH/2, 0, Math.PI, Math.PI*2); ctx.fill();
  ctx.fillRect(caveX - Math.round(caveW/2), caveY, caveW, Math.round(caveH/2));
  const caveGlow = ctx.createRadialGradient(caveX, caveY + caveH*0.2, 2, caveX, caveY + caveH*0.2, caveW*0.5);
  caveGlow.addColorStop(0, 'rgba(120,60,10,0.15)'); caveGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = caveGlow; ctx.fillRect(caveX - caveW, caveY - Math.round(caveH*0.3), caveW*2, Math.round(caveH*1.3));
  // Rock arch (right side)
  const archX = Math.round(W * 0.62), archY = Math.round(horizY + (H-horizY)*0.22);
  const archW = Math.round(W * 0.09), archH = Math.round((H-horizY) * 0.18);
  ctx.fillStyle = '#4a2c10';
  ctx.fillRect(archX, archY, Math.round(archW*0.18), archH);
  ctx.fillRect(archX + Math.round(archW*0.82), archY, Math.round(archW*0.18), archH);
  ctx.fillRect(archX, archY, archW, Math.round(archH*0.22));
  ctx.fillStyle = '#3a2008';
  ctx.fillRect(archX + Math.round(archW*0.18), archY + Math.round(archH*0.22), Math.round(archW*0.64), Math.round(archH*0.08));
}

function _scrubTree(ctx, cx, baseY, sc) {
  const s = Math.max(1, Math.round(sc*2));
  ctx.fillStyle = '#3a2010'; ctx.fillRect(cx-s, baseY-10*s, s*2, 10*s);
  ctx.fillStyle = '#4a2c0f'; ctx.fillRect(cx-3*s, baseY-14*s, 6*s, 5*s);
  ctx.fillRect(cx-2*s, baseY-16*s, 4*s, 3*s);
  ctx.fillStyle = '#5a3818'; ctx.fillRect(cx-4*s, baseY-13*s, 2*s, 2*s);
}

// ──────────────────────────────────────────────────────────────────────────────
// NATURE ZONE — lush green, waterfall + river, rich forest
// ──────────────────────────────────────────────────────────────────────────────
function _terrainNature(ctx, W, H, horizY, tick) {
  // ── 1. FARTHEST: distant mountain range ──
  _mountains(ctx, W, horizY, ['#04100a','#061a0c','#082212'], [11,37,79]);

  // ── 2. BACKGROUND river — drawn before hills so hills overlap it ──
  // River originates near the horizon (between distant mountains) and flows forward
  const rivStartX = Math.round(W*0.48), rivStartY = Math.round(horizY + 4);
  const rivEndX   = Math.round(W*0.62), rivEndY   = Math.round(horizY + (H-horizY)*0.52);
  const rivSteps  = 40;
  for (let rs=0; rs<=rivSteps; rs++) {
    const t = rs/rivSteps;
    const rx = Math.round(rivStartX + (rivEndX-rivStartX)*t + Math.sin(t*Math.PI*3+tick*0.001)*5);
    const ry = Math.round(rivStartY + (rivEndY-rivStartY)*t);
    const rw = Math.round(2 + t*14);
    const flow = 0.5 + 0.5*Math.sin(rx*0.08 + tick*0.003);
    ctx.fillStyle = `rgb(${Math.round(18+8*flow)},${Math.round(80+35*flow)},${Math.round(130+45*flow)})`;
    ctx.fillRect(rx - rw, ry, rw*2, 3+Math.round(t*2));
  }
  // Waterfall from distant cliff — visible in the gap between far and mid hills
  const wfX = Math.round(W*0.48), wfTopY = Math.round(horizY + 2);
  const wfBotY = Math.round(horizY + (H-horizY)*0.18);
  for (let wy=wfTopY; wy<wfBotY; wy+=2) {
    const wobble = Math.round(Math.sin(wy*0.25 + tick*0.008)*2);
    const alpha = 0.55 + 0.3*Math.sin(wy*0.18 + tick*0.012);
    ctx.fillStyle = `rgba(150,210,245,${alpha.toFixed(2)})`;
    ctx.fillRect(wfX + wobble - 2, wy, 5, 2);
  }
  // Mist at waterfall base
  const mist = ctx.createRadialGradient(wfX, wfBotY, 2, wfX, wfBotY, 14);
  mist.addColorStop(0, 'rgba(160,220,255,0.3)'); mist.addColorStop(1, 'rgba(160,220,255,0)');
  ctx.fillStyle = mist; ctx.beginPath(); ctx.ellipse(wfX, wfBotY, 14, 6, 0, 0, Math.PI*2); ctx.fill();

  // ── 3. MID hills — overlap the far river ──
  _hillSilhouette(ctx, W, H, horizY, '#061208');
  _hill2(ctx, W, H, horizY, '#0a1e0c');

  // ── 4. FRONT GROUND ──
  const ng = ctx.createLinearGradient(0, horizY, 0, H);
  ng.addColorStop(0, '#1a4010'); ng.addColorStop(0.5, '#1e4c12'); ng.addColorStop(1, '#162e0a');
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W;x++) {
    const hy = _hillY(x,horizY,H);
    x===0?ctx.lineTo(0,Math.round(hy)):ctx.lineTo(x,Math.round(hy));
  }
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();

  // ── 5. Ground detail — grass tufts and moss ──
  for (let i=0;i<35;i++) {
    const gx = ((i*197+41)%W);
    const gy = Math.round(_hillY(gx,horizY,H)) + ((i*97+13)%(Math.round((H-horizY)*0.75)));
    ctx.fillStyle = i%3===0?'#2a5a14':i%3===1?'#224a10':'#1a3c0c';
    ctx.fillRect(gx, gy, 3, 2);
  }
  // Grass blade clusters on ground surface
  for (let i=0;i<20;i++) {
    const gx = Math.round(((i*263+17)%997)/997*W);
    const gy = Math.round(_hillY(gx,horizY,H));
    ctx.fillStyle = '#2a5a14';
    ctx.fillRect(gx,   gy-5, 1, 5);
    ctx.fillRect(gx+2, gy-7, 1, 7);
    ctx.fillRect(gx+4, gy-4, 1, 4);
  }

  // ── 6. Horizon glow (green mist) ──
  const hg = ctx.createLinearGradient(0, horizY-14, 0, horizY+10);
  hg.addColorStop(0, 'rgba(20,90,10,0.22)'); hg.addColorStop(1, 'rgba(20,90,10,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, horizY-14, W, 24);

  // ── 7. TREES — mid-ground on hill edges, large foreground ──
  // Mid-ground row along hill line (smaller)
  for (let i=0;i<18;i++) {
    const tx=Math.round(((i*197+41)%997)/997*W);
    const ty=Math.round(_hillY(tx,horizY,H));
    (i%3===0?_drawOak:_drawPine)(ctx,tx,ty,0.38+(i%4)*0.12);
  }
  // Large foreground trees
  _drawPine(ctx, Math.round(W*0.04),  Math.round(H*0.87), 1.0);
  _drawOak(ctx,  Math.round(W*0.11),  Math.round(H*0.91), 0.85);
  _drawPine(ctx, Math.round(W*0.18),  Math.round(H*0.89), 0.78);
  _drawOak(ctx,  Math.round(W*0.78),  Math.round(H*0.90), 0.82);
  _drawPine(ctx, Math.round(W*0.87),  Math.round(H*0.88), 0.92);
  _drawOak(ctx,  Math.round(W*0.94),  Math.round(H*0.91), 0.77);
  // Ground mist layer between tree rows
  const mistG = ctx.createLinearGradient(0, Math.round(horizY + (H-horizY)*0.55), 0, Math.round(horizY + (H-horizY)*0.75));
  mistG.addColorStop(0, 'rgba(160,210,190,0.12)'); mistG.addColorStop(1, 'rgba(120,180,160,0)');
  ctx.fillStyle = mistG; ctx.fillRect(0, Math.round(horizY + (H-horizY)*0.55), W, Math.round((H-horizY)*0.20));
  // Fern fronds at foreground tree bases
  [[W*0.05, H*0.91],[W*0.15, H*0.93],[W*0.82, H*0.91],[W*0.92, H*0.93]].forEach(([fx, fy]) => {
    ctx.strokeStyle = '#1a4a0a'; ctx.lineWidth = 2;
    for (let fi = 0; fi < 5; fi++) {
      const angle = (fi / 5) * Math.PI - Math.PI * 0.1;
      const flen = Math.round(W * 0.04);
      ctx.beginPath(); ctx.moveTo(Math.round(fx), Math.round(fy));
      ctx.lineTo(Math.round(fx + Math.cos(angle) * flen), Math.round(fy - Math.sin(angle) * flen * 0.5)); ctx.stroke();
    }
  });
  // Mossy stones scattered on ground
  [[W*0.30, H*0.88],[W*0.48, H*0.90],[W*0.65, H*0.87]].forEach(([sx2, sy2]) => {
    ctx.fillStyle = '#2a4018'; ctx.fillRect(Math.round(sx2)-5, Math.round(sy2)-3, 10, 6);
    ctx.fillStyle = '#3a5a22'; ctx.fillRect(Math.round(sx2)-5, Math.round(sy2)-3, 10, 2);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// PLASMA ZONE — alien purple/magenta ground, glowing crystal spires
// ──────────────────────────────────────────────────────────────────────────────
function _terrainPlasma(ctx, W, H, horizY, tick) {
  // Distant alien crystal mountains
  _mountains(ctx, W, horizY, ['#0e0218','#180330','#220440'], [41,83,127]);
  // Crystal spire glow at peaks
  for (let i=0;i<6;i++){
    const mx=Math.round(((i*197+37)%997)/997*W);
    const mg=ctx.createRadialGradient(mx,horizY,1,mx,horizY,16+i*3);
    mg.addColorStop(0,'rgba(200,100,255,0.2)'); mg.addColorStop(1,'rgba(150,50,200,0)');
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,horizY,16+i*3,0,Math.PI*2); ctx.fill();
  }
  _hillSilhouette(ctx, W, H, horizY, '#1a0428');
  _hill2(ctx, W, H, horizY, '#200530');
  const pg = ctx.createLinearGradient(0, horizY, 0, H);
  pg.addColorStop(0, '#1e0430'); pg.addColorStop(0.5, '#280540'); pg.addColorStop(1, '#180330');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W;x++) {
    const hy = _hillY(x,horizY,H);
    x===0?ctx.lineTo(0,Math.round(hy)):ctx.lineTo(x,Math.round(hy));
  }
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  // Glowing crystal floor veins
  for (let i=0;i<12;i++) {
    const vx = ((i*211+37)%W);
    const vy = Math.round(_hillY(vx,horizY,H)) + ((i*113+19)%(Math.round((H-horizY)*0.8)));
    const glow = 0.3 + 0.4*Math.sin(tick*0.006 + i*1.1);
    ctx.fillStyle = `rgba(${i%2?200:150},40,${i%2?255:200},${glow.toFixed(2)})`;
    ctx.fillRect(vx, vy, 2+(i%4), 1+(i%2));
  }
  // Crystal spires
  for (let i=0;i<10;i++) {
    const sx=Math.round(((i*197+41)%997)/997*W);
    const sy=Math.round(_hillY(sx,horizY,H));
    _crystalSpire(ctx,sx,sy,(0.3+(i%4)*0.15),tick,i);
  }
  _crystalSpire(ctx,Math.round(W*0.07),Math.round(H*0.86),0.9,tick,0);
  _crystalSpire(ctx,Math.round(W*0.92),Math.round(H*0.86),0.85,tick,1);
  _crystalSpire(ctx,Math.round(W*0.13),Math.round(H*0.90),0.65,tick,2);
  _crystalSpire(ctx,Math.round(W*0.86),Math.round(H*0.90),0.65,tick,3);
  // Horizon glow
  const hg = ctx.createLinearGradient(0, horizY-12, 0, horizY+8);
  hg.addColorStop(0, 'rgba(180,20,220,0.22)'); hg.addColorStop(1, 'rgba(180,20,220,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, horizY-12, W, 20);
  // Void ground rifts
  for (let i = 0; i < 6; i++) {
    const rfX = Math.round(((i * 197 + 53) % 997) / 997 * W);
    const rfY = Math.round(_hillY(rfX, horizY, H)) + Math.round((i * 89 + 11) % ((H - horizY) * 0.6));
    const rfGlow = 0.4 + 0.4 * Math.sin(tick * 0.006 + i * 1.3);
    ctx.fillStyle = `rgba(200,60,255,${(rfGlow * 0.35).toFixed(2)})`;
    ctx.fillRect(rfX, rfY, 14 + i * 3, 2);
    ctx.strokeStyle = `rgba(180,40,255,${rfGlow.toFixed(2)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rfX, rfY); ctx.lineTo(rfX + 14 + i * 3, rfY + 3); ctx.stroke();
  }
  // Alien stalks with glowing caps
  [[W*0.22,H*0.82],[W*0.55,H*0.84],[W*0.78,H*0.80]].forEach(([ax2, ay2], i) => {
    const stGlow = 0.5 + 0.4 * Math.sin(tick * 0.004 + i * 1.5);
    ctx.fillStyle = '#2a0840'; ctx.fillRect(Math.round(ax2)-2, Math.round(ay2)-14, 4, 14);
    ctx.fillStyle = `rgba(${i%2?200:140},40,255,${stGlow.toFixed(2)})`;
    ctx.fillRect(Math.round(ax2)-7, Math.round(ay2)-18, 14, 5);
    ctx.fillRect(Math.round(ax2)-5, Math.round(ay2)-20, 10, 3);
    ctx.fillRect(Math.round(ax2)-3, Math.round(ay2)-21, 6, 2);
    const capG = ctx.createRadialGradient(Math.round(ax2), Math.round(ay2)-16, 0, Math.round(ax2), Math.round(ay2)-16, 10);
    capG.addColorStop(0, `rgba(200,100,255,${(stGlow*0.4).toFixed(2)})`); capG.addColorStop(1, 'transparent');
    ctx.fillStyle = capG; ctx.fillRect(Math.round(ax2)-12, Math.round(ay2)-24, 24, 16);
  });
}

function _crystalSpire(ctx, cx, baseY, sc, tick, seed) {
  const s = Math.max(1, Math.round(sc*2));
  const h = 14*s;
  const glow = 0.5 + 0.4*Math.sin(tick*0.005 + seed*0.9);
  // Main spire
  ctx.fillStyle = `rgba(160,40,220,${(0.7+0.2*glow).toFixed(2)})`;
  for (let row=0;row<h;row++) {
    const w = Math.max(1, Math.round((1 - row/h) * 3*s));
    ctx.fillRect(cx - w, baseY - row, w*2, 1);
  }
  // Glow
  ctx.fillStyle = `rgba(220,100,255,${(glow*0.5).toFixed(2)})`;
  ctx.fillRect(cx-s, baseY-h, s*2, h);
  // Side facets
  ctx.fillStyle = `rgba(100,20,180,0.8)`;
  for (let row=0;row<h;row++) {
    const w = Math.max(1, Math.round((1-row/h)*3*s));
    ctx.fillRect(cx+w-s, baseY-row, s, 1);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AIR ZONE — misty white/gray, floating rock platforms, wispy trees
// ──────────────────────────────────────────────────────────────────────────────
function _terrainAir(ctx, W, H, horizY, tick) {
  // Night sky — full background
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   '#03050d');
  sky.addColorStop(0.5, '#07101e');
  sky.addColorStop(1,   '#0d1a2e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // Stars
  const seeds=[17,31,53,79,101,127,149,163,193,211,233,251,269,281,307,331,353,373,397,419,443,461,487,503,521,541,557,571,587,601,619,641];
  seeds.forEach((s,i)=>{
    const sx=(s*37+i*83)%W, sy=(s*53+i*61)%(H*0.88);
    ctx.fillStyle=`rgba(220,230,255,${(0.35+i%5*0.12).toFixed(2)})`;
    ctx.fillRect(sx,sy,i%9===0?2:1,i%9===0?2:1);
  });

  // Moon (top-right)
  const mx=Math.round(W*0.84), my=Math.round(H*0.10);
  ctx.fillStyle='#ddeeff'; ctx.fillRect(mx-7,my-7,14,14);
  ctx.fillStyle='#0a1422'; ctx.fillRect(mx+2,my-6,6,12);
  // No platforms here — drawn per-node and at player origin
  // Layered cloud formations drifting across sky
  const cloudLayers = [
    { yf: 0.18, count: 3, alpha: 0.08, speed: 0.04 },
    { yf: 0.30, count: 4, alpha: 0.06, speed: 0.025 },
    { yf: 0.45, count: 5, alpha: 0.05, speed: 0.015 },
  ];
  cloudLayers.forEach(({ yf, count, alpha, speed }) => {
    for (let ci = 0; ci < count; ci++) {
      const cX2 = ((tick * speed + ci * (W / count + 40)) % (W + 120)) - 60;
      const cY2 = Math.round(H * yf + Math.sin(tick * 0.003 + ci) * 5);
      const cW3 = 60 + ci * 20;
      const clg = ctx.createLinearGradient(cX2, cY2, cX2, cY2 + 18);
      clg.addColorStop(0, `rgba(140,170,220,${alpha})`);
      clg.addColorStop(0.5, `rgba(160,190,240,${(alpha*0.7).toFixed(2)})`);
      clg.addColorStop(1, 'transparent');
      ctx.fillStyle = clg;
      ctx.fillRect(Math.round(cX2), cY2, cW3, 18);
      ctx.fillRect(Math.round(cX2) + 8, cY2 - 7, cW3 - 16, 10);
    }
  });
  // Shooting star (occasional)
  const sStar = (tick * 0.001) % 1;
  if (sStar > 0.85) {
    const ssProg = (sStar - 0.85) / 0.15;
    const ssX = Math.round(W * 0.1 + ssProg * W * 0.5);
    const ssY = Math.round(H * 0.06 + ssProg * H * 0.08);
    ctx.fillStyle = `rgba(240,245,255,${(1 - ssProg).toFixed(2)})`;
    ctx.fillRect(ssX, ssY, 4, 1);
    ctx.fillStyle = `rgba(200,215,255,${((1-ssProg)*0.5).toFixed(2)})`;
    ctx.fillRect(ssX + 4, ssY, 6, 1);
  }
}

function _cloudPlatform(ctx, cx, cy, w, h, bright) {
  // Pixel-art cloud: flat bottom bar + uneven bumps on top
  const base = bright ? '#c0d8f4' : '#5a7898';
  const mid  = bright ? '#a8c8e8' : '#4a6880';
  const top  = bright ? '#e8f4ff' : '#80a8c8';
  const shad = bright ? 'rgba(80,120,180,0.18)' : 'rgba(10,25,55,0.40)';

  const l = cx - Math.round(w/2);
  const bodyTop = cy + Math.round(h * 0.45);
  const bodyH   = Math.round(h * 0.55);

  // Drop shadow
  ctx.fillStyle = shad;
  ctx.fillRect(l + 4, cy + h + 3, w - 4, 4);

  // Flat bottom body
  ctx.fillStyle = mid;
  ctx.fillRect(l, bodyTop, w, bodyH);

  // Bumps — varied widths and heights for organic look
  const bumpDefs = w > 70
    ? [{ox:0.10,bw:0.28,bh:0.70},{ox:0.30,bw:0.24,bh:0.55},{ox:0.50,bw:0.30,bh:0.80},{ox:0.72,bw:0.22,bh:0.55}]
    : w > 44
    ? [{ox:0.10,bw:0.35,bh:0.72},{ox:0.38,bw:0.28,bh:0.55},{ox:0.62,bw:0.30,bh:0.68}]
    : [{ox:0.12,bw:0.40,bh:0.70},{ox:0.52,bw:0.36,bh:0.55}];

  bumpDefs.forEach(({ox,bw,bh})=>{
    const bx = l + Math.round(ox * w);
    const bwPx = Math.round(bw * w);
    const bhPx = Math.round(bh * h * 0.6);
    const bTop = bodyTop - bhPx;
    ctx.fillStyle = base;
    ctx.fillRect(bx, bTop + 2, bwPx, bhPx + bodyH - 2);
    // Top highlight pixel row
    ctx.fillStyle = top;
    ctx.fillRect(bx + 1, bTop, bwPx - 2, 2);
    // Side pixel caps
    ctx.fillStyle = base;
    ctx.fillRect(bx - 1, bTop + 2, 1, bhPx - 2);
    ctx.fillRect(bx + bwPx, bTop + 2, 1, bhPx - 2);
  });

  // Top highlight on body edge
  ctx.fillStyle = top;
  ctx.fillRect(l + 1, bodyTop, w - 2, 1);
}

// ──────────────────────────────────────────────────────────────────────────────
// DISPATCHER
// ──────────────────────────────────────────────────────────────────────────────
function _drawTerrain(ctx, W, H, horizY, tick) {
  const el = (typeof currentZoneElement !== 'undefined' && currentZoneElement) ? currentZoneElement : ((typeof playerElement !== 'undefined') ? playerElement : 'Earth');
  switch(el) {
    case 'Fire':      _terrainFire(ctx, W, H, horizY, tick);      break;
    case 'Water':     _terrainWater(ctx, W, H, horizY, tick);     break;
    case 'Ice':       _terrainIce(ctx, W, H, horizY, tick);       break;
    case 'Lightning': _terrainLightning(ctx, W, H, horizY, tick); break;
    case 'Earth':     _terrainEarth(ctx, W, H, horizY, tick);     break;
    case 'Nature':    _terrainNature(ctx, W, H, horizY, tick);    break;
    case 'Plasma':    _terrainPlasma(ctx, W, H, horizY, tick);    break;
    case 'Air':       _terrainAir(ctx, W, H, horizY, tick);       break;
    default:          _terrainEarth(ctx, W, H, horizY, tick);     break;
  }
}

// These are still used by Nature zone directly
function _drawFgTrees(ctx, W, H, horizY) {
  // No-op: each zone handles its own foreground trees
}

// ── Ground-Hugging Perspective Dirt Road ─────────────────────────────────────
// Static S-curve pixel path from player origin to a node, themed to current zone.
function _drawGroundPath(ctx, ox, oy, nx, ny, nodeColor, W, H, horizY, pathBias) {
  const dist = Math.sqrt((nx-ox)**2 + (ny-oy)**2);
  if (dist < 2) return;
  const STEPS = Math.max(48, Math.round(dist / 2));

  // Zone-themed path colors
  const el = (typeof currentZoneElement !== 'undefined' && currentZoneElement) ? currentZoneElement : 'Earth';
  const pathColors = {
    Fire:      { main:'#5a2a10', edge:'#8a3a10' },
    Water:     { main:'#0a2a4a', edge:'#1a4a7a' },
    Ice:       { main:'#c8eeff', edge:'#a0d8f0' },
    Lightning: { main:'#2a2a10', edge:'#6a6a10' },
    Earth:     { main:'#4a3010', edge:'#6a4a18' },
    Nature:    { main:'#1a3a10', edge:'#2a5a18' },
    Plasma:    { main:'#2a0a3a', edge:'#6a1a8a' },
    Air:       { main:'#a8c0d8', edge:'#d0e4f4' },
  };
  const col = pathColors[el] || pathColors.Earth;

  // Bezier control points — biased by pathBias
  const dx = nx - ox, dy = ny - oy;
  const px = -dy / dist, py = dx / dist; // perpendicular unit vector
  let cp1x, cp1y, cp2x, cp2y;
  if (pathBias === 'straight') {
    // Dead straight — no swing
    cp1x = ox + dx*0.33; cp1y = oy + dy*0.33;
    cp2x = ox + dx*0.67; cp2y = oy + dy*0.67;
  } else if (pathBias === 'right') {
    // Swing hard right (positive perp) — arcs around campfire on the right side
    const swing = Math.min(dist * 0.22, W * 0.14);
    cp1x = ox + dx*0.25 + px * (-swing); cp1y = oy + dy*0.25 + py * (-swing);
    cp2x = ox + dx*0.75 + px * (-swing); cp2y = oy + dy*0.75 + py * (-swing);
  } else {
    // Default S-curve
    const swing = Math.min(dist * 0.28, 60);
    cp1x = ox + dx*0.25 + px*swing; cp1y = oy + dy*0.25 + py*swing;
    cp2x = ox + dx*0.75 - px*swing; cp2y = oy + dy*0.75 - py*swing;
  }

  const bez = (t) => {
    const u = 1-t;
    return {
      x: Math.round(u*u*u*ox + 3*u*u*t*cp1x + 3*u*t*t*cp2x + t*t*t*nx),
      y: Math.round(u*u*u*oy + 3*u*u*t*cp1y + 3*u*t*t*cp2y + t*t*t*ny),
    };
  };

  const pts = [];
  for (let s = 0; s <= STEPS; s++) pts.push(bez(s / STEPS));

  // Shadow
  for (let s = 0; s <= STEPS; s++) {
    const { x, y } = pts[s];
    const hw = Math.max(3, Math.round(7 - (s/STEPS)*4)) + 2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - hw, y + 2, hw*2, 3);
  }

  // Edge band
  for (let s = 0; s <= STEPS; s++) {
    const { x, y } = pts[s];
    const hw = Math.max(3, Math.round(7 - (s/STEPS)*4)) + 1;
    ctx.fillStyle = col.edge;
    ctx.fillRect(x - hw, y - 2, hw*2, 4);
  }

  // Main fill
  for (let s = 0; s <= STEPS; s++) {
    const { x, y } = pts[s];
    const hw = Math.max(3, Math.round(7 - (s/STEPS)*4));
    ctx.fillStyle = col.main;
    ctx.fillRect(x - hw, y - 1, hw*2, 3);
  }
}

// Air zone: sparse stepping-stone cloud path
function _drawAirCloudPath(ctx, ox, oy, nx, ny) {
  const dist = Math.sqrt((nx-ox)**2 + (ny-oy)**2);
  if(dist < 4) return;
  // Dotted white path — small pixel dots spaced along line
  const dotSpacing = 10;
  const numDots = Math.floor(dist / dotSpacing);
  const dx = nx - ox, dy = ny - oy;
  ctx.save();
  for(let d = 1; d < numDots; d++){
    const t = d / numDots;
    const px = Math.round(ox + dx * t);
    const py = Math.round(oy + dy * t);
    const alpha = 0.15 + 0.20 * Math.sin(t * Math.PI); // fade at edges
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#c8dff8';
    ctx.fillRect(px - 1, py - 1, 2, 2);
  }
  ctx.restore();
}

// Air zone: draw a node as a cloud platform with label + enemy sprites on top
function _drawAirCloudNode(ctx, node, hovered, tick) {
  const { x, y, type, sprites, color, label } = node;
  // Cloud is smaller and positioned so sprites sit on top
  const padW = hovered ? 80 : 72;
  const padH = 18;
  const cloudY = y + 10; // cloud sits below node center

  // Hover glow (subtle, behind cloud)
  if(hovered){
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color || '#90c0f0';
    ctx.fillRect(x - padW/2 - 6, cloudY - 14, padW + 12, padH + 22);
    ctx.restore();
  }

  // Cloud pad
  _cloudPlatform(ctx, x, cloudY, padW, padH, false);

  // Sprites standing on top of cloud
  if((type === 'combat' || type === 'pack') && sprites && sprites.length){
    _drawNodeSprites(ctx, x, cloudY - 10, sprites, hovered);
  } else {
    _drawNodeIcon(ctx, x, cloudY - 10, node, hovered, tick);
  }

  // Label below cloud
  ctx.save();
  ctx.font = `bold ${hovered ? 10 : 8}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = hovered ? '#ffe8a0' : '#90b8d8';
  ctx.globalAlpha = hovered ? 0.95 : 0.65;
  ctx.fillText(label || '', x, cloudY + padH + 10);
  ctx.restore();
}

// ── Animated world campfire (drawn directly into scene) ─────────────────────
// Sparkle particle state
const _cfSparks = [];
// ═══ ZONE AMBIENT DETAILS ══════════════════════════════════════════════════════
// Small animated critters, particles, and decorations that bring each zone to life.
function _drawZoneDetails(ctx, W, H, horizY, tick) {
  const el = (typeof currentZoneElement !== 'undefined' && currentZoneElement) ? currentZoneElement : ((typeof playerElement !== 'undefined') ? playerElement : 'Earth');
  const fg = H - horizY;

  switch(el) {
    case 'Fire':      _zoneDetailFire(ctx, W, H, horizY, fg, tick);      break;
    case 'Water':     _zoneDetailWater(ctx, W, H, horizY, fg, tick);     break;
    case 'Ice':       _zoneDetailIce(ctx, W, H, horizY, fg, tick);       break;
    case 'Lightning': _zoneDetailLightning(ctx, W, H, horizY, fg, tick); break;
    case 'Earth':     _zoneDetailEarth(ctx, W, H, horizY, fg, tick);     break;
    case 'Nature':    _zoneDetailNature(ctx, W, H, horizY, fg, tick);    break;
    case 'Plasma':    _zoneDetailPlasma(ctx, W, H, horizY, fg, tick);    break;
    case 'Air':       _zoneDetailAir(ctx, W, H, horizY, fg, tick);       break;
  }
}

function _zoneDetailFire(ctx, W, H, horizY, fg, tick) {
  // Floating embers
  for (let i = 0; i < 14; i++) {
    const phase = (tick * 0.0007 + i * 0.52) % 1;
    const ex = ((i * 211 + 37) % W) + Math.round(Math.sin(tick * 0.001 + i) * 8);
    const ey = Math.round(H - phase * fg * 0.85);
    const alpha = Math.sin(phase * Math.PI);
    if (alpha < 0.05) continue;
    ctx.fillStyle = `rgba(255,${Math.round(80 + 120 * (1-phase))},0,${(alpha * 0.9).toFixed(2)})`;
    ctx.fillRect(ex, ey, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
  }
  // Fire skull rocks (decorative)
  [[W*0.18, H*0.80], [W*0.72, H*0.82]].forEach(([sx, sy]) => {
    ctx.fillStyle = '#1a0804';
    ctx.fillRect(Math.round(sx)-5, Math.round(sy)-4, 10, 8);
    ctx.fillStyle = '#cc3300';
    ctx.fillRect(Math.round(sx)-2, Math.round(sy)-2, 2, 2);
    ctx.fillRect(Math.round(sx)+1, Math.round(sy)-2, 2, 2);
  });
  // Smoke wisps from lava river
  for (let i = 0; i < 5; i++) {
    const sx = Math.round(W * (0.2 + i * 0.15));
    const sy = Math.round(H * 0.59);
    const phase = (tick * 0.0005 + i * 0.4) % 1;
    const alpha = Math.sin(phase * Math.PI) * 0.25;
    const drift = Math.round(Math.sin(tick * 0.001 + i) * 4);
    ctx.fillStyle = `rgba(80,30,10,${alpha.toFixed(2)})`;
    ctx.fillRect(sx + drift, sy - Math.round(phase * 28), 4, 6);
  }
  // Volcanic rocks scattered in foreground
  [[W*0.38,H*0.87],[W*0.58,H*0.91],[W*0.25,H*0.84]].forEach(([rx,ry]) => {
    ctx.fillStyle='#1c0806'; ctx.fillRect(Math.round(rx)-6,Math.round(ry)-3,12,6);
    ctx.fillStyle='#2a0c08'; ctx.fillRect(Math.round(rx)-6,Math.round(ry)-3,12,2);
    ctx.fillStyle='#cc3300'; ctx.fillRect(Math.round(rx)-2,Math.round(ry),4,1);
  });
  // Lava geyser (periodic eruption)
  const geyserX = Math.round(W * 0.58);
  const geyserPhase = (tick * 0.0005) % 1;
  if (geyserPhase < 0.15) {
    const eruptA = Math.sin(geyserPhase / 0.15 * Math.PI);
    const gH = Math.round(H * 0.08 * eruptA);
    const gBase = Math.round(H * 0.65);
    ctx.fillStyle = `rgba(255,80,0,${(0.6 * eruptA).toFixed(2)})`;
    ctx.fillRect(geyserX - 3, gBase - gH, 6, gH);
    ctx.fillRect(geyserX - 5, gBase - gH, 10, 3);
    const gg = ctx.createRadialGradient(geyserX, gBase - gH, 0, geyserX, gBase - gH, 14);
    gg.addColorStop(0, `rgba(255,120,0,${(0.4*eruptA).toFixed(2)})`); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg; ctx.fillRect(geyserX - 16, gBase - gH - 16, 32, 32);
  }
}

function _zoneDetailWater(ctx, W, H, horizY, fg, tick) {
  // Seagulls (simple pixel Vs)
  const gullSeeds = [0.25, 0.52, 0.71, 0.38];
  gullSeeds.forEach((seed, i) => {
    const gx = Math.round(W * seed + Math.sin(tick * 0.0004 + i) * 12);
    const gy = Math.round(horizY * (0.3 + seed * 0.25) + Math.sin(tick * 0.0008 + i * 1.3) * 6);
    ctx.fillStyle = 'rgba(200,215,235,0.8)';
    ctx.fillRect(gx-3, gy, 2, 1); ctx.fillRect(gx-1, gy-1, 2, 1); ctx.fillRect(gx+1, gy, 2, 1);
  });
  // Starfish on beach
  [[W*0.35,H*0.80],[W*0.55,H*0.81],[W*0.68,H*0.79]].forEach(([sx,sy]) => {
    ctx.fillStyle='#cc7730';
    ctx.fillRect(Math.round(sx)-1,Math.round(sy)-3,2,6);
    ctx.fillRect(Math.round(sx)-3,Math.round(sy)-1,6,2);
  });
  // Crab near shore
  const crabX = Math.round(W * 0.44 + Math.sin(tick * 0.0006) * 10);
  const crabY = Math.round(H * 0.84);
  ctx.fillStyle='#cc3311';
  ctx.fillRect(crabX-3,crabY-2,6,4);
  ctx.fillRect(crabX-5,crabY-1,2,2); ctx.fillRect(crabX+3,crabY-1,2,2);
  ctx.fillStyle='#000'; ctx.fillRect(crabX-2,crabY-2,1,1); ctx.fillRect(crabX+1,crabY-2,1,1);
  // Bubbles rising from ocean
  for (let i = 0; i < 6; i++) {
    const bx = Math.round(W * (0.05 + i * 0.16));
    const phase = (tick * 0.0006 + i * 0.35) % 1;
    const by = Math.round(H * (0.88 - phase * 0.12));
    ctx.fillStyle = `rgba(160,210,240,${(0.5 - phase * 0.4).toFixed(2)})`;
    ctx.fillRect(bx, by, 2, 2);
  }
  // Treasure chest half-buried in sand
  ctx.fillStyle='#8a5a20'; ctx.fillRect(Math.round(W*0.62),Math.round(H*0.82),10,7);
  ctx.fillStyle='#c8901c'; ctx.fillRect(Math.round(W*0.62),Math.round(H*0.82),10,3);
  ctx.fillStyle='#f0c040'; ctx.fillRect(Math.round(W*0.66),Math.round(H*0.84),3,2);
  // Jellyfish in ocean
  for (let i = 0; i < 3; i++) {
    const jx = Math.round(W * (0.15 + i * 0.28) + Math.sin(tick * 0.0005 + i * 1.2) * 8);
    const jy = Math.round(H * (0.87 + Math.sin((tick * 0.0004 + i * 0.5) * Math.PI * 2) * 0.02));
    const jAlpha = 0.35 + 0.2 * Math.sin(tick * 0.003 + i);
    ctx.fillStyle = `rgba(180,120,255,${jAlpha.toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(jx, jy, 6, 4, 0, Math.PI, Math.PI*2); ctx.fill();
    for (let t2 = 0; t2 < 4; t2++) {
      ctx.fillStyle = `rgba(200,140,255,${(jAlpha * 0.6).toFixed(2)})`;
      ctx.fillRect(jx - 4 + t2 * 3, jy, 1, 4 + Math.round(Math.sin(tick * 0.002 + t2) * 2));
    }
  }
}

function _zoneDetailIce(ctx, W, H, horizY, fg, tick) {
  // Snowflakes drifting
  for (let i = 0; i < 18; i++) {
    const phase = (tick * 0.0004 + i * 0.31) % 1;
    const sx = ((i * 211 + 37) % W) + Math.round(Math.sin(tick * 0.0008 + i) * 6);
    const sy = Math.round(H * phase);
    const alpha = 0.5 + 0.4 * Math.sin(phase * Math.PI);
    ctx.fillStyle = `rgba(220,240,255,${alpha.toFixed(2)})`;
    const size = i % 4 === 0 ? 3 : 2;
    ctx.fillRect(sx, sy, size, size);
    // Crosshair flake arms
    if (i % 5 === 0) { ctx.fillRect(sx-1, sy+1, size+2, 1); ctx.fillRect(sx+1, sy-1, 1, size+2); }
  }
  // Polar bear (simple pixel blob)
  const bearX = Math.round(W * 0.62 + Math.sin(tick * 0.0002) * 5);
  const bearY = Math.round(H * 0.75);
  ctx.fillStyle = '#d8eeff';
  ctx.fillRect(bearX, bearY-4, 12, 8);    // body
  ctx.fillRect(bearX+10, bearY-7, 6, 6);  // head
  ctx.fillStyle = '#000';
  ctx.fillRect(bearX+13, bearY-6, 1, 1);  // eye
  ctx.fillStyle = '#c0d8f0';
  ctx.fillRect(bearX, bearY+4, 3, 3); ctx.fillRect(bearX+4, bearY+4, 3, 3); // front legs
  ctx.fillRect(bearX+7, bearY+4, 3, 3); ctx.fillRect(bearX+10, bearY+4, 3, 3); // rear legs
  // Penguin
  const penX = Math.round(W * 0.32);
  const penY = Math.round(H * 0.77);
  ctx.fillStyle='#111'; ctx.fillRect(penX-2,penY-6,6,10);
  ctx.fillStyle='#eee'; ctx.fillRect(penX-1,penY-4,4,6);
  ctx.fillStyle='#f80'; ctx.fillRect(penX,penY+4,2,2);
  ctx.fillStyle='#111'; ctx.fillRect(penX-1,penY-5,2,2);
  // Frozen treasure under ice
  ctx.fillStyle='rgba(120,190,230,0.5)'; ctx.fillRect(Math.round(W*0.48),Math.round(H*0.83),14,6);
  ctx.fillStyle='rgba(240,200,40,0.5)';  ctx.fillRect(Math.round(W*0.50),Math.round(H*0.84),6,4);
  // Wind-driven snow drift streaks
  for (let i = 0; i < 8; i++) {
    const dPhase = (tick * 0.0005 + i * 0.145) % 1;
    const dx2 = Math.round(dPhase * (W + 60) - 30);
    const dy2 = Math.round(H * (0.65 + (i * 0.04) % 0.2) + Math.sin(dPhase * Math.PI * 4) * 4);
    const dAlpha = Math.sin(dPhase * Math.PI) * 0.2;
    ctx.fillStyle = `rgba(220,240,255,${dAlpha.toFixed(2)})`;
    ctx.fillRect(dx2, dy2, 8 + i * 2, 1);
  }
  // Ice crystal clusters
  [[W*0.20, H*0.84],[W*0.68, H*0.82]].forEach(([icx2, icy2]) => {
    for (let c = 0; c < 5; c++) {
      const cH2 = 4 + c * 3;
      const cX3 = Math.round(icx2) - 6 + c * 3;
      ctx.fillStyle = `rgba(160,220,255,${(0.5 + c * 0.08).toFixed(2)})`;
      for (let row = 0; row < cH2; row++) {
        const cw = Math.max(1, Math.round((1 - row/cH2) * 2));
        ctx.fillRect(cX3 - cw, Math.round(icy2) - row, cw*2, 1);
      }
    }
  });
}

function _zoneDetailLightning(ctx, W, H, horizY, fg, tick) {
  // Small spark particles
  for (let i = 0; i < 10; i++) {
    const phase = (tick * 0.0009 + i * 0.27) % 1;
    const sx = ((i * 197 + 41) % W) + Math.round(Math.sin(tick * 0.001 + i) * 5);
    const sy = Math.round(H * (0.55 + phase * 0.38));
    const alpha = Math.sin(phase * Math.PI);
    if (alpha < 0.1) continue;
    ctx.fillStyle = `rgba(${200 + Math.round(55 * alpha)},${160 + Math.round(80 * alpha)},40,${alpha.toFixed(2)})`;
    ctx.fillRect(sx, sy, 2, 2);
  }
  // Broken stone pillar (left)
  const px = Math.round(W * 0.20), py = Math.round(H * 0.64);
  ctx.fillStyle='#1c1830'; ctx.fillRect(px-5,py,10,H-py);
  ctx.fillStyle='#2a2448'; ctx.fillRect(px-5,py,10,3);
  ctx.fillStyle='#1c1830'; ctx.fillRect(px-6,py-4,12,5); // broken top
  ctx.fillStyle='#2a2448'; ctx.fillRect(px-6,py-4,12,2);
  // Second pillar (right, taller)
  const px2 = Math.round(W * 0.78), py2 = Math.round(H * 0.58);
  ctx.fillStyle='#1c1830'; ctx.fillRect(px2-4,py2,8,H-py2);
  ctx.fillStyle='#2a2448'; ctx.fillRect(px2-4,py2,8,3);
  ctx.fillRect(px2-5,py2-6,10,7);
  ctx.fillStyle='#2a2448'; ctx.fillRect(px2-5,py2-6,10,2);
  // Glowing storm orb (ambient)
  const orbX = Math.round(W * 0.5), orbY = Math.round(horizY * 0.4 + Math.sin(tick*0.001)*8);
  const orbGlow = 0.3 + 0.2*Math.sin(tick*0.003);
  ctx.fillStyle=`rgba(200,180,255,${orbGlow.toFixed(2)})`; ctx.fillRect(orbX-3,orbY-3,6,6);
  ctx.fillStyle=`rgba(255,240,100,${(orbGlow*0.6).toFixed(2)})`; ctx.fillRect(orbX-1,orbY-1,2,2);
  // Lightning-struck tree stump
  const stX=Math.round(W*0.41), stY=Math.round(H*0.80);
  ctx.fillStyle='#100c20'; ctx.fillRect(stX-4,stY-8,8,12);
  ctx.fillStyle='#1a1630'; ctx.fillRect(stX-4,stY-8,8,2);
  if((tick%900)<100){ ctx.fillStyle='rgba(220,200,60,0.7)'; ctx.fillRect(stX-1,stY-9,2,2); }
  // Rain streaks over battlefield
  for (let i = 0; i < 20; i++) {
    const rPhase2 = (tick * 0.0012 + i * 0.13) % 1;
    const rx3 = ((i * 211 + 57) % W);
    const ry3 = Math.round(rPhase2 * H * 1.1 - H * 0.05);
    const rA = Math.sin(rPhase2 * Math.PI) * 0.18;
    if (rA < 0.02) continue;
    ctx.fillStyle = `rgba(140,160,220,${rA.toFixed(2)})`;
    ctx.fillRect(rx3, ry3, 1, 5);
  }
  // Ground electric tendril (low arc on floor)
  const arcTick2 = (tick * 0.0015) % 1;
  if (arcTick2 < 0.08) {
    const baseY3 = Math.round(H * 0.76);
    const arcFade = 1 - arcTick2 / 0.08;
    ctx.strokeStyle = `rgba(220,200,60,${(0.5 * arcFade).toFixed(2)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(W*0.38), baseY3);
    for (let s = 0; s < 5; s++) {
      ctx.lineTo(Math.round(W*0.38 + s*10), baseY3 - Math.round(((s*97+13)%5)));
    }
    ctx.stroke();
  }
}

function _zoneDetailEarth(ctx, W, H, horizY, fg, tick) {
  // Glowing mushrooms
  const mushPos = [[W*0.22,H*0.82],[W*0.46,H*0.85],[W*0.68,H*0.80],[W*0.32,H*0.79]];
  mushPos.forEach(([mx,my],i) => {
    const glow = 0.4 + 0.3*Math.sin(tick*0.004+i*1.1);
    ctx.fillStyle='#3a2010'; ctx.fillRect(Math.round(mx)-1,Math.round(my)-4,2,5);
    ctx.fillStyle=`rgba(${i%2?80:160},${i%2?200:80},${i%2?60:200},${(0.7+0.2*glow).toFixed(2)})`;
    ctx.fillRect(Math.round(mx)-4,Math.round(my)-7,8,4);
    ctx.fillRect(Math.round(mx)-3,Math.round(my)-8,6,2);
    ctx.fillStyle=`rgba(255,255,255,${(glow*0.4).toFixed(2)})`;
    ctx.fillRect(Math.round(mx)-2,Math.round(my)-8,2,2);
  });
  // Butterfly
  const bfx=Math.round(W*0.5+Math.sin(tick*0.001)*20), bfy=Math.round(H*0.72+Math.sin(tick*0.0015)*8);
  const bfFlap=Math.sin(tick*0.012)>0;
  ctx.fillStyle='rgba(200,140,40,0.8)';
  if(bfFlap){ctx.fillRect(bfx-5,bfy-2,4,4);ctx.fillRect(bfx+1,bfy-2,4,4);}
  else{ctx.fillRect(bfx-4,bfy-1,3,3);ctx.fillRect(bfx+1,bfy-1,3,3);}
  ctx.fillStyle='#1a0a04'; ctx.fillRect(bfx-1,bfy-3,2,6);
  // Ancient ruins wall segment
  const rwX=Math.round(W*0.15), rwY=Math.round(H*0.75);
  for(let b=0;b<3;b++){
    ctx.fillStyle=b%2===0?'#5a3818':'#4a2c10';
    ctx.fillRect(rwX,rwY+b*5,24,4);
    ctx.fillStyle='#3a2008'; ctx.fillRect(rwX,rwY+b*5+3,24,1);
    ctx.fillStyle='#6a4828'; ctx.fillRect(rwX,rwY+b*5,24,1);
  }
  // Earthworm
  const ewX=Math.round(W*0.60), ewY=Math.round(H*0.88);
  ctx.fillStyle='#8a5030';
  for(let s=0;s<4;s++){const sx=ewX+s*4,sy=ewY+Math.round(Math.sin(tick*0.003+s)*2);ctx.fillRect(sx,sy,4,3);}
  // Scorpion
  const scX = Math.round(W * 0.74 + Math.sin(tick * 0.0004) * 8);
  const scY = Math.round(H * 0.84);
  ctx.fillStyle = '#5a3010';
  ctx.fillRect(scX - 4, scY - 3, 8, 5);
  ctx.fillRect(scX - 6, scY - 2, 3, 2);
  ctx.fillRect(scX + 3, scY - 2, 3, 2);
  ctx.fillStyle = '#7a4018';
  ctx.fillRect(scX + 4, scY - 3, 2, 2);
  ctx.fillRect(scX + 6, scY - 5, 2, 2);
  ctx.fillRect(scX + 7, scY - 7, 2, 2);
  ctx.fillStyle = '#cc8830'; ctx.fillRect(scX + 8, scY - 8, 2, 2);
  // Tumbleweed rolling across
  const twPhase = (tick * 0.0004) % 1;
  const twX = Math.round(twPhase * (W + 30) - 15);
  const twY = Math.round(H * 0.80 + Math.sin(twPhase * Math.PI * 8) * 3);
  ctx.strokeStyle = 'rgba(120,80,30,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(twX, twY, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(twX - 5, twY - 3); ctx.lineTo(twX + 5, twY + 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(twX + 5, twY - 3); ctx.lineTo(twX - 5, twY + 3); ctx.stroke();
}

function _zoneDetailNature(ctx, W, H, horizY, fg, tick) {
  // Fireflies
  for(let i=0;i<8;i++){
    const fx=((i*211+37)%W)+Math.round(Math.sin(tick*0.001+i*0.7)*12);
    const fy=Math.round(H*(0.55+Math.sin(tick*0.0008+i*1.1)*0.08)+fg*(0.1+i*0.05));
    const glow=0.4+0.55*Math.sin(tick*0.007+i*1.3);
    if(glow>0.5){ctx.fillStyle=`rgba(180,255,80,${(glow*0.8).toFixed(2)})`;ctx.fillRect(fx,fy,2,2);}
  }
  // Deer (left side)
  const deerX=Math.round(W*0.14+Math.sin(tick*0.0003)*6), deerY=Math.round(H*0.75);
  ctx.fillStyle='#8a5020';
  ctx.fillRect(deerX,deerY-10,12,8);    // body
  ctx.fillRect(deerX+10,deerY-14,5,6); // neck+head
  ctx.fillStyle='#000'; ctx.fillRect(deerX+13,deerY-13,1,1); // eye
  ctx.fillStyle='#8a5020';
  ctx.fillRect(deerX+1,deerY-2,2,6); ctx.fillRect(deerX+4,deerY-2,2,6); // front legs
  ctx.fillRect(deerX+7,deerY-2,2,6); ctx.fillRect(deerX+10,deerY-2,2,6); // back legs
  // Antlers
  ctx.fillStyle='#7a4818'; ctx.fillRect(deerX+11,deerY-18,1,5);
  ctx.fillRect(deerX+9,deerY-17,2,1); ctx.fillRect(deerX+12,deerY-16,2,1);
  // Fish jumping in river
  const fishPhase=(tick*0.002)%(Math.PI*2);
  if(Math.sin(fishPhase)>0){
    const fx2=Math.round(W*0.47), fy2=Math.round(H*0.60-Math.sin(fishPhase)*14);
    ctx.fillStyle='#2a7aaa';
    ctx.fillRect(fx2,fy2,8,4);
    ctx.fillRect(fx2-3,fy2+1,3,3); // tail
    ctx.fillStyle='rgba(200,240,255,0.4)'; ctx.fillRect(fx2,fy2-1,8,2); // shimmer
  }
  // Flower patch
  [[W*0.30,H*0.84],[W*0.34,H*0.86],[W*0.28,H*0.85]].forEach(([flx,fly],i)=>{
    ctx.fillStyle=['#ff6688','#ffcc00','#aa66ff'][i];
    ctx.fillRect(Math.round(flx)-2,Math.round(fly)-4,4,4);
    ctx.fillStyle='#ffff00'; ctx.fillRect(Math.round(flx)-1,Math.round(fly)-3,2,2);
    ctx.fillStyle='#2a6a10'; ctx.fillRect(Math.round(flx),Math.round(fly),2,5);
  });
  // Waterfall mist cloud at base
  const wfMistX=Math.round(W*0.22), wfMistY=Math.round(H*0.60);
  const mAlpha=0.12+0.06*Math.sin(tick*0.004);
  ctx.fillStyle=`rgba(200,235,255,${mAlpha.toFixed(2)})`;
  ctx.beginPath(); ctx.ellipse(wfMistX,wfMistY,16,6,0,0,Math.PI*2); ctx.fill();
  // Frog on mossy stone
  const frogX = Math.round(W * 0.52 + Math.sin(tick * 0.0005) * 4);
  const frogY = Math.round(H * 0.82);
  ctx.fillStyle = '#3a8a20';
  ctx.fillRect(frogX - 4, frogY - 4, 8, 5);
  ctx.fillRect(frogX - 5, frogY - 5, 10, 2);
  ctx.fillStyle = '#88dd44';
  ctx.fillRect(frogX - 4, frogY - 6, 3, 3); ctx.fillRect(frogX + 1, frogY - 6, 3, 3);
  ctx.fillStyle = '#000'; ctx.fillRect(frogX - 3, frogY - 5, 1, 1); ctx.fillRect(frogX + 2, frogY - 5, 1, 1);
  ctx.fillStyle = '#2a7018';
  ctx.fillRect(frogX - 6, frogY, 3, 2); ctx.fillRect(frogX + 3, frogY, 3, 2);
  // Butterfly near flower patch
  const bfPhase2 = (tick * 0.0008) % (Math.PI * 2);
  const bfx2 = Math.round(W * 0.33 + Math.cos(bfPhase2) * 12);
  const bfy2 = Math.round(H * 0.80 + Math.sin(bfPhase2 * 0.5) * 6);
  ctx.fillStyle = 'rgba(255,100,200,0.85)';
  if (Math.sin(tick * 0.015) > 0) { ctx.fillRect(bfx2 - 5, bfy2 - 2, 4, 4); ctx.fillRect(bfx2 + 1, bfy2 - 2, 4, 4); }
  else { ctx.fillRect(bfx2 - 3, bfy2 - 1, 3, 3); ctx.fillRect(bfx2, bfy2 - 1, 3, 3); }
  ctx.fillStyle = '#1a0a04'; ctx.fillRect(bfx2 - 1, bfy2 - 3, 2, 6);
}

function _zoneDetailPlasma(ctx, W, H, horizY, fg, tick) {
  // Orbiting energy motes
  for(let i=0;i<6;i++){
    const angle=tick*0.001*(1+i*0.2)+i*1.05;
    const orbitX=Math.round(W*0.5+Math.cos(angle)*(W*0.3));
    const orbitY=Math.round(H*0.65+Math.sin(angle*0.6)*fg*0.15);
    const glow=0.4+0.4*Math.sin(tick*0.007+i);
    ctx.fillStyle=`rgba(${i%2?200:140},40,255,${glow.toFixed(2)})`;
    ctx.fillRect(orbitX,orbitY,3,3);
    // Trail
    for(let t2=1;t2<4;t2++){
      const ta=angle-t2*0.12;
      const tx2=Math.round(W*0.5+Math.cos(ta)*(W*0.3));
      const ty2=Math.round(H*0.65+Math.sin(ta*0.6)*fg*0.15);
      ctx.fillStyle=`rgba(${i%2?180:120},20,220,${(glow*(1-t2/4)).toFixed(2)})`;
      ctx.fillRect(tx2,ty2,2,2);
    }
  }
  // Phase rifts (shimmering portals)
  [[W*0.18,H*0.72],[W*0.78,H*0.70]].forEach(([rx,ry],i)=>{
    const glow=0.3+0.3*Math.sin(tick*0.003+i*1.6);
    ctx.strokeStyle=`rgba(200,80,255,${glow.toFixed(2)})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(Math.round(rx),Math.round(ry),8,14,0.2,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=`rgba(160,20,220,${(glow*0.3).toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(Math.round(rx),Math.round(ry),6,11,0.2,0,Math.PI*2); ctx.fill();
  });
  // Floating glyphs
  for(let i=0;i<4;i++){
    const gx=Math.round(W*(0.22+i*0.2)+Math.sin(tick*0.001+i)*5);
    const gy=Math.round(H*0.75+Math.cos(tick*0.0008+i*1.2)*8);
    const gAlpha=0.3+0.3*Math.sin(tick*0.005+i*0.9);
    ctx.fillStyle=`rgba(220,180,255,${gAlpha.toFixed(2)})`;
    ctx.font='8px monospace'; ctx.textAlign='center';
    ctx.fillText(['✦','◈','⬡','◉'][i],gx,gy);
  }
  ctx.textAlign='left';
  // Void tentacles rising from ground
  [[W*0.30, H*0.88],[W*0.62, H*0.86]].forEach(([tx3, ty3], ti) => {
    for (let s = 0; s < 8; s++) {
      const sY = Math.round(ty3 - s * 5);
      const sX = Math.round(tx3 + Math.sin(tick * 0.003 + s * 0.7 + ti * 2.1) * (s * 2));
      const tAlpha = (1 - s / 8) * (0.4 + 0.3 * Math.sin(tick * 0.005 + ti));
      ctx.fillStyle = `rgba(140,20,220,${tAlpha.toFixed(2)})`;
      ctx.fillRect(sX, sY, Math.max(1, 3 - Math.round(s / 4)), 5);
    }
  });
  // Crystal growth from floor
  [[W*0.44, H*0.90],[W*0.56, H*0.88]].forEach(([cx3, cy3], ci) => {
    for (let c = 0; c < 4; c++) {
      const cH3 = 6 + c * 4;
      const cX4 = Math.round(cx3) - 4 + c * 3;
      const cGlow2 = 0.5 + 0.4 * Math.sin(tick * 0.006 + c + ci * 1.8);
      ctx.fillStyle = `rgba(${ci%2?180:140},60,255,${cGlow2.toFixed(2)})`;
      for (let row = 0; row < cH3; row++) {
        const cw2 = Math.max(1, Math.round((1 - row / cH3) * 2));
        ctx.fillRect(cX4, Math.round(cy3) - row, cw2 * 2, 1);
      }
    }
  });
}

function _zoneDetailAir(ctx, W, H, horizY, fg, tick) {
  // Birds high in the sky
  const flockY = Math.round(horizY * 0.28);
  [[0,0],[22,-4],[44,-2],[66,-5],[88,-1],[-22,-3]].forEach(([bx,by], i) => {
    const bxr = Math.round((W*0.35 + bx + tick*0.018) % W);
    const flap = Math.sin(tick*0.012 + i*0.8) > 0;
    ctx.fillStyle = 'rgba(80,120,180,0.6)';
    if(flap){
      ctx.fillRect(bxr-4, flockY+by, 3, 1);
      ctx.fillRect(bxr+1, flockY+by-1, 3, 1);
    } else {
      ctx.fillRect(bxr-4, flockY+by-1, 3, 1);
      ctx.fillRect(bxr+1, flockY+by-1, 3, 1);
    }
  });

  // Wisps of cloud drifting off the sides
  for(let i = 0; i < 5; i++){
    const phase = (tick * 0.0003 + i * 0.22) % 1;
    const wy = Math.round(horizY + fg * (0.05 + (i*0.13)%0.3));
    const wx = Math.round((phase * (W + 80)) - 40);
    const ww = 40 + (i*23)%50;
    const alpha = (0.15 + 0.1*Math.sin(phase*Math.PI)) * (1 - Math.abs(0.5-phase)*1.5);
    if(alpha < 0.02) continue;
    ctx.fillStyle = `rgba(220,235,255,${alpha.toFixed(2)})`;
    ctx.fillRect(wx, wy, ww, 8);
    ctx.fillRect(wx + 6, wy - 4, ww - 12, 5);
  }

  // Sun rays from top-right corner
  ctx.save();
  for(let r = 0; r < 5; r++){
    const rayAlpha = 0.04 + r*0.01;
    ctx.fillStyle = `rgba(255,245,200,${rayAlpha})`;
    const rx = W - r*18;
    ctx.beginPath();
    // thin triangle ray
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx - 60, H*0.6);
    ctx.lineTo(rx - 50, H*0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Eagle/hawk soaring alone below the flock
  const hawkAngle = tick * 0.0006;
  const hawkX = Math.round(W * 0.5 + Math.cos(hawkAngle) * W * 0.3);
  const hawkY = Math.round(H * 0.38 + Math.sin(hawkAngle * 0.4) * H * 0.06);
  ctx.fillStyle = 'rgba(100,120,160,0.55)';
  ctx.fillRect(hawkX - 7, hawkY, 6, 2);
  ctx.fillRect(hawkX + 1, hawkY - 1, 6, 2);
  ctx.fillRect(hawkX - 1, hawkY - 2, 2, 3);
  // Shooting star (periodic)
  const ssPhase2 = (tick * 0.0007) % 1;
  if (ssPhase2 > 0.88) {
    const ssProg2 = (ssPhase2 - 0.88) / 0.12;
    const ssX2 = Math.round(W * 0.15 + ssProg2 * W * 0.45);
    const ssY2 = Math.round(H * 0.05 + ssProg2 * H * 0.10);
    ctx.fillStyle = `rgba(240,245,255,${(1-ssProg2).toFixed(2)})`;
    ctx.fillRect(ssX2, ssY2, 4, 1);
    ctx.fillStyle = `rgba(200,215,255,${((1-ssProg2)*0.5).toFixed(2)})`;
    ctx.fillRect(ssX2 + 4, ssY2, 7, 1);
  }
}


function _drawWorldCampfire(ctx, cx, cy, hovered, tick) {
  const ps = 3; // pixel scale

  // Update/spawn sparks
  if (_cfSparks.length < 18) {
    for (let i = 0; i < 3; i++) {
      _cfSparks.push({
        x: cx + (Math.random() - 0.5) * 8,
        y: cy - ps * 4,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.5 + Math.random() * 1.0),
        life: 1.0,
        col: Math.random() > 0.5 ? '#FF8800' : '#FFCC00',
      });
    }
  }
  for (let i = _cfSparks.length - 1; i >= 0; i--) {
    const sp = _cfSparks[i];
    sp.x += sp.vx; sp.y += sp.vy;
    sp.vy *= 0.97;
    sp.life -= 0.025;
    if (sp.life <= 0) { _cfSparks.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = sp.life * 0.8;
    ctx.fillStyle = sp.col;
    ctx.fillRect(Math.round(sp.x), Math.round(sp.y), ps - 1, ps - 1);
    ctx.restore();
  }

  // Warm glow underneath
  const glowR = (hovered ? 60 : 50) + 8 * Math.sin(tick * 0.006);
  ctx.save();
  ctx.globalAlpha = hovered ? 0.25 : 0.16;
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  grd.addColorStop(0,   '#FF9900');
  grd.addColorStop(0.4, '#FF550044');
  grd.addColorStop(1,   'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
  ctx.restore();

  // Logs (two crossed pixel logs)
  const logC = ['#3d1f08', '#5a2d0c', '#7a3d10'];
  // Left log
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = logC[Math.min(i, 2)];
    ctx.fillRect(cx - 6*ps + i, cy - ps + i*0, ps*4, ps);
  }
  // Right log
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = logC[Math.min(i, 2)];
    ctx.fillRect(cx + ps - i, cy - ps, ps*4, ps);
  }
  // Ember glow on logs
  ctx.save(); ctx.globalAlpha = 0.6 + 0.3*Math.sin(tick*0.011);
  ctx.fillStyle = '#FF4400';
  ctx.fillRect(cx - ps, cy - ps, ps*2, ps);
  ctx.restore();

  // Animated flame — 3 frames cycling
  const frame = Math.floor(tick / 80) % 3;
  const FLAMES = [
    // frame 0
    [
      [0, -8*ps, 2*ps, 3*ps, '#FFEE22'],
      [-ps, -7*ps, 4*ps, 3*ps, '#FF9900'],
      [-2*ps, -5*ps, 6*ps, 3*ps, '#FF5500'],
      [-3*ps, -3*ps, 8*ps, 2*ps, '#FF3300'],
      [-ps, -9*ps, 2*ps, 2*ps, '#FFFF88'],
    ],
    // frame 1
    [
      [-ps, -9*ps, 2*ps, 3*ps, '#FFFF44'],
      [-2*ps, -7*ps, 5*ps, 3*ps, '#FFAA00'],
      [-3*ps, -5*ps, 7*ps, 3*ps, '#FF6600'],
      [-3*ps, -3*ps, 7*ps, 2*ps, '#FF3300'],
      [0, -10*ps, ps, 2*ps, '#FFFFAA'],
    ],
    // frame 2
    [
      [0, -7*ps, 3*ps, 3*ps, '#FFEE00'],
      [-2*ps, -6*ps, 6*ps, 3*ps, '#FF8800'],
      [-3*ps, -4*ps, 8*ps, 3*ps, '#FF4400'],
      [-2*ps, -3*ps, 6*ps, 2*ps, '#FF2200'],
      [-ps, -8*ps, 3*ps, 2*ps, '#FFFFCC'],
    ],
  ];
  FLAMES[frame].forEach(([dx, dy, fw, fh, col]) => {
    ctx.fillStyle = col;
    ctx.fillRect(cx + dx, cy + dy, fw, fh);
  });

  // Smoke wisps (rise, fade, drift)
  const smokeT = (tick * 0.0008) % 1;
  for (let i = 0; i < 3; i++) {
    const ot = (smokeT + i * 0.33) % 1;
    const sx = cx + Math.sin(ot * Math.PI * 3 + i) * 6;
    const sy = cy - 12*ps - ot * 28;
    ctx.save();
    ctx.globalAlpha = (1 - ot) * 0.12;
    ctx.fillStyle = '#9988bb';
    ctx.fillRect(Math.round(sx - 3), Math.round(sy - 3), 6, 6);
    ctx.restore();
  }

  // Label
  ctx.save();
  ctx.font = `bold ${hovered ? 11 : 9}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffbb55';
  ctx.globalAlpha = hovered ? 0.95 : 0.7;
  ctx.fillText('REST', cx, cy + ps * 3 + 8);
  ctx.restore();
}

// Zone-themed campfire dispatcher
function _drawZoneCampfire(ctx, cx, cy, hovered, tick) {
  const el = (typeof currentZoneElement !== 'undefined' && currentZoneElement) || 'Fire';
  switch(el) {
    case 'Fire':      _cfFire(ctx, cx, cy, hovered, tick);      break;
    case 'Water':     _cfWater(ctx, cx, cy, hovered, tick);     break;
    case 'Ice':       _cfIce(ctx, cx, cy, hovered, tick);       break;
    case 'Lightning': _cfLightning(ctx, cx, cy, hovered, tick); break;
    case 'Earth':     _cfEarth(ctx, cx, cy, hovered, tick);     break;
    case 'Nature':    _cfNature(ctx, cx, cy, hovered, tick);    break;
    case 'Plasma':    _cfPlasma(ctx, cx, cy, hovered, tick);    break;
    case 'Air':       _cfAir(ctx, cx, cy, hovered, tick);       break;
    default:          _drawWorldCampfire(ctx, cx, cy, hovered, tick); break;
  }
}

// Shared: draw animated glow + label
function _cfGlow(ctx, cx, cy, col, hovered, tick, radius) {
  const r = (radius || 44) + 6*Math.sin(tick*0.007);
  ctx.save(); ctx.globalAlpha = hovered ? 0.22 : 0.13;
  const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
  g.addColorStop(0, col); g.addColorStop(1,'transparent');
  ctx.fillStyle=g; ctx.fillRect(cx-r,cy-r,r*2,r*2);
  ctx.restore();
}
function _cfLabel(ctx, cx, cy, text, col, hovered) {
  ctx.save(); ctx.font=`bold ${hovered?11:9}px monospace`;
  ctx.textAlign='center'; ctx.fillStyle=col||'#ffbb55';
  ctx.globalAlpha=hovered?0.95:0.7;
  ctx.fillText(text, cx, cy+28);
  ctx.restore();
}
// Shared: pixel logs
function _cfLogs(ctx, cx, cy, col1, col2) {
  const ps=3;
  ctx.fillStyle=col1; ctx.fillRect(cx-5*ps,cy-ps,ps*4,ps);
  ctx.fillStyle=col2; ctx.fillRect(cx+ps,cy-ps,ps*4,ps);
}
// Shared: spark emitter helper (uses a per-key pool)
const _cfSparkPools = {};
function _cfSparks2(ctx, cx, cy, tick, cols, key) {
  if(!_cfSparkPools[key]) _cfSparkPools[key]=[];
  const pool=_cfSparkPools[key];
  if(pool.length<14){
    for(let i=0;i<2;i++) pool.push({
      x:cx+(Math.random()-.5)*7,y:cy-9,
      vx:(Math.random()-.5)*0.7,vy:-(0.6+Math.random()*1.1),
      life:1,col:cols[Math.floor(Math.random()*cols.length)]
    });
  }
  for(let i=pool.length-1;i>=0;i--){
    const s=pool[i];
    s.x+=s.vx;s.y+=s.vy;s.vy*=0.97;s.life-=0.028;
    if(s.life<=0){pool.splice(i,1);continue;}
    ctx.save();ctx.globalAlpha=s.life*0.85;ctx.fillStyle=s.col;
    ctx.fillRect(Math.round(s.x),Math.round(s.y),2,2);ctx.restore();
  }
}
// Shared: animated flame column
function _cfFlame(ctx, cx, cy, tick, palFn) {
  // Same pixel template as _drawWorldCampfire FLAMES (ps=3), recolored by palFn
  const ps = 3;
  const frame = Math.floor(tick / 80) % 3;
  const TEMPLATES = [
    // frame 0
    [[0,-8,2,3,0],[-1,-7,4,3,1],[-2,-5,6,3,2],[-3,-3,8,2,3],[-1,-9,2,2,4]],
    // frame 1
    [[-1,-9,2,3,4],[-2,-7,5,3,1],[-3,-5,7,3,2],[-3,-3,7,2,3],[0,-10,1,2,4]],
    // frame 2
    [[0,-7,3,3,0],[-2,-6,6,3,1],[-3,-4,8,3,2],[-2,-3,6,2,3],[-1,-8,3,2,4]],
  ];
  TEMPLATES[frame].forEach(([dx,dy,fw,fh,ci])=>{
    ctx.fillStyle = palFn(ci);
    ctx.fillRect(cx + dx*ps, cy + dy*ps, fw*ps, fh*ps);
  });
}

// Zone color palettes for campfire flames [tip, mid-hi, mid, base, hotspot]
const CF_PALS = {
  Fire:      ['#FFFF88','#FF9900','#FF5500','#FF3300','#FFEE22'],
  Water:     ['#CCFFFF','#22CCFF','#0088EE','#0055BB','#AAFFFF'],
  Ice:       ['#FFFFFF','#CCEEFF','#88CCEE','#5599CC','#FFFFFF'],
  Lightning: ['#FFFFC0','#FFFF22','#FFCC00','#FF9900','#FFFFFF'],
  Earth:     ['#FFEEBB','#CC8800','#AA5500','#882200','#EEDD88'],
  Nature:    ['#EEFF99','#88DD22','#44AA00','#226600','#CCFF44'],
  Plasma:    ['#FFDDFF','#DD66FF','#AA22DD','#6600AA','#FFAAFF'],
  Air:       ['#FFFFFF','#CCEEFF','#99BBDD','#6688BB','#EEFFFF'],
};

function _cfZonePal(zone) {
  const p = CF_PALS[zone] || CF_PALS.Fire;
  return (i) => p[i] || p[0];
}

// Shared zone campfire renderer — same animation, zone-tinted colors
function _cfDrawZone(ctx, cx, cy, hovered, tick, zone) {
  const pal   = CF_PALS[zone] || CF_PALS.Fire;
  const glowC = pal[2];
  const ps    = 3;

  // Glow
  _cfGlow(ctx, cx, cy, glowC, hovered, tick, 44);

  // Logs (Air: wind swirl instead)
  if(zone === 'Air'){
    const wt=(tick*0.003)%1;
    for(let i=0;i<3;i++){
      const ox=Math.sin(wt*Math.PI*2+i*2.1)*8;
      ctx.save();ctx.globalAlpha=0.30-i*0.07;ctx.fillStyle=pal[1];
      ctx.fillRect(Math.round(cx-12+ox),cy-3+i*2,24,1);ctx.restore();
    }
  } else {
    const log1 = zone==='Ice'?'#0a1a2a':zone==='Water'?'#0a2030':zone==='Lightning'?'#1a1a00':zone==='Plasma'?'#1a0a2a':'#3d1f08';
    const log2 = zone==='Ice'?'#1a3a4a':zone==='Water'?'#1a4050':zone==='Lightning'?'#333300':zone==='Plasma'?'#2a1a3a':'#5a2d0c';
    _cfLogs(ctx, cx, cy, log1, log2);
  }

  // Sparks
  _cfSparks2(ctx, cx, cy, tick, [pal[0], pal[1], pal[4]], zone);

  // Flame using shared template
  _cfFlame(ctx, cx, cy, tick, _cfZonePal(zone));

  // Label
  _cfLabel(ctx, cx, cy+6, 'REST', pal[1], hovered);
}

function _cfFire(ctx,cx,cy,hovered,tick)      { _cfDrawZone(ctx,cx,cy,hovered,tick,'Fire'); }
function _cfWater(ctx,cx,cy,hovered,tick)     { _cfDrawZone(ctx,cx,cy,hovered,tick,'Water'); }
function _cfIce(ctx,cx,cy,hovered,tick)       { _cfDrawZone(ctx,cx,cy,hovered,tick,'Ice'); }
function _cfLightning(ctx,cx,cy,hovered,tick) { _cfDrawZone(ctx,cx,cy,hovered,tick,'Lightning'); }
function _cfEarth(ctx,cx,cy,hovered,tick)     { _cfDrawZone(ctx,cx,cy,hovered,tick,'Earth'); }
function _cfNature(ctx,cx,cy,hovered,tick)    { _cfDrawZone(ctx,cx,cy,hovered,tick,'Nature'); }
function _cfPlasma(ctx,cx,cy,hovered,tick)    { _cfDrawZone(ctx,cx,cy,hovered,tick,'Plasma'); }
function _cfAir(ctx,cx,cy,hovered,tick)       { _cfDrawZone(ctx,cx,cy,hovered,tick,'Air'); }


function _drawNodeSprites(ctx, cx, cy, sprites, hovered, node) {
  if (!sprites || sprites.length === 0) return;
  // Map nodes always draw as wizard hats — small, clear icons
  const scale = 3;
  const hatCols = 12;
  const hatW = hatCols * scale;

  const isPack = node && node.type === 'pack';
  const count = isPack ? 3 : 1;

  // Pick element from node or first sprite
  const elem = (node && node.enc)
    ? (node.enc.element || node.enc.members?.[0]?.element || 'Fire')
    : 'Fire';
  const hatRows = getElemHatSprite(elem);
  const hatH = hatRows.length * scale;
  const pal = sprites[0]?.pal || getElemPal(elem);

  if (count === 1) {
    const sx = Math.round(cx - hatW / 2);
    const sy = Math.round(cy - hatH / 2);
    ctx.save();
    ctx.globalAlpha = hovered ? 1.0 : 0.88;
    drawSprite(ctx, hatRows, sx, sy, scale, pal, hatCols);
    ctx.restore();
  } else {
    // Pack: 3 hats — left smaller, center largest, right smaller
    const sizes  = [2.4, 3, 2.4];
    const xOffs  = [-hatW * 0.8, 0, hatW * 0.8];
    const yOffs  = [4, 0, 4];
    const alphas = hovered ? [0.9, 1.0, 0.9] : [0.7, 0.88, 0.7];
    for (let i = 0; i < 3; i++) {
      const s = sizes[i];
      const hw = Math.round(hatCols * s);
      const hh = Math.round(hatRows.length * s);
      const sx = Math.round(cx + xOffs[i] - hw / 2);
      const sy = Math.round(cy + yOffs[i] - hh / 2);
      ctx.save();
      ctx.globalAlpha = alphas[i];
      drawSprite(ctx, hatRows, sx, sy, s, pal, hatCols);
      ctx.restore();
    }
  }
}

function _drawNodeIcon(ctx, cx, cy, node, hovered, tick) {
  const { type, color } = node;
  const scale = 2;
  const cols = 24;

  let baseRows, pal;

  if (type === 'campfire') {
    // Warm fire palette: 1=log-dark 2=log-mid 3=ember 4=core-flame
    baseRows = MAP_SPRITE_CAMPFIRE_BASE;
    pal = ['#5a3010', '#8a5020', '#FF8822', '#FFDD00', '#FF4400'];
    const spriteW = cols * scale;
    const spriteH = baseRows.length * scale;
    const sx = Math.round(cx - spriteW / 2);
    const sy = Math.round(cy - spriteH / 2);

    // Warm glow behind fire
    const glowR = 18 + 3 * Math.sin(tick * 0.07);
    ctx.save();
    ctx.globalAlpha = hovered ? 0.22 : 0.12;
    const grd = ctx.createRadialGradient(cx, sy - 4, 0, cx, sy - 4, glowR);
    grd.addColorStop(0, '#FF8822');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(cx - glowR, sy - glowR - 4, glowR * 2, glowR * 2);
    ctx.restore();

    // Draw log base
    ctx.save();
    ctx.globalAlpha = hovered ? 1 : 0.88;
    drawSprite(ctx, baseRows, sx, sy, scale, pal);
    ctx.restore();

    // Animated flame — shift palette based on tick
    const flameShift = Math.floor(tick / 4) % 3;
    const flamePals = [
      ['#FF6600', '#FF9900', '#FFCC00', '#FF3300', '#FF0000'],
      ['#FF4400', '#FF8800', '#FFAA00', '#FF2200', '#EE0000'],
      ['#FF7700', '#FFAA00', '#FFDD00', '#FF4400', '#FF1100'],
    ];
    const flameP = flamePals[flameShift];
    // Flame sits above the base — offset upward
    const flameOffY = sy - MAP_SPRITE_CAMPFIRE_FLAME.length * scale + scale * 2;
    ctx.save();
    ctx.globalAlpha = hovered ? 1 : 0.9;
    drawSprite(ctx, MAP_SPRITE_CAMPFIRE_FLAME, sx, flameOffY, scale, flameP);
    ctx.restore();

  } else if (type === 'shop') {
    // Shop: 1=canvas/fabric 2=counter-wood 3=highlight 4=shadow
    baseRows = MAP_SPRITE_SHOP;
    pal = ['#2aaa7a', '#1a6a4a', '#55ddaa', '#0a3a2a'];
    const spriteW = cols * scale;
    const spriteH = baseRows.length * scale;
    const sx = Math.round(cx - spriteW / 2);
    const sy = Math.round(cy - spriteH / 2);
    ctx.save();
    ctx.globalAlpha = hovered ? 1 : 0.85;
    drawSprite(ctx, baseRows, sx, sy, scale, pal);
    ctx.restore();
    // Hanging sign twinkle
    if (Math.sin(tick * 0.05) > 0.7) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#FFEE44';
      ctx.fillRect(cx - 2, cy - spriteH / 2 - 5, 2, 2);
      ctx.restore();
    }

  } else if (type === 'gym') {
    // Gym: 1=stone 2=column-shadow 3=gold-trim
    baseRows = MAP_SPRITE_GYM;
    pal = [color, '#6a5020', '#FFD700', '#3a2808'];
    const spriteW = cols * scale;
    const spriteH = baseRows.length * scale;
    const sx = Math.round(cx - spriteW / 2);
    const sy = Math.round(cy - spriteH / 2);
    ctx.save();
    ctx.globalAlpha = hovered ? 1 : 0.85;
    drawSprite(ctx, baseRows, sx, sy, scale, pal);
    ctx.restore();
    // Pulsing gold banner at top
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.05);
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.2 * pulse;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(sx, sy - 3, spriteW, 2);
    ctx.restore();
  }
}

// ─── Animated player on map ───────────────────────────────────────────────────
function _drawMapPlayer(ctx, px, py, tick) {
  const scale = 2;
  const rows  = typeof getPlayerCharSprite === 'function' ? getPlayerCharSprite() : MAP_ICON_PLAYER;
  const pal   = typeof getElemPal === 'function' && typeof playerElement !== 'undefined'
                ? getElemPal(playerElement) : EL_PAL.Neutral;

  const spriteW = 24 * scale;
  const spriteH = rows.length * scale;

  // Bob up/down while moving
  const bobY = _mapAnimTarget ? Math.round(Math.sin(tick * 0.09) * 2) : 0;

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(px, py + spriteH / 2 + 2, spriteW * 0.3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sprite
  ctx.save();
  ctx.globalAlpha = 1.0;
  drawSprite(ctx, rows, Math.round(px - spriteW / 2), Math.round(py - spriteH / 2 + bobY), scale, pal, 24);
  ctx.restore();

  // "YOU" label
  ctx.save();
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8a060';
  ctx.globalAlpha = 0.8;
  ctx.fillText('YOU', px, py - spriteH / 2 - 4 + bobY);
  ctx.restore();
}


