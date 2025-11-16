// src/services/insumoService.ts
import { 
  collection, 
  addDoc, 
  query,  
  getDocs, 
  Timestamp,
  where // Importação duplicada, mas não tem problema
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
    fornecedorId: null, 
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

// 2. LISTAR INSUMOS (Todos)
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

// 3. LISTAR INSUMOS EM ALERTA (Função Nova)
export const listInsumosEmAlerta = async (userId: string): Promise<Insumo[]> => {
  const insumosEmAlerta: Insumo[] = [];
  if (!userId) return insumosEmAlerta;

  try {
    // 1. Busca todos os insumos do usuário
    const insumos = await listInsumos(userId);

    // 2. Filtra no lado do cliente (app)
    // O Firestore não permite a consulta "<" (estoqueAtual < estoqueMinimo) diretamente
    // de forma eficiente entre dois campos do mesmo documento.
    // Como o volume de insumos por produtor é pequeno, filtrar no app é a melhor solução.
    
    const alertas = insumos.filter(insumo => {
      // Só alerta se 'estoqueMinimo' estiver definido (não for null)
      if (insumo.estoqueMinimo !== null) {
        return insumo.estoqueAtual < insumo.estoqueMinimo;
      }
      return false;
    });

    return alertas;

  } catch (error) {
    console.error("Erro ao listar insumos em alerta: ", error);
    // Retorna vazio em caso de erro, para não quebrar o Dashboard
    return []; 
  }
};