import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
  getDoc,
  getAggregateFromServer,
  sum,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Despesa } from '../types/domain';
import { assertTenantId } from './tenantGuard';

export type DespesaFormData = {
  descricao: string;
  categoria: Despesa['categoria'];
  valor: number;
  dataDespesa: Date;
  dataVencimento?: Date | null;
  statusPagamento: 'pago' | 'pendente';
  observacoes?: string | null;
  plantioId?: string | null;
  estufaId?: string | null;
};

export const createDespesa = async (data: DespesaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();

  const novaDespesa = {
    ...data,
    tenantId,
    userId: tenantId, // Compatibilidade
    dataDespesa: Timestamp.fromDate(data.dataDespesa),
    dataVencimento: data.dataVencimento ? Timestamp.fromDate(data.dataVencimento) : null,
    createdAt: now,
    updatedAt: now,
    // Garante que o campo de status usado em queries seja o statusPagamento
    status: data.statusPagamento, 
  };

  const docRef = await addDoc(collection(db, 'despesas'), novaDespesa);
  return docRef.id;
};

export const listDespesas = async (userId: string): Promise<Despesa[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(collection(db, 'despesas'), where('tenantId', '==', tenantId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id } as Despesa))
    .sort((a, b) => {
      const dateA = a.dataDespesa instanceof Timestamp ? a.dataDespesa.seconds : 0;
      const dateB = b.dataDespesa instanceof Timestamp ? b.dataDespesa.seconds : 0;
      return dateB - dateA;
    });
};

export const listDespesasByMonth = async (userId: string, year: number, month: number): Promise<Despesa[]> => {
  const tenantId = assertTenantId(userId);
  
  // O mês no JS Date é 0-indexed (0 = Janeiro, 11 = Dezembro)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    collection(db, 'despesas'), 
    where('tenantId', '==', tenantId),
    where('dataDespesa', '>=', startTimestamp),
    where('dataDespesa', '<=', endTimestamp)
  );
  
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id } as Despesa))
    .sort((a, b) => {
      const dateA = a.dataDespesa instanceof Timestamp ? a.dataDespesa.seconds : 0;
      const dateB = b.dataDespesa instanceof Timestamp ? b.dataDespesa.seconds : 0;
      return dateB - dateA;
    });
};

export const getDespesaById = async (id: string, userId: string): Promise<Despesa | null> => {
  const tenantId = assertTenantId(userId);
  const docRef = doc(db, 'despesas', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as Despesa;
    if (data.tenantId !== tenantId && data.userId !== tenantId) {
      throw new Error('Acesso negado.');
    }
    return { ...data, id: docSnap.id };
  }
  return null;
};

export const updateDespesaStatus = async (
  id: string,
  novoStatus: 'pago' | 'pendente',
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const despesa = await getDespesaById(id, tenantId);
  if (!despesa) throw new Error('Despesa não encontrada.');

  await updateDoc(doc(db, 'despesas', id), {
    statusPagamento: novoStatus,
    status: novoStatus, // Mantido para compatibilidade de query
    updatedAt: Timestamp.now(),
  });
};

export const deleteDespesa = async (despesaId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const despesa = await getDespesaById(despesaId, tenantId);
  if (!despesa) throw new Error('Despesa não encontrada.');

  await deleteDoc(doc(db, 'despesas', despesaId));
};

export const getTotalDespesasPendentes = async (userId: string): Promise<number> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'despesas'),
    where('tenantId', '==', tenantId),
    where('statusPagamento', '==', 'pendente')
  );

  try {
    const snapshot = await getAggregateFromServer(q, {
      total: sum('valor'),
    });

    return snapshot.data().total || 0;
  } catch (error: any) {
    // Fallback para ambientes/projetos sem índice de agregação composto.
    if (error?.code === 'failed-precondition' || error?.code === 'unimplemented') {
      const snap = await getDocs(q);
      return snap.docs.reduce((acc, item) => {
        const despesa = item.data() as Partial<Despesa>;
        return acc + Number(despesa.valor || 0);
      }, 0);
    }
    throw error;
  }
};
