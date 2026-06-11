import { Timestamp } from '../lib/timestamp';
import { Estufa, HydroMotor, HydroSetor } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { cancelActivePlantiosByEstufa } from './plantioService';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';

const normalizeMotores = (motores?: HydroMotor[] | null) =>
  Array.isArray(motores) ? motores : [];

const normalizeSetores = (setores?: HydroSetor[] | null) =>
  Array.isArray(setores) ? setores : [];

const validateHydroMotorBindings = (setoresInput?: HydroSetor[] | null, motoresInput?: HydroMotor[] | null) => {
  const setores = normalizeSetores(setoresInput);
  const motores = normalizeMotores(motoresInput);

  const motorIds = new Set<string>();
  const motorCodes = new Set<string>();
  motores.forEach((motor) => {
    const motorId = String(motor?.id || '').trim();
    if (!motorId) {
      throw new Error('Todo motor precisa ter um identificador válido.');
    }
    if (motorIds.has(motorId)) {
      throw new Error('Existem motores duplicados na estufa.');
    }
    motorIds.add(motorId);

    const codigo = String(motor?.codigo || '').trim().toUpperCase();
    if (codigo) {
      if (motorCodes.has(codigo)) {
        throw new Error('Código de motor duplicado na estufa.');
      }
      motorCodes.add(codigo);
    }
  });

  setores.forEach((setor) => {
    const setorNome = String(setor?.nome || '').trim() || 'Setor sem nome';
    const motorId = String((setor as any)?.motorId || '').trim();
    if (!motorId) {
      throw new Error(`O setor "${setorNome}" precisa estar vinculado a um motor.`);
    }
    if (!motorIds.has(motorId)) {
      throw new Error(`O setor "${setorNome}" está vinculado a um motor inexistente.`);
    }
  });
};

const mapSupabaseEstufaToDomain = (row: any): Estufa => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  nome: row.nome,
  tipo: row.tipo || undefined,
  productionModes: row.production_modes || undefined,
  hydroponicSystemType: row.hydroponic_system_type || undefined,
  capacidadeTotal: row.capacidade_total != null ? Number(row.capacidade_total) : undefined,
  unidadeMedida: row.unidade_medida || undefined,
  percentualOcupacao: row.percentual_ocupacao != null ? Number(row.percentual_ocupacao) : undefined,
  cidade: row.cidade || undefined,
  propriedade: row.propriedade || undefined,
  responsavel: row.responsavel || undefined,
  latitude: row.latitude || undefined,
  longitude: row.longitude || undefined,
  comprimentoM: row.comprimento_m != null ? Number(row.comprimento_m) : undefined,
  larguraM: row.largura_m != null ? Number(row.largura_m) : undefined,
  alturaM: row.altura_m != null ? Number(row.altura_m) : undefined,
  areaM2: row.area_m2 != null ? Number(row.area_m2) : undefined,
  tipoCobertura: row.tipo_cobertura || undefined,
  observacoes: row.observacoes || undefined,
  dataInicioOperacao: row.data_inicio_operacao ? Timestamp.fromDate(new Date(row.data_inicio_operacao)) : undefined,
  status: row.status || 'ativa',
  setores: Array.isArray(row.legacy_setores) ? row.legacy_setores : undefined,
  motores: Array.isArray(row.legacy_motores) ? row.legacy_motores : undefined,
  reservatorios: Array.isArray(row.legacy_reservatorios) ? row.legacy_reservatorios : undefined,
  subdivisoes: Array.isArray(row.legacy_subdivisoes) ? row.legacy_subdivisoes : undefined,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const hasOwn = <T extends object>(obj: T, key: keyof T) => Object.prototype.hasOwnProperty.call(obj, key);

const toSupabaseDate = (value: unknown) => {
  if (!value) return null;
  if (typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }
  return new Date(value as any).toISOString();
};

