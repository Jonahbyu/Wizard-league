// ===============================
function showGameOver(){
  _lastRunPhos = saveRunStats();
  sendRunAnalytics('loss');
  showBetweenRuns();  // routes to between-runs-screen

    // Canvas pixel art scene
  const canvas = document.getElementById('gameover-canvas');
  if(!canvas) return;
  const W = 160, H = 90;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = '100%';
  canvas.style.maxWidth = '480px';
  const ctx = canvas.getContext('2d');

  let frame = 0;
  let stopped = false;
  canvas._goStop = ()=>{ stopped = true; };

  function drawScene(){
    if(stopped) return;
    ctx.fillStyle = '#06060e';
    ctx.fillRect(0, 0, W, H);

    // Stars
    const starPositions = [
      [12,8],[35,5],[58,12],[80,4],[105,9],[128,6],[150,11],[20,20],[70,18],[140,22],
      [45,30],[95,25],[160,15],[8,35],[130,30]
    ];
    starPositions.forEach(([sx,sy],i)=>{
      const twinkle = Math.sin(frame*0.05 + i*1.3);
      ctx.globalAlpha = 0.4 + twinkle*0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx, sy, 1, 1);
    });
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = '#1a1018';
    ctx.fillRect(0, H-18, W, 18);
    ctx.fillStyle = '#0e0a14';
    ctx.fillRect(0, H-20, W, 2);

    // Cracked ground lines
    ctx.fillStyle = '#120a1a';
    [[15,H-16,30,1],[60,H-14,20,1],[100,H-17,35,1],[8,H-12,10,1]].forEach(([x,y,w,h])=>{
      ctx.fillRect(x,y,w,h);
    });

    // Fallen player sprite — lying on side
    const px = 68, py = H-26;
    const charRows = getPlayerCharSprite ? getPlayerCharSprite() : SPRITE_CHAR_MAGE;
    // Draw character sprite rotated 90° via pixel-by-pixel
    const scale = 2;
    const spriteW = charRows[0].length;
    const spriteH = charRows.length;
    // Lay sprite on its side — rotate 90deg CW
    for(let row=0; row<spriteH; row++){
      for(let col=0; col<spriteW; col++){
        const c = charRows[row][col];
        if(!c) continue;
        // Rotated: new col = (spriteH-1-row), new row = col
        const nx = px + (spriteH - 1 - row) * scale;
        const ny = py + col * scale;
        ctx.fillStyle = c;
        ctx.fillRect(nx, ny, scale, scale);
      }
    }

    // Grim skull floating
    const skullY = 28 + Math.sin(frame * 0.04) * 3;
    const skull = [
      [0,0,1,1,1,0,0],
      [0,1,1,1,1,1,0],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
      [0,1,0,1,0,1,0],
      [0,1,1,1,1,1,0],
    ];
    const sw = 2;
    skull.forEach((row,ry)=>{
      row.forEach((px2,cx)=>{
        if(!px2) return;
        const darkness = Math.sin(frame*0.06)*0.15;
        ctx.fillStyle = `rgba(200,180,220,${0.75+darkness})`;
        ctx.fillRect(40 + cx*sw, skullY + ry*sw, sw, sw);
      });
    });

    // Floating ghost wisps
    const wisps = [
      { ox:20, phase:0.0, col:'rgba(140,100,200,0.4)' },
      { ox:110, phase:1.5, col:'rgba(100,80,180,0.3)' },
      { ox:145, phase:0.8, col:'rgba(160,120,220,0.35)' },
    ];
    wisps.forEach(w=>{
      const wy = 40 + Math.sin(frame*0.035 + w.phase)*8;
      ctx.fillStyle = w.col;
      ctx.fillRect(w.ox, wy, 4, 6);
      ctx.fillRect(w.ox-1, wy+2, 6, 3);
      ctx.fillRect(w.ox+1, wy+5, 2, 3);
    });

    // "GAME OVER" text in big pixel-ish font
    const alpha = Math.min(1, frame / 40);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#cc3333';
    ctx.font = 'bold 13px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME  OVER', W/2, 22);
    ctx.globalAlpha = 1;

    // Vignette
    const vign = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.75);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    frame++;
    requestAnimationFrame(drawScene);
  }
  drawScene();
}

// ── Run Victory Screen ────────────────────────────────────────────────────────
let _victoryFreeplay = false;

function showRunVictory() {
  _victoryFreeplay = false;
  _lastRunPhos = saveRunStats();
  sendRunAnalytics('win');

  // Populate stats panel
  const statsEl = document.getElementById('victory-stats');
  if (statsEl) {
    const phos = _lastRunPhos || 0;
    statsEl.innerHTML =
      `<div style="color:#aaffaa;font-size:.9rem;text-align:center;margin-bottom:.6rem;letter-spacing:.06em;">✦ RUN COMPLETE ✦</div>` +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.15rem .8rem;">` +
      `<span style="color:#559955;">Element</span><span style="color:#ccffcc;">${playerEmoji || ''} ${playerElement || '?'}</span>` +
      `<span style="color:#559955;">Battles</span><span style="color:#ccffcc;">${battleNumber}</span>` +
      `<span style="color:#559955;">Damage Dealt</span><span style="color:#ccffcc;">${(_runDmgDealt||0).toLocaleString()}</span>` +
      `<span style="color:#559955;">Damage Taken</span><span style="color:#ccffcc;">${(_runDmgTaken||0).toLocaleString()}</span>` +
      `<span style="color:#559955;">Gold Earned</span><span style="color:#ccffcc;">${player.gold}</span>` +
      `<span style="color:#559955;">Spells</span><span style="color:#ccffcc;">${player.spellbook.length}</span>` +
      `<span style="color:#559955;">Phos Earned</span><span style="color:#ffdd88;">✦ ${phos}</span>` +
      `</div>`;
  }

  showScreen('run-victory-screen');
  _startVictoryCanvas();
}

