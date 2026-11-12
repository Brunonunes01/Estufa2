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

test('compound read reports essential failure and blocks only dependent actions', async () => {
  const result = await readCompound([
    { name: 'estufas', kind: 'essential', dependentActions: ['create-cycle'], read: async () => { throw new Error('database down'); } },
    { name: 'profile', kind: 'auxiliary', read: async () => ({ name: 'safe' }) },
  ]);
  assert.equal(result.sources.estufas.status, 'failed');
  assert.equal(result.sources.estufas.error?.context.source, 'estufas');
  assert.deepEqual(result.sources.profile.data, { name: 'safe' });
  assert.deepEqual(result.blockedActions, ['create-cycle']);
  assert.equal(result.degraded, true);
});
