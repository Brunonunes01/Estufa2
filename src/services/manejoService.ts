// src/services/manejoService.ts
import { collection, addDoc, query, where, getDocs, Timestamp, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { RegistroManejo } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

// 1. CRIAR REGISTRO DE MANEJO
export const createManejo = async (data: Partial<RegistroManejo>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const novoManejo = {
    ...data,
    userId: tenantId,
    tenantId,
    createdBy: tenantId,
    fotos: Array.isArray(data.fotos) ? data.fotos : [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'manejos'), novoManejo);
    if (data.plantioId) {
      await createTraceabilityEventSafely(tenantId, {
        plantioId: String(data.plantioId),
        estufaId: (data.estufaId as string) || null,
        entidade: 'manejo',
        entidadeId: docRef.id,
        acao: 'criado',
        descricao: 'Registro de manejo adicionado ao ciclo.',
        actorUid: tenantId,
        metadata: {
          tipoManejo: data.tipoManejo || null,
          severidade: data.severidade || null,
          responsavel: data.responsavel || null,
          dataRegistro: data.dataRegistro || null,
          fotosCount: Array.isArray(data.fotos) ? data.fotos.length : 0,
        },
      });
    }
    return docRef.id;
  } catch (error) {
    console.error("Erro ao registrar manejo: ", error);
    throw new Error('Não foi possível salvar o registro de manejo.');
  }
};

// 2. LISTAR MANEJOS DE UM LOTE ESPECÍFICO
export const listManejosByPlantio = async (userId: string, plantioId: string): Promise<RegistroManejo[]> => {
  const tenantId = assertTenantId(userId);
  if (!plantioId) return [];

  try {
    const [byTenantId, byUserId] = await Promise.all([
      getDocs(query(collection(db, 'manejos'), where("tenantId", "==", tenantId), where("plantioId", "==", plantioId))),
      getDocs(query(collection(db, 'manejos'), where("userId", "==", tenantId), where("plantioId", "==", plantioId))),
    ]);

    const map = new Map<string, RegistroManejo>();
    [...byTenantId.docs, ...byUserId.docs].forEach((item) => {
      map.set(item.id, { ...item.data(), id: item.id } as RegistroManejo);
    });
    
    return Array.from(map.values()).sort((a, b) => b.dataRegistro.toMillis() - a.dataRegistro.toMillis());

  } catch (error) {
    console.error("Erro ao listar manejos: ", error);
    throw new Error('Não foi possível buscar os registros.');
  }
};

export const getManejoById = async (id: string, userId: string): Promise<RegistroManejo | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'manejos', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as RegistroManejo;
      if (data.tenantId !== tenantId && data.userId !== tenantId) {
        throw new Error("Acesso negado: este registro de manejo não pertence ao seu tenant.");
      }
      return { ...data , id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar manejo por ID:", error);
    throw error;
  }
};

// 3. ELIMINAR REGISTRO
export const deleteManejo = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const manejo = await getManejoById(id, tenantId);
    if (!manejo) throw new Error("Registro de manejo não encontrado para exclusão.");

    const docRef = doc(db, 'manejos', id);
    await deleteDoc(docRef);
    if (manejo.plantioId) {
      await createTraceabilityEventSafely(tenantId, {
        plantioId: manejo.plantioId,
        estufaId: manejo.estufaId || null,
        entidade: 'manejo',
        entidadeId: id,
        acao: 'excluido',
        descricao: 'Registro de manejo excluído.',
        actorUid: tenantId,
        metadata: {
          tipoManejo: manejo.tipoManejo || null,
          severidade: manejo.severidade || null,
          responsavel: manejo.responsavel || null,
          dataRegistro: manejo.dataRegistro || null,
          fotosCount: Array.isArray(manejo.fotos) ? manejo.fotos.length : 0,
        },
      });
    }
  } catch (error) {
    console.error("Erro ao eliminar manejo: ", error);
    throw error;
  }
};
