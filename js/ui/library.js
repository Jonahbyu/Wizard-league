// ===== library.js =====
// Spell Library — elemental reference + discovery tracker

const LIBRARY_ELEMENTS = ['Fire', 'Water', 'Ice', 'Lightning', 'Earth', 'Nature', 'Plasma', 'Air', 'Duo'];
const _LIB_EL_EMOJI = { Fire:'🔥', Water:'💧', Ice:'❄️', Lightning:'⚡', Earth:'🪨', Nature:'🌿', Plasma:'🔮', Air:'🌀', Duo:'✦' };

let _libActiveEl = null;
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
  tabs.style.flexDirection = 'column';
  tabs.style.gap = '.3rem';

  const meta         = getMeta();
  const seenSpells   = new Set(meta.seenSpells   || []);
  const seenPassives = new Set(meta.seenPassives || []);

  // Row 1: element tabs
  const row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;gap:.25rem;';
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
  const cont = document.getElementById('lib-content');
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
    'Reduces armor gained from your own spells. Also subtracts directly from enemy EFX, weakening their elemental effects against you.');
  _guideEntry(cont, 'Armor / Block',
    'Absorbs flat damage from incoming hits. Consumed before HP. Spells and passives can grant armor that resets each fight (temporary) or carries over (some items).');

  _guideSection(cont, 'Status Effects', '💥');
  _guideEntry(cont, '🔥 Burn',
    'Stacks accumulate on a target. Each turn, deals <b>stacks × damage-per-stack</b> to HP, bypassing armor.<br>'
    + 'Damage per stack = <span style="color:#a0c0ff;">1.0 + sourceEFX/100 + talentBonus</span> (or 1.5 with Roaring Heat).<br>'
    + '<b>sourceEFX is snapshotted when burn is applied</b> — changing EFX later doesn\'t retroactively affect existing stacks.<br>'
    + 'Burn decays by a fraction each turn depending on the spell that applied it.',
    '#c86030');
  _guideEntry(cont, '❄️ Frost',
    'Each stack reduces enemy ATK, EFX, and Armor by 1. Stacks scale with your EFX when applied: <span style="color:#a0c0ff;">stacks × (1 + EFX/50)</span>.<br>'
    + 'Decays 1 stack per turn. At 10 stacks → triggers <b>Freeze</b>: enemy skips a turn, and the next Ice hit deals 1.5× damage consuming 10 stacks.',
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
    + 'Rooted targets cannot dodge. Thorned Strikes passive doubles this bonus. Root stacks accumulate — they don\'t decay on their own.',
    '#3a8a3a');
  _guideEntry(cont, '🌿 Overgrowth',
    'Enhanced permanent root. Same +5 bonus damage per stack as regular Root. Applied by zone effects and abilities — these stacks persist between turns.',
    '#50a050');
  _guideEntry(cont, '🪨 Stone',
    'Grants +2 Armor per stack. Scales with EFX when applied. In Stone Stance, armor gained this turn is doubled. Stone stacks decay slowly each turn.',
    '#8a8a6a');
  _guideEntry(cont, '🫧 Foam',
    'Reduces ATK and EFX by 1 flat per stack, and Armor by 5 per stack. Stacks scale with applier\'s EFX. Applied by Water enemies.',
    '#4080a0');
  _guideEntry(cont, '💨 Momentum',
    'Increases damage dealt. Stacks scale with EFX: <span style="color:#a0c0ff;">stacks × (1 + EFX/50)</span>. Used by Air element.',
    '#80a0c0');

  _guideSection(cont, 'Nature Seeds', '🌱');
  _guideEntry(cont, 'Seeds — Germination System',
    'Seeds are planted mid-combat and bloom after a 5-turn timer.<br>'
    + '<b>Damage Seed:</b> deals 30 + EFX/2 direct damage when it blooms.<br>'
    + '<b>Root Seed:</b> applies 3 root stacks when it blooms.<br>'
    + 'The Perennial passive replants any bloomed seed at a 4-turn timer. Deep Roots passive reduces seed timers by 1 every 3rd root applied.',
    '#50a050');

  _guideSection(cont, 'Fire Melt', '🔩');
  _guideEntry(cont, 'Melt — Armor Destruction',
    'Melt points reduce enemy armor (their block stat) permanently for the fight. Once armor is gone, melt damage converts directly to HP damage.<br>'
    + 'Melt scales with EFX if Deep Heat passive is active. Forge Master amplifies melt points by ×1.3.',
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
  _guideEntry(cont, 'Per-Element Zone Hazards',
    'The active zone element adds a passive effect on every enemy basic attack:<br>'
    + '<span style="color:#c86030;">🔥 Fire</span> — +2 Burn applied to player per hit (scales with battle number).<br>'
    + '<span style="color:#60a0cc;">❄️ Ice</span> — +2 Frost applied to player per hit.<br>'
    + '<span style="color:#c0c020;">⚡ Lightning</span> — +1 Shock applied to player per hit.<br>'
    + '<span style="color:#4080a0;">💧 Water</span> — applies Foam to player.<br>'
    + '<span style="color:#3a8a3a;">🌿 Nature</span> — applies Root to player.<br>'
    + 'Playing the matching element doesn\'t remove these — they always apply.');

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
