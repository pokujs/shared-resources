import type { ArgCodec } from "../../src/types.js";
import { assert, test } from "poku";
import { configureCodecs, writeBack } from "../../src/shared-resources.js";

test("writeBack — array push", () => {
	const original: number[] = [];
	writeBack(original, [42]);
	assert.deepStrictEqual(
		original,
		[42],
		"Element should be pushed into the original array",
	);
});

test("writeBack — array truncation", () => {
	const original = [1, 2, 3, 4];
	writeBack(original, [1, 2, 3]);
	assert.deepStrictEqual(
		original,
		[1, 2, 3],
		"Array should be truncated to match mutated length",
	);
});

test("writeBack — array emptied", () => {
	const original = [1, 2, 3];
	writeBack(original, []);
	assert.deepStrictEqual(original, [], "Array should be emptied");
});

test("writeBack — array element update", () => {
	const original = [1, 2, 3];
	writeBack(original, [1, 99, 3]);
	assert.deepStrictEqual(
		original,
		[1, 99, 3],
		"Middle element should be updated in place",
	);
});

test("writeBack — preserves original array reference", () => {
	const original: number[] = [1];
	const ref = original;
	writeBack(original, [1, 2, 3]);
	assert.strictEqual(
		original,
		ref,
		"Original array reference should be preserved",
	);
});

test("writeBack — object property set", () => {
	const original: Record<string, unknown> = {};
	writeBack(original, { key: 42 });
	assert.strictEqual(
		original.key,
		42,
		"Property should be set on the original object",
	);
});

test("writeBack — object property deletion", () => {
	const original: Record<string, unknown> = { toDelete: "x", keep: 1 };
	writeBack(original, { keep: 1 });
	assert.strictEqual(
		"toDelete" in original,
		false,
		"Property should be removed",
	);
	assert.strictEqual(
		original.keep,
		1,
		"Remaining property should still be present",
	);
});

test("writeBack — object property update", () => {
	const original: Record<string, unknown> = { count: 0 };
	writeBack(original, { count: 5 });
	assert.strictEqual(original.count, 5, "Property should be updated");
});

test("writeBack — preserves original object reference", () => {
	const original: Record<string, unknown> = { a: 1 };
	const ref = original;
	writeBack(original, { a: 2, b: 3 });
	assert.strictEqual(
		original,
		ref,
		"Original object reference should be preserved",
	);
});

test("writeBack — deeply nested array push", () => {
	const original = { nested: { arr: [] as number[] } };
	writeBack(original, { nested: { arr: [7] } });
	assert.deepStrictEqual(
		original.nested.arr,
		[7],
		"Nested array should have the pushed value",
	);
});

test("writeBack — deeply nested object property", () => {
	const original = { a: { b: { c: 0 } } };
	writeBack(original, { a: { b: { c: 99 } } });
	assert.strictEqual(original.a.b.c, 99, "Deep property should be updated");
});

test("writeBack — preserves nested object references", () => {
	const inner = { arr: [] as number[] };
	const original = { nested: inner };
	writeBack(original, { nested: { arr: [1, 2] } });
	assert.strictEqual(
		original.nested,
		inner,
		"Nested object reference should be preserved",
	);
	assert.deepStrictEqual(
		original.nested.arr,
		[1, 2],
		"Nested array should be updated in place",
	);
});

test("writeBack — array of objects mutation", () => {
	const original = [{ x: 1 }, { x: 2 }];
	writeBack(original, [{ x: 10 }, { x: 20 }]);
	assert.deepStrictEqual(
		original,
		[{ x: 10 }, { x: 20 }],
		"Each object element should be updated",
	);
});

test("writeBack — preserves references inside array of objects", () => {
	const item0 = { x: 1 };
	const original = [item0, { x: 2 }];
	writeBack(original, [{ x: 99 }, { x: 2 }]);
	assert.strictEqual(
		original[0],
		item0,
		"Object reference inside array should be preserved",
	);
	assert.strictEqual(
		item0.x,
		99,
		"The referenced object should have its property updated",
	);
});

