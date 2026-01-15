import {expect, it} from "vitest";
import {getNexus, internal} from "../main.test";

export const test = ()=> {
	it("デフォルトポリシーでは 1000 バイトArrayBuffer はプールされない", async()=> {
		const {nexus} = await getNexus({useSpy:false});

		expect(internal.pool[0]?.size).toBeFalsy();
		await nexus.free(new ArrayBuffer(1000)).detached.done;
		expect(internal.pool[0]?.size).toBeFalsy();
	});
	it("デフォルトポリシーでは 1100 バイトArrayBuffer はスラブ0にプールされる", async()=> {
		const {nexus} = await getNexus({useSpy:false});

		expect(internal.pool[0]?.size).toBeFalsy();
		await nexus.free(new ArrayBuffer(1100)).detached.done;
		expect(internal.pool[0].size).toBe(1);
	});
	it("デフォルトポリシーでは 1200 バイトArrayBuffer はスラブ0にプールされる", async()=> {
		const {nexus} = await getNexus({useSpy:false});

		expect(internal.pool[0]?.size).toBeFalsy();
		await nexus.free(new ArrayBuffer(1200)).detached.done;
		expect(internal.pool[0].size).toBe(1);
	});
	it("デフォルトポリシーでは 1300 バイトArrayBuffer はスラブ1にプールされる", async()=> {
		const {nexus} = await getNexus({useSpy:false});

		expect(internal.pool[1]?.size).toBeFalsy();
		await nexus.free(new ArrayBuffer(1300)).detached.done;
		expect(internal.pool[0]?.size).toBeFalsy();
		expect(internal.pool[1].size).toBe(1);
	});
	it("デフォルトポリシーでは 1279 バイトArrayBuffer はスラブ0にプールされる", async()=> {
		const {nexus} = await getNexus({useSpy:false});

		expect(internal.pool[0]?.size).toBeFalsy();
		await nexus.free(new ArrayBuffer(1279)).detached.done;
		expect(internal.pool[0]?.size).toBe(1);
	});
	it("デフォルトポリシーでは 1280 バイトArrayBuffer はスラブ1にプールされる", async()=> {
		const {nexus} = await getNexus({useSpy:false});
		expect(internal.pool[1]?.size).toBeFalsy();
		await nexus.free(new ArrayBuffer(1280)).detached.done;
		expect(internal.pool[1]?.size).toBe(1);
	});
}