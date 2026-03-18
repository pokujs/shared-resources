import type { ArgCodec } from '../types.js';

export const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
};

export const objectCodec: ArgCodec<Record<string, unknown>> = {
  tag: Symbol.for('sr:obj'),
  is: isPlainObject,
  // No collision-escape needed: the outer { __sr_enc: 'c', t: 'obj', v: ... }
  // sentinel wraps the encoded values, so inner keys are iterated individually
  // by decode — any __sr_enc key in the original object is just a normal value.
  encode: (v, recurse) => {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(v)) {
      if (typeof v[key] !== 'function') result[key] = recurse(v[key]);
    }
    return result;
  },
  decode: (data, recurse) => {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) result[key] = recurse(obj[key]);
    return result;
  },
  writeBack: (original, mutated, reconcile) => {
    for (const key of Object.keys(original)) {
      if (!(key in mutated) && typeof original[key] !== 'function')
        delete original[key];
    }
    for (const key of Object.keys(mutated)) {
      if (!reconcile(original[key], mutated[key])) original[key] = mutated[key];
    }
  },
};
