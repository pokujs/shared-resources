import { assert, test } from 'poku';
import { resource } from '../../../src/index.js';
import { BrokenContext } from './broken-resource.js';

test('Should fail when resource factory throws', async () => {
  const broken = await resource.use(BrokenContext);
  assert.ok(broken, 'Should not reach here');
});
