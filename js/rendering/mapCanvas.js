// ===== map.js =====
// ─── MAP, SHOP, CAMPFIRE, GYM, loadBattle ────────────────────────────────────

function showMap(){
  const _gymDef = currentGymDef();
  _setZoneElement((_gymDef && _gymDef.element) ? _gymDef.element : playerElement);

  // ── Sandbox zone switcher ──
  const sandboxBar = document.getElementById('sandbox-zone-bar');
  if(sandboxBar){
    if(typeof sandboxMode !== 'undefined' && sandboxMode){
      sandboxBar.style.display = 'flex';
      sandboxBar.innerHTML = '<span style="color:#888;font-size:.6rem;align-self:center;margin-right:4px;">ZONE:</span>';
      (GYM_ROSTER||[]).forEach((gym, i) => {
        const btn = document.createElement('button');
        btn.textContent = gym.emoji + ' ' + gym.element;
        btn.style.cssText = `background:${i===currentGymIdx?gym.color+'33':'#111'};border:1px solid ${i===currentGymIdx?gym.color:'#333'};color:${i===currentGymIdx?gym.color:'#888'};border-radius:4px;padding:2px 7px;font-size:.58rem;font-family:'Cinzel',serif;cursor:pointer;`;
        btn.onclick = () => {
          currentGymIdx = i;
          gymDefeated = false;
          zoneBattleCount = 0;
          _setZoneElement(gym.element);
          showMap();
        };
        sandboxBar.appendChild(btn);
      });
    } else {
      sandboxBar.style.display = 'none';
    }
  }
  // ── HP bar ──
  const pMax = maxHPFor('player');
  const pPct = Math.max(0,(player.hp/pMax)*100);
  document.getElementById('map-player-hp').textContent = `HP ${player.hp}/${pMax}`;
  const bar = document.getElementById('map-hp-bar');
  bar.style.width = pPct+'%'; bar.style.background = hpColor(pPct);

  // ── Lives ──
  const livesEl = document.getElementById('map-lives-inline');
  if(livesEl) livesEl.textContent = '❤'.repeat(Math.max(0,player.revives));

  // ── Zone pill ──
  const gym = currentGymDef();
  const zonePill = document.getElementById('map-zone-label');
  if(zonePill){
    if(gymDefeated){
      zonePill.textContent = '✦ Champion';
      zonePill.style.borderColor = '#5a4aaa';
      zonePill.style.color = '#9a7aff';
    } else if(gym){
      zonePill.textContent = `${gym.element} Zone · Battle ${zoneBattleCount}`;
      zonePill.style.borderColor = gym.color+'55';
      zonePill.style.color = gym.color;
    }
  }

  // ── Gym warning banner (compressed) ──
  const banner = document.getElementById('gym-warning-banner');
  if(gym && !gymDefeated){
    const remaining = GYM_ZONE_FORCE - zoneBattleCount;
    if(gymIsForced()){
      banner.innerHTML = `⚠ ${gym.name} — FORCED FIGHT`;
      banner.style.cssText = 'display:block;background:#1a0a0a;border-color:#6a1a1a;color:#aa4444;border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;';
    } else if(gymShouldAppear() && remaining <= 3){
      banner.innerHTML = `⚠ ${gym.name} — ${remaining} battle${remaining===1?'':'s'} until forced`;
      banner.style.cssText = 'display:block;background:#1a0a0a;border-color:#6a1a1a;color:#aa4444;border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;';
    } else if(gymShouldAppear()){
      banner.innerHTML = `🏛 ${gym.name} is ready`;
      banner.style.cssText = `display:block;background:${gym.color}11;border-color:${gym.color}44;color:${gym.color};border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;`;
    } else {
      banner.style.display = 'none';
    }
  } else if(gymDefeated){
    banner.innerHTML = '✦ All 8 Gym Leaders defeated.';
    banner.style.cssText = 'display:block;background:#0a0820;border-color:#4a3a8a;color:#9a7aff;border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;';
  } else {
    banner.style.display = 'none';
  }

  showScreen('map-screen');

  // ── Forced gym ──
  if(gym && gymIsForced()){
    const specials = [{ type:'gym', enc:{ _forced:true } }];
    _buildAndShowCanvas([], specials);
    return;
  }

  // ── 2 combat encounters — locked to current zone element ──
  const zoneEl = gym ? gym.element : playerElement;
  const encounters = [];

  // Pool of zone-matching singles; fallback to any if zone has none
  const zoneSingles = ENCOUNTER_POOL.filter(e => e.campType === zoneEl);
  const fallbackSingles = ENCOUNTER_POOL.filter(e => e.campType !== 'Pack');
  const singlePool = zoneSingles.length ? zoneSingles : fallbackSingles;

  // Zone-matching packs
  const zonePacks = PACK_POOL.filter(p => p.element === zoneEl);

  for(let i = 0; i < 2; i++){
    // 25% chance of a zone pack on first slot if available
    if(i === 0 && zonePacks.length && Math.random() < 0.25){
      encounters.push(zonePacks[Math.floor(Math.random()*zonePacks.length)]);
    } else {
      encounters.push(singlePool[Math.floor(Math.random()*singlePool.length)]);
    }
  }

  // ── Specials: gym + rival go in specials array (shown alongside encounters) ──
  const specials = [];
  if(gym && gymShouldAppear()) specials.push({ type:'gym', enc:{} });

  // Rival timing: battle 6 in first gym, battle 4 in all others
  const rivalSlot = currentGymIdx === 0 ? 6 : 4;
  if(zoneBattleCount === rivalSlot && !_zoneRivalDefeated) specials.push({ type:'rival', enc:{} });

  // Campfire / shop: replace ONE encounter slot (keeps total at 2 unless gym present)
  const zoneSpecial = _pickZoneSpecial();
  if(zoneSpecial && encounters.length > 0) {
    // Replace the first encounter slot with the special
    encounters[0] = { _specialType: zoneSpecial, _isSpecial: true };
  }

  // Tag second encounter as spell reward battle when applicable
  const isSpellTurn = (battleNumber % SPELL_REWARD_EVERY === 0);
  if (isSpellTurn && encounters.length > 0) {
    const spellIdx = encounters.length > 1 ? 1 : 0;
    if (!encounters[spellIdx]._isSpecial) {
      encounters[spellIdx] = { ...encounters[spellIdx], _isSpellBattle: true,
        enemyMaxHP: Math.round((encounters[spellIdx].enemyMaxHP || 100) * 1.35),
        enemyDmg:   Math.round((encounters[spellIdx].enemyDmg   ||  15) * 1.2) };
    }
  }
  _buildAndShowCanvas(encounters, specials);
}

