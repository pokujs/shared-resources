import { assert, test } from 'poku';
import {
  getExecutionMode,
  resetSharedResourcesRuntime,
  resource,
  setExecutionMode,
  setupSharedResourceIPC,
} from '../../src/shared-resources.js';

test('Execution mode', async () => {
  await test('should switch between process and in-process mode', () => {
    setExecutionMode('in-process');
    assert.strictEqual(
      getExecutionMode(),
      'in-process',
      'Mode should be in-process'
    );

    setExecutionMode('process');
    assert.strictEqual(getExecutionMode(), 'process', 'Mode should be process');
  });

  await test('should skip IPC setup when running in-process', () => {
    setExecutionMode('in-process');

    let listenerCalls = 0;
    const child = {
      on() {
        listenerCalls++;
      },
      send() {
        return true;
      },
    };

    setupSharedResourceIPC(child as never);

    assert.strictEqual(
      listenerCalls,
      0,
      'No message listener should be attached in in-process mode'
    );

    setExecutionMode('process');
  });

  await test('should reset execution mode to process', () => {
    setExecutionMode('in-process');
    resetSharedResourcesRuntime();

    assert.strictEqual(
      getExecutionMode(),
      'process',
      'Reset should restore process mode'
    );
  });

  await test('should deduplicate concurrent resource.use() calls for the same async resource', async () => {
    resetSharedResourcesRuntime();
    setExecutionMode('in-process');

    let factoryCalls = 0;
    const AsyncStore = resource.create(async () => {
      factoryCalls++;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return {
        items: new Map<string, bigint>([['initial', 1n]]),
        getCalls() {
          return factoryCalls;
        },
      };
    });

    const [first, second, third] = await Promise.all([
      resource.use(AsyncStore),
      resource.use(AsyncStore),
      resource.use(AsyncStore),
    ]);

    assert.strictEqual(
      factoryCalls,
      1,
      'Factory should run only once for concurrent callers'
    );
    assert.strictEqual(await first.getCalls(), 1);
    assert.strictEqual(second.items.get('initial'), 1n);
    assert.strictEqual(third.items.get('initial'), 1n);

    resetSharedResourcesRuntime();
  });
});
