import { useMemo } from 'react';
import { useTenantId } from './useTenantId';
import { useInsumosListData } from './queries/useInsumosListData';

export const useInsumosList = () => {
  const targetId = useTenantId();
  const query = useInsumosListData(targetId);

  const insumos = query.data || [];

  const lowStockCount = useMemo(
    () =>
      insumos.filter(
        (item) => item.estoqueMinimo !== null && item.estoqueMinimo !== undefined && item.estoqueAtual <= item.estoqueMinimo
      ).length,
    [insumos]
  );

  return {
    targetId,
    insumos,
    lowStockCount,
    loading: query.isLoading,
    refreshing: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
};
