// src/services/manejoService.ts
import { collection, addDoc, query, where, getDocs, Timestamp, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { RegistroManejo } from '../types/domain';
import { assertTenantId } from './tenantGuard';

// 1. CRIAR REGISTRO DE MANEJO
export const createManejo = async (data: Partial<RegistroManejo>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const novoManejo = {
    ...data,
    userId: tenantId,
    tenantId,
    createdBy: tenantId,
    fotos: Array.isArray(data.fotos) ? data.fotos : [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'manejos'), novoManejo);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao registrar manejo: ", error);
    throw new Error('Não foi possível salvar o registro de manejo.');
  }
};

// 2. LISTAR MANEJOS DE UM LOTE ESPECÍFICO
export const listManejosByPlantio = async (userId: string, plantioId: string): Promise<RegistroManejo[]> => {
  const tenantId = assertTenantId(userId);
  if (!plantioId) return [];

  const manejos: RegistroManejo[] = [];
  try {
    const q = query(
      collection(db, 'manejos'), 
      where("userId", "==", tenantId),
      where("plantioId", "==", plantioId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      manejos.push({ ...doc.data() , id: doc.id } as RegistroManejo);
    });
    
    return manejos.sort((a, b) => b.dataRegistro.toMillis() - a.dataRegistro.toMillis());

  } catch (error) {
    console.error("Erro ao listar manejos: ", error);
    throw new Error('Não foi possível buscar os registros.');
  }
};

export const getManejoById = async (id: string, userId: string): Promise<RegistroManejo | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'manejos', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as RegistroManejo;
      if (data.userId !== tenantId) {
        throw new Error("Acesso negado: este registro de manejo não pertence ao seu tenant.");
      }
      return { ...data , id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar manejo por ID:", error);
    throw error;
  }
};

// 3. ELIMINAR REGISTRO
export const deleteManejo = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const manejo = await getManejoById(id, tenantId);
    if (!manejo) throw new Error("Registro de manejo não encontrado para exclusão.");

    const docRef = doc(db, 'manejos', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao eliminar manejo: ", error);
    throw error;
  }
};
