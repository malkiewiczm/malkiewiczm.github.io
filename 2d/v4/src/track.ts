const TRACK_DETAIL_LVL = 20;

class Track {
	private pts: Vec2[] = [];
	private tans: Vec2[] = [];
	private dist: number[] = [];
	prev: Track | null = null;
	next: Track | null = null;
	private draw_A: Vec2 = new Vec2(0, 0);
	private draw_B: Vec2 = new Vec2(0, 0);
	private draw_C: Vec2 = new Vec2(0, 0);
	private draw_D: Vec2 = new Vec2(0, 0);
	constructor(public A: Vec2, public B: Vec2, public C: Vec2, public D: Vec2) {
		for (let i = 0; i <= TRACK_DETAIL_LVL; ++i) {
			this.pts.push(new Vec2(0, 0));
			this.tans.push(new Vec2(0, 0));
			this.dist.push(0);
		}
		this.calculate();
	}
	location(t: number, p: Vec2): void {
		p.x = -this.A.x*t*t*t + 3*this.A.x*t*t - 3*this.A.x*t + this.A.x + 3*this.B.x*t*t*t - 6*this.B.x*t*t + 3*this.B.x*t - 3*this.C.x*t*t*t + 3*this.C.x*t*t + this.D.x*t*t*t;
		p.y = -this.A.y*t*t*t + 3*this.A.y*t*t - 3*this.A.y*t + this.A.y + 3*this.B.y*t*t*t - 6*this.B.y*t*t + 3*this.B.y*t - 3*this.C.y*t*t*t + 3*this.C.y*t*t + this.D.y*t*t*t;
	}
	tangent(t: number, p: Vec2): void {
		p.x = -3*this.A.x*t*t + 6*this.A.x*t - 3*this.A.x + 9*this.B.x*t*t - 12*this.B.x*t + 3*this.B.x - 9*this.C.x*t*t + 6*this.C.x*t + 3*this.D.x*t*t;
		p.y = -3*this.A.y*t*t + 6*this.A.y*t - 3*this.A.y + 9*this.B.y*t*t - 12*this.B.y*t + 3*this.B.y - 9*this.C.y*t*t + 6*this.C.y*t + 3*this.D.y*t*t;
		p.normalize();
	}
	calculate(): void {
		this.location(0, this.pts[0]);
		this.tangent(0, this.tans[0]);
		this.dist[0] = 0;
		for (let i = 1; i <= TRACK_DETAIL_LVL; ++i) {
			let t = i / TRACK_DETAIL_LVL;
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
	}
	dist_to_loc(d: number, p: Vec2, dir: Vec2): void {
		let first = 0;
		let last = this.pts.length;
		let count = last - first;
    	while (count > 0) {
			let step = Math.floor(count / 2);
        	let it = first + step;
        	if (this.dist[it] < d) {
            	first = it + 1;
            	count -= step + 1;
        	} else {
	            count = step;
	        }
		}
		if (first == 0) {
			dir.assign(this.tans[0]);
			p.x = this.pts[0].x + dir.x * d;
			p.y = this.pts[0].y + dir.y * d;
		} else if (first == this.pts.length) {
			dir.assign(this.tans[this.pts.length - 1]);
			d -= this.dist[this.pts.length - 1];
			p.x = this.pts[this.pts.length - 1].x + dir.x * d;
			p.y = this.pts[this.pts.length - 1].y + dir.y * d;
		} else {
			let diff = this.dist[first] - this.dist[first - 1];
			let t = (d - this.dist[first - 1]) / diff;
			p.assign(this.pts[first - 1]);
			p.lerp(this.pts[first], t);
			dir.assign(this.tans[first - 1]);
			dir.lerp(this.tans[first], t);
		}
	}
	length(): number {
		return this.dist[this.dist.length - 1];
	}
	draw(ctx: CanvasRenderingContext2D): void {
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
	}
}

function make_track(data: Vec2[]): Track | null {
	if (data.length < 3)
		return null;
	if (data.length % 3 != 1)
		return null;
	let head = new Track(data[0], data[1], data[2], data[3]);
	let last = head;
	for (let i = 6; i < data.length; i += 3) {
		let track = new Track(data[i - 3], data[i - 2], data[i - 1], data[i]);
		track.prev = last;
		last.next = track;
		last = track;
	}
	return head;
}