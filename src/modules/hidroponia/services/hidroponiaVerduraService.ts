import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { isSupabaseBackend } from '../../../services/backendConfig';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { HydroVerdura, HydroVerduraFormData } from '../types';

const toNullableText = (value: unknown) => {
  const text = String(value || '').trim();
  return text || null;
};

const toNullableNumber = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

const normalizeVerdura = (raw: HydroVerdura, id: string): HydroVerdura => ({
  ...raw,
  id,
  nomeComum: String((raw as any).nomeComum || '').trim(),
  nomeCientifico: toNullableText((raw as any).nomeCientifico),
  variedadePadrao: toNullableText((raw as any).variedadePadrao),
  cicloDias: toNullableNumber((raw as any).cicloDias),
  espacamentoCm: toNullableNumber((raw as any).espacamentoCm),
  phMin: toNullableNumber((raw as any).phMin),
  phMax: toNullableNumber((raw as any).phMax),
  ecMin: toNullableNumber((raw as any).ecMin),
  ecMax: toNullableNumber((raw as any).ecMax),
  temperaturaMinC: toNullableNumber((raw as any).temperaturaMinC),
  temperaturaMaxC: toNullableNumber((raw as any).temperaturaMaxC),
  observacoes: toNullableText((raw as any).observacoes),
  ativo: (raw as any).ativo !== false,
});

const mapSupabaseVerduraToDomain = (row: any): HydroVerdura =>
  normalizeVerdura(
    {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.created_by || row.tenant_id,
      nomeComum: row.nome_comum,
      nomeCientifico: row.nome_cientifico || null,
      variedadePadrao: row.variedade_padrao || null,
      cicloDias: row.ciclo_dias != null ? Number(row.ciclo_dias) : null,
      phMin: row.ph_min != null ? Number(row.ph_min) : null,
      phMax: row.ph_max != null ? Number(row.ph_max) : null,
      ecMin: row.ec_min != null ? Number(row.ec_min) : null,
      ecMax: row.ec_max != null ? Number(row.ec_max) : null,
      temperaturaMinC: row.temperatura_min_c != null ? Number(row.temperatura_min_c) : null,
      temperaturaMaxC: row.temperatura_max_c != null ? Number(row.temperatura_max_c) : null,
      observacoes: row.observacoes || null,
      ativo: row.ativo !== false,
      createdAt: Timestamp.fromDate(new Date(row.created_at)),
      updatedAt: Timestamp.fromDate(new Date(row.updated_at)),
    } as HydroVerdura,
    row.id
  );

const buildPayload = (data: HydroVerduraFormData) => {
  const nomeComum = String(data.nomeComum || '').trim();
  if (!nomeComum) throw new Error('Informe o nome da verdura.');

  const phMin = toNullableNumber(data.phMin);
  const phMax = toNullableNumber(data.phMax);
  if (phMin !== null && phMax !== null && phMin > phMax) {
    throw new Error('Faixa de pH inválida. O mínimo não pode ser maior que o máximo.');
  }

  const ecMin = toNullableNumber(data.ecMin);
  const ecMax = toNullableNumber(data.ecMax);
  if (ecMin !== null && ecMax !== null && ecMin > ecMax) {
    throw new Error('Faixa de EC inválida. O mínimo não pode ser maior que o máximo.');
  }

  const temperaturaMinC = toNullableNumber(data.temperaturaMinC);
  const temperaturaMaxC = toNullableNumber(data.temperaturaMaxC);
  if (temperaturaMinC !== null && temperaturaMaxC !== null && temperaturaMinC > temperaturaMaxC) {
    throw new Error('Faixa de temperatura inválida. O mínimo não pode ser maior que o máximo.');
  }

  return {
    nomeComum,
    nomeCientifico: toNullableText(data.nomeCientifico),
    variedadePadrao: toNullableText(data.variedadePadrao),
    cicloDias: toNullableNumber(data.cicloDias),
    espacamentoCm: toNullableNumber(data.espacamentoCm),
    phMin,
    phMax,
    ecMin,
    ecMax,
    temperaturaMinC,
    temperaturaMaxC,
    observacoes: toNullableText(data.observacoes),
    ativo: data.ativo !== false,
  };
};

