/* important: all matrices are given in column ordering,
so a matrix is stored with it's array indices as follows:
0   4   8   12
1   5   9   13
2   6   10  14
3   7   11  15
*/
var Mat4 = /** @class */ (function () {
    function Mat4() {
        this.m = new Float32Array(16);
        // initalize as identity
        this.m[0] = 1;
        this.m[5] = 1;
        this.m[10] = 1;
        this.m[15] = 1;
    }
    Mat4.prototype.copy = function (other) {
        for (var i = 0; i < 16; ++i) {
            this.m[i] = other.m[i];
        }
        return this;
    };
    Mat4.prototype.dup = function () {
        var other = new Mat4();
        for (var i = 0; i < 16; ++i) {
            other.m[i] = this.m[i];
        }
        return other;
    };
    Mat4.prototype.setIdentity = function () {
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                this.m[i * 4 + j] = i == j ? 1.0 : 0.0;
            }
        }
    };
    Mat4.prototype.mul = function (other) {
        var buf = new Float32Array(16);
        for (var i = 0; i < 4; ++i) {
            for (var j = 0; j < 4; ++j) {
                for (var k = 0; k < 4; ++k) {
                    buf[j * 4 + i] += this.m[k * 4 + i] * other.m[j * 4 + k];
                }
            }
        }
        this.m = buf;
    };
    Mat4.prototype.toString = function () {
        var ret = this.m[0] + ' ' + this.m[4] + ' ' + this.m[8] + ' ' + this.m[12] + '\n';
        ret += this.m[1] + ' ' + this.m[5] + ' ' + this.m[9] + ' ' + this.m[13] + '\n';
        ret += this.m[2] + ' ' + this.m[6] + ' ' + this.m[10] + ' ' + this.m[14] + '\n';
        ret += this.m[3] + ' ' + this.m[7] + ' ' + this.m[11] + ' ' + this.m[15] + '\n';
        return ret;
    };
    Mat4.makeCopy = function (other) {
        var ret = new Mat4();
        ret.copy(other);
        return ret;
    };
    Mat4.makeScale = function (x, y, z) {
        var ret = new Mat4();
        ret.m[0] = x;
        ret.m[5] = y;
        ret.m[10] = z;
        return ret;
    };
    Mat4.makeTranslation = function (x, y, z) {
        var ret = new Mat4();
        ret.m[12] = x;
        ret.m[13] = y;
        ret.m[14] = z;
        return ret;
    };
    Mat4.makeQuaternion = function (q) {
        var ret = new Mat4();
        ret.m[0] = 1 - 2 * q.y * q.y - 2 * q.z * q.z;
        ret.m[4] = 2 * q.x * q.y - 2 * q.z * q.d;
        ret.m[8] = 2 * q.x * q.z + 2 * q.y * q.d;
        ret.m[1] = 2 * q.x * q.y + 2 * q.z * q.d;
        ret.m[5] = 1 - 2 * q.x * q.x - 2 * q.z * q.z;
        ret.m[9] = 2 * q.y * q.z - 2 * q.x * q.d;
        ret.m[2] = 2 * q.x * q.z - 2 * q.y * q.d;
        ret.m[6] = 2 * q.y * q.z + 2 * q.x * q.d;
        ret.m[10] = 1 - 2 * q.x * q.x - 2 * q.y * q.y;
        return ret;
    };
    return Mat4;
}());
