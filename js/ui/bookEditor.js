// ===== bookEditor.js =====
// Book destination picker (reward screens) + spellbook management editor (map)

// ─── SHARED UTIL ─────────────────────────────────────────────────────────────
function _bookEmoji(book) {
  if (book.emoji) return book.emoji;
  const m = { Fire:'🔥', Water:'💧', Ice:'❄️', Lightning:'⚡', Earth:'🪨', Nature:'🌿', Plasma:'🔮', Air:'🌀' };
  return m[book.element] || '📖';
}

function _isPlasmaPassive(passiveId) {
  return (PASSIVE_CHOICES['Plasma'] || []).some(p => p.id === passiveId);
}

// Returns the subset of player.spellbooks that can accept the given item.
function _validDestBooksFor(kind, itemDef) {
  const isPlasmaAbility = kind === 'spell'   && itemDef && itemDef.isPlasmaAbility;
  const isPlasmaPass    = kind === 'passive' && _isPlasmaPassive(
    typeof itemDef === 'string' ? itemDef : (itemDef && itemDef.id));
  return player.spellbooks.map((b, idx) => ({ b, idx })).filter(({ b }) => {
    if (b.isPlasmaBook) return isPlasmaAbility || isPlasmaPass;
    return !isPlasmaAbility && !isPlasmaPass;
  });
}

// ─── DESTINATION PICKER (for reward screens) ─────────────────────────────────
// Called from battleReward.js before adding a spell/passive.
// If only one valid destination exists, calls cb(bookIdx) immediately.
// Otherwise shows a modal listing books with slot counts.

let _bdCallback = null;

function _pickBookDest(kind, itemDef, cb) {
  const validBooks = _validDestBooksFor(kind, itemDef);
  if (validBooks.length <= 1) {
    cb(validBooks.length === 1 ? validBooks[0].idx : player.activeBookIdx);
    return;
  }

  _bdCallback = cb;
  const overlay = document.getElementById('book-dest-overlay');
  if (!overlay) { cb(player.activeBookIdx); return; }

  // Item preview
  const preview = document.getElementById('bd-item-preview');
  if (preview) {
    if (kind === 'passive') {
      const def = _lookupPassiveDef(typeof itemDef === 'string' ? itemDef : itemDef.id);
      preview.innerHTML = def ? `${def.emoji} <strong>${def.title}</strong>` : (itemDef.id || itemDef);
    } else {
      preview.innerHTML = `${itemDef.emoji} <strong>${itemDef.name}</strong>`;
    }
  }

  // Book buttons
  const list = document.getElementById('bd-book-list');
  list.innerHTML = '';
  validBooks.forEach(({ b, idx }) => {
    const usedSpells = b.spells.filter(s => !s.isBuiltin).length;
    const free  = kind === 'passive' ? b.passiveSlots - b.passives.length : b.spellSlots - usedSpells;
    const full  = free <= 0;
    const hint  = full ? 'Full' : `${free} slot${free !== 1 ? 's' : ''} free`;
    const hcol  = full ? '#8a4a20' : '#4aaa6a';
    const btn   = document.createElement('button');
    btn.className = 'boo-spell-btn';
    btn.innerHTML = `<span>${_bookEmoji(b)} ${b.name}</span><span class="boo-remove-hint" style="color:${hcol};">${hint}</span>`;
    btn.onclick = () => {
      overlay.classList.remove('open');
      const callback = _bdCallback; _bdCallback = null;
      callback(idx);
    };
    list.appendChild(btn);
  });

  overlay.classList.add('open');
}

// ─── BOOK EDITOR (map screen) ────────────────────────────────────────────────
let _beTab      = 0;
let _beMoveItem = null;  // null | { kind:'spell'|'passive', id, spellObj?, srcBookIdx }

function showBookEditor() {
  if (!player.spellbooks || !player.spellbooks.length) return;
  _beTab      = player.activeBookIdx;
  _beMoveItem = null;
  _beRender();
  document.getElementById('book-editor-overlay').style.display = 'flex';
}

function closeBookEditor() {
  document.getElementById('book-editor-overlay').style.display = 'none';
  _beMoveItem = null;
}

// ── Render dispatcher ────────────────────────────────────────────────────────
function _beRender() {
  _beRenderTabs();
  _beMoveItem ? _beRenderPickDest() : _beRenderBrowse();
}

function _beRenderTabs() {
  const tabs = document.getElementById('be-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  player.spellbooks.forEach((b, i) => {
    const btn = document.createElement('button');
    const active = i === _beTab;
    btn.style.cssText = [
      'flex:1;min-width:0;padding:.3rem .35rem;font-family:\'Cinzel\',serif;font-size:.58rem;',
      'letter-spacing:.04em;cursor:pointer;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      `border:1px solid ${active ? '#c8a060' : '#2a2420'};`,
      `background:${active ? '#1a1208' : '#0a0906'};`,
      `color:${active ? '#c8a060' : '#555'};`,
    ].join('');
    btn.textContent = _bookEmoji(b) + ' ' + b.name;
    btn.onclick = () => { _beTab = i; _beMoveItem = null; _beRender(); };
    tabs.appendChild(btn);
  });
}

