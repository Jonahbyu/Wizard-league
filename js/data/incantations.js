// ===== incantations.js =====
// ─── SPELL INCANTATION SYSTEM ─────────────────────────────────────────────────
// Incantations upgrade one specific stat on a spell with decaying returns.
// Formula: bonus = sum of (baseScale × decay^i) for i = 0 to level-2
// Level 1 = base value (no bonus). Level 2 = +baseScale. Level 3 = +baseScale + baseScale×decay. Etc.

const SPELL_RARITY = {
  dim:     { label: 'Dim',     color: null,      level: 1 },
  kindled: { label: 'Kindled', color: '#c06010',  level: 2 },
  blazing: { label: 'Blazing', color: '#bb1200',  level: 3 },
  radiant: { label: 'Radiant', color: '#d4aa20',  level: 4 },
};

// Compute cumulative bonus at a given incantation level.
// level 1 → 0 bonus. level 2 → baseScale. level 3 → baseScale + baseScale*decay. Etc.
function _incantationBonus(level, baseScale, decay) {
  if (!level || level <= 1) return 0;
  let bonus = 0;
  for (let i = 0; i < level - 1; i++) {
    bonus += baseScale * Math.pow(decay, i);
  }
  return bonus;
}

// Per-spell config — which stat scales, by how much, and with what decay.
// Only spells with their execute() wired to read incantationLevel should appear here.
const SPELL_INCANTATION_CONFIG = {
  // ── FIRE ────────────────────────────────────────────────────────────────────
  ignite:          { scaledStat: 'burnStacks',      baseScale: 3,    decay: 0.90 },
  ember_storm:     { scaledStat: 'burnPerHit',      baseScale: 1,    decay: 0.90 },
  flame_wave:      { scaledStat: 'burnStacks',      baseScale: 1,    decay: 0.90 },
  firewall:        { scaledStat: 'firewallStacks',  baseScale: 1,    decay: 0.90 },
  grease_fire:     { scaledStat: 'burnAdded',       baseScale: 1,    decay: 0.90 },
  // Melt spells
  melt_strike:     { scaledStat: 'meltPoints',      baseScale: 3,    decay: 0.90 },
  forge_blast:     { scaledStat: 'meltPoints',      baseScale: 2,    decay: 0.90 },
  crucible:        { scaledStat: 'meltBonus',       baseScale: 2,    decay: 0.90 },
  scorch_through:  { scaledStat: 'meltPoints',      baseScale: 2,    decay: 0.90 },
  slag:            { scaledStat: 'meltPoints',      baseScale: 2,    decay: 0.90 },
  heat_surge:      { scaledStat: 'meltPoints',      baseScale: 3,    decay: 0.90 },
  smelt:           { scaledStat: 'meltPoints',      baseScale: 2,    decay: 0.90 },
  overheat:        { scaledStat: 'meltPoints',      baseScale: 2,    decay: 0.90 },
  crucible_burst:  { scaledStat: 'meltPoints',      baseScale: 3,    decay: 0.90 },
  melt_down:       { scaledStat: 'meltBonus',       baseScale: 2,    decay: 0.90 },
  white_heat:      { scaledStat: 'meltPoints',      baseScale: 5,    decay: 0.90 },
  searing_verdict: { scaledStat: 'meltPoints',      baseScale: 3,    decay: 0.90 },

  // ── WATER ────────────────────────────────────────────────────────────────────
  tidal_surge:     { scaledStat: 'healBase',        baseScale: 3,    decay: 0.90 },
  riptide:         { scaledStat: 'hits',            baseScale: 1,    decay: 1.00 },
  healing_tide:    { scaledStat: 'healAmount',      baseScale: 8,    decay: 0.95 },
  whirlpool:       { scaledStat: 'foamPerHit',      baseScale: 1,    decay: 0.90 },
  tidal_shield:    { scaledStat: 'armorAmount',     baseScale: 4,    decay: 0.95 },
  cleanse_current: { scaledStat: 'healPerEffect',   baseScale: 4,    decay: 0.90 },

  // ── ICE ──────────────────────────────────────────────────────────────────────
  frost_bolt:      { scaledStat: 'frostStacks',     baseScale: 0.4,  decay: 0.90 },
  glacial_spike:   { scaledStat: 'baseDamage',      baseScale: 10,   decay: 0.95 },
  snowstorm:       { scaledStat: 'frostStacks',     baseScale: 0.4,  decay: 0.90 },
  flash_freeze:    { scaledStat: 'frostStacks',     baseScale: 1,    decay: 0.90 },
  shatter:         { scaledStat: 'multiplier',      baseScale: 0.5,  decay: 0.90 },
  frozen_ground:   { scaledStat: 'duration',        baseScale: 1,    decay: 1.00 },
  cryostasis:      { scaledStat: 'healAmount',      baseScale: 6,    decay: 0.95 },

  // ── LIGHTNING ────────────────────────────────────────────────────────────────
  zap:             { scaledStat: 'shockStacks',     baseScale: 0.4,  decay: 0.90 },
  chain_lightning: { scaledStat: 'bounces',         baseScale: 1,    decay: 1.00 },
  overcharge:      { scaledStat: 'shockStacks',     baseScale: 1,    decay: 0.90 },
  feedback:        { scaledStat: 'shockStacks',     baseScale: 1,    decay: 0.90 },
  short_circuit:   { scaledStat: 'shockApplied',    baseScale: 1,    decay: 1.00 },
  // Surge spells
  bolt:              { scaledStat: 'surgeValue',      baseScale: 4,    decay: 0.90 },
  thunder_strike:    { scaledStat: 'shockStacks',     baseScale: 0.5,  decay: 0.90 },
  ball_lightning:    { scaledStat: 'surgeValue',      baseScale: 3,    decay: 0.90 },
  static_charge:     { scaledStat: 'surgeValue',      baseScale: 8,    decay: 0.90 },
  megavolt:          { scaledStat: 'baseDamage',      baseScale: 8,    decay: 0.90 },
  supercharge:       { scaledStat: 'surgeBonus',      baseScale: 5,    decay: 0.90 },
  overclock:         { scaledStat: 'multiplier',      baseScale: 0.25, decay: 0.90 },
  residual_current:  { scaledStat: 'surgeValue',      baseScale: 4,    decay: 0.90 },
  detonator:         { scaledStat: 'surgeValue',      baseScale: 0,    decay: 1.00 },
  grounded:          { scaledStat: 'surgePerDebuff',  baseScale: 1,    decay: 0.90 },
  thunderclap:       { scaledStat: 'surgeValue',      baseScale: 10,   decay: 0.90 },
  fulgurite:         { scaledStat: 'baseDamage',      baseScale: 5,    decay: 0.90 },

  // ── EARTH ────────────────────────────────────────────────────────────────────
  seismic_wave:    { scaledStat: 'armorStrip',      baseScale: 1,    decay: 1.00 },
  fortify:         { scaledStat: 'armorAmount',     baseScale: 3,    decay: 0.95 },
  echo_slam:       { scaledStat: 'dmgPerEnemy',     baseScale: 1,    decay: 0.95 },
  earthshaker:     { scaledStat: 'multiplier',      baseScale: 0.5,  decay: 0.90 },
  dig:             { scaledStat: 'baseAmount',      baseScale: 2,    decay: 0.95 },
  cataclysm:       { scaledStat: 'dmgPerStack',     baseScale: 5,    decay: 0.90 },

  // ── NATURE ───────────────────────────────────────────────────────────────────
  vine_strike:     { scaledStat: 'rootChance',      baseScale: 0.05, decay: 0.90 },
  // Seed spells
  damage_seed:     { scaledStat: 'dmgPerStack',     baseScale: 5,    decay: 0.90 },
  root_seed:       { scaledStat: 'rootPerStack',    baseScale: 1,    decay: 1.00 },
  silence_seed:    { scaledStat: 'silenceTurns',    baseScale: 1,    decay: 1.00 },
  healing_seed:    { scaledStat: 'healPerStack',    baseScale: 8,    decay: 0.95 },
  reap:            { scaledStat: 'dmgPerStack',     baseScale: 2,    decay: 0.90 },
  world_tree:      { scaledStat: 'stacksPerType',   baseScale: 1,    decay: 1.00 },
  thornwall:       { scaledStat: 'rootStacks',      baseScale: 1,    decay: 1.00 },
  natures_call:    { scaledStat: 'treantHP',        baseScale: 5,    decay: 0.95 },
  bramble_burst:   { scaledStat: 'rootChance',      baseScale: 0.05, decay: 0.90 },
  nourish:         { scaledStat: 'healAmount',      baseScale: 5,    decay: 0.95 },
  natures_wrath:   { scaledStat: 'dmgPerStack',     baseScale: 4,    decay: 0.90 },

  // ── PLASMA ───────────────────────────────────────────────────────────────────
  plasma_lance:    { scaledStat: 'dmgPerCharge',    baseScale: 1,    decay: 0.90 },
  obliteration:    { scaledStat: 'baseDamage',      baseScale: 1,    decay: 0.90 },

  // ── AIR ──────────────────────────────────────────────────────────────────────
  quintuple_hit:   { scaledStat: 'hits',            baseScale: 1,    decay: 1.00 },
  become_wind:     { scaledStat: 'momentumGained',  baseScale: 2,    decay: 0.95 },
  tornado:         { scaledStat: 'baseDamage',      baseScale: 3,    decay: 0.95 },
  twin_strike:     { scaledStat: 'hits',            baseScale: 1,    decay: 1.00 },
  windy_takedown:  { scaledStat: 'baseDamage',      baseScale: 5,    decay: 0.95 },

  // ── DUO / MERGED ─────────────────────────────────────────────────────────────
  plasma_arc:    { scaledStat: 'meltPoints',    baseScale: 3,  decay: 0.90 },
  superheated:   { scaledStat: 'burnMult',      baseScale: 0,  decay: 1.00 },
  thunderroot:   { scaledStat: 'surgeValue',    baseScale: 4,  decay: 0.90 },
  static_bloom:  { scaledStat: 'shockPerStack', baseScale: 1,  decay: 1.00 },
  burning_grove: { scaledStat: 'burnAdded',     baseScale: 2,  decay: 0.90 },
  char_bloom:    { scaledStat: 'seedBonus',     baseScale: 1,  decay: 1.00 },

  // ── NEUTRAL ──────────────────────────────────────────────────────────────────
  power_strike:    { scaledStat: 'baseDamage',      baseScale: 10,   decay: 0.95 },
  double_tap:      { scaledStat: 'baseDamage',      baseScale: 5,    decay: 0.95 },
  shield_bash:     { scaledStat: 'armorAmount',     baseScale: 3,    decay: 0.95 },
  vampiric_strike: { scaledStat: 'lifeStealPct',    baseScale: 0.08, decay: 0.90 },
  war_cry:         { scaledStat: 'powerBonus',      baseScale: 3,    decay: 0.90 },

  // ── FIRE (auto-generated, unreviewed) ────────────────────────────────────────
  extinguish:      { scaledStat: 'dmgPerStack',     baseScale: 1,    decay: 0.90 },
  fire_heal:       { scaledStat: 'healPerStack',    baseScale: 1,    decay: 0.90 },
  fire_rage:       { scaledStat: 'rageTurns',       baseScale: 1,    decay: 1.00 },
  brave_burn:      { scaledStat: 'immuneTurns',     baseScale: 1,    decay: 1.00 },

  // ── WATER (auto-generated, unreviewed) ───────────────────────────────────────
  drown:           { scaledStat: 'foamApplied',     baseScale: 1,    decay: 1.00 },
  deep_current:    { scaledStat: 'armorGained',     baseScale: 5,    decay: 0.95 },
  tsunami:         { scaledStat: 'dmgPerFoam',      baseScale: 2,    decay: 0.95 },

  // ── ICE (auto-generated, unreviewed) ─────────────────────────────────────────
  ice_age:         { scaledStat: 'frostApplied',    baseScale: 1,    decay: 0.90 },

  // ── LIGHTNING (auto-generated, unreviewed) ───────────────────────────────────
  blitz:           { scaledStat: 'dmgPerStack',     baseScale: 2,    decay: 0.95 },
  recharge:        { scaledStat: 'resetBonus',      baseScale: 0.2,  decay: 0.90 },
  electrocute:     { scaledStat: 'multiplier',      baseScale: 0.5,  decay: 0.90 },
  static_cleanse:  { scaledStat: 'shockPerEffect',  baseScale: 1,    decay: 1.00 },
  charge_shot:     { scaledStat: 'baseDamage',      baseScale: 10,   decay: 0.95 },

  // ── EARTH (auto-generated, unreviewed) ───────────────────────────────────────
  stone_stance:    { scaledStat: 'powerBonus',      baseScale: 5,    decay: 0.90 },
  stone_sanctuary: { scaledStat: 'multiplier',      baseScale: 0.5,  decay: 0.90 },

  // ── NATURE (auto-generated, unreviewed) ──────────────────────────────────────
  wild_growth:     { scaledStat: 'multiplier',      baseScale: 0.5,  decay: 0.90 },
  living_forest:   { scaledStat: 'attackCount',     baseScale: 1,    decay: 1.00 },
  spreading_vines: { scaledStat: 'duration',        baseScale: 1,    decay: 1.00 },

  // ── PLASMA (auto-generated, unreviewed) ──────────────────────────────────────
  energy_infusion: { scaledStat: 'powPerCharge',    baseScale: 0.5,  decay: 0.90 },
  plasma_shield:   { scaledStat: 'pctPerCharge',    baseScale: 0.2,  decay: 0.90 },
  self_sacrifice:  { scaledStat: 'hitsPerCharge',   baseScale: 1,    decay: 1.00 },
  borrowed_power:  { scaledStat: 'borrowAmount',    baseScale: 2,    decay: 1.00 },
  plasma_stall:    { scaledStat: 'powerGained',     baseScale: 3,    decay: 0.90 },
  singularity:     { scaledStat: 'bonusCharge',     baseScale: 3,    decay: 0.90 },

  // ── AIR (auto-generated, unreviewed) ─────────────────────────────────────────
  wind_wall:       { scaledStat: 'armorBonus',      baseScale: 8,    decay: 0.95 },
  sleeper_gust:    { scaledStat: 'actionsGained',   baseScale: 1,    decay: 1.00 },
  break_momentum:  { scaledStat: 'dmgPerStack',     baseScale: 2,    decay: 0.95 },
  storm_rush:      { scaledStat: 'momentumGained',  baseScale: 2,    decay: 0.95 },
};

