import {beforeEach, describe, expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";
import {NexusArrayBufferPool} from "../../../index";

export * as detach from "./detach.js";
export * as done from "./done.js";

export const test = ()=>
{
	it("待機者が解決されるプロセス中に新しい待機者が追加されても、正しく処理される", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);
		const status = nexus.free(buffer);
		const results = [];

		// 1. 最初に 3 人並ぶ
		const p1 = status.detached.done.then(() => results.push("A"));
		const p2 = status.detached.done.then(() => results.push("B"));
		const p3 = status.detached.done.then(() => {
			results.push("C");
			// ★ここがポイント：C の解決（実行中）に、4 人目を追加する
			// 既に internal.onSettles は null になっているので、
			// 実装上、この D は「次のマイクロタスク」で即座に実行されるはず
			status.detached.done.then(() => results.push("D"));
		});

		// 2. 解決を開始
		await status.detached.done;

		// 3. この時点では D まで終わっているか？
		// status.detached.done (Watcher) の then 実装によりますが、
		// 解決済み状態なら D もこの await の直後には完了しているはずです。

		// マイクロタスクの順序を確実にするため、念のため 1 ティック待機
		await Promise.resolve();

		expect(results).toEqual(["A", "B", "C", "D"]);
		expect(results.length).toBe(4);
	});

	it("解決プロセスの『隙間』で await 開始された場合でも、正しく再開される", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);
		const status = nexus.free(buffer);
		const results = [];

		// 1. この中で「2 人目の awaiter」を起動する
		const p1 = status.detached.done.then(async () => {
			results.push("A");

			// 解決プロセス中に新しい taskB を作成
			// (注: ここで await しないことで、taskB をキューに積んだまま A を終わらせる)
			const taskB = (async () => {
				await status.detached.done; // ここで一時停止
				results.push("B");
			})();
		});

		// 2. 掃除実行
		await p1;
		// taskD の await のマイクロタスクはすぐに終わるはずなので、Promise.resolve() という1ティック待つだけで良いはず
		await Promise.resolve();

		expect(results).toEqual(["A", "B"]);
	});

	it("同じ ArrayBuffer を複数回 free() しても別な CleaningStatus インスタンスが返ってくる", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);

		const statusA = nexus.free(buffer);
		const statusB = nexus.free(buffer);
		expect(statusA).not.toBe(statusB);
	});

	it("クリーニング済みの ArrayBuffer インスタンスをもう一度 free() しても何も起こらないし、解決を待機してもエラーも出ない", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);
		const slabIndex = internal.getSlabIndex(buffer.byteLength);

		await nexus.free(buffer).detached.done;
		expect(internal.pool[slabIndex].size).toBe(1);
		const statusB = nexus.free(buffer);
		expect(statusB.endpoint).toBe("void");
		await statusB.detached.done;
		expect(internal.pool[slabIndex].size).toBe(1);
	});

	it("デタッチ済み／サイズ0 の ArrayBuffer を free() した場合に返ってくる CleaningStatus インスタンスは毎回別のため、コールバックの上書きとかは発生しない", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);
		const slabIndex = internal.getSlabIndex(buffer.byteLength);

		await nexus.free(buffer).detached.done;
		expect(internal.pool[slabIndex].size).toBe(1);

		expect(buffer.byteLength).toBe(0);
		const statusB = nexus.free(buffer);
		const statusC = nexus.free(buffer);
		expect(statusB.endpoint).toBe("void");
		expect(statusC.endpoint).toBe("void");
		expect(statusB).not.toBe(statusC);
		const promises = [];
		//コールバックが上書きされるようだったら、statusB.onSettled が上書きされて、最初の Promise は解決されなくなる？
		promises.push(new Promise<void>(resolve => {
			statusB.onSettled = resolve;
		}))
		promises.push(new Promise<void>(resolve => {
			statusC.onSettled = resolve;
		}))
		await Promise.all(promises);
		expect(internal.pool[slabIndex].size).toBe(1);
	});

	it("同じ ArrayBuffer を複数回 free() すると別な CleaningStatus が返ってくるため、それぞれに別なコールバックを与えてもコールバックの上書きが発生しない", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);

		const statusA = nexus.free(buffer);
		const statusB = nexus.free(buffer);
		expect(statusA).not.toBe(statusB);

		const promises = [];
		promises.push(new Promise<void>(resolve => {
			statusA.onDetach = resolve;
		}));
		promises.push(new Promise<void>(resolve => {
			statusB.onDetach = resolve;
		}));
		await Promise.all(promises);

		promises.length = 0;
		promises.push(new Promise<void>(resolve => {
			statusA.onSettled = resolve;
		}));
		promises.push(new Promise<void>(resolve => {
			statusB.onSettled = resolve;
		}));
		await Promise.all(promises);

		expect(statusA.state).toBe("done");
		expect(statusB.state).toBe("done");
	});

	it("同じ ArrayBuffer を複数回 free() すると別な CleaningStatus が返ってくるが、それぞれ await で正常に待機出来る", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);

		const statusA = nexus.free(buffer);
		const statusB = nexus.free(buffer);
		expect(statusA).not.toBe(statusB);

		await Promise.all([statusA.detached, statusB.detached]);
		expect(statusA.state).toBe("cleaning");
		expect(statusB.state).toBe("cleaning");

		await Promise.all([statusA.detached.done, statusB.detached.done]);

		expect(statusA.state).toBe("done");
		expect(statusB.state).toBe("done");
	});

	it("同じ ArrayBuffer を複数回 free() すると別な CleaningStatus が返ってくるが、それぞれ then でも正常に待機出来る", async () => {
		const {nexus} = await getNexus({useSpy:false});

		const buffer = new ArrayBuffer(1024);

		const statusA = nexus.free(buffer);
		const statusB = nexus.free(buffer);
		expect(statusA).not.toBe(statusB);

		let detachCounter = 0;

		statusA.detached.then(()=>{
			detachCounter++;
		});
		statusB.detached.then(()=>{
			detachCounter++;
		});

		let settleCounter = 0;

		statusA.detached.done.then(()=>{
			settleCounter++;
		});
		statusB.detached.done.then(()=> {
			settleCounter++;
		});

		await Promise.all([statusA.detached.done, statusB.detached.done]);

		expect(statusA.state).toBe("done");
		expect(statusB.state).toBe("done");
		expect(detachCounter).toBe(2);
		expect(settleCounter).toBe(2);
	});
}