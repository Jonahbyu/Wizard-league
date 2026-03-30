// ===== battleLoad.js =====
// ─── BATTLE SETUP — enemy construction, battle initialization, gym entry effects ──

function makeEnemyObj(enc){
  const el=primaryElement(enc.element||'');
  let passive;
  if(enc.isTargetDummy){
    passive=null;
  } else if(enc.gymPassive){
    passive=enc.gymPassive;
  } else {
    const pool=(PASSIVE_CHOICES[el]||[]).filter(p=>!p.legendary);
    passive=pool.length?pool[Math.floor(Math.random()*pool.length)].id:null;
  }
  // Per-enemy stat variation: each stat averages battleNumber, ±50% range
  // At B30: avg=30, could be 20 EFX / 40 DEF / 20 POW etc.
  const _statAvg = Math.max(1, battleNumber);
  const _vary = () => enc.isTargetDummy ? 0 : Math.round(_statAvg * (0.5 + Math.random()));
  const statPow = _vary();
  const statEfx = _vary();
  const statDef = _vary();

  // Zone scale applies to all enemies except dummies and gauntlet bosses (gauntlet has fixed HP)
  const zoneScaled = (enc.isTargetDummy || enc.isGauntletBoss) ? {} : scaleEnemyForZone(enc, currentGymIdx);
  const mistHPMult  = player._mistEnemyHPMult  || 1.0;
  const mistDmgMult = player._mistEnemyDmgMult || 1.0;
  // Per-battle HP ramp for regular enemies: quadratic curve to match player's compound scaling
  // (each extra action = another spell cast — player DPS grows as actions × damage/action)
  const _bnRaw  = (!enc.isGym && !enc.isTargetDummy && battleNumber > 6) ? (battleNumber - 6) : 0;
  const _bnFlat = (!enc.isGym && !enc.isTargetDummy && battleNumber > 3) ? (battleNumber - 3) * 13 : 0;
  const _bnBase = (!enc.isGym && !enc.isTargetDummy && battleNumber > 3) ? 1.20 : 1.0;
  const _bnMult = _bnBase + (_bnRaw > 0 ? _bnRaw * 0.09 + Math.pow(_bnRaw / 12, 2) : 0);
  const _lateBoost  = (!enc.isGym && !enc.isTargetDummy && !enc.isGauntletBoss && battleNumber >= 39) ? 1.3 : 1.0;
  const finalMaxHP  = Math.round(((zoneScaled.enemyMaxHP || enc.enemyMaxHP) * _bnMult + _bnFlat) * mistHPMult * 0.77 * _lateBoost * (battleNumber === 1 ? 0.5 : 1));
  const finalDmg    = Math.max(1, Math.round((zoneScaled.enemyDmg || enc.enemyDmg) * mistDmgMult * 0.80) - 5);

  // Build ability list based on element + zone depth
  // Derive difficulty from base HP if not specified: tankier enemies get more abilities
  const _difficulty = enc.difficulty || (enc.enemyMaxHP > 120 ? 'hard' : enc.enemyMaxHP > 100 ? 'medium' : 'easy');
  const abilities = (enc.isGym || enc.isTargetDummy) ? [] : buildEnemyAbilities(el, currentGymIdx, _difficulty);

  // Mist: extra passives for non-dummy enemies
  let extraPassives = [];
  if (!enc.isTargetDummy && (player._mistExtraPassives || 0) > 0) {
    const pool = (PASSIVE_CHOICES[el] || []).filter(p => !p.legendary && p.id !== passive);
    extraPassives = pickRandom(pool, player._mistExtraPassives).map(p => p.id);
  }
  // Mist: boss legendaries for gym enemies
  if (enc.isGym && (player._mistBossLegendaries || 0) > 0) {
    const legPool = (PASSIVE_CHOICES[el] || []).filter(p => p.legendary);
    extraPassives = [...extraPassives, ...pickRandom(legPool, player._mistBossLegendaries).map(p => p.id)];
  }

  // Give enemies consumable items (gym bosses get both, regular enemies get healing draught)
  const items = enc.isTargetDummy ? [] : enc.isGym
    ? ENEMY_ITEM_CATALOGUE.map(it=>({...it}))
    : [{ ...ENEMY_ITEM_CATALOGUE[0] }];

  return {
    ...enc,
    enemyMaxHP: finalMaxHP, enemyDmg: finalDmg,
    hp: finalMaxHP, alive:true, basicCD:0,
    passive, extraPassives, statPow, statEfx, statDef, status:freshEnemyStatus(),
    abilities, items,
    gymHitCounter:enc.gymHitCounter||0, gymPhase2:enc.gymPhase2||false,
  };
}

