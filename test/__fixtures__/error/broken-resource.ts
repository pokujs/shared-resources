import { resource } from '../../../src/index.js';

export const BrokenContext = resource.create(() => {
  throw new Error('Intentional factory error');
});
