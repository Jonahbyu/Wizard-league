// ===== enemyAbilities.js =====
// ============================================================
// ENEMY ABILITY SYSTEM
// Each ability: { id, name, cd, baseCd, tier, fn(enemyIdx) }
// tier: 0=basic, 1=secondary, 2=legendary
// Enemies get abilities based on element + currentGymIdx (zone depth)
// ============================================================

// How many abilities an enemy gets, by zone depth (0-indexed gym)
function abilityCountForZone(gymIdx, difficulty, bonusActions){
  const base = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  return Math.min(base + Math.floor(gymIdx / 2) + (bonusActions||0), 5 + (bonusActions||0));
}

// Max tier unlocked per zone depth
function maxAbilityTierForZone(gymIdx){
  if(gymIdx <= 1) return 0;   // zones 1-2: primary only
  if(gymIdx <= 3) return 1;   // zones 3-4: up to secondary
  return 2;                   // zones 5-8: legendaries available
}

// ── ABILITY CATALOGUE ─────────────────────────────────────────────────────────
// Each fn receives (enemyIdx) and should call log/performHit/applyDirectDamage etc.
// Uses combat.enemies[enemyIdx] for the enemy, status.player for player status.

const ENEMY_ABILITY_CATALOGUE = {

  // ═══ UNIVERSAL ═══
  brace: { id:'brace', name:'Brace', emoji:'🛡️', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round((5 + Math.floor((e.statDef||0)/5)) * 1.625);
      e.status.block = (e.status.block||0) + armor;
      log(`🛡️ ${e.name} braces! (+${armor} Block)`, 'enemy');
      renderStatusTags();
    }},


  fire_ignite: { id:'fire_ignite', name:'Ignite', emoji:'🔥', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🔥 ${e.name} ignites you! (+6 Burn)`, 'enemy');
      performHit('enemy','player',{baseDamage:8,effects:[{type:'burn',stacks:6}],abilityElement:'Fire',isEnemyAttack:true});
    }},
  fire_flame_burst: { id:'fire_flame_burst', name:'Flame Burst', emoji:'💥', tier:0, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`💥 ${e.name} erupts in flames!`, 'enemy');
      performHit('enemy','player',{baseDamage:18,effects:[{type:'burn',stacks:4}],abilityElement:'Fire',isEnemyAttack:true});
    }},
  fire_combustion_strike: { id:'fire_combustion_strike', name:'Combustion Strike', emoji:'🔥', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const extra = (status.player.burnStacks||0) > 0 ? Math.floor(status.player.burnStacks * 1.5) : 0;
      log(`🔥 ${e.name} Combustion Strike! ${extra>0?`(+${extra} burn dmg)`:''}`, 'enemy');
      performHit('enemy','player',{baseDamage:14+extra,effects:[{type:'burn',stacks:3}],abilityElement:'Fire',isEnemyAttack:true});
    }},
  fire_wildfire: { id:'fire_wildfire', name:'Wildfire', emoji:'🌋', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const stacks = status.player.burnStacks||0;
      if(stacks > 0){
        status.player.burnStacks = Math.min(stacks * 2, 60);
        log(`🌋 ${e.name} Wildfire! Burn doubled (×${status.player.burnStacks})`, 'enemy');
      } else {
        status.player.burnStacks = 8;
        log(`🌋 ${e.name} Wildfire! Sets you ablaze (×8 Burn)`, 'enemy');
      }
      renderStatusTags();
    }},
  fire_magma_armor: { id:'fire_magma_armor', name:'Magma Armor', emoji:'🛡️', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round((20 + Math.floor((e.statDef||0)/5)) * 1.625);
      e.status.block = (e.status.block||0) + armor;
      log(`🛡️ ${e.name} hardens with Magma Armor! (+${armor} Block)`, 'enemy');
      renderStatusTags();
    }},
  fire_inferno: { id:'fire_inferno', name:'Inferno', emoji:'☄️', tier:2, baseCd:5,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`☄️ ${e.name} unleashes INFERNO!`, 'enemy');
      performHit('enemy','player',{baseDamage:30,effects:[{type:'burn',stacks:12}],abilityElement:'Fire',isEnemyAttack:true});
      status.player.burnStacks = Math.min((status.player.burnStacks||0) + 9, 80);
      renderStatusTags();
    }},

  // ═══ WATER ═══
  water_foam_burst: { id:'water_foam_burst', name:'Foam Burst', emoji:'🫧', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🫧 ${e.name} Foam Burst! (+3 Foam on you)`, 'enemy');
      performHit('enemy','player',{baseDamage:10,effects:[],abilityElement:'Water',isEnemyAttack:true});
      applyFoam('enemy','player',3);
      renderStatusTags();
    }},
  water_tidal_shield: { id:'water_tidal_shield', name:'Tidal Shield', emoji:'💧', tier:0, baseCd:3,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round((20 + Math.floor((e.statDef||0)/4)) * 1.625);
      e.status.block = (e.status.block||0) + armor;
      log(`💧 ${e.name} raises a Tidal Shield! (+${armor} Block)`, 'enemy');
      renderStatusTags();
    }},
  water_riptide: { id:'water_riptide', name:'Riptide', emoji:'🌊', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌊 ${e.name} Riptide! Multiple hits + Foam`, 'enemy');
      for(let h=0;h<3;h++){
        if(combat.over) return;
        performHit('enemy','player',{baseDamage:8,effects:[],abilityElement:'Water',isEnemyAttack:true,hits:1});
        applyFoam('enemy','player',1);
      }
      renderStatusTags();
    }},
  water_healing_surge: { id:'water_healing_surge', name:'Healing Surge', emoji:'💚', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i];
      const heal = 25 + Math.floor((e.statEfx||0)/3);
      const prev = e.hp;
      e.hp = Math.min(e.enemyMaxHP, e.hp + heal);
      log(`💚 ${e.name} Healing Surge! (+${e.hp-prev} HP → ${e.hp}/${e.enemyMaxHP})`, 'enemy');
      updateHPBars();
    }},
  water_drown: { id:'water_drown', name:'Drown', emoji:'🌀', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const foam = status.player.foamStacks||0;
      if(foam >= 4){
        status.player.foamStacks = 0;
        status.player.stunned = (status.player.stunned||0) + 1;
        log(`🌀 ${e.name} DROWNS you! (${foam} Foam consumed — Stunned 1t)`, 'enemy');
      } else {
        applyFoam('enemy','player',2);
        performHit('enemy','player',{baseDamage:12,effects:[],abilityElement:'Water',isEnemyAttack:true});
        log(`🌀 ${e.name} Drown — not enough Foam yet (+2 Foam)`, 'enemy');
      }
      renderStatusTags();
    }},
  water_tsunami: { id:'water_tsunami', name:'Tsunami', emoji:'🌊', tier:2, baseCd:6,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const foam = status.player.foamStacks||0;
      log(`🌊 ${e.name} calls a TSUNAMI! (${foam} Foam stacks)`, 'enemy');
      const hits = Math.max(1, foam);
      for(let h=0;h<hits;h++){
        if(combat.over) return;
        performHit('enemy','player',{baseDamage:10,effects:[],abilityElement:'Water',isEnemyAttack:true});
      }
      status.player.foamStacks = 0;
      renderStatusTags();
    }},

  // ═══ ICE ═══
  ice_frost_bolt: { id:'ice_frost_bolt', name:'Frost Bolt', emoji:'❄️', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`❄️ ${e.name} Frost Bolt!`, 'enemy');
      performHit('enemy','player',{baseDamage:12,effects:[{type:'stun',turns:1}],abilityElement:'Ice',isEnemyAttack:true});
      if(!combat.over) applyFrost('enemy','player',1);
    }},
  ice_glacial_armor: { id:'ice_glacial_armor', name:'Glacial Armor', emoji:'🧊', tier:0, baseCd:3,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round((25 + Math.floor((e.statDef||0)/4)) * 1.625);
      e.status.block = (e.status.block||0)+armor;
      log(`🧊 ${e.name} encases itself in Glacial Armor! (+${armor} Block)`, 'enemy');
      renderStatusTags();
    }},
  ice_flash_freeze: { id:'ice_flash_freeze', name:'Flash Freeze', emoji:'🌨️', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌨️ ${e.name} Flash Freeze!`, 'enemy');
      applyFrost('enemy','player',6);
      renderStatusTags();
    }},
  ice_shatter_strike: { id:'ice_shatter_strike', name:'Shatter Strike', emoji:'💎', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const frost = status.player.frostStacks||0;
      const dmg = frost >= 10 ? 40+(e.statPow||0)*2 : frost*4;
      log(`💎 ${e.name} Shatter! ${frost>=10?'FROZEN — massive hit':'('+frost+' Frost × 4)'}`, 'enemy');
      performHit('enemy','player',{baseDamage:Math.max(8,dmg),effects:[],abilityElement:'Ice',isEnemyAttack:true});
      if(!combat.over && frost<10) applyFrost('enemy','player',1);
      if(frost>=10){ status.player.frostStacks=0; status.player.frozen=0; }
      renderStatusTags();
    }},
  ice_cryostasis: { id:'ice_cryostasis', name:'Cryostasis', emoji:'🧊', tier:2, baseCd:5,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round(35 * 1.625); const heal = 30;
      e.status.block = (e.status.block||0)+armor;
      e.hp = Math.min(e.enemyMaxHP, e.hp+heal);
      e.status.stunned = Math.max(e.status.stunned||0, 1); // stuns SELF for 1t (charges up)
      log(`🧊 ${e.name} enters Cryostasis! (+${armor} Armor, +${heal} HP, charges 1t)`, 'enemy');
      updateHPBars(); renderStatusTags();
    }},

  // ═══ LIGHTNING ═══
  lightning_zap: { id:'lightning_zap', name:'Zap', emoji:'⚡', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`⚡ ${e.name} Zap!`, 'enemy');
      performHit('enemy','player',{baseDamage:12,effects:[],abilityElement:'Lightning',isEnemyAttack:true});
    }},
  lightning_chain: { id:'lightning_chain', name:'Chain Lightning', emoji:'⚡', tier:0, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`⚡ ${e.name} Chain Lightning! (×4 hits)`, 'enemy');
      for(let h=0;h<4;h++){
        if(combat.over) return;
        performHit('enemy','player',{baseDamage:6,effects:[],abilityElement:'Lightning',isEnemyAttack:true});
      }
    }},
  lightning_overcharge: { id:'lightning_overcharge', name:'Overcharge', emoji:'💥', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const shock = status.player.shockStacks||0;
      status.player.shockStacks = (status.player.shockStacks||0)+3;
      log(`💥 ${e.name} Overcharge! +3 Shock (×${status.player.shockStacks})`, 'enemy');
      performHit('enemy','player',{baseDamage:20,effects:[],abilityElement:'Lightning',isEnemyAttack:true});
    }},
  lightning_blitz: { id:'lightning_blitz', name:'Blitz', emoji:'💫', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const shock = status.player.shockStacks||0;
      if(shock > 0){
        const dmg = shock * Math.max(1, Math.floor((e.statPow||0)/2));
        log(`💫 ${e.name} BLITZ! Detonates ${shock} Shock stacks (${dmg} dmg)`, 'enemy');
        applyDirectDamage('enemy','player', dmg, '💫 Blitz');
        status.player.shockStacks = 0;
      } else {
        performHit('enemy','player',{baseDamage:18,effects:[],abilityElement:'Lightning',isEnemyAttack:true});
        log(`💫 ${e.name} Blitz — no stacks, raw hit`, 'enemy');
      }
      renderStatusTags();
    }},
  lightning_static_field: { id:'lightning_static_field', name:'Static Field', emoji:'🌩️', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i];
      // Self-buff: enemy deals 15% more dmg for 2 turns via temp power
      e._staticFieldTurns = 2;
      const bonus = Math.floor((e.statPow||0) * 0.3);
      e._staticPowerBonus = bonus;
      e.statPow = (e.statPow||0) + bonus;
      log(`🌩️ ${e.name} Static Field! (+${bonus} Power for 2t)`, 'enemy');
    }},
  lightning_charge_shot: { id:'lightning_charge_shot', name:'Charge Shot', emoji:'⚡', tier:2, baseCd:5,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`⚡ ${e.name} winds up a CHARGE SHOT — next turn massive lightning!`, 'enemy');
      e._chargeShot = true; // resolved next action
      e.status.block = (e.status.block||0)+13; // defensive while charging
      renderStatusTags();
    }},

  // ═══ EARTH ═══
  earth_fortify: { id:'earth_fortify', name:'Fortify', emoji:'🛡️', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round((20 + Math.floor((e.statDef||0)/4)) * 1.625);
      e.status.block = (e.status.block||0)+armor;
      log(`🛡️ ${e.name} Fortifies! (+${armor} Block)`, 'enemy');
      renderStatusTags();
    }},
  earth_boulder: { id:'earth_boulder', name:'Boulder Toss', emoji:'🗿', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🗿 ${e.name} Boulder Toss!`, 'enemy');
      performHit('enemy','player',{baseDamage:22,effects:[],abilityElement:'Earth',isEnemyAttack:true});
    }},
  earth_seismic: { id:'earth_seismic', name:'Seismic Wave', emoji:'🌍', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌍 ${e.name} Seismic Wave! Cracks your armor`, 'enemy');
      performHit('enemy','player',{baseDamage:16,effects:[],abilityElement:'Earth',isEnemyAttack:true});
      const crack = Math.min(status.player.block||0, 15);
      if(crack>0){ status.player.block-=crack; log(`🪨 Armor cracked by ${crack}!`,'status'); }
      renderStatusTags();
    }},
  earth_stone_stance: { id:'earth_stone_stance', name:'Stone Stance', emoji:'🧱', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round((30 + Math.floor((e.statDef||0)/3)) * 1.625);
      e.status.block = (e.status.block||0)+armor;
      // Gain stone stacks
      e.status.stoneStacks = (e.status.stoneStacks||0)+3;
      log(`🧱 ${e.name} Stone Stance! (+${armor} Block, +3 Stone stacks)`, 'enemy');
      renderStatusTags();
    }},
  earth_petrify: { id:'earth_petrify', name:'Petrify', emoji:'🗿', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🗿 ${e.name} Petrify!`, 'enemy');
      performHit('enemy','player',{baseDamage:18,effects:[{type:'stun',turns:2}],abilityElement:'Earth',isEnemyAttack:true});
    }},
  earth_cataclysm: { id:'earth_cataclysm', name:'Cataclysm', emoji:'💥', tier:2, baseCd:6,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const stone = e.status.stoneStacks||0;
      const dmg = stone>0 ? stone*25 : 50+(e.statPow||0)*2;
      log(`💥 ${e.name} CATACLYSM! ${stone>0?`(${stone} Stone×25)`:'Raw devastation'}`, 'enemy');
      performHit('enemy','player',{baseDamage:dmg,effects:[],abilityElement:'Earth',isEnemyAttack:true});
      e.status.stoneStacks=0;
      renderStatusTags();
    }},

  // ═══ NATURE ═══
  nature_entangle: { id:'nature_entangle', name:'Entangle', emoji:'🌿', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌿 ${e.name} Entangle!`, 'enemy');
      performHit('enemy','player',{baseDamage:10,effects:[],abilityElement:'Nature',isEnemyAttack:true});
      status.player.rootStacks = (status.player.rootStacks||0)+2;
      renderStatusTags();
    }},
  nature_thornwall: { id:'nature_thornwall', name:'Thornwall', emoji:'🌵', tier:0, baseCd:3,
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round((25 + Math.floor((e.statDef||0)/4)) * 1.625);
      e.status.block = (e.status.block||0)+armor;
      e.status.thornArmor = true; // flag: thorns on hit
      log(`🌵 ${e.name} Thornwall! (+${armor} Block + Thorns)`, 'enemy');
      renderStatusTags();
    }},
  nature_wild_growth: { id:'nature_wild_growth', name:'Wild Growth', emoji:'🌱', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i];
      const heal = 20 + Math.floor((e.statEfx||0)/3);
      e.hp = Math.min(e.enemyMaxHP, e.hp+heal);
      const armor = Math.round(15 * 2.1125);
      e.status.block = (e.status.block||0)+armor;
      log(`🌱 ${e.name} Wild Growth! (+${heal} HP, +${armor} Block)`, 'enemy');
      updateHPBars(); renderStatusTags();
    }},
  nature_vine_lash: { id:'nature_vine_lash', name:'Vine Lash', emoji:'🌿', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌿 ${e.name} Vine Lash! (×3 hits + Root)`, 'enemy');
      for(let h=0;h<3;h++){
        if(combat.over) return;
        performHit('enemy','player',{baseDamage:8,effects:[],abilityElement:'Nature',isEnemyAttack:true});
        if(!combat.over){ status.player.rootStacks=(status.player.rootStacks||0)+1; }
      }
      renderStatusTags();
    }},
  nature_spore_cloud: { id:'nature_spore_cloud', name:'Spore Cloud', emoji:'🍄', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🍄 ${e.name} Spore Cloud! Weakens and roots you`, 'enemy');
      status.player.rootStacks = (status.player.rootStacks||0)+3;
      // Temp power debuff on player tracked via foamStacks as proxy (visual only)
      performHit('enemy','player',{baseDamage:8,effects:[{type:'stun',turns:1}],abilityElement:'Nature',isEnemyAttack:true});
      renderStatusTags();
    }},
  nature_wrath: { id:'nature_wrath', name:"Nature's Wrath", emoji:'🌳', tier:2, baseCd:5,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      const root = status.player.rootStacks||0;
      const dmg = Math.max(20, root*20);
      log(`🌳 ${e.name} NATURE'S WRATH! (${root} Root × 20 = ${dmg} dmg)`, 'enemy');
      performHit('enemy','player',{baseDamage:dmg,effects:[],abilityElement:'Nature',isEnemyAttack:true});
      status.player.rootStacks = 0;
      renderStatusTags();
    }},

  // ═══ PLASMA ═══
  plasma_phase_strike: { id:'plasma_phase_strike', name:'Phase Strike', emoji:'🔮', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🔮 ${e.name} Phase Strike!`, 'enemy');
      performHit('enemy','player',{baseDamage:14,effects:[],abilityElement:'Plasma',isEnemyAttack:true});
    }},
  plasma_phase_shift: { id:'plasma_phase_shift', name:'Phase Shift', emoji:'✨', tier:0, baseCd:3,
    fn(i){ const e=combat.enemies[i];
      e.status.phaseTurns = 1;
      log(`✨ ${e.name} phases out! (dodges next hit)`, 'enemy');
      renderStatusTags();
    }},
  plasma_void_pulse: { id:'plasma_void_pulse', name:'Void Pulse', emoji:'🌀', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌀 ${e.name} Void Pulse!`, 'enemy');
      performHit('enemy','player',{baseDamage:20,effects:[],abilityElement:'Plasma',isEnemyAttack:true});
      // Phase self after attacking
      e.status.phaseTurns = 1;
      renderStatusTags();
    }},
  plasma_evasion_boost: { id:'plasma_evasion_boost', name:'Evasion Boost', emoji:'💜', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i];
      e.status.battleDodgeBonus = (e.status.battleDodgeBonus||0)+0.15;
      e.status.phaseTurns = 1;
      log(`💜 ${e.name} Evasion Boost! (+15% dodge + Phase)`, 'enemy');
      renderStatusTags();
    }},
  plasma_singularity: { id:'plasma_singularity', name:'Singularity', emoji:'⚫', tier:2, baseCd:6,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`⚫ ${e.name} opens a SINGULARITY!`, 'enemy');
      performHit('enemy','player',{baseDamage:35,effects:[{type:'stun',turns:1}],abilityElement:'Plasma',isEnemyAttack:true});
      e.status.phaseTurns=1; e.status.battleDodgeBonus=(e.status.battleDodgeBonus||0)+0.2;
      renderStatusTags();
    }},

  // ═══ AIR ═══
  air_twin_gust: { id:'air_twin_gust', name:'Twin Gust', emoji:'🌀', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌀 ${e.name} Twin Gust! (×2)`, 'enemy');
      performHit('enemy','player',{baseDamage:10,effects:[],abilityElement:'Air',isEnemyAttack:true,hits:2});
    }},
  air_gale_force: { id:'air_gale_force', name:'Gale Force', emoji:'💨', tier:0, baseCd:2,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`💨 ${e.name} Gale Force!`, 'enemy');
      performHit('enemy','player',{baseDamage:22,effects:[],abilityElement:'Air',isEnemyAttack:true});
    }},
  air_cyclone: { id:'air_cyclone', name:'Cyclone', emoji:'🌪️', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌪️ ${e.name} Cyclone! (×3 hits)`, 'enemy');
      performHit('enemy','player',{baseDamage:10,effects:[],abilityElement:'Air',isEnemyAttack:true,hits:3});
    }},
  air_wind_shield: { id:'air_wind_shield', name:'Wind Shield', emoji:'🌬️', tier:1, baseCd:3,
    fn(i){ const e=combat.enemies[i];
      e.status.battleDodgeBonus = (e.status.battleDodgeBonus||0)+0.2;
      const armor = Math.round(15 * 2.1125);
      e.status.block=(e.status.block||0)+armor;
      log(`🌬️ ${e.name} Wind Shield! (+20% dodge, +${armor} Block)`, 'enemy');
      renderStatusTags();
    }},
  air_sky_slam: { id:'air_sky_slam', name:'Sky Slam', emoji:'🌩️', tier:1, baseCd:4,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`🌩️ ${e.name} Sky Slam!`, 'enemy');
      performHit('enemy','player',{baseDamage:20,effects:[{type:'stun',turns:1}],abilityElement:'Air',isEnemyAttack:true});
    }},
  air_tempest: { id:'air_tempest', name:'Tempest', emoji:'⛈️', tier:2, baseCd:5,
    fn(i){ const e=combat.enemies[i]; setActiveEnemy(i);
      log(`⛈️ ${e.name} TEMPEST! (×5 rapid hits)`, 'enemy');
      performHit('enemy','player',{baseDamage:10,effects:[],abilityElement:'Air',isEnemyAttack:true,hits:5});
      e.status.battleDodgeBonus=(e.status.battleDodgeBonus||0)+0.1;
      renderStatusTags();
    }},
};

