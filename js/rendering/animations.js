// ===== animations.js =====
// ─── ANIMATIONS — Spell / battle visual effects ───────────────────────────────
// Non-blocking. Game state updates instantly; animations are purely cosmetic.
// tickAnims(ctx, W, H) is called from renderBattlefield() each rAF frame.

const ACTIVE_ANIMS = [];

// ─── Screen-level flash overlay ───────────────────────────────────────────────
let _flashR = 0, _flashG = 0, _flashB = 0, _flashAlpha = 0;
function _triggerFlash(r, g, b, a) {
  _flashR = r; _flashG = g; _flashB = b;
  _flashAlpha = Math.max(_flashAlpha, a); // never diminish an existing flash
}

// ─── Bloom / glow: layered semi-transparent circles ───────────────────────────
function _glow(ctx, x, y, r, color, alpha) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.max(0, alpha * 0.10);
  ctx.beginPath(); ctx.arc(x, y, r * 3.8, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = Math.max(0, alpha * 0.20);
  ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = Math.max(0, alpha * 0.55);
  ctx.beginPath(); ctx.arc(x, y, r,       0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── Shockwave / expanding ring ───────────────────────────────────────────────
function _ring(ctx, x, y, r, color, alpha, lw) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw || 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ─── Particle factory (for arc / rise types) ──────────────────────────────────
function _makeParticles(count, spread) {
  const ps = [];
  for (let i = 0; i < count; i++) {
    ps.push({
      offset: (i / count) * -0.20,
      yOff:   ((i * 137 + 31) % (spread * 2 + 1)) - spread,
      size:   2 + (i % 3),
      alpha:  0.55 + (i % 4) * 0.12,
    });
  }
  return ps;
}

// ─── Arc path position helper ─────────────────────────────────────────────────
function _arcPt(from, to, p) {
  p = Math.max(0, Math.min(1, p));
  const x  = from.x + (to.x - from.x) * p;
  const y0 = from.y + (to.y - from.y) * p;
  const arc = -(Math.abs(to.x - from.x) * 0.22 + 10);
  return { x, y: y0 + arc * Math.sin(p * Math.PI) };
}

// ─── Per-element / per-type animation definitions ─────────────────────────────
const ANIM_DEFS = {
  Fire:      { type:'fireball',   dur:30, c1:'#FF6622', c2:'#FF2200', burst:'#FFCC44', glow:'#FF5500' },
  Water:     { type:'water_wave', dur:32, c1:'#44AAFF', c2:'#0066DD', burst:'#AADEFF', glow:'#2288EE' },
  Ice:       { type:'ice_shards', dur:30, c1:'#CCEFFF', c2:'#33AACC', burst:'#FFFFFF', glow:'#88CCEE' },
  Lightning: { type:'lightning',  dur:18, c1:'#FFEE22', c2:'#FFAA00', burst:'#FFFFFF', glow:'#FFFF66' },
  Earth:     { type:'earth_slam', dur:36, c1:'#CC9933', c2:'#664400', burst:'#EEDD88', glow:'#AA7700' },
  Nature:    { type:'vine_lash',  dur:32, c1:'#44EE55', c2:'#118833', burst:'#AAFFAA', glow:'#33BB44' },
  Plasma:    { type:'plasma_orb', dur:30, c1:'#EE44FF', c2:'#8800BB', burst:'#FF88FF', glow:'#CC00EE' },
  Air:       { type:'wind_slash', dur:24, c1:'#AAEEFF', c2:'#55AACC', burst:'#EEFFFF', glow:'#77CCEE' },
  Neutral:   { type:'arc',        dur:22, count:8,  spread:12, c1:'#CCCCCC', c2:'#888888', burst:'#FFFFFF' },
  heal:      { type:'rise',       dur:34, count:12, spread:16, c1:'#44DD66', c2:'#118833', burst:'#AAFFAA' },
  block:     { type:'shield',     dur:26, c1:'#DDAA22', c2:'#AA7700', burst:'#FFEE88' },
  armor:     { type:'shield',     dur:22, c1:'#888888', c2:'#555555', burst:'#CCCCCC' },
};

// ─── Public API ───────────────────────────────────────────────────────────────
function triggerSpellAnim(abilityElement, attackerSide, targetEnemyIdx) {
  const def = ANIM_DEFS[abilityElement] || ANIM_DEFS.Neutral;
  const needsParticles = def.type === 'arc' || def.type === 'rise';
  ACTIVE_ANIMS.push({
    ...def,
    particles: needsParticles ? _makeParticles(def.count || 7, def.spread || 8) : [],
    attackerSide,
    targetEnemyIdx: targetEnemyIdx != null ? targetEnemyIdx : (combat.activeEnemyIdx || 0),
    t: 0,
  });
}

function triggerHealAnim() {
  const def = ANIM_DEFS.heal;
  ACTIVE_ANIMS.push({
    ...def,
    particles: _makeParticles(def.count, def.spread),
    attackerSide: 'player', targetEnemyIdx: -1, t: 0,
  });
}

function triggerBlockAnim(variant) {
  const def = ANIM_DEFS[variant] || ANIM_DEFS.block;
  ACTIVE_ANIMS.push({
    ...def,
    particles: [], attackerSide: 'player', targetEnemyIdx: -1, t: 0,
  });
}

// ─── Position helpers ─────────────────────────────────────────────────────────
function _spriteCenter(side, enemyIdx, W, H) {
  if (side === 'player') {
    if (typeof playerSpritePos === 'function') {
      const p = playerSpritePos(W, H);
      return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    }
    return { x: W * 0.15, y: H * 0.7 };
  }
  if (typeof enemySpritePos === 'function') {
    const allE = (typeof combat !== 'undefined') ? (combat.enemies || []) : [];
    const ep = enemySpritePos(enemyIdx, allE, W, H);
    return { x: ep.x + ep.w / 2, y: ep.y + ep.h / 2 };
  }
  return { x: W * 0.72, y: H * 0.38 };
}

// ─── FIRE: Glowing fireball with ember trail + explosion ──────────────────────
function _drawFireball(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const HIT  = 0.76;

  if (prog < HIT) {
    const p   = prog / HIT;
    const pos = _arcPt(from, to, p);
    const env = Math.sin(p * Math.PI);

    // Ember trail (faded past positions)
    for (let i = 10; i >= 1; i--) {
      const tp   = Math.max(0, p - i * 0.038);
      const tPos = _arcPt(from, to, tp);
      const ta   = (1 - i / 11) * 0.55 * env;
      const sz   = Math.max(0.5, (10 - i) * 0.55);
      ctx.save();
      ctx.globalAlpha = ta;
      ctx.fillStyle   = i <= 3 ? '#FFEE44' : i <= 6 ? a.c1 : a.c2;
      ctx.beginPath(); ctx.arc(tPos.x, tPos.y, sz, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Pulsing glow orb
    const pulse = 1 + 0.18 * Math.sin(a.t * 0.55);
    _glow(ctx, pos.x, pos.y, 11 * pulse, a.glow, env * 0.90);

    // Bright core
    ctx.save();
    ctx.globalAlpha = env;
    ctx.fillStyle   = '#FFEEAA';
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (prog >= HIT) {
    const bp  = (prog - HIT) / (1 - HIT);
    const bp2 = 1 - bp;

    // Screen flash — orange-red
    if (bp < 0.18) _triggerFlash(255, 110, 20, bp2 * 0.20);

    // Central glow burst
    _glow(ctx, to.x, to.y, 22 * (1 - bp * 0.35), a.burst, bp2 * 0.95);

    // Expanding shockwave rings
    _ring(ctx, to.x, to.y, bp * 38, a.c1,   bp2 * 0.85, 3.0);
    _ring(ctx, to.x, to.y, bp * 24, a.burst, bp2 * 0.55, 1.5);

    // Ember sparks flying outward with gravity
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + 0.4;
      const speed = 22 + (i % 5) * 8;
      const grav  = bp * bp * 14;
      const ex = to.x + Math.cos(angle) * speed * bp;
      const ey = to.y + Math.sin(angle) * speed * bp + grav;
      const sz = Math.max(1, 3.5 - bp * 3);
      ctx.save();
      ctx.globalAlpha = bp2 * 0.90;
      ctx.fillStyle   = i % 3 === 0 ? '#FFEE00' : i % 3 === 1 ? a.c1 : a.c2;
      ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, sz + 1, sz + 1);
      ctx.restore();
    }
  }
}

// ─── LIGHTNING: Instant branching bolt + electric sparks ──────────────────────
function _drawLightning(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const fade = prog < 0.20 ? 1 : Math.max(0, 1 - (prog - 0.20) / 0.80);

  // Screen flash on very first frame
  if (a.t <= 1) _triggerFlash(255, 255, 180, 0.30);

  // Helper: draw a jittered zigzag segment
  const zigzag = (x1, y1, x2, y2, segs, amp, lw, col, al) => {
    if ((al * fade) <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, al * fade);
    ctx.strokeStyle = col;
    ctx.lineWidth   = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let i = 1; i <= segs; i++) {
      const t  = i / segs;
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const j  = i < segs ? (((i * 173 + 7 + a.t * 3) % (amp * 2 + 1)) - amp) : 0;
      ctx.lineTo(Math.round(bx + j), Math.round(by - j * 0.5));
    }
    ctx.stroke();
    ctx.restore();
  };

  // Outer glow (wide, faint)
  zigzag(from.x, from.y, to.x, to.y, 8, 14, 8, 'rgba(255,230,50,0.18)', 1);
  // Mid bolt
  zigzag(from.x, from.y, to.x, to.y, 8, 12, 3, a.c1, 0.95);
  // Inner white core
  zigzag(from.x, from.y, to.x, to.y, 8, 10, 1.5, '#FFFFFF', 1.0);

  // Branch 1 — splits off at ~35% toward target
  const b1x = from.x + (to.x - from.x) * 0.35;
  const b1y = from.y + (to.y - from.y) * 0.35;
  const b1ex = b1x + (to.y - from.y) * 0.30 + 24;
  const b1ey = b1y - (to.x - from.x) * 0.12 + 18;
  zigzag(b1x, b1y, b1ex, b1ey, 4, 8, 1.8, a.c1, 0.65);
  zigzag(b1x, b1y, b1ex, b1ey, 4, 6, 0.9, '#FFFFFF', 0.75);

  // Branch 2 — splits off at ~62%
  const b2x = from.x + (to.x - from.x) * 0.62;
  const b2y = from.y + (to.y - from.y) * 0.62;
  const b2ex = b2x - (to.y - from.y) * 0.22 - 18;
  const b2ey = b2y + (to.x - from.x) * 0.08 + 14;
  zigzag(b2x, b2y, b2ex, b2ey, 4, 9, 1.4, a.c1, 0.50);

  // Impact glow + radiating sparks
  const impFade = prog < 0.45 ? 1 : Math.max(0, 1 - (prog - 0.45) / 0.55);
  _glow(ctx, to.x, to.y, 15, a.glow, impFade * 0.90);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + a.t * 0.45;
    const dist  = (9 + (i % 3) * 6) * (0.8 + prog * 0.6);
    ctx.save();
    ctx.globalAlpha = Math.max(0, impFade * 0.75);
    ctx.strokeStyle = '#FFFF66';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(Math.round(to.x + Math.cos(angle) * dist), Math.round(to.y + Math.sin(angle) * dist));
    ctx.stroke();
    ctx.restore();
  }
}

// ─── ICE: Staggered crystal shards + shatter burst ───────────────────────────
function _drawIceShards(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const SHARDS = 5;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  for (let si = 0; si < SHARDS; si++) {
    const delay = si * 0.055;
    const sp    = Math.max(0, (prog - delay) / (1 - delay));
    if (sp <= 0) continue;

    const HIT  = 0.78;
    const yOff = ((si * 137 + 31) % 13) - 6;
    const fromOff = { x: from.x, y: from.y + yOff };
    const toOff   = { x: to.x,   y: to.y   + yOff * 0.3 };

    if (sp < HIT) {
      const p   = sp / HIT;
      const pos = _arcPt(fromOff, toOff, p);
      const env = Math.sin(p * Math.PI);

      // Elongated crystal shard (rotated rect)
      ctx.save();
      ctx.globalAlpha = env * 0.88;
      ctx.translate(Math.round(pos.x), Math.round(pos.y));
      ctx.rotate(angle);
      ctx.fillStyle = a.c2;
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillStyle = a.c1;
      ctx.fillRect(-6, -2, 10, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-5, -2, 6, 1); // glint
      ctx.restore();

      // Ice-dust trail
      if (p > 0.15) {
        const tPos = _arcPt(fromOff, toOff, Math.max(0, p - 0.13));
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.45;
        ctx.fillStyle = a.burst;
        ctx.fillRect(Math.round(tPos.x) - 1, Math.round(tPos.y) - 1, 3, 2);
        ctx.restore();
      }
    } else {
      // Shatter
      const bp  = (sp - HIT) / (1 - HIT);
      const bp2 = 1 - bp;
      if (bp2 <= 0) continue;

      for (let i = 0; i < 8; i++) {
        const sAngle = (i / 8) * Math.PI * 2 + si * 0.9;
        const dist   = (10 + i * 4.5) * bp;
        const grav   = bp * bp * 8;
        ctx.save();
        ctx.globalAlpha = bp2 * 0.85;
        ctx.fillStyle   = i % 2 === 0 ? a.c1 : a.burst;
        ctx.fillRect(
          Math.round(to.x + Math.cos(sAngle) * dist) - 1,
          Math.round(to.y + Math.sin(sAngle) * dist + grav) - 1,
          2, 3
        );
        ctx.restore();
      }
      _ring(ctx, to.x, to.y, bp * 20 + si * 2, a.c2, bp2 * 0.55, 1.5);
    }
  }

  // Frost sparkle lingers at impact
  if (prog > 0.68) {
    const fp = (prog - 0.68) / 0.32;
    _glow(ctx, to.x, to.y, 13 * (1 - fp * 0.4), a.burst, (1 - fp) * 0.75);
  }
}

// ─── WATER: Sinusoidal wave stream + bubble splash ────────────────────────────
function _drawWaterWave(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const HIT  = 0.74;

  // Sinusoidal stream of water drops
  const DROPS = 14;
  for (let i = 0; i < DROPS; i++) {
    const delay = (i / DROPS) * -0.22;
    const dp    = Math.min(1, Math.max(0, prog + delay));
    if (dp <= 0 || dp >= 1) continue;
    const wave  = Math.sin(dp * Math.PI * 3 + i * 0.9) * 9;
    const base  = _arcPt(from, to, dp);
    const env   = Math.sin(dp * Math.PI);
    const sz    = 2.5 + (i % 4) * 0.4;
    ctx.save();
    ctx.globalAlpha = env * (0.5 + (i % 3) * 0.14);
    ctx.fillStyle   = dp < 0.55 ? a.c1 : a.c2;
    ctx.beginPath(); ctx.arc(base.x, base.y + wave, sz, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (prog >= HIT) {
    const bp  = (prog - HIT) / (1 - HIT);
    const bp2 = 1 - bp;

    _glow(ctx, to.x, to.y, 18, a.glow, bp2 * 0.85);
    _ring(ctx, to.x, to.y, bp * 28, a.c1,   bp2 * 0.85, 2.5);
    _ring(ctx, to.x, to.y, bp * 16, a.burst, bp2 * 0.50, 1.0);

    // Upward bubbles
    for (let i = 0; i < 9; i++) {
      const age = bp - i * 0.07;
      if (age <= 0) continue;
      const bx  = to.x + ((i * 37 + 7) % 22) - 11;
      const by  = to.y - age * 28 - i * 2;
      const br  = 2 + (i % 3);
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - age * 2.2)) * 0.72;
      ctx.strokeStyle = a.burst;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Upward droplet spray
    for (let i = 0; i < 12; i++) {
      const dAngle = (-Math.PI * 0.75 + (i / 12) * Math.PI * 1.5);
      const dist   = (14 + i * 2.5) * bp;
      const grav   = bp * bp * 15;
      ctx.save();
      ctx.globalAlpha = bp2 * 0.80;
      ctx.fillStyle   = i % 2 === 0 ? a.c1 : a.burst;
      ctx.fillRect(
        Math.round(to.x + Math.cos(dAngle) * dist) - 1,
        Math.round(to.y + Math.sin(dAngle) * dist + grav) - 1,
        2, 2
      );
      ctx.restore();
    }
  }
}

// ─── EARTH: Tumbling rocks with dust + shockwave ──────────────────────────────
function _drawEarthSlam(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const HIT  = 0.70;

  const ROCKS = 3;
  for (let ri = 0; ri < ROCKS; ri++) {
    const delay = ri * 0.075;
    const rp    = Math.max(0, (prog - delay) / (1 - delay));
    if (rp <= 0) continue;

    const yOff    = ((ri * 97 + 13) % 9) - 4;
    const fromOff = { x: from.x, y: from.y + yOff };
    const toOff   = { x: to.x,   y: to.y };

    if (rp < HIT) {
      const p   = rp / HIT;
      const pos = _arcPt(fromOff, toOff, p);
      const env = Math.sin(p * Math.PI);
      const spin = p * 5 + ri * 1.2;

      // Dust cloud trail
      for (let ti = 1; ti <= 4; ti++) {
        const tp   = Math.max(0, p - ti * 0.05);
        const tPos = _arcPt(fromOff, toOff, tp);
        ctx.save();
        ctx.globalAlpha = (1 - ti / 5) * 0.28 * env;
        ctx.fillStyle   = '#AA8844';
        ctx.beginPath(); ctx.arc(tPos.x, tPos.y, 4 + ti * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Rock chunk (rotated rect with highlight)
      const rw = 7 + ri * 3, rh = 5 + ri * 2;
      ctx.save();
      ctx.globalAlpha = env * 0.92;
      ctx.translate(Math.round(pos.x), Math.round(pos.y));
      ctx.rotate(spin);
      ctx.fillStyle = a.c2;
      ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
      ctx.fillStyle = a.c1;
      ctx.fillRect(-rw / 2, -rh / 2, rw, 2);
      ctx.restore();
    } else {
      const bp  = (rp - HIT) / (1 - HIT);
      const bp2 = 1 - bp;
      if (bp2 <= 0) continue;

      // Debris scatter with gravity
      for (let i = 0; i < 9; i++) {
        const dAngle = (i / 9) * Math.PI * 2 + ri * 1.3;
        const dist   = (10 + i * 4.5) * bp;
        const grav   = bp * bp * 18;
        ctx.save();
        ctx.globalAlpha = bp2 * 0.88;
        ctx.fillStyle   = i % 2 === 0 ? a.c1 : a.c2;
        ctx.fillRect(
          Math.round(to.x + Math.cos(dAngle) * dist + yOff * 0.4) - 1,
          Math.round(to.y + Math.sin(dAngle) * dist + grav) - 1,
          3, 2
        );
        ctx.restore();
      }

      // Dust cloud at impact
      _glow(ctx, to.x, to.y, 16 * bp2, '#BB9944', bp2 * 0.55);

      // Shockwave ring on first rock impact only
      if (ri === 0) {
        _ring(ctx, to.x, to.y, bp * 32, a.burst, bp2 * 0.80, 2.5);
        _ring(ctx, to.x, to.y, bp * 20, a.c1,   bp2 * 0.40, 1.2);
      }
    }
  }
}

// ─── NATURE: Growing vine tendrils + thorn burst ─────────────────────────────
function _drawVineLash(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const HIT  = 0.70;

  // Vine grows from attacker toward target
  if (prog < HIT + 0.10) {
    const drawFrac = Math.min(1, prog / HIT);
    const SEGS     = 18;

    // Shadow vine (dark, offset)
    ctx.save();
    ctx.strokeStyle = a.c2;
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let i = 0; i <= Math.round(SEGS * drawFrac); i++) {
      const p  = i / SEGS;
      const pt = _arcPt(from, to, p);
      const wig = Math.sin(p * Math.PI * 3.5 + a.t * 0.18) * 6 * Math.sin(p * Math.PI);
      i === 0 ? ctx.moveTo(pt.x, pt.y + wig) : ctx.lineTo(pt.x, pt.y + wig);
    }
    ctx.stroke();

    // Highlight vine (brighter, thinner)
    ctx.strokeStyle = a.c1;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.60;
    ctx.stroke();
    ctx.restore();

    // Leaf clusters along vine
    for (let i = 0; i < 7; i++) {
      const lp = (i / 7) * drawFrac;
      if (lp <= 0) continue;
      const lPos = _arcPt(from, to, lp);
      const wig  = Math.sin(lp * Math.PI * 3.5 + a.t * 0.18) * 6 * Math.sin(lp * Math.PI);
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.fillStyle   = i % 2 === 0 ? a.c1 : a.c2;
      ctx.fillRect(Math.round(lPos.x) - 2, Math.round(lPos.y + wig) - 2, 5, 3);
      ctx.restore();
    }
  }

  // Impact: thorn burst + leaf scatter
  if (prog > HIT) {
    const bp  = (prog - HIT) / (1 - HIT);
    const bp2 = 1 - bp;

    _glow(ctx, to.x, to.y, 15, a.glow, bp2 * 0.85);

    // Thorn spikes radiating outward
    for (let i = 0; i < 12; i++) {
      const sAngle = (i / 12) * Math.PI * 2 + 0.4;
      const len    = (15 + (i % 3) * 7) * bp;
      ctx.save();
      ctx.globalAlpha = bp2 * 0.88;
      ctx.strokeStyle = i % 2 === 0 ? a.c1 : a.c2;
      ctx.lineWidth   = Math.max(0.5, 2.2 - bp * 1.5);
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(Math.round(to.x + Math.cos(sAngle) * len), Math.round(to.y + Math.sin(sAngle) * len));
      ctx.stroke();
      ctx.restore();
    }

    // Leaf scatter with gravity
    for (let i = 0; i < 10; i++) {
      const lAngle = (i / 10) * Math.PI * 2 + 1.1;
      const dist   = (14 + i * 4) * bp;
      const grav   = bp * bp * 10;
      ctx.save();
      ctx.globalAlpha = bp2 * 0.82;
      ctx.fillStyle   = i % 2 === 0 ? a.c1 : a.c2;
      ctx.fillRect(
        Math.round(to.x + Math.cos(lAngle) * dist) - 1,
        Math.round(to.y + Math.sin(lAngle) * dist + grav) - 1,
        4, 3
      );
      ctx.restore();
    }
  }
}

// ─── PLASMA: Pulsing orb with orbiting satellites + ring explosion ─────────────
function _drawPlasmaOrb(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const HIT  = 0.74;

  if (prog < HIT) {
    const p     = prog / HIT;
    const pos   = _arcPt(from, to, p);
    const env   = Math.sin(p * Math.PI);
    const pulse = 1 + 0.22 * Math.sin(a.t * 0.55);

    // Energy trail
    for (let i = 6; i >= 1; i--) {
      const tp   = Math.max(0, p - i * 0.038);
      const tPos = _arcPt(from, to, tp);
      ctx.save();
      ctx.globalAlpha = (1 - i / 7) * 0.42 * env;
      ctx.fillStyle   = a.c2;
      ctx.beginPath(); ctx.arc(tPos.x, tPos.y, 4 - i * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Pulsing glow
    _glow(ctx, pos.x, pos.y, 13 * pulse, a.glow, env * 0.92);

    // Core orb
    ctx.save();
    ctx.globalAlpha = env;
    ctx.fillStyle   = a.burst;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(pos.x - 2, pos.y - 2, 2, 0, Math.PI * 2); ctx.fill(); // specular
    ctx.restore();

    // 3 orbiting satellite sparks
    for (let i = 0; i < 3; i++) {
      const oAngle = a.t * 0.28 + (i / 3) * Math.PI * 2;
      const oR     = 14 * pulse;
      const sx = pos.x + Math.cos(oAngle) * oR;
      const sy = pos.y + Math.sin(oAngle) * oR * 0.55;
      ctx.save();
      ctx.globalAlpha = env * 0.78;
      ctx.fillStyle   = i % 2 === 0 ? a.c1 : a.c2;
      ctx.beginPath(); ctx.arc(sx, sy, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  if (prog >= HIT) {
    const bp  = (prog - HIT) / (1 - HIT);
    const bp2 = 1 - bp;

    // Screen flash — purple
    if (bp < 0.18) _triggerFlash(200, 40, 255, bp2 * 0.18);

    _glow(ctx, to.x, to.y, 24 * (1 - bp * 0.35), a.burst, bp2 * 0.95);

    // Three expanding rings
    _ring(ctx, to.x, to.y, bp * 40, a.c1,    bp2 * 0.85, 3.0);
    _ring(ctx, to.x, to.y, bp * 26, a.burst,  bp2 * 0.62, 2.0);
    _ring(ctx, to.x, to.y, bp * 14, '#FFFFFF', bp2 * 0.32, 1.0);

    // Energy sparks scatter
    for (let i = 0; i < 16; i++) {
      const sAngle = (i / 16) * Math.PI * 2 + 0.6;
      const dist   = (20 + i * 4) * bp;
      const sz     = 2 + (i % 2);
      ctx.save();
      ctx.globalAlpha = bp2 * 0.88;
      ctx.fillStyle   = i % 2 === 0 ? a.c1 : a.c2;
      ctx.fillRect(
        Math.round(to.x + Math.cos(sAngle) * dist) - 1,
        Math.round(to.y + Math.sin(sAngle) * dist) - 1,
        sz, sz
      );
      ctx.restore();
    }
  }
}

// ─── AIR: Wind slash streaks + swirl burst ────────────────────────────────────
function _drawWindSlash(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;
  const HIT  = 0.66;
  const travelAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const perpAngle   = travelAngle + Math.PI / 2;

  const SLASHES = 5;
  for (let si = 0; si < SLASHES; si++) {
    const delay = si * 0.055;
    const sp    = Math.max(0, Math.min(1, (prog - delay) / (1 - delay)));
    if (sp <= 0) continue;

    if (sp < HIT) {
      const p          = sp / HIT;
      const pos        = _arcPt(from, to, p);
      const env        = Math.sin(p * Math.PI);
      const slashOff   = (si - 2) * 7;   // vertical spread
      const slashLen   = 12 + si * 2.5;

      // Slash line (oriented along travel direction)
      const sx1 = pos.x + Math.cos(perpAngle) * slashOff - Math.cos(travelAngle) * slashLen * 0.5;
      const sy1 = pos.y + Math.sin(perpAngle) * slashOff - Math.sin(travelAngle) * slashLen * 0.5;
      const sx2 = pos.x + Math.cos(perpAngle) * slashOff + Math.cos(travelAngle) * slashLen * 0.5;
      const sy2 = pos.y + Math.sin(perpAngle) * slashOff + Math.sin(travelAngle) * slashLen * 0.5;

      ctx.save();
      ctx.globalAlpha = env * (0.55 + si * 0.07);
      ctx.strokeStyle = si % 2 === 0 ? a.c1 : a.burst;
      ctx.lineWidth   = Math.max(0.8, 2.2 - si * 0.2);
      ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
      ctx.restore();

      // Afterimage trail (faint copy slightly behind)
      if (p > 0.18) {
        const tPos = _arcPt(from, to, p - 0.12);
        const atx1 = tPos.x + Math.cos(perpAngle) * slashOff - Math.cos(travelAngle) * slashLen * 0.4;
        const aty1 = tPos.y + Math.sin(perpAngle) * slashOff - Math.sin(travelAngle) * slashLen * 0.4;
        const atx2 = tPos.x + Math.cos(perpAngle) * slashOff + Math.cos(travelAngle) * slashLen * 0.4;
        const aty2 = tPos.y + Math.sin(perpAngle) * slashOff + Math.sin(travelAngle) * slashLen * 0.4;
        ctx.save();
        ctx.globalAlpha = env * 0.22;
        ctx.strokeStyle = a.c1;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(atx1, aty1); ctx.lineTo(atx2, aty2); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Impact: expanding spiral wind burst
  if (prog >= HIT) {
    const bp  = (prog - HIT) / (1 - HIT);
    const bp2 = 1 - bp;

    _glow(ctx, to.x, to.y, 15, a.glow, bp2 * 0.82);
    _ring(ctx, to.x, to.y, bp * 30, a.c1,   bp2 * 0.85, 2.0);
    _ring(ctx, to.x, to.y, bp * 18, a.burst, bp2 * 0.50, 1.0);

    // Spiral wind streaks
    for (let i = 0; i < 14; i++) {
      const sAngle = (i / 14) * Math.PI * 2 + bp * Math.PI * 2.5;
      const r1     = (6 + i * 0.8) * bp;
      const r2     = r1 + 10;
      ctx.save();
      ctx.globalAlpha = bp2 * 0.65;
      ctx.strokeStyle = i % 2 === 0 ? a.c1 : a.burst;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(to.x + Math.cos(sAngle) * r1, to.y + Math.sin(sAngle) * r1 * 0.55);
      ctx.lineTo(to.x + Math.cos(sAngle + 0.55) * r2, to.y + Math.sin(sAngle + 0.55) * r2 * 0.55);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ─── ARC (Neutral) — particles fly arc path + glow impact ────────────────────
function _drawArc(ctx, a, W, H) {
  const from = _spriteCenter(a.attackerSide, a.targetEnemyIdx, W, H);
  const toSide = a.attackerSide === 'player' ? 'enemy' : 'player';
  const to   = _spriteCenter(toSide, a.targetEnemyIdx, W, H);
  const prog = a.t / a.dur;

  a.particles.forEach(p => {
    const pt = Math.min(1, Math.max(0, prog + p.offset));
    if (pt <= 0 || pt >= 1) return;
    const pos = _arcPt(from, to, pt);
    const env = Math.sin(pt * Math.PI);
    ctx.save();
    ctx.globalAlpha = env * p.alpha;
    ctx.fillStyle   = pt < 0.55 ? a.c1 : a.c2;
    const sz = Math.max(1, Math.round(p.size * (1 - pt * 0.35)));
    ctx.fillRect(Math.round(pos.x) - (sz >> 1), Math.round(pos.y) - (sz >> 1), sz, sz);
    ctx.restore();
  });

  if (prog > 0.70) {
    const bp = (prog - 0.70) / 0.30;
    _glow(ctx, to.x, to.y, 12, a.burst, (1 - bp) * 0.75);
    _ring(ctx, to.x, to.y, bp * 18, a.c1, (1 - bp) * 0.70, 1.5);
  }
}

// ─── RISE (Heal) — particles float upward with glow ──────────────────────────
function _drawRise(ctx, a, W, H) {
  const center = _spriteCenter('player', 0, W, H);
  const prog   = a.t / a.dur;

  // Screen flash — soft green
  if (a.t === 1) _triggerFlash(50, 220, 80, 0.15);

  // Rising particles
  a.particles.forEach((p, i) => {
    const delay = (i / a.particles.length) * 0.28;
    const pt    = Math.max(0, (prog - delay) / (1 - delay));
    if (pt <= 0 || pt >= 1) return;
    const x = center.x + p.yOff;
    const y = center.y - pt * 38 - 4;
    ctx.save();
    ctx.globalAlpha = Math.sin(pt * Math.PI) * p.alpha;
    ctx.fillStyle   = pt < 0.5 ? a.c1 : a.c2;
    ctx.fillRect(Math.round(x), Math.round(y), p.size, p.size);
    ctx.restore();
  });

  // Central glow
  if (prog < 0.55) {
    _glow(ctx, center.x, center.y, 16, a.burst, (1 - prog / 0.55) * 0.55);
  }
}

// ─── SHIELD (Block / Armor) — pulsing glow border with corner sparks ──────────
function _drawShield(ctx, a, W, H) {
  const pp   = typeof playerSpritePos === 'function'
    ? playerSpritePos(W, H)
    : { x: W * 0.06, y: H * 0.5, w: 48, h: 64 };
  const prog = a.t / a.dur;
  const grow = Math.min(1, prog * 3.5);
  const fade = prog < 0.30 ? prog / 0.30 : 1 - (prog - 0.30) / 0.70;
  const pad  = 6 * grow;

  // Glow fill
  ctx.save();
  ctx.globalAlpha = fade * 0.45;
  ctx.fillStyle   = a.burst;
  ctx.fillRect(pp.x - pad, pp.y - pad, pp.w + pad * 2, pp.h + pad * 2);

  // Bright border
  ctx.globalAlpha = fade * 0.90;
  ctx.strokeStyle = a.c1;
  ctx.lineWidth   = Math.max(1, Math.round(2.5 * grow));
  ctx.strokeRect(pp.x - pad, pp.y - pad, pp.w + pad * 2, pp.h + pad * 2);
  ctx.restore();

  // Corner spark dots
  const corners = [
    [pp.x - pad, pp.y - pad],
    [pp.x + pp.w + pad, pp.y - pad],
    [pp.x - pad, pp.y + pp.h + pad],
    [pp.x + pp.w + pad, pp.y + pp.h + pad],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.save();
    ctx.globalAlpha = fade * (0.6 + 0.4 * Math.sin(a.t * 0.4));
    ctx.fillStyle   = a.burst;
    ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 4, 4);
    ctx.restore();
  });
}

// ─── Main tick — called every rAF frame from renderBattlefield ────────────────
function tickAnims(ctx, W, H) {
  for (let i = ACTIVE_ANIMS.length - 1; i >= 0; i--) {
    const a = ACTIVE_ANIMS[i];
    switch (a.type) {
      case 'fireball':   _drawFireball(ctx, a, W, H);   break;
      case 'lightning':  _drawLightning(ctx, a, W, H);  break;
      case 'ice_shards': _drawIceShards(ctx, a, W, H);  break;
      case 'water_wave': _drawWaterWave(ctx, a, W, H);  break;
      case 'earth_slam': _drawEarthSlam(ctx, a, W, H);  break;
      case 'vine_lash':  _drawVineLash(ctx, a, W, H);   break;
      case 'plasma_orb': _drawPlasmaOrb(ctx, a, W, H);  break;
      case 'wind_slash': _drawWindSlash(ctx, a, W, H);  break;
      case 'arc':        _drawArc(ctx, a, W, H);        break;
      case 'rise':       _drawRise(ctx, a, W, H);       break;
      case 'shield':     _drawShield(ctx, a, W, H);     break;
    }
    a.t++;
    if (a.t >= a.dur) ACTIVE_ANIMS.splice(i, 1);
  }

  // Screen flash overlay — drawn after all anims, decays per frame
  if (_flashAlpha > 0.006) {
    ctx.save();
    ctx.globalAlpha = _flashAlpha;
    ctx.fillStyle   = `rgb(${_flashR},${_flashG},${_flashB})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    _flashAlpha *= 0.72; // quick decay
    if (_flashAlpha < 0.006) _flashAlpha = 0;
  }
}


// ═══ CAMPFIRE SCENE ════════════════════════════════════════════════════════════
// Full animated rest scene: player sitting by crackling campfire, night sky.

let _cfRAF = null;
let _cfTick = 0;
let _cfHealText = '';

// ── Zone-themed campfire environments ─────────────────────────────────────────
function _cfStars(ctx, W, H, groundY, t) {
  for(let i=0;i<55;i++){
    const sx=(i*137+17)%W, sy=(i*97+31)%Math.floor(groundY*0.85);
    const blink=Math.sin(t*0.025+i*0.7)>0.55;
    ctx.globalAlpha=blink?0.7:0.2; ctx.fillStyle='#ffffff';
    ctx.fillRect(sx,sy,1,1);
  }
  ctx.globalAlpha=1;
}
function _cfMoon(ctx, W, H, t, col, x, y) {
  ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle=col||'#e8e0c0';
  ctx.beginPath(); ctx.arc(Math.round(W*(x||0.82)),Math.round(H*(y||0.13)),9,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1; ctx.fillStyle='#02020a';
  ctx.beginPath(); ctx.arc(Math.round(W*(x||0.82))+5,Math.round(H*(y||0.13))-2,8,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function _cfDrawEnvironment(ctx, W, H, groundY, t, zone) {
  switch(zone) {
    case 'Fire':      _cfEnvFire(ctx,W,H,groundY,t);      break;
    case 'Water':     _cfEnvWater(ctx,W,H,groundY,t);     break;
    case 'Ice':       _cfEnvIce(ctx,W,H,groundY,t);       break;
    case 'Lightning': _cfEnvLightning(ctx,W,H,groundY,t); break;
    case 'Earth':     _cfEnvEarth(ctx,W,H,groundY,t);     break;
    case 'Nature':    _cfEnvNature(ctx,W,H,groundY,t);    break;
    case 'Plasma':    _cfEnvPlasma(ctx,W,H,groundY,t);    break;
    case 'Air':       _cfEnvAir(ctx,W,H,groundY,t);       break;
    default:          _cfEnvFire(ctx,W,H,groundY,t);      break;
  }
}

// FIRE: dark ember sky, glowing horizon, cracked lava ground
function _cfEnvFire(ctx,W,H,gY,t){
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#0a0200'); sky.addColorStop(0.6,'#1a0600'); sky.addColorStop(1,'#2a0c00');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,gY);
  // Ember horizon glow
  ctx.save(); ctx.globalAlpha=0.18+0.06*Math.sin(t*0.04);
  const hg=ctx.createLinearGradient(0,gY-20,0,gY);
  hg.addColorStop(0,'transparent'); hg.addColorStop(1,'#FF4400');
  ctx.fillStyle=hg; ctx.fillRect(0,gY-20,W,20); ctx.restore();
  // Stars (sparse, reddish)
  for(let i=0;i<30;i++){const sx=(i*137+17)%W,sy=(i*97+31)%Math.floor(gY*0.7);ctx.globalAlpha=0.25;ctx.fillStyle='#ff9944';ctx.fillRect(sx,sy,1,1);}
  ctx.globalAlpha=1;
  // Ground — cracked dark lava
  const gg=ctx.createLinearGradient(0,gY,0,H);
  gg.addColorStop(0,'#2a1000'); gg.addColorStop(1,'#0a0400');
  ctx.fillStyle=gg; ctx.fillRect(0,gY,W,H);
  ctx.fillStyle='#3a1400'; ctx.fillRect(0,gY,W,2);
  // Lava crack lines
  ctx.save(); ctx.globalAlpha=0.5+0.2*Math.sin(t*0.06);
  ctx.fillStyle='#FF4400';
  for(let i=0;i<5;i++){const cx=(i*W/4+W*0.1)%W;ctx.fillRect(Math.round(cx),gY+2,1,H-gY-2);}
  ctx.restore();
  // Small fire hazard spots on ground
  for(let i=0;i<3;i++){
    const gfx=Math.round((i*0.28+0.12)*W);
    ctx.save();ctx.globalAlpha=(0.3+0.15*Math.sin(t*0.08+i))*0.7;
    ctx.fillStyle='#FF8800';ctx.fillRect(gfx-3,gY+4,6,3);ctx.restore();
  }
}

// WATER: deep ocean night, moonlit water reflection, sandy shore
function _cfEnvWater(ctx,W,H,gY,t){
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#01050f'); sky.addColorStop(0.6,'#050e1a'); sky.addColorStop(1,'#0a1828');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,gY);
  _cfStars(ctx,W,H,gY,t);
  _cfMoon(ctx,W,H,t,'#c0d8f0',0.80,0.12);
  // Ground — wet sand / shore
  const gg=ctx.createLinearGradient(0,gY,0,H);
  gg.addColorStop(0,'#1a2a1a'); gg.addColorStop(0.4,'#0e1a10'); gg.addColorStop(1,'#060e0a');
  ctx.fillStyle=gg; ctx.fillRect(0,gY,W,H);
  ctx.fillStyle='#1e3020'; ctx.fillRect(0,gY,W,2);
  // Water shimmer at horizon
  ctx.save();
  for(let i=0;i<6;i++){
    const wx=Math.round((i*W/5+Math.sin(t*0.03+i)*8)%W);
    ctx.globalAlpha=0.12+0.08*Math.sin(t*0.05+i*1.3);
    ctx.fillStyle='#4488cc'; ctx.fillRect(wx,gY-2,Math.round(W*0.08),1);
  }
  ctx.restore();
  // Moon reflection ripple on ground
  ctx.save();
  for(let i=0;i<4;i++){
    const rx=Math.round(W*0.8+Math.sin(t*0.04+i)*6);
    ctx.globalAlpha=(0.06-i*0.012)*Math.abs(Math.sin(t*0.03));
    ctx.fillStyle='#aaccee';ctx.fillRect(rx-i*4,gY+4+i*3,8+i*8,1);
  }
  ctx.restore();
}

// ICE: pale blue arctic night, aurora, snow ground
function _cfEnvIce(ctx,W,H,gY,t){
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#010814'); sky.addColorStop(0.6,'#05101e'); sky.addColorStop(1,'#0a1828');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,gY);
  // Aurora bands
  ctx.save();
  [[0.2,0.3,'#004422'],[0.45,0.25,'#003344'],[0.7,0.35,'#002233']].forEach(([fx,fy,col],i)=>{
    ctx.globalAlpha=0.10+0.05*Math.sin(t*0.02+i);
    ctx.fillStyle=col;
    ctx.fillRect(0,Math.round(gY*fy),W,Math.round(gY*0.12));
  });
  ctx.restore();
  _cfStars(ctx,W,H,gY,t);
  _cfMoon(ctx,W,H,t,'#ddeeff',0.78,0.11);
  // Ground — snow
  const gg=ctx.createLinearGradient(0,gY,0,H);
  gg.addColorStop(0,'#c8ddf0'); gg.addColorStop(0.3,'#8aaac8'); gg.addColorStop(1,'#405870');
  ctx.fillStyle=gg; ctx.fillRect(0,gY,W,H);
  ctx.fillStyle='#e8f4ff'; ctx.fillRect(0,gY,W,3);
  // Snow sparkles on ground
  ctx.save();
  for(let i=0;i<12;i++){
    const sx=(i*71+13)%W;
    ctx.globalAlpha=0.4+0.3*Math.sin(t*0.04+i);
    ctx.fillStyle='#ffffff'; ctx.fillRect(sx,gY+2+(i%4)*3,1,1);
  }
  ctx.restore();
  // Snow drift mounds
  ctx.fillStyle='#d0e8ff';
  for(let i=0;i<4;i++){
    const mx=Math.round((i*W/3+W*0.05)%(W-20));
    ctx.fillRect(mx,gY-2,Math.round(W*0.08),4);
  }
}

// LIGHTNING: storm sky, lightning flashes, scorched stone ground
function _cfEnvLightning(ctx,W,H,gY,t){
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#04060a'); sky.addColorStop(0.6,'#0a0e14'); sky.addColorStop(1,'#14141a');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,gY);
  // Storm cloud banks
  ctx.save();
  [[0.15,0.18,80],[0.5,0.12,100],[0.75,0.20,70]].forEach(([fx,fy,cw])=>{
    ctx.globalAlpha=0.35; ctx.fillStyle='#1a1e28';
    ctx.fillRect(Math.round(fx*W-cw/2),Math.round(fy*gY),cw,18);
  });
  ctx.restore();
  // Lightning flash across sky
  if(Math.floor(t/90)%5===0&&t%90<8){
    ctx.save();ctx.globalAlpha=0.12;ctx.fillStyle='#eeeeff';ctx.fillRect(0,0,W,gY);ctx.restore();
  }
  _cfStars(ctx,W,H,gY,t);
  // Ground — dark scorched stone
  const gg=ctx.createLinearGradient(0,gY,0,H);
  gg.addColorStop(0,'#12121a'); gg.addColorStop(1,'#06060e');
  ctx.fillStyle=gg; ctx.fillRect(0,gY,W,H);
  ctx.fillStyle='#1e1e2a'; ctx.fillRect(0,gY,W,2);
  // Stone tile lines
  ctx.save(); ctx.globalAlpha=0.2; ctx.fillStyle='#0a0a14';
  for(let i=0;i<6;i++) ctx.fillRect(Math.round(i*W/5),gY,1,H-gY);
  ctx.restore();
  // Static crackle on ground
  for(let i=0;i<4;i++){
    const sx=Math.round((i*W*0.22+W*0.08)%W);
    ctx.save();ctx.globalAlpha=0.12+0.08*Math.sin(t*0.15+i*2.1);
    ctx.fillStyle='#8888ff';ctx.fillRect(sx,gY+2,1,6);ctx.restore();
  }
}

// EARTH: warm dusk sky, distant mountains, dirt ground
function _cfEnvEarth(ctx,W,H,gY,t){
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#0a0810'); sky.addColorStop(0.5,'#1a1010'); sky.addColorStop(1,'#2a1a08');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,gY);
  // Distant mountain silhouettes
  ctx.save(); ctx.fillStyle='#1a1008'; ctx.globalAlpha=0.8;
  [[0.1,0.55,0.12],[0.25,0.50,0.09],[0.45,0.48,0.14],[0.6,0.52,0.10],[0.8,0.46,0.13]].forEach(([fx,fy,fw])=>{
    const mx=Math.round(fx*W), my=Math.round(fy*gY), mw=Math.round(fw*W), mh=gY-my;
    for(let px=mx-mw/2;px<mx+mw/2;px++){
      const h2=mh*Math.max(0,1-Math.pow((px-mx)/(mw/2),2));
      ctx.fillRect(Math.round(px),Math.round(my+mh-h2),1,Math.round(h2));
    }
  });
  ctx.restore();
  _cfStars(ctx,W,H,gY,t);
  _cfMoon(ctx,W,H,t,'#e0c890',0.83,0.14);
  // Ground — rich soil
  const gg=ctx.createLinearGradient(0,gY,0,H);
  gg.addColorStop(0,'#2a1a08'); gg.addColorStop(1,'#0e0a04');
  ctx.fillStyle=gg; ctx.fillRect(0,gY,W,H);
  ctx.fillStyle='#3a2010'; ctx.fillRect(0,gY,W,2);
  // Dirt texture pebbles
  ctx.save(); ctx.globalAlpha=0.3;
  for(let i=0;i<8;i++){const px=(i*67+23)%W;ctx.fillStyle='#4a2a12';ctx.fillRect(px,gY+3+(i%3)*4,2,1);}
  ctx.restore();
}

// NATURE: lush forest night, fireflies, mossy ground
function _cfEnvNature(ctx,W,H,gY,t){
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#010a04'); sky.addColorStop(0.6,'#040e06'); sky.addColorStop(1,'#0a1a08');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,gY);
  // Tree silhouettes L and R
  ctx.save(); ctx.fillStyle='#040e04'; ctx.globalAlpha=0.9;
  [[0.04,0.42,16,gY*0.55],[0.10,0.38,12,gY*0.60],[0.86,0.40,15,gY*0.58],[0.93,0.45,11,gY*0.52]].forEach(([fx,_,tw,th])=>{
    ctx.fillRect(Math.round(fx*W)-Math.round(tw/2),gY-Math.round(th),tw,Math.round(th));
  });
  ctx.restore();
  _cfStars(ctx,W,H,gY,t);
  _cfMoon(ctx,W,H,t,'#d0eec0',0.80,0.12);
  // Ground — moss
  const gg=ctx.createLinearGradient(0,gY,0,H);
  gg.addColorStop(0,'#0e2008'); gg.addColorStop(1,'#040c04');
  ctx.fillStyle=gg; ctx.fillRect(0,gY,W,H);
  ctx.fillStyle='#1a3a10'; ctx.fillRect(0,gY,W,2);
  // Fireflies
  for(let i=0;i<8;i++){
    const age=(t*0.4+i*14)%70;
    const alpha=age<10?age/10:Math.max(0,1-(age-10)/60);
    const fx=Math.round(W*0.1+((i*59+age*0.5)%(W*0.8)));
    const fy=Math.round(gY*0.5+((i*37)%Math.round(gY*0.4))-age*0.3);
    ctx.save();ctx.globalAlpha=alpha*0.8;ctx.fillStyle='#aaff44';ctx.fillRect(fx,fy,2,2);ctx.restore();
  }
}

// PLASMA: void night, dimensional rifts, arcane ground
function _cfEnvPlasma(ctx,W,H,gY,t){
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#05020e'); sky.addColorStop(0.6,'#0a0518'); sky.addColorStop(1,'#150a22');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,gY);
  // Plasma rift wisps in sky
  ctx.save();
  for(let i=0;i<3;i++){
    const rx=Math.round((i*W*0.3+W*0.1+Math.sin(t*0.02+i)*12)%W);
    const ry=Math.round(gY*(0.2+i*0.12));
    ctx.globalAlpha=0.08+0.05*Math.sin(t*0.03+i*1.4);
    ctx.fillStyle=['#8844ff','#ff44cc','#44aaff'][i];
    ctx.fillRect(rx-25,ry,50,3);
  }
  ctx.restore();
  _cfStars(ctx,W,H,gY,t);
  _cfMoon(ctx,W,H,t,'#cc88ff',0.81,0.12);
  // Ground — dark arcane stone
  const gg=ctx.createLinearGradient(0,gY,0,H);
  gg.addColorStop(0,'#1a0a28'); gg.addColorStop(1,'#080412');
  ctx.fillStyle=gg; ctx.fillRect(0,gY,W,H);
  ctx.fillStyle='#2a1040'; ctx.fillRect(0,gY,W,2);
  // Glowing rune cracks on ground
  for(let i=0;i<5;i++){
    const rx=(i*W*0.18+W*0.06)%W;
    ctx.save();ctx.globalAlpha=0.15+0.10*Math.sin(t*0.05+i*1.7);
    ctx.fillStyle='#aa44ff';ctx.fillRect(Math.round(rx),gY+3,2,H-gY-3);ctx.restore();
  }
}

// AIR: open night sky, player sits on cloud, stars close
function _cfEnvAir(ctx,W,H,gY,t){
  // Full night sky — no ground, we're on a cloud
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#03050d'); sky.addColorStop(0.6,'#07101e'); sky.addColorStop(1,'#0d1a2e');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
  // Many stars (closer, brighter)
  for(let i=0;i<80;i++){
    const sx=(i*131+19)%W, sy=(i*89+41)%(H*0.90);
    const blink=Math.sin(t*0.022+i*0.6)>0.45;
    ctx.globalAlpha=blink?0.85:0.30; ctx.fillStyle=i%7===0?'#aaccff':'#ffffff';
    ctx.fillRect(sx,sy,i%11===0?2:1,i%11===0?2:1);
  }
  ctx.globalAlpha=1;
  // Moon — large, bright
  ctx.save();ctx.globalAlpha=0.70;ctx.fillStyle='#e8f4ff';
  ctx.fillRect(Math.round(W*0.79)-8,Math.round(H*0.10)-8,16,16);
  ctx.globalAlpha=1;ctx.fillStyle='#03050d';
  ctx.fillRect(Math.round(W*0.79)+2,Math.round(H*0.10)-7,7,14);
  ctx.restore();
  // Distant clouds in background
  ctx.save();
  [[0.15,0.65,55,8],[0.60,0.55,70,10],[0.85,0.72,45,7]].forEach(([fx,fy,cw,ch])=>{
    ctx.globalAlpha=0.12;ctx.fillStyle='#4a6a8a';
    ctx.fillRect(Math.round(fx*W-cw/2),Math.round(fy*H),cw,ch);
  });
  ctx.restore();
  // "Ground" is a large cloud platform — drawn at gY level
  // Cloud platform (the one player sits on)
  const cw=Math.round(W*0.7), ch=20, cx=Math.round(W*0.5), cy=gY+2;
  ctx.save();
  ctx.globalAlpha=0.9;ctx.fillStyle='#5a7898';ctx.fillRect(cx-cw/2,cy+Math.round(ch*0.45),cw,Math.round(ch*0.55));
  const bumps=[{ox:0.05,bw:0.20,bh:0.65},{ox:0.22,bw:0.18,bh:0.50},{ox:0.38,bw:0.22,bh:0.75},{ox:0.58,bw:0.20,bh:0.52},{ox:0.76,bw:0.18,bh:0.62}];
  bumps.forEach(({ox,bw,bh})=>{
    const bx=cx-cw/2+Math.round(ox*cw),bwPx=Math.round(bw*cw),bhPx=Math.round(bh*ch*0.65),bTop=cy+Math.round(ch*0.45)-bhPx;
    ctx.fillStyle='#6a8aae';ctx.fillRect(bx,bTop+2,bwPx,bhPx+Math.round(ch*0.55)-2);
    ctx.fillStyle='#9abcd0';ctx.fillRect(bx+1,bTop,bwPx-2,2);
  });
  ctx.fillStyle='#9abcd0';ctx.fillRect(cx-cw/2+1,cy+Math.round(ch*0.45),cw-2,1);
  ctx.restore();
}

// Seated player sprite (back-left view, legs tucked to the right)
const SPRITE_PLAYER_SITTING = [
  '....hhhhh...',
  '...hhhhhhh..',
  '..3hhhhhhh..',
  '...ssssss...',
  '...111111...',
  '..11111111..',
  '.1111111111.',
  '111111111111',
  '111222222111',
  '111222222111',
  '111222222bbb',  // legs out to side
  '.......bbbbb',
];

// Campfire structure sprite (12-col, drawn large)
const SPRITE_CF_LOGS = [
  '..3.....3...',
  '.333...333..',
  '3333.3.3333.',
  '333333333333',
  '222222222222',
  '212122212122',
];

const SPRITE_CF_FLAME_A = [
  '....3111....',
  '...311113...',
  '..31111113..',
  '.3111111113.',
  '..31111113..',
  '...311113...',
];
const SPRITE_CF_FLAME_B = [
  '.....111....',
  '....11113...',
  '...3111113..',
  '..311111113.',
  '...3111113..',
  '....31113...',
];
const SPRITE_CF_FLAME_C = [
  '....3113....',
  '...311113...',
  '...311113...',
  '..31111113..',
  '.311111113..',
  '..311111....',
];

function startCampfireScene(healText) {
  _cfHealText = healText || '';
  _cfTick = 0;
  const canvas = document.getElementById('campfire-canvas');
  if (!canvas) return;

  const W = canvas.parentElement ? canvas.parentElement.clientWidth : 400;
  canvas.width  = Math.min(W, 520);
  canvas.height = Math.round(canvas.width * 0.48);

  if (_cfRAF) cancelAnimationFrame(_cfRAF);
  const tick = () => {
    _renderCampfireScene(canvas);
    _cfTick++;
    _cfRAF = requestAnimationFrame(tick);
  };
  _cfRAF = requestAnimationFrame(tick);
}

function stopCampfireScene() {
  if (_cfRAF) { cancelAnimationFrame(_cfRAF); _cfRAF = null; }
}

function _renderCampfireScene(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const t = _cfTick;

  // ── Zone-themed environment ─────────────────────────────────────────────
  const _cfZone = (typeof currentZoneElement !== 'undefined' && currentZoneElement) || 'Fire';
  const groundY = Math.floor(H * 0.68);
  _cfDrawEnvironment(ctx, W, H, groundY, t, _cfZone);

  // ── Fire warm glow on ground ──────────────────────────────────────────────
  const fireX = Math.round(W * 0.5);
  const fireY = groundY - 4;
  const flicker = 0.85 + 0.15 * Math.sin(t * 0.13);
  const glowR = (Math.round(W * 0.28)) * flicker;
  ctx.save();
  const glow = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, glowR);
  glow.addColorStop(0,   `rgba(255,120,20,${0.18 * flicker})`);
  glow.addColorStop(0.4, `rgba(200,80,10,${0.10 * flicker})`);
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, groundY - glowR, W, glowR * 2);
  ctx.restore();

  // ── Campfire logs ─────────────────────────────────────────────────────────
  const logScale = Math.round(Math.max(2, W / 160));
  const logPal = ['#6a3810', '#3a1808', '#c8a060', '#2a1004'];
  const logW = 12 * logScale;
  const logH = SPRITE_CF_LOGS.length * logScale;
  const logSX = Math.round(fireX - logW / 2);
  const logSY = groundY - logH + 2;
  if (typeof drawSprite === 'function') {
    drawSprite(ctx, SPRITE_CF_LOGS, logSX, logSY, logScale, logPal);
  }

  // ── Animated flame ────────────────────────────────────────────────────────
  const frameIdx = Math.floor(t / 5) % 3;
  const flameRows = [SPRITE_CF_FLAME_A, SPRITE_CF_FLAME_B, SPRITE_CF_FLAME_C][frameIdx];
  const flickPals = [
    ['#FF7700','#FFAA00','#FF3300','#FF9900'],
    ['#FF5500','#FF8800','#FF2200','#FFCC00'],
    ['#FF9900','#FFCC00','#FF4400','#FFAA00'],
  ];
  const flamePal = flickPals[frameIdx];
  const flameScale = logScale;
  const flameW = 12 * flameScale;
  const flameH = flameRows.length * flameScale;
  const flameSX = Math.round(fireX - flameW / 2);
  const flameSY = logSY - flameH + flameScale * 2;
  if (typeof drawSprite === 'function') {
    drawSprite(ctx, flameRows, flameSX, flameSY, flameScale, flamePal);
  }

  // ── Smoke particles ───────────────────────────────────────────────────────
  for (let i = 0; i < 8; i++) {
    const age   = (t * 0.7 + i * 11) % 60;
    const alpha = Math.max(0, 0.25 - age / 100);
    if (alpha <= 0) continue;
    const px = fireX + Math.sin(age * 0.18 + i) * 7;
    const py = flameSY - age * 1.1;
    const r  = 1 + age * 0.12;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Player sitting left of fire ───────────────────────────────────────────
  const pScale = Math.round(Math.max(2, W / 180));
  const pRows  = typeof getPlayerCharSprite === 'function' ? getPlayerCharSprite() : SPRITE_PLAYER_SITTING;
  // Use sitting sprite
  const sitRows = SPRITE_PLAYER_SITTING;
  const sitPal  = typeof getElemPal === 'function' && typeof playerElement !== 'undefined'
                  ? getElemPal(playerElement) : ['#888888','#555555','#aaaaaa','#dddddd'];

  // Add hair color — override 'h' in palette via custom charToColor
  const sitW = 12 * pScale;
  const sitH = sitRows.length * pScale;
  const sitX = Math.round(fireX - logW * 1.55 - sitW * 0.5);
  const sitY = groundY - sitH + pScale;

  // Gentle warm tint from fire on player
  ctx.save();
  ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 0.1);
  ctx.fillStyle = '#FF8822';
  ctx.fillRect(sitX, sitY, sitW, sitH);
  ctx.restore();

  if (typeof drawSprite === 'function') {
    drawSprite(ctx, sitRows, sitX, sitY, pScale, sitPal);
  }

  // ── Heal text ─────────────────────────────────────────────────────────────
  if (_cfHealText) {
    const fadeIn = Math.min(1, t / 35);
    ctx.save();
    ctx.globalAlpha = fadeIn * (0.75 + 0.25 * Math.sin(t * 0.04));
    ctx.font = `bold ${Math.round(W * 0.03)}px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#55ee88';
    ctx.fillText(_cfHealText, W / 2, Math.round(H * 0.92));
    ctx.restore();
  }

  // ── Firefly sparks floating up ────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const age   = (t * 0.5 + i * 17) % 80;
    const alpha = age < 10 ? age / 10 : Math.max(0, 1 - (age - 10) / 70);
    if (alpha <= 0) continue;
    const spark_x = logSX + 8 + ((i * 37 + Math.floor(age)) % (logW - 8));
    const spark_y = logSY - age * 0.7;
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = age < 30 ? '#FFCC44' : '#FF6600';
    ctx.fillRect(Math.round(spark_x), Math.round(spark_y), 2, 2);
    ctx.restore();
  }
}


