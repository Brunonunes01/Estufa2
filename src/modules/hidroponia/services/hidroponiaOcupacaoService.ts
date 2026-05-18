import { collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from '../../../compat/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { isSupabaseBackend } from '../../../services/backendConfig';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { syncHydroLoteStatus } from './hidroponiaLoteService';
import { HydroOcupacao } from '../types';

const listAtivasByTenantRaw = async (tenantId: string) => {
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hidro_ocupacoes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'ativa');
    if (error) throw new Error(`Erro ao buscar ocupações ativas. ${error.message}`);
    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.created_by || row.tenant_id,
      loteId: row.lote_id,
      estufaId: row.estufa_id,
      setorId: row.setor_id || null,
      estruturaId: row.estrutura_id,
      cultura: row.cultura,
      variedade: row.variedade || null,
      verduraId: row.verdura_id || null,
      fase: row.fase,
      quantidadeAlocada: Number(row.quantidade_alocada || 0),
      quantidadePerdida: row.quantidade_perdida != null ? Number(row.quantidade_perdida) : 0,
      dataInicio: Timestamp.fromDate(new Date(row.data_inicio)),
      dataFim: row.data_fim ? Timestamp.fromDate(new Date(row.data_fim)) : null,
      status: row.status,
      createdAt: Timestamp.fromDate(new Date(row.created_at)),
      updatedAt: Timestamp.fromDate(new Date(row.updated_at)),
    } as HydroOcupacao));
  }

  const [byTenant, byUser] = await Promise.all([
    getDocs(
      query(
        collection(db, 'hidroponia_ocupacoes'),
        where('tenantId', '==', tenantId),
        where('status', '==', 'ativa')
      )
    ),
    getDocs(
      query(
        collection(db, 'hidroponia_ocupacoes'),
        where('userId', '==', tenantId),
        where('status', '==', 'ativa')
      )
    ),
  ]);

  const map = new Map<string, HydroOcupacao>();
  [...byTenant.docs, ...byUser.docs].forEach((item) => {
    map.set(item.id, { ...(item.data() as HydroOcupacao), id: item.id });
  });
  return Array.from(map.values());
};

export const listHydroOcupacoesAtivasByTenant = async (userId: string): Promise<HydroOcupacao[]> => {
  const tenantId = assertTenantId(userId);
  return listAtivasByTenantRaw(tenantId);
};

