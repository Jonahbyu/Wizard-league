// ===== battleReward.js =====
// ─── BATTLE REWARD + PROGRESSION ─────────────────────────────────────────────
// Spell/passive/upgrade choices offered after battles and gym clears.

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
  const owned = new Set((player.spellbook||[]).filter(s=>!s.isBuiltin).map(s => s.id));

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
  // Add one entry per owned spell for upgrading (skip builtins)
  player.spellbook.forEach((s,idx)=>{
    if(s.isBuiltin) return;
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
  const owned = new Set(player.spellbook.filter(s=>!s.isBuiltin).map(s=>s.id));
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