// ── Browse view ───────────────────────────────────────────────────────────────
function _beRenderBrowse() {
  const cont = document.getElementById('be-content');
  if (!cont) return;
  cont.innerHTML = '';
  const book = player.spellbooks[_beTab];
  if (!book) return;

  // Spells
  const nonBuiltin = book.spells.filter(s => !s.isBuiltin);
  cont.appendChild(_beSectionHdr(`✦ Spells — ${nonBuiltin.length} / ${book.spellSlots}`));
  if (nonBuiltin.length === 0) {
    cont.appendChild(_beEmpty('No spells yet.'));
  } else {
    nonBuiltin.forEach(sp => {
      cont.appendChild(_beItemRow(
        `${sp.emoji} ${sp.name}`, sp.desc || '',
        () => { _beMoveItem = { kind:'spell', id:sp.id, spellObj:sp, srcBookIdx:_beTab }; _beRender(); }
      ));
    });
  }

  // Passives
  cont.appendChild(_beSectionHdr(`✦ Passives — ${book.passives.length} / ${book.passiveSlots}`));
  if (book.passives.length === 0) {
    cont.appendChild(_beEmpty('No passives yet.'));
  } else {
    book.passives.forEach(pid => {
      const def = _lookupPassiveDef(pid);
      cont.appendChild(_beItemRow(
        def ? `${def.emoji} ${def.title}` : pid,
        def ? (def.desc || '') : '',
        () => { _beMoveItem = { kind:'passive', id:pid, srcBookIdx:_beTab }; _beRender(); }
      ));
    });
  }
}

// ── Destination picker view ───────────────────────────────────────────────────
function _beRenderPickDest() {
  const cont = document.getElementById('be-content');
  const item  = _beMoveItem;
  if (!cont || !item) return;
  cont.innerHTML = '';

  // Back + moving-item label
  const backRow = document.createElement('div');
  backRow.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem;';
  const backBtn = document.createElement('button');
  backBtn.style.cssText = 'background:#0a0806;border:1px solid #2a2420;color:#888;padding:.2rem .55rem;font-size:.62rem;cursor:pointer;border-radius:3px;white-space:nowrap;';
  backBtn.textContent = '← Back';
  backBtn.onclick = () => { _beMoveItem = null; _beRender(); };
  const label = document.createElement('span');
  label.style.cssText = 'font-size:.68rem;color:#c8a060;font-family:\'Cinzel\',serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  if (item.kind === 'spell') {
    label.textContent = `Moving: ${item.spellObj.emoji} ${item.spellObj.name}`;
  } else {
    const def = _lookupPassiveDef(item.id);
    label.textContent = `Moving: ${def ? def.emoji + ' ' + def.title : item.id}`;
  }
  backRow.appendChild(backBtn);
  backRow.appendChild(label);
  cont.appendChild(backRow);

  cont.appendChild(_beSectionHdr('Choose destination:'));

  const dests = _validDestBooksFor(item.kind, item.kind === 'spell' ? item.spellObj : item.id)
    .filter(({ idx }) => idx !== item.srcBookIdx);

  if (dests.length === 0) {
    cont.appendChild(_beEmpty('No other valid books to move to.'));
    return;
  }

  dests.forEach(({ b, idx }) => {
    const usedSpells = b.spells.filter(s => !s.isBuiltin).length;
    const free  = item.kind === 'passive' ? b.passiveSlots - b.passives.length : b.spellSlots - usedSpells;
    const isFull = free <= 0;

    if (!isFull) {
      // Simple move button
      const btn = document.createElement('button');
      btn.className = 'boo-spell-btn';
      btn.innerHTML = `<span>${_bookEmoji(b)} ${b.name}</span><span class="boo-remove-hint" style="color:#4aaa6a;">Move here (${free} free)</span>`;
      btn.onclick = () => _beDoMove(idx);
      cont.appendChild(btn);
    } else {
      // Full — show collapsible swap list
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:.2rem;';

      const hintId = `be-swap-hint-${idx}`;
      const bookBtn = document.createElement('button');
      bookBtn.className = 'boo-spell-btn';
      bookBtn.innerHTML = `<span>${_bookEmoji(b)} ${b.name}</span><span class="boo-remove-hint" style="color:#8a6a20;" id="${hintId}">Full — swap ▾</span>`;

      const swapList = document.createElement('div');
      swapList.style.cssText = 'display:none;flex-direction:column;gap:.25rem;padding:.25rem 0 0 .7rem;';

      // Swap targets
      const swapItems = item.kind === 'passive'
        ? b.passives.map(pid => {
            const d = _lookupPassiveDef(pid);
            return { label: d ? d.emoji + ' ' + d.title : pid, ref: pid };
          })
        : b.spells.filter(s => !s.isBuiltin).map(sp => ({ label: sp.emoji + ' ' + sp.name, ref: sp }));

      swapItems.forEach(sw => {
        const swBtn = document.createElement('button');
        swBtn.className = 'boo-spell-btn';
        swBtn.style.cssText = 'font-size:.66rem;border-color:#1a1a1a;';
        swBtn.innerHTML = `<span>${sw.label}</span><span class="boo-remove-hint" style="color:#6a8a9a;">Swap</span>`;
        swBtn.onclick = () => {
          const destIdx = item.kind === 'passive'
            ? b.passives.indexOf(sw.ref)
            : b.spells.indexOf(sw.ref);
          _beDoSwap(idx, destIdx);
        };
        swapList.appendChild(swBtn);
      });

      let expanded = false;
      bookBtn.onclick = () => {
        expanded = !expanded;
        swapList.style.display = expanded ? 'flex' : 'none';
        const hint = document.getElementById(hintId);
        if (hint) hint.textContent = expanded ? 'Full — swap ▴' : 'Full — swap ▾';
      };

      wrap.appendChild(bookBtn);
      wrap.appendChild(swapList);
      cont.appendChild(wrap);
    }
  });
}

