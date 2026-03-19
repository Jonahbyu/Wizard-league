// ===== veil.js =====
// ── The Veil UI ───────────────────────────────────────────────────────────────

function openVeilPanel() {
  const panel   = document.getElementById('lobby-panel');
  const content = document.getElementById('lobby-panel-content');
  if (!panel || !content) return;
  _renderVeilContent(content);
  panel.style.display = 'block';
}

function _renderVeilContent(content) {
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
