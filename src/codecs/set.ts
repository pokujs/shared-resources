import type { ArgCodec } from "../types.js";

export const setCodec: ArgCodec<Set<unknown>> = {
	tag: Symbol.for("sr:s"),
	is: (v): v is Set<unknown> => v instanceof Set,
	encode: (v, recurse) => Array.from(v, recurse),
	decode: (data, recurse) => new Set((data as unknown[]).map(recurse)),
	writeBack: (original, mutated) => {
		original.clear();
		for (const v of mutated) original.add(v);
	},
};
