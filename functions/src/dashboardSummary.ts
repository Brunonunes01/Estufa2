import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { VendaSchema, DespesaSchema } from './schemas';

const db = getFirestore();

const safeNumber = (value: unknown) => (typeof value === 'number' ? value : 0);
const isReceivableStatus = (status: unknown) => status === 'pendente' || status === 'atrasado';
const isReceivedStatus = (status: unknown) => status === 'pago';

/**
 * Lógica pura para cálculo de totais financeiros.
 * Separada para permitir testes unitários sem Firestore.
 */
export const calculateFinancials = (vendasDocs: any[], despesasDocs: any[]) => {
  let totalReceber = 0;
  let totalRecebido = 0;

  vendasDocs.forEach(doc => {
    const data = typeof doc.data === 'function' ? doc.data() : doc;
    const result = VendaSchema.safeParse(data);
    if (!result.success) return;

    const valor = safeNumber(data.valorTotal);
    if (isReceivableStatus(data.statusPagamento)) {
      totalReceber += valor;
    } else if (isReceivedStatus(data.statusPagamento)) {
      totalRecebido += valor;
    }
  });

  const totalPagar = despesasDocs.reduce((acc, doc) => {
    const data = typeof doc.data === 'function' ? doc.data() : doc;
    const result = DespesaSchema.safeParse(data);
    if (!result.success) return acc;

    const status = data.status || data.statusPagamento;
    return status === 'pendente' ? acc + safeNumber(data.valor) : acc;
  }, 0);

  return { totalReceber, totalRecebido, totalPagar };
};

const recomputeDashboardSummary = async (tenantId: string) => {
  logger.info(`[Dashboard] Recalculando para tenant: ${tenantId}`);
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

  const { totalReceber, totalRecebido, totalPagar } = calculateFinancials(vendasDocs, despesasDocs);

  const tarefasHojePendentes = tarefas.docs.filter(doc => {
    const data = doc.data();
    if (!data.dataPrevista) return false;
    const date = (data.dataPrevista as Timestamp).toDate();
    return date >= startOfDay && date <= endOfDay;
  }).length;

  await db.collection('dashboard_summary').doc(tenantId).set(
    {
      tenantId,
      totalReceber,
      totalRecebido,
      totalPagar,
      totalPlantiosAtivos: plantios.docs.length,
      tarefasHojePendentes,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  logger.info(`[Dashboard] Finalizado para tenant: ${tenantId}`);
};


export const onVendaWrite = onDocumentWritten('vendas/{id}', async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  const tenantId = data?.tenantId || data?.userId;

  if (event.data?.after?.exists) {
    const result = VendaSchema.safeParse(event.data.after.data());
    if (!result.success) {
      logger.error(`[Validation] Venda ${event.params.id} com dados críticos inválidos!`, result.error.format());
      // No Firestore triggers, não podemos "bloquear" a escrita, mas podemos logar para auditoria.
    }
  }

  if (tenantId) await recomputeDashboardSummary(tenantId);
});

export const onDespesaWrite = onDocumentWritten('despesas/{id}', async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  const tenantId = data?.tenantId || data?.userId;

  if (tenantId) await recomputeDashboardSummary(tenantId);
});

export const onTarefaWrite = onDocumentWritten('tarefas_agricolas/{id}', async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  const tenantId = data?.tenantId || data?.userId;

  if (tenantId) await recomputeDashboardSummary(tenantId);
});

export const onPlantioWrite = onDocumentWritten('plantios/{id}', async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  const tenantId = data?.tenantId || data?.userId;

  if (tenantId) await recomputeDashboardSummary(tenantId);
});

export const onColheitaWrite = onDocumentWritten('colheitas/{id}', async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  const tenantId = data?.tenantId || data?.userId;

  if (tenantId) await recomputeDashboardSummary(tenantId);
});
