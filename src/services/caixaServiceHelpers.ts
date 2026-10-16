export type CaixaTipoMov = 'entrada' | 'saida';

export type CaixaMovimentoItem = {
  descricao: string;
  quantidade: number;
  unidade?: string;
  valorUnitario: number;
  valorTotal: number;
};

export type CaixaMovimento = {
  id: string;
  referenciaId: string;
  tipo: CaixaTipoMov;
  origem: 'venda' | 'despesa';
  status: 'confirmado' | 'previsto';
  caixaPessoaId: string;
  caixaPessoaNome: string;
  valor: number;
  descricao: string;
  data: Date;
  dataVenda?: Date;
  dataRecebimento?: Date;
  dataPagamento?: Date;
  dataVencimento?: Date;
  dataCompensacaoCheque?: Date;
  dentroDoPeriodo: boolean;
  statusFinanceiro?: string;
  metodoPagamento?: string;
  observacoes?: string;
  clienteNome?: string;
  categoria?: string;
  origemProducao?: string;
  valorCombinado?: number;
  valorRecebido?: number;
  quantidade?: number;
  unidade?: string;
  valorUnitario?: number;
  itens: CaixaMovimentoItem[];
};

export type CaixaResumoPessoa = {
  caixaPessoaId: string;
  caixaPessoaNome: string;
  entradas: number;
  saidas: number;
  saldo: number;
  quantidadeEntradas: number;
  quantidadeSaidas: number;
  entradasPrevistas: number;
  quantidadeEntradasPrevistas: number;
  ticketMedioEntradas: number;
  ultimaMovimentacao?: Date;
};

export type CaixaMovimentosResumo = {
  entradas: number;
  saidas: number;
  saldo: number;
  quantidadeEntradas: number;
  quantidadeSaidas: number;
  entradasPrevistas: number;
  quantidadeEntradasPrevistas: number;
};

type CaixaRawRecord = Record<string, any>;

export const NON_CLASSIFIED_ID = 'nao_classificado';
export const NON_CLASSIFIED_NAME = 'Nao classificado';
export const PENDING_CHEQUE_ID = 'cheque_pendente';
export const PENDING_CHEQUE_NAME = 'Aguardando compensacao';

