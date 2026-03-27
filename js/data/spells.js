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
    execute(s){
      const stacks = Math.round(15 + _incantationBonus(this.incantationLevel||1, 3, 0.90));
      s.hit({baseDamage:5, effects:[{type:'burn',stacks}], abilityElement:'Fire'});
      s.log('🔥 Ignite!','player');
    }},

  ember_storm:{ id:'ember_storm', tier:'primary', name:'Ember Storm', emoji:'🔥', element:'Fire', tags:['burn'],
    desc:'Three rapid strikes, each fanning the flames', baseCooldown:2,
    execute(s){
      const burnPerHit = Math.round(3 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      s.hit({baseDamage:5, hits:3, effects:[{type:'burn',stacks:burnPerHit}], abilityElement:'Fire'});
      s.log('🔥 Ember Storm!','player');
    }},

  flame_wave:{ id:'flame_wave', tier:'primary', name:'Flame Wave', emoji:'🌊', element:'Fire', tags:['burn'],
    desc:'Scorching wave washes over all enemies', baseCooldown:2,
    execute(s){
      const burn = Math.round(5 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:10, effects:[{type:'burn',stacks:burn}], abilityElement:'Fire', isAOE:true}); });
      s.log('🌊🔥 Flame Wave!','player');
    }},

  firewall:{ id:'firewall', tier:'primary', name:'Firewall', emoji:'🔥🛡', element:'Fire',
    desc:'Raise a burning shield that punishes attackers', baseCooldown:1,
    execute(s){
      const stacks = Math.round(3 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      status.player.firewallStacks = (status.player.firewallStacks||0) + stacks;
      s.log(`🔥 Firewall raised! +${stacks} stacks`,'player');
    }},

  // Secondary
  grease_fire:{ id:'grease_fire', tier:'secondary', name:'Grease Fire', emoji:'🛢️', element:'Fire', requiresTag:'burn',
    desc:'Fuel the fire — Burn erupts harder this round', baseCooldown:1,
    execute(s){
      const burn = Math.round(4 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      status.enemy.burnStacks = (status.enemy.burnStacks||0) + burn;
      status.player.greasefirePending = true;
      s.log(`🛢️ Grease Fire! +${burn} Burn, double burn tick next round`,'player');
    }},

  extinguish:{ id:'extinguish', tier:'secondary', name:'Extinguish', emoji:'💧', element:'Fire', requiresTag:'burn',
    desc:'Trigger burn, then douse both sides — damage from the ashes', baseCooldown:2,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      // Trigger enemy burn tick now
      if(e && e.status.burnStacks > 0){
        const tickDmg = Math.round(e.status.burnStacks * burnDmgPerStack('player', effectPowerFor('player','enemy')));
        applyDirectDamage('player','enemy', tickDmg, '🔥 Burn (triggered)');
        if(combat.over) return;
      }
      const eRemoved = e ? Math.ceil((e.status.burnStacks||0)/2) : 0;
      const pRemoved = Math.ceil((status.player.burnStacks||0)/2);
      if(e) e.status.burnStacks = Math.max(0, (e.status.burnStacks||0) - eRemoved);
      status.player.burnStacks = Math.max(0, (status.player.burnStacks||0) - pRemoved);
      const dmgMult = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      const bonusDmg = (eRemoved + pRemoved) * dmgMult + s.attackPow();
      if(bonusDmg > 0) applyDirectDamage('player','enemy', bonusDmg, '💧 Extinguish bonus');
      s.log(`💧 Extinguish! −${eRemoved} enemy burn, −${pRemoved} self burn, +${bonusDmg} dmg`,'player');
    }},

  fire_heal:{ id:'fire_heal', tier:'secondary', name:'Fire Heal', emoji:'❤️‍🔥', element:'Fire', requiresTag:'burn',
    desc:'Draw life from all fire on the battlefield', baseCooldown:2,
    execute(s){
      const total = totalEnemyBurnStacks() + (status.player.burnStacks||0);
      const healPer = 1 + _incantationBonus(this.incantationLevel||1, 1, 0.90);
      const healed = Math.max(1, Math.round(total * healPer));
      s.healSelf(healed);
      s.log(`❤️‍🔥 Fire Heal: +${healed} HP from ${total} burn stacks`,'player');
    }},

  fire_rage:{ id:'fire_rage', tier:'secondary', name:'Fire Rage', emoji:'😤', element:'Fire', requiresTag:'burn',
    desc:'Channel the rage of fire into raw Power', baseCooldown:5,
    execute(s){
      const total = totalEnemyBurnStacks() + (status.player.burnStacks||0);
      const boost = Math.floor(total/2);
      const rageTurns = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      status.player.rageBoostPow = boost;
      status.player.rageBoostTurns = rageTurns;
      s.log(`😤 Fire Rage! +${boost} Power for ${rageTurns} turns`,'player');
    }},

  brave_burn:{ id:'brave_burn', tier:'legendary', name:'Brave Burn', emoji:'🔥💀', element:'Fire',
    desc:'Copy the highest burn stack count from any enemy onto yourself — gain debuff immunity for 1 turn', baseCooldown:4,
    execute(s){
      const maxStacks = Math.max(...combat.enemies.map(e=>e.alive?(e.status.burnStacks||0):0));
      if(maxStacks > 0){
        status.player.burnStacks = (status.player.burnStacks||0) + maxStacks;
        s.log(`🔥💀 Brave Burn! +${maxStacks} burn to self`,'player');
      }
      const immuneTurns = Math.round(1 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      status.player.debuffImmune = immuneTurns;
      s.log(`🛡️ Debuff immune for ${immuneTurns} turn${immuneTurns>1?'s':''}`,'player');
    }},

  // ──────────────────────── FIRE / MELT ────────────────────────────────────────
  // Melt is a secondary Fire damage type. applyMelt(attacker, target, pts, label)
  // strips armor at 3:1 cost (ceil(armor/3) pts to destroy all armor), then
  // remaining pts deal direct HP damage at 1:1 — bypasses shock and shields.

  melt_strike:{ id:'melt_strike', tier:'primary', name:'Melt Strike', emoji:'⚒️', element:'Fire', tags:['melt'],
    desc:'A focused lance of molten force that eats through armor at triple efficiency', baseCooldown:1,
    execute(s){
      const pts = Math.floor(12 + _incantationBonus(this.incantationLevel||1,3,0.9) + s.attackPow()*0.5);
      applyMelt('player','enemy', pts, '⚒️ Melt Strike');
      s.log('⚒️ Melt Strike!','player');
    }},

  forge_blast:{ id:'forge_blast', tier:'primary', name:'Forge Blast', emoji:'💥', element:'Fire', tags:['melt','burn'],
    desc:'A forge explosion — Melt first, then scorches the target with Burn', baseCooldown:2,
    execute(s){
      const pts = Math.floor(8 + _incantationBonus(this.incantationLevel||1,2,0.9) + s.attackPow()*0.5);
      const burn = Math.round(8 + _incantationBonus(this.incantationLevel||1,2,0.9));
      applyMelt('player','enemy', pts, '💥 Forge Blast');
      if(combat.over) return;
      s.hit({baseDamage:0, effects:[{type:'burn',stacks:burn}], abilityElement:'Fire'});
      s.log(`💥 Forge Blast! +${burn} Burn`,'player');
    }},

  crucible:{ id:'crucible', tier:'primary', name:'Crucible', emoji:'🌡️', element:'Fire', tags:['melt'],
    desc:'Super-heat the target\'s armor — doubles it, then strikes with Melt equal to half the doubled value', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      const baseArmor = e.status.block||0;
      const boosted = baseArmor * 2;
      if(boosted > 0){
        e.status._armorPeak = Math.max(e.status._armorPeak||0, boosted);
        e.status.block = boosted;
        s.log(`🌡️ Crucible! Armor ${baseArmor} → ${boosted}`,'player');
      }
      const pts = Math.floor(boosted * 0.5 + _incantationBonus(this.incantationLevel||1,2,0.9) + s.attackPow()*0.25);
      if(pts > 0) applyMelt('player','enemy', pts, '🌡️ Crucible');
      else s.log('🌡️ Crucible — no armor to exploit.','player');
    }},

  scorch_through:{ id:'scorch_through', tier:'primary', name:'Scorch Through', emoji:'🌊', element:'Fire', tags:['melt'],
    desc:'A wave of scorching heat melts through all enemies', baseCooldown:2,
    execute(s){
      const pts = Math.floor(8 + _incantationBonus(this.incantationLevel||1,2,0.9) + s.attackPow()*0.5);
      const origTarget = combat.targetIdx;
      aliveEnemies().forEach((_,i)=>{
        setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i]));
        applyMelt('player','enemy', pts, '🌊 Scorch Through');
        if(combat.over) return;
      });
      if(!combat.over) setActiveEnemy(origTarget);
      s.log(`🌊 Scorch Through! (${pts} Melt to all)`,'player');
    }},

  slag:{ id:'slag', tier:'primary', name:'Slag', emoji:'🔶', element:'Fire', tags:['melt','burn'],
    desc:'Coat the target in molten slag — small Melt hit that converts any armor consumed into Burn stacks', baseCooldown:1,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      const armorBefore = e.status.block||0;
      const pts = Math.floor(6 + _incantationBonus(this.incantationLevel||1,2,0.9) + s.attackPow()*0.5);
      applyMelt('player','enemy', pts, '🔶 Slag');
      if(combat.over) return;
      const armorConsumed = armorBefore - (e.status.block||0);
      if(armorConsumed > 0 && !hasPassive('fire_slag_trail')){
        // Slag Trail passive handles this globally; Slag spell does it independently
        e.status.burnStacks = (e.status.burnStacks||0) + armorConsumed;
        s.log(`🔶 Slag: +${armorConsumed} Burn from melted armor!`,'player');
      }
    }},

  heat_surge:{ id:'heat_surge', tier:'primary', name:'Heat Surge', emoji:'❤️‍🔥', element:'Fire', tags:['melt'],
    desc:'A surge of intense heat — heavy Melt damage and heals you for half the HP damage dealt', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      const pts = Math.floor(16 + _incantationBonus(this.incantationLevel||1,3,0.9) + s.attackPow()*0.5);
      const hpBefore = e.hp;
      applyMelt('player','enemy', pts, '❤️‍🔥 Heat Surge');
      if(combat.over) return;
      const hpDmg = Math.max(0, hpBefore - (e.hp||0));
      if(hpDmg > 0){
        const healed = Math.floor(hpDmg * 0.5);
        if(healed > 0){ s.healSelf(healed); s.log(`❤️‍🔥 Heat Surge: healed ${healed} from ${hpDmg} HP damage`,'player'); }
      }
    }},

  // Secondary Melt
  smelt:{ id:'smelt', tier:'secondary', name:'Smelt', emoji:'⚗️', element:'Fire', tags:['melt'],
    desc:'Convert enemy Burn into Melt energy — each 3 Burn stacks consumed = 1 Melt point, then armor, then HP', baseCooldown:2,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      let pts = Math.floor(8 + _incantationBonus(this.incantationLevel||1,2,0.9) + s.attackPow()*0.5);
      const burn = e.status.burnStacks||0;
      if(burn > 0 && pts > 0){
        const burnCost = Math.ceil(burn / 3);
        if(pts >= burnCost){
          pts -= burnCost;
          e.status.burnStacks = 0;
          s.log(`⚗️ Smelt: burns out all ${burn} Burn! (${burnCost} pts used, ${pts} remain)`,'player');
        } else {
          e.status.burnStacks = Math.max(0, burn - pts*3);
          s.log(`⚗️ Smelt: chips ${pts*3} Burn (${e.status.burnStacks} remain)`,'player');
          pts = 0;
        }
      }
      if(pts > 0) applyMelt('player','enemy', pts, '⚗️ Smelt');
      else if(burn === 0) s.log('⚗️ Smelt! (no Burn to convert)','player');
    }},

  overheat:{ id:'overheat', tier:'secondary', name:'Overheat', emoji:'🌡️', element:'Fire', requiresTag:'burn', tags:['melt'],
    desc:'Consume your own Burn stacks — deal Melt equal to stacks consumed plus power scaling', baseCooldown:3,
    execute(s){
      const selfBurn = status.player.burnStacks||0;
      if(selfBurn > 0) status.player.burnStacks = 0;
      const pts = Math.floor(selfBurn + _incantationBonus(this.incantationLevel||1,2,0.9) + s.attackPow()*0.5);
      s.log(`🌡️ Overheat! ${selfBurn} Burn consumed → ${pts} Melt pts`,'player');
      if(pts > 0) applyMelt('player','enemy', pts, '🌡️ Overheat');
    }},

  crucible_burst:{ id:'crucible_burst', tier:'secondary', name:'Crucible Burst', emoji:'💥', element:'Fire', tags:['melt'],
    desc:'Massive Melt if the enemy has heavy armor (15+), weaker otherwise', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      const armor = e.status.block||0;
      const incant = _incantationBonus(this.incantationLevel||1,3,0.9);
      const pts = armor >= 15
        ? Math.floor(30 + incant + s.attackPow()*0.5)
        : Math.floor(10 + incant + s.attackPow()*0.5);
      s.log(`💥 Crucible Burst! ${armor>=15?'Heavy':'Light'} armor — ${pts} Melt pts`,'player');
      applyMelt('player','enemy', pts, '💥 Crucible Burst');
    }},

  molten_surge:{ id:'molten_surge', tier:'secondary', name:'Molten Surge', emoji:'🌋', element:'Fire', tags:['melt'],
    desc:'The forge surges — all Melt hits this turn deal double damage', baseCooldown:4,
    execute(s){
      combat.meltDoubleTurn = true;
      s.log('🌋 Molten Surge! All Melt doubled this turn.','player');
    }},

  melt_down:{ id:'melt_down', tier:'secondary', name:'Melt Down', emoji:'🫠', element:'Fire', tags:['melt'],
    desc:'Force-break all enemy armor and deal 1.5× its value as Melt damage', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      const armor = e.status.block||0;
      const incant = Math.floor(_incantationBonus(this.incantationLevel||1,2,0.9));
      let pts;
      if(armor > 0){
        e.status._armorPeak = Math.max(e.status._armorPeak||0, armor);
        pts = Math.floor(armor * 1.5) + incant;
        // Trigger Meltdown legendary manually (bypassing applyMelt's armor path)
        if(hasPassive('fire_meltdown')){
          const peak = e.status._armorPeak;
          pts += Math.round(peak);
          s.log(`🌋 Meltdown! +${Math.round(peak)} from peak armor!`,'player');
        }
        e.status._armorPeak = 0;
        e.status.block = 0;
        s.log(`🫠 Melt Down! ${armor} armor broken → ${pts} Melt pts`,'player');
        // Slag Trail (manually, since block is already 0 when applyMelt runs)
        if(hasPassive('fire_slag_trail')){
          e.status.burnStacks = (e.status.burnStacks||0) + armor;
          s.log(`🔥 Slag Trail: +${armor} Burn from Melt Down!`,'player');
        }
      } else {
        pts = Math.floor(12 + incant + s.attackPow()*0.5);
        s.log(`🫠 Melt Down! No armor — ${pts} Melt`,'player');
      }
      if(pts > 0) applyMelt('player','enemy', pts, '🫠 Melt Down');
    }},

  temper:{ id:'temper', tier:'secondary', name:'Temper', emoji:'⚔️', element:'Fire', tags:['melt'],
    desc:'Temper your next strike — the next Melt hit this battle deals double damage', baseCooldown:2,
    execute(s){
      combat.nextMeltDouble = true;
      s.log('⚔️ Temper! Next Melt hit doubled.','player');
    }},

  // Legendary Melt
  white_heat:{ id:'white_heat', tier:'legendary', name:'White Heat', emoji:'🤍', element:'Fire', tags:['melt'],
    desc:'Pure molten force — no base value, scales entirely with Attack Power for massive late-game damage', baseCooldown:5,
    execute(s){
      const pts = Math.floor(s.attackPow()*0.5 + _incantationBonus(this.incantationLevel||1,5,0.9));
      s.log(`🤍 White Heat! ${pts} pure Melt`,'player');
      if(pts > 0) applyMelt('player','enemy', pts, '🤍 White Heat');
    }},

  searing_verdict:{ id:'searing_verdict', tier:'legendary', name:'Searing Verdict', emoji:'⚖️', element:'Fire', tags:['melt'],
    desc:'A final judgment — scales with every kill this run. More kills = more Melt.', baseCooldown:5,
    execute(s){
      const kills = _runKillsThisRun||0;
      const pts = Math.floor(15 + kills*3 + s.attackPow()*0.5 + _incantationBonus(this.incantationLevel||1,3,0.9));
      s.log(`⚖️ Searing Verdict! ${kills} kills → ${pts} Melt pts`,'player');
      applyMelt('player','enemy', pts, '⚖️ Searing Verdict');
    }},

  // ════════════════════════════════ WATER ══════════════════════════════════════
  tidal_surge:{ id:'tidal_surge', tier:'primary', name:'Tidal Surge', emoji:'💧', element:'Water',
    desc:'Strike and restore your health', baseCooldown:1, isStarter:true,
    execute(s){
      s.hit(applyFlowToWaterPkg({baseDamage:20, effects:[], abilityElement:'Water'}));
      const healBase = 10 + _incantationBonus(this.incantationLevel||1, 3, 0.90);
      s.healSelf(Math.round(healBase) + Math.ceil(s.defStat()/2));
      s.log('💧 Tidal Surge!','player');
    }},

  whirlpool:{ id:'whirlpool', tier:'primary', name:'Whirlpool', emoji:'🌀', element:'Water',
    desc:'Spinning vortex hits all enemies and coats them with Foam', baseCooldown:2,
    execute(s){
      const foam = Math.round(3 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit(applyFlowToWaterPkg({baseDamage:25, effects:[], abilityElement:'Water', isAOE:true, apMult:1.25})); applyFoam('player','enemy',foam); });
      s.log(`🌀 Whirlpool! +${foam} Foam to all`,'player');
    }},

  healing_tide:{ id:'healing_tide', tier:'primary', name:'Healing Tide', emoji:'💚', element:'Water',
    desc:'A healing wave washes over you', baseCooldown:2,
    execute(s){
      const amt = Math.round(40 + _incantationBonus(this.incantationLevel||1, 8, 0.95));
      s.healSelf(amt);
      s.log('💚 Healing Tide!','player');
    }},

  riptide:{ id:'riptide', tier:'primary', name:'Riptide', emoji:'🌊', element:'Water',
    desc:'Rapid water strikes. Hits increase with incantation level.', baseCooldown:2,
    execute(s){
      const hits = Math.round(3 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      s.hit(applyFlowToWaterPkg({baseDamage:5, hits, effects:[], abilityElement:'Water', apMult:0.35}));
      s.log('🌊 Riptide!','player');
    }},

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
          const abyssalDmg = reapply*15 + s.attackPow();
          if(reapply > 0) applyDirectDamage('player','enemy', abyssalDmg, '🌊 Abyssal Pain');
          s.log(`🌊 Drown stuns! Abyssal Pain: ${reapply} Foam reapplied, ${abyssalDmg} dmg`,'player');
        } else {
          if(e) e.status.foamStacks = 0;
          s.log('🌊💀 Drown! Stunned + all Foam removed','player');
        }
      } else {
        if(self) self.currentCD = 1; // cheap branch stays at CD1
        const foamAmt = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
        if(e) applyFoam('player','enemy', foamAmt);
        s.log(`🌊 Drown: +${foamAmt} Foam`,'player');
      }
    }},

  tidal_shield:{ id:'tidal_shield', tier:'secondary', name:'Tidal Shield', emoji:'🌊🛡', element:'Water',
    desc:'Shield of water — reflects Foam and heals you if struck', baseCooldown:2,
    execute(s){
      const base = Math.round(20 + _incantationBonus(this.incantationLevel||1, 4, 0.95));
      const amt = base + Math.floor(s.defStat()/2);
      gainBlock('player', amt);
      status.player.tidalShieldActive = true;
      s.log(`🌊🛡 Tidal Shield! +${amt} Armor, reactive active`,'player');
    }},

  deep_current:{ id:'deep_current', tier:'secondary', name:'Deep Current', emoji:'💠', element:'Water',
    desc:'Ride the current — your next Water spell fires twice', baseCooldown:3,
    execute(s){
      const armor = Math.round(_incantationBonus(this.incantationLevel||1, 5, 0.95));
      status.player.deepCurrentActive = true;
      if(armor > 0) gainBlock('player', armor);
      s.log(`💠 Deep Current — next Water spell fires twice!${armor > 0 ? ` +${armor} Armor` : ''}`, 'player');
    }},

  cleanse_current:{ id:'cleanse_current', tier:'secondary', name:'Cleanse Current', emoji:'✨', element:'Water',
    desc:'Cleanse yourself and draw healing from each effect removed', baseCooldown:3,
    execute(s){
      const healPer = Math.round(20 + _incantationBonus(this.incantationLevel||1, 4, 0.90));
      const n = countPlayerDebuffs();
      clearPlayerDebuffs();
      s.healSelf(n * healPer);
      s.log(`✨ Cleanse Current! ${n} effects removed, +${n*healPer} HP`,'player');
    }},

  tsunami:{ id:'tsunami', tier:'legendary', name:'Tsunami', emoji:'🌊🌊', element:'Water',
    desc:'Unleash all Foam in a devastating tidal wave', baseCooldown:4,
    execute(s){
      const dmgPerFoam = Math.round(10 + _incantationBonus(this.incantationLevel||1, 2, 0.95));
      aliveEnemies().forEach(e=>{
        const foam = e.status.foamStacks||0;
        if(foam <= 0) return;
        const idx = combat.enemies.indexOf(e);
        setActiveEnemy(idx);
        for(let i=0; i<foam; i++){
          if(combat.over) return;
          applyDirectDamage('player','enemy', dmgPerFoam, '🌊 Tsunami');
        }
        if(!combat.over && s.attackPow() > 0) applyDirectDamage('player','enemy', s.attackPow(), '🌊 Tsunami (Power)');
        if(!combat.over){
          if(hasPassive('water_abyssal_pain')){
            const reapply = Math.floor(foam/2);
            e.status.foamStacks = reapply;
            if(reapply > 0) applyDirectDamage('player','enemy', reapply*15 + s.attackPow(), '🌊 Abyssal Pain');
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
    execute(s){
      const frost = 2.0 + _incantationBonus(this.incantationLevel||1, 0.4, 0.90);
      s.hit({baseDamage:12, effects:[], abilityElement:'Ice'});
      applyFrost('player','enemy', frost);
      s.log('❄️ Frost Bolt!','player');
    }},

  ice_block:{ id:'ice_block', tier:'primary', name:'Ice Block', emoji:'🧊', element:'Ice',
    desc:'Become invulnerable and freeze the battlefield', baseCooldown:4,
    execute(s){
      const frost = 2.0 + _incantationBonus(this.incantationLevel||1, 0.4, 0.90);
      status.player.phaseTurns = 1;
      aliveEnemies().forEach(e=>{ const idx=combat.enemies.indexOf(e); setActiveEnemy(idx); applyFrost('player','enemy',frost); });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      s.log(`🧊 Ice Block! Immune this round, ${frost.toFixed(1)} Frost to all enemies`,'player');
    }},

  glacial_spike:{ id:'glacial_spike', tier:'primary', name:'Glacial Spike', emoji:'🗡️', element:'Ice', tags:['freeze'],
    desc:'Heavy ice spike drives frost into the target', baseCooldown:3,
    execute(s){
      const dmg = Math.round(25 + _incantationBonus(this.incantationLevel||1, 10, 0.95));
      s.hit({baseDamage:dmg, effects:[], abilityElement:'Ice'});
      applyFrost('player','enemy',1);
      s.log('🗡️ Glacial Spike!','player');
    }},

  snowstorm:{ id:'snowstorm', tier:'primary', name:'Snowstorm', emoji:'🌨️', element:'Ice', tags:['freeze'],
    desc:'Blizzard sweeps all enemies with frost', baseCooldown:1,
    execute(s){
      const frost = 2.0 + _incantationBonus(this.incantationLevel||1, 0.4, 0.90);
      aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:8, effects:[], abilityElement:'Ice', isAOE:true}); applyFrost('player','enemy',frost); });
      s.log('🌨️ Snowstorm!','player');
    }},

  // Secondary
  flash_freeze:{ id:'flash_freeze', tier:'secondary', name:'Flash Freeze', emoji:'❄️❄️', element:'Ice', requiresTag:'freeze',
    desc:'Rapidly stack Frost on the target', baseCooldown:3,
    execute(s){
      const frost = 5.0 + _incantationBonus(this.incantationLevel||1, 1, 0.90);
      applyFrost('player','enemy', frost);
      s.log(`❄️❄️ Flash Freeze! +${frost.toFixed(1)} Frost`,'player');
    }},

  shatter:{ id:'shatter', tier:'secondary', name:'Shatter', emoji:'💎', element:'Ice', requiresTag:'freeze',
    desc:'Consume all Frost stacks. Deal Frost×4 damage. Upgrades increase the multiplier.', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e) return;
      const stacks = Math.floor(e.status.frostStacks || 0);
      e.status.frostStacks = 0;
      const mult = 4.0 + _incantationBonus(this.incantationLevel||1, 0.5, 0.90);
      const dmg = Math.round(stacks * mult);
      s.hit({baseDamage: dmg, effects:[], abilityElement:'Ice', _noAtk:true});
      s.log(`💎 Shatter! ${stacks} Frost×${mult.toFixed(2)} = ${dmg} dmg`,'player');
    }},

  frozen_ground:{ id:'frozen_ground', tier:'secondary', name:'Frozen Ground', emoji:'🌍❄️', element:'Ice',
    desc:'Persistent frost field chills all enemies over time', baseCooldown:4,
    execute(s){
      const turns = Math.round(3 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      status.player.frozenGroundTurns = turns;
      s.log(`🌍❄️ Frozen Ground! ${turns} rounds of frost`,'player');
    }},

  cryostasis:{ id:'cryostasis', tier:'secondary', name:'Cryostasis', emoji:'🧊💤', element:'Ice',
    desc:'Freeze yourself briefly — emerge healed and armored', baseCooldown:3,
    execute(s){
      const heal = Math.round(30 + _incantationBonus(this.incantationLevel||1, 6, 0.95));
      status.player.stunned = Math.max(status.player.stunned||0, 1);
      s.healSelf(heal);
      gainBlock('player', 20);
      status.player.cryostasisActive = true;
      s.log(`🧊💤 Cryostasis! +${heal} HP while frozen`,'player');
    }},

  ice_age:{ id:'ice_age', tier:'legendary', name:'Ice Age', emoji:'❄️🌍', element:'Ice',
    desc:'Lock the entire battlefield in deep frost', baseCooldown:4,
    execute(s){
      const frostAmt = 5 + _incantationBonus(this.incantationLevel||1, 1, 0.90);
      aliveEnemies().forEach(e=>{
        const idx = combat.enemies.indexOf(e);
        setActiveEnemy(idx);
        const prev = e.status.frostStacks||0;
        applyFrost('player','enemy', frostAmt);
        // If this triggered a freeze, stun extra
        const frostWithPassive = frostAmt + (hasPassive('ice_stay_frosty') ? 1 : 0);
        if(!e.status.frozen && (prev + frostWithPassive) >= 10){
          e.status.stunned = (e.status.stunned||0) + 1;
        } else if(e.status.frozen && e.status.stunned <= 1){
          e.status.stunned = Math.max(e.status.stunned||0, 2);
        }
      });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      s.log(`❄️🌍 Ice Age! ${frostAmt.toFixed(1)} Frost to all enemies`,'player');
    }},

  // ════════════════════════════════ LIGHTNING ══════════════════════════════════
  zap:{ id:'zap', tier:'primary', name:'Zap', emoji:'⚡', element:'Lightning',
    desc:'Fast lightning jab that applies Shock', baseCooldown:0, isStarter:true,
    execute(s){
      const bonus = Math.floor(s.attackPow()/10);
      s.hit({baseDamage:25+bonus, effects:[], abilityElement:'Lightning'});
      if(!combat.over){
        const shockBase = 2.0 + _incantationBonus(this.incantationLevel||1, 0.4, 0.90);
        let shockAmt = shockBase;
        if(hasPassive('lightning_conduction')) shockAmt += 1;
        shockAmt += (player._talentShockBonus || 0);
        const e = combat.enemies[combat.activeEnemyIdx];
        if(e && e.alive){
          e.status.shockStacks = (e.status.shockStacks||0) + shockAmt;
          log(`⚡ Shock +${shockAmt.toFixed(1)} (×${e.status.shockStacks.toFixed(1)})`, 'status');
          if(typeof _plasmaChargeOnDebuff === 'function') _plasmaChargeOnDebuff('enemy');
        }
      }
      s.log('⚡ Zap!','player');
    }},

  chain_lightning:{ id:'chain_lightning', tier:'primary', name:'Chain Lightning', emoji:'⚡⚡', element:'Lightning',
    desc:'Arcing lightning bounces between enemies. Stops when no new targets remain — dumps remaining shock stacks on the last hit enemy.', baseCooldown:2,
    execute(s){
      const alive = aliveEnemies();
      if(!alive.length) return;
      const maxBounces = Math.round(4 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      const hitSet = new Set();
      let lastIdx = combat.activeEnemyIdx;
      for(let i=0; i<maxBounces; i++){
        const unhit = alive.filter(e=>!hitSet.has(e));
        if(!unhit.length){
          const remaining = maxBounces - i;
          let stacksPerBounce = 1;
          if(hasPassive('lightning_conduction')) stacksPerBounce += 1;
          stacksPerBounce += (player._talentShockBonus || 0);
          const shockToApply = remaining * stacksPerBounce;
          const e = combat.enemies[lastIdx];
          if(e && e.alive){
            e.status.shockStacks = (e.status.shockStacks||0) + shockToApply;
            log(`⚡ Chain fizzles — +${shockToApply} Shock to ${e.name}!`, 'status');
          }
          break;
        }
        const target = unhit[Math.floor(Math.random()*unhit.length)];
        hitSet.add(target);
        lastIdx = combat.enemies.indexOf(target);
        setActiveEnemy(lastIdx);
        s.hit({baseDamage:11, effects:[], abilityElement:'Lightning', apMult:1.25});
        if(combat.over) return;
      }
      s.log('⚡⚡ Chain Lightning bounces!','player');
    }},

  overcharge:{ id:'overcharge', tier:'primary', name:'Overcharge', emoji:'⚡💪', element:'Lightning',
    desc:'Load the target with Shock and charge yourself up', baseCooldown:2,
    execute(s){
      const shock = Math.round(3 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      status.enemy.shockStacks = (status.enemy.shockStacks||0) + shock;
      status.player.overchargePowerPending = (status.player.overchargePowerPending||0) + 30;
      s.log(`⚡💪 Overcharge! +${shock} Shock, +30 Power next turn`,'player');
    }},

  // Secondary
  blitz:{ id:'blitz', tier:'secondary', name:'Blitz', emoji:'💥⚡', element:'Lightning',
    desc:'Detonate all Shock on target for burst damage', baseCooldown:2,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      const stacks = e ? (e.status.shockStacks||0) : 0;
      if(stacks > 0){
        const flatBonus = Math.round(_incantationBonus(this.incantationLevel||1, 2, 0.95));
        const perStack = Math.max(1, Math.ceil(s.attackPow()/3)) + flatBonus;
        const dmg = stacks * perStack;
        if(e) e.status.shockStacks = 0;
        applyDirectDamage('player','enemy', dmg, `💥 Blitz (${stacks} Shock)`);
        s.log(`💥⚡ Blitz! ${stacks}×${perStack} = ${dmg} dmg`,'player');
      } else {
        s.log('💥 Blitz — no Shock to detonate','player');
      }
    }},

  recharge:{ id:'recharge', tier:'secondary', name:'Recharge', emoji:'🔋', element:'Lightning',
    desc:'Reset your Overload damage to maximum', baseCooldown:8,
    execute(s){
      const resetVal = 2.0 + _incantationBonus(this.incantationLevel||1, 0.2, 0.90);
      status.player.lightningMult = resetVal;
      s.log(`🔋 Recharge! Overload reset to ${Math.round(resetVal*100)}%`,'player');
    }},

  electrocute:{ id:'electrocute', tier:'secondary', name:'Electrocute', emoji:'☠️⚡', element:'Lightning',
    desc:'Double the Shock on target at a painful cost', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      const mult = 2 + _incantationBonus(this.incantationLevel||1, 0.5, 0.90);
      if(e){ const prev = e.status.shockStacks||0; e.status.shockStacks = Math.round(prev*mult); s.log(`☠️⚡ Electrocute! Shock ×${mult.toFixed(2)} (${e.status.shockStacks})`,'player'); }
      applySelfDamage(10, '☠️ Electrocute');
    }},

  feedback:{ id:'feedback', tier:'secondary', name:'Feedback', emoji:'🔄⚡', element:'Lightning',
    desc:'Surge of power — Shock the target and charge for next turn', baseCooldown:2,
    execute(s){
      const shock = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      status.enemy.shockStacks = (status.enemy.shockStacks||0) + shock;
      applySelfDamage(5, '🔄 Feedback');
      status.player.overchargePowerPending = (status.player.overchargePowerPending||0) + 15;
      s.log(`🔄⚡ Feedback! +${shock} Shock, 5 self dmg, +15 Power next turn`,'player');
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
      // Also apply Shock to target regardless
      const _scShock = Math.round(1 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      target.status.shockStacks = (target.status.shockStacks||0) + _scShock;
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
        const shockPer = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
        status.enemy.shockStacks = (status.enemy.shockStacks||0) + n*shockPer;
        s.log(`🧹⚡ Static Cleanse! ${n} effects cleared → +${n*shockPer} Shock`,'player');
      } else {
        s.log('🧹 Static Cleanse — nothing to clear','player');
      }
    }},

  charge_shot:{ id:'charge_shot', tier:'legendary', name:'Charge Shot', emoji:'🎯⚡', element:'Lightning',
    desc:'Spend two actions to unleash a delayed area lightning blast', baseCooldown:2,
    execute(s){
      const dmgBonus = Math.round(_incantationBonus(this.incantationLevel||1, 10, 0.95));
      status.player.chargeShotCharging = true;
      status.player.chargeShotDmgBonus = (status.player.chargeShotDmgBonus||0) + dmgBonus;
      s.log('🎯⚡ Charge Shot charging — fires next round!','player');
    }},

  // ── Lightning / Surge primaries ──────────────────────────────────────────────
  bolt:{ id:'bolt', tier:'primary', name:'Bolt', emoji:'⚡', element:'Lightning',
    desc:'Quick lightning strike that loads a Surge onto the target', baseCooldown:1,
    execute(s){
      const surgeVal = Math.round(25 + _incantationBonus(this.incantationLevel||1, 4, 0.90));
      s.hit({baseDamage:15, effects:[], abilityElement:'Lightning'});
      if(!combat.over){
        _applySurge('enemy', surgeVal, '⚡ Bolt — Surge');
        s.log(`⚡ Bolt! Surge ${surgeVal} loaded.`,'player');
      }
    }},

  thunder_strike:{ id:'thunder_strike', tier:'primary', name:'Thunder Strike', emoji:'🌩️', element:'Lightning',
    desc:'Heavy strike that hits hard and loads Shock', baseCooldown:2,
    execute(s){
      const shockAmt = Math.round(2 + _incantationBonus(this.incantationLevel||1, 0.5, 0.90));
      s.hit({baseDamage:35, effects:[], abilityElement:'Lightning'});
      if(!combat.over){
        const e = combat.enemies[combat.activeEnemyIdx];
        if(e && e.alive){
          e.status.shockStacks = (e.status.shockStacks||0) + shockAmt;
          log(`⚡ Thunder Strike! +${shockAmt} Shock (×${e.status.shockStacks.toFixed(1)})`, 'status');
        }
        s.log('🌩️ Thunder Strike!','player');
      }
    }},

  ball_lightning:{ id:'ball_lightning', tier:'primary', name:'Ball Lightning', emoji:'🔮⚡', element:'Lightning',
    desc:'Rolling orb of lightning hits all enemies and loads Surge on each', baseCooldown:2,
    execute(s){
      const surgeVal = Math.round(20 + _incantationBonus(this.incantationLevel||1, 3, 0.90));
      aliveEnemies().forEach((_,i)=>{
        setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i]));
        s.hit({baseDamage:10, effects:[], abilityElement:'Lightning', isAOE:true});
        if(combat.over) return;
        _applySurge('enemy', surgeVal, '🔮⚡ Ball Lightning — Surge');
      });
      if(!combat.over) s.log(`🔮⚡ Ball Lightning! Surge ${surgeVal} on all enemies.`,'player');
    }},

  static_charge:{ id:'static_charge', tier:'primary', name:'Static Charge', emoji:'⚡🔋', element:'Lightning',
    desc:'No damage — loads a heavy Surge onto the target', baseCooldown:1,
    execute(s){
      const surgeVal = Math.round(60 + _incantationBonus(this.incantationLevel||1, 8, 0.90));
      _applySurge('enemy', surgeVal, '⚡ Static Charge — Surge');
      s.log(`⚡🔋 Static Charge! Surge ${surgeVal} loaded.`,'player');
    }},

  megavolt:{ id:'megavolt', tier:'primary', name:'Megavolt', emoji:'💥⚡', element:'Lightning',
    desc:'Massive lightning burst — pure damage', baseCooldown:3,
    execute(s){
      const bonus = Math.round(_incantationBonus(this.incantationLevel||1, 8, 0.90));
      s.hit({baseDamage:50+bonus, effects:[], abilityElement:'Lightning'});
      s.log('💥⚡ Megavolt!','player');
    }},

  // ── Lightning / Surge secondaries ────────────────────────────────────────────
  supercharge:{ id:'supercharge', tier:'secondary', name:'Supercharge', emoji:'⚡⚡', element:'Lightning',
    desc:'Load a huge Surge, or add to an existing one', baseCooldown:3,
    execute(s){
      const bonus = Math.round(_incantationBonus(this.incantationLevel||1, 5, 0.90));
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e || !e.alive) return;
      if(e.status.surgeActive){
        e.status.surgeValue += 40 + bonus;
        s.log(`⚡⚡ Supercharge! Surge +${40+bonus} → ${e.status.surgeValue}`,'player');
      } else {
        e.status.surgeActive = true;
        e.status.surgeValue  = 80 + bonus;
        e.status.surgeMeter  = 0;
        s.log(`⚡⚡ Supercharge! Surge ${e.status.surgeValue} loaded.`,'player');
      }
      renderStatusTags();
    }},

  overclock:{ id:'overclock', tier:'secondary', name:'Overclock', emoji:'⏫⚡', element:'Lightning',
    desc:'Double the current Surge value on the target', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e || !e.alive) return;
      if(e.status.surgeActive){
        e.status.surgeValue = Math.round(e.status.surgeValue * 2);
        s.log(`⏫⚡ Overclock! Surge doubled → ${e.status.surgeValue}`,'player');
      } else {
        s.log('⏫ Overclock — no Surge active to double','player');
      }
      renderStatusTags();
    }},

  residual_current:{ id:'residual_current', tier:'secondary', name:'Residual Current', emoji:'🔄⚡', element:'Lightning',
    desc:'After Surge triggers this turn, apply a new Surge 30. Cast before or after.', baseCooldown:3,
    execute(s){
      const bonus = Math.round(_incantationBonus(this.incantationLevel||1, 4, 0.90));
      const surgeVal = 30 + bonus;
      if(combat._surgeTriggeredThisTurn){
        // Surge already fired this turn — apply immediately
        _applySurge('enemy', surgeVal, '🔄⚡ Residual Current — Surge');
        s.log(`🔄⚡ Residual Current! Surge ${surgeVal} applied.`,'player');
      } else {
        // Register to fire when Surge triggers later this turn
        combat._residualCurrentPending = true;
        combat._residualCurrentValue   = surgeVal;
        s.log(`🔄⚡ Residual Current primed — Surge ${surgeVal} fires on next trigger.`,'player');
      }
    }},

  detonator:{ id:'detonator', tier:'secondary', name:'Detonator', emoji:'💣⚡', element:'Lightning',
    desc:'Instantly trigger the Surge on the target', baseCooldown:4,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e || !e.alive) return;
      if(e.status.surgeActive){
        s.log(`💣⚡ Detonator! Triggering Surge (${e.status.surgeValue} dmg)!`,'player');
        _triggerSurge('enemy');
      } else {
        s.log('💣 Detonator — no Surge active to detonate','player');
      }
    }},

  grounded:{ id:'grounded', tier:'secondary', name:'Grounded', emoji:'🌱⚡', element:'Lightning',
    desc:'Remove all your debuffs — each removed adds +5 to target Surge', baseCooldown:3,
    execute(s){
      const bonus = Math.round(_incantationBonus(this.incantationLevel||1, 1, 0.90));
      const surgePerDebuff = 5 + bonus;
      const n = countPlayerDebuffs();
      clearPlayerDebuffs();
      if(n > 0){
        const e = combat.enemies[combat.activeEnemyIdx];
        if(e && e.alive){
          if(e.status.surgeActive){
            e.status.surgeValue += n * surgePerDebuff;
            log(`🌱⚡ Grounded! ${n} debuffs cleared → Surge +${n*surgePerDebuff} (${e.status.surgeValue})`, 'player');
          } else {
            e.status.surgeActive = true;
            e.status.surgeValue  = n * surgePerDebuff;
            e.status.surgeMeter  = 0;
            log(`🌱⚡ Grounded! ${n} debuffs cleared → Surge ${e.status.surgeValue} loaded`, 'player');
          }
          renderStatusTags();
        }
      } else {
        s.log('🌱 Grounded — no debuffs to clear','player');
      }
    }},

  // ── Lightning / Surge legendaries ────────────────────────────────────────────
  thunderclap:{ id:'thunderclap', tier:'legendary', name:'Thunderclap', emoji:'🌩️💥', element:'Lightning',
    desc:'Massive lightning blast hits all enemies, loading Surge 100 on each', baseCooldown:4,
    execute(s){
      const surgeVal = Math.round(100 + _incantationBonus(this.incantationLevel||1, 10, 0.90));
      aliveEnemies().forEach((_,i)=>{
        setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i]));
        s.hit({baseDamage:60, effects:[], abilityElement:'Lightning', isAOE:true});
        if(combat.over) return;
        _applySurge('enemy', surgeVal, '🌩️ Thunderclap — Surge');
      });
      if(!combat.over) s.log(`🌩️💥 Thunderclap! Surge ${surgeVal} on all enemies.`,'player');
    }},

  fulgurite:{ id:'fulgurite', tier:'legendary', name:'Fulgurite', emoji:'🪨⚡', element:'Lightning',
    desc:'Strike that permanently lowers the Surge threshold this battle by 5', baseCooldown:2,
    execute(s){
      const bonus = Math.round(_incantationBonus(this.incantationLevel||1, 5, 0.90));
      s.hit({baseDamage:30+bonus, effects:[], abilityElement:'Lightning'});
      if(!combat.over){
        combat._surgeFulguriteMinus = (combat._surgeFulguriteMinus||0) + 5;
        s.log(`🪨⚡ Fulgurite! Surge threshold now ${_getSurgeThreshold()}.`,'player');
      }
    }},

  // ════════════════════════════════ EARTH ══════════════════════════════════════
  seismic_wave:{ id:'seismic_wave', tier:'primary', name:'Seismic Wave', emoji:'🌊🪨', element:'Earth',
    desc:'Armor Strip: steal armor from the target and add it to yours', baseCooldown:2, isStarter:true,
    execute(s){
      s.hit({baseDamage:20, effects:[], abilityElement:'Earth'});
      if(!combat.over){
        const stripAmt = Math.round(5 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
        const e = combat.enemies[combat.activeEnemyIdx];
        if(e) e.status.block = Math.max(0, (e.status.block||0) - stripAmt);
        status.player.block = (status.player.block||0) + stripAmt;
        s.log(`🌊🪨 Seismic Wave! Armor Strip −${stripAmt} enemy, +${stripAmt} yours`,'player');
      }
    }},

  fortify:{ id:'fortify', tier:'primary', name:'Fortify', emoji:'🏰', element:'Earth',
    desc:'Armor up — it converts to Stone stacks next turn', baseCooldown:3,
    execute(s){
      const amt = Math.round(15 + _incantationBonus(this.incantationLevel||1, 3, 0.95));
      gainBlock('player', amt);
      status.player.fortifyPending = (status.player.fortifyPending||0) + amt;
      s.log(`🏰 Fortify! +${amt} Armor (converts to Stone at end of turn)`,'player');
    }},

  echo_slam:{ id:'echo_slam', tier:'primary', name:'Echo Slam', emoji:'🌍', element:'Earth',
    desc:'Tremor deals more damage the more enemies are present', baseCooldown:2,
    execute(s){
      const count = aliveEnemies().length;
      const dmgBase = Math.round(5 + _incantationBonus(this.incantationLevel||1, 1, 0.95));
      const dmgPerEnemy = dmgBase * count;
      aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:dmgPerEnemy, effects:[], abilityElement:'Earth', isAOE:true}); });
      s.log(`🌍 Echo Slam! ${count} enemies × ${dmgBase} = ${dmgPerEnemy} each`,'player');
    }},

  // Secondary
  stone_stance:{ id:'stone_stance', tier:'secondary', name:'Stone Stance', emoji:'🪨💪', element:'Earth',
    desc:'Channel your Stone for double its effect this turn', baseCooldown:1,
    execute(s){
      const powBonus = Math.round(_incantationBonus(this.incantationLevel||1, 5, 0.90));
      status.player.stoneStanceThisTurn = true;
      if(powBonus > 0){ status.player.battlePowerBonus = (status.player.battlePowerBonus||0) + powBonus; updateStatsUI(); }
      s.log(`🪨💪 Stone Stance! Stone effects doubled this turn${powBonus > 0 ? ` +${powBonus} Power` : ''}`,'player');
    }},

  stone_sanctuary:{ id:'stone_sanctuary', tier:'secondary', name:'Stone Sanctuary', emoji:'🏔️', element:'Earth',
    desc:'Multiply your Stone stacks instantly', baseCooldown:4,
    execute(s){
      const mult = 2 + _incantationBonus(this.incantationLevel||1, 0.5, 0.90);
      status.player.stoneStacks = Math.round((status.player.stoneStacks||0) * mult);
      s.log(`🏔️ Stone Sanctuary! ×${mult.toFixed(2)} Stone (${status.player.stoneStacks})`,'player');
    }},

  earthshaker:{ id:'earthshaker', tier:'secondary', name:'Earthshaker', emoji:'👊🪨', element:'Earth',
    desc:'A devastating strike that scales purely with Power', baseCooldown:3,
    execute(s){
      const mult = 3.0 + _incantationBonus(this.incantationLevel||1, 0.5, 0.90);
      const dmg = Math.round(s.attackPow() * mult);
      applyDirectDamage('player','enemy', dmg, '👊 Earthshaker');
      s.log(`👊🪨 Earthshaker! ${dmg} dmg (${s.attackPow()}×${mult.toFixed(2)})`,'player');
    }},

  dig:{ id:'dig', tier:'secondary', name:'Dig', emoji:'⛏️', element:'Earth',
    desc:'Dig in — shake off debuffs and reinforce yourself', baseCooldown:3,
    execute(s){
      const amt = Math.round(5 + _incantationBonus(this.incantationLevel||1, 2, 0.95));
      clearPlayerDebuffs();
      gainBlock('player', amt);
      addStoneStacks('player', amt);
      s.log(`⛏️ Dig! Debuffs cleared, +${amt} Armor, +${amt} Stone`,'player');
    }},

  cataclysm:{ id:'cataclysm', tier:'legendary', name:'Cataclysm', emoji:'💥🪨', element:'Earth',
    desc:'Release your Stone in a crushing area collapse', baseCooldown:4,
    execute(s){
      const stacks = status.player.stoneStacks||0;
      status.player.stoneStacks = 0;
      const perStack = Math.round(25 + _incantationBonus(this.incantationLevel||1, 5, 0.90));
      const dmg = stacks * perStack + s.attackPow();
      if(dmg > 0){
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); applyDirectDamage('player','enemy', dmg, `💥 Cataclysm (${stacks} Stone)`); });
      }
      s.log(`💥🪨 Cataclysm! ${stacks} Stone × ${perStack} = ${dmg} dmg to all`,'player');
    }},

  // ════════════════════════════════ NATURE ══════════════════════════════════════
  vine_strike:{ id:'vine_strike', tier:'primary', name:'Vine Strike', emoji:'🌿', element:'Nature',
    desc:'Three quick strikes each trying to root the target', baseCooldown:0, isStarter:true,
    execute(s){
      const rootChance = Math.min(0.99, 0.50 + _incantationBonus(this.incantationLevel||1, 0.05, 0.90));
      for(let i=0; i<3; i++){
        if(combat.over) return;
        s.hit({baseDamage:5, effects:[], abilityElement:'Nature', apMult:0.75});
        if(!combat.over && Math.random()<rootChance) applyRoot('player','enemy',1);
      }
      s.log('🌿 Vine Strike!','player');
    }},

  thornwall:{ id:'thornwall', tier:'primary', name:'Thornwall', emoji:'🌵', element:'Nature',
    desc:'Raise thorned armor and ensnare the target', baseCooldown:2,
    execute(s){
      const root = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      gainBlock('player', 30);
      applyRoot('player','enemy', root);
      s.log(`🌵 Thornwall! +30 Armor, +${root} Root`,'player');
    }},

  natures_call:{ id:'natures_call', tier:'primary', name:"Nature's Call", emoji:'🌳', element:'Nature',
    desc:'Call a Treant ally to fight alongside you', baseCooldown:1,
    execute(s){
      if(combat.summons.length>=4){ s.log('🌳 Max summons reached!','status'); return; }
      const isLegendary = hasPassive('nature_verdant_legion');
      const hpBase = (isLegendary ? 50 : 25) + Math.round(_incantationBonus(this.incantationLevel||1, 5, 0.95));
      const hp = hpBase + (player._talentTreantHP||0);
      const dmg = isLegendary ? 15 : 5;
      combat.summons.push({name:'Treant',emoji:'🌳',hp,maxHP:hp,dmg,cd:0,rootChance:isLegendary?1.0:0.5,id:Date.now()+Math.random()});
      s.log(`🌳 A Treant rises! (${hp} HP, ${dmg} dmg)`,'player');
      renderSummonsRow();
    }},

  bramble_burst:{ id:'bramble_burst', tier:'primary', name:'Bramble Burst', emoji:'🌵💥', element:'Nature',
    desc:'Thorny burst hits all enemies and tries to root each', baseCooldown:1,
    execute(s){
      const rootChance = Math.min(0.99, 0.50 + _incantationBonus(this.incantationLevel||1, 0.05, 0.90));
      aliveEnemies().forEach((_,i)=>{
        setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i]));
        s.hit({baseDamage:10, effects:[], abilityElement:'Nature', isAOE:true});
        if(!combat.over && Math.random()<rootChance) applyRoot('player','enemy',1);
      });
      s.log('🌵💥 Bramble Burst!','player');
    }},

  // Secondary
  wild_growth:{ id:'wild_growth', tier:'secondary', name:'Wild Growth', emoji:'🌿🌿', element:'Nature',
    desc:'Vines multiply — double the target\'s Root stacks', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      const mult = 2 + _incantationBonus(this.incantationLevel||1, 0.5, 0.90);
      if(e){ e.status.rootStacks = Math.round((e.status.rootStacks||0)*mult); s.log(`🌿🌿 Wild Growth! Root ×${mult.toFixed(2)} (${e.status.rootStacks})`,'player'); }
    }},

  living_forest:{ id:'living_forest', tier:'secondary', name:'Living Forest', emoji:'🌲', element:'Nature',
    desc:'Command all Treants to strike twice this turn', baseCooldown:4,
    execute(s){
      const alive = aliveEnemies();
      if(!alive.length || !combat.summons.length){ s.log('🌲 No Treants to command!','player'); return; }
      const attacks = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      combat.summons.forEach(t=>{
        if(t.hp<=0) return;
        for(let i=0; i<attacks; i++){
          const target = alive[Math.floor(Math.random()*alive.length)];
          const idx = combat.enemies.indexOf(target);
          setActiveEnemy(idx);
          applyDirectDamage('player','enemy', t.dmg, `🌲 ${t.name}`);
          if(!combat.over && Math.random()<t.rootChance) applyRoot('player','enemy',1);
          if(combat.over) return;
        }
      });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      s.log(`🌲 Living Forest! All treants strike ${attacks}×`,'player');
    }},

  spreading_vines:{ id:'spreading_vines', tier:'secondary', name:'Spreading Vines', emoji:'🌿🌍', element:'Nature',
    desc:'Spreading vines root all enemies over several rounds', baseCooldown:4,
    execute(s){
      const turns = Math.round(3 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      status.player.spreadingVinesTurns = turns;
      s.log(`🌿🌍 Spreading Vines! ${turns} rounds of root to all`,'player');
    }},

  nourish:{ id:'nourish', tier:'secondary', name:'Nourish', emoji:'💚🌳', element:'Nature',
    desc:'Strengthen and heal all your Treant allies', baseCooldown:3,
    execute(s){
      const heal = Math.round(25 + _incantationBonus(this.incantationLevel||1, 5, 0.95));
      combat.summons.forEach(t=>{ t.maxHP+=heal; t.hp=Math.min(t.maxHP, t.hp+heal); t.dmg+=5; });
      gainBlock('player',1);
      renderSummonsRow();
      s.log(`💚🌳 Nourish! Treants +${heal} HP and strengthened`,'player');
    }},

  natures_wrath:{ id:'natures_wrath', tier:'legendary', name:"Nature's Wrath", emoji:'🌿💥', element:'Nature',
    desc:'Consume all Root in a crushing Nature\'s Wrath', baseCooldown:4,
    execute(s){
      const perStack = Math.round(20 + _incantationBonus(this.incantationLevel||1, 4, 0.90));
      aliveEnemies().forEach(e=>{
        const idx = combat.enemies.indexOf(e);
        setActiveEnemy(idx);
        const stacks = (e.status.rootStacks||0) + (e.status.overgrowthStacks||0);
        e.status.rootStacks = 0;
        e.status.overgrowthStacks = 0;
        const dmg = stacks * perStack + s.attackPow();
        if(dmg > 0) applyDirectDamage('player','enemy', dmg, `🌿 Nature's Wrath (${stacks}×${perStack})`);
        if(combat.over) return;
      });
      if(!combat.over) s.log("🌿💥 Nature's Wrath! All Root consumed",'player');
    }},

  // ──────────────────────── NATURE / SEEDS ────────────────────────────────────
  // Seeds are planted with a 5-turn germination timer. Stacking the same type
  // adds stacks without resetting the timer. All stacks bloom simultaneously.
  // Eternal Garden: each stack has an independent timer.

  // Primary Seed spells
  damage_seed:{ id:'damage_seed', tier:'primary', name:'Damage Seed', emoji:'🌱', element:'Nature', tags:['seed'],
    desc:'Plant a Damage Seed on the target — germinates in 5 turns, dealing 30+EFX/2 damage per stack', baseCooldown:2,
    execute(s){
      const surgeUsed = _plantSeed('enemy', 'damage', 1, 5, {incantLevel: this.incantationLevel||1});
      s.log('🌱 Damage Seed planted!','player');
      if(surgeUsed){ this.currentCD=0; s.log('⚡ Seed Surge: free cast +2 stacks!','status'); }
    }},

  root_seed:{ id:'root_seed', tier:'primary', name:'Root Seed', emoji:'🌱', element:'Nature', tags:['seed'],
    desc:'Plant a Root Seed on the target — germinates in 5 turns, applying 3 Root per stack', baseCooldown:2,
    execute(s){
      const surgeUsed = _plantSeed('enemy', 'root', 1, 5, {incantLevel: this.incantationLevel||1});
      s.log('🌱 Root Seed planted!','player');
      if(surgeUsed){ this.currentCD=0; s.log('⚡ Seed Surge: free cast +2 stacks!','status'); }
    }},

  silence_seed:{ id:'silence_seed', tier:'primary', name:'Silence Seed', emoji:'🤫', element:'Nature', tags:['seed'],
    desc:'Plant a Silence Seed on the target — germinates in 5 turns, disabling active spellbook 1 turn. Cannot stack — each cast is independent.', baseCooldown:4,
    execute(s){
      const surgeUsed = _plantSeed('enemy', 'silence', 1, 5, {incantLevel: this.incantationLevel||1});
      s.log('🤫 Silence Seed planted!','player');
      if(surgeUsed){ this.currentCD=0; s.log('⚡ Seed Surge: free cast!','status'); }
    }},

  healing_seed:{ id:'healing_seed', tier:'primary', name:'Healing Seed', emoji:'💚', element:'Nature', tags:['seed'],
    desc:'Plant a Healing Seed on yourself — germinates in 5 turns, restoring 50+DEF HP per stack', baseCooldown:3,
    execute(s){
      const surgeUsed = _plantSeed('player', 'healing', 1, 5, {incantLevel: this.incantationLevel||1});
      s.log('💚 Healing Seed planted on yourself!','player');
      if(surgeUsed){ this.currentCD=0; s.log('⚡ Seed Surge: free cast +2 stacks!','status'); }
    }},

  // Secondary Seed spells
  accelerate:{ id:'accelerate', tier:'secondary', name:'Accelerate', emoji:'⚡', element:'Nature', tags:['seed'],
    desc:'Reduce all active Seed germination timers by 1 — can trigger immediate blooms', baseCooldown:1,
    execute(s){
      _accelerateSeeds(1);
      s.log('⚡ Accelerate! All Seed timers −1.','player');
    }},

  overgrow:{ id:'overgrow', tier:'secondary', name:'Overgrow', emoji:'🌿', element:'Nature', tags:['seed'],
    desc:'Double all current Seed stacks on the target', baseCooldown:4,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      if(!e.status.seeds||!e.status.seeds.length){ s.log('🌿 Overgrow: no Seeds on target.','player'); return; }
      e.status.seeds.forEach(seed => { seed.stacks *= 2; });
      s.log(`🌿 Overgrow! All Seeds on ${e.name} doubled.`,'player');
      renderStatusTags();
    }},

  cross_pollinate:{ id:'cross_pollinate', tier:'secondary', name:'Cross Pollinate', emoji:'🌼', element:'Nature', tags:['seed'],
    desc:'Copy all Seed stacks from the target onto all other enemies — exact same timer state', baseCooldown:3,
    execute(s){
      const enemies = aliveEnemies();
      if(enemies.length < 2){ s.log('🌼 Cross Pollinate: need 2+ alive enemies.','player'); return; }
      const source = combat.enemies[combat.activeEnemyIdx];
      if(!source||!source.status.seeds||!source.status.seeds.length){
        s.log('🌼 Cross Pollinate: no Seeds on target.','player'); return;
      }
      let copied = 0;
      enemies.forEach(e => {
        if(e === source) return;
        if(!e.status.seeds) e.status.seeds = [];
        source.status.seeds.forEach(seed => { e.status.seeds.push({...seed}); copied++; });
      });
      s.log(`🌼 Cross Pollinate! ${copied} Seed${copied!==1?'s':''} copied to ${enemies.length-1} other enem${enemies.length-1!==1?'ies':'y'}.`,'player');
      renderStatusTags();
    }},

  seed_surge:{ id:'seed_surge', tier:'secondary', name:'Seed Surge', emoji:'💥', element:'Nature', tags:['seed'],
    desc:'Your next Seed planted this turn costs no cooldown and gains 2 free stacks', baseCooldown:3,
    execute(s){
      combat._seedSurgePending = true;
      s.log('💥 Seed Surge! Next Seed: free cast +2 stacks.','player');
    }},

  deep_soil:{ id:'deep_soil', tier:'secondary', name:'Deep Soil', emoji:'🌍', element:'Nature', tags:['seed'],
    desc:'Reset all active Seed timers back to 5 turns — each Seed gains 1 free stack', baseCooldown:2,
    execute(s){
      let count = 0;
      combat.enemies.forEach(e => {
        if(!e.alive||!e.status.seeds) return;
        e.status.seeds.forEach(seed => { seed.timer=5; seed.stacks++; count++; });
      });
      if(status.player.seeds)
        status.player.seeds.forEach(seed => { seed.timer=5; seed.stacks++; count++; });
      s.log(`🌍 Deep Soil! ${count} Seed${count!==1?'s':''} reset to 5t, each +1 stack.`,'player');
      renderStatusTags();
    }},

  reap:{ id:'reap', tier:'secondary', name:'Reap', emoji:'🌾', element:'Nature', tags:['seed'],
    desc:'Consume all active Seeds — each triggers a weakened bloom (Dmg:15/stack, Root:1/stack, Silence:1t, Heal:25/stack)', baseCooldown:3,
    execute(s){
      const results = [];
      const e = combat.enemies[combat.activeEnemyIdx];
      // Enemy seeds
      if(e && e.alive && e.status.seeds && e.status.seeds.length){
        const consumed = [...e.status.seeds]; e.status.seeds = [];
        consumed.forEach(seed => {
          if(combat.over) return;
          switch(seed.type){
            case 'damage':
              applyDirectDamage('player','enemy', 15*seed.stacks, `🌾 Reap Dmg (×${seed.stacks})`);
              results.push(`${15*seed.stacks} dmg`); break;
            case 'root':
              applyRoot('player','enemy', seed.stacks);
              results.push(`${seed.stacks} Root`); break;
            case 'silence':
              if(e.alive){ e._silenced=(e._silenced||0)+1; results.push('Silence'); } break;
          }
        });
      }
      // Player seeds
      if(!combat.over && status.player.seeds && status.player.seeds.length){
        const consumed = [...status.player.seeds]; status.player.seeds = [];
        consumed.forEach(seed => {
          if(seed.type==='healing'){
            applyHeal('player', 25*seed.stacks, `🌾 Reap Heal (×${seed.stacks})`);
            results.push(`+${25*seed.stacks}hp`);
          }
        });
      }
      s.log(`🌾 Reap! ${results.join(', ')||'no Seeds'}`, 'player');
      renderStatusTags();
    }},

  // Legendary Seed spells
  bloom_storm:{ id:'bloom_storm', tier:'legendary', name:'Bloom Storm', emoji:'🌺', element:'Nature', tags:['seed'],
    desc:'All Seeds on all enemies germinate simultaneously', baseCooldown:5,
    execute(s){
      const prevActive = combat.activeEnemyIdx;
      let anySeeds = false;
      combat.enemies.forEach((e, i) => {
        if(!e.alive||!e.status.seeds||!e.status.seeds.length) return;
        anySeeds = true;
        const toBloom = [...e.status.seeds]; e.status.seeds = [];
        setActiveEnemy(i);
        toBloom.forEach(seed => { if(!combat.over) _bloomSeed('enemy', seed, i); });
      });
      setActiveEnemy(prevActive);
      s.log(anySeeds ? '🌺 Bloom Storm! All enemy Seeds germinate!' : '🌺 Bloom Storm! No enemy Seeds active.','player');
    }},

  world_tree:{ id:'world_tree', tier:'legendary', name:'World Tree', emoji:'🌳', element:'Nature', tags:['seed'],
    desc:'Plant all four Seed types on the target (×2 stacks each). Healing Seed goes on you.', baseCooldown:6,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx]; if(!e||!e.alive) return;
      const il = this.incantationLevel||1;
      _plantSeed('enemy', 'damage',  2, 5, {incantLevel:il});
      _plantSeed('enemy', 'root',    2, 5, {incantLevel:il});
      _plantSeed('enemy', 'silence', 2, 5, {incantLevel:il}); // 2 separate Silence Seeds
      _plantSeed('player','healing', 2, 5, {incantLevel:il});
      s.log('🌳 World Tree! All 4 Seed types planted (×2 each, Healing on you).','player');
      renderStatusTags();
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
      const dmgPerCharge = Math.round(5 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      const dmg = spend * dmgPerCharge + s.attackPow() + s.effectPow();
      const tgt = combat.targetIdx;
      setActiveEnemy(tgt);
      s.hit({baseDamage:dmg, effects:[], abilityElement:'Plasma', _noAtk:true});
      applyDirectDamage('enemy','player', 1, '🔮 Recoil');
      s.log(`🔮 Plasma Lance! ${spend} Charge × ${dmgPerCharge} → ${dmg} dmg`, 'player');
    }},

  energy_infusion:{ id:'energy_infusion', tier:'primary', name:'Energy Infusion', emoji:'⚡', element:'Plasma',
    desc:'Spend Charge to permanently boost Power — heals 3 HP per Charge consumed', baseCooldown:2, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(!_plasmaConsume(spend, s)) return;
      const powPerCharge = 1 + _incantationBonus(this.incantationLevel||1, 0.5, 0.90);
      const gained = Math.round(spend * powPerCharge);
      status.player.battlePowerBonus = (status.player.battlePowerBonus||0) + gained;
      s.log(`⚡ Energy Infusion! ${spend} Charge → +${gained} Power (total bonus: +${status.player.battlePowerBonus})`, 'player');
      updateStatsUI();
    }},

  plasma_shield:{ id:'plasma_shield', tier:'primary', name:'Plasma Shield', emoji:'🛡️', element:'Plasma',
    desc:'Each Charge spent adds 1% damage reduction for the battle — heals 3 HP per Charge', baseCooldown:0, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(!_plasmaConsume(spend, s)) return;
      const mult = combat.plasmaOvercharged ? 1.5 : 1;
      const pctPerCharge = 1 + _incantationBonus(this.incantationLevel||1, 0.2, 0.90);
      const pct = Math.min(75, Math.round(spend * mult * pctPerCharge));
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
      // damage instances per charge consumed — each generates Charge naturally
      const hitsPerCharge = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      for(let i = 0; i < spend * hitsPerCharge; i++){
        if(combat.over) return;
        applyDirectDamage('enemy','player', 5, '💉 Self Sacrifice');
      }
      s.log(`💉 Self Sacrifice! ${spend} Charge → ${spend*hitsPerCharge} hits of 5 self-dmg`, 'player');
    }},

  borrowed_power:{ id:'borrowed_power', tier:'secondary', name:'Borrowed Power', emoji:'⏳', element:'Plasma',
    desc:'Borrow 10 Charge immediately — owe heavy damage next turn for each unpaid', baseCooldown:0, isPlasmaAbility:true, chargeCost:10,
    execute(s){
      const borrow = Math.round(10 + _incantationBonus(this.incantationLevel||1, 2, 1.00));
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
      const powGained = Math.round(_incantationBonus(this.incantationLevel||1, 3, 0.90));
      if(powGained > 0){ status.player.battlePowerBonus = (status.player.battlePowerBonus||0) + powGained; updateStatsUI(); }
      s.log(`🫧 Stall! ${stored} Charge stored. Immune this turn. Regain next turn.${powGained > 0 ? ` +${powGained} Power` : ''}`, 'player');
      renderStatusTags();
    }},

  obliteration:{ id:'obliteration', tier:'secondary', name:'Obliteration', emoji:'💀', element:'Plasma',
    desc:'Spend Charge as a barrage of hits — heals 3 HP per Charge, deals 2 hits per Charge', baseCooldown:0, isPlasmaAbility:true, chargeCost:'variable',
    execute(s){
      const spend = _plasmaSpend();
      if(!_plasmaConsume(spend, s)) return;
      const baseDmg = Math.round(5 + _incantationBonus(this.incantationLevel||1, 1, 0.90));
      const hitDmg = baseDmg + s.attackPow() + s.effectPow();
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
      const bonusCharge = Math.round(_incantationBonus(this.incantationLevel||1, 3, 0.90));
      status.player.singularityActive = true;
      if(bonusCharge > 0) status.player.plasmaCharge = (status.player.plasmaCharge||0) + bonusCharge;
      s.log(`🌌 Singularity! Next Plasma ability has doubled effects.${bonusCharge > 0 ? ` +${bonusCharge} Charge` : ''}`, 'player');
      renderStatusTags();
    }},

  // ════════════════════════════════ AIR ════════════════════════════════════════
  // Helper: applies s.hit with optional Tornado AoE expansion
  // ── Primary ──────────────────────────────────────────────────────────────────
  quintuple_hit:{ id:'quintuple_hit', tier:'primary', name:'Quintuple Hit', emoji:'💨', element:'Air',
    desc:'Strike multiple times for 3 damage each. Each hit generates Momentum.', baseCooldown:0, isStarter:true,
    execute(s){
      const hits = Math.round(5 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:3, effects:[], hits, abilityElement:'Air', apMult:0.75}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:3, effects:[], hits, abilityElement:'Air', apMult:0.75}); }
      s.log('💨 Quintuple Hit!','player');
    }},
  become_wind:{ id:'become_wind', tier:'primary', name:'Become Wind', emoji:'🌬️', element:'Air',
    desc:'Gain Momentum. Your next successful dodge does not cause Momentum decay.', baseCooldown:2,
    execute(s){
      const gain = Math.round(10 + _incantationBonus(this.incantationLevel||1, 2, 0.95));
      addMomentumStacks(gain);
      status.player.momentumNoDecayNext = true;
      s.log(`🌬️ Become Wind! +${gain} Momentum (×${status.player.momentumStacks.toFixed(1)}). Next dodge: no decay.`,'player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},
  wind_wall:{ id:'wind_wall', tier:'primary', name:'Wind Wall', emoji:'🛡️', element:'Air',
    desc:'Delay one instance of incoming damage until the next turn.', baseCooldown:2,
    execute(s){
      const armor = Math.round(_incantationBonus(this.incantationLevel||1, 8, 0.95));
      status.player.windWallActive = true;
      if(armor > 0) gainBlock('player', armor);
      s.log(`🛡️ Wind Wall! Next incoming hit delayed to next turn.${armor > 0 ? ` +${armor} Armor` : ''}`, 'player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},
  tornado:{ id:'tornado', tier:'primary', name:'Tornado', emoji:'🌪️', element:'Air',
    desc:'Deal damage to all enemies. Your next offensive Air ability becomes AoE.', baseCooldown:3,
    execute(s){
      const dmg = Math.round(10 + _incantationBonus(this.incantationLevel||1, 3, 0.95));
      const alive = aliveEnemies();
      alive.forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:dmg, effects:[], abilityElement:'Air', _isTornadoSelf:true}); });
      if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      if(!combat.over){ status.player.tornadoAoENext = true; }
      s.log('🌪️ Tornado! All enemies hit. Next Air attack is AoE.','player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},
  // ── Secondary ─────────────────────────────────────────────────────────────────
  twin_strike:{ id:'twin_strike', tier:'secondary', name:'Twin Strike', emoji:'⚔️', element:'Air',
    desc:'Strike multiple times for 1 damage each. Scales with Power. Does not consume an action.', baseCooldown:1,
    isFreeAction:true,
    execute(s){
      const hits = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:1, effects:[], hits, abilityElement:'Air'}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:1, effects:[], hits, abilityElement:'Air'}); }
      s.log('⚔️ Twin Strike!','player');
    }},
  windy_takedown:{ id:'windy_takedown', tier:'secondary', name:'Windy Takedown', emoji:'💥', element:'Air',
    desc:'Powerful strike. No cooldown — use multiple times per turn.', baseCooldown:0, multiUse:true,
    execute(s){
      const dmg = Math.round(25 + _incantationBonus(this.incantationLevel||1, 5, 0.95));
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:dmg, effects:[], abilityElement:'Air', apMult:0.75}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:dmg, effects:[], abilityElement:'Air', apMult:0.75}); }
      s.log('💥 Windy Takedown!','player');
    }},
  sleeper_gust:{ id:'sleeper_gust', tier:'secondary', name:'Sleeper Gust', emoji:'😴', element:'Air',
    desc:'Hit twice for 1 damage each. Gain +1 action next turn per hit.', baseCooldown:2,
    execute(s){
      if(status.player.tornadoAoENext){ status.player.tornadoAoENext=false; log('🌪️ Tornado boost — AoE!','status');
        aliveEnemies().forEach((_,i)=>{ setActiveEnemy(combat.enemies.indexOf(aliveEnemies()[i])); s.hit({baseDamage:1, effects:[], hits:2, abilityElement:'Air', apMult:1.5}); });
        if(combat.enemies[combat.targetIdx]) setActiveEnemy(combat.targetIdx);
      } else { s.hit({baseDamage:1, effects:[], hits:2, abilityElement:'Air', apMult:1.5}); }
      if(!combat.over){
        const actionsBonus = Math.round(2 + _incantationBonus(this.incantationLevel||1, 1, 1.00));
        status.player.nextTurnBonusActions = (status.player.nextTurnBonusActions||0) + actionsBonus;
        s.log(`😴 Sleeper Gust! +${actionsBonus} actions next turn (${status.player.nextTurnBonusActions} pending).`,'player');
      }
    }},
  break_momentum:{ id:'break_momentum', tier:'secondary', name:'Break Momentum', emoji:'💫', element:'Air',
    desc:'Consume all Momentum. Deal 5 damage per Momentum stack.', baseCooldown:3,
    execute(s){
      const stacks = Math.floor(status.player.momentumStacks||0);
      if(stacks===0){ s.log('💫 No Momentum to consume!','status'); return; }
      const dmgPerStack = Math.round(5 + _incantationBonus(this.incantationLevel||1, 2, 0.95));
      const dmg = stacks * dmgPerStack + s.attackPow();
      status.player.momentumStacks = 0;
      applyDirectDamage('player','enemy', dmg, `💫 Break Momentum (${stacks}×${dmgPerStack})`);
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
      const momentumBonus = Math.round(5 + _incantationBonus(this.incantationLevel||1, 2, 0.95));
      addMomentumStacks(momentumBonus);
      player.spellbook.forEach(sp=>{ if((sp.currentCD||0)>0) sp.currentCD = Math.max(0,sp.currentCD-1); });
      s.log(`⚡ Storm Rush! +${momentumBonus} Momentum (×${status.player.momentumStacks.toFixed(1)}). All CDs −1.`,'player');
      if(typeof renderStatusTags==='function') renderStatusTags();
    }},

  // ════════════════════════════════ NEUTRAL ════════════════════════════════════
  power_strike:{ id:'power_strike', tier:'secondary', name:'Power Strike', emoji:'⚔️', element:'Neutral',
    desc:'Raw powerful strike that benefits greatly from Attack Power', baseCooldown:2,
    execute(s){
      const dmg = Math.round(30 + _incantationBonus(this.incantationLevel||1, 10, 0.95));
      s.hit({baseDamage:dmg, effects:[], apMult:2});
      s.log('⚔️ Power Strike!','player');
    }},
  double_tap:{ id:'double_tap', tier:'secondary', name:'Double Tap', emoji:'👊', element:'Neutral',
    desc:'Two rapid strikes in quick succession', baseCooldown:2,
    execute(s){
      const dmg = Math.round(15 + _incantationBonus(this.incantationLevel||1, 5, 0.95));
      s.hit({baseDamage:dmg, effects:[], hits:2, apMult:0.75});
      s.log('👊 Double Tap!','player');
    }},
  shield_bash:{ id:'shield_bash', tier:'secondary', name:'Shield Bash', emoji:'🛡️', element:'Neutral',
    desc:'Grant armor then deal damage equal to armor granted. Defense scaling applies.', baseCooldown:2,
    execute(s){
      const armorBase = Math.round(15 + _incantationBonus(this.incantationLevel||1, 3, 0.95));
      gainBlock('player', armorBase);
      if(!combat.over){
        const defBonus = Math.floor(defenseFor('player') * 2);
        const armorGranted = armorBase + defBonus;
        applyDirectDamage('player','enemy', armorGranted, '🛡 Shield Bash');
        s.log(`🛡️ Shield Bash! +${armorGranted} Armor → ${armorGranted} dmg`,'player');
      }
    }},
  vampiric_strike:{ id:'vampiric_strike', tier:'secondary', name:'Vampiric Strike', emoji:'🩸', element:'Neutral',
    desc:'Life-stealing strike — drain health from the target', baseCooldown:2,
    execute(s){
      const lifesteal = 0.40 + _incantationBonus(this.incantationLevel||1, 0.08, 0.90);
      s.hit({baseDamage:30, effects:[]});
      s.healSelf(Math.round((30+s.attackPow())*lifesteal));
      s.log('🩸 Vampiric Strike!','player');
    }},
  war_cry:{ id:'war_cry', tier:'secondary', name:'War Cry', emoji:'📯', element:'Neutral',
    desc:'Battle cry — surge of Power for this fight', baseCooldown:3,
    execute(s){
      const bonus = Math.round(10 + _incantationBonus(this.incantationLevel||1, 3, 0.90));
      status.player.battlePowerBonus = (status.player.battlePowerBonus||0) + bonus;
      s.log(`📯 War Cry! +${bonus} Power this battle (total: +${status.player.battlePowerBonus})`,'player');
      updateStatsUI();
    }},

  // ════════════════════════════════ DUO / MERGED ════════════════════════════════

  // ── Lightning + Fire ─────────────────────────────────────────────────────────
  plasma_arc:{ id:'plasma_arc', tier:'merged', name:'Plasma Arc', emoji:'⚡🔥', element:'Lightning/Fire',
    desc:'Deal Melt damage and load a Surge onto the target', baseCooldown:2,
    execute(s){
      const meltAmt = Math.round(20 + _incantationBonus(this.incantationLevel||1, 3, 0.90));
      const surgeVal = Math.round(30 + _incantationBonus(this.incantationLevel||1, 4, 0.90));
      applyMelt('player', 'enemy', meltAmt, '⚡🔥 Plasma Arc');
      if(!combat.over) _applySurge('enemy', surgeVal, '⚡🔥 Plasma Arc — Surge');
      s.log(`⚡🔥 Plasma Arc! ${meltAmt} Melt, Surge ${surgeVal} loaded.`,'player');
    }},

  superheated:{ id:'superheated', tier:'merged', name:'Superheated', emoji:'🌡️⚡', element:'Lightning/Fire',
    desc:'Double target Burn stacks and instantly trigger Surge', baseCooldown:4,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e || !e.alive) return;
      if((e.status.burnStacks||0) > 0){
        e.status.burnStacks = Math.round(e.status.burnStacks * 2);
        log(`🌡️ Superheated! Burn ×2 → ${e.status.burnStacks}`, 'player');
      }
      if(e.status.surgeActive){
        log(`⚡ Superheated triggers Surge (${e.status.surgeValue} dmg)!`, 'player');
        _triggerSurge('enemy');
      } else {
        log(`⚡ Superheated — no Surge to detonate`, 'player');
      }
      s.log('🌡️⚡ Superheated!','player');
    }},

  // ── Lightning + Nature ────────────────────────────────────────────────────────
  thunderroot:{ id:'thunderroot', tier:'merged', name:'Thunderroot', emoji:'⚡🌿', element:'Lightning/Nature',
    desc:'Strike with lightning, load Surge, and root the target', baseCooldown:2,
    execute(s){
      const surgeVal = Math.round(25 + _incantationBonus(this.incantationLevel||1, 4, 0.90));
      const rootAmt  = Math.round(2  + _incantationBonus(this.incantationLevel||1, 1, 1.00));
      s.hit({baseDamage:15, effects:[], abilityElement:'Lightning'});
      if(!combat.over){
        _applySurge('enemy', surgeVal, '⚡🌿 Thunderroot — Surge');
        applyRoot('player', 'enemy', rootAmt);
        s.log(`⚡🌿 Thunderroot! Surge ${surgeVal}, ${rootAmt} Root.`,'player');
      }
    }},

  static_bloom:{ id:'static_bloom', tier:'merged', name:'Static Bloom', emoji:'⚡🌸', element:'Lightning/Nature',
    desc:'Trigger all Seeds on the target. Apply 1 Shock per stack that bloomed.', baseCooldown:4,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e || !e.alive) return;
      const seeds = e.status.seeds || [];
      if(seeds.length === 0){ s.log('⚡🌸 Static Bloom — no Seeds to trigger','player'); return; }
      let totalStacks = 0;
      [...seeds].forEach(seed => {
        totalStacks += seed.stacks || 1;
        if(typeof _bloomSeed === 'function') _bloomSeed('enemy', seed, combat.activeEnemyIdx);
        if(combat.over) return;
      });
      if(!combat.over){
        e.status.seeds = [];
        const shockBonus = Math.round(_incantationBonus(this.incantationLevel||1, 1, 1.00));
        const shockAmt = totalStacks + shockBonus;
        e.status.shockStacks = (e.status.shockStacks||0) + shockAmt;
        log(`⚡ Static Bloom! +${shockAmt} Shock from ${totalStacks} bloomed stacks (×${e.status.shockStacks.toFixed(1)})`, 'status');
        s.log(`⚡🌸 Static Bloom! Seeds triggered, +${shockAmt} Shock.`,'player');
      }
    }},

  // ── Fire + Nature ─────────────────────────────────────────────────────────────
  burning_grove:{ id:'burning_grove', tier:'merged', name:'Burning Grove', emoji:'🔥🌱', element:'Fire/Nature',
    desc:'Apply Burn and plant a Damage Seed', baseCooldown:3,
    execute(s){
      const burnAmt = Math.round(10 + _incantationBonus(this.incantationLevel||1, 2, 0.90));
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e || !e.alive) return;
      e.status.burnStacks = (e.status.burnStacks||0) + burnAmt;
      e.status.burnSourcePower = s.effectPow();
      log(`🔥 Burning Grove: +${burnAmt} Burn (×${e.status.burnStacks})`, 'status');
      if(typeof _plantSeed === 'function') _plantSeed('enemy', 'damage', 2, 5, { incantLevel: this.incantationLevel||1 });
      s.log(`🔥🌱 Burning Grove! ${burnAmt} Burn, Damage Seed ×2 planted.`,'player');
    }},

  char_bloom:{ id:'char_bloom', tier:'merged', name:'Char Bloom', emoji:'🔥🌸', element:'Fire/Nature',
    desc:'Consume all Burn on the target — plant a Damage Seed with stacks equal to Burn consumed ÷ 10', baseCooldown:3,
    execute(s){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(!e || !e.alive) return;
      const burnConsumed = e.status.burnStacks || 0;
      if(burnConsumed <= 0){ s.log('🔥 Char Bloom — no Burn to consume','player'); return; }
      e.status.burnStacks = 0;
      const seedStacks = Math.max(1, Math.floor(burnConsumed / 10));
      const bonus = Math.round(_incantationBonus(this.incantationLevel||1, 1, 1.00));
      const finalStacks = seedStacks + bonus;
      log(`🔥 Char Bloom: ${burnConsumed} Burn consumed → ${finalStacks} Seed stacks`, 'player');
      if(typeof _plantSeed === 'function') _plantSeed('enemy', 'damage', finalStacks, 5, { incantLevel: this.incantationLevel||1 });
      s.log(`🔥🌸 Char Bloom! ${burnConsumed} Burn → Damage Seed ×${finalStacks}.`,'player');
    }},
};

