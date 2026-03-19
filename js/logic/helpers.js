// ===== helpers.js =====
// ─── HELPERS ─────────────────────────────────────────────────────────────────
// Pure utility functions and formulas. No DOM access.

function ceilDiv(a,b){ return Math.ceil(a/b); }
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function primaryElement(label){
  if(!label) return "";
  return label.split(/[\/ ]/)[0].trim();
}
function elementOfSide(side){
  if(side==='player') return playerElement;
  const e = combat.enemies[combat.activeEnemyIdx];
  return e ? primaryElement(e.element||'') : '';
}
function maxHPFor(side){
  if(side!=='player') return 999; // enemies use their own maxHP field
  const base = BASE_MAX_HP + (player.baseMaxHPBonus||0);
  return playerElement==='Water' ? Math.floor(base*0.5) : base;
}
function healingMultiplier(){
  let mult = hasPassive('water_restoration') ? 1.5 : 1.0;
  if(combat.activeZoneElement === 'Plasma') mult *= 1.25;
  if(player._healBonus) mult += player._healBonus;
  return mult;
}
function applyHeal(side, amount, label){
  // Defense scales heal amount: +0.5 HP per Defense point
  const defBonus = (side==='player') ? Math.floor(defenseFor('player') * 0.5) : 0;
  const baseMult = (side==='player') ? healingMultiplier() : 1.0;
  const actual = Math.round((amount + defBonus) * baseMult);
  if(side==='player'){
    const mx = maxHPFor('player');
    const before = player.hp;
    player.hp = Math.min(mx, player.hp + actual);
    const got = player.hp - before;
    if(got>0 && label) log(`${label}: +${got} HP (${player.hp}/${mx})`, 'heal');
    if(got>0 && typeof triggerHealAnim === 'function') triggerHealAnim();
    return got;
  }
  return 0;
}
function enemyScaledStat(){
  const e = combat.enemies[combat.activeEnemyIdx];
  if(e && e.scaledPower != null) return e.scaledPower;
  return Math.floor((battleNumber-1)*2);
}

// ── Three player stat accessors ───────────────────────────────────────────────
// Attack Power: scales raw hit damage
function attackPowerFor(side, targetSide){
  let pow = (side==='player') ? player.attackPower : enemyScaledStat();
  const s = (side==='player') ? status.player : (combat.enemies[combat.activeEnemyIdx]||{status:{}}).status;

  // Stone: +3 AP/stack (doubled by Stone Stance)
  const sm = s.stoneStanceThisTurn ? 2 : 1;
  pow += (s.stoneStacks||0) * 3 * sm;

  // Foam on self: -10% AP per stack
  const foamPct = Math.min(0.9, (s.foamStacks||0) * 0.10);
  pow = Math.floor(pow * (1 - foamPct));

  // Frost on self: -1 AP/stack
  pow -= (s.frostStacks||0);

  // Root bonus vs rooted targets
  if(targetSide){
    const ts = (targetSide==='player') ? status.player : (combat.enemies[combat.activeEnemyIdx]||{status:{}}).status;
    const totalRoots = (ts.rootStacks||0) + (ts.overgrowthStacks||0);
    if(totalRoots > 0){
      const bonus = hasPassive('nature_thorned_strikes') ? ROOT_POWER_PER_STACK*2 : ROOT_POWER_PER_STACK;
      pow += bonus * totalRoots;
    }
  }

  // Blazing Heat (Fire): +totalEnemyBurn/2 AP
  if(side==='player' && hasPassive('fire_blazing_heat')) pow += Math.floor(totalEnemyBurnStacks()/2);

  // Fire Rage temp power
  if(s.rageBoostTurns > 0) pow += s.rageBoostPow;

  // Overcharge/Feedback 1-turn bonus
  pow += (s.nextTurnPowerBonus||0);

  // War Cry / battle-scoped bonuses
  pow += (s.battlePowerBonus||0);

  // Plasma Energy Feedback: +1 AP per current Charge
  if(side==='player' && hasPassive('plasma_energy_feedback')){
    pow += (status.player.plasmaCharge||0);
  }

  // Air Momentum: +1 AP per Momentum stack
  if(side==='player' && playerElement==='Air'){
    pow += (status.player.momentumStacks||0);
  }

  return Math.max(0, pow);
}

