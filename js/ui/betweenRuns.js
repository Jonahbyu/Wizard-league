// ===== betweenRuns.js =====
// ─── BETWEEN-RUNS LOBBY — last run summary, history, wizard/book/talent tabs ──

function showBetweenRuns() {
  stopLobbyMap();
  showScreen('between-runs-screen');
  const slotData = getActiveSlotData ? getActiveSlotData() : {};
  if (slotData.wizardBuild && typeof _wizBuild !== 'undefined') {
    _wizBuild = Object.assign({...WIZ_DEFAULTS}, slotData.wizardBuild);
  }
  setTimeout(showBetweenRuns_map, 50);
}

function lobbyStartRun() {
  stopLobbyMap();
  const slotData = getActiveSlotData();
  if (slotData.wizardBuild && typeof _wizBuild !== 'undefined') {
    _wizBuild = Object.assign({...WIZ_DEFAULTS}, slotData.wizardBuild);
  }
  playerCharId = _wizBuild.archetype || slotData.savedCharId || 'arcanist';
  const welcomeEl = document.getElementById('welcome-msg');
  if (welcomeEl) welcomeEl.textContent = `${playerName}, choose your element`;
  showScreen('mode-select-screen');
}

function renderBrunLastRun() {
  const el = document.getElementById('brun-last-run');
  if (!el) return;
  const meta = getMeta();
  const phosEarned = _lastRunPhos || 0;
  // No run in progress yet — show lobby welcome
  if (!playerElement) {
    el.innerHTML = '<div class="brun-run-title" style="color:#c8a060;font-size:1rem;">&#9876; Wizard&#39;s League</div><div style="color:#555;font-size:.7rem;margin-top:.3rem;">Select New Run to begin your journey</div>';
    return;
  }
  const zoneStr = _runZoneReached && _runZoneReached !== playerElement ? ` → ${_runZoneReached} Zone` : '';
  el.innerHTML = `
    <div class="brun-run-title">${playerEmoji} ${playerElement}${zoneStr} — Run Ended</div>
    <div class="brun-run-grid">
      <div class="brun-run-stat"><div class="brun-run-label">Rooms</div><div class="brun-run-val">${_runRoomsCompleted}</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">⚔ Dealt</div><div class="brun-run-val" style="color:#e84a4a">${_runDmgDealt}</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">🛡 Taken</div><div class="brun-run-val" style="color:#4a8aaa">${_runDmgTaken}</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">Gold</div><div class="brun-run-val" style="color:#c8a830">${player.gold}g</div></div>
      <div class="brun-run-stat"><div class="brun-run-label">Phos</div><div class="brun-run-val" style="color:#a080ff">+${phosEarned} ✦</div></div>
    </div>
    <div style="margin-top:.5rem;font-size:.65rem;color:#5a4a80;">Total Phos: <span style="color:#a080ff;font-family:'Cinzel',serif;">${meta.phos||0} ✦</span></div>`;
}

let _lastRunPhos = 0; // set in showGameOver path

