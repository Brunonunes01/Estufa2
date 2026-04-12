import { getPlantioById } from './plantioService';
import { listVendasByPlantio } from './vendaService';

export interface RentabilidadeResult {
  receitaTotal: number;
  custoInsumos: number;
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
  const [plantio, vendas] = await Promise.all([
    getPlantioById(plantioId, userId),
    listVendasByPlantio(userId, plantioId),
  ]);

  if (!plantio) {
    throw new Error('Plantio não encontrado.');
  }

  const receitaTotal = vendas.reduce((total, venda) => total + Number(venda.valorTotal || 0), 0);

  const custoTotal = Number(plantio.custoAcumulado || plantio.custoTotal || 0);
  const lucroBruto = receitaTotal - custoTotal;
  const rendimentoM2 = estufaAreaM2 > 0 ? receitaTotal / estufaAreaM2 : 0;

  return {
    receitaTotal,
    custoInsumos: custoTotal,
    custoTotal,
    lucroBruto,
    areaM2: estufaAreaM2,
    rendimentoM2,
  };
};
