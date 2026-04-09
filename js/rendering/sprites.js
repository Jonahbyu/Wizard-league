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
  _bHillSil(ctx, W, H, hf-0.08, '#1a0500', 0.3);
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
  // Aurora (horizontal wavy bands)
  for (let ai=0;ai<3;ai++) {
    const ay=Math.round(H*(0.08+ai*0.10)), awave=Math.sin(t*0.0012+ai*1.4)*8;
    const ag=ctx.createLinearGradient(0,ay-4,0,ay+4);
    const cols=[['rgba(40,200,160,','rgba(60,160,220,'],['rgba(80,180,255,','rgba(40,220,180,'],['rgba(60,140,200,','rgba(80,200,160,']];
    ag.addColorStop(0,cols[ai][0]+'0)'); ag.addColorStop(0.5,cols[ai][1]+'0.12)'); ag.addColorStop(1,cols[ai][0]+'0)');
    ctx.fillStyle=ag; ctx.fillRect(0,ay+Math.round(awave),W,8);
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
  _bHillSil(ctx, W, H, hf-0.10, '#1a0c04', 0.3);
  _bHillSil(ctx, W, H, hf-0.04, '#2a1808', 0.7);
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
  const el = (typeof currentZoneElement !== 'undefined' && currentZoneElement) ? currentZoneElement : ((typeof playerElement !== 'undefined') ? playerElement : 'Earth');
  const enemyGnd  = Math.round(H * _horizonFrac());  // top of ground band (horizon)
  const playerGnd = Math.round(H * 0.90);  // where player feet land
  const tick = Date.now();

  // Zone colour palette for ground band
  const palette = {
    Fire:      ['#1c0804', '#280c06', '#1a0604'],
    Water:     ['#0a2040', '#082030', '#183060'],
    Ice:       ['#b0cce0', '#c8dff0', '#a0bcd0'],
    Lightning: ['#12102a', '#1a1538', '#0e0c20'],
    Earth:     ['#4a2c10', '#5a3818', '#3a2008'],
    Nature:    ['#1c4a10', '#224e12', '#162e08'],
    Plasma:    ['#1e0430', '#28053a', '#160228'],
    Air:       ['#9aaac0', '#a8b8cc', '#8898b0'],
  };
  const cols = palette[el] || palette.Earth;

  // Perspective trapezoid — narrow at top (enemy line), wide at bottom (player line)
  // Draw row by row for gradient + texture
  for (let y = enemyGnd; y <= playerGnd; y++) {
    const t = (y - enemyGnd) / (playerGnd - enemyGnd);
    // Interpolated colour between back and front
    const ci = t < 0.5 ? 0 : t < 0.8 ? 1 : 2;
    ctx.fillStyle = cols[ci];
    ctx.fillRect(0, y, W, 1);
  }

  // Subtle texture dots
  for (let i = 0; i < 18; i++) {
    const dx = ((i * 173 + 31) % W);
    const dt = ((i * 97 + 13) % 100) / 100;
    const dy = enemyGnd + Math.round(dt * (playerGnd - enemyGnd));
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(dx, dy, 2, 1);
  }
  ctx.globalAlpha = 1;

  // Zone-specific foreground details
  if (el === 'Fire') {
    // Lava cracks in ground
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 211 + 53) % W);
      const cy = enemyGnd + Math.round((0.3 + i * 0.12) * (playerGnd - enemyGnd));
      const glow = 0.3 + 0.4 * Math.sin(tick * 0.008 + i);
      ctx.fillStyle = `rgba(255,${Math.round(50 + 40 * glow)},0,${glow.toFixed(2)})`;
      ctx.fillRect(cx, cy, 16 + (i % 3) * 6, 2);
    }
  } else if (el === 'Ice') {
    // Frost crystals jutting from ground line
    for (let i = 0; i < 10; i++) {
      const ix = ((i * 97 + 41) % W);
      const ih = 4 + (i % 5) * 2;
      ctx.fillStyle = 'rgba(160,210,240,0.7)';
      ctx.fillRect(ix - 1, enemyGnd - ih, 2, ih);
      ctx.fillStyle = 'rgba(200,235,255,0.5)';
      ctx.fillRect(ix, enemyGnd - ih, 1, ih - 1);
    }
  } else if (el === 'Nature') {
    // Grass tufts on ground
    for (let i = 0; i < 12; i++) {
      const gx = ((i * 173 + 41) % W);
      const gy = enemyGnd + Math.round((0.1 + (i % 4) * 0.18) * (playerGnd - enemyGnd));
      ctx.fillStyle = i % 3 === 0 ? '#2a5a14' : '#1e4010';
      ctx.fillRect(gx, gy - 3, 2, 4); ctx.fillRect(gx + 2, gy - 2, 2, 3);
    }
    // Fireflies
    for (let i = 0; i < 4; i++) {
      const fx = ((i * 211 + 37) % W);
      const fy = enemyGnd + Math.round(0.3 * (playerGnd - enemyGnd)) + Math.round(Math.sin(tick * 0.002 + i * 1.3) * 6);
      const glow = 0.4 + 0.5 * Math.sin(tick * 0.006 + i);
      if (glow > 0.5) { ctx.fillStyle = `rgba(180,240,80,${(glow * 0.7).toFixed(2)})`; ctx.fillRect(fx, fy, 2, 2); }
    }
  } else if (el === 'Water') {
    // Shallow water shimmer near front
    for (let i = 0; i < 5; i++) {
      const wy = playerGnd - 8 - i * 4;
      const phase = tick * 0.002 + i * 0.8;
      ctx.fillStyle = `rgba(80,160,200,${(0.12 - i * 0.02).toFixed(2)})`;
      for (let x = 0; x < W; x++) {
        if (Math.sin(x * 0.05 + phase) > 0.8) ctx.fillRect(x, wy, 1, 2);
      }
    }
  } else if (el === 'Plasma') {
    // Glowing veins
    for (let i = 0; i < 6; i++) {
      const vx = ((i * 173 + 41) % W);
      const vy = enemyGnd + Math.round((0.2 + i * 0.12) * (playerGnd - enemyGnd));
      const glow = 0.3 + 0.4 * Math.sin(tick * 0.006 + i * 1.2);
      ctx.fillStyle = `rgba(${i % 2 ? 180 : 130},30,255,${glow.toFixed(2)})`;
      ctx.fillRect(vx, vy, 12 + (i % 4) * 4, 2);
    }
  } else if (el === 'Lightning') {
    // Electric sparks on cracks
    for (let i = 0; i < 6; i++) {
      const sx = ((i * 197 + 41) % W);
      const sy = enemyGnd + Math.round((0.15 + i * 0.13) * (playerGnd - enemyGnd));
      ctx.strokeStyle = '#1e1838'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (i % 2 ? 10 : -10), sy + 4); ctx.stroke();
      if ((tick % 1500) < 120) {
        ctx.fillStyle = 'rgba(200,180,255,0.6)'; ctx.fillRect(sx - 1, sy - 1, 3, 3);
      }
    }
  }

  // Ground edge highlight lines
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, enemyGnd, W, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, playerGnd - 1, W, 1);
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
      // Name label
      ctx.save();
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = i === combat.targetIdx ? '#C8A060' : '#504840';
      const nameStr = e.name.length > 14 ? e.name.slice(0, 13) + '…' : e.name;
      ctx.fillText(nameStr, ep.x + ep.w / 2, ep.y - E_SCALE * 4 - 2);
      ctx.restore();

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