function restoreAllPP(){
  (player.spellbooks||[]).forEach(book => {
    book.spells.forEach(s=>{ if(s.maxPP !== undefined) s.currentPP = s.maxPP; });
  });
}

function loadBattle(enc){
  combat.over=false; combat.tempDmgBonus=0; combat.playerTurn=false;
  combat._gen=0; combat.basicCD=0; combat.actionQueue=[]; combat.summons=[];
  combat.totalGold=0; combat.hitFlashes=[]; combat.turnInBattle=0;
  combat._chosenRewardType = enc._rewardType || null;
  combat.activeZoneElement=(battleNumber === 1) ? null : ((inGymZone()&&!enc.isGym)?(currentGymDef()||{}).element:null);
  combat._echoReady = false;    // will be set true in startRound
  combat._swiftbladeSwitch = 0; // reset per-battle swiftblade switch counter
  combat.nextMeltDouble    = false; // Temper: next melt hit doubled
  combat.meltDoubleTurn    = false; // Molten Surge: all melt this turn doubled
  combat._seedSurgePending = false; // Seed Surge: next Seed costs no CD
  // Surge system
  combat._surgeThreshold        = 60;  // base threshold (unused directly — _getSurgeThreshold() computes it)
  combat._surgeFulguriteMinus   = 0;   // cumulative threshold reduction from Fulgurite casts
  combat._stormCoreBonus        = 0;   // cumulative threshold increase from Storm Core triggers
  combat._surgeTriggeredThisTurn = false;
  combat._residualCurrentPending = false;

  // Zone background = the map zone you are fighting in, never the enemy element
  const _gymDef = currentGymDef();
  _setZoneElement((_gymDef && _gymDef.element) ? _gymDef.element : playerElement);
  resetStatusForBattle();
  // Initialize all books' spells (CDs reset, PP calculated) so non-active books are ready too
  (player.spellbooks||[]).forEach(book => {
    book.spells.forEach(s=>{
      s.currentCD = 0;
      const rawPP = Math.ceil(32 / Math.max(1, s.baseCooldown || 0));
      const maxPP = Math.max(1, Math.floor(rawPP * (player._mistPPMult || 1.0)));
      s.maxPP = maxPP;
      // Carry PP over between battles — only reset if uninitialized or above new max
      if (s.currentPP === undefined || s.currentPP > maxPP) s.currentPP = maxPP;
    });
  });
  // Apply per-battle character buff effects
  if(player._blockStart > 0) status.player.block = (status.player.block||0) + player._blockStart;
  if((player._talentStoneStart||0) > 0) status.player.stoneStacks = (status.player.stoneStacks||0) + player._talentStoneStart;
  // Plasma: start each battle with 3 charge (+ Reserve Cell bonus)
  if(playerElement === 'Plasma'){
    const startCharge = 3 + (hasPassive('plasma_reserve_cell') ? 10 : 0) + (player._talentChargeStart||0);
    status.player.plasmaCharge = startCharge;
    status.player.plasmaChargeHalf = 0;
    combat.plasmaChargeReserved = 0;
    combat.plasmaOvercharged = false;
    combat.plasmaSpendAmounts = {}; // reset per-spell steppers each battle
    combat.plasmaCurrentSpend = 1;
    updateChargeUI();
  }

  if(enc.isPack){
    const memberCount = enc.members.length;
    // Pack members deal much less individually — total pack dps should ~= solo enemy
    // 2-pack: 60% HP / 45% dmg.  3-pack: 50% HP / 35% dmg.  4+: 40% HP / 28% dmg
    const hpScale  = memberCount <= 2 ? 0.60 : memberCount === 3 ? 0.50 : 0.40;
    const dmgScale = memberCount <= 2 ? 0.45 : memberCount === 3 ? 0.35 : 0.28;
    combat.enemies=enc.members.map(m=>makeEnemyObj({...m,
      enemyMaxHP: Math.round(m.enemyMaxHP * hpScale),
      enemyDmg:   Math.round(m.enemyDmg   * dmgScale),
      gold:Math.floor(enc.gold/enc.members.length),isGym:false}));
    combat.totalGold=enc.gold; combat._isSpellBattle=enc._isSpellBattle||false; combat._isRival=enc.isRival||false; combat._isGauntletBoss=enc.isGauntletBoss||false;
  } else {
    combat.enemies=[makeEnemyObj(enc)];
    combat.totalGold=enc.gold; combat._isSpellBattle=enc._isSpellBattle||false; combat._isRival=enc.isRival||false; combat._isGauntletBoss=enc.isGauntletBoss||false;
  }
  combat.targetIdx=0; setActiveEnemy(0);
  // Apply talent-granted battle-start stacks to enemies
  if((player._talentBurnStart||0) > 0) combat.enemies.forEach(e=>{ if(e.alive) e.status.burnStacks=(e.status.burnStacks||0)+player._talentBurnStart; });
  if((player._talentFoamStart||0) > 0) combat.enemies.forEach(e=>{ if(e.alive) e.status.foamStacks=(e.status.foamStacks||0)+player._talentFoamStart; });

  const label=enc.isGym?`⚔ Gym ${currentGymIdx+1} — ${enc.name} ⚔`
    :enc.isPack?`⚔ Pack Encounter ⚔`:`⚔ Battle ${battleNumber} ⚔`;
  document.getElementById("combat-round-label").textContent=label;
  // player-hud-name is set by updateHPBars; set element badge
  const badge=document.getElementById("combat-element-badge");
  const gym=currentGymDef();
  const zoneEl   = gym ? gym.element   : playerElement;
  const zoneMeta = CAMP_META[zoneEl] || { icon: playerEmoji, color: playerColor };
  badge.textContent=`${zoneMeta.icon} ${zoneEl} Zone`;
  badge.style.color=zoneMeta.color; badge.style.borderColor=zoneMeta.color+'44';
  document.getElementById("battle-log").innerHTML="";
  if(typeof switchCombatTab === 'function') switchCombatTab('actions');

  showScreen("combat-screen");
  // Show sandbox buttons
  const isSandbox = (typeof sandboxMode !== 'undefined' && sandboxMode);
  const skipBtn = document.getElementById('sandbox-skip-btn');
  if(skipBtn) skipBtn.style.display = isSandbox ? 'block' : 'none';
  const enemyBtn = document.getElementById('sandbox-enemy-btn');
  if(enemyBtn) enemyBtn.style.display = isSandbox ? 'block' : 'none';
  const spellBtn = document.getElementById('sandbox-spell-btn');
  if(spellBtn) spellBtn.style.display = isSandbox ? 'block' : 'none';
  const bookBtn = document.getElementById('sandbox-book-btn');
  if(bookBtn) bookBtn.style.display = isSandbox ? 'block' : 'none';
  // Sandbox zone switcher for combat
  const combatZoneBar = document.getElementById('sandbox-zone-combat-bar');
  if(combatZoneBar){
    if(typeof sandboxMode !== 'undefined' && sandboxMode){
      combatZoneBar.style.display = 'flex';
      combatZoneBar.innerHTML = '<span style="color:#888;font-size:.6rem;align-self:center;margin-right:4px;">ZONE:</span>';
      (GYM_ROSTER||[]).forEach(gym => {
        const btn = document.createElement('button');
        btn.textContent = gym.emoji + ' ' + gym.element;
        const isActive = combat.activeZoneElement === gym.element;
        btn.style.cssText = `background:${isActive?gym.color+'33':'#111'};border:1px solid ${isActive?gym.color:'#333'};color:${isActive?gym.color:'#888'};border-radius:4px;padding:2px 7px;font-size:.58rem;font-family:'Cinzel',serif;cursor:pointer;`;
        btn.onclick = () => sandboxSetCombatZone(gym.element);
        combatZoneBar.appendChild(btn);
      });
    } else {
      combatZoneBar.style.display = 'none';
    }
  }
  // Init canvas AFTER screen is visible so clientWidth is correct
  setTimeout(()=>{ initBattleCanvas(); startBattleLoop(); renderEnemyCards(); updateHPBars(); updateStatsUI();
    renderSpellButtons(); renderCombatInventory(); renderStatusTags(); updateActionUI(); }, 0);

  if(enc.isGym){
    log(`🏛 Gym ${currentGymIdx+1} — ${enc.name} steps forward!`,"system");
    if(enc.signature) log(enc.signature,"system");
    log(`✦ You enter fully healed. (${maxHPFor('player')}/${maxHPFor('player')})`,"heal");
  } else if(enc.isPack){
    log(`⚔ ${enc.packName} attacks! (${enc.members.length} enemies)`,"system");
  } else {
    log(`${enc.name} appears!`,"system");
  }
  if(combat.activeZoneElement){
    const zd=ZONE_EFFECTS[combat.activeZoneElement];
    if(zd) log(`🌍 Zone Effect active: ${zd.desc}`,"system");
  }
  log("Select your target. All enemies act each round.","system");

  if(enc.isGym&&enc.gymEntryEffect){
    setTimeout(()=>applyGymEntryEffect(enc.gymEntryEffect,enc),600);
  }
  setTimeout(startRound, enc.isGym&&enc.gymEntryEffect?1100:400);
}

