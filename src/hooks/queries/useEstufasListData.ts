import { useQuery } from '@tanstack/react-query';
import { listEstufas } from '../../services/estufaService';
import { listActivePlantiosByUser } from '../../services/plantioService';
import { queryKeys } from '../../lib/queryClient';

export const useEstufasListData = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.estufasList(tenantId || 'none'),
    enabled: !!tenantId,
    queryFn: async () => {
      const [estufas, activePlantios] = await Promise.all([
        listEstufas(tenantId as string),
        listActivePlantiosByUser(tenantId as string),
      ]);

      return { estufas, activePlantios };
    },
  });
