import { Timestamp } from '../lib/timestamp';
import { Plantio } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

const toTs = (value?: string | null) => (value ? Timestamp.fromDate(new Date(value)) : undefined);
const toIso = (value: any): string | null => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date ? d.toISOString() : null;
  }
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const mapPlantioRowToDomain = (row: any): Plantio => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  safraId: row.safra_id || undefined,
  estufaId: row.estufa_id || undefined,
  talhaoId: row.talhao_id || undefined,
  cultura: row.cultura,
  variedade: row.variedade || undefined,
  dataInicio: toTs(row.data_inicio),
  dataPlantio: toTs(row.data_plantio),
  dataPrevisaoColheita: toTs(row.data_previsao_colheita),
  dataEncerramento: toTs(row.data_encerramento),
  status: row.status,
  ocupacaoEstimada: row.ocupacao_estimada != null ? Number(row.ocupacao_estimada) : undefined,
  custoAcumulado: row.custo_acumulado != null ? Number(row.custo_acumulado) : undefined,
  custoTotal: row.custo_total != null ? Number(row.custo_total) : undefined,
  cicloDias: row.ciclo_dias ?? undefined,
  cicloDesbloqueadoPorAdmin: !!row.ciclo_desbloqueado_por_admin,
  desbloqueioAdminByUid: row.desbloqueio_admin_by_uid || undefined,
  desbloqueioAdminByName: row.desbloqueio_admin_by_name || undefined,
  desbloqueioAdminAt: toTs(row.desbloqueio_admin_at),
  desbloqueioAdminReason: row.desbloqueio_admin_reason || undefined,
  codigoLote: row.codigo_lote || undefined,
  origemSemente: row.origem_semente || undefined,
  quantidadePlantada: row.quantidade_plantada != null ? Number(row.quantidade_plantada) : undefined,
  quantidadeBandejas: row.quantidade_bandejas ?? undefined,
  mudasPorBandeja: row.mudas_por_bandeja ?? undefined,
  precoEstimadoUnidade: row.preco_estimado_unidade != null ? Number(row.preco_estimado_unidade) : undefined,
  unidadePrecoEstimado: row.unidade_preco_estimado || undefined,
  custoEstimadoInicial: row.custo_estimado_inicial != null ? Number(row.custo_estimado_inicial) : undefined,
  unidadeQuantidade: row.unidade_quantidade || undefined,
  observacoes: row.observacoes || undefined,
  caixaPerfis: Array.isArray(row.caixa_pesos)
    ? row.caixa_pesos
        .map((item: any) => ({
          id: String(item?.id || ''),
          nome: String(item?.nome || ''),
          pesoBruto: Number(item?.pesoBruto || item?.peso_bruto || 0),
          pesoLiquido: Number(item?.pesoLiquido || item?.peso_liquido || 0),
        }))
        .filter((item: any) => item.id && item.nome)
    : undefined,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const buildPlantioPayload = (data: Partial<Plantio>, tenantId: string) => ({
  tenant_id: tenantId,
  safra_id: data.safraId || null,
  estufa_id: data.estufaId || null,
  talhao_id: data.talhaoId || null,
  cultura: data.cultura,
  variedade: data.variedade || null,
  data_inicio: toIso(data.dataInicio),
  data_plantio: toIso(data.dataPlantio),
  data_previsao_colheita: toIso(data.dataPrevisaoColheita),
  data_encerramento: toIso(data.dataEncerramento),
  status: data.status || 'em_desenvolvimento',
  ocupacao_estimada: data.ocupacaoEstimada ?? null,
  custo_acumulado: data.custoAcumulado ?? data.custoEstimadoInicial ?? 0,
  custo_total: data.custoTotal ?? null,
  ciclo_dias: data.cicloDias ?? null,
  ciclo_desbloqueado_por_admin: !!data.cicloDesbloqueadoPorAdmin,
  desbloqueio_admin_by_uid: data.desbloqueioAdminByUid || null,
  desbloqueio_admin_by_name: data.desbloqueioAdminByName || null,
  desbloqueio_admin_at: toIso(data.desbloqueioAdminAt),
  desbloqueio_admin_reason: data.desbloqueioAdminReason || null,
  codigo_lote: data.codigoLote || null,
  origem_semente: data.origemSemente || null,
  quantidade_plantada: data.quantidadePlantada ?? null,
  quantidade_bandejas: data.quantidadeBandejas ?? null,
  mudas_por_bandeja: data.mudasPorBandeja ?? null,
  preco_estimado_unidade: data.precoEstimadoUnidade ?? null,
  unidade_preco_estimado: data.unidadePrecoEstimado || null,
  custo_estimado_inicial: data.custoEstimadoInicial ?? null,
  unidade_quantidade: data.unidadeQuantidade || null,
  observacoes: data.observacoes || null,
  caixa_pesos: data.caixaPerfis ?? [],
});

