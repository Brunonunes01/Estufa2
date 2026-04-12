import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../../services/dashboardService';
import { queryKeys } from '../../lib/queryClient';

export const useDashboardSummary = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.dashboard(tenantId || 'none'),
    queryFn: () => getDashboardSummary(tenantId as string),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
