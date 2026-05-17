"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TarefaSchema = exports.DespesaSchema = exports.VendaSchema = void 0;
const zod_1 = require("zod");
exports.VendaSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1, "TenantId é obrigatório"),
    valorTotal: zod_1.z.number().positive("O valor total deve ser maior que zero"),
    statusPagamento: zod_1.z.enum(['pendente', 'pago', 'atrasado', 'cancelado']),
    quantidade: zod_1.z.number().nonnegative(),
    dataVenda: zod_1.z.any(),
});
exports.DespesaSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1, "TenantId é obrigatório"),
    valor: zod_1.z.number().positive("O valor da despesa deve ser maior que zero"),
    status: zod_1.z.enum(['pendente', 'pago']).optional(),
    statusPagamento: zod_1.z.enum(['pendente', 'pago']).optional(),
});
exports.TarefaSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    status: zod_1.z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']),
    dataPrevista: zod_1.z.any(),
});
//# sourceMappingURL=schemas.js.map