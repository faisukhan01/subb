# runner-core

C++17 hot-path math library for SUBB SURFERS: closed-form jump kinematics and
the Catmull-Rom coin splines used to lay coin arcs over barriers. Header API in
`include/runner/`, implementation in `src/`, plus a benchmark/demo binary.

## Jump solver (`include/runner/jump_solver.h`)

Convention: gravity is a **positive magnitude** acting downward; `y(t) = v*t - 0.5*g*t^2`
with launch and landing at the same height.

| Function | Meaning |
| --- | --- |
| `apex_height(JumpParams)` | Peak height `v²/(2g)` |
| `time_to_apex(JumpParams)` | `v/g` |
| `total_air_time(JumpParams)` | `2v/g` |
| `time_to_height(JumpParams, h)` | Smallest positive root of the quadratic; ascending crossing for `0 < h < apex`, landing crossing for `h <= 0`, `-1` when unreachable/degenerate |
| `horizontal_reach(JumpParams, speed)` | `speed * total_air_time` |
| `validate_trajectory(JumpParams, dt)` | Semi-implicit Euler integration of a full jump; returns max height (sanity check for the closed form) |

Game constants: `gravity = 38 m/s²`, `jump_velocity = 13.5 m/s` → apex ≈ 2.398 m,
air time ≈ 0.711 s, reach ≈ 8.53–21.32 m for speeds 12–30 m/s.

### TypeScript mirror (web client)

The web game replicates the exact same formulas:

```ts
export const GRAVITY = 38.0;         // m/s^2
export const JUMP_VELOCITY = 13.5;   // m/s

export function apexHeight(v = JUMP_VELOCITY, g = GRAVITY): number {
  return (v * v) / (2 * g);
}
export function timeToApex(v = JUMP_VELOCITY, g = GRAVITY): number {
  return v / g;
}
export function totalAirTime(v = JUMP_VELOCITY, g = GRAVITY): number {
  return (2 * v) / g;
}
// smallest positive root of 0.5*g*t^2 - v*t + h = 0, or null when unreachable
export function timeToHeight(h: number, v = JUMP_VELOCITY, g = GRAVITY): number | null {
  const disc = v * v - 2 * g * h;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t1 = (v - sq) / g;
  const t2 = (v + sq) / g;
  if (t1 > 1e-9) return t1;
  if (t2 > 1e-9) return t2;
  return null;
}
export function horizontalReach(speed: number, v = JUMP_VELOCITY, g = GRAVITY): number {
  return speed * totalAirTime(v, g);
}
```

Keep the C++ and TypeScript values in sync when tuning the jump.

## Coin spline (`include/runner/coin_spline.h`)

`CoinSpline` fits a uniform Catmull-Rom curve through 3D control points
(phantom endpoints on the first/last segments) — designers place points, the
game samples coins evenly along the arc:

- `sample(t)` — position at `t ∈ [0,1]` across the whole curve.
- `arc_length(n)` — chord-sum length (64 subdivisions/segment by default).
- `uniform_resample(n)` — `n` points evenly spaced by arc length, endpoints exact.

`runner_bench` lays a 9-point arc over a barrier, resamples 20 coins, and
benchmarks 1,000,000 samples.

## Build

```bash
# CMake (CI)
cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j && ./build/runner_bench

# bare g++ (no cmake required)
g++ -std=c++17 -O2 -Wall -Wextra -Iinclude src/*.cpp -o /tmp/runner_bench && /tmp/runner_bench
```