const buildSupabaseEstufaPayload = (data: Partial<Estufa>, tenantId: string) => ({
  tenant_id: tenantId,
  nome: data.nome,
  tipo: data.tipo ?? null,
  production_modes: data.productionModes ?? [],
  hydroponic_system_type: data.hydroponicSystemType ?? null,
  capacidade_total: data.capacidadeTotal ?? null,
  unidade_medida: data.unidadeMedida ?? null,
  percentual_ocupacao: data.percentualOcupacao ?? null,
  cidade: data.cidade ?? null,
  propriedade: data.propriedade ?? null,
  responsavel: data.responsavel ?? null,
  latitude: data.latitude ?? null,
  longitude: data.longitude ?? null,
  comprimento_m: data.comprimentoM ?? null,
  largura_m: data.larguraM ?? null,
  altura_m: data.alturaM ?? null,
  area_m2: data.areaM2 ?? null,
  tipo_cobertura: data.tipoCobertura ?? null,
  observacoes: data.observacoes ?? null,
  data_inicio_operacao: toSupabaseDate(data.dataInicioOperacao),
  status: data.status ?? 'ativa',
  legacy_setores: data.setores ?? null,
  legacy_motores: data.motores ?? null,
  legacy_reservatorios: data.reservatorios ?? null,
  legacy_subdivisoes: data.subdivisoes ?? null,
});

const buildSupabaseEstufaPatch = (data: Partial<Estufa>) => {
  const patch: Record<string, unknown> = {};

  if (hasOwn(data, 'nome')) patch.nome = data.nome;
  if (hasOwn(data, 'tipo')) patch.tipo = data.tipo ?? null;
  if (hasOwn(data, 'productionModes')) patch.production_modes = data.productionModes ?? [];
  if (hasOwn(data, 'hydroponicSystemType')) patch.hydroponic_system_type = data.hydroponicSystemType ?? null;
  if (hasOwn(data, 'capacidadeTotal')) patch.capacidade_total = data.capacidadeTotal ?? null;
  if (hasOwn(data, 'unidadeMedida')) patch.unidade_medida = data.unidadeMedida ?? null;
  if (hasOwn(data, 'percentualOcupacao')) patch.percentual_ocupacao = data.percentualOcupacao ?? null;
  if (hasOwn(data, 'cidade')) patch.cidade = data.cidade ?? null;
  if (hasOwn(data, 'propriedade')) patch.propriedade = data.propriedade ?? null;
  if (hasOwn(data, 'responsavel')) patch.responsavel = data.responsavel ?? null;
  if (hasOwn(data, 'latitude')) patch.latitude = data.latitude ?? null;
  if (hasOwn(data, 'longitude')) patch.longitude = data.longitude ?? null;
  if (hasOwn(data, 'comprimentoM')) patch.comprimento_m = data.comprimentoM ?? null;
  if (hasOwn(data, 'larguraM')) patch.largura_m = data.larguraM ?? null;
  if (hasOwn(data, 'alturaM')) patch.altura_m = data.alturaM ?? null;
  if (hasOwn(data, 'areaM2')) patch.area_m2 = data.areaM2 ?? null;
  if (hasOwn(data, 'tipoCobertura')) patch.tipo_cobertura = data.tipoCobertura ?? null;
  if (hasOwn(data, 'observacoes')) patch.observacoes = data.observacoes ?? null;
  if (hasOwn(data, 'dataInicioOperacao')) patch.data_inicio_operacao = toSupabaseDate(data.dataInicioOperacao);
  if (hasOwn(data, 'status')) patch.status = data.status ?? 'ativa';
  if (hasOwn(data, 'setores')) patch.legacy_setores = data.setores ?? null;
  if (hasOwn(data, 'motores')) patch.legacy_motores = data.motores ?? null;
  if (hasOwn(data, 'reservatorios')) patch.legacy_reservatorios = data.reservatorios ?? null;
  if (hasOwn(data, 'subdivisoes')) patch.legacy_subdivisoes = data.subdivisoes ?? null;

  return patch;
};

