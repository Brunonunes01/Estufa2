// src/services/clienteService.ts
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Cliente } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

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

const listClientesFirebase = async (tenantId: string): Promise<Cliente[]> => {
  const clientes: Cliente[] = [];
  const q = query(collection(db, 'clientes'), where('tenantId', '==', tenantId));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((d) => {
    clientes.push({ ...d.data(), id: d.id } as Cliente);
  });
  return clientes.sort((a, b) => a.nome.localeCompare(b.nome));
};

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

const getClienteByIdFirebase = async (clienteId: string, tenantId: string): Promise<Cliente | null> => {
  const docRef = doc(db, 'clientes', clienteId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data() as Cliente;
  if (data.tenantId !== tenantId && data.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }
  return { ...data, id: docSnap.id };
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
  if (!data) return null;
  return mapSupabaseClienteToDomain(data);
};

const createClienteFirebase = async (data: ClienteFormData, tenantId: string) => {
  const now = Timestamp.now();
  const novoCliente = {
    ...data,
    tenantId,
    userId: tenantId, // Compatibilidade
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, 'clientes'), novoCliente);
  return docRef.id;
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

const updateClienteFirebase = async (clienteId: string, data: ClienteFormData, tenantId: string) => {
  const cliente = await getClienteByIdFirebase(clienteId, tenantId);
  if (!cliente) throw new Error('Cliente não encontrado.');
  const ref = doc(db, 'clientes', clienteId);
  await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
};

const updateClienteSupabase = async (clienteId: string, data: ClienteFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = { ...buildSupabaseClientePayload(data, tenantId), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('clientes').update(payload).eq('id', clienteId).eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao atualizar cliente: ${error.message}`);
};

const deleteClienteFirebase = async (clienteId: string, tenantId: string) => {
  const cliente = await getClienteByIdFirebase(clienteId, tenantId);
  if (!cliente) throw new Error('Cliente não encontrado para exclusão.');
  await deleteDoc(doc(db, 'clientes', clienteId));
};

const deleteClienteSupabase = async (clienteId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('clientes').delete().eq('id', clienteId).eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao excluir cliente: ${error.message}`);
};

// 1. CRIAR
export const createCliente = async (data: ClienteFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createCliente',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      if (isSupabaseBackend()) return createClienteSupabase(data, tenantId);
      return createClienteFirebase(data, tenantId);
    },
  });
};

// 2. LISTAR
export const listClientes = async (userId: string): Promise<Cliente[]> => {
  const tenantId = assertTenantId(userId);
  try {
    if (isSupabaseBackend()) return await listClientesSupabase(tenantId);
    return await listClientesFirebase(tenantId);
  } catch (error) {
    console.error('Erro ao listar clientes: ', error);
    throw new Error('Não foi possível buscar os clientes.');
  }
};

// 3. BUSCAR POR ID
export const getClienteById = async (clienteId: string, userId: string): Promise<Cliente | null> => {
  const tenantId = assertTenantId(userId);
  try {
    if (isSupabaseBackend()) return await getClienteByIdSupabase(clienteId, tenantId);
    return await getClienteByIdFirebase(clienteId, tenantId);
  } catch (error) {
    console.error('Erro ao buscar cliente: ', error);
    throw error;
  }
};

// 4. ATUALIZAR
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
        if (isSupabaseBackend()) {
          await updateClienteSupabase(clienteId, data, tenantId);
          return;
        }
        await updateClienteFirebase(clienteId, data, tenantId);
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
        if (isSupabaseBackend()) {
          await deleteClienteSupabase(clienteId, tenantId);
          return;
        }
        await deleteClienteFirebase(clienteId, tenantId);
      } catch (error) {
        console.error('Erro ao excluir cliente: ', error);
        throw error;
      }
    },
  });
};
