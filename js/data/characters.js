// ===== characters.js =====
// ─── CHARACTER SELECT ─────────────────────────────────────────────────────────
// Shown once at the start of a run (after title, before element select).
// Each character shows a random buff from its pool — player picks one.

let playerCharId   = '';   // 'battlemage' | 'hexblade' | 'arcanist'
let playerCharBuff = null;     // { id, name, emoji, desc, apply }

// ─── Character Roster ─────────────────────────────────────────────────────────
const CHARACTER_ROSTER = [
  {
    id:    'battlemage',
    name:  'Battlemage',
    title: 'The Ironweave',
    desc:  'Forged in war. Channels magic through heavy armor and sheer endurance.',
    flavor:'They say he was hit by lightning seven times. He just got angrier.',
    color:  '#c8802a',
    hatColor: '#8a4a10',
    robeColor: '#5a3020',
    buffPool: ['buff_hp_bonus', 'buff_def_bonus', 'buff_block_start'],
  },
  {
    id:    'hexblade',
    name:  'Hexblade',
    title: 'The Shadowcast',
    desc:  'A blade-dancer who weaves curses into every strike. Fast, precise, lethal.',
    flavor:'She does not dodge spells. She redirects them. Into your face.',
    color:  '#9a6aee',
    hatColor: '#4a2080',
    robeColor: '#1e0e3a',
    buffPool: ['buff_atk_bonus', 'buff_gold_start', 'buff_potion_start'],
  },
  {
    id:    'arcanist',
    name:  'Arcanist',
    title: 'The Scholar',
    desc:  'A pure-theory wizard who has turned study into devastating practice.',
    flavor:'Every status effect is a theorem. Every battle, a proof.',
    color:  '#4a9aee',
    hatColor: '#1a3a8a',
    robeColor: '#0e1e4a',
    buffPool: ['buff_efx_bonus', 'buff_spell_start', 'buff_xp_bonus'],
  },
];

// ─── Buff Definitions ─────────────────────────────────────────────────────────
// apply() is called once during beginRun(), after player stats are reset.
// TODO: fill in more exotic buffs — these are the scaffolded starters.
const CHARACTER_BUFFS = {

  // ── Warrior buffs ──────────────────────────────────────────────────────────
  buff_hp_bonus: {
    name: 'Fortitude', emoji: '🛡️',
    desc: 'Start with +50 max HP.',
    apply() {
      player.baseMaxHPBonus = (player.baseMaxHPBonus || 0) + 50;
      player.hp = Math.min(maxHPFor('player'), player.hp + 50);
    },
  },
  buff_def_bonus: {
    name: 'Iron Skin', emoji: '⚙️',
    desc: 'Start with +5 Defense.',
    apply() { player.defense += 5; },
  },
  buff_block_start: {
    name: 'Bulwark', emoji: '🪨',
    desc: 'Enter every battle with 25 pre-stacked Block.',
    // Applied in loadBattle via player._blockStart flag
    apply() { player._blockStart = (player._blockStart || 0) + 25; },
  },

  // ── Rogue buffs ────────────────────────────────────────────────────────────
  buff_atk_bonus: {
    name: 'Keen Edge', emoji: '⚔️',
    desc: 'Start with +5 Attack Power.',
    apply() { player.attackPower += 5; },
  },
  buff_gold_start: {
    name: 'Profiteer', emoji: '💰',
    desc: 'Start with 60 gold.',
    apply() { player.gold += 60; },
  },
  buff_potion_start: {
    name: 'Prepared', emoji: '🧪',
    desc: 'Start with 2 Health Potions.',
    apply() { addItem('health_potion'); addItem('health_potion'); },
  },

  // ── Mage buffs ─────────────────────────────────────────────────────────────
  buff_efx_bonus: {
    name: 'Arcanist', emoji: '🔮',
    desc: 'Start with +5 Effect Power.',
    apply() { player.effectPower += 5; },
  },
  buff_spell_start: {
    name: 'Head Start', emoji: '📚',
    desc: 'Begin the run with an extra spell of your element.',
    // Applied after element is selected — flag checked in beginRun
    apply() { player._extraStartSpell = true; },
  },
  buff_xp_bonus: {
    name: 'Deep Study', emoji: '📖',
    desc: 'Gain +5 Effect Power at run start.',
    apply() { player.effectPower = (player.effectPower || 0) + 5; },
  },

  // ── TODO: add more exotic buffs here ──────────────────────────────────────
  // buff_todo_1: { name:'???', emoji:'❓', desc:'(Coming soon)', apply(){} },
};

