import { createGame, aimAt, flap, step, GATES, FINISH_Y, WORLD_WIDTH, WIND_POCKETS, windPocketAt, MACHINE, machineCenter } from './physics.mjs?v=graveyard-v1';
import { CHAPTERS, PLANES, chapterWeights, planeTop, clippingTop } from './parallax.mjs?v=collage-full-v1';
import { rainPosition } from './weather.mjs?v=collage-details-v1';

const $ = (id) => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d');
const art = Object.fromEntries([
  ...CHAPTERS.flatMap(({ name }) => PLANES.map(({ name: plane }) => [`${name}-${plane}`, `${name}-${plane}.webp`])),
  ['strip', 'scrap-photostrip.webp'],
  ['gears', 'gears-clipping.webp'], ['radio', 'radio-clipping.webp'],
  ['body', 'craft-body.webp'], ['leftWing', 'craft-wing-radio.webp'],
  ['rightWing', 'craft-wing-gears.webp'],
  ['wall', 'wall-lining.webp'], ['windRibbon', 'wind-ribbon.webp'],
  ['windArrow', 'wind-arrow.webp'], ['goal', 'goal-iris.webp'],
  ['mast', 'mast-cutout.webp'],
].map(([key, filename]) => {
  const image = new Image(); image.src = `${new URL(`../assets/${filename}`, import.meta.url).href}?v=collage-details-v1`;
  return [key, image];
}));
const artReady = image => image.complete && image.naturalWidth > 0;
const backdropCache = {};
function cacheBackdrop() {
  // Each chapter and depth plane stays movable; enough overscan for its active altitude span.
  for (const { name } of CHAPTERS) {
    for (const { name: plane, overscan, opacity } of PLANES) {
      const key = `${name}-${plane}`;
      if (!artReady(art[key])) continue;
      const layer = document.createElement('canvas');
      layer.width = WORLD_WIDTH; layer.height = Math.ceil(height + overscan * 2);
      const painter = layer.getContext('2d');
      painter.globalAlpha = opacity;
      painter.drawImage(art[key], 0, 0, layer.width, layer.height);
      backdropCache[key] = layer;
    }
  }
}
Promise.all(Object.values(art).map(image => image.decode()))
  .then(() => { cacheBackdrop(); document.documentElement.dataset.art = 'ready'; })
  .catch(() => { document.documentElement.dataset.art = 'missing'; });
const aimTrack = $('aim-track'), aimKnob = $('aim-knob');
const flapTrack = $('flap-track'), flapKnob = $('flap-knob');
const message = $('message'), death = $('death');
const pauseDialog = $('pause-dialog'), aboutDialog = $('about-dialog');
const BEST_KEY = 'storm-contraption-alpha1-best-v1';
const boundedAltitude = value => Math.min(FINISH_Y - 130, Math.max(0, Math.floor(value)));
let best = 0;
try {
  const stored = localStorage.getItem(BEST_KEY);
  if (stored !== null && /^(0|[1-9]\d{0,5})$/.test(stored) && Number(stored) <= FINISH_Y - 130) best = Number(stored);
} catch { /* Storage can be unavailable. */ }
function saveBest() { try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* Keep playing. */ } }
function currentAltitude() { return boundedAltitude(game.maxY - 130); }
function updateBest() {
  const altitude = currentAltitude();
  if (altitude > best) best = altitude;
  $('pause-best').textContent = `BEST ${best} m`;
  $('death-best').textContent = `BEST ${best} m`;
}
let game = createGame(), aim = .5, wing = 0, armed = true, downTravel = 0, upTravel = 0;
let aimHeld = false, wingHeld = false;
let height = 550, camera = 0, flash = 0, flashColor = '255,209,138', shake = 0, last = 0, stageIndex = -1;
let visualTime = 0, suspended = false, pageInactive = false, aboutWasSuspended = false, focusBeforePause = null;
let focusRecoveryUntil = 0, focusRecoveryTarget = null;
function focusAfterTouch(target) {
  focusRecoveryTarget = target; focusRecoveryUntil = performance.now() + 1200;
  target.focus({ preventScroll: true });
}
let pocketIndex = -1, cleared = new Set(), impactHold = 0;
const clearanceGates = GATES.map((g, i) => [`gate-${i}`, g.y, g.center, g.width]);
const particles = [];

