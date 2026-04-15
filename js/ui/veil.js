// ===== veil.js =====
// ── The Veil UI ───────────────────────────────────────────────────────────────

function _veilIsUnlocked() {
  return !!(getMeta().darkOneDefeated);
}

function openVeilPanel() {
  const panel   = document.getElementById('lobby-panel');
  const content = document.getElementById('lobby-panel-content');
  if (!panel || !content) return;
  _renderVeilContent(content);
  panel.style.display = 'block';
}

function _renderVeilContent(content) {
  // ── Locked state — Ruined Portal ──
  if (!_veilIsUnlocked()) {
    const isSandbox = typeof sandboxMode !== 'undefined' && sandboxMode;
    let html = `
      <div class="lobby-panel-title">Ruined Portal</div>
      <canvas id="ruined-portal-preview" style="display:block;margin:0 auto 14px;image-rendering:pixelated;border-radius:4px;"></canvas>
      <div style="color:#5a4a6a;font-size:.72rem;margin-bottom:10px;font-style:italic;line-height:1.6;text-align:center;">
        An ancient archway, crumbled and still.<br>Whatever power once lived here has long since faded.
      </div>
      <div style="text-align:center;color:#3a2844;font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;">
        — nothing stirs within —
      </div>
    `;
    if (isSandbox) {
      html += `
        <div style="margin-top:20px;text-align:center;">
          <button onclick="sandboxUnlockVeil()"
            style="padding:.4rem 1.2rem;border-radius:4px;font-size:.63rem;cursor:pointer;
            font-family:'Cinzel',serif;background:#0a0614;border:1px solid #5020a0;
            color:#9060cc;letter-spacing:.06em;transition:all .15s;">
            🔬 Sandbox: Unlock Veil
          </button>
        </div>
      `;
    }
    content.innerHTML = html;
    _drawRuinedPortalPreview(document.getElementById('ruined-portal-preview'), content);
    return;
  }

  // ── Unlocked state — full Veil UI ──
  const cfg       = getMistConfig();
  const totalMist = getTotalMist();

  let html = `
    <div class="lobby-panel-title">The Veil</div>
    <div style="color:#9070cc;font-size:.72rem;margin-bottom:12px;font-style:italic;">
      Each burden you accept is another layer of Mist.
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:8px;
                background:#120020;border:1px solid #4020aa;border-radius:6px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.8rem;
                    color:${cfg.active?'#c080ff':'#776699'};">
        <input type="checkbox" id="veil-active-toggle" ${cfg.active?'checked':''} style="accent-color:#8040cc;width:14px;height:14px;">
        <span>${cfg.active
          ? `<b style="color:#c080ff;">The Veil Active</b> — <span style="color:#e0a0ff;">🌫 ${totalMist} Mist</span>`
          : 'Enter the Veil'}</span>
      </label>
    </div>
  `;

  const dimmed = cfg.active ? '' : 'opacity:.35;pointer-events:none;';
  MIST_MODIFIERS.forEach(mod => {
    const currentTier = cfg.modifiers[mod.id] || 0;
    html += `
      <div style="${dimmed}margin-bottom:8px;padding:8px 10px;background:#0e0018;
                  border:1px solid ${currentTier>0?'#5030aa':'#241840'};border-radius:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:.76rem;color:#c0a0ee;">${mod.emoji} ${mod.label}</span>
          <span style="font-size:.65rem;color:${currentTier>0?'#a070ff':'#554477'};">
            ${currentTier>0?'Tier '+currentTier+'/'+mod.tiers:'Off'}
          </span>
        </div>
        <div style="font-size:.65rem;color:${currentTier>0?'#aa88dd':'#554477'};margin-bottom:6px;">
          ${currentTier>0?mod.desc(currentTier):'Inactive'}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button onclick="setMistModifier('${mod.id}',0)"
            style="${_veilBtnStyle(currentTier===0,'off')}">Off</button>`;
    for (let t = 1; t <= mod.tiers; t++) {
      const cost = mod.mistCost.slice(0, t).reduce((a,b)=>a+b, 0);
      html += `<button onclick="setMistModifier('${mod.id}',${t})"
        style="${_veilBtnStyle(currentTier===t,'tier')}">Tier ${t} <span style="color:#9060cc">(+${cost})</span></button>`;
    }
    html += `</div></div>`;
  });

  html += `
    <div style="margin-top:10px;padding:10px;background:#1a0030;border:1px solid #5020cc;
                border-radius:6px;text-align:center;">
      <span style="font-size:.9rem;color:#c080ff;letter-spacing:.04em;">
        🌫 Total Mist: <b>${totalMist}</b>
      </span>
      ${totalMist === 0 ? '<div style="font-size:.62rem;color:#554477;margin-top:3px;">Activate the Veil to begin</div>' : ''}
      ${cfg.active ? `<div style="margin-top:8px;">
        <button onclick="resetVeil()" style="padding:4px 14px;border-radius:4px;font-size:.63rem;
          cursor:pointer;font-family:'Cinzel',serif;background:#1a0010;border:1px solid #6020aa;
          color:#886699;transition:all .15s;">Reset All</button>
      </div>` : ''}
    </div>`;

  content.innerHTML = html;

  const toggle = document.getElementById('veil-active-toggle');
  if (toggle) {
    toggle.onchange = () => {
      const meta = getMeta();
      if (!meta.mistConfig) meta.mistConfig = { active: false, modifiers: {} };
      meta.mistConfig.active = toggle.checked;
      saveMeta();
      _renderVeilContent(content);
    };
  }
}

