'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD LEAGUE — 1M Full Run Simulation
// Simulates actual runs: builds evolve through reward picks, HP persists across
// battles, zones get harder. Each run = one zone (12 battles + gym boss).
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_HP    = 200;
const BATTLE_HEAL = 10;     // HP restored between non-gym battles
const MAX_TURNS   = 60;
const N_RUNS      = 1_000_000;
const ZONES       = [1,2,3,4,5];

// ─── MATH HELPERS ─────────────────────────────────────────────────────────────
function incantBonus(level, baseScale, decay) {
  if (level <= 1) return 0;
  let b = 0;
  for (let i = 0; i < level - 1; i++) b += baseScale * Math.pow(decay, i);
  return b;
}
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ─── ENEMY POOL ───────────────────────────────────────────────────────────────
const ENEMY_POOL = [
  {hp:95,  dmg:22, el:'Fire'},
  {hp:110, dmg:20, el:'Fire'},
  {hp:130, dmg:18, el:'Fire'},
  {hp:85,  dmg:26, el:'Lightning'},
  {hp:100, dmg:24, el:'Lightning'},
  {hp:110, dmg:22, el:'Lightning'},
  {hp:95,  dmg:20, el:'Nature'},
  {hp:120, dmg:18, el:'Nature'},
  {hp:135, dmg:16, el:'Nature'},
  {hp:90,  dmg:20, el:'Water'},
  {hp:115, dmg:18, el:'Water'},
  {hp:100, dmg:24, el:'Water'},
  {hp:95,  dmg:22, el:'Ice'},
  {hp:125, dmg:18, el:'Ice'},
  {hp:90,  dmg:26, el:'Plasma'},
  {hp:85,  dmg:28, el:'Plasma'},
  {hp:80,  dmg:28, el:'Air'},
  {hp:90,  dmg:26, el:'Air'},
  {hp:120, dmg:18, el:'Earth'},
  {hp:145, dmg:16, el:'Earth'},
];

function scaleEnemy(enc, gymIdx) {
  const hp  = Math.round(enc.hp  * (1 + gymIdx * 0.28) * 1.25);
  const dmg = Math.max(1, Math.round(enc.dmg * (1 + gymIdx * 0.22)) - 5);
  const ap  = Math.floor(gymIdx * 4.4);
  return { hp, dmg, ap };
}

// Gym bosses per element (fixed stats, scaled by zone)
const GYM_BASES = {
  Fire:      {hp:280, dmg:28},
  Lightning: {hp:260, dmg:32},
  Nature:    {hp:300, dmg:26},
};
function gymEnemy(element, gymIdx) {
  const g = GYM_BASES[element] || {hp:270, dmg:28};
  return {
    hp:  Math.round(g.hp  * (1 + gymIdx * 0.30)),
    dmg: Math.max(1, Math.round(g.dmg * (1 + gymIdx * 0.20)) - 3),
    ap:  Math.floor(gymIdx * 5 + 8),  // gym boss has extra AP (makeEnemyObj: +8 for isGym)
  };
}

