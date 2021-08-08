var RenderablePatch = /** @class */ (function () {
    function RenderablePatch(gl, patch) {
        this.patch = patch;
        this.maxCrv = [0, 0, 0, 0];
        this.minCrv = [0, 0, 0, 0];
        this.boundingBoxMin = new Vec3();
        this.boundingBoxMax = new Vec3();
        this.positionBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        this.indexBufferLength = 0;
        this.curvatureBuffer = gl.createBuffer();
        this.controlMesh = {
            positionBuffer: gl.createBuffer(),
            indexBuffer: gl.createBuffer(),
            indexBufferLength: 0
        };
    }
    RenderablePatch.prototype.evaluate = function (gl, level) {
        switch (this.patch.kind) {
            case PatchType.Triangle:
                evaluate_triangle(this.patch, level);
                break;
            case PatchType.Quadrilateral:
                evaluate_quad(this.patch, level);
                break;
            default:
                evaluate_polyhedron(this.patch);
        }
        this.fill_pnc_buffer(gl);
        switch (this.patch.kind) {
            case PatchType.Triangle:
                this.fill_index_buffer_tri(gl, level);
                break;
            case PatchType.Quadrilateral:
                this.fill_index_buffer_quad(gl, level);
                break;
            default:
                this.fill_index_buffer_poly(gl);
        }
        this.findMinMax();
    };
    // fill the buffer for the points, normals, and curvature
    RenderablePatch.prototype.fill_pnc_buffer = function (gl) {
        if (this.patch.points.length != this.patch.curvature.length || this.patch.points.length != this.patch.normals.length) {
            throw 'in fill_pnc_buffer: number of normals, curvature values, and points are not the same';
        }
        var N = this.patch.points.length;
        var positionArr = new Float32Array(N * 4);
        for (var i = 0; i < N; ++i) {
            positionArr[i * 4] = this.patch.points[i].x;
            positionArr[i * 4 + 1] = this.patch.points[i].y;
            positionArr[i * 4 + 2] = this.patch.points[i].z;
            positionArr[i * 4 + 3] = 1.0;
        }
        var normalArr = new Float32Array(N * 3);
        for (var i = 0; i < N; ++i) {
            normalArr[i * 3] = this.patch.normals[i].x;
            normalArr[i * 3 + 1] = this.patch.normals[i].y;
            normalArr[i * 3 + 2] = this.patch.normals[i].z;
        }
        var curvatureArr = new Float32Array(N * 4);
        for (var i = 0; i < N; ++i) {
            curvatureArr[i * 4] = this.patch.curvature[i].gaussian;
            curvatureArr[i * 4 + 1] = this.patch.curvature[i].mean;
            curvatureArr[i * 4 + 2] = this.patch.curvature[i].max;
            curvatureArr[i * 4 + 3] = this.patch.curvature[i].min;
        }
        var cmPositionArr = new Float32Array(this.patch.mesh.length * 4);
        for (var i = 0; i < this.patch.mesh.length; ++i) {
            cmPositionArr[i * 4] = this.patch.mesh[i].x;
            cmPositionArr[i * 4 + 1] = this.patch.mesh[i].y;
            cmPositionArr[i * 4 + 2] = this.patch.mesh[i].z;
            cmPositionArr[i * 4 + 3] = this.patch.mesh[i].d;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positionArr, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normalArr, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.curvatureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, curvatureArr, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.controlMesh.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cmPositionArr, gl.STATIC_DRAW);
    };
    RenderablePatch.prototype.fill_index_buffer_quad = function (gl, level) {
        var N = 1 << level;
        this.indexBufferLength = N * N * 6;
        var indexArr = new Uint32Array(this.indexBufferLength);
        for (var i = 0, dst = 0; i < N; ++i) {
            // pretend like the single call to triangles is actually multiple triangle strips
            // use the "previous" vertices in the new triangle
            var v0 = i * (N + 1);
            var v1 = (i + 1) * (N + 1);
            for (var j = 1; j <= N; ++j) {
                var v2 = i * (N + 1) + j;
                var v3 = (i + 1) * (N + 1) + j;
                indexArr[dst++] = v0;
                indexArr[dst++] = v1;
                indexArr[dst++] = v2;
                indexArr[dst++] = v1;
                indexArr[dst++] = v2;
                indexArr[dst++] = v3;
                v0 = v2;
                v1 = v3;
            }
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArr, gl.STATIC_DRAW);
        // fill the buffer for the control mesh
        var degu = this.patch.degu;
        var degv = this.patch.degv;
        this.controlMesh.indexBufferLength = degu * degv * 8;
        var cmIndexArr = new Uint32Array(this.controlMesh.indexBufferLength);
        for (var i = 0, dst = 0; i < degu; ++i) {
            for (var j = 0; j < degv; ++j) {
                var v0 = i * (degv + 1) + j;
                var v1 = (i + 1) * (degv + 1) + j;
                var v2 = (i + 1) * (degv + 1) + j + 1;
                var v3 = i * (degv + 1) + j + 1;
                cmIndexArr[dst++] = v0;
                cmIndexArr[dst++] = v1;
                cmIndexArr[dst++] = v1;
                cmIndexArr[dst++] = v2;
                cmIndexArr[dst++] = v2;
                cmIndexArr[dst++] = v3;
                cmIndexArr[dst++] = v3;
                cmIndexArr[dst++] = v0;
            }
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.controlMesh.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cmIndexArr, gl.STATIC_DRAW);
    };
    RenderablePatch.prototype.fill_index_buffer_poly = function (gl) {
        this.indexBufferLength = this.patch.polyhedron_indices.length;
        var indexArr = new Uint32Array(this.patch.polyhedron_indices);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArr, gl.STATIC_DRAW);
        this.controlMesh.indexBufferLength = this.patch.polyhedron_indices.length;
        var cmIndexArr = new Uint32Array(this.patch.polyhedron_indices);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.controlMesh.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cmIndexArr, gl.STATIC_DRAW);
    };
    RenderablePatch.prototype.fill_index_buffer_tri = function (gl, level) {
        function b2i_i(i, j, k, d) {
            var sum = j;
            for (var kk = 0; kk < k; ++kk) {
                sum += d + 1 - kk;
            }
            return sum;
        }
        var N = 1 << level;
        // this.indexBufferLength = N*(N/2)*6;
        this.indexBufferLength = N * N * 3;
        var indexArr = new Uint32Array(this.indexBufferLength);
        for (var i = 0, dst = 0; i < N; ++i) {
            // pretend like the single call to triangles is actually multiple triangle strips
            // use the "previous" vertices in the new triangle
            var v0 = b2i_i(i + 1, 0, N - i - 1, N);
            var v1 = b2i_i(i, 0, N - i, N);
            for (var j = 1; j < N - i; ++j) {
                var v2 = b2i_i(i + 1, j, N - i - j - 1, N);
                var v3 = b2i_i(i, j, N - i - j, N);
                indexArr[dst++] = v0;
                indexArr[dst++] = v1;
                indexArr[dst++] = v2;
                indexArr[dst++] = v1;
                indexArr[dst++] = v2;
                indexArr[dst++] = v3;
                v0 = v2;
                v1 = v3;
            }
            indexArr[dst++] = v0;
            indexArr[dst++] = v1;
            indexArr[dst++] = b2i_i(i, N - i, 0, N);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArr, gl.STATIC_DRAW);
        // fill the buffer for the control mesh
        var deg = this.patch.degu;
        var d = this.patch.degu - 1;
        // this.controlMesh.indexBufferLength = (deg*(deg + 1)/2)*6;
        this.controlMesh.indexBufferLength = deg * (deg + 1) * 3;
        var cmIndexArr = new Uint32Array(this.controlMesh.indexBufferLength);
        for (var i = 0, dst = 0; i <= d; ++i) {
            for (var j = 0; j <= d - i; ++j) {
                var k = d - i - j;
                var v0 = b2i_i(i + 1, j, k, deg);
                var v1 = b2i_i(i, j + 1, k, deg);
                var v2 = b2i_i(i, j, k + 1, deg);
                cmIndexArr[dst++] = v0;
                cmIndexArr[dst++] = v1;
                cmIndexArr[dst++] = v1;
                cmIndexArr[dst++] = v2;
                cmIndexArr[dst++] = v2;
                cmIndexArr[dst++] = v0;
            }
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.controlMesh.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cmIndexArr, gl.STATIC_DRAW);
    };
    // finds the minimum and maximum position and curvature values
    // position used for bounding box
    // curvature used for color coding
    // (this is for one patch)
    RenderablePatch.prototype.findMinMax = function () {
        if (this.patch.points.length == 0) {
            this.boundingBoxMin.set(0.5, 0.5, 0.5);
            this.boundingBoxMax.set(-0.5, -0.5, -0.5);
            for (var k = 0; k < 4; ++k) {
                this.minCrv[k] = 0;
                this.maxCrv[k] = 0;
            }
            return;
        }
        this.boundingBoxMin.copy(this.patch.points[0]);
        this.boundingBoxMax.copy(this.patch.points[0]);
        this.minCrv[0] = this.patch.curvature[0].gaussian;
        this.minCrv[1] = this.patch.curvature[0].mean;
        this.minCrv[2] = this.patch.curvature[0].max;
        this.minCrv[3] = this.patch.curvature[0].min;
        this.maxCrv[0] = this.patch.curvature[0].gaussian;
        this.maxCrv[1] = this.patch.curvature[0].mean;
        this.maxCrv[2] = this.patch.curvature[0].max;
        this.maxCrv[3] = this.patch.curvature[0].min;
        for (var i = 0; i < this.patch.points.length; ++i) {
            var p = this.patch.points[i];
            this.boundingBoxMin.x = Math.min(p.x, this.boundingBoxMin.x);
            this.boundingBoxMin.y = Math.min(p.y, this.boundingBoxMin.y);
            this.boundingBoxMin.z = Math.min(p.z, this.boundingBoxMin.z);
            this.boundingBoxMax.x = Math.max(p.x, this.boundingBoxMax.x);
            this.boundingBoxMax.y = Math.max(p.y, this.boundingBoxMax.y);
            this.boundingBoxMax.z = Math.max(p.z, this.boundingBoxMax.z);
            var crv = this.patch.curvature[i];
            this.minCrv[0] = Math.min(crv.gaussian, this.minCrv[0]);
            this.minCrv[1] = Math.min(crv.mean, this.minCrv[1]);
            this.minCrv[2] = Math.min(crv.max, this.minCrv[2]);
            this.minCrv[3] = Math.min(crv.min, this.minCrv[3]);
            this.maxCrv[0] = Math.max(crv.gaussian, this.maxCrv[0]);
            this.maxCrv[1] = Math.max(crv.mean, this.maxCrv[1]);
            this.maxCrv[2] = Math.max(crv.max, this.maxCrv[2]);
            this.maxCrv[3] = Math.max(crv.min, this.maxCrv[3]);
        }
    };
    RenderablePatch.prototype.free = function (gl) {
        gl.deleteBuffer(this.positionBuffer);
        gl.deleteBuffer(this.normalBuffer);
        gl.deleteBuffer(this.indexBuffer);
        gl.deleteBuffer(this.curvatureBuffer);
        gl.deleteBuffer(this.controlMesh.positionBuffer);
        gl.deleteBuffer(this.indexBuffer);
        this.indexBufferLength = 0;
    };
    return RenderablePatch;
}());
var Group = /** @class */ (function () {
    function Group(name, id, useDefaults) {
        this.name = name;
        this.id = id;
        this.objs = [];
        this.maxCrv = [0, 0, 0, 0];
        this.minCrv = [0, 0, 0, 0];
        this.boundingBoxMin = new Vec3();
        this.boundingBoxMax = new Vec3();
        this.color = 0;
        if (useDefaults || !renderState.globalGroup) {
            this.highlightDensity = 0.5;
            this.flatShading = false;
            this.flipNormals = false;
            this.showControlMesh = false;
            this.showPatches = true;
            this.highlight = Highlight.Normal;
        }
        else {
            this.highlightDensity = renderState.globalGroup.highlightDensity;
            this.flatShading = renderState.globalGroup.flatShading;
            this.flipNormals = renderState.globalGroup.flipNormals;
            this.showControlMesh = renderState.globalGroup.showControlMesh;
            this.showPatches = renderState.globalGroup.showPatches;
            this.highlight = renderState.globalGroup.highlight;
        }
    }
    // finds the minimum and maximum position and curvature values
    // position used for bounding box
    // curvature used for color coding
    // (this is for the entire group and should be done only after all objects are evaluated)
    Group.prototype.findMinMax = function () {
        if (this.objs.length == 0) {
            this.boundingBoxMin.set(0.5, 0.5, 0.5);
            this.boundingBoxMax.set(-0.5, -0.5, -0.5);
            for (var k = 0; k < 4; ++k) {
                this.minCrv[k] = 0;
                this.maxCrv[k] = 0;
            }
            return;
        }
        this.boundingBoxMin.copy(this.objs[0].boundingBoxMin);
        this.boundingBoxMax.copy(this.objs[0].boundingBoxMax);
        for (var k = 0; k < 4; ++k) {
            this.minCrv[k] = this.objs[0].minCrv[k];
            this.maxCrv[k] = this.objs[0].maxCrv[k];
        }
        for (var i = 1; i < this.objs.length; ++i) {
            var obj = this.objs[i];
            this.boundingBoxMin.x = Math.min(obj.boundingBoxMin.x, this.boundingBoxMin.x);
            this.boundingBoxMin.y = Math.min(obj.boundingBoxMin.y, this.boundingBoxMin.y);
            this.boundingBoxMin.z = Math.min(obj.boundingBoxMin.z, this.boundingBoxMin.z);
            this.boundingBoxMax.x = Math.max(obj.boundingBoxMax.x, this.boundingBoxMax.x);
            this.boundingBoxMax.y = Math.max(obj.boundingBoxMax.y, this.boundingBoxMax.y);
            this.boundingBoxMax.z = Math.max(obj.boundingBoxMax.z, this.boundingBoxMax.z);
            for (var k = 0; k < 4; ++k) {
                this.minCrv[k] = Math.min(obj.minCrv[k], this.minCrv[k]);
                this.maxCrv[k] = Math.max(obj.maxCrv[k], this.maxCrv[k]);
            }
        }
    };
    Group.prototype.free = function (gl) {
        for (var i = 0; i < this.objs.length; ++i) {
            this.objs[i].free(gl);
        }
    };
    return Group;
}());
// parses the text for patches
function readBVFile(gl, text) {
    var input = text.split(/\s+/);
    var cur = 0;
    function read_vector(n, isRational) {
        var arr = [];
        for (var i = 0; i < n; ++i) {
            var v = new Vec3();
            v.x = Number(input[cur]);
            ++cur;
            v.y = Number(input[cur]);
            ++cur;
            v.z = Number(input[cur]);
            ++cur;
            if (isRational) {
                v.d = Number(input[cur]);
                ++cur;
            }
            arr.push(v);
        }
        return arr;
    }
    var groups = [];
    var currentGroup = new Group('(unamed group)', 0, false);
    while (cur < input.length && input[cur] != '') {
        if (input[cur].toUpperCase() == "GROUP") {
            var id = Number(input[++cur]);
            var name_1 = input[++cur];
            var groupExists = false;
            for (var i = 0; i < groups.length; ++i) {
                if (groups[i].id == id) {
                    currentGroup = groups[i];
                    groupExists = true;
                    break;
                }
            }
            if (!groupExists) {
                currentGroup = new Group(name_1, id, false);
                groups.push(currentGroup);
            }
            ++cur;
        }
        var kind = Number(input[cur]);
        ++cur;
        switch (kind) {
            case 1: {
                // polyhedral data (vertex + faces)
                var numVertices = Number(input[cur]);
                cur += 1;
                var numFaces = Number(input[cur]);
                cur += 1;
                // load vertices
                var vertices = [];
                for (var i = 0; i < numVertices; i++) {
                    var x = Number(input[cur + 0]);
                    var y = Number(input[cur + 1]);
                    var z = Number(input[cur + 2]);
                    var v = new Vec3();
                    v.set(x, y, z);
                    vertices.push(v);
                    cur += 3;
                }
                // load faces
                var faces = [];
                for (var i = 0; i < numFaces; i++) {
                    var faceSize = Number(input[cur]);
                    cur += 1;
                    if (faceSize == 3) {
                        faces.push(Number(input[cur + 0]));
                        faces.push(Number(input[cur + 1]));
                        faces.push(Number(input[cur + 2]));
                        cur += 3;
                    }
                    else if (faceSize == 4) {
                        // transform one quad face into two triangle faces
                        var a = Number(input[cur + 0]);
                        var b = Number(input[cur + 1]);
                        var c = Number(input[cur + 2]);
                        var d = Number(input[cur + 3]);
                        // triangle a, b, c
                        faces.push(a);
                        faces.push(b);
                        faces.push(c);
                        // triangle a, c, d
                        faces.push(a);
                        faces.push(c);
                        faces.push(d);
                        cur += 4;
                    }
                    else {
                        throw 'in polyhedral data, a face was specified with ' + faceSize.toString() + ' vertices but must be 3 or 4';
                    }
                }
                var p = Patch.MakePolyhedral(vertices, faces);
                currentGroup.objs.push(new RenderablePatch(gl, p));
                break;
            }
            case 3: {
                // triangular bezier patch
                var deg = Number(input[cur]);
                ++cur;
                var cp = read_vector(((deg + 2) * (deg + 1)) / 2, false);
                var p = Patch.MakeTriangle(deg, cp);
                currentGroup.objs.push(new RenderablePatch(gl, p));
                break;
            }
            case 4:
            case 5:
            case 8: {
                // square quad patch (4), general quad patch (5) or rational patch (8)
                var isSquare = kind == 4;
                var isRational = kind == 8;
                var degu = Number(input[cur++]);
                var degv = isSquare ? degu : Number(input[cur++]);
                var cp = read_vector((degu + 1) * (degv + 1), isRational);
                var p = Patch.MakeQuad(degu, degv, cp);
                currentGroup.objs.push(new RenderablePatch(gl, p));
                break;
            }
            case 6: {
                // Trim curve
                throw 'Trim curve (6) not supported';
            }
            case 7: {
                // B-spline tensor product
                throw 'B-spline (7) not supported';
            }
            case 9: {
                // PN triangle
                var deg = Number(input[cur++]);
                var normal_deg = Number(input[cur++]);
                var cp = read_vector(((deg + 2) * (deg + 1)) / 2, false);
                var normals = read_vector(((normal_deg + 2) * (normal_deg + 1)) / 2, false);
                var p = Patch.MakeTriangle(deg, cp);
                p.artificial_normals = {
                    degu: normal_deg,
                    degv: normal_deg,
                    normals: normals
                };
                currentGroup.objs.push(new RenderablePatch(gl, p));
                break;
            }
            case 10: {
                // PN quad
                var degu = Number(input[cur++]);
                var degv = Number(input[cur++]);
                var normal_degu = Number(input[cur++]);
                var normal_degv = Number(input[cur++]);
                var cp = read_vector((degu + 1) * (degv + 1), false);
                var normals = read_vector((normal_degu + 1) * (normal_degv + 1), false);
                var p = Patch.MakeQuad(degu, degv, cp);
                p.artificial_normals = {
                    degu: normal_degu,
                    degv: normal_degv,
                    normals: normals
                };
                currentGroup.objs.push(new RenderablePatch(gl, p));
                break;
            }
            default:
                throw 'kind not supported: ' + kind.toString();
        }
    }
    // if no groups were specified, use the default (named) group
    if (groups.length == 0) {
        groups.push(currentGroup);
    }
    for (var i = 0; i < groups.length; ++i) {
        groups[i].color = i % GroupColors.length;
    }
    return groups;
}
