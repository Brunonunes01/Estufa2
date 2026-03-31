import { listEstufas } from './estufaService';
import { getTotalContasAReceber } from './colheitaService';
import { getTotalDespesasPendentes } from './despesaService';
import { listActivePlantiosByUser } from './plantioService';
import { Estufa, Plantio } from '../types/domain';

export interface DashboardSummary {
  estufas: Estufa[];
  activePlantios: Plantio[];
  totalReceber: number;
  totalPagar: number;
}

export const getDashboardSummary = async (userId: string): Promise<DashboardSummary> => {
  const [estufas, activePlantios, totalReceber, totalPagar] = await Promise.all([
    listEstufas(userId),
    listActivePlantiosByUser(userId),
    getTotalContasAReceber(userId),
    getTotalDespesasPendentes(userId),
  ]);

  return {
    estufas,
    activePlantios,
    totalReceber,
    totalPagar,
  };
};
