import { Timestamp } from '../lib/timestamp';
import { RegistroManejo } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

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
    },
  });
};

export const listManejosByEstufa = async (userId: string, estufaId: string): Promise<RegistroManejo[]> => {
  const tenantId = assertTenantId(userId);
  if (!estufaId) {
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('manejos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('estufa_id', estufaId)
      .order('data_registro', { ascending: false });
    if (error) {
      throw new Error(`Não foi possível buscar os registros de manejo da estufa. ${error.message}`);
    }
    return (data || []).map(mapSupabaseManejoToDomain);
  } catch (error) {
    console.error('Erro ao listar manejos por estufa: ', error);
    throw new Error('Não foi possível buscar os registros.');
  }
};

export const listManejosByPlantio = async (userId: string, plantioId: string): Promise<RegistroManejo[]> => {
  const tenantId = assertTenantId(userId);
  if (!plantioId) {
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('manejos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('plantio_id', plantioId)
      .order('data_registro', { ascending: false });
    if (error) {
      throw new Error(`Não foi possível buscar os registros. ${error.message}`);
    }
    return (data || []).map(mapSupabaseManejoToDomain);
  } catch (error) {
    console.error('Erro ao listar manejos: ', error);
    throw new Error('Não foi possível buscar os registros.');
  }
};

export const getManejoById = async (id: string, userId: string): Promise<RegistroManejo | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('manejos')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) {
      throw new Error(`Erro ao buscar manejo por ID: ${error.message}`);
    }
    return data ? mapSupabaseManejoToDomain(data) : null;
  } catch (error) {
    console.error('Erro ao buscar manejo por ID:', error);
    throw error;
  }
};

export const deleteManejo = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const manejo = await getManejoById(id, tenantId);
    if (!manejo) {
      throw new Error('Registro de manejo não encontrado para exclusão.');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('manejos').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) {
      throw new Error(`Erro ao eliminar manejo: ${error.message}`);
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
    console.error('Erro ao eliminar manejo: ', error);
    throw error;
  }
};

