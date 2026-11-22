"use strict";
const $=id=>document.getElementById(id);
const canvas=$("game"),ctx=canvas.getContext("2d");
const W=960,H=540,LEVEL=1800,KEY="nighttail.build01.save";
const paper="#eee7d7",ink="#17171c",red="#ba3848";
let mode="title",room=0,p,enemies=[],shots=[],sparks=[],cam=0,tick=0;
let deaths=0,elapsed=0,checkpoint=0,storageOK=true;
let shake=0,flash=0,messageTime=0;
const held=new Set(),pressed=new Set();
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const names=["Silent Causeway","Ashen Cloister","The Bell Chamber"];
const intros=[
"Rook: Mira's signal came from the keep. Keep moving right. Jump the broken bridge.",
"Sable's lantern: Weaken a guard with two blade hits, then steal with L. Reach the bell chamber.",
"Mira: The Warden guards the voice conduit. Watch its windup. Defeat it, then reach the right-hand door."
];
let save=null;
try{
 const raw=JSON.parse(localStorage.getItem(KEY)||"null");
 if(raw&&raw.version===1&&Number.isInteger(raw.room)&&raw.room>=0&&raw.room<3)
 save=raw;
}catch(e){storageOK=false}
function say(text,frames=300){
 $("notice").textContent=text;
 messageTime=frames;
}
function persist(){
 try{
  localStorage.setItem(KEY,JSON.stringify({version:1,room:checkpoint,
   deaths,elapsed:Math.floor(elapsed)}));
  save={version:1,room:checkpoint,deaths,elapsed};
 }catch(e){storageOK=false}
}
function platforms(){
 const a=[
 {x:0,y:480,w:540,h:60},
 {x:660,y:480,w:1140,h:60},
 {x:320,y:390,w:160,h:16},
 {x:650,y:320,w:160,h:16},
 {x:950,y:390,w:160,h:16},
 {x:1250,y:320,w:160,h:16}
 ];
 if(room===1){
  a.push({x:100,y:320,w:128,h:16},{x:1500,y:390,w:160,h:16});
 }
 if(room===2){
  a[0].w=1800;a.splice(1,1);
 }
 return a;
}
function makeEnemy(x,type="guard"){
 const boss=type==="boss";
 return {x,y:boss?404:438,w:boss?64:32,h:boss?76:42,
 hp:boss?70:6,max:boss?70:6,boss,type,dir:-1,
 cd:boss?100:60+(x%70),hit:0,attack:0,origin:x,phase:0};
}
function loadRoom(n){
 room=n;checkpoint=n;
 p={x:64,y:400,w:26,h:40,vx:0,vy:0,face:1,hp:10,
 ground:false,inv:60,dash:0,dashCD:0,blade:0,bladeCD:0,
 shotCD:0,ammo:0,jumpBuffer:0,coyote:0};
 enemies=room===2?[makeEnemy(1330,"boss")]:
 [makeEnemy(380),makeEnemy(860),makeEnemy(1160),makeEnemy(1500)];
 shots=[];sparks=[];cam=0;shake=0;flash=0;
 persist();say(intros[n],540);
}
function setMode(next){
 mode=next;held.clear();pressed.clear();
 $("overlay").hidden=next==="play";
 $("hud").hidden=next==="title"||next==="settings";
 $("pauseButton").disabled=next!=="play"&&next!=="pause";
 $("pauseButton").textContent=next==="pause"?"Resume":"Pause";
}
function button(text,fn,primary=false,disabled=false){
 const b=document.createElement("button");
 b.textContent=text;b.className=primary?"primary":"";
 b.disabled=disabled;b.onclick=fn;return b;
}
function screen(title,body,buttons,eyebrow="NIGHTTAIL / BUILD 01"){
 const panel=$("panel");panel.replaceChildren();
 const e=document.createElement("div");e.className="eyebrow";e.textContent=eyebrow;
 const h=document.createElement("h1");h.textContent=title;
 const para=document.createElement("p");para.textContent=body;
 const actions=document.createElement("div");actions.className="actions";
 for(const b of buttons)actions.append(b);
 panel.append(e,h,para,actions);
}
function start(resume=false){
 deaths=resume?(save?.deaths||0):0;
 elapsed=resume?(save?.elapsed||0):0;
 loadRoom(resume?save.room:0);setMode("play");
 canvas.focus({preventScroll:true});
}
function title(){
 setMode("title");
 screen("A voice inside the walls.",
 "Mira entered Vesper Keep to stop its stolen-voice engine. Her brother Rook follows. Cross the causeway, learn the blade, and silence the Bell Warden.",
 [button("Begin story",()=>start(false),true),
 button(save?"Continue checkpoint":"No checkpoint saved",()=>start(true),false,!save),
 button("Controls & settings",()=>settings("title"))]);
 say(storageOK?"Ready. Begin a new run or continue an area checkpoint.":
 "Ready. Browser storage is unavailable; checkpoints work for this session only.",999999);
}
function pause(){
 if(mode==="play"){
  setMode("pause");
  screen("Catch your breath.",
  "The keep will wait. Continue from this exact moment, or restart at the current area's entrance.",
  [button("Resume",resume,true),button("Settings",()=>settings("pause")),
   button("Restart area",()=>{loadRoom(checkpoint);setMode("play")}),
   button("Title",title)]);
 }else if(mode==="pause")resume();
}
function resume(){setMode("play");canvas.focus({preventScroll:true})}
function settings(back){
 setMode("settings");
 screen("Controls & settings",
 "Move: A/D or arrows. Jump: Space. Blade: J. Shoot: K. Steal: L. Dash: Shift. Pause: Escape. Guards have 6 health; a blade hit deals 2. At 2 health, approach and steal. Stolen weapons have eight shots.",
 [button("Back",()=>back==="title"?title():(setMode("play"),pause()),true)]);
 const label=document.createElement("label");
 label.style.display="block";label.style.marginTop="16px";
 const box=document.createElement("input");box.type="checkbox";box.checked=effects;
 box.onchange=()=>effects=box.checked;
 label.append(box,document.createTextNode(" Screen shake and hit flash"));
 $("panel").append(label);
}
let effects=!reduced;
function die(){
 deaths++;persist();setMode("dead");
 screen("The lantern still burns.",
 "No lives lost permanently. Retry from this area's entrance with full health. Guards and the boss reset.",
 [button("Retry area",()=>{loadRoom(checkpoint);setMode("play")},true),
 button("Return to title",title)]);
}
function finish(){
 persist();setMode("win");
 const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60).toString().padStart(2,"0");
 screen("The first bell falls silent.",
 `Mira's voice returns through the conduit: “Rook. I'm alive. Don't break the engine—not until the prisoners are free.” Beyond the chamber, three sealed wings awaken. Prototype complete · ${m}:${s} · ${deaths} defeats.`,
 [button("Play again",()=>start(false),true),button("Title",title)],
 "END OF PLAYABLE SLICE / STORY 1 CONTINUES");
 say("Slice complete. The rest of the one-hour campaign is planned, not implemented.",999999);
}
function overlap(a,b){
 return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}
