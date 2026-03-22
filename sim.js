'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD LEAGUE BALANCE SIMULATOR
// Runs 1,000,000 simulated runs to rank elements, talents, spellbooks.
// Usage: node sim.js
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_MAX_HP  = 200;
const BASE_DMG     = 25;
const BASE_ACTIONS = 2;
const BATTLE_HEAL  = 10;
const MAX_TURNS    = 35;
const GYM_SKIP_BONUS = 20;
const TOTAL_SIMS   = 1_000_000;

// ── Enemy base stats [hp, dmg] ──────────────────────────────────────────────
const ENEMY_POOL = [
  [95,22],[110,20],[130,18],   // Fire
  [90,20],[115,18],[100,24],   // Water
  [95,22],[125,18],[105,22],   // Ice
  [85,26],[100,24],[110,22],   // Lightning
  [120,18],[145,16],[110,22],  // Earth
  [95,20],[120,18],[135,16],   // Nature
  [90,26],[85,28],[100,24],    // Plasma
  [80,28],[90,26],[85,26],     // Air
];
const AVG_ENEMY_HP  = ENEMY_POOL.reduce((s,e)=>s+e[0],0)/ENEMY_POOL.length;
const AVG_ENEMY_DMG = ENEMY_POOL.reduce((s,e)=>s+e[1],0)/ENEMY_POOL.length;

// ── Gym bosses [baseHP, baseDmg] ────────────────────────────────────────────
const GYM_DATA = [
  [300,30],[420,34],[560,38],[720,44],[900,50],[1100,56],[1350,62],[1600,70]
];

// ── Scaling formulas ────────────────────────────────────────────────────────
function scaleHP(hp, gi)  { return Math.round(hp * (1 + gi * 0.28) * 1.25); }
function scaleDmg(d, gi)  { return Math.round(d  * (1 + gi * 0.22)); }
function scaledPow(gi, isGym) { return Math.floor(gi * 4.4) + (isGym ? 8 : 0); }

