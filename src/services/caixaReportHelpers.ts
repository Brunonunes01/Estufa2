import type { CaixaMovimento } from './caixaServiceHelpers';

export type CaixaReportPaymentSummary = {
  metodo: string;
  quantidade: number;
  confirmado: number;
  previsto: number;
};

export type CaixaReportStats = {
  vendasConfirmadas: number;
  vendasPrevistas: number;
  despesasConfirmadas: number;
  totalCaixas: number;
  totalItensVenda: number;
  quantidadesPorUnidade: Array<{ unidade: string; quantidade: number }>;
  pagamentos: CaixaReportPaymentSummary[];
};

const normalizeUnit = (value?: string) => {
  const unit = String(value || 'un')
    .trim()
    .toLowerCase();
  if (unit === 'caixa' || unit === 'caixas' || unit === 'cx') return 'caixas';
  if (unit === 'maco' || unit === 'macos') return 'maços';
  if (unit === 'unidade' || unit === 'unidades') return 'un';
  return unit || 'un';
};

const normalizePaymentMethod = (value?: string) =>
  String(value || 'Não informado')
    .trim()
    .replace(/_/g, ' ')
    .toUpperCase();

export const summarizeCaixaReport = (
  movimentos: CaixaMovimento[]
): CaixaReportStats => {
  const quantities = new Map<string, number>();
  const payments = new Map<string, CaixaReportPaymentSummary>();
  let vendasConfirmadas = 0;
  let vendasPrevistas = 0;
  let despesasConfirmadas = 0;
  let totalCaixas = 0;
  let totalItensVenda = 0;

  movimentos.forEach((movimento) => {
    if (movimento.origem === 'despesa') {
      despesasConfirmadas += 1;
      return;
    }

    if (movimento.status === 'previsto') vendasPrevistas += 1;
    else vendasConfirmadas += 1;

    totalItensVenda += movimento.itens.length;
    movimento.itens.forEach((item) => {
      const unit = normalizeUnit(item.unidade);
      const amount = Number(item.quantidade || 0);
      quantities.set(unit, (quantities.get(unit) || 0) + amount);
      if (unit === 'caixas') totalCaixas += amount;
    });

    const method = normalizePaymentMethod(movimento.metodoPagamento);
    const current = payments.get(method) || {
      metodo: method,
      quantidade: 0,
      confirmado: 0,
      previsto: 0,
    };
    current.quantidade += 1;
    if (movimento.status === 'previsto') current.previsto += movimento.valor;
    else current.confirmado += movimento.valor;
    payments.set(method, current);
  });

  return {
    vendasConfirmadas,
    vendasPrevistas,
    despesasConfirmadas,
    totalCaixas,
    totalItensVenda,
    quantidadesPorUnidade: Array.from(quantities.entries())
      .map(([unidade, quantidade]) => ({ unidade, quantidade }))
      .sort((a, b) => a.unidade.localeCompare(b.unidade)),
    pagamentos: Array.from(payments.values()).sort((a, b) =>
      a.metodo.localeCompare(b.metodo)
    ),
  };
};
