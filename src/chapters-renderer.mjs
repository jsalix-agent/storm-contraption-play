// The lab uses the accepted camera, collider art and invention feedback.
import {stageAt,activeMachines} from './alpha3-game.mjs?v=storm-campaign-public-20261001-v1';
import {cameraTarget,smoothCamera} from './alpha3-view.mjs?v=storm-campaign-public-20261001-v1';
import {drawInvention,drawBasket} from './alpha3-art.mjs?v=storm-campaign-public-20261001-v1';
import {drawPatents,drawReactions} from './alpha4-art.mjs?v=storm-campaign-public-20261001-v1';
import {reactionStrength} from './alpha4-effects.mjs?v=storm-campaign-public-20261001-v1';
import {visibleWorldRain} from './expedition-weather.mjs?v=storm-campaign-public-20261001-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const files=[...['foundry','graveyard','spire'].flatMap(c=>['depth','mid','haze'].map(p=>`${c}-${p}.webp`)),
 'scrap-photostrip.webp','wall-lining.webp','wind-ribbon.webp','wind-arrow.webp','goal-iris.webp',
 'craft-body.webp','craft-wing-radio.webp','craft-wing-gears.webp','alpha3-umbrella-cloth.webp','alpha3-press-steel.webp','alpha3-radio-brass.webp'];
