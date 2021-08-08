interface Point {
	x: number;
	y: number;
}

interface Primitive {
	n: number;
	pts: Point[];
}

class Curve {
	private p: Primitive = { n: 0, pts: [] };
	private pts: Point[] = [];
	constructor() {
		this.pts = [
			{ x: 167, y: 114 },
			{ x: 119, y: 418 },
			{ x: 294, y: 621 },
			{ x: 626, y: 653 }
		];
		this.calculate();
	}
	private calculate(): void {
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
		for (let item of this.pts) {
			this.p.pts.push({ x: item.x, y: item.y});
		}
		for (let n = this.pts.length - 1; n >= 1; --n) {
			for (let i = 0; i < n; ++i) {
				lerp(this.p.pts[i], this.p.pts[i + 1], 0.5, this.p.pts[i]);
			}
		}
	}
	add(x: number, y: number): void {
		this.pts.push({ x: x, y: y});
		this.calculate();
	}
	draw(ctx: CanvasRenderingContext2D): void {
		ctx.strokeStyle = 'blue';
		for (let item of this.pts) {
			draw_point(ctx, item);
		}
		if (this.pts.length != this.p.n) {
			ctx.strokeStyle = 'cyan';
			for (let item of this.p.pts) {
				draw_point(ctx, item);
			}
		}
		ctx.strokeStyle = 'black';
		ctx.beginPath();
		draw_primitive(ctx, this.p);
		ctx.stroke();
	}
}

let curve = new Curve();

function lerp(a: Point, b: Point, t: number, c: Point): void {
	c.x = a.x + (b.x - a.x) * t;
	c.y = a.y + (b.y - a.y) * t;
}

function draw_primitive(ctx: CanvasRenderingContext2D, p: Primitive) {
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

function draw_point(ctx: CanvasRenderingContext2D, p: Point): void {
	const r = 7;
	ctx.beginPath();
	ctx.moveTo(p.x - r, p.y - r);
	ctx.lineTo(p.x + r, p.y + r);
	ctx.moveTo(p.x - r, p.y + r);
	ctx.lineTo(p.x + r, p.y - r);
	ctx.stroke();
}

window.addEventListener('load', function() {
	let canvas = document.getElementById('canvas') as HTMLCanvasElement;
	let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	function resize(): void {
		canvas.width = window.innerWidth - 25;
		canvas.height = window.innerHeight - 25;
	}
	window.addEventListener('resize', resize);
	resize();
	window.addEventListener('click', (e: MouseEvent) => {
		curve.add(e.x, e.y);
	});
	function tick(): void {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 4;
		curve.draw(ctx);
		window.requestAnimationFrame(tick);
	}
	tick();
});