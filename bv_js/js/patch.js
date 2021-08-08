var PatchType;
(function (PatchType) {
    PatchType[PatchType["Triangle"] = 1] = "Triangle";
    PatchType[PatchType["Quadrilateral"] = 2] = "Quadrilateral";
    PatchType[PatchType["Polyhedral"] = 3] = "Polyhedral";
})(PatchType || (PatchType = {}));
var Patch = /** @class */ (function () {
    function Patch(kind, degu, degv, mesh) {
        this.kind = kind;
        this.degu = degu;
        this.degv = degv;
        this.mesh = mesh;
        this.points = [];
        this.normals = [];
        this.curvature = [];
        this.artificial_normals = null;
        // only used for polyhedron data
        this.polyhedron_indices = [];
    }
    Patch.MakeQuad = function (degu, degv, mesh) {
        return new Patch(PatchType.Quadrilateral, degu, degv, mesh);
    };
    Patch.MakePolyhedral = function (points, indices) {
        var p = new Patch(PatchType.Polyhedral, 0, 0, points);
        p.polyhedron_indices = indices;
        return p;
    };
    Patch.MakeTriangle = function (deg, mesh) {
        return new Patch(PatchType.Triangle, deg, deg, mesh);
    };
    return Patch;
}());
function bb_copy(p, step, bb) {
    var C = step * p.degu + 1;
    for (var i = 0; i <= p.degu; ++i) {
        for (var j = 0; j <= p.degv; ++j) {
            var src = i * (p.degv + 1) + j;
            var dst = j * step * C + i * step;
            bb[dst].copy(p.mesh[src]);
        }
    }
}
function subdivide_quad(p, step, sizeu, sizev, bb) {
    var halfstep = step / 2;
    var bigstepu = step * p.degu;
    var bigstepv = step * p.degv;
    var C = sizeu + 1;
    // patch level
    for (var row = 0; row < sizev; row += bigstepv) {
        for (var col = 0; col <= sizeu; col += step) {
            // subdivide a curve-column of degree degv
            for (var l = 0; l < p.degv; ++l) {
                var h = row + l * halfstep;
                for (var k = l; k < p.degv; ++k) {
                    var h1 = h + step;
                    var h2 = h + halfstep;
                    var dst = h2 * C + col;
                    var src0 = h * C + col;
                    var src1 = h1 * C + col;
                    // taking an average, ie:
                    // bb[dst] = (bb[src0] + bb[src1]) / 2
                    bb[dst].copy(bb[src0]).add4(bb[src1]).scale4(0.5);
                    h = h1;
                }
            }
        }
    }
    // 2x patch level
    for (var col = 0; col < sizeu; col += bigstepu) {
        for (var row = 0; row <= sizev; row += halfstep) {
            // subdivide a curve-row of degree degu
            for (var l = 0; l < p.degu; ++l) {
                var h = col + l * halfstep;
                for (var k = l; k < p.degu; ++k) {
                    var h1 = h + step;
                    var h2 = h + halfstep;
                    var dst = row * C + h2;
                    var src0 = row * C + h;
                    var src1 = row * C + h1;
                    // taking an average, ie: 
                    // bb[dst] = (bb[src0] + bb[src1]) / 2
                    bb[dst].copy(bb[src0]).add4(bb[src1]).scale4(0.5);
                    h = h1;
                }
            }
        }
    }
}
function evaluate_quad(p, level) {
    var step = 1 << level;
    var sizeu = step * p.degu;
    var sizev = step * p.degv;
    var C = step + 1;
    var Cu = sizeu + 1;
    var Cv = sizev + 1;
    p.points = [];
    p.normals = [];
    p.curvature = [];
    for (var i = 0; i < C * C; ++i) {
        p.points.push(new Vec3());
        p.normals.push(new Vec3());
        p.curvature.push({ gaussian: 0, mean: 0, max: 0, min: 0 });
    }
    var bb = [];
    for (var i = 0; i < Cu * Cv; ++i) {
        bb.push(new Vec3());
    }
    bb_copy(p, step, bb);
    for (var i = 0; i < level; ++i) {
        subdivide_quad(p, step, sizeu, sizev, bb);
        step /= 2;
    }
    // we know that the step should equal 1 at this point
    for (var r = 0; r < sizev; r += p.degv) {
        var rs = r * Cu;
        var r1 = (r + 1) * Cu;
        var r2 = (r + 2) * Cu;
        for (var c_1 = 0; c_1 < sizeu; c_1 += p.degu) {
            var pi_1 = Math.floor(c_1 / p.degu) * C + Math.floor(r / p.degv);
            evaluate_at(p, pi_1, false, bb[rs + c_1], bb[rs + c_1 + 1], bb[rs + c_1 + 2], bb[r1 + c_1], bb[r2 + c_1], bb[r1 + c_1 + 1]);
        }
        // in the last column cannot take the values "up and to the right"
        // so we rotate our stencil 90 deg
        var c = sizeu;
        var pi = Math.floor(c / p.degu) * C + Math.floor(r / p.degv);
        evaluate_at(p, pi, true, bb[rs + c], bb[r1 + c], bb[r2 + c], bb[rs + c - 1], bb[rs + c - 2], bb[r1 + c - 1]);
    }
    // for the top row
    {
        var r = sizev;
        var rs = r * Cu;
        var r1 = (r - 1) * Cu;
        var r2 = (r - 2) * Cu;
        for (var c_2 = 0; c_2 < sizeu; c_2 += p.degu) {
            var pi_2 = Math.floor(c_2 / p.degu) * C + Math.floor(r / p.degv);
            evaluate_at(p, pi_2, true, bb[rs + c_2], bb[r1 + c_2], bb[r2 + c_2], bb[rs + c_2 + 1], bb[rs + c_2 + 2], bb[r1 + c_2 + 1]);
        }
        // for the top right
        var c = sizeu;
        var pi = Math.floor(c / p.degu) * C + Math.floor(r / p.degv);
        evaluate_at(p, pi, false, bb[rs + c], bb[rs + c - 1], bb[rs + c - 2], bb[r1 + c], bb[r2 + c], bb[r1 + c - 1]);
    }
    if (p.artificial_normals) {
        // buffers for decasteljau's algorithm
        var u_buffer = [];
        var v_buffer = [];
        for (var i = 0; i < p.artificial_normals.degu + 1; ++i) {
            u_buffer.push(new Vec3());
        }
        for (var i = 0; i < p.artificial_normals.degv + 1; ++i) {
            v_buffer.push(new Vec3());
        }
        var N = 1 << level;
        for (var r = 0; r <= N; ++r) {
            // neither u nor v are integers
            var u = 1.0 - (r / N);
            for (var c = 0; c <= N; ++c) {
                var v = 1.0 - (c / N);
                // DeCastel2(p->normal, p->Ndegu, p->Ndegv, u, v, p->eval_N[loc]);
                // perform a two dimensional decasteljau
                for (var i = 0; i <= p.artificial_normals.degu; ++i) {
                    for (var j = 0; j <= p.artificial_normals.degv; ++j) {
                        var index = i * (p.artificial_normals.degv + 1) + j;
                        v_buffer[j].copy(p.artificial_normals.normals[index]);
                    }
                    decastel_1(v_buffer, p.artificial_normals.degv, v, u_buffer[i]);
                }
                var normal_index = r * C + c;
                decastel_1(u_buffer, p.artificial_normals.degu, u, p.normals[normal_index]);
                p.normals[normal_index].normalize();
            }
        }
    }
}
/*
curvature and evaluation for four sided patch
input: Bezier control points related to the curvature, the patch,
and the index that we are writing to
v ^
  | v02
  | v01 v11
  | v00 v10 v20
  +---------------> u
output: curvature at v00, normal at v00
*/
function evaluate_at(p, pi, swap_degree, v00, v01, v02, v10, v20, v11) {
    var degu = swap_degree ? p.degv : p.degu;
    var degv = swap_degree ? p.degu : p.degv;
    p.points[pi].copy(v00).normalize_rational_point();
    // surface normal
    // n = rv cross ru (but use a normalized derivative)
    {
        // when one edge is collapsed, use a different vector for the cross product
        var ru_n = v01.dup().normalize_rational_point().sub(v00.dup().normalize_rational_point()).scale(degu);
        if (ru_n.length() < 1e-6) {
            ru_n = v11.dup().normalize_rational_point().sub(v00.dup().normalize_rational_point()).scale(degu);
        }
        var rv_n = v10.dup().normalize_rational_point().sub(v00.dup().normalize_rational_point()).scale(degv);
        if (rv_n.length() < 1e-6) {
            rv_n = v11.dup().normalize_rational_point().sub(v00.dup().normalize_rational_point()).scale(degu);
        }
        p.normals[pi].copy(rv_n).cross(ru_n).normalize();
    }
    // ru = degu*(v01 - v00)
    var ru = v01.dup().sub4(v00).scale4(degu);
    // rv = degv*(v10 - v00)
    var rv = v10.dup().sub4(v00).scale4(degv);
    var ruu = new Vec3();
    if (degu > 1) {
        // ruu = (degu)*(degu - 1)*(v02 - 2*v01 + v00);
        ruu.copy(v02).sub4(v01).sub4(v01).add4(v00).scale4(degu).scale4(degu - 1);
    }
    var rvv = new Vec3();
    if (degv > 1) {
        // rvv = (degv)*(degv - 1)*(v20 - 2*v10 + v00)
        rvv.copy(v20).sub4(v10).sub4(v10).add4(v00).scale4(degv).scale4(degv - 1);
    }
    var ruv = new Vec3();
    if (p.kind == PatchType.Triangle) {
        if (p.degu > 1) {
            // ruv = degu*(degu - 1)*(v11 - v01 - v10 + v00)
            ruv.copy(v11).sub4(v01).sub4(v10).add4(v00).scale4(degu).scale4(degu - 1);
        }
    }
    else {
        // ruv = degu*degv*(v11 - v01 - v10 + v00)
        ruv.copy(v11).sub4(v01).sub4(v10).add4(v00).scale4(degu).scale4(degv);
    }
    // coefficients of first and second fundamental form
    var L = det4(ruu.x, ruu.y, ruu.z, ruu.d, ru.x, ru.y, ru.z, ru.d, rv.x, rv.y, rv.z, rv.d, v00.x, v00.y, v00.z, v00.d);
    var N = det4(rvv.x, rvv.y, rvv.z, rvv.d, ru.x, ru.y, ru.z, ru.d, rv.x, rv.y, rv.z, rv.d, v00.x, v00.y, v00.z, v00.d);
    var M = det4(ruv.x, ruv.y, ruv.z, ruv.d, ru.x, ru.y, ru.z, ru.d, rv.x, rv.y, rv.z, rv.d, v00.x, v00.y, v00.z, v00.d);
    var E = (ru.x * v00.d - v00.x * ru.d) * (ru.x * v00.d - v00.x * ru.d) + (ru.y * v00.d - v00.y * ru.d) * (ru.y * v00.d - v00.y * ru.d) + (ru.z * v00.d - v00.z * ru.d) * (ru.z * v00.d - v00.z * ru.d);
    var G = (rv.x * v00.d - v00.x * rv.d) * (rv.x * v00.d - v00.x * rv.d) + (rv.y * v00.d - v00.y * rv.d) * (rv.y * v00.d - v00.y * rv.d) + (rv.z * v00.d - v00.z * rv.d) * (rv.z * v00.d - v00.z * rv.d);
    var F = (ru.x * v00.d - v00.x * ru.d) * (rv.x * v00.d - v00.x * rv.d) + (ru.y * v00.d - v00.y * ru.d) * (rv.y * v00.d - v00.y * rv.d) + (ru.z * v00.d - v00.z * ru.d) * (rv.z * v00.d - v00.z * rv.d);
    var kesv = new Vec3();
    kesv.x = det3(v00.y, v00.z, v00.d, ru.y, ru.z, ru.d, rv.y, rv.z, rv.d);
    kesv.y = det3(v00.x, v00.z, v00.d, ru.x, ru.z, ru.d, rv.x, rv.z, rv.d);
    kesv.z = det3(v00.x, v00.y, v00.d, ru.x, ru.y, ru.d, rv.x, rv.y, rv.d);
    var kes = kesv.dot(kesv);
    var crv_res = p.curvature[pi];
    crv_res.gaussian = v00.d * v00.d * v00.d * v00.d * (L * N - M * M) / (kes * kes);
    crv_res.mean = -v00.d * (L * G - 2 * M * F + N * E) / Math.sqrt(kes * kes * kes) / 2;
    // TODO: why is the curvature sometimes NaN ?
    if (isNaN(crv_res.gaussian)) {
        crv_res.gaussian = 0;
    }
    if (isNaN(crv_res.mean)) {
        crv_res.mean = 0;
    }
    var disc = crv_res.mean * crv_res.mean - crv_res.gaussian;
    if (disc < 0) {
        crv_res.max = crv_res.mean;
        crv_res.min = crv_res.mean;
    }
    else {
        disc = Math.sqrt(disc);
        crv_res.max = crv_res.mean + disc;
        crv_res.min = crv_res.mean - disc;
    }
}
function evaluate_polyhedron(p) {
    p.points = [];
    p.normals = [];
    p.curvature = [];
    for (var i = 0; i < p.mesh.length; ++i) {
        p.points.push(p.mesh[i].dup());
        var n = new Vec3();
        p.normals.push(n);
        p.curvature.push({ gaussian: 0, mean: 0, max: 0, min: 0 });
    }
    for (var i = 0; i < p.polyhedron_indices.length; i += 3) {
        // compute normal of each triangle, average for each vertex
        var i0 = p.polyhedron_indices[i];
        var i1 = p.polyhedron_indices[i + 1];
        var i2 = p.polyhedron_indices[i + 2];
        var a = p.points[i0];
        var b = p.points[i1];
        var c = p.points[i2];
        // v0 = c - a
        var v0 = c.dup().sub(a);
        // v1 = b - a
        var v1 = b.dup().sub(a);
        // n = v0 cross v1
        var n = v0.dup().cross(v1).normalize();
        p.normals[i0].add(n);
        p.normals[i1].add(n);
        p.normals[i2].add(n);
    }
    for (var i = 0; i < p.normals.length; ++i) {
        p.normals[i].normalize();
    }
}
function evaluate_triangle(p, level) {
    function b2i_i(i, j, k) {
        var sum = j;
        for (var kk = 0; kk < k; ++kk) {
            sum += p.degu + 1 - kk;
        }
        return sum;
    }
    function b2i_j(i, j, k) {
        var sum = p.degu - i - k;
        for (var kk = 0; kk < k; ++kk) {
            sum += p.degu + 1 - kk;
        }
        return sum;
    }
    function b2i_k(i, j, k) {
        var sum = j;
        k = p.degu - i - j;
        for (var kk = 0; kk < k; ++kk) {
            sum += p.degu + 1 - kk;
        }
        return sum;
    }
    var N = 1 << level;
    var size = Math.round((N + 1) * (N + 2) * 0.5);
    p.points = [];
    p.normals = [];
    p.curvature = [];
    for (var i = 0; i < size; ++i) {
        p.points.push(new Vec3());
        p.normals.push(new Vec3());
        p.curvature.push({ gaussian: 0, mean: 0, max: 0, min: 0 });
    }
    // buffer to be used later for de casteljau's algorithm
    var decastel = [];
    for (var i = 0; i < p.mesh.length; ++i) {
        decastel.push(new Vec3());
    }
    var pi = 0;
    for (var uu = 0; uu <= N; ++uu) {
        for (var vv = 0; vv <= N - uu; ++vv) {
            var on_boundary = uu == 0;
            var on_vertex = uu == 0 && vv == 0;
            // u,v,w are not integers
            var u = uu / N;
            var v = vv / N;
            var w = 1 - u - v;
            // different mapping functions are used for the interior and the boundary
            var b2i_1 = void 0;
            if (on_vertex) {
                b2i_1 = b2i_k;
            }
            else if (on_boundary) {
                b2i_1 = b2i_j;
            }
            else {
                b2i_1 = b2i_i;
            }
            // initalize buffer for DeCasteljau
            for (var i = 0; i <= p.degu; ++i) {
                for (var j = 0; j <= p.degu - i; ++j) {
                    var k = p.degu - i - j;
                    var index = b2i_1(i, j, k);
                    decastel[index].copy(p.mesh[index]);
                }
            }
            // decasteljau algorithm
            for (var d = p.degu - 1; d >= 1; --d) {
                for (var k = 0; k <= d; ++k) {
                    for (var j = 0; j <= d - k; ++j) {
                        var i = d - j - k;
                        var dst = b2i_1(i, j, k);
                        var srcu = b2i_1(i + 1, j, k);
                        var srcv = b2i_1(i, j + 1, k);
                        var srcw = b2i_1(i, j, k + 1);
                        decastel[dst].x = u * decastel[srcu].x + v * decastel[srcv].x + w * decastel[srcw].x;
                        decastel[dst].y = u * decastel[srcu].y + v * decastel[srcv].y + w * decastel[srcw].y;
                        decastel[dst].z = u * decastel[srcu].z + v * decastel[srcv].z + w * decastel[srcw].z;
                    }
                }
            }
            // last step of decasteljau
            var v00 = new Vec3();
            {
                var srcu = b2i_1(1, 0, 0);
                var srcv = b2i_1(0, 1, 0);
                var srcw = b2i_1(0, 0, 1);
                v00.x = u * decastel[srcu].x + v * decastel[srcv].x + w * decastel[srcw].x;
                v00.y = u * decastel[srcu].y + v * decastel[srcv].y + w * decastel[srcw].y;
                v00.z = u * decastel[srcu].z + v * decastel[srcv].z + w * decastel[srcw].z;
            }
            var v01 = void 0;
            var v02 = void 0;
            var v10 = void 0;
            var v20 = void 0;
            var v11 = void 0;
            if (on_vertex) {
                v01 = decastel[b2i_1(0, 1, 0)].dup();
                v10 = decastel[b2i_1(1, 0, 0)].dup();
                if (p.degu > 1) {
                    v02 = decastel[b2i_1(0, 2, 0)].dup();
                    v20 = decastel[b2i_1(2, 0, 0)].dup();
                    v11 = decastel[b2i_1(1, 1, 0)].dup();
                }
            }
            else if (on_boundary) {
                v01 = decastel[b2i_1(1, 0, 0)].dup();
                v10 = decastel[b2i_1(0, 0, 1)].dup();
                if (p.degu > 1) {
                    v02 = decastel[b2i_1(2, 0, 0)].dup();
                    v20 = decastel[b2i_1(0, 0, 2)].dup();
                    v11 = decastel[b2i_1(1, 0, 1)].dup();
                }
            }
            else {
                v01 = decastel[b2i_1(0, 0, 1)].dup();
                v10 = decastel[b2i_1(0, 1, 0)].dup();
                if (p.degu > 1) {
                    v02 = decastel[b2i_1(0, 0, 2)].dup();
                    v20 = decastel[b2i_1(0, 2, 0)].dup();
                    v11 = decastel[b2i_1(0, 1, 1)].dup();
                }
            }
            evaluate_at(p, pi, false, v00, v01, v02, v10, v20, v11);
            ++pi;
        }
    }
    if (p.artificial_normals) {
        function b2i(i, j, k) {
            var sum = j;
            for (var kk = 0; kk < k; ++kk) {
                sum += p.artificial_normals.degu + 1 - kk;
            }
            return sum;
        }
        var normal_index = 0;
        for (var uu = 0; uu <= N; ++uu) {
            for (var vv = 0; vv <= N - uu; ++vv) {
                // u,v,w are not integers
                var u = uu / N;
                var v = vv / N;
                var w = 1 - u - v;
                // initalize buffer for DeCasteljau
                for (var i = 0; i <= p.artificial_normals.degu; ++i) {
                    for (var j = 0; j <= p.artificial_normals.degu - i; ++j) {
                        var k = p.artificial_normals.degu - i - j;
                        var index = b2i(i, j, k);
                        decastel[index].copy(p.artificial_normals.normals[index]);
                    }
                }
                // decasteljau algorithm
                for (var d = p.artificial_normals.degu - 1; d >= 0; --d) {
                    for (var k = 0; k <= d; ++k) {
                        for (var j = 0; j <= d - k; ++j) {
                            var i = d - j - k;
                            var dst = b2i(i, j, k);
                            var srcu = b2i(i + 1, j, k);
                            var srcv = b2i(i, j + 1, k);
                            var srcw = b2i(i, j, k + 1);
                            decastel[dst].x = u * decastel[srcu].x + v * decastel[srcv].x + w * decastel[srcw].x;
                            decastel[dst].y = u * decastel[srcu].y + v * decastel[srcv].y + w * decastel[srcw].y;
                            decastel[dst].z = u * decastel[srcu].z + v * decastel[srcv].z + w * decastel[srcw].z;
                        }
                    }
                }
                p.normals[normal_index].copy(decastel[b2i(0, 0, 0)]).normalize();
                ++normal_index;
            }
        }
    }
}
// one dimensional decasteljau
function decastel_1(buffer, deg, u, out_p) {
    for (var d = deg; d >= 1; --d) {
        for (var i = 0; i < d; ++i) {
            // buffer[i] = u*buffer[i] + (1 - u)*buffer[i + 1]
            // buffer[i] = buffer[i] + u*(buffer[i + 1] - buffer[i])
            // buffer[i] += (buffer[i + 1] - buffer[i])*u
            buffer[i].add(buffer[i + 1].dup().sub(buffer[i]).scale(u));
        }
    }
    out_p.copy(buffer[0]);
}
