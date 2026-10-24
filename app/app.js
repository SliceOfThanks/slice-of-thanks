/* Slice of Thanks member app. Built by tools/build_app.py from the approved prototype and app/live.js. */
(function(){
var host=document.getElementById('sot-app');
if(!host||host.shadowRoot)return;
if(!document.getElementById('sot-fonts')){var fl=document.createElement('link');fl.id='sot-fonts';fl.rel='stylesheet';
fl.href='https://fonts.googleapis.com/css2?family=Shrikhand&family=Yellowtail&family=Work+Sans:wght@400;500;600;700&family=Caveat:wght@500;700&family=Courier+Prime:wght@400;700&display=swap';document.head.appendChild(fl);}
if(!document.getElementById('sot-page-bg')){var pb=document.createElement('style');pb.id='sot-page-bg';
pb.textContent='html:has(#sot-app),body:has(#sot-app){background:#FFF3E0!important}@media (prefers-color-scheme: dark){html:has(#sot-app),body:has(#sot-app){background:#24160F!important}}';document.head.appendChild(pb);}
var SOTR=host.attachShadow({mode:'open'});
SOTR.innerHTML='<style>'+":host{display:block;all:initial}\n\n/* Layout: one phone-width column. A pizzeria sign up top, a menu-board tab bar, cards framed like a diner menu, and the pizza sitting on a checkered tablecloth */\n:host{\n  --bg:#FFF3E0; --surface:#FFFAF2; --sunk:#F7E4C6; --ink:#3E2416; --muted:#7A5641; --line:#EBCFA8;\n  --tomato:#D62828; --tomato-ink:#FFF3E0; --mustard:#F5C04E; --basil:#4c6b28; --cheese:#F5C04E; --pink:#FCE1E1;\n  --edge:#3E2416; --shade:#3E2416; --board:#3E2416; --board-ink:#FFF3E0; --tomato-text:#C21F1F;\n  --cloth-a:#D62828; --cloth-b:#FFF3E0;\n  --warn-bg:#FBE3A8; --warn-ink:#744600; --ok-bg:#E0EACB; --ok-ink:#3c581b; --oven:#2a160e;\n  --display:\"Shrikhand\",\"Cooper Black\",Georgia,serif;\n  --script:\"Yellowtail\",\"Brush Script MT\",cursive;\n  --body:\"Work Sans\",system-ui,-apple-system,\"Segoe UI\",sans-serif;\n  --hand:\"Caveat\",\"Comic Sans MS\",cursive;\n  --mono:\"Courier Prime\",\"Courier New\",monospace;\n}\n@media (prefers-color-scheme: dark){:host{\n  --bg:#24160F; --surface:#3E2416; --sunk:#4A2D1D; --ink:#E3D0B8; --muted:#BBA088; --line:#634433;\n  --tomato:#D93A30; --tomato-ink:#FFF3E0; --mustard:#F5C04E; --basil:#9cc265; --cheese:#F5C04E; --pink:#5A2E2A;\n  --edge:#17110E; --shade:#120A07; --board:#17110E; --board-ink:#FFF3E0; --tomato-text:#FF8A7A;\n  --cloth-a:#6B2A22; --cloth-b:#3E2416;\n  --warn-bg:#4a3510; --warn-ink:#f6cf72; --ok-bg:#263618; --ok-ink:#b6d88a; --oven:#0d0604; color-scheme:dark}}\n:host([data-theme=\"dark\"]){\n  --bg:#24160F; --surface:#3E2416; --sunk:#4A2D1D; --ink:#E3D0B8; --muted:#BBA088; --line:#634433;\n  --tomato:#D93A30; --tomato-ink:#FFF3E0; --mustard:#F5C04E; --basil:#9cc265; --cheese:#F5C04E; --pink:#5A2E2A;\n  --edge:#17110E; --shade:#120A07; --board:#17110E; --board-ink:#FFF3E0; --tomato-text:#FF8A7A;\n  --cloth-a:#6B2A22; --cloth-b:#3E2416;\n  --warn-bg:#4a3510; --warn-ink:#f6cf72; --ok-bg:#263618; --ok-ink:#b6d88a; --oven:#0d0604; color-scheme:dark}\n*{box-sizing:border-box}\n/* Kitchen shortcuts: Pizza of the Month and Hire Gerald */\n.kx{display:flex;flex-direction:column;gap:14px;margin-bottom:6px}\n.kx-buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n.kx-btn{display:flex;gap:10px;align-items:center;text-align:left;background:var(--surface);color:var(--ink);border:3px solid var(--edge);border-radius:18px;\n  box-shadow:4px 4px 0 var(--shade);padding:10px 12px;font:inherit;cursor:pointer}\n.kx-btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--shade)}\n.kx-btn b{display:block;font-size:.95rem;line-height:1.2}\n.kx-btn small{display:block;color:var(--muted);font-size:.8rem;line-height:1.3}\n.kx-btn[aria-expanded=\"true\"]{background:var(--mustard);color:#3E2416}\n.kx-btn[aria-expanded=\"true\"] small{color:#5A3B25}\n.kx-btn canvas,.kx-btn .g-av{width:44px;height:44px;flex:none}\n.kx-one{grid-template-columns:1fr}\n.home-start h2{margin-bottom:12px}\n@media (max-width:380px){.kx-buttons{grid-template-columns:1fr}}\n.sot-body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.5;\n  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}\n.checker{height:18px;margin:0 calc(-1 * max(16px,env(safe-area-inset-right,0px))) 0 calc(-1 * max(16px,env(safe-area-inset-left,0px)));\n  background:repeating-conic-gradient(var(--cloth-a) 0 25%,var(--cloth-b) 0 50%) 0 0/18px 18px;border-bottom:3px solid var(--edge)}\n.wrap{max-width:560px;margin:0 auto;padding-block:20px 56px;display:flex;flex-direction:column;gap:18px}\nh1,h2,h3{margin:0;line-height:1.1;text-wrap:balance}\nh2{font-family:var(--display);font-weight:400;font-size:1.45rem;letter-spacing:.005em}\nh3{font-family:var(--body);font-size:1.02rem;font-weight:700}\np{margin:0}\n.muted{color:var(--muted)}\n.eyebrow{font-size:.74rem;text-transform:uppercase;letter-spacing:.12em;font-weight:700;color:var(--muted)}\n/* the sign */\n.signboard{background:var(--tomato);color:var(--tomato-ink);border:3px solid var(--edge);border-radius:20px;box-shadow:5px 5px 0 var(--shade);\n  padding:16px 18px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;position:relative;overflow:hidden}\n.signboard::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:8px;background:repeating-linear-gradient(90deg,var(--mustard) 0 14px,transparent 14px 28px)}\n.sign-text{display:flex;flex-direction:column;min-width:0}\n.signboard .script{font-family:var(--script);font-size:1.7rem;color:var(--mustard);line-height:1;transform:rotate(-4deg);transform-origin:left;margin-left:2px}\n.signboard h1{font-family:var(--display);font-weight:400;font-size:2.6rem;line-height:1;letter-spacing:.01em;text-shadow:3px 3px 0 var(--shade);margin-top:2px}\n.tagline{font-size:.82rem;font-weight:600;letter-spacing:.04em;margin-top:8px;opacity:.95}\n.tag{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:var(--sunk);color:var(--muted);white-space:nowrap;border:1.5px solid var(--line)}\n.signboard .tag{background:var(--mustard);color:#3E2416;border-color:var(--edge);transform:rotate(4deg)}\n/* menu-board tabs */\n.tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:5px;background:var(--board);border-radius:14px;border:2px solid var(--edge)}\n.tabs button{font:700 .7rem var(--body);letter-spacing:.03em;text-transform:uppercase;padding:10px 6px;border:0;border-radius:10px;background:transparent;color:var(--board-ink);cursor:pointer}\n.tabs button[aria-selected=\"true\"]{background:var(--mustard);color:#3E2416}\nsection{display:flex;flex-direction:column;gap:16px}\n/* buttons */\n.btn{font:700 .92rem var(--body);padding:10px 16px;border-radius:999px;border:2.5px solid var(--edge);background:var(--surface);color:var(--ink);cursor:pointer;text-decoration:none;\n  display:inline-flex;align-items:center;justify-content:center;gap:6px;text-align:center;box-shadow:3px 3px 0 var(--shade);transition:transform .08s,box-shadow .08s}\n.btn:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--shade)}\n.btn.primary{background:var(--tomato);color:var(--tomato-ink)}\n.btn.ghost{background:transparent;border-color:transparent;box-shadow:none;color:var(--muted)}\n.btn[disabled]{opacity:.5;cursor:not-allowed}\n.btn.small{padding:6px 12px;font-size:.84rem;box-shadow:2px 2px 0 var(--shade);border-width:2px}\n.btn.ghost.small{box-shadow:none}\nbutton:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid var(--mustard);outline-offset:2px}\n.btn-row{display:flex;flex-wrap:wrap;gap:10px}\n.btn-col{display:flex;flex-direction:column;gap:10px}\n/* menu cards */\n.card{background:var(--surface);border:2.5px solid var(--edge);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:4px 4px 0 var(--shade)}\n.prompt{background:var(--surface);border:3px solid var(--tomato);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:5px 5px 0 var(--tomato);animation:pop .4s ease-out}\n.prompt .eyebrow{color:var(--tomato-text)}\n@keyframes pop{from{transform:translateY(8px);opacity:.4}to{transform:none;opacity:1}}\n.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;border-bottom:2.5px dashed var(--line);padding-bottom:10px}\n.meetings{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}\n.meeting{background:var(--surface);border:2px solid var(--edge);border-radius:14px;padding:12px 14px;display:grid;grid-template-columns:72px 1fr;gap:4px 12px;align-items:start;box-shadow:3px 3px 0 var(--shade)}\n.meeting .time{font-family:var(--mono);font-weight:700;font-size:.88rem;color:var(--tomato-text);padding-top:2px;font-variant-numeric:tabular-nums}\n.meeting .info{min-width:0;display:flex;flex-direction:column;gap:6px}\n.meeting .who{font-size:.88rem;color:var(--muted)}\n.meeting .row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}\n.pill{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 9px;border-radius:999px;background:var(--sunk);color:var(--muted)}\n.pill.ok{background:var(--ok-bg);color:var(--ok-ink)}\n.pill.wait{background:var(--warn-bg);color:var(--warn-ink)}\n.mode-line{font-size:.9rem;color:var(--muted)}\n.linkish{background:none;border:0;padding:0;font:inherit;color:var(--tomato-text);font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:3px}\n/* kitchen */\n.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,1fr);gap:4px}\n.steps li{font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}\n.steps li span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:2px solid var(--line);font-family:var(--mono);font-weight:700;font-size:.8rem}\n.steps li.on{color:var(--ink)}\n.steps li.on span{background:var(--tomato);color:var(--tomato-ink);border-color:var(--edge)}\n.steps li.done span{background:var(--basil);color:var(--surface);border-color:var(--edge)}\n.stage{border-radius:24px;padding:16px;border:3px solid var(--edge);box-shadow:5px 5px 0 var(--shade);position:relative;transition:background .6s;\n  background:repeating-conic-gradient(var(--cloth-a) 0 25%,var(--cloth-b) 0 50%) 0 0/44px 44px}\n.stage.hot{background:radial-gradient(circle at 50% 60%,#ff9a3c 0%,#b8431c 45%,var(--oven) 85%)}\n.stage canvas{display:block;width:100%;max-width:100%;aspect-ratio:1;touch-action:none;cursor:pointer}\n.timer{position:absolute;top:14px;right:16px;font:700 1.3rem var(--mono);color:#ffe1b0;font-variant-numeric:tabular-nums;background:rgba(0,0,0,.45);padding:2px 10px;border-radius:8px}\n.panel{display:flex;flex-direction:column;gap:12px}\n.chips{display:flex;flex-wrap:wrap;gap:6px}\n.chip{font:600 .86rem var(--body);padding:7px 12px;border-radius:999px;border:2px solid var(--edge);background:var(--surface);color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:6px}\n.chip[aria-pressed=\"true\"]{background:var(--mustard);color:#3E2416}\n.dot{width:12px;height:12px;border-radius:50%;display:inline-block;flex:none;border:1px solid rgba(0,0,0,.25)}\n.group-label{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-top:4px}\n.field{display:flex;flex-direction:column;gap:5px}\n.field label{font-size:.86rem;font-weight:700}\n.field small{color:var(--muted);font-size:.8rem}\ninput[type=text],input[type=url],textarea,select{font:500 1rem var(--body);padding:10px 12px;border-radius:12px;border:2px solid var(--edge);background:var(--surface);color:var(--ink);width:100%}\ntextarea{min-height:92px;resize:vertical}\n.inline{display:flex;gap:8px;align-items:center}\n.inline input{flex:1;min-width:0}\n.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n@media (max-width:420px){.two{grid-template-columns:1fr}}\n.nav-row{display:flex;justify-content:space-between;gap:12px;padding-top:4px}\n.nav-row .btn{flex:1}\n.count{font-family:var(--mono);font-size:.85rem;color:var(--muted)}\n/* pizza box (a physical object, fixed colors in both themes) */\n.box-preview{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n@media (max-width:420px){.box-preview{grid-template-columns:1fr}}\n.lid{background:#c99b6b;color:#3a2616;border-radius:12px;min-height:150px;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;position:relative;overflow:hidden;border:2.5px solid #3E2416;box-shadow:4px 4px 0 #3E2416}\n.lid::before{content:\"\";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 2px,transparent 2px 7px);pointer-events:none}\n.lid[data-style=\"classic\"]{background:#fffaf0;color:#D62828}\n.lid[data-style=\"classic\"]::before{background:repeating-conic-gradient(#D62828 0 25%,transparent 0 50%) 0 0/14px 14px;opacity:.14}\n.lid[data-style=\"gold\"]{background:linear-gradient(135deg,#f3d27a,#b8872c);color:#3a2808}\n.lid-logo{max-width:70%;display:flex;justify-content:center;position:relative}\n.lid-logo img{max-height:56px;max-width:100%;object-fit:contain;display:block}\n.lid-biz{font:400 1.2rem var(--display);text-align:center;position:relative}\n.lid-sticker{max-width:92%;text-align:center;line-height:1.15;position:relative;background:#D62828;color:#FFF3E0;font:400 1.05rem var(--script);padding:3px 12px 5px;border-radius:999px;transform:rotate(-5deg);border:2px solid #3E2416}\n.lid-vegan{position:relative;background:#4c6b28;color:#fff;font:700 .72rem var(--body);padding:3px 9px;border-radius:999px;border:1.5px solid #3E2416}\n.vegan-note{background:var(--ok-bg);color:var(--ok-ink);font-weight:600;font-size:.88rem;padding:8px 12px;border-radius:10px}\n.inside{background:#ecd5b0;color:#2c1d12;border-radius:12px;min-height:150px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;border:2.5px solid #3E2416}\n.hand{font-family:var(--hand);font-size:1.35rem;line-height:1.15}\n.hand.signboard{text-align:right;font-weight:700}\n.upload{display:flex;align-items:center;gap:10px;flex-wrap:wrap}\n.upload input{position:absolute;width:1px;height:1px;opacity:0}\n.upload .thumb{width:44px;height:44px;border-radius:10px;background:var(--sunk);border:2px solid var(--line);display:grid;place-items:center;overflow:hidden;font-size:.7rem;color:var(--muted)}\n.upload .thumb img{max-width:100%;max-height:100%;object-fit:contain}\n.msg{background:var(--sunk);border:2px dashed var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;font-size:.92rem;white-space:pre-wrap;word-break:break-word}\n.msg .subj{font-weight:700}\n/* settings */\n.radio{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:12px;border:2px solid var(--line);cursor:pointer;background:var(--surface)}\n.radio:has(input:checked){border-color:var(--tomato);background:var(--sunk)}\n.radio input{margin-top:4px;accent-color:var(--tomato)}\n.radio span{display:flex;flex-direction:column;gap:2px}\n.radio small{color:var(--muted);font-size:.85rem}\n.check{display:flex;gap:10px;align-items:center;font-size:.95rem}\n.check input{accent-color:var(--tomato);width:18px;height:18px}\n.sig{display:flex;gap:14px;align-items:center}\n.sig canvas{width:96px;height:96px;flex:none}\n/* recipient overlay */\n.overlay{position:fixed;inset:0;z-index:50;background:var(--bg);overflow-y:auto;overflow-x:hidden;\n  padding:calc(16px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(32px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}\n.ov-inner{max-width:440px;margin:0 auto;display:flex;flex-direction:column;gap:18px}\n.ov-top{display:flex;justify-content:space-between;align-items:center}\n.r-stage{display:flex;flex-direction:column;gap:16px;align-items:stretch;text-align:center}\n.scooter{font-size:3rem;animation:drive 1.1s cubic-bezier(.2,.8,.3,1) both}\n@keyframes drive{from{transform:translateX(140%)}to{transform:none}}\n.potato{transform-box:fill-box;transform-origin:50% 100%;outline:none}\n.potato.hop,.p-av.hop{animation:hop .7s ease}\n@keyframes hop{0%{transform:none}30%{transform:translateY(-12px) rotate(-5deg)}60%{transform:translateY(0) rotate(4deg)}80%{transform:translateY(-4px)}100%{transform:none}}\n.scoot-wrap{position:relative}\n.bark{position:absolute;left:50%;top:-6px;transform:translateX(-50%);background:#fffaef;color:#3E2416;border:2.5px solid #4c6b28;border-radius:14px;padding:6px 12px;font-weight:700;font-size:.9rem;max-width:260px;text-align:center;box-shadow:2px 2px 0 #3E2416;z-index:5;animation:pop .25s ease-out}\n.bark[hidden]{display:none}\n\n.r-from{font:400 1.45rem var(--display);text-wrap:balance}\n.rbox{position:relative;perspective:900px;min-height:220px}\n.rbox .inside,.rbox .lid{min-height:220px}\n.rbox .inside{text-align:left;justify-content:center}\n.rbox .lid{position:absolute;inset:0;transform-origin:50% 0;transition:transform .9s cubic-bezier(.3,.7,.2,1),opacity .3s .6s}\n.rbox.open .lid{transform:rotateX(-105deg);opacity:0;pointer-events:none}\n.r-pizza{width:100%;max-width:340px;aspect-ratio:1;margin:0 auto;display:block}\n.receipt{background:#fffdf5;color:#2c2420;font-family:var(--mono);font-size:.88rem;text-align:left;padding:16px 18px;border-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,.15);display:flex;flex-direction:column;gap:6px;transform:rotate(-1deg);\n  -webkit-mask:radial-gradient(circle 5px at 50% 100%,transparent 98%,#000) 0 0/14px 100% repeat-x}\n.receipt hr{border:0;border-top:1px dashed #b9aea3;width:100%;margin:2px 0}\n.receipt .rh{font-weight:700;letter-spacing:.14em;color:#D62828}\n.g-av,.p-av{display:inline-block;width:36px;height:36px;flex:none}\n.p-av svg{width:100%;height:100%;display:block}\n.p-av.big{width:64px;height:64px}\n.scoot-art{position:relative;width:270px;max-width:100%;margin:0 auto}\n.scoot-art img{width:100%;height:auto;display:block}\n.scoot-art .potato{position:absolute;left:12%;top:0;width:34%;height:62%;background:none;border:0;padding:0;cursor:pointer;border-radius:50%;z-index:2}\n.scoot-art .potato:focus-visible{outline:3px solid var(--mustard)}\n.scoot-art .potato.hop+img,.scoot-art .potato.hop~.scoot-logo{animation:hop .7s ease}\n.scoot-logo{position:absolute;left:43%;top:41.5%;width:32.5%;height:27%;transform-origin:21.5% 31.5%;display:flex;align-items:center;justify-content:center;text-align:center;font:800 .78rem/1.1 var(--body);color:#3E2416;padding:4px;box-sizing:border-box;overflow:hidden;word-break:break-word}\n.scoot-logo img{max-width:100%;max-height:100%;object-fit:contain}\n.p-av img,.peek img{width:100%;height:auto;display:block}\n.eaten-potato{width:150px;height:auto}\n.p-say{display:flex;align-items:flex-start;gap:10px}\n.p-say .p-av{width:44px;height:44px}\n.p-say .bubble{border-color:#4c6b28}\n.g-av svg{width:100%;height:100%;display:block}\n.g-av.big{width:64px;height:64px}\n.g-head{display:flex;align-items:center;gap:12px}\n.g-facts{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;font-size:.92rem}\n.gerald-card{border-color:var(--edge);background:var(--surface)}\n.g-say{display:flex;align-items:flex-start;gap:10px}\n.g-say .g-av{width:44px;height:44px}\n.bubble{position:relative;background:var(--surface);border:2px solid var(--edge);border-radius:14px;padding:8px 12px;font-weight:600;font-size:.92rem;flex:1;min-width:0;box-shadow:2px 2px 0 var(--shade)}\n.bubble::before{content:\"\";position:absolute;left:-8px;top:14px;width:12px;height:12px;background:var(--surface);border-left:2px solid var(--edge);border-bottom:2px solid var(--edge);transform:rotate(45deg)}\n.r-critic{display:flex;align-items:center;gap:10px;line-height:1.3}\n.r-critic .g-av{width:40px;height:40px}\n.who-g{text-align:left;background:var(--surface);border:2px solid var(--line);border-radius:12px;padding:10px 14px;font-size:.92rem}\n.who-g summary{font-weight:700;cursor:pointer;color:var(--tomato-text)}\n.who-g p{margin-top:8px}\n.sr{position:absolute;width:1px;height:1px;opacity:0}\n.people{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}\n.person{background:var(--surface);border:2px solid var(--edge);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:3px 3px 0 var(--shade)}\n.person.open{box-shadow:4px 4px 0 var(--tomato);border-color:var(--tomato)}\n.p-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}\n.p-top>div{min-width:0}\n.p-meta{font-size:.86rem;color:var(--muted)}\n.p-last{font-size:.86rem;display:flex;flex-wrap:wrap;gap:6px;align-items:center}\n.hint{font-size:.86rem;background:var(--sunk);border-radius:10px;padding:8px 10px}\n.hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}\n.hist li{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:8px;align-items:center;font-size:.86rem;padding-bottom:8px;border-bottom:1px dashed var(--line)}\n.hist li:last-child{border-bottom:0;padding-bottom:0}\n.hist .d{font-family:var(--mono);font-weight:700;color:var(--tomato-text);font-size:.8rem}\n.hist .t{min-width:0}\n.hist .t b{display:block}\n.guest{background:var(--warn-bg);border:2px solid var(--mustard);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}\n.composer{background:var(--sunk);border:2px dashed var(--line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}\n.table-wrap{overflow-x:auto;border:2px solid var(--line);border-radius:12px}\n.table-wrap table{border-collapse:collapse;width:100%;font-size:.85rem}\n.table-wrap th,.table-wrap td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}\n.table-wrap th{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--sunk)}\n.table-wrap tr:last-child td{border-bottom:0}\n.bad{color:var(--tomato-text);font-weight:700}\n.progress{height:16px;border:2px solid var(--edge);border-radius:999px;overflow:hidden;background:var(--sunk)}\n.progress span{display:block;height:100%;width:0;background:repeating-linear-gradient(45deg,var(--tomato) 0 10px,var(--mustard) 10px 20px);transition:width .1s}\n.tip{display:flex;gap:10px;align-items:flex-start}\n.tip .g-av{width:44px;height:44px}\n.feed{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}\n.feed li{display:flex;flex-direction:column;gap:2px;padding-bottom:12px;border-bottom:2px dashed var(--line)}\n.feed li:last-child{border-bottom:0;padding-bottom:0}\n.feed .row-h{display:flex;justify-content:space-between;gap:8px;align-items:center}\n.feed .new{background:var(--tomato);color:var(--tomato-ink);font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:999px}\n.feed .btn{align-self:flex-start;margin-top:6px}\n.feed-date{font-family:var(--mono);font-size:.8rem;font-weight:700;color:var(--tomato-text)}\n.eggs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}\n.eggs li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:10px 12px;border:2px solid var(--line);border-radius:12px;background:var(--surface);font-size:.9rem}\n.eggs li.found{border-color:var(--basil);background:var(--ok-bg)}\n.eggs li b{display:block}\n.eggs .rw{font-family:var(--mono);font-weight:700;color:var(--tomato-text);display:inline-flex;align-items:center;gap:4px;white-space:nowrap}\n.bone{width:22px;height:11px;display:inline-block;vertical-align:middle}\n.peek{position:absolute;right:6px;bottom:0;width:84px;height:auto;border:0;background:none;padding:0;cursor:pointer;z-index:3;animation:peekup .45s ease-out}\n.peek svg{width:100%;height:100%;display:block}\n@keyframes peekup{from{transform:translateY(40px) rotate(-10deg);opacity:0}to{transform:none;opacity:1}}\n.special{border-color:#D62828;box-shadow:4px 4px 0 #D62828}\n.sp-row{display:flex;gap:14px;align-items:center}\n.sp-row canvas{width:120px;height:120px;flex:none}\n.sp-text{min-width:0;display:flex;flex-direction:column;gap:6px}\n.lid[data-style=\"bowtie\"]{background:linear-gradient(135deg,#f3d27a,#c9962c);color:#3a2808}\n.lid[data-style=\"bowtie\"]::before{background:radial-gradient(circle at 10px 10px,rgba(196,18,47,.4) 3px,transparent 4px) 0 0/22px 22px}\n.lid[data-style=\"holiday\"]{background:#1f5b3a;color:#FFF3E0}\n.lid[data-style=\"holiday\"]::before{background:repeating-linear-gradient(45deg,rgba(196,18,47,.45) 0 8px,transparent 8px 18px)}\n.lid[data-style=\"harvest\"]{background:#e27a2c;color:#2a1608}\n.lid[data-style=\"harvest\"]::before{background:repeating-linear-gradient(90deg,rgba(40,20,10,.18) 0 6px,transparent 6px 22px)}\n.lid[data-style=\"gratitude\"]{background:#b5763a;color:#FFF3E0}\n.lid[data-style=\"merry\"]{background:#a3122a;color:#FFF3E0}\n.lid[data-style=\"merry\"]::before{background:radial-gradient(circle,rgba(255,255,255,.5) 2px,transparent 3px) 0 0/18px 18px}\n.sponsored{border-color:#2b5fb8;box-shadow:4px 4px 0 #2b5fb8}\n.offer{font-weight:700;color:var(--tomato-text)}\n.sponsor-box{background:var(--surface);border:2px dashed #2b5fb8;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;text-align:left}\n.sponsor-box .sb-h{display:flex;align-items:center;gap:8px;font-weight:700}\n.sponsor-box img{max-height:28px;max-width:90px}\n.sponsor-box code{font-family:var(--mono);font-weight:700;background:var(--sunk);padding:2px 8px;border-radius:6px;user-select:all}\n.lid-sponsor{position:relative;background:#2b5fb8;color:#fff;font:700 .66rem var(--body);padding:2px 8px;border-radius:999px;letter-spacing:.04em}\n.adm-grid{display:flex;flex-direction:column;gap:10px}\n.top-row{display:grid;grid-template-columns:minmax(0,1fr) 70px auto;gap:6px;align-items:center}\n.top-row input{padding:8px}\n.adm-prev{display:flex;gap:12px;align-items:center}\n.adm-prev canvas{width:120px;height:120px;flex:none}\n.adm-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}\n.adm-list li{display:flex;justify-content:space-between;gap:10px;align-items:center;border:2px solid var(--line);border-radius:12px;padding:8px 12px;font-size:.9rem}\n.lid[data-style=\"midnight\"]{background:#1d1b2e;color:#f3d27a}\n.lid[data-style=\"midnight\"]::before{background:radial-gradient(circle,rgba(243,210,122,.6) 1.5px,transparent 2.5px) 0 0/16px 16px}\n.lid[data-style=\"hearts\"]{background:#f7c6d3;color:#8a1030}\n.lid[data-style=\"hearts\"]::before{background:radial-gradient(circle,rgba(196,18,47,.35) 3px,transparent 4px) 0 0/20px 20px}\n.lid[data-style=\"lucky\"]{background:#2e7d3a;color:#f3d27a}\n.lid[data-style=\"garden\"]{background:#d6ecd2;color:#2c5a2a}\n.lid[data-style=\"garden\"]::before{background:radial-gradient(circle,rgba(247,168,196,.8) 3px,transparent 4px) 0 0/22px 22px}\n.lid[data-style=\"floral\"]{background:#fbe2ea;color:#7a1f45}\n.lid[data-style=\"floral\"]::before{background:radial-gradient(circle,rgba(246,211,101,.8) 3px,transparent 4px) 0 0/18px 18px}\n.lid[data-style=\"plaid\"]{background:#2f4f7a;color:#FFF3E0}\n.lid[data-style=\"plaid\"]::before{background:repeating-linear-gradient(0deg,rgba(196,18,47,.35) 0 6px,transparent 6px 18px),repeating-linear-gradient(90deg,rgba(196,18,47,.35) 0 6px,transparent 6px 18px)}\n.lid[data-style=\"flag\"]{background:#fffaf0;color:#1f3a7a}\n.lid[data-style=\"flag\"]::before{background:repeating-linear-gradient(0deg,rgba(196,18,47,.28) 0 10px,transparent 10px 20px)}\n.lid[data-style=\"potato\"]{background:#4c6b28;color:#FFF3E0}\n.lid[data-style=\"potato\"]::before{background:radial-gradient(circle,rgba(234,185,131,.55) 3px,transparent 4px) 0 0/20px 20px}\n.lid[data-style=\"picnic\"]{background:#FFF3E0;color:#D62828}\n.lid[data-style=\"picnic\"]::before{background:repeating-conic-gradient(#D62828 0 25%,transparent 0 50%) 0 0/16px 16px;opacity:.22}\n.acc>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px}\n.acc>summary::-webkit-details-marker{display:none}\n.acc-icons{display:flex;gap:4px;flex:none}\n.acc-icons .g-av,.acc-icons .p-av{width:40px;height:40px}\n.acc-t{display:flex;flex-direction:column;min-width:0;flex:1}\n.acc-t b{font-family:var(--display);font-weight:400;font-size:1.2rem}\n.acc-t small{color:var(--muted);font-size:.84rem}\n.chev{width:12px;height:12px;border-right:3px solid var(--edge);border-bottom:3px solid var(--edge);transform:rotate(45deg);transition:transform .2s;flex:none;margin-right:4px}\n.acc[open]>summary .chev{transform:rotate(-135deg)}\n.acc[open]>summary{margin-bottom:6px}\n.crew-member{display:flex;flex-direction:column;gap:10px;padding-top:12px;border-top:2px dashed var(--line)}\n.chip.locked{border-style:dashed;opacity:.9}\n.chip .pro,.pm .pro,.pro-tag{font:800 .6rem var(--body);letter-spacing:.08em;text-transform:uppercase;background:var(--board);color:var(--mustard);border-radius:999px;padding:2px 7px;vertical-align:middle}\n.pro-tag{display:none;margin-left:6px}\n:host(.is-free) .pro-tag{display:inline-block}\n.pm.locked{border-style:dashed}\n.pm.locked canvas{opacity:.75}\n.sign-side{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex:none}\n.gopro{font:800 .8rem var(--body);background:var(--mustard);color:#3E2416;border:2.5px solid var(--edge);border-radius:999px;padding:6px 14px;box-shadow:2px 2px 0 var(--shade);cursor:pointer}\n.sheet-back{position:fixed;inset:0;z-index:65;background:rgba(30,15,8,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px}\n.sheet-back[hidden]{display:none}\n.sheet{background:var(--surface);color:var(--ink);border:3px solid var(--edge);border-radius:20px;box-shadow:5px 5px 0 var(--shade);padding:20px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px}\n.sheet h2{margin:0}\n.up-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px;font-size:.92rem}\n.plan-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}\n.plan-col{border:2px solid var(--edge);border-radius:14px;padding:10px;font-size:.82rem;background:var(--bg);min-width:0}\n.plan-col b{display:block;font-size:.95rem;margin-bottom:4px}\n.plan-col.on{background:var(--mustard);color:#3E2416}\n.plan-col ul{margin:0;padding-left:16px}\n@media (max-width:560px){.plan-cols{grid-template-columns:1fr}}\n.usage{height:10px;border-radius:999px;background:var(--sunk);border:1.5px solid var(--edge);overflow:hidden}\n.usage span{display:block;height:100%;background:var(--tomato)}\n[hidden]{display:none!important}\n.eat-btn{display:block;width:100%;max-width:340px;margin:0 auto;padding:0;border:0;background:none;cursor:pointer;border-radius:50%}\n.eat-btn:focus-visible{outline:3px solid var(--mustard);outline-offset:4px}\n.eat-btn.chomp img{animation:chomp .2s ease}\n@keyframes chomp{0%{transform:scale(1)}40%{transform:scale(.96) rotate(-2deg)}100%{transform:scale(1)}}\n@media (prefers-reduced-motion:reduce){.eat-btn.chomp img{animation:none}}\n.r-cta{align-self:center;min-width:min(100%,300px);font-size:1.05rem}\n.slice-dots{letter-spacing:.2em;color:var(--tomato-text)}\n.eat-hint{text-align:center;font-weight:700;color:var(--tomato-text);margin:6px 0 0}\n.eaten{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}\n.eaten svg{width:100%;max-width:300px;height:auto}\n.eaten h3{margin:0;font-family:var(--display,inherit);font-size:1.6rem}\n.made-with{text-align:center;font-size:.8rem;color:var(--muted);margin:4px 0 0}\n.reward-set{border:2px dashed var(--edge);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;margin-top:6px}\n.gift-tease{border:2px dashed var(--tomato);border-radius:14px;padding:10px 12px;font-weight:700;color:var(--tomato-text);text-align:center;margin:0}\n.gift-card{width:100%;max-width:340px;background:var(--surface);border:3px solid var(--edge);border-radius:16px;box-shadow:4px 4px 0 var(--shade);padding:14px;display:flex;flex-direction:column;gap:8px;align-items:center}\n.gift-card .eyebrow{margin:0}\n.gift-card .gc-what{font-weight:800;font-size:1.05rem;margin:0}\n.gift-code{font:800 1.5rem 'Courier Prime','Courier New',monospace;letter-spacing:.12em;background:var(--mustard);color:#3E2416;border:2px dashed #3E2416;border-radius:10px;padding:6px 14px}\n.gift-card .btn-row{justify-content:center}\n.premade>summary{cursor:pointer;font-weight:700;color:var(--tomato-text)}\n.pm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}\n@media (max-width:420px){.pm-grid{grid-template-columns:1fr}}\n.pm{display:flex;gap:10px;align-items:center;text-align:left;background:var(--surface);border:2px solid var(--edge);border-radius:12px;padding:8px;cursor:pointer;font:500 .82rem var(--body);color:var(--ink);box-shadow:2px 2px 0 var(--shade)}\n.pm canvas{width:56px;height:56px;flex:none}\n.pm span{display:flex;flex-direction:column;min-width:0}\n.pm b{font-size:.92rem}\n.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:60;background:var(--board);color:var(--board-ink);border:2px solid var(--mustard);padding:12px 16px;border-radius:12px;font-weight:600;font-size:.92rem;max-width:min(92vw,460px);box-shadow:4px 4px 0 var(--tomato);text-align:center}\n@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n"+'</style>'+"<div class=\"sot-body\">\n\n<div class=\"checker\" aria-hidden=\"true\"></div>\n<div class=\"wrap\">\n  <header class=\"signboard\">\n    <div class=\"sign-text\"><span class=\"script\">Slice of</span><h1>Thanks</h1><p class=\"tagline\">Thank-you pizzas, made fresh after every meeting</p></div>\n    <div class=\"sign-side\"><span class=\"tag\">Prototype</span><button class=\"gopro\" id=\"goPro\" type=\"button\" hidden>Go Pro</button></div>\n  </header>\n\n  <nav class=\"tabs\" role=\"tablist\" aria-label=\"Sections\">\n    <button role=\"tab\" id=\"tab-today\" data-view=\"today\" aria-selected=\"true\">Home</button>\n    <button role=\"tab\" id=\"tab-make\" data-view=\"make\" aria-selected=\"false\">Kitchen</button>\n    <button role=\"tab\" id=\"tab-people\" data-view=\"people\" aria-selected=\"false\">People</button>\n    <button role=\"tab\" id=\"tab-gerald\" data-view=\"gerald\" aria-selected=\"false\">Crew</button>\n    <button role=\"tab\" id=\"tab-settings\" data-view=\"settings\" aria-selected=\"false\">Settings</button>\n  </nav>\n\n  <!-- TODAY -->\n  <section id=\"view-today\">\n    <div class=\"card gerald-card\" id=\"meetGerald\" hidden>\n      <div class=\"g-head\"><span class=\"g-av big\"></span><div><p class=\"eyebrow\">Meet your critic</p><h2>This is Gerald</h2></div></div>\n      <p>Gerald is a raccoon and the head critic at Slice of Thanks. He spent ten years eating leftover crusts behind a family pizzeria, and now he reviews every pizza before it goes out the door.</p>\n      <ul class=\"g-facts\">\n        <li><b>Rates in:</b> slices, 1 to 5</li>\n        <li><b>Favorite topping:</b> whatever fell on the floor</li>\n        <li><b>Known for:</b> his bow tie and very strong opinions</li>\n        <li><b>House rule:</b> any pizza made with care gets at least 3 slices</li>\n      </ul>\n      <p class=\"muted\">His review prints on a receipt taped to every box, so the people you send pizzas to meet him too. His delivery partner is Potato, who brings every pizza to the door. You can meet her in the Crew tab.</p>\n      <div class=\"btn-row\"><button class=\"btn primary small\" id=\"geraldOk\">Nice to meet you, Gerald</button></div>\n    </div>\n    <div class=\"prompt\" id=\"promptCard\" hidden>\n      <p class=\"eyebrow\">Meeting just ended</p>\n      <h2 id=\"promptTitle\"></h2>\n      <p class=\"muted\">Send them a thank-you pizza?</p>\n      <div class=\"btn-row\">\n        <button class=\"btn primary\" id=\"promptMake\">Make a fresh one</button>\n        <button class=\"btn\" id=\"promptSig\">Send my signature pizza</button>\n        <button class=\"btn ghost\" id=\"promptSkip\">Skip</button>\n      </div>\n    </div>\n    <div class=\"card home-start\">\n      <h2>Send a pizza</h2>\n      <div class=\"kx-buttons\">\n        <button class=\"kx-btn\" id=\"homeNew\" type=\"button\"><canvas id=\"homeNewCanvas\" width=\"44\" height=\"44\" aria-hidden=\"true\"></canvas><span><b>Make a new pizza</b><small>Build it in the Kitchen</small></span></button>\n        <button class=\"kx-btn\" id=\"homeHire\" type=\"button\"><span class=\"g-av\" aria-hidden=\"true\"></span><span><b>Hire Gerald</b><small>Short on time? He makes it</small></span></button>\n      </div>\n    </div>\n    <div class=\"card special\" id=\"specialCard\">\n      <div class=\"section-head\" style=\"border:0;padding:0\"><p class=\"eyebrow\" id=\"spMonth\"></p><span class=\"tag\" id=\"spUntil\"></span></div>\n      <div class=\"sp-row\"><canvas id=\"spCanvas\" width=\"140\" height=\"140\" aria-label=\"This month's special pizza\"></canvas>\n        <div class=\"sp-text\"><h2 id=\"spName\"></h2><p id=\"spDesc\"></p><p class=\"muted\" style=\"font-size:.86rem\" id=\"spComes\"></p></div></div>\n      <p class=\"hint\" id=\"spGerald\"></p>\n      <div class=\"btn-row\"><button class=\"btn primary\" id=\"spSend\" type=\"button\">Send this pizza</button><button class=\"btn\" id=\"spPreview\" type=\"button\">Preview the unboxing</button></div>\n      <p class=\"muted\" style=\"font-size:.82rem\">Free: send it once this month. Pro: send it as often as you like, with the special box and confetti.</p>\n    </div>\n    <div class=\"card sponsored\" id=\"sponsorCard\" hidden>\n      <div class=\"section-head\" style=\"border:0;padding:0\"><p class=\"eyebrow\" id=\"soEyebrow\">Sponsored</p><span class=\"tag\">Sponsored</span></div>\n      <div class=\"sp-row\"><canvas id=\"soCanvas\" width=\"140\" height=\"140\" aria-label=\"This month's sponsored pizza\"></canvas>\n        <div class=\"sp-text\"><h2 id=\"soName\"></h2><p id=\"soDesc\"></p><p class=\"offer\" id=\"soOffer\"></p></div></div>\n      <p class=\"muted\" style=\"font-size:.82rem\">Free for everyone to send, and it doesn't count toward your monthly limit.</p>\n      <div class=\"btn-row\"><button class=\"btn primary\" id=\"soSend\" type=\"button\">Send this pizza</button><button class=\"btn\" id=\"soPreview\" type=\"button\">Preview the unboxing</button></div>\n    </div>\n    <div class=\"section-head\"><div><h2>This week</h2><p class=\"muted\" id=\"todayDate\"></p></div><span class=\"tag\">Sample calendar</span></div>\n    <ul class=\"meetings\" id=\"meetings\"></ul>\n    <p class=\"mode-line\" id=\"modeLine\"></p>\n    <button class=\"btn\" id=\"simEnd\">Simulate the 3:30 meeting ending</button>\n  </section>\n\n  <!-- KITCHEN -->\n  <section id=\"view-make\" hidden>\n    <p class=\"eyebrow\" id=\"makeFor\"></p>\n    <!-- Hire Gerald: a quick way to start a pizza, opened from the top of the Kitchen -->\n    <div class=\"kx\" id=\"kitchenExtras\">\n      <div class=\"kx-buttons kx-one\">\n        <button class=\"kx-btn\" id=\"kxHireBtn\" type=\"button\" aria-expanded=\"false\" aria-controls=\"kxHireWrap\"><span class=\"g-av\" aria-hidden=\"true\"></span><span><b>Hire Gerald</b><small>Short on time? He makes it</small></span></button>\n      </div>\n      <div class=\"kx-wrap\" id=\"kxHireWrap\" hidden>\n        <div class=\"card hire\">\n          <div class=\"section-head\" style=\"border:0;padding:0\"><p class=\"eyebrow\">Short on time?</p><span class=\"tag\">Pro feature</span></div>\n          <h2>Hire Gerald to make it</h2>\n          <p class=\"muted\">Tell him who it's for and the vibe. He builds, bakes, and names the pizza, then hands you the box to sign and send.</p>\n          <div class=\"field\"><label for=\"hireFor\">Who it's for</label><select id=\"hireFor\"></select></div>\n          <div class=\"field\"><label for=\"hireTopic\">What did you talk about?</label><input type=\"text\" id=\"hireTopic\" maxlength=\"30\" placeholder=\"Q1 launch\"><small>Gerald spells it out in pepperoni, one letter per slice.</small></div>\n          <div class=\"field\"><label>The vibe</label><div class=\"chips\" id=\"hireVibe\"></div></div>\n          <label class=\"check\"><input type=\"checkbox\" id=\"hireVegan\"> Make it vegan<span class=\"muted\" id=\"hireVeganNote\"></span></label>\n          <div class=\"btn-row\"><button class=\"btn primary\" id=\"hireBtn\">Hire Gerald</button></div>\n        </div>\n      </div>\n    </div>\n    <ol class=\"steps\" id=\"steps\"></ol>\n    <div class=\"stage\" id=\"stage\">\n      <canvas id=\"pizza\" aria-label=\"Your pizza. Tap to add to it.\"></canvas>\n      <button class=\"peek\" id=\"peek\" type=\"button\" aria-label=\"Potato is peeking. Tap her!\" hidden></button>\n      <div class=\"timer\" id=\"timer\" hidden></div>\n    </div>\n    <div class=\"g-say\" aria-live=\"polite\"><span class=\"g-av\"></span><p class=\"bubble\" id=\"geraldSay\"></p></div>\n    <div class=\"p-say\" id=\"potatoSay\" hidden aria-live=\"polite\"><span class=\"p-av\"></span><p class=\"bubble\" id=\"potatoText\"></p></div>\n\n    <div class=\"panel\" data-step=\"0\">\n      <h2>Toss the dough</h2>\n      <div class=\"field\">\n        <label>Is this pizza vegan?</label>\n        <div class=\"chips\"><button class=\"chip\" id=\"veganChip\" aria-pressed=\"false\">\ud83c\udf31 Make it vegan</button></div>\n        <p class=\"vegan-note\" id=\"veganHint\" hidden></p>\n        <small id=\"veganHelp\">Pick this before you start. Vegan uses a dough made without eggs, dairy, or honey, then swaps in plant pepperoni, dairy-free cheese, and a cashew garlic white sauce.</small>\n      </div>\n      <p class=\"muted\">Toss it in the air three times to stretch it out. Tap the dough or the button. Lopsided is encouraged.</p>\n      <div class=\"btn-row\"><button class=\"btn primary\" id=\"slap\">Toss it</button></div>\n      <details class=\"premade\" id=\"premadeBox\">\n        <summary>Short on time? Start from a pizzeria classic</summary>\n        <p class=\"muted\" style=\"font-size:.88rem;margin-top:6px\">Pick one and it lands on the Toppings step, already tossed, sauced, and cheesed. Add your own touch, then bake it.</p>\n        <div class=\"pm-grid\" id=\"premades\"></div>\n      </details>\n    </div>\n\n    <div class=\"panel\" data-step=\"1\" hidden>\n      <h2>Sauce and cheese</h2>\n      <div class=\"chips\" id=\"scMode\"></div>\n      <div id=\"sauceTools\" class=\"panel\">\n        <p class=\"muted\">Pick a sauce, then drag your finger across the dough to spread it. Mix sauces if you want.</p>\n        <div class=\"chips\" id=\"sauceChips\"></div>\n        <div class=\"btn-row\"><button class=\"btn small\" id=\"autoSauce\" type=\"button\">Spread it for me</button><button class=\"btn small ghost\" id=\"clearSauce\" type=\"button\">Clear sauce</button></div>\n      </div>\n      <div id=\"cheeseTools\" class=\"panel\" hidden>\n        <p class=\"muted\">Pick a cheese and sprinkle it wherever you want. Switch cheeses to mix as many as you like.</p>\n        <div class=\"chips\" id=\"cheeseChips\"></div>\n        <p class=\"count\" id=\"cheeseUsed\"></p>\n        <div class=\"btn-row\"><button class=\"btn small\" id=\"autoCheese\" type=\"button\">Sprinkle evenly</button><button class=\"btn small ghost\" id=\"clearCheese\" type=\"button\">Clear cheese</button></div>\n      </div>\n    </div>\n\n    <div class=\"panel\" data-step=\"2\" hidden>\n      <h2>Pile on toppings</h2>\n      <p class=\"muted\">Pick a topping, then tap or drag across the pizza. There's no limit.</p>\n      <p class=\"vegan-note\" id=\"veganNote\" hidden>\ud83c\udf31 Vegan pizza. Vegan dough, plant-based pepperoni, and dairy-free cheese.</p>\n      <p class=\"group-label\">Classic</p><div class=\"chips\" id=\"chips-food\"></div>\n      <p class=\"group-label\">About the meeting</p><div class=\"chips\" id=\"chips-meeting\"></div>\n      <p class=\"group-label\">Silly</p><div class=\"chips\" id=\"chips-silly\"></div>\n      <p class=\"group-label\">Pro toppings</p><div class=\"chips\" id=\"chips-pro\"></div>\n      <div class=\"field\">\n        <label for=\"labelText\">Add a message</label>\n        <div class=\"chips\" id=\"msgStyle\"></div>\n        <select id=\"quickLabel\" aria-label=\"Pick a message\"></select>\n        <div class=\"inline\"><input type=\"text\" id=\"labelText\" maxlength=\"24\" placeholder=\"Or write your own\"><button class=\"btn\" id=\"addLabel\" type=\"button\">Add</button></div>\n        <small id=\"msgHelp\"></small>\n        <div><button class=\"linkish\" id=\"removeSign\" type=\"button\">Remove pepperoni message</button></div>\n      </div>\n      <div class=\"btn-row\"><button class=\"btn small\" id=\"handful\">Sprinkle a handful</button><button class=\"btn small\" id=\"undo\">Undo</button><button class=\"btn small ghost\" id=\"clearTops\">Clear</button><span class=\"count\" id=\"topCount\"></span></div>\n    </div>\n\n    <div class=\"panel\" data-step=\"3\" hidden>\n      <h2>Bake it</h2>\n      <p class=\"muted\">The bake doubles as your break. Step away and come back when it dings.</p>\n      <div class=\"chips\" id=\"bakeChips\"></div>\n      <div class=\"btn-row\"><button class=\"btn primary\" id=\"bakeStart\">Start baking</button><button class=\"btn\" id=\"bakeEarly\" hidden>Take it out early</button></div>\n      <p id=\"bakeDone\" class=\"muted\" hidden>Golden and bubbly. Time to box it up.</p>\n      <div class=\"field\">\n        <label for=\"pizzaName\">Name your pizza</label>\n        <div class=\"inline\"><input type=\"text\" id=\"pizzaName\" maxlength=\"40\"><button class=\"btn\" id=\"suggestName\">Suggest</button></div>\n      </div>\n    </div>\n\n    <div class=\"panel\" data-step=\"4\" hidden>\n      <h2>Box it up</h2>\n      <div class=\"box-preview\">\n        <div class=\"lid\" id=\"lidPreview\"><div class=\"lid-logo\" id=\"lidLogo\"></div><div class=\"lid-biz\" id=\"lidBiz\"></div><div class=\"lid-sticker\" id=\"lidSticker\"></div><div class=\"lid-vegan\" hidden>\ud83c\udf31 Vegan</div></div>\n        <div class=\"inside\"><p class=\"eyebrow\" style=\"color:#7a5a3c\">Inside the lid</p><p class=\"hand\" id=\"notePreview\"></p><p class=\"hand sign\" id=\"signPreview\"></p></div>\n      </div>\n      <div class=\"field\">\n        <label>Your logo on the box<span class=\"pro-tag\">Pro</span></label>\n        <div class=\"upload\"><span class=\"thumb\" id=\"logoThumb\">None</span><label class=\"btn small\" for=\"logoFile\">Upload logo</label><input type=\"file\" id=\"logoFile\" accept=\"image/*\"><button class=\"btn small ghost\" id=\"logoRemove\">Remove</button></div>\n      </div>\n      <div class=\"field\"><label for=\"bizName\">Business name on the lid</label><input type=\"text\" id=\"bizName\" maxlength=\"40\"></div>\n      <div class=\"field\"><label>Box style</label><div class=\"chips\" id=\"styleChips\"></div></div>\n      <div class=\"field\"><label for=\"stickerSel\">Occasion sticker</label><select id=\"stickerSel\"></select></div>\n      <div class=\"field\"><label>Confetti when they open the box</label><div class=\"chips\" id=\"confettiChips\"></div><small>Tap one to see it.</small></div>\n      <div class=\"field\"><label for=\"noteText\">Your note</label><textarea id=\"noteText\" maxlength=\"280\"></textarea></div>\n      <div class=\"field\"><label for=\"signText\">Sign-off</label><input type=\"text\" id=\"signText\" maxlength=\"40\"></div>\n      <div class=\"field\"><label>Tone of Gerald's review</label><div class=\"chips\" id=\"toneChips\"></div></div>\n      <div class=\"two\">\n        <div class=\"field\"><label for=\"linkLabel\">Next-step button<span class=\"pro-tag\">Pro</span></label><input type=\"text\" id=\"linkLabel\" maxlength=\"30\"></div>\n        <div class=\"field\"><label for=\"linkUrl\">Button link</label><input type=\"url\" id=\"linkUrl\"></div>\n      </div>\n      <div class=\"reward-set\">\n        <p class=\"group-label\" style=\"margin:0\">\ud83c\udf81 Gift under the pizza<span class=\"pro-tag\">Pro</span></p>\n        <small class=\"muted\">Optional. They eat the pizza to reveal it, like a discount code for upgrading.</small>\n        <div class=\"field\"><label for=\"rwText\">What it is</label><input type=\"text\" id=\"rwText\" maxlength=\"60\" placeholder=\"20% off your first 3 months\"></div>\n        <div class=\"two\">\n          <div class=\"field\"><label for=\"rwCode\">Code</label><input type=\"text\" id=\"rwCode\" maxlength=\"30\" placeholder=\"THANKS20\"></div>\n          <div class=\"field\"><label for=\"rwLink\">Where to use it</label><input type=\"url\" id=\"rwLink\" placeholder=\"yoursite.com/upgrade\"></div>\n        </div>\n        <div class=\"field\"><label for=\"rwExp\">Expires (optional)</label><input type=\"date\" id=\"rwExp\"></div>\n      </div>\n    </div>\n\n    <div class=\"panel\" data-step=\"5\" hidden>\n      <h2 id=\"sendHeading\">Send it</h2>\n      <div class=\"guest\" id=\"guestBox\" hidden>\n        <h3>Last step: who's it from?</h3>\n        <p class=\"muted\" style=\"font-size:.9rem\">Add your name and email and we'll send your pizza and set up your free account, so you can see when they open it. No password needed.</p>\n        <div class=\"two\">\n          <div class=\"field\"><label for=\"gName\">Your name</label><input type=\"text\" id=\"gName\" autocomplete=\"name\"></div>\n          <div class=\"field\"><label for=\"gEmail\">Your email</label><input type=\"text\" id=\"gEmail\" inputmode=\"email\" autocomplete=\"email\"></div>\n        </div>\n      </div>\n      <div class=\"send-fields\" id=\"sendFields\" style=\"display:flex;flex-direction:column;gap:12px\">\n        <div class=\"two\">\n          <div class=\"field\"><label for=\"toName\">Who it's for</label><input type=\"text\" id=\"toName\"></div>\n          <div class=\"field\"><label for=\"toContact\">Their email or phone</label><input type=\"text\" id=\"toContact\"></div>\n        </div>\n        <div class=\"field\"><label for=\"mtgTitle\">Meeting</label><input type=\"text\" id=\"mtgTitle\"></div>\n        <div class=\"field\"><label>Send by</label><div class=\"chips\" id=\"methodChips\"></div></div>\n        <div class=\"msg\"><span class=\"eyebrow\" id=\"msgLabel\"></span><span class=\"subj\" id=\"msgSubj\"></span><span id=\"msgBody\"></span></div>\n        <p class=\"muted\" style=\"font-size:.82rem\">The link is a sample. The real app creates one for each pizza.</p>\n      </div>\n      <div class=\"btn-col\">\n        <button class=\"btn primary\" id=\"previewR\">Preview what they'll see</button>\n        <button class=\"btn\" id=\"sendNow\">Send pizza</button>\n        <button class=\"btn\" id=\"copyMsg\">Copy message</button>\n        <button class=\"btn ghost\" id=\"saveSig\">Save as my signature pizza</button>\n      </div>\n    </div>\n\n    <div class=\"nav-row\"><button class=\"btn\" id=\"back\">Back</button><button class=\"btn primary\" id=\"next\">Next</button></div>\n  </section>\n\n  <!-- PEOPLE (mini CRM) -->\n  <section id=\"view-people\" hidden>\n    <div class=\"section-head\"><h2>People</h2><span class=\"tag\">Mini CRM</span></div>\n    <p class=\"muted\">Everyone you've sent a pizza to. Open someone to see their history, jot notes, or send another pizza with a new message.</p>\n    <div class=\"card\">\n      <div class=\"g-head\"><span class=\"g-av\"></span><div><h3>Send to a whole list</h3><p class=\"muted\" style=\"font-size:.9rem\">Upload a CSV of clients for holidays or client appreciation. Everyone on it gets added here too.</p></div></div>\n      <div class=\"btn-row\"><button class=\"btn small\" id=\"openBulk\">Upload a CSV</button><span class=\"tag\">Pro</span></div>\n    </div>\n    <div class=\"inline\"><input type=\"text\" id=\"peopleSearch\" placeholder=\"Search by name or company\" aria-label=\"Search people\"><button class=\"btn small\" id=\"addPersonBtn\">Add person</button></div>\n    <div class=\"card\" id=\"addPerson\" hidden>\n      <h3>Add a person</h3>\n      <div class=\"two\">\n        <div class=\"field\"><label for=\"npName\">Name</label><input type=\"text\" id=\"npName\"></div>\n        <div class=\"field\"><label for=\"npContact\">Email or phone</label><input type=\"text\" id=\"npContact\"></div>\n      </div>\n      <div class=\"field\"><label for=\"npCompany\">Company</label><input type=\"text\" id=\"npCompany\"></div>\n      <label class=\"check\"><input type=\"checkbox\" id=\"npVegan\"> Vegan</label>\n      <div class=\"btn-row\"><button class=\"btn primary small\" id=\"savePerson\">Save</button><button class=\"btn ghost small\" id=\"cancelPerson\">Cancel</button></div>\n    </div>\n    <ul class=\"people\" id=\"peopleList\"></ul>\n  </section>\n\n  <!-- GERALD -->\n  <section id=\"view-gerald\" hidden>\n    <details class=\"card acc\" id=\"meetCrew\">\n      <summary><span class=\"acc-icons\"><span class=\"g-av\"></span><span class=\"p-av\"></span></span><span class=\"acc-t\"><b>Meet the crew</b><small>Gerald, head critic, and Potato, head of delivery</small></span><span class=\"chev\" aria-hidden=\"true\"></span></summary>\n    <div class=\"crew-member\">\n      <div class=\"g-head\"><span class=\"g-av big\"></span><div><p class=\"eyebrow\">Head critic, Slice of Thanks</p><h2>Gerald</h2></div></div>\n      <p>Gerald is a raccoon. He spent ten years eating leftover crusts behind a family pizzeria, and now he reviews every pizza before it goes out the door.</p>\n      <ul class=\"g-facts\">\n        <li><b>Rates in:</b> slices, 1 to 5</li>\n        <li><b>Favorite topping:</b> whatever fell on the floor</li>\n        <li><b>Known for:</b> his bow tie and very strong opinions</li>\n        <li><b>House rule:</b> any pizza made with care gets at least 3 slices</li>\n      </ul>\n    </div>\n\n    <div class=\"crew-member\">\n      <div class=\"g-head\"><span class=\"p-av big\"></span><div><p class=\"eyebrow\">Head of Delivery</p><h2>Potato</h2></div></div>\n      <p>Potato is the real dog behind Slice of Thanks. She rides the delivery scooter, barks when your pizza comes out of the oven, and tries to sneak a slice on every single delivery.</p>\n      <ul class=\"g-facts\">\n        <li><b>Known for:</b> big beautiful eyes, a bulldog frown, and one proud snaggletooth</li>\n        <li><b>Favorite topping:</b> the one you just dropped</li>\n        <li><b>Always wears:</b> her rose-gold collar, plus a helmet and goggles when she drives</li>\n        <li><b>Relationship with Gerald:</b> complicated. He guards the pizza. She tests his patience.</li>\n      </ul>\n    </div>\n    </details>\n\n    <details class=\"card acc treats\" id=\"treatJar\">\n      <summary><span class=\"acc-icons\"><span class=\"p-av\"></span></span><span class=\"acc-t\"><b>Potato's Treat Jar</b><small><span id=\"treatBalS\">0</span> Treats \u00b7 <span id=\"eggCountS\">0 of 8</span> easter eggs found</small></span><span class=\"chev\" aria-hidden=\"true\"></span></summary>\n      <p><b><span id=\"treatBal\">0</span> Treats</b></p>\n      <p class=\"muted\" style=\"font-size:.9rem\">Potato hid easter eggs all over the app. Find them to earn Treats, then spend them on the Secret Menu. Treats can't be bought.</p>\n      <p class=\"group-label\" id=\"eggCount\"></p>\n      <ul class=\"eggs\" id=\"eggList\"></ul>\n      <p class=\"group-label\">Secret Menu</p>\n      <ul class=\"eggs\" id=\"secretList\"></ul>\n    </details>\n\n    <div class=\"card\">\n      <h2>Gerald's tips</h2>\n      <div class=\"tip\"><span class=\"g-av\"></span><p class=\"bubble\" id=\"tipText\"></p></div>\n      <div class=\"btn-row\"><button class=\"btn small\" id=\"nextTip\">Another tip</button><span class=\"count\" id=\"tipCount\"></span></div>\n    </div>\n\n    <div class=\"card\">\n      <h2>What's new</h2>\n      <p class=\"muted\" style=\"font-size:.9rem\">Updates from the Slice of Thanks kitchen. Tap Try it to see something new in action.</p>\n      <ul class=\"feed\" id=\"feed\"></ul>\n      <div class=\"btn-row\"><button class=\"btn small\" id=\"feedMore\" type=\"button\">See all updates</button></div>\n    </div>\n  </section>\n\n  <!-- WHAT'S NEW: every update -->\n  <section id=\"view-news\" hidden>\n    <div><button class=\"linkish\" id=\"newsBack\">Back to Crew</button></div>\n    <div class=\"card\">\n      <h2>What's new</h2>\n      <p class=\"muted\" style=\"font-size:.9rem\">Every update from the Slice of Thanks kitchen, newest first.</p>\n      <ul class=\"feed\" id=\"feedAll\"></ul>\n    </div>\n  </section>\n\n  <!-- BULK SEND -->\n  <section id=\"view-bulk\" hidden>\n    <div><button class=\"linkish\" id=\"bulkBack\">Back to People</button></div>\n    <div class=\"section-head\"><h2>Send to a list</h2><span class=\"tag\">Pro feature</span></div>\n    <p class=\"muted\">Upload a list and send a pizza to everyone on it. Good for holidays, client appreciation, or following up after an event.</p>\n\n    <div class=\"card\">\n      <h3>1. Upload your list</h3>\n      <div class=\"btn-row\"><label class=\"btn small\" for=\"csvFile\">Upload a CSV</label><input type=\"file\" id=\"csvFile\" accept=\".csv,text/csv\" class=\"sr\"><button class=\"btn small\" id=\"sampleCsv\">Use a sample list</button><button class=\"btn small ghost\" id=\"copyHeader\">Copy column headers</button></div>\n      <small class=\"muted\">Columns Slice of Thanks looks for: Name, Email or Phone, Company, and Vegan (yes or no). Extra columns are ignored.</small>\n      <p id=\"listSummary\" class=\"muted\"></p>\n      <div class=\"table-wrap\" id=\"tableWrap\" hidden><table id=\"listTable\"></table></div>\n    </div>\n\n    <div class=\"card\">\n      <h3>2. Choose the pizza</h3>\n      <div class=\"chips\" id=\"bulkMode\"></div>\n      <p class=\"muted\" id=\"bulkModeHelp\" style=\"font-size:.9rem\"></p>\n    </div>\n\n    <div class=\"card\">\n      <h3>3. Dress the box</h3>\n      <div class=\"field\">\n        <label>Your logo on the top of the box</label>\n        <div class=\"upload\"><span class=\"thumb\" id=\"logoThumb3\">None</span><label class=\"btn small\" for=\"logoFile3\">Upload logo</label><input type=\"file\" id=\"logoFile3\" accept=\"image/*\"><button class=\"btn small ghost\" id=\"logoRemove3\">Remove</button></div>\n        <small>Every box on this list gets your logo. PNG with a transparent background looks best.</small>\n      </div>\n      <div class=\"field\"><label for=\"bulkBiz\">Business name on the lid</label><input type=\"text\" id=\"bulkBiz\" maxlength=\"40\"></div>\n      <div class=\"field\"><label for=\"bulkStickerSel\">Occasion sticker</label><select id=\"bulkStickerSel\"></select></div>\n      <div class=\"field\"><label>Confetti when they open the box</label><div class=\"chips\" id=\"bulkConfetti\"></div></div>\n      <div class=\"field\"><label>Box style</label><div class=\"chips\" id=\"bulkStyle\"></div></div>\n      <div class=\"field\"><label for=\"bulkNote\">Note inside the lid</label><textarea id=\"bulkNote\" maxlength=\"280\"></textarea><small>Use {first} for their first name and {company} for their company.</small></div>\n      <div class=\"field\"><label for=\"bulkSign\">Sign-off</label><input type=\"text\" id=\"bulkSign\" maxlength=\"40\"></div>\n      <p class=\"eyebrow\" id=\"bulkPreviewLabel\">Preview</p>\n      <div class=\"box-preview\">\n        <div class=\"lid\" id=\"bLid\"><div class=\"lid-logo\" id=\"bLogo\"></div><div class=\"lid-biz\" id=\"bBiz\"></div><div class=\"lid-sticker\" id=\"bSticker\"></div><div class=\"lid-vegan\" hidden>\ud83c\udf31 Vegan</div></div>\n        <div class=\"inside\"><p class=\"hand\" id=\"bNote\"></p><p class=\"hand sign\" id=\"bSign\"></p></div>\n      </div>\n    </div>\n\n    <div class=\"card\">\n      <h3>4. When to send</h3>\n      <div class=\"chips\" id=\"bulkWhen\"></div>\n      <div class=\"field\" id=\"bulkDateField\" hidden><label for=\"bulkDate\">Send on</label><input type=\"text\" id=\"bulkDate\" value=\"December 15, 2026 at 9:00 AM\"></div>\n    </div>\n\n    <div class=\"card\">\n      <h3>5. Review and send</h3>\n      <p id=\"bulkReview\"></p>\n      <div class=\"progress\" id=\"bulkProgress\" hidden><span id=\"bulkBar\"></span></div>\n      <p class=\"muted\" id=\"bulkResult\" hidden></p>\n      <div class=\"btn-col\">\n        <button class=\"btn\" id=\"bulkPreview\">Preview the first pizza</button>\n        <button class=\"btn primary\" id=\"bulkSend\">Send pizzas</button>\n      </div>\n      <small class=\"muted\">Prototype only. Nothing is emailed. Free plans send up to 5 at a time; Pro sends up to 500.</small>\n    </div>\n  </section>\n\n  <!-- SIGN-UP GATE (guests) -->\n  <section id=\"view-gate\" hidden>\n    <div class=\"card\">\n      <div class=\"g-head\"><span class=\"g-av big\"></span><div><p class=\"eyebrow\">Free account</p><h2 id=\"gateTitle\">Make your first pizza to unlock this</h2></div></div>\n      <p>You can build and send a pizza right now without signing up. When you send it, you add your email and your free account is set up automatically.</p>\n      <p class=\"muted\" id=\"gateWhat\"></p>\n      <div class=\"btn-row\"><button class=\"btn primary\" id=\"gateStart\">Make a pizza</button><button class=\"btn\" id=\"gateSignin\">I already have an account</button></div>\n    </div>\n  </section>\n\n  <!-- ADMIN -->\n  <section id=\"view-admin\" hidden>\n    <div><button class=\"linkish\" id=\"adminBack\" type=\"button\">Back to Settings</button></div>\n    <div class=\"section-head\"><h2>Admin</h2><span class=\"tag\">Owner only</span></div>\n    <p class=\"muted\">Changes here update the app for everyone. In the real build this is a private admin page on your Brilliant Directories site.</p>\n    <div class=\"chips\" id=\"adminTabs\"></div>\n    <div id=\"adm-special\" class=\"panel\"></div>\n    <div id=\"adm-sponsor\" class=\"panel\" hidden></div>\n    <div id=\"adm-news\" class=\"panel\" hidden></div>\n  </section>\n\n  <!-- SETTINGS -->\n  <section id=\"view-settings\" hidden>\n    <div class=\"card\" id=\"planCard\"></div>\n    <div class=\"card\">\n      <h2>After a meeting ends</h2>\n      <label class=\"radio\"><input type=\"radio\" name=\"mode\" value=\"ask\" id=\"mode-ask\"><span><b>Ask me each time</b><small>You get a prompt and choose to make a fresh pizza, send your signature pizza, or skip.</small></span></label>\n      <label class=\"radio\"><input type=\"radio\" name=\"mode\" value=\"auto\" id=\"mode-auto\"><span><b>Send my signature pizza automatically<span class=\"pro-tag\">Pro</span></b><small>Your saved pizza and note go out on their own after the meeting ends.</small></span></label>\n      <label class=\"radio\"><input type=\"radio\" name=\"mode\" value=\"off\" id=\"mode-off\"><span><b>Do nothing</b><small>Make pizzas only when you open the app.</small></span></label>\n      <label class=\"check\"><input type=\"checkbox\" id=\"extOnly\"> Only for meetings with people outside my company</label>\n    </div>\n    <div class=\"card\">\n      <h2>Your signature pizza</h2>\n      <div class=\"sig\"><canvas id=\"sigCanvas\" aria-label=\"Your signature pizza\"></canvas><div style=\"display:flex;flex-direction:column;gap:8px;min-width:0\"><h3 id=\"sigName\"></h3><p class=\"muted\" style=\"font-size:.9rem\">This is the one that goes out when you pick \"Send my signature pizza\" or turn on automatic sending.</p><div><button class=\"btn small\" id=\"editSig\">Edit signature pizza</button></div></div></div>\n    </div>\n    <div class=\"card\">\n      <h2>Your box</h2>\n      <div class=\"field\"><label for=\"pName\">Your name</label><input type=\"text\" id=\"pName\" maxlength=\"40\"></div>\n      <div class=\"field\"><label>Logo<span class=\"pro-tag\">Pro</span></label><div class=\"upload\"><span class=\"thumb\" id=\"logoThumb2\">None</span><label class=\"btn small\" for=\"logoFile2\">Upload logo</label><input type=\"file\" id=\"logoFile2\" accept=\"image/*\"></div></div>\n      <div class=\"field\"><label>Brand colors<span class=\"pro-tag\">Pro</span></label><div class=\"upload\"><input type=\"color\" id=\"brand1\" value=\"#1f4e79\" aria-label=\"Brand color 1\"><input type=\"color\" id=\"brand2\" value=\"#f1ad2d\" aria-label=\"Brand color 2\"><small class=\"muted\">Used for your box and brand color confetti.</small></div></div>\n      <div class=\"field\"><label for=\"pBiz\">Business name</label><input type=\"text\" id=\"pBiz\" maxlength=\"40\"></div>\n      <div class=\"field\"><label for=\"pNote\">Default thank-you note</label><textarea id=\"pNote\" maxlength=\"280\"></textarea></div>\n      <div class=\"two\">\n        <div class=\"field\"><label for=\"pLinkLabel\">Next-step button<span class=\"pro-tag\">Pro</span></label><input type=\"text\" id=\"pLinkLabel\" maxlength=\"30\"></div>\n        <div class=\"field\"><label for=\"pLink\">Button link</label><input type=\"url\" id=\"pLink\"></div>\n      </div>\n    </div>\n    <div class=\"card\">\n      <h2>Dietary needs</h2>\n      <p class=\"muted\">You can mark a contact as vegan as a reminder. Vegan is never turned on for you. You choose it yourself on the Dough step, and Slice of Thanks shows a heads-up when the person you're sending to is marked vegan. In the sample calendar, Priya Shah is marked vegan.</p>\n    </div>\n    <div class=\"card\" id=\"adminCard\" hidden>\n      <h2>Admin</h2>\n      <p class=\"muted\">Edit the Pizza of the Month for every month and the What's new announcements.</p>\n      <div class=\"btn-row\"><button class=\"btn small primary\" id=\"openAdmin\" type=\"button\">Open admin settings</button></div>\n    </div>\n    <div class=\"card\">\n      <h2>Prototype</h2>\n      <div class=\"field\"><label>View the app as</label><div class=\"chips\" id=\"viewAsChips\"></div><small>In the real app, the admin section only shows to you. Members see their own plan.</small></div>\n      <p class=\"muted\">See the app the way a first-time visitor does: straight into the kitchen, with sign-up at the end.</p>\n      <div class=\"btn-row\"><button class=\"btn small\" id=\"resetGuest\">Start over as a new visitor</button></div>\n    </div>\n    <div class=\"card\">\n      <h2>Calendar</h2>\n      <p class=\"muted\">The prototype uses a sample calendar. The real app would connect to Google Calendar or Outlook and spot meetings with outside guests.</p>\n      <div class=\"btn-row\"><button class=\"btn small\" disabled>Connect Google Calendar</button><button class=\"btn small\" disabled>Connect Outlook</button></div>\n    </div>\n  </section>\n</div>\n\n<!-- RECIPIENT PREVIEW -->\n<div class=\"overlay\" id=\"recipient\" hidden role=\"dialog\" aria-modal=\"true\" aria-label=\"What the recipient sees\">\n  <div class=\"ov-inner\">\n    <div class=\"ov-top\"><span class=\"tag\">What they'll see</span><button class=\"btn ghost\" id=\"ovClose\">Close</button></div>\n    <div class=\"r-stage\" id=\"rs1\">\n      <div class=\"scooter scoot-wrap\"><p class=\"bark\" id=\"zBark\" hidden></p><div class=\"scoot-art\"><button class=\"potato\" type=\"button\" aria-label=\"Pet Potato\"></button><img src=\"data:image/png;base64,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\" alt=\"Potato the bulldog driving a red delivery scooter in her helmet and goggles, with the sender's logo on the delivery box\"><span class=\"scoot-logo\" id=\"rScootLogo\"></span></div></div>\n      <p class=\"r-from\" id=\"rFrom\"></p>\n      <div class=\"rbox\" id=\"rbox\">\n        <div class=\"inside\"><p class=\"hand\" id=\"rNote\"></p><p class=\"hand sign\" id=\"rSign\"></p></div>\n        <div class=\"lid\" id=\"rLid\"><div class=\"lid-logo\" id=\"rLogo\"></div><div class=\"lid-biz\" id=\"rBiz\"></div><div class=\"lid-sticker\" id=\"rSticker\"></div><div class=\"lid-vegan\" hidden>\ud83c\udf31 Vegan</div></div>\n      </div>\n      <button class=\"btn primary\" id=\"rOpen\">Open the box</button>\n    </div>\n    <div class=\"r-stage\" id=\"rs2\" hidden>\n      <button class=\"eat-btn\" id=\"rEatBtn\" type=\"button\" aria-label=\"Take a bite of the pizza\"><img class=\"r-pizza\" id=\"rPizza\" alt=\"\"></button>\n      <p class=\"eat-hint\" id=\"rEatHint\" aria-live=\"polite\">Tap a slice to eat it.</p>\n      <a class=\"btn primary r-cta\" id=\"rLink\" target=\"_blank\" rel=\"noopener\"></a>\n      <p class=\"gift-tease\" id=\"rGiftTease\" hidden></p>\n      <div class=\"eaten\" id=\"rEaten\" hidden><svg viewBox=\"0 0 300 220\" role=\"img\" aria-label=\"An empty pizza box with crumbs and one leftover crust\"><rect x=\"20\" y=\"24\" width=\"260\" height=\"180\" rx=\"10\" fill=\"#c99b6b\" stroke=\"#3a1d12\" stroke-width=\"4\"/><rect x=\"40\" y=\"40\" width=\"220\" height=\"150\" rx=\"6\" fill=\"#e6c79c\"/><ellipse cx=\"120\" cy=\"105\" rx=\"40\" ry=\"26\" fill=\"#b98a55\" opacity=\".45\"/><ellipse cx=\"190\" cy=\"140\" rx=\"30\" ry=\"18\" fill=\"#b98a55\" opacity=\".35\"/><ellipse cx=\"170\" cy=\"80\" rx=\"18\" ry=\"11\" fill=\"#b98a55\" opacity=\".3\"/><path d=\"M70 160 Q100 132 140 150\" stroke=\"#d9a35e\" stroke-width=\"12\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M70 160 Q100 132 140 150\" stroke=\"#b07a3a\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" opacity=\".6\"/><g fill=\"#d9a35e\"><circle cx=\"90\" cy=\"90\" r=\"3\"/><circle cx=\"210\" cy=\"100\" r=\"2.5\"/><circle cx=\"160\" cy=\"170\" r=\"3\"/><circle cx=\"230\" cy=\"160\" r=\"2\"/><circle cx=\"130\" cy=\"70\" r=\"2\"/><circle cx=\"185\" cy=\"118\" r=\"2.5\"/><circle cx=\"105\" cy=\"128\" r=\"2\"/></g><g fill=\"#c23a28\"><circle cx=\"150\" cy=\"110\" r=\"2.5\"/><circle cx=\"220\" cy=\"128\" r=\"2\"/></g><path d=\"M20 24 L280 24 L262 6 L38 6 Z\" fill=\"#b5895c\" stroke=\"#3a1d12\" stroke-width=\"4\" stroke-linejoin=\"round\"/></svg><img class=\"eaten-potato\" src=\"data:image/png;base64,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\" alt=\"Potato celebrating\"><h3>All gone.</h3><div class=\"gift-card\" id=\"rGift\" hidden><p class=\"eyebrow\">Under the pizza</p><p class=\"gc-what\" id=\"rGiftWhat\"></p><span class=\"gift-code\" id=\"rGiftCode\"></span><small class=\"muted\" id=\"rGiftExp\"></small><div class=\"btn-row\"><button class=\"btn small\" id=\"rGiftCopy\" type=\"button\">Copy code</button><a class=\"btn small primary\" id=\"rGiftUse\" target=\"_blank\" rel=\"noopener\">Use it now</a></div></div><p class=\"muted\" id=\"rEatenLine\"></p><button class=\"btn primary\" id=\"rBack2\" type=\"button\">Send a pizza back</button></div>\n      <h2 id=\"rName\"></h2>\n      <p class=\"vegan-note\" id=\"rVegan\" hidden style=\"align-self:center\">\ud83c\udf31 100% vegan, from the dough up.</p>\n      <div class=\"receipt\">\n        <span class=\"rh\">GERALD'S REVIEW</span>\n        <span class=\"r-critic\"><span class=\"g-av\"></span><span>Gerald<br>Head critic, Slice of Thanks</span></span>\n        <hr>\n        <span id=\"rReview\"></span>\n        <span id=\"rRating\"></span>\n        <span id=\"rSlices\"></span>\n        <hr>\n        <span id=\"rMeta\"></span>\n        <hr>\n        <span class=\"r-critic\"><span class=\"p-av\"></span><span id=\"rPotato\"></span></span>\n      </div>\n      <details class=\"who-g\"><summary>Who are Gerald and Potato?</summary><p>Gerald is the raccoon who reviews every pizza made on Slice of Thanks before it's delivered. He spent ten years eating leftover crusts behind a family pizzeria, so he knows what he's talking about. Mostly. Potato is the real dog behind Slice of Thanks and the one who brings every pizza to the door. She tries to eat a slice on every delivery.</p></details>\n      <div class=\"sponsor-box\" id=\"rSponsor\" hidden></div>\n      <button class=\"btn\" id=\"rBack\">Send a pizza back</button>\n      <p class=\"made-with\" id=\"rMadeWith\" hidden>Made with Slice of Thanks. Make your own, free.</p>\n    </div>\n  </div>\n</div>\n<canvas id=\"confetti\" aria-hidden=\"true\" style=\"position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:70\"></canvas>\n<div class=\"toast\" id=\"toast\" hidden role=\"status\"></div>\n<div class=\"sheet-back\" id=\"upSheet\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"upTitle\"><div class=\"sheet\">\n  <p class=\"eyebrow\" style=\"margin:0\">Upgrade your pizza</p><h2 id=\"upTitle\"></h2><p class=\"muted\" id=\"upWhy\" style=\"margin:0\"></p>\n  <p style=\"margin:6px 0 0;font-weight:700\">The Whole Pie also includes</p><ul class=\"up-list\" id=\"upList\"></ul>\n  <div class=\"btn-row\"><button class=\"btn primary\" id=\"upMonthly\" type=\"button\">Try The Whole Pie free for 14 days</button><button class=\"btn\" id=\"upYearly\" type=\"button\">Special Delivery, $2.99</button></div>\n  <p class=\"muted\" id=\"upNote\" style=\"margin:0;font-size:.82rem\">The Whole Pie is $9 a month or $90 a year after the trial, with 250 emails a month. Cancel anytime. Special Delivery is a one-time $2.99 that unlocks these features for one pizza and includes its send.</p>\n  <button class=\"btn ghost\" id=\"upLater\" type=\"button\">Maybe later</button></div></div>\n\n</div>";
window.__SOT_ROOT=SOTR;

(function(){
const $=s=>SOTR.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('sot_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('sot_'+k,JSON.stringify(v))}catch(e){}}};

/* ---------- data ---------- */
const SAUCES={rose:{n:'Pink garlic',c:'#e98a9a',special:true},gold:{n:'Golden butter',c:'#e9c46a',special:true},gravy:{n:"Potato's Secret Sauce",c:'#8a5a2b',secret:true},red:{n:'Classic red',c:'#c23a28'},pesto:{n:'Pesto',c:'#5f8f3a'},white:{n:'Garlic white',c:'#f1e6cf'},bbq:{n:'BBQ',c:'#7a3518'},purple:{n:'Suspicious purple',c:'#7d3c98'}};
const CHEESES={
 mozz:{n:'Mozzarella',c:['#fff4c9','#f4c95c'],style:'melt'},cheddar:{n:'Cheddar',c:['#f9c247','#df8a22'],style:'melt'},
 parm:{n:'Parmesan',c:['#f6ebcd','#e3c27c'],style:'flake'},goat:{n:'Goat cheese',c:['#fffdf6','#f1dfb6'],style:'dollop'},
 vmozz:{n:'Vegan mozzarella',c:['#fffbea','#f1d88f'],style:'melt',vegan:true},vched:{n:'Vegan cheddar',c:['#fbd06a','#e6a03c'],style:'melt',vegan:true}};
const CHEESE_SAY={mozz:'Mozzarella. Classic. You cannot go wrong.',cheddar:'Cheddar on pizza? Bold. I am in.',parm:'Fancy little flakes. Very refined.',
 goat:'Goat cheese. Someone has taste.',vmozz:'Melty and plant-based. Nice.',vched:'Vegan cheddar. A modern classic.',none:'No cheese? I will allow it.'};
function veganize(p){veganize(p);if(p.cheeseDabs)p.cheeseDabs.forEach(d=>d.k=swapCheese(d.k,true))}
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
 handshake:{n:'Handshake',e:'🤝',g:'meeting'},idea:{n:'Big idea',e:'💡',g:'meeting'},coffee:{n:'Coffee',e:'☕',g:'meeting'},
 rocket:{n:'Launch',e:'🚀',g:'meeting'},calendar:{n:'Next meeting',e:'📅',g:'meeting'},scales:{n:'Justice',e:'⚖️',g:'meeting'},
 duck:{n:'Rubber duck',e:'🦆',g:'silly'},sock:{n:'A sock',e:'🧦',g:'silly'},eyes:{n:'Googly eyes',e:'👀',g:'silly'},hat:{n:'Tiny hat',e:'🎩',g:'silly'}
};
const STICKERS=['Thank You','Great Meeting','Nice to Meet You',"Let's Do This"];
const STYLES={kraft:'Kraft',classic:'Classic',gold:'Fancy gold',midnight:'Midnight gold',plaid:'Plaid',floral:'Floral',picnic:'Picnic',garden:'Spring garden',hearts:'Hearts'};
const PRO_STYLES=['gold','midnight','plaid','floral','picnic','garden','hearts'];
const BAKES=[[10,'10 sec demo'],[60,'1 min'],[180,'3 min'],[300,'5 min']];
const STEPS=['Dough','Sauce','Toppings','Bake','Box','Send'];

const DEFAULT_PROFILE={name:'',business:'',logo:null,link:'',linkLabel:'Book a follow-up',
 note:'Thank you for making time to meet today. I loved hearing about your plans and I am excited about what comes next.',sign:'',boxStyle:'kraft',sticker:'Thank You'};
let profile=Object.assign({},DEFAULT_PROFILE,store.get('profile',{}));
let settings=Object.assign({mode:'ask',extOnly:true},store.get('settings',{}));
let signature=store.get('signature',null)||defaultSignature();
(function(){const ls=signature.toppings.filter(t=>t.k==='label');if(ls.length&&!signature.sign){signature.sign={text:ls.map(t=>t.label).join(' ')};signature.toppings=signature.toppings.filter(t=>t.k!=='label')}})();

function sampleMeetings(){return [
 {id:'m1',time:'9:00 AM',title:'Partnership call',who:'Jordan Reyes',org:'Brightline Legal',contact:'jordan@brightlinelegal.example',status:'sent',how:'signature'},
 {id:'m2',time:'11:00 AM',title:'Intro call',who:'Priya Shah',org:'Shah & Ortiz LLP',contact:'priya@shahortiz.example',status:'prompt',vegan:true},
 {id:'m3',time:'1:30 PM',title:'Team standup',who:'Your team',org:'Internal',internal:true,status:'skipped'},
 {id:'m4',time:'3:30 PM',title:'Demo call',who:'Marcus Lee',org:'Harbor Paralegal Services',contact:'(909) 555-0142',status:'upcoming'}
];}
let meetings=sampleMeetings();
meetings[0].pizza=clonePizza(signature);meetings[0].box=boxFromProfile(meetings[0]);

/* ---------- helpers ---------- */
function rng(seed){let s=(Math.floor(seed*1e6)>>>0)||1;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function hex(h){h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}
function mix(a,b,t){const A=hex(a),B=hex(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'}
const ease=t=>1-Math.pow(1-t,3);
function first(n){return (n||'there').trim().split(/\s+/)[0]}
function slug(s){return (s||'pizza').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'pizza'}
let toastTimer;
let viewAs=store.get('viewAs','free');
function isPro(){return viewAs!=='free'}
function isAdmin(){return viewAs==='admin'}
const FREE_PREMADES=['marg','pep','veggie','vegan'];
const PRO_TOPS=['pepStar','pepHeart','coin','sparkle'];
const PRO_INFO={
 general:['Make every pizza look like your business','Your logo, your colors, and your own button on every pizza you send.'],
 logo:['Put your logo on the box','Your logo goes on the lid of every pizza, and it can burst out as confetti.'],
 brand:['Use your brand colors','Your colors on the box and in the confetti.'],
 style:['Unlock 7 more box styles','Fancy gold, Midnight gold, Plaid, Floral, Picnic, Spring garden, and Hearts.'],
 confetti:['Unlock Pro confetti','Gold sparkles, confetti in your brand colors, and your logo bursting out of the box.'],
 toppings:['Unlock Pro toppings','Star and heart pepperoni, gold coins, and sparklers.'],
 premade:['Unlock all 10 pizzeria classics','Supreme, Hawaiian-ish, BBQ Ranch Hand, White Pizza, Four Cheese, and Pesto Garden.'],
 reward:['Hide a gift under the pizza','Add a discount or coupon code they reveal by eating the pizza. Great for nudging free trials to upgrade.'],
 button:['Add your own button','Send them to your calendar with a "Book a follow-up" button under the pizza.'],
 auto:['Send pizzas automatically after meetings','Your signature pizza goes out on its own when a meeting with an outside guest ends.'],
 bulk:['Send to a whole list','Upload a CSV and send holiday pizzas to everyone at once, with names spelled in pepperoni.']};
const PRO_LIST=['Your logo and brand colors on the box','A gift code they reveal by eating the pizza','Logo confetti and Gold sparkles','7 more box styles','Shaped pepperoni and premium toppings','Your own button, like "Book a follow-up"','250 emails a month, plus email packs when you need more','CSV sends, scheduling, and webhooks','Auto-send after Calendly and TidyCal meetings'];
function upgrade(key){const i=PRO_INFO[key]||PRO_INFO.general;$('#upTitle').textContent=i[0];$('#upWhy').textContent=i[1];
 const ul=$('#upList');ul.innerHTML='';PRO_LIST.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.appendChild(li)});
 $('#upSheet').hidden=false;$('#upMonthly').focus()}
function closeUp(){$('#upSheet').hidden=true}
function goPro(term){closeUp();if(viewAs==='free')viewAs='pro';store.set('viewAs',viewAs);refreshPlan();burst('gold');
 toast('Welcome to Pro'+(term==='year'?' (yearly)':'')+'. In the real app this goes to checkout through Brilliant Directories.')}
function sendCount(){const m=new Date().toISOString().slice(0,7),sc=store.get('sendCount',{m,n:0});return sc.m===m?sc.n:0}
function bumpSend(){const m=new Date().toISOString().slice(0,7);store.set('sendCount',{m,n:sendCount()+1})}
function renderPlanCard(){const el=$('#planCard');if(!el)return;const pro=isPro(),n=sendCount();
 const col=(name,on,items)=>'<div class="plan-col'+(on?' on':'')+'"><b>'+name+(on?' (you)':'')+'</b><ul>'+items.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></div>';
 el.innerHTML='<h2>Your plan: '+(pro?'The Whole Pie':'A Slice')+'</h2>'+
  (pro?'<p class="muted" style="margin:4px 0">250 emails a month. Renews on the 23rd.</p>'
      :'<p class="muted" style="margin:4px 0">Pizzas sent this month: '+n+' of 10</p><div class="usage" role="img" aria-label="'+n+' of 10 pizzas sent"><span style="width:'+Math.min(100,n*10)+'%"></span></div>')+
  '<div class="plan-cols">'+col('A Slice, free',!pro,['10 emails a month','Kraft and Classic boxes','Classic toppings and confetti','Special Delivery, $2.99 for Pro on one pizza'])+
  col('The Whole Pie, $9/mo or $90/yr',pro,['Your logo and brand colors','All box styles and Pro confetti','Gift codes and your own button','250 emails a month, 14-day free trial'])+
  col('Pizza Party, $29/mo or $290/yr',false,['Everything in The Whole Pie','3 seats, extra seats $8 each','1,000 emails a month, shared','14-day free trial'])+'</div>'+
  '<div class="btn-row">'+(pro?'<button class="btn small" id="planBilling" type="button">Manage billing</button>'
     :'<button class="btn small primary" id="planUp" type="button">Upgrade to The Whole Pie</button>')+'<button class="btn small" id="planTeam" type="button">Set up a team</button></div>';
 const on=(id,f)=>{const b=$('#'+id);if(b)b.onclick=f};
 on('planUp',()=>upgrade('general'));on('planBilling',()=>toast('In the real app this opens your billing in Brilliant Directories.'));
 on('planTeam',()=>toast('In the real app this starts a Team plan and lets you invite people.'))}
function refreshPlan(init){SOTR.host.classList.toggle('is-free',!isPro());$('#goPro').hidden=isPro();$('#adminCard').hidden=!isAdmin();
 const vis=init?null:Object.keys(views).find(k=>!views[k].hidden);if(vis==='admin'&&!isAdmin())show('settings');else if(vis)show(vis);
 makeChips($('#viewAsChips'),[['free','Free member'],['pro','Pro member'],['admin','Admin']],()=>viewAs,v=>{viewAs=v;store.set('viewAs',v);refreshPlan();toast({free:'Viewing as a Free member.',pro:'Viewing as a Pro member.',admin:'Viewing as the admin. Only you would see the Admin section.'}[v])})}
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,3400)}
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
function boxFromProfile(m){return{style:profile.boxStyle,sticker:profile.sticker,confetti:'classic',tone:'playful',note:profile.note,sign:profile.sign,
 to:m?m.who:'',contact:m?m.contact||'':'',meeting:m?m.title:'',linkLabel:profile.linkLabel,link:profile.link,method:'email',reward:Object.assign({text:'',code:'',link:'',exp:''},profile.reward||{})}}

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
 if(p._baking){const r=rng(Math.floor(now/180)+seed);c.fillStyle='rgba(255,252,235,.7)';for(let i=0;i<9;i++){const a=r()*6.283,d=Math.sqrt(r())*R*.7;c.beginPath();c.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,R*(.015+r()*.025),0,6.283);c.fill()}}
 for(const t of p.toppings)drawTop(c,t,cx,cy,R,u,b,now,p.vegan);
 if(p.sign&&p.sign.text)drawSign(c,p.sign.text,cx,cy,R,u,now,p._signAt,p.vegan,b);
 c.restore();
}
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

/* ---------- state for the kitchen ---------- */
let step=0,pizza=newPizza(),box=boxFromProfile(null),currentMeetingId=null,editingSignature=false;
let selTop='pepperoni',bakeDur=10,baking=false,bakeStart=0,wakeLock=null,saidStep=-1;
const GERALD_SVG='<svg viewBox="0 0 64 64" role="img" aria-label="Gerald the raccoon"><circle cx="32" cy="32" r="31" fill="#f1ad2d" stroke="#3a1d12" stroke-width="2"/>'+
 '<path d="M13 24 L16 8 L28 17 Z" fill="#7d7470" stroke="#3a1d12" stroke-width="2" stroke-linejoin="round"/><path d="M51 24 L48 8 L36 17 Z" fill="#7d7470" stroke="#3a1d12" stroke-width="2" stroke-linejoin="round"/>'+
 '<path d="M17 21 L18 13 L24 18 Z M47 21 L46 13 L40 18 Z" fill="#2b2523"/>'+
 '<ellipse cx="32" cy="35" rx="22" ry="18" fill="#9a918c" stroke="#3a1d12" stroke-width="2"/>'+
 '<path d="M15 27 Q23 22 29 27 M49 27 Q41 22 35 27" stroke="#f2ece6" stroke-width="2.6" fill="none" stroke-linecap="round"/>'+
 '<path d="M11 33 Q20 26 30 31 Q32 32 34 31 Q44 26 53 33 Q46 42 36 38 Q32 37 28 38 Q18 42 11 33 Z" fill="#2b2523"/>'+
 '<circle cx="23" cy="33" r="3.4" fill="#fff"/><circle cx="41" cy="33" r="3.4" fill="#fff"/><circle cx="23.8" cy="33.6" r="1.7" fill="#2b2523"/><circle cx="41.8" cy="33.6" r="1.7" fill="#2b2523"/>'+
 '<ellipse cx="32" cy="45" rx="10" ry="7" fill="#f2ece6"/><ellipse cx="32" cy="42" rx="3.4" ry="2.4" fill="#2b2523"/><path d="M28.5 47 Q32 49.5 35.5 47" stroke="#2b2523" stroke-width="1.5" fill="none" stroke-linecap="round"/>'+
 '<path d="M23 53 L31 56.5 L23 60 Z M41 53 L33 56.5 L41 60 Z" fill="#c4122f" stroke="#3a1d12" stroke-width="1.5" stroke-linejoin="round"/><circle cx="32" cy="56.5" r="2.4" fill="#c4122f" stroke="#3a1d12" stroke-width="1.5"/></svg>';
SOTR.querySelectorAll('.g-av').forEach(e=>e.innerHTML=GERALD_SVG);
const POTATO_SVG='<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAMAAAC8EZcfAAABgFBMVEX99OJlg0HjrXS2e0stFgnmsnn79ugQBgJifUBhez6bdFk1JREkCwNjgT7Cg0xdeTylfGG7gk5JJxTbpnDuuIZMSChQVytYZzNuRy3MmGjninFMNhrslXry6thONyg6NReQaUywhWXz7eP68d3vm4IbEgiIWTTAfkhuWElzZVTSh213VDeypZX2pIenmYrQx7ZxkUlnOyVFQh2LeWjj28mUhndCHA9lOhyXZDpee0CqaE20dD7Fuqrc1cj9xKaPWEXMkls3KiOkazxGLSJYS0Nhazm9tKj0wIh9cmiFTDZegD13bGK5kWmzrabMe2M7Nic8Qh49QyFbUUfMyMOQlGybk4mXjIDa0L5fgEFqQB6iXUsfIRBhLhliTUGATEGDb2KgjoDfsHnBsZ3/v6EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5q1XPAAAAgHRSTlMA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCZ7tQAABkiSURBVHja7Zx3Y9s4ssBXJiiSAlVIihQZSpTkIsuWE1vucZx1sunb+97d6+99/+/wZgYgCRY5tlJ2/1jcJVnbsvjTDDANA3zxxd/j73Gn0czHFo5m8y+HttUsDaDcbP4F4La2Rhnb6PSQxtPRaJR9b+tPldzmJv1zenhw1trzE87E4C8Sf+/k0fVTwfn5JalocnT9616YMGZnQ/y3AcPmyfzs9akQ9OfGI72eHuwlTEBxHo/Hx8c+jOPjOOYoTEn5H2eHKMnNzy28p4/mnNBiPwheWWajMExrEPjHwInCZMnJNWn78+GNDogO4AZWo3F0JKgsGKapoloDf0yQtn92+MkRM90eniRI5wdW4w7DCo45qpvNDz6ppjPpHe4xpBvchU6K0xoQo508Ak1vfVq86zngJXeik4ypHMeo6uS/R59E0dKeNf8A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" alt="Potato the dog">';
const POTATO_PEEK='<img src="data:image/png;base64,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" alt="">';
SOTR.querySelectorAll('.p-av').forEach(e=>e.innerHTML=POTATO_SVG);
let potatoTimer;function pSay(t,ms){const b=$('#potatoSay');$('#potatoText').textContent=t;b.hidden=false;clearTimeout(potatoTimer);if(ms)potatoTimer=setTimeout(()=>b.hidden=true,ms)}
function gSay(t){if(t)$('#geraldSay').textContent=t}
function sayOnce(key,t){pizza._said=pizza._said||{};if(pizza._said[key])return;pizza._said[key]=1;gSay(t)}
const G_STEP=['Toss that dough. Higher. I want to see some air.','Spread the sauce with your finger, then sprinkle the cheese. This is where the feelings go.','Pile it on. I will be honest in my review.',
 'Name it while it bakes. I judge names too.','Nice box. Very professional. I would steal it.','I will write my review before it ships. No pressure.'];
const cv=$('#pizza');

/* ---------- views ---------- */
let account=store.get('account',null);
const GATE_TEXT={today:'Home shows this week\'s meetings, the Pizza of the Month, and pizza prompts when meetings end.',people:'People keeps track of everyone you send pizzas to and whether they opened them.',bulk:'Send to a list lets you upload a CSV and send everyone a pizza.',settings:'Settings holds your logo, signature pizza, and calendar.'};
const views={admin:$('#view-admin'),gate:$('#view-gate'),today:$('#view-today'),make:$('#view-make'),people:$('#view-people'),gerald:$('#view-gerald'),bulk:$('#view-bulk'),news:$('#view-news'),settings:$('#view-settings')};
function show(v){const tv=v==='bulk'?'people':v==='admin'?'settings':v==='news'?'gerald':v;
 if(!account&&GATE_TEXT[v]){for(const k in views)views[k].hidden=k!=='gate';$('#gateWhat').textContent=GATE_TEXT[v];
  SOTR.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===tv?'true':'false'));window.scrollTo({top:0});return}
 for(const k in views)views[k].hidden=k!==v;
 SOTR.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===tv?'true':'false'));
 if(v==='today')renderToday();if(v==='settings')renderSettings();if(v==='gerald')renderGerald();if(v==='bulk')renderBulk();if(v==='people')renderPeople();if(v==='admin')renderAdmin();if(v==='news')renderFeed();if(v==='make'){renderStep();kick()}
 window.scrollTo({top:0})}
