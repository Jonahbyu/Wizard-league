// ===== progression.js =====
// ─── LEVEL-UP PROGRESSION ────────────────────────────────────────────────────

// ── Spell tiers ──────────────────────────────────────────────────────────────
// primary   → offered at level 2
// secondary → offered at levels 5, 10, 20, 25, ...
// legendary → offered at levels 15, 30, ... (tertiary)
// Starters are isStarter:true and never appear in pools.

// ── XP / Level up ────────────────────────────────────────────────────────────
// ===============================
// BATTLE REWARD SYSTEM
// ===============================

// How many battles until next spell reward
const SPELL_REWARD_EVERY = 3;

// Pool of stat/run rewards
function buildStatRewardPool() {
  const pool = [
    { label:'+5 Attack Power',  emoji:'⚔',  tag:'Stat',
      desc:'Permanently gain +5 Attack Power.',
      apply(){ player.attackPower += 5; } },
    { label:'+5 Effect Power',  emoji:'✦',  tag:'Stat',
      desc:'Permanently gain +5 Effect Power.',
      apply(){ player.effectPower += 5; } },
    { label:'+5 Defense',       emoji:'🛡',  tag:'Stat',
      desc:'Permanently gain +5 Defense.',
      apply(){ player.defense += 5; } },
    { label:'+15 Max HP',       emoji:'❤',  tag:'Stat',
      desc:'Permanently increase max HP by 15.',
      apply(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+15; player.hp=Math.min(maxHPFor('player'),player.hp+15); } },
    { label:'+50 Gold',         emoji:'✦',  tag:'Gold',
      desc:'Gain 50 gold for the shop.',
      apply(){ player.gold += 50; } },
    { label:'Heal 40%',         emoji:'💚',  tag:'Heal',
      desc:'Restore 40% of your max HP.',
      apply(){ applyHeal('player', Math.floor(maxHPFor('player')*0.40), '✦ Reward Heal'); } },
  ];

  // Run rewards — rarer, appear occasionally
  const roll = Math.random();
  if (roll < 0.18) {
    pool.push({ label:'Extra Action',   emoji:'⚡', tag:'Run Reward',
      desc:'Permanently gain +1 action per turn in combat.',
      apply(){ player.bonusActions = (player.bonusActions||0) + 1; log('⚡ Extra action per turn gained!','win'); } });
  }
  if (roll >= 0.15 && roll < 0.30) {
    pool.push({ label:'Extra Life',     emoji:'❤', tag:'Run Reward',
      desc:'Gain one extra life — survive a killing blow.',
      apply(){ player.revives = (player.revives||0) + 1; log('❤ Extra life gained!','win'); } });
  }
  if (roll >= 0.25 && roll < 0.40) {
    pool.push({ label:'Extra Spell Slot', emoji:'📖', tag:'Run Reward',
      desc:'Your active spellbook gains +1 spell slot this run.',
      apply(){ const b=activeBook(); if(b){ b.spellSlots++; log('📖 Spell slot added to '+b.name+'!','win'); } } });
  }
  if (roll >= 0.35 && roll < 0.50) {
    pool.push({ label:'Reroll Token',   emoji:'🎲', tag:'Run Reward',
      desc:'Gain 1 reroll — re-draw your choices after any future battle.',
      apply(){ player._rerolls = (player._rerolls||0) + 1; log('🎲 Reroll token gained!','win'); } });
  }

  return pool;
}

let _currentRewardPool = [];
let _currentRewardIsGym = false;
let _currentRewardTier = 'minor';

function grantRandomLegendary() {
  const elements = [playerElement, ...(player.unlockedElements||[])];
  const owned = new Set((player.spellbook||[]).map(s => s.id));

  // Build legendary spell pool
  const spellPool = [];
  elements.forEach(el => {
    Object.values(SPELL_CATALOGUE).forEach(s => {
      if (s.element !== el) return;
      if (owned.has(s.id)) return;
      if ((s.tier || 'secondary') === 'legendary') spellPool.push({type:'spell', def:s});
    });
  });

  // Build legendary passive pool
  const passivePool = [];
  const currentPassives = activeBook() ? activeBook().passives : (player.passives||[]);
  elements.forEach(el => {
    (PASSIVE_CHOICES[el]||[]).forEach(p => {
      if (!p.legendary) return;
      if (currentPassives.includes(p.id)) return;
      passivePool.push({type:'passive', def:p});
    });
  });

  const combined = [...spellPool, ...passivePool];
  if (!combined.length) {
    log('✦ Gym reward: nothing new to grant (all legendaries owned).', 'win');
    return;
  }

  const pick = combined[Math.floor(Math.random() * combined.length)];
  if (pick.type === 'spell') {
    addSpellById(pick.def.id);
    log('✦ Legendary spell unlocked: ' + pick.def.emoji + ' ' + pick.def.name + '!', 'win');
  } else {
    addPassiveToBook(pick.def.id);
    log('✦ Legendary passive unlocked: ' + pick.def.emoji + ' ' + pick.def.title + '!', 'win');
  }
}

function showBattleRewardScreen(isGym, isSpellBattle, isRival) {
  _currentRewardIsGym = isGym;
  const badge = document.getElementById('br-badge');
  const title = document.getElementById('br-title');
  const sub = document.getElementById('br-sub');

  const rewardType = isGym ? 'gym'
                   : isRival ? 'rival'
                   : getZoneRewardType(zoneBattleCount, currentGymIdx);

  if (badge) badge.textContent = isGym ? 'Gym Clear' : isRival ? 'Rival Defeated' : 'Battle ' + battleNumber;

  if (rewardType === 'gym') { _doGymRewardFlow(); return; }
  if (rewardType === 'rival') { showPassiveChoiceScreen('rival'); return; }

  if (rewardType === 'primary_spell') {
    if (title) title.textContent = '✦ Starting Spell ✦';
    if (sub) sub.textContent = 'Choose your primary spell.';
    showSpellChoiceScreen(battleNumber, 'primary');
    return;
  }
  if (rewardType === 'secondary_spell') {
    if (title) title.textContent = '✦ Spell Reward ✦';
    if (sub) sub.textContent = 'Choose a spell to add to your spellbook.';
    showSpellChoiceScreen(battleNumber, 'secondary');
    return;
  }
  if (rewardType === 'minor') {
    if (title) title.textContent = '✦ Minor Upgrade ✦';
    if (sub) sub.textContent = 'Choose a stat upgrade.';
    _currentRewardTier = 'minor';
    _renderUpgradeChoices('minor');
    showScreen('battle-reward-screen');
    return;
  }
  if (rewardType === 'major') {
    if (title) title.textContent = '✦ Major Upgrade ✦';
    if (sub) sub.textContent = 'Choose your reward.';
    _currentRewardTier = 'major';
    _renderUpgradeChoices('major');
    showScreen('battle-reward-screen');
    return;
  }
  // fallback
  if (title) title.textContent = '✦ Upgrade ✦';
  if (sub) sub.textContent = 'Choose a reward.';
  _currentRewardTier = 'minor';
  _renderUpgradeChoices('minor');
  showScreen('battle-reward-screen');
}

function getZoneRewardType(battleSlot, gymIdx) {
  if (gymIdx === 0) {
    if (battleSlot === 1) return 'primary_spell';
    if (battleSlot === 4) return 'secondary_spell';
    if (battleSlot === 6) return 'rival';
    if (battleSlot === 7) return 'secondary_spell';
    if (battleSlot >= 8) return 'gym_available';
    return battleSlot % 2 === 0 ? 'minor' : 'major';
  } else {
    if (battleSlot === 3) return 'secondary_spell';
    if (battleSlot === 4) return 'rival';
    if (battleSlot >= 8) return 'gym_available';
    return battleSlot % 2 === 1 ? 'major' : 'minor';
  }
}