// Effect Power: scales status potency (burn stacks, frost, root, shock)
function effectPowerFor(side){
  let pow = (side==='player') ? player.effectPower : enemyScaledStat();
  const s = (side==='player') ? status.player : (combat.enemies[combat.activeEnemyIdx]||{status:{}}).status;

  // Frost on self: -1 EP/stack
  pow -= (s.frostStacks||0);

  // Foam on self: -10% EP per stack
  const foamPct = Math.min(0.9, (s.foamStacks||0) * 0.10);
  pow = Math.floor(pow * (1 - foamPct));

  return Math.max(0, pow);
}

// Defense: scales armor gained, heal amounts, dodge, flat damage reduction
function defenseFor(side){
  let def = (side==='player') ? player.defense : enemyScaledStat();
  const s = (side==='player') ? status.player : (combat.enemies[combat.activeEnemyIdx]||{status:{}}).status;

  // Frost weakens defense too
  def -= Math.floor((s.frostStacks||0) * 0.5);

  return Math.max(0, def);
}

// Legacy: enemies use scaledPower as a single composite stat
function enemyPower(){ return enemyScaledStat(); }

function burnDmgPerStack(side){
  const legendary = (side==='player' && hasPassive('fire_roaring_heat')) ||
                    (side==='enemy'   && enemyHasPassive('fire_roaring_heat'));
  // _talentBurnDmg: flat bonus burn damage/stack when enemy is burning (player applied it)
  const talentBonus = (side === 'enemy') ? (player._talentBurnDmg || 0) : 0;
  return (legendary ? 1.5 : 1.0) + talentBonus;
}
function totalEnemyBurnStacks(){
  return combat.enemies.reduce((s,e)=> s + (e.alive ? (e.status.burnStacks||0) : 0), 0);
}

// ── Effective armor (block + Stone bonuses – Foam – Frost) ───────────────────
function effectiveArmor(side){
  const s = status[side];
  let armor = s.block || 0;
  const sm = s.stoneStanceThisTurn ? 2 : 1;
  armor += (s.stoneStacks||0) * 2 * sm;   // Stone: +2 block/stack
  armor -= (s.frostStacks||0);             // Frost: -1 armor/stack
  armor -= (s.foamStacks||0) * 5;          // Foam:  -5 armor/stack
  return armor; // can be negative (negative = bonus dmg to attacker)
}

// ── Power computation ────────────────────────────────────────────────────────
function powerFor(side, targetSide){
  let pow = (side==='player') ? player.attackPower : enemyPower();
  const s = status[side];

  // Stone: +3 power/stack (doubled by Stone Stance)
  const sm = s.stoneStanceThisTurn ? 2 : 1;
  pow += (s.stoneStacks||0) * 3 * sm;

  // Foam on self: -10% power per stack (own outgoing power reduced)
  const foamPct = Math.min(0.9, (s.foamStacks||0) * 0.10);
  pow = Math.floor(pow * (1 - foamPct));

  // Frost on self: -1 power/stack
  pow -= (s.frostStacks||0);

  // Root bonus vs rooted targets (Thorned Strikes or base)
  if(targetSide){
    const ts = status[targetSide];
    const totalRoots = (ts.rootStacks||0) + (ts.overgrowthStacks||0);
    if(totalRoots > 0){
      const bonus = hasPassive('nature_thorned_strikes') ? ROOT_POWER_PER_STACK*2 : ROOT_POWER_PER_STACK;
      pow += bonus * totalRoots;
    }
  }

  // Blazing Heat (Fire passive): +total enemy burn / 2
  if(side==='player' && hasPassive('fire_blazing_heat')){
    pow += Math.floor(totalEnemyBurnStacks()/2);
  }

  // Fire Rage temp power (2-turn window)
  if(s.rageBoostTurns > 0) pow += s.rageBoostPow;

  // Overcharge/Feedback: 1-turn bonus (set at round start, cleared next round start)
  pow += s.nextTurnPowerBonus || 0;

  // War Cry etc: battle-scoped bonus (resets at resetStatusForBattle)
  pow += s.battlePowerBonus || 0;

  return Math.max(0, pow);
}

