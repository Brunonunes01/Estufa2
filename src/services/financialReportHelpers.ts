type FinancialSale = {
  statusPagamento?: string | null;
  valorTotal?: number | null;
  valorRecebido?: number | null;
  quantidade?: number | null;
  itens?: Array<{ quantidade?: number | null; valorUnitario?: number | null }>;
};

type FinancialExpense = {
  statusPagamento?: string | null;
  status?: string | null;
  tipoGasto?: string | null;
  valor?: number | null;
};

export const getSaleAgreedValue = (sale: FinancialSale) => {
  const item = sale.itens?.[0];
  const fallback =
    Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
  return Number(sale.valorTotal || fallback || 0);
};

export const getSaleReceivedValue = (sale: FinancialSale) => {
  if (
    sale.valorRecebido !== null &&
    sale.valorRecebido !== undefined &&
    Number.isFinite(Number(sale.valorRecebido))
  ) {
    return Number(sale.valorRecebido);
  }
  return getSaleAgreedValue(sale);
};

export const buildFinancialReportStats = (
  sales: FinancialSale[],
  expenses: FinancialExpense[],
  receivedSales: FinancialSale[] = sales,
  paidExpenses: FinancialExpense[] = expenses
) => {
  let totalVendido = 0;
  let totalReceber = 0;

  sales.forEach((sale) => {
    const status = String(sale.statusPagamento || '')
      .toLowerCase()
      .trim();
    if (status === 'cancelado') return;

    const agreed = getSaleAgreedValue(sale);
    totalVendido += agreed;

    if (status === 'pendente' || status === 'atrasado') {
      totalReceber += agreed;
    }
  });

  let totalRecebido = 0;
  let ajusteRecebimentos = 0;
  receivedSales.forEach((sale) => {
    const status = String(sale.statusPagamento || '')
      .toLowerCase()
      .trim();
    if (status !== 'pago') return;

    const agreed = getSaleAgreedValue(sale);
    const received = getSaleReceivedValue(sale);
    totalRecebido += received;
    ajusteRecebimentos += received - agreed;
  });

  const operationalExpenses = expenses.filter(
    (expense) => expense.tipoGasto !== 'investimento_inicial'
  );
  const despesaComprometida = operationalExpenses.reduce(
    (total, expense) => total + Number(expense.valor || 0),
    0
  );
  const paidOperationalExpenses = paidExpenses.filter(
    (expense) => expense.tipoGasto !== 'investimento_inicial'
  );
  const despesaPaga = paidOperationalExpenses.reduce((total, expense) => {
    const status = String(
      expense.statusPagamento || expense.status || ''
    ).toLowerCase();
    return status === 'pago' ? total + Number(expense.valor || 0) : total;
  }, 0);
  const resultadoRealizado = totalRecebido - despesaPaga;
  const resultadoProjetado = totalVendido - despesaComprometida;
  const margemRealizada =
    totalRecebido > 0 ? (resultadoRealizado / totalRecebido) * 100 : 0;

  return {
    totalVendido,
    totalRecebido,
    totalReceber,
    ajusteRecebimentos,
    despesaPaga,
    despesaComprometida,
    resultadoRealizado,
    resultadoProjetado,
    margemRealizada,
  };
};
