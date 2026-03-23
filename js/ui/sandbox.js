// ===== sandbox.js =====
// ─── SANDBOX MODE — skip battle, enemy picker, spell picker, zone switcher ────

function sandboxSkipBattle(){
  if (!sandboxMode) return;
  combat.over = true;
  stopBattleLoop();
  setPlayerTurnUI(false);
  const gold = combat.totalGold || 30;
  player.gold += gold;
  battleNumber++;
  zoneBattleCount++;
  _runRoomsCompleted = (_runRoomsCompleted || 0) + 1;
  log(`⚡ Sandbox: battle skipped (treated as win). +${gold} gold.`, 'system');
  if (typeof applyBannerReward === 'function') applyBannerReward();
  if (typeof incrementArtifactRooms === 'function') incrementArtifactRooms();
  setTimeout(() => {
    if (typeof showBattleRewardScreen === 'function') showBattleRewardScreen(false, combat._isSpellBattle || false, false);
    else if (pendingLevelUps.length > 0) processNextLevelUp();
    else showMap();
  }, 400);
}

function sandboxOpenEnemyPicker(){
  if(!sandboxMode) return;
  const content = document.getElementById('seo-content');
  if(!content) return;
  content.innerHTML = '';

  const sectionStyle = 'margin-bottom:.8rem;';
  const headStyle    = 'font-family:"Cinzel",serif;font-size:.65rem;color:#666;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.35rem;';
  const gridStyle    = 'display:flex;flex-wrap:wrap;gap:.3rem;';
  const btnBase      = 'border-radius:4px;padding:3px 8px;font-size:.6rem;font-family:"Cinzel",serif;cursor:pointer;border-width:1px;border-style:solid;';

  // ── Target Dummy ──
  const dummyDiv = document.createElement('div');
  dummyDiv.style.cssText = sectionStyle;
  const dummyHead = document.createElement('div');
  dummyHead.style.cssText = headStyle;
  dummyHead.textContent = 'Training';
  dummyDiv.appendChild(dummyHead);
  const dummyBtn = document.createElement('button');
  dummyBtn.textContent = '🎯 Target Dummy';
  dummyBtn.style.cssText = btnBase + 'background:#1a1a0a;border-color:#6a6a22;color:#cccc44;';
  dummyBtn.onclick = () => { sandboxLoadEnemy({
    name: 'Target Dummy', emoji: '🎯', element: 'Neutral',
    enemyMaxHP: 1000, enemyDmg: 0, gold: 0,
    type: 'wizard', isTargetDummy: true,
  }); };
  dummyDiv.appendChild(dummyBtn);
  content.appendChild(dummyDiv);

  // ── Singles ──
  const singlesDiv = document.createElement('div');
  singlesDiv.style.cssText = sectionStyle;
  const singlesHead = document.createElement('div');
  singlesHead.style.cssText = headStyle;
  singlesHead.textContent = 'Singles';
  singlesDiv.appendChild(singlesHead);
  const singlesGrid = document.createElement('div');
  singlesGrid.style.cssText = gridStyle;
  (ENCOUNTER_POOL||[]).forEach(enc => {
    const meta = CAMP_META[enc.element] || { color:'#888', icon:'✦' };
    const btn = document.createElement('button');
    btn.textContent = meta.icon + ' ' + enc.name;
    btn.style.cssText = btnBase + `background:${meta.color}22;border-color:${meta.color}55;color:${meta.color};`;
    btn.onclick = () => { sandboxLoadEnemy(enc); };
    singlesGrid.appendChild(btn);
  });
  singlesDiv.appendChild(singlesGrid);
  content.appendChild(singlesDiv);

  // ── Packs ──
  const packsDiv = document.createElement('div');
  packsDiv.style.cssText = sectionStyle;
  const packsHead = document.createElement('div');
  packsHead.style.cssText = headStyle;
  packsHead.textContent = 'Packs';
  packsDiv.appendChild(packsHead);
  const packsGrid = document.createElement('div');
  packsGrid.style.cssText = gridStyle;
  (PACK_POOL||[]).forEach(enc => {
    const meta = CAMP_META[enc.element] || { color:'#888', icon:'✦' };
    const btn = document.createElement('button');
    btn.textContent = meta.icon + ' ' + enc.packName + ' (' + enc.members.length + ')';
    btn.style.cssText = btnBase + `background:${meta.color}22;border-color:${meta.color}55;color:${meta.color};`;
    btn.onclick = () => { sandboxLoadEnemy(enc); };
    packsGrid.appendChild(btn);
  });
  packsDiv.appendChild(packsGrid);
  content.appendChild(packsDiv);

  // ── Gym Bosses ──
  const gymsDiv = document.createElement('div');
  gymsDiv.style.cssText = sectionStyle;
  const gymsHead = document.createElement('div');
  gymsHead.style.cssText = headStyle;
  gymsHead.textContent = 'Gym Bosses';
  gymsDiv.appendChild(gymsHead);
  const gymsGrid = document.createElement('div');
  gymsGrid.style.cssText = gridStyle;
  (GYM_ROSTER||[]).forEach(gym => {
    const meta = CAMP_META[gym.element] || { color:'#888', icon:'✦' };
    const btn = document.createElement('button');
    btn.textContent = gym.emoji + ' ' + gym.name;
    btn.style.cssText = btnBase + `background:${meta.color}22;border-color:${meta.color}55;color:${meta.color};`;
    btn.onclick = () => {
      sandboxLoadEnemy({
        name: gym.name, emoji: gym.emoji, element: gym.element, color: gym.color,
        difficulty: 'gym', diffClass: 'diff-hard',
        enemyMaxHP: gymBossHP(), enemyDmg: gym.baseDmg,
        gold: gym.gold, type: 'wizard', isGym: true,
        signature: gym.signature,
        gymPassive: gym.passive, gymPhase2Passive: gym.phase2Passive,
        gymEntryEffect: gym.entryEffect,
        gymHitCounter: 0, gymPhase2: false,
        gymPhase2Dmg: gym.phase2Dmg, gymChargeInterval: gym.chargeInterval,
      });
    };
    gymsGrid.appendChild(btn);
  });
  gymsDiv.appendChild(gymsGrid);
  content.appendChild(gymsDiv);

  document.getElementById('sandbox-enemy-overlay').style.display = 'block';
}

