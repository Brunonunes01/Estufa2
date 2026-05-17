"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onColheitaWrite = exports.onPlantioWrite = exports.onTarefaWrite = exports.onDespesaWrite = exports.onVendaWrite = exports.calculateFinancials = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
const schemas_1 = require("./schemas");
const db = (0, firestore_2.getFirestore)();
const safeNumber = (value) => (typeof value === 'number' ? value : 0);
const isReceivableStatus = (status) => status === 'pendente' || status === 'atrasado';
const isReceivedStatus = (status) => status === 'pago';
const calculateFinancials = (vendasDocs, despesasDocs) => {
    let totalReceber = 0;
    let totalRecebido = 0;
    vendasDocs.forEach(doc => {
        const data = typeof doc.data === 'function' ? doc.data() : doc;
        const result = schemas_1.VendaSchema.safeParse(data);
        if (!result.success)
            return;
        const valor = safeNumber(data.valorTotal);
        if (isReceivableStatus(data.statusPagamento)) {
            totalReceber += valor;
        }
        else if (isReceivedStatus(data.statusPagamento)) {
            totalRecebido += valor;
        }
    });
    const totalPagar = despesasDocs.reduce((acc, doc) => {
        const data = typeof doc.data === 'function' ? doc.data() : doc;
        const result = schemas_1.DespesaSchema.safeParse(data);
        if (!result.success)
            return acc;
        const status = data.status || data.statusPagamento;
        return status === 'pendente' ? acc + safeNumber(data.valor) : acc;
    }, 0);
    return { totalReceber, totalRecebido, totalPagar };
};
exports.calculateFinancials = calculateFinancials;
const recomputeDashboardSummary = async (tenantId) => {
    firebase_functions_1.logger.info(`[Dashboard] Recalculando para tenant: ${tenantId}`);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const [vendas, despesas, plantios, tarefas] = await Promise.all([
        db.collection('vendas').where('tenantId', '==', tenantId).get(),
        db.collection('despesas').where('tenantId', '==', tenantId).get(),
        db.collection('plantios').where('tenantId', '==', tenantId).where('status', 'in', ['em_crescimento', 'em_desenvolvimento', 'colheita_iniciada', 'em_colheita']).get(),
        db.collection('tarefas_agricolas').where('tenantId', '==', tenantId).where('status', 'in', ['pendente', 'em_andamento']).get(),
    ]);
    let vendasDocs = vendas.docs;
    let despesasDocs = despesas.docs;
    if (vendasDocs.length === 0) {
        const legacyVendas = await db.collection('vendas').where('userId', '==', tenantId).get();
        vendasDocs = legacyVendas.docs;
    }
    if (despesasDocs.length === 0) {
        const legacyDespesas = await db.collection('despesas').where('userId', '==', tenantId).get();
        despesasDocs = legacyDespesas.docs;
    }
    const { totalReceber, totalRecebido, totalPagar } = (0, exports.calculateFinancials)(vendasDocs, despesasDocs);
    const tarefasHojePendentes = tarefas.docs.filter(doc => {
        const data = doc.data();
        if (!data.dataPrevista)
            return false;
        const date = data.dataPrevista.toDate();
        return date >= startOfDay && date <= endOfDay;
    }).length;
    await db.collection('dashboard_summary').doc(tenantId).set({
        tenantId,
        totalReceber,
        totalRecebido,
        totalPagar,
        totalPlantiosAtivos: plantios.docs.length,
        tarefasHojePendentes,
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    firebase_functions_1.logger.info(`[Dashboard] Finalizado para tenant: ${tenantId}`);
};
exports.onVendaWrite = (0, firestore_1.onDocumentWritten)('vendas/{id}', async (event) => {
    const data = event.data?.after?.data() || event.data?.before?.data();
    const tenantId = data?.tenantId || data?.userId;
    if (event.data?.after?.exists) {
        const result = schemas_1.VendaSchema.safeParse(event.data.after.data());
        if (!result.success) {
            firebase_functions_1.logger.error(`[Validation] Venda ${event.params.id} com dados críticos inválidos!`, result.error.format());
        }
    }
    if (tenantId)
        await recomputeDashboardSummary(tenantId);
});
exports.onDespesaWrite = (0, firestore_1.onDocumentWritten)('despesas/{id}', async (event) => {
    const data = event.data?.after?.data() || event.data?.before?.data();
    const tenantId = data?.tenantId || data?.userId;
    if (tenantId)
        await recomputeDashboardSummary(tenantId);
});
exports.onTarefaWrite = (0, firestore_1.onDocumentWritten)('tarefas_agricolas/{id}', async (event) => {
    const data = event.data?.after?.data() || event.data?.before?.data();
    const tenantId = data?.tenantId || data?.userId;
    if (tenantId)
        await recomputeDashboardSummary(tenantId);
});
exports.onPlantioWrite = (0, firestore_1.onDocumentWritten)('plantios/{id}', async (event) => {
    const data = event.data?.after?.data() || event.data?.before?.data();
    const tenantId = data?.tenantId || data?.userId;
    if (tenantId)
        await recomputeDashboardSummary(tenantId);
});
exports.onColheitaWrite = (0, firestore_1.onDocumentWritten)('colheitas/{id}', async (event) => {
    const data = event.data?.after?.data() || event.data?.before?.data();
    const tenantId = data?.tenantId || data?.userId;
    if (tenantId)
        await recomputeDashboardSummary(tenantId);
});
//# sourceMappingURL=dashboardSummary.js.map