// ===== mapCanvas.js =====
// ─── MAP SCREEN — encounter selection, zone specials, canvas node rendering ───

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
  const zoneSingles  = ENCOUNTER_POOL.filter(e => e.campType === zoneEl);
  const crossSingles = ENCOUNTER_POOL.filter(e => e.campType !== zoneEl);
  const fallbackSingles = ENCOUNTER_POOL;
  const singlePool = zoneSingles.length ? zoneSingles : fallbackSingles;

  // Zone-matching packs
  const zonePacks = PACK_POOL.filter(p => p.element === zoneEl);

  for(let i = 0; i < 2; i++){
    // Slot 0: 25% pack, else zone enemy
    // Slot 1: 30% cross-element wildcard to add variety
    if(i === 0 && zonePacks.length && Math.random() < 0.25){
      encounters.push(zonePacks[Math.floor(Math.random()*zonePacks.length)]);
    } else if(i === 1 && crossSingles.length && Math.random() < 0.30){
      encounters.push(crossSingles[Math.floor(Math.random()*crossSingles.length)]);
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
    // Mist campfire reduction: suppress this campfire if reduction active
    const campRed = (player._mistCampfireReduction || 0);
    if(campRed >= 1) return null;
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

// ── Encounter cards ────────────────────────────────────────────────────────────
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
