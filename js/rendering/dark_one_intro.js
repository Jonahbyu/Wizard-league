// ===== dark_one_intro.js =====
// ~7 second cinematic intro before the Dark One fight.
// Scene 1: Dark void with pulsing aura + title.
// Scene 2: Dark One materializes on throne, tendrils spread.
// Scene 3: Close-up of his glowing red eyes.
// Click or any key to skip.

(function () {
  'use strict';

  let _onComplete = null, _canvas = null, _ctx = null;
  let _raf = null, _startTime = 0, _done = false;
  let _particles = [];

  const T = {
    voidEnd: 2500,   // pulsing void with title
    riseEnd: 5500,   // Dark One materializes
    eyesEnd: 7000,   // close-up eyes
  };

  const W = () => _canvas.width;
  const H = () => _canvas.height;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t)  { return a + (b - a) * clamp(t, 0, 1); }
  function easeOut(t)     { t = clamp(t,0,1); return 1-(1-t)*(1-t); }
  function easeInOut(t)   { t = clamp(t,0,1); return t<.5?2*t*t:-1+(4-2*t)*t; }

  function spawnP(x, y, opts) {
    _particles.push({ x, y, vx:opts.vx||0, vy:opts.vy||-1, life:1, decay:opts.decay||0.018, size:opts.size||2, r:opts.r||200, g:opts.g||0, b:opts.b||0 });
  }

  function tickP() {
    _particles = _particles.filter(p => p.life > 0);
    for (const p of _particles) {
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      _ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${Math.max(0, p.life * 0.7)})`;
      _ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
  }

  // t progress through this line's window; returns 0-1 alpha
  function narAlpha(t, in0, in1, out0, out1) {
    if (t < in0 || t > out1) return 0;
    if (t < in1) return (t - in0) / (in1 - in0);
    if (t > out0) return 1 - (t - out0) / (out1 - out0);
    return 1;
  }

  function drawNarLine(text, alpha) {
    if (alpha <= 0) return;
    const barH = H() * 0.12;
    const bg = _ctx.createLinearGradient(0, H()-barH*1.6, 0, H());
    bg.addColorStop(0,'rgba(0,0,0,0)');
    bg.addColorStop(.35,'rgba(0,0,0,0.72)');
    bg.addColorStop(1,'rgba(0,0,0,0.92)');
    _ctx.fillStyle = bg;
    _ctx.fillRect(0, H()-barH*1.6, W(), barH*1.6);
    _ctx.save();
    _ctx.globalAlpha = alpha;
    _ctx.font = `${clamp(H()*.028, 11, 22)}px 'Cinzel',serif`;
    _ctx.textAlign = 'center';
    _ctx.fillStyle = '#c8a0ff';
    _ctx.shadowColor = 'rgba(100,0,180,0.7)';
    _ctx.shadowBlur = 12;
    _ctx.fillText(text, W()*.5, H()*.90);
    _ctx.restore();
  }

  // ── Drawing helpers (mirrors castle_cutscene.js) ───────────────────────────
  function drawThrone(cx, cy, s) {
    const ctx = _ctx;
    ctx.fillStyle = 'rgb(12,4,18)';
    ctx.fillRect(cx-22*s, cy-72*s, 44*s, 72*s);
    [-16,-8,0,8,16].forEach(ox=>{
      ctx.beginPath();
      ctx.moveTo(cx+(ox-6)*s, cy-72*s);
      ctx.lineTo(cx+ox*s,      cy-92*s);
      ctx.lineTo(cx+(ox+6)*s, cy-72*s);
      ctx.closePath(); ctx.fill();
    });
    ctx.fillRect(cx-34*s, cy-28*s, 14*s, 28*s);
    ctx.fillRect(cx+20*s, cy-28*s, 14*s, 28*s);
    ctx.fillRect(cx-24*s, cy-10*s, 48*s, 10*s);
    const tGrd = ctx.createRadialGradient(cx,cy-50*s,0,cx,cy-50*s,65*s);
    tGrd.addColorStop(0,'rgba(55,0,0,0.28)'); tGrd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = tGrd; ctx.fillRect(cx-75*s,cy-115*s,150*s,130*s);
  }

  function drawDarkOne(cx, cy, s, sec) {
    const ctx = _ctx;
    const aura = ctx.createRadialGradient(cx,cy-40*s,0,cx,cy-40*s,90*s);
    aura.addColorStop(0,'rgba(50,0,0,0.45)');
    aura.addColorStop(.55,'rgba(18,0,0,0.18)');
    aura.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = aura; ctx.fillRect(cx-100*s,cy-120*s,200*s,160*s);
    ctx.fillStyle = 'rgb(6,3,10)';
    const crownBase = cy-60*s;
    ctx.fillRect(cx-16*s, crownBase, 32*s, 7*s);
    [[-11,-20],[0,-26],[11,-20]].forEach(([ox,oy])=>{
      ctx.beginPath();
      ctx.moveTo(cx+(ox-5)*s, crownBase);
      ctx.lineTo(cx+ox*s,     crownBase+oy*s);
      ctx.lineTo(cx+(ox+5)*s, crownBase);
      ctx.closePath(); ctx.fill();
    });
    ctx.beginPath(); ctx.arc(cx, cy-50*s, 11*s, 0, Math.PI*2); ctx.fill();
    [[-4.5,-52],[4.5,-52]].forEach(([ox,oy])=>{
      const ex = cx+ox*s, ey = cy+oy*s;
      const eg = ctx.createRadialGradient(ex,ey,0,ex,ey,6*s);
      const flicker = 0.85 + 0.15*Math.sin(sec*6.2+(ox>0?1:2));
      eg.addColorStop(0,`rgba(255,40,0,${flicker})`);
      eg.addColorStop(1,'rgba(140,0,0,0)');
      ctx.fillStyle=eg; ctx.fillRect(ex-7*s,ey-7*s,14*s,14*s);
    });
    ctx.fillStyle = 'rgb(6,3,10)';
    ctx.beginPath();
    ctx.moveTo(cx-9*s,  cy-38*s); ctx.lineTo(cx-22*s, cy-12*s);
    ctx.lineTo(cx+22*s, cy-12*s); ctx.lineTo(cx+9*s,  cy-38*s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx-22*s, cy-12*s); ctx.lineTo(cx-38*s, cy+4*s);
    ctx.lineTo(cx+38*s, cy+4*s);  ctx.lineTo(cx+22*s, cy-12*s);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(cx-36*s, cy-20*s, 18*s, 7*s);
    ctx.fillRect(cx+18*s, cy-20*s, 18*s, 7*s);
    ctx.fillRect(cx-32*s, cy+2*s, 64*s, 14*s);
  }

  // ── Scene 1: Dark void with pulsing aura ──────────────────────────────────
  function sceneVoid(t, sec) {
    _ctx.fillStyle = '#000';
    _ctx.fillRect(0, 0, W(), H());

    const pulse = 0.15 + 0.12 * Math.sin(sec * 2.1);
    const fade  = easeOut(t);
    const aura  = _ctx.createRadialGradient(W()*.5, H()*.45, 0, W()*.5, H()*.45, H()*.45);
    aura.addColorStop(0, `rgba(80,0,0,${(pulse + 0.1) * fade})`);
    aura.addColorStop(.4, `rgba(35,0,0,${pulse * fade})`);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.fillStyle = aura;
    _ctx.fillRect(0, 0, W(), H());

    if (Math.random() < 0.25) {
      const px = W()*.5 + (Math.random()-.5)*W()*.4;
      spawnP(px, H()*.65, { vx:(Math.random()-.5)*1.2, vy:-Math.random()*1.5-0.5, decay:0.012, size:1.5, r:200, g:30, b:0 });
    }
    tickP();

    // Title
    if (t > 0.3) {
      const a = clamp((t - 0.3) / 0.22, 0, 1);
      _ctx.save();
      _ctx.globalAlpha = a;
      _ctx.font = `bold ${clamp(H()*.06, 18, 46)}px 'Cinzel',serif`;
      _ctx.textAlign = 'center';
      _ctx.fillStyle = '#8b0000';
      _ctx.shadowColor = 'rgba(200,0,0,0.9)';
      _ctx.shadowBlur = 28;
      _ctx.fillText('THE DARK ONE', W()*.5, H()*.44);
      _ctx.restore();
    }

    drawNarLine('The architect of the time loop.', narAlpha(t, 0.55, 0.70, 0.82, 0.96));

    // Fade in from black
    const ov = 1 - easeOut(clamp(t / 0.12, 0, 1));
    if (ov > 0) { _ctx.fillStyle = `rgba(0,0,0,${ov})`; _ctx.fillRect(0,0,W(),H()); }
  }

  // ── Scene 2: Dark One materializes on throne ──────────────────────────────
  function sceneRise(t, sec) {
    const bg = _ctx.createLinearGradient(0, 0, 0, H());
    bg.addColorStop(0, '#060008'); bg.addColorStop(.5, '#0a000f'); bg.addColorStop(1, '#040006');
    _ctx.fillStyle = bg; _ctx.fillRect(0, 0, W(), H());

    const cx = W() * .5, cy = H() * .54, ws = H() / 720;
    const appearA = easeOut(clamp(t * 1.6, 0, 1));

    // Expanding aura behind the figure
    const auraR  = lerp(H()*.18, H()*.55, easeInOut(t));
    const pulseA = (0.28 + 0.12 * Math.sin(sec * 2.8)) * appearA;
    const bigAura = _ctx.createRadialGradient(cx, cy-50*ws, 0, cx, cy-50*ws, auraR);
    bigAura.addColorStop(0, `rgba(100,0,0,${pulseA})`);
    bigAura.addColorStop(.5, `rgba(40,0,0,${pulseA*.5})`);
    bigAura.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.fillStyle = bigAura; _ctx.fillRect(0, 0, W(), H());

    // Throne then figure fade in
    _ctx.save(); _ctx.globalAlpha = clamp(t * 2.2, 0, 1);
    drawThrone(cx, cy, ws * 1.6);
    _ctx.restore();

    _ctx.save(); _ctx.globalAlpha = appearA;
    drawDarkOne(cx, cy, ws * 1.6, sec);
    _ctx.restore();

    // Dark tendrils radiating outward
    if (t > 0.18) {
      const tendA = clamp((t - 0.18) / 0.3, 0, 1) * (0.12 + 0.06 * Math.sin(sec * 3.2));
      _ctx.strokeStyle = `rgba(130,0,0,${tendA})`;
      _ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + sec * 0.18;
        const len   = H() * lerp(0.10, 0.36, easeInOut(t));
        _ctx.beginPath();
        _ctx.moveTo(cx + Math.cos(angle)*H()*.04, cy - 50*ws + Math.sin(angle)*H()*.04);
        _ctx.lineTo(cx + Math.cos(angle)*len,     cy - 50*ws + Math.sin(angle)*len);
        _ctx.stroke();
      }
    }

    if (Math.random() < 0.3) {
      spawnP(cx + (Math.random()-.5)*W()*.5, H()*.75, { vx:(Math.random()-.5)*1.5, vy:-Math.random()*2-0.5, decay:0.014, size:1.8, r:200, g:40, b:0 });
    }
    tickP();

    drawNarLine('The source of all suffering.', narAlpha(t, 0.52, 0.68, 0.84, 0.97));

    const ov = 1 - easeOut(clamp(t / 0.10, 0, 1));
    if (ov > 0) { _ctx.fillStyle = `rgba(0,0,0,${ov})`; _ctx.fillRect(0,0,W(),H()); }
  }

  // ── Scene 3: Close-up glowing red eyes ────────────────────────────────────
  function sceneEyes(t, sec) {
    _ctx.fillStyle = '#000';
    _ctx.fillRect(0, 0, W(), H());

    const appear  = easeOut(clamp(t / 0.25, 0, 1));
    const eyeSep  = W() * 0.10;
    const eyeY    = H() * 0.44;
    const eyeSize = H() * 0.075 * (1 + 0.05 * Math.sin(sec * 4.1));
    const flicker = 0.88 + 0.12 * Math.sin(sec * 5.5);

    [-1, 1].forEach(side => {
      const ex = W()*.5 + side * eyeSep;
      const eg = _ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, eyeSize * 2.6);
      eg.addColorStop(0, `rgba(255,60,0,${flicker * appear})`);
      eg.addColorStop(.3, `rgba(200,10,0,${0.7 * flicker * appear})`);
      eg.addColorStop(1, 'rgba(0,0,0,0)');
      _ctx.fillStyle = eg;
      _ctx.fillRect(ex - eyeSize*3, eyeY - eyeSize*3, eyeSize*6, eyeSize*6);
    });

    // Ambient glow between the eyes
    const midAura = _ctx.createRadialGradient(W()*.5, eyeY, 0, W()*.5, eyeY, H()*.28);
    midAura.addColorStop(0, `rgba(55,0,0,${0.3 * appear})`);
    midAura.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.fillStyle = midAura; _ctx.fillRect(0, 0, W(), H());

    if (Math.random() < 0.22) {
      spawnP(W()*.5 + (Math.random()-.5)*W()*.55, H()*.82, { vx:(Math.random()-.5)*1, vy:-Math.random()*1.8, decay:0.016, size:1.4, r:220, g:20, b:0 });
    }
    tickP();

    drawNarLine('He has been waiting.', narAlpha(t, 0.10, 0.28, 0.62, 0.82));

    // Fade out to black at end
    if (t > 0.80) {
      const fadeOut = (t - 0.80) / 0.20;
      _ctx.fillStyle = `rgba(0,0,0,${fadeOut})`;
      _ctx.fillRect(0, 0, W(), H());
    }
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  function tick(ts) {
    if (_done) return;
    const el = ts - _startTime, sec = el / 1000;
    _ctx.clearRect(0, 0, W(), H());

    if      (el < T.voidEnd)  sceneVoid ((el)               / T.voidEnd,                sec);
    else if (el < T.riseEnd)  sceneRise ((el - T.voidEnd)   / (T.riseEnd - T.voidEnd),  sec);
    else if (el < T.eyesEnd)  sceneEyes ((el - T.riseEnd)   / (T.eyesEnd - T.riseEnd),  sec);
    else { endIntro(); return; }

    _raf = requestAnimationFrame(tick);
  }

  function endIntro() {
    if (_done) return;
    _done = true; cancelAnimationFrame(_raf); _particles = [];
    const screen = document.getElementById('cutscene-screen');
    if (screen) {
      screen.style.transition = 'opacity 0.5s';
      screen.style.opacity = '0';
      setTimeout(() => {
        screen.style.display = 'none';
        screen.style.opacity = '1';
        screen.style.transition = '';
        if (_onComplete) _onComplete();
      }, 500);
    } else {
      if (_onComplete) _onComplete();
    }
  }

  window.playDarkOneIntro = function(onComplete) {
    _onComplete = onComplete; _done = false; _particles = [];
    const screen = document.getElementById('cutscene-screen');
    if (!screen) { onComplete && onComplete(); return; }
    screen.style.display = 'flex';
    screen.style.opacity = '1';
    screen.style.transition = '';
    _canvas = document.getElementById('cutscene-canvas');
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    _ctx = _canvas.getContext('2d');
    screen.addEventListener('click', () => endIntro(), { once: true });
    document.addEventListener('keydown', () => endIntro(), { once: true });
    _startTime = performance.now();
    _raf = requestAnimationFrame(tick);
  };
})();
