// Static fixture/transition checks only. This does not render HTML or test a browser.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const root=__dirname;
const fixtureCode=fs.readFileSync(path.join(root,'wireframes/fixtures.js'),'utf8');
const pageCode=fs.readFileSync(path.join(root,'wireframes/pages.js'),'utf8');
const scenes={home:['normal','boundaries','empty'],detail:['normal','reviews','soldout','invalid','unpriced'],cart:['normal','edited','invalid','stock','empty'],checkout:['normal','edited','price','sameTotal','stock','expired','pending','unknown'],result:['normal','retry']};
function render(page,journey='human',state='normal',extra={},standalone=false){
  const nodes=new Map();const listeners={};const messages=[];
  const document={title:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'1',attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(selector);},querySelectorAll(){return [];},addEventListener(type,fn){listeners[type]=fn;}};
  const browserWindow={};
  const scope={URLSearchParams,location:{search:'?'+new URLSearchParams({page,journey,state,...extra})},document,window:browserWindow,parent:standalone?browserWindow:{postMessage(message){messages.push(message);}}};
  vm.createContext(scope);vm.runInContext(fixtureCode+'\n'+pageCode,scope);
  function click(action,options={}){const button={dataset:{action,...options},disabled:false};listeners.click({target:{closest(selector){return selector==='[data-action]'?button:null;}}});}
  function nav(target,state='normal',extra={}){const anchor={dataset:{nav:target,state,...extra}};listeners.click({target:{closest(selector){return selector==='[data-nav]'?anchor:null;}},preventDefault(){}});}
  return {html:document.querySelector('#app').innerHTML,document,nodes,messages,click,nav,location:scope.location};
}
let count=0;
for(const [page,states] of Object.entries(scenes))for(const journey of ['human','agent'])for(const state of states){
  const view=render(page,journey,state);assert.match(view.html,/<main id="main">/);assert.equal((view.html.match(/<main /g)||[]).length,1);
  assert.match(view.document.title,/線框草稿/);assert.doesNotMatch(view.html,/undefined|NaN|margin_rate|recommendation_score/);count++;
}
// Standalone navigation must retain the HTML file rather than resolving a directory or .page path.
const standaloneBase='http://localhost/design/wireframes/pages.html';
const standaloneCart=render('cart','agent','normal',{},true);
standaloneCart.nav('checkout');
const standaloneTarget=new URL(standaloneCart.location.href,standaloneBase);
assert.equal(standaloneTarget.pathname,'/design/wireframes/pages.html');
assert.equal(standaloneTarget.searchParams.get('page'),'checkout');
assert.equal(standaloneTarget.searchParams.get('journey'),'agent');
for(const [page,state] of [['checkout','expired'],['result','normal']]){
  const html=render(page,'agent',state,{},true).html;
  const newShoppingLinks=[...html.matchAll(/href="([^"]+)" data-new-shopping/g)];
  assert.ok(newShoppingLinks.length>0);
  for(const match of newShoppingLinks){
    const target=new URL(match[1].replaceAll('&amp;','&'),standaloneBase);
    assert.equal(target.pathname,'/design/wireframes/pages.html');
    assert.equal(target.searchParams.get('page'),'home');
    assert.equal(target.searchParams.get('journey'),'human');
  }
}
// Exact immutable attachments; no Downloads dependency in the retained check.
const hashes={'UX_DECISIONS.md':'41b451a1f598fb9444cb9664ff340f2fb722ec4f4143dd9850b40d4dd590591d','UX_DECISIONS.html':'8186dc2e7c204294a4f48a4998e2ba25b4e276c2577a33dbbacff4bdeb19045e'};
for(const [name,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'references',name))).digest('hex'),hash);
const original=JSON.parse(fs.readFileSync(path.join(root,'../references/products.json'),'utf8')).products;
const fixtureScope=vm.createContext({});vm.runInContext(fixtureCode+'\nthis.items=PRODUCTS;',fixtureScope);
assert.equal(fixtureScope.items.length,30);
for(const item of fixtureScope.items){const source=original.find(p=>p.id===item.id);for(const key of Object.keys(item))assert.equal(JSON.stringify(item[key]),JSON.stringify(source[key]),`${item.id}.${key}`);assert.equal(item.margin_rate,undefined);}
const agent=render('checkout','agent');assert.match(agent.html,/A-示意-01/);assert.match(agent.html,/NT\$ 2,356.00/);assert.match(agent.html,/data-nav="cart"/);assert.doesNotMatch(agent.html,/登入表單|信用卡|收件地址/);
const human=render('checkout');assert.match(human.html,/NT\$ 2,480.00/);assert.doesNotMatch(human.html,/AI 購物優惠（95 折）/);
agent.nav('cart');assert.equal(agent.messages[0].page,'cart');assert.equal(agent.messages[0].journey,'agent');
const cart=render('cart','agent');cart.nav('checkout');assert.equal(cart.messages[0].journey,'agent');
const changed=render('checkout','agent','price');assert.match(changed.html,/role="alert"/);assert.match(changed.html,/2,451.00/);assert.match(changed.html,/確認更新內容並購買/);assert.equal(changed.messages.length,0);
changed.click('confirm');assert.equal(changed.messages[0].extra.composition,'price');assert.equal(changed.messages[0].page,'result');
assert.match(render('result','agent','normal',{composition:'price'}).html,/2,451.00/);
assert.match(render('result','agent','normal',{composition:'edited'}).html,/4,151.50/);
const unchangedTotal=render('checkout','agent','sameTotal');assert.match(unchangedTotal.html,/總額相同仍需確認/);assert.match(unchangedTotal.html,/確認更新內容並購買/);
const shortage=render('checkout','agent','stock');assert.match(shortage.html,/未移除商品、未購買其餘商品/);assert.match(shortage.html,/data-action="confirm" disabled/);assert.equal((shortage.html.match(/class="cart-item/g)||[]).length,2);
const expired=render('checkout','agent','expired');assert.doesNotMatch(expired.html,/data-action="confirm"|編輯購物車/);assert.match(expired.html,/24 小時/);
assert.doesNotMatch(expired.html,/data-nav="cart"/);
assert.doesNotMatch(render('result','agent').html,/data-nav="cart"/);
assert.doesNotMatch(render('cart','human','empty').html,/data-nav="checkout"/);
const invalid=render('cart','agent','invalid');invalid.nodes.set('#qty-P001',{value:'0',setAttribute(){}});invalid.click('quantity',{id:'P001'});assert.equal(invalid.nodes.get('#qty-P001').value,'0');assert.match(invalid.document.querySelector('#error-P001').textContent,/未自動更改/);
const edit=render('cart','agent');edit.nodes.set('#qty-P001',{value:'2',setAttribute(){}});edit.click('quantity',{id:'P001'});assert.equal(edit.messages[0].state,'edited');assert.equal(edit.messages[0].journey,'agent');
const listing=render('home');listing.click('add');assert.equal(listing.messages.length,0);assert.match(listing.document.querySelector('#feedback').textContent,/已加入購物車/);
const boundary=render('home','human','boundaries');for(const id of ['P002','P008','P010','P016'])assert.match(boundary.html,new RegExp(id));
const detail=render('detail');assert.match(detail.html,/配對很快/);assert.doesNotMatch(detail.html,/第二副了/);assert.match(render('detail','human','reviews').html,/第二副了/);
assert.match(render('result','agent','retry').html,/原訂單 範例-0001/);
for(const scene of ['pending','unknown'])assert.match(render('checkout','agent',scene).html,/data-action="confirm" disabled/);
// Check relative resource targets for every generated scene, and duplicate IDs.
for(const [page,states] of Object.entries(scenes))for(const state of states){const html=render(page,'agent',state).html;const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);}
const generated=['index.html','preview.css','preview.js','wireframes/pages.html','wireframes/styles.css','wireframes/pages.js','wireframes/fixtures.js','mockups/home.html','mockups/product.html','mockups/checkout.html','mockups/visual.css','mockups/presentation.js'];
for(const name of generated){const text=fs.readFileSync(path.join(root,name),'utf8');assert.doesNotMatch(text,/https?:\/\/|\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|WebSocket/);for(const m of text.matchAll(/(?:href|src)="([^"?#]+)(?:[?#][^"]*)?"/g)){if(m[1].includes('${'))continue;assert.ok(fs.existsSync(path.resolve(root,path.dirname(name),m[1])),`${name}: missing ${m[1]}`);}}
// Exercise the review shell's actual handlers with minimal document interfaces.
function control(dataset={}){return {dataset,value:'',style:{},handlers:{},setAttribute(k,v){this[k]=v;},addEventListener(k,v){this.handlers[k]=v;},replaceChildren(...items){this.items=items;}};}
const controls=new Map(['#preview','#journey','#scenario','#handoff','#annotation','#context'].map(s=>[s,control()]));
controls.get('#preview').contentWindow={};
const pageButtons=Object.keys(scenes).map(page=>control({page}));const widthButtons=['auto','1180','768','390'].map(width=>control({width}));const modeButtons=['visual','wireframe'].map(mode=>control({mode}));const windowHandlers={};
const shell=vm.createContext({URLSearchParams,Option:function(label,value){this.label=label;this.value=value;},document:{querySelector:s=>controls.get(s),querySelectorAll:s=>s==='[data-page]'?pageButtons:s==='[data-mode]'?modeButtons:widthButtons},window:{addEventListener:(k,v)=>windowHandlers[k]=v}});
vm.runInContext(fs.readFileSync(path.join(root,'preview.js'),'utf8'),shell);
assert.match(controls.get('#preview').src,/mockups\/home.html/);
modeButtons[1].handlers.click();assert.match(controls.get('#preview').src,/wireframes\/pages.html/);
modeButtons[0].handlers.click();assert.match(controls.get('#preview').src,/mockups\/home.html/);
controls.get('#handoff').handlers.click();assert.match(controls.get('#preview').src,/page=checkout&journey=agent/);
windowHandlers.message({source:controls.get('#preview').contentWindow,data:{type:'wireframe-nav',page:'cart',journey:'agent',state:'edited'}});
assert.match(controls.get('#preview').src,/page=cart&journey=agent&state=edited/);
windowHandlers.message({source:controls.get('#preview').contentWindow,data:{type:'wireframe-nav',page:'result',journey:'agent',state:'normal',extra:{composition:'edited'}}});
assert.match(controls.get('#preview').src,/composition=edited/);
widthButtons[3].handlers.click();assert.equal(controls.get('#preview').style.width,'390px');
assert.match(render('home').html,/data-product="P005"/);
assert.match(render('detail','human','normal',{product:'P005'}).html,/Studio 降噪頭戴式耳機/);
console.log(`PASS: ${count} page / journey / state fixtures; source hashes; 30 public Mock snapshots; identity-preserving navigation; quote snapshots; explicit re-confirmation; shortage / expiry / empty / retry states; quantity feedback; pagination; local assets; no API or storage.`);
console.log('LIMIT: this static script does not verify browser rendering or accessibility. Actual browser evidence and remaining gaps are recorded in docs/product/PRODUCT_DESIGN.md.');
