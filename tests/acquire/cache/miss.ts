import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";


export const test = () => {
	it("デフォルトポリシーでは固定長 1980 byte ArrayBuffer はスラブ2にプールされ、1990 byte ArrayBuffer の要求はスラブ3になるため 1980 byte ArrayBuffer はキャッシュヒットしない", async () => {
		const freeByteLength:number = 1980;
		const {nexus, spies} = await getNexus({useSpy:true});

		const poolSlabIndex = internal.getPoolSlabIndex(freeByteLength);
		expect(poolSlabIndex).toBe(2);

		await nexus.free(new ArrayBuffer(freeByteLength)).detached.done;
		expect(internal.pool[poolSlabIndex].size).toBe(1);

		const acquireByteLength = 1990;
		expect(internal.getSlabIndex(acquireByteLength)).toBe(3);

		const buffer = await nexus.acquire(acquireByteLength);
		expect(internal.pool[poolSlabIndex].size).toBe(1);
		expect(buffer.byteLength).toBe(acquireByteLength);
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(1);
	});
	it("デフォルトポリシーでは固定長 2499 byte ArrayBuffer はスラブ3にプールされ、1600 byte ArrayBuffer の要求はスラブ2になるため 2499 byte ArrayBuffer がキャッシュヒットしない", async () => {
		const freeByteLength:number = 2499;
		const {nexus, spies} = await getNexus({useSpy:true});

		const poolSlabIndex = internal.getPoolSlabIndex(freeByteLength);
		expect(poolSlabIndex).toBe(3);

		await nexus.free(new ArrayBuffer(freeByteLength)).detached.done;
		expect(internal.pool[poolSlabIndex].size).toBe(1);

		const acquireByteLength = 1600;
		expect(internal.getSlabIndex(acquireByteLength)).toBe(2);
		const buffer = await nexus.acquire(acquireByteLength);
		expect(internal.pool[poolSlabIndex].size).toBe(1);
		expect(buffer.byteLength).toBe(acquireByteLength);
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(1);
	});
}