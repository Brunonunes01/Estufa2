import { useTenantId } from './useTenantId';
import { useClientesListData } from './queries/useClientesListData';

export const useClientesList = () => {
  const targetId = useTenantId();
  const query = useClientesListData(targetId);

  return {
    targetId,
    clientes: query.data || [],
    loading: query.isLoading,
    refreshing: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
};
