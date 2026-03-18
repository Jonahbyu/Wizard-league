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
  showElementScreen();
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
    if (!meta.artifacts || !meta.artifacts.length) {
      content.innerHTML = '<div class="brun-empty">No artifacts yet — defeat a Gym Leader!</div>';
      return;
    }
    const rows = meta.artifacts.map(a => {
      const def = (typeof ARTIFACT_CATALOGUE !== 'undefined') ? ARTIFACT_CATALOGUE[a.id] : null;
      if (!def) return '';
      const stars  = a.star > 0 ? '★'.repeat(a.star) : '—';
      const sColor = ['#888','#c8a030','#e8d060','#00ccff'][Math.min(a.star||0, 3)];
      const prog   = a.star < 3 ? `${a.roomsUsed||0}/25` : 'MAX';
      return `<div class="brun-art-row">
        <div>
          <div class="brun-art-name">${def.emoji} ${def.name} <span class="brun-art-star" style="color:${sColor}">${stars}</span></div>
          <div class="brun-art-desc">${def.desc[a.star||0]} · <span style="color:#4a4a4a">${prog} rooms</span></div>
        </div>
      </div>`;
    }).join('');
    content.innerHTML = rows || '<div class="brun-empty">No artifacts.</div>';

  } else if (tab === 'talents') {
    renderTalentTab(content, meta);
  } else if (tab === 'books') {
    renderBookUpgradesTab(content, meta);
  } else if (tab === 'wizards') {
    _renderWizardUnlockTab(content, meta);
  } else if (tab === 'skins_old_unused') {
  }
}

// ── WIZARD UNLOCK TAB ─────────────────────────────────────────────────────────
// Unlock conditions: Battlemage always available.
// Hexblade: complete 3 runs. Arcanist: complete 6 runs or beat 2 gyms.
function _getWizardUnlockStatus(meta) {
  const runs    = meta.totalRuns  || 0;
  const gyms    = meta.gymsBeaten || 0;
  return {
    battlemage: { unlocked: true,         condition: 'Default wizard — always available' },
    hexblade:   { unlocked: runs >= 3,    condition: `Complete 3 runs (${runs}/3)` },
    arcanist:   { unlocked: runs >= 6 || gyms >= 2, condition: `Complete 6 runs or defeat 2 Gym Leaders (${runs} runs, ${gyms} gyms)` },
  };
}