function _startVictoryCanvas() {
  const canvas = document.getElementById('victory-canvas');
  if (!canvas) return;
  const W = 160, H = 90;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width    = '100%';
  canvas.style.maxWidth = '480px';
  const ctx = canvas.getContext('2d');

  let frame = 0;
  let stopped = false;
  canvas._vcStop = () => { stopped = true; };

  // Star positions
  const stars = [
    [12,8],[35,5],[58,12],[80,4],[105,9],[128,6],[150,11],[20,20],[70,18],[140,22],
    [45,30],[95,25],[160,15],[8,35],[130,30],[50,42],[115,38],[75,50]
  ];

  // Confetti particles
  const confetti = Array.from({length:22}, (_,i) => ({
    x: (i * 7.5) % 160,
    y: Math.random() * 90,
    vy: 0.4 + Math.random() * 0.5,
    col: ['#ffdd44','#44ffaa','#ff88cc','#88ccff','#ffaa44'][i % 5],
    phase: Math.random() * Math.PI * 2,
  }));

  function drawScene() {
    if (stopped) return;

    // Sky
    ctx.fillStyle = '#06180a';
    ctx.fillRect(0, 0, W, H);

    // Stars
    stars.forEach(([sx, sy], i) => {
      const twinkle = Math.sin(frame * 0.05 + i * 1.3);
      ctx.globalAlpha = 0.4 + twinkle * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx, sy, 1, 1);
    });
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = '#0a2010';
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillStyle = '#072a10';
    ctx.fillRect(0, H - 20, W, 2);

    // Player sprite — standing upright, slight bob
    const bob = Math.round(Math.sin(frame * 0.07) * 1);
    const charRows = typeof getPlayerCharSprite === 'function' ? getPlayerCharSprite() : SPRITE_CHAR_MAGE;
    const colorMap = typeof getWizColorMap === 'function' ? getWizColorMap() : null;
    const scale = 2;
    const sprW = 24, sprH = charRows.length;
    const sx = Math.floor((W - sprW * scale) / 2);
    const sy = H - 18 - sprH * scale + bob;
    for (let r = 0; r < sprH; r++) {
      for (let c = 0; c < sprW; c++) {
        const ch = (charRows[r] || '')[c] || '.';
        let color = null;
        if (colorMap) {
          color = colorMap[ch];
        } else {
          color = ch !== '.' ? '#c8a060' : null;
        }
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(sx + c * scale, sy + r * scale, scale, scale);
      }
    }

    // Trophy pixel art (simple crown shape)
    const trophyX = 110, trophyY = H - 34;
    const glow = 0.7 + Math.sin(frame * 0.06) * 0.2;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#ffdd44';
    // Cup
    [[1,0,1],[1,1,1],[0,1,0],[0,1,0],[1,1,1]].forEach((row, ry) =>
      row.forEach((on, cx) => { if (on) ctx.fillRect(trophyX + cx*3, trophyY + ry*3, 3, 3); })
    );
    ctx.globalAlpha = 1;

    // Confetti
    confetti.forEach(p => {
      p.y += p.vy;
      if (p.y > H) p.y = -4;
      const wx = p.x + Math.sin(frame * 0.04 + p.phase) * 3;
      ctx.fillStyle = p.col;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(Math.round(wx), Math.round(p.y), 2, 2);
    });
    ctx.globalAlpha = 1;

    // "VICTORY" text
    const alpha = Math.min(1, frame / 35);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#66ff88';
    ctx.font = 'bold 13px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY', W / 2, 20);
    ctx.globalAlpha = 1;

    // Vignette
    const vign = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.75);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    frame++;
    requestAnimationFrame(drawScene);
  }
  drawScene();
}

function victoryBackToLobby() {
  const vc = document.getElementById('victory-canvas');
  if (vc && vc._vcStop) vc._vcStop();
  showBetweenRuns();
}

function victoryFreeplay() {
  _victoryFreeplay = true;
  const vc = document.getElementById('victory-canvas');
  if (vc && vc._vcStop) vc._vcStop();
  showMap();
}

