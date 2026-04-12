import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDoc,
  getDocs,
  query,
  sum,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Venda } from '../types/domain';
import { assertTenantId } from './tenantGuard';

export interface VendaFormData {
  plantioId: string;
  estufaId?: string;
  clienteId?: string | null;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  metodoPagamento?: string | null;
  dataVenda?: Date;
  observacoes?: string | null;
  colheitaId?: string;
}

const toStatusPagamento = (metodoPagamento?: string | null): Venda['statusPagamento'] => {
  if (metodoPagamento === 'prazo') return 'pendente';
  return 'pago';
};

const buildVendaPayload = (data: VendaFormData, tenantId: string) => {
  const dataVenda = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : Timestamp.now();
  const statusPagamento = toStatusPagamento(data.metodoPagamento);

  const vencimento =
    statusPagamento === 'pendente'
      ? Timestamp.fromMillis(dataVenda.toMillis() + 15 * 24 * 60 * 60 * 1000)
      : null;

  const valorTotal = Number(data.quantidade || 0) * Number(data.precoUnitario || 0);

  return {
    userId: tenantId,
    tenantId,
    createdBy: tenantId,
    plantioId: data.plantioId,
    estufaId: data.estufaId,
    colheitaId: data.colheitaId,
    clienteId: data.clienteId || null,
    dataVenda,
    dataVencimento: vencimento,
    itens: [
      {
        colheitaId: data.colheitaId,
        descricao: 'Produção agrícola',
        quantidade: Number(data.quantidade || 0),
        valorUnitario: Number(data.precoUnitario || 0),
      },
    ],
    valorTotal,
    statusPagamento,
    formaPagamento: (data.metodoPagamento || 'pix') as Venda['formaPagamento'],
    metodoPagamento: data.metodoPagamento || 'pix',
    observacoes: data.observacoes || '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),

    // Campos auxiliares para compatibilidade de telas legadas
    quantidade: Number(data.quantidade || 0),
    unidade: data.unidade,
    precoUnitario: Number(data.precoUnitario || 0),
    dataColheita: dataVenda,
  };
};

export const createVenda = async (data: VendaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const payload = buildVendaPayload(data, tenantId);
  const ref = await addDoc(collection(db, 'vendas'), payload);
  return ref.id;
};

export const getVendaById = async (id: string, userId: string): Promise<(Venda & Record<string, any>) | null> => {
  const tenantId = assertTenantId(userId);
  const ref = doc(db, 'vendas', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const venda = { ...(snap.data() as Venda & Record<string, any>) , id: snap.id };
  if (venda.userId !== tenantId) throw new Error('Acesso negado à venda.');
  return venda;
};

export const updateVenda = async (id: string, data: VendaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const venda = await getVendaById(id, tenantId);
  if (!venda) throw new Error('Venda não encontrada.');

  const payload = buildVendaPayload(data, tenantId);
  await updateDoc(doc(db, 'vendas', id), {
    ...payload,
    createdAt: venda.createdAt,
    updatedAt: Timestamp.now(),
  });
};

export const deleteVenda = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const venda = await getVendaById(id, tenantId);
  if (!venda) throw new Error('Venda não encontrada para exclusão.');
  await deleteDoc(doc(db, 'vendas', id));
};

export const listAllVendas = async (userId: string): Promise<Array<Venda & Record<string, any>>> => {
  const tenantId = assertTenantId(userId);
  const q = query(collection(db, 'vendas'), where('userId', '==', tenantId));
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ ...(d.data() as Venda & Record<string, any>) , id: d.id }))
    .sort((a, b) => (b.dataVenda?.seconds || 0) - (a.dataVenda?.seconds || 0));
};

export const listVendasByPlantio = async (userId: string, plantioId: string): Promise<Array<Venda & Record<string, any>>> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'vendas'),
    where('userId', '==', tenantId),
    where('plantioId', '==', plantioId)
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ ...(d.data() as Venda & Record<string, any>) , id: d.id }))
    .sort((a, b) => (b.dataVenda?.seconds || 0) - (a.dataVenda?.seconds || 0));
};

export const receberVenda = async (vendaId: string, userId: string, metodoRecebimento?: string) => {
  const tenantId = assertTenantId(userId);
  const venda = await getVendaById(vendaId, tenantId);
  if (!venda) throw new Error('Registro não encontrado.');

  await updateDoc(doc(db, 'vendas', vendaId), {
    statusPagamento: 'pago',
    formaPagamento: (metodoRecebimento || venda.formaPagamento || 'pix') as Venda['formaPagamento'],
    metodoPagamento: metodoRecebimento || venda.metodoPagamento || 'pix',
    updatedAt: Timestamp.now(),
  });
};

export const listContasAReceber = async (userId: string): Promise<Array<Venda & Record<string, any>>> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'vendas'),
    where('userId', '==', tenantId),
    where('statusPagamento', '==', 'pendente')
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ ...(d.data() as Venda & Record<string, any>) , id: d.id }))
    .sort((a, b) => (a.dataVenda?.seconds || 0) - (b.dataVenda?.seconds || 0));
};

export const getTotalContasAReceber = async (userId: string): Promise<number> => {
  const tenantId = assertTenantId(userId);

  try {
    const q = query(
      collection(db, 'vendas'),
      where('userId', '==', tenantId),
      where('statusPagamento', '==', 'pendente')
    );

    const snapshot = await getAggregateFromServer(q, {
      total: sum('valorTotal'),
    });

    return snapshot.data().total || 0;
  } catch {
    const pendentes = await listContasAReceber(tenantId);
    return pendentes.reduce((acc, venda) => acc + Number(venda.valorTotal || 0), 0);
  }
};