// ─── Roll a buff for a character ─────────────────────────────────────────────
function rollCharacterBuff(charId) {
  const ch = CHARACTER_ROSTER.find(c => c.id === charId);
  if (!ch) return null;
  const pool = ch.buffPool.filter(id => CHARACTER_BUFFS[id]);
  if (!pool.length) return null;
  const id  = pool[Math.floor(Math.random() * pool.length)];
  const def = CHARACTER_BUFFS[id];
  return { id, ...def };
}

// Apply the chosen character's buff — called once from beginRun()
function applyCharacterBuff() {
  if (playerCharBuff && typeof playerCharBuff.apply === 'function') {
    try { playerCharBuff.apply(); }
    catch (e) { console.warn('[CharBuff] apply error:', e); }
  }
}

// ─── Screen rendering ─────────────────────────────────────────────────────────
let _charRolledBuffs = {};   // charId → rolled buff (fresh each visit)

// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

// All customization options
// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD BUILDER — all customization maps to actual sprite color overrides
// ═══════════════════════════════════════════════════════════════════════════════

const WIZ_ARCHETYPES = [
  { id:'battlemage', name:'Battlemage', emoji:'⚔', desc:'Armored. Bonus HP and defense.', sprite:'SPRITE_CHAR_WARRIOR' },
  { id:'hexblade',   name:'Hexblade',   emoji:'🗡', desc:'Shadow caster. Bonus gold and curses.', sprite:'SPRITE_CHAR_ROGUE' },
  { id:'arcanist',   name:'Arcanist',   emoji:'⭐', desc:'Scholar. Bonus spell options and effect power.', sprite:'SPRITE_CHAR_MAGE' },
];

// Hat color — overrides 'h' char (which maps to pal[1] by default, but we override)
const WIZ_HAT_COLORS = [
  { id:'navy',    name:'Navy',    color:'#102060' },
  { id:'violet',  name:'Violet',  color:'#3a0e80' },
  { id:'forest',  name:'Forest',  color:'#0e3a10' },
  { id:'scarlet', name:'Scarlet', color:'#5a0e0e' },
  { id:'black',   name:'Black',   color:'#111116' },
  { id:'teal',    name:'Teal',    color:'#0a2e30' },
  { id:'gold',    name:'Gold',    color:'#3a2800' },
  { id:'grey',    name:'Grey',    color:'#2a2a32' },
];

// Outfit — overrides pal[0] (primary robe), pal[1] auto-darkened for shadow
const WIZ_OUTFIT_COLORS = [
  { id:'midnight', name:'Midnight', p0:'#1a1060', p1:'#0c0840', p2:'#2a1a80', p3:'#8878cc' },
  { id:'crimson',  name:'Crimson',  p0:'#601010', p1:'#380808', p2:'#881818', p3:'#cc5050' },
  { id:'forest',   name:'Forest',   p0:'#0e3a10', p1:'#062008', p2:'#186018', p3:'#50aa50' },
  { id:'gold',     name:'Golden',   p0:'#3a2c08', p1:'#201808', p2:'#604818', p3:'#d0a030' },
  { id:'ocean',    name:'Ocean',    p0:'#0e1e60', p1:'#081040', p2:'#182888', p3:'#4080d0' },
  { id:'dusk',     name:'Dusk',     p0:'#2a1040', p1:'#140820', p2:'#401860', p3:'#9050c0' },
  { id:'iron',     name:'Iron',     p0:'#2a2a30', p1:'#181818', p2:'#3a3a44', p3:'#8888a0' },
  { id:'ember',    name:'Ember',    p0:'#3a1408', p1:'#1e0a04', p2:'#601a08', p3:'#d04010' },
];

// Beard — overrides 'w' char; 'none' removes all 'w' pixels
const WIZ_BEARD_COLORS = [
  { id:'white',  name:'White',  color:'#e8e0d0' },
  { id:'grey',   name:'Grey',   color:'#a0989a' },
  { id:'black',  name:'Black',  color:'#1a1418' },
  { id:'brown',  name:'Brown',  color:'#6a3810' },
  { id:'auburn', name:'Auburn', color:'#8a2808' },
  { id:'gold',   name:'Golden', color:'#c8a030' },
];
const WIZ_BEARD_STYLES = [
  { id:'show', name:'Beard' },
  { id:'none', name:'Clean' },
];

