// Additive accents only: callers keep alpha.3 art and collider silhouettes intact.
function trace(ctx, points) {
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
}
function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

export function drawReactions(ctx, object, sy, time = 0, strength = 0, reduced = false) {
  if (!Number.isFinite(strength) || strength <= 0 || !['umbrella', 'press', 'radio'].includes(object.kind)) return;
  const amount = Math.min(1, strength);
  for (const polygon of object.polygons) {
    const points = polygon.map(p => ({ x: p.x, y: sy(p.y) }));
    const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
    const w = Math.max(...points.map(p => p.x)) - x, h = Math.max(...points.map(p => p.y)) - y;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    try {
      // Every accent, including line widths, is confined to ONE actual solid.
      trace(ctx, points); ctx.clip();
      ctx.globalAlpha *= .62 * amount;
      ctx.strokeStyle = object.kind === 'press' ? '#d0d8cb' : '#f0cb83';
      ctx.lineWidth = 1;
      if (object.kind === 'umbrella') {
        const flex = reduced ? 0 : 8 * amount * Math.sin(time * 5);
        ctx.fillStyle = '#f0cb83';
        ctx.strokeStyle = '#f8dfaa';
        ctx.lineWidth = 3;
        if (h > w * 2) {
          // A sliding collar and compressed spring live inside the narrow shaft.
          ctx.fillRect(x + w * .2, cy - 9 + flex, w * .6, 18);
          ctx.beginPath(); ctx.moveTo(cx, y + h * .15);
          for (let i = 0; i < 6; i++) {
            ctx.lineTo(cx + (i % 2 ? -1 : 1) * w * .22, y + h * .2 + i * (h * .09 + flex * .12));
          }
          ctx.stroke();
        } else {
          // Broad folded cloth, not a displaced rim: every edge remains fixed.
          const flutter = reduced ? 0 : 2 * amount * Math.sin(time * 9);
          ctx.beginPath(); ctx.moveTo(x + w * .12, y + h * .58);
          ctx.quadraticCurveTo(cx, y + h * .23 + flex * 2, x + w * .88, y + h * .58);
          ctx.lineTo(x + w * .84, y + h * .75);
          ctx.quadraticCurveTo(cx, y + h * .42 + (flex + flutter) * 2, x + w * .16, y + h * .75);
          ctx.closePath(); ctx.fill();
          for (const fraction of [.2, .4, .6, .8]) {
            ctx.beginPath(); ctx.moveTo(cx, y + h * .9);
            ctx.quadraticCurveTo(x + w * fraction, cy + (flex + flutter * (fraction < .5 ? 1 : -1)) * 2, x + w * fraction, y + h * .28);
            ctx.stroke();
          }
        }
      } else if (object.kind === 'press') {
        const stroke = reduced ? .45 : (1 - Math.cos(time * 6)) / 2;
        const travel = Math.min(26, h * .25) * amount * stroke;
        const blockW = Math.min(96, w * .4), blockH = Math.min(22, h * .18);
        const blockY = y + h * .34 + travel;
        // Guide rails and the extending rod never bridge the safe press bay.
        ctx.strokeStyle = '#d0d8cb'; ctx.lineWidth = 3;
        for (const side of [-1, 1]) line(ctx, cx + side * blockW * .65, y + h * .22, cx + side * blockW * .65, y + h * .72);
        ctx.fillStyle = '#a4bdbb';
        ctx.fillRect(cx - Math.min(5, w * .08), y + h * .2, Math.min(10, w * .16), blockY - y - h * .2);
        ctx.fillStyle = '#e0ddbd';
        ctx.fillRect(cx - blockW / 2, blockY, blockW, blockH);
        ctx.strokeStyle = '#34474e'; ctx.lineWidth = 3;
        line(ctx, cx - blockW * .4, blockY + blockH * .55, cx + blockW * .4, blockY + blockH * .55);
        const r = Math.min(20, w * .12, h * .2), gx = x + w * .18, gy = y + h * .62;
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#25353c'; ctx.fill();
        ctx.strokeStyle = '#d0d8cb'; ctx.lineWidth = 3; ctx.stroke();
        // A heavy needle has its own angular kick, not the platen's translation.
        const angle = -2.5 + 1.8 * amount * stroke;
        ctx.strokeStyle = '#f0cb83'; ctx.lineWidth = 4;
        line(ctx, gx, gy, gx + Math.cos(angle) * r * .84, gy + Math.sin(angle) * r * .84);
      } else {
        // A broad moving tuning ribbon stays in the solid upper horn fold.
        const waveTime = reduced ? 0 : time * 4.5;
        const wave = Array.from({ length: 9 }, (_, i) => ({
          x: x + w * (.12 + i * .095),
          y: y + h * .18 + (reduced ? 0 : Math.sin(waveTime - i * .9) * 5 * amount),
        }));
        trace(ctx, [...wave, ...wave.slice().reverse().map(p => ({ x: p.x, y: p.y + 12 }))]);
        ctx.fillStyle = '#d6b57e'; ctx.fill();
        ctx.beginPath(); wave.forEach((p, i) => i ? ctx.lineTo(p.x, p.y + 6) : ctx.moveTo(p.x, p.y + 6));
        ctx.strokeStyle = '#f3dcaa'; ctx.lineWidth = 2.5; ctx.stroke();
        // Lamps glide back and forth, with no modulo jump or flashing alpha.
        for (const [i, phase] of [0, -1.2].entries()) {
          const signal = reduced ? 0 : Math.sin(time * 3 + phase) * amount;
          const lx = cx + signal * w * .3, ly = y + h * .18 + signal * 3;
          ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2);
          ctx.fillStyle = i ? '#f6cf83' : '#d2eee0'; ctx.fill();
          ctx.strokeStyle = '#384848'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    } finally { ctx.restore(); }
  }
}

export function drawPatents(ctx, patents, collected, sy, time = 0, reduced = false) {
  const owned = new Set(collected);
  for (const [i, patent] of patents.entries()) {
    if (owned.has(patent.id)) continue;
    const { x, y } = patent;
    const paper = [[-7, -11], [-2, -10], [3, -11], [7, -10], [9, -7],
      [8, 9], [4, 11], [0, 10], [-5, 11], [-9, 7], [-8, -7]]
      .map(([dx, dy]) => ({ x: x + dx, y: sy(y + dy) }));
    ctx.save();
    try {
      ctx.globalAlpha *= reduced ? .9 : .9 + .045 * Math.sin(time * 2 + i);
      trace(ctx, paper); ctx.fillStyle = '#ead5a2'; ctx.fill();
      trace(ctx, paper); ctx.clip();
      ctx.strokeStyle = '#a87539'; ctx.lineWidth = .7;
      trace(ctx, paper); ctx.stroke();
      // Tiny discarded schematic, not a ring or a new obstacle silhouette.
      if (patent.kind === 'umbrella') {
        line(ctx, x - 5, sy(y + 1), x, sy(y + 5));
        line(ctx, x, sy(y + 5), x + 5, sy(y + 1));
        line(ctx, x, sy(y + 4), x, sy(y - 2));
      } else if (patent.kind === 'press') {
        line(ctx, x - 5, sy(y + 4), x + 5, sy(y + 4));
        line(ctx, x - 4, sy(y + 3), x - 4, sy(y - 2));
        line(ctx, x + 4, sy(y + 3), x + 4, sy(y - 2));
        line(ctx, x - 5, sy(y - 2), x + 5, sy(y - 2));
      } else {
        line(ctx, x - 5, sy(y + 4), x, sy(y));
        line(ctx, x, sy(y), x + 5, sy(y + 4));
        line(ctx, x, sy(y), x, sy(y - 2));
      }
      ctx.fillStyle = '#77542e'; ctx.font = '6px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(['I', 'II', 'III'][i] || 'I', x, sy(y - 6));
    } finally { ctx.restore(); }
  }
}
