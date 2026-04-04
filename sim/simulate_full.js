'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD LEAGUE — Full Simulation (All Spells, All Passives, All Variants)
// Uses exact values from spells.js + passives.js
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_HP     = 200;
const BATTLE_HEAL = 10;
const MAX_TURNS   = 60;
const N_RUNS      = 1_000_000;
const ZONES       = [1,2,3,4,5];
const ELEMENTS    = ['Fire','Lightning','Nature'];
const STRATEGIES  = ['random','smart'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function incB(lvl, scale, decay) {
  let b = 0;
  for (let i = 0; i < Math.max(0, lvl-1); i++) b += scale * Math.pow(decay, i);
  return b;
}
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
function rnd(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function pickN(arr, n) {
  const c=[...arr], o=[];
  for(let i=0;i<n&&c.length;i++) o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]);
  return o;
}

// ─── ENEMY POOL ───────────────────────────────────────────────────────────────
const ENEMY_POOL = [
  {hp:95,  dmg:22},{hp:110,dmg:20},{hp:130,dmg:18},  // Fire
  {hp:85,  dmg:26},{hp:100,dmg:24},{hp:110,dmg:22},  // Lightning
  {hp:95,  dmg:20},{hp:120,dmg:18},{hp:135,dmg:16},  // Nature
  {hp:90,  dmg:20},{hp:115,dmg:18},{hp:100,dmg:24},  // Water
  {hp:95,  dmg:22},{hp:125,dmg:18},                  // Ice
  {hp:120, dmg:18},{hp:145,dmg:16},{hp:110,dmg:22},  // Earth
  {hp:90,  dmg:26},{hp:85, dmg:28},                  // Plasma
  {hp:80,  dmg:28},{hp:90, dmg:26},                  // Air
];
const GYM = { Fire:{hp:280,dmg:28}, Lightning:{hp:260,dmg:32}, Nature:{hp:300,dmg:26} };
function scaleEnemy(enc, gymIdx) {
  return {
    hp:  Math.round(enc.hp  * (1 + gymIdx*0.28) * 0.70),
    dmg: Math.max(1, Math.round(enc.dmg * (1+gymIdx*0.22)) - 5),
    ap:  Math.floor(gymIdx * 4.4),
    armor: 0,
  };
}
function gymEnemy(el, gymIdx) {
  const g = GYM[el] || {hp:270,dmg:28};
  return { hp:Math.round(g.hp*(1+gymIdx*0.30)), dmg:Math.max(1,Math.round(g.dmg*(1+gymIdx*0.20))-3), ap:Math.floor(gymIdx*5+8), armor:0 };
}

// ─── ALL SPELLS (values from spells.js) ───────────────────────────────────────
// type: 'burn'|'melt'|'shock'|'surge'|'root'|'seed'|'direct'|'utility'
// apMult: fraction of player AP added as bonus (default 1.0 for most)
// All incantation bonuses use the spell's incLevel (set when rewarded)