// Staff wood — overrides 'f' char
const WIZ_STAFF_COLORS = [
  { id:'oak',   name:'Oak',   color:'#8a5010' },
  { id:'dark',  name:'Dark',  color:'#2a1a0a' },
  { id:'bone',  name:'Bone',  color:'#d8c8a0' },
  { id:'ebony', name:'Ebony', color:'#1a1010' },
  { id:'birch', name:'Birch', color:'#c8b898' },
  { id:'iron',  name:'Iron',  color:'#404850' },
];

// Staff glow — overrides 'g' char (pal[3] by default)
const WIZ_STAFF_GLOWS = [
  { id:'blue',   name:'Blue',   color:'#60aaff' },
  { id:'green',  name:'Green',  color:'#50dd70' },
  { id:'red',    name:'Red',    color:'#ff6040' },
  { id:'purple', name:'Purple', color:'#cc80ff' },
  { id:'gold',   name:'Gold',   color:'#ffd040' },
  { id:'white',  name:'White',  color:'#e8f0ff' },
  { id:'teal',   name:'Teal',   color:'#40ddc0' },
  { id:'none',   name:'None',   color:null },
];

// Eye color — overrides 'e' char
const WIZ_EYE_COLORS = [
  { id:'red',    name:'Red',    color:'#dd3322' },
  { id:'blue',   name:'Blue',   color:'#2255cc' },
  { id:'green',  name:'Green',  color:'#226622' },
  { id:'amber',  name:'Amber',  color:'#aa6600' },
  { id:'purple', name:'Purple', color:'#7722aa' },
  { id:'silver', name:'Silver', color:'#7788aa' },
  { id:'void',   name:'Void',   color:'#080808' },
  { id:'white',  name:'White',  color:'#ddeeff' },
];

const WIZ_DEFAULTS = {
  archetype:  'battlemage',
  hatColor:   'navy',
  outfit:     'midnight',
  beardStyle: 'show',
  beardColor: 'white',
  staffColor: 'oak',
  staffGlow:  'blue',
  eyeColor:   'red',
};

let _wizBuild = {...WIZ_DEFAULTS};
let _wizBuilderFromLobby = false; // true when opened from the lobby tailor, so "continue" returns to lobby

function _applyWizBuild(patch) {
  Object.assign(_wizBuild, patch);
  patchActiveSlot({ wizardBuild: _wizBuild });
  _renderWizBuilder();
}

function showCharacterScreen() {
  const slotData = getActiveSlotData();
  if (slotData.wizardBuild) {
    _wizBuild = Object.assign({...WIZ_DEFAULTS}, slotData.wizardBuild);
  } else if (slotData.savedCharId) {
    _wizBuild = {...WIZ_DEFAULTS, archetype: slotData.savedCharId};
  }
  playerCharId = _wizBuild.archetype;
  _charRolledBuffs = {};
  CHARACTER_ROSTER.forEach(ch => { _charRolledBuffs[ch.id] = rollCharacterBuff(ch.id); });
  _renderWizBuilder();
  showScreen('character-screen');
  // Update button label depending on context
  const continueBtn = document.getElementById('char-continue-btn');
  if (continueBtn) continueBtn.textContent = _wizBuilderFromLobby ? 'Save ✓' : 'Continue →';
}

function _renderWizBuilder() {
  _renderWizSection('archetype', 'Wizard Type',  _buildArchetypeOpts());
  _renderWizBoon();
  _renderWizSection('hat',       'Hat Color',    _buildColorOpts(WIZ_HAT_COLORS,    'hatColor',   c => `background:${c.color};`));
  _renderWizSection('outfit',    'Outfit Color', _buildColorOpts(WIZ_OUTFIT_COLORS, 'outfit',     c => `background:linear-gradient(135deg,${c.p0},${c.p1});`));
  _renderWizSection('beard',     'Beard',        _buildBeardOpts());
  _renderWizSection('staff',     'Staff Wood',   _buildColorOpts(WIZ_STAFF_COLORS,  'staffColor', c => `background:${c.color};`));
  _renderWizSection('staffglow', 'Orb Glow',     _buildColorOpts(WIZ_STAFF_GLOWS,   'staffGlow',  c => c.color ? `background:radial-gradient(circle,${c.color},${c.color}66);` : 'background:#0a0806;', true));
  _renderWizSection('eyes',      'Eye Color',    _buildColorOpts(WIZ_EYE_COLORS,    'eyeColor',   c => `background:${c.color};`));
  _renderWizPreview();
}

