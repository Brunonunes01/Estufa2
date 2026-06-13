import { useQuery } from '@tanstack/react-query';
import { getGlobalStats } from '../services/globalStatsService';

export const useGlobalStats = (tenantId?: string) => {
  return useQuery({
    queryKey: ['globalStats', tenantId],
    queryFn: () => getGlobalStats(tenantId as string),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
