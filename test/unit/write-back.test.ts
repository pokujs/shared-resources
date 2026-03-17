import { assert, test } from 'poku';
import { writeBack } from '../../src/shared-resources.js';

test('writeBack — array push', () => {
  const original: number[] = [];
  writeBack(original, [42]);
  assert.deepStrictEqual(
    original,
    [42],
    'Element should be pushed into the original array'
  );
});

test('writeBack — array truncation', () => {
  const original = [1, 2, 3, 4];
  writeBack(original, [1, 2, 3]);
  assert.deepStrictEqual(
    original,
    [1, 2, 3],
    'Array should be truncated to match mutated length'
  );
});

test('writeBack — array emptied', () => {
  const original = [1, 2, 3];
  writeBack(original, []);
  assert.deepStrictEqual(original, [], 'Array should be emptied');
});

test('writeBack — array element update', () => {
  const original = [1, 2, 3];
  writeBack(original, [1, 99, 3]);
  assert.deepStrictEqual(
    original,
    [1, 99, 3],
    'Middle element should be updated in place'
  );
});

test('writeBack — preserves original array reference', () => {
  const original: number[] = [1];
  const ref = original;
  writeBack(original, [1, 2, 3]);
  assert.strictEqual(
    original,
    ref,
    'Original array reference should be preserved'
  );
});

test('writeBack — object property set', () => {
  const original: Record<string, unknown> = {};
  writeBack(original, { key: 42 });
  assert.strictEqual(
    original.key,
    42,
    'Property should be set on the original object'
  );
});

test('writeBack — object property deletion', () => {
  const original: Record<string, unknown> = { toDelete: 'x', keep: 1 };
  writeBack(original, { keep: 1 });
  assert.strictEqual(
    'toDelete' in original,
    false,
    'Property should be removed'
  );
  assert.strictEqual(
    original.keep,
    1,
    'Remaining property should still be present'
  );
});

test('writeBack — object property update', () => {
  const original: Record<string, unknown> = { count: 0 };
  writeBack(original, { count: 5 });
  assert.strictEqual(original.count, 5, 'Property should be updated');
});

test('writeBack — preserves original object reference', () => {
  const original: Record<string, unknown> = { a: 1 };
  const ref = original;
  writeBack(original, { a: 2, b: 3 });
  assert.strictEqual(
    original,
    ref,
    'Original object reference should be preserved'
  );
});

test('writeBack — deeply nested array push', () => {
  const original = { nested: { arr: [] as number[] } };
  writeBack(original, { nested: { arr: [7] } });
  assert.deepStrictEqual(
    original.nested.arr,
    [7],
    'Nested array should have the pushed value'
  );
});

test('writeBack — deeply nested object property', () => {
  const original = { a: { b: { c: 0 } } };
  writeBack(original, { a: { b: { c: 99 } } });
  assert.strictEqual(original.a.b.c, 99, 'Deep property should be updated');
});

test('writeBack — preserves nested object references', () => {
  const inner = { arr: [] as number[] };
  const original = { nested: inner };
  writeBack(original, { nested: { arr: [1, 2] } });
  assert.strictEqual(
    original.nested,
    inner,
    'Nested object reference should be preserved'
  );
  assert.deepStrictEqual(
    original.nested.arr,
    [1, 2],
    'Nested array should be updated in place'
  );
});

test('writeBack — array of objects mutation', () => {
  const original = [{ x: 1 }, { x: 2 }];
  writeBack(original, [{ x: 10 }, { x: 20 }]);
  assert.deepStrictEqual(
    original,
    [{ x: 10 }, { x: 20 }],
    'Each object element should be updated'
  );
});

test('writeBack — preserves references inside array of objects', () => {
  const item0 = { x: 1 };
  const original = [item0, { x: 2 }];
  writeBack(original, [{ x: 99 }, { x: 2 }]);
  assert.strictEqual(
    original[0],
    item0,
    'Object reference inside array should be preserved'
  );
  assert.strictEqual(
    item0.x,
    99,
    'The referenced object should have its property updated'
  );
});

test('writeBack — primitive original is a no-op', () => {
  const original = 42 as unknown;
  assert.doesNotThrow(
    () => writeBack(original, 99),
    'Should not throw for primitive original'
  );
});

test('writeBack — null original is a no-op', () => {
  assert.doesNotThrow(
    () => writeBack(null, { key: 1 }),
    'Should not throw for null original'
  );
});

test('writeBack — mismatched types (array vs object) is a no-op', () => {
  const original: number[] = [1, 2];
  writeBack(original, { key: 1 });
  assert.deepStrictEqual(
    original,
    [1, 2],
    'Mismatched type should leave original unchanged'
  );
});
