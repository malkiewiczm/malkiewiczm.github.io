"use strict";
var debug_line = [
    '',
    '',
    ''
];
function log_pts(n) {
    debug_line[0] = 'pts = ' + n;
}
function log_vel(v) {
    debug_line[1] = 'speed = ' + Math.round(v * 10) / 10;
}
function log_acc(a) {
    debug_line[2] = 'acc = ' + Math.round(a * 10) / 10;
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
    return Vec2;
}());
var TRACK_DETAIL_LVL = 20;
var Track = (function () {
    function Track(A, B, C) {
        this.A = A;
        this.B = B;
        this.C = C;
        this.pts = [];
        this.tans = [];
        this.dist = [];
        this.prev = null;
        this.next = null;
        this.draw_A = new Vec2(0, 0);
        this.draw_B = new Vec2(0, 0);
        this.draw_C = new Vec2(0, 0);
        for (var i = 0; i <= TRACK_DETAIL_LVL; ++i) {
            this.pts.push(new Vec2(0, 0));
            this.tans.push(new Vec2(0, 0));
            this.dist.push(0);
        }
        this.calculate();
    }
    Track.prototype.location = function (t, p) {
        p.x = this.A.x + 2 * this.B.x * t - 2 * this.A.x * t + this.C.x * t * t - 2 * this.B.x * t * t + this.A.x * t * t;
        p.y = this.A.y + 2 * this.B.y * t - 2 * this.A.y * t + this.C.y * t * t - 2 * this.B.y * t * t + this.A.y * t * t;
    };
    Track.prototype.tangent = function (t, p) {
        p.x = 2 * this.B.x - 2 * this.A.x + 2 * this.C.x * t - 4 * this.B.x * t + 2 * this.A.x * t;
        p.y = 2 * this.B.y - 2 * this.A.y + 2 * this.C.y * t - 4 * this.B.y * t + 2 * this.A.y * t;
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
        this.draw_A.pixels();
        this.draw_B.pixels();
        this.draw_C.pixels();
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
        ctx.quadraticCurveTo(this.draw_B.x, this.draw_B.y, this.draw_C.x, this.draw_C.y);
        ctx.stroke();
        ctx.strokeStyle = 'blue';
        this.draw_A.draw(ctx);
        this.draw_B.draw(ctx);
        this.draw_C.draw(ctx);
    };
    return Track;
}());
function make_track(data) {
    if (data.length < 3)
        return null;
    if (data.length % 2 == 0)
        return null;
    var head = new Track(data[0], data[1], data[2]);
    var last = head;
    for (var i = 4; i < data.length; i += 2) {
        var track = new Track(data[i - 2], data[i - 1], data[i]);
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
            log_vel(this.ff_vel.mag());
            log_acc(GRAVITY.mag());
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
        log_vel(this.vel);
        log_acc(this.dir.dot(GRAVITY));
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
window.addEventListener('load', function () {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    function resize() {
        canvas.width = window.innerWidth - 25;
        canvas.height = window.innerHeight - 25;
    }
    window.addEventListener('resize', resize);
    resize();
    var control_points = [];
    var my_tracks = null;
    var my_car = new Car(null);
    function update_track() {
        log_pts(control_points.length);
        if (control_points.length == 0) {
            my_tracks = null;
            my_car = new Car(null);
            return;
        }
        var new_track = make_track(control_points);
        if (new_track != null) {
            my_tracks = new_track;
            my_car = new Car(my_tracks);
        }
    }
    update_track();
    var cursor = new Vec2(0, 0);
    var draw_cursor = false;
    var dragging = null;
    this.window.addEventListener('mousemove', function (e) {
        cursor.x = e.x;
        cursor.y = e.y;
        if (dragging != null) {
            dragging.assign(cursor);
            dragging.meters();
            update_track();
        }
    });
    window.addEventListener('mouseup', function (e) {
        dragging = null;
    });
    window.addEventListener('mousedown', function (e) {
        if (draw_cursor) {
            var v = new Vec2(e.x, e.y);
            v.meters();
            control_points.push(v.dup());
            update_track();
            draw_cursor = false;
        }
        else if (control_points.length > 0) {
            var m = new Vec2(e.x, e.y);
            var closest = control_points[0].dup();
            closest.pixels();
            var index = 0;
            for (var i = 0; i < control_points.length; ++i) {
                var p = control_points[i].dup();
                p.pixels();
                if (m.dist(p) < m.dist(closest)) {
                    index = i;
                    closest = p;
                }
            }
            if (m.dist(closest) < 10) {
                dragging = control_points[index];
            }
        }
    });
    window.addEventListener('keydown', function (e) {
        switch (e.keyCode) {
            case 81:
                draw_cursor = !draw_cursor;
                break;
            case 87:
            case 8:
                if (control_points.length >= 1) {
                    control_points.pop();
                    update_track();
                }
                break;
            case 13:
                my_car = new Car(my_tracks);
                break;
            default:
                console.log(e.keyCode);
        }
    });
    function tick() {
        my_car.step(0.01666);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        for (var iter = my_tracks; iter != null; iter = iter.next) {
            iter.draw(ctx);
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
