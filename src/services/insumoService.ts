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
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Insumo } from '../types/domain';

export type InsumoFormData = {
  nome: string;
  tipo: "adubo" | "defensivo" | "semente" | "outro";
  unidadePadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number | null;
  custoUnitario: number | null;
  fornecedorId: string | null;
  tamanhoEmbalagem: number | null;
  observacoes: string | null;
};

// ... (CreateInsumo e UpdateInsumo não precisam mudar muito, pois usam o user logado na criação, mas na listagem sim)

export const createInsumo = async (data: InsumoFormData, userId: string) => {
  /* ... código de criar igual ao anterior ... */
  const novoInsumo = { ...data, userId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  const docRef = await addDoc(collection(db, 'insumos'), novoInsumo);
  return docRef.id;
};

export const updateInsumo = async (insumoId: string, data: Partial<InsumoFormData>) => {
    const ref = doc(db, 'insumos', insumoId);
    await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
};

// --- ALTERAÇÕES IMPORTANTES AQUI PARA BAIXO ---

export const listInsumos = async (userId: string): Promise<Insumo[]> => {
  const insumos: Insumo[] = [];
  try {
    // Usa o userId recebido (que pode ser do parceiro)
    const q = query(collection(db, 'insumos'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      insumos.push({ id: doc.id, ...doc.data() } as Insumo);
    });
    return insumos;
  } catch (error) {
    console.error("Erro ao listar insumos: ", error);
    return [];
  }
};

export const listInsumosEmAlerta = async (userId: string): Promise<Insumo[]> => {
  const alertas: Insumo[] = [];
  try {
    // Usa o userId recebido
    const q = query(collection(db, 'insumos'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const item = { id: doc.id, ...doc.data() } as Insumo;
      // Lógica de alerta
      if (item.estoqueMinimo && item.estoqueAtual <= item.estoqueMinimo) {
        alertas.push(item);
      }
    });
    return alertas;
  } catch (error) {
    console.error("Erro ao buscar alertas: ", error);
    return [];
  }
};

export const getInsumoById = async (insumoId: string): Promise<Insumo | null> => {
    const docRef = doc(db, 'insumos', insumoId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Insumo;
    return null;
};