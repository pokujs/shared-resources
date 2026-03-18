import type { ArgCodec } from '../../src/types.js';
import { assert, test } from 'poku';
import {
  configureCodecs,
  decodeArg,
  encodeArg,
} from '../../src/shared-resources.js';

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

test('encodeArg/decodeArg — object with __sr_enc key survives roundtrip', () => {
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

test('encodeArg — class instance encoded as own enumerable data properties', () => {
  class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
    toString() {
      return `Point(${this.x}, ${this.y})`;
    }
  }
  const p = new Point(1, 2);
  const encoded = encodeArg(p) as Record<string, unknown>;
  const encodedData = encoded.v as Record<string, unknown>;
  assert.strictEqual(encodedData.x, 1, 'x own property encoded');
  assert.strictEqual(encodedData.y, 2, 'y own property encoded');
  assert.strictEqual(
    Object.hasOwn(encodedData, 'toString'),
    false,
    'prototype method should not be an own property of the encoded result'
  );
});

test('encodeArg/decodeArg — class instance round-trips own data as a plain object', () => {
  class Box {
    value: number;
    constructor(value: number) {
      this.value = value;
    }
  }
  const result = roundtrip(new Box(42)) as Record<string, unknown>;
  assert.strictEqual(
    result.value,
    42,
    'own data property preserved in round-trip'
  );
  // Prototype cannot be reconstructed over text-based IPC — documented limitation.
  assert.ok(
    !(result instanceof Box),
    'decoded result is a plain object (prototype not reconstructed — expected)'
  );
});

test('encodeArg — nested class instance encoded as plain data', () => {
  class Inner {
    id: number;
    constructor(id: number) {
      this.id = id;
    }
  }
  const encoded = encodeArg({ wrapper: new Inner(5) }) as Record<
    string,
    unknown
  >;
  const outerData = encoded.v as Record<string, unknown>;
  const innerEncoded = outerData.wrapper as Record<string, unknown>;
  assert.deepStrictEqual(
    innerEncoded.v,
    { id: 5 },
    'inner class instance encoded as plain data'
  );
});

test('encodeArg — function property omitted from encoded plain object', () => {
  const fn = () => 42;
  const obj = { value: 1, compute: fn };
  const encoded = encodeArg(obj) as Record<string, unknown>;
  const encodedData = encoded.v as Record<string, unknown>;
  assert.strictEqual(
    'compute' in encodedData,
    false,
    'Function property should be omitted during encoding'
  );
  assert.strictEqual(
    encodedData.value,
    1,
    'Regular property should still be encoded'
  );
});

test('encodeArg/decodeArg — plain object with function property round-trips without the function', () => {
  const fn = () => 99;
  const obj = { a: 1, fn } as Record<string, unknown>;
  const result = roundtrip(obj) as Record<string, unknown>;
  assert.strictEqual(result.a, 1, 'Regular property preserved in round-trip');
  assert.strictEqual(
    'fn' in result,
    false,
    'Function property is absent after encoding round-trip'
  );
});

const resetCodecs = () => configureCodecs([]);

class Color {
  r: number;
  g: number;
  b: number;
  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  toHex() {
    return `#${[this.r, this.g, this.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  }
}

const colorCodec: ArgCodec<Color> = {
  tag: 'Color',
  is: (v): v is Color => v instanceof Color,
  encode: (v) => ({ r: v.r, g: v.g, b: v.b }),
  decode: (data) => {
    const { r, g, b } = data as { r: number; g: number; b: number };
    return new Color(r, g, b);
  },
};

const MY_SYM = Symbol.for('test.mySymbol');
const symbolCodec: ArgCodec<typeof MY_SYM> = {
  tag: 'MySymbol',
  is: (v): v is typeof MY_SYM => v === MY_SYM,
  encode: () => null,
  decode: () => MY_SYM,
};

test('codec — encodeArg wraps value with sentinel tag', () => {
  configureCodecs([colorCodec]);
  try {
    const encoded = encodeArg(new Color(255, 0, 128)) as Record<
      string,
      unknown
    >;
    assert.strictEqual(encoded.__sr_enc, 'c', 'sentinel tag should be "c"');
    assert.strictEqual(encoded.t, 'Color', 'codec tag should be present');
    assert.deepStrictEqual(
      encoded.v,
      { r: 255, g: 0, b: 128 },
      'encoded value should match'
    );
  } finally {
    resetCodecs();
  }
});

test('codec — roundtrip reconstructs class instance with prototype', () => {
  configureCodecs([colorCodec]);
  try {
    const c = new Color(0, 128, 255);
    const result = roundtrip(c);
    assert.ok(
      result instanceof Color,
      'decoded value should be a Color instance'
    );
    assert.strictEqual((result as Color).r, 0, 'r preserved');
    assert.strictEqual((result as Color).g, 128, 'g preserved');
    assert.strictEqual((result as Color).b, 255, 'b preserved');
    assert.strictEqual(
      (result as Color).toHex(),
      '#0080ff',
      'prototype method should work on reconstructed instance'
    );
  } finally {
    resetCodecs();
  }
});

test('codec — Symbol roundtrip via codec', () => {
  configureCodecs([symbolCodec]);
  try {
    const result = roundtrip(MY_SYM);
    assert.strictEqual(
      result,
      MY_SYM,
      'Symbol should be reconstructed to the same value'
    );
  } finally {
    resetCodecs();
  }
});

test('codec — codec nested inside plain object', () => {
  configureCodecs([colorCodec]);
  try {
    const obj = { bg: new Color(10, 20, 30), label: 'sky' };
    const result = roundtrip(obj) as { bg: Color; label: string };
    assert.ok(
      result.bg instanceof Color,
      'nested codec value should be reconstructed'
    );
    assert.strictEqual(result.bg.r, 10, 'r preserved inside object');
    assert.strictEqual(result.label, 'sky', 'sibling property preserved');
  } finally {
    resetCodecs();
  }
});

test('codec — codec inside array', () => {
  configureCodecs([colorCodec]);
  try {
    const arr = [new Color(1, 2, 3), new Color(4, 5, 6)];
    const result = roundtrip(arr) as Color[];
    assert.ok(result[0] instanceof Color, 'first element reconstructed');
    assert.ok(result[1] instanceof Color, 'second element reconstructed');
    assert.strictEqual(result[0].r, 1, 'first Color r preserved');
    assert.strictEqual(result[1].b, 6, 'second Color b preserved');
  } finally {
    resetCodecs();
  }
});

test('codec — multiple codecs coexist', () => {
  configureCodecs([colorCodec, symbolCodec]);
  try {
    const result1 = roundtrip(new Color(5, 5, 5));
    const result2 = roundtrip(MY_SYM);
    assert.ok(result1 instanceof Color, 'Color codec still works');
    assert.strictEqual(result2, MY_SYM, 'Symbol codec still works');
  } finally {
    resetCodecs();
  }
});

test('codec — later configure call merges by tag without wiping unrelated codecs', () => {
  configureCodecs([colorCodec, symbolCodec]);
  // Re-register only colorCodec with same tag — symbolCodec should survive
  configureCodecs([colorCodec]);
  try {
    const result = roundtrip(MY_SYM);
    assert.strictEqual(
      result,
      MY_SYM,
      'symbolCodec should still be registered after merge'
    );
  } finally {
    resetCodecs();
  }
});

test('codec — decoding unknown tag throws a descriptive error', () => {
  configureCodecs([]);
  const orphanEncoded = { __sr_enc: 'c', t: 'OrphanType', v: {} };
  assert.throws(
    () => decodeArg(orphanEncoded),
    (err: unknown) =>
      err instanceof Error && (err as Error).message.includes('OrphanType'),
    'Should throw with the unregistered codec tag in the message'
  );
});
