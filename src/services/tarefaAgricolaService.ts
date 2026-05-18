import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { TarefaAgricola } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

const mapSupabaseTaskToDomain = (row: any): TarefaAgricola => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  plantioId: row.plantio_id,
  estufaId: row.estufa_id || undefined,
  tipoTarefa: row.tipo_tarefa,
  dataPrevista: Timestamp.fromDate(new Date(row.data_prevista)),
  status: row.status,
  prioridade: row.prioridade,
  observacoes: row.observacoes || undefined,
  cancelReason: row.cancel_reason || undefined,
  statusHistory: Array.isArray(row.status_history) ? row.status_history.map((h: any) => ({
    status: h.status,
    changedAt: Timestamp.fromDate(new Date(h.changedAt || h.changed_at || row.updated_at)),
    changedBy: h.changedBy || h.changed_by || row.created_by || row.tenant_id,
    reason: h.reason || null,
  })) : [],
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

export const createTarefaAgricola = async (
  data: Omit<TarefaAgricola, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'userId' | 'createdBy'>,
  userId: string
) => {
  const tenantId = assertTenantId(userId);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();
    const statusHistory = [
      {
        status: data.status,
        changedAt: nowIso,
        changedBy: tenantId,
        reason: null,
      },
    ];

    const { data: inserted, error } = await supabase
      .from('tarefas_agricolas')
      .insert({
        tenant_id: tenantId,
        plantio_id: data.plantioId,
        estufa_id: data.estufaId || null,
        tipo_tarefa: data.tipoTarefa,
        data_prevista:
          typeof (data.dataPrevista as any)?.toDate === 'function'
            ? (data.dataPrevista as any).toDate().toISOString()
            : new Date(data.dataPrevista as any).toISOString(),
        status: data.status,
        prioridade: data.prioridade,
        observacoes: data.observacoes || null,
        cancel_reason: data.cancelReason || null,
        status_history: statusHistory,
      })
      .select('id')
      .single();
    if (error || !inserted?.id) throw new Error(`Erro ao criar tarefa agrícola. ${error?.message || ''}`.trim());
    return inserted.id as string;
  }

  const now = Timestamp.now();

  const novaTarefa = {
    ...data,
    userId: tenantId,
    tenantId,
    createdBy: tenantId,
    statusHistory: [
      {
        status: data.status,
        changedAt: now,
        changedBy: tenantId,
        reason: null,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, 'tarefas_agricolas'), novaTarefa);
  await createTraceabilityEventSafely(tenantId, {
    plantioId: data.plantioId,
    estufaId: data.estufaId || null,
    entidade: 'tarefa',
    entidadeId: ref.id,
    acao: 'criado',
    descricao: 'Tarefa agrícola criada.',
    actorUid: tenantId,
    metadata: {
      tipoTarefa: data.tipoTarefa,
      prioridade: data.prioridade,
      status: data.status,
      dataPrevista: data.dataPrevista || null,
    },
  });
  return ref.id;
};

export const listTarefasByPlantio = async (userId: string, plantioId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tarefas_agricolas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('plantio_id', plantioId);
    if (error) throw new Error(`Erro ao listar tarefas por plantio. ${error.message}`);
    return (data || []).map(mapSupabaseTaskToDomain);
  }

  const [byTenantId, byUserId] = await Promise.all([
    getDocs(query(collection(db, 'tarefas_agricolas'), where('tenantId', '==', tenantId), where('plantioId', '==', plantioId))),
    getDocs(query(collection(db, 'tarefas_agricolas'), where('userId', '==', tenantId), where('plantioId', '==', plantioId))),
  ]);

  const map = new Map<string, TarefaAgricola>();
  [...byTenantId.docs, ...byUserId.docs].forEach((item) => {
    map.set(item.id, { ...(item.data() as TarefaAgricola), id: item.id });
  });
  return Array.from(map.values());
};

