import type { ArgCodec } from '../types.js';

export const dateCodec: ArgCodec<Date> = {
  tag: Symbol.for('sr:d'),
  is: (v): v is Date => v instanceof Date,
  encode: (v) => v.toISOString(),
  decode: (data) => new Date(data as string),
  writeBack: (original, mutated) => {
    original.setTime(mutated.getTime());
  },
};
