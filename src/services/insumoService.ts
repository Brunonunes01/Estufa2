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
  updateDoc,
  deleteDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Insumo } from '../types/domain';
import { assertTenantId } from './tenantGuard';

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
  const tenantId = assertTenantId(userId);
  const novoInsumo = { ...data, userId: tenantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  const docRef = await addDoc(collection(db, 'insumos'), novoInsumo);
  return docRef.id;
};

export const updateInsumo = async (insumoId: string, data: Partial<InsumoFormData>, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const insumo = await getInsumoById(insumoId, tenantId);
    if (!insumo) throw new Error("Insumo não encontrado.");

    const ref = doc(db, 'insumos', insumoId);
    await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
  } catch (error) {
    console.error("Erro ao atualizar insumo:", error);
    throw error;
  }
};

export const listInsumos = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  const insumos: Insumo[] = [];
  try {
    const q = query(collection(db, 'insumos'), where("userId", "==", tenantId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      insumos.push({ id: doc.id, ...doc.data() } as Insumo);
    });
    return insumos;
  } catch (error) {
    console.error("Erro ao listar insumos: ", error);
    throw new Error("Não foi possível buscar os insumos.");
  }
};

export const listInsumosEmAlerta = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  const alertas: Insumo[] = [];
  try {
    const q = query(collection(db, 'insumos'), where("userId", "==", tenantId));
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
    throw new Error("Erro ao buscar alertas de estoque.");
  }
};

export const getInsumoById = async (insumoId: string, userId: string): Promise<Insumo | null> => {
    const tenantId = assertTenantId(userId);
    try {
      const docRef = doc(db, 'insumos', insumoId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Insumo;
        if (data.userId !== tenantId) {
          throw new Error("Acesso negado: este insumo não pertence ao seu tenant.");
        }
        return { id: docSnap.id, ...data } as Insumo;
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar insumo por ID:", error);
      throw error;
    }
};

export const deleteInsumo = async (insumoId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const insumo = await getInsumoById(insumoId, tenantId);
    if (!insumo) throw new Error("Insumo não encontrado para exclusão.");

    await deleteDoc(doc(db, 'insumos', insumoId));
  } catch (error) {
    console.error("Erro ao excluir insumo:", error);
    throw error;
  }
};

// --- FUNÇÃO NOVA E CORRIGIDA PARA ENTRADA DE ESTOQUE COM TRANSAÇÃO ---
export const addEstoqueToInsumo = async (insumoId: string, entryData: InsumoEntryData, userId: string) => {
  const tenantId = assertTenantId(userId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const insumoRef = doc(db, 'insumos', insumoId);
      const insumoSnap = await transaction.get(insumoRef);

      if (!insumoSnap.exists()) {
          throw new Error("Insumo não encontrado");
      }

      const insumo = insumoSnap.data() as Insumo;
      if (insumo.userId !== tenantId) {
          throw new Error("Acesso negado: este insumo não pertence ao seu tenant.");
      }

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
      transaction.update(insumoRef, {
          estoqueAtual: novoEstoque,
          custoUnitario: novoCusto,
          updatedAt: Timestamp.now()
      });

      // Salva no histórico de compras para auditoria
      const entradaRef = doc(collection(db, 'insumo_entradas'));
      transaction.set(entradaRef, {
          insumoId,
          nomeInsumo: insumo.nome,
          userId: tenantId,
          ...entryData,
          dataEntrada: Timestamp.now()
      });
    });
  } catch (error) {
    console.error("Erro ao adicionar estoque (transação):", error);
    throw error;
  }
};