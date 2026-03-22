// ===== ui.js =====
// ─── UI / RENDERING ───────────────────────────────────────────────────────────
// All DOM render functions. No game logic here.
// renderEnemyCards, renderSpellButtons, updateHPBars, log, showScreen, etc.

function updateStatsUI(){
  // Build lives string: filled hearts for remaining, empty for lost
  const maxDisplay = Math.max(player.revives, 3);
  const heartsStr = '❤'.repeat(player.revives) + '🖤'.repeat(Math.max(0, maxDisplay - player.revives));
  // During combat show effective (status-modified) stats; outside show base
  const inCombat = (typeof combat !== 'undefined' && !combat.over
    && typeof status !== 'undefined' && status.player);
  const dispAtk = inCombat ? attackPowerFor('player') : player.attackPower;
  const dispEfx = inCombat ? effectPowerFor('player') : player.effectPower;
  const dispDef = inCombat ? defenseFor('player')     : player.defense;
  ["map","combat"].forEach(prefix=>{
    const ap=document.getElementById(prefix+"-atk");  if(ap) ap.textContent=dispAtk;
    const ep=document.getElementById(prefix+"-ep");   if(ep) ep.textContent=dispEfx;
    const df=document.getElementById(prefix+"-def");  if(df) df.textContent=dispDef;
    const g =document.getElementById(prefix+"-gold");    if(g)  g.textContent=player.gold;
    const lh=document.getElementById(prefix+"-lives");  if(lh) lh.textContent=heartsStr;
  });
  const mi=document.getElementById("map-items");    if(mi) mi.textContent=player.inventory.length;
}

// ===============================
// UI HELPERS
// ===============================

function renderEnemyCards(){
  const hud = document.getElementById('arena-enemy-hud');
  if(!hud) return;
  hud.innerHTML = '';

  (combat.enemies||[]).forEach((e, i)=>{
    const pct = Math.max(0, (e.hp / e.enemyMaxHP) * 100);
    const card = document.createElement('div');
    card.className = 'arena-enemy-card'
      + (i === combat.targetIdx ? ' targeted' : '')
      + (e.alive ? '' : ' dead');
    card.dataset.idx = i;

    if(e.alive){
      card.onclick = ()=>{
        combat.targetIdx = i;
        setActiveEnemy(i);
        renderEnemyCards();
        updateActionUI();
      };
    }

    // Build passive list: primary + extra passives
    const el = primaryElement(e.element||'');
    const passivePool = PASSIVE_CHOICES[el]||[];
    const allPassiveIds = [e.passive, ...(e.extraPassives||[])].filter(Boolean);
    const passiveObjs = allPassiveIds.map(id => passivePool.find(p=>p.id===id) || {id, title:id, desc:''});

    // Build intent HTML
    let intentHtml = '';
    if(e.alive && e.intentQueue && e.intentQueue.length > 0){
      intentHtml = `<div style="margin-top:4px;display:flex;flex-direction:column;gap:2px;">`;
      e.intentQueue.forEach((intent, ii) => {
        if(intent.hidden){
          intentHtml += `<div style="font-size:.55rem;color:#554466;font-family:'Cinzel',serif;
            background:#110022;border:1px solid #2a1040;border-radius:3px;padding:2px 5px;">
            ${ii===0?'▶':'·'} <span style="letter-spacing:.06em;">???</span>
          </div>`;
        } else {
          const isCurrent = ii === 0;
          const isCharge = intent.label.includes('⚡');
          const color = isCharge ? '#ffcc44' : isCurrent ? '#e0c0ff' : '#886aa0';
          const bg = isCharge ? '#2a1800' : isCurrent ? '#1a0030' : '#0e0018';
          const border = isCharge ? '#aa7700' : isCurrent ? '#7040cc' : '#2a1040';
          intentHtml += `<div style="font-size:.55rem;color:${color};font-family:'Cinzel',serif;
            background:${bg};border:1px solid ${border};border-radius:3px;padding:2px 5px;
            ${isCurrent?'font-weight:bold;':'opacity:.75;'}">
            ${isCurrent?'▶':'·'} ${intent.label}
            ${(!player._mistBlindDamage && (intent.hintFn||intent.hint)) ? `<div style="font-size:.46rem;color:#998aaa;margin-top:1px;padding-left:9px;opacity:.9;">${intent.hintFn ? intent.hintFn() : intent.hint}</div>` : ''}
          </div>`;
        }
      });
      intentHtml += `</div>`;
    }

    card.innerHTML = `
      <div class="arena-hud-name" style="display:flex;align-items:center;gap:4px;">${elemHatSVG(e.element||'Neutral',14)} <span>${e.name}</span></div>
      <div class="arena-hud-hp-wrap"><div class="arena-hud-hp-fill" style="width:${pct}%;background:${hpColor(pct)}"></div></div>
      <div class="arena-hud-hp-text">${e.hp}/${e.enemyMaxHP}</div>
      <div style="font-size:.42rem;color:#7a6040;font-family:'Cinzel',serif;margin-top:2px;">⚔ ${e.enemyDmg} dmg &nbsp;·&nbsp; PWR ${e.scaledPower}</div>
      ${passiveObjs.length > 0 ? `<div style="font-size:.42rem;color:#7a5a30;font-family:'Cinzel',serif;margin-top:2px;display:flex;flex-wrap:wrap;gap:2px;">${passiveObjs.map(p=>`<span style="cursor:help;padding:1px 4px;border-radius:2px;background:#1a0e00;border:1px solid #3a2010;" title="${((p.desc||'')+' '+(p.detail||'')).trim().replace(/"/g,"'")}">${p.emoji||'✦'} ${p.title||p.id}</span>`).join('')}</div>` : ''}
      ${e.items && e.items.length > 0 ? `<div style="font-size:.42rem;color:#5a8a40;font-family:'Cinzel',serif;margin-top:1px;">${e.items.map(it=>`<span style="cursor:help;padding:1px 4px;border-radius:2px;background:#0a1400;border:1px solid #2a4010;" title="${it.name}">${it.emoji} ${it.name}</span>`).join(' ')}</div>` : ''}
      <div class="arena-hud-status" id="estatus-${i}"></div>
      ${intentHtml}
    `;
    hud.appendChild(card);
  });

  // Status tags per enemy
  const _mistHPPct = Math.round(((player._mistEnemyHPMult||1)-1)*100);
  (combat.enemies||[]).forEach((e, i)=>{
    const row = document.getElementById(`estatus-${i}`);
    if(!row) return;
    const s = e.status;
    if(s.burnStacks>0)       row.appendChild(tag(`🔥${s.burnStacks}`,'tag-burn',`Burn ×${s.burnStacks} — deals ${s.burnStacks} dmg/turn`));
    if(s.stunned>0)          row.appendChild(tag(`❄${s.stunned}t`,'tag-stun',`Stunned — skips ${s.stunned} turn(s)`));
    if(s.rootStacks>0)       row.appendChild(tag(`🌿${s.rootStacks}`,'tag-root',`Root ×${s.rootStacks} — takes +${s.rootStacks*ROOT_POWER_PER_STACK} bonus damage`));
    if(s.overgrowthStacks>0) row.appendChild(tag(`🌿G${s.overgrowthStacks}`,'tag-root',`Overgrowth ×${s.overgrowthStacks} — +${s.overgrowthStacks*ROOT_POWER_PER_STACK} bonus damage`));
    if(s.foamStacks>0)       row.appendChild(tag(`🫧${Math.floor(s.foamStacks)}`,'tag-block',`Foam ×${Math.floor(s.foamStacks)} — -${Math.floor(s.foamStacks)} ATK/EFX flat, -${Math.floor(s.foamStacks)*5} Armor`));
    if(s.shockStacks>0)      row.appendChild(tag(`⚡${s.shockStacks}`,'tag-stun',`Shock ×${s.shockStacks} — reduces outgoing damage by ${s.shockStacks*5}%`));
    if(s.block>0)            row.appendChild(tag(`🛡${s.block}`,'tag-block',`Armor ${s.block} — absorbs ${s.block} damage`));
    if(s.phaseTurns>0)       row.appendChild(tag(`🔮`,'tag-phase',`Phase — immune to damage for ${s.phaseTurns} turn(s)`));
    if(s.frostStacks>0)      row.appendChild(tag(`❄️${s.frostStacks}`,'tag-stun',`Frost ×${s.frostStacks} — -${s.frostStacks} ATK/Armor`));
    if(s.stoneStacks>0)      row.appendChild(tag(`🪨${Math.floor(s.stoneStacks)}`,'tag-block',`Stone ×${Math.floor(s.stoneStacks)} — +${Math.floor(s.stoneStacks)*3} ATK, +${Math.floor(s.stoneStacks)*2} Armor`));
    // Mist HP bonus: undispellable indicator
    if(_mistHPPct > 0){ const t=tag(`🌫+${_mistHPPct}%HP`,'tag-block',`Mist — The Veil grants this enemy +${_mistHPPct}% max HP (cannot be removed)`); t.style.opacity='.7'; row.appendChild(t); }
  });

  renderBattlefield();
}

