import { assert, test } from 'poku';
import { resource } from '../../../src/index.js';
import { ServerContext } from '../server.js';

test('Server: Query and Verify Response', async () => {
  const server = await resource.use(ServerContext);
  const result = await server.query('/');

  assert.strictEqual(result['solution'], 2, 'Should return solution: 2');
});
