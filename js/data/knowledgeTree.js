// ===== knowledgeTree.js =====
// ─── KNOWLEDGE TREE ───────────────────────────────────────────────────────────
// meta.ktUnlocked        = string[]   — card IDs permanently unlocked
// meta.ktEquipped        = string[]   — card IDs brought this run
// meta.ktLevels          = {id:level} — current level per unlocked card (default 1)
// meta.ktBudgetGeneralLevel   = 0-4  — times General budget has been expanded
// meta.ktBudgetElementalLevel = 0-4  — times Elemental budget has been expanded

const KT_GENERAL_BUDGET_BASE   = 8;
const KT_ELEMENTAL_BUDGET_BASE = 8;
const KT_BUDGET_PER_UPGRADE    = 3;
const KT_BUDGET_UPGRADE_COSTS  = [10, 18, 30, 50];

function ktGetBudget(meta, type) {
  const key  = type === 'elemental' ? 'ktBudgetElementalLevel' : 'ktBudgetGeneralLevel';
  const base = type === 'elemental' ? KT_ELEMENTAL_BUDGET_BASE : KT_GENERAL_BUDGET_BASE;
  const lvl  = Math.min(meta[key] || 0, KT_BUDGET_UPGRADE_COSTS.length);
  let budget = base + lvl * KT_BUDGET_PER_UPGRADE;
  if ((meta.ktEquipped || []).includes('kt_abundance')) {
    const cardLvl = (meta.ktLevels || {})['kt_abundance'] || 1;
    const pct = [0.05, 0.10, 0.20, 0.25, 0.30][cardLvl - 1];
    budget = Math.floor(budget * (1 + pct));
  }
  return budget;
}

function ktPhoresUsed(meta, type) {
  const equipped = meta.ktEquipped || [];
  const pool     = type === 'elemental'
    ? Object.values(KT_ELEMENTAL_CARDS).flat()
    : KT_GENERAL_CARDS;
  return equipped.reduce((sum, id) => {
    const card = pool.find(c => c.id === id);
    return sum + (card ? card.phorosCost : 0);
  }, 0);
}

function ktGetCardLevel(meta, cardId) {
  return (meta.ktLevels || {})[cardId] || 1;
}