// ── Zone special scheduling ────────────────────────────────────────────────
// Campfire and shop each appear once per zone as a CHOICE vs a battle (battle 5+).
// They replace one encounter slot, keeping the map to 2 choices (unless gym present).
let _zoneShopBattle     = -1;
let _zoneCampfireBattle = -1;

function initZoneSpecial(){
  // Both appear at battle 5 or later, separated by at least 2 battles
  const latest = Math.max(7, GYM_ZONE_FORCE - 2);
  const earlyPos = 5 + Math.floor(Math.random() * 2);           // 5 or 6
  const latePos  = earlyPos + 2 + Math.floor(Math.random() * 2); // 2-3 after early
  const clampedLate = Math.min(latePos, latest);
  if(Math.random() < 0.5){
    _zoneCampfireBattle = earlyPos;
    _zoneShopBattle     = clampedLate;
  } else {
    _zoneShopBattle     = earlyPos;
    _zoneCampfireBattle = clampedLate;
  }
}

// Returns 'campfire' | 'shop' | null — signals that this battle slot should
// offer the special as an alternative to one of the two combat encounters.
function _pickZoneSpecial(){
  if(zoneBattleCount < 5) return null;
  if(zoneBattleCount === _zoneCampfireBattle){
    _zoneCampfireBattle = -1;
    return 'campfire';
  }
  if(zoneBattleCount === _zoneShopBattle){
    _zoneShopBattle = -1;
    return 'shop';
  }
  return null;
}

