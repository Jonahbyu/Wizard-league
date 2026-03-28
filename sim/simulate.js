'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD LEAGUE — 1M Battle Simulation
// Elements: Fire | Lightning | Nature
// Varies: build archetype × talent level × zone × enemy
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_HP = 200;
const ACTIONS_PER_TURN = 2;
const MAX_TURNS = 60;

// ─── MATH HELPERS ─────────────────────────────────────────────────────────────
function incantBonus(level, baseScale, decay) {
  if (level <= 1) return 0;
  let bonus = 0;
  for (let i = 0; i < level - 1; i++) bonus += baseScale * Math.pow(decay, i);
  return bonus;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── ENEMY POOL (from encounters.js) ─────────────────────────────────────────
const ENEMY_POOL = [
  {name:'Emberweave',   el:'Fire',      hp:95,  dmg:22},
  {name:'Ashcaller',    el:'Fire',      hp:110, dmg:20},
  {name:'Pyromancer',   el:'Fire',      hp:130, dmg:18},
  {name:'Stormweave',   el:'Lightning', hp:85,  dmg:26},
  {name:'Voltmancer',   el:'Lightning', hp:100, dmg:24},
  {name:'Thunderscribe',el:'Lightning', hp:110, dmg:22},
  {name:'Groveweave',   el:'Nature',    hp:95,  dmg:20},
  {name:'Thornmancer',  el:'Nature',    hp:120, dmg:18},
  {name:'Rootbinder',   el:'Nature',    hp:135, dmg:16},
  {name:'Tidecaller',   el:'Water',     hp:90,  dmg:20},
  {name:'Brineweave',   el:'Water',     hp:115, dmg:18},
  {name:'Abyssmancer',  el:'Water',     hp:100, dmg:24},
  {name:'Frostbinder',  el:'Ice',       hp:95,  dmg:22},
  {name:'Glacialmancer',el:'Ice',       hp:125, dmg:18},
  {name:'Geomancer',    el:'Earth',     hp:120, dmg:18},
  {name:'Stonewarden',  el:'Earth',     hp:145, dmg:16},
  {name:'Terramancer',  el:'Earth',     hp:110, dmg:22},
  {name:'Voidweave',    el:'Plasma',    hp:90,  dmg:26},
  {name:'Plasmancer',   el:'Plasma',    hp:85,  dmg:28},
  {name:'Zephyrcaster', el:'Air',       hp:80,  dmg:28},
  {name:'Galecaller',   el:'Air',       hp:90,  dmg:26},
];

// Scale enemy to zone (battleLoad.js logic)
function scaleEnemy(enc, gymIdx) {
  const hpMult  = 1 + gymIdx * 0.28;
  const dmgMult = 1 + gymIdx * 0.22;
  const scaledHP  = Math.round(enc.hp  * hpMult);
  const scaledDmg = Math.round(enc.dmg * dmgMult);
  return {
    name: enc.name,
    el:   enc.el,
    hp:   Math.round(scaledHP * 0.70),          // 30% less HP (balance change)
    dmg:  Math.max(1, scaledDmg - 5),           // -5 dmg global
    ap:   Math.floor(gymIdx * 4.4),             // scaledPower = floor(gymIdx×4.4)
  };
}

// ─── BUILD ARCHETYPES ─────────────────────────────────────────────────────────
// incLevel: 1=Dim, 2=Kindled, 3=Blazing, 4=Radiant
// Spell data sourced from spells.js + incantations.js

const ARCHETYPES = [
  // ── FIRE ──────────────────────────────────────────────────────────────────
  {
    id:'fire_burn_core', element:'Fire', label:'Burn Core',
    spells:[
      {id:'ignite',      cd:1, baseDmg:0,  hits:1, burnBase:15, burnScale:3,  burnDecay:0.90, incLevel:3},
      {id:'ember_storm', cd:2, baseDmg:5,  hits:3, burnBase:3,  burnScale:1,  burnDecay:0.90, incLevel:2},
    ],
    passives:['fire_pyromaniac','fire_combustion'],
  },
  {
    id:'fire_wildfire', element:'Fire', label:'Wildfire + Roaring Heat',
    spells:[
      {id:'ignite',      cd:1, baseDmg:0,  hits:1, burnBase:15, burnScale:3,  burnDecay:0.90, incLevel:3},
      {id:'flame_wave',  cd:2, baseDmg:0,  hits:1, burnBase:5,  burnScale:1,  burnDecay:0.90, incLevel:2},
    ],
    passives:['fire_wildfire','fire_roaring_heat'],
  },
  {
    id:'fire_blazing_ap', element:'Fire', label:'Blazing Heat (AP-stacker)',
    spells:[
      {id:'ignite',      cd:1, baseDmg:0,  hits:1, burnBase:15, burnScale:3,  burnDecay:0.90, incLevel:3},
      {id:'ember_storm', cd:2, baseDmg:5,  hits:3, burnBase:3,  burnScale:1,  burnDecay:0.90, incLevel:3},
    ],
    passives:['fire_pyromaniac','fire_blazing_heat'],
  },
  {
    id:'fire_melt', element:'Fire', label:'Forge Melt',
    spells:[
      {id:'ignite',      cd:1, baseDmg:0,  hits:1, burnBase:15, burnScale:3,  burnDecay:0.90, incLevel:3},
      {id:'flame_wave',  cd:2, baseDmg:0,  hits:1, burnBase:5,  burnScale:1,  burnDecay:0.90, incLevel:2},
    ],
    passives:['fire_forge_master','fire_iron_burn'],
  },

  // ── LIGHTNING ─────────────────────────────────────────────────────────────
  {
    id:'light_shock_shred', element:'Lightning', label:'Shock Shred',
    spells:[
      {id:'zap',   cd:0, baseDmg:10, hits:1, shockBase:0.4, shockScale:0.4, shockDecay:0.90, incLevel:3},
      {id:'chain', cd:2, baseDmg:12, hits:4, shockBase:0.3, shockScale:0.1, shockDecay:1.00, incLevel:2},
    ],
    passives:['lightning_conduction','lightning_double_strike'],
  },
  {
    id:'light_overload', element:'Lightning', label:'Overload Burst',
    spells:[
      {id:'zap',   cd:0, baseDmg:10, hits:1, shockBase:0.4, shockScale:0.4, shockDecay:0.90, incLevel:2},
      {id:'chain', cd:2, baseDmg:12, hits:4, shockBase:0.3, shockScale:0.1, shockDecay:1.00, incLevel:3},
    ],
    passives:['lightning_overload','lightning_static_shock'],
  },
  {
    id:'light_surge', element:'Lightning', label:'Surge / Hair Trigger',
    spells:[
      {id:'zap',        cd:0, baseDmg:10, hits:1, shockBase:0.4, shockScale:0.4, shockDecay:0.90, incLevel:3},
      {id:'overcharge', cd:2, baseDmg:0,  hits:1, shockBase:3,   shockScale:1,   shockDecay:0.90, incLevel:2, powerBoost:30},
    ],
    passives:['lightning_hair_trigger','lightning_overcharged'],
  },
  {
    id:'light_double_static', element:'Lightning', label:'Double Strike + Static',
    spells:[
      {id:'zap',   cd:0, baseDmg:10, hits:1, shockBase:0.4, shockScale:0.4, shockDecay:0.90, incLevel:3},
      {id:'chain', cd:2, baseDmg:12, hits:4, shockBase:0.3, shockScale:0.1, shockDecay:1.00, incLevel:2},
    ],
    passives:['lightning_double_strike','lightning_static_shock'],
  },

  // ── NATURE ────────────────────────────────────────────────────────────────
  {
    id:'nature_root_thorns', element:'Nature', label:'Root + Thorns',
    spells:[
      {id:'vine',  cd:0, baseDmg:5, hits:3, rootChance:0.50, rootScale:0.05, rootDecay:0.90, incLevel:3},
      {id:'rseed', cd:2, baseDmg:0, hits:1, seedType:'root',   seedTimer:5, incLevel:2},
    ],
    passives:['nature_thorned_strikes','nature_stay_rooted'],
  },
  {
    id:'nature_seed_garden', element:'Nature', label:'Seed Garden',
    spells:[
      {id:'vine',  cd:0, baseDmg:5, hits:3, rootChance:0.50, rootScale:0.05, rootDecay:0.90, incLevel:2},
      {id:'dseed', cd:2, baseDmg:0, hits:1, seedType:'damage', seedTimer:5, incLevel:3},
    ],
    passives:['nature_perennial','nature_thorn_bloom'],
  },
  {
    id:'nature_overgrowth', element:'Nature', label:'Overgrowth Stacker',
    spells:[
      {id:'vine',  cd:0, baseDmg:5, hits:3, rootChance:0.50, rootScale:0.05, rootDecay:0.90, incLevel:3},
      {id:'vine2', cd:0, baseDmg:5, hits:3, rootChance:0.50, rootScale:0.05, rootDecay:0.90, incLevel:2},
    ],
    passives:['nature_overgrowth','nature_bramble_guard'],
  },
  {
    id:'nature_rooted_bloom', element:'Nature', label:'Rooted Bloom (Legendary)',
    spells:[
      {id:'vine',  cd:0, baseDmg:5, hits:3, rootChance:0.50, rootScale:0.05, rootDecay:0.90, incLevel:3},
      {id:'rseed', cd:2, baseDmg:0, hits:1, seedType:'root',   seedTimer:5, incLevel:3},
    ],
    passives:['nature_rooted_bloom','nature_thorned_strikes'],
  },
];

// ─── TALENT CONFIGS ───────────────────────────────────────────────────────────
const TALENT_LEVELS = [
  { level:0, label:'Novice',      ap:0,  efx:0,  hpBonus:0,
    Fire:{burnDmgBonus:0, spellMult:1.0, burnStart:0},
    Lightning:{shockPerHit:0, spellMult:1.0, overloadFloor:0.25},
    Nature:{rootBonus:0, spellMult:1.0} },

  { level:1, label:'Apprentice',  ap:3,  efx:3,  hpBonus:15,
    Fire:{burnDmgBonus:0.1, spellMult:1.0,  burnStart:2},
    Lightning:{shockPerHit:0.5, spellMult:1.0,  overloadFloor:0.35},
    Nature:{rootBonus:0.5, spellMult:1.0} },

  { level:2, label:'Adept',       ap:9,  efx:9,  hpBonus:30,
    Fire:{burnDmgBonus:0.3, spellMult:1.10, burnStart:6},
    Lightning:{shockPerHit:1.0, spellMult:1.10, overloadFloor:0.45},
    Nature:{rootBonus:1.0, spellMult:1.10} },

  { level:3, label:'Master',      ap:18, efx:18, hpBonus:60,
    Fire:{burnDmgBonus:0.5, spellMult:1.20, burnStart:10},
    Lightning:{shockPerHit:1.5, spellMult:1.20, overloadFloor:0.55},
    Nature:{rootBonus:1.5, spellMult:1.20} },
];

// ─── SIMULATE ONE BATTLE ──────────────────────────────────────────────────────
function simulateBattle(arch, talCfg, enemy) {
  const el  = arch.element;
  const ap0 = talCfg.ap;
  const efx0 = talCfg.efx;
  const eb  = talCfg[el] || {};
  const maxHP = BASE_HP + talCfg.hpBonus;
  const spellMult = eb.spellMult || 1.0;

  const hasP = id => arch.passives.includes(id);

  // Player state
  let playerHP = maxHP;
  let dynAP = ap0;  // may be boosted by blazing heat or overcharge

  // Enemy state
  let enemyHP = enemy.hp;
  const enemyDmgBase = enemy.dmg + Math.floor(enemy.ap * 0.3);

  // Status effects (on enemy unless noted)
  let burnStacks  = eb.burnStart || 0;
  let shockStacks = 0;
  let rootStacks  = 0;
  let overgrowthStacks = 0;

  // Spell cooldowns
  const cds = {};
  for (const s of arch.spells) cds[s.id] = 0;

  // Lightning-specific
  let overloadMult   = 2.0;
  let surgeAccum     = 0;
  const surgeThresh  = hasP('lightning_hair_trigger') ? 50 : 60;
  let tempPowerBoost = 0;

  // Nature seeds: [{type:'damage'|'root', timer, blooms}]
  let seeds = [];

  let turns = 0;

  while (playerHP > 0 && enemyHP > 0 && turns < MAX_TURNS) {
    turns++;

    // ── START OF TURN ────────────────────────────────────────────────────────

    // Restore overload (only meaningful if passive exists)
    if (el === 'Lightning' && hasP('lightning_overload')) {
      overloadMult = 2.0;
    }

    // Wildfire: 33% chance to double burn
    if (el === 'Fire' && hasP('fire_wildfire') && burnStacks > 0) {
      if (Math.random() < 0.33) burnStacks = Math.min(burnStacks * 2, 999);
    }

    // Burn tick
    if (burnStacks > 0) {
      const perStack = (hasP('fire_roaring_heat') ? 1.5 : 1.0)
                     + efx0 / 100
                     + (eb.burnDmgBonus || 0);
      enemyHP -= Math.ceil(burnStacks * perStack);
      if (enemyHP <= 0) break;
    }

    // Shock decay (25%)
    shockStacks = Math.floor(shockStacks * 0.75);

    // Root decay → overgrowth conversion
    if (rootStacks > 0) {
      if (hasP('nature_overgrowth')) overgrowthStacks++;
      rootStacks = Math.max(0, rootStacks - 1);
    }

    // Blazing heat: AP from burn stacks
    if (el === 'Fire' && hasP('fire_blazing_heat')) {
      dynAP = ap0 + Math.floor(burnStacks / 2);
    } else {
      dynAP = ap0 + tempPowerBoost;
    }
    tempPowerBoost = 0;

    // Advance and bloom seeds (Nature)
    const bloomed = [];
    const remaining = [];
    for (const seed of seeds) {
      if (seed.timer <= 1) bloomed.push(seed);
      else remaining.push({...seed, timer: seed.timer - 1});
    }
    seeds = remaining;

    for (const seed of bloomed) {
      if (seed.type === 'damage') {
        const efxBonus = efx0 / 2;
        const dmg = Math.round((30 + efxBonus + dynAP) * spellMult);
        enemyHP -= dmg;
        if (enemyHP <= 0) break;
        if (hasP('nature_perennial')) seeds.push({type:'damage', timer:4});
        if (hasP('nature_thorn_bloom') && rootStacks > 0) rootStacks += 2;
      } else if (seed.type === 'root') {
        let ra = 3;
        if (hasP('nature_stay_rooted')) ra++;
        if (hasP('nature_rooted_bloom')) {
          // Rooted Bloom legendary: also grants thorns bonus on next hits
          rootStacks += ra + 1;
        } else {
          rootStacks += ra;
        }
        if (hasP('nature_perennial')) seeds.push({type:'root', timer:4});
      }
    }
    if (enemyHP <= 0) break;

    // ── PLAYER ACTIONS ───────────────────────────────────────────────────────
    let acts = ACTIONS_PER_TURN;

    while (acts > 0) {
      // Pick highest-priority available spell (first one with cd=0)
      let chosen = null;
      for (const s of arch.spells) {
        if ((cds[s.id] || 0) === 0) { chosen = s; break; }
      }

      if (!chosen) {
        // All on CD — basic attack
        const basicDmg = Math.round((8 + dynAP) * spellMult);
        enemyHP -= basicDmg;
        if (el === 'Lightning') {
          surgeAccum += basicDmg * 0.3;
          if (hasP('lightning_overload')) overloadMult = Math.max(eb.overloadFloor || 0.25, overloadMult - 0.25);
        }
        acts--;
        if (enemyHP <= 0) break;
        continue;
      }

      cds[chosen.id] = chosen.cd;
      acts--;

      // ── FIRE ──────────────────────────────────────────────────────────────
      if (el === 'Fire') {
        if ((chosen.baseDmg || 0) > 0) {
          for (let h = 0; h < (chosen.hits || 1); h++) {
            const dmg = Math.round((chosen.baseDmg + dynAP) * spellMult);
            enemyHP -= dmg;
          }
          if (enemyHP <= 0) break;
        }
        if (chosen.burnBase) {
          const inc  = incantBonus(chosen.incLevel, chosen.burnScale, chosen.burnDecay);
          for (let h = 0; h < (chosen.hits || 1); h++) {
            let nb = (chosen.burnBase + inc) * 0.75 + Math.floor(efx0 * 0.2);
            if (hasP('fire_pyromaniac')) nb += 3 * 0.75;
            if (hasP('fire_combustion')) nb += (1 + Math.floor(burnStacks / 5)) * 0.75;
            burnStacks += Math.round(nb);
          }
        }
        // Melt (simplified: Iron Burn deals bonus damage equal to burn/3)
        if (hasP('fire_iron_burn') && burnStacks > 0) {
          const meltBonus = Math.floor(burnStacks / 3) * (hasP('fire_forge_master') ? 1.3 : 1.0);
          enemyHP -= Math.floor(meltBonus);
        }
      }

      // ── LIGHTNING ─────────────────────────────────────────────────────────
      else if (el === 'Lightning') {
        if (chosen.id === 'overcharge') {
          const incShock = incantBonus(chosen.incLevel, chosen.shockScale, chosen.shockDecay);
          shockStacks += chosen.shockBase + incShock + (eb.shockPerHit || 0);
          tempPowerBoost = chosen.powerBoost || 30;
          if (hasP('lightning_overload')) overloadMult = Math.max(eb.overloadFloor || 0.25, overloadMult - 0.25);
        } else {
          const bounces = chosen.id === 'chain'
            ? Math.round(chosen.hits + incantBonus(chosen.incLevel, 1, 1.0))
            : chosen.hits;

          for (let h = 0; h < bounces; h++) {
            const mult = hasP('lightning_overload') ? overloadMult : 1.0;

            // Double strike
            let hitMult = 1;
            if (hasP('lightning_double_strike')) {
              const dblChance = 0.30 + efx0 / 500;
              if (Math.random() < dblChance) hitMult = dblChance >= 1.0 ? 3 : 2;
            }

            let dmg = Math.round((chosen.baseDmg + dynAP) * spellMult * mult);

            // Static Shock: +% of current enemy HP
            if (hasP('lightning_static_shock') && enemyHP > 0) {
              dmg += Math.round(enemyHP * clamp(0.10 + efx0 / 1000, 0.10, 0.35));
            }

            dmg = Math.round(dmg * hitMult);
            enemyHP -= Math.max(0, dmg);

            // Shock application
            const incShock = incantBonus(chosen.incLevel, chosen.shockScale || 0.1, chosen.shockDecay || 0.9);
            let ns = (chosen.shockBase || 0) + incShock + (eb.shockPerHit || 0);
            if (hasP('lightning_conduction')) ns += 1;
            shockStacks += ns;

            // Surge accumulation
            surgeAccum += hasP('lightning_conductivity') ? ns * 2 : dmg * 0.35;

            if (hasP('lightning_overload')) overloadMult = Math.max(eb.overloadFloor || 0.25, overloadMult - 0.25);

            if (enemyHP <= 0) break;
          }

          // Check surge trigger
          while (surgeAccum >= surgeThresh) {
            const surgeDmg = Math.round(surgeThresh * 1.5 * spellMult);
            enemyHP -= surgeDmg;
            if (hasP('lightning_chain_surge')) enemyHP -= surgeDmg;
            if (hasP('lightning_overcharged')) shockStacks += 3;
            if (hasP('lightning_cascade')) {
              for (const s of arch.spells) cds[s.id] = Math.max(0, (cds[s.id] || 0) - 1);
            }
            surgeAccum -= surgeThresh;
            if (enemyHP <= 0) break;
          }
        }
      }

      // ── NATURE ────────────────────────────────────────────────────────────
      else if (el === 'Nature') {
        if (chosen.seedType) {
          seeds.push({type: chosen.seedType, timer: chosen.seedTimer || 5});
        } else {
          // Vine Strike (or vine2 — same logic)
          const incRoot = incantBonus(chosen.incLevel, chosen.rootScale || 0.05, chosen.rootDecay || 0.9);
          for (let h = 0; h < (chosen.hits || 1); h++) {
            const thornBonus = hasP('nature_thorned_strikes')
              ? (rootStacks + overgrowthStacks) * 5 : 0;
            const dmg = Math.round((chosen.baseDmg + dynAP + thornBonus) * spellMult);
            enemyHP -= dmg;
            if (enemyHP <= 0) break;

            if (chosen.rootChance) {
              const chance = clamp(chosen.rootChance + incRoot, 0, 0.95);
              if (Math.random() < chance) {
                let ra = 1 + (eb.rootBonus || 0);
                if (hasP('nature_stay_rooted')) ra += 1;
                rootStacks += ra;
              }
            }
          }
        }
      }

      if (enemyHP <= 0) break;
    } // end actions

    // Tick CDs
    for (const s of arch.spells) {
      if ((cds[s.id] || 0) > 0) cds[s.id]--;
    }

    if (enemyHP <= 0) break;

    // ── ENEMY ATTACKS ────────────────────────────────────────────────────────
    // Shock reduces enemy damage
    const shockPct = clamp(shockStacks * (0.03 + (hasP('lightning_conduction') ? 0.02 : 0)), 0, 0.75);
    const eAtk = Math.max(0, Math.round(enemyDmgBase * (1 - shockPct)));
    playerHP -= eAtk;
  }

  const won = enemyHP <= 0 && playerHP > 0;
  return { won, turns, hpLeft: won ? Math.max(0, playerHP) : 0 };
}

// ─── MAIN SIMULATION LOOP ─────────────────────────────────────────────────────
const N_SIMS = 1_000_000;
const ZONES  = [1, 2, 3, 4, 5];

// Pre-build result buckets: arch → talentLevel → zone → {wins, total, turns, hpLeft}
const R = {};
for (const a of ARCHETYPES) {
  R[a.id] = {};
  for (const t of TALENT_LEVELS) {
    R[a.id][t.level] = {};
    for (const z of ZONES) R[a.id][t.level][z] = {wins:0, total:0, turns:0, hpLeft:0};
  }
}

const combos = ARCHETYPES.length * TALENT_LEVELS.length * ZONES.length;
const perCombo = Math.floor(N_SIMS / combos);

const startMs = Date.now();
process.stderr.write(`Running ${(perCombo * combos).toLocaleString()} battles (${perCombo}/combo × ${combos} combos)...\n`);

for (const arch of ARCHETYPES) {
  for (const talCfg of TALENT_LEVELS) {
    for (const z of ZONES) {
      const gymIdx = z - 1;
      const bucket = R[arch.id][talCfg.level][z];
      for (let i = 0; i < perCombo; i++) {
        const enc = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
        const enemy = scaleEnemy(enc, gymIdx);
        const res = simulateBattle(arch, talCfg, enemy);
        bucket.total++;
        if (res.won) { bucket.wins++; bucket.turns += res.turns; bucket.hpLeft += res.hpLeft; }
      }
    }
  }
}

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
process.stderr.write(`Done in ${elapsed}s\n\n`);

// ─── REPORT ───────────────────────────────────────────────────────────────────
const SEP  = '═'.repeat(82);
const SEP2 = '─'.repeat(82);

function pct(wins, total) { return total ? (wins / total * 100).toFixed(1) : '0.0'; }
function bar(wins, total, w=30) {
  const n = total ? Math.round(wins / total * w) : 0;
  return '█'.repeat(n) + '░'.repeat(w - n);
}

console.log(SEP);
console.log('  WIZARD LEAGUE — 1,000,000 Battle Simulation Report');
console.log('  Elements: Fire | Lightning | Nature');
console.log(`  ${(perCombo * combos).toLocaleString()} battles · ${ARCHETYPES.length} archetypes · ${TALENT_LEVELS.length} talent levels · ${ZONES.length} zones`);
console.log(SEP);

// ── 1. OVERALL WIN RATE BY ELEMENT ────────────────────────────────────────────
console.log('\n[1] OVERALL WIN RATE BY ELEMENT');
console.log(SEP2);
for (const el of ['Fire','Lightning','Nature']) {
  let w=0, t=0;
  for (const a of ARCHETYPES.filter(a=>a.element===el))
    for (const talCfg of TALENT_LEVELS) for (const z of ZONES) {
      const b = R[a.id][talCfg.level][z]; w+=b.wins; t+=b.total;
    }
  console.log(`  ${el.padEnd(12)} ${pct(w,t).padStart(5)}%  ${bar(w,t)}`);
}

// ── 2. WIN RATE BY ZONE (all elements combined) ────────────────────────────────
console.log('\n[2] WIN RATE BY ZONE (all builds & talent levels)');
console.log(SEP2);
console.log('  Zone   WinRate   Avg Turns   Avg HP Left   Enemy HP at Z1→Z5');
for (const z of ZONES) {
  let w=0, t=0, turns=0, hp=0;
  for (const a of ARCHETYPES) for (const talCfg of TALENT_LEVELS) {
    const b = R[a.id][talCfg.level][z];
    w+=b.wins; t+=b.total; turns+=b.turns; hp+=b.hpLeft;
  }
  const avgT  = w > 0 ? (turns/w).toFixed(1) : '—';
  const avgHP = w > 0 ? Math.round(hp/w) : '—';
  // Example enemy HP at this zone
  const exEnemy = scaleEnemy({hp:110, dmg:20, el:'?'}, z-1);
  console.log(`  Zone ${z}   ${pct(w,t).padStart(5)}%    ${avgT.padStart(5)}t       ${String(avgHP).padStart(4)} HP     enemy≈${exEnemy.hp}HP/${exEnemy.dmg}dmg`);
}

// ── 3. WIN RATE BY TALENT LEVEL ───────────────────────────────────────────────
console.log('\n[3] WIN RATE BY TALENT LEVEL (all elements & zones)');
console.log(SEP2);
console.log('  Level      Label        WinRate   Avg Turns   AP    EFX   MaxHP');
for (const talCfg of TALENT_LEVELS) {
  let w=0, t=0, turns=0;
  for (const a of ARCHETYPES) for (const z of ZONES) {
    const b = R[a.id][talCfg.level][z];
    w+=b.wins; t+=b.total; turns+=b.turns;
  }
  const avgT = w > 0 ? (turns/w).toFixed(1) : '—';
  console.log(`  Lv${talCfg.level}  ${talCfg.label.padEnd(12)} ${pct(w,t).padStart(5)}%    ${avgT.padStart(5)}t       ${String(talCfg.ap).padStart(3)}   ${String(talCfg.efx).padStart(3)}   ${BASE_HP + talCfg.hpBonus}`);
}

// ── 4. ARCHETYPE BREAKDOWN ────────────────────────────────────────────────────
console.log('\n[4] ARCHETYPE BREAKDOWN');
console.log(SEP2);
for (const el of ['Fire','Lightning','Nature']) {
  console.log(`\n  ── ${el} ───────────────────────────────────────────────────────────`);
  const elArchs = ARCHETYPES.filter(a => a.element === el);
  // Print zone header
  process.stdout.write('  ' + 'Build'.padEnd(30) + ' Overall  ');
  for (const z of ZONES) process.stdout.write(`  Z${z}   `);
  console.log();

  for (const arch of elArchs) {
    let ow=0, ot=0, oturns=0, ohp=0;
    for (const talCfg of TALENT_LEVELS) for (const z of ZONES) {
      const b = R[arch.id][talCfg.level][z];
      ow+=b.wins; ot+=b.total; oturns+=b.turns; ohp+=b.hpLeft;
    }
    const avgT  = ow>0 ? (oturns/ow).toFixed(1) : '—';
    const avgHP = ow>0 ? Math.round(ohp/ow) : '—';
    process.stdout.write('  ' + arch.label.padEnd(30) + ` ${pct(ow,ot).padStart(5)}%  `);
    for (const z of ZONES) {
      let zw=0, zt=0;
      for (const talCfg of TALENT_LEVELS) {
        const b = R[arch.id][talCfg.level][z]; zw+=b.wins; zt+=b.total;
      }
      process.stdout.write(`${pct(zw,zt).padStart(4)}% `);
    }
    console.log(`  | avg ${avgT}t  ${avgHP}HP`);
  }
}

// ── 5. TALENT SCALING PER ELEMENT ─────────────────────────────────────────────
console.log('\n[5] TALENT SCALING IMPACT (Lv0 → Lv3)');
console.log(SEP2);
for (const el of ['Fire','Lightning','Nature']) {
  const elArchs = ARCHETYPES.filter(a => a.element === el);
  const byLv = TALENT_LEVELS.map(talCfg => {
    let w=0, t=0;
    for (const a of elArchs) for (const z of ZONES) {
      const b = R[a.id][talCfg.level][z]; w+=b.wins; t+=b.total;
    }
    return {label:talCfg.label, w, t};
  });
  const gain = ((byLv[3].w/byLv[3].t) - (byLv[0].w/byLv[0].t)) * 100;
  process.stdout.write(`  ${el.padEnd(12)}: `);
  for (const lv of byLv) process.stdout.write(`${lv.label}:${pct(lv.w,lv.t)}%  `);
  console.log(`  (+${gain.toFixed(1)}pp total gain)`);
}

// ── 6. PER-ELEMENT HEATMAP (zone × talent level) ──────────────────────────────
console.log('\n[6] WIN % HEATMAP — zone rows × talent-level cols');
for (const el of ['Fire','Lightning','Nature']) {
  const elArchs = ARCHETYPES.filter(a => a.element === el);
  console.log(`\n  ${el}`);
  process.stdout.write('  ' + 'Zone'.padEnd(7));
  for (const talCfg of TALENT_LEVELS) process.stdout.write(talCfg.label.padEnd(14));
  console.log();
  for (const z of ZONES) {
    process.stdout.write(`    Z${z}   `);
    for (const talCfg of TALENT_LEVELS) {
      let w=0, t=0;
      for (const a of elArchs) {
        const b = R[a.id][talCfg.level][z]; w+=b.wins; t+=b.total;
      }
      const p = parseFloat(pct(w,t));
      const col = p >= 80 ? '▓▓▓▓' : p >= 60 ? '▒▒▒▒' : p >= 40 ? '░░░░' : '····';
      process.stdout.write(`${pct(w,t).padStart(5)}%${col}  `);
    }
    console.log();
  }
}

// ── 7. BEST BUILD PER ZONE × TALENT TABLE ─────────────────────────────────────
console.log('\n[7] BEST ARCHETYPE PER ZONE × TALENT LEVEL');
console.log(SEP2);
process.stdout.write('       ');
for (const talCfg of TALENT_LEVELS) process.stdout.write(talCfg.label.padEnd(28));
console.log();
for (const z of ZONES) {
  process.stdout.write(`  Z${z}    `);
  for (const talCfg of TALENT_LEVELS) {
    let best = null, bestPct = -1;
    for (const a of ARCHETYPES) {
      const b = R[a.id][talCfg.level][z];
      const p = b.wins / b.total;
      if (p > bestPct) { bestPct = p; best = a; }
    }
    const label = `${best.label}(${(bestPct*100).toFixed(0)}%)`;
    process.stdout.write(label.padEnd(28));
  }
  console.log();
}

// ── 8. PASSIVE PAIR ANALYSIS ──────────────────────────────────────────────────
console.log('\n[8] PASSIVE COMBINATION WIN RATES (all zones, all talent levels)');
console.log(SEP2);
const passiveStats = {};
for (const a of ARCHETYPES) {
  const key = a.passives.sort().join(' + ');
  if (!passiveStats[key]) passiveStats[key] = {wins:0, total:0, element:a.element, label:a.label};
  for (const talCfg of TALENT_LEVELS) for (const z of ZONES) {
    const b = R[a.id][talCfg.level][z];
    passiveStats[key].wins += b.wins;
    passiveStats[key].total += b.total;
  }
}
const sorted = Object.entries(passiveStats).sort((a,b) => (b[1].wins/b[1].total) - (a[1].wins/a[1].total));
for (const [key, s] of sorted) {
  console.log(`  [${s.element}] ${s.label}`);
  console.log(`    ${key}`);
  console.log(`    ${pct(s.wins,s.total)}% win rate\n`);
}

// ── 9. ZONE 5 DEEP DIVE (hardest zone) ────────────────────────────────────────
console.log('[9] ZONE 5 DEEP DIVE — win rate by archetype × talent level');
console.log(SEP2);
process.stdout.write('  ' + 'Archetype'.padEnd(34));
for (const talCfg of TALENT_LEVELS) process.stdout.write(talCfg.label.padEnd(14));
console.log();
for (const a of ARCHETYPES) {
  process.stdout.write(`  [${a.element.slice(0,2)}] ${a.label.padEnd(30)}`);
  for (const talCfg of TALENT_LEVELS) {
    const b = R[a.id][talCfg.level][5];
    const p = pct(b.wins, b.total);
    const mark = parseFloat(p) >= 70 ? '✓' : parseFloat(p) >= 50 ? '~' : '✗';
    process.stdout.write(`${p.padStart(5)}%${mark}  `);
  }
  console.log();
}

console.log('\n' + SEP);
console.log('  END OF REPORT');
console.log(SEP);