function _renderWizardUnlockTab(content, meta) {
  const status = _getWizardUnlockStatus(meta);
  const slotData = getActiveSlotData();
  const savedChar = slotData.savedCharId || playerCharId || '';

  const cards = CHARACTER_ROSTER.map(ch => {
    const s = status[ch.id];
    const locked = !s.unlocked;
    const active = savedChar === ch.id;
    const ps = CHAR_PORTRAIT_STYLES[ch.id] || CHAR_PORTRAIT_STYLES.arcanist;

    return `<div style="
      background:${locked ? '#0a0805' : (active ? 'linear-gradient(175deg,#1a1205,#0e0c06)' : 'linear-gradient(175deg,#14100a,#0c0a06)')};
      border:1px solid ${active ? '#8a6a20' : (locked ? '#1a1208' : '#2a1e0e')};
      border-radius:8px;padding:.8rem;width:200px;flex-shrink:0;
      box-shadow:${active ? '0 0 12px rgba(200,160,40,.15)' : 'none'};
      opacity:${locked ? '0.5' : '1'};
      display:flex;flex-direction:column;align-items:center;gap:.4rem;
      ">
      <div style="font-family:'Cinzel',serif;font-size:.85rem;color:${active?'#e8c060':(locked?'#3a2a10':'#c8a060')};letter-spacing:.08em;">
        ${locked ? '🔒 ' : ''}${ch.name}
      </div>
      <div style="font-size:.56rem;color:#4a3820;letter-spacing:.12em;text-transform:uppercase;font-family:'Cinzel',serif;">
        ${ch.title}
      </div>
      <div style="font-size:.58rem;color:${locked?'#3a2a10':'#705840'};text-align:center;line-height:1.5;padding:0 .3rem;">
        ${locked ? s.condition : ch.desc}
      </div>
      ${active ? '<div style="font-size:.5rem;color:#8a6a20;letter-spacing:.12em;font-family:Cinzel,serif;text-transform:uppercase;">✦ Selected ✦</div>' : ''}
      ${!locked && !active ? `<button onclick="_lobbySelectWizard('${ch.id}')" style="
        margin-top:.2rem;background:#1a1205;border:1px solid #3a2810;color:#c8a060;
        font-family:'Cinzel',serif;font-size:.55rem;padding:.25rem .7rem;border-radius:3px;
        cursor:pointer;letter-spacing:.08em;
        ">Select</button>` : ''}
      ${active ? `<button onclick="_lobbySelectWizard('')" style="
        margin-top:.2rem;background:#0e0c06;border:1px solid #2a1e08;color:#5a4820;
        font-family:'Cinzel',serif;font-size:.55rem;padding:.25rem .7rem;border-radius:3px;
        cursor:pointer;letter-spacing:.08em;
        ">Deselect</button>` : ''}
    </div>`;
  }).join('');

  content.innerHTML = `
    <div style="padding:.6rem .2rem .4rem;">
      <div style="font-size:.62rem;color:#4a3820;text-align:center;margin-bottom:.8rem;line-height:1.5;">
        Your chosen wizard carries over into every run. Unlock new wizards by completing runs.
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        ${cards}
      </div>
    </div>`;
}

function _lobbySelectWizard(charId) {
  playerCharId = charId;
  patchActiveSlot({ savedCharId: charId });
  // Re-render tab
  const content = document.getElementById('brun-tab-content');
  const meta = getMeta();
  if (content) _renderWizardUnlockTab(content, meta);
}

function renderBookUpgradesTab(content, meta) {
  const phos = meta.phos || 0;
  const bookUpgrades = meta.bookUpgrades || {};

  // Upgrade definitions: { key, label, desc, cost, maxLevel, stat }
  const BOOK_UPGRADES = [
    { key:'spell_slots',   label:'Extra Spell Slot',   desc:'Adds +1 spell slot to your starting book.',   cost: lvl => (lvl+1)*8,  maxLevel:4, stat:'spellSlots'   },
    { key:'passive_slots', label:'Extra Passive Slot',  desc:'Adds +1 passive slot to your starting book.', cost: lvl => (lvl+1)*10, maxLevel:3, stat:'passiveSlots' },
  ];

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem;">
    <div style="font-family:'Cinzel',serif;font-size:.78rem;color:#c8a060;">📖 Spellbook Upgrades</div>
    <div style="font-size:.72rem;color:#a080ff;">${phos} ✦ Phos</div>
  </div>
  <div style="font-size:.62rem;color:#4a4a60;margin-bottom:.8rem;line-height:1.5;">Permanent upgrades to your starting spellbook. Applied at the start of every run.</div>`;

  BOOK_UPGRADES.forEach(upg => {
    const lvl     = bookUpgrades[upg.key] || 0;
    const maxed   = lvl >= upg.maxLevel;
    const cost    = maxed ? 0 : upg.cost(lvl);
    const canAfford = phos >= cost;
    html += `<div style="background:#0f0d0b;border:1px solid #2a2020;border-radius:6px;padding:.7rem .9rem;margin-bottom:.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;">
        <div style="font-family:'Cinzel',serif;font-size:.75rem;color:#c8a060;">${upg.label}</div>
        <div style="font-size:.65rem;color:#6a5a30;">${lvl} / ${upg.maxLevel}</div>
      </div>
      <div style="font-size:.63rem;color:#666;margin-bottom:.5rem;">${upg.desc}</div>
      ${maxed
        ? '<div style="font-size:.62rem;color:#4a8a4a;letter-spacing:.08em;">✓ MAXED</div>'
        : `<button onclick="purchaseBookUpgrade('${upg.key}')" ${canAfford?'':'disabled'}
             style="width:100%;background:${canAfford?'#1a1a0a':'#0a0a0a'};border:1px solid ${canAfford?'#6a5a20':'#2a2020'};
             color:${canAfford?'#c8a060':'#3a3020'};padding:.3rem;font-family:'Cinzel',serif;font-size:.62rem;
             letter-spacing:.08em;cursor:${canAfford?'pointer':'not-allowed'};border-radius:4px;text-transform:uppercase;">
             Upgrade — ${cost} ✦
           </button>`}
    </div>`;
  });

  content.innerHTML = html;
}

function purchaseBookUpgrade(key) {
  const meta = getMeta();
  const COSTS = { spell_slots: lvl => (lvl+1)*8, passive_slots: lvl => (lvl+1)*10 };
  const MAX   = { spell_slots: 4, passive_slots: 3 };
  if (!meta.bookUpgrades) meta.bookUpgrades = {};
  const lvl  = meta.bookUpgrades[key] || 0;
  if (lvl >= MAX[key]) return;
  const cost = COSTS[key](lvl);
  if ((meta.phos||0) < cost) return;
  meta.phos -= cost;
  meta.bookUpgrades[key] = lvl + 1;
  saveMeta();
  // Re-render
  switchBrunTab('books', document.querySelector('.brun-tab[onclick*="books"]'));
}

// Apply book upgrades at run start (called in initSpellbooksForRun)
function applyBookUpgrades(book) {
  const meta = getMeta();
  const upg  = meta.bookUpgrades || {};
  book.spellSlots   = BOOK_SPELL_SLOTS_BASE   + (upg.spell_slots   || 0);
  book.passiveSlots = BOOK_PASSIVE_SLOTS_BASE + (upg.passive_slots || 0);
}

function renderTalentTab(content, meta) {
  const phos = meta.phos || 0;
  const talents = meta.talents || {};

  let html = `<div class="talent-phos-bar">
    <span>✦ Phos Available</span>
    <span class="talent-phos-val" id="talent-phos-display">${phos}</span>
  </div>`;

  // Section picker buttons
  const sections = Object.keys(TALENT_TREE);
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
