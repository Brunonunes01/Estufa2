import type { AccessSnapshot, TenantOperation } from '../lib/accessControl.ts';
import { assertTenantPermission } from '../lib/accessControl.ts';

export const isTenantIdValid = (tenantId?: string | null): tenantId is string =>
  !!tenantId && !!tenantId.trim();

export const assertTenantId = (tenantId?: string | null): string => {
  if (!isTenantIdValid(tenantId)) {
    throw new Error('Tenant invalido para consulta protegida.');
  }
  return tenantId.trim();
};

export const assertSameTenantScope = (expectedTenantId?: string | null, receivedTenantId?: string | null) => {
  const normalizedExpected = assertTenantId(expectedTenantId);
  const normalizedReceived = assertTenantId(receivedTenantId);

  if (normalizedExpected !== normalizedReceived) {
    throw new Error('Escopo de tenant divergente para operacao protegida.');
  }

  return normalizedExpected;
};

export const assertTenantOperation = ({
  expectedTenantId,
  receivedTenantId,
  access,
  operation,
}: {
  expectedTenantId?: string | null;
  receivedTenantId?: string | null;
  access: Pick<AccessSnapshot, 'canRead' | 'canWrite' | 'canDelete' | 'canManageSharing'>;
  operation: TenantOperation;
}) => {
  const tenantId = assertSameTenantScope(expectedTenantId, receivedTenantId);
  assertTenantPermission(access, operation);
  return tenantId;
};

/**
 * Ponto de referencia para politicas de seguranca no backend:
 * - Todas as queries devem ser filtradas por tenant/userId.
 * - O frontend nao substitui as regras; apenas reforca o escopo esperado.
 * - Regras recomendadas: permitir leitura/escrita somente quando request.auth.uid
 *   tiver vinculo explicito com o tenantId consultado.
 */
export const TENANT_SECURITY_NOTE = 'tenant_scoped_queries_required';
