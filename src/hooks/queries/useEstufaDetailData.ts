import { useQuery } from '@tanstack/react-query';
import { getEstufaById } from '../../services/estufaService';
import { listPlantiosByEstufa } from '../../services/plantioService';
import { listManejosByEstufa } from '../../services/manejoService';
import { queryKeys } from '../../lib/queryClient';

const getPlantioSortSeconds = (value?: { seconds?: number; toDate?: () => Date } | null) => {
  if (!value) return 0;
  if (typeof value.seconds === 'number') return value.seconds;
  if (typeof value.toDate === 'function') {
    return Math.floor(value.toDate().getTime() / 1000);
  }
  return 0;
};

export const useEstufaDetailData = (estufaId?: string, tenantId?: string) =>
  useQuery({
    queryKey: queryKeys.estufaDetail(estufaId || 'none', tenantId || 'none'),
    enabled: !!estufaId && !!tenantId,
    staleTime: 1000 * 45,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: async () => {
      const [estufa, plantios, manejos] = await Promise.all([
        getEstufaById(estufaId as string, tenantId as string),
        listPlantiosByEstufa(tenantId as string, estufaId as string),
        listManejosByEstufa(tenantId as string, estufaId as string),
      ]);

      plantios.sort((a, b) => {
        const aInactive = a.status === 'finalizado' || a.status === 'cancelado';
        const bInactive = b.status === 'finalizado' || b.status === 'cancelado';
        if (aInactive && !bInactive) return 1;
        if (!aInactive && bInactive) return -1;
        return getPlantioSortSeconds(b.dataPlantio) - getPlantioSortSeconds(a.dataPlantio);
      });

      return { estufa, plantios, manejos };
    },
  });
