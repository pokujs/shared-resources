import { assert, test } from 'poku';
import { decodeArg, encodeArg } from '../../src/shared-resources.js';

const roundtrip = (v: unknown) => decodeArg(encodeArg(v));

test('encodeArg/decodeArg — undefined', () => {
  assert.strictEqual(
    roundtrip(undefined),
    undefined,
    'undefined survives roundtrip'
  );
});

test('encodeArg/decodeArg — null', () => {
  assert.strictEqual(roundtrip(null), null, 'null survives roundtrip');
});

test('encodeArg/decodeArg — number', () => {
  assert.strictEqual(roundtrip(42), 42, 'number survives roundtrip');
});

test('encodeArg/decodeArg — string', () => {
  assert.strictEqual(roundtrip('hello'), 'hello', 'string survives roundtrip');
});

test('encodeArg/decodeArg — boolean', () => {
  assert.strictEqual(roundtrip(true), true, 'boolean survives roundtrip');
});

test('encodeArg/decodeArg — Date', () => {
  const d = new Date('2026-03-17T12:00:00.000Z');
  const result = roundtrip(d);
  assert.ok(result instanceof Date, 'Should be a Date instance');
  assert.strictEqual(
    (result as Date).getTime(),
    d.getTime(),
    'Date time preserved'
  );
});

test('encodeArg/decodeArg — Map', () => {
  const m = new Map<string, number>([
    ['a', 1],
    ['b', 2],
  ]);
  const result = roundtrip(m) as Map<string, number>;
  assert.ok(result instanceof Map, 'Should be a Map instance');
  assert.strictEqual(result.get('a'), 1, 'Map entry a preserved');
  assert.strictEqual(result.get('b'), 2, 'Map entry b preserved');
  assert.strictEqual(result.size, 2, 'Map size preserved');
});

test('encodeArg/decodeArg — Set', () => {
  const s = new Set<number>([1, 2, 3]);
  const result = roundtrip(s) as Set<number>;
  assert.ok(result instanceof Set, 'Should be a Set instance');
  assert.strictEqual(result.has(1), true, 'Set element 1 preserved');
  assert.strictEqual(result.has(3), true, 'Set element 3 preserved');
  assert.strictEqual(result.size, 3, 'Set size preserved');
});

test('encodeArg/decodeArg — array with undefined', () => {
  const arr = [1, undefined, 3];
  const result = roundtrip(arr) as unknown[];
  assert.strictEqual(result[0], 1, 'First element preserved');
  assert.strictEqual(result[1], undefined, 'undefined element preserved');
  assert.strictEqual(result[2], 3, 'Third element preserved');
  assert.strictEqual(result.length, 3, 'Array length preserved');
});

test('encodeArg/decodeArg — object with undefined value', () => {
  const obj = { a: undefined as unknown, b: 1 };
  const result = roundtrip(obj) as Record<string, unknown>;
  assert.strictEqual(
    'a' in result,
    true,
    'Key with undefined value should exist'
  );
  assert.strictEqual(result.a, undefined, 'undefined value preserved');
  assert.strictEqual(result.b, 1, 'Other values preserved');
});

test('encodeArg/decodeArg — nested Map inside object', () => {
  const m = new Map<string, number>([['x', 10]]);
  const obj = { m, count: 1 };
  const result = roundtrip(obj) as { m: Map<string, number>; count: number };
  assert.ok(result.m instanceof Map, 'Nested Map is a Map instance');
  assert.strictEqual(result.m.get('x'), 10, 'Nested Map entry preserved');
  assert.strictEqual(result.count, 1, 'Other object property preserved');
});

test('encodeArg/decodeArg — nested Set inside array', () => {
  const s = new Set<number>([7, 8]);
  const arr = [s, 42];
  const result = roundtrip(arr) as unknown[];
  assert.ok(result[0] instanceof Set, 'Nested Set is a Set instance');
  assert.strictEqual(
    (result[0] as Set<number>).has(7),
    true,
    'Set element 7 preserved'
  );
  assert.strictEqual(result[1], 42, 'Other array element preserved');
});

test('encodeArg/decodeArg — nested Date inside array', () => {
  const d = new Date('2026-01-01T00:00:00.000Z');
  const arr = [d, 42];
  const result = roundtrip(arr) as unknown[];
  assert.ok(result[0] instanceof Date, 'Nested Date is a Date instance');
  assert.strictEqual(
    (result[0] as Date).getTime(),
    d.getTime(),
    'Date value preserved'
  );
  assert.strictEqual(result[1], 42, 'Other array element preserved');
});

