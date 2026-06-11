import { Timestamp } from '../lib/timestamp';
import { Despesa } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';

export type DespesaFormData = {
  descricao: string;
  categoria: Despesa['categoria'];
  valor: number;
  dataDespesa: Date;
  dataVencimento?: Date | null;
  statusPagamento: 'pago' | 'pendente';
  observacoes?: string | null;
  plantioId?: string | null;
  estufaId?: string | null;
  pagamentoPara?: string | null;
  comprovanteUrl?: string | null;
  comprovantePublicId?: string | null;
  comprovanteNome?: string | null;
  comprovanteMime?: string | null;
  comprovanteBytes?: number | null;
};

const mapSupabaseDespesaToDomain = (row: any): Despesa => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  descricao: row.descricao,
  categoria: row.categoria,
  valor: Number(row.valor || 0),
  dataVencimento: row.data_vencimento ? Timestamp.fromDate(new Date(row.data_vencimento)) : undefined,
  dataDespesa: row.data_despesa ? Timestamp.fromDate(new Date(row.data_despesa)) : undefined,
  statusPagamento: row.status_pagamento,
  status: row.status_pagamento,
  plantioId: row.plantio_id || undefined,
  estufaId: row.estufa_id || undefined,
  pagamentoPara: row.pagamento_para || null,
  tipoGasto: row.tipo_gasto || null,
  comprovanteUrl: row.comprovante_url || null,
  comprovantePublicId: row.comprovante_public_id || null,
  comprovanteNome: row.comprovante_nome || null,
  comprovanteMime: row.comprovante_mime || null,
  comprovanteBytes: row.comprovante_bytes != null ? Number(row.comprovante_bytes) : null,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const buildSupabaseDespesaPayload = (data: DespesaFormData, tenantId: string) => ({
  tenant_id: tenantId,
  descricao: data.descricao,
  categoria: data.categoria,
  valor: Number(data.valor || 0),
  data_despesa: data.dataDespesa.toISOString(),
  data_vencimento: data.dataVencimento ? data.dataVencimento.toISOString() : null,
  status_pagamento: data.statusPagamento,
  plantio_id: data.plantioId || null,
  estufa_id: data.estufaId || null,
  pagamento_para: data.pagamentoPara || null,
  observacoes: data.observacoes || null,
  comprovante_url: data.comprovanteUrl || null,
  comprovante_public_id: data.comprovantePublicId || null,
  comprovante_nome: data.comprovanteNome || null,
  comprovante_mime: data.comprovanteMime || null,
  comprovante_bytes: data.comprovanteBytes || null,
});

const createDespesaSupabase = async (data: DespesaFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { data: inserted, error } = await supabase
    .from('despesas')
    .insert(buildSupabaseDespesaPayload(data, tenantId))
    .select('id')
    .single();
  if (error || !inserted?.id) {
    throw new Error(`Não foi possível salvar despesa. ${error?.message || ''}`.trim());
  }
  return inserted.id as string;
};

const listDespesasSupabase = async (tenantId: string): Promise<Despesa[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('data_despesa', { ascending: false });

  if (error) {
    throw new Error(`Não foi possível buscar despesas. ${error.message}`);
  }
  return (data || []).map(mapSupabaseDespesaToDomain);
};

const getDespesaByIdSupabase = async (id: string, tenantId: string): Promise<Despesa | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar despesa. ${error.message}`);
  }
  return data ? mapSupabaseDespesaToDomain(data) : null;
};

const updateDespesaStatusSupabase = async (
  id: string,
  novoStatus: 'pago' | 'pendente',
  tenantId: string,
  pagamentoPara?: string | null
) => {
  const supabase = getSupabaseClient();
  const updatePayload: any = {
    status_pagamento: novoStatus,
    updated_at: new Date().toISOString(),
  };

  if (novoStatus === 'pago' && pagamentoPara) {
    updatePayload.pagamento_para = pagamentoPara;
  }

  const { error } = await supabase
    .from('despesas')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao atualizar despesa. ${error.message}`);
  }
};

const deleteDespesaSupabase = async (despesaId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('despesas')
    .delete()
    .eq('id', despesaId)
    .eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao excluir despesa. ${error.message}`);
  }
};

export const createDespesa = async (data: DespesaFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createDespesa',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => createDespesaSupabase(data, tenantId),
  });
};

export const listDespesas = async (userId: string): Promise<Despesa[]> => {
  const tenantId = assertTenantId(userId);
  return listDespesasSupabase(tenantId);
};

export const listDespesasByMonth = async (userId: string, year: number, month: number): Promise<Despesa[]> => {
  const tenantId = assertTenantId(userId);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('data_despesa', startDate.toISOString())
    .lte('data_despesa', endDate.toISOString())
    .order('data_despesa', { ascending: false });

  if (error) {
    throw new Error(`Não foi possível buscar despesas do mês. ${error.message}`);
  }
  return (data || []).map(mapSupabaseDespesaToDomain);
};

export const getDespesaById = async (id: string, userId: string): Promise<Despesa | null> => {
  const tenantId = assertTenantId(userId);
  return getDespesaByIdSupabase(id, tenantId);
};

export const updateDespesaStatus = async (
  id: string,
  novoStatus: 'pago' | 'pendente',
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updateDespesaStatus',
    payload: { id, status: novoStatus, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      await updateDespesaStatusSupabase(id, novoStatus, tenantId);
    },
  });
};

export const deleteDespesa = async (despesaId: string, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteDespesa',
    payload: { id: despesaId, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      await deleteDespesaSupabase(despesaId, tenantId);
    },
  });
};

export const getTotalDespesasPendentes = async (userId: string): Promise<number> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('despesas')
    .select('valor, tipo_gasto')
    .eq('tenant_id', tenantId)
    .eq('status_pagamento', 'pendente');
  if (error) {
    throw new Error(`Não foi possível calcular despesas pendentes. ${error.message}`);
  }

  return (data || [])
    .filter((item: any) => item.tipo_gasto !== 'investimento_inicial')
    .reduce((acc, item: any) => acc + Number(item.valor || 0), 0);
};

