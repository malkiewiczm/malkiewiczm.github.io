"use strict";
var opt = {
    p0: { x: 100, y: 200 },
    p1: { x: 500, y: 600 },
    p2: { x: 700, y: 200 },
    step: 3
};
var mouse = { x: 0, y: 0 };
function sln(t) {
    var right = { x: 0, y: 0 };
    var left = { x: 0, y: 0 };
    var res = { x: 0, y: 0 };
    lerp(opt.p0, opt.p1, t, left);
    lerp(opt.p1, opt.p2, t, right);
    lerp(left, right, t, res);
    return res;
}
function lerp(a, b, t, c) {
    c.x = a.x + (b.x - a.x) * t;
    c.y = a.y + (b.y - a.y) * t;
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
        canvas.width = window.innerWidth - 15;
        canvas.height = window.innerHeight - 15;
    }
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) {
        mouse.x = e.x;
        mouse.y = e.y;
    });
    window.addEventListener('keydown', function (e) {
        switch (e.keyCode) {
            case 81:
                // Q
                if (opt.step > 1)
                    --opt.step;
                break;
            case 69:
                // E
                if (opt.step < 30)
                    ++opt.step;
                break;
            case 49:
                // 1
                opt.p0.x = mouse.x;
                opt.p0.y = mouse.y;
                break;
            case 50:
                // 2
                opt.p1.x = mouse.x;
                opt.p1.y = mouse.y;
                break;
            case 51:
                // 3
                opt.p2.x = mouse.x;
                opt.p2.y = mouse.y;
                break;
            default:
            //console.log(e.keyCode);
        }
    });
    resize();
    function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(opt.p0.x, opt.p0.y);
        ctx.lineTo(opt.p1.x, opt.p1.y);
        ctx.lineTo(opt.p2.x, opt.p2.y);
        ctx.stroke();
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        for (var i = 1; i <= opt.step; ++i) {
            var t = i / (opt.step + 1);
            var left = { x: 0, y: 0 };
            var right = { x: 0, y: 0 };
            lerp(opt.p0, opt.p1, t, left);
            lerp(opt.p1, opt.p2, t, right);
            ctx.moveTo(left.x, left.y);
            ctx.lineTo(right.x, right.y);
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgb(150, 0, 0)';
        for (var i = 1; i <= opt.step; ++i) {
            var t = i / (opt.step + 1);
            var p = sln(t);
            draw_point(ctx, p);
        }
        window.requestAnimationFrame(tick);
    }
    tick();
});
