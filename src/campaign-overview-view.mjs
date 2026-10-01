import {CHAPTERS,levelById} from './chapters-content.mjs?v=storm-campaign-public-20261001-v1';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function svg(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));return n;}
// A compressed static plan from authored polygons; never a simulation or collision surface.
function plan(world){const s=svg('svg',{viewBox:'0 0 66 118','aria-hidden':'true'}),height=world.finishY,width=world.bounds.right??510;
 s.append(svg('rect',{x:5,y:4,width:56,height:108,rx:3,class:'plan-frame'}));
 const x=v=>7+v/width*52,y=v=>109-v/height*101;
 for(const o of world.objects)for(const polygon of o.polygons)s.append(svg('polygon',{points:polygon.map(p=>`${x(p.x)},${y(p.y)}`).join(' '),class:`plan-${o.kind}`}));
 for(const c of world.checkpoints)s.append(svg('circle',{cx:x(c.x),cy:y(c.y),r:1.8,class:'plan-well'}));
 s.append(svg('circle',{cx:x(world.start.x),cy:y(world.start.y),r:2.6,class:'plan-start'}),svg('circle',{cx:x(world.goal.x),cy:y(world.goal.y),r:3,class:'plan-goal'}));return s;
}
export function renderOverview(model,{onSelect,onLaunch,onReport,onRestart,saveInvalid,formatTime}){
 const board=$('route-board');board.replaceChildren();const lines=svg('svg',{class:'route-wiring','aria-hidden':'true'});board.append(lines);
 for(const [i,c] of CHAPTERS.entries()){
  const chapter=el('section',`route-chapter chapter-${i+1}`),nodes=model.nodes.filter(n=>n.chapterId===c.id),open=nodes.some(n=>n.unlocked);
  const heading=el('h2','route-chapter-title');heading.append(el('span','chapter-index',`0${i+1}`),el('span','',open?c.title.replace('The ',''):'Uncharted weatherworks'),el('small','',open?`${nodes.filter(n=>n.filed).length}/3 FILED`:'SEALED'));chapter.append(heading);
  const row=el('div','route-stops');
  for(const n of (i===1?[...nodes].reverse():nodes)){
   const b=el('button',`route-node${n.selected?' is-selected':''}${n.current?' is-current':''}${n.filed?' is-filed':''}`);b.dataset.level=n.id;b.disabled=!n.unlocked;b.setAttribute('aria-label',n.unlocked?`Flight ${n.number}: ${n.title}${n.filed?', filed':''}`:`Flight ${n.number}, locked`);b.setAttribute('aria-pressed',String(n.selected));if(n.current)b.setAttribute('aria-current','step');
   b.append(el('span','route-pin',n.filed?'✓':n.unlocked?String(n.number).padStart(2,'0'):'·'));
   const face=el('span','route-face');if(n.unlocked)face.append(plan(levelById(n.id).world));else face.append(el('span','route-lock','⌁'));
   b.append(face,el('span','route-label',n.title??`FLIGHT ${String(n.number).padStart(2,'0')}`));b.onclick=()=>onSelect(n.id);row.append(b);
  }
  chapter.append(row);board.append(chapter);
 }
 const d=model.detail,detail=$('flight-detail');detail.dataset.level=d.id;
 $('detail-number').textContent=`FLIGHT ${String(model.nodes.find(n=>n.selected).number).padStart(2,'0')} · ${d.filed?'FILED':d.resumable?'IN PROGRESS':'READY'}`;
 $('detail-title').textContent=d.title;$('detail-premise').textContent=d.premise;$('detail-plan').replaceChildren(plan(d.world));
 $('detail-best').textContent=d.bestMs===null?'NO FULL-FLIGHT BEST':`BEST ${formatTime(d.bestMs)}`;
 $('detail-patent').textContent=d.patentTitle?`✓ ${d.patentTitle}`:'○ OPTIONAL PATENT';
 $('campaign-start').textContent=d.resumable?'RESUME FLIGHT ↗':d.filed?'REPLAY FULL FLIGHT ↗':'FLY THIS FLIGHT ↗';$('campaign-start').disabled=false;$('campaign-start').onclick=()=>onLaunch(d.id,d.resumable);
 $('continue-flight').hidden=!d.finishedActive;$('continue-flight').textContent='VIEW FILED FLIGHT ↗';$('continue-flight').onclick=onReport;
 $('campaign-summary').textContent=model.completedCount===9?'THE WEATHERWORKS IS FILED.':'TRACE THE ROUTE · FILE THE NEXT FLIGHT';
 $('campaign-restart').hidden=model.completedCount===0;$('campaign-new').disabled=saveInvalid;$('campaign-new').onclick=onRestart;
 const rect=board.getBoundingClientRect();lines.setAttribute('viewBox',`0 0 ${rect.width||330} ${rect.height||360}`);
 const points=model.nodes.map(n=>{const r=board.querySelector(`[data-level="${n.id}"] .route-face`).getBoundingClientRect();return `${r.x+r.width/2-rect.x},${r.y+r.height/2-rect.y}`;});
 lines.append(svg('polyline',{points:points.join(' '),class:'route-unfiled'}),svg('polyline',{points:points.slice(0,Math.min(9,model.completedCount+1)).join(' '),class:'route-filed'}));
}
