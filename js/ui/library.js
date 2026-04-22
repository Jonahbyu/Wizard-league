// ===== library.js =====
// Spell Library — elemental reference + discovery tracker

const LIBRARY_ELEMENTS = ['Fire', 'Water', 'Ice', 'Lightning', 'Earth', 'Nature', 'Plasma', 'Air', 'Duo'];
const _LIB_EL_EMOJI = { Fire:'🔥', Water:'💧', Ice:'❄️', Lightning:'⚡', Earth:'🪨', Nature:'🌿', Plasma:'🔮', Air:'🌀', Duo:'✦' };

let _libActiveEl = null;
let _libRoot = null; // null = standalone overlay, else popup panel element
const _LIB_SPECIAL_TABS = ['Mechanics', 'Combat'];
const _LIB_SPECIAL_EMOJI = { Mechanics: '⚙️', Combat: '⚔️' };

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
  return `<div style="font-family:'Cinzel',serif;font-size:.65rem;color:#c8a060;margin-bottom:.3rem;display:flex;align-items:center;gap:.3rem;">${spellIconSVG(spell, 18)} ${spell.name}</div>${lines.join('')}`;
}

// Build formula HTML for a passive
function _libPassiveFormulaHtml(passive) {
  const detail = passive.detail;
  const name   = `<div style="font-family:'Cinzel',serif;font-size:.65rem;color:#c8a060;margin-bottom:.3rem;display:flex;align-items:center;gap:.3rem;">${passiveIconSVG(passive, 16)} ${passive.title}</div>`;
  if (detail) {
    return name + `<div style="color:#a0c0ff;font-size:.62rem;line-height:1.5;">${detail}</div>`;
  }
  return name + `<div style="color:#555;font-size:.62rem;">No additional formula data.</div>`;
}

function _libGetTabs()    { return (_libRoot || document.getElementById('spell-library-overlay')).querySelector('.lib-tabs'); }
function _libGetContent() { return (_libRoot || document.getElementById('spell-library-overlay')).querySelector('.lib-content'); }

// ─── OVERLAY ───────────────────────────────────────────────────────────────
function showLibrary() {
  _libRoot = null;
  const visibleEls = (!sandboxMode)
    ? LIBRARY_ELEMENTS.filter(el => RELEASED_ELEMENTS.includes(el) || el === 'Duo')
    : LIBRARY_ELEMENTS;
  if (!_libActiveEl || !visibleEls.includes(_libActiveEl)) _libActiveEl = visibleEls[0];
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
  const tabs = _libGetTabs();
  if (!tabs) return;
  tabs.innerHTML = '';
  tabs.style.flexDirection = 'column';
  tabs.style.gap = '.3rem';

  const meta         = getMeta();
  const seenSpells   = new Set(meta.seenSpells   || []);
  const seenPassives = new Set(meta.seenPassives || []);

  // Row 1: element tabs — non-sandbox only shows released elements + Duo
  const visibleElements = (!sandboxMode)
    ? LIBRARY_ELEMENTS.filter(el => RELEASED_ELEMENTS.includes(el) || el === 'Duo')
    : LIBRARY_ELEMENTS;
  const row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;gap:.25rem;';
  visibleElements.forEach(el => {
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
    row1.appendChild(btn);
  });
  tabs.appendChild(row1);

  // Row 2: special guide tabs
  const row2 = document.createElement('div');
  row2.style.cssText = 'display:flex;gap:.25rem;';
  _LIB_SPECIAL_TABS.forEach(tab => {
    const active = tab === _libActiveEl;
    const emoji  = _LIB_SPECIAL_EMOJI[tab] || '📖';
    const btn = document.createElement('button');
    btn.style.cssText = [
      'flex:1;padding:.28rem .4rem;border-radius:4px;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;gap:.3rem;',
      `border:1px solid ${active ? '#6a8aaa' : '#1e2830'};`,
      `background:${active ? '#091420' : '#060c14'};`,
      'color:#6a9ac0;font-size:.6rem;font-family:\'Cinzel\',serif;letter-spacing:.04em;',
    ].join('');
    btn.innerHTML = `<span style="font-size:.75rem;">${emoji}</span><span>${tab}</span>`;
    btn.onclick = () => { _libActiveEl = tab; _libRender(); };
    row2.appendChild(btn);
  });
  tabs.appendChild(row2);
}

