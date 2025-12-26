import {beforeEach, describe, vi} from "vitest";

export let internal:typeof import("../internals.js");
import * as common from "./common";

import * as singleton from "./singleton";
import * as policy from "./policy";
import * as free from "./free/free";
import * as acquire from "./acquire/acquire";
import {loadNexusArrayBufferPool} from "./common";
import {spy} from "./spy";
import {NexusArrayBufferPool} from "../index";

(async () => {
	internal = await import("../internals.js");
	common.setLowMaxArrayBufferSize(internal.DEFAULT_MAX_ARRAY_BUFFER_SIZE * 9n / 10n);
})();

export class MockWorker {
	on = vi.fn();
	postMessage = vi.fn();
	terminate = vi.fn();
}

export const getNexus = async(options:{useSpy:boolean}):Promise<{ nexus:NexusArrayBufferPool, spies?:typeof import("../internals"), getterSpies?:typeof import("../internals"), setterSpies?:typeof import("../internals")}> => {
	if(options.useSpy) spy(internal, true);
	const NexusArrayBufferPool = await loadNexusArrayBufferPool();
	const nexus = new NexusArrayBufferPool();
	if(options.useSpy) return {nexus, ...spy(internal, false)};
	else return {nexus};
}

describe("NexusArrayBufferPool のインスタンス化", () => {
	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		internal = await import("../internals.js");
		internal.setWorkerClass(MockWorker);
	});

	singleton.basicTest();

	describe("🎯 NABPool のシングルトン制約の検証 (Isolation Test)", () => {
		singleton.isolationTest();
	});
});

describe("ポリシー設定関連", () => {
	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		internal = await import("../internals.js");
		internal.setWorkerClass(MockWorker);
	});

	policy.defaultValuesTest();
	policy.effectedValuesTest();
	describe("maxPoolClasses 自動計算テスト", ()=> {
		policy.calc.calcTest();
	});

	describe("インスタンス化時のポリシーの各プロパティの例外テスト", ()=> {
		policy.error.errorTest();
	});
});

describe("free 動作テスト", ()=> {
	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		internal = await import("../internals.js");
	});
	describe("実際の Worker を利用した free 動作テスト", ()=>
	{
		describe("free() の内部動作テスト free.white", ()=> {
			describe("基本動作テスト free.white.basic", () => {
				free.white.basic.test();
			});
			describe("returnToPoolの条件テスト free.white.pool", () => {
				free.white.pool.test();
			});
			describe("isCleanerBusyの状態テスト free.white.busy", () => {
				free.white.busy.test();
			});
		});
		describe("基本動作のテスト free.basic", ()=>{
			free.basic.test();
			describe("free() からの CleaningStatus の detach テスト free.basic.detach", ()=>{
				free.basic.detach.test();
			});
			describe("free() からの CleaningStatus の done テスト free.basic.done", ()=>{
				free.basic.done.test();
			});
		});
		describe("所有権の移譲 free.transfer", () => {
			free.transfer.test();
		});
		describe("ビジー状態などの競合 free.compete", () => {
			free.compete.test();
		});
		describe("エラーテスト free.error", ()=>{
			free.error.test();
		});
		describe("ResizableArrayBuffer 対応テスト（ResizableArrayBuffer に対応していない環境ではテストをスキップ）free.resizable", ()=> {
			free.resizable.test();
			describe("ポリシー準拠の動作 free.resizable.policy", ()=>{
				free.resizable.policy.test();
			});
		});
		describe("ポリシー準拠の動作 free.policy", ()=>{
			free.policy.test();
		});
	});
});

describe("acquire 動作テスト acquire", ()=> {
	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		internal = await import("../internals.js");
	});
	describe("基本動作テスト acquire.basic", ()=> {
		describe("新規生成テスト acquire.basic.create", ()=>{
			acquire.basic.create.test();
		});
		describe("プールから持ってくるテスト acquire.basic.reuse", ()=>{
			acquire.basic.reuse.test();
		});
	});
	describe("ResizableArrayBuffer テスト acquire.resizable", ()=> {
		acquire.resizable.test();
		describe("アロケーターが作った物を free() するテスト acquire.resizable.free", ()=>{
			acquire.resizable.free.test()
		});
	});
	describe("プールキャッシュテスト acquire.resizable", ()=> {
		describe("キャッシュヒットテスト acquire.resizable.free", ()=>{
			acquire.cache.hit.test();
		});
	});
})