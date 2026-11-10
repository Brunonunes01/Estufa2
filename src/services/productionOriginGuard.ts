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

/**
 * New operational writes belong exclusively to a conventional greenhouse.
 * Legacy records may still be read, but they must not be created or
 * reclassified through the active application flows.
 */
export const assertGreenhouseProductionOrigin = (
  origin: { estufaId?: string | null; talhaoId?: string | null },
  entityLabel = 'Registro'
) => {
  if (hasValue(origin.talhaoId)) {
    throw new Error(
      `${entityLabel} de campo/talhão não pode ser criado no modo de estufas.`
    );
  }
  if (!hasValue(origin.estufaId)) {
    throw new Error(`${entityLabel} deve estar vinculado a uma estufa.`);
  }
};