const ALL_SPELLS = {
  // ── FIRE / BURN ─────────────────────────────────────────────────────────────
  ignite:      { el:'Fire', tier:'primary', cd:1,  starter:true,
    type:'burn', baseDmg:5, hits:1, burnBase:15, burnS:3,  burnD:0.90 },
  ember_storm: { el:'Fire', tier:'primary', cd:2,
    type:'burn', baseDmg:5, hits:3, burnBase:3,  burnS:1,  burnD:0.90 },
  flame_wave:  { el:'Fire', tier:'primary', cd:2,
    type:'burn', baseDmg:10,hits:1, burnBase:5,  burnS:1,  burnD:0.90 },
  firewall:    { el:'Fire', tier:'primary', cd:1,
    type:'burn', baseDmg:0, hits:1, burnBase:4,  burnS:1,  burnD:0.90 },  // also grants player pseudo-block
  // Fire/Melt primaries
  melt_strike: { el:'Fire', tier:'primary', cd:1,
    type:'melt', baseDmg:0, hits:1, meltBase:12, meltS:3,  meltD:0.90, apMult:0.5 },
  forge_blast: { el:'Fire', tier:'primary', cd:2,
    type:'melt', baseDmg:0, hits:1, meltBase:8,  meltS:2,  meltD:0.90, burnBase:8,  burnS:2,  burnD:0.90 },
  slag:        { el:'Fire', tier:'primary', cd:1,
    type:'melt', baseDmg:0, hits:1, meltBase:6,  meltS:2,  meltD:0.90, apMult:0.5 },
  heat_surge:  { el:'Fire', tier:'primary', cd:3,
    type:'melt', baseDmg:0, hits:1, meltBase:16, meltS:3,  meltD:0.90, apMult:0.5, healOnMelt:0.5 },
  // Fire secondaries
  grease_fire: { el:'Fire', tier:'secondary', cd:1,
    type:'burn', baseDmg:0, hits:1, burnBase:4,  burnS:1,  burnD:0.90, doubleBurnTick:true },
  extinguish:  { el:'Fire', tier:'secondary', cd:2,
    type:'burn', baseDmg:0, hits:1, burnTrigger:true, burnConvertMult:2.0 },
  fire_heal:   { el:'Fire', tier:'secondary', cd:2,
    type:'utility', baseDmg:0, healFromBurn:true, healBurnScale:1.0, healBurnS:1, healBurnD:0.90 },
  fire_rage:   { el:'Fire', tier:'secondary', cd:5,
    type:'utility', baseDmg:0, ragePowerFromBurn:true },
  smelt:       { el:'Fire', tier:'secondary', cd:2,
    type:'melt', baseDmg:0, hits:1, meltBase:8,  meltS:2,  meltD:0.90, apMult:0.5, burnToMelt:true },
  melt_down:   { el:'Fire', tier:'secondary', cd:3,
    type:'melt', baseDmg:0, hits:1, forceBreakArmor:true },

  // ── LIGHTNING / SHOCK ──────────────────────────────────────────────────────
  zap:          { el:'Lightning', tier:'primary', cd:0, starter:true,
    type:'shock', baseDmg:25, hits:1, shockBase:2.0, shockS:0.4,  shockD:0.90, apBonus:'tenth' }, // +floor(AP/10) to baseDmg
  chain:        { el:'Lightning', tier:'primary', cd:2,
    type:'shock', baseDmg:11, hits:4, shockBase:1.0, shockS:0.5,  shockD:1.00, apMult:1.25, hitsScale:true },
  overcharge:   { el:'Lightning', tier:'primary', cd:2,
    type:'shock', baseDmg:0,  hits:1, shockBase:3.0, shockS:1.0,  shockD:0.90, powerBoost:30 },
  thunder_strike:{ el:'Lightning', tier:'primary', cd:2,
    type:'shock', baseDmg:35, hits:1, shockBase:2.0, shockS:0.5,  shockD:0.90 },
  // Lightning/Surge primaries
  bolt:         { el:'Lightning', tier:'primary', cd:1,
    type:'surge', baseDmg:15, hits:1, surgeLoad:25,  surgeS:4,    surgeD:0.90 },
  ball_lightning:{ el:'Lightning', tier:'primary', cd:2,
    type:'surge', baseDmg:10, hits:1, surgeLoad:20,  surgeS:3,    surgeD:0.90 },
  static_charge:{ el:'Lightning', tier:'primary', cd:1,
    type:'surge', baseDmg:0,  hits:1, surgeLoad:60,  surgeS:8,    surgeD:0.90 },
  megavolt:     { el:'Lightning', tier:'primary', cd:3,
    type:'shock', baseDmg:50, hits:1, shockBase:0,   shockS:0,    shockD:1.0,  surgeScale:8, surgeD:0.90 },
  // Lightning secondaries
  blitz:        { el:'Lightning', tier:'secondary', cd:2,
    type:'shock', baseDmg:0,  shockDetonate:true },
  electrocute:  { el:'Lightning', tier:'secondary', cd:3,
    type:'shock', baseDmg:0,  shockMult:2.0, selfDmg:10 },
  feedback:     { el:'Lightning', tier:'secondary', cd:2,
    type:'shock', baseDmg:0,  hits:1, shockBase:2.0, shockS:1.0, shockD:0.90, selfDmg:5, powerBoost:15 },
  supercharge:  { el:'Lightning', tier:'secondary', cd:3,
    type:'surge', baseDmg:0,  surgeLoad:80,  surgeS:5,  surgeD:0.90 },
  overclock:    { el:'Lightning', tier:'secondary', cd:3,
    type:'surge', baseDmg:0,  surgeDoubleCurrent:true },
  detonator:    { el:'Lightning', tier:'secondary', cd:4,
    type:'surge', baseDmg:0,  triggerSurge:true },

  // ── NATURE / ROOT+VINE ─────────────────────────────────────────────────────
  vine_strike:  { el:'Nature', tier:'primary', cd:0, starter:true,
    type:'root', baseDmg:5, hits:3, rootChance:0.50, rootS:0.05, rootD:0.90, apMult:0.75 },
  thornwall:    { el:'Nature', tier:'primary', cd:2,
    type:'root', baseDmg:0, hits:1, giveArmor:30, rootBase:2, rootS:1, rootD:1.00 },
  bramble_burst:{ el:'Nature', tier:'primary', cd:1,
    type:'root', baseDmg:10,hits:1, rootChance:0.50, rootS:0.05, rootD:0.90 },
  // Nature/Seed primaries
  damage_seed:  { el:'Nature', tier:'primary', cd:1,
    type:'seed', baseDmg:0, seedType:'damage', seedTimer:3 },
  root_seed:    { el:'Nature', tier:'primary', cd:1,
    type:'seed', baseDmg:0, seedType:'root',   seedTimer:3 },
  healing_seed: { el:'Nature', tier:'primary', cd:2,
    type:'seed', baseDmg:0, seedType:'healing', seedTimer:3 },
  // Nature secondaries
  wild_growth:      { el:'Nature', tier:'secondary', cd:3, type:'root', baseDmg:0, rootMult:2.0 },
  spreading_vines:  { el:'Nature', tier:'secondary', cd:4, type:'root', baseDmg:0, rootOverTime:3 },
  natures_wrath:    { el:'Nature', tier:'secondary', cd:4, type:'root', baseDmg:0, consumeRootDmg:20, consumeRootS:4, consumeRootD:0.90 },
  accelerate:       { el:'Nature', tier:'secondary', cd:1, type:'seed', baseDmg:0, seedAccel:1 },
  seed_surge:       { el:'Nature', tier:'secondary', cd:3, type:'seed', baseDmg:0, seedSurgePrimed:true },
};

// Build pool lists
const SPELL_POOLS = { Fire:{primary:[],secondary:[]}, Lightning:{primary:[],secondary:[]}, Nature:{primary:[],secondary:[]} };
for (const [id, s] of Object.entries(ALL_SPELLS)) {
  if (SPELL_POOLS[s.el]) SPELL_POOLS[s.el][s.tier === 'secondary' ? 'secondary' : 'primary'].push({...s, id});
}

// ─── ALL PASSIVES ─────────────────────────────────────────────────────────────
const PASSIVE_POOLS = {
  Fire: {
    normal: ['fire_pyromaniac','fire_combustion','fire_blazing_heat','fire_wildfire',
             'fire_forge_master','fire_iron_burn','fire_slag_trail','fire_armor_eater','fire_deep_heat'],
    legendary: ['fire_roaring_heat','fire_eternal_flame','fire_meltdown'],
  },
  Lightning: {
    normal: ['lightning_conduction','lightning_double','lightning_static','lightning_overload',
             'lightning_hair_trigger','lightning_overcharged','lightning_chain_surge',
             'lightning_static_build','lightning_live_wire','lightning_conductivity'],
    legendary: ['lightning_superconductor','lightning_cascade','lightning_storm_core','lightning_amplified'],
  },
  Nature: {
    normal: ['nature_overgrowth','nature_stay_rooted','nature_thorned_strikes','nature_bramble_guard',
             'nature_perennial','nature_deep_roots','nature_thorn_bloom','nature_verdant_patience','nature_patient_bloom'],
    legendary: ['nature_verdant_legion','nature_eternal_garden','nature_rooted_bloom'],
  },
};