SOTR.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.view));

/* ---------- today ---------- */
function renderToday(){
 $('#meetGerald').hidden=!!store.get('metGerald',false);
 $('#todayDate').textContent='Week of '+new Date().toLocaleDateString('en-US',{month:'long',day:'numeric'});
 renderSpecial();try{drawPizza($('#homeNewCanvas'),clonePizza(signature),44)}catch(e){}
 const ul=$('#meetings');ul.innerHTML='';
 meetings.forEach(m=>{
  const li=document.createElement('li');li.className='meeting';
  const time=document.createElement('span');time.className='time';time.textContent=m.time;
  const info=document.createElement('div');info.className='info';
  const h=document.createElement('h3');h.textContent=m.title;
  const who=document.createElement('span');who.className='who';who.textContent=m.who+' · '+m.org+(m.vegan?' · 🌱 Vegan':'');
  const row=document.createElement('div');row.className='row';
  const pill=document.createElement('span');pill.className='pill';
  const addBtn=(label,fn,primary)=>{const b=document.createElement('button');b.className='btn small'+(primary?' primary':'');b.textContent=label;b.onclick=fn;row.appendChild(b)};
  if(m.status==='sent'){pill.classList.add('ok');pill.textContent=m.how==='signature'?'Sent · signature pizza':'Sent · fresh pizza';row.appendChild(pill);addBtn('See what they got',()=>openRecipient(m.pizza,m.box))}
  else if(m.status==='prompt'){pill.classList.add('wait');pill.textContent='Waiting on you';row.appendChild(pill);addBtn('Make one',()=>startFresh(m.id),true)}
  else if(m.status==='skipped'){pill.textContent=m.internal?'Skipped · internal':'Skipped';row.appendChild(pill)}
  else if(m.status==='ended'){pill.textContent='Ended';row.appendChild(pill);addBtn('Make one',()=>startFresh(m.id))}
  else{pill.textContent='Upcoming';row.appendChild(pill)}
  info.append(h,who,row);li.append(time,info);ul.appendChild(li)});
 const pm=meetings.find(m=>m.status==='prompt');const pc=$('#promptCard');
 if(pm){pc.hidden=false;$('#promptTitle').textContent='Your '+pm.title.toLowerCase()+' with '+pm.who+' wrapped up';pc.dataset.id=pm.id}else pc.hidden=true;
 const modeNames={ask:'Ask me each time',auto:'Send my signature pizza automatically',off:'Do nothing'};
 const ml=$('#modeLine');ml.textContent='After meetings: '+modeNames[settings.mode]+'. ';
 const cb=document.createElement('button');cb.className='linkish';cb.textContent='Change in Settings';cb.onclick=()=>show('settings');ml.appendChild(cb);
 const m4=meetings.find(m=>m.id==='m4')||{status:'none'};$('#simEnd').textContent=m4.status==='upcoming'?'Simulate the 3:30 meeting ending':'Reset the sample day';
}
$('#gateStart').onclick=()=>startFresh(null);
$('#gateSignin').onclick=()=>{account={name:profile.name||'You',email:''};store.set('account',account);toast('In the real app this emails you a sign-in link. You are signed in for the demo.');show('today')};
$('#resetGuest').onclick=()=>{account=null;store.set('account',null);startFresh(null);toast('You are a new visitor. Build a pizza, then sign up when you send it.')};
$('#geraldOk').onclick=()=>{store.set('metGerald',true);$('#meetGerald').hidden=true;toast('Gerald nods. Find him anytime in the Crew tab.')};
$('#openBulk').onclick=()=>{if(!isPro()){upgrade('bulk');return}show('bulk')};
$('#promptMake').onclick=()=>startFresh($('#promptCard').dataset.id);
$('#promptSig').onclick=()=>sendSignature($('#promptCard').dataset.id);
$('#promptSkip').onclick=()=>{const m=meetings.find(x=>x.id===$('#promptCard').dataset.id);m.status='ended';renderToday()};
$('#simEnd').onclick=()=>{
 const m=meetings.find(x=>x.id==='m4');
 if(m.status!=='upcoming'){meetings=sampleMeetings();meetings[0].pizza=clonePizza(signature);meetings[0].box=boxFromProfile(meetings[0]);renderToday();return}
 if(settings.mode==='auto'){sendSignature('m4',true)}
 else if(settings.mode==='ask'){m.status='prompt';renderToday();window.scrollTo({top:0,behavior:'smooth'})}
 else{m.status='ended';renderToday();toast('Meeting ended. Nothing sent, since after-meeting pizzas are off.')}
};
function sendSignature(id,auto){
 const m=meetings.find(x=>x.id===id);m.status='sent';m.how='signature';m.pizza=clonePizza(signature);m.box=boxFromProfile(m);
 m.pizza.vegan=!!signature.vegan;
 logSend({who:m.who,org:m.org,contact:m.contact,vegan:m.vegan},m.pizza,m.box,'Signature pizza after '+m.title.toLowerCase());
 renderToday();toast((auto?'Your demo call ended. Signature pizza sent to '+first(m.who)+' automatically':'Signature pizza sent to '+first(m.who))+(m.vegan&&!m.pizza.vegan?'. Heads up: '+first(m.who)+' is marked vegan and your signature pizza is not.':'.'))}
