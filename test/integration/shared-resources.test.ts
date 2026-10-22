import { assert, describe, it } from 'poku';
import { inspectPoku } from 'poku/plugins';

const FACTORY_ERROR_PATTERN = /Intentional factory error/;

describe('Shared Resources', async () => {
  await it('Parallel tests', async () => {
    const { exitCode, stdout, stderr } = await inspectPoku({
      bin: 'test/__utils__/poku-cli.ts',
      spawnOptions: { timeout: 15000 },
      command:
        '--config=test/__fixtures__/parallel/poku.config.mts --isolation=process --timeout=10000 test/__fixtures__/parallel',
    });

    assert.strictEqual(exitCode, 0, `${stdout}\n${stderr}`);
  });

  await it('Runs on isolation: none', async () => {
    const { exitCode, stdout, stderr } = await inspectPoku({
      bin: 'test/__utils__/poku-cli.ts',
      spawnOptions: { timeout: 15000 },
      command:
        '--config=test/__fixtures__/parallel/poku.config.mts --isolation=none --timeout=10000 test/__fixtures__/in-process',
    });

    assert.strictEqual(exitCode, 0, `${stdout}\n${stderr}`);
  });

  await it('Error tests', async () => {
    const { exitCode, stdout, stderr } = await inspectPoku({
      bin: 'test/__utils__/poku-cli.ts',
      spawnOptions: { timeout: 15000 },
      command:
        '--config=test/__fixtures__/parallel/poku.config.mts test/__fixtures__/error',
    });

    assert.strictEqual(exitCode, 1, 'Exit Code needs to be 1');
    assert.match(`${stdout}\n${stderr}`, FACTORY_ERROR_PATTERN);
  });

  await it('Reference tests', async () => {
    const { exitCode, stdout, stderr } = await inspectPoku({
      bin: 'test/__utils__/poku-cli.ts',
      spawnOptions: { timeout: 15000 },
      command:
        '--config=test/__fixtures__/parallel/poku.config.mts --isolation=process test/__fixtures__/references',
    });

    assert.strictEqual(exitCode, 0, `${stdout}\n${stderr}`);
  });
});
