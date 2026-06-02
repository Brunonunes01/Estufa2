import { useQuery } from '@tanstack/react-query';
import { listTalhoes } from '../../services/talhaoService';
import { queryKeys } from '../../lib/queryClient';

export const useTalhoesListData = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.talhoesList(tenantId || 'none'),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: async () => listTalhoes(tenantId as string),
  });
