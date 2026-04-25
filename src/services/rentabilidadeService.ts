import { getPlantioById } from './plantioService';
import { listVendasByPlantio } from './vendaService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Despesa } from '../types/domain';
import { assertTenantId } from './tenantGuard';

export interface RentabilidadeResult {
  receitaTotal: number;
  custoInsumos: number;
  custoDespesas: number;
  custoTotal: number;
  lucroBruto: number;
  areaM2: number;
  rendimentoM2: number;
}

export const calculateRentabilidadeByPlantio = async (
  userId: string,
  plantioId: string,
  estufaAreaM2: number
): Promise<RentabilidadeResult> => {
  const tenantId = assertTenantId(userId);

  const [plantio, vendas, despesasSnap] = await Promise.all([
    getPlantioById(plantioId, tenantId),
    listVendasByPlantio(tenantId, plantioId),
    getDocs(query(
      collection(db, 'despesas'),
      where('tenantId', '==', tenantId),
      where('plantioId', '==', plantioId)
    ))
  ]);

  if (!plantio) {
    throw new Error('Plantio não encontrado.');
  }

  const receitaTotal = vendas.reduce((total, venda) => total + Number(venda.valorTotal || 0), 0);
  
  const custoInsumos = Number(plantio.custoAcumulado || 0);
  const custoDespesas = despesasSnap.docs.reduce((total, d) => total + Number((d.data() as Despesa).valor || 0), 0);
  
  const custoTotal = custoInsumos + custoDespesas;
  const lucroBruto = receitaTotal - custoTotal;

  // Se o plantio tiver ocupacaoEstimada, usa a área proporcional para o rendimento/m2
  const areaProporcional = estufaAreaM2 * (Number(plantio.ocupacaoEstimada || 100) / 100);
  const rendimentoM2 = areaProporcional > 0 ? receitaTotal / areaProporcional : 0;

  return {
    receitaTotal,
    custoInsumos,
    custoDespesas,
    custoTotal,
    lucroBruto,
    areaM2: areaProporcional,
    rendimentoM2,
  };
};
