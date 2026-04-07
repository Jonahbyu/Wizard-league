// ===== encounters.js =====
// ─── ENCOUNTER DATA ─────────────────────────────────────────────────────────
// Encounters are grouped by CAMP TYPE — the player sees 3 distinct elemental
// camps each battle and chooses which to fight. All are roughly equal difficulty.

// Wizard hat SVG icon per element — rendered inline on enemy cards
function elemHatSVG(element, size=24) {
  const cols = {
    Fire:'#FF4500', Water:'#1E90FF', Ice:'#A0EFFF', Lightning:'#FFD700',
    Earth:'#8B6914', Nature:'#32CD32', Plasma:'#DA70D6', Air:'#B0E0E6', Neutral:'#888'
  };
  const c = cols[element] || '#888';
  // ViewBox has extra space at bottom for brim (0 0 24 26)
  return `<svg width="${size}" height="${Math.round(size*1.1)}" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;overflow:visible;">
    <polygon points="12,1 19,19 5,19" fill="${c}" opacity=".92"/>
    <ellipse cx="12" cy="21" rx="9" ry="3" fill="${c}" opacity=".75"/>
    <polygon points="12,1 19,19 5,19" fill="none" stroke="rgba(0,0,0,.2)" stroke-width=".8"/>
    <ellipse cx="10" cy="10" rx="2" ry="1.5" fill="white" opacity=".2" transform="rotate(-20 10 10)"/>
  </svg>`;
}

const ENCOUNTER_POOL = [
  // ── FIRE ──────────────────────────────────────────────────────────────────
  { campType:'Fire', name:'Emberweave',  emoji:'🔥', element:'Fire', color:'#FF4500', enemyMaxHP:95,  enemyDmg:22, gold:42, type:'wizard' },
  { campType:'Fire', name:'Ashcaller',   emoji:'🔥', element:'Fire', color:'#FF4500', enemyMaxHP:110, enemyDmg:20, gold:44, type:'wizard' },
  { campType:'Fire', name:'Pyromancer',  emoji:'🔥', element:'Fire', color:'#FF4500', enemyMaxHP:130, enemyDmg:18, gold:48, type:'wizard' },

  // ── WATER ──────────────────────────────────────────────────────────────────
  { campType:'Water', name:'Tidecaller',  emoji:'💧', element:'Water', color:'#1E90FF', enemyMaxHP:90,  enemyDmg:20, gold:40, type:'wizard' },
  { campType:'Water', name:'Brineweave',  emoji:'💧', element:'Water', color:'#1E90FF', enemyMaxHP:115, enemyDmg:18, gold:42, type:'wizard' },
  { campType:'Water', name:'Abyssmancer', emoji:'💧', element:'Water', color:'#1E90FF', enemyMaxHP:100, enemyDmg:24, gold:46, type:'wizard' },

  // ── ICE ───────────────────────────────────────────────────────────────────
  { campType:'Ice', name:'Frostbinder',  emoji:'❄️', element:'Ice', color:'#A0EFFF', enemyMaxHP:95,  enemyDmg:22, gold:42, type:'wizard' },
  { campType:'Ice', name:'Glacialmancer',emoji:'❄️', element:'Ice', color:'#A0EFFF', enemyMaxHP:125, enemyDmg:18, gold:44, type:'wizard' },
  { campType:'Ice', name:'Rimecaster',   emoji:'❄️', element:'Ice', color:'#A0EFFF', enemyMaxHP:105, enemyDmg:22, gold:43, type:'wizard' },

  // ── LIGHTNING ─────────────────────────────────────────────────────────────
  { campType:'Lightning', name:'Stormweave',   emoji:'⚡', element:'Lightning', color:'#FFD700', enemyMaxHP:85,  enemyDmg:26, gold:44, type:'wizard' },
  { campType:'Lightning', name:'Voltmancer',   emoji:'⚡', element:'Lightning', color:'#FFD700', enemyMaxHP:100, enemyDmg:24, gold:46, type:'wizard' },
  { campType:'Lightning', name:'Thunderscribe',emoji:'⚡', element:'Lightning', color:'#FFD700', enemyMaxHP:110, enemyDmg:22, gold:43, type:'wizard' },

  // ── EARTH ─────────────────────────────────────────────────────────────────
  { campType:'Earth', name:'Geomancer',   emoji:'🪨', element:'Earth', color:'#8B6914', enemyMaxHP:120, enemyDmg:18, gold:40, type:'wizard' },
  { campType:'Earth', name:'Stonewarden', emoji:'🪨', element:'Earth', color:'#8B6914', enemyMaxHP:145, enemyDmg:16, gold:42, type:'wizard' },
  { campType:'Earth', name:'Terramancer', emoji:'🪨', element:'Earth', color:'#8B6914', enemyMaxHP:110, enemyDmg:22, gold:44, type:'wizard' },

  // ── NATURE ────────────────────────────────────────────────────────────────
  { campType:'Nature', name:'Groveweave',  emoji:'🌿', element:'Nature', color:'#32CD32', enemyMaxHP:95,  enemyDmg:20, gold:42, type:'wizard' },
  { campType:'Nature', name:'Thornmancer', emoji:'🌿', element:'Nature', color:'#32CD32', enemyMaxHP:120, enemyDmg:18, gold:44, type:'wizard' },
  { campType:'Nature', name:'Rootbinder',  emoji:'🌿', element:'Nature', color:'#32CD32', enemyMaxHP:135, enemyDmg:16, gold:43, type:'wizard' },

  // ── PLASMA ────────────────────────────────────────────────────────────────
  { campType:'Plasma', name:'Voidweave',   emoji:'🔮', element:'Plasma', color:'#DA70D6', enemyMaxHP:90,  enemyDmg:26, gold:46, type:'wizard' },
  { campType:'Plasma', name:'Plasmancer',  emoji:'🔮', element:'Plasma', color:'#DA70D6', enemyMaxHP:85,  enemyDmg:28, gold:48, type:'wizard' },
  { campType:'Plasma', name:'Riftscribe',  emoji:'🔮', element:'Plasma', color:'#DA70D6', enemyMaxHP:100, enemyDmg:24, gold:44, type:'wizard' },

  // ── AIR ───────────────────────────────────────────────────────────────────
  { campType:'Air', name:'Zephyrcaster', emoji:'🌀', element:'Air', color:'#B0E0E6', enemyMaxHP:80,  enemyDmg:28, gold:44, type:'wizard' },
  { campType:'Air', name:'Galecaller',   emoji:'🌀', element:'Air', color:'#B0E0E6', enemyMaxHP:90,  enemyDmg:26, gold:43, type:'wizard' },
  { campType:'Air', name:'Skymancer',    emoji:'🌀', element:'Air', color:'#B0E0E6', enemyMaxHP:85,  enemyDmg:26, gold:46, type:'wizard' },
];

