export const assertTenantId = (tenantId?: string | null): string => {
  if (!tenantId || !tenantId.trim()) {
    throw new Error('Tenant inválido para consulta protegida.');
  }
  return tenantId.trim();
};

/**
 * Ponto de referência para políticas de segurança no backend:
 * - Todas as queries devem ser filtradas por tenant/userId.
 * - O frontend não substitui as regras; apenas reforça o escopo esperado.
 * - Regras recomendadas: permitir leitura/escrita somente quando request.auth.uid
 *   tiver vínculo explícito com o tenantId consultado.
 */
export const TENANT_SECURITY_NOTE = 'tenant_scoped_queries_required';
