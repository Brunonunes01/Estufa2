import test from 'node:test';
import assert from 'node:assert/strict';

import { selectPrimaryPlantioByEstufa } from '../src/hooks/dashboardMetricsUtils.ts';

test('selectPrimaryPlantioByEstufa prioritizes harvest status over recency', () => {
  const result = selectPrimaryPlantioByEstufa(['estufa-1'], [
    { id: 'a', estufaId: 'estufa-1', status: 'em_crescimento', updatedAt: new Date('2026-06-08') } as any,
    { id: 'b', estufaId: 'estufa-1', status: 'em_colheita', updatedAt: new Date('2026-06-01') } as any,
  ]);

  assert.equal(result['estufa-1']?.id, 'b');
});
