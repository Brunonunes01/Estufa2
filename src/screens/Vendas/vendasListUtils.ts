export type FinancialStatus = 'pendente' | 'pago' | 'cancelado';
export type FinanceView = 'todos' | 'receber' | 'cheques' | 'recebidas';

export const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime())
      ? parsed
      : null;
  }
  if (typeof value?.seconds === 'number') {
    const parsed = new Date(value.seconds * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatCurrencyBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getVendaQuantidade = (venda: any) =>
  Number(venda.quantidade || venda.itens?.[0]?.quantidade || 0);
export const getVendaPrecoUnitario = (venda: any) =>
  Number(venda.precoUnitario || venda.itens?.[0]?.valorUnitario || 0);
export const getVendaTotal = (venda: any) =>
  Number(
    venda.valorTotal || getVendaQuantidade(venda) * getVendaPrecoUnitario(venda)
  );
export const getVendaValorRecebido = (venda: any) => {
  if (
    venda?.valorRecebido !== null &&
    venda?.valorRecebido !== undefined &&
    venda?.valorRecebido !== ''
  ) {
    const value = Number(venda.valorRecebido);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return getVendaTotal(venda);
};
export const getVendaData = (venda: any) =>
  venda.dataVenda || venda.dataColheita || null;
export const getVendaUnidade = (venda: any) =>
  venda.unidade || venda.itens?.[0]?.unidade || 'un';

export const getFinancialStatus = (venda: any): FinancialStatus => {
  const statusPagamento = String(venda?.statusPagamento || '')
    .trim()
    .toLowerCase();
  if (statusPagamento === 'cancelado') return 'cancelado';
  if (
    statusPagamento === 'pendente' ||
    statusPagamento === 'atrasado' ||
    (!statusPagamento &&
      (venda.metodoPagamento === 'prazo' || venda.metodoPagamento === 'cheque'))
  ) {
    return 'pendente';
  }
  return 'pago';
};

export const getSaleStatusBadgeLabel = (
  status: FinancialStatus,
  paymentMethod?: unknown
) => {
  const statusLabel = status.toUpperCase();
  const methodLabel = String(paymentMethod || '')
    .trim()
    .toUpperCase();
  return status === 'pago' && methodLabel
    ? `${statusLabel} • ${methodLabel}`
    : statusLabel;
};

export const resolveVendaDeletionTarget = (venda: any) => {
  const colheitaId = String(venda?.colheitaId || '').trim();
  if (colheitaId) return { type: 'colheita' as const, id: colheitaId };

  const vendaId = String(venda?.id || '').trim();
  return vendaId ? { type: 'venda' as const, id: vendaId } : null;
};

export const matchesFinanceView = (venda: any, view: FinanceView) => {
  const status = getFinancialStatus(venda);
  const method = String(
    venda?.metodoPagamento || venda?.formaPagamento || ''
  ).toLowerCase();
  return (
    view === 'todos' ||
    (view === 'receber' && status === 'pendente') ||
    (view === 'cheques' && status === 'pendente' && method === 'cheque') ||
    (view === 'recebidas' && status === 'pago')
  );
};

export const buildVendasStats = (vendas: any[]) => {
  const data = {
    totalValor: 0,
    totalItens: 0,
    totalItensFinanceiros: 0,
    totalRecebido: 0,
    totalReceber: 0,
    totalCaixas: 0,
    ticketMedio: 0,
    porMetodo: {} as Record<string, number>,
  };

  vendas.forEach((venda) => {
    const total = getVendaTotal(venda);
    const status = getFinancialStatus(venda);
    const ignoreFinancial = status === 'cancelado';
    const unidade = String(getVendaUnidade(venda)).toLowerCase().trim();
    const isCaixa =
      unidade === 'caixas' || unidade === 'caixa' || unidade === 'cx';

    data.totalItens += 1;
    if (ignoreFinancial) return;

    data.totalItensFinanceiros += 1;
    data.totalValor += total;
    if (status === 'pago') data.totalRecebido += getVendaValorRecebido(venda);
    if (status === 'pendente') data.totalReceber += total;
    if (isCaixa) data.totalCaixas += getVendaQuantidade(venda);

    const metodoRaw = String(
      venda.metodoPagamento || venda.formaPagamento || 'não definido'
    );
    const metodo = metodoRaw.charAt(0).toUpperCase() + metodoRaw.slice(1);
    data.porMetodo[metodo] = (data.porMetodo[metodo] || 0) + total;
  });

  data.ticketMedio =
    data.totalItensFinanceiros > 0
      ? data.totalValor / data.totalItensFinanceiros
      : 0;
  return data;
};