function _buildAndShowCanvas(encounters, specials){
  setTimeout(()=>{
    const canvas = document.getElementById('map-canvas');
    if(!canvas) return;
    const wrap = canvas.parentElement;
    // Fill viewport minus a tiny padding
    canvas.width  = Math.round(wrap.clientWidth  || window.innerWidth);
    canvas.height = Math.round(wrap.clientHeight || window.innerHeight);
    if(canvas.height < 300) canvas.height = Math.round(window.innerHeight);
    const nodes = buildMapNodes(encounters, specials, canvas.width, canvas.height);
    showMapCanvas(nodes);
  }, 0);
}


function makeCombatCard(enc){
  // Special encounter slots (campfire / shop replacing a battle)
  if(enc._isSpecial) return makeSpecialCard(enc._specialType);

  const card=document.createElement("div"); card.className="encounter-card";
  const gym=currentGymDef();
  const zone=(gym&&inGymZone()) ? ZONE_EFFECTS[gym.element] : null;
  // Check if this encounter's element matches the zone (gets the +20% damage buff)
  const encElement = enc.isPack
    ? primaryElement(enc.members[0]?.element||'')
    : primaryElement(enc.element||'');
  const zoneMatches = zone && gym && encElement === gym.element;
  const zoneLine = zone
    ? `<div style="font-size:.57rem;color:${gym.color};margin-top:2px;">${zone.desc}${zoneMatches?' · <b>+20% dmg (zone buffed)</b>':''}</div>`
    : '';

  if(enc.isPack){
    const meta=CAMP_META['Pack'];
    const totalHP=enc.members.reduce((s,m)=>s+m.enemyMaxHP,0);
    const maxDmg=enc.members.reduce((s,m)=>Math.max(s,m.enemyDmg),0);
    const packReward = enc._isSpellBattle ? '<div class="enc-reward-tag" style="color:#a080ff;">✦ SPELL</div>' : '<div class="enc-reward-tag" style="color:#c8a060;">✦ REWARD</div>';
    const packHat = elemHatSVG(enc.element||'Neutral', 20);
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:${meta.color}">${packHat} ${enc.packName}</div><div class="enc-desc" style="color:${meta.color};opacity:.7;">${enc.members.length} wizards · HP:${totalHP} · Dmg:${maxDmg}</div>${zoneLine}</div><div class="enc-right">${packReward}<div class="enc-stats">Gold:${enc.gold}</div></div>`;
    card.onclick=()=>loadBattle(enc);
  } else {
    const meta=CAMP_META[enc.campType]||{color:enc.color||'#888',icon:'⚔',label:enc.campType};
    // Determine what reward this battle will give based on when it's fought
    const nextBattle = battleNumber + (enc._isSpellBattle ? 0 : 0);
    const isSpellBattle = enc._isSpellBattle || false;
    const rewardTag  = isSpellBattle
      ? '<div class="enc-reward-tag" style="color:#a080ff;">✦ SPELL</div>'
      : '<div class="enc-reward-tag" style="color:#c8a060;">✦ REWARD</div>';
    const enemyNote  = isSpellBattle ? `<span style="color:#6a4a80;font-size:.58rem;"> · ⚠ Elite</span>` : '';
    const hatIcon = elemHatSVG(enc.element||'Neutral', 20);
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:${meta.color}">${meta.icon} ${meta.label}</div><div class="enc-desc" style="color:#777;display:flex;align-items:center;gap:5px;">${hatIcon}<span style="color:${meta.color};font-family:'Cinzel',serif;font-size:.72rem;">${enc.name}</span><span style="color:#555;"> · HP:${enc.enemyMaxHP} · Dmg:${enc.enemyDmg}/turn${enemyNote}</span></div>${zoneLine}</div><div class="enc-right">${rewardTag}<div class="enc-stats">Gold:${enc.gold}</div></div>`;
    card.onclick=()=>loadBattle(enc);
  }
  return card;
}

