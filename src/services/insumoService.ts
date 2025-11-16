// src/services/insumoService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Insumo } from '../types/domain';

// Dados que vêm do formulário
export type InsumoFormData = {
  nome: string;
  tipo: "adubo" | "defensivo" | "semente" | "outro";
  unidadePadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number | null;
  custoUnitario: number | null;
};

// 1. CRIAR INSUMO
export const createInsumo = async (data: InsumoFormData, userId: string) => {
  const novoInsumo = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    fornecedorId: null, // Não vamos usar no form inicial
    observacoes: null,
  };

  try {
    const docRef = await addDoc(collection(db, 'insumos'), novoInsumo);
    console.log('Insumo criado com ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar insumo: ", error);
    throw new Error('Não foi possível criar o insumo.');
  }
};

// 2. LISTAR INSUMOS
export const listInsumos = async (userId: string): Promise<Insumo[]> => {
  const insumos: Insumo[] = [];
  try {
    const q = query(
      collection(db, 'insumos'), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      insumos.push({ id: doc.id, ...doc.data() } as Insumo);
    });
    
    return insumos;

  } catch (error) {
    console.error("Erro ao listar insumos: ", error);
    throw new Error('Não foi possível buscar os insumos.');
  }
};