// Render-only transients; never enter engine state, saves, or diagnostics.
export function createEffects(){return {flap:0,pickups:[],catch:null,objects:{},inventions:Object.fromEntries(['umbrella','press','radio'].map(kind=>[kind,{strength:0,near:false}]))};}
export function reactionStrength(fx,object){return fx.objects[object.id]?.strength||0;}
function distance(object,game){
 return Math.min(...object.polygons.map(points=>{
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  const dx=Math.max(Math.min(...xs)-game.x,0,game.x-Math.max(...xs));
  const dy=Math.max(Math.min(...ys)-game.y,0,game.y-Math.max(...ys));
  return Math.hypot(dx,dy);
 }));
}
export function noteFlap(fx){fx.flap=1;}
export function notePickup(fx,patent){
 if(fx.pickups.some(p=>p.id===patent.id))return;
 fx.pickups.push({id:patent.id,x:patent.x,y:patent.y,age:0});if(fx.pickups.length>3)fx.pickups.shift();
}
export function noteCatch(fx,id){fx.catch={id,age:0};}
export function tickEffects(fx,dt,game,world){
 if(!Number.isFinite(dt)||dt<=0)return [];
 dt=Math.min(dt,.05);fx.flap=Math.max(0,fx.flap-dt*4);
 for(const p of fx.pickups)p.age+=dt;fx.pickups=fx.pickups.filter(p=>p.age<.7);
 if(fx.catch){fx.catch.age+=dt;if(fx.catch.age>=.7)fx.catch=null;}
 const entered=new Set(),blend=1-Math.exp(-6*dt);
 for(const state of Object.values(fx.inventions)){state.strength=0;state.near=false;}
 for(const object of world.objects){
  const state=fx.objects[object.id]??=( {strength:0,near:false} ),gap=distance(object,game);
  const near=['playing','ready','docked'].includes(game.mode)&&gap<200;
  const proximity=near?Math.max(0,Math.min(1,(200-gap)/150)):0;
  const target=.9*proximity*proximity*(3-2*proximity);
  if(near&&!state.near)entered.add(object.kind);
  state.near=near;state.strength+=(target-state.strength)*blend;
  if(target===0&&state.strength<.001)state.strength=0;
  const kind=fx.inventions[object.kind];kind.strength=Math.max(kind.strength,state.strength);kind.near||=near;
 }
 return [...entered];
}