// ─── SPELL DEFINITIONS ────────────────────────────────────────────────────────
// Values sourced directly from spells.js
// apMult: fraction of AP added to damage (default 1.0)
// melt: deals melt damage (strips armor 3:1, then HP)
const SPELL_POOLS = {
  Fire: {
    // All primaries the player can start with or pick
    primary: [
      // Burn branch
      {id:'ignite',       cd:1, baseDmg:5,  hits:1, burnBase:15, burnScale:3, burnDecay:0.90},          // STARTER
      {id:'ember_storm',  cd:2, baseDmg:5,  hits:3, burnBase:3,  burnScale:1, burnDecay:0.90},
      {id:'flame_wave',   cd:2, baseDmg:10, hits:1, burnBase:5,  burnScale:1, burnDecay:0.90},
      {id:'firewall',     cd:1, baseDmg:0,  hits:1, burnBase:4,  burnScale:1, burnDecay:0.90},
      // Melt branch
      {id:'melt_strike',  cd:1, baseDmg:0,  hits:1, meltBase:12, meltScale:3, meltDecay:0.90, apMult:0.5},
      {id:'forge_blast',  cd:2, baseDmg:0,  hits:1, meltBase:8,  meltScale:2, meltDecay:0.90, burnBase:8, burnScale:2, burnDecay:0.90},
      {id:'slag',         cd:1, baseDmg:0,  hits:1, meltBase:6,  meltScale:2, meltDecay:0.90, apMult:0.5},
      {id:'heat_surge',   cd:3, baseDmg:0,  hits:1, meltBase:16, meltScale:3, meltDecay:0.90, apMult:0.5, healOnMelt:0.5},
    ],
    secondary: [
      {id:'grease_fire',  cd:1, baseDmg:0,  hits:1, burnBase:4,  burnScale:1, burnDecay:0.90, burnMult:2},
      {id:'extinguish',   cd:2, baseDmg:0,  hits:1, burnTrigger:true},     // triggers + consumes burn
      {id:'fire_heal',    cd:2, baseDmg:0,  hits:1, healFromBurn:true},
      {id:'smelt',        cd:2, baseDmg:0,  hits:1, meltBase:8,  meltScale:2, meltDecay:0.90, apMult:0.5, burnToMelt:true},
      {id:'melt_down',    cd:3, baseDmg:0,  hits:1, forceBreakArmor:true},
      {id:'temper',       cd:2, baseDmg:0,  hits:1, nextMeltDouble:true},
    ],
  },
  Lightning: {
    primary: [
      {id:'zap',           cd:0, baseDmg:25, hits:1, shockBase:2.0, shockScale:0.4, shockDecay:0.90},    // STARTER (baseDmg+AP/10 bonus)
      {id:'chain',         cd:2, baseDmg:11, hits:4, shockBase:1.0, shockScale:0.5, shockDecay:1.00, apMult:1.25},
      {id:'overcharge',    cd:2, baseDmg:0,  hits:1, shockBase:3.0, shockScale:1.0, shockDecay:0.90, powerBoost:30},
      {id:'bolt',          cd:1, baseDmg:15, hits:1, surgeLoad:25, surgeScale:4, surgeDecay:0.90},
      {id:'thunder_strike',cd:2, baseDmg:35, hits:1, shockBase:2.0, shockScale:0.5, shockDecay:0.90},
      {id:'ball_lightning',cd:2, baseDmg:10, hits:1, surgeLoad:20, surgeScale:3, surgeDecay:0.90},        // AOE
      {id:'static_charge', cd:1, baseDmg:0,  hits:1, surgeLoad:60, surgeScale:8, surgeDecay:0.90},
      {id:'megavolt',      cd:3, baseDmg:50, hits:1, surgeScale:8, surgeDecay:0.90},
    ],
    secondary: [
      {id:'blitz',         cd:2, baseDmg:0,  hits:1, shockDetonate:true},   // stacks × AP/3 dmg
      {id:'electrocute',   cd:3, baseDmg:0,  hits:1, shockMult:2.0, selfDmg:10},
      {id:'feedback',      cd:2, baseDmg:0,  hits:1, shockBase:2.0, shockScale:1.0, shockDecay:0.90, selfDmg:5, powerBoost:15},
      {id:'supercharge',   cd:3, baseDmg:0,  hits:1, surgeLoad:80, surgeScale:5, surgeDecay:0.90},
      {id:'overclock',     cd:3, baseDmg:0,  hits:1, surgeDoubleCurrent:true},
      {id:'detonator',     cd:4, baseDmg:0,  hits:1, triggerSurge:true},
    ],
  },
  Nature: {
    primary: [
      {id:'vine',          cd:0, baseDmg:5,  hits:3, rootChance:0.50, rootScale:0.05, rootDecay:0.90, apMult:0.75}, // STARTER
      {id:'thornwall',     cd:2, baseDmg:0,  hits:1, giveArmor:30, rootBase:2, rootScale:1, rootDecay:1.00},
      {id:'bramble_burst', cd:1, baseDmg:10, hits:1, rootChance:0.50, rootScale:0.05, rootDecay:0.90},              // AOE
      {id:'damage_seed',   cd:2, baseDmg:0,  hits:1, seedType:'damage', seedTimer:5},
      {id:'root_seed',     cd:2, baseDmg:0,  hits:1, seedType:'root',   seedTimer:5},
      {id:'healing_seed',  cd:3, baseDmg:0,  hits:1, seedType:'healing',seedTimer:5},
    ],
    secondary: [
      {id:'wild_growth',    cd:3, baseDmg:0, hits:1, rootMult:2.0},
      {id:'accelerate',     cd:1, baseDmg:0, hits:1, seedAccel:1},
      {id:'seed_surge',     cd:3, baseDmg:0, hits:1, seedSurgePrimed:true},
      {id:'spreading_vines',cd:4, baseDmg:0, hits:1, rootOverTime:3},
      {id:'natures_wrath',  cd:4, baseDmg:0, hits:1, consumeRootDmg:20},
    ],
  },
};

// ─── PASSIVE DEFINITIONS ──────────────────────────────────────────────────────
// Just IDs here; combat simulation checks these via hasP()
const PASSIVE_POOLS = {
  Fire: {
    normal: [
      'fire_pyromaniac',    // +3 burn/hit ×0.75 → +2.25 burn/hit
      'fire_combustion',    // +1 burn/hit + 1 per 5 stacks
      'fire_blazing_heat',  // +1 AP per 2 burn stacks
      'fire_wildfire',      // 33%/turn to double burn
      'fire_forge_master',  // melt: +30% melt points
      'fire_iron_burn',     // melt: +1 per 3 burn stacks → bonus dmg
      'fire_slag_trail',    // armor destroyed → burn stacks
      'fire_armor_eater',   // +2 HP dmg per armor consumed
    ],
    legendary: [
      'fire_roaring_heat',  // burn 1.5× instead of 1×
      'fire_eternal_flame', // melt HP damage → 50% burn
      'fire_meltdown',      // full armor break → 100% peak armor as melt
    ],
  },
  Lightning: {
    normal: [
      'lightning_conduction',    // +1 shock/hit, +2% reduction bonus
      'lightning_double_strike', // 30%+ chance to double (triple at >100%)
      'lightning_static_shock',  // +10%+ of enemy HP as bonus dmg
      'lightning_hair_trigger',  // surge threshold 50 instead of 60
      'lightning_overcharged',   // +3 shock when surge triggers
      'lightning_chain_surge',   // reapply surge at same dmg
      'lightning_static_build',  // +20 dmg/turn without surge
      'lightning_conductivity',  // each shock = 2 dmg toward surge
    ],
    legendary: [
      'lightning_overload',      // 2.0× mult, -0.25/action, min 0.25, resets/turn
      'lightning_cascade',       // -1 CD all spells on surge
      'lightning_storm_core',    // surge threshold +15/trigger (permanent)
      'lightning_amplified',     // new surge adds 25% to existing
    ],
  },
  Nature: {
    normal: [
      'nature_overgrowth',       // blocked root → permanent overgrowth
      'nature_stay_rooted',      // +1 root per application
      'nature_thorned_strikes',  // +5 dmg per root/overgrowth stack
      'nature_bramble_guard',    // +1 root when player gains armor
      'nature_perennial',        // bloomed seed replants at 4t timer
      'nature_deep_roots',       // every 3rd root → -1 seed timer
      'nature_thorn_bloom',      // bloom on rooted target → +2 extra root
      'nature_verdant_patience', // 3 turns no bloom → +15 armor
    ],
    legendary: [
      'nature_verdant_legion',   // treants +25 HP, +10 dmg, always root
      'nature_eternal_garden',   // each seed independent timer
      'nature_rooted_bloom',     // bloom applies root = stacks
    ],
  },
};

