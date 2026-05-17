import { z } from 'zod';

export const VendaSchema = z.object({
  tenantId: z.string().min(1, "TenantId é obrigatório"),
  valorTotal: z.number().positive("O valor total deve ser maior que zero"),
  statusPagamento: z.enum(['pendente', 'pago', 'atrasado', 'cancelado']),
  quantidade: z.number().nonnegative(),
  dataVenda: z.any(), // Firebase Timestamp
});

export const DespesaSchema = z.object({
  tenantId: z.string().min(1, "TenantId é obrigatório"),
  valor: z.number().positive("O valor da despesa deve ser maior que zero"),
  status: z.enum(['pendente', 'pago']).optional(),
  statusPagamento: z.enum(['pendente', 'pago']).optional(),
});

export const TarefaSchema = z.object({
  tenantId: z.string().min(1),
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']),
  dataPrevista: z.any(),
});
