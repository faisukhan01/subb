#pragma once

#include <cstddef>
#include <vector>

/// @file coin_spline.h
/// Catmull-Rom spline over 3D control points, used to lay coin arcs over
/// barriers and gaps in SUBB SURFERS. Designers place the control points; the
/// game samples the spline uniformly by arc length so coin spacing stays even
/// regardless of point placement.

namespace runner {

struct Vec3 {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
};

Vec3 operator+(const Vec3& a, const Vec3& b);
Vec3 operator-(const Vec3& a, const Vec3& b);
Vec3 operator*(const Vec3& v, double s);
double dot(const Vec3& a, const Vec3& b);
double length(const Vec3& v);
double distance(const Vec3& a, const Vec3& b);

/// Centripetal-free (uniform) Catmull-Rom spline through the control points.
/// With n control points there are n-1 segments; the first/last segments use
/// phantom endpoints (end points duplicated), the standard game-spline choice.
class CoinSpline {
public:
    explicit CoinSpline(std::vector<Vec3> control_points);

    std::size_t point_count() const { return points_.size(); }
    std::size_t segment_count() const;
    const std::vector<Vec3>& control_points() const { return points_; }

    /// Position at curve parameter t in [0, 1] (t spans all segments; within a
    /// segment the parameter is uniform). Clamped at both ends.
    Vec3 sample(double t) const;

    /// Approximate arc length via chord sums (default 64 subdivisions per
    /// segment). Returns 0 for degenerate splines.
    double arc_length(std::size_t samples_per_segment = 64) const;

    /// n points evenly spaced by arc length (includes both endpoints; the last
    /// point is exactly sample(1.0)). Returns an empty vector for n == 0.
    std::vector<Vec3> uniform_resample(std::size_t n) const;

private:
    Vec3 sample_segment(std::size_t segment, double u) const;
    const Vec3& at_clamped(std::ptrdiff_t index) const;

    std::vector<Vec3> points_;
};

}  // namespace runner