// ── General Cards — 3 rows of 4 ───────────────────────────────────────────────
// Card shape: { id, name, emoji, phosCost, phorosCost, maxLevel,
//               levelCosts [null, cost→lv2, cost→lv3],
//               levelDescs ['lv1 desc', 'lv2 desc', 'lv3 desc'],
//               apply(level) }
const KT_GENERAL_CARDS = [
  // ── Row 1 ──────────────────────────────────────────────────────────────────
  {
    id:'kt_extra_life', name:'Extra Life', emoji:'❤️',
    phosCost:10, phorosCost:4, maxLevel:3,
    levelCosts:[null,15,25],
    levelDescs:['Start with +1 revive.','Start with +2 revives.','Start with +3 revives.'],
    apply(lvl){ player.revives = (player.revives||0) + lvl; },
  },
  {
    id:'kt_vitality', name:'Vitality', emoji:'💪',
    phosCost:8, phorosCost:2, maxLevel:5,
    levelCosts:[null,12,20,32,48],
    levelDescs:['+10% max HP.','+20% max HP.','+30% max HP.','+40% max HP.','+50% max HP.'],
    apply(lvl){
      const pct = [0.10,0.20,0.30,0.40,0.50][lvl-1];
      const base = BASE_MAX_HP + (player.baseMaxHPBonus||0);
      player.baseMaxHPBonus = (player.baseMaxHPBonus||0) + Math.floor(base * pct);
    },
  },
  {
    id:'kt_attack', name:'Attack Training', emoji:'⚔️',
    phosCost:8, phorosCost:1, maxLevel:3,
    levelCosts:[null,12,20],
    levelDescs:['+5 Attack Power.','+10 Attack Power.','+15 Attack Power.'],
    apply(lvl){ player.attackPower += lvl*5; },
  },
  {
    id:'kt_effect', name:'Effect Training', emoji:'✨',
    phosCost:8, phorosCost:1, maxLevel:3,
    levelCosts:[null,12,20],
    levelDescs:['+8 Effect Power.','+16 Effect Power.','+24 Effect Power.'],
    apply(lvl){ player.effectPower += lvl*8; },
  },
  // ── Row 2 ──────────────────────────────────────────────────────────────────
  {
    id:'kt_defense', name:'Defense Training', emoji:'🛡️',
    phosCost:8, phorosCost:1, maxLevel:3,
    levelCosts:[null,12,20],
    levelDescs:['+8 Defense.','+16 Defense.','+24 Defense.'],
    apply(lvl){ player.defense += lvl*8; },
  },
  {
    id:'kt_iron_will', name:'Iron Will', emoji:'🩹',
    phosCost:12, phorosCost:3, maxLevel:3,
    levelCosts:[null,18,30],
    levelDescs:['Revive with 30% HP.','Revive with 50% HP.','Revive with 75% HP.'],
    apply(lvl){ player._talentReviveBonus = (player._talentReviveBonus||0) + [0.30,0.50,0.75][lvl-1]; },
  },
  {
    id:'kt_treasure', name:'Treasure Sense', emoji:'💰',
    phosCost:10, phorosCost:1, maxLevel:3,
    levelCosts:[null,15,25],
    levelDescs:['+10% gold.','+20% gold.','+30% gold.'],
    apply(lvl){ player._goldBonus = (player._goldBonus||0) + lvl*0.10; },
  },
  {
    id:'kt_inheritance', name:'Inheritance', emoji:'🏦',
    phosCost:8, phorosCost:1, maxLevel:3,
    levelCosts:[null,12,20],
    levelDescs:['Start with +100g.','Start with +175g.','Start with +250g.'],
    apply(lvl){ player.gold += [100, 175, 250][lvl-1]; },
  },
  // ── Row 3 ──────────────────────────────────────────────────────────────────
  {
    id:'kt_kindled', name:'Kindled Affinity', emoji:'🔸',
    phosCost:14, phorosCost:1, maxLevel:3,
    levelCosts:[null,20,32],
    levelDescs:['+16% Kindled spell chance.','+24% Kindled spell chance.','+32% Kindled spell chance.'],
    apply(lvl){ player._rarityChanceKindled = (player._rarityChanceKindled||0) + lvl*0.08 + 0.08; },
  },
  {
    id:'kt_blazing', name:'Blazing Affinity', emoji:'🔶',
    phosCost:22, phorosCost:2, maxLevel:3,
    levelCosts:[null,30,48],
    levelDescs:['+8% Blazing spell chance.','+12% Blazing spell chance.','+16% Blazing spell chance.'],
    apply(lvl){ player._rarityChanceBlazing = (player._rarityChanceBlazing||0) + lvl*0.04 + 0.04; },
  },
  {
    id:'kt_radiant', name:'Radiant Affinity', emoji:'🌟',
    phosCost:40, phorosCost:3, maxLevel:3,
    levelCosts:[null,55,80],
    levelDescs:['+4% Radiant spell chance.','+6% Radiant spell chance.','+8% Radiant spell chance.'],
    apply(lvl){ player._rarityChanceRadiant = (player._rarityChanceRadiant||0) + lvl*0.02 + 0.02; },
  },
  {
    id:'kt_origination', name:'Origination', emoji:'⚗️',
    phosCost:20, phorosCost:2, maxLevel:5,
    levelCosts:[null, 25, 35, 50, 70],
    levelDescs:[
      '2+ elemental curses on enemy: +5 flat damage per hit.',
      '2+ elemental curses on enemy: +10 flat damage per hit.',
      '2+ elemental curses on enemy: +15 flat damage per hit.',
      '2+ elemental curses on enemy: +20 flat damage per hit.',
      '2+ elemental curses on enemy: +25 flat damage per hit.',
    ],
    apply(lvl){ player._ktOriginationLevel = lvl; },
  },
  {
    id:'kt_rerolls', name:'Fortune', emoji:'🎲',
    phosCost:10, phorosCost:1, maxLevel:5,
    levelCosts:[null, 14, 22, 34, 50],
    levelDescs:[
      'Start each run with 3 rerolls.',
      'Start each run with 4 rerolls.',
      'Start each run with 5 rerolls.',
      'Start each run with 6 rerolls.',
      'Start each run with 7 rerolls.',
    ],
    apply(lvl){ player._rerolls = (player._rerolls||0) + (lvl + 2); },
  },
  {
    id:'kt_abundance', name:'Abundance', emoji:'◈',
    phosCost:12, phorosCost:2, maxLevel:5,
    levelCosts:[null, 16, 26, 40, 58],
    levelDescs:[
      '+5% Phoros budget (both pools).',
      '+10% Phoros budget (both pools).',
      '+20% Phoros budget (both pools).',
      '+25% Phoros budget (both pools).',
      '+30% Phoros budget (both pools).',
    ],
    apply(lvl){ /* budget boost is applied via ktGetBudget */ },
  },
  {
    id:'kt_recovery', name:'Recovery', emoji:'💊',
    phosCost:12, phorosCost:2, maxLevel:5,
    levelCosts:[null, 16, 24, 36, 52],
    levelDescs:[
      'Heal 5% max HP after each battle.',
      'Heal 10% max HP after each battle.',
      'Heal 15% max HP after each battle.',
      'Heal 20% max HP after each battle.',
      'Heal 25% max HP after each battle.',
    ],
    apply(lvl){ player._ktRecoveryPct = lvl * 0.05; },
  },
  {
    id:'kt_strength', name:'Strength', emoji:'🗡️',
    phosCost:50, phorosCost:5, maxLevel:3,
    levelCosts:[null,65,85],
    levelDescs:[
      'No lives left: +10% dmg, take 25% less.',
      'No lives left: +15% dmg, take 35% less.',
      'No lives left: +20% dmg, take 40% less.',
    ],
    apply(lvl){ player._ktStrengthPassive = true; player._ktStrengthLevel = lvl; },
  },
];