// ── Shop Canvas Animation ─────────────────────────────────────────────────────
function startShopCanvas(){
  const canvas = document.getElementById('shop-canvas');
  if(!canvas) return;
  if(canvas._stop) canvas._stop(); // stop previous loop

  const W = 160, H = 100;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = '100%';
  const ctx = canvas.getContext('2d');

  let frame = 0;
  let stopped = false;
  canvas._stop = () => { stopped = true; };

  // Fixed stars with slow swirl orbit
  const STARS = Array.from({length:28}, (_,i) => ({
    angle: (i / 28) * Math.PI * 2,
    r: 18 + (i % 5) * 14 + Math.random() * 10,
    cx: W * 0.52,
    cy: H * 0.38,
    size: i % 3 === 0 ? 2 : 1,
    speed: 0.0008 + (i % 4) * 0.0003,
    brightness: 0.5 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
  }));

  // Shopkeeper sprite (pixel art, ~7×11)
  const KEEPER = [
    [0,0,'#c8a060',0,0],          // hat top
    [0,'#4a3010','#c8a060','#4a3010',0], // hat brim
    [0,'#e8c090','#e8c090','#e8c090',0], // face
    [0,'#e8c090','#333','#e8c090',0],    // eyes
    [0,'#e8c090','#c87040','#e8c090',0], // nose/mouth
    ['#2a1a50','#2a1a50','#2a1a50','#2a1a50','#2a1a50'], // robe top
    ['#2a1a50','#c8a030','#2a1a50','#c8a030','#2a1a50'], // robe trim
    ['#2a1a50','#2a1a50','#2a1a50','#2a1a50','#2a1a50'], // robe body
    ['#1a1030','#1a1030','#1a1030','#1a1030','#1a1030'], // robe bottom
    [0,'#c89040',0,'#c89040',0],    // hands
    [0,'#1a1030',0,'#1a1030',0],    // feet
  ];

  // Lantern flicker particles
  const LANTERN_X = 118, LANTERN_Y = 60;
  const particles = Array.from({length:8}, (_,i) => ({
    x: LANTERN_X, y: LANTERN_Y,
    life: Math.random(),
    speed: 0.3 + Math.random() * 0.4,
    vx: (Math.random() - 0.5) * 0.4,
  }));

  function drawScene(){
    if(stopped) return;

    // Night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#03031a');
    sky.addColorStop(1, '#0c0820');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Swirling stars
    STARS.forEach(s => {
      s.angle += s.speed;
      const sx = s.cx + Math.cos(s.angle) * s.r;
      const sy = s.cy + Math.sin(s.angle) * s.r * 0.45; // elliptical orbit
      const twinkle = 0.4 + Math.sin(frame * 0.07 + s.phase) * 0.3;
      ctx.globalAlpha = twinkle * s.brightness;
      ctx.fillStyle = '#e8e0ff';
      ctx.fillRect(Math.round(sx), Math.round(sy), s.size, s.size);
    });
    // A few brighter fixed stars
    [[10,8],[150,12],[75,6],[130,25],[20,30]].forEach(([sx,sy],i) => {
      ctx.globalAlpha = 0.6 + Math.sin(frame * 0.05 + i) * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx, sy, 1, 1);
    });
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = '#120e1c';
    ctx.fillRect(0, H - 20, W, 20);
    ctx.fillStyle = '#0d0a18';
    ctx.fillRect(0, H - 22, W, 2);
    // Ground texture
    ctx.fillStyle = '#1a1428';
    [[5,H-16,18,1],[40,H-14,12,1],[80,H-17,22,1],[120,H-15,15,1]].forEach(([x,y,w,h]) => ctx.fillRect(x,y,w,h));

    // ── Tent ──
    // Triangle body
    ctx.fillStyle = '#3a2810';
    ctx.beginPath();
    ctx.moveTo(50, H - 20);   // left base
    ctx.lineTo(110, H - 20);  // right base
    ctx.lineTo(80, H - 58);   // peak
    ctx.closePath();
    ctx.fill();
    // Tent stripes
    ctx.fillStyle = '#2a1c08';
    ctx.beginPath(); ctx.moveTo(80,H-58); ctx.lineTo(65,H-20); ctx.lineTo(68,H-20); ctx.lineTo(80,H-54); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(80,H-58); ctx.lineTo(95,H-20); ctx.lineTo(92,H-20); ctx.lineTo(80,H-54); ctx.closePath(); ctx.fill();
    // Tent outline
    ctx.strokeStyle = '#6a4818';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(50,H-20); ctx.lineTo(80,H-58); ctx.lineTo(110,H-20); ctx.stroke();
    // Tent door (arch)
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(71, H - 34, 18, 14);
    ctx.fillStyle = '#14102a';
    ctx.fillRect(72, H - 35, 16, 2);
    // Tent flag at peak
    const flagY = H - 60 + Math.sin(frame * 0.06) * 1;
    ctx.fillStyle = '#c8a030';
    ctx.fillRect(79, flagY - 6, 1, 6);
    ctx.fillStyle = '#e8c050';
    ctx.fillRect(80, flagY - 6, 5, 4);

    // Rope lines from tent peak to ground stakes
    ctx.strokeStyle = '#3a2808';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, H-58); ctx.lineTo(40, H-20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(80, H-58); ctx.lineTo(120, H-20); ctx.stroke();
    // Stakes
    ctx.fillStyle = '#5a3810';
    ctx.fillRect(38, H-20, 3, 4);
    ctx.fillRect(118, H-20, 3, 4);

    // ── Shopkeeper ──
    const kx = 28, ky = H - 46;
    const bobY = Math.sin(frame * 0.04) * 1;
    const S = 3;
    KEEPER.forEach((row, ry) => {
      row.forEach((col, cx) => {
        if(!col) return;
        ctx.fillStyle = col;
        ctx.fillRect(kx + cx * S, ky + Math.round(bobY) + ry * S, S, S);
      });
    });

    // ── Lantern (hung from tent) ──
    const lx = LANTERN_X, ly = LANTERN_Y;
    // String
    ctx.strokeStyle = '#4a3010';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, H-58); ctx.lineTo(lx, ly-8); ctx.stroke();
    // Lantern body glow
    const flicker = 0.7 + Math.sin(frame * 0.13 + 1) * 0.2 + Math.sin(frame * 0.31) * 0.1;
    const glow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 18);
    glow.addColorStop(0, `rgba(255,200,80,${0.35 * flicker})`);
    glow.addColorStop(1, 'rgba(255,160,20,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 18, ly - 18, 36, 36);
    // Lantern box
    ctx.fillStyle = `rgba(255,180,40,${0.9 * flicker})`;
    ctx.fillRect(lx - 3, ly - 5, 6, 8);
    ctx.fillStyle = '#5a3800';
    ctx.fillRect(lx - 4, ly - 6, 8, 2);
    ctx.fillRect(lx - 4, ly + 3, 8, 2);

    // Fire particles from lantern
    particles.forEach(p => {
      p.life += p.speed * 0.04;
      if(p.life >= 1){ p.life = 0; p.x = lx + (Math.random()-0.5)*3; p.y = ly; p.vx = (Math.random()-0.5)*0.4; }
      p.x += p.vx;
      p.y = ly - p.life * 9;
      const a = (1 - p.life) * 0.8;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.life < 0.4 ? '#ffdd60' : '#ff8020';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
    });
    ctx.globalAlpha = 1;

    // Foreground vignette
    const vign = ctx.createRadialGradient(W/2, H*0.6, H*0.1, W/2, H*0.5, H*0.9);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    // Title text
    ctx.globalAlpha = Math.min(1, frame / 20);
    ctx.fillStyle = '#c8a030';
    ctx.font = 'bold 7px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Wandering Merchant', W/2, 12);
    ctx.globalAlpha = 1;

    frame++;
    requestAnimationFrame(drawScene);
  }
  drawScene();
}

