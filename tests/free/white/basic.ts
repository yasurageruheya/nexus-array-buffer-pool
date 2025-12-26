import {beforeEach, expect, it, Mock, vi} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = ()=>
{
	let spyClearTimeout: any;
	let spyAtomicsStore: any;

	beforeEach(async () => {
		// 内部関数のスパイを設定
		spyClearTimeout = vi.spyOn(global, "clearTimeout");
		spyAtomicsStore = vi.spyOn(global.Atomics, "store");
	});

	it("ArrayBufferをfreeするとcleaner.postMessageが呼ばれ、内部状態が更新される", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});

		const buffer = new ArrayBuffer(1024);
		await new Promise<void>((resolve) => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(internal.cycleCount).toBe(1);
		expect(spies.setCycleCount).toHaveBeenCalledWith(1);
		expect(internal.isCleanerBusy).toBe(true);
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(1);
		expect(spies.cleaner.postMessage).toHaveBeenCalledWith(
			{
				command: "clean",
				requests:
					expect.arrayContaining([
						expect.objectContaining({ buffer, returnToPool: true, id: expect.any(String) })
					])
			},
			[buffer]
		);
		expect(spyAtomicsStore).toHaveBeenCalledWith(internal.cleanerGCHintView, 0, 0);
		expect(internal.cleanRequestQueue.size).toBe(0); // キューはクリアされる
	});

	it("requestCleanerSyncV8ExternalTimeoutが設定されている場合、free呼び出し時にクリアされる", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});
		internal.setRequestCleanerSyncV8ExternalTimeout(12345); // 適当なタイマーIDを設定
		const buffer = new ArrayBuffer(1024);
		await new Promise<void>((resolve) => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(spyClearTimeout).toHaveBeenCalledWith(12345);
		expect(spies.setRequestCleanerSyncV8ExternalTimeout).toHaveBeenCalledWith(null);
	});

	it("cycleCountが5の倍数の場合、updateMainExternalMemoryが呼ばれる", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});

		(spies.updateMainExternalMemory as Mock).mockClear(); //index.js 起動時に呼ばれるのでクリアしておく
		const buffer = new ArrayBuffer(1024);
		// cycleCountを4に設定して、freeすると5になるようにする
		internal.setCycleCount(4);
		const status = nexus.free(buffer);
		expect(spies.updateMainExternalMemory).toHaveBeenCalledTimes(1);
		await new Promise<void>((resolve) => {
			status.onDetach = resolve;
		});

		// cycleCountを5に設定して、freeすると6になるようにする（呼ばれない）
		(spies.updateMainExternalMemory as Mock).mockClear();
		internal.setCycleCount(5);
		nexus.free(buffer);
		expect(spies.updateMainExternalMemory).not.toHaveBeenCalled();
	});

	it("internals.js 内での getter コール回数が正しくカウントされるか", async ()=> {
		const {getterSpies} = await getNexus({useSpy:true});
		internal.singleton.totalExternalMemory;
		expect(getterSpies.singleton.totalExternalMemory).toHaveBeenCalledTimes(1);
	})
}