import {expect, it} from "vitest";
import {loadNexusArrayBufferPool, DEFAULT_MAX_POOL_CLASSES} from "./common";

import {internal} from "./main.test";
import {MAX_POOL_CLASSES_LIMIT, calculateSlabThresholds} from "../internals.js";
import {NABPPolicy} from "../index";


export const errorTest = () => {
	it("インスタンス化後の policy の変更は出来ない", async () => {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const instance = new NexusArrayBufferPool();
		const readOnlyPolicy = instance.policy;

		expect(()=> (readOnlyPolicy as NABPPolicy).minArrayBufferSize = 100).toThrow();
		expect(()=> (readOnlyPolicy as NABPPolicy).slabGrowthFactor = 1.5).toThrow();
		expect(()=> (readOnlyPolicy as NABPPolicy).maxArrayBufferSize = 1000).toThrow();
		expect(()=> (readOnlyPolicy as NABPPolicy).maxPoolClasses = 100).toThrow();
		expect(()=> (readOnlyPolicy as NABPPolicy).gcPolicyThreshold = 100).toThrow();
		expect(()=> (readOnlyPolicy as NABPPolicy).arrayBufferTTL = 100).toThrow();
	});

	it("minArrayBufferSize に 0 を指定した状態でインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.minArrayBufferSize = 0n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MIN_ARRAY_BUFFER_SIZE_TOO_SMALL_ERROR);
	});

	it("minArrayBufferSize に 負の数 を指定した状態でインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.minArrayBufferSize = -1n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MIN_ARRAY_BUFFER_SIZE_TOO_SMALL_ERROR);
	});

	it("minArrayBufferSize に maxArrayBufferSize より大きい値を指定した状態でインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.minArrayBufferSize = internal.DEFAULT_MAX_ARRAY_BUFFER_SIZE + 1n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MAX_ARRAY_BUFFER_SIZE_TOO_SMALL_ERROR);
	});

	it("minArrayBufferSize に maxArrayBufferSize と同じ値を指定した状態でもインスタンス化出来る", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.minArrayBufferSize = internal.DEFAULT_MAX_ARRAY_BUFFER_SIZE;

		expect(()=>new NexusArrayBufferPool()).not.toThrow();
	});

	it("minArrayBufferSize に 1 を指定した状態でもインスタンス化出来る", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.minArrayBufferSize = 1;

		expect(()=>new NexusArrayBufferPool()).not.toThrow();
	});

	it("slabGrowthFactor に 0 を指定した状態でインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.slabGrowthFactor = 0;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.SLAB_GROWTH_FACTOR_TOO_SMALL_ERROR);
	});

	it("slabGrowthFactor に 負の数 を指定した状態でインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.slabGrowthFactor = -1;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.SLAB_GROWTH_FACTOR_TOO_SMALL_ERROR);
	});

	it("maxArrayBufferSize に minArrayBufferSize より小さい値を指定した状態だとインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxArrayBufferSize = internal.DEFAULT_MIN_ARRAY_BUFFER_SIZE - 1n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MAX_ARRAY_BUFFER_SIZE_TOO_SMALL_ERROR);
	});

	it("maxArrayBufferSize に minArrayBufferSize と同じ値を指定してもインスタンス化出来る", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxArrayBufferSize = internal.DEFAULT_MIN_ARRAY_BUFFER_SIZE;

		expect(()=>new NexusArrayBufferPool()).not.toThrow();
	});

	it("maxArrayBufferSize に MAX_ARRAY_BUFFER_SIZE_LIMIT と同じ値を指定してもインスタンス化出来る", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxArrayBufferSize = internal.MAX_ARRAY_BUFFER_SIZE_LIMIT;

		expect(()=>new NexusArrayBufferPool()).not.toThrow();
	});

	it("maxArrayBufferSize に MAX_ARRAY_BUFFER_SIZE_LIMIT より大きい値を指定した状態だとインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxArrayBufferSize = internal.MAX_ARRAY_BUFFER_SIZE_LIMIT + 1n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MAX_ARRAY_BUFFER_SIZE_TOO_LARGE_ERROR);
	});

	it("maxPoolClasses に 0 を指定した状態でインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxPoolClasses = 0;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MAX_POOL_CLASSES_TOO_SMALL_ERROR);
	});

	it("maxPoolClasses に 負の数 を指定した状態でインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxPoolClasses = -1;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MAX_POOL_CLASSES_TOO_SMALL_ERROR);
	});

	it("maxPoolClasses に MAX_POOL_CLASSES_LIMIT を指定した状態でもインスタンス化出来る", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxPoolClasses = DEFAULT_MAX_POOL_CLASSES;

		expect(()=>new NexusArrayBufferPool()).not.toThrow();
	});

	it("maxPoolClasses に MAX_POOL_CLASSES_LIMIT より大きい値を指定した状態だとインスタンス化出来ない1", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxPoolClasses = DEFAULT_MAX_POOL_CLASSES + 1;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MAX_POOL_CLASSES_TOO_LARGE_ERROR);
	});

	it("maxPoolClasses に MAX_POOL_CLASSES_LIMIT より大きい値を指定した状態だとインスタンス化出来ない2", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxArrayBufferSize = internal.DEFAULT_MIN_ARRAY_BUFFER_SIZE * 2n;
		// calculateMaxPoolClasses();
		calculateSlabThresholds();
		policy.maxPoolClasses = MAX_POOL_CLASSES_LIMIT + 1;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.MAX_POOL_CLASSES_TOO_LARGE_ERROR);
	});

	it("gcPolicyThreshold に 0 を指定した状態だとインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.gcPolicyThreshold = 0n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.GC_POLICY_THRESHOLD_TOO_SMALL_ERROR);
	});

	it("gcPolicyThreshold に 負の数 を指定した状態だとインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.gcPolicyThreshold = -1n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.GC_POLICY_THRESHOLD_TOO_SMALL_ERROR);
	});

	it("gcPolicyThreshold に GC_POLICY_THRESHOLD_LIMIT を指定した状態でもインスタンス化出来る", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.gcPolicyThreshold = internal.GC_POLICY_THRESHOLD_LIMIT;

		expect(()=>new NexusArrayBufferPool()).not.toThrow();
	});

	it("gcPolicyThreshold に GC_POLICY_THRESHOLD_LIMIT より大きい値を指定した状態だとインスタンス化出来ない", async()=> {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.gcPolicyThreshold = internal.GC_POLICY_THRESHOLD_LIMIT + 1n;

		expect(()=>new NexusArrayBufferPool()).toThrow(internal.GC_POLICY_THRESHOLD_TOO_LARGE_ERROR);
	});
}