export const listTodayPendingTasks = async (userId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tarefas_agricolas')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['pendente', 'em_andamento'])
      .gte('data_prevista', start.toISOString())
      .lte('data_prevista', end.toISOString())
      .order('data_prevista', { ascending: true });
    if (error) throw new Error(`Erro ao buscar tarefas pendentes de hoje. ${error.message}`);
    return (data || []).map(mapSupabaseTaskToDomain);
  }

  try {
    const q = query(
      collection(db, 'tarefas_agricolas'),
      where('tenantId', '==', tenantId),
      where('status', 'in', ['pendente', 'em_andamento']),
      where('dataPrevista', '>=', Timestamp.fromDate(start)),
      where('dataPrevista', '<=', Timestamp.fromDate(end))
    );

    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ ...(d.data() as TarefaAgricola), id: d.id }))
      .sort((a, b) => a.dataPrevista.toMillis() - b.dataPrevista.toMillis());
  } catch (error: any) {
    // Fallback para ambientes sem índice composto ou com dados legados em tenantId.
    if (error?.code !== 'failed-precondition' && error?.code !== 'unimplemented') {
      throw error;
    }

    const [byUserIdSnap, byTenantIdSnap] = await Promise.all([
      getDocs(query(collection(db, 'tarefas_agricolas'), where('userId', '==', tenantId))),
      getDocs(query(collection(db, 'tarefas_agricolas'), where('tenantId', '==', tenantId))),
    ]);

    const map = new Map<string, TarefaAgricola>();
    [...byUserIdSnap.docs, ...byTenantIdSnap.docs].forEach((item) => {
      map.set(item.id, { ...(item.data() as TarefaAgricola), id: item.id });
    });

    const startMs = start.getTime();
    const endMs = end.getTime();
    return Array.from(map.values())
      .filter((task) => task.status === 'pendente' || task.status === 'em_andamento')
      .filter((task) => {
        if (!task.dataPrevista) return false;
        const value = task.dataPrevista;
        const ms =
          typeof (value as any)?.toMillis === 'function'
            ? (value as any).toMillis()
            : typeof (value as any)?.seconds === 'number'
            ? (value as any).seconds * 1000
            : NaN;
        return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
      })
      .sort((a, b) => a.dataPrevista.toMillis() - b.dataPrevista.toMillis());
  }
};

export const listTarefasPendentes = async (userId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tarefas_agricolas')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['pendente', 'em_andamento'])
      .order('data_prevista', { ascending: true });
    if (error) throw new Error(`Erro ao listar tarefas pendentes. ${error.message}`);
    return (data || []).map(mapSupabaseTaskToDomain);
  }

  const q = query(
    collection(db, 'tarefas_agricolas'),
    where('tenantId', '==', tenantId),
    where('status', 'in', ['pendente', 'em_andamento'])
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...(d.data() as TarefaAgricola), id: d.id }))
    .sort((a, b) => a.dataPrevista.toMillis() - b.dataPrevista.toMillis());
};

export const updateTarefaStatus = async (
  tarefaId: string,
  status: TarefaAgricola['status'],
  userId: string,
  options?: { reason?: string | null }
) => {
  const tenantId = assertTenantId(userId);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data: current, error: getError } = await supabase
      .from('tarefas_agricolas')
      .select('*')
      .eq('id', tarefaId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (getError) throw new Error(`Erro ao localizar tarefa. ${getError.message}`);
    if (!current) throw new Error('Tarefa não encontrada.');

    const history = Array.isArray(current.status_history) ? current.status_history : [];
    const reason = options?.reason?.trim() || null;
    const nextHistory = [
      ...history,
      {
        status,
        changedAt: new Date().toISOString(),
        changedBy: tenantId,
        reason,
      },
    ];

    const { error: updateError } = await supabase
      .from('tarefas_agricolas')
      .update({
        status,
        status_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tarefaId)
      .eq('tenant_id', tenantId);
    if (updateError) throw new Error(`Erro ao atualizar status da tarefa. ${updateError.message}`);
    return;
  }

  const tarefaRef = doc(db, 'tarefas_agricolas', tarefaId);
  const tarefaSnap = await getDoc(tarefaRef);

  if (!tarefaSnap.exists()) throw new Error('Tarefa não encontrada.');
  const tarefa = tarefaSnap.data() as TarefaAgricola;
  if (tarefa.tenantId !== tenantId && tarefa.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }

  const history = Array.isArray(tarefa.statusHistory) ? tarefa.statusHistory : [];
  const reason = options?.reason?.trim() || null;

  await updateDoc(tarefaRef, {
    status,
    statusHistory: [
      ...history,
      {
        status,
        changedAt: Timestamp.now(),
        changedBy: tenantId,
        reason,
      },
    ],
    updatedAt: Timestamp.now(),
  });

  await createTraceabilityEventSafely(tenantId, {
    plantioId: tarefa.plantioId,
    estufaId: tarefa.estufaId || null,
    entidade: 'tarefa',
    entidadeId: tarefaId,
    acao: status === 'cancelada' ? 'cancelado' : 'status_alterado',
    descricao: `Status da tarefa alterado para ${status}.`,
    motivo: reason,
    actorUid: tenantId,
    metadata: {
      previousStatus: tarefa.status,
      newStatus: status,
      tipoTarefa: tarefa.tipoTarefa || null,
      prioridade: tarefa.prioridade || null,
    },
  });
};