function switchBrunTab(tab, btnEl) {
  document.querySelectorAll('.brun-tab').forEach(b => b.classList.remove('active'));
  const btn = btnEl || document.querySelector(`.brun-tab[onclick*="${tab}"]`);
  if (btn) btn.classList.add('active');

  const content = document.getElementById('brun-tab-content');
  if (!content) return;
  const meta = getMeta();

  if (tab === 'history') {
    const history = meta.runHistory || [];
    if (!history.length) {
      content.innerHTML = '<div class="brun-empty">No runs recorded yet.</div>';
      return;
    }
    content.innerHTML = history.map(r => `
      <div class="brun-hist-row">
        <div class="brun-hist-el">${r.emoji||'⚔'} ${r.element||'?'} <span style="color:#4a6a8a;font-size:.6rem;margin-left:.3rem;">${r.zone && r.zone !== r.element ? '→ '+r.zone+' Zone' : ''}</span></div>
        <div class="brun-hist-stats">
          <span>${r.battles||0} battles</span>
          <span>${r.rooms||r.battles||0} rooms</span>
          <span style="color:#c8a830">${r.gold||0}g</span>
          <span style="color:#a080ff">${r.phos||0}✦</span>
        </div>
        <div class="brun-hist-details" style="display:flex;gap:.8rem;font-size:.6rem;color:#555;margin-top:.2rem;">
          <span>⚔ ${r.dmgDealt||0} dealt</span>
          <span>🛡 ${r.dmgTaken||0} taken</span>
          <span>📚 ${r.spells||0} spells</span>
        </div>
        <div class="brun-hist-date">${r.date||''}</div>
      </div>`).join('');

  } else if (tab === 'artifacts') {
    markArtifactsSeen();
    if (!meta.artifacts || !meta.artifacts.length) {
      content.innerHTML = '<div class="brun-empty">No artifacts yet — defeat a Gym Leader to have a chance at one!</div>';
      return;
    }
    const activeId = meta.activeArtifactId || null;
    const header = `<div style="font-size:.62rem;color:#4a3820;text-align:center;margin-bottom:.8rem;line-height:1.5;">Equip one artifact per run. It scales with use — earning stars after 25 battles.</div>`;
    const rows = meta.artifacts.map(a => {
      const def = (typeof ARTIFACT_CATALOGUE !== 'undefined') ? ARTIFACT_CATALOGUE[a.id] : null;
      if (!def) return '';
      const isActive = a.id === activeId;
      const stars  = a.star > 0 ? '★'.repeat(a.star) : '—';
      const sColor = ['#888','#c8a030','#e8d060','#00ccff'][Math.min(a.star||0, 3)];
      const prog   = a.star < 3 ? `${a.roomsUsed||0}/25 rooms` : 'MAX';
      const equipBtn = isActive
        ? `<button onclick="unequipArtifact();switchBrunTab('artifacts')" style="background:#1a1205;border:1px solid #5a4020;color:#8a6030;font-family:'Cinzel',serif;font-size:.55rem;padding:.25rem .6rem;border-radius:3px;cursor:pointer;">Unequip</button>`
        : `<button onclick="equipArtifact('${a.id}');switchBrunTab('artifacts')" style="background:#1a1205;border:1px solid #8a6020;color:#c8a060;font-family:'Cinzel',serif;font-size:.55rem;padding:.25rem .6rem;border-radius:3px;cursor:pointer;">Equip</button>`;
      return `<div class="brun-art-row" style="border-color:${isActive?'#8a6020':'#1a1a14'};background:${isActive?'#1a1205':'#0f0d0b'};">
        <div style="flex:1;">
          <div class="brun-art-name">${def.emoji} ${def.name} <span class="brun-art-star" style="color:${sColor}">${stars}</span>${isActive?'<span style="color:#c8a060;font-size:.55rem;margin-left:.4rem;font-family:Cinzel,serif;"> ✦ ACTIVE</span>':''}</div>
          <div class="brun-art-desc">${def.desc[a.star||0]} · <span style="color:#4a4a4a">${prog}</span></div>
        </div>
        <div>${equipBtn}</div>
      </div>`;
    }).join('');
    content.innerHTML = header + (rows || '<div class="brun-empty">No artifacts.</div>');

  } else if (tab === 'talents') {
    renderTalentTab(content, meta);
  } else if (tab === 'books') {
    renderBookUpgradesTab(content, meta);
  }
}

function _bookSlotPips(current, max) {
  let s = '';
  for (let i = 0; i < max; i++) {
    const f = i < current;
    s += `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:2px;background:${f?'#a0c060':'#252520'};border:1px solid ${f?'#6a8a30':'#3a3030'};"></span>`;
  }
  return s;
}

