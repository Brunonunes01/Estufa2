import type { Plantio } from '../types/domain.ts';
import { Timestamp } from './timestamp.ts';

const toDate = (value: Plantio['dataPlantio'] | Plantio['dataInicio']) => value && typeof (value as any).toDate === 'function' ? (value as any).toDate() as Date : null;
export const getCycleStartDate = (plantio: Pick<Plantio, 'dataPlantio' | 'dataInicio'>) => toDate(plantio.dataPlantio) || toDate(plantio.dataInicio);
export const getCycleMinimumOperationDate = (plantio: Pick<Plantio, 'dataPlantio' | 'dataInicio' | 'cicloDias'>) => {
  const start = getCycleStartDate(plantio); const days = Number(plantio.cicloDias || 0);
  if (!start || !Number.isFinite(days) || days <= 0) return null;
  const minimum = new Date(start); minimum.setDate(minimum.getDate() + days); return minimum;
};
export const isBeforeCycleMinimumDate = (plantio: Pick<Plantio, 'dataPlantio' | 'dataInicio' | 'cicloDias'>, operationDate: Timestamp) => {
  const minimum = getCycleMinimumOperationDate(plantio); return minimum ? operationDate.toMillis() < minimum.getTime() : false;
};
export const assertCycleOperationDate = (plantio: Pick<Plantio, 'dataPlantio' | 'dataInicio' | 'cicloDias'>, operationDate: Timestamp, entityLabel = 'Venda') => {
  const minimum = getCycleMinimumOperationDate(plantio);
  if (minimum && operationDate.toMillis() < minimum.getTime()) throw new Error(`${entityLabel} bloqueada: este ciclo exige no mínimo ${Number(plantio.cicloDias)} dia(s) após o plantio. Data mínima: ${minimum.toLocaleDateString('pt-BR')}.`);
};
export const assertHarvestWeights = (gross?: number, net?: number) => {
  if (gross != null && (!Number.isFinite(gross) || gross < 0)) throw new Error('Peso bruto da colheita inválido.');
  if (net != null && (!Number.isFinite(net) || net < 0)) throw new Error('Peso líquido da colheita inválido.');
  if (gross != null && net != null && net > gross) throw new Error('O peso líquido não pode ser maior que o peso bruto.');
};
