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
  // Check all books for already-owned spells
  const _allOwned = [];
  (player.spellbooks||[]).forEach(b => b.spells.forEach(s => { if(!s.isBuiltin) _allOwned.push(s.id); }));
  const owned = new Set(_allOwned);

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
    const gymRarity = (typeof rollSpellRarity === 'function') ? rollSpellRarity() : 'dim';
    addSpellById(pick.def.id, false, gymRarity);
    const rarityLabel = gymRarity !== 'dim' ? ` (${gymRarity.charAt(0).toUpperCase()+gymRarity.slice(1)})` : '';
    log('✦ Legendary spell unlocked: ' + pick.def.emoji + ' ' + pick.def.name + rarityLabel + '!', 'win');
  } else {
    addPassiveToBook(pick.def.id);
    log('✦ Legendary passive unlocked: ' + pick.def.emoji + ' ' + pick.def.title + '!', 'win');
  }
}

function toggleRewardLog(btn) {
  const panel = document.getElementById('br-log-panel');
  if (!panel) return;
  const open = panel.style.display !== 'none';
  if (open) {
    panel.style.display = 'none';
    btn.textContent = '📋 Battle Log ▾';
  } else {
    const src = document.getElementById('battle-log');
    panel.innerHTML = src ? src.innerHTML : '<span style="color:#333">No log.</span>';
    panel.style.display = 'block';
    panel.scrollTop = panel.scrollHeight;
    btn.textContent = '📋 Battle Log ▴';
  }
}

function showBattleRewardScreen(isGym, isSpellBattle, isRival) {
  // Reset log panel to closed state
  const brLog = document.getElementById('br-log-panel');
  if (brLog) brLog.style.display = 'none';
  const brLogBtn = document.querySelector('#battle-reward-screen button[onclick*="toggleRewardLog"]');
  if (brLogBtn) brLogBtn.textContent = '📋 Battle Log ▾';

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

  if (rewardType === 'incantation') {
    if (title) title.textContent = '✦ Incantation ✦';
    if (sub) sub.textContent = 'Choose a spell to upgrade.';
    showIncantationChoiceScreen(battleNumber);
    return;
  }
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
  // Zone layout is 14 battles. Rival appears on the map at count 8 (zone 1) or 6 (zone 2+).
  // Battles that make zoneBattleCount reach the rival slot give minor rewards ("before rival").
  // Battles fought while rival is on the map (player picks a regular battle) also give minor ("after rival").
  if (gymIdx === 0) {
    // Zone 1: rival card appears at count 8
    if (battleSlot === 1)  return 'primary_spell';
    if (battleSlot === 4)  return 'secondary_spell';
    if (battleSlot === 6)  return 'incantation';    // one incantation per zone 1
    if (battleSlot === 8)  return 'minor';          // before rival (rival now on map)
    if (battleSlot === 9)  return 'minor';          // after rival (skipped rival or extra battle)
    if (battleSlot === 10) return 'secondary_spell';
    if (battleSlot >= 12)  return 'gym_available';
    return battleSlot % 2 === 0 ? 'minor' : 'major';
  } else {
    // Zone 2+: rival card appears at count 6
    if (battleSlot === 3)  return 'secondary_spell';
    if (battleSlot === 4)  return 'incantation';    // one incantation per zone 2+
    if (battleSlot === 6)  return 'minor';          // before rival
    if (battleSlot === 7)  return 'minor';          // after rival
    if (battleSlot === 10) return 'secondary_spell';
    if (battleSlot >= 12)  return 'gym_available';
    return battleSlot % 2 === 1 ? 'major' : 'minor';
  }
}

