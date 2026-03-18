import type { ArgCodec } from '../types.js';

export const arrayCodec: ArgCodec<unknown[]> = {
  tag: Symbol.for('sr:a'),
  is: (v): v is unknown[] => Array.isArray(v),
  encode: (v, recurse) => v.map(recurse),
  decode: (data, recurse) => (data as unknown[]).map(recurse),
  writeBack: (original, mutated, reconcile) => {
    const minLen = Math.min(original.length, mutated.length);

    for (let i = 0; i < minLen; i++) {
      if (!reconcile(original[i], mutated[i])) original[i] = mutated[i];
    }

    if (original.length > mutated.length) original.splice(mutated.length);

    for (let i = original.length; i < mutated.length; i++)
      original.push(mutated[i]);
  },
};
