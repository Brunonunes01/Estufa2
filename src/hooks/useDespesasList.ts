import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDespesa, updateDespesaStatus } from '../services/despesaService';
import { useTenantId } from './useTenantId';
import { useDespesasListData } from './queries/useDespesasListData';
import { queryKeys } from '../lib/queryClient';

export const useDespesasList = () => {
  const targetId = useTenantId();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const query = useDespesasListData(targetId);
  const despesas = query.data || [];

  const totals = useMemo(() => {
    const totalGasto = despesas.reduce((acc, curr) => acc + curr.valor, 0);
    const totalPendente = despesas
      .filter((despesa) => despesa.status === 'pendente')
      .reduce((acc, curr) => acc + curr.valor, 0);

    return { totalGasto, totalPendente };
  }, [despesas]);

  const invalidateList = async () => {
    if (!targetId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.despesasList(targetId) });
  };

  const deleteMutation = useMutation({
    mutationFn: async (despesaId: string) => {
      if (!targetId) throw new Error("Tenant inválido");
      setDeletingId(despesaId);
      await deleteDespesa(despesaId, targetId);
    },
    onSuccess: invalidateList,
    onSettled: () => setDeletingId(null),
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (despesaId: string) => {
      if (!targetId) throw new Error("Tenant inválido");
      setPayingId(despesaId);
      await updateDespesaStatus(despesaId, 'pago', targetId);
    },
    onSuccess: invalidateList,
    onSettled: () => setPayingId(null),
  });

  return {
    targetId,
    despesas,
    totalGasto: totals.totalGasto,
    totalPendente: totals.totalPendente,
    loading: query.isLoading,
    refreshing: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    deleteDespesa: deleteMutation.mutateAsync,
    markDespesaAsPaid: markAsPaidMutation.mutateAsync,
    deletingId,
    payingId,
  };
};
