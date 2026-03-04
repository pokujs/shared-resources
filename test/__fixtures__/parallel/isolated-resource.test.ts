import { assert, test, waitForExpectedResult } from 'poku';
import { resource } from '../../../src/index.js';
import { FlagContext } from '../counter.js';

test('Test second resource only', async () => {
  const flag = await resource.use(FlagContext);

  await waitForExpectedResult(flag.isActive, true);
  assert.strictEqual(
    await flag.isActive(),
    true,
    'Flag should be active (set by Test A)'
  );
});
