import { addDoc, collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { assertTenantId } from './tenantGuard';
import { RastreabilidadeEvento } from '../types/domain';

export type TraceabilityEntityType =
  | 'plantio'
  | 'colheita'
  | 'venda'
  | 'aplicacao'
  | 'manejo'
  | 'tarefa'
  | 'estufa';

export type TraceabilityAction =
  | 'criado'
  | 'atualizado'
  | 'status_alterado'
  | 'excluido'
  | 'recebimento_registrado'
  | 'desbloqueio_ciclo'
  | 'cancelado';

export interface CreateTraceabilityEventInput {
  plantioId: string;
  estufaId?: string | null;
  entidade: TraceabilityEntityType;
  entidadeId: string;
  acao: TraceabilityAction;
  descricao: string;
  motivo?: string | null;
  metadata?: Record<string, unknown> | null;
  actorUid?: string | null;
  actorName?: string | null;
}

export const createTraceabilityEvent = async (userId: string, data: CreateTraceabilityEventInput) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();

  const payload: Omit<RastreabilidadeEvento, 'id'> = {
    tenantId,
    userId: tenantId,
    createdBy: data.actorUid || tenantId,
    plantioId: data.plantioId,
    estufaId: data.estufaId || null,
    entidade: data.entidade,
    entidadeId: data.entidadeId,
    acao: data.acao,
    descricao: data.descricao,
    motivo: data.motivo || null,
    actorUid: data.actorUid || null,
    actorName: data.actorName || null,
    metadata: data.metadata || {},
    eventAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, 'rastreabilidade_eventos'), payload);
  return ref.id;
};

export const createTraceabilityEventSafely = async (userId: string, data: CreateTraceabilityEventInput) => {
  try {
    await createTraceabilityEvent(userId, data);
  } catch (error) {
    console.error('Falha ao registrar evento de rastreabilidade:', error);
  }
};

export const listTraceabilityEventsByPlantio = async (
  userId: string,
  plantioId: string,
  maxItems = 100
): Promise<RastreabilidadeEvento[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'rastreabilidade_eventos'),
    where('tenantId', '==', tenantId),
    where('plantioId', '==', plantioId),
    orderBy('eventAt', 'desc'),
    limit(maxItems)
  );

  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ ...(item.data() as RastreabilidadeEvento), id: item.id }));
};
