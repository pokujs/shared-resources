import nodeAssert from 'node:assert/strict';
import { test } from 'poku';
import {
  resetSharedResourcesRuntime,
  resource,
  setExecutionMode,
} from '../../src/shared-resources.js';

test('Concurrent callers share factory failures and can retry creation', async () => {
  resetSharedResourcesRuntime();
  setExecutionMode('in-process');
  let calls = 0;
  const factoryError = new Error('first creation failed');
  const context = resource.create(async () => {
    calls++;
    await Promise.resolve();
    if (calls === 1) throw factoryError;
    return { value: 42 };
  });
  try {
    const first = await Promise.allSettled([
      resource.use(context),
      resource.use(context),
    ]);
    nodeAssert.strictEqual(calls, 1);
    for (const result of first) {
      nodeAssert.strictEqual(result.status, 'rejected');
      if (result.status === 'rejected')
        nodeAssert.strictEqual(result.reason, factoryError);
    }
    const next = await Promise.all([
      resource.use(context),
      resource.use(context),
    ]);
    nodeAssert.strictEqual(calls, 2);
    nodeAssert.strictEqual(next[0].value, 42);
    nodeAssert.strictEqual(next[1].value, 42);
  } finally {
    resetSharedResourcesRuntime();
  }
});
