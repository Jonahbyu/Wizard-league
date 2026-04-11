// ===== sprites.js =====
// ─── SPRITES.JS — Pixel art battlefield canvas ────────────────────────────────
// Pokemon-style battlefield: player back-left, enemies front-right.
// Canvas renders continuously via rAF loop.
// Static sprite data lives in js/data/sprite_data.js (loaded first).

// ═══ PALETTE LOOKUPS ══════════════════════════════════════════════════════════
function getElemPal(element) {
  const el = element ? element.split(/[\/\s]/)[0] : 'Neutral';
  return EL_PAL[el] || EL_PAL.Neutral;
}
function getBGTone(element) {
  const el = element ? element.split(/[\/\s]/)[0] : 'Neutral';
  return BG_TONES[el] || BG_TONES.Neutral;
}

function getElemHatSprite(element) {
  return ELEM_HAT_SPRITES[element] || ELEM_HAT_SPRITES.Fire;
}

// ═══ DRAWING ══════════════════════════════════════════════════════════════════
function charToColor(c, pal) {
  switch (c) {
    case '1': return pal[0];
    case '2': return pal[1];
    case '3': return pal[2];
    case '4': return pal[3];
    case 'h': return pal[1];
    case 's': return SKIN_C;
    case 'e': return EYE_C;
    case 'b': return BOOT_C;
    case 'w': return BEARD_C;   // white beard
    case 'f': return STAFF_C;   // wooden staff
    case 'g': return pal[3];    // staff glow — matches element highlight
    default:  return null;
  }
}

function drawSprite(ctx, rows, x, y, scale, pal, cols, flipH) {
  cols = cols || 12;
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < cols; col++) {
      const c = (rows[row] || '')[col] || '.';
      const color = charToColor(c, pal);
      if (!color) continue;
      ctx.fillStyle = color;
      const drawCol = flipH ? (cols - 1 - col) : col;
      ctx.fillRect(Math.floor(x + drawCol * scale), Math.floor(y + row * scale), scale, scale);
    }
  }
}

// ═══ BACKGROUND ══════════════════════════════════════════════════════════════
// ═══ ZONE BATTLE BACKGROUNDS ═════════════════════════════════════════════════
// Each element gets a unique daytime arena scene.
// Ground line sits at GROUND_Y = H * 0.62. Both fighters stand on it.

const _bBGtick = () => Date.now();

// In deck mode the horizon sits higher so the sky dominates and enemies stand near the top
function _horizonFrac() {
  return (typeof player !== 'undefined' && player.deckMode) ? 0.25 : 0.55;
}

function _bSkyGrad(ctx, W, H, c0, c1, horizFrac) {
  const g = ctx.createLinearGradient(0, 0, 0, H * horizFrac);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.ceil(H * horizFrac));
}

function _bGroundGrad(ctx, W, H, c0, c1, horizFrac) {
  const g = ctx.createLinearGradient(0, H * horizFrac, 0, H);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(0, Math.floor(H * horizFrac), W, H);
}

