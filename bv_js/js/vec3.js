/*
the Vec3 class does have a fourth element called 'd' that
is the rational point and not considered a member
(except for when it is normalized)
*/
var Vec3 = /** @class */ (function () {
    function Vec3() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.d = 1;
    }
    Vec3.prototype.set = function (v0, v1, v2) {
        this.x = v0;
        this.y = v1;
        this.z = v2;
        return this;
    };
    Vec3.prototype.set4 = function (v0, v1, v2, v3) {
        this.d = v3;
        return this.set(v0, v1, v2);
    };
    Vec3.prototype.copy = function (v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.d = v.d;
        return this;
    };
    Vec3.prototype.dup = function () {
        var ret = new Vec3();
        ret.set4(this.x, this.y, this.z, this.d);
        return ret;
    };
    Vec3.prototype.add = function (v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    };
    Vec3.prototype.add4 = function (v) {
        this.d += v.d;
        return this.add(v);
    };
    Vec3.prototype.sub = function (v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    };
    Vec3.prototype.sub4 = function (v) {
        this.d -= v.d;
        return this.sub(v);
    };
    Vec3.prototype.scale = function (s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    };
    Vec3.prototype.scale4 = function (s) {
        this.d *= s;
        return this.scale(s);
    };
    Vec3.prototype.cross = function (v) {
        var my_x = this.x;
        var my_y = this.y;
        var my_z = this.z;
        this.x = my_y * v.z - my_z * v.y;
        this.y = my_z * v.x - my_x * v.z;
        this.z = my_x * v.y - my_y * v.x;
        this.d = 1;
        return this;
    };
    Vec3.prototype.dot = function (v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    };
    Vec3.prototype.dot4 = function (v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.d * v.d;
    };
    Vec3.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    };
    Vec3.prototype.length4 = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.d * this.d);
    };
    Vec3.prototype.normalize = function () {
        this.scale(1 / this.length());
        return this;
    };
    Vec3.prototype.normalize4 = function () {
        this.scale4(1 / this.length4());
        return this;
    };
    Vec3.prototype.normalize_rational_point = function () {
        if (this.d != 0) {
            this.scale(1 / this.d);
            this.d = 1.0;
        }
        return this;
    };
    Vec3.prototype.toString = function () {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + '; ' + this.d + ')';
    };
    // this is a right multiply of a quaternion
    // ie: v2 = this, v1 = q
    Vec3.prototype.quaternion_mul = function (q) {
        var newD = q.d * this.d - q.dot(this);
        // v1, v2 represents the vector (imaginary) part of the quaternion
        // d1*v2 + d2*v1 + (v1 cross v2)
        var res = this.dup().scale(q.d).add(q.dup().scale(this.d)).add(q.dup().cross(this));
        res.d = newD;
        return this.copy(res);
    };
    // sets the vector to represent a quaternion from an axis and angle
    Vec3.prototype.set_axis_angle = function (v0, v1, v2, theta) {
        var c = Math.cos(theta / 2);
        var s = Math.sin(theta / 2);
        return this.set4(v0 * s, v1 * s, v2 * s, c);
    };
    return Vec3;
}());
function det4(x11, x12, x13, x14, x21, x22, x23, x24, x31, x32, x33, x34, x41, x42, x43, x44) {
    return x11 * x22 * x33 * x44 - x11 * x22 * x34 * x43 - x11 * x32 * x23 * x44 + x11 * x32 * x24 * x43 + x11 * x42 * x23 * x34 - x11 * x42 * x24 * x33 - x21 * x12 * x33 * x44 + x21 * x12 * x34 * x43 + x21 * x32 * x13 * x44 - x21 * x32 * x14 * x43 - x21 * x42 * x13 * x34 + x21 * x42 * x14 * x33 + x31 * x12 * x23 * x44 - x31 * x12 * x24 * x43 - x31 * x22 * x13 * x44 + x31 * x22 * x14 * x43 + x31 * x42 * x13 * x24 - x31 * x42 * x14 * x23 - x41 * x12 * x23 * x34 + x41 * x12 * x24 * x33 + x41 * x22 * x13 * x34 - x41 * x22 * x14 * x33 - x41 * x32 * x13 * x24 + x41 * x32 * x14 * x23;
}
function det3(x11, x12, x13, x21, x22, x23, x31, x32, x33) {
    return x11 * x22 * x33 - x11 * x23 * x32 - x12 * x21 * x33 + x12 * x23 * x31 + x13 * x21 * x32 - x13 * x22 * x31;
}
