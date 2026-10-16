import type { AppSettings } from '../contexts/appSettingsHelpers';

export type FinanceProductionMode = AppSettings['activeProductionMode'];

type VendaScopeLike = {
  plantioId?: string | null;
  talhaoId?: string | null;
  estufaId?: string | null;
};

type PlantioScopeLike = {
  talhaoId?: string | null;
  estufaId?: string | null;
};

type DespesaScopeLike = {
  plantioId?: string | null;
  estufaId?: string | null;
};

export const matchesPlantioProductionMode = (
  plantio: PlantioScopeLike,
  mode: FinanceProductionMode
) => {
  if (mode === 'campo') return !!plantio.talhaoId;
  return !!plantio.estufaId && !plantio.talhaoId;
};

export const matchesVendaProductionMode = (
  venda: VendaScopeLike,
  mode: FinanceProductionMode,
  plantiosById: Record<string, PlantioScopeLike> = {}
) => {
  const plantio = venda.plantioId ? plantiosById[venda.plantioId] : undefined;
  if (plantio) return matchesPlantioProductionMode(plantio, mode);

  if (mode === 'campo') return !!venda.talhaoId;

  return !!venda.estufaId && !venda.talhaoId;
};

export const matchesDespesaProductionMode = (
  despesa: DespesaScopeLike,
  mode: FinanceProductionMode,
  plantiosById: Record<string, PlantioScopeLike> = {}
) => {
  const plantio = despesa.plantioId
    ? plantiosById[despesa.plantioId]
    : undefined;
  if (plantio) return matchesPlantioProductionMode(plantio, mode);

  if (mode === 'campo') return !despesa.estufaId;

  return !!despesa.estufaId || (!despesa.plantioId && !despesa.estufaId);
};
