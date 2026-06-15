import test from 'node:test';
import assert from 'node:assert/strict';

import { getDashboardPendingTaskCount, selectPrimaryPlantioByEstufa } from '../src/hooks/dashboardMetricsUtils.ts';

test('selectPrimaryPlantioByEstufa prioritizes harvest status over recency', () => {
  const result = selectPrimaryPlantioByEstufa(['estufa-1'], [
    { id: 'a', estufaId: 'estufa-1', status: 'em_crescimento', updatedAt: new Date('2026-06-08') } as any,
    { id: 'b', estufaId: 'estufa-1', status: 'em_colheita', updatedAt: new Date('2026-06-01') } as any,
  ]);

  assert.equal(result['estufa-1']?.id, 'b');
});

test('getDashboardPendingTaskCount prioriza contador agregado quando existir', () => {
  assert.equal(
    getDashboardPendingTaskCount({
      tarefasHojePendentes: 7,
      todayTasks: [{ id: 'a' }, { id: 'b' }],
    }),
    7
  );
});

test('getDashboardPendingTaskCount faz fallback para lista carregada', () => {
  assert.equal(
    getDashboardPendingTaskCount({
      tarefasHojePendentes: null,
      todayTasks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    }),
    3
  );
});