function sandboxLoadEnemy(enc){
  document.getElementById('sandbox-enemy-overlay').style.display = 'none';
  const savedZone = combat.activeZoneElement || currentZoneElement;
  loadBattle(enc);
  if(savedZone) sandboxSetCombatZone(savedZone);
}

function sandboxOpenSpellPicker(){
  if(!sandboxMode) return;
  const content = document.getElementById('sso-content');
  if(!content) return;
  content.innerHTML = '';

  const headStyle    = 'font-family:"Cinzel",serif;font-size:.62rem;color:#4aaa6a;letter-spacing:.1em;text-transform:uppercase;margin:.7rem 0 .3rem;';
  const gridStyle    = 'display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.4rem;';
  const btnBase      = 'border-radius:4px;padding:4px 9px;font-size:.6rem;font-family:"Cinzel",serif;cursor:pointer;border-width:1px;border-style:solid;';

  // Group all spells for player's element by tier
  const tiers = ['primary','secondary','legendary'];
  const tierLabels = { primary:'Primary', secondary:'Secondary', legendary:'Legendary' };

  // Current spellbook IDs for quick lookup
  const book = activeBook();
  const ownedIds = new Set((book ? book.spells : player.spellbook).map(s => s.id));

  tiers.forEach(tier => {
    const spells = Object.values(SPELL_CATALOGUE).filter(sp =>
      sp.element === playerElement && sp.tier === tier
    );
    if(!spells.length) return;

    const head = document.createElement('div');
    head.style.cssText = headStyle;
    head.textContent = tierLabels[tier];
    content.appendChild(head);

    const grid = document.createElement('div');
    grid.style.cssText = gridStyle;

    spells.forEach(spell => {
      const owned = ownedIds.has(spell.id);
      const btn = document.createElement('button');
      btn.title = spell.desc || '';
      if(owned){
        btn.style.cssText = btnBase + 'background:#0a2a0a;border-color:#4aaa6a;color:#4aaa6a;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.7;">✓ Remove</span>';
      } else {
        btn.style.cssText = btnBase + 'background:#0d0b09;border-color:#2a5a3a;color:#7ac09a;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.55;">+ Add</span>';
      }
      btn.onclick = () => { sandboxToggleSpell(spell.id); sandboxOpenSpellPicker(); };
      grid.appendChild(btn);
    });

    content.appendChild(grid);
  });

  // Also show non-element spells (Neutral)
  const neutralSpells = Object.values(SPELL_CATALOGUE).filter(sp => sp.element === 'Neutral');
  if(neutralSpells.length){
    const head = document.createElement('div');
    head.style.cssText = headStyle;
    head.textContent = 'Neutral';
    content.appendChild(head);
    const grid = document.createElement('div');
    grid.style.cssText = gridStyle;
    neutralSpells.forEach(spell => {
      const owned = ownedIds.has(spell.id);
      const btn = document.createElement('button');
      btn.title = spell.desc || '';
      if(owned){
        btn.style.cssText = btnBase + 'background:#0a2a0a;border-color:#4aaa6a;color:#4aaa6a;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.7;">✓ Remove</span>';
      } else {
        btn.style.cssText = btnBase + 'background:#0d0b09;border-color:#555;color:#aaa;';
        btn.innerHTML = spell.emoji + ' ' + spell.name + ' <span style="font-size:.5rem;opacity:.55;">+ Add</span>';
      }
      btn.onclick = () => { sandboxToggleSpell(spell.id); sandboxOpenSpellPicker(); };
      grid.appendChild(btn);
    });
    content.appendChild(grid);
  }

  document.getElementById('sandbox-spell-overlay').style.display = 'block';
}

