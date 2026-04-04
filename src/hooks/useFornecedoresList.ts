import { useTenantId } from './useTenantId';
import { useFornecedoresListData } from './queries/useFornecedoresListData';

export const useFornecedoresList = () => {
  const targetId = useTenantId();
  const query = useFornecedoresListData(targetId);

  return {
    targetId,
    fornecedores: query.data || [],
    loading: query.isLoading,
    refreshing: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
};
