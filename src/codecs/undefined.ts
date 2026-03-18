import type { ArgCodec } from '../types.js';

export const undefinedCodec: ArgCodec<undefined> = {
  tag: Symbol.for('sr:u'),
  is: (v): v is undefined => v === undefined,
  encode: () => null,
  decode: () => undefined,
};