export const toCaixaDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof (value as { toDate?: unknown })?.toDate === 'function') {
    const date = (value as { toDate: () => unknown }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof (value as { seconds?: unknown })?.seconds === 'number') {
    const date = new Date((value as { seconds: number }).seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isInRange = (date: Date, from: Date, to: Date) =>
  date.getTime() >= from.getTime() && date.getTime() <= to.getTime();

const normalizeVendaItens = (venda: CaixaRawRecord): CaixaMovimentoItem[] => {
  const rawItems = Array.isArray(venda.itens) ? venda.itens : [];
  const items = rawItems
    .map((item: CaixaRawRecord) => {
      const quantidade = Number(item?.quantidade || 0);
      const valorUnitario = Number(item?.valorUnitario || 0);
      return {
        descricao: String(item?.descricao || 'Produto').trim() || 'Produto',
        quantidade,
        unidade: String(item?.unidade || '').trim() || undefined,
        valorUnitario,
        valorTotal: quantidade * valorUnitario,
      };
    })
    .filter(
      (item: CaixaMovimentoItem) => item.quantidade > 0 || item.valorTotal > 0
    );

  if (items.length > 0) return items;

  const quantidade = Number(venda?.quantidade || 0);
  const valorUnitario = Number(venda?.precoUnitario || 0);
  if (quantidade <= 0 && valorUnitario <= 0) return [];
  return [
    {
      descricao: String(venda?.cultura || 'Produto').trim() || 'Produto',
      quantidade,
      unidade: String(venda?.unidade || '').trim() || undefined,
      valorUnitario,
      valorTotal: quantidade * valorUnitario,
    },
  ];
};

const getVendaOrigemProducao = (venda: CaixaRawRecord) => {
  const originType = String(venda?.originType || '').toLowerCase();
  
  if (originType === 'seedling_lote') return 'Mudas';
  if (originType === 'resale_lote') return 'Revenda';
  if (venda?.talhaoId) return 'Campo';
  return 'Estufa';
};

export const buildCaixaMovimentos = ({
  vendas,
  despesas,
  pessoas,
  clientes,
  from,
  to,
  includePendingOutsideRange = false,
}: {
  vendas: CaixaRawRecord[];
  despesas: CaixaRawRecord[];
  pessoas: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  from: Date;
  to: Date;
  includePendingOutsideRange?: boolean;
}): CaixaMovimento[] => {
  const pessoaMap = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa.nome]));
  const clienteMap = new Map(
    clientes.map((cliente) => [cliente.id, cliente.nome])
  );
  const movimentos: CaixaMovimento[] = [];

  vendas.forEach((venda) => {
    const paymentStatus = String(venda?.statusPagamento || '').toLowerCase();
    const paymentMethod = String(
      venda?.metodoPagamento || venda?.formaPagamento || ''
    ).toLowerCase();
    const isPaid = paymentStatus === 'pago';
    const isPendingCheque =
      paymentMethod === 'cheque' &&
      (paymentStatus === 'pendente' || paymentStatus === 'atrasado');
    if (!isPaid && !isPendingCheque) return;
    const dataVenda = toCaixaDate(venda?.dataVenda);
    const dataRecebimento = toCaixaDate(venda?.dataRecebimento);
    const dataVencimento = toCaixaDate(venda?.dataVencimento);
    const dataCompensacaoCheque = toCaixaDate(venda?.dataCompensacaoCheque);
    const data = toCaixaDate(
      isPaid
        ? dataRecebimento || dataVenda
        : dataCompensacaoCheque || dataVencimento
    );
    if (!data) return;
    const dentroDoPeriodo = isInRange(data, from, to);
    if (!dentroDoPeriodo && !(isPendingCheque && includePendingOutsideRange))
      return;

    const itens = normalizeVendaItens(venda);
    const fallbackTotal = itens.reduce(
      (total, item) => total + item.valorTotal,
      0
    );
    const pessoaId = isPendingCheque
      ? PENDING_CHEQUE_ID
      : String(venda?.pagamentoPara || NON_CLASSIFIED_ID);
    const clienteId = String(venda?.clienteId || '');
    const firstItem = itens[0];
    const descricaoBase =
      String(venda?.cultura || '').trim() || firstItem?.descricao || 'Venda';
    const valorCombinado = Number(venda?.valorTotal || fallbackTotal || 0);
    const valorRecebido =
      venda?.valorRecebido !== null &&
      venda?.valorRecebido !== undefined &&
      Number.isFinite(Number(venda.valorRecebido))
        ? Number(venda.valorRecebido)
        : valorCombinado;

    movimentos.push({
      id: `venda:${venda.id}`,
      referenciaId: String(venda.id),
      tipo: 'entrada',
      origem: 'venda',
      status: isPaid ? 'confirmado' : 'previsto',
      caixaPessoaId: pessoaId,
      caixaPessoaNome: isPendingCheque
        ? PENDING_CHEQUE_NAME
        : pessoaMap.get(pessoaId) || NON_CLASSIFIED_NAME,
      valor: isPaid ? valorRecebido : valorCombinado,
      descricao:
        itens.length > 1
          ? `${descricaoBase} + ${itens.length - 1} item(ns)`
          : descricaoBase,
      data,
      dataVenda: dataVenda || undefined,
      dataRecebimento: dataRecebimento || undefined,
      dataVencimento: dataVencimento || undefined,
      dataCompensacaoCheque: dataCompensacaoCheque || undefined,
      dentroDoPeriodo,
      statusFinanceiro: isPendingCheque
        ? 'aguardando_compensacao'
        : paymentStatus,
      metodoPagamento:
        String(venda?.metodoPagamento || venda?.formaPagamento || '').trim() ||
        undefined,
      observacoes: String(venda?.observacoes || '').trim() || undefined,
      clienteNome: clienteId
        ? clienteMap.get(clienteId) || 'Cliente nao identificado'
        : 'Cliente avulso',
      origemProducao: getVendaOrigemProducao(venda),
      valorCombinado,
      valorRecebido: isPaid ? valorRecebido : undefined,
      quantidade: firstItem?.quantidade,
      unidade: firstItem?.unidade,
      valorUnitario: firstItem?.valorUnitario,
      itens,
    });
  });

  despesas.forEach((despesa) => {
    const status = String(
      despesa?.statusPagamento || despesa?.status || ''
    ).toLowerCase();
    if (status !== 'pago') return;
    const tipoGasto = String(despesa?.tipo_gasto || despesa?.tipoGasto || '')
      .toLowerCase()
      .trim();
    if (tipoGasto === 'investimento_inicial') return;
    const dataPagamento = toCaixaDate(despesa?.dataPagamento);
    const data = dataPagamento || toCaixaDate(despesa?.dataDespesa);
    if (!data || !isInRange(data, from, to)) return;
    const pessoaId = String(despesa?.pagamentoPara || NON_CLASSIFIED_ID);

    movimentos.push({
      id: `despesa:${despesa.id}`,
      referenciaId: String(despesa.id),
      tipo: 'saida',
      origem: 'despesa',
      status: 'confirmado',
      caixaPessoaId: pessoaId,
      caixaPessoaNome: pessoaMap.get(pessoaId) || NON_CLASSIFIED_NAME,
      valor: Number(despesa?.valor || 0),
      descricao: String(despesa?.descricao || 'Despesa'),
      data,
      dataPagamento: dataPagamento || undefined,
      dataVencimento: toCaixaDate(despesa?.dataVencimento) || undefined,
      dentroDoPeriodo: true,
      statusFinanceiro: 'pago',
      observacoes: String(despesa?.observacoes || '').trim() || undefined,
      categoria: String(despesa?.categoria || '').trim() || undefined,
      itens: [],
    });
  });

  return movimentos.sort((a, b) => b.data.getTime() - a.data.getTime());
};

