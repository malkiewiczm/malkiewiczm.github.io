let debug_line: string[] = [
	'',
	'',
	''
];

function log_vel(v: number): void {
	debug_line[0] = 'vel = ' + Math.round(v * 10) / 10;
}

function log_acc(a: number): void {
	debug_line[1] = 'acc = ' + (Math.round(a / 9.81 * 10) / 10) + 'g';
}

function log_nacc(n: number): void {
	debug_line[2] = 'normal acc = ' + (Math.round((n / 9.81) * 10) / 10) + 'g';
}

function draw_debug(ctx: CanvasRenderingContext2D): void {
	ctx.fillStyle = 'black';
	ctx.font = "9pt Arial";
	for (let i = 0; i < debug_line.length; ++i) {
		ctx.fillText(debug_line[i], 5, 15 + i*10);
	}
}