// ===== artifacts.js =====
// ─── ARTIFACT SYSTEM ─────────────────────────────────────────────────────────
// Permanent meta-progression items earned by beating gym leaders.
// Each artifact has 3 upgrade tiers (★ ★★ ★★★), earned after 25 rooms of use.
// Only ONE artifact is active per run — equip it in the Vault between runs.

// ── Catalogue ─────────────────────────────────────────────────────────────────
// desc[0] = base, desc[1] = ★, desc[2] = ★★, desc[3] = ★★★
// applyToRun(star) — called once at run start, modifies player state
// applyToCombat — optional fn called each startRound, returns nothing
const ARTIFACT_CATALOGUE = {

  iron_will: {
    id:'iron_will', name:'Iron Will', emoji:'⚔️',
    flavor:'Tempered through endless battle.',
    desc:[
      '+5 ATK at run start.',
      '+8 ATK at run start.',
      '+12 ATK at run start.',
      '+15 ATK at run start.',
    ],
    applyToRun(star){ player.attackPower += [5,8,12,15][star]; },
  },

  focus_lens: {
    id:'focus_lens', name:'Focus Lens', emoji:'🔮',
    flavor:'Sharpens every enchantment you cast.',
    desc:[
      '+5 Effect Power at run start.',
      '+8 EFX at run start.',
      '+12 EFX at run start.',
      '+15 EFX at run start.',
    ],
    applyToRun(star){ player.effectPower += [5,8,12,15][star]; },
  },

  hardy_soul: {
    id:'hardy_soul', name:'Hardy Soul', emoji:'❤️',
    flavor:'The will to survive outlasts any wound.',
    desc:[
      '+20 Max HP per run.',
      '+35 Max HP per run.',
      '+55 Max HP per run.',
      '+80 Max HP per run.',
    ],
    applyToRun(star){ player.baseMaxHPBonus = (player.baseMaxHPBonus||0) + [20,35,55,80][star]; },
  },

  battle_rhythm: {
    id:'battle_rhythm', name:'Battle Rhythm', emoji:'🥁',
    flavor:'Every third heartbeat — strike.',
    desc:[
      '+1 action every 3 turns.',
      '+1 action every 2 turns.',
      '+1 action every 2 turns + +2 flat ATK.',
      '+1 extra action every turn.',
    ],
    applyToRun(star){ player._rhythmStar = star; }, // handled in startRound
  },

  gold_hoard: {
    id:'gold_hoard', name:'Gold Hoard', emoji:'💰',
    flavor:'A mercenary always starts well-stocked.',
    desc:[
      'Start each run with 50 gold.',
      'Start with 80 gold.',
      'Start with 120 gold.',
      'Start with 200 gold.',
    ],
    applyToRun(star){ player.gold += [50,80,120,200][star]; },
  },

  quick_hands: {
    id:'quick_hands', name:'Quick Hands', emoji:'🤲',
    flavor:'The first blow decides everything.',
    desc:[
      '+1 action in the first battle only.',
      '+1 action for first 3 battles.',
      '+1 action for first 5 battles.',
      'Permanently +1 action every turn.',
    ],
    applyToRun(star){ player._quickHandsStar = star; }, // handled in startRound
  },

  survivors_grit: {
    id:'survivors_grit', name:"Survivor's Grit", emoji:'🛡️',
    flavor:'Death is just another obstacle.',
    desc:[
      '+1 extra life per run.',
      '+2 extra lives per run.',
      '+2 lives + heal 50 HP on each revive.',
      '+3 extra lives per run.',
    ],
    applyToRun(star){
      player.revives = (player.revives||3) + [1,2,2,3][star];
      if(star >= 2) player._gritHealOnRevive = 50;
    },
  },

  ember_heart: {
    id:'ember_heart', name:'Ember Heart', emoji:'🩷',
    flavor:'Even fire can nourish.',
    desc:[
      'All healing +10% this run.',
      '+20% healing.',
      '+30% healing.',
      '+50% healing.',
    ],
    applyToRun(star){ player._healBonus = (player._healBonus||0) + [0.10,0.20,0.30,0.50][star]; },
  },

  storm_core: {
    id:'storm_core', name:'Storm Core', emoji:'🌩️',
    flavor:'Even a basic strike carries the storm\'s fury.',
    desc:[
      '+3 flat damage on Basic Spell.',
      '+5 flat damage.',
      '+8 flat damage.',
      '+12 flat damage.',
    ],
    applyToRun(star){ player.basicDmgFlat = (player.basicDmgFlat||0) + [3,5,8,12][star]; },
  },

  iron_skin: {
    id:'iron_skin', name:'Iron Skin', emoji:'🪨',
    flavor:'Forged hide takes the edge off everything.',
    desc:[
      '+3 Defense at run start.',
      '+5 Defense.',
      '+8 Defense.',
      '+12 Defense.',
    ],
    applyToRun(star){ player.defense = (player.defense||0) + [3,5,8,12][star]; },
  },

  warlords_banner: {
    id:'warlords_banner', name:"Warlord's Banner", emoji:'🚩',
    flavor:'Victory fuels the next charge.',
    desc:[
      'Gain 5 gold on every battle win.',
      'Gain 10 gold on every win.',
      'Gain 10 gold + 1 ATK on every win.',
      'Gain 15 gold + 2 ATK on every win.',
    ],
    applyToRun(star){ player._bannerStar = star; }, // handled in endBattle
  },
};