function _libRenderContent() {
  const cont = _libGetContent();
  if (!cont) return;
  cont.innerHTML = '';
  const el = _libActiveEl;
  if (!el) return;

  if (el === 'Mechanics') { _libRenderMechanics(cont); return; }
  if (el === 'Combat')    { _libRenderCombat(cont);    return; }

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
          const actualStacks = (ef.stacks || 0) + powerBonus;
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

  const mockEnemyStatus  = { ...STATUS_DEFAULTS, block: 50 };
  const mockPlayerStatus = { ...STATUS_DEFAULTS };
  const mockEnemy = {
    hp: 50, enemyMaxHP: 50, alive: true,
    status: mockEnemyStatus,
    statPow: 5, statEfx: 5, statDef: 5, element: 'Neutral', name: 'Dummy',
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
      if (pts <= 0) return;
      const armor = mockEnemyStatus.block || 0;
      const breakCost = armor > 0 ? Math.ceil(armor / 3) : 0;
      let armorDestroyed = 0, hpDmg = 0;
      if (armor > 0 && pts >= breakCost) {
        armorDestroyed = armor;
        hpDmg = pts - breakCost;
        mockEnemyStatus.block = 0;
      } else if (armor > 0) {
        armorDestroyed = pts * 3;
        hpDmg = 0;
      } else {
        hpDmg = pts;
      }
      events.push({ type: 'melt', pts, armorDestroyed, hpDmg });
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
               + meltEvents.reduce((s, e) => s + (e.hpDmg || 0), 0);

  const effectEmojiMap = {
    burn:'🔥', frost:'❄️', stun:'💫', shock:'⚡',
    root:'🌿', foam:'🫧', block:'🛡️',
  };

  let html = `<div style="font-family:'Cinzel',serif;font-size:.65rem;color:#c8a060;margin-bottom:.35rem;padding-bottom:.25rem;border-bottom:1px solid #2a2010;">
    ⚔️ ${spell.emoji} ${spell.name} — Combat Preview
  </div>`;

  html += `<div style="font-size:.52rem;color:#6a4a20;margin-bottom:.3rem;">vs. Dummy Enemy &nbsp;·&nbsp; 50 HP &nbsp;·&nbsp; 50 Armor</div>`;
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
    if (ev.armorDestroyed > 0 && ev.hpDmg > 0) {
      html += `<div>⚒️ Melt → strips <span style="color:#aaddff;">${ev.armorDestroyed} armor</span>, then <span style="color:#ffdd99;font-weight:bold;">${ev.hpDmg} HP dmg</span></div>`;
    } else if (ev.armorDestroyed > 0) {
      html += `<div>⚒️ Melt → strips <span style="color:#aaddff;">${ev.armorDestroyed} armor</span> <span style="color:#3e3020;font-size:.5rem;">(no HP dmg — not enough pts)</span></div>`;
    } else {
      html += `<div>⚒️ Melt → <span style="color:#ffdd99;font-weight:bold;">${ev.hpDmg} HP dmg</span></div>`;
    }
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
      <span style="flex-shrink:0;">${spellIconSVG(spell, 20)}</span>
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

// ─── GUIDE TABS ────────────────────────────────────────────────────────────

function _guideSection(cont, title, emoji) {
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;gap:.4rem;font-size:.6rem;color:#6a4a20;letter-spacing:.08em;text-transform:uppercase;margin:.75rem 0 .3rem;padding-bottom:.2rem;border-bottom:1px solid #1a1512;font-family:\'Cinzel\',serif;';
  hdr.innerHTML = `<span>${emoji}</span><span>${title}</span>`;
  cont.appendChild(hdr);
}

function _guideEntry(cont, label, body, labelColor) {
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;flex-direction:column;gap:.15rem;padding:.28rem .42rem;background:#0d0b09;border:1px solid #1a1512;border-radius:3px;margin-bottom:.15rem;';
  const col = labelColor || '#c8a060';
  d.innerHTML = `<div style="font-size:.63rem;color:${col};font-family:'Cinzel',serif;">${label}</div>`
              + `<div style="font-size:.6rem;color:#5a5a5a;line-height:1.6;">${body}</div>`;
  cont.appendChild(d);
}

function _libRenderMechanics(cont) {
  _guideSection(cont, 'Core Stats', '📊');
  _guideEntry(cont, 'ATK — Attack Power',
    'Your base damage output. Spells multiply ATK by their own scaling factor. Higher ATK = bigger hits. Talents, passives, and items can raise it.');
  _guideEntry(cont, 'EFX — Elemental Force',
    'Amplifies all elemental effects you apply: burn damage per stack, frost stacks applied, root stacks, stone stacks, and momentum all scale with EFX. Formula: effect × (1 + EFX/50). Also boosts root bonus damage by +1 per 10 EFX.');
  _guideEntry(cont, 'Defense',
    'Scales how much <b>Armor</b> you gain (+2 per Defense point) and scales healing received. Also directly reduces enemy ATK and EFX, weakening their attacks. <b>Foam reduces Defense</b> — at negative Defense, enemies deal bonus damage per hit.');
  _guideEntry(cont, 'Armor',
    'Consumable damage shield. Absorbs incoming hits before HP, then depletes. Gained from the Armor action and spells. The amount gained scales with your Defense stat.');
  _guideEntry(cont, 'Block',
    'Flat damage reduction per hit — reusable, never depleted. Does <b>not</b> apply to effect/DoT damage. Currently granted by the Earth Hard Shell passive (10 flat reduction per hit).');

  _guideSection(cont, 'Status Effects', '💥');
  _guideEntry(cont, '🔥 Burn',
    'Stacks accumulate on a target. Each turn, deals <b>stacks × damage-per-stack</b> to HP, bypassing armor.<br>'
    + 'Damage per stack = <span style="color:#a0c0ff;">1.0 + yourEFX/100 + talentBonus</span> (or 1.5 with Roaring Heat) — uses your <b>current EFX</b> each tick, so EFX buffs gained mid-battle increase burn damage immediately.<br>'
    + 'Burn does <b>not decay</b> — stacks persist until the enemy dies or is cleansed.',
    '#c86030');
  _guideEntry(cont, '❄️ Frost',
    'Each stack reduces enemy ATK and EFX by 1, and reduces armor absorption by 1 per hit. Stacks scale with your EFX when applied: <span style="color:#a0c0ff;">stacks × (1 + EFX/50)</span>.<br>'
    + 'Decays 1 stack per turn. At 10 stacks → triggers <b>Freeze</b>: enemy skips a turn. An Ice hit on a frozen target deals 1.5× damage and consumes 10 stacks. Freeze also wears off naturally as frost decays to 0.',
    '#60a0cc');
  _guideEntry(cont, '⚡ Shock',
    'Reduces the shocked target\'s outgoing damage by <b>5% per stack</b> (max 75%). Applied by Lightning spells and abilities. Passives like Conduction add +1 shock per hit.',
    '#c0c020');
  _guideEntry(cont, '⚡ Surge (Lightning)',
    'A charged detonation. Loading spells fill the Surge meter; when it reaches the <b>threshold (default 60)</b>, Surge explodes for its stored damage.<br>'
    + 'Only one Surge active per target at a time. Hair Trigger lowers threshold to 50. Static Build adds +20 stored damage per turn it doesn\'t trigger.',
    '#c0c020');
  _guideEntry(cont, '🌿 Root',
    'Each root stack adds <b>+5 bonus damage taken</b> per incoming attack (+1 per 10 EFX of the attacker).<br>'
    + 'Rooted targets cannot dodge. Thorned Strikes passive doubles this bonus. Root stacks accumulate — they don\'t decay on their own.<br>'
    + '<b>Root also blocks incoming effects</b> (Burn, Stun, etc.) applied to the rooted target, consuming 1 stack per effect blocked. With Overgrowth passive, blocked stacks convert to Overgrowth instead of being lost.',
    '#3a8a3a');
  _guideEntry(cont, '🌿 Overgrowth',
    'Permanent root — same <b>+5 bonus damage taken per stack</b> as regular Root, but these stacks never decay and are never consumed.<br>'
    + 'Applied by the Overgrowth passive, which converts Root stacks into Overgrowth stacks whenever Root would block an effect.',
    '#50a050');
  _guideEntry(cont, '🪨 Stone',
    'Grants <b>+3 ATK and +2 Armor per stack</b>. Both bonuses are doubled during Stone Stance. Stacks scale with EFX when applied: <span style="color:#a0c0ff;">stacks × (1 + EFX/50)</span>. Decay slowly each turn.',
    '#8a8a6a');
  _guideEntry(cont, '🫧 Foam',
    'Reduces <b>Defense by 1.5 per stack</b>. Since Defense scales Armor gains and attenuates enemy stats, heavy Foam prevents effective blocking. At negative Defense, each enemy hit deals bonus damage equal to the deficit. Stacks scale with applier\'s EFX.',
    '#4080a0');
  _guideEntry(cont, '💨 Momentum',
    'Each stack grants <b>+0.8 ATK</b> and <b>+2% dodge chance</b> (cap 80%). Stacks scale with EFX: <span style="color:#a0c0ff;">stacks × (1 + EFX/50)</span>. Gained on every hit landed.<br>'
    + 'On dodge: lose <b>25% of stacks</b> (10% with Slipstream passive). Become Wind ability prevents this decay for one dodge.',
    '#80a0c0');

  _guideSection(cont, 'Dodge & Phase', '💨');
  _guideEntry(cont, 'Dodge',
    'Some elements and passives grant a chance to fully evade incoming hits. A dodged attack deals no damage and applies no effects.<br>'
    + '<b>Air:</b> +2% dodge per Momentum stack (cap 80%). Each dodge costs 25% of Momentum (10% with Slipstream).<br>'
    + '<b>Plasma:</b> Ghost Step talent grants a flat dodge chance (up to 50%).<br>'
    + 'Dodge does not protect against DoT/effect damage (burn ticks, frost ticks, etc.).');
  _guideEntry(cont, 'Phase',
    'Full phase grants <b>100% dodge</b> for N turns. Every incoming hit is evaded — no damage, no effects. Phase is consumed one turn at a time.');

  _guideSection(cont, 'Nature Seeds', '🌱');
  _guideEntry(cont, 'Seeds — Germination System',
    'Seeds are planted mid-combat and bloom after a 5-turn timer. Planting the same type again adds stacks — all bloom on the original timer (timer does not reset).<br>'
    + '<b>Damage Seed:</b> deals 30 + EFX/2 direct damage per stack when it blooms.<br>'
    + '<b>Root Seed:</b> applies 3 root stacks per stack when it blooms.<br>'
    + '<b>Healing Seed:</b> planted on <i>yourself</i> — blooms to restore <b>50 + DEF HP per stack</b> (scales with incantation level).<br>'
    + '<b>Silence Seed:</b> planted on the enemy — blooms to <b>silence</b> them, disabling their active spellbook for 1 turn (scales with incantation level). Each cast is independent and does not merge.<br>'
    + 'The Perennial passive replants any bloomed seed at a 4-turn timer. Deep Roots passive reduces seed timers by 1 every 3rd root applied.',
    '#50a050');
  _guideEntry(cont, '🤫 Silence',
    'A silenced enemy cannot use abilities for the duration. Basic attacks still fire. Silence is applied by Silence Seed on bloom and decays 1 turn per round.',
    '#a050a0');

  _guideSection(cont, 'Fire Melt', '🔩');
  _guideEntry(cont, 'Melt — Armor Destruction',
    'Each melt point strips <b>3 Armor</b> from the target. To fully break all Armor costs <b>ceil(Armor ÷ 3)</b> melt points — any melt left over converts to <b>direct HP damage at 1:1</b>. If you can\'t break all the Armor in one hit, no HP damage is dealt — only Armor is chipped.<br>'
    + '<b>Forge Master:</b> +30% melt points. <b>Deep Heat:</b> +EFX/5 bonus melt points; also converts 50% of stripped Armor into bonus melt. <b>Meltdown</b> legendary: when Armor fully breaks, gain bonus melt equal to its peak value.',
    '#c06030');

  _guideSection(cont, 'Incantations', '✦');
  _guideEntry(cont, 'Spell Upgrades',
    'Incantations upgrade individual spells. Each level boosts one stat (e.g. burn stacks, damage, root chance) by a base amount that decays slightly with each additional level.<br>'
    + 'Formula: <span style="color:#a0c0ff;">+baseScale × decay^(level−2)</span> per upgrade beyond lv1. Hover any spell in the element tabs to see its scaling.');
}

function _libRenderCombat(cont) {
  _guideSection(cont, 'Run Structure', '🗺️');
  _guideEntry(cont, 'Zones & Gyms',
    'A run progresses through zones, each ending with a <b>Gym Boss</b>. Within each zone you fight a series of regular battles before reaching the gym.<br>'
    + 'Enemies get progressively harder each zone: HP scales by ×1.28 per gym, damage by ×1.22, and elemental power by +4.4 per gym.');
  _guideEntry(cont, 'Starting a Run',
    'At the start of each run you pick your <b>element</b>. Your first reward after battle 1 is always a <b>primary spell</b> — your starting move. You begin with only that one spell.',
    '#c8a060');
  _guideEntry(cont, 'Choosing a Path',
    'After each battle you see two encounter options. Each has a visible <b>reward type</b> attached. Pick the path whose reward you want more.',
    '#c8a060');

  _guideSection(cont, 'Rewards', '✦');
  _guideEntry(cont, 'Reward Types',
    '<b style="color:#a080ff;">Spell</b> — choose 1 of 3 spells to add to your spellbook.<br>'
    + '<b style="color:#a080ff;">Primary Spell</b> — battle 1 of each run, picks a primary-tier spell.<br>'
    + '<b style="color:#c8a060;">Incantation</b> — upgrade one spell you already own to the next level.<br>'
    + '<b style="color:#888;">Minor</b> — small stat boost (gold, HP heal, ATK, etc.).<br>'
    + '<b style="color:#c8a060;">Major</b> — significant boost (large heal, passive stat, etc.).<br>'
    + 'Reward chances per non-gym battle: 20% Spell · 30% Incantation · 30% Minor · 20% Major.');
  _guideEntry(cont, 'Passive Rewards',
    'Passives are not earned from regular battles — they come from <b>Gym clears</b> and <b>Rival defeats</b>. You choose from 3 options. Legendary passives can appear with lower probability.');
  _guideEntry(cont, 'Gym Clear Rewards',
    'Defeating the Gym Boss gives you: a <b>full HP heal</b>, a passive reward, and bonus gold. The gym\'s element determines what the boss does in combat.',
    '#c8a060');

  _guideSection(cont, 'Combat Turn Order', '⚔️');
  _guideEntry(cont, 'Player Turn',
    'You have a set number of actions per turn (usually 1–2 depending on spells). Play spells from your spellbook in any order. Cooldowns track how many turns until a spell is usable again. When you end your turn, enemy turn begins.');
  _guideEntry(cont, 'Enemy Turn',
    'The enemy acts: attacks, applies zone effects, uses abilities. Basic attacks hit for scaled damage. Some enemies have multiple hits or special abilities that trigger passively.<br>'
    + 'Zone effects apply extra status on every enemy attack (e.g. Fire zones apply +2 Burn to the player per hit).');
  _guideEntry(cont, 'End of Turn',
    'After each side\'s actions: burn ticks deal damage, frost decays, stone decays, surge meters may trigger. Effects that say "per turn" resolve here.');

  _guideSection(cont, 'HP & Healing', '❤️');
  _guideEntry(cont, 'HP Persists Between Battles',
    'You do <b>not</b> fully heal between regular fights. Manage your HP carefully. Some minor rewards offer small heals, and some spells/passives provide lifesteal or shields.',
    '#cc4444');
  _guideEntry(cont, 'Gym Clear: Full Heal',
    'Clearing the Gym Boss <b>fully restores your HP</b>. Plan your pathing to reach the gym before you run out.',
    '#4aaa6a');

  _guideSection(cont, 'Zone Effects', '🌍');
  const _zoneHazardLines = [
    ['#c86030', '🔥 Fire',      '+2 Burn applied to player per hit (scales with battle number).', 'Fire'],
    ['#c0c020', '⚡ Lightning', '+1 Shock applied to player per hit.',                             'Lightning'],
    ['#3a8a3a', '🌿 Nature',    '50% chance to apply Root to player per hit.',                     'Nature'],
    ['#60a0cc', '❄️ Ice',       '+2 Frost applied to player per hit.',                             'Ice'],
    ['#4080a0', '💧 Water',     'applies Foam to player.',                                         'Water'],
    ['#8B6914', '🪨 Earth',     'attacker gains +1 Stone per hit.',                               'Earth'],
    ['#DA70D6', '🔮 Plasma',    '+25% healing for this zone.',                                     'Plasma'],
    ['#B0E0E6', '🌀 Air',       '20% chance to stun player for 1 turn per hit.',                  'Air'],
  ];
  const _visibleHazards = sandboxMode
    ? _zoneHazardLines
    : _zoneHazardLines.filter(([,,, el]) => RELEASED_ELEMENTS.includes(el));
  _guideEntry(cont, 'Per-Element Zone Hazards',
    'The active zone element adds a passive effect on every enemy basic attack:<br>'
    + _visibleHazards.map(([color, name, desc]) =>
        `<span style="color:${color};">${name}</span> — ${desc}`).join('<br>')
    + '<br>Playing the matching element doesn\'t remove these — they always apply.');

  _guideSection(cont, 'Talent Levels', '⭐');
  _guideEntry(cont, 'Novice → Master',
    'Talent level is set before a run and determines your starting power. Higher talent levels unlock stronger versions of incantation scaling, passive bonuses, and spell base values.<br>'
    + 'Talents are bought with <b>Phos</b>, earned by surviving battles and clearing gyms across all your runs. You keep Phos permanently between runs.',
    '#c8a060');

  _guideSection(cont, 'Spellbooks', '📚');
  _guideEntry(cont, 'Multiple Books',
    'Your spells are organized into spellbooks. In combat you play from the active book. You can edit books from the map before a run starts — assign spells to whichever book fits your strategy.');
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
      <span style="flex-shrink:0;display:flex;align-items:center;">${passiveIconSVG(passive, 20)}</span>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;margin-bottom:.18rem;">
          <span style="font-size:.68rem;color:#f0f0f8;font-family:'Cinzel',serif;">${passive.title}${infoHint}</span>
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
