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
  _activeBookAura: null,   // {atk,def,efx,catalogueId} currently applied aura
  _chosenStartBookId: null, // catalogue ID chosen at run start (null = default)
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
    isPlasmaBook: false, // true only for the dedicated Plasma abilities book
  };
}


// Create a run-book instance from a catalogue entry
function makeBookInstance(catalogueId) {
  if (typeof SPELLBOOK_CATALOGUE === 'undefined') return null;
  const cat = SPELLBOOK_CATALOGUE[catalogueId];
  if (!cat) return null;
  const meta = getMeta();
  const upgradeLevel = (meta.bookUpgradeLevels || {})[catalogueId] || 0;
  const base = makeSpellbook(cat.element || 'Neutral', cat.name);
  applyBookUpgrades(base, catalogueId); // apply per-book slot upgrades
  base.id = catalogueId;
  base.catalogueId = catalogueId;
  base.upgradeLevel = upgradeLevel;
  base.emoji = cat.emoji || '📖';
  // Apply slot modifiers from catalogue
  if ((cat.spellSlots || 0) !== 0) base.spellSlots = Math.max(3, base.spellSlots + cat.spellSlots);
  if ((cat.passiveSlots || 0) !== 0) base.passiveSlots = Math.max(1, base.passiveSlots + cat.passiveSlots);
  // Wire on-switch-to effect
  const _lvl = upgradeLevel;
  base.effect = () => { if (cat.onSwitchTo) cat.onSwitchTo(_lvl); };
  return base;
}

// Apply a catalogue book's aura to player stats (call when switching to or initializing a book)
function _applyBookAuraToPlayer(book) {
  _removeBookAuraFromPlayer(); // always clear old aura first
  if (!book || !book.catalogueId) return;
  if (typeof SPELLBOOK_CATALOGUE === 'undefined') return;
  const cat = SPELLBOOK_CATALOGUE[book.catalogueId];
  if (!cat || !cat.aura) return;
  const aura = cat.aura(book.upgradeLevel || 0);
  const atk = aura.atk || 0;
  const def = aura.def || 0;
  const efx = aura.efx || 0;
  if (atk !== 0) player.attackPower += atk;
  if (def !== 0) player.defense     += def;
  if (efx !== 0) player.effectPower += efx;
  player._mutualEnemyAura = aura.mutualAura ? { atk, def, efx } : null;
  player._activeBookAura = { atk, def, efx, catalogueId: book.catalogueId };
}

// Remove the currently applied book aura from player stats
function _removeBookAuraFromPlayer() {
  if (!player._activeBookAura) return;
  player.attackPower -= (player._activeBookAura.atk || 0);
  player.defense     -= (player._activeBookAura.def || 0);
  player.effectPower -= (player._activeBookAura.efx || 0);
  player._mutualEnemyAura = null;
  player._activeBookAura = null;
}

// Returns the index of the plasma-only book, or -1 if none exists
function plasmaBookIdx() {
  return player.spellbooks.findIndex(b => b.isPlasmaBook);
}

// Creates a dedicated Plasma abilities book if one doesn't exist yet
function ensurePlasmaBook() {
  if (player.spellbooks.some(b => b.isPlasmaBook)) return;
  const pb = makeSpellbook('Plasma', 'Plasma Abilities');
  pb.id = 'plasma_abilities';
  pb.isPlasmaBook = true;
  player.spellbooks.push(pb);
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
  _applyBookAuraToPlayer(book);
}

// Override hasPassive to always read from active book
function hasPassive(id) {
  const book = activeBook();
  if (!book) return (player.passives||[]).includes(id);
  return (book.passives||[]).includes(id);
}

function initSpellbooksForRun() {
  // Plasma players use "General" for the non-plasma book since their elemental identity
  // is expressed through the dedicated Plasma Abilities book
  const bookName = playerElement === 'Plasma' ? 'General' : (playerElement + "'s Tome");
  const book = makeSpellbook(playerElement, bookName);
  applyBookUpgrades(book);
  // Pre-fill the two built-in utility slots
  book.spells.push(
    { id:'_basic', emoji:'⚔', name:'Basic Attack', baseCooldown:1, currentCD:0, isBuiltin:true },
    { id:'_armor', emoji:'🛡', name:'Armor',        baseCooldown:0, currentCD:0, isBuiltin:true }
  );
  player.spellbooks  = [book];
  player.activeBookIdx = 0;
  // Plasma players always start with a dedicated Plasma Abilities book
  if (playerElement === 'Plasma') {
    ensurePlasmaBook();
  }
  syncActiveBook();
}

