import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const scenarios = [
  require('../parallel/multiple-resources.test.ts'),
  require('../parallel/isolated-resource.test.ts'),
  require('../parallel/shared-state.test.ts'),
  require('../parallel/resource-cleanup.test.ts'),
] as Array<{ result: Promise<void> }>;

await Promise.all(scenarios.map((scenario) => scenario.result));
