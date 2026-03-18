// ===== state.js =====
// ─── GAME STATE ──────────────────────────────────────────────────────────────

let playerName="",playerElement="",playerEmoji="",playerColor="";
let currentZoneElement="";  // tracks the element of the current zone/encounter for BG rendering
function _setZoneElement(z) {
  currentZoneElement = z;
  if (z) _runZoneReached = z;
}

const player = {
  hp:BASE_MAX_HP,
  attackPower:0, effectPower:0, defense:0,
  skillPoints:0, gold:0, inventory:[], spellbook:[],
  passives:[], startPassive:null,
  unlockedElements:[],
  baseMaxHPBonus:0,
  revives:0,          // set by talent tree (lives node) at run start
  bonusActions:0,     // permanent extra actions per turn (shop purchase)
  basicUpgrade:0, basicDmgMult:1.0,
  _hasteStart: false,
  _blockStart: 0,
  _extraStartSpell: false,
  _rhythmStar: -1,
  _quickHandsStar: -1,
  _gritHealOnRevive: 0,
  _healBonus: 0,
  basicDmgFlat: 0,
  _bannerStar: -1,
  // ── Spellbook system ──
  spellbooks: [],       // array of spellbook objects
  activeBookIdx: 0,     // which book is active
};

// ── SPELLBOOK HELPERS ─────────────────────────────────────────────────────────

const BOOK_SPELL_SLOTS_BASE  = 6;
const BOOK_PASSIVE_SLOTS_BASE = 2;

function makeSpellbook(element, name) {
  return {
    id:           element + '_basic',
    name:         name || (element + "'s Tome"),
    element:      element,
    spells:       [],
    passives:     [],
    spellSlots:   BOOK_SPELL_SLOTS_BASE,
    passiveSlots: BOOK_PASSIVE_SLOTS_BASE,
    effect:       null,  // on-switch combat effect (null = none for basic book)
  };
}

function activeBook() {
  if (!player.spellbooks.length) return null;
  return player.spellbooks[player.activeBookIdx] || player.spellbooks[0];
}

// Keep player.spellbook and player.passives in sync with active book
// Call this whenever activeBookIdx changes or books change
function syncActiveBook() {
  const book = activeBook();
  if (!book) return;
  player.spellbook = book.spells;
  player.passives  = book.passives;
}

// Override hasPassive to always read from active book
function hasPassive(id) {
  const book = activeBook();
  if (!book) return (player.passives||[]).includes(id);
  return (book.passives||[]).includes(id);
}

function initSpellbooksForRun() {
  const bookName = playerElement + "'s Tome";
  const book = makeSpellbook(playerElement, bookName);
  applyBookUpgrades(book);
  // Pre-fill the two built-in utility slots
  book.spells.push(
    { id:'_basic', emoji:'⚔', name:'Basic Attack', baseCooldown:1, currentCD:0, isBuiltin:true },
    { id:'_armor', emoji:'🛡', name:'Armor',        baseCooldown:0, currentCD:0, isBuiltin:true }
  );
  player.spellbooks  = [book];
  player.activeBookIdx = 0;
  syncActiveBook();
}

function switchBook(idx) {
  if (idx < 0 || idx >= player.spellbooks.length) return;
  if (idx === player.activeBookIdx) return;
  player.activeBookIdx = idx;
  syncActiveBook();
  const book = activeBook();
  log('📖 Switched to ' + book.name, 'player');
  // Trigger book effect if any
  if (book.effect && typeof book.effect === 'function') book.effect();
}

// Add a spell to the active book (with overflow check)
function addSpellToBook(spell, bookIdx) {
  const idx  = (bookIdx !== undefined) ? bookIdx : player.activeBookIdx;
  const book = player.spellbooks[idx];
  if (!book) return;
  if (book.spells.find(s => s.id === spell.id)) return; // already owned
  if (book.spells.length >= book.spellSlots) {
    // Full — trigger overflow removal UI
    _pendingOverflowSpell = spell;
    _pendingOverflowBookIdx = idx;
    showBookOverflowScreen(spell, book);
    return;
  }
  book.spells.push(spell);
  if (idx === player.activeBookIdx) syncActiveBook();
}

// Add a passive to the active book (with overflow check)
function addPassiveToBook(passiveId, bookIdx) {
  const idx  = (bookIdx !== undefined) ? bookIdx : player.activeBookIdx;
  const book = player.spellbooks[idx];
  if (!book) return;
  if (book.passives.includes(passiveId)) return;
  if (book.passives.length >= book.passiveSlots) {
    _pendingOverflowPassive     = passiveId;
    _pendingOverflowPassiveBook = idx;
    showPassiveOverflowScreen(passiveId, book);
    return;
  }
  book.passives.push(passiveId);
  if (idx === player.activeBookIdx) syncActiveBook();
}

