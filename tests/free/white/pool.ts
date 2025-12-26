import {expect, it, Mock, vi} from "vitest";
import {getNexus, internal} from "../../main.test";

export const test = ()=>
{

	it("returnToPoolがtrueになる条件の場合、cleanerにreturnToPool: trueでメッセージが送られる", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});

		// 条件: maxByteLength < maxArrayBufferSize && this.totalExternalMemory < gcPolicyThreshold;
		const buffer = new ArrayBuffer(1024);
		// 条件を満たすように設定 (100 < 1000 は true, 0 < 2000 は true)
		internal.setMaxArrayBufferSize(1100n);
		internal.setGcPolicyThreshold(BigInt(2000));
		internal.setMainExternalMemory(BigInt(0));

		await new Promise<void>((resolve) => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(spies.cleaner.postMessage).toHaveBeenCalledWith(
			{
				command: "clean",
				requests: expect.arrayContaining([
					expect.objectContaining({ buffer, returnToPool: true, id: expect.any(String) })
				])
			},
			[buffer]
		);
	});

	it("maxByteLength >= maxArrayBufferSizeの場合、returnToPoolがfalseになる", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});

		// テスト環境の ArrayBuffer.prototype.resize の有無に依存しないように、一時的にモック
		const originalResize = ArrayBuffer.prototype.resize;
		const originalResizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable');

		Object.defineProperty(ArrayBuffer.prototype, 'resize', {
			value: function(newByteLength: number) { /* no-op for mock */ },
			configurable: true,
			writable: true
		});
		Object.defineProperty(ArrayBuffer.prototype, 'resizable', {
			get: function() { return true; },
			configurable: true
		});

		const buffer = new ArrayBuffer(1024, {maxByteLength: 2048});
		// maxByteLength >= maxArrayBufferSize となるように設定
		internal.setMaxArrayBufferSize(BigInt(buffer.maxByteLength - 100)); // internal.maxArrayBufferSize は 1948
		// buffer.maxByteLength (2048) は internal.maxArrayBufferSize (1948) より大きいので、
		// (buffer.maxByteLength < internal.maxArrayBufferSize) は false になる
		internal.setGcPolicyThreshold(BigInt(internal.DEFAULT_GC_POLICY_THRESHOLD));

		await new Promise<void>(resolve => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(spies.cleaner.postMessage).toHaveBeenCalledWith(
			{
				command: "clean",
				requests: expect.arrayContaining([
					expect.objectContaining({ buffer, returnToPool: false, id: expect.any(String) })
				])
			},
			[buffer]
		);

		// 元の状態に戻す
		if (originalResize) {
			ArrayBuffer.prototype.resize = originalResize;
		} else {
			delete (ArrayBuffer.prototype as any).resize;
		}
		if (originalResizable) {
			Object.defineProperty(ArrayBuffer.prototype, 'resizable', originalResizable);
		} else {
			delete (ArrayBuffer.prototype as any).resizable;
		}
	});

	it("totalExternalMemory >= gcPolicyThresholdの場合、returnToPoolがfalseになる", async () => {
		const {nexus, spies} = await getNexus({useSpy:true});
		const buffer = new ArrayBuffer(1024);
		internal.setMaxArrayBufferSize(1100n); // maxByteLength < maxArrayBufferSize は true
		// totalExternalMemory >= gcPolicyThreshold となるように設定
		internal.setGcPolicyThreshold(BigInt(50)); // gcPolicyThreshold を小さく設定
		internal.setMainExternalMemory(BigInt(100)); // totalExternalMemory を大きく設定

		await new Promise<void>(resolve => {
			nexus.free(buffer).onDetach = resolve;
		});

		expect(spies.cleaner.postMessage).toHaveBeenCalledWith(
			{
				command: "clean",
				requests: expect.arrayContaining([
					expect.objectContaining({ buffer, returnToPool: false })
				])
			},
			[buffer]
		);
	});
}