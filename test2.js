import * as internal from './internals.js';
import {cycleCount, setCycleCount} from "./internals.js";

setCycleCount(1000000);

console.log(cycleCount);
console.log(internal.cycleCount);

export default class aaa
{
	constructor(){}

	update()
	{
		setCycleCount(cycleCount + 1);
	}
}