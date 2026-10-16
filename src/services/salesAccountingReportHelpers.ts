import { isChequeEmMaosPayment } from './paymentStatusHelpers.ts';

export type SalesAccountingStatus = 'PAGO' | 'PENDENTE' | 'CANCELADO';

export type SalesAccountingSummaryItem = {
  cliente?: string | null;
  status?: string | null;
  valorTotal?: number | null;
  valorRecebido?: number | null;
  valorChequeEmMaos?: number | null;
  formaPagamento?: string | null;
  metodoPagamento?: string | null;
  statusContabil?: string | null;
};

type AccountingChequeStatusInput = {
  status?: string | null;
  metodoPagamento?: string | null;
  formaPagamento?: string | null;
  dataCompensacaoCheque?: unknown;
};

const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof (value as { toDate?: unknown })?.toDate === 'function') {
    const parsed = (value as { toDate: () => unknown }).toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime())
      ? parsed
      : null;
  }
  if (typeof (value as { seconds?: unknown })?.seconds === 'number') {
    const parsed = new Date((value as { seconds: number }).seconds * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeAccountingStatus = (
  status?: string | null
): SalesAccountingStatus => {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (normalized === 'PAGO') return 'PAGO';
  if (normalized === 'CANCELADO') return 'CANCELADO';
  return 'PENDENTE';
};

export const getAccountingStatusLabel = (
  item: AccountingChequeStatusInput,
  referenceDate = new Date()
) => {
  const status = normalizeAccountingStatus(item.status);
  if (isChequeEmMaosPayment(item.formaPagamento)) return 'CHEQUE EM MÃOS';
  const method = String(item.metodoPagamento || '')
    .trim()
    .toLowerCase();
  if (method !== 'cheque') return status;
  if (status === 'CANCELADO') return 'CANCELADO';
  if (status === 'PAGO') return 'COMPENSADO';

  const compensationDate = toDateSafe(item.dataCompensacaoCheque);
  if (compensationDate) {
    const compensationDay = new Date(compensationDate);
    compensationDay.setHours(0, 0, 0, 0);
    const referenceDay = new Date(referenceDate);
    referenceDay.setHours(0, 0, 0, 0);
    if (compensationDay.getTime() < referenceDay.getTime()) {
      return 'COMPENSAÇÃO ATRASADA';
    }
  }

  return 'AGUARDANDO COMPENSAÇÃO';
};

export const buildSalesAccountingInsights = (data: {
  itens: SalesAccountingSummaryItem[];
}) => {
  const activeItems = data.itens.filter(
    (item) => normalizeAccountingStatus(item.status) !== 'CANCELADO'
  );
  const paidItems = activeItems.filter(
    (item) => normalizeAccountingStatus(item.status) === 'PAGO'
  );
  const pendingItems = activeItems.filter(
    (item) => normalizeAccountingStatus(item.status) === 'PENDENTE'
  );
  const chequeEmMaosItems = pendingItems.filter((item) =>
    isChequeEmMaosPayment(item.formaPagamento, item.statusContabil)
  );
  const totalGeral = activeItems.reduce(
    (acc, item) => acc + Number(item.valorTotal || 0),
    0
  );
  const totalPago = paidItems.reduce(
    (acc, item) => acc + Number(item.valorRecebido ?? item.valorTotal ?? 0),
    0
  );
  const totalCombinadoPago = paidItems.reduce(
    (acc, item) => acc + Number(item.valorTotal || 0),
    0
  );
  const totalPendente = pendingItems.reduce(
    (acc, item) => acc + Number(item.valorTotal || 0),
    0
  );
  const totalChequeEmMaos = chequeEmMaosItems.reduce(
    (acc, item) =>
      acc +
      Number(
        item.valorChequeEmMaos ??
          item.valorRecebido ??
          item.valorTotal ??
          0
      ),
    0
  );
  const totalCancelado = data.itens
    .filter((item) => normalizeAccountingStatus(item.status) === 'CANCELADO')
    .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const somentePagos = activeItems.length > 0 && pendingItems.length === 0;
  const quantidadePendentes = pendingItems.length;
  const ticketMedio =
    activeItems.length > 0 ? totalGeral / activeItems.length : 0;
  const recebimentoPercentual =
    totalGeral > 0 ? totalCombinadoPago / totalGeral : 0;
  const maiorLancamento = activeItems.reduce(
    (acc, item) => Math.max(acc, Number(item.valorTotal || 0)),
    0
  );
  const totalClientes = new Set(
    data.itens.map((item) => item.cliente || 'Cliente avulso')
  ).size;
  const ajusteRecebimentos = totalPago - totalCombinadoPago;
  const recorteLabel = somentePagos
    ? 'Somente vendas pagas'
    : 'Vendas pagas, pendentes e canceladas';

  return {
    totalGeral,
    totalPago,
    totalCombinadoPago,
    totalPendente,
    totalChequeEmMaos,
    totalCancelado,
    somentePagos,
    quantidadePendentes,
    ticketMedio,
    recebimentoPercentual,
    maiorLancamento,
    totalClientes,
    ajusteRecebimentos,
    recorteLabel,
  };
};

export const buildSalesAccountingClientSummaries = (
  items: SalesAccountingSummaryItem[]
) => {
  const grouped = items.reduce<Record<string, SalesAccountingSummaryItem[]>>(
    (acc, item) => {
      const key = String(item.cliente || 'Cliente avulso').trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  return Object.entries(grouped)
    .map(([cliente, clientItems]) => {
      const insights = buildSalesAccountingInsights({ itens: clientItems });
      return {
        cliente,
        registros: clientItems.length,
        cancelados: clientItems.filter(
          (item) => normalizeAccountingStatus(item.status) === 'CANCELADO'
        ).length,
        totalVendido: insights.totalGeral,
        totalRecebido: insights.totalPago,
        totalPendente: insights.totalPendente,
        ajusteRecebimentos: insights.ajusteRecebimentos,
      };
    })
    .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));
};
