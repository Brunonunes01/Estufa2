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
  runTransaction,
} from '../compat/legacyDataApi';
import { db } from './removedBackend';
import { Insumo } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

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

const createInsumoLegacy = async (data: InsumoFormData, tenantId: string) => {
  const now = Timestamp.now();
  const novoInsumo = {
    ...data,
    tenantId,
    userId: tenantId,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, 'insumos'), novoInsumo);
  return docRef.id;
};

const createInsumoSupabase = async (data: InsumoFormData, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = buildSupabaseInsumoPayload(data, tenantId);
  const { data: inserted, error } = await supabase.from('insumos').insert(payload).select('id').single();
  if (error || !inserted?.id) throw new Error(`Não foi possível criar insumo. ${error?.message || ''}`.trim());
  return inserted.id as string;
};

const updateInsumoLegacy = async (insumoId: string, data: Partial<InsumoFormData>, tenantId: string) => {
  const insumo = await getInsumoById(insumoId, tenantId);
  if (!insumo) throw new Error('Insumo não encontrado.');
  await updateDoc(doc(db, 'insumos', insumoId), { ...data, updatedAt: Timestamp.now() });
};

const updateInsumoSupabase = async (insumoId: string, data: Partial<InsumoFormData>, tenantId: string) => {
  const supabase = getSupabaseClient();
  const payload = {
    ...buildSupabaseInsumoPayload(data, tenantId),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('insumos').update(payload).eq('id', insumoId).eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao atualizar insumo. ${error.message}`);
};

const listInsumosLegacy = async (tenantId: string): Promise<Insumo[]> => {
  const q = query(collection(db, 'insumos'), where('tenantId', '==', tenantId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Insumo));
};

const listInsumosSupabase = async (tenantId: string): Promise<Insumo[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('insumos').select('*').eq('tenant_id', tenantId).order('nome');
  if (error) throw new Error(`Não foi possível listar insumos. ${error.message}`);
  return (data || []).map(mapSupabaseInsumoToDomain);
};

const getInsumoByIdLegacy = async (insumoId: string, tenantId: string): Promise<Insumo | null> => {
  const docRef = doc(db, 'insumos', insumoId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as Insumo;
    if (data.tenantId !== tenantId && data.userId !== tenantId) {
      throw new Error('Acesso negado.');
    }
    return { ...data, id: docSnap.id };
  }
  return null;
};

const getInsumoByIdSupabase = async (insumoId: string, tenantId: string): Promise<Insumo | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('id', insumoId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar insumo. ${error.message}`);
  return data ? mapSupabaseInsumoToDomain(data) : null;
};

const deleteInsumoLegacy = async (insumoId: string, tenantId: string) => {
  const insumo = await getInsumoById(insumoId, tenantId);
  if (!insumo) throw new Error('Insumo não encontrado.');
  await deleteDoc(doc(db, 'insumos', insumoId));
};

const deleteInsumoSupabase = async (insumoId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('insumos').delete().eq('id', insumoId).eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao excluir insumo. ${error.message}`);
};

export const createInsumo = async (data: InsumoFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createInsumo',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      if (isSupabaseBackend()) return createInsumoSupabase(data, tenantId);
      return createInsumoLegacy(data, tenantId);
    },
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
      if (isSupabaseBackend()) {
        await updateInsumoSupabase(insumoId, data, tenantId);
        return;
      }
      await updateInsumoLegacy(insumoId, data, tenantId);
    },
  });
};

export const listInsumos = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) return listInsumosSupabase(tenantId);
  return listInsumosLegacy(tenantId);
};

export const listInsumosEmAlerta = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  const insumos = await listInsumos(tenantId);
  return insumos.filter((item) => item.estoqueMinimo && item.estoqueAtual <= item.estoqueMinimo);
};

export const getInsumoById = async (insumoId: string, userId: string): Promise<Insumo | null> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) return getInsumoByIdSupabase(insumoId, tenantId);
  return getInsumoByIdLegacy(insumoId, tenantId);
};

export const deleteInsumo = async (insumoId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) return deleteInsumoSupabase(insumoId, tenantId);
  return deleteInsumoLegacy(insumoId, tenantId);
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
      if (isSupabaseBackend()) {
        const supabase = getSupabaseClient();
        const current = await getInsumoByIdSupabase(insumoId, tenantId);
        if (!current) throw new Error('Insumo não encontrado.');

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
        if (updateError) throw new Error(`Erro ao atualizar estoque do insumo. ${updateError.message}`);

        const { error: entryError } = await supabase.from('insumo_entradas').insert({
          tenant_id: tenantId,
          insumo_id: insumoId,
          fornecedor_id: entryData.fornecedorId || null,
          quantidade_comprada: quantidadeComprada,
          custo_unitario_compra: custoUnitarioCompra,
          observacoes: entryData.observacoes || null,
          data_entrada: new Date().toISOString(),
        });
        if (entryError) throw new Error(`Erro ao registrar entrada de insumo. ${entryError.message}`);
        return;
      }

      return runTransaction(db, async (transaction) => {
        const insumoRef = doc(db, 'insumos', insumoId);
        const insumoSnap = await transaction.get(insumoRef);

        if (!insumoSnap.exists()) throw new Error('Insumo não encontrado.');
        const insumo = insumoSnap.data() as Insumo;
        if (insumo.tenantId !== tenantId && insumo.userId !== tenantId) {
          throw new Error('Acesso negado ao insumo selecionado.');
        }

        const estoqueAntigo = Number(insumo.estoqueAtual || 0);
        const custoAntigo = Number(insumo.custoUnitario || 0);

        const novoEstoque = estoqueAntigo + quantidadeComprada;
        let novoCusto = custoAntigo;
        if (novoEstoque > 0) {
          const valorEstoqueAntigo = estoqueAntigo * custoAntigo;
          const valorNovaCompra = quantidadeComprada * custoUnitarioCompra;
          novoCusto = (valorEstoqueAntigo + valorNovaCompra) / novoEstoque;
        }

        transaction.update(insumoRef, {
          estoqueAtual: novoEstoque,
          custoUnitario: novoCusto,
          updatedAt: Timestamp.now(),
        });

        const entradaRef = doc(collection(db, 'insumo_entradas'));
        transaction.set(entradaRef, {
          insumoId,
          nomeInsumo: insumo.nome,
          tenantId,
          userId: tenantId,
          ...entryData,
          quantidadeComprada,
          custoUnitarioCompra,
          dataEntrada: Timestamp.now(),
        });
      });
    },
  });
};
