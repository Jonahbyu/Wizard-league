// ===== mapCanvas.js =====
// ─── MAP SCREEN — encounter selection, zone specials, canvas node rendering ───

function showMap(){
  const _gymDef = currentGymDef();
  _setZoneElement((_gymDef && _gymDef.element) ? _gymDef.element : playerElement);

  // ── Sandbox zone switcher ──
  const sandboxBar = document.getElementById('sandbox-zone-bar');
  if(sandboxBar){
    if(typeof sandboxMode !== 'undefined' && sandboxMode){
      sandboxBar.style.display = 'flex';
      sandboxBar.innerHTML = '<span style="color:#888;font-size:.6rem;align-self:center;margin-right:4px;">ZONE:</span>';
      (GYM_ROSTER||[]).forEach((gym, i) => {
        const btn = document.createElement('button');
        btn.textContent = gym.emoji + ' ' + gym.element;
        btn.style.cssText = `background:${i===currentGymIdx?gym.color+'33':'#111'};border:1px solid ${i===currentGymIdx?gym.color:'#333'};color:${i===currentGymIdx?gym.color:'#888'};border-radius:4px;padding:2px 7px;font-size:.58rem;font-family:'Cinzel',serif;cursor:pointer;`;
        btn.onclick = () => {
          currentGymIdx = i;
          gymDefeated = false;
          zoneBattleCount = 0;
          _zoneGraph = null; _playerNodeId = -1; _completedNodeIds = new Set(); _pendingNodeId = -1; _zoneIntroPlayed = false;
          _setZoneElement(gym.element);
          showMap();
        };
        sandboxBar.appendChild(btn);
      });
    } else {
      sandboxBar.style.display = 'none';
    }
  }
  // ── HP bar ──
  const pMax = maxHPFor('player');
  const pPct = Math.max(0,(player.hp/pMax)*100);
  document.getElementById('map-player-hp').textContent = `HP ${player.hp}/${pMax}`;
  const bar = document.getElementById('map-hp-bar');
  bar.style.width = pPct+'%'; bar.style.background = hpColor(pPct);

  // ── Lives ──
  const livesEl = document.getElementById('map-lives-inline');
  if(livesEl) livesEl.textContent = '❤'.repeat(Math.max(0,player.revives));

  // ── Zone pill ──
  const gym = currentGymDef();
  const zonePill = document.getElementById('map-zone-label');
  if(zonePill){
    if(gymDefeated){
      zonePill.textContent = '✦ Champion';
      zonePill.style.borderColor = '#5a4aaa';
      zonePill.style.color = '#9a7aff';
    } else if(gym){
      zonePill.textContent = `${gym.element} Zone · Battle ${zoneBattleCount}`;
      zonePill.style.borderColor = gym.color+'55';
      zonePill.style.color = gym.color;
    }
  }

  // ── Gym warning banner (compressed) ──
  const banner = document.getElementById('gym-warning-banner');
  if(gym && !gymDefeated){
    const remaining = GYM_ZONE_FORCE - zoneBattleCount;
    if(gymIsForced()){
      banner.innerHTML = `⚠ ${gym.name} — FORCED FIGHT`;
      banner.style.cssText = 'display:block;background:#1a0a0a;border-color:#6a1a1a;color:#aa4444;border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;';
    } else if(gymShouldAppear() && remaining <= 3){
      banner.innerHTML = `⚠ ${gym.name} — ${remaining} battle${remaining===1?'':'s'} until forced`;
      banner.style.cssText = 'display:block;background:#1a0a0a;border-color:#6a1a1a;color:#aa4444;border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;';
    } else if(gymShouldAppear()){
      banner.innerHTML = `🏛 ${gym.name} is ready`;
      banner.style.cssText = `display:block;background:${gym.color}11;border-color:${gym.color}44;color:${gym.color};border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;`;
    } else {
      banner.style.display = 'none';
    }
  } else if(gymDefeated){
    banner.innerHTML = '✦ All 8 Gym Leaders defeated.';
    banner.style.cssText = 'display:block;background:#0a0820;border-color:#4a3a8a;color:#9a7aff;border-radius:6px;padding:.35rem .7rem;font-size:.65rem;text-align:center;width:100%;max-width:640px;';
  } else {
    banner.style.display = 'none';
  }

  showScreen('map-screen');
  updateStatsUI();

  // ── Advance player after returning from an encounter ──
  if(_pendingNodeId >= 0){
    _playerNodeId = _pendingNodeId;
    _completedNodeIds.add(_pendingNodeId);
    _pendingNodeId = -1;
  }

  // ── Generate zone graph if entering zone for first time ──
  if(!_zoneGraph) generateZoneGraph();

  // ── Background sky/terrain canvas (no interactive nodes) ──
  _buildAndShowCanvas([], []);

  // ── Zone map overlay — debounced so rapid showMap() calls only fire once ──
  if(typeof _znMapTimer !== 'undefined') clearTimeout(_znMapTimer);
  _znMapTimer = setTimeout(()=>{
    drawZoneMap();
    if(!_zoneIntroPlayed){
      _playZoneIntroAnim();
    } else {
      _scrollToPlayer();
    }
  }, 0);
}
let _znMapTimer = null;

