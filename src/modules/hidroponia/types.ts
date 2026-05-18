import { Timestamp } from '../../compat/firestore';
import { HydroponicSystemType } from '../../types/domain';

export type HydroLoteStatus = 'ativo' | 'concluido' | 'cancelado';

export interface HydroLote {
  id: string;
  tenantId: string;
  userId: string;
  createdBy?: string;
  codigoLote: string; // Fixo e Único
  setorId: string; // Vínculo obrigatório
  estufaId: string; // Derivado do setor para compatibilidade
  quantidadeInicial: number; // Quantidade comprada/recebida no lote curto
  saldoDisponivel: number; // Saldo ainda não alocado em bancadas
  origemMaterialNome: string; // Fornecedor/unidade de origem do material
  origemMaterialDocumento?: string | null; // NF, romaneio, lote do fornecedor, etc.
  nomeOperacional?: string | null;
  verduraId?: string | null;
  culturaBase?: string | null;
  variedadeBase?: string | null;
  status: HydroLoteStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HydroLoteFormData {
  codigoLote?: string;
  setorId: string;
  estufaId?: string;
  quantidadeInicial?: number;
  origemMaterialNome: string;
  origemMaterialDocumento?: string | null;
  nomeOperacional?: string | null;
  verduraId?: string | null;
  culturaBase?: string | null;
  variedadeBase?: string | null;
}

export type HydroLoteStage =
  | 'semeadura'
  | 'germinacao'
  | 'bercario'
  | 'crescimento_final'
  | 'pronto_colheita'
  | 'colhido'
  | 'cancelado';

export type HydroLeituraAcao =
  | 'medicao'
  | 'corrigir_ph'
  | 'repor_agua'
  | 'trocar_solucao'
  | 'adicionar_nutriente'
  | 'limpeza';

export type HydroOrigemTipo = 'semente' | 'muda' | 'sublote';

export type HydroUnidadeEntrada = 'bandeja' | 'muda' | 'planta' | 'unidade';

export interface HydroOcupacao {
  id: string;
  tenantId: string;
  userId?: string;
  loteId: string; // Vínculo com o lote fixo
  estufaId: string;
  setorId?: string | null;
  estruturaId: string; // Bancada/Perfil
  cultura: string; // O que está aqui
  variedade?: string | null;
  verduraId?: string | null;
  fase: HydroLoteStage; // Fase atual nesta bancada
  quantidadeAlocada: number;
  quantidadePerdida?: number;
  dataInicio: Timestamp;
  dataFim?: Timestamp | null;
  status: 'ativa' | 'encerrada';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HydroMovimentacao {
  id: string;
  tenantId: string;
  loteId: string;
  estufaId: string;
  fromEstruturaId?: string | null;
  toEstruturaId: string | null;
  tipo: 'entrada' | 'movimento' | 'saida' | 'perda';
  quantidade: number;
  cultura?: string | null;
  variedade?: string | null;
  verduraId?: string | null;
  fase: HydroLoteStage;
  movedAt: Timestamp;
  createdAt: Timestamp;
}

export interface HydroVerdura {
  id: string;
  tenantId: string;
  userId?: string;
  nomeComum: string;
  nomeCientifico?: string | null;
  variedadePadrao?: string | null;
  cicloDias?: number | null;
  espacamentoCm?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  ecMin?: number | null;
  ecMax?: number | null;
  temperaturaMinC?: number | null;
  temperaturaMaxC?: number | null;
  observacoes?: string | null;
  ativo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HydroVerduraFormData {
  nomeComum: string;
  nomeCientifico?: string | null;
  variedadePadrao?: string | null;
  cicloDias?: number | null;
  espacamentoCm?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  ecMin?: number | null;
  ecMax?: number | null;
  temperaturaMinC?: number | null;
  temperaturaMaxC?: number | null;
  observacoes?: string | null;
  ativo?: boolean;
}

export interface HydroLeitura {
  id: string;
  tenantId: string;
  userId?: string;
  estufaId: string;
  motorId?: string | null;
  setoresAplicadosIds?: string[];
  aplicarEmTodosSetoresDoMotor?: boolean;
  reservatorioId?: string | null;
  estruturaId?: string | null;
  loteId?: string | null;
  pH?: number | null;
  condutividadeEletrica?: number | null;
  temperaturaSolucao?: number | null;
  temperaturaAmbiente?: number | null;
  umidadeAmbiente?: number | null;
  volumeLitros?: number | null;
  acao: HydroLeituraAcao;
  insumosAdicionados?: Array<{
    nome: string;
    quantidade: number;
    unidade?: string | null;
  }>;
  observacoes?: string | null;
  responsavel?: string | null;
  measuredAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HydroLeituraFormData {
  estufaId: string;
  motorId?: string | null;
  setoresAplicadosIds?: string[];
  aplicarEmTodosSetoresDoMotor?: boolean;
  reservatorioId?: string | null;
  estruturaId?: string | null;
  loteId?: string | null;
  pH?: number | null;
  condutividadeEletrica?: number | null;
  temperaturaSolucao?: number | null;
  temperaturaAmbiente?: number | null;
  umidadeAmbiente?: number | null;
  volumeLitros?: number | null;
  acao: HydroLeituraAcao;
  responsavel?: string | null;
  observacoes?: string | null;
  measuredAt?: Date;
}
