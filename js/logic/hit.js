// ===== hit.js =====
// ─── DAMAGE PIPELINE ─────────────────────────────────────────────────────────

function makeSpellCtx(attackerSide, defenderSide, spellIdx=-1){
  const temp = { deltaPower: 0 };
  return {
    get state(){ return {
      self: attackerSide==='player' ? status.player : (combat.enemies[combat.activeEnemyIdx]||{}).status,
      target: defenderSide==='player' ? status.player : (combat.enemies[combat.activeEnemyIdx]||{}).status,
    }; },
    attackerSide, defenderSide,
    log,
    // Three stat accessors
    attackPow: ()=> Math.max(0, attackPowerFor(attackerSide, defenderSide) + temp.deltaPower),
    effectPow: ()=> Math.max(0, effectPowerFor(attackerSide)),
    defStat:   ()=> Math.max(0, defenseFor(attackerSide)),
    // Legacy compat — defaults to attackPower
    effectivePower: ()=> Math.max(0, attackPowerFor(attackerSide, defenderSide) + temp.deltaPower),
    pushTempPower: (dp)=>{ temp.deltaPower += dp; },
    healSelf: (amount)=>{ if(attackerSide!=='player') return; applyHeal('player', amount, '💠 Heal'); },
    hit: (pkg)=>{
      const adj = {...pkg};
      if(attackerSide==='player' && typeof adj.baseDamage==='number'){
        const spell = player.spellbook[spellIdx];
        const mult = spell ? (spell.dmgMult||1.0) : 1.0;
        adj.baseDamage = Math.round(adj.baseDamage * mult);
      }
      if(!adj.abilityElement) adj.abilityElement = elementOfSide(attackerSide);
      performHit(attackerSide, defenderSide, adj);
    },
  };
}

function applyOutgoingDamageMods(attackerSide, defenderSide, baseDamage, meta){
  let dmg = Math.max(0, Math.round(baseDamage));
  // _noAtk: caller already baked power in (e.g. Plasma spells) — skip adding it again
  if(!meta || !meta._noAtk){
    const pow = attackPowerFor(attackerSide, defenderSide);
    if(dmg > 0) dmg += pow;
    // Plasma: Effect Power also adds to damage (EFX = ATK for Plasma)
    if(dmg > 0 && elementOfSide(attackerSide) === 'Plasma'){
      dmg += effectPowerFor(attackerSide);
    }
  }

  // Zone environment bonus: enemies whose element matches the active zone deal +20% damage
  if(attackerSide === 'enemy' && combat.activeZoneElement && dmg > 0){
    const e = combat.enemies[combat.activeEnemyIdx];
    if(e && primaryElement(e.element||'') === combat.activeZoneElement){
      dmg = Math.round(dmg * 1.20);
    }
  }

  // Lightning Overload multiplier
  if(elementOfSide(attackerSide)==='Lightning'){
    const hasOverload = (attackerSide==='player' && hasPassive('lightning_overload')) ||
                        (attackerSide==='enemy'  && enemyHasPassive('lightning_overload'));
    if(hasOverload){
      const mult = clamp(status[attackerSide].lightningMult, 0.25, 10);
      dmg = Math.round(dmg * mult);
      if(meta && meta.consumeLightningAmp){
        status[attackerSide].lightningMult = Math.max(0.25, status[attackerSide].lightningMult - 0.25);
      }
    }
  }

  // Shock (Conduction passive): reduce attacker's outgoing damage 5%/stack
  const sStacks = status[attackerSide].shockStacks || 0;
  const hasConduction = (attackerSide==='player' && hasPassive('lightning_conduction')) ||
                        (attackerSide==='enemy'  && enemyHasPassive('lightning_conduction'));
  if(sStacks > 0 && dmg > 0 && hasConduction){
    const reduction = clamp(sStacks * 0.05, 0, 0.75);
    dmg = Math.max(0, Math.round(dmg * (1 - reduction)));
  }

  return dmg;
}

