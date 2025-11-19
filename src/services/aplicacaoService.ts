// src/services/aplicacaoService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  runTransaction, 
  doc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Aplicacao, Insumo, AplicacaoItem } from '../types/domain';

export type AplicacaoFormData = {
  dataAplicacao: Timestamp;
  observacoes: string | null;
  volumeTanque: number | null;
  itens: AplicacaoItem[];
};

// 1. CRIAR APLICAÇÃO
export const createAplicacao = async (
  data: AplicacaoFormData, 
  userId: string, 
  plantioId: string, 
  estufaId: string
) => {

  if (data.itens.length === 0) {
    throw new Error("A aplicação precisa ter pelo menos um insumo.");
  }

  // Consolida itens duplicados (ex: se adicionou o mesmo adubo 2x, soma eles)
  const itensConsolidados = data.itens.reduce((acc, item) => {
    const existente = acc.find(i => i.insumoId === item.insumoId);
    if (existente) {
      existente.quantidadeAplicada += item.quantidadeAplicada;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as AplicacaoItem[]);

  const novaAplicacaoRef = doc(collection(db, "aplicacoes"));

  try {
    await runTransaction(db, async (transaction) => {
      
      // *** FASE 1: LEITURA RIGOROSA (READS) ***
      // Lemos todos os documentos necessários ANTES de qualquer escrita.
      const leituras = [];
      for (const item of itensConsolidados) {
        const ref = doc(db, "insumos", item.insumoId);
        leituras.push(transaction.get(ref));
      }

      // Espera todas as leituras terminarem
      const docsInsumos = await Promise.all(leituras);

      // *** FASE 2: VERIFICAÇÃO E CÁLCULO (MEMORY) ***
      // Agora processamos os dados na memória (sem chamar o banco ainda)
      const updatesParaFazer = [];

      for (let i = 0; i < itensConsolidados.length; i++) {
        const item = itensConsolidados[i];
        const insumoDoc = docsInsumos[i];

        if (!insumoDoc.exists()) {
          throw new Error(`Insumo "${item.nomeInsumo}" não encontrado no estoque!`);
        }

        const insumoData = insumoDoc.data() as Insumo;

        // Verifica unidade
        if (insumoData.unidadePadrao !== item.unidade) {
          throw new Error(`Unidade incorreta para "${item.nomeInsumo}". Esperado: ${insumoData.unidadePadrao}.`);
        }

        // Verifica estoque
        const novoEstoque = insumoData.estoqueAtual - item.quantidadeAplicada;
        if (novoEstoque < 0) {
          throw new Error(`Estoque insuficiente para "${item.nomeInsumo}"! Disponível: ${insumoData.estoqueAtual}. Necessário: ${item.quantidadeAplicada}.`);
        }

        // Guarda o update para fazer na fase 3
        updatesParaFazer.push({
          ref: insumoDoc.ref,
          novoEstoque: novoEstoque
        });
      }

      // *** FASE 3: ESCRITA (WRITES) ***
      // Só agora fazemos as escritas.
      
      // 1. Atualiza os estoques dos insumos
      for (const update of updatesParaFazer) {
        transaction.update(update.ref, { 
          estoqueAtual: update.novoEstoque,
          updatedAt: Timestamp.now()
        });
      }

      // 2. Salva o registro da aplicação
      const novaAplicacao = {
        ...data,
        userId: userId,
        plantioId: plantioId,
        estufaId: estufaId,
        itens: itensConsolidados, 
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      transaction.set(novaAplicacaoRef, novaAplicacao);
    });

    console.log("Transação concluída com sucesso!");

  } catch (error) {
    console.error("Erro na transação:", error);
    throw error;
  }
};

// 2. LISTAR APLICAÇÕES
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
    
    // Ordena por data
    aplicacoes.sort((a, b) => b.dataAplicacao.seconds - a.dataAplicacao.seconds);
    return aplicacoes;
  } catch (error) {
    console.error("Erro ao listar aplicações:", error);
    return [];
  }
};