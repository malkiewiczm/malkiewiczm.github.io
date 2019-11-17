"use strict";
var debug_line = [
    '',
    '',
    ''
];
function log_vel(v) {
    debug_line[0] = 'vel = ' + Math.round(v * 10) / 10;
}
function log_acc(a) {
    debug_line[1] = 'acc = ' + (Math.round(a / 9.81 * 10) / 10) + 'g';
}
function log_nacc(n) {
    debug_line[2] = 'normal acc = ' + (Math.round((n / 9.81) * 10) / 10) + 'g';
}
function draw_debug(ctx) {
    ctx.fillStyle = 'black';
    ctx.font = "9pt Arial";
    for (var i = 0; i < debug_line.length; ++i) {
        ctx.fillText(debug_line[i], 5, 15 + i * 10);
    }
}
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
    Vec2.prototype.toString = function () {
        return '{' + this.x + ', ' + this.y + '}';
    };
    return Vec2;
}());
var Track = (function () {
    function Track(control_mesh) {
        this.control_mesh = control_mesh;
        this.pts = [];
        this.tans = [];
        this.radii = [];
        this.dist = [];
        this.prev = null;
        this.next = null;
        this.recalculate();
    }
    Track.prototype.de_casteljau = function (t, p, tangent) {
        if (this.control_mesh.length === 0) {
            p.x = 0;
            p.y = 0;
            tangent.x = 1;
            tangent.y = 0;
            return 0;
        }
        if (this.control_mesh.length === 1) {
            p.assign(this.control_mesh[0]);
            tangent.x = 1;
            tangent.y = 0;
            return 0;
        }
        var dp = [];
        for (var i = 0; i < this.control_mesh.length; ++i) {
            dp[i] = this.control_mesh[i].dup();
        }
        var d2_tangent = new Vec2(0, 0);
        for (var i = this.control_mesh.length - 1; i >= 1; --i) {
            if (i === 2) {
                d2_tangent.x = dp[2].x - 2 * dp[1].x + dp[0].x;
                d2_tangent.y = dp[2].y - 2 * dp[1].y + dp[0].y;
                d2_tangent.scale(this.control_mesh.length * (this.control_mesh.length - 1));
            }
            else if (i === 1) {
                tangent.x = dp[1].x - dp[0].x;
                tangent.y = dp[1].y - dp[0].y;
                tangent.scale(this.control_mesh.length);
            }
            for (var k = 0; k < i; ++k) {
                dp[k].lerp(dp[k + 1], t);
            }
        }
        p.assign(dp[0]);
        var curvature = (tangent.x * d2_tangent.y - tangent.y * d2_tangent.x) * Math.pow(tangent.magSq(), -1.5);
        tangent.normalize();
        return curvature;
    };
    Track.prototype.initalize_detail = function () {
        var estimated_len = 0;
        for (var i = 1; i < this.control_mesh.length; ++i) {
            estimated_len += this.control_mesh[i].dist(this.control_mesh[i - 1]);
        }
        var detail_lvl = Math.max(Math.ceil(estimated_len / 2), 10);
        this.pts = [];
        this.tans = [];
        this.dist = [];
        this.radii = [];
        for (var i = 0; i <= detail_lvl; ++i) {
            this.pts.push(new Vec2(0, 0));
            this.tans.push(new Vec2(0, 0));
            this.radii.push(0);
            this.dist.push(0);
        }
        return detail_lvl;
    };
    Track.prototype.recalculate = function () {
        var detail_lvl = this.initalize_detail();
        this.radii[0] = this.de_casteljau(0, this.pts[0], this.tans[0]);
        this.dist[0] = 0;
        for (var i = 1; i <= detail_lvl; ++i) {
            var t = i / detail_lvl;
            this.radii[i] = this.de_casteljau(t, this.pts[i], this.tans[i]);
            this.dist[i] = this.dist[i - 1] + this.pts[i - 1].dist(this.pts[i]);
        }
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
            return this.radii[0];
        }
        else if (first == this.pts.length) {
            dir.assign(this.tans[this.pts.length - 1]);
            d -= this.dist[this.pts.length - 1];
            p.x = this.pts[this.pts.length - 1].x + dir.x * d;
            p.y = this.pts[this.pts.length - 1].y + dir.y * d;
            return this.radii[this.pts.length - 1];
        }
        else {
            var diff = this.dist[first] - this.dist[first - 1];
            var t = (d - this.dist[first - 1]) / diff;
            p.assign(this.pts[first - 1]);
            p.lerp(this.pts[first], t);
            dir.assign(this.tans[first - 1]);
            dir.lerp(this.tans[first], t);
            return this.radii[first - 1] + (this.radii[first] - this.radii[first - 1]) * t;
        }
    };
    Track.prototype.length = function () {
        return this.dist[this.dist.length - 1];
    };
    Track.prototype.draw = function (ctx, draw_control_mesh) {
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        {
            var draw_pt = this.pts[0].dup();
            draw_pt.pixels();
            ctx.moveTo(draw_pt.x, draw_pt.y);
        }
        for (var _i = 0, _a = this.pts; _i < _a.length; _i++) {
            var p = _a[_i];
            var draw_pt = p.dup();
            draw_pt.pixels();
            ctx.lineTo(draw_pt.x, draw_pt.y);
        }
        ctx.stroke();
        if (draw_control_mesh && this.control_mesh.length >= 1) {
            ctx.strokeStyle = 'blue';
            for (var _b = 0, _c = this.control_mesh; _b < _c.length; _b++) {
                var control = _c[_b];
                var draw_pt = control.dup();
                draw_pt.pixels();
                draw_pt.draw(ctx);
            }
            var old_size = ctx.lineWidth;
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            {
                var draw_pt = this.control_mesh[0].dup();
                draw_pt.pixels();
                ctx.moveTo(draw_pt.x, draw_pt.y);
            }
            for (var i = 1; i < this.control_mesh.length; ++i) {
                var draw_pt = this.control_mesh[i].dup();
                draw_pt.pixels();
                ctx.lineTo(draw_pt.x, draw_pt.y);
            }
            ctx.stroke();
            ctx.lineWidth = old_size;
        }
    };
    return Track;
}());
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
        this.normal_acc = 0;
    }
    Car.prototype.step = function (time) {
        if (!this.track) {
            this.ff_pos.x += this.ff_vel.x * time;
            this.ff_pos.y += this.ff_vel.y * time;
            this.ff_vel.x += GRAVITY.x * time;
            this.ff_vel.y += GRAVITY.y * time;
            this.draw_loc.assign(this.ff_pos);
            this.draw_loc.pixels();
            log_vel(this.ff_vel.mag());
            log_acc(GRAVITY.mag());
            log_nacc(0);
            return;
        }
        var curvature = -this.track.dist_to_loc(this.pos, this.draw_loc, this.dir);
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
        this.normal_acc = this.vel * this.vel * curvature - this.normal.dot(GRAVITY);
        log_vel(this.vel);
        log_acc(this.dir.dot(GRAVITY));
        log_nacc(this.normal_acc);
    };
    Car.prototype.draw = function (ctx) {
        var box_radius = 10;
        if (this.track) {
            var death = 1.0 - (Math.abs(this.normal_acc) / 150.0);
            if (death < 0) {
                death = 0;
            }
            ctx.fillStyle = 'rgb(0, ' + (death * 255) + ', 59)';
        }
        else {
            ctx.fillStyle = 'rgb(170, 222, 31)';
        }
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
window.addEventListener('load', function () {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    function resize() {
        canvas.width = window.innerWidth - 25;
        canvas.height = window.innerHeight - 25;
    }
    window.addEventListener('resize', resize);
    resize();
    var my_tracks = new Track([]);
    var currently_editing = my_tracks;
    var my_car = new Car(null);
    function recalculate_relevent() {
        currently_editing.recalculate();
        if (currently_editing.prev)
            currently_editing.prev.recalculate();
        if (currently_editing.next)
            currently_editing.next.recalculate();
        my_car = new Car(my_tracks);
    }
    var cursor = new Vec2(0, 0);
    var draw_cursor = false;
    var dragging = null;
    this.window.addEventListener('mousemove', function (e) {
        cursor.x = e.x;
        cursor.y = e.y;
        if (dragging != null) {
            dragging.assign(cursor);
            dragging.meters();
            recalculate_relevent();
        }
    });
    window.addEventListener('mouseup', function (e) {
        dragging = null;
    });
    window.addEventListener('mousedown', function (e) {
        if (!show_control_mesh)
            return;
        if (draw_cursor) {
            var v = new Vec2(e.x, e.y);
            v.meters();
            currently_editing.control_mesh.push(v);
            recalculate_relevent();
            draw_cursor = false;
        }
        else if (currently_editing.control_mesh.length > 0) {
            var m = new Vec2(e.x, e.y);
            var pts = currently_editing.control_mesh;
            var closest = pts[0].dup();
            closest.pixels();
            var index = 0;
            for (var i = 0; i < pts.length; ++i) {
                var p = pts[i].dup();
                p.pixels();
                if (m.dist(p) < m.dist(closest)) {
                    index = i;
                    closest = p;
                }
            }
            if (m.dist(closest) < 10) {
                dragging = pts[index];
            }
        }
    });
    var show_control_mesh = true;
    window.addEventListener('keydown', function (e) {
        switch (e.keyCode) {
            case 81:
                draw_cursor = !draw_cursor;
                break;
            case 69:
                if (currently_editing.control_mesh.length > 1) {
                    currently_editing.control_mesh.pop();
                    recalculate_relevent();
                }
                else if (currently_editing.control_mesh.length == 1 && currently_editing.prev) {
                    currently_editing = currently_editing.prev;
                    if (currently_editing.next)
                        currently_editing.next = currently_editing.next.next;
                    recalculate_relevent();
                }
                break;
            case 72:
                show_control_mesh = !show_control_mesh;
                break;
            case 78:
                if (currently_editing.next == null && currently_editing.control_mesh.length > 1) {
                    var nt = new Track([currently_editing.control_mesh[currently_editing.control_mesh.length - 1]]);
                    currently_editing.next = nt;
                    nt.prev = currently_editing;
                    currently_editing = nt;
                }
                break;
            case 65:
                break;
            case 68:
                break;
            case 83:
                break;
            case 87:
                break;
            case 66:
                if (currently_editing.prev)
                    currently_editing = currently_editing.prev;
                break;
            case 70:
                if (currently_editing.next)
                    currently_editing = currently_editing.next;
                break;
            case 82:
            case 13:
                my_car = new Car(my_tracks);
                break;
            default:
                console.log('keycode', e.keyCode);
        }
    });
    console.log('KEYBINDS');
    console.log('Q : place node');
    console.log('E : delete last placed');
    console.log('N : new track section');
    console.log('R : reset car');
    console.log('F : edit next track section');
    console.log('B : edit previous track section');
    console.log('H : toggle show/hide control mesh');
    function tick() {
        my_car.step(0.01666);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        for (var iter = my_tracks; iter != null; iter = iter.next) {
            iter.draw(ctx, show_control_mesh && (iter == currently_editing));
        }
        my_car.draw(ctx);
        draw_debug(ctx);
        if (draw_cursor) {
            ctx.strokeStyle = 'rgb(128, 128, 128)';
            cursor.draw(ctx);
        }
        window.requestAnimationFrame(tick);
    }
    tick();
});
