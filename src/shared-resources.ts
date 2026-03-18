import type { ChildProcess } from 'node:child_process';
import type {
  ArgCodec,
  IPCEventEmitter,
  IPCMessage,
  IPCRemoteProcedureCallMessage,
  IPCRemoteProcedureCallResultMessage,
  IPCRequestResourceMessage,
  IPCResourceResultMessage,
  IPCResponse,
  MethodsToRPC,
  ResourceContext,
  SendIPCMessageOptions,
  SharedResourceEntry,
} from './types.js';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { findFileFromStack } from 'poku/plugins';
import { arrayCodec } from './codecs/array.js';
import { bigIntCodec } from './codecs/bigint.js';
import { dateCodec } from './codecs/date.js';
import { mapCodec } from './codecs/map.js';
import { isPlainObject, objectCodec } from './codecs/object.js';
import { setCodec } from './codecs/set.js';
import { undefinedCodec } from './codecs/undefined.js';
import { ResourceRegistry } from './resource-registry.js';

const isWindows = process.platform === 'win32';

const resourceRegistry = new ResourceRegistry<SharedResourceEntry>();
const moduleCounters = new Map<string, number>();

export const SHARED_RESOURCE_MESSAGE_TYPES = {
  REQUEST_RESOURCE: 'shared_resources_requestResource',
  RESOURCE_RESULT: 'shared_resources_resourceResult',
  REMOTE_PROCEDURE_CALL: 'shared_resources_remoteProcedureCall',
  REMOTE_PROCEDURE_CALL_RESULT: 'shared_resources_remoteProcedureCallResult',
} as const;

export const globalRegistry = resourceRegistry.getRegistry();

const create = <T>(
  factory: () => T,
  options?: {
    module?: string;
    onDestroy?: (instance: Awaited<T>) => void | Promise<void>;
  }
): ResourceContext<Awaited<T>> => {
  let module: string;

  if (options?.module) module = options.module;
  else {
    const err = { stack: '' };
    Error.captureStackTrace(err, create);
    module = findFileFromStack(err.stack);
  }

  const count = (moduleCounters.get(module) ?? 0) + 1;
  moduleCounters.set(module, count);
  const name = count === 1 ? module : `${module}#${count}`;

  return {
    factory,
    onDestroy: options?.onDestroy,
    name,
    module,
  } as ResourceContext<Awaited<T>>;
};

const use = async <T>(
  context: ResourceContext<T>
): Promise<MethodsToRPC<T>> => {
  const { name } = context;

  // Parent Process (Host)
  if (!process.send || resourceRegistry.getIsRegistering()) {
    const existing = resourceRegistry.get(name);
    if (existing) {
      return existing.state as MethodsToRPC<T>;
    }

    const state = await context.factory();
    resourceRegistry.register(name, {
      state,
      onDestroy: context.onDestroy as
        | ((instance: unknown) => void | Promise<void>)
        | undefined,
    });

    return state as MethodsToRPC<T>;
  }

  if (!context.module)
    throw new Error(
      `Resource "${name}" is missing "module". Use createResource() or set module explicitly.`
    );

  return requestResource(name, context.module) as unknown as MethodsToRPC<T>;
};