// ── ELEMENT → ABILITY POOL MAPPING ────────────────────────────────────────────
const ENEMY_ABILITY_POOL = {
  Fire:      { 0:['fire_ignite','fire_flame_burst'], 1:['fire_combustion_strike','fire_wildfire','fire_magma_armor'], 2:['fire_inferno'] },
  Water:     { 0:['water_foam_burst','water_tidal_shield'], 1:['water_riptide','water_healing_surge','water_drown'], 2:['water_tsunami'] },
  Ice:       { 0:['ice_frost_bolt','ice_glacial_armor'], 1:['ice_flash_freeze','ice_shatter_strike'], 2:['ice_cryostasis'] },
  Lightning: { 0:['lightning_zap','lightning_chain'], 1:['lightning_overcharge','lightning_blitz','lightning_static_field'], 2:['lightning_charge_shot'] },
  Earth:     { 0:['earth_fortify','earth_boulder'], 1:['earth_seismic','earth_stone_stance','earth_petrify'], 2:['earth_cataclysm'] },
  Nature:    { 0:['nature_entangle','nature_thornwall'], 1:['nature_wild_growth','nature_vine_lash','nature_spore_cloud'], 2:['nature_wrath'] },
  Plasma:    { 0:['plasma_phase_strike','plasma_phase_shift'], 1:['plasma_void_pulse','plasma_evasion_boost'], 2:['plasma_singularity'] },
  Air:       { 0:['air_twin_gust','air_gale_force'], 1:['air_cyclone','air_wind_shield','air_sky_slam'], 2:['air_tempest'] },
};