// Base values used for upgrade display calculations
const _INCANTATION_BASE_VALUES = {
  ignite:          15,
  ember_storm:     3,
  flame_wave:      5,
  firewall:        3,
  grease_fire:     4,
  tidal_surge:     10,
  riptide:         3,
  healing_tide:    40,
  whirlpool:       3,
  tidal_shield:    20,
  cleanse_current: 20,
  frost_bolt:      2.0,
  glacial_spike:   25,
  snowstorm:       2.0,
  flash_freeze:    5,
  shatter:         4.0,
  frozen_ground:   3,
  cryostasis:      30,
  zap:             2.0,
  chain_lightning: 4,
  overcharge:      3,
  feedback:        2,
  short_circuit:   1,
  seismic_wave:    5,
  fortify:         15,
  echo_slam:       5,
  earthshaker:     3.0,
  dig:             5,
  cataclysm:       25,
  vine_strike:     0.50,
  thornwall:       2,
  natures_call:    25,
  bramble_burst:   0.50,
  nourish:         25,
  natures_wrath:   20,
  plasma_lance:    5,
  obliteration:    5,
  quintuple_hit:   5,
  become_wind:     10,
  tornado:         10,
  twin_strike:     2,
  windy_takedown:  25,
  power_strike:    30,
  double_tap:      15,
  shield_bash:     15,
  vampiric_strike: 0.40,
  war_cry:         10,

  // Duo / merged spells
  plasma_arc:    20,
  superheated:   2,
  thunderroot:   25,
  static_bloom:  1,
  burning_grove: 10,
  char_bloom:    1,

  // Lightning surge spells
  bolt:              25,
  thunder_strike:    2,
  ball_lightning:    20,
  static_charge:     60,
  megavolt:          50,
  supercharge:       40,
  overclock:         2.0,
  residual_current:  30,
  detonator:         0,
  grounded:          5,
  thunderclap:       100,
  fulgurite:         30,

  // Auto-generated, unreviewed
  extinguish:      2,
  fire_heal:       1,
  fire_rage:       2,
  brave_burn:      1,
  drown:           2,
  deep_current:    0,
  tsunami:         10,
  ice_age:         5,
  blitz:           0,
  recharge:        2.0,
  electrocute:     2.0,
  static_cleanse:  2,
  charge_shot:     20,
  stone_stance:    0,
  stone_sanctuary: 2.0,
  wild_growth:     2.0,
  living_forest:   2,
  spreading_vines: 3,
  energy_infusion: 1.0,
  plasma_shield:   1.0,
  self_sacrifice:  2,
  borrowed_power:  10,
  plasma_stall:    0,
  singularity:     0,
  wind_wall:       0,
  sleeper_gust:    2,
  break_momentum:  5,
  storm_rush:      5,
};

