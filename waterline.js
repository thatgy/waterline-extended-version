/* WATERLINE — compact KAPLAY 3001 port. Game rules are data-driven; the world uses KAPLAY. */
'use strict';
if(typeof kaplay!=='function') throw Error('KAPLAY did not load (check your connection).');
const K=kaplay({canvas:document.querySelector('#game'),background:[5,5,7],crisp:true,global:false,focus:true,debug:false});
const TILE=32,SIZE=100,SAVE='waterline_kaplay_v2',DIR=[[1,0],[-1,0],[0,1],[0,-1]];
const $=id=>document.getElementById(id), rand=n=>Math.floor(Math.random()*n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), id=(x,y)=>x+','+y, at=(o,x,y)=>o.x===x&&o.y===y;
const V=(x,y)=>K.vec2(x,y), inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<SIZE&&y<SIZE;
const C=Object.fromEntries(Object.entries({
  void:'#000000',sand:'#2c2318',scrub:'#253020',rock:'#252530',dug:'#34333a',shade:'#181820',scrap:'#8c9195',
  cyan:'#00ccff',aqua:'#6adcf4',blue:'#174a67',white:'#e8edef',orange:'#ffa300',red:'#f04c45',
  green:'#30a964',darkGreen:'#1c7142',black:'#15151c',brown:'#75502e',tan:'#b49765',gray:'#6c727c',
  lightGray:'#abb6c0',gold:'#f8d357',deep:'#284451',shadow:'#101319',leaf:'#57bd53',wine:'#902f2e'
}).map(([n,hex])=>[n,K.rgb(hex)]));
const rect=(x,y,w,h,c)=>K.drawRect({pos:V(x,y),width:w,height:h,color:C[c]});
const line=(x,y,X,Y,c,w=3)=>K.drawLine({p1:V(x,y),p2:V(X,Y),color:C[c],width:w});
const circle=(x,y,r,c)=>K.drawCircle({pos:V(x,y),radius:r,color:C[c]});
const poly=(pts,c)=>K.drawPolygon({pts:pts.map(([x,y])=>V(x,y)),color:C[c]});
// Each drawing command is [rect/x/y/w/h/color], [line/x/y/X/Y/color/width], [circle/x/y/r/color], or [polygon/points/color].
const ART={
  player:[['r',9,25,5,7,'brown'],['r',18,25,5,7,'brown'],['r',8,13,16,14,'tan'],['r',6,13,4,12,'brown'],['r',23,13,4,12,'brown'],['r',10,5,13,10,'gray'],['r',12,8,9,5,'cyan'],['r',9,3,15,3,'deep']],
  town:[['r',3,14,26,16,'darkGreen'],['p',[[2,14],[16,2],[30,14]],'green'],['r',13,21,6,9,'black'],['r',6,18,5,4,'gold']],
  shop:[['r',5,12,23,17,'brown'],['r',3,7,26,7,'orange'],['r',9,19,6,10,'shadow']],
  work:[['r',6,16,20,13,'gray'],['r',3,12,26,6,'lightGray'],['r',13,6,6,7,'orange']],
  shelter:[['p',[[3,29],[16,6],[29,29]],'blue'],['l',16,8,16,29,'aqua',2],['r',11,24,10,5,'shadow']],
  post:[['r',10,13,12,17,'gray'],['r',6,5,20,10,'black'],['r',12,7,8,5,'red']],
  well:[['r',7,16,18,14,'gray'],['r',9,19,14,8,'cyan'],['r',7,13,18,4,'lightGray']],
  solar:[['r',14,21,4,10,'lightGray'],['p',[[3,19],[11,8],[30,8],[27,19]],'aqua'],['l',10,13,29,13,'blue',2],['l',20,9,20,19,'blue',2]],
  firepit:[['r',7,23,19,5,'gray'],['p',[[12,25],[15,11],[18,20],[22,15],[24,25]],'orange'],['p',[[15,24],[18,17],[20,24]],'gold']],
  garden:[['r',5,14,22,15,'darkGreen'],['r',8,16,4,10,'leaf'],['r',15,19,4,8,'leaf'],['r',22,16,3,10,'leaf']],
  drop:[['r',7,12,19,16,'gold'],['r',13,15,7,6,'red'],['r',15,13,3,13,'wine']],
  patrol:[['c',16,16,9,'red'],['c',16,16,4,'black']]
};
function drawArt(type,obj){
  for(const [op,...a] of ART[type]||[]) switch(op){
    case 'r':rect(...a);break;case 'l':line(...a);break;case 'c':circle(...a);break;case 'p':poly(...a);
  }
  if(type==='player'&&state.pipeMode){rect(25,17,7,6,'lightGray');rect(27,15,3,10,'cyan');}
  if(type==='town'&&obj.st>=2)circle(27,5,3,'aqua');
}
const START={x:50,y:50,w:0,cap:15,f:3,m:2,c:2,p:1,junk:0,seeds:0,rope:0,wire:0,battery:0};
const STATE={susp:0,day:1,time:480,pipeMode:false,buildMode:false,selectedBuild:null,weather:'clear'};
const TECH={filter:false,solar:false,pipe:false,purifier:false,reinforced:false};
const GROUPS=['towns','shops','works','shelters','posts','patrols','structures'];
let player={...START},state={...STATE},tech={...TECH},world=[],pipes=new Set(),water={};
let towns=[],shops=[],works=[],shelters=[],posts=[],patrols=[],structures=[];
let started=false,ended=false,mini=null,moveTimer=0,hudTimer=0,mapTimer=0,warningTime=0,suppress=0,mouse={x:50,y:50},audio;
const groups=()=>[towns,shops,works,shelters,posts,patrols,structures];
function reveal(x,y){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(inside(x+dx,y+dy))world[y+dy][x+dx].exp=true;}
function spawn(count,info,used){
  const result=[];for(let n=0,tries=0;n<count&&tries++<10000;){
    const p={...info,x:5+rand(SIZE-10),y:5+rand(SIZE-10)};
    if(used.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<5))continue;
    result.push(p);used.push(p);n++;
  }return result;
}
function reset(){
  player={...START};state={...STATE};tech={...TECH};pipes=new Set();water={};structures=[];
  world=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>{
    const r=Math.random(),reg=r<.6?0:r<.85?1:2;
    return {dug:false,exp:false,reg,wc:[.05,.15,.25][reg],junk:Math.random()<(reg===2?.35:.18),elev:rand(4)};
  }));
  const used=[player],names=['Dusthaven','Ashen Wells','Scorchgate','Mirage Outpost','Drybone Crossing','Ruinridge','Sandveil','Cactus Refuge','Wastemarch','Oasis Fall'];
  towns=spawn(4,{need:30,st:0},used);towns.forEach(t=>t.name=names[rand(names.length)]);
  shops=spawn(3,{},used);works=spawn(3,{},used);shelters=spawn(4,{},used);posts=spawn(5,{r:5},used);
  patrols=posts.flatMap(p=>Array.from({length:2},()=>({x:p.x,y:p.y,ox:p.x,oy:p.y,a:Math.random()*Math.PI*2,speed:.03+Math.random()*.02})));
  reveal(player.x,player.y);
}
function visual(obj,type,z=3){obj.visual=K.add([K.pos(obj.x*TILE,obj.y*TILE),K.z(z),{draw(){drawArt(type||obj.t,obj);}}]);}
function install(){groups().forEach((group,i)=>group.forEach(o=>visual(o,['town','shop','work','shelter','post','patrol',null][i],i===5?6:3)));}
function removeVisuals(){groups().flat().forEach(o=>{if(o.visual){K.destroy(o.visual);delete o.visual;}});}
function structure(x,y,t){const o={x,y,t};structures.push(o);visual(o);return o;}
function erase(o){if(o.visual)K.destroy(o.visual);structures.splice(structures.indexOf(o),1);}
const read=(x,y)=>water[id(x,y)]||0;
function write(x,y,n){n>0?water[id(x,y)]=n:delete water[id(x,y)];}
const addWater=(x,y,n)=>write(x,y,read(x,y)+n);
const suspicion=n=>state.susp=clamp(state.susp+n*(state.day%7===0?.5:1),0,100);
function beep(f=440,ms=90,type='sine'){
  try{audio ||=new (window.AudioContext||window.webkitAudioContext)();audio.resume();
    const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=f;g.gain.value=.12;
    o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+ms/1000);
  }catch(_){}
}
const sound=good=>(good?[520,740,980]:[260,180]).forEach((f,i)=>setTimeout(()=>beep(f,120),i*75));
let toastTimer;
function toast(msg){$('toast').textContent=msg;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',2800);}
function terrain(){
  const x0=clamp(Math.floor(player.x-K.width()/TILE/2)-3,0,SIZE-1),y0=clamp(Math.floor(player.y-K.height()/TILE/2)-3,0,SIZE-1);
  const x1=clamp(Math.ceil(player.x+K.width()/TILE/2)+3,0,SIZE-1),y1=clamp(Math.ceil(player.y+K.height()/TILE/2)+3,0,SIZE-1);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const t=world[y][x],px=x*TILE,py=y*TILE;
    rect(px,py,TILE,TILE,!t.exp?'void':t.dug?'dug':['sand','scrub','rock'][t.reg]);
    if(!t.exp)continue;
    if(t.elev>1)rect(px+4,py+4,6,6,'shade');
    if(t.junk&&!t.dug)rect(px+10,py+10,9,8,'scrap');
    if(t.dug)rect(px+7,py+7,18,17,'shade');
  }
  for(const k of pipes){const [x,y]=k.split(',').map(Number);if(x<x0||y<y0||x>x1||y>y1)continue;
    const px=x*TILE+16,py=y*TILE+16;
    for(const [dx,dy] of [[1,0],[0,1]])if(pipes.has(id(x+dx,y+dy)))line(px,py,px+dx*TILE,py+dy*TILE,'cyan',5);
    circle(px,py,5,'cyan');
  }
  if(state.buildMode&&inside(mouse.x,mouse.y)){const x=mouse.x*TILE,y=mouse.y*TILE;
    for(const [a,b,c,d] of [[x,y,x+32,y],[x,y,x,y+32],[x+32,y,x+32,y+32],[x,y+32,x+32,y+32]])line(a,b,c,d,'aqua',2);
  }
}
const camera=()=>K.camPos(V((player.x+.5)*TILE,(player.y+.5)*TILE));
const panelOpen=()=>$('context-panel').style.display==='block',close=()=>$('context-panel').style.display='none';
function panel(title,desc,buttons){
  $('context-title').textContent=title;$('context-desc').innerHTML=desc;$('context-actions').replaceChildren();
  for(const b of buttons){const btn=document.createElement('button'),detail=document.createElement('span');
    btn.className='btn';btn.disabled=!!b.disabled;btn.textContent=b.label+' ';detail.className='cost';detail.textContent=b.cost||'';
    btn.append(detail);btn.onclick=()=>{b.action();hud();};$('context-actions').append(btn);
  }$('context-panel').style.display='block';
}
const FOOD={w:'water',f:'food',m:'metal',c:'cloth',p:'plastic',seeds:'seeds',junk:'junk',wire:'wire',battery:'battery'};
const costName=o=>Object.entries(o).map(([n,v])=>v+' '+(FOOD[n]||n)).join(' + ');
const canPay=o=>Object.entries(o).every(([n,v])=>player[n]>=v);
const pay=o=>Object.entries(o).forEach(([n,v])=>player[n]-=v);
const BUILDS={firepit:{c:2,m:1},garden:{seeds:1,p:2}};
const RECIPES=[
  {label:'Process junk',cost:{junk:1},kind:'scrap'},
  {label:'Place fire pit',cost:BUILDS.firepit,kind:'build',value:'firepit'},
  {label:'Place garden plot',cost:BUILDS.garden,kind:'build',value:'garden'},
  {label:'Bio-filter research',cost:{c:1,m:1},kind:'tech',value:'filter'},
  {label:'Build solar still',cost:{p:1,m:2},kind:'place',value:'solar'},
  {label:'Pipe technology',cost:{m:3},kind:'tech',value:'pipe'},
  {label:'Water tank (+10 capacity)',cost:{p:2,m:1},kind:'tank'},
  {label:'Water purifier (DIY)',cost:{m:4,wire:2,battery:1},kind:'mini',requires:'filter',value:'purifier',taps:15,ms:5200},
  {label:'Reinforced pipe kit (DIY)',cost:{m:5,wire:3},kind:'mini',value:'reinforced',taps:11,ms:3800},
  {label:'Craft rope',cost:{junk:4},kind:'rope'}
];
const TRADES=[['Buy food',{w:1},{f:1}],['Buy metal',{f:1},{m:1}],['Buy cloth',{f:1},{c:1}],['Buy plastic',{w:2},{p:1}],['Bribe (-15 suspicion)',{c:2},null]];
function craft(){
  panel('WORKBENCH — DIY CRAFTING','Salvage, equipment and machinery.',RECIPES.map(r=>({
    label:r.label,cost:costName(r.cost),disabled:!canPay(r.cost)||(r.requires&&!tech[r.requires])||((r.kind==='tech'||r.kind==='mini')&&tech[r.value]),
    action(){if(r.kind==='build'){state.selectedBuild=r.value;state.buildMode=true;close();return toast('Click a tile to place '+r.value+'.');}
      pay(r.cost);switch(r.kind){
        case 'scrap':{const n=Math.random(),resource=n<.32?'m':n<.58?'c':n<.78?'p':n<.9?'wire':'battery';player[resource]++;toast('Recovered '+FOOD[resource]+'.');break;}
        case 'tech':tech[r.value]=true;toast(r.label+' unlocked.');break;
        case 'place':structure(player.x,player.y,r.value);toast('Solar still placed.');break;
        case 'tank':player.cap+=10;toast('Canteen capacity +10.');break;
        case 'rope':player.rope++;toast('Rope crafted.');break;
        case 'mini':close();mini={name:r.label,value:r.value,taps:r.taps,count:0,left:r.ms,total:r.ms};$('mini-name').textContent=r.label;$('mini-game').style.display='block';toast('Tap SPACE repeatedly!');beep(980);return;
      }craft();
    }
  })));
}
function townPanel(t){panel('SETTLEMENT: '+t.name,`Stability: ${t.st}/3<br>Water deficit: ${t.need} L`,[
  {label:'Donate up to 5 L',disabled:player.w<=0||t.need<=0,action(){const n=Math.min(5,player.w,t.need);player.w-=n;t.need-=n;toast('Donated '+n+' L');townPanel(t);}},
  {label:'Rest and end day',action:sleep}
]);}
function shop(){panel('BLACK MARKET','Trade scarce resources.',TRADES.map(([label,cost,gain])=>({
  label,cost:costName(cost),disabled:!canPay(cost)||(!gain&&state.susp===0),action(){pay(cost);
    gain?Object.entries(gain).forEach(([n,v])=>player[n]+=v):suspicion(-15);toast(label+'.');shop();
  }
})));}
function outpost(){panel('REGIME OUTPOST','Highly guarded.',[
  {label:'Bribe guards',cost:'3 metal',disabled:player.m<3,action(){player.m-=3;suspicion(-25);toast('Guards distracted.');outpost();}},
  {label:'Sabotage (risky)',action(){Math.random()<.4?(player.f+=3,player.w=clamp(player.w+7,0,player.cap),toast('Stole supplies!')):(suspicion(32),toast('Spotted!'));close();}}
]);}
function interact(){
  for(const [list,fn] of [[towns,townPanel],[shops,shop],[works,craft],[shelters,()=>panel('SAFE SHELTER','Lay low here.',[{label:'Rest and end day',action:sleep}])],[posts,outpost]]){
    const o=list.find(q=>at(q,player.x,player.y));if(o)return fn(o);
  }
  const o=structures.find(q=>at(q,player.x,player.y));if(!o)return toast('Nothing here.');
  switch(o.t){
    case 'well':case 'solar':{const n=Math.min(read(o.x,o.y),player.cap-player.w);if(n>0){player.w+=n;write(o.x,o.y,read(o.x,o.y)-n);}toast(n?'Collected '+n+' water.':'No available water or canteen full.');break;}
    case 'drop':player.w=Math.min(player.cap,player.w+9);player.junk+=3;erase(o);toast('Recovered airdrop!');sound(true);break;
    case 'firepit':if(player.seeds){player.seeds--;player.f+=3;toast('Cooked seeds: +3 food.');}else toast('Need seeds to cook.');break;
    default:toast('Inspected '+o.t+'.');
  }
}
function build(x,y){
  if(!state.buildMode||!inside(x,y))return toast('Choose an in-bounds tile.');
  const t=state.selectedBuild,cost=BUILDS[t];
  if(!canPay(cost))return toast('Insufficient resources.');
  if(groups().slice(0,5).concat([structures]).flat().some(o=>at(o,x,y)))return toast('Tile occupied.');
  pay(cost);structure(x,y,t);state.buildMode=false;state.selectedBuild=null;toast('Built '+t+'.');sound(true);
}
function useTool(){
  if(state.pipeMode){if(!tech.pipe)return toast('Research pipe technology first.');
    if(!player.m&&!player.p)return toast('Need metal or plastic.');
    if(pipes.has(id(player.x,player.y)))return toast('Pipe already laid.');
    player.p?player.p--:player.m--;pipes.add(id(player.x,player.y));beep(460);return toast('Pipe laid.');
  }
  const t=world[player.y][player.x];if(t.dug)return toast('Already dug.');
  t.dug=true;suspicion(posts.some(p=>Math.hypot(p.x-player.x,p.y-player.y)<=p.r)?9:2);
  let chance=t.wc+(tech.filter?.22:0)+(state.weather==='rain'?.25:0),n=[3,4,7][t.reg];
  if(tech.purifier)n=Math.floor(n*1.35);if(state.weather==='heatwave')n=Math.floor(n*.65);
  if(Math.random()<chance){player.w=Math.min(player.cap,player.w+n);structure(player.x,player.y,'well');toast('Aquifer! +'+n+' water.');}
  else toast('Dry sand...');
  if(t.junk){player.junk++;player.wire+=Math.random()<.32?1:0;player.battery+=Math.random()<.18?1:0;t.junk=false;toast('Recovered buried scrap!');}
  beep(180,65,'square');
}
function miniTap(){if(!mini)return;mini.count++;beep(700+mini.count*23,35);if(mini.count>=mini.taps)finishMini(true);else miniUI();}
function miniUI(){if(!mini)return;$('mini-progress').style.width=mini.count/mini.taps*100+'%';$('mini-time').style.width=Math.max(0,mini.left)/mini.total*100+'%';$('mini-progress-text').textContent=mini.count+' / '+mini.taps;}
function finishMini(ok){const m=mini;mini=null;$('mini-game').style.display='none';if(ok){tech[m.value]=true;toast(m.name+' completed!');}else toast(m.name+' failed. Materials lost.');sound(ok);}
function randomEvent(){const r=Math.random();switch(true){
  case r<.18:{const lost=[...pipes].sort(()=>Math.random()-.5).slice(0,Math.floor(pipes.size*.28));lost.forEach(k=>pipes.delete(k));suspicion(12);toast('Sandstorm damaged pipes!');break;}
  case r<.34:structure(clamp(player.x+rand(22)-11,0,99),clamp(player.y+rand(22)-11,0,99),'drop');toast('Charity airdrop!');break;
  case r<.52:player.f+=2;player.junk+=4;toast('Locals donated food and scrap.');break;
  case r<.68:suspicion(28);toast('Regime sweep!');
}}
function sleep(){
  if(!started||ended||mini)return;
  const safe=[...towns,...shelters].some(o=>at(o,player.x,player.y));
  if(!safe){if(!window.confirm('Unsafe to sleep here. Continue?'))return;suspicion(16);if(Math.random()<.65&&player.f)player.f--;}
  else suspicion(-9);
  close();night();
}
function night(){
  player.f=Math.max(0,player.f-1);if(!player.f)suspicion(14);
  switch(state.weather){
    case 'heatwave':player.f=Math.max(0,player.f-1);break;
    case 'rain':player.w=Math.min(player.cap,player.w+3);for(let i=0;i<10;i++)addWater(rand(SIZE),rand(SIZE),3);break;
  }
  for(const s of structures)switch(s.t){
    case 'well':addWater(s.x,s.y,tech.purifier?5:4);break;
    case 'solar':addWater(s.x,s.y,tech.purifier?4:3);break;
    case 'garden':if(Math.random()<.7)player.seeds=Math.min(player.seeds+3,30);
  }
  // Pipe delivery uses breadth-first search. Queue head index avoids O(n) shift().
  for(const t of towns){let need=t.need,queue=[[t.x,t.y]],seen=new Set([id(t.x,t.y)]);
    for(let head=0;head<queue.length&&need>0;head++){
      const [x,y]=queue[head],taken=Math.min(read(x,y),need);if(taken){need-=taken;write(x,y,read(x,y)-taken);}
      for(const [dx,dy] of DIR){const X=x+dx,Y=y+dy,k=id(X,Y);
        if(inside(X,Y)&&pipes.has(k)&&!seen.has(k)){seen.add(k);queue.push([X,Y]);}
      }
    }
    t.need=need;t.st=need>0?Math.max(-2,t.st-1):Math.min(3,t.st+1);
    if(!need)t.need=28+rand(22);
  }
  randomEvent();
  if(pipes.size&&Math.random()<(tech.reinforced?.12:.37)){const a=[...pipes];pipes.delete(a[rand(a.length)]);toast('Pipe burst overnight.');}
  for(let i=towns.length-1;i>=0;i--)if(towns[i].st<-1){K.destroy(towns[i].visual);towns.splice(i,1);}
  const choices=state.day<6?['clear','clear','heatwave','rain']:['clear','sandstorm','heatwave','rain'];
  state.weather=choices[rand(choices.length)];state.day++;state.time=480;save(true);hud();minimap();
  if(state.susp>=100)end(false,'Regime forces arrested you.');
  else if(!towns.length)end(false,'All settlements perished.');
  else if(towns.every(t=>t.st>=3))end(true,'All remaining settlements stable!');
}
function end(won,msg){ended=true;$('splash-text').textContent=(won?'MISSION SUCCESS':'MISSION FAILED')+' — '+msg;$('splash').style.color=won?'#69ffba':'#ff6666';$('splash').style.display='flex';}
const clean=list=>list.map(({visual,...o})=>o);
function save(quiet=false){try{
  K.setData(SAVE,{version:2,player,state:{...state,buildMode:false,selectedBuild:null},tech,world,pipes:[...pipes],tileWater:water,
    ...Object.fromEntries(GROUPS.map((name,i)=>[name,clean(groups()[i])]))});
  if(!quiet)toast('Mission saved.');
}catch(e){console.error(e);toast('Save failed.');}}
function load(){let d;try{d=K.getData(SAVE);}catch(e){console.error(e);}
  if(d?.version!==2||!Array.isArray(d.world)||d.world.length!==SIZE)return toast('No compatible save.');
  removeVisuals();player={...START,...d.player};state={...STATE,...d.state,buildMode:false,selectedBuild:null};tech={...TECH,...d.tech};
  world=d.world;pipes=new Set(d.pipes||[]);water=d.tileWater||{};
  [towns,shops,works,shelters,posts,patrols,structures]=GROUPS.map(name=>d[name]||[]);
  install();operative.pos=V(player.x*TILE,player.y*TILE);camera();close();mini=null;$('mini-game').style.display='none';
  ended=false;$('splash').style.display='none';if(!started)begin();hud();minimap();toast('Saved world restored.');
}
const mapCtx=$('map').getContext('2d');
function minimap(){const s=150/SIZE;mapCtx.fillStyle='#111';mapCtx.fillRect(0,0,150,150);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const t=world[y][x];if(!t.exp)continue;mapCtx.fillStyle=t.dug?'#444':['#3d311e','#2e412d','#3d3d4c'][t.reg];mapCtx.fillRect(x*s,y*s,s+.1,s+.1);
  }
  for(const [list,color,w] of [[towns,'#39f080',4],[posts,'#ff5656',4]]){
    mapCtx.fillStyle=color;for(const o of list)mapCtx.fillRect(o.x*s-1,o.y*s-1,w,w);
  }
  mapCtx.fillStyle='#00ccff';for(const k of pipes){const [x,y]=k.split(',').map(Number);mapCtx.fillRect(x*s,y*s,2,2);}
  mapCtx.fillStyle='white';mapCtx.fillRect(player.x*s-2,player.y*s-2,5,5);
}
function hud(){const fields={w:player.w,cap:player.cap,f:player.f,m:player.m,c:player.c,p:player.p,junk:player.junk,wire:player.wire,bat:player.battery,s:Math.floor(state.susp),d:state.day};
  for(const [name,n] of Object.entries(fields))$('ui-'+name).textContent=n;
  $('ui-s').style.color=state.susp>70?'#ff4444':state.susp>30?'#ffa300':'#e5e9ea';
  $('ui-time').textContent=[Math.floor(state.time/60),Math.floor(state.time%60)].map(n=>String(n).padStart(2,'0')).join(':');
  $('ui-weather').textContent=({clear:'☀️',sandstorm:'🌪️',heatwave:'🥵',rain:'🌧️'}[state.weather])+' '+state.weather.toUpperCase();
  $('ui-mode').textContent=state.buildMode?'[PLACE '+state.selectedBuild.toUpperCase()+']':state.pipeMode?'[PIPE MODE]':'[DIG MODE]';
  const a=state.time>1200||state.time<360?.56:state.time>1080?.33:0;
  $('overlay').style.backgroundColor=state.weather==='sandstorm'?'rgba(145,95,42,.17)':`rgba(0,8,23,${a})`;
}
function begin(){if(started)return;started=true;suppress=K.time()+.15;$('intro').style.display='none';K.canvas.focus();toast('Dig, craft and deliver water.');}
const canAct=()=>started&&!ended&&!panelOpen()&&K.time()>=suppress;
reset();K.add([K.z(-20),{draw:terrain}]);install();
const operative=K.add([K.pos(player.x*TILE,player.y*TILE),K.z(10),{draw(){drawArt('player',player);}}]);
camera();hud();minimap();
$('intro').onclick=begin;$('close-panel').onclick=close;$('restart-button').onclick=()=>location.reload();
K.onKeyPress(key=>{
  if(!started)return begin();
  if(key==='escape'){state.buildMode=false;state.selectedBuild=null;close();return;}
  if(key==='l')return load();if(key==='k')return save();
  if(mini)return key==='space'?miniTap():undefined;
  if(key==='c'&&!ended)return craft();
  if(key==='enter'&&!ended)return sleep();
  if(!canAct())return;
  switch(key){
    case 'space':useTool();break;case 'e':interact();break;
    case 'p':state.pipeMode=!state.pipeMode;state.buildMode=false;state.selectedBuild=null;toast(state.pipeMode?'Pipe mode.':'Dig mode.');
  }
});
K.onMousePress('left',()=>{if(started&&!ended&&state.buildMode&&!panelOpen()){
  const p=K.toWorld(K.mousePos());build(Math.floor(p.x/TILE),Math.floor(p.y/TILE));
}});
K.onMouseMove(()=>{const p=K.toWorld(K.mousePos());mouse={x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE)};});
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='s'){e.preventDefault();if(started)save();}
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&e.target===K.canvas)e.preventDefault();
});
K.onUpdate(()=>{
  if(!started||ended)return;const dt=Math.min(K.dt(),.1);
  if(mini){mini.left-=dt*1000;miniUI();if(mini.left<=0)finishMini(false);}
  if(!panelOpen()&&!mini){
    moveTimer=Math.max(0,moveTimer-dt);
    const dx=Number(K.isKeyDown('right')||K.isKeyDown('d'))-Number(K.isKeyDown('left')||K.isKeyDown('a'));
    const dy=Number(K.isKeyDown('down')||K.isKeyDown('s'))-Number(K.isKeyDown('up')||K.isKeyDown('w'));
    if(!dx&&!dy)moveTimer=0;
    else if(!moveTimer){player.x=clamp(player.x+dx,0,99);player.y=clamp(player.y+dy,0,99);
      operative.pos=V(player.x*TILE,player.y*TILE);camera();reveal(player.x,player.y);
      moveTimer=state.weather==='sandstorm'?.235:.145;
    }
  }
  state.time+=dt*5.2;if(state.time>=1440)state.time=480;
  for(const p of patrols){p.a+=(Math.random()-.5)*.65*Math.sqrt(dt*60);
    const x=p.x+Math.cos(p.a)*p.speed*dt*60,y=p.y+Math.sin(p.a)*p.speed*dt*60;
    if(Math.hypot(x-p.ox,y-p.oy)>5||!inside(Math.floor(x),Math.floor(y)))p.a+=Math.PI;
    else{p.x=x;p.y=y;}p.visual.pos=V(p.x*TILE,p.y*TILE);
    if(Math.hypot(player.x-p.x,player.y-p.y)<2){suspicion(dt*3.5);
      if(K.time()-warningTime>4){warningTime=K.time();toast('Patrol nearby!');}
    }
  }
  if(state.susp>=100)return end(false,'Regime forces arrested you.');
  hudTimer+=dt;mapTimer+=dt;if(hudTimer>.12){hudTimer=0;hud();}if(mapTimer>.25){mapTimer=0;minimap();}
});
window.WaterlineDebug=Object.freeze({getPlayer:()=>({...player}),getState:()=>({...state}),getTech:()=>({...tech}),getTowns:()=>clean(towns),getPipes:()=>[...pipes],beginMission:begin,save,load,processNight:night,getEngine:()=>K});
