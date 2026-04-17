// ===== deckIcons.js =====
// SVG icons for the arena deck switcher — one per catalogue entry + standard fallback

const DECK_ICONS = {

  // ── Standard (starting) deck ────────────────────────────────────────────────
  standard: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8.5" width="12" height="9" rx="1.5" fill="rgba(200,160,96,0.12)" stroke="#c8a060" stroke-width="1.4"/>
    <rect x="3.5" y="6.5" width="12" height="9" rx="1.5" fill="rgba(200,160,96,0.07)" stroke="#a07840" stroke-width="1" opacity="0.55"/>
    <line x1="11" y1="11.5" x2="11" y2="15" stroke="#c8a060" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="9.2" y1="13.2" x2="12.8" y2="13.2" stroke="#c8a060" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // ── Element books ───────────────────────────────────────────────────────────

  fire_tome: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20c-3.2 0-5.5-2.4-4.4-6 .6-2.2 2.2-3.2 2.2-5.5 1.4 1.4 1.4 3 .9 4.6 1.3-1.7 1.7-4.4-.6-7.1 2.8.9 5 3.8 3.9 7.5.5-.5.5-1.5 0-2.6 2.2 2.2 2 6.1-.3 7.9-.7.7-1.5 2.2-1.7 2.2z" fill="#e86020"/>
    <path d="M12 18c-1.4 0-2.3-.9-1.8-2.7.4.1.9.5.9 1.4C12 15.3 12.9 13.6 12 11.3c1.4.5 1.8 2.2 1.4 3.5.4-.3.4-.9.2-1.4.9.9.9 3.2-.3 4.3-.3.3-.9 1-1.3 1z" fill="#f0a030"/>
  </svg>`,

  tide_codex: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9.5c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" stroke="#3090e0" stroke-width="1.9"/>
      <path d="M3 13.5c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" stroke="#3090e0" stroke-width="1.9" opacity="0.55"/>
      <path d="M5 6c1.2-1.6 2.4-1.6 3.5 0s2.3 1.6 3.5 0 2.3-1.6 3.5 0" stroke="#3090e0" stroke-width="1.4" opacity="0.3"/>
      <path d="M3 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0" stroke="#3090e0" stroke-width="1.1" opacity="0.25"/>
    </g>
  </svg>`,

  frost_grimoire: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#80d0f0" stroke-linecap="round" stroke-width="1.5" fill="none">
      <line x1="12" y1="3.5" x2="12" y2="20.5"/>
      <line x1="3.5" y1="12" x2="20.5" y2="12"/>
      <line x1="5.8" y1="5.8" x2="18.2" y2="18.2"/>
      <line x1="18.2" y1="5.8" x2="5.8" y2="18.2"/>
      <line x1="12" y1="3.5" x2="10.2" y2="5.8"/>
      <line x1="12" y1="3.5" x2="13.8" y2="5.8"/>
      <line x1="12" y1="20.5" x2="10.2" y2="18.2"/>
      <line x1="12" y1="20.5" x2="13.8" y2="18.2"/>
      <line x1="3.5" y1="12" x2="5.8" y2="10.2"/>
      <line x1="3.5" y1="12" x2="5.8" y2="13.8"/>
      <line x1="20.5" y1="12" x2="18.2" y2="10.2"/>
      <line x1="20.5" y1="12" x2="18.2" y2="13.8"/>
    </g>
  </svg>`,

  storm_codex: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 3L6 13.5h6.5l-2.5 7.5 10-12H14z" fill="#f0d030" stroke="#f0c000" stroke-width="0.6" stroke-linejoin="round"/>
  </svg>`,

  earth_ledger: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 19L8.5 9 14 19z" stroke="#a07840" stroke-width="1.5" fill="rgba(160,120,64,0.22)"/>
      <path d="M10 19L15.5 10.5 21 19z" stroke="#a07840" stroke-width="1.5" fill="rgba(160,120,64,0.32)"/>
    </g>
  </svg>`,

  verdant_codex: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20c-1.1-4.5-5.5-6.5-5-12 4.5.5 8.5 3 9 9-1.5-1-2.2-2.8-2-5C15 15 14.5 18 12 20z" fill="#40b030"/>
    <path d="M12 20c0-4.5 2-7.5 0-12" fill="none" stroke="#308020" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`,

  gale_sketchbook: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#80b0e0" stroke-linecap="round" stroke-width="1.8">
      <path d="M3 8.5c3.5-3.5 8-3 9-.5s-2.5 4.5-4.5 2.5"/>
      <path d="M3 13c4.5-3.5 10-1 10 2.5s-3.5 3.5-6 1.5"/>
      <path d="M3 18c3.5-2 9 .5 8.5 2.5"/>
    </g>
  </svg>`,

  plasma_atlas: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3.5" fill="#c050f0" opacity="0.85"/>
    <ellipse cx="12" cy="12" rx="9.5" ry="4" fill="none" stroke="#c050f0" stroke-width="1.4" opacity="0.65"/>
    <ellipse cx="12" cy="12" rx="9.5" ry="4" fill="none" stroke="#c050f0" stroke-width="1.3" opacity="0.4" transform="rotate(60 12 12)"/>
    <ellipse cx="12" cy="12" rx="9.5" ry="4" fill="none" stroke="#c050f0" stroke-width="1.3" opacity="0.4" transform="rotate(-60 12 12)"/>
  </svg>`,

  // ── Generic books ───────────────────────────────────────────────────────────

  codex_of_power: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#e0d060" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="3.5" x2="12" y2="17" stroke-width="2.2"/>
      <path d="M9 7l3-3.5 3 3.5" stroke-width="1.6"/>
      <line x1="9" y1="13" x2="15" y2="13" stroke-width="2"/>
      <rect x="9.5" y="17" width="5" height="2.5" rx="1" fill="#e0d060" stroke="none"/>
    </g>
  </svg>`,

  guardians_ward: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L4 7v5.5c0 4.8 3.5 9 8 10 4.5-1 8-5.2 8-10V7z" fill="rgba(70,130,220,0.18)" stroke="#5090d0" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9 12.5l2.2 2.2 3.8-4" stroke="#5090d0" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,

  swiftblade_ms: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke-linecap="round">
      <line x1="17" y1="4" x2="7" y2="20" stroke="#e0a030" stroke-width="2.8"/>
      <path d="M14.5 3.5l2.5 0 0 2.5" stroke="#e0a030" stroke-width="1.6" stroke-linejoin="round"/>
      <line x1="3" y1="9" x2="7" y2="8" stroke="#e0a030" stroke-width="1.3" opacity="0.6"/>
      <line x1="3" y1="12" x2="7.5" y2="11" stroke="#e0a030" stroke-width="1.3" opacity="0.45"/>
      <line x1="3" y1="15" x2="7" y2="15" stroke="#e0a030" stroke-width="1.3" opacity="0.3"/>
    </g>
  </svg>`,

  scholars_folio: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#c8a060" stroke-linecap="round">
      <path d="M4 6.5C4 5.5 5 5 6.5 5.5 8.5 6.5 10.5 7 12 7v12.5c-1.5 0-3.5-.5-5.5-1.5C5 17.5 4 18 4 19V6.5z" stroke-width="1.4" fill="rgba(200,160,96,0.1)"/>
      <path d="M20 6.5C20 5.5 19 5 17.5 5.5 15.5 6.5 13.5 7 12 7v12.5c1.5 0 3.5-.5 5.5-1.5C19 17.5 20 18 20 19V6.5z" stroke-width="1.4" fill="rgba(200,160,96,0.1)"/>
      <line x1="12" y1="7" x2="12" y2="19.5" stroke-width="1"/>
    </g>
  </svg>`,

  hunters_notes: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke-linecap="round">
      <line x1="15.5" y1="4" x2="8.5" y2="17" stroke="#e05050" stroke-width="2.8"/>
      <path d="M13 3.5h3v3" stroke="#e05050" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M8 17.5L6.5 21l3.5-1.2z" fill="#e05050"/>
      <line x1="7" y1="13.5" x2="10" y2="12.5" stroke="#e05050" stroke-width="1.2"/>
    </g>
  </svg>`,

  // ── Legendary books ─────────────────────────────────────────────────────────

  tome_of_time: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#c0a0f0" stroke-linecap="round" stroke-linejoin="round">
      <line x1="7" y1="4" x2="17" y2="4" stroke-width="1.7"/>
      <line x1="7" y1="20" x2="17" y2="20" stroke-width="1.7"/>
      <path d="M7 4l5 7 5-7" stroke-width="1.3" fill="rgba(192,160,240,0.2)"/>
      <path d="M7 20l5-7 5 7" stroke-width="1.3" fill="rgba(192,160,240,0.15)"/>
      <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" stroke-width="1" opacity="0.5"/>
    </g>
  </svg>`,

  echo_grimoire: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#4080f0" stroke-linecap="round">
      <circle cx="12" cy="12" r="2.2" stroke-width="1.7"/>
      <path d="M6.8 7.8a7.5 7.5 0 0 1 10.4 0" stroke-width="1.4" opacity="0.7"/>
      <path d="M6.8 16.2a7.5 7.5 0 0 0 10.4 0" stroke-width="1.4" opacity="0.7"/>
      <path d="M4.2 5.2a11 11 0 0 1 15.6 0" stroke-width="1.1" opacity="0.35"/>
      <path d="M4.2 18.8a11 11 0 0 0 15.6 0" stroke-width="1.1" opacity="0.35"/>
    </g>
  </svg>`,

  soul_codex: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#e050a0" stroke-linecap="round">
      <path d="M3 12c2.5-4.5 5.5-6.5 9-6.5s6.5 2 9 6.5c-2.5 4.5-5.5 6.5-9 6.5s-6.5-2-9-6.5z" stroke-width="1.4" fill="rgba(224,80,160,0.08)"/>
      <circle cx="12" cy="12" r="3" stroke-width="1.5" fill="rgba(224,80,160,0.15)"/>
      <circle cx="12" cy="12" r="1.3" fill="#e050a0" stroke="none"/>
      <circle cx="12" cy="12" r="1.3" fill="#e050a0" stroke="none"/>
    </g>
  </svg>`,

};