// Pack encounters
const PACK_POOL = [
  { campType:'Pack', element:'Fire', packName:'Ember Coven', isPack:true, gold:70,
    members:[
      { name:'Ashweave',   emoji:'🔥', element:'Fire', color:'#FF4500', enemyMaxHP:80,  enemyDmg:16, type:'wizard' },
      { name:'Ashweave',   emoji:'🔥', element:'Fire', color:'#FF4500', enemyMaxHP:80,  enemyDmg:16, type:'wizard' },
      { name:'Pyromancer', emoji:'🔥', element:'Fire', color:'#FF4500', enemyMaxHP:110, enemyDmg:20, type:'wizard' },
    ]},
  { campType:'Pack', element:'Water', packName:'Tidal Coven', isPack:true, gold:65,
    members:[
      { name:'Brineweave',  emoji:'💧', element:'Water', color:'#1E90FF', enemyMaxHP:65, enemyDmg:14, type:'wizard' },
      { name:'Brineweave',  emoji:'💧', element:'Water', color:'#1E90FF', enemyMaxHP:65, enemyDmg:14, type:'wizard' },
      { name:'Tidecaller',  emoji:'💧', element:'Water', color:'#1E90FF', enemyMaxHP:90, enemyDmg:18, type:'wizard' },
    ]},
  { campType:'Pack', element:'Ice', packName:'Frost Coven', isPack:true, gold:72,
    members:[
      { name:'Frostbinder',   emoji:'❄️', element:'Ice', color:'#A0EFFF', enemyMaxHP:85,  enemyDmg:18, type:'wizard' },
      { name:'Frostbinder',   emoji:'❄️', element:'Ice', color:'#A0EFFF', enemyMaxHP:85,  enemyDmg:18, type:'wizard' },
      { name:'Glacialmancer', emoji:'❄️', element:'Ice', color:'#A0EFFF', enemyMaxHP:120, enemyDmg:22, type:'wizard' },
    ]},
  { campType:'Pack', element:'Lightning', packName:'Storm Coven', isPack:true, gold:68,
    members:[
      { name:'Stormweave',    emoji:'⚡', element:'Lightning', color:'#FFD700', enemyMaxHP:75,  enemyDmg:22, type:'wizard' },
      { name:'Stormweave',    emoji:'⚡', element:'Lightning', color:'#FFD700', enemyMaxHP:75,  enemyDmg:22, type:'wizard' },
      { name:'Thunderscribe', emoji:'⚡', element:'Lightning', color:'#FFD700', enemyMaxHP:100, enemyDmg:24, type:'wizard' },
    ]},
  { campType:'Pack', element:'Nature', packName:'Grove Coven', isPack:true, gold:74,
    members:[
      { name:'Groveweave',  emoji:'🌿', element:'Nature', color:'#32CD32', enemyMaxHP:90,  enemyDmg:18, type:'wizard' },
      { name:'Groveweave',  emoji:'🌿', element:'Nature', color:'#32CD32', enemyMaxHP:90,  enemyDmg:18, type:'wizard' },
      { name:'Rootbinder',  emoji:'🌿', element:'Nature', color:'#32CD32', enemyMaxHP:130, enemyDmg:16, type:'wizard' },
    ]},
  { campType:'Pack', element:'Plasma', packName:'Void Coven', isPack:true, gold:75,
    members:[
      { name:'Voidweave',  emoji:'🔮', element:'Plasma', color:'#DA70D6', enemyMaxHP:80, enemyDmg:22, type:'wizard' },
      { name:'Voidweave',  emoji:'🔮', element:'Plasma', color:'#DA70D6', enemyMaxHP:80, enemyDmg:22, type:'wizard' },
      { name:'Plasmancer', emoji:'🔮', element:'Plasma', color:'#DA70D6', enemyMaxHP:80, enemyDmg:26, type:'wizard' },
    ]},
  { campType:'Pack', element:'Earth', packName:'Stone Coven', isPack:true, gold:70,
    members:[
      { name:'Geomancer',   emoji:'🪨', element:'Earth', color:'#8B6914', enemyMaxHP:110, enemyDmg:16, type:'wizard' },
      { name:'Stonewarden', emoji:'🪨', element:'Earth', color:'#8B6914', enemyMaxHP:130, enemyDmg:14, type:'wizard' },
    ]},
];