function startFresh(id){
 const m=meetings.find(x=>x.id===id)||null;currentMeetingId=m?m.id:null;editingSignature=false;
 pizza=newPizza();if(m&&m.vegan){pizza.vegan=true}box=boxFromProfile(m);step=0;saidStep=-1;show('make');
 if(m&&m.vegan)toast('Heads up: '+first(m.who)+' is marked vegan. You can turn on vegan on the Dough step.')}

/* ---------- kitchen ---------- */
function makeChips(el,items,get,set,lk){el.innerHTML='';items.forEach(([val,label,sw])=>{const b=document.createElement('button');b.className='chip';b.type='button';const isLk=lk&&lk.locked(val);
 if(sw){const d=document.createElement('span');d.className='dot';d.style.background=sw;b.appendChild(d)}
 b.appendChild(document.createTextNode(label));b.dataset.val=val;b.setAttribute('aria-pressed',get()===val?'true':'false');
 b.onclick=()=>{set(val);el.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true')};
 if(isLk){b.classList.add('locked');b.setAttribute('aria-pressed','false');const t=document.createElement('span');t.className='pro';t.textContent='Pro';b.appendChild(t);b.setAttribute('aria-label',label+', Pro feature');b.onclick=()=>lk.onLocked(val)}
 el.appendChild(b)})}
function renderSteps(){const ol=$('#steps');ol.innerHTML='';STEPS.forEach((s,i)=>{const li=document.createElement('li');li.className=i===step?'on':(i<step?'done':'');
 const n=document.createElement('span');n.textContent=i<step?'✓':String(i+1);li.append(n,document.createTextNode(s));ol.appendChild(li)})}
function renderStep(){
 renderSteps();renderKitchenExtras();
 if(step!==3&&!baking)$('#potatoSay').hidden=true;
 if(saidStep!==step){saidStep=step;gSay(editingSignature&&step===5?'Your signature pizza. I will remember this one.':G_STEP[step])}
 SOTR.querySelectorAll('.panel').forEach(p=>p.hidden=Number(p.dataset.step)!==step);
 $('#stage').hidden=step>3;
 const m=meetings.find(x=>x.id===currentMeetingId);
 $('#makeFor').textContent=editingSignature?'Editing your signature pizza':(m?'Thank-you pizza for '+m.who:(account?'A pizza for anyone':'Make a pizza. No sign-up needed.'));
 $('#back').style.visibility=step===0?'hidden':'visible';
 $('#next').hidden=step===5;
 $('#next').textContent=step===4?'Next: send it':'Next';
 const tl=tossesLeft(pizza);
 $('#next').disabled=(step===0&&tl>0)||(step===3&&!pizza.baked)||(step===1&&!hasSauce(pizza));
 if(step===0&&tl>0)$('#next').textContent='Toss it '+tl+' more time'+(tl===1?'':'s');
 if(step===1&&!hasSauce(pizza))$('#next').textContent='Spread some sauce first';
 if(step===3&&!pizza.baked)$('#next').textContent='Bake it first';
 if(step===0){renderVegan();renderToss();renderPremades()}
 if(step===1)renderSauce();
 if(step===2){renderTopChips();updateCount()}
 if(step===3)renderBake();
 if(step===4)renderBox();
 if(step===5)renderSend();
 kick()}
$('#next').onclick=()=>{if(step<5){step++;renderStep();window.scrollTo({top:0,behavior:'smooth'})}};
$('#back').onclick=()=>{if(step>0){if(baking)finishBake(true);step--;renderStep()}};

/* dough */
const TOSSES=3;
function tossesLeft(p){return p.tosses===undefined?0:Math.max(0,TOSSES-p.tosses)}
function renderToss(){const t=pizza.tosses===undefined?TOSSES:Math.min(pizza.tosses,TOSSES);$('#slap').textContent=t>=TOSSES?'Toss it again':'Toss it ('+t+' of '+TOSSES+')'}
function slap(){pizza.size=Math.min(.94,pizza.size+.12);pizza.seed+=.37;pizza._slap=performance.now();kick();
 if(pizza.tosses!==undefined){pizza.tosses++;if(pizza.tosses>=10)awardEgg('toss10');if(pizza.tosses===TOSSES){gSay('Now that is a stretched dough. Onward.')}else if(pizza.tosses<TOSSES)gSay(['Higher!','One more. Make it count.'][pizza.tosses-1]||'Again!')}
 if(step===0)renderStep();renderToss()}
$('#slap').onclick=slap;

/* sauce */
function sauceKeys(){return Object.keys(SAUCES).filter(k=>!SAUCES[k].special&&(!SAUCES[k].secret||treats.unlocked.includes('gravy')))}
function sauceName(k){return k==='white'&&pizza.vegan?'Cashew garlic white':SAUCES[k].n}
let scMode='sauce',sauceBrush='red',cheeseBrush='mozz';
function hasSauce(p){return p.sauceDabs?p.sauceDabs.length>=12:!!p.sauce}
function cheeseOpts(){return Object.entries(CHEESES).filter(([,v])=>!!v.vegan===!!pizza.vegan).map(([k,v])=>[k,v.n,v.c[0]])}
function updateCheeseUsed(){const used=[...new Set((pizza.cheeseDabs||[]).map(d=>d.k))].map(k=>CHEESES[k].n);
 $('#cheeseUsed').textContent=used.length?'On your pizza: '+used.join(', '):'No cheese yet. It is optional, but Gerald has feelings.'}
function renderSauce(){
 makeChips($('#scMode'),[['sauce','1. Spread sauce'],['cheese','2. Sprinkle cheese']],()=>scMode,v=>{scMode=v;renderSauce();
  gSay(v==='cheese'?'Cheese time. Mix and match. I will not judge. Much.':'Spread it around. Edge to edge is a choice, not a rule.')});
 $('#sauceTools').hidden=scMode!=='sauce';$('#cheeseTools').hidden=scMode!=='cheese';
 makeChips($('#sauceChips'),sauceKeys().map(k=>[k,sauceName(k),SAUCES[k].c]),()=>sauceBrush,v=>{sauceBrush=v});
 const opts=cheeseOpts();if(!opts.some(o=>o[0]===cheeseBrush))cheeseBrush=opts[0][0];
 makeChips($('#cheeseChips'),opts,()=>cheeseBrush,v=>{cheeseBrush=v;gSay(CHEESE_SAY[v])});updateCheeseUsed()}
function addSauceDab(nx,ny){if(Math.hypot(nx,ny)>1.05)return;pizza.sauceDabs=pizza.sauceDabs||[];
 pizza.sauceDabs.push({x:nx,y:ny,r:.13+Math.random()*.04,k:sauceBrush});pizza.sauce=sauceBrush;
 sayOnce('sauce1','Spread it around. Edge to edge is a choice, not a rule.');if(pizza.sauceDabs.length===12)renderStep();kick()}
function addCheeseDab(nx,ny,one){if(Math.hypot(nx,ny)>.95)return;pizza.cheeseDabs=pizza.cheeseDabs||[];
 for(let i=0;i<(one?1:3);i++)pizza.cheeseDabs.push({x:nx+(one?0:(Math.random()-.5)*.14),y:ny+(one?0:(Math.random()-.5)*.14),k:cheeseBrush,s:Math.random()*9,r:.6+Math.random()*.5});
 if(!pizza.cheese||pizza.cheese===true)pizza.cheese=cheeseBrush;
 const kinds=new Set(pizza.cheeseDabs.map(d=>d.k)).size;if(kinds>=3)sayOnce('cheese3','Three cheeses. You are a cheese person. I respect it.');else if(kinds===2)sayOnce('cheese2','A cheese blend. Very sophisticated.');
 updateCheeseUsed();kick()}
$('#autoSauce').onclick=()=>{for(let r=0;r<=.84;r+=.1){const n=Math.max(1,Math.round(r*28));for(let i=0;i<n;i++){const a=i/n*6.283+r*3;addSauceDab(Math.cos(a)*r,Math.sin(a)*r)}}renderStep()};
$('#clearSauce').onclick=()=>{pizza.sauceDabs=[];pizza.sauce=null;renderStep();kick()};
$('#autoCheese').onclick=()=>{for(let i=0;i<45;i++){const a=Math.random()*6.283,d=Math.sqrt(Math.random())*.78;addCheeseDab(Math.cos(a)*d,Math.sin(a)*d,true)}};
$('#clearCheese').onclick=()=>{pizza.cheeseDabs=[];pizza.cheese=null;updateCheeseUsed();kick()};
function renderVegan(){const vm=meetings.find(x=>x.id===currentMeetingId),vc=vm&&vm.vegan?vm.who:(box&&box.to&&findContact(box.to)&&findContact(box.to).vegan?box.to:'');
 $('#veganHint').hidden=!vc||pizza.vegan;if(vc)$('#veganHint').textContent='Heads up: '+first(vc)+' is marked vegan.';
 $('#veganChip').setAttribute('aria-pressed',pizza.vegan?'true':'false');$('#veganChip').textContent=pizza.vegan?'🌱 Vegan, from the dough up':'🌱 Make it vegan'}
$('#veganChip').onclick=()=>{pizza.vegan=!pizza.vegan;pizza.cheese=swapCheese(cheeseKey(pizza),pizza.vegan);(pizza.cheeseDabs||[]).forEach(d=>d.k=swapCheese(d.k,pizza.vegan));cheeseBrush=swapCheese(cheeseBrush,pizza.vegan);renderVegan();kick();
 gSay(pizza.vegan?'Vegan dough, vegan cheese. Gerald approves.':'Back to regular dough. Noted.')};

/* toppings */
function topName(k){return k==='pepperoni'&&pizza.vegan?'Plant pepperoni':TOPS[k].n}
function renderTopChips(){$('#veganNote').hidden=!pizza.vegan;['food','meeting','silly','pro'].forEach(g=>{
 const items=(g==='pro'?PRO_TOPS.map(k=>[k,TOPS[k]]):Object.entries(TOPS).filter(([,v])=>v.g===g)).map(([k,v])=>[k,(v.e?v.e+' ':'')+topName(k),v.sw]);
 makeChips($('#chips-'+g),items,()=>selTop,v=>{selTop=v;SOTR.querySelectorAll('[id^=chips-] .chip:not(.locked)').forEach(x=>x.setAttribute('aria-pressed',x.dataset.val===v?'true':'false'));
  renderMsg2()},g==='pro'?{locked:()=>!isPro(),onLocked:()=>upgrade('toppings')}:null)});
 renderMsg2()}
function updateCount(){const n=pizza.toppings.length;$('#topCount').textContent=n?n+' topping'+(n===1?'':'s'):''}

/* labels: split long messages across several pepperonis */
const PER_PEP=8;
function chunkLabel(s){const out=[];let cur='';
 for(const w of s.trim().split(/\s+/)){
  if(w.length>PER_PEP){if(cur){out.push(cur);cur=''}for(let i=0;i<w.length;i+=PER_PEP)out.push(w.slice(i,i+PER_PEP));continue}
  if(!cur)cur=w;else if((cur+' '+w).length<=PER_PEP)cur+=' '+w;else{out.push(cur);cur=w}}
 if(cur)out.push(cur);return out}
function addLabels(text){text=text.trim().slice(0,30);if(!text)return;const had=!!(pizza.sign&&pizza.sign.text);
 pizza.toppings=pizza.toppings.filter(t=>t.k!=='label');pizza.sign={text};pizza._signAt=performance.now();kick();
 gSay(had?'New message, same pizza. I respect a revision.':'One letter per pepperoni. Very readable. Very professional.');}

/* spelling: a tiny 3x5 letter grid, filled in with the chosen topping */
const FONT={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',
 H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',
 O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',
 V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','0':'111101101101111','1':'010110010010111',
 '2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010',
 '8':'111101111101111','9':'111101111001110','!':'010010010000010','?':'110001010000010','&':'010101010101011','.':'000000000000010','-':'000000111000000',' ':'000000000000000'};
function spell(text){
 text=text.toUpperCase().split('').filter(ch=>FONT[ch]).join('').trim();if(!text){toast('Type some letters or numbers to spell.');return}
 let lines=[text];
 if(text.length>6){const mid=text.length/2;let cut=-1,best=99;for(let i=0;i<text.length;i++)if(text[i]===' '&&Math.abs(i-mid)<best){best=Math.abs(i-mid);cut=i}
  lines=cut>0?[text.slice(0,cut).trim(),text.slice(cut+1).trim()]:[text.slice(0,Math.ceil(text.length/2)),text.slice(Math.ceil(text.length/2))]}
 const cols=Math.max(...lines.map(l=>l.length*4-1)),rows=lines.length*6-1;
 const cell=Math.min(1.3/cols,1.0/rows);
 const base=(TOPS[selTop].e?.3:.18)/pizza.size;const sc=Math.min(1,cell*1.05/base);
 const pts=[];
 lines.forEach((ln,li)=>{const lw=ln.length*4-1;ln.split('').forEach((ch,ci)=>{const g=FONT[ch];
  for(let i=0;i<15;i++)if(g[i]==='1'){const gx=ci*4+i%3+(cols-lw)/2,gy=li*6+Math.floor(i/3);
   pts.push([(gx-(cols-1)/2)*cell,(gy-(rows-1)/2)*cell])}})});
 const now=performance.now();
 pts.forEach(([x,y],i)=>pizza.toppings.push({k:selTop,x,y,rot:Math.random()*6.283,s:sc,born:now+i*22}));
 updateCount();kick();gSay('You spelled '+text+' in '+topName(selTop).toLowerCase()+'. I am moved.')}
function addTop(nx,ny,k,label){const d=Math.hypot(nx,ny),lim=label?.62:.78;if(d>lim){nx*=lim/d;ny*=lim/d}
 pizza.toppings.push({k:k||selTop,x:nx,y:ny,rot:Math.random()*6.283,born:performance.now(),label});updateCount();kick();
 const n=pizza.toppings.length,kk=k||selTop;
 if(kk==='duck'){sayOnce('duck','Is that a duck? I respect the confidence.');if(pizza.toppings.filter(t=>t.k==='duck').length>=25){pSay('WOOF WOOF WOOF! Potato has seen the ducks.',4000);awardEgg('ducks')}}
 else if(kk==='sock')sayOnce('sock','A sock. On a pizza. I have questions.');
 else if(kk==='eyes')sayOnce('eyes','The pizza is looking at me. I am looking back.');
 else if(kk==='pineapple')sayOnce('pine','Pineapple. I will not start this debate today.');
 if(n>=150)sayOnce('n150','Do you need to talk about something?');else if(n>=75)sayOnce('n75','I am impressed and a little concerned.');
 else if(n>=30)sayOnce('n30','Now this is a pizza.');else if(n>=10)sayOnce('n10','Ten toppings. Respectable.')}
function randSpot(lim){const a=Math.random()*6.283,d=Math.sqrt(Math.random())*lim;return[Math.cos(a)*d,Math.sin(a)*d]}
$('#handful').onclick=()=>{for(let i=0;i<8;i++){const[x,y]=randSpot(.75);setTimeout(()=>addTop(x,y),i*60)}};
$('#undo').onclick=()=>{pizza.toppings.pop();updateCount();kick()};
$('#clearTops').onclick=()=>{pizza.toppings=[];updateCount();kick()};
let msgStyle='pep';
function renderMsg2(){makeChips($('#msgStyle'),[['pep','One letter per pepperoni'],['shape','Letters made of toppings']],()=>msgStyle,v=>{msgStyle=v;renderMsg2()});
 $('#labelText').maxLength=msgStyle==='pep'?24:12;fillQuick($('#quickLabel'),box&&box.to,msgStyle==='pep'?24:12);
 $('#msgHelp').textContent=msgStyle==='pep'?'Each letter gets its own pepperoni, and words stay together on a line. Short messages look best.'+(pizza.vegan?' Your pizza is vegan, so these are plant-based pepperoni.':''):
  'Letters are built out of '+topName(selTop).toLowerCase()+', the topping picked above. Up to 12 characters.'}
function addMessage(v){v=v.trim();if(!v)return;if(/potato/i.test(v))setTimeout(()=>awardEgg('spell'),900);if(msgStyle==='pep')addLabels(v);else spell(v.slice(0,12))}
$('#addLabel').onclick=()=>{const v=$('#labelText').value.trim();if(!v){$('#labelText').focus();return}addMessage(v);$('#labelText').value=''};
$('#removeSign').onclick=()=>{pizza.sign=null;pizza.toppings=pizza.toppings.filter(t=>t.k!=='label');kick();gSay('Message removed. The pizza speaks for itself.')};
$('#labelText').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#addLabel').click()}});

let down=false,last=null;
function toNorm(e){const r=cv.getBoundingClientRect();const fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;return[(fx-.5)/(.48*pizza.size),(fy-.5)/(.48*pizza.size),e.clientX,e.clientY]}
cv.addEventListener('pointerdown',e=>{
 if(step===0){slap();return}
 if((step!==1&&step!==2)||baking)return;
 down=true;try{cv.setPointerCapture(e.pointerId)}catch(_){}const[nx,ny,px,py]=toNorm(e);paint(nx,ny);last=[px,py]});
function paint(nx,ny){if(step===1){if(scMode==='sauce')addSauceDab(nx,ny);else addCheeseDab(nx,ny)}else addTop(nx,ny)}
cv.addEventListener('pointermove',e=>{if(!down)return;const[nx,ny,px,py]=toNorm(e);const gap=step===1?(scMode==='sauce'?8:14):22;if(Math.hypot(px-last[0],py-last[1])>gap){paint(nx,ny);last=[px,py]}});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,()=>{down=false}));

