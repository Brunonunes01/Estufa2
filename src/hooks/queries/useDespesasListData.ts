import { useQuery } from '@tanstack/react-query';
import { listDespesas } from '../../services/despesaService';
import { queryKeys } from '../../lib/queryClient';

export const useDespesasListData = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.despesasList(tenantId || 'none'),
    enabled: !!tenantId,
    staleTime: 1000 * 45,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => listDespesas(tenantId as string),
  });
