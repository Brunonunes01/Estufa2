import { Cliente } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';

export type ClienteFormData = {
  nome: string;
  telefone?: string | null;
  cidade?: string | null;
  tipo?: string | null;
  observacoes?: string | null;
  email?: string | null;
  documento?: string | null;
  contatoResponsavel?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  estado?: string | null;
  complemento?: string | null;
};

const mapSupabaseClienteToDomain = (row: any): Cliente => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  nome: row.nome,
  cidade: row.cidade || undefined,
  telefone: row.telefone || undefined,
  email: row.email || undefined,
  documento: row.documento || undefined,
  contatoResponsavel: row.contato_responsavel || undefined,
  cep: row.cep || undefined,
  endereco: row.endereco || undefined,
  numero: row.numero || undefined,
  bairro: row.bairro || undefined,
  estado: row.estado || undefined,
  complemento: row.complemento || undefined,
  tipo: row.tipo || undefined,
  observacoes: row.observacoes || undefined,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const buildSupabaseClientePayload = (data: ClienteFormData, tenantId: string) => ({
  tenant_id: tenantId,
  nome: data.nome,
  telefone: data.telefone ?? null,
  cidade: data.cidade ?? null,
  tipo: data.tipo ?? null,
  observacoes: data.observacoes ?? null,
  email: data.email ?? null,
  documento: data.documento ?? null,
  contato_responsavel: data.contatoResponsavel ?? null,
  cep: data.cep ?? null,
  endereco: data.endereco ?? null,
  numero: data.numero ?? null,
  bairro: data.bairro ?? null,
  estado: data.estado ?? null,
  complemento: data.complemento ?? null,
});

const listClientesSupabase = async (tenantId: string): Promise<Cliente[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(`Não foi possível buscar os clientes. ${error.message}`);
  }

  return (data || []).map(mapSupabaseClienteToDomain);
};

const getClienteByIdSupabase = async (clienteId: string, tenantId: string): Promise<Cliente | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar cliente: ${error.message}`);
  }

  return data ? mapSupabaseClienteToDomain(data) : null;
};

const createClienteSupabase = async (data: ClienteFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = buildSupabaseClientePayload(data, tenantId);
  const { data: inserted, error } = await supabase.from('clientes').insert(payload).select('id').single();

  if (error || !inserted?.id) {
    throw new Error(`Não foi possível cadastrar o cliente. ${error?.message || ''}`.trim());
  }

  return inserted.id as string;
};

const updateClienteSupabase = async (clienteId: string, data: ClienteFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = { ...buildSupabaseClientePayload(data, tenantId), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('clientes').update(payload).eq('id', clienteId).eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao atualizar cliente: ${error.message}`);
  }
};

const deleteClienteSupabase = async (clienteId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('clientes').delete().eq('id', clienteId).eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao excluir cliente: ${error.message}`);
  }
};

export const createCliente = async (data: ClienteFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createCliente',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => createClienteSupabase(data, tenantId),
  });
};

export const listClientes = async (userId: string): Promise<Cliente[]> => {
  const tenantId = assertTenantId(userId);
  try {
    return await listClientesSupabase(tenantId);
  } catch (error) {
    console.error('Erro ao listar clientes: ', error);
    throw new Error('Não foi possível buscar os clientes.');
  }
};

export const getClienteById = async (clienteId: string, userId: string): Promise<Cliente | null> => {
  const tenantId = assertTenantId(userId);
  try {
    return await getClienteByIdSupabase(clienteId, tenantId);
  } catch (error) {
    console.error('Erro ao buscar cliente: ', error);
    throw error;
  }
};

export const updateCliente = async (
  clienteId: string,
  data: ClienteFormData,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updateCliente',
    payload: { id: clienteId, data, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      try {
        await updateClienteSupabase(clienteId, data, tenantId);
      } catch (error) {
        console.error('Erro ao atualizar cliente: ', error);
        throw error;
      }
    },
  });
};

export const deleteCliente = async (clienteId: string, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteCliente',
    payload: { id: clienteId, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      try {
        await deleteClienteSupabase(clienteId, tenantId);
      } catch (error) {
        console.error('Erro ao excluir cliente: ', error);
        throw error;
      }
    },
  });
};