function _bHillSil(ctx, W, H, horizFrac, col, phase) {
  const hy = H * horizFrac;
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let x = 0; x <= W; x++) {
    const y = hy + Math.sin(x*0.025 + (phase||0))*H*0.04
                 + Math.sin(x*0.011 + (phase||0)*0.7)*H*0.025;
    x===0 ? ctx.moveTo(0, Math.round(y)) : ctx.lineTo(x, Math.round(y));
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

function _bStars(ctx, W, H, horizFrac, n) {
  for (let i = 0; i < n; i++) {
    const sx = ((i*173+37)%W);
    const sy = ((i*97+19)%(Math.round(H*horizFrac*0.9)));
    const bright = 0.3 + 0.4*Math.sin(_bBGtick()*0.004 + i*0.9);
    ctx.fillStyle = `rgba(255,255,255,${bright.toFixed(2)})`;
    ctx.fillRect(sx, sy, i%7===0?2:1, i%7===0?2:1);
  }
}

// ─── FIRE battle arena ───────────────────────────────────────────────────────
function _bbFire(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();
  _bSkyGrad(ctx, W, H, '#1a0500', '#3d0800', hf);
  // Volcano silhouette with crater glow (matches lobby panel)
  ctx.fillStyle = '#0a0100';
  ctx.beginPath();
  ctx.moveTo(0, Math.round(H*hf));
  ctx.lineTo(Math.round(W*0.18), Math.round(H*(hf-0.24)));
  ctx.lineTo(Math.round(W*0.30), Math.round(H*(hf-0.38)));
  ctx.lineTo(Math.round(W*0.42), Math.round(H*(hf-0.22)));
  ctx.lineTo(Math.round(W*0.60), Math.round(H*(hf-0.30)));
  ctx.lineTo(Math.round(W*0.72), Math.round(H*(hf-0.18)));
  ctx.lineTo(W, Math.round(H*hf));
  ctx.closePath(); ctx.fill();
  const vcx = Math.round(W*0.30), vcy = Math.round(H*(hf-0.38));
  const vcg = ctx.createRadialGradient(vcx, vcy, 0, vcx, vcy, Math.round(W*0.18));
  vcg.addColorStop(0, 'rgba(255,80,0,0.45)'); vcg.addColorStop(0.4, 'rgba(180,30,0,0.18)'); vcg.addColorStop(1, 'transparent');
  ctx.fillStyle = vcg; ctx.fillRect(0, 0, W, Math.round(H*hf));
  _bHillSil(ctx, W, H, hf-0.08, '#110200', 0.3);
  // Lava glow on horizon
  const hg = ctx.createLinearGradient(0, H*hf-12, 0, H*hf+8);
  hg.addColorStop(0,'rgba(255,80,0,0.35)'); hg.addColorStop(1,'rgba(255,80,0,0)');
  ctx.fillStyle=hg; ctx.fillRect(0,H*hf-12,W,20);
  // Ground — black volcanic rock
  _bGroundGrad(ctx, W, H, '#220800', '#0e0400', hf);
  // Lava crack seams
  for (let i=0;i<6;i++) {
    const cx2=((i*211+37)%W), cy2=Math.round(H*(hf+0.08+(i%3)*0.06));
    const glow=0.4+0.4*Math.sin(t*0.008+i);
    ctx.fillStyle=`rgba(255,${Math.round(60+40*glow)},0,${(0.5+0.3*glow).toFixed(2)})`;
    ctx.fillRect(cx2,cy2,20+(i%4)*8,2);
  }
  // Charred tree silhouette (far back)
  ctx.fillStyle='#100502';
  [[W*0.12,H*0.52,18],[W*0.82,H*0.50,14],[W*0.60,H*0.54,10]].forEach(([tx,ty,th])=>{
    ctx.fillRect(tx-2,ty-th,4,th); ctx.fillRect(tx+2,ty-th+4,8,2); ctx.fillRect(tx-10,ty-th+8,8,2);
  });
  // Embers floating up
  for (let i=0;i<8;i++) {
    const ex=((i*173+31)%W), phase=(t*0.001+i*0.7)%1;
    const ey=Math.round(H*(0.9-phase*0.5));
    ctx.fillStyle=`rgba(255,${Math.round(100+100*phase)},0,${(1-phase).toFixed(2)})`;
    ctx.fillRect(ex,ey,2,2);
  }
  // Ground line
  ctx.fillStyle='#cc3300'; ctx.fillRect(0,Math.round(H*hf),W,1);
}

// ─── WATER battle arena ──────────────────────────────────────────────────────
function _bbWater(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();
  _bSkyGrad(ctx, W, H, '#040d1a', '#0a2035', hf);
  _bStars(ctx, W, H, hf, 40);
  // Moon reflection
  const mx=Math.round(W*0.72), mReflY=Math.round(H*hf*0.25);
  ctx.fillStyle='rgba(220,230,255,0.9)'; ctx.fillRect(mx-4,mReflY,8,8);
  ctx.fillStyle='rgba(220,230,255,0.5)'; ctx.fillRect(mx-6,mReflY+2,4,4); ctx.fillRect(mx+4,mReflY+2,4,4);
  // Distant rocky island silhouette (matches lobby panel)
  ctx.fillStyle = '#020e1c';
  ctx.beginPath();
  ctx.moveTo(Math.round(W*0.12), Math.round(H*hf));
  ctx.lineTo(Math.round(W*0.20), Math.round(H*(hf-0.12)));
  ctx.lineTo(Math.round(W*0.32), Math.round(H*(hf-0.20)));
  ctx.lineTo(Math.round(W*0.44), Math.round(H*(hf-0.13)));
  ctx.lineTo(Math.round(W*0.55), Math.round(H*hf));
  ctx.closePath(); ctx.fill();
  _bHillSil(ctx, W, H, hf-0.10, '#080d18', 0.5);
  _bHillSil(ctx, W, H, hf-0.04, '#0a1220', 0.8);
  // Ocean ground
  const og = ctx.createLinearGradient(0,H*hf,0,H);
  og.addColorStop(0,'#0a3050'); og.addColorStop(0.5,'#082540'); og.addColorStop(1,'#051830');
  ctx.fillStyle=og; ctx.fillRect(0,Math.floor(H*hf),W,H);
  // Wave lines
  for (let wi=0;wi<4;wi++) {
    const wy=Math.round(H*(hf+0.05+wi*0.07)), phase=t*0.002+wi*1.1;
    ctx.fillStyle=`rgba(100,180,220,${0.15-wi*0.02})`;
    for (let x=0;x<W;x++) { const w2=Math.sin(x*0.04+phase)*3; if(Math.abs(w2)>1.5) ctx.fillRect(x,wy+Math.round(w2),1,2); }
  }
  // Moon shimmer on water
  for (let i=0;i<5;i++) {
    const sx=mx-6+i*3, sy=Math.round(H*hf+4+i*8), alpha=0.25-i*0.04;
    ctx.fillStyle=`rgba(200,220,255,${alpha})`; ctx.fillRect(sx,sy,3,2);
  }
  // Bioluminescent sparkle dots near waterline (matches lobby panel)
  for (let i=0;i<8;i++) {
    const bx=Math.round(((i*173+31)%W)), by=Math.round(H*(hf+0.06+(i*0.09)%0.14));
    const ba=0.3+0.5*Math.sin(t*0.04+i*2.1);
    if(ba<0.1) continue;
    ctx.fillStyle=`rgba(68,255,204,${ba.toFixed(2)})`; ctx.fillRect(bx,by,1,1);
  }
  // Sandy shore
  ctx.fillStyle='#7a6838'; ctx.fillRect(0,Math.round(H*hf)-2,W,3);
  // Ground line
  ctx.fillStyle='#1a8aaa'; ctx.fillRect(0,Math.round(H*hf),W,1);
}

// ─── ICE battle arena ────────────────────────────────────────────────────────
function _bbIce(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();
  _bSkyGrad(ctx, W, H, '#060c18', '#0a1628', hf);
  _bStars(ctx, W, H, hf, 50);
  // Aurora (sweeping color ribbons — matches lobby panel green/blue/violet)
  const auroraC = ['rgba(0,255,160,', 'rgba(0,180,255,', 'rgba(100,80,255,'];
  for (let ai=0;ai<3;ai++) {
    const aPhase = t*0.0012+ai*1.4;
    const ay=Math.round(H*(0.07+ai*0.11)+Math.sin(aPhase)*H*0.018);
    const ah=Math.round(H*(0.06+0.03*Math.sin(aPhase*0.7)));
    const ag=ctx.createLinearGradient(0,ay,0,ay+ah);
    ag.addColorStop(0,'transparent');
    ag.addColorStop(0.5,auroraC[ai]+(0.18+0.10*Math.sin(aPhase*1.3))+')');
    ag.addColorStop(1,'transparent');
    ctx.fillStyle=ag; ctx.fillRect(0,ay,W,ah);
  }
  _bHillSil(ctx, W, H, hf-0.10, '#8ab0d0', 0.4);
  _bHillSil(ctx, W, H, hf-0.04, '#a0c8e8', 0.7);
  // Snowy ground
  const ig=ctx.createLinearGradient(0,H*hf,0,H);
  ig.addColorStop(0,'#c8dff0'); ig.addColorStop(1,'#b0cce0');
  ctx.fillStyle=ig; ctx.fillRect(0,Math.floor(H*hf),W,H);
  // Snow sparkles
  for (let i=0;i<20;i++) {
    const sx=((i*173+31)%W), sy=Math.round(H*(hf+0.05+(i*97+13)%(Math.round(H*0.38))/H));
    const bright=0.4+0.5*Math.sin(t*0.005+i*1.1);
    ctx.fillStyle=`rgba(255,255,255,${bright.toFixed(2)})`; ctx.fillRect(sx,sy,2,2);
  }
  // Icicles from top of ground line
  for (let i=0;i<12;i++) {
    const ix=((i*97+41)%W), ih=4+(i%5)*3;
    ctx.fillStyle='#90c0e0'; ctx.fillRect(ix-1,Math.round(H*hf),2,ih);
    ctx.fillStyle='#c0e0f8'; ctx.fillRect(ix,Math.round(H*hf),1,ih-2);
  }
  // Ground line
  ctx.fillStyle='#80b8d8'; ctx.fillRect(0,Math.round(H*hf),W,1);
}

// ─── LIGHTNING battle arena ──────────────────────────────────────────────────
function _bbLightning(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();
  _bSkyGrad(ctx, W, H, '#06040e', '#100830', hf);
  _bStars(ctx, W, H, hf, 35);
  // Storm clouds (dark rolling masses)
  for (let ci=0;ci<4;ci++) {
    const cx2=((ci*211+37)%W)*1.0, cy2=Math.round(H*(0.08+ci*0.07));
    const cw=60+(ci%3)*30, ch=14+(ci%2)*8;
    ctx.fillStyle=`rgba(20,12,40,0.85)`; ctx.fillRect(Math.round(cx2-cw/2),cy2,cw,ch);
    ctx.fillStyle=`rgba(40,25,70,0.5)`; ctx.fillRect(Math.round(cx2-cw/2),cy2,cw,4);
  }
  // Ambient purple glow pulse in upper sky (matches lobby panel)
  ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t * 0.025);
  ctx.fillStyle = '#7744ff';
  ctx.fillRect(0, 0, W, Math.round(H * hf * 0.50));
  ctx.globalAlpha = 1;
  _bHillSil(ctx, W, H, hf-0.08, '#0c0a1c', 0.3);
  _bGroundGrad(ctx, W, H, '#14102a', '#08060e', hf);
  // Cracked earth
  for (let i=0;i<10;i++) {
    const cx2=((i*173+31)%W), cy2=Math.round(H*(hf+0.04+(i*97+13)%(Math.round(H*0.3))/H*H));
    ctx.strokeStyle='#1e1838'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx2,cy2); ctx.lineTo(cx2+(i%2?12:-12),cy2+(i%3)*4); ctx.stroke();
  }
  // Lightning arcs in sky
  if ((t%2200)<180) {
    const ax=Math.round(W*(0.3+((t/2200|0)%3)*0.2));
    ctx.strokeStyle='#ffffaa'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(ax,0);
    for (let seg=0;seg<5;seg++) ctx.lineTo(ax+(Math.sin(t+seg*7)*14),seg*H*hf/5);
    ctx.stroke();
    ctx.strokeStyle='rgba(200,180,255,0.3)'; ctx.lineWidth=8; ctx.stroke();
    // Ground impact glow
    ctx.fillStyle='rgba(220,200,80,0.3)';
    ctx.beginPath(); ctx.ellipse(ax,Math.round(H*hf),20,6,0,0,Math.PI*2); ctx.fill();
  }
  // Ground line
  ctx.fillStyle='#6040cc'; ctx.fillRect(0,Math.round(H*hf),W,1);
}

