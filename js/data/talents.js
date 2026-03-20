// ===== talents.js =====
// ─── TALENT TREE ──────────────────────────────────────────────────────────────
// Phos: meta currency earned each run. Spent here for permanent upgrades.
// meta.phos       = total unspent phos
// meta.phosTotal  = lifetime phos earned (for display)
// meta.talents    = { nodeId: currentLevel }

// ── Phos earning formula ──────────────────────────────────────────────────────
// Called at run end in saveRunStats
function calcPhosEarned() {
  let phos = 0;
  phos += battleNumber;                          // 1 per battle survived
  phos += (currentGymIdx || 0) * 10;             // 10 per gym beaten this run
  phos += Math.floor(player.gold / 20);          // 1 per 20 gold accumulated
  return Math.max(1, Math.round(phos));
}

// ── Talent node definitions ───────────────────────────────────────────────────
// maxLevel: how many times purchasable
// cost(level): phos cost to go from (level-1) → level  (level is 1-based next purchase)
// apply(level): called at run start for each level purchased

const TALENT_TREE = {

  // ── UNIVERSAL ──────────────────────────────────────────────────────────────
  universal: {
    label: 'Universal',
    nodes: [
      {
        id: 'lives',
        name: 'Extra Life',
        emoji: '❤️',
        desc: 'Start each run with +1 life.',
        maxLevel: 4,
        cost: lvl => [3, 6, 12, 20][lvl - 1],
        apply(lvl) { player.revives += lvl; },
      },
      {
        id: 'base_hp',
        name: 'Vitality',
        emoji: '💪',
        desc: '+15 max HP per level.',
        maxLevel: 6,
        cost: lvl => lvl * 2,
        apply(lvl) { player.baseMaxHPBonus = (player.baseMaxHPBonus||0) + lvl * 15; },
      },
      {
        id: 'base_atk',
        name: 'Attack Training',
        emoji: '⚔️',
        desc: '+3 Attack Power per level.',
        maxLevel: 6,
        cost: lvl => lvl * 2,
        apply(lvl) { player.attackPower += lvl * 3; },
      },
      {
        id: 'base_efx',
        name: 'Effect Training',
        emoji: '✨',
        desc: '+3 Effect Power per level.',
        maxLevel: 6,
        cost: lvl => lvl * 2,
        apply(lvl) { player.effectPower += lvl * 3; },
      },
      {
        id: 'base_def',
        name: 'Defense Training',
        emoji: '🛡️',
        desc: '+3 Defense per level.',
        maxLevel: 6,
        cost: lvl => lvl * 2,
        apply(lvl) { player.defense += lvl * 3; },
      },
      {
        id: 'revive_hp',
        name: 'Iron Will',
        emoji: '🩹',
        desc: 'Revive with more HP: +25% per level (stacks).',
        maxLevel: 3,
        cost: lvl => lvl * 4,
        apply(lvl) {
          // stored on player for combat.js to read
          player._talentReviveBonus = (player._talentReviveBonus||0) + lvl * 0.25;
        },
      },
      {
        id: 'gold_find',
        name: 'Treasure Sense',
        emoji: '💰',
        desc: '+10% gold from all sources per level.',
        maxLevel: 4,
        cost: lvl => lvl * 3,
        apply(lvl) { player._goldBonus = (player._goldBonus||0) + lvl * 0.10; },
      },
      {
        id: 'start_gold',
        name: 'Inheritance',
        emoji: '🏦',
        desc: 'Start each run with +25g per level.',
        maxLevel: 4,
        cost: lvl => lvl * 3,
        apply(lvl) { player.gold += lvl * 25; },
      },
    ],
  },

  // ── ELEMENTAL TREES (stubs — you fill these in) ────────────────────────────
  Fire: {
    label: '🔥 Fire',
    nodes: [
      { id:'fire_burn_dmg',   name:'Hotter Burns',   emoji:'🔥', desc:'+0.1 bonus burn damage per stack per level (max +0.5).', maxLevel:5, cost: lvl => lvl * 3, apply(lvl){ player._talentBurnDmg = lvl * 0.1; } },
      { id:'fire_burn_stacks',name:'Kindling',       emoji:'🪵', desc:'Start with +2 burn stacks on enemy per level.', maxLevel:3, cost: lvl => lvl * 4, apply(lvl){ player._talentBurnStart = (player._talentBurnStart||0) + lvl * 2; } },
      { id:'fire_spell_dmg',  name:'Pyroclasm',      emoji:'💥', desc:'+5% fire spell damage per level.', maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentFireDmgMult = (player._talentFireDmgMult||1.0) + lvl * 0.05; } },
      { id:'fire_basic',      name:'Ember Strike',   emoji:'🔥', desc:'Basic Attack becomes Ember Strike: deals +10 damage + applies 2 Burn stacks. (Fire only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Fire') player._elementalBasicFire = true; } },
    ],
  },
  Water: {
    label: '💧 Water',
    nodes: [
      { id:'water_heal',      name:'Deep Current',   emoji:'💧', desc:'+10% healing per level.',          maxLevel:5, cost: lvl => lvl * 3, apply(lvl){ player._healBonus = (player._healBonus||0) + lvl * 0.10; } },
      { id:'water_foam',      name:'Froth',          emoji:'🫧', desc:'Start each battle with 2 Foam on all enemies per level.', maxLevel:3, cost: lvl => lvl * 4, apply(lvl){ player._talentFoamStart = (player._talentFoamStart||0) + lvl * 2; } },
      { id:'water_spell_dmg', name:'Torrent',        emoji:'🌊', desc:'+5% water spell damage per level.',maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentWaterDmgMult = (player._talentWaterDmgMult||1.0) + lvl * 0.05; } },
      { id:'water_basic',     name:'Tidal Jab',      emoji:'💧', desc:'Basic Attack becomes Tidal Jab: deals +10 damage + applies 1 Foam stack. (Water only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Water') player._elementalBasicWater = true; } },
    ],
  },
  Ice: {
    label: '❄️ Ice',
    nodes: [
      { id:'ice_frost_stacks',name:'Deep Freeze',    emoji:'❄️', desc:'+0.5 frost stack applied per ability per level (max +1.5).', maxLevel:3, cost: lvl => lvl * 3, apply(lvl){ player._talentFrostBonus = lvl * 0.5; } },
      { id:'ice_execute',     name:'Brittle',        emoji:'🧊', desc:'+2% execute threshold per level.', maxLevel:5, cost: lvl => lvl * 3, apply(lvl){ player._talentIceExecute = (player._talentIceExecute||0) + lvl * 2; } },
      { id:'ice_spell_dmg',   name:'Glacier',        emoji:'🏔️', desc:'+5% ice spell damage per level.',  maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentIceDmgMult = (player._talentIceDmgMult||1.0) + lvl * 0.05; } },
      { id:'ice_basic',       name:'Frost Jab',      emoji:'❄️', desc:'Basic Attack becomes Frost Jab: deals +10 damage + applies 1 Frost stack. (Ice only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Ice') player._elementalBasicIce = true; } },
    ],
  },
  Lightning: {
    label: '⚡ Lightning',
    nodes: [
      { id:'lightning_shock', name:'Conductor',      emoji:'⚡', desc:'+0.5 shock stack per hit per level (max +1.5).',maxLevel:3, cost: lvl => lvl * 3, apply(lvl){ player._talentShockBonus = lvl * 0.5; } },
      { id:'lightning_overload_floor','name':'Surge', emoji:'💥', desc:'Overload damage floor +10% per level (min 25%).', maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentOverloadFloor = (player._talentOverloadFloor||0.25) + lvl * 0.10; } },
      { id:'lightning_spell_dmg','name':'Voltage',   emoji:'🔌', desc:'+5% lightning spell damage per level.', maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentLightDmgMult = (player._talentLightDmgMult||1.0) + lvl * 0.05; } },
      { id:'lightning_basic', name:'Spark Strike',   emoji:'⚡', desc:'Basic Attack becomes Spark Strike: deals +10 damage + applies an extra Shock stack. (Lightning only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Lightning') player._elementalBasicLightning = true; } },
    ],
  },
  Earth: {
    label: '🪨 Earth',
    nodes: [
      { id:'earth_armor',     name:'Stoneback',      emoji:'🪨', desc:'+5 starting armor per level.',     maxLevel:5, cost: lvl => lvl * 3, apply(lvl){ player._blockStart = (player._blockStart||0) + lvl * 5; } },
      { id:'earth_stone',     name:'Bedrock',        emoji:'⛰️', desc:'+1 starting Stone stack per level.',maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentStoneStart = (player._talentStoneStart||0) + lvl; } },
      { id:'earth_spell_dmg', name:'Tectonic',       emoji:'🌍', desc:'+5% earth spell damage per level.',maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentEarthDmgMult = (player._talentEarthDmgMult||1.0) + lvl * 0.05; } },
      { id:'earth_basic',     name:'Stone Fist',     emoji:'🪨', desc:'Basic Attack becomes Stone Fist: deals +10 damage + grants +1 Stone stack. (Earth only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Earth') player._elementalBasicEarth = true; } },
    ],
  },
  Nature: {
    label: '🌿 Nature',
    nodes: [
      { id:'nature_root',     name:'Deep Roots',     emoji:'🌿', desc:'+0.5 root stack on root proc per level (max +1.5).', maxLevel:3, cost: lvl => lvl * 3, apply(lvl){ player._talentRootBonus = lvl * 0.5; } },
      { id:'nature_treant',   name:'Ancient Grove',  emoji:'🌳', desc:'Treants start with +15 HP per level.', maxLevel:4, cost: lvl => lvl * 3, apply(lvl){ player._talentTreantHP = (player._talentTreantHP||0) + lvl * 15; } },
      { id:'nature_spell_dmg','name':'Verdant',      emoji:'🌱', desc:'+5% nature spell damage per level.',maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentNatureDmgMult = (player._talentNatureDmgMult||1.0) + lvl * 0.05; } },
      { id:'nature_basic',    name:'Vine Whip',      emoji:'🌿', desc:'Basic Attack becomes Vine Whip: deals +10 damage + applies 1 Root stack. (Nature only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Nature') player._elementalBasicNature = true; } },
    ],
  },
  Plasma: {
    label: '🔮 Plasma',
    nodes: [
      { id:'plasma_dodge',    name:'Ghost Step',     emoji:'👻', desc:'+2% base dodge per level.',        maxLevel:5, cost: lvl => lvl * 3, apply(lvl){ player._talentDodgeBonus = (player._talentDodgeBonus||0) + lvl * 0.02; } },
      { id:'plasma_charge',   name:'Capacitor',      emoji:'🔋', desc:'+1 starting Charge per level.',    maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentChargeStart = (player._talentChargeStart||0) + lvl; } },
      { id:'plasma_spell_dmg','name':'Ionize',       emoji:'⚛️', desc:'+5% plasma spell damage per level.',maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentPlasmaDmgMult = (player._talentPlasmaDmgMult||1.0) + lvl * 0.05; } },
      { id:'plasma_basic',    name:'Surge Bolt',     emoji:'🔮', desc:'Basic Attack becomes Surge Bolt: deals +10 damage + generates 2 Plasma Charge. (Plasma only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Plasma') player._elementalBasicPlasma = true; } },
    ],
  },
  Air: {
    label: '🌀 Air',
    nodes: [
      { id:'air_actions',     name:'Slipstream',     emoji:'💨', desc:'+1 action every 5/4/3 turns (scales with level).', maxLevel:3, cost: lvl => lvl * 5, apply(lvl){ player._slipstreamInterval = [5,4,3][lvl-1]; } },
      { id:'air_multihit',    name:'Gust',           emoji:'🌪️', desc:'+1 hit on multi-hit Air spells per level.', maxLevel:3, cost: lvl => lvl * 4, apply(lvl){ player._talentAirHits = (player._talentAirHits||0) + lvl; } },
      { id:'air_spell_dmg',   name:'Windshear',      emoji:'🌬️', desc:'+5% air spell damage per level.',  maxLevel:4, cost: lvl => lvl * 4, apply(lvl){ player._talentAirDmgMult = (player._talentAirDmgMult||1.0) + lvl * 0.05; } },
      { id:'air_basic',       name:'Gust Slash',     emoji:'💨', desc:'Basic Attack becomes Gust Slash: deals +10 damage + grants +1 Momentum. (Air only)', maxLevel:1, cost: ()=>6, apply(){ if(playerElement==='Air') player._elementalBasicAir = true; } },
    ],
  },
};

