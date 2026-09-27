// Falling foreground weather is screen/time-driven, never camera-anchored.
// Haze belongs to the parallax planes; individual drops do not.
export function rainPosition(index, seconds, height) {
  const span = height + 100;
  const speed = 205 + index % 5 * 34;
  return {
    x: ((index * 97.31 + seconds * (19 + index % 3 * 12)) % 420 + 420) % 420 - 15,
    y: ((index * 211.7 + seconds * speed) % span + span) % span - 50,
  };
}
