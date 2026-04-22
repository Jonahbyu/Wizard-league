# Changelog

## v0.01.13

### Air Element Released
- Added Air to the playable element roster
- Air map zone background (cloud wisps, wind streaks)

### Priority Combat System
- All spells now have a `priority` value that determines turn order within a round
- Higher priority resolves before lower — interleaved with enemy actions
- Queue UI: drag-to-reorder, enemy queued cards shown, priority badges (↑/↓) and EAB (enemy actions before) indicators

### New Air Spells
**Primary:** Dynamic Drift (damage scales with |drift|, shifts own priority each cast), Gust Forward (instant: sets +2/−2 priority shift for all spells queued this turn)
**Secondary:** Queue Slash (bonus per total queue |priority|), Slipcut (EAB=0 + Momentum for bonus dmg), Wind Surge (AoE + priority shift for subsequent spells)
**Legendary:** Wind's End (AoE, mirrors Dynamic Drift value), Absolute Zero (AoE, scales with total |priority| this turn)

### New Air Passives
Headwind, Backdraft, Turbulence, Tailwind Carry (pickup choice), Vortex Strike, Pressure Launch, Prevailing Wind (pickup choice)

### 3 New Duo Combos
- **Air + Nature:** Windfall Seed, Gale Bind, Gale Root, Rushing Growth
- **Air + Lightning:** Storm Window, Arc Load, Velocity Arc, Galestrike
- **Air + Fire:** Ember Flurry, Afterburn, Thermal Draft, Bellows (pickup choice)

### Knowledge Tree (replaces Talents)
- Full meta-progression system with General and Elemental card pools
- Phoros budget system — expand your budget by unlocking cards
- Cards: Extra Life, Vitality, Attack Training, Effect Training, Defense Training, Recovery, and elemental-specific cards for all 4 released elements

### Artifact Vault Overhaul
- Revamped card-grid UI with star pips and room progress
- Between-zone artifact swap overlay (Hades-style) after defeating a Gym Leader

### Global Passives System
- Passives are now a global roster (`player.passives`) independent of spellbooks
- Passive Overflow screen: when at cap, choose to replace an existing passive or decline
- `player.passiveSlots` expandable via battle rewards
- Fixed duo passive eligibility bug (was reading per-book instead of global)

### Battle Info Overlay
- New 📋 Stats button during battle opens overlay with Log / Stats / Library tabs

### Other
- `BATTLE_HEAL` → 0; recovery now comes from the `kt_recovery` Knowledge Tree card
- Battle rewards can offer Extra Spell Slot / Extra Passive Slot when near capacity
- Momentum Seed bloom implemented (`windfall_seed`)
- `pickupChoice` passives wired up end-to-end (Prevailing Wind, Tailwind Carry, Bellows)
- Air-element enemies defined

---

## v0.01.12

- Remove deckMode flag + deck icons in lobby

## v0.01.11

- Ruined portal gate + Artifacts/Tailor swap

## v0.01.10

- Lobby castle drawbridge visual overhaul