function switchBook(idx) {
  if (idx < 0 || idx >= player.spellbooks.length) return;
  if (idx === player.activeBookIdx) return;
  // Notify current book we're leaving
  const oldBook = activeBook();
  if (oldBook && oldBook.catalogueId && typeof SPELLBOOK_CATALOGUE !== 'undefined') {
    const oldCat = SPELLBOOK_CATALOGUE[oldBook.catalogueId];
    if (oldCat && oldCat.onSwitchAway) oldCat.onSwitchAway(oldBook.upgradeLevel || 0);
  }
  player.activeBookIdx = idx;
  syncActiveBook(); // also applies new book's aura
  const book = activeBook();
  log('📖 Switched to ' + book.name, 'player');
  // Trigger book effect if any (includes catalogue onSwitchTo via makeBookInstance)
  if (book.effect && typeof book.effect === 'function') book.effect();
}

// Add a spell to the active book (with overflow check)
// Plasma abilities are always routed to the plasma book regardless of bookIdx
function addSpellToBook(spell, bookIdx) {
  // Plasma abilities belong exclusively in the plasma book
  if (spell.isPlasmaAbility) {
    ensurePlasmaBook();
    const pIdx = plasmaBookIdx();
    if (pIdx >= 0) {
      const pb = player.spellbooks[pIdx];
      if (pb.spells.find(s => s.id === spell.id)) return; // already owned
      if (pb.spells.length >= pb.spellSlots) {
        _pendingOverflowSpell = spell;
        _pendingOverflowBookIdx = pIdx;
        showBookOverflowScreen(spell, pb);
        return;
      }
      pb.spells.push(spell);
      if (pIdx === player.activeBookIdx) syncActiveBook();
    }
    return;
  }

  const idx  = (bookIdx !== undefined) ? bookIdx : player.activeBookIdx;
  // Never route non-plasma spells into the plasma book
  const targetIdx = (player.spellbooks[idx] && player.spellbooks[idx].isPlasmaBook) ? 0 : idx;
  const book = player.spellbooks[targetIdx];
  if (!book) return;
  if (book.spells.find(s => s.id === spell.id)) return; // already owned
  if (book.spells.length >= book.spellSlots) {
    // Full — trigger overflow removal UI
    _pendingOverflowSpell = spell;
    _pendingOverflowBookIdx = targetIdx;
    showBookOverflowScreen(spell, book);
    return;
  }
  book.spells.push(spell);
  if (targetIdx === player.activeBookIdx) syncActiveBook();
}

// Add a passive to the active book (with overflow check)
function addPassiveToBook(passiveId, bookIdx) {
  // Plasma passives always go to the plasma book
  if (bookIdx === undefined) {
    const isPlasmaPassive = (PASSIVE_CHOICES['Plasma']||[]).some(p => p.id === passiveId);
    if (isPlasmaPassive) {
      ensurePlasmaBook();
      bookIdx = plasmaBookIdx();
    }
  }

  const idx  = (bookIdx !== undefined) ? bookIdx : player.activeBookIdx;
  // Never route a non-plasma passive into the plasma book
  const targetIdx = (player.spellbooks[idx] && player.spellbooks[idx].isPlasmaBook) ? 0 : idx;
  const book = player.spellbooks[targetIdx];
  if (!book) return;
  if (book.passives.includes(passiveId)) return;
  if (book.passives.length >= book.passiveSlots) {
    _pendingOverflowPassive     = passiveId;
    _pendingOverflowPassiveBook = targetIdx;
    showPassiveOverflowScreen(passiveId, book);
    return;
  }
  book.passives.push(passiveId);
  if (passiveId === 'air_tailwind') player.attackPower += 15;
  if (targetIdx === player.activeBookIdx) syncActiveBook();
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
  // Send-to-another-book options (only books that aren't full and accept this spell type)
  // Plasma abilities can only live in the plasma book; non-plasma spells cannot enter the plasma book
  const isPlasmAbil = !!(_pendingOverflowSpell && _pendingOverflowSpell.isPlasmaAbility);
  const otherBooks = player.spellbooks
    .map((b, bi) => ({b, bi}))
    .filter(({b, bi}) => {
      if (bi === _pendingOverflowBookIdx) return false;
      if (isPlasmAbil) return false;       // plasma abilities can't move to another book
      if (b.isPlasmaBook) return false;    // non-plasma spells can't enter plasma book
      return true;
    });
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
  shockStacks:0,
  frostStacks:0, frozen:false, nextTurnActionPenalty:0,
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


