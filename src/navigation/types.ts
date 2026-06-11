import { Plantio } from "../types/domain";
import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  InicioTab: undefined;
  OperacaoTab: undefined;
  EstoqueTab: undefined;
  FinanceiroTab: undefined;
  PerfilTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  ShareAccount: undefined;
  Perfil: undefined;
  Settings: undefined;
  EstufasList: { mode?: 'colheita' | 'plantio' | 'manejo' | 'hidro_layout'; talhaoId?: string } | undefined;
  EstufaForm: { estufaId?: string } | undefined;
  EstufaDetail: { estufaId: string };
  EstufaHistory: { estufaId: string } | undefined;
  PlantioForm: { plantioId?: string; estufaId?: string; talhaoId?: string } | undefined;
  PlantioDetail: { plantioId: string };
  PlantioHistory: { plantioId: string; estufaId?: string } | undefined;
  ManejoForm: { plantioId?: string; estufaId?: string } | undefined;
  ManejosHistory: { plantioId: string; estufaId?: string } | undefined;
  ColheitaForm: { plantioId?: string; estufaId?: string; vendaId?: string; isEdit?: boolean } | undefined;
  VendasList: undefined;
  ContasReceber: undefined;
  CaixaResumo: undefined;
  CaixaExtrato: { caixaPessoaId?: string } | undefined;
  AplicacaoForm: { plantioId?: string; estufaId?: string } | undefined;
  AplicacoesHistory: { plantioId: string; estufaId?: string } | undefined;
  InsumosList: undefined;
  InsumoForm: { insumoId?: string } | undefined;
  InsumoEntry: { preselectedInsumoId?: string } | undefined;
  FornecedoresList: undefined;
  FornecedorForm: { fornecedorId?: string } | undefined;
  ClientesList: undefined;
  ClienteForm: { clienteId?: string } | undefined;
  DespesasList: undefined;
  DespesaForm: { despesaId?: string } | undefined;
  Relatorios: undefined;
  RelatorioOperacional: undefined;
  CaixasPesoCiclo: undefined;
  Tarefas: undefined;
  TalhoesList: undefined;
  HidroponiaEstufaLayout: { estufaId: string };
  HidroponiaMotores: { estufaId?: string } | undefined;
  HidroponiaLotes: { estufaId?: string } | undefined;
  HidroponiaLoteForm: { loteId?: string; estufaId?: string; setorId?: string } | undefined;
  HidroponiaLoteDetail: { loteId: string };
  HidroponiaVerduras: undefined;
  HidroponiaVendaForm: { vendaId?: string; loteId?: string; estufaId?: string } | undefined;
  HidroponiaMovimentarLote: { 
    loteId: string; 
    fromOcupacaoId?: string; 
    toSetorId?: string; 
    toEstruturaId?: string 
  };
  HidroponiaColheitaForm: { ocupacaoId: string; isSeedlingResale?: boolean };
  HidroponiaLeituraForm: { loteId?: string; estufaId?: string; reservatorioId?: string } | undefined;
  // Wizard
  WizardSelectPlantio: undefined;
  WizardSelectActivity: { plantio: Plantio };
};