// ── Apply all purchased talents to current run ────────────────────────────────
function applyTalentBonuses() {
  const meta = getMeta();
  const talents = meta.talents || {};
  // Reset all talent-driven player fields first
  player.revives = 0;
  player._talentReviveBonus = 0;
  player._goldBonus   = player._goldBonus   || 0; // artifacts may also set this
  player._blockStart  = player._blockStart  || 0;

  // Apply each purchased node (Mist may reduce effective level)
  const mistReduction = player._mistTalentReduction || 0;
  Object.entries(talents).forEach(([nodeId, level]) => {
    const effectiveLevel = Math.max(0, level - mistReduction);
    if (!effectiveLevel) return;
    const node = _findTalentNode(nodeId);
    if (node && node.apply) node.apply(effectiveLevel);
  });
}

function _findTalentNode(id) {
  for (const section of Object.values(TALENT_TREE)) {
    const found = section.nodes.find(n => n.id === id);
    if (found) return found;
  }
  return null;
}

// ── Purchase a talent node ────────────────────────────────────────────────────
function purchaseTalent(nodeId) {
  const meta   = getMeta();
  if (!meta.talents) meta.talents = {};
  const node   = _findTalentNode(nodeId);
  if (!node) return false;
  const current = meta.talents[nodeId] || 0;
  if (current >= node.maxLevel) return false;
  const nextLvl = current + 1;
  const cost    = node.cost(nextLvl);
  if ((meta.phos || 0) < cost) return false;
  meta.phos -= cost;
  meta.talents[nodeId] = nextLvl;
  saveMeta();
  return true;
}

// ── Phos earned this run — stored temporarily, credited in saveRunStats ────────
let _runPhosEarned = 0;


