import { useQuery } from '@tanstack/react-query';
import { listFornecedores } from '../../services/fornecedorService';
import { queryKeys } from '../../lib/queryClient';

export const useFornecedoresListData = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.fornecedoresList(tenantId || 'none'),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => listFornecedores(tenantId as string),
  });