// A visual cue and a stable, non-audio hook for optional future presentation.
function cue(kind, intensity = 1, x = game.x, y = game.y) {
  window.dispatchEvent(new CustomEvent('storm:cue', { detail: { kind, intensity } }));
  flash = Math.max(flash, (kind === 'crash' ? .33 : kind === 'win' ? .30 : .12) * intensity);
  flashColor = kind === 'crash' ? '255,113,94' : kind === 'wind-entry' ? '161,220,226' : '255,209,138';
  shake = Math.max(shake, (kind === 'crash' ? 8 : kind === 'win' ? 5 : kind === 'flap' ? 4 : 2) * intensity);
  const count = kind === 'win' ? 28 : kind === 'crash' ? 20 : kind === 'flap' ? 8 : 6;
  for (let i = 0; i < count && particles.length < 80; i++) {
    const a = i * 2.399, speed = (35 + (i % 5) * 24) * intensity;
    particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed + (kind === 'flap' ? -65 : 0), life: .35 + (i % 4) * .12, color: kind === 'crash' ? '#ff9675' : kind === 'wind-entry' ? '#a5e3db' : '#ffd292' });
  }
}
function clearance(key, y, center, width, previousY) {
  const margin = Math.min(game.x - (center - width / 2 + 11), center + width / 2 - 11 - game.x);
  if (cleared.has(key) || previousY > y + 27 || game.y <= y + 27 || margin <= 0) return;
  cleared.add(key);
  cue(margin < 16 ? 'near-miss' : key === 'machine' ? 'machine-clear' : 'gate-clear',
    margin < 16 ? 1 : key === 'machine' ? .8 : .45, game.x, y);
}

function updateAim(f) {
  aim = Math.max(0, Math.min(1, f));
  aimAt(game, aim);
  aimKnob.style.left = `${40.5 + aim * Math.max(0, aimTrack.clientWidth - 81)}px`;
  aimTrack.setAttribute('aria-valuenow', String(Math.round(aim * 180)));
  aimTrack.setAttribute('aria-valuetext', aim < .35 ? 'Left' : aim > .65 ? 'Right' : 'Up');
}
function aimFromPointer(e) {
  const r = aimTrack.getBoundingClientRect();
  updateAim((e.clientX - r.left - 40.5) / Math.max(1, r.width - 81));
}
function updateWing(next, timestamp) {
  next = Math.max(0, Math.min(1, next));
  const delta = next - wing;
  const dt = Math.max(16, timestamp - (updateWing.lastTime ?? timestamp));
  updateWing.lastTime = timestamp;
  wing = next;
  game.wing = wing;
  flapKnob.style.top = `${26 + wing * (flapTrack.clientHeight - 52)}px`;
  flapTrack.setAttribute('aria-valuenow', String(Math.round(wing * 100)));
  if (delta < 0) { upTravel += -delta; downTravel = 0; if (upTravel >= .24) armed = true; }
  if (delta > 0) {
    downTravel += delta; upTravel = 0;
    if (armed && downTravel >= .22) {
      armed = false;
      const speed = Math.min(1600, delta * (flapTrack.clientHeight - 52) * 1000 / dt);
      const kick = flap(game, speed);
      if (kick) {
        message.classList.add('dismissed');
        cue('flap', .6 + .4 * Math.min(1, kick / 270), game.x, game.y - 8);
      }
    }
  }
}
function wingFromPointer(e) {
  const r = flapTrack.getBoundingClientRect();
  updateWing((e.clientY - r.top - 26) / Math.max(1, r.height - 52), e.timeStamp);
}
const releaseCaptures = [];
function bindTrack(el, handler, onStart, onRelease) {
  let pointer = null;
  const clear = () => {
    if (pointer === null) return;
    const held = pointer; pointer = null;
    el.classList.remove('active'); onRelease?.();
    if (el.hasPointerCapture(held)) el.releasePointerCapture(held);
  };
  releaseCaptures.push(clear);
  el.addEventListener('pointerdown', e => {
    if (pointer !== null || suspended || pageInactive || document.hidden || game.mode === 'dead' || game.mode === 'won') return;
    focusRecoveryUntil = 0;
    e.preventDefault(); pointer = e.pointerId;
    el.setPointerCapture(pointer); el.classList.add('active');
    onStart?.(e); handler(e);
  });
  el.addEventListener('pointermove', e => { if (e.pointerId === pointer && !suspended && !pageInactive && !document.hidden) { e.preventDefault(); handler(e); } });
  const release = e => { if (e.pointerId !== pointer) return; pointer = null; el.classList.remove('active'); onRelease?.(); };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}