// ── Zone special scheduling ────────────────────────────────────────────────
// 2 shops + 2 campfires per zone, in two pairs:
//   Mid pair  — slots 7–10, after the rival window
//   End pair  — slots 11–13, once the gym is showing (guaranteed if gym is skipped)
let _zoneShopMid      = -1;
let _zoneCampfireMid  = -1;
let _zoneShopEnd      = -1;
let _zoneCampfireEnd  = -1;

function initZoneSpecial(){
  // Generate the dynamic reward sequence and rival slot for this zone
  if (typeof initZoneRewardSequence === 'function') initZoneRewardSequence();

  // Mid pair: two consecutive-ish slots in range 7-10
  const midFirst  = 7 + Math.floor(Math.random() * 3);          // 7, 8, or 9
  const midSecond = Math.min(midFirst + 1 + Math.floor(Math.random() * 2), 10); // +1 or +2, cap 10

  // End pair: slots 11-12 or 12-13 (always in the gym-open window)
  const endFirst  = 11 + Math.floor(Math.random() * 2);         // 11 or 12
  const endSecond = endFirst + 1;                                 // always +1

  // Randomly assign shop/campfire within each pair
  if(Math.random() < 0.5){ _zoneCampfireMid = midFirst;  _zoneShopMid     = midSecond; }
  else                    { _zoneShopMid     = midFirst;  _zoneCampfireMid = midSecond; }

  if(Math.random() < 0.5){ _zoneCampfireEnd = endFirst;  _zoneShopEnd     = endSecond; }
  else                    { _zoneShopEnd     = endFirst;  _zoneCampfireEnd = endSecond; }
}

// Returns 'campfire' | 'shop' | null
function _pickZoneSpecial(){
  if(zoneBattleCount === _zoneCampfireMid){
    _zoneCampfireMid = -1;
    if((player._mistCampfireReduction||0) >= 1) return null;
    return 'campfire';
  }
  if(zoneBattleCount === _zoneShopMid){
    _zoneShopMid = -1;
    return 'shop';
  }
  if(zoneBattleCount === _zoneCampfireEnd){
    _zoneCampfireEnd = -1;
    if((player._mistCampfireReduction||0) >= 1) return null;
    return 'campfire';
  }
  if(zoneBattleCount === _zoneShopEnd){
    _zoneShopEnd = -1;
    return 'shop';
  }
  return null;
}

function _buildAndShowCanvas(encounters, specials){
  setTimeout(()=>{
    const canvas = document.getElementById('map-canvas');
    if(!canvas) return;
    const wrap = canvas.parentElement;
    // Fill viewport minus a tiny padding
    canvas.width  = Math.round(wrap.clientWidth  || window.innerWidth);
    canvas.height = Math.round(wrap.clientHeight || window.innerHeight);
    if(canvas.height < 300) canvas.height = Math.round(window.innerHeight);
    const nodes = buildMapNodes(encounters, specials, canvas.width, canvas.height);
    showMapCanvas(nodes);
  }, 0);
}

