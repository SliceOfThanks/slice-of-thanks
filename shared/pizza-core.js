/* Slice of Thanks shared pizza engine.
   Drawing, confetti and Gerald's review, taken from the approved prototype so pizzas look identical everywhere.
   Exposes window.SOTPizza. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
let treats={unlocked:[]};
let profile={};
let viewMonthOverride=null;
function viewMonth(){return viewMonthOverride||new Date().getMonth()+1}
const SAUCES={rose:{n:'Pink garlic',c:'#e98a9a',special:true},gold:{n:'Golden butter',c:'#e9c46a',special:true},gravy:{n:"Potato's Secret Sauce",c:'#8a5a2b',secret:true},red:{n:'Classic red',c:'#c23a28'},pesto:{n:'Pesto',c:'#5f8f3a'},white:{n:'Garlic white',c:'#f1e6cf'},bbq:{n:'BBQ',c:'#7a3518'},purple:{n:'Suspicious purple',c:'#7d3c98'}};
const CHEESES={
 mozz:{n:'Mozzarella',c:['#fff4c9','#f4c95c'],style:'melt'},cheddar:{n:'Cheddar',c:['#f9c247','#df8a22'],style:'melt'},
 parm:{n:'Parmesan',c:['#f6ebcd','#e3c27c'],style:'flake'},goat:{n:'Goat cheese',c:['#fffdf6','#f1dfb6'],style:'dollop'},
 vmozz:{n:'Vegan mozzarella',c:['#fffbea','#f1d88f'],style:'melt',vegan:true},vched:{n:'Vegan cheddar',c:['#fbd06a','#e6a03c'],style:'melt',vegan:true}};
const CHEESE_SAY={mozz:'Mozzarella. Classic. You cannot go wrong.',cheddar:'Cheddar on pizza? Bold. I am in.',parm:'Fancy little flakes. Very refined.',
 goat:'Goat cheese. Someone has taste.',vmozz:'Melty and plant-based. Nice.',vched:'Vegan cheddar. A modern classic.',none:'No cheese? I will allow it.'};
function cheeseKey(p){if(p.cheese===true)return p.vegan?'vmozz':'mozz';return p.cheese||null}
function swapCheese(k,vg){if(!k)return null;const toV={mozz:'vmozz',parm:'vmozz',goat:'vmozz',cheddar:'vched'},toR={vmozz:'mozz',vched:'cheddar'};return vg?(toV[k]||k):(toR[k]||k)}
const TOPS={
 pepStar:{n:'Star pepperoni',g:'special'},pepHeart:{n:'Heart pepperoni',g:'special'},coin:{n:'Gold coin',g:'special'},jackPep:{n:"Jack-o'-lantern pepperoni",g:'special'},
 paw:{n:'Paw print pepperoni',g:'special'},bone:{n:'Bone crust bite',g:'special'},shamrock:{n:'Shamrock basil',g:'special'},flower:{n:'Veggie flower',g:'special'},
 snowMozz:{n:'Snowflake mozzarella',g:'special'},blueChip:{n:'Blue corn chip',g:'special'},cap:{n:'Grad cap',e:'🎓',g:'special'},sparkle:{n:'Sparkler',e:'✨',g:'special'},
 pumpkin:{n:'Pumpkin',e:'🎃',g:'special'},bat:{n:'Bat',e:'🦇',g:'special'},ghost:{n:'Ghost',e:'👻',g:'special'},leaf:{n:'Fall leaf',e:'🍂',g:'special'},
 turkey:{n:'Turkey',e:'🦃',g:'special'},tree:{n:'Tree',e:'🎄',g:'special'},xstar:{n:'Star',e:'⭐',g:'special'},flake:{n:'Snowflake',e:'❄️',g:'special'},
 pepperoni:{n:'Pepperoni',g:'food',sw:'#b5302a'},olive:{n:'Olives',g:'food',sw:'#26221f'},mushroom:{n:'Mushrooms',g:'food',sw:'#d8c3a5'},
 basil:{n:'Basil',g:'food',sw:'#3d8f3f'},pepper:{n:'Peppers',g:'food',sw:'#4caf50'},pineapple:{n:'Pineapple',g:'food',sw:'#f5d24b'},
 sausage:{n:'Sausage',g:'meat',sw:'#8a4b2a'},ham:{n:'Ham',g:'meat',sw:'#f0a39c'},bacon:{n:'Bacon',g:'meat',sw:'#b5402e'},
 canadianBacon:{n:'Canadian bacon',g:'meat',sw:'#e8857e',pro:true},meatball:{n:'Meatballs',g:'meat',sw:'#7a4024',pro:true},bbqChicken:{n:'BBQ chicken',g:'meat',sw:'#c98b4e',pro:true},
 bananaPepper:{n:'Banana peppers',g:'veg',sw:'#d9cf45'},jalapeno:{n:'Jalapeños',g:'veg',sw:'#3f8f2f'},buffalo:{n:'Buffalo drizzle',g:'veg',sw:'#e5602b'},
 sunTomato:{n:'Sun-dried tomatoes',g:'veg',sw:'#9b2b1e',pro:true},pickle:{n:'Pickles',g:'veg',sw:'#8fae3c',pro:true},
 handshake:{n:'Handshake',e:'🤝',g:'meeting'},idea:{n:'Big idea',e:'💡',g:'meeting'},coffee:{n:'Coffee',e:'☕',g:'meeting'},
 rocket:{n:'Launch',e:'🚀',g:'meeting'},calendar:{n:'Next meeting',e:'📅',g:'meeting'},scales:{n:'Justice',e:'⚖️',g:'meeting'},
 duck:{n:'Rubber duck',e:'🦆',g:'silly'},sock:{n:'A sock',e:'🧦',g:'retired'},eyes:{n:'Googly eyes',e:'👀',g:'silly'},hat:{n:'Tiny hat',e:'🎩',g:'retired'}
};
function rng(seed){let s=(Math.floor(seed*1e6)>>>0)||1;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function hex(h){h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}
function mix(a,b,t){const A=hex(a),B=hex(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'}
const ease=t=>1-Math.pow(1-t,3);
function newPizza(){return{size:.58,seed:Math.random()*9+1,sauce:null,cheese:null,sauceDabs:[],cheeseDabs:[],tosses:0,_said:{},vegan:false,toppings:[],name:'',bake:0,baked:false}}
function labelText(p){if(p.sign&&p.sign.text)return p.sign.text;const ls=p.toppings.filter(t=>t.k==='label');if(!ls.length)return'';const g=ls[0].g;return ls.filter(t=>t.g===g).map(t=>t.label).join(' ')}
function clonePizza(p){const c=JSON.parse(JSON.stringify(p));c._slap=0;c._sauceAt=0;c._signAt=0;c._baking=false;c.toppings=c.toppings.map(t=>{delete t.born;return t});return c}
function defaultSignature(){
 const p={size:.92,seed:3.3,sauce:'red',cheese:true,bake:1,baked:true,name:'The Thank-You Special',toppings:[]};
 [[-.45,-.22],[.36,-.45],[.52,.2],[-.12,.52],[-.56,.3],[.26,.56],[-.28,-.56],[.6,-.12]].forEach(([x,y],i)=>p.toppings.push({k:'pepperoni',x,y,rot:i}));
 [[.02,-.4],[-.32,.12],[.44,-.02],[-.62,-.02],[.2,.32],[-.36,.58]].forEach(([x,y],i)=>p.toppings.push({k:'basil',x,y,rot:i*1.3}));
 p.toppings.push({k:'handshake',x:.34,y:.06,rot:.2});
 p.sign={text:'Thank you'};
 return p}
/* ---------- drawing ---------- */
let curShape='round';
function heartPath(c,cx,cy,r){const s=r*1.02,y0=cy+s*.08;c.beginPath();c.moveTo(cx,y0+s*.92);c.bezierCurveTo(cx-s*1.32,y0+s*.05,cx-s*.9,y0-s*1.05,cx,y0-s*.5);c.bezierCurveTo(cx+s*.9,y0-s*1.05,cx+s*1.32,y0+s*.05,cx,y0+s*.92);c.closePath()}
function base(c,cx,cy,r,seed,amt){if(curShape==='heart')heartPath(c,cx,cy,r);else blob(c,cx,cy,r,seed,amt)}
function blob(c,cx,cy,r,seed,amt){c.beginPath();for(let i=0;i<=72;i++){const a=i/72*Math.PI*2;
 const k=1+amt*(Math.sin(a*3+seed)*.5+Math.sin(a*5+seed*2)*.3+Math.sin(a*2+seed*3)*.2);
 const x=cx+Math.cos(a)*r*k,y=cy+Math.sin(a)*r*k;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath()}
function pep(c,r,b,vg){c.fillStyle=vg?mix('#c96a3c','#8f4422',b):mix('#c0392b','#8a2017',b);c.beginPath();c.arc(0,0,r,0,6.283);c.fill();
 if(vg){c.fillStyle='rgba(70,120,40,.75)';for(let i=0;i<6;i++){const a=i*1.05+.2,d=r*.6;c.beginPath();c.ellipse(Math.cos(a)*d,Math.sin(a)*d,r*.11,r*.05,a,0,6.283);c.fill()}}
 c.fillStyle=vg?'rgba(255,235,205,.22)':'rgba(255,215,195,.35)';for(let i=0;i<5;i++){const a=i*1.3+.4,d=r*.55;c.beginPath();c.arc(Math.cos(a)*d,Math.sin(a)*d,r*.1,0,6.283);c.fill()}
 c.strokeStyle='rgba(70,8,4,.35)';c.lineWidth=r*.12;c.beginPath();c.arc(0,0,r*.9,0,6.283);c.stroke()}
function drawTop(c,t,cx,cy,R,u,b,now,vg){
 let x=cx+t.x*R,y=cy+t.y*R,s=t.s||1;
 if(t.born){const a=(now-t.born)/320;if(a<0)return;if(a<1){y-=(1-ease(a))*40*u;s*=1+.3*(1-a)}}
 c.save();c.translate(x,y);c.scale(s,s);
 const def=TOPS[t.k];
 if(def&&def.e){c.rotate((((t.rot*7)%1+1)%1-.5)*.7);c.font=(22*u)+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(def.e,0,1*u);c.restore();return}
 c.rotate(t.rot||0);
 switch(t.k){
  case 'pepperoni':pep(c,13*u,b,vg);break;
  case 'label':{const r=25*u;pep(c,r,b,vg);let fs=11*u;c.font='700 '+fs+'px "Work Sans",system-ui,sans-serif';
   while(c.measureText(t.label).width>r*1.7&&fs>5*u){fs-=.5*u;c.font='700 '+fs+'px "Work Sans",system-ui,sans-serif'}
   c.fillStyle='#fff6ea';c.textAlign='center';c.textBaseline='middle';c.fillText(t.label,0,.5*u);break}
  case 'olive':c.beginPath();c.arc(0,0,5.5*u,0,6.283);c.lineWidth=3.2*u;c.strokeStyle='#26221f';c.stroke();break;
  case 'mushroom':c.fillStyle=mix('#e8d6bc','#c49f73',b);c.beginPath();c.ellipse(0,0,9*u,6.5*u,0,Math.PI,0);c.fill();c.fillRect(-3*u,-.5*u,6*u,7*u);
   c.strokeStyle='rgba(90,60,30,.4)';c.lineWidth=1*u;c.beginPath();c.moveTo(-8*u,0);c.lineTo(8*u,0);c.stroke();break;
  case 'basil':c.fillStyle=mix('#3d8f3f','#2a5a28',b);c.beginPath();c.ellipse(0,0,10*u,4.6*u,0,0,6.283);c.fill();
   c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1*u;c.beginPath();c.moveTo(-9*u,0);c.lineTo(9*u,0);c.stroke();break;
  case 'pepper':c.strokeStyle='#3b9a3f';c.lineWidth=3.4*u;c.lineCap='round';c.beginPath();c.arc(0,0,8*u,.3,2.7);c.stroke();break;
  case 'pineapple':c.fillStyle='#f5d24b';c.beginPath();c.moveTo(0,-7*u);c.lineTo(7*u,6*u);c.lineTo(-7*u,6*u);c.closePath();c.fill();
   c.strokeStyle='rgba(160,120,0,.35)';c.lineWidth=1*u;c.stroke();break;
  case 'sausage':{c.scale(1.4,1.4);c.fillStyle=mix('#9a5a33','#5e3018',b);[[0,0,5.2],[-4.5,-3,3.6],[4.4,-2.6,3.4],[-3.2,4,3.3],[3.6,3.8,3.1]].forEach(([x,y,r])=>{c.beginPath();c.arc(x*u,y*u,r*u,0,6.283);c.fill()});
   c.fillStyle='rgba(255,220,180,.28)';[[-1.5,-1.5],[3,2],[-3,3]].forEach(([x,y])=>{c.beginPath();c.arc(x*u,y*u,1*u,0,6.283);c.fill()});break}
  case 'ham':c.scale(1.4,1.4);c.fillStyle=mix('#f4aaa3','#d8786e',b);c.beginPath();c.moveTo(-7*u,-6*u);c.lineTo(7*u,-7*u);c.lineTo(8*u,6*u);c.lineTo(-6*u,7*u);c.closePath();c.fill();
   c.strokeStyle='rgba(255,240,235,.6)';c.lineWidth=1.4*u;c.stroke();break;
  case 'bacon':{c.scale(1.75,1.75);const wave=(off,dir)=>{for(let i=0;i<=12;i++){const x=(-11+i*22/12)*u,y=(Math.sin(i/12*Math.PI*3)*2+off)*u;if(i===0&&dir)c.moveTo(x,y);else c.lineTo(x,y)}};
   const back=(off)=>{for(let i=12;i>=0;i--){const x=(-11+i*22/12)*u,y=(Math.sin(i/12*Math.PI*3)*2+off)*u;c.lineTo(x,y)}};
   c.beginPath();wave(-3.2,true);back(3.2);c.closePath();c.fillStyle=mix('#c4482f','#7e2a17',b);c.fill();
   c.beginPath();wave(-1.9,true);back(-.9);c.closePath();c.fillStyle=mix('#f4d2bd','#d19a76',b);c.fill();
   c.beginPath();wave(.9,true);back(1.8);c.closePath();c.fill();break}
  case 'canadianBacon':c.scale(1.15,1.15);c.fillStyle=mix('#ec958d','#c9665c',b);c.beginPath();c.arc(0,0,10*u,0,6.283);c.fill();c.strokeStyle=mix('#b8564f','#86352e',b);c.lineWidth=2*u;c.stroke();
   c.fillStyle='rgba(255,235,230,.35)';c.beginPath();c.ellipse(-3*u,-3*u,3*u,1.6*u,-.6,0,6.283);c.fill();break;
  case 'meatball':c.scale(1.4,1.4);c.fillStyle=mix('#875030','#4f2812',b);c.beginPath();c.arc(0,0,7.5*u,0,6.283);c.fill();c.fillStyle='rgba(0,0,0,.18)';[[2,2],[-2.5,1.5],[1,-3]].forEach(([x,y])=>{c.beginPath();c.arc(x*u,y*u,1.2*u,0,6.283);c.fill()});
   c.fillStyle='rgba(255,220,190,.4)';c.beginPath();c.arc(-2.5*u,-2.5*u,2*u,0,6.283);c.fill();break;
  case 'bbqChicken':c.scale(1.4,1.4);c.fillStyle=mix('#e0b07a','#b9824a',b);c.beginPath();c.moveTo(-6*u,-4*u);c.lineTo(5*u,-5.5*u);c.lineTo(7*u,3*u);c.lineTo(-1*u,6*u);c.lineTo(-7*u,2*u);c.closePath();c.fill();
   c.strokeStyle='#7a3518';c.lineWidth=2*u;c.lineCap='round';c.beginPath();c.moveTo(-4*u,-1*u);c.quadraticCurveTo(0,-4*u,4*u,0);c.stroke();break;
  case 'bananaPepper':c.scale(1.4,1.4);c.strokeStyle=mix('#dcd34a','#b5a52e',b);c.lineWidth=2.6*u;c.beginPath();c.arc(0,0,6.5*u,0,6.283);c.stroke();
   c.fillStyle='rgba(250,245,200,.9)';[[1.5,0],[-1.2,1.4],[-.6,-1.8]].forEach(([x,y])=>{c.beginPath();c.arc(x*u,y*u,.9*u,0,6.283);c.fill()});break;
  case 'jalapeno':c.scale(1.4,1.4);c.fillStyle=mix('#3f8f2f','#2a6020',b);c.beginPath();c.arc(0,0,6.5*u,0,6.283);c.fill();c.fillStyle='#d8e8b0';c.beginPath();c.arc(0,0,4.2*u,0,6.283);c.fill();
   c.fillStyle='#f4f0d0';[[1.6,0],[-.8,1.4],[-.8,-1.4]].forEach(([x,y])=>{c.beginPath();c.arc(x*u,y*u,.9*u,0,6.283);c.fill()});break;
  case 'buffalo':c.scale(1.15,1.15);c.strokeStyle='#e5602b';c.lineWidth=2.8*u;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(-14*u,-3*u);c.bezierCurveTo(-8*u,-9*u,-4*u,7*u,1*u,0);c.bezierCurveTo(5*u,-6*u,9*u,6*u,14*u,2*u);c.stroke();break;
  case 'sunTomato':c.scale(1.4,1.4);c.fillStyle=mix('#a7321f','#6e1b10',b);c.beginPath();c.ellipse(0,0,8*u,5*u,0,0,6.283);c.fill();c.strokeStyle='rgba(60,10,5,.45)';c.lineWidth=1*u;
   c.beginPath();c.moveTo(-5*u,-1.5*u);c.quadraticCurveTo(0,1.5*u,5*u,-1.5*u);c.moveTo(-4*u,2*u);c.quadraticCurveTo(0,4*u,4*u,1.5*u);c.stroke();break;
  case 'pickle':c.scale(1.4,1.4);c.fillStyle=mix('#98b545','#6b8a2a',b);c.beginPath();for(let i=0;i<=16;i++){const a=i/16*6.283,r=(i%2?7:7.8)*u;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();
   c.fillStyle='#d9e6a6';c.beginPath();c.arc(0,0,4.6*u,0,6.283);c.fill();c.fillStyle='#8aa23a';[[1.8,0],[-.9,1.6],[-.9,-1.6]].forEach(([x,y])=>{c.beginPath();c.ellipse(x*u,y*u,1.1*u,.7*u,0,0,6.283);c.fill()});break;
  case 'pepStar':c.fillStyle=(vg?mix('#c96a3c','#8f4422',b):mix('#c0392b','#8a2017',b));star(c,14*u);break;
  case 'pepHeart':c.fillStyle=(vg?mix('#c96a3c','#8f4422',b):mix('#c0392b','#8a2017',b));c.save();c.translate(0,3*u);heart(c,15*u);c.restore();break;
  case 'coin':c.fillStyle='#e7b931';c.beginPath();c.arc(0,0,9*u,0,6.283);c.fill();c.strokeStyle='#a8801a';c.lineWidth=1.6*u;c.stroke();c.beginPath();c.arc(0,0,5.5*u,0,6.283);c.stroke();break;
  case 'jackPep':c.fillStyle=mix('#e8771e','#b5561a',b);c.beginPath();c.arc(0,0,13*u,0,6.283);c.fill();c.fillStyle='#2a1608';c.beginPath();c.moveTo(-6*u,-2*u);c.lineTo(-1.5*u,-2*u);c.lineTo(-3.8*u,-7*u);c.closePath();c.moveTo(6*u,-2*u);c.lineTo(1.5*u,-2*u);c.lineTo(3.8*u,-7*u);c.closePath();c.fill();c.beginPath();c.moveTo(-7.5*u,3*u);for(let i=0;i<=6;i++)c.lineTo(-7.5*u+i*15*u/6,(i%2?7:3)*u);c.closePath();c.fill();break;
  case 'paw':c.fillStyle=(vg?mix('#c96a3c','#8f4422',b):mix('#c0392b','#8a2017',b));c.beginPath();c.ellipse(0,3*u,6.5*u,5.5*u,0,0,6.283);c.fill();[[-6.5,-3.5],[-2.4,-7.5],[2.4,-7.5],[6.5,-3.5]].forEach(([x,y])=>{c.beginPath();c.arc(x*u,y*u,2.7*u,0,6.283);c.fill()});break;
  case 'bone':c.fillStyle=mix('#f0d29c','#d39a52',b);[[-8,-2.6],[-8,2.6],[8,-2.6],[8,2.6]].forEach(([x,y])=>{c.beginPath();c.arc(x*u,y*u,3.4*u,0,6.283);c.fill()});c.fillRect(-8*u,-2.6*u,16*u,5.2*u);break;
  case 'shamrock':c.fillStyle='#3b8f3a';[0,2.094,4.189].forEach(a=>{c.beginPath();c.arc(Math.cos(a-1.571)*5*u,Math.sin(a-1.571)*5*u,4.8*u,0,6.283);c.fill()});c.strokeStyle='#2a6a28';c.lineWidth=2*u;c.lineCap='round';c.beginPath();c.moveTo(0,2*u);c.lineTo(2.5*u,11*u);c.stroke();break;
  case 'flower':{const fc=['#e23b2e','#f5c518','#f08a24'][Math.floor(((t.rot*10)%3+3)%3)];c.fillStyle=fc;for(let i=0;i<5;i++){const a=i*1.2566;c.beginPath();c.ellipse(Math.cos(a)*6*u,Math.sin(a)*6*u,4.8*u,3*u,a,0,6.283);c.fill()}c.fillStyle='#26221f';c.beginPath();c.arc(0,0,3.4*u,0,6.283);c.fill();break}
  case 'snowMozz':c.strokeStyle='#fffdf4';c.lineWidth=2.8*u;c.lineCap='round';for(let i=0;i<3;i++){const a=i*1.047;c.beginPath();c.moveTo(Math.cos(a)*10*u,Math.sin(a)*10*u);c.lineTo(-Math.cos(a)*10*u,-Math.sin(a)*10*u);c.stroke()}break;
  case 'blueChip':c.fillStyle='#3b5bab';c.beginPath();c.moveTo(0,-6*u);c.lineTo(6*u,5*u);c.lineTo(-6*u,5*u);c.closePath();c.fill();break;
 }
 c.restore()}
function drawPizza(cv,p,px,now){
 const dpr=Math.min(2,window.devicePixelRatio||1);const W=px||cv.clientWidth||300;
 const want=Math.round(W*dpr);if(cv.width!==want){cv.width=want;cv.height=want}
 const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,W);
 now=now||performance.now();const u=W/300;let fl=null;
 if(p._slap){const a=(now-p._slap)/720;if(a<1)fl=a}
 const cx=W/2,cy=W/2,R=W*.48*p.size,b=p.bake||0,seed=p.seed;curShape=p.shape||'round';
 c.save();
 if(fl!==null){const e=fl<.5?2*fl*fl:1-Math.pow(-2*fl+2,2)/2,h=Math.sin(fl*Math.PI);
  c.fillStyle='rgba(40,15,5,'+(.28*(1-h*.7))+')';c.beginPath();c.ellipse(cx,cy+R*.92,R*(1-h*.4),R*.1*(1-h*.4),0,0,6.283);c.fill();
  let sy=Math.cos(e*Math.PI*2);if(Math.abs(sy)<.05)sy=sy<0?-.05:.05;
  c.translate(cx,cy-h*W*.2);c.rotate(e*Math.PI*.6);c.scale(1+h*.05,sy);c.translate(-cx,-cy)}
 c.save();c.shadowColor='rgba(0,0,0,.25)';c.shadowBlur=14*u;c.shadowOffsetY=5*u;base(c,cx,cy,R,seed,.045);c.fillStyle=mix('#efd7a6','#c98742',b);c.fill();c.restore();
 const g=c.createRadialGradient(cx,cy,R*.72,cx,cy,R*1.05);g.addColorStop(0,mix('#f3dfb4','#dba664',b));g.addColorStop(1,mix('#e4c48e','#a4602a',b));
 base(c,cx,cy,R,seed,.045);c.fillStyle=g;c.fill();
 if(p.sauceDabs&&p.sauceDabs.length){c.save();base(c,cx,cy,R*.88,seed+1,.03);c.clip();for(const d of p.sauceDabs){c.fillStyle=mix(SAUCES[d.k].c,'#000000',b*.15);c.beginPath();c.arc(cx+d.x*R,cy+d.y*R,d.r*R,0,6.283);c.fill()}c.restore()}
 else if(p.sauce&&!p.sauceDabs){let sa=1;if(p._sauceAt){const a=(now-p._sauceAt)/550;if(a<1)sa=.2+.8*ease(a)}
  base(c,cx,cy,R*.84*sa,seed+1,.03);c.fillStyle=mix(SAUCES[p.sauce].c,'#000000',b*.15);c.fill()}
 if(p.cheeseDabs){c.save();base(c,cx,cy,R*.92,seed+1,.03);c.clip();
  p.cheeseDabs.forEach((d,i)=>{const cd=CHEESES[d.k];if(!cd)return;c.fillStyle=mix(cd.c[0],cd.c[1],b);c.globalAlpha=.95;const x=cx+d.x*R,y=cy+d.y*R;
   if(cd.style==='flake'){c.save();c.translate(x,y);c.rotate(d.s);c.fillRect(-R*.035,-R*.012,R*.07,R*.024);c.restore()}
   else if(cd.style==='dollop'){c.beginPath();c.arc(x,y,R*.045*d.r,0,6.283);c.fill()}
   else{blob(c,x,y,R*.075*d.r*(1+b*.35),d.s,.22);c.fill()}
   if(b>.4&&i%3===0&&cd.style!=='flake'){c.globalAlpha=1;c.fillStyle='rgba(150,80,25,'+((b-.4)*.55)+')';c.beginPath();c.arc(x+R*.02,y,R*.018,0,6.283);c.fill()}});
  c.globalAlpha=1;c.restore()}
 else{const ck=cheeseKey(p);if(ck&&p.sauce){const r=rng(seed+7),cd=CHEESES[ck];c.fillStyle=mix(cd.c[0],cd.c[1],b);c.globalAlpha=.94;
  if(cd.style==='flake'){for(let i=0;i<90;i++){const a=r()*6.283,d=Math.sqrt(r())*R*.78;c.save();c.translate(cx+Math.cos(a)*d,cy+Math.sin(a)*d);c.rotate(r()*3);c.fillRect(-R*.035,-R*.012,R*.07,R*.024);c.restore()}}
  else if(cd.style==='dollop'){for(let i=0;i<14;i++){const a=r()*6.283,d=Math.sqrt(r())*R*.7;c.beginPath();c.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,R*(.06+r()*.04),0,6.283);c.fill()}}
  else for(let i=0;i<26;i++){const a=r()*6.283,d=Math.sqrt(r())*R*.68;blob(c,cx+Math.cos(a)*d,cy+Math.sin(a)*d,R*(.11+r()*.1),r()*9,.2);c.fill()}
  c.globalAlpha=1;if(b>.4){c.fillStyle='rgba(150,80,25,'+((b-.4)*.6)+')';for(let i=0;i<20;i++){const a=r()*6.283,d=Math.sqrt(r())*R*.72;c.beginPath();c.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,R*(.015+r()*.03),0,6.283);c.fill()}}}}
 if(p.baked&&p.bakeLevel>0)bakeMarks(c,p,cx,cy,R,seed);
 if(p._baking){const r=rng(Math.floor(now/180)+seed);c.fillStyle='rgba(255,252,235,.7)';for(let i=0;i<9;i++){const a=r()*6.283,d=Math.sqrt(r())*R*.7;c.beginPath();c.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,R*(.015+r()*.025),0,6.283);c.fill()}}
 for(const t of p.toppings)drawTop(c,t,cx,cy,R,u,b,now,p.vegan);
 if(p.sign&&p.sign.text)drawSign(c,p.sign.text,cx,cy,R,u,now,p._signAt,p.vegan,b);
 c.restore();
}
/* Longer bakes show on the pizza: 1 = cheese bubbles, 2 = leopard char on the crust, 3 = darker crispy edge and oregano */
function bakeMarks(c,p,cx,cy,R,seed){const lv=p.bakeLevel,r=rng(seed+31);c.save();
 if(p.cheese||p.cheeseDabs){for(let i=0;i<(lv>=3?16:11);i++){const a=r()*6.283,d=Math.sqrt(r())*R*.7,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,s=R*(.022+r()*.022);
  c.fillStyle='rgba(255,236,190,.55)';c.beginPath();c.arc(x,y,s,0,6.283);c.fill();
  c.fillStyle='rgba(140,70,20,.55)';c.beginPath();c.arc(x+s*.25,y+s*.2,s*.5,0,6.283);c.fill()}}
 base(c,cx,cy,R,seed,.045);c.clip();
 if(lv>=3){base(c,cx,cy,R,seed,.045);c.strokeStyle='rgba(95,45,12,.38)';c.lineWidth=R*.09;c.stroke()}
 if(lv>=2){for(let i=0;i<(lv>=3?30:22);i++){const a=r()*6.283,d=R*(.91+r()*.07),x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d;
  c.fillStyle='rgba(55,25,8,'+(.45+r()*.35)+')';blob(c,x,y,R*(.014+r()*.018),r()*9,.3);c.fill()}}
 c.restore();
 if(lv>=3){c.save();c.fillStyle='#4f6b2a';for(let i=0;i<40;i++){const a=r()*6.283,d=Math.sqrt(r())*R*.78;c.save();c.translate(cx+Math.cos(a)*d,cy+Math.sin(a)*d);c.rotate(r()*3);c.fillRect(-R*.009,-R*.004,R*.018,R*.008);c.restore()}c.restore()}}