// Roll for spell rarity when a spell is awarded.
// Radiant checked first, then Blazing, then Kindled, else Dim.
// Chances stored on player by talent apply() functions.
function rollSpellRarity() {
  const r = Math.random();
  // Base chance per tier even without any talent investment
  // Kindled: 8% base → up to 48% at max talent
  // Blazing: 4% base → up to 24% at max talent
  // Radiant: 2% base → up to 12% at max talent
  const radiantChance  = (player._rarityChanceRadiant  || 0) + 0.02;
  const blazingChance  = (player._rarityChanceBlazing  || 0) + 0.04;
  const kindledChance  = (player._rarityChanceKindled  || 0) + 0.08;
  if (r < radiantChance)                           return 'radiant';
  if (r < radiantChance + blazingChance)           return 'blazing';
  if (r < radiantChance + blazingChance + kindledChance) return 'kindled';
  return 'dim';
}

// Compute the scaled value for a spell's incantated stat given its current incantation level.
function incantatedValue(spellObj, baseValue) {
  const cfg = SPELL_INCANTATION_CONFIG[spellObj.id];
  if (!cfg) return baseValue;
  return baseValue + _incantationBonus(spellObj.incantationLevel || 1, cfg.baseScale, cfg.decay);
}

// Stat → short human-readable label (shared by combat button and upgrade popup)
const _STAT_LABELS = {
  baseDamage:'Damage',    burnStacks:'Burn',        burnPerHit:'Burn/Hit',    burnAdded:'Burn+',
  firewallStacks:'Firewall', healBase:'Heal',        healAmount:'Heal',        healPerEffect:'Heal/Effect',
  healPerStack:'Heal/Stack', foamPerHit:'Foam/Hit',  foamApplied:'Foam',       armorAmount:'Armor',
  armorStrip:'Armor Strip',  armorGained:'Armor',    armorBonus:'Armor',       frostStacks:'Frost',
  frostApplied:'Frost',      shockStacks:'Shock',    shockApplied:'Shock',     shockPerEffect:'Shock/Effect',
  hits:'Hits',               bounces:'Bounces',      multiplier:'Mult',        duration:'Duration',
  rootChance:'Root%',        rootStacks:'Root',      treantHP:'Treant HP',
  dmgPerStack:'Dmg/Stack',   dmgPerEnemy:'Dmg/Enemy',dmgPerFoam:'Dmg/Foam',   dmgPerCharge:'Dmg/Charge',
  baseAmount:'Amount',       momentumGained:'Momentum', powerBonus:'Power',   lifeStealPct:'Life Steal',
  rageTurns:'Rage Turns',    immuneTurns:'Immunity',  resetBonus:'Overload',
  surgeValue:'Surge Dmg',   surgeBonus:'Surge+',     surgePerDebuff:'Surge/Debuff',
  shockPerStack:'Shock/Stack', seedBonus:'Seed Stacks', burnMult:'Burn×',
  powPerCharge:'Pow/Charge', pctPerCharge:'Shield%',  hitsPerCharge:'Hits/Charge',
  borrowAmount:'Charge',     powerGained:'Power',     bonusCharge:'Charge',
  actionsGained:'Actions',   attackCount:'Attacks',
};

