// ── Passive / Artifact Icon System ────────────────────────────────────────────
// Unique pixel-art SVG icons for all passives, buffs, and artifacts.
// Uses the same 16×16 grid and element-color system as spellIcons.js.

const PASSIVE_ICON_DATA = {

  // ── FIRE PASSIVES ──────────────────────────────────────────────────────────
  fire_pyromaniac:
    `<polygon points="5,15 4,10 6,7 7,10 8,5 9,10 10,7 11,10 11,15" fill="currentColor" opacity=".75"/>
     <polygon points="7,9 8,6 9,9 8,12" fill="#fff" opacity=".3"/>`,

  fire_combustion:
    `<circle cx="8" cy="8" r="3" fill="currentColor" opacity=".5"/>
     <line x1="8" y1="1" x2="8" y2="5" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="11" x2="8" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="1" y1="8" x2="5" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="11" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="3" y1="3" x2="5.5" y2="5.5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="10.5" y1="10.5" x2="13" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="3" y1="13" x2="5.5" y2="10.5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="10.5" y1="5.5" x2="13" y2="3" stroke="currentColor" stroke-width="1.5"/>`,

  fire_blazing_heat:
    `<path d="M2 13 Q5 10 8 13 Q11 10 14 13" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M2 9 Q5 6 8 9 Q11 6 14 9" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M4 5 Q6 3 8 5 Q10 3 12 5" fill="none" stroke="currentColor" stroke-width="2"/>`,

  fire_wildfire:
    `<polygon points="8,2 10,6 12,4 10,9 13,8 9,13 8,15 7,13 3,8 6,9 4,4 6,6" fill="currentColor" opacity=".8"/>
     <line x1="1" y1="11" x2="4" y2="11" stroke="currentColor" stroke-width="1.5"/>
     <line x1="12" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="1.5"/>`,

  fire_roaring_heat:
    `<circle cx="8" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="8,10 6,10 5,5 7,7 8,2 9,7 11,5 10,10 10,10" fill="currentColor" opacity=".85"/>`,

  fire_forge_master:
    `<rect x="2" y="9" width="12" height="5" fill="currentColor" opacity=".65"/>
     <rect x="2" y="9" width="12" height="5" fill="none" stroke="currentColor" stroke-width="1"/>
     <rect x="3" y="6" width="9" height="3" fill="currentColor" opacity=".7"/>
     <line x1="12" y1="6" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>
     <rect x="5" y="14" width="6" height="1.5" fill="currentColor" opacity=".5"/>`,

  fire_iron_burn:
    `<ellipse cx="6" cy="8" rx="3" ry="4.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <ellipse cx="10" cy="8" rx="3" ry="4.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <rect x="5.5" y="6" width="5" height="4" fill="#0a0810"/>
     <line x1="5.5" y1="8" x2="10.5" y2="8" stroke="currentColor" stroke-width="1"/>
     <line x1="12" y1="3" x2="14" y2="1" stroke="currentColor" stroke-width="1.5"/>
     <line x1="13.5" y1="5" x2="15" y2="3.5" stroke="currentColor" stroke-width="1"/>`,

  fire_slag_trail:
    `<circle cx="4" cy="3" r="2" fill="currentColor" opacity=".8"/>
     <path d="M4 5 Q4.5 8 4 10 Q4.5 12 4 13.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="6" r="1.5" fill="currentColor" opacity=".65"/>
     <path d="M8 7.5 Q8.5 10 8 12" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="12" cy="9" r="1.5" fill="currentColor" opacity=".5"/>
     <path d="M12 10.5 Q12.5 12.5 12 14" fill="none" stroke="currentColor" stroke-width="1.5"/>`,

  fire_armor_eater:
    `<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="8" r="2.5" fill="currentColor" opacity=".35"/>
     <rect x="6.5" y="2" width="3" height="2" fill="currentColor"/>
     <rect x="6.5" y="12" width="3" height="2" fill="currentColor"/>
     <rect x="2" y="6.5" width="2" height="3" fill="currentColor"/>
     <polygon points="12,3 15,5 14,9 11,7" fill="#0a0810"/>
     <path d="M12 3 Q15 5 14 9" fill="none" stroke="currentColor" stroke-width="2"/>`,

  fire_deep_heat:
    `<ellipse cx="8" cy="8" rx="7" ry="5" fill="none" stroke="currentColor" stroke-width="1" opacity=".45"/>
     <ellipse cx="8" cy="8" rx="5" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".65"/>
     <ellipse cx="8" cy="8" rx="3" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
     <ellipse cx="8" cy="8" rx="1.5" ry="1" fill="currentColor"/>`,

  fire_eternal_flame:
    `<rect x="6" y="9" width="4" height="5" fill="currentColor" opacity=".65"/>
     <rect x="5" y="13" width="6" height="2" fill="currentColor" opacity=".8"/>
     <rect x="7.5" y="7" width="1" height="2.5" fill="currentColor" opacity=".5"/>
     <polygon points="8,1 10,5 12,3 10,7 13,7 9,11 8,12 7,11 3,7 6,7 4,3 6,5" fill="currentColor" opacity=".85"/>`,

  fire_meltdown:
    `<polygon points="8,3 14,14 2,14" fill="currentColor" opacity=".5"/>
     <polygon points="8,3 14,14 2,14" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="7" y="1" width="2" height="4" fill="currentColor"/>
     <line x1="8" y1="1" x2="5" y2="0" stroke="currentColor" stroke-width="1.5"/>
     <line x1="9" y1="2" x2="12" y2="0" stroke="currentColor" stroke-width="1.5"/>`,

  // ── WATER PASSIVES ─────────────────────────────────────────────────────────
  water_restoration:
    `<rect x="3" y="4" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/>
     <rect x="4" y="10" width="8" height="3" fill="currentColor" opacity=".6"/>
     <rect x="4" y="7" width="8" height="3" fill="currentColor" opacity=".3"/>
     <polygon points="6,4 10,4 9,2 7,2" fill="currentColor" opacity=".5"/>
     <rect x="7" y="9" width="2" height="2" fill="currentColor"/>`,

  water_ebb:
    `<path d="M13 5 Q10 8 7 5 Q4 2 1 5" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M15 10 Q12 13 9 10 Q6 7 3 10" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="1,5 4,3 4,7" fill="currentColor" opacity=".6"/>`,

  water_sea_foam:
    `<circle cx="5" cy="10" r="3" fill="currentColor" opacity=".4"/>
     <circle cx="5" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1"/>
     <circle cx="10" cy="9" r="3" fill="currentColor" opacity=".4"/>
     <circle cx="10" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1"/>
     <circle cx="7" cy="13" r="2" fill="currentColor" opacity=".4"/>
     <circle cx="7" cy="13" r="2" fill="none" stroke="currentColor" stroke-width="1"/>
     <circle cx="7" cy="6" r="2" fill="currentColor" opacity=".35"/>
     <circle cx="12" cy="13" r="1.5" fill="currentColor" opacity=".35"/>`,

  water_flow:
    `<path d="M1 5 Q5 3 8 6 Q11 9 15 7" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M1 9 Q5 7 8 10 Q11 13 15 11" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="13,5 15,7 13,9" fill="currentColor" opacity=".6"/>`,

  water_abyssal_pain:
    `<circle cx="8" cy="8" r="7" fill="currentColor" opacity=".1"/>
     <circle cx="8" cy="8" r="5" fill="currentColor" opacity=".2"/>
     <circle cx="8" cy="8" r="3" fill="currentColor" opacity=".4"/>
     <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity=".7"/>
     <path d="M8 1 Q14 5 13 11 Q10 15 5 13 Q1 9 3 4 Q5 1 8 1" fill="none" stroke="currentColor" stroke-width="1" opacity=".6"/>`,

  // ── ICE PASSIVES ───────────────────────────────────────────────────────────
  ice_blast:
    `<polygon points="8,2 9,6 13,5 10,8 13,11 9,10 8,14 7,10 3,11 6,8 3,5 7,6" fill="currentColor" opacity=".85"/>
     <circle cx="8" cy="8" r="1.5" fill="#fff" opacity=".5"/>`,

  ice_cold_swell:
    `<polygon points="8,1 12,5 12,11 8,15 4,11 4,5" fill="currentColor" opacity=".3"/>
     <polygon points="8,1 12,5 12,11 8,15 4,11 4,5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="8,4 11,7 11,10 8,13 5,10 5,7" fill="currentColor" opacity=".5"/>
     <rect x="7" y="5" width="2" height="1" fill="#fff" opacity=".5"/>`,

  ice_embrittlement:
    `<line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="6" y1="2" x2="14" y2="10" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="6" x2="10" y2="14" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="1" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/>
     <line x1="1" y1="8" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>`,

  ice_stay_frosty:
    `<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5"/>
     <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11.5" y1="4.5" x2="4.5" y2="11.5" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="8" r="2" fill="currentColor"/>`,

  ice_permafrost_core:
    `<polygon points="8,1 13,5 13,11 8,15 3,11 3,5" fill="currentColor" opacity=".2"/>
     <polygon points="8,1 13,5 13,11 8,15 3,11 3,5" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="8,3 12,6 12,10 8,13 4,10 4,6" fill="currentColor" opacity=".35"/>
     <polygon points="8,5 11,7 11,9 8,11 5,9 5,7" fill="currentColor" opacity=".6"/>
     <circle cx="8" cy="8" r="1.5" fill="#fff" opacity=".7"/>`,

  // ── EARTH PASSIVES ─────────────────────────────────────────────────────────
  earth_bedrock:
    `<rect x="1" y="2" width="14" height="2" fill="currentColor" opacity=".3"/>
     <rect x="1" y="5" width="14" height="2" fill="currentColor" opacity=".45"/>
     <rect x="1" y="8" width="14" height="2" fill="currentColor" opacity=".6"/>
     <rect x="1" y="11" width="14" height="2" fill="currentColor" opacity=".8"/>
     <rect x="1" y="14" width="14" height="1.5" fill="currentColor"/>`,

  earth_earthen_bulwark:
    `<path d="M3 4 Q3 11 8 14 Q13 11 13 4 Q8 2 3 4Z" fill="currentColor" opacity=".3"/>
     <path d="M3 4 Q3 11 8 14 Q13 11 13 4 Q8 2 3 4Z" fill="none" stroke="currentColor" stroke-width="2"/>
     <rect x="5" y="6" width="6" height="5" fill="currentColor" opacity=".4"/>
     <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1" opacity=".6"/>
     <line x1="8" y1="6" x2="8" y2="11" stroke="currentColor" stroke-width="1" opacity=".6"/>`,

  earth_fissure:
    `<line x1="8" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="2"/>
     <line x1="5" y1="5" x2="10" y2="9" stroke="currentColor" stroke-width="2"/>
     <line x1="10" y1="9" x2="6" y2="13" stroke="currentColor" stroke-width="2"/>
     <line x1="6" y1="13" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="1" y1="9" x2="15" y2="9" stroke="currentColor" stroke-width="2.5"/>`,

  earth_hard_shell:
    `<polygon points="8,2 13,5 13,11 8,14 3,11 3,5" fill="currentColor" opacity=".35"/>
     <polygon points="8,2 13,5 13,11 8,14 3,11 3,5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="3" y1="5" x2="13" y2="11" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="13" y1="5" x2="3" y2="11" stroke="currentColor" stroke-width="1" opacity=".5"/>`,

  earth_living_mountain:
    `<polygon points="8,2 15,14 1,14" fill="currentColor" opacity=".5"/>
     <polygon points="8,2 15,14 1,14" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="5,9 8,2 11,9" fill="currentColor" opacity=".7"/>
     <circle cx="6" cy="10" r="1.5" fill="#0a0810"/>
     <circle cx="10" cy="10" r="1.5" fill="#0a0810"/>
     <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="2"/>`,

  // ── NATURE PASSIVES ────────────────────────────────────────────────────────
  nature_overgrowth:
    `<line x1="8" y1="15" x2="8" y2="7" stroke="currentColor" stroke-width="2"/>
     <path d="M8 11 Q5 9 3 10 Q5 8 8 9" fill="currentColor" opacity=".6"/>
     <path d="M8 9 Q11 7 13 8 Q11 6 8 7" fill="currentColor" opacity=".6"/>
     <polygon points="8,3 11,7 5,7" fill="currentColor" opacity=".8"/>
     <polygon points="8,6 10,9 6,9" fill="currentColor" opacity=".5"/>`,

  nature_stay_rooted:
    `<circle cx="8" cy="6" r="3.5" fill="currentColor" opacity=".4"/>
     <circle cx="8" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="9.5" x2="8" y2="12" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="12" x2="5" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="12" x2="11" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="13" x2="6" y2="15" stroke="currentColor" stroke-width="1"/>
     <line x1="8" y1="13" x2="10" y2="15" stroke="currentColor" stroke-width="1"/>`,

  nature_thorned_strikes:
    `<line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" stroke-width="2.5"/>
     <line x1="9" y1="4" x2="12" y2="2" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="6" x2="14" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
     <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
     <circle cx="7" cy="9" r="1.5" fill="currentColor"/>`,

  nature_bramble_guard:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
     <circle cx="13.2" cy="5" r="1.5" fill="currentColor"/>
     <circle cx="13.2" cy="11" r="1.5" fill="currentColor"/>
     <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
     <circle cx="2.8" cy="11" r="1.5" fill="currentColor"/>
     <circle cx="2.8" cy="5" r="1.5" fill="currentColor"/>`,

  nature_verdant_legion:
    `<rect x="4" y="9" width="2" height="5" fill="currentColor" opacity=".7"/>
     <polygon points="5,4 7.5,9 2.5,9" fill="currentColor" opacity=".8"/>
     <rect x="7" y="8" width="2" height="6" fill="currentColor" opacity=".7"/>
     <polygon points="8,2 11,8 5,8" fill="currentColor" opacity=".9"/>
     <rect x="10" y="9" width="2" height="5" fill="currentColor" opacity=".7"/>
     <polygon points="11,4 13.5,9 8.5,9" fill="currentColor" opacity=".8"/>`,

  nature_perennial:
    `<circle cx="8" cy="8" r="2.5" fill="currentColor" opacity=".5"/>
     <polygon points="8,1 9.5,5 13,5 10,7" fill="currentColor" opacity=".7"/>
     <polygon points="13,8 9.5,9.5 11,13 9,10" fill="currentColor" opacity=".7"/>
     <polygon points="8,15 6.5,11 3,11 6,9" fill="currentColor" opacity=".7"/>
     <polygon points="3,8 6.5,6.5 5,3 7,6" fill="currentColor" opacity=".7"/>
     <path d="M8 1 Q11 4 13 8 Q11 12 8 15 Q5 12 3 8 Q5 4 8 1" fill="none" stroke="currentColor" stroke-width="1" opacity=".3"/>`,

  nature_deep_roots:
    `<line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="3" r="2" fill="currentColor" opacity=".6"/>
     <line x1="8" y1="7" x2="5" y2="10" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="7" x2="11" y2="10" stroke="currentColor" stroke-width="1.5"/>
     <line x1="5" y1="10" x2="3" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="5" y1="10" x2="6" y2="14" stroke="currentColor" stroke-width="1"/>
     <line x1="11" y1="10" x2="13" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="10" x2="10" y2="14" stroke="currentColor" stroke-width="1"/>
     <line x1="8" y1="7" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>`,

  nature_thorn_bloom:
    `<circle cx="8" cy="8" r="3" fill="currentColor" opacity=".45"/>
     <polygon points="8,2 9,5.5 12,4 10,7 14,8 10,9 12,12 9,10.5 8,14 7,10.5 4,12 6,9 2,8 6,7 4,4 7,5.5" fill="currentColor" opacity=".8"/>`,

  nature_verdant_patience:
    `<path d="M3 4 Q3 11 8 14 Q13 11 13 4 Q8 2 3 4Z" fill="currentColor" opacity=".25"/>
     <path d="M3 4 Q3 11 8 14 Q13 11 13 4 Q8 2 3 4Z" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M7 6 Q6 9 8 11 Q10 9 9 6Z" fill="currentColor" opacity=".7"/>
     <line x1="8" y1="6" x2="8" y2="12" stroke="currentColor" stroke-width="1.5"/>`,

  nature_eternal_garden:
    `<rect x="1" y="11" width="14" height="2" fill="currentColor" opacity=".5"/>
     <rect x="3" y="6" width="2" height="5" fill="currentColor" opacity=".7"/>
     <polygon points="4,2 6,6 2,6" fill="currentColor" opacity=".8"/>
     <rect x="7" y="5" width="2" height="6" fill="currentColor" opacity=".7"/>
     <polygon points="8,1 10,5 6,5" fill="currentColor" opacity=".9"/>
     <rect x="11" y="7" width="2" height="4" fill="currentColor" opacity=".7"/>
     <polygon points="12,3 14,7 10,7" fill="currentColor" opacity=".8"/>`,

  nature_rooted_bloom:
    `<line x1="8" y1="9" x2="8" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="13" x2="5" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="13" x2="11" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="7" r="3.5" fill="currentColor" opacity=".45"/>
     <polygon points="8,2 9.5,5.5 13,5 10.5,7.5 12,11 8,9 4,11 5.5,7.5 3,5 6.5,5.5" fill="currentColor" opacity=".85"/>`,

  // ── LIGHTNING PASSIVES ─────────────────────────────────────────────────────
  lightning_conduction:
    `<rect x="5" y="1" width="6" height="14" fill="currentColor" opacity=".25"/>
     <rect x="5" y="1" width="6" height="14" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="8,4 7,8 9,8" fill="currentColor"/>
     <line x1="1" y1="8" x2="5" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="11" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>`,

  lightning_double:
    `<polygon points="7,1 4,7 6,7 4,13 9,6 7,6 10,1" fill="currentColor" opacity=".85"/>
     <polygon points="11,1 8,7 10,7 8,13 13,6 11,6 14,1" fill="currentColor" opacity=".85"/>`,

  lightning_static:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="2" x2="8" y2="4" stroke="currentColor" stroke-width="2"/>
     <line x1="12.2" y1="3.8" x2="10.8" y2="5.2" stroke="currentColor" stroke-width="2"/>
     <line x1="14" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="12.2" y1="12.2" x2="10.8" y2="10.8" stroke="currentColor" stroke-width="2"/>
     <line x1="3.8" y1="3.8" x2="5.2" y2="5.2" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".5"/>`,

  lightning_overload:
    `<rect x="3" y="5" width="10" height="8" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/>
     <rect x="4" y="9" width="8" height="3" fill="currentColor" opacity=".7"/>
     <rect x="6" y="3" width="4" height="2" fill="currentColor"/>
     <polygon points="8,1 7,4 9,4" fill="currentColor"/>
     <line x1="11" y1="2" x2="14" y2="0" stroke="currentColor" stroke-width="1.5"/>`,

  lightning_superconductor:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="2" x2="8" y2="5" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="11" x2="8" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="2" y1="8" x2="5" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="11" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="8" r="2.5" fill="currentColor" opacity=".5"/>
     <circle cx="8" cy="8" r="1" fill="#fff" opacity=".6"/>`,

  lightning_hair_trigger:
    `<line x1="2" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
     <line x1="12" y1="8" x2="14" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="13,3 15,5 12,5" fill="currentColor"/>
     <line x1="2" y1="6" x2="2" y2="10" stroke="currentColor" stroke-width="2"/>`,

  lightning_overcharged:
    `<rect x="4" y="5" width="8" height="10" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/>
     <rect x="6" y="3" width="4" height="2" fill="currentColor"/>
     <rect x="5" y="9" width="6" height="5" fill="currentColor" opacity=".7"/>
     <rect x="5" y="6" width="6" height="3" fill="currentColor" opacity=".35"/>
     <polygon points="8,1 7,4 9,4" fill="currentColor"/>
     <line x1="10" y1="3" x2="13" y2="1" stroke="currentColor" stroke-width="1.5"/>`,

  lightning_chain_surge:
    `<ellipse cx="5" cy="5" rx="3" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <ellipse cx="11" cy="11" rx="3" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="4" y="3.5" width="2" height="3" fill="#0a0810"/>
     <rect x="10" y="9.5" width="2" height="3" fill="#0a0810"/>
     <line x1="7" y1="6" x2="9" y2="10" stroke="currentColor" stroke-width="2"/>`,

  lightning_static_build:
    `<rect x="2" y="12" width="3" height="3" fill="currentColor" opacity=".5"/>
     <rect x="6" y="9" width="3" height="6" fill="currentColor" opacity=".65"/>
     <rect x="10" y="5" width="3" height="10" fill="currentColor" opacity=".8"/>
     <line x1="1" y1="15" x2="15" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="10,2 9,5 11,5" fill="currentColor"/>`,

  lightning_live_wire:
    `<path d="M2 8 Q5 6 8 8 Q11 10 14 8" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <circle cx="2" cy="8" r="2" fill="currentColor" opacity=".5"/>
     <polygon points="14,5 16,8 14,11" fill="currentColor"/>
     <line x1="8" y1="6" x2="9" y2="3" stroke="currentColor" stroke-width="1.5"/>
     <line x1="10" y1="7" x2="12" y2="4" stroke="currentColor" stroke-width="1.5"/>`,

  lightning_conductivity:
    `<polygon points="1,6 9,6 9,3 15,8 9,13 9,10 1,10" fill="currentColor" opacity=".6"/>
     <line x1="4" y1="6" x2="4" y2="10" stroke="currentColor" stroke-width="1.5" opacity=".5"/>
     <line x1="7" y1="6" x2="7" y2="10" stroke="currentColor" stroke-width="1.5" opacity=".5"/>`,

  lightning_cascade:
    `<polygon points="8,1 7,5 9,5" fill="currentColor"/>
     <line x1="8" y1="1" x2="8" y2="5" stroke="currentColor" stroke-width="2"/>
     <polygon points="5,5 4,9 6,9" fill="currentColor"/>
     <polygon points="11,5 10,9 12,9" fill="currentColor"/>
     <polygon points="3,9 2,13 4,13" fill="currentColor"/>
     <polygon points="8,9 7,13 9,13" fill="currentColor"/>
     <polygon points="13,9 12,13 14,13" fill="currentColor"/>`,

  lightning_storm_core:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".3"/>
     <path d="M8 2 Q14 5 12 12 Q9 15 3 12 Q1 9 4 3 Q6 1 8 2" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <polygon points="9,5 7,8 9,8 7,11" fill="currentColor"/>`,

  lightning_amplified:
    `<polygon points="1,5 5,5 9,1 9,15 5,11 1,11" fill="currentColor" opacity=".5"/>
     <polygon points="1,5 5,5 9,1 9,15 5,11 1,11" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M9 8 Q11 6 13 8 Q15 6 15 8 Q15 10 13 8" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M9 8 Q11 10 13 8" fill="none" stroke="currentColor" stroke-width="1.5"/>`,

  // ── PLASMA PASSIVES ────────────────────────────────────────────────────────
  plasma_energy_feedback:
    `<path d="M3 8 Q3 3 8 3 Q13 3 13 8 Q13 13 8 13 Q3 13 3 8" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="11,1 15,5 11,5" fill="currentColor"/>
     <polygon points="5,11 1,11 5,15" fill="currentColor"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".5"/>`,

  plasma_stabilized_core:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1"/>
     <ellipse cx="8" cy="8" rx="6" ry="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <ellipse cx="8" cy="8" rx="2.5" ry="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".6"/>`,

  plasma_reactive_field:
    `<line x1="4" y1="2" x2="4" y2="14" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1.5"/>
     <line x1="12" y1="2" x2="12" y2="14" stroke="currentColor" stroke-width="1.5"/>
     <path d="M2 5 Q4 3 6 5 Q8 3 10 5 Q12 3 14 5" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <path d="M2 11 Q4 9 6 11 Q8 9 10 11 Q12 9 14 11" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>`,

  plasma_reserve_cell:
    `<rect x="4" y="5" width="8" height="10" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/>
     <rect x="6" y="3" width="4" height="2" fill="currentColor"/>
     <rect x="5" y="6" width="6" height="7" fill="currentColor" opacity=".25"/>
     <rect x="5" y="11" width="6" height="2" fill="currentColor" opacity=".7"/>
     <line x1="3" y1="9" x2="5" y2="9" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5"/>`,

  plasma_backfeed_reactor:
    `<circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M3 8 Q3 3 8 3 Q13 3 13 8" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M13 8 Q13 13 8 13 Q3 13 3 8" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="11,1 14,4 11,4" fill="currentColor"/>
     <polygon points="5,11 2,12 5,14" fill="currentColor"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".6"/>`,

  // ── AIR PASSIVES ───────────────────────────────────────────────────────────
  air_tailwind:
    `<line x1="1" y1="8" x2="10" y2="8" stroke="currentColor" stroke-width="2"/>
     <polygon points="9,6 14,8 9,10" fill="currentColor"/>
     <path d="M1 5 Q4 3 6 5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M1 11 Q4 13 6 11" fill="none" stroke="currentColor" stroke-width="1.5"/>`,

  air_rapid_tempo:
    `<line x1="4" y1="2" x2="4" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
     <line x1="12" y1="1" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.5"/>`,

  air_gale_force:
    `<path d="M1 6 Q6 3 11 6 Q14 7 15 5" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <path d="M1 10 Q5 8 9 10 Q13 12 15 10" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="13,3 15,5 13,7" fill="currentColor" opacity=".6"/>`,

  air_slipstream:
    `<path d="M1 8 Q5 5 10 8 Q13 10 15 8" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <path d="M4 5 Q7 3 11 5 Q13 6 14 5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/>
     <path d="M4 11 Q7 13 11 11 Q13 10 14 11" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/>`,

  air_eye_of_the_storm:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="8" r="3.5" fill="currentColor" opacity=".2"/>
     <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity=".5"/>
     <path d="M8 2 Q14 5 12 12" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"/>
     <path d="M12 12 Q8 15 4 12" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"/>
     <path d="M4 12 Q1 8 4 4" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"/>`,

  air_headwind:
    `<polygon points="8,2 15,8 8,14 8,11 1,11 1,5 8,5" fill="currentColor" opacity=".75"/>
     <line x1="1" y1="3" x2="4" y2="6" stroke="currentColor" stroke-width="1.5" opacity=".5"/>
     <line x1="1" y1="13" x2="4" y2="10" stroke="currentColor" stroke-width="1.5" opacity=".5"/>`,

  air_backdraft:
    `<path d="M2 8 Q5 5 8 8 Q11 11 14 8" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <polygon points="12,4 15,8 12,12" fill="currentColor" opacity=".85"/>
     <circle cx="3" cy="8" r="1.5" fill="currentColor" opacity=".5"/>`,

  air_turbulence:
    `<path d="M2 4 Q5 2 8 4 Q11 6 14 4" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M2 8 Q5 7 8 9 Q11 11 14 9" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M2 12 Q5 11 8 13 Q11 15 14 13" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/>
     <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity=".7"/>`,

  air_tailwind_carry:
    `<line x1="1" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="2"/>
     <polygon points="10,6 15,8 10,10" fill="currentColor"/>
     <path d="M1 5 Q3 3 5 5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M1 11 Q3 13 5 11" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="13" cy="3" r="1.5" fill="currentColor" opacity=".6"/>
     <line x1="13" y1="5" x2="13" y2="7" stroke="currentColor" stroke-width="1.2" opacity=".6"/>`,

  air_vortex_strike:
    `<path d="M8 2 Q14 5 13 10 Q11 14 8 14 Q5 14 3 11 Q1 8 4 5 Q6 2 8 2" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M8 5 Q11 7 10 10 Q9 12 8 12" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5"/>
     <polygon points="6,7 9,7 9,5 13,8 9,11 9,9 6,9" fill="currentColor" opacity=".85"/>`,

  air_pressure_launch:
    `<circle cx="8" cy="9" r="5" fill="currentColor" opacity=".2"/>
     <circle cx="8" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="9" x2="8" y2="1" stroke="currentColor" stroke-width="2.5"/>
     <polygon points="5,4 8,1 11,4" fill="currentColor"/>
     <line x1="5" y1="9" x2="11" y2="9" stroke="currentColor" stroke-width="1.2" opacity=".6"/>`,

  air_prevailing_wind:
    `<polygon points="1,6 9,6 9,4 14,8 9,12 9,10 1,10" fill="currentColor" opacity=".6"/>
     <line x1="3" y1="4" x2="3" y2="12" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
     <line x1="6" y1="3" x2="6" y2="13" stroke="currentColor" stroke-width="1.2" opacity=".5"/>`,

  // ── DUO PASSIVES ───────────────────────────────────────────────────────────
  duo_flashfire:
    `<polygon points="9,1 6,7 8,7 6,13 12,5 9,5" fill="currentColor" opacity=".85"/>
     <polygon points="4,5 5,9 7,7 6,12 3,8 5,8 3,4" fill="currentColor" opacity=".6"/>`,

  duo_molten_current:
    `<path d="M1 9 Q4 6 8 9 Q12 6 15 9" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <polygon points="4,8 5,4 6,6 7,3 8,6 9,4 10,8" fill="currentColor" opacity=".7"/>`,

  duo_stormseed:
    `<polygon points="9,1 7,6 9,6 7,11" fill="currentColor" opacity=".85"/>
     <circle cx="6" cy="13" r="2.5" fill="currentColor" opacity=".5"/>
     <line x1="6" y1="11" x2="4" y2="14" stroke="currentColor" stroke-width="1"/>
     <line x1="6" y1="11" x2="8" y2="14" stroke="currentColor" stroke-width="1"/>`,

  duo_charged_roots:
    `<polygon points="10,1 8,6 10,6" fill="currentColor" opacity=".85"/>
     <line x1="9" y1="9" x2="9" y2="13" stroke="currentColor" stroke-width="2"/>
     <line x1="9" y1="13" x2="6" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="9" y1="13" x2="12" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="5" x2="9" y2="9" stroke="currentColor" stroke-width="2"/>`,

  duo_wildfire_seeds:
    `<polygon points="8,1 10,5 12,3 10,8 13,7 10,11 8,12 6,11 3,7 6,8 4,3 6,5" fill="currentColor" opacity=".75"/>
     <circle cx="4" cy="13" r="2" fill="currentColor" opacity=".5"/>
     <circle cx="12" cy="13" r="2" fill="currentColor" opacity=".5"/>`,

  duo_scorched_earth:
    `<line x1="1" y1="10" x2="15" y2="10" stroke="currentColor" stroke-width="2.5"/>
     <line x1="4" y1="10" x2="3" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="10" x2="7" y2="14" stroke="currentColor" stroke-width="1.5"/>
     <line x1="12" y1="10" x2="13" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="8,2 10,6 12,4 10,8 13,8 9,12 7,10 3,8 6,8 4,4 6,6" fill="currentColor" opacity=".75"/>`,

  duo_gale_root:
    `<line x1="1" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="2"/>
     <polygon points="8,5 13,7 8,9" fill="currentColor" opacity=".8"/>
     <line x1="11" y1="9" x2="11" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="13" x2="8" y2="15" stroke="currentColor" stroke-width="1.2"/>
     <line x1="11" y1="13" x2="14" y2="15" stroke="currentColor" stroke-width="1.2"/>
     <line x1="11" y1="11" x2="9" y2="13" stroke="currentColor" stroke-width="1"/>`,

  duo_rushing_growth:
    `<path d="M1 10 Q4 8 7 10 Q10 12 13 10" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="12,8 15,10 12,12" fill="currentColor" opacity=".8"/>
     <path d="M6 10 Q6 6 9 4 Q11 2 10 5 Q9 7 6 10" fill="currentColor" opacity=".6"/>
     <circle cx="6" cy="10" r="1.5" fill="currentColor" opacity=".5"/>`,

  duo_velocity_arc:
    `<path d="M1 12 Q4 6 8 4 Q12 2 14 6" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="12,3 15,6 12,8" fill="currentColor" opacity=".6"/>
     <polygon points="8,6 11,6 10,8 12,8 7,13 8,10 6,10" fill="currentColor" opacity=".85"/>`,

  duo_galestrike:
    `<polygon points="9,1 7,6 9,6 6,11" fill="currentColor" opacity=".85"/>
     <line x1="1" y1="7" x2="7" y2="7" stroke="currentColor" stroke-width="2"/>
     <path d="M1 4 Q3 3 5 4" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M1 10 Q3 11 5 10" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8.5" cy="13" r="2" fill="currentColor" opacity=".4"/>`,

  duo_thermal_draft:
    `<path d="M1 10 Q4 8 7 10 Q10 12 13 10" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="12,8 15,10 12,12" fill="currentColor" opacity=".8"/>
     <polygon points="7,8 9,4 11,6 9,1 11,3 10,7 12,5 10,9 8,9" fill="currentColor" opacity=".7"/>`,

  duo_bellows:
    `<rect x="3" y="6" width="9" height="5" fill="currentColor" opacity=".3" rx="1"/>
     <rect x="3" y="6" width="9" height="5" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/>
     <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>
     <polygon points="14,6 15,8 14,10" fill="currentColor"/>
     <line x1="5" y1="4" x2="5" y2="6" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="3" x2="8" y2="6" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="8,1 10,4 12,2 11,7 8,5 5,7 4,2 6,4" fill="currentColor" opacity=".8"/>`,

  // ── CHARACTER BUFFS ────────────────────────────────────────────────────────
  buff_hp_bonus:
    `<path d="M8 14 Q3 9 3 7 Q3 4 5.5 4 Q6.5 4 7.5 5.5 Q7.5 4 8 4 Q8.5 4 9 5.5 Q10 4 10.5 4 Q13 4 13 7 Q13 9 8 14Z" fill="currentColor" opacity=".5"/>
     <path d="M8 14 Q3 9 3 7 Q3 4 5.5 4 Q6.5 4 7.5 5.5 Q7.5 4 8 4 Q8.5 4 9 5.5 Q10 4 10.5 4 Q13 4 13 7 Q13 9 8 14Z" fill="none" stroke="currentColor" stroke-width="1"/>
     <rect x="6.5" y="8" width="3" height="1.5" fill="currentColor"/>
     <rect x="7.5" y="7" width="1" height="3.5" fill="currentColor"/>`,

  buff_def_bonus:
    `<rect x="2" y="4" width="12" height="3" fill="currentColor" opacity=".7"/>
     <rect x="2" y="8" width="12" height="3" fill="currentColor" opacity=".55"/>
     <rect x="2" y="12" width="12" height="2" fill="currentColor" opacity=".4"/>
     <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1"/>
     <line x1="2" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="1"/>`,

  buff_block_start:
    `<rect x="3" y="5" width="10" height="9" fill="currentColor" opacity=".45"/>
     <rect x="3" y="5" width="10" height="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="3" y="2" width="3" height="4" fill="currentColor" opacity=".8"/>
     <rect x="10" y="2" width="3" height="4" fill="currentColor" opacity=".8"/>
     <rect x="5" y="3" width="6" height="3" fill="currentColor" opacity=".5"/>
     <rect x="6" y="9" width="4" height="5" fill="currentColor" opacity=".4"/>`,

  buff_atk_bonus:
    `<rect x="7" y="1" width="2" height="11" fill="currentColor"/>
     <rect x="4" y="5" width="8" height="2" fill="currentColor"/>
     <rect x="7" y="12" width="2" height="3" fill="currentColor" opacity=".6"/>
     <rect x="6" y="14" width="4" height="1.5" fill="currentColor" opacity=".8"/>
     <rect x="7" y="1" width="1" height="3" fill="#fff" opacity=".45"/>
     <polygon points="7,1 9,1 8,0" fill="currentColor"/>`,

  buff_gold_start:
    `<circle cx="8" cy="7" r="5" fill="currentColor" opacity=".35"/>
     <circle cx="8" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="7" r="2.5" fill="currentColor" opacity=".5"/>
     <line x1="5" y1="13" x2="11" y2="13" stroke="currentColor" stroke-width="2"/>
     <line x1="4" y1="15" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>`,

  buff_potion_start:
    `<rect x="6" y="1" width="4" height="3" fill="currentColor" opacity=".6" rx="1"/>
     <path d="M5 4 Q3 7 4 11 Q5 14 8 15 Q11 14 12 11 Q13 7 11 4Z" fill="currentColor" opacity=".35"/>
     <path d="M5 4 Q3 7 4 11 Q5 14 8 15 Q11 14 12 11 Q13 7 11 4Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="5" y="10" width="6" height="3" fill="currentColor" opacity=".55"/>
     <rect x="7" y="5" width="2" height="1" fill="#fff" opacity=".4"/>`,

  buff_efx_bonus:
    `<circle cx="8" cy="8" r="6" fill="currentColor" opacity=".18"/>
     <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="8,2 9.5,6.5 15,8 9.5,9.5 8,14 6.5,9.5 1,8 6.5,6.5" fill="currentColor" opacity=".8"/>
     <circle cx="8" cy="8" r="2" fill="#fff" opacity=".4"/>`,

  buff_spell_start:
    `<rect x="2" y="2" width="12" height="13" fill="currentColor" opacity=".25"/>
     <rect x="2" y="2" width="12" height="13" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="2" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <rect x="3" y="5" width="4" height="1" fill="currentColor" opacity=".7"/>
     <rect x="3" y="8" width="4" height="1" fill="currentColor" opacity=".7"/>
     <rect x="3" y="11" width="3" height="1" fill="currentColor" opacity=".7"/>
     <rect x="9" y="6" width="1" height="3" fill="currentColor" opacity=".7"/>
     <rect x="10" y="7" width="3" height="1" fill="currentColor" opacity=".7"/>`,

  buff_xp_bonus:
    `<rect x="4" y="2" width="8" height="11" fill="currentColor" opacity=".25" rx="1"/>
     <rect x="4" y="2" width="8" height="11" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/>
     <rect x="5" y="4" width="6" height="1" fill="currentColor" opacity=".7"/>
     <rect x="5" y="6" width="6" height="1" fill="currentColor" opacity=".7"/>
     <rect x="5" y="8" width="4" height="1" fill="currentColor" opacity=".7"/>
     <polygon points="7,13 9,13 8,15" fill="currentColor" opacity=".5"/>
     <circle cx="12" cy="3" r="2" fill="currentColor" opacity=".8"/>
     <rect x="11.5" y="2.5" width="1" height="1" fill="#fff" opacity=".5"/>`,

  // ── ARTIFACTS ──────────────────────────────────────────────────────────────
  iron_will:
    `<rect x="5" y="7" width="6" height="7" fill="currentColor" opacity=".55" rx="1"/>
     <rect x="5" y="7" width="6" height="7" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <rect x="6" y="5" width="4" height="3" fill="currentColor" opacity=".7" rx="1"/>
     <rect x="6" y="3" width="2" height="3" fill="currentColor" rx="1"/>
     <rect x="9" y="3" width="2" height="3" fill="currentColor" rx="1"/>
     <line x1="8" y1="9" x2="10" y2="12" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="9" x2="6" y2="12" stroke="currentColor" stroke-width="1.5"/>`,

  focus_lens:
    `<circle cx="8" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="7" r="2.5" fill="currentColor" opacity=".3"/>
     <line x1="11.5" y1="10.5" x2="14" y2="13" stroke="currentColor" stroke-width="2.5"/>
     <line x1="13" y1="13" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
     <rect x="7" y="5.5" width="1" height="1.5" fill="#fff" opacity=".5"/>`,

  hardy_soul:
    `<path d="M8 12 Q4 8 4 6 Q4 3 6.5 3 Q7.5 3 8 4.5 Q8.5 3 9.5 3 Q12 3 12 6 Q12 8 8 12Z" fill="currentColor" opacity=".5"/>
     <path d="M8 12 Q4 8 4 6 Q4 3 6.5 3 Q7.5 3 8 4.5 Q8.5 3 9.5 3 Q12 3 12 6 Q12 8 8 12Z" fill="none" stroke="currentColor" stroke-width="1"/>
     <path d="M4 10 Q4 14 8 15 Q12 14 12 10" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M3 9 Q3 14 8 15 Q13 14 13 9" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"/>`,

  battle_rhythm:
    `<line x1="2" y1="8" x2="4" y2="4" stroke="currentColor" stroke-width="2"/>
     <line x1="4" y1="4" x2="6" y2="10" stroke="currentColor" stroke-width="2"/>
     <line x1="6" y1="10" x2="8" y2="5" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="5" x2="10" y2="11" stroke="currentColor" stroke-width="2"/>
     <line x1="10" y1="11" x2="12" y2="6" stroke="currentColor" stroke-width="2"/>
     <line x1="12" y1="6" x2="14" y2="8" stroke="currentColor" stroke-width="2"/>`,

  gold_hoard:
    `<circle cx="6" cy="10" r="3" fill="currentColor" opacity=".6"/>
     <circle cx="10" cy="10" r="3" fill="currentColor" opacity=".6"/>
     <circle cx="8" cy="7" r="3" fill="currentColor" opacity=".75"/>
     <circle cx="8" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="1"/>
     <circle cx="5" cy="13" r="2" fill="currentColor" opacity=".5"/>
     <circle cx="11" cy="13" r="2" fill="currentColor" opacity=".5"/>`,

  quick_hands:
    `<rect x="2" y="7" width="5" height="5" fill="currentColor" opacity=".45" rx="1"/>
     <rect x="2" y="7" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <polygon points="6,3 8,6 5,6" fill="currentColor"/>
     <rect x="9" y="7" width="5" height="5" fill="currentColor" opacity=".45" rx="1"/>
     <rect x="9" y="7" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <polygon points="10,3 12,6 9,6" fill="currentColor"/>
     <line x1="7" y1="4" x2="9" y2="4" stroke="currentColor" stroke-width="1.5"/>`,

  survivors_grit:
    `<path d="M3 4 Q3 11 8 14 Q13 11 13 4 Q8 2 3 4Z" fill="currentColor" opacity=".3"/>
     <path d="M3 4 Q3 11 8 14 Q13 11 13 4 Q8 2 3 4Z" fill="none" stroke="currentColor" stroke-width="2"/>
     <line x1="5" y1="5" x2="9" y2="11" stroke="currentColor" stroke-width="2"/>
     <line x1="9" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>`,

  ember_heart:
    `<path d="M8 13 Q3 9 3 7 Q3 4 5.5 4 Q6.5 4 7.5 5.5 Q7.5 4 8 4 Q8.5 4 9 5.5 Q10 4 10.5 4 Q13 4 13 7 Q13 9 8 13Z" fill="currentColor" opacity=".5"/>
     <path d="M8 13 Q3 9 3 7 Q3 4 5.5 4 Q6.5 4 7.5 5.5 Q7.5 4 8 4 Q8.5 4 9 5.5 Q10 4 10.5 4 Q13 4 13 7 Q13 9 8 13Z" fill="none" stroke="currentColor" stroke-width="1"/>
     <polygon points="8,5 7,8 9,8 7,12" fill="currentColor" opacity=".9"/>`,

  storm_core_artifact:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="8" r="3" fill="currentColor" opacity=".3"/>
     <path d="M8 2 Q14 6 12 12 Q8 15 4 12 Q1 8 4 3 Q6 1 8 2" fill="none" stroke="currentColor" stroke-width="1" opacity=".55"/>
     <polygon points="9,5 7,8 9,8 7,11" fill="currentColor"/>`,

  iron_skin:
    `<polygon points="8,2 12,5 12,11 8,14 4,11 4,5" fill="currentColor" opacity=".35"/>
     <polygon points="8,2 12,5 12,11 8,14 4,11 4,5" fill="none" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="4" y1="5" x2="12" y2="11" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="12" y1="5" x2="4" y2="11" stroke="currentColor" stroke-width="1" opacity=".5"/>`,

  warlords_banner:
    `<line x1="4" y1="1" x2="4" y2="15" stroke="currentColor" stroke-width="2"/>
     <polygon points="4,2 14,5 4,9" fill="currentColor" opacity=".75"/>
     <line x1="2" y1="14" x2="8" y2="14" stroke="currentColor" stroke-width="2"/>`,
};

// ── Public render function ─────────────────────────────────────────────────
function passiveIconSVG(passive, size) {
  size = size || 24;
  // Determine color: element passives use element color, else gold
  const elemColor = _ELEM_COLOR && _ELEM_COLOR[passive.element];
  const color = elemColor || '#c8a060';
  // Key lookup: artifacts use their own id, passives use id
  const key = passive.id === 'storm_core' ? 'storm_core_artifact' : passive.id;
  const inner = PASSIVE_ICON_DATA[key] || `<circle cx="8" cy="8" r="5" fill="currentColor" opacity=".6"/>`;
  return `<svg viewBox="0 0 16 16" width="${size}" height="${size}" style="color:${color};display:block" shape-rendering="crispEdges" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