// ─── TALENT CONFIGS ───────────────────────────────────────────────────────────
const TALENT_CFGS = [
  { level:0, label:'Novice',     ap:0,  efx:0,  hpBonus:0,
    Fire:{burnDmgBonus:0,   spellMult:1.00, burnStart:0},
    Lightning:{shockPerHit:0,   spellMult:1.00, overloadFloor:0.25},
    Nature:{rootBonus:0,    spellMult:1.00} },
  { level:1, label:'Apprentice', ap:3,  efx:3,  hpBonus:15,
    Fire:{burnDmgBonus:0.1, spellMult:1.00, burnStart:2},
    Lightning:{shockPerHit:0.5, spellMult:1.00, overloadFloor:0.35},
    Nature:{rootBonus:0.5,  spellMult:1.00} },
  { level:2, label:'Adept',      ap:9,  efx:9,  hpBonus:30,
    Fire:{burnDmgBonus:0.3, spellMult:1.10, burnStart:6},
    Lightning:{shockPerHit:1.0, spellMult:1.10, overloadFloor:0.45},
    Nature:{rootBonus:1.0,  spellMult:1.10} },
  { level:3, label:'Master',     ap:18, efx:18, hpBonus:60,
    Fire:{burnDmgBonus:0.5, spellMult:1.20, burnStart:10},
    Lightning:{shockPerHit:1.5, spellMult:1.20, overloadFloor:0.55},
    Nature:{rootBonus:1.5,  spellMult:1.20} },
];

// ─── REWARD SCHEDULE (per battle number in zone) ─────────────────────────────
// Mirrors the dynamic reward system: some battles give spells, some give passives
// Zone 1 guaranteed primary spell at battle 1, then mix
function rewardForBattle(battleNum, isZone1) {
  if (isZone1 && battleNum === 1) return 'primary_spell';
  // Rough schedule matching the weighted system (20% spell, 30% incant/minor, 30% minor, 20% major)
  // We simplify incant/minor/major → 'passive' (you pick a passive)
  // and spell choices are offered at battles 1,4,7,10
  const spellBattles = isZone1 ? [1,4,7,10] : [2,5,8,11];
  if (spellBattles.includes(battleNum)) return 'spell';
  return 'passive';
}

// ─── PICK REWARD (strategy: random OR smart) ─────────────────────────────────
function pickReward(rewardType, player, el, strategy) {
  const spellPool = rewardType === 'primary_spell'
    ? [...SPELL_POOLS[el].primary]
    : [...SPELL_POOLS[el].primary, ...SPELL_POOLS[el].secondary];

  if (rewardType === 'spell' || rewardType === 'primary_spell') {
    // Show 3 random spells, pick one we don't have yet (or random if all owned)
    const owned = new Set(player.spells.map(s=>s.id));
    const choices = pickN(spellPool.filter(s=>!owned.has(s.id)), 3);
    if (!choices.length) return; // nothing new to pick
    let chosen;
    if (strategy === 'random') {
      chosen = rnd(choices);
    } else {
      // Smart: prefer secondary > primary if we already have a primary
      const hasPrimary = player.spells.some(s => SPELL_POOLS[el].primary.some(p=>p.id===s.id));
      const preferSecondary = SPELL_POOLS[el].secondary;
      chosen = choices.find(c => preferSecondary.some(p=>p.id===c.id)) || choices[0];
    }
    // Grant with a random incantation level (weighted toward lower rarities)
    const incRoll = Math.random();
    const incLevel = incRoll < 0.50 ? 1 : incRoll < 0.80 ? 2 : incRoll < 0.95 ? 3 : 4;
    player.spells.push({...chosen, incLevel});

  } else {
    // Passive reward
    const ownedIds = new Set(player.passives);
    const pool = [...PASSIVE_POOLS[el].normal].filter(id=>!ownedIds.has(id));
    const choices = pickN(pool, 3);
    if (!choices.length) return;
    let chosen;
    if (strategy === 'random') {
      chosen = rnd(choices);
    } else {
      // Smart: pick based on priority list per element
      const priority = {
        Fire:      ['fire_pyromaniac','fire_combustion','fire_blazing_heat','fire_wildfire','fire_iron_burn','fire_forge_master'],
        Lightning: ['lightning_overload','lightning_double_strike','lightning_static_shock','lightning_conduction','lightning_hair_trigger'],
        Nature:    ['nature_thorned_strikes','nature_stay_rooted','nature_overgrowth','nature_perennial','nature_bramble_guard'],
      }[el] || [];
      chosen = priority.find(id=>choices.includes(id)) || choices[0];
    }
    player.passives.push(chosen);
  }
}

