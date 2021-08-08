function make_default_shader(gl: WebGLRenderingContext): Shader {
	let vsrc = `
	precision mediump float;
	attribute vec4 pos;
	attribute vec3 normals;
	uniform mat4 projection;
	varying vec3 normal;
	void main() {
		gl_Position = projection * pos;
		normal = normalize((projection * vec4(normals, 0.0)).xyz);
	}
	`;
	let fsrc = `
	precision mediump float;
	varying vec3 normal;
	void main() {
		//gl_FragColor = vec4(0.5, 0.5, 1.0 - gl_FragCoord.z, 1.0);
		vec4 color = vec4(0.0, 1.0, 1.0, 1.0);
		gl_FragColor = color * normal.x;
	}
	`;
	let vertex_shader = compile_shader(gl, vsrc, false);
	let fragment_shader = compile_shader(gl, fsrc, true);
	return new Shader(gl, [ vertex_shader, fragment_shader], 'pos', 'normals');
}

function make_shape(vertex: number[], normals: number[]): void {
	let mv = [
		-0.5, -0.5, -0.5,
		0.5, -0.5, -0.5,
		0.5, 0.5, -0.5,
	];
	let mn = [
		0, 0, 1,
		0, 0, 1,
		0, 0, 1,
	]
	for (let i = 0, j = 0; i < mv.length; i += 3, j += 4) {
		vertex[j] = mv[i];
		vertex[j+1] = mv[i+1];
		vertex[j+2] = mv[i+2];
		vertex[j+3] = 1.0;
		normals[i] = mn[i];
		normals[i+1] = mn[i+1];
		normals[i+2] = mn[i+2];
	}
}

window.addEventListener('load', function() {
	let canvas = document.getElementById('canvas') as HTMLCanvasElement;
	let gl = canvas.getContext('webgl', {
		alpha: false,
		antiAlias: true,
		stencil: false,
		depth: true
	}) as WebGLRenderingContext;
	function resize(): void {
		let w = window.innerWidth - 25;
		let h = window.innerHeight - 25;
		if (w > h) {
			w = h;
		} else {
			h = w;
		}
		canvas.width = w;
		canvas.height = h;
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}
	window.addEventListener('resize', resize);
	resize();
	let theta = 0.0;
	window.addEventListener('mousemove', (e: MouseEvent) => {
		theta = (e.x / window.innerWidth) * Math.PI * 2;
	});
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	let shader = make_default_shader(gl);
	let vbo = new VBO(gl);
	(function() {
		let vertex: number[] = [];
		let normals: number[] = [];
		make_shape(vertex, normals);
		vbo.data(gl, new Float32Array(vertex), new Float32Array(normals));
	})();
	let uProjection = shader.getUniformLocation(gl, 'projection');
	shader.use(gl);
	let projection = new Matrix();
	const sqrt_1_3 = 1 / Math.sqrt(3);
	function tick(): void {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		projection.rotate(theta, sqrt_1_3, sqrt_1_3, sqrt_1_3);
		gl.uniformMatrix4fv(uProjection, false, projection.arr);
		vbo.draw(gl, shader, gl.TRIANGLES);
		window.requestAnimationFrame(tick);
	}
	tick();
});