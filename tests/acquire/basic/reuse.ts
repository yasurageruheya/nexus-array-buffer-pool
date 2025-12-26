import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = () => {
	it("プールにあれば即座に持ってきて ArrayBuffer として返せる", async () => {
		const byteLength = 2500;
		const {nexus, spies} = await getNexus({useSpy:true});

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(internal.pool[slabIndex].size).toBe(1);

		const promise = nexus.acquire(byteLength);
		expect(internal.pool[slabIndex].size).toBe(0);
		expect(spies.acquireResult).toHaveBeenCalledTimes(1); //既に Promise 解決直前の関数が呼び出されている事の確認
		const buffer = await promise;
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0); //アロケーター Worker と通信しなかった事の確認
		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer instanceof ArrayBuffer).toBe(true);
	});

	it("プールにあれば即座に持ってきて ArrayBuffer として返せる2", async () => {
		const byteLength = 2500;
		const {nexus, spies} = await getNexus({useSpy:true});

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(internal.pool[slabIndex].size).toBe(1);

		const promise = nexus.acquire(byteLength, ArrayBuffer);
		expect(spies.acquireResult).toHaveBeenCalledTimes(1); //既に Promise 解決直前の関数が呼び出されている事の確認
		expect(internal.pool[slabIndex].size).toBe(0);
		const buffer = await promise;
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0); //アロケーター Worker と通信しなかった事の確認
		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer instanceof ArrayBuffer).toBe(true);
	});

	it("プールにあれば即座に持ってきて TypedArray として返せる", async () => {
		const byteLength = 2500;
		const {nexus, spies} = await getNexus({useSpy:true});

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(internal.pool[slabIndex].size).toBe(1);

		const promise = nexus.acquire(byteLength, Uint8Array);
		expect(spies.acquireResult).toHaveBeenCalledTimes(1); //既に Promise 解決直前の関数が呼び出されている事の確認
		expect(internal.pool[slabIndex].size).toBe(0);
		const view = await promise;
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0); //アロケーター Worker と通信しなかった事の確認
		expect(view.buffer.byteLength).toBe(byteLength);
		expect(view instanceof Uint8Array).toBe(true);
	});

	it("プールにあれば即座に持ってきて Buffer として返せる(Buffer に対応していない環境ではスキップ)", async () => {
		if(typeof Buffer === "undefined") return;

		const byteLength = 2500;
		const {nexus, spies} = await getNexus({useSpy:true});

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(internal.pool[slabIndex].size).toBe(1);

		const promise = nexus.acquire(byteLength, Buffer);
		expect(spies.acquireResult).toHaveBeenCalledTimes(1); //既に Promise 解決直前の関数が呼び出されている事の確認
		expect(internal.pool[slabIndex].size).toBe(0);
		const buffer = await promise;
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0); //アロケーター Worker と通信しなかった事の確認
		expect(buffer.buffer.byteLength).toBe(byteLength);
		expect(buffer instanceof Buffer).toBe(true);
	});

	it("プールにあれば即座に持ってきて DataView として返せる", async () => {
		const byteLength = 2500;
		const {nexus, spies} = await getNexus({useSpy:true});

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(internal.pool[slabIndex].size).toBe(1);

		const promise = nexus.acquire(byteLength, DataView);
		expect(spies.acquireResult).toHaveBeenCalledTimes(1); //既に Promise 解決直前の関数が呼び出されている事の確認
		expect(internal.pool[slabIndex].size).toBe(0);
		const view = await promise;
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0); //アロケーター Worker と通信しなかった事の確認
		expect(view.buffer.byteLength).toBe(byteLength);
		expect(view instanceof DataView).toBe(true);
	});
}