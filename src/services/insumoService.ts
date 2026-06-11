import { Insumo } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';

export type InsumoFormData = {
  nome: string;
  tipo: 'adubo' | 'defensivo' | 'semente' | 'outro';
  unidadePadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number | null;
  custoUnitario: number | null;
  fornecedorId: string | null;
  tamanhoEmbalagem: number | null;
  observacoes: string | null;
};

export type InsumoEntryData = {
  quantidadeComprada: number;
  custoUnitarioCompra: number;
  fornecedorId: string | null;
  observacoes: string | null;
};

const mapSupabaseInsumoToDomain = (row: any): Insumo => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  nome: row.nome,
  tipo: row.tipo || undefined,
  unidadePadrao: row.unidade_padrao || undefined,
  estoqueAtual: Number(row.estoque_atual || 0),
  estoqueMinimo: row.estoque_minimo != null ? Number(row.estoque_minimo) : undefined,
  custoUnitario: Number(row.custo_unitario || 0),
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const buildSupabaseInsumoPayload = (data: Partial<InsumoFormData>, tenantId: string) => ({
  tenant_id: tenantId,
  nome: data.nome,
  tipo: data.tipo ?? null,
  unidade_padrao: data.unidadePadrao ?? null,
  estoque_atual: data.estoqueAtual ?? 0,
  estoque_minimo: data.estoqueMinimo ?? null,
  custo_unitario: data.custoUnitario ?? 0,
  fornecedor_id: data.fornecedorId ?? null,
  observacoes: data.observacoes ?? null,
});

const createInsumoSupabase = async (data: InsumoFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = buildSupabaseInsumoPayload(data, tenantId);
  const { data: inserted, error } = await supabase.from('insumos').insert(payload).select('id').single();
  if (error || !inserted?.id) {
    throw new Error(`Não foi possível criar insumo. ${error?.message || ''}`.trim());
  }
  return inserted.id as string;
};

const updateInsumoSupabase = async (insumoId: string, data: Partial<InsumoFormData>, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = {
    ...buildSupabaseInsumoPayload(data, tenantId),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('insumos').update(payload).eq('id', insumoId).eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao atualizar insumo. ${error.message}`);
  }
};

const listInsumosSupabase = async (tenantId: string): Promise<Insumo[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('insumos').select('*').eq('tenant_id', tenantId).order('nome');
  if (error) {
    throw new Error(`Não foi possível listar insumos. ${error.message}`);
  }
  return (data || []).map(mapSupabaseInsumoToDomain);
};

const getInsumoByIdSupabase = async (insumoId: string, tenantId: string): Promise<Insumo | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('id', insumoId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar insumo. ${error.message}`);
  }
  return data ? mapSupabaseInsumoToDomain(data) : null;
};

const deleteInsumoSupabase = async (insumoId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('insumos').delete().eq('id', insumoId).eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao excluir insumo. ${error.message}`);
  }
};

export const createInsumo = async (data: InsumoFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createInsumo',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => createInsumoSupabase(data, tenantId),
  });
};

export const updateInsumo = async (
  insumoId: string,
  data: Partial<InsumoFormData>,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updateInsumo',
    payload: { id: insumoId, data, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      await updateInsumoSupabase(insumoId, data, tenantId);
    },
  });
};

export const listInsumos = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  return listInsumosSupabase(tenantId);
};

export const listInsumosEmAlerta = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  const insumos = await listInsumosSupabase(tenantId);
  return insumos.filter((item) => item.estoqueMinimo && item.estoqueAtual <= item.estoqueMinimo);
};

export const getInsumoById = async (insumoId: string, userId: string): Promise<Insumo | null> => {
  const tenantId = assertTenantId(userId);
  return getInsumoByIdSupabase(insumoId, tenantId);
};

export const deleteInsumo = async (insumoId: string, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteInsumo',
    payload: { id: insumoId, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      await deleteInsumoSupabase(insumoId, tenantId);
    },
  });
};

export const addEstoqueToInsumo = async (
  insumoId: string,
  entryData: InsumoEntryData,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  const quantidadeComprada = Number(entryData.quantidadeComprada || 0);
  const custoUnitarioCompra = Number(entryData.custoUnitarioCompra || 0);

  if (quantidadeComprada <= 0) {
    throw new Error('Quantidade de entrada deve ser maior que zero.');
  }
  if (custoUnitarioCompra <= 0) {
    throw new Error('Custo unitário da compra deve ser maior que zero.');
  }

  return runOfflineWrite({
    action: 'addEstoqueToInsumo',
    payload: { id: insumoId, entryData, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const supabase = getSupabaseClient();
      const current = await getInsumoByIdSupabase(insumoId, tenantId);
      if (!current) {
        throw new Error('Insumo não encontrado.');
      }

      const estoqueAntigo = Number(current.estoqueAtual || 0);
      const custoAntigo = Number(current.custoUnitario || 0);
      const novoEstoque = estoqueAntigo + quantidadeComprada;
      const valorEstoqueAntigo = estoqueAntigo * custoAntigo;
      const valorNovaCompra = quantidadeComprada * custoUnitarioCompra;
      const novoCusto = novoEstoque > 0 ? (valorEstoqueAntigo + valorNovaCompra) / novoEstoque : custoAntigo;

      const { error: updateError } = await supabase
        .from('insumos')
        .update({
          estoque_atual: novoEstoque,
          custo_unitario: novoCusto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', insumoId)
        .eq('tenant_id', tenantId);
      if (updateError) {
        throw new Error(`Erro ao atualizar estoque do insumo. ${updateError.message}`);
      }

      const { error: entryError } = await supabase.from('insumo_entradas').insert({
        tenant_id: tenantId,
        insumo_id: insumoId,
        fornecedor_id: entryData.fornecedorId || null,
        quantidade_comprada: quantidadeComprada,
        custo_unitario_compra: custoUnitarioCompra,
        observacoes: entryData.observacoes || null,
        data_entrada: new Date().toISOString(),
      });
      if (entryError) {
        throw new Error(`Erro ao registrar entrada de insumo. ${entryError.message}`);
      }
    },
  });
};