const buildPlantioPatch = (data: Partial<Plantio>) => {
  const patch: Record<string, unknown> = {};
  if (data.safraId !== undefined) patch.safra_id = data.safraId;
  if (data.estufaId !== undefined) patch.estufa_id = data.estufaId;
  if (data.talhaoId !== undefined) patch.talhao_id = data.talhaoId;
  if (data.cultura !== undefined) patch.cultura = data.cultura;
  if (data.variedade !== undefined) patch.variedade = data.variedade;
  if (data.dataInicio !== undefined) patch.data_inicio = toIso(data.dataInicio);
  if (data.dataPlantio !== undefined) patch.data_plantio = toIso(data.dataPlantio);
  if (data.dataPrevisaoColheita !== undefined) patch.data_previsao_colheita = toIso(data.dataPrevisaoColheita);
  if (data.dataEncerramento !== undefined) patch.data_encerramento = toIso(data.dataEncerramento);
  if (data.status !== undefined) patch.status = data.status;
  if (data.ocupacaoEstimada !== undefined) patch.ocupacao_estimada = data.ocupacaoEstimada;
  if (data.custoAcumulado !== undefined) patch.custo_acumulado = data.custoAcumulado;
  if (data.custoTotal !== undefined) patch.custo_total = data.custoTotal;
  if (data.cicloDias !== undefined) patch.ciclo_dias = data.cicloDias;
  if (data.cicloDesbloqueadoPorAdmin !== undefined) {
    patch.ciclo_desbloqueado_por_admin = data.cicloDesbloqueadoPorAdmin;
  }
  if (data.desbloqueioAdminByUid !== undefined) patch.desbloqueio_admin_by_uid = data.desbloqueioAdminByUid;
  if (data.desbloqueioAdminByName !== undefined) patch.desbloqueio_admin_by_name = data.desbloqueioAdminByName;
  if (data.desbloqueioAdminAt !== undefined) patch.desbloqueio_admin_at = toIso(data.desbloqueioAdminAt);
  if (data.desbloqueioAdminReason !== undefined) patch.desbloqueio_admin_reason = data.desbloqueioAdminReason;
  if (data.codigoLote !== undefined) patch.codigo_lote = data.codigoLote;
  if (data.origemSemente !== undefined) patch.origem_semente = data.origemSemente;
  if (data.quantidadePlantada !== undefined) patch.quantidade_plantada = data.quantidadePlantada;
  if (data.quantidadeBandejas !== undefined) patch.quantidade_bandejas = data.quantidadeBandejas;
  if (data.mudasPorBandeja !== undefined) patch.mudas_por_bandeja = data.mudasPorBandeja;
  if (data.precoEstimadoUnidade !== undefined) patch.preco_estimado_unidade = data.precoEstimadoUnidade;
  if (data.unidadePrecoEstimado !== undefined) patch.unidade_preco_estimado = data.unidadePrecoEstimado;
  if (data.custoEstimadoInicial !== undefined) patch.custo_estimado_inicial = data.custoEstimadoInicial;
  if (data.unidadeQuantidade !== undefined) patch.unidade_quantidade = data.unidadeQuantidade;
  if (data.observacoes !== undefined) patch.observacoes = data.observacoes;
  if (data.caixaPerfis !== undefined) patch.caixa_pesos = data.caixaPerfis;
  return patch;
};

