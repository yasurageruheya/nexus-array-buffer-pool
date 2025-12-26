import {expect, it} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = ()=>
{

	if(!internal.isResizableArrayBufferSupported) return;

	it("maxByteLength が maxArrayBufferSize と同じ値の ResizableArrayBuffer は endpoint が gc になる", async () => {
		const {nexus} = await getNexus({useSpy:false});
		const byteLength = 1024;
		const maxByteLength = Number(internal.maxArrayBufferSize);
		const statusB = nexus.free(new ArrayBuffer(byteLength, {maxByteLength}));

		expect(statusB.endpoint).toBe("gc");
	});

	it("maxByteLength が maxArrayBufferSize より 1 でも小さければ ResizableArrayBuffer は endpoint が pool になる", async () => {
		const {nexus} = await getNexus({useSpy:false});
		const byteLength = 1024;
		const maxByteLength = Number(internal.maxArrayBufferSize) - 1;
		const statusB = nexus.free(new ArrayBuffer(byteLength, {maxByteLength}));

		expect(statusB.endpoint).toBe("pool");
	});
}