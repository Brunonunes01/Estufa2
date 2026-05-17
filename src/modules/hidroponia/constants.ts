import { COLORS } from '../../constants/theme';
import { HydroLeituraAcao, HydroLoteStage, HydroOrigemTipo, HydroUnidadeEntrada } from './types';

export const HYDRO_STAGE_OPTIONS: Array<{ value: HydroLoteStage; label: string; color: string }> = [
  { value: 'semeadura', label: 'Semeadura', color: COLORS.info },
  { value: 'germinacao', label: 'Germinação', color: COLORS.info },
  { value: 'bercario', label: 'Berçário', color: COLORS.orange },
  { value: 'crescimento_final', label: 'Crescimento final', color: COLORS.primary },
  { value: 'pronto_colheita', label: 'Pronto', color: COLORS.success },
  { value: 'colhido', label: 'Colhido', color: COLORS.textSecondary },
  { value: 'cancelado', label: 'Cancelado', color: COLORS.danger },
];

export const HYDRO_ACTION_OPTIONS: Array<{ value: HydroLeituraAcao; label: string }> = [
  { value: 'medicao', label: 'Medição' },
  { value: 'corrigir_ph', label: 'Corrigir pH' },
  { value: 'repor_agua', label: 'Repor água' },
  { value: 'trocar_solucao', label: 'Trocar solução' },
  { value: 'adicionar_nutriente', label: 'Adicionar nutriente' },
  { value: 'limpeza', label: 'Limpeza' },
];

export const HYDRO_SYSTEM_OPTIONS = [
  { value: 'nft', label: 'NFT' },
  { value: 'dwc', label: 'DWC' },
  { value: 'floating', label: 'Floating' },
  { value: 'substrate', label: 'Substrato' },
  { value: 'semi_hydroponic', label: 'Semi-hidroponia' },
  { value: 'other', label: 'Outro' },
] as const;

export const HYDRO_ORIGIN_OPTIONS: Array<{ value: HydroOrigemTipo; label: string }> = [
  { value: 'semente', label: 'Semente' },
  { value: 'muda', label: 'Muda comprada' },
  { value: 'sublote', label: 'Sublote interno' },
];

export const HYDRO_ENTRY_UNIT_OPTIONS: Array<{ value: HydroUnidadeEntrada; label: string; defaultFactor: number }> = [
  { value: 'bandeja', label: 'Bandeja', defaultFactor: 128 },
  { value: 'muda', label: 'Muda', defaultFactor: 1 },
  { value: 'planta', label: 'Planta', defaultFactor: 1 },
  { value: 'unidade', label: 'Unidade', defaultFactor: 1 },
];

export const getHydroStageLabel = (stage?: HydroLoteStage | null) =>
  HYDRO_STAGE_OPTIONS.find((item) => item.value === stage)?.label || 'Sem fase';

export const getHydroStageColor = (stage?: HydroLoteStage | null) =>
  HYDRO_STAGE_OPTIONS.find((item) => item.value === stage)?.color || COLORS.textSecondary;
