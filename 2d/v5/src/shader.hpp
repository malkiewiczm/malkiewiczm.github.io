#pragma once

#include "common.hpp"

GLuint compile_shader(const GLchar *source, GLenum type);
GLuint link_shader(const std::vector<GLuint> &programs);