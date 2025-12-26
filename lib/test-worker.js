import {parentPort} from "worker_threads";

import v8 from "v8";
const stats = v8.getHeapStatistics();

parentPort.postMessage(stats);