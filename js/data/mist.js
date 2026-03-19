// ===== mist.js =====
// ── The Veil — Mist difficulty system ────────────────────────────────────────

const MIST_MODIFIERS = [
  {
    id: 'enemy_damage',
    label: 'Relentless Aggression',
    emoji: '⚔',
    desc: t => `Enemy damage +${[15,30,50,75][t-1]}%`,
    tiers: 4,
    mistCost: [1, 2, 3, 4],
  },
  {
    id: 'enemy_hp',
    label: 'Fortified Enemies',
    emoji: '🛡',
    desc: t => `Enemy HP +${[15,30,50,75][t-1]}%`,
    tiers: 4,
    mistCost: [1, 2, 3, 4],
  },
  {
    id: 'enemy_passives',
    label: 'Hardened Foes',
    emoji: '💀',
    desc: t => `Enemies gain +${t} extra passive${t>1?'s':''}`,
    tiers: 2,
    mistCost: [2, 3],
  },
  {
    id: 'shop_prices',
    label: 'Premium Market',
    emoji: '💰',
    desc: t => `Shop prices +${[15,30][t-1]}%`,
    tiers: 2,
    mistCost: [1, 2],
  },
  {
    id: 'pp_reduction',
    label: 'Mana Drought',
    emoji: '🫧',
    desc: t => `All PP reduced by ${[20,40][t-1]}%`,
    tiers: 2,
    mistCost: [2, 3],
  },
  {
    id: 'campfire_reduction',
    label: 'Scarce Respite',
    emoji: '🔥',
    desc: t => t === 1 ? 'One fewer campfire per zone' : 'No campfires per zone',
    tiers: 2,
    mistCost: [3, 5],
  },
  {
    id: 'talent_reduction',
    label: 'Diminished Legacy',
    emoji: '📿',
    desc: t => `Talent node levels reduced by ${t} during runs`,
    tiers: 2,
    mistCost: [2, 4],
  },
  {
    id: 'boss_legendaries',
    label: 'Awakened Bosses',
    emoji: '👁',
    desc: t => `Gym bosses gain +${t} legendary passive${t>1?'s':''}`,
    tiers: 2,
    mistCost: [3, 4],
  },
];

function getMistConfig() {
  const meta = getMeta();
  if (!meta.mistConfig) meta.mistConfig = { active: false, modifiers: {} };
  return meta.mistConfig;
}

function getTotalMist() {
  const cfg = getMistConfig();
  if (!cfg.active) return 0;
  let total = 1;
  MIST_MODIFIERS.forEach(mod => {
    const tier = cfg.modifiers[mod.id] || 0;
    if (tier > 0) total += mod.mistCost.slice(0, tier).reduce((a,b) => a+b, 0);
  });
  return total;
}

function getMistTier(modId) {
  const cfg = getMistConfig();
  if (!cfg.active) return 0;
  return cfg.modifiers[modId] || 0;
}

function applyMistModifiers() {
  player._mistEnemyDmgMult      = 1.0;
  player._mistEnemyHPMult       = 1.0;
  player._mistExtraPassives     = 0;
  player._mistShopPriceMult     = 1.0;
  player._mistPPMult            = 1.0;
  player._mistCampfireReduction = 0;
  player._mistTalentReduction   = 0;
  player._mistBossLegendaries   = 0;

  const cfg = getMistConfig();
  if (!cfg.active) return;

  const dmg = getMistTier('enemy_damage');
  if (dmg > 0) player._mistEnemyDmgMult = [1.15, 1.30, 1.50, 1.75][dmg - 1];

  const hp = getMistTier('enemy_hp');
  if (hp > 0) player._mistEnemyHPMult = [1.15, 1.30, 1.50, 1.75][hp - 1];

  const pass = getMistTier('enemy_passives');
  if (pass > 0) player._mistExtraPassives = pass;

  const shop = getMistTier('shop_prices');
  if (shop > 0) player._mistShopPriceMult = [1.15, 1.30][shop - 1];

  const pp = getMistTier('pp_reduction');
  if (pp > 0) player._mistPPMult = [0.80, 0.60][pp - 1];

  const camp = getMistTier('campfire_reduction');
  if (camp > 0) player._mistCampfireReduction = camp;

  const talent = getMistTier('talent_reduction');
  if (talent > 0) player._mistTalentReduction = talent;

  const boss = getMistTier('boss_legendaries');
  if (boss > 0) player._mistBossLegendaries = boss;
}
