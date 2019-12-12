#pragma once

#include <math.h>

struct Vec3 {
	float x, y, z;
	Vec3 dup() const {
		return { x, y, z };
	}
	void assign(float nx, float ny, float nz) {
		x = nx;
		y = ny;
		z = nz;
	}
	void normalize() {
		const float s = 1 / mag();
		x *= s;
		y *= s;
		z *= s;
	}
	float magsq() const {
		return x*x + y*y + z*z;
	}
	float mag() const {
		return sqrt(x*x + y*y + z*z);
	}
	float distsq(const Vec3 &v) const {
		const float dx = v.x - x;
		const float dy = v.y - y;
		const float dz = v.z - z;
		return dx*dx + dy*dy + dz*dz;
	}
	float dist(const Vec3 &v) const {
		const float dx = v.x - x;
		const float dy = v.y - y;
		const float dz = v.z - z;
		return sqrt(dx*dx + dy*dy + dz*dz);
	}
	float dot(const Vec3 &v) const {
		return x*v.x + y*v.y + z*v.z;
	}
	Vec3 operator* (const float s) const {
		return { x * s, y * s, z * s };
	}
	Vec3 operator+ (const Vec3 &v) const {
		return { x + v.x, y + v.y, z + v.z };
	}
	Vec3 operator- (const Vec3 &v) const {
		return { x - v.x, y - v.y, z - v.z };
	}
	Vec3 operator~ () const {
		const float s = 1 / mag();
		return { x*s, y*s, z*s};
	}
};

static_assert(sizeof(Vec3) == 3*sizeof(float), "vec3 not binary compatible with 3 floats");

template <typename T>
static inline T lerp(const T &a, const T &b, const float t)
{
	return a + (b - a) * t;
}