export const getHydroOcupacaoById = async (ocupacaoId: string, userId: string): Promise<HydroOcupacao | null> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hidro_ocupacoes')
      .select('*')
      .eq('id', ocupacaoId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw new Error(`Erro ao buscar ocupação. ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      tenantId: data.tenant_id,
      userId: data.created_by || data.tenant_id,
      loteId: data.lote_id,
      estufaId: data.estufa_id,
      setorId: data.setor_id || null,
      estruturaId: data.estrutura_id,
      cultura: data.cultura,
      variedade: data.variedade || null,
      verduraId: data.verdura_id || null,
      fase: data.fase,
      quantidadeAlocada: Number(data.quantidade_alocada || 0),
      quantidadePerdida: data.quantidade_perdida != null ? Number(data.quantidade_perdida) : 0,
      dataInicio: Timestamp.fromDate(new Date(data.data_inicio)),
      dataFim: data.data_fim ? Timestamp.fromDate(new Date(data.data_fim)) : null,
      status: data.status,
      createdAt: Timestamp.fromDate(new Date(data.created_at)),
      updatedAt: Timestamp.fromDate(new Date(data.updated_at)),
    } as HydroOcupacao;
  }

  const snap = await getDoc(doc(db, 'hidroponia_ocupacoes', ocupacaoId));
  if (!snap.exists()) return null;
  const data = snap.data() as HydroOcupacao;
  if (data.tenantId !== tenantId && data.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }
  return { ...data, id: snap.id };
};

export const listHydroOcupacoesByEstufa = async (userId: string, estufaId: string): Promise<HydroOcupacao[]> => {
  const tenantId = assertTenantId(userId);
  try {
    const [byTenant, byUser] = await Promise.all([
      getDocs(
        query(
          collection(db, 'hidroponia_ocupacoes'),
          where('tenantId', '==', tenantId),
          where('estufaId', '==', estufaId),
          where('status', '==', 'ativa')
        )
      ),
      getDocs(
        query(
          collection(db, 'hidroponia_ocupacoes'),
          where('userId', '==', tenantId),
          where('estufaId', '==', estufaId),
          where('status', '==', 'ativa')
        )
      ),
    ]);
    const map = new Map<string, HydroOcupacao>();
    [...byTenant.docs, ...byUser.docs].forEach((item) => {
      map.set(item.id, { ...(item.data() as HydroOcupacao), id: item.id });
    });
    return Array.from(map.values());
  } catch {
    const ocupacoes = await listAtivasByTenantRaw(tenantId);
    return ocupacoes.filter((item) => item.estufaId === estufaId);
  }
};

export const listHydroOcupacoesByLote = async (userId: string, loteId: string): Promise<HydroOcupacao[]> => {
  const tenantId = assertTenantId(userId);
  try {
    const [byTenant, byUser] = await Promise.all([
      getDocs(
        query(
          collection(db, 'hidroponia_ocupacoes'),
          where('tenantId', '==', tenantId),
          where('loteId', '==', loteId),
          where('status', '==', 'ativa')
        )
      ),
      getDocs(
        query(
          collection(db, 'hidroponia_ocupacoes'),
          where('userId', '==', tenantId),
          where('loteId', '==', loteId),
          where('status', '==', 'ativa')
        )
      ),
    ]);
    const map = new Map<string, HydroOcupacao>();
    [...byTenant.docs, ...byUser.docs].forEach((item) => {
      map.set(item.id, { ...(item.data() as HydroOcupacao), id: item.id });
    });
    return Array.from(map.values());
  } catch {
    const ocupacoes = await listAtivasByTenantRaw(tenantId);
    return ocupacoes.filter((item) => item.loteId === loteId);
  }
};

export const updateHydroOcupacao = async (ocupacaoId: string, data: Partial<HydroOcupacao>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const ocupacao = await getHydroOcupacaoById(ocupacaoId, tenantId);
  if (!ocupacao) throw new Error('Ocupação não encontrada.');
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.status !== undefined) patch.status = data.status;
    if (data.quantidadeAlocada !== undefined) patch.quantidade_alocada = data.quantidadeAlocada;
    if (data.quantidadePerdida !== undefined) patch.quantidade_perdida = data.quantidadePerdida;
    if (data.fase !== undefined) patch.fase = data.fase;
    if (data.setorId !== undefined) patch.setor_id = data.setorId;
    if (data.estruturaId !== undefined) patch.estrutura_id = data.estruturaId;
    if (data.cultura !== undefined) patch.cultura = data.cultura;
    if (data.variedade !== undefined) patch.variedade = data.variedade;
    if (data.verduraId !== undefined) patch.verdura_id = data.verduraId;
    if (data.dataInicio !== undefined) patch.data_inicio = (data.dataInicio as any)?.toDate?.()?.toISOString?.() || null;
    if (data.dataFim !== undefined) patch.data_fim = data.dataFim ? (data.dataFim as any)?.toDate?.()?.toISOString?.() || null : null;

    const { error } = await supabase
      .from('hidro_ocupacoes')
      .update(patch)
      .eq('id', ocupacao.id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`Erro ao atualizar ocupação. ${error.message}`);
  } else {
    const ref = doc(db, 'hidroponia_ocupacoes', ocupacao.id);
    await updateDoc(ref, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  if (ocupacao.loteId) {
    await syncHydroLoteStatus(ocupacao.loteId, tenantId);
  }
};

export const encerrarHydroOcupacao = async (ocupacaoId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const ocupacao = await getHydroOcupacaoById(ocupacaoId, tenantId);
  if (!ocupacao) throw new Error('Ocupação não encontrada.');
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('hidro_ocupacoes')
      .update({
        status: 'encerrada',
        quantidade_alocada: 0,
        data_fim: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ocupacao.id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`Erro ao encerrar ocupação. ${error.message}`);
  } else {
    const ref = doc(db, 'hidroponia_ocupacoes', ocupacao.id);
    await updateDoc(ref, {
      status: 'encerrada',
      quantidadeAlocada: 0,
      dataFim: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  if (ocupacao.loteId) {
    await syncHydroLoteStatus(ocupacao.loteId, tenantId);
  }
};