bindTrack(aimTrack, aimFromPointer, () => { aimHeld = true; }, () => { aimHeld = false; });
bindTrack(flapTrack, wingFromPointer, () => { wingHeld = true; updateWing.lastTime = undefined; }, () => { wingHeld = false; });
aimTrack.addEventListener('keydown', e => { if (!suspended && !pageInactive && !document.hidden && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); updateAim(aim + (e.key === 'ArrowLeft' ? -.05 : .05)); } });
flapTrack.addEventListener('keydown', e => { if (!suspended && !pageInactive && !document.hidden && ['ArrowUp','ArrowDown'].includes(e.key)) { e.preventDefault(); updateWing(wing + (e.key === 'ArrowDown' ? .25 : -.25), performance.now()); } });
function reset() {
  saveBest();
  game = createGame(); camera = 0;
  particles.length = 0; flash = 0; shake = 0; impactHold = 0;
  pocketIndex = -1; cleared = new Set();
  wing = 0; armed = true; downTravel = 0; upTravel = 0; aimHeld = false; wingHeld = false;
  updateWing.lastTime = undefined;
  flapKnob.style.top = '26px';
  flapTrack.setAttribute('aria-valuenow', '0');
  updateAim(.5); death.hidden = true; delete death.dataset.outcome; message.classList.remove('dismissed');
  document.querySelector('.topbar').inert = false;
  document.querySelector('.controls').inert = false;
  stageIndex = -1; updateHud();
  if (!pauseDialog.open) focusAfterTouch(aimTrack);
}
$('retry').addEventListener('click', reset);
function suspend() {
  suspended = true; last = 0;
  releaseCaptures.forEach(clear => clear());
  updateWing.lastTime = undefined;
  saveBest();
}
function resume() { suspended = false; last = 0; updateWing.lastTime = undefined; }
$('pause-button').addEventListener('click', () => {
  if (pauseDialog.open || aboutDialog.open || !death.hidden) return;
  focusBeforePause = document.activeElement;
  suspend(); updateBest(); pauseDialog.showModal(); $('resume').focus({ preventScroll: true });
});
pauseDialog.addEventListener('cancel', e => { e.preventDefault(); pauseDialog.close(); });
pauseDialog.addEventListener('close', () => {
  resume();
  const target = focusBeforePause === aimTrack || focusBeforePause === flapTrack ? focusBeforePause : aimTrack;
  focusAfterTouch(target);
});
$('resume').addEventListener('click', () => pauseDialog.close());
$('restart-run').addEventListener('click', () => { reset(); pauseDialog.close(); focusBeforePause = aimTrack; });
$('logo-button').addEventListener('click', () => {
  if (aboutDialog.open || pauseDialog.open) return;
  aboutWasSuspended = suspended;
  suspend(); aboutDialog.showModal(); $('close-about').focus({ preventScroll: true });
});
aboutDialog.addEventListener('cancel', e => { e.preventDefault(); aboutDialog.close(); });
aboutDialog.addEventListener('close', () => {
  if (!aboutWasSuspended) resume();
  focusAfterTouch($('logo-button'));
});
$('close-about').addEventListener('click', () => aboutDialog.close());
function updateHud() {
  updateBest();
  $('height').textContent = String(currentAltitude()).padStart(3, '0');
  const next = GATES.findIndex(g => game.maxY < g.y + 50);
  const idx = next < 0 ? GATES.length - 1 : next;
  const atMachine = game.maxY >= GATES[5].y + 50 && game.maxY < MACHINE.y + 50;
  const stage = atMachine ? 'machine' : idx;
  if (stage !== stageIndex) {
    stageIndex = stage;
    if (atMachine) $('stage').textContent = MACHINE.label;
    else {
      const [label, name] = GATES[idx].label.split(' · ');
      $('stage').innerHTML = `${name} <span> / ${label}</span>`;
    }
  }
  if ((game.mode === 'dead' && impactHold <= 0) || game.mode === 'won') {
    if (death.hidden) {
      death.dataset.outcome = game.mode;
      $('death-title').textContent = game.mode === 'won' ? 'YOU MADE IT.' : 'SCRAPPED.';
      $('death-details').textContent = game.mode === 'won' ? 'Above the storm. Somehow.' : `Highest climb: ${currentAltitude()} m`;
      saveBest();
      death.hidden = false;
      document.querySelector('.topbar').inert = true;
      document.querySelector('.controls').inert = true;
      focusAfterTouch($('retry'));
    }
  }
}
function resize() {
  const rect = canvas.getBoundingClientRect();
  // One canvas pixel per CSS pixel keeps touch responsive on slower phones.
  const dpr = 1;
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  height = rect.height * WORLD_WIDTH / rect.width;
  ctx.setTransform(canvas.width / WORLD_WIDTH, 0, 0, canvas.width / WORLD_WIDTH, 0, 0);
  cacheBackdrop();
  if (game.mode === 'ready') camera = 0;
  flapKnob.style.top = `${26 + wing * (flapTrack.clientHeight - 52)}px`;
  updateAim(aim);
}
window.addEventListener('resize', resize); resize(); updateAim(.5); updateHud();
document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) { releaseCaptures.forEach(clear => clear()); saveBest(); } });
window.addEventListener('pagehide', () => { pageInactive = true; last = 0; releaseCaptures.forEach(clear => clear()); saveBest(); });
window.addEventListener('pageshow', () => { pageInactive = false; last = 0; });

