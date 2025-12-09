// src/services/colheitaService.ts
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
import { Colheita } from '../types/domain';
import { updatePlantioStatus } from './plantioService'; 

export type ColheitaFormData = {
  quantidade: number;
  unidade: string;
  precoUnitario: number | null;
  destino: string | null;
  clienteId: string | null;
  metodoPagamento: string | null; // <-- NOVO CAMPO NO FORM
  observacoes: string | null;
};

// 1. CRIAR COLHEITA
export const createColheita = async (
  data: ColheitaFormData, 
  userId: string, 
  plantioId: string, 
  estufaId: string 
) => {
  const novaColheita = {
    ...data, 
    userId: userId,
    plantioId: plantioId,
    estufaId: estufaId,
    dataColheita: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'colheitas'), novaColheita);
    console.log('Colheita criada com ID: ', docRef.id);
    await updatePlantioStatus(plantioId, "em_colheita");
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar colheita: ", error);
    throw new Error('Não foi possível registrar a colheita.');
  }
};

// 2. LISTAR COLHEITAS DE UM PLANTIO
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

// 3. LISTAR TODAS
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
    colheitas.sort((a, b) => b.dataColheita.seconds - a.dataColheita.seconds);
    return colheitas;
  } catch (error) {
    console.error("Erro ao listar todas as colheitas: ", error);
    throw new Error('Não foi possível buscar o relatório de vendas.');
  }
};

// 4. DELETAR
export const deleteColheita = async (colheitaId: string) => {
    try {
        const docRef = doc(db, 'colheitas', colheitaId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Erro ao deletar colheita:", error);
        throw new Error("Erro ao excluir registro.");
    }
};