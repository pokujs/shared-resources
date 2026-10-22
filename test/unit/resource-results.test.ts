import type {
  IPCRemoteProcedureCallResultMessage,
  IPCResourceResultMessage,
} from '../../src/types.js';
import nodeAssert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'poku';
import {
  decodeArg,
  encodeArg,
  handleRemoteProcedureCall,
  handleRequestResource,
  SHARED_RESOURCE_MESSAGE_TYPES,
} from '../../src/shared-resources.js';

test('Resource state and RPC results survive JSON IPC transport', async () => {
  const messages: unknown[] = [];
  const child = Object.assign(new EventEmitter(), {
    send(message: unknown) {
      messages.push(JSON.parse(JSON.stringify(message)));
      return true;
    },
  });
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const state = {
    createdAt,
    values: new Map([['initial', 1n]]),
    update(input: Map<string, bigint>) {
      input.set('changed', 2n);
      this.values.set('updated', 3n);
      return new Set([4n]);
    },
  };
  const registry = { resource: { state } };
  await handleRequestResource(
    {
      type: SHARED_RESOURCE_MESSAGE_TYPES.REQUEST_RESOURCE,
      name: 'resource',
      module: 'unused',
      id: 'request',
    },
    registry,
    child
  );
  const response = messages.shift() as IPCResourceResultMessage;
  nodeAssert.strictEqual(response.error, undefined);
  nodeAssert.deepStrictEqual(response.rpcs, ['update']);
  const decodedState = decodeArg(response.value) as typeof state;
  nodeAssert.deepStrictEqual(decodedState.createdAt, createdAt);
  nodeAssert.deepStrictEqual(decodedState.values, new Map([['initial', 1n]]));
  nodeAssert.strictEqual('update' in decodedState, false);

  await handleRemoteProcedureCall(
    {
      type: SHARED_RESOURCE_MESSAGE_TYPES.REMOTE_PROCEDURE_CALL,
      name: 'resource',
      method: 'update',
      args: [encodeArg(new Map([['original', 0n]]))],
      id: 'rpc',
    },
    registry,
    child
  );
  const result = messages.shift() as IPCRemoteProcedureCallResultMessage;
  nodeAssert.strictEqual(result.error, undefined);
  nodeAssert.ok(result.value);
  nodeAssert.deepStrictEqual(decodeArg(result.value.result), new Set([4n]));
  const latest = decodeArg(result.value.latest) as typeof state;
  nodeAssert.deepStrictEqual(
    latest.values,
    new Map([
      ['initial', 1n],
      ['updated', 3n],
    ])
  );
  nodeAssert.deepStrictEqual(
    decodeArg(result.value.mutatedArgs[0]),
    new Map([
      ['original', 0n],
      ['changed', 2n],
    ])
  );
});
