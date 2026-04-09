// ===== main.js =====
// ─── MAIN / SCREEN NAVIGATION ────────────────────────────────────────────────

// activeSaveSlot and sandboxMode declared in constants.js (runs first, no TDZ)

// ── SAVE SLOTS ────────────────────────────────────────────────────────────────
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

// ── SAVE SELECT SCREEN ────────────────────────────────────────────────────────
function showSaveSelect() {
  const container = document.getElementById('save-slots');
  container.innerHTML = '';

  // Slots 0-2: normal save slots
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

  // Slot 3: always-unlocked full master save
  const masterCard = document.createElement('div');
  masterCard.className = 'save-slot-card has-data';
  masterCard.style.cssText = 'border-color:#5a4010;background:linear-gradient(160deg,#14100a,#0c0805);';
  masterCard.innerHTML = `
    <div class="save-slot-left">
      <div class="save-slot-name" style="color:#e8c060;">✦ Full Unlock</div>
      <div class="save-slot-stats" style="color:#6a5020;">All spells · All books · All talents · All artifacts</div>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;">
      <div class="save-slot-right has-data" style="color:#c8a060;border-color:#5a4010;">MASTER</div>
    </div>
    <div style="margin-top:.5rem;border-top:1px solid #2a1a08;padding-top:.45rem;display:flex;gap:.4rem;">
      <button onclick="event.stopPropagation();selectFullUnlockSlot(false)" style="flex:1;background:#1a1005;border:1px solid #5a3a0a;color:#e8c060;font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.08em;padding:.3rem .4rem;border-radius:4px;cursor:pointer;">⚔ Play</button>
      <button onclick="event.stopPropagation();selectFullUnlockSlot(true)" style="flex:1;background:#0a0614;border:1px solid #3a1a5a;color:#c080ff;font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.08em;padding:.3rem .4rem;border-radius:4px;cursor:pointer;">🔬 Sandbox</button>
    </div>`;
  masterCard.onclick = () => selectFullUnlockSlot(false);
  container.appendChild(masterCard);

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

// ── FULL UNLOCK SLOT (always slot index 3) ────────────────────────────────────
// Rebuilds the meta from live catalogue data every time — always fresh.
function selectFullUnlockSlot(sandbox) {
  const SLOT = 3;
  activeSaveSlot = SLOT;
  if (!window._metaBySlot) window._metaBySlot = {};
  window._metaBySlot[SLOT] = null; // clear cache

  // ── All spell IDs ──
  const allSpellIds = Object.keys(typeof SPELL_CATALOGUE !== 'undefined' ? SPELL_CATALOGUE : {});

  // ── All passive IDs (flatten all PASSIVE_CHOICES arrays) ──
  const allPassiveIds = [];
  if (typeof PASSIVE_CHOICES !== 'undefined') {
    Object.values(PASSIVE_CHOICES).forEach(arr => {
      if (Array.isArray(arr)) arr.forEach(p => { if (p && p.id) allPassiveIds.push(p.id); });
    });
  }

  // ── All book IDs at upgrade level 4 ──
  const allBookIds = typeof SPELLBOOK_CATALOGUE !== 'undefined' ? Object.keys(SPELLBOOK_CATALOGUE) : [];
  const bookUpgradeLevels = {};
  const bookSlotUpgrades  = {};
  allBookIds.forEach(id => { bookUpgradeLevels[id] = 4; });

  // ── All artifacts at star 3 ──
  const allArtifactIds = typeof ARTIFACT_ORDER !== 'undefined' ? ARTIFACT_ORDER : [];
  const artifacts = allArtifactIds.map(id => ({ id, star: 3, roomsUsed: 0 }));

  // ── All talents at max level ──
  const talents = {};
  if (typeof TALENT_TREE !== 'undefined') {
    Object.values(TALENT_TREE).forEach(tree => {
      if (tree && Array.isArray(tree.nodes)) {
        tree.nodes.forEach(node => { if (node && node.id) talents[node.id] = node.maxLevel; });
      }
    });
  }

  const meta = {
    totalRuns:        50,
    bestLevel:        99,
    gymsBeaten:       20,
    artifacts,
    activeArtifactId: allArtifactIds[0] || null,
    unseenArtifacts:  [],
    ownedBookIds:     [...allBookIds],
    bookUpgradeLevels,
    bookSlotUpgrades,
    unseenBookIds:    [],
    talents,
    phos:             9999,
    phosTotal:        99999,
    runHistory:       [],
    seenThroneRoom:   true,
    seenSpells:       allSpellIds,
    seenPassives:     allPassiveIds,
  };

  // Write meta and slot data
  try { localStorage.setItem('elemental_meta_v1_slot' + SLOT, JSON.stringify(meta)); } catch(e) {}
  saveSlot(SLOT, { playerName: 'Full Unlock' });

  playerName  = 'Full Unlock';
  sandboxMode = !!sandbox;
  showBetweenRuns();
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
  const meta = getMeta();
  const isFirstRun = !meta.totalRuns || meta.totalRuns === 0;
  if (isFirstRun && typeof playCutscene === 'function') {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    musicStopAll();
    playCutscene(() => showBetweenRuns());
  } else {
    showBetweenRuns();
  }
}

// ── MODE SELECT ───────────────────────────────────────────────────────────────
function selectGameMode(isDeck) {
  player.deckMode = !!isDeck;
  showElementScreen();
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
  // Sandbox: all elements. Non-sandbox: only fully released elements (no random picking).
  const picked = sandboxMode
    ? pool
    : pool.filter(e => RELEASED_ELEMENTS.includes(e.el));

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

// ── PASSIVE SELECT (run start) ────────────────────────────────────────────────
function showPassiveScreen(element){
  const title   = document.getElementById('passive-screen-title');
  const sub     = document.getElementById('passive-screen-subtitle');
  const list    = document.getElementById('passive-choices-screen');
  const startBtn= document.getElementById('passive-start-btn');
  const pool    = (PASSIVE_CHOICES[element] || []).filter(p => !p.legendary);
  const choices = sandboxMode ? pool : pickRandom(pool, Math.min(3, pool.length));

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
    const infoIcon = ch.detail ? `<span class="pc-info-icon" title="${ch.detail}" onclick="event.stopPropagation()">ℹ</span>` : '';
    btn.innerHTML    = `<div class="choice-title">${ch.emoji} ${ch.title}${infoIcon}</div><div class="choice-desc">${ch.desc}</div>`;
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
  if (!e) return false;
  return e.passive === id || (e.extraPassives || []).includes(id);
}

// Show book selection screen at run start (if player owns catalogue books)
function showRunBookSelectionScreen(onDone) {
  const meta = getMeta();
  // In sandbox, offer all catalogue books; otherwise only owned ones
  const ownedBookIds = (sandboxMode && typeof SPELLBOOK_CATALOGUE !== 'undefined')
    ? Object.keys(SPELLBOOK_CATALOGUE)
    : (meta.ownedBookIds || []);

  // Non-legendary owned books — randomly sample up to 3
  const regularIds = (typeof SPELLBOOK_CATALOGUE !== 'undefined')
    ? ownedBookIds.filter(id => { const cat = SPELLBOOK_CATALOGUE[id]; return cat && cat.rarity !== 'legendary'; })
    : ownedBookIds;
  for (let i = regularIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [regularIds[i], regularIds[j]] = [regularIds[j], regularIds[i]];
  }
  const offeredIds = regularIds.slice(0, 3);

  if (offeredIds.length === 0 || typeof SPELLBOOK_CATALOGUE === 'undefined') {
    onDone(null); return;
  }
  const cont = document.getElementById('bs-choices');
  if (!cont) { onDone(null); return; }
  cont.innerHTML = '';

  // Update screen labels based on mode
  const isDeck = player.deckMode;
  const bsBadge = document.getElementById('bs-badge');
  const bsTitle = document.getElementById('bs-title');
  const bsSub   = document.getElementById('bs-sub');
  if (bsBadge) bsBadge.textContent = isDeck ? 'Starting Deck' : 'Starting Spellbook';
  if (bsTitle) bsTitle.textContent = isDeck ? '✦ Choose Your Deck ✦' : '✦ Choose Your Book ✦';
  if (bsSub)   bsSub.textContent   = isDeck ? "Pick the deck you'll begin this run with." : "Pick the spellbook you'll begin this run with.";

  // Option: use default element tome (no catalogue book)
  const defBtn = document.createElement('button');
  defBtn.className = 'prog-choice-btn';
  defBtn.innerHTML = isDeck
    ? `<div class="pc-tag">Default</div>
       <div class="pc-name">🃏 ${playerElement} Starter Deck</div>
       <div class="pc-desc">Your standard deck — no special effects, but no drawbacks either.</div>`
    : `<div class="pc-tag">Default</div>
       <div class="pc-name">📖 ${playerElement}'s Tome</div>
       <div class="pc-desc">Your standard spellbook — no special effects, but no drawbacks either.</div>`;
  defBtn.onclick = () => onDone(null);
  cont.appendChild(defBtn);

  // Offered catalogue books (up to 3, non-legendary)
  const bookUpgradeLevels = meta.bookUpgradeLevels || {};
  offeredIds.forEach(id => {
    const cat = SPELLBOOK_CATALOGUE[id];
    if (!cat) return;
    const lvl = bookUpgradeLevels[id] || 0;
    const rarityColor = cat.rarity === 'generic' ? '#80c8ff' : '#c8a060';
    const rarityLabel = cat.rarity === 'generic'
      ? (isDeck ? '⚡ Generic Deck' : '⚡ Generic')
      : (cat.element || '') + (isDeck ? ' Deck' : ' Book');
    const btn = document.createElement('button');
    btn.className = 'prog-choice-btn';
    btn.innerHTML = `<div class="pc-tag">${rarityLabel} · Lv ${lvl}</div>
      <div class="pc-name" style="color:${rarityColor};">${cat.emoji} ${cat.name}</div>
      <div class="pc-desc">${cat.levelDescs ? cat.levelDescs[lvl] : cat.desc}</div>
      <div style="font-size:.58rem;color:#6a4a3a;margin-top:.2rem;">⚠ ${cat.negative}</div>`;
    btn.onclick = () => onDone(id);
    cont.appendChild(btn);
  });

  showScreen('bookselect-screen');
}

// ── RUN INIT ──────────────────────────────────────────────────────────────────
function beginRun(){
  Object.assign(player, {
    hp:BASE_MAX_HP,
    attackPower:0, effectPower:0, defense:0,
    skillPoints:0, gold:0, inventory:[], spellbook:[],
    passives:[], startPassive:null,
    unlockedElements:[], baseMaxHPBonus:0, spellbooks:[], activeBookIdx:0,
    revives:0, bonusActions:0,
    basicUpgrade:0, basicDmgMult:1.0,
    _hasteStart:false, _blockStart:0, _extraStartSpell:false, _rerolls:0,
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
    totalGold:0,
  });
  resetStatusForBattle();
  battleNumber=1; currentGymIdx=0; zoneBattleCount=0; gymSkips=0; gymDefeated=false; pendingLevelUps=[]; _zoneRivalDefeated=false;
  _zoneGraph=null; _playerNodeId=-1; _completedNodeIds=new Set(); _pendingNodeId=-1; _zoneIntroPlayed=false;
  _runDmgDealt = 0; _runDmgTaken = 0; _runRoomsCompleted = 0; _runZoneReached = ''; _runKillsThisRun = 0;
  initGymRoster();
  initZoneSpecial();

  applyCharacterBuff();
  applyArtifactBonuses();
  applyMistModifiers();  // mist before talents so _mistTalentReduction is set
  applyTalentBonuses(); // permanent talent tree upgrades
  initSpellbooksForRun();  // create starting spellbook before spells/passives are added
  giveStarterSpell();
  document.getElementById('welcome-msg').textContent = `${playerName}, choose your element`;

  if (PASSIVE_CHOICES[playerElement] && PASSIVE_CHOICES[playerElement].filter(p => !p.legendary).length) {
    showPassiveScreen(playerElement);
    return;
  }
  _offerRunBookThenBattle();
}

// Helper: show run-start book selection, then launch first battle
function _offerRunBookThenBattle() {
  showRunBookSelectionScreen(chosenId => {
    if (chosenId && typeof makeBookInstance !== 'undefined' && typeof SPELLBOOK_CATALOGUE !== 'undefined') {
      const cat = SPELLBOOK_CATALOGUE[chosenId];
      if (cat) {
        const newBook = makeBookInstance(chosenId);
        if (newBook) {
          // Transfer spells/passives from default book
          const oldBook = player.spellbooks[0];
          if (oldBook) { newBook.spells = [...oldBook.spells]; newBook.passives = [...oldBook.passives]; }
          player.spellbooks[0] = newBook;
          player.activeBookIdx = 0;
          syncActiveBook();
          log(`📖 Starting with ${cat.emoji} ${cat.name}.`, 'item');
        }
      }
    }
    // First time entering the castle — play throne room intro
    const meta = getMeta();
    if (!meta.seenThroneRoom && typeof playThroneRoomCutscene === 'function') {
      meta.seenThroneRoom = true;
      saveMeta();
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      musicStopAll();
      playThroneRoomCutscene(() => loadBattle(ENCOUNTER_POOL[0]));
    } else {
      loadBattle(ENCOUNTER_POOL[0]);
    }
  });
}

function confirmStartPassive(passiveId){
  player.startPassive = passiveId;
  // Put start passive into active book
  if (player.spellbooks && player.spellbooks.length) {
    addPassiveToBook(passiveId);
  } else {
    player.passives = [passiveId];
  }
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
  _offerRunBookThenBattle();
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
