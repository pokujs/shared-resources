import type { PokuPlugin } from "poku/plugins";
import type { SharedResourcesConfig } from "./types.js";
import {
	configureCodecs,
	globalRegistry,
	setupSharedResourceIPC,
} from "./shared-resources.js";

export const sharedResources = (config?: SharedResourcesConfig): PokuPlugin => {
	if (config?.codecs?.length > 0) configureCodecs(config.codecs);
	return {
		name: "shared-resources",
		ipc: true,
		onTestProcess(child) {
			setupSharedResourceIPC(child);
		},
		async teardown() {
			const entries = Object.values(globalRegistry);

			for (const entry of entries)
				if (entry.onDestroy) await entry.onDestroy(entry.state);
		},
	};
};

export { resource } from "./shared-resources.js";
export type { ArgCodec, SharedResourcesConfig } from "./types.js";
