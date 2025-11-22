// src/services/globalStatsService.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Plantio } from '../types/domain';
import { listColheitasByPlantio } from './colheitaService';
import { listAplicacoesByPlantio } from './aplicacaoService';
import { getInsumoById } from './insumoService';

export interface GlobalStatsResult {
  totalPlantios: number;
  totalReceita: number;
  totalCusto: number;
  lucroTotal: number;
}

export const getGlobalStats = async (userId: string): Promise<GlobalStatsResult> => {
  const plantiosCollectionRef = collection(db, 'plantios');
  const q = query(plantiosCollectionRef, where('userId', '==', userId));
  const plantiosSnapshot = await getDocs(q);

  let totalReceita = 0;
  let totalCusto = 0;

  const plantioPromises = plantiosSnapshot.docs.map(async (plantioDoc) => {
    // >>> AQUI: garante que nunca vamos espalhar undefined
    const data = plantioDoc.data() || {};
    const plantio = { id: plantioDoc.id, ...data } as Plantio;

    // Se por algum motivo não tiver os campos esperados, usa 0
    const quantidadePlantada = Number(plantio.quantidadePlantada ?? 0);
    const precoEstimadoUnidade = Number(plantio.precoEstimadoUnidade ?? 0);

    // Custo Inicial (Mudas/Sementes)
    const custoInicial = quantidadePlantada * precoEstimadoUnidade;

    // Receita Total (de todas as colheitas)
    const colheitas = await listColheitasByPlantio(userId, plantio.id);
    const receitaPlantio = colheitas.reduce((total, colheita) => {
      const quantidade = Number(colheita.quantidade ?? 0);
      const precoUnitario = Number(colheita.precoUnitario ?? 0);
      return total + quantidade * precoUnitario;
    }, 0);

    // Custo Insumos (de todas as aplicações)
    let custoInsumosPlantio = 0;
    const aplicacoes = await listAplicacoesByPlantio(userId, plantio.id);

    for (const app of aplicacoes) {
      // >>> Garante que sempre seja array
      const itens = app.itens || [];
      for (const item of itens) {
        const insumo = await getInsumoById(item.insumoId);
        if (insumo && insumo.custoUnitario != null) {
          const quantidadeAplicada = Number(item.quantidadeAplicada ?? 0);
          const custoUnitario = Number(insumo.custoUnitario ?? 0);
          custoInsumosPlantio += quantidadeAplicada * custoUnitario;
        }
      }
    }

    const custoTotalPlantio = custoInicial + custoInsumosPlantio;

    totalReceita += receitaPlantio;
    totalCusto += custoTotalPlantio;
  });

  await Promise.all(plantioPromises);

  const lucroTotal = totalReceita - totalCusto;

  return {
    totalPlantios: plantiosSnapshot.docs.length,
    totalReceita,
    totalCusto,
    lucroTotal,
  };
};
