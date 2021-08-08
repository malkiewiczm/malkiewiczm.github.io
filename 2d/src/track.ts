class Track {
	private pts: Vec2[] = [];
	private tans: Vec2[] = [];
	private radii: number[] = [];
	private dist: number[] = [];
	prev: Track | null = null;
	next: Track | null = null;
	constructor(public control_mesh: Vec2[]) {
		this.recalculate();
	}
	private de_casteljau(t: number, p: Vec2, tangent: Vec2): number {
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
		let dp: Vec2[] = [];
		for (let i = 0; i < this.control_mesh.length; ++i) {
			dp[i] = this.control_mesh[i].dup();
		}
		let d2_tangent = new Vec2(0, 0);
		for (let i = this.control_mesh.length - 1; i >= 1; --i) {
			if (i === 2) {
				d2_tangent.x = dp[2].x - 2*dp[1].x + dp[0].x;
				d2_tangent.y = dp[2].y - 2*dp[1].y + dp[0].y;
				d2_tangent.scale(this.control_mesh.length * (this.control_mesh.length - 1));
			}
			else if (i === 1) {
				tangent.x = dp[1].x - dp[0].x;
				tangent.y = dp[1].y - dp[0].y;
				tangent.scale(this.control_mesh.length);
			}
			for (let k = 0; k < i; ++k) {
				dp[k].lerp(dp[k + 1], t);
			}
		}
		p.assign(dp[0]);
		let curvature = (tangent.x * d2_tangent.y - tangent.y * d2_tangent.x) * Math.pow(tangent.magSq(), -1.5);
		tangent.normalize();
		return curvature;
	}
	private initalize_detail(): number {
		let estimated_len = 0;
		for (let i = 1; i < this.control_mesh.length; ++i) {
			estimated_len += this.control_mesh[i].dist(this.control_mesh[i - 1]);
		}
		let detail_lvl = Math.max(Math.ceil(estimated_len / 2), 10);
		this.pts = [];
		this.tans = [];
		this.dist = [];
		this.radii = [];
		for (let i = 0; i <= detail_lvl; ++i) {
			this.pts.push(new Vec2(0, 0));
			this.tans.push(new Vec2(0, 0));
			this.radii.push(0);
			this.dist.push(0);
		}
		return detail_lvl;
	}
	recalculate(): void {
		let detail_lvl = this.initalize_detail();
		this.radii[0] = this.de_casteljau(0, this.pts[0], this.tans[0]);
		this.dist[0] = 0;
		for (let i = 1; i <= detail_lvl; ++i) {
			let t = i / detail_lvl;
			this.radii[i] = this.de_casteljau(t, this.pts[i], this.tans[i]);
			this.dist[i] = this.dist[i - 1] + this.pts[i - 1].dist(this.pts[i]);
		}
	}
	dist_to_loc(d: number, p: Vec2, dir: Vec2): number {
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
			return this.radii[0];
		} else if (first == this.pts.length) {
			dir.assign(this.tans[this.pts.length - 1]);
			d -= this.dist[this.pts.length - 1];
			p.x = this.pts[this.pts.length - 1].x + dir.x * d;
			p.y = this.pts[this.pts.length - 1].y + dir.y * d;
			return this.radii[this.pts.length - 1];
		} else {
			let diff = this.dist[first] - this.dist[first - 1];
			let t = (d - this.dist[first - 1]) / diff;
			p.assign(this.pts[first - 1]);
			p.lerp(this.pts[first], t);
			dir.assign(this.tans[first - 1]);
			dir.lerp(this.tans[first], t);
			return this.radii[first - 1] + (this.radii[first] - this.radii[first - 1]) * t;
		}
	}
	length(): number {
		return this.dist[this.dist.length - 1];
	}
	draw(ctx: CanvasRenderingContext2D, draw_control_mesh: boolean): void {
		ctx.strokeStyle = 'black';
		ctx.beginPath();
		{
			let draw_pt = this.pts[0].dup();
			draw_pt.pixels();
			ctx.moveTo(draw_pt.x, draw_pt.y);
		}
		for (let p of this.pts) {
			let draw_pt = p.dup();
			draw_pt.pixels();
			ctx.lineTo(draw_pt.x, draw_pt.y);
		}
		ctx.stroke();
		if (draw_control_mesh && this.control_mesh.length >= 1) {
			ctx.strokeStyle = 'blue';
			for (let control of this.control_mesh) {
				let draw_pt = control.dup();
				draw_pt.pixels();
				draw_pt.draw(ctx);
			}
			let old_size = ctx.lineWidth;
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'black';
			ctx.beginPath();
			{
				let draw_pt = this.control_mesh[0].dup();
				draw_pt.pixels();
				ctx.moveTo(draw_pt.x, draw_pt.y);
			}
			for (let i = 1; i < this.control_mesh.length; ++i) {
				let draw_pt = this.control_mesh[i].dup();
				draw_pt.pixels();
				ctx.lineTo(draw_pt.x, draw_pt.y);
			}
			ctx.stroke();
			ctx.lineWidth = old_size;
		}
	}
}