// ─── EARTH battle arena ──────────────────────────────────────────────────────
function _bbEarth(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();
  _bSkyGrad(ctx, W, H, '#08040a', '#1a0e04', hf);
  _bStars(ctx, W, H, hf, 30);
  // Flat-top mesa plateau silhouettes (Earth's signature look — matches lobby panel)
  ctx.fillStyle = '#150a02';
  ctx.beginPath();
  ctx.moveTo(0, Math.round(H*hf));
  ctx.lineTo(0, Math.round(H*(hf-0.22)));
  ctx.lineTo(Math.round(W*0.14), Math.round(H*(hf-0.22)));
  ctx.lineTo(Math.round(W*0.14), Math.round(H*(hf-0.32)));
  ctx.lineTo(Math.round(W*0.38), Math.round(H*(hf-0.32)));
  ctx.lineTo(Math.round(W*0.38), Math.round(H*(hf-0.20)));
  ctx.lineTo(Math.round(W*0.55), Math.round(H*(hf-0.20)));
  ctx.lineTo(Math.round(W*0.55), Math.round(H*(hf-0.28)));
  ctx.lineTo(Math.round(W*0.80), Math.round(H*(hf-0.28)));
  ctx.lineTo(Math.round(W*0.80), Math.round(H*(hf-0.16)));
  ctx.lineTo(W, Math.round(H*(hf-0.16)));
  ctx.lineTo(W, Math.round(H*hf));
  ctx.closePath(); ctx.fill();
  // Mesa top highlight (warm rim light)
  ctx.fillStyle = '#2a1008';
  [[0,0.22,0.14],[0.14,0.32,0.38],[0.38,0.20,0.55],[0.55,0.28,0.80],[0.80,0.16,1.00]].forEach(([x1,y1,x2])=>{
    ctx.fillRect(Math.round(W*x1), Math.round(H*(hf-y1)), Math.round(W*(x2-x1)), 2);
  });
  // Rocky ground
  _bGroundGrad(ctx, W, H, '#4a2c10', '#2a1808', hf);
  // Rock pebbles
  for (let i=0;i<14;i++) {
    const rx=((i*173+31)%W), ry=Math.round(H*(hf+0.05+(i*97+13)%(Math.round(H*0.35))/H*H));
    const rw=4+(i%5)*2, rh=3+(i%3);
    ctx.fillStyle=i%3===0?'#6a4020':i%3===1?'#5a3218':'#7a5030';
    ctx.fillRect(rx,ry,rw,rh);
    ctx.fillStyle='#8a6040'; ctx.fillRect(rx,ry,rw,1);
  }
  // Stone formations in background
  const stX=Math.round(W*0.15), stY=Math.round(H*(hf-0.12));
  [[0,0,14,20],[14,6,10,14],[24,3,8,17]].forEach(([dx,dy,sw,sh])=>{
    ctx.fillStyle='#4a2e10'; ctx.fillRect(stX+dx,stY+dy,sw,sh);
    ctx.fillStyle='#6a4828'; ctx.fillRect(stX+dx,stY+dy,sw,2);
  });
  // Ground line
  ctx.fillStyle='#8a5a20'; ctx.fillRect(0,Math.round(H*hf),W,1);
}

// ─── NATURE battle arena ─────────────────────────────────────────────────────
function _bbNature(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();
  _bSkyGrad(ctx, W, H, '#030c06', '#062010', hf);
  _bStars(ctx, W, H, hf, 30);
  _bHillSil(ctx, W, H, hf-0.12, '#041008', 0.4);
  _bHillSil(ctx, W, H, hf-0.05, '#072014', 0.7);
  // Pine tree silhouettes along hill line (matches lobby panel layered treeline)
  ctx.fillStyle = '#041005';
  for (let i = 0; i < 10; i++) {
    const tx = Math.round(((i*197+41)%997)/997 * W);
    const ty = Math.round(H*(hf-0.05));
    const tw = Math.round(W*0.055), th = Math.round(H*0.18);
    // Trunk
    ctx.fillRect(tx + Math.round(tw*0.44), ty - Math.round(th*0.5), Math.round(tw*0.12), Math.round(th*0.5));
    // Lower canopy
    ctx.beginPath();
    ctx.moveTo(tx + Math.round(tw*0.5), ty - th);
    ctx.lineTo(tx, ty - Math.round(th*0.40));
    ctx.lineTo(tx + tw, ty - Math.round(th*0.40));
    ctx.closePath(); ctx.fill();
    // Upper canopy
    ctx.beginPath();
    ctx.moveTo(tx + Math.round(tw*0.5), ty - Math.round(th*0.75));
    ctx.lineTo(tx + Math.round(tw*0.08), ty - Math.round(th*0.18));
    ctx.lineTo(tx + Math.round(tw*0.92), ty - Math.round(th*0.18));
    ctx.closePath(); ctx.fill();
  }
  // Rich green ground
  _bGroundGrad(ctx, W, H, '#1c4a10', '#0e2a08', hf);
  // Grass tufts
  for (let i=0;i<16;i++) {
    const gx=((i*173+31)%W), gy=Math.round(H*(hf+0.03+(i*97+13)%(Math.round(H*0.2))/H*H));
    ctx.fillStyle=i%3===0?'#2a5a14':i%3===1?'#224a10':'#1e4010';
    ctx.fillRect(gx,gy,3+(i%3),2);
    ctx.fillRect(gx+1,gy-1+(i%2),1,2);
  }
  // Waterfall mist (left edge)
  for (let wy=Math.round(H*0.30);wy<Math.round(H*hf);wy+=3) {
    const alpha=0.08+0.06*Math.sin(t*0.01+wy*0.1);
    ctx.fillStyle=`rgba(140,200,240,${alpha.toFixed(2)})`;
    ctx.fillRect(0+Math.round(Math.sin(wy*0.3+t*0.006)*3),wy,5,3);
  }
  // Fireflies
  for (let i=0;i<6;i++) {
    const fx=((i*211+53)%W), phase=(t*0.0008+i*0.55)%1;
    const fy=Math.round(H*(0.40+Math.sin(t*0.001+i)*0.08));
    const glow=Math.sin(t*0.006+i*1.3);
    if(glow>0.2) { ctx.fillStyle=`rgba(180,240,100,${(glow*0.6).toFixed(2)})`; ctx.fillRect(fx,fy,2,2); }
  }
  // Ground line
  ctx.fillStyle='#4a8a20'; ctx.fillRect(0,Math.round(H*hf),W,1);
}