function wrapLines(c,text,max){const words=text.split(/\s+/);const lines=[];let cur='';
 for(const w of words){const t=cur?cur+' '+w:w;if(c.measureText(t).width<=max||!cur)cur=t;else{lines.push(cur);cur=w}}if(cur)lines.push(cur);return lines}
function drawSign(c,text,cx,cy,R,u,now,at,vg,b){
 const words=text.trim().split(/\s+/);let d=.34,rows=null;
 for(;d>=.1;d-=.01){const maxW=1.5/d;rows=[];let cur=[];let ok=true;
  for(const w of words){if(w.length>maxW){ok=false;break}const len=cur.length?cur.join(' ').length+1+w.length:w.length;
   if(len<=maxW)cur.push(w);else{rows.push(cur);cur=[w]}}
  if(cur.length)rows.push(cur);if(ok&&rows.length*d*1.05<=1.25)break}
 const lines=rows.map(r=>r.join(' ')),rr=d*R*.5,step=d*R,lh=d*R*1.05,top=cy-(lines.length-1)*lh/2;let k=0;
 lines.forEach((ln,li)=>{const chars=ln.split(''),w=(chars.length-1)*step;
  chars.forEach((ch,ci)=>{const i=k++;if(ch===' ')return;
   let y=top+li*lh+Math.sin(i*2.3)*rr*.08,sc=1;
   if(at){const t=(now-at-i*55)/320;if(t<0)return;if(t<1){y-=(1-ease(t))*40*u;sc=1+.3*(1-t)}}
   c.save();c.translate(cx-w/2+ci*step,y);c.rotate(Math.sin(i*1.7)*.12);c.scale(sc,sc);pep(c,rr*.98,b,vg);
   c.fillStyle='#fff6ea';c.textAlign='center';c.textBaseline='middle';c.font='800 '+(rr*1.15)+'px "Work Sans",system-ui,sans-serif';
   c.fillText(ch.toUpperCase(),0,rr*.06);c.restore()})});
}
function pizzaImage(p,bitten){const cv=document.createElement('canvas');const pc=clonePizza(p);drawPizza(cv,pc,340);
 if(bitten){const c=cv.getContext('2d'),R=340*.48*(pc.size||.9),a=-.75,bx=170+Math.cos(a)*R*1.02,by=170+Math.sin(a)*R*1.02;c.save();c.globalCompositeOperation='destination-out';
  [[0,0,.09],[.1,.06,.07],[-.07,.09,.06]].forEach(([dx,dy,r])=>{c.beginPath();c.arc(bx+dx*R,by+dy*R,r*R,0,6.283);c.fill()});c.restore()}
 try{return cv.toDataURL('image/png')}catch(e){return''}}