test("writeBack — primitive original is a no-op", () => {
	const original = 42 as unknown;
	assert.doesNotThrow(
		() => writeBack(original, 99),
		"Should not throw for primitive original",
	);
});

test("writeBack — null original is a no-op", () => {
	assert.doesNotThrow(
		() => writeBack(null, { key: 1 }),
		"Should not throw for null original",
	);
});

test("writeBack — mismatched types (array vs object) is a no-op", () => {
	const original: number[] = [1, 2];
	writeBack(original, { key: 1 });
	assert.deepStrictEqual(
		original,
		[1, 2],
		"Mismatched type should leave original unchanged",
	);
});

test("writeBack — Map repopulation", () => {
	const original = new Map<string, number>([
		["a", 1],
		["b", 2],
	]);
	const ref = original;
	writeBack(
		original,
		new Map([
			["b", 99],
			["c", 3],
		]),
	);
	assert.strictEqual(original, ref, "Map reference should be preserved");
	assert.strictEqual(original.has("a"), false, "Removed key should be gone");
	assert.strictEqual(original.get("b"), 99, "Updated key should be updated");
	assert.strictEqual(original.get("c"), 3, "New key should be added");
});

test("writeBack — Set repopulation", () => {
	const original = new Set<number>([1, 2, 3]);
	const ref = original;
	writeBack(original, new Set([2, 3, 4]));
	assert.strictEqual(original, ref, "Set reference should be preserved");
	assert.strictEqual(original.has(1), false, "Removed element should be gone");
	assert.strictEqual(original.has(4), true, "New element should be present");
	assert.strictEqual(original.has(2), true, "Unchanged element should remain");
});

test("writeBack — Date mutation", () => {
	const original = new Date("2026-01-01T00:00:00.000Z");
	const ref = original;
	writeBack(original, new Date("2000-06-15T00:00:00.000Z"));
	assert.strictEqual(original, ref, "Date reference should be preserved");
	assert.strictEqual(original.getFullYear(), 2000, "Year should be updated");
	assert.strictEqual(
		original.getMonth(),
		5,
		"Month should be updated (0-indexed)",
	);
});

test("writeBack — Map nested in object (reference preserved)", () => {
	const innerMap = new Map<string, number>([["x", 1]]);
	const original: Record<string, unknown> = { m: innerMap };
	writeBack(original, {
		m: new Map([
			["x", 1],
			["y", 2],
		]),
	});
	assert.strictEqual(
		original.m,
		innerMap,
		"Inner Map reference should be preserved",
	);
	assert.strictEqual(
		innerMap.get("y"),
		2,
		"Inner Map should be updated with new entry",
	);
});

test("writeBack — Set nested in array (reference preserved)", () => {
	const innerSet = new Set<number>([1, 2]);
	const original: unknown[] = [innerSet, 42];
	writeBack(original, [new Set([1, 2, 3]), 42]);
	assert.strictEqual(
		original[0],
		innerSet,
		"Set reference inside array should be preserved",
	);
	assert.strictEqual(innerSet.has(3), true, "Set should have new element");
});

test("writeBack — Date nested in array (reference preserved)", () => {
	const innerDate = new Date("2026-01-01T00:00:00.000Z");
	const mutationTarget = new Date("2000-01-01T00:00:00.000Z");
	const original: unknown[] = [innerDate, 42];
	writeBack(original, [mutationTarget, 42]);
	assert.strictEqual(
		original[0],
		innerDate,
		"Date reference inside array should be preserved",
	);
	assert.strictEqual(
		(original[0] as Date).getTime(),
		mutationTarget.getTime(),
		"Date time should be updated",
	);
});

test("writeBack — Map is not treated as plain object (mismatched with plain object is no-op)", () => {
	const original = new Map<string, number>([["a", 1]]);
	writeBack(original, { a: 2 });
	assert.strictEqual(
		original.get("a"),
		1,
		"Map should be untouched when mutated is a plain object",
	);
});

test("writeBack — Set is not treated as plain object (mismatched with array is no-op)", () => {
	const original = new Set<number>([1, 2]);
	writeBack(original, [3, 4]);
	assert.strictEqual(
		original.has(1),
		true,
		"Set should be untouched when mutated is an array",
	);
});

