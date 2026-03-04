import { assert, test, waitForExpectedResult } from 'poku';
import { resource } from '../../../src/index.js';
import { CounterContext } from '../counter.js';

test('Verify Counter State', async () => {
  const counter = await resource.use(CounterContext);

  await waitForExpectedResult(counter.getCount, 1);
  assert.strictEqual(
    await counter.getCount(),
    1,
    'Should be 1 at start of Test B'
  );

  await counter.increment();
  assert.strictEqual(
    await counter.getCount(),
    2,
    'Should be 2 after increment'
  );
});