const createEstufaSupabase = async (data: Partial<Estufa>, tenantId: string) => {
  validateHydroMotorBindings(data.setores, data.motores);
  const supabase = getSupabaseClient();
  const { data: inserted, error } = await supabase
    .from('estufas')
    .insert(buildSupabaseEstufaPayload(data, tenantId))
    .select('id')
    .single();
  if (error || !inserted?.id) {
    throw new Error(`Erro ao salvar estufa no banco de dados. ${error?.message || ''}`.trim());
  }
  return inserted.id as string;
};

const listEstufasSupabase = async (tenantId: string): Promise<Estufa[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('estufas').select('*').eq('tenant_id', tenantId).order('nome');
  if (error) {
    throw new Error(`Erro ao buscar lista de estufas. ${error.message}`);
  }
  return (data || []).map(mapSupabaseEstufaToDomain);
};

const getEstufaByIdSupabase = async (id: string, tenantId: string): Promise<Estufa | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('estufas')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar estufa por ID: ${error.message}`);
  }
  return data ? mapSupabaseEstufaToDomain(data) : null;
};

const updateEstufaSupabase = async (id: string, data: Partial<Estufa>, tenantId: string) => {
  const estufa = await getEstufaByIdSupabase(id, tenantId);
  if (!estufa) {
    throw new Error('Estufa não encontrada.');
  }
  if (data.motores !== undefined || data.setores !== undefined) {
    const nextSetores = data.setores !== undefined ? data.setores : estufa.setores;
    const nextMotores = data.motores !== undefined ? data.motores : estufa.motores;
    validateHydroMotorBindings(nextSetores, nextMotores);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('estufas')
    .update({ ...buildSupabaseEstufaPatch(data), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao atualizar estufa. ${error.message}`);
  }
};

const deleteEstufaSupabase = async (id: string, tenantId: string) => {
  const estufa = await getEstufaByIdSupabase(id, tenantId);
  if (!estufa) {
    throw new Error('Estufa não encontrada para exclusão.');
  }
  await cancelActivePlantiosByEstufa(tenantId, id);
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('estufas').delete().eq('id', id).eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Não foi possível excluir a estufa. ${error.message}`);
  }
};

export const createEstufa = async (data: Partial<Estufa>, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createEstufa',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      try {
        return await createEstufaSupabase(data, tenantId);
      } catch (error) {
        console.error('Erro ao criar estufa:', error);
        throw new Error('Erro ao salvar estufa no banco de dados.');
      }
    },
  });
};

export const listEstufas = async (userId: string): Promise<Estufa[]> => {
  const tenantId = assertTenantId(userId);
  try {
    return await listEstufasSupabase(tenantId);
  } catch (error) {
    console.error('Erro ao listar estufas:', error);
    throw new Error('Erro ao buscar lista de estufas.');
  }
};

export const getEstufaById = async (id: string, userId: string): Promise<Estufa | null> => {
  const tenantId = assertTenantId(userId);
  try {
    return await getEstufaByIdSupabase(id, tenantId);
  } catch (error) {
    console.error('Erro ao buscar estufa por ID:', error);
    throw error;
  }
};

export const updateEstufa = async (id: string, data: Partial<Estufa>, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updateEstufa',
    payload: { id, data, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      try {
        await updateEstufaSupabase(id, data, tenantId);
      } catch (error) {
        console.error('Erro ao atualizar estufa:', error);
        throw error instanceof Error ? error : new Error('Erro ao atualizar estufa.');
      }
    },
  });
};

export const deleteEstufa = async (id: string, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteEstufa',
    payload: { id, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      try {
        await deleteEstufaSupabase(id, tenantId);
      } catch (error) {
        console.error('Erro ao eliminar estufa:', error);
        throw error instanceof Error ? error : new Error('Não foi possível excluir a estufa.');
      }
    },
  });
};

