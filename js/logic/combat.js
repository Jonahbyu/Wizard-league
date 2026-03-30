// ===== combat.js =====
// ─── COMBAT LOOP ──────────────────────────────────────────────────────────────
// startRound, queue system, endBattle, summon attacks.
// Calls into hit.js for damage resolution.

// ===============================
// QUEUE-BASED SIMULTANEOUS SYSTEM
// ===============================
// Player queues up to N actions, then presses End Turn.
// Enemy simultaneously queues its actions.
// Both sides resolve action-by-action with a short delay between each pair.

// Tick player CDs once per round (called at end of round, not start).
function _tickPlayerCDs(){
  if(combat.basicCD>0) combat.basicCD--;
  // Tick all books' spells so CDs advance regardless of which book is active
  (player.spellbooks||[]).forEach(book => {
    book.spells.forEach(s=>{ if(s.currentCD>0) s.currentCD--; });
  });
}

// Apply catalogue book effects after a spell action resolves
function _applyBookSpellEffect(action) {
  if (!action || !action.isSpellAction || !action.bookCatalogueId) return;
  if (typeof SPELLBOOK_CATALOGUE === 'undefined') return;
  const cat = SPELLBOOK_CATALOGUE[action.bookCatalogueId];
  if (!cat) return;
  const book = (player.spellbooks||[]).find(b => b.catalogueId === action.bookCatalogueId);
  const lvl = book ? (book.upgradeLevel || 0) : 0;
  const spell = action.spellObj;

  if (combat.over) return;

  // onSpellExecute hook
  if (cat.onSpellExecute && spell) {
    try { cat.onSpellExecute(spell, lvl); } catch(e) { console.warn('Book onSpellExecute error:', e); }
  }

  if (combat.over) return;

  // Echo Grimoire: first non-builtin spell each turn gets bonus damage
  const aura = cat.aura ? cat.aura(lvl) : {};
  if (aura.echoBonus && combat._echoReady && spell && !spell.isBuiltin) {
    combat._echoReady = false;
    const echoDmg = Math.round((player.attackPower || 0) * aura.echoBonus);
    if (echoDmg > 0 && !combat.over) {
      const anyEnemy = aliveEnemies ? aliveEnemies()[0] : null;
      if (anyEnemy) {
        setActiveEnemy(combat.enemies.indexOf(anyEnemy));
        applyDirectDamage('player', 'enemy', echoDmg, '🌀 Echo');
        log(`🌀 Echo Grimoire: +${echoDmg} echo damage!`, 'player');
      }
    }
  }
}

