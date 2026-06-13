import { useQuery } from '@tanstack/react-query';
import { listAllEstufasPerformance } from '../services/estufaFinanceService';
import { queryKeys } from '../lib/queryClient';

export const useEstufaPerformance = (tenantId?: string) => {
  return useQuery({
    queryKey: ['estufaPerformance', tenantId],
    queryFn: () => listAllEstufasPerformance(tenantId as string),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};
