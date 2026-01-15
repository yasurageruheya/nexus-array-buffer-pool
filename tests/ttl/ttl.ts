import {getNexus, internal} from "../main.test";
import {expect, it, vi} from "vitest";
import {arrayBufferTTL, cleanRequestQueue} from "../../internals";

export const test = ()=>
{
	it("TTL が経過したバッファのみが掃除されるか", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});
		vi.useFakeTimers();

		await internal.cleanerReady;

		internal.setArrayBufferTTL(100);
		const byteLength = 2000;
		const slabIndex = internal.getPoolSlabIndex(byteLength);

		// 1. バッファ A を free (TTL開始)
		await nexus.free(new ArrayBuffer(2000)).detached.done;
		expect(internal.pool[slabIndex].size).toBe(1);
		const cleanedBuffer = internal.pool[slabIndex].values().next().value;
		vi.advanceTimersByTime(40);
		// 3. バッファ B を free (TTL開始)
		await nexus.free(new ArrayBuffer(2000)).detached.done;
		expect(internal.pool[slabIndex].size).toBe(2);
		expect(internal.pool[slabIndex].values().next().value === cleanedBuffer).toBe(true);
		vi.advanceTimersByTime(80);
		// バッファ A だけが消えて、B は残っていることを確認
		expect(internal.pool[slabIndex].size).toBe(1);
		expect(internal.pool[slabIndex].values().next().value === cleanedBuffer).toBe(false);
		expect(spies.onCleaned).toHaveBeenCalledTimes(2);
		expect(spies.ttlCheck).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(30); // 合計 150ms 経過（Bの期限 140ms を超える）
		expect(internal.pool[slabIndex].size).toBe(0); // B も消えたはず
		expect(spies.ttlCheck).toHaveBeenCalledTimes(2); // 2回目の掃除が走ったはず

		vi.useRealTimers();
	});

	it("期限切れ直前に acquire されたバッファが、その後の ttlCheck で誤って消されないか", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});
		vi.useFakeTimers();

		await internal.cleanerReady;

		const ttl = 100;
		internal.setArrayBufferTTL(ttl);
		const byteLength = 2000;
		const slabIndex = internal.getPoolSlabIndex(byteLength);

		// 1. バッファを free してプールに入れる
		await nexus.free(new ArrayBuffer(byteLength)).detached.done;
		expect(internal.pool[slabIndex].size).toBe(1);

		// 2. 期限切れの 1ms 前まで時間を進める
		vi.advanceTimersByTime(ttl - 1);

		expect(internal.ttlArrayBufferSet.size).toBe(1);

		// 3. 期限が切れる直前に acquire してプールから取り出す
		// これにより内部で ttlArrayBufferSet.delete(buffer) が実行されるはず
		const acquiredBuffer = await nexus.acquire(byteLength);
		expect(internal.onAllocate).toHaveBeenCalledTimes(0);

		expect(internal.pool[slabIndex].size).toBe(0); // プールからは消えている
		expect(internal.ttlArrayBufferSet.has(acquiredBuffer)).toBe(false); // TTL管理対象からも外れているはず

		expect(spies.ttlCheck).toHaveBeenCalledTimes(0);
		vi.advanceTimersByTime(1);
		expect(spies.ttlCheck).toHaveBeenCalledTimes(1);

		expect(acquiredBuffer.byteLength).toBe(byteLength);

		// ※ 最初の free() 呼び出しで 1 回呼ばれているはずなので、2 回目がないことをチェック
		expect(spies.singleton.free).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it("arrayBufferTTL が負の数の時、プール内のバッファが消えず、タイマーも起動しないこと", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});
		vi.useFakeTimers();

		await internal.cleanerReady;

		// 1. TTL を負の数（無効）に設定
		internal.setArrayBufferTTL(-1);
		const byteLength = 2000;
		const slabIndex = internal.getPoolSlabIndex(byteLength);

		// 2. バッファを free する
		await nexus.free(new ArrayBuffer(byteLength)).detached.done;

		// 3. 内部状態のチェック
		expect(internal.pool[slabIndex].size).toBe(1);
		expect(internal.ttlArrayBufferSet.size).toBe(0); // 無効ならここには入らない設計のはず
		expect(internal.ttlStatus.size).toBe(0);         // 管理 Map も空のはず

		// 4. 膨大な時間を進めてみる（例：1時間分）
		vi.advanceTimersByTime(1000 * 60 * 60);

		// 5. 最終確認
		expect(internal.pool[slabIndex].size).toBe(1); // 消えていない
		expect(spies.ttlCheck).not.toHaveBeenCalled(); // 掃除関数は一度も実行されていない

		// setTimeout が内部で（TTL目的で）呼ばれていないかの確認
		// 他の用途（requestCleanerSyncV8Externalなど）で呼ばれる可能性があるので
		// ttlCheck へのルートが断たれていることが重要
		expect(internal.ttlTimeoutTicket).toBeUndefined();

		vi.useRealTimers();
	});

	it("1000個アロケートした物を全部free()した後、時間経過で一気に全部消え、GC行きの処理が発動するか", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});
		vi.useFakeTimers();

		const ttl = 1000;
		internal.setArrayBufferTTL(ttl);

		await internal.allocatorReady;
		await internal.cleanerReady;

		const promises = [];
		const arrayBuffers = [];
		const slabIndexes = [];
		for(let i = 0; i < 1000; i++) {
			const byteLength = 1024 + (i * 10);
			slabIndexes[i] = internal.getPoolSlabIndex(byteLength);
			promises[i] = nexus.acquire(byteLength).then(arrayBuffer => {
				arrayBuffers[i] = arrayBuffer;
			});
		}
		await Promise.all(promises);
		const detaches = [];
		const tasks = [];
		for(let i = 0; i < arrayBuffers.length; i++) {
			detaches[i] = nexus.free(arrayBuffers[i]).detached;
			tasks[i] = detaches[i].done;
		}
		expect(internal.ttlArrayBufferSet.size).toBe(0);
		await Promise.all(detaches);
		expect(internal.ttlArrayBufferSet.size).toBe(0);
		await Promise.all(tasks);
		expect(internal.ttlArrayBufferSet.size).toBe(arrayBuffers.length);
		expect(internal.ttlStatus.size).toBe(1);
		for(let i = 0; i < arrayBuffers.length; i++) {
			expect(internal.pool[slabIndexes[i]].size).toBeGreaterThan(0);
		}
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(1);

		expect(internal.isCleaningRequested).toBe(false);
		vi.advanceTimersByTime(ttl+1);
		expect(internal.ttlArrayBufferSet.size).toBe(0);
		for(let i = 0; i < arrayBuffers.length; i++) {
			expect(internal.pool[slabIndexes[i]].size).toBe(0);
		}
		await Promise.resolve();
		// vi.advanceTimersByTime(100); // vi.advanceTimersByTime() では積みあがっているマイクロタスクを進められない？
		expect(spies.requestClean).toHaveBeenCalledTimes(2);
		expect(spies.cleaner.postMessage).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});
}