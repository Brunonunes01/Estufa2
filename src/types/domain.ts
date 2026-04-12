import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'operator';

export interface BaseDoc {
  id: string;
  tenantId?: string;
  userId?: string;
  createdBy?: string;
  createdAt: Timestamp | number;
  updatedAt: Timestamp | number;
}

export interface User extends BaseDoc {
  uid: string;
  name?: string;
  displayName?: string;
  email: string;
  role?: UserRole;
  photoURL?: string;
  activeSafraId?: string;
  sharedAccess?: Array<{ tenantId: string; ownerName?: string; tenantName?: string }>;
}

export interface UserProfile extends User {
  role: UserRole;
}

export interface Tenant {
  uid: string;
  ownerName?: string;
  name?: string;
  sharedBy?: string;
  sharedAt?: Timestamp | number | string;
}

export interface ShareCode extends BaseDoc {
  code: string;
  tenantId: string;
  tenantName?: string;
  ownerName?: string;
  createdBy: string;
  expiresAt: Timestamp | number | string;
  usedBy?: string[];
}

export interface Cliente extends BaseDoc {
  nome: string;
  cidade?: string;
  telefone?: string;
  email?: string;
  documento?: string;
  tipo?: string;
  observacoes?: string;
}

export interface Fornecedor extends BaseDoc {
  nome: string;
  contato?: string;
  telefone?: string;
  email?: string;
  categoria?: string;
  observacoes?: string;
}

export interface Safra extends BaseDoc {
  nome: string;
  dataInicio: Timestamp;
  dataFim?: Timestamp;
  status: 'ativa' | 'encerrada';
  observacoes?: string;
}

export interface SubdivisaoEstufa {
  id: string;
  nome: string;
  areaOuCapacidade: number;
  tipo?: 'canteiro' | 'setor' | 'lote' | 'bancada';
}

export interface Estufa extends BaseDoc {
  nome: string;
  tipo?: 'hidroponia' | 'solo' | 'semi-hidroponia';
  capacidadeTotal?: number;
  unidadeMedida?: 'm2' | 'plantas' | 'bancadas';
  subdivisoes?: SubdivisaoEstufa[];
  percentualOcupacao?: number;

  // Compatibilidade com dados legados da base atual
  cidade?: string;
  propriedade?: string;
  /** @deprecated Campo legado. Definição de cultivo deve ficar no Plantio. */
  tipoCultivo?: string;
  /** @deprecated Campo legado. Definição de cultivo deve ficar no Plantio. */
  sistemaCultivo?: string;
  responsavel?: string;
  latitude?: string;
  longitude?: string;
  comprimentoM?: number;
  larguraM?: number;
  alturaM?: number;
  areaM2?: number;
  tipoCobertura?: string;
  observacoes?: string;
  dataInicioOperacao?: Timestamp;

  status: 'ativa' | 'manutencao' | 'desativada';
}

export interface Plantio extends BaseDoc {
  safraId?: string;
  estufaId: string;
  subdivisaoId?: string;
  cultura: string;
  variedade?: string;
  dataInicio?: Timestamp;
  dataPlantio?: Timestamp;
  dataPrevisaoColheita?: Timestamp;
  previsaoColheita?: Timestamp;
  dataEncerramento?: Timestamp;
  status:
    | 'em_crescimento'
    | 'colheita_iniciada'
    | 'finalizado'
    | 'abortado'
    | 'em_desenvolvimento'
    | 'em_colheita'
    | 'cancelado';
  ocupacaoEstimada?: number;
  custoAcumulado?: number;
  custoTotal?: number;
  cicloDias?: number;

  // Compatibilidade legada
  codigoLote?: string;
  origemSemente?: string;
  quantidadePlantada?: number;
  quantidadeBandejas?: number | null;
  mudasPorBandeja?: number | null;
  unidadeQuantidade?: string;
  observacoes?: string;
}

export type UnidadeInsumo = 'kg' | 'L' | 'un' | 'g' | 'ml' | 'l';

