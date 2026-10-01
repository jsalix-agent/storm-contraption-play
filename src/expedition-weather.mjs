// Rain lives in world coordinates: the camera reveals it rather than carrying it.
export const RAIN_X_SPACING = 64;
export const RAIN_Y_SPACING = 100;
export const RAIN_DRIFT = 24;
export const RAIN_SPEED = 230;

function hash(column, row, salt) {
  let n = (Math.imul(column, 73856093) ^ Math.imul(row, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  n ^= n >>> 13;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function worldRainPoint(column, row, seconds) {
  return {
    column, row,
    x: column * RAIN_X_SPACING + 8 + 48 * hash(column, row, 1) - RAIN_DRIFT * seconds,
    y: row * RAIN_Y_SPACING + 8 + 84 * hash(column, row, 2) - RAIN_SPEED * seconds,
    length: 12 + 7 * hash(column, row, 3),
  };
}

export function visibleWorldRain(cameraX, cameraY, height, seconds, width = 390) {
  const bottom = cameraY - 75, top = bottom + height;
  const leftColumn = Math.floor((cameraX + RAIN_DRIFT * seconds - RAIN_X_SPACING) / RAIN_X_SPACING);
  const rightColumn = Math.ceil((cameraX + width + RAIN_DRIFT * seconds + RAIN_X_SPACING) / RAIN_X_SPACING);
  const bottomRow = Math.floor((bottom + RAIN_SPEED * seconds - RAIN_Y_SPACING) / RAIN_Y_SPACING);
  const topRow = Math.ceil((top + RAIN_SPEED * seconds + RAIN_Y_SPACING) / RAIN_Y_SPACING);
  const visible = [];
  for (let column = leftColumn; column <= rightColumn; column++) {
    for (let row = bottomRow; row <= topRow; row++) {
      const drop = worldRainPoint(column, row, seconds);
      if (drop.x >= cameraX - 25 && drop.x <= cameraX + width + 25 &&
        drop.y >= bottom - 25 && drop.y <= top + 25) visible.push(drop);
    }
  }
  return visible;
}
