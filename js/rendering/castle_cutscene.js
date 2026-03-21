// ===== castle_cutscene.js =====
// Throne room intro — plays on first run, chained after the opening cutscene.
// Scenes: castle exterior → great hall → Dark One on throne →
//         pan across 8 elemental wizards → dispatch → our wizard ejected.
// Click or any key to skip.

(function () {
  'use strict';

  let _onComplete = null, _canvas = null, _ctx = null;
  let _raf = null, _startTime = 0, _particles = [], _done = false;

  // ── Timeline (ms) ─────────────────────────────────────────────────────────
  const T = {
    exteriorEnd:  11000,   // castle at night, wizard approaches gate
    hallEnd:      22000,   // interior hall, crowd gathered in silence
    throneEnd:    36000,   // Dark One on his throne, speaks the rules
    panEnd:       50000,   // pan across 8 elemental wizards lined up
    dispatchEnd:  59000,   // Dark One waves — they all march out
    ejectEnd:     70000,   // our wizard tumbles out the door
    totalEnd:     72500,
  };

  const W = () => _canvas.width;
  const H = () => _canvas.height;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t)  { return a + (b - a) * clamp(t, 0, 1); }
  function easeOut(t)     { t = clamp(t,0,1); return 1-(1-t)*(1-t); }
  function easeInOut(t)   { t = clamp(t,0,1); return t<.5?2*t*t:-1+(4-2*t)*t; }
  function fadeCurve(t, inD, outS) {
    if (t < inD)  return t / inD;
    if (t > outS) return 1 - (t - outS) / (1 - outS);
    return 1;
  }

  // ── Narration ──────────────────────────────────────────────────────────────
  const NAR = {
    exterior: [
      { t0:.10, t1:.46, text:'He followed the crowd through the gates of the great castle at the heart of The Veil.' },
      { t0:.56, t1:.92, text:'Everyone here was a competitor.  Not one of them remembered choosing to arrive.' },
    ],
    hall: [
      { t0:.10, t1:.44, text:'Inside, the hall stretched into darkness.  Stone walls.  Cold torchlight.  Silence.' },
      { t0:.54, t1:.90, text:'Row upon row of wizards, every element represented.  All of them waiting for the same thing.' },
    ],
    throne: [
      { t0:.08, t1:.36, text:'At the far end, on a throne carved from shadow, sat the one who owned this world.' },
      { t0:.44, t1:.68, text:'He had the look of a man who had never lost.  That was not luck.' },
      { t0:.76, t1:.95, text:'He built the loop.  He ran the tournament.  He kept both going by design.' },
    ],
    pan: [
      { t0:.08, t1:.44, text:'Eight elements.  Eight gatekeepers.  Eight chances to prove you belonged here.' },
      { t0:.55, t1:.90, text:'They were not obstacles.  They were the whole point.' },
    ],
    dispatch: [
      { t0:.08, t1:.44, text:'The rules were announced once, without ceremony, without mercy.' },
      { t0:.54, t1:.90, text:'Return with three badges.  Only then may you stand before the throne.' },
    ],
    eject: [
      { t0:.08, t1:.44, text:'Our wizard had barely gotten a look at the place before he was removed.' },
      { t0:.54, t1:.88, text:'He had not yet earned his right to enter.  That was about to change.' },
    ],
  };

  function drawNarration(lines, t) {
    for (const l of lines) {
      if (t >= l.t0 && t <= l.t1) {
        const mid  = (l.t0 + l.t1) * 0.5;
        const fade = t < mid
          ? clamp((t - l.t0) / 0.06, 0, 1)
          : clamp((l.t1 - t) / 0.06, 0, 1);
        const barH = H() * 0.115;
        const bg = _ctx.createLinearGradient(0, H()-barH*1.6, 0, H());
        bg.addColorStop(0,'rgba(0,0,0,0)');
        bg.addColorStop(.35,'rgba(0,0,0,0.72)');
        bg.addColorStop(1,'rgba(0,0,0,0.92)');
        _ctx.fillStyle = bg;
        _ctx.fillRect(0, H()-barH*1.6, W(), barH*1.6);
        _ctx.save();
        _ctx.globalAlpha = fade;
        _ctx.font = `italic ${clamp(H()*.027,11,22)}px 'Cinzel',serif`;
        _ctx.textAlign = 'center'; _ctx.textBaseline = 'alphabetic';
        _ctx.shadowColor = 'rgba(0,0,0,0.9)'; _ctx.shadowBlur = 8;
        _ctx.fillStyle = '#c8b890';
        _ctx.fillText(l.text, W()*.5, H()*.96);
        _ctx.restore();
        break;
      }
    }
  }

  function drawBars(alpha) {
    const bh = H() * 0.075;
    _ctx.save(); _ctx.globalAlpha = alpha;
    _ctx.fillStyle = '#000';
    _ctx.fillRect(0, 0, W(), bh);
    _ctx.fillRect(0, H()-bh, W(), bh);
    _ctx.restore();
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  function spawnP(x, y, o) {
    _particles.push({
      x, y,
      vx: o.vx!==undefined?o.vx:(Math.random()-.5)*2,
      vy: o.vy!==undefined?o.vy:-Math.random()*1.4,
      life:1, decay:o.decay||.013, size:o.size||(Math.random()*2+1),
      r:o.r||220, g:o.g||90, b:o.b||20,
    });
  }
  function tickP() {
    _particles = _particles.filter(p=>p.life>0);
    _particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
      _ctx.save(); _ctx.globalAlpha=p.life*.75;
      _ctx.fillStyle=`rgb(${p.r},${p.g},${p.b})`;
      _ctx.beginPath(); _ctx.arc(p.x,p.y,p.size,0,Math.PI*2); _ctx.fill();
      _ctx.restore();
    });
  }

  // ── Night sky (for exterior) ───────────────────────────────────────────────
  function drawNightSky() {
    const sky = _ctx.createLinearGradient(0,0,0,H());
    sky.addColorStop(0,'#030208'); sky.addColorStop(.65,'#060412'); sky.addColorStop(1,'#0a0618');
    _ctx.fillStyle = sky; _ctx.fillRect(0,0,W(),H());
    for (let i=0; i<55; i++) {
      const sx=(i*211.3+41)%W(), sy=(i*127.1+19)%(H()*.55);
      _ctx.fillStyle=`rgba(200,185,220,${0.25+0.2*Math.sin(i*1.4)})`;
      _ctx.fillRect(sx,sy,1.5,1.5);
    }
  }

  // ── Castle exterior (matching opening cutscene style) ─────────────────────
  function drawCastle(cx, cy, s, alpha) {
    _ctx.save(); _ctx.globalAlpha = alpha;
    _ctx.fillStyle='rgb(4,2,10)';
    _ctx.fillRect(cx-92*s,cy-62*s,184*s,62*s);
    _ctx.fillRect(cx-122*s,cy-42*s,42*s,42*s); _ctx.fillRect(cx+80*s,cy-42*s,42*s,42*s);
    _ctx.fillRect(cx-104*s,cy-108*s,32*s,68*s); _ctx.fillRect(cx+72*s,cy-108*s,32*s,68*s);
    _ctx.fillRect(cx-24*s,cy-82*s,48*s,82*s);
    _ctx.beginPath();
    _ctx.moveTo(cx-22*s,cy-82*s); _ctx.lineTo(cx,cy-158*s); _ctx.lineTo(cx+22*s,cy-82*s);
    _ctx.fill();
    [[cx-88*s,cy-108*s],[cx+88*s,cy-108*s]].forEach(([tx,ty])=>{
      _ctx.beginPath();
      _ctx.moveTo(tx-16*s,ty); _ctx.lineTo(tx,ty-38*s); _ctx.lineTo(tx+16*s,ty);
      _ctx.fill();
    });
    for (let i=0;i<8;i++) _ctx.fillRect(cx-88*s+i*24*s,cy-72*s,13*s,12*s);
    _ctx.restore();
  }

  // ── Torch sconce ─────────────────────────────────────────────────────────
  function drawTorch(x, y, sec, idx) {
    const f = 0.72 + 0.28*Math.sin(sec*7.1+idx*2.3);
    // Sconce bracket
    _ctx.fillStyle = '#1c0e06';
    _ctx.fillRect(x-3, y, 6, 14);
    _ctx.fillRect(x-6, y+12, 12, 4);
    // Glow
    const grd = _ctx.createRadialGradient(x, y, 0, x, y, 32*f);
    grd.addColorStop(0,`rgba(255,145,20,${0.55*f})`);
    grd.addColorStop(.45,`rgba(200,65,8,${0.22*f})`);
    grd.addColorStop(1,'rgba(160,30,0,0)');
    _ctx.fillStyle = grd; _ctx.fillRect(x-34,y-34,68,68);
    // Flame
    _ctx.fillStyle = `rgba(255,190,60,${f*.9})`;
    _ctx.beginPath(); _ctx.ellipse(x, y-7, 4, 9*f, 0, 0, Math.PI*2); _ctx.fill();
  }

  // ── Throne room background ─────────────────────────────────────────────────
  // One-point perspective hall. vp = vanishing point.
  function drawHall(sec) {
    const ctx = _ctx;
    const vpX = W()*.5, vpY = H()*.22;

    // Stone background
    const bg = ctx.createLinearGradient(0,0,0,H());
    bg.addColorStop(0,'#08051a'); bg.addColorStop(.5,'#0d0924'); bg.addColorStop(1,'#060412');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W(),H());

    // Ceiling vaulting lines
    ctx.strokeStyle='rgba(28,18,50,0.55)'; ctx.lineWidth=1;
    for (let i=0;i<10;i++) {
      const fx = W()*(i/9);
      ctx.beginPath();
      ctx.moveTo(lerp(vpX,fx,.04), lerp(vpY,H()*.04,.04));
      ctx.lineTo(fx, 0);
      ctx.stroke();
    }

    // Floor perspective tiles
    ctx.strokeStyle='rgba(30,20,55,0.5)'; ctx.lineWidth=.8;
    // Longitudinal lines
    for (let i=0;i<14;i++) {
      const fx = W()*(i/13);
      ctx.beginPath();
      ctx.moveTo(lerp(vpX,fx,.06), lerp(vpY,H(),.06));
      ctx.lineTo(fx, H());
      ctx.stroke();
    }
    // Lateral lines
    for (let i=1;i<10;i++) {
      const fy = lerp(vpY, H(), i/10);
      const spread = lerp(0.03, 0.5, i/10);
      ctx.beginPath();
      ctx.moveTo(vpX - W()*spread, fy); ctx.lineTo(vpX + W()*spread, fy);
      ctx.stroke();
    }

    // Dark side walls
    ctx.fillStyle = '#06040f';
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(W()*.18, vpY); ctx.lineTo(W()*.18, H()); ctx.lineTo(0,H());
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W(),0); ctx.lineTo(W()*.82, vpY); ctx.lineTo(W()*.82, H()); ctx.lineTo(W(),H());
    ctx.closePath(); ctx.fill();

    // Wall stone lines (left)
    ctx.strokeStyle='rgba(18,12,32,0.7)'; ctx.lineWidth=.7;
    for (let r=0;r<10;r++) {
      const ry = H()*(r/10);
      ctx.beginPath(); ctx.moveTo(0,ry); ctx.lineTo(W()*.18,ry); ctx.stroke();
    }
    // Wall stone lines (right)
    for (let r=0;r<10;r++) {
      const ry = H()*(r/10);
      ctx.beginPath(); ctx.moveTo(W()*.82,ry); ctx.lineTo(W(),ry); ctx.stroke();
    }

    // Pillars (left side, 3 pairs shrinking to vanishing point)
    const pillarPositions = [[.18,.90],[.22,.65],[.26,.45]];
    pillarPositions.forEach(([px,py],i)=>{
      const pw = lerp(32,10, i/2);
      const ph = H()*(py - vpY/H());
      ctx.fillStyle='#0a0818';
      ctx.fillRect(W()*px - pw/2, H()*vpY/H() + (H()-H()*vpY/H())*(1-py/1), pw, H()*py);
      // highlight edge
      ctx.fillStyle='rgba(35,22,60,0.25)';
      ctx.fillRect(W()*px - pw/2, H()*vpY/H() + (H()-H()*vpY/H())*(1-py/1), pw*.18, H()*py);
    });
    // Mirror on right
    pillarPositions.forEach(([px,py],i)=>{
      const pw = lerp(32,10, i/2);
      ctx.fillStyle='#0a0818';
      ctx.fillRect(W()*(1-px) - pw/2, H()*vpY/H() + (H()-H()*vpY/H())*(1-py/1), pw, H()*py);
    });

    // Torches along walls
    const torchPairs = [[W()*.10, H()*.38],[W()*.14, H()*.52],[W()*.90, H()*.38],[W()*.86, H()*.52]];
    torchPairs.forEach(([tx,ty],i) => {
      drawTorch(tx, ty, sec, i);
      if (Math.random()<.04) spawnP(tx, ty-8, {vx:(Math.random()-.5)*.6, vy:-Math.random()*.8, decay:.03, size:1.2, r:240,g:140,b:30});
    });

    // Raised dais at back
    const daisW = W()*.24, daisH = H()*.055;
    const daisX = W()*.5 - daisW*.5;
    const daisY = H()*.29;
    ctx.fillStyle='#0c0920';
    ctx.fillRect(daisX, daisY, daisW, daisH);
    ctx.fillStyle='#100e28';
    ctx.fillRect(daisX - W()*.03, daisY+daisH, daisW+W()*.06, H()*.022);
    ctx.fillStyle='#0f0c25';
    ctx.fillRect(daisX - W()*.055, daisY+daisH+H()*.022, daisW+W()*.11, H()*.022);

    // Ambient dark vignette
    const vig = ctx.createRadialGradient(W()*.5,H()*.5,H()*.2,W()*.5,H()*.5,H());
    vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle=vig; ctx.fillRect(0,0,W(),H());
  }

  // ── Dark One throne ────────────────────────────────────────────────────────
  function drawThrone(cx, cy, s) {
    const ctx = _ctx;
    ctx.fillStyle = '#08050f';
    // High throne back
    ctx.fillRect(cx-22*s, cy-72*s, 44*s, 72*s);
    // Throne crown spikes (5 pointed tips along the top)
    [-16,-8,0,8,16].forEach(ox=>{
      ctx.beginPath();
      ctx.moveTo(cx+(ox-6)*s, cy-72*s);
      ctx.lineTo(cx+ox*s,      cy-92*s);
      ctx.lineTo(cx+(ox+6)*s, cy-72*s);
      ctx.closePath(); ctx.fill();
    });
    // Armrests
    ctx.fillRect(cx-34*s, cy-28*s, 14*s, 28*s);
    ctx.fillRect(cx+20*s, cy-28*s, 14*s, 28*s);
    // Seat platform
    ctx.fillRect(cx-24*s, cy-10*s, 48*s, 10*s);
    // Throne glow (dark red)
    const tGrd = ctx.createRadialGradient(cx,cy-50*s,0,cx,cy-50*s,65*s);
    tGrd.addColorStop(0,'rgba(55,0,0,0.28)'); tGrd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = tGrd; ctx.fillRect(cx-75*s,cy-115*s,150*s,130*s);
  }

  // ── Dark One silhouette (seated on throne) ─────────────────────────────────
  function drawDarkOne(cx, cy, s, sec) {
    const ctx = _ctx;

    // Shadow aura
    const aura = ctx.createRadialGradient(cx,cy-40*s,0,cx,cy-40*s,90*s);
    aura.addColorStop(0,'rgba(50,0,0,0.45)');
    aura.addColorStop(.55,'rgba(18,0,0,0.18)');
    aura.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = aura; ctx.fillRect(cx-100*s,cy-120*s,200*s,160*s);

    ctx.fillStyle = 'rgb(6,3,10)';

    // Crown (3 pointed prongs + band)
    const crownBase = cy-60*s;
    ctx.fillRect(cx-16*s, crownBase, 32*s, 7*s); // band
    [[-11,-20],[0,-26],[11,-20]].forEach(([ox,oy])=>{
      ctx.beginPath();
      ctx.moveTo(cx+(ox-5)*s, crownBase);
      ctx.lineTo(cx+ox*s,     crownBase+oy*s);
      ctx.lineTo(cx+(ox+5)*s, crownBase);
      ctx.closePath(); ctx.fill();
    });

    // Head
    ctx.beginPath(); ctx.arc(cx, cy-50*s, 11*s, 0, Math.PI*2); ctx.fill();

    // Red eyes (glowing)
    [[-4.5, -52],[4.5, -52]].forEach(([ox,oy])=>{
      const ex = cx+ox*s, ey = cy+oy*s;
      const eg = ctx.createRadialGradient(ex,ey,0,ex,ey,6*s);
      const flicker = 0.85 + 0.15*Math.sin(sec*6.2+(ox>0?1:2));
      eg.addColorStop(0,`rgba(255,40,0,${flicker})`);
      eg.addColorStop(1,'rgba(140,0,0,0)');
      ctx.fillStyle=eg; ctx.fillRect(ex-7*s,ey-7*s,14*s,14*s);
    });

    ctx.fillStyle = 'rgb(6,3,10)';

    // Torso (seated, compact)
    ctx.beginPath();
    ctx.moveTo(cx-9*s,  cy-38*s);
    ctx.lineTo(cx-22*s, cy-12*s);
    ctx.lineTo(cx+22*s, cy-12*s);
    ctx.lineTo(cx+9*s,  cy-38*s);
    ctx.closePath(); ctx.fill();

    // Wide robes fanning out on seat
    ctx.beginPath();
    ctx.moveTo(cx-22*s, cy-12*s);
    ctx.lineTo(cx-38*s, cy+4*s);
    ctx.lineTo(cx+38*s, cy+4*s);
    ctx.lineTo(cx+22*s, cy-12*s);
    ctx.closePath(); ctx.fill();

    // Arms resting on throne armrests
    ctx.fillRect(cx-36*s, cy-20*s, 18*s, 7*s);
    ctx.fillRect(cx+18*s, cy-20*s, 18*s, 7*s);

    // Lower robe drape
    ctx.fillRect(cx-32*s, cy+2*s, 64*s, 14*s);
  }

  // ── Wizard silhouette (generic, for crowd) ─────────────────────────────────
  function drawWizard(cx, cy, s) {
    const ctx = _ctx; ctx.fillStyle = 'rgb(7,4,12)';
    // Hat
    ctx.beginPath();
    ctx.moveTo(cx, cy-82*s); ctx.lineTo(cx-13*s, cy-45*s); ctx.lineTo(cx+13*s, cy-45*s);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(cx-16*s, cy-47*s, 32*s, 4*s);
    // Head
    ctx.beginPath(); ctx.arc(cx, cy-38*s, 9*s, 0, Math.PI*2); ctx.fill();
    // Body
    ctx.beginPath();
    ctx.moveTo(cx-8*s, cy-30*s); ctx.lineTo(cx-18*s, cy-2*s);
    ctx.lineTo(cx+18*s, cy-2*s); ctx.lineTo(cx+8*s, cy-30*s);
    ctx.closePath(); ctx.fill();
    // Boots
    ctx.fillRect(cx-13*s, cy-4*s, 10*s, 5*s);
    ctx.fillRect(cx+3*s,  cy-4*s, 10*s, 5*s);
  }

  // ── Our wizard silhouette (with staff) ────────────────────────────────────
  function drawOurWizard(cx, cy, s) {
    const ctx = _ctx; ctx.fillStyle = 'rgb(7,4,12)';
    // Staff
    ctx.fillRect(cx-20*s, cy-95*s, 3*s, 95*s);
    // Hat
    ctx.beginPath();
    ctx.moveTo(cx+2*s, cy-95*s); ctx.lineTo(cx-12*s, cy-50*s); ctx.lineTo(cx+15*s, cy-50*s);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(cx-16*s, cy-52*s, 30*s, 4*s);
    // Head
    ctx.beginPath(); ctx.arc(cx+2*s, cy-42*s, 9*s, 0, Math.PI*2); ctx.fill();
    // Body
    ctx.beginPath();
    ctx.moveTo(cx-6*s, cy-34*s); ctx.lineTo(cx-16*s, cy-5*s);
    ctx.lineTo(cx+18*s, cy-5*s); ctx.lineTo(cx+10*s, cy-34*s);
    ctx.closePath(); ctx.fill();
    // Boots
    ctx.fillRect(cx-12*s, cy-6*s, 10*s, 5*s);
    ctx.fillRect(cx+4*s,  cy-6*s, 10*s, 5*s);
    // Staff tip glow
    const sg = ctx.createRadialGradient(cx-19*s,cy-97*s,0,cx-19*s,cy-97*s,9*s);
    sg.addColorStop(0,'rgba(185,110,255,.85)'); sg.addColorStop(1,'rgba(90,40,190,0)');
    ctx.fillStyle=sg; ctx.fillRect(cx-28*s,cy-106*s,18*s,18*s);
  }

  // ── Element colors for wizard pan ─────────────────────────────────────────
  const EL = [
    { name:'Fire',      r:255,  g:55,   b:0   },
    { name:'Ice',       r:105,  g:205,  b:255 },
    { name:'Lightning', r:255,  g:220,  b:0   },
    { name:'Earth',     r:115,  g:75,   b:28  },
    { name:'Water',     r:0,    g:105,  b:255 },
    { name:'Nature',    r:38,   g:175,  b:58  },
    { name:'Plasma',    r:155,  g:55,   b:255 },
    { name:'Air',       r:175,  g:220,  b:255 },
  ];

  function drawElementWizard(cx, cy, s, el, sec, idx) {
    const ctx = _ctx;
    const pulse = 0.14 + 0.05*Math.sin(sec*1.4 + idx*0.9);
    // Elemental aura
    const aura = ctx.createRadialGradient(cx,cy-40*s,0,cx,cy-40*s,55*s);
    aura.addColorStop(0,`rgba(${el.r},${el.g},${el.b},${pulse})`);
    aura.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = aura; ctx.fillRect(cx-65*s,cy-90*s,130*s,110*s);
    // Wizard body
    drawWizard(cx, cy, s);
    // Small colored dot above hat (element indicator)
    ctx.fillStyle = `rgba(${el.r},${el.g},${el.b},0.65)`;
    ctx.beginPath(); ctx.arc(cx, cy-90*s, 4*s, 0, Math.PI*2); ctx.fill();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Scene 1: Castle Exterior ───────────────────────────────────────────────
  function sceneExterior(t, sec) {
    drawNightSky();

    // Moon
    const mx=W()*.72, my=H()*.15, mr=H()*.048;
    const mg=_ctx.createRadialGradient(mx,my,0,mx,my,mr*4);
    mg.addColorStop(0,'rgba(165,155,205,.18)'); mg.addColorStop(1,'rgba(0,0,0,0)');
    _ctx.fillStyle=mg; _ctx.fillRect(mx-mr*4,my-mr*4,mr*8,mr*8);
    _ctx.fillStyle='rgb(178,170,205)';
    _ctx.beginPath(); _ctx.arc(mx,my,mr,0,Math.PI*2); _ctx.fill();

    const gY = H()*.72;
    _ctx.fillStyle='rgb(4,3,9)'; _ctx.fillRect(0,gY,W(),H()-gY);

    // Ground mist
    const mist=_ctx.createLinearGradient(0,gY-H()*.06,0,gY+H()*.08);
    mist.addColorStop(0,'rgba(12,6,28,0)'); mist.addColorStop(1,'rgba(12,6,28,.78)');
    _ctx.fillStyle=mist; _ctx.fillRect(0,gY-H()*.06,W(),H()*.14);

    // Castle — zooms in slightly as we approach
    const zoom = lerp(0.55, 0.75, easeOut(t));
    drawCastle(W()*.5, gY, zoom, Math.min(1, t*2));

    // Castle window lights
    _ctx.save(); _ctx.globalAlpha = Math.min(1,t*2) * (0.55 + 0.18*Math.sin(sec*3.2));
    _ctx.fillStyle = 'rgba(255,165,40,0.35)';
    [-28,0,28].forEach(ox=>{
      _ctx.beginPath(); _ctx.arc(W()*.5+ox*zoom, gY-55*zoom, 5*zoom, 0, Math.PI*2); _ctx.fill();
    });
    _ctx.restore();

    // Our wizard walking toward castle
    const walkX = lerp(-40, W()*.38, easeInOut(clamp(t/.85,0,1)));
    const bob = Math.sin(sec*3.6)*2.5;
    drawOurWizard(walkX, gY + H()*.06 + bob, H()/640);

    drawBars(1);
    drawNarration(NAR.exterior, t);
    const ov = 1-fadeCurve(t,.10,.88); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 2: Great Hall Interior ───────────────────────────────────────────
  function sceneHall(t, sec) {
    drawHall(sec);

    // Crowd of wizards in two rows on either side, fading in
    const crowdAlpha = Math.min(1, t*1.8);
    const ws = H()/720;
    const floorY = H()*.82;
    _ctx.save(); _ctx.globalAlpha = crowdAlpha;

    // Left row (4 wizards)
    [.16,.22,.28,.34].forEach((fx,i)=>{
      drawWizard(W()*fx, floorY, ws * lerp(.65,.80,i/3));
    });
    // Right row (4 wizards)
    [.84,.78,.72,.66].forEach((fx,i)=>{
      drawWizard(W()*fx, floorY, ws * lerp(.65,.80,i/3));
    });
    _ctx.restore();

    // Camera slow drift forward (subtle zoom)
    const zoom = 1 + easeInOut(t)*.06;
    _ctx.save();
    _ctx.translate(W()*.5*(1-zoom), H()*.5*(1-zoom));
    _ctx.scale(zoom, zoom);

    // Our wizard in the entrance (back of frame → moves forward)
    const enterT = easeOut(clamp(t*1.4,0,1));
    const charX  = lerp(W()*.5, W()*.5, enterT); // centred
    const charY  = lerp(H()*.50, H()*.78, enterT);
    _ctx.save(); _ctx.globalAlpha = Math.min(1, t*2.2);
    drawOurWizard(charX, charY, ws * lerp(.6, .85, enterT));
    _ctx.restore();

    _ctx.restore(); // un-zoom

    tickP();
    drawBars(1);
    drawNarration(NAR.hall, t);
    const ov = 1-fadeCurve(t,.08,.90); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 3: The Throne — Dark One speaks ──────────────────────────────────
  function sceneThrone(t, sec) {
    drawHall(sec);

    const ws = H()/720;
    const cx = W()*.5, daisY = H()*.36;

    // Throne
    drawThrone(cx, daisY, ws*1.6);

    // Dark One (fades in slowly)
    _ctx.save(); _ctx.globalAlpha = Math.min(1, t*1.4);
    drawDarkOne(cx, daisY, ws*1.6, sec);
    _ctx.restore();

    // Dark energy tendrils / aura pulses
    if (t > .15) {
      const pulseA = (.20 + .12*Math.sin(sec*2.8)) * Math.min(1,(t-.15)/.25);
      const tGrd = _ctx.createRadialGradient(cx, daisY-50*ws, 0, cx, daisY-50*ws, H()*.38);
      tGrd.addColorStop(0,`rgba(80,0,0,${pulseA})`);
      tGrd.addColorStop(.5,`rgba(25,0,0,${pulseA*.4})`);
      tGrd.addColorStop(1,'rgba(0,0,0,0)');
      _ctx.fillStyle=tGrd; _ctx.fillRect(0,0,W(),H());
    }

    // Crowd silhouettes in the foreground (bottom)
    _ctx.save(); _ctx.globalAlpha = 0.55;
    const fgS = ws*0.9;
    [-3,-2,-1,0,1,2,3].forEach((i)=>{
      drawWizard(W()*.5 + i*W()*.11, H()*.96, fgS);
    });
    _ctx.restore();

    tickP();
    drawBars(1);
    drawNarration(NAR.throne, t);
    const ov = 1-fadeCurve(t,.06,.90); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 4: Pan Across Elemental Wizards ─────────────────────────────────
  function scenePan(t, sec) {
    // World is 3x screen wide; camera pans left→right
    const worldW = W() * 3.0;
    const panX   = easeInOut(t) * (worldW - W());
    const floorY = H()*.80;
    const ws     = H()/680;
    const spacing = worldW / (EL.length + 1);

    _ctx.save();
    _ctx.translate(-panX, 0);

    // Sky/background (wider)
    const bg = _ctx.createLinearGradient(0,0,0,H());
    bg.addColorStop(0,'#08051a'); bg.addColorStop(.5,'#0d0924'); bg.addColorStop(1,'#060412');
    _ctx.fillStyle=bg; _ctx.fillRect(0,0,worldW,H());

    // Floor
    _ctx.fillStyle='#060412'; _ctx.fillRect(0,floorY,worldW,H()-floorY);
    _ctx.strokeStyle='rgba(28,18,50,0.4)'; _ctx.lineWidth=.7;
    for (let i=0; i<20; i++) {
      _ctx.beginPath(); _ctx.moveTo(worldW*(i/19),floorY); _ctx.lineTo(worldW*(i/19),H()); _ctx.stroke();
    }
    for (let r=1; r<5; r++) {
      _ctx.beginPath(); _ctx.moveTo(0,lerp(floorY,H(),r/5)); _ctx.lineTo(worldW,lerp(floorY,H(),r/5)); _ctx.stroke();
    }

    // 8 elemental wizards
    EL.forEach((el, i) => {
      const ex = spacing * (i + 1);
      drawElementWizard(ex, floorY, ws, el, sec, i);
      // Name label below
      _ctx.save();
      _ctx.font = `${clamp(H()*.022,9,16)}px 'Cinzel',serif`;
      _ctx.textAlign='center'; _ctx.fillStyle=`rgba(${el.r},${el.g},${el.b},0.45)`;
      _ctx.fillText(el.name, ex, floorY + 18*ws);
      _ctx.restore();
    });

    _ctx.restore();

    // Vignette edges
    const vigL=_ctx.createLinearGradient(0,0,W()*.18,0);
    vigL.addColorStop(0,'rgba(0,0,0,0.75)'); vigL.addColorStop(1,'rgba(0,0,0,0)');
    _ctx.fillStyle=vigL; _ctx.fillRect(0,0,W()*.18,H());
    const vigR=_ctx.createLinearGradient(W()*.82,0,W(),0);
    vigR.addColorStop(0,'rgba(0,0,0,0)'); vigR.addColorStop(1,'rgba(0,0,0,0.75)');
    _ctx.fillStyle=vigR; _ctx.fillRect(W()*.82,0,W()*.18,H());

    drawBars(1);
    drawNarration(NAR.pan, t);
    const ov=1-fadeCurve(t,.06,.90); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 5: Dark One Dispatches ──────────────────────────────────────────
  function sceneDispatch(t, sec) {
    drawHall(sec);

    const ws = H()/720;
    const cx = W()*.5, daisY = H()*.36;

    drawThrone(cx, daisY, ws*1.6);
    drawDarkOne(cx, daisY, ws*1.6, sec);

    // Crowd of wizards starting to move/disperse
    const moveT = easeInOut(clamp((t-.35)/.55, 0, 1));
    _ctx.save(); _ctx.globalAlpha = Math.max(0, 1 - moveT*.8);
    const floorY = H()*.82;
    [-3,-2,-1,1,2,3].forEach((i,idx)=>{
      const drift = moveT * W() * (i<0?-0.22:0.22) * (0.6 + idx*.08);
      drawWizard(W()*.5 + i*W()*.10 + drift, floorY, ws*.82);
    });
    _ctx.restore();

    // Dark One's hand gesture — arm extending outward (t > .3)
    if (t > .25) {
      const gestA = Math.min(1,(t-.25)/.20);
      _ctx.save(); _ctx.globalAlpha = gestA;
      _ctx.strokeStyle='rgba(120,20,20,0.55)'; _ctx.lineWidth=3*ws;
      _ctx.beginPath();
      _ctx.moveTo(cx+22*ws*1.6, daisY-18*ws*1.6);
      _ctx.lineTo(cx+22*ws*1.6 + 35*ws*gestA, daisY-16*ws*1.6);
      _ctx.stroke();
      _ctx.restore();
    }

    // Dark energy pulse when dispatching
    if (t>.28) {
      const pa = (.15+.10*Math.sin(sec*4.5))*Math.min(1,(t-.28)/.18);
      const pg=_ctx.createRadialGradient(cx,daisY-40*ws,0,cx,daisY-40*ws,H()*.3);
      pg.addColorStop(0,`rgba(60,0,0,${pa})`); pg.addColorStop(1,'rgba(0,0,0,0)');
      _ctx.fillStyle=pg; _ctx.fillRect(0,0,W(),H());
    }

    tickP();
    drawBars(1);
    drawNarration(NAR.dispatch, t);
    const ov=1-fadeCurve(t,.06,.88); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 6: Our Wizard Ejected ───────────────────────────────────────────
  function sceneEject(t, sec) {
    drawNightSky();

    const gY = H()*.72;
    _ctx.fillStyle='rgb(4,3,9)'; _ctx.fillRect(0,gY,W(),H()-gY);
    const mist=_ctx.createLinearGradient(0,gY-H()*.05,0,gY+H()*.08);
    mist.addColorStop(0,'rgba(12,6,28,0)'); mist.addColorStop(1,'rgba(12,6,28,.75)');
    _ctx.fillStyle=mist; _ctx.fillRect(0,gY-H()*.05,W(),H()*.13);

    // Castle
    drawCastle(W()*.5, gY, 0.72, 1);

    // Castle gate/door opening then closing
    const doorOpen  = clamp(t/.18, 0, 1);
    const doorClose = easeInOut(clamp((t-.38)/.35, 0, 1));
    const doorW = W()*.055, doorH = H()*.072;
    const doorX = W()*.5 - doorW*.5, doorY = gY - doorH;

    // Door gap (light spills out when open)
    if (doorOpen > 0) {
      const openW = doorW * doorOpen * Math.max(0, 1 - doorClose*.95);
      const hallLight=_ctx.createRadialGradient(W()*.5, gY, 0, W()*.5, gY, H()*.12);
      hallLight.addColorStop(0,`rgba(90,50,20,${0.35*doorOpen*(1-doorClose*.9)})`);
      hallLight.addColorStop(1,'rgba(0,0,0,0)');
      _ctx.fillStyle=hallLight; _ctx.fillRect(0,0,W(),H());
      _ctx.fillStyle=`rgba(80,42,8,${0.55*doorOpen*(1-doorClose*.95)})`;
      _ctx.fillRect(W()*.5-openW*.5, doorY, openW, doorH);
    }

    // Our wizard being ejected — tumbles out
    const throwT = easeOut(clamp((t-.05)/.40, 0, 1));
    const landT  = easeInOut(clamp((t-.45)/.30, 0, 1));
    const wS     = H()/640;

    let charX, charY, rot = 0;
    if (t < .45) {
      charX = lerp(W()*.5, W()*.28, throwT);
      charY = lerp(gY, gY + H()*.04, throwT);
      rot   = lerp(0, -.22, throwT);
    } else {
      // Landed, straightens up
      charX = W()*.28;
      charY = gY + H()*.04;
      rot   = lerp(-.22, 0, landT);
    }

    _ctx.save();
    _ctx.translate(charX, charY); _ctx.rotate(rot); _ctx.translate(-charX, -charY);
    drawOurWizard(charX, charY, wS);
    _ctx.restore();

    // Dust puff on landing
    if (t>.44 && t<.52 && Math.random()<.35) {
      spawnP(charX, charY, {vx:(Math.random()-.5)*3.5, vy:-Math.random()*1.8, decay:.025, size:2.2, r:60,g:45,b:80});
    }

    // Wizard looks back at castle (t > .55) — we add a small head-turn glow
    if (t > .58) {
      const lookA = Math.min(1,(t-.58)/.15) * .35;
      const lookG=_ctx.createRadialGradient(charX+12*wS, charY-42*wS, 0, charX+12*wS, charY-42*wS, 18*wS);
      lookG.addColorStop(0,`rgba(180,100,255,${lookA})`); lookG.addColorStop(1,'rgba(0,0,0,0)');
      _ctx.fillStyle=lookG; _ctx.fillRect(charX-8*wS, charY-60*wS, 36*wS, 36*wS);
    }

    tickP();
    drawBars(1);
    drawNarration(NAR.eject, t);

    // Fade out at end
    if (t>.80) {
      _ctx.fillStyle=`rgba(0,0,0,${(t-.80)/.20})`;
      _ctx.fillRect(0,0,W(),H());
    }
    const ov=1-fadeCurve(t,.08,.88); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  function tick(ts) {
    if (_done) return;
    const el = ts - _startTime, sec = el / 1000;
    _ctx.clearRect(0,0,W(),H());

    if      (el < T.exteriorEnd)  sceneExterior ((el)                           / T.exteriorEnd,                            sec);
    else if (el < T.hallEnd)      sceneHall     ((el-T.exteriorEnd)             / (T.hallEnd-T.exteriorEnd),                sec);
    else if (el < T.throneEnd)    sceneThrone   ((el-T.hallEnd)                 / (T.throneEnd-T.hallEnd),                  sec);
    else if (el < T.panEnd)       scenePan      ((el-T.throneEnd)               / (T.panEnd-T.throneEnd),                   sec);
    else if (el < T.dispatchEnd)  sceneDispatch ((el-T.panEnd)                  / (T.dispatchEnd-T.panEnd),                 sec);
    else if (el < T.ejectEnd)     sceneEject    ((el-T.dispatchEnd)             / (T.ejectEnd-T.dispatchEnd),               sec);
    else { endCutscene(); return; }

    _raf = requestAnimationFrame(tick);
  }

  function endCutscene() {
    if (_done) return;
    _done = true; cancelAnimationFrame(_raf); _particles = [];
    const screen = document.getElementById('cutscene-screen');
    if (screen) {
      screen.style.transition='opacity 1s'; screen.style.opacity='0';
      setTimeout(()=>{ screen.style.display='none'; screen.style.opacity='1'; screen.style.transition=''; if(_onComplete)_onComplete(); },1000);
    } else { if(_onComplete)_onComplete(); }
  }

  window.playThroneRoomCutscene = function(onComplete) {
    _onComplete = onComplete; _done = false; _particles = [];
    const screen = document.getElementById('cutscene-screen');
    if (!screen) { onComplete&&onComplete(); return; }
    screen.style.display='flex'; screen.style.opacity='1'; screen.style.transition='';
    _canvas = document.getElementById('cutscene-canvas');
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    _ctx = _canvas.getContext('2d');
    screen.addEventListener('click', ()=>endCutscene(), {once:true});
    document.addEventListener('keydown', ()=>endCutscene(), {once:true});
    _startTime = performance.now();
    _raf = requestAnimationFrame(tick);
  };
})();
