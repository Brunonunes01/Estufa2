// src/services/estufaService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  doc,
  getDoc,
  updateDoc // Importar
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Estufa } from '../types/domain';

// Tipo para os dados do formulário
export type EstufaFormData = {
  nome: string;
  dataFabricacao: Timestamp | null;
  comprimentoM: number;
  larguraM: number;
  alturaM: number;
  tipoCobertura: string | null;
  responsavel: string | null;
  status: "ativa" | "manutencao" | "desativada";
  observacoes: string | null;
};

// 1. CRIAR ESTUFA
export const createEstufa = async (data: EstufaFormData, userId: string) => {
  const novaEstufa = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    areaM2: data.comprimentoM * data.larguraM
  };

  try {
    const docRef = await addDoc(collection(db, 'estufas'), novaEstufa);
    console.log('Estufa criada com ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar estufa: ", error);
    throw new Error('Não foi possível criar a estufa.');
  }
};

// 2. LISTAR ESTUFAS DO USUÁRIO
export const listEstufas = async (userId: string): Promise<Estufa[]> => {
  if (!userId) {
    console.log("listEstufas: userId está vazio.");
    return [];
  }
  const estufas: Estufa[] = [];
  try {
    const q = query(collection(db, 'estufas'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      estufas.push({ id: doc.id, ...doc.data() } as Estufa);
    });
    return estufas;
  } catch (error) {
    console.error("Erro ao listar estufas: ", error);
    throw new Error('Não foi possível buscar as estufas.');
  }
};

// 3. BUSCAR ESTUFA POR ID (Já tínhamos)
export const getEstufaById = async (estufaId: string): Promise<Estufa | null> => {
  try {
    const docRef = doc(db, 'estufas', estufaId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Estufa;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar estufa por ID: ", error);
    throw new Error('Não foi possível buscar a estufa.');
  }
};

// 4. ATUALIZAR ESTUFA (Função Nova)
export const updateEstufa = async (estufaId: string, data: EstufaFormData) => {
  const estufaRef = doc(db, 'estufas', estufaId);

  // Recalcula a área e adiciona a data de atualização
  const dadosAtualizados = {
    ...data,
    areaM2: data.comprimentoM * data.larguraM,
    updatedAt: Timestamp.now(),
  };

  try {
    await updateDoc(estufaRef, dadosAtualizados);
    console.log('Estufa atualizada com ID: ', estufaId);
  } catch (error) {
    console.error("Erro ao atualizar estufa: ", error);
    throw new Error('Não foi possível atualizar a estufa.');
  }
};