// ── Elemental Cards — 4 per element, always 1 row ────────────────────────────
// 4th card per element is a starting spell (maxLevel:1, no upgrades)
const KT_ELEMENTAL_CARDS = {
  Fire: [
    {
      id:'kt_fire_burns', name:'Hotter Burns', emoji:'🔥',
      phosCost:12, phorosCost:1, maxLevel:3,
      levelCosts:[null,18,28],
      levelDescs:['+0.2 bonus burn/stack.','+0.4 bonus burn/stack.','+0.6 bonus burn/stack.'],
      apply(lvl){ player._talentBurnDmg = (player._talentBurnDmg||0) + lvl*0.2; },
    },
    {
      id:'kt_fire_kindling', name:'Kindling', emoji:'🪵',
      phosCost:10, phorosCost:1, maxLevel:3,
      levelCosts:[null,14,22],
      levelDescs:['Start battles with 2 Burn.','4 Burn.','6 Burn.'],
      apply(lvl){ player._talentBurnStart = (player._talentBurnStart||0) + lvl*2; },
    },
    {
      id:'kt_fire_dmg', name:'Pyroclasm', emoji:'💥',
      phosCost:14, phorosCost:2, maxLevel:3,
      levelCosts:[null,22,35],
      levelDescs:['+10% Fire spell damage.','+15% Fire spell damage.','+20% Fire spell damage.'],
      apply(lvl){ player._talentFireDmgMult = (player._talentFireDmgMult||1.0) + lvl*0.05 + 0.05; },
    },
    {
      id:'kt_fire_starter', name:'Ignite', emoji:'🔥',
      phosCost:8, phorosCost:1, maxLevel:3,
      levelCosts:[null,14,24],
      levelDescs:['Add Ignite (Dim) to your starting deck.','Add Ignite (Kindled) to your starting deck.','Add Ignite (Blazing) to your starting deck.'],
      apply(lvl){ if(!player._ktStarterSpells)player._ktStarterSpells=[]; player._ktStarterSpells.push({element:'Fire',rarity:['dim','kindled','blazing'][lvl-1]}); },
    },
  ],
  Lightning: [
    {
      id:'kt_lightning_shock', name:'Conductor', emoji:'⚡',
      phosCost:12, phorosCost:1, maxLevel:3,
      levelCosts:[null,18,28],
      levelDescs:['+0.5 Shock/hit.','+1 Shock/hit.','+1.5 Shock/hit.'],
      apply(lvl){ player._talentShockBonus = (player._talentShockBonus||0) + lvl*0.5; },
    },
    {
      id:'kt_lightning_surge', name:'Surge', emoji:'💥',
      phosCost:12, phorosCost:2, maxLevel:3,
      levelCosts:[null,18,28],
      levelDescs:['Overload floor +15%.','Overload floor +25%.','Overload floor +35%.'],
      apply(lvl){ player._talentOverloadFloor = (player._talentOverloadFloor||0.25) + lvl*0.10 + 0.05; },
    },
    {
      id:'kt_lightning_dmg', name:'Voltage', emoji:'🔌',
      phosCost:14, phorosCost:2, maxLevel:3,
      levelCosts:[null,22,35],
      levelDescs:['+10% Lightning spell damage.','+15%.','+20%.'],
      apply(lvl){ player._talentLightDmgMult = (player._talentLightDmgMult||1.0) + lvl*0.05 + 0.05; },
    },
    {
      id:'kt_lightning_starter', name:'Zap', emoji:'⚡',
      phosCost:8, phorosCost:1, maxLevel:3,
      levelCosts:[null,14,24],
      levelDescs:['Add Zap (Dim) to your starting deck.','Add Zap (Kindled) to your starting deck.','Add Zap (Blazing) to your starting deck.'],
      apply(lvl){ if(!player._ktStarterSpells)player._ktStarterSpells=[]; player._ktStarterSpells.push({element:'Lightning',rarity:['dim','kindled','blazing'][lvl-1]}); },
    },
  ],
  Nature: [
    {
      id:'kt_nature_root', name:'Deep Roots', emoji:'🌿',
      phosCost:12, phorosCost:1, maxLevel:3,
      levelCosts:[null,18,28],
      levelDescs:['+0.5 Root/proc.','+1 Root/proc.','+1.5 Root/proc.'],
      apply(lvl){ player._talentRootBonus = (player._talentRootBonus||0) + lvl*0.5; },
    },
    {
      id:'kt_nature_treant', name:'Ancient Grove', emoji:'🌳',
      phosCost:10, phorosCost:1, maxLevel:3,
      levelCosts:[null,14,22],
      levelDescs:['Treants start +20 HP.','+40 HP.','+60 HP.'],
      apply(lvl){ player._talentTreantHP = (player._talentTreantHP||0) + lvl*20; },
    },
    {
      id:'kt_nature_dmg', name:'Verdant', emoji:'🌱',
      phosCost:14, phorosCost:2, maxLevel:3,
      levelCosts:[null,22,35],
      levelDescs:['+10% Nature spell damage.','+15%.','+20%.'],
      apply(lvl){ player._talentNatureDmgMult = (player._talentNatureDmgMult||1.0) + lvl*0.05 + 0.05; },
    },
    {
      id:'kt_nature_starter', name:'Vine Strike', emoji:'🌿',
      phosCost:8, phorosCost:1, maxLevel:3,
      levelCosts:[null,14,24],
      levelDescs:['Add Vine Strike (Dim) to your starting deck.','Add Vine Strike (Kindled) to your starting deck.','Add Vine Strike (Blazing) to your starting deck.'],
      apply(lvl){ if(!player._ktStarterSpells)player._ktStarterSpells=[]; player._ktStarterSpells.push({element:'Nature',rarity:['dim','kindled','blazing'][lvl-1]}); },
    },
  ],
  Air: [
    {
      id:'kt_air_slipstream', name:'Slipstream', emoji:'💨',
      phosCost:15, phorosCost:4, maxLevel:3,
      levelCosts:[null,22,35],
      levelDescs:['+1 action every 5 turns.','+1 action every 4 turns.','+1 action every 3 turns.'],
      apply(lvl){ player._slipstreamInterval = [5,4,3][lvl-1]; },
    },
    {
      id:'kt_air_gust', name:'Gust', emoji:'🌪️',
      phosCost:12, phorosCost:2, maxLevel:3,
      levelCosts:[null,18,28],
      levelDescs:['+1 hit on multi-hit Air spells.','+2 hits.','+3 hits.'],
      apply(lvl){ player._talentAirHits = (player._talentAirHits||0) + lvl; },
    },
    {
      id:'kt_air_dmg', name:'Windshear', emoji:'🌬️',
      phosCost:14, phorosCost:2, maxLevel:3,
      levelCosts:[null,22,35],
      levelDescs:['+10% Air spell damage.','+15%.','+20%.'],
      apply(lvl){ player._talentAirDmgMult = (player._talentAirDmgMult||1.0) + lvl*0.05 + 0.05; },
    },
    {
      id:'kt_air_starter', name:'Quintuple Hit', emoji:'💨',
      phosCost:8, phorosCost:1, maxLevel:3,
      levelCosts:[null,14,24],
      levelDescs:['Add Quintuple Hit (Dim) to your starting deck.','Add Quintuple Hit (Kindled) to your starting deck.','Add Quintuple Hit (Blazing) to your starting deck.'],
      apply(lvl){ if(!player._ktStarterSpells)player._ktStarterSpells=[]; player._ktStarterSpells.push({element:'Air',rarity:['dim','kindled','blazing'][lvl-1]}); },
    },
  ],
};

