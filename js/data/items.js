// ===== items.js =====
// ─── ITEM DATA ─────────────────────────────────────────────────────────────
// ITEM_CATALOGUE, shop pool, drop pool.

const ITEM_CATALOGUE = {
  health_potion: { id:'health_potion', name:'Health Potion', emoji:'💚', desc:'Restore 40% HP', type:'consumable',
    use(){ applyHeal('player', Math.floor(maxHPFor('player')*0.40), '💚 Health Potion'); return null; }},

  mana_crystal:  { id:'mana_crystal', name:'Mana Crystal', emoji:'🔮', desc:'Restore all spell PP', type:'consumable',
    use(){ restoreAllPP(); return '🔮 All spell PP restored!'; }},

  dmg_booster:   { id:'dmg_booster', name:'Damage Crystal', emoji:'💎', desc:'+20 dmg this battle', type:'consumable',
    use(){ combat.tempDmgBonus = (combat.tempDmgBonus||0) + 20; return '💎 Damage Crystal shatters — +20 damage this battle!'; }},

  efx_crystal:   { id:'efx_crystal', name:'EFX Crystal', emoji:'✦', desc:'+20 Effect Power this battle', type:'consumable',
    use(){ status.player.battleEfxBonus = (status.player.battleEfxBonus||0) + 20; return '✦ EFX Crystal — +20 Effect Power this battle!'; }},

  def_crystal:   { id:'def_crystal', name:'Defense Crystal', emoji:'🛡️', desc:'+20 Defense this battle', type:'consumable',
    use(){ status.player.battleDefBonus = (status.player.battleDefBonus||0) + 20; return '🛡️ Defense Crystal — +20 Defense this battle!'; }},

  basic_dispel:  { id:'basic_dispel', name:'Basic Dispel', emoji:'🧹', desc:'Halve debuff stacks; duration effects -1', type:'consumable',
    use(){
      const s = status.player;
      for (const key of ['burnStacks','foamStacks','shockStacks','frostStacks','rootStacks','overgrowthStacks']) {
        if (s[key]) s[key] = Math.floor(s[key] / 2);
      }
      for (const key of ['stunned','frozenGroundTurns','spreadingVinesTurns']) {
        if (s[key]) s[key] = Math.max(0, s[key] - 1);
      }
      if (s.frozen) s.frozen = false;
      if (typeof renderStatusTags === 'function') renderStatusTags();
      return '🧹 Debuffs reduced!';
    }},

  strong_dispel: { id:'strong_dispel', name:'Strong Dispel', emoji:'✨', desc:'Clear all negative status effects', type:'consumable',
    use(){
      const s = status.player;
      for (const key of ['burnStacks','foamStacks','shockStacks','frostStacks','rootStacks','overgrowthStacks','stunned','frozenGroundTurns','spreadingVinesTurns']) {
        s[key] = 0;
      }
      s.frozen = false;
      if (typeof renderStatusTags === 'function') renderStatusTags();
      return '✨ All debuffs cleared!';
    }},
};

const ITEM_DROP_POOL = ['health_potion','dmg_booster'];
