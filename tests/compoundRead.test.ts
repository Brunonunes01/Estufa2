import test from 'node:test';
import assert from 'node:assert/strict';
import { readCompound } from '../src/services/compoundRead.ts';

test('compound read preserves source and degrades auxiliary failures', async () => {
  const result = await readCompound([
    { name: 'summary', kind: 'essential', read: async () => ({ total: 1 }) },
    { name: 'alerts', kind: 'auxiliary', read: async () => { throw new Error('alerts unavailable'); } },
    { name: 'tips', kind: 'optional', read: async () => { throw new Error('tips unavailable'); } },
  ]);
  assert.deepEqual(result.data.summary, { total: 1 });
  assert.deepEqual(result.degradedSources.sort(), ['alerts', 'tips']);
  assert.equal(result.errors.alerts.context.source, 'alerts');
  assert.equal(result.errors.tips.context.source, 'tips');
});

test('compound read fails with the essential source identity', async () => {
  await assert.rejects(() => readCompound([{ name: 'estufas', kind: 'essential', read: async () => { throw new Error('database down'); } }]), (error: unknown) => {
    assert.equal((error as { context: { source: string } }).context.source, 'estufas');
    return true;
  });
});