// ── Encounter cards ────────────────────────────────────────────────────────────
const _MAP_REWARD_CFG = {
  primary_spell: { emoji:'✦',  label:'Starting Spell', color:'#c080ff', sub:'#7050b0', anim:'mapSpellGlow 2.2s ease-in-out infinite' },
  spell:         { emoji:'📜', label:'Spell Reward',   color:'#a080ff', sub:'#6040a0', anim:'mapSpellGlow 2.8s ease-in-out infinite' },
  incantation:   { emoji:'📜', label:'Incantation',    color:'#e08030', sub:'#905020', anim:'mapScrollFloat 2.6s ease-in-out infinite' },
  minor:         { emoji:'💰', label:'Pick Up',        color:'#c8a060', sub:'#887040', anim:'mapPickupFloat 2.6s ease-in-out infinite' },
  major:         { emoji:'⚡', label:'Power Up',       color:'#e8d060', sub:'#a08040', anim:'mapPowerPulse 2.2s ease-in-out infinite' },
};

function _injectMapRewardStyles() {
  if (document.getElementById('map-reward-styles')) return;
  const s = document.createElement('style');
  s.id = 'map-reward-styles';
  s.textContent = `
    @keyframes mapSpellGlow {
      0%,100% { filter:drop-shadow(0 0 6px #8060c0);transform:scale(1); }
      50%     { filter:drop-shadow(0 0 18px #a080ff);transform:scale(1.18); }
    }
    @keyframes mapScrollFloat {
      0%,100% { transform:translateY(0);filter:drop-shadow(0 0 5px #c06010); }
      50%     { transform:translateY(-7px);filter:drop-shadow(0 0 13px #e08020); }
    }
    @keyframes mapPickupFloat {
      0%,100% { transform:translateY(0);filter:drop-shadow(0 0 4px #c89040); }
      50%     { transform:translateY(-7px);filter:drop-shadow(0 0 12px #e8b060); }
    }
    @keyframes mapPowerPulse {
      0%,100% { filter:drop-shadow(0 0 8px #c8a020);transform:scale(1); }
      50%     { filter:drop-shadow(0 0 22px #ffd040);transform:scale(1.20); }
    }
  `;
  document.head.appendChild(s);
}

function makeCombatCard(enc){
  // Special encounter slots (campfire / shop replacing a battle)
  if(enc._isSpecial) return makeSpecialCard(enc._specialType);

  _injectMapRewardStyles();

  const card = document.createElement('div');
  card.className = 'encounter-card';
  card.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.1rem .8rem;gap:.5rem;';

  const nextSlot = zoneBattleCount + 1;
  const rewardType = getZoneRewardType(nextSlot, currentGymIdx);
  const cfg = _MAP_REWARD_CFG[rewardType] || _MAP_REWARD_CFG.minor;

  const gold = enc.isPack
    ? enc.gold
    : (enc.gold || 0);

  card.innerHTML = `
    <div style="font-size:2.2rem;line-height:1;animation:${cfg.anim};">${cfg.emoji}</div>
    <div style="font-family:'Cinzel',serif;font-size:.78rem;color:${cfg.color};letter-spacing:.08em;margin-top:.1rem;">${cfg.label}</div>
    <div style="font-size:.58rem;color:#444;margin-top:.1rem;">⚔ Battle · ${gold}g</div>
  `;

  card.onclick = () => loadBattle(enc);
  return card;
}