function _bookSlotRow(label, current, max, extra, maxExtra, costFn, bookKey, type, phos) {
  const maxed = extra >= maxExtra;
  const cost = maxed ? 0 : costFn(extra);
  const canAfford = phos >= cost;
  return `<div style="margin-top:.4rem;">
    <div style="display:flex;align-items:center;gap:.35rem;margin-bottom:.18rem;">
      <span style="font-size:.56rem;color:#5a5a6a;text-transform:uppercase;letter-spacing:.07em;">${label}:</span>
      ${_bookSlotPips(current, max)}
      <span style="font-size:.56rem;color:#7a8a5a;">${current}/${max}</span>
    </div>
    ${maxed
      ? `<div style="font-size:.56rem;color:#4a8a4a;">✓ Full</div>`
      : `<button onclick="purchaseBookSlotUpgrade('${bookKey}','${type}')" ${canAfford?'':'disabled'}
           style="width:100%;background:${canAfford?'#0a140a':'#0a0a0a'};border:1px solid ${canAfford?'#4a6a20':'#1a1a1a'};
           color:${canAfford?'#90b050':'#2a3010'};padding:.22rem .4rem;font-family:'Cinzel',serif;font-size:.57rem;
           letter-spacing:.07em;cursor:${canAfford?'pointer':'not-allowed'};border-radius:4px;text-transform:uppercase;">
           +1 ${label} — ${cost} ✦</button>`}
  </div>`;
}