function renderSummonsRow(){
  const col = document.getElementById('arena-summons');
  if(!col) return;
  col.innerHTML = '';
  if(!combat.summons || combat.summons.length === 0){
    renderBattlefield(); return;
  }
  combat.summons.forEach(s=>{
    if(s.hp <= 0) return;
    const card = document.createElement('div');
    card.className = 'arena-summon-card';
    const pct = Math.round((s.hp/s.maxHP)*100);
    card.textContent = `${s.emoji} ${s.name} ${s.hp}/${s.maxHP}`;
    col.appendChild(card);
  });
  renderBattlefield();
}
function updateHPBars(){
  const pMax = maxHPFor('player');
  const pPct = Math.max(0, (player.hp / pMax) * 100);

  // Player HUD
  const fill = document.getElementById('player-hud-hp-fill');
  if(fill){ fill.style.width = pPct + '%'; fill.style.background = hpColor(pPct); }
  const txt = document.getElementById('player-hp-text');
  if(txt) txt.textContent = `${Math.max(0,player.hp)} / ${pMax}`;
  const nm = document.getElementById('player-hud-name');
  if(nm) nm.textContent = playerName;

  // Mist badge
  const mb = document.getElementById('mist-badge');
  if(mb){
    const mist = (typeof getTotalMist === 'function') ? getTotalMist() : 0;
    if(mist > 0){ mb.textContent = `🌫 ${mist} Mist`; mb.style.display = ''; }
    else mb.style.display = 'none';
  }

  renderEnemyCards();   // also redraws canvas
  renderSummonsRow();
}

function renderStatusTags(){
  const pr = document.getElementById('player-status-row');
  if(pr){
    pr.innerHTML = '';
    const s = status.player;
    if(s.burnStacks>0)       pr.appendChild(tag(`🔥${s.burnStacks}`,'tag-burn',`Burn ×${s.burnStacks} — deals ${s.burnStacks} dmg/turn (1 per stack)`));
    if(s.stunned>0)          pr.appendChild(tag(`❄${s.stunned}t`,'tag-stun',`Stunned — skip ${s.stunned} turn(s)`));
    if(s.rootStacks>0)       pr.appendChild(tag(`🌿${s.rootStacks}`,'tag-root',`Root ×${s.rootStacks} — you take +${s.rootStacks*ROOT_POWER_PER_STACK} bonus damage from attacks`));
    if(s.overgrowthStacks>0) pr.appendChild(tag(`🌿G${s.overgrowthStacks}`,'tag-root',`Overgrowth ×${s.overgrowthStacks} — enhanced root, +${s.overgrowthStacks*ROOT_POWER_PER_STACK} bonus damage`));
    if(s.foamStacks>0)       pr.appendChild(tag(`🫧${Math.floor(s.foamStacks)}`,'tag-block',`Foam ×${Math.floor(s.foamStacks)} — -${Math.floor(s.foamStacks)} ATK/EFX flat, -${Math.floor(s.foamStacks)*5} Armor`));
    if(s.shockStacks>0)      pr.appendChild(tag(`⚡${s.shockStacks}`,'tag-stun',`Shock ×${s.shockStacks} — reduces your outgoing damage by ${s.shockStacks*5}%`));
    if(s.block>0)            pr.appendChild(tag(`🛡${s.block}`,'tag-block',`Armor ${s.block} — absorbs ${s.block} incoming damage`));
    if(s.phaseTurns>0)       pr.appendChild(tag('🔮','tag-phase',`Phase — immune to damage for ${s.phaseTurns} turn(s)`));
    if(s.frostStacks>0)      pr.appendChild(tag(`❄️${s.frostStacks}`,'tag-stun',`Frost ×${s.frostStacks} — -${s.frostStacks} ATK/EFX/Armor; at 10 stacks: Frozen (stunned)`));
    if(s.stoneStacks>0)      pr.appendChild(tag(`🪨${Math.floor(s.stoneStacks)}`,'tag-block',`Stone ×${Math.floor(s.stoneStacks)} — +${Math.floor(s.stoneStacks)*3} ATK, +${Math.floor(s.stoneStacks)*2} Armor; decays 25%/turn`));
    // Plasma
    if(playerElement==='Plasma'){
      if(s.stallActive)           pr.appendChild(tag('🫧 Stall','tag-phase','Stall — enemy action delayed, charge refunded next turn'));
      if(s.borrowedCharge>0)      pr.appendChild(tag(`⏳${s.borrowedCharge}debt`,'tag-burn',`Borrowed Charge — ${s.borrowedCharge} charge debt to repay`));
      if(s.plasmaShieldReduction>0) pr.appendChild(tag(`🛡${s.plasmaShieldReduction}%`,'tag-block',`Plasma Shield — ${s.plasmaShieldReduction}% incoming damage reduced`));
      if(combat.plasmaOvercharged) pr.appendChild(tag('✦ OC','tag-phase','Overcharged — next plasma cast has bonus power'));
    }
    // Air: Momentum
    if(playerElement==='Air'){
      if((s.momentumStacks||0)>0)   pr.appendChild(tag(`💨${Math.floor(s.momentumStacks)}M`,'tag-phase',`Momentum ×${Math.floor(s.momentumStacks)} — +${Math.floor(s.momentumStacks)} ATK, +${Math.floor(s.momentumStacks)*2}% dodge; decays each turn`));
      if(s.windWallActive)           pr.appendChild(tag('🛡️WW','tag-block','Wind Wall — blocks next instance of damage'));
      if(s.tornadoAoENext)           pr.appendChild(tag('🌪️AoE','tag-phase','Tornado AoE — next attack hits all enemies'));
    }
  }
  renderEnemyCards();
}