// Build ability list for an enemy based on element + zone depth
function buildEnemyAbilities(element, gymIdx, difficulty, bonusActions){
  const pool = ENEMY_ABILITY_POOL[element];
  if(!pool) return [];

  const maxTier = maxAbilityTierForZone(gymIdx);
  const count   = abilityCountForZone(gymIdx, difficulty||'easy', bonusActions||0);

  // Collect eligible ability ids by tier
  const candidates = [];
  for(let t=0; t<=maxTier; t++){
    (pool[t]||[]).forEach(id=>candidates.push({id, tier:t}));
  }

  // Pick `count` abilities, biased toward higher tiers in later zones
  const chosen = [];
  const shuffled = [...candidates].sort(()=>Math.random()-0.5);

  // Always include at least one tier-0 (basic) to anchor
  const tier0 = shuffled.filter(c=>c.tier===0);
  if(tier0.length) chosen.push(tier0[Math.floor(Math.random()*tier0.length)]);

  // Fill remainder preferring higher tiers
  const remaining = shuffled.filter(c=>!chosen.find(x=>x.id===c.id));
  remaining.sort((a,b)=>b.tier-a.tier); // higher tier first
  while(chosen.length < count && remaining.length){
    chosen.push(remaining.shift());
  }

  // Build live ability objects with individual cooldowns
  const built = chosen.map(c=>{
    const def = ENEMY_ABILITY_CATALOGUE[c.id];
    return { ...def, cd:0 };
  });

  // Every enemy always gets Brace — universal armor ability
  built.unshift({ ...ENEMY_ABILITY_CATALOGUE['brace'], cd:0 });

  return built;
}

