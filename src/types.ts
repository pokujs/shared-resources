import type { ChildProcess, ChildProcessEventMap } from 'node:child_process';
import type EventEmitter from 'node:events';
import type { InternalEventEmitter } from 'node:events';
import type { SHARED_RESOURCE_MESSAGE_TYPES } from './shared-resources.js';

export type IPCEventEmitter = InternalEventEmitter<ChildProcessEventMap> & {
  send: (message: unknown, ...args: unknown[]) => boolean;
};

export type ResourceContext<T> = {
  name: string;
  module?: string;
  factory: () => T | Promise<T>;
  onDestroy?: (instance: T) => void | Promise<void>;
};

export type SharedResourceEntry<T = unknown> = {
  state: T;
  onDestroy?: (instance: T) => void | Promise<void>;
};

export type IPCRequestResourceMessage = {
  type: typeof SHARED_RESOURCE_MESSAGE_TYPES.REQUEST_RESOURCE;
  name: string;
  module: string;
  id: string;
};

export type IPCRemoteProcedureCallMessage = {
  type: typeof SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL;
  name: string;
  id: string;
  method: string;
  args: unknown[];
};

export type IPCMessage =
  | IPCRequestResourceMessage
  | IPCRemoteProcedureCallMessage;

export type SendIPCMessageOptions<TResponse> = {
  message: { id: string; [key: string]: unknown };
  validator: (response: unknown) => response is TResponse;
  timeout?: number;
  emitter?: EventEmitter | IPCEventEmitter | ChildProcess;
  sender?: (message: unknown) => void;
};

export type IPCResourceResultMessage = {
  type: typeof SHARED_RESOURCE_MESSAGE_TYPES.RESOURCE_RESULT;
  name: string;
  id: string;
  value?: unknown;
  rpcs?: string[];
  error?: string;
};

export type IPCRemoteProcedureCallResultMessage = {
  type: typeof SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL_RESULT;
  id: string;
  value?: {
    result: unknown;
    latest: Record<string, unknown>;
    mutatedArgs: unknown[];
  };
  error?: string;
};

export type IPCResponse =
  | IPCResourceResultMessage
  | IPCRemoteProcedureCallResultMessage;

export type MethodsToRPC<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? R extends Promise<unknown>
      ? T[K]
      : (...args: A) => Promise<Awaited<R>>
    : T[K];
};

/**
 * Defines how a custom type (e.g. a class instance or Symbol) is encoded for
 * IPC transport and reconstructed on the other side.
 *
 * Register codecs via `resource.configure({ codecs })` in the resource/test
 * file (runs in both child and parent via module evaluation), or pass them to
 * `sharedResources({ codecs })` for the parent process only.
 */
// biome-ignore lint/suspicious/noExplicitAny: codec registry stores heterogeneous types; is() always guards encode() calls
export type ArgCodec<T = any> = {
  /**
   * Unique identifier used to look up this codec during decoding.
   * Use a symbol (e.g. `Symbol.for('mylib:MyType')`) for built-in or library
   * codecs — symbols can never be accidentally shadowed by a user codec that
   * picks the same string tag. String tags remain supported for user codecs.
   */
  tag: string | symbol;
  /** Returns `true` when this codec should be used to serialize `v`. */
  is: (v: unknown) => v is T;
  /**
   * Converts the value to a JSON-serializable form.
   * `recurse` re-enters the full `encodeArg` pipeline — use it for container
   * types whose contents may themselves need encoding (e.g. Map entries).
   * Simple codecs that only deal with primitives can ignore it.
   */
  encode: (v: T, recurse: (inner: unknown) => unknown) => unknown;
  /**
   * Reconstructs the original value from its encoded form.
   * `recurse` re-enters the full `decodeArg` pipeline — use it for container
   * types that stored recursively-encoded contents.
   */
  decode: (encoded: unknown, recurse: (inner: unknown) => unknown) => T;
  /**
   * Optional. Reconciles `mutated` back onto `original` in place after an IPC
   * round-trip, preserving the caller's object reference.
   *
   * `reconcile` re-enters the full writeBack pipeline — use it when the type
   * contains properties or entries that may themselves need in-place
   * reconciliation.
   *
   * When omitted, the default behaviour applies: own enumerable properties are
   * copied for plain/class-instance objects; arrays are reconciled element-wise.
   */
  writeBack?: (
    original: T,
    mutated: T,
    reconcile: (orig: unknown, mut: unknown) => boolean
  ) => void;
};

export type SharedResourcesConfig = {
  /**
   * Custom codecs for types that cannot be automatically serialized over IPC.
   * Common use cases: class instances (full prototype reconstruction), Symbols,
   * and any other value that `JSON.stringify` cannot faithfully represent.
   *
   * Codecs registered here (parent side) must also be registered in child
   * processes. The easiest way is to call `resource.configure({ codecs })` at
   * the top level of the resource definition file — that module is evaluated
   * in both processes.
   */
  // biome-ignore lint/suspicious/noExplicitAny: see ArgCodec
  codecs?: ArgCodec<any>[];
};
