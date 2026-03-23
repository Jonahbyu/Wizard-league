// ===== library.js =====
// Spell Library — elemental reference + discovery tracker

const LIBRARY_ELEMENTS = ['Fire', 'Water', 'Ice', 'Lightning', 'Earth', 'Nature', 'Plasma', 'Air', 'Duo'];
const _LIB_EL_EMOJI = { Fire:'🔥', Water:'💧', Ice:'❄️', Lightning:'⚡', Earth:'🪨', Nature:'🌿', Plasma:'🔮', Air:'🌀', Duo:'✦' };

let _libActiveEl = null;

// ─── DISCOVERY TRACKING ────────────────────────────────────────────────────
function markSpellSeen(id) {
  const meta = getMeta();
  if (!meta.seenSpells) meta.seenSpells = [];
  if (!meta.seenSpells.includes(id)) { meta.seenSpells.push(id); saveMeta(); }
}

function markPassiveSeen(id) {
  const meta = getMeta();
  if (!meta.seenPassives) meta.seenPassives = [];
  if (!meta.seenPassives.includes(id)) { meta.seenPassives.push(id); saveMeta(); }
}

// ─── DATA HELPERS ──────────────────────────────────────────────────────────
function _libSpellsFor(el) {
  if (el === 'Duo') return Object.values(SPELL_CATALOGUE).filter(s => s.tier === 'merged');
  return Object.values(SPELL_CATALOGUE).filter(s => s.element === el);
}

function _libPassivesFor(el) {
  if (el === 'Duo') return PASSIVE_CHOICES['Duo'] || [];
  return PASSIVE_CHOICES[el] || [];
}

function _libCounts(el, seenSpells, seenPassives) {
  let total = 0, seen = 0;
  _libSpellsFor(el).forEach(s => {
    total++;
    if (s.isStarter || seenSpells.has(s.id)) seen++;
  });
  _libPassivesFor(el).forEach(p => {
    total++;
    if (seenPassives.has(p.id)) seen++;
  });
  return { seen, total };
}

// ─── TOOLTIP ENGINE ────────────────────────────────────────────────────────
function _libTipShow(e, html) {
  const tip = document.getElementById('lib-tooltip');
  if (!tip) return;
  tip.innerHTML = html;
  tip.style.display = 'block';
  _libTipMove(e);
}

