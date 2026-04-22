// ===== duos.js =====
// ─── DUO / MERGED SPELL SYSTEM ───────────────────────────────────────────────
// Duo content unlocks when the player has committed to two elements.
// Unlock gate: at least 1 primary + 1 secondary spell in EACH of the two elements,
//              counted across all spellbooks.

const DUO_CATALOGUE = [
  {
    elements: ['Lightning', 'Fire'],
    spells:   ['plasma_arc', 'superheated'],
    passives: ['duo_flashfire', 'duo_molten_current'],
  },
  {
    elements: ['Lightning', 'Nature'],
    spells:   ['thunderroot', 'static_bloom'],
    passives: ['duo_stormseed', 'duo_charged_roots'],
  },
  {
    elements: ['Fire', 'Nature'],
    spells:   ['burning_grove', 'char_bloom'],
    passives: ['duo_wildfire_seeds', 'duo_scorched_earth'],
  },
  {
    elements: ['Air', 'Nature'],
    spells:   ['windfall_seed', 'gale_bind'],
    passives: ['duo_gale_root', 'duo_rushing_growth'],
  },
  {
    elements: ['Air', 'Lightning'],
    spells:   ['storm_window', 'arc_load'],
    passives: ['duo_velocity_arc', 'duo_galestrike'],
  },
  {
    elements: ['Air', 'Fire'],
    spells:   ['ember_flurry', 'afterburn'],
    passives: ['duo_thermal_draft', 'duo_bellows'],
  },
];

// Returns true if the player has unlocked the duo for the given element pair.
// Cross-book: any spell in any book counts toward qualification.
function _duoUnlocked(elementA, elementB) {
  const available = [playerElement, ...(player.unlockedElements || [])];
  if (!available.includes(elementA) || !available.includes(elementB)) return false;

  const _qualified = (element) => {
    let hasPrimary = false, hasSecondary = false;
    (player.spellbooks || []).forEach(book => {
      book.spells.forEach(s => {
        const def = SPELL_CATALOGUE[s.id];
        if (!def || def.element !== element) return;
        if (def.tier === 'primary')   hasPrimary   = true;
        if (def.tier === 'secondary') hasSecondary = true;
      });
    });
    return hasPrimary && hasSecondary;
  };

  return _qualified(elementA) && _qualified(elementB);
}

// Returns all unlocked duo spells the player doesn't already own.
function _eligibleDuoSpells() {
  const owned = new Set();
  (player.spellbooks || []).forEach(b => b.spells.forEach(s => { if (!s.isBuiltin) owned.add(s.id); }));

  const eligible = [];
  DUO_CATALOGUE.forEach(duo => {
    if (!_duoUnlocked(duo.elements[0], duo.elements[1])) return;
    duo.spells.forEach(id => {
      if (!owned.has(id) && SPELL_CATALOGUE[id]) eligible.push(SPELL_CATALOGUE[id]);
    });
  });
  return eligible;
}

// Returns all unlocked duo passives the player doesn't already own.
function _eligibleDuoPassives() {
  const owned = new Set(player.passives || []);

  const eligible = [];
  DUO_CATALOGUE.forEach(duo => {
    if (!_duoUnlocked(duo.elements[0], duo.elements[1])) return;
    duo.passives.forEach(pid => {
      if (!owned.has(pid)) {
        const def = (typeof _lookupPassiveDef === 'function') ? _lookupPassiveDef(pid) : null;
        if (def) eligible.push({ ...def, element: duo.elements.join('/') });
      }
    });
  });
  return eligible;
}

// ─── DUO PASSIVE ROUND TICKS ─────────────────────────────────────────────────
// Called each round from startRound (after seed tick, before enemy queue).
function _tickDuoEffects() {
  const hasScorchedEarth = hasPassive('duo_scorched_earth');
  if (!hasScorchedEarth) return;

  combat.enemies.forEach((e, i) => {
    if (!e.alive) return;
    setActiveEnemy(i);

    // Scorched Earth: every 5 Burn stacks on enemy reduce all Seed timers by 1
    const burnStacks = e.status.burnStacks || 0;
    if (burnStacks >= 5) {
      const reductions = Math.floor(burnStacks / 5);
      const seeds = e.status.seeds || [];
      if (seeds.length > 0) {
        seeds.forEach(seed => { seed.timer = Math.max(0, seed.timer - reductions); });
        log(`🔥🌍 Scorched Earth: ${reductions} Seed timer reduction(s) from ${burnStacks} Burn`, 'status');
        // Immediately bloom any seeds that hit 0
        const toBloom = seeds.filter(seed => seed.timer <= 0);
        toBloom.forEach(seed => {
          if (typeof _bloomSeed === 'function') _bloomSeed('enemy', seed, i);
        });
        e.status.seeds = e.status.seeds.filter(seed => seed.timer > 0);
        if (combat.over) return;
      }
    }
  });

  if (!combat.over) setActiveEnemy(combat.targetIdx);
}
