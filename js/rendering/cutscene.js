// ===== cutscene.js =====
// Opening cinematic — plays on first run only. Click or any key to skip.

(function () {
  'use strict';

  let _onComplete = null, _canvas = null, _ctx = null;
  let _raf = null, _startTime = 0, _particles = [], _done = false;
  let _shootingStars = [];

  // ── Timeline (ms) ────────────────────────────────────────────────────────────
  const T = {
    woodsEnd:   14000,
    portalEnd:  26000,
    reflectEnd: 31600,
    fallEnd:    36000,
    lobbyEnd:   49000,
    staffEnd:   55600,
    titleEnd:   63000,
    panEnd:     71000,
  };

  const W = () => _canvas.width;
  const H = () => _canvas.height;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t)  { return a + (b - a) * clamp(t, 0, 1); }
  function easeOut(t)     { t = clamp(t,0,1); return 1-(1-t)*(1-t); }
  function easeInOut(t)   { t = clamp(t,0,1); return t<.5?2*t*t:-1+(4-2*t)*t; }
  // fade: 0→1 over [0,inDur], hold 1, 1→0 over [outStart,1]
  function fadeCurve(t, inDur, outStart) {
    if (t < inDur)   return t / inDur;
    if (t > outStart) return 1 - (t-outStart)/(1-outStart);
    return 1;
  }

  // ── Narration script ─────────────────────────────────────────────────────────
  // Each entry: { t0, t1, text } — t0/t1 are fractions of the scene duration.
  const NAR = {
    woods:  [
      { t0:.05, t1:.34, text:'The Wizard League.  A cutthroat world where magic belongs to those who earn it.' },
      { t0:.42, t1:.68, text:'A young wizard walked the Mirewood alone.  He had come for something ordinary.' },
      { t0:.76, t1:.96, text:'A new staff.  That was all he wanted.' },
    ],
    portal: [
      { t0:.08, t1:.44, text:'But at the edge of the forest, half-buried in roots, he found a doorway.' },
      { t0:.54, t1:.90, text:'Stone.  Ancient.  Carved with runes that hummed in a language no living wizard knew.' },
    ],
    reflect:[
      { t0:.10, t1:.48, text:'In the glow, he saw his own face.' },
      { t0:.56, t1:.88, text:'Something on the other side was already waiting for him.' },
    ],
    fall:   [
      { t0:.22, t1:.78, text:'He stepped through.' },
    ],
    lobby:  [
      { t0:.08, t1:.42, text:'He woke somewhere that should not exist.' },
      { t0:.52, t1:.92, text:'The Veil.  A world sealed in a loop.  A tournament with no end, run by someone who preferred it that way.' },
    ],
    staff:  [
      { t0:.10, t1:.48, text:'There was no door back.  No trace of how he had arrived.' },
      { t0:.58, t1:.92, text:'Only a staff on the ground.  And a game he had not chosen — but would not lose.' },
    ],
    title:  [
      { t0:.22, t1:.78, text:'This is where his story begins.' },
    ],
    panDown:[
      { t0:.12, t1:.55, text:'Welcome to The Veil.' },
      { t0:.62, t1:.90, text:'You are already inside.' },
    ],
  };

  function drawNarration(lines, t) {
    let text = '';
    for (const l of lines) {
      if (t >= l.t0 && t <= l.t1) {
        const mid   = (l.t0 + l.t1) * 0.5;
        const fade  = t < mid
          ? clamp((t - l.t0) / 0.06, 0, 1)
          : clamp((l.t1 - t) / 0.06, 0, 1);
        text = l.text;
        // bar
        const barH = H() * 0.115;
        const barGrd = _ctx.createLinearGradient(0, H()-barH*1.6, 0, H());
        barGrd.addColorStop(0,'rgba(0,0,0,0)');
        barGrd.addColorStop(.35,'rgba(0,0,0,0.72)');
        barGrd.addColorStop(1,'rgba(0,0,0,0.92)');
        _ctx.fillStyle = barGrd;
        _ctx.fillRect(0, H()-barH*1.6, W(), barH*1.6);

        _ctx.save();
        _ctx.globalAlpha = fade;
        _ctx.font = `italic ${clamp(H()*.027,11,22)}px 'Cinzel',serif`;
        _ctx.textAlign = 'center'; _ctx.textBaseline = 'alphabetic';
        _ctx.shadowColor = 'rgba(0,0,0,0.9)'; _ctx.shadowBlur = 8;
        _ctx.fillStyle = '#c8b890';
        _ctx.fillText(text, W()*.5, H()*.96);
        _ctx.restore();
        break;
      }
    }
  }

  // Thin cinematic letterbox bars (top+bottom)
  function drawBars(alpha) {
    const bh = H() * 0.075;
    _ctx.save(); _ctx.globalAlpha = alpha;
    _ctx.fillStyle = '#000';
    _ctx.fillRect(0, 0, W(), bh);
    _ctx.fillRect(0, H()-bh, W(), bh);
    _ctx.restore();
  }

  // ── Particles ────────────────────────────────────────────────────────────────
  function spawnP(x, y, o) {
    _particles.push({
      x, y,
      vx: o.vx!==undefined?o.vx:(Math.random()-.5)*2,
      vy: o.vy!==undefined?o.vy:-Math.random()*1.5,
      life:1, decay:o.decay||.011, size:o.size||(Math.random()*2+1),
      r:o.r||160, g:o.g||80, b:o.b||255,
    });
  }
  function tickP() {
    _particles = _particles.filter(p=>p.life>0);
    _particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
      _ctx.save(); _ctx.globalAlpha=p.life*.8;
      _ctx.fillStyle=`rgb(${p.r},${p.g},${p.b})`;
      _ctx.beginPath(); _ctx.arc(p.x,p.y,p.size,0,Math.PI*2); _ctx.fill();
      _ctx.restore();
    });
  }

  // ── Shooting stars ───────────────────────────────────────────────────────────
  function maybeSpawnStar(sec) {
    if (_shootingStars.length < 3 && Math.random() < 0.004) {
      _shootingStars.push({
        x: Math.random()*W(), y: Math.random()*H()*0.35,
        vx: lerp(-6,-2,Math.random()), vy: lerp(1,3,Math.random()),
        life:1, len: lerp(60,140,Math.random()),
      });
    }
    _shootingStars = _shootingStars.filter(s=>s.life>0);
    _shootingStars.forEach(s=>{
      s.x+=s.vx; s.y+=s.vy; s.life-=.016;
      _ctx.save();
      _ctx.globalAlpha = s.life*.8;
      const grd = _ctx.createLinearGradient(s.x,s.y,s.x-s.vx*s.len/Math.hypot(s.vx,s.vy),s.y-s.vy*s.len/Math.hypot(s.vx,s.vy));
      grd.addColorStop(0,'rgba(220,210,255,0.9)');
      grd.addColorStop(1,'rgba(200,180,255,0)');
      _ctx.strokeStyle=grd; _ctx.lineWidth=1.5;
      _ctx.beginPath(); _ctx.moveTo(s.x,s.y);
      _ctx.lineTo(s.x-s.vx*8,s.y-s.vy*8); _ctx.stroke();
      _ctx.restore();
    });
  }

  // ── Stars background ─────────────────────────────────────────────────────────
  function drawStars(sec, maxY, alpha) {
    _ctx.save(); _ctx.globalAlpha = alpha;
    for (let i=0;i<60;i++) {
      const sx=(i*197.3+31)%W(), sy=(i*113.9+17)%(maxY||H()*.60);
      _ctx.globalAlpha = alpha*(0.28+0.24*Math.sin(sec*.88+i*1.2));
      _ctx.fillStyle='rgb(205,190,225)'; _ctx.fillRect(sx,sy,1.5,1.5);
    }
    _ctx.restore();
  }

  // ── Wizard silhouette ────────────────────────────────────────────────────────
  // Matches SPRITE_CHAR_MAGE: staff far-left full-height, tall pointed hat (≈50%
  // of total height), beard, wide flowing robe, two separate boots.
  function drawWizard(cx, cy, s, hasStaff, litLeft) {
    const ctx = _ctx;
    const d = litLeft ? 18 : 4;
    ctx.fillStyle = `rgb(${d},${d-1},${d+4})`;
    const bx = cx + 2*s; // body centre (offset right to leave room for staff)

    if (hasStaff) {
      ctx.fillRect(cx-22*s, cy-100*s, 3*s, 100*s);
    }
    // Hat (tip 100%, brim 52%)
    ctx.beginPath();
    ctx.moveTo(bx-1*s, cy-100*s);
    ctx.lineTo(bx-14*s, cy-52*s);
    ctx.lineTo(bx+13*s, cy-52*s);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(bx-18*s, cy-54*s, 33*s, 4*s); // brim ledge
    // Head
    ctx.beginPath(); ctx.arc(bx, cy-44*s, 9*s, 0, Math.PI*2); ctx.fill();
    // Beard
    ctx.beginPath();
    ctx.moveTo(bx-8*s,  cy-38*s); ctx.lineTo(bx-11*s, cy-30*s);
    ctx.lineTo(bx+11*s, cy-30*s); ctx.lineTo(bx+8*s,  cy-38*s);
    ctx.closePath(); ctx.fill();
    // Robe
    ctx.beginPath();
    ctx.moveTo(bx-8*s,  cy-32*s);
    ctx.lineTo(cx-20*s, cy-14*s); ctx.lineTo(cx-15*s, cy);
    ctx.lineTo(cx+17*s, cy);      ctx.lineTo(bx+22*s, cy-14*s);
    ctx.lineTo(bx+10*s, cy-32*s);
    ctx.closePath(); ctx.fill();
    // Boots
    ctx.fillRect(cx-14*s, cy-3*s, 11*s, 4*s);
    ctx.fillRect(cx+5*s,  cy-3*s, 11*s, 4*s);
    // Staff tip glow
    if (hasStaff) {
      const grd=ctx.createRadialGradient(cx-21*s,cy-102*s,0,cx-21*s,cy-102*s,11*s);
      grd.addColorStop(0,'rgba(200,140,255,.9)'); grd.addColorStop(1,'rgba(100,50,200,0)');
      ctx.fillStyle=grd; ctx.fillRect(cx-32*s,cy-113*s,22*s,22*s);
    }
  }

  // ── Pine tree ────────────────────────────────────────────────────────────────
  function drawTree(cx, groundY, h, shade) {
    const c=shade; _ctx.fillStyle=`rgb(${c},${c},${Math.min(255,c+3)})`;
    _ctx.fillRect(cx-h*.055, groundY-h*.16, h*.11, h*.16); // trunk
    [[.46,.13,.38],[.32,.36,.62],[.17,.63,1]].forEach(([hw,bot,top])=>{
      _ctx.beginPath();
      _ctx.moveTo(cx,        groundY-h*top);
      _ctx.lineTo(cx-h*hw,   groundY-h*bot);
      _ctx.lineTo(cx+h*hw,   groundY-h*bot);
      _ctx.closePath(); _ctx.fill();
    });
  }

  // ── Stone-arch Veil portal (matches _drawBuildingVeil art style) ─────────────
  // cx/cy = centre base of arch. span = full width. height = full arch height.
  const RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ'];

  function drawVeilPortal(cx, cy, span, height, sec, intensity) {
    const ctx = _ctx;
    const pilW  = span * 0.18;     // pillar width
    const pilH  = height * 0.78;   // pillar height
    const archR = (span - pilW) * 0.5; // radius of the arch semicircle
    const archCY = cy - pilH;      // centre Y of the arch semicircle
    const lx    = cx - span*0.5;  // left pillar x
    const rx    = cx + span*0.5 - pilW; // right pillar x

    // ── Ambient halo ──
    const halo = ctx.createRadialGradient(cx,archCY,archR*.1,cx,archCY,span*1.1);
    halo.addColorStop(0, `rgba(100,28,210,${.38*intensity})`);
    halo.addColorStop(.55,`rgba(55,10,140,${.16*intensity})`);
    halo.addColorStop(1,  'rgba(0,0,0,0)');
    ctx.fillStyle=halo; ctx.fillRect(cx-span*1.1,archCY-span*1.1,span*2.2,span*2.2);

    // ── Portal interior (clipped to arch opening) ──
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, archCY, archR - pilW*.45, Math.PI, 0, false);
    ctx.lineTo(cx + archR - pilW*.45, cy);
    ctx.lineTo(cx - archR + pilW*.45, cy);
    ctx.closePath();
    ctx.clip();
    const interior = ctx.createRadialGradient(cx,archCY,0,cx,archCY,archR);
    interior.addColorStop(0,  `rgba(240,190,255,${.97*intensity})`);
    interior.addColorStop(.25,`rgba(165,62,255,${.90*intensity})`);
    interior.addColorStop(.68,`rgba(72,14,180,${.80*intensity})`);
    interior.addColorStop(1,  `rgba(18,0,55,${.35*intensity})`);
    ctx.fillStyle=interior; ctx.fillRect(cx-span,archCY-span,span*2,span*2);
    // Mist wisps inside
    for (let i=0;i<4;i++) {
      const wx=cx+Math.sin(sec*.028+i*2)*archR*.32;
      const wy=archCY*.2 + cy*.8 - i*pilH*.16 + Math.cos(sec*.022+i)*pilH*.07;
      const wr=archR*(0.22+.1*Math.sin(sec*.04+i));
      const mg=ctx.createRadialGradient(wx,wy,0,wx,wy,wr);
      mg.addColorStop(0,`rgba(160,70,255,${(.28+.12*Math.sin(sec*.05+i))*intensity})`);
      mg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=mg; ctx.fillRect(wx-wr,wy-wr,wr*2,wr*2);
    }
    ctx.restore();

    // ── Stone pillars ──
    const stoneD=10, stoneL=22;
    ctx.fillStyle='#1a1020'; ctx.strokeStyle='#2e1a42'; ctx.lineWidth=1;
    // Left pillar
    ctx.fillRect(lx, cy-pilH, pilW, pilH); ctx.strokeRect(lx, cy-pilH, pilW, pilH);
    // Right pillar
    ctx.fillRect(rx, cy-pilH, pilW, pilH); ctx.strokeRect(rx, cy-pilH, pilW, pilH);
    // Mortar lines (simulate stone blocks)
    ctx.strokeStyle='#251630'; ctx.lineWidth=.8;
    for (let y=cy-pilH; y<cy; y+=stoneD) {
      ctx.beginPath(); ctx.moveTo(lx,y); ctx.lineTo(lx+pilW,y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx,y); ctx.lineTo(rx+pilW,y); ctx.stroke();
    }

    // ── Stone arch ring ──
    ctx.strokeStyle='#2e1a42'; ctx.lineWidth=pilW;
    ctx.fillStyle='#1a1020';
    ctx.beginPath(); ctx.arc(cx, archCY, archR, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, archCY, archR, Math.PI, 0);
    ctx.lineTo(cx+archR,cy-pilH); ctx.lineTo(cx-archR,cy-pilH); ctx.closePath();
    ctx.fill();
    // Arch outer ring highlight
    ctx.save();
    ctx.shadowColor='#7030c0'; ctx.shadowBlur=12;
    ctx.strokeStyle=`rgba(70,28,130,${.9*intensity})`; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx,archCY,archR+pilW*.44,Math.PI,0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,archCY,archR-pilW*.44,Math.PI,0); ctx.stroke();
    ctx.restore();

    // ── Runes carved along the arch face ──
    const numR = 10;
    ctx.font=`${Math.max(9,span*.068)}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for (let i=0;i<numR;i++) {
      const ang = Math.PI * (i/(numR-1)); // left(π) → top(π/2) → right(0)
      const runeR = archR; // on the stone face
      const rx2 = cx - Math.cos(ang)*runeR;
      const ry2 = archCY - Math.sin(ang)*runeR;
      ctx.save();
      ctx.translate(rx2, ry2);
      ctx.rotate(-ang + Math.PI*.5);
      ctx.globalAlpha = (.55+Math.sin(sec*1.8+i)*.18)*intensity;
      ctx.fillStyle='#c8a0ee';
      ctx.fillText(RUNES[i%RUNES.length], 0, 0);
      ctx.restore();
    }

    // ── Keystone gem at arch top ──
    const gemR = span*.055;
    ctx.beginPath(); ctx.arc(cx, archCY-archR, gemR, 0, Math.PI*2);
    ctx.fillStyle=`rgba(185,85,255,${(.7+.25*Math.sin(sec*2.5))*intensity})`;
    ctx.fill();
    ctx.save();
    ctx.shadowColor='#e0b0ff'; ctx.shadowBlur=18;
    ctx.strokeStyle=`rgba(220,170,255,${intensity})`; ctx.lineWidth=1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── Castle ───────────────────────────────────────────────────────────────────
  function drawCastle(cx, cy, s) {
    const ctx=_ctx; ctx.fillStyle='rgb(5,3,12)';
    ctx.fillRect(cx-92*s,cy-62*s,184*s,62*s);
    ctx.fillRect(cx-122*s,cy-42*s,42*s,42*s); ctx.fillRect(cx+80*s,cy-42*s,42*s,42*s);
    ctx.fillRect(cx-104*s,cy-108*s,32*s,68*s); ctx.fillRect(cx+72*s,cy-108*s,32*s,68*s);
    ctx.fillRect(cx-24*s,cy-82*s,48*s,82*s);
    ctx.beginPath(); ctx.moveTo(cx-22*s,cy-82*s); ctx.lineTo(cx,cy-158*s); ctx.lineTo(cx+22*s,cy-82*s); ctx.fill();
    [[cx-88*s,cy-108*s],[cx+88*s,cy-108*s]].forEach(([tx,ty])=>{
      ctx.beginPath(); ctx.moveTo(tx-16*s,ty); ctx.lineTo(tx,ty-38*s); ctx.lineTo(tx+16*s,ty); ctx.fill();
    });
    for (let i=0;i<8;i++) ctx.fillRect(cx-88*s+i*24*s,cy-72*s,13*s,12*s);
  }

  // ── Shared lobby sky (reused in lobby + pan scenes) ──────────────────────────
  const EL_COLORS=[[255,55,0],[0,105,255],[105,205,255],[115,75,28],[38,175,58],[255,225,0],[155,55,255],[175,220,255]];

  function drawLobbySky(sec, elAlpha, offsetY) {
    offsetY = offsetY || 0;
    const ctx=_ctx;
    const sky=ctx.createLinearGradient(0,offsetY,0,H()+offsetY);
    sky.addColorStop(0,'#0e0420'); sky.addColorStop(.65,'#1a0735'); sky.addColorStop(1,'#090320');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W(),H());

    drawStars(sec, H()*.58, 1);
    maybeSpawnStar(sec);

    EL_COLORS.forEach(([r,g,b],i)=>{
      const ex=W()*((i+.5)/8), ey=H()*.63+offsetY;
      const grd=ctx.createRadialGradient(ex,ey,0,ex,ey,H()*.32);
      const a=(elAlpha||1)*(0.16+.05*Math.sin(sec*.55+i));
      grd.addColorStop(0,`rgba(${r},${g},${b},${a})`); grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd; ctx.fillRect(0,0,W(),H());
    });

    const ground=ctx.createLinearGradient(0,H()*.62+offsetY,0,H()+offsetY);
    ground.addColorStop(0,'rgba(35,12,75,0)'); ground.addColorStop(1,'rgba(22,6,52,.92)');
    ctx.fillStyle=ground; ctx.fillRect(0,H()*.62,W(),H()*.38);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Scene 1: Dark Woods ──────────────────────────────────────────────────────
  function sceneWoods(t, sec) {
    // Sky
    const sky=_ctx.createLinearGradient(0,0,0,H());
    sky.addColorStop(0,'#030208'); sky.addColorStop(.6,'#060412'); sky.addColorStop(1,'#0a0618');
    _ctx.fillStyle=sky; _ctx.fillRect(0,0,W(),H());

    // Moon
    const mx=W()*.78, my=H()*.16, mr=H()*.052;
    const mGlow=_ctx.createRadialGradient(mx,my,0,mx,my,mr*4.5);
    mGlow.addColorStop(0,'rgba(175,165,215,.20)'); mGlow.addColorStop(1,'rgba(0,0,0,0)');
    _ctx.fillStyle=mGlow; _ctx.fillRect(mx-mr*4.5,my-mr*4.5,mr*9,mr*9);
    _ctx.fillStyle='rgb(182,175,208)';
    _ctx.beginPath(); _ctx.arc(mx,my,mr,0,Math.PI*2); _ctx.fill();

    drawStars(sec, H()*.60, 1);

    const gY=H()*.78;
    // Tree layers (far→near)
    for (let i=0;i<11;i++) drawTree(W()*(i/10),gY-H()*.04,H()*.21,12);
    for (let i=0;i<9;i++)  drawTree(W()*(i/8-.03),gY,H()*.30,8);
    [0,.14,.42,.62,.80,.96].forEach(fx=> drawTree(W()*fx,gY+H()*.04,H()*.42,5));
    [0,.12,.78,.92,1.04].forEach(fx=>   drawTree(W()*fx,H(),H()*.60,3));

    // Ground + path
    _ctx.fillStyle='rgb(5,4,9)'; _ctx.fillRect(0,gY+H()*.04,W(),H());
    const path=_ctx.createLinearGradient(W()*.28,0,W()*.58,0);
    path.addColorStop(0,'rgba(0,0,0,0)'); path.addColorStop(.2,'rgba(22,16,10,.65)');
    path.addColorStop(.8,'rgba(22,16,10,.65)'); path.addColorStop(1,'rgba(0,0,0,0)');
    _ctx.fillStyle=path; _ctx.fillRect(0,gY+H()*.04,W(),H());

    const mist=_ctx.createLinearGradient(0,gY-H()*.06,0,gY+H()*.12);
    mist.addColorStop(0,'rgba(20,10,40,0)'); mist.addColorStop(1,'rgba(20,10,40,.75)');
    _ctx.fillStyle=mist; _ctx.fillRect(0,gY-H()*.06,W(),H()*.18);

    // Moonray
    const ray=_ctx.createLinearGradient(mx,my+mr,mx*.65,gY);
    ray.addColorStop(0,'rgba(178,165,228,.05)'); ray.addColorStop(1,'rgba(178,165,228,0)');
    _ctx.fillStyle=ray;
    _ctx.beginPath(); _ctx.moveTo(mx-mr*.4,my+mr); _ctx.lineTo(mx*.28,gY); _ctx.lineTo(mx*.92,gY); _ctx.lineTo(mx+mr*.4,my+mr); _ctx.closePath(); _ctx.fill();

    // Wizard walks in, bobs
    const walkT=easeInOut(clamp(t/.82,0,1));
    const charX=lerp(-30,W()*.44,walkT);
    const bob=Math.sin(sec*3.8)*3*Math.max(0,1-t*2);
    drawWizard(charX, gY+H()*.055+bob, H()/640, false, false);

    // Dust motes
    if (Math.random()<.22) spawnP(Math.random()*W(),gY-Math.random()*H()*.25,{vx:(Math.random()-.5)*.4,vy:-.2,decay:.004,size:1.4,r:130,g:90,b:200});
    tickP();

    drawBars(1);
    drawNarration(NAR.woods, t);
    const ov=1-fadeCurve(t,.10,.88); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 2: Portal (Stone Arch Veil) ───────────────────────────────────────
  function scenePortal(t, sec) {
    const sky=_ctx.createLinearGradient(0,0,0,H());
    sky.addColorStop(0,'#030108'); sky.addColorStop(1,'#070514');
    _ctx.fillStyle=sky; _ctx.fillRect(0,0,W(),H());

    drawStars(sec, H()*.55, 0.7);

    const gY=H()*.80;
    for (let i=0;i<9;i++) drawTree(W()*(i/8),gY,H()*.28,8);
    [0,.10,.80,.92,1.04].forEach(fx=>drawTree(W()*fx,H(),H()*.60,3));
    _ctx.fillStyle='rgb(4,3,8)'; _ctx.fillRect(0,gY,W(),H()-gY);
    const mist=_ctx.createLinearGradient(0,gY-H()*.05,0,gY+H()*.10);
    mist.addColorStop(0,'rgba(20,8,45,0)'); mist.addColorStop(1,'rgba(20,8,45,.80)');
    _ctx.fillStyle=mist; _ctx.fillRect(0,gY-H()*.05,W(),H()*.15);

    // Portal grows in
    const zoom  = lerp(.55, 1.0, easeOut(t));
    const pulse = 1 + Math.sin(sec*2.4)*.03;
    const span  = H()*.55 * zoom * pulse;
    const pH    = H()*.62 * zoom * pulse;
    drawVeilPortal(W()*.56, gY, span, pH, sec, Math.min(1, t*2.2));

    // Wizard watches
    _ctx.save(); _ctx.globalAlpha=Math.min(1,t*3);
    drawWizard(W()*.20, gY+H()*.055, H()/640, false, true);
    _ctx.restore();

    tickP();
    drawBars(1);
    drawNarration(NAR.portal, t);
    const ov=1-fadeCurve(t,.08,.88); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 3: Face Reflection ─────────────────────────────────────────────────
  function sceneReflect(t, sec) {
    _ctx.fillStyle='rgb(3,2,7)'; _ctx.fillRect(0,0,W(),H());
    const cx=W()*.5, cy=H()*.52;
    const s=H()/200;
    _ctx.fillStyle='rgb(5,4,11)';
    _ctx.beginPath(); _ctx.moveTo(cx,cy-140*s); _ctx.lineTo(cx-60*s,cy-60*s); _ctx.lineTo(cx+58*s,cy-60*s); _ctx.closePath(); _ctx.fill();
    _ctx.fillRect(cx-70*s,cy-64*s,132*s,7*s);
    _ctx.beginPath(); _ctx.arc(cx+3*s,cy-50*s,36*s,0,Math.PI*2); _ctx.fill();
    _ctx.fillRect(cx-40*s,cy-24*s,84*s,40*s);
    _ctx.fillRect(cx-130*s,cy+12*s,280*s,80*s);

    const fl=.72+Math.sin(sec*4.8)*.09+Math.sin(sec*7.1)*.04;
    const faceL=_ctx.createRadialGradient(cx+85,cy-40,0,cx+85,cy-40,230);
    faceL.addColorStop(0,`rgba(140,62,255,${.58*fl})`); faceL.addColorStop(1,'rgba(0,0,0,0)');
    _ctx.fillStyle=faceL; _ctx.fillRect(0,0,W(),H());

    if (t>.35) {
      const ra=clamp((t-.35)/.22,0,1);
      _ctx.save(); _ctx.globalAlpha=ra*.7;
      _ctx.font=`${H()*.072}px serif`; _ctx.fillStyle='#cc99ff';
      _ctx.textAlign='center'; _ctx.textBaseline='middle';
      RUNES.slice(0,6).forEach((r,i)=>{
        const a=sec*.54+i*(Math.PI/3);
        _ctx.fillText(r,cx+Math.cos(a)*H()*.26,cy+Math.sin(a)*H()*.20);
      });
      _ctx.restore();
    }

    drawBars(1);
    drawNarration(NAR.reflect, t);
    const ov=1-fadeCurve(t,.18,.78); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 4: The Fall ────────────────────────────────────────────────────────
  function sceneFall(t, sec) {
    const fA=t<.15?1:Math.max(0,1-(t-.15)/.28);
    _ctx.fillStyle=`rgba(165,85,255,${fA})`; _ctx.fillRect(0,0,W(),H());

    if (t>.10 && t<.88) {
      _ctx.save();
      _ctx.globalAlpha=clamp((t-.10)/.14,0,1)*clamp((.88-t)/.10,0,1)*.65;
      _ctx.font=`${H()*.062}px serif`; _ctx.fillStyle='#eeddff';
      _ctx.textAlign='center'; _ctx.textBaseline='middle';
      for (let i=0;i<12;i++) {
        const ang=(i/12)*Math.PI*2+sec*2.5;
        const d=lerp(H()*.04,H()*.56,clamp(t*1.1,0,1));
        _ctx.fillText(RUNES[(i+4)%RUNES.length],W()*.5+Math.cos(ang)*d,H()*.5+Math.sin(ang)*d*.52);
      }
      _ctx.restore();
    }
    if (t>.12 && t<.82) {
      const ft=(t-.12)/.70;
      _ctx.save(); _ctx.translate(W()*.5,H()*.5); _ctx.rotate(ft*.55); _ctx.globalAlpha=1-ft*.85;
      drawWizard(0,0,lerp(H()/640,H()/1200,ft),false,false);
      _ctx.restore();
    }
    if (t<.45&&Math.random()<.55) {
      const a=Math.random()*Math.PI*2,sp=3+Math.random()*5;
      spawnP(W()*.5,H()*.5,{vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,decay:.022,size:2.8,r:215,g:145,b:255});
    }
    tickP();
    drawBars(1);
    drawNarration(NAR.fall, t);
    if (t>.72){_ctx.fillStyle=`rgba(0,0,0,${(t-.72)/.28})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 5: Lobby Reveal ────────────────────────────────────────────────────
  function sceneLobby(t, sec) {
    drawLobbySky(sec, Math.min(1,t*1.6), 0);
    _ctx.save(); _ctx.globalAlpha=Math.min(1,t*1.3);
    drawCastle(W()*.5,H()*.65,.60);
    _ctx.restore();

    const landT=easeOut(clamp(t*1.55,0,1));
    const wS=H()/640;
    const charY=lerp(-wS*110,H()*.715+wS*55,landT);
    _ctx.save();
    if (landT<1){ _ctx.translate(W()*.5,charY); _ctx.rotate((1-landT)*.4); _ctx.translate(-W()*.5,-charY); }
    drawWizard(W()*.5,charY,wS,false,false);
    _ctx.restore();

    if (t>.60&&t<.76) for (let i=0;i<2;i++) spawnP(W()*.5+(Math.random()-.5)*28,charY,{vx:(Math.random()-.5)*3.8,vy:-Math.random()*2.8,decay:.025,size:2.8,r:130,g:75,b:195});
    tickP();

    drawBars(1);
    drawNarration(NAR.lobby, t);
    const ov=1-fadeCurve(t,.07,.90); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 6: Stand + Staff ───────────────────────────────────────────────────
  function sceneStaff(t, sec) {
    drawLobbySky(sec, 1, 0);
    _ctx.save(); _ctx.globalAlpha=.88; drawCastle(W()*.5,H()*.65,.60); _ctx.restore();
    const riseT=easeInOut(clamp(t*1.7,0,1));
    const wS=H()/640;
    const charY=lerp(H()*.74+wS*55,H()*.715+wS*55,riseT);
    const staffOn=t>.42;
    drawWizard(W()*.5,charY,wS,staffOn,false);
    if (staffOn&&Math.random()<.32) spawnP(W()*.5-22*wS,charY-102*wS,{vx:(Math.random()-.5)*1.8,vy:-Math.random()*2.4,decay:.022,size:2.1,r:205,g:140,b:255});
    tickP();
    drawBars(1);
    drawNarration(NAR.staff, t);
    const ov=1-fadeCurve(t,.12,.80); if(ov>0){_ctx.fillStyle=`rgba(0,0,0,${ov})`;_ctx.fillRect(0,0,W(),H());}
  }

  // ── Scene 7: Title Card ───────────────────────────────────────────────────────
  function sceneTitleCard(t) {
    _ctx.fillStyle='rgb(0,0,0)'; _ctx.fillRect(0,0,W(),H());
    const alpha=fadeCurve(t,.18,.72);
    _ctx.save(); _ctx.globalAlpha=alpha;
    const grd=_ctx.createRadialGradient(W()*.5,H()*.45,0,W()*.5,H()*.45,W()*.42);
    grd.addColorStop(0,'rgba(80,28,150,.45)'); grd.addColorStop(1,'rgba(0,0,0,0)');
    _ctx.fillStyle=grd; _ctx.fillRect(0,0,W(),H());
    _ctx.textAlign='center'; _ctx.textBaseline='middle';
    const fs=clamp(H()*.115,28,92);
    _ctx.font=`bold ${fs}px 'Cinzel',serif`;
    _ctx.shadowColor='#c8a050'; _ctx.shadowBlur=42; _ctx.fillStyle='#e8c870';
    _ctx.fillText("WIZARD'S LEAGUE",W()*.5,H()*.43);
    _ctx.shadowBlur=0;
    _ctx.strokeStyle='rgba(150,110,210,.40)'; _ctx.lineWidth=1;
    _ctx.beginPath(); _ctx.moveTo(W()*.33,H()*.535); _ctx.lineTo(W()*.67,H()*.535); _ctx.stroke();
    _ctx.font=`${clamp(H()*.038,12,30)}px 'Cinzel',serif`;
    _ctx.fillStyle='#6a5a90';
    _ctx.fillText('T H E   V E I L',W()*.5,H()*.595);
    _ctx.restore();
    drawBars(1);
    drawNarration(NAR.title, t);
  }

  // ── Scene 8: Pan Down into lobby ─────────────────────────────────────────────
  // Camera slowly descends, revealing the ground / lobby world, then fades out.
  function scenePanDown(t, sec) {
    // Pan: shift all content upward so we "move down" into the world
    const panFrac = easeInOut(clamp(t*1.15,0,1));
    const panY    = panFrac * H() * 0.42; // how far down we've scrolled

    _ctx.save();
    _ctx.translate(0, -panY);

    // Extend the sky/ground downward so it fills the scrolled view
    drawLobbySky(sec, 1, panY);
    // Castle — remains at its world position
    drawCastle(W()*.5, H()*.65, .60);
    // Wizard standing with staff at world position
    const wS=H()/640;
    drawWizard(W()*.5, H()*.715+wS*55, wS, true, false);
    if (Math.random()<.18) spawnP(W()*.5-22*wS,H()*.715+wS*55-102*wS,{vx:(Math.random()-.5)*1.5,vy:-Math.random()*2,decay:.02,size:2,r:200,g:135,b:255});
    tickP();

    _ctx.restore(); // un-translate so bars/fade are screen-aligned

    drawBars(1);
    drawNarration(NAR.panDown, t);

    // Fade out at the very end
    if (t>.78) {
      _ctx.fillStyle=`rgba(0,0,0,${(t-.78)/.22})`;
      _ctx.fillRect(0,0,W(),H());
    }
    // Fade in from title
    if (t<.12) {
      _ctx.fillStyle=`rgba(0,0,0,${1-t/.12})`;
      _ctx.fillRect(0,0,W(),H());
    }
  }

  // ── Main loop ────────────────────────────────────────────────────────────────
  function tick(ts) {
    if (_done) return;
    const el=ts-_startTime, sec=el/1000;
    _ctx.clearRect(0,0,W(),H());

    if      (el<T.woodsEnd)   sceneWoods   (el/T.woodsEnd,                               sec);
    else if (el<T.portalEnd)  scenePortal  ((el-T.woodsEnd)  /(T.portalEnd-T.woodsEnd),  sec);
    else if (el<T.reflectEnd) sceneReflect ((el-T.portalEnd) /(T.reflectEnd-T.portalEnd), sec);
    else if (el<T.fallEnd)    sceneFall    ((el-T.reflectEnd)/(T.fallEnd-T.reflectEnd),   sec);
    else if (el<T.lobbyEnd)   sceneLobby   ((el-T.fallEnd)   /(T.lobbyEnd-T.fallEnd),    sec);
    else if (el<T.staffEnd)   sceneStaff   ((el-T.lobbyEnd)  /(T.staffEnd-T.lobbyEnd),   sec);
    else if (el<T.titleEnd)   sceneTitleCard((el-T.staffEnd)  /(T.titleEnd-T.staffEnd));
    else if (el<T.panEnd)     scenePanDown  ((el-T.titleEnd)  /(T.panEnd-T.titleEnd),    sec);
    else { endCutscene(); return; }

    _raf=requestAnimationFrame(tick);
  }

  function endCutscene() {
    if (_done) return;
    _done=true; cancelAnimationFrame(_raf); _particles=[]; _shootingStars=[];
    const screen=document.getElementById('cutscene-screen');
    if (screen) {
      screen.style.transition='opacity 1s'; screen.style.opacity='0';
      setTimeout(()=>{ screen.style.display='none'; screen.style.opacity='1'; screen.style.transition=''; if(_onComplete)_onComplete(); },1000);
    } else { if(_onComplete)_onComplete(); }
  }

  window.playCutscene=function(onComplete){
    _onComplete=onComplete; _done=false; _particles=[]; _shootingStars=[];
    const screen=document.getElementById('cutscene-screen');
    if (!screen){ onComplete&&onComplete(); return; }
    screen.style.display='flex'; screen.style.opacity='1'; screen.style.transition='';
    _canvas=document.getElementById('cutscene-canvas');
    _canvas.width=window.innerWidth; _canvas.height=window.innerHeight;
    _ctx=_canvas.getContext('2d');
    screen.addEventListener('click',()=>endCutscene(),{once:true});
    document.addEventListener('keydown',()=>endCutscene(),{once:true});
    _startTime=performance.now(); _raf=requestAnimationFrame(tick);
  };
})();
