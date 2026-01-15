import {CleaningStatus} from "../../index";
import {expect, it} from "vitest";
import {getNexus, internal} from "../main.test";

export const test = ()=>
{

	it("クリーナーがビジーになっている時にfree()が呼ばれたらキューに入り、別々なタイミングでクリーニングされ、メインスレッドに戻ってくる", async()=> {
		const {nexus} = await getNexus({useSpy:false});

		const bufferA = new ArrayBuffer(1024);
		const bufferB = new ArrayBuffer(2048);

		const slabA = internal.getPoolSlabIndex(bufferA.byteLength);
		const slabB = internal.getPoolSlabIndex(bufferB.byteLength);

		const statusA = nexus.free(bufferA);
		await new Promise<void>((resolve) => {
			statusA.onDetach = resolve;
		});

		const statusB = nexus.free(bufferB);
		expect(internal.cleanRequestQueue.size).toBe(1);
		expect(statusA.endpoint).toBe("pool");
		expect(statusB.endpoint).toBe("pool");
		expect(statusA.state).toBe("cleaning");
		expect(statusB.state).toBe("queued");
		expect(bufferA.byteLength).toBe(0);
		if(typeof ArrayBuffer.prototype.transfer !== "function") expect(bufferB.byteLength).toBe(2048);
		else expect(bufferB.byteLength).toBe(0);

		await new Promise<void>((resolve) => {
			statusA.onSettled = resolve;
		});

		expect(internal.pool[slabA].size).toBe(1);
		expect(internal.pool[slabB]?.size).not.toBe(1);
		expect(statusA.state).toBe("done");
		expect(statusB.state).toBe("cleaning");
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);

		await new Promise<void>((resolve) => {
			statusB.onSettled = resolve;
		});
		expect(internal.pool[slabA].size).toBe(1);
		expect(internal.pool[slabB].size).toBe(1);
		expect(statusA.state).toBe("done");
		expect(statusB.state).toBe("done");
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);
	});

	it("クリーナーがビジーになっている時に2つのArrayBufferがfreeされた時、ビジーが解除されたタイミングで2つが同時に処理される", async()=> {
		const {nexus, spies} = await getNexus({useSpy:true});
		const bufferA = new ArrayBuffer(1024);
		const bufferB = new ArrayBuffer(2048);
		const bufferC = new ArrayBuffer(4096);

		const slabA = internal.getPoolSlabIndex(bufferA.byteLength);
		const slabB = internal.getPoolSlabIndex(bufferB.byteLength);
		const slabC = internal.getPoolSlabIndex(bufferC.byteLength);

		const statusA = nexus.free(bufferA);
		await new Promise<void>((resolve) => {
			statusA.onDetach = resolve;
		});

		const statusB = nexus.free(bufferB);
		const statusC = nexus.free(bufferC);
		expect(internal.cleanRequestQueue.size).toBe(2);
		expect(statusA.endpoint).toBe("pool");
		expect(statusB.endpoint).toBe("pool");
		expect(statusC.endpoint).toBe("pool");
		expect(statusA.state).toBe("cleaning");
		expect(statusB.state).toBe("queued");
		expect(statusC.state).toBe("queued");
		expect(bufferA.byteLength).toBe(0);
		if(typeof ArrayBuffer.prototype.transfer === "function")
		{
			expect(bufferB.byteLength).toBe(0);
			expect(bufferC.byteLength).toBe(0);
		}
		else
		{
			expect(bufferB.byteLength).toBe(2048);
			expect(bufferC.byteLength).toBe(4096);
		}
		expect(spies.onCleaned).toHaveBeenCalledTimes(0);

		await new Promise<void>((resolve) => {
			statusA.onSettled = resolve;
		});

		expect(internal.pool[slabA].size).toBe(1);
		expect(internal.pool[slabB]?.size).not.toBe(1);
		expect(internal.pool[slabC]?.size).not.toBe(1);
		expect(statusA.state).toBe("done");
		expect(statusB.state).toBe("cleaning");
		expect(statusC.state).toBe("cleaning");
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);
		expect(bufferC.byteLength).toBe(0);
		expect(spies.onCleaned).toHaveBeenCalledTimes(1);

		const promiseB = new Promise<void>((resolve) => {
			statusB.onSettled = resolve;
		});

		const promiseC = new Promise<void>((resolve) => {
			statusC.onSettled = resolve;
		})

		//promiseB, promiseC どちらが先に Promise を解決したタイミングでも、両方プールに入り終わってるはず
		await Promise.race([promiseB, promiseC]);

		expect(internal.pool[slabA].size).toBe(1);
		expect(internal.pool[slabB].size).toBe(1);
		expect(internal.pool[slabC].size).toBe(1);
		expect(statusA.state).toBe("done");
		expect(statusB.state).toBe("done");
		expect(statusC.state).toBe("done");
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);
		expect(bufferC.byteLength).toBe(0);

		const [returnA] = internal.pool[slabA].values();
		const [returnB] = internal.pool[slabB].values();
		const [returnC] = internal.pool[slabC].values();
		expect(returnA.byteLength).toBe(1024);
		expect(returnB.byteLength).toBe(2048);
		expect(returnC.byteLength).toBe(4096);
		expect(spies.onCleaned).toHaveBeenCalledTimes(2);
	});

	it("1024個のArrayBufferが同時にfree()されても1回のpostMessageで処理し切れるか", async()=> {
		const {nexus, spies} = await getNexus({useSpy:true});
		const detachPromises = [];
		const poolPromises = [];
		for(let i = 0; i < 1024; i++)
		{
			const buffer = new ArrayBuffer(i+1024);
			const status = nexus.free(buffer);
			detachPromises.push(new Promise<void>((resolve) => {
				status.onDetach = resolve;
			}));
			poolPromises.push(new Promise<void>(resolve=>{
				status.onSettled = resolve;
			}));
		}

		await Promise.all(detachPromises);
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(1);
		await Promise.all(poolPromises);
		expect(spies.onCleaned).toHaveBeenCalledTimes(1);
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(1);
		expect(internal.pool[0].size).not.toBe(0);
		expect(internal.pool[1].size).not.toBe(0);
		expect(internal.pool[2].size).not.toBe(0);
		expect(internal.pool[3].size).not.toBe(0);
		// expect(internal.pool[4].size).not.toBe(0);
		const [firstReturn] = internal.pool[0].values();
		expect(firstReturn.byteLength).toBe(1024); //free() 順にプールに入るのかも
	});

	it("onPool() の同期タイミングで free() に ArrayBuffer が渡されてもきちんとクリーナーに ArrayBuffer が渡される", async()=> {
		const {nexus, spies} = await getNexus({useSpy:true});

		const bufferA = new ArrayBuffer(1024);
		const bufferB = new ArrayBuffer(2048);

		const statusA = nexus.free(bufferA);
		let statusB: CleaningStatus;
		await new Promise<void>(resolve => {
			statusA.onDetach = resolve;
		});
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(1);
		expect(spies.onCleaned).toHaveBeenCalledTimes(0);
		await new Promise<void>((resolve) => {
			statusA.onSettled = ()=> {
				statusB = nexus.free(bufferB);
				resolve();
			}
		});
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(2);
		expect(spies.onCleaned).toHaveBeenCalledTimes(1);
		if(statusB.state === "queued") {
			await new Promise<void>((resolve) => {
				statusB.onDetach = resolve;
			});
		}
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(2);
		expect(spies.onCleaned).toHaveBeenCalledTimes(1);
		await new Promise<void>((resolve) => {
			statusB.onSettled = resolve;
		});
		expect(spies.onCleaned).toHaveBeenCalledTimes(2);
	});
}