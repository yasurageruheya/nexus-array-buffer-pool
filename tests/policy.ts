export * as calc from "./policy.calc";
export * as error from "./policy.error";

import {expect, it} from "vitest";
import {NexusArrayBufferPool} from "../index.js";

import {internal} from "./main.test";

import {loadNexusArrayBufferPool, setDefaultMaxPoolClasses} from "./common";

export const defaultValuesTest = ()=>
{
	it("policy getter から初期設定（デフォルト値）を読み出せる", async () => {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const instance:NexusArrayBufferPool = new NexusArrayBufferPool();
		const readOnlyPolicy = instance.policy;

		setDefaultMaxPoolClasses(readOnlyPolicy.maxPoolClasses);

		expect(readOnlyPolicy.minArrayBufferSize).toBe(internal.DEFAULT_MIN_ARRAY_BUFFER_SIZE);
		expect(readOnlyPolicy.slabGrowthFactor).toBe(internal.DEFAULT_SLAB_GROWTH_FACTOR);
		expect(readOnlyPolicy.maxArrayBufferSize).toBe(internal.DEFAULT_MAX_ARRAY_BUFFER_SIZE);
		expect(readOnlyPolicy.gcPolicyThreshold).toBe(internal.DEFAULT_GC_POLICY_THRESHOLD);
		expect(readOnlyPolicy.arrayBufferTTL).toBe(internal.DEFAULT_ARRAY_BUFFER_TTL);
	});
}

export const effectedValuesTest = ()=>
{
	it("policy が正常に設定出来ている", async () => {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.minArrayBufferSize = 1024n * 10n;
		policy.slabGrowthFactor = 1.5;
		policy.maxArrayBufferSize = 1024n * 100n;
		policy.gcPolicyThreshold = 1024n * 1024n * 1024n;
		policy.maxPoolClasses = 5;
		policy.arrayBufferTTL = 5000;
		const instance = new NexusArrayBufferPool();
		const readOnlyPolicy = instance.policy;

		expect(readOnlyPolicy.minArrayBufferSize).toBe(BigInt(1024 * 10));
		expect(readOnlyPolicy.slabGrowthFactor).toBe(1.5);
		expect(readOnlyPolicy.maxArrayBufferSize).toBe(BigInt(1024 * 100));
		expect(readOnlyPolicy.gcPolicyThreshold).toBe(BigInt(1024 * 1024 * 1024));
		expect(readOnlyPolicy.maxPoolClasses).toBe(5);
		expect(readOnlyPolicy.arrayBufferTTL).toBe(5000);
	});
}