function startRound(){
  if(combat.over) return;

  // Reset per-turn flags
  combat.meltDoubleTurn         = false;
  combat._seedSurgePending      = false; // Seed Surge expires if unused
  combat._surgeTriggeredThisTurn  = false;
  combat._residualCurrentPending  = false;
  combat._residualCurrentValue    = 0;

  // ── Apply pending 1-turn power bonuses (Overcharge/Feedback) ──
  // Clear last round's bonus first, then promote pending to this-turn bonus.
  status.player.nextTurnPowerBonus = 0;
  if(status.player.overchargePowerPending > 0){
    status.player.nextTurnPowerBonus = status.player.overchargePowerPending;
    log(`⚡ +${status.player.overchargePowerPending} Power this turn (Overcharge/Feedback)`, 'status');
    status.player.overchargePowerPending = 0;
    // Note: player.power is NOT mutated — this bonus expires at next round start
  }

  // ── Charge Shot auto-fire ──
  if(status.player.chargeShotCharging){
    status.player.chargeShotCharging = false;
    const csDmg = 50 + attackPowerFor('player','enemy');
    aliveEnemies().forEach(e=>{
      setActiveEnemy(combat.enemies.indexOf(e));
      applyDirectDamage('player','enemy', csDmg, '🎯⚡ Charge Shot');
    });
    log(`🎯⚡ Charge Shot FIRES! ${csDmg} dmg to all`, 'player');
    if(combat.over) return;
  }

  // ── Seed System: Verdant Patience check, then tick ──
  if(typeof _checkVerdantPatience === 'function') _checkVerdantPatience();
  if(!combat.over && typeof _tickSeeds === 'function') _tickSeeds();
  if(combat.over) return;

  // ── Surge System: Static Build + Conductivity tick ──
  if(typeof _tickSurgeBuilds === 'function') _tickSurgeBuilds();
  if(combat.over) return;

  // ── Duo passive ticks (Scorched Earth etc.) ──
  if(typeof _tickDuoEffects === 'function') _tickDuoEffects();
  if(combat.over) return;

  // ── Per-enemy round ticks ──
  combat.enemies.forEach((e,i)=>{
    if(!e.alive) return;
    setActiveEnemy(i);
    if(e.basicCD>0) e.basicCD--;

    // Tick ability cooldowns
    if(e.abilities) e.abilities.forEach(a=>{ if(a.cd>0) a.cd--; });
    // Tick static field
    if(e._staticFieldTurns > 0){
      e._staticFieldTurns--;
      if(e._staticFieldTurns <= 0 && e._staticPowerBonus){
        e.statPow = Math.max(0, (e.statPow||0) - e._staticPowerBonus);
        e._staticPowerBonus = 0;
        log(`🌩️ ${e.name}'s Static Field fades.`, 'status');
      }
    }

    // Shock: decay 25% each round
    e.status.shockStacks = Math.floor((e.status.shockStacks||0) * 0.75);

    // Foam expires
    if(e.status.foamStacks>0) e.status.foamStacks--;

    // Root decay
    if(e.status.rootStacks>0){
      e.status.rootStacks--;
      if(typeof _rootedBloomDecay === 'function') _rootedBloomDecay('enemy');
    }

    // Stone stance reset + decay (25%, skip if Living Mountain enemy)
    e.status.stoneStanceThisTurn = false;
    if(e.status.stoneStacks>0){
      const decay = Math.max(1, Math.floor(e.status.stoneStacks*0.25));
      e.status.stoneStacks = Math.max(0, e.status.stoneStacks - decay);
    }

    // Wildfire: 33% chance to double enemy burn
    if(hasPassive('fire_wildfire') && e.status.burnStacks>0 && Math.random()<0.33){
      e.status.burnStacks *= 2;
      log(`🌪️ Wildfire! ${e.name} burn ×2 (×${e.status.burnStacks})`, 'status');
    }

    // Burn tick (1 or 1.5 per stack; Grease Fire doubles once)
    if(e.status.burnStacks>0){
      const grease = status.player.greasefirePending;
      const mult = grease ? 2 : 1;
      if(grease){ status.player.greasefirePending = false; log('🛢️ Grease Fire: burn tick doubled!','status'); }
      const bdmg = Math.ceil(e.status.burnStacks * burnDmgPerStack('player', effectPowerFor('player','enemy')) * mult);
      if(bdmg>0) applyEffectDamage('player','enemy', bdmg, '🔥 Burn');
      if(combat.over) return;
    }

    // Frost tick (1 or 3 per stack; skip while frozen)
    if(e.status.frostStacks>0 && !e.status.frozen){
      const frostPer = hasPassive('ice_permafrost_core') ? 3 : 1;
      const fdmg = Math.floor(e.status.frostStacks) * frostPer;
      if(fdmg>0) applyEffectDamage('player','enemy', fdmg, `❄️ Frost (×${e.status.frostStacks.toFixed(1)})`);
      if(combat.over) return;
    }
    // Frost decay: 1 stack per round regardless of frozen state
    if(e.status.frostStacks>0){
      e.status.frostStacks = Math.max(0, e.status.frostStacks - 1);
      if(e.status.frozen && e.status.frostStacks <= 0){
        e.status.frozen = false;
        log(`🧊 ${e.name} thaws out.`, 'status');
      }
    }

    // Frozen Ground: apply 2 Frost to all enemies for N rounds
    if(status.player.frozenGroundTurns > 0){
      applyFrost('player','enemy', 2);
    }
  });
  if(combat.over) return;

  // Frozen Ground countdown
  if(status.player.frozenGroundTurns > 0){
    status.player.frozenGroundTurns--;
    if(status.player.frozenGroundTurns===0) log('❄️ Frozen Ground fades.', 'status');
  }

  // Spreading Vines: 1 root to all enemies + 1 armor for N rounds
  if(status.player.spreadingVinesTurns > 0){
    aliveEnemies().forEach(e=>{
      setActiveEnemy(combat.enemies.indexOf(e));
      applyRoot('player','enemy', 1);
    });
    gainBlock('player', 1);
    status.player.spreadingVinesTurns--;
    if(status.player.spreadingVinesTurns===0) log('🌿 Spreading Vines fades.', 'status');
  }

  // ── Player per-round ticks ──
  // Shock: decay 25% each round
  status.player.shockStacks = Math.floor((status.player.shockStacks||0) * 0.75);
  if(status.player.foamStacks>0) status.player.foamStacks--;
  if(status.player.rootStacks>0){
    status.player.rootStacks--;
    if(typeof _rootedBloomDecay === 'function') _rootedBloomDecay('player');
  }
  status.player.stoneStanceThisTurn = false;
  if(status.player.stoneStacks>0 && !hasPassive('earth_living_mountain')){
    const decay = Math.max(1, Math.floor(status.player.stoneStacks*0.25));
    status.player.stoneStacks = Math.max(0, status.player.stoneStacks - decay);
  }
  if(status.player.debuffImmune>0) status.player.debuffImmune--;
  if(status.player.rageBoostTurns>0){
    status.player.rageBoostTurns--;
    if(status.player.rageBoostTurns===0) status.player.rageBoostPow=0;
  }

  // Fortify: convert pending armor into Stone stacks (1 stack per 5 armor)
  if(status.player.fortifyPending>0){
    const armorLeft = Math.min(status.player.fortifyPending, status.player.block||0);
    const stacks = Math.max(1, Math.floor(armorLeft/5));
    status.player.block = Math.max(0, (status.player.block||0) - armorLeft);
    status.player.fortifyPending = 0;
    addStoneStacks('player', stacks);
    log(`🏰 Fortify breaks — ${armorLeft} Armor → ${stacks} Stone stacks`, 'status');
  }

  // Player burn tick
  if(status.player.burnStacks>0){
    const anyEnemy = combat.enemies.find(e=>e.alive);
    if(anyEnemy) setActiveEnemy(combat.enemies.indexOf(anyEnemy));
    const bdmg = Math.ceil(status.player.burnStacks * burnDmgPerStack('enemy', status.player.burnSourcePower||0));
    if(bdmg>0){ applyEffectDamage('enemy','player', bdmg, '🔥 Burn'); if(combat.over) return; }
  }

  // Player frost tick
  if(status.player.frostStacks>0 && !status.player.frozen){
    const frostPer = enemyHasPassive('ice_permafrost_core') ? 3 : 1;
    const fdmg = Math.floor(status.player.frostStacks) * frostPer;
    if(fdmg>0){ applyEffectDamage('enemy','player', fdmg, `❄️ Frost (×${status.player.frostStacks.toFixed(1)})`); if(combat.over) return; }
  }
  // Frost decay: 1 stack per round regardless of frozen state
  if(status.player.frostStacks>0){
    status.player.frostStacks = Math.max(0, status.player.frostStacks - 1);
    if(status.player.frozen && status.player.frostStacks <= 0){
      status.player.frozen = false;
      log(`🧊 You thaw out.`, 'status');
    }
  }

  // Restore target reference
  if(!combat.enemies[combat.targetIdx]||!combat.enemies[combat.targetIdx].alive)
    combat.targetIdx=firstAliveIdx();
  setActiveEnemy(combat.targetIdx);

  // ── Zone passive tick ──
  applyZoneTick();
  if(combat.over) return;

  // Summon auto-attacks
  resolveSummonAttacks();
  if(combat.over) return;

  // Player stunned: skip planning, all enemies act
  if(status.player.stunned>0){
    status.player.stunned--;
    log(`${playerEmoji} You are stunned — skip your turn!`,'status');
    renderStatusTags();
    setPlayerTurnUI(false);
    _tickPlayerCDs(); // stun = lost turn, still tick CDs
    let delay=400;
    combat.enemies.forEach((e,i)=>{
      if(!e.alive) return;
      setTimeout(()=>{ if(combat.over) return; setActiveEnemy(i); executeOneEnemyAction(i); }, delay);
      delay+=300;
    });
    setTimeout(startRound, delay+200);
    return;
  }

  // ── Air: Wind Wall delayed damage fires at round start ──
  if(playerElement==='Air' && (status.player.windWallPending||0) > 0 && !combat.over){
    const wpDmg = status.player.windWallPending;
    status.player.windWallPending = 0;
    const anyEnemy = combat.enemies.find(e=>e.alive);
    if(anyEnemy) setActiveEnemy(combat.enemies.indexOf(anyEnemy));
    applyEffectDamage('enemy','player', wpDmg, '🌬️ Wind Wall — delayed damage arrives');
    if(combat.over) return;
    setActiveEnemy(combat.targetIdx);
  }

  combat.turnInBattle++;
  combat.actionQueue=[];
  combat.actionsLeft=actionsPerTurnFor('player') + artifactExtraActions();
  // ── Air: Slipstream talent — bonus action every N turns ──
  if(playerElement==='Air' && player._slipstreamInterval && combat.turnInBattle % player._slipstreamInterval === 0){
    combat.actionsLeft++;
    log(`💨 Slipstream: +1 bonus action! (turn ${combat.turnInBattle})`, 'status');
  }
  // ── Air: Sleeper Gust bonus actions ──
  if(playerElement==='Air' && (status.player.nextTurnBonusActions||0) > 0){
    const bonus = status.player.nextTurnBonusActions;
    combat.actionsLeft += bonus;
    log(`💨 +${bonus} bonus action${bonus>1?'s':''} from Sleeper Gust!`, 'status');
    status.player.nextTurnBonusActions = 0;
  }
  if((status.player.nextTurnActionPenalty||0) > 0){
    const penalty = status.player.nextTurnActionPenalty;
    combat.actionsLeft = Math.max(0, combat.actionsLeft - penalty);
    log(`🧊 Freeze! −${penalty} action${penalty>1?'s':''} this turn.`, 'status');
    status.player.nextTurnActionPenalty = 0;
  }
  combat.plasmaChargeReserved = 0; // reset reserved charge each new round

  // ── Plasma: round-start charge management ──
  if(playerElement === 'Plasma'){
    // Stall regain
    if(status.player.stallActive){
      status.player.stallActive = false;
      const regain = status.player.stallCharge || 0;
      status.player.stallCharge = 0;
      status.player.plasmaCharge = (status.player.plasmaCharge||0) + regain;
      log(`🫧 Stall ends — regained ${regain} Charge (${status.player.plasmaCharge} total)`, 'status');
    }
    // Borrowed Power penalty
    if(status.player.borrowedCharge > 0){
      const penalty = status.player.borrowedCharge * 50;
      status.player.borrowedCharge = 0;
      applyEffectDamage('enemy','player', penalty, '⏳ Borrowed Power debt');
      if(combat.over) return;
    }
    // Stabilized Core: +3 charge per turn start — only if Plasma book is active
    if(hasPassive('plasma_stabilized_core')){
      const _pIdx = plasmaBookIdx();
      if(_pIdx >= 0 && player.activeBookIdx === _pIdx){
        status.player.plasmaCharge = (status.player.plasmaCharge||0) + 3;
        log(`🔋 Stabilized Core: +3 Charge → ${status.player.plasmaCharge}`, 'status');
      }
    }
    // Overcharge check: >= 20 at turn start
    combat.plasmaOvercharged = (status.player.plasmaCharge||0) >= 20;
    if(combat.plasmaOvercharged) log('✦ OVERCHARGE! Plasma abilities 1.5× this turn.', 'status');
    // (Plasma Shield reduction persists the whole battle — only reset in loadBattle)
    // Energy Feedback: power bonus from current charge
    if(hasPassive('plasma_energy_feedback')){
      // This is applied dynamically in attackPowerFor — just log it
      log(`⚡ Energy Feedback: +${status.player.plasmaCharge} Power from Charge`, 'status');
    }
    updateChargeUI();
  }
  // ── Book onTurnStart hook (e.g. Verdant Codex regen) ──
  const _abTurn = activeBook();
  if (_abTurn && _abTurn.catalogueId && typeof SPELLBOOK_CATALOGUE !== 'undefined') {
    const _abCat = SPELLBOOK_CATALOGUE[_abTurn.catalogueId];
    if (_abCat && _abCat.onTurnStart) {
      try { _abCat.onTurnStart(_abTurn.upgradeLevel || 0); } catch(e) {}
      if (combat.over) return;
    }
  }
  combat._echoReady = true;  // reset echo for this turn

  // Pre-build enemy queues now so intents are visible during player planning
  combat.prebuiltEnemyQueues = combat.enemies.map((e, i) => {
    if (!e.alive) return [];
    let actions = actionsPerTurnFor('enemy');
    const penalty = e.status.nextTurnActionPenalty || 0;
    if (penalty > 0) {
      actions = Math.max(0, actions - penalty);
      e.status.nextTurnActionPenalty = 0;
      log(`🧊 ${e.name} frozen! −${penalty} action${penalty>1?'s':''} this turn.`, 'status');
    }
    return buildEnemyQueueFor(i, actions);
  });
  renderEnemyCards();
  renderQueue();
  updateActionUI();
  setPlayerTurnUI(true);
}