// ── Apply equipped cards at run start ────────────────────────────────────────
function applyKnowledgeTreeCards() {
  const meta    = getMeta();
  const equipped = meta.ktEquipped || [];
  if (!equipped.length) return;
  const allCards = [...KT_GENERAL_CARDS, ...Object.values(KT_ELEMENTAL_CARDS).flat()];
  for (const id of equipped) {
    const card = allCards.find(c => c.id === id);
    if (card && card.apply) card.apply(ktGetCardLevel(meta, id));
  }
}

// ── Apply KT starter spells after giveStarterSpell() ─────────────────────────
function ktApplyStarterSpells() {
  if (!player._ktStarterSpells || !player._ktStarterSpells.length) return;
  player._ktStarterSpells.forEach(entry => {
    const elemName = typeof entry === 'string' ? entry : entry.element;
    const rarity   = typeof entry === 'string' ? 'dim' : (entry.rarity || 'dim');
    const spellId  = STARTER_SPELL[elemName];
    if (!spellId) return;
    const alreadyOwned = (player.spellbooks||[]).some(b => b.spells.some(s => s.id === spellId));
    if (!alreadyOwned) addSpellById(spellId, true, rarity);
  });
}

// ── Unlock a card (Phos) ─────────────────────────────────────────────────────
function ktUnlockCard(cardId) {
  const meta = getMeta();
  const allCards = [...KT_GENERAL_CARDS, ...Object.values(KT_ELEMENTAL_CARDS).flat()];
  const card = allCards.find(c => c.id === cardId);
  if (!card) return false;
  if (!meta.ktUnlocked) meta.ktUnlocked = [];
  if (meta.ktUnlocked.includes(cardId)) return false;
  if ((meta.phos || 0) < card.phosCost) return false;
  meta.phos -= card.phosCost;
  meta.ktUnlocked.push(cardId);
  if (!meta.ktLevels) meta.ktLevels = {};
  meta.ktLevels[cardId] = 1;
  saveMeta();
  return true;
}

