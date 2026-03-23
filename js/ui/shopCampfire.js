// ===== shopCampfire.js =====
// ─── CAMPFIRE + SHOP screens ──────────────────────────────────────────────────

function enterCampfire(){
  const pMax = maxHPFor('player');
  const descEl = document.getElementById('campfire-desc');
  const cont   = document.getElementById('campfire-choices');
  if (descEl) descEl.textContent = 'The fire crackles. How do you spend your rest?';

  const CAMPFIRE_OPTS = [
    { emoji:'🔥', label:'Rest & Recover',
      tag:'Rest',
      desc:`Heal ${Math.floor(pMax*0.50)} HP and fully restore all spell PP.`,
      apply(){
        const actual = applyHeal('player', Math.floor(pMax*0.50), null);
        restoreAllPP();
        log(actual>0 ? `🔥 You rest. +${actual} HP, all PP restored.` : '🔥 Already full — PP restored.', 'heal');
      }},
    { emoji:'⚔️', label:'Sharpen Your Edge',
      tag:'Forge',
      desc:`Heal ${Math.floor(pMax*0.20)} HP and permanently gain +8 Attack Power.`,
      apply(){
        const actual = applyHeal('player', Math.floor(pMax*0.20), null);
        player.attackPower += 8; updateStatsUI();
        log(`⚔️ Steel sharpened.${actual>0?' +'+actual+' HP,':''} +8 ATK.`, 'item');
      }},
    { emoji:'✦', label:'Focus Your Craft',
      tag:'Forge',
      desc:`Heal ${Math.floor(pMax*0.20)} HP and permanently gain +8 Effect Power.`,
      apply(){
        const actual = applyHeal('player', Math.floor(pMax*0.20), null);
        player.effectPower += 8; updateStatsUI();
        log(`✦ Mind sharpened.${actual>0?' +'+actual+' HP,':''} +8 EFX.`, 'item');
      }},
    { emoji:'🛡️', label:'Fortify',
      tag:'Forge',
      desc:`Heal ${Math.floor(pMax*0.20)} HP and permanently gain +8 Defense.`,
      apply(){
        const actual = applyHeal('player', Math.floor(pMax*0.20), null);
        player.defense += 8; updateStatsUI();
        log(`🛡️ Armor reinforced.${actual>0?' +'+actual+' HP,':''} +8 DEF.`, 'item');
      }},
    { emoji:'🌿', label:'Forage Supplies',
      tag:'Forage',
      desc:`Heal ${Math.floor(pMax*0.20)} HP and gain 80 gold.`,
      apply(){
        const actual = applyHeal('player', Math.floor(pMax*0.20), null);
        player.gold += 80;
        log(`🌿 Foraged supplies.${actual>0?' +'+actual+' HP,':''} +80 Gold.`, 'item');
      }},
    { emoji:'📖', label:'Study the Arcane',
      tag:'Study',
      desc:'Restore all spell PP and gain +1 reroll token.',
      apply(){
        restoreAllPP();
        player._rerolls = (player._rerolls||0) + 1;
        log('📖 You study by firelight. All PP restored, +1 Reroll.', 'item');
      }},
  ];

  // Rest & Recover is always one of the 3 options; pick 2 more from the rest
  const restOpt = CAMPFIRE_OPTS[0];
  const otherOpts = CAMPFIRE_OPTS.slice(1);
  const chosen = [restOpt, ...pickRandom(otherOpts, 2)];
  if (cont) {
    cont.innerHTML = '';
    chosen.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'prog-choice-btn';
      btn.innerHTML = `<div class="pc-tag">${opt.tag}</div><div class="pc-name">${opt.emoji} ${opt.label}</div><div class="pc-desc">${opt.desc}</div>`;
      btn.onclick = () => {
        opt.apply();
        if (descEl) descEl.textContent = '';
        cont.innerHTML = '';
        const leaveBtn = document.createElement('button');
        leaveBtn.className = 'btn-main';
        leaveBtn.style.width = '220px';
        leaveBtn.textContent = 'Continue';
        leaveBtn.onclick = leaveCampfire;
        cont.appendChild(leaveBtn);
      };
      cont.appendChild(btn);
    });
  }

  showScreen('campfire-screen');
  setTimeout(()=>startCampfireScene(''), 0);
}
function leaveCampfire(){ stopCampfireScene(); showMap(); }

let _shopStock = null;

