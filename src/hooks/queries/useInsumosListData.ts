import { useQuery } from '@tanstack/react-query';
import { listInsumos } from '../../services/insumoService';
import { queryKeys } from '../../lib/queryClient';

export const useInsumosListData = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.insumosList(tenantId || 'none'),
    enabled: !!tenantId,
    staleTime: 1000 * 45,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => listInsumos(tenantId as string),
  });