function sandboxToggleSpell(spellId){
  if(!sandboxMode) return;
  const spell = SPELL_CATALOGUE[spellId];
  if(!spell) return;
  const book = activeBook();
  const spells = book ? book.spells : player.spellbook;
  const idx = spells.findIndex(s => s.id === spellId);
  if(idx >= 0){
    // Remove it
    spells.splice(idx, 1);
    if(book && player.activeBookIdx === (player.spellbooks||[]).indexOf(book)) syncActiveBook();
    log(`📖 Sandbox: removed ${spell.emoji} ${spell.name}.`, 'system');
  } else {
    // Force-add (bypass slot limit in sandbox)
    const entry = { ...spell, currentCD: 0, dmgMult: 1.0, rarity: 'dim', incantationLevel: 1 };
    spells.push(entry);
    if(book && player.activeBookIdx === (player.spellbooks||[]).indexOf(book)) syncActiveBook();
    log(`📖 Sandbox: added ${spell.emoji} ${spell.name}.`, 'system');
  }
  if(typeof renderSpellButtons === 'function') renderSpellButtons();
}

function sandboxOpenBookPicker(){
  if(!sandboxMode) return;
  const content = document.getElementById('sbo-content');
  if(!content) return;
  content.innerHTML = '';

  const headStyle    = 'font-family:"Cinzel",serif;font-size:.62rem;color:#aa6aff;letter-spacing:.1em;text-transform:uppercase;margin:.7rem 0 .3rem;';
  const gridStyle    = 'display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.4rem;';
  const btnBase      = 'border-radius:4px;padding:4px 9px;font-size:.6rem;font-family:"Cinzel",serif;cursor:pointer;border-width:1px;border-style:solid;text-align:left;';

  const currentIds = new Set((player.spellbooks||[]).map(b=>b.catalogueId).filter(Boolean));
  const rarityOrder  = ['element','generic','legendary'];
  const rarityLabels = { element:'Element Books', generic:'Generic Books', legendary:'Legendary Books' };
  const rarityColors = { element:'#c8a060', generic:'#80c8ff', legendary:'#d4a0ff' };

  // Note: only 1 book active at start of sandbox
  const noteEl = document.createElement('div');
  noteEl.style.cssText = 'font-size:.58rem;color:#555;margin-bottom:.6rem;';
  noteEl.textContent = 'Active books in your run are highlighted. Max 3 books per run.';
  content.appendChild(noteEl);

  rarityOrder.forEach(rarity => {
    if(typeof SPELLBOOK_CATALOGUE === 'undefined') return;
    const books = Object.values(SPELLBOOK_CATALOGUE).filter(b=>b.rarity===rarity);
    if(!books.length) return;

    const head = document.createElement('div');
    head.style.cssText = headStyle;
    head.textContent = rarityLabels[rarity];
    content.appendChild(head);

    const grid = document.createElement('div');
    grid.style.cssText = gridStyle;
    const col = rarityColors[rarity];

    books.forEach(cat => {
      const active = currentIds.has(cat.id);
      const btn = document.createElement('button');
      if(active){
        btn.style.cssText = btnBase + `background:#1a0a2a;border-color:${col};color:${col};`;
        btn.innerHTML = `${cat.emoji} ${cat.name} <span style="font-size:.5rem;opacity:.7;">✓ Remove</span>`;
      } else {
        btn.style.cssText = btnBase + `background:#0d0b09;border-color:${col}55;color:${col}88;`;
        btn.innerHTML = `${cat.emoji} ${cat.name} <span style="font-size:.5rem;opacity:.55;">+ Add</span>`;
      }
      btn.onclick = () => { sandboxToggleBook(cat.id); sandboxOpenBookPicker(); };
      grid.appendChild(btn);
    });
    content.appendChild(grid);
  });

  document.getElementById('sandbox-book-overlay').style.display = 'block';
}

