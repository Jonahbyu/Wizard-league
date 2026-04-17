// ===== seeds.js =====
// ─── SEED SYSTEM — Nature element ────────────────────────────────────────────
// Seeds are planted on a target (enemies) or the player (Healing Seed) with a
// 5-turn germination timer. Planting the same type again adds stacks — all
// bloom simultaneously on the original timer (timer does NOT reset on stack).
// Eternal Garden: each individual stack has its own independent timer.

// ─── PLANT ───────────────────────────────────────────────────────────────────
// Returns true if Seed Surge was consumed (spell should reset its own CD).
function _plantSeed(targetSide, type, stacks, timer, opts) {
  stacks = stacks || 1;
  timer  = timer  || 4;
  const incantLevel = (opts && opts.incantLevel) || 1;

  // Patient Bloom: +1 timer
  if (hasPassive('nature_patient_bloom')) timer += 1;

  // Seed Surge: free stacks (incantation-scaled), next seed costs no CD
  const surge = !!combat._seedSurgePending;
  if (surge) { stacks += (combat._seedSurgeBonus || 2); combat._seedSurgePending = false; combat._seedSurgeBonus = 2; }

  const tgt = targetSide === 'player'
    ? status.player
    : (combat.enemies[combat.activeEnemyIdx] || {}).status;
  if (!tgt) return surge;
  if (!tgt.seeds) tgt.seeds = [];

  const eternal = hasPassive('nature_eternal_garden');

  if (type === 'silence') {
    // Silence never merges — each cast is its own independent seed
    for (let i = 0; i < stacks; i++)
      tgt.seeds.push({ type: 'silence', stacks: 1, timer, incantLevel });
    log(`🤫 Silence Seed planted! (${stacks} seed${stacks > 1 ? 's' : ''}, blooms in ${timer})`, 'status');
    return surge;
  }

  if (eternal) {
    // Eternal Garden: every stack is an independent entry with its own timer
    for (let i = 0; i < stacks; i++)
      tgt.seeds.push({ type, stacks: 1, timer, incantLevel });
    log(`🌱 ${_seedLabel(type)} Seed planted! (×${stacks} independent, timer ${timer})`, 'status');
  } else {
    // Normal: merge stacks onto existing seed of same type (timer unchanged)
    const existing = tgt.seeds.find(s => s.type === type);
    if (existing) {
      existing.stacks += stacks;
      log(`🌱 ${_seedLabel(type)} Seed stacked! (×${existing.stacks}, blooms in ${existing.timer})`, 'status');
    } else {
      tgt.seeds.push({ type, stacks, timer, incantLevel });
      log(`🌱 ${_seedLabel(type)} Seed planted! (×${stacks}, blooms in ${timer})`, 'status');
    }
  }
  return surge;
}

function _seedLabel(type) {
  return { damage: 'Damage', root: 'Root', silence: 'Silence', armor: 'Armor' }[type] || type;
}

