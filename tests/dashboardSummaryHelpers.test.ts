import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterPlantiosByKnownEstufas,
  normalizeDashboardSummaryDoc,
} from '../src/services/dashboardSummaryHelpers.ts';

test('normalizeDashboardSummaryDoc normaliza payload valido do resumo', () => {
  const result = normalizeDashboardSummaryDoc({
    total_receber: 1200,
    total_recebido: 900,
    total_pagar: 300,
    tarefas_hoje_pendentes: 4,
    updated_at: '2026-06-15T10:00:00.000Z',
  });

  assert.equal(result?.totalReceber, 1200);
  assert.equal(result?.totalRecebido, 900);
  assert.equal(result?.totalPagar, 300);
  assert.equal(result?.tarefasHojePendentes, 4);
  assert.ok(result?.updatedAt);
});

test('normalizeDashboardSummaryDoc rejeita totais invalidos', () => {
  assert.equal(
    normalizeDashboardSummaryDoc({
      total_receber: '1200',
      total_pagar: 300,
    }),
    null
  );
});

test('filterPlantiosByKnownEstufas remove plantios fora do escopo conhecido', () => {
  const result = filterPlantiosByKnownEstufas(['estufa-1'], [
    { id: 'a', estufaId: 'estufa-1' },
    { id: 'b', estufaId: 'estufa-2' },
    { id: 'c' },
  ]);

  assert.deepEqual(result, [{ id: 'a', estufaId: 'estufa-1' }]);
});
