const GRAVITY: Vec2 = new Vec2(0.0, 9.81);

class Car {
	private draw_loc: Vec2 = new Vec2(0, 0);
	private dir: Vec2 = new Vec2(0, 0);
	private normal: Vec2 = new Vec2(0, 0);
	private pos: number = 0.5;
	private vel: number = 0.0;
	// free fall position and velocity
	private ff_pos: Vec2 = new Vec2(10, 30);
	private ff_vel: Vec2 = new Vec2(10, -10);
	constructor(private track: Track | null) {
	}
	step(time: number): void {
		if (! this.track) {
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
	}
	draw(ctx: CanvasRenderingContext2D): void {
		const box_radius = 10;
		ctx.fillStyle = 'rgb(0, 220, 59)';
		ctx.fillRect(this.draw_loc.x - box_radius, this.draw_loc.y - box_radius, box_radius*2, box_radius*2);
		const force_len = 25;
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
	}
}