attribute vec4 inputPosition;
attribute vec4 crv;

uniform mat4 projection;
uniform mat4 modelview;

uniform int crvMode;
uniform float maxCrv;
uniform float minCrv;

varying vec3 vColor;

varying mediump vec4 position;

vec3 crv2color(vec4 curvature) {
	float c;
	vec3 colors[5];
	colors[0] = vec3(0.0, 0.0, 0.85);// blue
	colors[1] = vec3(0.0, 0.9, 0.9);// cyan
	colors[2] = vec3(0.0, 0.75, 0.0);// green
	colors[3] = vec3(0.9, 0.9, 0.0);// yellow
	colors[4] = vec3(0.85, 0.0, 0.0);// red
	vec3 max_out_color = vec3(0.9, 0.9, 0.9);
	vec3 min_out_color = vec3(0.1, 0.1, 0.1);
	if (crvMode == 0) {
		c = curvature.x;
	} else if (crvMode == 1) {
		c = curvature.y;
	} else if (crvMode == 2) {
		c = curvature.z;
	} else if (crvMode == 3) {
		c = curvature.w;
	}
	if (abs(maxCrv - minCrv) < 0.00001) {
		c = 0.5;
	} else if (c < minCrv - 0.00001) {
		return min_out_color;
	} else if (c > maxCrv + 0.00001) {
		return max_out_color;
	} else {
		c = (c - minCrv) / (maxCrv - minCrv);
	}
	if (c > 1.0)
		return max_out_color;
	else if (c < 0.0)
		return min_out_color;
	else if (c > 0.75)
		return (c - 0.75) / 0.25 * colors[4] + (1.0 - c) / 0.25 * colors[3];
	else if (c > 0.5)
		return (c - 0.5) / 0.25 * colors[3] + (0.75 - c) / 0.25 * colors[2];
	else if (c > 0.25)
		return (c - 0.25) / 0.25 * colors[2] + (0.5 - c) / 0.25 * colors[1];
	else if (c > 0.0)
		return (c) / 0.25 * colors[1] + (0.25 - c ) / 0.25 * colors[0];
	return colors[0];
}

void main() {
    position = modelview * inputPosition;
    vColor = crv2color(crv);
    gl_Position = projection * position;
}
