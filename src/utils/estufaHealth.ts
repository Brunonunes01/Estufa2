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
  const activePlantio = relatedPlantios.find((plantio) => plantio.status !== 'finalizado');

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

  if (estufa.status === 'ativa' && !activePlantio) {
    level = getMaxLevel(level, 'warning');
    reasons.push('Sem ciclo ativo.');
  }

  if (activePlantio?.previsaoColheita) {
    const previsao = activePlantio.previsaoColheita.toDate();
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - previsao.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      level = getMaxLevel(level, 'critical');
      reasons.push('Ciclo com colheita prevista em atraso.');
    } else if (diffDays >= 2) {
      level = getMaxLevel(level, 'warning');
      reasons.push('Ciclo próximo ou ligeiramente atrasado.');
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
