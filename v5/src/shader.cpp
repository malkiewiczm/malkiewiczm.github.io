#include "shader.hpp"
#include "common.hpp"
#include <string.h>

static inline bool compile_successful(GLuint obj)
{
	GLint status;
	glGetShaderiv(obj, GL_COMPILE_STATUS, &status);
	if (! status) {
		constexpr int buf_size = 1024;
		std::vector<GLchar> buf(buf_size);
		glGetShaderInfoLog(obj, buf_size, nullptr, &buf[0]);
		puts(&buf[0]);
	}
	return status;
}

static inline bool link_successful(GLuint obj)
{
	GLint status;
	glGetProgramiv(obj, GL_LINK_STATUS, &status);
	if (! status) {
		constexpr int buf_size = 1024;
		std::vector<GLchar> buf(buf_size);
		glGetProgramInfoLog(obj, buf_size, nullptr, &buf[0]);
		puts(&buf[0]);
	}
	return status;
}

GLuint compile_shader(const GLchar *source, GLenum type)
{
	GLuint handle = glCreateShader(type);
	if (handle == 0)
		die("could not create shader");
	GLint source_len = strlen(source);
	glShaderSource(handle, 1, &source, &source_len);
	glCompileShader(handle);
	if (! compile_successful(handle))
		die("shader program did not compile");
	return handle;
}

GLuint link_shader(const std::vector<GLuint> &programs)
{
	GLuint handle = glCreateProgram();
	if (handle == 0)
		die("could not create shader program");
	for (auto item : programs) {
		glAttachShader(handle, item);
	}
	glLinkProgram(handle);
	if (! link_successful(handle))
		die("shader program did not link");
	return handle;
}