function _renderWizSection(id, label, html) {
  const el = document.getElementById('wiz-section-' + id);
  if (!el) return;
  el.innerHTML = `<div class="wiz-section"><div class="wiz-section-label">${label}</div><div class="wiz-opts">${html}</div></div>`;
}

function _wizOpt(selected, onclick, swatchStyle, label, extra) {
  return `<div class="wiz-opt${selected?' selected':''}" onclick="${onclick}">
    <div class="wiz-opt-swatch" style="${swatchStyle}">${extra||''}</div>
    <div class="wiz-opt-label">${label}</div>
  </div>`;
}

function _buildColorOpts(list, key, styleFn, noneOpt) {
  return list.map(c => {
    const selected = _wizBuild[key] === c.id;
    const noneX = (c.id === 'none') ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#3a2a10;font-size:11px;">✕</div>' : '';
    return _wizOpt(selected, `_applyWizBuild({${key}:'${c.id}'})`, styleFn(c), c.name, noneX);
  }).join('');
}

const CHAR_PORTRAIT_STYLES = {
  battlemage: {
    bg:        'linear-gradient(175deg, #3a1808 0%, #1a0c04 60%, #0e0804 100%)',
    ground:    'linear-gradient(180deg, #2a1408, #1a0a04)',
    glowRgb:   '200,100,40',
  },
  hexblade: {
    bg:        'linear-gradient(175deg, #1a0830 0%, #100620 60%, #080410 100%)',
    ground:    'linear-gradient(180deg, #1a0830, #0e0520)',
    glowRgb:   '140,80,240',
  },
  arcanist: {
    bg:        'linear-gradient(175deg, #04102a 0%, #030c1e 60%, #02080e 100%)',
    ground:    'linear-gradient(180deg, #061228, #030c18)',
    glowRgb:   '60,140,255',
  },
};

function _buildArchetypeOpts() {
  return WIZ_ARCHETYPES.map(a => {
    const selected = _wizBuild.archetype === a.id;
    const ps = CHAR_PORTRAIT_STYLES[a.id] || CHAR_PORTRAIT_STYLES.battlemage;
    const swatch = `background:${ps.bg};display:flex;align-items:center;justify-content:center;font-size:15px;`;
    return _wizOpt(selected, `_applyWizBuild({archetype:'${a.id}'})`, swatch, a.name, a.emoji);
  }).join('');
}

function _buildBeardOpts() {
  const styleOpts = WIZ_BEARD_STYLES.map(s => {
    const selected = _wizBuild.beardStyle === s.id;
    const swatchStyle = s.id === 'none'
      ? 'background:#0a0806;'
      : 'background:#e8e0d0;';
    const extra = s.id === 'none'
      ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#3a2a10;font-size:11px;">✕</div>'
      : '<div style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:14px;height:10px;background:#e8e0d0;border-radius:3px 3px 5px 5px;"></div>';
    return _wizOpt(selected, `_applyWizBuild({beardStyle:'${s.id}'})`, swatchStyle, s.name, extra);
  }).join('');
  const divider = '<div style="width:100%;height:1px;background:#1a1208;margin:4px 0;"></div>';
  const colorOpts = WIZ_BEARD_COLORS.map(c => {
    const selected = _wizBuild.beardColor === c.id;
    return _wizOpt(selected, `_applyWizBuild({beardColor:'${c.id}'})`, `background:${c.color};`, c.name);
  }).join('');
  return styleOpts + divider + colorOpts;
}

function _renderWizBoon() {
  const secEl = document.getElementById('wiz-section-archetype');
  if (!secEl) return;
  let old = secEl.querySelector('.wiz-boon-row');
  if (old) old.remove();
  const arch = WIZ_ARCHETYPES.find(a => a.id === _wizBuild.archetype);
  const buff = _charRolledBuffs[_wizBuild.archetype];
  if (!arch) return;
  const row = document.createElement('div');
  row.className = 'wiz-boon-row';
  row.style.cssText = 'margin-top:.45rem;padding:.35rem .5rem;background:#0e0c06;border:1px solid #1e1808;border-radius:5px;font-size:.56rem;line-height:1.5;';
  row.innerHTML = `<div style="color:#7a5828;font-size:.47rem;font-family:Cinzel,serif;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.15rem;">${arch.desc}</div>`
    + (buff ? `<div style="color:#5a4020;font-size:.46rem;font-family:Cinzel,serif;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.1rem;">Starting Boon (re-rolled each run)</div><div style="color:#c8a060;">${buff.emoji} ${buff.name} — <span style="color:#7a6040;">${buff.desc}</span></div>` : '');
  secEl.appendChild(row);
}

