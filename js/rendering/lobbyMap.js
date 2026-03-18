// ===== lobbyMap.js =====
// ─── LOBBY MAP — between-runs interactive world ───────────────────────────────

// Fountain center — visual only, paths radiate from here
const LOBBY_FOUNTAIN = { x: 0.50, y: 0.65 };
// Plaza — where the wizard stands when idle/routing through the square (just south of fountain)
const LOBBY_PLAZA = { x: 0.50, y: 0.74 };

const LOBBY_LOCATIONS = [
  { id:'castle',   label:'Begin Run',       icon:'🏰', desc:'Cross the drawbridge — start a new run',  x:0.50, y:0.18 },
  { id:'archive',  label:'History',         icon:'📜', desc:'Review past adventures',                   x:0.14, y:0.50 },
  { id:'vault',    label:'Artifacts',       icon:'🏺', desc:'Artifacts earned from Gym Leaders',        x:0.82, y:0.50 },
  { id:'library',  label:'Spellbooks',      icon:'📖', desc:'Manage your book upgrades',               x:0.30, y:0.84 },
  { id:'talents',  label:'Talent Tree',     icon:'🌟', desc:'Spend Phos on permanent upgrades',        x:0.60, y:0.82 },
  { id:'guild',    label:'Wizard Guild',    icon:'🧙', desc:'Unlock and choose your wizard',           x:0.14, y:0.72 },
  { id:'tailor',   label:'Customize Wizard',icon:'🪡', desc:'Change your wizard\'s look',              x:0.82, y:0.76 },
];

