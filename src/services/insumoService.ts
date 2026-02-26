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

// TIPO EXPORTADO PARA A TELA DE ENTRADA
export type InsumoEntryData = {
  quantidadeComprada: number;
  custoUnitarioCompra: number;
  fornecedorId: string | null;
  observacoes: string | null;
};

export const createInsumo = async (data: InsumoFormData, userId: string) => {
  const novoInsumo = { ...data, userId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  const docRef = await addDoc(collection(db, 'insumos'), novoInsumo);
  return docRef.id;
};

export const updateInsumo = async (insumoId: string, data: Partial<InsumoFormData>) => {
    const ref = doc(db, 'insumos', insumoId);
    await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
};

export const listInsumos = async (userId: string): Promise<Insumo[]> => {
  const insumos: Insumo[] = [];
  try {
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
    const q = query(collection(db, 'insumos'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const item = { id: doc.id, ...doc.data() } as Insumo;
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

// --- FUNÇÃO NOVA E CORRIGIDA PARA ENTRADA DE ESTOQUE ---
export const addEstoqueToInsumo = async (insumoId: string, entryData: InsumoEntryData) => {
  const insumoRef = doc(db, 'insumos', insumoId);
  const insumoSnap = await getDoc(insumoRef);

  if (!insumoSnap.exists()) {
      throw new Error("Insumo não encontrado");
  }

  const insumo = insumoSnap.data() as Insumo;

  const estoqueAntigo = insumo.estoqueAtual || 0;
  const custoAntigo = insumo.custoUnitario || 0;

  // Soma o estoque
  const novoEstoque = estoqueAntigo + entryData.quantidadeComprada;

  // Cálculo do Custo Médio Ponderado
  let novoCusto = custoAntigo;
  if (novoEstoque > 0) {
      const valorEstoqueAntigo = estoqueAntigo * custoAntigo;
      const valorNovaCompra = entryData.quantidadeComprada * entryData.custoUnitarioCompra;
      novoCusto = (valorEstoqueAntigo + valorNovaCompra) / novoEstoque;
  }

  // Atualiza o documento principal
  await updateDoc(insumoRef, {
      estoqueAtual: novoEstoque,
      custoUnitario: novoCusto,
      updatedAt: Timestamp.now()
  });

  // Salva no histórico de compras para auditoria
  await addDoc(collection(db, 'insumo_entradas'), {
      insumoId,
      nomeInsumo: insumo.nome,
      userId: insumo.userId,
      ...entryData,
      dataEntrada: Timestamp.now()
  });
};