// src/types/domain.ts
import { Timestamp } from 'firebase/firestore';

interface BaseDoc {
  id: string; 
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "operator";
  createdAt: Timestamp;
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
}

export interface Plantio extends BaseDoc {
  estufaId: string;
  safraId: string | null;
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
  metodoPagamento: string | null; // <-- NOVO CAMPO
  observacoes: string | null;
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