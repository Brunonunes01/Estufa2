// src/services/globalStatsService.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Plantio, Colheita, Aplicacao, Insumo } from '../types/domain';

export interface GlobalStatsResult {
    lucroTotal: number;
    totalReceita: number;
    totalCusto: number;
    totalPlantios: number;
}

export const getGlobalStats = async (userId: string): Promise<GlobalStatsResult> => {
    // IMPORTANTE: Agora usamos o userId passado como parâmetro na query
    try {
        // 1. Buscar Plantios do usuário selecionado
        const qPlantios = query(collection(db, 'plantios'), where("userId", "==", userId));
        const plantiosSnap = await getDocs(qPlantios);
        const plantios = plantiosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plantio));

        // 2. Buscar Colheitas (Receitas) do usuário selecionado
        const qColheitas = query(collection(db, 'colheitas'), where("userId", "==", userId));
        const colheitasSnap = await getDocs(qColheitas);
        const colheitas = colheitasSnap.docs.map(d => ({ id: d.id, ...d.data() } as Colheita));

        // 3. Buscar Aplicações (Custos Variáveis) do usuário selecionado
        const qAplicacoes = query(collection(db, 'aplicacoes'), where("userId", "==", userId));
        const aplicacoesSnap = await getDocs(qAplicacoes);
        const aplicacoes = aplicacoesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Aplicacao));

        // 4. Buscar Insumos (Para saber custo unitário) do usuário selecionado
        const qInsumos = query(collection(db, 'insumos'), where("userId", "==", userId));
        const insumosSnap = await getDocs(qInsumos);
        const insumosMap = new Map<string, number>();
        insumosSnap.forEach(doc => {
            const data = doc.data() as Insumo;
            if (data.custoUnitario) insumosMap.set(doc.id, data.custoUnitario);
        });

        // --- CÁLCULOS ---

        // A. Receita Total
        const totalReceita = colheitas.reduce((acc, curr) => {
            return acc + (curr.quantidade * (curr.precoUnitario || 0));
        }, 0);

        // B. Custos
        let custoInsumos = 0;
        let custoMudas = 0;

        // Custo Inicial (Mudas/Sementes dos plantios)
        plantios.forEach(p => {
            custoMudas += (p.quantidadePlantada * (p.precoEstimadoUnidade || 0));
        });

        // Custo de Aplicações
        aplicacoes.forEach(app => {
            if (app.itens) {
                app.itens.forEach(item => {
                    const custoUnit = insumosMap.get(item.insumoId) || 0;
                    custoInsumos += (item.quantidadeAplicada * custoUnit);
                });
            }
        });

        const totalCusto = custoMudas + custoInsumos;
        const lucroTotal = totalReceita - totalCusto;

        return {
            lucroTotal,
            totalReceita,
            totalCusto,
            totalPlantios: plantios.length
        };

    } catch (error) {
        console.error("Erro ao calcular estatísticas globais:", error);
        return { lucroTotal: 0, totalReceita: 0, totalCusto: 0, totalPlantios: 0 };
    }
};