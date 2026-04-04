import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      networkMode: 'offlineFirst',
      refetchOnReconnect: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

export const queryKeys = {
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
  estufasList: (tenantId: string) => ['estufas-list', tenantId] as const,
  estufaDetail: (estufaId: string, tenantId: string) => ['estufa-detail', estufaId, tenantId] as const,
  despesasList: (tenantId: string) => ['despesas-list', tenantId] as const,
  insumosList: (tenantId: string) => ['insumos-list', tenantId] as const,
  clientesList: (tenantId: string) => ['clientes-list', tenantId] as const,
  fornecedoresList: (tenantId: string) => ['fornecedores-list', tenantId] as const,
};
