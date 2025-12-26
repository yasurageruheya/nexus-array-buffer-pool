import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export * as policy from "./policy";

export const test = ()=>
{
	if (!internal.isResizableArrayBufferSupported) return;

	it("ResizableArrayBuffer のクリーナー内での膨張予定容量を事前にメインスレッド側で計算し、クリーニング終了時には膨張予定容量をゼロにする", async () => {
		const {nexus} = await getNexus({useSpy:false});
		await Promise.all([internal.cleanerReady, internal.allocatorReady]);

		const totalExternalMemory = nexus.totalExternalMemory;
		const mainExternalMemory = internal.mainExternalMemory;
		expect(internal.reserveExpansionMemory).toBe(0n);
		expect(internal.cleaningMemory).toBe(0n);
		const byteLength = 1024;
		const maxByteLength = 4096;
		const bytesGap = BigInt(maxByteLength - byteLength);
		const status = nexus.free(new ArrayBuffer(byteLength, {maxByteLength}));
		const internalStatus = internal.internalCleaningStatuses.get(status.id);

		expect(status.endpoint).toBe("pool");
		expect(nexus.totalExternalMemory).toBe(totalExternalMemory + BigInt(bytesGap));
		expect(internal.mainExternalMemory).toBe(mainExternalMemory);
		expect(internal.cleaningMemory).toBe(0n);
		expect(internal.reserveExpansionMemory).toBe(bytesGap);
		expect(internalStatus.expansion).toBe(bytesGap);

		await status.detached;

		expect(status.state).toBe("cleaning");
		expect(nexus.totalExternalMemory).toBe(totalExternalMemory + bytesGap + BigInt(byteLength));
		expect(internal.mainExternalMemory).toBe(mainExternalMemory);
		expect(internal.cleaningMemory).toBe(BigInt(byteLength));
		expect(internal.reserveExpansionMemory).toBe(bytesGap);
		expect(internalStatus.expansion).toBe(bytesGap);

		await status.detached.done;

		expect(status.state).toBe("done");
		expect(nexus.totalExternalMemory).toBe(totalExternalMemory + BigInt(byteLength) + bytesGap);
		expect(internal.mainExternalMemory).toBe(mainExternalMemory + bytesGap + BigInt(byteLength));
		expect(internal.reserveExpansionMemory).toBe(0n);
		expect(internal.cleaningMemory).toBe(0n);
		expect(internalStatus.expansion).toBe(bytesGap);
	});

	it("ResizableArrayBuffer と ArrayBuffer が混在しても正しく容量は計算される", async () => {
		const {nexus} = await getNexus({useSpy:false});
		await Promise.all([internal.cleanerReady, internal.allocatorReady]);

		const totalExternalMemory = nexus.totalExternalMemory;
		const mainExternalMemory = internal.mainExternalMemory;
		expect(internal.reserveExpansionMemory).toBe(0n);
		expect(internal.cleaningMemory).toBe(0n);
		const byteLength = 1024;
		const allByteLength = byteLength * 3;
		const maxByteLength = 4096;
		const bytesGap = BigInt(maxByteLength - byteLength);
		const statusA = nexus.free(new ArrayBuffer(byteLength));
		const statusB = nexus.free(new ArrayBuffer(byteLength, {maxByteLength}));
		const statusC = nexus.free(new ArrayBuffer(byteLength));
		const internalStatusA = internal.internalCleaningStatuses.get(statusA.id);
		const internalStatusB = internal.internalCleaningStatuses.get(statusB.id);
		const internalStatusC = internal.internalCleaningStatuses.get(statusC.id);

		expect(statusA.endpoint).toBe("pool");
		expect(statusB.endpoint).toBe("pool");
		expect(statusC.endpoint).toBe("pool");
		expect(nexus.totalExternalMemory).toBe(totalExternalMemory + BigInt(bytesGap));
		expect(internal.mainExternalMemory).toBe(mainExternalMemory);
		expect(internal.cleaningMemory).toBe(0n);
		expect(internal.reserveExpansionMemory).toBe(bytesGap);
		expect(internalStatusA.expansion).toBe(0n);
		expect(internalStatusB.expansion).toBe(bytesGap);
		expect(internalStatusC.expansion).toBe(0n);

		await statusB.detached;

		expect(statusB.state).toBe("cleaning");
		expect(nexus.totalExternalMemory).toBe(totalExternalMemory + bytesGap + BigInt(allByteLength));
		expect(internal.mainExternalMemory).toBe(mainExternalMemory);
		expect(internal.cleaningMemory).toBe(BigInt(allByteLength));
		expect(internal.reserveExpansionMemory).toBe(bytesGap);
		expect(internalStatusA.expansion).toBe(0n);
		expect(internalStatusB.expansion).toBe(bytesGap);
		expect(internalStatusC.expansion).toBe(0n);

		await statusB.detached.done;

		expect(statusB.state).toBe("done");
		expect(nexus.totalExternalMemory).toBe(totalExternalMemory + BigInt(allByteLength) + bytesGap);
		expect(internal.mainExternalMemory).toBe(mainExternalMemory + bytesGap + BigInt(allByteLength));
		expect(internal.reserveExpansionMemory).toBe(0n);
		expect(internal.cleaningMemory).toBe(0n);
		expect(internalStatusA.expansion).toBe(0n);
		expect(internalStatusB.expansion).toBe(bytesGap);
		expect(internalStatusC.expansion).toBe(0n);
	});

	it("maxByteLength と byteLength が別スラブになる場合、maxByteLength のスラブにプールされる", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const byteLength = 2000;
		const maxByteLength = byteLength * 3;
		await nexus.free(new ArrayBuffer(byteLength, {maxByteLength})).detached.done;

		const slabIndexFromByteLength = internal.getSlabIndex(byteLength);
		const slabIndexFromMaxByteLength = internal.getSlabIndex(maxByteLength);

		expect(slabIndexFromByteLength).not.toBe(slabIndexFromMaxByteLength);

		expect(internal.pool[slabIndexFromByteLength]?.size).toBeFalsy();
		const targetPool = internal.pool[slabIndexFromMaxByteLength];
		expect(targetPool.size).toBe(1);
		const pooledBuffer = [...targetPool][0];
		expect(pooledBuffer.byteLength).toBe(maxByteLength); // acquire() で要求された時コストの低い縮小リサイズで即対応出来るように、最大サイズまで拡張されている事を確認
		expect(pooledBuffer.maxByteLength).toBe(maxByteLength);
	});
}