function _loadGauntletBoss(){
  if(_gauntletBossIdx >= GAUNTLET_ROSTER.length) return;
  const enc = GAUNTLET_ROSTER[_gauntletBossIdx];
  loadBattle({ ...enc, _rewardType: 'gym' });
}

function applyGymEntryEffect(effect, enc){
  if(combat.over) return;
  const gym=combat.enemies[0]; if(!gym) return;
  switch(effect){
    case 'frozen_ground':
      status.player.frostStacks=(status.player.frostStacks||0)+6;
      log(`❄️ ${enc.name} casts Frozen Ground! You are afflicted with 6 Frost!`,'enemy');
      renderStatusTags(); break;
    case 'chain_shock':
      status.player.shockStacks=(status.player.shockStacks||0)+3;
      log(`⚡ ${enc.name} opens with Chain Shock! +3 Shock!`,'enemy'); break;
    case 'fortify':
      gym.status.block=(gym.status.block||0)+30;
      gym.status.stoneStacks=(gym.status.stoneStacks||0)+3;
      log(`🪨 ${enc.name} FORTIFIES! +30 Block, +3 Stone stacks!`,'enemy');
      renderEnemyCards(); break;
    case 'summon_treant':
      combat.summons.push({name:'Gym Treant',emoji:'🌳',hp:100,maxHP:100,
        dmg:35+Math.floor(player.attackPower/2),cd:0,id:Date.now(),rootChance:0.75});
      log(`🌿 ${enc.name} summons a mighty Treant!`,'enemy');
      renderSummonsRow(); break;
  }
}
