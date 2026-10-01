// Mutable, per-contact state. Keep it independent from visual wing/aim state.
export function createStroke() {
  return { active: false, armed: false };
}

// Positions increase downward; times use milliseconds (PointerEvent.timeStamp).
export function beginStroke(state, position, time) {
  endStroke(state);
  if (!Number.isFinite(position) || !Number.isFinite(time) || time < 0) return;
  state.origin = Math.max(0, Math.min(1, position));
  state.startTime = time;
  state.lastTime = time;
  state.armed = true;
  state.active = true;
}

export function updateStroke(state, position, time, travelPx) {
  if (!state.active || !Number.isFinite(position) || !Number.isFinite(time) ||
      time <= state.lastTime || !Number.isFinite(travelPx) || travelPx <= 0) return 0;
  position = Math.max(0, Math.min(1, position));
  state.lastTime = time;
  if (!state.armed) {
    state.peak = Math.max(state.peak, position);
    if (state.peak - position + 1e-12 < .24) return 0;
    state.armed = true;
    state.origin = position;
    state.startTime = time;
    return 0;
  }
  if (position < state.origin) {
    state.origin = position;
    state.startTime = time;
  }
  const distance = position - state.origin;
  if (distance + 1e-12 < .22) return 0;
  state.armed = false;
  state.peak = position;
  // Average the whole accepted pull, never just its final event interval.
  return Math.min(1600, distance * travelPx * 1000 / Math.max(16, time - state.startTime));
}

export function endStroke(state) {
  state.armed = false;
  state.active = false;
}