// ── COMBAT TABS ───────────────────────────────────────────────────────────────
let _activeCombatTab = 'actions';
let _logHasNew = false;

function switchCombatTab(tab){
  _activeCombatTab = tab;
  ['actions','log','runinfo'].forEach(t => {
    document.getElementById(`ctab-${t}`)?.classList.toggle('active', t === tab);
    document.getElementById(`ctabp-${t}`)?.classList.toggle('active', t === tab);
  });
  if(tab === 'log'){
    _logHasNew = false;
    _updateLogBadge(false);
    const log = document.getElementById('battle-log');
    if(log) log.scrollTop = log.scrollHeight;
  }
  if(tab === 'runinfo') renderRunInfo();
}

function _updateLogBadge(hasNew){
  const btn = document.getElementById('ctab-log');
  if(!btn) return;
  const badge = btn.querySelector('.ctab-log-badge');
  if(hasNew && !badge){
    const b = document.createElement('span');
    b.className = 'ctab-log-badge';
    btn.appendChild(b);
  } else if(!hasNew && badge){
    badge.remove();
  }
}

// (log badge is wired directly into log())

// ── RUN INFO renderer ────────────────────────────────────────────────────────
function renderRunInfo(){
  const panel = document.getElementById('run-info-panel');
  if(!panel) return;
  panel.innerHTML = '';

  // Helper
  function section(title, html){
    const s = document.createElement('div');
    s.className = 'ri-section';
    s.innerHTML = `<div class="ri-title">${title}</div>${html}`;
    panel.appendChild(s);
  }
  function row(name, val){
    return `<div class="ri-row"><span class="ri-name">${name}</span><span class="ri-val">${val}</span></div>`;
  }

  // ── Stats
  const maxHP = maxHPFor('player');
  section('Stats',
    row('Element', `${playerEmoji} ${playerElement}`) +
    row('HP', `${Math.max(0,player.hp)} / ${maxHP}`) +
    row('Attack Power', player.attackPower) +
    row('Effect Power', player.effectPower) +
    row('Defense', player.defense) +
    row('Gold', player.gold) +
    row('Lives', player.revives) +
    (player.bonusActions ? row('Bonus Actions', `+${player.bonusActions}`) : '')
  );

  // ── Passives
  if(player.passives && player.passives.length){
    const allPassives = Object.values(PASSIVE_CHOICES).flat();
    let html = '';
    player.passives.forEach(id => {
      const p = allPassives.find(x => x.id === id);
      if(!p) return;
      html += `<div style="padding:.25rem 0; border-bottom:1px solid #111; font-size:.72rem;">
        <div style="color:#c8a060;font-family:'Cinzel',serif;font-size:.7rem;display:flex;align-items:center;gap:.3rem;">${passiveIconSVG(p, 14)} ${p.title}</div>
        <div style="color:#6a5a40;font-size:.62rem;margin-top:.1rem;line-height:1.4;">${p.desc}</div>
      </div>`;
    });
    section('Passives', html || '<div style="color:#333;font-size:.68rem;">None yet</div>');
  } else {
    section('Passives', '<div style="color:#333;font-size:.68rem;">None yet</div>');
  }

  // ── Spells
  if(player.spellbook && player.spellbook.length){
    let html = '';
    player.spellbook.forEach(s => {
      const rankPct = Math.round((s.dmgMult||1.0)*100);
      const rankStr = rankPct > 100 ? `<span class="ri-spell-rank">+${rankPct-100}% dmg</span>` : '';
      const cdStr = s.baseCooldown > 0 ? `CD:${s.baseCooldown}` : 'No CD';
      html += `<div style="padding:.28rem 0;border-bottom:1px solid #111;font-size:.72rem;display:flex;flex-direction:column;gap:.1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#c8a060;font-family:'Cinzel',serif;font-size:.7rem;">${s.emoji} ${s.name} ${rankStr}</span>
          <span style="color:#4a4030;font-size:.6rem;">${cdStr} · ${s.element||'Neutral'}</span>
        </div>
        <div style="color:#6a5a40;font-size:.62rem;line-height:1.4;">${s.desc}</div>
      </div>`;
    });
    section('Spellbook', html);
  } else {
    section('Spellbook', '<div style="color:#333;font-size:.68rem;">No spells learned yet</div>');
  }

  // ── Items
  if(player.inventory && player.inventory.length){
    let html = '';
    player.inventory.forEach(item => {
      html += row(`${item.emoji} ${item.name}`, item.desc);
    });
    section('Inventory', html);
  }

  // ── Second elements
  if(player.unlockedElements && player.unlockedElements.length){
    section('Second Elements', player.unlockedElements.map(e => row(e, '✦ Unlocked')).join(''));
  }

  // ── Battle info
  section('Run Progress',
    row('Battle #', battleNumber) +
    row('Gym defeated', gymDefeated ? 'Yes ✦' : 'Not yet')
  );

  // ── Status Effects Reference
  const STATUS_DEFS = [
    { emoji:'🔥', name:'Burn',       color:'#c06030', desc:'Deals 1 damage per stack at the start of each turn. Stacks accumulate; decays over time.' },
    { emoji:'❄️', name:'Frost',      color:'#60a0cc', desc:'-1 ATK, -1 EFX, -1 Armor per stack. Every 10 stacks triggers a Freeze. Decays 1/turn.' },
    { emoji:'🧊', name:'Frozen',     color:'#a0e0ff', desc:'−1 action next turn. Next Ice hit deals 1.5× damage and consumes 10 Frost stacks. Triggered at 10 Frost stacks.' },
    { emoji:'🌿', name:'Root',       color:'#3a8a3a', desc:`+${ROOT_POWER_PER_STACK} bonus damage taken from attacks per stack. Enemy cannot dodge. Stacks accumulate.` },
    { emoji:'🌿G', name:'Overgrowth',color:'#50a050', desc:`Enhanced root. +${ROOT_POWER_PER_STACK} bonus damage per stack. Applied by Nature zone/abilities.` },
    { emoji:'🫧', name:'Foam',       color:'#4080a0', desc:'-10% ATK & EFX per stack. -5 Armor per stack. Applied by Water enemies.' },
    { emoji:'⚡', name:'Shock',      color:'#c0c020', desc:'Reduces outgoing damage by 5% per stack. Applied by Lightning enemies and abilities.' },
    { emoji:'🛡', name:'Armor/Block',color:'#a08060', desc:'Absorbs incoming damage before HP. Gained from spells, Earth abilities, Defense stat, and campfire.' },
    { emoji:'🪨', name:'Stone',      color:'#8a7a5a', desc:'+3 ATK and +2 Armor per stack. Decays 25% each turn. Gained from Earth abilities.' },
    { emoji:'🔮', name:'Phase',      color:'#9060cc', desc:'Complete damage immunity for the duration. Expires each turn.' },
    { emoji:'💨', name:'Momentum',   color:'#60a0cc', desc:'(Air only) +1 ATK and +2% dodge per stack. Decays each turn unless refreshed.' },
    { emoji:'⏳', name:'Borrowed Charge', color:'#cc8040', desc:'(Plasma) Charge debt — must repay before next cast. Causes self-damage if unpaid.' },
    { emoji:'✦',  name:'Overcharged',color:'#c080ff', desc:'(Plasma) Next plasma cast gains bonus power. Consumed on cast.' },
  ];
  let statusHtml = '';
  STATUS_DEFS.forEach(d => {
    statusHtml += `<div style="padding:.22rem 0;border-bottom:1px solid #111;">
      <div style="display:flex;gap:5px;align-items:center;">
        <span style="color:${d.color};font-size:.75rem;">${d.emoji}</span>
        <span style="color:${d.color};font-family:'Cinzel',serif;font-size:.68rem;">${d.name}</span>
      </div>
      <div style="color:#555;font-size:.6rem;margin-top:.1rem;line-height:1.4;">${d.desc}</div>
    </div>`;
  });
  section('Status Effects', statusHtml);
}

