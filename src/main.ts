window.addEventListener('load', function() {
	let canvas = document.getElementById('canvas') as HTMLCanvasElement;
	let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	function resize(): void {
		canvas.width = window.innerWidth - 25;
		canvas.height = window.innerHeight - 25;
	}
	window.addEventListener('resize', resize);
	resize();
	let control_points: Vec2[] = [];
	let my_tracks: Track | null = null;
	let my_car = new Car(null);
	function update_track(): void {
		log_pts(control_points.length);
		if (control_points.length == 0) {
			my_tracks = null;
			my_car = new Car(null);
			return;
		}
		let new_track = make_track(control_points);
		if (new_track != null) {
			my_tracks = new_track;
			my_car = new Car(my_tracks);
		}
	}
	update_track();
	let cursor = new Vec2(0, 0);
	let draw_cursor: boolean = false;
	let dragging: Vec2 | null = null;
	this.window.addEventListener('mousemove', (e: MouseEvent) => {
		cursor.x = e.x;
		cursor.y = e.y;
		if (dragging != null) {
			dragging.assign(cursor);
			dragging.meters();
			update_track();
		}
	});
	window.addEventListener('mouseup', (e: MouseEvent) => {
		dragging = null;
	});
	window.addEventListener('mousedown', (e: MouseEvent) => {
		if (draw_cursor) {
			let v = new Vec2(e.x, e.y);
			v.meters();
			//console.log(v.x, v.y);
			control_points.push(v.dup());
			update_track();
			draw_cursor = false;
		} else if (control_points.length > 0) {
			let m = new Vec2(e.x, e.y);
			let closest: Vec2 = control_points[0].dup();
			closest.pixels();
			let index = 0;
			for (let i = 0; i < control_points.length; ++i) {
				let p = control_points[i].dup();
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
	window.addEventListener('keydown', (e: KeyboardEvent) => {
		switch (e.keyCode) {
			case 81:
				// Q
				draw_cursor = ! draw_cursor;
				break;
			case 87:
				// W
			case 8:
				// backspace
				if (control_points.length >= 1) {
					control_points.pop();
					update_track();
				}
				break;
			case 13:
				// enter
				my_car = new Car(my_tracks);
				break;
			default:
				console.log(e.keyCode);
		}
	});
	function tick(): void {
		my_car.step(0.01666);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 4;
		for (let iter = my_tracks; iter != null; iter = iter.next) {
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