const images=Object.fromEntries(files.map(file=>{const image=new Image();image.src=new URL(`../assets/${file}?v=storm-campaign-public-20261001-v1`,import.meta.url);return [file.replace('.webp',''),image];}));
Promise.all(Object.values(images).map(i=>i.decode())).then(()=>document.documentElement.dataset.art='ready').catch(()=>document.documentElement.dataset.art='missing');
const ready=key=>images[key]?.complete&&images[key].naturalWidth>0;
export function createRenderer(canvas,level){
 const ctx=canvas.getContext('2d'),world=level.world,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let camera=null,cssWidth=390,cssHeight=700,overlayHeight=265;
 const sy=y=>camera.height-(y-camera.bottom);
 function resize(){const r=canvas.getBoundingClientRect();cssWidth=Math.max(1,r.width);cssHeight=Math.max(1,r.height);overlayHeight=document.querySelector('.controls').getBoundingClientRect().height;canvas.width=Math.round(cssWidth);canvas.height=Math.round(cssHeight);camera=null;}
 function polygon(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,sy(p.y)):ctx.moveTo(p.x,sy(p.y)));ctx.closePath();}
 function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
 function ellipse(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
 function banks(bank){for(const points of bank.solids){const xs=points.map(p=>p.x),ys=points.map(p=>sy(p.y)),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;if(y>camera.height+30||y+h< -30)continue;
  ctx.save();polygon(points);ctx.clip();ctx.fillStyle='#536069';ctx.fillRect(x,y,w,h);if(ready('scrap-photostrip'))ctx.drawImage(images['scrap-photostrip'],x,y,w,h);
  ctx.fillStyle='#101922';const cap=x+w/2<bank.center?x+w-7:x;ctx.fillRect(cap,y,7,h);for(const by of [y+5,y+h-5])ellipse(cap+3.5,by,2,2,'#eed2a0');
  for(let cx=x+23;cx<x+w-17;cx+=48){ellipse(cx,y+h/2,10,10,'#263c47','#d9c799');ellipse(cx,y+h/2,2.5,2.5,'#e6ba77');line(cx,y+h/2,cx+5,y+h/2-6,'#d9c799',2);}
  ctx.restore();polygon(points);ctx.strokeStyle='#ecd6a8';ctx.lineWidth=1.7;ctx.stroke();}}
 function drawWind(t){for(const p of world.pockets){const top=sy(p.top),bottom=sy(p.bottom);if(bottom<0||top>camera.height)continue;ctx.save();ctx.fillStyle='#9cd8d615';ctx.fillRect(p.left,top,p.right-p.left,bottom-top);if(ready('wind-ribbon'))for(const edge of [top,bottom])ctx.drawImage(images['wind-ribbon'],p.left+4,edge-5,p.right-p.left-8,10);ctx.beginPath();ctx.rect(p.left,top,p.right-p.left,bottom-top);ctx.clip();for(let i=0;i<7;i++){const phase=((i*.17+(reduced.matches?0:t*.2*p.direction))%1+1)%1,x=p.left+phase*(p.right-p.left),y=top+15+(i*37)%Math.max(1,bottom-top-30);if(ready('wind-arrow')){ctx.save();ctx.translate(x,y);ctx.scale(p.direction,1);ctx.globalAlpha=.6;ctx.drawImage(images['wind-arrow'],-15,-7,30,14);ctx.restore();}else line(x-10*p.direction,y,x+10*p.direction,y,'#a5dfd0',2);}ctx.restore();}}
 function drawKite(game,wing,effects){const wingDraw=reduced.matches?wing:Math.max(wing,.9*Math.sin(effects.flap*Math.PI)),x=game.x,y=sy(game.y);ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/2-game.angle);ellipse(3,7,16,7,'#020b12aa');
  if(ready('craft-body')){if(ready('craft-wing-radio')){ctx.save();ctx.translate(-7,-3);ctx.rotate(.36-wingDraw*1.02);ctx.scale(-1,1);ctx.drawImage(images['craft-wing-radio'],0,-10,16,18);ctx.restore();}if(ready('craft-wing-gears')){ctx.save();ctx.translate(7,-3);ctx.rotate(-.18+wingDraw*1.02);ctx.drawImage(images['craft-wing-gears'],0,-11,19,18);ctx.restore();}ctx.drawImage(images['craft-body'],-12,-20,24,32);}
  ellipse(0,0,8,10,'#e6c79242','#f9eac8');ellipse(0,1,2.5,2.5,'#f8bd72');line(-5,-14,5,-14,'#fce5a4',2);ctx.restore();}
 function render({game,run,effects,wing,trail,particles,ending,time},dt=0){
  if(game.mode!=='dead'||!camera){const stage={...stageAt(game)},dock=world.checkpoints.find(p=>p.id===game.checkpoint);if(dock&&dock.id!=='launch'&&Math.hypot(stage.next.x-dock.x,stage.next.y-dock.y)<1)stage.next=world.stages[world.stages.findIndex(s=>s.id===stage.id)+1]?.next||world.goal;if(ending&&!reduced.matches)stage.viewWidth+=30*ending;const target=cameraTarget(game,stage,cssHeight,cssWidth,overlayHeight);const min=world.bounds.minX-24,max=world.bounds.maxX-target.viewWidth+24;target.left=min<=max?clamp(target.left,min,max):(world.bounds.minX+world.bounds.maxX-target.viewWidth)/2;camera=smoothCamera(camera,target,dt);}
  ctx.setTransform(canvas.width/camera.viewWidth,0,0,canvas.width/camera.viewWidth,0,0);ctx.clearRect(0,0,camera.viewWidth,camera.height);ctx.save();ctx.translate(-camera.left,0);ctx.fillStyle='#0c1925';ctx.fillRect(camera.left,0,camera.viewWidth,camera.height);
  const name=level.chapterId==='rain-yard'?'spire':level.chapterId==='stampworks'?'foundry':'graveyard';
  for(const [layer,rate] of [['depth',.07],['mid',.22],['haze',.36]]){const key=`${name}-${layer}`;if(!ready(key))continue;const tw=780,th=1280,xs=((camera.left*rate%tw)+tw)%tw,ys=((camera.bottom*rate%th)+th)%th;ctx.save();ctx.globalAlpha=1-ending;for(let x=camera.left-xs;x<camera.left+camera.viewWidth;x+=tw)for(let y=-ys;y<camera.height;y+=th)ctx.drawImage(images[key],x,y,tw,th);ctx.restore();}
  if(ending){ctx.save();ctx.globalAlpha=ending;const sky=ctx.createLinearGradient(0,0,0,camera.height);sky.addColorStop(0,'#b8cfba');sky.addColorStop(1,'#426778');ctx.fillStyle=sky;ctx.fillRect(camera.left,0,camera.viewWidth,camera.height);ctx.restore();}
  ctx.save();ctx.globalAlpha=1-ending;
  for(const w of world.boundaries){line(w.x1,sy(w.y1),w.x2,sy(w.y2),'#121e2b',11);if(w.x1===w.x2&&ready('wall-lining')){const from=Math.max(Math.min(w.y1,w.y2),camera.bottom),to=Math.min(Math.max(w.y1,w.y2),camera.bottom+camera.height);for(let y=Math.floor(from/192)*192;y<to;y+=192){const start=Math.max(y,from),end=Math.min(y+192,to);ctx.drawImage(images['wall-lining'],0,(y+192-end)*2,40,(end-start)*2,w.x1-5.5,sy(end),11,end-start);}}line(w.x1,sy(w.y1),w.x2,sy(w.y2),'#b99963',3);}
  drawWind(time);world.gates.forEach(banks);activeMachines(game).forEach(b=>{banks(b);for(const dir of [-1,1])ellipse(b.center+dir*(b.opening/2+12),sy(b.at),8,8,'#45515a','#e1c795');});
  for(const object of world.objects){drawInvention(ctx,object,sy,images,time);drawReactions(ctx,object,sy,time,reactionStrength(effects,object),reduced.matches);}
  for(const p of world.checkpoints)drawBasket(ctx,p,sy,game.heldCheckpoint===p.id||game.homingCheckpoint===p.id,time,game.checkpoint===p.id,effects.catch?.id===p.id?1-effects.catch.age/.7:0,reduced.matches);
  drawPatents(ctx,[level.patent],run.collected,sy,time,reduced.matches);const g=world.goal,y=sy(g.y),r=g.radius*(reduced.matches?1:1+.025*Math.sin(time*2));ellipse(g.x,y,r,r,'#a6d6c12a','#f6e9bf');if(ready('goal-iris'))ctx.drawImage(images['goal-iris'],g.x-r,y-r*.75,r*2,r*1.5);ctx.restore();
  if(!reduced.matches&&trail.length>1){ctx.beginPath();trail.forEach((p,i)=>i?ctx.lineTo(p.x,sy(p.y)):ctx.moveTo(p.x,sy(p.y)));ctx.strokeStyle='#f2d18b60';ctx.lineWidth=1.3;ctx.stroke();}
  for(const p of particles)ellipse(p.x,sy(p.y),2,2,p.color);
  if(!reduced.matches){if(effects.flap>0){const dx=Math.cos(game.angle),dy=Math.sin(game.angle),power=effects.flap;ctx.save();ctx.globalAlpha=power*.6;for(const side of [-1,0,1]){const x=game.x-dx*12-dy*side*7,y=game.y-dy*12+dx*side*7;line(x,sy(y),x-dx*(10+(1-power)*22),sy(y-dy*(10+(1-power)*22)),'#ece5c6',1.6);}ctx.restore();}for(const pickup of effects.pickups){const progress=pickup.age/.7;for(let i=0;i<3;i++){const x=pickup.x+(i-1)*(5+progress*29)+Math.sin(progress*5+i)*5,y=pickup.y+progress*52+Math.sin(progress*Math.PI)*8;ctx.save();ctx.globalAlpha=1-progress;ctx.translate(x,sy(y));ctx.rotate((i-1)*.4+progress*(i%2?-1:1));ctx.fillStyle='#f3dc9e';ctx.fillRect(-5,-4,10,8);ctx.restore();}}}
  drawKite(game,wing,effects);if(game.mode==='dead'&&game.impact){const p=game.impact;ellipse(p.contactX,sy(p.contactY),8,8,null,'#ffb795');line(p.x,sy(p.y),p.contactX,sy(p.contactY),'#ffd0b3',2);}ctx.restore();
  if(!reduced.matches)for(const drop of visibleWorldRain(camera.left,camera.bottom,camera.height,time,camera.viewWidth)){if(((drop.column+drop.row)%10+10)%10/10<ending)continue;ctx.fillStyle='#d4dace23';ctx.fillRect(drop.x-camera.left,camera.height-(drop.y-camera.bottom),1.2,drop.length*.65);}
 }
 resize();return {resize,render,view:()=>camera?{...camera,cssWidth,cssHeight,overlayHeight}:null};
}
