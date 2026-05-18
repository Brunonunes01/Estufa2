import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
  getDoc,
  getAggregateFromServer,
  sum,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Despesa } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

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
  observacoes: data.observacoes || null,
});

const createDespesaFirebase = async (data: DespesaFormData, tenantId: string) => {
  const now = Timestamp.now();
  const novaDespesa = {
    ...data,
    tenantId,
    userId: tenantId, // Compatibilidade
    dataDespesa: Timestamp.fromDate(data.dataDespesa),
    dataVencimento: data.dataVencimento ? Timestamp.fromDate(data.dataVencimento) : null,
    createdAt: now,
    updatedAt: now,
    status: data.statusPagamento,
  };
  const docRef = await addDoc(collection(db, 'despesas'), novaDespesa);
  return docRef.id;
};

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

const sortDespesasByDateDesc = (despesas: Despesa[]) =>
  despesas.sort((a, b) => {
    const dateA = a.dataDespesa instanceof Timestamp ? a.dataDespesa.seconds : 0;
    const dateB = b.dataDespesa instanceof Timestamp ? b.dataDespesa.seconds : 0;
    return dateB - dateA;
  });

const listDespesasFirebase = async (tenantId: string): Promise<Despesa[]> => {
  const q = query(collection(db, 'despesas'), where('tenantId', '==', tenantId));
  const querySnapshot = await getDocs(q);
  return sortDespesasByDateDesc(querySnapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Despesa)));
};

const listDespesasSupabase = async (tenantId: string): Promise<Despesa[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('data_despesa', { ascending: false });

  if (error) throw new Error(`Não foi possível buscar despesas. ${error.message}`);
  return (data || []).map(mapSupabaseDespesaToDomain);
};

const getDespesaByIdFirebase = async (id: string, tenantId: string): Promise<Despesa | null> => {
  const docRef = doc(db, 'despesas', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as Despesa;
    if (data.tenantId !== tenantId && data.userId !== tenantId) {
      throw new Error('Acesso negado.');
    }
    return { ...data, id: docSnap.id };
  }
  return null;
};

const getDespesaByIdSupabase = async (id: string, tenantId: string): Promise<Despesa | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar despesa. ${error.message}`);
  return data ? mapSupabaseDespesaToDomain(data) : null;
};

const updateDespesaStatusFirebase = async (id: string, novoStatus: 'pago' | 'pendente', tenantId: string) => {
  const despesa = await getDespesaByIdFirebase(id, tenantId);
  if (!despesa) throw new Error('Despesa não encontrada.');
  await updateDoc(doc(db, 'despesas', id), {
    statusPagamento: novoStatus,
    status: novoStatus,
    updatedAt: Timestamp.now(),
  });
};

const updateDespesaStatusSupabase = async (id: string, novoStatus: 'pago' | 'pendente', tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('despesas')
    .update({
      status_pagamento: novoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao atualizar despesa. ${error.message}`);
};

const deleteDespesaFirebase = async (despesaId: string, tenantId: string) => {
  const despesa = await getDespesaByIdFirebase(despesaId, tenantId);
  if (!despesa) throw new Error('Despesa não encontrada.');
  await deleteDoc(doc(db, 'despesas', despesaId));
};

const deleteDespesaSupabase = async (despesaId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('despesas')
    .delete()
    .eq('id', despesaId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao excluir despesa. ${error.message}`);
};

export const createDespesa = async (data: DespesaFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createDespesa',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      if (isSupabaseBackend()) return createDespesaSupabase(data, tenantId);
      return createDespesaFirebase(data, tenantId);
    },
  });
};

export const listDespesas = async (userId: string): Promise<Despesa[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) return listDespesasSupabase(tenantId);
  return listDespesasFirebase(tenantId);
};

export const listDespesasByMonth = async (userId: string, year: number, month: number): Promise<Despesa[]> => {
  const tenantId = assertTenantId(userId);
  
  // O mês no JS Date é 0-indexed (0 = Janeiro, 11 = Dezembro)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('data_despesa', startDate.toISOString())
      .lte('data_despesa', endDate.toISOString())
      .order('data_despesa', { ascending: false });

    if (error) throw new Error(`Não foi possível buscar despesas do mês. ${error.message}`);
    return (data || []).map(mapSupabaseDespesaToDomain);
  }

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);
  const q = query(
    collection(db, 'despesas'),
    where('tenantId', '==', tenantId),
    where('dataDespesa', '>=', startTimestamp),
    where('dataDespesa', '<=', endTimestamp)
  );
  const querySnapshot = await getDocs(q);
  return sortDespesasByDateDesc(querySnapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Despesa)));
};

export const getDespesaById = async (id: string, userId: string): Promise<Despesa | null> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) return getDespesaByIdSupabase(id, tenantId);
  return getDespesaByIdFirebase(id, tenantId);
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
      if (isSupabaseBackend()) {
        await updateDespesaStatusSupabase(id, novoStatus, tenantId);
        return;
      }
      await updateDespesaStatusFirebase(id, novoStatus, tenantId);
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
      if (isSupabaseBackend()) {
        await deleteDespesaSupabase(despesaId, tenantId);
        return;
      }
      await deleteDespesaFirebase(despesaId, tenantId);
    },
  });
};

export const getTotalDespesasPendentes = async (userId: string): Promise<number> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('despesas')
      .select('valor')
      .eq('tenant_id', tenantId)
      .eq('status_pagamento', 'pendente');
    if (error) throw new Error(`Não foi possível calcular despesas pendentes. ${error.message}`);
    return (data || []).reduce((acc, item: any) => acc + Number(item.valor || 0), 0);
  }

  const q = query(
    collection(db, 'despesas'),
    where('tenantId', '==', tenantId),
    where('statusPagamento', '==', 'pendente')
  );

  try {
    const snapshot = await getAggregateFromServer(q, {
      total: sum('valor'),
    });

    return snapshot.data().total || 0;
  } catch (error: any) {
    // Fallback para ambientes/projetos sem índice de agregação composto.
    if (error?.code === 'failed-precondition' || error?.code === 'unimplemented') {
      const snap = await getDocs(q);
      return snap.docs.reduce((acc, item) => {
        const despesa = item.data() as Partial<Despesa>;
        return acc + Number(despesa.valor || 0);
      }, 0);
    }
    throw error;
  }
};