function sandboxToggleBook(catalogueId){
  if(!sandboxMode) return;
  if(typeof SPELLBOOK_CATALOGUE==='undefined' || typeof makeBookInstance==='undefined') return;

  const books = player.spellbooks || [];
  const idx = books.findIndex(b=>b.catalogueId===catalogueId);

  if(idx >= 0){
    // Remove — must keep at least 1 book
    if(books.length <= 1){ log('📚 Sandbox: must keep at least one book.','system'); return; }
    // If removing the active book, switch to another first
    if(idx === player.activeBookIdx){
      player.activeBookIdx = idx === 0 ? 1 : 0;
      syncActiveBook();
    } else if(idx < player.activeBookIdx){
      player.activeBookIdx--;
    }
    books.splice(idx, 1);
    const cat = SPELLBOOK_CATALOGUE[catalogueId];
    log(`📚 Sandbox: removed ${cat ? cat.emoji+' '+cat.name : catalogueId}.`,'system');
  } else {
    // Add (cap at 3 in sandbox too)
    if(books.length >= 3){ log('📚 Sandbox: max 3 books per run.','system'); return; }
    const cat = SPELLBOOK_CATALOGUE[catalogueId];
    if(!cat) return;
    const newBook = makeBookInstance(catalogueId);
    if(!newBook) return;
    // Copy builtins from first book so new book has Basic Attack + Armor
    const builtins = (books[0] ? books[0].spells : []).filter(s=>s.isBuiltin);
    newBook.spells = [...builtins];
    books.push(newBook);
    log(`📚 Sandbox: added ${cat.emoji} ${cat.name}.`,'system');
  }

  if(typeof renderSpellButtons==='function') renderSpellButtons();
}

function sandboxSetCombatZone(element){
  if(!sandboxMode) return;
  combat.activeZoneElement = element;
  _setZoneElement(element);
  musicPlaySmart('battle_' + element);
  log(`⚡ Sandbox: zone changed to ${element}.`, 'system');
  // Update the element badge top-left
  const badge = document.getElementById('combat-element-badge');
  if(badge){
    const meta = (typeof CAMP_META !== 'undefined' && CAMP_META[element]) || { icon: '✦', color: '#aaa' };
    badge.textContent = `${meta.icon} ${element} Zone`;
    badge.style.color = meta.color;
    badge.style.borderColor = meta.color + '44';
  }
  // Refresh the zone bar to highlight the new active zone
  const combatZoneBar = document.getElementById('sandbox-zone-combat-bar');
  if(combatZoneBar){
    combatZoneBar.querySelectorAll('button').forEach(btn => {
      const gym = (GYM_ROSTER||[]).find(g => btn.textContent.includes(g.element));
      if(!gym) return;
      const isActive = element === gym.element;
      btn.style.background = isActive ? gym.color+'33' : '#111';
      btn.style.borderColor = isActive ? gym.color : '#333';
      btn.style.color       = isActive ? gym.color : '#888';
    });
  }
}
