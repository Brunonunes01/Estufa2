import test from 'node:test';
import assert from 'node:assert/strict';
import { readCompound } from '../src/services/compoundRead.ts';

test('legacy records with absent optional fields remain readable', async () => {
  const legacy = { id: 'legacy-1', status: 'ativo' };
  const result = await readCompound([
    { name: 'cycle', kind: 'essential', dependentActions: ['save'], read: async () => legacy },
    { name: 'optional-notes', kind: 'optional', read: async () => { throw { code: 'PGRST204' }; } },
  ]);
  assert.deepEqual(result.sources.cycle.data, legacy);
  assert.equal(result.sources['optional-notes'].status, 'failed');
  assert.equal(result.sources['optional-notes'].error?.category, 'data-contract');
  assert.deepEqual(result.blockedActions, []);
});