// ===============================
// QUEUE-BASED SIMULTANEOUS SYSTEM
// ===============================
function queueAction(label, fn, opts){
  if(!combat.playerTurn||combat.over) return;
  const isFree = opts && opts.isFree;
  if(!isFree){
    const nonFreeCount = (combat.actionQueue||[]).filter(a=>!a.isFree).length;
    if(nonFreeCount >= combat.actionsLeft) return;
  }
  // Immediate effect at queue time (e.g. Storm Rush +3 actions)
  if(opts && opts.onQueue) opts.onQueue();
  const snapTarget = combat.targetIdx;
  combat.actionQueue.push({label, fn, targetIdx:snapTarget, isPlasma:false, isFree:!!isFree,
    stormRushAction:    !!(opts && opts.stormRushAction),
    stormRushDependent: !!(opts && opts.stormRushDependent),
    undoOnQueue:        (opts && opts.undoOnQueue) || null,
    isSpellAction:      !!(opts && opts.isSpellAction),
    bookCatalogueId:    (opts && opts.bookCatalogueId) || null,
    spellObj:           (opts && opts.spellObj) || null,
    hintFn:             (opts && opts.hintFn) || null,
  });
  renderQueue();
  updateActionUI();
  renderSpellButtons();
}

// Plasma abilities: bypass action cap, only gate by charge reserved
function queuePlasmaAction(label, fn, chargeToReserve, spellId){
  if(!combat.playerTurn||combat.over) return;
  const avail = (status.player.plasmaCharge||0) - (combat.plasmaChargeReserved||0);
  if(chargeToReserve > 0 && avail < chargeToReserve) return;
  const snapTarget = combat.targetIdx;
  combat.plasmaChargeReserved = (combat.plasmaChargeReserved||0) + (chargeToReserve||0);
  combat.actionQueue.push({label, fn, targetIdx:snapTarget, isPlasma:true, chargeReserved: chargeToReserve||0, spellId: spellId||null});
  renderQueue();
  updateActionUI();
  renderSpellButtons();
}

