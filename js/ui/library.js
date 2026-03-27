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

// ─── COMBAT PREVIEW SIMULATION ─────────────────────────────────────────────

// Run spell.execute() in a sandboxed environment, capture damage/effect events,
// then restore all globals.  Safe to call at any game state (map, between runs, etc.)
function _libSimulateSpell(spell) {
  if (!spell || typeof spell.execute !== 'function') return [];

  const events = [];
  const simAtk = (typeof player !== 'undefined') ? Math.max(0, player.attackPower) : 5;
  const simEfx = (typeof player !== 'undefined') ? Math.max(0, player.effectPower) : 3;

  // Minimal spell context — mirrors makeSpellCtx without touching real game state
  const mockS = {
    attackerSide:    'player',
    defenderSide:    'enemy',
    attackPow:       () => simAtk,
    effectPow:       () => simEfx,
    defStat:         () => 0,
    effectivePower:  () => simAtk,
    pushTempPower:   () => {},
    log:             () => {},
    get state() {
      return { self: { ...STATUS_DEFAULTS }, target: { ...STATUS_DEFAULTS } };
    },
    healSelf: (amt) => {
      if (amt > 0) events.push({ type: 'heal', amount: Math.round(amt) });
    },
    hit: (pkg) => {
      const hits   = pkg.hits || 1;
      const bd     = Math.max(0, pkg.baseDamage || 0);
      const mult   = spell.dmgMult || 1.0;
      let perHit   = Math.round((bd + simAtk) * mult);
      // Plasma: EFX adds to damage the same way ATK does
      const isPlasma = typeof playerElement !== 'undefined' && playerElement === 'Plasma';
      if (isPlasma) perHit += simEfx;
      // Apply real effect formulas (mirroring performHit)
      const processedEffects = (pkg.effects || []).map(ef => {
        if (ef.type === 'burn') {
          const powerBonus  = Math.floor(simEfx * 0.2);
          const actualStacks = Math.round(((ef.stacks || 0) + powerBonus) * 0.75);
          return { ...ef, stacks: actualStacks, _rawStacks: ef.stacks || 0 };
        }
        return { ...ef };
      });
      events.push({
        type:      'damage',
        hits,
        dmgPerHit: perHit,
        total:     perHit * hits,
        effects:   processedEffects,
        isAOE:     !!pkg.isAOE,
        _isPlasma: isPlasma,
      });
    },
  };

  const mockEnemyStatus  = { ...STATUS_DEFAULTS };
  const mockPlayerStatus = { ...STATUS_DEFAULTS };
  const mockEnemy = {
    hp: 50, enemyMaxHP: 50, alive: true,
    status: mockEnemyStatus,
    scaledPower: 5, element: 'Neutral', name: 'Dummy',
    enemyDmg: 10, items: [], extraPassives: [],
  };

  // Functions to silence (DOM/animation/render side-effects)
  const _noopKeys = [
    'renderStatusTags', 'renderEnemyCards', 'renderBattlefield',
    'renderSummonsRow', 'updateHPBars', 'updateActionUI', 'updateStatsUI',
    'triggerSpellAnim', 'triggerHealAnim', 'log', 'checkDeath', 'checkWin',
    'setActiveEnemy', 'aliveEnemies',
  ];
  // Functions to intercept and capture
  const _captureKeys = ['applyDirectDamage', 'applyMelt', 'totalEnemyBurnStacks'];

  const _saved = {};
  [..._noopKeys, ..._captureKeys].forEach(k => { _saved[k] = window[k]; });

  // Save the slice of combat/status we will temporarily overwrite
  const _sc = {
    enemies: combat.enemies, enemy: combat.enemy,
    activeEnemyIdx: combat.activeEnemyIdx, targetIdx: combat.targetIdx,
    over: combat.over,
  };
  const _ssPlayer = status.player;
  const _ssEnemy  = status.enemy;

  try {
    _noopKeys.forEach(k => { window[k] = () => {}; });

    window.applyDirectDamage = (_a, _d, dmg, label) => {
      if (dmg > 0) events.push({ type: 'damage', hits: 1, dmgPerHit: dmg, total: dmg, effects: [], label: label || '' });
    };
    window.applyMelt = (_a, _d, pts) => {
      if (pts > 0) events.push({ type: 'melt', pts });
    };
    window.totalEnemyBurnStacks = () => 0;

    combat.enemies        = [mockEnemy];
    combat.enemy          = mockEnemy;
    combat.activeEnemyIdx = 0;
    combat.targetIdx      = 0;
    combat.over           = false;
    status.player         = mockPlayerStatus;
    status.enemy          = mockEnemyStatus;

    spell.execute(mockS);

  } catch (_) { /* keep whatever was captured */ } finally {
    [..._noopKeys, ..._captureKeys].forEach(k => {
      if (_saved[k] !== undefined) window[k] = _saved[k];
    });
    combat.enemies        = _sc.enemies;
    combat.enemy          = _sc.enemy;
    combat.activeEnemyIdx = _sc.activeEnemyIdx;
    combat.targetIdx      = _sc.targetIdx;
    combat.over           = _sc.over;
    status.player         = _ssPlayer;
    status.enemy          = _ssEnemy;
  }

  return events;
}