// ── Armor reduction (Hard Shell / earth_hard_shell) ──────────────────────────
function armorReductionFor(side){
  // Base flat reduction: floor(Defense/10) for everyone
  const flatReduction = Math.floor(defenseFor(side)/10);
  const el = elementOfSide(side);
  // Hard Shell (Earth passive): 10 + floor(Defense/10) — overrides base
  if(el==='Earth' && ((side==='player' && hasPassive('earth_hard_shell')) ||
     (side==='enemy'  && enemyHasPassive('earth_hard_shell')))){
    return 10 + Math.floor(defenseFor(side)/10);
  }
  return flatReduction;
}

// ── Fissure check (Earth pierce) ─────────────────────────────────────────────
function isEarthFissure(attackerSide, pkg){
  return pkg.abilityElement==='Earth' && (
    (attackerSide==='player' && hasPassive('earth_fissure')) ||
    (attackerSide==='enemy'  && enemyHasPassive('earth_fissure'))
  );
}

// ── Dodge / Phase ─────────────────────────────────────────────────────────────
function dodgeChanceFor(side){
  if(status[side].phaseTurns > 0) return 1;
  // Air: Momentum grants +2% dodge per stack (cap 80%)
  if(side==='player' && playerElement==='Air'){
    return Math.min(0.80, (status.player.momentumStacks||0) * 0.02);
  }
  // Plasma Ghost Step talent: flat base dodge chance
  if(side==='player') return Math.min(0.50, player._talentDodgeBonus || 0);
  return 0;
}

// ── Cooldowns ─────────────────────────────────────────────────────────────────
function adjustedCooldownFor(side, baseCd){
  let cd = baseCd;
  if(elementOfSide(side)==='Ice'){
    cd = Math.max(0, cd-1); // Ice baseline -1 CD
  }
  return Math.max(0, cd);
}
function enemyCooldownPenaltyFor(enemyIdx){
  if(!hasPassive('ice_cold_swell')) return 0;
  const e = combat.enemies[enemyIdx];
  return (e && e.status && (e.status.frostStacks||0)>0) ? 1 : 0;
}
// legacy compat
function enemyCooldownPenalty(){ return hasPassive('ice_cold_swell') ? 1 : 0; }

// ── Actions per turn ─────────────────────────────────────────────────────────
function actionsPerTurnFor(side){
  let actions = BASE_ACTIONS_PER_TURN;
  // Shop-purchased bonus actions (player only, cooldown-limited)
  if(side==='player') actions += (player.bonusActions || 0);
  // Rapid Tempo passive: alternate +1 action every other turn
  if(elementOfSide(side)==='Air'){
    const hasRapidTempo = (side==='player' && hasPassive('air_rapid_tempo')) ||
                          (side==='enemy'  && enemyHasPassive('air_rapid_tempo'));
    if(hasRapidTempo){
      if(side==='player'){
        combat.playerAirToggle = !combat.playerAirToggle;
        if(combat.playerAirToggle) actions++;
      } else {
        combat.enemyAirToggle = !combat.enemyAirToggle;
        if(combat.enemyAirToggle) actions++;
      }
    }
  }
  return actions;
}

// ── Misc ──────────────────────────────────────────────────────────────────────
function aliveEnemies(){ return combat.enemies.filter(e=>e.alive); }
function firstAliveIdx(){ const i=combat.enemies.findIndex(e=>e.alive); return i>=0?i:0; }

function gymBossHP(){
  const g = currentGymDef();
  return g ? g.baseHP + gymSkips*GYM_SKIP_BONUS : 300;
}
// Gym card shows up as an option once the zone has run 7 battles
function gymShouldAppear(){
  if(gymDefeated) return false;
  if(!currentGymDef()) return false;
  return zoneBattleCount >= GYM_ZONE_OPEN;
}
// Gym is forced at 12 zone battles — no more choice
function gymIsForced(){ return zoneBattleCount >= GYM_ZONE_FORCE; }

function advanceToNextGym(){
  currentGymIdx++;
  zoneBattleCount = 0;
  gymSkips = 0;
  _zoneRivalDefeated = false;
  if(currentGymIdx >= GYM_ROSTER.length) gymDefeated = true;
  initZoneSpecial(); // schedule the campfire/shop for new zone
}
// ── Status application helpers ────────────────────────────────────────────────
function applyFrost(attackerSide, defenderSide, stacks){
  if(attackerSide==='player' && hasPassive('ice_stay_frosty')) stacks++;
  if(attackerSide==='player') stacks += (player._talentFrostBonus || 0);
  const s = status[defenderSide];
  s.frostStacks = (s.frostStacks||0) + stacks;
  if(s.frostStacks >= 10 && !s.frozen){
    s.frozen = true;
    s.frozenIceHitPending = true;
    s.stunned = Math.max(s.stunned||0, 1);
    log(`🧊 FROZEN! (${s.frostStacks} Frost stacks)`, 'status');
  } else {
    log(`❄️ Frost +${stacks} (×${s.frostStacks})`, 'status');
  }
}