function burst(x,y,count=8){
 if(!effects)return;
 for(let i=0;i<count;i++)sparks.push({x,y,vx:(Math.random()-.5)*6,
 vy:(Math.random()-.5)*6,life:18});
}
function hurt(n,from){
 if(p.inv>0||mode!=="play")return;
 p.hp-=n;p.inv=65;p.vx=p.x<from?-5:5;p.vy=-5;
 shake=effects?7:0;flash=effects?4:0;burst(p.x+13,p.y+20);
 if(p.hp<=0)die();
}
function damage(e,n){
 if(e.hp<=0||e.hit>0)return;
 e.hp-=n;e.hit=12;burst(e.x+e.w/2,e.y+e.h/2);
 if(e.hp<=0){
  if(e.boss){
   p.hp=Math.min(10,p.hp+4);
   say("Bell Warden defeated. Mira's signal is clear—reach the door at the far right.",600);
  }else{
   p.hp=Math.min(10,p.hp+1);
  }
 }
}
function fire(x,y,vx,vy,hostile=false){shots.push({x,y,w:hostile?12:16,h:hostile?12:6,vx,vy,hostile,life:120})}
const keymap={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',' ':'jump',ArrowUp:'jump',w:'jump',j:'slash',k:'shoot',l:'steal',Shift:'dash'};
function down(action){if(!held.has(action))pressed.add(action);held.add(action)}
function up(action){held.delete(action)}
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();pause();return}const a=keymap[e.key]||keymap[e.key.toLowerCase()];if(a&&mode==='play'){e.preventDefault();down(a)}});
window.addEventListener('keyup',e=>{const a=keymap[e.key]||keymap[e.key.toLowerCase()];if(a)up(a)});
window.addEventListener('blur',()=>{held.clear();pressed.clear();if(mode==='play')pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){held.clear();pressed.clear();if(mode==='play')pause();last=0}else if(!raf){last=0;raf=requestAnimationFrame(loop)}});
for(const b of document.querySelectorAll('[data-control]')){const a=b.dataset.control;b.addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='play'){b.setPointerCapture(e.pointerId);down(a)}});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>up(a))}
$('pauseButton').onclick=pause;
function update(){
 if(mode!=='play')return;
 tick++;elapsed+=1/60;if(messageTime>0&&!--messageTime)$('notice').textContent='';
 for(const k of ['inv','dashCD','bladeCD','shotCD','dash','blade'])if(p[k]>0)p[k]--;
 if(pressed.has('jump'))p.jumpBuffer=8;if(p.jumpBuffer>0)p.jumpBuffer--;
 if(p.ground)p.coyote=7;else if(p.coyote>0)p.coyote--;
 if(p.jumpBuffer&&p.coyote){p.vy=-12;p.ground=false;p.coyote=0;p.jumpBuffer=0}
 const direction=(held.has('right')?1:0)-(held.has('left')?1:0);
 if(direction)p.face=direction;
 if(pressed.has('dash')&&!p.dashCD){p.dash=12;p.dashCD=45}
 p.vx=p.dash?p.face*9:direction*4;
 if(pressed.has('slash')&&!p.bladeCD){p.blade=12;p.bladeCD=22}
 if(pressed.has('shoot')&&!p.shotCD&&p.ammo){fire(p.x+13+p.face*20,p.y+17,p.face*9,0);p.ammo--;p.shotCD=15}
 if(pressed.has('steal')){const target=enemies.find(e=>!e.boss&&e.hp>0&&e.hp<=2&&Math.abs(e.x-p.x)<65&&Math.abs(e.y-p.y)<55);if(target){target.hp=0;p.ammo=8;burst(target.x,target.y);say('Weapon stolen: eight shots. Press K or Shoot.',240)}else say('Weaken a guard with two blade hits, then move close to steal.',180)}
 p.vy=Math.min(p.vy+.55,13);const oldBottom=p.y+p.h;p.x=Math.max(0,Math.min(LEVEL-p.w,p.x+p.vx));p.y+=p.vy;p.ground=false;
 for(const platform of platforms())if(p.vy>=0&&oldBottom<=platform.y&&p.y+p.h>=platform.y&&p.x+p.w>platform.x&&p.x<platform.x+platform.w){p.y=platform.y-p.h;p.vy=0;p.ground=true;break}
 if(p.y>H+80){die();return}
 for(const e of enemies){if(e.hp<=0)continue;if(e.hit>0)e.hit--;if(e.attack>0)e.attack--;e.cd--;
  const distance=p.x-e.x;e.dir=distance<0?-1:1;
  if(e.boss){if(Math.abs(distance)>150)e.x+=e.dir*1.15;if(e.cd===30)say('The Bell Warden is winding up!',60);if(e.cd<=0){fire(e.x+e.w/2,e.y+24,e.dir*5,0,true);e.cd=100;e.attack=20}}
  else{if(Math.abs(distance)<240&&Math.abs(distance)>35)e.x+=e.dir*.75;if(e.cd<=0&&Math.abs(distance)<300){fire(e.x+e.w/2,e.y+16,e.dir*4,0,true);e.cd=110}}
  if(p.blade){const blade={x:p.face>0?p.x+p.w:p.x-35,y:p.y+3,w:35,h:34};if(overlap(blade,e))damage(e,2)}
  if(overlap(p,e))hurt(e.boss?2:1,e.x);
 }
 for(const s of shots){s.x+=s.vx;s.y+=s.vy;s.life--;if(s.hostile){if(overlap(s,p)){hurt(1,s.x);s.life=0}}else for(const e of enemies){if(e.hp>0&&overlap(s,e)){damage(e,1);s.life=0;break}}}
 shots=shots.filter(s=>s.life>0&&s.x>0&&s.x<LEVEL);
 for(const s of sparks){s.x+=s.vx;s.y+=s.vy;s.vy+=.2;s.life--}sparks=sparks.filter(s=>s.life>0);
 if(p.x>LEVEL-55){if(room<2){loadRoom(room+1);return}if(enemies.every(e=>e.hp<=0)){finish();return}else{p.x=LEVEL-55;say('Defeat the Bell Warden before opening the door.',120)}}
 cam=Math.max(0,Math.min(LEVEL-W,p.x-W*.35));if(shake>0)shake--;if(flash>0)flash--;
 
