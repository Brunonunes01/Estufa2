// src/services/insumoService.ts
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
import { Insumo } from '../types/domain';

// Dados que vêm do formulário (MODIFICADO)
export type InsumoFormData = {
  nome: string;
  tipo: "adubo" | "defensivo" | "semente" | "outro";
  unidadePadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number | null;
  custoUnitario: number | null;
  tamanhoEmbalagem: string | null; // <-- CAMPO NOVO
  observacoes: string | null; // <-- CAMPO NOVO (Descrição)
};

// 1. CRIAR INSUMO (MODIFICADO)
export const createInsumo = async (data: InsumoFormData, userId: string) => {
  const novoInsumo = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    fornecedorId: null, // Deixamos nulo por enquanto
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

// 2. ATUALIZAR INSUMO (Função Nova)
export const updateInsumo = async (insumoId: string, data: InsumoFormData) => {
  const insumoRef = doc(db, 'insumos', insumoId);
  const dadosAtualizados = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  try {
    await updateDoc(insumoRef, dadosAtualizados);
    console.log('Insumo atualizado com ID: ', insumoId);
  } catch (error) {
    console.error("Erro ao atualizar insumo: ", error);
    throw new Error('Não foi possível atualizar o insumo.');
  }
};

// 3. LISTAR INSUMOS (Todos)
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

// 4. LISTAR INSUMOS EM ALERTA
export const listInsumosEmAlerta = async (userId: string): Promise<Insumo[]> => {
  const insumosEmAlerta: Insumo[] = [];
  if (!userId) return insumosEmAlerta;
  try {
    const insumos = await listInsumos(userId);
    const alertas = insumos.filter(insumo => {
      if (insumo.estoqueMinimo !== null) {
        return insumo.estoqueAtual < insumo.estoqueMinimo;
      }
      return false;
    });
    return alertas;
  } catch (error) {
    console.error("Erro ao listar insumos em alerta: ", error);
    return []; 
  }
};

// 5. BUSCAR INSUMO POR ID
export const getInsumoById = async (insumoId: string): Promise<Insumo | null> => {
  try {
    const docRef = doc(db, 'insumos', insumoId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Insumo;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar insumo por ID: ", error);
    throw new Error('Não foi possível buscar o insumo.');
  }
};