// ─── PLASMA battle arena ─────────────────────────────────────────────────────
function _bbPlasma(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();
  _bSkyGrad(ctx, W, H, '#08020e', '#180330', hf);
  _bStars(ctx, W, H, hf, 45);
  // Void planet/orb in sky (matches lobby panel)
  const orbX=Math.round(W*0.65), orbY=Math.round(H*0.20), orbR=Math.max(6,Math.round(W*0.055));
  const orbG=ctx.createRadialGradient(orbX-Math.round(orbR*0.3),orbY-Math.round(orbR*0.3),0,orbX,orbY,orbR);
  orbG.addColorStop(0,'#9933cc'); orbG.addColorStop(0.6,'#550088'); orbG.addColorStop(1,'#220044');
  ctx.fillStyle=orbG; ctx.beginPath(); ctx.arc(orbX,orbY,orbR,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(200,80,255,0.35)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(orbX,orbY,Math.round(orbR*1.5),Math.round(orbR*0.35),-0.3,0,Math.PI*2); ctx.stroke();
  // Phase shimmer on horizon
  const phg=ctx.createLinearGradient(0,H*hf-14,0,H*hf+6);
  phg.addColorStop(0,'rgba(180,20,220,0.3)'); phg.addColorStop(1,'rgba(180,20,220,0)');
  ctx.fillStyle=phg; ctx.fillRect(0,H*hf-14,W,20);
  _bHillSil(ctx, W, H, hf-0.10, '#100220', 0.4);
  _bGroundGrad(ctx, W, H, '#1e0430', '#0e0218', hf);
  // Crystal veins
  for (let i=0;i<10;i++) {
    const vx=((i*173+31)%W), vy=Math.round(H*(hf+0.04+(i*97+13)%(Math.round(H*0.35))/H*H));
    const glow=0.3+0.4*Math.sin(t*0.006+i*1.1);
    ctx.fillStyle=`rgba(${i%2?180:120},30,${i%2?255:180},${glow.toFixed(2)})`;
    ctx.fillRect(vx,vy,3+(i%3),2);
  }
  // Floating orbs
  for (let i=0;i<4;i++) {
    const ox=Math.round(W*(0.15+i*0.22)), oy=Math.round(H*(0.25+Math.sin(t*0.001+i*1.4)*0.06));
    const glow=0.5+0.4*Math.sin(t*0.005+i);
    ctx.fillStyle=`rgba(180,60,255,${(glow*0.4).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(ox,oy,5+i%2*2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(220,120,255,0.6)'; ctx.fillRect(ox-1,oy-1,2,2);
  }
  // Ground line
  ctx.fillStyle='#aa30ee'; ctx.fillRect(0,Math.round(H*hf),W,1);
}

// ─── AIR battle arena ────────────────────────────────────────────────────────
function _bbAir(ctx, W, H) {
  const t = _bBGtick(), hf = _horizonFrac();

  // Night sky — full canvas
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   '#03050d');
  sky.addColorStop(0.55,'#07101e');
  sky.addColorStop(1,   '#0d1a2e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // Stars (deterministic)
  const ss=[17,31,53,79,101,127,149,163,193,211,233,251,269,281,307,331];
  ss.forEach((s,i)=>{
    const sx=(s*37+i*83)%W, sy=(s*53+i*61)%(H*0.90);
    ctx.fillStyle=`rgba(215,228,255,${(0.30+i%5*0.13).toFixed(2)})`;
    ctx.fillRect(sx,sy,i%7===0?2:1,i%7===0?2:1);
  });

  // Moon
  const mx=Math.round(W*0.86), my=Math.round(H*0.09);
  ctx.fillStyle='#ddeeff'; ctx.fillRect(mx-6,my-6,12,12);
  ctx.fillStyle='#060e1c'; ctx.fillRect(mx+2,my-5,5,10);

  // Distant mountain range visible through sky (matches lobby panel)
  ctx.fillStyle = '#0c1420';
  ctx.beginPath();
  ctx.moveTo(0, Math.round(H*0.68));
  ctx.lineTo(Math.round(W*0.08), Math.round(H*0.38));
  ctx.lineTo(Math.round(W*0.20), Math.round(H*0.50));
  ctx.lineTo(Math.round(W*0.34), Math.round(H*0.22));
  ctx.lineTo(Math.round(W*0.46), Math.round(H*0.36));
  ctx.lineTo(Math.round(W*0.60), Math.round(H*0.28));
  ctx.lineTo(Math.round(W*0.72), Math.round(H*0.44));
  ctx.lineTo(Math.round(W*0.86), Math.round(H*0.32));
  ctx.lineTo(W, Math.round(H*0.48));
  ctx.lineTo(W, Math.round(H*0.68));
  ctx.closePath(); ctx.fill();
  // Snow highlights on peaks (matches lobby panel)
  ctx.fillStyle = '#1e2e40'; ctx.globalAlpha = 0.5;
  [[0.34,0.22,0.44,0.34],[0.60,0.28,0.70,0.38],[0.08,0.38,0.14,0.48]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath();
    ctx.moveTo(Math.round(W*x1), Math.round(H*y1));
    ctx.lineTo(Math.round(W*((x1+x2)/2-0.04)), Math.round(H*(y1*0.82)));
    ctx.lineTo(Math.round(W*x2), Math.round(H*y2));
    ctx.closePath(); ctx.fill();
  });
  ctx.globalAlpha = 1;
  // Wind particle streaks (matches lobby panel)
  for (let i = 0; i < 5; i++) {
    const wp = (t * 0.00014 + i * 0.22) % 1;
    const wy2 = Math.round(H * (0.50 + (i * 0.07) % 0.18));
    const wx2 = Math.round(wp * W * 1.3 - W * 0.15);
    ctx.globalAlpha = (1 - wp) * 0.10;
    ctx.fillStyle = '#aaccee';
    ctx.fillRect(wx2, wy2, Math.round(W * 0.12), 1);
  }
  ctx.globalAlpha = 1;
  // Player cloud platform (left — pushed to edge)
  const pcy = Math.round(H * 0.68);
  _bbCloudPad(ctx, Math.round(W*0.17), pcy, 110, 28, true);

  // Enemy cloud platform (right — pushed to other edge, clear sky gap between)
  const ecy = Math.round(H * 0.64);
  _bbCloudPad(ctx, Math.round(W*0.80), ecy, 95, 24, false);
}

function _bbCloudPad(ctx, cx, cy, w, h, bright) {
  const base = bright ? '#c0d8f4' : '#5a7898';
  const mid  = bright ? '#a8c8e8' : '#4a6880';
  const top  = bright ? '#e8f4ff' : '#80a8c8';
  const shad = bright ? 'rgba(80,120,180,0.18)' : 'rgba(10,25,55,0.40)';

  const l = cx - Math.round(w/2);
  const bodyTop = cy + Math.round(h * 0.45);
  const bodyH   = Math.round(h * 0.55);

  ctx.fillStyle = shad;
  ctx.fillRect(l + 4, cy + h + 3, w - 4, 4);

  ctx.fillStyle = mid;
  ctx.fillRect(l, bodyTop, w, bodyH);

  const bumpDefs = w > 70
    ? [{ox:0.08,bw:0.28,bh:0.72},{ox:0.30,bw:0.24,bh:0.55},{ox:0.50,bw:0.30,bh:0.82},{ox:0.72,bw:0.22,bh:0.58}]
    : [{ox:0.10,bw:0.38,bh:0.72},{ox:0.42,bw:0.30,bh:0.58},{ox:0.66,bw:0.28,bh:0.68}];

  bumpDefs.forEach(({ox,bw,bh})=>{
    const bx = l + Math.round(ox * w);
    const bwPx = Math.round(bw * w);
    const bhPx = Math.round(bh * h * 0.6);
    const bTop = bodyTop - bhPx;
    ctx.fillStyle = base;
    ctx.fillRect(bx, bTop + 2, bwPx, bhPx + bodyH - 2);
    ctx.fillStyle = top;
    ctx.fillRect(bx + 1, bTop, bwPx - 2, 2);
    ctx.fillStyle = base;
    ctx.fillRect(bx - 1, bTop + 2, 1, bhPx - 2);
    ctx.fillRect(bx + bwPx, bTop + 2, 1, bhPx - 2);
  });

  ctx.fillStyle = top;
  ctx.fillRect(l + 1, bodyTop, w - 2, 1);
}

function drawBattleBG(ctx, W, H) {
  const el = (typeof currentZoneElement !== 'undefined' && currentZoneElement) ? currentZoneElement : ((typeof playerElement !== 'undefined') ? playerElement : 'Earth');
  switch(el) {
    case 'Fire':      _bbFire(ctx, W, H);      break;
    case 'Water':     _bbWater(ctx, W, H);     break;
    case 'Ice':       _bbIce(ctx, W, H);       break;
    case 'Lightning': _bbLightning(ctx, W, H); break;
    case 'Earth':     _bbEarth(ctx, W, H);     break;
    case 'Nature':    _bbNature(ctx, W, H);    break;
    case 'Plasma':    _bbPlasma(ctx, W, H);    break;
    case 'Air':       _bbAir(ctx, W, H);       break;
    default:          _bbEarth(ctx, W, H);     break;
  }
}

// ═══ CHARACTER SPRITE SELECTOR ════════════════════════════════════════════════
function getPlayerCharSprite(charId) {
  const id = charId !== undefined ? charId
           : (typeof playerCharId !== 'undefined' ? playerCharId : 'arcanist');
  if (id === 'battlemage' || id === 'warrior') return SPRITE_CHAR_WARRIOR;
  if (id === 'hexblade'   || id === 'rogue')   return SPRITE_CHAR_ROGUE;
  return SPRITE_CHAR_MAGE;
}

// ═══ POSITIONS ════════════════════════════════════════════════════════════════
const P_SCALE = 4;
const E_SCALE = 3;
const S_SCALE = 3;

// Ground line is at H * 0.55 (hf in BG functions).
// Player stands close-left: bottom at H * 0.90 (deep foreground).
// Enemy stands mid-right: bottom at H * 0.72 (mid-ground — slightly behind, still clearly on earth).
// Multiple enemies fan out along the mid-ground line with slight Y stagger for depth.

function playerSpritePos(W, H) {
  const rows = getPlayerCharSprite();
  const sw = 24 * P_SCALE, sh = rows.length * P_SCALE;
  const groundBottom = Math.round(H * 0.90);
  return { x: Math.round(W * 0.14), y: groundBottom - sh, w: sw, h: sh };
}

function getEnemySprite(e) {
  const el = (e && e.element) || '';
  if (el === 'Fire' || el === 'Lightning') return SPRITE_WIZ_A;
  if (el === 'Water' || el === 'Ice')      return SPRITE_WIZ_B;
  if (el === 'Earth' || el === 'Nature')   return SPRITE_WIZ_C;
  if (el === 'Plasma' || el === 'Air')     return SPRITE_WIZ_D;
  return SPRITE_WIZ_A; // fallback
}

function enemySpritePos(idx, allEnemies, W, H) {
  const n = allEnemies.length;
  const e = allEnemies[idx];
  const rows = getEnemySprite(e);
  const sw = 24 * E_SCALE, sh = rows.length * E_SCALE;

  // Spread enemies across canvas — center-right + higher in deck mode
  const isDeck = typeof player !== 'undefined' && player.deckMode;
  const areaX = isDeck ? W * 0.42 : W * 0.42;
  const areaW = isDeck ? W * 0.36 : W * 0.52;
  const xFrac = n <= 1 ? 0.5 : idx / Math.max(n - 1, 1);
  // Alternate depth: even-idx slightly further back (higher Y), odd slightly closer
  const depthOffset = n > 1 ? (idx % 2 === 0 ? 0 : Math.round(H * 0.06)) : 0;
  const groundBottom = isDeck
    ? Math.round(H * (_horizonFrac() + 0.1)) + depthOffset
    : Math.round(H * 0.72) + depthOffset;

  return {
    x: Math.round(areaX + xFrac * (areaW - sw)),
    y: groundBottom - sh,
    w: sw, h: sh, rows,
  };
}

function summonSpritePos(idx, W, H) {
  const sw = 12 * S_SCALE, sh = SPRITE_TREANT.length * S_SCALE;
  // Summons stand just to the right of player, on same foreground plane
  const groundBottom = Math.round(H * 0.90);
  return { x: Math.round(W * 0.26 + idx * (sw + 6)), y: groundBottom - sh, w: sw, h: sh };
}

// ═══ HIT FLASH ════════════════════════════════════════════════════════════════
function triggerHitFlash(defenderSide, enemyIdx) {
  if (!combat.hitFlashes) combat.hitFlashes = [];
  combat.hitFlashes.push({
    side: defenderSide,
    idx: (enemyIdx !== undefined) ? enemyIdx : combat.activeEnemyIdx,
    frames: 10,
    color: defenderSide === 'player' ? '#FF3322' : '#FFAA33',
  });
}

// Draws a perspective ground band from horizon line to player ground line (H*0.90)
// Zone-tinted so it blends with the background scene
function _drawBattleForeground(ctx, W, H) {
  const el  = (typeof currentZoneElement !== 'undefined' && currentZoneElement) ? currentZoneElement : ((typeof playerElement !== 'undefined') ? playerElement : 'Earth');
  const eY  = Math.round(H * _horizonFrac());
  const pY  = Math.round(H * 0.90);
  const fh  = pY - eY;
  const tk  = Date.now();

  // ── Ground gradient ──────────────────────────────────────────────────────────
  const grads = {
    Fire:      ['#180602', '#200a04', '#180402'],
    Water:     ['#1a3858', '#0e2640', '#0a1e30'],
    Ice:       ['#b8d4ec', '#cce0f4', '#a8c8e0'],
    Lightning: ['#100e24', '#18162e', '#0c0a1a'],
    Earth:     ['#3d2208', '#522e10', '#3a2008'],
    Nature:    ['#0e2808', '#1a3e0c', '#122e06'],
    Plasma:    ['#180330', '#200438', '#100224'],
    Air:       ['#8898b4', '#9aaac4', '#7888a4'],
  };
  const gc = grads[el] || grads.Earth;
  const gg = ctx.createLinearGradient(0, eY, 0, pY);
  gg.addColorStop(0, gc[0]); gg.addColorStop(0.5, gc[1]); gg.addColorStop(1, gc[2]);
  ctx.fillStyle = gg; ctx.fillRect(0, eY, W, fh);

  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, eY, W, 1);

  // ── Zone-specific foreground ─────────────────────────────────────────────────
  switch (el) {

    case 'Fire': {
      // Surface volcanic rock chunks
      for (let i = 0; i < 28; i++) {
        const rx = ((i * 173 + 31) % W);
        const ry = eY + Math.round(((i * 97 + 13) % 90) / 90 * fh * 0.85);
        const rw = 4 + (i % 5) * 2;
        ctx.fillStyle = i%3===0?'#2a0e04':i%3===1?'#1e0a02':'#300e04';
        ctx.fillRect(rx, ry, rw, 2 + i%3);
        ctx.fillStyle = '#3a1006'; ctx.fillRect(rx, ry, rw, 1);
      }
      // Lava crack fissures
      for (let i = 0; i < 7; i++) {
        const cx = ((i * 211 + 53) % W);
        const cy = eY + Math.round((0.12 + i * 0.10) * fh);
        const len = 20 + (i % 4) * 12;
        const glow = 0.4 + 0.4 * Math.sin(tk * 0.008 + i);
        ctx.strokeStyle = `rgba(255,${Math.round(50+40*glow)},0,${glow.toFixed(2)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (i%2?len:-len)*0.7, cy + 3 + i%3); ctx.stroke();
        ctx.strokeStyle = `rgba(255,${Math.round(20+30*glow)},0,${(glow*0.45).toFixed(2)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx+(i%2?4:-4), cy+2); ctx.lineTo(cx+(i%2?len*0.4:-len*0.4), cy+6); ctx.stroke();
        ctx.fillStyle = `rgba(255,${Math.round(80+60*glow)},0,${(glow*0.6).toFixed(2)})`;
        ctx.fillRect(cx-1, cy-1, 3, 3);
      }
      // Foreground volcanic rocks
      [[W*0.22,pY-6],[W*0.50,pY-8],[W*0.75,pY-5],[W*0.88,pY-7]].forEach(([rx,ry]) => {
        ctx.fillStyle = '#1c0806'; ctx.fillRect(Math.round(rx)-7, Math.round(ry)-4, 14, 7);
        ctx.fillStyle = '#280e08'; ctx.fillRect(Math.round(rx)-7, Math.round(ry)-4, 14, 2);
        ctx.fillStyle = `rgba(255,60,0,${(0.3+0.2*Math.sin(tk*0.007+rx)).toFixed(2)})`;
        ctx.fillRect(Math.round(rx)-2, Math.round(ry), 5, 1);
      });
      // Ash drift
      for (let i = 0; i < 8; i++) {
        const ap = (tk * 0.0003 + i * 0.17) % 1;
        const ax = ((i * 197 + 23) % W) + Math.round(Math.sin(tk * 0.001 + i) * 5);
        const ay = eY + Math.round(ap * fh * 0.9);
        const aa = Math.sin(ap * Math.PI) * 0.30;
        if (aa < 0.04) continue;
        ctx.fillStyle = `rgba(70,35,15,${aa.toFixed(2)})`; ctx.fillRect(ax, ay, 2, 1);
      }
      break;
    }

    case 'Water': {
      // Sandy beach — gradient from wet (top) to dry sand (bottom)
      const sandG = ctx.createLinearGradient(0, eY, 0, pY);
      sandG.addColorStop(0, '#1a3050'); sandG.addColorStop(0.4, '#7a6a38'); sandG.addColorStop(1, '#c0a850');
      ctx.fillStyle = sandG; ctx.fillRect(0, eY, W, fh);
      // Sand grain texture
      for (let i = 0; i < 35; i++) {
        const sx = ((i * 173 + 41) % W);
        const sy = eY + Math.round(((i * 97 + 7) % 90) / 90 * fh);
        ctx.fillStyle = i%4===0?'rgba(180,160,80,0.3)':'rgba(100,80,30,0.2)';
        ctx.fillRect(sx, sy, 2 + i%3, 1);
      }
      // Wet sand shimmer band
      const wetY = eY + Math.round(fh * 0.35);
      const wetG = ctx.createLinearGradient(0, wetY, 0, wetY + Math.round(fh * 0.18));
      wetG.addColorStop(0, 'rgba(60,120,180,0.25)'); wetG.addColorStop(1, 'rgba(60,120,180,0)');
      ctx.fillStyle = wetG; ctx.fillRect(0, wetY, W, Math.round(fh * 0.18));
      // Tide wave lines
      for (let i = 0; i < 4; i++) {
        const wy = wetY + i * Math.round(fh * 0.04);
        const phase = tk * 0.002 + i * 0.9;
        ctx.fillStyle = `rgba(100,180,220,${(0.14-i*0.03).toFixed(2)})`;
        for (let x = 0; x < W; x++) { if (Math.sin(x*0.05+phase) > 0.75) ctx.fillRect(x, wy, 1, 2); }
      }
      // Shells and pebbles
      [[W*0.15,pY-5],[W*0.38,pY-4],[W*0.55,pY-6],[W*0.70,pY-4],[W*0.85,pY-5]].forEach(([rx,ry],i) => {
        ctx.fillStyle = i%2===0?'#c8b060':'#e0c880';
        ctx.beginPath(); ctx.ellipse(Math.round(rx), Math.round(ry), 4+i%3, 2, 0, 0, Math.PI*2); ctx.fill();
      });
      break;
    }

    case 'Ice': {
      // Snow surface
      const snowG = ctx.createLinearGradient(0, eY, 0, pY);
      snowG.addColorStop(0,'#a8c4dc'); snowG.addColorStop(0.5,'#c0d8f0'); snowG.addColorStop(1,'#d8ecff');
      ctx.fillStyle = snowG; ctx.fillRect(0, eY, W, fh);
      // Snow sparkle
      for (let i = 0; i < 40; i++) {
        const sx = ((i*173+31)%W), sy = eY + Math.round(((i*97+13)%90)/90*fh);
        const bright = 0.3 + 0.5*Math.sin(tk*0.005+i*0.9);
        ctx.fillStyle = `rgba(255,255,255,${bright.toFixed(2)})`;
        ctx.fillRect(sx, sy, i%9===0?3:2, i%9===0?3:2);
      }
      // Horizon icicles
      for (let i = 0; i < 18; i++) {
        const ix = ((i*97+41)%W), ih = 5 + (i%6)*3;
        ctx.fillStyle = 'rgba(140,200,230,0.75)'; ctx.fillRect(ix-1, eY, 2, ih);
        ctx.fillStyle = 'rgba(200,235,255,0.55)'; ctx.fillRect(ix, eY, 1, ih-2);
      }
      // Ice crack patterns on surface
      for (let i = 0; i < 10; i++) {
        const icx = ((i*211+41)%W), icy = eY + Math.round(((i*89+17)%85)/85*fh*0.7);
        ctx.strokeStyle = 'rgba(160,210,240,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(icx, icy); ctx.lineTo(icx+(i%2?14:-12), icy+5+i%4); ctx.stroke();
      }
      // Foreground snow drifts
      [[W*0.10,pY],[W*0.40,pY],[W*0.65,pY],[W*0.90,pY]].forEach(([dx,dy]) => {
        const dg = ctx.createRadialGradient(Math.round(dx), Math.round(dy), 2, Math.round(dx), Math.round(dy), Math.round(W*0.09));
        dg.addColorStop(0,'rgba(240,250,255,0.5)'); dg.addColorStop(1,'transparent');
        ctx.fillStyle = dg; ctx.fillRect(Math.round(dx)-Math.round(W*0.09), Math.round(dy)-10, Math.round(W*0.18), 18);
      });
      break;
    }

    case 'Lightning': {
      // Scorched cracked earth
      for (let i = 0; i < 22; i++) {
        const rx = ((i*173+31)%W), ry = eY + Math.round(((i*97+13)%90)/90*fh*0.85);
        ctx.strokeStyle = '#1e1838'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx+(i%2?(5+i%5)*3:-(5+i%5)*3)*0.6, ry+2+i%3); ctx.stroke();
      }
      // Electric ground veins
      for (let i = 0; i < 5; i++) {
        const vx = ((i*211+53)%W), vy = eY + Math.round((0.12+i*0.14)*fh);
        const glow = 0.35 + 0.4*Math.sin(tk*0.009+i*1.3);
        ctx.strokeStyle = `rgba(200,180,255,${glow.toFixed(2)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(vx, vy);
        for (let s=0;s<5;s++) ctx.lineTo(vx+(i%2?1:-1)*s*8, vy+s*2+((s*7+i)%3));
        ctx.stroke();
        if ((tk%900)<140) { ctx.fillStyle=`rgba(220,200,60,${(glow*0.7).toFixed(2)})`; ctx.fillRect(vx-1,vy-1,3,3); }
      }
      // Broken rubble
      [[W*0.18,pY-6],[W*0.45,pY-9],[W*0.68,pY-6],[W*0.84,pY-7]].forEach(([rx,ry]) => {
        ctx.fillStyle='#1a1630'; ctx.fillRect(Math.round(rx)-6,Math.round(ry)-3,12,6);
        ctx.fillStyle='#24203c'; ctx.fillRect(Math.round(rx)-6,Math.round(ry)-3,12,2);
      });
      // Rain streaks
      for (let i = 0; i < 14; i++) {
        const rp = (tk*0.0013+i*0.14)%1, rx2 = ((i*211+57)%W);
        const ry2 = eY + Math.round(rp*fh*1.1);
        const ra = Math.sin(rp*Math.PI)*0.18;
        if (ra < 0.02 || ry2 > pY) continue;
        ctx.fillStyle=`rgba(140,160,220,${ra.toFixed(2)})`; ctx.fillRect(rx2, ry2, 1, 5);
      }
      break;
    }

    case 'Earth': {
      // Rocky soil
      for (let i = 0; i < 30; i++) {
        const rx = ((i*173+31)%W), ry = eY + Math.round(((i*97+13)%90)/90*fh*0.85);
        const rw = 5+(i%6)*3, rh = 3+(i%3);
        ctx.fillStyle = i%3===0?'#6a4020':i%3===1?'#5a3218':'#7a5030';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle='#8a6040'; ctx.fillRect(rx, ry, rw, 1);
        ctx.fillStyle='#2a1008'; ctx.fillRect(rx+rw, ry, 2, rh);
      }
      // Rock strata lines
      for (let i = 0; i < 3; i++) {
        const sy = eY + Math.round(fh*(0.22+i*0.20));
        ctx.strokeStyle='rgba(40,20,8,0.30)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(W*(0.7+0.2*Math.sin(i*1.9)), sy); ctx.stroke();
      }
      // Foreground rocks
      [[W*0.12,pY-7],[W*0.35,pY-10],[W*0.60,pY-7],[W*0.80,pY-9],[W*0.92,pY-6]].forEach(([rx,ry],i) => {
        const rw2=10+i*3, rh2=5+i*2;
        ctx.fillStyle=i%2===0?'#5a3818':'#4a2c10';
        ctx.fillRect(Math.round(rx)-Math.round(rw2/2), Math.round(ry)-rh2, rw2, rh2);
        ctx.fillStyle='#7a5030'; ctx.fillRect(Math.round(rx)-Math.round(rw2/2), Math.round(ry)-rh2, rw2, 2);
        ctx.fillStyle='#2a1808'; ctx.fillRect(Math.round(rx)+Math.round(rw2/2)-2, Math.round(ry)-rh2, 2, rh2);
      });
      // Dust drift
      for (let i = 0; i < 5; i++) {
        const dp=(tk*0.0005+i*0.22)%1, dx2=Math.round(dp*(W+40)-20);
        const dy2=eY+Math.round(fh*(0.55+(i*0.08)%0.30));
        ctx.fillStyle=`rgba(140,90,40,${(Math.sin(dp*Math.PI)*0.18).toFixed(2)})`;
        ctx.fillRect(dx2, dy2, 6+i*2, 1);
      }
      break;
    }

    case 'Nature': {
      // Layered forest floor
      const ngG = ctx.createLinearGradient(0, eY, 0, pY);
      ngG.addColorStop(0,'#0e2808'); ngG.addColorStop(0.35,'#1a3e0c'); ngG.addColorStop(0.7,'#1e4a10'); ngG.addColorStop(1,'#162e08');
      ctx.fillStyle = ngG; ctx.fillRect(0, eY, W, fh);
      // Ground mist at horizon
      const mistG = ctx.createLinearGradient(0, eY, 0, eY+Math.round(fh*0.22));
      mistG.addColorStop(0,'rgba(140,200,160,0.20)'); mistG.addColorStop(1,'rgba(100,180,130,0)');
      ctx.fillStyle=mistG; ctx.fillRect(0,eY,W,Math.round(fh*0.22));
      // Moss / ground cover
      for (let i=0;i<30;i++) {
        const mx=((i*173+31)%W), my=eY+Math.round(((i*97+13)%90)/90*fh*0.80);
        ctx.fillStyle=i%3===0?'#264a14':i%3===1?'#1e3e10':'#2e5618';
        ctx.fillRect(mx, my, 3+i%4, 2);
      }
      // Scattered grass blades at multiple depths
      for (let i=0;i<36;i++) {
        const gx=Math.round(((i*263+17)%997)/997*W);
        const gy=eY+Math.round(((i*89+11)%88)/88*fh*0.78);
        const gh=4+(i%5)*2;
        ctx.fillStyle=i%4===0?'#3a6a1a':i%4===1?'#2e5a14':i%4===2?'#264e10':'#1e4010';
        ctx.fillRect(gx,   gy-gh, 1, gh);
        ctx.fillRect(gx+2, gy-Math.round(gh*0.8), 1, Math.round(gh*0.8));
        ctx.fillRect(gx+4, gy-Math.round(gh*1.1), 1, Math.round(gh*1.1));
      }
      // Mossy stones
      [[W*0.08,pY-5],[W*0.30,pY-6],[W*0.52,pY-5],[W*0.72,pY-7],[W*0.90,pY-5]].forEach(([sx,sy]) => {
        ctx.fillStyle='#2a3e18'; ctx.fillRect(Math.round(sx)-5,Math.round(sy)-3,10,6);
        ctx.fillStyle='#3a5824'; ctx.fillRect(Math.round(sx)-5,Math.round(sy)-3,10,2);
      });
      // Foreground tall grass tufts
      for (let i=0;i<18;i++) {
        const gx2=Math.round(((i*211+37)%997)/997*W), gy2=pY-2, gh2=8+(i%6)*3;
        ctx.fillStyle=i%3===0?'#3a6a1a':'#2e5618';
        ctx.fillRect(gx2, gy2-gh2, 1, gh2);
        ctx.fillRect(gx2+2, gy2-Math.round(gh2*1.2), 1, Math.round(gh2*1.2));
      }
      // Fireflies
      for (let i=0;i<6;i++) {
        const fx=((i*211+37)%W);
        const fy=eY+Math.round(fh*0.25)+Math.round(Math.sin(tk*0.002+i*1.4)*Math.round(fh*0.12));
        const glow=0.4+0.55*Math.sin(tk*0.007+i*1.3);
        if(glow>0.5){ctx.fillStyle=`rgba(180,255,80,${(glow*0.75).toFixed(2)})`;ctx.fillRect(fx,fy,2,2);}
      }
      break;
    }

    case 'Plasma': {
      // Crystal floor veins
      for (let i=0;i<18;i++) {
        const vx=((i*173+31)%W), vy=eY+Math.round(((i*97+13)%90)/90*fh*0.80);
        const glow=0.35+0.4*Math.sin(tk*0.006+i*1.2);
        ctx.fillStyle=`rgba(${i%2?190:130},40,255,${glow.toFixed(2)})`;
        ctx.fillRect(vx, vy, 10+(i%5)*4, 2);
      }
      // Void ground rifts
      for (let i=0;i<6;i++) {
        const rfx=((i*197+53)%W), rfy=eY+Math.round((0.10+i*0.12)*fh);
        const rfg=0.4+0.4*Math.sin(tk*0.006+i*1.4);
        ctx.strokeStyle=`rgba(200,60,255,${rfg.toFixed(2)})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(rfx,rfy); ctx.lineTo(rfx+16+i*4,rfy+3); ctx.stroke();
        ctx.fillStyle=`rgba(220,80,255,${(rfg*0.4).toFixed(2)})`; ctx.fillRect(rfx,rfy,18+i*4,2);
      }
      // Orbiting motes low on ground
      for (let i=0;i<5;i++) {
        const angle=tk*0.001*(1+i*0.15)+i*1.26;
        const ox=Math.round(W*0.5+Math.cos(angle)*W*0.38);
        const oy=eY+Math.round(fh*(0.4+Math.sin(angle*0.5)*0.15));
        const oa=0.4+0.4*Math.sin(tk*0.007+i);
        if(ox<0||ox>W||oy<eY||oy>pY) continue;
        ctx.fillStyle=`rgba(${i%2?200:140},40,255,${oa.toFixed(2)})`; ctx.fillRect(ox,oy,3,3);
      }
      // Foreground crystal spires
      [[W*0.10,pY-4],[W*0.38,pY-6],[W*0.62,pY-5],[W*0.88,pY-4]].forEach(([cx,cy],ci) => {
        const cg=0.5+0.4*Math.sin(tk*0.005+ci);
        ctx.fillStyle=`rgba(${ci%2?180:140},60,255,${cg.toFixed(2)})`;
        for(let row=0;row<8;row++){const cw=Math.max(1,3-Math.round(row/3));ctx.fillRect(Math.round(cx)-cw,Math.round(cy)-row,cw*2,1);}
      });
      break;
    }

    case 'Air': {
      // Wispy cloud wisps across the battlefield floor
      for (let i=0;i<5;i++) {
        const cp=(tk*0.00025+i*0.22)%1;
        const cx2=Math.round(cp*(W+100)-50), cy2=eY+Math.round(fh*(0.08+(i*0.16)%0.5));
        const cw2=50+i*18;
        const clg=ctx.createLinearGradient(cx2,cy2,cx2,cy2+14);
        clg.addColorStop(0,`rgba(180,200,230,${(0.14-i*0.02).toFixed(2)})`); clg.addColorStop(1,'transparent');
        ctx.fillStyle=clg; ctx.fillRect(Math.round(cx2),cy2,cw2,14);
        ctx.fillRect(Math.round(cx2)+6,cy2-5,cw2-12,8);
      }
      // Stars visible through cloud gaps
      for (let i=0;i<10;i++) {
        const sx2=((i*173+51)%W), sy2=eY+Math.round(((i*97+11)%80)/80*fh*0.55);
        const bright=0.15+0.2*Math.sin(tk*0.004+i*0.8);
        ctx.fillStyle=`rgba(220,230,255,${bright.toFixed(2)})`; ctx.fillRect(sx2,sy2,1,1);
      }
      // Wind streaks
      for (let i=0;i<5;i++) {
        const wp=(tk*0.00014+i*0.22)%1, wy2=eY+Math.round(fh*(0.55+(i*0.09)%0.32));
        const wx2=Math.round(wp*W*1.3-W*0.15);
        ctx.globalAlpha=(1-wp)*0.10; ctx.fillStyle='#c0d4f0';
        ctx.fillRect(wx2, wy2, Math.round(W*0.12), 1);
      }
      ctx.globalAlpha=1;
      break;
    }
  }

  ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(0, pY-1, W, 1);
}

// ═══ FLOATING AURA (deck mode) ════════════════════════════════════════════════
// Drawn beneath the enemy sprite when they're levitating above the horizon.
function _drawFloatAura(ctx, cx, cy, r, element, t) {
  const el = (element || '').split('/')[0];
  ctx.save();

  switch (el) {
    case 'Fire': {
      // Pulsing ember ring
      const pulse = 0.55 + 0.3 * Math.sin(t * 0.11);
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, `rgba(255,120,0,${pulse})`);
      g.addColorStop(0.55, `rgba(220,50,0,${pulse * 0.6})`);
      g.addColorStop(1, 'rgba(180,20,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      // Ember sparks orbiting
      for (let i = 0; i < 5; i++) {
        const a = (t * 0.04 + i * 1.26) % (Math.PI * 2);
        const sx = cx + Math.cos(a) * r * 0.8, sy = cy + Math.sin(a) * r * 0.22;
        const bright = 0.5 + 0.5 * Math.sin(t * 0.09 + i * 1.7);
        ctx.fillStyle = `rgba(255,${Math.round(80 + 80 * bright)},0,${bright.toFixed(2)})`;
        ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
      }
      break;
    }
    case 'Water': {
      // Rippling water rings
      for (let ring = 0; ring < 3; ring++) {
        const phase = ((t * 0.05 + ring * 0.7) % 1);
        const rr = r * (0.4 + phase * 0.6);
        const alpha = (1 - phase) * 0.55;
        ctx.strokeStyle = `rgba(80,180,220,${alpha.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    case 'Ice': {
      // Snowflake arms radiating out
      const numArms = 6;
      ctx.strokeStyle = `rgba(180,230,255,0.7)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < numArms; i++) {
        const a = (i / numArms) * Math.PI * 2 + t * 0.012;
        const x1 = cx + Math.cos(a) * r * 0.15, y1 = cy + Math.sin(a) * r * 0.04;
        const x2 = cx + Math.cos(a) * r * 0.9,  y2 = cy + Math.sin(a) * r * 0.24;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // crossbars
        const mx = cx + Math.cos(a) * r * 0.55, my = cy + Math.sin(a) * r * 0.15;
        const pa = a + Math.PI * 0.5;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(pa) * r * 0.12, my + Math.sin(pa) * r * 0.03);
        ctx.lineTo(mx - Math.cos(pa) * r * 0.12, my - Math.sin(pa) * r * 0.03);
        ctx.stroke();
      }
      // Glow disk
      const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
      ig.addColorStop(0, 'rgba(200,240,255,0.35)'); ig.addColorStop(1, 'rgba(160,210,255,0)');
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.5, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'Lightning': {
      // Electric arc ring with crackling spokes
      const arcAlpha = 0.5 + 0.4 * Math.sin(t * 0.18);
      ctx.strokeStyle = `rgba(180,160,255,${arcAlpha.toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.26, 0, 0, Math.PI * 2); ctx.stroke();
      // Lightning spokes
      for (let i = 0; i < 6; i++) {
        if ((t + i * 7) % 12 > 4) continue;
        const a = (i / 6) * Math.PI * 2 + t * 0.03;
        ctx.strokeStyle = `rgba(220,210,255,0.85)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.05);
        ctx.lineTo(cx + Math.cos(a + 0.15) * r * 0.7, cy + Math.sin(a + 0.15) * r * 0.18);
        ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.25);
        ctx.stroke();
      }
      break;
    }
    case 'Earth': {
      // Floating stone disk
      const eg = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      eg.addColorStop(0, 'rgba(110,70,30,0.75)'); eg.addColorStop(0.6, 'rgba(80,50,20,0.5)'); eg.addColorStop(1, 'rgba(60,35,10,0)');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.27, 0, 0, Math.PI * 2); ctx.fill();
      // Rock cracks
      ctx.strokeStyle = 'rgba(50,30,8,0.6)'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.15, cy + Math.sin(a) * r * 0.04);
        ctx.lineTo(cx + Math.cos(a + 0.3) * r * 0.7, cy + Math.sin(a + 0.3) * r * 0.19);
        ctx.stroke();
      }
      break;
    }
    case 'Nature': {
      // Vine/leaf circle
      const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      ng.addColorStop(0, 'rgba(60,160,40,0.4)'); ng.addColorStop(1, 'rgba(30,100,15,0)');
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      // Leaf pips orbiting
      for (let i = 0; i < 6; i++) {
        const a = (t * 0.025 + i * 1.047) % (Math.PI * 2);
        const lx = cx + Math.cos(a) * r * 0.78, ly = cy + Math.sin(a) * r * 0.21;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(80,180,40,0.75)' : 'rgba(50,140,25,0.6)';
        ctx.fillRect(Math.round(lx) - 1, Math.round(ly) - 1, 3, 3);
      }
      break;
    }
    case 'Plasma': {
      // Rotating dual-ring
      for (let ring = 0; ring < 2; ring++) {
        const spin = t * (ring === 0 ? 0.05 : -0.03);
        const rr = r * (ring === 0 ? 1.0 : 0.55);
        const alpha = 0.5 + 0.3 * Math.sin(t * 0.1 + ring);
        ctx.strokeStyle = ring === 0 ? `rgba(180,60,255,${alpha.toFixed(2)})` : `rgba(120,220,255,${alpha.toFixed(2)})`;
        ctx.lineWidth = ring === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(spin) * 2, cy + Math.sin(spin) * r * 0.04, rr, rr * 0.25, spin * 0.1, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'Air': {
      // Swirling wind spiral
      for (let i = 0; i < 4; i++) {
        const a = (t * 0.06 + i * 1.57) % (Math.PI * 2);
        const rr = r * (0.3 + i * 0.18);
        const alpha = 0.2 + 0.15 * Math.sin(t * 0.08 + i);
        ctx.strokeStyle = `rgba(200,220,240,${alpha.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.25, a, 0, Math.PI * 1.4); ctx.stroke();
      }
      break;
    }
    default: {
      // Neutral: simple soft glow
      const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      dg.addColorStop(0, 'rgba(200,180,120,0.45)'); dg.addColorStop(1, 'rgba(160,130,80,0)');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

// ═══ MAIN RENDER ══════════════════════════════════════════════════════════════
let _battleFrame = 0;

function renderBattlefield() {
  const canvas = document.getElementById('battle-canvas');
  if (!canvas || !canvas.width) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  _battleFrame++;
  const t = _battleFrame;

  ctx.clearRect(0, 0, W, H);
  drawBattleBG(ctx, W, H);

  // ── Foreground ground band (between enemy ground line and player ground line) ──
  // Gives both fighters visible terrain to stand on
  _drawBattleForeground(ctx, W, H);

  const allE = combat.enemies || [];

  // ── Player idle animation ──
  // Gentle bob + very subtle lean (breathe cycle ~2s at 60fps)
  const playerBob   = Math.round(Math.sin(t * 0.055) * 2);       // ±2px vertical
  const playerLean  = Math.round(Math.sin(t * 0.028) * 1);       // ±1px horizontal drift

  const pp = playerSpritePos(W, H);
  const px = pp.x + playerLean;
  const py = pp.y + playerBob;

  ctx.save(); ctx.globalAlpha = 0.28 - Math.abs(playerBob) * 0.02; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px + pp.w/2, pp.y + pp.h + 3, pp.w*0.38, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  if (typeof playerElement !== 'undefined') {
    const rows = getPlayerCharSprite();
    if (typeof getWizColorMap === 'function') {
      const colorMap = getWizColorMap();
      for (let row = 0; row < rows.length; row++) {
        for (let col = 0; col < 24; col++) {
          const c = (rows[row] || '')[col] || '.';
          const color = colorMap[c];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(Math.floor(px + col * P_SCALE), Math.floor(py + row * P_SCALE), P_SCALE, P_SCALE);
        }
      }
    } else {
      drawSprite(ctx, rows, px, py, P_SCALE, getElemPal(playerElement), 24);
    }
  }

  // ── Enemies ──
  allE.forEach((e, i) => {
    const ep = enemySpritePos(i, allE, W, H);
    const ePal = getElemPal(e.element || 'Neutral');

    // Enemy sway — out of phase with player, slightly faster, each enemy offset
    const phaseOff = i * 1.3;
    const enemyBob  = e.alive ? Math.round(Math.sin(t * 0.07 + phaseOff) * 2) : 0;
    const enemySway = e.alive ? Math.round(Math.sin(t * 0.04 + phaseOff) * 1) : 0;
    const ex = ep.x + enemySway;
    const ey = ep.y + enemyBob;

    if (e.alive) {
      ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(ep.x + ep.w/2, ep.y + ep.h + 3, ep.w*0.36, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (!e.alive) ctx.globalAlpha = 0.15;
    drawSprite(ctx, getEnemySprite(e), ex, ey, E_SCALE, ePal, 24);
    ctx.restore();

    if (e.alive) {

      // Target arrow
      if (i === combat.targetIdx) {
        ctx.save();
        ctx.fillStyle = '#C8A060';
        ctx.font = `bold 10px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('▼', ep.x + ep.w / 2, ep.y - 5);
        ctx.restore();
      }

    }
  });

  // ── Summons ──
  (combat.summons || []).filter(s => s.hp > 0).forEach((s, i) => {
    const sp = summonSpritePos(i, W, H);
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sp.x + sp.w/2, sp.y + sp.h + 3, sp.w*0.32, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    drawSprite(ctx, SPRITE_TREANT, sp.x, sp.y, S_SCALE, getElemPal('Nature'));
  });

  // ── Hit flashes ──
  if (combat.hitFlashes && combat.hitFlashes.length) {
    combat.hitFlashes.forEach(flash => {
      if (flash.frames <= 0) return;
      const rect = flash.side === 'player'
        ? playerSpritePos(W, H)
        : enemySpritePos(flash.idx, allE, W, H);
      ctx.save();
      ctx.globalAlpha = (flash.frames / 10) * 0.6;
      ctx.fillStyle = flash.color;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
      flash.frames--;
    });
    combat.hitFlashes = combat.hitFlashes.filter(f => f.frames > 0);
  }

  // ── Spell / effect animations ──
  if (typeof tickAnims === 'function') tickAnims(ctx, W, H);
}

// ═══ LOOP ══════════════════════════════════════════════════════════════════════
let _battleRAF = null;

function startBattleLoop() {
  if (_battleRAF) cancelAnimationFrame(_battleRAF);
  (function loop() {
    renderBattlefield();
    _battleRAF = requestAnimationFrame(loop);
  })();
}

function stopBattleLoop() {
  if (_battleRAF) { cancelAnimationFrame(_battleRAF); _battleRAF = null; }
}

function initBattleCanvas() {
  const canvas = document.getElementById('battle-canvas');
  if (!canvas) return;
  const arena = canvas.parentElement;
  const w = (arena ? arena.offsetWidth : 0) || 480;
  const h = (arena ? arena.offsetHeight : 0) || Math.round(w * 0.38);
  canvas.width  = w;
  canvas.height = Math.max(160, h);
  // Stretch canvas CSS to fill the arena
  canvas.style.width  = '100%';
  canvas.style.height = '100%';
  // Re-size on container resize (mobile orientation change, browser bar show/hide)
  if (arena && !arena._battleResizeObserver) {
    arena._battleResizeObserver = new ResizeObserver(() => {
      const nw = arena.offsetWidth || 480;
      const nh = Math.max(160, arena.offsetHeight || Math.round(nw * 0.38));
      if (nw !== canvas.width || nh !== canvas.height) {
        canvas.width  = nw;
        canvas.height = nh;
        if (typeof renderEnemyCards === 'function') renderEnemyCards();
      }
    });
    arena._battleResizeObserver.observe(arena);
  }
}