function effectBlockedByRoot(defenderSide){
  if((status[defenderSide].rootStacks||0) > 0){
    const hasOvergrowth = (defenderSide==='player' && hasPassive('nature_overgrowth')) ||
                          (defenderSide==='enemy'  && enemyHasPassive('nature_overgrowth'));
    if(hasOvergrowth){
      status[defenderSide].rootStacks--;
      status[defenderSide].overgrowthStacks = (status[defenderSide].overgrowthStacks||0) + 1;
      log(`🌿 Overgrowth blocks effect! (root ×${status[defenderSide].rootStacks}, growth ×${status[defenderSide].overgrowthStacks})`, 'status');
    } else {
      status[defenderSide].rootStacks--;
      log(`🌿 Root blocks effect! (×${status[defenderSide].rootStacks} left)`, 'status');
    }
    return true;
  }
  return false;
}

function performHit(attackerSide, defenderSide, pkg){
  const hits = pkg.hits || 1;
  for(let i = 0; i < hits; i++){
    if(combat.over) return;

    // ── Spell animation (cosmetic, non-blocking) ──
    if(!pkg._isEcho && !pkg._isReflect && !pkg._isDblStrike && !pkg._isElemProc && i === 0){
      if(typeof triggerSpellAnim === 'function'){
        triggerSpellAnim(
          pkg.abilityElement || (attackerSide === 'player' ? playerElement : 'Neutral'),
          attackerSide,
          combat.activeEnemyIdx
        );
      }
    }

    // ── Static Shock: % current HP before hit ──
    if(pkg.abilityElement==='Lightning'){
      const hasStatic = (attackerSide==='player' && hasPassive('lightning_static')) ||
                        (attackerSide==='enemy'  && enemyHasPassive('lightning_static'));
      if(hasStatic){
        const pow = effectPowerFor(attackerSide);
        const pct = (10 + Math.floor(pow/10)) / 100;
        const curHP = defenderSide==='enemy'
          ? (combat.enemies[combat.activeEnemyIdx]||{hp:0}).hp
          : player.hp;
        const staticDmg = Math.max(1, Math.round(curHP * pct));
        applyDirectDamage(attackerSide, defenderSide, staticDmg, '⚡ Static Shock');
        if(combat.over) return;
      }
    }

    // ── Dodge / Phase ──
    const fissure = isEarthFissure(attackerSide, pkg);
    if(!fissure){
      if(status[defenderSide].phaseTurns > 0){
        status[defenderSide].phaseTurns--;
        log(`🔮 ${defenderSide==='player'?'You':combat.enemy.name} phase — attack misses!`, 'status');
        renderStatusTags();
        continue;
      }
      const dodgeChance = dodgeChanceFor(defenderSide);
      if(dodgeChance > 0 && Math.random() < dodgeChance){
        log(`💨 ${defenderSide==='player'?'You':combat.enemy.name} dodge!`, 'status');
        // Air: Momentum decay on dodge
        if(defenderSide==='player' && playerElement==='Air'){
          if(status.player.momentumNoDecayNext){
            status.player.momentumNoDecayNext = false;
            log('🌬️ Become Wind — no Momentum decay this dodge!', 'status');
          } else {
            const decayPct = hasPassive('air_slipstream') ? 0.10 : 0.25;
            const cur = status.player.momentumStacks||0;
            const lost = Math.max(0, Math.floor(cur * decayPct));
            if(lost > 0){
              status.player.momentumStacks = cur - lost;
              log(`💨 Dodge! Momentum −${lost} (×${status.player.momentumStacks})`, 'status');
            }
          }
          renderStatusTags();
        }
        continue;
      }
    }

    // ── Base damage ──
    let dmg = applyOutgoingDamageMods(attackerSide, defenderSide, pkg.baseDamage, {consumeLightningAmp:true, _noAtk:!!pkg._noAtk});

    // Hard Shell (Earth defender): flat damage reduction per hit
    if(!fissure){
      const armor = armorReductionFor(defenderSide);
      if(armor > 0) dmg = Math.max(0, dmg - armor);
    }

    // ── Frozen double damage: Ice hits against frozen targets deal 2× ──
    const defIsFrozen = status[defenderSide].frozen;
    if(defIsFrozen && pkg.abilityElement==='Ice'){
      dmg = dmg * 2;
      log(`🧊 Frozen target takes double Ice damage!`, 'status');
    }

    // ── Block absorption (fissure bypasses) ──
    if(!fissure){
      const effBlock = effectiveArmor(defenderSide); // includes Stone/Frost/Foam modifiers
      if(effBlock > 0 && dmg > 0){
        const absorbed = Math.min(effBlock, dmg);
        dmg = Math.max(0, dmg - absorbed);
        // Only consume real block (Stone/Frost don't deplete)
        const blockConsumed = Math.min(status[defenderSide].block||0, absorbed);
        const blockBefore = status[defenderSide].block||0;
        status[defenderSide].block = Math.max(0, blockBefore - blockConsumed);
        if(absorbed > 0) log(`🛡️ Armor absorbs ${absorbed}. (${status[defenderSide].block} block left)`, 'status');

        // Earthen Bulwark: +2 Stone when block reaches 0
        if(defenderSide==='player' && blockBefore > 0 && status.player.block === 0 &&
           hasPassive('earth_earthen_bulwark')){
          addStoneStacks('player', 2);
          log('🪨 Earthen Bulwark! +2 Stone', 'status');
        }

        // Tidal Shield reactive: Foam attacker + heal per block consumed
        if(defenderSide==='player' && status.player.tidalShieldActive && blockConsumed > 0 && attackerSide==='enemy'){
          applyHeal('player', blockConsumed, '🌊 Tidal Shield');
          const eIdx = combat.activeEnemyIdx;
          if(combat.enemies[eIdx] && combat.enemies[eIdx].alive){
            combat.enemies[eIdx].status.foamStacks = (combat.enemies[eIdx].status.foamStacks||0) + 1;
            log('🌊 Tidal Shield: +1 Foam on attacker', 'status');
          }
          status.player.tidalShieldActive = false;
        }

        // Cryostasis reactive: 3 Frost to attacker when armor is hit
        if(defenderSide==='player' && status.player.cryostasisActive && blockConsumed > 0 && attackerSide==='enemy'){
          applyFrost('player','enemy', 3);
          status.player.cryostasisActive = false;
          log('🧊 Cryostasis: 3 Frost to attacker!', 'status');
        }
      } else if(effBlock < 0 && dmg > 0){
        const bonus = -effBlock;
        dmg += bonus;
        log(`💧 Foam overflow! +${bonus} bonus damage`, 'status');
      }
    }

    // ── Firewall: defender absorbs with fire shield stacks ──
    if(defenderSide==='player' && (status.player.firewallStacks||0) > 0 && dmg > 0){
      const absorbed = Math.min(status.player.firewallStacks * 5, dmg);
      const stacksUsed = Math.ceil(absorbed / 5);
      status.player.firewallStacks = Math.max(0, status.player.firewallStacks - stacksUsed);
      dmg -= absorbed;
      dmg = Math.max(0, dmg);
      // Apply burn to attacker
      if(attackerSide==='enemy'){
        combat.enemies[combat.activeEnemyIdx].status.burnStacks =
          (combat.enemies[combat.activeEnemyIdx].status.burnStacks||0) + stacksUsed*2;
        log(`🔥 Firewall! −${stacksUsed} stacks, ${stacksUsed*2} Burn to attacker`, 'status');
      }
    }

    // ── Wind Wall: delay incoming damage ──
    if(defenderSide==='player' && status.player.windWallActive && dmg > 0 && !pkg._isWindWall){
      status.player.windWallActive = false;
      status.player.windWallPending = (status.player.windWallPending||0) + dmg;
      log(`🌬️ Wind Wall! ${dmg} damage delayed to next turn.`, 'status');
      renderStatusTags();
      dmg = 0;
    }

    applyDirectDamage(attackerSide, defenderSide, dmg,
      pkg.isEnemyAttack ? `${combat.enemy.emoji} Attack` : 'Hit');

    // ── Air: Momentum gain per damage instance ──
    if(attackerSide==='player' && playerElement==='Air' && dmg > 0 && !pkg._isTornadoSelf){
      let momGain = 1;
      if(hasPassive('air_gale_force')) momGain++;
      status.player.momentumStacks = (status.player.momentumStacks||0) + momGain;
      log(`💨 Momentum +${momGain} (×${status.player.momentumStacks})`, 'status');
    }

    // Record for Plasma echo
    if(dmg > 0 && !pkg._isEcho && !pkg.noRecord){
      status[attackerSide].lastDamagePkg = {
        baseDamage: pkg.baseDamage||0,
        meta: {isBasic:!!pkg.isBasic, abilityElement:pkg.abilityElement}
      };
    }

    if(combat.over) return;

    // ── Embrittlement: Frozen targets take +3 per damage instance ──
    if(defIsFrozen && dmg > 0){
      const hasEmbrit = (attackerSide==='player' && hasPassive('ice_embrittlement')) ||
                        (attackerSide==='enemy'  && enemyHasPassive('ice_embrittlement'));
      if(hasEmbrit){
        applyDirectDamage(attackerSide, defenderSide, 3, '🧊 Embrittlement');
        if(combat.over) return;
      }
    }

    // ── Ebb: reflect damage ──
    if(defenderSide==='player' && hasPassive('water_ebb') && dmg > 0 && !pkg._isReflect){
      const pow = defenseFor('player');
      const reflectPct = (20 + Math.floor(pow/10)) / 100;
      const reflectDmg = Math.max(1, Math.round(dmg * reflectPct));
      log(`🌊 Ebb reflects ${reflectDmg}!`, 'status');
      performHit('player', 'enemy', {baseDamage:reflectDmg, effects:[], abilityElement:'Water', _isReflect:true, noRecord:true});
      if(combat.over) return;
    }
    if(defenderSide==='enemy' && enemyHasPassive('water_ebb') && dmg > 0 && !pkg._isReflect){
      const pow = defenseFor('enemy');
      const reflectPct = (20 + Math.floor(pow/10)) / 100;
      const reflectDmg = Math.max(1, Math.round(dmg * reflectPct));
      log(`🌊 Enemy Ebb reflects ${reflectDmg}!`, 'status');
      performHit('enemy', 'player', {baseDamage:reflectDmg, effects:[], abilityElement:'Water', _isReflect:true, noRecord:true});
      if(combat.over) return;
    }

    // ── Lightning: queue Shock stacks ──
    if(pkg.abilityElement==='Lightning'){
      let stacksToAdd = 1;
      if(attackerSide==='player' && hasPassive('lightning_conduction')) stacksToAdd += 1;
      if(attackerSide==='enemy'  && enemyHasPassive('lightning_conduction')) stacksToAdd += 1;
      status[defenderSide].shockPending = (status[defenderSide].shockPending||0) + stacksToAdd;
      log(`⚡ Shock +${stacksToAdd} queued`, 'status');
      _plasmaChargeOnDebuff(defenderSide);
    }

    // ── Lightning Double Strike ──
    if(pkg.abilityElement==='Lightning' && !pkg._isDblStrike){
      const hasDouble = (attackerSide==='player' && hasPassive('lightning_double')) ||
                        (attackerSide==='enemy'  && enemyHasPassive('lightning_double'));
      if(hasDouble){
        const pow = effectPowerFor(attackerSide);
        const chance = clamp((30 + Math.floor(pow/5))/100, 0, 10);
        const roll = Math.random();
        const extraHits = (chance > 1.0 && roll < chance - 1.0) ? 2 :
                          (roll < Math.min(chance, 1.0)) ? 1 : 0;
        for(let h = 0; h < extraHits; h++){
          log(`💥 ${h===0?'Double':'Triple'} Strike!`, 'status');
          performHit(attackerSide, defenderSide, {...pkg, baseDamage:Math.round((pkg.baseDamage||0)*0.7), _isDblStrike:true, noRecord:true});
          if(combat.over) return;
        }
      }
    }

    // ── Apply spell effects: burn / stun (each blockable by Root) ──
    (pkg.effects||[]).forEach(eff => {
      if(combat.over) return;
      // Debuff immune (Brave Burn)
      if(status[defenderSide].debuffImmune > 0) return;
      if(effectBlockedByRoot(defenderSide)) return;

      if(eff.type==='burn'){
        const pow = effectPowerFor(attackerSide);
        const powerBonus = Math.floor(pow * 0.2);
        let stacks = (eff.stacks||0) + powerBonus;
        if((attackerSide==='player' && hasPassive('fire_pyromaniac')) ||
           (attackerSide==='enemy'  && enemyHasPassive('fire_pyromaniac'))) stacks += 5;
        status[defenderSide].burnStacks += stacks;
        status[defenderSide].burnSourcePower = pow;
        log(`🔥 Burn +${stacks} (×${status[defenderSide].burnStacks})`, 'status');
        _plasmaChargeOnDebuff(defenderSide);

        const pre = status[defenderSide].burnStacks - stacks;
        if(pre > 0){
          const hasCombustion = (attackerSide==='player' && hasPassive('fire_combustion')) ||
                                (attackerSide==='enemy'  && enemyHasPassive('fire_combustion'));
          if(hasCombustion){
            const growth = 1 + Math.floor(pre / 5);
            status[defenderSide].burnStacks += growth;
            log(`💥 Combustion: +${growth} extra burn (×${status[defenderSide].burnStacks})`, 'status');
          }
        }
      } else if(eff.type==='stun'){
        status[defenderSide].stunned = Math.max(status[defenderSide].stunned, eff.turns||1);
        log(`❄️ Stun ${eff.turns||1}t`, 'status');
        _plasmaChargeOnDebuff(defenderSide);
      }
    });

    // ── Sea Foam passive: every Water hit applies 1 Foam ──
    if(pkg.abilityElement==='Water' && !pkg._isReflect){
      const hasFoam = (attackerSide==='player' && hasPassive('water_sea_foam')) ||
                      (attackerSide==='enemy'  && enemyHasPassive('water_sea_foam'));
      if(hasFoam){
        status[defenderSide].foamStacks = (status[defenderSide].foamStacks||0) + 1;
        log(`🫧 Sea Foam +1 (×${status[defenderSide].foamStacks})`, 'status');
        _plasmaChargeOnDebuff(defenderSide);
      }
    }

    // ── Nature Root proc on all Nature hits ──
    if(elementOfSide(attackerSide)==='Nature' && !pkg._isReflect){
      if(Math.random() < ROOT_PROC_CHANCE){
        applyRoot(attackerSide, defenderSide, 1);
      }
    }

    // ── Thorned Strikes: bonus damage per Root/Overgrowth stack ──
    const hasThorns = (attackerSide==='player' && hasPassive('nature_thorned_strikes')) ||
                      (attackerSide==='enemy'  && enemyHasPassive('nature_thorned_strikes'));
    if(hasThorns){
      const totalRoots = (status[defenderSide].rootStacks||0) + (status[defenderSide].overgrowthStacks||0);
      if(totalRoots > 0){
        applyDirectDamage(attackerSide, defenderSide, totalRoots * 5, `🌵 Thorned Strikes (×${totalRoots})`);
        if(combat.over) return;
      }
    }

    // ── Ice Blast (execute): kills enemies below HP threshold ──
    if(defenderSide==='enemy' && attackerSide==='player' && hasPassive('ice_blast')){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(e && e.alive){
        const threshold = clamp(20 + Math.floor(effectPowerFor('player')/10), 0, 40);
        const pct = (e.hp / e.enemyMaxHP) * 100;
        if(pct <= threshold){
          log(`❄️ Ice Blast executes ${e.name} at ${Math.round(pct)}% HP!`, 'player');
          e.hp = 0; e.alive = false;
          if(aliveEnemies().length === 0){ endBattle(true); return; }
          combat.targetIdx = firstAliveIdx();
          setActiveEnemy(combat.targetIdx);
        }
      }
    }

    // ── Frozen break: Ice hits on frozen target break the freeze ──
    if(defIsFrozen && pkg.abilityElement==='Ice' && defenderSide==='enemy'){
      const e = combat.enemies[combat.activeEnemyIdx];
      if(e && e.status.frozen){
        e.status.frozen = false;
        e.status.frostStacks = 0;
        log(`🧊 Freeze broken on ${e.name}!`, 'status');
      }
    }
    if(defIsFrozen && pkg.abilityElement==='Ice' && defenderSide==='player'){
      if(status.player.frozen){
        status.player.frozen = false;
        status.player.frostStacks = 0;
        log(`🧊 Your freeze breaks!`, 'status');
      }
    }

    // ── Eye of the Storm: repeat strike chance per Momentum stack ──
    if(attackerSide==='player' && playerElement==='Air' && dmg > 0 &&
       hasPassive('air_eye_of_the_storm') && !pkg._isTornadoSelf){
      const repeatChance = Math.min(0.95, (status.player.momentumStacks||0) * 0.03);
      const depth = pkg._eotDepth || 0;
      if(depth < 10 && repeatChance > 0 && Math.random() < repeatChance){
        log(`👁️ Eye of the Storm repeats! (${Math.round(repeatChance*100)}% chance)`, 'status');
        performHit(attackerSide, defenderSide, {...pkg, _eotDepth: depth+1, noRecord:true});
        if(combat.over) return;
      }
    }
  }

  updateHPBars();
  renderStatusTags();
}

