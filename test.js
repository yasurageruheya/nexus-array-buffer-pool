import {Worker} from "worker_threads"
import os, {totalmem} from "os";
import v8 from "v8";

let stats = v8.getHeapStatistics();
console.log(stats.external_memory);

const arrayBuffer = new ArrayBuffer(1024 * 1024 * 1024);

const test = new Worker("./lib/test-worker.js");
test.on("message", message=>
{
	console.log(message.external_memory);
	console.log(v8.getHeapStatistics().external_memory);
	console.log(8);
});

stats = v8.getHeapStatistics();
console.log(stats.external_memory);

arrayBuffer.slice(0, 1024);

// console.log(os);
console.log(totalmem());