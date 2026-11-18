const K=kaplay({canvas:document.querySelector('#game'),background:[5,5,7],crisp:true,global:false,focus:true});
const T=32,N=100,SAVE='waterline_kaplay_v6',D=[[1,0],[-1,0],[0,1],[0,-1]],$=s=>document.getElementById(s),R=n=>Math.floor(Math.random()*n),C=(v,a,b)=>Math.max(a,Math.min(b,v)),I=(x,y)=>x+','+y,V=(x,y)=>K.vec2(x,y);
const inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N,at=(o,x,y)=>o.x===x&&o.y===y,Q=(x,y)=>water[I(x,y)]||0;
const COL={v:'#000',s:'#2c2318',g:'#253020',r:'#252530',d:'#34333a',j:'#8c9195',c:'#00ccff',a:'#6adcf4',b:'#174a67',o:'#ffa300',R:'#f04c45',G:'#30a964',D:'#1c7142',k:'#15151c',B:'#75502e',t:'#b49765',x:'#6c727c',l:'#abb6c0',y:'#f8d357',L:'#57bd53'};
const ART={player:[['r',8,13,16,14,'t'],['r',10,5,13,10,'x'],['r',12,8,9,5,'c'],['r',9,25,5,7,'B'],['r',18,25,5,7,'B']],town:[['r',3,14,26,16,'D'],['c',16,10,9,'G'],['r',13,21,6,9,'k']],shop:[['r',5,12,23,17,'B'],['r',3,7,26,7,'o']],work:[['r',6,16,20,13,'x'],['r',3,12,26,6,'l']],shelter:[['r',6,16,20,13,'b'],['l',6,16,16,5,'a',4],['l',16,5,26,16,'a',4]],post:[['r',10,13,12,17,'x'],['r',6,5,20,10,'k'],['r',12,7,8,5,'R']],well:[['r',7,16,18,14,'x'],['r',9,19,14,8,'c']],solar:[['r',4,11,24,10,'a'],['l',4,16,28,16,'b',2],['l',16,11,16,21,'b',2]],firepit:[['r',7,23,19,5,'x'],['c',16,19,7,'o']],garden:[['r',5,14,22,15,'D'],['c',11,20,3,'L'],['c',20,22,3,'L']],drop:[['r',7,12,19,16,'y'],['r',13,15,7,6,'R']],patrol:[['c',16,16,9,'R'],['c',16,16,4,'k']]};
const START={x:50,y:50,w:0,cap:15,f:3,m:2,c:2,p:1,junk:0,seeds:0,rope:0,wire:0,battery:0},BASE={susp:0,day:1,time:480,pipeMode:false,buildMode:false,selectedBuild:null,weather:'clear'},TECH={filter:false,pipe:false,purifier:false,reinforced:false};
let player={...START},state={...BASE},tech={...TECH},world=[],pipes=new Set(),water={},towns=[],shops=[],works=[],shelters=[],posts=[],patrols=[],structures=[],started=false,ended=false,mini=null,move=0,hudt=0,mapt=0,warn=0,suppress=0,mouse={x:50,y:50},toastt;
const groups=()=>[towns,shops,works,shelters,posts,patrols,structures],clean=a=>a.map(({visual,...o})=>o),setQ=(x,y,n)=>n>0?water[I(x,y)]=n:delete water[I(x,y)],addQ=(x,y,n)=>setQ(x,y,Q(x,y)+n),sus=n=>state.susp=C(state.susp+n*(state.day%7===0?.5:1),0,100);
const draw=([op,...a])=>op==='r'?K.drawRect({pos:V(a[0],a[1]),width:a[2],height:a[3],color:K.rgb(COL[a[4]])}):op==='c'?K.drawCircle({pos:V(a[0],a[1]),radius:a[2],color:K.rgb(COL[a[3]])}):K.drawLine({p1:V(a[0],a[1]),p2:V(a[2],a[3]),color:K.rgb(COL[a[4]]),width:a[5]||3});
const art=t=>(ART[t]||[]).forEach(draw);
const spawn=(n,b,u,a=[])=>{for(let z=0;a.length<n&&z++<9999;){const o={...b,x:5+R(90),y:5+R(90)};if(u.every(p=>Math.hypot(p.x-o.x,p.y-o.y)>=5)){a.push(o);u.push(o)}}return a};
const reveal=(x,y)=>{for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++)if(inside(x+i,y+j))world[y+j][x+i].exp=true};
const reset=()=>{[player,state,tech,pipes,water,structures]=[{...START},{...BASE},{...TECH},new Set(),{},[]];world=Array.from({length:N},()=>Array.from({length:N},()=>{const z=Math.random(),reg=z<.6?0:z<.85?1:2;return{dug:false,exp:false,reg,wc:[.05,.15,.25][reg],junk:Math.random()<(reg===2?.35:.18),elev:R(4)}}));const u=[player],names=['Dusthaven','Ashen Wells','Scorchgate','Mirage Outpost','Drybone Crossing','Ruinridge','Sandveil','Cactus Refuge','Wastemarch','Oasis Fall'];towns=spawn(4,{need:30,st:0},u).map(o=>({...o,name:names[R(names.length)]}));[shops,works,shelters,posts]=[[3,{}],[3,{}],[4,{}],[5,{r:5}]].map(([n,b])=>spawn(n,b,u));patrols=posts.flatMap(p=>Array.from({length:2},()=>({x:p.x,y:p.y,ox:p.x,oy:p.y,a:Math.random()*Math.PI*2,speed:.03+Math.random()*.02})));reveal(player.x,player.y)};
const vis=(o,t,z=3)=>o.visual=K.add([K.pos(o.x*T,o.y*T),K.z(z),{draw(){art(t||o.t)}}]);
const install=()=>groups().forEach((a,i)=>a.forEach(o=>vis(o,['town','shop','work','shelter','post','patrol'][i],i===5?6:3)));
const addS=(x,y,t)=>{const o={x,y,t};structures.push(o);vis(o);return o};
const delS=o=>{K.destroy(o.visual);structures.splice(structures.indexOf(o),1)};
const toast=s=>{$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toastt);toastt=setTimeout(()=>$('toast').style.display='none',2200)};
const camera=()=>K.camPos(V((player.x+.5)*T,(player.y+.5)*T)),close=()=>$('context-panel').style.display='none',panelOpen=()=>$('context-panel').style.display==='block',movement=dt=>{move=Math.max(0,move-dt);const dx=Number(K.isKeyDown('right')||K.isKeyDown('d'))-Number(K.isKeyDown('left')||K.isKeyDown('a')),dy=Number(K.isKeyDown('down')||K.isKeyDown('s'))-Number(K.isKeyDown('up')||K.isKeyDown('w'));if(!dx&&!dy)move=0;else if(!move){player.x=C(player.x+dx,0,99);player.y=C(player.y+dy,0,99);operative.pos=V(player.x*T,player.y*T);camera();reveal(player.x,player.y);move=state.weather==='sandstorm'?.235:.145}};
const FOOD={w:'water',f:'food',m:'metal',c:'cloth',p:'plastic',seeds:'seeds',junk:'junk',wire:'wire',battery:'battery'},txt=o=>Object.entries(o).map(([k,n])=>n+' '+FOOD[k]).join(' + '),can=o=>Object.entries(o).every(([k,n])=>player[k]>=n),pay=o=>Object.entries(o).forEach(([k,n])=>player[k]-=n),BUILD={firepit:{c:2,m:1},garden:{seeds:1,p:2}},collect=o=>{const n=Math.min(Q(o.x,o.y),player.cap-player.w);player.w+=n;setQ(o.x,o.y,Q(o.x,o.y)-n);return toast(n?'Collected '+n+' water':'No water')};
const REC=[['Process junk',{junk:1},'scrap'],['Place fire pit',BUILD.firepit,'build','firepit'],['Place garden',BUILD.garden,'build','garden'],['Bio-filter',{c:1,m:1},'tech','filter'],['Solar still',{p:1,m:2},'place','solar'],['Pipe tech',{m:3},'tech','pipe'],['Water tank',{p:2,m:1},'tank'],['Purifier',{m:4,wire:2,battery:1},'mini','purifier',15,5200,'filter'],['Reinforced pipes',{m:5,wire:3},'mini','reinforced',11,3800],['Rope',{junk:4},'rope']],TRADE=[['Buy food',{w:1},{f:1}],['Buy metal',{f:1},{m:1}],['Buy cloth',{f:1},{c:1}],['Buy plastic',{w:2},{p:1}],['Bribe',{c:2},null]];
const terrain=()=>{
const x0=C(Math.floor(player.x-K.width()/T/2)-3,0,99),y0=C(Math.floor(player.y-K.height()/T/2)-3,0,99),x1=C(Math.ceil(player.x+K.width()/T/2)+3,0,99),y1=C(Math.ceil(player.y+K.height()/T/2)+3,0,99);
for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const q=world[y][x],px=x*T,py=y*T,c=!q.exp?'v':q.dug?'d':['s','g','r'][q.reg];K.drawRect({pos:V(px,py),width:T,height:T,color:K.rgb(COL[c])});if(q.exp&&q.junk&&!q.dug)K.drawRect({pos:V(px+10,py+10),width:8,height:8,color:K.rgb(COL.j)})}
for(const k of pipes){const[x,y]=k.split(',').map(Number);if(x<x0||y<y0||x>x1||y>y1)continue;for(const[dx,dy]of[[1,0],[0,1]])if(pipes.has(I(x+dx,y+dy)))K.drawLine({p1:V(x*T+16,y*T+16),p2:V((x+dx)*T+16,(y+dy)*T+16),color:K.rgb(COL.c),width:5});K.drawCircle({pos:V(x*T+16,y*T+16),radius:5,color:K.rgb(COL.c)})}
if(state.buildMode&&inside(mouse.x,mouse.y))K.drawRect({pos:V(mouse.x*T,mouse.y*T),width:T,height:T,outline:{color:K.rgb(COL.a),width:3}});
};
const panel=(title,desc,bs)=>{$('context-title').textContent=title;$('context-desc').innerHTML=desc;$('context-actions').replaceChildren();for(const b of bs){const e=document.createElement('button');e.className='btn';e.disabled=!!b.disabled;e.textContent=b.label+(b.cost?' — '+b.cost:'');e.onclick=()=>{b.action();hud()};$('context-actions').append(e)}$('context-panel').style.display='block'};
const craft=()=>panel('WORKBENCH','Salvage and build.',REC.map(([label,cost,kind,val,taps,ms,req])=>({label,cost:txt(cost),disabled:!can(cost)||(req&&!tech[req])||(['tech','mini'].includes(kind)&&tech[val]),action(){if(kind==='build'){state.selectedBuild=val;state.buildMode=true;close();return toast('Click a tile to place '+val)}pay(cost);switch(kind){case'scrap':player[['m','m','c','c','p','wire','battery'][R(7)]]++;break;case'tech':tech[val]=true;break;case'place':addS(player.x,player.y,val);break;case'tank':player.cap+=10;break;case'rope':player.rope++;break;case'mini':mini={label,val,taps,count:0,left:ms};$('mini-game').style.display='block';return close()}toast(label+' complete');craft()}})));
const town=t=>panel('SETTLEMENT: '+t.name,`Stability ${t.st}/3 — Need ${t.need}L`,[{label:'Donate 5L',disabled:!player.w||!t.need,action(){const n=Math.min(5,player.w,t.need);player.w-=n;t.need-=n;toast('Donated '+n+'L');town(t)}},{label:'Rest',action:sleep}]);
const shop=()=>panel('BLACK MARKET','Trade resources.',TRADE.map(([label,cost,gain])=>({label,cost:txt(cost),disabled:!can(cost)||(!gain&&!state.susp),action(){pay(cost);gain?Object.entries(gain).forEach(([k,n])=>player[k]+=n):sus(-15);toast(label);shop()}})));
const outpost=()=>panel('REGIME OUTPOST','Highly guarded.',[{label:'Bribe guards',cost:'3 metal',disabled:player.m<3,action(){player.m-=3;sus(-25);outpost()}},{label:'Sabotage',action(){Math.random()<.4?(player.f+=3,player.w=C(player.w+7,0,player.cap),toast('Stole supplies')):(sus(32),toast('Spotted'));close()}}]);
const interact=()=>{
const h=[town,shop,craft,()=>panel('SHELTER','Safe rest.',[{label:'Rest',action:sleep}]),outpost];
for(let i=0;i<5;i++){const o=groups()[i].find(q=>at(q,player.x,player.y));if(o)return h[i](o)}
const o=structures.find(q=>at(q,player.x,player.y));
if(!o)return toast('Nothing here');
switch(o.t){
case'well':
case'solar':return collect(o);
case'drop':return(player.w=Math.min(player.cap,player.w+9),player.junk+=3,delS(o),toast('Recovered airdrop'));
case'firepit':return player.seeds?(player.seeds--,player.f+=3,toast('Cooked seeds')):toast('Need seeds');
default:return toast('Inspected '+o.t);
}};
const build=(x,y)=>{
if(!state.buildMode||!inside(x,y))return;
const t=state.selectedBuild,cost=BUILD[t];
if(!can(cost))return toast('Not enough resources');
if(groups().filter((_,i)=>i!==5).flat().some(o=>at(o,x,y)))return toast('Tile occupied');
pay(cost);
addS(x,y,t);
state.buildMode=false;
state.selectedBuild=null;
toast('Built '+t);
};
const tool=()=>{
if(state.pipeMode){
if(!tech.pipe)return toast('Research pipe tech');
if(!player.m&&!player.p)return toast('Need metal or plastic');
if(pipes.has(I(player.x,player.y)))return toast('Pipe already here');
player.p?player.p--:player.m--;
pipes.add(I(player.x,player.y));
return toast('Pipe laid');
}
const t=world[player.y][player.x],chance=t.wc+(tech.filter?.22:0)+(state.weather==='rain'?.25:0),n=Math.floor([3,4,7][t.reg]*(tech.purifier?1.35:1)*(state.weather==='heatwave'?.65:1));
if(t.dug)return toast('Already dug');
t.dug=true;
sus(posts.some(p=>Math.hypot(p.x-player.x,p.y-player.y)<=p.r)?9:2);
Math.random()<chance?(player.w=Math.min(player.cap,player.w+n),addS(player.x,player.y,'well'),toast('Aquifer +'+n)):toast('Dry sand');
t.junk&&(player.junk++,player.wire+=Math.random()<.32?1:0,player.battery+=Math.random()<.18?1:0,t.junk=false);
};
const miniTap=()=>{if(!mini)return;mini.count++;if(mini.count<mini.taps)return;tech[mini.val]=true;mini=null;$('mini-game').style.display='none';toast('Assembly complete')};
const event=()=>{
const r=Math.random();
switch(true){
case r<.18:return([...pipes].sort(()=>Math.random()-.5).slice(0,Math.floor(pipes.size*.28)).forEach(k=>pipes.delete(k)),sus(12),toast('Sandstorm damaged pipes'));
case r<.34:return(addS(C(player.x+R(22)-11,0,99),C(player.y+R(22)-11,0,99),'drop'),toast('Airdrop nearby'));
case r<.52:return(player.f+=2,player.junk+=4,toast('Locals gave supplies'));
case r<.68:return(sus(28),toast('Regime sweep'));
}};
const sleep=()=>{
if(!started||ended||mini)return;
const safe=[...towns,...shelters].some(o=>at(o,player.x,player.y));
if(!safe&&!confirm('Sleep here anyway?'))return;
sus(safe?-9:16);
if(!safe&&Math.random()<.65&&player.f)player.f--;
close();
night();
};
const night=()=>{
player.f=Math.max(0,player.f-1);
if(!player.f)sus(14);
state.weather==='heatwave'?player.f=Math.max(0,player.f-1):state.weather==='rain'&&(player.w=Math.min(player.cap,player.w+3),Array.from({length:10},()=>addQ(R(N),R(N),3)));
for(const s of structures)switch(s.t){case'well':addQ(s.x,s.y,tech.purifier?5:4);break;case'solar':addQ(s.x,s.y,tech.purifier?4:3);break;case'garden':if(Math.random()<.7)player.seeds=Math.min(player.seeds+3,30)}
for(const t of towns){let need=t.need,queue=[[t.x,t.y]],seen=new Set([I(t.x,t.y)]);for(let h=0;h<queue.length&&need>0;h++){const[x,y]=queue[h],take=Math.min(Q(x,y),need);if(take){need-=take;setQ(x,y,Q(x,y)-take)}for(const[dx,dy]of D){const X=x+dx,Y=y+dy,k=I(X,Y);if(inside(X,Y)&&pipes.has(k)&&!seen.has(k)){seen.add(k);queue.push([X,Y])}}}t.need=need;t.st=need?Math.max(-2,t.st-1):Math.min(3,t.st+1);if(!need)t.need=28+R(22)}
event();
if(pipes.size&&Math.random()<(tech.reinforced?.12:.37)){const a=[...pipes];pipes.delete(a[R(a.length)])}
for(let i=towns.length-1;i>=0;i--)if(towns[i].st<-1){K.destroy(towns[i].visual);towns.splice(i,1)}
const w=state.day<6?['clear','clear','heatwave','rain']:['clear','sandstorm','heatwave','rain'];
state.weather=w[R(w.length)];
state.day++;
state.time=480;
save(true);
if(state.susp>=100)return end(false,'Arrested');
if(!towns.length)return end(false,'All towns perished');
if(towns.every(t=>t.st>=3))return end(true,'All towns stable');
};
const end=(win,msg)=>{ended=true;$('splash-text').textContent=(win?'MISSION SUCCESS — ':'MISSION FAILED — ')+msg;$('splash').style.display='flex'};
const save=(quiet=false)=>{K.setData(SAVE,{version:6,player,state:{...state,buildMode:false,selectedBuild:null},tech,world,pipes:[...pipes],water,...Object.fromEntries(['towns','shops','works','shelters','posts','patrols','structures'].map((n,i)=>[n,clean(groups()[i])]))});if(!quiet)toast('Saved')};
const load=()=>{
const d=K.getData(SAVE);
if(d?.version!==6)return toast('No compatible save');
groups().flat().forEach(o=>o.visual&&K.destroy(o.visual));
[player,state,tech,world,pipes,water]=[{...START,...d.player},{...BASE,...d.state,buildMode:false,selectedBuild:null},{...TECH,...d.tech},d.world,new Set(d.pipes||[]),d.water||{}];
[towns,shops,works,shelters,posts,patrols,structures]=['towns','shops','works','shelters','posts','patrols','structures'].map(n=>d[n]||[]);
install();
operative.pos=V(player.x*T,player.y*T);
camera();
ended=false;
$('splash').style.display='none';
toast('Loaded');
};
const map=$('map').getContext('2d');
const minimap=()=>{
const s=150/N;
map.fillStyle='#111';
map.fillRect(0,0,150,150);
for(let y=0;y<N;y++)for(let x=0;x<N;x++){const q=world[y][x];if(q.exp){map.fillStyle=q.dug?'#444':['#3d311e','#2e412d','#3d3d4c'][q.reg];map.fillRect(x*s,y*s,s+.2,s+.2)}}
map.fillStyle='#0cf';
for(const k of pipes){const[x,y]=k.split(',').map(Number);map.fillRect(x*s,y*s,2,2)}
map.fillStyle='#fff';
map.fillRect(player.x*s-2,player.y*s-2,5,5);
};
const hud=()=>{
const f={w:player.w,cap:player.cap,f:player.f,m:player.m,c:player.c,p:player.p,junk:player.junk,wire:player.wire,bat:player.battery,s:Math.floor(state.susp),d:state.day};
for(const[k,v]of Object.entries(f))$('ui-'+k).textContent=v;
$('ui-time').textContent=[Math.floor(state.time/60),Math.floor(state.time%60)].map(n=>String(n).padStart(2,'0')).join(':');
$('ui-weather').textContent=({clear:'☀️',sandstorm:'🌪️',heatwave:'🥵',rain:'🌧️'}[state.weather])+' '+state.weather.toUpperCase();
$('ui-mode').textContent=state.buildMode?'[PLACE '+state.selectedBuild.toUpperCase()+']':state.pipeMode?'[PIPE MODE]':'[DIG MODE]';
};
const begin=()=>{if(started)return;started=true;suppress=K.time()+.15;$('intro').style.display='none';K.canvas.focus();toast('Mission started')};
reset();
K.add([K.z(-20),{draw:terrain}]);
install();
const operative=K.add([K.pos(player.x*T,player.y*T),K.z(10),{draw(){art('player')}}]);
camera();
hud();
minimap();
$('close-panel').onclick=close;
$('restart-button').onclick=()=>location.reload();
K.onKeyPress(key=>{
if(!started)return key==='enter'?begin():undefined;
switch(key){
case'escape':return(state.buildMode=false,state.selectedBuild=null,close());
case'l':return load();
case'k':return save();
case'space':return mini?miniTap():!panelOpen()?tool():undefined;
case'c':return !mini&&!ended?craft():undefined;
case'enter':return !mini&&!ended&&K.time()>=suppress?sleep():undefined;
case'e':return !mini&&!ended&&!panelOpen()?interact():undefined;
case'p':return(state.pipeMode=!state.pipeMode,state.buildMode=false,state.selectedBuild=null,toast(state.pipeMode?'Pipe mode':'Dig mode'));
}});
K.onMousePress('left',()=>{
if(!started||ended||!state.buildMode||panelOpen())return;
const p=K.toWorld(K.mousePos());
build(Math.floor(p.x/T),Math.floor(p.y/T));
});
K.onMouseMove(()=>{
const p=K.toWorld(K.mousePos());
mouse={x:Math.floor(p.x/T),y:Math.floor(p.y/T)};
});
K.onUpdate(()=>{
if(!started||ended)return;
const dt=Math.min(K.dt(),.1);
mini&&(mini.left-=dt*1000,mini.left<=0&&(mini=null,$('mini-game').style.display='none',toast('Assembly failed')));
if(!panelOpen()&&!mini)movement(dt);
state.time+=dt*5.2;
if(state.time>=1440)state.time=480;
for(const p of patrols){p.a+=(Math.random()-.5)*.65*Math.sqrt(dt*60);const x=p.x+Math.cos(p.a)*p.speed*dt*60,y=p.y+Math.sin(p.a)*p.speed*dt*60;if(Math.hypot(x-p.ox,y-p.oy)>5)p.a+=Math.PI;else{p.x=x;p.y=y}p.visual.pos=V(p.x*T,p.y*T);if(Math.hypot(player.x-p.x,player.y-p.y)<2){sus(dt*3.5);if(K.time()-warn>4){warn=K.time();toast('Patrol nearby')}}}
if(state.susp>=100)return end(false,'Arrested');
hudt+=dt;
mapt+=dt;
if(hudt>.12){hudt=0;hud()}
if(mapt>.25){mapt=0;minimap()}
});
window.WaterlineDebug=Object.freeze({
getPlayer:()=>({...player}),
getState:()=>({...state}),
getTech:()=>({...tech}),
getTowns:()=>clean(towns),
getPipes:()=>[...pipes],
save,
load,
night,
craft,
interact,
tool,
begin
});
