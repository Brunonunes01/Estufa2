import { calculateFinancials } from '../dashboardSummary';

describe('Lógica de Cálculo do Dashboard', () => {
  it('deve somar corretamente vendas pagas e pendentes', () => {
    const mockVendas = [
      { tenantId: 't1', valorTotal: 100, statusPagamento: 'pago', quantidade: 1, dataVenda: new Date() },
      { tenantId: 't1', valorTotal: 50, statusPagamento: 'pendente', quantidade: 1, dataVenda: new Date() },
      { tenantId: 't1', valorTotal: 30, statusPagamento: 'pago', quantidade: 1, dataVenda: new Date() },
    ];
    const mockDespesas = [
      { tenantId: 't1', valor: 40, status: 'pendente' },
      { tenantId: 't1', valor: 20, status: 'pago' },
    ];

    const result = calculateFinancials(mockVendas, mockDespesas);

    expect(result.totalRecebido).toBe(130); // 100 + 30
    expect(result.totalReceber).toBe(50);
    expect(result.totalPagar).toBe(40);
  });

  it('deve ignorar documentos inválidos no cálculo', () => {
    const mockVendas = [
      { tenantId: 't1', valorTotal: 100, statusPagamento: 'pago', quantidade: 1, dataVenda: new Date() },
      { valorTotal: -500 }, // Inválido (sem tenant e valor negativo)
    ];
    const mockDespesas: any[] = [];

    const result = calculateFinancials(mockVendas, mockDespesas);

    expect(result.totalRecebido).toBe(100);
    expect(result.totalReceber).toBe(0);
  });
});
