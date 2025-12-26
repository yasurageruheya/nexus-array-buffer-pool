import {vi} from "vitest";
import {internal} from "./main.test";

type Internals = typeof import("../internals.js")
let spies:Partial<{ [K in keyof Internals]: any }>;
let setterSpies:Partial<{ [K in keyof Internals]: any }>;
let getterSpies:Partial<{ [K in keyof Internals]: any }>;

const getDeepMergedDescriptor = (obj:any) =>
{
	let descriptors = {};
	let proto = Object.getPrototypeOf(obj);

	// Object.prototype に辿り着くまで遡る
	while (proto && proto !== Object.prototype) {
		const d = Object.getOwnPropertyDescriptors(proto);
		// 下位クラス（Sub）の定義を優先しつつ、上位クラス（Super）の定義もマージする
		for (const key of Object.keys(d)) {
			if (!descriptors[key]) {
				descriptors[key] = d[key];
			} else {
				// すでにサブクラス側の descriptor がある場合、
				// 親にある get や set が自分になければ、それを補完する
				descriptors[key] = {
					...d[key],           // まず親の定義（getなど）を敷く
					...descriptors[key], // その上から子の定義（setなど）を被せる
					// ただし、子が undefined を持っていると親が消えるので明示的にマージ
					get: descriptors[key].get || d[key].get,
					set: descriptors[key].set || d[key].set
				};
			}
		}
		proto = Object.getPrototypeOf(proto);
	}
	return descriptors;
}

let spied:Set<any> = new Set();

const spyFunc = (target:any, spies:any, getter:any, setter:any)=>
{
	if(target && typeof target === "object")
	{
		const descriptors:{[p: string]: TypedPropertyDescriptor<any>} & {[p: string]: PropertyDescriptor} = getDeepMergedDescriptor(target);

		for(const propertyName in descriptors)
		{
			const desc = descriptors[propertyName];
			if(typeof desc.value === "function") {
				spies[propertyName] = vi.spyOn(target, propertyName);
				continue;
			}

			if(typeof desc.get === "function")
				getter[propertyName] = vi.spyOn(target, propertyName, "get");

			if(typeof desc.set === "function")
				setter[propertyName] = vi.spyOn(target, propertyName, "set");
		}
	}

	for(const key in target) {
		if(spied.has(target[key])) continue;
		spied.add(target[key]);

		if(typeof target[key] === "function" && !target[key]._isMockFunction) {
			switch (key) {
				case "WorkerClass": break;
				default:
					spies[key] = vi.spyOn(target, key);
			}
		}
		else if(target[key] && typeof target[key] === "object") {
			spies[key] = {};
			getter[key] = {};
			setter[key] = {};
			spyFunc(target[key], spies[key], getter[key], setter[key]);
		}
	}
}

spyFunc(internal, spies, getterSpies, setterSpies);
export const spy = (internal:typeof import("../internals"), renew:boolean) => {
	if(renew) {
		spied.clear();
		spies = {};
		getterSpies = {};
		setterSpies = {};
	}
	spyFunc(internal, spies, getterSpies, setterSpies);
	return {spies, getterSpies, setterSpies};
}