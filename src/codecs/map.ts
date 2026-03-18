import type { ArgCodec } from "../types.js";

export const mapCodec: ArgCodec<Map<unknown, unknown>> = {
	tag: Symbol.for("sr:m"),
	is: (v): v is Map<unknown, unknown> => v instanceof Map,
	encode: (v, recurse) =>
		Array.from(v.entries(), (e) => [recurse(e[0]), recurse(e[1])]),
	decode: (data, recurse) => {
		const entries = data as [unknown, unknown][];
		return new Map(
			entries.map((e) => [recurse(e[0]), recurse(e[1])] as [unknown, unknown]),
		);
	},
	writeBack: (original, mutated) => {
		original.clear();
		for (const [k, v] of mutated) original.set(k, v);
	},
};