export const sendIPCMessage = <TResponse>(
  options: SendIPCMessageOptions<TResponse>
): Promise<TResponse> => {
  const {
    message,
    validator,
    timeout,
    emitter = process,
    sender = process.send?.bind(process),
  } = options;

  return new Promise((resolve, reject) => {
    if (!sender) {
      reject(new Error('IPC sender is not available'));
      return;
    }

    let timer: NodeJS.Timeout | undefined;

    const handleMessage = (response: unknown) => {
      if (validator(response)) {
        cleanup();
        resolve(response);
      }
    };

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      emitter.off('message', handleMessage);
    };

    if (typeof timeout === 'number' && timeout > 0) {
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`IPC request timed out after ${timeout}ms`));
      }, timeout);
    }

    emitter.on('message', handleMessage);

    try {
      sender(message);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

const requestResource = async (name: string, module: string) => {
  const requestId = `${name}-${Date.now()}-${Math.random()}`;

  const response = await sendIPCMessage<IPCResourceResultMessage>({
    message: {
      type: SHARED_RESOURCE_MESSAGE_TYPES.REQUEST_RESOURCE,
      name,
      module,
      id: requestId,
    },
    validator: (message): message is IPCResourceResultMessage =>
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === SHARED_RESOURCE_MESSAGE_TYPES.RESOURCE_RESULT &&
      'id' in message &&
      message.id === requestId,
  });

  if (response.error || !response.value || !response.rpcs)
    throw new Error(
      response.error ?? `Invalid response for resource "${name}"`
    );

  return constructSharedResourceWithRPCs(
    response.value as Record<string, unknown>,
    response.rpcs,
    name
  );
};

const remoteProcedureCall = async (
  name: string,
  method: string,
  args: unknown[]
) => {
  const requestId = `${name}-${method}-${Date.now()}-${Math.random()}`;

  const response = await sendIPCMessage<IPCRemoteProcedureCallResultMessage>({
    message: {
      type: SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL,
      name,
      method,
      args: args.map(encodeArg),
      id: requestId,
    } satisfies IPCRemoteProcedureCallMessage,
    validator: (message): message is IPCRemoteProcedureCallResultMessage =>
      typeof message === 'object' &&
      message !== null &&
      'id' in message &&
      message.id === requestId,
  });

  if (response.error || !response.value)
    throw new Error(
      response.error ?? `Invalid RPC response for "${name}.${method}"`
    );

  return response.value;
};

const ENC_TAG = '__sr_enc';

// Converts a codec tag (string or symbol) to the string stored in the wire
// format. Symbol tags are globally-registered (Symbol.for), so Symbol.keyFor
// always returns their key string.
const tagToWire = (tag: string | symbol): string =>
  typeof tag === 'symbol' ? Symbol.keyFor(tag)! : tag;

// Checked in declaration order: first match wins, so user-registered codecs
// (prepended by configureCodecs) always take precedence over built-ins.
// biome-ignore lint/suspicious/noExplicitAny: stores heterogeneous codec types; is() always guards encode() calls
let argCodecs: ArgCodec<any>[] = [
  undefinedCodec,
  bigIntCodec,
  dateCodec,
  mapCodec,
  setCodec,
  arrayCodec,
  objectCodec,
];

/**
 * Registers (or merges) custom codecs into the global codec registry.
 * New codecs are prepended so they are checked before built-ins, allowing
 * subclass overrides. A later codec with the same tag replaces the earlier one.
 */
// biome-ignore lint/suspicious/noExplicitAny: see argCodecs
export const configureCodecs = (codecs: ArgCodec<any>[]): void => {
  const incoming = new Map(codecs.map((c) => [c.tag, c]));
  argCodecs = [...codecs, ...argCodecs.filter((c) => !incoming.has(c.tag))];
};

export const encodeArg = (v: unknown): unknown => {
  for (const codec of argCodecs)
    if (codec.is(v))
      return {
        [ENC_TAG]: 'c',
        t: tagToWire(codec.tag),
        v: codec.encode(v, encodeArg),
      };
  // Class instances without a registered codec: encode own enumerable data
  // properties (functions skipped). The prototype cannot survive a text-based
  // IPC round-trip; writeBack reconciles the data back onto the original
  // instance on the caller side, preserving its prototype chain.
  if (typeof v === 'object' && v !== null)
    return {
      [ENC_TAG]: 'c',
      t: tagToWire(objectCodec.tag),
      v: objectCodec.encode(v as Record<string, unknown>, encodeArg),
    };
  return v;
};

const decodeEncoded = (enc: Record<string, unknown>): unknown => {
  if (enc[ENC_TAG] !== 'c') return enc;
  const codec = argCodecs.find((c) =>
    typeof c.tag === 'symbol' ? Symbol.keyFor(c.tag) === enc.t : c.tag === enc.t
  );
  if (!codec)
    throw new Error(
      `No codec registered for tag "${String(enc.t)}". Register it via resource.configure({ codecs }) in the resource file or pass it to sharedResources({ codecs }) for the parent process.`
    );
  return codec.decode(enc.v, decodeArg);
};

export const decodeArg = (v: unknown): unknown => {
  if (isPlainObject(v)) return ENC_TAG in v ? decodeEncoded(v) : v;
  return v;
};

const tryReconcileInPlace = (original: unknown, mutated: unknown): boolean => {
  for (const codec of argCodecs) {
    if (codec.writeBack && codec.is(original) && codec.is(mutated)) {
      codec.writeBack(original, mutated, tryReconcileInPlace);
      return true;
    }
  }
  // Class instances without a codec: reconcile own enumerable data properties.
  if (
    typeof original === 'object' &&
    original !== null &&
    !Array.isArray(original) &&
    typeof mutated === 'object' &&
    mutated !== null &&
    !Array.isArray(mutated)
  ) {
    objectCodec.writeBack!(
      original as Record<string, unknown>,
      mutated as Record<string, unknown>,
      tryReconcileInPlace
    );
    return true;
  }
  return false;
};

export const writeBack = (original: unknown, mutated: unknown): void => {
  tryReconcileInPlace(original, mutated);
};

export const extractFunctionNames = (obj: Record<string, unknown>) => {
  const seen = new Set<string>();
  let current = obj;

  while (
    current !== Object.prototype &&
    Object.getPrototypeOf(current) !== null
  ) {
    for (const key of Object.getOwnPropertyNames(current)) {
      if (typeof obj[key] !== 'function' || key === 'constructor') continue;

      seen.add(key);
    }

    current = Object.getPrototypeOf(current);
  }

  return Array.from(seen);
};

export const setupSharedResourceIPC = (
  child: IPCEventEmitter | ChildProcess,
  registry: Record<string, SharedResourceEntry> = globalRegistry
): void => {
  child.on('message', async (message: IPCMessage) => {
    if (message.type === SHARED_RESOURCE_MESSAGE_TYPES.REQUEST_RESOURCE)
      await handleRequestResource(message, registry, child);
    else if (
      message.type === SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL
    )
      await handleRemoteProcedureCall(message, registry, child);
  });
};

const loadModuleResources = async (module: string) => {
  resourceRegistry.setIsRegistering(true);

  try {
    const modulePath = isWindows ? pathToFileURL(module).href : module;
    const mod: Record<string, unknown> = await import(modulePath);

    for (const key in mod) {
      if (!Object.prototype.hasOwnProperty.call(mod, key)) continue;

      const exported = mod[key];

      if (
        exported &&
        typeof exported === 'object' &&
        'factory' in exported &&
        typeof exported.factory === 'function'
      )
        await use(exported as ResourceContext<unknown>);
    }
  } finally {
    resourceRegistry.setIsRegistering(false);
  }
};

export const handleRequestResource = async (
  message: IPCRequestResourceMessage,
  registry: Record<string, SharedResourceEntry>,
  child: IPCEventEmitter | ChildProcess
) => {
  try {
    if (!registry[message.name]) await loadModuleResources(message.module);

    const entry = registry[message.name];
    if (!entry) {
      child.send({
        type: SHARED_RESOURCE_MESSAGE_TYPES.RESOURCE_RESULT,
        name: message.name,
        id: message.id,
        error: `Resource "${message.name}" not found in module "${message.module}"`,
      } satisfies IPCResponse);
      return;
    }

    const rpcs = extractFunctionNames(entry.state as Record<string, unknown>);

    child.send({
      type: SHARED_RESOURCE_MESSAGE_TYPES.RESOURCE_RESULT,
      name: message.name,
      value: entry.state,
      rpcs,
      id: message.id,
    } satisfies IPCResourceResultMessage);
  } catch (error) {
    child.send({
      type: SHARED_RESOURCE_MESSAGE_TYPES.RESOURCE_RESULT,
      name: message.name,
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    } satisfies IPCResponse);
  }
};

export const handleRemoteProcedureCall = async (
  message: IPCRemoteProcedureCallMessage,
  registry: Record<string, SharedResourceEntry>,
  child: IPCEventEmitter | ChildProcess
) => {
  const entry = registry[message.name];
  if (!entry) {
    child.send({
      type: SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL_RESULT,
      id: message.id,
      error: `Resource "${message.name}" not found`,
    } satisfies IPCResponse);
    return;
  }

  const state = entry.state as Record<string, unknown>;

  if (!message.method) {
    child.send({
      type: SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL_RESULT,
      id: message.id,
      error: 'Method name is missing',
    } satisfies IPCResponse);
    return;
  }

  const methodCandidate = state[message.method];
  if (typeof methodCandidate !== 'function') {
    child.send({
      type: SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL_RESULT,
      id: message.id,
      error: `Method "${message.method}" not found on resource "${message.name}"`,
    } satisfies IPCResponse);
    return;
  }

  try {
    const method = methodCandidate.bind(entry.state);
    const callArgs = (message.args || []).map(decodeArg);
    const result = await method(...callArgs);

    child.send({
      type: SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL_RESULT,
      id: message.id,
      value: {
        result,
        latest: state,
        mutatedArgs: callArgs.map(encodeArg),
      },
    } satisfies IPCResponse);
  } catch (error) {
    child.send({
      type: SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL_RESULT,
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    } satisfies IPCResponse);
  }
};

const constructSharedResourceWithRPCs = (
  target: Record<string, unknown>,
  rpcs: string[],
  name: string
) => {
  if (rpcs.length === 0) return target;

  return new Proxy(target, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && rpcs.includes(prop)) {
        return async (...args: unknown[]) => {
          const rpcResult = await remoteProcedureCall(name, prop, args);
          const decodedMutatedArgs = rpcResult.mutatedArgs.map(decodeArg);

          for (let i = 0; i < args.length; i++)
            writeBack(args[i], decodedMutatedArgs[i]);

          for (const rpcKey of rpcs) {
            if (rpcKey in rpcResult.latest) {
              delete rpcResult.latest[rpcKey];
            }
          }

          Object.assign(target, rpcResult.latest);
          return rpcResult.result;
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
};

export const resource = {
  create,
  use,
  /**
   * Registers custom codecs for the current process (child side).
   * Call this at the top level of your resource definition file so it runs
   * during module evaluation in both the child and (via `loadModuleResources`)
   * the parent process.
   *
   * Multiple calls merge by tag — a later codec with the same tag replaces the
   * earlier one, so resource files can each configure their own codecs safely.
   */
  // biome-ignore lint/suspicious/noExplicitAny: see configureCodecs
  configure: (config: { codecs?: ArgCodec<any>[] }) => {
    if (config.codecs && config.codecs.length > 0)
      configureCodecs(config.codecs);
  },
} as const;
