import type { PokuPlugin } from 'poku/plugins';
import { globalRegistry, setupSharedResourceIPC } from './shared-resources.js';

export const sharedResources = (): PokuPlugin => ({
  name: 'shared-resources',
  ipc: true,
  onTestProcess(child) {
    setupSharedResourceIPC(child);
  },
  async teardown() {
    const entries = Object.values(globalRegistry);

    for (const entry of entries)
      if (entry.onDestroy) await entry.onDestroy(entry.state);
  },
});

export { resource } from './shared-resources.js';