// Ordered by gym — gym 1 unlock gives artifact index 0, gym 2 → index 1, etc.
const ARTIFACT_ORDER = [
  'iron_will',
  'focus_lens',
  'hardy_soul',
  'battle_rhythm',
  'gold_hoard',
  'quick_hands',
  'survivors_grit',
  'ember_heart',
  'storm_core',
  'iron_skin',
  'warlords_banner',
];

// ── Meta Persistence (slot-aware) ─────────────────────────────────────────────
// activeSaveSlot is declared in main.js (loads after this file).
// All calls to getMeta/saveMeta happen at runtime (not module init), so by the
// time any function runs, activeSaveSlot is already defined.
const META_KEY_BASE = 'elemental_meta_v1_slot';

function _metaKey() {
  return META_KEY_BASE + (activeSaveSlot || 0);
}

function _metaCache() {
  if (!window._metaBySlot) window._metaBySlot = {};
  return { slot: activeSaveSlot || 0, cache: window._metaBySlot };
}

function getMeta() {
  const { slot, cache } = _metaCache();
  if (!cache[slot]) {
    try {
      const raw = localStorage.getItem(_metaKey());
      cache[slot] = raw ? JSON.parse(raw)
        : { artifacts:[], totalRuns:0, bestLevel:0, gymsBeaten:0, runHistory:[], activeArtifactId:null, unseenArtifacts:[] };
    } catch(e) {
      cache[slot] = { artifacts:[], totalRuns:0, bestLevel:0, gymsBeaten:0, runHistory:[], activeArtifactId:null, unseenArtifacts:[], ownedBookIds:[], bookUpgradeLevels:{}, unseenBookIds:[] };
    }
  }
  return cache[slot];
}

function saveMeta() {
  try { localStorage.setItem(_metaKey(), JSON.stringify(getMeta())); } catch(e) {}
}

// Called at run start — apply only the active artifact's bonuses
function applyArtifactBonuses() {
  const meta = getMeta();
  const activeId = meta.activeArtifactId;
  if (!activeId) return;
  const a = (meta.artifacts||[]).find(x => x.id === activeId);
  if (!a) return;
  const def = ARTIFACT_CATALOGUE[a.id];
  if (def) def.applyToRun(a.star||0);
}

// Called when a gym is beaten — 65% chance to discover a new random artifact.
// Returns the new artifact object if one was discovered, or null.
function onGymDefeated(gymIdx) {
  const meta = getMeta();
  const prevGymsBeaten = meta.gymsBeaten || 0;
  meta.gymsBeaten = Math.max(prevGymsBeaten, gymIdx+1);

  // First time beating this gym — bonus 10 phos
  if (gymIdx + 1 > prevGymsBeaten) {
    meta.phos      = (meta.phos      || 0) + 10;
    meta.phosTotal = (meta.phosTotal || 0) + 10;
    if (typeof log === 'function') log(`✦ First gym clear! +10 Phos`, 'win');
  }
  if (!meta.artifacts) meta.artifacts = [];
  if (!meta.unseenArtifacts) meta.unseenArtifacts = [];

  // Find all artifact IDs not yet discovered
  const discovered = new Set((meta.artifacts).map(a => a.id));
  const undiscovered = ARTIFACT_ORDER.filter(id => !discovered.has(id));
  if (!undiscovered.length || Math.random() > 0.65) {
    saveMeta();
    return null; // no discovery this time
  }

  // Pick a random undiscovered artifact
  const chosenId = undiscovered[Math.floor(Math.random() * undiscovered.length)];
  const target = { id: chosenId, star: 0, roomsUsed: 0 };
  meta.artifacts.push(target);
  meta.unseenArtifacts.push(chosenId);
  saveMeta();
  window._lastArtifactUnlock = target;
  return target;
}

// Equip an artifact as the single active one
function equipArtifact(id) {
  const meta = getMeta();
  meta.activeArtifactId = id;
  saveMeta();
}

// Unequip the active artifact
function unequipArtifact() {
  const meta = getMeta();
  meta.activeArtifactId = null;
  saveMeta();
}

