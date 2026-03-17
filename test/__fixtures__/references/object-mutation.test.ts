import { assert, test } from 'poku';
import { resource } from '../../../src/index.js';
import { ObjectMutatorContext } from './resource.js';

test('Object property mutation via IPC', async () => {
  const mutator = await resource.use(ObjectMutatorContext);
  const value = await mutator.getValue();
  const obj: Record<string, unknown> = {};

  await mutator.mutateObject(obj);

  assert.strictEqual(
    obj.key,
    value,
    'Object property should be set by the remote method'
  );
});

test('Object property deletion via IPC', async () => {
  const mutator = await resource.use(ObjectMutatorContext);
  const obj: Record<string, unknown> = { toDelete: 'remove-me', keep: 42 };

  await mutator.deleteKey(obj);

  assert.strictEqual(
    'toDelete' in obj,
    false,
    'Deleted property should not exist on the original object'
  );
  assert.strictEqual(obj.keep, 42, 'Non-deleted property should remain');
});
