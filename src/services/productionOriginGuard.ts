const hasValue = (value?: string | null) =>
  String(value || '').trim().length > 0;

export const hasMixedProductionOrigin = (origin: {
  estufaId?: string | null;
  talhaoId?: string | null;
}) => hasValue(origin.estufaId) && hasValue(origin.talhaoId);

export const assertProductionOriginNotMixed = (
  origin: { estufaId?: string | null; talhaoId?: string | null },
  entityLabel = 'Registro'
) => {
  if (hasMixedProductionOrigin(origin)) {
    throw new Error(
      `${entityLabel} não pode pertencer ao Campo e à Estufa ao mesmo tempo.`
    );
  }
};
