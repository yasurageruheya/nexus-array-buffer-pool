import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export * as free from "./free";

export const test = () => {
	it("アロケーターが作る物は全て ResizableArrayBuffer である", async () => {
		const byteLength:number = 1024;
		const {nexus} = await getNexus({useSpy:false});

		const buffer:ArrayBuffer = await nexus.acquire(byteLength);

		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer.resizable).toBe(true);
	});
	it("アロケーターが作る ResizableArrayBuffer は maxByteLength を指定しなければ自動で maxByteLength がスラブ内サイズの最大値になる", async () => {
		const byteLength:number = 2700;
		const {nexus} = await getNexus({useSpy:false});

		const buffer:ArrayBuffer = await nexus.acquire(byteLength);
		const maxByteLength:bigint = 3125n; //デフォルト設定での byteLength=2700 の時の最大スラブサイズはこの値のはず

		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer.resizable).toBe(true);
		expect(BigInt(buffer.maxByteLength)).toBe(maxByteLength);

	});
}