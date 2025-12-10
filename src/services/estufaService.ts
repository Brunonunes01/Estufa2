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
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Estufa } from '../types/domain';

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

export const createEstufa = async (data: EstufaFormData, userId: string) => {
  const novaEstufa = { ...data, userId, areaM2: (data.comprimentoM * data.larguraM), createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  const docRef = await addDoc(collection(db, 'estufas'), novaEstufa);
  return docRef.id;
};

// ATUALIZADO: Aceita o userId como filtro dinâmico
export const listEstufas = async (userId: string): Promise<Estufa[]> => {
  const estufas: Estufa[] = [];
  try {
    const q = query(
      collection(db, 'estufas'), 
      where("userId", "==", userId) 
    );
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

export const getEstufaById = async (estufaId: string): Promise<Estufa | null> => {
  try {
    const docRef = doc(db, 'estufas', estufaId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Estufa;
    return null;
  } catch (error) {
    console.error("Erro ao buscar estufa: ", error);
    throw new Error('Não foi possível buscar a estufa.');
  }
};

export const updateEstufa = async (estufaId: string, data: EstufaFormData) => {
    const ref = doc(db, 'estufas', estufaId);
    await updateDoc(ref, { ...data, areaM2: (data.comprimentoM * data.larguraM), updatedAt: Timestamp.now() });
};