function makeGymCard(forced){
  const gym=currentGymDef(); if(!gym) return document.createElement("div");
  const card=document.createElement("div");
  card.className=`special-card ${forced?"card-gym-warn":"card-gym"}`;
  const bHP=gymBossHP();
  const battlesLeft = GYM_ZONE_FORCE - zoneBattleCount;
  const bonus=gymSkips>0?` (+${gymSkips*GYM_SKIP_BONUS} HP from skips)`:"";
  card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:${forced?"#cc4444":gym.color}">🏛 Gym ${currentGymIdx+1} — ${gym.name}</div><div class="enc-desc" style="color:${forced?"#7a2a2a":"#888"}">${gym.element} · HP:${bHP}${bonus} · ${forced?"MUST FIGHT NOW":"zone battle "+zoneBattleCount+"/"+GYM_ZONE_FORCE}</div><div style="font-size:.57rem;color:#555;margin-top:2px;">${gym.signature}</div></div><div class="enc-right" style="color:${forced?"#cc4444":gym.color};font-family:'Cinzel',serif;font-size:.62rem;">${forced?"FORCED":"BOSS"}</div>`;
  card.onclick=()=>showGymIntro(forced);
  return card;
}

function makeSpecialCard(type){
  const card=document.createElement("div"); card.className="special-card";
  if(type==="campfire"){
    card.classList.add("card-campfire");
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:#d4822a">🔥 Campfire</div><div class="enc-desc" style="color:#7a5a2a">Recover 50% HP</div></div><div class="enc-right" style="color:#7a5a2a">REST</div>`;
    card.onclick=()=>enterCampfire();
  } else if(type==="rival"){
    const rHP=rivalHP(), rDmg=rivalDmg();
    card.style.borderColor='#3a1a6a';
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:#9a6aee">🧢 Rival ${RIVAL.name}</div><div class="enc-desc" style="color:#6a4a90">${playerElement} · HP:${rHP} · Dmg:${rDmg}/turn</div><div style="font-size:.57rem;color:#4a3a60;margin-top:2px;">Reward: ✦ Passive Ability</div></div><div class="enc-right" style="color:#9a6aee;font-family:'Cinzel',serif;font-size:.62rem;">RIVAL</div>`;
    card.onclick=()=>showRivalIntro();
  } else {
    card.classList.add("card-shop");
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:#2aaa7a">🏪 Shop</div><div class="enc-desc" style="color:#2a6a4a">Spend gold on items</div></div><div class="enc-right" style="color:#2a6a4a">SHOP</div>`;
    card.onclick=()=>enterShop();
  }
  return card;
}

// ── GYM ──────────────────────────────────────────────────────────────────────
// ── RIVAL ─────────────────────────────────────────────────────────────────────

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
    xp: 0, gold: Math.round(30 + currentGymIdx * 15),
    type: 'wizard',
    isRival: true,
  };
  loadBattle(rivEnc);
}

function showGymIntro(forced){
  const gym=currentGymDef(); if(!gym) return;
  const bHP=gymBossHP();
  document.getElementById("gym-title").textContent=`🏛 Gym ${currentGymIdx+1} — ${gym.name}`;
  document.getElementById("gym-boss-hp-display").textContent=bHP;
  document.getElementById("gym-boss-dmg-display").textContent=`${gym.baseDmg} → ${gym.phase2Dmg} (phase 2)`;
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
    xp:gym.xp, gold:gym.gold, type:"wizard", isGym:true,
    signature:gym.signature,
    gymPassive:gym.passive, gymPhase2Passive:gym.phase2Passive,
    gymEntryEffect:gym.entryEffect,
    gymHitCounter:0, gymPhase2:false,
    gymPhase2Dmg:gym.phase2Dmg, gymChargeInterval:gym.chargeInterval,
  });
}

