// src/services/despesaService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Despesa } from '../types/domain';

export type DespesaFormData = {
  descricao: string;
  categoria: string;
  valor: number;
  dataDespesa: Timestamp;
  observacoes: string | null;
  registradoPor: string | null;
};

export const createDespesa = async (data: DespesaFormData, userId: string) => {
  const novaDespesa = {
    ...data,
    userId,
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
  const despesas: Despesa[] = [];
  try {
    const q = query(
      collection(db, 'despesas'), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      despesas.push({ id: doc.id, ...doc.data() } as Despesa);
    });
    
    // Ordenar por data (mais recente primeiro)
    despesas.sort((a, b) => b.dataDespesa.seconds - a.dataDespesa.seconds);
    
    return despesas;
  } catch (error) {
    console.error("Erro ao listar despesas: ", error);
    throw new Error('Não foi possível buscar as despesas.');
  }
};

export const deleteDespesa = async (despesaId: string) => {
    try {
        await deleteDoc(doc(db, 'despesas', despesaId));
    } catch (error) {
        console.error("Erro ao deletar despesa:", error);
        throw new Error("Erro ao excluir registro.");
    }
};