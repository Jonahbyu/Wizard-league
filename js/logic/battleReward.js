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

  // Build legendary passive pool — deduplicate across ALL books
  const passivePool = [];
  const allOwnedPassives = new Set();
  (player.spellbooks||[]).forEach(b => b.passives.forEach(id => allOwnedPassives.add(id)));
  elements.forEach(el => {
    (PASSIVE_CHOICES[el]||[]).forEach(p => {
      if (!p.legendary) return;
      if (allOwnedPassives.has(p.id)) return;
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

// ── POST-BATTLE LOOT SCREEN ──────────────────────────────────────────────────
const _PBL_REWARD_CFG = {
  gym:           { emoji:'🏆', label:'Gym Reward',     color:'#d4a0ff' },
  rival:         { emoji:'🧢', label:'Rival Reward',   color:'#9a6aee' },
  primary_spell: { emoji:'✦',  label:'Starting Spell', color:'#c080ff' },
  spell:         { emoji:'📜', label:'Spell Reward',   color:'#a080ff' },
  incantation:   { emoji:'📜', label:'Incantation',    color:'#e08030' },
  minor:         { emoji:'💰', label:'Pick Up',        color:'#c8a060' },
  major:         { emoji:'⚡', label:'Power Up',       color:'#e8d060' },
};

let _pendingLootInProgress = false;

let _lootGoldClaimed   = false;
let _lootItemClaimed   = false;
let _lootRewardClaimed = false;

function _checkPblAllClaimed() {
  if (_lootGoldClaimed && _lootItemClaimed && _lootRewardClaimed) {
    const btn = document.getElementById('pbl-continue-btn');
    if (btn) btn.style.display = 'block';
  }
}

function _makePblClickCard(card) {
  // Shared "claimed" visual for interactive cards
  card.classList.add('pbl-card-reward');
  return card;
}

function _claimPblCard(card, onClaim) {
  card.style.opacity = '0.55';
  card.style.cursor = 'default';
  card.onclick = null;
  const arrow = card.querySelector('.pbl-card-arrow');
  if (arrow) arrow.textContent = '✓';
  const sub = card.querySelector('.pbl-card-sub');
  if (sub) sub.textContent = '✓ Collected';
  if (onClaim) onClaim();
}

function showPostBattleLoot(isGym, isSpellBattle, isRival, gold, itemId) {
  _pendingLootInProgress = true;
  _lootGoldClaimed   = false;
  _lootItemClaimed   = !itemId; // no item = auto-claimed
  _lootRewardClaimed = false;

  const cards = document.getElementById('pbl-cards');
  if (!cards) { showBattleRewardScreen(isGym, isSpellBattle, isRival); return; }
  cards.innerHTML = '';

  // Gold card (interactive — click to collect)
  const goldCard = document.createElement('div');
  goldCard.className = 'pbl-card pbl-card-gold pbl-card-reward';
  goldCard.innerHTML = `<div class="pbl-card-icon">💰</div><div class="pbl-card-body"><div class="pbl-card-label">+${gold} Gold</div><div class="pbl-card-sub">Click to collect</div></div><div class="pbl-card-arrow">›</div>`;
  goldCard.onclick = () => _claimPblCard(goldCard, () => { _lootGoldClaimed = true; _checkPblAllClaimed(); });
  cards.appendChild(goldCard);

  // Item card (interactive — click to collect)
  if (itemId && typeof ITEM_CATALOGUE !== 'undefined' && ITEM_CATALOGUE[itemId]) {
    const cat = ITEM_CATALOGUE[itemId];
    const itemCard = document.createElement('div');
    itemCard.className = 'pbl-card pbl-card-item pbl-card-reward';
    itemCard.innerHTML = `<div class="pbl-card-icon">${cat.emoji}</div><div class="pbl-card-body"><div class="pbl-card-label">${cat.name}</div><div class="pbl-card-sub">Click to collect</div></div><div class="pbl-card-arrow">›</div>`;
    itemCard.onclick = () => _claimPblCard(itemCard, () => { _lootItemClaimed = true; _checkPblAllClaimed(); });
    cards.appendChild(itemCard);
  }

  // Reward card (interactive — click to open choice screen)
  const rewardType = isGym ? 'gym' : isRival ? 'rival'
    : (combat._chosenRewardType || getZoneRewardType(zoneBattleCount, currentGymIdx));
  const cfg = _PBL_REWARD_CFG[rewardType] || _PBL_REWARD_CFG.minor;
  const rewardCard = document.createElement('div');
  rewardCard.className = 'pbl-card pbl-card-reward';
  rewardCard.id = 'pbl-reward-card';
  rewardCard.innerHTML = `<div class="pbl-card-icon" style="color:${cfg.color}">${cfg.emoji}</div><div class="pbl-card-body"><div class="pbl-card-label" style="color:${cfg.color}">${cfg.label}</div><div class="pbl-card-sub">Click to choose</div></div><div class="pbl-card-arrow">›</div>`;
  rewardCard.onclick = () => {
    rewardCard.style.opacity = '0.5';
    rewardCard.style.cursor = 'default';
    rewardCard.onclick = null;
    const sub = rewardCard.querySelector('.pbl-card-sub');
    if (sub) sub.textContent = '✓ Claimed';
    showBattleRewardScreen(isGym, isSpellBattle, isRival);
  };
  cards.appendChild(rewardCard);

  // Continue hidden until all cards claimed
  const continueBtn = document.getElementById('pbl-continue-btn');
  if (continueBtn) continueBtn.style.display = 'none';

  const logPanel = document.getElementById('pbl-log-panel');
  if (logPanel) logPanel.style.display = 'none';

  showScreen('post-battle-loot-screen');
}

function _afterRewardChosen() {
  if (_pendingLootInProgress) {
    _pendingLootInProgress = false;
    _lootRewardClaimed = true;
    // Mark reward card as claimed visually
    const rc = document.getElementById('pbl-reward-card');
    if (rc) { rc.style.opacity = '0.55'; rc.style.cursor = 'default'; rc.onclick = null; const s = rc.querySelector('.pbl-card-sub'); if(s) s.textContent = '✓ Claimed'; const a = rc.querySelector('.pbl-card-arrow'); if(a) a.textContent = '✓'; }
    _checkPblAllClaimed();
    showScreen('post-battle-loot-screen');
  } else {
    showMap();
  }
}

function togglePblLog(btn) {
  const panel = document.getElementById('pbl-log-panel');
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
                   : (combat._chosenRewardType || getZoneRewardType(zoneBattleCount, currentGymIdx));

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
  if (rewardType === 'spell' || rewardType === 'secondary_spell') {
    if (title) title.textContent = '✦ Spell Reward ✦';
    if (sub) sub.textContent = 'Choose a spell to add to your spellbook.';
    showSpellChoiceScreen(battleNumber, 'secondary');
    return;
  }
  if (rewardType === 'minor') {
    if (title) title.textContent = '✦ Pick Up ✦';
    if (sub) sub.textContent = 'Choose a reward.';
    _currentRewardTier = 'minor';
    _renderUpgradeChoices('minor');
    showScreen('battle-reward-screen');
    return;
  }
  if (rewardType === 'major') {
    if (title) title.textContent = '✦ Power Up ✦';
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

// ── Dynamic zone reward sequence ──────────────────────────────────────────────
// Generated fresh each zone so every run has a different reward layout.
// _zoneRewardSequence[slot] gives the reward type for that battle slot (1-indexed).
let _zoneRewardSequence = null;
let _zoneRivalSlot = -1;

function initZoneRewardSequence() {
  const isZone1 = currentGymIdx === 0;

  _zoneRivalSlot = isZone1
    ? 6 + Math.floor(Math.random() * 4)
    : 5 + Math.floor(Math.random() * 4);

  // Weighted random reward type picker (20% spell, 30% incant, 30% minor, 20% major)
  const _rewardTypes   = ['spell', 'incantation', 'minor', 'major'];
  const _rewardWeights = [20, 30, 30, 20];
  const _pickReward = (exclude = null) => {
    const types   = _rewardTypes.filter(t => t !== exclude);
    const weights = _rewardWeights.filter((_, i) => _rewardTypes[i] !== exclude);
    const total   = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < types.length; i++) { r -= weights[i]; if (r <= 0) return types[i]; }
    return types[types.length - 1];
  };

  // Generate pairs for slots 2–14 (all regular battle slots before forced gym at 15)
  // Each pair guaranteed different types; same type can recur across screens
  _zoneRewardSequence = [null, isZone1 ? 'primary_spell' : 'spell'];
  for (let i = 0; i < 13; i++) {
    const typeA = _pickReward();
    const typeB = _pickReward(typeA);
    _zoneRewardSequence.push([typeA, typeB]);
  }
}

// encIdx: 0 = left encounter, 1 = right encounter
function getZoneRewardType(battleSlot, gymIdx, encIdx = 0) {
  if (_zoneRewardSequence && battleSlot >= 1 && battleSlot < _zoneRewardSequence.length) {
    const entry = _zoneRewardSequence[battleSlot];
    if (Array.isArray(entry)) return entry[encIdx] || entry[0] || 'minor';
    return entry || 'minor';
  }
  return 'minor';
}

function buildMinorUpgradePool() {
  // Pick Ups — items, gold, utility. Small and consumable-feeling. No big stat upgrades.
  const pool = [
    { label:'Gold Pouch',            emoji:'💰', tag:'Pick Up', desc:'Find 100 gold on the ground.',
      apply(){ player.gold += 100; log('💰 +100 gold!','win'); } },
    { label:'Mana Crystal',          emoji:'🔮', tag:'Pick Up', desc:'Restore all spell PP to full.',
      apply(){ restoreAllPP(); log('🔮 All spell PP restored!','win'); } },
    { label:'Healing Potion',        emoji:'💚', tag:'Pick Up', desc:'Drink up — restore 40% of your max HP.',
      apply(){ applyHeal('player', Math.floor(maxHPFor('player')*0.40), '💚 Potion'); } },
    { label:'Reroll Cache',          emoji:'🎲', tag:'Pick Up', desc:'Gain 3 reroll tokens for any future reward screen.',
      apply(){ player._rerolls=(player._rerolls||0)+3; log('🎲 +3 Reroll tokens!','win'); } },
    { label:'Sharpening Stone',      emoji:'⚔️', tag:'Pick Up', desc:'Quick maintenance — gain +6 Attack Power.',
      apply(){ player.attackPower += 6; updateStatsUI(); } },
    { label:'Focus Charm',           emoji:'✦',  tag:'Pick Up', desc:'Attune your magic — gain +6 Effect Power.',
      apply(){ player.effectPower += 6; updateStatsUI(); } },
    { label:'Leather Brace',         emoji:'🛡️', tag:'Pick Up', desc:'Strap it on — gain +6 Defense.',
      apply(){ player.defense += 6; updateStatsUI(); } },
    { label:'Vitality Tonic',        emoji:'❤️', tag:'Pick Up', desc:'A fortifying brew — permanently gain +18 max HP.',
      apply(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+18; player.hp=Math.min(maxHPFor('player'),player.hp+18); } },
  ];
  return pool;
}

function buildMajorUpgradePool() {
  // Power Ups — structural upgrades only. Always show 3.
  // Spell Slot and Passive Slot are near-guaranteed anchors (high weight).
  // Extra Action appears ~40% of the time. Extra Life has reduced/capped odds.
  const revives = player.revives || 0;
  const lifeWeight = revives >= 3 ? 0 : [45, 30, 15][revives] ?? 0;

  const bookWeight = (player.spellbooks||[]).length < 3 ? 75 : 0;

  const candidates = [
    { w:90, label:'Extra Spell Slot',  emoji:'📖', tag:'Power Up', desc:'+1 spell slot in your active spellbook.',
      apply(){ const b=activeBook(); if(b){ b.spellSlots++; log('📖 Spell slot added!','win'); } } },
    { w:90, label:'Extra Passive Slot',emoji:'📿', tag:'Power Up', desc:'+1 passive slot in your active spellbook.',
      apply(){ const b=activeBook(); if(b){ b.passiveSlots=(b.passiveSlots||2)+1; log('📿 Passive slot added!','win'); } } },
    { w:Math.max(20, 60 - (player.bonusActions||0)*20), label:'Extra Action', emoji:'⚡', tag:'Power Up', desc:'Permanently gain +1 action per turn in combat.',
      apply(){ player.bonusActions=(player.bonusActions||0)+1; log('⚡ Extra action per turn!','win'); } },
    { w:lifeWeight, label:'Extra Life',emoji:'❤️', tag:'Power Up', desc:'Survive one killing blow — revive at 75% HP.',
      apply(){ player.revives=(player.revives||0)+1; log('❤ Extra life gained!','win'); } },
    { w:bookWeight, label:'New Spellbook', emoji:'📚', tag:'Power Up', desc:'Add a new spellbook to your arsenal. Choose from 3 options.',
      _modal:true, apply(){ _showPickupBookChoice(); } },
  ].filter(c => c.w > 0);

  // Weighted pick without replacement — return exactly 3
  const chosen = [];
  const remaining = [...candidates];
  while (chosen.length < Math.min(3, remaining.length)) {
    const total = remaining.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i].w;
      if (r <= 0) { chosen.push(remaining.splice(i, 1)[0]); break; }
    }
  }
  return chosen;
}

function _showPickupBookChoice() {
  const choices = _buildBookDiscoveryChoices(3);
  const cont = document.getElementById('br-choices');
  if (!cont || choices.length === 0) { _afterRewardChosen(); return; }

  const title = document.getElementById('br-title');
  const sub   = document.getElementById('br-sub');
  if (title) title.textContent = '📖 New Spellbook';
  if (sub)   sub.textContent   = 'Choose a spellbook to add to your arsenal.';

  cont.innerHTML = '';
  const meta = getMeta();

  choices.forEach(id => {
    const cat = SPELLBOOK_CATALOGUE[id];
    if (!cat) return;
    const isOwned    = (meta.ownedBookIds || []).includes(id);
    const lvl        = (meta.bookUpgradeLevels || {})[id] || 0;
    const rarityColor = cat.rarity === 'legendary' ? '#d4a0ff' : cat.rarity === 'generic' ? '#80c8ff' : '#c8a060';
    const rarityLabel = cat.rarity === 'legendary' ? '✦ Legendary' : cat.rarity === 'generic' ? '⚡ Generic' : (cat.element || 'Element') + ' Book';
    const newBadge    = isOwned ? '' : '<span style="font-size:.55rem;background:#1a2a0a;border:1px solid #5a8a20;color:#90c040;padding:.1rem .4rem;border-radius:3px;margin-left:.4rem;">NEW</span>';

    const btn = document.createElement('button');
    btn.className = 'prog-choice-btn';
    btn.innerHTML = `
      <div class="pc-tag">${rarityLabel}</div>
      <div class="pc-name" style="color:${rarityColor};">${cat.emoji} ${cat.name}${newBadge}</div>
      <div class="pc-desc">${cat.levelDescs ? cat.levelDescs[lvl] : cat.desc}</div>
      <div class="pc-desc" style="color:#7a4a30;margin-top:2px;">⚠ ${cat.negative}</div>`;
    btn.onclick = () => {
      if (!isOwned) {
        if (!meta.ownedBookIds)  meta.ownedBookIds  = [];
        if (!meta.unseenBookIds) meta.unseenBookIds = [];
        meta.ownedBookIds.push(id);
        meta.unseenBookIds.push(id);
        saveMeta();
      }
      if ((player.spellbooks||[]).length < 3 && typeof makeBookInstance !== 'undefined') {
        const instance = makeBookInstance(id);
        if (instance) {
          instance.spells.push(
            { id:'_basic', emoji:'⚔', name:'Basic Attack', baseCooldown:1, currentCD:0, isBuiltin:true },
            { id:'_armor', emoji:'🛡', name:'Armor',        baseCooldown:0, currentCD:0, isBuiltin:true }
          );
          player.spellbooks.push(instance);
          log(`📖 ${cat.emoji} ${cat.name} added as book ${player.spellbooks.length}!`, 'win');
        }
      }
      _afterRewardChosen();
    };
    cont.appendChild(btn);
  });
}

function _renderUpgradeChoices(tier) {
  const cont = document.getElementById('br-choices');
  if (!cont) return;
  cont.innerHTML = '';
  const pool = tier === 'major' ? buildMajorUpgradePool() : buildMinorUpgradePool();
  // Major pool already returns exactly 3 weighted picks; minor pool needs random sampling
  const chosen = tier === 'major' ? pool : pickRandom(pool, Math.min(4, pool.length));
  chosen.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'prog-choice-btn';
    btn.innerHTML = `<div class="pc-tag">${opt.tag}</div><div class="pc-name">${opt.emoji} ${opt.label}</div><div class="pc-desc">${opt.desc}</div>`;
    btn.onclick = () => { opt.apply(); updateStatsUI(); if (!opt._modal) _afterRewardChosen(); };
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
    _afterRewardChosen();
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
  if(pendingLevelUps.length === 0){ _afterRewardChosen(); return; }
  const ev = pendingLevelUps.shift();
  if(ev.type === 'gym_legendary'){
    grantRandomLegendary();
    _afterRewardChosen();
  } else if(ev.type === 'spellchoice'){
    showSpellChoiceScreen(ev.level, ev.tier || 'secondary', ev.forElement || null);
  } else if(ev.type === 'passivechoice'){
    showPassiveChoiceScreen(ev.level, ev.forElement || null);
  } else {
    _afterRewardChosen();
  }
}
function showLevelUp(){ _afterRewardChosen(); }
function closeLevelUp(){ _afterRewardChosen(); }

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
  if (!cont) { _afterRewardChosen(); return; }
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
  const picks = pickRandom(upgradeable, Math.min(3, upgradeable.length));

  picks.forEach(spell => {
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
      _afterRewardChosen();
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
  // Mark offered spells as seen in the library
  if(typeof markSpellSeen === 'function') chosen.forEach(s => markSpellSeen(s.id));

  // ── Duo spell: bonus 4th option (10% per eligible spell, pick one winner) ──
  let duoSpell = null;
  if(tier === 'secondary' && typeof _eligibleDuoSpells === 'function'){
    const eligible = _eligibleDuoSpells().filter(s => !chosen.find(c => c.id === s.id));
    const winners = eligible.filter(() => Math.random() < 0.10);
    if(winners.length > 0) {
      duoSpell = winners[Math.floor(Math.random() * winners.length)];
      if(typeof markSpellSeen === 'function') markSpellSeen(duoSpell.id);
    }
  }
  // Inject shared rarity animation keyframes once
  if (!document.getElementById('inc-preview-styles')) {
    const s = document.createElement('style');
    s.id = 'inc-preview-styles';
    s.textContent = `
      @keyframes incStarPulse {
        0%,100% { opacity:1; filter:brightness(1) drop-shadow(0 0 2px currentColor); transform:scale(1); }
        50%      { opacity:.5; filter:brightness(2.5) drop-shadow(0 0 6px currentColor); transform:scale(1.4); }
      }
      @keyframes incShimmer {
        0%   { left:-80%; }
        100% { left:160%; }
      }
      @keyframes incFireGlow {
        0%,100% { opacity:.7; transform:scaleY(1);   filter:blur(2px); }
        33%     { opacity:1;   transform:scaleY(1.15); filter:blur(1px); }
        66%     { opacity:.6;  transform:scaleY(.9);   filter:blur(3px); }
      }
      @keyframes incBorderPulse {
        0%,100% { opacity:1; }
        50%     { opacity:.6; }
      }
    `;
    document.head.appendChild(s);
  }

  // Rarity card config — mirrors the preview panel exactly
  const _RARITY_CARD_CONFIG = {
    dim:     { label:'DIM',     stars:1, textColor:'#887766', tagColor:'#887766', cardBg:'rgba(0,0,0,.98)',                                                      borderGrad:'linear-gradient(to right, #1a1a1a 50%, #2a1a08 100%)' },
    kindled: { label:'KINDLED', stars:2, textColor:'#c06010', tagColor:'#c06010', cardBg:'rgba(0,0,0,.98)',                                                      borderGrad:'linear-gradient(to right, #1a1a1a 50%, #c06010 100%)' },
    blazing: { label:'BLAZING', stars:3, textColor:'#bb1200', tagColor:'#bb1200', cardBg:'rgba(0,0,0,.98)',                                                      borderGrad:'linear-gradient(to right, #1a1a1a 50%, #bb1200 100%)' },
    radiant: { label:'RADIANT', stars:4, textColor:'#7a5208', tagColor:'#8a6a10', cardBg:'linear-gradient(to right, rgba(0,0,0,.98) 50%, #f0e8c0 100%)',         borderGrad:'linear-gradient(to right, #1a1a1a 50%, #d4aa20 100%)', leftTextColor:'#ffffff' },
    merged:  { label:'MERGED',  stars:5, textColor:'#ffffff', tagColor:'#00d4c8', cardBg:'linear-gradient(to right, rgba(0,0,0,.98) 50%, rgba(0,80,75,1) 100%)', borderGrad:'linear-gradient(to right, #1a1a1a 50%, #00d4c8 100%)',  leftTextColor:'#ffffff' },
  };
  chosen.forEach(opt=>{
    const isAOE=opt.desc&&opt.desc.toLowerCase().includes('all');
    const el=opt.element||'Neutral';
    const rarity=(typeof rollSpellRarity==='function')?rollSpellRarity():'dim';
    const cfg=_RARITY_CARD_CONFIG[rarity]||_RARITY_CARD_CONFIG.dim;

    const btn=document.createElement("button");
    btn.className=`prog-choice-btn ${el==='Neutral'?'neutral-btn':'spell-btn-el'}`;
    btn.onclick=()=>{
      const doAdd = bIdx => { addSpellById(opt.id, false, rarity, bIdx); processNextLevelUp(); };
      if(typeof _pickBookDest === 'function') _pickBookDest('spell', opt, doAdd); else doAdd(undefined);
    };

    {
      // Kindled / Blazing / Radiant — gradient border wrapper + matching card bg
      const isFire = rarity === 'kindled' || rarity === 'blazing';
      const isGradient = cfg.cardBg.includes('gradient');
      const fireColor = rarity === 'kindled' ? 'rgba(255,120,0,.10)' : 'rgba(255,30,0,.22)';
      const fire = isFire
        ? `<div style="position:absolute;bottom:0;right:0;width:55%;height:100%;pointer-events:none;z-index:2;
             background:linear-gradient(to left,${fireColor},transparent);
             animation:incFireGlow 1.6s ease-in-out infinite;"></div>`
        : '';
      const shimmer = isGradient
        ? `<div style="position:absolute;top:0;left:-80%;width:45%;height:100%;pointer-events:none;z-index:2;
             background:linear-gradient(to right,transparent,rgba(255,255,255,.09),transparent);
             animation:incShimmer 3.5s linear infinite;"></div>`
        : '';
      const nameColor = cfg.leftTextColor || cfg.textColor;
      const descColor = cfg.leftTextColor ? 'rgba(255,255,255,.75)' : 'rgba(220,200,180,.75)';
      const wrapperAnim = isFire ? 'animation:incBorderPulse 1.8s ease-in-out infinite;' : '';
      btn.style.cssText='padding:0;display:flex;flex-direction:row;flex-wrap:nowrap;align-items:stretch;overflow:hidden;gap:0;border:none;border-radius:5px;width:100%;position:relative;';
      btn.innerHTML=`
        ${fire}${shimmer}
        <div style="flex:1;min-width:0;padding:.55rem .65rem;text-align:left;position:relative;z-index:3;">
          <div class="pc-tag">${tierLabel} · ${el}${isAOE?' · AOE':''}</div>
          <div class="pc-name" style="color:${nameColor};">${opt.emoji} ${opt.name}</div>
          <div class="pc-desc" style="white-space:normal;color:${descColor};">${opt.desc} · CD:${opt.baseCooldown}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:72px;width:72px;padding:4px 6px;flex-shrink:0;align-self:stretch;gap:2px;position:relative;z-index:3;">
          <div style="display:flex;gap:1px;">${Array.from({length:cfg.stars},(_,i)=>`<span style="font-size:.45rem;color:${cfg.tagColor};display:inline-block;animation:incStarPulse ${5.5+i*0.7}s ease-in-out ${i*1.0}s infinite;">✦</span>`).join('')}</div>
          <div style="font-size:.62rem;color:${cfg.textColor};font-family:'Cinzel',serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;text-align:center;">${cfg.label}</div>
        </div>`;
      // Wrapper provides the gradient border (padding trick)
      const wrapper=document.createElement('div');
      wrapper.style.cssText=`padding:3px;background:${cfg.borderGrad};border-radius:7px;${wrapperAnim}`;
      btn.style.background=cfg.cardBg;
      wrapper.appendChild(btn);
      cont.appendChild(wrapper);
    }
  });

  // ── Render duo spell as bonus 4th option (always 'merged' rarity) ──
  if(duoSpell){
    const cfg = _RARITY_CARD_CONFIG['merged'];
    const el  = duoSpell.element || 'Duo';
    const shimmer = `<div style="position:absolute;top:0;left:-80%;width:45%;height:100%;pointer-events:none;z-index:2;
        background:linear-gradient(to right,transparent,rgba(255,255,255,.09),transparent);
        animation:incShimmer 3.5s linear infinite;"></div>`;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `padding:3px;background:${cfg.borderGrad};border-radius:7px;`;
    const btn = document.createElement('button');
    btn.className = 'prog-choice-btn spell-btn-el';
    btn.style.cssText = 'padding:0;display:flex;flex-direction:row;flex-wrap:nowrap;align-items:stretch;overflow:hidden;gap:0;border:none;border-radius:5px;width:100%;position:relative;';
    btn.style.background = cfg.cardBg;
    btn.onclick = () => {
      const doAdd = bIdx => { addSpellById(duoSpell.id, false, 'merged', bIdx); processNextLevelUp(); };
      if(typeof _pickBookDest === 'function') _pickBookDest('spell', duoSpell, doAdd); else doAdd(undefined);
    };
    btn.innerHTML = `${shimmer}
      <div style="flex:1;min-width:0;padding:.55rem .65rem;text-align:left;position:relative;z-index:3;">
        <div class="pc-tag" style="color:${cfg.tagColor};">Merged · ${el}</div>
        <div class="pc-name" style="color:${cfg.leftTextColor};">${duoSpell.emoji} ${duoSpell.name}</div>
        <div class="pc-desc" style="white-space:normal;color:rgba(255,255,255,.75);">${duoSpell.desc} · CD:${duoSpell.baseCooldown}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:72px;width:72px;padding:4px 6px;flex-shrink:0;align-self:stretch;gap:2px;position:relative;z-index:3;">
        <div style="display:flex;gap:1px;">${Array.from({length:5},(_,i)=>`<span style="font-size:.45rem;color:${cfg.tagColor};display:inline-block;animation:incStarPulse ${5.5+i*0.7}s ease-in-out ${i*1.0}s infinite;">✦</span>`).join('')}</div>
        <div style="font-size:.62rem;color:${cfg.textColor};font-family:'Cinzel',serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;text-align:center;">${cfg.label}</div>
      </div>`;
    wrapper.appendChild(btn);
    cont.appendChild(wrapper);
  }

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
      // Queue: passive choice for new element, spell choice in new element, then legendary
      pendingLevelUps = [
        { type:'passivechoice', level:'gym', forElement: el },
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
function showPassiveChoiceScreen(level, forElement=null){
  const badgeText = level === 'rival' ? 'Rival Defeated'
                  : level === 'gym'   ? 'Gym Clear — New Passive'
                  : `Level ${level} — New Passive`;
  document.getElementById("pc-level-badge").textContent = badgeText;
  const c=document.getElementById("pc-choices"); c.innerHTML="";
  const pool=buildPassiveChoicePool(forElement);
  if(pool.length===0){
    processNextLevelUp(); return;
  }
  const chosen=pickRandom(pool,Math.min(3,pool.length));
  // Mark offered passives as seen in the library
  if(typeof markPassiveSeen === 'function') chosen.forEach(p => markPassiveSeen(p.id));
  chosen.forEach(p=>{
    const btn=document.createElement("button");
    btn.className="prog-choice-btn passive-btn";
    const infoIcon = p.detail ? `<span class="pc-info-icon" title="${p.detail}" onclick="event.stopPropagation()">ℹ</span>` : '';
    btn.innerHTML=`<div class="pc-tag">${p.element||''} Passive</div><div class="pc-name">${p.emoji} ${p.title}${infoIcon}</div><div class="pc-desc">${p.desc}</div>`;
    btn.onclick=()=>{
      const doAdd = bIdx => { addPassiveToBook(p.id, bIdx); processNextLevelUp(); };
      if(typeof _pickBookDest === 'function') _pickBookDest('passive', p.id, doAdd); else doAdd(undefined);
    };
    c.appendChild(btn);
  });
  showScreen("passivechoice-screen");
}

function buildPassiveChoicePool(forElement=null){
  const elements = forElement ? [forElement] : [playerElement, ...player.unlockedElements];
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
  // Add eligible duo passives — compete equally with normal passives (not on element-specific screens)
  if(!forElement && typeof _eligibleDuoPassives === 'function'){
    _eligibleDuoPassives().forEach(p => pool.push(p));
  }
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