function tag(text,cls,tooltip){ const t=document.createElement("span");t.className="status-tag "+cls;t.textContent=text;if(tooltip){t.title=tooltip;t.style.cursor='help';}return t; }
function hpColor(pct){ return pct>50?"#3a8a3a":pct>25?"#8a7a1a":"#8a2a2a"; }

function log(msg,type=""){
  const el=document.getElementById("battle-log");
  if(!el) return;
  const line=document.createElement("div");
  line.className="log-line "+type; line.textContent=msg;
  el.appendChild(line);
  // Only auto-scroll if log tab is active
  if(_activeCombatTab === 'log') el.scrollTop=el.scrollHeight;
  // Badge the log tab when not visible
  if(_activeCombatTab !== 'log'){
    _logHasNew = true;
    _updateLogBadge(true);
  }
}

function showScreen(id){
  // Stop lobby map when navigating away from between-runs
  if (id !== 'between-runs-screen' && typeof stopLobbyMap === 'function') stopLobbyMap();
  // Stop any running game over / victory animation
  const goCanvas = document.getElementById('gameover-canvas');
  if(goCanvas && goCanvas._goStop) goCanvas._goStop();
  const vcCanvas = document.getElementById('victory-canvas');
  if(vcCanvas && vcCanvas._vcStop) vcCanvas._vcStop();
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  // Music transitions — zone-aware
  _tryResumeAudio();
  const _zone = (typeof currentZoneElement !== 'undefined' && currentZoneElement)
    ? currentZoneElement
    : (typeof playerElement !== 'undefined' ? playerElement : null);
  const _menuScreens = ['title-screen','save-select-screen','hub-screen','element-screen','passive-screen','between-runs-screen','character-screen'];
  if(id === 'combat-screen'){
    musicPlaySmart(_zone ? 'battle_' + _zone : 'battle_Fire');
  } else if(['map-screen','campfire-screen','shop-screen','gym-screen','rival-screen'].includes(id)){
    musicPlaySmart('map');
  } else if(_menuScreens.includes(id)){
    musicPlaySmart('menu');
  } else if(id === 'run-victory-screen'){
    musicPlaySmart('menu');
  } else if(id === 'between-runs-screen'){
    musicStopAll();
  }
}

function restartToSelect(){
  Object.assign(player,{
    hp:BASE_MAX_HP, attackPower:0, effectPower:0, defense:0,
    skillPoints:0, gold:0, inventory:[], spellbook:[], passives:[], startPassive:null,
    unlockedElements:[], baseMaxHPBonus:0, spellbooks:[], activeBookIdx:0,
    revives:0, bonusActions:0,
    basicUpgrade:0, basicDmgMult:1.0,
    _hasteStart:false, _blockStart:0, _extraStartSpell:false, _rerolls:0,
  });
  Object.assign(combat,{enemies:[],targetIdx:0,activeEnemyIdx:0,enemy:{},enemyHP:0,playerTurn:false,over:false,tempDmgBonus:0,actionsLeft:0,basicCD:0,playerAirToggle:false,enemyAirToggle:false,actionQueue:[],summons:[],totalGold:0});
  battleNumber=1; currentGymIdx=0; zoneBattleCount=0; gymSkips=0; gymDefeated=false; pendingLevelUps=[];
  _runDmgDealt = 0; _runDmgTaken = 0; _runRoomsCompleted = 0; _runZoneReached = '';
  sandboxMode = false;
  GYM_ROSTER.length = 0;
  showHub();
}

function backToElementSelectFromPassive(){
  pendingStartPassive = null;
  showElementScreen();
}
function promptAbandon(){
  document.getElementById("confirm-modal").classList.add("open");
}
function closeModal(){
  document.getElementById("confirm-modal").classList.remove("open");
}
function confirmAbandon(){
  closeModal();
  _lastRunPhos = saveRunStats();
  showBetweenRuns();
}


// ===============================
// SPELL BUTTONS & TURN UI
// ===============================
function setPlayerTurnUI(isPlayerTurn){
  combat.playerTurn=isPlayerTurn;
  const endBtn=document.getElementById("end-turn-btn");
  const invBtn=document.getElementById("inv-toggle-btn");
  if(endBtn) endBtn.disabled=!isPlayerTurn;
  if(invBtn) invBtn.disabled=!isPlayerTurn;
  renderSpellButtons();
  renderQueue();
  updateActionUI();
}

function basicSpellDamagePreview(){
  const dmg=Math.round((BASE_DMG+combat.tempDmgBonus+(player.basicDmgFlat||0))*(player.basicDmgMult||1.0));
  return dmg+'+P';
}

function doBasicAttack(ctx){
  const _elemBasicFlag = {Fire:'_elementalBasicFire',Water:'_elementalBasicWater',Ice:'_elementalBasicIce',Earth:'_elementalBasicEarth',Nature:'_elementalBasicNature',Lightning:'_elementalBasicLightning',Plasma:'_elementalBasicPlasma',Air:'_elementalBasicAir'};
  const basicLevel = player[_elemBasicFlag[playerElement]||''] || 0; // 0=off, 1-5=tier
  const hasElemBasicActive = basicLevel > 0;
  // Damage scales with level: +10 base, +3 per level above 1
  const elemDmgBonus = hasElemBasicActive ? (10 + _incantationBonus(basicLevel, 3, 0.95)) : 0;
  const dmg = Math.round((BASE_DMG + (combat.tempDmgBonus||0) + (player.basicDmgFlat||0) + elemDmgBonus) * (player.basicDmgMult||1.0));
  // Burn stacks for Fire scale with level
  const burnStacks = hasElemBasicActive ? Math.round(2 + _incantationBonus(basicLevel, 1, 0.90)) : 0;
  const elemEffects = (hasElemBasicActive && playerElement==='Fire') ? [{type:'burn', stacks:burnStacks}] : [];
  const _basicNames = {Fire:'Ember Strike',Water:'Tidal Jab',Ice:'Frost Jab',Earth:'Stone Fist',Nature:'Vine Whip',Lightning:'Spark Strike',Plasma:'Surge Bolt',Air:'Gust Slash'};
  const _basicIcons = {Fire:'🔥',Water:'💧',Ice:'❄️',Earth:'🪨',Nature:'🌿',Lightning:'⚡',Plasma:'🔮',Air:'💨'};
  const _basicLabel = hasElemBasicActive ? `${_basicIcons[playerElement]||'⚔'} ${_basicNames[playerElement]||'Basic Attack'}` : '⚔ Basic Attack';
  ctx.hit({ baseDamage: dmg, effects: elemEffects, isBasic: true, abilityElement: playerElement, label: _basicLabel });
  if(combat.over || !hasElemBasicActive) return;
  // Post-hit elemental procs — all scale with basicLevel via _incantationBonus
  const _ib = (base, scale, decay) => base + _incantationBonus(basicLevel, scale, decay);
  if(playerElement==='Water')     { applyFoam('player','enemy', Math.round(_ib(1, 0.5, 0.90))); }
  if(playerElement==='Ice')       { applyFrost('player','enemy', _ib(1, 0.5, 0.90)); }
  if(playerElement==='Earth')     { addStoneStacks('player', Math.round(_ib(1, 0.5, 0.90))); }
  if(playerElement==='Nature')    { applyRoot('player','enemy', Math.round(_ib(1, 0.5, 0.90))); }
  if(playerElement==='Lightning') {
    const extraShock = Math.round(_ib(1, 0.5, 0.90) * (1 + effectPowerFor('player')/50));
    status.enemy.shockStacks = (status.enemy.shockStacks||0) + extraShock;
    log(`⚡ Spark Strike: +${extraShock} extra Shock (×${status.enemy.shockStacks})`, 'status');
  }
  if(playerElement==='Plasma') {
    const charge = Math.round(_ib(2, 1, 1.00));
    status.player.plasmaCharge = Math.min((status.player.plasmaCharge||0)+charge, 20);
    if(typeof updateChargeUI==='function') updateChargeUI();
    log(`🔮 Surge Bolt: +${charge} Charge (${status.player.plasmaCharge} total)`, 'player');
  }
  if(playerElement==='Air') { addMomentumStacks(Math.round(_ib(1, 1, 1.00))); }
}

