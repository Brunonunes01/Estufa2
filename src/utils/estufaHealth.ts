import type { Estufa, Plantio, RegistroManejo } from '../types/domain';

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

export const evaluateEstufaHealth = (
  estufa: Estufa,
  plantios: Plantio[],
  manejos: RegistroManejo[] = []
): EstufaHealth => {
  const relatedPlantios = plantios.filter((plantio) => plantio.estufaId === estufa.id);
  const activeStatuses = new Set([
    'em_crescimento',
    'colheita_iniciada',
    'em_desenvolvimento',
    'em_colheita',
    'desenvolvimento',
  ]);
  const activePlantios = relatedPlantios.filter((plantio) => activeStatuses.has(plantio.status));
  const activePlantio = activePlantios[0];

  let level: HealthLevel = 'ok';
  const reasons: string[] = [];

  // 1. Status da Estufa
  if (estufa.status === 'desativada') {
    level = getMaxLevel(level, 'critical');
    reasons.push('Estufa desativada.');
  }

  if (estufa.status === 'manutencao') {
    level = getMaxLevel(level, 'warning');
    reasons.push('Estufa em manutenção.');
  }

  // 2. Equipamentos (Motores)
  const motoresComProblema = estufa.motores?.filter((m) => m.status === 'manutencao' || m.status === 'inativo') || [];
  if (motoresComProblema.length > 0) {
    level = getMaxLevel(level, 'warning');
    reasons.push(`${motoresComProblema.length} motor(es) com falha ou em manutenção.`);
  }

  // 3. Ciclos de Plantio
  if (estufa.status === 'ativa' && activePlantios.length === 0) {
    level = getMaxLevel(level, 'warning');
    reasons.push('Sem ciclo ativo.');
  }

  const dataPrevisao = activePlantio?.previsaoColheita || activePlantio?.dataPrevisaoColheita;

  if (dataPrevisao) {
    const previsao = dataPrevisao.toDate();
    const now = new Date();

    previsao.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = previsao.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      level = getMaxLevel(level, 'critical');
      reasons.push(`Atraso na colheita (${Math.abs(diffDays)} dias).`);
    } else if (diffDays === 0) {
      level = getMaxLevel(level, 'critical');
      reasons.push('Ponto de colheita atingido (É hoje!).');
    } else if (diffDays <= 3) {
      level = getMaxLevel(level, 'warning');
      reasons.push(`Preparar colheita (em ${diffDays} dias).`);
    }
  }

  // 4. Sanidade (Pragas e Doenças recentes)
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const alertasSanitarios = manejos.filter((m) => {
    // Alerta se for na estufa ou no plantio ativo desta estufa
    if (m.estufaId !== estufa.id && m.plantioId !== activePlantio?.id) return false;

    const dataManejo = m.dataRegistro.toDate();
    return m.tipoManejo === 'praga_doenca' && m.severidade === 'alta' && dataManejo >= seteDiasAtras;
  });

  if (alertasSanitarios.length > 0) {
    level = getMaxLevel(level, 'critical');
    reasons.push('Alerta sanitário: Praga ou doença com alta severidade detectada recentemente.');
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