// Returns true if there are newly discovered artifacts the player hasn't seen
function hasUnseenArtifact() {
  const meta = getMeta();
  return (meta.unseenArtifacts || []).length > 0;
}

// Called when the player opens the vault — clears unseen notification
function markArtifactsSeen() {
  const meta = getMeta();
  meta.unseenArtifacts = [];
  saveMeta();
}

// Called when the player opens the library — clears unseen book notification
function markBooksSeen() {
  const meta = getMeta();
  meta.unseenBookIds = [];
  saveMeta();
}

// Called after each non-gym room is cleared — progress the ACTIVE artifact only
function incrementArtifactRooms() {
  const meta = getMeta();
  const activeId = meta.activeArtifactId;
  if (!activeId) return null;
  const a = (meta.artifacts||[]).find(x => x.id === activeId);
  if (!a || a.star >= 3) return null;
  a.roomsUsed = (a.roomsUsed||0) + 1;
  if (a.roomsUsed >= 25) {
    a.star++;
    a.roomsUsed = 0;
    saveMeta();
    return a;
  }
  saveMeta();
  return null;
}

// Called after each battle win — awards 10 phos per room cleared past the previous record.
// Updates meta.bestLevel immediately so each new room in a run earns separately.
function checkBattleRecord() {
  if (typeof sandboxMode !== 'undefined' && sandboxMode) return;
  const meta = getMeta();
  const prev = meta.bestLevel || 0;
  if (battleNumber > prev) {
    meta.bestLevel = battleNumber;
    meta.phos      = (meta.phos || 0) + 3;
    meta.phosTotal = (meta.phosTotal || 0) + 3;
    saveMeta();
    if (typeof log === 'function') log(`✦ Room ${battleNumber} record! +3 Phos`, 'win');
  }
}

// Called on run end — save stats
function saveRunStats() {
  const meta = getMeta();
  const phosEarned = calcPhosEarned();
  meta.phos      = (meta.phos||0) + phosEarned;
  meta.phosTotal = (meta.phosTotal||0) + phosEarned;
  meta.totalRuns  = (meta.totalRuns||0) + 1;
  meta.bestLevel  = Math.max(meta.bestLevel||0, battleNumber);
  if(!meta.runHistory) meta.runHistory = [];
  meta.runHistory.unshift({
    element:  playerElement || '?',
    emoji:    playerEmoji   || '⚔',
    battles:  battleNumber,
    gold:     player.gold,
    spells:   player.spellbook.length,
    phos:     phosEarned,
    date:     new Date().toLocaleDateString(),
    dmgDealt: _runDmgDealt,
    dmgTaken: _runDmgTaken,
    rooms:    _runRoomsCompleted,
    zone:     _runZoneReached || playerElement || '?',
  });
  if(meta.runHistory.length > 15) meta.runHistory.pop();
  saveMeta();
  return phosEarned;
}

// Star display helpers
function starStr(star) {
  if(star === 0) return '';
  return ' ' + '★'.repeat(star);
}
function starColor(star) {
  return ['#888','#c8a030','#e8d060','#00ccff'][Math.min(star,3)];
}

// ── Combat hooks (called from startRound / endBattle) ─────────────────────────

// Returns extra actions from the active artifact for player this turn
function artifactExtraActions() {
  const meta = getMeta();
  const activeId = meta.activeArtifactId;
  if (!activeId) return 0;
  const a = (meta.artifacts||[]).find(x => x.id === activeId);
  if (!a) return 0;
  const star = a.star||0;
  let extra = 0;

  if (activeId === 'battle_rhythm') {
    const interval = star >= 3 ? 1 : (star >= 1 ? 2 : 3);
    const t = combat.turnInBattle||0;
    if (t > 0 && t % interval === 0) extra++;
  }

  if (activeId === 'quick_hands') {
    if (star >= 3) {
      extra++;
    } else {
      const battleLimit = [1,3,5][Math.min(star,2)];
      if (battleNumber <= battleLimit) extra++;
    }
  }

  return extra;
}

// Called from endBattle(won=true) — warlord's banner (only if active)
function applyBannerReward() {
  const meta = getMeta();
  if (meta.activeArtifactId !== 'warlords_banner') return;
  const a = (meta.artifacts||[]).find(x => x.id === 'warlords_banner');
  if (!a) return;
  const star = a.star||0;
  const gold = [5,10,10,15][star];
  player.gold += gold;
  log(`🚩 Warlord's Banner: +${gold} gold!`, 'item');
  if (star >= 2) {
    const atkBonus = star >= 3 ? 2 : 1;
    player.attackPower += atkBonus;
    log(`🚩 Banner: +${atkBonus} ATK!`, 'item');
    updateStatsUI();
  }
}


