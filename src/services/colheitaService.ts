// src/services/colheitaService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  Timestamp, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Colheita } from '../types/domain';
import { updatePlantioStatus } from './plantioService'; 

export type ColheitaFormData = {
  quantidade: number;
  unidade: string;
  precoUnitario: number | null;
  destino: string | null;
  clienteId: string | null;
  metodoPagamento: string | null;
  registradoPor: string | null;
  observacoes: string | null;
  dataVenda?: Date;
  pesoBruto?: number;
  pesoLiquido?: number;
};

export const createColheita = async (
  data: ColheitaFormData, 
  userId: string, 
  plantioId: string, 
  estufaId: string 
) => {
  const dataFinal = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : Timestamp.now();
  const isPrazo = data.metodoPagamento === 'prazo';

  const novaColheita = {
    ...data, 
    userId: userId,
    plantioId: plantioId,
    estufaId: estufaId,
    dataColheita: dataFinal,
    statusPagamento: isPrazo ? 'pendente' : 'pago',
    dataPagamento: isPrazo ? null : dataFinal,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  delete (novaColheita as any).dataVenda;

  try {
    const docRef = await addDoc(collection(db, 'colheitas'), novaColheita);
    if (plantioId) {
        await updatePlantioStatus(plantioId, "em_colheita");
    }
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar colheita: ", error);
    throw new Error('Não foi possível registrar a colheita.');
  }
};

export const receberConta = async (colheitaId: string, metodoRecebimento?: string) => {
    try {
        const docRef = doc(db, 'colheitas', colheitaId);
        const updateData: any = {
            statusPagamento: 'pago',
            dataPagamento: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        if (metodoRecebimento) {
            updateData.metodoPagamento = metodoRecebimento;
        }
        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error("Erro ao receber conta:", error);
        throw new Error("Erro ao atualizar pagamento.");
    }
};

export const listContasAReceber = async (userId: string): Promise<Colheita[]> => {
    const colheitas: Colheita[] = [];
    try {
      const q = query(
        collection(db, 'colheitas'), 
        where("userId", "==", userId),
        where("metodoPagamento", "==", "prazo")
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const rawData = doc.data(); 
        const venda = { id: doc.id, ...rawData } as Colheita;
        if (venda.statusPagamento !== 'pago') {
            colheitas.push(venda);
        }
      });
      colheitas.sort((a, b) => {
          const secA = a.dataColheita?.seconds || 0;
          const secB = b.dataColheita?.seconds || 0;
          return secA - secB;
      });
      return colheitas;
    } catch (error) {
      console.error("Erro ao listar contas a receber: ", error);
      return [];
    }
};

export const listColheitasByPlantio = async (userId: string, plantioId: string): Promise<Colheita[]> => {
  const colheitas: Colheita[] = [];
  try {
    const q = query(
      collection(db, 'colheitas'), 
      where("userId", "==", userId),
      where("plantioId", "==", plantioId)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      colheitas.push({ id: doc.id, ...doc.data() } as Colheita);
    });
    return colheitas;
  } catch (error) {
    console.error("Erro ao listar colheitas: ", error);
    throw new Error('Não foi possível buscar as colheitas.');
  }
};

export const listAllColheitas = async (userId: string): Promise<Colheita[]> => {
  const colheitas: Colheita[] = [];
  try {
    const q = query(
      collection(db, 'colheitas'), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      colheitas.push({ id: doc.id, ...doc.data() } as Colheita);
    });
    colheitas.sort((a, b) => {
        const secA = a.dataColheita?.seconds || 0;
        const secB = b.dataColheita?.seconds || 0;
        return secB - secA;
    });
    return colheitas;
  } catch (error) {
    console.error("Erro ao listar todas as colheitas: ", error);
    throw new Error('Não foi possível buscar o relatório de vendas.');
  }
};

export const getColheitaById = async (id: string): Promise<Colheita | null> => {
    try {
        const docRef = doc(db, 'colheitas', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Colheita;
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar colheita:", error);
        return null;
    }
};

export const updateColheita = async (id: string, data: ColheitaFormData) => {
    try {
        const docRef = doc(db, 'colheitas', id);
        const updateData: any = { ...data };
        if (data.dataVenda) {
            updateData.dataColheita = Timestamp.fromDate(data.dataVenda);
            delete updateData.dataVenda;
        }
        if (data.metodoPagamento === 'prazo') {
            updateData.statusPagamento = 'pendente';
        } else {
            updateData.statusPagamento = 'pago';
            updateData.dataPagamento = Timestamp.now();
        }
        updateData.updatedAt = Timestamp.now();
        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error("Erro ao atualizar colheita:", error);
        throw new Error("Falha ao atualizar venda.");
    }
};

export const deleteColheita = async (colheitaId: string) => {
    try {
        const docRef = doc(db, 'colheitas', colheitaId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Erro ao deletar colheita:", error);
        throw new Error("Erro ao excluir registro.");
    }
};