// ── Move / swap executors ─────────────────────────────────────────────────────
function _beDoMove(destBookIdx) {
  const item = _beMoveItem;
  if (!item) return;
  const src  = player.spellbooks[item.srcBookIdx];
  const dest = player.spellbooks[destBookIdx];
  if (!src || !dest) return;

  if (item.kind === 'spell') {
    src.spells  = src.spells.filter(s => s !== item.spellObj);
    dest.spells.push(item.spellObj);
  } else {
    src.passives  = src.passives.filter(id => id !== item.id);
    dest.passives.push(item.id);
  }

  if (item.srcBookIdx === player.activeBookIdx || destBookIdx === player.activeBookIdx) syncActiveBook();
  _beMoveItem = null;
  _beTab      = destBookIdx;
  _beRender();
}

function _beDoSwap(destBookIdx, destItemIdx) {
  const item = _beMoveItem;
  if (!item) return;
  const src  = player.spellbooks[item.srcBookIdx];
  const dest = player.spellbooks[destBookIdx];
  if (!src || !dest) return;

  if (item.kind === 'spell') {
    const movingSpell = item.spellObj;
    const swapSpell   = dest.spells[destItemIdx];
    if (!swapSpell) return;
    src.spells  = src.spells.filter(s => s !== movingSpell);
    dest.spells = dest.spells.filter(s => s !== swapSpell);
    dest.spells.push(movingSpell);
    src.spells.push(swapSpell);
  } else {
    const movingPassive = item.id;
    const swapPassive   = dest.passives[destItemIdx];
    if (!swapPassive) return;
    src.passives  = src.passives.filter(id => id !== movingPassive);
    dest.passives = dest.passives.filter(id => id !== swapPassive);
    dest.passives.push(movingPassive);
    src.passives.push(swapPassive);
  }

  if (item.srcBookIdx === player.activeBookIdx || destBookIdx === player.activeBookIdx) syncActiveBook();
  _beMoveItem = null;
  _beTab      = destBookIdx;
  _beRender();
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
function _beSectionHdr(text) {
  const d = document.createElement('div');
  d.style.cssText = 'font-size:.58rem;color:#6a4a20;letter-spacing:.08em;text-transform:uppercase;margin:.6rem 0 .25rem;';
  d.textContent = text;
  return d;
}

function _beEmpty(text) {
  const d = document.createElement('div');
  d.style.cssText = 'font-size:.68rem;color:#3a3a3a;padding:.2rem 0 .4rem;';
  d.textContent = text;
  return d;
}

function _beItemRow(name, desc, onMove) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:.4rem;padding:.3rem .45rem;background:#0d0b09;border:1px solid #1a1512;border-radius:4px;margin-bottom:.2rem;';

  const info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';
  const nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-size:.7rem;color:#c8a060;font-family:\'Cinzel\',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  nameEl.textContent = name;
  const descEl = document.createElement('div');
  descEl.style.cssText = 'font-size:.58rem;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  descEl.textContent = desc;
  info.appendChild(nameEl);
  info.appendChild(descEl);

  const btn = document.createElement('button');
  btn.style.cssText = 'flex:0 0 auto;background:#0a0806;border:1px solid #2a2010;color:#8a6a40;padding:.18rem .5rem;font-size:.58rem;cursor:pointer;border-radius:3px;white-space:nowrap;';
  btn.textContent = 'Move →';
  btn.onclick = onMove;

  row.appendChild(info);
  row.appendChild(btn);
  return row;
}
