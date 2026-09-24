#include "runner/coin_spline.h"

#include <algorithm>
#include <cmath>
#include <utility>

namespace runner {

Vec3 operator+(const Vec3& a, const Vec3& b) {
    return Vec3{a.x + b.x, a.y + b.y, a.z + b.z};
}

Vec3 operator-(const Vec3& a, const Vec3& b) {
    return Vec3{a.x - b.x, a.y - b.y, a.z - b.z};
}

Vec3 operator*(const Vec3& v, double s) {
    return Vec3{v.x * s, v.y * s, v.z * s};
}

double dot(const Vec3& a, const Vec3& b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

double length(const Vec3& v) {
    return std::sqrt(dot(v, v));
}

double distance(const Vec3& a, const Vec3& b) {
    return length(b - a);
}

CoinSpline::CoinSpline(std::vector<Vec3> control_points)
    : points_(std::move(control_points)) {}

std::size_t CoinSpline::segment_count() const {
    return points_.size() >= 2 ? points_.size() - 1 : 0;
}

const Vec3& CoinSpline::at_clamped(std::ptrdiff_t index) const {
    const std::ptrdiff_t last = static_cast<std::ptrdiff_t>(points_.size()) - 1;
    return points_[static_cast<std::size_t>(std::clamp<std::ptrdiff_t>(index, 0, last))];
}

Vec3 CoinSpline::sample_segment(std::size_t segment, double u) const {
    // Standard uniform Catmull-Rom: phantom endpoints at the curve ends.
    const Vec3& p0 = at_clamped(static_cast<std::ptrdiff_t>(segment) - 1);
    const Vec3& p1 = points_[segment];
    const Vec3& p2 = points_[segment + 1];
    const Vec3& p3 = at_clamped(static_cast<std::ptrdiff_t>(segment) + 2);

    const double u2 = u * u;
    const double u3 = u2 * u;

    // 0.5 * [ (2p1) + (-p0 + p2)u + (2p0 - 5p1 + 4p2 - p3)u^2 + (-p0 + 3p1 - 3p2 + p3)u^3 ]
    Vec3 a = p1 * 2.0;
    Vec3 b = (p2 - p0) * u;
    Vec3 c = (p0 * 2.0 - p1 * 5.0 + p2 * 4.0 - p3) * u2;
    Vec3 d = (p0 * -1.0 + p1 * 3.0 - p2 * 3.0 + p3) * u3;
    return (a + b + c + d) * 0.5;
}

Vec3 CoinSpline::sample(double t) const {
    if (points_.empty()) {
        return Vec3{};
    }
    if (points_.size() == 1) {
        return points_.front();
    }
    t = std::clamp(t, 0.0, 1.0);
    const double segments = static_cast<double>(segment_count());
    const double s = t * segments;
    std::size_t segment = static_cast<std::size_t>(s);
    if (segment >= segment_count()) {
        segment = segment_count() - 1;
    }
    const double u = s - static_cast<double>(segment);
    return sample_segment(segment, u);
}

double CoinSpline::arc_length(std::size_t samples_per_segment) const {
    if (segment_count() == 0) {
        return 0.0;
    }
    if (samples_per_segment == 0) {
        samples_per_segment = 64;
    }
    const std::size_t segments = segment_count();
    double total = 0.0;
    Vec3 prev = sample(0.0);
    const std::size_t total_samples = segments * samples_per_segment;
    for (std::size_t i = 1; i <= total_samples; ++i) {
        const Vec3 cur = sample(static_cast<double>(i) / static_cast<double>(total_samples));
        total += distance(prev, cur);
        prev = cur;
    }
    return total;
}

std::vector<Vec3> CoinSpline::uniform_resample(std::size_t n) const {
    std::vector<Vec3> out;
    if (n == 0 || points_.empty()) {
        return out;
    }
    if (points_.size() == 1 || n == 1) {
        out.assign(n, sample(0.0));
        return out;
    }

    // Fine cumulative-length table over the whole curve.
    constexpr std::size_t kSamplesPerSegment = 64;
    const std::size_t steps = segment_count() * kSamplesPerSegment;
    std::vector<Vec3> fine;
    std::vector<double> cumulative;
    fine.reserve(steps + 1);
    cumulative.reserve(steps + 1);
    fine.push_back(sample(0.0));
    cumulative.push_back(0.0);
    for (std::size_t i = 1; i <= steps; ++i) {
        const Vec3 p = sample(static_cast<double>(i) / static_cast<double>(steps));
        cumulative.push_back(cumulative.back() + distance(fine.back(), p));
        fine.push_back(p);
    }
    const double total = cumulative.back();
    if (total <= 0.0) {
        out.assign(n, fine.front());
        return out;
    }

    out.reserve(n);
    std::size_t cursor = 0;
    for (std::size_t k = 0; k < n; ++k) {
        const double target = total * static_cast<double>(k) / static_cast<double>(n - 1);
        while (cursor + 1 < cumulative.size() && cumulative[cursor + 1] < target) {
            ++cursor;
        }
        const double span = cumulative[cursor + 1] - cumulative[cursor];
        const double f = span > 0.0 ? (target - cumulative[cursor]) / span : 0.0;
        out.push_back(fine[cursor] + (fine[cursor + 1] - fine[cursor]) * f);
    }
    return out;
}

}  // namespace runner