/* bake */
function renderBake(){makeChips($('#bakeChips'),BAKES.map(([s,l])=>[s,l]),()=>bakeDur,v=>bakeDur=v);
 $('#pizzaName').value=pizza.name||'';$('#bakeDone').hidden=!pizza.baked||baking;
 $('#bakeStart').hidden=baking;$('#bakeEarly').hidden=!baking;$('#bakeStart').textContent=pizza.baked?'Bake again':'Start baking'}
$('#bakeStart').onclick=()=>{pSay('Potato is sitting by the oven, watching very closely.');baking=true;pizza._baking=true;pizza.bake=0;pizza.baked=false;bakeStart=performance.now();
 $('#stage').classList.add('hot');$('#timer').hidden=false;renderBake();renderStep();gSay('I will be watching through the oven window. Go stretch.');
 try{navigator.wakeLock&&navigator.wakeLock.request('screen').then(l=>wakeLock=l).catch(()=>{})}catch(e){}};
$('#bakeEarly').onclick=()=>finishBake(false);
function fmt(s){return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function bakeTick(now){const t=(now-bakeStart)/(bakeDur*1000);pizza.bake=Math.min(1,t);
 $('#timer').textContent=fmt(Math.max(0,Math.ceil(bakeDur-(now-bakeStart)/1000)));if(t>=1)finishBake(false,true)}
function finishBake(silent,full){baking=false;pizza._baking=false;pizza.baked=true;if(full)pizza.bake=1;pizza.bake=Math.max(pizza.bake,.15);
 $('#stage').classList.remove('hot');$('#timer').hidden=true;try{wakeLock&&wakeLock.release();wakeLock=null}catch(e){}
 if(!pizza.name)pizza.name=suggestName();if(step===3)renderStep();
 if(!silent)gSay(full?'That smell. That is the smell of success.':'A little early. I am choosing to be supportive.');if(!silent)pSay(full?'Woof! Woof! Potato says your pizza is ready.':'Potato heard the oven door. She is suspicious.',6000);if(!silent)toast(full?'Woof! Your pizza is ready.':'Out of the oven. A little early, but Gerald is open-minded.')}
$('#pizzaName').addEventListener('input',e=>pizza.name=e.target.value);
$('#suggestName').onclick=()=>{pizza.name=suggestName();$('#pizzaName').value=pizza.name};
function suggestName(){
 const lab=labelText(pizza);const has=k=>pizza.toppings.some(t=>t.k===k);
 const nouns=['Supreme','Special','Deluxe','Combo','Classic'];const pick=a=>a[Math.floor(Math.random()*a.length)];
 if(lab&&lab.length<=24)return'The '+lab+' '+pick(nouns);
 if(pizza.vegan&&Math.random()<.5)return'The Garden Party '+pick(nouns);
 if(has('handshake'))return'The Partnership '+pick(nouns);
 if(has('idea'))return'The Big Idea '+pick(nouns);
 if(has('rocket'))return'The Launch Day '+pick(nouns);
 if(has('duck'))return'The Quack Attack';
 if(pizza.toppings.length>60)return'The Topping Avalanche';
 if(pizza.sauce==='purple')return'The Mystery Purple';
 return pick(['The Follow-Up','The Midweek Pick-Me-Up','The Great Meeting','The Nice to Meet You'])+' '+pick(nouns)}

/* box */
function renderLid(el,logoEl,bizEl,stEl,b,vg){el.dataset.style=b.style;let lsp=el.querySelector('.lid-sponsor');if(b.sponsor){if(!lsp){lsp=document.createElement('div');lsp.className='lid-sponsor';el.appendChild(lsp)}lsp.textContent='Presented by '+b.sponsor.name;lsp.hidden=false}else if(lsp)lsp.hidden=true;logoEl.innerHTML='';el.querySelector('.lid-vegan').hidden=!vg;
 if(profile.logo&&isPro()){const i=document.createElement('img');i.src=profile.logo;i.alt=profile.business+' logo';logoEl.appendChild(i)}
 bizEl.textContent=profile.business;stEl.textContent=b.sticker}
function renderBoxPreview(){renderLid($('#lidPreview'),$('#lidLogo'),$('#lidBiz'),$('#lidSticker'),box,pizza.vegan);$('#notePreview').textContent=box.note;$('#signPreview').textContent=box.sign}
function renderThumbs(){['#logoThumb','#logoThumb2','#logoThumb3'].forEach(s=>{const t=$(s);t.innerHTML='';if(profile.logo){const i=document.createElement('img');i.src=profile.logo;i.alt='';t.appendChild(i)}else t.textContent='None'})}
function renderBox(){
 if(!isPro()&&PRO_STYLES.includes(box.style))box.style='kraft';if(!isPro()&&PRO_CONF.includes(box.confetti))box.confetti='classic';
 makeChips($('#styleChips'),Object.entries(STYLES),()=>box.style,v=>{box.style=v;profile.boxStyle=v;saveProfile();renderBoxPreview()},{locked:v=>!isPro()&&PRO_STYLES.includes(v),onLocked:()=>upgrade('style')});
 fillOccasions($('#stickerSel'),box.sticker);
 box.confetti=okConf(box.confetti);makeChips($('#confettiChips'),seasonConfetti(),()=>box.confetti,v=>{box.confetti=v;burst(v)},{locked:v=>!isPro()&&PRO_CONF.includes(v),onLocked:v=>{burst(v);upgrade('confetti')}});
 makeChips($('#toneChips'),[['playful','Playful'],['polished','Polished']],()=>box.tone,v=>box.tone=v);
 $('#bizName').value=profile.business;$('#noteText').value=box.note;$('#signText').value=box.sign;$('#linkLabel').value=box.linkLabel;$('#linkUrl').value=box.link;const rw=box.reward||{};$('#rwText').value=rw.text||'';$('#rwCode').value=rw.code||'';$('#rwLink').value=rw.link||'';$('#rwExp').value=rw.exp||'';
 renderThumbs();renderBoxPreview()}
$('#bizName').addEventListener('input',e=>{profile.business=e.target.value;saveProfile();renderBoxPreview()});
$('#noteText').addEventListener('input',e=>{box.note=e.target.value;renderBoxPreview()});
$('#signText').addEventListener('input',e=>{box.sign=e.target.value;renderBoxPreview()});
$('#linkLabel').addEventListener('input',e=>box.linkLabel=e.target.value);
$('#linkUrl').addEventListener('input',e=>box.link=e.target.value);
[['#rwText','text'],['#rwCode','code'],['#rwLink','link'],['#rwExp','exp']].forEach(([x,k])=>{$(x).addEventListener('input',e=>{if(!box.reward)box.reward={text:'',code:'',link:'',exp:''};box.reward[k]=e.target.value;profile.reward=Object.assign({},box.reward);saveProfile()})});
['#linkLabel','#linkUrl','#rwText','#rwCode','#rwLink','#rwExp'].forEach(x=>$(x).addEventListener('focus',e=>{if(!isPro()){e.target.blur();upgrade(x.startsWith('#rw')?'reward':'button')}}));
function handleLogo(file){if(!file)return;const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{
 const max=360,s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
 c.getContext('2d').drawImage(img,0,0,c.width,c.height);profile.logo=c.toDataURL('image/png');saveProfile();renderThumbs();renderBoxPreview();renderBulkBox();toast('Logo added to your box.')};
 img.onerror=()=>toast('That file could not be read as an image. Try a PNG or JPG.');img.src=fr.result};fr.readAsDataURL(file)}
$('#logoFile').addEventListener('change',e=>handleLogo(e.target.files[0]));
$('#logoFile2').addEventListener('change',e=>handleLogo(e.target.files[0]));
$('#logoRemove').onclick=()=>{profile.logo=null;saveProfile();renderThumbs();renderBoxPreview()};

/* send */
function msgText(){const f=first(box.to),link='sliceofthanks.app/p/'+slug(f+'-'+(pizza.name||'pizza'));const mt=(box.meeting||'meeting').toLowerCase();
 if(box.method==='text')return{subj:'',body:'Hi '+f+'! Thanks for the '+mt+' today. I sent you a little thank-you pizza: '+link};
 return{subj:'A thank-you pizza from '+profile.name,body:'Hi '+f+',\n\nThanks for the '+mt+' today. I made you a little thank-you pizza. Open the box here:\n'+link+'\n\n'+profile.name+'\n'+profile.business}}
function renderMsg(){const m=msgText();$('#msgLabel').textContent=box.method==='text'?'Your text':'Your email';$('#msgSubj').textContent=m.subj;$('#msgSubj').hidden=!m.subj;$('#msgBody').textContent=m.body}
function renderSend(){
 $('#sendHeading').textContent=editingSignature?'Save your signature pizza':'Send it';
 $('#guestBox').hidden=!!account||editingSignature;$('#gName').value=$('#gName').value||'';$('#sendNow').textContent=account?'Send pizza':'Send pizza and create my free account';$('#sendNow').className=account?'btn':'btn primary';$('#previewR').className=account?'btn primary':'btn';
 $('#sendFields').hidden=editingSignature;$('#sendNow').hidden=editingSignature;$('#copyMsg').hidden=editingSignature;
 $('#saveSig').className=editingSignature?'btn primary':'btn ghost';if(editingSignature)$('#previewR').className='btn';$('#saveSig').hidden=!account&&!editingSignature;
 $('#toName').value=box.to;$('#toContact').value=box.contact;$('#mtgTitle').value=box.meeting;
 makeChips($('#methodChips'),[['email','Email'],['text','Text message']],()=>box.method,v=>{box.method=v;renderMsg()});renderMsg()}