function _veilBtnStyle(active, type) {
  const base = `padding:3px 9px;border-radius:4px;font-size:.63rem;cursor:pointer;
                font-family:'Cinzel',serif;transition:all .15s;`;
  if (active && type === 'off') {
    return base + `background:#2a0040;border:1px solid #8040cc;color:#c080ff;`;
  }
  if (active) {
    return base + `background:#4020aa;border:1px solid #c080ff;color:#fff;`;
  }
  return base + `background:#111;border:1px solid #2a1840;color:#554477;`;
}

function setMistModifier(modId, tier) {
  const meta = getMeta();
  if (!meta.mistConfig) meta.mistConfig = { active: true, modifiers: {} };
  meta.mistConfig.modifiers[modId] = tier;
  saveMeta();
  const content = document.getElementById('lobby-panel-content');
  if (content) _renderVeilContent(content);
}

function resetVeil() {
  const meta = getMeta();
  meta.mistConfig = { active: false, modifiers: {} };
  saveMeta();
  const content = document.getElementById('lobby-panel-content');
  if (content) _renderVeilContent(content);
}

// ── Ruined portal close-up preview in the locked panel ────────────────────────
function _drawRuinedPortalPreview(canvas, content) {
  if (!canvas) return;
  const panelW = (content && content.clientWidth) ? content.clientWidth : 280;
  const size   = Math.min(220, panelW - 32);
  canvas.width  = Math.round(size);
  canvas.height = Math.round(size * 1.05);
  canvas.style.width  = canvas.width  + 'px';
  canvas.style.height = canvas.height + 'px';

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Dark stone background
  ctx.fillStyle = '#070510';
  ctx.fillRect(0, 0, W, H);

  // Ground line
  const groundY = H * 0.82;
  ctx.fillStyle = '#0e0c14';
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = '#1a1525';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

  if (typeof _drawRuinedPortal === 'function') {
    _drawRuinedPortal(ctx, W / 2, groundY, W * 0.34, false);
  }
}

// ── Veil unlock cinematic — plays when returning to lobby after Dark One defeat ──
function playVeilUnlockAnimation(onDone) {
  const overlay = document.getElementById('veil-unlock-overlay');
  if (!overlay) { if (onDone) onDone(); return; }

  let animTick   = 0;
  let dismissed  = false;
  let animFrame  = null;

  const canvas  = document.getElementById('veil-unlock-canvas');
  const titleEl = document.getElementById('veil-unlock-title');
  const subEl   = document.getElementById('veil-unlock-sub');

  if (titleEl) { titleEl.textContent = '✦ VEIL UNLOCKED ✦'; titleEl.style.opacity = '0'; }
  if (subEl)   { subEl.textContent   = 'Pass through to escape the mist'; subEl.style.opacity = '0'; }

  const size = Math.min(window.innerWidth * 0.65, 260);
  canvas.width  = Math.round(size);
  canvas.height = Math.round(size * 1.1);
  canvas.style.width  = canvas.width  + 'px';
  canvas.style.height = canvas.height + 'px';

  overlay.style.display = 'flex';

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    overlay.style.display = 'none';
    if (titleEl) titleEl.style.opacity = '0';
    if (subEl)   subEl.style.opacity   = '0';
    if (onDone) onDone();
  }

  overlay.onclick = () => { if (animTick >= 100) dismiss(); };

  function draw() {
    animFrame = requestAnimationFrame(draw);
    animTick++;
    const t = animTick;
    if (t >= 400) { dismiss(); return; }

    // Power phase: dead (0) → fully glowing (1) over frames 40–150
    const pp = Math.max(0, Math.min(1, (t - 40) / 110));

    // Background fade-in from black
    const bgA = Math.min(1, t / 15);
    ctx.fillStyle = `rgba(1,0,8,${bgA})`;
    ctx.fillRect(0, 0, W, H);

    _drawVeilAnimPortal(ctx, W / 2, H * 0.62, W * 0.3, pp, t);

    if (titleEl) titleEl.style.opacity = Math.max(0, Math.min(1, (t - 165) / 25)).toString();
    if (subEl)   subEl.style.opacity   = Math.max(0, Math.min(1, (t - 200) / 25)).toString();
  }

  draw();
}