// ── Global Background Canvas ─────────────────────────────────────────────────
(function initBgCanvas(){
  const canvas = document.getElementById('bg-canvas');
  if(!canvas) return;

  const W = 240, H = 135;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  let frame = 0;

  // ── Stars (shared) ──
  function mkStars(n, rMin, rMax, sMin, sMax, bMin, bMax, col){
    return Array.from({length:n}, (_,i) => ({
      cx: W*(0.2+Math.random()*0.6), cy: H*(0.08+Math.random()*0.35),
      r: rMin+Math.random()*(rMax-rMin), angle: Math.random()*Math.PI*2,
      speed: sMin+Math.random()*(sMax-sMin), phase: Math.random()*Math.PI*2,
      bright: bMin+Math.random()*(bMax-bMin), size: Math.random()<0.15?2:1, col: col||'#c8c0f0',
    }));
  }
  const FAR_STARS  = mkStars(60, 5, 25, 0.0003,0.0008, 0.25,0.55);
  const NEAR_STARS = mkStars(30, 8, 40, 0.0005,0.0012, 0.55,1.00);
  const shoots = [];

  function spawnShoot(){
    if(shoots.length>=2||Math.random()>0.004) return;
    shoots.push({x:Math.random()*W*0.7,y:Math.random()*H*0.4,
      vx:1.2+Math.random()*1.6,vy:0.4+Math.random()*0.8,life:0,maxLife:28+Math.random()*20});
  }

  function hillY(x){
    return H*0.72+Math.sin(x*0.025+0.5)*8+Math.sin(x*0.011+1.2)*5+Math.sin(x*0.05+2.0)*3;
  }

  // ── Zone configs ──
  const ZONE = {
    Fire: {
      sky:  ['#120300','#2a0600','#1a0400'],
      nebulae: [{x:60,y:22,rx:50,ry:20,r:'rgba(200,40,0,',base:0.06},
                {x:170,y:30,rx:40,ry:16,r:'rgba(160,20,0,',base:0.04},
                {x:110,y:10,rx:30,ry:10,r:'rgba(220,80,0,',base:0.05}],
      starCol: '#ff9966', hillCol: '#1a0500', hgCol: 'rgba(220,60,0,0.2)',
      gndCol: '#0e0300',
      extra(ctx,W,H,frame){
        // embers
        for(let i=0;i<10;i++){
          const ph=(frame*0.008+i*0.45)%1;
          const ex=((i*173+37)%W)+Math.round(Math.sin(frame*0.04+i)*4);
          const ey=Math.round(H*(0.95-ph*0.7));
          const a=Math.sin(ph*Math.PI);
          if(a<0.05)continue;
          ctx.fillStyle=`rgba(255,${Math.round(80+100*(1-ph))},0,${(a*0.9).toFixed(2)})`;
          ctx.fillRect(ex,ey,i%3===0?2:1,i%3===0?2:1);
        }
      }
    },
    Water: {
      sky:  ['#020c18','#051828','#082035'],
      nebulae: [{x:50,y:18,rx:50,ry:20,r:'rgba(20,60,140,',base:0.06},
                {x:175,y:28,rx:38,ry:15,r:'rgba(10,80,120,',base:0.05},
                {x:115,y:8, rx:28,ry:10,r:'rgba(40,60,160,',base:0.04}],
      starCol: '#a0d0ff', hillCol: '#040d1c', hgCol: 'rgba(20,100,160,0.18)',
      gndCol: '#020810',
      extra(ctx,W,H,frame){
        // moon
        const mx=Math.round(W*0.72),my=Math.round(H*0.15);
        ctx.fillStyle='rgba(220,235,255,0.92)'; ctx.fillRect(mx-4,my,8,8);
        ctx.fillStyle='rgba(200,220,255,0.5)'; ctx.fillRect(mx-6,my+2,4,4); ctx.fillRect(mx+4,my+2,4,4);
        // reflection column
        for(let r=0;r<5;r++){
          const ry=Math.round(H*0.78+r*3);
          const a=0.2-r*0.03;
          ctx.fillStyle=`rgba(200,220,255,${a})`;
          ctx.fillRect(mx-1+Math.round(Math.sin(frame*0.05+r)*1),ry,3,2);
        }
      }
    },
    Ice: {
      sky:  ['#04081a','#081228','#0c1830'],
      nebulae: [{x:55,y:20,rx:50,ry:18,r:'rgba(40,160,200,',base:0.05},
                {x:175,y:30,rx:38,ry:14,r:'rgba(60,120,200,',base:0.04},
                {x:110,y:10,rx:30,ry:10,r:'rgba(80,200,220,',base:0.06}],
      starCol: '#c0e8ff', hillCol: '#8ab8d8', hgCol: 'rgba(140,200,255,0.25)',
      gndCol: '#b0cce0',
      extra(ctx,W,H,frame){
        // aurora bands
        for(let ai=0;ai<3;ai++){
          const ay=Math.round(H*(0.12+ai*0.09)), awave=Math.sin(frame*0.015+ai*1.4)*5;
          const ag=ctx.createLinearGradient(0,ay-3,0,ay+5);
          const cols=[['rgba(40,210,170,','rgba(60,170,230,'],['rgba(80,190,255,','rgba(40,230,190,'],['rgba(60,150,210,','rgba(80,210,170,']];
          ag.addColorStop(0,cols[ai][0]+'0)'); ag.addColorStop(0.5,cols[ai][1]+'0.15)'); ag.addColorStop(1,cols[ai][0]+'0)');
          ctx.fillStyle=ag; ctx.fillRect(0,ay+Math.round(awave),W,7);
        }
        // snowflakes
        for(let i=0;i<12;i++){
          const ph=(frame*0.006+i*0.28)%1;
          const sx=((i*197+41)%W)+Math.round(Math.sin(frame*0.03+i)*3);
          const sy=Math.round(H*ph);
          const a=Math.sin(ph*Math.PI)*0.8;
          ctx.fillStyle=`rgba(220,240,255,${a.toFixed(2)})`; ctx.fillRect(sx,sy,i%5===0?2:1,i%5===0?2:1);
        }
      }
    },
    Lightning: {
      sky:  ['#040210','#080520','#0c0828'],
      nebulae: [{x:60,y:20,rx:50,ry:18,r:'rgba(100,60,200,',base:0.06},
                {x:170,y:30,rx:40,ry:15,r:'rgba(180,140,20,',base:0.04},
                {x:112,y:10,rx:28,ry:10,r:'rgba(60,20,180,',base:0.05}],
      starCol: '#e8e0a0', hillCol: '#0a0818', hgCol: 'rgba(160,120,20,0.2)',
      gndCol: '#060410',
      extra(ctx,W,H,frame){
        // storm clouds
        for(let ci=0;ci<3;ci++){
          const cx=((ci*211+37)%W)*1.0, cy=Math.round(H*(0.06+ci*0.08));
          ctx.fillStyle=`rgba(18,10,36,0.88)`; ctx.fillRect(Math.round(cx-35),cy,70,14);
          ctx.fillStyle=`rgba(35,22,65,0.5)`;  ctx.fillRect(Math.round(cx-35),cy,70,4);
        }
        // periodic lightning bolt
        if((frame%90)<8){
          const ax=Math.round(W*(0.3+(frame/90|0)%3*0.2));
          ctx.strokeStyle='#ffffaa'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(ax,0);
          for(let seg=0;seg<5;seg++) ctx.lineTo(ax+Math.sin(frame*3+seg*7)*10,seg*H*0.55/5);
          ctx.stroke();
          ctx.strokeStyle='rgba(200,180,255,0.35)'; ctx.lineWidth=5; ctx.stroke();
        }
      }
    },
    Earth: {
      sky:  ['#060302','#100806','#18100a'],
      nebulae: [{x:60,y:22,rx:48,ry:18,r:'rgba(100,60,20,',base:0.05},
                {x:170,y:32,rx:36,ry:14,r:'rgba(80,40,10,',base:0.04},
                {x:112,y:10,rx:28,ry:10,r:'rgba(120,80,20,',base:0.04}],
      starCol: '#e0c898', hillCol: '#1a0c04', hgCol: 'rgba(140,80,20,0.2)',
      gndCol: '#0c0602',
      extra(ctx,W,H,frame){
        // fireflies near ground
        for(let i=0;i<5;i++){
          const fx=((i*197+41)%W)+Math.round(Math.sin(frame*0.04+i*0.7)*6);
          const fy=Math.round(H*0.80+Math.sin(frame*0.03+i*1.1)*4);
          const g=0.3+0.5*Math.sin(frame*0.08+i*1.3);
          if(g>0.4){ctx.fillStyle=`rgba(200,240,80,${(g*0.7).toFixed(2)})`;ctx.fillRect(fx,fy,2,2);}
        }
      }
    },
    Nature: {
      sky:  ['#020a04','#041408','#061a0a'],
      nebulae: [{x:60,y:22,rx:50,ry:18,r:'rgba(20,100,30,',base:0.06},
                {x:170,y:30,rx:38,ry:14,r:'rgba(10,80,40,',base:0.05},
                {x:110,y:10,rx:30,ry:10,r:'rgba(40,120,20,',base:0.04}],
      starCol: '#a0e0a0', hillCol: '#030e05', hgCol: 'rgba(20,100,10,0.2)',
      gndCol: '#020804',
      extra(ctx,W,H,frame){
        // fireflies
        for(let i=0;i<8;i++){
          const fx=((i*211+37)%W)+Math.round(Math.sin(frame*0.03+i*0.6)*8);
          const fy=Math.round(H*0.75+Math.sin(frame*0.025+i*1.2)*6);
          const g=0.4+0.55*Math.sin(frame*0.09+i*1.3);
          if(g>0.5){ctx.fillStyle=`rgba(180,255,80,${(g*0.8).toFixed(2)})`;ctx.fillRect(fx,fy,2,2);}
        }
      }
    },
    Plasma: {
      sky:  ['#060010','#0e0020','#180030'],
      nebulae: [{x:60,y:20,rx:52,ry:20,r:'rgba(160,0,220,',base:0.07},
                {x:170,y:28,rx:40,ry:15,r:'rgba(100,0,200,',base:0.06},
                {x:112,y:10,rx:30,ry:10,r:'rgba(200,40,220,',base:0.05}],
      starCol: '#dd88ff', hillCol: '#0e0020', hgCol: 'rgba(180,20,220,0.25)',
      gndCol: '#0a0018',
      extra(ctx,W,H,frame){
        // orbiting motes
        for(let i=0;i<5;i++){
          const ang=frame*0.018*(1+i*0.15)+i*1.26;
          const ox=Math.round(W*0.5+Math.cos(ang)*W*0.28);
          const oy=Math.round(H*0.40+Math.sin(ang*0.55)*H*0.15);
          const g=0.4+0.4*Math.sin(frame*0.1+i);
          ctx.fillStyle=`rgba(${i%2?200:140},30,255,${g.toFixed(2)})`;
          ctx.fillRect(ox,oy,i%2===0?3:2,i%2===0?3:2);
        }
      }
    },
    Air: {
      sky:  ['#060c18','#0c1828','#101e30'],
      nebulae: [{x:60,y:22,rx:50,ry:18,r:'rgba(120,160,220,',base:0.05},
                {x:175,y:30,rx:38,ry:14,r:'rgba(80,120,200,',base:0.04},
                {x:110,y:10,rx:30,ry:10,r:'rgba(160,190,230,',base:0.04}],
      starCol: '#b8d0f0', hillCol: '#6878a0', hgCol: 'rgba(160,200,240,0.18)',
      gndCol: '#8898b0',
      extra(ctx,W,H,frame){
        // moving cloud wisps
        for(let ci=0;ci<4;ci++){
          const cx=((frame*0.3+ci*65)%W);
          const cy=Math.round(H*(0.08+ci*0.07));
          ctx.fillStyle=`rgba(180,200,230,0.07)`; ctx.fillRect(Math.round(cx-25),cy,50,8);
        }
        // wind streaks
        for(let i=0;i<4;i++){
          const wx=((frame*1.2+i*W*0.25)%W);
          ctx.fillStyle=`rgba(200,215,240,0.07)`; ctx.fillRect(Math.round(wx),Math.round(H*(0.3+i*0.05)),18+i*4,1);
        }
      }
    },
    Neutral: {
      sky:  ['#020210','#070520','#110e2a'],
      nebulae: [{x:60,y:22,rx:45,ry:18,r:'rgba(80,40,120,',base:0.04},
                {x:170,y:35,rx:35,ry:14,r:'rgba(30,60,120,',base:0.05},
                {x:110,y:12,rx:30,ry:10,r:'rgba(100,30,80,',base:0.03}],
      starCol: '#c8c0f0', hillCol: '#0a0818', hgCol: 'rgba(60,40,120,0.12)',
      gndCol: '#060412',
      extra(){}
    },
  };

  function getZone(){
    const el = (typeof currentZoneElement !== 'undefined' && currentZoneElement)
      ? currentZoneElement
      : (typeof playerElement !== 'undefined' ? playerElement : 'Neutral');
    return (ZONE[el] && el) ? ZONE[el] : ZONE.Neutral;
  }

  function drawScene(){
    const z = getZone();

    // Sky gradient
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,    z.sky[0]);
    sky.addColorStop(0.55, z.sky[1]);
    sky.addColorStop(1,    z.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

    // Nebulae
    z.nebulae.forEach(n => {
      const pulse = n.base + Math.sin(frame*0.012+n.x)*0.015;
      const g = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,Math.max(n.rx,n.ry));
      g.addColorStop(0,   n.r+Math.min(0.12,pulse*2)+')');
      g.addColorStop(0.5, n.r+pulse+')');
      g.addColorStop(1,   n.r+'0)');
      ctx.save(); ctx.scale(1, n.ry/n.rx);
      ctx.fillStyle = g; ctx.beginPath();
      ctx.arc(n.x, n.y*(n.rx/n.ry), n.rx, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });

    // Stars
    FAR_STARS.forEach(s => {
      s.angle += s.speed;
      const sx=s.cx+Math.cos(s.angle)*s.r, sy=s.cy+Math.sin(s.angle)*s.r*0.38;
      const tw=s.bright*(0.5+Math.sin(frame*0.04+s.phase)*0.3);
      ctx.globalAlpha=Math.max(0,tw); ctx.fillStyle=z.starCol;
      ctx.fillRect(Math.round(sx),Math.round(sy),1,1);
    });
    NEAR_STARS.forEach(s => {
      s.angle += s.speed;
      const sx=s.cx+Math.cos(s.angle)*s.r, sy=s.cy+Math.sin(s.angle)*s.r*0.42;
      const tw=s.bright*(0.6+Math.sin(frame*0.06+s.phase)*0.35);
      ctx.globalAlpha=Math.max(0,tw); ctx.fillStyle=s.size===2?'#ffffff':z.starCol;
      ctx.fillRect(Math.round(sx),Math.round(sy),s.size,s.size);
    });
    ctx.globalAlpha=1;

    // Shooting stars
    spawnShoot();
    for(let i=shoots.length-1;i>=0;i--){
      const s=shoots[i]; s.x+=s.vx; s.y+=s.vy; s.life++;
      const t=s.life/s.maxLife, a=t<0.3?t/0.3:1-(t-0.3)/0.7;
      ctx.globalAlpha=a*0.85; ctx.fillStyle='#ffffff'; ctx.fillRect(Math.round(s.x),Math.round(s.y),2,1);
      ctx.globalAlpha=a*0.4; ctx.fillStyle=z.starCol; ctx.fillRect(Math.round(s.x-s.vx*3),Math.round(s.y-s.vy*3),3,1);
      ctx.globalAlpha=1;
      if(s.life>=s.maxLife) shoots.splice(i,1);
    }

    // Zone extra effects (aurora, embers, fireflies, etc.)
    z.extra(ctx, W, H, frame);

    // Terrain silhouette
    ctx.fillStyle = z.hillCol;
    ctx.beginPath(); ctx.moveTo(0,H);
    for(let x=0;x<=W;x++) ctx.lineTo(x, hillY(x));
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();

    // Horizon glow
    const hgY = hillY(W/2);
    const hg = ctx.createLinearGradient(0,hgY-6,0,hgY+4);
    hg.addColorStop(0, z.hgCol); hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg; ctx.fillRect(0,hgY-6,W,10);

    // Ground fill
    ctx.fillStyle = z.gndCol; ctx.fillRect(0,H*0.85,W,H);

    frame++;
    requestAnimationFrame(drawScene);
  }
  drawScene();
})();


