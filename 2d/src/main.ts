window.addEventListener('load', function() {
	let canvas = document.getElementById('canvas') as HTMLCanvasElement;
	let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	function resize(): void {
		canvas.width = window.innerWidth - 25;
		canvas.height = window.innerHeight - 25;
	}
	window.addEventListener('resize', resize);
	resize();
	let my_tracks: Track = new Track([]);
	let currently_editing = my_tracks;
	let my_car = new Car(null);
	function recalculate_relevent() {
		currently_editing.recalculate();
		if (currently_editing.prev)
			currently_editing.prev.recalculate();
		if (currently_editing.next)
			currently_editing.next.recalculate();
		my_car = new Car(my_tracks);
	}
	let cursor = new Vec2(0, 0);
	let draw_cursor: boolean = false;
	let dragging: Vec2 | null = null;
	this.window.addEventListener('mousemove', (e: MouseEvent) => {
		cursor.x = e.x;
		cursor.y = e.y;
		if (dragging != null) {
			dragging.assign(cursor);
			dragging.meters();
			recalculate_relevent();
		}
	});
	window.addEventListener('mouseup', (e: MouseEvent) => {
		dragging = null;
	});
	window.addEventListener('mousedown', (e: MouseEvent) => {
		if (! show_control_mesh)
			return;
		if (draw_cursor) {
			let v = new Vec2(e.x, e.y);
			v.meters();
			//console.log(v.x, v.y);
			currently_editing.control_mesh.push(v);
			recalculate_relevent();
			draw_cursor = false;
		} else if (currently_editing.control_mesh.length > 0) {
			let m = new Vec2(e.x, e.y);
			let pts = currently_editing.control_mesh;
			let closest: Vec2 = pts[0].dup();
			closest.pixels();
			let index = 0;
			for (let i = 0; i < pts.length; ++i) {
				let p = pts[i].dup();
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
	let show_control_mesh: boolean = true;
	window.addEventListener('keydown', (e: KeyboardEvent) => {
		switch (e.keyCode) {
			case 81:
				// Q
				draw_cursor = ! draw_cursor;
				break;
			case 69:
				// E
				if (currently_editing.control_mesh.length > 1) {
					currently_editing.control_mesh.pop();
					recalculate_relevent();
				} else if (currently_editing.control_mesh.length == 1 && currently_editing.prev) {
					currently_editing = currently_editing.prev;
					if (currently_editing.next)
						currently_editing.next = currently_editing.next.next;
					recalculate_relevent();
				}
				break;
			case 72:
				// H
				show_control_mesh = ! show_control_mesh;
				break;
			case 78:
				// N
				if (currently_editing.next == null && currently_editing.control_mesh.length > 1) {
					let nt = new Track([currently_editing.control_mesh[currently_editing.control_mesh.length - 1]]);
					/*
					if (currently_editing.next) {
						nt.next = currently_editing.next.next;
						currently_editing.next.prev = nt;
					}
					*/
					currently_editing.next = nt;
					nt.prev = currently_editing;
					currently_editing = nt;
				}
				break;
			case 65:
				// A
				break;
			case 68:
				// D;
				break;
			case 83:
				// S
				break;
			case 87:
				// W
				break;
			case 66:
				// B
				if (currently_editing.prev)
					currently_editing = currently_editing.prev;
				break;
			case 70:
				// F
				if (currently_editing.next)
					currently_editing = currently_editing.next;
				break;
			case 82:
				// R (fall through)
			case 13:
				// enter
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
	function tick(): void {
		my_car.step(0.01666);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 4;
		for (let iter : Track | null = my_tracks; iter != null; iter = iter.next) {
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