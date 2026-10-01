import { GATES, WIND_POCKETS, MACHINE } from './physics.mjs?v=storm-campaign-public-20261001-v1';

export const WORLD_VERSION = 4;
export const COURSE_ID = 'authored-alpha3';
export const RADIUS = 11;
const point = (x, y) => ({ x, y });
const polygon = (left, right, bottom, top) => [point(left, bottom), point(right, bottom), point(right, top), point(left, top)];
const stretch = y => 130 + (y - 130) * 1.2;
const banks = (at, min, max, center, opening) => [
  polygon(min, center - opening / 2, at - 16, at + 16),
  polygon(center + opening / 2, max, at - 16, at + 16),
];
const hull = [point(0, 0), point(390, 0), point(390, 2940), point(450, 2940),
  point(450, 5340), point(-60, 5340), point(-60, 2940), point(0, 2940)];
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

export const WORLD = freeze({
  worldVersion: WORLD_VERSION, course: COURSE_ID, seed: 'ALPHA3', pattern: 'authored',
  start: point(195, 130), bounds: { minX: -60, minY: 0, maxX: 450, maxY: 5340 },
  finishY: 5200, goal: { x: 195, y: 5200, radius: 50 },
  cells: [
    { id: 'tutorial', kind: 'tutorial', vertices: polygon(0, 390, 0, 2940) },
    { id: 'inventions', kind: 'inventions', vertices: polygon(-60, 450, 2940, 5340) },
  ],
  // Only exposed edges of the union collide. The entire tutorial-room seam is open.
  boundaries: hull.map((p, i) => ({ x1: p.x, y1: p.y, x2: hull[(i + 1) % hull.length].x, y2: hull[(i + 1) % hull.length].y })),
  checkpoints: [
    { id: 'lower', x: 195, y: 130, radius: 55 },
    { id: 'primer', x: 195, y: 1030, radius: 50 },
    { id: 'workshop', x: 195, y: 3040, radius: 55 },
    { id: 'umbrella-top', x: 175, y: 3540, radius: 50 },
    { id: 'press-exit', x: 380, y: 3990, radius: 50 },
    { id: 'radio-entry', x: 380, y: 4320, radius: 50 },
    { id: 'antenna', x: 195, y: 5070, radius: 45 },
  ],
  gates: GATES.map((g, i) => ({ id: `tutorial-${i + 1}`, stage: 'tutorial', label: g.label,
    axis: 'y', at: stretch(g.y), spanMin: 0, spanMax: 390, center: g.center,
    opening: g.width, solids: banks(stretch(g.y), 0, 390, g.center, g.width) })),
  pockets: WIND_POCKETS.map((p, i) => ({ ...p, id: `tutorial-wind-${i + 1}`, stage: 'tutorial',
    left: 0, right: 390, bottom: stretch(p.bottom), top: stretch(p.top) })),
  machines: [{ id: 'tutorial-machine', stage: 'tutorial', label: MACHINE.label,
    axis: 'y', at: stretch(MACHINE.y), spanMin: 0, spanMax: 390, center: 195,
    opening: MACHINE.width, travel: 28, rate: 1.2, phase: 0 }],
  objects: [
    { id: 'umbrella-canopy', kind: 'umbrella', stage: 'umbrella', anchor: point(195, 3290),
      polygons: [
        [point(50, 3290), point(340, 3290), point(315, 3350), point(195, 3390), point(75, 3350)],
        polygon(188, 202, 3180, 3290),
      ], details: { rimY: 3290, receiving: point(175, 3540) } },
    { id: 'workshop-press', kind: 'press', stage: 'press', anchor: point(110, 3880),
      polygons: [
        polygon(110, 450, 3700, 3880), // Table/divider reaches the right wall: use the visible left portal.
        polygon(-60, 300, 4050, 4160),
        polygon(-60, -35, 3880, 4050),
      ], details: { passage: { left: 110, right: 300, bottom: 3880, top: 4050 }, receiving: point(380, 3990) } },
    { id: 'radio-ladder', kind: 'radio', stage: 'radio', anchor: point(195, 4510),
      polygons: [
        [point(-60, 4460), point(20, 4410), point(55, 4490), point(55, 4530), point(-60, 4530)],
        [point(200, 4410), point(450, 4460), point(450, 4530), point(165, 4530), point(165, 4490)],
        [point(-60, 4780), point(210, 4730), point(245, 4810), point(245, 4850), point(-60, 4850)],
        [point(410, 4730), point(450, 4780), point(450, 4850), point(375, 4850), point(375, 4810)],
      ], details: { apertures: [{ x: 110, y: 4510, width: 110 }, { x: 310, y: 4830, width: 130 }] } },
  ],
  stages: [
    { id: 'tutorial', title: 'THE STORM SCHOOL', minY: 0, maxY: 2940, viewWidth: 390, next: point(195, 3040), hint: 'Hold your aim, then pull and reset the flap lever.' },
    { id: 'umbrella', title: 'THE UMBRELLA', minY: 2940, maxY: 3650, viewWidth: 510, next: point(175, 3540), hint: 'Peel right around the rim; counter-flap toward the basket.' },
    { id: 'press', title: 'THE PRESS', minY: 3650, maxY: 4240, viewWidth: 510, next: point(380, 3990), hint: 'Rise in the left bay, coast over the table, then brake right.' },
    { id: 'radio', title: 'THE RADIO LADDER', minY: 4240, maxY: 5120, viewWidth: 510, next: point(110, 4510), hint: 'Catch the left horn, reverse to the right horn, then rise.' },
    { id: 'eye', title: 'THE EYE OF THE STORM', minY: 5120, maxY: 5340, viewWidth: 510, next: point(195, 5200), hint: 'One last climb into the quiet eye.' },
  ],
});

