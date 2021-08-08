function compile_shader(gl: WebGLRenderingContext, source: string, is_fragment: boolean): WebGLShader {
	let shader_type = is_fragment ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
	let handle = gl.createShader(shader_type);
	if (handle == null)
		throw 'could not make shader handle';
	gl.shaderSource(handle, source);
	gl.compileShader(handle);
	if (! gl.getShaderParameter(handle, gl.COMPILE_STATUS))
		throw 'Shader program did not compile: ' + gl.getShaderInfoLog(handle);
	return handle;
}

class Shader {
	private handle: WebGLProgram;
	readonly attrib_pos: number;
	readonly attrib_normal: number;
	constructor(gl: WebGLRenderingContext, shaders: WebGLShader[], position_attribute: string, normal_attribute: string) {
		let handle = gl.createProgram();
		if (handle == null)
			throw 'could not make shader program handle';
		this.handle = handle;
		for (let item of shaders) {
			gl.attachShader(handle, item);
		}
		gl.linkProgram(handle);
		if (! gl.getProgramParameter(handle, gl.LINK_STATUS))
			throw 'Shader program did not link: ' + gl.getProgramInfoLog(handle);
		this.attrib_pos = this.init_attrib(gl, position_attribute);
		this.attrib_normal = this.init_attrib(gl, normal_attribute);
	}
	private init_attrib(gl: WebGLRenderingContext, name: string): number {
		let ret = gl.getAttribLocation(this.handle, name);
		if (ret == -1)
			throw 'could not find attribute with name "' + name + '"';
		gl.enableVertexAttribArray(ret);
		return ret;
	}
	use(gl: WebGLRenderingContext): void {
		gl.useProgram(this.handle);
	}
	getUniformLocation(gl: WebGLRenderingContext, name: string): WebGLUniformLocation {
		let ret = gl.getUniformLocation(this.handle, name);
		if (ret == null)
			throw 'uniform "' + name + "' does not exist in program";
		return ret;
	}
}

class VBO {
	private vertex_handle: WebGLBuffer;
	private normal_handle: WebGLBuffer;
	private item_count: number = 0;
	constructor(gl: WebGLRenderingContext) {
		this.vertex_handle = this.make_buffer(gl);
		this.normal_handle = this.make_buffer(gl);
	}
	private make_buffer(gl: WebGLRenderingContext): WebGLBuffer {
		let handle = gl.createBuffer();
		if (handle == null)
			throw 'could not create buffer';
		return handle;
	}
	data(gl: WebGLRenderingContext, vertex_data: Float32Array, normal_data: Float32Array): void {
		if (vertex_data.length % 4 != 0)
			throw 'vertex array not divisible by 4 (x, y, z, 0) (is ' + vertex_data.length + ')';
		if (normal_data.length % 3 != 0)
			throw 'normal array not divisible by 3 (x, y, z) (is ' + normal_data.length + ')';;
		if (vertex_data.length / 4 !== normal_data.length / 3)
			throw 'amount of vertices and normals do not match in size (' + (vertex_data.length / 4) + ' vs ' + (normal_data.length / 3) + ')';
		this.item_count = vertex_data.length / 4;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_handle);
		gl.bufferData(gl.ARRAY_BUFFER, vertex_data, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_handle);
		gl.bufferData(gl.ARRAY_BUFFER, normal_data, gl.STATIC_DRAW);
	}
	draw(gl: WebGLRenderingContext, shader: Shader, mode: number): void {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_handle);
		gl.vertexAttribPointer(shader.attrib_pos, 4, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_handle);
		gl.vertexAttribPointer(shader.attrib_normal, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(mode, 0, this.item_count);
	}
}