// ── Spell damage preview for tooltips ────────────────────────────────────────
function _spellDmgPreview(spell) {
  if (!spell || !spell.execute) return '';
  const src = spell.execute.toString();
  let atk, efx, def;
  try { atk = attackPowerFor('player'); efx = effectPowerFor('player'); def = defenseFor('player'); }
  catch(e) { atk = player.attackPower; efx = player.effectPower; def = player.defense; }
  const mult = spell.dmgMult || 1.0;

  // Special cases: spells whose damage doesn't follow simple baseDamage+ATK
  try { switch(spell.id) {
    case 'zap': {
      const b = 25 + Math.floor(atk/10);
      return `~${Math.round((b + atk) * mult)} dmg`;
    }
    case 'echo_slam': {
      const n = aliveEnemies().length || 1;
      return `~${Math.round((5*n + atk) * mult)} dmg to all (${n} × 5 base)`;
    }
    case 'earthshaker':  return `~${atk*3} dmg (ATK × 3)`;
    case 'tidal_surge':  return `~${Math.round((20+atk)*mult)} dmg · heals ~${10+Math.ceil(def/2)} HP`;
    case 'vampiric_strike': { const d=Math.round((30+atk)*mult); return `~${d} dmg · heals ~${Math.round(d*0.4)} HP`; }
    case 'tidal_shield':    return `+${20+Math.floor(def/2)} armor`;
    case 'seismic_wave':    return `~${Math.round((20+atk)*mult)} dmg · -5 enemy armor, +5 armor`;
    case 'shatter': {
      const e2 = combat.enemies[combat.activeEnemyIdx];
      if (e2 && e2.status.frozen) return `~${Math.round((40+Math.floor(atk/5)+atk)*mult)} dmg (Frozen target)`;
      const fr = e2 ? (e2.status.frostStacks||0) : 0;
      return fr > 0 ? `${fr} Frost × 4 = ${fr*4} dmg, clears Frost` : 'vs Frozen: ~40+ATK | vs Frosted: Frost×4';
    }
    case 'blitz': {
      const e2 = combat.enemies[combat.activeEnemyIdx];
      const sh = e2 ? (e2.status.shockStacks||0) : 0;
      const hpow = Math.max(1,Math.floor(atk/2));
      return sh > 0 ? `${sh} Shock × ${hpow} = ${sh*hpow} dmg` : `Shock stacks × ATK÷2 dmg`;
    }
    case 'cataclysm': {
      const st = status.player.stoneStacks||0;
      return st > 0 ? `${st} Stone × 25 = ${st*25} dmg to all` : 'X Stone × 25 dmg to all';
    }
    case 'break_momentum': {
      const m = Math.floor(status.player.momentumStacks||0);
      return m > 0 ? `${m} Momentum × 5 = ${m*5} dmg` : 'X Momentum × 5 dmg';
    }
    case 'natures_wrath':   return 'X Root stacks × 20 dmg to all (consumes root)';
    case 'tsunami':         return 'X Foam stacks × 10 dmg per enemy (consumes foam)';
    case 'extinguish':      return 'Triggers burn tick + (removed stacks × 2) bonus dmg';
    case 'fire_heal':       return 'Heals (all burn stacks on field) HP';
    case 'fire_rage':       return '+(total burn ÷ 2) ATK for 2 turns';
    case 'cleanse_current': return 'Heals (debuffs removed × 20) HP';
    case 'plasma_lance': {
      const ch = status.player.plasmaCharge||0;
      return `${ch}⚡ → ~${ch*5+atk+efx} dmg (spend×5 + ATK+EFX)`;
    }
    case 'obliteration': {
      const ch = status.player.plasmaCharge||0;
      return `${ch}⚡ → ${ch*2} hits × ${5+atk+efx} dmg`;
    }
    case 'energy_infusion':  return 'spend ⚡ → +⚡ Power this battle';
    case 'plasma_shield':    return 'spend ⚡ → +⚡% damage reduction (max 75%)';
    case 'self_sacrifice': {
      const ch = status.player.plasmaCharge||0;
      return `${ch}⚡ → ${ch*2} hits of 5 self-dmg (each hit generates charge)`;
    }
    case 'borrowed_power':   return '+10 Charge now — 500 dmg next turn if unpaid';
    case 'plasma_stall':     return `Stores ${status.player.plasmaCharge||0} Charge, immune this turn, regain next`;
    case 'singularity':      return 'Next Plasma ability has doubled effects';
    case 'chain_lightning':  return `4 hits × ~${Math.round((5+atk)*mult)} dmg (random enemies)`;
    case 'natures_call':     return hasPassive('nature_verdant_legion') ? 'Summon Treant (50 HP, 15 dmg, 100% root)' : 'Summon Treant (25 HP, 5 dmg, 50% root)';
    case 'living_forest': {
      const ts = combat.summons.filter(t=>t.hp>0);
      return ts.length ? `${ts.length} Treants × 2 strikes of ${ts[0].dmg} dmg` : 'Commands all Treants to strike twice';
    }
    case 'storm_rush':  return '+3 actions this turn · +5 Momentum · all CDs -1';
    case 'overcharge':  return '+3 Shock on target · +30 Power next turn';
    case 'feedback':    return '+2 Shock on target · 5 self-dmg · +15 Power next turn';
  }} catch(e2) {}

  // Generic: parse s.hit({baseDamage:X, hits:Y, isAOE:true})
  const hasHit   = /\bs\.hit\s*\(/.test(src);
  const dmgMatch = src.match(/baseDamage\s*:\s*(\d+)/);
  const hitMatch = src.match(/\bhits\s*:\s*(\d+)/);
  const isAOE    = /isAOE\s*:\s*true/.test(src) || (src.includes('aliveEnemies()') && hasHit);
  const noAtk    = /_noAtk\s*:\s*true/.test(src);
  const parts    = [];

  if (hasHit && dmgMatch) {
    const base   = parseInt(dmgMatch[1]);
    const hits   = hitMatch ? parseInt(hitMatch[1]) : 1;
    const perHit = noAtk ? Math.round(base * mult) : Math.round((base + atk) * mult);
    const total  = perHit * hits;
    parts.push(hits > 1 ? `${hits} hits × ${perHit} = ${total} dmg` : `~${total} dmg`);
    if (isAOE) parts.push('(all enemies)');
  }
  const healMatch  = src.match(/healSelf\s*\(\s*(\d+)/);
  if (healMatch) parts.push(`heals ~${healMatch[1]} HP`);
  const blockMatch = src.match(/gainBlock\s*\([^,]+,\s*(\d+)/);
  if (blockMatch) parts.push(`+${parseInt(blockMatch[1])} armor`);

  return parts.join(' · ');
}

function renderSpellButtons(){
  const grid = document.getElementById("spell-grid");
  if(!grid) return;
  const isMyTurn  = combat.playerTurn && !combat.over;
  const nonFreeQueued = (combat.actionQueue||[]).filter(a=>!a.isFree && !a.isPlasma).length;
  const queueFull = nonFreeQueued >= (combat.actionsLeft||0);
  // Storm Rush preview: if it's queued, show all spell CDs as 1 lower
  const stormRushQueued = (combat.actionQueue||[]).some(a => a.stormRushAction);
  const cdPreviewReduce = stormRushQueued ? 1 : 0;

  // ── Populate book tab bar ────────────────────────────────────────────────
  const bookTabBar = document.getElementById('sb-book-tabs');
  if(bookTabBar){
    bookTabBar.innerHTML = '';
    if(player.spellbooks && player.spellbooks.length > 1){
      player.spellbooks.forEach((book, i) => {
        const btn = document.createElement('button');
        btn.className = 'sb-book-tab' + (i === player.activeBookIdx ? ' active' : '');
        btn.textContent = book.name;
        btn.disabled = (i === player.activeBookIdx) || !isMyTurn || queueFull;
        btn.onclick = () => queueSwitchBook(i);
        // Tooltip: show book description if it's a catalogue book
        if(book.catalogueId && typeof SPELLBOOK_CATALOGUE !== 'undefined'){
          const cat = SPELLBOOK_CATALOGUE[book.catalogueId];
          if(cat){
            const lvl = book.upgradeLevel || 0;
            const lvlDesc = (cat.levelDescs||[])[lvl] || '';
            const lines = [cat.name + (cat.rarity==='legendary'?' ✦':''), cat.desc];
            if(lvlDesc) lines.push('Level '+(lvl+1)+': '+lvlDesc);
            if(cat.negative) lines.push('Downside: '+cat.negative);
            btn.title = lines.join('\n');
          }
        }
        bookTabBar.appendChild(btn);
      });
    } else if(player.spellbooks && player.spellbooks.length === 1){
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-family:Cinzel,serif;font-size:.6rem;color:#6a4a20;letter-spacing:.06em;cursor:help;';
      lbl.textContent = player.spellbooks[0].name;
      const _b0 = player.spellbooks[0];
      if(_b0.catalogueId && typeof SPELLBOOK_CATALOGUE !== 'undefined'){
        const _cat = SPELLBOOK_CATALOGUE[_b0.catalogueId];
        if(_cat){
          const _lvl = _b0.upgradeLevel || 0;
          const _lvlDesc = (_cat.levelDescs||[])[_lvl] || '';
          const _lines = [_cat.name, _cat.desc];
          if(_lvlDesc) _lines.push('Level '+(_lvl+1)+': '+_lvlDesc);
          if(_cat.negative) _lines.push('Downside: '+_cat.negative);
          lbl.title = _lines.join('\n');
        }
      }
      bookTabBar.appendChild(lbl);
    }
  }

  // ── Populate passives row ────────────────────────────────────────────────
  const passivesRow = document.getElementById('sb-passives-row');
  if(passivesRow){
    passivesRow.innerHTML = '';
    const book = activeBook();
    const passiveIds = book ? book.passives : (player.passives||[]);
    if(passiveIds.length === 0){
      const empty = document.createElement('span');
      empty.className = 'sb-passive-empty';
      empty.textContent = 'No passives yet';
      passivesRow.appendChild(empty);
    } else {
      passiveIds.forEach(pid => {
        // Find passive def
        let pdef = null;
        Object.values(PASSIVE_CHOICES||{}).forEach(arr => {
          const found = (arr||[]).find(p => p.id === pid);
          if(found) pdef = found;
        });
        const pip = document.createElement('div');
        pip.className = 'sb-passive-pip';
        pip.textContent = pdef ? (pdef.emoji||'✦') : '✦';
        pip.setAttribute('data-tip', pdef ? (pdef.title||pdef.name||pid) : pid);
        if(pdef){
          const _tipLines = [(pdef.title||pdef.name||pid), pdef.desc||''];
          if(pdef.detail) _tipLines.push('─────', pdef.detail);
          pip.title = _tipLines.join('\n');
        } else { pip.title = pid; }
        passivesRow.appendChild(pip);
      });
    }
  }

  // ── Update end-turn btn ──────────────────────────────────────────────────
  const endBtn = document.getElementById('end-turn-btn');
  if(endBtn){
    const hasActions = (combat.actionQueue||[]).length > 0;
    endBtn.disabled = !combat.playerTurn || combat.over || !hasActions;
    endBtn.className = 'sb-endturn-btn' + (hasActions ? ' ready' : '');
    endBtn.textContent = hasActions ? '⚔ End Turn (' + combat.actionQueue.length + ')' : '⚔ End Turn';
  }

  // ── Update item button ────────────────────────────────────────────────────
  const itemBtn = document.getElementById('sb-item-btn');
  const invCount = document.getElementById('inv-count-label');
  if(itemBtn){
    const count = (player.inventory||[]).length;
    itemBtn.disabled = !isMyTurn || count === 0;
    if(invCount) invCount.textContent = count;
  }

  // ── PLASMA: full custom grid (shown whenever the plasma abilities book is active) ─────────────────────────────────────────────
  if(activeBook() && activeBook().isPlasmaBook){
    grid.style.gridTemplateColumns = 'repeat(3,1fr)';
    grid.innerHTML = '';
    const availCharge = Math.max(0, (status.player.plasmaCharge||0) - (combat.plasmaChargeReserved||0));
    if(!combat.plasmaSpendAmounts) combat.plasmaSpendAmounts = {};
    player.spellbook.forEach((spell) => {
      if(!spell.isPlasmaAbility) return;
      const onCD = (spell.currentCD||0) > 0;
      const isVar = spell.chargeCost === 'variable';
      const fixedCost = typeof spell.chargeCost === 'number' ? spell.chargeCost : 0;
      if(combat.plasmaSpendAmounts[spell.id] == null) combat.plasmaSpendAmounts[spell.id] = isVar ? Math.min(6,availCharge) : fixedCost;
      const curSpend = isVar ? Math.min(Math.max(1,combat.plasmaSpendAmounts[spell.id]),availCharge) : fixedCost;
      const canAfford = availCharge >= curSpend;
      const alreadyQueued = (combat.actionQueue||[]).some(a => a.spellId === spell.id);
      const cell = document.createElement('button');
      cell.className = 'sb-spell-cell' + (onCD?' on-cd':'');
      cell.disabled = !isMyTurn || onCD || !canAfford || alreadyQueued;
      const costLabel = isVar ? curSpend+'⚡' : fixedCost>0 ? fixedCost+'⚡' : 'Free';
      const overStr = combat.plasmaOvercharged ? '✦' : '';
      cell.innerHTML =
        '<div class="sb-spell-icon">'+spell.emoji+'</div>' +
        '<div class="sb-spell-name">'+spell.name+(overStr?' '+overStr:'')+'</div>' +
        '<div class="sb-spell-cd '+(onCD?'on-cd':'ready')+'">'+
          (onCD?'CD:'+spell.currentCD : costLabel)+
        '</div>' +
        (alreadyQueued ? '<div class="sb-spell-queued-badge">✓</div>' : '');
      {
        const chargeCostStr = isVar ? `Cost: variable ⚡ (adjust with +/-)` : fixedCost > 0 ? `Cost: ${fixedCost} ⚡` : 'Cost: Free';
        const cdInfo  = (spell.baseCooldown||0) > 0 ? `CD: ${spell.baseCooldown} turn${spell.baseCooldown!==1?'s':''}` : '';
        const dmgPrev = _spellDmgPreview(spell);
        const atkLine = `ATK: ${attackPowerFor('player')}  EFX: ${effectPowerFor('player')}  Charge: ${status.player.plasmaCharge||0}⚡`;
        const parts   = [spell.name+' [Plasma]', spell.desc||'', dmgPrev, chargeCostStr, cdInfo, atkLine].filter(Boolean);
        cell.title = parts.join('\n');
      }
      if(isVar){
        cell.style.cursor = 'default';
        cell.onclick = null;
        // Stepper overlay — small +/- inside cell
        const stepper = document.createElement('div');
        stepper.style.cssText='display:flex;gap:2px;justify-content:center;margin-top:2px;';
        const minus = document.createElement('button');
        minus.textContent='-'; minus.style.cssText='background:#1a0e05;border:1px solid #3a1a0a;color:#c8a060;width:18px;height:16px;font-size:.6rem;cursor:pointer;border-radius:2px;padding:0;';
        minus.onclick=(e)=>{e.stopPropagation();combat.plasmaSpendAmounts[spell.id]=Math.max(1,(combat.plasmaSpendAmounts[spell.id]||1)-1);renderSpellButtons();};
        const plus = document.createElement('button');
        plus.textContent='+'; plus.style.cssText='background:#1a0e05;border:1px solid #3a1a0a;color:#c8a060;width:18px;height:16px;font-size:.6rem;cursor:pointer;border-radius:2px;padding:0;';
        plus.onclick=(e)=>{e.stopPropagation();combat.plasmaSpendAmounts[spell.id]=Math.min(availCharge,(combat.plasmaSpendAmounts[spell.id]||1)+1);renderSpellButtons();};
        const castBtn = document.createElement('button');
        castBtn.textContent='Cast';castBtn.style.cssText='background:#2a1a3a;border:1px solid #6a2a8a;color:#da70d6;font-size:.54rem;padding:0 4px;border-radius:2px;cursor:pointer;font-family:Cinzel,serif;';
        castBtn.disabled = !isMyTurn||onCD||!canAfford||alreadyQueued;
        castBtn.onclick=(e)=>{
          e.stopPropagation();
          if(!isMyTurn||onCD||!canAfford||alreadyQueued) return;
          const snapSpend=combat.plasmaSpendAmounts[spell.id]||1;
          combat.plasmaChargeReserved=(combat.plasmaChargeReserved||0)+snapSpend;
          const snapTgt=combat.targetIdx;
          const snapIdx=player.spellbook.indexOf(spell);
          combat.actionQueue.push({label:spell.emoji+' '+spell.name+'('+snapSpend+'⚡)',fn:()=>{
            setActiveEnemy(snapTgt);
            combat.plasmaCurrentSpend=snapSpend; // wire UI spend → _plasmaSpend()
            const ctx=makeSpellCtx('player','enemy',snapIdx);
            ctx.plasmaChargeSpent=snapSpend;
            spell.execute(ctx);
            updateHPBars();renderStatusTags();updateStatsUI();
          },targetIdx:snapTgt,isPlasma:true,spellId:spell.id});
          renderQueue(); updateActionUI(); renderSpellButtons();
        };
        stepper.appendChild(minus); stepper.appendChild(castBtn); stepper.appendChild(plus);
        cell.appendChild(stepper);
      } else {
        cell.onclick = ()=>{
          if(!isMyTurn||onCD||!canAfford||alreadyQueued) return;
          const snapTgt=combat.targetIdx; const snapIdx=player.spellbook.indexOf(spell);
          combat.plasmaChargeReserved=(combat.plasmaChargeReserved||0)+curSpend;
          combat.actionQueue.push({label:spell.emoji+' '+spell.name,fn:()=>{
            setActiveEnemy(snapTgt);const ctx=makeSpellCtx('player','enemy',snapIdx);
            ctx.plasmaChargeSpent=curSpend;spell.execute(ctx);
            updateHPBars();renderStatusTags();updateStatsUI();
          },targetIdx:snapTgt,isPlasma:true,spellId:spell.id});
          renderQueue(); updateActionUI(); renderSpellButtons();
        };
      }
      grid.appendChild(cell);
    });
    return;
  }

  // ── Non-Plasma: Build 3-col grid ─────────────────────────────────────────
  grid.innerHTML = '';

  // Spell cells (player.spellbook includes _basic and _armor builtins)
  player.spellbook.forEach((spell) => {
    // ── Built-in: Basic Attack ───────────────────────────────────────────
    if (spell.id === '_basic') {
      const _elemBasicNames = {Fire:'Ember Strike',Water:'Tidal Jab',Ice:'Frost Jab',Earth:'Stone Fist',Nature:'Vine Whip',Lightning:'Spark Strike',Plasma:'Surge Bolt',Air:'Gust Slash'};
      const _elemBasicIcons = {Fire:'🔥',Water:'💧',Ice:'❄️',Earth:'🪨',Nature:'🌿',Lightning:'⚡',Plasma:'🔮',Air:'💨'};
      const _elemBasicFlags = {Fire:'_elementalBasicFire',Water:'_elementalBasicWater',Ice:'_elementalBasicIce',Earth:'_elementalBasicEarth',Nature:'_elementalBasicNature',Lightning:'_elementalBasicLightning',Plasma:'_elementalBasicPlasma',Air:'_elementalBasicAir'};
      const basicLevel = player[_elemBasicFlags[playerElement]||''] || 0;
      const hasElemBasic = basicLevel > 0;
      const basicName = hasElemBasic ? (_elemBasicNames[playerElement]||'Basic Attack') : 'Basic Attack';
      const basicIcon = hasElemBasic ? (_elemBasicIcons[playerElement]||'⚔') : '⚔';
      const basicOnCD = combat.basicCD > 0;
      const basicQueued = (combat.actionQueue||[]).some(a => a.label === `${basicIcon} ${basicName}`);
      const basicOutOfPP = (spell.currentPP !== undefined) && spell.currentPP <= 0;
      // Rarity for basic: level maps to rarity tiers
      const _basicRarityMap = [null,'dim','kindled','blazing','radiant','radiant'];
      const _basicRarityKey = _basicRarityMap[basicLevel] || null;
      const _basicRarityInfo = (hasElemBasic && typeof SPELL_RARITY!=='undefined') ? SPELL_RARITY[_basicRarityKey] : null;
      const _basicRarityColor = _basicRarityInfo ? _basicRarityInfo.color : null;
      const cell = document.createElement('button');
      cell.className = 'sb-spell-cell' + (basicOnCD?' on-cd':'') + (basicOutOfPP?' no-pp':'');
      if(_basicRarityColor) cell.style.borderColor = _basicRarityColor + '99';
      cell.disabled = !isMyTurn || queueFull || basicOnCD || basicQueued || basicOutOfPP;
      const _elemDmgBonus = hasElemBasic ? (10 + _incantationBonus(basicLevel, 3, 0.95)) : 0;
      const basicDmgEst = Math.max(1, Math.round(
        (BASE_DMG + (combat.tempDmgBonus||0) + (player.basicDmgFlat||0) + _elemDmgBonus) * (player.basicDmgMult||1.0)
        + attackPowerFor('player')));
      const _basicRarityBadge = _basicRarityColor
        ? `<div style="font-size:.5rem;color:${_basicRarityColor};letter-spacing:.04em;">✦${_basicRarityInfo.label}${basicLevel>=5?' II':''}</div>`
        : '';
      // Build elemental effect description line for the button
      const _elemEffectDescs = {
        Fire:      lvl => `🔥 +${Math.round(2 + _incantationBonus(lvl,1,0.90))} Burn`,
        Water:     lvl => `🫧 +${Math.round(1 + _incantationBonus(lvl,0.5,0.90))} Foam`,
        Ice:       lvl => `❄️ +${(1 + _incantationBonus(lvl,0.5,0.90)).toFixed(1)} Frost`,
        Earth:     lvl => `🪨 +${Math.round(1 + _incantationBonus(lvl,0.5,0.90))} Stone`,
        Nature:    lvl => `🌿 +${Math.round(1 + _incantationBonus(lvl,0.5,0.90))} Root`,
        Lightning: lvl => `⚡ +${Math.round(1 + _incantationBonus(lvl,0.5,0.90))} Shock`,
        Plasma:    lvl => `🔮 +${Math.round(2 + _incantationBonus(lvl,1,1.00))} Charge`,
        Air:       lvl => `💨 +${Math.round(1 + _incantationBonus(lvl,1,1.00))} Momentum`,
      };
      const _elemEffectFn = hasElemBasic && _elemEffectDescs[playerElement];
      const _elemEffectLine = _elemEffectFn
        ? `<div style="font-size:.48rem;color:#a0c8a0;letter-spacing:.03em;margin-top:1px;">${_elemEffectFn(basicLevel)}</div>`
        : '';
      const basicPPLabel = spell.maxPP !== undefined ? '<div class="sb-spell-pp">'+(spell.currentPP||0)+'/'+spell.maxPP+' PP</div>' : '';
      cell.innerHTML =
        `<div class="sb-spell-icon">${basicIcon}</div>` +
        `<div class="sb-spell-name">${basicName}</div>` +
        '<div class="sb-spell-cd '+(basicOnCD?'on-cd':'ready')+'">'+
          (basicOutOfPP ? 'No PP' : basicOnCD ? 'CD:'+combat.basicCD : '~'+basicDmgEst+' dmg')+
        '</div>' +
        _basicRarityBadge +
        _elemEffectLine +
        basicPPLabel +
        (basicQueued ? '<div class="sb-spell-queued-badge">✓</div>' : '');
      const _elemEffectTooltip = _elemEffectFn ? ('\n' + _elemEffectFn(basicLevel) + ' on hit') : '';
      cell.title = `${basicName} [${playerElement}]${_basicRarityInfo?' · '+_basicRarityInfo.label+(basicLevel>=5?' II':''):''}\nDeals ~${basicDmgEst} dmg (ATK: ${attackPowerFor('player')})${_elemEffectTooltip}\nCooldown: 1 turn`;
      const basicSpellRef = spell;
      cell.onclick = ()=>{
        if(!isMyTurn||queueFull||basicOnCD||basicQueued||basicOutOfPP) return;
        const snapTgt=combat.targetIdx;
        const snapCD=adjustedCooldownFor('player',1)||1;
        const _bSnapTgt = snapTgt; const _bHasElem = hasElemBasic;
        queueAction(`${basicIcon} ${basicName}`,()=>{
          combat.basicCD=snapCD;
          if((basicSpellRef.currentPP||0) > 0) basicSpellRef.currentPP--;
          setActiveEnemy(_bSnapTgt);
          const ctx=makeSpellCtx('player','enemy',-1);
          doBasicAttack(ctx);
          updateHPBars();renderStatusTags();updateStatsUI();
        },{
          hintFn:()=>{
            if(player._mistBlindDamage) return '';
            const tgt = combat.enemies[_bSnapTgt];
            if(!tgt||!tgt.alive) return '';
            const prevActive = combat.activeEnemyIdx;
            combat.activeEnemyIdx = _bSnapTgt;
            const ap = attackPowerFor('player','enemy');
            combat.activeEnemyIdx = prevActive;
            const base = (player.basicDmgFlat||0) + (_bHasElem ? 10 : 0);
            let dmg = Math.max(0, base + ap);
            const block = tgt.status.block||0;
            const after = Math.max(0, dmg - block);
            return block>0&&after!==dmg ? `~${after} dmg (${dmg}−${block} blk)` : `~${after} dmg`;
          }
        });
        renderSpellButtons();
      };
      grid.appendChild(cell);
      return;
    }
    // ── Built-in: Armor ──────────────────────────────────────────────────
    if (spell.id === '_armor') {
      const armAmt = armorBlockAmount();
      const armorQueued = (combat.actionQueue||[]).some(a => a.label === '🛡 Armor');
      const armorOutOfPP = (spell.currentPP !== undefined) && spell.currentPP <= 0;
      const cell = document.createElement('button');
      cell.className = 'sb-spell-cell elemental' + (armorOutOfPP?' no-pp':'');
      cell.disabled = !isMyTurn || armorQueued || queueFull || armorOutOfPP;
      const armorPPLabel = spell.maxPP !== undefined ? '<div class="sb-spell-pp">'+(spell.currentPP||0)+'/'+spell.maxPP+' PP</div>' : '';
      cell.innerHTML =
        '<div class="sb-spell-icon">🛡</div>' +
        '<div class="sb-spell-name">Armor</div>' +
        '<div class="sb-spell-cd ready">'+(armorOutOfPP ? 'No PP' : '+'+armAmt+' Block')+'</div>' +
        armorPPLabel +
        (armorQueued ? '<div class="sb-spell-queued-badge">✓</div>' : '');
      cell.title = `Armor\n+${armAmt} Block (10 base + DEF÷5, DEF: ${defenseFor('player')})\nBlock absorbs damage before HP\nNo cooldown`;
      const armorSpellRef = spell;
      cell.onclick = ()=>{
        if(!isMyTurn||armorQueued||queueFull||armorOutOfPP) return;
        queueAction('🛡 Armor',()=>{
          if((armorSpellRef.currentPP||0) > 0) armorSpellRef.currentPP--;
          status.player.block=(status.player.block||0)+armAmt;
          log('🛡 You brace — +'+armAmt+' Block ('+status.player.block+' total).','player');
          renderStatusTags();
        },{});
        renderSpellButtons();
      };
      grid.appendChild(cell);
      return;
    }
    const rawCD = spell.currentCD || 0;
    const effectiveCD = Math.max(0, rawCD - cdPreviewReduce);
    const onCD = !spell.multiUse && effectiveCD > 0;
    const outOfPP = (spell.currentPP !== undefined) && spell.currentPP <= 0;
    const isFree = !!spell.isFreeAction;
    const alreadyQueued = !spell.multiUse && (combat.actionQueue||[]).some(a => a.label && a.label.includes(spell.name) && a.label.includes(spell.emoji));
    const cell = document.createElement('button');
    cell.className = 'sb-spell-cell elemental' + (onCD?' on-cd':'') + (outOfPP?' no-pp':'') + (isFree?' free-action':'');
    // Rarity: tint border color
    if(spell.rarity && spell.rarity !== 'dim' && typeof SPELL_RARITY !== 'undefined'){
      const rc = SPELL_RARITY[spell.rarity];
      if(rc && rc.color) cell.style.borderColor = rc.color;
    }
    const isChargeShot = spell.id === 'charge_shot';
    const slotsAvail = combat.actionsLeft - nonFreeQueued;
    const canQueue = isFree
      ? !onCD && !outOfPP && (spell.baseCooldown === 0 || !alreadyQueued)
      : !queueFull && !onCD && !outOfPP && (spell.multiUse || !alreadyQueued);
    cell.disabled = !isMyTurn || !canQueue || (isChargeShot && slotsAvail < 2);
    const rankPct = Math.round((spell.dmgMult||1.0)*100);
    const rankStr = rankPct>100 ? ' ['+rankPct+'%]' : '';
    const cdLabel = outOfPP ? 'No PP' : spell.multiUse ? 'Free' : (onCD ? 'CD:'+effectiveCD : 'CD:'+spell.baseCooldown);
    const freeLabel = isFree ? ' ✦Free' : '';
    const ppLabel = spell.maxPP !== undefined ? '<div class="sb-spell-pp">'+(spell.currentPP||0)+'/'+spell.maxPP+' PP</div>' : '';
    const incLevel = spell.incantationLevel || 1;
    const rarityInfo = (typeof SPELL_RARITY !== 'undefined' && spell.rarity) ? SPELL_RARITY[spell.rarity] : null;
    const rarityColor = rarityInfo && rarityInfo.color ? rarityInfo.color : null;
    const incLabel = incLevel > 1 && rarityColor
      ? `<div style="font-size:.52rem;color:${rarityColor};letter-spacing:.04em;">✦${rarityInfo.label} Lv${incLevel}</div>`
      : (incLevel > 1 ? `<div style="font-size:.52rem;color:#8a6a30;">Lv${incLevel}</div>` : '');
    const _incStat = (typeof incantationStatDisplay === 'function') ? incantationStatDisplay(spell) : null;
    const incStatLabel = _incStat ? `<div style="font-size:.5rem;color:#88aacc;letter-spacing:.03em;">${_incStat}</div>` : '';
    cell.innerHTML =
      '<div class="sb-spell-icon">'+spell.emoji+'</div>' +
      '<div class="sb-spell-name">'+spell.name+rankStr+freeLabel+'</div>' +
      '<div class="sb-spell-cd '+(onCD||outOfPP?'on-cd':'ready')+'">'+cdLabel+'</div>' +
      incLabel +
      incStatLabel +
      ppLabel +
      (alreadyQueued ? '<div class="sb-spell-queued-badge">✓</div>' : '');
    {
      const cdInfo   = spell.baseCooldown > 0 ? `CD: ${spell.baseCooldown} turn${spell.baseCooldown!==1?'s':''}` : 'No cooldown';
      const ppInfo   = spell.maxPP !== undefined ? `PP: ${spell.currentPP||0}/${spell.maxPP}` : '';
      const elemInfo = spell.element ? `[${spell.element}]` : '';
      const rankInfo = rankPct > 100 ? `Rank: +${rankPct-100}% damage` : '';
      const dmgPrev  = _spellDmgPreview(spell);
      const atkLine  = `ATK: ${attackPowerFor('player')}  EFX: ${effectPowerFor('player')}  DEF: ${defenseFor('player')}`;
      const _iRar    = (typeof SPELL_RARITY !== 'undefined' && spell.rarity) ? SPELL_RARITY[spell.rarity] : null;
      const incInfo  = `${_iRar ? _iRar.label : 'Dim'} · Incantation Level ${spell.incantationLevel || 1}`;
      const parts    = [spell.name+' '+elemInfo, spell.desc||'', dmgPrev, cdInfo, ppInfo, rankInfo, incInfo, atkLine].filter(Boolean);
      cell.title = parts.join('\n');
    }
    cell.onclick = ()=>{
      if(!isMyTurn || !canQueue) return;
      const snapTgt=combat.targetIdx;
      const spellRef=spell;
      const spellIdx=player.spellbook.indexOf(spell);
      const snapCD=(!spell.multiUse) ? (adjustedCooldownFor('player',spell.baseCooldown)||1) : 0;
      // Tag as stormRushDependent if it's only queueable due to the CD preview
      const isStormRushDependent = stormRushQueued && rawCD > 0 && effectiveCD === 0;
      const _sSnapTgt = snapTgt; const _sSpellRef = spellRef;
      const opts = {isFree, stormRushDependent: isStormRushDependent,
        isSpellAction: true,
        bookCatalogueId: (activeBook() && activeBook().catalogueId) ? activeBook().catalogueId : null,
        spellObj: spell,
        hintFn: ()=>{
          if(player._mistBlindDamage) return '';
          const preview = _spellDmgPreview(_sSpellRef);
          if(!preview) return '';
          const tgt = combat.enemies[_sSnapTgt];
          const block = tgt ? (tgt.status.block||0) : 0;
          return block > 0 ? `${preview} (−${block} blk)` : preview;
        },
      };
      if(spell.onQueue) opts.onQueue = ()=>spell.onQueue();
      if(spell.undoOnQueue) opts.undoOnQueue = ()=>spell.undoOnQueue();
      if(spell.id === 'storm_rush') opts.stormRushAction = true;
      queueAction(spell.emoji+' '+spell.name,()=>{
        // Set CD and consume PP when the action executes
        if(!spellRef.multiUse) spellRef.currentCD = snapCD;
        if((spellRef.currentPP||0) > 0) spellRef.currentPP--;
        setActiveEnemy(snapTgt);
        const ctx=makeSpellCtx('player','enemy',spellIdx);
        spellRef.execute(ctx);
        // Deep Current: fire Water spell a second time
        if(!combat.over && spellRef.element==='Water' && status.player.deepCurrentActive){
          status.player.deepCurrentActive = false;
          log('💠 Deep Current: '+spellRef.name+' fires again!','player');
          setActiveEnemy(snapTgt);
          const ctx2=makeSpellCtx('player','enemy',spellIdx);
          spellRef.execute(ctx2);
        }
        updateHPBars();renderStatusTags();updateStatsUI();
      }, opts);
      renderSpellButtons();
    };
    grid.appendChild(cell);
  });
}
// ===============================
// GAME OVER SCREEN
