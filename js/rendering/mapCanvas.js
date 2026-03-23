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
  updateStatsUI();

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
    // Slot 0: 25% pack, 35% cross-element, else zone enemy
    // Slot 1: 50% cross-element, else zone enemy
    const crossChance = i === 0 ? 0.35 : 0.50;
    if(i === 0 && zonePacks.length && Math.random() < 0.25){
      encounters.push(zonePacks[Math.floor(Math.random()*zonePacks.length)]);
    } else if(crossSingles.length && Math.random() < crossChance){
      encounters.push(crossSingles[Math.floor(Math.random()*crossSingles.length)]);
    } else {
      encounters.push(singlePool[Math.floor(Math.random()*singlePool.length)]);
    }
  }

  // ── Specials: gym + rival go in specials array (shown alongside encounters) ──
  const specials = [];
  if(gym && gymShouldAppear()) specials.push({ type:'gym', enc:{} });

  // Rival timing: randomised per zone via _zoneRivalSlot (set in initZoneRewardSequence)
  const rivalSlot = (typeof _zoneRivalSlot !== 'undefined' && _zoneRivalSlot > 0) ? _zoneRivalSlot : (currentGymIdx === 0 ? 8 : 6);
  if(zoneBattleCount === rivalSlot && !_zoneRivalDefeated) specials.push({ type:'rival', enc:{} });

  // Campfire / shop: replace ONE encounter slot (keeps total at 2 unless gym present)
  const zoneSpecial = _pickZoneSpecial();
  if(zoneSpecial && encounters.length > 0) {
    // Replace the first encounter slot with the special
    encounters[0] = { _specialType: zoneSpecial, _isSpecial: true };
  }

  // Tag each encounter with its own reward type (left and right differ)
  const nextSlot = zoneBattleCount + 1;
  encounters.forEach((enc, i) => {
    if (enc._isSpecial) return;
    const reward = getZoneRewardType(nextSlot, currentGymIdx, i);
    encounters[i] = { ...enc, _rewardType: reward };
  });

  _buildAndShowCanvas(encounters, specials);
}

// ── Zone special scheduling ────────────────────────────────────────────────
// 2 shops + 2 campfires per zone, in two pairs:
//   Mid pair  — slots 7–10, after the rival window
//   End pair  — slots 11–13, once the gym is showing (guaranteed if gym is skipped)
let _zoneShopMid      = -1;
let _zoneCampfireMid  = -1;
let _zoneShopEnd      = -1;
let _zoneCampfireEnd  = -1;

function initZoneSpecial(){
  // Generate the dynamic reward sequence and rival slot for this zone
  if (typeof initZoneRewardSequence === 'function') initZoneRewardSequence();

  // Mid pair: two consecutive-ish slots in range 7-10
  const midFirst  = 7 + Math.floor(Math.random() * 3);          // 7, 8, or 9
  const midSecond = Math.min(midFirst + 1 + Math.floor(Math.random() * 2), 10); // +1 or +2, cap 10

  // End pair: slots 11-12 or 12-13 (always in the gym-open window)
  const endFirst  = 11 + Math.floor(Math.random() * 2);         // 11 or 12
  const endSecond = endFirst + 1;                                 // always +1

  // Randomly assign shop/campfire within each pair
  if(Math.random() < 0.5){ _zoneCampfireMid = midFirst;  _zoneShopMid     = midSecond; }
  else                    { _zoneShopMid     = midFirst;  _zoneCampfireMid = midSecond; }

  if(Math.random() < 0.5){ _zoneCampfireEnd = endFirst;  _zoneShopEnd     = endSecond; }
  else                    { _zoneShopEnd     = endFirst;  _zoneCampfireEnd = endSecond; }
}

// Returns 'campfire' | 'shop' | null
function _pickZoneSpecial(){
  if(zoneBattleCount === _zoneCampfireMid){
    _zoneCampfireMid = -1;
    if((player._mistCampfireReduction||0) >= 1) return null;
    return 'campfire';
  }
  if(zoneBattleCount === _zoneShopMid){
    _zoneShopMid = -1;
    return 'shop';
  }
  if(zoneBattleCount === _zoneCampfireEnd){
    _zoneCampfireEnd = -1;
    if((player._mistCampfireReduction||0) >= 1) return null;
    return 'campfire';
  }
  if(zoneBattleCount === _zoneShopEnd){
    _zoneShopEnd = -1;
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
const _MAP_REWARD_CFG = {
  primary_spell: { emoji:'✦',  label:'Starting Spell', color:'#c080ff', sub:'#7050b0', anim:'mapSpellGlow 2.2s ease-in-out infinite' },
  spell:         { emoji:'📜', label:'Spell Reward',   color:'#a080ff', sub:'#6040a0', anim:'mapSpellGlow 2.8s ease-in-out infinite' },
  incantation:   { emoji:'📜', label:'Incantation',    color:'#e08030', sub:'#905020', anim:'mapScrollFloat 2.6s ease-in-out infinite' },
  minor:         { emoji:'💰', label:'Pick Up',        color:'#c8a060', sub:'#887040', anim:'mapPickupFloat 2.6s ease-in-out infinite' },
  major:         { emoji:'⚡', label:'Power Up',       color:'#e8d060', sub:'#a08040', anim:'mapPowerPulse 2.2s ease-in-out infinite' },
};

function _injectMapRewardStyles() {
  if (document.getElementById('map-reward-styles')) return;
  const s = document.createElement('style');
  s.id = 'map-reward-styles';
  s.textContent = `
    @keyframes mapSpellGlow {
      0%,100% { filter:drop-shadow(0 0 6px #8060c0);transform:scale(1); }
      50%     { filter:drop-shadow(0 0 18px #a080ff);transform:scale(1.18); }
    }
    @keyframes mapScrollFloat {
      0%,100% { transform:translateY(0);filter:drop-shadow(0 0 5px #c06010); }
      50%     { transform:translateY(-7px);filter:drop-shadow(0 0 13px #e08020); }
    }
    @keyframes mapPickupFloat {
      0%,100% { transform:translateY(0);filter:drop-shadow(0 0 4px #c89040); }
      50%     { transform:translateY(-7px);filter:drop-shadow(0 0 12px #e8b060); }
    }
    @keyframes mapPowerPulse {
      0%,100% { filter:drop-shadow(0 0 8px #c8a020);transform:scale(1); }
      50%     { filter:drop-shadow(0 0 22px #ffd040);transform:scale(1.20); }
    }
  `;
  document.head.appendChild(s);
}

function makeCombatCard(enc){
  // Special encounter slots (campfire / shop replacing a battle)
  if(enc._isSpecial) return makeSpecialCard(enc._specialType);

  _injectMapRewardStyles();

  const card = document.createElement('div');
  card.className = 'encounter-card';
  card.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.1rem .8rem;gap:.5rem;';

  const nextSlot = zoneBattleCount + 1;
  const rewardType = getZoneRewardType(nextSlot, currentGymIdx);
  const cfg = _MAP_REWARD_CFG[rewardType] || _MAP_REWARD_CFG.minor;

  const gold = enc.isPack
    ? enc.gold
    : (enc.gold || 0);

  card.innerHTML = `
    <div style="font-size:2.2rem;line-height:1;animation:${cfg.anim};">${cfg.emoji}</div>
    <div style="font-family:'Cinzel',serif;font-size:.78rem;color:${cfg.color};letter-spacing:.08em;margin-top:.1rem;">${cfg.label}</div>
    <div style="font-size:.58rem;color:#444;margin-top:.1rem;">⚔ Battle · ${gold}g</div>
  `;

  card.onclick = () => loadBattle(enc);
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
