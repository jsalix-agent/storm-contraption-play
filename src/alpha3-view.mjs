const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function receivingTarget(state,stage,world) {
  const basket=id=>{const p=world.checkpoints.find(p=>p.id===id);return p?{x:p.x,y:p.y}:stage.next;};
  const pressBay=()=>{
    const table=world.objects.find(p=>p.kind==='press')?.polygons[0];
    return table?{x:(world.bounds.minX+Math.min(...table.map(p=>p.x)))/2,y:(Math.min(...table.map(p=>p.y))+Math.max(...table.map(p=>p.y)))/2}:stage.next;
  };
  if(stage.id==='tutorial'){
    const next=[...world.gates,...world.machines].filter(p=>p.at>state.y+20).sort((a,b)=>a.at-b.at)[0];
    return next?{x:next.center,y:next.at}:basket('workshop');
  }
  if(stage.id==='umbrella')return state.checkpoint==='umbrella-top'?pressBay():basket('umbrella-top');
  if(stage.id==='press')return state.checkpoint==='press-exit'?basket('radio-entry'):state.checkpoint==='umbrella-top'&&state.y<world.objects.find(p=>p.kind==='press')?.details.passage.bottom-30?pressBay():basket('press-exit');
  if(stage.id==='radio'){
    if(state.checkpoint==='antenna')return {x:world.goal.x,y:world.goal.y};
    const next=world.objects.find(p=>p.kind==='radio')?.details?.apertures?.find(p=>p.y+20>state.y);
    return next?{x:next.x,y:next.y}:basket('antenna');
  }
  return stage.next;
}
export function cameraTarget(state,stage,cssHeight,cssWidth,overlayHeight=265) {
  const viewWidth=stage.viewWidth||390;
  const height=cssHeight*viewWidth/Math.max(1,cssWidth);
  const usableHeight=Math.max(150,(cssHeight-overlayHeight)*viewWidth/Math.max(1,cssWidth));
  const next=stage.next||state;
  const dy=Math.max(0,next.y-state.y);
  const screenY=clamp(Math.max(usableHeight*.7,Math.min(dy+55,usableHeight-30)),70,usableHeight-20);
  const lead=clamp((state.vx||0)*.22,-75,75);
  const center=state.x+lead+clamp((next.x-state.x)*.22,-50,50);
  return {viewWidth,height,usableHeight,left:center-viewWidth/2,bottom:state.y-height+screenY,focusX:state.x,focusY:state.y};
}
export function smoothCamera(current,target,dt) {
  if(!current)return {...target};
  if(dt<=0)return {...current};
  const blend=(a,b,rate)=>a+(b-a)*(1-Math.exp(-rate*dt));
  const next={...target};
  for(const key of ['viewWidth','height','usableHeight'])next[key]=blend(current[key],target[key],3.5);
  // Track flight promptly, but ease receiver look-ahead separately. Store its
  // vertical offset as a ratio so zoom cannot kick the craft down the screen.
  for(const key of ['focusX','focusY'])next[key]=blend(current[key],target[key],10);
  const lookX=c=>c.left+c.viewWidth/2-c.focusX;
  const lookY=c=>(c.height-c.focusY+c.bottom)/c.viewWidth;
  next.left=next.focusX+blend(lookX(current),lookX(target),2.5)-next.viewWidth/2;
  next.bottom=next.focusY-next.height+blend(lookY(current),lookY(target),2.5)*next.viewWidth;
  return next;
}
export function cameraProject(point,camera) {
  return {x:point.x-camera.left,y:camera.height-(point.y-camera.bottom)};
}
export function impactMessage(impact) {
  return impact?.cause||'METAL CONTACT · TRY ANOTHER APPROACH';
}
