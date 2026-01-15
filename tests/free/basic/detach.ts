import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = ()=> {

	it("await pool.free().detached で正しく待機できる", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const byteLength = 1024;
		const buffer = new ArrayBuffer(byteLength);
		const slabIndex = internal.getSlabIndex(byteLength);
		expect(buffer.byteLength).toBe(byteLength);
		await nexus.free(buffer).detached;
		expect(buffer.byteLength).toBe(0);
		expect(internal.pool[slabIndex]?.size).not.toBe(1);
	});

	it("複数の pool.free().detached を一括で await 出来る", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const byteLengthA = 1024;
		const byteLengthB = 2048;
		const bufferA = new ArrayBuffer(byteLengthA);
		const bufferB = new ArrayBuffer(byteLengthB);
		const slabIndexA = internal.getSlabIndex(byteLengthA);
		const slabIndexB = internal.getSlabIndex(byteLengthB);
		expect(bufferA.byteLength).toBe(byteLengthA);
		expect(bufferB.byteLength).toBe(byteLengthB);
		const detachWait = [nexus.free(bufferA).detached, nexus.free(bufferB).detached];
		await Promise.all(detachWait);
		expect(bufferA.byteLength).toBe(0);
		expect(bufferB.byteLength).toBe(0);
		expect(internal.pool[slabIndexA]?.size).not.toBe(1);
		expect(internal.pool[slabIndexB]?.size).not.toBe(1);
	});

	it("1つの pool.free().detached.then() に複数のコールバック（ユーザー関数）が捧げられても、正常に待機して解決できる(arrayBuffer.transfer() に対応していない場合のみテスト)", async () => {
		if(typeof ArrayBuffer.prototype.transfer === "function") return;
		const {nexus} = await getNexus({useSpy:false});
		const buffer = new ArrayBuffer(1024);
		const status = nexus.free(buffer);

		// 3つの異なる場所で await を開始する
		const results = [];
		const wait = (id:string) => status.detached.then(() => {
			results.push(id);
		});

		const p1 = wait("A");
		const p2 = wait("B");
		const p3 = wait("C");

		// この時点では、まだ requestClean が（同じマイクロタスクキュー内で）
		// 実行される前か、実行中なので、配列の中身を確認できるはず
		const internalStatus = internal.internalCleaningStatuses.get(status.id);
		expect(internalStatus.onDetaches.length).toBe(3);
		expect(buffer.byteLength).toBe(1024);

		// 全員の終了を待つ
		await Promise.all([p1, p2, p3]);
		expect(buffer.byteLength).toBe(0);
		expect(results).toEqual(["A", "B", "C"]);
		expect(results.length).toBe(3);
	});

	it("1つの pool.free().detached に対して複数の非同期コンテキストで同時に await されても、全てが正常に再開され、全てが同時に解決される", async () => {
		const {nexus} = await getNexus({useSpy:false});
		const buffer = new ArrayBuffer(1024);
		const status = nexus.free(buffer);

		// 実際の await キーワードを使う「待機者」を複数用意する
		const createAwaiter = async (id: string) => {
			await status.detached; // ここで Watcher の then が呼ばれる
			const internalStatus = internal.internalCleaningStatuses.get(status.id);
			return {id, isNull: internalStatus.onDetaches === null}; //どの時点でも onDetaches が null であれば、全て同時に終わっている事になる
		};

		// 3つの awaiter を同時に走らせる
		const p1 = createAwaiter("A");
		const p2 = createAwaiter("B");
		const p3 = createAwaiter("C");

		// await はマイクロタスクキューなので、下記のように onDetaches に resolve は同期実行コードの時点では入らない
		const internalStatus = internal.internalCleaningStatuses.get(status.id);
		expect(internalStatus.onDetaches.length).toBe(0);

		const results = await Promise.all([p1, p2, p3]);

		expect(results).toEqual([{id:"A", isNull: true}, {id:"B", isNull: true}, {id:"C", isNull: true}]);
		expect(buffer.byteLength).toBe(0);
	});
}