// Grant gym clear rewards: passive + secondary spell + legendary passive
function grantGymRewards(player, el, strategy) {
  // 1. Normal passive
  pickReward('passive', player, el, strategy);
  // 2. Secondary spell (guaranteed)
  const secPool = SPELL_POOLS[el].secondary;
  const ownedIds = new Set(player.spells.map(s=>s.id));
  const avail = secPool.filter(s=>!ownedIds.has(s.id));
  if (avail.length) {
    const incLevel = Math.random() < 0.60 ? 2 : Math.random() < 0.80 ? 3 : 4;
    player.spells.push({...rnd(avail), incLevel});
  }
  // 3. Legendary passive
  const legPool = PASSIVE_POOLS[el].legendary.filter(id=>!player.passives.includes(id));
  if (legPool.length) {
    if (strategy === 'smart') {
      const legPriority = {
        Fire:      ['fire_roaring_heat','fire_meltdown','fire_eternal_flame'],
        Lightning: ['lightning_overload','lightning_cascade','lightning_amplified'],
        Nature:    ['nature_rooted_bloom','nature_eternal_garden','nature_verdant_legion'],
      }[el] || legPool;
      player.passives.push(legPriority.find(id=>legPool.includes(id)) || rnd(legPool));
    } else {
      player.passives.push(rnd(legPool));
    }
  }
}

