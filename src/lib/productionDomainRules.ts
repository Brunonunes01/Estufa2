export type ProductionOrigin = {
  estufaId?: string | null;
  talhaoId?: string | null;
};

export const hasMixedProductionOrigin = (origin: ProductionOrigin) =>
  Boolean(String(origin.estufaId || '').trim()) && Boolean(String(origin.talhaoId || '').trim());

export const assertProductionOrigin = (origin: ProductionOrigin, entityLabel = 'Registro') => {
  if (hasMixedProductionOrigin(origin)) throw new Error(`${entityLabel} não pode pertencer ao Campo e à Estufa ao mesmo tempo.`);
  if (String(origin.talhaoId || '').trim()) throw new Error(`${entityLabel} de campo/talhão não pode ser criado no modo de estufas.`);
  if (!String(origin.estufaId || '').trim()) throw new Error(`${entityLabel} deve estar vinculado a uma estufa.`);
};

export const assertTenantScope = (tenantId: string | null | undefined, expectedTenantId: string, entityLabel = 'Operação') => {
  const actual = String(tenantId || '').trim();
  const expected = String(expectedTenantId || '').trim();
  if (!expected || !actual || actual !== expected) throw new Error(`${entityLabel} rejeitada por escopo de tenant inválido.`);
};

export const assertSameProductionScope = (values: Array<{ tenantId?: string | null }>, entityLabel = 'Operação') => {
  const tenants = values.map((value) => String(value.tenantId || '').trim()).filter(Boolean);
  if (tenants.length === 0 || tenants.some((tenantId) => tenantId !== tenants[0])) throw new Error(`${entityLabel} possui vínculos de tenant incompatíveis.`);
  return tenants[0];
};

export const assertPositiveQuantityAndPrice = (quantity: number, unitPrice: number) => {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantidade da venda deve ser maior que zero.');
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Preço unitário da venda não pode ser negativo.');
};
