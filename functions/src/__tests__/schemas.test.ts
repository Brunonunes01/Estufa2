import { VendaSchema, DespesaSchema } from '../schemas';

describe('Validação de Schemas (Zod)', () => {
  
  describe('VendaSchema', () => {
    it('deve aceitar uma venda válida', () => {
      const validVenda = {
        tenantId: 'user123',
        valorTotal: 150.50,
        statusPagamento: 'pago',
        quantidade: 10,
        dataVenda: new Date()
      };
      const result = VendaSchema.safeParse(validVenda);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar venda com valor negativo', () => {
      const invalidVenda = {
        tenantId: 'user123',
        valorTotal: -10,
        statusPagamento: 'pendente',
        quantidade: 5,
        dataVenda: new Date()
      };
      const result = VendaSchema.safeParse(invalidVenda);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("O valor total deve ser maior que zero");
      }
    });

    it('deve rejeitar venda sem tenantId', () => {
      const invalidVenda = {
        valorTotal: 100,
        statusPagamento: 'pago',
        quantidade: 1,
        dataVenda: new Date()
      };
      const result = VendaSchema.safeParse(invalidVenda);
      expect(result.success).toBe(false);
    });
  });

  describe('DespesaSchema', () => {
    it('deve aceitar uma despesa válida', () => {
      const validDespesa = {
        tenantId: 'user123',
        valor: 50,
        status: 'pendente'
      };
      const result = DespesaSchema.safeParse(validDespesa);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar despesa com valor zero ou menor', () => {
      const invalidDespesa = {
        tenantId: 'user123',
        valor: 0
      };
      const result = DespesaSchema.safeParse(invalidDespesa);
      expect(result.success).toBe(false);
    });
  });
});
