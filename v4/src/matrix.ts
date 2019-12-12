class Matrix {
	arr: Float32Array;
	constructor() {
		this.arr = new Float32Array(16);
		this.identity();
	}
	identity(): void {
		this.set0(1, 0, 0, 0);
		this.set1(0, 1, 0, 0);
		this.set2(0, 0, 1, 0);
		this.set3(0, 0, 0, 1);
	}
	rotate(theta: number, x: number, y: number, z: number): void {
		let s = Math.sin(theta);
		let c = Math.cos(theta);
		let f = 1 - c;
		this.set0(x * x * f + c, x * y * f - z * s, x * z * f + y * s, 0);
		this.set1(y * x * f + z * s, y * y * f + c, y * z * f - x * s, 0);
		this.set2(x * z * f - y * s, y * z * f + x * s, z * z * f + c, 0);
		this.set3(0, 0, 0, 1);
	};
	set0(x0: number, x1: number, x2: number, x3: number): void {
		this.arr[0] = x0;
		this.arr[4] = x1;
		this.arr[8] = x2;
		this.arr[12] = x3;
	}
	set1(x0: number, x1: number, x2: number, x3: number): void {
		this.arr[1] = x0;
		this.arr[5] = x1;
		this.arr[9] = x2;
		this.arr[13] = x3;
	}
	set2(x0: number, x1: number, x2: number, x3: number): void {
		this.arr[2] = x0;
		this.arr[6] = x1;
		this.arr[10] = x2;
		this.arr[14] = x3;
	}
	set3(x0: number, x1: number, x2: number, x3: number): void {
		this.arr[3] = x0;
		this.arr[7] = x1;
		this.arr[11] = x2;
		this.arr[15] = x3;
	}
}