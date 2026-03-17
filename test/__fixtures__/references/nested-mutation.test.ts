import { assert, test } from 'poku';
import { resource } from '../../../src/index.js';
import { NestedMutatorContext } from './resource.js';

test('Deeply nested array mutation via IPC', async () => {
  const mutator = await resource.use(NestedMutatorContext);
  const value = await mutator.getValue();
  const obj = { nested: { arr: [] as number[] } };

  await mutator.pushToNestedArray(obj);

  assert.strictEqual(
    obj.nested.arr[0],
    value,
    'Nested array should contain the value pushed by the remote method'
  );
});

test('Array of objects mutation via IPC', async () => {
  const mutator = await resource.use(NestedMutatorContext);
  const arr = [{ x: 1 }, { x: 2 }, { x: 3 }];

  await mutator.mutateArrayOfObjects(arr);

  assert.deepStrictEqual(
    arr,
    [{ x: 2 }, { x: 3 }, { x: 4 }],
    'Each object in the array should have its x property incremented'
  );
});

test('Array truncation via IPC', async () => {
  const mutator = await resource.use(NestedMutatorContext);
  const arr = [10, 20, 30, 40];

  await mutator.truncateArray(arr);

  assert.deepStrictEqual(
    arr,
    [10, 20, 30],
    'Array should be truncated to all but the last element'
  );
});
