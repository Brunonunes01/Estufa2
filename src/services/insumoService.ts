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

// Dados que vêm do formulário
export type InsumoFormData = {
  nome: string;
  tipo: "adubo" | "defensivo" | "semente" | "outro";
  unidadePadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number | null;
  custoUnitario: number | null;
  tamanhoEmbalagem: number | null;
  observacoes: string | null;
};

// Dados para o formulário de Entrada/Compra
export type InsumoEntryData = {
    quantidadeComprada: number;
    custoUnitarioCompra: number;
    fornecedorId: string | null;
    observacoes: string | null;
}

// 1. CRIAR INSUMO
export const createInsumo = async (data: InsumoFormData, userId: string) => {
  const novoInsumo = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    fornecedorId: null, 
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

// 2. ATUALIZAR INSUMO
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

// 3. LISTAR INSUMOS
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
    console.error("Erro REAL ao listar insumos: ", error);
    throw error;
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

// ****** NOVA FUNÇÃO PARA ENTRADA DE ESTOQUE ******
export const addEstoqueToInsumo = async (
    insumoId: string, 
    data: InsumoEntryData
) => {
    const insumoRef = doc(db, 'insumos', insumoId);

    try {
        const docSnap = await getDoc(insumoRef);
        if (!docSnap.exists()) {
            throw new Error("Insumo não encontrado.");
        }
        
        const insumoAtual = docSnap.data() as Insumo;
        
        const novaQuantidade = insumoAtual.estoqueAtual + data.quantidadeComprada;
        
        // CÁLCULO DE CUSTO MÉDIO PONDERADO (Melhoria de funcionalidade!)
        let novoCustoUnitario = insumoAtual.custoUnitario;

        if (insumoAtual.custoUnitario !== null && insumoAtual.estoqueAtual > 0) {
            // Calcula o custo total antigo
            const custoTotalAntigo = insumoAtual.custoUnitario * insumoAtual.estoqueAtual;
            
            // Calcula o custo total da nova compra
            const custoTotalNovo = data.custoUnitarioCompra * data.quantidadeComprada;

            // Calcula o novo Custo Médio Ponderado
            const estoqueTotal = insumoAtual.estoqueAtual + data.quantidadeComprada;
            novoCustoUnitario = (custoTotalAntigo + custoTotalNovo) / estoqueTotal;
        } else {
            // Se o estoque atual é zero ou o custo antigo é nulo, o novo custo é o da compra
            novoCustoUnitario = data.custoUnitarioCompra;
        }

        const dadosAtualizados = {
            estoqueAtual: novaQuantidade,
            custoUnitario: novoCustoUnitario,
            fornecedorId: data.fornecedorId || insumoAtual.fornecedorId, // Atualiza o fornecedor, se houver
            updatedAt: Timestamp.now(),
        };

        await updateDoc(insumoRef, dadosAtualizados);
        
        // Opcional: Adicionar um registro da movimentação em uma nova coleção 'movimentacoes'
        // Este passo pode ser implementado depois para manter a auditoria.
        
        console.log(`Estoque de ${insumoAtual.nome} atualizado.`);

    } catch (error) {
        console.error("Erro ao adicionar estoque: ", error);
        throw new Error('Não foi possível registrar a entrada de estoque.');
    }
};

// 6. ADICIONAR REGISTRO DE MOVIMENTAÇÃO (Vazio por enquanto)