function makeGymCard(forced){
  const gym=currentGymDef(); if(!gym) return document.createElement("div");
  const card=document.createElement("div");
  card.className=`special-card ${forced?"card-gym-warn":"card-gym"}`;
  const bHP=gymBossHP();
  const battlesLeft = GYM_ZONE_FORCE - zoneBattleCount;
  const bonus=gymSkips>0?` (+${gymSkips*GYM_SKIP_BONUS} HP from skips)`:"";
  card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:${forced?"#cc4444":gym.color}">🏛 Gym ${currentGymIdx+1} — ${gym.name}</div><div class="enc-desc" style="color:${forced?"#7a2a2a":"#888"}">${gym.element} · HP:${bHP}${bonus} · ${forced?"MUST FIGHT NOW":"zone battle "+zoneBattleCount+"/"+GYM_ZONE_FORCE}</div><div style="font-size:.57rem;color:#555;margin-top:2px;">${gym.signature}</div></div><div class="enc-right" style="color:${forced?"#cc4444":gym.color};font-family:'Cinzel',serif;font-size:.62rem;">${forced?"FORCED":"BOSS"}</div>`;
  card.onclick=()=>showGymIntro(forced);
  return card;
}

function makeSpecialCard(type){
  const card=document.createElement("div"); card.className="special-card";
  if(type==="campfire"){
    card.classList.add("card-campfire");
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:#d4822a">🔥 Campfire</div><div class="enc-desc" style="color:#7a5a2a">Recover 50% HP</div></div><div class="enc-right" style="color:#7a5a2a">REST</div>`;
    card.onclick=()=>enterCampfire();
  } else if(type==="rival"){
    const rHP=rivalHP(), rDmg=rivalDmg();
    card.style.borderColor='#3a1a6a';
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:#9a6aee">🧢 Rival ${RIVAL.name}</div><div class="enc-desc" style="color:#6a4a90">${playerElement} · HP:${rHP} · Dmg:${rDmg}/turn</div><div style="font-size:.57rem;color:#4a3a60;margin-top:2px;">Reward: ✦ Passive Ability</div></div><div class="enc-right" style="color:#9a6aee;font-family:'Cinzel',serif;font-size:.62rem;">RIVAL</div>`;
    card.onclick=()=>showRivalIntro();
  } else {
    card.classList.add("card-shop");
    card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:#2aaa7a">🏪 Shop</div><div class="enc-desc" style="color:#2a6a4a">Spend gold on items</div></div><div class="enc-right" style="color:#2a6a4a">SHOP</div>`;
    card.onclick=()=>enterShop();
  }
  return card;
}

// ===== ZONE MAP GRAPH SYSTEM =====

const ZN_TIERS  = 15;   // total tiers: tier 1 = start (bottom), tier 15 = gym (top)
const ZN_COLS   = 4;    // max columns (0-3)
const ZN_TIER_H = 130;  // px per tier
const ZN_PAD    = 40;   // extra top/bottom padding in stage

// ── Graph generation ──────────────────────────────────────────────────────────

