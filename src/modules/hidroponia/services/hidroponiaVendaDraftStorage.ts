import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HidroponiaVendaDraftData {
  selectedLoteId: string;
  quantidade: string;
  unidade: string;
  precoUnitario: string;
  metodoPagamento: string;
  pagamentoPara: string | null;
  selectedClienteId: string | null;
  dataVendaIso: string;
  produtoDescricao: string;
  observacoes: string;
  savedAt: string;
}

const buildDraftKey = (targetId: string) => `@estufa2:hidroponia_venda_draft:${targetId}`;

export const loadHidroponiaVendaDraft = async (targetId: string): Promise<HidroponiaVendaDraftData | null> => {
  try {
    const raw = await AsyncStorage.getItem(buildDraftKey(targetId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<HidroponiaVendaDraftData>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.savedAt || !parsed.dataVendaIso) return null;

    return {
      selectedLoteId: String(parsed.selectedLoteId || ''),
      quantidade: String(parsed.quantidade || ''),
      unidade: String(parsed.unidade || 'caixas'),
      precoUnitario: String(parsed.precoUnitario || ''),
      metodoPagamento: String(parsed.metodoPagamento || 'pix'),
      pagamentoPara: parsed.pagamentoPara ? String(parsed.pagamentoPara) : null,
      selectedClienteId: parsed.selectedClienteId ? String(parsed.selectedClienteId) : null,
      dataVendaIso: String(parsed.dataVendaIso),
      produtoDescricao: String(parsed.produtoDescricao || ''),
      observacoes: String(parsed.observacoes || ''),
      savedAt: String(parsed.savedAt),
    };
  } catch (error) {
    console.error('Erro ao carregar rascunho da venda hidropônica:', error);
    return null;
  }
};

export const saveHidroponiaVendaDraft = async (
  targetId: string,
  draft: Omit<HidroponiaVendaDraftData, 'savedAt'>
) => {
  const payload: HidroponiaVendaDraftData = {
    ...draft,
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(buildDraftKey(targetId), JSON.stringify(payload));
};

export const clearHidroponiaVendaDraft = async (targetId: string) => {
  await AsyncStorage.removeItem(buildDraftKey(targetId));
};