function buildMinorUpgradePool() {
  return [
    { label:'+5 Attack Power', emoji:'⚔️', tag:'Minor Upgrade', desc:'Permanently gain +5 Attack Power.',
      apply(){ player.attackPower += 5; } },
    { label:'+5 Effect Power', emoji:'✦', tag:'Minor Upgrade', desc:'Permanently gain +5 Effect Power.',
      apply(){ player.effectPower += 5; } },
    { label:'+5 Defense', emoji:'🛡️', tag:'Minor Upgrade', desc:'Permanently gain +5 Defense.',
      apply(){ player.defense += 5; } },
    { label:'+15 Max HP', emoji:'❤️', tag:'Minor Upgrade', desc:'Permanently increase max HP by 15.',
      apply(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+15; player.hp=Math.min(maxHPFor('player'),player.hp+15); } },
    { label:'+40 Gold', emoji:'💰', tag:'Minor Upgrade', desc:'Gain 40 gold.',
      apply(){ player.gold += 40; } },
    { label:'Heal 30%', emoji:'💚', tag:'Minor Upgrade', desc:'Restore 30% of your max HP.',
      apply(){ applyHeal('player', Math.floor(maxHPFor('player')*0.30), '✦ Minor Heal'); } },
  ];
}

function buildMajorUpgradePool() {
  return [
    { label:'Extra Action', emoji:'⚡', tag:'Major Upgrade', desc:'Permanently gain +1 action per turn.',
      apply(){ player.bonusActions = (player.bonusActions||0) + 1; log('⚡ Extra action per turn!','win'); } },
    { label:'Extra Life', emoji:'❤️', tag:'Major Upgrade', desc:'Gain one extra life — survive a killing blow.',
      apply(){ player.revives = (player.revives||0) + 1; log('❤ Extra life gained!','win'); } },
    { label:'Extra Spell Slot', emoji:'📖', tag:'Major Upgrade', desc:'+1 spell slot in your active spellbook.',
      apply(){ const b=activeBook(); if(b){ b.spellSlots++; log('📖 Spell slot added!','win'); } } },
    { label:'Reroll Token', emoji:'🎲', tag:'Major Upgrade', desc:'Gain 1 reroll — re-draw any future reward screen.',
      apply(){ player._rerolls = (player._rerolls||0) + 1; log('🎲 Reroll token!','win'); } },
    { label:'+20 Max HP', emoji:'💪', tag:'Major Upgrade', desc:'Permanently gain +20 max HP.',
      apply(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+20; player.hp=Math.min(maxHPFor('player'),player.hp+20); } },
    { label:'Full Heal', emoji:'✨', tag:'Major Upgrade', desc:'Fully restore HP.',
      apply(){ applyHeal('player', maxHPFor('player'), '✨ Major Heal'); } },
  ];
}

function _renderUpgradeChoices(tier) {
  const cont = document.getElementById('br-choices');
  if (!cont) return;
  cont.innerHTML = '';
  const pool = tier === 'major' ? buildMajorUpgradePool() : buildMinorUpgradePool();
  const chosen = pickRandom(pool, Math.min(3, pool.length));
  chosen.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'prog-choice-btn';
    btn.innerHTML = `<div class="pc-tag">${opt.tag}</div><div class="pc-name">${opt.emoji} ${opt.label}</div><div class="pc-desc">${opt.desc}</div>`;
    btn.onclick = () => { opt.apply(); updateStatsUI(); showMap(); };
    cont.appendChild(btn);
  });
  const rerollBtn = document.getElementById('br-reroll-btn');
  const rerollCount = document.getElementById('br-reroll-count');
  if (rerollBtn) {
    rerollBtn.style.display = (player._rerolls||0) > 0 ? 'inline-block' : 'none';
    if (rerollCount) rerollCount.textContent = player._rerolls||0;
  }
}

function _doGymRewardFlow() {
  const hasAnyUnlocked = player.unlockedElements && player.unlockedElements.length > 0;
  const allElements = Object.keys(STARTER_SPELL);
  const locked = allElements.filter(e => e !== playerElement && !player.unlockedElements.includes(e));
  if (!hasAnyUnlocked || locked.length > 0) {
    showElementUnlockScreen('gym');
  } else {
    grantRandomLegendary();
    showMap();
  }
}

function _renderStatRewardChoices() { _renderUpgradeChoices(_currentRewardTier || 'minor'); }

function rerollBattleReward() {
  if ((player._rerolls||0) <= 0) return;
  player._rerolls--;
  _renderStatRewardChoices();
}

// ── SPELL CHOICE (now standalone, called from reward flow) ──
function processNextLevelUp(){
  if(pendingLevelUps.length === 0){ showMap(); return; }
  const ev = pendingLevelUps.shift();
  if(ev.type === 'gym_legendary'){
    grantRandomLegendary();
    showMap();
  } else if(ev.type === 'spellchoice'){
    showSpellChoiceScreen(ev.level, ev.tier || 'secondary', ev.forElement || null);
  } else if(ev.type === 'passivechoice'){
    showPassiveChoiceScreen(ev.level);
  } else {
    showMap();
  }
}
function showLevelUp(){ showMap(); }
function closeLevelUp(){ showMap(); }

// ── SKILL POINT ──
// showSkillPointScreen removed — replaced by battle reward system

function buildSkillPointPool(){
  const opts=[
    { label:'+10 Max HP', desc:'Permanently increase your max HP by 10.',
      apply(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+10; player.hp=Math.min(maxHPFor('player'),player.hp+10); }},
    { label:'+50 HP Heal', desc:'Immediately restore 50 HP.',
      apply(){ applyHeal('player',50,'✦ Skill Point Heal'); }},
    { label:'+3 Attack Power', desc:'Permanently gain +3 Attack Power — scales hit damage.',
      apply(){ player.attackPower+=3; }},
    { label:'+3 Effect Power', desc:'Permanently gain +3 Effect Power — scales status potency.',
      apply(){ player.effectPower+=3; }},
    { label:'+3 Defense', desc:'Permanently gain +3 Defense — scales armor, healing, and dodge.',
      apply(){ player.defense+=3; }},
  ];
  // Add one entry per owned spell for upgrading
  player.spellbook.forEach((s,idx)=>{
    const rank=Math.round(((s.dmgMult||1.0)-1.0)/0.10);
    opts.push({ label:`Upgrade: ${s.emoji} ${s.name} (rank ${rank})`,
      desc:`+10% damage multiplier. Current: ${Math.round((s.dmgMult||1.0)*100)}%`,
      apply(){ player.spellbook[idx].dmgMult=Math.round(((s.dmgMult||1.0)+0.10)*100)/100; }});
  });
  // Basic spell upgrade
  const brank=player.basicUpgrade||0;
  opts.push({ label:`Upgrade: ⚔ Basic Spell (rank ${brank})`,
    desc:'+10% damage multiplier to Basic Spell.',
    apply(){ player.basicDmgMult=Math.round(((player.basicDmgMult||1.0)+0.10)*100)/100; }});
  return opts;
}

// ── SPELL CHOICE ──
function showSpellChoiceScreen(level, tier='secondary', forElement=null){
  const tierLabel = tier==='primary'?'Primary Spell' : tier==='legendary'?'✦ Legendary Spell' : 'Spell';
  document.getElementById("sc-level-badge").textContent = typeof level === 'number' ? 'Battle '+level : String(level);
  document.querySelector('#spellchoice-screen .prog-title').textContent =
    tier==='legendary' ? '✦ Legendary Spell ✦' : '✦ New Spell ✦';
  document.querySelector('#spellchoice-screen .prog-sub').textContent =
    tier==='primary'   ? 'Choose a primary spell to start your journey.' :
    tier==='legendary' ? 'Choose a legendary (tertiary) spell.' :
                          'Choose a spell to add to your arsenal.';

  const cont=document.getElementById("sc-choices"); cont.innerHTML="";
  const pool=buildSpellChoicePool(tier, forElement);
  if(pool.length===0){ processNextLevelUp(); return; }
  const chosen=pickRandom(pool, Math.min(3, pool.length));
  chosen.forEach(opt=>{
    const isAOE=opt.desc&&opt.desc.toLowerCase().includes('all');
    const el=opt.element||'Neutral';
    const btn=document.createElement("button");
    btn.className=`prog-choice-btn ${el==='Neutral'?'neutral-btn':'spell-btn-el'}`;
    btn.innerHTML=`<div class="pc-tag">${tierLabel} · ${el}${isAOE?' · AOE':''}</div><div class="pc-name">${opt.emoji} ${opt.name}</div><div class="pc-desc">${opt.desc} · CD:${opt.baseCooldown}</div>`;
    btn.onclick=()=>{ addSpellById(opt.id); processNextLevelUp(); };
    cont.appendChild(btn);
  });
  showScreen("spellchoice-screen");
}

