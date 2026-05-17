import { collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { syncHydroLoteStatus } from './hidroponiaLoteService';
import { HydroOcupacao } from '../types';

const listAtivasByTenantRaw = async (tenantId: string) => {
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
  const ref = doc(db, 'hidroponia_ocupacoes', ocupacao.id);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  });

  if (ocupacao.loteId) {
    await syncHydroLoteStatus(ocupacao.loteId, tenantId);
  }
};

export const encerrarHydroOcupacao = async (ocupacaoId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const ocupacao = await getHydroOcupacaoById(ocupacaoId, tenantId);
  if (!ocupacao) throw new Error('Ocupação não encontrada.');
  const ref = doc(db, 'hidroponia_ocupacoes', ocupacao.id);
  await updateDoc(ref, {
    status: 'encerrada',
    quantidadeAlocada: 0,
    dataFim: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  if (ocupacao.loteId) {
    await syncHydroLoteStatus(ocupacao.loteId, tenantId);
  }
};
