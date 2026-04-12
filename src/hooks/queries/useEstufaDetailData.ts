import { useQuery } from '@tanstack/react-query';
import { getEstufaById } from '../../services/estufaService';
import { listPlantiosByEstufa } from '../../services/plantioService';
import { queryKeys } from '../../lib/queryClient';

export const useEstufaDetailData = (estufaId?: string, tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.estufaDetail(estufaId || 'none', tenantId || 'none'),
    enabled: !!estufaId && !!tenantId,
    staleTime: 1000 * 45,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: async () => {
      const [estufa, plantios] = await Promise.all([
        getEstufaById(estufaId as string, tenantId as string),
        listPlantiosByEstufa(tenantId as string, estufaId as string),
      ]);

      plantios.sort((a, b) => {
        const aInactive = a.status === 'finalizado' || a.status === 'cancelado';
        const bInactive = b.status === 'finalizado' || b.status === 'cancelado';
        if (aInactive && !bInactive) return 1;
        if (!aInactive && bInactive) return -1;
        return b.dataPlantio.seconds - a.dataPlantio.seconds;
      });

      return { estufa, plantios };
    },
  });
