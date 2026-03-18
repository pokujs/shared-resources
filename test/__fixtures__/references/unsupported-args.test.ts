import { assert, test } from 'poku';
import { resource } from '../../../src/index.js';
import {
  ClassInstanceMutatorContext,
  FunctionPropertyMutatorContext,
  Point,
} from './resource.js';

test('Codec: class instance fully reconstructed on both sides of IPC', async () => {
  const mutator = await resource.use(ClassInstanceMutatorContext);
  const p = new Point(1, 2);

  // With the pointCodec registered, the parent process decodes the arg back
  // into a real Point instance (not a plain object). The method return value
  // confirms reconstruction — `p instanceof Point` in the parent is true.
  const parentReceivedRealPoint = await mutator.mutateClassInstance(p);

  assert.strictEqual(
    parentReceivedRealPoint,
    true,
    'parent should receive a real Point instance via the codec'
  );
  assert.strictEqual(
    p.x,
    11,
    'x should be incremented by 10 (written back by codec decode)'
  );
  assert.strictEqual(
    p.y,
    12,
    'y should be incremented by 10 (written back by codec decode)'
  );
  assert.ok(
    p instanceof Point,
    'prototype chain should be preserved on caller after writeBack'
  );
  assert.strictEqual(
    p.toString(),
    'Point(11, 12)',
    'prototype methods should still work on the updated instance'
  );
});

test('Function property is preserved after IPC call', async () => {
  const mutator = await resource.use(FunctionPropertyMutatorContext);
  const transform = (x: number) => x * 2;
  const obj = { value: 42, transform } as unknown as { value: number };

  await mutator.mutateValue(obj);

  assert.strictEqual(
    (obj as unknown as { value: number }).value,
    43,
    'value should be incremented by the remote method'
  );
  assert.strictEqual(
    (obj as unknown as { transform: unknown }).transform,
    transform,
    'function property should be preserved after IPC write-back'
  );
  assert.strictEqual(
    (obj as unknown as { transform: (x: number) => number }).transform(5),
    10,
    'preserved function should still work correctly'
  );
});