// ─── BATTLE SIMULATION ────────────────────────────────────────────────────────
function simulateBattle(player, enemy) {
  const el    = player.element;
  const ap0   = player.ap;
  const efx0  = player.efx;
  const eb    = player.eb;
  const spellMult = eb.spellMult || 1.0;

  const hasP = id => player.passives.includes(id);
  const spells = player.spells;

  let playerHP = player.hp;
  let enemyHP  = enemy.hp;
  const enemyDmgBase = enemy.dmg + Math.floor(enemy.ap * 0.3);

  // Status effects on enemy
  let burnStacks  = eb.burnStart || 0;
  let shockStacks = 0;
  let rootStacks  = 0;
  let overgrowthStacks = 0;
  let seeds = [];
  let noSurgeTurns = 0;

  // Spell cooldowns (reset each battle)
  const cds = {};
  for (const s of spells) cds[s.id] = 0;

  let dynAP = ap0;
  let overloadMult   = 2.0;
  let surgeAccum     = 0;
  const surgeThresh  = hasP('lightning_hair_trigger') ? 50 : 60;
  let tempPowerBoost = 0;

  let turns = 0;

  while (playerHP > 0 && enemyHP > 0 && turns < MAX_TURNS) {
    turns++;

    // ── START OF TURN ──────────────────────────────────────────────────────
    if (el === 'Lightning' && hasP('lightning_overload')) overloadMult = 2.0;

    // Wildfire
    if (el === 'Fire' && hasP('fire_wildfire') && burnStacks > 0 && Math.random() < 0.33) {
      burnStacks = Math.min(burnStacks * 2, 999);
    }

    // Burn tick
    if (burnStacks > 0) {
      const perStack = (hasP('fire_roaring_heat') ? 1.5 : 1.0) + efx0/100 + (eb.burnDmgBonus||0);
      enemyHP -= Math.ceil(burnStacks * perStack);
      if (enemyHP <= 0) break;
    }

    // Shock decay
    shockStacks = Math.floor(shockStacks * 0.75);

    // Root decay
    if (rootStacks > 0) {
      if (hasP('nature_overgrowth')) overgrowthStacks++;
      rootStacks = Math.max(0, rootStacks - 1);
    }

    // Blazing heat
    dynAP = (el === 'Fire' && hasP('fire_blazing_heat'))
      ? ap0 + Math.floor(burnStacks / 2)
      : ap0 + tempPowerBoost;
    tempPowerBoost = 0;

    // Seeds
    const bloomed = seeds.filter(s => s.timer <= 1);
    seeds = seeds.filter(s => s.timer > 1).map(s => ({...s, timer:s.timer-1}));
    for (const seed of bloomed) {
      if (seed.type === 'damage') {
        const dmg = Math.round((30 + efx0/2 + dynAP) * spellMult);
        enemyHP -= dmg;
        if (enemyHP <= 0) break;
        if (hasP('nature_perennial')) seeds.push({type:'damage', timer:4});
        if (hasP('nature_thorn_bloom') && rootStacks > 0) rootStacks += 2;
      } else {
        let ra = 3;
        if (hasP('nature_stay_rooted')) ra++;
        if (hasP('nature_rooted_bloom')) ra++;
        rootStacks += ra;
        if (hasP('nature_perennial')) seeds.push({type:'root', timer:4});
      }
    }
    if (enemyHP <= 0) break;

    // ── PLAYER ACTIONS ────────────────────────────────────────────────────
    for (let act = 0; act < 2; act++) {
      // Pick best available spell
      let chosen = null;
      for (const s of spells) {
        if ((cds[s.id]||0) === 0) { chosen = s; break; }
      }

      if (!chosen) {
        // Basic attack
        const dmg = Math.round((8 + dynAP) * spellMult);
        enemyHP -= dmg;
        if (el === 'Lightning') { surgeAccum += dmg * 0.3; if (hasP('lightning_overload')) overloadMult = Math.max(eb.overloadFloor||0.25, overloadMult - 0.25); }
        if (enemyHP <= 0) break;
        continue;
      }

      cds[chosen.id] = chosen.cd;

      // ── FIRE ────────────────────────────────────────────────────────────
      if (el === 'Fire') {
        if ((chosen.baseDmg||0) > 0) {
          for (let h = 0; h < (chosen.hits||1); h++) {
            enemyHP -= Math.round((chosen.baseDmg + dynAP) * spellMult);
          }
          if (enemyHP <= 0) break;
        }
        if (chosen.burnBase) {
          const inc = incantBonus(chosen.incLevel||1, chosen.burnScale, chosen.burnDecay);
          const burnMult = chosen.burnMult || 1;
          for (let h = 0; h < (chosen.hits||1); h++) {
            let nb = (chosen.burnBase + inc) * 0.75 + Math.floor(efx0 * 0.2);
            if (hasP('fire_pyromaniac')) nb += 3 * 0.75;
            if (hasP('fire_combustion')) nb += (1 + Math.floor(burnStacks/5)) * 0.75;
            burnStacks += Math.round(nb * burnMult);
          }
        }
        if (hasP('fire_iron_burn') && burnStacks > 0) {
          const melt = Math.floor(burnStacks / 3) * (hasP('fire_forge_master') ? 1.3 : 1.0);
          enemyHP -= Math.floor(melt);
        }
      }

      // ── LIGHTNING ───────────────────────────────────────────────────────
      else if (el === 'Lightning') {
        if (chosen.id === 'overcharge') {
          const incS = incantBonus(chosen.incLevel||1, chosen.shockScale, chosen.shockDecay);
          let ns = chosen.shockBase + incS + (eb.shockPerHit||0);
          if (hasP('lightning_conduction')) ns += 1;
          shockStacks += ns;
          surgeAccum += hasP('lightning_conductivity') ? ns*2 : 10;
          tempPowerBoost = chosen.powerBoost || 30;
          if (hasP('lightning_overload')) overloadMult = Math.max(eb.overloadFloor||0.25, overloadMult-0.25);
        } else {
          const bounces = chosen.id === 'chain'
            ? Math.round((chosen.hits||4) + incantBonus(chosen.incLevel||1, 1, 1.0))
            : (chosen.hits||1);
          const mult = hasP('lightning_overload') ? overloadMult : 1.0;
          for (let h = 0; h < bounces; h++) {
            let hitMult = 1;
            if (hasP('lightning_double_strike') && Math.random() < 0.30 + efx0/500) hitMult = 2;
            let dmg = Math.round((chosen.baseDmg + dynAP) * spellMult * mult) * hitMult;
            if (hasP('lightning_static_shock') && enemyHP > 0) dmg += Math.round(enemyHP * clamp(0.10 + efx0/1000, 0.10, 0.30));
            enemyHP -= Math.max(0, dmg);
            const incS = incantBonus(chosen.incLevel||1, chosen.shockScale||0.1, chosen.shockDecay||0.9);
            let ns = (chosen.shockBase||0) + incS + (eb.shockPerHit||0);
            if (hasP('lightning_conduction')) ns += 1;
            shockStacks += ns;
            surgeAccum += hasP('lightning_conductivity') ? ns*2 : dmg*0.35;
            if (hasP('lightning_overload')) overloadMult = Math.max(eb.overloadFloor||0.25, overloadMult-0.25);
            if (enemyHP <= 0) break;
          }
          while (surgeAccum >= surgeThresh) {
            const surgeDmg = Math.round(surgeThresh * 1.5 * spellMult);
            enemyHP -= surgeDmg;
            if (hasP('lightning_chain_surge')) enemyHP -= surgeDmg;
            if (hasP('lightning_overcharged')) shockStacks += 3;
            if (hasP('lightning_cascade')) { for (const s of spells) cds[s.id] = Math.max(0,(cds[s.id]||0)-1); }
            surgeAccum -= surgeThresh;
            noSurgeTurns = 0;
            if (enemyHP <= 0) break;
          }
        }
      }

      // ── NATURE ──────────────────────────────────────────────────────────
      else if (el === 'Nature') {
        if (chosen.seedType) {
          seeds.push({type:chosen.seedType, timer:chosen.seedTimer||5});
        } else {
          const incR = incantBonus(chosen.incLevel||1, chosen.rootScale||0.05, chosen.rootDecay||0.9);
          for (let h = 0; h < (chosen.hits||1); h++) {
            const thorn = hasP('nature_thorned_strikes') ? (rootStacks + overgrowthStacks) * 5 : 0;
            const dmg = Math.round((chosen.baseDmg + dynAP + thorn) * spellMult);
            enemyHP -= dmg;
            if (enemyHP <= 0) break;
            if (chosen.rootChance && Math.random() < clamp(chosen.rootChance + incR, 0, 0.95)) {
              let ra = 1 + (eb.rootBonus||0);
              if (hasP('nature_stay_rooted')) ra++;
              rootStacks += ra;
            }
          }
        }
      }
      if (enemyHP <= 0) break;
    } // end actions

    // Tick CDs
    for (const s of spells) if ((cds[s.id]||0) > 0) cds[s.id]--;
    if (enemyHP <= 0) break;

    // ── ENEMY ATTACKS ─────────────────────────────────────────────────────
    const shockPct = clamp(shockStacks * (0.03 + (hasP('lightning_conduction') ? 0.02 : 0)), 0, 0.75);
    playerHP -= Math.max(0, Math.round(enemyDmgBase * (1 - shockPct)));
  }

  const won = enemyHP <= 0 && playerHP > 0;
  return { won, turns, hpLeft: won ? Math.max(0, playerHP) : 0 };
}

