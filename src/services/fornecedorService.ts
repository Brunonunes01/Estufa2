// src/services/fornecedorService.ts
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
  deleteDoc
} from '../compat/legacyDataApi';
import { db } from './removedBackend';
import { Fornecedor } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

// Dados que vêm do formulário
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

const createFornecedorLegacy = async (data: FornecedorFormData, tenantId: string) => {
  const novoFornecedor = {
    ...data,
    tenantId,
    userId: tenantId,
    createdBy: tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(db, 'fornecedores'), novoFornecedor);
  return docRef.id;
};

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

const listFornecedoresLegacy = async (tenantId: string): Promise<Fornecedor[]> => {
  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(query(collection(db, 'fornecedores'), where('tenantId', '==', tenantId))),
    getDocs(query(collection(db, 'fornecedores'), where('userId', '==', tenantId))),
  ]);

  const fornecedoresMap = new Map<string, Fornecedor>();
  [tenantSnap, legacySnap].forEach((snap) => {
    snap.forEach((document) => {
      fornecedoresMap.set(document.id, { ...document.data(), id: document.id } as Fornecedor);
    });
  });

  return Array.from(fornecedoresMap.values()).sort((a, b) =>
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  );
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

const getFornecedorByIdLegacy = async (fornecedorId: string, tenantId: string): Promise<Fornecedor | null> => {
  const docRef = doc(db, 'fornecedores', fornecedorId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data() as Fornecedor;
  if (data.tenantId !== tenantId && data.userId !== tenantId) {
    throw new Error('Acesso negado: este fornecedor não pertence ao seu tenant.');
  }
  return { ...data, id: docSnap.id };
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

const updateFornecedorLegacy = async (fornecedorId: string, data: FornecedorFormData, tenantId: string) => {
  const fornecedor = await getFornecedorByIdLegacy(fornecedorId, tenantId);
  if (!fornecedor) throw new Error('Fornecedor não encontrado.');

  const fornecedorRef = doc(db, 'fornecedores', fornecedorId);
  await updateDoc(fornecedorRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
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
  if (error) throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);
};

const deleteFornecedorLegacy = async (fornecedorId: string, tenantId: string) => {
  const fornecedor = await getFornecedorByIdLegacy(fornecedorId, tenantId);
  if (!fornecedor) throw new Error('Fornecedor não encontrado para exclusão.');
  await deleteDoc(doc(db, 'fornecedores', fornecedorId));
};

const deleteFornecedorSupabase = async (fornecedorId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('fornecedores')
    .delete()
    .eq('id', fornecedorId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao excluir fornecedor: ${error.message}`);
};

// 1. CRIAR FORNECEDOR
export const createFornecedor = async (data: FornecedorFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createFornecedor',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      try {
        if (isSupabaseBackend()) return await createFornecedorSupabase(data, tenantId);
        return await createFornecedorLegacy(data, tenantId);
      } catch (error) {
        console.error("Erro ao criar fornecedor: ", error);
        throw new Error('Não foi possível criar o fornecedor.');
      }
    },
  });
};

// 2. LISTAR FORNECEDORES
export const listFornecedores = async (userId: string): Promise<Fornecedor[]> => {
  const tenantId = assertTenantId(userId);
  try {
    if (isSupabaseBackend()) return await listFornecedoresSupabase(tenantId);
    return await listFornecedoresLegacy(tenantId);

  } catch (error) { 
    console.error("Erro ao listar fornecedores: ", error);
    throw new Error('Não foi possível buscar os fornecedores.');
  }
};

// 3. BUSCAR FORNECEDOR POR ID
export const getFornecedorById = async (fornecedorId: string, userId: string): Promise<Fornecedor | null> => {
  const tenantId = assertTenantId(userId);
  try {
    if (isSupabaseBackend()) return await getFornecedorByIdSupabase(fornecedorId, tenantId);
    return await getFornecedorByIdLegacy(fornecedorId, tenantId);
  } catch (error) {
    console.error("Erro ao buscar fornecedor por ID: ", error);
    throw error;
  }
};

// 4. ATUALIZAR FORNECEDOR
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
        if (isSupabaseBackend()) {
          await updateFornecedorSupabase(fornecedorId, data, tenantId);
          return;
        }
        await updateFornecedorLegacy(fornecedorId, data, tenantId);
      } catch (error) {
        console.error("Erro ao atualizar fornecedor: ", error);
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
        if (isSupabaseBackend()) {
          await deleteFornecedorSupabase(fornecedorId, tenantId);
          return;
        }
        await deleteFornecedorLegacy(fornecedorId, tenantId);
      } catch (error) {
        console.error("Erro ao excluir fornecedor: ", error);
        throw error;
      }
    },
  });
};