export const cancelTarefaAgricola = async (tarefaId: string, motivo: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const reason = motivo.trim();
  if (!reason) throw new Error('Informe o motivo do cancelamento.');

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data: current, error } = await supabase
      .from('tarefas_agricolas')
      .select('*')
      .eq('id', tarefaId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw new Error(`Erro ao localizar tarefa. ${error.message}`);
    if (!current) throw new Error('Tarefa não encontrada.');

    const previousObs = String(current.observacoes || '').trim();
    const cancelNote = `Cancelada: ${reason}`;
    const mergedObs = previousObs ? `${previousObs}\n${cancelNote}` : cancelNote;

    await updateTarefaStatus(tarefaId, 'cancelada', tenantId, { reason });
    const { error: updateError } = await supabase
      .from('tarefas_agricolas')
      .update({
        observacoes: mergedObs,
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tarefaId)
      .eq('tenant_id', tenantId);
    if (updateError) throw new Error(`Erro ao cancelar tarefa. ${updateError.message}`);
    return;
  }

  const tarefaRef = doc(db, 'tarefas_agricolas', tarefaId);
  const tarefaSnap = await getDoc(tarefaRef);
  if (!tarefaSnap.exists()) throw new Error('Tarefa não encontrada.');

  const tarefa = tarefaSnap.data() as TarefaAgricola;
  if (tarefa.tenantId !== tenantId && tarefa.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }

  const previousObs = (tarefa.observacoes || '').trim();
  const cancelNote = `Cancelada: ${reason}`;
  const mergedObs = previousObs ? `${previousObs}\n${cancelNote}` : cancelNote;

  await updateTarefaStatus(tarefaId, 'cancelada', tenantId, { reason });
  await updateDoc(tarefaRef, {
    observacoes: mergedObs,
    cancelReason: reason,
    updatedAt: Timestamp.now(),
  });
};

export const deleteTarefaAgricola = async (tarefaId: string, userId: string) => {
  const tenantId = assertTenantId(userId);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tarefas_agricolas')
      .delete()
      .eq('id', tarefaId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`Erro ao excluir tarefa agrícola. ${error.message}`);
    return;
  }

  const tarefaRef = doc(db, 'tarefas_agricolas', tarefaId);
  const tarefaSnap = await getDoc(tarefaRef);
  if (!tarefaSnap.exists()) throw new Error('Tarefa não encontrada.');

  const tarefa = tarefaSnap.data() as TarefaAgricola;
  if (tarefa.tenantId !== tenantId && tarefa.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }

  await deleteDoc(tarefaRef);
  await createTraceabilityEventSafely(tenantId, {
    plantioId: tarefa.plantioId,
    estufaId: tarefa.estufaId || null,
    entidade: 'tarefa',
    entidadeId: tarefaId,
    acao: 'excluido',
    descricao: 'Tarefa agrícola excluída.',
    actorUid: tenantId,
    metadata: {
      tipoTarefa: tarefa.tipoTarefa,
      status: tarefa.status,
      prioridade: tarefa.prioridade || null,
      cancelReason: tarefa.cancelReason || null,
    },
  });
};
