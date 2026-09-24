#include "runner/jump_solver.h"

#include <algorithm>
#include <cmath>

namespace runner {

double apex_height(const JumpParams& p) {
    if (p.gravity <= 0.0 || p.jump_velocity <= 0.0) {
        return 0.0;
    }
    return (p.jump_velocity * p.jump_velocity) / (2.0 * p.gravity);
}

double time_to_apex(const JumpParams& p) {
    if (p.gravity <= 0.0 || p.jump_velocity <= 0.0) {
        return -1.0;
    }
    return p.jump_velocity / p.gravity;
}

double total_air_time(const JumpParams& p) {
    if (p.gravity <= 0.0 || p.jump_velocity <= 0.0) {
        return -1.0;
    }
    return 2.0 * p.jump_velocity / p.gravity;
}

double time_to_height(const JumpParams& p, double h) {
    if (p.gravity <= 0.0 || p.jump_velocity <= 0.0) {
        return -1.0;
    }
    // Solve y(t) = v*t - 0.5*g*t^2 = h  <=>  0.5*g*t^2 - v*t + h = 0.
    const double disc = p.jump_velocity * p.jump_velocity - 2.0 * p.gravity * h;
    if (disc < 0.0) {
        return -1.0;  // above the apex: unreachable
    }
    const double sq = std::sqrt(disc);
    const double t1 = (p.jump_velocity - sq) / p.gravity;  // ascending crossing
    const double t2 = (p.jump_velocity + sq) / p.gravity;  // descending crossing
    constexpr double kEps = 1e-9;
    if (t1 > kEps) {
        return t1;
    }
    if (t2 > kEps) {
        return t2;  // h == 0 lands here: the t=0 root is excluded on purpose
    }
    return -1.0;
}

double horizontal_reach(const JumpParams& p, double speed) {
    if (speed <= 0.0) {
        return 0.0;
    }
    const double air = total_air_time(p);
    if (air <= 0.0) {
        return 0.0;
    }
    return speed * air;
}

double validate_trajectory(const JumpParams& p, double dt) {
    if (p.gravity <= 0.0 || p.jump_velocity <= 0.0) {
        return 0.0;
    }
    if (dt <= 0.0) {
        dt = 1.0 / 240.0;
    }
    // Semi-implicit Euler: update velocity first, then position. Symplectic,
    // so energy stays well behaved for the tiny step counts used here.
    const double t_max = 2.0 * total_air_time(p) + dt;  // generous landing window
    double y = 0.0;
    double vy = p.jump_velocity;
    double t = 0.0;
    double max_y = 0.0;
    while (t <= t_max) {
        vy -= p.gravity * dt;
        y += vy * dt;
        t += dt;
        max_y = std::max(max_y, y);
        if (vy < 0.0 && y <= 0.0) {
            break;  // landed
        }
    }
    return max_y;
}

}  // namespace runner
