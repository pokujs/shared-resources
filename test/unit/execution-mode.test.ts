import { assert, test } from 'poku';
import {
  getExecutionMode,
  resetSharedResourcesRuntime,
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
});
