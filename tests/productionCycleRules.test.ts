import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from '../src/lib/timestamp.ts';
import { assertCycleOperationDate, assertHarvestWeights } from '../src/lib/productionCycleRules.ts';

const plantio = { dataPlantio: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')), dataInicio: undefined, cicloDias: 10 };

test('bloqueia operação antes do ciclo mínimo', () => {
  assert.throws(() => assertCycleOperationDate(plantio, Timestamp.fromDate(new Date('2026-01-05T00:00:00Z'))), /mínimo 10/);
  assert.doesNotThrow(() => assertCycleOperationDate(plantio, Timestamp.fromDate(new Date('2026-01-11T00:00:00Z'))));
});

test('preserva a relação entre peso bruto e líquido', () => {
  assert.doesNotThrow(() => assertHarvestWeights(10, 8));
  assert.throws(() => assertHarvestWeights(8, 10), /líquido/);
});