function review(p,b){
 const n=p.toppings.length,has=k=>p.toppings.some(t=>t.k===k),lab=labelText(p),occ=String(b.sticker||'').toLowerCase(),lw=String(lab||'').toLowerCase(),
  CEL=['retire','birthday','bday','congrat','anniversar','wedding','baby','graduat','promotion','new job','holiday','christmas','new year','engag','new home'],
  pers=b.kind==='personal'||b.personal===true||CEL.some(w=>lw.indexOf(w)>=0)||!!(occ&&occ.indexOf('thank')<0&&!['great meeting','nice to meet you','following up',"let's do this"].includes(occ));
 const lines=[];
 if(b.tone==='polished'){
  lines.push(lab?'A thoughtful touch with the "'+lab+'" spelled in pepperoni. '+(pers?'Someone is very loved.':'Clearly a productive meeting.'):'Balanced, well dressed, and delivered on time.');
  if(p.vegan)lines.push('Fully plant-based and thoughtfully made.');
  lines.push(p.bakeLevel===3?'Five full minutes in the oven. Crispy, golden and perfectly charred.':p.bake<.6?'Lightly baked. Fresh, like a new partnership.':'The crust shows real follow-through.');
  return{text:lines.join(' '),stars:5}}
 if(n>60)lines.push('I counted '+n+' toppings and lost track twice. Respect.');
 else if(n<4)lines.push('Minimalist. Confident. I see what you did here.');
 if(has('duck'))lines.push('There is a duck on this pizza. I have questions and no complaints.');
 if(has('sock'))lines.push('Is that a sock? Bold.');
 if(has('sausage')||has('ham')||has('bacon')||has('canadianBacon')||has('meatball')||has('bbqChicken')){const meats=['sausage','ham','bacon','canadianBacon','meatball','bbqChicken'].filter(has).length;
  lines.push(meats>=5?'Every meat in the kitchen. My cardiologist and I are both impressed.':meats>=3?'A serious meat lineup. This pizza means business.':has('bacon')?'Bacon. Nobody has ever been sad about bacon.':'A little protein. Strong choice.')}
 if(has('jalapeno')||has('buffalo'))lines.push(has('buffalo')?'Buffalo drizzle. I needed a glass of milk to finish this review.':'Jalapeños. Brave, a little dangerous. I like it.');
 if(has('pickle'))lines.push('Pickles on a pizza. I was skeptical. I am now a believer.');
 if(lab)lines.push('Spelling "'+lab+'" in pepperoni? '+(pers?'Someone is feeling very special.':'This meeting went well.'));
 if(p.vegan)lines.push('Plant-based and still bold. I approve.');
 const ck=cheeseKey(p);if(ck==='goat')lines.push('Goat cheese. Someone has taste.');else if(ck==='parm')lines.push('The parmesan flakes are very refined.');else if(!ck)lines.push('No cheese. Brave.');
 if(has('handshake'))lines.push('Strong handshake energy.');
 if(p.sauce==='purple')lines.push('The purple sauce is a mystery I am choosing to trust.');
 if(p.bake<.6)lines.push('A little doughy. Brave choice.');
 if(!lines.length)lines.push('Solid crust, honest sauce, a pizza made by someone who cares.');
 const bl=BAKE_LINES[p.bakeLevel];if(bl)lines.unshift(bl);
 if(p.byGerald)lines.unshift('I made this one myself, so I am not allowed to say it is perfect. It is perfect.');
 return{text:lines.slice(0,3).join(' '),stars:p.byGerald||p.bakeLevel===3?5:p.bake<.6?4:5}}
