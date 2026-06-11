type PlantioLike = {
  id: string;
  estufaId?: string;
  status: string;
  updatedAt?: unknown;
};

const getStatusPriority = (status: string) => (status === 'colheita_iniciada' || status === 'em_colheita' ? 2 : 1);
const getUpdatedAtMillis = (value: any) =>
  value instanceof Date ? value.getTime() : typeof value?.seconds === 'number' ? value.seconds * 1000 : 0;

export const selectPrimaryPlantioByEstufa = (estufaIds: string[], plantios: PlantioLike[]) => {
  const grouped: Record<string, PlantioLike[]> = {};

  for (const plantio of plantios) {
    if (!plantio.estufaId) continue;
    if (!grouped[plantio.estufaId]) grouped[plantio.estufaId] = [];
    grouped[plantio.estufaId].push(plantio);
  }

  return estufaIds.reduce<Record<string, PlantioLike | null>>((acc, estufaId) => {
    const candidates = grouped[estufaId] || [];
    if (candidates.length === 0) {
      acc[estufaId] = null;
      return acc;
    }

    acc[estufaId] = [...candidates].sort((a, b) => {
      const priorityDelta = getStatusPriority(b.status) - getStatusPriority(a.status);
      if (priorityDelta !== 0) return priorityDelta;
      return getUpdatedAtMillis(b.updatedAt) - getUpdatedAtMillis(a.updatedAt);
    })[0];

    return acc;
  }, {});
};
