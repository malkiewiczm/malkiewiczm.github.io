"use strict";
var Curve = /** @class */ (function () {
    function Curve() {
        this.p = { n: 0, pts: [] };
        this.pts = [];
        this.pts = [
            { x: 167, y: 114 },
            { x: 119, y: 418 },
            { x: 294, y: 621 },
            { x: 626, y: 653 }
        ];
        this.calculate();
    }
    Curve.prototype.calculate = function () {
        switch (this.pts.length) {
            case 0:
            case 1:
                return;
            case 2:
            case 3:
            case 4:
                this.p.n = this.pts.length;
                this.p.pts = this.pts;
                return;
        }
        this.p.n = 4;
        this.p.pts = [];
        for (var _i = 0, _a = this.pts; _i < _a.length; _i++) {
            var item = _a[_i];
            this.p.pts.push({ x: item.x, y: item.y });
        }
        for (var n = this.pts.length - 1; n >= 1; --n) {
            for (var i = 0; i < n; ++i) {
                lerp(this.p.pts[i], this.p.pts[i + 1], 0.5, this.p.pts[i]);
            }
        }
    };
    Curve.prototype.add = function (x, y) {
        this.pts.push({ x: x, y: y });
        this.calculate();
    };
    Curve.prototype.draw = function (ctx) {
        ctx.strokeStyle = 'blue';
        for (var _i = 0, _a = this.pts; _i < _a.length; _i++) {
            var item = _a[_i];
            draw_point(ctx, item);
        }
        if (this.pts.length != this.p.n) {
            ctx.strokeStyle = 'cyan';
            for (var _b = 0, _c = this.p.pts; _b < _c.length; _b++) {
                var item = _c[_b];
                draw_point(ctx, item);
            }
        }
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        draw_primitive(ctx, this.p);
        ctx.stroke();
    };
    return Curve;
}());
var curve = new Curve();
function lerp(a, b, t, c) {
    c.x = a.x + (b.x - a.x) * t;
    c.y = a.y + (b.y - a.y) * t;
}
function draw_primitive(ctx, p) {
    switch (p.n) {
        case 2:
            ctx.moveTo(p.pts[0].x, p.pts[0].y);
            ctx.lineTo(p.pts[1].x, p.pts[1].y);
            break;
        case 3:
            ctx.moveTo(p.pts[0].x, p.pts[0].y);
            ctx.quadraticCurveTo(p.pts[1].x, p.pts[1].y, p.pts[2].x, p.pts[2].y);
            break;
        case 4:
            ctx.moveTo(p.pts[0].x, p.pts[0].y);
            ctx.bezierCurveTo(p.pts[1].x, p.pts[1].y, p.pts[2].x, p.pts[2].y, p.pts[3].x, p.pts[3].y);
            break;
    }
}
function draw_point(ctx, p) {
    var r = 7;
    ctx.beginPath();
    ctx.moveTo(p.x - r, p.y - r);
    ctx.lineTo(p.x + r, p.y + r);
    ctx.moveTo(p.x - r, p.y + r);
    ctx.lineTo(p.x + r, p.y - r);
    ctx.stroke();
}
window.addEventListener('load', function () {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    function resize() {
        canvas.width = window.innerWidth - 25;
        canvas.height = window.innerHeight - 25;
    }
    window.addEventListener('resize', resize);
    resize();
    window.addEventListener('click', function (e) {
        curve.add(e.x, e.y);
    });
    function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        curve.draw(ctx);
        window.requestAnimationFrame(tick);
    }
    tick();
});