// Called each round start to tick enemy ability cooldowns
function tickEnemyAbilityCDs(){
  combat.enemies.forEach(e=>{
    if(!e.alive || !e.abilities) return;
    e.abilities.forEach(a=>{ if(a.cd>0) a.cd--; });
    // Tick static field duration
    if(e._staticFieldTurns > 0){
      e._staticFieldTurns--;
      if(e._staticFieldTurns <= 0 && e._staticPowerBonus){
        e.statPow = Math.max(0, (e.statPow||0) - e._staticPowerBonus);
        e._staticPowerBonus = 0;
        log(`🌩️ ${e.name}'s Static Field fades.`, 'status');
      }
    }
  });
}

// Pick an ability for this enemy to use (returns ability obj or null)
function pickEnemyAbility(e, gymIdx){
  if(!e.abilities || e.abilities.length===0) return null;
  const ready = e.abilities.filter(a=>a.cd<=0);
  if(!ready.length) return null;

  const hpPct = e.hp / e.enemyMaxHP;
  const hasNoBlock = (e.status.block||0) === 0;

  // Brace: use proactively when undefended
  const brace = ready.find(a=>a.id==='brace');
  if(brace){
    const braceChance = (hpPct < 0.5 && hasNoBlock) ? 0.65 : hasNoBlock ? 0.35 : 0.15;
    if(Math.random() < braceChance) return brace;
  }

  // Below 40% HP: strongly prefer any defensive ability
  if(hpPct < 0.4){
    const defensive = ready.find(a=>
      a.id.includes('shield') || a.id.includes('armor') || a.id.includes('fortify') ||
      a.id.includes('heal') || a.id.includes('growth') || a.id.includes('cryostasis') || a.id==='brace'
    );
    if(defensive && Math.random()<0.65) return defensive;
  }

  // Use high-tier abilities when available
  if(ready.find(a=>a.tier>=1) && Math.random()<0.55){
    const powerful = ready.filter(a=>a.tier>=1);
    return powerful[Math.floor(Math.random()*powerful.length)];
  }

  // Random ability with 50% overall chance
  if(Math.random()<0.5) return ready[Math.floor(Math.random()*ready.length)];
  return null;
}