test("writeBack — class instance: updates own enumerable data properties", () => {
	class Point {
		x: number;
		y: number;
		constructor(x: number, y: number) {
			this.x = x;
			this.y = y;
		}
	}
	const p = new Point(1, 2);
	writeBack(p, { x: 10, y: 20 });
	assert.strictEqual(p.x, 10, "x should be updated in-place");
	assert.strictEqual(p.y, 20, "y should be updated in-place");
	assert.ok(p instanceof Point, "prototype chain should be preserved");
});

test("writeBack — class instance: adds new own properties from mutated", () => {
	class Box {
		value: number;
		constructor(value: number) {
			this.value = value;
		}
	}
	const b = new Box(5);
	writeBack(b, { value: 99, extra: "added" });
	assert.strictEqual(b.value, 99, "existing property should be updated");
	assert.strictEqual(
		(b as unknown as Record<string, unknown>).extra,
		"added",
		"new property from mutated should be written back",
	);
	assert.ok(b instanceof Box, "prototype chain should be preserved");
});

test("writeBack — function property not deleted when absent from mutated", () => {
	const transform = (x: number) => x * 2;
	const original: Record<string, unknown> = { value: 42, transform };
	writeBack(original, { value: 100 });
	assert.strictEqual(original.value, 100, "value should be updated");
	assert.strictEqual(
		original.transform,
		transform,
		"function property should not be deleted",
	);
});

test("writeBack — multiple function properties all preserved", () => {
	const fn1 = () => 1;
	const fn2 = () => 2;
	const original: Record<string, unknown> = { count: 0, fn1, fn2 };
	writeBack(original, { count: 5 });
	assert.strictEqual(original.count, 5, "data property should be updated");
	assert.strictEqual(original.fn1, fn1, "first function preserved");
	assert.strictEqual(original.fn2, fn2, "second function preserved");
});

test("writeBack — codec writeBack hook is called for registered types", () => {
	class Vector {
		x: number;
		y: number;
		constructor(x: number, y: number) {
			this.x = x;
			this.y = y;
		}
	}
	let writeBackCalled = false;
	const vectorCodec: ArgCodec<Vector> = {
		tag: "__test_vector_wb",
		is: (v): v is Vector => v instanceof Vector,
		encode: (v) => ({ x: v.x, y: v.y }),
		decode: (data) => {
			const { x, y } = data as { x: number; y: number };
			return new Vector(x, y);
		},
		writeBack: (original, mutated) => {
			writeBackCalled = true;
			original.x = mutated.x;
			original.y = mutated.y;
		},
	};
	configureCodecs([vectorCodec]);
	const v = new Vector(1, 2);
	writeBack(v, new Vector(10, 20));
	assert.strictEqual(
		writeBackCalled,
		true,
		"codec writeBack should be invoked",
	);
	assert.strictEqual(v.x, 10, "x updated via codec writeBack");
	assert.strictEqual(v.y, 20, "y updated via codec writeBack");
	assert.ok(v instanceof Vector, "prototype preserved after codec writeBack");
});

test("writeBack — codec writeBack reconcile callback handles nested values", () => {
	class Wrapper {
		inner: { value: number };
		constructor(inner: { value: number }) {
			this.inner = inner;
		}
	}
	const wrapperCodec: ArgCodec<Wrapper> = {
		tag: "__test_wrapper_wb",
		is: (v): v is Wrapper => v instanceof Wrapper,
		encode: (v) => ({ inner: v.inner }),
		decode: (data) => new Wrapper((data as Wrapper).inner),
		writeBack: (original, mutated, reconcile) => {
			// Use reconcile to update the nested plain object in-place
			reconcile(original.inner, mutated.inner);
		},
	};
	configureCodecs([wrapperCodec]);
	const innerRef = { value: 1 };
	const w = new Wrapper(innerRef);
	writeBack(w, new Wrapper({ value: 99 }));
	assert.strictEqual(
		w.inner,
		innerRef,
		"inner object reference preserved via reconcile",
	);
	assert.strictEqual(innerRef.value, 99, "inner value updated via reconcile");
	assert.ok(w instanceof Wrapper, "prototype preserved");
});