function removeFromQueue(idx){
  if(!combat.playerTurn||combat.over) return;
  const a = combat.actionQueue[idx];
  if(a && a.undoCD) a.undoCD();
  if(a && a.undoOnQueue) a.undoOnQueue();
  // Refund reserved Plasma charge
  if(a && a.isPlasma && a.chargeReserved > 0){
    combat.plasmaChargeReserved = Math.max(0, (combat.plasmaChargeReserved||0) - a.chargeReserved);
    updateChargeUI();
  }
  combat.actionQueue.splice(idx,1);
  // Storm Rush removed — cascade-remove any spells that were only queueable due to its CD preview
  if(a && a.stormRushAction){
    for(let i = combat.actionQueue.length-1; i >= 0; i--){
      if(combat.actionQueue[i].stormRushDependent) combat.actionQueue.splice(i,1);
    }
  }
  renderQueue();
  updateActionUI();
  renderSpellButtons();
}

function renderQueue(){
  const slots=document.getElementById("queue-slots");
  const endBtn=document.getElementById("end-turn-btn");
  if(!slots) return;
  slots.innerHTML="";
  if(!combat.actionQueue||combat.actionQueue.length===0){
    slots.innerHTML='<span class="queue-empty">No actions queued — select actions below</span>';
  } else {
    combat.actionQueue.forEach((a,i)=>{
      const s=document.createElement("div"); s.className="queue-slot";
      const tname = combat.enemies[a.targetIdx]?` → ${combat.enemies[a.targetIdx].name}`:'';
      const dmgHint = a.hintFn ? a.hintFn() : '';
      s.innerHTML=`${a.label}${tname}${dmgHint?`<div style="font-size:.48rem;color:#8aaa88;opacity:.85;margin-top:1px;">${dmgHint}</div>`:''} <span class="qs-x">✕</span>`;
      s.onclick=()=>removeFromQueue(i);
      slots.appendChild(s);
    });
  }
  if(typeof renderEnemyCards === 'function') renderEnemyCards();
  if(endBtn){
    const hasActions=combat.actionQueue&&combat.actionQueue.length>0;
    endBtn.disabled=!combat.playerTurn||combat.over||!hasActions;
    endBtn.className=hasActions?'end-turn-btn ready':'end-turn-btn';
    const totalQ = combat.actionQueue.length;
    endBtn.textContent=hasActions
      ?`⚔ End Turn — Resolve ${totalQ} Action${totalQ>1?'s':''}`
      :'⚔ End Turn';
  }
}

function updateActionUI(){
  const el=document.getElementById("turn-indicator");
  const slotsTxt=document.getElementById("queue-slots-left");
  if(!el) return;
  if(combat.playerTurn){
    const queued=(combat.actionQueue||[]).filter(a=>!a.isFree && !a.isPlasma).length;
    const total=combat.actionsLeft||0;
    const alive=aliveEnemies();
    const tgt=combat.enemies[combat.targetIdx];
    el.textContent=`Planning — Target: ${tgt?tgt.name:'?'} (${alive.length} alive)`;
    if(slotsTxt) slotsTxt.textContent=`(${queued}/${total} queued)`;
  } else {
    el.textContent=`Resolving...`;
    if(slotsTxt) slotsTxt.textContent='';
  }
}

// Player hits End Turn — build all enemy queues then resolve
function queueSwitchBook(bookIdx) {
  if (!combat.playerTurn || combat.over) return;
  const book = player.spellbooks[bookIdx];
  if (!book || bookIdx === player.activeBookIdx) return;

  // Check freeSwitch on target book
  const targetCat = (book.catalogueId && typeof SPELLBOOK_CATALOGUE !== 'undefined')
    ? SPELLBOOK_CATALOGUE[book.catalogueId] : null;
  const isFreeSwitch = !!(targetCat && targetCat.freeSwitch);

  // Check stickySwitch on current book (costs extra action to leave)
  const curBook = activeBook();
  const curCat = (curBook && curBook.catalogueId && typeof SPELLBOOK_CATALOGUE !== 'undefined')
    ? SPELLBOOK_CATALOGUE[curBook.catalogueId] : null;
  const isSticky = !!(curCat && curCat.stickySwitch);

  const nonFreeCount = (combat.actionQueue||[]).filter(a=>!a.isFree).length;
  if (!isFreeSwitch) {
    const needed = isSticky ? 2 : 1;
    if (nonFreeCount + needed > (combat.actionsLeft||0)) return;
  }

  const prevIdx = player.activeBookIdx;

  // Immediately switch the display so the player can see the target book's spells
  switchBook(bookIdx);
  renderSpellButtons();
  updateActionUI();

  queueAction('📖 ' + book.name, () => {
    if (player.activeBookIdx !== bookIdx) switchBook(bookIdx);
    renderSpellButtons();
    updateActionUI();
  }, {
    isFree: isFreeSwitch,
    undoOnQueue: () => {
      switchBook(prevIdx);
      renderSpellButtons();
      updateActionUI();
    }
  });

  // Sticky: consume an extra action slot when leaving the Tome of Time
  if (isSticky && !isFreeSwitch) {
    queueAction('⏳ Time Toll', () => {
      log('⏳ Tome of Time: extra action spent leaving the book.', 'status');
    }, {});
  }
}