function _generateShopStock() {
  const m = player._mistShopPriceMult || 1.0;
  const c = n => Math.ceil(n * m);

  // ── Category pools ──────────────────────────────────────────────────────
  const itemPool = [
    { id:'s_hp',    label:'Health Potion',  emoji:'💚', tag:'Consumable', desc:'Restore 40% HP during battle.',           cost:c(50),  buy(){ addItem('health_potion'); } },
    { id:'s_pp',    label:'Mana Crystal',   emoji:'🔮', tag:'Consumable', desc:'Restore all spell PP during battle.',      cost:c(50),  buy(){ addItem('mana_crystal'); } },
    { id:'s_dmg',   label:'Damage Crystal', emoji:'💎', tag:'Consumable', desc:'+20 damage this battle.',                  cost:c(50),  buy(){ addItem('dmg_booster'); } },
    { id:'s_efx',   label:'EFX Crystal',    emoji:'✦',  tag:'Consumable', desc:'+20 Effect Power this battle.',            cost:c(50),  buy(){ addItem('efx_crystal'); } },
    { id:'s_defc',  label:'Defense Crystal',emoji:'🛡️', tag:'Consumable', desc:'+20 Defense this battle.',                 cost:c(50),  buy(){ addItem('def_crystal'); } },
    { id:'s_disp1', label:'Basic Dispel',   emoji:'🧹', tag:'Consumable', desc:'Halve debuff stacks; duration effects -1.',cost:c(50),  buy(){ addItem('basic_dispel'); } },
    { id:'s_disp2', label:'Strong Dispel',  emoji:'✨', tag:'Consumable', desc:'Clear all negative status effects.',       cost:c(100), buy(){ addItem('strong_dispel'); } },
  ];

  const statPool = [
    { id:'s_atk',  label:'+5 Attack Power', emoji:'⚔️', tag:'Stat', desc:'Permanently gain +5 Attack Power.', cost:c(100), buy(){ player.attackPower += 5; updateStatsUI(); log('⚔️ +5 Attack Power!','item'); } },
    { id:'s_efxs', label:'+5 Effect Power', emoji:'✦',  tag:'Stat', desc:'Permanently gain +5 Effect Power.', cost:c(100), buy(){ player.effectPower += 5; updateStatsUI(); log('✦ +5 Effect Power!','item'); } },
    { id:'s_def',  label:'+5 Defense',      emoji:'🛡️', tag:'Stat', desc:'Permanently gain +5 Defense.',      cost:c(100), buy(){ player.defense += 5; updateStatsUI(); log('🛡️ +5 Defense!','item'); } },
    { id:'s_hp2',  label:'+25 Max HP',      emoji:'❤️', tag:'Stat', desc:'Permanently gain +25 Max HP.',      cost:c(100), buy(){ player.baseMaxHPBonus=(player.baseMaxHPBonus||0)+25; player.hp=Math.min(maxHPFor('player'),player.hp+25); updateStatsUI(); log('❤️ +25 Max HP!','item'); } },
  ];

  const rewardPool = [
    { id:'s_spell',  label:'Spell Reward', emoji:'📜', tag:'Reward', desc:'Choose a new spell to add to your spellbook.', cost:c(150), _modal:true, buy(){ _closeShopForReward(); showSpellChoiceScreen('Shop','secondary'); } },
    { id:'s_incant', label:'Incantation',  emoji:'✦',  tag:'Reward', desc:'Choose a spell to upgrade.',                   cost:c(150), _modal:true, buy(){ _closeShopForReward(); showIncantationChoiceScreen('Shop'); } },
  ];

  const powerPool = [
    { id:'s_action', label:'Extra Action',   emoji:'⚡', tag:'Power', desc:'Permanently gain +1 action per turn.',                    cost:c(250), buy(){ player.bonusActions=(player.bonusActions||0)+1; log('⚡ Extra action per turn!','item'); } },
    { id:'s_life',   label:'Extra Life',     emoji:'❤️', tag:'Power', desc:'Survive one killing blow — revive at 75% HP.',            cost:c(200), buy(){ player.revives=(player.revives||0)+1; log('❤ Extra life gained!','item'); } },
    { id:'s_rival',  label:"Rival's Secret", emoji:'⚔️', tag:'Power', desc:"Study your rival's techniques — choose from 3 passives.", cost:c(400), _modal:true, buy(){ _closeShopForReward(); showPassiveChoiceScreen('Shop'); } },
  ];

  // ── Pick one per slot ───────────────────────────────────────────────────
  const item1  = pickRandom(itemPool, 1)[0];
  const stat1  = pickRandom(statPool, 1)[0];
  // 50/50: another item (different from item1) or another stat (different from stat1)
  const mix    = Math.random() < 0.5
    ? pickRandom(itemPool.filter(i => i.id !== item1.id), 1)[0]
    : pickRandom(statPool.filter(s => s.id !== stat1.id), 1)[0];
  const reward = pickRandom(rewardPool, 1)[0];
  const power  = pickRandom(powerPool,  1)[0];

  return [item1, stat1, mix, reward, power]
    .filter(Boolean)
    .sort((a, b) => a.cost - b.cost)
    .map(item => ({ ...item, bought:false }));
}

function _closeShopForReward() {
  _shopStock = null;
  const canvas = document.getElementById('shop-canvas');
  if (canvas && canvas._stop) canvas._stop();
}

function enterShop() {
  if (!_shopStock) _shopStock = _generateShopStock();
  _renderShop();
}

function _renderShop() {
  document.getElementById('shop-gold-display').textContent = player.gold;
  const c = document.getElementById('shop-items');
  c.innerHTML = '';

  (_shopStock || []).forEach(item => {
    const affordable = player.gold >= item.cost;
    const canBuy = !item.bought && affordable;
    const row = document.createElement('div');
    row.className = 'shop-item-row' + (item.bought ? ' cant-afford' : canBuy ? '' : ' cant-afford');

    const statusLabel = item.bought
      ? '<span style="font-size:.55rem;color:#555;margin-left:.4rem;">SOLD</span>'
      : '';
    row.innerHTML = `<div><div class="shop-item-name">${item.emoji} ${item.label}${statusLabel}</div><div class="shop-item-desc">[${item.tag}] ${item.desc}</div></div><div class="shop-item-cost">${item.cost}g</div>`;

    if (canBuy) {
      row.onclick = () => {
        player.gold -= item.cost;
        item.bought = true;
        item.buy();
        if (!item._modal) _renderShop();
      };
    }
    c.appendChild(row);
  });

  updateStatsUI();
  showScreen('shop-screen');
  startShopCanvas();
}

function leaveShop() {
  _shopStock = null;
  const canvas = document.getElementById('shop-canvas');
  if (canvas && canvas._stop) canvas._stop();
  showMap();
}
