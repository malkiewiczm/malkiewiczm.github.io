#include "matrix.hpp"
#include <math.h>
#include <string.h>

#ifdef ROW_MAJOR
#define set0(m, x, y, z, w) m[0] = x, m[1] = y, m[2] = z, m[3] = w
#define set1(m, x, y, z, w) m[4] = x, m[5] = y, m[6] = z, m[7] = w
#define set2(m, x, y, z, w) m[8] = x, m[9] = y, m[10] = z, m[11] = w
#define set3(m, x, y, z, w) m[12] = x, m[13] = y, m[14] = z, m[15] = w
#else
#define set0(m, x, y, z, w) m[0] = x, m[4] = y, m[8] = z, m[12] = w
#define set1(m, x, y, z, w) m[1] = x, m[5] = y, m[9] = z, m[13] = w
#define set2(m, x, y, z, w) m[2] = x, m[6] = y, m[10] = z, m[14] = w
#define set3(m, x, y, z, w) m[3] = x, m[7] = y, m[11] = z, m[15] = w
#endif

#define MatrixSize (sizeof(float) * 16)
#define ZeroMatrix(m) (memset(m, 0, MatrixSize)

static void mul(float *dst, const float *src_a, const float *src_b)
{
	dst[0] = src_a[0]*src_b[0] + src_a[1]*src_b[4] + src_a[2]*src_b[8] + src_a[3]*src_b[12];
	dst[1] = src_a[0]*src_b[1] + src_a[1]*src_b[5] + src_a[2]*src_b[9] + src_a[3]*src_b[13];
	dst[2] = src_a[0]*src_b[2] + src_a[1]*src_b[6] + src_a[2]*src_b[10] + src_a[3]*src_b[14];
	dst[3] = src_a[0]*src_b[3] + src_a[1]*src_b[7] + src_a[2]*src_b[11] + src_a[3]*src_b[15];
	dst[4] = src_a[4]*src_b[0] + src_a[5]*src_b[4] + src_a[6]*src_b[8] + src_a[7]*src_b[12];
	dst[5] = src_a[4]*src_b[1] + src_a[5]*src_b[5] + src_a[6]*src_b[9] + src_a[7]*src_b[13];
	dst[6] = src_a[4]*src_b[2] + src_a[5]*src_b[6] + src_a[6]*src_b[10] + src_a[7]*src_b[14];
	dst[7] = src_a[4]*src_b[3] + src_a[5]*src_b[7] + src_a[6]*src_b[11] + src_a[7]*src_b[15];
	dst[8] = src_a[8]*src_b[0] + src_a[9]*src_b[4] + src_a[10]*src_b[8] + src_a[11]*src_b[12];
	dst[9] = src_a[8]*src_b[1] + src_a[9]*src_b[5] + src_a[10]*src_b[9] + src_a[11]*src_b[13];
	dst[10] = src_a[8]*src_b[2] + src_a[9]*src_b[6] + src_a[10]*src_b[10] + src_a[11]*src_b[14];
	dst[11] = src_a[8]*src_b[3] + src_a[9]*src_b[7] + src_a[10]*src_b[11] + src_a[11]*src_b[15];
	dst[12] = src_a[12]*src_b[0] + src_a[13]*src_b[4] + src_a[14]*src_b[8] + src_a[15]*src_b[12];
	dst[13] = src_a[12]*src_b[1] + src_a[13]*src_b[5] + src_a[14]*src_b[9] + src_a[15]*src_b[13];
	dst[14] = src_a[12]*src_b[2] + src_a[13]*src_b[6] + src_a[14]*src_b[10] + src_a[15]*src_b[14];
	dst[15] = src_a[12]*src_b[3] + src_a[13]*src_b[7] + src_a[14]*src_b[11] + src_a[15]*src_b[15];
}

static void mul(float *dst, const float *a)
{
	float to[16];
	mul(to, dst, a);
	memcpy(dst, to, MatrixSize);
}

void mat_load_identity(float *m)
{
	set0(m, 1, 0, 0, 0);
	set1(m, 0, 1, 0, 0);
	set2(m, 0, 0, 1, 0);
	set3(m, 0, 0, 0, 1);
}

void mat_rotate_x(float *m, float theta)
{
	float r[16];
	const float s = sin(theta);
	const float c = cos(theta);
	set0(r, 1, 0, 0, 0);
	set1(r, 0, c, -s, 0);
	set2(r, 0, s, c, 0);
	set3(r, 0, 0, 0, 1);
	mul(m, r);
}

void mat_rotate_y(float *m, float theta)
{
	float r[16];
	const float s = sin(theta);
	const float c = cos(theta);
	set0(r, c, 0, s, 0);
	set1(r, 0, 1, 0, 0);
	set2(r, -s, 0, c, 0);
	set3(r, 0, 0, 0, 1);
	mul(m, r);
}

void mat_rotate_z(float *m, float theta)
{
	float r[16];
	const float s = sin(theta);
	const float c = cos(theta);
	set0(r, c, -s, 0, 0);
	set1(r, s, c, 0, 0);
	set2(r, 0, 0, 1, 0);
	set3(r, 0, 0, 0, 1);
	mul(m, r);
}

void mat_look_at(float *m, const Vec3 &eye, const Vec3 &target)
{
	Vec3 F = target - eye;
	F.normalize();
	float mm[16];
	set0(mm, -F.z, 0, F.x, eye.x*F.z - eye.z*F.x);
	set1(mm, 0, 1, 0, -eye.y);
	set2(mm, -F.x, -F.y, -F.z, eye.dot(F));
	set3(mm, 0, 0, 0, 1);
	mul(m, mm);
}

void mat_ortho(float *m, float left, float right, float top, float bottom, float near, float far)
{
	float mm[16];
	const float dx = right - left;
	const float dy = top - bottom;
	const float dz = far - near;
	set0(mm, 2.0f / dx, 0, 0, (-right - left) / dx);
	set1(mm, 0, 2.0f / dy, 0, (-top - bottom) / dy);
	set2(mm, 0, 0, -2.0f / dz, (-far - near) / dz);
	set3(mm, 0, 0, 0, 1);
	mul(m, mm);
}

void mat_perspective(float *m, float fovy, float aspect, float near, float far)
{
	float mm[16];
	const float f = 1.0f / tanf(0.5f*fovy);
	set0(mm, f / aspect, 0, 0, 0);
	set1(mm, 0, f, 0, 0);
	set2(mm, 0, 0, (far + near) / (near - far), (2*far*near) / (near - far));
	set3(mm, 0, 0, -1, 0);
	mul(m, mm);
}