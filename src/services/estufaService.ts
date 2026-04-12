import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Estufa } from '../types/domain';
import { assertTenantId } from './tenantGuard';

export const createEstufa = async (data: Partial<Estufa>, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const novaEstufa = {
      ...data,
      userId: tenantId,
      tenantId,
      createdBy: tenantId,
      status: data.status || 'ativa',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'estufas'), novaEstufa);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar estufa:", error);
    throw new Error("Erro ao salvar estufa no banco de dados.");
  }
};

export const listEstufas = async (userId: string): Promise<Estufa[]> => {
  const tenantId = assertTenantId(userId);
  try {
    const [byUserId, byTenantId] = await Promise.all([
      getDocs(query(collection(db, 'estufas'), where("userId", "==", tenantId))),
      getDocs(query(collection(db, 'estufas'), where("tenantId", "==", tenantId))),
    ]);

    const estufasMap = new Map<string, Estufa>();
    byUserId.forEach((item) => {
      estufasMap.set(item.id, { ...(item.data() as Estufa), id: item.id });
    });
    byTenantId.forEach((item) => {
      estufasMap.set(item.id, { ...(item.data() as Estufa), id: item.id });
    });

    return Array.from(estufasMap.values());
  } catch (error) {
    console.error("Erro ao listar estufas:", error);
    throw new Error("Erro ao buscar lista de estufas.");
  }
};

export const getEstufaById = async (id: string, userId: string): Promise<Estufa | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'estufas', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data() as Estufa;
    if (data.userId !== tenantId && data.tenantId !== tenantId) {
      throw new Error("Acesso negado: esta estufa não pertence ao seu tenant.");
    }
    
    return { ...data , id: docSnap.id };
  } catch (error) {
    console.error("Erro ao buscar estufa por ID:", error);
    throw error;
  }
};

export const updateEstufa = async (id: string, data: Partial<Estufa>, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    // Verifica propriedade antes de atualizar
    const estufa = await getEstufaById(id, tenantId);
    if (!estufa) throw new Error("Estufa não encontrada.");

    const docRef = doc(db, 'estufas', id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  } catch (error) {
    console.error("Erro ao atualizar estufa:", error);
    throw error instanceof Error ? error : new Error("Erro ao atualizar estufa.");
  }
};

export const deleteEstufa = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    // Verifica propriedade antes de excluir
    const estufa = await getEstufaById(id, tenantId);
    if (!estufa) throw new Error("Estufa não encontrada para exclusão.");

    const docRef = doc(db, 'estufas', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao eliminar estufa:", error);
    throw error instanceof Error ? error : new Error("Não foi possível excluir a estufa.");
  }
};
