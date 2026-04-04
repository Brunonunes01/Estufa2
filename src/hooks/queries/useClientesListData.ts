import { useQuery } from '@tanstack/react-query';
import { listClientes } from '../../services/clienteService';
import { queryKeys } from '../../lib/queryClient';

export const useClientesListData = (tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.clientesList(tenantId || 'none'),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => listClientes(tenantId as string),
  });