// ── CAMP META (display) ───────────────────────────────────────────────────────
const CAMP_META = {
  Fire:      { color:'#FF4500', icon:'🔥', label:'Fire Encampment'      },
  Water:     { color:'#1E90FF', icon:'💧', label:'Water Encampment'     },
  Ice:       { color:'#A0EFFF', icon:'❄️', label:'Ice Encampment'       },
  Lightning: { color:'#FFD700', icon:'⚡', label:'Storm Encampment'     },
  Earth:     { color:'#8B6914', icon:'🪨', label:'Earth Encampment'     },
  Nature:    { color:'#32CD32', icon:'🌿', label:'Nature Encampment'    },
  Plasma:    { color:'#DA70D6', icon:'🔮', label:'Void Encampment'      },
  Air:       { color:'#B0E0E6', icon:'🌀', label:'Air Encampment'       },
  Pack:      { color:'#cc8844', icon:'👥', label:'Pack Encounter'       },
};

// ── ZONE EFFECTS (applied by enemies in zone battles) ────────────────────────
// Each zone element adds a status effect on every enemy basic attack.
const ZONE_EFFECTS = {
  Fire:      { desc:'🔥 +2 Burn per hit',      apply(defSide){ applyBurn('enemy', 2, Math.floor(battleNumber*1.5)); }},
  Ice:       { desc:'❄️ +2 Frost per hit',     apply(defSide){ applyFrost('enemy','player',2); }},
  Lightning: { desc:'⚡ +1 Shock per hit',     apply(defSide){ status[defSide].shockStacks=(status[defSide].shockStacks||0)+1; log('⚡ Zone Shock +1','status'); }},
  Earth:     { desc:'🪨 Attacker gains Stone', apply(defSide,attIdx){ if(combat.enemies[attIdx]?.alive) addStoneStacks('enemy', 1); }},
  Nature:    { desc:'🌿 50% Root per hit',     apply(defSide){ if(Math.random()<0.5) applyRoot('enemy','player',1); }},
  Water:     { desc:'🫧 +1 Foam per hit',      apply(defSide){ applyFoam('enemy', defSide, 1); }},
  Plasma:    { desc:'🔮 +25% healing this zone', apply(defSide){ /* handled via healingMultiplier zone bonus */ }},
  Air:       { desc:'🌀 20% Stun 1t on hit',   apply(defSide){ if(Math.random()<0.20){ status[defSide].stunned=Math.max(status[defSide].stunned||0,1); log('🌀 Zone Stun!','status'); }}},
};