// ─── SIMULATE ONE FULL ZONE RUN ───────────────────────────────────────────────
function simulateRun(element, talentCfg, zone, strategy) {
  const gymIdx = zone - 1;
  const eb = talentCfg[element] || {};
  const maxHP = BASE_HP + talentCfg.hpBonus;

  // Init player
  const player = {
    element,
    ap:  talentCfg.ap,
    efx: talentCfg.efx,
    eb,
    maxHP,
    hp:  maxHP,
    spells:   [],
    passives: [],
  };

  // Start with one starter spell (level 1 = dim)
  const starterPool = SPELL_POOLS[element].primary;
  player.spells.push({...starterPool[0], incLevel:1});

  const isZone1 = zone === 1;
  const BATTLES = 12;
  let battlesWon = 0;
  // Track build snapshots (early/mid/late)
  let buildEarly  = null;  // after battle 3
  let buildMid    = null;  // after battle 7
  let buildLate   = null;  // after battle 11

  for (let b = 1; b <= BATTLES; b++) {
    const enemy = scaleEnemy(rnd(ENEMY_POOL), gymIdx);
    const result = simulateBattle(player, enemy);

    if (!result.won) {
      return { won: false, battlesWon, hpAtEnd: 0,
               buildEarly, buildMid, buildLate,
               diedAtBattle: b, spellCount: player.spells.length,
               passiveCount: player.passives.length };
    }

    battlesWon++;
    player.hp = Math.min(maxHP, result.hpLeft + BATTLE_HEAL);

    // Reward phase
    const rewardType = rewardForBattle(b, isZone1);
    pickReward(rewardType, player, element, strategy);

    if (b === 3)  buildEarly = {spells:[...player.spells.map(s=>s.id)], passives:[...player.passives]};
    if (b === 7)  buildMid   = {spells:[...player.spells.map(s=>s.id)], passives:[...player.passives]};
    if (b === 11) buildLate  = {spells:[...player.spells.map(s=>s.id)], passives:[...player.passives]};
  }

  // Gym boss — full heal before
  player.hp = maxHP;
  const boss = gymEnemy(element, gymIdx);
  const gymResult = simulateBattle(player, boss);

  return {
    won: gymResult.won,
    battlesWon: gymResult.won ? BATTLES + 1 : BATTLES,
    hpAtEnd: gymResult.won ? gymResult.hpLeft : 0,
    gymTurns: gymResult.turns,
    buildEarly, buildMid, buildLate,
    finalSpells:  player.spells.map(s=>s.id),
    finalPassives: player.passives,
    spellCount: player.spells.length,
    passiveCount: player.passives.length,
  };
}

// ─── MAIN SIMULATION ──────────────────────────────────────────────────────────
const ELEMENTS   = ['Fire','Lightning','Nature'];
const STRATEGIES = ['random','smart'];

// Bucket: element → strategy → talentLevel → zone → stats
const RES = {};
for (const el of ELEMENTS) {
  RES[el] = {};
  for (const strat of STRATEGIES) {
    RES[el][strat] = {};
    for (const t of TALENT_CFGS) {
      RES[el][strat][t.level] = {};
      for (const z of ZONES) {
        RES[el][strat][t.level][z] = {
          wins:0, total:0, gymTurns:0, hpAtEnd:0,
          battlesWonSum:0, spellCountSum:0, passiveCountSum:0,
          diedAt: Array(14).fill(0),  // which battle they died at
        };
      }
    }
  }
}

const combos = ELEMENTS.length * STRATEGIES.length * TALENT_CFGS.length * ZONES.length;
const perCombo = Math.floor(N_RUNS / combos);
const totalRuns = perCombo * combos;

const startMs = Date.now();
process.stderr.write(`Running ${totalRuns.toLocaleString()} full-zone runs (${perCombo}/combo × ${combos} combos)...\n`);

for (const el of ELEMENTS) {
  for (const strat of STRATEGIES) {
    for (const t of TALENT_CFGS) {
      for (const z of ZONES) {
        const bucket = RES[el][strat][t.level][z];
        for (let i = 0; i < perCombo; i++) {
          const r = simulateRun(el, t, z, strat);
          bucket.total++;
          if (r.won) {
            bucket.wins++;
            bucket.gymTurns += r.gymTurns || 0;
            bucket.hpAtEnd  += r.hpAtEnd  || 0;
          } else if (r.diedAtBattle) {
            bucket.diedAt[r.diedAtBattle]++;
          }
          bucket.battlesWonSum  += r.battlesWon || 0;
          bucket.spellCountSum  += r.spellCount  || 0;
          bucket.passiveCountSum += r.passiveCount || 0;
        }
      }
    }
  }
}

