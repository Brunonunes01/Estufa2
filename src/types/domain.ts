// src/types/domain.ts
import { Timestamp } from 'firebase/firestore';

// Interface base para todos os documentos
interface BaseDoc {
  id: string; // ID do documento
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

// ****** AQUI A MUDANÇA ******
export interface Estufa extends BaseDoc {
  nome: string;
  dataFabricacao: Timestamp | null;
  comprimentoM: number;
  larguraM: number;
  alturaM: number;
  areaM2: number; // MUDAMOS DE volumeM3 PARA areaM2
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
  previsaoColheita: Timestamp | null; // Calculado no app
  status: "em_desenvolvimento" | "em_colheita" | "finalizado";
  observacoes: string | null;
}

export interface Colheita extends BaseDoc {
  plantioId: string;
  estufaId: string; // Facilita filtros
  dataColheita: Timestamp;
  quantidade: number;
  unidade: string; // ex: "kg", "caixa"
  precoUnitario: number | null;
  destino: string | null;
  observacoes: string | null;
}