export const createPlantio = async (data: Partial<Plantio>, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createPlantio',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      const supabase = getSupabaseClient();
      const { data: inserted, error } = await supabase
        .from('plantios')
        .insert(buildPlantioPayload(data, tenantId))
        .select('id')
        .single();
      if (error || !inserted?.id) {
        throw new Error(`Não foi possível criar plantio. ${error?.message || ''}`.trim());
      }

      const custoInicial = Number(data.custoEstimadoInicial || 0);
      if (custoInicial > 0) {
        const { error: despesaError } = await supabase.from('despesas').insert({
          tenant_id: tenantId,
          descricao: `Custo inicial: ${data.cultura || 'Plantio'} (${data.quantidadePlantada || 0} ${data.unidadeQuantidade || ''})`,
          categoria: 'outro',
          valor: custoInicial,
          data_despesa: new Date().toISOString(),
          status_pagamento: 'pago',
          plantio_id: inserted.id,
          estufa_id: data.estufaId || null,
          tipo_gasto: 'investimento_inicial',
        });
        if (despesaError) {
          throw new Error(`Plantio criado, mas nao foi possivel registrar o gasto inicial. ${despesaError.message}`);
        }
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: inserted.id,
        estufaId: data.estufaId || null,
        entidade: 'plantio',
        entidadeId: inserted.id,
        acao: 'criado',
        descricao: `Plantio criado (${data.cultura || 'cultura não informada'}).`,
        actorUid: tenantId,
        metadata: {
          cultura: data.cultura || null,
          status: data.status || null,
          codigoLote: data.codigoLote || null,
          variedade: data.variedade || null,
          custoEstimadoInicial: custoInicial,
          backend: 'supabase',
        },
      });

      return inserted.id as string;
    },
  });
};

export const listPlantiosByEstufa = async (userId: string, estufaId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  if (!estufaId) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('plantios').select('*').eq('tenant_id', tenantId).eq('estufa_id', estufaId);
  if (error) {
    throw new Error(`Erro ao listar plantios por estufa. ${error.message}`);
  }
  return (data || []).map(mapPlantioRowToDomain);
};

export const getPlantioById = async (plantioId: string, userId: string): Promise<Plantio | null> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('plantios')
    .select('*')
    .eq('id', plantioId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar plantio. ${error.message}`);
  }
  return data ? mapPlantioRowToDomain(data) : null;
};

export const updatePlantioStatus = async (
  plantioId: string,
  status: Plantio['status'],
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updatePlantioStatus',
    payload: { id: plantioId, status, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('plantios')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', plantioId)
        .eq('tenant_id', tenantId);
      if (error) {
        throw new Error(`Erro ao atualizar status do plantio. ${error.message}`);
      }
    },
  });
};

export const unlockPlantioCycleForEarlySale = async (
  plantioId: string,
  userId: string,
  audit: {
    byUid: string;
    byName?: string | null;
    reason?: string | null;
  }
) => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const nowIso = new Date().toISOString();
  const payload: Partial<Plantio> = {
    cicloDesbloqueadoPorAdmin: true,
    desbloqueioAdminByUid: audit.byUid,
    desbloqueioAdminByName: audit.byName || null,
    desbloqueioAdminReason: audit.reason || null,
  };
  const { error } = await supabase
    .from('plantios')
    .update({
      ciclo_desbloqueado_por_admin: true,
      desbloqueio_admin_by_uid: audit.byUid,
      desbloqueio_admin_by_name: audit.byName || null,
      desbloqueio_admin_at: nowIso,
      desbloqueio_admin_reason: audit.reason || null,
      updated_at: nowIso,
    })
    .eq('id', plantioId)
    .eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao desbloquear ciclo do plantio. ${error.message}`);
  }
  return payload;
};

export const updatePlantio = async (id: string, data: Partial<Plantio>, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updatePlantio',
    payload: { id, data, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const plantio = await getPlantioById(id, tenantId);
      if (!plantio) {
        throw new Error('Plantio não encontrado.');
      }

      const supabase = getSupabaseClient();
      const patch = buildPlantioPatch(data);
      const { error } = await supabase
        .from('plantios')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) {
        throw new Error(`Erro ao atualizar plantio. ${error.message}`);
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: id,
        estufaId: (data.estufaId || plantio.estufaId || null) as string | null,
        entidade: 'plantio',
        entidadeId: id,
        acao: 'atualizado',
        descricao: 'Dados do plantio atualizados.',
        actorUid: tenantId,
        metadata: {
          changedFields: Object.keys(data || {}),
          before: {
            cultura: plantio.cultura || null,
            variedade: plantio.variedade || null,
            status: plantio.status || null,
            codigoLote: plantio.codigoLote || null,
          },
          after: {
            cultura: data.cultura ?? plantio.cultura ?? null,
            variedade: data.variedade ?? plantio.variedade ?? null,
            status: data.status ?? plantio.status ?? null,
            codigoLote: data.codigoLote ?? plantio.codigoLote ?? null,
          },
          backend: 'supabase',
        },
      });
    },
  });
};

