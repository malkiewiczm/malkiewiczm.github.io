#pragma once

#include "vec3.hpp"

void mat_load_identity(float *m);
void mat_rotate_x(float *m, float theta);
void mat_rotate_y(float *m, float theta);
void mat_rotate_z(float *m, float theta);
void mat_look_at(float *m, const Vec3 &eye, const Vec3 &target);
void mat_ortho(float *m, float left, float right, float top, float bottom, float near, float far);
void mat_perspective(float *m, float fovy, float aspect, float near, float far);