function generateZoneGraph(){
  const gym    = currentGymDef();
  const zoneEl = gym ? gym.element : playerElement;

  // Rival tier
  const rivalTier = (typeof _zoneRivalSlot !== 'undefined' && _zoneRivalSlot > 0)
                    ? Math.min(Math.max(_zoneRivalSlot, 4), ZN_TIERS-2) : 7;

  // Per-node independent campfire/shop chances — max 4 of each per zone.
  // Tracked as we place nodes; each battle-eligible node rolls independently.
  let cfCount = 0, shCount = 0;
  const MAX_CF = 4, MAX_SH = 4;
  // Skip rolls on tier 1 (start), rival tier, pre-gym, gym
  const noRollTiers = new Set([1, rivalTier, ZN_TIERS-1, ZN_TIERS]);

  // Build per-tier column lists (wider branching — 20/35/45 split toward 4 cols)
  const tierColsList = [];
  for(let t = 1; t <= ZN_TIERS; t++){
    let cols;
    if(t === 1)                cols = [1.5];       // start node (centered)
    else if(t === ZN_TIERS)    cols = [1.5];       // gym node (centered)
    else if(t === ZN_TIERS-1)  cols = [0,2];       // pre-gym funnel
    else if(t === rivalTier-1) cols = [1,2];       // funnel toward middle before rival
    else if(t === rivalTier)   cols = [1,3];       // rival col1 (middle), battle col3
    else if(t <= 2)            cols = [0,2];
    else if(t <= 4)            cols = [0,1,2];
    else {
      // 20% 2-wide, 35% 3-wide, 45% 4-wide
      const r = Math.random();
      if(r < 0.20)      cols = [0,3];
      else if(r < 0.55) cols = [0,1,3];
      else              cols = [0,1,2,3];
    }
    tierColsList.push(cols);
  }

  // Create nodes
  const nodes = [];
  const tierNodes = Array.from({length: ZN_TIERS+1}, ()=>[]); // 1-indexed
  let nextId = 0;

  for(let t = 1; t <= ZN_TIERS; t++){
    const cols = tierColsList[t-1];
    for(let ci = 0; ci < cols.length; ci++){
      const col = cols[ci];
      // Determine node type
      let type = 'battle';
      if(t === ZN_TIERS){
        type = 'gym';
      } else if(t === rivalTier && ci === 0 && !_zoneRivalDefeated){
        type = 'rival';
      } else if(!noRollTiers.has(t)){
        // Independent per-node roll for campfire/shop
        const roll = Math.random();
        if(cfCount < MAX_CF && roll < 0.14){
          if((player._mistCampfireReduction||0) < 1){ type = 'campfire'; cfCount++; }
        } else if(shCount < MAX_SH && roll >= 0.14 && roll < 0.27){
          type = 'shop'; shCount++;
        }
      }

      // Reward type and enc for battle nodes
      // Use tier as the slot (mirrors old system: each screen = one slot with two encounters)
      let rewardType = null, enc = null;
      if(type === 'battle'){
        rewardType = getZoneRewardType(t, currentGymIdx, ci);
        if(rewardType === 'primary_spell') rewardType = 'spell';
        enc = _pickZoneGraphEnc(zoneEl);
        enc._rewardType = rewardType;
      }

      const node = {id: nextId++, tier: t, col, type, rewardType, enc};
      nodes.push(node);
      tierNodes[t].push(node);
    }
  }

  // Build edges: closest-col matching + ensure all nodes fully connected
  const edges = [];
  function addEdge(a, b){
    if(!edges.some(e=>e[0]===a&&e[1]===b)) edges.push([a,b]);
  }

  for(let t = 1; t < ZN_TIERS; t++){
    const froms = [...tierNodes[t]].sort((a,b)=>a.col-b.col);
    const tos   = [...tierNodes[t+1]].sort((a,b)=>a.col-b.col);
    const toHit = new Set();

    // Each from → closest to
    for(const fn of froms){
      let best = tos[0];
      for(const tn of tos) if(Math.abs(tn.col-fn.col) < Math.abs(best.col-fn.col)) best = tn;
      addEdge(fn.id, best.id);
      toHit.add(best.id);
    }

    // Ensure every to node is reachable
    for(const tn of tos){
      if(!toHit.has(tn.id)){
        let best = froms[0];
        for(const fn of froms) if(Math.abs(fn.col-tn.col) < Math.abs(best.col-tn.col)) best = fn;
        addEdge(best.id, tn.id);
        toHit.add(tn.id);
      }
    }

    // 35% chance: add one diagonal cross-path for variety
    if(froms.length > 1 && tos.length > 1 && Math.random() < 0.35){
      const fi = Math.floor(Math.random()*froms.length);
      const ti = Math.floor(Math.random()*tos.length);
      addEdge(froms[fi].id, tos[ti].id);
    }
  }

  _zoneGraph = {nodes, edges};

  // Zone 1: the tier-1 battle was the starting spell choice — already done before the map.
  // Mark it complete so the player lands on it and picks from tier 2 immediately.
  if(currentGymIdx === 0){
    const startNode = nodes.find(n => n.tier === 1);
    if(startNode){
      _playerNodeId = startNode.id;
      _completedNodeIds.add(startNode.id);
    }
  }
}

