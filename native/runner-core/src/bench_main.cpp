// runner_bench — prints the closed-form jump solver values for the game's
// constants and benchmarks the coin spline sampler.
//
// Build (no CMake needed):
//   g++ -std=c++17 -O2 -Iinclude src/*.cpp -o /tmp/runner_bench && /tmp/runner_bench
//
// Build via CMake:
//   cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j
//   ./build/runner_bench

#include <chrono>
#include <cmath>
#include <cstdio>
#include <vector>

#include "runner/coin_spline.h"
#include "runner/jump_solver.h"

using runner::CoinSpline;
using runner::JumpParams;
using runner::Vec3;

namespace {

// The exact constants shipped in the game client.
constexpr double kGravity = 38.0;       // m/s^2
constexpr double kJumpVelocity = 13.5;  // m/s
constexpr double kSpeeds[] = {12.0, 15.0, 18.0, 21.0, 24.0, 27.0, 30.0};
constexpr double kHeights[] = {1.0, 1.5, 2.0, 2.3};

JumpParams game_jump() {
    return JumpParams{kGravity, kJumpVelocity};
}

CoinSpline demo_coin_arc() {
    // A coin arc over a barrier: rises like the jump curve, weaves across the
    // three lanes (x = -1.75 / 0 / 1.75), then descends to the ground.
    std::vector<Vec3> points;
    points.reserve(9);
    for (int i = 0; i < 9; ++i) {
        const double x = i * 5.0;
        const double phase = static_cast<double>(i) / 8.0;
        const double y = 2.4 * std::sin(3.14159265358979323846 * phase);
        const double z = ((i % 2) == 0) ? 1.75 : -1.75;
        points.push_back(Vec3{x, y, z});
    }
    return CoinSpline(points);
}

void print_solver_demo() {
    const JumpParams jump = game_jump();
    std::printf("== SUBB SURFERS runner-core: closed-form jump solver ==\n");
    std::printf("gravity = %.1f m/s^2, jump_velocity = %.1f m/s\n\n", kGravity, kJumpVelocity);

    std::printf("apex_height      = %.4f m\n", runner::apex_height(jump));
    std::printf("time_to_apex     = %.4f s\n", runner::time_to_apex(jump));
    std::printf("total_air_time   = %.4f s\n\n", runner::total_air_time(jump));

    std::printf("time_to_height (ascending crossing):\n");
    for (const double h : kHeights) {
        std::printf("  h = %.1f m -> t = %+.4f s\n", h, runner::time_to_height(jump, h));
    }
    std::printf("  h = 2.6 m (above apex) -> t = %+.2f s (expected -1)\n\n",
                runner::time_to_height(jump, 2.6));

    std::printf("horizontal_reach at game speeds:\n");
    for (const double speed : kSpeeds) {
        std::printf("  speed = %2.0f m/s -> %.3f m\n", speed, runner::horizontal_reach(jump, speed));
    }

    const double closed_form = runner::apex_height(jump);
    const double integrated = runner::validate_trajectory(jump);
    std::printf("\nEuler sanity check (dt = 1/240):\n");
    std::printf("  closed-form apex = %.6f m, integrated max height = %.6f m, delta = %.6f m\n",
                closed_form, integrated, std::fabs(integrated - closed_form));
}

void bench_spline() {
    const CoinSpline spline = demo_coin_arc();
    const double arc = spline.arc_length();

    std::printf("\n== coin spline ==\n");
    std::printf("control points = %zu, segments = %zu, arc length = %.3f m\n",
                spline.point_count(), spline.segment_count(), arc);

    std::vector<Vec3> coins = spline.uniform_resample(20);
    std::printf("uniform resample(20): first = (%.3f, %.3f, %.3f)  last = (%.3f, %.3f, %.3f)\n",
                coins.front().x, coins.front().y, coins.front().z,
                coins.back().x, coins.back().y, coins.back().z);

    constexpr int kSamples = 1'000'000;
    const auto start = std::chrono::steady_clock::now();

    double sink = 0.0;
    for (int i = 0; i < kSamples; ++i) {
        const double t = static_cast<double>(i & 1023) / 1023.0;
        const Vec3 p = spline.sample(t);
        sink += p.x + p.y + p.z;
    }

    const auto elapsed = std::chrono::steady_clock::now() - start;
    const double ns =
        std::chrono::duration_cast<std::chrono::nanoseconds>(elapsed).count();
    std::printf("\nbenchmark: %d spline samples in %.2f ms -> %.1f ns/sample (checksum %.2f)\n",
                kSamples, ns / 1e6, ns / static_cast<double>(kSamples), sink);

    // Defeat constant folding of the whole loop in aggressive optimizers.
    if (sink == 42.0) {
        std::fprintf(stderr, "impossible checksum\n");
    }
}

}  // namespace

int main() {
    print_solver_demo();
    bench_spline();
    return 0;
}
