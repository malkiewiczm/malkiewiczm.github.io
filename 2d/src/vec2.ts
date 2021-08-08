const SCALE = 12.0;

class Vec2 {
	constructor(public x: number, public y: number) {}
	assign(rhs: Vec2): void {
		this.x = rhs.x;
		this.y = rhs.y;
	}
	dup(): Vec2 {
		return new Vec2(this.x, this.y);
	}
	pixels(): void {
		this.x *= SCALE;
		this.y *= SCALE;
	}
	meters(): void {
		this.x /= SCALE;
		this.y /= SCALE;
	}
	draw(ctx: CanvasRenderingContext2D): void {
		const r = 7;
		ctx.beginPath();
		ctx.moveTo(this.x - r, this.y - r);
		ctx.lineTo(this.x + r, this.y + r);
		ctx.moveTo(this.x - r, this.y + r);
		ctx.lineTo(this.x + r, this.y - r);
		ctx.stroke();
	}
	dot(rhs: Vec2): number {
		return this.x * rhs.x + this.y * rhs.y;
	}
	distSq(rhs: Vec2): number {
		let dx = rhs.x - this.x;
		let dy = rhs.y - this.y;
		return dx * dx + dy * dy;
	}
	dist(rhs: Vec2): number {
		let dx = rhs.x - this.x;
		let dy = rhs.y - this.y;
		return Math.sqrt(dx*dx + dy*dy);
	}
	magSq(): number {
		return this.x*this.x + this.y*this.y;
	}
	mag(): number {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	}
	normalize(): void {
		let m = this.mag();
		this.x /= m;
		this.y /= m;
	}
	lerp(p: Vec2, t: number): void {
		this.x += (p.x - this.x) * t;
		this.y += (p.y - this.y) * t;
	}
	scale(amt: number): void {
		this.x *= amt;
		this.y *= amt;
	}
	toString(): string {
		return '{' + this.x + ', ' + this.y + '}';
	}
}