// src/services/manejoService.ts
import { collection, addDoc, query, where, getDocs, Timestamp, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { RegistroManejo } from '../types/domain';

// 1. CRIAR REGISTRO DE MANEJO
export const createManejo = async (data: Partial<RegistroManejo>, userId: string) => {
  const novoManejo = {
    ...data,
    userId: userId,
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

// 2. LISTAR MANEJOS DE UM LOTE ESPECÍFICO (Ordenado por data)
export const listManejosByPlantio = async (userId: string, plantioId: string): Promise<RegistroManejo[]> => {
  if (!plantioId) return [];

  const manejos: RegistroManejo[] = [];
  try {
    const q = query(
      collection(db, 'manejos'), 
      where("userId", "==", userId),
      where("plantioId", "==", plantioId)
    );
    
    // O Firestore pode pedir a criação de um índice no console por causa da ordenação no app.
    // Se der erro de índice ao testar, o erro vai gerar um link direto para criar no painel do Firebase.
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      manejos.push({ id: doc.id, ...doc.data() } as RegistroManejo);
    });
    
    // Ordena localmente por data de registro (mais recente primeiro) para evitar problemas de índice complexo agora
    return manejos.sort((a, b) => b.dataRegistro.toMillis() - a.dataRegistro.toMillis());

  } catch (error) {
    console.error("Erro ao listar manejos: ", error);
    throw new Error('Não foi possível buscar os registros.');
  }
};

// 3. ELIMINAR REGISTRO
export const deleteManejo = async (id: string) => {
  try {
    const docRef = doc(db, 'manejos', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao eliminar manejo: ", error);
    throw new Error("Não foi possível excluir o registro.");
  }
};