$('#toName').addEventListener('input',e=>{box.to=e.target.value;renderMsg()});
$('#toContact').addEventListener('input',e=>{box.contact=e.target.value;if(/^[\d\s()+-]{7,}$/.test(e.target.value)&&box.method!=='text'){box.method='text';renderSend()}});
$('#mtgTitle').addEventListener('input',e=>{box.meeting=e.target.value;renderMsg()});
$('#copyMsg').onclick=()=>{const m=msgText();const txt=(m.subj?m.subj+'\n\n':'')+m.body;
 const fallback=()=>{const r=document.createRange();r.selectNodeContents($('#msgBody'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Message selected. Copy it from your keyboard.')};
 try{navigator.clipboard.writeText(txt).then(()=>toast('Message copied.'),fallback)}catch(e){fallback()}};
$('#previewR').onclick=()=>openRecipient(pizza,box);
$('#sendNow').onclick=()=>{
 if(!box.to.trim()){$('#toName').focus();toast('Add who the pizza is for.');return}
 let isNew=false;
 if(!account){const gn=$('#gName').value.trim(),ge=$('#gEmail').value.trim();
  if(!gn){$('#gName').focus();toast('Add your name so they know who it is from.');return}
  if(!/.+@.+\..+/.test(ge)){$('#gEmail').focus();toast('Add your email so we can set up your free account.');return}
  account={name:gn,email:ge};store.set('account',account);profile.name=gn;if(!profile.sign||/Stacey/.test(profile.sign))profile.sign='Warmly, '+first(gn);saveProfile();isNew=true}
 let m=meetings.find(x=>x.id===currentMeetingId);
 if(m){m.status='sent';m.how='fresh';m.pizza=clonePizza(pizza);m.box=JSON.parse(JSON.stringify(box))}
 logSend({who:box.to,org:m?m.org:'',contact:box.contact,vegan:pizza.vegan},pizza,box,box.meeting?'After '+box.meeting.toLowerCase():'Fresh pizza');
 toast('Marked as sent to '+first(box.to)+'. In the real app it goes out by '+(box.method==='text'?'text':'email')+'.');
 currentMeetingId=null;if(isNew){show('today');setTimeout(()=>toast('Pizza sent to '+first(box.to)+'. Your free account is ready. We emailed '+account.email+' a sign-in link.'),50)}else show('today')};
$('#saveSig').onclick=()=>{signature=clonePizza(pizza);signature.baked=true;signature.bake=Math.max(signature.bake,.6);if(!signature.name)signature.name=suggestName();
 store.set('signature',signature);profile.note=box.note;profile.sign=box.sign;profile.sticker=box.sticker;profile.linkLabel=box.linkLabel;profile.link=box.link;saveProfile();
 toast('Saved as your signature pizza.');if(editingSignature){editingSignature=false;show('settings')}};

/* ---------- recipient preview ---------- */
function review(p,b){
 const n=p.toppings.length,has=k=>p.toppings.some(t=>t.k===k),lab=labelText(p);
 const lines=[];
 if(b.tone==='polished'){
  lines.push(lab?'A thoughtful touch with the "'+lab+'" spelled in pepperoni. Clearly a productive meeting.':'Balanced, well dressed, and delivered on time.');
  if(p.vegan)lines.push('Fully plant-based and thoughtfully made.');
  lines.push(p.bake<.6?'Lightly baked. Fresh, like a new partnership.':'The crust shows real follow-through.');
  return{text:lines.join(' '),stars:5}}
 if(n>60)lines.push('I counted '+n+' toppings and lost track twice. Respect.');
 else if(n<4)lines.push('Minimalist. Confident. I see what you did here.');
 if(has('duck'))lines.push('There is a duck on this pizza. I have questions and no complaints.');
 if(has('sock'))lines.push('Is that a sock? Bold.');
 if(lab)lines.push('Spelling "'+lab+'" in pepperoni? This meeting went well.');
 if(p.vegan)lines.push('Plant-based and still bold. I approve.');
 const ck=cheeseKey(p);if(ck==='goat')lines.push('Goat cheese. Someone has taste.');else if(ck==='parm')lines.push('The parmesan flakes are very refined.');else if(!ck)lines.push('No cheese. Brave.');
 if(has('handshake'))lines.push('Strong handshake energy.');
 if(p.sauce==='purple')lines.push('The purple sauce is a mystery I am choosing to trust.');
 if(p.bake<.6)lines.push('A little doughy. Brave choice.');
 if(!lines.length)lines.push('Solid crust, honest sauce, a pizza made by someone who cares.');
 return{text:lines.slice(0,3).join(' '),stars:p.bake<.6?4:5}}
function openRecipient(p,b){
 rCurrentBox=b;const ov=$('#recipient');ov.hidden=false;document.body.style.overflow='hidden';
 $('#rs1').hidden=false;$('#rs2').hidden=true;$('#rbox').classList.remove('open');$('#rOpen').textContent='Open the box';
 const sc=$('.scooter');sc.style.animation='none';void sc.offsetWidth;sc.style.animation='';
 $('#rFrom').textContent=profile.name+(profile.business?' from '+profile.business:'')+' sent you a pizza';
 renderLid($('#rLid'),$('#rLogo'),$('#rBiz'),$('#rSticker'),b,p.vegan);const sl=$('#rScootLogo');sl.innerHTML='';if(profile.logo&&isPro()){const li=document.createElement('img');li.src=profile.logo;li.alt=(profile.business||'Sender')+' logo';sl.appendChild(li)}else sl.textContent=profile.business||'🍕';$('#rVegan').hidden=!p.vegan;renderSponsorBlock(b);$('#rNote').textContent=(b.to?'Hi '+first(b.to)+', ':'')+b.note;$('#rSign').textContent=b.sign;
 const bitten=Math.random()<.35;startEating(p,bitten);
 $('#rPotato').textContent=bitten?'Delivered by Potato, Head of Delivery. She took one tiny bite on the way. Gerald has spoken to her.':'Delivered by Potato, Head of Delivery. She attempted to eat one slice in transit. She was stopped. Mostly.';$('#rPizza').alt=p.name||'A pizza';$('#rName').textContent=p.name||'A Mystery Pizza';
 const r=review(p,b);$('#rReview').textContent=r.text;$('#rRating').textContent='Rating: '+'🍕'.repeat(r.stars)+' '+r.stars+' of 5 slices';
 $('#rMeta').textContent=(b.meeting?'Meeting: '+b.meeting+'\n':'')+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});$('#rMeta').style.whiteSpace='pre-line';
 const a=$('#rLink');a.textContent=b.linkLabel||'Say hi back';let url=(b.link||'').trim();if(url&&!/^https?:\/\//i.test(url))url='https://'+url;a.href=url||'#';a.hidden=!url||!isPro();$('#rMadeWith').hidden=isPro();
 $('#rOpen').focus()}
$('#rOpen').onclick=()=>{const bx=$('#rbox');if(!bx.classList.contains('open')){bx.classList.add('open');$('#rOpen').textContent='See the pizza';setTimeout(()=>burst(rCurrentBox&&rCurrentBox.confetti||'classic'),450)}else{$('#rs1').hidden=true;$('#rs2').hidden=false;$('#recipient').scrollTo({top:0})}};
function sendBack(){const who=first(profile.name||'them');closeOv();startFresh(null);toast('Make a pizza back for '+who+'. In the real app it goes straight to them.')}
$('#rBack').onclick=sendBack;$('#rBack2').onclick=sendBack;
$('#rGiftCopy').onclick=()=>{const c=$('#rGiftCode').textContent;try{navigator.clipboard.writeText(c).then(()=>toast('Copied '+c+'.'),()=>toast('Your code is '+c+'.'))}catch(e){toast('Your code is '+c+'.')}};
let rEat=null;const EAT_LINES=['Mmm.','Gerald is watching. He approves.','Halfway there.','Potato is drooling.','One more slice.'];
function biteAt(x,y){const c=rEat.c,R=rEat.R;c.save();c.globalCompositeOperation='destination-out';
 const B=[[0,0,.15],[.11,.07,.11],[-.09,.1,.1],[.04,-.11,.09]];B.forEach(([dx,dy,rr])=>{c.beginPath();c.arc(x+dx*R,y+dy*R,rr*R,0,6.283);c.fill()});
 c.globalCompositeOperation='source-atop';c.strokeStyle='rgba(150,95,40,.85)';c.lineWidth=R*.05;B.forEach(([dx,dy,rr])=>{c.beginPath();c.arc(x+dx*R,y+dy*R,rr*R+R*.02,0,6.283);c.stroke()});c.restore();
 try{$('#rPizza').src=rEat.cv.toDataURL('image/png')}catch(e){}}
const SL=6,SL0=-Math.PI/2;
function sliceOf(x,y){let a=Math.atan2(y-170,x-170)-SL0;a=(a%6.2832+6.2832)%6.2832;return Math.floor(a/(6.2832/SL))%SL}
function eatSlice(i){const c=rEat.c,R=rEat.R,w=6.2832/SL;c.save();c.globalCompositeOperation='destination-out';c.beginPath();c.moveTo(170,170);c.arc(170,170,R*1.12,SL0+i*w-.01,SL0+(i+1)*w+.01);c.closePath();c.fill();c.restore();
 rEat.left[i]=false;try{$('#rPizza').src=rEat.cv.toDataURL('image/png')}catch(e){}}
function sliceDots(){const n=rEat.left.filter(v=>!v).length;$('#rSlices').textContent='Slices eaten: '+'●'.repeat(n)+'○'.repeat(SL-n)+' '+n+' of 6';return n}
function startEating(p,bitten){const cv=document.createElement('canvas');const pc=clonePizza(p);drawPizza(cv,pc,340);
 rEat={cv,c:cv.getContext('2d'),R:340*.48*(pc.size||.9),left:Array(SL).fill(true),done:false};
 const c=rEat.c;c.save();c.globalCompositeOperation='source-atop';c.strokeStyle='rgba(58,29,18,.38)';c.lineWidth=2.5;
 for(let i=0;i<SL;i++){const a=SL0+i*6.2832/SL;c.beginPath();c.moveTo(170,170);c.lineTo(170+Math.cos(a)*rEat.R*1.1,170+Math.sin(a)*rEat.R*1.1);c.stroke()}c.restore();
 if(bitten){const a=-.75;biteAt(170+Math.cos(a)*rEat.R,170+Math.sin(a)*rEat.R)}else{try{$('#rPizza').src=cv.toDataURL('image/png')}catch(e){}}
 const ln=$('#rLink');$('#rEatHint').after(ln);
 const rw=rCurrentBox&&rCurrentBox.reward;rEat.gift=isPro()&&rw&&rw.code?rw:null;sliceDots();
 $('#rEatBtn').hidden=false;$('#rEatHint').hidden=false;$('#rEatHint').textContent='Tap a slice to eat it.';$('#rEaten').hidden=true;$('#rBack').hidden=false;
 $('#rGiftTease').hidden=!rEat.gift;$('#rGiftTease').textContent='🎁 '+first(profile.name||'They')+' hid something under this pizza. Eat all 6 slices to find out.';$('#rGift').hidden=true}
$('#rEatBtn').onclick=e=>{if(!rEat||rEat.done)return;const img=$('#rPizza'),rc=img.getBoundingClientRect();let i;
 if(e.detail&&rc.width){i=sliceOf((e.clientX-rc.left)/rc.width*340,(e.clientY-rc.top)/rc.height*340)}else i=0;
 if(!rEat.left[i]){let best=-1,bd=9;for(let k=0;k<SL;k++)if(rEat.left[k]){const d=Math.min((k-i+SL)%SL,(i-k+SL)%SL);if(d<bd){bd=d;best=k}}i=best}
 if(i<0)return;eatSlice(i);const n=sliceDots();try{navigator.vibrate&&navigator.vibrate(12)}catch(er){}
 const btn=$('#rEatBtn');btn.classList.remove('chomp');void btn.offsetWidth;btn.classList.add('chomp');
 if(n>=SL){rEat.done=true;setTimeout(()=>{btn.hidden=true;$('#rEatHint').hidden=true;$('#rBack').hidden=true;
   $('#rEatenLine').textContent='You ate all 6 slices. Gerald is impressed. Potato is a little jealous. Send '+first(profile.name||'them')+' one back.';
   $('#rGiftTease').hidden=true;const g=rEat.gift;$('#rGift').hidden=!g;
   if(g){$('#rGiftWhat').textContent=g.text||'A gift from '+first(profile.name||'them');$('#rGiftCode').textContent=g.code;
    $('#rGiftExp').textContent=g.exp?'Use it by '+new Date(g.exp+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
    let u=(g.link||'').trim();if(u&&!/^https?:/i.test(u))u='https://'+u;const ub=$('#rGiftUse');ub.href=u||'#';ub.hidden=!u}
   const ln=$('#rLink');(g?$('#rGift'):$('#rEaten h3')).after(ln);
   $('#rEaten').hidden=false;burst(g?'gold':'crumbs');(g?$('#rGiftCopy'):$('#rBack2')).focus()},260)}
 else $('#rEatHint').textContent=EAT_LINES[Math.min(n-1,EAT_LINES.length-1)]+' '+(SL-n)+' to go.'};
function closeOv(){$('#recipient').hidden=true;document.body.style.overflow=''}
$('#ovClose').onclick=closeOv;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#recipient').hidden)closeOv()});

/* ---------- settings ---------- */
function saveProfile(){store.set('profile',profile)}
function renderSettings(){
 $('#mode-'+settings.mode).checked=true;$('#extOnly').checked=settings.extOnly;
 drawPizza($('#sigCanvas'),signature,96);$('#sigName').textContent=signature.name||'Your signature pizza';
 $('#pName').value=profile.name;$('#pBiz').value=profile.business;$('#pNote').value=profile.note;$('#pLinkLabel').value=profile.linkLabel;$('#pLink').value=profile.link;renderThumbs();
 $('#brand1').value=profile.brand1||'#1f4e79';$('#brand2').value=profile.brand2||'#f1ad2d';['#pLinkLabel','#pLink'].forEach(x=>$(x).readOnly=!isPro());renderPlanCard()}
SOTR.querySelectorAll('input[name=mode]').forEach(r=>r.addEventListener('change',e=>{if(e.target.value==='auto'&&!isPro()){$('#mode-'+settings.mode).checked=true;upgrade('auto');return}settings.mode=e.target.value;store.set('settings',settings);
 toast({ask:'You will get a prompt after each meeting.',auto:'Your signature pizza will go out automatically.',off:'After-meeting pizzas are off.'}[settings.mode])}));
$('#extOnly').addEventListener('change',e=>{settings.extOnly=e.target.checked;store.set('settings',settings)});
[['#pName','name'],['#pBiz','business'],['#pNote','note'],['#pLinkLabel','linkLabel'],['#pLink','link']].forEach(([s,k])=>$(s).addEventListener('input',e=>{profile[k]=e.target.value;saveProfile()}));
$('#editSig').onclick=()=>{editingSignature=true;currentMeetingId=null;pizza=clonePizza(signature);box=boxFromProfile(null);step=2;saidStep=-1;show('make')};

/* ---------- Gerald tab: hire, tips ---------- */
const VIBES=[['classic','Classic'],['fancy','Fancy'],['fun','Fun'],['over','Over the top']];
let hireVibe='classic',tipIdx=0;
const TIPS=['Send it within an hour of the meeting. It lands while they still remember the conversation.',
 'Spell the main topic in pepperoni. It shows you were listening.',
 'Use the next-step button for one clear ask, like booking a follow-up.',
 'Keep the note to two or three sentences. It is a pizza box, not a contract.',
 'Spell their company name in olives for a client who is hard to impress.',
 'Save a signature pizza so you can send one in seconds on busy days.',
 'Check if they are vegan before you bake. I notice these things.',
 'Holidays are crowded. Send your client thank-yous the second week of December so they stand out.'];
/* What's new: in the real app these come from an admin screen (title, date, text, and an optional demo) */
const ANNOUNCEMENTS=[
 {id:'gift',date:'Oct 23',title:'New for Pro: a gift under the pizza',text:'Hide a discount or coupon code under the pizza. They eat it to reveal the code. Perfect for nudging free trials to upgrade.',demo:{type:'giftUnbox'},label:'Try it'},
 {id:'treats',date:'Oct 23',title:"Potato's Treat Jar",text:'Potato hid easter eggs all over the app. Find them to earn Treats and unlock the Secret Menu, including Potato confetti.',demo:{type:'confetti',value:'potato'},label:'Peek at Potato confetti'},
 {id:'special',date:'Oct 23',title:'Pizza of the Month',text:'Every month Gerald designs a special pizza with its own box, sticker, and confetti. This month: The Haunted Harvest. Find it on Home.',demo:{type:'specialPreview'},label:'See it'},
 {id:'potato',date:'Oct 23',title:'Meet Potato, Head of Delivery',text:'Potato now delivers every pizza on her scooter and barks when your pizza is ready. Gerald has asked her to stop eating the merchandise.',demo:{type:'unbox'},label:'See Potato deliver'},
 {id:'gold',date:'Oct 23',title:'New confetti: Gold sparkles',text:'A little extra shine for big moments, like a signed deal or a retirement.',demo:{type:'confetti',value:'gold'},label:'Try it'},
 {id:'spell',date:'Oct 23',title:'Spell it with toppings',text:'Type a word and watch your toppings drop into letters.',demo:{type:'spell',value:'HELLO'},label:'Try it'},
 {id:'cheese',date:'Oct 23',title:'Mix your cheeses',text:'Spread the sauce yourself, then sprinkle mozzarella, cheddar, parmesan, goat cheese, or two vegan cheeses wherever you want.',demo:{type:'cheese'},label:'Try it'},
 {id:'vegan',date:'Oct 22',title:'Vegan from the dough up',text:'Turn on vegan before you toss the dough and the whole pizza follows, including plant-based pepperoni.',demo:{type:'vegan'},label:'Try it'},
 {id:'holiday',date:'Coming soon',title:'Holiday boxes',text:'Seasonal box designs for year-end client thank-yous.',demo:null}];
function demoPizza(){const p=newPizza();p.size=.92;p.tosses=TOSSES;return p}
function runDemo(d){
 if(!d)return;
 if(d.type==='confetti'){burst(d.value);return}
 if(d.type==='specialPreview'){$('#spPreview').click();return}
 if(d.type==='sponsorPreview'){previewSponsor();return}
 if(d.type==='giftUnbox'){const b=boxFromProfile({who:'Jordan Reyes',contact:'',title:'Started a free trial'});b.sticker='Welcome Aboard';b.confetti='gold';b.note='Thanks for starting your free trial. Eat this pizza for a little something to help you decide.';b.reward={text:'20% off your first 3 months',code:'SLICE20',link:'',exp:''};const keep=viewAs;if(viewAs==='free')viewAs='pro';openRecipient(clonePizza(signature),b);viewAs=keep;return}
 if(d.type==='unbox'){const b=boxFromProfile({who:'Priya Shah',contact:'',title:'Intro call'});b.confetti='classic';openRecipient(clonePizza(signature),b);return}
 currentMeetingId=null;editingSignature=false;box=boxFromProfile(null);saidStep=-1;pizza=demoPizza();
 if(d.type==='vegan'){pizza.size=.58;pizza.tosses=0;pizza.vegan=true;step=0;show('make');gSay('Vegan is on. Now toss that dough.');return}
 sauceBrush='red';for(let r=0;r<=.84;r+=.1){const n=Math.max(1,Math.round(r*28));for(let i=0;i<n;i++){const a=i/n*6.283+r*3;pizza.sauceDabs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,r:.15,k:'red'})}}pizza.sauce='red';
 if(d.type==='cheese'){scMode='cheese';step=1;show('make');['mozz','cheddar','parm'].forEach((k,j)=>{setTimeout(()=>{cheeseBrush=k;for(let i=0;i<15;i++){const a=Math.random()*6.283,dd=Math.sqrt(Math.random())*.78;addCheeseDab(Math.cos(a)*dd,Math.sin(a)*dd,true)}renderSauce()},300+j*450)});return}
 if(d.type==='spell'){pizza.cheeseDabs=[];for(let i=0;i<40;i++){const a=Math.random()*6.283,dd=Math.sqrt(Math.random())*.78;pizza.cheeseDabs.push({x:Math.cos(a)*dd,y:Math.sin(a)*dd,k:'mozz',s:Math.random()*9,r:.8})}pizza.cheese='mozz';
  step=2;selTop='olive';msgStyle='shape';show('make');setTimeout(()=>{spell(d.value)},350);return}}
const FEED_SHOWN=5;
function renderFeed(){const all=allNews();fillFeed($('#feed'),all.slice(0,FEED_SHOWN));fillFeed($('#feedAll'),all);$('#feedMore').hidden=all.length<=FEED_SHOWN}
function fillFeed(ul,items){let seen=store.get('seenNews',[]);ul.innerHTML='';
 items.forEach(a=>{const li=document.createElement('li');
  li.innerHTML='<div class="row-h"><span class="feed-date">'+esc(a.date)+'</span>'+(!seen.includes(a.id)&&a.demo?'<span class="new">New</span>':'')+'</div><b>'+esc(a.title)+'</b><span>'+esc(a.text)+'</span>';
  if(a.demo){const b=document.createElement('button');b.className='btn small';b.type='button';b.textContent=a.label||'Try it';b.onclick=()=>{runDemo(a.demo);seen=store.get('seenNews',[]);if(!seen.includes(a.id)){seen.push(a.id);store.set('seenNews',seen)}};li.appendChild(b)}
  ul.appendChild(li)})}
function renderTip(){$('#tipText').textContent=TIPS[tipIdx];$('#tipCount').textContent='Tip '+(tipIdx+1)+' of '+TIPS.length}
$('#nextTip').onclick=()=>{tipIdx=(tipIdx+1)%TIPS.length;renderTip()};
function renderGerald(){renderTip();renderFeed();renderTreats()}
function renderHire(){
 const sel=$('#hireFor');const prev=sel.value;sel.innerHTML='';
 meetings.filter(m=>!m.internal).forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.who+' · '+m.title;sel.appendChild(o)});
 const o=document.createElement('option');o.value='';o.textContent='Someone else';sel.appendChild(o);
 const pm=meetings.find(m=>m.status==='prompt');sel.value=prev||(pm?pm.id:sel.options[0].value);syncHireVegan();
 makeChips($('#hireVibe'),VIBES,()=>hireVibe,v=>hireVibe=v)}
/* Kitchen shortcuts show while starting a pizza (the dough step) and open one card at a time */
function renderKitchenExtras(){const kx=$('#kitchenExtras');kx.hidden=step!==0||editingSignature;if(kx.hidden)return;renderHire()}
function toggleHire(open){const w=$('#kxHireWrap');if(open===undefined)open=w.hidden;w.hidden=!open;$('#kxHireBtn').setAttribute('aria-expanded',open?'true':'false')}
$('#kxHireBtn').onclick=()=>toggleHire();
$('#homeNew').onclick=()=>{toggleHire(false);startFresh(null)};
$('#homeHire').onclick=()=>{startFresh(null);toggleHire(true);setTimeout(()=>{const c=$('#kxHireWrap');if(c.scrollIntoView)c.scrollIntoView({behavior:'smooth',block:'start'})},50)};
function syncHireVegan(){const m=meetings.find(x=>x.id===$('#hireFor').value);$('#hireVegan').checked=false;$('#hireVeganNote').textContent=m&&m.vegan?' ('+first(m.who)+' is marked vegan)':''}
$('#hireFor').addEventListener('change',syncHireVegan);
function placeLabels(p,text){text=(text||'').trim().slice(0,30);if(!text)return 0;p.toppings=p.toppings.filter(t=>t.k!=='label');p.sign={text};return 1;const parts=[];
 const perRow=parts.length<=4?Math.min(parts.length,2):3,rows=Math.ceil(parts.length/perRow);
 let sp=.36/p.size;const span=Math.max(perRow,rows)*sp;let sc=1;if(span>1.45){sc=1.45/span;sp*=sc}
 const g=Math.random();parts.forEach((t,i)=>{const r=Math.floor(i/perRow),inRow=Math.min(perRow,parts.length-r*perRow),col=i%perRow;
  p.toppings.push({k:'label',label:t,g,x:(col-(inRow-1)/2)*sp,y:(r-(rows-1)/2)*sp,rot:0,s:sc})});return parts.length}
function geraldPizza(vibe,topic,vegan){
 const p=newPizza();delete p.sauceDabs;delete p.cheeseDabs;delete p.tosses;p.size=.92;p.vegan=!!vegan;p.bake=1;p.baked=true;
 p.sauce={classic:'red',fancy:'pesto',fun:'red',over:'purple'}[vibe];
 p.cheese=vegan?(vibe==='over'?'vched':'vmozz'):{classic:'mozz',fancy:'goat',fun:'cheddar',over:'cheddar'}[vibe];
 const recipe={classic:[['pepperoni',9],['basil',6],['mushroom',5],['handshake',1]],fancy:[['olive',10],['basil',8],['mushroom',6],['pepper',4],['idea',1]],
  fun:[['pepperoni',8],['pineapple',5],['eyes',2],['hat',1],['handshake',1]],
  over:[['pepperoni',9],['olive',9],['mushroom',8],['pepper',8],['pineapple',8],['basil',8],['duck',3],['sock',1],['rocket',2],['idea',2]]}[vibe];
 const lim=[0,.8];
 recipe.forEach(([k,n])=>{for(let i=0;i<n;i++){const a=Math.random()*6.283,d=lim[0]+Math.sqrt(Math.random())*(lim[1]-lim[0]);p.toppings.push({k,x:Math.cos(a)*d,y:Math.sin(a)*d,rot:Math.random()*6.283})}});
 if(topic)placeLabels(p,topic);
 const nouns={classic:'Classic',fancy:'Reserve',fun:'Special',over:'Supreme'};
 p.name=topic&&topic.length<=22?'The '+topic+' '+nouns[vibe]:{classic:'The Gerald Classic',fancy:"The Critic's Choice",fun:'The Happy Accident',over:'The Whole Pantry'}[vibe];
 return p}
$('#hireBtn').onclick=()=>{
 const m=meetings.find(x=>x.id===$('#hireFor').value)||null;const topic=$('#hireTopic').value.trim();
 currentMeetingId=m?m.id:null;editingSignature=false;
 pizza=geraldPizza(hireVibe,topic,$('#hireVegan').checked);box=boxFromProfile(m);
 step=4;saidStep=4;show('make');gSay('Done. I made '+pizza.name+'. Sign the box and it is ready to go.');
 toast('Gerald made your pizza. Add your note and send it.')};

/* ---------- bulk send ---------- */
const SAMPLE_CSV='Name,Email,Company,Vegan\nJordan Reyes,jordan@brightlinelegal.example,Brightline Legal,no\nPriya Shah,priya@shahortiz.example,Shah & Ortiz LLP,yes\n'+
 'Marcus Lee,marcus@harborparalegal.example,Harbor Paralegal Services,no\nDana Whitfield,dana@whitfieldlaw.example,Whitfield Law Group,no\n'+
 'Sam Okafor,,Okafor Consulting,no\nElena Ruiz,elena@ruizmediation.example,Ruiz Mediation,yes\nChris Tan,(909) 555-0177,Tan Family Law,no';
let bulk={rows:[],mode:'unique',sticker:'Happy Holidays',confetti:'snow',style:'classic',when:'now',sending:false,
 note:'Hi {first}, thank you for a great year working together. Here is a little holiday pizza from all of us. Wishing you and everyone at {company} a happy holiday season.',sign:''};