function skipGym(){ gymSkips++; showMap(); }

// ── CAMPFIRE / SHOP ───────────────────────────────────────────────────────────
function enterCampfire(){
  const pMax=maxHPFor('player');
  const h=Math.floor(pMax*CAMPFIRE_HEAL);
  const actual=applyHeal('player',h,null);
  const descEl = document.getElementById("campfire-desc");
  descEl.textContent = actual>0
    ?`You rest and recover ${actual} HP. (${player.hp}/${pMax})`
    :`Already at full health. The fire is warm.`;
  showScreen("campfire-screen");
  const healText = actual>0 ? `+${actual} HP restored` : '';
  setTimeout(()=>startCampfireScene(healText), 0);
}
function leaveCampfire(){ stopCampfireScene(); showMap(); }

function enterShop(){
  document.getElementById("shop-gold-display").textContent=player.gold;
  const c=document.getElementById("shop-items"); c.innerHTML="";
  const addRow=(emoji,name,desc,cost,canBuy,onBuy)=>{
    const row=document.createElement("div");
    row.className="shop-item-row"+(canBuy?"":" cant-afford");
    row.innerHTML=`<div><div class="shop-item-name">${emoji} ${name}</div><div class="shop-item-desc">${desc}</div></div><div class="shop-item-cost">${cost}g</div>`;
    if(canBuy) row.onclick=onBuy;
    c.appendChild(row);
  };
  SHOP_ITEMS.forEach(id=>{
    const item=ITEM_CATALOGUE[id];
    addRow(item.emoji,item.name,item.desc,item.shopCost,player.gold>=item.shopCost,
      ()=>{player.gold-=item.shopCost;addItem(id);enterShop();});
  });
  const revCost = 200;
  const maxRevives = 6;
  addRow('❤️','Extra Life',`Gain +1 life (${player.revives} now). Revives heal to 75% HP.`,
    revCost, player.gold>=revCost && player.revives<maxRevives,
    ()=>{player.gold-=revCost; player.revives++; enterShop();});

  const actionCost = 350;
  const maxBonusActions = 2;
  addRow('⚡','Extra Action',
    `Gain +1 permanent action per turn (${player.bonusActions}/${maxBonusActions}). Cooldowns still apply.`,
    actionCost, player.gold>=actionCost && (player.bonusActions||0)<maxBonusActions,
    ()=>{player.gold-=actionCost; player.bonusActions=(player.bonusActions||0)+1; enterShop();});
  const allPassives=Object.entries(PASSIVE_CHOICES).flatMap(([el,ps])=>ps.map(p=>({...p,element:el})));
  const forSale=allPassives.filter(p=>!p.legendary&&!player.passives.includes(p.id));
  pickRandom(forSale,2).forEach(p=>{
    const pCost=1000;
    addRow(p.emoji,p.title,`[${p.element}] ${p.desc}`,pCost,player.gold>=pCost,
      ()=>{player.gold-=pCost;addPassiveToBook(p.id);enterShop();});
  });
  updateStatsUI();
  showScreen("shop-screen");
  startShopCanvas();
}
function leaveShop(){
  const c = document.getElementById('shop-canvas');
  if(c && c._stop) c._stop();
  showMap();
}

// ── BATTLE LOAD ───────────────────────────────────────────────────────────────
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
  combat.totalXP=0; combat.totalGold=0; combat.hitFlashes=[]; combat.turnInBattle=0;
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
      xp:Math.floor(enc.xp/enc.members.length),
      gold:Math.floor(enc.gold/enc.members.length),isGym:false}));
    combat.totalXP=enc.xp; combat.totalGold=enc.gold; combat._isSpellBattle=enc._isSpellBattle||false; combat._isRival=enc.isRival||false;
  } else {
    combat.enemies=[makeEnemyObj(enc)];
    combat.totalXP=enc.xp; combat.totalGold=enc.gold; combat._isSpellBattle=enc._isSpellBattle||false; combat._isRival=enc.isRival||false;
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


