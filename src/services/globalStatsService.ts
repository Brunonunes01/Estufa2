// src/services/globalStatsService.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Plantio, Colheita, Aplicacao, Insumo, Despesa } from '../types/domain';

export interface GlobalStatsResult {
    lucroTotal: number;     // Lucro Líquido Real
    totalReceita: number;
    totalCustoProd: number; // Custo Direto (Insumos + Mudas)
    totalDespesas: number;  // Custo Fixo (Energia, Mão de Obra, etc)
    totalPlantios: number;
}

export const getGlobalStats = async (userId: string): Promise<GlobalStatsResult> => {
    try {
        // 1. Buscas paralelas
        const [plantiosSnap, colheitasSnap, aplicacoesSnap, insumosSnap, despesasSnap] = await Promise.all([
            getDocs(query(collection(db, 'plantios'), where("userId", "==", userId))),
            getDocs(query(collection(db, 'colheitas'), where("userId", "==", userId))),
            getDocs(query(collection(db, 'aplicacoes'), where("userId", "==", userId))),
            getDocs(query(collection(db, 'insumos'), where("userId", "==", userId))),
            getDocs(query(collection(db, 'despesas'), where("userId", "==", userId))) // NOVO
        ]);

        const plantios = plantiosSnap.docs.map(d => d.data() as Plantio);
        const colheitas = colheitasSnap.docs.map(d => d.data() as Colheita);
        const aplicacoes = aplicacoesSnap.docs.map(d => d.data() as Aplicacao);
        const despesas = despesasSnap.docs.map(d => d.data() as Despesa);

        // Mapa de preços de insumos
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

        // B. Custo de Produção (Direto)
        let custoInsumos = 0;
        let custoMudas = 0;

        plantios.forEach(p => {
            custoMudas += (p.quantidadePlantada * (p.precoEstimadoUnidade || 0));
        });

        aplicacoes.forEach(app => {
            if (app.itens) {
                app.itens.forEach(item => {
                    const custoUnit = insumosMap.get(item.insumoId) || 0;
                    custoInsumos += (item.quantidadeAplicada * custoUnit);
                });
            }
        });

        const totalCustoProd = custoMudas + custoInsumos;

        // C. Despesas Gerais (Fixo) - NOVO
        const totalDespesas = despesas.reduce((acc, curr) => acc + (curr.valor || 0), 0);

        // D. Lucro Líquido
        const lucroTotal = totalReceita - totalCustoProd - totalDespesas;

        return {
            lucroTotal,
            totalReceita,
            totalCustoProd,
            totalDespesas,
            totalPlantios: plantios.length
        };

    } catch (error) {
        console.error("Erro ao calcular stats:", error);
        return { lucroTotal: 0, totalReceita: 0, totalCustoProd: 0, totalDespesas: 0, totalPlantios: 0 };
    }
};