// Player walk state
let _lobbyPlayerX = 0.50;
let _lobbyPlayerY = 0.65;
let _lobbyTargetX = 0.50;
let _lobbyTargetY = 0.65;
let _lobbyWalking = false;
let _lobbyWalkDest = null; // location id to open after arriving
let _lobbyWaypoint = null; // if set, walk here after reaching current target
let _lobbyTick = 0;
let _lobbyAnimFrame = null;
let _lobbyShootingStars = []; // { x, y, vx, vy, life, maxLife, len }
let _lobbyFacingLeft = false;
let _lobbyReturnPos = null;   // if set, start here instead of plaza (used when returning from tailor)
let _lobbyCinematic = null;   // null | 'castle_enter' | 'castle_teeth' | 'castle_fade'
let _lobbyCinematicTick = 0;

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
  _lobbyWalking = false; _lobbyWalkDest = null; _lobbyShootingStars = [];
  _lobbyCinematic = null; _lobbyCinematicTick = 0;

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
  const speed = _lobbyCinematic === 'castle_enter' ? 1.6 : 3.1;
  if (dist < speed + 1) {
    _lobbyPlayerX = _lobbyTargetX;
    _lobbyPlayerY = _lobbyTargetY;
    _lobbyWalking = false;
    if (_lobbyWaypoint) {
      // First leg done (arrived at fountain center) — start second leg to final destination
      const destLoc = LOBBY_LOCATIONS.find(l => l.id === _lobbyWaypoint);
      if (destLoc) {
        _lobbyTargetX = destLoc.x;
        _lobbyTargetY = destLoc.id === 'castle' ? 0.48 : destLoc.y;
        _lobbyWalking = true;
        _lobbyWalkDest = _lobbyWaypoint;
        _lobbyWaypoint = null;
      }
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

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  sky.addColorStop(0, '#0a0610');
  sky.addColorStop(1, '#18102a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Ground
  const gnd = ctx.createLinearGradient(0, H * 0.42, 0, H);
  gnd.addColorStop(0, '#1a120a');
  gnd.addColorStop(1, '#0d0906');
  ctx.fillStyle = gnd;
  ctx.fillRect(0, H * 0.42, W, H);

  // Path/road connecting locations — all radiate from the fountain center
  ctx.save();
  ctx.strokeStyle = '#2a1e0e';
  ctx.lineWidth = Math.max(4, W * 0.018);
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const fcx = LOBBY_FOUNTAIN.x * W, fcy = LOBBY_FOUNTAIN.y * H;
  LOBBY_LOCATIONS.forEach(loc => {
    ctx.beginPath();
    ctx.moveTo(fcx, fcy);
    ctx.lineTo(loc.x * W, loc.id === 'castle' ? loc.y * H : loc.y * H);
    ctx.stroke();
  });
  ctx.restore();

  // Shooting stars
  _drawShootingStars(ctx, W, H);

  // Stars — varied sizes, flicker at different rates
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 137 + 17) % W);
    const sy = ((i * 97 + 31) % (H * 0.40));
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

  // Moon — detailed with craters and halo
  ctx.save();
  const mx = W * 0.80, my = H * 0.09, mr = W * 0.055;
  // Outer glow halo
  const moonHalo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2.2);
  moonHalo.addColorStop(0, 'rgba(220,200,140,0.18)');
  moonHalo.addColorStop(0.5, 'rgba(180,140,80,0.07)');
  moonHalo.addColorStop(1, 'transparent');
  ctx.fillStyle = moonHalo;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Moon body
  const moonGrad = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.2, mr * 0.1, mx, my, mr);
  moonGrad.addColorStop(0, '#f0e8c8');
  moonGrad.addColorStop(0.6, '#d4c090');
  moonGrad.addColorStop(1, '#a08050');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  // Shadow crescent to give it a 3D waning look
  ctx.fillStyle = 'rgba(10,6,20,0.55)';
  ctx.beginPath();
  ctx.arc(mx + mr * 0.25, my, mr * 0.88, 0, Math.PI * 2);
  ctx.fill();
  // Craters
  const craters = [[0.3, 0.2, 0.12], [-0.25, 0.35, 0.09], [0.05, -0.3, 0.07], [-0.1, 0.1, 0.05]];
  craters.forEach(([ox, oy, cr]) => {
    const crad = mr * cr;
    const cgrad = ctx.createRadialGradient(mx + ox*mr - crad*0.3, my + oy*mr - crad*0.3, 0, mx + ox*mr, my + oy*mr, crad);
    cgrad.addColorStop(0, 'rgba(80,60,30,0.5)');
    cgrad.addColorStop(1, 'rgba(120,100,60,0.15)');
    ctx.fillStyle = cgrad;
    ctx.beginPath();
    ctx.arc(mx + ox * mr, my + oy * mr, crad, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Draw castle
  _drawLobbycastle(ctx, W, H);

  // Draw fountain at town square center
  _drawLobbyFountain(ctx, W, H);

  // Draw location markers (skip castle — already drawn)
  LOBBY_LOCATIONS.forEach(loc => {
    if (loc.id === 'castle') return;
    _drawLobbyMarker(ctx, loc, W, H);
  });

  // Draw player
  _drawLobbyPlayer(ctx, W, H);

  ctx.restore(); // end shake transform

  // Fade to black overlay (no shake)
  if (_lobbyCinematic === 'castle_fade') {
    const fadeAlpha = Math.min(1, _lobbyCinematicTick / 60);
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function _drawLobbycastle(ctx, W, H) {
  const cx    = W * 0.50;
  const baseY = H * 0.40;          // horizon line where castle meets ground
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
    const cwX = cx + side * s * 0.44 - (side > 0 ? cwW : 0);
    const cwY = baseY - cwH;
    ctx.fillStyle = '#110c1c';
    ctx.strokeStyle = '#3a2460';
    ctx.lineWidth = 1;
    ctx.fillRect(cwX, cwY, cwW, cwH);
    ctx.strokeRect(cwX, cwY, cwW, cwH);
    // Curtain wall merlons
    const cmW = cwW / 5, cmH = s * 0.03;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#18102a';
      ctx.fillRect(cwX + i * (cwW / 4), cwY - cmH, cmW, cmH);
      ctx.strokeRect(cwX + i * (cwW / 4), cwY - cmH, cmW, cmH);
    }
  });

  // ── Main keep (central body) ──────────────────────────────────────────────
  const keepW = s * 0.52, keepH = s * 0.48;
  const keepX = cx - keepW / 2, keepY = baseY - keepH;
  const keepGrad = ctx.createLinearGradient(keepX, keepY, keepX + keepW, keepY + keepH);
  keepGrad.addColorStop(0, '#1c1228');
  keepGrad.addColorStop(1, '#0e0916');
  ctx.fillStyle = keepGrad;
  ctx.strokeStyle = '#5a3a8a';
  ctx.lineWidth = 1.5;
  ctx.fillRect(keepX, keepY, keepW, keepH);
  ctx.strokeRect(keepX, keepY, keepW, keepH);

  // Keep battlements
  const mW = keepW / 10, mH = s * 0.04;
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = '#22183a';
      ctx.strokeStyle = '#5a3a8a';
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

  // ── Side towers (tall, dramatic) ──────────────────────────────────────────
  const twW = s * 0.16, twH = s * 0.68;
  [-1, 1].forEach(side => {
    const tx = cx + side * (keepW * 0.5 + twW * 0.1) - (side > 0 ? twW : 0);
    const ty = baseY - twH;
    const tGrad = ctx.createLinearGradient(tx, ty, tx + twW, ty + twH);
    tGrad.addColorStop(0, '#18102a');
    tGrad.addColorStop(1, '#0a0814');
    ctx.fillStyle = tGrad;
    ctx.strokeStyle = '#7a4aaa';
    ctx.lineWidth = 1.5;
    ctx.fillRect(tx, ty, twW, twH);
    ctx.strokeRect(tx, ty, twW, twH);

    // Tower merlons
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = '#1e1430';
        ctx.fillRect(tx + i * (twW / 4), ty - mH, twW / 4 - 1, mH);
        ctx.strokeRect(tx + i * (twW / 4), ty - mH, twW / 4 - 1, mH);
      }
    }

    // Tower conical roof / spire
    ctx.fillStyle = '#2a1848';
    ctx.strokeStyle = '#9a60cc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + twW, ty);
    ctx.lineTo(tx + twW / 2, ty - s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spire tip glow — flickers
    const tipAlpha = 0.5 + 0.4 * (Math.sin(t * 0.014 + side * 1.5) * 0.6 + Math.sin(t * 0.014 * 1.618 + side * 0.9 + 2.4) * 0.4);
    const spireGlow = ctx.createRadialGradient(tx + twW/2, ty - s * 0.16, 0, tx + twW/2, ty - s * 0.16, s * 0.06);
    spireGlow.addColorStop(0, `rgba(180,100,255,${tipAlpha})`);
    spireGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = spireGlow;
    ctx.fillRect(tx + twW/2 - s*0.06, ty - s*0.22, s*0.12, s*0.12);

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

  // ── Central spire on keep ─────────────────────────────────────────────────
  ctx.fillStyle = '#2a1848';
  ctx.strokeStyle = '#aa70dd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(keepX + keepW * 0.3, keepY);
  ctx.lineTo(keepX + keepW * 0.7, keepY);
  ctx.lineTo(cx, keepY - s * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Central spire glow
  const csAlpha = 0.55 + 0.35 * (Math.sin(t * 0.012) * 0.6 + Math.sin(t * 0.012 * 1.618 + 1.8) * 0.4);
  const csGlow = ctx.createRadialGradient(cx, keepY - s * 0.22, 0, cx, keepY - s * 0.2, s * 0.09);
  csGlow.addColorStop(0, `rgba(200,120,255,${csAlpha})`);
  csGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = csGlow;
  ctx.fillRect(cx - s*0.1, keepY - s*0.3, s*0.2, s*0.15);

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
  const bridgeBotY = H * 0.56;
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

function _drawLobbyMarker(ctx, loc, W, H) {
  const x = loc.x * W;
  const y = loc.y * H;
  const r = Math.max(18, W * 0.038);
  const hovered = _lobbyHoveredId === loc.id;

  ctx.save();
  // Glow
  if (hovered) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
    grd.addColorStop(0, '#c8a06044');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Circle
  ctx.fillStyle = hovered ? '#241c0a' : '#160e06';
  ctx.strokeStyle = hovered ? '#c8a060' : '#4a3010';
  ctx.lineWidth = hovered ? 2 : 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Icon
  ctx.font = `${Math.round(r * 0.9)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(loc.icon, x, y);

  // Label
  ctx.font = `${Math.round(W * 0.018)}px 'Cinzel', serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = hovered ? '#c8a060' : '#6a5030';
  ctx.fillText(loc.label, x, y + r + W * 0.02);

  ctx.restore();
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
    const enterProgress = Math.max(0, Math.min(1, (0.48 - _lobbyPlayerY) / 0.10));
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
    const radius = loc.id === 'castle' ? W * 0.14 : Math.max(22, W * 0.05);
    if (dist < radius) hit = loc.id;
  });
  _lobbyHoveredId = hit;
  canvas.style.cursor = hit ? 'pointer' : 'default';
}

function _lobbyClick(e) {
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
    const radius = loc.id === 'castle' ? W * 0.14 : Math.max(22, W * 0.05);
    if (dist < radius) hit = loc;
  });
  if (!hit) return;

  // Walk to plaza (around fountain) first, then to destination — follows the paths
  const fcx = LOBBY_PLAZA.x, fcy = LOBBY_PLAZA.y;
  const distToCenter = Math.sqrt((_lobbyPlayerX - fcx) ** 2 + (_lobbyPlayerY - fcy) ** 2);
  const destY = hit.id === 'castle' ? 0.48 : hit.y;

  if (distToCenter > 0.08) {
    // Route through plaza first
    _lobbyTargetX = fcx;
    _lobbyTargetY = fcy;
    _lobbyWalking = true;
    _lobbyWalkDest = null;
    _lobbyWaypoint = hit.id;
  } else {
    // Already near center — go direct
    _lobbyTargetX = hit.x;
    _lobbyTargetY = destY;
    _lobbyWalking = true;
    _lobbyWalkDest = hit.id;
    _lobbyWaypoint = null;
  }
}