function applyRoot(attackerSide, defenderSide, stacks){
  let total = stacks;
  if(attackerSide==='player' && hasPassive('nature_stay_rooted')) total++;
  if(attackerSide==='player') total += (player._talentRootBonus || 0);
  status[defenderSide].rootStacks = (status[defenderSide].rootStacks||0) + total;
  log(`🌿 Root +${total} (×${status[defenderSide].rootStacks})`, 'status');
  _plasmaChargeOnDebuff(defenderSide);
}

function addStoneStacks(side, stacks){
  status[side].stoneStacks = (status[side].stoneStacks||0) + stacks;
  log(`🪨 Stone +${stacks} (×${status[side].stoneStacks})`, 'status');
}

function gainBlock(side, amount){
  if(amount <= 0) return;
  // Defense scales block gained: +2 block per Defense point
  const defBonus = (side==='player') ? Math.floor(defenseFor('player') * 2) : 0;
  const total = amount + defBonus;
  status[side].block = (status[side].block||0) + total;
  if(defBonus > 0) log(`🛡️ +${total} Armor (${amount} base + ${defBonus} from Defense)`, 'status');
  if(side==='player' && typeof triggerBlockAnim === 'function') triggerBlockAnim('armor');
  // Bedrock: gain 1 stone per armor gain
  if(side==='player' && hasPassive('earth_bedrock')){
    addStoneStacks('player', 1);
  }
  // Bramble Guard: apply 1 root to all enemies on armor gain
  if(side==='player' && hasPassive('nature_bramble_guard')){
    aliveEnemies().forEach(e=>{
      const idx = combat.enemies.indexOf(e);
      setActiveEnemy(idx);
      applyRoot('player','enemy',1);
    });
    if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
  }
}

function applySelfDamage(amount, label){
  if(hasPassive('lightning_superconductor')){
    const tripled = amount * 3;
    log(`🔋 Superconductor redirects ${label} — ${tripled} dmg to enemy!`, 'status');
    applyDirectDamage('player','enemy', tripled, `🔋 ${label}`);
  } else {
    player.hp = Math.max(0, player.hp - amount);
    log(`${label}: ${amount} self damage. (${player.hp}/${maxHPFor('player')})`, 'player');
    if(typeof updateHPBars === 'function') updateHPBars();
    if(player.hp <= 0 && !combat.over) endBattle(false);
  }
}

function applyFlowToWaterPkg(pkg){
  if(!hasPassive('water_flow') || pkg.abilityElement!=='Water' || !(pkg.baseDamage>0)) return pkg;
  return {...pkg, baseDamage: Math.ceil((pkg.baseDamage||0)/2), hits: ((pkg.hits||1)*2)};
}

// Count removable debuffs on player (for Cleanse Current / Static Cleanse)
function countPlayerDebuffs(){
  const p = status.player;
  let n = 0;
  if(p.burnStacks > 0)     n++;
  if(p.frostStacks > 0)    n++;
  if(p.stunned > 0)        n++;
  if(p.rootStacks > 0)     n++;
  if(p.shockStacks > 0)    n++;
  if(p.foamStacks > 0)     n++;
  if(p.frozen)             n++;
  return n;
}
function clearPlayerDebuffs(){
  const p = status.player;
  p.burnStacks = 0;
  p.frostStacks = 0;
  p.frozen = false;
  p.frozenIceHitPending = false;
  p.stunned = 0;
  p.rootStacks = 0;
  p.shockStacks = 0;
  p.foamStacks = 0;
}

// Count removable buffs on player (block, stone — for Static Cleanse)
function countPlayerBuffs(){
  const p = status.player;
  let n = 0;
  if(p.block > 0)       n++;
  if(p.stoneStacks > 0) n++;
  if(p.firewallStacks > 0) n++;
  return n;
}
function clearPlayerBuffs(){
  const p = status.player;
  p.block = 0;
  p.stoneStacks = 0;
  p.firewallStacks = 0;
}

