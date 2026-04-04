// ── Spell Icon System ─────────────────────────────────────────────────────────
// Every spell gets a unique pixel-art SVG icon on a 16×16 grid.
// No two spells share the same art. Icons use the element color via currentColor.

const _ELEM_COLOR = {
  Fire:      '#e05830',
  Water:     '#3090d0',
  Ice:       '#70c8e0',
  Lightning: '#e8d040',
  Earth:     '#907040',
  Nature:    '#50a830',
  Plasma:    '#c040d0',
  Air:       '#90b8cc',
  Neutral:   '#a09080',
};

// SVG inner content for each spell (16×16 viewBox, fill="currentColor")
const SPELL_ICON_DATA = {

  // ── FIRE ──────────────────────────────────────────────────────────────────
  ignite:
    `<polygon points="8,1 11,5 13,3 11,8 14,8 10,12 8,15 6,12 2,8 5,8 3,3 5,5" fill="currentColor" opacity=".85"/>
     <polygon points="8,5 10,8 8,12 6,8" fill="#fff" opacity=".35"/>`,

  ember_storm:
    `<circle cx="4" cy="12" r="2.5" fill="currentColor"/>
     <circle cx="8" cy="4" r="2.5" fill="currentColor"/>
     <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
     <line x1="4" y1="12" x2="8" y2="4" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="8" y1="4" x2="12" y2="12" stroke="currentColor" stroke-width="1" opacity=".5"/>`,

  flame_wave:
    `<path d="M1 10 Q4 6 8 10 Q12 6 15 10" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="4,9 5,5 6.5,8 8,3 9.5,8 11,5 12,9" fill="currentColor" opacity=".75"/>`,

  firewall:
    `<rect x="1" y="7" width="3" height="8" fill="currentColor" opacity=".75"/>
     <rect x="6" y="7" width="3" height="8" fill="currentColor" opacity=".75"/>
     <rect x="11" y="7" width="3" height="8" fill="currentColor" opacity=".75"/>
     <polygon points="2.5,7 3.5,2 4.5,7" fill="currentColor"/>
     <polygon points="7.5,7 8.5,2 9.5,7" fill="currentColor"/>
     <polygon points="12.5,7 13.5,2 14.5,7" fill="currentColor"/>`,

  grease_fire:
    `<ellipse cx="8" cy="12" rx="5.5" ry="2.5" fill="currentColor" opacity=".4"/>
     <ellipse cx="8" cy="12" rx="5.5" ry="2.5" fill="none" stroke="currentColor" stroke-width="1"/>
     <path d="M7 12 Q7.5 8 8 5 Q8.5 8 9 12" fill="currentColor" opacity=".8"/>`,

  extinguish:
    `<path d="M8 2 Q12 7 12 10 Q12 14 8 14 Q4 14 4 10 Q4 7 8 2Z" fill="currentColor" opacity=".3"/>
     <path d="M8 2 Q12 7 12 10 Q12 14 8 14 Q4 14 4 10 Q4 7 8 2Z" fill="none" stroke="currentColor" stroke-width="1"/>
     <line x1="5" y1="8" x2="11" y2="13" stroke="currentColor" stroke-width="2"/>
     <line x1="11" y1="8" x2="5" y2="13" stroke="currentColor" stroke-width="2"/>`,

  fire_heal:
    `<rect x="6" y="2" width="4" height="12" fill="currentColor"/>
     <rect x="2" y="6" width="12" height="4" fill="currentColor"/>
     <rect x="7" y="3" width="2" height="2" fill="#fff" opacity=".4"/>`,

  fire_rage:
    `<polygon points="8,1 10,5 14,3 12,7 15,8 12,9 14,13 10,11 8,15 6,11 2,13 4,9 1,8 4,7 2,3 6,5" fill="currentColor" opacity=".85"/>`,

  brave_burn:
    `<path d="M8 2 L14 5 L14 10 Q14 14 8 15 Q2 14 2 10 L2 5 Z" fill="currentColor" opacity=".25"/>
     <path d="M8 2 L14 5 L14 10 Q14 14 8 15 Q2 14 2 10 L2 5 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="8,5 10,8 12,7 10,11 8,13 6,11 4,7 6,8" fill="currentColor" opacity=".8"/>`,

  melt_strike:
    `<rect x="3" y="2" width="10" height="5" fill="currentColor" opacity=".6"/>
     <rect x="3" y="2" width="10" height="5" fill="none" stroke="currentColor" stroke-width="1"/>
     <rect x="7" y="7" width="2" height="7" fill="currentColor" opacity=".7"/>
     <rect x="5" y="13" width="6" height="2" fill="currentColor" opacity=".8"/>
     <rect x="4" y="2" width="2" height="1" fill="#fff" opacity=".4"/>`,

  forge_blast:
    `<circle cx="8" cy="8" r="3.5" fill="currentColor" opacity=".5"/>
     <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="2.5" y1="2.5" x2="4.5" y2="4.5" stroke="currentColor" stroke-width="2"/>
     <line x1="11.5" y1="11.5" x2="13.5" y2="13.5" stroke="currentColor" stroke-width="2"/>
     <line x1="2.5" y1="13.5" x2="4.5" y2="11.5" stroke="currentColor" stroke-width="2"/>
     <line x1="11.5" y1="4.5" x2="13.5" y2="2.5" stroke="currentColor" stroke-width="2"/>`,

  crucible:
    `<path d="M3 8 Q2 14 8 15 Q14 14 13 8Z" fill="currentColor" opacity=".45"/>
     <path d="M3 8 Q2 14 8 15 Q14 14 13 8Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2"/>
     <rect x="5" y="4" width="2" height="4" fill="currentColor" opacity=".6"/>
     <rect x="9" y="4" width="2" height="4" fill="currentColor" opacity=".6"/>`,

  scorch_through:
    `<rect x="0" y="7" width="16" height="2" fill="currentColor" opacity=".35"/>
     <polygon points="8,4 14,8 8,12 8,10 2,10 2,6 8,6" fill="currentColor" opacity=".9"/>`,

  slag:
    `<ellipse cx="8" cy="11" rx="5.5" ry="3.5" fill="currentColor" opacity=".45"/>
     <ellipse cx="8" cy="11" rx="5.5" ry="3.5" fill="none" stroke="currentColor" stroke-width="1"/>
     <path d="M7 11 Q7.5 7 8 4 Q8.5 7 9 11" fill="currentColor"/>
     <ellipse cx="8" cy="4" rx="2" ry="1.5" fill="currentColor" opacity=".5"/>`,

  heat_surge:
    `<polygon points="4,13 6,13 6,7" fill="currentColor" opacity=".6"/>
     <polygon points="3,7 7,7 5,3" fill="currentColor"/>
     <polygon points="9,13 11,13 11,7" fill="currentColor" opacity=".6"/>
     <polygon points="8,7 12,7 10,3" fill="currentColor"/>`,

  smelt:
    `<path d="M3 8 Q3 3 8 3 Q13 3 13 8" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="11,1 15,5 11,5" fill="currentColor"/>
     <path d="M13 8 Q13 13 8 13 Q3 13 3 8" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="5,11 1,11 5,15" fill="currentColor"/>`,

  overheat:
    `<rect x="6" y="2" width="4" height="10" fill="none" stroke="currentColor" stroke-width="1.5" rx="2"/>
     <rect x="7.5" y="6" width="1.5" height="5.5" fill="currentColor"/>
     <circle cx="8" cy="13" r="2.5" fill="currentColor" opacity=".5"/>
     <circle cx="8" cy="13" r="1.5" fill="currentColor"/>`,

  crucible_burst:
    `<circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
     <rect x="6" y="1" width="4" height="4" fill="currentColor" rx="1"/>
     <rect x="6" y="11" width="4" height="4" fill="currentColor" rx="1"/>
     <rect x="1" y="6" width="4" height="4" fill="currentColor" rx="1"/>
     <rect x="11" y="6" width="4" height="4" fill="currentColor" rx="1"/>`,

  molten_surge:
    `<path d="M1 13 Q4 9 8 13 Q12 9 15 13" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M2 9 Q5 5 8 9 Q11 5 14 9" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M3 5 Q6 1 8 5 Q10 1 13 5" fill="none" stroke="currentColor" stroke-width="2"/>`,

  melt_down:
    `<rect x="2" y="2" width="12" height="5" fill="currentColor" opacity=".5"/>
     <rect x="2" y="2" width="12" height="5" fill="none" stroke="currentColor" stroke-width="1"/>
     <path d="M5 7 Q5 11 7 13 Q8 15 8 13 Q8 15 9 13 Q11 11 11 7" fill="currentColor"/>
     <path d="M7 7 Q7 10 8 11 Q9 10 9 7" fill="#fff" opacity=".3"/>`,

  temper:
    `<rect x="7" y="2" width="2" height="10" fill="currentColor"/>
     <rect x="4" y="6" width="8" height="2" fill="currentColor"/>
     <rect x="7" y="12" width="2" height="3" fill="currentColor" opacity=".55"/>
     <rect x="5" y="14" width="6" height="2" fill="currentColor" opacity=".8"/>
     <rect x="7" y="2" width="1" height="4" fill="#fff" opacity=".4"/>`,

  white_heat:
    `<polygon points="8,1 9.5,6.5 15,8 9.5,9.5 8,15 6.5,9.5 1,8 6.5,6.5" fill="currentColor" opacity=".85"/>
     <polygon points="8,4 8.7,7.3 12,8 8.7,8.7 8,12 7.3,8.7 4,8 7.3,7.3" fill="#fff" opacity=".5"/>`,

  searing_verdict:
    `<line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <path d="M1 5 Q1 9 4.5 9 Q8 9 8 5" fill="currentColor" opacity=".4"/>
     <path d="M8 5 Q8 12 11.5 12 Q15 12 15 5" fill="currentColor" opacity=".35"/>
     <rect x="7" y="13" width="2" height="2" fill="currentColor"/>`,

  // ── WATER ─────────────────────────────────────────────────────────────────
  tidal_surge:
    `<path d="M1 5 Q4 2 8 5 Q12 2 15 5" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M1 9 Q4 6 8 9 Q12 6 15 9" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M1 13 Q4 10 8 13 Q12 10 15 13" fill="none" stroke="currentColor" stroke-width="2"/>`,

  whirlpool:
    `<path d="M8,8 Q13,4 13,9 Q13,13 8,13 Q4,13 4,9 Q4,5 7,4 Q12,3 14,7" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M7 4 Q4 2 3 5 Q2 9 5 11" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="9" r="1.5" fill="currentColor"/>`,

  healing_tide:
    `<path d="M8 2 Q12 7 12 10 Q12 14 8 14 Q4 14 4 10 Q4 7 8 2Z" fill="currentColor" opacity=".3"/>
     <path d="M8 2 Q12 7 12 10 Q12 14 8 14 Q4 14 4 10 Q4 7 8 2Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="6" y="7" width="4" height="2" fill="currentColor"/>
     <rect x="7" y="6" width="2" height="4" fill="currentColor"/>`,

  riptide:
    `<polygon points="1,5 6,8 1,11" fill="currentColor" opacity=".5"/>
     <polygon points="5,4 10,8 5,12" fill="currentColor" opacity=".7"/>
     <polygon points="9,3 15,8 9,13" fill="currentColor"/>`,

  drown:
    `<path d="M4 9 Q4 4 8 4 Q12 4 12 9 L12 10 L10 10 L10 12 L6 12 L6 10 L4 10 Z" fill="currentColor" opacity=".5"/>
     <rect x="6" y="6" width="1.5" height="2" fill="currentColor"/>
     <rect x="8.5" y="6" width="1.5" height="2" fill="currentColor"/>
     <path d="M2 13 Q5 11 8 13 Q11 11 14 13" fill="none" stroke="currentColor" stroke-width="1.5"/>`,

  tidal_shield:
    `<path d="M3 4 Q3 12 8 15 Q13 12 13 4 Q8 2 3 4Z" fill="currentColor" opacity=".25"/>
     <path d="M3 4 Q3 12 8 15 Q13 12 13 4 Q8 2 3 4Z" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M2 9 Q5 6 8 9 Q11 6 14 9" fill="none" stroke="currentColor" stroke-width="1.5"/>`,

  deep_current:
    `<line x1="1" y1="6" x2="12" y2="6" stroke="currentColor" stroke-width="2"/>
     <polygon points="11,4 15,6 11,8" fill="currentColor"/>
     <line x1="1" y1="10" x2="12" y2="10" stroke="currentColor" stroke-width="2"/>
     <polygon points="11,8 15,10 11,12" fill="currentColor"/>`,

  cleanse_current:
    `<circle cx="4" cy="4" r="1.5" fill="currentColor"/>
     <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
     <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
     <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
     <circle cx="14" cy="8" r="1.5" fill="currentColor"/>
     <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
     <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
     <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".4"/>`,

  tsunami:
    `<path d="M1 10 Q5 2 11 7 Q13 9 15 5" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <path d="M11 7 Q13 5 15 5 Q14 8 12 11 Q8 14 4 13 Q1 12 1 10" fill="currentColor" opacity=".4"/>`,

  // ── ICE ───────────────────────────────────────────────────────────────────
  frost_bolt:
    `<polygon points="8,1 10,10 8,14 6,10" fill="currentColor" opacity=".8"/>
     <rect x="7" y="1" width="1" height="3" fill="#fff" opacity=".6"/>
     <polygon points="5,7 8,14 11,7 9,8 8,6 7,8" fill="currentColor" opacity=".35"/>`,

  ice_block:
    `<rect x="2" y="4" width="12" height="10" fill="currentColor" opacity=".3"/>
     <rect x="2" y="4" width="12" height="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="6" y1="4" x2="6" y2="14" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <rect x="3" y="5" width="2" height="1.5" fill="#fff" opacity=".45"/>`,

  glacial_spike:
    `<polygon points="8,1 10,6 9,6 9.5,14 8,15 6.5,14 7,6 6,6" fill="currentColor" opacity=".85"/>
     <rect x="7" y="1" width="1" height="3" fill="#fff" opacity=".55"/>`,

  snowflake:
    `<line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2.5" y1="2.5" x2="13.5" y2="13.5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="13.5" y1="2.5" x2="2.5" y2="13.5" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="8" r="2" fill="currentColor"/>
     <circle cx="8" cy="1.5" r="1" fill="currentColor"/>
     <circle cx="8" cy="14.5" r="1" fill="currentColor"/>
     <circle cx="1.5" cy="8" r="1" fill="currentColor"/>
     <circle cx="14.5" cy="8" r="1" fill="currentColor"/>`,

  flash_freeze:
    `<polygon points="5,1 7,7 5,13 3,7" fill="currentColor" opacity=".85"/>
     <polygon points="11,1 13,7 11,13 9,7" fill="currentColor" opacity=".85"/>
     <rect x="7" y="6" width="2" height="2" fill="currentColor" opacity=".5"/>
     <rect x="4" y="1" width="2" height="1" fill="#fff" opacity=".5"/>
     <rect x="10" y="1" width="2" height="1" fill="#fff" opacity=".5"/>`,

  shatter:
    `<polygon points="4,3 12,3 14,8 12,13 4,13 2,8" fill="currentColor" opacity=".25"/>
     <polygon points="4,3 12,3 14,8 12,13 4,13 2,8" fill="none" stroke="currentColor" stroke-width="1"/>
     <line x1="8" y1="3" x2="5" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="3" x2="14" y2="9" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="8" x2="9" y2="13" stroke="currentColor" stroke-width="1.5"/>`,

  frozen_ground:
    `<line x1="1" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="2"/>
     <polygon points="4,11 5,5 6,11" fill="currentColor" opacity=".85"/>
     <polygon points="8,11 9,3 10,11" fill="currentColor" opacity=".85"/>
     <polygon points="11,11 12,7 13,11" fill="currentColor" opacity=".85"/>`,

  cryostasis:
    `<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".4"/>
     <rect x="10" y="3" width="3" height="1" fill="currentColor"/>
     <line x1="13" y1="3" x2="10" y2="5" stroke="currentColor" stroke-width="1"/>
     <rect x="10" y="5" width="3" height="1" fill="currentColor"/>
     <rect x="11" y="1" width="2.5" height="1" fill="currentColor" opacity=".6"/>`,

  ice_age:
    `<polygon points="8,2 14,13 2,13" fill="currentColor" opacity=".45"/>
     <polygon points="8,2 14,13 2,13" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="5,9 8,2 11,9" fill="currentColor" opacity=".7"/>
     <line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="2"/>`,

  // ── LIGHTNING ─────────────────────────────────────────────────────────────
  zap:
    `<polygon points="10,1 6,8 9,8 6,15 14,6 10,6 13,1" fill="currentColor" opacity=".9"/>`,

  chain_lightning:
    `<polyline points="2,3 6,3 4,8 9,8 7,12 11,12 9,15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>`,

  overcharge:
    `<rect x="4" y="8" width="8" height="6" fill="currentColor" opacity=".55" rx="1"/>
     <rect x="4" y="8" width="8" height="6" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <rect x="5" y="5" width="6" height="4" fill="currentColor" opacity=".7" rx="1"/>
     <rect x="5" y="3" width="2" height="3" fill="currentColor" rx="1"/>
     <rect x="9" y="3" width="2" height="3" fill="currentColor" rx="1"/>`,

  blitz:
    `<polygon points="8,1 10,5 14,3 12,7 15,9 11,9 13,13 9,11 8,15 7,11 3,13 5,9 1,9 4,7 2,3 6,5" fill="currentColor" opacity=".85"/>`,

  recharge:
    `<rect x="3" y="5" width="10" height="9" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/>
     <rect x="6" y="3" width="4" height="2" fill="currentColor"/>
     <rect x="4" y="6" width="8" height="7" fill="currentColor" opacity=".25"/>
     <rect x="4" y="9" width="8" height="4" fill="currentColor" opacity=".65"/>`,

  electrocute:
    `<path d="M4 9 Q4 4 8 4 Q12 4 12 9 L12 10 L10 10 L10 12 L6 12 L6 10 L4 10 Z" fill="currentColor" opacity=".45"/>
     <rect x="6" y="6" width="1.5" height="2" fill="currentColor"/>
     <rect x="8.5" y="6" width="1.5" height="2" fill="currentColor"/>
     <polygon points="9,1 7,6 9,6 7,13 13,5 10,5" fill="currentColor" opacity=".85"/>`,

  feedback:
    `<path d="M3 8 Q3 3 8 3 Q13 3 13 8" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="11,1 15,5 11,5" fill="currentColor"/>
     <path d="M13 8 Q13 13 8 13 Q3 13 3 8" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="5,11 1,11 5,15" fill="currentColor"/>`,

  short_circuit:
    `<line x1="1" y1="8" x2="6" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="10" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>
     <circle cx="6" cy="8" r="1.5" fill="currentColor"/>
     <circle cx="10" cy="8" r="1.5" fill="currentColor"/>
     <polygon points="8,3 7,7 9,7" fill="currentColor"/>
     <line x1="6" y1="8" x2="8" y2="4" stroke="currentColor" stroke-width="1"/>
     <line x1="10" y1="8" x2="8" y2="4" stroke="currentColor" stroke-width="1"/>`,

  static_cleanse:
    `<line x1="11" y1="2" x2="4" y2="13" stroke="currentColor" stroke-width="2.5"/>
     <path d="M2 12 Q4 10 7 11 Q10 10 13 12 L11 15 Q7 15 2 12Z" fill="currentColor" opacity=".7"/>
     <line x1="11" y1="2" x2="13" y2="1" stroke="currentColor" stroke-width="1.5"/>`,

  charge_shot:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1"/>
     <polygon points="9,2 7,7 9,7 7,14 12,6 10,6" fill="currentColor" opacity=".9"/>`,

  bolt:
    `<polygon points="1,6 9,6 9,3 15,8 9,13 9,10 1,10" fill="currentColor" opacity=".85"/>`,

  thunder_strike:
    `<polygon points="7,1 11,1 10,6 14,6 8,15 9,9 4,9" fill="currentColor" opacity=".9"/>
     <rect x="8" y="1" width="2" height="1" fill="#fff" opacity=".5"/>`,

  ball_lightning:
    `<circle cx="8" cy="8" r="6" fill="currentColor" opacity=".18"/>
     <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="8" r="3.5" fill="currentColor" opacity=".4"/>
     <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
     <line x1="8" y1="2" x2="8" y2="4" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11.5" y1="4.5" x2="10" y2="5.5" stroke="currentColor" stroke-width="1.5"/>`,

  static_charge:
    `<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <rect x="7" y="3" width="2" height="3" fill="currentColor" rx="1"/>
     <rect x="7" y="10" width="2" height="3" fill="currentColor" rx="1"/>
     <rect x="3" y="7" width="3" height="2" fill="currentColor" rx="1"/>
     <rect x="10" y="7" width="3" height="2" fill="currentColor" rx="1"/>`,

  megavolt:
    `<polygon points="9,1 14,1 13,6 15,6 8,15 10,8 4,8 9,1" fill="currentColor" opacity=".9"/>
     <rect x="10" y="1" width="3" height="1" fill="#fff" opacity=".4"/>`,

  supercharge:
    `<polygon points="4,12 6,12 6,7" fill="currentColor" opacity=".6"/>
     <polygon points="3,7 7,7 5,3" fill="currentColor"/>
     <polygon points="10,12 12,12 12,7" fill="currentColor" opacity=".6"/>
     <polygon points="9,7 13,7 11,3" fill="currentColor"/>
     <circle cx="8" cy="14" r="1.5" fill="currentColor" opacity=".7"/>`,

  overclock:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="8" x2="8" y2="4" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="8" x2="11" y2="9" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
     <line x1="8" y1="2" x2="8" y2="3" stroke="currentColor" stroke-width="1.5"/>
     <line x1="14" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5"/>`,

  residual_current:
    `<polygon points="9,1 7,6 9,6 7,11" fill="currentColor" opacity=".8"/>
     <path d="M7 11 Q9 12 8.5 14 Q8 15.5 7.5 14 Q7 12 7 11Z" fill="currentColor"/>
     <line x1="5" y1="8" x2="4" y2="11" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="11" y1="8" x2="12" y2="11" stroke="currentColor" stroke-width="1" opacity=".5"/>`,

  detonator:
    `<circle cx="9" cy="10" r="5" fill="currentColor" opacity=".4"/>
     <circle cx="9" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="8" y="4" width="2" height="4" fill="currentColor"/>
     <line x1="8" y1="4" x2="5" y2="1" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="5" cy="1" r="1" fill="currentColor" opacity=".7"/>`,

  grounded:
    `<line x1="8" y1="2" x2="8" y2="9" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="2" r="2" fill="currentColor" opacity=".5"/>
     <line x1="3" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="2.5"/>
     <line x1="4" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="2"/>
     <line x1="5" y1="13" x2="11" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" stroke-width="1"/>`,

  thunderclap:
    `<path d="M2 5 Q2 2 5 2 Q8 2 8 5" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M8 11 Q8 14 11 14 Q14 14 14 11" fill="none" stroke="currentColor" stroke-width="2"/>
     <polygon points="6,5 8,8 5,8" fill="currentColor" opacity=".6"/>
     <polygon points="10,8 8,8 11,11" fill="currentColor" opacity=".6"/>
     <circle cx="8" cy="8" r="2" fill="currentColor" opacity=".5"/>`,

  fulgurite:
    `<rect x="6" y="1" width="4" height="12" fill="currentColor" opacity=".3" rx="2"/>
     <rect x="6" y="1" width="4" height="12" fill="none" stroke="currentColor" stroke-width="1.5" rx="2"/>
     <path d="M7 2 Q7.5 5 7 8 Q7.5 11 7 13" fill="none" stroke="currentColor" stroke-width="1"/>
     <circle cx="8" cy="14" r="2.5" fill="currentColor" opacity=".6"/>`,

  // ── EARTH ─────────────────────────────────────────────────────────────────
  seismic_wave:
    `<path d="M1 12 Q4 9 8 12 Q12 9 15 12" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M1 8 Q4 5 8 8 Q12 5 15 8" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M3 4 Q6 1 9 4 Q12 1 14 4" fill="none" stroke="currentColor" stroke-width="1.5"/>`,

  fortify:
    `<rect x="3" y="6" width="10" height="9" fill="currentColor" opacity=".45"/>
     <rect x="3" y="6" width="10" height="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="3" y="3" width="3" height="4" fill="currentColor" opacity=".8"/>
     <rect x="10" y="3" width="3" height="4" fill="currentColor" opacity=".8"/>
     <rect x="6" y="4" width="4" height="3" fill="currentColor" opacity=".6"/>
     <rect x="6" y="10" width="4" height="5" fill="currentColor" opacity=".5"/>`,

  echo_slam:
    `<circle cx="8" cy="11" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="11" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="8" cy="11" r="0.8" fill="currentColor"/>
     <polygon points="5,1 11,1 9,5 7,5" fill="currentColor"/>`,

  stone_stance:
    `<rect x="2" y="5" width="4" height="10" fill="currentColor" opacity=".65"/>
     <rect x="10" y="5" width="4" height="10" fill="currentColor" opacity=".65"/>
     <rect x="1" y="5" width="14" height="2" fill="currentColor" opacity=".85"/>
     <rect x="1" y="13" width="14" height="2" fill="currentColor" opacity=".85"/>`,

  stone_sanctuary:
    `<path d="M2 14 L2 7 Q2 3 8 3 Q14 3 14 7 L14 14" fill="none" stroke="currentColor" stroke-width="2"/>
     <line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="2"/>
     <rect x="4" y="9" width="8" height="5" fill="currentColor" opacity=".2"/>`,

  earthshaker:
    `<rect x="4" y="5" width="8" height="7" fill="currentColor" opacity=".5" rx="1"/>
     <rect x="4" y="5" width="8" height="7" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <rect x="5" y="3" width="6" height="3" fill="currentColor" opacity=".6" rx="1"/>
     <line x1="1" y1="13" x2="15" y2="13" stroke="currentColor" stroke-width="2.5"/>
     <line x1="4" y1="13" x2="3" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="12" y1="13" x2="13" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>`,

  dig:
    `<line x1="12" y1="2" x2="4" y2="12" stroke="currentColor" stroke-width="2.5"/>
     <path d="M10 2 L14 3 L13 7 L9 5Z" fill="currentColor" opacity=".8"/>
     <rect x="2" y="11" width="5" height="2" fill="currentColor" rx="1"/>`,

  cataclysm:
    `<line x1="1" y1="9" x2="15" y2="9" stroke="currentColor" stroke-width="2.5"/>
     <polygon points="6,9 10,9 8,2" fill="currentColor" opacity=".85"/>
     <line x1="2" y1="10" x2="5" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="10" x2="8" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="14" y1="10" x2="11" y2="15" stroke="currentColor" stroke-width="2"/>`,

  // ── NATURE ────────────────────────────────────────────────────────────────
  vine_strike:
    `<path d="M2 14 Q5 9 9 7 Q13 5 14 2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
     <circle cx="14" cy="2" r="2.5" fill="currentColor" opacity=".6"/>`,

  thornwall:
    `<rect x="1" y="7" width="14" height="4" fill="currentColor" opacity=".5"/>
     <rect x="1" y="7" width="14" height="4" fill="none" stroke="currentColor" stroke-width="1"/>
     <line x1="4" y1="7" x2="3" y2="3" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="7" x2="8" y2="2" stroke="currentColor" stroke-width="1.5"/>
     <line x1="12" y1="7" x2="13" y2="3" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
     <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
     <circle cx="13" cy="3" r="1.5" fill="currentColor"/>`,

  natures_call:
    `<polygon points="2,5 7,5 11,2 11,14 7,11 2,11" fill="currentColor" opacity=".45"/>
     <polygon points="2,5 7,5 11,2 11,14 7,11 2,11" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="8" x2="14" y2="6" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="8" x2="14" y2="10" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/>`,

  bramble_burst:
    `<polygon points="8,2 10,6 15,6 11,9 13,14 8,11 3,14 5,9 1,6 6,6" fill="currentColor" opacity=".3"/>
     <polygon points="8,2 10,6 15,6 11,9 13,14 8,11 3,14 5,9 1,6 6,6" fill="none" stroke="currentColor" stroke-width="1"/>
     <line x1="8" y1="2" x2="8" y2="0" stroke="currentColor" stroke-width="1.5"/>
     <line x1="14" y1="6" x2="16" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="13" y1="13" x2="15" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="6" x2="0" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="3" y1="13" x2="1" y2="15" stroke="currentColor" stroke-width="1.5"/>`,

  wild_growth:
    `<line x1="8" y1="14" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
     <path d="M8 10 Q5 8 3 9" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M8 8 Q11 6 13 7" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M7 6 Q6 3 8 2 Q10 3 9 6Z" fill="currentColor" opacity=".8"/>`,

  living_forest:
    `<rect x="7" y="10" width="2" height="5" fill="currentColor"/>
     <line x1="8" y1="10" x2="4" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="10" x2="12" y2="8" stroke="currentColor" stroke-width="2"/>
     <polygon points="8,2 13,8 3,8" fill="currentColor" opacity=".8"/>
     <circle cx="4" cy="8" r="2" fill="currentColor" opacity=".5"/>
     <circle cx="12" cy="8" r="2" fill="currentColor" opacity=".5"/>`,

  spreading_vines:
    `<line x1="8" y1="14" x2="3" y2="7" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="14" x2="8" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="14" x2="13" y2="7" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="3" cy="6" r="2.5" fill="currentColor" opacity=".6"/>
     <circle cx="8" cy="4" r="2.5" fill="currentColor" opacity=".6"/>
     <circle cx="13" cy="6" r="2.5" fill="currentColor" opacity=".6"/>
     <line x1="3" y1="6" x2="1" y2="3" stroke="currentColor" stroke-width="1"/>
     <line x1="13" y1="6" x2="15" y2="3" stroke="currentColor" stroke-width="1"/>`,

  nourish:
    `<circle cx="8" cy="6" r="3" fill="currentColor" opacity=".5"/>
     <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="9" x2="8" y2="11" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="6" x2="4" y2="6" stroke="currentColor" stroke-width="1.5"/>
     <line x1="12" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1.5"/>
     <line x1="3.5" y1="3.5" x2="5" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="9" x2="12.5" y2="10.5" stroke="currentColor" stroke-width="1.5"/>
     <path d="M5 11 Q6 13 8 14 Q10 13 11 11 Q8 10 5 11Z" fill="currentColor"/>`,

  natures_wrath:
    `<polygon points="9,1 6,7 8.5,7 6,13 3,11 7,15 9,9 12,9 9,1" fill="currentColor" opacity=".9"/>
     <path d="M1 12 Q3 11 5 12" fill="none" stroke="currentColor" stroke-width="1" opacity=".6"/>`,

  damage_seed:
    `<circle cx="8" cy="10" r="4" fill="currentColor" opacity=".45"/>
     <circle cx="8" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="1"/>
     <polygon points="8,1 10,7 8,6.5 6,7" fill="currentColor"/>`,

  root_seed:
    `<circle cx="8" cy="6" r="4" fill="currentColor" opacity=".45"/>
     <circle cx="8" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1"/>
     <line x1="8" y1="10" x2="8" y2="13" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="12" x2="5" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="8" y1="12" x2="11" y2="15" stroke="currentColor" stroke-width="1.5"/>
     <line x1="6" y1="13" x2="4" y2="14" stroke="currentColor" stroke-width="1"/>
     <line x1="10" y1="13" x2="12" y2="14" stroke="currentColor" stroke-width="1"/>`,

  silence_seed:
    `<circle cx="8" cy="7" r="4" fill="currentColor" opacity=".4"/>
     <circle cx="8" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1"/>
     <circle cx="8" cy="13" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="5.5" y1="11" x2="10.5" y2="15" stroke="currentColor" stroke-width="2"/>`,

  healing_seed:
    `<ellipse cx="8" cy="9" rx="4" ry="5" fill="currentColor" opacity=".35"/>
     <ellipse cx="8" cy="9" rx="4" ry="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="6" y="7" width="4" height="1.5" fill="currentColor"/>
     <rect x="7" y="6" width="2" height="3.5" fill="currentColor"/>
     <line x1="8" y1="4" x2="8" y2="2" stroke="currentColor" stroke-width="1.5"/>`,

  accelerate:
    `<line x1="1" y1="5" x2="11" y2="5" stroke="currentColor" stroke-width="2"/>
     <polygon points="10,3 15,5 10,7" fill="currentColor"/>
     <line x1="3" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="2"/>
     <polygon points="10,6 15,8 10,10" fill="currentColor"/>
     <line x1="1" y1="11" x2="11" y2="11" stroke="currentColor" stroke-width="2"/>
     <polygon points="10,9 15,11 10,13" fill="currentColor"/>`,

  overgrow:
    `<path d="M4 12 Q2 8 4 5 Q6 2 9 3 Q13 2 14 6 Q15 10 13 12 Q10 15 7 14 Q4 15 4 12Z" fill="currentColor" opacity=".4"/>
     <path d="M4 12 Q2 8 4 5 Q6 2 9 3 Q13 2 14 6 Q15 10 13 12 Q10 15 7 14 Q4 15 4 12Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity=".6"/>
     <circle cx="11" cy="7" r="2" fill="currentColor" opacity=".5"/>
     <circle cx="8" cy="10" r="1.5" fill="currentColor" opacity=".5"/>`,

  cross_pollinate:
    `<circle cx="8" cy="8" r="3" fill="currentColor" opacity=".5"/>
     <polygon points="8,2 9,5 12,5 9.5,6.5" fill="currentColor" opacity=".7"/>
     <polygon points="8,2 7,5 4,5 6.5,6.5" fill="currentColor" opacity=".7"/>
     <polygon points="8,14 9,11 12,11 9.5,9.5" fill="currentColor" opacity=".7"/>
     <polygon points="8,14 7,11 4,11 6.5,9.5" fill="currentColor" opacity=".7"/>
     <circle cx="2" cy="4" r="1" fill="currentColor"/>
     <circle cx="14" cy="4" r="1" fill="currentColor"/>
     <circle cx="14" cy="12" r="1" fill="currentColor"/>
     <circle cx="2" cy="12" r="1" fill="currentColor"/>`,

  seed_surge:
    `<circle cx="8" cy="8" r="2.5" fill="currentColor" opacity=".5"/>
     <line x1="8" y1="1" x2="8" y2="5" stroke="currentColor" stroke-width="2"/>
     <line x1="8" y1="11" x2="8" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="1" y1="8" x2="5" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="11" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>
     <line x1="2.5" y1="2.5" x2="5" y2="5" stroke="currentColor" stroke-width="2"/>
     <line x1="11" y1="11" x2="13.5" y2="13.5" stroke="currentColor" stroke-width="2"/>
     <line x1="2.5" y1="13.5" x2="5" y2="11" stroke="currentColor" stroke-width="2"/>
     <line x1="11" y1="5" x2="13.5" y2="2.5" stroke="currentColor" stroke-width="2"/>`,

  deep_soil:
    `<rect x="1" y="2" width="14" height="2" fill="currentColor" opacity=".35"/>
     <rect x="1" y="5" width="14" height="2" fill="currentColor" opacity=".5"/>
     <rect x="1" y="8" width="14" height="2" fill="currentColor" opacity=".65"/>
     <rect x="1" y="11" width="14" height="2" fill="currentColor" opacity=".8"/>
     <rect x="1" y="14" width="14" height="1.5" fill="currentColor" opacity=".95"/>`,

  reap:
    `<path d="M11 1 Q14 4 13 9 Q12 12 9 14" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M9 14 Q6 15 4 13 Q2 11 4 9 Q6 8 10 10 Q13 11 13 9" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="1" x2="13.5" y2="1.5" stroke="currentColor" stroke-width="1.5"/>`,

  bloom_storm:
    `<circle cx="5" cy="4" r="2.5" fill="currentColor" opacity=".75"/>
     <circle cx="12" cy="3" r="2" fill="currentColor" opacity=".7"/>
     <circle cx="10" cy="9" r="2" fill="currentColor" opacity=".6"/>
     <circle cx="3" cy="11" r="2" fill="currentColor" opacity=".55"/>
     <circle cx="13" cy="11" r="2" fill="currentColor" opacity=".65"/>
     <line x1="5" y1="6.5" x2="4" y2="9" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="12" y1="5" x2="11" y2="7" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <line x1="10" y1="11" x2="9" y2="14" stroke="currentColor" stroke-width="1" opacity=".5"/>`,

  world_tree:
    `<rect x="7" y="9" width="2" height="6" fill="currentColor"/>
     <polygon points="8,1 14,9 2,9" fill="currentColor" opacity=".85"/>
     <polygon points="8,4 12,10 4,10" fill="currentColor" opacity=".5"/>
     <rect x="5" y="13" width="6" height="2" fill="currentColor" opacity=".5"/>`,

  // ── PLASMA ────────────────────────────────────────────────────────────────
  plasma_lance:
    `<polygon points="8,1 10,5 9.5,5 9.5,14 6.5,14 6.5,5 6,5" fill="currentColor" opacity=".85"/>
     <rect x="7" y="1" width="1" height="2" fill="#fff" opacity=".55"/>
     <rect x="4" y="12" width="8" height="1" fill="currentColor" opacity=".45"/>`,

  energy_infusion:
    `<circle cx="8" cy="8" r="6" fill="currentColor" opacity=".18"/>
     <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <rect x="7" y="4" width="2" height="8" fill="currentColor"/>
     <rect x="4" y="7" width="8" height="2" fill="currentColor"/>`,

  plasma_shield:
    `<polygon points="8,1 13,4 13,12 8,15 3,12 3,4" fill="currentColor" opacity=".2"/>
     <polygon points="8,1 13,4 13,12 8,15 3,12 3,4" fill="none" stroke="currentColor" stroke-width="2"/>`,

  self_sacrifice:
    `<path d="M8 13 Q4 9 4 7 Q4 4 6.5 4 Q7.5 4 8 5.5 Q8.5 4 9.5 4 Q12 4 12 7 Q12 9 8 13Z" fill="currentColor" opacity=".5"/>
     <path d="M8 13 Q4 9 4 7 Q4 4 6.5 4 Q7.5 4 8 5.5 Q8.5 4 9.5 4 Q12 4 12 7 Q12 9 8 13Z" fill="none" stroke="currentColor" stroke-width="1"/>
     <polygon points="6,10 10,10 8,14" fill="currentColor"/>`,

  borrowed_power:
    `<polygon points="2,2 14,2 10,8 14,14 2,14 6,8" fill="currentColor" opacity=".35"/>
     <polygon points="2,2 14,2 10,8 14,14 2,14 6,8" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1" opacity=".5"/>
     <rect x="6" y="9" width="4" height="3" fill="currentColor" opacity=".65"/>`,

  plasma_stall:
    `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1" opacity=".45"/>
     <rect x="5" y="4" width="2.5" height="8" fill="currentColor"/>
     <rect x="8.5" y="4" width="2.5" height="8" fill="currentColor"/>`,

  obliteration:
    `<circle cx="8" cy="8" r="4" fill="currentColor" opacity=".4"/>
     <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="3"/>
     <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="3"/>`,

  singularity:
    `<circle cx="8" cy="8" r="6" fill="currentColor" opacity=".12"/>
     <circle cx="8" cy="8" r="4.5" fill="currentColor" opacity=".22"/>
     <circle cx="8" cy="8" r="3" fill="currentColor" opacity=".4"/>
     <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity=".7"/>
     <circle cx="8" cy="8" r="0.7" fill="currentColor"/>
     <path d="M8 2 Q14 5 12 12 Q9 15 3 12 Q1 9 4 3" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>`,

  // ── AIR ───────────────────────────────────────────────────────────────────
  quintuple_hit:
    `<line x1="1" y1="2" x2="5" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="4" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="7" y1="2" x2="11" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="10" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="2"/>
     <line x1="13" y1="2" x2="15" y2="9" stroke="currentColor" stroke-width="1.5" opacity=".55"/>`,

  become_wind:
    `<path d="M8 14 Q13 10 13 6 Q13 2 8 2 Q5 2 4 5 Q3 8 6 10 Q8 11 10 9" fill="none" stroke="currentColor" stroke-width="2"/>
     <circle cx="8" cy="14" r="2" fill="currentColor" opacity=".55"/>`,

  wind_wall:
    `<path d="M4 2 Q3 5 4 8 Q5 11 4 14" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M8 2 Q7 5 8 8 Q9 11 8 14" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M12 2 Q11 5 12 8 Q13 11 12 14" fill="none" stroke="currentColor" stroke-width="2"/>`,

  tornado:
    `<polygon points="3,2 13,2 10,7 9,13 8,15 7,13 6,7" fill="currentColor" opacity=".45"/>
     <polygon points="3,2 13,2 10,7 9,13 8,15 7,13 6,7" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="3" y1="2" x2="13" y2="2" stroke="currentColor" stroke-width="2"/>
     <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" stroke-width="1.5"/>
     <line x1="6" y1="8" x2="10" y2="8" stroke="currentColor" stroke-width="1.5"/>`,

  twin_strike:
    `<rect x="5" y="2" width="2" height="10" fill="currentColor" opacity=".8"/>
     <rect x="4" y="7" width="4" height="2" fill="currentColor"/>
     <rect x="4" y="12" width="4" height="2" fill="currentColor" opacity=".7"/>
     <rect x="9" y="2" width="2" height="10" fill="currentColor" opacity=".8"/>
     <rect x="8" y="7" width="4" height="2" fill="currentColor"/>
     <rect x="8" y="12" width="4" height="2" fill="currentColor" opacity=".7"/>`,

  windy_takedown:
    `<polygon points="8,15 5,9 7,9 7,4 9,4 9,9 11,9" fill="currentColor" opacity=".85"/>
     <path d="M1 4 Q4 2 6 4" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M1 7 Q3 5 5 7" fill="none" stroke="currentColor" stroke-width="1.5"/>`,

  sleeper_gust:
    `<rect x="4" y="2" width="8" height="1.5" fill="currentColor"/>
     <line x1="12" y1="2" x2="4" y2="6" stroke="currentColor" stroke-width="1.5"/>
     <rect x="4" y="6" width="8" height="1.5" fill="currentColor"/>
     <rect x="6" y="9" width="6" height="1.5" fill="currentColor"/>
     <line x1="12" y1="9" x2="6" y2="12" stroke="currentColor" stroke-width="1.5"/>
     <rect x="6" y="12" width="6" height="1.5" fill="currentColor"/>`,

  break_momentum:
    `<rect x="1" y="6" width="6" height="4" fill="currentColor" opacity=".6"/>
     <polygon points="10,4 15,8 10,12" fill="currentColor" opacity=".6"/>
     <line x1="6" y1="5" x2="10" y2="11" stroke="currentColor" stroke-width="2.5"/>`,

  storm_rush:
    `<polygon points="1,6 9,6 9,4 14,8 9,12 9,10 1,10" fill="currentColor"/>
     <polygon points="1,11 7,11 7,9.5 11,12.5 7,15.5 7,14 1,14" fill="currentColor" opacity=".5"/>`,

  // ── NEUTRAL ───────────────────────────────────────────────────────────────
  power_strike:
    `<rect x="4" y="7" width="7" height="7" fill="currentColor" opacity=".5" rx="1"/>
     <rect x="4" y="7" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <rect x="5" y="5" width="5" height="3" fill="currentColor" opacity=".7" rx="1"/>
     <polygon points="9,1 11,5 13,3 12,8 10,6 9,9" fill="currentColor" opacity=".9"/>`,

  double_tap:
    `<rect x="1" y="6" width="5" height="6" fill="currentColor" opacity=".55" rx="1"/>
     <rect x="1" y="6" width="5" height="6" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <rect x="2" y="4" width="3" height="3" fill="currentColor" opacity=".65" rx="1"/>
     <rect x="10" y="6" width="5" height="6" fill="currentColor" opacity=".55" rx="1"/>
     <rect x="10" y="6" width="5" height="6" fill="none" stroke="currentColor" stroke-width="1" rx="1"/>
     <rect x="11" y="4" width="3" height="3" fill="currentColor" opacity=".65" rx="1"/>`,

  shield_bash:
    `<path d="M3 3 Q3 10 8 13 Q13 10 13 3 Q8 1 3 3Z" fill="currentColor" opacity=".3"/>
     <path d="M3 3 Q3 10 8 13 Q13 10 13 3 Q8 1 3 3Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="12,2 14,5 11,5 13,8 9.5,6" fill="currentColor" opacity=".85"/>`,

  vampiric_strike:
    `<rect x="5" y="3" width="6" height="2" fill="currentColor" opacity=".6"/>
     <rect x="3" y="2" width="10" height="2" fill="currentColor" opacity=".8"/>
     <polygon points="5.5,5 7,12 8,9.5 9,12 10.5,5" fill="currentColor" opacity=".9"/>
     <circle cx="7" cy="12" r="1.5" fill="currentColor"/>
     <circle cx="9" cy="12" r="1.5" fill="currentColor"/>`,

  war_cry:
    `<polygon points="2,5 7,5 11,2 11,14 7,11 2,11" fill="currentColor" opacity=".5"/>
     <polygon points="2,5 7,5 11,2 11,14 7,11 2,11" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="8" x2="14" y2="6" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="8" x2="14" y2="10" stroke="currentColor" stroke-width="1.5"/>
     <line x1="11" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/>`,

  // ── MERGED ────────────────────────────────────────────────────────────────
  plasma_arc:
    `<path d="M2 12 Q2 4 8 4 Q14 4 14 12" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <polygon points="12,9 15,13 10,12" fill="currentColor"/>
     <circle cx="2" cy="12" r="2" fill="currentColor" opacity=".5"/>`,

  superheated:
    `<rect x="5" y="2" width="4" height="9" fill="none" stroke="currentColor" stroke-width="1.5" rx="2"/>
     <rect x="6.5" y="6" width="1.5" height="4.5" fill="currentColor"/>
     <circle cx="7" cy="13" r="2.5" fill="currentColor" opacity=".6"/>
     <polygon points="12,1 10,6 12,6 10,12 15,5 13,5" fill="currentColor" opacity=".85"/>`,

  thunderroot:
    `<polygon points="10,1 7,6 9,6 6,12" fill="currentColor" opacity=".85"/>
     <line x1="6" y1="12" x2="3" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="6" y1="12" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
     <line x1="6" y1="13" x2="5" y2="15" stroke="currentColor" stroke-width="1"/>
     <line x1="6" y1="13" x2="7" y2="15" stroke="currentColor" stroke-width="1"/>`,

  static_bloom:
    `<circle cx="8" cy="8" r="3" fill="currentColor" opacity=".5"/>
     <polygon points="8,2 9,5.5 12.5,5.5 9.5,7.5" fill="currentColor" opacity=".7"/>
     <polygon points="8,2 7,5.5 3.5,5.5 6.5,7.5" fill="currentColor" opacity=".7"/>
     <polygon points="8,14 9,10.5 12.5,10.5 9.5,8.5" fill="currentColor" opacity=".7"/>
     <polygon points="8,14 7,10.5 3.5,10.5 6.5,8.5" fill="currentColor" opacity=".7"/>
     <circle cx="3" cy="5" r="1" fill="currentColor"/>
     <circle cx="13" cy="5" r="1" fill="currentColor"/>
     <circle cx="1" cy="8" r="1" fill="currentColor" opacity=".7"/>
     <circle cx="15" cy="8" r="1" fill="currentColor" opacity=".7"/>`,

  burning_grove:
    `<rect x="7" y="10" width="2" height="5" fill="currentColor" opacity=".7"/>
     <polygon points="8,7 12,10 4,10" fill="currentColor" opacity=".65"/>
     <polygon points="8,1 11,5 13,3 11,8 14,8 10,11 8,13 6,11 2,8 5,8 3,3 5,5" fill="currentColor" opacity=".85"/>`,

  char_bloom:
    `<circle cx="8" cy="7" r="3.5" fill="currentColor" opacity=".3"/>
     <circle cx="8" cy="7" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <polygon points="8,1 9.2,4.5 13,4.5 10,6.5 11,10 8,8 5,10 6,6.5 3,4.5 6.8,4.5" fill="currentColor" opacity=".85"/>
     <circle cx="5" cy="12" r="1.5" fill="currentColor" opacity=".5"/>
     <circle cx="11" cy="12" r="1.5" fill="currentColor" opacity=".5"/>
     <circle cx="8" cy="14" r="1.5" fill="currentColor" opacity=".6"/>`,
};

// ── Public render function ─────────────────────────────────────────────────
function spellIconSVG(spell, size) {
  size = size || 24;
  const color = _ELEM_COLOR[spell.element] || '#c8a060';
  const inner = SPELL_ICON_DATA[spell.id] || `<circle cx="8" cy="8" r="5" fill="currentColor" opacity=".6"/>`;
  return `<svg viewBox="0 0 16 16" width="${size}" height="${size}" style="color:${color};display:block" shape-rendering="crispEdges" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
