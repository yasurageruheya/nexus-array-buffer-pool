import {expect, it} from "vitest";
import {getNexus, internal} from "../main.test";
import {ResponseClean} from "../../index";


export const test = ()=>
{
	it("free() した後にクリーナーからの Response がエラーだった場合、free().detached.done は reject する事になる", async () => {
		const {nexus} = await getNexus({useSpy:false});

		await internal.cleanerReady;
		internal.cleaner.off("message", internal.onCleaned);
		const mockHandler = (message:ResponseClean) => {
			const response = message.response;
			for(let i = response.length; i--;) {
				if(response[i].id === status.id) {
					const res = response[i];
					res.error = new Error("Simulated Cleaner Error");
					break;
				}
			}
			internal.onCleaned(message);
			internal.cleaner.off("message", mockHandler);
			internal.cleaner.on("message", internal.onCleaned);
		}
		internal.cleaner.on("message", mockHandler);

		const byteLength = 1024;
		const buffer = new ArrayBuffer(byteLength);
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(buffer.byteLength).toBe(byteLength);
		const status = nexus.free(buffer);
		await status.detached;
		expect(status.endpoint).toBe("pool");
		expect(buffer.byteLength).toBe(0);
		let error = true;
		try {
			await status.detached.done;
			error = false;
		} catch (error) {
			expect(status.state).toBe("error");
		}
		expect(internal.pool[slabIndex]?.size).not.toBe(1);
		expect(error).toBe(true);
	});

	it("複数 ArrayBuffer を free() した後に、クリーナーからの Response にエラーが含まれる物があった場合、正常にクリーニング出来た物はプールに入り、エラーが出た物はプールに入らない", async () => {
		const {nexus} = await getNexus({useSpy:false});

		await internal.cleanerReady;
		internal.cleaner.off("message", internal.onCleaned);
		const mockHandler = (message:ResponseClean) => {
			const response = message.response;
			for(let i = response.length; i--;) {
				if(response[i].id === statusB.id) {
					const res = response[i];
					res.error = new Error("Simulated Cleaner Error");
					break;
				}
			}
			internal.onCleaned(message);
			internal.cleaner.off("message", mockHandler);
			internal.cleaner.on("message", internal.onCleaned);
		}
		internal.cleaner.on("message", mockHandler);

		const byteLengthA = 1024;
		const byteLengthB = 2048;
		const byteLengthC = 4096;
		const bufferA = new ArrayBuffer(byteLengthA);
		const bufferB = new ArrayBuffer(byteLengthB);
		const bufferC = new ArrayBuffer(byteLengthC);
		const slabIndexA = internal.getSlabIndex(byteLengthA);
		const slabIndexB = internal.getSlabIndex(byteLengthB);
		const slabIndexC = internal.getSlabIndex(byteLengthC);
		expect(bufferA.byteLength).toBe(byteLengthA);
		expect(bufferB.byteLength).toBe(byteLengthB);
		expect(bufferC.byteLength).toBe(byteLengthC);
		const statusA = nexus.free(bufferA);
		const statusB = nexus.free(bufferB);
		const statusC = nexus.free(bufferC);
		await Promise.all([statusA.detached, statusB.detached, statusC.detached]);
		expect(statusA.endpoint).toBe("pool");
		expect(statusB.endpoint).toBe("pool");
		expect(statusC.endpoint).toBe("pool");
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);
		expect(bufferC.byteLength).toBe(0);
		let error = true;
		try {
			await statusA.detached.done;
			error = false;
		} catch (error) {
			expect(statusA.state).toBe("error");
		}
		expect(internal.pool[slabIndexA]?.size).toBe(1);
		expect(error).toBe(false);

		error = true;
		try {
			await statusB.detached.done;
			error = false;
		} catch (error) {
			expect(statusB.state).toBe("error");
		}
		expect(internal.pool[slabIndexB]?.size).not.toBe(1);
		expect(error).toBe(true);

		error = true;
		try {
			await statusC.detached.done;
			error = false;
		} catch (error) {
			expect(statusC.state).toBe("error");
		}
		expect(internal.pool[slabIndexC]?.size).toBe(1);
		expect(error).toBe(false);
	});

	it("複数 ArrayBuffer を free() した時、プールに返ってくる物、エラーが出る物、容量制限でGC行きになる物が混ざっていても、クリーナーからの Response の内容や CleaningStatus は相応の状態を通知してくれる", async () => {
		const {nexus} = await getNexus({useSpy:false});
		await internal.cleanerReady;
		internal.cleaner.off("message", internal.onCleaned);
		const mockHandler = (message:ResponseClean) => {
			const response = message.response;
			for(let i = response.length; i--;) {
				if(response[i].id === statusB.id) {
					const res = response[i];
					res.error = new Error("Simulated Cleaner Error");
					break;
				}
			}
			internal.onCleaned(message);
			internal.cleaner.off("message", mockHandler);
			internal.cleaner.on("message", internal.onCleaned);
		}
		internal.cleaner.on("message", mockHandler);

		const byteLengthA = 1024;
		const byteLengthB = 2048;
		const byteLengthC = 4096;
		const bufferA = new ArrayBuffer(byteLengthA);
		const bufferB = new ArrayBuffer(byteLengthB);
		const bufferC = new ArrayBuffer(byteLengthC);
		const slabIndexA = internal.getSlabIndex(byteLengthA);
		const slabIndexB = internal.getSlabIndex(byteLengthB);
		const slabIndexC = internal.getSlabIndex(byteLengthC);
		expect(bufferA.byteLength).toBe(byteLengthA);
		expect(bufferB.byteLength).toBe(byteLengthB);
		expect(bufferC.byteLength).toBe(byteLengthC);
		internal.setMaxArrayBufferSize(3000n);
		const statusA = nexus.free(bufferA);
		const statusB = nexus.free(bufferB);
		const statusC = nexus.free(bufferC);
		await Promise.all([statusA.detached, statusB.detached, statusC.detached]);
		expect(statusA.endpoint).toBe("pool");
		expect(statusB.endpoint).toBe("pool");
		expect(statusC.endpoint).toBe("gc");
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);
		expect(bufferC.byteLength).toBe(0);
		expect(statusA.state).toBe("cleaning");
		expect(statusB.state).toBe("cleaning");
		expect(statusC.state).toBe("done");
		let error = true;
		try {
			await statusA.detached.done;
			error = false;
		} catch (error) {
			expect(statusA.state).toBe("error");
		}
		expect(internal.pool[slabIndexA]?.size).toBe(1);
		expect(error).toBe(false);

		error = true;
		try {
			await statusB.detached.done;
			error = false;
		} catch (error) {
			expect(statusB.state).toBe("error");
		}
		expect(internal.pool[slabIndexB]?.size).not.toBe(1);
		expect(error).toBe(true);

		error = true;
		try {
			await statusC.detached.done;
			error = false;
		} catch (error) {
			expect(statusC.state).toBe("error");
		}
		expect(internal.pool[slabIndexC]?.size).not.toBe(1);
		expect(error).toBe(false);
	});
}