// Smart pick priority (most impactful first, based on design)
const PASSIVE_PRIORITY = {
  Fire:      ['fire_pyromaniac','fire_roaring_heat','fire_combustion','fire_blazing_heat','fire_wildfire',
              'fire_forge_master','fire_iron_burn','fire_meltdown','fire_eternal_flame','fire_slag_trail','fire_armor_eater','fire_deep_heat'],
  Lightning: ['lightning_overload','lightning_double','lightning_static','lightning_conduction',
              'lightning_cascade','lightning_hair_trigger','lightning_chain_surge','lightning_amplified',
              'lightning_overcharged','lightning_conductivity','lightning_live_wire','lightning_static_build','lightning_storm_core','lightning_superconductor'],
  Nature:    ['nature_thorned_strikes','nature_stay_rooted','nature_rooted_bloom','nature_overgrowth',
              'nature_perennial','nature_patient_bloom','nature_bramble_guard','nature_eternal_garden','nature_thorn_bloom',
              'nature_deep_roots','nature_verdant_patience','nature_verdant_legion'],
};
const SPELL_PRIORITY = {
  Fire:      ['ignite','melt_strike','forge_blast','ember_storm','flame_wave','grease_fire','slag','heat_surge','smelt','melt_down','fire_heal','fire_rage','extinguish','firewall'],
  Lightning: ['zap','thunder_strike','bolt','chain','static_charge','megavolt','ball_lightning','overcharge','blitz','supercharge','detonator','overclock','feedback','electrocute'],
  Nature:    ['vine_strike','bramble_burst','thornwall','damage_seed','root_seed','natures_wrath','wild_growth','accelerate','spreading_vines','seed_surge','healing_seed'],
};

// ─── TALENT CONFIGS ───────────────────────────────────────────────────────────
const TALENT_CFGS = [
  { level:0, label:'Novice',     ap:0,  efx:0,  hpB:0,
    Fire:{burnDmg:0,   smult:1.00,burnStart:0},
    Lightning:{shockBonus:0,   smult:1.00,oFloor:0.25},
    Nature:{rootBonus:0,   smult:1.00} },
  { level:1, label:'Apprentice', ap:3,  efx:3,  hpB:15,
    Fire:{burnDmg:0.1, smult:1.00,burnStart:2},
    Lightning:{shockBonus:0.5, smult:1.00,oFloor:0.35},
    Nature:{rootBonus:0.5, smult:1.00} },
  { level:2, label:'Adept',      ap:9,  efx:9,  hpB:30,
    Fire:{burnDmg:0.3, smult:1.10,burnStart:6},
    Lightning:{shockBonus:1.0, smult:1.10,oFloor:0.45},
    Nature:{rootBonus:1.0, smult:1.10} },
  { level:3, label:'Master',     ap:18, efx:18, hpB:60,
    Fire:{burnDmg:0.5, smult:1.20,burnStart:10},
    Lightning:{shockBonus:1.5, smult:1.20,oFloor:0.55},
    Nature:{rootBonus:1.5, smult:1.20} },
];

// ─── REWARD SCHEDULE ──────────────────────────────────────────────────────────
function rewardType(battleNum, isZone1) {
  const spellB = isZone1 ? [1,4,7,10] : [2,5,8,11];
  return spellB.includes(battleNum) ? 'spell' : 'passive';
}

function pickReward(kind, player, el, strategy) {
  const owned = new Set(player.spells.map(s=>s.id));
  const ownedP = new Set(player.passives);

  if (kind === 'spell') {
    const allPool = [...SPELL_POOLS[el].primary, ...SPELL_POOLS[el].secondary].filter(s=>!owned.has(s.id));
    if (!allPool.length) return;
    let choices = pickN(allPool, 3);
    if (!choices.length) choices = [rnd(allPool)];
    let chosen;
    if (strategy === 'smart') {
      const prio = SPELL_PRIORITY[el] || [];
      chosen = prio.map(id=>choices.find(c=>c.id===id)).find(Boolean) || choices[0];
    } else {
      chosen = rnd(choices);
    }
    const ir = Math.random();
    const iLvl = ir<0.50?1:ir<0.80?2:ir<0.95?3:4;
    player.spells.push({...chosen, incLevel:iLvl});

  } else {
    // ~15% chance for +5 Defense stat reward instead of passive
    if (Math.random() < 0.15) { player.defense = (player.defense||0) + 5; return; }
    // passive
    const normPool = PASSIVE_POOLS[el].normal.filter(id=>!ownedP.has(id));
    if (!normPool.length) return;
    let choices = pickN(normPool, 3);
    if (!choices.length) choices = [rnd(normPool)];
    let chosen;
    if (strategy === 'smart') {
      const prio = PASSIVE_PRIORITY[el] || [];
      chosen = prio.find(id=>choices.includes(id)) || choices[0];
    } else {
      chosen = rnd(choices);
    }
    player.passives.push(chosen);
  }
}

function grantGymRewards(player, el, strategy) {
  pickReward('passive', player, el, strategy);
  const secPool = SPELL_POOLS[el].secondary.filter(s=>!player.spells.find(x=>x.id===s.id));
  if (secPool.length) {
    const iLvl = Math.random()<0.5?2:Math.random()<0.8?3:4;
    const s = strategy==='smart'
      ? (SPELL_PRIORITY[el].map(id=>secPool.find(x=>x.id===id)).find(Boolean) || rnd(secPool))
      : rnd(secPool);
    player.spells.push({...s, incLevel:iLvl});
  }
  const legPool = PASSIVE_POOLS[el].legendary.filter(id=>!player.passives.includes(id));
  if (legPool.length) {
    const prio = PASSIVE_PRIORITY[el] || [];
    player.passives.push(strategy==='smart'
      ? (prio.find(id=>legPool.includes(id)) || rnd(legPool))
      : rnd(legPool));
  }
}

