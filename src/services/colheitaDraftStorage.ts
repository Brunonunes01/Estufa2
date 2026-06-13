import AsyncStorage from '@react-native-async-storage/async-storage';
import { MetodoPagamento, UnidadeColheita } from '../screens/Colheitas/colheitaFormUtils';

export interface ColheitaDraftData {
  selectedPlantioId: string;
  quantidade: string;
  unidade: UnidadeColheita;
  preco: string;
  pesoBruto: string;
  pesoLiquido: string;
  selectedClienteId: string | null;
  metodoPagamento: MetodoPagamento;
  pagamentoPara: string | null;
  dataVendaIso: string;
  isFinalHarvest: boolean;
  observacoes: string;
  showObservacoes: boolean;
  selectedCaixaPerfilId: string;
  savedAt: string;
}

const buildDraftKey = (targetId: string) => `@estufa2:colheita_draft:${targetId}`;

export const loadColheitaDraft = async (targetId: string): Promise<ColheitaDraftData | null> => {
  try {
    const raw = await AsyncStorage.getItem(buildDraftKey(targetId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ColheitaDraftData>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.savedAt || !parsed.dataVendaIso) return null;

    return {
      selectedPlantioId: String(parsed.selectedPlantioId || ''),
      quantidade: String(parsed.quantidade || ''),
      unidade: (parsed.unidade as ColheitaDraftData['unidade']) || 'caixas',
      preco: String(parsed.preco || ''),
      pesoBruto: String(parsed.pesoBruto || ''),
      pesoLiquido: String(parsed.pesoLiquido || ''),
      selectedClienteId: parsed.selectedClienteId ? String(parsed.selectedClienteId) : null,
      metodoPagamento: (parsed.metodoPagamento as ColheitaDraftData['metodoPagamento']) || 'pix',
      pagamentoPara: parsed.pagamentoPara ? String(parsed.pagamentoPara) : null,
      dataVendaIso: String(parsed.dataVendaIso),
      isFinalHarvest: Boolean(parsed.isFinalHarvest),
      observacoes: String(parsed.observacoes || ''),
      showObservacoes: Boolean(parsed.showObservacoes),
      selectedCaixaPerfilId: String(parsed.selectedCaixaPerfilId || ''),
      savedAt: String(parsed.savedAt),
    };
  } catch (error) {
    console.error('Erro ao carregar rascunho da colheita:', error);
    return null;
  }
};

export const saveColheitaDraft = async (targetId: string, draft: Omit<ColheitaDraftData, 'savedAt'>) => {
  const payload: ColheitaDraftData = {
    ...draft,
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(buildDraftKey(targetId), JSON.stringify(payload));
};

export const clearColheitaDraft = async (targetId: string) => {
  await AsyncStorage.removeItem(buildDraftKey(targetId));
};