// ─── BLOOM ───────────────────────────────────────────────────────────────────
function _bloomSeed(targetSide, seed, enemyIdx, opts) {
  if (!seed || seed.stacks <= 0) return;
  const prevActive = combat.activeEnemyIdx;
  if (targetSide === 'enemy' && enemyIdx !== undefined) setActiveEnemy(enemyIdx);

  const powerMult = (opts && opts.powerMult != null) ? opts.powerMult : 1;
  const efx = effectPowerFor('player');
  const def = defenseFor('player');
  const il  = seed.incantLevel || 1;
  const label = `🌸 ${_seedLabel(seed.type)} Seed (×${seed.stacks})`;
  const patientMult = hasPassive('nature_patient_bloom') ? 1.3 : 1;

  switch (seed.type) {
    case 'damage': {
      const perStack = Math.floor((30 + _incantationBonus(il, 5, 0.90) + efx * 0.5) * patientMult);
      const _bEnemy = combat.enemies[combat.activeEnemyIdx];
      const _hpBefore = _bEnemy ? _bEnemy.hp : 0;
      performHit('player', 'enemy', {
        baseDamage: Math.floor(perStack * seed.stacks * powerMult),
        effects: [], abilityElement: 'Nature',
        label, _noAtk: true, noRecord: true,
      });
      // Wildfire Seeds (Fire+Nature): apply Burn equal to damage dealt
      if (!combat.over && hasPassive('duo_wildfire_seeds') && targetSide === 'enemy') {
        const _bEnemyNow = combat.enemies[combat.activeEnemyIdx];
        if (_bEnemyNow && _bEnemyNow.alive) {
          const actualDmg = Math.max(0, _hpBefore - _bEnemyNow.hp);
          if (actualDmg > 0) {
            _bEnemyNow.status.burnStacks = (_bEnemyNow.status.burnStacks || 0) + actualDmg;
            log(`🔥🌱 Wildfire Seeds: +${actualDmg} Burn from bloom!`, 'status');
          }
        }
      }
      break;
    }
    case 'root': {
      const perStack = Math.floor((3 + Math.floor(_incantationBonus(il, 1, 1.00))) * patientMult);
      const totalRoot = Math.floor(perStack * seed.stacks * powerMult);
      applyRoot('player', 'enemy', totalRoot);
      log(`${label} — ${totalRoot} Root!`, 'player');
      break;
    }
    case 'silence': {
      // Silences N random player spells, prioritizing the active book
      const baseCount = 4 + Math.floor(_incantationBonus(il, 1, 1.00));
      const count = Math.max(1, Math.floor(baseCount * powerMult));
      const books = player.spellbooks || [];
      const activeIdx = player.activeBookIdx || 0;
      const activeSpells = (books[activeIdx] || {}).spells || [];
      const otherSpells = [];
      books.forEach((b, i) => { if (i !== activeIdx) (b.spells || []).forEach(sp => otherSpells.push(sp)); });
      const shuffActive = [...activeSpells].sort(() => Math.random() - 0.5);
      const shuffOther  = [...otherSpells].sort(() => Math.random() - 0.5);
      const targets = [];
      while (targets.length < count && shuffActive.length > 0) targets.push(shuffActive.shift());
      while (targets.length < count && shuffOther.length  > 0) targets.push(shuffOther.shift());
      targets.forEach(sp => { sp.currentCD = Math.max(sp.currentCD || 0, 2); });
      const names = targets.map(sp => sp.name || sp.id).join(', ');
      log(`🤫 ${label} — ${count} spell${count !== 1 ? 's' : ''} silenced: ${names || 'none'}!`, 'player');
      // Patient Bloom: spill 2 extra silences into inactive books
      if (patientMult > 1 && shuffOther.length > 0) {
        const extra = shuffOther.slice(0, 2);
        extra.forEach(sp => { sp.currentCD = Math.max(sp.currentCD || 0, 2); });
        log(`🌾🤫 Patient Bloom spill: ${extra.map(sp => sp.name || sp.id).join(', ')} also silenced!`, 'status');
      }
      break;
    }
    case 'armor': {
      const perStack = Math.floor((30 + _incantationBonus(il, 8, 0.95)) * patientMult);
      const totalArmor = Math.floor(perStack * seed.stacks * powerMult);
      gainBlock('player', totalArmor);
      log(`${label} — +${totalArmor} Armor!`, 'player');
      break;
    }
  }

  if (combat.over) {
    if (targetSide === 'enemy') setActiveEnemy(prevActive);
    return;
  }

  // ── Thorn Bloom: +2 Root if target is Rooted ──
  if (targetSide === 'enemy' && hasPassive('nature_thorn_bloom')) {
    const e = combat.enemies[combat.activeEnemyIdx];
    if (e && e.alive && (e.status.rootStacks || 0) > 0) {
      applyRoot('player', 'enemy', 2);
      log('🌹 Thorn Bloom: +2 Root on bloom!', 'status');
    }
  }

  // ── Rooted Bloom: Root = stacks that bloomed ──
  if (targetSide === 'enemy' && hasPassive('nature_rooted_bloom')) {
    const e = combat.enemies[combat.activeEnemyIdx];
    if (e && e.alive) {
      applyRoot('player', 'enemy', seed.stacks);
      log(`🌺 Rooted Bloom: +${seed.stacks} Root from bloom!`, 'status');
    }
  }

  if (combat.over) {
    if (targetSide === 'enemy') setActiveEnemy(prevActive);
    return;
  }

  // ── Perennial: replant with 1 stack at timer 3 ──
  if (hasPassive('nature_perennial')) {
    _plantSeed(targetSide, seed.type, 1, 3, { incantLevel: il });
    log(`🌸 Perennial: ${_seedLabel(seed.type)} Seed replanted (timer 3).`, 'status');
  }

  if (targetSide === 'enemy') setActiveEnemy(prevActive);
}

// ─── VERDANT PATIENCE ────────────────────────────────────────────────────────
// Called at round start before tick. If any Seed timer ≤ 2 (3+ turns active),
// gain 15 armor and reduce all Seed timers by 1.
function _checkVerdantPatience() {
  if (!hasPassive('nature_verdant_patience')) return;

  let anyOld = false;
  combat.enemies.forEach(e => {
    if (!e.alive || !e.status.seeds) return;
    e.status.seeds.forEach(s => { if (s.timer <= 3) anyOld = true; });
  });
  if (status.player.seeds)
    status.player.seeds.forEach(s => { if (s.timer <= 3) anyOld = true; });

  if (!anyOld) return;

  gainBlock('player', 15);
  log('🌿 Verdant Patience! +15 Armor, all Seed timers −1.', 'status');

  // Reduce timers (min 1 — the tick will bring 1→0 for blooms this round)
  combat.enemies.forEach(e => {
    if (!e.alive || !e.status.seeds) return;
    e.status.seeds.forEach(s => { s.timer = Math.max(1, s.timer - 1); });
  });
  if (status.player.seeds)
    status.player.seeds.forEach(s => { s.timer = Math.max(1, s.timer - 1); });
}