// Overflow state
let _pendingOverflowSpell        = null;
let _pendingOverflowBookIdx      = 0;
let _pendingOverflowPassive      = null;
let _pendingOverflowPassiveBook  = 0;

function showBookOverflowScreen(newSpell, book) {
  const overlay = document.getElementById('book-overflow-overlay');
  if (!overlay) return;
  document.getElementById('boo-book-name').textContent  = book.name;
  document.getElementById('boo-new-spell').textContent  = newSpell.emoji + ' ' + newSpell.name;
  document.getElementById('boo-new-desc').textContent   = newSpell.desc;
  const list = document.getElementById('boo-spell-list');
  list.innerHTML = '';
  // Remove-from-current-book options
  book.spells.forEach((sp, i) => {
    const btn = document.createElement('button');
    btn.className = 'boo-spell-btn';
    btn.innerHTML = '<span>' + sp.emoji + ' ' + sp.name + '</span><span class="boo-remove-hint">Remove</span>';
    btn.onclick = () => resolveBookOverflow(i);
    list.appendChild(btn);
  });
  // Send-to-another-book options (only books that aren't full)
  const otherBooks = player.spellbooks
    .map((b, bi) => ({b, bi}))
    .filter(({b, bi}) => bi !== _pendingOverflowBookIdx);
  if (otherBooks.length > 0) {
    const sep = document.createElement('div');
    sep.style.cssText = 'font-size:.6rem;color:#4a6a9a;letter-spacing:.08em;text-transform:uppercase;margin-top:.5rem;margin-bottom:.2rem;';
    sep.textContent = '— or move to another book —';
    list.appendChild(sep);
    otherBooks.forEach(({b: ob, bi}) => {
      const btn = document.createElement('button');
      btn.className = 'boo-spell-btn';
      btn.style.borderColor = '#1a2a4a';
      btn.innerHTML = '<span>📖 ' + ob.name + '</span><span class="boo-remove-hint" style="color:#4a6a9a">Move</span>';
      btn.onclick = () => {
        const spell = _pendingOverflowSpell;
        _pendingOverflowSpell = null; _pendingOverflowBookIdx = 0;
        overlay.classList.remove('open');
        addSpellToBook(spell, bi); // may open overflow for target book
      };
      list.appendChild(btn);
    });
  }
  // Discard option
  const discardBtn = document.createElement('button');
  discardBtn.className = 'boo-spell-btn';
  discardBtn.style.cssText = 'margin-top:.5rem;border-color:#1a1a25;color:#666;';
  discardBtn.innerHTML = '<span>↩ Discard new spell</span>';
  discardBtn.onclick = () => discardOverflowSpell();
  list.appendChild(discardBtn);
  overlay.classList.add('open');
}

function resolveBookOverflow(removeIdx) {
  const book = player.spellbooks[_pendingOverflowBookIdx];
  if (!book || !_pendingOverflowSpell) return;
  book.spells.splice(removeIdx, 1);
  book.spells.push(_pendingOverflowSpell);
  if (_pendingOverflowBookIdx === player.activeBookIdx) syncActiveBook();
  _pendingOverflowSpell   = null;
  _pendingOverflowBookIdx = 0;
  const overlay = document.getElementById('book-overflow-overlay');
  if (overlay) overlay.classList.remove('open');
  if (typeof processNextLevelUp === 'function') processNextLevelUp();
}

function discardOverflowSpell() {
  _pendingOverflowSpell   = null;
  _pendingOverflowBookIdx = 0;
  const overlay = document.getElementById('book-overflow-overlay');
  if (overlay) overlay.classList.remove('open');
  if (typeof processNextLevelUp === 'function') processNextLevelUp();
}

// ── Passive overflow ──────────────────────────────────────────────────────────
function _lookupPassiveDef(passiveId) {
  let def = null;
  Object.values(PASSIVE_CHOICES || {}).forEach(arr => {
    const found = (arr || []).find(p => p.id === passiveId);
    if (found) def = found;
  });
  return def;
}

function showPassiveOverflowScreen(passiveId, book) {
  const overlay = document.getElementById('passive-overflow-overlay');
  if (!overlay) return;
  const def = _lookupPassiveDef(passiveId);
  document.getElementById('poo-book-name').textContent    = book.name;
  document.getElementById('poo-new-passive').textContent  = def ? (def.emoji + ' ' + def.title) : passiveId;
  document.getElementById('poo-new-desc').textContent     = def ? (def.desc || '') : '';
  const list = document.getElementById('poo-passive-list');
  list.innerHTML = '';
  // Replace options — one per existing passive
  book.passives.forEach((pid, i) => {
    const pdef = _lookupPassiveDef(pid);
    const btn = document.createElement('button');
    btn.className = 'boo-spell-btn';
    btn.innerHTML = '<span>' + (pdef ? pdef.emoji + ' ' + pdef.title : pid) + '</span><span class="boo-remove-hint">Replace</span>';
    btn.onclick = () => resolvePassiveOverflow(i);
    list.appendChild(btn);
  });
  // Decline option
  const declineBtn = document.createElement('button');
  declineBtn.className = 'boo-spell-btn';
  declineBtn.style.cssText = 'margin-top:.5rem;border-color:#1a1a25;color:#666;';
  declineBtn.innerHTML = '<span>↩ Decline new passive</span>';
  declineBtn.onclick = () => declinePassiveOverflow();
  list.appendChild(declineBtn);
  overlay.classList.add('open');
}