function _openLobbyLocation(id) {
  if (id === 'castle') {
    // Start castle-enter cinematic — wizard walks slowly into the gate, then it snaps shut
    _lobbyCinematic = 'castle_enter';
    _lobbyCinematicTick = 0;
    _lobbyTargetX = 0.50;
    _lobbyTargetY = 0.38; // deep inside the gate arch
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
  const title = loc ? `${loc.icon} ${loc.label}` : '';
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
    let html = `<div class="lobby-panel-title">${title}</div>`;
    if (!meta.artifacts || !meta.artifacts.length) {
      html += '<div class="brun-empty">No artifacts yet — defeat a Gym Leader!</div>';
    } else {
      html += meta.artifacts.map(a => {
        const def = ARTIFACT_CATALOGUE[a.id];
        if (!def) return '';
        const stars = a.star > 0 ? '★'.repeat(a.star) : '—';
        const sColor = ['#888','#c8a030','#e8d060','#00ccff'][Math.min(a.star||0,3)];
        const prog = a.star < 3 ? `${a.roomsUsed||0}/25 rooms` : 'MAX';
        return `<div class="brun-art-row">
          <div class="brun-art-name">${def.emoji} ${def.name} <span class="brun-art-star" style="color:${sColor}">${stars}</span></div>
          <div class="brun-art-desc">${def.desc[a.star||0]} · <span style="color:#4a4a4a">${prog}</span></div>
        </div>`;
      }).join('');
    }
    content.innerHTML = html;
    panel.style.display = 'block';
  } else if (id === 'library') {
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
