// src/services/despesaService.ts
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
  categoria: string;
  valor: number;
  dataDespesa: Date;
  dataVencimento?: Date | null;
  status: "pago" | "pendente";
  observacoes: string | null;
  registradoPor: string | null;
};

export const createDespesa = async (data: DespesaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const novaDespesa = {
    ...data,
    userId: tenantId,
    dataDespesa: Timestamp.fromDate(data.dataDespesa),
    dataVencimento: data.dataVencimento ? Timestamp.fromDate(data.dataVencimento) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'despesas'), novaDespesa);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar despesa: ", error);
    throw new Error('Não foi possível registrar a despesa.');
  }
};

export const listDespesas = async (userId: string): Promise<Despesa[]> => {
  const tenantId = assertTenantId(userId);
  const despesas: Despesa[] = [];
  try {
    const q = query(
      collection(db, 'despesas'), 
      where("userId", "==", tenantId)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      despesas.push({ ...doc.data() , id: doc.id } as Despesa);
    });
    
    despesas.sort((a, b) => b.dataDespesa.seconds - a.dataDespesa.seconds);
    return despesas;
  } catch (error) {
    console.error("Erro ao listar despesas: ", error);
    throw new Error('Não foi possível buscar as despesas.');
  }
};

export const getDespesaById = async (id: string, userId: string): Promise<Despesa | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'despesas', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Despesa;
      if (data.userId !== tenantId) {
        throw new Error("Acesso negado: esta despesa não pertence ao seu tenant.");
      }
      return { ...data , id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar despesa por ID:", error);
    throw error;
  }
};

export const updateDespesaStatus = async (id: string, novoStatus: "pago" | "pendente", userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const despesa = await getDespesaById(id, tenantId);
    if (!despesa) throw new Error("Despesa não encontrada.");

    const docRef = doc(db, 'despesas', id);
    await updateDoc(docRef, { 
      status: novoStatus, 
      updatedAt: Timestamp.now() 
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    throw error instanceof Error ? error : new Error("Erro ao atualizar status da despesa.");
  }
};

export const deleteDespesa = async (despesaId: string, userId: string) => {
    const tenantId = assertTenantId(userId);
    try {
        const despesa = await getDespesaById(despesaId, tenantId);
        if (!despesa) throw new Error("Despesa não encontrada para exclusão.");

        await deleteDoc(doc(db, 'despesas', despesaId));
    } catch (error) {
        console.error("Erro ao deletar despesa:", error);
        throw error instanceof Error ? error : new Error("Erro ao excluir registro.");
    }
};

export const getTotalDespesasPendentes = async (userId: string): Promise<number> => {
  const tenantId = assertTenantId(userId);
  try {
    const q = query(
      collection(db, 'despesas'),
      where("userId", "==", tenantId),
      where("status", "==", "pendente")
    );

    const snapshot = await getAggregateFromServer(q, {
      total: sum('valor'),
    });

    return snapshot.data().total || 0;
  } catch (error) {
    const despesas = await listDespesas(tenantId);
    return despesas
      .filter((despesa) => despesa.status === 'pendente')
      .reduce((acc, despesa) => acc + (despesa.valor || 0), 0);
  }
};