// Returns "Label: value" string showing the CURRENT incantated stat for display in spell buttons.
function incantationStatDisplay(spellObj) {
  const cfg = SPELL_INCANTATION_CONFIG[spellObj.id];
  if (!cfg) return null;
  const base = _INCANTATION_BASE_VALUES[spellObj.id];
  if (base == null) return null;
  const curLevel = spellObj.incantationLevel || 1;
  const val = base + _incantationBonus(curLevel, cfg.baseScale, cfg.decay);
  let fmt;
  if (cfg.scaledStat === 'rootChance' || cfg.scaledStat === 'lifeStealPct') fmt = Math.round(val * 100) + '%';
  else if (cfg.scaledStat === 'multiplier') fmt = '×' + val.toFixed(2);
  else if (cfg.scaledStat === 'frostStacks' || cfg.scaledStat === 'shockStacks' || cfg.scaledStat === 'frostApplied') fmt = val.toFixed(1);
  else if (typeof base === 'number' && !Number.isInteger(base)) fmt = val.toFixed(1);
  else fmt = Math.round(val).toString();
  return (_STAT_LABELS[cfg.scaledStat] || cfg.scaledStat) + ': ' + fmt;
}

// Returns { stat, prev, next } display strings for the upgrade popup.
function incantationUpgradeDisplay(spellObj) {
  const cfg = SPELL_INCANTATION_CONFIG[spellObj.id];
  if (!cfg) return null;
  const curLevel = spellObj.incantationLevel || 1;
  const base = _INCANTATION_BASE_VALUES[spellObj.id];
  if (base == null) return null;

  const prevBonus = _incantationBonus(curLevel, cfg.baseScale, cfg.decay);
  const nextBonus = _incantationBonus(curLevel + 1, cfg.baseScale, cfg.decay);
  const prevVal = base + prevBonus;
  const nextVal = base + nextBonus;

  const fmt = (v) => {
    if (cfg.scaledStat === 'rootChance' || cfg.scaledStat === 'lifeStealPct') return Math.round(v * 100) + '%';
    if (cfg.scaledStat === 'multiplier') return '×' + v.toFixed(2);
    if (cfg.scaledStat === 'frostStacks' || cfg.scaledStat === 'shockStacks') return v.toFixed(1);
    if (typeof base === 'number' && !Number.isInteger(base)) return v.toFixed(1);
    if (cfg.decay === 1.00) return Math.round(v).toString();
    return Math.round(v).toString();
  };

  return { stat: cfg.scaledStat, prev: fmt(prevVal), next: fmt(nextVal) };
}