test('encodeArg/decodeArg — Map with object keys', () => {
  const key = { id: 1 };
  const m = new Map([[key, 'value']]);
  const result = roundtrip(m) as Map<Record<string, number>, string>;
  assert.strictEqual(result.size, 1, 'Map size preserved');
  const [[rk, rv]] = result.entries();
  assert.deepStrictEqual(rk, key, 'Map object key preserved by value');
  assert.strictEqual(rv, 'value', 'Map value preserved');
});

test('encodeArg/decodeArg — Map with undefined value', () => {
  const m = new Map<string, unknown>([['a', undefined]]);
  const result = roundtrip(m) as Map<string, unknown>;
  assert.strictEqual(result.has('a'), true, 'Key with undefined value present');
  assert.strictEqual(
    result.get('a'),
    undefined,
    'undefined Map value preserved'
  );
});

test('encodeArg/decodeArg — Set with undefined', () => {
  const s = new Set<unknown>([1, undefined, 3]);
  const result = roundtrip(s) as Set<unknown>;
  assert.strictEqual(
    result.has(undefined),
    true,
    'undefined Set element preserved'
  );
  assert.strictEqual(result.size, 3, 'Set size preserved');
});

test('encodeArg/decodeArg — plain object passthrough', () => {
  const obj = { a: 1, b: 'hello', c: true };
  const result = roundtrip(obj);
  assert.deepStrictEqual(result, obj, 'Plain object survives roundtrip');
});

test('encodeArg/decodeArg — object with __sr_enc key (collision escape)', () => {
  const obj = { __sr_enc: 'user-data', other: 42 };
  const result = roundtrip(obj) as typeof obj;
  assert.strictEqual(result.__sr_enc, 'user-data', '__sr_enc key preserved');
  assert.strictEqual(result.other, 42, 'Other key preserved');
});

test('encodeArg/decodeArg — BigInt', () => {
  assert.strictEqual(roundtrip(42n), 42n, 'BigInt survives roundtrip');
  assert.strictEqual(roundtrip(0n), 0n, 'BigInt 0 survives roundtrip');
  assert.strictEqual(
    roundtrip(-99n),
    -99n,
    'Negative BigInt survives roundtrip'
  );
});

test('encodeArg/decodeArg — BigInt in array', () => {
  const result = roundtrip([1n, 2n, 3n]) as bigint[];
  assert.deepStrictEqual(
    result,
    [1n, 2n, 3n],
    'Array of BigInts survives roundtrip'
  );
});

test('encodeArg/decodeArg — BigInt in object', () => {
  const result = roundtrip({ a: 1n, b: 2 }) as { a: bigint; b: number };
  assert.strictEqual(result.a, 1n, 'BigInt property survives roundtrip');
  assert.strictEqual(result.b, 2, 'Non-BigInt property preserved');
});

test('encodeArg/decodeArg — BigInt as Map key and value', () => {
  const m = new Map<bigint, bigint>([
    [1n, 100n],
    [2n, 200n],
  ]);
  const result = roundtrip(m) as Map<bigint, bigint>;
  assert.ok(result instanceof Map, 'Should be a Map instance');
  assert.strictEqual(result.get(1n), 100n, 'BigInt key and value preserved');
  assert.strictEqual(result.get(2n), 200n, 'Second BigInt entry preserved');
});

test('encodeArg/decodeArg — BigInt in Set', () => {
  const s = new Set<bigint>([1n, 2n, 3n]);
  const result = roundtrip(s) as Set<bigint>;
  assert.ok(result instanceof Set, 'Should be a Set instance');
  assert.strictEqual(result.has(1n), true, 'BigInt Set element preserved');
  assert.strictEqual(result.has(3n), true, 'BigInt Set element preserved');
});

test('encodeArg/decodeArg — deeply nested special types', () => {
  const d = new Date('2026-06-01T00:00:00.000Z');
  const m = new Map<string, Date>([['created', d]]);
  const obj = { data: m, tags: new Set(['a', 'b']) };
  const result = roundtrip(obj) as {
    data: Map<string, Date>;
    tags: Set<string>;
  };
  assert.ok(result.data instanceof Map, 'Nested Map preserved');
  assert.ok(
    result.data.get('created') instanceof Date,
    'Map-nested Date preserved'
  );
  assert.strictEqual(
    result.data.get('created')?.getTime(),
    d.getTime(),
    'Date value correct'
  );
  assert.ok(result.tags instanceof Set, 'Nested Set preserved');
  assert.strictEqual(result.tags.has('a'), true, 'Set element preserved');
});
