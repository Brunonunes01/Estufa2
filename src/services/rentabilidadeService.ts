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
    estufaAreaM2: number
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

    // 2. Cálculo da Receita Total (Soma das Colheitas)
    const receitaTotal = colheitas.reduce((total, colheita) => {
        const valorColheita = colheita.quantidade * (colheita.precoUnitario || 0);
        return total + valorColheita;
    }, 0);


    // 3. Cálculo do Custo de Insumos (AGORA INTELIGENTE)
    let custoInsumos = 0;
    
    // Fallback: Se for uma aplicação muito antiga, ela não terá o "custoUnitarioNaAplicacao"
    // Então vamos buscar o insumo no banco só para essas exceções
    const insumoIdsFaltantes = new Set<string>();
    
    if (Array.isArray(aplicacoes)) {
        aplicacoes.forEach(app => {
            const itensSeguros = app.itens || []; 
            itensSeguros.forEach(item => {
                if (item.custoUnitarioNaAplicacao === undefined && item.insumoId) {
                    insumoIdsFaltantes.add(item.insumoId);
                }
            });
        });
    }

    const insumosMap = new Map<string, Insumo>();
    if (insumoIdsFaltantes.size > 0) {
        const promisesInsumos = Array.from(insumoIdsFaltantes).map(id => getInsumoById(id));
        const fetchedInsumos = await Promise.all(promisesInsumos);
        fetchedInsumos.forEach(insumo => {
            if (insumo) insumosMap.set(insumo.id, insumo);
        });
    }

    // Soma o custo final de todas as aplicações
    if (Array.isArray(aplicacoes)) {
        aplicacoes.forEach(app => {
            const itensSeguros = app.itens || []; 
            
            itensSeguros.forEach(item => {
                let custo = item.custoUnitarioNaAplicacao;
                
                // Se a aplicação for velha e não tiver custo salvo, usa o da prateleira (fallback)
                if (custo === undefined) {
                    const insumoData = insumosMap.get(item.insumoId);
                    custo = insumoData?.custoUnitario || 0;
                }

                custoInsumos += (item.quantidadeAplicada * custo);
            });
        });
    }

    // 4. Totais Finais
    const custoTotal = custoInicial + custoInsumos;
    const lucroBruto = receitaTotal - custoTotal;
    
    // 5. Rendimento (R$/m²)
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