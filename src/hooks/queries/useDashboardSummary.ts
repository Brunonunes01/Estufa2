import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../../services/dashboardService';
import { queryKeys } from '../../lib/queryClient';

export const useDashboardSummary = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.dashboard(tenantId || 'none'),
    queryFn: () => getDashboardSummary(tenantId as string),
    enabled: !!tenantId,
  });
