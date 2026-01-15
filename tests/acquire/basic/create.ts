import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = () => {
	it("ArrayBuffer が作れる", async () => {
		const byteLength = 1024;
		const {nexus, spies} = await getNexus({useSpy:true});
		// アロケーター Worker はビジー状態から始まり、起動完了したらビジー状態が解除される
		expect(internal.isAllocatorBusy).toBe(true);
		const promise = nexus.acquire(byteLength);
		expect(internal.isAllocatingRequested).toBe(false); // アロケーター Worker 起動前はリクエストが存在しても true にならないのだけど良いのかな？
		expect(internal.allocateQueue.length).toBe(1);

		// アロケーター Worker はまだ起動完了していないため、まだビジーのはず。起動完了し次第リクエストの処理を始める
		expect(internal.isAllocatorBusy).toBe(true);

		const buffer = await promise;
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(1);

		// アロケーター Worker が起動完了後すぐにリクエストを処理、ここではビジー状態が解除されているはず
		expect(internal.isAllocatorBusy).toBe(false);

		expect(buffer.byteLength).toBe(byteLength);

		if(typeof ArrayBuffer.prototype.resize === "function")
			expect(buffer.resizable).toBe(true);
		else expect(buffer.resizable).toBeFalsy();

		expect(buffer instanceof ArrayBuffer).toBe(true);
		expect(spies.onAllocatorReady).toHaveBeenCalledTimes(1);
		expect(spies.onAllocate).toHaveBeenCalledTimes(1);
		expect(spies.onCleaned).toHaveBeenCalledTimes(0);
		expect(spies.requestAllocate).toHaveBeenCalledTimes(1);
		expect(internal.nowAllocating.size).toBe(0);
		expect(internal.allocateQueue.length).toBe(0);
		expect(internal.isAllocatingRequested).toBe(false);
	});

	it("ArrayBuffer が作れる2", async () => {
		const byteLength = 1024;
		const {nexus} = await getNexus({useSpy:false});
		const promise = nexus.acquire(byteLength, ArrayBuffer);

		const buffer = await promise;

		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer instanceof ArrayBuffer).toBe(true);
		if(typeof ArrayBuffer.prototype.resize === "function")
			expect(buffer.resizable).toBe(true);
		else expect(buffer.resizable).toBeFalsy();
	});

	it("TypedArray が作れる", async () => {
		const byteLength = 1024;
		const {nexus} = await getNexus({useSpy:false});
		const promise = nexus.acquire(byteLength, Uint8Array);

		const view = await promise;

		expect(view.byteLength).toBe(byteLength);
		expect(view instanceof Uint8Array).toBe(true);
		expect(view.buffer.byteLength).toBe(byteLength);
		if(typeof ArrayBuffer.prototype.resize === "function")
			expect(view.buffer.resizable).toBe(true);
		else expect(view.buffer.resizable).toBeFalsy();
	});


	it("Buffer が作れる（Buffer に対応していない環境であればスキップ）", async () => {
		if(typeof Buffer === "undefined") return;

		const byteLength = 1024;
		const {nexus} = await getNexus({useSpy:false});
		const promise = nexus.acquire(byteLength, Buffer);

		const buffer = await promise;

		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer instanceof Buffer).toBe(true);
		expect(buffer.buffer.byteLength).toBe(byteLength);

		if(typeof ArrayBuffer.prototype.resize === "function")
			expect((buffer.buffer as ArrayBuffer).resizable).toBe(true);
		else expect((buffer.buffer as ArrayBuffer).resizable).toBeFalsy();
	});

	it("DataView が作れる", async () => {
		const byteLength = 1024;
		const {nexus} = await getNexus({useSpy:false});
		const promise = nexus.acquire(byteLength, DataView);

		const view = await promise;

		expect(view.byteLength).toBe(byteLength);
		expect(view instanceof DataView).toBe(true);
		expect(view.buffer.byteLength).toBe(byteLength);

		if(typeof ArrayBuffer.prototype.resize === "function")
			expect((view.buffer as ArrayBuffer).resizable).toBe(true);
		else expect((view.buffer as ArrayBuffer).resizable).toBeFalsy();
	});
}