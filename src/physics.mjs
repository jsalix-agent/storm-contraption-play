export const WORLD_WIDTH = 390;
export const FINISH_Y = 2500;
export const GATES = [
  { y: 305, center: 195, width: 190, label: '01 · THE UMBRELLA YARD' },
  { y: 510, center: 220, width: 180, label: '02 · STATIC ALLEY' },
  { y: 750, center: 115, width: 170, label: '03 · THE FAN FARM' },
  { y: 1000, center: 230, width: 158, label: '04 · CLOCKWORK SQUALL' },
  { y: 1260, center: 160, width: 148, label: '05 · RELAY SHAFT / LOWER' },
  { y: 1440, center: 160, width: 140, label: '06 · RELAY SHAFT / UPPER' },
  { y: 1710, center: 270, width: 132, label: '07 · ANTENNA WEATHER' },
  { y: 1980, center: 125, width: 124, label: '08 · THE RUST BELT' },
  { y: 2300, center: 260, width: 116, label: '09 · ABOVE THE STORM' },
];
// Gusts are announced by their full visible span; force fades in at each edge.
export const WIND_POCKETS = [
  { bottom: 560, top: 705, direction: -1, force: 240, label: 'PAPER GALE' },
  { bottom: 1770, top: 1925, direction: 1, force: 340, label: 'STATIC SQUALL' },
];
export const MACHINE = { y: 1585, width: 170, label: 'THE INVENTION GRAVEYARD' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const windPocketAt = y => WIND_POCKETS.findIndex(p => y > p.bottom && y < p.top);
export function windAt(y, elapsed) {
  const ambient = y < 500 ? 0 : y < 1000 ? 28 : -38 + 16 * Math.sin(elapsed * 2);
  const pocket = WIND_POCKETS[windPocketAt(y)];
  if (!pocket) return ambient;
  const edge = clamp(Math.min(y - pocket.bottom, pocket.top - y) / 30, 0, 1);
  return ambient + pocket.direction * pocket.force * edge;
}
export const machineCenter = elapsed => 195 + 28 * Math.sin(elapsed * 1.2);

export function createGame() {
  return { x: 195, y: 130, vx: 0, vy: 0, angle: Math.PI / 2,
    wing: 0, mode: 'ready', maxY: 130, elapsed: 0, cause: '' };
}

export function aimAt(s, fraction) {
  s.angle = Math.PI * (1 - clamp(fraction, 0, 1));
  return s.angle;
}

export function flap(s, speed) {
  if (s.mode === 'dead' || s.mode === 'won') return 0;
  if (s.mode === 'ready') s.mode = 'playing';
  // A quick, deliberate downstroke is stronger than the same travel done slowly.
  const kick = 125 + 145 * Math.pow(clamp(speed, 0, 1300) / 1300, .8);
  s.vx = clamp(s.vx + Math.cos(s.angle) * kick, -380, 380);
  s.vy = clamp(s.vy + Math.sin(s.angle) * kick, -340, 410);
  return kick;
}

function circleRect(x, y, radius, left, bottom, right, top) {
  const dx = x - clamp(x, left, right);
  const dy = y - clamp(y, bottom, top);
  return dx * dx + dy * dy < radius * radius;
}

function hitsBarrier(s, y, center, width) {
  if (Math.abs(s.y - y) > 33) return false;
  const left = center - width / 2, right = center + width / 2;
  return circleRect(s.x, s.y, 11, 20, y - 16, left, y + 16) ||
    circleRect(s.x, s.y, 11, right, y - 16, WORLD_WIDTH - 20, y + 16);
}
export function step(s, dt) {
  if (s.mode !== 'playing') return;
  dt = clamp(dt, 0, .05);
  s.elapsed += dt;
  s.vx = clamp((s.vx + windAt(s.y, s.elapsed) * dt) * Math.exp(-.52 * dt), -380, 380);
  s.vy = clamp((s.vy - 470 * dt) * Math.exp(-.10 * dt), -350, 410);
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.maxY = Math.max(s.maxY, s.y);
  if (s.x < 28 || s.x > WORLD_WIDTH - 28 || s.y < 28) {
    s.mode = 'dead'; s.cause = 'THE STORM GOT YOU'; return;
  }
  for (const gate of GATES) {
    if (hitsBarrier(s, gate.y, gate.center, gate.width)) {
      s.mode = 'dead'; s.cause = 'SCRAPPED ON THE WAY UP'; return;
    }
  }
  if (hitsBarrier(s, MACHINE.y, machineCenter(s.elapsed), MACHINE.width)) {
    s.mode = 'dead'; s.cause = 'LOST IN THE INVENTION GRAVEYARD'; return;
  }
  if (s.y >= FINISH_Y) s.mode = 'won';
}
