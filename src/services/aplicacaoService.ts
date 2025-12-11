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

// 1. TIPO EXPORTADO PARA A TELA
export interface AplicacaoItemData {
  insumoId: string;
  nomeInsumo: string;
  unidade: string;
  dosePorTanque: number;
  quantidadeAplicada?: number;
}

// 2. TIPO DO FORMULÁRIO
export type AplicacaoFormData = {
  plantioId: string;
  estufaId: string;
  dataAplicacao?: Timestamp;
  observacoes: string | null;
  volumeTanque: number | null;
  numeroTanques: number | null; 
  itens: AplicacaoItemData[];
};

// 3. CRIAR APLICAÇÃO (PERMITE ESTOQUE NEGATIVO)
export const createAplicacao = async (
  data: AplicacaoFormData, 
  userId: string 
) => {

  if (data.itens.length === 0) {
    throw new Error("A aplicação precisa ter pelo menos um insumo.");
  }

  // Consolida itens duplicados
  const itensConsolidados: AplicacaoItem[] = data.itens.reduce((acc: AplicacaoItem[], item) => {
    const qtd = item.quantidadeAplicada || 0;
    const existente = acc.find(i => i.insumoId === item.insumoId);
    
    if (existente) {
      existente.quantidadeAplicada += qtd;
    } else {
      acc.push({
        insumoId: item.insumoId,
        nomeInsumo: item.nomeInsumo,
        unidade: item.unidade,
        quantidadeAplicada: qtd,
        dosePorTanque: item.dosePorTanque 
      });
    }
    return acc;
  }, []);

  const novaAplicacaoRef = doc(collection(db, "aplicacoes"));

  try {
    await runTransaction(db, async (transaction) => {
      
      // FASE 1: LEITURA DOS INSUMOS
      const leituras = [];
      for (const item of itensConsolidados) {
        const ref = doc(db, "insumos", item.insumoId);
        leituras.push(transaction.get(ref));
      }

      const docsInsumos = await Promise.all(leituras);

      // FASE 2: CÁLCULOS
      const updatesParaFazer = [];

      for (let i = 0; i < itensConsolidados.length; i++) {
        const item = itensConsolidados[i];
        const insumoDoc = docsInsumos[i];

        if (!insumoDoc.exists()) {
          throw new Error(`Insumo "${item.nomeInsumo}" não encontrado! Cadastre-o primeiro.`);
        }

        const insumoData = insumoDoc.data() as Insumo;

        // Proteção: Se estoqueAtual for null/undefined, assume 0
        const estoqueAtual = insumoData.estoqueAtual || 0;

        // CÁLCULO QUE PERMITE NEGATIVO:
        // Ex: 0 - 5 = -5. O Firestore aceita números negativos sem problemas.
        const novoEstoque = estoqueAtual - item.quantidadeAplicada;
        
        updatesParaFazer.push({
          ref: insumoDoc.ref,
          novoEstoque: novoEstoque
        });
      }

      // FASE 3: ESCRITA
      // 1. Atualiza estoques (ficando negativo se necessário)
      for (const update of updatesParaFazer) {
        transaction.update(update.ref, { 
          estoqueAtual: update.novoEstoque,
          updatedAt: Timestamp.now()
        });
      }

      // 2. Salva a Aplicação
      const novaAplicacao = {
        plantioId: data.plantioId,
        estufaId: data.estufaId,
        userId: userId,
        dataAplicacao: data.dataAplicacao || Timestamp.now(),
        observacoes: data.observacoes || null,
        volumeTanque: data.volumeTanque || 0,
        numeroTanques: data.numeroTanques || 1,
        itens: itensConsolidados,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      transaction.set(novaAplicacaoRef, novaAplicacao);
    });

    console.log("Aplicação registrada. Estoques atualizados (mesmo que negativos).");

  } catch (error) {
    console.error("Erro na transação de aplicação:", error);
    throw error;
  }
};

// 4. LISTAR APLICAÇÕES
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
    
    aplicacoes.sort((a, b) => b.dataAplicacao.seconds - a.dataAplicacao.seconds);
    return aplicacoes;
  } catch (error) {
    console.error("Erro ao listar aplicações:", error);
    return [];
  }
};