function _pickZoneGraphEnc(zoneEl){
  const zoneSingles  = ENCOUNTER_POOL.filter(e=>e.campType===zoneEl);
  const crossSingles = ENCOUNTER_POOL.filter(e=>e.campType!==zoneEl);
  const zonePacks    = PACK_POOL.filter(p=>p.element===zoneEl);
  const pool = zoneSingles.length ? zoneSingles : ENCOUNTER_POOL;
  if(zonePacks.length && Math.random()<0.2)
    return {...zonePacks[Math.floor(Math.random()*zonePacks.length)]};
  if(crossSingles.length && Math.random()<0.35)
    return {...crossSingles[Math.floor(Math.random()*crossSingles.length)]};
  return {...pool[Math.floor(Math.random()*pool.length)]};
}

// ── Zone map rendering ────────────────────────────────────────────────────────

function _znColToX(col, w){
  const margin = w * 0.13;
  return margin + (col / (ZN_COLS-1)) * (w - margin*2);
}

function _znTierToY(tier, stageH){
  // tier 1 at bottom, tier ZN_TIERS at top
  return stageH - ZN_PAD - (tier - 0.5) * ZN_TIER_H;
}

function drawZoneMap(){
  const overlay = document.getElementById('zone-map-overlay');
  const stage   = document.getElementById('zone-map-stage');
  const svg     = document.getElementById('zone-map-svg');
  if(!overlay || !stage || !svg || !_zoneGraph) return;

  const stageW  = overlay.clientWidth || window.innerWidth;
  const stageH  = ZN_TIERS * ZN_TIER_H + ZN_PAD*2;
  stage.style.width  = stageW + 'px';
  stage.style.height = stageH + 'px';
  svg.setAttribute('viewBox', `0 0 ${stageW} ${stageH}`);
  svg.setAttribute('width',  stageW);
  svg.setAttribute('height', stageH);

  // Clear previous render
  for(const el of stage.querySelectorAll('.zn-node')) el.remove();
  svg.innerHTML = '';

  const {nodes, edges} = _zoneGraph;
  const nodeMap = {};
  for(const n of nodes) nodeMap[n.id] = n;

  const availIds = _znAvailableIds();
  const gym = currentGymDef();

  // Draw edges
  for(const [fid, tid] of edges){
    const fn = nodeMap[fid], tn = nodeMap[tid];
    if(!fn || !tn) continue;
    const x1 = _znColToX(fn.col, stageW), y1 = _znTierToY(fn.tier, stageH);
    const x2 = _znColToX(tn.col, stageW), y2 = _znTierToY(tn.tier, stageH);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    const isDone   = _completedNodeIds.has(fid) && (_completedNodeIds.has(tid) || tid === _playerNodeId);
    const isActive = _completedNodeIds.has(fid) && availIds.has(tid);
    line.setAttribute('x1',x1); line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    line.setAttribute('stroke', isDone ? '#2a1a5a' : isActive ? '#6a40cc' : '#1c1230');
    line.setAttribute('stroke-width', isActive ? 2.5 : 1.5);
    line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);
  }

  // Draw nodes
  for(const node of nodes){
    const x = _znColToX(node.col, stageW);
    const y = _znTierToY(node.tier, stageH);
    const cfg = _znNodeCfg(node, gym);

    const el = document.createElement('div');
    el.className = 'zn-node';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';

    const isCurrent   = node.id === _playerNodeId;
    const isDone      = _completedNodeIds.has(node.id);
    const isAvail     = availIds.has(node.id);

    if(isCurrent) el.classList.add('zn-current');
    if(isDone)    el.classList.add('zn-done');
    if(isAvail)   el.classList.add('zn-available');

    const circle = document.createElement('div');
    circle.className = 'zn-circle';
    circle.style.borderColor = cfg.color;
    circle.style.setProperty('--zn-glow', cfg.color+'bb');
    circle.textContent = cfg.emoji;

    if(isDone){
      const chk = document.createElement('div');
      chk.className = 'zn-done-check';
      chk.textContent = '✓';
      circle.appendChild(chk);
    }
    if(isCurrent){
      const sprite = document.createElement('div');
      sprite.className = 'zn-player-sprite';
      sprite.textContent = '🧙';
      circle.appendChild(sprite);
    }

    const lbl = document.createElement('div');
    lbl.className = 'zn-label';
    lbl.textContent = cfg.label;

    el.appendChild(circle);
    el.appendChild(lbl);

    if(isAvail) el.onclick = () => _startNodeEncounter(node.id);

    stage.appendChild(el);
  }

  // Zone label at the bottom of the stage
  let zoneLbl = stage.querySelector('.zn-zone-label');
  if(!zoneLbl){
    zoneLbl = document.createElement('div');
    zoneLbl.className = 'zn-zone-label';
    stage.appendChild(zoneLbl);
  }
  const gymDef = currentGymDef();
  zoneLbl.textContent = gymDef ? `Zone ${currentGymIdx+1} — ${gymDef.element}` : 'Zone Start';
  zoneLbl.style.cssText = `position:absolute;bottom:6px;left:50%;transform:translateX(-50%);
    font-family:'Cinzel',serif;font-size:.62rem;letter-spacing:.13em;text-transform:uppercase;
    color:${gymDef ? gymDef.color : '#c8a060'}88;text-shadow:0 1px 6px #000;pointer-events:none;white-space:nowrap;`;

  overlay.style.display = 'block';
  // Hide old canvas hint text
  const hint = document.getElementById('map-hint');
  if(hint) hint.style.display = 'none';
}