// ─── BATTLE SIMULATION ────────────────────────────────────────────────────────
function simulateBattle(player, enemy) {
  const el   = player.element;
  const ap0  = player.ap;
  const efx0 = player.efx;
  const eb   = player.eb;
  const sm   = eb.smult || 1.0;
  const hasP = id => player.passives.includes(id);
  const spells = player.spells;

  let pHP  = player.hp;
  let eHP  = enemy.hp;
  const playerDef = player.defense || 0;
  let eAP  = Math.max(0, enemy.ap - playerDef);   // Defense reduces enemy AP
  const eDmgBase = enemy.dmg + Math.floor(eAP * 0.3);

  // Enemy status
  let burnStacks   = eb.burnStart || 0;
  let shockStacks  = 0;
  let rootStacks   = 0;
  let ovStacks     = 0;   // overgrowth
  let surgeLoaded  = 0;   // pending surge damage on enemy
  let surgeStaticBuild = 0; // static_build bonus

  // Player status
  let block = 0;
  let tempPow = 0;  // power boost next turn (overcharge, feedback)
  let ragePow = 0;  // fire rage AP bonus

  // Cooldowns
  const cds = {};
  for (const s of spells) cds[s.id] = 0;

  let dynAP = ap0;
  let overloadMult = 2.0;
  const surgeThresh = hasP('lightning_hair_trigger') ? 50 : 60;
  let seedSurgePrimed = false;

  // Seeds on enemy
  let seeds = [];

  let turns = 0;

  while (pHP > 0 && eHP > 0 && turns < MAX_TURNS) {
    turns++;

    // ── START OF TURN ──────────────────────────────────────────────────────
    if (el === 'Lightning' && hasP('lightning_overload')) overloadMult = 2.0;

    // Wildfire
    if (el === 'Fire' && hasP('fire_wildfire') && burnStacks > 0 && Math.random() < 0.33)
      burnStacks = Math.min(burnStacks * 2, 1200);

    // Static Build: +20 dmg to surge value each turn it's active without triggering
    if (el === 'Lightning' && hasP('lightning_static_build') && surgeLoaded > 0) {
      surgeLoaded += 20;
      surgeStaticBuild++;
    }

    // Burn tick
    if (burnStacks > 0) {
      const perSt = (hasP('fire_roaring_heat') ? 1.5 : 1.0) + efx0/100 + (eb.burnDmg||0);
      eHP -= Math.ceil(burnStacks * perSt);
      if (eHP <= 0) break;
    }

    // Shock decay 25%
    shockStacks = Math.floor(shockStacks * 0.75);

    // Root decay → overgrowth
    if (rootStacks > 0) {
      if (hasP('nature_overgrowth')) ovStacks++;
      rootStacks = Math.max(0, rootStacks - 1);
    }

    // Conductivity: each shock → 2 dmg toward surge meter
    if (el === 'Lightning' && hasP('lightning_conductivity') && shockStacks > 0) {
      surgeLoaded += shockStacks * 2;
    }

    // AP calculation
    if (el === 'Fire' && hasP('fire_blazing_heat')) dynAP = ap0 + Math.floor(burnStacks / 2);
    else dynAP = ap0 + tempPow + ragePow;
    tempPow = 0;

    // Seeds bloom
    const bloomed = seeds.filter(s=>s.timer<=1);
    seeds = seeds.filter(s=>s.timer>1).map(s=>({...s,timer:s.timer-1}));
    const patientMult = hasP('nature_patient_bloom') ? 1.3 : 1;
    for (const sd of bloomed) {
      if (sd.type === 'damage') {
        const sdmg = Math.round((30 + efx0/2 + dynAP) * sm * patientMult);
        eHP -= sdmg;
        if (eHP<=0) break;
        if (hasP('nature_perennial')) seeds.push({type:'damage',timer:3});
        if (hasP('nature_thorn_bloom') && rootStacks>0) rootStacks += 2;
        if (hasP('nature_rooted_bloom')) rootStacks += sd.stacks||1;
        // Duo wildfire seeds
        if (hasP('duo_wildfire_seeds')) burnStacks += Math.floor(sdmg * 0.5);
      } else if (sd.type === 'root') {
        let ra = Math.floor(3 * patientMult); if(hasP('nature_stay_rooted')) ra++; if(hasP('nature_rooted_bloom')) ra++;
        rootStacks += ra * (sd.stacks||1);
        if (hasP('nature_perennial')) seeds.push({type:'root',timer:3});
      } else if (sd.type === 'healing') {
        pHP = Math.min(player.maxHP, pHP + Math.round(50 * patientMult));
        if (hasP('nature_perennial')) seeds.push({type:'healing',timer:3});
      }
    }
    if (eHP<=0) break;

    // ── PLAYER ACTIONS (2 per turn) ────────────────────────────────────────
    for (let act=0; act<2; act++) {
      let spell = null;
      for (const s of spells) { if ((cds[s.id]||0)===0) { spell=s; break; } }

      if (!spell) {
        // Basic attack
        const bd = Math.round((8 + dynAP) * sm);
        eHP -= bd;
        if (el==='Lightning') {
          surgeLoaded += bd * 0.3;
          if (hasP('lightning_overload')) overloadMult = Math.max(eb.oFloor||0.25, overloadMult-0.25);
        }
        if (eHP<=0) break;
        continue;
      }
      cds[spell.id] = spell.cd;
      const inc = spell.incLevel || 1;

      // ── FIRE ──────────────────────────────────────────────────────────────
      if (el === 'Fire') {
        // Melt calculation helper
        function doMelt(rawPts) {
          let pts = rawPts;
          if (hasP('fire_forge_master')) pts = Math.round(pts * 1.3);
          if (hasP('fire_deep_heat'))    pts += Math.floor(efx0 / 5);
          if (hasP('fire_iron_burn') && burnStacks>0) pts += Math.floor(burnStacks/3);
          // Enemy armor (simplified: enemies rarely have armor; model as 0)
          const hpDmg = Math.round(pts * sm);
          eHP -= hpDmg;
          if (hasP('fire_eternal_flame')) burnStacks += Math.floor(hpDmg * 0.5);
          return hpDmg;
        }

        if (spell.type === 'burn' && !spell.burnTrigger) {
          if ((spell.baseDmg||0)>0) {
            for (let h=0;h<(spell.hits||1);h++) eHP -= Math.round((spell.baseDmg + dynAP) * sm);
          }
          if (eHP<=0) break;
          if (spell.burnBase) {
            const bi = incB(inc, spell.burnS, spell.burnD);
            const mult = spell.doubleBurnTick ? 2 : 1;
            for (let h=0;h<(spell.hits||1);h++) {
              let nb = (spell.burnBase + bi) * 0.75 + Math.floor(efx0*0.2);
              if (hasP('fire_pyromaniac')) nb += 3 * 0.75;
              if (hasP('fire_combustion')) nb += (1 + Math.floor(burnStacks/5)) * 0.75;
              burnStacks += Math.round(nb * mult);
            }
          }
        } else if (spell.type === 'melt') {
          if (spell.burnToMelt) {
            const bonus = Math.floor(burnStacks / 3);
            const pts = Math.floor(spell.meltBase + incB(inc,spell.meltS,spell.meltD) + dynAP*(spell.apMult||0.5)) + bonus;
            const hd = doMelt(pts);
            if (spell.healOnMelt && hd>0) pHP = Math.min(player.maxHP, pHP + Math.floor(hd * spell.healOnMelt));
          } else if (spell.forceBreakArmor) {
            // melt_down: deal armor * 1.5 as melt (no real armor, so flat bonus)
            doMelt(Math.round(15 + incB(inc,2,0.9) + dynAP*0.5));
          } else {
            const pts = Math.floor((spell.meltBase||0) + incB(inc,(spell.meltS||0),(spell.meltD||0.9)) + dynAP*(spell.apMult||0.5));
            const hd = doMelt(pts);
            if (spell.burnBase) {
              const bi2 = incB(inc, spell.burnS||0, spell.burnD||0.9);
              burnStacks += Math.round(((spell.burnBase + bi2)*0.75));
            }
            if (spell.healOnMelt && hd>0) pHP = Math.min(player.maxHP, pHP + Math.floor(hd * spell.healOnMelt));
          }
        } else if (spell.burnTrigger) {
          // extinguish: trigger burn tick + consume half → damage
          const triggered = Math.ceil(burnStacks * ((hasP('fire_roaring_heat')?1.5:1.0)+efx0/100+(eb.burnDmg||0)));
          eHP -= triggered;
          const consumed = Math.ceil(burnStacks/2);
          burnStacks -= consumed;
          const dmgMult = 2 + incB(inc, 1, 0.9);
          eHP -= Math.round(consumed * dmgMult + dynAP);
        } else if (spell.healFromBurn) {
          const totalBurn = burnStacks;
          const healPer = 1 + incB(inc, 1, 0.9);
          pHP = Math.min(player.maxHP, pHP + Math.max(1, Math.round(totalBurn * healPer)));
        } else if (spell.ragePowerFromBurn) {
          ragePow = Math.floor(burnStacks / 2);
        }
        if (hasP('lightning_overload')) overloadMult = Math.max(eb.oFloor||0.25, overloadMult-0.25);
      }

      // ── LIGHTNING ─────────────────────────────────────────────────────────
      else if (el === 'Lightning') {
        const oMult = hasP('lightning_overload') ? overloadMult : 1.0;

        if (spell.shockDetonate) {
          // blitz: shock stacks × ceil(AP/3) damage
          if (shockStacks > 0) {
            const perSt = Math.max(1, Math.ceil(dynAP/3)) + Math.round(incB(inc,2,0.95));
            const bd2 = shockStacks * perSt;
            eHP -= bd2;
            shockStacks = 0;
          }
        } else if (spell.shockMult) {
          // electrocute
          shockStacks = Math.round(shockStacks * spell.shockMult);
          pHP -= (spell.selfDmg||0);
        } else if (spell.surgeDoubleCurrent) {
          // overclock
          surgeLoaded *= 2;
        } else if (spell.triggerSurge) {
          // detonator
          if (surgeLoaded > 0) {
            eHP -= Math.round(surgeLoaded * sm);
            surgeLoaded = 0;
            if (hasP('lightning_chain_surge')) {
              const newSurge = 40; // reapply smaller surge
              surgeLoaded = newSurge;
            }
          }
        } else {
          // Normal hit spells (zap, chain, bolt, thunder_strike, static_charge, etc.)
          const hitCount = spell.hitsScale
            ? Math.round((spell.hits||4) + incB(inc, 1, 1.0))
            : (spell.hits||1);

          // Surge loading spells
          if ((spell.surgeLoad||0) > 0 || spell.surgeS) {
            const sv = Math.round((spell.surgeLoad||0) + incB(inc, spell.surgeS||0, spell.surgeD||0.9));
            surgeLoaded += sv;
            if (hasP('lightning_amplified')) surgeLoaded = Math.round(surgeLoaded * 1.0); // no prior surge yet in single fight model
          }

          // Direct damage hits
          for (let h=0; h<hitCount; h++) {
            let dmg = (spell.baseDmg||0);
            if (spell.apBonus === 'tenth') dmg += Math.floor(dynAP/10);
            dmg = Math.round((dmg + dynAP*(spell.apMult||1.0)) * sm * oMult);

            // Double Strike: "30% + 1% per 5 AP"
            if (hasP('lightning_double') && spell.baseDmg > 0) {
              const dChance = clamp(0.30 + dynAP/500, 0, 1.5);
              if (Math.random() < dChance) dmg = Math.round(dmg * (dChance >= 1.0 ? 3 : 2));
            }

            // Static Shock: "10% + 1% per 10 AP" of current enemy HP
            if (hasP('lightning_static') && eHP > 0 && spell.baseDmg > 0) {
              dmg += Math.round(eHP * clamp(0.10 + dynAP/1000, 0.10, 0.40));
            }

            // Superconductor: self dmg × 3 → enemy
            const sDmg = spell.selfDmg || 0;
            if (sDmg > 0) {
              if (hasP('lightning_superconductor')) { dmg += sDmg * 3; }
              else pHP -= sDmg;
            }

            eHP -= Math.max(0, dmg);

            // Shock application (from shock-type spells)
            if (spell.shockBase !== undefined) {
              const si = incB(inc, spell.shockS||0, spell.shockD||0.9);
              let ns = (spell.shockBase||0) + si + (eb.shockBonus||0);
              if (hasP('lightning_conduction')) ns += 1;
              shockStacks += ns;
              surgeLoaded += hasP('lightning_conductivity') ? ns*2 : dmg*0.35;
            } else if ((spell.surgeLoad||0)>0) {
              // Surge loaders still contribute some shock
              surgeLoaded += dmg * 0.2;
            }

            if (hasP('lightning_overload')) overloadMult = Math.max(eb.oFloor||0.25, overloadMult-0.25);
            if (eHP<=0) break;
          }

          // powerBoost (overcharge-style)
          if (spell.powerBoost) tempPow += spell.powerBoost;

          // Check surge trigger
          if (surgeLoaded >= surgeThresh) {
            let surgeDmg = Math.round(surgeLoaded * sm);
            eHP -= surgeDmg;
            surgeStaticBuild = 0;
            if (hasP('lightning_overcharged')) shockStacks += 3;
            if (hasP('lightning_cascade')) for (const s of spells) cds[s.id]=Math.max(0,(cds[s.id]||0)-1);
            if (hasP('lightning_chain_surge')) {
              surgeLoaded = surgeDmg * 0.5; // reapply 50% as new surge
            } else {
              surgeLoaded = 0;
            }
          }
        }
      }

      // ── NATURE ────────────────────────────────────────────────────────────
      else if (el === 'Nature') {
        if (spell.seedType) {
          // Plant seed
          const stacks = seedSurgePrimed ? 3 : 1;
          const baseTimer = (spell.seedTimer||3) + (hasP('nature_patient_bloom') ? 1 : 0);
          seeds.push({type:spell.seedType, timer:baseTimer, stacks});
          seedSurgePrimed = false;
        } else if (spell.seedAccel) {
          seeds = seeds.map(s=>({...s, timer:s.timer-1}));
          // Bloom any that hit 0
          const now = seeds.filter(s=>s.timer<=0);
          seeds = seeds.filter(s=>s.timer>0);
          for (const sd of now) {
            if (sd.type==='damage') eHP -= Math.round((30+efx0/2+dynAP)*sm*(sd.stacks||1));
            if (sd.type==='root') { let ra=3;if(hasP('nature_stay_rooted'))ra++;rootStacks+=ra*(sd.stacks||1); }
            if (sd.type==='healing') pHP=Math.min(player.maxHP,pHP+50*(sd.stacks||1));
            if (hasP('nature_perennial')) seeds.push({type:sd.type,timer:3,stacks:sd.stacks||1});
          }
        } else if (spell.seedSurgePrimed) {
          seedSurgePrimed = true;
        } else if (spell.consumeRootDmg) {
          // Nature's Wrath
          const total = rootStacks + ovStacks;
          const perSt = Math.round((spell.consumeRootDmg||20) + incB(inc, spell.consumeRootS||4, spell.consumeRootD||0.9));
          eHP -= Math.round((total * perSt + dynAP) * sm);
          rootStacks = 0; ovStacks = 0;
        } else if (spell.rootMult) {
          rootStacks = Math.round(rootStacks * spell.rootMult);
        } else if (spell.rootOverTime) {
          // Spreading Vines: apply root each turn for N turns (simplified as immediate roots)
          for (let t=0; t<(spell.rootOverTime||3); t++) {
            let ra = 1 + (eb.rootBonus||0);
            if (hasP('nature_stay_rooted')) ra++;
            rootStacks += ra;
          }
        } else if (spell.giveArmor) {
          block += spell.giveArmor + Math.floor(playerDef * 2);
          if (hasP('nature_bramble_guard')) rootStacks += 1;
          if (spell.rootBase) {
            const ri = incB(inc, spell.rootS||1, spell.rootD||1.0);
            let ra = Math.round((spell.rootBase||0) + ri + (eb.rootBonus||0));
            if (hasP('nature_stay_rooted')) ra++;
            rootStacks += ra;
          }
        } else if (spell.rootChance !== undefined) {
          // Vine Strike, Bramble Burst
          const ri = incB(inc, spell.rootS||0.05, spell.rootD||0.9);
          for (let h=0; h<(spell.hits||1); h++) {
            const thorn = hasP('nature_thorned_strikes') ? (rootStacks+ovStacks)*5 : 0;
            const dmg = Math.round((spell.baseDmg + dynAP*(spell.apMult||1.0) + thorn) * sm);
            eHP -= dmg;
            if (eHP<=0) break;
            if (Math.random() < clamp((spell.rootChance||0.5)+ri, 0, 0.95)) {
              let ra = 1 + (eb.rootBonus||0);
              if (hasP('nature_stay_rooted')) ra++;
              rootStacks += ra;
              if (hasP('nature_deep_roots')) {
                const every3 = Math.floor(rootStacks / 3);
                seeds = seeds.map(s=>({...s, timer:Math.max(1,s.timer-every3)}));
              }
            }
          }
        }
      }
      if (eHP<=0) break;
    } // end actions

    // Tick CDs
    for (const s of spells) if ((cds[s.id]||0)>0) cds[s.id]--;
    if (eHP<=0) break;

    // ── ENEMY ATTACK ──────────────────────────────────────────────────────────
    // Shock: each stack = 5% reduction (real value from passives.js: "each Shock stack reduces enemy damage by 5%")
    // Conduction bonus already handled by shock application
    const shockPct = clamp(shockStacks * 0.05, 0, 0.75);
    let eAtk = Math.max(0, Math.round(eDmgBase * (1 - shockPct)));
    eAtk = Math.max(0, eAtk - playerDef);  // Defense flat reduction per hit
    if (block > 0) { const ab=Math.min(block,eAtk); eAtk-=ab; block=Math.max(0,block-ab); }
    pHP -= eAtk;
  }

  const won = eHP <= 0 && pHP > 0;
  return { won, turns, hpLeft: won ? Math.max(0,pHP) : 0 };
}

