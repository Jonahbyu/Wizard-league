// ===== ui.js =====
// ─── UI / RENDERING ───────────────────────────────────────────────────────────
// All DOM render functions. No game logic here.
// renderEnemyCards, renderSpellButtons, updateHPBars, log, showScreen, etc.

function updateStatsUI(){
  // Build lives string: filled hearts for remaining, empty for lost
  const maxDisplay = Math.max(player.revives, 3);
  const heartsStr = '❤'.repeat(player.revives) + '🖤'.repeat(Math.max(0, maxDisplay - player.revives));
  ["map","combat"].forEach(prefix=>{
    const ap=document.getElementById(prefix+"-atk");  if(ap) ap.textContent=player.attackPower;
    const ep=document.getElementById(prefix+"-ep");   if(ep) ep.textContent=player.effectPower;
    const df=document.getElementById(prefix+"-def");  if(df) df.textContent=player.defense;
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

    const passiveName = e.passive
      ? (PASSIVE_CHOICES[primaryElement(e.element||'')]||[]).find(p=>p.id===e.passive)?.title||''
      : '';

    card.innerHTML = `
      <div class="arena-hud-name" style="display:flex;align-items:center;gap:4px;">${elemHatSVG(e.element||'Neutral',14)} <span>${e.name}</span></div>
      <div class="arena-hud-hp-wrap"><div class="arena-hud-hp-fill" style="width:${pct}%;background:${hpColor(pct)}"></div></div>
      <div class="arena-hud-hp-text">${e.hp}/${e.enemyMaxHP}</div>
      <div class="arena-hud-status" id="estatus-${i}"></div>
      ${passiveName ? `<div style="font-size:.42rem;color:#4a3a18;font-family:'Cinzel',serif;">${passiveName}</div>` : ''}
    `;
    hud.appendChild(card);
  });

  // Status tags per enemy
  (combat.enemies||[]).forEach((e, i)=>{
    const row = document.getElementById(`estatus-${i}`);
    if(!row) return;
    const s = e.status;
    if(s.burnStacks>0)       row.appendChild(tag(`🔥${s.burnStacks}`,'tag-burn'));
    if(s.stunned>0)          row.appendChild(tag(`❄${s.stunned}t`,'tag-stun'));
    if(s.rootStacks>0)       row.appendChild(tag(`🌿${s.rootStacks}`,'tag-root'));
    if(s.overgrowthStacks>0) row.appendChild(tag(`🌿G${s.overgrowthStacks}`,'tag-root'));
    if(s.foamStacks>0)       row.appendChild(tag(`🫧${s.foamStacks}`,'tag-block'));
    if(s.shockStacks>0)      row.appendChild(tag(`⚡${s.shockStacks}`,'tag-stun'));
    if(s.block>0)            row.appendChild(tag(`🛡${s.block}`,'tag-block'));
    if(s.phaseTurns>0)       row.appendChild(tag(`🔮`,'tag-phase'));
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

  renderEnemyCards();   // also redraws canvas
  renderSummonsRow();
}

function renderStatusTags(){
  const pr = document.getElementById('player-status-row');
  if(pr){
    pr.innerHTML = '';
    const s = status.player;
    if(s.burnStacks>0)       pr.appendChild(tag(`🔥${s.burnStacks}`,'tag-burn'));
    if(s.stunned>0)          pr.appendChild(tag(`❄${s.stunned}t`,'tag-stun'));
    if(s.rootStacks>0)       pr.appendChild(tag(`🌿${s.rootStacks}`,'tag-root'));
    if(s.overgrowthStacks>0) pr.appendChild(tag(`🌿G${s.overgrowthStacks}`,'tag-root'));
    if(s.foamStacks>0)       pr.appendChild(tag(`🫧${s.foamStacks}`,'tag-block'));
    if(s.shockStacks>0)      pr.appendChild(tag(`⚡${s.shockStacks}`,'tag-stun'));
    if(s.block>0)            pr.appendChild(tag(`🛡${s.block}`,'tag-block'));
    if(s.phaseTurns>0)       pr.appendChild(tag('🔮','tag-phase'));
    // Plasma
    if(playerElement==='Plasma'){
      if(s.stallActive)           pr.appendChild(tag('🫧 Stall','tag-phase'));
      if(s.borrowedCharge>0)      pr.appendChild(tag(`⏳${s.borrowedCharge}debt`,'tag-burn'));
      if(s.plasmaShieldReduction>0) pr.appendChild(tag(`🛡${s.plasmaShieldReduction}%`,'tag-block'));
      if(combat.plasmaOvercharged) pr.appendChild(tag('✦ OC','tag-phase'));
    }
    // Air: Momentum
    if(playerElement==='Air'){
      if((s.momentumStacks||0)>0)   pr.appendChild(tag(`💨${s.momentumStacks}M`,'tag-phase'));
      if(s.windWallActive)           pr.appendChild(tag('🛡️WW','tag-block'));
      if(s.tornadoAoENext)           pr.appendChild(tag('🌪️AoE','tag-phase'));
    }
  }
  renderEnemyCards();
}

function tag(text,cls){ const t=document.createElement("span");t.className="status-tag "+cls;t.textContent=text;return t; }
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
  // Stop any running game over animation
  const goCanvas = document.getElementById('gameover-canvas');
  if(goCanvas && goCanvas._goStop) goCanvas._goStop();
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
  const dmg = Math.round((BASE_DMG + (combat.tempDmgBonus||0) + (player.basicDmgFlat||0)) * (player.basicDmgMult||1.0));
  ctx.hit({ baseDamage: dmg, effects: [], isBasic: true, abilityElement: playerElement });
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
        bookTabBar.appendChild(btn);
      });
    } else if(player.spellbooks && player.spellbooks.length === 1){
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-family:Cinzel,serif;font-size:.6rem;color:#6a4a20;letter-spacing:.06em;';
      lbl.textContent = player.spellbooks[0].name;
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
        pip.title = pdef ? (pdef.title||pdef.name||pid) + ': ' + (pdef.desc||'') : pid;
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
      const basicOnCD = combat.basicCD > 0;
      const basicQueued = (combat.actionQueue||[]).some(a => a.label === '⚔ Basic Attack');
      const basicOutOfPP = (spell.currentPP !== undefined) && spell.currentPP <= 0;
      const cell = document.createElement('button');
      cell.className = 'sb-spell-cell' + (basicOnCD?' on-cd':'') + (basicOutOfPP?' no-pp':'');
      cell.disabled = !isMyTurn || queueFull || basicOnCD || basicQueued || basicOutOfPP;
      const basicDmgEst = Math.max(1, player.attackPower + (player.basicDmgFlat||0));
      const basicPPLabel = spell.maxPP !== undefined ? '<div class="sb-spell-pp">'+(spell.currentPP||0)+'/'+spell.maxPP+' PP</div>' : '';
      cell.innerHTML =
        '<div class="sb-spell-icon">⚔</div>' +
        '<div class="sb-spell-name">Basic Attack</div>' +
        '<div class="sb-spell-cd '+(basicOnCD?'on-cd':'ready')+'">'+
          (basicOutOfPP ? 'No PP' : basicOnCD ? 'CD:'+combat.basicCD : '~'+basicDmgEst+' dmg')+
        '</div>' +
        basicPPLabel +
        (basicQueued ? '<div class="sb-spell-queued-badge">✓</div>' : '');
      const basicSpellRef = spell;
      cell.onclick = ()=>{
        if(!isMyTurn||queueFull||basicOnCD||basicQueued||basicOutOfPP) return;
        const snapTgt=combat.targetIdx;
        const snapCD=adjustedCooldownFor('player',1)||1;
        queueAction('⚔ Basic Attack',()=>{
          combat.basicCD=snapCD;
          if((basicSpellRef.currentPP||0) > 0) basicSpellRef.currentPP--;
          setActiveEnemy(snapTgt);
          const ctx=makeSpellCtx('player','enemy',-1);
          doBasicAttack(ctx);
          updateHPBars();renderStatusTags();updateStatsUI();
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
    cell.innerHTML =
      '<div class="sb-spell-icon">'+spell.emoji+'</div>' +
      '<div class="sb-spell-name">'+spell.name+rankStr+freeLabel+'</div>' +
      '<div class="sb-spell-cd '+(onCD||outOfPP?'on-cd':'ready')+'">'+cdLabel+'</div>' +
      ppLabel +
      (alreadyQueued ? '<div class="sb-spell-queued-badge">✓</div>' : '');
    cell.onclick = ()=>{
      if(!isMyTurn || !canQueue) return;
      const snapTgt=combat.targetIdx;
      const spellRef=spell;
      const spellIdx=player.spellbook.indexOf(spell);
      const snapCD=(!spell.multiUse) ? (adjustedCooldownFor('player',spell.baseCooldown)||1) : 0;
      // Tag as stormRushDependent if it's only queueable due to the CD preview
      const isStormRushDependent = stormRushQueued && rawCD > 0 && effectiveCD === 0;
      const opts = {isFree, stormRushDependent: isStormRushDependent};
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
