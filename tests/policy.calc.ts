import {expect, it} from "vitest";

import {loadNexusArrayBufferPool,
	LOW_MAX_ARRAY_BUFFER_SIZE,
	setLowMaxPoolClasses,
	DEFAULT_MAX_POOL_CLASSES,
	lowMaxPoolClasses} from "./common";

export const calcTest = ()=>
{
	it("policy の maxPoolClasses の自動計算が働いている", async () => {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxArrayBufferSize = LOW_MAX_ARRAY_BUFFER_SIZE;
		const instance = new NexusArrayBufferPool();
		const readOnlyPolicy = instance.policy;
		setLowMaxPoolClasses(readOnlyPolicy.maxPoolClasses);

		expect(readOnlyPolicy.maxPoolClasses).lessThan(DEFAULT_MAX_POOL_CLASSES);
	});

	it("policy の maxPoolClasses に値が設定されていた場合、自動計算が働かない1", async () => {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxArrayBufferSize = LOW_MAX_ARRAY_BUFFER_SIZE;
		policy.maxPoolClasses = 50;
		const instance = new NexusArrayBufferPool();
		const readOnlyPolicy = instance.policy;

		expect(readOnlyPolicy.maxPoolClasses).not.toBe(lowMaxPoolClasses);
		expect(readOnlyPolicy.maxPoolClasses).toBe(50);
	});

	it("policy の maxPoolClasses に値が設定されていた場合、自動計算が働かない2", async () => {
		const NexusArrayBufferPool = await loadNexusArrayBufferPool();
		const policy = NexusArrayBufferPool.policy;
		policy.maxPoolClasses = 50;
		policy.maxArrayBufferSize = LOW_MAX_ARRAY_BUFFER_SIZE;
		const instance = new NexusArrayBufferPool();
		const readOnlyPolicy = instance.policy;

		expect(readOnlyPolicy.maxPoolClasses).not.toBe(lowMaxPoolClasses);
		expect(readOnlyPolicy.maxPoolClasses).toBe(50);
	});
}