// ─── RUN SIMULATION ──────────────────────────────────────────────────────────
function simulateRun(el, talCfg, zone, strategy) {
  const gymIdx = zone - 1;
  const eb = talCfg[el] || {};
  const maxHP = BASE_HP + talCfg.hpB;
  const player = { element:el, ap:talCfg.ap, efx:talCfg.efx, defense:0, eb, maxHP, hp:maxHP, spells:[], passives:[] };

  // Starter spell
  const starter = Object.values(ALL_SPELLS).find(s=>s.el===el && s.starter);
  player.spells.push({...starter, id:Object.keys(ALL_SPELLS).find(k=>ALL_SPELLS[k]===starter), incLevel:1});

  const BATTLES = 12;
  const isZ1 = zone === 1;
  let battlesWon = 0;

  for (let b=1; b<=BATTLES; b++) {
    const baseEnc = scaleEnemy(rnd(ENEMY_POOL), gymIdx);
    const enc = b === 1 ? { ...baseEnc, hp: Math.round(baseEnc.hp * 0.5) } : baseEnc;
    const res = simulateBattle(player, enc);
    if (!res.won) return { won:false, battlesWon, diedAt:b, spells:player.spells.map(s=>s.id), passives:player.passives };
    battlesWon++;
    player.hp = Math.min(maxHP, res.hpLeft + BATTLE_HEAL);
    pickReward(rewardType(b, isZ1), player, el, strategy);
  }

  // Gym
  player.hp = maxHP;
  const boss = gymEnemy(el, gymIdx);
  const gr = simulateBattle(player, boss);
  if (gr.won) grantGymRewards(player, el, strategy);

  return {
    won: gr.won, battlesWon: gr.won ? BATTLES+1 : BATTLES,
    hpAtEnd: gr.won ? gr.hpLeft : 0, gymTurns: gr.turns,
    spells: player.spells.map(s=>s.id), passives: player.passives,
    diedAt: gr.won ? null : 'gym',
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// Buckets: el → strategy → talentLvl → zone → {wins,total,gymT,hpEnd,diedAt[14]}
const RES = {};
for (const el of ELEMENTS) {
  RES[el] = {};
  for (const st of STRATEGIES) {
    RES[el][st] = {};
    for (const t of TALENT_CFGS) {
      RES[el][st][t.level] = {};
      for (const z of ZONES) RES[el][st][t.level][z] = {wins:0,total:0,gymT:0,hpE:0,diedAt:new Array(15).fill(0)};
    }
  }
}

// Track passive win rates
const passiveWins = {}; // passiveId → {wins, total}
for (const el of ELEMENTS) {
  for (const p of [...PASSIVE_POOLS[el].normal, ...PASSIVE_POOLS[el].legendary]) {
    passiveWins[p] = {wins:0,total:0,el};
  }
}

const combos = ELEMENTS.length * STRATEGIES.length * TALENT_CFGS.length * ZONES.length;
const perCombo = Math.floor(N_RUNS / combos);
const total = perCombo * combos;
const t0 = Date.now();
process.stderr.write(`Running ${total.toLocaleString()} full-zone runs...\n`);

for (const el of ELEMENTS) {
  for (const st of STRATEGIES) {
    for (const t of TALENT_CFGS) {
      for (const z of ZONES) {
        const bucket = RES[el][st][t.level][z];
        for (let i=0; i<perCombo; i++) {
          const r = simulateRun(el, t, z, st);
          bucket.total++;
          if (r.won) { bucket.wins++; bucket.gymT+=r.gymTurns||0; bucket.hpE+=r.hpAtEnd||0; }
          else if (r.diedAt) {
            const idx = r.diedAt === 'gym' ? 13 : Math.min(r.diedAt, 14);
            bucket.diedAt[idx]++;
          }
          // Track passive win rates (random only to avoid selection bias)
          if (st === 'random' && r.passives) {
            r.passives.forEach(p => {
              if (passiveWins[p]) {
                passiveWins[p].total++;
                if (r.won) passiveWins[p].wins++;
              }
            });
          }
        }
      }
    }
  }
}
process.stderr.write(`Done in ${((Date.now()-t0)/1000).toFixed(1)}s\n\n`);

// ─── REPORT ───────────────────────────────────────────────────────────────────
const L = '═'.repeat(86);
const L2= '─'.repeat(86);
function P(w,t){return t?(w/t*100).toFixed(1):'0.0';}
function bar(w,t,W=20){const n=t?Math.round(w/t*W):0;return '█'.repeat(n)+'░'.repeat(W-n);}

console.log(L);
console.log('  WIZARD LEAGUE — Complete Simulation (All Spells, All Passives)');
console.log(`  ${total.toLocaleString()} full-zone runs · Fire / Lightning / Nature`);
console.log('  Builds start from 1 starter spell. HP persists across battles (+10 heal).');
console.log(L);

// [1] OVERALL
console.log('\n[1] OVERALL WIN RATE — element × strategy (all zones & talent levels)');
console.log(L2);
for (const el of ELEMENTS) {
  for (const st of STRATEGIES) {
    let w=0,t=0;
    for (const tv of TALENT_CFGS) for (const z of ZONES) { const b=RES[el][st][tv.level][z]; w+=b.wins; t+=b.total; }
    console.log(`  ${el.padEnd(12)} ${st.padEnd(7)} ${P(w,t).padStart(5)}%  ${bar(w,t)}`);
  }
  console.log();
}

// [2] ZONE BREAKDOWN (random picks)
console.log('[2] WIN RATE BY ZONE — random picks, all talent levels');
console.log(L2);
process.stdout.write('  Zone     ');
for (const el of ELEMENTS) process.stdout.write(el.padEnd(20));
console.log();
for (const z of ZONES) {
  process.stdout.write(`  Z${z}      `);
  for (const el of ELEMENTS) {
    let w=0,t=0;
    for (const tv of TALENT_CFGS) { const b=RES[el].random[tv.level][z]; w+=b.wins; t+=b.total; }
    process.stdout.write(`${P(w,t).padStart(5)}%               `);
  }
  console.log();
}

// [3] TALENT SCALING
console.log('\n[3] TALENT SCALING (random picks, all zones)');
console.log(L2);
process.stdout.write('  ' + 'Element'.padEnd(14));
for (const tv of TALENT_CFGS) process.stdout.write(`Lv${tv.level} ${tv.label.padEnd(14)}`);
console.log('  Lv0→Lv3 gain');
for (const el of ELEMENTS) {
  process.stdout.write('  ' + el.padEnd(14));
  const lv = TALENT_CFGS.map(tv => {
    let w=0,t=0; for(const z of ZONES){const b=RES[el].random[tv.level][z];w+=b.wins;t+=b.total;}
    return {w,t};
  });
  for (const l of lv) process.stdout.write(`${P(l.w,l.t).padStart(5)}%            `);
  const gain = ((lv[3].w/lv[3].t)-(lv[0].w/lv[0].t))*100;
  console.log(`  +${gain.toFixed(1)}pp`);
}

// [4] HEATMAP per element
console.log('\n[4] WIN% HEATMAP — zone × talent level (random picks)');
console.log('    ▓▓=80+%  ▒▒=60-80%  ░░=40-60%  ··=<40%');
for (const el of ELEMENTS) {
  console.log(`\n  ${el}`);
  process.stdout.write('        ');
  for (const tv of TALENT_CFGS) process.stdout.write(tv.label.padEnd(17));
  console.log();
  for (const z of ZONES) {
    process.stdout.write(`    Z${z}   `);
    for (const tv of TALENT_CFGS) {
      const b=RES[el].random[tv.level][z];
      const p=parseFloat(P(b.wins,b.total));
      const t=p>=80?'▓▓':p>=60?'▒▒':p>=40?'░░':'··';
      process.stdout.write(`${P(b.wins,b.total).padStart(5)}%${t}        `);
    }
    console.log();
  }
}

// [5] SMART vs RANDOM
console.log('\n[5] SMART vs RANDOM PICKS — gain from knowing synergies');
console.log(L2);
for (const el of ELEMENTS) {
  process.stdout.write(`  ${el.padEnd(12)}: `);
  for (const z of [1,3,5]) {
    let rw=0,rt=0,sw=0,st2=0;
    for (const tv of TALENT_CFGS) {
      const rb=RES[el].random[tv.level][z]; rw+=rb.wins; rt+=rb.total;
      const sb=RES[el].smart[tv.level][z];  sw+=sb.wins; st2+=sb.total;
    }
    const g=((sw/st2)-(rw/rt))*100;
    process.stdout.write(`Z${z}: rand ${P(rw,rt)}% smart ${P(sw,st2)}% (${g>=0?'+':''}${g.toFixed(1)}pp)   `);
  }
  console.log();
}

// [6] PASSIVE WIN RATE ANALYSIS
console.log('\n[6] PASSIVE WIN RATE (when owned in run, random picks) — top 8 per element');
console.log(L2);
for (const el of ELEMENTS) {
  const elPassives = Object.entries(passiveWins)
    .filter(([,v])=>v.el===el && v.total>=100)
    .sort((a,b)=>(b[1].wins/b[1].total)-(a[1].wins/a[1].total));
  console.log(`  ${el}:`);
  for (const [pid, s] of elPassives.slice(0,10)) {
    const isLeg = PASSIVE_POOLS[el].legendary.includes(pid);
    const tag = isLeg ? '[LEG]' : '     ';
    console.log(`    ${tag} ${pid.padEnd(30)} ${P(s.wins,s.total).padStart(5)}%  (${s.total} samples)`);
  }
  console.log();
}

// [7] WHERE RUNS DIE — Novice runs only
console.log('[7] WHERE NOVICE RUNS FAIL (random picks, zone 3 — most informative)');
console.log(L2);
for (const el of ELEMENTS) {
  const b = RES[el].random[0][3];
  const losses = b.total - b.wins;
  if (!losses) { console.log(`  ${el}: no losses at Novice Z3`); continue; }
  process.stdout.write(`  ${el.padEnd(12)}: `);
  for (let d=1; d<=13; d++) {
    if (b.diedAt[d]>0) process.stdout.write(`B${d}:${((b.diedAt[d]/losses)*100).toFixed(0)}%  `);
  }
  if (b.diedAt[13]>0) process.stdout.write(`Gym:${((b.diedAt[13]/losses)*100).toFixed(0)}%`);
  console.log();
}

// [8] ZONE 5 DEEP DIVE
console.log('\n[8] ZONE 5 — win rate by element × strategy × talent');
console.log(L2);
process.stdout.write('  ' + 'Element+Strat'.padEnd(22));
for (const tv of TALENT_CFGS) process.stdout.write(tv.label.padEnd(14));
console.log();
for (const el of ELEMENTS) {
  for (const st of STRATEGIES) {
    process.stdout.write(`  ${el} ${st.padEnd(8)}           `);
    for (const tv of TALENT_CFGS) {
      const b=RES[el][st][tv.level][5];
      const p=parseFloat(P(b.wins,b.total));
      const m=p>=70?'✓':p>=40?'~':'✗';
      process.stdout.write(`${P(b.wins,b.total).padStart(5)}%${m}        `);
    }
    console.log();
  }
}

// [9] GYM PERFORMANCE (avg turns)
console.log('\n[9] GYM BOSS AVG TURNS TO KILL (winning runs, random picks)');
console.log(L2);
for (const el of ELEMENTS) {
  process.stdout.write(`  ${el.padEnd(12)}: `);
  for (const z of ZONES) {
    let w=0,gT=0;
    for (const tv of TALENT_CFGS) { const b=RES[el].random[tv.level][z]; w+=b.wins; gT+=b.gymT; }
    process.stdout.write(`Z${z}:${w>0?(gT/w).toFixed(1):'—'}t  `);
  }
  console.log();
}

// [10] TIER SUMMARY
console.log('\n[10] TIER SUMMARY');
console.log(L2);
for (const el of ELEMENTS) {
  let w=0,t=0;
  for (const st of STRATEGIES) for (const tv of TALENT_CFGS) for (const z of ZONES) {
    const b=RES[el][st][tv.level][z]; w+=b.wins; t+=b.total;
  }
  const overall = parseFloat(P(w,t));
  // Z5 master smart
  const z5 = RES[el].smart[3][5];
  // Z1 novice
  const z1n = RES[el].random[0][1];
  // Talent cliff: first level where avg zone win > 50%
  let cliff = 'None';
  for (const tv of TALENT_CFGS) {
    let cw=0,ct=0; for(const z of ZONES){const b=RES[el].random[tv.level][z];cw+=b.wins;ct+=b.total;}
    if(cw/ct>0.50){cliff=tv.label;break;}
  }
  const tier = overall>=50?'S':overall>=30?'A':overall>=15?'B':'C';
  console.log(`  ${el.padEnd(12)}: ${tier}-tier  Overall:${P(w,t).padStart(5)}%  Z1 Novice:${P(z1n.wins,z1n.total).padStart(5)}%  Z5 Master+Smart:${P(z5.wins,z5.total).padStart(5)}%  50% cliff: ${cliff}`);
}

console.log('\n'+L+'\n  END OF REPORT\n'+L);
