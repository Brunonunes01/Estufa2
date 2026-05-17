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

  await updateDoc(doc(db, 'hidroponia_verduras', verduraId), {
    ativo,
    updatedAt: Timestamp.now(),
  });
};