function buildSpellChoicePool(tier='secondary', forElement=null){
  const owned = new Set(player.spellbook.map(s=>s.id));
  const elements = forElement ? [forElement] : [playerElement, ...player.unlockedElements];
  const pool = [];

  // Build owned tag set for prerequisite checking
  const ownedTagSet = new Set();
  player.spellbook.forEach(s => {
    const def = SPELL_CATALOGUE[s.id];
    if(def && def.tags) def.tags.forEach(t => ownedTagSet.add(t));
  });

  elements.forEach(el=>{
    Object.values(SPELL_CATALOGUE).forEach(s=>{
      if(s.element !== el) return;
      if(owned.has(s.id)) return;
      if(s.isStarter) return;
      if((s.tier || 'secondary') !== tier) return;
      if(s.requiresTag && !ownedTagSet.has(s.requiresTag)) return;
      pool.push(s);
    });
  });

  if(tier === 'secondary'){
    NEUTRAL_SPELL_IDS.forEach(id=>{
      if(!owned.has(id)) pool.push(SPELL_CATALOGUE[id]);
    });
  }
  return pool;
}

// ── ELEMENT UNLOCK (level 15) ──
function showElementUnlockScreen(level){
  document.getElementById("eu-level-badge").textContent=`Level ${level} — Choose Second Element`;
  const c=document.getElementById("eu-element-choices"); c.innerHTML="";
  const allElements=Object.keys(STARTER_SPELL).filter(e=>e!==playerElement);
  const chosen=pickRandom(allElements,3);
  chosen.forEach(el=>{
    const starterSpell=SPELL_CATALOGUE[STARTER_SPELL[el]];
    const elInfo={Fire:'🔥',Water:'💧',Ice:'❄️',Lightning:'⚡',Earth:'🪨',Nature:'🌿',Plasma:'🔮',Air:'🌀'};
    const btn=document.createElement("button");
    btn.className="prog-choice-btn spell-btn-el";
    btn.innerHTML=`<div class="pc-tag">Second Element</div>
      <div class="pc-name">${elInfo[el]||'✦'} ${el}</div>
      <div class="pc-desc">Unlocks ${el} spells and passives. Starter: ${starterSpell?starterSpell.emoji+' '+starterSpell.name:'—'}</div>`;
    btn.onclick=()=>{
      player.unlockedElements.push(el);
      addSpellById(STARTER_SPELL[el]);
      // Queue: spell choice in new element, then legendary
      pendingLevelUps = [
        { type:'spellchoice', level:'gym', tier:'secondary', forElement: el },
        { type:'gym_legendary' }
      ];
      processNextLevelUp();
    };
    c.appendChild(btn);
  });
  showScreen("elementunlock-screen");
}

// ── PASSIVE CHOICE ──
function showPassiveChoiceScreen(level){
  document.getElementById("pc-level-badge").textContent=`Level ${level} — New Passive`;
  const c=document.getElementById("pc-choices"); c.innerHTML="";
  const pool=buildPassiveChoicePool();
  if(pool.length===0){
    processNextLevelUp(); return;
  }
  const chosen=pickRandom(pool,Math.min(3,pool.length));
  chosen.forEach(p=>{
    const btn=document.createElement("button");
    btn.className="prog-choice-btn passive-btn";
    btn.innerHTML=`<div class="pc-tag">${p.element||''} Passive</div><div class="pc-name">${p.emoji} ${p.title}</div><div class="pc-desc">${p.desc}</div>`;
    btn.onclick=()=>{ addPassiveToBook(p.id); processNextLevelUp(); };
    c.appendChild(btn);
  });
  showScreen("passivechoice-screen");
}

function buildPassiveChoicePool(){
  const elements=[playerElement, ...player.unlockedElements];
  const pool=[];
  elements.forEach(el=>{
    (PASSIVE_CHOICES[el]||[]).forEach(p=>{
      if(p.legendary) return;          // legendaries not offered through normal passive picks
      if(!player.passives.includes(p.id)) pool.push({...p, element:el});
    });
  });
  return pool;
}

// Utility: pick n random distinct items
function pickRandom(arr, n){
  const copy=[...arr];
  const result=[];
  while(result.length<n && copy.length>0){
    const i=Math.floor(Math.random()*copy.length);
    result.push(copy.splice(i,1)[0]);
  }
  return result;
}

function openSpellUpgrade(){ showSkillPointScreen(player.level); } // legacy compat



// ===== main.js =====
// ─── MAIN / SCREEN NAVIGATION ────────────────────────────────────────────────

// activeSaveSlot and sandboxMode declared in constants.js (runs first, no TDZ)

// activeSaveSlot declared here — artifacts.js getMeta/saveMeta read it lazily at call time
function _slotKey(slot) { return 'elemental_save_v1_slot' + slot; }