export const createHydroVerdura = async (data: HydroVerduraFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const payload = buildPayload(data);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('hidro_verduras')
      .insert({
        tenant_id: tenantId,
        nome_comum: payload.nomeComum,
        nome_cientifico: payload.nomeCientifico,
        variedade_padrao: payload.variedadePadrao,
        ciclo_dias: payload.cicloDias,
        ph_min: payload.phMin,
        ph_max: payload.phMax,
        ec_min: payload.ecMin,
        ec_max: payload.ecMax,
        temperatura_min_c: payload.temperaturaMinC,
        temperatura_max_c: payload.temperaturaMaxC,
        observacoes: payload.observacoes,
        ativo: payload.ativo,
      })
      .select('id')
      .single();
    if (error || !inserted?.id) throw new Error(`Erro ao cadastrar verdura. ${error?.message || ''}`.trim());
    return inserted.id as string;
  }

  const now = Timestamp.now();
  const ref = await addDoc(collection(db, 'hidroponia_verduras'), {
    ...payload,
    tenantId,
    userId: tenantId,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
};

export const getHydroVerduraById = async (
  verduraId: string,
  userId: string
): Promise<HydroVerdura | null> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hidro_verduras')
      .select('*')
      .eq('id', verduraId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw new Error(`Erro ao buscar verdura. ${error.message}`);
    return data ? mapSupabaseVerduraToDomain(data) : null;
  }

  const snap = await getDoc(doc(db, 'hidroponia_verduras', verduraId));
  if (!snap.exists()) return null;
  const data = snap.data() as HydroVerdura;
  if (data.tenantId !== tenantId && data.userId !== tenantId) {
    throw new Error('Acesso negado ao cadastro de verduras.');
  }
  return normalizeVerdura(data, snap.id);
};

export const listHydroVerduras = async (
  userId: string,
  includeInactive = false
): Promise<HydroVerdura[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    let request = supabase
      .from('hidro_verduras')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nome_comum', { ascending: true });
    if (!includeInactive) {
      request = request.eq('ativo', true);
    }
    const { data, error } = await request;
    if (error) throw new Error(`Erro ao listar verduras. ${error.message}`);
    return (data || [])
      .map(mapSupabaseVerduraToDomain)
      .sort((a, b) => {
        const nameCmp = a.nomeComum.localeCompare(b.nomeComum, 'pt-BR');
        if (nameCmp !== 0) return nameCmp;
        return String(a.variedadePadrao || '').localeCompare(String(b.variedadePadrao || ''), 'pt-BR');
      });
  }

  const [byTenant, byUser] = await Promise.all([
    getDocs(query(collection(db, 'hidroponia_verduras'), where('tenantId', '==', tenantId))),
    getDocs(query(collection(db, 'hidroponia_verduras'), where('userId', '==', tenantId))),
  ]);

  const map = new Map<string, HydroVerdura>();
  [...byTenant.docs, ...byUser.docs].forEach((item) => {
    map.set(item.id, normalizeVerdura(item.data() as HydroVerdura, item.id));
  });

  return Array.from(map.values())
    .filter((item) => (includeInactive ? true : item.ativo !== false))
    .sort((a, b) => {
      const nameCmp = a.nomeComum.localeCompare(b.nomeComum, 'pt-BR');
      if (nameCmp !== 0) return nameCmp;
      return String(a.variedadePadrao || '').localeCompare(String(b.variedadePadrao || ''), 'pt-BR');
    });
};

export const updateHydroVerdura = async (
  verduraId: string,
  data: HydroVerduraFormData,
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const verdura = await getHydroVerduraById(verduraId, tenantId);
  if (!verdura) throw new Error('Verdura não encontrada.');

  const payload = buildPayload(data);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('hidro_verduras')
      .update({
        nome_comum: payload.nomeComum,
        nome_cientifico: payload.nomeCientifico,
        variedade_padrao: payload.variedadePadrao,
        ciclo_dias: payload.cicloDias,
        ph_min: payload.phMin,
        ph_max: payload.phMax,
        ec_min: payload.ecMin,
        ec_max: payload.ecMax,
        temperatura_min_c: payload.temperaturaMinC,
        temperatura_max_c: payload.temperaturaMaxC,
        observacoes: payload.observacoes,
        ativo: payload.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verduraId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`Erro ao atualizar verdura. ${error.message}`);
    return;
  }

  await updateDoc(doc(db, 'hidroponia_verduras', verduraId), {
    ...payload,
    updatedAt: Timestamp.now(),
  });
};

export const setHydroVerduraActive = async (
  verduraId: string,
  ativo: boolean,
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const verdura = await getHydroVerduraById(verduraId, tenantId);
  if (!verdura) throw new Error('Verdura não encontrada.');

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('hidro_verduras')
      .update({
        ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verduraId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`Erro ao atualizar status da verdura. ${error.message}`);
    return;
  }

  await updateDoc(doc(db, 'hidroponia_verduras', verduraId), {
    ativo,
    updatedAt: Timestamp.now(),
  });
};