// ── 8 GYM LEADERS ────────────────────────────────────────────────────────────
// Fixed: gyms 0-3 are always Fire, Ice, Lightning, Earth.
// Variable: gyms 4-7 are a shuffled permutation of Nature, Water, Plasma, Air.
// Shuffling happens at run start (initGymRoster).

const GYM_ROSTER_FIXED = [
  {
    gymIdx:0, element:'Fire', name:'Leader Ignis', emoji:'🧙‍♂️', color:'#FF4500',
    baseHP:700, baseDmg:30, phase2Dmg:46, chargeInterval:3,
    passive:'fire_combustion', phase2Passive:'fire_pyromaniac',
    entryEffect: null,
    signature:'Burn stacks grow over time. Charges every 3 hits. Phase 2: Pyromaniac.',
    zoneDesc:'Fire zone: enemies apply +3 Burn on every hit.',
    battleAt:8, gold:150,
  },
  {
    gymIdx:1, element:'Ice', name:'Leader Glacius', emoji:'🧊', color:'#A0EFFF',
    baseHP:600, baseDmg:34, phase2Dmg:52, chargeInterval:0,
    passive:'ice_stay_frosty', phase2Passive:'ice_blast',
    entryEffect:'frozen_ground',
    signature:'Opens with Frozen Ground. Phase 2 executes below 25% HP.',
    zoneDesc:'Ice zone: enemies apply +2 Frost on every hit.',
    battleAt:16, gold:200,
  },
  {
    gymIdx:2, element:'Lightning', name:'Leader Volta', emoji:'⚡', color:'#FFD700',
    baseHP:400, baseDmg:38, phase2Dmg:58, chargeInterval:4,
    passive:'lightning_overload', phase2Passive:'lightning_conduction',
    entryEffect:'chain_shock',
    signature:'Starts at 200% Overload damage. Phase 2 gains Conduction (Shock reduces your damage).',
    zoneDesc:'Lightning zone: enemies apply +1 Shock on every hit.',
    battleAt:24, gold:270,
  },
  {
    gymIdx:3, element:'Earth', name:'Leader Terras', emoji:'🗿', color:'#8B6914',
    baseHP:720, baseDmg:44, phase2Dmg:68, chargeInterval:0,
    passive:'earth_bedrock', phase2Passive:'earth_fissure',
    entryEffect:'fortify',
    signature:'Enters with armor and stone stacks. Phase 2 gains Fissure — all attacks bypass your block.',
    zoneDesc:'Earth zone: enemies gain +1 Stone on each hit they land.',
    battleAt:32, gold:360,
  },
];

const GYM_ROSTER_VARIABLE_TEMPLATES = [
  {
    element:'Nature', name:'Leader Florae', emoji:'🌿', color:'#32CD32',
    baseHP:900, baseDmg:50, phase2Dmg:76, chargeInterval:0,
    passive:'nature_stay_rooted', phase2Passive:'nature_thorned_strikes',
    entryEffect:'summon_treant',
    signature:'Summons a Treant on entry. Roots accumulate. Phase 2: +5 damage per root stack.',
    zoneDesc:'Nature zone: enemies have 50% Root proc on every hit.',
    gold:460,
  },
  {
    element:'Water', name:'Leader Torrent', emoji:'💧', color:'#1E90FF',
    baseHP:1100, baseDmg:56, phase2Dmg:86, chargeInterval:3,
    passive:'water_sea_foam', phase2Passive:'water_ebb',
    entryEffect:null,
    signature:'Stacks Foam on every hit. Phase 2 gains Ebb — reflects 20%+ of your damage back.',
    zoneDesc:'Water zone: enemies apply +1 Foam on every hit.',
    gold:580,
  },
  {
    element:'Plasma', name:'Leader Vael', emoji:'🔮', color:'#DA70D6',
    baseHP:1350, baseDmg:62, phase2Dmg:95, chargeInterval:3,
    passive:'plasma_reactive_field', phase2Passive:'plasma_backfeed_reactor',
    entryEffect:null,
    signature:'Converts damage taken into counterattacks. Phase 2 reflects 20% of every hit back.',
    zoneDesc:'Plasma zone: enemies absorb energy from hits, occasionally counterattacking.',
    gold:720,
  },
  {
    element:'Air', name:'Leader Zephyr', emoji:'🌀', color:'#B0E0E6',
    baseHP:1600, baseDmg:70, phase2Dmg:105, chargeInterval:2,
    passive:'air_rapid_tempo', phase2Passive:'air_rapid_tempo',
    entryEffect:null,
    signature:'Extra actions every other turn. Phase 2 surges with even more tempo.',
    zoneDesc:'Air zone: enemies have 20% chance to stun you on each hit.',
    gold:900,
  },
];

