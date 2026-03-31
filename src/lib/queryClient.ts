import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
  estufasList: (tenantId: string) => ['estufas-list', tenantId] as const,
  estufaDetail: (estufaId: string, tenantId: string) => ['estufa-detail', estufaId, tenantId] as const,
};
