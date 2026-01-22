import {expect, it, vi} from "vitest";
import {NexusArrayBufferPool} from "../index.js";

import {getNexus, internal} from "./main.test";

import {loadNexusArrayBufferPool} from "./common";

export function basicTest()
{
	it("コンストラクタが例外なく通る", async ()=>
	{
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		expect(() => new NexusArrayBufferPool()).not.toThrow();
	});
}

export const isolationTest = ()=>
{
	let NexusArrayBufferPoolClass:typeof NexusArrayBufferPool;

	it("モジュールをロードし、コンストラクタが定義されていること", async () => {
		vi.resetModules();
		NexusArrayBufferPoolClass = await loadNexusArrayBufferPool();
		// モジュールが正しくロードされたことを確認
		expect(typeof NexusArrayBufferPoolClass).toBe("function");
	});

	// --- 最初のインスタンス化 (成功を期待) ---
	it("1回目のインスタンス化は成功し、エラーを投げない", () => {
		// ロードされていることを確認
		expect(NexusArrayBufferPoolClass).toBeDefined();

		// 1回目の new は成功する
		const instance = new NexusArrayBufferPoolClass();

		// インスタンスが正しく作成されたことを確認
		expect(instance).toBeDefined();
		// インスタンスを変数に保持する必要はないが、動作確認のため
	});

	// --- 2回目のインスタンス化 (失敗を期待) ---
	it("2回目のインスタンス化は必ずエラーを投げる", () => {
		// 2回目の new は失敗する
		expect(() => new NexusArrayBufferPoolClass()).toThrow(internal.SINGLETON_ERROR);
	});

	// --- 最後のチェック ---
	it("エラーを投げた後も、3回目のインスタンス化はエラーを投げる", () => {
		// 状態がリセットされていないことを確認するため、再度試す
		expect(() => new NexusArrayBufferPoolClass()).toThrow(internal.SINGLETON_ERROR);
	});

	it("internals.js 内での getter コール回数が正しくカウントされるか", async ()=> {
		const {getterSpies} = await getNexus({useSpy:true});
		internal.singleton.totalExternalMemory;
		expect(getterSpies.singleton.totalExternalMemory).toHaveBeenCalledTimes(1);
	})
}