function parseCSV(txt){const rows=[];let row=[],f='',q=false;
 for(let i=0;i<txt.length;i++){const ch=txt[i];
  if(q){if(ch==='"'){if(txt[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
  else if(ch==='"')q=true;else if(ch===','){row.push(f);f=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=ch}
 if(f||row.length){row.push(f);rows.push(row)}return rows.filter(r=>r.some(c=>c.trim()))}
function loadList(txt){
 const data=parseCSV(txt);if(data.length<2){toast('That file needs a header row and at least one person.');return}
 const h=data[0].map(x=>x.trim().toLowerCase());
 const find=keys=>h.findIndex(x=>keys.some(k=>x===k||x.includes(k)));
 const iName=find(['full name','name']),iFirst=find(['first']),iLast=find(['last']),iEmail=find(['email','e-mail']),iPhone=find(['phone','mobile','cell']),
  iCo=find(['company','organization','firm','business']),iVeg=find(['vegan','diet']);
 if(iName<0&&iFirst<0){toast('Could not find a Name column. Check the header row.');return}
 bulk.rows=data.slice(1).map(r=>{const g=i=>i>=0?(r[i]||'').trim():'';
  const name=iName>=0&&!h[iName].includes('first')&&!h[iName].includes('last')?g(iName):(g(iFirst)+' '+g(iLast)).trim();
  const contact=g(iEmail)||g(iPhone);const veg=/^(y|yes|true|1|vegan)$/i.test(g(iVeg));
  const ok=!!name&&(/.+@.+\..+/.test(contact)||/^[\d\s()+.-]{7,}$/.test(contact));
  return{name,contact,company:g(iCo),vegan:veg,ok}});
 let added=0;bulk.rows.forEach(r=>{if(r.name&&!findContact(r.name)){addContact({name:r.name,company:r.company,contact:r.contact,vegan:r.vegan});added++}});
 renderBulk();toast('Loaded '+bulk.rows.length+' people.'+(added?' Added '+added+' new to People.':''))}
$('#csvFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const fr=new FileReader();fr.onload=()=>loadList(String(fr.result));fr.readAsText(f);e.target.value=''});
$('#sampleCsv').onclick=()=>loadList(SAMPLE_CSV);
$('#copyHeader').onclick=()=>{try{navigator.clipboard.writeText('Name,Email,Phone,Company,Vegan').then(()=>toast('Column headers copied. Paste them into row 1 of your spreadsheet.'),()=>toast('Headers: Name, Email, Phone, Company, Vegan'))}catch(e){toast('Headers: Name, Email, Phone, Company, Vegan')}};
$('#bulkBack').onclick=()=>show('people');
$('#feedMore').onclick=()=>show('news');$('#newsBack').onclick=()=>show('gerald');
function merge(t,r){return t.replace(/\{first\}/g,first(r.name)).replace(/\{company\}/g,r.company||'your team')}
function bulkBox(r){return{style:bulk.style,sticker:bulk.sticker,confetti:bulk.confetti,tone:'playful',note:merge(bulk.note,r),sign:bulk.sign,to:r.name,contact:r.contact,meeting:bulk.sticker,linkLabel:profile.linkLabel,link:profile.link,method:'email',reward:Object.assign({text:'',code:'',link:'',exp:''},profile.reward||{})}}
function bulkPizza(r){if(bulk.mode==='signature'){const p=clonePizza(signature);if(r.vegan){veganize(p)}return p}
 return geraldPizza(['classic','fancy','fun'][Math.abs(r.name.length)%3],first(r.name),r.vegan)}
function renderBulk(){
 if(!bulk.sign)bulk.sign=profile.sign;
 const good=bulk.rows.filter(r=>r.ok),bad=bulk.rows.length-good.length,veg=good.filter(r=>r.vegan).length;
 $('#listSummary').textContent=bulk.rows.length?bulk.rows.length+' people loaded. '+good.length+' ready'+(bad?', '+bad+' missing an email or phone.':'.'):'No list yet. Upload a CSV or try the sample list.';
 const tw=$('#tableWrap'),tb=$('#listTable');tw.hidden=!bulk.rows.length;tb.innerHTML='';
 if(bulk.rows.length){const hr=document.createElement('tr');['Name','Email or phone','Company','Vegan','Status'].forEach(t=>{const th=document.createElement('th');th.textContent=t;hr.appendChild(th)});tb.appendChild(hr);
  bulk.rows.forEach(r=>{const tr=document.createElement('tr');[r.name,r.contact||'Missing',r.company,r.vegan?'Yes':'No',r.ok?'Ready':'Skipped'].forEach((t,i)=>{const td=document.createElement('td');td.textContent=t;if((i===1&&!r.contact)||(i===4&&!r.ok))td.className='bad';tr.appendChild(td)});tb.appendChild(tr)})}
 makeChips($('#bulkMode'),[['unique','Gerald makes each one unique'],['signature','My signature pizza for everyone']],()=>bulk.mode,v=>{bulk.mode=v;renderBulk()});
 $('#bulkModeHelp').textContent=bulk.mode==='unique'?'Gerald builds a different pizza for each person with their name spelled in pepperoni. Vegan contacts get vegan pizzas.':'Everyone gets your signature pizza. Vegan contacts get a vegan version automatically.';
 fillOccasions($('#bulkStickerSel'),bulk.sticker);
 bulk.confetti=okConf(bulk.confetti);makeChips($('#bulkConfetti'),seasonConfetti(),()=>bulk.confetti,v=>{bulk.confetti=v;burst(v)});
 makeChips($('#bulkStyle'),Object.entries(STYLES),()=>bulk.style,v=>{bulk.style=v;renderBulkBox()});
 $('#bulkNote').value=bulk.note;$('#bulkSign').value=bulk.sign;$('#bulkBiz').value=profile.business;renderThumbs();
 makeChips($('#bulkWhen'),[['now','Send now'],['later','Schedule it']],()=>bulk.when,v=>{bulk.when=v;renderBulk()});
 $('#bulkDateField').hidden=bulk.when!=='later';
 $('#bulkReview').textContent=good.length?(good.length+' pizza'+(good.length===1?'':'s')+(veg?', '+veg+' of them vegan':'')+(bulk.when==='later'?'. Scheduled for '+$('#bulkDate').value:'. Going out now')+'.'+(bad?' '+bad+' skipped.':'')):'Load a list to see your total.';
 $('#bulkSend').disabled=!good.length||bulk.sending;$('#bulkPreview').disabled=!good.length;
 $('#bulkSend').textContent=bulk.when==='later'?'Schedule '+good.length+' pizzas':'Send '+good.length+' pizzas';
 renderBulkBox()}
function renderBulkBox(){const r=bulk.rows.find(x=>x.ok)||{name:'Priya Shah',company:'Shah & Ortiz LLP'};
 const b=bulkBox(r);renderLid($('#bLid'),$('#bLogo'),$('#bBiz'),$('#bSticker'),b,!!r.vegan);$('#bNote').textContent=b.note;$('#bSign').textContent=b.sign;
 $('#bulkPreviewLabel').textContent='Preview for '+first(r.name)}
$('#bulkNote').addEventListener('input',e=>{bulk.note=e.target.value;renderBulkBox()});
$('#logoFile3').addEventListener('change',e=>{handleLogo(e.target.files[0]);e.target.value=''});
$('#logoRemove3').onclick=()=>{profile.logo=null;saveProfile();renderThumbs();renderBulkBox()};
$('#bulkBiz').addEventListener('input',e=>{profile.business=e.target.value;saveProfile();renderBulkBox()});
$('#bulkSign').addEventListener('input',e=>{bulk.sign=e.target.value;renderBulkBox()});
$('#bulkDate').addEventListener('input',()=>renderBulk());
$('#bulkPreview').onclick=()=>{const r=bulk.rows.find(x=>x.ok);if(r)openRecipient(bulkPizza(r),bulkBox(r))};
$('#bulkSend').onclick=()=>{
 const good=bulk.rows.filter(r=>r.ok);if(!good.length||bulk.sending)return;bulk.sending=true;
 $('#bulkProgress').hidden=false;$('#bulkResult').hidden=true;$('#bulkSend').disabled=true;let i=0;
 const tick=setInterval(()=>{i++;$('#bulkBar').style.width=(i/good.length*100)+'%';
  if(i>=good.length){clearInterval(tick);bulk.sending=false;const veg=good.filter(r=>r.vegan).length,skip=bulk.rows.length-good.length;
   $('#bulkResult').hidden=false;$('#bulkResult').textContent=(bulk.when==='later'?'Scheduled ':'Sent ')+good.length+' pizzas'+(veg?', '+veg+' made vegan':'')+(skip?'. Skipped '+skip+' with no email or phone':'')+'. (Prototype: nothing was emailed.)';
   good.forEach(r=>logSend({who:r.name,org:r.company,contact:r.contact,vegan:r.vegan},bulkPizza(r),bulkBox(r),bulk.sticker+' list send'));
   toast('Gerald reviewed all '+good.length+'. Every one got at least 3 slices.');renderBulk()}},180)};

/* ---------- occasions ---------- */
const OCCASIONS=[
 ['Everyday',[['Thank You','Thank You'],['Great Meeting','Great Meeting'],['Nice to Meet You','Nice to Meet You'],["Let's Do This","Let's Do This"],['Following Up','Following Up'],['Thinking of You','Thinking of You'],['Congratulations','Congratulations'],['Welcome Aboard','Welcome Aboard'],['Get Well Soon','Get Well Soon']]],
 ['Life and work milestones',[['Birthday','Happy Birthday'],['Anniversary','Happy Anniversary'],['Work anniversary','Happy Work Anniversary'],['Retirement','Happy Retirement'],['Promotion','Congrats on the Promotion'],['New job','Congrats on the New Job'],['Graduation','Happy Graduation'],['Wedding','Congrats on the Wedding'],['New baby','Welcome, Little One'],['New home','Happy New Home']]],
 ['Business',[['New client','Welcome, New Client'],['Referral thank-you','Thanks for the Referral'],['Grand opening','Happy Grand Opening'],['Business anniversary','Happy Business Anniversary'],['Year-end thank-you','Thanks for a Great Year']]],
 ['US federal holidays',[["New Year's Day",'Happy New Year'],['Martin Luther King Jr. Day','Happy MLK Day'],["Presidents' Day","Happy Presidents' Day"],['Memorial Day','Honoring Memorial Day'],['Juneteenth','Happy Juneteenth'],['Independence Day','Happy 4th of July'],['Labor Day','Happy Labor Day'],['Columbus Day','Happy Columbus Day'],["Indigenous Peoples' Day","Happy Indigenous Peoples' Day"],['Veterans Day','Thank You, Veterans'],['Thanksgiving','Happy Thanksgiving'],['Christmas Day','Merry Christmas']]],
 ['Seasonal',[['Holiday season','Happy Holidays'],["Season's greetings","Season's Greetings"]]]];
function fillOccasions(sel,cur){sel.innerHTML='';
 OCCASIONS.forEach(([g,items])=>{const og=document.createElement('optgroup');og.label=g;
  items.forEach(([l,s])=>{const o=document.createElement('option');o.value=s;o.textContent=l===s?s:l+' · '+s;og.appendChild(o)});sel.appendChild(og)});
 sel.value=cur;if(cur&&sel.value!==cur){const o=document.createElement('option');o.value=cur;o.textContent=cur;sel.prepend(o);sel.value=cur}}
const QUICK_MSGS=[
 ['After a meeting',['Thank you','Thanks!','Great call','Great meeting','Nice to meet you','Talk soon','Next steps',"Let's do this"]],
 ['Celebrate',['Congrats!','Well done','You did it','Cheers','Bravo']],
 ['Milestones',['Happy birthday','Happy anniversary','Happy retirement','Welcome aboard','Welcome baby','New home!']],
 ['Holidays',['Happy new year','Happy holidays','Merry Christmas','Happy 4th','Gobble gobble']],
 ['Pizza puns',['Slice to meet you',"You're gouda",'Slice work','Pizza my heart']]];
function fillQuick(sel,name,maxLen){maxLen=maxLen||24;sel.innerHTML='';const o0=document.createElement('option');o0.value='';o0.textContent='Pick a message';sel.appendChild(o0);
 const groups=QUICK_MSGS.slice();const f=name&&name.trim()?first(name):'';
 if(f)groups.unshift(['For '+f,['Thanks '+f,'Hi '+f,'Cheers '+f]]);
 groups.forEach(([g,items])=>{const ok=items.filter(t=>t.length<=maxLen);if(!ok.length)return;const og=document.createElement('optgroup');og.label=g;
  ok.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;og.appendChild(o)});sel.appendChild(og)})}
fillQuick($('#quickLabel'));
$('#quickLabel').addEventListener('change',e=>{const v=e.target.value;if(v){addMessage(v);e.target.value=''}});
$('#stickerSel').addEventListener('change',e=>{box.sticker=e.target.value;renderBoxPreview()});
$('#bulkStickerSel').addEventListener('change',e=>{bulk.sticker=e.target.value;renderBulkBox()});

/* ---------- confetti ---------- */
const CONFETTI=[['none','None'],['classic','Classic confetti'],['fireworks','Fireworks'],['paws','Paw prints'],['shamrocks','Shamrocks'],['petals','Flower petals'],['leaves','Falling leaves'],['bats','Bats'],['caps','Grad caps'],['suns','Suns'],['pizza','Pizza slices'],['hearts','Hearts'],['stars','Stars'],['gold','Gold sparkles'],['brand','Brand color confetti'],['logo','Logo confetti'],['snow','Snowflakes']];
const PRO_CONF=['gold','brand','logo'];
const SEASONAL={shamrocks:[3],bats:[10],snow:[12,1],leaves:[10,11],petals:[4,5],caps:[5,6],paws:[8],fireworks:[7],suns:[6,7,8,9]};
function inSeason(k,m){const s=SEASONAL[k];return !s||s.includes(m||viewMonth())}
function seasonConfetti(){return CONFETTI.filter(c=>inSeason(c[0])).map(([v,l])=>[v,SEASONAL[v]?l+' (this month only)':l])}
function okConf(k){return k&&inSeason(k)?k:'classic'}
let rCurrentBox=null,cparts=[],cRaf=0;const cfx=$('#confetti');
let logoImg=null;
const CPAL={crumbs:['#d9a35e','#c98a52','#b07a3a','#c23a28'],classic:['#c4122f','#f1ad2d','#4c6b28','#2b6cb0','#e86a92','#7d3c98'],hearts:['#c4122f','#e86a92','#ff8fab','#a10e27'],stars:['#f1ad2d','#ffd166','#fff1b8'],
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
 const fall=FALLING.includes(kind),big=['pizza','potato','caps','bats','paws','logo'].includes(kind);
 const n=fall?(kind==='snow'?110:90):big?60:150;
 for(let i=0;i<n;i++){cparts.push({kind,col:pal[i%pal.length],
  x:fall?Math.random()*W:W/2+(Math.random()-.5)*80,y:fall?-Math.random()*H*.6:H*.5,
  vx:fall?(Math.random()-.5)*.8:(Math.random()-.5)*16,vy:fall?1+Math.random()*1.6:-(7+Math.random()*12),
  g:fall?.01:.33,s:kind==='logo'?14+Math.random()*8:kind==='crumbs'?2+Math.random()*3:kind==='pizza'?14+Math.random()*8:kind==='gold'?2+Math.random()*3:big?10+Math.random()*6:fall&&kind!=='snow'?8+Math.random()*5:5+Math.random()*6,
  rot:Math.random()*6.28,vr:(Math.random()-.5)*(fall?.08:.3),life:fall?420:200+Math.random()*60,ph:Math.random()*6.28})}
 if(!cRaf)cRaf=requestAnimationFrame(cFrame)}
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
  else if(p.kind==='gold'){c.globalAlpha*=.6+.4*Math.sin(p.life/4+p.ph);c.beginPath();c.arc(0,0,p.s,0,6.28);c.fill()}
  else{c.beginPath();c.arc(0,0,p.s*.5,0,6.28);c.fill()}
  c.restore()}
 if(cparts.length)cRaf=requestAnimationFrame(cFrame)}

/* ---------- people (mini CRM) ---------- */
let contacts=[],selContact=null,qs={vegan:false,mode:'gerald',sticker:'Following Up',confetti:'classic',topic:'',note:'',built:null};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function findContact(n){n=(n||'').trim().toLowerCase();return contacts.find(c=>c.name.toLowerCase()===n)}
function addContact(o){const c={id:'c'+Math.random().toString(36).slice(2,8),name:o.name,company:o.company||'',contact:o.contact||'',vegan:!!o.vegan,notes:'',history:[]};contacts.push(c);return c}
function todayStr(){return new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function logSend(person,p,b,label){bumpSend();if(!person.who||!person.who.trim())return;let c=findContact(person.who);
 if(!c)c=addContact({name:person.who.trim(),company:person.org,contact:person.contact,vegan:person.vegan});if(!c.contact&&person.contact)c.contact=person.contact;
 c.history.unshift({date:todayStr(),label,pizza:clonePizza(p),box:JSON.parse(JSON.stringify(b)),opened:false})}
(function seedContacts(){
 const j=addContact({name:'Jordan Reyes',company:'Brightline Legal',contact:'jordan@brightlinelegal.example'});
 j.history.push({date:'Today',label:'Signature pizza after partnership call',pizza:clonePizza(meetings[0].pizza),box:meetings[0].box,opened:true});
 const d=addContact({name:'Dana Whitfield',company:'Whitfield Law Group',contact:'dana@whitfieldlaw.example'});
 const db=boxFromProfile({who:'Dana Whitfield',contact:d.contact,title:'Referral lunch'});db.note='Thank you for lunch and for thinking of us for referrals. It means a lot.';db.sticker='Thanks for the Referral';db.confetti='stars';
 d.history.push({date:'Sep 30',label:'After referral partner lunch',pizza:geraldPizza('fancy','Referrals',false),box:db,opened:true});
 d.notes='Booked a follow-up for November. Prefers text over email.';
 const e=addContact({name:'Elena Ruiz',company:'Ruiz Mediation',contact:'elena@ruizmediation.example',vegan:true});
 const eb=boxFromProfile({who:'Elena Ruiz',contact:e.contact,title:'Mediation panel'});eb.note='Great job on the panel today. Thanks for inviting me.';eb.sticker='Great Meeting';eb.confetti='hearts';
 e.history.push({date:'Oct 2',label:'After mediation panel',pizza:geraldPizza('fun','Great panel',true),box:eb,opened:false});
 addContact({name:'Priya Shah',company:'Shah & Ortiz LLP',contact:'priya@shahortiz.example',vegan:true});
 addContact({name:'Marcus Lee',company:'Harbor Paralegal Services',contact:'(909) 555-0142'});
})();
function hintFor(c){const l=c.history[0];if(!l)return'No pizzas yet. Send a first one to start the conversation.';
 return l.opened?'They opened your last pizza. Good time for a follow-up pizza.':'Your last pizza has not been opened yet. A second pizza by text can give them a nudge.'}
function resetQs(c){qs={vegan:false,mode:c&&c.history.length?'same':'gerald',sticker:'Following Up',confetti:'classic',topic:'',
 note:c?'Hi '+first(c.name)+', following up on our conversation. One more slice of thanks from me.':'',built:null}}
function renderPeople(){
 const q=$('#peopleSearch').value.trim().toLowerCase(),ul=$('#peopleList');ul.innerHTML='';
 const list=contacts.filter(c=>!q||c.name.toLowerCase().includes(q)||c.company.toLowerCase().includes(q));
 if(!list.length){const li=document.createElement('li');li.className='muted';li.textContent='No one matches that search.';ul.appendChild(li);return}
 list.forEach(c=>{const li=document.createElement('li');li.className='person'+(selContact===c.id?' open':'');const l=c.history[0];
  li.innerHTML='<div class="p-top"><div><h3>'+esc(c.name)+'</h3><div class="p-meta">'+esc(c.company||'No company')+(c.vegan?' · 🌱 Vegan':'')+'</div></div>'+
   '<span class="pill '+(l?(l.opened?'ok':'wait'):'')+'">'+(l?(l.opened?'Opened':'Not opened'):'New')+'</span></div>'+
   '<div class="p-last">'+(l?'Last pizza: '+esc(l.date)+' · '+esc(l.pizza.name):'No pizzas sent yet')+(c.history.length>1?' · '+c.history.length+' sent':'')+'</div>'+
   '<div class="btn-row"><button class="btn small primary" data-act="send">'+(c.history.length?'Send another pizza':'Send a pizza')+'</button><button class="btn small" data-act="toggle">'+(selContact===c.id?'Close':'History and notes')+'</button></div>';
  if(selContact===c.id)li.appendChild(detailEl(c));
  li.querySelector('[data-act=send]').onclick=()=>{selContact=c.id;resetQs(c);renderPeople();setTimeout(()=>{const el=$('#qsTopic');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus()}},60)};
  li.querySelector('[data-act=toggle]').onclick=()=>{selContact=selContact===c.id?null:c.id;resetQs(c);renderPeople()};
  ul.appendChild(li)})}
function detailEl(c){
 const d=document.createElement('div');d.style.cssText='display:flex;flex-direction:column;gap:12px';
 d.innerHTML='<p class="hint">'+esc(hintFor(c))+'</p>'+(c.contact?'<p class="p-meta">'+esc(c.contact)+'</p>':'')+
  '<div class="composer"><h3>'+(c.history.length?'Send another pizza':'Send a pizza')+'</h3>'+
  '<div class="field"><label for="qsTopic">Pepperoni message</label><select id="qsQuick" aria-label="Quick pick a pepperoni message"></select><input type="text" id="qsTopic" maxlength="30" placeholder="Or write your own"></div>'+
  '<div class="field"><label for="qsNote">Note inside the lid</label><textarea id="qsNote" maxlength="280"></textarea></div>'+
  '<div class="field"><label>Pizza</label><div class="chips" id="qsMode"></div></div>'+
  '<label class="check"><input type="checkbox" id="qsVegan"> Make it vegan'+(c.vegan?'<span class="muted"> ('+esc(first(c.name))+' is marked vegan)</span>':'')+'</label>'+
  '<div class="two"><div class="field"><label for="qsSticker">Occasion sticker</label><select id="qsSticker"></select></div><div class="field"><label for="qsConfetti">Confetti</label><select id="qsConfetti"></select></div></div>'+
  '<div class="btn-row"><button class="btn small" id="qsPreview">Preview</button><button class="btn small primary" id="qsSend">Send to '+esc(first(c.name))+'</button></div></div>'+
  (c.history.length?'<h3>History</h3><ul class="hist" id="qsHist"></ul>':'')+
  '<div class="field"><label for="pNotes">Notes</label><textarea id="pNotes" placeholder="Anything to remember about '+esc(first(c.name))+'"></textarea></div>';
 const q=s=>d.querySelector(s);
 fillQuick(q('#qsQuick'),c.name,24);q('#qsQuick').addEventListener('change',e=>{if(e.target.value){qs.topic=e.target.value;q('#qsTopic').value=qs.topic;qs.built=null;e.target.value=''}});
 q('#qsTopic').value=qs.topic;q('#qsTopic').addEventListener('input',e=>{qs.topic=e.target.value;qs.built=null});
 q('#qsNote').value=qs.note;q('#qsNote').addEventListener('input',e=>{qs.note=e.target.value;qs.built=null});
 const modes=(c.history.length?[['same','Same pizza, new message']]:[]).concat([['signature','My signature pizza'],['gerald','Gerald makes a new one']]);
 q('#qsVegan').checked=qs.vegan;q('#qsVegan').addEventListener('change',e=>{qs.vegan=e.target.checked;qs.built=null});
 makeChips(q('#qsMode'),modes,()=>qs.mode,v=>{qs.mode=v;qs.built=null});
 fillOccasions(q('#qsSticker'),qs.sticker);q('#qsSticker').addEventListener('change',e=>{qs.sticker=e.target.value;qs.built=null});
 qs.confetti=okConf(qs.confetti);if(!isPro()&&PRO_CONF.includes(qs.confetti))qs.confetti='classic';const cs=q('#qsConfetti');seasonConfetti().forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l+(!isPro()&&PRO_CONF.includes(v)?' (Pro)':'');cs.appendChild(o)});cs.value=qs.confetti;
 cs.addEventListener('change',e=>{if(!isPro()&&PRO_CONF.includes(e.target.value)){burst(e.target.value);e.target.value=qs.confetti;upgrade('confetti');return}qs.confetti=e.target.value;qs.built=null;burst(qs.confetti)});
 q('#qsPreview').onclick=()=>{const{p,b}=qsBuild(c);openRecipient(p,b)};
 q('#qsSend').onclick=()=>{const{p,b}=qsBuild(c);
  c.history.unshift({date:todayStr(),label:qs.topic?'Follow-up: "'+qs.topic+'"':'Follow-up pizza',pizza:clonePizza(p),box:b,opened:false});
  toast('Sent '+p.name+' to '+first(c.name)+'. Prototype: nothing was emailed.');resetQs(c);renderPeople()};
 if(c.history.length){const hl=q('#qsHist');c.history.forEach(h=>{const li=document.createElement('li');
  li.innerHTML='<span class="d">'+esc(h.date)+'</span><span class="t"><b>'+esc(h.pizza.name)+'</b>'+esc(h.label)+'</span>';
  const bt=document.createElement('button');bt.className='btn small';bt.textContent='See it';bt.onclick=()=>openRecipient(h.pizza,h.box);li.appendChild(bt);hl.appendChild(li)})}
 q('#pNotes').value=c.notes;q('#pNotes').addEventListener('input',e=>c.notes=e.target.value);
 return d}
function qsBuild(c){if(qs.built)return qs.built;const topic=(qs.topic||'').trim(),last=c.history[0];let p;
 if(qs.mode==='same'&&last){p=clonePizza(last.pizza);const n=c.history.length+1;p.name=last.pizza.name.replace(/ \(Round [^)]+\)$/,'')+' (Round '+(['','','Two','Three','Four','Five'][n]||n)+')'}
 else if(qs.mode==='signature')p=clonePizza(signature);
 else p=geraldPizza(['classic','fancy','fun'][Math.floor(Math.random()*3)],topic,qs.vegan);
 if(qs.mode!=='gerald'){if(qs.vegan){veganize(p)}
  if(topic)placeLabels(p,topic)}
 const b=boxFromProfile({who:c.name,contact:c.contact,title:qs.sticker});b.note=qs.note;b.sticker=qs.sticker;b.confetti=qs.confetti;
 qs.built={p,b};return qs.built}
$('#peopleSearch').addEventListener('input',renderPeople);
$('#addPersonBtn').onclick=()=>{$('#addPerson').hidden=false;$('#npName').focus()};
$('#cancelPerson').onclick=()=>{$('#addPerson').hidden=true};
$('#savePerson').onclick=()=>{const n=$('#npName').value.trim();if(!n){$('#npName').focus();toast('Add a name first.');return}
 if(findContact(n)){toast(n+' is already in People.');return}
 const c=addContact({name:n,contact:$('#npContact').value.trim(),company:$('#npCompany').value.trim(),vegan:$('#npVegan').checked});
 ['#npName','#npContact','#npCompany'].forEach(s=>$(s).value='');$('#npVegan').checked=false;$('#addPerson').hidden=true;selContact=c.id;resetQs(c);renderPeople();toast(n+' added.')};
if($('#demoUnbox'))$('#demoUnbox').onclick=()=>{const b=boxFromProfile({who:'Priya Shah',contact:'',title:'Intro call'});b.confetti='classic';const p=clonePizza(signature);veganize(p);openRecipient(p,b)};


/* Potato easter egg: tap her for a bark, tap five times for a secret */
const BARKS=['Woof!','Is that pizza for me?','I did not eat a slice. Probably.','Woof woof!','Gerald says I am not allowed to have any.','Pet me again.','Vroom vroom. Woof.'];
let pTaps=0;
function petPotato(el,bark){pTaps++;el.classList.remove('hop');requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('hop')));
 const secret=pTaps%5===0;const t=secret?"You found Potato's secret. She shares her pizza with no one, except you.":BARKS[(pTaps-1)%BARKS.length];
 if(bark){bark.textContent=t;bark.hidden=false;clearTimeout(bark._t);bark._t=setTimeout(()=>bark.hidden=true,secret?3200:1800)}else if(typeof toast==='function')toast(t);
 if(secret){burst('pizza');try{awardEgg('pet5')}catch(_){}}}
function wirePotato(el,bark){el.style.cursor='pointer';el.addEventListener('click',e=>{e.stopPropagation();petPotato(el,bark)});
 el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();petPotato(el,bark)}})}
wirePotato(SOTR.querySelector('#recipient .potato'),$('#zBark'));
SOTR.querySelectorAll('.p-av').forEach(el=>wirePotato(el,null));


/* ---------- Potato's Treat Jar ---------- */
const EGGS=[
 {id:'pet5',title:'Pet Potato five times',hint:'She loves a good pet. Keep going.',rw:10},
 {id:'peek',title:'Catch Potato peeking',hint:'Watch the corner of the tablecloth while you cook.',rw:5,daily:true},
 {id:'spell',title:'Spell her name',hint:'Write something very special on a pizza.',rw:15},
 {id:'toss10',title:'Ten tosses',hint:'Toss the dough way more than you need to.',rw:10},
 {id:'ducks',title:'The duck pizza',hint:'Potato has strong feelings about ducks.',rw:10},
 {id:'bowtie',title:'Bother Gerald',hint:'Gerald is very proud of his bow tie.',rw:5},
 {id:'holiday',title:'Holiday Potato',hint:'Check back on a holiday.',rw:20,locked:true},
 {id:'back',title:'A pizza back',hint:'Happens when someone you sent a pizza to makes one back.',rw:10,locked:true}];
const SECRETS=[
 {id:'potConf',title:'Potato confetti',text:'Tiny Potato heads burst across their screen.',cost:40,where:'Pick it on the Box step under confetti.'},
 {id:'bowtie',title:"Gerald's Gold Bow Tie box",text:'A gold box covered in tiny red bow ties.',cost:30,where:'Pick it on the Box step under box style.'},
 {id:'gravy',title:"Potato's Secret Sauce",text:'A rich gravy sauce Gerald pretends to hate.',cost:20,where:'Pick it on the Sauce step.'},
 {id:'holidayEarly',title:'Early access: Holiday boxes',text:'Try the holiday box before everyone else.',cost:35,where:'Pick it on the Box step under box style.'}];
let treats=Object.assign({bal:0,found:[],unlocked:[],peekDay:''},store.get('treats',{}));
function saveTreats(){store.set('treats',treats)}
function applyUnlocks(){
 if(treats.unlocked.includes('potConf')&&!CONFETTI.some(c=>c[0]==='potato'))CONFETTI.push(['potato','Potato confetti']);
 if(treats.unlocked.includes('bowtie'))STYLES.bowtie='Gold Bow Tie';
 if(treats.unlocked.includes('holidayEarly'))STYLES.holiday='Holiday (early access)'}
function awardEgg(id){const e=EGGS.find(x=>x.id===id);if(!e)return;
 if(e.daily){const d=new Date().toDateString();if(treats.peekDay===d)return false;treats.peekDay=d}
 else if(treats.found.includes(id))return false;
 if(!treats.found.includes(id))treats.found.push(id);treats.bal+=e.rw;saveTreats();
 toast('You found an easter egg: '+e.title+'! +'+e.rw+' Treats');try{burst('potato')}catch(_){}
 if(!views.gerald.hidden)renderTreats();return true}
function renderTreats(){$('#treatBal').textContent=treats.bal;$('#treatBalS').textContent=treats.bal;$('#eggCountS').textContent=treats.found.length+' of '+EGGS.length;
 const findable=EGGS.length;$('#eggCount').textContent='Easter eggs: '+treats.found.length+' of '+findable+' found';
 const el=$('#eggList');el.innerHTML='';
 EGGS.forEach(e=>{const li=document.createElement('li');const f=treats.found.includes(e.id);li.className=f?'found':'';
  li.innerHTML='<span><b>'+(f?esc(e.title):'???')+'</b>'+(f?(e.daily?'Found. Catch her again tomorrow for more.':'Found!'):'Hint: '+esc(e.hint))+'</span><span class="rw">+'+e.rw+' '+BONE+'</span>';el.appendChild(li)});
 const sl=$('#secretList');sl.innerHTML='';
 SECRETS.forEach(it=>{const li=document.createElement('li');const u=treats.unlocked.includes(it.id);li.className=u?'found':'';
  li.innerHTML='<span><b>'+esc(it.title)+'</b>'+esc(u?it.where:it.text)+'</span>';
  const b=document.createElement('button');b.type='button';b.className='btn small'+(u?'':' primary');
  b.innerHTML=u?'Unlocked':it.cost+' '+BONE;b.disabled=u||treats.bal<it.cost;b.setAttribute('aria-label',u?'Unlocked':'Unlock for '+it.cost+' Treats');
  b.onclick=()=>{if(treats.bal<it.cost)return;treats.bal-=it.cost;treats.unlocked.push(it.id);saveTreats();applyUnlocks();renderTreats();
   toast('Unlocked: '+it.title+'. '+it.where);if(it.id==='potConf')burst('potato')};
  li.appendChild(b);sl.appendChild(li)})}
applyUnlocks();
const BONE='<svg class="bone" viewBox="0 0 24 12" aria-hidden="true"><path d="M5 1.5a2.6 2.6 0 0 0-2.2 4.2A2.6 2.6 0 0 0 5 10.5c1.1 0 2-.7 2.4-1.6h9.2c.4.9 1.3 1.6 2.4 1.6a2.6 2.6 0 0 0 2.2-4.8A2.6 2.6 0 0 0 19 1.5c-1.1 0-2 .7-2.4 1.6H7.4C7 2.2 6.1 1.5 5 1.5z" fill="#f6e3c2" stroke="#3a1d12" stroke-width="1.2"/></svg>';
/* peeking Potato */
const peekBtn=$('#peek');peekBtn.innerHTML=POTATO_PEEK;let nextPeek=Date.now()+12000,peekHide;
setInterval(()=>{if(views.make.hidden||step>3||baking||!peekBtn.hidden||Date.now()<nextPeek)return;
 peekBtn.hidden=false;clearTimeout(peekHide);peekHide=setTimeout(()=>{peekBtn.hidden=true},3500);nextPeek=Date.now()+20000+Math.random()*15000},1000);
peekBtn.onclick=e=>{e.stopPropagation();peekBtn.hidden=true;if(!awardEgg('peek'))toast('Potato says hi. Come back tomorrow for another Treat.')};
/* Gerald's bow tie */
let gTaps=[];SOTR.querySelectorAll('.g-av').forEach(el=>{el.style.cursor='pointer';el.addEventListener('click',()=>{const t=Date.now();gTaps=gTaps.filter(x=>t-x<2500);gTaps.push(t);
 if(gTaps.length>=3){gTaps=[];try{gSay('Please stop touching the bow tie. Potato already chewed the last one.')}catch(_){}awardEgg('bowtie')}})});

/* ---------- Pizza of the Month (admin-editable) ---------- */
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const ALL_STYLES={kraft:'Kraft',classic:'Classic',gold:'Fancy gold',midnight:'Midnight gold',hearts:'Hearts',lucky:'Lucky green',garden:'Spring garden',floral:'Floral',plaid:'Plaid',flag:'Stars and stripes',potato:"Potato's paw prints",picnic:'Picnic',harvest:'Harvest',gratitude:'Gratitude',merry:'Merry',bowtie:'Gold Bow Tie',holiday:'Holiday'};
const DEFAULT_SPECIALS={
 1:{active:true,theme:"New Year's Day",name:'The Fresh Start',desc:'Golden butter sauce, mozzarella, gold coins, and sparklers, with the new year spelled in pepperoni.',sauce:'gold',cheese:'mozz',shape:'round',tops:[['coin',8],['sparkle',5]],sign:'{year}',sticker:'Happy New Year',style:'midnight',confetti:'gold',gerald:'New year, same impeccable standards. Five slices.'},
 2:{active:true,theme:"Valentine's Day",name:'Pizza My Heart',desc:'A heart-shaped pizza with pink garlic sauce and heart-shaped pepperoni.',sauce:'rose',cheese:'mozz',shape:'heart',tops:[['pepHeart',10],['basil',4]],sign:'',sticker:"Happy Valentine's Day",style:'hearts',confetti:'hearts',gerald:'I am not crying. There is basil in my eye.'},
 3:{active:true,theme:"St. Patrick's Day",name:'The Lucky Slice',desc:'Pesto, mozzarella, shamrock basil, gold coin pepperoni, and a rainbow of peppers.',sauce:'pesto',cheese:'mozz',shape:'round',tops:[['shamrock',8],['coin',6],['pepper',6]],sign:'Lucky',sticker:"Happy St. Patrick's Day",style:'lucky',confetti:'shamrocks',gerald:'Lucky for you, this one is excellent.'},
 4:{active:true,theme:'Spring and Earth Day',name:'The Spring Bloom',desc:'Toppings arranged into veggie flowers with basil leaves and olive centers.',sauce:'red',cheese:'mozz',shape:'round',tops:[['flower',7],['basil',7]],sign:'',sticker:'Happy Spring',style:'garden',confetti:'petals',gerald:'It is a garden. On a pizza. I will allow it.'},
 5:{active:true,theme:"Mother's Day",name:'The Bouquet',desc:'Garlic white sauce, goat cheese, and a bouquet of veggie flowers.',sauce:'white',cheese:'goat',shape:'round',tops:[['flower',9],['basil',5]],sign:'Thank you',sticker:"Happy Mother's Day",style:'floral',confetti:'petals',gerald:'Elegant. Thoughtful. Call your mother.'},
 6:{active:true,theme:"Father's Day and graduation",name:'The Grill Master',desc:'BBQ sauce, cheddar, mushrooms, peppers, and a few graduation caps.',sauce:'bbq',cheese:'cheddar',shape:'round',tops:[['mushroom',6],['pepper',5],['cap',3]],sign:'',sticker:"Happy Father's Day",style:'plaid',confetti:'caps',gerald:'Smoky, confident, slightly dad-joke energy. Five slices.'},
 7:{active:true,theme:'Independence Day',name:'Stars and Stripes',desc:'Classic red, mozzarella, star-shaped pepperoni, and blue corn chips.',sauce:'red',cheese:'mozz',shape:'round',tops:[['pepStar',10],['blueChip',10]],sign:'',sticker:'Happy 4th of July',style:'flag',confetti:'fireworks',gerald:'Red, white, blue, and delicious. Potato is scared of the fireworks.'},
 8:{active:true,theme:'National Dog Day',name:'The Potato Special',desc:"Potato's month. Paw-print pepperoni, bone-shaped crust bites, and woof spelled in pepperoni.",sauce:'red',cheese:'mozz',shape:'round',tops:[['paw',8],['bone',4]],sign:'Woof',sticker:'Happy Dog Day',style:'potato',confetti:'paws',gerald:'Potato designed this one herself. I have notes. She ate them.'},
 9:{active:true,theme:'Labor Day',name:'The Long Weekend',desc:'A picnic-style pizza with mushrooms, peppers, olives, and basil.',sauce:'red',cheese:'mozz',shape:'round',tops:[['mushroom',5],['pepper',5],['olive',5],['basil',4]],sign:'',sticker:'Happy Labor Day',style:'picnic',confetti:'suns',gerald:'You worked hard. Have a slice. Have three.'},
 10:{active:true,theme:'Halloween',name:'The Haunted Harvest',desc:"Suspicious purple sauce, cheddar, jack-o'-lantern pepperoni, bats, olive spiders, and one ghost Gerald swears is not real.",sauce:'purple',cheese:'cheddar',shape:'round',tops:[['jackPep',6],['bat',4],['olive',8],['ghost',1]],sign:'Boo',sticker:'Happy Halloween',style:'harvest',confetti:'bats',gerald:'I am not scared of this pizza. I just prefer to review it with the lights on.'},
 11:{active:true,theme:'Thanksgiving',name:'The Gratitude Pie',desc:'Classic red, mozzarella, mushrooms, basil, falling leaves, and one very proud turkey.',sauce:'red',cheese:'mozz',shape:'round',tops:[['mushroom',6],['basil',6],['leaf',5],['turkey',1]],sign:'Thankful',sticker:'Happy Thanksgiving',style:'gratitude',confetti:'leaves',gerald:'A pizza that says thank you for you. Very efficient. Five slices.'},
 12:{active:true,theme:'Holiday season',name:'Merry and Bright',desc:'Pesto, parmesan, snowflake mozzarella, little trees, and stars.',sauce:'pesto',cheese:'parm',shape:'round',tops:[['snowMozz',8],['tree',4],['xstar',3],['pepper',5]],sign:'Cheers',sticker:'Happy Holidays',style:'merry',confetti:'snow',gerald:'Festive without being tacky. Potato tried to eat a tree.'}};
const DEFAULT_SPONSOR={active:true,sponsor:'Mountain Slice Pizzeria',sample:true,logo:null,name:'The Mountain Slice',desc:'A classic pepperoni and mushroom pie from our sample sponsor.',offer:'20% off your first order',code:'SLICE20',link:'https://www.example.com',
 sauce:'red',cheese:'mozz',shape:'round',tops:[['pepperoni',10],['mushroom',6],['basil',5]],sign:'',sticker:'Thank You',style:'kraft',confetti:'pizza',gerald:'Sponsored, yes. Delicious, also yes. I would not lie to you.'};
function specialsData(){const ov=store.get('specials',{});const out={};for(let m=1;m<=12;m++)out[m]=Object.assign({},DEFAULT_SPECIALS[m],ov[m]||{});return out}
function sponsorData(){return Object.assign({},DEFAULT_SPONSOR,store.get('sponsor',{}),{active:false})}
function viewMonth(){return store.get('previewMonth',null)||new Date().getMonth()+1}
function currentSpecial(){const sp=specialsData()[viewMonth()];return sp&&sp.active!==false?sp:null}
function fillSign(t){return (t||'').replace('{year}',String(new Date().getMonth()===11?new Date().getFullYear()+1:new Date().getFullYear()))}
function specialPizza(sp){const p=newPizza();delete p.sauceDabs;delete p.cheeseDabs;delete p.tosses;p.size=.92;p.bake=1;p.baked=true;p.sauce=sp.sauce;p.cheese=sp.cheese;p.name=sp.name;p.seed=4.2;p.shape=sp.shape||'round';
 const r=rng(7),lim=p.shape==='heart'?.55:.72;(sp.tops||[]).forEach(([k,n])=>{if(!TOPS[k])return;for(let i=0;i<n;i++){const a=r()*6.283,d=.12+Math.sqrt(r())*lim;
  p.toppings.push({k,x:Math.cos(a)*d,y:Math.sin(a)*d+(p.shape==='heart'?-.05:0),rot:(TOPS[k].g==='special'?(r()-.5)*.6:r()*6.283)})}});
 const sg=fillSign(sp.sign);if(sg)placeLabels(p,sg);return p}