function renderBookUpgradesTab(content, meta) {
  const phos = meta.phos || 0;
  const ownedBookIds = meta.ownedBookIds || [];
  const bookUpgradeLevels = meta.bookUpgradeLevels || {};
  const bookSlotUpgrades  = meta.bookSlotUpgrades  || {};

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem;">
    <div style="font-family:'Cinzel',serif;font-size:.78rem;color:#c8a060;">📖 Spellbooks</div>
    <div style="font-size:.72rem;color:#a080ff;">${phos} ✦ Phos</div>
  </div>`;

  if (typeof SPELLBOOK_CATALOGUE === 'undefined') { content.innerHTML = html; return; }

  // ── Owned catalogue books ─────────────────────────────────────────────────
  if (ownedBookIds.length === 0) {
    html += `<div style="font-size:.65rem;color:#3a3a4a;font-style:italic;padding:.5rem 0;">No spellbooks discovered yet. Beat bosses during runs to find books!</div>`;
  } else {
    ownedBookIds.forEach(bookId => {
      const cat = SPELLBOOK_CATALOGUE[bookId];
      if (!cat) return;
      const lvl     = bookUpgradeLevels[bookId] || 0;
      const maxLvl  = 4;
      const maxedEff = lvl >= maxLvl;
      const upgCost  = maxedEff ? 0 : (cat.upgradeCosts || [])[lvl] || 0;
      const canAffordEff = phos >= upgCost;
      const rarityColor = cat.rarity === 'legendary' ? '#d4a0ff' : cat.rarity === 'generic' ? '#80c8ff' : '#c8a060';
      const rarityLabel = cat.rarity === 'legendary' ? '✦ Legendary' : cat.rarity === 'generic' ? '⚡ Generic' : `${cat.element || ''} Book`;
      const perBook      = bookSlotUpgrades[bookId] || {};
      const extraSpell   = perBook.spellSlots   || 0;
      const extraPassive = perBook.passiveSlots  || 0;
      const baseSpell    = BOOK_SPELL_SLOTS_BASE   + (cat.spellSlots   || 0);
      const basePasv     = BOOK_PASSIVE_SLOTS_BASE + (cat.passiveSlots || 0);
      html += `<div style="background:#0f0d0b;border:1px solid #2a2020;border-radius:6px;padding:.65rem .85rem;margin-bottom:.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.15rem;">
          <div style="font-family:'Cinzel',serif;font-size:.74rem;color:${rarityColor};">${cat.emoji} ${cat.name}</div>
          <div style="font-size:.56rem;color:#5a5a5a;">${rarityLabel} · Lv ${lvl}/${maxLvl}</div>
        </div>
        <div style="font-size:.6rem;color:#888;margin-bottom:.1rem;">${cat.desc}</div>
        <div style="font-size:.57rem;color:#7a4a30;margin-bottom:.3rem;">⚠ ${cat.negative}</div>
        <div style="font-size:.6rem;color:#7a8a5a;padding:.3rem 0;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;margin-bottom:.3rem;">
          ${cat.levelDescs ? cat.levelDescs[lvl] : ''}
        </div>
        ${maxedEff
          ? `<div style="font-size:.6rem;color:#4a8a4a;margin-bottom:.3rem;">✓ Effect Maxed</div>`
          : `<button onclick="purchaseCatalogueBookUpgrade('${bookId}')" ${canAffordEff?'':'disabled'}
               style="width:100%;background:${canAffordEff?'#0a1a0a':'#0a0a0a'};border:1px solid ${canAffordEff?'#5a7a20':'#2a2020'};
               color:${canAffordEff?'#a0c060':'#3a4020'};padding:.25rem;font-family:'Cinzel',serif;font-size:.6rem;
               letter-spacing:.08em;cursor:${canAffordEff?'pointer':'not-allowed'};border-radius:4px;text-transform:uppercase;margin-bottom:.3rem;">
               Upgrade Effect Lv${lvl}→${lvl+1} — ${upgCost} ✦</button>`}
        <div style="border-top:1px solid #1a1818;padding-top:.3rem;">
          ${_bookSlotRow('Spell Slots', baseSpell+extraSpell, baseSpell+BOOK_SLOT_MAX_SPELL, extraSpell, BOOK_SLOT_MAX_SPELL, _spellSlotCost, bookId, 'spellSlots', phos)}
          ${_bookSlotRow('Passive Slots', basePasv+extraPassive, basePasv+BOOK_SLOT_MAX_PASSIVE, extraPassive, BOOK_SLOT_MAX_PASSIVE, _passiveSlotCost, bookId, 'passiveSlots', phos)}
        </div>
      </div>`;
    });
  }

  // ── Default Book ──────────────────────────────────────────────────────────
  html += `<div style="font-size:.62rem;color:#4a4a60;margin:.5rem 0 .4rem;letter-spacing:.08em;text-transform:uppercase;">Default Spellbook</div>`;
  const defBook      = bookSlotUpgrades['default'] || {};
  const defExtraSpell   = defBook.spellSlots   || 0;
  const defExtraPassive = defBook.passiveSlots  || 0;
  html += `<div style="background:#0f0d0b;border:1px solid #2a2020;border-radius:6px;padding:.65rem .85rem;margin-bottom:.5rem;">
    <div style="font-family:'Cinzel',serif;font-size:.74rem;color:#a08060;margin-bottom:.15rem;">📖 Default Spellbook</div>
    <div style="font-size:.6rem;color:#555;margin-bottom:.35rem;">Your base spellbook when no catalogue book is equipped.</div>
    ${_bookSlotRow('Spell Slots', BOOK_SPELL_SLOTS_BASE+defExtraSpell, BOOK_SPELL_SLOTS_BASE+BOOK_SLOT_MAX_SPELL, defExtraSpell, BOOK_SLOT_MAX_SPELL, _spellSlotCost, 'default', 'spellSlots', phos)}
    ${_bookSlotRow('Passive Slots', BOOK_PASSIVE_SLOTS_BASE+defExtraPassive, BOOK_PASSIVE_SLOTS_BASE+BOOK_SLOT_MAX_PASSIVE, defExtraPassive, BOOK_SLOT_MAX_PASSIVE, _passiveSlotCost, 'default', 'passiveSlots', phos)}
  </div>`;

  content.innerHTML = html;
}

function purchaseCatalogueBookUpgrade(catalogueId) {
  if (typeof SPELLBOOK_CATALOGUE === 'undefined') return;
  const cat = SPELLBOOK_CATALOGUE[catalogueId];
  if (!cat) return;
  const meta = getMeta();
  if (!meta.bookUpgradeLevels) meta.bookUpgradeLevels = {};
  const lvl = meta.bookUpgradeLevels[catalogueId] || 0;
  if (lvl >= 4) return;
  const cost = (cat.upgradeCosts || [])[lvl] || 0;
  if ((meta.phos || 0) < cost) return;
  meta.phos -= cost;
  meta.bookUpgradeLevels[catalogueId] = lvl + 1;
  saveMeta();
  _rerenderBookPanel();
}

const BOOK_SLOT_MAX_SPELL   = 3;  // max extra spell slots purchasable per book
const BOOK_SLOT_MAX_PASSIVE = 2;  // max extra passive slots purchasable per book
const _spellSlotCost   = n => (n + 1) * 10; // 10, 20, 30
const _passiveSlotCost = n => (n + 1) * 12; // 12, 24

function _rerenderBookPanel() {
  const freshMeta = getMeta();
  const c1 = document.getElementById('brun-tab-content');
  if (c1) renderBookUpgradesTab(c1, freshMeta);
  const c2 = document.getElementById('lobby-panel-content');
  if (c2 && c2.style.display !== 'none') renderBookUpgradesTab(c2, freshMeta);
}

function purchaseBookSlotUpgrade(bookKey, type) {
  const meta = getMeta();
  if (!meta.bookSlotUpgrades) meta.bookSlotUpgrades = {};
  if (!meta.bookSlotUpgrades[bookKey]) meta.bookSlotUpgrades[bookKey] = {};
  const current = meta.bookSlotUpgrades[bookKey][type] || 0;
  const max = type === 'spellSlots' ? BOOK_SLOT_MAX_SPELL : BOOK_SLOT_MAX_PASSIVE;
  if (current >= max) return;
  const cost = (type === 'spellSlots' ? _spellSlotCost : _passiveSlotCost)(current);
  if ((meta.phos || 0) < cost) return;
  meta.phos -= cost;
  meta.bookSlotUpgrades[bookKey][type] = current + 1;
  saveMeta();
  _rerenderBookPanel();
}

// Apply per-book slot upgrades at run start (called in initSpellbooksForRun and makeBookInstance)
function applyBookUpgrades(book, catalogueId) {
  const meta = getMeta();
  const slotUpgs = meta.bookSlotUpgrades || {};
  const key = catalogueId || 'default';
  const perBook = slotUpgs[key] || {};
  book.spellSlots   = BOOK_SPELL_SLOTS_BASE   + (perBook.spellSlots   || 0);
  book.passiveSlots = BOOK_PASSIVE_SLOTS_BASE + (perBook.passiveSlots || 0);
}

function renderTalentTab(content, meta) {
  const phos = meta.phos || 0;
  const talents = meta.talents || {};

  let html = `<div class="talent-phos-bar">
    <span>✦ Phos Available</span>
    <span class="talent-phos-val" id="talent-phos-display">${phos}</span>
  </div>`;

  // Section picker buttons — non-sandbox hides unreleased element sections
  const allSections = Object.keys(TALENT_TREE);
  const sections = sandboxMode
    ? allSections
    : allSections.filter(k => k === 'universal' || RELEASED_ELEMENTS.includes(k));
  html += `<div class="talent-section-tabs" id="talent-section-tabs">`;
  sections.forEach((key, i) => {
    html += `<button class="talent-sec-btn${i===0?' active':''}" onclick="switchTalentSection('${key}',this)">${TALENT_TREE[key].label}</button>`;
  });
  html += `</div>`;
  html += `<div id="talent-nodes-area"></div>`;

  content.innerHTML = html;
  renderTalentSection(sections[0], meta);
}

function switchTalentSection(key, btnEl) {
  document.querySelectorAll('.talent-sec-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderTalentSection(key, getMeta());
}

function renderTalentSection(key, meta) {
  const area = document.getElementById('talent-nodes-area');
  if (!area) return;
  const section = TALENT_TREE[key];
  if (!section) return;
  const talents = meta.talents || {};
  const phos    = meta.phos || 0;

  area.innerHTML = section.nodes.map(node => {
    const current  = talents[node.id] || 0;
    const maxed    = current >= node.maxLevel;
    const nextLvl  = current + 1;
    const cost     = maxed ? 0 : node.cost(nextLvl);
    const canAfford= phos >= cost;
    const barPct   = (current / node.maxLevel) * 100;

    return `<div class="talent-node ${maxed?'maxed':''} ${!maxed&&canAfford?'affordable':''}">
      <div class="talent-node-top">
        <span class="talent-node-emoji">${node.emoji}</span>
        <span class="talent-node-name">${node.name}</span>
        <span class="talent-node-level">${current}/${node.maxLevel}</span>
      </div>
      <div class="talent-node-desc">${node.desc}</div>
      <div class="talent-node-bar"><div class="talent-node-fill" style="width:${barPct}%"></div></div>
      ${maxed
        ? `<div class="talent-node-maxed">MAX</div>`
        : `<button class="talent-buy-btn ${canAfford?'can-afford':''}"
             onclick="buyTalent('${node.id}')"
             ${canAfford?'':'disabled'}>
             Upgrade · ${cost}✦
           </button>`
      }
    </div>`;
  }).join('');
}

function buyTalent(nodeId) {
  const ok = purchaseTalent(nodeId);
  if (!ok) return;
  const meta = getMeta();
  // refresh phos display
  const phosEl = document.getElementById('talent-phos-display');
  if (phosEl) phosEl.textContent = meta.phos || 0;
  // find which section this node is in and re-render
  for (const key of Object.keys(TALENT_TREE)) {
    if (TALENT_TREE[key].nodes.find(n => n.id === nodeId)) {
      renderTalentSection(key, meta);
      renderBrunLastRun(); // update phos total display
      break;
    }
  }
}

// ── Incantation Rarity Preview Overlay ────────────────────────────────────────
function showIncantationPreview() {
  const existing = document.getElementById('inc-preview-overlay');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'inc-preview-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:1rem;';
  overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#0e0a04;border:2px solid #3a2410;border-radius:8px;padding:1.2rem 1.4rem;width:100%;max-width:460px;cursor:default;';
  panel.onclick = e => e.stopPropagation();

  const tiers = [
    { label:'Dim',     stars:1, bg:'rgba(0,0,0,.98)',                                                    border:'#2a1a08', tagColor:'#887766', nameColor:'#e8e8e8', subColor:'rgba(220,220,220,.7)' },
    { label:'Kindled', stars:2, bg:'rgba(0,0,0,.98)',                                                    border:'#c06010', tagColor:'#c06010', nameColor:'#ffffff',  subColor:'rgba(255,255,255,.75)' },
    { label:'Blazing', stars:3, bg:'rgba(0,0,0,.98)',                                                    border:'#bb1200', tagColor:'#bb1200', nameColor:'#ffffff',  subColor:'rgba(255,255,255,.75)' },
    { label:'Radiant', stars:4, bg:'linear-gradient(to right, rgba(0,0,0,.98) 50%, #f0e8c0 100%)',        border:'#d4aa20', tagColor:'#8a6a10', nameColor:'#7a5208', subColor:'#9a7820', leftNameColor:'#ffffff', leftSubColor:'rgba(255,255,255,.75)' },
    { label:'Merged',  stars:5, bg:'linear-gradient(to right, rgba(0,0,0,.98) 50%, rgba(0,80,75,1) 100%)',border:'#00d4c8', tagColor:'#00d4c8', nameColor:'#ffffff',  subColor:'rgba(255,255,255,.75)', note:'(Coming Soon)' },
  ];

  // Inject animation keyframes once
  if (!document.getElementById('inc-preview-styles')) {
    const s = document.createElement('style');
    s.id = 'inc-preview-styles';
    s.textContent = `
      @keyframes incStarPulse {
        0%,100% { opacity:1; filter:brightness(1) drop-shadow(0 0 2px currentColor); transform:scale(1); }
        50%      { opacity:.5; filter:brightness(2.5) drop-shadow(0 0 6px currentColor); transform:scale(1.4); }
      }
      @keyframes incShimmer {
        0%   { left:-80%; }
        100% { left:160%; }
      }
      @keyframes incFireGlow {
        0%,100% { opacity:.7; transform:scaleY(1);   filter:blur(2px); }
        33%     { opacity:1;   transform:scaleY(1.15); filter:blur(1px); }
        66%     { opacity:.6;  transform:scaleY(.9);   filter:blur(3px); }
      }
      @keyframes incBorderPulse {
        0%,100% { opacity:1; }
        50%     { opacity:.6; }
      }
    `;
    document.head.appendChild(s);
  }

  function cardHTML(t) {
    const isGradient = t.bg.includes('gradient');
    const isFire = t.label === 'Kindled' || t.label === 'Blazing';
    const borderGrad = `linear-gradient(to right, #1a1a1a 50%, ${t.border} 100%)`;

    // Staggered sparkling stars
    const starSpans = Array.from('✦'.repeat(t.stars)).map((s, i) =>
      `<span style="display:inline-block;animation:incStarPulse ${5.5 + i * 0.7}s ease-in-out ${i * 1.0}s infinite;">${s}</span>`
    ).join('');

    // Shimmer overlay for gradient cards
    const shimmer = isGradient
      ? `<div style="position:absolute;top:0;left:-80%;width:45%;height:100%;pointer-events:none;z-index:2;
           background:linear-gradient(to right,transparent,rgba(255,255,255,.09),transparent);
           animation:incShimmer 3.5s linear infinite;"></div>`
      : '';

    // Fire flicker overlay for Kindled / Blazing
    const fireColor = t.label === 'Kindled' ? 'rgba(255,120,0,.10)' : 'rgba(255,30,0,.22)';
    const fire = isFire
      ? `<div style="position:absolute;bottom:0;right:0;width:55%;height:100%;pointer-events:none;z-index:2;
           background:linear-gradient(to left,${fireColor},transparent);
           animation:incFireGlow 1.6s ease-in-out infinite;"></div>`
      : '';

    // Border pulse for fire cards
    const wrapperAnim = isFire ? `animation:incBorderPulse 1.8s ease-in-out infinite;` : '';

    return `<div style="padding:3px;background:${borderGrad};border-radius:7px;margin-bottom:.5rem;${wrapperAnim}">
      <div style="display:flex;align-items:stretch;border-radius:5px;overflow:hidden;background:${t.bg};position:relative;">
        ${shimmer}${fire}
        <div style="flex:1;padding:.4rem .55rem;position:relative;z-index:3;">
          <div style="font-size:.72rem;font-family:'Cinzel',serif;color:${t.leftNameColor||t.nameColor};margin-bottom:.2rem;">🔮 Example Spell${t.note?` <span style="font-size:.45rem;opacity:.65;">${t.note}</span>`:''}</div>
          <div style="font-size:.48rem;color:${t.leftSubColor||t.subColor};">${t.note?'Two spells fused into one.':'Deals damage and applies a status effect.'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:58px;padding:3px 8px;gap:1px;position:relative;z-index:3;">
          <div style="font-size:.45rem;font-family:'Cinzel',serif;color:${t.tagColor};letter-spacing:.1em;">${starSpans}</div>
          <div style="font-size:.72rem;font-family:'Cinzel',serif;color:${t.nameColor};font-weight:700;letter-spacing:.08em;text-transform:uppercase;line-height:1.1;">${t.label}</div>
        </div>
      </div>
    </div>`;
  }

  let html = `<div style="font-family:'Cinzel',serif;font-size:.9rem;letter-spacing:.1em;color:#c8a060;text-align:center;margin-bottom:.8rem;border-bottom:1px solid #2a1a08;padding-bottom:.6rem;">
    📜 Spell Rarity Tiers
  </div>`;

  tiers.forEach(t => { html += cardHTML(t); });

  html += `<div style="font-size:.48rem;color:#554433;text-align:center;margin-top:.4rem;font-family:'Cinzel',serif;letter-spacing:.06em;">Click outside to close</div>`;

  panel.innerHTML = html;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}
