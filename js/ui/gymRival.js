// ===== gymRival.js =====
// ─── GYM + RIVAL intro screens and battle entry ───────────────────────────────

function rivalHP()  { return RIVAL.baseHP(currentGymIdx);  }
function rivalDmg() { return RIVAL.baseDmg(currentGymIdx); }

function showRivalIntro() {
  const hp  = rivalHP();
  const dmg = rivalDmg();
  const dialogue = RIVAL.dialogue[Math.min(currentGymIdx, RIVAL.dialogue.length - 1)];
  document.getElementById('rival-title').textContent    = RIVAL.emoji + ' Rival ' + RIVAL.name;
  document.getElementById('rival-dialogue').textContent = '"' + dialogue + '"';
  document.getElementById('rival-hp-display').textContent  = hp;
  document.getElementById('rival-dmg-display').textContent = dmg;
  document.getElementById('rival-element-display').textContent = playerElement;
  showScreen('rival-screen');
}

function startRivalBattle() {
  const hp  = rivalHP();
  const dmg = rivalDmg();
  const rivEnc = {
    name: RIVAL.name, emoji: RIVAL.emoji,
    element: playerElement,
    color: '#9a6aee',
    difficulty: 'rival', diffClass: 'diff-hard',
    enemyMaxHP: hp, enemyDmg: dmg,
    gold: Math.round(30 + currentGymIdx * 15),
    type: 'wizard',
    isRival: true,
  };
  loadBattle(rivEnc);
}

function showGymIntro(forced){
  const gym=currentGymDef(); if(!gym) return;
  const bHP=gymBossDisplayHP();
  document.getElementById("gym-title").textContent=`🏛 Gym ${currentGymIdx+1} — ${gym.name}`;
  document.getElementById("gym-boss-hp-display").textContent=bHP;
  document.getElementById("gym-boss-dmg-display").textContent=`${gymBossDisplayDmg()} → ${gym.phase2Dmg} (phase 2)`;
  document.getElementById("gym-subtitle").textContent=gym.signature;
  if(forced){
    document.getElementById("gym-warn-txt").textContent=gymSkips>0?`Skipped ${gymSkips}× — +${gymSkips*GYM_SKIP_BONUS} HP on boss.`:`Zone battle ${zoneBattleCount} — no more delays.`;
    document.getElementById("gym-skip-btn").style.display="none";
    document.getElementById("gym-challenge-btn").className="btn-gym-forced";
    document.getElementById("gym-challenge-btn").textContent="No Choice — Fight Now";
  } else {
    const battlesLeft = GYM_ZONE_FORCE - zoneBattleCount;
    document.getElementById("gym-warn-txt").textContent=gymSkips>0?`Skipped ${gymSkips}× — boss has +${gymSkips*GYM_SKIP_BONUS} HP.`:"";
    document.getElementById("gym-skip-btn").style.display="block";
    document.getElementById("gym-challenge-btn").className="btn-gym";
    document.getElementById("gym-challenge-btn").textContent=`Challenge ${gym.name}`;
    document.getElementById("gym-subtitle").textContent+=`  (${battlesLeft} battle${battlesLeft===1?"":"s"} until forced)`;
  }
  showScreen("gym-screen");
}

function startGymBattle(){
  const gym=currentGymDef(); if(!gym) return;
  loadBattle({
    name:gym.name, emoji:gym.emoji, element:gym.element, color:gym.color,
    difficulty:"gym", diffClass:"diff-hard",
    enemyMaxHP:gymBossHP(), enemyDmg:gym.baseDmg,
    gold:gym.gold, type:"wizard", isGym:true,
    signature:gym.signature,
    gymPassive:gym.passive, gymPhase2Passive:gym.phase2Passive,
    gymEntryEffect:gym.entryEffect,
    gymHitCounter:0, gymPhase2:false,
    gymPhase2Dmg:gym.phase2Dmg, gymChargeInterval:gym.chargeInterval,
  });
}

function skipGym(){ gymSkips++; _pendingNodeId = -1; showMap(); }
