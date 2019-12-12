"use strict";
function compile_shader(gl, source, is_fragment) {
    var shader_type = is_fragment ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
    var handle = gl.createShader(shader_type);
    if (handle == null)
        throw 'could not make shader handle';
    gl.shaderSource(handle, source);
    gl.compileShader(handle);
    if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS))
        throw 'Shader program did not compile: ' + gl.getShaderInfoLog(handle);
    return handle;
}
var Shader = (function () {
    function Shader(gl, shaders, position_attribute, normal_attribute) {
        var handle = gl.createProgram();
        if (handle == null)
            throw 'could not make shader program handle';
        this.handle = handle;
        for (var _i = 0, shaders_1 = shaders; _i < shaders_1.length; _i++) {
            var item = shaders_1[_i];
            gl.attachShader(handle, item);
        }
        gl.linkProgram(handle);
        if (!gl.getProgramParameter(handle, gl.LINK_STATUS))
            throw 'Shader program did not link: ' + gl.getProgramInfoLog(handle);
        this.attrib_pos = this.init_attrib(gl, position_attribute);
        this.attrib_normal = this.init_attrib(gl, normal_attribute);
    }
    Shader.prototype.init_attrib = function (gl, name) {
        var ret = gl.getAttribLocation(this.handle, name);
        if (ret == -1)
            throw 'could not find attribute with name "' + name + '"';
        gl.enableVertexAttribArray(ret);
        return ret;
    };
    Shader.prototype.use = function (gl) {
        gl.useProgram(this.handle);
    };
    Shader.prototype.getUniformLocation = function (gl, name) {
        var ret = gl.getUniformLocation(this.handle, name);
        if (ret == null)
            throw 'uniform "' + name + "' does not exist in program";
        return ret;
    };
    return Shader;
}());
var VBO = (function () {
    function VBO(gl) {
        this.item_count = 0;
        this.vertex_handle = this.make_buffer(gl);
        this.normal_handle = this.make_buffer(gl);
    }
    VBO.prototype.make_buffer = function (gl) {
        var handle = gl.createBuffer();
        if (handle == null)
            throw 'could not create buffer';
        return handle;
    };
    VBO.prototype.data = function (gl, vertex_data, normal_data) {
        if (vertex_data.length % 4 != 0)
            throw 'vertex array not divisible by 4 (x, y, z, 0) (is ' + vertex_data.length + ')';
        if (normal_data.length % 3 != 0)
            throw 'normal array not divisible by 3 (x, y, z) (is ' + normal_data.length + ')';
        ;
        if (vertex_data.length / 4 !== normal_data.length / 3)
            throw 'amount of vertices and normals do not match in size (' + (vertex_data.length / 4) + ' vs ' + (normal_data.length / 3) + ')';
        this.item_count = vertex_data.length / 4;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_handle);
        gl.bufferData(gl.ARRAY_BUFFER, vertex_data, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_handle);
        gl.bufferData(gl.ARRAY_BUFFER, normal_data, gl.STATIC_DRAW);
    };
    VBO.prototype.draw = function (gl, shader, mode) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_handle);
        gl.vertexAttribPointer(shader.attrib_pos, 4, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_handle);
        gl.vertexAttribPointer(shader.attrib_normal, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(mode, 0, this.item_count);
    };
    return VBO;
}());
var Matrix = (function () {
    function Matrix() {
        this.arr = new Float32Array(16);
        this.identity();
    }
    Matrix.prototype.identity = function () {
        this.set0(1, 0, 0, 0);
        this.set1(0, 1, 0, 0);
        this.set2(0, 0, 1, 0);
        this.set3(0, 0, 0, 1);
    };
    Matrix.prototype.rotate = function (theta, x, y, z) {
        var s = Math.sin(theta);
        var c = Math.cos(theta);
        var f = 1 - c;
        this.set0(x * x * f + c, x * y * f - z * s, x * z * f + y * s, 0);
        this.set1(y * x * f + z * s, y * y * f + c, y * z * f - x * s, 0);
        this.set2(x * z * f - y * s, y * z * f + x * s, z * z * f + c, 0);
        this.set3(0, 0, 0, 1);
    };
    ;
    Matrix.prototype.set0 = function (x0, x1, x2, x3) {
        this.arr[0] = x0;
        this.arr[4] = x1;
        this.arr[8] = x2;
        this.arr[12] = x3;
    };
    Matrix.prototype.set1 = function (x0, x1, x2, x3) {
        this.arr[1] = x0;
        this.arr[5] = x1;
        this.arr[9] = x2;
        this.arr[13] = x3;
    };
    Matrix.prototype.set2 = function (x0, x1, x2, x3) {
        this.arr[2] = x0;
        this.arr[6] = x1;
        this.arr[10] = x2;
        this.arr[14] = x3;
    };
    Matrix.prototype.set3 = function (x0, x1, x2, x3) {
        this.arr[3] = x0;
        this.arr[7] = x1;
        this.arr[11] = x2;
        this.arr[15] = x3;
    };
    return Matrix;
}());
var SCALE = 12.0;
var Vec2 = (function () {
    function Vec2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vec2.prototype.assign = function (rhs) {
        this.x = rhs.x;
        this.y = rhs.y;
    };
    Vec2.prototype.dup = function () {
        return new Vec2(this.x, this.y);
    };
    Vec2.prototype.pixels = function () {
        this.x *= SCALE;
        this.y *= SCALE;
    };
    Vec2.prototype.meters = function () {
        this.x /= SCALE;
        this.y /= SCALE;
    };
    Vec2.prototype.draw = function (ctx) {
        var r = 7;
        ctx.beginPath();
        ctx.moveTo(this.x - r, this.y - r);
        ctx.lineTo(this.x + r, this.y + r);
        ctx.moveTo(this.x - r, this.y + r);
        ctx.lineTo(this.x + r, this.y - r);
        ctx.stroke();
    };
    Vec2.prototype.dot = function (rhs) {
        return this.x * rhs.x + this.y * rhs.y;
    };
    Vec2.prototype.distSq = function (rhs) {
        var dx = rhs.x - this.x;
        var dy = rhs.y - this.y;
        return dx * dx + dy * dy;
    };
    Vec2.prototype.dist = function (rhs) {
        var dx = rhs.x - this.x;
        var dy = rhs.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    };
    Vec2.prototype.magSq = function () {
        return this.x * this.x + this.y * this.y;
    };
    Vec2.prototype.mag = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };
    Vec2.prototype.normalize = function () {
        var m = this.mag();
        this.x /= m;
        this.y /= m;
    };
    Vec2.prototype.lerp = function (p, t) {
        this.x += (p.x - this.x) * t;
        this.y += (p.y - this.y) * t;
    };
    Vec2.prototype.scale = function (amt) {
        this.x *= amt;
        this.y *= amt;
    };
    return Vec2;
}());
var TRACK_DETAIL_LVL = 20;
var Track = (function () {
    function Track(A, B, C, D) {
        this.A = A;
        this.B = B;
        this.C = C;
        this.D = D;
        this.pts = [];
        this.tans = [];
        this.dist = [];
        this.prev = null;
        this.next = null;
        this.draw_A = new Vec2(0, 0);
        this.draw_B = new Vec2(0, 0);
        this.draw_C = new Vec2(0, 0);
        this.draw_D = new Vec2(0, 0);
        for (var i = 0; i <= TRACK_DETAIL_LVL; ++i) {
            this.pts.push(new Vec2(0, 0));
            this.tans.push(new Vec2(0, 0));
            this.dist.push(0);
        }
        this.calculate();
    }
    Track.prototype.location = function (t, p) {
        p.x = -this.A.x * t * t * t + 3 * this.A.x * t * t - 3 * this.A.x * t + this.A.x + 3 * this.B.x * t * t * t - 6 * this.B.x * t * t + 3 * this.B.x * t - 3 * this.C.x * t * t * t + 3 * this.C.x * t * t + this.D.x * t * t * t;
        p.y = -this.A.y * t * t * t + 3 * this.A.y * t * t - 3 * this.A.y * t + this.A.y + 3 * this.B.y * t * t * t - 6 * this.B.y * t * t + 3 * this.B.y * t - 3 * this.C.y * t * t * t + 3 * this.C.y * t * t + this.D.y * t * t * t;
    };
    Track.prototype.tangent = function (t, p) {
        p.x = -3 * this.A.x * t * t + 6 * this.A.x * t - 3 * this.A.x + 9 * this.B.x * t * t - 12 * this.B.x * t + 3 * this.B.x - 9 * this.C.x * t * t + 6 * this.C.x * t + 3 * this.D.x * t * t;
        p.y = -3 * this.A.y * t * t + 6 * this.A.y * t - 3 * this.A.y + 9 * this.B.y * t * t - 12 * this.B.y * t + 3 * this.B.y - 9 * this.C.y * t * t + 6 * this.C.y * t + 3 * this.D.y * t * t;
        p.normalize();
    };
    Track.prototype.calculate = function () {
        this.location(0, this.pts[0]);
        this.tangent(0, this.tans[0]);
        this.dist[0] = 0;
        for (var i = 1; i <= TRACK_DETAIL_LVL; ++i) {
            var t = i / TRACK_DETAIL_LVL;
            this.location(t, this.pts[i]);
            this.tangent(t, this.tans[i]);
            this.dist[i] = this.dist[i - 1] + this.pts[i - 1].dist(this.pts[i]);
        }
        this.draw_A.assign(this.A);
        this.draw_B.assign(this.B);
        this.draw_C.assign(this.C);
        this.draw_D.assign(this.D);
        this.draw_A.pixels();
        this.draw_B.pixels();
        this.draw_C.pixels();
        this.draw_D.pixels();
    };
    Track.prototype.dist_to_loc = function (d, p, dir) {
        var first = 0;
        var last = this.pts.length;
        var count = last - first;
        while (count > 0) {
            var step = Math.floor(count / 2);
            var it = first + step;
            if (this.dist[it] < d) {
                first = it + 1;
                count -= step + 1;
            }
            else {
                count = step;
            }
        }
        if (first == 0) {
            dir.assign(this.tans[0]);
            p.x = this.pts[0].x + dir.x * d;
            p.y = this.pts[0].y + dir.y * d;
        }
        else if (first == this.pts.length) {
            dir.assign(this.tans[this.pts.length - 1]);
            d -= this.dist[this.pts.length - 1];
            p.x = this.pts[this.pts.length - 1].x + dir.x * d;
            p.y = this.pts[this.pts.length - 1].y + dir.y * d;
        }
        else {
            var diff = this.dist[first] - this.dist[first - 1];
            var t = (d - this.dist[first - 1]) / diff;
            p.assign(this.pts[first - 1]);
            p.lerp(this.pts[first], t);
            dir.assign(this.tans[first - 1]);
            dir.lerp(this.tans[first], t);
        }
    };
    Track.prototype.length = function () {
        return this.dist[this.dist.length - 1];
    };
    Track.prototype.draw = function (ctx) {
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(this.draw_A.x, this.draw_A.y);
        ctx.bezierCurveTo(this.draw_B.x, this.draw_B.y, this.draw_C.x, this.draw_C.y, this.draw_D.x, this.draw_D.y);
        ctx.stroke();
        ctx.strokeStyle = 'blue';
        this.draw_A.draw(ctx);
        this.draw_B.draw(ctx);
        this.draw_C.draw(ctx);
        this.draw_D.draw(ctx);
    };
    return Track;
}());
function make_track(data) {
    if (data.length < 3)
        return null;
    if (data.length % 3 != 1)
        return null;
    var head = new Track(data[0], data[1], data[2], data[3]);
    var last = head;
    for (var i = 6; i < data.length; i += 3) {
        var track = new Track(data[i - 3], data[i - 2], data[i - 1], data[i]);
        track.prev = last;
        last.next = track;
        last = track;
    }
    return head;
}
var GRAVITY = new Vec2(0.0, 9.81);
var Car = (function () {
    function Car(track) {
        this.track = track;
        this.draw_loc = new Vec2(0, 0);
        this.dir = new Vec2(0, 0);
        this.normal = new Vec2(0, 0);
        this.pos = 0.5;
        this.vel = 0.0;
        this.ff_pos = new Vec2(10, 30);
        this.ff_vel = new Vec2(10, -10);
    }
    Car.prototype.step = function (time) {
        if (!this.track) {
            this.ff_pos.x += this.ff_vel.x * time;
            this.ff_pos.y += this.ff_vel.y * time;
            this.ff_vel.x += GRAVITY.x * time;
            this.ff_vel.y += GRAVITY.y * time;
            this.draw_loc.assign(this.ff_pos);
            this.draw_loc.pixels();
            return;
        }
        this.track.dist_to_loc(this.pos, this.draw_loc, this.dir);
        this.normal.x = this.dir.y;
        this.normal.y = -this.dir.x;
        this.vel += this.dir.dot(GRAVITY) * time;
        this.pos += this.vel * time;
        if (this.pos > this.track.length()) {
            this.pos -= this.track.length();
            this.track = this.track.next;
        }
        else if (this.pos < 0) {
            this.track = this.track.prev;
            if (this.track != null)
                this.pos += this.track.length();
        }
        this.ff_pos.assign(this.draw_loc);
        this.ff_vel.assign(this.dir);
        this.ff_vel.scale(this.vel);
        this.draw_loc.pixels();
    };
    Car.prototype.draw = function (ctx) {
        var box_radius = 10;
        ctx.fillStyle = 'rgb(0, 220, 59)';
        ctx.fillRect(this.draw_loc.x - box_radius, this.draw_loc.y - box_radius, box_radius * 2, box_radius * 2);
        var force_len = 25;
        ctx.strokeStyle = 'rgb(255, 255, 0)';
        ctx.beginPath();
        ctx.moveTo(this.draw_loc.x, this.draw_loc.y);
        ctx.lineTo(this.draw_loc.x + this.dir.x * force_len, this.draw_loc.y + this.dir.y * force_len);
        ctx.stroke();
        ctx.strokeStyle = 'rgb(0, 27, 189)';
        ctx.beginPath();
        ctx.moveTo(this.draw_loc.x, this.draw_loc.y);
        ctx.lineTo(this.draw_loc.x + this.normal.x * force_len, this.draw_loc.y + this.normal.y * force_len);
        ctx.stroke();
    };
    return Car;
}());
function make_default_shader(gl) {
    var vsrc = "\n\tprecision mediump float;\n\tattribute vec4 pos;\n\tattribute vec3 normals;\n\tuniform mat4 projection;\n\tvarying vec3 normal;\n\tvoid main() {\n\t\tgl_Position = projection * pos;\n\t\tnormal = normalize((projection * vec4(normals, 0.0)).xyz);\n\t}\n\t";
    var fsrc = "\n\tprecision mediump float;\n\tvarying vec3 normal;\n\tvoid main() {\n\t\t//gl_FragColor = vec4(0.5, 0.5, 1.0 - gl_FragCoord.z, 1.0);\n\t\tvec4 color = vec4(0.0, 1.0, 1.0, 1.0);\n\t\tgl_FragColor = color * normal.x;\n\t}\n\t";
    var vertex_shader = compile_shader(gl, vsrc, false);
    var fragment_shader = compile_shader(gl, fsrc, true);
    return new Shader(gl, [vertex_shader, fragment_shader], 'pos', 'normals');
}
function make_shape(vertex, normals) {
    var mv = [
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5,
    ];
    var mn = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ];
    for (var i = 0, j = 0; i < mv.length; i += 3, j += 4) {
        vertex[j] = mv[i];
        vertex[j + 1] = mv[i + 1];
        vertex[j + 2] = mv[i + 2];
        vertex[j + 3] = 1.0;
        normals[i] = mn[i];
        normals[i + 1] = mn[i + 1];
        normals[i + 2] = mn[i + 2];
    }
}
window.addEventListener('load', function () {
    var canvas = document.getElementById('canvas');
    var gl = canvas.getContext('webgl', {
        alpha: false,
        antiAlias: true,
        stencil: false,
        depth: true
    });
    function resize() {
        var w = window.innerWidth - 25;
        var h = window.innerHeight - 25;
        if (w > h) {
            w = h;
        }
        else {
            h = w;
        }
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    window.addEventListener('resize', resize);
    resize();
    var theta = 0.0;
    window.addEventListener('mousemove', function (e) {
        theta = (e.x / window.innerWidth) * Math.PI * 2;
    });
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    var shader = make_default_shader(gl);
    var vbo = new VBO(gl);
    (function () {
        var vertex = [];
        var normals = [];
        make_shape(vertex, normals);
        vbo.data(gl, new Float32Array(vertex), new Float32Array(normals));
    })();
    var uProjection = shader.getUniformLocation(gl, 'projection');
    shader.use(gl);
    var projection = new Matrix();
    var sqrt_1_3 = 1 / Math.sqrt(3);
    function tick() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        projection.rotate(theta, sqrt_1_3, sqrt_1_3, sqrt_1_3);
        gl.uniformMatrix4fv(uProjection, false, projection.arr);
        vbo.draw(gl, shader, gl.TRIANGLES);
        window.requestAnimationFrame(tick);
    }
    tick();
});
