// ===== battleLoad.js =====
// ─── BATTLE SETUP — enemy construction, battle initialization, gym entry effects ──

function makeEnemyObj(enc){
  const el=primaryElement(enc.element||'');
  let passive;
  if(enc.isTargetDummy){
    passive=null;
  } else if(enc.gymPassive){
    passive=enc.gymPassive;
  } else if(inGymZone()&&!enc.isGym){
    const zGym=currentGymDef();
    const zPool=zGym?(PASSIVE_CHOICES[zGym.element]||[]).filter(p=>!p.legendary):[];
    const nativePool=(PASSIVE_CHOICES[el]||[]).filter(p=>!p.legendary);
    // 65% chance to use zone element passive, 35% native
    if(zPool.length && Math.random()<0.65){
      passive=zPool[Math.floor(Math.random()*zPool.length)].id;
    } else if(nativePool.length){
      passive=nativePool[Math.floor(Math.random()*nativePool.length)].id;
    }
  } else {
    const pool=(PASSIVE_CHOICES[el]||[]).filter(p=>!p.legendary);
    passive=pool.length?pool[Math.floor(Math.random()*pool.length)].id:null;
  }
  const scaledPower=BASE_POWER+Math.floor(currentGymIdx*4)+(enc.isGym?8:0);

  // Scale HP and dmg by zone depth (non-gym enemies only; gym bosses and dummies have fixed stats)
  const zoneScaled = (enc.isGym || enc.isTargetDummy) ? {} : scaleEnemyForZone(enc, currentGymIdx);
  const finalMaxHP  = zoneScaled.enemyMaxHP || enc.enemyMaxHP;
  const finalDmg    = zoneScaled.enemyDmg   || enc.enemyDmg;

  // Build ability list based on element + zone depth
  const abilities = (enc.isGym || enc.isTargetDummy) ? [] : buildEnemyAbilities(el, currentGymIdx, enc.difficulty||'easy');

  return {
    ...enc,
    enemyMaxHP: finalMaxHP, enemyDmg: finalDmg,
    hp: finalMaxHP, alive:true, basicCD:0,
    passive, scaledPower, status:freshEnemyStatus(),
    abilities,
    gymHitCounter:enc.gymHitCounter||0, gymPhase2:enc.gymPhase2||false,
  };
}

function loadBattle(enc){
  combat.over=false; combat.tempDmgBonus=0; combat.playerTurn=false;
  combat.basicCD=0; combat.actionQueue=[]; combat.summons=[];
  combat.totalGold=0; combat.hitFlashes=[]; combat.turnInBattle=0;
  combat.activeZoneElement=(inGymZone()&&!enc.isGym)?(currentGymDef()||{}).element:null;

  // Zone background = the map zone you are fighting in, never the enemy element
  const _gymDef = currentGymDef();
  _setZoneElement((_gymDef && _gymDef.element) ? _gymDef.element : playerElement);
  resetStatusForBattle();
  player.spellbook.forEach(s=>s.currentCD=0);
  // Apply per-battle character buff effects
  if(player._blockStart > 0) status.player.block = (status.player.block||0) + player._blockStart;
  // Plasma: start each battle with 3 charge (+ Reserve Cell bonus)
  if(playerElement === 'Plasma'){
    const startCharge = 3 + (hasPassive('plasma_reserve_cell') ? 10 : 0);
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
    combat.totalGold=enc.gold; combat._isSpellBattle=enc._isSpellBattle||false; combat._isRival=enc.isRival||false;
  } else {
    combat.enemies=[makeEnemyObj(enc)];
    combat.totalGold=enc.gold; combat._isSpellBattle=enc._isSpellBattle||false; combat._isRival=enc.isRival||false;
  }
  combat.targetIdx=0; setActiveEnemy(0);

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

function applyGymEntryEffect(effect, enc){
  if(combat.over) return;
  const gym=combat.enemies[0]; if(!gym) return;
  switch(effect){
    case 'frozen_ground':
      status.player.frostStacks=(status.player.frostStacks||0)+6;
      log(`❄️ ${enc.name} casts Frozen Ground! You are afflicted with 6 Frost!`,'enemy');
      renderStatusTags(); break;
    case 'chain_shock':
      status.player.shockPending=(status.player.shockPending||0)+3;
      log(`⚡ ${enc.name} opens with Chain Shock! +3 Shock incoming!`,'enemy'); break;
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
