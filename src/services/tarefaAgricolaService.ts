import { Timestamp } from '../lib/timestamp';
import { TarefaAgricola } from '../types/domain';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';

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
  statusHistory: Array.isArray(row.status_history)
    ? row.status_history.map((h: any) => ({
        status: h.status,
        changedAt: Timestamp.fromDate(new Date(h.changedAt || h.changed_at || row.updated_at)),
        changedBy: h.changedBy || h.changed_by || row.created_by || row.tenant_id,
        reason: h.reason || null,
      }))
    : [],
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

export const createTarefaAgricola = async (
  data: Omit<TarefaAgricola, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'userId' | 'createdBy'>,
  userId: string
) => {
  const tenantId = assertTenantId(userId);
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
  if (error || !inserted?.id) {
    throw new Error(`Erro ao criar tarefa agrícola. ${error?.message || ''}`.trim());
  }
  return inserted.id as string;
};

export const listTarefasByPlantio = async (userId: string, plantioId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tarefas_agricolas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('plantio_id', plantioId);
  if (error) {
    throw new Error(`Erro ao listar tarefas por plantio. ${error.message}`);
  }
  return (data || []).map(mapSupabaseTaskToDomain);
};

export const listTodayPendingTasks = async (userId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tarefas_agricolas')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['pendente', 'em_andamento'])
    .gte('data_prevista', start.toISOString())
    .lte('data_prevista', end.toISOString())
    .order('data_prevista', { ascending: true });
  if (error) {
    throw new Error(`Erro ao buscar tarefas pendentes de hoje. ${error.message}`);
  }
  return (data || []).map(mapSupabaseTaskToDomain);
};

export const listTarefasPendentes = async (userId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tarefas_agricolas')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['pendente', 'em_andamento'])
    .order('data_prevista', { ascending: true });
  if (error) {
    throw new Error(`Erro ao listar tarefas pendentes. ${error.message}`);
  }
  return (data || []).map(mapSupabaseTaskToDomain);
};

export const updateTarefaStatus = async (
  tarefaId: string,
  status: TarefaAgricola['status'],
  userId: string,
  options?: { reason?: string | null }
) => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data: current, error: getError } = await supabase
    .from('tarefas_agricolas')
    .select('*')
    .eq('id', tarefaId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (getError) {
    throw new Error(`Erro ao localizar tarefa. ${getError.message}`);
  }
  if (!current) {
    throw new Error('Tarefa não encontrada.');
  }

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
  if (updateError) {
    throw new Error(`Erro ao atualizar status da tarefa. ${updateError.message}`);
  }
};

export const cancelTarefaAgricola = async (tarefaId: string, motivo: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const reason = motivo.trim();
  if (!reason) {
    throw new Error('Informe o motivo do cancelamento.');
  }

  const supabase = getSupabaseClient();
  const { data: current, error } = await supabase
    .from('tarefas_agricolas')
    .select('*')
    .eq('id', tarefaId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao localizar tarefa. ${error.message}`);
  }
  if (!current) {
    throw new Error('Tarefa não encontrada.');
  }

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
  if (updateError) {
    throw new Error(`Erro ao cancelar tarefa. ${updateError.message}`);
  }
};

export const deleteTarefaAgricola = async (tarefaId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('tarefas_agricolas').delete().eq('id', tarefaId).eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao excluir tarefa agrícola. ${error.message}`);
  }
};