function applyEffectDamage(attackerSide, defenderSide, dmg, label){
  // Effect damage (burn, frost ticks, zone pressure, etc.)
  // Armor reduces it; block does NOT.
  if(dmg <= 0) return;
  const armor = armorReductionFor(defenderSide);
  if(armor > 0){
    const reduced = Math.max(0, dmg - armor);
    if(reduced < dmg) log(`🛡️ Armor absorbs ${dmg-reduced} from ${label}`, 'status');
    dmg = reduced;
    if(dmg <= 0) return;
  }
  applyDirectDamage(attackerSide, defenderSide, dmg, label);
}

function applyDirectDamage(attackerSide, defenderSide, dmg, label){
  if(dmg <= 0){ if(label) log(`${label}: 0 dmg.`, 'status'); return; }

  if(defenderSide==='enemy'){
    const e = combat.enemies[combat.activeEnemyIdx];
    if(!e || !e.alive) return;
    e.hp = Math.max(0, e.hp - dmg);
    if(attackerSide === 'player') _runDmgDealt += dmg;
    log(`${label} deals ${dmg} to ${e.name}. (${e.hp}/${e.enemyMaxHP})`, attackerSide==='player'?'player':'enemy');
    triggerHitFlash('enemy', combat.activeEnemyIdx);
    if(e.hp <= 0){
      e.alive = false;
      log(`💀 ${e.name} defeated!`, 'win');
      renderEnemyCards();
      if(aliveEnemies().length === 0){ endBattle(true); return; }
      combat.targetIdx = firstAliveIdx();
      setActiveEnemy(combat.targetIdx);
    }
  } else {
    // ── Plasma: Stall immunity ──
    if(playerElement === 'Plasma' && status.player.stallActive){
      log(`🫧 Stall! ${label} blocked.`, 'status');
      return;
    }
    // ── Plasma: Shield reduction ──
    if(playerElement === 'Plasma' && status.player.plasmaShieldReduction > 0 && dmg > 0){
      const reduced = Math.max(0, Math.round(dmg * (1 - status.player.plasmaShieldReduction / 100)));
      if(reduced < dmg) log(`🛡️ Plasma Shield absorbs ${dmg - reduced} (${status.player.plasmaShieldReduction}% reduction)`, 'status');
      dmg = reduced;
      if(dmg <= 0){ updateHPBars(); return; }
    }
    // For Plasma: allow HP to go negative so heals must actually cover the full deficit
    if(playerElement === 'Plasma'){
      player.hp = player.hp - dmg; // no floor — can go negative
      _runDmgTaken += dmg;
    } else {
      player.hp = Math.max(0, player.hp - dmg);
      _runDmgTaken += dmg;
    }
    log(`${label} deals ${dmg} to you. (${Math.max(0,player.hp)}/${maxHPFor('player')})`, 'enemy');
    triggerHitFlash('player');
    // ── Plasma: Charge gain on damage received ──
    if(playerElement === 'Plasma' && dmg > 0 && !label.includes('Recoil') && !label.includes('Self Sacrifice') && !label.includes('Charge Heal')){
      const hasStabilized = hasPassive('plasma_stabilized_core');
      if(hasStabilized){
        // Stabilized: 1 charge per hit (was 0.5)
        status.player.plasmaCharge = (status.player.plasmaCharge||0) + 1;
        log(`🔋 Charge +1 (Stabilized) → ${status.player.plasmaCharge}`, 'status');
        _plasmaBackfeed(attackerSide, dmg);
      } else {
        // Base: 2 charge per hit (was 1)
        status.player.plasmaCharge = (status.player.plasmaCharge||0) + 2;
        log(`⚡ Charge +2 → ${status.player.plasmaCharge}`, 'status');
        _plasmaBackfeed(attackerSide, dmg);
      }
      updateChargeUI();
    }
    // ── Deferred death: don't end battle mid-turn for Plasma (resolveFlat checks after all actions) ──
    // For non-Plasma, still end immediately (no heal-back mechanic)
    if(player.hp <= 0 && !combat.over){
      if(playerElement === 'Plasma') { /* deferred to resolveFlat end */ }
      else { endBattle(false); }
    }
  }
  updateHPBars();
}