function _znNodeCfg(node, gym){
  const zoneColor = gym ? gym.color : '#7060b0';
  switch(node.type){
    case 'gym':      return {emoji: gym && gym.emoji ? gym.emoji : '🏛', label: gym ? gym.name : 'Gym Leader', color: zoneColor};
    case 'rival':    return {emoji:'🧢', label:'Rival', color:'#9a6aee'};
    case 'campfire': return {emoji:'🔥', label:'Campfire', color:'#d4822a'};
    case 'shop':     return {emoji:'🏪', label:'Shop', color:'#2aaa7a'};
    default:{
      const rc = _MAP_REWARD_CFG[node.rewardType];
      return {emoji: rc ? rc.emoji : '⚔', label: rc ? rc.label : 'Battle', color: rc ? rc.color : zoneColor};
    }
  }
}

function _znAvailableIds(){
  const s = new Set();
  if(!_zoneGraph) return s;
  if(_playerNodeId === -1){
    // Zone just started: tier-1 nodes are available
    for(const n of _zoneGraph.nodes) if(n.tier===1) s.add(n.id);
    return s;
  }
  for(const [fid, tid] of _zoneGraph.edges){
    if(fid === _playerNodeId && !_completedNodeIds.has(tid)) s.add(tid);
  }
  return s;
}

function _scrollToPlayer(){
  const overlay = document.getElementById('zone-map-overlay');
  if(!overlay || !_zoneGraph) return;
  const stageH = ZN_TIERS * ZN_TIER_H + ZN_PAD*2;
  let tier = 1;
  if(_playerNodeId >= 0){
    const node = _zoneGraph.nodes.find(n=>n.id===_playerNodeId);
    if(node) tier = node.tier;
  }
  const nodeY = _znTierToY(tier, stageH);
  overlay.scrollTop = Math.max(0, nodeY - overlay.clientHeight * 0.55);
}