function commitEndTurn(){
  if(!combat.playerTurn||combat.over) return;
  if(!combat.actionQueue||combat.actionQueue.length===0) return;
  setPlayerTurnUI(false);

  // Split player queue: non-Plasma first, Plasma last
  const allPlayerActions = [...combat.actionQueue];
  combat.actionQueue = [];
  renderQueue();

  const normalPlayerActions = allPlayerActions.filter(a => !a.isPlasma);
  const plasmaPlayerActions = allPlayerActions.filter(a => a.isPlasma);

  // Use pre-built enemy queues (built at round start so intents were visible during planning)
  const allEnemyQueues = combat.prebuiltEnemyQueues ||
    combat.enemies.map((e,i) => e.alive ? buildEnemyQueueFor(i, actionsPerTurnFor('enemy')) : []);
  combat.prebuiltEnemyQueues = null;

  // Show enemy intents before resolution
  renderEnemyCards();

  // Priority sort among non-Plasma participants
  const participants = [];
  if(normalPlayerActions.length > 0)
    participants.push({ id:'player', queue:normalPlayerActions, hp:player.hp, power:player.attackPower });
  combat.enemies.forEach((e,i) => {
    if(!e.alive) return;
    participants.push({ id:'enemy_'+i, idx:i, queue:allEnemyQueues[i]||[], hp:e.hp, power:e.statPow||0 });
  });

  participants.sort((a,b) => {
    if(b.queue.length !== a.queue.length) return b.queue.length - a.queue.length;
    // Equal queue length: player always goes first
    if(a.id==='player') return -1;
    if(b.id==='player') return 1;
    return 0;
  });

  // Log initiative order
  const names = participants.map(p => {
    const name = p.id==='player' ? playerName : combat.enemies[p.idx].name;
    return (p.id==='player'?'🟢':'🔴') + name + '(' + p.queue.length + ')';
  });
  if(plasmaPlayerActions.length > 0) names.push('🔮Plasma('+plasmaPlayerActions.length+')');
  log('Initiative: ' + names.join(' → '), 'system');

  // Weave non-Plasma into flat interleaved list
  const flatActions = [];
  const maxLen = Math.max(...participants.map(p=>p.queue.length), 0);
  for(let slot=0; slot<maxLen; slot++){
    participants.forEach(p => {
      if(slot < p.queue.length) flatActions.push({p, action:p.queue[slot]});
    });
  }

  // Plasma actions go at the very end
  plasmaPlayerActions.forEach(a => {
    flatActions.push({p:{id:'player'}, action:a, isPlasmaFinal:true});
  });

  combat._gen = (combat._gen||0) + 1;
  resolveFlat(flatActions, 0, combat._gen);
}

function resolveFlat(flatActions, idx, chainGen){
  // Stale chain guard: abort if a newer chain has started (e.g. post-revive)
  if(combat._gen !== chainGen) return;
  if(idx >= flatActions.length){
    // All actions done — now check deferred death
    if(player.hp <= 0 && !combat.over){
      endBattle(false);
      return;
    }
    if(combat.over) return;
    _tickPlayerCDs(); // round fully resolved — tick CDs now
    if(!combat.enemies[combat.targetIdx]||!combat.enemies[combat.targetIdx].alive)
      combat.targetIdx=firstAliveIdx();
    setActiveEnemy(combat.targetIdx);
    setTimeout(startRound, 650);
    return;
  }

  const {p, action, isPlasmaFinal} = flatActions[idx];
  const next = ()=>{ if(!combat.over) setTimeout(()=>resolveFlat(flatActions, idx+1, chainGen), 320); };

  if(p.id === 'player'){
    const snapTgt = action.targetIdx != null ? action.targetIdx : combat.targetIdx;
    combat.targetIdx = snapTgt;
    setActiveEnemy(snapTgt);
    action.fn();
    if(!combat.over && action.isSpellAction) _applyBookSpellEffect(action);
    updateHPBars(); renderStatusTags();
    if(!isPlasmaFinal && player.hp <= 0 && !combat.over){
      log('💀 You dropped to 0 HP — Plasma heals may save you!', 'status');
    }
    next();
  } else {
    const eIdx = p.idx;
    if(!combat.enemies[eIdx]||!combat.enemies[eIdx].alive){ next(); return; }
    setActiveEnemy(eIdx);
    // Remove the fired intent from the queue so remaining ones stay visible
    const enemy = combat.enemies[eIdx];
    if(enemy.intentQueue && enemy.intentQueue.length > 0) enemy.intentQueue.shift();
    if(enemy.status.stunned > 0){
      enemy.status.stunned--;
      log(enemy.emoji + ' ' + enemy.name + ' is stunned!', 'status');
      renderStatusTags();
    } else {
      action.fn();
      updateHPBars(); renderStatusTags();
    }
    renderEnemyCards();
    next();
  }
}

// Returns true if this intent should be hidden by the Hidden Intentions mist modifier
function _intentHidden(){
  const tier = getMistTier('hidden_intentions');
  if(!tier) return false;
  const chance = [0.25, 0.50, 0.75, 1.00][tier - 1];
  return Math.random() < chance;
}

