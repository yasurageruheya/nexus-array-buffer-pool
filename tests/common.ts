import {NexusArrayBufferPool} from "../index";

export const loadNexusArrayBufferPool = async ():Promise<typeof NexusArrayBufferPool> => {
	const module = await import("../index.js");
	return (module as any).default ?? module;
};

export let DEFAULT_MAX_POOL_CLASSES:number;

export const setDefaultMaxPoolClasses = (maxPoolClasses: number) => {
	DEFAULT_MAX_POOL_CLASSES = maxPoolClasses;
}

export let LOW_MAX_ARRAY_BUFFER_SIZE:bigint;

export const setLowMaxArrayBufferSize = (maxArrayBufferSize: bigint) => {
	LOW_MAX_ARRAY_BUFFER_SIZE = maxArrayBufferSize;
}

export let lowMaxPoolClasses:number;

export const setLowMaxPoolClasses = (maxPoolClasses: number) => {
	lowMaxPoolClasses = maxPoolClasses;
}