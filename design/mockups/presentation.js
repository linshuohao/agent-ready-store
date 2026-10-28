'use strict';
// Original monochrome product illustrations for layout review; not product photos.
const art={
  earbuds:'<rect x="65" y="148" width="130" height="66" rx="29" fill="#e0e0de" stroke="currentColor" stroke-width="3"/><path d="M68 174h124" stroke="currentColor" stroke-width="2"/><path d="M91 61c-16 0-24 12-24 27s8 23 22 23h7v34h15V85c0-16-6-24-20-24Z" fill="#e0e0de" stroke="currentColor" stroke-width="3"/><path d="M169 61c16 0 24 12 24 27s-8 23-22 23h-7v34h-15V85c0-16 6-24 20-24Z" fill="#e0e0de" stroke="currentColor" stroke-width="3"/><path d="M82 80h8m80 0h8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
  headphones:'<path d="M61 152v-35a69 69 0 0 1 138 0v35" fill="none" stroke="currentColor" stroke-width="15"/><path d="M70 118a60 60 0 0 1 120 0" fill="none" stroke="#9a9a98" stroke-width="5"/><rect x="48" y="132" width="39" height="69" rx="16" fill="#cececc" stroke="currentColor" stroke-width="4"/><rect x="173" y="132" width="39" height="69" rx="16" fill="#cececc" stroke="currentColor" stroke-width="4"/>',
  bottle:'<rect x="108" y="42" width="44" height="29" rx="5" fill="#aaa" stroke="currentColor" stroke-width="3"/><path d="M108 71h44l14 20v105a13 13 0 0 1-13 13h-46a13 13 0 0 1-13-13V91Z" fill="#e0e0de" stroke="currentColor" stroke-width="3"/><path d="M105 114h50v52h-50" fill="#fafafa" stroke="#aaa" stroke-width="2"/><path d="M116 129h28m-24 10h20m-19 10h18" stroke="#999" stroke-width="2"/>',
  charger:'<rect x="83" y="91" width="94" height="106" rx="16" fill="#dededb" stroke="currentColor" stroke-width="3"/><path d="M109 91V62m42 29V62" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><rect x="107" y="155" width="46" height="13" rx="6" fill="#777"/><path d="M97 108h66" stroke="#aaa" stroke-width="2"/>',
  packet:'<path d="M82 45h96l11 170H71Z" fill="#dededb" stroke="currentColor" stroke-width="3"/><path d="M82 58h96M75 198h110" stroke="#888" stroke-width="2"/><rect x="91" y="96" width="78" height="64" fill="#fafafa"/><path d="M112 126c-4-12 17-24 28-13s-9 29-20 23" fill="none" stroke="#777" stroke-width="3"/>',
  object:'<rect x="79" y="64" width="102" height="143" rx="15" fill="#dededb" stroke="currentColor" stroke-width="3"/><path d="M95 84h70m-70 103h70" stroke="#888" stroke-width="2"/>'
};
document.querySelectorAll('.placeholder').forEach(el=>{
  const id=el.textContent.match(/P\d{3}/)?.[0]||'';
  const kind=['P001','P002'].includes(id)?'earbuds':id==='P005'?'headphones':['P009','P019','P022','P023','P025'].includes(id)?'bottle':id==='P004'?'charger':['P026','P027','P028','P029','P030'].includes(id)?'packet':'object';
  el.setAttribute('aria-label',id+' 商品示意圖，非實物照片');
  el.innerHTML='<svg class="product-art" viewBox="0 0 260 260" aria-hidden="true" focusable="false">'+art[kind]+'</svg><span class="art-caption">商品示意 · '+id+'</span>';
});
document.querySelectorAll('.footnote').forEach(el=>{
  if(el.textContent==='所有商品均為虛構資料。商品圖像暫以占位表示。')el.textContent='所有商品均為虛構資料。圖像為原創商品示意，非實物照片。';
});
