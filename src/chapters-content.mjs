// Data-only authored chapter flights; all collision uses the ordinary flight engine.
const point=(x,y)=>({x,y});
const box=(l,r,b,t)=>[point(l,b),point(r,b),point(r,t),point(l,t)];
const dock=(id,x,y,radius=52)=>({id,x,y,radius});
const object=(id,kind,stage,polygons,details={})=>{
  const xs=polygons[0].map(p=>p.x),ys=polygons[0].map(p=>p.y);
  return {id,kind,stage,anchor:point((Math.min(...xs)+Math.max(...xs))/2,Math.min(...ys)),polygons,details};
};
const wind=(id,stage,l,r,b,t,direction,force)=>({id,stage,left:l,right:r,bottom:b,top:t,direction,force});
const gate=(id,stage,at,center,opening)=>({id,stage,label:'RAIN BREAK',axis:'y',at,spanMin:0,spanMax:510,center,opening,
  solids:[box(0,center-opening/2,at-16,at+16),box(center+opening/2,510,at-16,at+16)]});
const canopy=(id,st,l,r,y,c)=>object(id,'umbrella',st,[[point(l,y),point(r,y),point(r-25,y+55),point(c,y+100),point(l+25,y+55)],box(c-7,c+7,y-110,y)],{rimY:y});
const terrace=(id,st,l,r,y,thick=70)=>object(id,'press',st,[box(l,r,y,y+thick)],{passage:{left:l===0?r:0,right:r===510?l:510,bottom:y,top:y+thick}});
const horn=(id,st,y,c,width)=>{
  const l=c-width/2,r=c+width/2;
  return object(id,'radio',st,[[point(0,y-25),point(Math.max(0,l-35),y-70),point(l,y),point(l,y+40),point(0,y+40)],
    [point(Math.min(510,r+35),y-70),point(510,y-25),point(510,y+40),point(r,y+40),point(r,y)]],{apertures:[{x:c,y:y+15,width}]});
};
const machine=(id,st,at,center,opening,travel,rate,phase)=>({id,stage:st,label:'BREATHING PLATEN',axis:'y',at,spanMin:0,spanMax:510,center,opening,travel,rate,phase});
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function world(id,start,rests,goal,phrases,options={}){
  const top=goal.y+120,vertices=box(0,510,0,top);let bottom=0;
  const stages=phrases.map(([sid,title,end,x,y,hint])=>{const s={id:sid,title,minY:bottom,maxY:end,viewWidth:510,next:point(x,y),hint};bottom=end;return s;});
  stages.at(-1).maxY=top;
  return {worldVersion:3,course:'chapter-lab',seed:id,pattern:'authored',start,bounds:{minX:0,minY:0,maxX:510,maxY:top},
    finishY:goal.y,goal:{...goal,radius:42},cells:[{id:`${id}-room`,kind:'inventions',vertices}],
    boundaries:vertices.map((p,i)=>({x1:p.x,y1:p.y,x2:vertices[(i+1)%4].x,y2:vertices[(i+1)%4].y})),
    checkpoints:[dock('launch',start.x,start.y,48),...rests.map(([x,y],i)=>dock(`rest-${i+1}`,x,y))],gates:[],pockets:[],machines:[],objects:[],stages,...options};
}
const level=(id,chapterId,title,premise,kind,patentTitle,p,w)=>({id,chapterId,title,premise,patent:{id,kind,title:patentTitle,...p,radius:14},world:w});
export const CHAPTERS=freeze([
  {id:'rain-yard',title:'The Rain Yard',premise:'Read the gust, keep the useful drift, and find a quiet landing.',levelIds:['rain-1','rain-2','rain-3']},
  {id:'stampworks',title:'The Stampworks',premise:'Set up below the machinery; coast through, then spend momentum on braking.',levelIds:['stamp-1','stamp-2','stamp-3']},
  {id:'listening-towers',title:'The Listening Towers',premise:'Keep a signal through reversals; the last receiver brings the inventions together.',levelIds:['tower-1','tower-2','tower-3']},
]);
export const LEVELS=freeze([
  level('rain-1','rain-yard','Borrowed Gust','Choose exposed gusts or sheltered seams, cross the yard twice, and bank only when the weather changes.','umbrella','Gust-Pocket Lining',point(90,700),
    world('rain-1',point(255,130),[[350,1050],[150,2050]],point(280,2930),[
      ['choose','EXPOSURE OR SHELTER',440,280,380,'The broad rain break accepts a quiet left seam or a gust-assisted right launch.'],
      ['seam','LEAVE THE GUST',800,330,710,'Clear the low shelter rim before spending the borrowed drift. The notebook is down in the lee.'],
      ['bank','DRY SIDE BAY',1150,350,1050,'Brake into the right dry well; it is a setup, not a corner shortcut.'],
      ['cross','ACROSS THE YARD',1500,150,1450,'Move left above the high eave while the right exposure pushes outward.'],
      ['lee','QUIET LEFT SEAM',1800,115,1720,'Stay outside the rain screen before turning toward the sheltered landing.'],
      ['reset','STORM CHANGE',2200,150,2050,'Bank in the left well before the wind changes direction.'],
      ['return','BORROW THE RETURN',2580,330,2470,'Cross right through the broad opening, then counter the return gust.'],
      ['roof','QUIET ROOF',3050,280,2930,'Leave the exposure and brake below the quiet roof.'],
    ],{gates:[gate('low-rain','choose',350,270,330),gate('return-rain','return',2410,335,260)],
      objects:[canopy('low-shelter','seam',40,245,570,145),terrace('high-eave','cross',215,510,1310,55),terrace('rain-screen','lee',220,510,1670,90)],
      pockets:[wind('first-exposure','choose',300,510,200,900,1,120),wind('high-exposure','cross',280,510,1170,1550,1,150),wind('return-gust','return',0,250,2240,2630,1,130)]})),
  level('rain-2','rain-yard','Under the Eaves','Weave around overhang ends, reverse above each eave, then thread the broken roof without banking at every turn.','umbrella','Leeward Rain Gutter',point(85,820),
    world('rain-2',point(360,130),[[160,1150],[355,2210]],point(230,3230),[
      ['rim','FIRST OVERHANG',550,390,470,'Rise outside the right eave; do not turn into its underside.'],
      ['reverse','REVERSE INTO THE LEE',920,130,840,'Reverse left after the crown. The notebook requires a deeper sheltered turn.'],
      ['left-end','LEFT END OF THE EAVE',1250,160,1150,'Clear the hanging right roof through its left end and settle in the lee.'],
      ['weave','BACK TO THE RAIN',1640,390,1530,'Cross above the overhang; take the right end of the next left eave.'],
      ['under-roof','BROKEN ROOF SEAM',1950,280,1890,'Brake inward through the central break instead of following the exposed wall.'],
      ['high-lee','HIGH LEE BAY',2320,355,2210,'Finish the weave in the broad dry bay before the last reversal.'],
      ['last-eave','LAST OVERHANG',2780,125,2670,'Reverse left and climb outside the final right overhang.'],
      ['roof-cross','OVER THE GUTTER',3130,325,3030,'Turn back over the crown; shelter ends before the roof.'],
      ['home','AFTER THE RAIN',3350,230,3230,'Make a small left correction into the quiet landing.'],
    ],{objects:[canopy('first-eave','rim',30,300,380,170),canopy('hanging-eave','left-end',225,500,960,360),canopy('return-eave','weave',0,300,1450,170),
      object('split-roof','umbrella','under-roof',[box(0,175,1840,1900),box(385,510,1840,1900)],{}),canopy('last-eave','last-eave',220,510,2550,370)],
      pockets:[wind('lower-crossrain','rim',315,510,220,730,-1,100),wind('middle-crossrain','weave',320,510,1300,1780,-1,100),wind('roof-rain','last-eave',0,200,2390,2900,1,85)]})),
  level('rain-3','rain-yard','Turn the Umbrella','Trace two opposite canopy arcs, then unravel a connected folded sail. Bank in the quiet eyes before the final continuous transfer.','umbrella','Inside-Out Rain Sail',point(450,610),
    world('rain-3',point(260,130),[[180,1270],[340,2490]],point(255,3530),[
      ['peel','PEEL INTO THE STORM',600,435,530,'Take the right rim of the broad low sail.'],
      ['crown','OVER THE FIRST CROWN',950,185,880,'Turn left only above the crown; the outside notebook asks for a wider storm arc.'],
      ['eye','FIRST QUIET EYE',1410,180,1270,'Brake left into the eye and prepare the opposite turn.'],
      ['opposite','OPPOSITE CANOPY ARC',1860,85,1720,'The second broad sail calls for its left rim, not a copy of the first turn.'],
      ['sweep','RETURN OVER THE CROWN',2250,340,2160,'Sweep right across the second crown against the storm.'],
      ['bank','HIGH STORM EYE',2610,340,2490,'A wide right receiving bay gives the final sail its setup.'],
      ['third','THE LOWER FOLD',2940,345,2910,'Stay right of the wall-attached lower sail, then brake into the band above its crown.'],
      ['last-turn','UNFOLD THE HANGING RETURN',3370,155,3100,'Transfer left beneath the hanging return. Climb outside its left rim before correcting toward the roof.'],
      ['home','DRY LANDING',3650,255,3530,'Correct the surviving drift inside the quiet roof.'],
    ],{objects:[canopy('broad-low-sail','peel',95,360,440,230),canopy('opposite-sail','opposite',155,465,1570,315),
      canopy('high-offset-sail','third',0,270,2760,135),canopy('high-fold-return','last-turn',220,510,3070,375)],
      pockets:[wind('low-storm','peel',360,510,230,850,1,70),wind('opposite-storm','opposite',0,155,1450,2050,-1,70),wind('high-storm','third',350,510,2690,3220,1,90)]})),
  level('stamp-1','stampworks','Table Hop','Build height beside successive stepped benches, coast over each lip, and brake across the open terrace instead of stopping at every step.','press','Coasting Flywheel',point(440,780),
    world('stamp-1',point(125,130),[[350,1200],[150,2330]],point(310,3230),[
      ['low-rise','LOW BENCH SETUP',490,120,460,'Build height in the open left bay before crossing the first lip.'],
      ['coast','COAST ACROSS THE TERRACE',850,350,740,'Spend the rightward drift above the bench. The flywheel waits farther along the terrace.'],
      ['brake','BRAKE ABOVE THE STEP',1330,350,1200,'Clear the short upper step and settle in the wide right receiving bay.'],
      ['switch','LEFTWARD TRANSFER',1660,130,1570,'Cross left above the stepped bench before the right-hand terrace rises.'],
      ['high-rise','CLIMB THE FAR STEP',2060,130,1970,'Hold the left setup bay while the tall right bench passes below.'],
      ['recover','SPEND THE LEFT DRIFT',2450,150,2330,'Brake into the left receiving terrace; the upper transfer is continuous.'],
      ['high-coast','COAST ABOVE THE LAST LIP',2850,365,2740,'Cross above the short left bench, then keep room for a roofward brake.'],
      ['home','CLEAR THE BENCH',3350,310,3230,'Finish above the final right shelf, correcting rather than stopping.'],
    ],{objects:[object('stepped-low-bench','press','low-rise',[box(215,510,330,420),box(315,510,420,510)],{passage:{left:0,right:215,bottom:130,top:510}}),
      terrace('short-left-step','brake',0,240,950,70),object('stepped-far-bench','press','high-rise',[box(255,510,1550,1700),box(205,510,1700,1820)],{passage:{left:0,right:205,bottom:1550,top:1820}}),
      terrace('last-left-lip','high-coast',0,250,2580,65),terrace('roof-shelf','home',380,510,2960,55)]})),
  level('stamp-2','stampworks','Reverse Feed','Thread a reverse-feed tunnel, climb its exhaust chimney, then reverse twice through a second folded feed. The side bays are setup rooms, not rescue at every corner.','press','Reverse-Feed Governor',point(285,850),
    world('stamp-2',point(390,130),[[95,1320],[405,2680],[140,3530]],point(310,4030),[
      ['feed','RIGHT FEED SETUP',570,410,530,'Rise beside the low platen, then enter the left-running tunnel above its lip.'],
      ['tunnel','REVERSE UNDER THE CEILING',950,95,830,'Travel left below the hanging ceiling; the governor needs a middle-tunnel detour.'],
      ['chimney','LEFT EXHAUST CHIMNEY',1480,95,1320,'Do not rise into the ceiling until the left chimney is reached.'],
      ['transfer','FORWARD FEED TRANSFER',1810,395,1690,'Coast right over the ceiling and rise beside the next opposing platen.'],
      ['return-tunnel','FORWARD UNDERPASS',2220,405,2050,'Keep right under the upper hanging shelf, then climb at its open end.'],
      ['right-bay','RIGHT EXHAUST BAY',2820,405,2680,'Brake in the high right bay to prepare the final reverse feed.'],
      ['reverse-high','HIGH REVERSE FEED',3160,110,3040,'Move left under the last ceiling before turning upward.'],
      ['last-chimney','LAST LEFT CHIMNEY',3670,140,3530,'Climb outside the hanging shelf into the final quiet setup well.'],
      ['exit','QUIET FEED EXIT',4150,310,4030,'Transfer right only after the last roof is below you.'],
    ],{objects:[object('lower-folded-feed','press','feed',[box(0,315,420,580),box(195,510,960,1090)],{passage:{left:195,right:315,bottom:580,top:960}}),
      object('middle-folded-feed','press','return-tunnel',[box(0,300,1850,1980),box(0,260,2280,2420)],{passage:{left:300,right:510,bottom:1980,top:2280}}),
      object('upper-reverse-feed','press','reverse-high',[box(195,510,3200,3340),box(0,310,2850,2920)],{passage:{left:195,right:310,bottom:2920,top:3200}})]})),
  level('stamp-3','stampworks','Breathing Machine','Prepare in quiet chambers, follow three differently breathing press mouths, and use open exhaust bays to correct between them.','press','Breathing Escapement',point(100,900),
    world('stamp-3',point(250,130),[[330,1170],[165,2310]],point(270,3330),[
      ['setup','QUIET LOWER SETUP',440,270,360,'Build a steady climb before the first moving mouth.'],
      ['first-mouth','FOLLOW THE LOWER BREATH',780,265,650,'The broad mouth translates slowly. Follow it rather than hugging a wall.'],
      ['first-exhaust','FIRST EXHAUST CHAMBER',1300,330,1170,'Correct right through the open chamber; the notebook requires the left side bay.'],
      ['middle-setup','OFFSET PRESS SETUP',1630,170,1510,'Move left in quiet air before the second press begins to breathe.'],
      ['middle-mouth','THE SECOND BREATH',1970,180,1840,'This mouth starts offset and swings faster; clear its full moving lip.'],
      ['second-exhaust','QUIET CORRECTION BAY',2450,165,2310,'Catch the left receiving well after the exhaust gust, not inside the moving sweep.'],
      ['high-mouth','HIGH BREATHING CHAMBER',2890,325,2750,'Move right before the final wide mouth; its phase differs from the lower presses.'],
      ['exit','QUIET UPPER EXHAUST',3450,270,3330,'Clear the fixed exhaust shelves and brake in the open exit.'],
    ],{machines:[machine('lower-breath','first-mouth',620,260,250,45,1.1,0),machine('offset-breath','middle-mouth',1760,185,230,42,1.7,1.2),machine('high-breath','high-mouth',2700,325,240,40,.9,2.4)],
      objects:[terrace('quiet-left-bench','first-exhaust',0,170,1020,55),object('exhaust-shelves','press','exit',[box(0,150,3030,3100),box(385,510,3030,3100)],{passage:{left:150,right:385,bottom:3030,top:3100}})],
      pockets:[wind('middle-exhaust','second-exhaust',160,510,1880,2180,-1,95)]})),
  level('tower-1','listening-towers','Keep the Signal','Hold useful left drift through a descending pair of receivers, turn only beyond the rims, then carry the reply through the high receiving run.','radio','Drift-Holding Coil',point(90,970),
    world('tower-1',point(380,130),[[160,1330],[350,2500]],point(230,3330),[
      ['low-call','LOW RECEIVER APPROACH',570,280,460,'Start right and carry a small left drift through the first wide mouth.'],
      ['hold','HOLD THE LEFT DRIFT',970,175,850,'Keep the drift through the second offset mouth instead of reversing immediately.'],
      ['receive','LOW RECEIVING BAY',1450,160,1330,'Clear both rims and brake in the broad left bay. The coil lies farther left on the run.'],
      ['reply','CARRY THE RIGHT REPLY',1880,275,1750,'Build the reply before the next flared mouth; do not brake under its rim.'],
      ['high-run','HIGH RECEIVER RUN',2290,365,2160,'Keep right drift through the linked high mouths.'],
      ['bank','HIGH RECEIVING BAY',2620,350,2500,'Bank only after the sustained run is complete.'],
      ['return','RETURN SIGNAL',3020,205,2860,'A leftward reply crosses the last offset receiver.'],
      ['home','CLEAR FREQUENCY',3450,230,3330,'Correct above the flared rim and receive the quiet final signal.'],
    ],{objects:[horn('first-receiver','low-call',420,280,210),horn('drift-receiver','hold',800,175,210),horn('reply-receiver','reply',1690,275,210),horn('high-receiver','high-run',2110,365,200),horn('return-receiver','return',2850,205,220)]})),
  level('tower-2','listening-towers','Call and Answer','Linked receivers build a left call, right answer and continuous diagonal return. Bank after complete phrases, not after every mouth.','radio','Call-and-Answer Relay',point(95,1070),
    world('tower-2',point(400,130),[[335,1570],[180,3150]],point(255,4430),[
      ['call','THE LEFT CALL',540,160,430,'Set up left before the first narrow flared mouth.'],
      ['answer','THE RIGHT ANSWER',1030,350,910,'Reverse only after the low rim; the right mouth receives the answer.'],
      ['answer-catch','COMPLETE THE PAIR',1700,335,1570,'Bank after both mouths. The notebook requires a return across the open inter-horn chamber.'],
      ['second-call','CALL ACROSS THE TOWER',2190,170,2040,'Launch left toward the next mouth, with the wall still well outside the receiving seam.'],
      ['second-answer','ANSWER INTO THE RETURN',2840,365,2800,'Carry the right answer through the crosswind, then brake toward the slanted receiver inlet.'],
      ['third-call','THE CONTINUOUS LEFT RETURN',3260,180,3150,'Follow the listening channel left as it rises. The receiving well catches only above the outlet.'],
      ['high-answer','THE HIGH ANSWER',3750,350,3580,'From the quiet setup bay, carry a right reply through the high mouth.'],
      ['last-call','THE LAST CALL',4220,175,4050,'Return left through the last flared mouth without a new recovery well.'],
      ['home','CLEAR FREQUENCY',4550,255,4430,'Correct toward the centre only after the final rim is below.'],
    ],{objects:[horn('call-low','call',400,160,180),horn('answer-low','answer',900,350,180),horn('call-middle','second-call',2020,170,185),horn('answer-middle','second-answer',2500,345,185),
      object('call-linked','radio','third-call',[[point(0,2820),point(280,2820),point(95,3040),point(0,3040)],
        [point(450,2820),point(510,2820),point(510,3040),point(265,3040)]],{apertures:[{x:365,y:2835,width:170},{x:180,y:3025,width:170}]}),
      horn('answer-high','high-answer',3550,350,185),horn('call-high','last-call',4030,175,190)],
      pockets:[wind('answer-crosswind','second-answer',210,510,2180,2650,-1,65)]})),
  level('tower-3','listening-towers','Weatherworks Chorus','A three-act finale: storm-canopy arcs, a stepped breathing press transfer, then a linked radio reply. Recover between inventions, not every maneuver.','radio','Weatherworks Tuning Fork',point(455,670),
    world('tower-3',point(255,130),[[150,1460],[355,2900]],point(255,4430),[
      ['sail','ACT I: STORM SAIL',610,430,500,'Peel right around the sail; the notebook asks for the exposed outer arc.'],
      ['sail-turn','TURN OVER THE CROWN',1040,155,880,'Counter-flap above the crown and preserve a leftward reply.'],
      ['second-sail','THE OPPOSITE RIM',1590,150,1460,'Pass left of the high half-canopy and land in the invention-change bay.'],
      ['press-setup','ACT II: TERRACE SETUP',1970,130,1820,'Rise beside the stepped press before crossing its lip.'],
      ['breath','PRESS TO BREATH',2410,325,2260,'Cross right in the quiet transfer chamber before the breathing mouth.'],
      ['press-exit','CLEAR THE EXHAUST',3030,355,2900,'Follow the moving press, then correct into the wide high bay.'],
      ['radio-call','ACT III: LOW CALL',3500,175,3330,'Send a left reply through the low horn without another stop.'],
      ['radio-answer','THE ANSWERING RECEIVER',3970,350,3800,'Reverse right only after the rim; carry the answer to the high mouth.'],
      ['final-call','FINAL WEATHERWORKS REPLY',4310,205,4210,'The last mouth calls left again. Keep the correction above its rim.'],
      ['home','THE WEATHERWORKS SINGS',4550,255,4430,'Receive the combined inventions in the quiet central roof.'],
    ],{objects:[canopy('chorus-low-sail','sail',100,350,400,225),canopy('chorus-half-sail','second-sail',235,510,1110,370),
      object('chorus-stepped-press','press','press-setup',[box(220,510,1680,1760),box(315,510,1760,1840)],{passage:{left:0,right:220,bottom:1460,top:1840}}),
      horn('chorus-low-horn','radio-call',3280,175,190),horn('chorus-answer-horn','radio-answer',3760,350,195),horn('chorus-final-horn','final-call',4180,205,210)],
      machines:[machine('chorus-breath','press-exit',2540,325,240,38,1.2,.5)],pockets:[wind('chorus-storm','sail',350,510,260,920,1,65),wind('chorus-exhaust','press-exit',200,510,2600,2820,-1,65)]})),
]);
export function levelById(id){return LEVELS.find(l=>l.id===id);}