function _liveAttackHint(idx, baseDmg, el){
  if(player._mistBlindDamage) return '';
  const e = combat.enemies[idx];
  if(!e || !e.alive) return '';
  const es = e.status || {};
  const ps = status.player || {};
  // Read AP with this enemy as active so attackPowerFor uses its status
  const prevIdx = combat.activeEnemyIdx;
  combat.activeEnemyIdx = idx;
  const ap = attackPowerFor('enemy', 'player');
  combat.activeEnemyIdx = prevIdx;
  let dmg = Math.max(0, Math.round(baseDmg + ap));
  // Zone bonus
  if(combat.activeZoneElement && dmg > 0 && primaryElement(e.element||'') === combat.activeZoneElement){
    dmg = Math.round(dmg * 1.20);
  }
  // Enemy shock reduces their outgoing damage
  const shockStacks = es.shockStacks || 0;
  if(shockStacks > 0 && dmg > 0){
    const reduction = Math.min(0.75, shockStacks * 0.03);
    dmg = Math.max(0, Math.round(dmg * (1 - reduction)));
  }
  // Player block absorbs
  const block = ps.block || 0;
  const afterBlock = Math.max(0, dmg - block);
  const procs = {
    Fire:'· +3 🔥 Burn', Ice:'· +2 ❄️ Frost', Water:'· +1 🫧 Foam',
    Earth:'· cracks Armor', Lightning:'· +⚡ Shock', Nature:'· +1 🌿 Root',
  };
  let hint = `~${afterBlock} dmg`;
  if(block > 0 && afterBlock !== dmg) hint += ` (${dmg}−${block} blk)`;
  if(shockStacks > 0) hint += ` [⚡×${shockStacks} reduces]`;
  if(procs[el]) hint += ' ' + procs[el];
  return hint.trim();
}

function buildEnemyQueueFor(idx, count){
  const e=combat.enemies[idx];
  const q=[];

  // Clear previous intent
  e.intentQueue = [];

  // Target dummy: never attacks, just stands still
  if(e.isTargetDummy){
    for(let j=0;j<count;j++){
      q.push({label:'Stand Still', intentIdx:j, fn:()=>{ log('🎯 '+e.name+' stands still.','enemy'); }});
      e.intentQueue.push({label:'Stand Still', hidden:false});
    }
    return q;
  }

  const cdPenalty=enemyCooldownPenaltyFor(idx);
  let cd=e.basicCD;
  for(let j=0;j<count;j++){
    if(cd<=0){
      const snapIdx=idx;

      // Try to use an item first (one-time consumable, fires on conditions)
      const item = pickEnemyItem(e);
      if(item){
        e.items = e.items.filter(it=>it.id!==item.id);
        const snapItem = item;
        const snapHint = snapItem.id==='enemy_healing_draught'?'Heals 20% max HP':'+15 Block';
        const intentEntry = {label:snapItem.emoji+' '+snapItem.name, hidden:false, hint:snapHint};
        e.intentQueue.push(intentEntry);
        q.push({label:snapItem.emoji+' '+snapItem.name, intentIdx:e.intentQueue.length-1, fn:()=>{
          if(combat.over||!combat.enemies[snapIdx].alive) return;
          snapItem.fn(snapIdx);
          updateHPBars(); renderStatusTags(); updateStatsUI();
        }});
        cd=cdPenalty;
        continue;
      }

      const isGymEnemy = !!combat.enemies[idx].isGym;
      if(isGymEnemy){
        const gymE = combat.enemies[idx];
        if(!gymE.gymPhase2 && gymE.hp <= gymE.enemyMaxHP * 0.5){
          gymE.gymPhase2 = true;
          gymE.enemyDmg = gymE.gymPhase2Dmg;
          const intentEntry = {label:'💢 Enrage', hidden:false};
          e.intentQueue.push(intentEntry);
          q.push({label:'💢 Enrage', intentIdx:e.intentQueue.length-1, fn:()=>{
            log('💢 ' + gymE.name + ' ENRAGES! Damage surges!', 'enemy');
            gymE.hp = Math.min(gymE.enemyMaxHP, (gymE.hp||0)+40);
            renderEnemyCards();
          }});
          cd=1+cdPenalty;
          continue;
        }
        gymE.gymHitCounter = (gymE.gymHitCounter||0) + 1;
        const isCharge = gymE.gymChargeInterval && (gymE.gymHitCounter % gymE.gymChargeInterval === 0);
        const chargeLabel = isCharge ? '⚡ Charge' : '⚔ Attack';
        const _gymEl = primaryElement(gymE.element||'');
        const _gymDmg = isCharge ? Math.round(gymE.enemyDmg * 2.5) : gymE.enemyDmg;
        const _snapGymDmg = _gymDmg; const _snapGymEl = _gymEl;
        const intentEntry = {label:chargeLabel, hidden:_intentHidden(), hintFn:()=>_liveAttackHint(snapIdx, _snapGymDmg, _snapGymEl)};
        e.intentQueue.push(intentEntry);
        q.push({label:chargeLabel, intentIdx:e.intentQueue.length-1, fn:()=>{
          setActiveEnemy(snapIdx);
          const gem = combat.enemies[snapIdx];
          const dmg = isCharge ? Math.round(gem.enemyDmg * 2.5) : gem.enemyDmg;
          if(isCharge) log('💥 ' + gem.name + ' winds up a CHARGE ATTACK!', 'enemy');
          const gemEl = primaryElement(gem.element||'');
          performHit('enemy','player',{baseDamage:dmg, effects:enemyElementalEffects(gemEl), isBasic:true, isEnemyAttack:true, abilityElement:gemEl});
          if(!combat.over) applyEnemyElementalProc(gemEl, snapIdx);
        }});
      } else {
        // Try to use an ability this action (blocked if silenced)
        const ability = (e._silenced > 0) ? null : pickEnemyAbility(e, currentGymIdx);
        if(ability){
          ability.cd = ability.baseCd;
          const snapAbility = ability;
          const abilLabel = snapAbility.emoji+' '+snapAbility.name;
          const intentEntry = {label:abilLabel, hidden:_intentHidden(), hint:ENEMY_ABILITY_HINTS[snapAbility.id]||''};
          e.intentQueue.push(intentEntry);
          q.push({label:abilLabel, intentIdx:e.intentQueue.length-1, fn:()=>{
            if(combat.over) return;
            if(!combat.enemies[snapIdx].alive) return;
            setActiveEnemy(snapIdx);
            snapAbility.fn(snapIdx);
            updateHPBars(); renderStatusTags(); updateStatsUI();
          }});
        } else {
          // Basic attack — 1-turn CD so it can't fire twice in one turn
          const _el2 = primaryElement(e.element||'');
          const _snapDmg2 = e.enemyDmg; const _snapEl2 = _el2;
          const intentEntry = {label:'⚔ Attack', hidden:_intentHidden(), hintFn:()=>_liveAttackHint(snapIdx, _snapDmg2, _snapEl2)};
          e.intentQueue.push(intentEntry);
          q.push({label:'⚔ Attack', intentIdx:e.intentQueue.length-1, fn:()=>{
            setActiveEnemy(snapIdx);
            const e2 = combat.enemies[snapIdx];
            const el = primaryElement(e2.element||'');
            performHit('enemy','player',{baseDamage:e2.enemyDmg, effects:enemyElementalEffects(el), isBasic:true, isEnemyAttack:true, abilityElement:el});
            if(!combat.over) applyEnemyElementalProc(el, snapIdx);
            if(combat.activeZoneElement && !combat.over){
              const zfx = ZONE_EFFECTS[combat.activeZoneElement];
              if(zfx) zfx.apply('player', snapIdx);
              updateHPBars(); renderStatusTags();
            }
          }});
          cd = 1 + cdPenalty; // basic attack puts itself on CD — second slot uses ability or waits
          continue;
        }
      }
      cd=cdPenalty;
    } else {
      const snapIdx=idx;
      const intentEntry = {label:'⏳ Wait', hidden:false};
      e.intentQueue.push(intentEntry);
      q.push({label:'⏳ Wait', intentIdx:e.intentQueue.length-1, fn:()=>{ log(combat.enemies[snapIdx].emoji + ' ' + combat.enemies[snapIdx].name + ' waits.', 'enemy'); }});
      cd--;
    }
  }
  e.basicCD=Math.max(0,cd);
  return q;
}

