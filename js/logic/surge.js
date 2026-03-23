// ===== surge.js =====
// ─── LIGHTNING SURGE SYSTEM ──────────────────────────────────────────────────
// Surge is a Lightning status effect. One Surge per target.
// A Surge has a stored damage value and a meter that fills as the target takes damage.
// When the meter hits the threshold, Surge triggers: deals its value, then is consumed.

// Returns the current Surge trigger threshold (base 60, modified by passives/Fulgurite).
function _getSurgeThreshold() {
  let threshold = 60 - (combat._surgeFulguriteMinus || 0) + (combat._stormCoreBonus || 0);
  if (hasPassive('lightning_hair_trigger')) threshold -= 10;
  return Math.max(10, threshold); // floor at 10 so it can't go negative
}

// Apply Surge to a target. Creates new Surge or handles stacking per passives.
// targetSide: 'enemy' | 'player'
// value: the damage Surge will deal when it triggers
function _applySurge(targetSide, value, label) {
  let tStatus;
  if (targetSide === 'enemy') {
    const e = combat.enemies[combat.activeEnemyIdx];
    if (!e || !e.alive) return;
    tStatus = e.status;
  } else {
    tStatus = status.player;
  }
  label = label || '⚡ Surge';

  if (tStatus.surgeActive) {
    // Amplified: adding Surge to already-Surged target adds 25% of new value
    if (hasPassive('lightning_amplified')) {
      const bonus = Math.round(value * 0.25);
      tStatus.surgeValue = (tStatus.surgeValue || 0) + bonus;
      log(`⚡ Amplified: Surge +${bonus} → ${tStatus.surgeValue} stored`, 'status');
    } else {
      log(`⚡ Surge already active (${tStatus.surgeValue} dmg, ${Math.round(tStatus.surgeMeter||0)}/${_getSurgeThreshold()} charged)`, 'status');
    }
    return;
  }

  tStatus.surgeActive = true;
  tStatus.surgeValue  = value;
  tStatus.surgeMeter  = 0;
  log(`${label}: ${value} dmg Surge loaded (triggers at ${_getSurgeThreshold()} dmg)`, 'status');
}

// Add damage to the Surge meter. Called whenever damage is dealt to a target.
// source: 'hit' | 'dot' | 'conductivity' (informational only)
function _addToSurgeMeter(targetSide, dmgAmt) {
  if (dmgAmt <= 0) return;
  let tStatus;
  if (targetSide === 'enemy') {
    const e = combat.enemies[combat.activeEnemyIdx];
    if (!e || !e.alive) return;
    tStatus = e.status;
  } else {
    tStatus = status.player;
  }
  if (!tStatus || !tStatus.surgeActive) return;

  tStatus.surgeMeter = (tStatus.surgeMeter || 0) + dmgAmt;

  // Check if threshold reached
  if (tStatus.surgeMeter >= _getSurgeThreshold()) {
    _triggerSurge(targetSide);
  }
}

