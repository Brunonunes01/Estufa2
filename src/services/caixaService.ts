import { listCaixaPessoas } from './caixaPessoaService';
import { listDespesas } from './despesaService';
import { listAllVendas } from './vendaService';

export type CaixaPeriod = 'today' | '7d' | 'month' | 'all' | 'custom';
export type CaixaTipoMov = 'entrada' | 'saida';

export type CaixaMovimento = {
  id: string;
  tipo: CaixaTipoMov;
  origem: 'venda' | 'despesa';
  caixaPessoaId: string;
  caixaPessoaNome: string;
  valor: number;
  descricao: string;
  data: Date;
  metodoPagamento?: string;
  observacoes?: string;
};

export type CaixaResumoPessoa = {
  caixaPessoaId: string;
  caixaPessoaNome: string;
  entradas: number;
  saidas: number;
  saldo: number;
};

export type CaixaResumoData = {
  entradas: number;
  saidas: number;
  saldo: number;
  naoClassificado: number;
  porPessoa: CaixaResumoPessoa[];
  movimentos: CaixaMovimento[];
};

export type CaixaDateRange = {
  period: CaixaPeriod;
  from?: Date | null;
  to?: Date | null;
};

const NON_CLASSIFIED_ID = 'nao_classificado';
const NON_CLASSIFIED_NAME = 'Nao classificado';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value?.seconds === 'number') {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

const inRange = (date: Date, from: Date, to: Date) => date.getTime() >= from.getTime() && date.getTime() <= to.getTime();

export const getCaixaResumo = async (tenantId: string, range: CaixaDateRange): Promise<CaixaResumoData> => {
  const [{ from, to }, vendas, despesas, pessoas] = await Promise.all([
    Promise.resolve(resolveRange(range)),
    listAllVendas(tenantId),
    listDespesas(tenantId),
    listCaixaPessoas(tenantId),
  ]);

  const pessoaMap = new Map<string, string>(pessoas.map((p) => [p.id, p.nome]));
  const movimentos: CaixaMovimento[] = [];

  vendas.forEach((venda: any) => {
    const status = String(venda?.statusPagamento || '').toLowerCase();
    if (status !== 'pago') return;
    const data = toDate(venda?.dataVenda);
    if (!data || !inRange(data, from, to)) return;
    const fallbackTotal =
      Number(venda?.quantidade || venda?.itens?.[0]?.quantidade || 0) *
      Number(venda?.precoUnitario || venda?.itens?.[0]?.valorUnitario || 0);
    const produto =
      String(venda?.cultura || '').trim() ||
      String(venda?.itens?.[0]?.descricao || '').trim() ||
      'Venda';
    const pessoaId = venda?.pagamentoPara || NON_CLASSIFIED_ID;
    movimentos.push({
      id: `venda:${venda.id}`,
      tipo: 'entrada',
      origem: 'venda',
      caixaPessoaId: pessoaId,
      caixaPessoaNome: pessoaMap.get(pessoaId) || NON_CLASSIFIED_NAME,
      valor: Number(venda?.valorTotal || fallbackTotal || 0),
      descricao: produto,
      data,
      metodoPagamento: String(venda?.metodoPagamento || venda?.formaPagamento || '').trim() || undefined,
      observacoes: venda?.observacoes || undefined,
    });
  });

  despesas.forEach((despesa: any) => {
    const status = String(despesa?.statusPagamento || despesa?.status || '').toLowerCase();
    if (status !== 'pago') return;

    // Ignorar despesas de mudas (investimento inicial) no caixa conforme solicitado
    const tipoGasto = String(despesa?.tipo_gasto || despesa?.tipoGasto || '').toLowerCase().trim();
    if (tipoGasto === 'investimento_inicial') return;

    const data = toDate(despesa?.dataDespesa);
    if (!data || !inRange(data, from, to)) return;
    const pessoaId = despesa?.pagamentoPara || NON_CLASSIFIED_ID;
    movimentos.push({
      id: `despesa:${despesa.id}`,
      tipo: 'saida',
      origem: 'despesa',
      caixaPessoaId: pessoaId,
      caixaPessoaNome: pessoaMap.get(pessoaId) || NON_CLASSIFIED_NAME,
      valor: Number(despesa?.valor || 0),
      descricao: String(despesa?.descricao || 'Despesa'),
      data,
      observacoes: despesa?.observacoes || undefined,
    });
  });

  movimentos.sort((a, b) => b.data.getTime() - a.data.getTime());

  const resumoMap = new Map<string, CaixaResumoPessoa>();
  let entradas = 0;
  let saidas = 0;
  let naoClassificado = 0;

  movimentos.forEach((mov) => {
    const current = resumoMap.get(mov.caixaPessoaId) || {
      caixaPessoaId: mov.caixaPessoaId,
      caixaPessoaNome: mov.caixaPessoaNome,
      entradas: 0,
      saidas: 0,
      saldo: 0,
    };
    if (mov.tipo === 'entrada') {
      entradas += mov.valor;
      current.entradas += mov.valor;
    } else {
      saidas += mov.valor;
      current.saidas += mov.valor;
    }
    current.saldo = current.entradas - current.saidas;
    if (mov.caixaPessoaId === NON_CLASSIFIED_ID) naoClassificado += mov.valor;
    resumoMap.set(mov.caixaPessoaId, current);
  });

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    naoClassificado,
    porPessoa: Array.from(resumoMap.values()).sort((a, b) => b.saldo - a.saldo),
    movimentos,
  };
};

export const getCaixaExtrato = async (
  tenantId: string,
  params: {
    range: CaixaDateRange;
    caixaPessoaId?: string;
    tipo?: 'todos' | CaixaTipoMov;
    busca?: string; // Novo parametro para busca por descricao
    page?: number;
    pageSize?: number;
  }
) => {
  const base = await getCaixaResumo(tenantId, params.range);
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(10, params.pageSize || 50);
  const filtered = base.movimentos.filter((mov) => {
    const byPessoa = !params.caixaPessoaId || mov.caixaPessoaId === params.caixaPessoaId;
    const byTipo = !params.tipo || params.tipo === 'todos' || mov.tipo === params.tipo;
    
    // Busca por descricao ou pessoa
    const term = (params.busca || '').toLowerCase().trim();
    const byBusca = !term || 
      mov.descricao.toLowerCase().includes(term) || 
      mov.caixaPessoaNome.toLowerCase().includes(term);

    return byPessoa && byTipo && byBusca;
  });
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return {
    items,
    total: filtered.length,
    hasMore: start + pageSize < filtered.length,
  };
};
