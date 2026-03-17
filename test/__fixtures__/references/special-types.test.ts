import { assert, test } from 'poku';
import { resource } from '../../../src/index.js';
import { SpecialTypesMutatorContext } from './resource.js';

test('Date mutation via IPC', async () => {
  const mutator = await resource.use(SpecialTypesMutatorContext);
  const d = new Date('2026-01-15T00:00:00.000Z');

  await mutator.mutateDate(d);

  assert.strictEqual(
    d.getFullYear(),
    2000,
    'Date year should be updated to 2000 in place'
  );
});

test('Map mutation via IPC', async () => {
  const mutator = await resource.use(SpecialTypesMutatorContext);
  const m = new Map<string, number>([
    ['keep', 1],
    ['toRemove', 2],
  ]);

  await mutator.mutateMap(m);

  assert.strictEqual(m.get('added'), 99, 'New entry should be present');
  assert.strictEqual(
    m.has('toRemove'),
    false,
    'Removed entry should be absent'
  );
  assert.strictEqual(m.get('keep'), 1, 'Unchanged entry should remain');
});

test('Set mutation via IPC', async () => {
  const mutator = await resource.use(SpecialTypesMutatorContext);
  const s = new Set<number>([0, 1, 2]);

  await mutator.mutateSet(s);

  assert.strictEqual(s.has(99), true, 'New element should be present');
  assert.strictEqual(s.has(0), false, 'Removed element should be absent');
  assert.strictEqual(s.has(1), true, 'Unchanged element should remain');
});

test('Setting object property to undefined via IPC', async () => {
  const mutator = await resource.use(SpecialTypesMutatorContext);
  const obj: Record<string, unknown> = { a: 42 };

  await mutator.setPropertyToUndefined(obj);

  assert.strictEqual('a' in obj, true, 'Key should still exist on the object');
  assert.strictEqual(obj.a, undefined, 'Value should be undefined');
});

test('Pushing undefined into array via IPC', async () => {
  const mutator = await resource.use(SpecialTypesMutatorContext);
  const arr: (number | undefined)[] = [1, 2];

  await mutator.pushUndefined(arr);

  assert.strictEqual(arr.length, 3, 'Array should have grown by one');
  assert.strictEqual(arr[2], undefined, 'New element should be undefined');
});

test('BigInt array mutation via IPC', async () => {
  const mutator = await resource.use(SpecialTypesMutatorContext);
  const arr: bigint[] = [1n, 2n];

  await mutator.mutateBigIntArray(arr);

  assert.strictEqual(arr.length, 3, 'Array should have grown by one');
  assert.strictEqual(arr[2], 99n, 'New BigInt element should be 99n');
});

test('BigInt Map mutation via IPC', async () => {
  const mutator = await resource.use(SpecialTypesMutatorContext);
  const m = new Map<string, bigint>([['keep', 1n], ['toRemove', 2n]]);

  await mutator.mutateBigIntMap(m);

  assert.strictEqual(m.has('toRemove'), false, 'Removed entry should be absent');
  assert.strictEqual(m.get('added'), 42n, 'New BigInt entry should be 42n');
  assert.strictEqual(m.get('keep'), 1n, 'Unchanged entry should remain');
});
