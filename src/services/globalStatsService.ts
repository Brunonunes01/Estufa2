import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Despesa, Plantio, Venda } from '../types/domain';

export interface GlobalStatsResult {
  lucroTotal: number;
  totalReceita: number;
  totalCustoProd: number;
  totalDespesas: number;
  totalPlantios: number;
}

export const getGlobalStats = async (userId: string): Promise<GlobalStatsResult> => {
  try {
    const [plantiosSnap, vendasSnap, despesasSnap] = await Promise.all([
      getDocs(query(collection(db, 'plantios'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'vendas'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'despesas'), where('userId', '==', userId))),
    ]);

    const plantios = plantiosSnap.docs.map((d) => d.data() as Plantio);
    const vendas = vendasSnap.docs.map((d) => d.data() as Venda);
    const despesas = despesasSnap.docs.map((d) => d.data() as Despesa);

    const totalReceita = vendas.reduce((acc, curr) => acc + Number(curr.valorTotal || 0), 0);
    const totalCustoProd = plantios.reduce(
      (acc, curr) => acc + Number(curr.custoAcumulado || curr.custoTotal || 0),
      0
    );
    const totalDespesas = despesas.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

    return {
      lucroTotal: totalReceita - totalCustoProd - totalDespesas,
      totalReceita,
      totalCustoProd,
      totalDespesas,
      totalPlantios: plantios.length,
    };
  } catch (error) {
    console.error('Erro ao calcular stats:', error);
    return { lucroTotal: 0, totalReceita: 0, totalCustoProd: 0, totalDespesas: 0, totalPlantios: 0 };
  }
};
