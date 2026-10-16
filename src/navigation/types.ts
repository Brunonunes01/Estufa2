import { Plantio } from '../types/domain';
import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  InicioTab: undefined;
  OperacaoTab: undefined;
  EstoqueTab: undefined;
  FinanceiroTab:
    | { filter?: 'todos' | 'receber' | 'cheques' | 'recebidas' }
    | undefined;
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
  EstufasList:
    | {
        mode?: 'colheita' | 'plantio' | 'manejo' | 'hidro_layout';
        talhaoId?: string;
      }
    | undefined;
  EstufaForm: { estufaId?: string } | undefined;
  EstufaDetail: { estufaId: string };
  EstufaHistory: { estufaId: string } | undefined;
  PlantioForm:
    | {
        plantioId?: string;
        estufaId?: string;
        talhaoId?: string;
      }
    | undefined;
  PlantioDetail: { plantioId: string };
  PlantioHistory: { plantioId: string; estufaId?: string } | undefined;
  ManejoForm: { plantioId?: string; estufaId?: string } | undefined;
  ManejosHistory: { plantioId: string; estufaId?: string } | undefined;
  ColheitaForm:
    | {
        plantioId?: string;
        estufaId?: string;
        vendaId?: string;
        isEdit?: boolean;
      }
    | undefined;
  CampoVendaForm:
    | {
        plantioId?: string;
        vendaId?: string;
        isEdit?: boolean;
      }
    | undefined;
  VendasList: undefined;
  ContasReceber: undefined;
  CaixaResumo: undefined;
  CaixaExtrato:
    | { caixaPessoaId?: string; tipo?: 'entrada' | 'saida' }
    | undefined;
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
  EstufaPerformance: undefined;
  CaixasPesoCiclo: undefined;
  Tarefas: undefined;
  TalhoesList: undefined;
  TalhaoForm: { talhaoId?: string } | undefined;
  // Wizard
  WizardSelectPlantio: { origem?: 'campo' } | undefined;
  WizardSelectActivity: { plantio: Plantio; origem?: 'campo' };
};
