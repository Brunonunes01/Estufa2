import { Estufa, Plantio } from '../types/domain';

export type HealthLevel = 'ok' | 'warning' | 'critical';

export interface EstufaHealth {
  level: HealthLevel;
  label: 'OK' | 'ATENCAO' | 'CRITICO';
  reasons: string[];
}

const getMaxLevel = (current: HealthLevel, next: HealthLevel): HealthLevel => {
  const priority: Record<HealthLevel, number> = { ok: 0, warning: 1, critical: 2 };
  return priority[next] > priority[current] ? next : current;
};

export const evaluateEstufaHealth = (estufa: Estufa, plantios: Plantio[]): EstufaHealth => {
  const relatedPlantios = plantios.filter((plantio) => plantio.estufaId === estufa.id);
  const activeStatuses = new Set(['em_crescimento', 'colheita_iniciada', 'em_desenvolvimento', 'em_colheita']);
  const activePlantios = relatedPlantios.filter((plantio) => activeStatuses.has(plantio.status));
  const activePlantio = activePlantios[0];

  let level: HealthLevel = 'ok';
  const reasons: string[] = [];

  if (estufa.status === 'desativada') {
    level = getMaxLevel(level, 'critical');
    reasons.push('Estufa desativada.');
  }

  if (estufa.status === 'manutencao') {
    level = getMaxLevel(level, 'warning');
    reasons.push('Estufa em manutenção.');
  }

  if (estufa.status === 'ativa' && activePlantios.length === 0) {
    level = getMaxLevel(level, 'warning');
    reasons.push('Sem ciclo ativo.');
  }

  if (activePlantio?.previsaoColheita) {
    const previsao = activePlantio.previsaoColheita.toDate();
    const now = new Date();
    
    // Zera as horas para comparar apenas os dias
    previsao.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    // Calcula a diferença em dias
    const diffTime = previsao.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Passou da data prevista (Atrasado)
      level = getMaxLevel(level, 'critical');
      reasons.push(`Atraso na colheita (${Math.abs(diffDays)} dias).`);
    } else if (diffDays === 0) {
      // É hoje
      level = getMaxLevel(level, 'critical');
      reasons.push('Ponto de colheita atingido (É hoje!).');
    } else if (diffDays <= 3) {
      // Faltam 3 dias ou menos (Alerta para preparação)
      level = getMaxLevel(level, 'warning');
      reasons.push(`Preparar colheita (em ${diffDays} dias).`);
    }
  }

  const labelMap: Record<HealthLevel, 'OK' | 'ATENCAO' | 'CRITICO'> = {
    ok: 'OK',
    warning: 'ATENCAO',
    critical: 'CRITICO',
  };

  return {
    level,
    label: labelMap[level],
    reasons,
  };
};
