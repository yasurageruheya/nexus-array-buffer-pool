import {expect, it} from "vitest";
import {getNexus} from "../../main.test";


export const test = () => {
	it("固定長 ArrayBuffer がプールされている場合、同一スラブ範囲の容量を要求されるとキャッシュヒットする", async () => {
		const byteLength:number = 1980;
		const {nexus, spies} = await getNexus({useSpy:true});

		await nexus.free(new ArrayBuffer(byteLength)).detached.done;

		const buffer = await nexus.acquire(1990);
		expect(buffer.byteLength).toBe(byteLength);
		expect(spies.allocator.postMessage).toHaveBeenCalledTimes(0);
	});
}