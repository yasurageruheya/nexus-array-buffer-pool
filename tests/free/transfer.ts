import {ResponseClean, ResponseCleanDetail} from "../../index";
import {expect, it, vi} from "vitest";
import {getNexus, internal} from "../main.test";

export const test = ()=>
{
	it("maxArrayBufferSize 以下の場合クリーナーに所有権が移譲され、所有権が戻ってきた時はメインスレッドの中でも NABP のみが所有権を持つ状態になる", async () => {
		const {nexus} = await getNexus({useSpy:false});
		const buffer = new ArrayBuffer(1024);
		expect(buffer.byteLength).toBe(1024);
		await internal.cleanerReady;
		const promise:Promise<void> = new Promise((resolve) => {
			internal.cleaner.on("message", (message:ResponseClean)=>
			{
				const response:ResponseCleanDetail = message.response[0];
				const returnBuffer = response.buffer;
				expect(buffer.byteLength).toBe(0);
				expect(returnBuffer.byteLength).toBe(1024);
				resolve();
			});
		});

		const slabIndex = internal.getSlabIndex(1024);
		expect(internal.pool[slabIndex]).toBe(undefined);
		await new Promise<void>((resolve) => {
			nexus.free(buffer).onDetach = resolve;
		});
		expect(buffer.byteLength).toBe(0);
		await promise;
		expect(buffer.byteLength).toBe(0);
		expect(internal.pool[slabIndex].size).toBe(1);
	});

	it("maxArrayBufferSize - 1 の容量の ArrayBuffer の場合クリーナーに所有権が移譲され、所有権が戻ってきた時はメインスレッドの中でも NABP のみが所有権を持つ状態になる", async () => {
		const {nexus} = await getNexus({useSpy:false});
		internal.setMaxArrayBufferSize(2048n);
		const arrayBufferSize = Number(internal.maxArrayBufferSize) - 1;
		const buffer = new ArrayBuffer(arrayBufferSize);
		expect(buffer.byteLength).toBe(arrayBufferSize);
		await internal.cleanerReady;
		const promise:Promise<void> = new Promise((resolve) => {
			internal.cleaner.on("message", (message:ResponseClean)=>
			{
				const response:ResponseCleanDetail = message.response[0];
				const returnBuffer = response.buffer;
				expect(buffer.byteLength).toBe(0);
				expect(returnBuffer.byteLength).toBe(arrayBufferSize);
				resolve();
			});
		});

		const slabIndex = internal.getPoolSlabIndex(arrayBufferSize);
		expect(internal.pool[slabIndex]).toBe(undefined);
		await new Promise<void>((resolve) => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(buffer.byteLength).toBe(0);
		await promise;
		expect(buffer.byteLength).toBe(0);
		expect(internal.pool[slabIndex].size).toBe(1);
	});

	it("maxArrayBufferSize と同じ容量の ArrayBuffer の場合クリーナーに所有権が移譲されるがメインスレッドに所有権が戻ってこない（強制的に GC 対象になる）", async () => {
		const {nexus} = await getNexus({useSpy:false});
		internal.setMaxArrayBufferSize(2048n);
		const arrayBufferSize = Number(internal.maxArrayBufferSize);
		const buffer = new ArrayBuffer(arrayBufferSize);
		expect(buffer.byteLength).toBe(arrayBufferSize);
		await internal.cleanerReady;
		const promise:Promise<void> = new Promise((resolve) => {
			internal.cleaner.on("message", (message:ResponseClean)=>
			{
				expect(message.response.length).toBe(0);
				resolve();
			});
		});

		const slabIndex = internal.getSlabIndex(arrayBufferSize);
		expect(internal.pool[slabIndex]).toBe(undefined);
		await new Promise<void>((resolve) => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(buffer.byteLength).toBe(0);
		await promise;
		expect(buffer.byteLength).toBe(0);
		expect(internal.pool[slabIndex]?.size).toBe(undefined);
	});

	it("異なる容量のArrayBufferを連続freeした場合でも、それぞれ正しくプールに戻る", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});

		const bufferA = new ArrayBuffer(2048);
		const bufferB = new ArrayBuffer(1024);
		const sizeA = 2048;
		const sizeB = 1024;

		// スラブインデックスを取得 (NABPがスラブ単位で管理していることを利用)
		const slabIndexA = internal.getPoolSlabIndex(sizeA);
		const slabIndexB = internal.getPoolSlabIndex(sizeB);

		// 復帰を待機するための Promise カウンター
		let resolvedCount = 0;
		await internal.cleanerReady;
		const completionPromise = new Promise<void>((resolve) => {
			internal.cleaner.on("message", (message:ResponseClean) => {
				// Worker からの返信には複数の response が含まれる可能性がある
				message.response.forEach((response: ResponseCleanDetail) => {
					const returnBuffer = response.buffer;
					if (returnBuffer.byteLength === sizeA || returnBuffer.byteLength === sizeB) {
						resolvedCount++;
					}
				});
				if (resolvedCount === 2) {
					resolve();
				}
			});
		});

		// 初期状態チェック
		expect(internal.pool[slabIndexA]?.size).toBeFalsy();
		expect(internal.pool[slabIndexB]?.size).toBeFalsy();

		// 連続で free を実行
		const statusA = nexus.free(bufferA);
		nexus.free(bufferB);

		await new Promise<void>((resolve) => {
			statusA.onDetach = resolve;
		});

		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(1);

		// 往路のチェック（両方デタッチされたか）
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);

		await completionPromise;

		// 復路のチェック（それぞれのスラブに 1 つずつ戻ったか）
		expect(internal.pool[slabIndexA].size).toBe(1);
		expect(internal.pool[slabIndexB].size).toBe(1);
	});

	it("連続freeされた複数のバッファのonDetachコールバックが全て実行される", async () => {
		const {nexus} = await getNexus({useSpy:false});
		const bufferA = new ArrayBuffer(1024);
		const bufferB = new ArrayBuffer(2048);

		// 両方のデタッチを待機する Promise
		const detachPromiseA = new Promise<void>((resolve) => {
			nexus.free(bufferA).onDetach = resolve;
		});
		const detachPromiseB = new Promise<void>((resolve) => {
			nexus.free(bufferB).onDetach = resolve;
		});

		await Promise.all([detachPromiseA, detachPromiseB]);

		// 両方ともデタッチされていることを確認
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);
		// (オプション) postMessage が 1 回だけ呼ばれたことを確認 (既存テストと重複するため注意)
	});

	it("サイズ0 の ArrayBuffer は無視されクリーニングすらされない", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});
		const buffer0 = new ArrayBuffer(0);
		const slabIndex = internal.getSlabIndex(0);

		const status = nexus.free(buffer0);
		expect(status.endpoint).toBe("void");
		await status.detached;

		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(0);

		await status.detached.done;
		expect(internal.pool[slabIndex]?.size).not.toBe(1);
	});
}