// ── RIVAL DATA ───────────────────────────────────────────────────────────────
const RIVAL = {
  name: 'Ash',
  emoji: '🧢',
  // Dialogue per zone (index 0 = first gym zone)
  dialogue: [
    "You're still learning? I've already mastered this element.",
    "You think you've gotten stronger? I've been training twice as hard.",
    "Impressive progress... but you're still chasing my shadow.",
    "Half the gyms done and you're still behind me. Classic.",
    "You actually surprised me that time. Don't let it go to your head.",
    "I've beaten this gym three times already. You're just catching up.",
    "Getting close now. But close doesn't beat me.",
    "Final stretch and you're still here? I'll give you that much.",
  ],
  // Base stats scale per zone
  baseHP:  (zoneIdx) => 200 + zoneIdx * 80,
  baseDmg: (zoneIdx) =>  18 + zoneIdx *  7,
};

// Populated at run start by initGymRoster()
let GYM_ROSTER = [];

function initGymRoster(){
  if (!sandboxMode) {
    // Non-sandbox: only the 3 released element gyms in a random order.
    // Fire and Lightning come from GYM_ROSTER_FIXED; Nature from GYM_ROSTER_VARIABLE_TEMPLATES.
    const allTemplates = [...GYM_ROSTER_FIXED, ...GYM_ROSTER_VARIABLE_TEMPLATES];
    const releasedGyms = allTemplates.filter(g => RELEASED_ELEMENTS.includes(g.element));
    GYM_ROSTER = pickRandom(releasedGyms, releasedGyms.length)
      .map((g, i) => ({ ...g, gymIdx: i, battleAt: (i + 1) * 8 }));
  } else {
    // Sandbox: all 8 element gyms in a shuffled order
    const fixed    = pickRandom(GYM_ROSTER_FIXED, GYM_ROSTER_FIXED.length);
    const variable = pickRandom(GYM_ROSTER_VARIABLE_TEMPLATES, 4);
    GYM_ROSTER = [
      ...fixed,
      ...variable.map((tmpl, i) => ({ ...tmpl, gymIdx: 4+i, battleAt: 40 + i*8 })),
    ].map((g, i) => ({ ...g, gymIdx: i }));
  }
  _gauntletBossIdx = 0;
}

// Current gym index (0-7). -1 = not started yet / all done.
// currentGymIdx, zoneBattleCount, gymSkips managed in state.js
function currentGymDef(){ return GYM_ROSTER[currentGymIdx] || null; }
// Zone is active for the entire stretch between gyms
function inGymZone(){ return !gymDefeated && currentGymDef() !== null; }

// ── GAUNTLET ROSTER ───────────────────────────────────────────────────────────
// 3 post-run boss fights at B46, B47, B48 — bypasses zone system
const GAUNTLET_ROSTER = [
  {
    name: 'Warden Skar', element: 'Earth', emoji: '🗿', color: '#8B6914',
    enemyMaxHP: 3750, enemyDmg: 45,
    gymPassive: 'earth_bedrock', gymHitCounter: 0, gymPhase2: false,
    gymEntryEffect: 'fortify', gold: 450,
    signature: '⚔ The first guardian of the Veil. Unbending as stone.',
    isGym: true, isGauntletBoss: true,
  },
  {
    name: 'Archon Vael', element: 'Plasma', emoji: '🔮', color: '#DA70D6',
    enemyMaxHP: 4400, enemyDmg: 52,
    gymPassive: 'plasma_reactive_field', gymHitCounter: 0, gymPhase2: false,
    gymEntryEffect: null, gold: 550,
    signature: '⚔ The second guardian. Reality bends to their will.',
    isGym: true, isGauntletBoss: true,
  },
  {
    name: 'The Dark One', element: 'Fire', emoji: '🌑', color: '#440000',
    enemyMaxHP: 5000, enemyDmg: 72,
    gymPassive: 'fire_pyromaniac', gymHitCounter: 0, gymPhase2: false,
    gymEntryEffect: null, gold: 700,
    signature: '⚔ The architect of the time loop. The source of all suffering.',
    isGym: true, isGauntletBoss: true,
  },
];
let _gauntletBossIdx = 0;


