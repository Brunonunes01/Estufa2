// src/services/manejoService.ts
import { collection, addDoc, query, where, getDocs, Timestamp, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { RegistroManejo } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

const mapSupabaseManejoToDomain = (row: any): RegistroManejo => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  plantioId: row.plantio_id,
  estufaId: row.estufa_id || undefined,
  tipoManejo: row.tipo_manejo,
  descricao: row.descricao,
  dataRegistro: Timestamp.fromDate(new Date(row.data_registro)),
  responsavel: row.responsavel || undefined,
  severidade: row.severidade || undefined,
  temperatura: row.temperatura != null ? Number(row.temperatura) : undefined,
  umidade: row.umidade != null ? Number(row.umidade) : undefined,
  fotos: Array.isArray(row.fotos) ? row.fotos : [],
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

// 1. CRIAR REGISTRO DE MANEJO
export const createManejo = async (
  data: Partial<RegistroManejo>,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createManejo',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      if (isSupabaseBackend()) {
        const supabase = getSupabaseClient();
        const { data: inserted, error } = await supabase
          .from('manejos')
          .insert({
            tenant_id: tenantId,
            plantio_id: data.plantioId,
            estufa_id: data.estufaId || null,
            tipo_manejo: data.tipoManejo || 'outro',
            descricao: data.descricao || 'Registro de manejo',
            data_registro:
              typeof (data.dataRegistro as any)?.toDate === 'function'
                ? (data.dataRegistro as any).toDate().toISOString()
                : data.dataRegistro
                ? new Date(data.dataRegistro as any).toISOString()
                : new Date().toISOString(),
            responsavel: data.responsavel || null,
            severidade: data.severidade || null,
            temperatura: data.temperatura ?? null,
            umidade: data.umidade ?? null,
            fotos: Array.isArray(data.fotos) ? data.fotos : [],
          })
          .select('id')
          .single();
        if (error || !inserted?.id) {
          throw new Error(`Não foi possível salvar o registro de manejo. ${error?.message || ''}`.trim());
        }

        if (data.plantioId) {
          await createTraceabilityEventSafely(tenantId, {
            plantioId: String(data.plantioId),
            estufaId: (data.estufaId as string) || null,
            entidade: 'manejo',
            entidadeId: inserted.id,
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
        return inserted.id as string;
      }

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
    },
  });
};

// 2. LISTAR MANEJOS DE UM LOTE ESPECÍFICO
export const listManejosByPlantio = async (userId: string, plantioId: string): Promise<RegistroManejo[]> => {
  const tenantId = assertTenantId(userId);
  if (!plantioId) return [];

  try {
    if (isSupabaseBackend()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('manejos')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('plantio_id', plantioId)
        .order('data_registro', { ascending: false });
      if (error) throw new Error(`Não foi possível buscar os registros. ${error.message}`);
      return (data || []).map(mapSupabaseManejoToDomain);
    }

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
    if (isSupabaseBackend()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('manejos')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw new Error(`Erro ao buscar manejo por ID: ${error.message}`);
      return data ? mapSupabaseManejoToDomain(data) : null;
    }

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

    if (isSupabaseBackend()) {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('manejos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw new Error(`Erro ao eliminar manejo: ${error.message}`);
    } else {
      const docRef = doc(db, 'manejos', id);
      await deleteDoc(docRef);
    }
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
