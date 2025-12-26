import * as internal from './internals.js';
import {cycleCount, setCycleCount} from "./internals.js";

import aaa from './test2.js';

console.log(aaa);
console.log(cycleCount);
console.log(internal.cycleCount);

const a = new aaa();
a.update();
console.log(cycleCount);
console.log(internal.cycleCount);