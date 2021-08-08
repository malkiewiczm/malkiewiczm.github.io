#include <emscripten/emscripten.h>
extern "C" void usleep(unsigned int);

#include "common.hpp"
#include "shader.hpp"
#include "matrix.hpp"
#include "bezier.hpp"
#include <math.h>

static GLint u_projection;

static inline GLint make_and_use_shader()
{
	const GLchar *vsrc = "\
	precision mediump float;\
	attribute vec3 pos;\
	uniform mat4 projection;\
	void main() {\
		gl_Position = projection * vec4(pos, 1.0);\
	}";
	const GLchar *fsrc = "\
	precision mediump float;\
	void main() {\
		vec3 f = normalize(gl_FragCoord.xyz);\
		gl_FragColor = vec4(f, 1.0);\
	}";
	GLuint vertex_shader = compile_shader(vsrc, GL_VERTEX_SHADER);
	GLuint fragment_shader = compile_shader(fsrc, GL_FRAGMENT_SHADER);
	GLuint program = link_shader({ vertex_shader, fragment_shader});
	u_projection = glGetUniformLocation(program, "projection");
	glUseProgram(program);
	return glGetAttribLocation(program, "pos");
}

static Bezier my_curve({
	{ 0.0f, 0.0f, 0.8f },
	{ 0.5f, 0.2f, -0.3f },
	{ 0.8f, -0.4f, -0.6f }
});

static float proj[16] = {
	1.0f, 0.0f, 0.0f, 0.0f,
	0.0f, 1.0f, 0.0f, 0.0f,
	0.0f, 0.0f, 1.0f, 0.0f,
	0.0f, 0.0f, 0.0f, 1.0f,
};

static inline void setup()
{
	Bezier *other_curve = new Bezier({
		{ 0.0f, 0.1f, 0.8f },
		{ 0.4f, 0.0f, 0.3f },
		{ -0.1f, 0.4f, 0.4f },
		{ -0.9f, 0.7f, 0.9f }
	});
	other_curve->prev = &my_curve;
	my_curve.next = other_curve;
	glEnable(GL_DEPTH_TEST);
	GLint a_pos = make_and_use_shader();
	GLuint vertex_buffer;
	glGenBuffers(1, &vertex_buffer);
	glBindBuffer(GL_ARRAY_BUFFER, vertex_buffer);
	glEnableVertexAttribArray(a_pos);
	glVertexAttribPointer(a_pos, 3, GL_FLOAT, false, 0, 0);
	glClearColor(0.933333f, 0.933333f, 0.933333f, 1.0f);
}

static inline void draw()
{
	static const Vec3 target { 0.0f, 0.0f, 0.0f };
	static Vec3 eye { 0.0f, 0.0f, 5.0f };
	static float theta = 0.0f;
	theta += torad(1.0f);
	eye.z = sinf(theta);
	eye.x = cosf(theta);
	mat_load_identity(proj);
	//mat_perspective(proj, torad(theta), 1.0f, 1.0f, 16.0f);
	mat_look_at(proj, eye, target);
	glUniformMatrix4fv(u_projection, 1, false, proj);
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
	for (Bezier *curve = &my_curve; curve; curve = curve->next) {
		glBufferData(GL_ARRAY_BUFFER, curve->spine_len() * 3 * sizeof(GLfloat), &curve->spine()[0], GL_STATIC_DRAW);
		glDrawArrays(GL_TRIANGLE_FAN, 0, curve->spine_len());
	}
}

int main()
{
	setup();
	emscripten_set_main_loop(draw, 0, 1);
}