function specialBox(sp,sponsor){const b=boxFromProfile(null);b.sticker=sp.sticker;b.style=sp.style;b.confetti=sp.confetti;
 if(sponsor)b.sponsor={name:sp.sponsor,logo:sp.logo,offer:sp.offer,code:sp.code,link:sp.link};return b}
function confName(k){return (CONFETTI.find(c=>c[0]===k)||['',k])[1].toLowerCase()}
function renderSpecial(){const sp=currentSpecial(),m=viewMonth(),last=new Date(new Date().getFullYear(),m,0),card=$('#specialCard');
 card.hidden=!sp;if(sp){
 $('#spMonth').textContent='Pizza of the Month · '+MONTHS[m-1]+(sp.theme?' · '+sp.theme:'');
 $('#spUntil').textContent=store.get('previewMonth',null)?'Admin preview':'Until '+last.toLocaleDateString('en-US',{month:'short',day:'numeric'});
 $('#spName').textContent=sp.name;$('#spDesc').textContent=sp.desc;$('#spGerald').textContent='Gerald says: "'+sp.gerald+'"';
 $('#spComes').textContent='Comes with a special box, a "'+sp.sticker+'" sticker, and '+confName(sp.confetti)+' confetti.';
 drawPizza($('#spCanvas'),specialPizza(sp),120)}
 const so=sponsorData(),sc=$('#sponsorCard');sc.hidden=!so.active;if(so.active){
 $('#soEyebrow').textContent='Presented by '+so.sponsor+(so.sample?' (sample sponsor)':'');$('#soName').textContent=so.name;$('#soDesc').textContent=so.desc;
 $('#soOffer').textContent=so.offer?(so.offer+(so.code?' with code '+so.code:'')):'';drawPizza($('#soCanvas'),specialPizza(so),120)}}
$('#spSend').onclick=()=>{const sp=currentSpecial();if(!sp)return;currentMeetingId=null;editingSignature=false;pizza=specialPizza(sp);box=specialBox(sp);step=4;saidStep=4;show('make');
 gSay('Excellent choice. '+sp.name+' is ready. Sign the box and send it.')};
$('#spPreview').onclick=()=>{const sp=currentSpecial();if(!sp)return;const b=specialBox(sp);b.to='Priya Shah';openRecipient(specialPizza(sp),b)};
function previewSponsor(){const so=sponsorData();const b=specialBox(so,true);b.to='Priya Shah';openRecipient(specialPizza(so),b)}
$('#soSend').onclick=()=>{const so=sponsorData();currentMeetingId=null;editingSignature=false;pizza=specialPizza(so);box=specialBox(so,true);step=4;saidStep=4;show('make');
 gSay('Sponsored by '+so.sponsor+'. I reviewed it anyway. It passed.')};
$('#soPreview').onclick=previewSponsor;
function renderSponsorBlock(b){const el=$('#rSponsor');if(!b||!b.sponsor){el.hidden=true;return}const sp=b.sponsor;el.hidden=false;el.innerHTML='';
 const h=document.createElement('div');h.className='sb-h';if(sp.logo){const i=document.createElement('img');i.src=sp.logo;i.alt=sp.name+' logo';h.appendChild(i)}
 h.appendChild(document.createTextNode('Presented by '+sp.name));el.appendChild(h);
 if(sp.offer){const o=document.createElement('span');o.textContent='Your gift: '+sp.offer+(sp.code?' with code ':'');if(sp.code){const cd=document.createElement('code');cd.textContent=sp.code;o.appendChild(cd)}el.appendChild(o)}
 if(sp.link){const a=document.createElement('a');a.className='btn small';a.href=sp.link;a.target='_blank';a.rel='noopener';a.textContent='Order from '+sp.name;el.appendChild(a)}}

/* ---------- announcements (admin can add) ---------- */
function allNews(){return store.get('news',[]).concat(ANNOUNCEMENTS)}

/* ---------- Admin ---------- */
let admTab='special',admMonth=new Date().getMonth()+1,admDraft=null;
$('#openAdmin').onclick=()=>{if(isAdmin())show('admin')};$('#adminBack').onclick=()=>show('settings');
function opt(sel,val,label){const o=document.createElement('option');o.value=val;o.textContent=label;sel.appendChild(o)}
function fld(label,el,help){const f=document.createElement('div');f.className='field';const l=document.createElement('label');l.textContent=label;if(el.id)l.htmlFor=el.id;f.appendChild(l);f.appendChild(el);
 if(help){const h=document.createElement('small');h.textContent=help;f.appendChild(h)}return f}
function inp(id,val,max){const i=document.createElement('input');i.type='text';i.id=id;i.value=val||'';if(max)i.maxLength=max;return i}
function sel(id,pairs,val){const s=document.createElement('select');s.id=id;pairs.forEach(([v,l])=>opt(s,v,l));s.value=val;return s}
function pizzaEditor(host,data,opts){
 host.innerHTML='';const card=document.createElement('div');card.className='card adm-grid';host.appendChild(card);
 const prev=document.createElement('div');prev.className='adm-prev';const cv2=document.createElement('canvas');cv2.width=140;cv2.height=140;cv2.setAttribute('aria-label','Preview');
 const pt=document.createElement('div');pt.className='sp-text';const ph=document.createElement('h3');pt.appendChild(ph);const pm=document.createElement('p');pm.className='muted';pm.style.fontSize='.85rem';pt.appendChild(pm);
 prev.append(cv2,pt);card.appendChild(prev);
 const redraw=()=>{ph.textContent=data.name||'Untitled pizza';pm.textContent=(ALL_STYLES[data.style]||data.style)+' box · '+confName(data.confetti)+' confetti · "'+data.sticker+'" sticker';drawPizza(cv2,specialPizza(data),120)};
 const bind=(el,key,ev)=>el.addEventListener(ev||'input',()=>{data[key]=el.type==='checkbox'?el.checked:el.value;redraw()});
 if(opts.extraTop)opts.extraTop(card,data,redraw);
 const act=document.createElement('label');act.className='check';const ac=document.createElement('input');ac.type='checkbox';ac.checked=data.active!==false;act.append(ac,document.createTextNode(' '+(opts.activeLabel||'Show this pizza in the app')));bind(ac,'active','change');card.appendChild(act);
 const nm=inp('admName',data.name,40);bind(nm,'name');card.appendChild(fld('Pizza name',nm));
 const ds=document.createElement('textarea');ds.id='admDesc';ds.value=data.desc||'';ds.maxLength=220;bind(ds,'desc');card.appendChild(fld('Description',ds));
 const gq=inp('admGerald',data.gerald,140);bind(gq,'gerald');card.appendChild(fld("Gerald's quote",gq));
 const sg=inp('admSign',data.sign,24);bind(sg,'sign');card.appendChild(fld('Pepperoni message',sg,'Optional. Use {year} for the year.'));
 const two=document.createElement('div');two.className='two';
 const st=document.createElement('select');st.id='admSticker';fillOccasions(st,data.sticker);bind(st,'sticker','change');
 const stc=inp('admStickerC','',30);stc.placeholder='Or type a custom sticker';stc.addEventListener('input',()=>{if(stc.value.trim()){data.sticker=stc.value.trim();redraw()}});
 const stf=fld('Sticker',st);stf.appendChild(stc);two.appendChild(stf);
 const bx=sel('admStyle',Object.entries(ALL_STYLES),data.style);bind(bx,'style','change');two.appendChild(fld('Box design',bx));card.appendChild(two);
 const two2=document.createElement('div');two2.className='two';
 const cf=sel('admConf',CONFETTI.filter(c=>c[0]!=='none'),data.confetti);bind(cf,'confetti','change');cf.addEventListener('change',()=>burst(cf.value));two2.appendChild(fld('Confetti',cf,'Changing it plays a preview.'));
 const shp=sel('admShape',[['round','Round'],['heart','Heart']],data.shape||'round');bind(shp,'shape','change');two2.appendChild(fld('Pizza shape',shp));card.appendChild(two2);
 const two3=document.createElement('div');two3.className='two';
 const sa=sel('admSauce',Object.keys(SAUCES).map(k=>[k,SAUCES[k].n]),data.sauce);bind(sa,'sauce','change');two3.appendChild(fld('Sauce',sa));
 const ch=sel('admCheese',Object.entries(CHEESES).map(([k,v])=>[k,v.n]),data.cheese);bind(ch,'cheese','change');two3.appendChild(fld('Cheese',ch));card.appendChild(two3);
 const tl=document.createElement('div');tl.className='adm-grid';const tlab=document.createElement('p');tlab.className='group-label';tlab.textContent='Toppings';card.appendChild(tlab);card.appendChild(tl);
 const drawTops=()=>{tl.innerHTML='';data.tops=data.tops||[];data.tops.forEach((row,ix)=>{const r=document.createElement('div');r.className='top-row';
   const ts=sel('admTop'+ix,Object.entries(TOPS).map(([k,v])=>[k,(v.e?v.e+' ':'')+v.n]),row[0]);ts.setAttribute('aria-label','Topping');ts.addEventListener('change',()=>{row[0]=ts.value;redraw()});
   const tc=document.createElement('input');tc.type='number';tc.min='1';tc.max='40';tc.value=row[1];tc.setAttribute('aria-label','How many');tc.addEventListener('input',()=>{row[1]=Math.max(1,Math.min(40,+tc.value||1));redraw()});
   const rm=document.createElement('button');rm.type='button';rm.className='btn small ghost';rm.textContent='Remove';rm.onclick=()=>{data.tops.splice(ix,1);drawTops();redraw()};
   r.append(ts,tc,rm);tl.appendChild(r)});
  const add=document.createElement('button');add.type='button';add.className='btn small';add.textContent='Add a topping';add.onclick=()=>{data.tops.push(['pepperoni',6]);drawTops();redraw()};tl.appendChild(add)};
 drawTops();
 const br=document.createElement('div');br.className='btn-row';
 const sv=document.createElement('button');sv.type='button';sv.className='btn primary';sv.textContent='Save';sv.onclick=()=>{opts.save(data);toast('Saved. The app is updated.')};
 const pv=document.createElement('button');pv.type='button';pv.className='btn';pv.textContent='Preview the unboxing';pv.onclick=()=>{const b=specialBox(data,opts.sponsor);b.to='Priya Shah';openRecipient(specialPizza(data),b)};
 br.append(sv,pv);if(opts.extraButtons)opts.extraButtons(br,data);card.appendChild(br);redraw()}
function renderAdmin(){
 makeChips($('#adminTabs'),[['special','Pizza of the Month'],['news',"What's new"]],()=>admTab,v=>{admTab=v;renderAdmin()});
 $('#adm-special').hidden=admTab!=='special';$('#adm-sponsor').hidden=admTab!=='sponsor';$('#adm-news').hidden=admTab!=='news';
 if(admTab==='special'){const data=JSON.parse(JSON.stringify(specialsData()[admMonth]));
  pizzaEditor($('#adm-special'),data,{
   extraTop:(card)=>{const ms=sel('admMonth',MONTHS.map((n,i)=>[String(i+1),n+' · '+DEFAULT_SPECIALS[i+1].theme]),String(admMonth));ms.addEventListener('change',()=>{admMonth=+ms.value;renderAdmin()});card.appendChild(fld('Month',ms))},
   save:(d)=>{const ov=store.get('specials',{});ov[admMonth]=d;store.set('specials',ov)},
   extraButtons:(br)=>{const show2=document.createElement('button');show2.type='button';show2.className='btn';const on=store.get('previewMonth',null)===admMonth;
     show2.textContent=on?'Stop previewing in the app':'Show this month in the app';show2.onclick=()=>{store.set('previewMonth',on?null:admMonth);toast(on?'Back to the real month.':'The Crew tab now shows '+MONTHS[admMonth-1]+'. Only you see this.');renderAdmin()};
     const rs=document.createElement('button');rs.type='button';rs.className='btn ghost';rs.textContent='Reset to default';rs.onclick=()=>{const ov=store.get('specials',{});delete ov[admMonth];store.set('specials',ov);renderAdmin();toast('Reset.')};
     br.append(show2,rs)}})}
 if(admTab==='sponsor'){const data=JSON.parse(JSON.stringify(sponsorData()));
  pizzaEditor($('#adm-sponsor'),data,{sponsor:true,activeLabel:'Show the sponsored pizza this month',
   extraTop:(card,d,redraw)=>{const sn=inp('admSponsor',d.sponsor,40);sn.addEventListener('input',()=>{d.sponsor=sn.value;d.sample=false});card.appendChild(fld('Sponsor name',sn));
    const up=document.createElement('div');up.className='upload';const th=document.createElement('span');th.className='thumb';const setTh=()=>{th.innerHTML='';if(d.logo){const i=document.createElement('img');i.src=d.logo;i.alt='';th.appendChild(i)}else th.textContent='None'};setTh();
    const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.id='admLogo';const lb=document.createElement('label');lb.className='btn small';lb.htmlFor='admLogo';lb.textContent='Upload sponsor logo';
    fi.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const sc=Math.min(1,240/Math.max(img.width,img.height));const c2=document.createElement('canvas');c2.width=img.width*sc;c2.height=img.height*sc;c2.getContext('2d').drawImage(img,0,0,c2.width,c2.height);d.logo=c2.toDataURL('image/png');setTh()};img.src=fr.result};fr.readAsDataURL(f)});
    up.append(th,lb,fi);card.appendChild(fld('Sponsor logo',up));
    const of=inp('admOffer',d.offer,60);of.addEventListener('input',()=>d.offer=of.value);const cd=inp('admCode',d.code,20);cd.addEventListener('input',()=>d.code=cd.value);
    const lk=inp('admLink',d.link,200);lk.addEventListener('input',()=>d.link=lk.value);
    const t2=document.createElement('div');t2.className='two';t2.append(fld('Offer for recipients',of),fld('Coupon code',cd));card.appendChild(t2);card.appendChild(fld('Order link',lk))},
   save:(d)=>store.set('sponsor',d)})}
 if(admTab==='news'){const host=$('#adm-news');host.innerHTML='';const card=document.createElement('div');card.className='card adm-grid';host.appendChild(card);
  const h=document.createElement('h3');h.textContent='Post an update';card.appendChild(h);
  const dt=inp('nwDate',new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),20),tt=inp('nwTitle','',60);
  const tx=document.createElement('textarea');tx.id='nwText';tx.maxLength=240;
  const dm=sel('nwDemo',[['none','No demo'],['confetti','Burst a confetti'],['unbox','Play the unboxing'],['specialPreview','Show the Pizza of the Month'],['spell','Spell with toppings'],['cheese','Mix cheeses'],['vegan','Vegan dough step']],'none');
  const dk=sel('nwConf',CONFETTI.filter(c=>c[0]!=='none'),'classic');const dkf=fld('Which confetti',dk);dkf.hidden=true;dm.addEventListener('change',()=>dkf.hidden=dm.value!=='confetti');
  const bl=inp('nwLabel','Try it',24);
  const t2=document.createElement('div');t2.className='two';t2.append(fld('Date',dt),fld('Button label',bl));
  card.append(fld('Title',tt),fld('What it says',tx),t2,fld('Try it demo',dm),dkf);
  const post=document.createElement('button');post.type='button';post.className='btn primary';post.textContent='Post update';
  post.onclick=()=>{if(!tt.value.trim()){tt.focus();toast('Add a title.');return}
   const demo=dm.value==='none'?null:(dm.value==='confetti'?{type:'confetti',value:dk.value}:dm.value==='spell'?{type:'spell',value:'HELLO'}:{type:dm.value});
   const list=store.get('news',[]);list.unshift({id:'n'+Date.now(),date:dt.value,title:tt.value.trim(),text:tx.value.trim(),demo,label:bl.value||'Try it'});store.set('news',list);toast('Posted to What\'s new.');renderAdmin()};
  card.appendChild(post);
  const list=store.get('news',[]);if(list.length){const h2=document.createElement('h3');h2.textContent='Your posts';const ul=document.createElement('ul');ul.className='adm-list';
   list.forEach((n,ix)=>{const li=document.createElement('li');const sp=document.createElement('span');sp.textContent=n.date+' · '+n.title;const del=document.createElement('button');del.type='button';del.className='btn small ghost';del.textContent='Delete';
    del.onclick=()=>{const l=store.get('news',[]);l.splice(ix,1);store.set('news',l);renderAdmin()};li.append(sp,del);ul.appendChild(li)});
   const c2=document.createElement('div');c2.className='card adm-grid';c2.append(h2,ul);host.appendChild(c2)}}}

/* ---------- pizzeria classics ---------- */
const PREMADES=[
 {id:'marg',name:'Margherita',desc:'Classic red, mozzarella, fresh basil.',sauce:'red',cheese:[['mozz',40]],tops:[['basil',9]]},
 {id:'pep',name:'Classic Pepperoni',desc:'Red sauce, mozzarella, lots of pepperoni.',sauce:'red',cheese:[['mozz',45]],tops:[['pepperoni',16]]},
 {id:'supreme',name:'Supreme',desc:'Pepperoni, peppers, olives, and mushrooms.',sauce:'red',cheese:[['mozz',40]],tops:[['pepperoni',9],['pepper',7],['olive',9],['mushroom',7]]},
 {id:'veggie',name:'Garden Veggie',desc:'Peppers, mushrooms, olives, and basil.',sauce:'red',cheese:[['mozz',40]],tops:[['pepper',8],['mushroom',8],['olive',8],['basil',6]]},
 {id:'hawaii',name:'Hawaiian-ish',desc:'Pineapple and pepperoni. Gerald has opinions.',sauce:'red',cheese:[['mozz',40]],tops:[['pineapple',12],['pepperoni',8]]},
 {id:'bbq',name:'BBQ Ranch Hand',desc:'BBQ sauce, cheddar, peppers, and mushrooms.',sauce:'bbq',cheese:[['cheddar',40]],tops:[['pepper',8],['mushroom',7]]},
 {id:'white',name:'White Pizza',desc:'Garlic white with mozzarella, parmesan, goat cheese, and basil.',sauce:'white',cheese:[['mozz',25],['parm',30],['goat',8]],tops:[['basil',7]]},
 {id:'four',name:'Four Cheese',desc:'Mozzarella, cheddar, parmesan, and goat cheese.',sauce:'red',cheese:[['mozz',20],['cheddar',15],['parm',25],['goat',6]],tops:[]},
 {id:'pesto',name:'Pesto Garden',desc:'Pesto, mozzarella, mushrooms, and peppers.',sauce:'pesto',cheese:[['mozz',35]],tops:[['mushroom',7],['pepper',7]]},
 {id:'vegan',name:'Vegan Garden',desc:'Vegan dough and cheese, plant pepperoni, and veggies.',vegan:true,sauce:'red',cheese:[['vmozz',40]],tops:[['pepperoni',8],['pepper',7],['mushroom',6],['basil',5]]}];
function premadePizza(pm){const p=newPizza();p.size=.92;p.tosses=TOSSES;p.vegan=!!pm.vegan;p.sauce=pm.sauce;p.sauceDabs=[];
 for(let r=0;r<=.84;r+=.1){const n=Math.max(1,Math.round(r*28));for(let i=0;i<n;i++){const a=i/n*6.283+r*3;p.sauceDabs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,r:.15,k:pm.sauce})}}
 const rr=rng(pm.id.length*3.1+pm.tops.length);p.cheeseDabs=[];
 pm.cheese.forEach(([k,n])=>{for(let i=0;i<n;i++){const a=rr()*6.283,d=Math.sqrt(rr())*.78;p.cheeseDabs.push({x:Math.cos(a)*d,y:Math.sin(a)*d,k,s:rr()*9,r:.6+rr()*.5})}});
 p.cheese=pm.cheese[0]?pm.cheese[0][0]:null;
 pm.tops.forEach(([k,n])=>{for(let i=0;i<n;i++){const a=rr()*6.283,d=.1+Math.sqrt(rr())*.66;p.toppings.push({k,x:Math.cos(a)*d,y:Math.sin(a)*d,rot:rr()*6.283})}});
 p.name=pm.name;return p}
function renderPremades(){const g=$('#premades');if(g.childElementCount&&g.dataset.plan===String(isPro()))return;g.innerHTML='';g.dataset.plan=String(isPro());
 PREMADES.forEach(pm=>{const b=document.createElement('button');b.type='button';b.className='pm';const lockPm=!isPro()&&!FREE_PREMADES.includes(pm.id);const c=document.createElement('canvas');c.width=64;c.height=64;c.setAttribute('aria-hidden','true');
  const t=document.createElement('span');t.innerHTML='<b>'+esc(pm.name)+'</b>'+esc(pm.desc);b.append(c,t);b.onclick=()=>usePremade(pm);if(lockPm){b.classList.add('locked');const pt=document.createElement('span');pt.className='pro';pt.textContent='Pro';t.appendChild(pt);b.setAttribute('aria-label',pm.name+', Pro');b.onclick=()=>upgrade('premade')}g.appendChild(b);drawPizza(c,premadePizza(pm),56)})}
function usePremade(pm){pizza=premadePizza(pm);$('#premadeBox').open=false;step=2;saidStep=2;renderStep();window.scrollTo({top:0,behavior:'smooth'});
 gSay(pm.id==='hawaii'?'Pineapple. I will not start this debate today. Add your own touch, then bake it.':'A '+pm.name+'. Solid choice. Now add your own touch.');
 toast(pm.name+' is ready. Add toppings or a message, then bake it.')}

/* ---------- animation loop ---------- */
let raf=0;
function kick(){if(!raf)raf=requestAnimationFrame(frame)}
function frame(now){raf=0;if(baking)bakeTick(now);
 if(!views.make.hidden&&step<=3)drawPizza(cv,pizza,0,now);
 const active=baking||(pizza._slap&&now-pizza._slap<760)||(pizza._sauceAt&&now-pizza._sauceAt<600)||(pizza._signAt&&now-pizza._signAt<2400)||pizza.toppings.some(t=>t.born&&now-t.born<340);
 if(active)kick()}
window.addEventListener('resize',kick);
document.fonts&&document.fonts.ready.then(kick);

if(account)renderToday();else startFresh(null);
/* ---------- plans: locks and upgrade ---------- */
['#logoFile','#logoFile2','#logoFile3'].forEach(x=>$(x).addEventListener('click',e=>{if(!isPro()){e.preventDefault();upgrade('logo')}}));
['#brand1','#brand2'].forEach((x,ix)=>{$(x).addEventListener('click',e=>{if(!isPro()){e.preventDefault();upgrade('brand')}});
 $(x).addEventListener('input',e=>{profile[ix?'brand2':'brand1']=e.target.value;saveProfile()});$(x).addEventListener('change',()=>burst('brand'))});
['#pLinkLabel','#pLink'].forEach(x=>$(x).addEventListener('focus',e=>{if(!isPro()){e.target.blur();upgrade('button')}}));
$('#goPro').onclick=()=>upgrade('general');$('#upLater').onclick=closeUp;$('#upMonthly').onclick=()=>goPro('month');$('#upYearly').onclick=()=>goPro('year');
$('#upSheet').addEventListener('click',e=>{if(e.target.id==='upSheet')closeUp()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#upSheet').hidden)closeUp()});
refreshPlan(true);

/* ===== Slice of Thanks live layer v0.7.0 =====
   Inserted at the end of the prototype's main scope by tools/build_app.py.
   Connects the approved prototype screens to Supabase: session, plan, credits, profile, logo, terms, address, consent, real sends and BD checkout. */
const LIVE = (function () {
  const host = SOTR.host;
  const API = host.getAttribute('data-api') || 'https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api';
  const TOKEN = host.getAttribute('data-token') || '';
  const SIGNUP = host.getAttribute('data-signup-url') || '/join';
  /* BD's login page sends the member back to loc after logging in */
  const LOGIN = (host.getAttribute('data-login-url') || '/login') + '?loc=' + encodeURIComponent(location.pathname || '/kitchen');
  const UPGRADE = host.getAttribute('data-upgrade-url') || '/join';
  const ATTR_URL = { special_delivery: 'data-special-url', pack_100: 'data-pack100-url', pack_500: 'data-pack500-url', pack_1000: 'data-pack1000-url' };
  const SITE = 'https://www.sliceofthanks.app';
  let session = null;

  async function call(path, body) {
    const opt = { method: body ? 'POST' : 'GET', headers: { 'x-sot-auth': TOKEN } };
    if (body) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const r = await fetch(API + path, opt);
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) j.code = 'not_signed_in';
    return j;
  }
  /* BD Digital Product checkout link: set on the SOT-App widget, or in Supabase app_settings checkout_urls */
  function checkoutUrl(key) { return host.getAttribute(ATTR_URL[key] || '') || (session && session.checkout && session.checkout[key]) || ''; }
  return { API, TOKEN, SIGNUP, LOGIN, UPGRADE, SITE, call, checkoutUrl, get session() { return session; }, set session(s) { session = s; } };
})();

/* --- Remove prototype-only sample data and controls --- */
meetings = [];
contacts.length = 0;
['name', 'business', 'link', 'note', 'sign'].forEach(k => { if (!store.get('profile', null)) profile[k] = ''; });
profile.linkLabel = profile.linkLabel || 'Book a follow-up';
(function hideProtoBits() {
  const rg = $('#resetGuest'); if (rg) { const c = rg.closest('.card'); if (c) c.hidden = true; }
  const ac = $('#adminCard'); if (ac) ac.hidden = true;
  SOTR.querySelectorAll('.signboard .tag').forEach(t => { t.hidden = true; });
  SOTR.querySelectorAll('p.muted').forEach(p => { if (p.textContent.indexOf('The link is a sample') === 0) p.hidden = true; });
})();

/* --- Real sign in only: the prototype's demo sign in goes to the BD login page --- */
store.set('account', null);
$('#gateSignin').onclick = () => {
  store.set('draft', { pizza: cleanPizza(pizza), box: JSON.parse(JSON.stringify(box)), at: Date.now() });
  location.href = LIVE.LOGIN;
};

/* --- Email only for now (text messages are built in but switched off) --- */
const _renderSend = renderSend;
renderSend = function () {
  box.method = 'email';
  _renderSend();
  const gb = $('#guestBox'); if (gb) gb.hidden = true;
  if (!account && !editingSignature) $('#sendNow').textContent = 'Send pizza';
  const mc = $('#methodChips'); if (mc) { const f = mc.closest('.field'); if (f) f.hidden = true; }
  const lab = SOTR.querySelector('label[for="toContact"]'); if (lab) lab.textContent = 'Their email';
  liveSendExtras();
};

/* Country and permission fields on the Send step, in People and on CSV lists */
const COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['MX', 'Mexico'], ['ES', 'Spain'], ['DE', 'Germany'], ['FR', 'France'], ['IE', 'Ireland'], ['NL', 'Netherlands'], ['OTHER', 'Another country']];
const BASIS_OPTIONS = '<option value="one_to_one">We just met and this is a one-to-one thank-you</option>' +
  '<option value="relationship">We have a current business relationship</option>' +
  '<option value="permission">They gave me permission to send them messages</option>';
function countryOptions(sel, value) {
  COUNTRIES.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
  sel.value = COUNTRIES.some(x => x[0] === value) ? value : 'US';
}
function liveSendExtras() {
  if ($('#liveCountry')) return;
  const sf = $('#sendFields'); if (!sf) return;
  const wrap = document.createElement('div'); wrap.className = 'two';
  const c = document.createElement('div'); c.className = 'field';
  c.innerHTML = '<label for="liveCountry">Their country</label><select id="liveCountry"></select>';
  countryOptions(c.querySelector('select'), store.get('lastCountry', 'US'));
  const b = document.createElement('div'); b.className = 'field';
  b.innerHTML = '<label for="liveBasis">How you know them</label><select id="liveBasis">' + BASIS_OPTIONS + '</select>';
  wrap.append(c, b);
  const lang = document.createElement('div'); lang.className = 'field';
  lang.innerHTML = '<label for="liveLang">Their language</label><select id="liveLang"><option value="en">English</option><option value="es">Español</option></select>';
  sf.insertBefore(wrap, sf.children[1] || null);
  sf.insertBefore(lang, wrap.nextSibling);
}

/* --- A small sheet for terms, address and other prompts --- */
function liveSheet(title, bodyEl, actions) {
  let back = $('#liveSheet');
  if (!back) { back = document.createElement('div'); back.id = 'liveSheet'; back.className = 'sheet-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); SOTR.querySelector('.wrap').appendChild(back); }
  back.innerHTML = '';
  const sh = document.createElement('div'); sh.className = 'sheet';
  const h = document.createElement('h2'); h.textContent = title; sh.appendChild(h);
  if (bodyEl) sh.appendChild(bodyEl);
  const row = document.createElement('div'); row.className = 'btn-row';
  actions.forEach(a => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn' + (a.primary ? ' primary' : ''); btn.textContent = a.label; btn.onclick = a.run; row.appendChild(btn); });
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn ghost'; cancel.textContent = 'Cancel'; cancel.onclick = () => { back.hidden = true; };
  row.appendChild(cancel); sh.appendChild(row); back.appendChild(sh); back.hidden = false;
  return back;
}
function closeLiveSheet() { const b = $('#liveSheet'); if (b) b.hidden = true; }

function askTerms(then) {
  const upd = !!(LIVE.session && LIVE.session.terms_updated);
  const a = (path, label) => '<a href="' + LIVE.SITE + path + '" target="_blank" rel="noopener">' + label + '</a>';
  const p = document.createElement('div');
  p.innerHTML = (upd ? '<p class="muted" style="margin:0 0 10px">We updated our legal documents. Please review and agree to keep sending.</p>' : '') +
    '<label class="check" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="liveTermsBox"> <span>I agree to the ' +
    a('/terms', 'Terms of Service') + ', ' + a('/privacy', 'Privacy Policy') + ', ' + a('/acceptable-use', 'Acceptable Use Policy') + ' and ' + a('/dpa', 'Data Processing Agreement') +
    '. I will only send pizzas to people I have permission to contact.</span></label>';
  liveSheet(upd ? 'We updated our terms' : 'One quick thing', p, [{ label: 'Agree and continue', primary: true, run: async () => {
    if (!$('#liveTermsBox').checked) { toast('Check the box to continue.'); return; }
    const r = await LIVE.call('/terms/accept', {});
    if (!r || !r.ok) { toast(MSG.server_error); return; }
    if (LIVE.session) { LIVE.session.needs_terms = false; LIVE.session.terms_updated = false; }
    closeLiveSheet(); then();
  } }]);
}
function askAddress(then) {
  const p = document.createElement('div');
  p.innerHTML = '<p class="muted">Anti-spam laws require your business mailing address in every email. A PO box or virtual mailbox works. It shows in small print at the bottom of the email.</p><div class="field"><label for="liveAddr">Business mailing address</label><textarea id="liveAddr" maxlength="300" rows="3"></textarea></div>';
  liveSheet('Add your mailing address', p, [{ label: 'Save and continue', primary: true, run: async () => {
    const v = $('#liveAddr').value.trim(); if (v.length < 8) { toast('Add your full mailing address.'); return; }
    await LIVE.call('/profile', { profile: { mailing_address: v } }); if (LIVE.session) LIVE.session.profile.mailing_address = v; closeLiveSheet(); then();
  } }]);
}

/* --- Plan, credits and upgrade --- */
function applySession(s) {
  LIVE.session = s;
  account = { name: s.profile.display_name || 'You', email: '' };
  viewAs = s.plan === 'free' ? 'free' : 'pro';
  const pr = s.profile;
  if (pr.display_name) profile.name = pr.display_name;
  if (pr.business_name) profile.business = pr.business_name;
  if (pr.logo_url) profile.logo = pr.logo_url;
  if (pr.brand_color_1) profile.brand1 = pr.brand_color_1;
  if (pr.brand_color_2) profile.brand2 = pr.brand_color_2;
  if (!profile.sign && pr.display_name) profile.sign = 'Warmly, ' + first(pr.display_name);
  /* Gerald's intro shows once per member, on every device: the account remembers it */
  const prefs = s.prefs || {};
  if (prefs.met_gerald) store.set('metGerald', true);
  else if (store.get('metGerald', false)) LIVE.call('/profile', { profile: { prefs: { met_gerald: true } } });
  refreshPlan(true);
}
const _renderPlanCard = renderPlanCard;
renderPlanCard = function () {
  _renderPlanCard();
  const s = LIVE.session; const el = $('#planCard'); if (!s || !el) return;
  const names = { free: 'A Slice', pro: 'The Whole Pie', team: 'Pizza Party' };
  const h = el.querySelector('h2'); if (h) h.textContent = 'Your plan: ' + (names[s.plan] || s.plan);
  const c = s.credits || {}; const p = el.querySelector('p.muted');
  if (p) p.textContent = 'Emails left this month: ' + (c.monthly || 0) + (c.pack ? ' plus ' + c.pack + ' from email packs' : '') + (c.special_delivery ? '. Special Deliveries: ' + c.special_delivery : '') + '.';
  const bar = el.querySelector('.usage'); if (bar) bar.hidden = true;
  if (p && c.pack && s.pack_next_expiry) p.textContent += ' Pack emails are used after your monthly ones and last 12 months from purchase.';
  const row = el.querySelector('.btn-row');
  if (row && s.plan !== 'free' && !$('#planPacks')) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.id = 'planPacks'; b.textContent = 'Buy more emails'; b.onclick = openPacks;
    row.insertBefore(b, row.firstChild);
  }
};

/* --- Email packs: Pro and Team only. Bought as BD Digital Products, credited by Supabase. --- */
function goCheckout(key, url) {
  const c = (LIVE.session && LIVE.session.credits) || {};
  store.set('checkoutPending', { key, at: Date.now(), pack: c.pack || 0, special: c.special_delivery || 0 });
  location.href = url;
}
function openPacks() {
  closeUp();
  const packs = (LIVE.session && LIVE.session.packs) || [];
  const p = document.createElement('div');
  p.innerHTML = '<p class="muted" style="margin:0 0 12px">Out of monthly emails or sending a big batch? Packs are used after your monthly emails, last 12 months, and can be refunded within 14 days if you have not used them.</p>';
  liveSheet('Buy more emails', p, packs.map((k, i) => ({
    label: Number(k.emails).toLocaleString('en-US') + ' emails, $' + (k.price_cents / 100).toFixed(0), primary: i === 0,
    run: () => { const u = LIVE.checkoutUrl(k.key); if (!u) { toast('Email packs open soon.'); return; } goCheckout(k.key, u); }
  })));
}

/* Back from checkout: ask Supabase to check BD for the payment, a few times while BD finishes */
let wantSpecial = false;
let checkTries = 0;
async function checkPurchases() {
  const pend = store.get('checkoutPending', null);
  if (!pend || !LIVE.session) return;
  if (Date.now() - (pend.at || 0) > 2 * 3600e3) { store.set('checkoutPending', null); return; }
  const s = await LIVE.call('/purchases/check', {});
  if (!s || !s.member_id) return;
  const c = s.credits || {};
  const gotPack = (c.pack || 0) > (pend.pack || 0);
  const gotSpecial = (c.special_delivery || 0) > (pend.special || 0);
  LIVE.session = s; renderPlanCard();
  if (gotPack || gotSpecial) {
    store.set('checkoutPending', null); checkTries = 0;
    if (gotSpecial && (wantSpecial || pend.key === 'special_delivery') && !specialOn) { wantSpecial = false; startSpecial(true); toast('Payment received. Special Delivery is on for this pizza.'); }
    else toast(gotPack ? 'Payment received. ' + ((c.pack || 0) - (pend.pack || 0)).toLocaleString('en-US') + ' more emails are ready.' : 'Payment received. Your Special Delivery is ready.');
    burst('gold');
    return;
  }
  if (++checkTries < 6) setTimeout(checkPurchases, 6000);
  else { checkTries = 0; toast('We have not seen the payment yet. It will show up here as soon as it clears.'); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && checkTries === 0) checkPurchases(); });
