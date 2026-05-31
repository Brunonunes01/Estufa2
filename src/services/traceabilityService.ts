import { addDoc, collection, getDocs, limit, orderBy, query, Timestamp, where } from '../compat/legacyDataApi';
import { db } from './removedBackend';
import { assertTenantId } from './tenantGuard';
import { RastreabilidadeEvento } from '../types/domain';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

export type TraceabilityEntityType =
  | 'plantio'
  | 'hydro_lote'
  | 'hydro_movimentacao'
  | 'hydro_leitura'
  | 'hydro_colheita'
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
  | 'cancelado'
  | 'semeado'
  | 'movido'
  | 'leitura_registrada'
  | 'nutriente_adicionado'
  | 'colhido'
  | 'etiqueta_gerada';

export interface CreateTraceabilityEventInput {
  plantioId?: string | null;
  hydroLoteId?: string | null;
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

const mapSupabaseTraceabilityToDomain = (row: any): RastreabilidadeEvento => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  plantioId: row.plantio_id || undefined,
  estufaId: row.estufa_id || undefined,
  hydroLoteId: row.hydro_lote_id || undefined,
  entidade: row.entidade,
  entidadeId: row.entidade_id,
  acao: row.acao,
  descricao: row.descricao,
  motivo: row.motivo || undefined,
  actorUid: row.actor_uid || undefined,
  actorName: row.actor_name || undefined,
  metadata: row.metadata || undefined,
  eventAt: Timestamp.fromDate(new Date(row.event_at)),
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

export const createTraceabilityEvent = async (userId: string, data: CreateTraceabilityEventInput) => {
  const tenantId = assertTenantId(userId);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const basePayload = {
      tenant_id: tenantId,
      plantio_id: data.plantioId || null,
      hydro_lote_id: data.hydroLoteId || null,
      estufa_id: data.estufaId || null,
      entidade: data.entidade,
      entidade_id: data.entidadeId,
      acao: data.acao,
      descricao: data.descricao,
      motivo: data.motivo || null,
      actor_name: data.actorName || null,
      metadata: data.metadata || {},
      event_at: now,
    };

    const insertWithActorUid = async (actorUid: string | null) =>
      supabase
        .from('rastreabilidade_eventos')
        .insert({
          ...basePayload,
          actor_uid: actorUid,
        })
        .select('id')
        .single();

    let { data: inserted, error } = await insertWithActorUid(data.actorUid || null);

    const isActorFkError =
      !!error &&
      String(error?.message || '')
        .toLowerCase()
        .includes('rastreabilidade_eventos_actor_uid_fkey');

    if (isActorFkError) {
      ({ data: inserted, error } = await insertWithActorUid(null));
    }

    if (error || !inserted?.id) {
      throw new Error(`Falha ao registrar rastreabilidade: ${error?.message || ''}`.trim());
    }
    return inserted.id as string;
  }

  const now = Timestamp.now();

  const payload: Omit<RastreabilidadeEvento, 'id'> = {
    tenantId,
    userId: tenantId,
    createdBy: data.actorUid || tenantId,
    plantioId: data.plantioId || null,
    hydroLoteId: data.hydroLoteId || null,
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

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('rastreabilidade_eventos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('plantio_id', plantioId)
      .order('event_at', { ascending: false })
      .limit(maxItems);
    if (error) throw new Error(`Erro ao listar rastreabilidade do plantio. ${error.message}`);
    return (data || []).map(mapSupabaseTraceabilityToDomain);
  }

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

export const listTraceabilityEventsByHydroLote = async (
  userId: string,
  hydroLoteId: string,
  maxItems = 100
): Promise<RastreabilidadeEvento[]> => {
  const tenantId = assertTenantId(userId);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('rastreabilidade_eventos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('hydro_lote_id', hydroLoteId)
      .order('event_at', { ascending: false })
      .limit(maxItems);
    if (error) throw new Error(`Erro ao listar rastreabilidade do lote hidropônico. ${error.message}`);
    return (data || []).map(mapSupabaseTraceabilityToDomain);
  }

  const q = query(
    collection(db, 'rastreabilidade_eventos'),
    where('tenantId', '==', tenantId),
    where('hydroLoteId', '==', hydroLoteId),
    orderBy('eventAt', 'desc'),
    limit(maxItems)
  );

  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ ...(item.data() as RastreabilidadeEvento), id: item.id }));
};
