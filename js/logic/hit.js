// ===== hit.js =====
// ─── DAMAGE PIPELINE ─────────────────────────────────────────────────────────

function _elemTalentDmgMult(element) {
  switch(element) {
    case 'Fire':      return player._talentFireDmgMult   || 1.0;
    case 'Water':     return player._talentWaterDmgMult  || 1.0;
    case 'Ice':       return player._talentIceDmgMult    || 1.0;
    case 'Lightning': return player._talentLightDmgMult  || 1.0;
    case 'Earth':     return player._talentEarthDmgMult  || 1.0;
    case 'Nature':    return player._talentNatureDmgMult || 1.0;
    case 'Plasma':    return player._talentPlasmaDmgMult || 1.0;
    case 'Air':       return player._talentAirDmgMult    || 1.0;
    default:          return 1.0;
  }
}

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
        const elemMult = _elemTalentDmgMult(adj.abilityElement || (spell ? spell.element : '') || '');
        adj.baseDamage = Math.round(adj.baseDamage * mult * elemMult);
        if(spell && !adj.label) adj.label = `${spell.emoji||''} ${spell.name}`;
        // Air multi-hit talent: extra hits on multi-hit Air spells
        if((adj.abilityElement==='Air' || (spell && spell.element==='Air')) && (adj.hits||1) > 1){
          adj.hits = (adj.hits||1) + (player._talentAirHits||0);
        }
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
    const apMult = (meta && meta.apMult != null) ? meta.apMult : 1;
    if(dmg > 0) dmg += Math.round(pow * apMult);
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
      const overloadFloor = (attackerSide==='player') ? Math.max(0.25, player._talentOverloadFloor||0.25) : 0.25;
      const mult = clamp(status[attackerSide].lightningMult, overloadFloor, 10);
      dmg = Math.round(dmg * mult);
      if(meta && meta.consumeLightningAmp){
        status[attackerSide].lightningMult = Math.max(overloadFloor, status[attackerSide].lightningMult - 0.25);
      }
    }
  }

  // Shock: baseline (3 + casterEFX/10)%/stack outgoing damage. Conduction passive adds +2%.
  const sStacks = status[attackerSide].shockStacks || 0;
  if(sStacks > 0 && dmg > 0){
    const hasConduction = (attackerSide==='player' && hasPassive('lightning_conduction')) ||
                          (attackerSide==='enemy'  && enemyHasPassive('lightning_conduction'));
    const casterEFX = effectPowerFor(defenderSide);
    const pctPerStack = (3 + casterEFX / 10) / 100 + (hasConduction ? 0.02 : 0);
    const reduction = clamp(sStacks * pctPerStack, 0, 0.75);
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

    // ── Static Shock: passive effect TBD ──

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
              log(`💨 Dodge! Momentum −${lost} (×${status.player.momentumStacks.toFixed(1)})`, 'status');
            }
          }
          renderStatusTags();
        }
        continue;
      }
    }

    // ── Base damage ──
    let dmg = applyOutgoingDamageMods(attackerSide, defenderSide, pkg.baseDamage, {consumeLightningAmp:true, _noAtk:!!pkg._noAtk, apMult:pkg.apMult});

    // Hard Shell (Earth defender): flat damage reduction per hit
    if(!fissure){
      const armor = armorReductionFor(defenderSide);
      if(armor > 0) dmg = Math.max(0, dmg - armor);
    }

    // ── Frozen 1.5× damage on Ice hits — consumes 10 stacks and breaks freeze ──
    const defIsFrozen = status[defenderSide].frozen;
    if(defIsFrozen && pkg.abilityElement==='Ice'){
      dmg = Math.round(dmg * 1.5);
      status[defenderSide].frostStacks = Math.max(0, (status[defenderSide].frostStacks||0) - 10);
      status[defenderSide].frozen = false;
      log(`🧊 Frozen! 1.5× damage, 10 Frost consumed (${status[defenderSide].frostStacks} remaining)`, 'status');
    }

    // ── Block absorption (fissure bypasses) ──
    if(!fissure){
      const effBlock = effectiveArmor(defenderSide); // includes Stone/Frost/Foam modifiers
      if(effBlock < 0 && dmg > 0){
        // Negative armor (foam stripped past zero): bonus damage to attacker
        dmg -= effBlock; // effBlock is negative, so subtracting adds to dmg
        log(`🫧 Exposed! +${-effBlock} bonus dmg (armor broken by foam)`, 'status');
      } else if(effBlock > 0 && dmg > 0){
        const absorbed = Math.min(effBlock, dmg);
        dmg = Math.max(0, dmg - absorbed);
        // Only consume real block (Stone/Frost don't deplete)
        const blockConsumed = Math.min(status[defenderSide].block||0, absorbed);
        const blockBefore = status[defenderSide].block||0;
        // Track armor peak for Meltdown legendary
        if(defenderSide === 'enemy' && blockBefore > 0)
          status[defenderSide]._armorPeak = Math.max(status[defenderSide]._armorPeak||0, blockBefore);
        status[defenderSide].block = Math.max(0, blockBefore - blockConsumed);
        if(absorbed > 0) log(`🛡️ Armor absorbs ${absorbed}. (${status[defenderSide].block} block left)`, 'status');

        // Earthen Bulwark: +2 Stone when block reaches 0
        if(defenderSide==='player' && blockBefore > 0 && status.player.block === 0 &&
           hasPassive('earth_earthen_bulwark')){
          addStoneStacks('player', 2);
          log('🪨 Earthen Bulwark! +2 Stone', 'status');
        }

        // Meltdown legendary: when enemy armor fully breaks via any hit
        if(attackerSide==='player' && defenderSide==='enemy' && blockBefore > 0 &&
           status[defenderSide].block === 0 && hasPassive('fire_meltdown')){
          const peak = status[defenderSide]._armorPeak || blockBefore;
          const _mdownDmg = Math.round(peak);
          log(`🌋 Meltdown! +${_mdownDmg} from peak armor ${peak}!`, 'status');
          status[defenderSide]._armorPeak = 0;
          applyDirectDamage('player','enemy', _mdownDmg, '🌋 Meltdown');
          if(combat.over) return;
        }

        // Tidal Shield reactive: Foam attacker + heal per block consumed
        if(defenderSide==='player' && status.player.tidalShieldActive && blockConsumed > 0 && attackerSide==='enemy'){
          applyHeal('player', blockConsumed, '🌊 Tidal Shield');
          const eIdx = combat.activeEnemyIdx;
          if(combat.enemies[eIdx] && combat.enemies[eIdx].alive){
            applyFoam('player', 'enemy', 1);
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

    const _atkEnemy = combat.enemies[combat.activeEnemyIdx];
    applyDirectDamage(attackerSide, defenderSide, dmg,
      pkg.label || (pkg.isEnemyAttack
        ? `${_atkEnemy?.emoji||''} ${_atkEnemy?.name||'Enemy'}`
        : 'Hit'));

    // ── Air: Momentum gain per damage instance ──
    if(attackerSide==='player' && playerElement==='Air' && dmg > 0 && !pkg._isTornadoSelf){
      let momGain = 1;
      if(hasPassive('air_gale_force') && Math.random() < 0.5) momGain++;
      addMomentumStacks(momGain);
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

    // ── Lightning Double Strike ──
    if(pkg.abilityElement==='Lightning' && !pkg._isDblStrike){
      const hasDouble = (attackerSide==='player' && hasPassive('lightning_double')) ||
                        (attackerSide==='enemy'  && enemyHasPassive('lightning_double'));
      if(hasDouble){
        const pow = effectPowerFor(attackerSide);
        const chance = clamp((30 + Math.floor(pow/2))/100, 0, 10);
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
        let stacks = Math.round(((eff.stacks||0) + powerBonus) * 0.75);
        if((attackerSide==='player' && hasPassive('fire_pyromaniac')) ||
           (attackerSide==='enemy'  && enemyHasPassive('fire_pyromaniac'))) stacks += 3;
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
        applyFoam(attackerSide, defenderSide, 1);
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
        const threshold = clamp(20 + Math.floor(effectPowerFor('player')/4) + (player._talentIceExecute||0), 0, 60);
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


    // ── Eye of the Storm: repeat strike chance per Momentum stack ──
    if(attackerSide==='player' && playerElement==='Air' && dmg > 0 &&
       hasPassive('air_eye_of_the_storm') && !pkg._isTornadoSelf){
      const repeatChance = Math.min(0.95, Math.floor(status.player.momentumStacks||0) * 0.03);
      const depth = pkg._eotDepth || 0;
      if(depth < 1 && repeatChance > 0 && Math.random() < repeatChance){
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
  // Armor reduces it; block does NOT. Does NOT count toward Surge meter.
  if(dmg <= 0) return;
  const armor = armorReductionFor(defenderSide);
  if(armor > 0){
    const reduced = Math.max(0, dmg - armor);
    if(reduced < dmg) log(`🛡️ Armor absorbs ${dmg-reduced} from ${label}`, 'status');
    dmg = reduced;
    if(dmg <= 0) return;
  }
  applyDirectDamage(attackerSide, defenderSide, dmg, label, {noSurge: true});
}

function applyDirectDamage(attackerSide, defenderSide, dmg, label, opts){
  if(dmg <= 0){ if(label) log(`${label}: 0 dmg.`, 'status'); return; }

  if(defenderSide==='enemy'){
    const e = combat.enemies[combat.activeEnemyIdx];
    if(!e || !e.alive) return;
    e.hp = Math.max(0, e.hp - dmg);
    if(attackerSide === 'player') _runDmgDealt += dmg;
    log(`${label} deals ${dmg} to ${e.name}. (${e.hp}/${e.enemyMaxHP})`, attackerSide==='player'?'player':'enemy');
    triggerHitFlash('enemy', combat.activeEnemyIdx);
    // Surge meter: direct player damage feeds the meter (effect/DOT damage skipped via opts.noSurge)
    if(attackerSide === 'player' && !(opts && opts.noSurge) && typeof _addToSurgeMeter === 'function'){
      _addToSurgeMeter('enemy', dmg);
      if(combat.over) return; // Surge may have triggered and ended battle
    }
    if(e.hp <= 0){
      e.alive = false;
      _runKillsThisRun++;
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

// ─── MELT DAMAGE ─────────────────────────────────────────────────────────────
// Melt is a Fire damage type that hits armor at 3:1 efficiency (ceil(armor/3) points
// to destroy all armor), then remaining points deal direct HP damage at 1:1.
// Bypasses shock damage reduction and all shield effects — armor still applies normally.
function applyMelt(attackerSide, targetSide, meltPoints, label){
  if(meltPoints <= 0) return;
  label = label || '🔥 Melt';

  // ── Temper: consume flag to double this melt hit ──
  if(attackerSide === 'player' && combat.nextMeltDouble){
    meltPoints = meltPoints * 2;
    combat.nextMeltDouble = false;
    log(`⚔️ Temper: Melt doubled! (${meltPoints} pts)`, 'status');
  }

  // ── Molten Surge: all melt this turn doubled ──
  if(attackerSide === 'player' && combat.meltDoubleTurn){
    meltPoints = meltPoints * 2;
    log(`🌋 Molten Surge: Melt doubled! (${meltPoints} pts)`, 'status');
  }

  // ── Forge Master: +30% melt points ──
  if(attackerSide === 'player' && hasPassive('fire_forge_master')){
    meltPoints = Math.round(meltPoints * 1.30);
  }

  // ── Deep Heat: +EFX/5 bonus melt points ──
  if(attackerSide === 'player' && hasPassive('fire_deep_heat')){
    const deepBonus = Math.floor(effectPowerFor('player') / 5);
    if(deepBonus > 0) meltPoints += deepBonus;
  }

  // Get target object + status
  let targetStatus;
  let targetObj = null;
  if(targetSide === 'enemy'){
    targetObj = combat.enemies[combat.activeEnemyIdx];
    if(!targetObj || !targetObj.alive) return;
    targetStatus = targetObj.status;
  } else {
    targetStatus = status.player;
  }

  const currentArmor = targetStatus.block || 0;

  // ── Update armor peak for Meltdown ──
  if(currentArmor > 0)
    targetStatus._armorPeak = Math.max(targetStatus._armorPeak || 0, currentArmor);

  let remaining = meltPoints;
  let armorDestroyed = 0;

  if(currentArmor > 0){
    const breakCost = Math.ceil(currentArmor / 3);
    if(remaining >= breakCost){
      // Full armor break: costs ceil(armor/3) melt points
      armorDestroyed = currentArmor;
      remaining -= breakCost;
      targetStatus.block = 0;
      log(`⚒️ ${label}: ${armorDestroyed} armor melted! (${breakCost} pts used, ${remaining} pts remain)`, 'status');

      // ── Meltdown legendary ──
      const hasMeltdown = (attackerSide==='player' && hasPassive('fire_meltdown')) ||
                          (attackerSide==='enemy'  && enemyHasPassive('fire_meltdown'));
      if(hasMeltdown){
        const peak = targetStatus._armorPeak || armorDestroyed;
        const meltdownBonus = Math.round(peak);
        log(`🌋 Meltdown! +${meltdownBonus} bonus Melt (peak armor: ${peak})`, 'status');
        remaining += meltdownBonus;
      }
      targetStatus._armorPeak = 0;

      // ── Slag Trail: armor destroyed → burn stacks on target ──
      if(attackerSide === 'player' && hasPassive('fire_slag_trail') && armorDestroyed > 0 && targetObj){
        targetStatus.burnStacks = (targetStatus.burnStacks||0) + armorDestroyed;
        log(`🔥 Slag Trail: +${armorDestroyed} Burn from melted armor!`, 'status');
      }

      // ── Deep Heat: 50% of armor stripped as bonus melt ──
      if(attackerSide === 'player' && hasPassive('fire_deep_heat') && armorDestroyed > 0){
        const dhBonus = Math.floor(armorDestroyed * 0.5);
        if(dhBonus > 0){
          remaining += dhBonus;
          log(`🔥 Deep Heat: +${dhBonus} bonus Melt from stripped armor!`, 'status');
        }
      }
    } else {
      // Partial: each melt point chips 3 armor points
      const armorChipped = remaining * 3;
      targetStatus.block = Math.max(0, currentArmor - armorChipped);
      log(`⚒️ ${label}: chips ${armorChipped} armor. (${targetStatus.block} remain)`, 'status');
      remaining = 0;
    }
  }

  // ── HP damage portion ──
  if(remaining > 0){
    // Iron Burn: +1 bonus melt per 3 enemy burn stacks
    if(attackerSide === 'player' && hasPassive('fire_iron_burn') && targetSide === 'enemy'){
      const ibBonus = Math.floor((targetStatus.burnStacks||0) / 3);
      if(ibBonus > 0){
        remaining += ibBonus;
        log(`🔥 Iron Burn: +${ibBonus} from ${targetStatus.burnStacks} burn stacks`, 'status');
      }
    }

    // Armor Eater: +2 HP damage per armor point consumed by this melt
    if(attackerSide === 'player' && hasPassive('fire_armor_eater') && armorDestroyed > 0){
      const aeBonus = armorDestroyed * 2;
      remaining += aeBonus;
      log(`⚔️ Armor Eater: +${aeBonus} from ${armorDestroyed} armor consumed!`, 'status');
    }

    applyDirectDamage(attackerSide, targetSide, remaining, label);
    if(combat.over) return;

    // Eternal Flame: melt HP damage applies Burn (50% of HP damage dealt)
    if(attackerSide === 'player' && hasPassive('fire_eternal_flame') && targetSide === 'enemy'
       && targetObj && targetObj.alive){
      const flameBurn = Math.floor(remaining * 0.5);
      if(flameBurn > 0){
        targetStatus.burnStacks = (targetStatus.burnStacks||0) + flameBurn;
        log(`🔥 Eternal Flame: +${flameBurn} Burn from Melt!`, 'status');
      }
    }
  }

  updateHPBars();
  renderStatusTags();
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


