#pragma once

/// @file jump_solver.h
/// Closed-form kinematics for the SUBB SURFERS jump arc, plus a small Euler
/// integrator used to sanity-check the closed form.
///
/// Convention: gravity is a POSITIVE magnitude acting downward; the jump
/// velocity is the initial upward speed. Height y(t) = v*t - 0.5*g*t^2 with
/// y(0) = 0 (launch and landing at the same height).
///
/// The web client mirrors these formulas in TypeScript — keep both in sync.

namespace runner {

struct JumpParams {
    double gravity;       // m/s^2, positive magnitude (game default: 38.0)
    double jump_velocity; // m/s initial upward velocity (game default: 13.5)
};

/// Peak height above the launch point: v^2 / (2g). 0 for degenerate params.
double apex_height(const JumpParams& p);

/// Time to reach the apex: v / g. -1 for degenerate params.
double time_to_apex(const JumpParams& p);

/// Total air time back at the launch height: 2v / g. -1 for degenerate params.
double total_air_time(const JumpParams& p);

/// Smallest positive time at which the arc reaches height h (quadratic solve).
/// Returns the ascending crossing for 0 < h < apex, the descending/landing
/// crossing when h <= 0 (the t=0 root is excluded via epsilon), and -1 when h
/// is unreachable (above the apex) or the parameters are degenerate.
double time_to_height(const JumpParams& p, double h);

/// Horizontal distance covered during a full jump at constant forward
/// `speed` (m/s): speed * total_air_time. 0 when speed <= 0.
double horizontal_reach(const JumpParams& p, double speed);

/// Independent check of the closed form: integrates the trajectory with
/// semi-implicit (symplectic) Euler at step `dt` until landing and returns the
/// max height reached. Should sit within O(dt) of apex_height().
double validate_trajectory(const JumpParams& p, double dt = 1.0 / 240.0);

}  // namespace runner