function executeOneEnemyAction(idx){
  if(combat.over) return;
  const e=combat.enemies[idx];
  if(!e||!e.alive) return;
  setActiveEnemy(idx);
  if(e.status.stunned>0){
    e.status.stunned--;
    log(`${e.emoji} ${e.name} is stunned!`,'status');
    renderStatusTags();
    return;
  }
  if(e.basicCD<=0){
    e.basicCD=1+enemyCooldownPenalty();
    const el = primaryElement(e.element||'');
    performHit('enemy','player',{baseDamage:e.enemyDmg, effects:enemyElementalEffects(el), isBasic:true, isEnemyAttack:true, abilityElement:el});
    if(!combat.over) applyEnemyElementalProc(el, combat.enemies.indexOf(e));
  }
}

function resolveSummonAttacks(){
  if(!combat.summons||combat.summons.length===0) return;
  const alive=aliveEnemies();
  if(alive.length===0) return;
  combat.summons.forEach(s=>{
    if(s.hp<=0) return;
    if(s.cd>0){ s.cd--; return; }
    const target=alive[Math.floor(Math.random()*alive.length)];
    const tIdx=combat.enemies.indexOf(target);
    setActiveEnemy(tIdx);
    log(`🌳 ${s.name} strikes ${target.name}!`, 'player');
    performHit('player','enemy',{baseDamage:s.dmg, effects:[], isBasic:false, abilityElement:'Nature', isSummon:true});
    if(!combat.over && Math.random()<(s.rootChance||0.5)){
      applyRoot('player','enemy', 1);
    }
  });
  // Remove dead summons
  combat.summons=combat.summons.filter(s=>s.hp>0);
  renderSummonsRow();
}


function toggleInventory(){
  if(!combat.playerTurn||combat.over) return;
  document.getElementById("inv-panel").classList.toggle("open");
}

function useItemInCombat(idx){
  if(!combat.playerTurn||combat.over) return;
  const item=player.inventory[idx]; if(!item) return;
  if((combat.actionQueue||[]).length>=combat.actionsLeft) return;
  document.getElementById("inv-panel").classList.remove("open");
  // snapshot item, remove from inv immediately to prevent double-queue
  const snapItem={...item};
  removeItemAt(idx);
  renderCombatInventory();
  queueAction(`${snapItem.emoji} ${snapItem.name}`, ()=>{
    const result=snapItem.use();
    if(result) log(`${snapItem.emoji} ${result}`,"item");
    updateHPBars(); updateStatsUI();
  });
}

function renderCombatInventory(){
  const panel=document.getElementById("inv-panel");
  const count=player.inventory.length;
  document.getElementById("inv-count-label").textContent=`${count} item${count===1?"":"s"}`;
  panel.innerHTML="";
  if(count===0){ panel.innerHTML='<div class="inv-empty">No items</div>'; }
  else {
    player.inventory.forEach((item,idx)=>{
      const b=document.createElement("button"); b.className="inv-item-btn";
      b.innerHTML=`<span>${item.emoji} ${item.name} <span style="color:#666;font-size:.63rem;">— ${item.desc}</span></span><span style="color:#555;font-size:.63rem;">USE (1)</span>`;
      b.onclick=()=>useItemInCombat(idx);
      panel.appendChild(b);
    });
  }
}