// ── Level up a card (Phos) ───────────────────────────────────────────────────
function ktUpgradeCard(cardId) {
  const meta = getMeta();
  const allCards = [...KT_GENERAL_CARDS, ...Object.values(KT_ELEMENTAL_CARDS).flat()];
  const card = allCards.find(c => c.id === cardId);
  if (!card) return false;
  if (!meta.ktUnlocked || !meta.ktUnlocked.includes(cardId)) return false;
  if (!meta.ktLevels) meta.ktLevels = {};
  const currentLevel = meta.ktLevels[cardId] || 1;
  if (currentLevel >= card.maxLevel) return false;
  const nextLevel = currentLevel + 1;
  const cost = card.levelCosts[nextLevel - 1];
  if (!cost || (meta.phos || 0) < cost) return false;
  meta.phos -= cost;
  meta.ktLevels[cardId] = nextLevel;
  saveMeta();
  return true;
}

// ── Equip / unequip a card (uses type-specific Phoros budget) ────────────────
function ktEquipCard(cardId) {
  const meta = getMeta();
  if (!meta.ktUnlocked || !meta.ktUnlocked.includes(cardId)) return false;
  if (!meta.ktEquipped) meta.ktEquipped = [];
  if (meta.ktEquipped.includes(cardId)) {
    meta.ktEquipped = meta.ktEquipped.filter(id => id !== cardId);
    saveMeta();
    return true;
  }
  const isGeneral = KT_GENERAL_CARDS.some(c => c.id === cardId);
  const type = isGeneral ? 'general' : 'elemental';
  const pool = isGeneral ? KT_GENERAL_CARDS : Object.values(KT_ELEMENTAL_CARDS).flat();
  const card = pool.find(c => c.id === cardId);
  if (!card) return false;
  if (ktPhoresUsed(meta, type) + card.phorosCost > ktGetBudget(meta, type)) return false;
  meta.ktEquipped.push(cardId);
  saveMeta();
  return true;
}

// ── Expand a budget pool (Phos) ──────────────────────────────────────────────
function ktUpgradeBudget(type) {
  const meta = getMeta();
  const key  = type === 'elemental' ? 'ktBudgetElementalLevel' : 'ktBudgetGeneralLevel';
  const lvl  = meta[key] || 0;
  if (lvl >= KT_BUDGET_UPGRADE_COSTS.length) return false;
  const cost = KT_BUDGET_UPGRADE_COSTS[lvl];
  if ((meta.phos || 0) < cost) return false;
  meta.phos -= cost;
  meta[key] = lvl + 1;
  saveMeta();
  return true;
}
