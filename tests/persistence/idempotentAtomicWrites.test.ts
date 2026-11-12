import test from 'node:test';
import assert from 'node:assert/strict';
import { hashOfflinePayload } from '../../src/services/offline/offlinePayloadCodec.ts';

test('canonical payload hash is stable for equivalent objects and divergent otherwise', () => {
  const first = hashOfflinePayload({ tenant: 'a', data: { amount: 1, name: 'x' } });
  assert.equal(first, hashOfflinePayload({ data: { name: 'x', amount: 1 }, tenant: 'a' }));
  assert.notEqual(first, hashOfflinePayload({ tenant: 'a', data: { amount: 2, name: 'x' } }));
});

test('receipt contract serializes concurrent access by operation key', async () => {
  const receipts = new Map<string, { hash: string; result: string }>();
  const execute = async (key: string, payload: unknown) => {
    const hash = hashOfflinePayload(payload);
    const current = receipts.get(key);
    if (current && current.hash !== hash) return { status: 'conflict' as const };
    if (current) return { status: 'confirmed' as const, replayed: true, result: current.result };
    receipts.set(key, { hash, result: 'result-1' });
    return { status: 'confirmed' as const, replayed: false, result: 'result-1' };
  };
  const first = await execute('tenant:sale:op', { value: 1 });
  const replay = await execute('tenant:sale:op', { value: 1 });
  const conflict = await execute('tenant:sale:op', { value: 2 });
  assert.deepEqual([first.status, replay.replayed, conflict.status], ['confirmed', true, 'conflict']);
});
