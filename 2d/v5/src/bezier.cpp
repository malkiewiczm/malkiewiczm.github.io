#include "bezier.hpp"
#include <algorithm>

void Bezier::de_casteljau(float t, Vec3 *out_p, Vec3 *out_tangent)
{
	if (control_pts.empty()) {
		out_p->assign(0.0f, 0.0f, 0.0f);
		out_tangent->assign(0.0f, 0.0f, 0.0f);
		return;
	}
	if (control_pts.size() == 1) {
		*out_p = control_pts.front();
		out_tangent->assign(0.0f, 0.0f, 0.0f);
		return;
	}
	std::vector<Vec3> dp(control_pts);
	for (int i = control_pts.size() - 1; i >= 1; --i) {
		if (i == 1) {
			*out_tangent = dp[1] - dp[0];
			out_tangent->normalize();
		}
		for (int k = 0; k < i; ++k) {
			dp[k] = lerp(dp[k], dp[k + 1], t);
		}
	}
	*out_p = dp.front();
	//let curvature = (tangent.x * d2_tangent.y - tangent.y * d2_tangent.x) * Math.pow(tangent.magSq(), -1.5);
}

int Bezier::choose_detail_lvl()
{
	float estimated_len = 0;
	for (size_t i = 1; i < control_pts.size(); ++i) {
		estimated_len += control_pts[i].dist(control_pts[i - 1]);
	}
	//int detail_lvl = std::max(static_cast<int>(ceil(estimated_len / 2.0f)), 15);
	int detail_lvl = std::max(static_cast<int>(ceil(estimated_len * 15)), 15);
	curve_pts.resize(detail_lvl + 1);
	tan_pts.resize(detail_lvl + 1);
	dist.resize(detail_lvl + 1);
	return detail_lvl;
}

void Bezier::recalcuate()
{
	int detail_lvl = choose_detail_lvl();
	de_casteljau(0.0f, &curve_pts[0], &tan_pts[0]);
	dist[0] = 0.0f;
	for (int i = 1; i <= detail_lvl; ++i) {
		const float t = i / static_cast<float>(detail_lvl);
		de_casteljau(t, &curve_pts[i], &tan_pts[i]);
		dist[i] = dist[i - 1] + curve_pts[i - 1].dist(curve_pts[i]);
	}
}

void Bezier::at(float distance, Vec3 *out_p, Vec3 *out_tangent) const
{
	auto iter = std::lower_bound(dist.begin(), dist.end(), distance);
	if (iter == dist.begin()) {
		*out_p = curve_pts.front() + tan_pts.front() * distance;
		*out_tangent = tan_pts.front();
	} else if (iter == dist.end()) {
		distance -= dist.back();
		*out_p = curve_pts.back() + tan_pts.back() * distance;
		*out_tangent = tan_pts.back();
	} else {
		const int index = iter - dist.begin();
		const float t = (distance - dist[index - 1]) / (dist[index] - dist[index - 1]);
		*out_p = lerp(curve_pts[index - 1], curve_pts[index], t);
		*out_tangent = lerp(tan_pts[index - 1], tan_pts[index], t);
	}
}