function buildMinorUpgradePool() {
  return [
    { label:'+5 Attack Power',    emoji:'⚔️', tag:'Minor', desc:'Permanently gain +5 Attack Power.',
      apply(){ player.attackPower += 5; updateStatsUI(); } },
    { label:'+5 Effect Power',    emoji:'✦',  tag:'Minor', desc:'Permanently gain +5 Effect Power.',
      apply(){ player.effectPower += 5; updateStatsUI(); } },
    { label:'+5 Defense',         emoji:'🛡️', tag:'Minor', desc:'Permanently gain +5 Defense.',
      apply(){ player.defense += 5; updateStatsUI(); } },
    { label:'+20 Max HP',         emoji:'❤️', tag:'Minor', desc:'Permanently increase max HP by 20.',
      apply(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+20; player.hp=Math.min(maxHPFor('player'),player.hp+20); } },
    { label:'+60 Gold',           emoji:'💰', tag:'Minor', desc:'Gain 60 gold.',
      apply(){ player.gold += 60; } },
    { label:'Heal 30%',           emoji:'💚', tag:'Minor', desc:'Restore 30% of your max HP.',
      apply(){ applyHeal('player', Math.floor(maxHPFor('player')*0.30), '✦ Minor Heal'); } },
    { label:'+3 ATK & +3 EFX',   emoji:'⚡', tag:'Minor', desc:'Gain +3 Attack Power and +3 Effect Power.',
      apply(){ player.attackPower += 3; player.effectPower += 3; updateStatsUI(); } },
    { label:'Heal 20% + Restore PP', emoji:'🔮', tag:'Minor', desc:'Heal 20% HP and restore all spell PP.',
      apply(){ applyHeal('player', Math.floor(maxHPFor('player')*0.20), '✦ Rest'); restoreAllPP(); } },
    { label:'+3 DEF & +10 HP',    emoji:'🪨', tag:'Minor', desc:'Gain +3 Defense and +10 Max HP.',
      apply(){ player.defense += 3; player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+10; player.hp=Math.min(maxHPFor('player'),player.hp+10); updateStatsUI(); } },
  ];
}

