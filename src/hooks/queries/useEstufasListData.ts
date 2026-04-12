import { useQuery } from '@tanstack/react-query';
import { listEstufas } from '../../services/estufaService';
import { listActivePlantiosByUser } from '../../services/plantioService';
import { queryKeys } from '../../lib/queryClient';

export const useEstufasListData = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.estufasList(tenantId || 'none'),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: async () => {
      const [estufas, activePlantios] = await Promise.all([
        listEstufas(tenantId as string),
        listActivePlantiosByUser(tenantId as string),
      ]);

      return { estufas, activePlantios };
    },
  });
