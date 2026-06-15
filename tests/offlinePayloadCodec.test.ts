import test from 'node:test';
import assert from 'node:assert/strict';

import { deserializeOfflinePayload, serializeOfflinePayload } from '../src/services/offline/offlinePayloadCodec.ts';

test('serializeOfflinePayload preserva primitivos e estrutura aninhada', () => {
  const payload = {
    tenantId: 't1',
    ativo: true,
    itens: [{ quantidade: 2, observacao: null }],
  };

  assert.deepEqual(serializeOfflinePayload(payload), payload);
});

test('serializeOfflinePayload converte Date e timestamp-like para marcadores estaveis', () => {
  const payload = {
    createdAt: new Date('2026-06-14T12:00:00.000Z'),
    updatedAt: {
      toDate: () => new Date('2026-06-14T13:00:00.000Z'),
      toMillis: () => 1781442000000,
    },
  };

  assert.deepEqual(serializeOfflinePayload(payload), {
    createdAt: { __type: 'date', value: '2026-06-14T12:00:00.000Z' },
    updatedAt: { __type: 'timestamp', value: 1781442000000 },
  });
});

test('deserializeOfflinePayload reidrata datas a partir dos marcadores serializados', () => {
  const restored = deserializeOfflinePayload({
    createdAt: { __type: 'date', value: '2026-06-14T12:00:00.000Z' },
    updatedAt: { __type: 'timestamp', value: 1781442000000 },
    nested: [{ when: { __type: 'date', value: '2026-06-15T08:30:00.000Z' } }],
  }) as {
    createdAt: Date;
    updatedAt: Date;
    nested: Array<{ when: Date }>;
  };

  assert.equal(restored.createdAt instanceof Date, true);
  assert.equal(restored.createdAt.toISOString(), '2026-06-14T12:00:00.000Z');
  assert.equal(restored.updatedAt instanceof Date, true);
  assert.equal(restored.updatedAt.toISOString(), '2026-06-14T13:00:00.000Z');
  assert.equal(restored.nested[0].when instanceof Date, true);
  assert.equal(restored.nested[0].when.toISOString(), '2026-06-15T08:30:00.000Z');
});
