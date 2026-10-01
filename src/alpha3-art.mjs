// The collage materials are archival photos; silhouettes come ONLY from the
// engine's lethal polygons, not photographs of umbrellas/presses/receiver horns.
// Caller has already translated world x. sy projects every world-y vertex.
const MATERIAL = {
  umbrella: { base: '#75604a', dark: '#342f2c', rim: '#e2c798' },
  press: { base: '#596369', dark: '#202d35', rim: '#c5d0c9' },
  radio: { base: '#82674a', dark: '#2e3b3e', rim: '#dfbe84' },
};

function trace(ctx, points) {
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
}

function line(ctx, a, b) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function bounds(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function detail(ctx, kind, points, box, anchor, material) {
  const { x, y, w, h } = box;
  const cx = x + w / 2, cy = y + h / 2;
  ctx.strokeStyle = material.dark;
  ctx.lineWidth = 2;
  if (kind === 'umbrella') {
    // Radial ribs follow the canopy's actual vertices; no spokes in open air.
    const hub = { x: Math.max(x, Math.min(x + w, anchor.x)),
      y: Math.max(y, Math.min(y + h, anchor.y)) };
    for (const vertex of points) line(ctx, hub, vertex);
    // A slim shaft polygon needs a spine rather than a stretched canopy panel.
    if (h > w * 2) line(ctx, { x: cx, y }, { x: cx, y: y + h });
    ctx.strokeStyle = material.rim; ctx.lineWidth = 1;
    for (const vertex of points) {
      line(ctx, { x: hub.x + 2, y: hub.y }, { x: vertex.x + 2, y: vertex.y });
    }
  } else if (kind === 'press') {
    // Machined platen/table lips and column rails stay inside their own solid.
    ctx.lineWidth = Math.min(7, h * 0.12);
    line(ctx, { x, y: y + h * 0.15 }, { x: x + w, y: y + h * 0.15 });
    line(ctx, { x, y: y + h * 0.85 }, { x: x + w, y: y + h * 0.85 });
    if (h > w) {
      line(ctx, { x: x + w * 0.23, y }, { x: x + w * 0.23, y: y + h });
      line(ctx, { x: x + w * 0.77, y }, { x: x + w * 0.77, y: y + h });
    }
    ctx.lineWidth = 1.5; ctx.strokeStyle = material.rim;
    for (const fraction of [0.16, 0.84]) {
      ctx.beginPath(); ctx.arc(x + w * fraction, cy, Math.min(5, w / 9, h / 6), 0, Math.PI * 2); ctx.stroke();
    }
  } else if (kind === 'radio') {
    // Flaring receiver folds connect the local throat to the actual horn rim.
    // Each lobe has its own narrowed, low vertex: the global receiver anchor
    // can sit in safe air between lobes, so it must not determine these folds.
    const throat = points.reduce((lowest, p) => p.y > lowest.y ? p : lowest, points[0]);
    for (const vertex of points) line(ctx, throat, vertex);
    ctx.strokeStyle = material.rim; ctx.lineWidth = 1.5;
    // Shallow elliptical mouth rings read as flared horns rather than floating
    // speaker disks. Every ring is clipped to the same actual lethal lobe.
    for (const fraction of [0.28, 0.36, 0.44]) {
      ctx.beginPath(); ctx.ellipse(cx, y + h * 0.16, w * fraction, h * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Exact collider contour, drawn inward by clipping. No decorative outer bar.
  trace(ctx, points); ctx.strokeStyle = material.dark; ctx.lineWidth = 7; ctx.stroke();
  trace(ctx, points); ctx.strokeStyle = material.rim; ctx.lineWidth = 2.5; ctx.stroke();
}

export function drawInvention(ctx, object, sy, images = {}, time = 0) {
  const material = MATERIAL[object.kind] || MATERIAL.press;
  const anchor = { x: object.anchor.x, y: sy(object.anchor.y) };
  ctx.save();
  try {
    for (const polygon of object.polygons) {
      const points = polygon.map(p => ({ x: p.x, y: sy(p.y) }));
      const box = bounds(points);
      trace(ctx, points); ctx.fillStyle = material.base; ctx.fill();
      ctx.save();
      try {
        trace(ctx, points); ctx.clip();
        const key = { umbrella: 'alpha3-umbrella-cloth', press: 'alpha3-press-steel', radio: 'alpha3-radio-brass' }[object.kind];
        const image = images?.[key];
        // Broken images also report complete: require actual decoded dimensions.
        if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
          ctx.drawImage(image, box.x, box.y, box.w, box.h);
        }
        detail(ctx, object.kind, points, box, anchor, material);
      } finally { ctx.restore(); }
    }
  } finally { ctx.restore(); }
}

// Safe wicker cup + open mint halo, never industrial outlines or hazard teeth.
// No images parameter: the basket remains legible before any asset has decoded.
export function drawBasket(ctx, point, sy, held = false, time = 0, active = false, catchStrength = 0, reduced = false) {
  const { x, y, radius: r } = point;
  const screenY = sy(y), ry = Math.abs(sy(y + r) - sy(y - r)) / 2;
  const settle = reduced ? 0 : Math.sin((1 - catchStrength) * Math.PI * 2) * catchStrength * 4;
  const cupY = worldY => sy(worldY + settle);
  ctx.save();
  try {
    ctx.globalAlpha *= active ? 1 : .62;
    ctx.strokeStyle = active ? '#c8ffdf' : '#8fb29c';
    ctx.lineWidth = active ? 2.5 : 1.2;
    ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.ellipse(x, screenY, r, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    const cup = [
      { x: x - r * 0.65, y: cupY(y - r * 0.35) },
      { x: x + r * 0.65, y: cupY(y - r * 0.35) },
      { x: x + r * 0.44, y: cupY(y - r * 0.72) },
      { x: x - r * 0.44, y: cupY(y - r * 0.72) },
    ];
    trace(ctx, cup); ctx.fillStyle = '#537e69'; ctx.fill();
    ctx.save();
    try {
      trace(ctx, cup); ctx.clip();
      ctx.strokeStyle = '#afd3a2'; ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        line(ctx, { x: x + i * r * 0.18, y: cupY(y - r * 0.35) },
          { x: x + i * r * 0.13, y: cupY(y - r * 0.72) });
      }
      for (const fraction of [0.45, 0.58, 0.69]) {
        line(ctx, { x: x - r * 0.65, y: cupY(y - r * fraction) },
          { x: x + r * 0.65, y: cupY(y - r * fraction) });
      }
    } finally { ctx.restore(); }
    ctx.strokeStyle = held ? '#e0ffe4' : '#b8e4b6'; ctx.lineWidth = 3;
    line(ctx, cup[0], cup[1]);
    if (catchStrength > 0 && !reduced) {
      ctx.save();ctx.globalAlpha *= catchStrength;ctx.strokeStyle='#e0ffe4';ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(x,screenY,r+(1-catchStrength)*14,ry+(1-catchStrength)*14,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if (active) {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.16, sy(y + r * 0.08));
      ctx.lineTo(x - r * 0.03, sy(y - r * 0.05));
      ctx.lineTo(x + r * 0.22, sy(y + r * 0.23));
      ctx.stroke();
    }
  } finally { ctx.restore(); }
}
