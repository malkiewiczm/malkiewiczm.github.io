#pragma once

#include "common.hpp"
#include "vec3.hpp"

class Bezier
{
private:
	std::vector<Vec3> curve_pts;
	std::vector<Vec3> tan_pts;
	std::vector<float> dist;
	void de_casteljau(float t, Vec3 *out_p, Vec3 *out_tangent);
	int choose_detail_lvl();
public:
	const float *spine() const {
		return reinterpret_cast<const float*>(&curve_pts[0]);
	}
	int spine_len() const {
		return curve_pts.size();
	}
	const float *mesh() const {
		return reinterpret_cast<const float*>(&control_pts[0]);
	}
	int mesh_len() const {
		return control_pts.size();
	}
	Bezier *next = nullptr;
	Bezier *prev = nullptr;
	Bezier() = default;
	Bezier(std::vector<Vec3> pts)
		: control_pts(pts) {
			recalcuate();
		}
	std::vector<Vec3> control_pts;
	void recalcuate();
	void at(float distance, Vec3 *out_p, Vec3 *out_tangent) const;
	float length() const {
		return dist.back();
	}
};