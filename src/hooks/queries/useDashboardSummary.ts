import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { getDashboardSummary } from '../../services/dashboardService';
import { queryKeys } from '../../lib/queryClient';
import { useAuth } from '../useAuth';
import { acceptOperationResponse, captureOperationContext } from '../../services/operationContextGuard';

export const useDashboardSummary = (tenantId?: string) => {
  const { user, selectedTenantId } = useAuth();
  const currentRef = useRef({ authUserId: user?.uid || '', tenantId: selectedTenantId || tenantId || '' });
  currentRef.current = { authUserId: user?.uid || '', tenantId: selectedTenantId || tenantId || '' };
  return useQuery({
    queryKey: queryKeys.dashboard(tenantId || 'none'),
    queryFn: async () => {
      const captured = captureOperationContext(currentRef.current);
      const value = await getDashboardSummary(tenantId as string);
      return acceptOperationResponse(captured, currentRef.current, value);
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};
