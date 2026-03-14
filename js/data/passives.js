// ===== passives.js =====
// ─── PASSIVE CHOICES ──────────────────────────────────────────────────────────

const PASSIVE_CHOICES = {
  Fire: [
    { id:'fire_pyromaniac',  title:'Pyromaniac',  emoji:'🔥', desc:'Fire hits apply +5 additional Burn stacks on top of all other effects.' },
    { id:'fire_combustion',  title:'Combustion',  emoji:'💥', desc:'When hitting a burning enemy, Burn stacks increase by 1 + ⌊stacks/5⌋.' },
    { id:'fire_blazing_heat',title:'Blazing Heat', emoji:'🌡️', desc:'Your Power is increased by half the total Burn stacks on all enemies.' },
    { id:'fire_wildfire',    title:'Wildfire',    emoji:'🌪️', desc:'At the start of each round, all Burn stacks have a 33% chance to double.' },
    { id:'fire_roaring_heat', legendary:true,title:'Roaring Heat',emoji:'🔥', desc:'LEGENDARY: Burn deals 1.5 damage per stack instead of 1.' },
  ],
  Water: [
    { id:'water_restoration',title:'Restoration', emoji:'💧', desc:'Max HP cut by 50%, but ALL healing is increased by 50%.' },
    { id:'water_ebb',        title:'Ebb',         emoji:'🌊', desc:'Reflect 20% + ⌊Power/10⌋% of every hit back as Water damage.' },
    { id:'water_sea_foam',   title:'Sea Foam',    emoji:'🫧', desc:'Every Water damage instance applies 1 Foam stack.' },
    { id:'water_flow',       title:'Flow',        emoji:'🌀', desc:'Water attacks deal half damage but hit twice as many times.' },
    { id:'water_abyssal_pain', legendary:true,title:'Abyssal Pain',emoji:'🌊',desc:'LEGENDARY: When Foam is explicitly removed, reapply half the stacks and deal 5 damage per reapplied stack.' },
  ],
  Ice: [
    { id:'ice_blast',         title:'Ice Blast',     emoji:'❄️', desc:'Execute enemies below 20% + ⌊Power/10⌋% HP (caps ~40%).' },
    { id:'ice_cold_swell',    title:'Cold Swell',    emoji:'🌨️', desc:'Enemies with any Frost stacks have their cooldowns increased by 1.' },
    { id:'ice_embrittlement', title:'Embrittlement', emoji:'🧊', desc:'Frozen enemies take +3 damage per damage instance.' },
    { id:'ice_stay_frosty',   title:'Stay Frosty',   emoji:'❄️', desc:'When you apply Frost, apply +1 additional stack.' },
    { id:'ice_permafrost_core', legendary:true,title:'Permafrost Core',emoji:'🧊',desc:'LEGENDARY: Frost deals 3 damage per stack per turn instead of 1.' },
  ],
  Earth: [
    { id:'earth_bedrock',        title:'Bedrock',        emoji:'🪨', desc:'Whenever you gain Armor, gain 1 Stone stack.' },
    { id:'earth_earthen_bulwark',title:'Earthen Bulwark',emoji:'🛡️', desc:'When your Armor is fully broken, gain 2 Stone stacks.' },
    { id:'earth_fissure',        title:'Fissure',        emoji:'⛏️', desc:'Earth damage ignores all Armor and damage block on the target.' },
    { id:'earth_hard_shell',     title:'Hard Shell',     emoji:'🐢', desc:'Passively reduce every incoming hit by 10 + ⌊Power/10⌋.' },
    { id:'earth_living_mountain', legendary:true,title:'Living Mountain',emoji:'⛰️', desc:'LEGENDARY: Stone stacks no longer decay each round.' },
  ],
  Nature: [
    { id:'nature_overgrowth',      title:'Overgrowth',      emoji:'🌿', desc:'Root stacks consumed by blocking effects convert to permanent Overgrowth stacks instead.' },
    { id:'nature_stay_rooted',     title:'Stay Rooted',     emoji:'🌱', desc:'When you apply Root, apply +1 additional stack.' },
    { id:'nature_thorned_strikes', title:'Thorned Strikes', emoji:'🌵', desc:'Each Root or Overgrowth stack on an enemy adds +5 damage per hit instance.' },
    { id:'nature_bramble_guard',   title:'Bramble Guard',   emoji:'🌿', desc:'When you gain Armor, apply 1 Root to all enemies.' },
    { id:'nature_verdant_legion', legendary:true,  title:'Verdant Legion',  emoji:'🌳', desc:'LEGENDARY: Treants gain +25 HP, +10 damage, 100% Root chance.' },
  ],
  Lightning: [
    { id:'lightning_conduction',    title:'Conduction',    emoji:'⚡', desc:'Lightning hits apply +1 extra Shock. Each Shock stack reduces enemy damage by 5%.' },
    { id:'lightning_double',        title:'Double Strike', emoji:'💥', desc:'30 + ⌊Power/5⌋% chance for Lightning hits to strike twice (overflow = triple).' },
    { id:'lightning_static',        title:'Static Shock',  emoji:'⚡', desc:'Lightning spells deal 10 + ⌊Power/10⌋% of target current HP before resolving.' },
    { id:'lightning_overload',      title:'Overload',      emoji:'💥', desc:'Lightning damage starts at 200%, drops 25% per offensive action, floors at 25%.' },
    { id:'lightning_superconductor', legendary:true,title:'Superconductor',emoji:'🔋', desc:'LEGENDARY: Self damage is tripled and redirected to the enemy instead.' },
  ],
  Plasma: [
    { id:'plasma_energy_feedback',  title:'Energy Feedback',  emoji:'⚡',
      desc:'Each Charge you hold grants +1 Attack Power. Updates every turn.' },
    { id:'plasma_stabilized_core',  title:'Stabilized Core',  emoji:'🔋',
      desc:'Gain 3 Charge at the start of each turn. Hits and debuffs generate 1 Charge instead of 2 — trade burst charging for steady flow.' },
    { id:'plasma_reactive_field',   title:'Reactive Field',   emoji:'💥',
      desc:'When consuming Charge (not Overcharged): take 5 self-damage per Charge and deal 5 damage to all enemies. While Overcharged the field goes dormant — heal freely.' },
    { id:'plasma_reserve_cell',     title:'Reserve Cell',     emoji:'🔌',
      desc:'Start each battle with +10 Charge (13 total instead of 3).' },
    { id:'plasma_backfeed_reactor', title:'Backfeed Reactor', legendary:true, emoji:'♻️',
      desc:'LEGENDARY: When you gain Charge, reflect 20% of the triggering hit + ⌊Power÷5⌋ damage back at the attacker.' },
  ],
  Air: [
    { id:'air_tailwind',    title:'Tailwind',    emoji:'🌬️', desc:'Permanently gain +15 Power at run start.' },
    { id:'air_rapid_tempo', title:'Rapid Tempo', emoji:'⚡',  desc:'Gain +1 extra action every other turn (alternates: 3 then 2).' },
    { id:'air_gale_force',  title:'Gale Force',  emoji:'💨',  desc:'Whenever you gain Momentum, gain +1 additional Momentum. (2 per hit instead of 1).' },
    { id:'air_slipstream',  title:'Slipstream',  emoji:'🌀',  desc:'Momentum lost when dodging is reduced to 10% instead of 25%.' },
    { id:'air_eye_of_the_storm', legendary:true, title:'Eye of the Storm', emoji:'👁️',
      desc:'LEGENDARY: Each Momentum stack grants 3% chance per strike to repeat. Repeats can chain.' },
  ],
};