export const summarizeCaixaMovimentos = (
  movimentos: CaixaMovimento[]
): CaixaMovimentosResumo => {
  let entradas = 0;
  let saidas = 0;
  let quantidadeEntradas = 0;
  let quantidadeSaidas = 0;
  let entradasPrevistas = 0;
  let quantidadeEntradasPrevistas = 0;
  movimentos.forEach((movimento) => {
    if (movimento.status !== 'confirmado') {
      if (movimento.tipo === 'entrada') {
        entradasPrevistas += movimento.valor;
        quantidadeEntradasPrevistas += 1;
      }
      return;
    }
    if (movimento.tipo === 'entrada') {
      entradas += movimento.valor;
      quantidadeEntradas += 1;
    } else {
      saidas += movimento.valor;
      quantidadeSaidas += 1;
    }
  });
  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    quantidadeEntradas,
    quantidadeSaidas,
    entradasPrevistas,
    quantidadeEntradasPrevistas,
  };
};

export const summarizeCaixaPorPessoa = (
  movimentos: CaixaMovimento[]
): CaixaResumoPessoa[] => {
  const resumoMap = new Map<string, CaixaResumoPessoa>();
  movimentos.forEach((movimento) => {
    if (movimento.status !== 'confirmado') return;
    const current = resumoMap.get(movimento.caixaPessoaId) || {
      caixaPessoaId: movimento.caixaPessoaId,
      caixaPessoaNome: movimento.caixaPessoaNome,
      entradas: 0,
      saidas: 0,
      saldo: 0,
      quantidadeEntradas: 0,
      quantidadeSaidas: 0,
      entradasPrevistas: 0,
      quantidadeEntradasPrevistas: 0,
      ticketMedioEntradas: 0,
      ultimaMovimentacao: movimento.data,
    };
    if (movimento.tipo === 'entrada') {
      current.entradas += movimento.valor;
      current.quantidadeEntradas += 1;
    } else {
      current.saidas += movimento.valor;
      current.quantidadeSaidas += 1;
    }
    if (
      !current.ultimaMovimentacao ||
      movimento.data > current.ultimaMovimentacao
    ) {
      current.ultimaMovimentacao = movimento.data;
    }
    current.saldo = current.entradas - current.saidas;
    current.ticketMedioEntradas =
      current.quantidadeEntradas > 0
        ? current.entradas / current.quantidadeEntradas
        : 0;
    resumoMap.set(movimento.caixaPessoaId, current);
  });
  return Array.from(resumoMap.values()).sort((a, b) => b.saldo - a.saldo);
};

export const filterCaixaMovimentos = (
  movimentos: CaixaMovimento[],
  params: {
    caixaPessoaId?: string;
    tipo?: 'todos' | CaixaTipoMov;
    busca?: string;
  }
) => {
  const term = (params.busca || '').toLowerCase().trim();
  return movimentos.filter((movimento) => {
    const byPessoa =
      !params.caixaPessoaId || movimento.caixaPessoaId === params.caixaPessoaId;
    const byTipo =
      !params.tipo || params.tipo === 'todos' || movimento.tipo === params.tipo;
    const searchableItems = movimento.itens
      .map(
        (item) => `${item.descricao} ${item.quantidade} ${item.unidade || ''}`
      )
      .join(' ');
    const searchable = `${movimento.descricao} ${movimento.caixaPessoaNome} ${movimento.clienteNome || ''} ${movimento.observacoes || ''} ${movimento.metodoPagamento || ''} ${movimento.origem} ${movimento.status} ${movimento.categoria || ''} ${movimento.referenciaId} ${searchableItems}`;
    return (
      byPessoa && byTipo && (!term || searchable.toLowerCase().includes(term))
    );
  });
};