function resolvePassiveOverflow(removeIdx) {
  const book = player.spellbooks[_pendingOverflowPassiveBook];
  if (!book || !_pendingOverflowPassive) return;
  book.passives.splice(removeIdx, 1);
  book.passives.push(_pendingOverflowPassive);
  if (_pendingOverflowPassiveBook === player.activeBookIdx) syncActiveBook();
  _pendingOverflowPassive     = null;
  _pendingOverflowPassiveBook = 0;
  const overlay = document.getElementById('passive-overflow-overlay');
  if (overlay) overlay.classList.remove('open');
  if (typeof processNextLevelUp === 'function') processNextLevelUp();
}

function declinePassiveOverflow() {
  _pendingOverflowPassive     = null;
  _pendingOverflowPassiveBook = 0;
  const overlay = document.getElementById('passive-overflow-overlay');
  if (overlay) overlay.classList.remove('open');
  if (typeof processNextLevelUp === 'function') processNextLevelUp();
}

// Full set of status fields — single source of truth
const STATUS_DEFAULTS = {
  burnStacks:0, burnSourcePower:BASE_POWER,
  stunned:0,
  rootStacks:0, overgrowthStacks:0,
  foamStacks:0,
  shockStacks:0, shockPending:0,
  frostStacks:0, frozen:false, frozenIceHitPending:false,
  block:0,
  stoneStacks:0, stoneStanceThisTurn:false,
  firewallStacks:0,
  phaseTurns:0,
  lightningMult:2.0,
  greasefirePending:false,
  tidalShieldActive:false, deepCurrentActive:false,
  cryostasisActive:false,
  frozenGroundTurns:0, spreadingVinesTurns:0,
  debuffImmune:0, overchargePowerPending:0,
  chargeShotCharging:false,
  rageBoostPow:0, rageBoostTurns:0,
  // Plasma Charge system
  plasmaCharge:3, plasmaChargeHalf:0,
  plasmaShieldReduction:0,
  borrowedCharge:0,
  stallCharge:0, stallActive:false,
  singularityActive:false,
  // Air / Momentum system
  momentumStacks:0, momentumNoDecayNext:false,
  windWallActive:false, windWallPending:0,
  tornadoAoENext:false, nextTurnBonusActions:0,
};

const combat = {
  enemies:[], targetIdx:0, activeEnemyIdx:0,
  enemy:{}, enemyHP:0,
  playerTurn:false, over:false,
  tempDmgBonus:0, actionsLeft:0, basicCD:0,
  playerAirToggle:false, enemyAirToggle:false,
  actionQueue:[],
  summons:[],
  totalGold:0,
  turnInBattle:0,
  // Plasma
  plasmaSpendAmounts:{},    // per-spell stepper amounts, keyed by spell.id
  plasmaOvercharged:false,  // true when charge >= 20 at turn start
  plasmaChargeReserved:0,   // charge committed by queued actions this turn
};

const status = {
  player:{ ...STATUS_DEFAULTS },
  enemy: { ...STATUS_DEFAULTS },
};

function freshEnemyStatus(){
  return { ...STATUS_DEFAULTS };
}

function setActiveEnemy(idx){
  if(!combat.enemies[idx]) return;
  combat.activeEnemyIdx = idx;
  combat.enemy = combat.enemies[idx];
  status.enemy = combat.enemies[idx].status;
}

let battleNumber=1;
let currentGymIdx = 0;          // which gym we're currently working toward (0-7)
let _runDmgDealt  = 0;          // total damage player dealt this run
let _runDmgTaken  = 0;          // total damage player took this run
let _runRoomsCompleted = 0;     // rooms cleared this run
let _runZoneReached = '';       // last zone element entered
let zoneBattleCount = 0;        // battles fought in current gym's zone (resets after each gym)
let _zoneRivalDefeated = false; // rival fight doesn't count as a zone battle slot
let gymSkips = 0;               // times player skipped gym this zone (resets per gym)
let gymDefeated = false;        // true when ALL 8 gyms are beaten
let pendingLevelUps=[];

// Artifact-related run fields (reset each run, populated by applyArtifactBonuses)
// These live on player so they're cleared by beginRun's Object.assign


