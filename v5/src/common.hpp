#pragma once

#include <stdio.h>
#include <stdlib.h>
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#include <vector>
#include <array>

void _die(const char *msg, const char *file, int line);
#define die(msg) _die(msg, __FILE__, __LINE__)
#define lintf(fmt, ...)(printf("[%s:%d] " fmt, __FILE__, __LINE__, __VA_ARGS__))

#define torad(a) (0.0174532f * (a))
#define todeg(a) (57.295779f * (a))