function _playZoneIntroAnim(){
  _zoneIntroPlayed = true; // set immediately so re-entrant showMap() calls don't restart
  const overlay = document.getElementById('zone-map-overlay');
  if(!overlay){ return; }

  const stageH = ZN_TIERS * ZN_TIER_H + ZN_PAD*2;
  // Start view at bottom (tier 1 visible)
  const startScroll = Math.max(0, _znTierToY(1, stageH) - overlay.clientHeight*0.5);
  // Gym is near top
  const gymScroll = Math.max(0, _znTierToY(ZN_TIERS, stageH) - overlay.clientHeight*0.5);
  // Player position
  const playerTier = (_playerNodeId >= 0 && _zoneGraph)
    ? (_zoneGraph.nodes.find(n=>n.id===_playerNodeId)||{tier:1}).tier : 1;
  const playerScroll = Math.max(0, _znTierToY(playerTier, stageH) - overlay.clientHeight*0.55);

  overlay.scrollTop = startScroll;
  overlay.style.pointerEvents = 'none';
  overlay.style.overflowY = 'hidden'; // lock user scroll during animation

  function ease(p){ return p<0.5?2*p*p:-1+(4-2*p)*p; }

  function animScroll(from, to, dur, cb){
    let t0 = null;
    function step(ts){
      if(!t0) t0 = ts;
      const p = Math.min((ts-t0)/dur, 1);
      overlay.scrollTop = from + (to-from)*ease(p);
      if(p < 1) requestAnimationFrame(step); else cb();
    }
    requestAnimationFrame(step);
  }

  // 1. Pan to gym over 5s
  animScroll(startScroll, gymScroll, 5000, ()=>{
    // 2. Pause 2s at gym
    setTimeout(()=>{
      // 3. Pan back to player over 3.5s
      animScroll(gymScroll, playerScroll, 3500, ()=>{
        overlay.style.pointerEvents = '';
        overlay.style.overflowY = 'auto'; // restore scroll
      });
    }, 700);
  });
}

function _startNodeEncounter(nodeId){
  const node = _zoneGraph && _zoneGraph.nodes.find(n=>n.id===nodeId);
  if(!node) return;

  // Disable all node clicks while travelling
  const overlay = document.getElementById('zone-map-overlay');
  if(overlay) overlay.style.pointerEvents = 'none';

  _animTravelToNode(nodeId, ()=>{
    _pendingNodeId = nodeId;
    if(overlay) overlay.style.pointerEvents = '';
    switch(node.type){
      case 'battle':   loadBattle(node.enc);         break;
      case 'campfire': enterCampfire();               break;
      case 'shop':     enterShop();                   break;
      case 'rival':    showRivalIntro();              break;
      case 'gym':      showGymIntro(gymIsForced());   break;
    }
  });
}

function _animTravelToNode(nodeId, cb){
  const overlay = document.getElementById('zone-map-overlay');
  const stage   = document.getElementById('zone-map-stage');
  if(!overlay || !stage || !_zoneGraph){ cb(); return; }

  const fromNode = _playerNodeId >= 0
    ? _zoneGraph.nodes.find(n=>n.id===_playerNodeId)
    : _zoneGraph.nodes.find(n=>n.tier===1); // fallback to tier-1 node for very first move
  const toNode = _zoneGraph.nodes.find(n=>n.id===nodeId);
  if(!fromNode || !toNode){ cb(); return; }

  const stageW = overlay.clientWidth || window.innerWidth;
  const stageH = ZN_TIERS * ZN_TIER_H + ZN_PAD*2;

  const x1 = _znColToX(fromNode.col, stageW), y1 = _znTierToY(fromNode.tier, stageH);
  const x2 = _znColToX(toNode.col,   stageW), y2 = _znTierToY(toNode.tier,   stageH);

  // Create traveller dot
  const dot = document.createElement('div');
  dot.style.cssText = `position:absolute;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 0 10px #fff,0 0 20px #a080ff;
    transform:translate(-50%,-50%);pointer-events:none;z-index:20;
    left:${x1}px;top:${y1}px;`;
  stage.appendChild(dot);

  // Scroll to destination during travel
  const targetScroll = Math.max(0, y2 - overlay.clientHeight * 0.55);
  const startScroll  = overlay.scrollTop;
  const TRAVEL_MS    = 550;
  let t0 = null;

  function ease(p){ return p<0.5?2*p*p:-1+(4-2*p)*p; }

  function step(ts){
    if(!t0) t0 = ts;
    const p = Math.min((ts-t0)/TRAVEL_MS, 1);
    const e = ease(p);
    dot.style.left = (x1 + (x2-x1)*e) + 'px';
    dot.style.top  = (y1 + (y2-y1)*e) + 'px';
    overlay.scrollTop = startScroll + (targetScroll - startScroll)*e;
    if(p < 1){
      requestAnimationFrame(step);
    } else {
      dot.remove();
      cb();
    }
  }
  requestAnimationFrame(step);
}