function _drawVeilAnimPortal(ctx, bx, by, bs, pp, t) {
  const aw = bs * 1.4, ah = bs * 1.5;
  const ax = bx - aw / 2;
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.08);

  // Backdrop glow grows with power
  if (pp > 0) {
    const gA = pp * (0.25 + pulse * 0.1);
    const glow = ctx.createRadialGradient(bx, by - ah * 0.5, 0, bx, by - ah * 0.5, aw * 1.0);
    glow.addColorStop(0, `rgba(120,40,220,${gA})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ax - aw * 0.5, by - ah * 1.2, aw * 2, ah * 1.8);
  }

  // Stone colour: weathered grey → dark purple
  const sR = Math.round(42  + (26  - 42)  * pp);
  const sG = Math.round(37  + (16  - 37)  * pp);
  const sB = Math.round(53  + (32  - 53)  * pp);
  const stoneCol  = `rgb(${sR},${sG},${sB})`;
  const strokeCol = pp > 0.3 ? `rgba(58,32,96,${pp * 0.8})` : '#403040';

  const pilW = aw * 0.18, pilH = ah * 0.85;

  // Pillars
  ctx.fillStyle = stoneCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = 1;
  ctx.fillRect(ax,              by - pilH, pilW, pilH);
  ctx.strokeRect(ax,            by - pilH, pilW, pilH);
  ctx.fillRect(ax + aw - pilW,  by - pilH, pilW, pilH);
  ctx.strokeRect(ax + aw - pilW,by - pilH, pilW, pilH);

  // Cracks fade out as portal powers up
  if (pp < 0.9) {
    const crA = (1 - pp / 0.9) * 0.55;
    ctx.strokeStyle = `rgba(0,0,0,${crA})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(ax + pilW * 0.3,  by - pilH * 0.2);
    ctx.lineTo(ax + pilW * 0.6,  by - pilH * 0.4);
    ctx.lineTo(ax + pilW * 0.4,  by - pilH * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax + aw - pilW * 0.4, by - pilH * 0.35);
    ctx.lineTo(ax + aw - pilW * 0.7, by - pilH * 0.55);
    ctx.stroke();
  }

  // Arch top
  ctx.beginPath();
  ctx.arc(bx, by - pilH + aw * 0.01, aw * 0.5 - pilW * 0.5, Math.PI, 0);
  ctx.fillStyle = stoneCol; ctx.fill();
  ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.2; ctx.stroke();

  // Arch interior
  const innerR    = aw * 0.36;
  const innerGrad = ctx.createRadialGradient(bx, by - pilH + 2, 0, bx, by - pilH, innerR);
  if (pp > 0) {
    innerGrad.addColorStop(0,   `rgba(90,20,180,${0.5 + pp * 0.3 + pulse * 0.15 * pp})`);
    innerGrad.addColorStop(0.6, `rgba(40,8,100,${0.6 * pp})`);
    innerGrad.addColorStop(1,   'rgba(0,0,0,0.5)');
  } else {
    innerGrad.addColorStop(0, 'rgba(8,4,12,0.9)');
    innerGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
  }
  ctx.beginPath();
  ctx.arc(bx, by - pilH + aw * 0.01, innerR, Math.PI, 0);
  ctx.fillStyle = innerGrad; ctx.fill();

  // Mist wisps appear after portal powers up
  if (pp > 0.35) {
    const mA = (pp - 0.35) / 0.65;
    for (let i = 0; i < 3; i++) {
      const wx = bx + Math.sin(t * 0.05 + i * 2.1) * aw * 0.18;
      const wy = by - pilH * 0.3 - i * ah * 0.13 + Math.cos(t * 0.04 + i) * ah * 0.06;
      const wr = bs * (0.12 + 0.05 * Math.sin(t * 0.05 + i));
      const mg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
      mg.addColorStop(0, `rgba(160,80,255,${mA * (0.25 + pulse * 0.15)})`);
      mg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
    }
  }

  // Keystone gem
  const gemY = by - pilH - aw * 0.12;
  ctx.beginPath();
  ctx.arc(bx, gemY, bs * 0.09, 0, Math.PI * 2);
  if (pp > 0) {
    ctx.fillStyle = `rgba(180,80,255,${0.35 + pp * 0.55 + pulse * 0.1 * pp})`;
    ctx.fill();
    ctx.strokeStyle = pp > 0.5 ? '#e0a0ff' : '#7040b0';
    ctx.lineWidth = 0.8; ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(42,34,48,0.8)';
    ctx.fill();
    ctx.strokeStyle = '#302838'; ctx.lineWidth = 0.8; ctx.stroke();
  }

  // Converging energy particles during power-up
  if (pp > 0 && pp < 1) {
    const numP = 10;
    for (let i = 0; i < numP; i++) {
      const angle = (i / numP) * Math.PI * 2 + t * 0.04;
      const dist  = (1 - pp) * aw * 1.3;
      const px    = bx + Math.cos(angle) * dist;
      const py    = (by - pilH * 0.5) + Math.sin(angle) * dist * 0.5;
      ctx.fillStyle = `rgba(180,80,255,${pp * 0.7})`;
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}