// Grant Charge when a debuff is applied to the player (Plasma only, 1 per application instance)
// Only triggers when the Plasma abilities book is the currently active book
function _plasmaChargeOnDebuff(defenderSide){
  if(playerElement !== 'Plasma') return;
  if(defenderSide !== 'player') return;
  // Charge only accumulates when the plasma book is active
  const _pIdx = plasmaBookIdx();
  if(_pIdx < 0 || player.activeBookIdx !== _pIdx) return;
  const hasStabilized = hasPassive('plasma_stabilized_core');
  if(hasStabilized){
    // Stabilized: 1 charge per debuff (was 0.5)
    status.player.plasmaCharge = (status.player.plasmaCharge||0) + 1;
    log(`🔋 Charge +1 from debuff (Stabilized) → ${status.player.plasmaCharge}`, 'status');
    updateChargeUI();
  } else {
    // Base: 2 charge per debuff (was 1)
    status.player.plasmaCharge = (status.player.plasmaCharge||0) + 2;
    log(`⚡ Charge +2 from debuff → ${status.player.plasmaCharge}`, 'status');
    updateChargeUI();
  }
}

function _plasmaBackfeed(attackerSide, triggeringDmg){
  if(!hasPassive('plasma_backfeed_reactor')) return;
  const pow = attackPowerFor('player', 'enemy');
  const reflectDmg = Math.max(1, Math.round(triggeringDmg * 0.2 + pow / 5));
  // Reflect back at the active enemy
  const e = combat.enemies[combat.activeEnemyIdx];
  if(e && e.alive){
    e.hp = Math.max(0, e.hp - reflectDmg);
    log(`♻️ Backfeed Reactor: ${reflectDmg} reflected to ${e.name}!`, 'status');
    if(e.hp <= 0){ e.alive = false; log(`💀 ${e.name} defeated!`, 'win'); renderEnemyCards(); if(aliveEnemies().length===0) endBattle(true); }
  }
}


