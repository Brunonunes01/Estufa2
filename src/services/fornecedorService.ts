import { Fornecedor } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';

export type FornecedorFormData = {
  nome: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
};

const mapSupabaseFornecedorToDomain = (row: any): Fornecedor => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  nome: row.nome,
  contato: row.contato || undefined,
  telefone: row.telefone || undefined,
  email: row.email || undefined,
  categoria: row.categoria || undefined,
  observacoes: row.observacoes || undefined,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const buildSupabaseFornecedorPayload = (data: FornecedorFormData, tenantId: string) => ({
  tenant_id: tenantId,
  nome: data.nome,
  contato: data.contato ?? null,
  telefone: data.telefone ?? null,
  email: data.email ?? null,
  observacoes: data.observacoes ?? null,
});

const createFornecedorSupabase = async (data: FornecedorFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { data: inserted, error } = await supabase
    .from('fornecedores')
    .insert(buildSupabaseFornecedorPayload(data, tenantId))
    .select('id')
    .single();

  if (error || !inserted?.id) {
    throw new Error(`Não foi possível criar o fornecedor. ${error?.message || ''}`.trim());
  }
  return inserted.id as string;
};

const listFornecedoresSupabase = async (tenantId: string): Promise<Fornecedor[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(`Não foi possível buscar os fornecedores. ${error.message}`);
  }

  return (data || []).map(mapSupabaseFornecedorToDomain);
};

const getFornecedorByIdSupabase = async (fornecedorId: string, tenantId: string): Promise<Fornecedor | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('id', fornecedorId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar fornecedor por ID: ${error.message}`);
  }

  return data ? mapSupabaseFornecedorToDomain(data) : null;
};

const updateFornecedorSupabase = async (fornecedorId: string, data: FornecedorFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = {
    ...buildSupabaseFornecedorPayload(data, tenantId),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('fornecedores')
    .update(payload)
    .eq('id', fornecedorId)
    .eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);
  }
};

const deleteFornecedorSupabase = async (fornecedorId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('fornecedores')
    .delete()
    .eq('id', fornecedorId)
    .eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao excluir fornecedor: ${error.message}`);
  }
};

export const createFornecedor = async (data: FornecedorFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createFornecedor',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      try {
        return await createFornecedorSupabase(data, tenantId);
      } catch (error) {
        console.error('Erro ao criar fornecedor: ', error);
        throw new Error('Não foi possível criar o fornecedor.');
      }
    },
  });
};

export const listFornecedores = async (userId: string): Promise<Fornecedor[]> => {
  const tenantId = assertTenantId(userId);
  try {
    return await listFornecedoresSupabase(tenantId);
  } catch (error) {
    console.error('Erro ao listar fornecedores: ', error);
    throw new Error('Não foi possível buscar os fornecedores.');
  }
};

export const getFornecedorById = async (fornecedorId: string, userId: string): Promise<Fornecedor | null> => {
  const tenantId = assertTenantId(userId);
  try {
    return await getFornecedorByIdSupabase(fornecedorId, tenantId);
  } catch (error) {
    console.error('Erro ao buscar fornecedor por ID: ', error);
    throw error;
  }
};

export const updateFornecedor = async (
  fornecedorId: string,
  data: FornecedorFormData,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updateFornecedor',
    payload: { id: fornecedorId, data, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      try {
        await updateFornecedorSupabase(fornecedorId, data, tenantId);
      } catch (error) {
        console.error('Erro ao atualizar fornecedor: ', error);
        throw error;
      }
    },
  });
};

export const deleteFornecedor = async (
  fornecedorId: string,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteFornecedor',
    payload: { id: fornecedorId, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      try {
        await deleteFornecedorSupabase(fornecedorId, tenantId);
      } catch (error) {
        console.error('Erro ao excluir fornecedor: ', error);
        throw error;
      }
    },
  });
};
