// src/services/aplicacaoService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  runTransaction, // Importar Transação
  doc // Importar doc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Aplicacao, Insumo } from '../types/domain';

// Dados que vêm do formulário
export type AplicacaoFormData = {
  insumoId: string;
  quantidadeAplicada: number;
  unidade: string; // A unidade (ex: kg)
  dataAplicacao: Timestamp;
  observacoes: string | null;
};

// 1. CRIAR APLICAÇÃO (E DAR BAIXA NO ESTOQUE)
export const createAplicacao = async (
  data: AplicacaoFormData, 
  userId: string, 
  plantioId: string, 
  estufaId: string
) => {

  // Referência para o Insumo que será atualizado
  const insumoRef = doc(db, "insumos", data.insumoId);
  // Referência para a nova Aplicação que será criada
  const novaAplicacaoRef = doc(collection(db, "aplicacoes"));

  // Rodamos a Transação
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Lê o insumo do banco DE DENTRO da transação
      const insumoDoc = await transaction.get(insumoRef);
      if (!insumoDoc.exists()) {
        throw new Error("Insumo não encontrado!");
      }

      const insumoData = insumoDoc.data() as Insumo;

      // 2. Verifica se a unidade é a mesma (nossa regra de simplificação)
      if (insumoData.unidadePadrao !== data.unidade) {
        throw new Error(`A aplicação deve ser em ${insumoData.unidadePadrao}, mas foi em ${data.unidade}.`);
      }

      // 3. Calcula o novo estoque
      const estoqueAtual = insumoData.estoqueAtual;
      const novoEstoque = estoqueAtual - data.quantidadeAplicada;

      if (novoEstoque < 0) {
        throw new Error(`Estoque insuficiente! Restam apenas ${estoqueAtual} ${insumoData.unidadePadrao}.`);
      }

      // 4. Prepara a atualização do estoque
      transaction.update(insumoRef, { 
        estoqueAtual: novoEstoque,
        updatedAt: Timestamp.now()
      });

      // 5. Prepara a criação do registro de Aplicação
      const novaAplicacao = {
        ...data,
        userId: userId,
        plantioId: plantioId,
        estufaId: estufaId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      transaction.set(novaAplicacaoRef, novaAplicacao);
    });

    console.log("Transação concluída: Aplicação registrada e estoque atualizado!");

  } catch (error) {
    console.error("Erro na transação de aplicação: ", error);
    // Propaga o erro para o formulário (ex: "Estoque insuficiente!")
    throw error;
  }
};

// 2. LISTAR APLICAÇÕES DE UM PLANTIO
export const listAplicacoesByPlantio = async (userId: string, plantioId: string): Promise<Aplicacao[]> => {
  const aplicacoes: Aplicacao[] = [];
  try {
    const q = query(
      collection(db, 'aplicacoes'), 
      where("userId", "==", userId),
      where("plantioId", "==", plantioId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      aplicacoes.push({ id: doc.id, ...doc.data() } as Aplicacao);
    });
    
    return aplicacoes;

  } catch (error) {
    console.error("Erro ao listar aplicações: ", error);
    throw new Error('Não foi possível buscar as aplicações.');
  }
};