import { env } from 'node:process';
import { resource } from '../../src/index.js';

const runtime = env.POKU_RUNTIME || 'node';

export const CounterContext = resource.create(() => ({
  count: 0,
  increment() {
    this.count++;
    return this.count;
  },
  getCount() {
    return this.count;
  },
}));

export const FlagContext = resource.create(
  () => ({
    active: false,
    activate() {
      this.active = true;
      return this.active;
    },
    isActive() {
      return this.active;
    },
  }),
  {
    module: runtime === 'deno' ? undefined : __filename,
  }
);