const NEUTRAL_SPELL_IDS = ['power_strike','double_tap','shield_bash','vampiric_strike','war_cry'];

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
    // Plasma starts with all primary abilities — check all books to avoid duplicates
    Object.values(SPELL_CATALOGUE).forEach(s => {
      if(s.element === 'Plasma' && s.tier === 'primary'){
        const alreadyOwned = (player.spellbooks||[]).some(b => b.spells.some(x => x.id === s.id));
        if(!alreadyOwned) addSpellById(s.id);
      }
    });
  }
  // Other elements: no starter elemental spell — earn them via level-up spell choices
}
function addSpellById(id, skipBookCheck, rarity, bookIdx){
  const def=SPELL_CATALOGUE[id];
  if(!def) return null;
  const rarityKey = rarity || 'dim';
  const incantationLevel = (typeof SPELL_RARITY !== 'undefined' && SPELL_RARITY[rarityKey])
    ? SPELL_RARITY[rarityKey].level : 1;
  const spell={...def, currentCD:0, upgradeLevel:0, dmgMult:1.0, rarity:rarityKey, incantationLevel};
  if (typeof markSpellSeen === 'function') markSpellSeen(id);
  if(!skipBookCheck && player.spellbooks && player.spellbooks.length){
    addSpellToBook(spell, bookIdx);
  } else {
    player.spellbook.push(spell);
  }
  return spell;
}
function addItem(id){ player.inventory.push({...ITEM_CATALOGUE[id]}); }
function removeItemAt(idx){ player.inventory.splice(idx,1); }