export function createGame(saved, world = WORLD) {
  const record = saved !== null && typeof saved === 'object' && !Array.isArray(saved);
  const fresh = saved === undefined;
  const savedCheckpoint = world === WORLD && record && saved.checkpoint === 'press-entry' ? 'umbrella-top' : saved?.checkpoint;
  const valid = record && Object.keys(saved).length === 3 &&
    saved.v === 1 && saved.worldVersion === world.worldVersion &&
    world.checkpoints.some(p => p.id === savedCheckpoint);
  const checkpoint = valid ? savedCheckpoint : world.checkpoints[0].id;
  const dock = world.checkpoints.find(p => p.id === checkpoint);
  return { world, seed: world.seed, kit: 'base', checkpoint,
    x: dock.x, y: dock.y, vx: 0, vy: 0, angle: Math.PI / 2, wing: 0,
    mode: 'docked', maxY: dock.y, elapsed: 0, cause: '', impact: null,
    heldCheckpoint: checkpoint, homingCheckpoint: null, checkpointCooldown: 0,
    awaitFlap: true, invalidSave: !fresh && !valid, saveStatus: fresh ? 'new' : valid ? 'restored' : 'invalid' };
}
export function snapshot(s) {
  return { v: 1, worldVersion: s.world.worldVersion,
    checkpoint: s.world.checkpoints.some(p => p.id === s.checkpoint) ? s.checkpoint : s.world.checkpoints[0].id };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function beginFlight(s) {
  if (s.mode !== 'docked') return false;
  s.mode = 'ready'; return true;
}
export function aimAt(s, fraction) {
  if (Number.isFinite(fraction) && (s.mode === 'ready' || s.mode === 'playing'))
    s.angle = Math.PI * (1 - clamp(fraction, 0, 1));
  return s.angle;
}
export function flap(s, speed) {
  if (!Number.isFinite(speed) || speed < 0 || (s.mode !== 'ready' && s.mode !== 'playing')) return 0;
  s.mode = 'playing'; s.awaitFlap = false;
  if (s.heldCheckpoint || s.homingCheckpoint) {
    s.heldCheckpoint = null; s.homingCheckpoint = null; s.checkpointCooldown = 1;
  }
  const kick = 125 + 145 * Math.pow(clamp(speed, 0, 1300) / 1300, .8);
  s.vx = clamp(s.vx + Math.cos(s.angle) * kick, -380, 380);
  s.vy = clamp(s.vy + Math.sin(s.angle) * kick, -340, 410);
  s.wing = 1; return kick;
}
export function revive(s) {
  if (s.mode !== 'dead') return false;
  const dock = s.world.checkpoints.find(p => p.id === s.checkpoint) ?? s.world.checkpoints[0];
  Object.assign(s, { checkpoint: dock.id, x: dock.x, y: dock.y, vx: 0, vy: 0,
    angle: Math.PI / 2, wing: 0, mode: 'ready', elapsed: 0, cause: '', impact: null,
    heldCheckpoint: dock.id, homingCheckpoint: null, checkpointCooldown: 0, awaitFlap: true });
  return true;
}
export function stageAt(s) {
  return s.world.stages.find(stage => s.y >= stage.minY && s.y < stage.maxY) ??
    (s.y < 0 ? s.world.stages[0] : s.world.stages.at(-1));
}
export function activeMachines(s) {
  return s.world.machines.map(m => {
    const center = m.center + m.travel * Math.sin(s.elapsed * m.rate + m.phase);
    return { ...m, center, solids: banks(m.at, m.spanMin, m.spanMax, center, m.opening) };
  });
}
export function windAt(s, y) {
  const p = s.world.pockets.find(p => s.x > p.left && s.x < p.right && y > p.bottom && y < p.top);
  return p ? p.direction * p.force * clamp(Math.min(y - p.bottom, p.top - y) / 30, 0, 1) : 0;
}
function inPolygon(p, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function nearest(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return point(a.x + t * dx, a.y + t * dy);
}
// Exact sweep against a capsule (segment expanded by the vulnerable-core radius).
function sweepEdge(from, to, a, b) {
  const dx = to.x - from.x, dy = to.y - from.y, ex = b.x - a.x, ey = b.y - a.y;
  const initial = nearest(from, a, b);
  if ((from.x - initial.x) ** 2 + (from.y - initial.y) ** 2 <= RADIUS ** 2) return { t: 0, contact: initial };
  let best = null;
  const offer = t => {
    if (t >= 0 && t <= 1 && (!best || t < best.t)) {
      const p = point(from.x + t * dx, from.y + t * dy);
      best = { t, contact: nearest(p, a, b) };
    }
  };
  const len = Math.hypot(ex, ey), velocity = dx * dx + dy * dy;
  if (len) {
    const signed = ((from.x - a.x) * ey - (from.y - a.y) * ex) / len;
    const change = (dx * ey - dy * ex) / len;
    if (Math.abs(change) > 1e-12) for (const r of [-RADIUS, RADIUS]) {
      const t = (r - signed) / change;
      const along = ((from.x + t * dx - a.x) * ex + (from.y + t * dy - a.y) * ey) / (len * len);
      if (along >= 0 && along <= 1) offer(t);
    }
  }
  if (velocity) for (const p of [a, b]) {
    const px = from.x - p.x, py = from.y - p.y, dot = px * dx + py * dy;
    const discriminant = dot * dot - velocity * (px * px + py * py - RADIUS * RADIUS);
    if (discriminant >= 0) offer((-dot - Math.sqrt(discriminant)) / velocity);
  }
  return best;
}
function sweepPolygon(from, to, vertices) {
  let best = null;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const hit = sweepEdge(from, to, a, b);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  if (inPolygon(from, vertices)) {
    const contacts = vertices.map((a, i) => nearest(from, a, vertices[(i + 1) % vertices.length]));
    contacts.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
    return { t: 0, contact: contacts[0] };
  }
  return best;
}
function collision(s, from, to, startTime, endTime) {
  let best = null;
  const offer = (hit, id, kind, cause) => {
    if (hit && (!best || hit.t < best.t)) best = { ...hit, id, kind, cause };
  };
  s.world.boundaries.forEach((b, i) => offer(sweepEdge(from, to, point(b.x1, b.y1), point(b.x2, b.y2)),
    `boundary-${i + 1}`, 'boundary', 'THE STORM GOT YOU'));
  for (const g of s.world.gates) for (const p of g.solids)
    offer(sweepPolygon(from, to, p), g.id, 'gate', 'SCRAPPED ON THE WAY UP');
  for (const object of s.world.objects) for (const p of object.polygons)
    offer(sweepPolygon(from, to, p), object.id, object.kind, `STRUCK THE ${object.kind.toUpperCase()}`);
  for (const m of s.world.machines) {
    const c0 = m.center + m.travel * Math.sin(startTime * m.rate + m.phase);
    const c1 = m.center + m.travel * Math.sin(endTime * m.rate + m.phase);
    const delta = c1 - c0;
    for (const p of banks(m.at, m.spanMin, m.spanMax, c0, m.opening)) {
      const hit = sweepPolygon(from, point(to.x - delta, to.y), p);
      if (hit) hit.contact.x += delta * hit.t;
      offer(hit, m.id, 'machine', 'LOST IN THE INVENTION GRAVEYARD');
    }
  }
  return best;
}
function catchCheckpoint(s) {
  if (s.checkpointCooldown > 0) return false;
  const dock = s.world.checkpoints.find(p => Math.hypot(s.x - p.x, s.y - p.y) <= p.radius);
  if (!dock) return false;
  s.checkpoint = dock.id; s.homingCheckpoint = dock.id;
  return true;
}
function impact(s, hit) {
  s.mode = 'dead'; s.cause = hit.cause;
  s.impact = { x: s.x, y: s.y, contactX: hit.contact.x, contactY: hit.contact.y,
    id: hit.id, kind: hit.kind, cause: hit.cause };
}
export function step(s, dt) {
  if (s.mode !== 'playing' || s.awaitFlap || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, .05);
  const startTime = s.elapsed;
  s.elapsed += dt; s.checkpointCooldown = Math.max(0, s.checkpointCooldown - dt);
  if (s.homingCheckpoint) {
    const dock = s.world.checkpoints.find(p => p.id === s.homingCheckpoint), pull = 1 - Math.exp(-11 * dt);
    const from = point(s.x, s.y), to = point(s.x + (dock.x - s.x) * pull, s.y + (dock.y - s.y) * pull);
    const hit = collision(s, from, to, startTime, s.elapsed), t = hit ? hit.t : 1;
    s.x += (to.x - s.x) * t; s.y += (to.y - s.y) * t;
    s.vx *= 1 - pull; s.vy *= 1 - pull;
    if (hit) return impact(s, hit);
    if (Math.hypot(s.x - dock.x, s.y - dock.y) < 1.5) Object.assign(s, {
      x: dock.x, y: dock.y, vx: 0, vy: 0, mode: 'ready', elapsed: 0, wing: 0,
      heldCheckpoint: dock.id, homingCheckpoint: null, awaitFlap: true,
    });
    s.maxY = Math.max(s.maxY, s.y);
    return;
  }
  const slices = Math.max(1, Math.ceil(410 * dt / 5)), h = dt / slices;
  for (let i = 0; i < slices; i++) {
    s.vx = clamp((s.vx + windAt(s, s.y) * h) * Math.exp(-.52 * h), -380, 380);
    s.vy = clamp((s.vy - 470 * h) * Math.exp(-.1 * h), -350, 410);
    const from = point(s.x, s.y), to = point(s.x + s.vx * h, s.y + s.vy * h);
    const hit = collision(s, from, to, startTime + i * h, startTime + (i + 1) * h);
    const t = hit ? hit.t : 1;
    s.x += (to.x - s.x) * t; s.y += (to.y - s.y) * t;
    s.maxY = Math.max(s.maxY, s.y); s.wing = Math.max(0, s.wing - h * 3);
    if (hit) return impact(s, hit);
    if (Math.hypot(s.x - s.world.goal.x, s.y - s.world.goal.y) <= s.world.goal.radius) {
      s.mode = 'won'; return;
    }
    if (catchCheckpoint(s)) return;
  }
}