/* Logged-in members change plans on BD's upgrade page, so they keep one account */
goPro = function () { closeUp(); location.href = bdLink('change_plan', '/account/upgrade'); };

/* --- Special Delivery: $2.99 one time, A Slice only. Unlocks Pro features for one pizza and includes its send. --- */
let specialOn = false;
function planView() { return LIVE.session && LIVE.session.plan !== 'free' ? 'pro' : 'free'; }
function startSpecial(quiet) {
  specialOn = true; viewAs = 'pro'; refreshPlan();
  if (!quiet) toast('Special Delivery is on. Pro features are unlocked for this pizza.');
}
function endSpecial() { if (!specialOn) return; specialOn = false; viewAs = planView(); refreshPlan(); }
function offerSpecial() {
  closeUp();
  if (!account) { $('#sendNow').onclick(); return; }
  const have = (LIVE.session && LIVE.session.credits && LIVE.session.credits.special_delivery) || 0;
  if (have > 0) { startSpecial(); return; }
  const p = document.createElement('p'); p.className = 'muted';
  p.textContent = 'For a one-time $2.99, this pizza gets everything in The Whole Pie: your logo, brand colors, all box styles, Pro confetti and toppings, a gift code, and your own button. The send is included, so it does not use one of your 10 monthly emails.';
  liveSheet('Special Delivery', p, [
    { label: 'Get Special Delivery for $2.99', primary: true, run: () => {
      const u = LIVE.checkoutUrl('special_delivery');
      if (!u) { toast('Special Delivery checkout opens soon.'); return; }
      store.set('draft', { pizza: cleanPizza(pizza), box: JSON.parse(JSON.stringify(box)), at: Date.now(), special: true });
      goCheckout('special_delivery', u);
    } },
    { label: 'Not now', run: closeLiveSheet }
  ]);
}
$('#upYearly').onclick = offerSpecial;
const _upgrade = upgrade;
upgrade = function (key) {
  _upgrade(key);
  const free = !LIVE.session || LIVE.session.plan === 'free';
  $('#upYearly').hidden = !free;
  $('#upNote').textContent = free
    ? 'The Whole Pie is $9 a month or $90 a year after the trial, with 250 emails a month. Cancel anytime. Special Delivery is a one-time $2.99 that unlocks these features for one pizza and includes its send.'
    : 'The Whole Pie is $9 a month or $90 a year, with 250 emails a month. Cancel anytime.';
};
const _renderPlanCard2 = renderPlanCard;
renderPlanCard = function () {
  _renderPlanCard2();
  const t = $('#planTeam'); if (t) t.onclick = openPlans;
  const b = $('#planBilling'); if (b) b.onclick = () => { const c = $('#liveBilling'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
};

/* --- Billing inside the app: plan, payment history, change plan. Card details stay on BD's secure page. --- */
let billing = null; let billingAt = 0;
const PLAN_NAMES = { free: 'A Slice', pro: 'The Whole Pie', team: 'Pizza Party' };
function money(c) { return '$' + (c / 100).toFixed(2); }
function shortDate(iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
function bdLink(k, fallback) { return (billing && billing.links && billing.links[k]) || fallback; }
function billingCard() {
  let c = $('#liveBilling');
  if (!c) {
    const plan = $('#planCard'); if (!plan) return null;
    c = document.createElement('div'); c.className = 'card'; c.id = 'liveBilling';
    plan.after(c);
  }
  return c;
}
function renderBilling() {
  const c = billingCard(); const s = LIVE.session; if (!c || !s) return;
  c.innerHTML = '';
  const h = document.createElement('h2'); h.textContent = 'Billing'; c.appendChild(h);
  const lead = document.createElement('p'); lead.className = 'muted'; lead.style.margin = '4px 0 10px';
  lead.textContent = 'Your plan: ' + (PLAN_NAMES[s.plan] || s.plan) + '. Payments are handled securely by our checkout; we never see your card number.';
  c.appendChild(lead);
  const list = document.createElement('ul'); list.className = 'feed'; list.id = 'liveInvoices';
  if (!billing) { const li = document.createElement('li'); li.innerHTML = '<span class="muted">Loading your payment history...</span>'; list.appendChild(li); }
  else if (!billing.invoices || !billing.invoices.length) { const li = document.createElement('li'); li.innerHTML = '<span class="muted">No payments yet.</span>'; list.appendChild(li); }
  else billing.invoices.slice(0, 12).forEach(inv => {
    const li = document.createElement('li');
    const st = (inv.status || '').toLowerCase();
    const row = document.createElement('div'); row.className = 'row-h';
    const d = document.createElement('span'); d.className = 'feed-date'; d.textContent = shortDate(inv.date) + ' · Invoice ' + inv.number;
    const pill = document.createElement('span'); pill.className = 'pill' + (st === 'paid' ? ' ok' : st === 'unpaid' ? ' wait' : ''); pill.textContent = inv.status || '';
    row.append(d, pill);
    const what = document.createElement('b'); what.textContent = (inv.items || []).map(i => i.description).filter(Boolean).join(', ') || 'Payment';
    const amt = document.createElement('span'); amt.textContent = money(inv.totalCents) + (inv.paidAt ? ' · paid ' + shortDate(inv.paidAt) : '');
    li.append(row, what, amt); list.appendChild(li);
  });
  c.appendChild(list);
  const btns = document.createElement('div'); btns.className = 'btn-row';
  const cp = document.createElement('button'); cp.type = 'button'; cp.className = 'btn small primary'; cp.textContent = 'Change plan'; cp.onclick = openPlans;
  const card = document.createElement('button'); card.type = 'button'; card.className = 'btn small'; card.textContent = 'Update card or billing address';
  card.onclick = () => { location.href = bdLink('billing', '/account/billing'); };
  btns.append(cp, card);
  if (s.plan !== 'free') { const pk = document.createElement('button'); pk.type = 'button'; pk.className = 'btn small'; pk.textContent = 'Buy more emails'; pk.onclick = openPacks; btns.appendChild(pk); }
  c.appendChild(btns);
}
async function loadBilling(force) {
  if (!LIVE.session) return;
  if (!force && billing && Date.now() - billingAt < 60000) { renderBilling(); return; }
  renderBilling();
  const r = await LIVE.call('/billing');
  billing = r && r.ok ? r : { invoices: [], links: {} }; billingAt = Date.now();
  renderBilling();
}
/* Plan picker: the three plans, each to BD's checkout for that plan */
function openPlans() {
  closeUp();
  const s = LIVE.session; const cur = s ? s.plan : 'free';
  const plans = [
    ['free', 'A Slice', 'Free. 10 emails a month, Kraft and Classic boxes.', 'checkout_free', '/checkout/10'],
    ['pro', 'The Whole Pie', '$9 a month or $90 a year. 250 emails a month, your logo, gift codes and your own button. 14-day free trial.', 'checkout_pro', '/checkout/12'],
    ['team', 'Pizza Party', '$29 a month or $290 a year. 3 seats and 1,000 shared emails a month. 14-day free trial.', 'checkout_team', '/checkout/11']
  ];
  const p = document.createElement('div');
  plans.forEach(([k, name, desc]) => {
    const d = document.createElement('div'); d.className = 'field';
    d.innerHTML = '<b>' + name + (k === cur ? ' (your plan)' : '') + '</b><br><span class="muted">' + desc + '</span>';
    p.appendChild(d);
  });
  const note = document.createElement('p'); note.className = 'muted'; note.style.fontSize = '.88rem';
  note.textContent = 'Next you pick the plan and confirm on our secure checkout. Your pizzas, contacts and settings stay the same.';
  p.appendChild(note);
  liveSheet('Change plan', p, [{ label: 'Continue to change plan', primary: true, run: () => { location.href = bdLink('change_plan', '/account/upgrade'); } }]);
}

/* --- Profile and logo save to Supabase --- */
let profTimer = 0;
const _saveProfile = saveProfile;
saveProfile = function () {
  _saveProfile();
  if (!LIVE.session) return;
  clearTimeout(profTimer);
  profTimer = setTimeout(() => LIVE.call('/profile', { profile: { display_name: profile.name, business_name: profile.business, brand_color_1: profile.brand1 || null, brand_color_2: profile.brand2 || null } }), 800);
};
const _handleLogo = handleLogo;
handleLogo = function (file) {
  _handleLogo(file);
  if (!LIVE.session || !file) return;
  setTimeout(async () => {
    if (!profile.logo || profile.logo.indexOf('data:image') !== 0) return;
    const r = await LIVE.call('/logo', { data_url: profile.logo });
    if (r.logo_url) { profile.logo = r.logo_url; _saveProfile(); }
  }, 600);
};

/* Mailing address and reply-to in Settings */
(function settingsExtras() {
  const pb = $('#pBiz'); if (!pb) return;
  const f = document.createElement('div'); f.className = 'field';
  f.innerHTML = '<label for="liveAddrS">Your business mailing address (optional)</label><textarea id="liveAddrS" maxlength="300" rows="2"></textarea><small class="muted">Leave it blank and your emails show the Slice of Thanks mailing address. Add yours to show it instead.</small>';
  const r = document.createElement('div'); r.className = 'field';
  r.innerHTML = '<label for="liveReply">Replies go to</label><input type="text" id="liveReply" maxlength="200" inputmode="email">';
  pb.closest('.field').after(f, r);
  /* Log out ends the BD session; BD's /logout page does it */
  if (LIVE.TOKEN) {
    const lo = document.createElement('div'); lo.className = 'btn-row';
    lo.innerHTML = '<button class="btn small" type="button" id="liveLogout">Log out</button>';
    r.after(lo);
    lo.querySelector('button').onclick = () => { store.set('draft', null); location.href = '/logout'; };
  }
  let t = 0;
  const save = () => { clearTimeout(t); t = setTimeout(() => LIVE.call('/profile', { profile: { mailing_address: $('#liveAddrS').value.trim(), reply_to: $('#liveReply').value.trim() } }), 800); };
  $('#liveAddrS').addEventListener('input', save); $('#liveReply').addEventListener('input', save);
})();
const _renderSettings = renderSettings;
renderSettings = function () {
  _renderSettings();
  const s = LIVE.session; if (!s) return;
  loadBilling();
  if ($('#liveAddrS') && document.activeElement !== host) { $('#liveAddrS').value = s.profile.mailing_address || ''; $('#liveReply').value = s.profile.reply_to || ''; }
};

const _geraldOk = $('#geraldOk').onclick;
$('#geraldOk').onclick = function () {
  _geraldOk();
  if (LIVE.session) { LIVE.session.prefs = Object.assign({}, LIVE.session.prefs, { met_gerald: true }); LIVE.call('/profile', { profile: { prefs: { met_gerald: true } } }); }
};

/* --- Features not switched on yet --- */

/* --- Sending for real --- */
function cleanPizza(p) { const c = JSON.parse(JSON.stringify(p)); Object.keys(c).forEach(k => { if (k.charAt(0) === '_') delete c[k]; }); return c; }
function boxPayload(bx) {
  const rw = bx.reward || {};
  const b = { style: bx.style, sticker: bx.sticker, confetti: bx.confetti, tone: bx.tone, note: bx.note, sign: bx.sign, meeting: bx.meeting,
    pro_style: PRO_STYLES.includes(bx.style) || PRO_CONF.includes(bx.confetti) };
  if (isPro() && bx.link) { b.cta_label = bx.linkLabel || 'Book a follow-up'; b.cta_url = bx.link; }
  if (isPro() && rw.code) b.gift = { text: rw.text || '', code: rw.code, url: rw.link || '', expires: rw.exp || '' };
  if (isPro() && profile.logo) b.logo_url = profile.logo;
  return b;
}
function buildPayload() {
  const b = boxPayload(box);
  let img = '';
  try { img = pizzaImage(pizza, false); } catch (e) { img = ''; }
  return {
    idem: (pizza.seed + '-' + box.contact + '-' + (box.to || '')).slice(0, 90),
    pizza: cleanPizza(pizza), box: b,
    recipient: { name: box.to.trim(), email: box.contact.trim(), country: $('#liveCountry') ? $('#liveCountry').value.replace('OTHER', '') : '', locale: $('#liveLang') ? $('#liveLang').value : 'en' },
    consent: { basis: $('#liveBasis') ? $('#liveBasis').value : 'one_to_one', method: 'Selected in the Kitchen at send', note: box.meeting || '' },
    send_type: 'one_to_one', special_delivery: specialOn, image_data_url: img.length < 1900000 ? img : '',
    label: box.meeting ? 'After ' + box.meeting.toLowerCase() : 'Fresh pizza'
  };
}
const MSG = {
  bad_email: 'That email address does not look right.',
  suppressed: 'This person asked not to get pizzas, so we can not send to them.',
  sending_paused: 'Sending is paused for a few minutes. Try again soon.',
  account_inactive: 'Your account is not active. Contact support.',
  no_credits: 'You are out of emails for this month.',
  test_inbox_only: 'Test pizzas only go to your test inboxes.',
  not_signed_in: 'Your session timed out. Reload the page and sign in again.',
  server_error: 'Something went wrong on our side. Your pizza was not sent. Try again in a minute.'
};
async function liveSend() {
  if (!box.to.trim()) { $('#toName').focus(); toast('Add who the pizza is for.'); return; }
  if (!box.contact.trim() || box.contact.indexOf('@') < 1) { $('#toContact').focus(); toast('Add their email address.'); return; }
  if ($('#liveCountry')) store.set('lastCountry', $('#liveCountry').value);
  const btn = $('#sendNow'); btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending...';
  let r;
  try { r = await LIVE.call('/send', buildPayload()); } catch (e) { r = { code: 'server_error' }; }
  btn.disabled = false; btn.textContent = label;
  if (r.ok && r.delivered === false && r.reason === 'provider_error') {
    toast('Potato could not deliver this one, and it did not use an email. Try again in a few minutes.'); return;
  }
  if (r.ok) {
    logSend({ who: box.to, org: '', contact: box.contact, vegan: pizza.vegan }, pizza, box, box.meeting ? 'After ' + box.meeting.toLowerCase() : 'Fresh pizza');
    if (LIVE.session && r.bucket && LIVE.session.credits[r.bucket] !== undefined) LIVE.session.credits[r.bucket]--;
    toast(r.delivered === false && r.reason !== 'not_due' ? 'Saved. Delivery is retrying and should arrive shortly.' : 'Potato is on her way to ' + first(box.to) + '.');
    burst('pizza'); store.set('draft', null); endSpecial(); show('today'); loadPeople(); return;
  }
  sendProblem(r, liveSend);
}
/* What to tell the member when a send is refused; retry runs the same send again after a fix */
function sendProblem(r, retry) {
  if (r.code === 'needs_terms') return askTerms(retry);
  if (r.code === 'needs_address') return askAddress(retry);
  if (r.code === 'needs_upgrade') { const f = (r.features || [])[0]; upgrade({ cta_button: 'button', gift: 'reward', logo: 'logo', pro_styles: 'style', scheduling: 'general' }[f] || 'general'); return; }
  if (r.code === 'needs_permission') {
    const p = document.createElement('p'); p.className = 'muted';
    p.textContent = 'Their country (' + r.region + ') needs a different kind of permission for this pizza. Change "How you know them" to the option that is true for this person. If none is true, ask them in person or by phone first.';
    liveSheet('Permission needed', p, [{ label: 'Got it', primary: true, run: closeLiveSheet }]); return;
  }
  if (r.code === 'no_credits') {
    if (specialOn) { toast('Your Special Delivery was already used. Get another to send this pizza.'); offerSpecial(); return; }
    toast(MSG.no_credits);
    if (LIVE.session && LIVE.session.plan !== 'free') openPacks(); else upgrade('general');
    return;
  }
  toast(MSG[r.code] || MSG.server_error);
}

$('#sendNow').onclick = () => {
  if (!account) {
    store.set('draft', { pizza: cleanPizza(pizza), box: JSON.parse(JSON.stringify(box)), at: Date.now() });
    liveSheet('Create your free account to send', (() => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Your pizza is saved. Make a free account, sign in, and you will come right back to send it.'; return p; })(),
      [{ label: 'Create free account', primary: true, run: () => { location.href = bdLink('checkout_free', '/checkout/10'); } }, { label: 'I already have one', run: () => { location.href = LIVE.LOGIN; } }]);
    return;
  }
  liveSend();
};

/* --- People on real data: everyone the member has sent a pizza to, from Supabase --- */
function personFromServer(x) {
  return { id: x.id, name: x.name || x.email || 'No name', company: x.company || '', contact: x.email || '', vegan: !!x.vegan, notes: x.notes || '',
    country: x.country || '', hasConsent: !!x.has_consent,
    history: (x.history || []).filter(h => h.pizza).map(h => ({ date: shortDate(h.status === 'queued' && h.scheduled_for ? h.scheduled_for : h.at),
      label: h.status === 'queued' ? 'Scheduled' + (h.label ? ': ' + h.label : '') : (h.status === 'failed' ? 'Not delivered' : (h.label || 'Pizza')),
      pizza: h.pizza, box: h.box || {}, opened: !!h.opened, status: h.status })) };
}
async function loadPeople() {
  if (!account || !LIVE.TOKEN) return;
  const r = await LIVE.call('/people').catch(() => null);
  if (!r || !r.ok) return;
  contacts.length = 0;
  r.people.forEach(x => contacts.push(personFromServer(x)));
  if (!$('#view-people').hidden) renderPeople();
}
hintFor = function (c) {
  const l = c.history[0];
  if (!l) return 'No pizzas yet. Send a first one to start the conversation.';
  if (l.status === 'queued') return 'Your last pizza is scheduled and has not gone out yet.';
  if (l.status === 'failed') return 'Your last pizza could not be delivered. Check their email address and try again.';
  return l.opened ? 'They opened your last pizza. Good time for a follow-up pizza.' : 'Your last pizza has not been opened yet. Give it a few days before sending another.';
};
const _detailEl = detailEl;
detailEl = function (c) {
  const d = _detailEl(c);
  const q = sel => d.querySelector(sel);
  /* People added by hand have no permission on file yet: ask once, at their first pizza */
  if (!c.hasConsent) {
    const f = document.createElement('div'); f.className = 'two';
    f.innerHTML = '<div class="field"><label for="qsCountry">Their country</label><select id="qsCountry"></select></div>' +
      '<div class="field"><label for="qsBasis">How you know them</label><select id="qsBasis">' + BASIS_OPTIONS + '</select></div>';
    countryOptions(f.querySelector('#qsCountry'), c.country || store.get('lastCountry', 'US'));
    const row = q('#qsSend').closest('.btn-row'); row.parentNode.insertBefore(f, row);
  }
  q('#qsSend').onclick = () => peopleSend(c, q('#qsSend'));
  const notes = q('#pNotes'); let t = 0;
  notes.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => LIVE.call('/people/save', { person: { id: c.id, notes: notes.value } }), 800); });
  return d;
};
async function peopleSend(c, btn) {
  if (!c.contact || c.contact.indexOf('@') < 1) { toast('Add an email address for ' + first(c.name) + ' first.'); return; }
  const { p, b } = qsBuild(c);
  const consent = $('#qsBasis') ? { basis: $('#qsBasis').value, method: 'Selected in People at send' } : null;
  const country = $('#qsCountry') ? $('#qsCountry').value.replace('OTHER', '') : c.country;
  let img = ''; try { img = pizzaImage(p, false); } catch (e) { img = ''; }
  const label = btn.textContent; btn.disabled = true; btn.textContent = 'Sending...';
  let r;
  try {
    r = await LIVE.call('/send', { idem: 'people-' + c.id + '-' + Date.now(), source: 'people', pizza: cleanPizza(p), box: boxPayload(b),
      recipient: { name: c.name, email: c.contact, company: c.company, vegan: c.vegan, country, locale: 'en' }, consent, send_type: 'one_to_one',
      label: qs.topic ? 'Follow-up: ' + qs.topic : 'Follow-up pizza', image_data_url: img.length < 1900000 ? img : '' });
  } catch (e) { r = { code: 'server_error' }; }
  btn.disabled = false; btn.textContent = label;
  if (r.ok && r.delivered === false && r.reason === 'provider_error') { toast('Potato could not deliver this one, and it did not use an email. Try again in a few minutes.'); return; }
  if (r.ok) {
    if (LIVE.session && r.bucket && LIVE.session.credits[r.bucket] !== undefined) LIVE.session.credits[r.bucket]--;
    toast('Potato is on her way to ' + first(c.name) + '.'); burst('pizza'); resetQs(c); loadPeople(); return;
  }
  sendProblem(r, () => peopleSend(c, btn));
}
(function peopleForm() {
  const lab = SOTR.querySelector('label[for="npContact"]'); if (lab) lab.textContent = 'Email';
  $('#savePerson').onclick = async () => {
    const n = $('#npName').value.trim(), em = $('#npContact').value.trim();
    if (!n) { $('#npName').focus(); toast('Add a name first.'); return; }
    if (em.indexOf('@') < 1) { $('#npContact').focus(); toast('Add their email address.'); return; }
    const r = await LIVE.call('/people/save', { person: { name: n, email: em, company: $('#npCompany').value.trim(), vegan: $('#npVegan').checked } }).catch(() => null);
    if (!r || !r.ok) { toast(r && r.code === 'bad_email' ? MSG.bad_email : MSG.server_error); return; }
    ['#npName', '#npContact', '#npCompany'].forEach(sel => { $(sel).value = ''; }); $('#npVegan').checked = false; $('#addPerson').hidden = true;
    await loadPeople();
    const c = contacts.find(x => x.id === r.id); selContact = r.id; resetQs(c); renderPeople(); toast(n + ' added.');
  };
})();

/* --- Send to a list (CSV): Pro and Team. Rows go up 50 at a time; the send worker delivers them. --- */
(function bulkExtras() {
  const sample = $('#sampleCsv'); if (sample) sample.hidden = true; /* sample addresses are not real inboxes */
  const card = $('#csvFile') && $('#csvFile').closest('.card');
  if (card) {
    const help = card.querySelector('small.muted');
    if (help) help.textContent = 'Columns Slice of Thanks looks for: Name, Email, Company, Country (like US or CA), Permission (one_to_one, relationship or permission) and Vegan (yes or no). Extra columns are ignored. Up to 500 people per list.';
    const f = document.createElement('div'); f.className = 'two';
    f.innerHTML = '<div class="field"><label for="bulkCountry">Country for rows without one</label><select id="bulkCountry"></select></div>' +
      '<div class="field"><label for="bulkBasis">How you know them, for rows without a Permission column</label><select id="bulkBasis">' + BASIS_OPTIONS.replace('We just met and this is a one-to-one thank-you', 'We met one to one and this is a thank-you') + '</select></div>';
    countryOptions(f.querySelector('#bulkCountry'), store.get('lastCountry', 'US'));
    f.querySelector('#bulkBasis').value = 'relationship';
    card.insertBefore(f, $('#listSummary'));
  }
  SOTR.querySelectorAll('#view-bulk small.muted').forEach(sm => { if (sm.textContent.indexOf('Prototype only') === 0) sm.textContent = 'Each pizza uses one email from your plan. Up to 500 people per list. Potato delivers them over the next few minutes.'; });
  const d = $('#bulkDate');
  if (d) { d.type = 'datetime-local'; const t = new Date(Date.now() + 864e5); t.setHours(9, 0, 0, 0); d.value = new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }
  const ch = $('#copyHeader');
  if (ch) ch.onclick = () => { const hdr = 'Name,Email,Company,Country,Permission,Vegan'; try { navigator.clipboard.writeText(hdr).then(() => toast('Column headers copied. Paste them into row 1 of your spreadsheet.'), () => toast('Headers: ' + hdr)); } catch (e) { toast('Headers: ' + hdr); } };
})();
function prettyWhen(v) { const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
const _renderBulk = renderBulk;
renderBulk = function () {
  _renderBulk();
  const d = $('#bulkDate'), rv = $('#bulkReview');
  if (d && rv && d.value) rv.textContent = rv.textContent.replace(d.value, prettyWhen(d.value));
  const ls = $('#listSummary'); if (ls) ls.textContent = ls.textContent.replace('missing an email or phone', 'missing an email');
  SOTR.querySelectorAll('#listTable th').forEach(th => { if (th.textContent === 'Email or phone') th.textContent = 'Email'; });
};
const _loadList = loadList;
loadList = function (txt) {
  _loadList(txt);
  const data = parseCSV(txt); if (data.length < 2) return;
  const h = data[0].map(x => x.trim().toLowerCase());
  const iC = h.findIndex(x => x.includes('country')), iP = h.findIndex(x => x.includes('permission') || x.includes('consent') || x === 'basis');
  bulk.rows.forEach((r, i) => {
    const row = data[i + 1] || [];
    r.country = iC >= 0 ? (row[iC] || '').trim().toUpperCase().slice(0, 2) : '';
    const pv = iP >= 0 ? (row[iP] || '').trim().toLowerCase().split(' ').join('_').split('-').join('_') : '';
    r.basis = ['one_to_one', 'relationship', 'permission'].includes(pv) ? pv : '';
    r.ok = !!r.name && r.contact.indexOf('@') > 0 && r.contact.indexOf('.', r.contact.indexOf('@')) > 0;
  });
  if (bulk.rows.length > 500) { bulk.rows = bulk.rows.slice(0, 500); toast('Lists can have up to 500 people. The first 500 were loaded.'); }
  renderBulk();
};
$('#openBulk').onclick = () => { if (!isPro()) { upgrade('bulk'); return; } show('bulk'); };
$('#bulkSend').onclick = async () => {
  const good = bulk.rows.filter(r => r.ok); if (!good.length || bulk.sending) return;
  let when = null;
  if (bulk.when === 'later') {
    const v = $('#bulkDate').value, d = v ? new Date(v) : null;
    if (!d || isNaN(d) || d.getTime() < Date.now() + 60000) { toast('Pick a date and time in the future.'); return; }
    when = d.toISOString();
  }
  bulk.sending = true; $('#bulkSend').disabled = true; $('#bulkProgress').hidden = false; $('#bulkResult').hidden = true; $('#bulkBar').style.width = '4%';
  const batch = 'b' + Date.now().toString(36);
  const country = $('#bulkCountry').value.replace('OTHER', ''), basis = $('#bulkBasis').value;
  store.set('lastCountry', $('#bulkCountry').value);
  /* One picture for a signature pizza list. Vegan rows and Gerald's one-off pizzas go without a picture in the email. */
  let img = '';
  if (bulk.mode === 'signature') { try { img = pizzaImage(clonePizza(signature), false); } catch (e) { img = ''; } }
  const tally = { ok: 0 }; let stop = '';
  for (let i = 0; i < good.length && !stop; i += 50) {
    const rows = good.slice(i, i + 50).map((r, k) => ({ i: i + k, pizza: cleanPizza(bulkPizza(r)), box: boxPayload(bulkBox(r)),
      recipient: { name: r.name, email: r.contact, company: r.company, vegan: r.vegan, country: r.country || country, locale: 'en' },
      consent: { basis: r.basis || basis, method: 'CSV list upload' }, send_type: 'one_to_one', image: !!img && !r.vegan }));
    let res;
    try { res = await LIVE.call('/send/bulk', { batch, rows, scheduled_for: when, label: bulk.sticker + ' list', image_data_url: img.length < 1900000 ? img : '' }); } catch (e) { res = { code: 'server_error' }; }
    if (!res || !res.ok) { stop = (res && res.code) || 'server_error'; break; }
    res.results.forEach(x => { if (x.ok) tally.ok++; else tally[x.code] = (tally[x.code] || 0) + 1; });
    if (res.results.some(x => x.code === 'needs_terms')) stop = 'needs_terms';
    $('#bulkBar').style.width = Math.min(100, (i + 50) / good.length * 100) + '%';
  }
  bulk.sending = false; $('#bulkSend').disabled = false;
  const why = { no_credits: 'out of emails', needs_permission: 'need a different permission for their country', suppressed: 'asked not to get pizzas', bad_email: 'email does not look right', needs_upgrade: 'needs a Pro feature', test_inbox_only: 'not a test inbox', server_error: 'error on our side' };
  const skipped = Object.keys(tally).filter(k => k !== 'ok').map(k => tally[k] + ' ' + (why[k] || k)).join(', ');
  $('#bulkResult').hidden = false;
  $('#bulkResult').textContent = (when ? 'Scheduled ' : 'Sent ') + tally.ok + ' pizza' + (tally.ok === 1 ? '' : 's') +
    (when ? ' for ' + prettyWhen(when) : '. Potato delivers them over the next few minutes') + '.' + (skipped ? ' Skipped: ' + skipped + '.' : '');
  if (stop === 'needs_terms') askTerms(() => {}); else if (stop === 'needs_upgrade') upgrade('bulk'); else if (stop) toast(MSG[stop] || MSG.server_error);
  if (tally.ok) {
    burst('pizza'); toast(when ? 'Your list is scheduled.' : 'Your pizzas are in the oven.');
    const s = await LIVE.call('/session').catch(() => null); if (s && s.credits && LIVE.session) { LIVE.session.credits = s.credits; renderPlanCard(); }
    loadPeople();
  }
};

/* --- Start: sign in with the BD pass, restore a guest draft --- */
(async function liveStart() {
  if (!LIVE.TOKEN) { account = null; refreshPlan(true); return; }
  const s = await LIVE.call('/session');
  if (!s || !s.member_id) { account = null; refreshPlan(true); return; }
  applySession(s);
  loadPeople();
  if (s.needs_terms) setTimeout(() => askTerms(() => {}), 600);
  const d = store.get('draft', null);
  if (d && d.pizza && Date.now() - (d.at || 0) < 7 * 864e5) {
    pizza = d.pizza; box = Object.assign(boxFromProfile(null), d.box); store.set('draft', null);
    if (d.special && s.credits && s.credits.special_delivery > 0) startSpecial(true); else if (d.special) wantSpecial = true;
    step = 5; saidStep = 5; show('make'); renderStep(); toast(specialOn ? 'Special Delivery is on. Your pizza is ready to send.' : 'Welcome. Your pizza is ready to send.');
  } else { show('today'); }
  checkPurchases();
})();

/* --- Today without the sample calendar --- */
const _renderToday = renderToday;
renderToday = function () {
  _renderToday();
  const se = $('#simEnd'); if (se) se.hidden = true;
  SOTR.querySelectorAll('.tag').forEach(t => { if (t.textContent.trim() === 'Sample calendar') t.hidden = true; });
  const ul = $('#meetings');
  if (ul && !meetings.length) {
    ul.innerHTML = '';
    const li = document.createElement('li'); li.className = 'meeting'; li.style.gridTemplateColumns = '1fr';
    const pro = LIVE.session && LIVE.session.plan !== 'free';
    li.innerHTML = '<div class="info"><b>No meetings yet</b><span class="muted">Calendly and TidyCal connections arrive in the next update. Your meetings for the week will show here. ' +
      (pro ? 'You choose which meetings get a pizza, and it is ready when each one ends.' : 'Pick the meetings you want a pizza for. When each one ends, your signature pizza is made for that person and we email you that it is waiting to be sent. Set your signature pizza in Settings.') +
      ' Until then, use Make a new pizza above.</span></div>';
    ul.appendChild(li);
  }
};

/* Test hook, only when the widget sets data-debug */
if (host_isDebug()) { window.__SOT_DEBUG = { goSend() { pizza = P_demo(); step = 5; saidStep = 5; show('make'); renderStep(); } }; }
function host_isDebug() { return SOTR.host.hasAttribute('data-debug'); }
function P_demo() { const p = clonePizza(signature); p.baked = true; p.bake = 1; p.tosses = 3; return p; }

})();

})();
