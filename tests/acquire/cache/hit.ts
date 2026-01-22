import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";


export const test = () => {
	it("デフォルトポリシーでは固定長 2000 byte ArrayBuffer はスラブ3にプールされ、2000 byte ArrayBuffer が要求された場合スラブ3の 2000 byte ArrayBuffer がキャッシュヒットする", async () => {
		const byteLength:number = 2000;
		const {nexus, spies} = await getNexus({useSpy:true});

		const poolSlabIndex = internal.getPoolSlabIndex(byteLength);
		expect(poolSlabIndex).toBe(3);

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		expect(internal.pool[poolSlabIndex].size).toBe(1);

		const buffer = await nexus.acquire(byteLength);
		expect(internal.pool[poolSlabIndex].size).toBe(0);
		expect(buffer.byteLength).toBe(byteLength);
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0);
	});
	it("デフォルトポリシーでは固定長 2100 byte ArrayBuffer はスラブ3にプールされ、1990 byte ArrayBuffer が要求された場合スラブ3の 2100 byte ArrayBuffer がキャッシュヒットする", async () => {
		const byteLength:number = 2100;
		const {nexus, spies} = await getNexus({useSpy:true});

		const poolSlabIndex = internal.getPoolSlabIndex(byteLength);
		expect(poolSlabIndex).toBe(3);

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		expect(internal.pool[poolSlabIndex].size).toBe(1);

		const acquireByteLength = 1990;
		const buffer = await nexus.acquire(acquireByteLength);
		expect(internal.pool[poolSlabIndex].size).toBe(0);
		expect(buffer.byteLength).toBe(byteLength);
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0);
	});
	it("デフォルトポリシーでは固定長 2499 byte ArrayBuffer はスラブ3にプールされ、1601 byte ArrayBuffer が要求された場合スラブ3の 2499 byte ArrayBuffer がキャッシュヒットする", async () => {
		const byteLength:number = 2499;
		const {nexus, spies} = await getNexus({useSpy:true});

		const poolSlabIndex = internal.getPoolSlabIndex(byteLength);
		expect(poolSlabIndex).toBe(3);

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		expect(internal.pool[poolSlabIndex].size).toBe(1);

		const acquireByteLength = 1601;
		const buffer = await nexus.acquire(acquireByteLength);
		expect(internal.pool[poolSlabIndex].size).toBe(0);
		expect(buffer.byteLength).toBe(byteLength);
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0);
	});
}