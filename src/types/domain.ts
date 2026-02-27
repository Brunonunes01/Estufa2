// src/types/domain.ts
import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "operator";
  createdAt: Timestamp;
  sharedAccess?: { uid: string; name: string }[]; 
}

export interface Tenant {
  uid: string;
  name: string;
  ownerId: string;
  sharedBy?: string;
  sharedAt?: string;
  createdAt?: any;
}

export interface ShareCode {
    code: string;
    tenantId: string;
    tenantName: string;
    ownerName: string;
    createdAt: number;
    expiresAt: number;
}

interface BaseDoc {
  id: string; 
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Estufa extends BaseDoc {
  nome: string;
  dataFabricacao: Timestamp | null;
  comprimentoM: number;
  larguraM: number;
  alturaM: number;
  areaM2: number; 
  tipoCobertura: string | null;
  responsavel: string | null;
  status: "ativa" | "manutencao" | "desativada";
  observacoes: string | null;
  latitude?: string;
  longitude?: string;
  cidade?: string;
  propriedade?: string;
  tipoCultivo?: string; 
  sistemaCultivo?: string; 
  dataInicioOperacao?: Timestamp | null;
}

export interface Plantio extends BaseDoc {
  estufaId: string;
  safraId: string | null;
  codigoLote?: string; 
  origemSemente?: string; 
  cultura: string;
  variedade: string | null;
  quantidadePlantada: number;
  unidadeQuantidade: string;
  precoEstimadoUnidade: number | null;
  cicloDias: number | null;
  dataPlantio: Timestamp;
  previsaoColheita: Timestamp | null;
  status: "em_desenvolvimento" | "em_colheita" | "finalizado";
  observacoes: string | null;
  fornecedorId: string | null;
}

export interface Colheita extends BaseDoc {
  plantioId: string;
  estufaId: string; 
  dataColheita: Timestamp;
  quantidade: number;
  unidade: string; 
  precoUnitario: number | null;
  destino: string | null;
  clienteId: string | null;
  metodoPagamento: string | null;
  registradoPor: string | null;
  observacoes: string | null;
  statusPagamento?: "pago" | "pendente" | "atrasado"; 
  dataPagamento?: Timestamp | null;
  pesoBruto?: number;   
  pesoLiquido?: number; 
  dataVencimento?: Timestamp | null; 
}

export interface Insumo extends BaseDoc {
  nome: string;
  tipo: "adubo" | "defensivo" | "semente" | "outro";
  unidadePadrao: string; 
  estoqueAtual: number; 
  estoqueMinimo: number | null;
  custoUnitario: number | null;
  fornecedorId: string | null; 
  observacoes: string | null; 
  tamanhoEmbalagem: number | null; 
}

export interface Fornecedor extends BaseDoc {
  nome: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
}

export interface Cliente extends BaseDoc {
  nome: string;
  telefone: string | null;
  cidade: string | null;
  tipo: "atacado" | "varejo" | "restaurante" | "outro";
  observacoes: string | null;
}

export interface AplicacaoItem {
  insumoId: string;
  nomeInsumo: string; 
  quantidadeAplicada: number; 
  unidade: string;
  dosePorTanque?: number | null; 
  custoUnitarioNaAplicacao?: number; 
}

export interface Aplicacao extends BaseDoc {
  plantioId: string;
  estufaId: string;
  dataAplicacao: Timestamp;
  observacoes: string | null;
  volumeTanque: number | null; 
  numeroTanques: number | null; 
  itens: AplicacaoItem[]; 
}

export interface Despesa extends BaseDoc {
  descricao: string;
  categoria: "energia" | "agua" | "mao_de_obra" | "manutencao" | "combustivel" | "imposto" | "outro";
  valor: number;
  dataDespesa: Timestamp;
  observacoes: string | null;
  registradoPor: string | null;
  dataVencimento?: Timestamp | null; 
  status: "pago" | "pendente"; 
}

// --- INTERFACE DE MANEJO SIMPLIFICADA ---
export interface RegistroManejo extends BaseDoc {
  plantioId: string; 
  estufaId: string;
  dataRegistro: Timestamp;
  tipoManejo: "clima" | "praga_doenca" | "outro"; // Apenas o essencial do diário
  descricao: string; 
  responsavel: string | null;
  temperatura?: number | null;
  umidade?: number | null;
  severidade?: "baixa" | "media" | "alta" | null;
}