const elapsed = ((Date.now() - startMs)/1000).toFixed(1);
process.stderr.write(`Done in ${elapsed}s\n\n`);

// ─── REPORT ───────────────────────────────────────────────────────────────────
const SEP  = '═'.repeat(84);
const SEP2 = '─'.repeat(84);
function pct(w,t) { return t ? (w/t*100).toFixed(1) : '0.0'; }
function bar(w,t,W=25) {
  const n = t ? Math.round(w/t*W) : 0;
  return '█'.repeat(n)+'░'.repeat(W-n);
}

console.log(SEP);
console.log('  WIZARD LEAGUE — Full Run Simulation Report (1M Runs)');
console.log('  Each run: 12 battles + gym boss. Build grows through reward picks.');
console.log('  Start: 1 starter spell. Earn spells/passives as rewards each zone.');
console.log(`  Strategies: "random" = random picks | "smart" = priority-based picks`);
console.log(SEP);

// ── 1. OVERALL BY ELEMENT + STRATEGY ──────────────────────────────────────────
console.log('\n[1] OVERALL RUN WIN RATE — by element and pick strategy (all zones & talent levels)');
console.log(SEP2);
for (const el of ELEMENTS) {
  for (const strat of STRATEGIES) {
    let w=0,t=0;
    for (const tv of TALENT_CFGS) for (const z of ZONES) {
      const b = RES[el][strat][tv.level][z]; w+=b.wins; t+=b.total;
    }
    console.log(`  ${el.padEnd(12)} ${strat.padEnd(7)} ${pct(w,t).padStart(5)}%  ${bar(w,t)}`);
  }
  console.log();
}

// ── 2. WIN RATE BY ZONE (random strategy, all talent levels) ──────────────────
console.log('[2] WIN RATE BY ZONE — random picks, all talent levels');
console.log(SEP2);
process.stdout.write('  ' + 'Zone'.padEnd(7));
for (const el of ELEMENTS) process.stdout.write(el.padEnd(18));
console.log();
for (const z of ZONES) {
  process.stdout.write(`  Z${z}     `);
  for (const el of ELEMENTS) {
    let w=0,t=0;
    for (const tv of TALENT_CFGS) { const b=RES[el].random[tv.level][z]; w+=b.wins; t+=b.total; }
    process.stdout.write(`${pct(w,t).padStart(5)}%            `);
  }
  console.log();
}

// ── 3. TALENT SCALING — most important section ────────────────────────────────
console.log('\n[3] TALENT SCALING IMPACT (random picks) — zone-averaged win rate');
console.log(SEP2);
console.log('  ' + 'Element'.padEnd(14) + TALENT_CFGS.map(t=>`${t.label}(Lv${t.level})`).join('  '));
for (const el of ELEMENTS) {
  process.stdout.write('  ' + el.padEnd(14));
  for (const tv of TALENT_CFGS) {
    let w=0,t=0;
    for (const z of ZONES) { const b=RES[el].random[tv.level][z]; w+=b.wins; t+=b.total; }
    process.stdout.write(`${pct(w,t).padStart(5)}%        `);
  }
  const lv0 = (() => { let w=0,t=0; for(const z of ZONES){const b=RES[el].random[0][z];w+=b.wins;t+=b.total;} return w/t; })();
  const lv3 = (() => { let w=0,t=0; for(const z of ZONES){const b=RES[el].random[3][z];w+=b.wins;t+=b.total;} return w/t; })();
  console.log(`  (+${((lv3-lv0)*100).toFixed(1)}pp from Lv0→Lv3)`);
}

// ── 4. ZONE 5 DEEP DIVE (hardest zone) ────────────────────────────────────────
console.log('\n[4] ZONE 5 WIN RATE — hardest zone, by element × talent × strategy');
console.log(SEP2);
console.log('  ' + 'Element+Strategy'.padEnd(22) + TALENT_CFGS.map(t=>t.label.padEnd(14)).join(''));
for (const el of ELEMENTS) {
  for (const strat of STRATEGIES) {
    process.stdout.write(`  ${el} ${strat.padEnd(8)}           `);
    for (const tv of TALENT_CFGS) {
      const b = RES[el][strat][tv.level][5];
      const p = parseFloat(pct(b.wins,b.total));
      const mark = p>=80?'✓':p>=50?'~':'✗';
      process.stdout.write(`${pct(b.wins,b.total).padStart(5)}%${mark}        `);
    }
    console.log();
  }
}

// ── 5. BUILD PROGRESSION — spell/passive count by zone ────────────────────────
console.log('\n[5] AVERAGE BUILD SIZE AT END OF ZONE (surviving runs, random picks)');
console.log(SEP2);
console.log('  "End of zone" = after 12 battles + gym, includes gym rewards');
for (const z of ZONES) {
  process.stdout.write(`  Zone ${z}: `);
  for (const el of ELEMENTS) {
    let spells=0, passives=0, t=0;
    for (const tv of TALENT_CFGS) {
      const b = RES[el].random[tv.level][z];
      t += b.wins;
      spells   += b.spellCountSum / b.total * b.wins;   // rough weighted avg
      passives += b.passiveCountSum / b.total * b.wins;
    }
    const avgS = t>0?(spells/t).toFixed(1):'—';
    const avgP = t>0?(passives/t).toFixed(1):'—';
    process.stdout.write(`${el}: ${avgS}sp/${avgP}pa  `);
  }
  console.log();
}

