// ===== spells.js =====
// ─── SPELL CATALOGUE ─────────────────────────────────────────────────────────

const STARTER_SPELL = {
  Fire:      'ignite',
  Water:     'tidal_surge',
  Ice:       'frost_bolt',
  Lightning: 'zap',
  Earth:     'seismic_wave',
  Nature:    'vine_strike',
  Plasma:    'plasma_lance',
  Air:       'quintuple_hit',
};

const SPELL_CATALOGUE = {

  // ════════════════════════════════ FIRE ══════════════════════════════════════
  ignite:{ id:'ignite', tier:'primary', name:'Ignite', emoji:'🔥', element:'Fire', tags:['burn'],
    desc:'Strike and heavily ignite the target', baseCooldown:1, isStarter:true,
    execute(s){ s.hit({baseDamage:5, effects:[{type:'burn',stacks:15}], abilityElement:'Fire'}); s.log('🔥 Ignite!','player'); }},

  ember_storm:{ id:'ember_storm', tier:'primary', name:'Ember Storm', emoji:'🔥', element:'Fire', tags:['burn'],
    desc:'Three rapid strikes, each fanning the flames', baseCooldown:2,
    execute(s){ s.hit({baseDamage:5, hits:3, effects:[{type:'burn',stacks:3}], abilityElement:'Fire'}); s.log('🔥 Ember Storm!','player'); }},

  flame_wave:{ id:'flame_wave', tier:'primary', name:'Flame Wave', emoji:'🌊', element:'Fire', tags:['burn'],
    desc:'Scorching wave washes over all enemies', baseCooldown:2,
    execute(s){ aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:10, effects:[{type:'burn',stacks:5}], abilityElement:'Fire', isAOE:true}); }); s.log('🌊🔥 Flame Wave!','player'); }},

  firewall:{ id:'firewall', tier:'primary', name:'Firewall', emoji:'🔥🛡', element:'Fire',
    desc:'Raise a burning shield that punishes attackers', baseCooldown:1,
    execute(s){ status.player.firewallStacks = (status.player.firewallStacks||0) + 3; s.log('🔥 Firewall raised! +3 stacks','player'); }},

  // Secondary
  grease_fire:{ id:'grease_fire', tier:'secondary', name:'Grease Fire', emoji:'🛢️', element:'Fire', requiresTag:'burn',
    desc:'Fuel the fire — Burn erupts harder this round', baseCooldown:1,
    execute(s){
      status.enemy.burnStacks = (status.enemy.burnStacks||0) + 5;
      status.player.greasefirePending = true;
      s.log('🛢️ Grease Fire! +5 Burn, double burn tick next round','player');
    }},

  extinguish:{ id:'extinguish', tier:'secondary', name:'Extinguish', emoji:'💧', element:'Fire', requiresTag:'burn',
    desc:'Trigger burn, then douse both sides — damage from the ashes', baseCooldown:2,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      // Trigger enemy burn tick now
      if(e && e.status.burnStacks > 0){
        const tickDmg = Math.round(e.status.burnStacks * burnDmgPerStack('player'));
        applyDirectDamage('player','enemy', tickDmg, '🔥 Burn (triggered)');
        if(combat.over) return;
      }
      const eRemoved = e ? Math.ceil((e.status.burnStacks||0)/2) : 0;
      const pRemoved = Math.ceil((status.player.burnStacks||0)/2);
      if(e) e.status.burnStacks = Math.max(0, (e.status.burnStacks||0) - eRemoved);
      status.player.burnStacks = Math.max(0, (status.player.burnStacks||0) - pRemoved);
      const bonusDmg = (eRemoved + pRemoved) * 2;
      if(bonusDmg > 0) applyDirectDamage('player','enemy', bonusDmg, '💧 Extinguish bonus');
      s.log(`💧 Extinguish! −${eRemoved} enemy burn, −${pRemoved} self burn, +${bonusDmg} dmg`,'player');
    }},

  fire_heal:{ id:'fire_heal', tier:'secondary', name:'Fire Heal', emoji:'❤️‍🔥', element:'Fire', requiresTag:'burn',
    desc:'Draw life from all fire on the battlefield', baseCooldown:2,
    execute(s){
      const total = totalEnemyBurnStacks() + (status.player.burnStacks||0);
      s.healSelf(Math.max(1, total));
      s.log(`❤️‍🔥 Fire Heal: +${total} HP from ${total} burn stacks`,'player');
    }},

  fire_rage:{ id:'fire_rage', tier:'secondary', name:'Fire Rage', emoji:'😤', element:'Fire', requiresTag:'burn',
    desc:'Channel the rage of fire into raw Power', baseCooldown:5,
    execute(s){
      const total = totalEnemyBurnStacks() + (status.player.burnStacks||0);
      const boost = Math.floor(total/2);
      status.player.rageBoostPow = boost;
      status.player.rageBoostTurns = 2;
      s.log(`😤 Fire Rage! +${boost} Power for 2 turns`,'player');
    }},

  brave_burn:{ id:'brave_burn', tier:'legendary', name:'Brave Burn', emoji:'🔥💀', element:'Fire',
    desc:'Match the enemy burn — become untouchable for a moment', baseCooldown:4,
    execute(s){
      const maxStacks = Math.max(...combat.enemies.map(e=>e.alive?(e.status.burnStacks||0):0));
      if(maxStacks > 0){
        status.player.burnStacks = (status.player.burnStacks||0) + maxStacks;
        s.log(`🔥💀 Brave Burn! +${maxStacks} burn to self`,'player');
      }
      status.player.debuffImmune = 1;
      s.log('🛡️ Debuff immune for 1 turn','player');
    }},

  // ════════════════════════════════ WATER ══════════════════════════════════════
  tidal_surge:{ id:'tidal_surge', tier:'primary', name:'Tidal Surge', emoji:'💧', element:'Water',
    desc:'Strike and restore your health', baseCooldown:1, isStarter:true,
    execute(s){
      s.hit(applyFlowToWaterPkg({baseDamage:20, effects:[], abilityElement:'Water'}));
      s.healSelf(10 + Math.ceil(s.defStat()/2));
      s.log('💧 Tidal Surge!','player');
    }},

  whirlpool:{ id:'whirlpool', tier:'primary', name:'Whirlpool', emoji:'🌀', element:'Water',
    desc:'Spinning vortex hits all enemies and coats them with Foam', baseCooldown:2,
    execute(s){
      aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit(applyFlowToWaterPkg({baseDamage:25, effects:[], abilityElement:'Water', isAOE:true})); status.enemy.foamStacks=(status.enemy.foamStacks||0)+3; });
      s.log('🌀 Whirlpool! +3 Foam to all','player');
    }},

  healing_tide:{ id:'healing_tide', tier:'primary', name:'Healing Tide', emoji:'💚', element:'Water',
    desc:'A healing wave washes over you', baseCooldown:2,
    execute(s){ s.healSelf(40); s.log('💚 Healing Tide!','player'); }},

  riptide:{ id:'riptide', tier:'primary', name:'Riptide', emoji:'🌊', element:'Water',
    desc:'Five rapid water strikes', baseCooldown:2,
    execute(s){ s.hit(applyFlowToWaterPkg({baseDamage:5, hits:5, effects:[], abilityElement:'Water'})); s.log('🌊 Riptide!','player'); }},

  // Secondary
  drown:{ id:'drown', tier:'secondary', name:'Drown', emoji:'🌊💀', element:'Water',
    desc:'If target has enough Foam, drown them. Otherwise, apply more', baseCooldown:1,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      const foam = e ? (e.status.foamStacks||0) : 0;
      // Adjust CD based on branch: override after the fact
      const self = player.spellbook.find(sp=>sp.id==='drown');
      if(foam >= 6){
        if(self) self.currentCD = 3; // big branch costs more
        status.enemy.stunned = Math.max(status.enemy.stunned||0, 1);
        if(e && hasPassive('water_abyssal_pain') && foam > 0){
          const reapply = Math.floor(foam/2);
          e.status.foamStacks = reapply;
          if(reapply > 0) applyDirectDamage('player','enemy', reapply*15, '🌊 Abyssal Pain');
          s.log(`🌊 Drown stuns! Abyssal Pain: ${reapply} Foam reapplied, ${reapply*15} dmg`,'player');
        } else {
          if(e) e.status.foamStacks = 0;
          s.log('🌊💀 Drown! Stunned + all Foam removed','player');
        }
      } else {
        if(self) self.currentCD = 1; // cheap branch stays at CD1
        if(e) e.status.foamStacks = (e.status.foamStacks||0) + 2;
        s.log('🌊 Drown: +2 Foam','player');
      }
    }},

  tidal_shield:{ id:'tidal_shield', tier:'secondary', name:'Tidal Shield', emoji:'🌊🛡', element:'Water',
    desc:'Shield of water — reflects Foam and heals you if struck', baseCooldown:2,
    execute(s){
      const amt = 20 + Math.floor(s.defStat()/2);
      gainBlock('player', amt);
      status.player.tidalShieldActive = true;
      s.log(`🌊🛡 Tidal Shield! +${amt} Armor, reactive active`,'player');
    }},

  deep_current:{ id:'deep_current', tier:'secondary', name:'Deep Current', emoji:'💠', element:'Water',
    desc:'Ride the current — your next Water spell fires twice', baseCooldown:3,
    execute(s){ status.player.deepCurrentActive = true; s.log('💠 Deep Current — next Water spell fires twice!','player'); }},

  cleanse_current:{ id:'cleanse_current', tier:'secondary', name:'Cleanse Current', emoji:'✨', element:'Water',
    desc:'Cleanse yourself and draw healing from each effect removed', baseCooldown:3,
    execute(s){
      const n = countPlayerDebuffs();
      clearPlayerDebuffs();
      s.healSelf(n * 20);
      s.log(`✨ Cleanse Current! ${n} effects removed, +${n*20} HP`,'player');
    }},

  tsunami:{ id:'tsunami', tier:'legendary', name:'Tsunami', emoji:'🌊🌊', element:'Water',
    desc:'Unleash all Foam in a devastating tidal wave', baseCooldown:4,
    execute(s){
      aliveEnemies().forEach(e=>{
        const foam = e.status.foamStacks||0;
        if(foam <= 0) return;
        const idx = combat.enemies.indexOf(e);
        setActiveEnemy(idx);
        for(let i=0; i<foam; i++){
          if(combat.over) return;
          applyDirectDamage('player','enemy', 10, '🌊 Tsunami');
        }
        if(!combat.over){
          if(hasPassive('water_abyssal_pain')){
            const reapply = Math.floor(foam/2);
            e.status.foamStacks = reapply;
            if(reapply > 0) applyDirectDamage('player','enemy', reapply*15, '🌊 Abyssal Pain');
          } else {
            e.status.foamStacks = 0;
          }
        }
      });
      if(!combat.over) s.log('🌊🌊 Tsunami! All Foam consumed','player');
    }},

  // ════════════════════════════════ ICE ════════════════════════════════════════
  frost_bolt:{ id:'frost_bolt', tier:'primary', name:'Frost Bolt', emoji:'❄️', element:'Ice', tags:['freeze'],
    desc:'Cold bolt that frosts the target', baseCooldown:0, isStarter:true,
    execute(s){ s.hit({baseDamage:12, effects:[], abilityElement:'Ice'}); applyFrost('player','enemy',2); s.log('❄️ Frost Bolt!','player'); }},

  ice_block:{ id:'ice_block', tier:'primary', name:'Ice Block', emoji:'🧊', element:'Ice',
    desc:'Become invulnerable and freeze the battlefield', baseCooldown:4,
    execute(s){
      status.player.phaseTurns = 1;
      aliveEnemies().forEach(e=>{ const idx=combat.enemies.indexOf(e); setActiveEnemy(idx); applyFrost('player','enemy',2); });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      s.log('🧊 Ice Block! Immune this round, 2 Frost to all enemies','player');
    }},

  glacial_spike:{ id:'glacial_spike', tier:'primary', name:'Glacial Spike', emoji:'🗡️', element:'Ice', tags:['freeze'],
    desc:'Heavy ice spike drives frost into the target', baseCooldown:2,
    execute(s){ s.hit({baseDamage:25, effects:[], abilityElement:'Ice'}); applyFrost('player','enemy',1); s.log('🗡️ Glacial Spike!','player'); }},

  snowstorm:{ id:'snowstorm', tier:'primary', name:'Snowstorm', emoji:'🌨️', element:'Ice', tags:['freeze'],
    desc:'Blizzard sweeps all enemies with frost', baseCooldown:1,
    execute(s){ aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:8, effects:[], abilityElement:'Ice', isAOE:true}); applyFrost('player','enemy',2); }); s.log('🌨️ Snowstorm!','player'); }},

  // Secondary
  flash_freeze:{ id:'flash_freeze', tier:'secondary', name:'Flash Freeze', emoji:'❄️❄️', element:'Ice', requiresTag:'freeze',
    desc:'Rapidly stack Frost on the target', baseCooldown:3,
    execute(s){ applyFrost('player','enemy',5); s.log('❄️❄️ Flash Freeze! +5 Frost','player'); }},

  shatter:{ id:'shatter', tier:'secondary', name:'Shatter', emoji:'💎', element:'Ice', requiresTag:'freeze',
    desc:'Shatter a frozen target for massive damage — or pop Frost stacks', baseCooldown:2,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(e && e.status.frozen){
        s.hit({baseDamage: 40 + Math.floor(s.attackPow()/5), effects:[], abilityElement:'Ice'});
        s.log('💎 Shatter shatters the frozen target!','player');
      } else {
        const stacks = e ? (e.status.frostStacks||0) : 0;
        if(e) e.status.frostStacks = 0;
        const dmg = stacks * 4;
        if(dmg > 0) applyDirectDamage('player','enemy', dmg, `💎 Shatter (${stacks}×4)`);
        s.log(`💎 Shatter! ${stacks} Frost×4 = ${dmg} dmg, Frost cleared`,'player');
      }
    }},

  frozen_ground:{ id:'frozen_ground', tier:'secondary', name:'Frozen Ground', emoji:'🌍❄️', element:'Ice',
    desc:'Persistent frost field chills all enemies over time', baseCooldown:4,
    execute(s){ status.player.frozenGroundTurns = 3; s.log('🌍❄️ Frozen Ground! 3 rounds of frost','player'); }},

  cryostasis:{ id:'cryostasis', tier:'secondary', name:'Cryostasis', emoji:'🧊💤', element:'Ice',
    desc:'Freeze yourself briefly — emerge healed and armored', baseCooldown:3,
    execute(s){
      status.player.stunned = Math.max(status.player.stunned||0, 1);
      s.healSelf(30);
      gainBlock('player', 20);
      status.player.cryostasisActive = true;
      s.log('🧊💤 Cryostasis! Healing while frozen','player');
    }},

  ice_age:{ id:'ice_age', tier:'legendary', name:'Ice Age', emoji:'❄️🌍', element:'Ice',
    desc:'Lock the entire battlefield in deep frost', baseCooldown:4,
    execute(s){
      aliveEnemies().forEach(e=>{
        const idx = combat.enemies.indexOf(e);
        setActiveEnemy(idx);
        const prev = e.status.frostStacks||0;
        applyFrost('player','enemy', 5);
        // If this triggered a freeze, stun extra
        if(!e.status.frozen && (prev + (hasPassive('ice_stay_frosty')?6:5)) >= 10){
          e.status.stunned = (e.status.stunned||0) + 1;
        } else if(e.status.frozen && e.status.stunned <= 1){
          e.status.stunned = Math.max(e.status.stunned||0, 2);
        }
      });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      s.log('❄️🌍 Ice Age! 5 Frost to all enemies','player');
    }},

  // ════════════════════════════════ LIGHTNING ══════════════════════════════════
  zap:{ id:'zap', tier:'primary', name:'Zap', emoji:'⚡', element:'Lightning',
    desc:'Fast lightning jab with Shock', baseCooldown:0, isStarter:true,
    execute(s){
      const bonus = Math.floor(s.attackPow()/10);
      s.hit({baseDamage:25+bonus, effects:[], abilityElement:'Lightning'});
      s.log('⚡ Zap!','player');
    }},

  chain_lightning:{ id:'chain_lightning', tier:'primary', name:'Chain Lightning', emoji:'⚡⚡', element:'Lightning',
    desc:'Arcing lightning bounces between enemies shocking each', baseCooldown:2,
    execute(s){
      const alive = aliveEnemies();
      if(!alive.length) return;
      const hitSet = new Set();
      for(let i=0; i<4; i++){
        const unhit = alive.filter(e=>!hitSet.has(e));
        const target = unhit.length ? unhit[Math.floor(Math.random()*unhit.length)] : alive[Math.floor(Math.random()*alive.length)];
        const isNew = !hitSet.has(target);
        hitSet.add(target);
        setActiveEnemy(combat.enemies.indexOf(target));
        s.hit({baseDamage:5+(isNew?1:0), effects:[], abilityElement:'Lightning'});
        if(combat.over) return;
      }
      s.log('⚡⚡ Chain Lightning bounces!','player');
    }},

  overcharge:{ id:'overcharge', tier:'primary', name:'Overcharge', emoji:'⚡💪', element:'Lightning',
    desc:'Load the target with Shock and charge yourself up', baseCooldown:2,
    execute(s){
      status.enemy.shockPending = (status.enemy.shockPending||0) + 3;
      status.player.overchargePowerPending = (status.player.overchargePowerPending||0) + 30;
      s.log('⚡💪 Overcharge! +3 Shock, +30 Power next turn','player');
    }},

  // Secondary
  blitz:{ id:'blitz', tier:'secondary', name:'Blitz', emoji:'💥⚡', element:'Lightning',
    desc:'Detonate all Shock on target for burst damage', baseCooldown:2,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      const stacks = e ? (e.status.shockStacks||0) : 0;
      if(stacks > 0){
        const dmg = stacks * Math.max(1, Math.floor(s.attackPow()/2));
        if(e) e.status.shockStacks = 0;
        applyDirectDamage('player','enemy', dmg, `💥 Blitz (${stacks} Shock)`);
        s.log(`💥⚡ Blitz! ${stacks}×${Math.floor(s.attackPow()/2)} = ${dmg} dmg`,'player');
      } else {
        s.log('💥 Blitz — no Shock to detonate','player');
      }
    }},

  recharge:{ id:'recharge', tier:'secondary', name:'Recharge', emoji:'🔋', element:'Lightning',
    desc:'Reset your Overload damage to maximum', baseCooldown:8,
    execute(s){ status.player.lightningMult = 2.0; s.log('🔋 Recharge! Overload reset to 200%','player'); }},

  electrocute:{ id:'electrocute', tier:'secondary', name:'Electrocute', emoji:'☠️⚡', element:'Lightning',
    desc:'Double the Shock on target at a painful cost', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(e){ const prev = e.status.shockStacks||0; e.status.shockStacks = prev*2; s.log(`☠️⚡ Electrocute! Shock ×2 (${e.status.shockStacks})`,'player'); }
      applySelfDamage(10, '☠️ Electrocute');
    }},

  feedback:{ id:'feedback', tier:'secondary', name:'Feedback', emoji:'🔄⚡', element:'Lightning',
    desc:'Surge of power — Shock the target and charge for next turn', baseCooldown:2,
    execute(s){
      status.enemy.shockPending = (status.enemy.shockPending||0) + 2;
      applySelfDamage(5, '🔄 Feedback');
      status.player.overchargePowerPending = (status.player.overchargePowerPending||0) + 15;
      s.log('🔄⚡ Feedback! +2 Shock, 5 self dmg, +15 Power next turn','player');
    }},

  short_circuit:{ id:'short_circuit', tier:'secondary', name:'Short Circuit', emoji:'💡', element:'Lightning',
    desc:'Scramble an enemy action — it misfires or backfires', baseCooldown:2,
    execute(s){
      const alive = aliveEnemies();
      if(!alive.length) return;
      const target = alive[Math.floor(Math.random()*alive.length)];
      const tIdx = combat.enemies.indexOf(target);
      setActiveEnemy(tIdx);
      // Randomly determine what action was "cancelled"
      const roll = Math.random();
      if(roll < 0.33){
        // Buff action cancelled → player gains it (simulate as a power boost)
        const pow = Math.floor(10 + s.effectPow() * 0.1);
        status.player.nextTurnPowerBonus = (status.player.nextTurnPowerBonus||0) + pow;
        s.log(`💡 Short Circuit! Cancelled ${target.name}'s buff — you gain +${pow} Power next turn!`,'player');
      } else if(roll < 0.66){
        // Damage action cancelled → enemy hits themselves
        const selfDmg = target.enemyDmg || 10;
        s.log(`💡 Short Circuit! ${target.name}'s attack backfires — ${selfDmg} self damage!`,'player');
        target.hp = Math.max(0, target.hp - selfDmg);
        if(target.hp <= 0){
          target.alive = false;
          log(`💀 ${target.name} defeated by own attack!`,'win');
          renderEnemyCards();
          if(aliveEnemies().length===0 && !combat.over){ endBattle(true); return; }
        } else {
          renderEnemyCards();
        }
      } else {
        // Debuff cancelled → enemy applies it to themselves (simulate as stun)
        target.status.stunned = Math.max(target.status.stunned||0, 1);
        s.log(`💡 Short Circuit! ${target.name}'s debuff reflects — they are stunned!`,'player');
      }
      // Also apply 1 Shock to target regardless
      target.status.shockPending = (target.status.shockPending||0) + 1;
      renderEnemyCards();
      if(aliveEnemies().length === 0 && !combat.over) endBattle(true);
    }},

  static_cleanse:{ id:'static_cleanse', tier:'secondary', name:'Static Cleanse', emoji:'🧹⚡', element:'Lightning',
    desc:'Discharge yourself clean and shock enemies for each effect', baseCooldown:3,
    execute(s){
      const n = countPlayerDebuffs() + countPlayerBuffs();
      clearPlayerDebuffs();
      clearPlayerBuffs();
      if(n > 0){
        status.enemy.shockPending = (status.enemy.shockPending||0) + n*2;
        s.log(`🧹⚡ Static Cleanse! ${n} effects cleared → +${n*2} Shock`,'player');
      } else {
        s.log('🧹 Static Cleanse — nothing to clear','player');
      }
    }},

  charge_shot:{ id:'charge_shot', tier:'legendary', name:'Charge Shot', emoji:'🎯⚡', element:'Lightning',
    desc:'Spend two actions to unleash a delayed area lightning blast', baseCooldown:2,
    execute(s){ status.player.chargeShotCharging = true; s.log('🎯⚡ Charge Shot charging — fires next round!','player'); }},

  // ════════════════════════════════ EARTH ══════════════════════════════════════
  seismic_wave:{ id:'seismic_wave', tier:'primary', name:'Seismic Wave', emoji:'🌊🪨', element:'Earth',
    desc:'Seismic strike that cracks enemy armor and builds yours', baseCooldown:2, isStarter:true,
    execute(s){
      s.hit({baseDamage:20, effects:[], abilityElement:'Earth'});
      if(!combat.over){
        const e = combat.enemies[combat.activeEnemyIdx];
        if(e) e.status.block = Math.max(0, (e.status.block||0) - 5);
        gainBlock('player', 5);
        s.log('🌊🪨 Seismic Wave! −5 enemy armor, +5 your armor','player');
      }
    }},

  fortify:{ id:'fortify', tier:'primary', name:'Fortify', emoji:'🏰', element:'Earth',
    desc:'Armor up — it converts to Stone stacks next turn', baseCooldown:3,
    execute(s){
      gainBlock('player', 15);
      status.player.fortifyPending = (status.player.fortifyPending||0) + 15;
      s.log('🏰 Fortify! +15 Armor (converts to Stone at end of turn)','player');
    }},

  echo_slam:{ id:'echo_slam', tier:'primary', name:'Echo Slam', emoji:'🌍', element:'Earth',
    desc:'Tremor deals more damage the more enemies are present', baseCooldown:2,
    execute(s){
      const count = aliveEnemies().length;
      const dmgPerEnemy = 5 * count;
      aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:dmgPerEnemy, effects:[], abilityElement:'Earth', isAOE:true}); });
      s.log(`🌍 Echo Slam! ${count} enemies × 5 = ${dmgPerEnemy} each`,'player');
    }},

  // Secondary
  stone_stance:{ id:'stone_stance', tier:'secondary', name:'Stone Stance', emoji:'🪨💪', element:'Earth',
    desc:'Channel your Stone for double its effect this turn', baseCooldown:1,
    execute(s){ status.player.stoneStanceThisTurn = true; s.log('🪨💪 Stone Stance! Stone effects doubled this turn','player'); }},

  stone_sanctuary:{ id:'stone_sanctuary', tier:'secondary', name:'Stone Sanctuary', emoji:'🏔️', element:'Earth',
    desc:'Multiply your Stone stacks instantly', baseCooldown:4,
    execute(s){
      status.player.stoneStacks = (status.player.stoneStacks||0) * 2;
      s.log(`🏔️ Stone Sanctuary! ×2 Stone (×${status.player.stoneStacks})`,'player');
    }},

  earthshaker:{ id:'earthshaker', tier:'secondary', name:'Earthshaker', emoji:'👊🪨', element:'Earth',
    desc:'A devastating strike that scales purely with Power', baseCooldown:3,
    execute(s){
      const dmg = s.attackPow() * 3;
      applyDirectDamage('player','enemy', dmg, '👊 Earthshaker');
      s.log(`👊🪨 Earthshaker! ${dmg} dmg (${s.attackPow()}×3)`,'player');
    }},

  dig:{ id:'dig', tier:'secondary', name:'Dig', emoji:'⛏️', element:'Earth',
    desc:'Dig in — shake off debuffs and reinforce yourself', baseCooldown:3,
    execute(s){
      clearPlayerDebuffs();
      gainBlock('player', 5);
      addStoneStacks('player', 5);
      s.log('⛏️ Dig! Debuffs cleared, +5 Armor, +5 Stone','player');
    }},

  cataclysm:{ id:'cataclysm', tier:'legendary', name:'Cataclysm', emoji:'💥🪨', element:'Earth',
    desc:'Release your Stone in a crushing area collapse', baseCooldown:4,
    execute(s){
      const stacks = status.player.stoneStacks||0;
      status.player.stoneStacks = 0;
      const dmg = stacks * 25;
      if(dmg > 0){
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); applyDirectDamage('player','enemy', dmg, `💥 Cataclysm (${stacks} Stone)`); });
      }
      s.log(`💥🪨 Cataclysm! ${stacks} Stone × 25 = ${dmg} dmg to all`,'player');
    }},

  // ════════════════════════════════ NATURE ══════════════════════════════════════
  vine_strike:{ id:'vine_strike', tier:'primary', name:'Vine Strike', emoji:'🌿', element:'Nature',
    desc:'Three quick strikes each trying to root the target', baseCooldown:0, isStarter:true,
    execute(s){
      for(let i=0; i<3; i++){
        if(combat.over) return;
        s.hit({baseDamage:5, effects:[], abilityElement:'Nature'});
        if(!combat.over && Math.random()<0.5) applyRoot('player','enemy',1);
      }
      s.log('🌿 Vine Strike!','player');
    }},

  thornwall:{ id:'thornwall', tier:'primary', name:'Thornwall', emoji:'🌵', element:'Nature',
    desc:'Raise thorned armor and ensnare the target', baseCooldown:2,
    execute(s){
      gainBlock('player', 30);
      applyRoot('player','enemy',2);
      s.log('🌵 Thornwall! +30 Armor, +2 Root','player');
    }},

  natures_call:{ id:'natures_call', tier:'primary', name:"Nature's Call", emoji:'🌳', element:'Nature',
    desc:'Call a Treant ally to fight alongside you', baseCooldown:1,
    execute(s){
      if(combat.summons.length>=4){ s.log('🌳 Max summons reached!','status'); return; }
      const isLegendary = hasPassive('nature_verdant_legion');
      const hp = isLegendary ? 50 : 25;
      const dmg = isLegendary ? 15 : 5;
      combat.summons.push({name:'Treant',emoji:'🌳',hp,maxHP:hp,dmg,cd:0,rootChance:isLegendary?1.0:0.5,id:Date.now()+Math.random()});
      s.log(`🌳 A Treant rises! (${hp} HP, ${dmg} dmg)`,'player');
      renderSummonsRow();
    }},

  bramble_burst:{ id:'bramble_burst', tier:'primary', name:'Bramble Burst', emoji:'🌵💥', element:'Nature',
    desc:'Thorny burst hits all enemies and tries to root each', baseCooldown:1,
    execute(s){
      aliveEnemies().forEach((_,i)=>{
        setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i]));
        s.hit({baseDamage:10, effects:[], abilityElement:'Nature', isAOE:true});
        if(!combat.over && Math.random()<0.5) applyRoot('player','enemy',1);
      });
      s.log('🌵💥 Bramble Burst!','player');
    }},

  // Secondary
  wild_growth:{ id:'wild_growth', tier:'secondary', name:'Wild Growth', emoji:'🌿🌿', element:'Nature',
    desc:'Vines multiply — double the target\'s Root stacks', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(e){ e.status.rootStacks = (e.status.rootStacks||0)*2; s.log(`🌿🌿 Wild Growth! Root ×2 (${e.status.rootStacks})`,'player'); }
    }},

  living_forest:{ id:'living_forest', tier:'secondary', name:'Living Forest', emoji:'🌲', element:'Nature',
    desc:'Command all Treants to strike twice this turn', baseCooldown:4,
    execute(s){
      const alive = aliveEnemies();
      if(!alive.length || !combat.summons.length){ s.log('🌲 No Treants to command!','player'); return; }
      combat.summons.forEach(t=>{
        if(t.hp<=0) return;
        for(let i=0; i<2; i++){
          const target = alive[Math.floor(Math.random()*alive.length)];
          const idx = combat.enemies.indexOf(target);
          setActiveEnemy(idx);
          applyDirectDamage('player','enemy', t.dmg, `🌲 ${t.name}`);
          if(!combat.over && Math.random()<t.rootChance) applyRoot('player','enemy',1);
          if(combat.over) return;
        }
      });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      s.log('🌲 Living Forest! All treants strike twice','player');
    }},

  spreading_vines:{ id:'spreading_vines', tier:'secondary', name:'Spreading Vines', emoji:'🌿🌍', element:'Nature',
    desc:'Spreading vines root all enemies over several rounds', baseCooldown:4,
    execute(s){ status.player.spreadingVinesTurns = 3; s.log('🌿🌍 Spreading Vines! 3 rounds of root to all','player'); }},

  nourish:{ id:'nourish', tier:'secondary', name:'Nourish', emoji:'💚🌳', element:'Nature',
    desc:'Strengthen and heal all your Treant allies', baseCooldown:3,
    execute(s){
      combat.summons.forEach(t=>{ t.maxHP+=25; t.hp=Math.min(t.maxHP, t.hp+25); t.dmg+=5; });
      gainBlock('player',1);
      renderSummonsRow();
      s.log('💚🌳 Nourish! Treants healed and strengthened','player');
    }},

  natures_wrath:{ id:'natures_wrath', tier:'legendary', name:"Nature's Wrath", emoji:'🌿💥', element:'Nature',
    desc:'Consume all Root in a crushing Nature\'s Wrath', baseCooldown:4,
    execute(s){
      aliveEnemies().forEach(e=>{
        const idx = combat.enemies.indexOf(e);
        setActiveEnemy(idx);
        const stacks = (e.status.rootStacks||0) + (e.status.overgrowthStacks||0);
        e.status.rootStacks = 0;
        e.status.overgrowthStacks = 0;
        const dmg = stacks * 20;
        if(dmg > 0) applyDirectDamage('player','enemy', dmg, `🌿 Nature's Wrath (${stacks}×20)`);
        if(combat.over) return;
      });
      if(!combat.over) s.log("🌿💥 Nature's Wrath! All Root consumed",'player');
    }},

  // ════════════════════════════════ PLASMA ══════════════════════════════════════
  // Plasma abilities do NOT consume actions — they consume Charge.
  // Each has isPlasmaAbility:true so the UI queues them separately.
  // chargeCost: fixed cost OR 'variable' (uses combat.plasmaSpendAmount)

  plasma_lance:{ id:'plasma_lance', tier:'primary', name:'Plasma Lance', emoji:'🔮', element:'Plasma',
    desc:'Spend Charge for a focused beam — heals 3 HP per Charge consumed', baseCooldown:0, isStarter:true, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(!_plasmaConsume(spend, s)) return;
      const dmg = spend * 5 + s.attackPow() + s.effectPow();
      const tgt = combat.targetIdx;
      setActiveEnemy(tgt);
      s.hit({baseDamage:dmg, effects:[], abilityElement:'Plasma', _noAtk:true});
      applyDirectDamage('enemy','player', 1, '🔮 Recoil');
      s.log(`🔮 Plasma Lance! ${spend} Charge → ${dmg} dmg`, 'player');
    }},

  energy_infusion:{ id:'energy_infusion', tier:'primary', name:'Energy Infusion', emoji:'⚡', element:'Plasma',
    desc:'Spend Charge to permanently boost Power — heals 3 HP per Charge consumed', baseCooldown:2, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(!_plasmaConsume(spend, s)) return;
      status.player.battlePowerBonus = (status.player.battlePowerBonus||0) + spend;
      s.log(`⚡ Energy Infusion! ${spend} Charge → +${spend} Power (total bonus: +${status.player.battlePowerBonus})`, 'player');
      updateStatsUI();
    }},

  plasma_shield:{ id:'plasma_shield', tier:'primary', name:'Plasma Shield', emoji:'🛡️', element:'Plasma',
    desc:'Each Charge spent adds 1% damage reduction for the battle — heals 3 HP per Charge', baseCooldown:0, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(!_plasmaConsume(spend, s)) return;
      const mult = combat.plasmaOvercharged ? 1.5 : 1;
      const pct = Math.min(75, Math.round(spend * mult));
      status.player.plasmaShieldReduction = Math.min(75, (status.player.plasmaShieldReduction||0) + pct);
      s.log(`🛡️ Plasma Shield! ${spend} Charge → ${pct}% dmg reduction (${status.player.plasmaShieldReduction}% total)`, 'player');
      renderStatusTags();
    }},

  self_sacrifice:{ id:'self_sacrifice', tier:'secondary', name:'Self Sacrifice', emoji:'💉', element:'Plasma',
    desc:'Spend Charge to deal repeated self-damage — each hit generates Charge back', baseCooldown:0, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(spend <= 0) return;
      // Consume charge WITHOUT healing (it's a sacrifice)
      if(status.player.plasmaCharge < spend){ s.log('Not enough Charge!','status'); return; }
      status.player.plasmaCharge -= spend;
      _plasmaChargeReserveAdjust(-spend);
      // 2 damage instances of 5 per charge consumed — each generates Charge naturally
      for(let i = 0; i < spend * 2; i++){
        if(combat.over) return;
        applyDirectDamage('enemy','player', 5, '💉 Self Sacrifice');
      }
      s.log(`💉 Self Sacrifice! ${spend} Charge → ${spend*2} hits of 5 self-dmg`, 'player');
    }},

  borrowed_power:{ id:'borrowed_power', tier:'secondary', name:'Borrowed Power', emoji:'⏳', element:'Plasma',
    desc:'Borrow 10 Charge immediately — owe heavy damage next turn for each unpaid', baseCooldown:0, isPlasmaAbility:true, chargeCost:10,
    execute(s){
      const borrow = Math.min(10, 10); // fixed max 10
      status.player.plasmaCharge += borrow;
      status.player.borrowedCharge = (status.player.borrowedCharge||0) + borrow;
      _plasmaConsumeHeal(0, s); // No charge consumed, no heal — just a log
      s.log(`⏳ Borrowed Power! +${borrow} Charge now. ${borrow*50} dmg next turn if unpaid.`, 'player');
      renderStatusTags();
    }},

  plasma_stall:{ id:'plasma_stall', tier:'secondary', name:'Stall', emoji:'🫧', element:'Plasma',
    desc:'Store all Charge and become immune this turn — regain it all next turn', baseCooldown:3, isPlasmaAbility:true, chargeCost:0,
    execute(s){
      const stored = status.player.plasmaCharge;
      status.player.stallCharge = stored;
      status.player.stallActive = true;
      status.player.plasmaCharge = 0;
      combat.plasmaChargeReserved = 0;
      s.log(`🫧 Stall! ${stored} Charge stored. Immune this turn. Regain next turn.`, 'player');
      renderStatusTags();
    }},

  obliteration:{ id:'obliteration', tier:'secondary', name:'Obliteration', emoji:'💀', element:'Plasma',
    desc:'Spend Charge as a barrage of hits — heals 3 HP per Charge, deals 2 hits per Charge', baseCooldown:0, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(!_plasmaConsume(spend, s)) return;
      const hitDmg = 5 + s.attackPow() + s.effectPow(); // power baked in (_noAtk skips pipeline)
      const totalHits = spend * 2;
      const tgt = combat.targetIdx;
      for(let i = 0; i < spend; i++){
        if(combat.over) return;
        setActiveEnemy(tgt);
        s.hit({baseDamage:hitDmg, effects:[], hits:2, abilityElement:'Plasma', _noAtk:true});
      }
      s.log(`💀 Obliteration! ${spend} Charge → ${totalHits} hits`, 'player');
    }},

  singularity:{ id:'singularity', tier:'legendary', name:'Singularity', emoji:'🌌', element:'Plasma',
    desc:'Double the effects of your next Plasma ability this turn', baseCooldown:4, isPlasmaAbility:true, chargeCost:0,
    execute(s){
      status.player.singularityActive = true;
      s.log(`🌌 Singularity! Next Plasma ability has doubled effects.`, 'player');
      renderStatusTags();
    }},

  // ════════════════════════════════ AIR ════════════════════════════════════════
  // Helper: applies s.hit with optional Tornado AoE expansion
  // ── Primary ──────────────────────────────────────────────────────────────────
  quintuple_hit:{ id:'quintuple_hit', tier:'primary', name:'Quintuple Hit', emoji:'💨', element:'Air',
    desc:'Strike 5 times for 3 damage each. Each hit generates Momentum.', baseCooldown:0, isStarter:true,
    execute(s){
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:3, effects:[], hits:5, abilityElement:'Air'}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:3, effects:[], hits:5, abilityElement:'Air'}); }
      s.log('💨 Quintuple Hit!','player');
    }},
  become_wind:{ id:'become_wind', tier:'primary', name:'Become Wind', emoji:'🌬️', element:'Air',
    desc:'Gain 10 Momentum. Your next successful dodge does not cause Momentum decay.', baseCooldown:2,
    execute(s){
      status.player.momentumStacks = (status.player.momentumStacks||0) + 10;
      status.player.momentumNoDecayNext = true;
      s.log(`🌬️ Become Wind! +10 Momentum (×${status.player.momentumStacks}). Next dodge: no decay.`,'player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},
  wind_wall:{ id:'wind_wall', tier:'primary', name:'Wind Wall', emoji:'🛡️', element:'Air',
    desc:'Delay one instance of incoming damage until the next turn.', baseCooldown:2,
    execute(s){
      status.player.windWallActive = true;
      s.log('🛡️ Wind Wall! Next incoming hit delayed to next turn.','player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},
  tornado:{ id:'tornado', tier:'primary', name:'Tornado', emoji:'🌪️', element:'Air',
    desc:'Deal 10 damage to all enemies. Your next offensive Air ability becomes AoE.', baseCooldown:3,
    execute(s){
      const alive = aliveEnemies();
      alive.forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:10, effects:[], abilityElement:'Air', _isTornadoSelf:true}); });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      if(!combat.over){ status.player.tornadoAoENext = true; }
      s.log('🌪️ Tornado! All enemies hit. Next Air attack is AoE.','player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},
  // ── Secondary ─────────────────────────────────────────────────────────────────
  twin_strike:{ id:'twin_strike', tier:'secondary', name:'Twin Strike', emoji:'⚔️', element:'Air',
    desc:'Strike twice for 1 damage each. Scales with Power. Does not consume an action.', baseCooldown:1,
    isFreeAction:true,
    execute(s){
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:1, effects:[], hits:2, abilityElement:'Air'}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:1, effects:[], hits:2, abilityElement:'Air'}); }
      s.log('⚔️ Twin Strike!','player');
    }},
  windy_takedown:{ id:'windy_takedown', tier:'secondary', name:'Windy Takedown', emoji:'💥', element:'Air',
    desc:'Deal 25 damage. No cooldown — use multiple times per turn.', baseCooldown:0, multiUse:true,
    execute(s){
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:25, effects:[], abilityElement:'Air'}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:25, effects:[], abilityElement:'Air'}); }
      s.log('💥 Windy Takedown!','player');
    }},
  sleeper_gust:{ id:'sleeper_gust', tier:'secondary', name:'Sleeper Gust', emoji:'😴', element:'Air',
    desc:'Hit twice for 1 damage each. Gain +1 action next turn per hit.', baseCooldown:2,
    execute(s){
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:1, effects:[], hits:2, abilityElement:'Air'}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:1, effects:[], hits:2, abilityElement:'Air'}); }
      if(!combat.over){
        status.player.nextTurnBonusActions = (status.player.nextTurnBonusActions||0) + 2;
        s.log(`😴 Sleeper Gust! +2 actions next turn (${status.player.nextTurnBonusActions} pending).`,'player');
      }
    }},
  break_momentum:{ id:'break_momentum', tier:'secondary', name:'Break Momentum', emoji:'💫', element:'Air',
    desc:'Consume all Momentum. Deal 5 damage per Momentum stack.', baseCooldown:3,
    execute(s){
      const stacks = status.player.momentumStacks||0;
      if(stacks===0){ s.log('💫 No Momentum to consume!','status'); return; }
      const dmg = stacks * 5;
      status.player.momentumStacks = 0;
      applyDirectDamage('player','enemy', dmg, `💫 Break Momentum (${stacks}×5)`);
      s.log(`💫 Break Momentum! ${stacks} stacks → ${dmg} damage!`,'player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},
  // ── Legendary ─────────────────────────────────────────────────────────────────
  storm_rush:{ id:'storm_rush', tier:'legendary', name:'Storm Rush', emoji:'⚡', element:'Air',
    desc:'Gain 3 extra actions this turn. Gain 5 Momentum. Reduce all cooldowns by 1.', baseCooldown:4, legendary:true,
    onQueue(){
      combat.actionsLeft = (combat.actionsLeft||0) + 3;
      log('⚡ Storm Rush! +3 actions available this turn.','status');
      if(typeof updateActionUI==='function') updateActionUI();
    },
    undoOnQueue(){
      combat.actionsLeft = Math.max(1, (combat.actionsLeft||0) - 3);
      if(typeof updateActionUI==='function') updateActionUI();
    },
    execute(s){
      status.player.momentumStacks = (status.player.momentumStacks||0) + 5;
      player.spellbook.forEach(sp=>{ if((sp.currentCD||0)>0) sp.currentCD = Math.max(0,sp.currentCD-1); });
      s.log(`⚡ Storm Rush! +5 Momentum (×${status.player.momentumStacks}). All CDs −1.`,'player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},

  // ════════════════════════════════ NEUTRAL ════════════════════════════════════
  power_strike:{ id:'power_strike', tier:'secondary', name:'Power Strike', emoji:'⚔️', element:'Neutral',
    desc:'Raw powerful strike', baseCooldown:1,
    execute(s){ s.hit({baseDamage:40, effects:[]}); s.log('⚔️ Power Strike!','player'); }},
  double_tap:{ id:'double_tap', tier:'secondary', name:'Double Tap', emoji:'👊', element:'Neutral',
    desc:'Two rapid strikes in quick succession', baseCooldown:1,
    execute(s){ s.hit({baseDamage:22, effects:[], hits:2}); s.log('👊 Double Tap!','player'); }},
  shield_bash:{ id:'shield_bash', tier:'secondary', name:'Shield Bash', emoji:'🛡️', element:'Neutral',
    desc:'Stunning bash that also gives cover', baseCooldown:2,
    execute(s){ s.hit({baseDamage:20, effects:[{type:'stun',turns:1}]}); gainBlock('player',15); s.log('🛡️ Shield Bash!','player'); }},
  vampiric_strike:{ id:'vampiric_strike', tier:'secondary', name:'Vampiric Strike', emoji:'🩸', element:'Neutral',
    desc:'Life-stealing strike — drain health from the target', baseCooldown:2,
    execute(s){ s.hit({baseDamage:30, effects:[]}); s.healSelf(Math.round((30+s.attackPow())*0.4)); s.log('🩸 Vampiric Strike!','player'); }},
  focus_strike:{ id:'focus_strike', tier:'secondary', name:'Focus Strike', emoji:'🎯', element:'Neutral',
    desc:'Devastating charged strike', baseCooldown:3,
    execute(s){ s.hit({baseDamage:60, effects:[]}); s.log('🎯 Focus Strike!','player'); }},
  war_cry:{ id:'war_cry', tier:'secondary', name:'War Cry', emoji:'📯', element:'Neutral',
    desc:'Battle cry — surge of Power for this fight', baseCooldown:3,
    execute(s){
      status.player.battlePowerBonus = (status.player.battlePowerBonus||0) + 10;
      s.log(`📯 War Cry! +10 Power this battle (total: +${status.player.battlePowerBonus})`,'player');
      updateStatsUI();
    }},
};

const NEUTRAL_SPELL_IDS = ['power_strike','double_tap','shield_bash','vampiric_strike','focus_strike','war_cry'];

// ── Plasma Charge Helpers ─────────────────────────────────────────────────────
function _plasmaSpend(){
  // At execution time reserved is a planning artifact — use raw charge as ceiling
  return Math.max(1, Math.min(combat.plasmaCurrentSpend||1, status.player.plasmaCharge||0));
}

function _plasmaConsumeHeal(amount, s){
  if(amount <= 0) return;
  status.player.plasmaCharge = Math.max(0, status.player.plasmaCharge - amount);
  combat.plasmaChargeReserved = Math.max(0, combat.plasmaChargeReserved - amount);
  const overMult = combat.plasmaOvercharged ? 1.5 : 1.0;

  // Reactive Field: only fires when NOT overcharged
  // When active: self-damage partially offsets the heal + damages all enemies
  // When overcharged: field goes dormant, you get full healing as reward
  if(hasPassive('plasma_reactive_field') && !combat.plasmaOvercharged){
    const selfDmg = amount * 5;
    const reactDmg = amount * 5;
    applyDirectDamage('enemy', 'player', selfDmg, `💥 Reactive Sacrifice`);
    aliveEnemies().forEach(e => {
      setActiveEnemy(combat.enemies.indexOf(e));
      applyDirectDamage('player', 'enemy', reactDmg, '💥 Reactive Field');
    });
  }

  // Heal (always — Reactive Field self-damage offsets it when not overcharged)
  const healPer = Math.round(3 * overMult);
  const totalHeal = healPer * amount;
  if(totalHeal > 0) applyHeal('player', totalHeal, `🔮 Charge Heal (${amount}×${healPer})`);

  renderStatusTags();
  updateChargeUI();
}

function _plasmaConsume(amount, s){
  if(amount <= 0){ s.log('⚠ No Charge to spend!', 'status'); return false; }
  // At execution time, reserved is a planning artifact — check raw charge
  if(amount > status.player.plasmaCharge){ s.log(`⚠ Not enough Charge (have ${status.player.plasmaCharge})`, 'status'); return false; }
  // Singularity: double amount
  if(status.player.singularityActive){
    status.player.singularityActive = false;
    amount = Math.min(amount * 2, status.player.plasmaCharge);
    combat.plasmaCurrentSpend = Math.floor(amount / 2);
    s.log('🌌 Singularity! Charge doubled.', 'status');
  }
  _plasmaConsumeHeal(amount, s);
  return true;
}

function _plasmaChargeReserveAdjust(delta){
  combat.plasmaChargeReserved = Math.max(0, (combat.plasmaChargeReserved||0) + delta);
}

function updateChargeUI(){
  const wrap = document.getElementById('plasma-charge-wrap');
  const bar = document.getElementById('plasma-charge-bar');
  const txt = document.getElementById('plasma-charge-txt');
  if(!wrap) return;
  if(playerElement !== 'Plasma'){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  const cap = 20;
  const c = status.player.plasmaCharge || 0;
  if(bar){
    bar.style.width = Math.min(100, (c / cap) * 100) + '%';
    bar.style.background = c >= cap ? '#da70d6' : c >= 15 ? '#a04ab0' : '#6a2a8a';
  }
  if(txt) txt.textContent = `⚡ Charge: ${c} / ${cap}${combat.plasmaOvercharged ? ' ✦ OVERCHARGED' : ''}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function giveStarterSpell(){
  if(playerElement === 'Plasma'){
    // Plasma starts with all primary abilities
    Object.values(SPELL_CATALOGUE).forEach(s => {
      if(s.element === 'Plasma' && s.tier === 'primary' && !player.spellbook.find(x=>x.id===s.id)){
        addSpellById(s.id);
      }
    });
  }
  // Other elements: no starter elemental spell — earn them via level-up spell choices
}
function addSpellById(id, skipBookCheck){
  const def=SPELL_CATALOGUE[id];
  if(!def) return null;
  const spell={...def, currentCD:0, upgradeLevel:0, dmgMult:1.0};
  if(!skipBookCheck && player.spellbooks && player.spellbooks.length){
    addSpellToBook(spell);
  } else {
    player.spellbook.push(spell);
  }
  return spell;
}
function addItem(id){ player.inventory.push({...ITEM_CATALOGUE[id]}); }
function removeItemAt(idx){ player.inventory.splice(idx,1); }


