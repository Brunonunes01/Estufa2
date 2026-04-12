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
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Plantio } from '../types/domain';
import { assertTenantId } from './tenantGuard';

// 1. CRIAR PLANTIO
export const createPlantio = async (data: Partial<Plantio>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const novoPlantio = {
    ...data,
    userId: tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    safraId: data.safraId || null,
  };

  try {
    const docRef = await addDoc(collection(db, 'plantios'), novoPlantio);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar plantio: ", error);
    throw new Error('Não foi possível criar o plantio.');
  }
};

// 2. LISTAR PLANTIOS DE UMA ESTUFA
export const listPlantiosByEstufa = async (userId: string, estufaId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  if (!estufaId) {
    return [];
  }

  const plantios: Plantio[] = [];
  try {
    const q = query(
      collection(db, 'plantios'), 
      where("userId", "==", tenantId),
      where("estufaId", "==", estufaId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      plantios.push({ ...doc.data() , id: doc.id } as Plantio);
    });
    
    return plantios;
  } catch (error) {
    console.error("Erro ao listar plantios: ", error);
    throw new Error('Não foi possível buscar os plantios.');
  }
};

// 3. BUSCAR PLANTIO POR ID
export const getPlantioById = async (plantioId: string, userId: string): Promise<Plantio | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'plantios', plantioId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Plantio;
      if (data.userId !== tenantId) {
        throw new Error("Acesso negado: este plantio não pertence ao seu tenant.");
      }
      return { ...data , id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar plantio por ID: ", error);
    throw error;
  }
};

// 4. ATUALIZAR STATUS DO PLANTIO
export const updatePlantioStatus = async (
  plantioId: string, 
  status: "em_desenvolvimento" | "em_colheita" | "em_crescimento" | "colheita_iniciada" | "finalizado",
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  try {
    const plantio = await getPlantioById(plantioId, tenantId);
    if (!plantio) throw new Error("Plantio não encontrado.");

    const plantioRef = doc(db, 'plantios', plantioId);
    await updateDoc(plantioRef, {
      status: status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Erro ao atualizar status do plantio: ", error);
    throw error;
  }
};

// 5. ATUALIZAR PLANTIO COMPLETO
export const updatePlantio = async (id: string, data: Partial<Plantio>, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const plantio = await getPlantioById(id, tenantId);
    if (!plantio) throw new Error("Plantio não encontrado.");

    const docRef = doc(db, 'plantios', id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  } catch (error) {
    console.error("Erro ao atualizar plantio: ", error);
    throw error;
  }
};

// 6. DELETAR PLANTIO
export const deletePlantio = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const plantio = await getPlantioById(id, tenantId);
    if (!plantio) throw new Error("Plantio não encontrado para exclusão.");

    const docRef = doc(db, 'plantios', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao eliminar plantio: ", error);
    throw error;
  }
};

// 7. LISTAR TODOS OS PLANTIOS
export const listAllPlantios = async (userId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  const plantios: Plantio[] = [];
  try {
    const q = query(
      collection(db, 'plantios'), 
      where("userId", "==", tenantId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      plantios.push({ ...doc.data() , id: doc.id } as Plantio);
    });
    
    return plantios;
  } catch (error) {
    console.error("Erro ao listar todos os plantios: ", error);
    throw new Error("Erro ao listar plantios.");
  }
};

export const listActivePlantiosByUser = async (userId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  const plantios: Plantio[] = [];
  try {
    const q = query(
      collection(db, 'plantios'),
      where("userId", "==", tenantId),
      where("status", "in", ['em_desenvolvimento', 'em_colheita', 'em_crescimento', 'colheita_iniciada'])
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((itemDoc) => {
      plantios.push({ ...itemDoc.data() , id: itemDoc.id } as Plantio);
    });

    return plantios;
  } catch (error) {
    console.error("Erro ao listar plantios ativos:", error);
    throw new Error("Erro ao buscar plantios ativos.");
  }
};
