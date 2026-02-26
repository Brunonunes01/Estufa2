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
  custoUnitarioNaAplicacao?: number; // NOVO
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

// 3. CRIAR APLICAÇÃO (PERMITE ESTOQUE NEGATIVO E CONGELA CUSTO)
export const createAplicacao = async (
  data: AplicacaoFormData, 
  userId: string 
) => {

  if (data.itens.length === 0) {
    throw new Error("A aplicação precisa ter pelo menos um insumo.");
  }

  // Consolida itens duplicados da tela (se o usuário add 2x o mesmo produto)
  const itensConsolidados: AplicacaoItemData[] = data.itens.reduce((acc: AplicacaoItemData[], item) => {
    const qtd = item.quantidadeAplicada || 0;
    const existente = acc.find(i => i.insumoId === item.insumoId);
    
    if (existente) {
      existente.quantidadeAplicada = (existente.quantidadeAplicada || 0) + qtd;
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

      // FASE 2: CÁLCULOS E CONGELAMENTO DE CUSTO
      const updatesParaFazer = [];
      const itensComCustoHistorico: AplicacaoItem[] = [];

      for (let i = 0; i < itensConsolidados.length; i++) {
        const item = itensConsolidados[i];
        const insumoDoc = docsInsumos[i];

        if (!insumoDoc.exists()) {
          throw new Error(`Insumo "${item.nomeInsumo}" não encontrado! Cadastre-o primeiro.`);
        }

        const insumoData = insumoDoc.data() as Insumo;

        const estoqueAtual = insumoData.estoqueAtual || 0;
        const novoEstoque = estoqueAtual - (item.quantidadeAplicada || 0);
        
        // CONGELAMENTO: Pega o custo real no momento deste clique
        const custoAtual = insumoData.custoUnitario || 0;

        updatesParaFazer.push({
          ref: insumoDoc.ref,
          novoEstoque: novoEstoque
        });

        itensComCustoHistorico.push({
            insumoId: item.insumoId,
            nomeInsumo: item.nomeInsumo,
            unidade: item.unidade,
            quantidadeAplicada: item.quantidadeAplicada || 0,
            dosePorTanque: item.dosePorTanque,
            custoUnitarioNaAplicacao: custoAtual // Salva a "fotografia" do preço
        });
      }

      // FASE 3: ESCRITA NO BANCO
      for (const update of updatesParaFazer) {
        transaction.update(update.ref, { 
          estoqueAtual: update.novoEstoque,
          updatedAt: Timestamp.now()
        });
      }

      const novaAplicacao = {
        plantioId: data.plantioId,
        estufaId: data.estufaId,
        userId: userId,
        dataAplicacao: data.dataAplicacao || Timestamp.now(),
        observacoes: data.observacoes || null,
        volumeTanque: data.volumeTanque || 0,
        numeroTanques: data.numeroTanques || 1,
        itens: itensComCustoHistorico, // Passa a lista com os custos congelados
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      transaction.set(novaAplicacaoRef, novaAplicacao);
    });

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