// Trigger a Surge on the target — deal damage, apply passives, consume Surge.
function _triggerSurge(targetSide) {
  let tStatus, targetName, targetObj;
  if (targetSide === 'enemy') {
    targetObj = combat.enemies[combat.activeEnemyIdx];
    if (!targetObj || !targetObj.alive) return;
    tStatus = targetObj.status;
    targetName = targetObj.name;
  } else {
    tStatus = status.player;
    targetName = 'you';
  }
  if (!tStatus || !tStatus.surgeActive) return;

  const surgeValue = tStatus.surgeValue || 0;
  log(`⚡ SURGE TRIGGERS on ${targetName}! (${surgeValue} dmg)`, 'player');

  // Consume Surge before dealing damage (prevents re-entry)
  tStatus.surgeActive = false;
  tStatus.surgeValue  = 0;
  tStatus.surgeMeter  = 0;

  // Live Wire: trigger hits all alive enemies, not just the active target
  const hasLiveWire = hasPassive('lightning_live_wire');
  if (hasLiveWire && targetSide === 'enemy') {
    const alive = aliveEnemies();
    alive.forEach(e => {
      setActiveEnemy(combat.enemies.indexOf(e));
      applyDirectDamage('player', 'enemy', surgeValue, '⚡ Surge (Live Wire)');
      if (combat.over) return;
    });
    // Restore active enemy
    if (!combat.over) setActiveEnemy(combat.targetIdx);
  } else {
    applyDirectDamage('player', targetSide, surgeValue, '⚡ Surge');
  }
  if (combat.over) return;

  // Mark that Surge triggered this turn (for Residual Current)
  combat._surgeTriggeredThisTurn = true;

  // Overcharged passive: +3 Shock to target on trigger
  if (hasPassive('lightning_overcharged') && targetSide === 'enemy') {
    const e = combat.enemies[combat.activeEnemyIdx];
    if (e && e.alive) {
      e.status.shockStacks = (e.status.shockStacks || 0) + 3;
      log(`⚡ Overcharged! +3 Shock (×${e.status.shockStacks.toFixed(1)})`, 'status');
    }
  }

  // Cascade: all player CDs −1
  if (hasPassive('lightning_cascade')) {
    (player.spellbooks || []).forEach(book => {
      book.spells.forEach(s => { if ((s.currentCD || 0) > 0) s.currentCD--; });
    });
    if (combat.basicCD > 0) combat.basicCD--;
    log(`⚡ Cascade! All cooldowns −1`, 'status');
  }

  // Storm Core: threshold permanently +15 this battle per trigger
  if (hasPassive('lightning_storm_core')) {
    combat._stormCoreBonus = (combat._stormCoreBonus || 0) + 15;
    log(`⚡ Storm Core: threshold now ${_getSurgeThreshold()} (+15)`, 'status');
  }

  // Chain Surge: auto-reapply Surge with the same value
  if (hasPassive('lightning_chain_surge') && targetSide === 'enemy') {
    const e = combat.enemies[combat.activeEnemyIdx];
    if (e && e.alive) {
      e.status.surgeActive = true;
      e.status.surgeValue  = surgeValue;
      e.status.surgeMeter  = 0;
      log(`⚡ Chain Surge: Surge ${surgeValue} re-applied!`, 'status');
    }
  }

  // ── Duo: Flashfire (Lightning+Fire) — Burn = 25% of surge damage ──
  if (hasPassive('duo_flashfire') && targetSide === 'enemy') {
    const e = combat.enemies[combat.activeEnemyIdx];
    if (e && e.alive) {
      const burnAmt = Math.max(1, Math.floor(surgeValue * 0.25));
      e.status.burnStacks = (e.status.burnStacks || 0) + burnAmt;
      log(`⚡🔥 Flashfire! +${burnAmt} Burn from Surge`, 'status');
    }
  }

  // ── Duo: Stormseed (Lightning+Nature) — all Seed timers −1 ──
  if (hasPassive('duo_stormseed')) {
    const allEnemies = targetSide === 'enemy' ? [combat.enemies[combat.activeEnemyIdx]] : [];
    allEnemies.forEach(e => {
      if (!e || !e.alive) return;
      (e.status.seeds || []).forEach(seed => { seed.timer = Math.max(0, seed.timer - 1); });
      log(`⚡🌱 Stormseed! All Seed timers −1`, 'status');
    });
    // Also tick player seeds if any
    if (targetSide === 'player') {
      (status.player.seeds || []).forEach(seed => { seed.timer = Math.max(0, seed.timer - 1); });
      log(`⚡🌱 Stormseed! All Seed timers −1`, 'status');
    }
  }

  // Residual Current pending: apply stored surge value to target
  if (combat._residualCurrentPending && targetSide === 'enemy') {
    combat._residualCurrentPending = false;
    const rcVal = combat._residualCurrentValue || 30;
    const e = combat.enemies[combat.activeEnemyIdx];
    if (e && e.alive) {
      e.status.surgeActive = true;
      e.status.surgeValue  = rcVal;
      e.status.surgeMeter  = 0;
      log(`⚡ Residual Current: Surge ${rcVal} applied!`, 'status');
    }
  }

  renderStatusTags();
}

// Called each round in startRound. Handles:
//  - Static Build: if Surge active and didn't trigger, +20 to its value
//  - Conductivity: each Shock stack on enemy = 2 toward meter
function _tickSurgeBuilds() {
  const hasStaticBuild    = hasPassive('lightning_static_build');
  const hasConductivity   = hasPassive('lightning_conductivity');
  const hasMoltenCurrent  = hasPassive('duo_molten_current');
  const hasChargedRoots   = hasPassive('duo_charged_roots');

  combat.enemies.forEach((e, i) => {
    if (!e.alive) return;
    setActiveEnemy(i);

    // Molten Current (Lightning+Fire): Burn stacks count 1 each toward Surge meter
    if (hasMoltenCurrent && e.status.surgeActive) {
      const burnContrib = e.status.burnStacks || 0;
      if (burnContrib > 0) {
        log(`🌊🔥 Molten Current: +${burnContrib} Surge meter from ${burnContrib} Burn`, 'status');
        _addToSurgeMeter('enemy', burnContrib);
        if (combat.over) return;
      }
    }

    // Charged Roots (Lightning+Nature): Root stacks count 3 each toward Surge meter
    if (!combat.over && hasChargedRoots && e.status.surgeActive) {
      const rootContrib = (e.status.rootStacks || 0) * 3;
      if (rootContrib > 0) {
        log(`⚡🌿 Charged Roots: +${rootContrib} Surge meter from ${e.status.rootStacks} Root`, 'status');
        _addToSurgeMeter('enemy', rootContrib);
        if (combat.over) return;
      }
    }

    if (!e.status.surgeActive) return; // may have triggered above

    // Conductivity: Shock stacks count as 2 dmg each toward meter
    if (hasConductivity) {
      const shockContrib = (e.status.shockStacks || 0) * 2;
      if (shockContrib > 0) {
        log(`⚡ Conductivity: +${shockContrib} Surge meter from ${Math.round(e.status.shockStacks)} Shock`, 'status');
        _addToSurgeMeter('enemy', shockContrib);
        if (combat.over) return;
      }
    }

    // Static Build: +20 surge value per turn it didn't trigger
    if (!combat.over && e.status.surgeActive && hasStaticBuild) {
      e.status.surgeValue = (e.status.surgeValue || 0) + 20;
      log(`⚡ Static Build: Surge value → ${e.status.surgeValue}`, 'status');
    }
  });

  // Restore active enemy
  if (!combat.over) setActiveEnemy(combat.targetIdx);
}