// ─── TICK ────────────────────────────────────────────────────────────────────
// Called each round after _checkVerdantPatience. Decrements timers and blooms.
function _tickSeeds() {
  // Enemy seeds
  combat.enemies.forEach((e, i) => {
    if (!e.alive || !e.status.seeds || !e.status.seeds.length) return;
    e.status.seeds.forEach(s => { s.timer--; });
    const toBloom = e.status.seeds.filter(s => s.timer <= 0);
    e.status.seeds   = e.status.seeds.filter(s => s.timer > 0);
    toBloom.forEach(seed => { if (!combat.over) _bloomSeed('enemy', seed, i); });
  });

  // Player seeds
  if (status.player.seeds && status.player.seeds.length) {
    status.player.seeds.forEach(s => { s.timer--; });
    const toBloom = status.player.seeds.filter(s => s.timer <= 0);
    status.player.seeds = status.player.seeds.filter(s => s.timer > 0);
    toBloom.forEach(seed => { if (!combat.over) _bloomSeed('player', seed); });
  }

  // Decay enemy silence counter
  combat.enemies.forEach(e => {
    if ((e._silenced || 0) > 0) e._silenced--;
  });
}

// ─── ACCELERATE ──────────────────────────────────────────────────────────────
// Reduce ALL active Seed timers by `amount`. If any reach 0, bloom immediately.
function _accelerateSeeds(amount) {
  amount = amount || 1;
  const prevActive = combat.activeEnemyIdx;

  combat.enemies.forEach((e, i) => {
    if (!e.alive || !e.status.seeds || !e.status.seeds.length) return;
    e.status.seeds.forEach(s => { s.timer = Math.max(0, s.timer - amount); });
    const toBloom = e.status.seeds.filter(s => s.timer <= 0);
    e.status.seeds   = e.status.seeds.filter(s => s.timer > 0);
    toBloom.forEach(seed => { if (!combat.over) _bloomSeed('enemy', seed, i); });
  });

  if (status.player.seeds && status.player.seeds.length) {
    status.player.seeds.forEach(s => { s.timer = Math.max(0, s.timer - amount); });
    const toBloom = status.player.seeds.filter(s => s.timer <= 0);
    status.player.seeds = status.player.seeds.filter(s => s.timer > 0);
    toBloom.forEach(seed => { if (!combat.over) _bloomSeed('player', seed); });
  }

  setActiveEnemy(prevActive);
}

// ─── DEEP ROOTS ──────────────────────────────────────────────────────────────
// Called from applyRoot when attacker is player and target is enemy.
// Every 3rd Root applied to a target reduces its Seed timers by 1.
function _deepRootsCheck() {
  if (!hasPassive('nature_deep_roots')) return;
  const e = combat.enemies[combat.activeEnemyIdx];
  if (!e || !e.alive) return;
  e._deepRootsCounter = (e._deepRootsCounter || 0) + 1;
  if (e._deepRootsCounter % 3 === 0 && e.status.seeds && e.status.seeds.length) {
    e.status.seeds.forEach(s => { s.timer = Math.max(1, s.timer - 1); });
    log('🌿 Deep Roots: Seed timers −1!', 'status');
  }
}

// ─── ROOTED BLOOM DECAY ──────────────────────────────────────────────────────
// Called when Root decays on a target. Reduces the nearest Seed timer by 1.
function _rootedBloomDecay(targetSide) {
  if (!hasPassive('nature_rooted_bloom')) return;
  const seeds = targetSide === 'player'
    ? status.player.seeds
    : (combat.enemies[combat.activeEnemyIdx] || {}).status &&
      combat.enemies[combat.activeEnemyIdx].status.seeds;
  if (!seeds || !seeds.length) return;
  // "nearest" = lowest timer (closest to blooming)
  const nearest = seeds.reduce((min, s) => s.timer < min.timer ? s : min, seeds[0]);
  if (nearest) {
    nearest.timer = Math.max(1, nearest.timer - 1);
    log(`🌺 Rooted Bloom: Root decay shortens nearest Seed timer (${nearest.timer} left)!`, 'status');
  }
}

// ─── SEED STATUS SUMMARY ─────────────────────────────────────────────────────
// Returns a display string for seed state on a target (for UI/logs).
function _seedStatusSummary(seeds) {
  if (!seeds || !seeds.length) return '';
  const groups = {};
  seeds.forEach(s => {
    const k = s.type;
    if (!groups[k]) groups[k] = { stacks: 0, minTimer: s.timer };
    groups[k].stacks += s.stacks;
    groups[k].minTimer = Math.min(groups[k].minTimer, s.timer);
  });
  return Object.entries(groups)
    .map(([t, g]) => `${_seedLabel(t)}×${g.stacks}(${g.minTimer}t)`)
    .join(' ');
}
