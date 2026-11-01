'use strict';
// Finite, read-only display scenes. No API, storage, price engine or order creation.
const params=new URLSearchParams(location.search);
const allowedPages=['home','detail','cart','checkout','result'];
const defaultPage=document.body?.dataset?.page||'home';
const page=allowedPages.includes(params.get('page'))?params.get('page'):defaultPage;
const journey=params.get('journey')==='agent'?'agent':'human';
const state=params.get('state')||'normal';
const isAgent=journey==='agent';
const cartId=isAgent?'A-示意-01':'H-示意-01';
const product=id=>PRODUCTS.find(p=>p.id===id);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>'NT$ '+Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function url(target,scene='normal'){return '?'+new URLSearchParams({page:target,journey,state:scene});}
function link(target,label,scene='normal',style='',extra={}){return `<a class="${style}" href="${url(target,scene)}${extra.product?'&amp;product='+extra.product:''}" data-nav="${target}" data-state="${scene}"${extra.product?' data-product="'+extra.product+'"':''}>${label}</a>`;}
function placeholder(id){return `<div class="placeholder" aria-label="${id} 商品圖片占位"><span>商品圖像區</span><span>${id}</span></div>`;}
function status(p){return p.price===0?'價格待確認':p.stock<0?'庫存異常':p.stock===0?'已售罄':'可購買';}
function newShopping(label,style=''){return `<a class="${style}" href="?page=home&amp;journey=human&amp;state=normal" data-new-shopping>${label}</a>`;}
function header(focused=false,finished=false){if(finished)return `<header class="store-header">${newShopping('日常選物','brand')}<nav class="store-nav" aria-label="商城導覽">${newShopping('返回商城')}</nav></header>`;return `<header class="store-header">${link('home','日常選物','normal','brand')}${focused?'':`<form class="header-search" data-demo="search"><label class="skip" for="search">搜尋商品</label><input id="search" type="search" placeholder="搜尋商品名稱、品牌"><button type="submit">搜尋</button></form>`}<nav class="store-nav" aria-label="商城導覽">${link('home',focused?'繼續選購':'所有商品','normal','desktop-label')}${link('cart','購物車')}</nav></header>`;}
function origin(){return `<div class="origin"><p><strong>${isAgent?'由 AI 助理準備的購物車':'您自行選購的購物車'}</strong></p><p>購物車 ${cartId}${isAgent?' · 保留 AI 購物優惠資格':''}</p>${isAgent?'<p>免登入交接。連結自產生起 24 小時內有效，開啟不延長期限。</p>':''}</div>`;}
const quotes={
  normal:{subtotal:'2,580.00',reduction:'100.00',ai:'124.00',human:'2,480.00',agent:'2,356.00'},
  edited:{subtotal:'4,470.00',reduction:'100.00',ai:'218.50',human:'4,370.00',agent:'4,151.50'},
  price:{subtotal:'2,680.00',reduction:'100.00',ai:'129.00',human:'2,580.00',agent:'2,451.00'},
  sameTotal:{subtotal:'2,580.00',reduction:'100.00',ai:'124.00',human:'2,480.00',agent:'2,356.00'}
};
function quoteKey(){return ['edited','price','sameTotal'].includes(state)?state:'normal';}
function amount(value){return 'NT$ '+value;}
function totals(kind=quoteKey(),label='應付總額'){
  const q=quotes[kind];return `<dl class="totals"><div><dt>商品小計（優惠前）</dt><dd>${amount(q.subtotal)}</dd></div><div><dt>全站滿額折扣</dt><dd>− ${amount(q.reduction)}</dd></div>${isAgent?`<div><dt>AI 購物優惠（95 折）</dt><dd>− ${amount(q.ai)}</dd></div>`:''}<div><dt>運費</dt><dd>NT$ 0.00</dd></div><div class="grand"><dt>${label}</dt><dd>${amount(isAgent?q.agent:q.human)}</dd></div></dl>`;
}
function item(p,editing=false,kind=quoteKey()){
  const qty=kind==='edited'&&p.id==='P001'?2:1;
  // Altered prices belong only to explicit synthetic re-confirmation scenes.
  const unit=(kind==='price'||kind==='sameTotal')&&p.id==='P001'?1990:kind==='sameTotal'&&p.id==='P003'?590:p.price;
  const subtotal=p.id==='P001'&&kind==='edited'?3780:unit;
  const issue=state==='stock'&&p.id==='P001';
  return `<article class="cart-item${issue?' problem':''}">${placeholder(p.id)}<div><div class="item-title"><h3>${escapeHTML(p.name)}</h3><strong>小計 ${money(subtotal)}</strong></div><div class="meta">${escapeHTML(p.brand)} · ${p.id}</div><p class="meta">單價 ${money(unit)}${editing?'':` · 數量 ${qty}`}</p>${issue?'<p class="problem-text">此商品庫存不足：需要 1 件，目前 0 件。</p>':''}${editing?`<div class="quantity-row"><label for="qty-${p.id}">數量</label><input id="qty-${p.id}" type="number" min="1" step="1" value="${state==='invalid'&&p.id==='P001'?'0':qty}" aria-describedby="error-${p.id}" ${state==='invalid'&&p.id==='P001'?'aria-invalid="true"':''}><button data-action="quantity" data-id="${p.id}">更新數量</button><button class="remove" data-action="remove">移除</button></div><p class="form-error" id="error-${p.id}" role="status">${state==='invalid'&&p.id==='P001'?'請輸入正整數，且不得超過目前庫存。':''}</p>`:''}</div></article>`;
}
function alertBox(title,text){return `<section class="alert" role="alert"><h2>${title}</h2><p>${text}</p></section>`;}
function pagination(previous,next,label){return `<nav class="pagination" aria-label="分頁"><button ${previous?'data-action="'+previous+'"':'disabled'}>上一頁</button><span>${label}</span><button ${next?'data-action="'+next+'"':'disabled'}>下一頁</button></nav>`;}
function home(){
  const boundary=['P002','P008','P010','P016'].map(product);
  const n=Math.min(4,Math.max(0,Number(params.get('catalogPage'))||0));
  const rows=state==='boundaries'?boundary:state==='empty'?[]:PRODUCTS.slice(n*6,n*6+6);
  return `${header()}<main id="main"><section class="hero"><div class="eyebrow">日常選物 · Agent-Ready 商店</div><h1>找一件適合日常的好物。</h1><p>自己慢慢選，或讓 AI 助理準備，再由您確認。</p></section><div class="title-row"><h2>探索商品</h2><span class="meta">${state==='empty'?'沒有符合的商品':state==='boundaries'?'商品狀態範例':`共 ${PRODUCTS.length} 件商品`}</span></div><form class="filters" data-demo="filter"><label>商品分類<select><option>全部分類</option><option>3C 配件</option><option>居家生活</option></select></label><label>排序方式<select><option>推薦排序</option></select></label><button type="submit">套用篩選</button></form>${rows.length?`<section class="products" aria-label="商品清單">${rows.map(p=>`<article class="card">${link('detail',placeholder(p.id),p.id==='P002'||p.id==='P016'?'soldout':p.id==='P008'?'invalid':p.id==='P010'?'unpriced':'normal','',{product:p.id}) }<div class="meta">${escapeHTML(p.brand)} · ${p.id}</div><h3>${link('detail',escapeHTML(p.name),p.id==='P002'||p.id==='P016'?'soldout':p.id==='P008'?'invalid':p.id==='P010'?'unpriced':'normal','',{product:p.id})}</h3><p class="price">${money(p.price)}</p><span class="badge">${status(p)}</span><button data-action="add" ${status(p)!=='可購買'?'disabled':''}>${status(p)==='可購買'?'加入購物車':status(p)}</button></article>`).join('')}</section>`:`<div class="empty"><h2>沒有找到符合的商品</h2><p>請調整搜尋字詞或篩選條件。</p>${link('home','清除條件','normal','button')}</div>`}${state==='normal'?pagination(n>0?'catalog-prev':'',n<4?'catalog-next':'',`第 ${n+1} / 5 頁`):''}<p class="footnote">所有商品均為虛構資料。商品圖像暫以占位表示。</p></main>`;
}
function detail(){
  const id=params.get('product')||(state==='soldout'?'P002':state==='invalid'?'P008':state==='unpriced'?'P010':'P001');
  const p=product(id)||product('P001');const available=status(p)==='可購買';
  const comments=state==='reviews'?p.reviews.slice(2):p.reviews.slice(0,2);
  const average=p.reviews.length?(p.reviews.reduce((sum,r)=>sum+r.rating,0)/p.reviews.length).toFixed(1):'—';
  return `${header()}<main id="main"><div class="breadcrumbs">${link('home','全部商品')} / ${escapeHTML(p.category)} / ${p.id}</div><div class="detail-grid">${placeholder(p.id)}<section class="detail-info"><div class="eyebrow">${escapeHTML(p.brand)} · ${p.id}</div><h1>${escapeHTML(p.name)}</h1><span class="badge">${status(p)}</span><p class="price">${money(p.price)}</p><p>${escapeHTML(p.description)}</p><p class="meta">${available?`目前庫存 ${p.stock} 件；加入購物車不保留庫存。`:state==='unpriced'?'價格待確認，暫時無法購買。':state==='invalid'?'庫存資料異常，暫時無法購買。':'目前無庫存，暫時無法購買。'}</p><div class="actions"><label for="detail-qty">數量</label><input id="detail-qty" type="number" min="1" step="1" value="1" ${available?'':'disabled'}><button class="primary" data-action="add" ${available?'':'disabled'}>加入購物車</button></div></section></div><section class="section"><h2>商品規格</h2><dl class="specs">${Object.entries(p.specs).map(([k,v])=>`<dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd>`).join('')}</dl></section><section class="section"><div class="title-row"><h2>顧客評論</h2><span class="meta">${average} / 5 · ${p.reviews.length} 則評論</span></div>${comments.length?comments.map(r=>`<article class="review"><header><strong>${escapeHTML(r.user)}</strong><span>${r.rating} / 5</span><time>${r.created_at}</time></header><p>${escapeHTML(r.content)}</p></article>`).join(''):'<p class="muted">目前沒有評論。</p>'}${p.reviews.length>2?pagination(state==='reviews'?'reviews-first':'',state==='reviews'?'':'reviews-next',`第 ${state==='reviews'?2:1} / 2 頁`):''}</section></main>`;
}
function cart(){
  const empty=state==='empty';const blocked=['stock','invalid'].includes(state);
  return `${header()}<main id="main"><div class="title-row"><h1>購物車</h1>${link('home','繼續選購')}</div>${origin()}${empty?`<section class="empty"><h2>購物車還沒有商品</h2><p>先挑選商品，再回來確認購買內容。</p>${link('home','開始選購','normal','button primary')}<p><button disabled>前往確認訂單</button></p></section>`:`${state==='stock'?alertBox('請調整庫存不足的商品','選購內容已保留，沒有自動移除或減少數量。請調整後再繼續。'):state==='edited'?'<p class="inline-status" role="status">數量已更新，預估報價如下。</p>':''}<div class="two-col"><section aria-label="購物車商品">${item(product('P001'),true)}${item(product('P003'),true)}<p class="footnote">數量須為正整數且不超過目前庫存；商品庫存可能變動，提交時仍會重新檢查。</p></section><aside class="panel"><h2>預估金額</h2>${totals('edited'===state?'edited':'normal','預估總額')}<p class="footnote">${isAgent?'保留原購物車的 AI 優惠資格。':''}運費門檻依優惠前商品小計判斷；目前符合免運。</p>${blocked?'<button class="primary danger-disabled" disabled>請先調整購物車</button>':link('checkout','前往確認訂單',state==='edited'?'edited':'normal','button primary')}<p class="footnote">金額為目前預估，返回確認頁時將重新報價。購物車尚未成立訂單。</p></aside></div>`}</main>`;
}
function expired(){return `${header(true,true)}<main id="main"><section class="empty"><span class="badge">連結已失效</span><h1>這個交接連結已過期</h1><p>交接連結自產生起固定 24 小時內有效，重新開啟不會延長期限。此連結已無法繼續結帳。</p><p>請返回商城重新選購，或請 AI 助理重新發起購物。</p>${newShopping('返回商城','button primary')}</section></main>`;}
function checkout(){
  if(state==='expired')return expired();
  const changed=['price','sameTotal'].includes(state);const blocked=['stock','pending','unknown'].includes(state);
  let notice='';
  if(changed)notice=alertBox(state==='sameTotal'?'商品單價已更新，總額相同仍需確認':'報價已更新，請再次確認',state==='sameTotal'?'Aero 耳機單價 NT$ 1,890.00 → NT$ 1,990.00；行動電源單價 NT$ 690.00 → NT$ 590.00。請核對下方最新商品與明細。':`Aero 耳機單價 NT$ 1,890.00 → NT$ 1,990.00。應付總額 ${isAgent?'NT$ 2,356.00 → NT$ 2,451.00':'NT$ 2,480.00 → NT$ 2,580.00'}。尚未成立訂單。`);
  if(state==='stock')notice=alertBox('庫存不足，這筆訂單尚未成立','問題商品已標示。購物車內容已保留；未移除商品、未購買其餘商品，也未扣除庫存。請編輯原購物車後再試。');
  if(state==='unknown')notice=alertBox('目前尚無法確認訂單結果','請勿視為購買失敗而重新建立購買。若實際已成功，重試應回到原訂單結果，不會再次購買。具體恢復入口待後續設計。');
  if(state==='pending')notice='<p class="inline-status" role="status">正在確認訂單，請稍候。請勿重複提交。</p>';
  return `${header(true)}<main id="main"><div class="eyebrow">核對內容 → 明確確認 → 查看結果</div><h1>確認您的訂單</h1><p class="muted">請確認商品、數量與金額；只有您明確確認後，才會提交購買。</p>${origin()}${notice}<div class="two-col"><section aria-label="訂單內容"><div class="checkout-title"><h2>購買內容</h2>${link('cart','編輯購物車',state==='stock'?'stock':state==='edited'?'edited':'normal','button')}</div><p class="readonly-note">在原購物車編輯，返回後重新計算報價。</p>${item(product('P001'))}${item(product('P003'))}${isAgent?'<p class="footnote">此交接沿用原購物車及 Agent 來源，編輯後不會切換為一般購物車。</p>':''}</section><aside class="panel"><h2>金額明細</h2>${totals()}<p class="footnote">滿 NT$ 1,000 折 NT$ 100。${isAgent?'滿減後商品金額再享 AI 95 折。':''}本次符合免運，運費不參與折扣。</p><button class="primary" data-action="confirm" ${blocked?'disabled':''}>${state==='stock'?'請先調整問題商品':state==='pending'?'正在確認…':state==='unknown'?'等待結果確認':changed?'確認更新內容並購買':'確認購買'}</button><p class="footnote">確認即提交模擬結帳，沒有額外付款步驟。不涉及真實付款或物流。</p></aside></div>${changed?'<p class="footnote">設計註：此為合成報價變動樣本，沒有改動 Mock 原件。商品、數量、單價、優惠、運費或應付金額有變化都須再次確認。</p>':''}</main>`;
}
function result(){const kind=Object.hasOwn(quotes,params.get('composition'))?params.get('composition'):'normal';return `${header(true,true)}<main id="main"><section class="result-heading"><div class="result-symbol" aria-hidden="true">✓</div><h1>訂單已成立</h1><p>您的購買內容已確認。</p><p class="meta">訂單編號 範例-0001 · 購物車 ${cartId}</p><span class="badge">模擬結帳完成</span></section>${state==='retry'?alertBox('這筆購買已完成','再次提交仍顯示原訂單 範例-0001，沒有建立新訂單或再次扣庫存。'):''}<div class="two-col"><section><h2>已確認的購買內容</h2>${item(product('P001'),false,kind)}${item(product('P003'),false,kind)}<p class="footnote">此處呈現最終確認的商品與價格快照。</p></section><aside class="panel"><h2>訂單金額</h2>${totals(kind,'訂單總額')}<p class="footnote">${isAgent?'AI 購物優惠已套用。':''}不涉及真實付款或物流配送。</p>${newShopping('繼續選購','button primary')}</aside></div><details><summary>設計說明：結果存取範圍</summary><p>此範例只展示本次確認後的結果。訂單後續查詢權限、憑證到期後的結果存取和通用故障恢復仍屬 P-04，未自行新增永久查詢入口。</p></details></main>`;}
const renders={home,detail,cart,checkout,result};
document.title={home:'首頁／商品列表',detail:'商品詳情',cart:'購物車',checkout:'確認訂單',result:'訂單結果'}[page]+(document.body?.dataset?.presentation==='visual'?'｜視覺設計草稿':'｜線框草稿');
document.querySelector('#app').innerHTML=renders[page]()+`<footer class="store-footer"><span>日常選物 · Agent-Ready 商店（虛構）</span><span>設計草稿 / 商品資料：原始 Mock</span></footer>`;
function navigate(target,scene='normal',extra={},nextJourney=journey){
  if(parent!==window){parent.postMessage({type:'wireframe-nav',page:target,journey:nextJourney,state:scene,extra},'*');}
  else location.href='?'+new URLSearchParams({page:target,journey:nextJourney,state:scene,...extra});
}
function feedback(message){document.querySelector('#feedback').textContent=message;}
document.addEventListener('click',event=>{
  if(event.target.closest('[data-new-shopping]')){event.preventDefault();navigate('home','normal',{},'human');return;}
  const anchor=event.target.closest('[data-nav]');if(anchor){event.preventDefault();navigate(anchor.dataset.nav,anchor.dataset.state,anchor.dataset.product?{product:anchor.dataset.product}:{});return;}
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  switch(button.dataset.action){
    case 'add':feedback('已加入購物車（加購回饋示意；未變更實際購物資料）。');break;
    case 'remove':feedback('移除操作示意；請從上方狀態選單檢視空購物車。');break;
    case 'quantity':{
      const input=document.querySelector('#qty-'+button.dataset.id);const value=Number(input.value);const p=product(button.dataset.id);
      if(!Number.isInteger(value)||value<1||value>p.stock||(state==='stock'&&p.id==='P001')){input.setAttribute('aria-invalid','true');document.querySelector('#error-'+p.id).textContent='請輸入正整數，且不得超過目前庫存；輸入未自動更改。';}
      else if(p.id==='P001'&&value===2)navigate('cart','edited');else feedback('數量編輯示意：將 P001 改為 2 可檢視預設更新樣本。');break;
    }
    case 'confirm':if(state==='edited')navigate('result','normal',{composition:'edited'});else if(['price','sameTotal'].includes(state))navigate('result','normal',{composition:state});else navigate('result');break;
    case 'reviews-next':navigate('detail','reviews',{product:params.get('product')||'P001'});break;
    case 'reviews-first':navigate('detail','normal',{product:params.get('product')||'P001'});break;
    case 'catalog-next':navigate('home','normal',{catalogPage:Number(params.get('catalogPage')||0)+1});break;
    case 'catalog-prev':navigate('home','normal',{catalogPage:Number(params.get('catalogPage')||0)-1});break;
  }
});
document.querySelectorAll('form[data-demo]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();feedback('搜尋與篩選控件示意；可在上方切換「沒有符合商品」。查詢細則仍待確認。');}));