// ── Spellbook aura definitions ──────────────────────────────────────────────
// Per level 0-4: { atk, def, efx } aura values + special fields
// healPS = heal per spell, burnPS = burn per spell, etc.
const BOOKS = {
  none:           [{atk:0,def:0,efx:0},{atk:0,def:0,efx:0},{atk:0,def:0,efx:0},{atk:0,def:0,efx:0},{atk:0,def:0,efx:0}],
  fire_tome:      [{atk:0,def:0,efx:0,burnPS:1,hpCostPS:2},{atk:0,def:0,efx:0,burnPS:2,hpCostPS:2},{atk:0,def:0,efx:0,burnPS:3,hpCostPS:2},{atk:0,def:0,efx:5,burnPS:3,hpCostPS:2},{atk:0,def:0,efx:10,burnPS:4,hpCostPS:2}],
  tide_codex:     [{atk:0,def:0,efx:0,healPS:3},{atk:0,def:0,efx:0,healPS:4},{atk:0,def:0,efx:0,healPS:6},{atk:0,def:5,efx:0,healPS:6},{atk:0,def:8,efx:0,healPS:8}],
  frost_grimoire: [{atk:0,def:-5,efx:0,frostPS:1},{atk:0,def:-5,efx:0,frostPS:1},{atk:0,def:-5,efx:0,frostPS:2},{atk:8,def:-5,efx:0,frostPS:2},{atk:12,def:-5,efx:0,frostPS:3}],
  storm_codex:    [{atk:-5,def:0,efx:0,shockPS:1},{atk:-5,def:0,efx:0,shockPS:2},{atk:-5,def:0,efx:0,shockPS:2},{atk:-5,def:0,efx:5,shockPS:3},{atk:-5,def:0,efx:8,shockPS:4}],
  earth_ledger:   [{atk:-8,def:3,efx:0,blockPS:1},{atk:-8,def:4,efx:0,blockPS:2},{atk:-8,def:6,efx:0,blockPS:3},{atk:-8,def:8,efx:0,blockPS:4},{atk:-8,def:10,efx:0,blockPS:5}],
  verdant_codex:  [{atk:-5,def:0,efx:0,regenPT:4},{atk:-5,def:0,efx:0,regenPT:7},{atk:-5,def:0,efx:0,regenPT:10},{atk:-5,def:0,efx:5,regenPT:14},{atk:-5,def:0,efx:8,regenPT:20}],
  gale_sketch:    [{atk:0,def:-5,efx:0,xActChance:0.20},{atk:0,def:-5,efx:0,xActChance:0.25},{atk:0,def:-5,efx:0,xActChance:0.30},{atk:5,def:-5,efx:0,xActChance:0.35},{atk:10,def:-5,efx:0,xActChance:0.40}],
  plasma_atlas:   [{atk:0,def:0,efx:0,chargePS:1},{atk:0,def:0,efx:0,chargePS:1},{atk:0,def:0,efx:0,chargePS:2},{atk:0,def:0,efx:0,chargePS:2},{atk:0,def:0,efx:0,chargePS:3}],
  codex_power:    [{atk:12,def:0,efx:0},{atk:16,def:0,efx:0},{atk:20,def:0,efx:0},{atk:25,def:0,efx:0},{atk:32,def:0,efx:0}],
  guardians_ward: [{atk:-8,def:10,efx:0},{atk:-8,def:14,efx:0},{atk:-8,def:18,efx:0},{atk:-8,def:22,efx:0},{atk:-8,def:28,efx:0}],
  swiftblade:     [{atk:10,def:-5,efx:0},{atk:14,def:-5,efx:0},{atk:18,def:-5,efx:0},{atk:22,def:-5,efx:0},{atk:28,def:-5,efx:0}],
  scholars_folio: [{atk:-8,def:0,efx:5},{atk:-8,def:0,efx:8},{atk:-8,def:0,efx:8},{atk:-8,def:0,efx:12},{atk:-8,def:0,efx:15}],
  hunters_notes:  [{atk:8,def:-5,efx:0,healPS:2},{atk:10,def:-5,efx:0,healPS:3},{atk:12,def:-5,efx:0,healPS:4},{atk:14,def:-5,efx:0,healPS:5},{atk:18,def:-5,efx:0,healPS:7}],
  tome_of_time:   [{atk:0,def:0,efx:0,cdBonus:0.10},{atk:5,def:0,efx:0,cdBonus:0.10},{atk:8,def:0,efx:0,cdBonus:0.15},{atk:12,def:0,efx:0,cdBonus:0.15},{atk:16,def:0,efx:0,cdBonus:0.25}],
  echo_grimoire:  [{atk:0,def:0,efx:0,echo:0.50},{atk:0,def:0,efx:0,echo:0.60},{atk:0,def:0,efx:0,echo:0.70},{atk:0,def:0,efx:0,echo:0.80},{atk:0,def:0,efx:0,echo:1.00}],
  soul_codex:     [{atk:20,def:0,efx:0,hpCostPS:5,mutual:true},{atk:25,def:0,efx:0,hpCostPS:5,mutual:true},{atk:30,def:0,efx:0,hpCostPS:4,mutual:true},{atk:35,def:0,efx:0,hpCostPS:4,mutual:true},{atk:40,def:0,efx:0,hpCostPS:3,mutual:true}],
};
const BOOK_IDS = Object.keys(BOOKS);

// ── Passive pool ────────────────────────────────────────────────────────────
// Passives encoded as bitmask-friendly flags for speed
// We store them as plain objects; hot-path reads local variables
const PASSIVES = {
  Fire: [
    { id:'pyromaniac',   burnPH:3 },
    { id:'combustion',   burnPH:1, combustion:1 },
    { id:'blazing_heat', blazingHeat:1 },
    { id:'wildfire',     wildfire:1 },
    { id:'roaring_heat', burnMult:1.5, leg:1 },
  ],
  Water: [
    { id:'restoration',  halfHP:1, healMult:1.5 },
    { id:'ebb',          reflect:0.20 },
    { id:'sea_foam',     foamPH:1 },
    { id:'flow',         flow:1 },
    { id:'abyssal_pain', leg:1 }, // simplified: +flat after foam removal
  ],
  Ice: [
    { id:'ice_blast',       execute:0.20 },
    { id:'cold_swell',      coldSwell:1 },
    { id:'embrittlement',   embrittleDmg:3 },
    { id:'stay_frosty',     frostBonus:1 },
    { id:'permafrost_core', frostDmgMult:3, leg:1 },
  ],
  Lightning: [
    { id:'conduction',      shockPH:1 },
    { id:'double_strike',   dblBase:0.30, dblPerAP:0.002 },
    { id:'static_shock',    staticHP:0.10, staticPerAP:0.001 },
    { id:'overload',        overload:1 },
    { id:'superconductor',  supercon:1, leg:1 },
  ],
  Earth: [
    { id:'bedrock',          stoneOnArmor:1 },
    { id:'earthen_bulwark',  stoneOnBreak:2 },
    { id:'fissure',          bypassArmor:1 },
    { id:'hard_shell',       flatRed:10 },
    { id:'living_mountain',  stonePersist:1, leg:1 },
  ],
  Nature: [
    { id:'overgrowth',       overgrowth:1 },
    { id:'stay_rooted',      rootBonus:1 },
    { id:'thorned_strikes',  thornDmg:5 },
    { id:'bramble_guard',    rootOnArmor:1 },
    { id:'verdant_legion',   leg:1 },
  ],
  Plasma: [
    { id:'energy_feedback',  apPerCharge:1 },
    { id:'stabilized_core',  stabilized:1 },
    { id:'reactive_field',   reactive:1 },
    { id:'reserve_cell',     startCharge:10 },
    { id:'backfeed_reactor', leg:1 },
  ],
  Air: [
    { id:'tailwind',     tailwindAP:15 },
    { id:'rapid_tempo',  rapidTempo:1 },
    { id:'gale_force',   galePH:0.50 },
    { id:'slipstream',   slipstream:1 },
    { id:'eye_of_storm', eyeOfStorm:0.03, leg:1 },
  ],
};

