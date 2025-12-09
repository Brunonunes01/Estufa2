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


    // 3. Cálculo do Custo de Insumos
    let custoInsumos = 0;
    const insumoIds = new Set<string>();
    
    // --- CORREÇÃO DE SEGURANÇA AQUI ---
    // 3a. Coleta IDs com verificação se 'app.itens' existe
    if (Array.isArray(aplicacoes)) {
        aplicacoes.forEach(app => {
            // Se app.itens for undefined, usa array vazio [] para não travar
            const itensSeguros = app.itens || []; 
            itensSeguros.forEach(item => {
                if (item.insumoId) insumoIds.add(item.insumoId);
            });
        });
    }

    // 3b. Busca o custo unitário atualizado dos insumos
    const insumosMap = new Map<string, Insumo>();
    
    if (insumoIds.size > 0) {
        const promisesInsumos = Array.from(insumoIds).map(id => getInsumoById(id));
        const fetchedInsumos = await Promise.all(promisesInsumos);
        
        fetchedInsumos.forEach(insumo => {
            if (insumo) {
                insumosMap.set(insumo.id, insumo);
            }
        });
    }

    // 3c. Soma o custo final
    if (Array.isArray(aplicacoes)) {
        aplicacoes.forEach(app => {
            const itensSeguros = app.itens || []; // Segurança novamente
            
            itensSeguros.forEach(item => {
                const insumoData = insumosMap.get(item.insumoId);
                
                if (insumoData && insumoData.custoUnitario !== null) {
                    // Custo = Quantidade Aplicada * Custo Unitário (do cadastro)
                    custoInsumos += (item.quantidadeAplicada * insumoData.custoUnitario);
                }
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