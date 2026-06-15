import { Timestamp } from '../lib/timestamp.ts';

type DashboardSummaryDocRow = {
  total_receber?: unknown;
  total_recebido?: unknown;
  total_pagar?: unknown;
  tarefas_hoje_pendentes?: unknown;
  updated_at?: unknown;
} | null | undefined;

const toFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const normalizeDashboardSummaryDoc = (data: DashboardSummaryDocRow) => {
  const totalReceber = toFiniteNumber(data?.total_receber);
  const totalPagar = toFiniteNumber(data?.total_pagar);

  if (totalReceber === null || totalPagar === null) {
    return null;
  }

  const totalRecebido = toFiniteNumber(data?.total_recebido);
  const tarefasHojePendentes = toFiniteNumber(data?.tarefas_hoje_pendentes);
  const updatedAtValue = data?.updated_at;

  return {
    totalReceber,
    totalRecebido: totalRecebido ?? 0,
    totalPagar,
    tarefasHojePendentes: tarefasHojePendentes ?? null,
    updatedAt:
      typeof updatedAtValue === 'string' || updatedAtValue instanceof Date
        ? Timestamp.fromDate(new Date(updatedAtValue))
        : null,
    source: 'summary_doc' as const,
  };
};

export const filterPlantiosByKnownEstufas = <T extends { estufaId?: string | null }>(
  estufaIds: string[],
  plantios: T[]
) => {
  const allowed = new Set(estufaIds);
  return plantios.filter((item) => !!item.estufaId && allowed.has(item.estufaId));
};