// Reset status at battle start
function resetStatusForBattle(){
  // Spread fresh defaults, preserving nothing from last battle
  Object.assign(status.player, {
    burnStacks:0, burnSourcePower:BASE_POWER,
    stunned:0, rootStacks:0, overgrowthStacks:0,
    foamStacks:0, shockStacks:0, shockPending:0,
    frostStacks:0, frozen:false, frozenIceHitPending:false,
    block:0, stoneStacks:0, stoneStanceThisTurn:false, firewallStacks:0,
    phaseTurns:0, lightningMult:2.0,
    greasefirePending:false, tidalShieldActive:false,
    deepCurrentActive:false, cryostasisActive:false,
    frozenGroundTurns:0, spreadingVinesTurns:0,
    debuffImmune:0, overchargePowerPending:0,
    chargeShotCharging:false, rageBoostPow:0, rageBoostTurns:0,
    nextTurnPowerBonus:0,
    battlePowerBonus:0,
    fortifyPending:0,
    // Plasma
    plasmaCharge:3, plasmaChargeHalf:0, plasmaShieldReduction:0,
    borrowedCharge:0, stallCharge:0, stallActive:false, singularityActive:false,
    // Air / Momentum
    momentumStacks:0, momentumNoDecayNext:false,
    windWallActive:false, windWallPending:0,
    tornadoAoENext:false, nextTurnBonusActions:0,
  });
  if(hasPassive('lightning_overload')) status.player.lightningMult = 2.0;
}

// Compat alias — old combat.js code used burnValueFor(power).
// New design: burn is 1 dmg/stack flat (or 1.5 with Roaring Heat).
// This shim lets any leftover calls degrade gracefully.
function burnValueFor(){ return 1; }

function hasPassive(id){ return (player.passives||[]).includes(id); }
function enemyHasPassive(id){
  const e = combat.enemies[combat.activeEnemyIdx];
  if(!e) return false;
  return e.passive===id || (e.extraPassives||[]).includes(id);
}

function pickRandom(arr,n){
  const copy=[...arr]; const result=[];
  while(result.length<n && copy.length>0){
    const i=Math.floor(Math.random()*copy.length);
    result.push(copy.splice(i,1)[0]);
  }
  return result;
}

function armorBlockAmount(){
  // Armor button: base 10 + floor(Defense/5)
  return 10 + Math.floor(defenseFor('player') / 5);
}

// ── Enemy elemental effects per basic attack ──────────────────────────────────
// Returns effects[] to pass into performHit for enemy basic attacks.
// Burn/Stun live in effects[]. Frost/Root/Shock/Foam are handled in applyEnemyElementalProc.
function enemyElementalEffects(element){
  switch(element){
    case 'Fire':      return [{ type:'burn', stacks:3 }];
    case 'Water':     return []; // Foam applied via proc
    case 'Ice':       return []; // Frost applied via proc
    case 'Lightning': return []; // Shock applied via Lightning pipeline in hit.js
    case 'Earth':     return []; // Stone/armor handled in proc
    case 'Nature':    return []; // Root proc handled in hit.js elementOfSide check
    case 'Plasma':    return []; // Dodge via passive
    case 'Air':       return []; // No status effect — just hits
    default:          return [];
  }
}

// Secondary elemental procs that need applyFrost / direct status manipulation
function applyEnemyElementalProc(element, enemyIdx){
  if(combat.over) return;
  switch(element){
    case 'Ice':
      applyFrost('enemy', 'player', 2);
      renderStatusTags();
      break;
    case 'Water':
      // Baseline foam: 1 stack per hit regardless of passive
      status.player.foamStacks = (status.player.foamStacks||0) + 1;
      log(`🫧 Foam +1 (×${status.player.foamStacks})`, 'status');
      _plasmaChargeOnDebuff('player');
      renderStatusTags();
      break;
    case 'Earth':
      // Reduce player block by 5 (armor crack)
      if(status.player.block > 0){
        const crack = Math.min(5, status.player.block);
        status.player.block -= crack;
        log(`🪨 Earth crack — your Armor reduced by ${crack}`, 'status');
        renderStatusTags();
      }
      break;
    case 'Lightning':
      // Shock is added by performHit Lightning pipeline — nothing extra needed here
      break;
    default:
      break;
  }
}


