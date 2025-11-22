// src/services/rentabilidadeService.ts
import { db } from './firebaseConfig';
import { Plantio, Colheita, Aplicacao, Insumo, AplicacaoItem } from '../types/domain';
import { getPlantioById } from './plantioService';
import { listColheitasByPlantio } from './colheitaService';
import { listAplicacoesByPlantio } from './aplicacaoService';
import { getInsumoById } from './insumoService';

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
    estufaAreaM2: number // A área da estufa é necessária para o cálculo do rendimento
): Promise<RentabilidadeResult> => {

    // 1. Coleta de Dados
    const [plantio, colheitas, aplicacoes] = await Promise.all([
        getPlantioById(plantioId),
        listColheitasByPlantio(userId, plantioId),
        listAplicacoesByPlantio(userId, plantioId),
    ]);

    if (!plantio) {
        throw new Error("Plantio não encontrado.");
    }
    
    // Custo Inicial do Plantio (Sementes/Mudas)
    const custoInicial = (plantio.quantidadePlantada * (plantio.precoEstimadoUnidade || 0));

    // 2. Cálculo da Receita Total
    const receitaTotal = colheitas.reduce((total, colheita) => {
        const valorColheita = colheita.quantidade * (colheita.precoUnitario || 0);
        return total + valorColheita;
    }, 0);


    // 3. Cálculo do Custo de Insumos (O mais complexo)
    let custoInsumos = 0;
    const insumoIds = new Set<string>();
    
    // 3a. Coleta de todos os IDs de insumos usados em todas as aplicações
    aplicacoes.forEach(app => {
        app.itens.forEach(item => insumoIds.add(item.insumoId));
    });

    // 3b. Busca o custo unitário (Custo Médio Ponderado) de todos os insumos usados
    const insumosMap = new Map<string, Insumo>();
    const promisesInsumos = Array.from(insumoIds).map(id => getInsumoById(id));
    const fetchedInsumos = await Promise.all(promisesInsumos);
    
    fetchedInsumos.forEach(insumo => {
        if (insumo) {
            insumosMap.set(insumo.id, insumo);
        }
    });

    // 3c. Soma o custo de insumos para cada aplicação
    aplicacoes.forEach(app => {
        app.itens.forEach(item => {
            const insumoData = insumosMap.get(item.insumoId);
            
            if (insumoData && insumoData.custoUnitario !== null) {
                // Custo = Quantidade Aplicada * Custo Unitário (CMP)
                custoInsumos += (item.quantidadeAplicada * insumoData.custoUnitario);
            } else {
                // Se o custo unitário não estiver cadastrado, ignora (ou loga um aviso)
                console.warn(`Custo unitário não encontrado ou nulo para o insumo ID: ${item.insumoId}`);
            }
        });
    });

    // 4. Cálculo dos Totais
    const custoTotal = custoInicial + custoInsumos;
    const lucroBruto = receitaTotal - custoTotal;
    
    // 5. Rendimento por Área (Receita por M2)
    const rendimentoM2 = estufaAreaM2 > 0 ? (receitaTotal / estufaAreaM2) : 0;


    return {
        receitaTotal,
        custoInsumos,
        custoTotal,
        lucroBruto,
        areaM2: estufaAreaM2,
        rendimentoM2,
    };
};