const sy = y => height - 75 - (y - camera);
function line(x1,y1,x2,y2,color,width=1) { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
function ellipse(x,y,rx,ry,fill,stroke) { ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();} }
function background(t) {
  ctx.fillStyle = '#0b1723'; ctx.fillRect(0, 0, 390, height);
  const weights = chapterWeights(camera, height);
  // Composite all distant photographs first, then all middle silhouettes,
  // then translucent weather. A chapter crossfade never flattens these rates.
  for (const { name: plane, rate, overscan } of PLANES) {
    for (const [index, { name, anchor }] of CHAPTERS.entries()) {
      const weight = weights[index];
      if (weight <= 0) continue;
      const layer = backdropCache[`${name}-${plane}`];
      if (!layer) continue;
      ctx.save();
      ctx.globalAlpha = plane === 'depth' && (index === 0 || (index === 1 && weights[0] === 0)) ? 1 : weight;
      ctx.drawImage(layer, 0, planeTop(camera, anchor, rate, overscan));
      ctx.restore();
    }
  }
  for(let i=0;i<10;i++) {
    let yy=((i*131 + camera*.18) % (height+180))-90;
    const xx=(i*137)%430-20;
    ellipse(xx,yy,50+i%3*18,15+i%4*5,'#e9d5af11');
    ellipse(xx+29,yy+10,62,13,'#0c1c2b30');
  }
  // An archival-turbine aperture marks the sky just above the finish line.
  if (camera + height * .54 > FINISH_Y - 650) {
    const e = sy(FINISH_Y + 20);
    if (artReady(art.goal)) ctx.drawImage(art.goal, 105, e - 64, 180, 128);
    else { ellipse(195,e,82,51,'#fff1ba14','#eccf8a66'); ellipse(195,e,42,28,'#ffdb9288'); }
  }
}
function rain(t) {
  // Drops fall in screen space. Camera motion belongs only to distant cloud
  // planes; otherwise this weather seems to rise and fall with the craft.
  for (let i = 0; i < 45; i++) {
    const { x, y } = rainPosition(i, t, height);
    if (y < -25 || y > height + 25) continue;
    ctx.fillStyle = i % 4 ? '#c5d3cd29' : '#ead9b43a';
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 7);
    ctx.lineTo(x + 2, y - 7);
    ctx.lineTo(x - 5, y + 13 + i % 4 * 3);
    ctx.lineTo(x - 6, y + 13 + i % 4 * 3);
    ctx.closePath(); ctx.fill();
  }
}
function stormWalls() {
  const period = 384;
  const drift = ((camera % period) + period) % period;
  for (const x of [0, 370]) {
    ctx.fillStyle = '#14222c'; ctx.fillRect(x, 0, 20, height);
    if (artReady(art.wall)) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, 0, 20, height); ctx.clip();
      if (x === 370) { ctx.translate(390, 0); ctx.scale(-1, 1); }
      for (let y = drift - period; y < height; y += period) {
        ctx.drawImage(art.wall, 0, y, 20, period);
      }
      ctx.restore();
    }
    // The uninterrupted inner seam remains at the real world-wall boundary.
    ctx.fillStyle = '#e5bd8866'; ctx.fillRect(x === 0 ? 19 : 370, 0, 1, height);
  }
}
function relayShaft() {
  const lower=GATES[4], upper=GATES[5];
  const top=sy(upper.y-18), bottom=sy(lower.y+18);
  if(bottom<0 || top>height) return;
  const left=upper.center-upper.width/2+12, right=upper.center+upper.width/2-12;
  ctx.save();
  ctx.fillStyle='#f6d79a0a';ctx.fillRect(left,top,right-left,bottom-top);
  // Radio-paper seams track the relay corridor; neither seam is solid.
  if (artReady(art.wall)) {
    for (const x of [left, right]) {
      ctx.save(); ctx.globalAlpha = .54;
      ctx.drawImage(art.wall, 12, 0, 16, 768, x - 4, top, 8, bottom - top);
      ctx.restore();
      for (let y = top + 16; y < bottom; y += 45) ellipse(x, y, 2, 2, '#d9bc8c88');
    }
  } else {
    line(left,top,left,bottom,'#edc88670',2);line(right,top,right,bottom,'#edc88670',2);
  }
  for(let y=top+25;y<bottom-12;y+=40) {
    // Paired photographic foil scraps point up through this non-solid corridor.
    if (artReady(art.strip)) {
      for (const side of [-1, 1]) {
        ctx.save(); ctx.translate(upper.center + side * 3, y + 1);
        ctx.rotate(side * .93);
        ctx.globalAlpha = .72;
        ctx.drawImage(art.strip, 115, 28, 28, 10, -7, -2, 14, 4);
        ctx.restore();
      }
    } else {
      line(upper.center-6,y+5,upper.center,y-3,'#f8d6a383',2);
      line(upper.center,y-3,upper.center+6,y+5,'#f8d6a383',2);
    }
  }
  ctx.restore();
}
function windPockets(t) {
  for (const pocket of WIND_POCKETS) {
    const top = sy(pocket.top), bottom = sy(pocket.bottom);
    if (bottom < -90 || top > height + 100) continue;
    ctx.save();
    ctx.fillStyle = '#8bd5d015'; ctx.fillRect(20, top, 350, bottom - top);
    // Torn cyan print strips mark the exact gust span, not another solid gate.
    if (artReady(art.windRibbon)) {
      ctx.drawImage(art.windRibbon, 20, top - 7, 350, 14);
      ctx.drawImage(art.windRibbon, 20, bottom - 7, 350, 14);
    } else {
      line(20, top, 370, top, '#9cddd4ac', 2);
      line(20, bottom, 370, bottom, '#9cddd4ac', 2);
    }
    // Die-cut arrows still show force direction before entry.
    ctx.beginPath(); ctx.rect(21, top + 2, 348, Math.max(0, bottom - top - 4)); ctx.clip();
    for (let i = 0; i < 11; i++) {
      const x = 28 + ((i * 71 + pocket.direction * t * (40 + i % 3 * 18) + 3500) % 330 + 330) % 330;
      const y = top + 10 + (i * 47 % Math.max(20, pocket.top - pocket.bottom - 20));
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + i * 2) * .3);
      if (i % 3 === 0) {
        if (artReady(art.radio)) { ctx.globalAlpha = .45; ctx.drawImage(art.radio, -6, -4, 12, 8); }
      } else {
        if (artReady(art.windRibbon)) {
          ctx.globalAlpha = .38;
          ctx.drawImage(art.windRibbon, i * 31 % 600, 0, 80, 28, -11, -3, 22, 7);
        }
      }
      ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      const y = top + 28 + i * 43;
      const x = 98 + (i % 2) * 138, d = pocket.direction;
      if (artReady(art.windArrow)) {
        ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
        ctx.drawImage(art.windArrow, -20, -10, 40, 20); ctx.restore();
      } else {
        line(x - d * 17, y, x + d * 17, y, '#bce9d9b0', 2);
        line(x + d * 17, y, x + d * 9, y - 6, '#bce9d9b0', 2);
        line(x + d * 17, y, x + d * 9, y + 6, '#bce9d9b0', 2);
      }
    }
    ctx.restore();
  }
}
function graveyard(t) {
  const y = sy(MACHINE.y), center = machineCenter(game.elapsed);
  if (y < -85 || y > height + 100) return;
  const left = center - MACHINE.width / 2, right = center + MACHINE.width / 2;
  ctx.save();
  // Only these two 32px-high banks are solid in physics. Nothing crosses the aperture.
  for (const [a, b, side] of [[20, left, -1], [right, 370, 1]]) {
    if (b <= a) continue;
    const detailX = side < 0 ? Math.max(36, left - 26) : Math.min(354, right + 26);
    // A photographed aerial is welded to the solid bank, never the opening.
    if (artReady(art.mast)) ctx.drawImage(art.mast, detailX - 16, y - 53, 32, 52);
    ctx.fillStyle = '#1a232d'; ctx.fillRect(a, y - 16, b - a, 32);
    ctx.fillStyle = '#8b6754'; ctx.fillRect(a, y - 12, b - a, 24);
    ctx.fillStyle = '#d4ab76'; ctx.fillRect(a, y - 16, b - a, 3);
    ctx.fillStyle = '#332e32'; ctx.fillRect(a, y + 10, b - a, 6);
    ctx.save(); ctx.beginPath(); ctx.rect(a + 2, y - 15, Math.max(0, b - a - 4), 30); ctx.clip();
    for (let i = 0; i < 4; i++) {
      const x = side < 0 ? a + 16 + i * 30 : b - 16 - i * 30;
      ellipse(x, y, 11, 11, '#344852', '#e4c797');
      for (let blade = 0; blade < 3; blade++) {
        const angle = t * (side < 0 ? 2 : -2) + blade * Math.PI * 2 / 3 + i;
        line(x + 3 * Math.cos(angle), y + 3 * Math.sin(angle), x + 9 * Math.cos(angle + .35), y + 9 * Math.sin(angle + .35), '#ddd5b7', 3);
      }
      ellipse(x, y, 2, 2, '#f4d391');
    }
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const x = side < 0 ? Math.max(a + 8, left - 8 - i * 14) : Math.min(b - 8, right + 8 + i * 14);
      if (artReady(art.mast)) {
        ctx.globalAlpha = .55;
        ctx.drawImage(art.mast, x - 3, y + 12, 7, 16 + (i === 0 ? 3 : 0));
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
}
function collageCards(t) {
  // These translucent photo cards live between the weather and the hazard
  // plane throughout the course; they never define a collidable opening.
  const weights = chapterWeights(camera, height);
  for (const [index, worldY, anchor] of [[0, 520, 0], [1, MACHINE.y, 950], [2, 2200, 1700]]) {
    const y = clippingTop(worldY, camera, height, anchor);
    if (weights[index] <= 0 || y < -240 || y > height + 230) continue;
    const reverse = index === 2;
    ctx.save();
    if (artReady(art.gears)) {
      ctx.globalAlpha = .7 * weights[index];
      ctx.drawImage(art.gears, (reverse ? 304 : -38) + Math.sin(t * .7) * 3, y - 178, 146, 149);
    }
    if (artReady(art.radio)) {
      ctx.globalAlpha = .58 * weights[index];
      ctx.drawImage(art.radio, (reverse ? -42 : 314) + Math.sin(t * .5 + 1) * 2, y - 146, 120, 144);
    }
    ctx.restore();
  }
}
function edgeClamp(x, y, side) {
  // Photo-metal bracket sits on the solid side of the exact aperture edge.
  const a = side < 0 ? x - 6 : x;
  ctx.fillStyle = '#101922'; ctx.fillRect(a, y - 24, 6, 48);
  if (artReady(art.wall)) ctx.drawImage(art.wall, 14, 40, 12, 96, a, y - 23, 6, 46);
  ctx.fillStyle = '#f3d39d'; ctx.fillRect(side < 0 ? x - 1 : x, y - 22, 1, 44);
  ellipse(a + 3, y - 20, 2, 2, '#f5d6a0', '#695642');
  ellipse(a + 3, y + 20, 2, 2, '#f5d6a0', '#695642');
}
function photographicBanks() {
  if (!artReady(art.strip)) return;
  const banks = [...GATES, { y: MACHINE.y, center: machineCenter(game.elapsed), width: MACHINE.width }];
  for (const [index, bank] of banks.entries()) {
    const y = sy(bank.y);
    if (y < -45 || y > height + 45) continue;
    const left = bank.center - bank.width / 2, right = bank.center + bank.width / 2;
    for (const [x, width, offset] of [[20, left - 20, 0], [right, 370 - right, 420]]) {
      if (width <= 0) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y - 16, width, 32); ctx.clip();
      ctx.globalAlpha = .9;
      ctx.drawImage(art.strip, offset, 0, 420, 90, x, y - 16, width, 32);
      ctx.restore();
      line(x, y - 16, x + width, y - 16, '#f0d4a2', 2);
      line(x, y + 15, x + width, y + 15, '#101620', 3);
      if (width > 38) {
        const staple = x + (index % 2 ? 16 : width - 17);
        line(staple - 4, y - 18, staple + 4, y - 17, '#decbb0', 2);
      }
    }
    edgeClamp(left, y, -1); edgeClamp(right, y, 1);
  }
}
function scrapGate(g,index) {
  const y=sy(g.y), gapL=g.center-g.width/2, gapR=g.center+g.width/2;
  if(y < -80 || y > height+100) return;
  ctx.save();
  for(const [x,w] of [[20,gapL-20],[gapR,370-gapR]]) {
    if(w<=0)continue;
    ctx.fillStyle='#0b18249a';ctx.fillRect(x+5,y-12,w,36);
    ctx.fillStyle=index%2?'#a8aa9b':'#b39d7d';ctx.fillRect(x,y-16,w,32);
    ctx.fillStyle='#555c60';ctx.fillRect(x,y+9,w,7);
    ctx.fillStyle='#e6d5b7';ctx.fillRect(x,y-15,w,3);
    ctx.strokeStyle='#251e22';ctx.lineWidth=2;ctx.strokeRect(x,y-16,w,32);
    ctx.save();ctx.beginPath();ctx.rect(x+3,y-14,w-6,27);ctx.clip();
    for(let j=0;j<Math.ceil(w/46);j++) {
      const cx=x+21+j*46, kind=(j+index)%4;
      if(kind===0){ // fan blades cut from an old catalog
        ellipse(cx,y-1,13,13,'#4a5860','#e9d7b2');ellipse(cx,y-1,4,4,'#d7aa72');
        for(let a=0;a<4;a++){let ang=a*Math.PI/2+index;line(cx+5*Math.cos(ang),y-1+5*Math.sin(ang),cx+12*Math.cos(ang+.5),y-1+12*Math.sin(ang+.5),'#d4d1b8',3)}
      } else if(kind===1){
        ctx.fillStyle='#76534a';ctx.fillRect(cx-14,y-10,27,20);ctx.strokeStyle='#ead8b6';ctx.strokeRect(cx-14,y-10,27,20);ellipse(cx-5,y,5,5,'#d6c59b');line(cx+4,y-6,cx+9,y-6,'#e3c596',2);line(cx+4,y,cx+9,y,'#e3c596',2);
      } else if(kind===2){
        ctx.fillStyle='#d9c8a4';ctx.fillRect(cx-14,y-8,28,16);ellipse(cx+2,y,5,5,'#816755');line(cx-9,y-5,cx-9,y+5,'#503c3c',2);
      } else { // an umbrella trapped sideways
        ctx.strokeStyle='#dfb37f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,y+5,14,Math.PI,2*Math.PI);ctx.stroke();line(cx,y-9,cx,y+10,'#eddfbe',2);
      }
    }
    for(let j=0;j<w/10;j++){ctx.fillStyle=j%3?'#f4e8d00c':'#071a2940';ctx.fillRect(x+((j*31+index*13)%w),y-13,2,25)}
    ctx.restore();
    ellipse(x+6,y-11,2,2,'#f0dfbf');ellipse(x+w-6,y+11,2,2,'#f0dfbf');
  }
  // Aperture ticks make the actual safe passage obvious.
  if (!artReady(art.strip)) { edgeClamp(gapL,y,-1); edgeClamp(gapR,y,1); }
  ctx.restore();
}
function craft(t) {
  const x=game.x,y=sy(game.y),a=game.angle;
  if(y< -50 || y>height+50)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/2-a);
  if (artReady(art.body) && artReady(art.leftWing) && artReady(art.rightWing)) {
    ellipse(4, 8, 17, 8, '#070f1db0');
    ctx.save();ctx.translate(-7,-3);ctx.rotate(.36-wing*1.02);ctx.scale(-1,1);
    ctx.drawImage(art.leftWing,0,-10,16,18);ctx.restore();
    ctx.save();ctx.translate(7,-3);ctx.rotate(-.18+wing*1.02);
    ctx.drawImage(art.rightWing,0,-11,19,18);ctx.restore();
    ctx.drawImage(art.body,-12,-20,24,32);
    line(-1,12,1,20,'#d4b187',2);
    line(1,19,4,22,'#7eb7aa88',2);
    // Two scavenged fan blades rotate over the stamped hub, faster on a flap.
    ctx.save();ctx.translate(0,-14);ctx.rotate(t*(3+wing*12));
    line(-6,0,6,0,'#f7daaa',2);line(0,-5,0,5,'#f7daaa',2);
    ellipse(0,0,2,2,'#30343b','#eed3a0');ctx.restore();
    if (wing > .18) {
      const jet = 4 + wing * 8;
      line(-3,12,-2,12+jet,'#f6bd76aa',2);
      line(3,12,2,12+jet*.7,'#a8dfdc99',2);
    }
  } else {
    // Keep the craft visible while its small local sprites load.
    ctx.fillStyle='#d8ac6a';ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(-17,6);ctx.lineTo(0,3);ctx.lineTo(17,6);ctx.closePath();ctx.fill();
    ellipse(0,-3,5,5,'#93d8d5','#f0e1bc');
  }
  ctx.restore();
}
function draw(t) {
  ctx.clearRect(0,0,390,height);
  ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.83;if(shake<.2)shake=0;}
  background(t);
  const floor=sy(0);if(floor<height+45){ctx.fillStyle='#202834';ctx.fillRect(0,floor,390,height-floor);for(let i=0;i<18;i++){line(i*25-10,floor,i*25-20,floor-12-(i%4)*7,'#726858',3)}}
  collageCards(t);
  rain(t);
  // Both storm walls are lethal; their inner edges match the physics bounds.
  stormWalls();
  windPockets(t);relayShaft();GATES.forEach(scrapGate);graveyard(t);photographicBanks();
  for(const p of particles){ellipse(p.x,sy(p.y),2 + p.life * 2,2 + p.life * 2,p.color)}
  if(game.mode!=='dead') craft(t);
  if(flash>0){ctx.fillStyle=`rgba(${flashColor},${flash*.55})`;ctx.fillRect(0,0,390,height);flash=Math.max(0,flash-.018)}
  ctx.restore();
}
function frame(ms) {
  const dt=last?Math.min(.05,(ms-last)/1000):0;last=ms;
  if(!document.hidden && !pageInactive && !suspended){
    visualTime += dt;
    const returnStep = 1 - Math.exp(-18 * dt);
    if (!aimHeld && Math.abs(aim - .5) > .001) updateAim(Math.abs(aim - .5) < .008 ? .5 : aim + (.5 - aim) * returnStep);
    if (!wingHeld && wing > 0) {
      updateWing(wing < .008 ? 0 : wing * (1 - returnStep), ms);
      if (wing === 0) { armed = true; downTravel = 0; upTravel = 0; }
    }
    const previousY = game.y, previousMode = game.mode;
    // Substeps reduce tunnelling through narrow gates after a fast flap.
    const n=Math.max(1,Math.ceil(dt/(1/120)));
    for(let i=0;i<n;i++)step(game,dt/n);
    if (previousMode === 'playing') {
      const nextPocket = windPocketAt(game.y);
      if (nextPocket !== pocketIndex) {
        if (nextPocket >= 0 && game.mode === 'playing') cue('wind-entry', .65 + .35 * WIND_POCKETS[nextPocket].force / 340);
        pocketIndex = nextPocket;
      }
      if (game.mode === 'playing') {
        for (const [key, y, center, width] of clearanceGates) clearance(key, y, center, width, previousY);
        clearance('machine', MACHINE.y, machineCenter(game.elapsed), MACHINE.width, previousY);
      } else if (game.mode === 'dead') { cue('crash', 1); impactHold = .18; }
      else if (game.mode === 'won') cue('win', 1);
    }
    camera += (Math.max(0,game.y-height*.54)-camera)*Math.min(1,dt*6);
    impactHold = Math.max(0, impactHold - dt);
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
    updateHud();draw(visualTime);
    // Touch release can blur a newly shown/closed dialog after its click handler.
    if (performance.now() < focusRecoveryUntil && document.activeElement === document.body &&
        focusRecoveryTarget?.isConnected && !pauseDialog.open && !aboutDialog.open) {
      focusRecoveryTarget.focus({ preventScroll: true });
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only state for browser acceptance; not used by the game loop.
window.stormPrototype = { state: () => ({...game, aim, wing, best, suspended, visualTime}) };