// ── Talent configs (index 0-11) ─────────────────────────────────────────────
// hp = vitality levels (×15 HP), atk/efx/def = training levels (×3 stat)
// elemBonus = flat % bonus to element spell damage (simulates elem talent trees)
const TALENT_CONFIGS = [
  { hp:0, atk:0, efx:0, def:0, elemB:0.00, label:'No talents' },
  { hp:1, atk:1, efx:1, def:1, elemB:0.00, label:'Light (1 each)' },
  { hp:2, atk:2, efx:2, def:2, elemB:0.05, label:'Balanced (2 each)' },
  { hp:3, atk:3, efx:3, def:3, elemB:0.10, label:'Developed (3 each)' },
  { hp:4, atk:4, efx:4, def:4, elemB:0.15, label:'Heavy (4 each)' },
  { hp:6, atk:6, efx:6, def:6, elemB:0.20, label:'Max all' },
  { hp:0, atk:6, efx:0, def:0, elemB:0.20, label:'All-in ATK' },
  { hp:6, atk:0, efx:0, def:0, elemB:0.00, label:'All-in HP' },
  { hp:0, atk:0, efx:0, def:6, elemB:0.00, label:'All-in DEF' },
  { hp:0, atk:0, efx:6, def:0, elemB:0.20, label:'All-in EFX' },
  { hp:2, atk:4, efx:2, def:0, elemB:0.10, label:'ATK-focused' },
  { hp:2, atk:0, efx:0, def:4, elemB:0.00, label:'DEF-focused' },
];

// ── Result buckets ──────────────────────────────────────────────────────────
const ELEMENTS = ['Fire','Water','Ice','Lightning','Earth','Nature','Plasma','Air'];

// Element results: [wins, total, totalGyms, totalBattles, totalDmgDealt, totalDmgTaken]
const elR = {};
ELEMENTS.forEach(el => elR[el] = [0,0,0,0,0,0]);

// Passive results: id → [wins, total, totalGyms]
const pasR = {};
ELEMENTS.forEach(el => PASSIVES[el].forEach(p => { pasR[`${el}:${p.id}`] = [0,0,0]; }));

// Book results: bookId_level → [wins, total, totalGyms]
const bkR = {};
BOOK_IDS.forEach(bid => { for(let l=0;l<5;l++) bkR[`${bid}:${l}`]=[0,0,0]; });

// Talent results: talentIdx → [wins, total, totalGyms]
const tR = TALENT_CONFIGS.map(()=>[0,0,0]);

// Per-battleNumber difficulty: battleNum → [wins, total]
const battleDiff = [];
for(let i=0;i<50;i++) battleDiff.push([0,0]);

// ── Fast RNG (xoshiro128++ style — simpler LCG for speed) ───────────────────
let seed = Date.now() | 0;
function rng() {
  seed = Math.imul(seed ^ (seed >>> 15), seed | 1);
  seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61);
  return ((seed ^ (seed >>> 14)) >>> 0) / 0x100000000;
}
function rngInt(n) { return Math.floor(rng() * n); }