function endBattle(won){
  if(combat.over) return;
  combat.over=true; setPlayerTurnUI(false);
  stopBattleLoop();
  combat.summons=[];
  if(won){
    const isGym=combat.enemies.some(e=>e.isGym);
    log(`⚔ Victory!`,"win");
    applyHeal('player', BATTLE_HEAL, '✦ Post-battle heal');
    const goldBase=combat.totalGold||0;
    const gold=Math.round(goldBase*(1+(player._goldBonus||0)));
    player.gold+=gold;
    if(gold>0) log(`✦ Gained ${gold} gold${player._goldBonus>0?' ('+Math.round(player._goldBonus*100)+'% bonus)':''}.`,"item");
    if(Math.random()<ITEM_DROP_CHANCE){
      const id=ITEM_DROP_POOL[Math.floor(Math.random()*ITEM_DROP_POOL.length)];
      addItem(id); log(`✦ Item dropped: ${ITEM_CATALOGUE[id].emoji} ${ITEM_CATALOGUE[id].name}!`,"item");
    }
    updateHPBars(); updateStatsUI();
    const isRival = !!(combat._isRival);
    if(isGym){
      // Full heal + PP restore on gym clear
      player.hp = maxHPFor('player');
      restoreAllPP();
      updateHPBars(); updateStatsUI();
      log('✦ Gym cleared — full HP and PP restored!', 'win');
      const beatenGym = currentGymDef();
      const gymIdx = currentGymIdx;
      if(beatenGym) log('🏆 Gym '+(currentGymIdx+1)+' — '+beatenGym.name+' defeated!','win');
      // Artifact discovery (65% chance)
      const newArt = onGymDefeated(gymIdx);
      if(newArt){
        const def = ARTIFACT_CATALOGUE[newArt.id];
        if(def) log('🏺 Artifact Discovered: '+def.emoji+' '+def.name+' — check the Vault!', 'item');
      }
      const _beatenGymIdx = currentGymIdx; // capture before advancing

      // Gauntlet boss victory — not a zone gym
      if (combat._isGauntletBoss) {
        _gauntletBossIdx++;
        battleNumber++;
        if (_gauntletBossIdx >= GAUNTLET_ROSTER.length) {
          // All 3 gauntlet bosses defeated — run victory
          if (typeof showRunVictory === 'function') setTimeout(showRunVictory, 1200);
        } else {
          // Next gauntlet boss
          setTimeout(_loadGauntletBoss, 1400);
        }
        return;
      }

      advanceToNextGym(); // resets zoneBattleCount and gymSkips
      // 3rd gym (index 2) — start gauntlet instead of ending run
      if (_beatenGymIdx === 2) {
        _gauntletBossIdx = 0;
        battleNumber++;
        setTimeout(_loadGauntletBoss, 1400);
        return;
      }
    } else if(isRival){
      log('⚔ Rival '+RIVAL.name+' defeated! Passive reward incoming...','win');
      _zoneRivalDefeated = true;
      battleNumber++;
      _runRoomsCompleted++;
      // Do NOT increment zoneBattleCount for rival fights
      if(typeof checkBattleRecord === 'function') checkBattleRecord();
    } else {
      battleNumber++;
      _runRoomsCompleted++;
      zoneBattleCount++; // track progress through this gym's zone
      if(typeof checkBattleRecord === 'function') checkBattleRecord();
    }
    // Warlord's Banner reward on every win
    applyBannerReward();
    // Increment active artifact room counter for non-gym battles
    if(!isGym){
      const artUpgrade = incrementArtifactRooms();
      if(artUpgrade){
        const def = ARTIFACT_CATALOGUE[artUpgrade.id];
        if(def) log(`🏺 ${def.emoji} ${def.name} ${'★'.repeat(artUpgrade.star)} — Artifact leveled up!`, 'item');
      }
    }
    setTimeout(()=>{ showBattleRewardScreen(isGym, combat._isSpellBattle||false, isRival); }, 900);
  } else {
    if(player.revives > 0){
      player.revives--;
      const revivePct = Math.min(1.0, 0.75 + (player._talentReviveBonus||0));
      const reviveHP = Math.floor(maxHPFor('player') * revivePct);
      player.hp = reviveHP + (player._gritHealOnRevive||0);
      player.hp = Math.min(player.hp, maxHPFor('player'));
      // Clear all negative debuffs on revive
      status.player.burnStacks = 0;
      status.player.foamStacks = 0;
      status.player.frostStacks = 0;
      status.player.frozen = false;
      status.player.shockStacks = 0;
      status.player.rootStacks = 0;
      status.player.stunned = 0;
      status.player.frozenGroundTurns = 0;
      combat.over = false;
      log(`💀 Fatal blow! ❤️ Life lost — reviving to ${player.hp} HP. (${player.revives} lives left)`, "win");
      updateHPBars(); updateStatsUI();
      setTimeout(startRound, 1400);
    } else {
      log("💀 All lives lost. Your run ends here.", "lose");
      setTimeout(showGameOver, 1200);
    }
  }
}

// ── ZONE TICK ─────────────────────────────────────────────────────────────────
// Called once per round at startRound. Applies small passive zone pressure.
function applyZoneTick(){
  if(!combat.activeZoneElement || combat.over) return;
  const el = combat.activeZoneElement;
  switch(el){
    case 'Fire':
      // +2 burn on player from the scorched environment
      status.player.burnStacks = (status.player.burnStacks||0) + 2;
      status.player.burnSourcePower = Math.max(status.player.burnSourcePower||0, Math.floor(battleNumber*1.5));
      log('🔥 Zone: searing heat applies +2 Burn.','status');
      break;
    case 'Ice':
      // +2 frost on player from the frozen air
      applyFrost('enemy','player', 2);
      log('❄️ Zone: biting cold applies +2 Frost.','status');
      break;
    case 'Lightning':
      // +1 shock on player from static in the air
      status.player.shockStacks = (status.player.shockStacks||0) + 1;
      log('⚡ Zone: static charge applies +1 Shock.','status');
      break;
    case 'Earth':
      // All alive enemies gain +1 stone stack — they're on home turf
      aliveEnemies().forEach(e=>{
        e.status.stoneStacks = (e.status.stoneStacks||0) + 1;
      });
      log('🪨 Zone: earthen power grants enemies +1 Stone.','status');
      break;
    case 'Nature':
      // 40% chance to root player — vines creep in
      if(Math.random() < 0.40){
        applyRoot('enemy','player', 1);
        log('🌿 Zone: creeping vines apply 1 Root.','status');
      }
      break;
    case 'Water':
      // +1 foam on player — drenched environment blunts defences
      applyFoam('enemy','player',1);
      log('🫧 Zone: sea spray applies +1 Foam (reduces your Block).','status');
      break;
    case 'Plasma':
      // All alive enemies gain +3% dodge this round from phasing reality
      aliveEnemies().forEach(e=>{
        e.status.battleDodgeBonus = Math.min(0.30, (e.status.battleDodgeBonus||0) + 0.03);
      });
      log('🔮 Zone: reality flickers — enemies +3% dodge.','status');
      break;
    case 'Air':
      // 25% chance to stun player 1t from battering winds
      if(Math.random() < 0.25){
        status.player.stunned = Math.max(status.player.stunned||0, 1);
        log('🌀 Zone: battering winds stun you for 1 turn!','status');
      }
      break;
  }
  renderStatusTags();
  renderEnemyCards();
}