function loadSlot(slot) {
  try {
    const raw = localStorage.getItem(_slotKey(slot));
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function saveSlot(slot, data) {
  try { localStorage.setItem(_slotKey(slot), JSON.stringify(data)); } catch(e) {}
}

function deleteSlot(slot) {
  try { localStorage.removeItem(_slotKey(slot)); } catch(e) {}
}

function getActiveSlotData() { return loadSlot(activeSaveSlot) || {}; }

function patchActiveSlot(patch) {
  const data = getActiveSlotData();
  Object.assign(data, patch);
  saveSlot(activeSaveSlot, data);
}

// activeSaveSlot declared here — artifacts.js getMeta/saveMeta read it lazily at call time

// ── SAVE SELECT SCREEN ────────────────────────────────────────────────────────
function showSaveSelect() {
  const container = document.getElementById('save-slots');
  container.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const data = loadSlot(i);
    const meta = (() => {
      try {
        const raw = localStorage.getItem('elemental_meta_v1_slot' + i);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    })();

    const card = document.createElement('div');
    const hasData = !!(data && data.playerName);
    card.className = 'save-slot-card ' + (hasData ? 'has-data' : 'empty');

    if (hasData) {
      const runs   = meta ? (meta.totalRuns  || 0) : 0;
      const best   = meta ? (meta.bestLevel  || 0) : 0;
      const gyms   = meta ? (meta.gymsBeaten || 0) : 0;
      card.innerHTML = `
        <div class="save-slot-left">
          <div class="save-slot-name">${data.playerName}</div>
          <div class="save-slot-stats">Runs: ${runs} · Best Lv.${best} · Gyms: ${gyms}</div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;">
          <div class="save-slot-right has-data">SLOT ${i+1}</div>
          <div class="save-slot-delete" onclick="event.stopPropagation();confirmDeleteSlot(${i})" title="Delete save">✕</div>
        </div>
        <div style="margin-top:.5rem;border-top:1px solid #1a1208;padding-top:.45rem;display:flex;gap:.4rem;">
          <button onclick="event.stopPropagation();selectSaveSlot(${i})" style="flex:1;background:#0e0c06;border:1px solid #2a1e0e;color:#c8a060;font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.08em;padding:.3rem .4rem;border-radius:4px;cursor:pointer;">⚔ Play</button>
          <button onclick="event.stopPropagation();selectSaveSlotSandbox(${i})" style="flex:1;background:#0a0614;border:1px solid #3a1a5a;color:#c080ff;font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.08em;padding:.3rem .4rem;border-radius:4px;cursor:pointer;">🔬 Sandbox</button>
        </div>`;
    } else {
      card.innerHTML = `
        <div class="save-slot-left">
          <div class="save-slot-name" style="color:#3a2a10;">Empty Slot</div>
          <div class="save-slot-stats">— no data —</div>
        </div>
        <div class="save-slot-right">SLOT ${i+1}</div>`;
    }

    card.onclick = () => selectSaveSlot(i);
    container.appendChild(card);
  }

  showScreen('save-select-screen');
}

function confirmDeleteSlot(slot) {
  if (!confirm(`Delete Save ${slot+1}? This cannot be undone.`)) return;
  deleteSlot(slot);
  localStorage.removeItem('elemental_meta_v1_slot' + slot);
  if (window._metaBySlot) delete window._metaBySlot[slot];
  showSaveSelect();
}

function selectSaveSlot(slot) {
  activeSaveSlot = slot;
  if (!window._metaBySlot) window._metaBySlot = {};
  window._metaBySlot[slot] = null; // force reload on next getMeta()
  const data = loadSlot(slot);
  if (data && data.playerName) {
    // Existing save — go straight to lobby
    playerName = data.playerName;
    sandboxMode = false;
    showBetweenRuns();
  } else {
    // New slot — need name entry
    showHub();
  }
}

function selectSaveSlotSandbox(slot) {
  activeSaveSlot = slot;
  if (!window._metaBySlot) window._metaBySlot = {};
  window._metaBySlot[slot] = null;
  const data = loadSlot(slot);
  if (data && data.playerName) {
    playerName = data.playerName;
    sandboxMode = true;
    showBetweenRuns();
  } else {
    showHub(); // new slot — still need name first
  }
}

// ── HUB SCREEN ───────────────────────────────────────────────────────────────
function showHub() {
  const slotData = getActiveSlotData();
  const meta     = getMeta();
  const hasSave  = !!(slotData.playerName);

  document.getElementById('hub-slot-label').textContent = `Save File ${activeSaveSlot + 1}`;
  document.getElementById('hub-title').textContent = hasSave
    ? `Welcome back, ${slotData.playerName}`
    : 'New Adventure';

  // Show name input only for new saves
  const nameInput = document.getElementById('hub-name-input');
  const nameError = document.getElementById('hub-error');
  nameInput.value = slotData.playerName || '';
  nameInput.style.display = hasSave ? 'none' : '';
  nameError.style.display  = hasSave ? 'none' : '';

  // Stats
  const statsRow = document.getElementById('hub-stats-row');
  if (meta.totalRuns > 0) {
    statsRow.innerHTML = `Runs: <span>${meta.totalRuns}</span> &nbsp;·&nbsp; Best Level: <span>${meta.bestLevel||0}</span> &nbsp;·&nbsp; Gyms: <span>${meta.gymsBeaten||0}</span>`;
  } else {
    statsRow.innerHTML = hasSave ? `<span style="color:#3a2a10;">No runs yet — go fight!</span>` : `<span style="color:#3a2a10;">No runs yet</span>`;
  }

  showScreen('hub-screen');
}

function _hubGetName() {
  const val = document.getElementById('hub-name-input').value.trim();
  document.getElementById('hub-error').textContent = '';
  if (!val) {
    document.getElementById('hub-error').textContent = 'Please enter a name.';
    return null;
  }
  // Save name to slot
  patchActiveSlot({ playerName: val });
  playerName = val;
  return val;
}

function hubPlay() {
  // Only called for new saves needing name entry
  if (!_hubGetName()) return;
  sandboxMode = false;
  showBetweenRuns();
}

// ── BETWEEN RUNS (lobby map) ──────────────────────────────────────────────────
function showBetweenRuns() {
  stopLobbyMap();
  showScreen('between-runs-screen');
  const slotData = getActiveSlotData ? getActiveSlotData() : {};
  if (slotData.wizardBuild && typeof _wizBuild !== 'undefined') {
    _wizBuild = Object.assign({...WIZ_DEFAULTS}, slotData.wizardBuild);
  }
  setTimeout(showBetweenRuns_map, 50);
}

function lobbyStartRun() {
  stopLobbyMap();
  const slotData = getActiveSlotData();
  if (slotData.wizardBuild && typeof _wizBuild !== 'undefined') {
    _wizBuild = Object.assign({...WIZ_DEFAULTS}, slotData.wizardBuild);
  }
  playerCharId = _wizBuild.archetype || slotData.savedCharId || 'arcanist';
  const welcomeEl = document.getElementById('welcome-msg');
  if (welcomeEl) welcomeEl.textContent = `${playerName}, choose your element`;
  showElementScreen();
}

function renderBrunLastRun() {
  const el = document.getElementById('brun-last-run');
  if (!el) return;
  const meta = getMeta();
  const phosEarned = _lastRunPhos || 0;
  // No run in progress yet — show lobby welcome
  if (!playerElement) {
    el.innerHTML = '<div class="brun-run-title" style="color:#c8a060;font-size:1rem;">&#9876; Wizard&#39;s League</div><div style="color:#555;font-size:.7rem;margin-top:.3rem;">Select New Run to begin your journey</div>';
    return;
  }
  const zoneStr = _runZoneReached && _runZoneReached !== playerElement ? ` → ${_runZoneReached} Zone` : '';
  el.innerHTML = `
    <div class="brun-run-title">${playerEmoji} ${playerElement}${zoneStr} — Run Ended</div>
    <div class="brun-run-grid">
      <div class="brun-run-stat"><div class="brun-run-label">Level</div><div class="brun-run-val">${player.level}</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">Rooms</div><div class="brun-run-val">${_runRoomsCompleted}</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">⚔ Dealt</div><div class="brun-run-val" style="color:#e84a4a">${_runDmgDealt}</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">🛡 Taken</div><div class="brun-run-val" style="color:#4a8aaa">${_runDmgTaken}</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">Gold</div><div class="brun-run-val" style="color:#c8a830">${player.gold}g</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">Phos</div><div class="brun-run-val" style="color:#a080ff">+${phosEarned} ✦</div></div>
    </div>
    <div style="margin-top:.5rem;font-size:.65rem;color:#5a4a80;">Total Phos: <span style="color:#a080ff;font-family:'Cinzel',serif;">${meta.phos||0} ✦</span></div>`;
}

let _lastRunPhos = 0; // set in showGameOver path

function switchBrunTab(tab, btnEl) {
  document.querySelectorAll('.brun-tab').forEach(b => b.classList.remove('active'));
  const btn = btnEl || document.querySelector(`.brun-tab[onclick*="${tab}"]`);
  if (btn) btn.classList.add('active');

  const content = document.getElementById('brun-tab-content');
  if (!content) return;
  const meta = getMeta();

  if (tab === 'history') {
    const history = meta.runHistory || [];
    if (!history.length) {
      content.innerHTML = '<div class="brun-empty">No runs recorded yet.</div>';
      return;
    }
    content.innerHTML = history.map(r => `
      <div class="brun-hist-row">
        <div class="brun-hist-el">${r.emoji||'⚔'} ${r.element||'?'} <span style="color:#4a6a8a;font-size:.6rem;margin-left:.3rem;">${r.zone && r.zone !== r.element ? '→ '+r.zone+' Zone' : ''}</span></div>
        <div class="brun-hist-stats">
          <span>Lv.${r.level||'?'}</span>
          <span>${r.battles||0} battles</span>
          <span>${r.rooms||r.battles||0} rooms</span>
          <span style="color:#c8a830">${r.gold||0}g</span>
          <span style="color:#a080ff">${r.phos||0}✦</span>
        </div>
        <div class="brun-hist-details" style="display:flex;gap:.8rem;font-size:.6rem;color:#555;margin-top:.2rem;">
          <span>⚔ ${r.dmgDealt||0} dealt</span>
          <span>🛡 ${r.dmgTaken||0} taken</span>
          <span>📚 ${r.spells||0} spells</span>
        </div>
        <div class="brun-hist-date">${r.date||''}</div>
      </div>`).join('');

  } else if (tab === 'artifacts') {
    if (!meta.artifacts || !meta.artifacts.length) {
      content.innerHTML = '<div class="brun-empty">No artifacts yet — defeat a Gym Leader!</div>';
      return;
    }
    const rows = meta.artifacts.map(a => {
      const def = (typeof ARTIFACT_CATALOGUE !== 'undefined') ? ARTIFACT_CATALOGUE[a.id] : null;
      if (!def) return '';
      const stars  = a.star > 0 ? '★'.repeat(a.star) : '—';
      const sColor = ['#888','#c8a030','#e8d060','#00ccff'][Math.min(a.star||0, 3)];
      const prog   = a.star < 3 ? `${a.roomsUsed||0}/25` : 'MAX';
      return `<div class="brun-art-row">
        <div>
          <div class="brun-art-name">${def.emoji} ${def.name} <span class="brun-art-star" style="color:${sColor}">${stars}</span></div>
          <div class="brun-art-desc">${def.desc[a.star||0]} · <span style="color:#4a4a4a">${prog} rooms</span></div>
        </div>
      </div>`;
    }).join('');
    content.innerHTML = rows || '<div class="brun-empty">No artifacts.</div>';

  } else if (tab === 'talents') {
    renderTalentTab(content, meta);
  } else if (tab === 'books') {
    renderBookUpgradesTab(content, meta);
  } else if (tab === 'wizards') {
    _renderWizardUnlockTab(content, meta);
  } else if (tab === 'skins_old_unused') {
  }
}

// ── WIZARD UNLOCK TAB ─────────────────────────────────────────────────────────
// Unlock conditions: Battlemage always available. 
// Hexblade: complete 3 runs. Arcanist: complete 6 runs or beat 2 gyms.
function _getWizardUnlockStatus(meta) {
  const runs    = meta.totalRuns  || 0;
  const gyms    = meta.gymsBeaten || 0;
  return {
    battlemage: { unlocked: true,         condition: 'Default wizard — always available' },
    hexblade:   { unlocked: runs >= 3,    condition: `Complete 3 runs (${runs}/3)` },
    arcanist:   { unlocked: runs >= 6 || gyms >= 2, condition: `Complete 6 runs or defeat 2 Gym Leaders (${runs} runs, ${gyms} gyms)` },
  };
}

function _renderWizardUnlockTab(content, meta) {
  const status = _getWizardUnlockStatus(meta);
  const slotData = getActiveSlotData();
  const savedChar = slotData.savedCharId || playerCharId || '';

  const cards = CHARACTER_ROSTER.map(ch => {
    const s = status[ch.id];
    const locked = !s.unlocked;
    const active = savedChar === ch.id;
    const ps = CHAR_PORTRAIT_STYLES[ch.id] || CHAR_PORTRAIT_STYLES.arcanist;

    return `<div style="
      background:${locked ? '#0a0805' : (active ? 'linear-gradient(175deg,#1a1205,#0e0c06)' : 'linear-gradient(175deg,#14100a,#0c0a06)')};
      border:1px solid ${active ? '#8a6a20' : (locked ? '#1a1208' : '#2a1e0e')};
      border-radius:8px;padding:.8rem;width:200px;flex-shrink:0;
      box-shadow:${active ? '0 0 12px rgba(200,160,40,.15)' : 'none'};
      opacity:${locked ? '0.5' : '1'};
      display:flex;flex-direction:column;align-items:center;gap:.4rem;
      ">
      <div style="font-family:'Cinzel',serif;font-size:.85rem;color:${active?'#e8c060':(locked?'#3a2a10':'#c8a060')};letter-spacing:.08em;">
        ${locked ? '🔒 ' : ''}${ch.name}
      </div>
      <div style="font-size:.56rem;color:#4a3820;letter-spacing:.12em;text-transform:uppercase;font-family:'Cinzel',serif;">
        ${ch.title}
      </div>
      <div style="font-size:.58rem;color:${locked?'#3a2a10':'#705840'};text-align:center;line-height:1.5;padding:0 .3rem;">
        ${locked ? s.condition : ch.desc}
      </div>
      ${active ? '<div style="font-size:.5rem;color:#8a6a20;letter-spacing:.12em;font-family:Cinzel,serif;text-transform:uppercase;">✦ Selected ✦</div>' : ''}
      ${!locked && !active ? `<button onclick="_lobbySelectWizard('${ch.id}')" style="
        margin-top:.2rem;background:#1a1205;border:1px solid #3a2810;color:#c8a060;
        font-family:'Cinzel',serif;font-size:.55rem;padding:.25rem .7rem;border-radius:3px;
        cursor:pointer;letter-spacing:.08em;
        ">Select</button>` : ''}
      ${active ? `<button onclick="_lobbySelectWizard('')" style="
        margin-top:.2rem;background:#0e0c06;border:1px solid #2a1e08;color:#5a4820;
        font-family:'Cinzel',serif;font-size:.55rem;padding:.25rem .7rem;border-radius:3px;
        cursor:pointer;letter-spacing:.08em;
        ">Deselect</button>` : ''}
    </div>`;
  }).join('');

  content.innerHTML = `
    <div style="padding:.6rem .2rem .4rem;">
      <div style="font-size:.62rem;color:#4a3820;text-align:center;margin-bottom:.8rem;line-height:1.5;">
        Your chosen wizard carries over into every run. Unlock new wizards by completing runs.
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        ${cards}
      </div>
    </div>`;
}

function _lobbySelectWizard(charId) {
  playerCharId = charId;
  patchActiveSlot({ savedCharId: charId });
  // Re-render tab
  const content = document.getElementById('brun-tab-content');
  const meta = getMeta();
  if (content) _renderWizardUnlockTab(content, meta);
}


function renderBookUpgradesTab(content, meta) {
  const phos = meta.phos || 0;
  const bookUpgrades = meta.bookUpgrades || {};

  // Upgrade definitions: { key, label, desc, cost, maxLevel, stat }
  const BOOK_UPGRADES = [
    { key:'spell_slots',   label:'Extra Spell Slot',   desc:'Adds +1 spell slot to your starting book.',   cost: lvl => (lvl+1)*8,  maxLevel:4, stat:'spellSlots'   },
    { key:'passive_slots', label:'Extra Passive Slot',  desc:'Adds +1 passive slot to your starting book.', cost: lvl => (lvl+1)*10, maxLevel:3, stat:'passiveSlots' },
  ];

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem;">
    <div style="font-family:'Cinzel',serif;font-size:.78rem;color:#c8a060;">📖 Spellbook Upgrades</div>
    <div style="font-size:.72rem;color:#a080ff;">${phos} ✦ Phos</div>
  </div>
  <div style="font-size:.62rem;color:#4a4a60;margin-bottom:.8rem;line-height:1.5;">Permanent upgrades to your starting spellbook. Applied at the start of every run.</div>`;

  BOOK_UPGRADES.forEach(upg => {
    const lvl     = bookUpgrades[upg.key] || 0;
    const maxed   = lvl >= upg.maxLevel;
    const cost    = maxed ? 0 : upg.cost(lvl);
    const canAfford = phos >= cost;
    html += `<div style="background:#0f0d0b;border:1px solid #2a2020;border-radius:6px;padding:.7rem .9rem;margin-bottom:.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;">
        <div style="font-family:'Cinzel',serif;font-size:.75rem;color:#c8a060;">${upg.label}</div>
        <div style="font-size:.65rem;color:#6a5a30;">${lvl} / ${upg.maxLevel}</div>
      </div>
      <div style="font-size:.63rem;color:#666;margin-bottom:.5rem;">${upg.desc}</div>
      ${maxed
        ? '<div style="font-size:.62rem;color:#4a8a4a;letter-spacing:.08em;">✓ MAXED</div>'
        : `<button onclick="purchaseBookUpgrade('${upg.key}')" ${canAfford?'':'disabled'}
             style="width:100%;background:${canAfford?'#1a1a0a':'#0a0a0a'};border:1px solid ${canAfford?'#6a5a20':'#2a2020'};
             color:${canAfford?'#c8a060':'#3a3020'};padding:.3rem;font-family:'Cinzel',serif;font-size:.62rem;
             letter-spacing:.08em;cursor:${canAfford?'pointer':'not-allowed'};border-radius:4px;text-transform:uppercase;">
             Upgrade — ${cost} ✦
           </button>`}
    </div>`;
  });

  content.innerHTML = html;
}

function purchaseBookUpgrade(key) {
  const meta = getMeta();
  const COSTS = { spell_slots: lvl => (lvl+1)*8, passive_slots: lvl => (lvl+1)*10 };
  const MAX   = { spell_slots: 4, passive_slots: 3 };
  if (!meta.bookUpgrades) meta.bookUpgrades = {};
  const lvl  = meta.bookUpgrades[key] || 0;
  if (lvl >= MAX[key]) return;
  const cost = COSTS[key](lvl);
  if ((meta.phos||0) < cost) return;
  meta.phos -= cost;
  meta.bookUpgrades[key] = lvl + 1;
  saveMeta();
  // Re-render
  switchBrunTab('books', document.querySelector('.brun-tab[onclick*="books"]'));
}

// Apply book upgrades at run start (called in initSpellbooksForRun)
function applyBookUpgrades(book) {
  const meta = getMeta();
  const upg  = meta.bookUpgrades || {};
  book.spellSlots   = BOOK_SPELL_SLOTS_BASE   + (upg.spell_slots   || 0);
  book.passiveSlots = BOOK_PASSIVE_SLOTS_BASE + (upg.passive_slots || 0);
}

function renderTalentTab(content, meta) {
  const phos = meta.phos || 0;
  const talents = meta.talents || {};

  let html = `<div class="talent-phos-bar">
    <span>✦ Phos Available</span>
    <span class="talent-phos-val" id="talent-phos-display">${phos}</span>
  </div>`;

  // Section picker buttons
  const sections = Object.keys(TALENT_TREE);
  html += `<div class="talent-section-tabs" id="talent-section-tabs">`;
  sections.forEach((key, i) => {
    html += `<button class="talent-sec-btn${i===0?' active':''}" onclick="switchTalentSection('${key}',this)">${TALENT_TREE[key].label}</button>`;
  });
  html += `</div>`;
  html += `<div id="talent-nodes-area"></div>`;

  content.innerHTML = html;
  renderTalentSection(sections[0], meta);
}

function switchTalentSection(key, btnEl) {
  document.querySelectorAll('.talent-sec-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderTalentSection(key, getMeta());
}

function renderTalentSection(key, meta) {
  const area = document.getElementById('talent-nodes-area');
  if (!area) return;
  const section = TALENT_TREE[key];
  if (!section) return;
  const talents = meta.talents || {};
  const phos    = meta.phos || 0;

  area.innerHTML = section.nodes.map(node => {
    const current  = talents[node.id] || 0;
    const maxed    = current >= node.maxLevel;
    const nextLvl  = current + 1;
    const cost     = maxed ? 0 : node.cost(nextLvl);
    const canAfford= phos >= cost;
    const barPct   = (current / node.maxLevel) * 100;

    return `<div class="talent-node ${maxed?'maxed':''} ${!maxed&&canAfford?'affordable':''}">
      <div class="talent-node-top">
        <span class="talent-node-emoji">${node.emoji}</span>
        <span class="talent-node-name">${node.name}</span>
        <span class="talent-node-level">${current}/${node.maxLevel}</span>
      </div>
      <div class="talent-node-desc">${node.desc}</div>
      <div class="talent-node-bar"><div class="talent-node-fill" style="width:${barPct}%"></div></div>
      ${maxed
        ? `<div class="talent-node-maxed">MAX</div>`
        : `<button class="talent-buy-btn ${canAfford?'can-afford':''}"
             onclick="buyTalent('${node.id}')"
             ${canAfford?'':'disabled'}>
             Upgrade · ${cost}✦
           </button>`
      }
    </div>`;
  }).join('');
}

function buyTalent(nodeId) {
  const ok = purchaseTalent(nodeId);
  if (!ok) return;
  const meta = getMeta();
  // refresh phos display
  const phosEl = document.getElementById('talent-phos-display');
  if (phosEl) phosEl.textContent = meta.phos || 0;
  // find which section this node is in and re-render
  for (const key of Object.keys(TALENT_TREE)) {
    if (TALENT_TREE[key].nodes.find(n => n.id === nodeId)) {
      renderTalentSection(key, meta);
      renderBrunLastRun(); // update phos total display
      break;
    }
  }
}

// ── ELEMENT SELECT ────────────────────────────────────────────────────────────
const ALL_ELEMENTS = [
  { el:'Fire',      emoji:'🔥', color:'#FF4500', mechanic:'Burn Stacks' },
  { el:'Water',     emoji:'💧', color:'#1E90FF', mechanic:'Heal · Cleanse · Reflect' },
  { el:'Ice',       emoji:'❄️', color:'#A0EFFF', mechanic:'Frost · Freeze · Execute' },
  { el:'Lightning', emoji:'⚡', color:'#FFD700', mechanic:'Shock · Burst · Overload' },
  { el:'Earth',     emoji:'🪨', color:'#8B6914', mechanic:'Stone · Block · Armor' },
  { el:'Nature',    emoji:'🌿', color:'#32CD32', mechanic:'Root · Summon · Overgrowth' },
  { el:'Plasma',    emoji:'🔮', color:'#DA70D6', mechanic:'Charge · Tank Hits · Unleash' },
  { el:'Air',       emoji:'🌀', color:'#B0E0E6', mechanic:'Speed · Multi-hit' },
];

function showElementScreen(){
  const pool   = [...ALL_ELEMENTS];
  const picked = sandboxMode ? pool : [];
  if (!sandboxMode) {
    while (picked.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(i, 1)[0]);
    }
  }

  const grid = document.getElementById('element-grid');
  grid.innerHTML = '';
  playerElement = ''; playerEmoji = ''; playerColor = '';
  document.getElementById('start-battle-btn').style.display = 'none';
  document.getElementById('selected-label').textContent = '';

  picked.forEach(def => {
    const card = document.createElement('div');
    card.className = 'element-card';
    card.id = 'card-' + def.el;
    card.innerHTML = `
      <div class="crack crack-1"></div><div class="crack crack-2"></div><div class="crack crack-3"></div>
      <span class="emoji">${def.emoji}</span>
      <span class="name" style="color:${def.color}">${def.el}</span>
      <span class="mechanic">${def.mechanic}</span>
    `;
    card.onclick = () => selectElement(def.el, def.emoji, def.color);
    grid.appendChild(card);
  });

  showScreen('element-screen');
}

function selectElement(el, emoji, color){
  playerElement = el; playerEmoji = emoji; playerColor = color;
  document.querySelectorAll('.element-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('card-' + el);
  if (card) card.classList.add('selected');
  document.getElementById('selected-label').textContent = `Selected: ${emoji} ${el}`;
  document.getElementById('start-battle-btn').style.display = 'block';
}

// Legacy shim — old calls to goToElementSelect still work
function goToElementSelect() { hubPlay(); }

function showPassiveScreen(element){
  const title   = document.getElementById('passive-screen-title');
  const sub     = document.getElementById('passive-screen-subtitle');
  const list    = document.getElementById('passive-choices-screen');
  const startBtn= document.getElementById('passive-start-btn');
  const pool    = (PASSIVE_CHOICES[element] || []).filter(p => !p.legendary);
  const choices = sandboxMode ? pool : pickRandom(pool, Math.min(2, pool.length));

  pendingStartPassive = null;
  startBtn.disabled = true;

  startBtn.onclick = () => {
    if (!pendingStartPassive) return;
    confirmStartPassive(pendingStartPassive);
  };

  title.textContent = `Choose a ${element} Passive`;
  sub.textContent   = 'Pick one to start your run. You can earn others later.';
  list.innerHTML    = '';

  if (!choices.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'opacity:.7;font-size:.9rem;';
    msg.textContent = 'No passives available.';
    list.appendChild(msg);
  }

  choices.forEach(ch => {
    const btn = document.createElement('button');
    btn.className    = 'choice-btn';
    btn.type         = 'button';
    btn.dataset.passiveId = ch.id;
    btn.innerHTML    = `<div class="choice-title">${ch.emoji} ${ch.title}</div><div class="choice-desc">${ch.desc}</div>`;
    btn.addEventListener('click', () => {
      pendingStartPassive = ch.id;
      list.querySelectorAll('button.choice-btn').forEach(b => {
        b.style.borderColor = '#2b2b36'; b.style.transform = '';
      });
      btn.style.borderColor = '#ffffff66';
      btn.style.transform   = 'translateY(-1px)';
      startBtn.disabled = false;
    });
    list.appendChild(btn);
  });

  showScreen('passive-screen');
}

function hasPassive(id)    { return (player.passives||[]).includes(id); }
function enemyHasPassive(id) {
  const e = combat.enemies[combat.activeEnemyIdx];
  return e ? e.passive === id : false;
}

function beginRun(){
  Object.assign(player, {
    hp:BASE_MAX_HP, level:1, xp:0,
    attackPower:0, effectPower:0, defense:0,
    skillPoints:0, gold:0, inventory:[], spellbook:[],
    passives:[], startPassive:null,
    unlockedElements:[], baseMaxHPBonus:0, spellbooks:[], activeBookIdx:0,
    revives:0, bonusActions:0,
    basicUpgrade:0, basicDmgMult:1.0,
    _xpBonus:0, _hasteStart:false, _blockStart:0, _extraStartSpell:false, _rerolls:0,
    _rhythmStar:-1, _quickHandsStar:-1, _gritHealOnRevive:0, _healBonus:0,
    basicDmgFlat:0, _bannerStar:-1,
    _talentReviveBonus:0, _goldBonus:0,
    _talentBurnDmg:0, _talentBurnStart:0, _talentFireDmgMult:1.0,
    _talentFoamStart:0, _talentWaterDmgMult:1.0,
    _talentFrostBonus:0, _talentIceExecute:0, _talentIceDmgMult:1.0,
    _talentShockBonus:0, _talentOverloadFloor:0.25, _talentLightDmgMult:1.0,
    _talentStoneStart:0, _talentEarthDmgMult:1.0,
    _talentRootBonus:0, _talentTreantHP:0, _talentNatureDmgMult:1.0,
    _talentDodgeBonus:0, _talentChargeStart:0, _talentPlasmaDmgMult:1.0,
    _talentAirHits:0, _talentAirDmgMult:1.0,
  });
  Object.assign(combat, {
    enemies:[], targetIdx:0, activeEnemyIdx:0, enemy:{}, enemyHP:0,
    playerTurn:false, over:false, tempDmgBonus:0, actionsLeft:0, basicCD:0,
    playerAirToggle:false, enemyAirToggle:false, actionQueue:[], summons:[],
    totalXP:0, totalGold:0,
  });
  resetStatusForBattle();
  battleNumber=1; currentGymIdx=0; zoneBattleCount=0; gymSkips=0; gymDefeated=false; pendingLevelUps=[]; _zoneRivalDefeated=false;
  _runDmgDealt = 0; _runDmgTaken = 0; _runRoomsCompleted = 0; _runZoneReached = '';
  initGymRoster();
  initZoneSpecial();

  applyCharacterBuff();
  applyArtifactBonuses();
  applyTalentBonuses(); // permanent talent tree upgrades
  initSpellbooksForRun();  // create starting spellbook before spells/passives are added
  giveStarterSpell();
  document.getElementById('welcome-msg').textContent = `${playerName}, choose your element`;

  if (PASSIVE_CHOICES[playerElement] && PASSIVE_CHOICES[playerElement].filter(p => !p.legendary).length) {
    showPassiveScreen(playerElement);
    return;
  }
  loadBattle(ENCOUNTER_POOL[0]);
}

function confirmStartPassive(passiveId){
  player.startPassive = passiveId;
  // Put start passive into active book
  if (player.spellbooks && player.spellbooks.length) {
    addPassiveToBook(passiveId);
  } else {
    player.passives = [passiveId];
  }
  if (passiveId === 'air_tailwind') player.attackPower += 15;

  if (player._extraStartSpell) {
    const owned      = new Set(player.spellbook.map(s => s.id));
    const candidates = Object.values(SPELL_CATALOGUE).filter(s =>
      s.element === playerElement && !owned.has(s.id) && !s.legendary
    );
    if (candidates.length) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      addSpellById(pick.id);
      log(`📚 Head Start: bonus spell — ${pick.emoji} ${pick.name}!`, 'item');
    }
  }
  loadBattle(ENCOUNTER_POOL[0]);
}

function sandboxSkipBattle(){
  if (!sandboxMode) return;
  combat.over = true;
  stopBattleLoop();
  setPlayerTurnUI(false);
  const gold = combat.totalGold || 30;
  player.gold += gold;
  battleNumber++;
  zoneBattleCount++;
  log(`⚡ Sandbox: battle skipped. +${gold} gold.`, 'system');
  setTimeout(() => {
    if (pendingLevelUps.length > 0) processNextLevelUp();
    else showMap();
  }, 400);
}

function sandboxOpenEnemyPicker(){
  if(!sandboxMode) return;
  const content = document.getElementById('seo-content');
  if(!content) return;
  content.innerHTML = '';

  const sectionStyle = 'margin-bottom:.8rem;';
  const headStyle    = 'font-family:"Cinzel",serif;font-size:.65rem;color:#666;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.35rem;';
  const gridStyle    = 'display:flex;flex-wrap:wrap;gap:.3rem;';
  const btnBase      = 'border-radius:4px;padding:3px 8px;font-size:.6rem;font-family:"Cinzel",serif;cursor:pointer;border-width:1px;border-style:solid;';

  // ── Singles ──
  const singlesDiv = document.createElement('div');
  singlesDiv.style.cssText = sectionStyle;
  const singlesHead = document.createElement('div');
  singlesHead.style.cssText = headStyle;
  singlesHead.textContent = 'Singles';
  singlesDiv.appendChild(singlesHead);
  const singlesGrid = document.createElement('div');
  singlesGrid.style.cssText = gridStyle;
  (ENCOUNTER_POOL||[]).forEach(enc => {
    const meta = CAMP_META[enc.element] || { color:'#888', icon:'✦' };
    const btn = document.createElement('button');
    btn.textContent = meta.icon + ' ' + enc.name;
    btn.style.cssText = btnBase + `background:${meta.color}22;border-color:${meta.color}55;color:${meta.color};`;
    btn.onclick = () => { sandboxLoadEnemy(enc); };
    singlesGrid.appendChild(btn);
  });
  singlesDiv.appendChild(singlesGrid);
  content.appendChild(singlesDiv);

  // ── Packs ──
  const packsDiv = document.createElement('div');
  packsDiv.style.cssText = sectionStyle;
  const packsHead = document.createElement('div');
  packsHead.style.cssText = headStyle;
  packsHead.textContent = 'Packs';
  packsDiv.appendChild(packsHead);
  const packsGrid = document.createElement('div');
  packsGrid.style.cssText = gridStyle;
  (PACK_POOL||[]).forEach(enc => {
    const meta = CAMP_META[enc.element] || { color:'#888', icon:'✦' };
    const btn = document.createElement('button');
    btn.textContent = meta.icon + ' ' + enc.packName + ' (' + enc.members.length + ')';
    btn.style.cssText = btnBase + `background:${meta.color}22;border-color:${meta.color}55;color:${meta.color};`;
    btn.onclick = () => { sandboxLoadEnemy(enc); };
    packsGrid.appendChild(btn);
  });
  packsDiv.appendChild(packsGrid);
  content.appendChild(packsDiv);

  // ── Gym Bosses ──
  const gymsDiv = document.createElement('div');
  gymsDiv.style.cssText = sectionStyle;
  const gymsHead = document.createElement('div');
  gymsHead.style.cssText = headStyle;
  gymsHead.textContent = 'Gym Bosses';
  gymsDiv.appendChild(gymsHead);
  const gymsGrid = document.createElement('div');
  gymsGrid.style.cssText = gridStyle;
  (GYM_ROSTER||[]).forEach(gym => {
    const meta = CAMP_META[gym.element] || { color:'#888', icon:'✦' };
    const btn = document.createElement('button');
    btn.textContent = gym.emoji + ' ' + gym.name;
    btn.style.cssText = btnBase + `background:${meta.color}22;border-color:${meta.color}55;color:${meta.color};`;
    btn.onclick = () => {
      sandboxLoadEnemy({
        name: gym.name, emoji: gym.emoji, element: gym.element, color: gym.color,
        difficulty: 'gym', diffClass: 'diff-hard',
        enemyMaxHP: gymBossHP(), enemyDmg: gym.baseDmg,
        xp: gym.xp, gold: gym.gold, type: 'wizard', isGym: true,
        signature: gym.signature,
        gymPassive: gym.passive, gymPhase2Passive: gym.phase2Passive,
        gymEntryEffect: gym.entryEffect,
        gymHitCounter: 0, gymPhase2: false,
        gymPhase2Dmg: gym.phase2Dmg, gymChargeInterval: gym.chargeInterval,
      });
    };
    gymsGrid.appendChild(btn);
  });
  gymsDiv.appendChild(gymsGrid);
  content.appendChild(gymsDiv);

  document.getElementById('sandbox-enemy-overlay').style.display = 'block';
}

function sandboxLoadEnemy(enc){
  document.getElementById('sandbox-enemy-overlay').style.display = 'none';
  const savedZone = combat.activeZoneElement || currentZoneElement;
  loadBattle(enc);
  if(savedZone) sandboxSetCombatZone(savedZone);
}

function sandboxOpenSpellPicker(){
  if(!sandboxMode) return;
  const content = document.getElementById('sso-content');
  if(!content) return;
  content.innerHTML = '';

  const headStyle    = 'font-family:"Cinzel",serif;font-size:.62rem;color:#4aaa6a;letter-spacing:.1em;text-transform:uppercase;margin:.7rem 0 .3rem;';
  const gridStyle    = 'display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.4rem;';
  const btnBase      = 'border-radius:4px;padding:4px 9px;font-size:.6rem;font-family:"Cinzel",serif;cursor:pointer;border-width:1px;border-style:solid;';

  // Group all spells for player's element by tier
  const tiers = ['primary','secondary','legendary'];
  const tierLabels = { primary:'Primary', secondary:'Secondary', legendary:'Legendary' };

  // Current spellbook IDs for quick lookup
  const book = activeBook();
  const ownedIds = new Set((book ? book.spells : player.spellbook).map(s => s.id));

  tiers.forEach(tier => {
    const spells = Object.values(SPELL_CATALOGUE).filter(sp =>
      sp.element === playerElement && sp.tier === tier
    );
    if(!spells.length) return;

    const head = document.createElement('div');
    head.style.cssText = headStyle;
    head.textContent = tierLabels[tier];
    content.appendChild(head);

    const grid = document.createElement('div');
    grid.style.cssText = gridStyle;

    spells.forEach(spell => {
      const owned = ownedIds.has(spell.id);
      const btn = document.createElement('button');
      btn.title = spell.desc || '';
      if(owned){
        btn.style.cssText = btnBase + 'background:#0a2a0a;border-color:#4aaa6a;color:#4aaa6a;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.7;">✓ Remove</span>';
      } else {
        btn.style.cssText = btnBase + 'background:#0d0b09;border-color:#2a5a3a;color:#7ac09a;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.55;">+ Add</span>';
      }
      btn.onclick = () => { sandboxToggleSpell(spell.id); sandboxOpenSpellPicker(); };
      grid.appendChild(btn);
    });

    content.appendChild(grid);
  });

  // Also show non-element spells (Neutral)
  const neutralSpells = Object.values(SPELL_CATALOGUE).filter(sp => sp.element === 'Neutral');
  if(neutralSpells.length){
    const head = document.createElement('div');
    head.style.cssText = headStyle;
    head.textContent = 'Neutral';
    content.appendChild(head);
    const grid = document.createElement('div');
    grid.style.cssText = gridStyle;
    neutralSpells.forEach(spell => {
      const owned = ownedIds.has(spell.id);
      const btn = document.createElement('button');
      btn.title = spell.desc || '';
      if(owned){
        btn.style.cssText = btnBase + 'background:#0a2a0a;border-color:#4aaa6a;color:#4aaa6a;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.7;">✓ Remove</span>';
      } else {
        btn.style.cssText = btnBase + 'background:#0d0b09;border-color:#555;color:#aaa;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.55;">+ Add</span>';
      }
      btn.onclick = () => { sandboxToggleSpell(spell.id); sandboxOpenSpellPicker(); };
      grid.appendChild(btn);
    });
    content.appendChild(grid);
  }

  document.getElementById('sandbox-spell-overlay').style.display = 'block';
}

function sandboxToggleSpell(spellId){
  if(!sandboxMode) return;
  const spell = SPELL_CATALOGUE[spellId];
  if(!spell) return;
  const book = activeBook();
  const spells = book ? book.spells : player.spellbook;
  const idx = spells.findIndex(s => s.id === spellId);
  if(idx >= 0){
    // Remove it
    spells.splice(idx, 1);
    if(book && player.activeBookIdx === (player.spellbooks||[]).indexOf(book)) syncActiveBook();
    log(`📖 Sandbox: removed ${spell.emoji} ${spell.name}.`, 'system');
  } else {
    // Force-add (bypass slot limit in sandbox)
    const entry = { ...spell, currentCD: 0, dmgMult: 1.0 };
    spells.push(entry);
    if(book && player.activeBookIdx === (player.spellbooks||[]).indexOf(book)) syncActiveBook();
    log(`📖 Sandbox: added ${spell.emoji} ${spell.name}.`, 'system');
  }
  if(typeof renderSpellButtons === 'function') renderSpellButtons();
}

function sandboxSetCombatZone(element){
  if(!sandboxMode) return;
  combat.activeZoneElement = element;
  _setZoneElement(element);
  musicPlaySmart('battle_' + element);
  log(`⚡ Sandbox: zone changed to ${element}.`, 'system');
  // Update the element badge top-left
  const badge = document.getElementById('combat-element-badge');
  if(badge){
    const meta = (typeof CAMP_META !== 'undefined' && CAMP_META[element]) || { icon: '✦', color: '#aaa' };
    badge.textContent = `${meta.icon} ${element} Zone`;
    badge.style.color = meta.color;
    badge.style.borderColor = meta.color + '44';
  }
  // Refresh the zone bar to highlight the new active zone
  const combatZoneBar = document.getElementById('sandbox-zone-combat-bar');
  if(combatZoneBar){
    combatZoneBar.querySelectorAll('button').forEach(btn => {
      const gym = (GYM_ROSTER||[]).find(g => btn.textContent.includes(g.element));
      if(!gym) return;
      const isActive = element === gym.element;
      btn.style.background = isActive ? gym.color+'33' : '#111';
      btn.style.borderColor = isActive ? gym.color : '#333';
      btn.style.color       = isActive ? gym.color : '#888';
    });
  }
}

function backToElementSelectFromPassive(){
  pendingStartPassive = null;
  showElementScreen();
}

// ── Music bootstrap ───────────────────────────────────────────────────────────
(function(){
  let _started = false;
  function _firstGesture(){
    if (_started) return;
    _started = true;
    _audioStarted = true;  // unlock volumeToggleMute
    // Sync volume level from slider
    const slider = document.getElementById('vol-slider');
    if (slider) _volumeLevel = Number(slider.value) / 100;
    // Always start menu music on first gesture — title screen is always first
    _smartCurrentKey = null;
    musicPlaySmart('menu');
    ['click','keydown','touchstart'].forEach(ev =>
      document.removeEventListener(ev, _firstGesture, true)
    );
  }
  ['click','keydown','touchstart'].forEach(ev =>
    document.addEventListener(ev, _firstGesture, true)
  );
})();

