// ===== lobbyMap.js =====
// ─── LOBBY MAP — between-runs interactive world ───────────────────────────────

// Fountain center — visual only, paths radiate from here
const LOBBY_FOUNTAIN = { x: 0.50, y: 0.87 };
// Plaza — where the wizard stands when idle/routing through the square (just south of fountain)
const LOBBY_PLAZA = { x: 0.50, y: 0.97 };

const LOBBY_LOCATIONS = [
  { id:'castle',   label:'Begin Run',        desc:'Cross the drawbridge — start a new run',  x:0.50, y:0.42 },
  { id:'archive',  label:'History',          desc:'Review past adventures',                   x:0.09, y:0.67 },
  { id:'vault',    label:'Artifacts',        desc:'Artifacts earned from Gym Leaders',        x:0.91, y:0.67 },
  { id:'library',  label:'Spellbooks',       desc:'Manage your book upgrades',               x:0.23, y:0.91 },
  { id:'talents',  label:'Talent Tree',      desc:'Spend Phos on permanent upgrades',        x:0.74, y:0.91 },
  { id:'guild',    label:'Wizard Guild',     desc:'Unlock and choose your wizard',           x:0.17, y:0.82 },
  { id:'tailor',   label:'Customize Wizard', desc:'Change your wizard\'s look',              x:0.83, y:0.82 },
  { id:'veil',     label:'The Veil',         desc:'Choose your burdens, layer your Mist',    x:0.355, y:0.748 },
];

// Player walk state
let _lobbyPlayerX = 0.50;
let _lobbyPlayerY = 0.65;
let _lobbyTargetX = 0.50;
let _lobbyTargetY = 0.65;
let _lobbyWalking = false;
let _lobbyWalkDest = null;      // location id to open after arriving
let _lobbyWaypoint = null;      // legacy compat — unused, replaced by queue
let _lobbyWaypointQueue = [];   // ordered list of {x,y,finalDest?} to visit
let _lobbyTick = 0;
let _lobbyAnimFrame = null;
let _lobbyShootingStars = []; // { x, y, vx, vy, life, maxLife, len }
let _lobbyFacingLeft = false;
let _lobbyReturnPos = null;   // if set, start here instead of plaza (used when returning from tailor)
let _lobbyCinematic = null;   // null | 'castle_enter' | 'castle_teeth' | 'castle_fade'
let _lobbyCinematicTick = 0;
// Offscreen canvas — paths are expensive to draw every frame; cache them
let _lobbyPathCanvas = null;
let _lobbyPathCacheW = 0, _lobbyPathCacheH = 0;

// ── Zone background panels (randomized per session / run) ─────────────────────
let _lobbyBgZones = null; // array of 3 element strings

function _initLobbyBgZones() {
  const all = ['Fire','Water','Ice','Lightning','Earth','Nature','Plasma','Air','Camp'];
  _lobbyBgZones = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
}

function _drawLobbyZonePanels(ctx, W, H) {
  if (!_lobbyBgZones) return;
  const topY   = H * 0.12;
  const botY   = H * 0.60;
  const panelH = botY - topY;
  const panelW = W / 3;
  const t      = _lobbyTick;

  _lobbyBgZones.forEach((el, i) => {
    const px = i * panelW;
    ctx.save();
    ctx.beginPath(); ctx.rect(px, topY, panelW, panelH); ctx.clip();
    _drawZonePanel(ctx, px, topY, panelW, panelH, el, t, i);
    // Soft vertical edge blend
    if (i > 0) {
      const eg = ctx.createLinearGradient(px, 0, px + panelW * 0.06, 0);
      eg.addColorStop(0, 'rgba(7,4,14,0.85)'); eg.addColorStop(1, 'rgba(7,4,14,0)');
      ctx.fillStyle = eg; ctx.fillRect(px, topY, panelW * 0.06, panelH);
    }
    ctx.restore();
  });

  // Top fade — panels dissolve upward into pure star sky
  const tf = ctx.createLinearGradient(0, topY, 0, topY + panelH * 0.22);
  tf.addColorStop(0, 'rgba(8,5,14,1)'); tf.addColorStop(1, 'rgba(8,5,14,0)');
  ctx.fillStyle = tf; ctx.fillRect(0, topY, W, panelH * 0.22);
}

