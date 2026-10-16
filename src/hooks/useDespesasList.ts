import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { deleteDespesa, updateDespesaStatus } from '../services/despesaService';
import { useTenantId } from './useTenantId';
import { useDespesasListData } from './queries/useDespesasListData';
import { queryKeys } from '../lib/queryClient';
import { invalidateDespesasQueries } from '../lib/queryInvalidation';
import { listAllPlantios } from '../services/plantioService';
import {
  FinanceProductionMode,
  matchesDespesaProductionMode,
} from '../services/financeProductionScope';

export const useDespesasList = (productionMode?: FinanceProductionMode) => {
  const targetId = useTenantId();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const query = useDespesasListData(targetId);
  const plantiosQuery = useQuery({
    queryKey: queryKeys.plantiosList(targetId || 'none'),
    enabled: !!targetId && !!productionMode,
    queryFn: () => listAllPlantios(targetId as string),
  });
  const despesasRaw = query.data || [];
  const refetchDespesas = query.refetch;
  const refetchPlantios = plantiosQuery.refetch;
  const plantiosMap = useMemo(
    () =>
      Object.fromEntries(
        (plantiosQuery.data || []).map((plantio) => [plantio.id, plantio])
      ),
    [plantiosQuery.data]
  );

  const despesas = useMemo(() => {
    return despesasRaw.filter(
      (despesa) =>
        despesa.tipoGasto !== 'investimento_inicial' &&
        (!productionMode ||
          matchesDespesaProductionMode(despesa, productionMode, plantiosMap))
    );
  }, [despesasRaw, plantiosMap, productionMode]);

  const totals = useMemo(() => {
    const totalGasto = despesas.reduce((acc, curr) => acc + curr.valor, 0);
    const totalPendente = despesas
      .filter((despesa) => despesa.status === 'pendente')
      .reduce((acc, curr) => acc + curr.valor, 0);

    return { totalGasto, totalPendente };
  }, [despesas]);

  const invalidateList = async () => {
    if (!targetId) return;
    await invalidateDespesasQueries(targetId);
  };

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchDespesas(),
      productionMode ? refetchPlantios() : Promise.resolve(),
    ]);
  }, [productionMode, refetchDespesas, refetchPlantios]);

  const deleteMutation = useMutation({
    mutationFn: async (despesaId: string) => {
      if (!targetId) throw new Error('Tenant inválido');
      setDeletingId(despesaId);
      await deleteDespesa(despesaId, targetId);
    },
    onSuccess: invalidateList,
    onSettled: () => setDeletingId(null),
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({
      despesaId,
      pagamentoPara,
      dataPagamento,
    }: {
      despesaId: string;
      pagamentoPara: string;
      dataPagamento: Date;
    }) => {
      if (!targetId) throw new Error('Tenant inválido');
      setPayingId(despesaId);
      await updateDespesaStatus(
        despesaId,
        'pago',
        targetId,
        pagamentoPara,
        undefined,
        dataPagamento
      );
    },
    onSuccess: invalidateList,
    onSettled: () => setPayingId(null),
  });

  return {
    targetId,
    despesas,
    totalGasto: totals.totalGasto,
    totalPendente: totals.totalPendente,
    loading:
      query.isLoading || (productionMode ? plantiosQuery.isLoading : false),
    refreshing:
      query.isFetching || (productionMode ? plantiosQuery.isFetching : false),
    isError: query.isError || (productionMode ? plantiosQuery.isError : false),
    refetch,
    deleteDespesa: deleteMutation.mutateAsync,
    markDespesaAsPaid: markAsPaidMutation.mutateAsync,
    deletingId,
    payingId,
  };
};
