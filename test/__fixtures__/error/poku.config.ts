import { defineConfig } from 'poku';
import { sharedResources } from '../../../src/index.js';

export default defineConfig({
  plugins: [sharedResources()],
});
