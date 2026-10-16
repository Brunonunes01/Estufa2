import { listCaixaPessoas } from './caixaPessoaService';
import { listDespesas } from './despesaService';
import { listAllVendas } from './vendaService';
import { listClientes } from './clienteService';
import { listAllPlantios } from './plantioService';
import {
  FinanceProductionMode,
  matchesDespesaProductionMode,
  matchesVendaProductionMode,
} from './financeProductionScope';
import { buildCaixaMovimentos, filterCaixaMovimentos, NON_CLASSIFIED_ID, summarizeCaixaMovimentos, summarizeCaixaPorPessoa } from './caixaServiceHelpers';
import type { CaixaMovimento, CaixaResumoPessoa, CaixaTipoMov } from './caixaServiceHelpers';

export type { CaixaMovimento, CaixaMovimentoItem, CaixaMovimentosResumo, CaixaResumoPessoa, CaixaTipoMov } from './caixaServiceHelpers';

export type CaixaPeriod = 'today' | '7d' | 'month' | 'all' | 'custom';

export type CaixaResumoData = {
  entradas: number;
  saidas: number;
  saldo: number;
  quantidadeEntradas: number;
  quantidadeSaidas: number;
  entradasPrevistas: number;
  quantidadeEntradasPrevistas: number;
  naoClassificado: number;
  chequesPendentes: CaixaMovimento[];
  porPessoa: CaixaResumoPessoa[];
  movimentos: CaixaMovimento[];
};

export type CaixaDateRange = {
  period: CaixaPeriod;
  from?: Date | null;
  to?: Date | null;
};

const resolveRange = (range: CaixaDateRange) => {
  const now = new Date();
  if (range.period === 'today') {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range.period === '7d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range.period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
  if (range.period === 'all') {
    return { from: new Date(1970, 0, 1), to: new Date(2100, 0, 1) };
  }
  const from = range.from ? new Date(range.from) : new Date(1970, 0, 1);
  from.setHours(0, 0, 0, 0);
  const to = range.to ? new Date(range.to) : new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

export const getCaixaResumo = async (
  tenantId: string,
  range: CaixaDateRange,
  productionMode?: FinanceProductionMode
): Promise<CaixaResumoData> => {
  const [{ from, to }, vendas, despesas, pessoas, clientes, plantios] = await Promise.all([
    Promise.resolve(resolveRange(range)),
    listAllVendas(tenantId),
    listDespesas(tenantId),
    listCaixaPessoas(tenantId),
    listClientes(tenantId),
    productionMode ? listAllPlantios(tenantId) : Promise.resolve([]),
  ]);

  const plantiosMap = Object.fromEntries(
    plantios.map((plantio) => [plantio.id, plantio])
  );
  const scopedVendas = productionMode
    ? vendas.filter((venda) =>
        matchesVendaProductionMode(venda, productionMode, plantiosMap)
      )
    : vendas;
  const scopedDespesas = productionMode
    ? despesas.filter((despesa) =>
        matchesDespesaProductionMode(despesa, productionMode, plantiosMap)
      )
    : despesas;

  const movimentos = buildCaixaMovimentos({
    vendas: scopedVendas,
    despesas: scopedDespesas,
    pessoas,
    clientes,
    from,
    to,
  });
  const resumo = summarizeCaixaMovimentos(movimentos);
  const chequesPendentes = buildCaixaMovimentos({
    vendas: scopedVendas,
    despesas: [],
    pessoas,
    clientes,
    from,
    to,
    includePendingOutsideRange: true,
  })
    .filter((movimento) => movimento.status === 'previsto')
    .sort((a, b) => a.data.getTime() - b.data.getTime());
  const naoClassificado = movimentos
    .filter((movimento) => movimento.status === 'confirmado' && movimento.caixaPessoaId === NON_CLASSIFIED_ID)
    .reduce((total, movimento) => total + movimento.valor, 0);

  return {
    ...resumo,
    naoClassificado,
    chequesPendentes,
    porPessoa: summarizeCaixaPorPessoa(movimentos),
    movimentos,
  };
};

export const getCaixaExtrato = async (
  tenantId: string,
  params: {
    range: CaixaDateRange;
    caixaPessoaId?: string;
    tipo?: 'todos' | CaixaTipoMov;
    busca?: string;
    page?: number;
    pageSize?: number;
  },
  productionMode?: FinanceProductionMode
) => {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(10, params.pageSize || 50);
  const report = await getCaixaRelatorio(tenantId, params, productionMode);
  const start = (page - 1) * pageSize;
  return {
    items: report.items.slice(start, start + pageSize),
    total: report.total,
    hasMore: start + pageSize < report.total,
    resumo: report.resumo,
  };
};

export const getCaixaRelatorio = async (
  tenantId: string,
  params: {
    range: CaixaDateRange;
    caixaPessoaId?: string;
    tipo?: 'todos' | CaixaTipoMov;
    busca?: string;
  },
  productionMode?: FinanceProductionMode
) => {
  const base = await getCaixaResumo(tenantId, params.range, productionMode);
  const filtered = filterCaixaMovimentos(base.movimentos, params);
  return {
    items: filtered,
    total: filtered.length,
    resumo: summarizeCaixaMovimentos(filtered),
  };
};
