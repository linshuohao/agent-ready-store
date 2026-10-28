'use strict';
// Preview controls select finite design fixtures; they are not store capabilities.
const scenarios={home:[['normal','一般商品'],['boundaries','商品資料邊界'],['empty','沒有符合商品']],detail:[['normal','可購買商品／評論第 1 頁'],['reviews','評論第 2 頁'],['soldout','售罄商品'],['invalid','庫存異常'],['unpriced','價格待確認']],cart:[['normal','一般購物車'],['edited','數量調整範例'],['invalid','無效數量'],['stock','庫存不足'],['empty','空購物車']],checkout:[['normal','等待明確確認'],['edited','編輯後重新報價'],['price','報價變更'],['sameTotal','內容變更但總額相同'],['stock','提交時庫存不足'],['expired','交接連結已過期'],['pending','提交處理中'],['unknown','結果尚未確認']],result:[['normal','訂單成功'],['retry','重複提交／回傳原結果']]};
const annotations={home:'UX-01、UX-03：品牌區保持輕量；商品探索為主體。搜尋、篩選、排序與分頁僅展示控件及預設樣本，不定義 P-02 的查詢契約。加購留在原頁並提供輕量回饋。',detail:'UX-02、D-16、D-18：獨立商品詳情、規格、可購買狀態與分頁評論。同名商品以 ID 區分。圖片使用灰階占位，沒有虛構商品照片。',cart:'UX-03、UX-05、CART-06：編輯原購物車，保留來源。數量修改只切換 1 → 2 的固定展示樣本，沒有通用計價或購物車引擎。無效數量不自動修正；空車不能結帳。',checkout:'UX-04～05、EX-01～03：Agent 直接進入相同確認頁；編輯返回原車。原車識別為設計標記，不是真實存取憑證。任何關鍵購買內容變化均須再次確認；沒有額外付款步驟。',result:'D-06、D-21：展示最終確認的商品及金額快照。重試仍顯示同一個範例訂單；未實作下單、庫存、付款、持久化或訂單查詢權限。'};
let current={page:'home',journey:'human',state:'normal'};
let presentation='visual';
const visualEntries={home:'home.html',detail:'product.html',checkout:'checkout.html'};
if(typeof location!=='undefined'){
  const initial=new URLSearchParams(location.search);
  if(initial.get('mode')==='wireframe')presentation='wireframe';
  if(scenarios[initial.get('page')])current.page=initial.get('page');
  if(initial.get('journey')==='agent')current.journey='agent';
  if(scenarios[current.page].some(([key])=>key===initial.get('state')))current.state=initial.get('state');
}
const frame=document.querySelector('#preview');
function update(rebuild=true){
  document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===current.page)));
  document.querySelector('#journey').value=current.journey;
  if(rebuild){document.querySelector('#scenario').replaceChildren(...scenarios[current.page].map(([value,label])=>{const o=new Option(label,value);return o;}));}
  document.querySelector('#scenario').value=current.state;
  const params=new URLSearchParams(current);
  const visual=presentation==='visual'&&visualEntries[current.page];
  frame.src=(visual?'mockups/'+visualEntries[current.page]:'wireframes/pages.html')+'?'+params;
  frame.title=visual?'商城視覺設計草稿':'商城結構線框';
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===presentation)));
  document.querySelector('#annotation').textContent=annotations[current.page]+(visual?' 本視覺稿使用原創灰階商品示意圖，非實物照片；設計方向已接受，未完成的完整驗收項目見階段歸檔記錄。':'');
  document.querySelector('#context').textContent=(visual?'視覺參考（方向已接受）':'結構線框（結構已確認）')+' · '+(current.journey==='agent'?'Agent 範例購物車 A-示意-01':'一般範例購物車 H-示意-01')+' · '+scenarios[current.page].find(s=>s[0]===current.state)[1]+' · 純展示，不執行購買';
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{presentation=b.dataset.mode;update(false);}));
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{current.page=b.dataset.page;current.state='normal';update();}));
document.querySelector('#journey').addEventListener('change',e=>{current.journey=e.target.value;update(false);});
document.querySelector('#scenario').addEventListener('change',e=>{current.state=e.target.value;if(current.state==='expired')current.journey='agent';update(false);});
document.querySelector('#handoff').addEventListener('click',()=>{current={page:'checkout',journey:'agent',state:'normal'};update();});
document.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>{frame.style.width=b.dataset.width==='auto'?'100%':b.dataset.width+'px';document.querySelectorAll('[data-width]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
// Child navigation remains inside the selected shopping context and updates reviewer controls.
window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.data?.type!=='wireframe-nav')return;const next=event.data;if(!scenarios[next.page]||!['human','agent'].includes(next.journey)||!scenarios[next.page].some(s=>s[0]===next.state))return;current={page:next.page,journey:next.journey,state:next.state};for(const key of ['product','catalogPage','composition'])if(typeof next.extra?.[key]==='string'||typeof next.extra?.[key]==='number')current[key]=next.extra[key];update();});
update();