// Draws a single zone panel with rich atmospheric detail
function _drawZonePanel(ctx, px, py, pw, ph, el, t, idx) {
  const botY = py + ph;

  // ── Sky gradient ──────────────────────────────────────────────────────────
  const SKY = {
    Fire:      ['#120100','#2e0600','#4a1200'],
    Water:     ['#00050e','#010c1c','#02152e'],
    Ice:       ['#010408','#020a14','#041220'],
    Lightning: ['#050310','#0b0620','#110830'],
    Earth:     ['#080400','#120800','#1e1000'],
    Nature:    ['#010601','#020e02','#041804'],
    Plasma:    ['#0a0116','#160228','#220340'],
    Air:       ['#040608','#080e14','#0e1620'],
  };
  const cols = SKY[el] || SKY.Earth;
  const sg = ctx.createLinearGradient(px, py, px, botY);
  sg.addColorStop(0, cols[0]); sg.addColorStop(0.5, cols[1]); sg.addColorStop(1, cols[2]);
  ctx.fillStyle = sg; ctx.fillRect(px, py, pw, ph);

  // ── Per-element rendering ──────────────────────────────────────────────────
  switch (el) {

    case 'Fire': {
      // Distant volcano silhouette
      ctx.fillStyle = '#0a0100';
      ctx.beginPath();
      ctx.moveTo(px, botY);
      ctx.lineTo(px + pw * 0.18, botY - ph * 0.24);
      ctx.lineTo(px + pw * 0.30, botY - ph * 0.38);
      ctx.lineTo(px + pw * 0.42, botY - ph * 0.22);
      ctx.lineTo(px + pw * 0.60, botY - ph * 0.30);
      ctx.lineTo(px + pw * 0.72, botY - ph * 0.18);
      ctx.lineTo(px + pw, botY);
      ctx.closePath(); ctx.fill();
      // Lava glow at volcano crater
      const vx = px + pw * 0.30, vy = botY - ph * 0.38;
      const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, pw * 0.28);
      vg.addColorStop(0, 'rgba(255,80,0,0.55)');
      vg.addColorStop(0.4,'rgba(180,30,0,0.22)');
      vg.addColorStop(1, 'transparent');
      ctx.fillStyle = vg; ctx.fillRect(px, py, pw, ph);
      // Horizon ember glow band
      const hg = ctx.createLinearGradient(px, botY - ph * 0.18, px, botY);
      hg.addColorStop(0, 'transparent'); hg.addColorStop(1, 'rgba(220,50,0,0.35)');
      ctx.fillStyle = hg; ctx.fillRect(px, botY - ph * 0.18, pw, ph * 0.18);
      // Rising embers
      for (let i = 0; i < 14; i++) {
        const p = ((t * 0.009 + i * 0.18) % 1);
        const ex = px + pw * ((i * 0.073 + 0.04) % 1);
        const ey = py + ph * (1 - p * 0.82);
        const drift = Math.sin(t * 0.025 + i * 1.3) * pw * 0.03;
        ctx.globalAlpha = (1 - p) * 0.7;
        ctx.fillStyle = i % 3 === 0 ? '#FF8800' : i % 3 === 1 ? '#FF3300' : '#FFCC00';
        ctx.fillRect(Math.round(ex + drift), Math.round(ey), 2, 2);
      }
      // Charred tree silhouette (near hill)
      ctx.globalAlpha = 1; ctx.fillStyle = '#050100';
      for (let i = 0; i < 4; i++) {
        const tx2 = px + pw * (0.08 + i * 0.24), th = ph * 0.19, ty2 = botY - th;
        ctx.fillRect(Math.round(tx2 + pw * 0.025), Math.round(ty2), Math.round(pw * 0.018), Math.round(th));
        // Bare branches
        ctx.strokeStyle = '#050100'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(tx2 + pw * 0.034), Math.round(ty2 + th * 0.3));
        ctx.lineTo(Math.round(tx2 + pw * 0.075), Math.round(ty2 + th * 0.18)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(Math.round(tx2 + pw * 0.034), Math.round(ty2 + th * 0.5));
        ctx.lineTo(Math.round(tx2 - pw * 0.022), Math.round(ty2 + th * 0.38)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'Water': {
      // Deep ocean horizon glow
      const hg = ctx.createLinearGradient(px, botY - ph * 0.30, px, botY);
      hg.addColorStop(0, 'transparent'); hg.addColorStop(1, 'rgba(0,80,180,0.30)');
      ctx.fillStyle = hg; ctx.fillRect(px, botY - ph * 0.30, pw, ph * 0.30);
      // Distant rocky island silhouette
      ctx.fillStyle = '#010a14';
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.12, botY);
      ctx.lineTo(px + pw * 0.20, botY - ph * 0.12);
      ctx.lineTo(px + pw * 0.32, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.44, botY - ph * 0.13);
      ctx.lineTo(px + pw * 0.55, botY);
      ctx.closePath(); ctx.fill();
      // Sea mist layer
      const mg = ctx.createLinearGradient(px, botY - ph * 0.15, px, botY - ph * 0.04);
      mg.addColorStop(0, 'transparent'); mg.addColorStop(1, 'rgba(30,100,160,0.18)');
      ctx.fillStyle = mg; ctx.fillRect(px, botY - ph * 0.15, pw, ph * 0.11);
      // Wave shimmer lines
      for (let i = 0; i < 6; i++) {
        const wy = botY - ph * (0.04 + i * 0.028);
        const ox = Math.sin(t * 0.018 + i * 1.8 + idx * 0.9) * pw * 0.08;
        ctx.globalAlpha = 0.18 - i * 0.022;
        ctx.fillStyle = i % 2 ? '#55aadd' : '#88ccff';
        const ww = pw * (0.35 + 0.2 * Math.sin(t * 0.011 + i));
        ctx.fillRect(Math.round(px + pw * 0.12 + ox), Math.round(wy), Math.round(ww), 1);
      }
      // Bioluminescent sparkle dots
      for (let i = 0; i < 8; i++) {
        const bx = px + pw * ((i * 0.13 + 0.05) % 1);
        const bya = botY - ph * (0.06 + (i * 0.09) % 0.14);
        const ba = 0.3 + 0.5 * Math.sin(t * 0.04 + i * 2.1);
        ctx.globalAlpha = Math.max(0, ba);
        ctx.fillStyle = '#44ffcc';
        ctx.fillRect(Math.round(bx), Math.round(bya), 1, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'Ice': {
      // Aurora bands (sweeping color ribbons)
      const auroraColors = ['rgba(0,255,160,', 'rgba(0,180,255,', 'rgba(100,80,255,'];
      for (let i = 0; i < 3; i++) {
        const aPhase = t * 0.007 + i * 1.1 + idx * 0.6;
        const ay = py + ph * (0.08 + i * 0.14 + Math.sin(aPhase) * 0.04);
        const ah = ph * (0.06 + 0.04 * Math.sin(aPhase * 0.7));
        const ag = ctx.createLinearGradient(px, ay, px, ay + ah);
        ag.addColorStop(0, 'transparent');
        ag.addColorStop(0.5, auroraColors[i] + (0.18 + 0.12 * Math.sin(aPhase * 1.3)) + ')');
        ag.addColorStop(1, 'transparent');
        ctx.fillStyle = ag; ctx.fillRect(px, ay, pw, ah);
      }
      // Frozen tundra — dark silhouette hills (NOT bright)
      ctx.fillStyle = '#060c10';
      _drawPanelHillShape(ctx, px, py, pw, ph, 0.4 + idx * 0.8, 0.30);
      ctx.fillStyle = '#030608';
      _drawPanelHillShape(ctx, px, py, pw, ph, 1.1 + idx * 0.6, 0.17);
      // Icicles hanging from near hill edge
      ctx.fillStyle = '#88ccee';
      const hillEdgeY = py + ph * (1 - 0.17);
      for (let i = 0; i < 10; i++) {
        const ix = px + pw * (0.05 + i * 0.095);
        const ih = ph * (0.025 + 0.018 * ((i * 7 + 3) % 5) / 4);
        ctx.globalAlpha = 0.22 + 0.08 * Math.sin(t * 0.02 + i);
        ctx.fillRect(Math.round(ix), Math.round(hillEdgeY - ph * 0.01), 1, Math.round(ih));
      }
      // Distant frozen peaks
      ctx.globalAlpha = 1; ctx.fillStyle = '#080e14';
      ctx.beginPath();
      ctx.moveTo(px, botY);
      ctx.lineTo(px + pw * 0.10, botY - ph * 0.28);
      ctx.lineTo(px + pw * 0.22, botY - ph * 0.18);
      ctx.lineTo(px + pw * 0.36, botY - ph * 0.36);
      ctx.lineTo(px + pw * 0.48, botY - ph * 0.24);
      ctx.lineTo(px + pw * 0.62, botY - ph * 0.32);
      ctx.lineTo(px + pw * 0.76, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.88, botY - ph * 0.28);
      ctx.lineTo(px + pw, botY - ph * 0.14);
      ctx.lineTo(px + pw, botY);
      ctx.closePath(); ctx.fill();
      // Snow highlights on peaks
      ctx.fillStyle = '#2a4050'; ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.34, botY - ph * 0.36);
      ctx.lineTo(px + pw * 0.30, botY - ph * 0.28);
      ctx.lineTo(px + pw * 0.42, botY - ph * 0.26);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }

    case 'Lightning': {
      // Rolling storm clouds — soft gradient blobs
      for (let ci = 0; ci < 3; ci++) {
        const cy2 = py + ph * (0.06 + ci * 0.13);
        const cpha = t * 0.004 + ci * 1.4 + idx * 0.8;
        const ch = ph * (0.10 + 0.05 * Math.sin(cpha));
        const cg2 = ctx.createLinearGradient(px, cy2, px, cy2 + ch);
        cg2.addColorStop(0, 'rgba(20,12,45,0)');
        cg2.addColorStop(0.45, `rgba(30,18,65,${0.45 + 0.15 * Math.sin(cpha * 0.9)})`);
        cg2.addColorStop(1, 'rgba(20,12,45,0)');
        ctx.fillStyle = cg2;
        ctx.fillRect(px, cy2, pw, ch);
      }
      // Distant jagged cliffs
      ctx.fillStyle = '#04020e';
      ctx.beginPath();
      ctx.moveTo(px, botY);
      ctx.lineTo(px + pw * 0.05, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.14, botY - ph * 0.28);
      ctx.lineTo(px + pw * 0.22, botY - ph * 0.18);
      ctx.lineTo(px + pw * 0.32, botY - ph * 0.34);
      ctx.lineTo(px + pw * 0.40, botY - ph * 0.24);
      ctx.lineTo(px + pw * 0.52, botY - ph * 0.30);
      ctx.lineTo(px + pw * 0.62, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.72, botY - ph * 0.26);
      ctx.lineTo(px + pw * 0.84, botY - ph * 0.16);
      ctx.lineTo(px + pw * 0.92, botY - ph * 0.22);
      ctx.lineTo(px + pw, botY - ph * 0.12);
      ctx.lineTo(px + pw, botY);
      ctx.closePath(); ctx.fill();
      // Near rolling hill
      ctx.fillStyle = '#020106';
      _drawPanelHillShape(ctx, px, py, pw, ph, 1.2 + idx * 0.5, 0.16);
      // Lightning bolt flash
      const lPhase = (t + idx * 37) % 130;
      if (lPhase < 4 || (lPhase > 65 && lPhase < 68)) {
        const fadeA = lPhase < 4 ? 1 - lPhase * 0.15 : 1 - (lPhase - 65) * 0.2;
        ctx.globalAlpha = Math.max(0, fadeA) * 0.85;
        ctx.strokeStyle = '#dde8ff'; ctx.lineWidth = 1.5;
        const bx2 = px + pw * 0.55;
        ctx.beginPath();
        ctx.moveTo(bx2, py + ph * 0.04);
        ctx.lineTo(bx2 - pw * 0.04, py + ph * 0.26);
        ctx.lineTo(bx2 + pw * 0.03, py + ph * 0.26);
        ctx.lineTo(bx2 - pw * 0.055, py + ph * 0.55);
        ctx.stroke();
        // Secondary thin branch
        ctx.lineWidth = 0.8; ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.moveTo(bx2 + pw * 0.03, py + ph * 0.26);
        ctx.lineTo(bx2 + pw * 0.09, py + ph * 0.42);
        ctx.stroke();
        // Flash bloom
        ctx.globalAlpha = Math.max(0, fadeA) * 0.30;
        const bg2 = ctx.createRadialGradient(bx2, py + ph * 0.30, 0, bx2, py + ph * 0.30, pw * 0.30);
        bg2.addColorStop(0, 'rgba(160,160,255,1)'); bg2.addColorStop(1, 'transparent');
        ctx.fillStyle = bg2; ctx.fillRect(px, py, pw, ph);
        ctx.lineWidth = 1;
      }
      // Ambient purple glow pulse in sky
      ctx.globalAlpha = 0.05 + 0.04 * Math.sin(t * 0.025 + idx);
      ctx.fillStyle = '#7744ff';
      ctx.fillRect(px, py, pw, ph * 0.50);
      ctx.globalAlpha = 1;
      break;
    }

    case 'Earth': {
      // Canyon / mesa horizon glow
      const hg = ctx.createLinearGradient(px, botY - ph * 0.22, px, botY);
      hg.addColorStop(0, 'transparent'); hg.addColorStop(1, 'rgba(140,70,10,0.28)');
      ctx.fillStyle = hg; ctx.fillRect(px, botY - ph * 0.22, pw, ph * 0.22);
      // Mesa plateau silhouettes (flat-top cliffs)
      ctx.fillStyle = '#100600';
      ctx.beginPath();
      ctx.moveTo(px, botY);
      ctx.lineTo(px, botY - ph * 0.22);
      ctx.lineTo(px + pw * 0.14, botY - ph * 0.22);
      ctx.lineTo(px + pw * 0.14, botY - ph * 0.32);
      ctx.lineTo(px + pw * 0.38, botY - ph * 0.32);
      ctx.lineTo(px + pw * 0.38, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.55, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.55, botY - ph * 0.28);
      ctx.lineTo(px + pw * 0.80, botY - ph * 0.28);
      ctx.lineTo(px + pw * 0.80, botY - ph * 0.16);
      ctx.lineTo(px + pw, botY - ph * 0.16);
      ctx.lineTo(px + pw, botY);
      ctx.closePath(); ctx.fill();
      // Rock strata lines on mesa face
      ctx.strokeStyle = '#1c0c02'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const sy = botY - ph * (0.07 + i * 0.055);
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(px, sy);
        ctx.lineTo(px + pw * (0.85 + 0.1 * Math.sin(i * 2.1)), sy);
        ctx.stroke();
      }
      // Distant butte
      ctx.globalAlpha = 1; ctx.fillStyle = '#0c0400';
      ctx.fillRect(px + pw * 0.42, botY - ph * 0.44, pw * 0.12, ph * 0.12);
      // Near dark hill
      ctx.fillStyle = '#080300';
      _drawPanelHillShape(ctx, px, py, pw, ph, 0.8 + idx * 0.6, 0.14);
      // Dust particle drift
      for (let i = 0; i < 6; i++) {
        const dp = ((t * 0.006 + i * 0.22) % 1);
        const dx2 = px + pw * ((dp + i * 0.17) % 1);
        const dy2 = botY - ph * (0.05 + (i * 0.04) % 0.12);
        ctx.globalAlpha = (1 - dp) * 0.18;
        ctx.fillStyle = '#aa7733';
        ctx.fillRect(Math.round(dx2), Math.round(dy2), 2, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'Nature': {
      // Misty forest horizon glow
      const hg = ctx.createLinearGradient(px, botY - ph * 0.25, px, botY);
      hg.addColorStop(0, 'transparent'); hg.addColorStop(1, 'rgba(10,80,10,0.25)');
      ctx.fillStyle = hg; ctx.fillRect(px, botY - ph * 0.25, pw, ph * 0.25);

      // Distant hill — muted blue-green (atmospheric haze, clearly separate from mid/near)
      ctx.fillStyle = '#0d2214';
      _drawPanelHillShape(ctx, px, py, pw, ph, 0.4 + idx * 0.8, 0.34);

      // Mist layer over distant hill
      const mg = ctx.createLinearGradient(px, botY - ph * 0.36, px, botY - ph * 0.22);
      mg.addColorStop(0, 'transparent'); mg.addColorStop(1, 'rgba(8,30,14,0.45)');
      ctx.fillStyle = mg; ctx.fillRect(px, botY - ph * 0.36, pw, ph * 0.14);

      // Mid-ground hill — warmer forest green
      ctx.fillStyle = '#0a1a05';
      _drawPanelHillShape(ctx, px, py, pw, ph, 1.0 + idx * 0.55, 0.22);

      // Pine tree silhouettes — mid distance, medium dark green
      ctx.fillStyle = '#061405'; ctx.globalAlpha = 0.95;
      for (let i = 0; i < 7; i++) {
        const tx2 = px + pw * (0.03 + i * 0.138), tw2 = pw * 0.065, th2 = ph * 0.20;
        const ty2 = botY - ph * 0.22 - th2 * 0.8;
        ctx.fillRect(Math.round(tx2 + tw2 * 0.44), Math.round(ty2 + th2 * 0.55), Math.round(tw2 * 0.14), Math.round(th2 * 0.45));
        ctx.beginPath();
        ctx.moveTo(Math.round(tx2 + tw2 * 0.5), Math.round(ty2));
        ctx.lineTo(Math.round(tx2), Math.round(ty2 + th2 * 0.65));
        ctx.lineTo(Math.round(tx2 + tw2), Math.round(ty2 + th2 * 0.65));
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(Math.round(tx2 + tw2 * 0.5), Math.round(ty2 + th2 * 0.25));
        ctx.lineTo(Math.round(tx2 + tw2 * 0.08), Math.round(ty2 + th2 * 0.82));
        ctx.lineTo(Math.round(tx2 + tw2 * 0.92), Math.round(ty2 + th2 * 0.82));
        ctx.closePath(); ctx.fill();
      }

      // Near tree line — largest, blackest, closest
      ctx.fillStyle = '#020a02'; ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const tx2 = px + pw * (0.01 + i * 0.198), tw2 = pw * 0.10, th2 = ph * 0.28;
        const ty2 = botY - th2 * 0.85;
        ctx.fillRect(Math.round(tx2 + tw2 * 0.44), Math.round(ty2 + th2 * 0.5), Math.round(tw2 * 0.14), Math.round(th2 * 0.5));
        ctx.beginPath();
        ctx.moveTo(Math.round(tx2 + tw2 * 0.5), Math.round(ty2));
        ctx.lineTo(Math.round(tx2), Math.round(ty2 + th2 * 0.6));
        ctx.lineTo(Math.round(tx2 + tw2), Math.round(ty2 + th2 * 0.6));
        ctx.closePath(); ctx.fill();
      }

      // Fireflies
      for (let i = 0; i < 10; i++) {
        const fa = 0.5 + 0.5 * Math.sin(t * 0.045 + i * 1.8 + idx * 0.7);
        if (fa < 0.3) continue;
        const fx = px + pw * ((i * 0.097 + 0.04) % 1);
        const fy2 = botY - ph * (0.08 + (i * 0.073) % 0.25);
        ctx.globalAlpha = fa * 0.60;
        ctx.fillStyle = '#88ff22';
        ctx.fillRect(Math.round(fx), Math.round(fy2), 1, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'Plasma': {
      // Void nebula layers
      const nebColors = [
        ['rgba(140,0,220,', 0.20, 0.30],
        ['rgba(220,0,120,', 0.50, 0.55],
        ['rgba(80,0,180,',  0.70, 0.20],
      ];
      nebColors.forEach(([c, yf, hf], ni) => {
        const ng = ctx.createRadialGradient(
          px + pw * (0.3 + ni * 0.2 + 0.1 * Math.sin(t * 0.005 + ni)), py + ph * yf,
          pw * 0.01,
          px + pw * (0.3 + ni * 0.2 + 0.1 * Math.sin(t * 0.005 + ni)), py + ph * yf,
          pw * (0.4 + hf)
        );
        ng.addColorStop(0, c + (0.28 + 0.12 * Math.sin(t * 0.011 + ni * 2)) + ')');
        ng.addColorStop(1, 'transparent');
        ctx.fillStyle = ng; ctx.fillRect(px, py, pw, ph);
      });
      // Distant void planet / orb
      const orbX = px + pw * 0.65, orbY = py + ph * 0.30, orbR = pw * 0.10;
      const orbG = ctx.createRadialGradient(orbX - orbR * 0.3, orbY - orbR * 0.3, 0, orbX, orbY, orbR);
      orbG.addColorStop(0, '#9933cc');
      orbG.addColorStop(0.6, '#550088');
      orbG.addColorStop(1, '#220044');
      ctx.fillStyle = orbG;
      ctx.beginPath(); ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2); ctx.fill();
      // Orb ring
      ctx.strokeStyle = 'rgba(200,80,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(orbX, orbY, orbR * 1.5, orbR * 0.35, -0.3, 0, Math.PI * 2); ctx.stroke();
      // Dark jagged horizon
      ctx.fillStyle = '#060010';
      ctx.beginPath();
      ctx.moveTo(px, botY);
      ctx.lineTo(px + pw * 0.06, botY - ph * 0.10);
      ctx.lineTo(px + pw * 0.18, botY - ph * 0.18);
      ctx.lineTo(px + pw * 0.28, botY - ph * 0.08);
      ctx.lineTo(px + pw * 0.42, botY - ph * 0.22);
      ctx.lineTo(px + pw * 0.56, botY - ph * 0.14);
      ctx.lineTo(px + pw * 0.68, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.80, botY - ph * 0.10);
      ctx.lineTo(px + pw * 0.92, botY - ph * 0.16);
      ctx.lineTo(px + pw, botY - ph * 0.08);
      ctx.lineTo(px + pw, botY);
      ctx.closePath(); ctx.fill();
      // Floating energy orbs / motes
      for (let i = 0; i < 10; i++) {
        const ox = px + pw * ((i * 0.10 + 0.05) % 1);
        const oy = py + ph * (0.15 + (i * 0.08) % 0.65);
        const oa = 0.35 + 0.45 * Math.sin(t * 0.022 + i * 1.9);
        ctx.globalAlpha = Math.max(0, oa);
        ctx.fillStyle = i % 3 === 0 ? '#cc44ff' : i % 3 === 1 ? '#ff44aa' : '#8844ff';
        ctx.beginPath(); ctx.arc(Math.round(ox), Math.round(oy), 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'Air': {
      // Bright high-altitude sky wash
      const atm = ctx.createLinearGradient(px, py, px, botY);
      atm.addColorStop(0, 'rgba(20,30,50,0)');
      atm.addColorStop(0.6, 'rgba(30,50,80,0.08)');
      atm.addColorStop(1, 'rgba(60,90,130,0.14)');
      ctx.fillStyle = atm; ctx.fillRect(px, py, pw, ph);
      // Distant mountain peaks (airy blue-grey)
      ctx.fillStyle = '#0c1420';
      ctx.beginPath();
      ctx.moveTo(px, botY);
      ctx.lineTo(px + pw * 0.08, botY - ph * 0.30);
      ctx.lineTo(px + pw * 0.20, botY - ph * 0.20);
      ctx.lineTo(px + pw * 0.34, botY - ph * 0.42);
      ctx.lineTo(px + pw * 0.46, botY - ph * 0.28);
      ctx.lineTo(px + pw * 0.60, botY - ph * 0.35);
      ctx.lineTo(px + pw * 0.72, botY - ph * 0.22);
      ctx.lineTo(px + pw * 0.86, botY - ph * 0.30);
      ctx.lineTo(px + pw, botY - ph * 0.18);
      ctx.lineTo(px + pw, botY);
      ctx.closePath(); ctx.fill();
      // Snow on peak tops
      ctx.fillStyle = '#1e2e40'; ctx.globalAlpha = 0.5;
      [[0.34, 0.42, 0.44, 0.36], [0.60, 0.35, 0.70, 0.27], [0.08, 0.30, 0.14, 0.22]].forEach(([x1,y1,x2,y2])=>{
        ctx.beginPath();
        ctx.moveTo(px + pw * x1, botY - ph * y1);
        ctx.lineTo(px + pw * ((x1+x2)/2 - 0.05), botY - ph * (y1 * 0.82));
        ctx.lineTo(px + pw * x2, botY - ph * y2);
        ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = 1;
      // Near hill
      ctx.fillStyle = '#08101a';
      _drawPanelHillShape(ctx, px, py, pw, ph, 0.7 + idx * 0.65, 0.16);
      // Drifting cloud wisps
      for (let i = 0; i < 4; i++) {
        const cy2 = py + ph * (0.10 + i * 0.11);
        const cx2 = px + ((t * 0.18 + i * pw * 0.32) % (pw * 1.8)) - pw * 0.4;
        const cw2 = pw * (0.28 + 0.14 * ((i * 3 + 1) % 3) / 2);
        const clg = ctx.createLinearGradient(cx2, cy2, cx2, cy2 + ph * 0.035);
        clg.addColorStop(0, 'rgba(100,140,180,0.09)');
        clg.addColorStop(0.5, 'rgba(120,160,200,0.06)');
        clg.addColorStop(1, 'transparent');
        ctx.fillStyle = clg;
        ctx.fillRect(Math.round(cx2), Math.round(cy2), Math.round(cw2), Math.round(ph * 0.035));
      }
      // Wind particle streaks
      for (let i = 0; i < 6; i++) {
        const wp = ((t * 0.014 + i * 0.22) % 1);
        const wy2 = py + ph * (0.55 + (i * 0.07) % 0.30);
        const wx2 = px + wp * pw * 1.3 - pw * 0.15;
        ctx.globalAlpha = (1 - wp) * 0.12;
        ctx.fillStyle = '#aaccee';
        ctx.fillRect(Math.round(wx2), Math.round(wy2), Math.round(pw * 0.12), 1);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'Camp': {
      // Night sky
      const atm = ctx.createLinearGradient(px, py, px, botY);
      atm.addColorStop(0, '#02040c');
      atm.addColorStop(0.65, '#050810');
      atm.addColorStop(1, '#080e16');
      ctx.fillStyle = atm; ctx.fillRect(px, py, pw, ph);

      // Stars
      for (let i = 0; i < 22; i++) {
        const sx = px + pw * ((i * 0.053 + 0.02 + idx * 0.13) % 1);
        const sy = py + ph * (0.03 + (i * 0.047) % 0.42);
        const sa = 0.25 + 0.55 * Math.sin(t * 0.028 + i * 2.1);
        ctx.globalAlpha = Math.max(0, sa) * 0.72;
        ctx.fillStyle = '#ccd4f0';
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
      ctx.globalAlpha = 1;

      // Crescent moon (upper right)
      {
        const mx = px + pw * 0.80, my = py + ph * 0.09;
        const mr = Math.max(4, Math.round(pw * 0.038));
        ctx.globalAlpha = 0.55; ctx.fillStyle = '#e8e0c0';
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#02030a';
        ctx.beginPath(); ctx.arc(mx + Math.round(mr * 0.55), my - Math.round(mr * 0.2), Math.round(mr * 0.88), 0, Math.PI * 2); ctx.fill();
      }

      // Background distant dark hill
      ctx.fillStyle = '#04090a';
      _drawPanelHillShape(ctx, px, py, pw, ph, 0.8 + idx * 0.6, 0.40);

      // Hill geometry: rises from left, levels off into a flat plateau where the tent sits
      const hillTopY  = botY - ph * 0.27;
      const fireX     = px + pw * 0.28;
      const flatEnd   = px + pw * 0.76;

      ctx.fillStyle = '#060e06';
      ctx.beginPath();
      ctx.moveTo(px, botY);
      ctx.bezierCurveTo(px + pw * 0.06, botY, px + pw * 0.14, hillTopY, fireX, hillTopY);
      ctx.lineTo(flatEnd, hillTopY);
      ctx.bezierCurveTo(flatEnd + pw * 0.08, hillTopY, px + pw * 0.94, botY, px + pw, botY);
      ctx.closePath(); ctx.fill();

      // ── Campfire — actual sprite animation ───────────────────────────────
      const logScale  = Math.max(1, Math.round(pw / 140));
      const logPal    = ['#6a3810', '#3a1808', '#c8a060', '#2a1004'];
      const logW2     = 12 * logScale;
      const logH2     = SPRITE_CF_LOGS.length * logScale;
      const logSX     = Math.round(fireX - logW2 / 2);
      const logSY     = hillTopY - logH2 + 2;
      drawSprite(ctx, SPRITE_CF_LOGS, logSX, logSY, logScale, logPal);

      const frameIdx  = Math.floor(t / 5) % 3;
      const flameRows = [SPRITE_CF_FLAME_A, SPRITE_CF_FLAME_B, SPRITE_CF_FLAME_C][frameIdx];
      const flickPals = [
        ['#FF7700','#FFAA00','#FF3300','#FF9900'],
        ['#FF5500','#FF8800','#FF2200','#FFCC00'],
        ['#FF9900','#FFCC00','#FF4400','#FFAA00'],
      ];
      const flameH2   = flameRows.length * logScale;
      const flameSX   = logSX;
      const flameSY   = logSY - flameH2 + logScale * 2;
      drawSprite(ctx, flameRows, flameSX, flameSY, logScale, flickPals[frameIdx]);

      // Fire glow on hill
      const flicker = 0.85 + 0.15 * Math.sin(t * 0.13);
      const fglow   = ctx.createRadialGradient(fireX, hillTopY, 0, fireX, hillTopY, pw * 0.24 * flicker);
      fglow.addColorStop(0,   `rgba(255,120,20,${0.30 * flicker})`);
      fglow.addColorStop(0.4, `rgba(200,70,5,${0.10 * flicker})`);
      fglow.addColorStop(1,   'transparent');
      ctx.fillStyle = fglow; ctx.fillRect(px, py, pw, ph);

      // Embers
      for (let i = 0; i < 6; i++) {
        const p  = ((t * 0.011 + i * 0.22) % 1);
        const ex = fireX + Math.sin(t * 0.04 + i * 1.5) * pw * 0.02;
        const ey = flameSY - p * ph * 0.10;
        ctx.globalAlpha = (1 - p) * 0.8;
        ctx.fillStyle   = i % 2 ? '#ff6600' : '#ffaa00';
        ctx.fillRect(Math.round(ex), Math.round(ey), 1, 1);
      }
      ctx.globalAlpha = 1;

      // ── Hooded figure sitting to the right of fire ───────────────────────
      const figX  = Math.round(fireX + logW2 * 0.9);
      const figH3 = logH2 * 1.3, figW3 = logW2 * 0.55;
      ctx.fillStyle = '#07040a';
      ctx.fillRect(figX, Math.round(hillTopY - figH3), Math.round(figW3), Math.round(figH3));
      ctx.beginPath();
      ctx.arc(figX + Math.round(figW3 / 2), Math.round(hillTopY - figH3 - figW3 * 0.42), Math.round(figW3 * 0.46), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,90,10,${0.22 + 0.07 * flicker})`;
      ctx.fillRect(figX, Math.round(hillTopY - figH3), Math.round(figW3 * 0.32), Math.round(figH3));

      // ── Merchant tent on the flat section (matching map.js shop tent) ─────
      const tentCX   = px + pw * 0.60;
      const tentBase = hillTopY;
      const tentW3   = pw * 0.28;
      const tentH3   = ph * 0.20;
      const tentPeak = tentBase - tentH3;

      // Main triangle body
      ctx.fillStyle = '#3a2810';
      ctx.beginPath();
      ctx.moveTo(tentCX - tentW3 / 2, tentBase);
      ctx.lineTo(tentCX + tentW3 / 2, tentBase);
      ctx.lineTo(tentCX, tentPeak);
      ctx.closePath(); ctx.fill();

      // Two darker stripes from peak
      ctx.fillStyle = '#2a1c08';
      ctx.beginPath();
      ctx.moveTo(tentCX, tentPeak);
      ctx.lineTo(tentCX - tentW3 * 0.18, tentBase);
      ctx.lineTo(tentCX - tentW3 * 0.15, tentBase);
      ctx.lineTo(tentCX, tentPeak + tentH3 * 0.08);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tentCX, tentPeak);
      ctx.lineTo(tentCX + tentW3 * 0.18, tentBase);
      ctx.lineTo(tentCX + tentW3 * 0.15, tentBase);
      ctx.lineTo(tentCX, tentPeak + tentH3 * 0.08);
      ctx.closePath(); ctx.fill();

      // Outline
      ctx.strokeStyle = '#6a4818'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tentCX - tentW3 / 2, tentBase);
      ctx.lineTo(tentCX, tentPeak);
      ctx.lineTo(tentCX + tentW3 / 2, tentBase);
      ctx.stroke();

      // Door
      const doorW = tentW3 * 0.26, doorH = tentH3 * 0.42;
      ctx.fillStyle = '#0a0618';
      ctx.fillRect(Math.round(tentCX - doorW / 2), Math.round(tentBase - doorH), Math.round(doorW), Math.round(doorH));

      // Animated flag at peak
      const flagWave = Math.sin(t * 0.06) * (ph * 0.003);
      ctx.fillStyle = '#c8a030';
      ctx.fillRect(Math.round(tentCX - 1), Math.round(tentPeak - tentH3 * 0.16), 1, Math.round(tentH3 * 0.16));
      ctx.fillStyle = '#e8c050';
      ctx.beginPath();
      ctx.moveTo(tentCX, tentPeak - tentH3 * 0.16);
      ctx.lineTo(tentCX + tentW3 * 0.12, tentPeak - tentH3 * 0.10 + flagWave);
      ctx.lineTo(tentCX, tentPeak - tentH3 * 0.04 + flagWave * 0.5);
      ctx.closePath(); ctx.fill();

      // Guy-ropes and stakes
      ctx.strokeStyle = '#3a2808'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tentCX, tentPeak); ctx.lineTo(tentCX - tentW3 * 0.72, tentBase); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tentCX, tentPeak); ctx.lineTo(tentCX + tentW3 * 0.72, tentBase); ctx.stroke();
      ctx.fillStyle = '#5a3810';
      ctx.fillRect(Math.round(tentCX - tentW3 * 0.73), Math.round(tentBase), 2, Math.round(ph * 0.018));
      ctx.fillRect(Math.round(tentCX + tentW3 * 0.71), Math.round(tentBase), 2, Math.round(ph * 0.018));

      // Lantern hanging off left rope with warm glow
      const lnX = tentCX - tentW3 * 0.38, lnY = tentBase - tentH3 * 0.22;
      const lnP = 0.5 + 0.3 * (Math.sin(t * 0.06) * 0.6 + Math.sin(t * 0.1 + 1.8) * 0.4);
      const lng2 = ctx.createRadialGradient(lnX, lnY, 0, lnX, lnY, pw * 0.06);
      lng2.addColorStop(0, `rgba(255,185,45,${lnP * 0.50})`);
      lng2.addColorStop(1, 'transparent');
      ctx.fillStyle = lng2; ctx.fillRect(lnX - pw * 0.06, lnY - pw * 0.06, pw * 0.12, pw * 0.12);
      ctx.fillStyle = '#1a1006'; ctx.strokeStyle = '#443010'; ctx.lineWidth = 0.8;
      ctx.fillRect(Math.round(lnX - pw * 0.011), Math.round(lnY - ph * 0.016), Math.round(pw * 0.020), Math.round(ph * 0.025));
      ctx.strokeRect(Math.round(lnX - pw * 0.011), Math.round(lnY - ph * 0.016), Math.round(pw * 0.020), Math.round(ph * 0.025));
      ctx.fillStyle = `rgba(255,195,40,${lnP})`;
      ctx.fillRect(Math.round(lnX - 1), Math.round(lnY - ph * 0.005), 2, 2);

      ctx.globalAlpha = 1;
      break;
    }
  }
}

// Shared hill shape helper (no fill setup — caller sets fillStyle)
function _drawPanelHillShape(ctx, px, py, pw, ph, phase, heightFrac) {
  const hy = py + ph * (1 - heightFrac);
  ctx.beginPath();
  for (let x = 0; x <= pw; x++) {
    const nx = x / pw;
    const y = hy + Math.sin(nx * Math.PI * 2.6 + phase) * ph * 0.07
                 + Math.sin(nx * Math.PI * 5.8 + phase * 0.55) * ph * 0.035
                 + Math.sin(nx * Math.PI * 11.2 + phase * 1.1) * ph * 0.015;
    x === 0 ? ctx.moveTo(px + x, Math.round(y)) : ctx.lineTo(px + x, Math.round(y));
  }
  ctx.lineTo(px + pw, py + ph); ctx.lineTo(px, py + ph); ctx.closePath(); ctx.fill();
}

function showBetweenRuns_map() {
  const canvas = document.getElementById('lobby-map-canvas');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  canvas.width  = Math.round(wrap.clientWidth  || window.innerWidth);
  canvas.height = Math.round(wrap.clientHeight || window.innerHeight);

  // Start player at return position (e.g. tailor) or default plaza
  const _startX = _lobbyReturnPos ? _lobbyReturnPos.x : LOBBY_PLAZA.x;
  const _startY = _lobbyReturnPos ? _lobbyReturnPos.y : LOBBY_PLAZA.y;
  _lobbyReturnPos = null;
  _lobbyPlayerX = _startX; _lobbyPlayerY = _startY;
  _lobbyTargetX = _startX; _lobbyTargetY = _startY;
  _lobbyWalking = false; _lobbyWalkDest = null; _lobbyWaypointQueue = []; _lobbyShootingStars = [];
  _lobbyCinematic = null; _lobbyCinematicTick = 0;
  _initLobbyBgZones(); // re-randomize zone backgrounds each visit

  // Click handler
  canvas.onclick = _lobbyClick;
  canvas.onmousemove = _lobbyHover;
  canvas.style.cursor = 'default';

  if (_lobbyAnimFrame) cancelAnimationFrame(_lobbyAnimFrame);
  _lobbyLoop();
}

function _lobbyLoop() {
  _lobbyTick++;
  _lobbyCinematicStep();
  _lobbyMovePlayer();
  _lobbyDraw();
  _lobbyAnimFrame = requestAnimationFrame(_lobbyLoop);
}

function _lobbyCinematicStep() {
  if (!_lobbyCinematic) return;
  _lobbyCinematicTick++;
  if (_lobbyCinematic === 'castle_enter') {
    // Transition once wizard has stopped walking (reached gate)
    if (!_lobbyWalking) {
      _lobbyCinematic = 'castle_teeth';
      _lobbyCinematicTick = 0;
    }
  } else if (_lobbyCinematic === 'castle_teeth') {
    if (_lobbyCinematicTick > 110) {
      _lobbyCinematic = 'castle_fade';
      _lobbyCinematicTick = 0;
    }
  } else if (_lobbyCinematic === 'castle_fade') {
    if (_lobbyCinematicTick > 80) {
      _lobbyCinematic = null;
      _lobbyCinematicTick = 0;
      lobbyStartRun();
    }
  }
}

function _lobbyMovePlayer() {
  if (!_lobbyWalking) return;
  const W = document.getElementById('lobby-map-canvas')?.width || 400;
  const H = document.getElementById('lobby-map-canvas')?.height || 600;
  const px = _lobbyPlayerX * W, py = _lobbyPlayerY * H;
  const tx = _lobbyTargetX * W, ty = _lobbyTargetY * H;
  const dx = tx - px, dy = ty - py;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const speed = _lobbyCinematic === 'castle_enter' ? 1.6 : 3.2;
  if (dist < speed + 1) {
    _lobbyPlayerX = _lobbyTargetX;
    _lobbyPlayerY = _lobbyTargetY;
    _lobbyWalking = false;
    if (_lobbyWaypointQueue.length > 0) {
      const next = _lobbyWaypointQueue.shift();
      _lobbyTargetX = next.x;
      _lobbyTargetY = next.y;
      _lobbyWalking = true;
      if (next.finalDest) _lobbyWalkDest = next.finalDest;
    } else if (_lobbyWalkDest) {
      const dest = _lobbyWalkDest;
      _lobbyWalkDest = null;
      setTimeout(() => _openLobbyLocation(dest), 80);
    }
  } else {
    _lobbyFacingLeft = dx < 0;
    _lobbyPlayerX += (dx / dist) * speed / W;
    _lobbyPlayerY += (dy / dist) * speed / H;
  }
}

function _lobbyDraw() {
  const canvas = document.getElementById('lobby-map-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  _drawLobbyMap(ctx, W, H);
}

function _drawShootingStars(ctx, W, H) {
  // Spawn a new shooting star occasionally
  if (Math.random() < 0.012 && _lobbyShootingStars.length < 5) {
    const angle = (Math.PI / 6) + Math.random() * (Math.PI / 6); // 30–60° downward diagonal
    const spd   = W * (0.006 + Math.random() * 0.008);
    _lobbyShootingStars.push({
      x:      Math.random() * W,
      y:      Math.random() * H * 0.30,
      vx:     Math.cos(angle) * spd,
      vy:     Math.sin(angle) * spd,
      life:   0,
      maxLife: 35 + Math.floor(Math.random() * 30),
      len:    W * (0.06 + Math.random() * 0.08),
    });
  }

  ctx.save();
  _lobbyShootingStars = _lobbyShootingStars.filter(s => {
    s.x += s.vx;
    s.y += s.vy;
    s.life++;

    const progress = s.life / s.maxLife;
    // Fade in then fade out
    const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

    // Tail — gradient from bright head to transparent tail
    const tailX = s.x - s.vx * (s.len / Math.hypot(s.vx, s.vy));
    const tailY = s.y - s.vy * (s.len / Math.hypot(s.vx, s.vy));
    const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.6, `rgba(200,200,255,${alpha * 0.3})`);
    grad.addColorStop(1,   `rgba(255,255,255,${alpha})`);

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bright head dot
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    return s.life < s.maxLife && s.y < H * 0.42;
  });
  ctx.restore();
}

function _drawLobbyMap(ctx, W, H) {
  // Castle cinematic: brief thud shake when drawbridge slams fully up
  ctx.save();
  if (_lobbyCinematic === 'castle_teeth' && _lobbyCinematicTick >= 97 && _lobbyCinematicTick < 110) {
    const intensity = (1 - (_lobbyCinematicTick - 97) / 13) * 3;
    ctx.translate((Math.random() - 0.5) * intensity * 2, (Math.random() - 0.5) * intensity);
  }

  // Base sky fill
  ctx.fillStyle = '#08050e';
  ctx.fillRect(0, 0, W, H);

  // Zone backgrounds in the distance (H*0.12 → H*0.60)
  _drawLobbyZonePanels(ctx, W, H);

  // Ground (horizon at H*0.60) — dark grassy green
  const gnd = ctx.createLinearGradient(0, H * 0.60, 0, H);
  gnd.addColorStop(0,   '#0e1e08');
  gnd.addColorStop(0.4, '#0c1a07');
  gnd.addColorStop(1,   '#081205');
  ctx.fillStyle = gnd;
  ctx.fillRect(0, H * 0.60, W, H);

  // Thin horizon glow
  const hglow = ctx.createLinearGradient(0, H * 0.57, 0, H * 0.63);
  hglow.addColorStop(0, 'transparent');
  hglow.addColorStop(0.5, 'rgba(30,60,12,0.28)');
  hglow.addColorStop(1, 'transparent');
  ctx.fillStyle = hglow;
  ctx.fillRect(0, H * 0.57, W, H * 0.06);

  // Winding dirt paths + foreground detail
  _drawLobbyPaths(ctx, W, H);
  _drawLobbyForeground(ctx, W, H);

  // Shooting stars
  _drawShootingStars(ctx, W, H);

  // Stars — varied sizes, flicker at different rates
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 137 + 17) % W);
    const sy = ((i * 97 + 31) % (H * 0.55));
    const flicker = 0.25 + 0.65 * Math.abs(Math.sin(_lobbyTick * (0.012 + (i % 7) * 0.004) + i * 1.3));
    ctx.globalAlpha = flicker;
    // Some stars are cross/plus shaped for extra sparkle
    if (i % 9 === 0) {
      const sz = 1.5 + (i % 3) * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - sz, sy, sz * 2 + 1, 1);
      ctx.fillRect(sx, sy - sz, 1, sz * 2 + 1);
    } else {
      const sz = i % 5 === 0 ? 2 : 1;
      ctx.fillStyle = i % 4 === 0 ? '#d0c8ff' : '#fffbe0';
      ctx.fillRect(sx, sy, sz, sz);
    }
  }
  ctx.restore();

  // Moon — pixel-art style (crescent via two circles, matching campfire _cfMoon)
  {
    const mx = Math.round(W * 0.80), my = Math.round(H * 0.07);
    const mr = Math.max(8, Math.round(W * 0.022));
    ctx.save();
    // Soft glow halo
    const halo = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.0);
    halo.addColorStop(0, 'rgba(220,200,140,0.14)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(mx, my, mr * 3.0, 0, Math.PI * 2); ctx.fill();
    // Moon body
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    // Shadow circle — creates crescent
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#08051a';
    ctx.beginPath();
    ctx.arc(mx + Math.round(mr * 0.55), my - Math.round(mr * 0.15), Math.round(mr * 0.86), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw castle
  _drawLobbycastle(ctx, W, H);

  // Draw fountain at town square center
  _drawLobbyFountain(ctx, W, H);

  // Draw location buildings (skip castle — already drawn as castle structure)
  LOBBY_LOCATIONS.forEach(loc => {
    if (loc.id === 'castle') return;
    _drawLobbyBuilding(ctx, loc, W, H);
  });


  // Draw player
  _drawLobbyPlayer(ctx, W, H);

  ctx.restore(); // end shake transform

  // ── DEV: refresh-background button (top-right corner) ────────────────────
  {
    const bw = Math.max(60, W * 0.09), bh = Math.max(18, H * 0.032);
    const bx = W - bw - 6, by = 6;
    const hov = _lobbyHoveredId === '__refreshBg__';
    ctx.save();
    ctx.fillStyle   = hov ? '#1a1a2a' : '#0e0e18';
    ctx.strokeStyle = hov ? '#8866cc' : '#443366';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill(); ctx.stroke();
    ctx.font = `${Math.max(9, Math.round(bh * 0.52))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = hov ? '#bb99ff' : '#665588';
    ctx.fillText('⟳ bg', bx + bw / 2, by + bh / 2);
    ctx.restore();
  }

  // Fade to black overlay (no shake)
  if (_lobbyCinematic === 'castle_fade') {
    const fadeAlpha = Math.min(1, _lobbyCinematicTick / 60);
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// Draws a brick/stone block pattern clipped to a rectangle.
// blockH controls row height; seed gives variation between surfaces.
function _drawStoneBlocks(ctx, rx, ry, rw, rh, blockH, seed) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  const mortar = 1;
  const rows = Math.ceil(rh / (blockH + mortar)) + 1;
  for (let row = 0; row <= rows; row++) {
    const rowY = ry + row * (blockH + mortar);
    const offset = row % 2 === 0 ? 0 : blockH * 0.55;
    let sx = rx - offset;
    let col = 0;
    while (sx < rx + rw) {
      const bw = blockH * (1.5 + ((seed * 7 + row * 13 + col * 5) % 9) * 0.1);
      if (sx + bw > rx) {
        const bx  = Math.max(sx, rx);
        const clw = Math.min(sx + bw - mortar, rx + rw) - bx;
        if (clw > 0) {
          const v = 18 + ((seed + row * 7 + col * 3) % 10);
          ctx.fillStyle = `rgb(${v},${v},${Math.round(v * 1.06)})`;
          ctx.fillRect(bx, rowY, clw, blockH);
        }
      }
      sx += bw + mortar;
      col++;
    }
  }
  ctx.restore();
}

function _drawLobbycastle(ctx, W, H) {
  const cx    = W * 0.50;
  const baseY = H * 0.60;          // horizon line where castle meets ground
  const s     = W * 0.38;          // master scale — bigger than before
  const t     = _lobbyTick;

  ctx.save();

  // ── Ominous castle glow backdrop ──────────────────────────────────────────
  const backGlow = ctx.createRadialGradient(cx, baseY - s * 0.5, s * 0.1, cx, baseY - s * 0.4, s * 1.1);
  backGlow.addColorStop(0, 'rgba(80,20,160,0.22)');
  backGlow.addColorStop(0.5, 'rgba(40,10,80,0.12)');
  backGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = backGlow;
  ctx.fillRect(cx - s, baseY - s * 1.2, s * 2, s * 1.4);

  // ── Outer curtain walls (wide low flanking walls) ─────────────────────────
  const cwW = s * 0.12, cwH = s * 0.22;
  [-1, 1].forEach(side => {
    const cwX = cx + side * s * 0.54 - (side > 0 ? cwW : 0);
    const cwY = baseY - cwH;
    ctx.fillStyle = '#131315';
    ctx.strokeStyle = '#252530';
    ctx.lineWidth = 1;
    ctx.fillRect(cwX, cwY, cwW, cwH);
    _drawStoneBlocks(ctx, cwX, cwY, cwW, cwH, s * 0.026, side * 17);
    ctx.strokeRect(cwX, cwY, cwW, cwH);
    // Curtain wall merlons
    const cmW = cwW / 5, cmH = s * 0.03;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#181818';
      ctx.strokeStyle = '#252530';
      ctx.fillRect(cwX + i * (cwW / 4), cwY - cmH, cmW, cmH);
      ctx.strokeRect(cwX + i * (cwW / 4), cwY - cmH, cmW, cmH);
    }
  });

  // ── Main keep (central body) ──────────────────────────────────────────────
  const keepW = s * 0.52, keepH = s * 0.48;
  const keepX = cx - keepW / 2, keepY = baseY - keepH;
  ctx.fillStyle = '#131315';
  ctx.strokeStyle = '#2a2535';
  ctx.lineWidth = 1.5;
  ctx.fillRect(keepX, keepY, keepW, keepH);
  _drawStoneBlocks(ctx, keepX, keepY, keepW, keepH, s * 0.030, 42);
  ctx.strokeRect(keepX, keepY, keepW, keepH);

  // Keep battlements
  const mW = keepW / 10, mH = s * 0.04;
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = '#1a1a1c';
      ctx.strokeStyle = '#2a2535';
      ctx.fillRect(keepX + i * (keepW / 9), keepY - mH, mW, mH);
      ctx.strokeRect(keepX + i * (keepW / 9), keepY - mH, mW, mH);
    }
  }

  // Keep windows — glowing amber
  const winW = keepW * 0.1, winH = keepH * 0.14;
  const winPulse = 0.5 + 0.25 * (Math.sin(t * 0.010) * 0.65 + Math.sin(t * 0.010 * 1.618 + 1.2) * 0.35);
  [0.28, 0.50, 0.72].forEach(xFrac => {
    const wx = keepX + keepW * xFrac - winW / 2;
    const wy = keepY + keepH * 0.28;
    // Arch window
    ctx.fillStyle = `rgba(255,180,60,${winPulse * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(wx, wy + winH);
    ctx.lineTo(wx, wy + winW / 2);
    ctx.arc(wx + winW / 2, wy + winW / 2, winW / 2, Math.PI, 0);
    ctx.lineTo(wx + winW, wy + winH);
    ctx.fill();
    // Window glow
    const wg = ctx.createRadialGradient(wx + winW/2, wy + winH/2, 0, wx + winW/2, wy + winH/2, winW * 1.5);
    wg.addColorStop(0, `rgba(255,160,40,${winPulse * 0.3})`);
    wg.addColorStop(1, 'transparent');
    ctx.fillStyle = wg;
    ctx.fillRect(wx - winW, wy - winW, winW * 3, winH * 2);
  });

  // ── Inner connecting walls (keep sides → tower inner face, curtain height) ─
  // Fills any visual seam between the keep edge and the tower at ground level
  [-1, 1].forEach(side => {
    const connX = side < 0 ? keepX - s * 0.16 : keepX + keepW;
    const connY = baseY - cwH;
    ctx.fillStyle = '#131315';
    ctx.strokeStyle = '#252530';
    ctx.lineWidth = 1;
    ctx.fillRect(connX, connY, s * 0.16, cwH);
    _drawStoneBlocks(ctx, connX, connY, s * 0.16, cwH, s * 0.028, side * 11 + 3);
    ctx.strokeRect(connX, connY, s * 0.16, cwH);
  });

  // ── Side towers (tall, dramatic) ──────────────────────────────────────────
  const twW = s * 0.16, twH = s * 0.68;
  [-1, 1].forEach(side => {
    const tx = cx + side * (keepW * 0.5 + twW) - (side > 0 ? twW : 0);
    const ty = baseY - twH;
    ctx.fillStyle = '#111113';
    ctx.strokeStyle = '#282535';
    ctx.lineWidth = 1.5;
    ctx.fillRect(tx, ty, twW, twH);
    _drawStoneBlocks(ctx, tx, ty, twW, twH, s * 0.026, side * 23 + 7);
    ctx.strokeRect(tx, ty, twW, twH);

    // Tower merlons
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = '#181818';
        ctx.strokeStyle = '#282535';
        ctx.fillRect(tx + i * (twW / 4), ty - mH, twW / 4 - 1, mH);
        ctx.strokeRect(tx + i * (twW / 4), ty - mH, twW / 4 - 1, mH);
      }
    }

    // Tower windows — flicker independently
    const twPulse = 0.4 + 0.3 * (Math.sin(t * 0.008 + side * 2.1) * 0.55 + Math.sin(t * 0.008 * 1.618 + side * 1.3 + 3.7) * 0.45);
    ctx.fillStyle = `rgba(255,200,80,${twPulse})`;
    const twx = tx + twW * 0.25, twy = ty + twH * 0.3, twWin = twW * 0.5, twWinH = twH * 0.12;
    ctx.beginPath();
    ctx.moveTo(twx, twy + twWinH);
    ctx.lineTo(twx, twy + twWin/2);
    ctx.arc(twx + twWin/2, twy + twWin/2, twWin/2, Math.PI, 0);
    ctx.lineTo(twx + twWin, twy + twWinH);
    ctx.fill();
  });

  // ── "Begin Run" button in top keep section (fits between towers) ─────────
  {
    const hovered = _lobbyHoveredId === 'castle';
    const btnMaxW = s * 0.20; // safe within the ~s*0.232 gap between towers
    const btnH    = Math.max(12, s * 0.065);
    const btnY    = keepY + keepH * 0.06;

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Shrink font until text fits
    let fs = Math.round(btnH * 0.55);
    ctx.font = `bold ${fs}px 'Cinzel', serif`;
    while (ctx.measureText('⚔ Begin Run').width > btnMaxW * 0.86 && fs > 5) {
      fs--;
      ctx.font = `bold ${fs}px 'Cinzel', serif`;
    }
    const txtW = ctx.measureText('⚔ Begin Run').width;
    const btnW = txtW + btnH * 0.9;
    const bx   = cx - btnW / 2;
    const br   = btnH * 0.28;

    // Dark background
    ctx.fillStyle   = hovered ? '#1e1608' : '#0a0806';
    ctx.strokeStyle = hovered ? '#c8a060' : '#4a3010';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(bx + br, btnY);
    ctx.lineTo(bx + btnW - br, btnY);
    ctx.arcTo(bx + btnW, btnY,         bx + btnW, btnY + br,         br);
    ctx.lineTo(bx + btnW, btnY + btnH - br);
    ctx.arcTo(bx + btnW, btnY + btnH,  bx + btnW - br, btnY + btnH,  br);
    ctx.lineTo(bx + br,  btnY + btnH);
    ctx.arcTo(bx,        btnY + btnH,  bx, btnY + btnH - br,         br);
    ctx.lineTo(bx,       btnY + br);
    ctx.arcTo(bx,        btnY,         bx + br, btnY,                 br);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = hovered ? '#ffd080' : '#c8a060';
    if (hovered) { ctx.shadowColor = '#ffd080'; ctx.shadowBlur = 6; }
    ctx.fillText('⚔ Begin Run', cx, btnY + btnH / 2);
    ctx.restore();
  }

  // ── Gate arch ────────────────────────────────────────────────────────────
  const gateW = keepW * 0.32, gateH = keepH * 0.45;
  const gateX = cx - gateW / 2, gateY = baseY - gateH;
  // Gate opening — pure black, no decorations
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(gateX, baseY);
  ctx.lineTo(gateX, gateY + gateW / 2);
  ctx.arc(cx, gateY + gateW / 2, gateW / 2, Math.PI, 0);
  ctx.lineTo(gateX + gateW, baseY);
  ctx.fill();

  // ── Long drawbridge (raises during castle-enter cinematic) ───────────────
  const bridgeW    = gateW * 1.05;
  const bridgeX    = cx - bridgeW / 2;
  const bridgeTopY = baseY;
  const bridgeBotY = H * 0.76;
  const bridgeLen  = bridgeBotY - bridgeTopY;
  const parapetW   = bridgeW * 0.08;

  // Compute raise progress (0 = flat, 1 = fully raised against gate)
  let raiseP = 0;
  if (_lobbyCinematic === 'castle_teeth' || _lobbyCinematic === 'castle_fade') {
    const bt  = _lobbyCinematic === 'castle_fade' ? 110 : _lobbyCinematicTick;
    const raw = Math.max(0, Math.min(1, (bt - 6) / 92));
    // Ease-in (slow taut start, accelerates like gravity pulling it up via chains)
    raiseP = raw * raw;
  }
  // tiltScale: how much of the bridge is still visible (shrinks from bottom as bridge rises)
  const tiltScale  = Math.max(0, 1 - raiseP);
  // Current Y of the bridge's far (player-side) edge as it rises
  const bridgeFarY = bridgeTopY + bridgeLen * tiltScale;

  // Bridge body — foreshortens from pivot as it raises
  ctx.save();
  ctx.translate(cx, bridgeTopY);
  ctx.scale(1, tiltScale);

  const bridgeGrad = ctx.createLinearGradient(-bridgeW / 2, 0, bridgeW / 2, 0);
  bridgeGrad.addColorStop(0,   '#1e1408');
  bridgeGrad.addColorStop(0.5, '#2e2010');
  bridgeGrad.addColorStop(1,   '#1e1408');
  ctx.fillStyle = bridgeGrad;
  ctx.fillRect(-bridgeW / 2, 0, bridgeW, bridgeLen);

  ctx.strokeStyle = '#0e0a04';
  ctx.lineWidth = 1;
  const rowCount = 8;
  for (let i = 1; i < rowCount; i++) {
    const rowY = bridgeLen * (i / rowCount);
    ctx.beginPath(); ctx.moveTo(-bridgeW / 2, rowY); ctx.lineTo(bridgeW / 2, rowY); ctx.stroke();
  }
  for (let row = 0; row < rowCount; row++) {
    const rowY = bridgeLen * (row / rowCount);
    const off  = row % 2 === 0 ? 0 : bridgeW / 6;
    for (let col = 0; col < 4; col++) {
      const colX = -bridgeW / 2 + off + col * (bridgeW / 3);
      if (colX > -bridgeW / 2 && colX < bridgeW / 2) {
        ctx.beginPath(); ctx.moveTo(colX, rowY); ctx.lineTo(colX, rowY + bridgeLen / rowCount); ctx.stroke();
      }
    }
  }
  [-bridgeW / 2 - parapetW * 0.5, bridgeW / 2 - parapetW * 0.5].forEach(px => {
    ctx.fillStyle = '#2a1c0c'; ctx.strokeStyle = '#1a1008'; ctx.lineWidth = 1;
    ctx.fillRect(px, 0, parapetW, bridgeLen);
    ctx.strokeRect(px, 0, parapetW, bridgeLen);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#3a2810';
      ctx.fillRect(px, bridgeLen * (i / 5), parapetW, bridgeLen / 10);
    }
  });

  ctx.restore();

  // Thick rising edge — the far end of the bridge visibly sweeping upward
  if (raiseP > 0 && tiltScale > 0) {
    const edgeH = Math.max(4, bridgeLen * 0.04);
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(bridgeX - 2, bridgeFarY - edgeH, bridgeW + 4, edgeH + 2);
    // Shadow beneath the rising edge
    const edgeShadow = ctx.createLinearGradient(0, bridgeFarY, 0, bridgeFarY + edgeH * 3);
    edgeShadow.addColorStop(0, 'rgba(0,0,0,0.35)');
    edgeShadow.addColorStop(1, 'transparent');
    ctx.fillStyle = edgeShadow;
    ctx.fillRect(bridgeX, bridgeFarY, bridgeW, edgeH * 3);
  }

  // Chains — upper endpoints stay at gate, lower follow the rising edge
  ctx.strokeStyle = '#7a6030';
  ctx.lineWidth = 2;
  [[bridgeX, -gateW * 0.35], [bridgeX + bridgeW, gateW * 0.35]].forEach(([btmX, gOff]) => {
    ctx.beginPath();
    ctx.moveTo(btmX, bridgeFarY);
    ctx.lineTo(cx + gOff, gateY + gateW * 0.1);
    ctx.stroke();
  });

  // Gate sealed: once bridge closes flush against the gate, cover the opening with stone
  if (raiseP > 0.6) {
    const sealP = Math.min(1, (raiseP - 0.6) / 0.4);
    ctx.save();
    ctx.globalAlpha = sealP;
    const sealGrad = ctx.createLinearGradient(gateX, 0, gateX + gateW, 0);
    sealGrad.addColorStop(0,   '#1a1008');
    sealGrad.addColorStop(0.35,'#2a1c10');
    sealGrad.addColorStop(0.65,'#2a1c10');
    sealGrad.addColorStop(1,   '#1a1008');
    ctx.fillStyle = sealGrad;
    ctx.beginPath();
    ctx.moveTo(gateX, baseY);
    ctx.lineTo(gateX, gateY + gateW / 2);
    ctx.arc(cx, gateY + gateW / 2, gateW / 2, Math.PI, 0);
    ctx.lineTo(gateX + gateW, baseY);
    ctx.fill();
    // Horizontal plank lines across the sealed gate
    ctx.strokeStyle = `rgba(10,6,2,${sealP * 0.8})`;
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const py = gateY + (baseY - gateY) * (i / 6);
      ctx.beginPath(); ctx.moveTo(gateX + 1, py); ctx.lineTo(gateX + gateW - 1, py); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function _drawLobbyFountain(ctx, W, H) {
  const cx = LOBBY_FOUNTAIN.x * W;
  const cy = LOBBY_FOUNTAIN.y * H;
  const r  = Math.max(22, W * 0.055);
  const t  = _lobbyTick;

  ctx.save();

  // Outer stone basin rim
  const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  rimGrad.addColorStop(0, '#2a1e40');
  rimGrad.addColorStop(1, '#110c1e');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a4aaa';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Water surface inside basin
  const waterGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.75);
  waterGrad.addColorStop(0, '#1a4060');
  waterGrad.addColorStop(1, '#0a1828');
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.76, r * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animated ripples on water surface
  for (let i = 0; i < 3; i++) {
    const phase = ((t * 0.025 + i * 0.333) % 1);
    const rr = r * 0.12 + r * 0.58 * phase;
    ctx.globalAlpha = (1 - phase) * 0.5;
    ctx.strokeStyle = '#60a8e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Central stone pillar
  ctx.fillStyle = '#1e1630';
  ctx.strokeStyle = '#5a3a8a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.05, r * 0.12, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Animated water jet — height pulses
  const jetH = r * (0.55 + 0.12 * Math.sin(t * 0.07));
  const jetGrad = ctx.createLinearGradient(cx, cy - jetH, cx, cy);
  jetGrad.addColorStop(0, '#b8e8ff');
  jetGrad.addColorStop(0.5, '#60b8f0');
  jetGrad.addColorStop(1, '#2060a0');
  ctx.fillStyle = jetGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy - jetH * 0.5, r * 0.055, jetH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Droplets arcing outward from jet tip
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const phase = ((t * 0.04 + i * 0.143) % 1);
    const spread = r * 0.62 * phase;
    const dropX = cx + Math.cos(angle) * spread;
    const dropY = (cy - jetH) - r * 0.35 * Math.sin(phase * Math.PI) + jetH * phase;
    ctx.globalAlpha = (1 - phase) * 0.75;
    ctx.fillStyle = '#a0d8ff';
    ctx.beginPath();
    ctx.arc(dropX, dropY, Math.max(1, r * 0.025), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Magic glow halo around fountain
  const haloPhase = 0.3 + 0.15 * Math.sin(t * 0.04);
  const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
  halo.addColorStop(0, `rgba(100,60,200,${haloPhase})`);
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.4, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.font = `${Math.round(W * 0.014)}px 'Cinzel', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7060a0';
  ctx.globalAlpha = 0.65;
  ctx.fillText('✦ Town Square ✦', cx, cy + r * 0.5 + W * 0.022);
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── Cobblestone paths — tree layout ───────────────────────────────────────
function _drawLobbyPaths(ctx, W, H) {
  // Cache paths on an offscreen canvas — expensive cobblestone drawing only runs on size change
  if (!_lobbyPathCanvas || _lobbyPathCacheW !== W || _lobbyPathCacheH !== H) {
    _lobbyPathCanvas = document.createElement('canvas');
    _lobbyPathCanvas.width  = W;
    _lobbyPathCanvas.height = H;
    _lobbyPathCacheW = W; _lobbyPathCacheH = H;
    _drawLobbyPathsActual(_lobbyPathCanvas.getContext('2d'), W, H);
  }
  ctx.drawImage(_lobbyPathCanvas, 0, 0);
}
function _drawLobbyPathsActual(ctx, W, H) {
  const fcx = LOBBY_FOUNTAIN.x * W;
  const fcy = LOBBY_FOUNTAIN.y * H;
  const pathW   = Math.max(5, W * 0.012);
  const branchW = pathW * 0.75;            // side branches slightly thinner
  const plazaRX = Math.max(30, W * 0.076);
  const plazaRY = plazaRX * 0.36;

  // Helper: point on the plaza ellipse edge toward a given world point
  function edgePt(lx, ly) {
    const a = Math.atan2(ly - fcy, lx - fcx);
    return [fcx + Math.cos(a) * plazaRX, fcy + Math.sin(a) * plazaRY];
  }
  // Helper: point on a quadratic bezier at parameter t
  function bezPt(x0, y0, cpx, cpy, x1, y1, t) {
    const mt = 1 - t;
    return [mt*mt*x0 + 2*mt*t*cpx + t*t*x1,
            mt*mt*y0 + 2*mt*t*cpy + t*t*y1];
  }

  // ── LEFT TRUNK: fountain → archive (farthest left) ──────────────────────
  const archLoc  = LOBBY_LOCATIONS.find(l => l.id === 'archive');
  const guildLoc = LOBBY_LOCATIONS.find(l => l.id === 'guild');
  const [ls0x, ls0y] = edgePt(archLoc.x * W, archLoc.y * H);
  const ls_cpx = 0.14*W, ls_cpy = 0.79*H;   // trunk control point
  const ls_ex  = archLoc.x * W, ls_ey = archLoc.y * H;
  _drawCobblestonePath(ctx, ls0x, ls0y, ls_cpx, ls_cpy, ls_ex, ls_ey, pathW);

  // Branch off trunk at t≈0.40 → guild
  const [ljx, ljy] = bezPt(ls0x, ls0y, ls_cpx, ls_cpy, ls_ex, ls_ey, 0.40);
  const gl_ex = guildLoc.x * W, gl_ey = guildLoc.y * H;
  _drawCobblestonePath(ctx, ljx, ljy,
    (ljx + gl_ex)*0.5 + W*0.02, (ljy + gl_ey)*0.5,
    gl_ex, gl_ey, branchW);

  // ── RIGHT TRUNK: fountain → vault (farthest right) ──────────────────────
  const vaultLoc  = LOBBY_LOCATIONS.find(l => l.id === 'vault');
  const tailorLoc = LOBBY_LOCATIONS.find(l => l.id === 'tailor');
  const [rs0x, rs0y] = edgePt(vaultLoc.x * W, vaultLoc.y * H);
  const rs_cpx = 0.86*W, rs_cpy = 0.79*H;
  const rs_ex  = vaultLoc.x * W, rs_ey = vaultLoc.y * H;
  _drawCobblestonePath(ctx, rs0x, rs0y, rs_cpx, rs_cpy, rs_ex, rs_ey, pathW);

  // Branch off trunk at t≈0.40 → tailor
  const [rjx, rjy] = bezPt(rs0x, rs0y, rs_cpx, rs_cpy, rs_ex, rs_ey, 0.40);
  const tl_ex = tailorLoc.x * W, tl_ey = tailorLoc.y * H;
  _drawCobblestonePath(ctx, rjx, rjy,
    (rjx + tl_ex)*0.5 - W*0.02, (rjy + tl_ey)*0.5,
    tl_ex, tl_ey, branchW);

  // ── BOTTOM PATHS: direct from plaza edge ────────────────────────────────
  ['library','talents'].forEach((id, i) => {
    const loc = LOBBY_LOCATIONS.find(l => l.id === id);
    const [sx, sy] = edgePt(loc.x * W, loc.y * H);
    const cpx = i === 0 ? 0.22*W : 0.76*W;
    _drawCobblestonePath(ctx, sx, sy, cpx, 0.96*H, loc.x*W, loc.y*H, pathW);
  });

  // ── BRIDGE PATH: plaza top edge → drawbridge bottom ─────────────────────
  const castleLoc = LOBBY_LOCATIONS.find(l => l.id === 'castle');
  const [bp0x, bp0y] = edgePt(castleLoc.x * W, castleLoc.y * H);
  const bridgeBotX = 0.50 * W, bridgeBotY = H * 0.76;
  _drawCobblestonePath(ctx, bp0x, bp0y, 0.50*W, (bp0y + bridgeBotY)*0.5, bridgeBotX, bridgeBotY, pathW);

  // ── VEIL PATH: branch left from bridge path toward grass beside bridge ───
  const veilLoc = LOBBY_LOCATIONS.find(l => l.id === 'veil');
  // Branch starts partway along bridge path (t≈0.55, near the lower portion)
  const bpCPy = (bp0y + bridgeBotY) * 0.5;
  const [vjx, vjy] = bezPt(bp0x, bp0y, 0.50*W, bpCPy, bridgeBotX, bridgeBotY, 0.55);
  const vl_ex = veilLoc.x * W, vl_ey = veilLoc.y * H;
  _drawCobblestonePath(ctx, vjx, vjy,
    (vjx + vl_ex) * 0.5, (vjy + vl_ey) * 0.5 - H * 0.01,
    vl_ex, vl_ey, branchW);

  // Thin perspective elliptical ring (drawn last to cap all path starts cleanly)
  _drawCobblestoneRing(ctx, fcx, fcy, plazaRX, plazaRY, pathW);
}

// Seeded PRNG — stable rock shapes that don't shimmer each frame
function _cobblePrng(seed) {
  let s = seed | 0;
  return function() {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

// Draws an irregular polygon cobblestone centred at (cx,cy) with avg radius r
function _drawCobbleStone(ctx, cx, cy, r, seed) {
  const rng = _cobblePrng(seed);
  const nV  = 6 + (rng() > 0.5 ? 1 : 0); // 6 or 7 sides
  const base = rng() * Math.PI;            // random starting angle
  const v    = 24 + Math.round(rng() * 14);
  ctx.fillStyle   = `rgb(${v},${v-1},${v-2})`;
  ctx.strokeStyle = '#09080a';
  ctx.lineWidth   = 0.9;
  ctx.beginPath();
  for (let i = 0; i < nV; i++) {
    const a  = base + (i / nV) * Math.PI * 2;
    const ir = r * (0.62 + rng() * 0.52); // irregular radius per vertex
    const vx = cx + Math.cos(a) * ir;
    const vy = cy + Math.sin(a) * ir * 0.72; // slight y-squish (perspective)
    i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Subtle lighter highlight near top-left of each stone
  ctx.fillStyle = `rgba(255,255,255,${0.04 + rng()*0.04})`;
  ctx.beginPath();
  ctx.ellipse(cx - r*0.18, cy - r*0.22, r*0.30, r*0.20, -0.5, 0, Math.PI*2);
  ctx.fill();
}

// Draws cobblestone path along a quadratic bezier
function _drawCobblestonePath(ctx, x0, y0, cpx, cpy, x1, y1, pathW) {
  // Mortar base
  ctx.strokeStyle = '#0c0b09'; ctx.lineWidth = pathW + 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(cpx,cpy,x1,y1); ctx.stroke();
  ctx.strokeStyle = '#161412'; ctx.lineWidth = pathW;
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(cpx,cpy,x1,y1); ctx.stroke();

  const roughLen = Math.hypot(x1-x0, y1-y0) * 1.22;
  const stoneR   = Math.max(2.5, pathW * 0.34);
  const spacing  = stoneR * 1.55;
  const nStones  = Math.max(6, Math.ceil(roughLen / spacing));
  // Seed from endpoints so same path = same pattern
  let baseSeed = Math.round(x0*11 + y0*17 + x1*7 + y1*5);

  for (let s = 0; s < nStones; s++) {
    const rng = _cobblePrng(baseSeed + s * 97);
    // Slightly jittered t position
    const t2 = Math.max(0.01, Math.min(0.99, (s + 0.5 + (rng() - 0.5) * 0.5) / nStones));
    const mt = 1 - t2;
    const px = mt*mt*x0 + 2*mt*t2*cpx + t2*t2*x1;
    const py = mt*mt*y0 + 2*mt*t2*cpy + t2*t2*y1;
    // Normal direction for lateral scatter
    const dtx = 2*(1-t2)*(cpx-x0) + 2*t2*(x1-cpx);
    const dty = 2*(1-t2)*(cpy-y0) + 2*t2*(y1-cpy);
    const tLen = Math.sqrt(dtx*dtx+dty*dty) || 1;
    const nx = -(dty/tLen), ny = dtx/tLen;
    // Three lanes across full path width
    const lanes = [-0.40, 0, 0.40];
    lanes.forEach((lane, li) => {
      const lRng = _cobblePrng(baseSeed + s * 97 + li * 1009);
      const across = lane * pathW + (lRng() - 0.5) * pathW * 0.18;
      const sr = stoneR * (0.78 + lRng() * 0.44);
      _drawCobbleStone(ctx, px + nx*across, py + ny*across, sr, baseSeed + s * 131 + li * 53 + 77);
    });
  }
}

// Thin elliptical cobblestone ring — perspective trick makes it look flat on the ground
function _drawCobblestoneRing(ctx, cx, cy, rX, rY, pathW) {
  // Ring thickness: narrow so it reads as a single row of cobbles
  const ringW = Math.max(5, pathW * 1.1);
  const sw    = Math.max(2, pathW * 0.41);  // half-size stones along ring
  const innerRX = rX - ringW * 0.5, innerRY = rY - ringW * 0.5 * (rY / rX);
  const outerRX = rX + ringW * 0.5, outerRY = rY + ringW * 0.5 * (rY / rX);

  // Mortar base — two ellipse strokes (outer shadow, inner mortar)
  ctx.strokeStyle = '#0e0c0a'; ctx.lineWidth = ringW + 3; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.ellipse(Math.round(cx), Math.round(cy), rX, rY, 0, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = '#1c1a15'; ctx.lineWidth = ringW;
  ctx.beginPath(); ctx.ellipse(Math.round(cx), Math.round(cy), rX, rY, 0, 0, Math.PI*2); ctx.stroke();

  // Polygon cobblestones along the ellipse — perspective-scaled
  const circumference = Math.PI * (3*(rX+rY) - Math.sqrt((3*rX+rY)*(rX+3*rY)));
  const stoneR  = Math.max(2, sw * 0.85);
  const nStones = Math.max(24, Math.ceil(circumference / (stoneR * 1.55)));

  for (let s = 0; s < nStones; s++) {
    const angle  = (s / nStones) * Math.PI * 2;
    const px     = cx + Math.cos(angle) * rX;
    const py     = cy + Math.sin(angle) * rY;
    // Perspective scale: top (angle≈-π/2) = small/far, bottom (angle≈π/2) = large/near
    const pScale = 0.62 + 0.38 * ((Math.sin(angle) + 1) * 0.5);
    _drawCobbleStone(ctx, px, py, stoneR * pScale, s * 113 + 41);
  }
}

// ── Foreground environmental detail ───────────────────────────────────────
function _drawLobbyForeground(ctx, W, H) {
  const t = _lobbyTick;

  // ── River (horizontal across foreground, bridge passes over it) ────────
  const spts = [
    [-0.02*W, 0.634*H],
    [ 0.13*W, 0.622*H],
    [ 0.28*W, 0.638*H],
    [ 0.50*W, 0.628*H],
    [ 0.72*W, 0.638*H],
    [ 0.87*W, 0.622*H],
    [ 1.02*W, 0.634*H],
  ];
  // Draw river: dark shadow, water body, shimmer, bank edges
  const drawStream = (col, lw, off) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(spts[0][0]+off, spts[0][1]);
    for (let i=1;i<spts.length;i++) {
      const mp = [(spts[i-1][0]+spts[i][0])/2+off, (spts[i-1][1]+spts[i][1])/2];
      ctx.quadraticCurveTo(mp[0], mp[1], spts[i][0]+off, spts[i][1]);
    }
    ctx.stroke();
  };
  drawStream('#050a12', 44, 0); // bank/shadow
  drawStream('#081426', 32, 0); // deep water
  drawStream('#0e1e3a', 20, 0); // mid water
  drawStream('#142846', 10, 0); // surface
  // Animated shimmer highlights
  ctx.globalAlpha = 0.32 + 0.16*Math.sin(t*0.04);
  drawStream('#206078', 5, -2);
  ctx.globalAlpha = 0.20 + 0.12*Math.sin(t*0.06 + 1.2);
  drawStream('#4080a0', 3, 3);
  ctx.globalAlpha = 1;

  // ── Grass tufts (deterministic scatter across ground) ─────────────────
  const tufts = [
    [0.06,0.68],[0.10,0.69],[0.18,0.68],[0.24,0.74],[0.32,0.67],
    [0.36,0.79],[0.44,0.67],[0.48,0.75],[0.52,0.68],[0.56,0.84],
    [0.62,0.68],[0.68,0.78],[0.72,0.67],[0.76,0.72],[0.80,0.88],
    [0.85,0.67],[0.90,0.74],[0.94,0.67],[0.11,0.86],[0.89,0.82],
  ];
  tufts.forEach(([fx, fy], i) => {
    const gx = fx*W, gy = fy*H;
    const gs = Math.max(4, W*0.006);
    const sway = Math.sin(t*0.022 + i*1.4) * gs*0.35;
    ctx.strokeStyle = i%3===0 ? '#2a4410' : i%3===1 ? '#1e3808' : '#163010';
    ctx.lineWidth = 1;
    for (let b=0;b<3;b++) {
      const bx = gx + (b-1)*gs*0.5;
      ctx.beginPath();
      ctx.moveTo(Math.round(bx), Math.round(gy));
      ctx.lineTo(Math.round(bx+sway+(b-1)*gs*0.25), Math.round(gy-gs*(0.7+b*0.25)));
      ctx.stroke();
    }
  });

  // ── Small rocks scattered here and there ──────────────────────────────
  const rocks = [[0.09,0.67],[0.38,0.74],[0.62,0.81],[0.88,0.70],[0.23,0.88]];
  rocks.forEach(([fx, fy], i) => {
    const rx = fx*W, ry = fy*H, rs = Math.max(2, W*0.005);
    ctx.fillStyle = '#14120e';
    ctx.beginPath();
    ctx.ellipse(Math.round(rx), Math.round(ry), Math.round(rs*(1.4+i*0.1)), Math.round(rs*0.7), 0.2+i*0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#1c1a16';
    ctx.beginPath();
    ctx.ellipse(Math.round(rx-rs*0.2), Math.round(ry-rs*0.15), Math.round(rs*0.6), Math.round(rs*0.35), 0.2+i*0.3, 0, Math.PI*2);
    ctx.fill();
  });

  // ── Edge trees (silhouettes at left and right margins) ────────────────
  const edgeTrees = [
    {x:0.02, y:0.68, s:0.8}, {x:0.04, y:0.73, s:0.65},
    {x:0.96, y:0.67, s:0.75},{x:0.98, y:0.72, s:0.60},
    {x:0.01, y:0.78, s:0.55},{x:0.99, y:0.79, s:0.50},
  ];
  edgeTrees.forEach(tr => {
    const txp = tr.x*W, typ = tr.y*H, trs = tr.s * Math.max(16, W*0.022);
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(Math.round(txp-trs*0.16), Math.round(typ-trs*1.2), Math.round(trs*0.32), Math.round(trs*1.2));
    ctx.fillStyle = '#061208';
    ctx.beginPath(); ctx.arc(Math.round(txp), Math.round(typ-trs*1.4), Math.round(trs*0.75), 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(Math.round(txp-trs*0.35), Math.round(typ-trs*1.2), Math.round(trs*0.55), 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(Math.round(txp+trs*0.35), Math.round(typ-trs*1.1), Math.round(trs*0.50), 0, Math.PI*2); ctx.fill();
  });

  // ── Small wildflowers along river banks ────────────────────────────────
  const flowers = [[0.08,0.65],[0.20,0.66],[0.42,0.64],[0.62,0.65],[0.78,0.66],[0.92,0.65]];
  flowers.forEach(([fx,fy],i) => {
    const flx = fx*W, fly = fy*H, flr = Math.max(1, W*0.004);
    const fc = ['#3a1a30','#1a1a40','#2a1a10','#1a2a10'][i];
    ctx.fillStyle = fc;
    ctx.beginPath(); ctx.arc(Math.round(flx), Math.round(fly), Math.round(flr), 0, Math.PI*2); ctx.fill();
    // Stem
    ctx.strokeStyle = '#0e1808'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(Math.round(flx), Math.round(fly)); ctx.lineTo(Math.round(flx), Math.round(fly+flr*2.5)); ctx.stroke();
  });
}

// ── Notification badge check ───────────────────────────────────────────────
function _lobbyBuildingHasNotif(id) {
  try {
    const meta = getMeta();
    const phos = meta.phos || 0;
    if (id === 'vault') return (meta.unseenArtifacts || []).length > 0;
    if (id === 'library') {
      if ((meta.unseenBookIds || []).length > 0) return true;
      if (typeof SPELLBOOK_CATALOGUE === 'undefined') return false;
      const bul = meta.bookUpgradeLevels || {};
      const bsl = meta.bookSlotUpgrades  || {};
      for (const bid of (meta.ownedBookIds || [])) {
        const cat = SPELLBOOK_CATALOGUE[bid];
        if (!cat) continue;
        const lvl = bul[bid] || 0;
        if (lvl < 4 && phos >= ((cat.upgradeCosts || [])[lvl] || 0)) return true;
        const ps = bsl[bid] || {};
        if ((ps.spellSlots   || 0) < 3 && phos >= ((ps.spellSlots   || 0) + 1) * 10) return true;
        if ((ps.passiveSlots || 0) < 2 && phos >= ((ps.passiveSlots || 0) + 1) * 12) return true;
      }
      const def = bsl['default'] || {};
      if ((def.spellSlots   || 0) < 3 && phos >= ((def.spellSlots   || 0) + 1) * 10) return true;
      if ((def.passiveSlots || 0) < 2 && phos >= ((def.passiveSlots || 0) + 1) * 12) return true;
      return false;
    }
    if (id === 'talents') {
      const talents = meta.talents || {};
      for (const key of Object.keys(TALENT_TREE||{})) {
        for (const node of TALENT_TREE[key].nodes) {
          const lvl = talents[node.id] || 0;
          if (lvl < node.maxLevel && phos >= node.cost(lvl+1)) return true;
        }
      }
      return false;
    }
  } catch(e) {}
  return false;
}

// ── Building dispatcher ────────────────────────────────────────────────────
function _drawLobbyBuilding(ctx, loc, W, H) {
  const hovered = _lobbyHoveredId === loc.id;
  const bx = Math.round(loc.x * W);
  const by = Math.round(loc.y * H);
  const bs = Math.max(14, Math.round(Math.min(W * 0.034, H * 0.050)));
  const t  = _lobbyTick;

  ctx.save();
  switch (loc.id) {
    case 'archive': _drawBuildingArchive(ctx, bx, by, bs, hovered, t);  break;
    case 'vault':   _drawBuildingVault(ctx, bx, by, bs, hovered, t);    break;
    case 'library': _drawBuildingLibrary(ctx, bx, by, bs, hovered, t);  break;
    case 'talents': _drawBuildingTalentTree(ctx, bx, by, bs, hovered, t); break;
    case 'guild':   _drawBuildingGuild(ctx, bx, by, bs, hovered, t);    break;
    case 'tailor':  _drawBuildingTailor(ctx, bx, by, bs, hovered, t);   break;
    case 'veil':    _drawBuildingVeil(ctx, bx, by, bs, hovered, t);     break;
  }
  // Label below
  const fs = Math.max(8, Math.round(W * 0.011));
  ctx.font = `${fs}px 'Cinzel', serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = hovered ? '#c8a060' : '#6a5030';
  ctx.fillText(loc.label, bx, by + Math.max(4, bs * 0.15));
  ctx.restore();

  // Notification dot — drawn after restore so it's always on top
  if (_lobbyBuildingHasNotif(loc.id)) {
    const dotR = Math.max(3, Math.round(bs * 0.22));
    const dotX = bx + Math.round(bs * 0.85);
    const dotY = by - Math.round(bs * 1.15);
    const pulse = 0.65 + 0.35 * Math.sin(t * 0.09);
    const isArtifact = loc.id === 'vault';
    ctx.save();
    // Glow ring
    ctx.globalAlpha = pulse * 0.4;
    ctx.fillStyle = isArtifact ? '#a080ff' : '#c8a060';
    ctx.beginPath(); ctx.arc(dotX, dotY, dotR + 2, 0, Math.PI*2); ctx.fill();
    // Solid dot
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = isArtifact ? '#9060ee' : '#c8a030';
    ctx.beginPath(); ctx.arc(dotX, dotY, dotR, 0, Math.PI*2); ctx.fill();
    // White highlight
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(dotX - dotR*0.3, dotY - dotR*0.3, dotR*0.35, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Archive — squat stone records hall ────────────────────────────────────
function _drawBuildingArchive(ctx, bx, by, bs, hov, t) {
  const bw = bs*2.0, bh = bs*1.25;
  // Wall body
  ctx.fillStyle = hov ? '#1e1e22' : '#171719';
  ctx.fillRect(Math.round(bx-bw/2), Math.round(by-bh), Math.round(bw), Math.round(bh));
  _drawStoneBlocks(ctx, bx-bw/2, by-bh, bw, bh, Math.max(4, bs*0.20), 7);
  // Stepped gable roof
  ctx.fillStyle = '#10100f';
  ctx.beginPath();
  ctx.moveTo(bx-bw/2-bs*0.10, by-bh);
  ctx.lineTo(bx, by-bh-bs*0.52);
  ctx.lineTo(bx+bw/2+bs*0.10, by-bh);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#252523'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx-bw/2-bs*0.10,by-bh); ctx.lineTo(bx+bw/2+bs*0.10,by-bh); ctx.stroke();
  // Arched door
  const dw = bs*0.52, dh = bh*0.52;
  ctx.fillStyle = '#09070e';
  ctx.fillRect(Math.round(bx-dw/2), Math.round(by-dh), Math.round(dw), Math.round(dh));
  ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(by-dh), Math.round(dw/2), Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#2a2010'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx-dw/2, by-dh); ctx.lineTo(bx-dw/2, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx+dw/2, by-dh); ctx.lineTo(bx+dw/2, by); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx, by-dh, dw/2, Math.PI, 0); ctx.stroke();
  // Slit windows (warm dim glow behind)
  [-bw*0.34, bw*0.26].forEach(ox => {
    const wx = bx+ox, wy = by-bh*0.72, ww2 = bs*0.11, wh2 = bh*0.26;
    ctx.fillStyle = 'rgba(100,70,25,0.12)';
    ctx.fillRect(Math.round(wx-ww2*0.5), Math.round(wy-2), Math.round(ww2+4), Math.round(wh2+4));
    ctx.fillStyle = '#07060c';
    ctx.fillRect(Math.round(wx-ww2*0.5), Math.round(wy), Math.round(ww2), Math.round(wh2));
    ctx.strokeStyle = '#2a1e0e'; ctx.lineWidth=0.8;
    ctx.strokeRect(Math.round(wx-ww2*0.5), Math.round(wy), Math.round(ww2), Math.round(wh2));
  });
  // Carved scroll motif above door (3 horizontal score lines)
  ctx.strokeStyle = '#2e1e0a'; ctx.lineWidth = 0.8;
  for (let i=0;i<3;i++) {
    ctx.beginPath();
    ctx.moveTo(bx-bs*0.14, by-dh-bs*0.18-i*bs*0.09);
    ctx.lineTo(bx+bs*0.14, by-dh-bs*0.18-i*bs*0.09);
    ctx.stroke();
  }
  if (hov) { ctx.strokeStyle='#c8a060'; ctx.lineWidth=1.5; ctx.strokeRect(Math.round(bx-bw/2),Math.round(by-bh),Math.round(bw),Math.round(bh)); }
}

// ── Vault — heavily fortified treasury ────────────────────────────────────
function _drawBuildingVault(ctx, bx, by, bs, hov, t) {
  const bw = bs*1.8, bh = bs*1.1;
  // Battered walls (slightly wider at base)
  ctx.fillStyle = hov ? '#1a1a1c' : '#141416';
  ctx.beginPath();
  ctx.moveTo(bx-bw/2-bs*0.10, by);
  ctx.lineTo(bx-bw/2, by-bh);
  ctx.lineTo(bx+bw/2, by-bh);
  ctx.lineTo(bx+bw/2+bs*0.10, by);
  ctx.closePath(); ctx.fill();
  _drawStoneBlocks(ctx, bx-bw/2-bs*0.10, by-bh, bw+bs*0.20, bh, Math.max(4, bs*0.22), 13);
  // Flat crenellated top (merlons)
  const btX = bx-bw/2-bs*0.10, btW = bw+bs*0.20;
  const mW = Math.max(4, bs*0.18), mH = Math.max(3, bs*0.18), mGap = Math.max(3, bs*0.14);
  let mx2 = btX;
  while (mx2 + mW <= btX + btW) {
    ctx.fillStyle = hov ? '#1a1a1c' : '#141416';
    ctx.fillRect(Math.round(mx2), Math.round(by-bh-mH), Math.round(mW), Math.round(mH));
    _drawStoneBlocks(ctx, mx2, by-bh-mH, mW, mH, Math.max(3, bs*0.18), 13+Math.round(mx2));
    mx2 += mW + mGap;
  }
  // Heavy banded door
  const dw = bs*0.58, dh = bh*0.68;
  ctx.fillStyle = '#1e1006'; // old dark wood
  ctx.fillRect(Math.round(bx-dw/2), Math.round(by-dh), Math.round(dw), Math.round(dh));
  // Iron bands
  for (let i=0;i<4;i++) {
    ctx.fillStyle = '#252525';
    ctx.fillRect(Math.round(bx-dw/2), Math.round(by-dh+i*dh/4), Math.round(dw), Math.round(Math.max(2,bs*0.05)));
  }
  // Rivets on bands
  ctx.fillStyle = '#353535';
  for (let i=0;i<4;i++) {
    for (let j=0;j<2;j++) {
      ctx.beginPath();
      ctx.arc(Math.round(bx-dw/2+bs*0.09+j*(dw-bs*0.18)), Math.round(by-dh+i*dh/4+Math.max(1,bs*0.025)), Math.max(1,bs*0.04), 0, Math.PI*2);
      ctx.fill();
    }
  }
  // Door frame
  ctx.strokeStyle = '#3a2010'; ctx.lineWidth=1;
  ctx.strokeRect(Math.round(bx-dw/2), Math.round(by-dh), Math.round(dw), Math.round(dh));
  // Keyhole
  ctx.fillStyle = '#0c0a08';
  ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(by-dh*0.38), Math.max(2,bs*0.05), 0, Math.PI*2); ctx.fill();
  ctx.fillRect(Math.round(bx-bs*0.03), Math.round(by-dh*0.38), Math.round(bs*0.06), Math.round(bs*0.10));
  // Crest above door
  ctx.strokeStyle = '#382808'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(by-dh-bs*0.14), Math.round(Math.max(4,bs*0.12)), 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = '#2a2008'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(bx, by-dh-bs*0.26); ctx.lineTo(bx, by-dh-bs*0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx-bs*0.12, by-dh-bs*0.14); ctx.lineTo(bx+bs*0.12, by-dh-bs*0.14); ctx.stroke();
  if (hov) {
    ctx.strokeStyle='#c8a060'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(bx-bw/2-bs*0.10,by); ctx.lineTo(bx-bw/2,by-bh); ctx.lineTo(bx+bw/2,by-bh); ctx.lineTo(bx+bw/2+bs*0.10,by); ctx.stroke();
  }
}

// ── Library — tall narrow spellbook shop ──────────────────────────────────
function _drawBuildingLibrary(ctx, bx, by, bs, hov, t) {
  const bw = bs*1.45, bh = bs*1.55;
  // Wall (dark wood/plaster)
  ctx.fillStyle = hov ? '#1e1408' : '#16100a';
  ctx.fillRect(Math.round(bx-bw/2), Math.round(by-bh), Math.round(bw), Math.round(bh));
  // Wood plank lines
  ctx.strokeStyle = '#100c06'; ctx.lineWidth=0.8;
  const plankH = Math.max(4, bs*0.18);
  for (let i=0;i<Math.ceil(bh/plankH);i++) {
    const ly = by-bh+i*plankH;
    ctx.beginPath(); ctx.moveTo(bx-bw/2,ly); ctx.lineTo(bx+bw/2,ly); ctx.stroke();
  }
  // Steeply pitched roof
  ctx.fillStyle = '#0e0c08';
  ctx.beginPath();
  ctx.moveTo(bx-bw/2-bs*0.08, by-bh);
  ctx.lineTo(bx, by-bh-bs*0.82);
  ctx.lineTo(bx+bw/2+bs*0.08, by-bh);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1c1810'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(bx-bw/2-bs*0.08,by-bh); ctx.lineTo(bx+bw/2+bs*0.08,by-bh); ctx.stroke();
  // Large glowing window (warm amber inside)
  const ww = bw*0.60, wh = bh*0.34;
  const wx = bx-ww/2, wy = by-bh*0.72;
  // Glow behind
  const wglo = ctx.createRadialGradient(bx, wy+wh/2, 0, bx, wy+wh/2, ww*0.9);
  wglo.addColorStop(0,'rgba(190,120,35,0.28)'); wglo.addColorStop(1,'transparent');
  ctx.fillStyle=wglo; ctx.fillRect(bx-ww, wy-wh, ww*2, wh*3);
  ctx.fillStyle='#100e08';
  ctx.fillRect(Math.round(wx), Math.round(wy), Math.round(ww), Math.round(wh));
  ctx.fillStyle='rgba(170,100,28,0.20)';
  ctx.fillRect(Math.round(wx), Math.round(wy), Math.round(ww), Math.round(wh));
  // Window frame cross
  ctx.strokeStyle='#1e1608'; ctx.lineWidth=1;
  ctx.strokeRect(Math.round(wx), Math.round(wy), Math.round(ww), Math.round(wh));
  ctx.beginPath(); ctx.moveTo(bx,wy); ctx.lineTo(bx,wy+wh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx,wy+wh/2); ctx.lineTo(wx+ww,wy+wh/2); ctx.stroke();
  // Book silhouettes in window
  const bkColors = ['#0e1830','#12082a','#1a0a20','#080e18'];
  for (let i=0;i<3;i++) {
    ctx.fillStyle=bkColors[i];
    ctx.fillRect(Math.round(bx-ww*0.38+i*ww*0.26), Math.round(wy+wh*0.22), Math.round(ww*0.18), Math.round(wh*0.58));
  }
  // Door
  const ddw=bw*0.36, ddh=bh*0.28;
  ctx.fillStyle='#0c0808';
  ctx.fillRect(Math.round(bx-ddw/2), Math.round(by-ddh), Math.round(ddw), Math.round(ddh));
  ctx.strokeStyle='#221608'; ctx.lineWidth=0.8;
  ctx.strokeRect(Math.round(bx-ddw/2), Math.round(by-ddh), Math.round(ddw), Math.round(ddh));
  // Peaked awning over door
  ctx.fillStyle='#18120a';
  ctx.beginPath();
  ctx.moveTo(bx-ddw/2-bs*0.06, by-ddh);
  ctx.lineTo(bx, by-ddh-bs*0.16);
  ctx.lineTo(bx+ddw/2+bs*0.06, by-ddh);
  ctx.closePath(); ctx.fill();
  // Hanging book sign
  ctx.strokeStyle='#2a1808'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(bx+bw*0.30, by-bh*0.45); ctx.lineTo(bx+bw*0.30, by-bh*0.30); ctx.stroke();
  ctx.fillStyle='#161008';
  ctx.fillRect(Math.round(bx+bw*0.22), Math.round(by-bh*0.30-bs*0.12), Math.round(bs*0.16*1.2), Math.round(bs*0.12));
  ctx.strokeStyle='#3a2010'; ctx.lineWidth=0.6;
  ctx.strokeRect(Math.round(bx+bw*0.22), Math.round(by-bh*0.30-bs*0.12), Math.round(bs*0.16*1.2), Math.round(bs*0.12));
  if (hov) { ctx.strokeStyle='#c8a060'; ctx.lineWidth=1.5; ctx.strokeRect(Math.round(bx-bw/2),Math.round(by-bh),Math.round(bw),Math.round(bh)); }
}

// ── Talent Tree — magical glowing tree ────────────────────────────────────
function _drawBuildingTalentTree(ctx, bx, by, bs, hov, t) {
  const trW = Math.max(4, bs*0.28), trH = bs*0.65;
  const canopyY = by - trH - bs*0.42;
  const canopyR = bs*0.88;

  // Root spread
  ctx.fillStyle = '#1a0e06';
  ctx.beginPath(); ctx.ellipse(Math.round(bx), Math.round(by), Math.round(trW*1.9), Math.round(trW*0.38), 0, 0, Math.PI*2); ctx.fill();
  // Trunk
  ctx.fillStyle = '#1e1008';
  ctx.fillRect(Math.round(bx-trW/2), Math.round(by-trH), Math.round(trW), Math.round(trH));
  // Trunk grain
  ctx.strokeStyle='#160c06'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(bx-trW*0.18, by-trH); ctx.lineTo(bx-trW*0.18, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx+trW*0.12, by-trH*0.65); ctx.lineTo(bx+trW*0.12, by); ctx.stroke();
  // Branch left
  ctx.strokeStyle='#201008'; ctx.lineWidth=Math.max(1.5,trW*0.5);
  ctx.beginPath(); ctx.moveTo(bx-trW*0.2, by-trH*0.55); ctx.lineTo(bx-bs*0.45, by-trH*0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx+trW*0.2, by-trH*0.60); ctx.lineTo(bx+bs*0.42, by-trH*0.80); ctx.stroke();

  // Canopy — layered lobes
  ctx.fillStyle='#050f04';
  ctx.beginPath(); ctx.arc(Math.round(bx-bs*0.20), Math.round(canopyY+bs*0.18), Math.round(canopyR*0.72), 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(Math.round(bx+bs*0.24), Math.round(canopyY+bs*0.22), Math.round(canopyR*0.68), 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(canopyY-bs*0.06), Math.round(canopyR*0.82), 0, Math.PI*2); ctx.fill();
  // Inner lighter canopy
  ctx.fillStyle='#071508';
  ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(canopyY), Math.round(canopyR*0.58), 0, Math.PI*2); ctx.fill();

  // Magical glowing orbs in branches
  const orbPos = [
    [bx-bs*0.32, canopyY-bs*0.08], [bx+bs*0.36, canopyY+bs*0.04],
    [bx-bs*0.10, canopyY-bs*0.48], [bx+bs*0.14, canopyY-bs*0.36],
    [bx-bs*0.44, canopyY+bs*0.15], [bx+bs*0.46, canopyY+bs*0.18],
  ];
  orbPos.forEach(([ox,oy],i) => {
    const pulse = 0.55 + 0.45*Math.sin(t*0.038+i*1.13);
    const orbR = Math.max(2, bs*0.065);
    const og = ctx.createRadialGradient(ox,oy,0,ox,oy,orbR*2.8);
    og.addColorStop(0,`rgba(170,220,25,${pulse*0.55})`);
    og.addColorStop(1,'transparent');
    ctx.fillStyle=og; ctx.beginPath(); ctx.arc(ox,oy,orbR*2.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(195,240,45,${pulse*0.95})`;
    ctx.beginPath(); ctx.arc(Math.round(ox),Math.round(oy),Math.round(orbR),0,Math.PI*2); ctx.fill();
  });
  if (hov) {
    const hg = ctx.createRadialGradient(bx,canopyY,0,bx,canopyY,canopyR*1.7);
    hg.addColorStop(0,'rgba(140,215,28,0.13)'); hg.addColorStop(1,'transparent');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(bx,canopyY,canopyR*1.7,0,Math.PI*2); ctx.fill();
  }
}

// ── Wizard Guild — classical library / academy ────────────────────────────
function _drawBuildingGuild(ctx, bx, by, bs, hov, t) {
  const bw = bs*2.15, bh = bs*1.75;
  const bx2 = Math.round(bx-bw/2), by2 = Math.round(by-bh);
  // Main body
  ctx.fillStyle = hov ? '#1c1820' : '#161418';
  ctx.fillRect(bx2, by2, Math.round(bw), Math.round(bh));
  _drawStoneBlocks(ctx, bx2, by2, bw, bh, Math.max(4, bs*0.19), 3);
  // Stepped pediment top
  ctx.fillStyle='#121014';
  ctx.beginPath();
  ctx.moveTo(bx2-bs*0.06, by2);
  ctx.lineTo(bx, by2-bs*0.56);
  ctx.lineTo(bx2+bw+bs*0.06, by2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#222030'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(bx2-bs*0.06,by2); ctx.lineTo(bx,by2-bs*0.56); ctx.lineTo(bx2+bw+bs*0.06,by2); ctx.stroke();
  // Columns (left and right of doorway)
  [bx-bw*0.28, bx+bw*0.28].forEach(cx2 => {
    ctx.fillStyle='#1a1822';
    ctx.fillRect(Math.round(cx2-bs*0.09), Math.round(by2), Math.round(bs*0.17), Math.round(bh));
    // Capital top and base
    ctx.fillStyle='#22202c';
    ctx.fillRect(Math.round(cx2-bs*0.13), Math.round(by2), Math.round(bs*0.24), Math.round(bs*0.10));
    ctx.fillRect(Math.round(cx2-bs*0.13), Math.round(by-bs*0.06), Math.round(bs*0.24), Math.round(bs*0.08));
  });
  // Arched doorway
  const dw2=bw*0.38, dh2=bh*0.52;
  ctx.fillStyle='#0a0810';
  ctx.fillRect(Math.round(bx-dw2/2), Math.round(by-dh2), Math.round(dw2), Math.round(dh2));
  ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(by-dh2), Math.round(dw2/2), Math.PI, 0); ctx.fill();
  ctx.strokeStyle='#2e2040'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(bx-dw2/2,by-dh2); ctx.lineTo(bx-dw2/2,by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx+dw2/2,by-dh2); ctx.lineTo(bx+dw2/2,by); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx, by-dh2, dw2/2, Math.PI, 0); ctx.stroke();
  // Upper windows (arched, warm glow)
  const winP = 0.07 + 0.04*Math.sin(t*0.03);
  [-bw*0.30, bw*0.30].forEach(ox => {
    const wwx=Math.round(bx+ox-bs*0.11), wwy=Math.round(by2+bh*0.18);
    const wwW=Math.round(bs*0.20), wwH=Math.round(bs*0.32);
    ctx.fillStyle=`rgba(150,90,35,${winP*2.5})`;
    ctx.fillRect(wwx-2, wwy-2, wwW+4, wwH+4);
    ctx.fillStyle='#0c0a10';
    ctx.fillRect(wwx, wwy, wwW, wwH);
    ctx.fillStyle=`rgba(130,80,28,${winP*3.5})`;
    ctx.fillRect(wwx, wwy, wwW, wwH);
    // Arched top
    ctx.fillStyle='#0c0a10';
    ctx.beginPath(); ctx.arc(wwx+wwW/2, wwy, wwW/2, Math.PI, 0); ctx.fill();
    ctx.fillStyle=`rgba(130,80,28,${winP*3.5})`;
    ctx.beginPath(); ctx.arc(wwx+wwW/2, wwy, wwW/2, Math.PI, 0); ctx.fill();
    ctx.strokeStyle='#281838'; ctx.lineWidth=0.8;
    ctx.strokeRect(wwx, wwy, wwW, wwH);
  });
  // Magic orb floating at pediment peak
  const orbP=0.40+0.30*Math.sin(t*0.038);
  const og=ctx.createRadialGradient(bx,by2-bs*0.56,0,bx,by2-bs*0.56,bs*0.24);
  og.addColorStop(0,`rgba(130,75,200,${orbP*0.65})`); og.addColorStop(1,'transparent');
  ctx.fillStyle=og; ctx.beginPath(); ctx.arc(Math.round(bx),Math.round(by2-bs*0.56),bs*0.24,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=`rgba(175,115,240,${orbP*0.95})`;
  ctx.beginPath(); ctx.arc(Math.round(bx),Math.round(by2-bs*0.56),Math.max(2,bs*0.06),0,Math.PI*2); ctx.fill();
  if (hov) { ctx.strokeStyle='#c8a060'; ctx.lineWidth=1.5; ctx.strokeRect(bx2,by2,Math.round(bw),Math.round(bh)); }
}

// ── Tailor — cozy shop with awning and display window ─────────────────────
function _drawBuildingTailor(ctx, bx, by, bs, hov, t) {
  const bw = bs*1.65, bh = bs*1.35;
  // Wall
  ctx.fillStyle = hov ? '#1e1508' : '#181008';
  ctx.fillRect(Math.round(bx-bw/2), Math.round(by-bh), Math.round(bw), Math.round(bh));
  ctx.strokeStyle='#120e06'; ctx.lineWidth=0.8;
  const plH=Math.max(4,bs*0.22);
  for (let i=0;i<Math.ceil(bh/plH);i++) { const ly=by-bh+i*plH; ctx.beginPath(); ctx.moveTo(bx-bw/2,ly); ctx.lineTo(bx+bw/2,ly); ctx.stroke(); }
  // Gabled roof
  ctx.fillStyle='#0e0c08';
  ctx.beginPath(); ctx.moveTo(bx-bw/2-bs*0.08,by-bh); ctx.lineTo(bx,by-bh-bs*0.48); ctx.lineTo(bx+bw/2+bs*0.08,by-bh); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#201a10'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(bx-bw/2,by-bh); ctx.lineTo(bx+bw/2,by-bh); ctx.stroke();
  // Display window (right side, large with robe form)
  const wwx=Math.round(bx+bw*0.04), wwy=Math.round(by-bh*0.74);
  const wwW=Math.round(bw*0.42), wwH=Math.round(bh*0.40);
  const wGl=ctx.createRadialGradient(wwx+wwW/2,wwy+wwH/2,0,wwx+wwW/2,wwy+wwH/2,wwW*0.8);
  wGl.addColorStop(0,'rgba(170,95,28,0.28)'); wGl.addColorStop(1,'transparent');
  ctx.fillStyle=wGl; ctx.fillRect(wwx-wwW,wwy-wwH,wwW*3,wwH*3);
  ctx.fillStyle='#100e08'; ctx.fillRect(wwx,wwy,wwW,wwH);
  ctx.fillStyle='rgba(150,85,22,0.18)'; ctx.fillRect(wwx,wwy,wwW,wwH);
  // Robed dress-form silhouette
  ctx.fillStyle='#0a0408';
  ctx.beginPath(); ctx.arc(Math.round(wwx+wwW*0.50),Math.round(wwy+wwH*0.22),Math.round(wwW*0.10),0,Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(wwx+wwW*0.38, wwy+wwH*0.30);
  ctx.bezierCurveTo(wwx+wwW*0.28,wwy+wwH*0.55, wwx+wwW*0.22,wwy+wwH*0.80, wwx+wwW*0.26,wwy+wwH*0.96);
  ctx.lineTo(wwx+wwW*0.74, wwy+wwH*0.96);
  ctx.bezierCurveTo(wwx+wwW*0.78,wwy+wwH*0.80, wwx+wwW*0.72,wwy+wwH*0.55, wwx+wwW*0.62,wwy+wwH*0.30);
  ctx.closePath(); ctx.fill();
  // Window frame
  ctx.strokeStyle='#1e1408'; ctx.lineWidth=1;
  ctx.strokeRect(wwx,wwy,wwW,wwH);
  ctx.beginPath(); ctx.moveTo(wwx+wwW/2,wwy); ctx.lineTo(wwx+wwW/2,wwy+wwH); ctx.stroke();
  // Door (left side)
  const ddx=Math.round(bx-bw*0.25), ddW=Math.round(bw*0.30), ddH=Math.round(bh*0.36);
  ctx.fillStyle='#1c0e06';
  ctx.fillRect(Math.round(ddx-ddW/2), Math.round(by-ddH), ddW, ddH);
  ctx.strokeStyle='#2a1808'; ctx.lineWidth=0.8;
  ctx.strokeRect(Math.round(ddx-ddW/2), Math.round(by-ddH), ddW, ddH);
  // Striped awning over door
  const awX=ddx-ddW/2-bs*0.06, awW2=ddW+bs*0.12, awY=by-ddH-bs*0.02, awH2=Math.max(6,bs*0.15);
  ctx.fillStyle='#200a0a';
  ctx.beginPath(); ctx.moveTo(awX,awY); ctx.lineTo(awX+awW2,awY); ctx.lineTo(awX+awW2+bs*0.06,awY+awH2); ctx.lineTo(awX-bs*0.06,awY+awH2); ctx.closePath(); ctx.fill();
  // Awning stripes
  const numS=4, sw2=awW2/(numS*2);
  for (let i=0;i<numS;i++) {
    ctx.fillStyle='#2e1010';
    const sx2=awX+i*sw2*2;
    ctx.beginPath(); ctx.moveTo(sx2,awY); ctx.lineTo(sx2+sw2,awY); ctx.lineTo(sx2+sw2+bs*0.04,awY+awH2); ctx.lineTo(sx2+bs*0.04,awY+awH2); ctx.closePath(); ctx.fill();
  }
  // Scalloped awning edge
  const numSc=Math.max(3,Math.floor(awW2/bs*0.16)+1);
  for (let i=0;i<numSc;i++) {
    ctx.fillStyle='#200a0a';
    ctx.beginPath(); ctx.arc(Math.round(awX-bs*0.06+i*(awW2+bs*0.12)/(numSc-1)), Math.round(awY+awH2), Math.round(Math.max(3,bs*0.08)), 0, Math.PI); ctx.fill();
  }
  // Hanging scissors sign
  ctx.strokeStyle='#281808'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(bx+bw*0.30,by-bh*0.58); ctx.lineTo(bx+bw*0.30,by-bh*0.42); ctx.stroke();
  ctx.fillStyle='#1a1008'; ctx.strokeStyle='#362210'; ctx.lineWidth=0.7;
  const sgx=Math.round(bx+bw*0.22), sgy=Math.round(by-bh*0.42-bs*0.13), sgW=Math.round(bs*0.19), sgH=Math.round(bs*0.13);
  ctx.fillRect(sgx,sgy,sgW,sgH); ctx.strokeRect(sgx,sgy,sgW,sgH);
  if (hov) { ctx.strokeStyle='#c8a060'; ctx.lineWidth=1.5; ctx.strokeRect(Math.round(bx-bw/2),Math.round(by-bh),Math.round(bw),Math.round(bh)); }
}

// ── The Veil — misty archway with purple glow ─────────────────────────────
function _drawBuildingVeil(ctx, bx, by, bs, hov, t) {
  const aw = bs * 1.4, ah = bs * 1.5;
  const ax = bx - aw / 2, ay = by - ah;
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.04);
  const mistCfg = (typeof getMistConfig === 'function') ? getMistConfig() : { active: false };
  const active = mistCfg.active;

  // Archway glow backdrop
  const glow = ctx.createRadialGradient(bx, by - ah * 0.5, 0, bx, by - ah * 0.5, aw * 0.8);
  glow.addColorStop(0, `rgba(${active?'120,40,220':'60,20,110'},${0.22 + pulse * 0.12})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(ax - aw * 0.3, ay - ah * 0.1, aw * 1.6, ah * 1.2);

  // Stone pillars
  ctx.fillStyle = '#1a1020'; ctx.strokeStyle = '#2d1a40'; ctx.lineWidth = 1;
  const pilW = aw * 0.18, pilH = ah * 0.85;
  ctx.fillRect(ax, by - pilH, pilW, pilH); ctx.strokeRect(ax, by - pilH, pilW, pilH);
  ctx.fillRect(ax + aw - pilW, by - pilH, pilW, pilH); ctx.strokeRect(ax + aw - pilW, by - pilH, pilW, pilH);

  // Arch top
  ctx.beginPath();
  ctx.arc(bx, by - pilH + aw * 0.01, aw * 0.5 - pilW * 0.5, Math.PI, 0);
  ctx.fillStyle = '#1a1020'; ctx.fill();
  ctx.strokeStyle = '#3a2060'; ctx.lineWidth = 1.2; ctx.stroke();

  // Arch interior — misty void
  const innerR = aw * 0.36;
  const innerGrad = ctx.createRadialGradient(bx, by - pilH + 2, 0, bx, by - pilH, innerR);
  innerGrad.addColorStop(0, `rgba(${active?'90,20,180':'40,10,80'},${0.7 + pulse * 0.2})`);
  innerGrad.addColorStop(0.6, `rgba(${active?'50,10,120':'20,5,50'},0.8)`);
  innerGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.beginPath();
  ctx.arc(bx, by - pilH + aw * 0.01, innerR, Math.PI, 0);
  ctx.fillStyle = innerGrad; ctx.fill();

  // Mist wisps inside arch
  for (let i = 0; i < 3; i++) {
    const wx = bx + Math.sin(t * 0.03 + i * 2.1) * aw * 0.18;
    const wy = by - pilH * 0.3 - i * ah * 0.13 + Math.cos(t * 0.025 + i) * ah * 0.06;
    const wr = bs * (0.10 + 0.05 * Math.sin(t * 0.05 + i));
    const mg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
    mg.addColorStop(0, `rgba(${active?'160,80,255':'100,40,180'},${0.25 + pulse * 0.15})`);
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.fillRect(wx - wr, wy - wr, wr*2, wr*2);
  }

  // Keystone gem at arch top
  const gemY = by - pilH - aw * 0.12;
  ctx.beginPath(); ctx.arc(bx, gemY, bs * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = active ? `rgba(180,80,255,${0.7+pulse*0.3})` : `rgba(80,30,120,0.6)`;
  ctx.fill();
  ctx.strokeStyle = active ? '#e0a0ff' : '#6030a0'; ctx.lineWidth = 0.8; ctx.stroke();

  // Active mist indicator dot
  if (active) {
    const mist = (typeof getTotalMist === 'function') ? getTotalMist() : 0;
    ctx.fillStyle = `rgba(200,120,255,${0.6+pulse*0.4})`;
    ctx.font = `bold ${Math.round(bs*0.22)}px Cinzel,serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`🌫${mist}`, bx, by - ah - bs * 0.12);
    ctx.textAlign = 'left';
  }

  // Hover outline
  if (hov) {
    ctx.strokeStyle = active ? '#c080ff' : '#6030a0'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ax - 2, ay - 2, aw + 4, ah + 4);
  }
}

function _drawLobbyPlayer(ctx, W, H) {
  // Hide wizard entirely during teeth and fade phases
  if (_lobbyCinematic === 'castle_teeth' || _lobbyCinematic === 'castle_fade') return;

  const x = Math.round(_lobbyPlayerX * W);
  const y = Math.round(_lobbyPlayerY * H);
  let scale = Math.max(1, Math.min(2, Math.floor(W / 400)));

  // During castle_enter: shrink and fade as wizard walks into the gate
  let wizAlpha = 1;
  if (_lobbyCinematic === 'castle_enter') {
    const enterProgress = Math.max(0, Math.min(1, (0.60 - _lobbyPlayerY) / 0.12));
    scale = Math.max(0.2, scale * (1 - enterProgress * 0.75));
    wizAlpha = Math.max(0, 1 - enterProgress * 0.95);
  }
  if (wizAlpha <= 0.02) return;

  // Bob when walking
  const bobY = _lobbyWalking ? Math.round(Math.sin(_lobbyTick * 0.25) * 2) : 0;

  // Get player sprite rows based on wizard archetype
  const _archId = (typeof _wizBuild !== 'undefined' && _wizBuild) ? _wizBuild.archetype : 'arcanist';
  const rows = (typeof getPlayerCharSprite === 'function') ? getPlayerCharSprite(_archId) : SPRITE_CHAR_MAGE;
  const sprW = 24 * scale;
  const sprH = rows.length * scale;
  const sx = x - sprW / 2;
  const sy = y - sprH + bobY;

  // Horizontal flip for facing left
  ctx.save();
  ctx.globalAlpha = wizAlpha;
  if (_lobbyFacingLeft) {
    ctx.translate(x * 2, 0);
    ctx.scale(-1, 1);
  }

  // Draw sprite with full custom color map matching wizard build
  const colorMap = _lobbyBuildColorMap();
  if (colorMap) {
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < 24; col++) {
        const c = (rows[row] || '')[col] || '.';
        const color = colorMap[c];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(sx + col * scale), Math.floor(sy + row * scale), scale, scale);
      }
    }
  } else {
    const pal = _lobbyGetPlayerPal();
    drawSprite(ctx, rows, sx, sy, scale, pal, 24);
  }

  // Name label
  ctx.restore();
  ctx.save();
  ctx.font = `bold ${Math.round(W * 0.018)}px 'Cinzel', serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8a060';
  ctx.globalAlpha = 0.85;
  ctx.fillText(playerName || 'Wizard', x, sy - 4);
  ctx.restore();
}

function _lobbyGetPlayerPal() {
  const b = (typeof _wizBuild !== 'undefined') ? _wizBuild : null;
  if (!b) return ['#aa6622','#cc8833','#eebb55','#ffdd88'];
  const outfit = (typeof WIZ_OUTFIT_COLORS !== 'undefined' ? WIZ_OUTFIT_COLORS : []).find(o => o.id === b.outfit);
  if (outfit) return [outfit.p0, outfit.p1, outfit.p2, outfit.p3];
  return ['#aa6622','#cc8833','#eebb55','#ffdd88'];
}

function _lobbyBuildColorMap() {
  const b = (typeof _wizBuild !== 'undefined') ? _wizBuild : null;
  if (!b) return null;
  const hatClr   = (typeof WIZ_HAT_COLORS   !== 'undefined' ? WIZ_HAT_COLORS   : []).find(c => c.id === b.hatColor);
  const outClr   = (typeof WIZ_OUTFIT_COLORS !== 'undefined' ? WIZ_OUTFIT_COLORS : []).find(c => c.id === b.outfit);
  const beardClr = (typeof WIZ_BEARD_COLORS  !== 'undefined' ? WIZ_BEARD_COLORS  : []).find(c => c.id === b.beardColor);
  const staffClr = (typeof WIZ_STAFF_COLORS  !== 'undefined' ? WIZ_STAFF_COLORS  : []).find(c => c.id === b.staffColor);
  const glowClr  = (typeof WIZ_STAFF_GLOWS   !== 'undefined' ? WIZ_STAFF_GLOWS   : []).find(g => g.id === b.staffGlow);
  const eyeClr   = (typeof WIZ_EYE_COLORS    !== 'undefined' ? WIZ_EYE_COLORS    : []).find(e => e.id === b.eyeColor);
  const showBeard = b.beardStyle !== 'none';
  return {
    '.': null,
    '1': outClr   ? outClr.p0    : '#aa6622',
    '2': outClr   ? outClr.p1    : '#cc8833',
    '3': outClr   ? outClr.p2    : '#eebb55',
    '4': outClr   ? outClr.p3    : '#ffdd88',
    'h': hatClr   ? hatClr.color : '#2244aa',
    's': (typeof SKIN_C !== 'undefined') ? SKIN_C : '#e8b888',
    'e': eyeClr   ? eyeClr.color : '#ff2222',
    'b': (typeof BOOT_C !== 'undefined') ? BOOT_C : '#3a2010',
    'w': (showBeard && beardClr) ? beardClr.color : null,
    'f': staffClr ? staffClr.color : '#8b5a2b',
    'g': glowClr  ? glowClr.color  : null,
  };
}

let _lobbyHoveredId = null;

function _lobbyHover(e) {
  const canvas = document.getElementById('lobby-map-canvas');
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (canvas.width / r.width);
  const my = (e.clientY - r.top)  * (canvas.height / r.height);
  const W = canvas.width, H = canvas.height;
  let hit = null;
  LOBBY_LOCATIONS.forEach(loc => {
    const lx = loc.x * W, ly = loc.y * H;
    const dist = Math.sqrt((mx - lx) ** 2 + (my - ly) ** 2);
    const radius = loc.id === 'castle' ? W * 0.14 : Math.max(28, W * 0.065);
    if (dist < radius) hit = loc.id;
  });
  // Refresh-bg button hit
  const W2 = canvas.width, H2 = canvas.height;
  const rbw = Math.max(60, W2 * 0.09), rbh = Math.max(18, H2 * 0.032);
  const rbx = W2 - rbw - 6, rby = 6;
  if (mx >= rbx && mx <= rbx + rbw && my >= rby && my <= rby + rbh) hit = '__refreshBg__';

  _lobbyHoveredId = hit;
  canvas.style.cursor = hit ? 'pointer' : 'default';
}

// Node graph for path-following. All coords normalized (0–1).
const _PNODES = {
  plaza:     [0.500, 0.970],
  ring_bot:  [0.500, 0.907],
  ring_bl:   [0.424, 0.874],
  ring_br:   [0.576, 0.874],
  ring_tl:   [0.429, 0.857],
  ring_tr:   [0.571, 0.857],
  ring_top:  [0.500, 0.833],
  left_mid:  [0.323, 0.828],
  junc_l:    [0.236, 0.795],
  arc_mid:   [0.142, 0.737],
  guild_mid: [0.213, 0.808],
  right_mid: [0.677, 0.828],
  junc_r:    [0.764, 0.795],
  vlt_mid:   [0.858, 0.737],
  tlr_mid:   [0.787, 0.808],
  lib_mid:   [0.274, 0.926],
  tal_mid:   [0.709, 0.926],
  bridge:    [0.500, 0.760],
  archive:   [0.090, 0.670],
  guild:     [0.170, 0.820],
  vault:     [0.910, 0.670],
  tailor:    [0.830, 0.820],
  library:   [0.230, 0.910],
  talents:   [0.740, 0.910],
  veil_mid:  [0.430, 0.792],
  veil:      [0.355, 0.748],
};

const _PEDGES = {
  plaza:     ['ring_bot'],
  ring_bot:  ['plaza', 'ring_bl', 'ring_br'],
  ring_bl:   ['ring_bot', 'ring_tl', 'lib_mid'],
  ring_br:   ['ring_bot', 'ring_tr', 'tal_mid'],
  ring_tl:   ['ring_bl', 'ring_top', 'left_mid'],
  ring_tr:   ['ring_br', 'ring_top', 'right_mid'],
  ring_top:  ['ring_tl', 'ring_tr', 'bridge', 'veil_mid'],
  left_mid:  ['ring_tl', 'junc_l'],
  junc_l:    ['left_mid', 'arc_mid', 'guild_mid'],
  arc_mid:   ['junc_l', 'archive'],
  guild_mid: ['junc_l', 'guild'],
  right_mid: ['ring_tr', 'junc_r'],
  junc_r:    ['right_mid', 'vlt_mid', 'tlr_mid'],
  vlt_mid:   ['junc_r', 'vault'],
  tlr_mid:   ['junc_r', 'tailor'],
  lib_mid:   ['ring_bl', 'library'],
  tal_mid:   ['ring_br', 'talents'],
  bridge:    ['ring_top'],
  archive:   ['arc_mid'],
  guild:     ['guild_mid'],
  vault:     ['vlt_mid'],
  tailor:    ['tlr_mid'],
  library:   ['lib_mid'],
  talents:   ['tal_mid'],
  veil_mid:  ['ring_top', 'veil'],
  veil:      ['veil_mid'],
};

function _nearestPathNode(x, y) {
  let best = 'plaza', bestDist = Infinity;
  for (const [id, [nx, ny]] of Object.entries(_PNODES)) {
    const d = (x - nx) ** 2 + (y - ny) ** 2;
    if (d < bestDist) { bestDist = d; best = id; }
  }
  return best;
}

function _bfsLobbyPath(from, to) {
  if (from === to) return [from];
  const visited = new Set([from]);
  const queue = [[from, [from]]];
  while (queue.length > 0) {
    const [node, path] = queue.shift();
    for (const nb of (_PEDGES[node] || [])) {
      if (!visited.has(nb)) {
        visited.add(nb);
        const p = [...path, nb];
        if (nb === to) return p;
        queue.push([nb, p]);
      }
    }
  }
  return [from, to];
}

function _buildLobbyRoute(destId, destX, destY) {
  const destNode = destId === 'castle' ? 'bridge' : destId;
  const startNode = _nearestPathNode(_lobbyPlayerX, _lobbyPlayerY);
  const nodePath = _bfsLobbyPath(startNode, destNode);
  return nodePath.slice(1).map((id, i, arr) => {
    const [nx, ny] = _PNODES[id];
    return i === arr.length - 1 ? { x: nx, y: ny, finalDest: destId } : { x: nx, y: ny };
  });
}

function _lobbyClick(e) {
  const canvas = document.getElementById('lobby-map-canvas');
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (canvas.width / r.width);
  const my = (e.clientY - r.top)  * (canvas.height / r.height);
  const W = canvas.width, H = canvas.height;

  // Refresh-bg button
  const rbw = Math.max(60, W * 0.09), rbh = Math.max(18, H * 0.032);
  const rbx = W - rbw - 6, rby = 6;
  if (mx >= rbx && mx <= rbx + rbw && my >= rby && my <= rby + rbh) {
    _initLobbyBgZones(); return;
  }

  let hit = null;
  LOBBY_LOCATIONS.forEach(loc => {
    const lx = loc.x * W, ly = loc.y * H;
    const dist = Math.sqrt((mx - lx) ** 2 + (my - ly) ** 2);
    const radius = loc.id === 'castle' ? W * 0.14 : Math.max(28, W * 0.065);
    if (dist < radius) hit = loc;
  });
  if (!hit) return;

  const destX = hit.x, destY = hit.id === 'castle' ? 0.68 : hit.y;
  const route = _buildLobbyRoute(hit.id, destX, destY);
  const first = route.shift();
  _lobbyTargetX = first.x; _lobbyTargetY = first.y;
  _lobbyWaypointQueue = route;
  _lobbyWalking = true;
  _lobbyWalkDest = first.finalDest || null;
  _lobbyWaypoint = null;
}

function _openLobbyLocation(id) {
  if (id === 'castle') {
    // Start castle-enter cinematic — wizard walks slowly into the gate, then it snaps shut
    _lobbyCinematic = 'castle_enter';
    _lobbyCinematicTick = 0;
    _lobbyTargetX = 0.50;
    _lobbyTargetY = 0.56; // deep inside the gate arch
    _lobbyWalking = true;
    _lobbyWalkDest = null; // cinematic handles transition, not _openLobbyLocation
    const canvas = document.getElementById('lobby-map-canvas');
    if (canvas) canvas.onclick = null; // disable clicks during cinematic
    return;
  }
  if (id === 'tailor') {
    const tailorLoc = LOBBY_LOCATIONS.find(l => l.id === 'tailor');
    if (tailorLoc) _lobbyReturnPos = { x: tailorLoc.x, y: tailorLoc.y };
    stopLobbyMap(); _wizBuilderFromLobby = true; showCharacterScreen(); return;
  }
  const panel = document.getElementById('lobby-panel');
  const content = document.getElementById('lobby-panel-content');
  if (!panel || !content) return;

  const meta = getMeta();
  const loc = LOBBY_LOCATIONS.find(l => l.id === id);
  const title = loc ? loc.label : '';
  const phosLabel = `<div class="lobby-phos-bar">✦ ${meta.phos || 0} Phos available</div>`;

  if (id === 'archive') {
    const history = meta.runHistory || [];
    let html = `<div class="lobby-panel-title">${title}</div>`;
    if (!history.length) {
      html += '<div class="brun-empty">No runs recorded yet.</div>';
    } else {
      html += history.map(r => `
        <div class="brun-hist-row">
          <div class="brun-hist-el">${r.emoji||'⚔'} ${r.element||'?'} <span style="color:#4a6a8a;font-size:.6rem;margin-left:.3rem;">${r.zone && r.zone !== r.element ? '→ '+r.zone+' Zone' : ''}</span></div>
          <div class="brun-hist-stats">
            <span>${r.battles||0} battles</span>
            <span style="color:#c8a830">${r.gold||0}g</span>
            <span style="color:#a080ff">${r.phos||0}✦</span>
          </div>
          <div style="display:flex;gap:.8rem;font-size:.6rem;color:#555;margin-top:.2rem;">
            <span>⚔ ${r.dmgDealt||0} dealt</span><span>🛡 ${r.dmgTaken||0} taken</span>
          </div>
          <div class="brun-hist-date">${r.date||''}</div>
        </div>`).join('');
    }
    content.innerHTML = html;
    panel.style.display = 'block';
  } else if (id === 'vault') {
    markArtifactsSeen();
    let html = `<div class="lobby-panel-title">${title}</div>`;
    if (!meta.artifacts || !meta.artifacts.length) {
      html += '<div class="brun-empty">No artifacts yet — defeat a Gym Leader to have a chance at one!</div>';
    } else {
      const activeId = meta.activeArtifactId || null;
      html += '<div style="font-size:.6rem;color:#4a3820;text-align:center;margin-bottom:.6rem;">Equip one artifact per run. It earns stars after 25 battles of use.</div>';
      html += meta.artifacts.map(a => {
        const def = ARTIFACT_CATALOGUE[a.id];
        if (!def) return '';
        const isActive = a.id === activeId;
        const stars = a.star > 0 ? '★'.repeat(a.star) : '—';
        const sColor = ['#888','#c8a030','#e8d060','#00ccff'][Math.min(a.star||0,3)];
        const prog = a.star < 3 ? `${a.roomsUsed||0}/25 rooms` : 'MAX';
        const btn = isActive
          ? `<button onclick="unequipArtifact();_openLobbyLocation('vault')" style="background:#1a1205;border:1px solid #5a4020;color:#7a5020;font-family:'Cinzel',serif;font-size:.55rem;padding:.2rem .5rem;border-radius:3px;cursor:pointer;white-space:nowrap;">Unequip</button>`
          : `<button onclick="equipArtifact('${a.id}');_openLobbyLocation('vault')" style="background:#1a1205;border:1px solid #8a6020;color:#c8a060;font-family:'Cinzel',serif;font-size:.55rem;padding:.2rem .5rem;border-radius:3px;cursor:pointer;white-space:nowrap;">Equip</button>`;
        return `<div class="brun-art-row" style="border-color:${isActive?'#8a6020':'#1a1a14'};background:${isActive?'#1a1205':'#0f0d0b'};display:flex;align-items:center;gap:.5rem;">
          <div style="flex:1;">
            <div class="brun-art-name">${def.emoji} ${def.name} <span class="brun-art-star" style="color:${sColor}">${stars}</span>${isActive?'<span style="color:#c8a060;font-size:.55rem;margin-left:.4rem;"> ✦ ACTIVE</span>':''}</div>
            <div class="brun-art-desc">${def.desc[a.star||0]} · <span style="color:#4a4a4a">${prog}</span></div>
          </div>
          ${btn}
        </div>`;
      }).join('');
    }
    content.innerHTML = html;
    panel.style.display = 'block';
  } else if (id === 'library') {
    markBooksSeen();
    content.innerHTML = `<div class="lobby-panel-title">${title}</div>`;
    renderBookUpgradesTab(content, meta);
    panel.style.display = 'block';
  } else if (id === 'talents') {
    content.innerHTML = `<div class="lobby-panel-title">${title}</div>${phosLabel}`;
    renderTalentTab(content, meta);
    panel.style.display = 'block';
  } else if (id === 'guild') {
    content.innerHTML = `<div class="lobby-panel-title">${title}</div>`;
    _renderWizardUnlockTab(content, meta);
    panel.style.display = 'block';
  } else if (id === 'veil') {
    _renderVeilContent(content);
    panel.style.display = 'block';
  }
}

function closeLobbyPanel() {
  const panel = document.getElementById('lobby-panel');
  if (panel) panel.style.display = 'none';
  // Resume map loop
  if (!_lobbyAnimFrame) _lobbyLoop();
}

function stopLobbyMap() {
  if (_lobbyAnimFrame) { cancelAnimationFrame(_lobbyAnimFrame); _lobbyAnimFrame = null; }
  const canvas = document.getElementById('lobby-map-canvas');
  if (canvas) { canvas.onclick = null; canvas.onmousemove = null; }
}