// ── Draw wizard preview on canvas using the real sprite system ────────────────
function _renderWizPreview() {
  const canvas = document.getElementById('wiz-preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const b = _wizBuild;
  const arch      = WIZ_ARCHETYPES.find(a => a.id === b.archetype) || WIZ_ARCHETYPES[0];
  const hatClr    = WIZ_HAT_COLORS.find(c => c.id === b.hatColor) || WIZ_HAT_COLORS[0];
  const outClr    = WIZ_OUTFIT_COLORS.find(c => c.id === b.outfit) || WIZ_OUTFIT_COLORS[0];
  const beardClr  = WIZ_BEARD_COLORS.find(c => c.id === b.beardColor) || WIZ_BEARD_COLORS[0];
  const staffClr  = WIZ_STAFF_COLORS.find(c => c.id === b.staffColor) || WIZ_STAFF_COLORS[0];
  const glowClr   = WIZ_STAFF_GLOWS.find(g => g.id === b.staffGlow) || WIZ_STAFF_GLOWS[0];
  const eyeClr    = WIZ_EYE_COLORS.find(e => e.id === b.eyeColor) || WIZ_EYE_COLORS[0];

  const ps = CHAR_PORTRAIT_STYLES[b.archetype] || CHAR_PORTRAIT_STYLES.battlemage;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  const bgParts = ps.bg.match(/#[0-9a-fA-F]{6}/g) || ['#080604', '#0a0806'];
  grad.addColorStop(0, bgParts[0]);
  grad.addColorStop(1, bgParts[bgParts.length-1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Ground strip
  ctx.fillStyle = '#0e0a06';
  ctx.fillRect(0, H - 28, W, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, H - 28, W, 1);

  // Get sprite rows based on archetype
  const rows = {
    battlemage: typeof SPRITE_CHAR_WARRIOR !== 'undefined' ? SPRITE_CHAR_WARRIOR : null,
    hexblade:   typeof SPRITE_CHAR_ROGUE   !== 'undefined' ? SPRITE_CHAR_ROGUE   : null,
    arcanist:   typeof SPRITE_CHAR_MAGE    !== 'undefined' ? SPRITE_CHAR_MAGE    : null,
  }[b.archetype] || SPRITE_CHAR_WARRIOR;

  if (!rows) return;

  // Build full custom color map — overrides charToColor for every character
  const showBeard = b.beardStyle !== 'none';
  const customColorMap = {
    '.': null,
    '1': outClr.p0,
    '2': outClr.p1,
    '3': outClr.p2,
    '4': outClr.p3,
    'h': hatClr.color,
    's': SKIN_C,
    'e': eyeClr.color,
    'b': BOOT_C,
    'w': showBeard ? beardClr.color : null,  // null = transparent (no beard)
    'f': staffClr.color,
    'g': glowClr.color,
  };

  // Draw sprite using custom color map
  const scale = 4;
  const cols = 24;
  const sprW = cols * scale;
  const sprH = rows.length * scale;
  const sx = Math.round((W - sprW) / 2);
  const sy = H - 28 - sprH;

  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < cols; col++) {
      const c = (rows[row] || '')[col] || '.';
      const color = customColorMap[c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(sx + col * scale, sy + row * scale, scale, scale);
    }
  }

  // Name label
  const nameEl = document.getElementById('wiz-prev-name');
  if (nameEl) nameEl.textContent = arch.name;
}

function _updateCharBtn() {
  const btn = document.getElementById('char-continue-btn');
  if (btn) btn.disabled = false;
}

function confirmCharacterSelect() {
  // Sync archetype + full build from wizard builder
  playerCharId   = _wizBuild.archetype;
  playerCharBuff = _charRolledBuffs[playerCharId] || null;
  patchActiveSlot({ savedCharId: playerCharId, wizardBuild: _wizBuild });
  if (_wizBuilderFromLobby) {
    _wizBuilderFromLobby = false;
    showBetweenRuns();
    return;
  }
  document.getElementById('welcome-msg').textContent = `${playerName}, choose your element`;
  showElementScreen();
}