// ── 6. WHERE RUNS DIE — death distribution ────────────────────────────────────
console.log('\n[6] WHERE RUNS END IN FAILURE (battle number of death) — Novice, Zone 5');
console.log(SEP2);
for (const el of ELEMENTS) {
  const b = RES[el].random[0][5];
  const losses = b.total - b.wins;
  if (!losses) { console.log(`  ${el}: No losses at Novice Z5`); continue; }
  process.stdout.write(`  ${el} (${((1-b.wins/b.total)*100).toFixed(0)}% lose): `);
  for (let d=1; d<=13; d++) {
    if (b.diedAt[d]) process.stdout.write(`B${d}:${((b.diedAt[d]/losses)*100).toFixed(0)}%  `);
  }
  console.log();
}

// ── 7. SMART vs RANDOM PICK BENEFIT ──────────────────────────────────────────
console.log('\n[7] SMART PICKS vs RANDOM PICKS — win rate gain from optimal choices');
console.log(SEP2);
for (const el of ELEMENTS) {
  for (const z of ZONES) {
    let rw=0,rt=0,sw=0,st=0;
    for (const tv of TALENT_CFGS) {
      const rb = RES[el].random[tv.level][z]; rw+=rb.wins; rt+=rb.total;
      const sb = RES[el].smart[tv.level][z];  sw+=sb.wins; st+=sb.total;
    }
    if (z===5 || z===1) {
      const rPct = rw/rt*100, sPct = sw/st*100;
      const gain = sPct - rPct;
      process.stdout.write(`  ${el} Z${z}: random ${rPct.toFixed(1)}%  smart ${sPct.toFixed(1)}%  gain:${gain>=0?'+':''}${gain.toFixed(1)}pp  `);
      console.log();
    }
  }
}

// ── 8. ELEMENT HEATMAP — zone × talent (random picks) ────────────────────────
console.log('\n[8] WIN % HEATMAP (random picks) — zone × talent level');
console.log('    ▓▓▓▓=80%+  ▒▒▒▒=60-80%  ░░░░=40-60%  ····=<40%');
for (const el of ELEMENTS) {
  console.log(`\n  ${el}`);
  process.stdout.write('  ' + '      ');
  for (const tv of TALENT_CFGS) process.stdout.write(tv.label.padEnd(16));
  console.log();
  for (const z of ZONES) {
    process.stdout.write(`    Z${z}  `);
    for (const tv of TALENT_CFGS) {
      const b = RES[el].random[tv.level][z];
      const p = parseFloat(pct(b.wins,b.total));
      const tile = p>=80?'▓▓▓▓':p>=60?'▒▒▒▒':p>=40?'░░░░':'····';
      process.stdout.write(`${pct(b.wins,b.total).padStart(5)}%${tile}  `);
    }
    console.log();
  }
}

// ── 9. GYM BOSS PERFORMANCE ───────────────────────────────────────────────────
console.log('\n[9] GYM BOSS PERFORMANCE (avg turns to kill, among winning runs)');
console.log(SEP2);
for (const el of ELEMENTS) {
  process.stdout.write(`  ${el.padEnd(12)}`);
  for (const z of ZONES) {
    let w=0, gT=0;
    for (const tv of TALENT_CFGS) {
      const b=RES[el].random[tv.level][z]; w+=b.wins; gT+=b.gymTurns;
    }
    const avgT = w>0?(gT/w).toFixed(1):'—';
    process.stdout.write(`Z${z}:${avgT}t  `);
  }
  console.log();
}

// ── 10. SUMMARY TABLE ─────────────────────────────────────────────────────────
console.log('\n[10] SUMMARY — overall win rate, best zone to start, talent cliff');
console.log(SEP2);
for (const el of ELEMENTS) {
  // Overall win rate (random, all)
  let w=0,t=0;
  for (const strat of STRATEGIES) for (const tv of TALENT_CFGS) for (const z of ZONES) {
    const b=RES[el][strat][tv.level][z]; w+=b.wins; t+=b.total;
  }
  const overall = pct(w,t);

  // Talent cliff: first talent level where Z5 goes above 70%
  let cliff = 'never';
  for (const tv of TALENT_CFGS) {
    const b = RES[el].random[tv.level][5];
    if (b.wins/b.total >= 0.70) { cliff = tv.label; break; }
  }

  // Best zone (highest win rate, random picks)
  let bestZ=1, bestPct=0;
  for (const z of ZONES) {
    let zw=0,zt=0; for (const tv of TALENT_CFGS) { const b=RES[el].random[tv.level][z]; zw+=b.wins; zt+=b.total; }
    if (zw/zt > bestPct) { bestPct=zw/zt; bestZ=z; }
  }

  console.log(`  ${el.padEnd(12)} Overall:${overall.padStart(5)}%  Easiest zone: Z${bestZ}(${(bestPct*100).toFixed(0)}%)  Z5 reliable at: ${cliff}`);
}

console.log('\n' + SEP);
console.log('  END OF REPORT');
console.log(SEP);
