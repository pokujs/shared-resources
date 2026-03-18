import type { ArgCodec } from '../../../src/types.js';
import { resource } from '../../../src/index.js';

export class Point {
  constructor(
    public x: number,
    public y: number
  ) {}
  toString() {
    return `Point(${this.x}, ${this.y})`;
  }
}

const pointCodec: ArgCodec<Point> = {
  tag: 'Point',
  is: (v): v is Point => v instanceof Point,
  encode: (v) => ({ x: v.x, y: v.y }),
  decode: (data) => {
    const { x, y } = data as { x: number; y: number };
    return new Point(x, y);
  },
};

// Called at module-evaluation time — runs in both the child process (direct
// import) and the parent process (via loadModuleResources dynamic import),
// so codecs are available on both sides of the IPC channel automatically.
resource.configure({ codecs: [pointCodec] });

export const MutatorContext = resource.create(() => {
  const value = Math.random();
  return {
    mutateArray(arr: number[]) {
      arr.push(value);
    },
    getValue() {
      return value;
    },
  };
});

export const ObjectMutatorContext = resource.create(() => {
  const value = Math.random();
  return {
    mutateObject(obj: Record<string, unknown>) {
      obj.key = value;
    },
    deleteKey(obj: Record<string, unknown>) {
      delete obj.toDelete;
    },
    getValue() {
      return value;
    },
  };
});

export const NestedMutatorContext = resource.create(() => {
  const value = Math.random();
  return {
    pushToNestedArray(obj: { nested: { arr: number[] } }) {
      obj.nested.arr.push(value);
    },
    mutateArrayOfObjects(arr: Array<{ x: number }>) {
      for (const item of arr) item.x += 1;
    },
    truncateArray(arr: number[]) {
      arr.splice(arr.length - 1);
    },
    getValue() {
      return value;
    },
  };
});

export const ClassInstanceMutatorContext = resource.create(() => ({
  /**
   * Mutates a Point in place and returns whether the parent process received
   * it as a real Point instance (true only when the codec is registered).
   */
  mutateClassInstance(p: Point): boolean {
    p.x += 10;
    p.y += 10;
    return p instanceof Point;
  },
}));

export const FunctionPropertyMutatorContext = resource.create(() => ({
  mutateValue(obj: { value: number }) {
    obj.value += 1;
  },
}));

export const SpecialTypesMutatorContext = resource.create(() => ({
  mutateDate(d: Date) {
    d.setFullYear(2000);
  },
  mutateMap(m: Map<string, number>) {
    m.set('added', 99);
    m.delete('toRemove');
  },
  mutateSet(s: Set<number>) {
    s.add(99);
    s.delete(0);
  },
  setPropertyToUndefined(obj: Record<string, unknown>) {
    obj.a = undefined;
  },
  pushUndefined(arr: (number | undefined)[]) {
    arr.push(undefined);
  },
  mutateBigIntArray(arr: bigint[]) {
    arr.push(99n);
  },
  mutateBigIntMap(m: Map<string, bigint>) {
    m.set('added', 42n);
    m.delete('toRemove');
  },
}));
