// ===== mapCanvas.js =====
// ─── MAP SCREEN — encounter selection, zone specials, canvas node rendering ───

function showMap(){
  // If all gyms beaten and gauntlet hasn't loaded yet, redirect into gauntlet
  if(gymDefeated && _gauntletBossIdx < GAUNTLET_ROSTER.length){
    setTimeout(_loadGauntletBoss, 400);
    return;
  }

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

  // ── Gold ──
  const goldEl = document.getElementById('map-gold-inline');
  if(goldEl) goldEl.textContent = `💰 ${player.gold}g`;

  // ── Stats strip (ATK / EFX / DEF) ──
  const statsStrip = document.getElementById('map-stats-strip');
  if(statsStrip){
    const atk = player.attackPower || 0;
    const efx = player.effectPower || 0;
    const def = player.defense || 0;
    const chips = [];
    if(atk !== 0) chips.push(`<span class="map-stat-chip" style="color:#e07050;">⚔ <b>${atk>0?'+':''}${atk}</b> ATK</span>`);
    if(efx !== 0) chips.push(`<span class="map-stat-chip" style="color:#8080e0;">✦ <b>${efx>0?'+':''}${efx}</b> EFX</span>`);
    if(def !== 0) chips.push(`<span class="map-stat-chip" style="color:#50a0e0;">🛡 <b>${def>0?'+':''}${def}</b> DEF</span>`);
    statsStrip.innerHTML = chips.length ? chips.join('<span style="color:#2a2040;font-size:.55rem;"> · </span>') : '';
    statsStrip.style.display = chips.length ? 'flex' : 'none';
  }

  // ── Zone pill ──
  const gym = currentGymDef();
  const zonePill = document.getElementById('map-zone-label');
  if(zonePill){
    if(gymDefeated){
      zonePill.textContent = '✦ Champion';
      zonePill.style.borderColor = '#5a4aaa';
      zonePill.style.color = '#9a7aff';
    } else if(gym){
      zonePill.textContent = `Zone ${currentGymIdx + 1} · ${gym.element} · Battle ${zoneBattleCount}`;
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

  // ── Safety: if player is stranded on the gym node (no successors), reset ──
  if(_zoneGraph && _playerNodeId >= 0){
    const _curNode = _zoneGraph.nodes.find(n=>n.id===_playerNodeId);
    if(_curNode && _curNode.type === 'gym'){
      _zoneGraph=null; _playerNodeId=-1; _completedNodeIds=new Set(); _pendingNodeId=-1; _zoneIntroPlayed=false;
      generateZoneGraph();
    }
  }

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
let _znMapTimer   = null;
let _znWizardRaf  = null;
let _znWizardX    = 0;
let _znWizardY    = 0;

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

// ── Node icon styles + per-type animations ─────────────────────────────────────
function _injectNodeIconStyles() {
  if (document.getElementById('node-icon-styles')) return;
  const s = document.createElement('style');
  s.id = 'node-icon-styles';
  s.textContent = `
    @keyframes niFlicker {
      0%,100%{transform:scaleX(1) scaleY(1);opacity:1}
      20%{transform:scaleX(.86) scaleY(1.07);opacity:.82}
      40%{transform:scaleX(1.08) scaleY(.93);opacity:1}
      60%{transform:scaleX(.92) scaleY(1.1);opacity:.88}
      80%{transform:scaleX(1.05) scaleY(.96);opacity:1}
    }
    @keyframes niSpin    { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
    @keyframes niSpinCCW { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
    @keyframes niBob     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
    @keyframes niShake   { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-6deg)} 75%{transform:rotate(6deg)} }
    @keyframes niPulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.72;transform:scale(.93)} }
    @keyframes niGlint   { 0%,72%,100%{filter:none} 78%{filter:drop-shadow(0 0 4px #fff) brightness(1.8)} }
    @keyframes niBounce  { 0%,100%{transform:translateY(0) scaleY(1)} 45%{transform:translateY(-3px) scaleY(1.07)} 65%{transform:translateY(0) scaleY(.94)} }
    @keyframes niFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes niGem     { 0%,100%{filter:none;transform:scale(1)} 50%{filter:drop-shadow(0 0 5px #fff);transform:scale(1.07)} }
    .ni-sword   { animation: niGlint    3.8s ease-in-out infinite; transform-origin:center; }
    .ni-tome    { animation: niPulse    2.8s ease-in-out infinite; transform-origin:center; }
    .ni-scroll  { animation: niFloat    2.2s ease-in-out infinite; }
    .ni-gem     { animation: niGem      2.2s ease-in-out infinite; transform-origin:center; }
    .ni-star    { animation: niSpin     5s linear infinite; transform-origin:center; }
    .ni-arcane  { animation: niSpinCCW  8s linear infinite; transform-origin:center; }
    .ni-crown   { animation: niBob      2.2s ease-in-out infinite; }
    .ni-crossed { animation: niShake    2.6s ease-in-out infinite; transform-origin:center; }
    .ni-flame   { animation: niFlicker  0.9s ease-in-out infinite; transform-origin:center bottom; }
    .ni-bag     { animation: niBounce   1.9s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

// ── Node icon helper — pixel-art SVG icons on a 16×16 grid ────────────────────
function _nodeIcon(type, color, size) {
  size = size || 28;
  _injectNodeIconStyles();
  // c = fill color, d = dim fill opacity, b = bright fill opacity, hi = highlight pixel
  const open = cls => `<svg viewBox="0 0 16 16" width="${size}" height="${size}" class="${cls}" shape-rendering="crispEdges" style="overflow:visible;display:block" xmlns="http://www.w3.org/2000/svg">`;
  const z = `</svg>`;
  const c = color;
  const f  = `fill="${c}"`;
  const fo = (a) => `fill="${c}" fill-opacity="${a}"`;
  const hi = (x,y,w,h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" fill-opacity="0.45"/>`;

  switch (type) {

    case 'sword': return open('ni-sword') +
      // Blade (2px wide, occupies top 9 rows)
      `<rect x="7" y="0" width="2" height="9" ${fo(0.9)}/>` +
      // Crossguard (full width bar at row 4-5)
      `<rect x="1" y="4" width="14" height="2" ${fo(0.9)}/>` +
      // Handle
      `<rect x="7" y="10" width="2" height="4" ${fo(0.55)}/>` +
      // Pommel
      `<rect x="5" y="14" width="6" height="2" ${fo(0.85)}/>` +
      // Blade edge highlight
      hi(7,0,1,4) +
      z;

    case 'tome': return open('ni-tome') +
      // Right page fill
      `<rect x="9" y="1" width="6" height="14" ${fo(0.18)}/>` +
      // Left page fill
      `<rect x="1" y="1" width="6" height="14" ${fo(0.18)}/>` +
      // Spine (bright center bar)
      `<rect x="7" y="1" width="2" height="14" ${fo(0.9)}/>` +
      // Page outlines
      `<rect x="1" y="1" width="6" height="14" fill="none" stroke="${c}" stroke-width="1"/>` +
      `<rect x="9" y="1" width="6" height="14" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Left page rune lines
      `<rect x="2" y="4" width="4" height="1" ${fo(0.8)}/>` +
      `<rect x="2" y="7" width="4" height="1" ${fo(0.8)}/>` +
      `<rect x="2" y="10" width="3" height="1" ${fo(0.8)}/>` +
      // Right page glyph (cross/star shape)
      `<rect x="11" y="5" width="1" height="3" ${fo(0.8)}/>` +
      `<rect x="10" y="6" width="3" height="1" ${fo(0.8)}/>` +
      hi(1,1,1,1) +
      z;

    case 'scroll': return open('ni-scroll') +
      // Scroll body
      `<rect x="3" y="2" width="10" height="12" ${fo(0.22)}/>` +
      `<rect x="3" y="2" width="10" height="12" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Left curl (thick left edge)
      `<rect x="1" y="3" width="3" height="10" ${fo(0.5)}/>` +
      `<rect x="1" y="2" width="3" height="12" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Right implied edge
      `<rect x="12" y="3" width="3" height="10" ${fo(0.3)}/>` +
      // Rune text lines
      `<rect x="5" y="5" width="6" height="1" ${fo(0.85)}/>` +
      `<rect x="5" y="8" width="6" height="1" ${fo(0.85)}/>` +
      `<rect x="5" y="11" width="4" height="1" ${fo(0.85)}/>` +
      hi(1,2,1,1) +
      z;

    case 'gem': return open('ni-gem') +
      // Diamond body fill + outline
      `<polygon points="8,1 15,7 8,15 1,7" ${fo(0.28)}/>` +
      `<polygon points="8,1 15,7 8,15 1,7" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Horizontal facet
      `<rect x="1" y="7" width="14" height="1" ${fo(0.8)}/>` +
      // Upper left facet (stepped pixel diagonal)
      `<rect x="7" y="2" width="1" height="1" ${fo(0.4)}/><rect x="6" y="3" width="1" height="1" ${fo(0.4)}/><rect x="5" y="4" width="1" height="1" ${fo(0.4)}/><rect x="4" y="5" width="1" height="1" ${fo(0.4)}/><rect x="3" y="6" width="1" height="1" ${fo(0.4)}/>` +
      // Upper right facet
      `<rect x="9" y="2" width="1" height="1" ${fo(0.4)}/><rect x="10" y="3" width="1" height="1" ${fo(0.4)}/><rect x="11" y="4" width="1" height="1" ${fo(0.4)}/><rect x="12" y="5" width="1" height="1" ${fo(0.4)}/><rect x="13" y="6" width="1" height="1" ${fo(0.4)}/>` +
      // Highlight corner
      hi(6,3,2,2) +
      z;

    case 'star': return open('ni-star') +
      // 5-pointed star
      `<polygon points="8,1 10,6 15,6 11,9 13,15 8,11 3,15 5,9 1,6 6,6" ${fo(0.35)}/>` +
      `<polygon points="8,1 10,6 15,6 11,9 13,15 8,11 3,15 5,9 1,6 6,6" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Center shine
      hi(7,7,2,2) +
      z;

    case 'arcane': return open('ni-arcane') +
      // 4-pointed star body
      `<polygon points="8,0 9,7 16,8 9,9 8,16 7,9 0,8 7,7" ${fo(0.35)}/>` +
      `<polygon points="8,0 9,7 16,8 9,9 8,16 7,9 0,8 7,7" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Inner square
      `<rect x="6" y="6" width="4" height="4" ${fo(0.4)}/>` +
      hi(7,6,2,2) +
      z;

    case 'crown': return open('ni-crown') +
      // Crown base
      `<rect x="1" y="12" width="14" height="3" ${fo(0.9)}/>` +
      // Crown body between spikes
      `<rect x="1" y="10" width="14" height="2" ${fo(0.6)}/>` +
      // Left spike
      `<rect x="2" y="7" width="3" height="3" ${fo(0.9)}/>` +
      // Center spike (tallest)
      `<rect x="6" y="3" width="4" height="7" ${fo(0.9)}/>` +
      // Right spike
      `<rect x="11" y="7" width="3" height="3" ${fo(0.9)}/>` +
      // Jewels
      hi(7,5,2,2) +
      hi(3,8,1,1) +
      hi(12,8,1,1) +
      z;

    case 'crossed': return open('ni-crossed') +
      // Sword 1: blade NW, handle SE
      `<polygon points="2,2 5,2 14,14 11,14" ${fo(0.85)}/>` +
      // Sword 2: blade NE, handle SW
      `<polygon points="14,2 11,2 2,14 5,14" ${fo(0.85)}/>` +
      // Guard 1 (horizontal, right side near NW blade root)
      `<rect x="8" y="5" width="5" height="2" ${fo(0.9)}/>` +
      // Guard 2 (left side near NE blade root)
      `<rect x="3" y="5" width="5" height="2" ${fo(0.9)}/>` +
      // Blade tip highlights
      hi(2,2,1,2) +
      hi(13,2,1,2) +
      z;

    case 'flame': return open('ni-flame') +
      // Outer flame body
      `<polygon points="8,1 11,5 13,3 11,8 14,7 11,12 8,15 5,12 2,7 5,8 3,3 5,5" ${fo(0.45)}/>` +
      `<polygon points="8,1 11,5 13,3 11,8 14,7 11,12 8,15 5,12 2,7 5,8 3,3 5,5" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Inner flame (brighter)
      `<polygon points="8,5 10,8 9,12 8,14 7,12 6,8" ${fo(0.75)}/>` +
      // Core highlight
      hi(7,8,2,3) +
      // Logs
      `<rect x="3" y="14" width="10" height="2" ${fo(0.7)}/>` +
      `<rect x="5" y="13" width="2" height="1" ${fo(0.5)}/>` +
      `<rect x="9" y="13" width="2" height="1" ${fo(0.5)}/>` +
      z;

    case 'bag': return open('ni-bag') +
      // Bag body
      `<rect x="3" y="8" width="10" height="7" ${fo(0.28)}/>` +
      `<rect x="3" y="8" width="10" height="7" fill="none" stroke="${c}" stroke-width="1"/>` +
      // Bag neck/tie
      `<rect x="5" y="6" width="6" height="2" ${fo(0.65)}/>` +
      // Knot top (triangle)
      `<rect x="6" y="5" width="4" height="1" ${fo(0.5)}/>` +
      `<rect x="7" y="4" width="2" height="1" ${fo(0.5)}/>` +
      // Coin symbol
      `<rect x="6" y="10" width="4" height="3" fill="none" stroke="${c}" stroke-width="1"/>` +
      `<rect x="7" y="11" width="2" height="1" ${fo(0.75)}/>` +
      hi(3,8,1,1) +
      z;

    default: return open('ni-sword') +
      `<rect x="3" y="3" width="10" height="10" ${fo(0.4)}/>` +
      `<rect x="3" y="3" width="10" height="10" fill="none" stroke="${c}" stroke-width="1"/>` +
      z;
  }
}

// ── Encounter cards ────────────────────────────────────────────────────────────
const _MAP_REWARD_CFG = {
  primary_spell: { iconType:'arcane', label:'Starting Spell', color:'#c080ff', sub:'#7050b0', anim:'mapSpellGlow 2.2s ease-in-out infinite' },
  spell:         { iconType:'tome',   label:'Spell Reward',   color:'#a080ff', sub:'#6040a0', anim:'mapSpellGlow 2.8s ease-in-out infinite' },
  incantation:   { iconType:'scroll', label:'Incantation',    color:'#e08030', sub:'#905020', anim:'mapScrollFloat 2.6s ease-in-out infinite' },
  minor:         { iconType:'gem',    label:'Pick Up',        color:'#c8a060', sub:'#887040', anim:'mapPickupFloat 2.6s ease-in-out infinite' },
  major:         { iconType:'star',   label:'Power Up',       color:'#e8d060', sub:'#a08040', anim:'mapPowerPulse 2.2s ease-in-out infinite' },
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
    <div style="line-height:1;animation:${cfg.anim};">${_nodeIcon(cfg.iconType, cfg.color, 48)}</div>
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
  const bHP=gymBossDisplayHP();
  const battlesLeft = GYM_ZONE_FORCE - zoneBattleCount;
  const skipNote=gymSkips>0?` (+${gymSkips*GYM_SKIP_BONUS} skip HP)`:"";
  card.innerHTML=`<div class="enc-left"><div class="enc-name" style="color:${forced?"#cc4444":gym.color}">🏛 Gym ${currentGymIdx+1} — ${gym.name}</div><div class="enc-desc" style="color:${forced?"#7a2a2a":"#888"}">${gym.element} · HP:${bHP}${skipNote} · Dmg:${gymBossDisplayDmg()} · ${forced?"MUST FIGHT NOW":"zone battle "+zoneBattleCount+"/"+GYM_ZONE_FORCE}</div><div style="font-size:.57rem;color:#555;margin-top:2px;">${gym.signature}</div></div><div class="enc-right" style="color:${forced?"#cc4444":gym.color};font-family:'Cinzel',serif;font-size:.62rem;">${forced?"FORCED":"BOSS"}</div>`;
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

const ZN_TIERS    = 15;   // total tiers: tier 1 = start (bottom), tier 15 = gym (top)
const ZN_COLS     = 4;    // max columns (0-3)
const ZN_TIER_H   = 130;  // px per tier (used for canvas height only)
const ZN_PAD      = 40;   // bottom padding in stage
const ZN_SKY_FRAC = 0.13; // fraction of canvas that is sky — nodes stay below this

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
  const noRollTiers = new Set([1, 2, 3, rivalTier, ZN_TIERS-1, ZN_TIERS]);

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

    // Optional diagonal: only adjacent columns (diff ≤ 1) to avoid wild crossings
    if(froms.length > 1 && tos.length > 1 && Math.random() < 0.35){
      const fi = Math.floor(Math.random()*froms.length);
      const ti = Math.floor(Math.random()*tos.length);
      if(Math.abs(froms[fi].col - tos[ti].col) <= 1)
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

// Draw a full-height zone background + cobblestone paths onto the scrollable stage canvas.
// nodePositions: {id -> {x,y}} so paths can be drawn in terrain space.
function _drawZoneBgTall(canvas, W, H, nodePositions, edges){
  const ctx = canvas.getContext('2d');
  if(!ctx) return;

  // Sky fraction matches node positioning so gym always lands in terrain
  const horizY = Math.round(H * ZN_SKY_FRAC);
  const tick   = Date.now() % 100000;

  // Reset shared canvas state so the tall canvas gets a clean draw
  if(typeof _clouds !== 'undefined')        { _clouds.length = 0; }
  if(typeof _lastCloudTick !== 'undefined') { _lastCloudTick = 0; }
  if(typeof _starCache !== 'undefined')     { _starCache = null; }

  // Sky, stars, moon, nebulae, clouds
  if(typeof _drawNightSky === 'function')   _drawNightSky(ctx, W, H, horizY, tick);

  // Zone-specific terrain (mountains, ground, trees, lava/ice/etc.)
  if(typeof _drawTerrain === 'function')    _drawTerrain(ctx, W, H, horizY, tick);

  // Animated details (critters, sparks — static snapshot at tick)
  if(typeof _drawZoneDetails === 'function') _drawZoneDetails(ctx, W, H, horizY, tick);

  // Cobblestone paths between nodes — drawn on top of terrain
  if(nodePositions && edges && typeof _drawCobblestonePath === 'function'){
    for(const [fid, tid] of edges){
      const f = nodePositions[fid], t = nodePositions[tid];
      if(!f || !t) continue;
      // Gentle S-curve control point: perpendicular offset at midpoint
      const mx = (f.x + t.x) * 0.5, my = (f.y + t.y) * 0.5;
      const dx = t.x - f.x, dy = t.y - f.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const perp = Math.min(dist * 0.12, 28);
      // Alternate curve direction using endpoint hash for variety
      const side = ((fid * 7 + tid * 13) % 2 === 0) ? 1 : -1;
      const cpx = mx + (-dy/dist) * perp * side;
      const cpy = my + ( dx/dist) * perp * side;
      _drawCobblestonePath(ctx, f.x, f.y, cpx, cpy, t.x, t.y, 10);
    }
  }
}

function _znColToX(col, w){
  const margin = w * 0.13;
  return margin + (col / (ZN_COLS-1)) * (w - margin*2);
}

function _znTierToY(tier, stageH){
  // Gym (tier ZN_TIERS) sits just inside the terrain; tier 1 near the bottom.
  // Both snap to the same sky fraction as the background art.
  const topY    = Math.round(stageH * ZN_SKY_FRAC) + 30; // just below sky horizon
  const bottomY = stageH - ZN_PAD;
  const frac    = (tier - 1) / (ZN_TIERS - 1); // 0 = tier 1, 1 = gym
  return Math.round(bottomY - frac * (bottomY - topY));
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

  // Background art canvas — lives inside the stage so it scrolls with the map
  let bgC = document.getElementById('zone-bg-canvas');
  if(!bgC){
    bgC = document.createElement('canvas');
    bgC.id = 'zone-bg-canvas';
    bgC.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;image-rendering:pixelated;image-rendering:crisp-edges;';
    stage.insertBefore(bgC, stage.firstChild);
  }
  // Pre-calculate node pixel positions (needed for both bg paths and node divs)
  const {nodes, edges} = _zoneGraph;
  const nodePositions = {};
  for(const n of nodes){
    nodePositions[n.id] = {
      x: _znColToX(n.col, stageW),
      y: _znTierToY(n.tier, stageH),
    };
  }

  // Background + cobblestone paths (drawn together on one canvas)
  bgC.width  = stageW;
  bgC.height = stageH;
  bgC.style.width  = stageW + 'px';
  bgC.style.height = stageH + 'px';
  _drawZoneBgTall(bgC, stageW, stageH, nodePositions, edges);

  // SVG is no longer used for edges — clear it
  svg.innerHTML = '';

  // Clear old node divs
  for(const el of stage.querySelectorAll('.zn-node')) el.remove();

  const nodeMap = {};
  for(const n of nodes) nodeMap[n.id] = n;
  const availIds = _znAvailableIds();
  const gym = currentGymDef();

  // Draw nodes (no emoji wizard — wizard lives on its own animated canvas)
  for(const node of nodes){
    const {x, y} = nodePositions[node.id];
    const cfg = _znNodeCfg(node, gym);

    const el = document.createElement('div');
    el.className = 'zn-node';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';

    const isCurrent = node.id === _playerNodeId;
    const isDone    = _completedNodeIds.has(node.id);
    const isAvail   = availIds.has(node.id);

    if(isCurrent) el.classList.add('zn-current');
    if(isDone)    el.classList.add('zn-done');
    if(isAvail)   el.classList.add('zn-available');

    const circle = document.createElement('div');
    circle.className = 'zn-circle';
    circle.style.borderColor = cfg.color;
    circle.style.setProperty('--zn-glow', cfg.color+'bb');
    circle.innerHTML = _nodeIcon(cfg.iconType, cfg.color);

    if(isDone){
      const chk = document.createElement('div');
      chk.className = 'zn-done-check';
      chk.textContent = '✓';
      circle.appendChild(chk);
    }

    const lbl = document.createElement('div');
    lbl.className = 'zn-label';
    lbl.textContent = cfg.label;

    el.appendChild(circle);
    el.appendChild(lbl);

    if(isAvail) el.onclick = () => _startNodeEncounter(node.id);
    stage.appendChild(el);
  }

  // Wizard canvas — animated pixel sprite above current node
  _znStartWizardAnim(stage, stageW, stageH);

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
    case 'gym':      return {iconType:'crown',   label: gym ? gym.name : 'Gym Leader', color: zoneColor};
    case 'rival':    return {iconType:'crossed', label:'Rival',    color:'#9a6aee'};
    case 'campfire': return {iconType:'flame',   label:'Campfire', color:'#d4822a'};
    case 'shop':     return {iconType:'bag',     label:'Shop',     color:'#2aaa7a'};
    default:{
      const rc = _MAP_REWARD_CFG[node.rewardType];
      return {iconType: rc ? rc.iconType : 'sword', label: rc ? rc.label : 'Battle', color: rc ? rc.color : zoneColor};
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
  _zoneIntroPlayed = true;
  const overlay = document.getElementById('zone-map-overlay');
  if(!overlay) return;

  overlay.scrollTop = 0;
  overlay.style.pointerEvents = 'none';
  overlay.style.overflowY = 'hidden';

  // Banner lives inside the stage so it scrolls with the map
  const stage = document.getElementById('zone-map-stage');
  const gym = currentGymDef();
  const stageH     = ZN_TIERS * ZN_TIER_H + ZN_PAD*2;
  const vh         = overlay.clientHeight || window.innerHeight;

  const banner = document.createElement('div');
  banner.id = 'zn-intro-banner';
  banner.textContent = `Zone ${currentGymIdx + 1}${gym ? ' — ' + gym.element : ''}`;
  // Position at the very top of the stage (gym area), centered
  banner.style.cssText = `position:absolute;top:${Math.round(vh * 0.18)}px;left:0;right:0;
    text-align:center;padding:1.2rem 1rem;z-index:20;
    font-family:'Cinzel',serif;font-size:2rem;letter-spacing:.18em;text-transform:uppercase;
    color:${gym ? gym.color : '#c8a060'};text-shadow:0 0 30px ${gym ? gym.color : '#c8a060'}88;
    background:linear-gradient(to bottom,#000c,#0000);
    pointer-events:none;opacity:0;transition:opacity .5s;`;
  if(stage) stage.appendChild(banner);
  requestAnimationFrame(()=>{ banner.style.opacity = '1'; });

  const playerTier = (_playerNodeId >= 0 && _zoneGraph)
    ? (_zoneGraph.nodes.find(n=>n.id===_playerNodeId)||{tier:1}).tier : 1;
  const playerScroll = Math.max(0, _znTierToY(playerTier, stageH) - vh * 0.55);

  // Hold briefly, then scroll down and fade banner out as scroll completes
  setTimeout(()=>{
    let t0 = null;
    const dur = 5000;
    function step(ts){
      if(!t0) t0 = ts;
      const p = Math.min((ts-t0)/dur, 1);
      overlay.scrollTop = playerScroll * p;
      // Fade banner out in the second half of the scroll
      if(p > 0.5) banner.style.opacity = String(1 - (p - 0.5) * 2);
      if(p < 1){
        requestAnimationFrame(step);
      } else {
        banner.remove();
        overlay.style.pointerEvents = '';
        overlay.style.overflowY = 'auto';
      }
    }
    requestAnimationFrame(step);
  }, 1400);
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
    : _zoneGraph.nodes.find(n=>n.tier===1);
  const toNode = _zoneGraph.nodes.find(n=>n.id===nodeId);
  if(!fromNode || !toNode){ cb(); return; }

  const stageW = overlay.clientWidth || window.innerWidth;
  const stageH = ZN_TIERS * ZN_TIER_H + ZN_PAD*2;

  const x1 = _znColToX(fromNode.col, stageW), y1 = _znTierToY(fromNode.tier, stageH);
  const x2 = _znColToX(toNode.col,   stageW), y2 = _znTierToY(toNode.tier,   stageH);

  // Compute the EXACT same bezier control point used when drawing the cobblestone path
  const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5;
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
  const perp = Math.min(dist * 0.12, 28);
  const side = ((fromNode.id * 7 + toNode.id * 13) % 2 === 0) ? 1 : -1;
  const cpx = mx + (-dy/dist) * perp * side;
  const cpy = my + ( dx/dist) * perp * side;

  // Quadratic bezier sampler — matches the drawn path exactly
  function bezPt(t){
    const mt = 1 - t;
    return {
      x: mt*mt*x1 + 2*mt*t*cpx + t*t*x2,
      y: mt*mt*y1 + 2*mt*t*cpy + t*t*y2,
    };
  }

  // Scroll destination
  const targetScroll = Math.max(0, y2 - overlay.clientHeight * 0.55);
  const startScroll  = overlay.scrollTop;
  const TRAVEL_MS    = 700;
  let t0 = null;

  function ease(p){ return p<0.5?2*p*p:-1+(4-2*p)*p; }

  function step(ts){
    if(!t0) t0 = ts;
    const p = Math.min((ts-t0)/TRAVEL_MS, 1);
    const e = ease(p);
    // Follow the bezier curve so wizard stays on the cobblestone path
    const bp = bezPt(e);
    _znWizardX = bp.x;
    _znWizardY = bp.y - 28;
    overlay.scrollTop = startScroll + (targetScroll - startScroll)*e;
    if(p < 1){
      requestAnimationFrame(step);
    } else {
      cb();
    }
  }
  requestAnimationFrame(step);
}

// ── Wizard sprite canvas (animated pixel player above current/travelling node) ─

function _znStartWizardAnim(stage, W, H){
  let wc = document.getElementById('zone-wizard-canvas');
  if(!wc){
    wc = document.createElement('canvas');
    wc.id = 'zone-wizard-canvas';
    wc.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;image-rendering:pixelated;image-rendering:crisp-edges;';
    stage.appendChild(wc);
  }
  wc.width  = W;
  wc.height = H;
  wc.style.width  = W + 'px';
  wc.style.height = H + 'px';

  // Snap wizard to current node position
  if(_zoneGraph && _playerNodeId >= 0){
    const node = _zoneGraph.nodes.find(n=>n.id===_playerNodeId);
    if(node){
      _znWizardX = _znColToX(node.col, W);
      _znWizardY = _znTierToY(node.tier, H) - 28;
    }
  }

  if(_znWizardRaf) cancelAnimationFrame(_znWizardRaf);
  _znTickWizard();
}

function _znStopWizardAnim(){
  if(_znWizardRaf){ cancelAnimationFrame(_znWizardRaf); _znWizardRaf = null; }
}

function _znTickWizard(){
  const wc = document.getElementById('zone-wizard-canvas');
  if(!wc){ _znWizardRaf = null; return; }
  const W = wc.width, H = wc.height;
  const ctx = wc.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if(typeof _drawMapPlayer === 'function' && (_znWizardX || _znWizardY)){
    _drawMapPlayer(ctx, _znWizardX, _znWizardY, Date.now());
  }
  _znWizardRaf = requestAnimationFrame(_znTickWizard);
}
