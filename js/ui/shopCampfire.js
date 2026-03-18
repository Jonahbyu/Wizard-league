// ===== shopCampfire.js =====
// ─── CAMPFIRE + SHOP screens ──────────────────────────────────────────────────

function enterCampfire(){
  const pMax=maxHPFor('player');
  const h=Math.floor(pMax*CAMPFIRE_HEAL);
  const actual=applyHeal('player',h,null);
  restoreAllPP();
  const descEl = document.getElementById("campfire-desc");
  descEl.textContent = actual>0
    ?`You rest and recover ${actual} HP. (${player.hp}/${pMax})`
    :`Already at full health. The fire is warm.`;
  showScreen("campfire-screen");
  const healText = actual>0 ? `+${actual} HP restored` : '';
  setTimeout(()=>startCampfireScene(healText), 0);
}
function leaveCampfire(){ stopCampfireScene(); showMap(); }

function enterShop(){
  document.getElementById("shop-gold-display").textContent=player.gold;
  const c=document.getElementById("shop-items"); c.innerHTML="";
  const addRow=(emoji,name,desc,cost,canBuy,onBuy)=>{
    const row=document.createElement("div");
    row.className="shop-item-row"+(canBuy?"":" cant-afford");
    row.innerHTML=`<div><div class="shop-item-name">${emoji} ${name}</div><div class="shop-item-desc">${desc}</div></div><div class="shop-item-cost">${cost}g</div>`;
    if(canBuy) row.onclick=onBuy;
    c.appendChild(row);
  };
  SHOP_ITEMS.forEach(id=>{
    const item=ITEM_CATALOGUE[id];
    addRow(item.emoji,item.name,item.desc,item.shopCost,player.gold>=item.shopCost,
      ()=>{player.gold-=item.shopCost;addItem(id);enterShop();});
  });
  const revCost = 200;
  const maxRevives = 6;
  addRow('❤️','Extra Life',`Gain +1 life (${player.revives} now). Revives heal to 75% HP.`,
    revCost, player.gold>=revCost && player.revives<maxRevives,
    ()=>{player.gold-=revCost; player.revives++; enterShop();});

  const actionCost = 350;
  const maxBonusActions = 2;
  addRow('⚡','Extra Action',
    `Gain +1 permanent action per turn (${player.bonusActions}/${maxBonusActions}). Cooldowns still apply.`,
    actionCost, player.gold>=actionCost && (player.bonusActions||0)<maxBonusActions,
    ()=>{player.gold-=actionCost; player.bonusActions=(player.bonusActions||0)+1; enterShop();});
  const allPassives=Object.entries(PASSIVE_CHOICES).flatMap(([el,ps])=>ps.map(p=>({...p,element:el})));
  const forSale=allPassives.filter(p=>!p.legendary&&!player.passives.includes(p.id));
  pickRandom(forSale,2).forEach(p=>{
    const pCost=1000;
    addRow(p.emoji,p.title,`[${p.element}] ${p.desc}`,pCost,player.gold>=pCost,
      ()=>{player.gold-=pCost;addPassiveToBook(p.id);enterShop();});
  });
  updateStatsUI();
  showScreen("shop-screen");
  startShopCanvas();
}
function leaveShop(){
  const c = document.getElementById('shop-canvas');
  if(c && c._stop) c._stop();
  showMap();
}