function buildMajorUpgradePool() {
  return [
    { label:'Extra Action',       emoji:'⚡', tag:'Major', desc:'Permanently gain +1 action per turn in combat.',
      apply(){ player.bonusActions=(player.bonusActions||0)+1; log('⚡ Extra action per turn!','win'); } },
    { label:'Extra Life',         emoji:'❤️', tag:'Major', desc:'Gain one extra life — survive a killing blow at 75% HP.',
      apply(){ player.revives=(player.revives||0)+1; log('❤ Extra life gained!','win'); } },
    { label:'Extra Spell Slot',   emoji:'📖', tag:'Major', desc:'+1 spell slot in your active spellbook.',
      apply(){ const b=activeBook(); if(b){ b.spellSlots++; log('📖 Spell slot added!','win'); } } },
    { label:'Extra Passive Slot', emoji:'📿', tag:'Major', desc:'+1 passive slot in your active spellbook.',
      apply(){ const b=activeBook(); if(b){ b.passiveSlots=(b.passiveSlots||2)+1; log('📿 Passive slot added!','win'); } } },
    { label:'+12 ATK',            emoji:'⚔️', tag:'Major', desc:'Permanently gain +12 Attack Power.',
      apply(){ player.attackPower += 12; updateStatsUI(); log('⚔️ +12 Attack Power!','win'); } },
    { label:'+12 EFX',            emoji:'✦',  tag:'Major', desc:'Permanently gain +12 Effect Power.',
      apply(){ player.effectPower += 12; updateStatsUI(); log('✦ +12 Effect Power!','win'); } },
    { label:'+30 Max HP',         emoji:'💪', tag:'Major', desc:'Permanently gain +30 max HP.',
      apply(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+30; player.hp=Math.min(maxHPFor('player'),player.hp+30); } },
    { label:'Full Heal',          emoji:'✨', tag:'Major', desc:'Fully restore HP and all spell PP.',
      apply(){ applyHeal('player', maxHPFor('player'), '✨ Major Heal'); restoreAllPP(); } },
    { label:'Reroll Token',       emoji:'🎲', tag:'Major', desc:'Gain 1 reroll — re-draw choices on any future reward screen.',
      apply(){ player._rerolls=(player._rerolls||0)+1; log('🎲 Reroll token!','win'); } },
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

// Build weighted book discovery pool (all catalogue books minus ones already in run)
function _buildBookDiscoveryChoices(n) {
  if (typeof SPELLBOOK_CATALOGUE === 'undefined') return [];
  const meta = getMeta();
  const inRunIds = new Set((player.spellbooks||[]).map(b=>b.catalogueId).filter(Boolean));
  const elements = [playerElement, ...(player.unlockedElements||[])];

  const pool = [];
  Object.keys(SPELLBOOK_CATALOGUE).forEach(id => {
    if (inRunIds.has(id)) return; // already in run
    const cat = SPELLBOOK_CATALOGUE[id];
    let weight = { element:3, generic:2, legendary:1 }[cat.rarity] || 2;
    // Boost weight for matching elements
    if (cat.element && elements.includes(cat.element)) weight += 2;
    for (let i = 0; i < weight; i++) pool.push(id);
  });

  // Shuffle and pick n unique
  const seen = new Set();
  const result = [];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (const id of shuffled) {
    if (!seen.has(id)) { seen.add(id); result.push(id); }
    if (result.length >= n) break;
  }
  return result;
}

// Show pick-1-of-3 book discovery screen after a boss
function showBookDiscoveryScreen() {
  const meta = getMeta();
  const cont = document.getElementById('bd-choices');
  const badge = document.getElementById('bd-badge');
  const sub = document.getElementById('bd-sub');
  if (!cont) { _continueGymFlow(); return; }

  const choices = _buildBookDiscoveryChoices(3);
  if (choices.length === 0) { _continueGymFlow(); return; }

  if (badge) badge.textContent = 'Boss Clear';
  if (sub) sub.textContent = 'A spellbook has revealed itself. Choose one to take with you this run.';

  cont.innerHTML = '';
  choices.forEach(id => {
    const cat = SPELLBOOK_CATALOGUE[id];
    if (!cat) return;
    const isOwned = (meta.ownedBookIds || []).includes(id);
    const lvl = (meta.bookUpgradeLevels || {})[id] || 0;
    const rarityColor = cat.rarity === 'legendary' ? '#d4a0ff' : cat.rarity === 'generic' ? '#80c8ff' : '#c8a060';
    const rarityLabel = cat.rarity === 'legendary' ? '✦ Legendary' : cat.rarity === 'generic' ? '⚡ Generic' : (cat.element || 'Element') + ' Book';
    const newBadge = isOwned ? '' : '<span style="font-size:.55rem;background:#1a2a0a;border:1px solid #5a8a20;color:#90c040;padding:.1rem .4rem;border-radius:3px;margin-left:.4rem;">NEW</span>';

    const btn = document.createElement('button');
    btn.className = 'prog-choice-btn';
    btn.innerHTML = `<div class="pc-tag">${rarityLabel}</div>
      <div class="pc-name" style="color:${rarityColor};">${cat.emoji} ${cat.name}${newBadge}</div>
      <div class="pc-desc">${cat.levelDescs ? cat.levelDescs[lvl] : cat.desc}</div>
      <div style="font-size:.58rem;color:#6a4a3a;margin-top:.2rem;">⚠ ${cat.negative}</div>`;
    btn.onclick = () => {
      // Add to permanent collection if not already owned
      if (!isOwned) {
        if (!meta.ownedBookIds) meta.ownedBookIds = [];
        meta.ownedBookIds.push(id);
        if (!meta.unseenBookIds) meta.unseenBookIds = [];
        meta.unseenBookIds.push(id);
        saveMeta();
        log(`✦ New spellbook discovered: ${cat.emoji} ${cat.name}!`, 'win');
      } else {
        log(`📖 Picked up ${cat.emoji} ${cat.name} for this run.`, 'win');
      }
      // Add to current run (up to 3 books per run)
      if ((player.spellbooks||[]).length < 3 && typeof makeBookInstance !== 'undefined') {
        const instance = makeBookInstance(id);
        if (instance) {
          instance.spells.push(
            { id:'_basic', emoji:'⚔', name:'Basic Attack', baseCooldown:1, currentCD:0, isBuiltin:true },
            { id:'_armor', emoji:'🛡', name:'Armor', baseCooldown:0, currentCD:0, isBuiltin:true }
          );
          player.spellbooks.push(instance);
          log(`📖 ${cat.name} added to your spellbooks (book ${player.spellbooks.length}).`, 'item');
        }
      }
      _continueGymFlow();
    };
    cont.appendChild(btn);
  });

  showScreen('bookdiscovery-screen');
}

// Continue the gym flow after book discovery
function _continueGymFlow() {
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

function _doGymRewardFlow() {
  // Always show book discovery first, then continue to element unlock / legendary
  showBookDiscoveryScreen();
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

// ── INCANTATION CHOICE ──
function showIncantationChoiceScreen(level) {
  const badge = document.getElementById('inc-level-badge');
  if (badge) badge.textContent = typeof level === 'number' ? 'Battle ' + level : String(level);

  const cont = document.getElementById('inc-choices');
  if (!cont) { showMap(); return; }
  cont.innerHTML = '';

  // Collect all owned non-builtin spells that have an incantation config
  const upgradeable = [];
  (player.spellbooks || []).forEach(book => {
    book.spells.forEach(s => {
      if (s.isBuiltin) return;
      if (typeof SPELL_INCANTATION_CONFIG !== 'undefined' && SPELL_INCANTATION_CONFIG[s.id]) {
        upgradeable.push(s);
      }
    });
  });

  if (upgradeable.length === 0) {
    // No spells to upgrade yet — fall back to minor reward
    _currentRewardTier = 'minor';
    _renderUpgradeChoices('minor');
    showScreen('battle-reward-screen');
    return;
  }

  const _statLabels = (typeof _STAT_LABELS !== 'undefined') ? _STAT_LABELS : {};

  upgradeable.forEach(spell => {
    const display = (typeof incantationUpgradeDisplay === 'function') ? incantationUpgradeDisplay(spell) : null;
    const rarityInfo = (typeof SPELL_RARITY !== 'undefined') ? (SPELL_RARITY[spell.rarity || 'dim'] || SPELL_RARITY.dim) : { label: 'Dim', color: null };
    const rarityColor = rarityInfo.color || '#8a6a30';
    const nextLevel = (spell.incantationLevel || 1) + 1;
    const statLabel = display ? (_statLabels[display.stat] || display.stat) : '';
    const upgradeStr = display ? `${statLabel}: ${display.prev} → ${display.next}` : `Level ${spell.incantationLevel || 1} → ${nextLevel}`;

    const btn = document.createElement('button');
    btn.className = 'prog-choice-btn spell-btn-el';
    btn.style.borderColor = rarityColor;
    btn.innerHTML =
      `<div class="pc-tag" style="color:${rarityColor};">${rarityInfo.label} · Level ${spell.incantationLevel || 1} → ${nextLevel}</div>` +
      `<div class="pc-name">${spell.emoji} ${spell.name}</div>` +
      `<div class="pc-desc">${spell.desc || ''}</div>` +
      `<div class="pc-desc" style="color:#c8e0ff;margin-top:2px;">${upgradeStr}</div>`;
    btn.onclick = () => {
      spell.incantationLevel = (spell.incantationLevel || 1) + 1;
      log(`✦ Incantation: ${spell.emoji} ${spell.name} upgraded to level ${spell.incantationLevel}!`, 'win');
      showMap();
    };
    cont.appendChild(btn);
  });

  showScreen('incantation-screen');
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
  // Rarity label/color helpers
  const _RARITY_BADGE_CONFIG = {
    kindled: { label:'KINDLED', textColor:'#c06010', bg:'rgba(0,0,0,.98)',   border:'#c06010' },
    blazing: { label:'BLAZING', textColor:'#bb1200', bg:'rgba(0,0,0,.98)',   border:'#bb1200' },
    radiant: { label:'RADIANT', textColor:'#ffe880', bg:'rgba(50,42,0,.92)', border:'#d4aa20' },
  };
  chosen.forEach(opt=>{
    const isAOE=opt.desc&&opt.desc.toLowerCase().includes('all');
    const el=opt.element||'Neutral';
    const rarity=(typeof rollSpellRarity==='function')?rollSpellRarity():'dim';
    const rarityInfo=(typeof SPELL_RARITY!=='undefined')?SPELL_RARITY[rarity]:null;
    const rarityColor=rarityInfo?rarityInfo.color:null;
    const badgeCfg=_RARITY_BADGE_CONFIG[rarity]||null;
    const rarityBanner=badgeCfg
      ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:56px;padding:4px 7px;background:${badgeCfg.bg};border-left:2px solid ${badgeCfg.border};border-radius:0 4px 4px 0;flex-shrink:0;gap:1px;">
          <div style="font-size:.5rem;color:${badgeCfg.textColor};opacity:.85;letter-spacing:.08em;">✦</div>
          <div style="font-size:.72rem;color:${badgeCfg.textColor};font-family:'Cinzel',serif;font-weight:700;letter-spacing:.1em;text-transform:uppercase;line-height:1.1;">${badgeCfg.label}</div>
         </div>`
      : '';
    const btn=document.createElement("button");
    btn.className=`prog-choice-btn ${el==='Neutral'?'neutral-btn':'spell-btn-el'}`;
    btn.style.padding='0';
    btn.style.display='flex';
    btn.style.alignItems='stretch';
    btn.style.overflow='hidden';
    if(rarityColor) btn.style.borderColor=rarityColor;
    const inner=`<div style="flex:1;padding:.55rem .65rem;text-align:left;">
      <div class="pc-tag">${tierLabel} · ${el}${isAOE?' · AOE':''}</div>
      <div class="pc-name">${opt.emoji} ${opt.name}</div>
      <div class="pc-desc">${opt.desc} · CD:${opt.baseCooldown}</div>
    </div>${rarityBanner}`;
    btn.innerHTML=inner;
    btn.onclick=()=>{ addSpellById(opt.id, false, rarity); processNextLevelUp(); };
    cont.appendChild(btn);
  });
  showScreen("spellchoice-screen");
}

function buildSpellChoicePool(tier='secondary', forElement=null){
  // Check all books for already-owned spells
  const _allOwned = [];
  (player.spellbooks||[]).forEach(b => b.spells.forEach(s => { if(!s.isBuiltin) _allOwned.push(s.id); }));
  const owned = new Set(_allOwned);
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
      // Plasma always gets its own dedicated spellbook
      if (el === 'Plasma') ensurePlasmaBook();
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
    const infoIcon = p.detail ? `<span class="pc-info-icon" title="${p.detail}" onclick="event.stopPropagation()">ℹ</span>` : '';
    btn.innerHTML=`<div class="pc-tag">${p.element||''} Passive</div><div class="pc-name">${p.emoji} ${p.title}${infoIcon}</div><div class="pc-desc">${p.desc}</div>`;
    btn.onclick=()=>{ addPassiveToBook(p.id); processNextLevelUp(); };
    c.appendChild(btn);
  });
  showScreen("passivechoice-screen");
}

function buildPassiveChoicePool(){
  const elements=[playerElement, ...player.unlockedElements];
  // Collect all owned passives across every book
  const allOwnedPassives = new Set();
  (player.spellbooks||[]).forEach(b => b.passives.forEach(id => allOwnedPassives.add(id)));
  const pool=[];
  elements.forEach(el=>{
    (PASSIVE_CHOICES[el]||[]).forEach(p=>{
      if(p.legendary) return;          // legendaries not offered through normal passive picks
      if(!allOwnedPassives.has(p.id)) pool.push({...p, element:el});
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

