/** Small math/format helpers shared across the engine. */

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Frame-rate independent exponential smoothing.
 * `rate` is roughly "how much of the gap closes per second^e".
 */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-rate * dt));

export const randRange = (min: number, max: number): number => min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number =>
  Math.floor(randRange(min, max + 1));

export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Weighted pick — weights need not sum to 1. Returns index. */
export const weightedIndex = (weights: readonly number[]): number => {
  let total = 0;
  for (const w of weights) total += w;
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
};

export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** 1.0 when within `radius` of 0, easing to 0 at the edge. */
export const falloff = (d: number, radius: number): number =>
  d >= radius ? 0 : 1 - (d / radius) * (d / radius);

export const formatScore = (n: number): string => Math.floor(n).toLocaleString("en-US");
