import type { PokuPlugin } from 'poku/plugins';
import type { SharedResourcesConfig } from './types.js';
import {
  configureCodecs,
  globalRegistry,
  resetSharedResourcesRuntime,
  setExecutionMode,
  setupSharedResourceIPC,
} from './shared-resources.js';

export const sharedResources = (config?: SharedResourcesConfig): PokuPlugin => {
  if (config?.codecs && config.codecs.length > 0)
    configureCodecs(config.codecs);
  return {
    name: 'shared-resources',
    ipc: true,
    onTestProcess(child) {
      setupSharedResourceIPC(child);
    },
    setup(context) {
      setExecutionMode(
        context.configs.isolation === 'none' ? 'in-process' : 'process'
      );
    },
    async teardown() {
      const entries = Object.values(globalRegistry);

      for (const entry of entries)
        if (entry.onDestroy) await entry.onDestroy(entry.state);

      resetSharedResourcesRuntime();
    },
  };
};

export { resource } from './shared-resources.js';
export type { ArgCodec, SharedResourcesConfig } from './types.js';