export interface Insumo extends BaseDoc {
  nome: string;
  fabricante?: string;
  categoria?: 'fertilizante' | 'defensivo' | 'biologico' | 'substrato' | 'outro';
  tipo?: string;
  unidadeMedida?: UnidadeInsumo;
  unidadePadrao?: string;
  estoqueAtual: number;
  estoqueMinimo?: number;
  lote?: string;
  dataValidade?: Timestamp;
  diasCarencia?: number;
  custoUnitario: number;
  registroMAPA?: string;
}

export interface AplicacaoItem {
  insumoId: string;
  nomeInsumo: string;
  dosePorTanque?: number;
  quantidadeAplicada: number;
  unidade: string;
  custoUnitarioNaAplicacao?: number;
}

export interface Aplicacao extends BaseDoc {
  plantioId: string;
  estufaId?: string;
  insumoId?: string;
  dataAplicacao: Timestamp;
  quantidadeAplicada?: number;
  custoCalculado?: number;
  aplicadorId?: string;
  dataFimCarencia?: Timestamp;
  metodoAplicacao?: 'fertirrigacao' | 'pulverizacao' | 'manual';
  statusSeguranca?: 'em_carencia' | 'liberado';

  // Compatibilidade com telas existentes
  tipoAplicacao?: 'defensivo' | 'fertilizacao';
  volumeTanque?: number;
  numeroTanques?: number;
  observacoes?: string;
  itens?: AplicacaoItem[];
}

export interface Colheita extends BaseDoc {
  plantioId: string;
  estufaId?: string;
  safraId?: string;
  dataColheita: Timestamp;
  quantidade: number;
  unidadeMedida?: 'kg' | 'maços' | 'caixas' | 'un';
  unidade?: string;
  qualidade?: 'premium' | 'padrao' | 'industrial';
  loteColheita?: string;
  destino: 'estoque' | 'venda_direta' | 'descarte';
  observacoes?: string;
  pesoBruto?: number;
  pesoLiquido?: number;

  // Compatibilidade legada (mantido opcional até migração completa para Venda)
  precoUnitario?: number;
  clienteId?: string | null;
  metodoPagamento?: string | null;
  statusPagamento?: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  dataPagamento?: Timestamp | null;
}

export interface VendaItem {
  colheitaId?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Venda extends BaseDoc {
  plantioId?: string;
  estufaId?: string;
  clienteId?: string | null;
  dataVenda: Timestamp;
  dataVencimento?: Timestamp | null;
  itens: VendaItem[];
  valorTotal: number;
  statusPagamento: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  formaPagamento?: 'pix' | 'boleto' | 'transferencia' | 'dinheiro' | 'cartao' | 'outro' | 'prazo';
  observacoes?: string;

  // Campos legados de relatório
  metodoPagamento?: string | null;
}

export interface Despesa extends BaseDoc {
  descricao: string;
  categoria: 'energia' | 'agua' | 'manutencao' | 'mao_de_obra' | 'outro';
  valor: number;
  dataVencimento?: Timestamp;
  dataDespesa?: Timestamp;
  statusPagamento?: 'pendente' | 'pago';
  status?: 'pendente' | 'pago';
  plantioId?: string;
  estufaId?: string;
}

export interface RegistroManejo extends BaseDoc {
  plantioId: string;
  estufaId?: string;
  tipoManejo: 'clima' | 'praga_doenca' | 'outro';
  descricao: string;
  dataRegistro: Timestamp;
  responsavel?: string;
  severidade?: 'baixa' | 'media' | 'alta' | null;
  temperatura?: number | null;
  umidade?: number | null;
  fotos?: string[];
}

export interface TarefaAgricola extends BaseDoc {
  plantioId: string;
  estufaId?: string;
  tipoTarefa: 'irrigacao' | 'adubacao' | 'manejo' | 'colheita' | 'inspecao' | 'outro';
  dataPrevista: Timestamp;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  observacoes?: string;
}

export interface DashboardSummary extends BaseDoc {
  receitaTotal?: number;
  contasAPagar?: number;
  contasAReceber?: number;
  custoProducaoMensal?: number;
  alertasCarencia?: number;
  totalPlantiosAtivos?: number;
  ocupacaoGlobalMedia?: number;

  // Novos indicadores operacionais
  tarefasHojePendentes?: number;
  irrigacoesPendentes?: number;
  manejosPendentes?: number;
}