// ── Simulate one battle ─────────────────────────────────────────────────────
// Returns: { won, dmgDealt, dmgTaken, turns }
// Player state is mutated (hp, block, etc.)
function simBattle(
  // Player stats (read-only base values)
  pMaxHP, pHP, pBaseAtk, pEfx, pDef, pRevives, element,
  // Passive flags (extracted for speed)
  pas,
  // Book flags for this level
  bk,
  // Enemy
  eMaxHP, eDmg, eSP,
  // Tracking
  gymIdx
) {
  let eHP = eMaxHP;
  let hp  = pHP;
  let block = 0;
  let stone = 0;
  let burnE  = 0; // burn stacks on enemy
  let frostE = 0; // frost stacks on enemy
  let shockE = 0; // shock stacks on enemy
  let rootE  = 0; // root stacks on enemy
  let foamE  = 0; // foam stacks on enemy
  let momentum = 0; // Air momentum
  let charge = 3 + (pas.startCharge||0); // Plasma charge
  let overloadMult = 2.0;
  let airToggle = false;

  let dmgDealt = 0, dmgTaken = 0;

  // Fire: burn start from elem talent (simplified)
  // (handled via burnPS in book or passive burnPH)

  for (let turn = 0; turn < MAX_TURNS; turn++) {

    // ── PLAYER TURN ────────────────────────────────────────────────────────
    let actions = BASE_ACTIONS;

    // Rapid Tempo: extra action every other turn
    if (pas.rapidTempo) { airToggle = !airToggle; if (airToggle) actions++; }

    // Gale Sketchbook chance
    if (bk.xActChance && rng() < bk.xActChance) actions++;

    // Effective AP
    let ap = pBaseAtk;
    if (pas.apPerCharge) ap += charge * pas.apPerCharge;
    ap += Math.floor(stone * 3);
    if (pas.tailwindAP) ap += pas.tailwindAP;
    if (pas.blazingHeat) ap += Math.floor(burnE * 0.5);
    if (momentum > 0) ap += Math.floor(momentum * 0.8);

    // Wildfire: 33% chance burn doubles at turn start
    if (pas.wildfire && burnE > 0 && rng() < 0.33) burnE = Math.min(burnE * 2, 60);

    // Overload reset each turn
    if (pas.overload) overloadMult = 2.0;

    const elemMult = 1.0 + (bk._elemB || 0);

    for (let a = 0; a < actions; a++) {
      let dmg = BASE_DMG + ap;

      // Overload
      if (pas.overload) {
        dmg = Math.round(dmg * Math.max(0.25, overloadMult));
        overloadMult = Math.max(0.25, overloadMult - 0.25);
      }

      // Tome of Time: simulates faster spell cycling as bonus damage %
      if (bk.cdBonus) dmg = Math.round(dmg * (1 + bk.cdBonus));

      dmg = Math.round(dmg * elemMult);

      // Echo Grimoire: first action gets extra echo
      if (bk.echo && a === 0) dmg = Math.round(dmg * (1 + bk.echo));

      // Double Strike (Lightning)
      if (pas.dblBase) {
        const dChance = pas.dblBase + ap * (pas.dblPerAP||0);
        if (dChance >= 1.0) dmg *= 3;
        else if (rng() < dChance) dmg *= 2;
      }

      // Static Shock: bonus dmg based on enemy HP
      if (pas.staticHP && eHP > 0) {
        dmg += Math.round((pas.staticHP + ap * (pas.staticPerAP||0)) * eHP);
      }

      // Thorned Strikes: +5 dmg per root stack
      if (pas.thornDmg && rootE > 0) dmg += Math.floor(rootE * pas.thornDmg);

      eHP -= dmg;
      dmgDealt += dmg;

      // ── Elemental hit effects ──────────────────────────────────────────
      if (element === 'Fire') {
        let stacks = (pas.burnPH || 0);
        if (pas.combustion) stacks += 1 + Math.floor(burnE / 5);
        burnE += stacks * (1 + pEfx / 50);
      }
      if (element === 'Ice') {
        let stacks = 1 + (pas.frostBonus || 0);
        frostE += stacks * (1 + pEfx / 50);
      }
      if (element === 'Lightning') {
        shockE += 1 + (pas.shockPH || 0);
      }
      if (element === 'Nature') {
        let stacks = 1 + (pas.rootBonus || 0);
        rootE += stacks * (1 + pEfx / 50);
      }
      if (element === 'Water' && pas.foamPH) {
        foamE += pas.foamPH * (1 + pEfx / 50);
      }
      if (element === 'Plasma') {
        const gen = pas.stabilized ? 1 : 2;
        charge = Math.min(charge + gen, 20);
      }
      if (element === 'Air') {
        if (pas.galePH && rng() < pas.galePH) momentum += 1 + pEfx / 50;
        if (pas.eyeOfStorm && momentum > 0) {
          if (rng() < Math.min(0.95, momentum * pas.eyeOfStorm)) {
            eHP -= dmg; dmgDealt += dmg;
          }
        }
      }

      // Ice execute check
      if (pas.execute && eHP > 0) {
        const thresh = pas.execute + ap * 0.001;
        if (eHP / eMaxHP < thresh) { dmgDealt += eHP; eHP = 0; }
      }

      // ── Book per-spell effects ─────────────────────────────────────────
      if (bk.burnPS) burnE += bk.burnPS * (1 + pEfx / 50);
      if (bk.frostPS) frostE += bk.frostPS * (1 + pEfx / 50);
      if (bk.shockPS) shockE += bk.shockPS;
      if (bk.chargePS) charge = Math.min(charge + bk.chargePS, 20);
      if (bk.blockPS) {
        block += bk.blockPS + Math.floor(pDef * 2);
        if (pas.stoneOnArmor) stone++;
        if (pas.rootOnArmor) rootE++;
      }
      if (bk.healPS) {
        const h = bk.healPS * (pas.healMult || 1.0);
        hp = Math.min(pMaxHP, hp + h);
      }
      if (bk.hpCostPS) hp = Math.max(1, hp - bk.hpCostPS);

      if (eHP <= 0) break;
    }

    // Plasma stabilized: +3 charge per turn
    if (pas.stabilized) charge = Math.min(charge + 3, 20);

    // Verdant Codex regen per turn
    if (bk.regenPT) hp = Math.min(pMaxHP, hp + bk.regenPT * (pas.healMult || 1.0));

    // ── Status damage → enemy ──────────────────────────────────────────────
    if (burnE > 0 && eHP > 0) {
      const bdmg = Math.round(burnE * ((pas.burnMult||1.0) + pEfx / 100));
      eHP -= bdmg; dmgDealt += bdmg;
      burnE = Math.max(0, burnE - 1);
    }
    if (frostE > 0 && eHP > 0) {
      const fdmg = Math.round(frostE * (pas.frostDmgMult || 1));
      eHP -= fdmg; dmgDealt += fdmg;
      frostE = Math.max(0, frostE - 0.5);
    }

    if (eHP <= 0) break;

    // ── ENEMY TURN ─────────────────────────────────────────────────────────
    const shockRed  = Math.min(0.80, shockE * 0.05);
    const foamFlat  = Math.floor(foamE * 1.5);
    let rawDmg = Math.max(1, eDmg + eSP - pDef);
    rawDmg = Math.round(rawDmg * (1 - shockRed));
    rawDmg = Math.max(1, rawDmg - foamFlat);

    // Hard Shell flat reduction
    if (pas.flatRed) rawDmg = Math.max(1, rawDmg - pas.flatRed);

    // Soul Codex mutual aura: enemy also gets ATK boost
    if (bk.mutual) rawDmg += bk.atk || 0;

    // Apply block (unless fissure bypass — but that's player's fissure; enemy doesn't have it)
    let actualDmg = rawDmg;
    if (block > 0 && !pas.bypassArmor) {
      const absorbed = Math.min(block, actualDmg);
      actualDmg -= absorbed;
      block -= absorbed;
      if (block <= 0 && pas.stoneOnBreak) stone += pas.stoneOnBreak;
    }

    // Ebb reflect
    if (pas.reflect && actualDmg > 0) {
      const reflected = Math.round(actualDmg * pas.reflect);
      eHP -= reflected;
      if (eHP <= 0) { dmgDealt += reflected; break; }
    }

    hp -= actualDmg;
    dmgTaken += actualDmg;

    // Decay per turn
    shockE = Math.max(0, shockE - 0.5);
    foamE  = Math.max(0, foamE - 0.5);
    frostE = Math.max(0, frostE - 0.3);
    if (!pas.stonePersist) stone = Math.max(0, stone - 1);
    if (momentum > 0) momentum = Math.max(0, momentum - Math.max(1, Math.floor(momentum * 0.25)));

    if (hp <= 0) break;
  }

  return { won: eHP <= 0 && hp > 0, hpLeft: hp, dmgDealt, dmgTaken };
}