// Build the combat-preview section of the tooltip HTML
function _libCombatPreviewHtml(spell) {
  const simAtk = (typeof player !== 'undefined') ? player.attackPower : 5;
  const events  = _libSimulateSpell(spell);

  const dmgEvents  = events.filter(e => e.type === 'damage');
  const meltEvents = events.filter(e => e.type === 'melt');
  const healEvents = events.filter(e => e.type === 'heal');

  let totalDmg = dmgEvents.reduce((s, e) => s + e.total, 0)
               + meltEvents.reduce((s, e) => s + e.pts, 0);

  const effectEmojiMap = {
    burn:'🔥', frost:'❄️', stun:'💫', shock:'⚡',
    root:'🌿', foam:'🫧', block:'🛡️',
  };

  let html = `<div style="font-family:'Cinzel',serif;font-size:.65rem;color:#c8a060;margin-bottom:.35rem;padding-bottom:.25rem;border-bottom:1px solid #2a2010;">
    ⚔️ ${spell.emoji} ${spell.name} — Combat Preview
  </div>`;

  html += `<div style="font-size:.52rem;color:#6a4a20;margin-bottom:.3rem;">vs. Dummy Enemy &nbsp;·&nbsp; 50 HP &nbsp;·&nbsp; 0 Armor</div>`;
  html += `<div style="font-size:.58rem;line-height:1.75;color:#c0a870;">`;
  html += `<div style="color:#7080a0;margin-bottom:.2rem;">🧙 You cast the spell...</div>`;

  if (dmgEvents.length === 0 && meltEvents.length === 0 && healEvents.length === 0) {
    html += `<div style="color:#6a5a40;font-style:italic;">No direct damage — buff / effect spell</div>`;
  }

  dmgEvents.forEach(ev => {
    const simEfx = (typeof player !== 'undefined') ? player.effectPower : 3;
    // Build breakdown suffix
    let breakdown;
    if (ev._isPlasma) {
      const base = Math.max(0, ev.dmgPerHit - simAtk - simEfx);
      breakdown = `(${base} base + ${simAtk} ATK + ${simEfx} EFX)`;
    } else {
      const base = Math.max(0, ev.dmgPerHit - simAtk);
      breakdown = `(${base} base + ${simAtk} ATK)`;
    }
    if (ev.isAOE) {
      html += `<div>💥 AoE hit → <span style="color:#ffcc88;font-weight:bold;">${ev.dmgPerHit} dmg</span> <span style="color:#443a28;font-size:.5rem;">each · ${breakdown}</span></div>`;
    } else if (ev.hits > 1) {
      html += `<div>⚔️ ${ev.hits} hits × <span style="color:#ffcc88;">${ev.dmgPerHit}</span> = <span style="color:#ffdd99;font-weight:bold;">${ev.total} dmg</span> <span style="color:#3e3020;font-size:.5rem;">${breakdown}</span></div>`;
    } else {
      html += `<div>⚔️ <span style="color:#ffdd99;font-weight:bold;">${ev.total} dmg</span> <span style="color:#3e3020;font-size:.5rem;">${breakdown}</span></div>`;
    }
    // Effects from this hit — multiply per-hit stacks by number of hits
    const efGrp = {};
    (ev.effects || []).forEach(ef => {
      efGrp[ef.type] = (efGrp[ef.type] || 0) + (ef.stacks || 1);
    });
    Object.entries(efGrp).forEach(([type, perHit]) => {
      const total = perHit * ev.hits;
      const detail = ev.hits > 1
        ? `${perHit} × ${ev.hits} hits = <span style="color:#d4aa60;">${total}</span>`
        : `<span style="color:#d4aa60;">${total}</span>`;
      html += `<div style="padding-left:.6rem;color:#a09060;">${effectEmojiMap[type] || '✦'} ${detail} ${type}</div>`;
    });
  });

  meltEvents.forEach(ev => {
    html += `<div>⚒️ Melt → <span style="color:#ffdd99;font-weight:bold;">~${ev.pts} dmg</span> <span style="color:#3e3020;font-size:.5rem;">(0 armor)</span></div>`;
  });

  healEvents.forEach(ev => {
    html += `<div>💚 Heal self → <span style="color:#88ee88;">+${ev.amount} HP</span></div>`;
  });

  if (totalDmg > 0 && events.filter(e => e.type !== 'heal').length > 1) {
    html += `<div style="margin-top:.25rem;padding-top:.25rem;border-top:1px solid #2a2010;color:#ffee99;font-weight:bold;">Total: ${totalDmg} dmg</div>`;
  }

  html += `</div>`;
  const simEfxFooter = (typeof player !== 'undefined') ? player.effectPower : 3;
  html += `<div style="font-size:.44rem;color:#3a2818;margin-top:.3rem;padding-top:.25rem;border-top:1px solid #1a1208;">Simulated · ATK: ${simAtk} &nbsp;·&nbsp; EFX: ${simEfxFooter}</div>`;

  return html;
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
    row.style.cursor = 'help';
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
    _libTip(row, () => {
      const preview = _libCombatPreviewHtml(spell);
      const formula = _libSpellFormulaHtml(spell);
      return preview + `<div style="border-top:1px solid #2a2010;margin:.45rem 0 .3rem;"></div>` + formula;
    });
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
