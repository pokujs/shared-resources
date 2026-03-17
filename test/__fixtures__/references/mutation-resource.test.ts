import { assert, test, waitForExpectedResult } from 'poku';
import { resource } from '../../../src/index.js';
import { MutatorContext } from './resource.js';

test('Test second resource only', async () => {
  const mutator = await resource.use(MutatorContext);
  const value = await mutator.getValue();
  const array: number[] = [];

  await mutator.mutateArray(array);

  assert.strictEqual(
    array[0],
    value,
    'Array should contain the value returned by getValue()'
  );
});
