// ===== constants.js =====
// ─── GAME CONSTANTS ───────────────────────────────────────────────────────
// Tweak these to balance the game without touching logic files.

// ===============================
// CORE CONSTANTS
// ===============================
const BASE_MAX_HP      = 200;
const BASE_DMG         = 25;      // basic spell base damage (pre-mods)
const BASE_POWER       = 0;
const BATTLE_HEAL      = 10;
const CAMPFIRE_HEAL    = 0.5;
const CAMPFIRE_CHANCE  = 0.25;
const SHOP_CHANCE      = 0.15;
const ITEM_DROP_CHANCE = 0.30;
const GYM_ZONE_OPEN   = 14;   // gym appears after this many zone battles
const GYM_ZONE_FORCE  = 14;   // gym is forced at this count (same → always forced, no skip window)
const GYM_SKIP_BONUS  = 20;   // +20 HP per skip
const XP_PER_LEVEL     = 100;

// ACTION SYSTEM
const BASE_ACTIONS_PER_TURN = 2;

// ROOT (global passive)
const ROOT_PROC_CHANCE = 0.50;    // 50% chance per hit
const ROOT_POWER_PER_STACK = 5;   // +5 power per root stack vs rooted foes

// ── Save slot — declared here (before artifacts.js) so no TDZ ──
var activeSaveSlot = 0;
var sandboxMode    = false;


