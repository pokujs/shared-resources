import type { ArgCodec } from '../types.js';

export const bigIntCodec: ArgCodec<bigint> = {
  tag: Symbol.for('sr:bi'),
  is: (v): v is bigint => typeof v === 'bigint',
  encode: (v) => v.toString(),
  decode: (data) => BigInt(data as string),
};
