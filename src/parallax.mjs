// Scenery moves with the camera, not the craft's momentary altitude.
// Each chapter occupies a stretch of the climb; adjacent sets fade together.
export const CHAPTERS = [
  { name: 'foundry', anchor: 0 },
  { name: 'graveyard', anchor: 950 },
  { name: 'spire', anchor: 1700 },
];
export const PLANES = [
  { name: 'depth', rate: .07, overscan: 80, opacity: .94 },
  { name: 'mid', rate: .22, overscan: 180, opacity: .84 },
  { name: 'haze', rate: .36, overscan: 280, opacity: .72 },
];
const smoothstep = x => {
  const v = Math.max(0, Math.min(1, x));
  return v * v * (3 - 2 * v);
};
export function chapterWeights(camera, height) {
  const altitude = camera + height * .54;
  const mid = smoothstep((altitude - 780) / 300);
  const upper = smoothstep((altitude - 1690) / 310);
  return [1 - mid, mid * (1 - upper), upper];
}
export function planeTop(camera, anchor, rate, overscan) {
  return -overscan + (camera - anchor) * rate;
}
export function clippingTop(worldY, camera, height, anchor) {
  // sy(worldY) already includes 1x camera; remove the unused 35%.
  return height - 75 - worldY + camera - .35 * (camera - anchor);
}
