import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = () => {
	it("アロケーターが作った物を free() 出来る", async () => {
		const byteLength = 1024;
		const {nexus} = await getNexus({useSpy:false});

		const buffer = await nexus.acquire(byteLength);

		expect(buffer.byteLength).toBe(byteLength);
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(internal.pool[slabIndex]?.size).toBeFalsy();
		await nexus.free(buffer).detached.done;
		expect(internal.pool[slabIndex].size).toBe(1);
	});

	it("maxByteLength を指定せずアロケーターに作ってもらった物を free() した時、byteLength と同一スラブ内にプールされる", async () => {
		const byteLength = 1980;
		const {nexus} = await getNexus({useSpy:false});

		const buffer = await nexus.acquire(byteLength);

		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer.byteLength).not.toBe(buffer.maxByteLength);
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(slabIndex).toBe(internal.getSlabIndex(buffer.maxByteLength));
		expect(internal.pool[slabIndex]?.size).toBeFalsy();
		await nexus.free(buffer).detached.done;
		expect(internal.pool[slabIndex].size).toBe(1);
	});

	it("byteLength と maxByteLength が同一スラブでは無い物を指定してアロケーターに作ってもらって、それを free() した時、maxByteLength のスラブにプールされる", async () => {
		const byteLength = 1980;
		const maxByteLength = byteLength * 10;
		const {nexus} = await getNexus({useSpy:false});

		const slabIndexFromByteLength = internal.getSlabIndex(byteLength);
		const slabIndexFromMaxByteLength = internal.getSlabIndex(maxByteLength);
		expect(slabIndexFromByteLength).not.toBe(slabIndexFromMaxByteLength)

		const buffer = await nexus.acquire(byteLength, ArrayBuffer, maxByteLength);

		expect(buffer.byteLength).toBe(byteLength);
		expect(buffer.maxByteLength).toBe(maxByteLength);

		await nexus.free(buffer).detached.done;

		expect(internal.pool[slabIndexFromByteLength]?.size).toBeFalsy();
		const targetPool = internal.pool[slabIndexFromMaxByteLength];
		expect(targetPool.size).toBe(1);
		const pooledBuffer = [...targetPool][0];
		expect(pooledBuffer.byteLength).toBe(maxByteLength);
		expect(pooledBuffer.maxByteLength).toBe(maxByteLength);
	});
}