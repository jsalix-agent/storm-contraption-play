export function createFeedback({contextFactory=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;},haptic=pattern=>globalThis.navigator?.vibrate?.(pattern)}={}) {
  let context=null,master=null,unlocked=false,sound=true,haptics=false;
  function configure(options={}) {
    if(typeof options.sound==='boolean')sound=options.sound;
    if(typeof options.haptics==='boolean')haptics=options.haptics;
    if(master)master.gain.value=sound?.65:0;
  }
  async function unlock() {
    if(!sound)return false;
    try {
      context??=contextFactory();
      if(!context)return false;
      if(!master){master=context.createGain();master.gain.value=.65;master.connect(context.destination);}
      await context.resume();unlocked=context.state==='running';return unlocked;
    } catch {unlocked=false;return false;}
  }
  function note(frequency,end,delay,duration,type='triangle',volume=.065) {
    const t=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration+.02);
  }
  function cue(kind,intensity=1) {
    if(haptics){try{if(kind==='crash')haptic(28);else if(kind==='checkpoint'||kind==='win')haptic([12,35,12]);else if(kind==='patent')haptic(6);}catch{/* Optional on unsupported browsers. */}}
    if(!sound||!unlocked||context?.state!=='running')return;
    const strength=Math.max(.2,Math.min(1,intensity));
    if(kind==='flap')note(95+50*strength,65,0,.085,'triangle',.025+.03*strength);
    else if(kind==='crash')note(180,38,0,.15,'sawtooth',.05);
    else if(kind==='checkpoint'){note(440,440,0,.1);note(660,660,.07,.12);}
    else if(kind==='win'){for(let i=0;i<4;i++)note([440,550,660,880][i],[440,550,660,880][i],i*.085,.18);}
    else if(kind==='wind-entry')note(170,95,0,.16,'sine',.015);
    else if(kind==='umbrella')note(235,180,0,.11,'sine',.015*strength);
    else if(kind==='press'){note(90,70,0,.06,'triangle',.018*strength);note(125,80,.045,.06,'triangle',.012*strength);}
    else if(kind==='radio'){note(660,700,0,.1,'sine',.013*strength);note(880,880,.05,.08,'sine',.01*strength);}
    else if(kind==='patent'){note(530,530,0,.08,'triangle',.028*strength);note(795,795,.055,.1,'sine',.024*strength);}
    else if(kind==='quiet')note(165,130,0,.18,'sine',.009*strength);
  }
  return {configure,unlock,cue,state:()=>({available:Boolean(context),unlocked,sound,haptics,contextState:context?.state||'locked'})};
}
