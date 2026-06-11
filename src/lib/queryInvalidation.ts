import { queryClient, queryKeys } from './queryClient';

export const invalidateDashboardQuery = async (tenantId: string) => {
  await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(tenantId) });
};

export const invalidateDespesasQueries = async (tenantId: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.despesasList(tenantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.despesasPendingTotal(tenantId) }),
    invalidateDashboardQuery(tenantId),
  ]);
};

export const invalidatePlantioQueries = async (tenantId: string, estufaId?: string) => {
  const tasks: Promise<unknown>[] = [
    invalidateDashboardQuery(tenantId),
    queryClient.invalidateQueries({ queryKey: queryKeys.estufasList(tenantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.plantiosList(tenantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.despesasList(tenantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.despesasPendingTotal(tenantId) }),
  ];

  if (estufaId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.estufaDetail(estufaId, tenantId) }));
  }

  await Promise.all(tasks);
};

export const invalidateVendasQueries = async (tenantId: string, extraKeys: readonly unknown[][] = []) => {
  const tasks: Promise<unknown>[] = [
    invalidateDashboardQuery(tenantId),
    queryClient.invalidateQueries({ queryKey: queryKeys.vendasList(tenantId) }),
  ];

  extraKeys.forEach((queryKey) => {
    tasks.push(queryClient.invalidateQueries({ queryKey }));
  });

  await Promise.all(tasks);
};

export const invalidateClientesQuery = async (tenantId: string) => {
  await queryClient.invalidateQueries({ queryKey: queryKeys.clientesList(tenantId) });
};
