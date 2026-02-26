// src/services/plantioService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc // <-- IMPORTAÇÃO ADICIONADA
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Plantio } from '../types/domain';

// 1. CRIAR PLANTIO
// Mudamos para Partial<Plantio> para aceitar dinamicamente todos os novos campos de rastreabilidade
export const createPlantio = async (data: Partial<Plantio>, userId: string) => {
  const novoPlantio = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    safraId: data.safraId || null,
  };

  try {
    const docRef = await addDoc(collection(db, 'plantios'), novoPlantio);
    console.log('Plantio/Lote criado com ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar plantio: ", error);
    throw new Error('Não foi possível criar o plantio.');
  }
};

// 2. LISTAR PLANTIOS DE UMA ESTUFA
export const listPlantiosByEstufa = async (userId: string, estufaId: string): Promise<Plantio[]> => {
  if (!estufaId) {
    console.warn("Aviso: listPlantiosByEstufa chamado sem estufaId.");
    return [];
  }

  const plantios: Plantio[] = [];
  try {
    const q = query(
      collection(db, 'plantios'), 
      where("userId", "==", userId),
      where("estufaId", "==", estufaId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      plantios.push({ id: doc.id, ...doc.data() } as Plantio);
    });
    
    return plantios;
  } catch (error) {
    console.error("Erro ao listar plantios: ", error);
    throw new Error('Não foi possível buscar os plantios.');
  }
};

// 3. BUSCAR PLANTIO POR ID
export const getPlantioById = async (plantioId: string): Promise<Plantio | null> => {
  try {
    const docRef = doc(db, 'plantios', plantioId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Plantio;
    } else {
      console.warn("Plantio não encontrado:", plantioId);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar plantio por ID: ", error);
    throw new Error('Não foi possível buscar o plantio.');
  }
};

// 4. ATUALIZAR STATUS DO PLANTIO (Função específica)
export const updatePlantioStatus = async (
  plantioId: string, 
  status: "em_desenvolvimento" | "em_colheita" | "finalizado"
) => {
  const plantioRef = doc(db, 'plantios', plantioId);
  
  try {
    await updateDoc(plantioRef, {
      status: status,
      updatedAt: Timestamp.now()
    });
    console.log('Status do plantio atualizado:', plantioId);
  } catch (error) {
    console.error("Erro ao atualizar status do plantio: ", error);
    throw new Error('Não foi possível atualizar o status.');
  }
};

// 5. ATUALIZAR PLANTIO COMPLETO (Função NOVA para a edição do formulário)
export const updatePlantio = async (id: string, data: Partial<Plantio>) => {
  try {
    const docRef = doc(db, 'plantios', id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
    console.log('Plantio atualizado:', id);
  } catch (error) {
    console.error("Erro ao atualizar plantio: ", error);
    throw new Error("Erro ao atualizar plantio.");
  }
};

// 6. DELETAR PLANTIO (Função NOVA para o formulário)
export const deletePlantio = async (id: string) => {
  try {
    const docRef = doc(db, 'plantios', id);
    await deleteDoc(docRef);
    console.log('Plantio deletado:', id);
  } catch (error) {
    console.error("Erro ao eliminar plantio: ", error);
    throw new Error("Não foi possível excluir o plantio.");
  }
};

// 7. LISTAR TODOS OS PLANTIOS
export const listAllPlantios = async (userId: string): Promise<Plantio[]> => {
  const plantios: Plantio[] = [];
  try {
    const q = query(
      collection(db, 'plantios'), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      plantios.push({ id: doc.id, ...doc.data() } as Plantio);
    });
    
    return plantios;
  } catch (error) {
    console.error("Erro ao listar todos os plantios: ", error);
    return []; 
  }
};