// ── ENEMY ITEM CATALOGUE ──────────────────────────────────────────────────────
const ENEMY_ITEM_CATALOGUE = [
  { id:'enemy_healing_draught', name:'Healing Draught', emoji:'🧪',
    fn(i){ const e=combat.enemies[i];
      const heal = Math.round(e.enemyMaxHP * 0.20);
      e.hp = Math.min(e.enemyMaxHP, e.hp + heal);
      log(`🧪 ${e.name} drinks a Healing Draught! (+${heal} HP)`, 'enemy');
      updateHPBars();
    }},
  { id:'enemy_iron_flask', name:'Iron Flask', emoji:'⚗️',
    fn(i){ const e=combat.enemies[i];
      const armor = Math.round(15 * 2.1125);
      e.status.block = (e.status.block||0) + armor;
      log(`⚗️ ${e.name} uses an Iron Flask! (+${armor} Block)`, 'enemy');
      renderStatusTags();
    }},
];

// Hint strings shown under each intent label
const ENEMY_ABILITY_HINTS = {
  brace:                  '6+ Block',
  fire_ignite:            '8 dmg · +6 🔥 Burn',
  fire_flame_burst:       '18 dmg · +4 🔥 Burn',
  fire_combustion_strike: '14+ dmg · +3 🔥 Burn',
  fire_wildfire:          'Doubles Burn stacks',
  fire_magma_armor:       '26+ Block',
  fire_inferno:           '30 dmg · +21 🔥 Burn',
  water_foam_burst:       '10 dmg · +3 🫧 Foam',
  water_tidal_shield:     '26+ Block',
  water_riptide:          '8 dmg ×3 · +1 Foam each',
  water_healing_surge:    'Heals 25+ HP',
  water_drown:            'Stuns if ≥4 Foam · else +2 Foam',
  water_tsunami:          '10 dmg × Foam stacks',
  ice_frost_bolt:         '12 dmg · Stun 1t · +1 ❄️ Frost',
  ice_glacial_armor:      '33+ Block',
  ice_flash_freeze:       '+6 ❄️ Frost',
  ice_shatter_strike:     'Up to 40+ dmg (scales with Frost)',
  ice_cryostasis:         '+46 Block · Heals 30 · self Stun 1t',
  lightning_zap:          '12 dmg',
  lightning_chain:        '6 dmg ×4',
  lightning_overcharge:   '20 dmg · +3 ⚡ Shock',
  lightning_blitz:        'Detonates Shock stacks for big dmg',
  lightning_static_field: '+Power for 2 turns',
  lightning_charge_shot:  'Charges — massive hit next action',
  earth_fortify:          '26+ Block',
  earth_boulder:          '22 dmg',
  earth_seismic:          '16 dmg · cracks 15 Armor',
  earth_stone_stance:     '39+ Block · +3 Stone stacks',
  earth_petrify:          '18 dmg · Stun 2t',
  earth_cataclysm:        '50+ dmg or Stone ×25',
  nature_entangle:        '10 dmg · +2 🌿 Root',
  nature_thornwall:       '33+ Block · Thorns on hit',
  nature_wild_growth:     'Heals 20+ HP · +20 Block',
  nature_vine_lash:       '8 dmg ×3 · +1 Root each',
  nature_spore_cloud:     '8 dmg · Stun 1t · +3 🌿 Root',
  nature_wrath:           'Root stacks × 20 dmg',
  plasma_phase_strike:    '14 dmg',
  plasma_phase_shift:     'Dodges next hit',
  plasma_void_pulse:      '20 dmg · gains Phase',
  plasma_evasion_boost:   '+15% dodge · gains Phase',
  plasma_singularity:     '35 dmg · Stun 1t · +20% dodge',
  air_twin_gust:          '10 dmg ×2',
  air_gale_force:         '22 dmg',
  air_cyclone:            '10 dmg ×3',
  air_wind_shield:        '+20% dodge · +20 Block',
  air_sky_slam:           '20 dmg · Stun 1t',
  air_tempest:            '10 dmg ×5',
};

// Pick an item for the enemy to use (returns item or null)
function pickEnemyItem(e){
  if(!e.items || e.items.length===0) return null;
  const hpPct = e.hp / e.enemyMaxHP;
  const heal = e.items.find(it=>it.id==='enemy_healing_draught');
  if(heal && hpPct < 0.40 && Math.random() < 0.75) return heal;
  const flask = e.items.find(it=>it.id==='enemy_iron_flask');
  if(flask && (e.status.block||0)===0 && Math.random() < 0.59) return flask;
  return null;
}

// Scale enemy base stats by zone depth (applied in makeEnemyObj)
function scaleEnemyForZone(enc, gymIdx){
  // HP and damage scale per zone — roughly +25% HP and +20% dmg per zone
  const hpMult  = 1 + gymIdx * 0.336;
  const dmgMult = 1 + gymIdx * 0.22;
  return {
    enemyMaxHP: Math.round(enc.enemyMaxHP * hpMult),
    enemyDmg:   Math.round(enc.enemyDmg   * dmgMult),
  };
}


