import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

const safeNumber = (value: unknown) => (typeof value === 'number' ? value : 0);

const recomputeDashboardSummary = async (tenantId: string) => {
  const [vendas, despesas] = await Promise.all([
    db.collection('vendas').where('userId', '==', tenantId).get(),
    db.collection('despesas').where('userId', '==', tenantId).get(),
  ]);

  const totalReceber = vendas.docs.reduce((acc, doc) => {
    const data = doc.data();
    return data.statusPagamento === 'pendente' ? acc + safeNumber(data.valorTotal) : acc;
  }, 0);

  const totalRecebido = vendas.docs.reduce((acc, doc) => {
    const data = doc.data();
    return data.statusPagamento === 'pendente' ? acc : acc + safeNumber(data.valorTotal);
  }, 0);

  const totalPagar = despesas.docs.reduce((acc, doc) => {
    const data = doc.data();
    const status = data.status || data.statusPagamento;
    return status === 'pendente' ? acc + safeNumber(data.valor) : acc;
  }, 0);

  await db.collection('dashboard_summary').doc(tenantId).set(
    {
      tenantId,
      totalReceber,
      totalRecebido,
      totalPagar,
      updatedAt: new Date(),
    },
    { merge: true }
  );
};

export const onVendaWrite = onDocumentWritten('vendas/{id}', async (event) => {
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();
  const tenantId = after?.userId || before?.userId;

  if (!tenantId) return;
  await recomputeDashboardSummary(tenantId);
});

export const onDespesaWrite = onDocumentWritten('despesas/{id}', async (event) => {
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();
  const tenantId = after?.userId || before?.userId;

  if (!tenantId) return;
  await recomputeDashboardSummary(tenantId);
});

export const onColheitaWrite = onDocumentWritten('colheitas/{id}', async (event) => {
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();
  const tenantId = after?.userId || before?.userId;

  if (!tenantId) return;
  await recomputeDashboardSummary(tenantId);
});