function _libTipMove(e) {
  const tip = document.getElementById('lib-tooltip');
  if (!tip || tip.style.display === 'none') return;
  const margin = 12;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  const tw = tip.offsetWidth  || 280;
  const th = tip.offsetHeight || 60;
  if (x + tw > window.innerWidth  - 4) x = e.clientX - tw - margin;
  if (y + th > window.innerHeight - 4) y = e.clientY - th - margin;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function _libTipHide() {
  const tip = document.getElementById('lib-tooltip');
  if (tip) tip.style.display = 'none';
}

// Attach tooltip listeners to an element
function _libTip(el, htmlFn) {
  el.addEventListener('mouseenter', e => _libTipShow(e, htmlFn()));
  el.addEventListener('mousemove',  e => _libTipMove(e));
  el.addEventListener('mouseleave', _libTipHide);
}

// Build formula HTML for a spell
function _libSpellFormulaHtml(spell) {
  const lines = [];

  // Incantation scaling
  const cfg  = typeof SPELL_INCANTATION_CONFIG !== 'undefined' && SPELL_INCANTATION_CONFIG[spell.id];
  const base = typeof _INCANTATION_BASE_VALUES !== 'undefined' && _INCANTATION_BASE_VALUES[spell.id];
  if (cfg && base != null) {
    const label  = (typeof _STAT_LABELS !== 'undefined' && _STAT_LABELS[cfg.scaledStat]) || cfg.scaledStat;
    const isFloat = cfg.scaledStat === 'frostStacks' || cfg.scaledStat === 'shockStacks'
                  || cfg.scaledStat === 'frostApplied' || cfg.scaledStat === 'multiplier'
                  || cfg.scaledStat === 'lifeStealPct' || cfg.scaledStat === 'rootChance';
    const fmtVal = v => {
      if (cfg.scaledStat === 'rootChance' || cfg.scaledStat === 'lifeStealPct') return Math.round(v * 100) + '%';
      if (cfg.scaledStat === 'multiplier') return '×' + v.toFixed(2);
      return isFloat ? v.toFixed(1) : Math.round(v);
    };
    const baseDisp  = fmtVal(base);
    const lv2Disp   = fmtVal(base + cfg.baseScale);
    const decayNote = cfg.decay < 1 ? ` (×${cfg.decay} decay)` : '';
    lines.push(`<div style="color:#a0c0ff;font-size:.62rem;"><span style="color:#6a8aaa;">Incantation:</span> ${label} — base ${baseDisp}, lv2 ${lv2Disp}, +${cfg.baseScale}${decayNote}</div>`);
  }

  // Tags
  if (spell.tags && spell.tags.length) {
    lines.push(`<div style="color:#888;font-size:.58rem;">Tags: ${spell.tags.join(', ')}</div>`);
  }

  // CD
  lines.push(`<div style="color:#666;font-size:.58rem;">Cooldown: ${spell.baseCooldown} turn${spell.baseCooldown !== 1 ? 's' : ''}</div>`);

  if (!lines.length) return `<div style="color:#666;font-size:.62rem;">No formula data.</div>`;
  return `<div style="font-family:'Cinzel',serif;font-size:.65rem;color:#c8a060;margin-bottom:.3rem;">${spell.emoji} ${spell.name}</div>${lines.join('')}`;
}

// Build formula HTML for a passive
function _libPassiveFormulaHtml(passive) {
  const detail = passive.detail;
  const name   = `<div style="font-family:'Cinzel',serif;font-size:.65rem;color:#c8a060;margin-bottom:.3rem;">${passive.emoji} ${passive.title}</div>`;
  if (detail) {
    return name + `<div style="color:#a0c0ff;font-size:.62rem;line-height:1.5;">${detail}</div>`;
  }
  return name + `<div style="color:#555;font-size:.62rem;">No additional formula data.</div>`;
}

// ─── OVERLAY ───────────────────────────────────────────────────────────────
function showLibrary() {
  if (!_libActiveEl) _libActiveEl = LIBRARY_ELEMENTS[0];
  _libRender();
  document.getElementById('spell-library-overlay').style.display = 'flex';
}

function closeLibrary() {
  _libTipHide();
  document.getElementById('spell-library-overlay').style.display = 'none';
}

// ─── RENDER ────────────────────────────────────────────────────────────────
function _libRender() {
  _libRenderTabs();
  _libRenderContent();
}

function _libRenderTabs() {
  const tabs = document.getElementById('lib-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';

  const meta         = getMeta();
  const seenSpells   = new Set(meta.seenSpells   || []);
  const seenPassives = new Set(meta.seenPassives || []);

  LIBRARY_ELEMENTS.forEach(el => {
    const { seen, total } = _libCounts(el, seenSpells, seenPassives);
    const active   = el === _libActiveEl;
    const pct      = total > 0 ? seen / total : 0;
    const countCol = pct >= 1 ? '#4aaa6a' : pct > 0 ? '#c8a060' : '#444';
    const emoji    = _LIB_EL_EMOJI[el] || '✦';

    const btn = document.createElement('button');
    btn.style.cssText = [
      'flex:1;min-width:0;padding:.3rem .2rem;border-radius:4px;cursor:pointer;',
      'display:flex;flex-direction:column;align-items:center;gap:.1rem;',
      `border:1px solid ${active ? '#c8a060' : '#2a2420'};`,
      `background:${active ? '#1a1208' : '#0a0906'};`,
    ].join('');
    btn.innerHTML = `
      <span style="font-size:.85rem;line-height:1;">${emoji}</span>
      <span style="font-size:.45rem;color:${countCol};font-family:'Cinzel',serif;">${seen}/${total}</span>`;
    btn.title = el;
    btn.onclick = () => { _libActiveEl = el; _libRender(); };
    tabs.appendChild(btn);
  });
}

function _libRenderContent() {
  const cont = document.getElementById('lib-content');
  if (!cont) return;
  cont.innerHTML = '';
  const el = _libActiveEl;
  if (!el) return;

  const meta         = getMeta();
  const seenSpells   = new Set(meta.seenSpells   || []);
  const seenPassives = new Set(meta.seenPassives || []);
  const allSpells    = _libSpellsFor(el);

  if (el === 'Duo') {
    if (allSpells.length > 0) {
      const disc = allSpells.filter(s => seenSpells.has(s.id)).length;
      cont.appendChild(_libSectionHdr('Merged Spells', disc, allSpells.length));
      allSpells.forEach(s => cont.appendChild(_libSpellRow(s, seenSpells.has(s.id))));
    }
    const passives = _libPassivesFor(el);
    if (passives.length > 0) {
      const disc = passives.filter(p => seenPassives.has(p.id)).length;
      cont.appendChild(_libSectionHdr('Duo Passives', disc, passives.length));
      passives.forEach(p => cont.appendChild(_libPassiveRow(p, seenPassives.has(p.id))));
    }
    return;
  }

  const tiers = [
    { key:'primary',   label:'Primary' },
    { key:'secondary', label:'Secondary' },
    { key:'legendary', label:'Legendary Spells' },
  ];
  tiers.forEach(({ key, label }) => {
    const spells = allSpells.filter(s => (s.tier || 'secondary') === key);
    if (!spells.length) return;
    const revealedCount = spells.filter(s => s.isStarter || seenSpells.has(s.id)).length;
    cont.appendChild(_libSectionHdr(label, revealedCount, spells.length));
    spells.forEach(s => cont.appendChild(_libSpellRow(s, s.isStarter || seenSpells.has(s.id))));
  });

  const allPassives    = _libPassivesFor(el);
  const normPassives   = allPassives.filter(p => !p.legendary);
  const legendPassives = allPassives.filter(p => p.legendary);

  if (normPassives.length > 0) {
    const disc = normPassives.filter(p => seenPassives.has(p.id)).length;
    cont.appendChild(_libSectionHdr('Passives', disc, normPassives.length));
    normPassives.forEach(p => cont.appendChild(_libPassiveRow(p, seenPassives.has(p.id))));
  }
  if (legendPassives.length > 0) {
    const disc = legendPassives.filter(p => seenPassives.has(p.id)).length;
    cont.appendChild(_libSectionHdr('Legendary Passives', disc, legendPassives.length));
    legendPassives.forEach(p => cont.appendChild(_libPassiveRow(p, seenPassives.has(p.id))));
  }

  if (!cont.children.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#444;font-size:.7rem;padding:1.5rem;text-align:center;';
    empty.textContent = 'Nothing recorded for this element yet.';
    cont.appendChild(empty);
  }
}

// ─── ROW BUILDERS ──────────────────────────────────────────────────────────
function _libSectionHdr(label, seen, total) {
  const d = document.createElement('div');
  const pct = total > 0 ? seen / total : 0;
  const col = pct >= 1 ? '#4aaa6a' : pct > 0 ? '#c8a060' : '#6a4a20';
  d.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-size:.56rem;color:#6a4a20;letter-spacing:.08em;text-transform:uppercase;margin:.65rem 0 .2rem;padding-bottom:.2rem;border-bottom:1px solid #1a1512;';
  d.innerHTML = `<span>${label}</span><span style="color:${col};">${seen} / ${total}</span>`;
  return d;
}

function _libSpellRow(spell, revealed) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:flex-start;gap:.45rem;padding:.3rem .42rem;background:#0d0b09;border:1px solid #1a1512;border-radius:3px;margin-bottom:.15rem;cursor:default;';

  if (revealed) {
    const tierColors = { primary:'#4a8a4a', secondary:'#4a6a9a', legendary:'#9a6a20', merged:'#00a09a' };
    const tier    = spell.tier || 'secondary';
    const tierCol = tierColors[tier] || '#555';
    const hasFormula = (typeof SPELL_INCANTATION_CONFIG !== 'undefined' && SPELL_INCANTATION_CONFIG[spell.id]);
    const infoHint   = hasFormula
      ? `<span style="font-size:.44rem;color:#4a6a8a;margin-left:.3rem;" title="Hover for formula">ℹ</span>`
      : '';
    row.innerHTML = `
      <span style="font-size:.9rem;line-height:1.4;flex-shrink:0;">${spell.emoji}</span>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;margin-bottom:.18rem;">
          <span style="font-size:.68rem;color:#c8a060;font-family:'Cinzel',serif;">${spell.name}${infoHint}</span>
          <span style="font-size:.44rem;color:${tierCol};border:1px solid ${tierCol};border-radius:2px;padding:.04rem .22rem;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;">${tier}</span>
          <span style="font-size:.46rem;color:#444;margin-left:auto;flex-shrink:0;">CD:${spell.baseCooldown}</span>
        </div>
        <div style="font-size:.6rem;color:#5a5a5a;line-height:1.5;white-space:normal;">${spell.desc || ''}</div>
      </div>`;
    _libTip(row, () => _libSpellFormulaHtml(spell));
  } else {
    row.style.opacity = '0.4';
    row.innerHTML = `
      <span style="font-size:.9rem;line-height:1.4;flex-shrink:0;filter:blur(3px);">⬛</span>
      <div>
        <div style="font-size:.68rem;color:#252525;font-family:'Cinzel',serif;letter-spacing:.06em;">?????? ??????</div>
        <div style="font-size:.58rem;color:#1e1e1e;margin-top:.15rem;">Undiscovered</div>
      </div>`;
  }
  return row;
}

function _libPassiveRow(passive, revealed) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:flex-start;gap:.45rem;padding:.3rem .42rem;background:#0d0b09;border:1px solid #1a1512;border-radius:3px;margin-bottom:.15rem;cursor:default;';

  if (revealed) {
    const legBadge = passive.legendary
      ? `<span style="font-size:.44rem;color:#c8a060;border:1px solid #c8a060;border-radius:2px;padding:.04rem .22rem;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;">Legendary</span>`
      : '';
    const infoHint = passive.detail
      ? `<span style="font-size:.44rem;color:#4a6a8a;margin-left:.3rem;">ℹ</span>`
      : '';
    row.innerHTML = `
      <span style="font-size:.9rem;line-height:1.4;flex-shrink:0;">${passive.emoji}</span>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;margin-bottom:.18rem;">
          <span style="font-size:.68rem;color:#a080c0;font-family:'Cinzel',serif;">${passive.title}${infoHint}</span>
          ${legBadge}
        </div>
        <div style="font-size:.6rem;color:#5a5a5a;line-height:1.5;white-space:normal;">${passive.desc || ''}</div>
      </div>`;
    _libTip(row, () => _libPassiveFormulaHtml(passive));
  } else {
    row.style.opacity = '0.4';
    row.innerHTML = `
      <span style="font-size:.9rem;line-height:1.4;flex-shrink:0;filter:blur(3px);">⬛</span>
      <div>
        <div style="font-size:.68rem;color:#252525;font-family:'Cinzel',serif;letter-spacing:.06em;">?????? ??????</div>
        <div style="font-size:.58rem;color:#1e1e1e;margin-top:.15rem;">Undiscovered</div>
      </div>`;
  }
  return row;
}