export const deletePlantio = async (id: string, userId: string) => {
  return deletePlantioSafely(id, userId);
};

export const deletePlantioSafely = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const [vendasRes, colheitasRes, aplicacoesRes, despesasRes] = await Promise.all([
    supabase.from('vendas').select('id').eq('tenant_id', tenantId).eq('plantio_id', id),
    supabase.from('colheitas').select('id').eq('tenant_id', tenantId).eq('plantio_id', id),
    supabase.from('aplicacoes').select('id').eq('tenant_id', tenantId).eq('plantio_id', id),
    supabase.from('despesas').select('id,tipo_gasto').eq('tenant_id', tenantId).eq('plantio_id', id),
  ]);
  if (vendasRes.error || colheitasRes.error || aplicacoesRes.error || despesasRes.error) {
    throw new Error('Não foi possível validar vínculos do plantio para exclusão.');
  }

  const hasSales = (vendasRes.data || []).length > 0 || (colheitasRes.data || []).length > 0;
  const hasApplications = (aplicacoesRes.data || []).length > 0;
  const nonInitialExpenses = (despesasRes.data || []).filter((d: any) => d.tipo_gasto !== 'investimento_inicial');

  if (hasSales || hasApplications || nonInitialExpenses.length > 0) {
    throw new Error(
      'Exclusão bloqueada: este ciclo possui movimentações (vendas, aplicações ou despesas operacionais). Use cancelamento para manter histórico.'
    );
  }

  const { error: delExpError } = await supabase.from('despesas').delete().eq('tenant_id', tenantId).eq('plantio_id', id);
  if (delExpError) {
    throw new Error(`Erro ao remover despesas de investimento. ${delExpError.message}`);
  }

  const { error: delPlantioError } = await supabase.from('plantios').delete().eq('id', id).eq('tenant_id', tenantId);
  if (delPlantioError) {
    throw new Error(`Erro ao excluir plantio. ${delPlantioError.message}`);
  }
};

export const listAllPlantios = async (userId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('plantios').select('*').eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Erro ao listar plantios. ${error.message}`);
  }
  return (data || []).map(mapPlantioRowToDomain);
};

export const listActivePlantiosByUser = async (userId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  const activeStatuses = ['em_desenvolvimento', 'em_colheita', 'em_crescimento', 'colheita_iniciada'];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('plantios').select('*').eq('tenant_id', tenantId).in('status', activeStatuses);
  if (error) {
    throw new Error(`Erro ao listar plantios ativos. ${error.message}`);
  }
  return (data || []).map(mapPlantioRowToDomain);
};

export const cancelActivePlantiosByEstufa = async (userId: string, estufaId: string) => {
  const tenantId = assertTenantId(userId);
  if (!estufaId) return;

  const activeStatuses: Plantio['status'][] = [
    'em_desenvolvimento',
    'em_colheita',
    'em_crescimento',
    'colheita_iniciada',
  ];

  const supabase = getSupabaseClient();
  const { data, error: queryError } = await supabase
    .from('plantios')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estufa_id', estufaId)
    .in('status', activeStatuses as string[]);
  if (queryError) {
    throw new Error(`Erro ao listar plantios ativos da estufa. ${queryError.message}`);
  }
  if (!data?.length) return;

  const { error } = await supabase
    .from('plantios')
    .update({
      status: 'cancelado',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('estufa_id', estufaId)
    .in('status', activeStatuses as string[]);
  if (error) {
    throw new Error(`Erro ao cancelar plantios ativos da estufa. ${error.message}`);
  }

  await Promise.all(
    data.map((item) =>
      createTraceabilityEventSafely(tenantId, {
        plantioId: item.id,
        estufaId: estufaId || null,
        entidade: 'plantio',
        entidadeId: item.id,
        acao: 'cancelado',
        descricao: 'Plantio cancelado por desativação/manutenção da estufa.',
        actorUid: tenantId,
        metadata: {
          previousStatus: item.status || null,
          newStatus: 'cancelado',
          cultura: item.cultura || null,
          codigoLote: item.codigo_lote || null,
          backend: 'supabase',
        },
      })
    )
  );
};

