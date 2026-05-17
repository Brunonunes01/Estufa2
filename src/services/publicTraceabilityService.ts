const sanitize = (value?: string | null) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');

export const createTraceabilityPublicToken = () => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TRC-${timePart}${randomPart}`;
};

export const createTraceabilityPublicTokenFromId = (id?: string | null, prefix = 'TRC') => {
  const safeId = sanitize(id).toUpperCase();
  const safePrefix = sanitize(prefix).toUpperCase() || 'TRC';
  if (!safeId) return createTraceabilityPublicToken();
  return `${safePrefix}-${safeId}`;
};

export const resolveTraceabilityPublicToken = (record: { id?: string; traceabilityPublicToken?: string | null }) => {
  const explicit = sanitize(record.traceabilityPublicToken);
  if (explicit) return explicit;

  const id = sanitize(record.id);
  if (!id) return '';
  return `VENDA-${id}`;
};

export const getPublicTraceabilityBaseUrl = () => {
  const envUrl = String(process.env.EXPO_PUBLIC_TRACEABILITY_PUBLIC_URL || '').trim();
  return envUrl ? envUrl.replace(/\/+$/, '') : '';
};

export const buildPublicTraceabilityLookupUrl = (token?: string | null) => {
  const safeToken = sanitize(token);
  if (!safeToken) return '';

  const base = getPublicTraceabilityBaseUrl();
  if (!base) return '';
  return `${base}?token=${encodeURIComponent(safeToken)}`;
};

export const buildPublicTraceabilityQrUrl = (lookupUrl?: string | null) => {
  const url = String(lookupUrl || '').trim();
  if (!url) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
};

export const buildTraceabilityTextPayload = (input: {
  token: string;
  produto: string;
  origem: string;
  loteOrigem: string;
  loteColheita: string;
  dataVenda: string;
  quantidade: string;
}) => {
  return [
    'Rastreabilidade SGE',
    `Codigo: ${input.token}`,
    `Produto: ${input.produto}`,
    `Origem: ${input.origem}`,
    `Lote de origem: ${input.loteOrigem}`,
    `Lote de colheita: ${input.loteColheita}`,
    `Data da venda: ${input.dataVenda}`,
    `Quantidade: ${input.quantidade}`,
  ].join('\n');
};
