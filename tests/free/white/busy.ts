import {expect, it, Mock} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = ()=>
{

	it("isCleanerBusyがfalseの場合、cleaner.postMessageが呼ばれ、isCleanerBusyがtrueになる", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});

		spies.setIsCleanerBusy(false);
		(spies.setIsCleanerBusy as Mock).mockClear();
		const buffer = new ArrayBuffer(1024);
		await new Promise<void>(resolve => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(1);
		expect(internal.isCleanerBusy).toBe(true);
		expect(internal.cleanRequestQueue.size).toBe(0); // キューはクリアされる
	});

	it("isCleanerBusyがtrueの場合、cleaner.postMessageは呼ばれず、cleanRequestQueueにリクエストが追加される", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});

		spies.setIsCleanerBusy(true);
		(spies.setIsCleanerBusy as Mock).mockClear();
		const buffer = new ArrayBuffer(1024);
		nexus.free(buffer)
		await new Promise<void>(resolve => {
			setTimeout(resolve, 0);
		});

		expect(spies.cleaner.postMessage).not.toHaveBeenCalled();
		expect(internal.cleanRequestQueue.has(buffer)).toBe(true);
		expect(internal.cleanRequestQueue.get(buffer)).toEqual(expect.objectContaining({ buffer, returnToPool: true, id: expect.any(String) }));
		expect(spies.requestClean).not.toHaveBeenCalled();
	});
}