const BAKE_LINES=['Quick bake. Somebody has a meeting to get to.','','Stone-fired. Look at those char spots on the crust.',"Five full minutes in the oven. Crispy edge, perfect char, a little oregano. Chef's kiss."];
/* ---------- confetti ---------- */
const CONFETTI=[['none','None'],['classic','Classic confetti'],['fireworks','Fireworks'],['paws','Paw prints'],['shamrocks','Shamrocks'],['petals','Flower petals'],['leaves','Falling leaves'],['bats','Bats'],['caps','Grad caps'],['suns','Suns'],['pizza','Pizza slices'],['hearts','Hearts'],['stars','Stars'],['gold','Gold sparkles'],['brand','Brand color confetti'],['logo','Logo confetti'],['snow','Snowflakes'],['envelopes','Pizza envelopes'],['gerald',"Gerald's chef hats"]];
const PRO_CONF=['gold','brand','logo'];
const SEASONAL={shamrocks:[3],bats:[10],snow:[12,1],leaves:[10,11],petals:[4,5],caps:[5,6],paws:[8],fireworks:[7],suns:[6,7,8,9]};
function inSeason(k,m){const s=SEASONAL[k];return !s||s.includes(m||viewMonth())}
function seasonConfetti(){return CONFETTI.filter(c=>inSeason(c[0])).map(([v,l])=>[v,SEASONAL[v]?l+' (this month only)':l])}
function okConf(k){return k&&inSeason(k)?k:'classic'}
let rCurrentBox=null,cparts=[],cRaf=0;
const cfx=(()=>{let c=document.getElementById('sot-confetti');if(!c){c=document.createElement('canvas');c.id='sot-confetti';c.setAttribute('aria-hidden','true');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';(document.body||document.documentElement).appendChild(c)}return c})();
let logoImg=null;
const CPAL={gerald:['#ffffff','#c4122f'],crumbs:['#d9a35e','#c98a52','#b07a3a','#c23a28'],classic:['#c4122f','#f1ad2d','#4c6b28','#2b6cb0','#e86a92','#7d3c98'],hearts:['#c4122f','#e86a92','#ff8fab','#a10e27'],stars:['#f1ad2d','#ffd166','#fff1b8'],
 gold:['#f6d365','#e0b04a','#fff4c2','#c9962c'],snow:['#ffffff','#e6f0ff','#cfe3ff'],pizza:['#f1ad2d'],potato:['#eab983'],shamrocks:['#2e8b3e','#4caf50','#1f6b2c'],
 petals:['#f7a8c4','#f6d365','#ff8a8a','#c9a0f0'],caps:['#2b2b2b','#1f2a5a'],fireworks:['#c4122f','#2b5fb8','#f1ad2d','#ffffff'],paws:['#8a6656','#c98a52','#5a3a2a'],
 suns:['#f1ad2d','#ffcf4a','#f08a24'],bats:['#2b2523','#4a3b55'],leaves:['#d9661f','#b5481c','#e3a33a','#8a5a2b']};
const FALLING=['snow','leaves','petals'];
function burst(kind){if(!kind||kind==='none')return;try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){}
 const W=innerWidth,H=innerHeight,dpr=Math.min(2,devicePixelRatio||1);cfx.width=W*dpr;cfx.height=H*dpr;const c=cfx.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 const pal=kind==='brand'?[profile.brand1||'#1f4e79',profile.brand2||'#f1ad2d','#ffffff']:(CPAL[kind]||CPAL.classic);
 if(kind==='logo'&&profile.logo&&(!logoImg||logoImg.src!==profile.logo)){logoImg=new Image();logoImg.src=profile.logo}
 if(kind==='fireworks'){for(let k=0;k<5;k++){setTimeout(()=>{const ox=W*(.15+.7*Math.random()),oy=H*(.15+.3*Math.random()),col=pal[k%pal.length];
   for(let i=0;i<70;i++){const a=i/70*6.283,sp=2+Math.random()*4.5;cparts.push({kind,col:Math.random()<.25?'#ffffff':col,x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,g:.05,s:2.6,rot:0,vr:0,life:80+Math.random()*30,ph:0})}
   if(!cRaf)cRaf=requestAnimationFrame(cFrame)},k*320)}return}
 const fall=FALLING.includes(kind),big=['pizza','potato','caps','bats','paws','logo','gerald','envelopes'].includes(kind);
 const n=fall?(kind==='snow'?110:90):big?60:150;
 for(let i=0;i<n;i++){cparts.push({kind,col:pal[i%pal.length],
  x:fall?Math.random()*W:W/2+(Math.random()-.5)*80,y:fall?-Math.random()*H*.6:H*.5,
  vx:fall?(Math.random()-.5)*.8:(Math.random()-.5)*16,vy:fall?1+Math.random()*1.6:-(7+Math.random()*12),
  g:fall?.01:.33,s:kind==='logo'?14+Math.random()*8:kind==='crumbs'?2+Math.random()*3:kind==='pizza'?14+Math.random()*8:kind==='gold'?2+Math.random()*3:big?10+Math.random()*6:fall&&kind!=='snow'?8+Math.random()*5:5+Math.random()*6,
  rot:Math.random()*6.28,vr:(Math.random()-.5)*(fall?.08:.3),life:fall?420:200+Math.random()*60,ph:Math.random()*6.28})}
 if(!cRaf)cRaf=requestAnimationFrame(cFrame)}
/* The pizza envelope is the main Slice of Thanks mark; it doubles as confetti */
const ENV_IMG='data:image/png;base64,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';
const envImg=new Image();envImg.src=ENV_IMG;
/* Gerald's own confetti, only on pizzas he makes: chef hats and his red bow tie */
function chefHatC(c,s){c.strokeStyle='#3a1d12';c.lineWidth=Math.max(1,s*.1);c.fillStyle='#ffffff';c.beginPath();c.arc(-s*.42,-s*.3,s*.38,0,6.28);c.arc(s*.42,-s*.3,s*.38,0,6.28);c.fill();c.stroke();
 c.beginPath();c.arc(0,-s*.5,s*.46,0,6.28);c.fill();c.stroke();c.fillRect(-s*.55,-s*.25,s*1.1,s*.7);c.strokeRect(-s*.55,-s*.05,s*1.1,s*.5)}
function bowTieC(c,s){c.strokeStyle='#3a1d12';c.lineWidth=Math.max(1,s*.1);c.beginPath();c.moveTo(0,0);c.lineTo(-s,-s*.55);c.lineTo(-s,s*.55);c.closePath();c.moveTo(0,0);c.lineTo(s,-s*.55);c.lineTo(s,s*.55);c.closePath();c.fill();c.stroke();
 c.beginPath();c.arc(0,0,s*.24,0,6.28);c.fill();c.stroke()}
function heart(c,s){c.beginPath();c.moveTo(0,s*.35);c.bezierCurveTo(-s,-s*.3,-s*.4,-s,0,-s*.35);c.bezierCurveTo(s*.4,-s,s,-s*.3,0,s*.35);c.fill()}
function star(c,s){c.beginPath();for(let i=0;i<10;i++){const r=i%2?s*.45:s,a=i*Math.PI/5-Math.PI/2;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill()}
function slice(c,s){c.fillStyle='#f6cf6a';c.beginPath();c.moveTo(0,s);c.lineTo(-s*.6,-s*.6);c.lineTo(s*.6,-s*.6);c.closePath();c.fill();
 c.fillStyle='#d9a35e';c.fillRect(-s*.66,-s*.8,s*1.32,s*.28);c.fillStyle='#c4122f';c.beginPath();c.arc(-s*.15,-s*.2,s*.15,0,6.28);c.arc(s*.18,s*.15,s*.13,0,6.28);c.fill()}
function potHead(c,s){c.fillStyle='#c98a52';c.beginPath();c.ellipse(-s*.85,s*.1,s*.35,s*.6,.3,0,6.28);c.ellipse(s*.85,s*.1,s*.35,s*.6,-.3,0,6.28);c.fill();
 c.fillStyle='#eab983';c.beginPath();c.arc(0,0,s*.9,0,6.28);c.fill();c.fillStyle='#8a6656';c.beginPath();c.ellipse(0,s*.35,s*.42,s*.32,0,0,6.28);c.fill();
 c.fillStyle='#1c1310';c.beginPath();c.arc(-s*.35,-s*.12,s*.2,0,6.28);c.arc(s*.35,-s*.12,s*.2,0,6.28);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-s*.29,-s*.2,s*.07,0,6.28);c.arc(s*.41,-s*.2,s*.07,0,6.28);c.fill();
 c.fillStyle='#2a1f1c';c.beginPath();c.ellipse(0,s*.22,s*.14,s*.09,0,0,6.28);c.fill()}
function shamrockC(c,s){[0,2.094,4.189].forEach(a=>{c.beginPath();c.arc(Math.cos(a-1.571)*s*.45,Math.sin(a-1.571)*s*.45,s*.42,0,6.28);c.fill()});c.fillRect(-s*.06,0,s*.12,s*.8)}
function capC(c,s){c.beginPath();c.moveTo(0,-s*.5);c.lineTo(s,0);c.lineTo(0,s*.5);c.lineTo(-s,0);c.closePath();c.fill();c.fillRect(-s*.5,s*.05,s,s*.45);c.fillStyle='#f1ad2d';c.fillRect(s*.55,0,s*.1,s*.7)}
function pawC(c,s){c.beginPath();c.ellipse(0,s*.25,s*.5,s*.42,0,0,6.28);c.fill();[[-.5,-.3],[-.18,-.6],[.18,-.6],[.5,-.3]].forEach(([x,y])=>{c.beginPath();c.arc(x*s,y*s,s*.2,0,6.28);c.fill()})}
function sunC(c,s){c.beginPath();c.arc(0,0,s*.45,0,6.28);c.fill();c.strokeStyle=c.fillStyle;c.lineWidth=s*.12;for(let i=0;i<8;i++){const a=i*.785;c.beginPath();c.moveTo(Math.cos(a)*s*.6,Math.sin(a)*s*.6);c.lineTo(Math.cos(a)*s*.9,Math.sin(a)*s*.9);c.stroke()}}
function batC(c,s,t){const f=.6+.4*Math.sin(t/3);c.beginPath();c.moveTo(0,-s*.15);c.quadraticCurveTo(-s*.5,-s*.6*f,-s*1.1,-s*.2*f);c.quadraticCurveTo(-s*.7,0,-s*.55,s*.25);c.quadraticCurveTo(-s*.3,s*.05,0,s*.3);c.quadraticCurveTo(s*.3,s*.05,s*.55,s*.25);c.quadraticCurveTo(s*.7,0,s*1.1,-s*.2*f);c.quadraticCurveTo(s*.5,-s*.6*f,0,-s*.15);c.fill()}
function leafC(c,s){c.beginPath();c.moveTo(0,-s);c.quadraticCurveTo(s*.8,-s*.2,0,s);c.quadraticCurveTo(-s*.8,-s*.2,0,-s);c.fill();c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=s*.08;c.beginPath();c.moveTo(0,-s*.8);c.lineTo(0,s*.9);c.stroke()}
function cFrame(){cRaf=0;const c=cfx.getContext('2d'),W=innerWidth,H=innerHeight;c.clearRect(0,0,W,H);
 cparts=cparts.filter(p=>p.life>0&&p.y<H+60);
 for(const p of cparts){p.vy+=p.g;p.vx*=.985;if(FALLING.includes(p.kind))p.x+=Math.sin(p.life/30+p.ph)*(p.kind==='snow'?.6:1.2);p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.life--;
  c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.globalAlpha=Math.min(1,p.life/40);c.fillStyle=p.col;
  if(p.kind==='classic'||p.kind==='brand')c.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);
  else if(p.kind==='logo'){if(profile.logo&&logoImg&&logoImg.complete&&logoImg.naturalWidth){const k=Math.min(2*p.s/logoImg.naturalWidth,2*p.s/logoImg.naturalHeight);c.drawImage(logoImg,-logoImg.naturalWidth*k/2,-logoImg.naturalHeight*k/2,logoImg.naturalWidth*k,logoImg.naturalHeight*k)}
   else{c.fillStyle='#c4122f';c.beginPath();c.arc(0,0,p.s,0,6.28);c.fill();c.fillStyle='#fff6e3';c.font='800 '+Math.round(p.s*.55)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('LOGO',0,1)}}
  else if(p.kind==='hearts')heart(c,p.s);else if(p.kind==='stars')star(c,p.s);else if(p.kind==='pizza')slice(c,p.s);else if(p.kind==='potato')potHead(c,p.s);else if(p.kind==='shamrocks')shamrockC(c,p.s);else if(p.kind==='petals'){c.beginPath();c.ellipse(0,0,p.s*.5,p.s*.28,0,0,6.28);c.fill()}
  else if(p.kind==='caps')capC(c,p.s);else if(p.kind==='paws')pawC(c,p.s);else if(p.kind==='suns')sunC(c,p.s);else if(p.kind==='bats')batC(c,p.s,p.life);else if(p.kind==='leaves')leafC(c,p.s);
  else if(p.kind==='fireworks'){c.beginPath();c.arc(0,0,p.s,0,6.28);c.fill()}
  else if(p.kind==='envelopes'){if(envImg.complete&&envImg.naturalWidth)c.drawImage(envImg,-p.s,-p.s*.73,p.s*2,p.s*1.46);else{c.fillStyle='#fdf8ec';c.fillRect(-p.s,-p.s*.7,p.s*2,p.s*1.4)}}
  else if(p.kind==='gerald'){if(p.col==='#ffffff')chefHatC(c,p.s);else bowTieC(c,p.s*.8)}
  else if(p.kind==='gold'){c.globalAlpha*=.6+.4*Math.sin(p.life/4+p.ph);c.beginPath();c.arc(0,0,p.s,0,6.28);c.fill()}
  else{c.beginPath();c.arc(0,0,p.s*.5,0,6.28);c.fill()}
  c.restore()}
 if(cparts.length)cRaf=requestAnimationFrame(cFrame)}

/* Box toppers (Pro): a seasonal or year-round decoration on the lid. Shared with shared/pizza-core.js for the recipient page. */
const TOPPERS=[["tree","Christmas tree",[12]],["lights","String lights",[11,12,1]],["ornament","Ornament",[12]],["snowman","Snowman",[12,1,2]],["heart","Heart",[2]],["shamrock","Shamrock",[3]],["flower","Flower",[4,5]],["gradcap","Grad cap",[5,6]],["firework","Firework",[7]],["apple","Apple",[8,9]],["pumpkin","Pumpkin",[10]],["ghost","Ghost",[10]],["leaf","Fall leaf",[10,11]],["bow","Gift bow",[]],["balloons","Balloons",[]],["partyhat","Party hat",[]],["crown","Crown",[]]];
const TOPPER_SVG={"tree":"<svg viewBox='0 0 64 64'><path d='M32 8 46 27h-8l12 16H40l12 14H12l12-14H14l12-16h-8z' fill='#2e7d3a' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><rect x='28' y='57' width='8' height='6' fill='#8a5a2b' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='m32 1 2 4.2 4.5.6-3.3 3.1.8 4.5L32 11.3l-4 2.1.8-4.5-3.3-3.1 4.5-.6z' fill='#f1ad2d' stroke='#3a1d12' stroke-width='1.6'/><circle cx='26' cy='35' r='2.6' fill='#d62828'/><circle cx='38' cy='48' r='2.6' fill='#f1ad2d'/><circle cx='34' cy='23' r='2.3' fill='#2b5fb8'/><circle cx='22' cy='51' r='2.3' fill='#e86a92'/><circle cx='40' cy='36' r='2.3' fill='#fff'/></svg>","ornament":"<svg viewBox='0 0 64 64'><path d='M32 13c-2-7 6-9 4-3' fill='none' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><circle cx='32' cy='39' r='20' fill='#d62828' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><rect x='26' y='12' width='12' height='8' rx='2' fill='#f1ad2d' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M13 37q19 9 38 0' fill='none' stroke='#f3d27a' stroke-width='3.2'/><circle cx='24' cy='31' r='3.5' fill='#fff' fill-opacity='.55'/></svg>","snowman":"<svg viewBox='0 0 64 64'><circle cx='32' cy='45' r='15' fill='#fff' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><circle cx='32' cy='22' r='10' fill='#fff' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><rect x='24' y='5' width='16' height='8' fill='#2b2523' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><rect x='20' y='12' width='24' height='3.5' fill='#2b2523' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><circle cx='28.5' cy='20' r='1.4' fill='#2b2523'/><circle cx='35.5' cy='20' r='1.4' fill='#2b2523'/><path d='m32 23 8 2-8 1.5z' fill='#f08a24'/><path d='M22 31h20' stroke='#d62828' stroke-width='4'/><circle cx='32' cy='42' r='1.6' fill='#2b2523'/><circle cx='32' cy='49' r='1.6' fill='#2b2523'/></svg>","heart":"<svg viewBox='0 0 64 64'><path d='M32 56C16 45 7 36 7 25A12 12 0 0 1 32 17a12 12 0 0 1 25 8c0 11-9 20-25 31z' fill='#d62828' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M17 24a6 6 0 0 1 6-6' fill='none' stroke='#fff' stroke-opacity='.6' stroke-width='3' stroke-linecap='round'/></svg>","shamrock":"<svg viewBox='0 0 64 64'><path d='M32 36q2 14-6 24' fill='none' stroke='#2e7d3a' stroke-width='4' stroke-linecap='round'/><g fill='#3e9a4a' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'><circle cx='32' cy='17' r='11'/><circle cx='20' cy='33' r='11'/><circle cx='44' cy='33' r='11'/></g></svg>","flower":"<svg viewBox='0 0 64 64'><path d='M32 40v20' stroke='#4c8a3a' stroke-width='4'/><g fill='#f7a8c4' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'><circle cx='32' cy='12' r='9'/><circle cx='46' cy='24' r='9'/><circle cx='40' cy='40' r='9'/><circle cx='24' cy='40' r='9'/><circle cx='18' cy='24' r='9'/></g><circle cx='32' cy='27' r='8' fill='#f1ad2d' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","gradcap":"<svg viewBox='0 0 64 64'><path d='M32 12 60 24 32 36 4 24z' fill='#2b2b2b' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M16 30v12c8 7 24 7 32 0V30l-16 6z' fill='#2b2b2b' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M56 26v18' stroke='#f1ad2d' stroke-width='3'/><circle cx='56' cy='46' r='3' fill='#f1ad2d' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","firework":"<svg viewBox='0 0 64 64'><g stroke-width='3.5' stroke-linecap='round'><path d='M32 30V6M32 30l17-17M32 30h24M32 30l17 17M32 30v24M32 30 15 47M32 30H8M32 30 15 13' stroke='#d62828'/><path d='M32 30l10-24M32 30l24 10M32 30 22 54M32 30 8 20' stroke='#2b5fb8'/></g><circle cx='32' cy='30' r='5' fill='#f1ad2d' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","apple":"<svg viewBox='0 0 64 64'><path d='M32 18c-9-6-24-3-24 14 0 14 10 26 18 26 3 0 4-2 6-2s3 2 6 2c8 0 18-12 18-26 0-17-15-20-24-14z' fill='#d62828' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M32 18c0-6 2-10 5-12' fill='none' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M36 12c6-6 12-4 14-2-5 5-10 5-14 2z' fill='#4c8a3a' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","pumpkin":"<svg viewBox='0 0 64 64'><path d='M32 16c-4-6 0-10 4-11' fill='none' stroke='#4c6b28' stroke-width='4' stroke-linecap='round'/><g fill='#f08a24' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'><ellipse cx='20' cy='38' rx='12' ry='19'/><ellipse cx='44' cy='38' rx='12' ry='19'/><ellipse cx='32' cy='38' rx='12' ry='20'/></g><path d='m24 34 4 4h-8zm16 0 4 4h-8zM22 46q10 6 20 0l-4 4-4-3-4 3-4-3z' fill='#3a1d12'/></svg>","ghost":"<svg viewBox='0 0 64 64'><path d='M12 58V30a20 20 0 0 1 40 0v28l-6-5-7 5-7-5-7 5-6-5z' fill='#fff' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><ellipse cx='25' cy='30' rx='3.2' ry='4.4' fill='#2b2523'/><ellipse cx='39' cy='30' rx='3.2' ry='4.4' fill='#2b2523'/><ellipse cx='32' cy='41' rx='4' ry='3' fill='#2b2523'/></svg>","leaf":"<svg viewBox='0 0 64 64'><path d='M32 60V36' stroke='#8a5a2b' stroke-width='4' stroke-linecap='round'/><path d='m32 4 6 12 9-4-2 12 11 2-9 9 5 6-12 1-8 9-8-9-12-1 5-6-9-9 11-2-2-12 9 4z' fill='#d9661f' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","bow":"<svg viewBox='0 0 64 64'><path d='M32 30C20 12 6 16 8 26s16 8 24 4zM32 30c12-18 26-14 24-4s-16 8-24 4z' fill='#d62828' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M28 32 18 58l7-3 3 7 4-28zM36 32l10 26-7-3-3 7-4-28z' fill='#b0101f' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><circle cx='32' cy='30' r='6' fill='#d62828' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","balloons":"<svg viewBox='0 0 64 64'><path d='M20 34q2 14 10 26M44 30q-4 16-12 30M32 38v22' fill='none' stroke='#3a1d12' stroke-width='1.8'/><ellipse cx='20' cy='22' rx='10' ry='12' fill='#2b5fb8' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><ellipse cx='44' cy='19' rx='10' ry='12' fill='#f1ad2d' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><ellipse cx='32' cy='28' rx='10' ry='12' fill='#d62828' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","partyhat":"<svg viewBox='0 0 64 64'><path d='M32 4 50 58H14z' fill='#2b5fb8' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='m22 32 20-2m-24 14 28-2' stroke='#f1ad2d' stroke-width='4'/><circle cx='32' cy='5' r='5' fill='#e86a92' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><path d='M12 58q20 6 40 0' fill='none' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","crown":"<svg viewBox='0 0 64 64'><path d='M8 52 6 18l14 14 12-22 12 22 14-14-2 34z' fill='#f1ad2d' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><rect x='8' y='50' width='48' height='8' rx='2' fill='#e0b04a' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><circle cx='32' cy='38' r='4' fill='#d62828' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><circle cx='18' cy='42' r='3' fill='#2b5fb8' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/><circle cx='46' cy='42' r='3' fill='#2b5fb8' stroke='#3a1d12' stroke-width='2.5' stroke-linejoin='round'/></svg>","lights":"<svg viewBox='0 0 300 36' preserveAspectRatio='xMidYMin meet'><path d='M-5 8Q35 22 75 8T155 8T235 8T315 8' fill='none' stroke='#2e7d3a' stroke-width='2.5'/><rect x='5.5' y='11.3' width='5' height='4' fill='#3a1d12'/><ellipse cx='8.0' cy='20.3' rx='4.2' ry='6.2' fill='#d62828' stroke='#3a1d12' stroke-width='1.6'/><rect x='33.5' y='22.0' width='5' height='4' fill='#3a1d12'/><ellipse cx='36.0' cy='31.0' rx='4.2' ry='6.2' fill='#f1ad2d' stroke='#3a1d12' stroke-width='1.6'/><rect x='61.5' y='10.5' width='5' height='4' fill='#3a1d12'/><ellipse cx='64.0' cy='19.5' rx='4.2' ry='6.2' fill='#2b5fb8' stroke='#3a1d12' stroke-width='1.6'/><rect x='89.5' y='13.4' width='5' height='4' fill='#3a1d12'/><ellipse cx='92.0' cy='22.4' rx='4.2' ry='6.2' fill='#3e9a4a' stroke='#3a1d12' stroke-width='1.6'/><rect x='117.5' y='21.5' width='5' height='4' fill='#3a1d12'/><ellipse cx='120.0' cy='30.5' rx='4.2' ry='6.2' fill='#e86a92' stroke='#3a1d12' stroke-width='1.6'/><rect x='145.5' y='9.0' width='5' height='4' fill='#3a1d12'/><ellipse cx='148.0' cy='18.0' rx='4.2' ry='6.2' fill='#d62828' stroke='#3a1d12' stroke-width='1.6'/><rect x='173.5' y='15.5' width='5' height='4' fill='#3a1d12'/><ellipse cx='176.0' cy='24.5' rx='4.2' ry='6.2' fill='#f1ad2d' stroke='#3a1d12' stroke-width='1.6'/><rect x='201.5' y='20.3' width='5' height='4' fill='#3a1d12'/><ellipse cx='204.0' cy='29.3' rx='4.2' ry='6.2' fill='#2b5fb8' stroke='#3a1d12' stroke-width='1.6'/><rect x='229.5' y='8.2' width='5' height='4' fill='#3a1d12'/><ellipse cx='232.0' cy='17.2' rx='4.2' ry='6.2' fill='#3e9a4a' stroke='#3a1d12' stroke-width='1.6'/><rect x='257.5' y='17.7' width='5' height='4' fill='#3a1d12'/><ellipse cx='260.0' cy='26.7' rx='4.2' ry='6.2' fill='#e86a92' stroke='#3a1d12' stroke-width='1.6'/><rect x='285.5' y='18.7' width='5' height='4' fill='#3a1d12'/><ellipse cx='288.0' cy='27.7' rx='4.2' ry='6.2' fill='#d62828' stroke='#3a1d12' stroke-width='1.6'/></svg>"};
function toppersFor(m){return TOPPERS.filter(t=>!t[2].length||t[2].includes(m))}
function topperEl(k){if(!k||!TOPPER_SVG[k])return null;const d=document.createElement('div');d.className='lid-topper'+(k==='lights'?' band':'');d.setAttribute('aria-hidden','true');d.innerHTML=TOPPER_SVG[k];return d}
window.SOTPizza={TOPPERS,toppersFor,topperEl,SAUCES,CHEESES,TOPS,newPizza,clonePizza,defaultSignature,drawPizza,pizzaImage,review,labelText,cheeseKey,burst,CONFETTI,inSeason,
  setProfile(p){profile=p||{}},setMonth(m){viewMonthOverride=m}};
})();
