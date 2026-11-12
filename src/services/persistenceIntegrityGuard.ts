import { ServiceError } from './serviceError.ts';

export const assertRequiredPayloadFields = (payload: Record<string, unknown>, fields: string[], operation: string) => {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === null || value === undefined || (typeof value === 'string' && !value.trim());
  });
  if (missing.length > 0) throw new ServiceError('validation', 'Existem dados obrigatórios não informados.', {
    operation, source: 'persistence-boundary', nextStep: `Preencha: ${missing.join(', ')}.`, context: { missingFields: missing },
  });
};

export const assertRelatedTenant = (tenantId: string, relatedTenantId: string | null | undefined, relationship: string) => {
  if (!relatedTenantId || tenantId !== relatedTenantId) throw new ServiceError('authorization', 'O vínculo informado não pertence à conta ativa.', {
    operation: 'save', source: 'persistence-boundary', nextStep: 'Recarregue os dados da conta ativa.', context: { relationship },
  });
  return tenantId;
};
