import {expect, it} from "vitest";
import {getNexus, internal} from "../main.test";

export const test = ()=>
{
	it("gcPolicyThreshold を超えるタイミングで endpoint が 'gc' になる", async () => {
		const {nexus} = await getNexus({useSpy:false});
		internal.setGcPolicyThreshold(nexus.totalExternalMemory + 3000n);
		expect(nexus.free(new ArrayBuffer(1024)).endpoint).toBe("pool");
		expect(nexus.free(new ArrayBuffer(1024)).endpoint).toBe("pool");
		expect(nexus.free(new ArrayBuffer(1024)).endpoint).toBe("pool");
		expect(nexus.free(new ArrayBuffer(1024)).endpoint).toBe("pool");
		expect(nexus.free(new ArrayBuffer(1024)).endpoint).toBe("gc");
	});

	it("gcPolicyThreshold を超える ArrayBuffer は endpoint が 'gc' になる", async () => {
		const {nexus} = await getNexus({useSpy:false});
		internal.setGcPolicyThreshold(nexus.totalExternalMemory + 3000n);
		expect(nexus.free(new ArrayBuffer(4000)).endpoint).toBe("gc");
	});
}