// ── Simulate a full run ─────────────────────────────────────────────────────
function simRun(element, passiveIdx, bookId, bookLvl, talentIdx) {
  const tc  = TALENT_CONFIGS[talentIdx];
  const pas = PASSIVES[element][passiveIdx];
  const bk  = { ...BOOKS[bookId][bookLvl], _elemB: tc.elemB };

  const maxHP = (BASE_MAX_HP + tc.hp * 15) * (pas.halfHP ? 0.5 : 1);
  const baseAtk = Math.max(0, tc.atk * 3 + (bk.atk || 0));
  const efx     = Math.max(0, tc.efx * 3 + (bk.efx || 0));
  const def     = Math.max(0, tc.def * 3 + (bk.def || 0));

  let hp = maxHP;
  let battlesWon = 0;
  let gymsBeaten = 0;
  let battleNum = 0;

  const MAX_GYMS = 3; // stop condition: beaten 3 gyms

  for (let gymIdx = 0; gymIdx < GYM_DATA.length; gymIdx++) {
    if (gymsBeaten >= MAX_GYMS) break;

    // Zone battles (8–14 per zone)
    const zoneBattles = 8 + rngInt(7);
    for (let zb = 0; zb < zoneBattles; zb++) {
      battleNum++;
      const ep = ENEMY_POOL[rngInt(ENEMY_POOL.length)];
      const eHP  = scaleHP(ep[0], gymIdx);
      const eDmg = scaleDmg(ep[1], gymIdx);
      const eSP  = scaledPow(gymIdx, false);

      const r = simBattle(maxHP, hp, baseAtk, efx, def, 0, element, pas, bk, eHP, eDmg, eSP, gymIdx);

      // Track per-battle difficulty
      if (battleNum < battleDiff.length) {
        battleDiff[battleNum][0] += r.won ? 1 : 0;
        battleDiff[battleNum][1]++;
      }

      if (r.won) {
        battlesWon++;
        hp = Math.min(maxHP, r.hpLeft + BATTLE_HEAL);
      } else {
        return { battlesWon, gymsBeaten, battleNum, survived: false };
      }
    }

    // Gym boss
    battleNum++;
    const [gBaseHP, gDmg] = GYM_DATA[gymIdx];
    const gHP = gBaseHP; // no skips in sim
    const eSP  = scaledPow(gymIdx, true);

    const r = simBattle(maxHP, hp, baseAtk, efx, def, 0, element, pas, bk, gHP, gDmg, eSP, gymIdx);

    if (battleNum < battleDiff.length) {
      battleDiff[battleNum][0] += r.won ? 1 : 0;
      battleDiff[battleNum][1]++;
    }

    if (r.won) {
      battlesWon++;
      gymsBeaten++;
      hp = Math.min(maxHP, r.hpLeft + BATTLE_HEAL);
    } else {
      return { battlesWon, gymsBeaten, battleNum, survived: false };
    }
  }

  return { battlesWon, gymsBeaten, battleNum, survived: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SIMULATION LOOP
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`Running ${TOTAL_SIMS.toLocaleString()} simulations...`);
const t0 = Date.now();

for (let sim = 0; sim < TOTAL_SIMS; sim++) {
  const element    = ELEMENTS[rngInt(8)];
  const passiveIdx = rngInt(5);
  const bookId     = BOOK_IDS[rngInt(BOOK_IDS.length)];
  const bookLvl    = rngInt(5);
  const talentIdx  = rngInt(TALENT_CONFIGS.length);

  const result = simRun(element, passiveIdx, bookId, bookLvl, talentIdx);

  const won = result.survived ? 1 : 0;
  const g   = result.gymsBeaten;
  const b   = result.battlesWon;

  // Element
  const er = elR[element];
  er[0] += won; er[1]++; er[2] += g; er[3] += b;

  // Passive
  const pk = `${element}:${PASSIVES[element][passiveIdx].id}`;
  const pr = pasR[pk];
  pr[0] += won; pr[1]++; pr[2] += g;

  // Book
  const brk = bkR[`${bookId}:${bookLvl}`];
  brk[0] += won; brk[1]++; brk[2] += g;

  // Talent
  const tr = tR[talentIdx];
  tr[0] += won; tr[1]++; tr[2] += g;

  if ((sim & 0x1FFFF) === 0) {
    const pct = ((sim / TOTAL_SIMS) * 100).toFixed(1);
    process.stdout.write(`\r${pct}%  (${((Date.now()-t0)/1000).toFixed(1)}s elapsed)  `);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\rDone in ${elapsed}s.`);

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════════════════════
const W = 60;
function hr(c='─') { return c.repeat(W); }
function pct(a,b) { return b>0 ? (a/b*100).toFixed(1) : '0.0'; }
function avg(a,b) { return b>0 ? (a/b).toFixed(2) : '0.00'; }
function pad(s, n) { return String(s).padEnd(n); }
function lpad(s, n) { return String(s).padStart(n); }

console.log('\n');
console.log('═'.repeat(W));
console.log('  WIZARD LEAGUE BALANCE REPORT');
console.log(`  ${TOTAL_SIMS.toLocaleString()} simulations  |  Stop: death OR 3 gyms beaten`);
console.log('═'.repeat(W));

// ── 1. ELEMENT RANKINGS ──────────────────────────────────────────────────────
console.log('\n── 1. ELEMENT RANKINGS ─────────────────────────────────────────');
console.log(pad('Element', 14) + lpad('Win%', 7) + lpad('AvgGyms', 9) + lpad('AvgBattles', 12));
console.log(hr());

const elemSorted = ELEMENTS.slice().sort((a,b) => {
  const aWR = elR[a][0]/(elR[a][1]||1), bWR = elR[b][0]/(elR[b][1]||1);
  return bWR - aWR;
});

// Also compute defense score (avg HP remaining proxy) and adaptability (variance of gym scores)
elemSorted.forEach((el, rank) => {
  const [w,t,g,bt] = elR[el];
  console.log(`  ${rank+1}. ${pad(el, 12)} ${lpad(pct(w,t)+'%', 7)} ${lpad(avg(g,t), 9)} ${lpad(avg(bt,t), 12)}`);
});

// ── 2. PASSIVE RANKINGS ──────────────────────────────────────────────────────
console.log('\n── 2. PASSIVE RANKINGS ──────────────────────────────────────────');
ELEMENTS.forEach(el => {
  const sorted = PASSIVES[el].slice().sort((a, b) => {
    const ak = `${el}:${a.id}`, bk = `${el}:${b.id}`;
    return (pasR[bk][0]/(pasR[bk][1]||1)) - (pasR[ak][0]/(pasR[ak][1]||1));
  });
  console.log(`\n  ${el}:`);
  console.log('  ' + pad('Passive', 22) + lpad('Win%', 7) + lpad('AvgGyms', 9) + (sorted[0]?.leg ? '' : ''));
  sorted.forEach((p, rank) => {
    const k = `${el}:${p.id}`;
    const [w,t,g] = pasR[k];
    const leg = p.leg ? ' ★LEG' : '';
    console.log(`    ${rank+1}. ${pad(p.id, 22)} ${lpad(pct(w,t)+'%', 6)} ${lpad(avg(g,t), 8)}${leg}`);
  });
});

// ── 3. SPELLBOOK RANKINGS ────────────────────────────────────────────────────
console.log('\n── 3. SPELLBOOK RANKINGS (avg across all elements) ─────────────');

const bookSummary = BOOK_IDS.map(bid => {
  let tw=0, tt=0, tg=0;
  let bestLvl=0, bestWR=0;
  for (let l=0; l<5; l++) {
    const [w,t,g] = bkR[`${bid}:${l}`];
    tw+=w; tt+=t; tg+=g;
    const wr = w/(t||1);
    if (wr > bestWR) { bestWR=wr; bestLvl=l; }
  }
  return { id:bid, wr:tw/(tt||1), avgG:tg/(tt||1), bestLvl, bestWR };
}).sort((a,b) => b.wr - a.wr);

console.log(pad('Book', 20) + lpad('Win%', 7) + lpad('BestLvl', 9) + lpad('AvgGyms', 9));
console.log(hr());
bookSummary.forEach((b, rank) => {
  console.log(`  ${rank+1}. ${pad(b.id, 18)} ${lpad((b.wr*100).toFixed(1)+'%', 7)} ${lpad(b.bestLvl+1, 9)} ${lpad(b.avgG.toFixed(2), 9)}`);
});

// Per-level breakdown for top 6 books
console.log('\n  Level-by-level breakdown (top 6 books):');
bookSummary.slice(0,6).forEach(b => {
  process.stdout.write(`  ${pad(b.id,18)}: `);
  for (let l=0; l<5; l++) {
    const [w,t] = bkR[`${b.id}:${l}`];
    process.stdout.write(`L${l+1}:${pct(w,t)}% `);
  }
  console.log();
});

// ── 4. TALENT RANKINGS ───────────────────────────────────────────────────────
console.log('\n── 4. TALENT CONFIG RANKINGS ────────────────────────────────────');
console.log(pad('Config', 32) + lpad('Win%', 7) + lpad('AvgGyms', 9));
console.log(hr());

const talSorted = TALENT_CONFIGS.map((tc, i) => ({
  i, label: tc.label,
  wr: tR[i][0]/(tR[i][1]||1),
  avgG: tR[i][2]/(tR[i][1]||1),
})).sort((a,b)=>b.wr-a.wr);

talSorted.forEach((t, rank) => {
  const tc = TALENT_CONFIGS[t.i];
  const detail = `(hp${tc.hp} atk${tc.atk} efx${tc.efx} def${tc.def} +${(tc.elemB*100).toFixed(0)}%e)`;
  console.log(`  ${rank+1}. ${pad(t.label,24)} ${lpad((t.wr*100).toFixed(1)+'%',7)} ${lpad(t.avgG.toFixed(2),9)}  ${detail}`);
});

// Marginal value per talent level (atk vs efx vs def vs hp)
console.log('\n  Marginal Win% improvement by investment type:');
const baseWR   = tR[0][0]/(tR[0][1]||1);
const atkWR    = tR[6][0]/(tR[6][1]||1);
const hpWR     = tR[7][0]/(tR[7][1]||1);
const defWR    = tR[8][0]/(tR[8][1]||1);
const efxWR    = tR[9][0]/(tR[9][1]||1);
console.log(`  Baseline:    ${(baseWR*100).toFixed(1)}%`);
console.log(`  All-in ATK:  ${(atkWR*100).toFixed(1)}%  (Δ ${((atkWR-baseWR)*100).toFixed(1)}pp)`);
console.log(`  All-in HP:   ${(hpWR*100).toFixed(1)}%  (Δ ${((hpWR-baseWR)*100).toFixed(1)}pp)`);
console.log(`  All-in DEF:  ${(defWR*100).toFixed(1)}%  (Δ ${((defWR-baseWR)*100).toFixed(1)}pp)`);
console.log(`  All-in EFX:  ${(efxWR*100).toFixed(1)}%  (Δ ${((efxWR-baseWR)*100).toFixed(1)}pp)`);

// ── 5. ENEMY DIFFICULTY CURVE ────────────────────────────────────────────────
console.log('\n── 5. ENEMY DIFFICULTY CURVE ────────────────────────────────────');
console.log('  Analytical: baseline player (no talents, no book) vs average enemy');
console.log();
for (let gi = 0; gi < 4; gi++) {
  const sHP  = scaleHP(AVG_ENEMY_HP, gi);
  const sDmg = scaleDmg(AVG_ENEMY_DMG, gi);
  const sp   = scaledPow(gi, false);
  const dps  = BASE_DMG * BASE_ACTIONS;
  const turns = Math.ceil(sHP / dps);
  const taken = Math.max(1, sDmg + sp) * turns;
  const threat = (taken / BASE_MAX_HP * 100).toFixed(0);
  const zoneStart = gi * 12 + 1, zoneEnd = gi * 12 + 12;
  console.log(`  Zone ${gi} (battles ${zoneStart}-${zoneEnd}): Enemy HP=${sHP} DMG=${sDmg}+${sp} scaledPow  → ~${turns} turns, ~${taken} dmg to player (${threat}% of base 200 HP)`);
}
console.log();
for (let gi = 0; gi < 3; gi++) {
  const [gHP, gDmg] = GYM_DATA[gi];
  const sp   = scaledPow(gi, true);
  const dps  = BASE_DMG * BASE_ACTIONS;
  const turns = Math.ceil(gHP / dps);
  const taken = (gDmg + sp) * turns;
  const threat = (taken / BASE_MAX_HP * 100).toFixed(0);
  console.log(`  Gym ${gi} boss:  HP=${gHP} DMG=${gDmg}+${sp} scaledPow → ~${turns} turns, ~${taken} dmg (${threat}% of max HP)`);
}

// Simulation win rates per battle number
console.log('\n  Battle-number win rates (from simulation):');
console.log('  Battle  Win%  (lower = harder)');
const shown = new Set();
for (let bn = 1; bn < battleDiff.length; bn++) {
  const [w,t] = battleDiff[bn];
  if (t < 100) continue;
  // Show every 2nd battle to keep output compact
  if (bn % 2 === 0 || bn <= 5) {
    console.log(`  Battle ${lpad(bn,2)}:  ${lpad(pct(w,t)+'%', 6)}  (n=${t})`);
  }
}

console.log('\n' + '═'.repeat(W));
console.log('  END OF REPORT');
console.log('═'.repeat(W));
