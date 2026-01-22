import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export * as hit from "./hit";
export * as miss from "./miss";

export const test = () => {
	it("1つだけがプールに入っている時に、2回要求された時は、1つ目は即座に返され、2つ目はアロケーターが生成する", async () => {
		const byteLength:number = 2020;
		const {nexus, spies} = await getNexus({useSpy:true});

		const poolSlabIndex = internal.getPoolSlabIndex(byteLength);
		expect(poolSlabIndex).toBe(3);

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		expect(internal.pool[poolSlabIndex].size).toBe(1);

		const promiseA = nexus.acquire(2010);
		const promiseB = nexus.acquire(2000);

		//todo: このテストから！！！！！！

		expect(internal.pool[poolSlabIndex].size).toBe(0);
		// expect(buffer.byteLength).toBe(byteLength);
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0);
	});
}