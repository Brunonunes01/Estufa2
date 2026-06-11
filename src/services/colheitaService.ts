import { Timestamp } from '../lib/timestamp';
import { Colheita, Plantio, Venda } from '../types/domain';
import { getPlantioById } from './plantioService';
import {
  createVenda,
  deleteVenda,
  getTotalContasAReceber as getTotalContasAReceberVendas,
  updateVenda,
  VendaFormData,
  listContasAReceber as listContasAReceberVendas,
  receberVenda,
} from './vendaService';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';

export type ColheitaFormData = {
  quantidade: number;
  unidade: string;
  precoUnitario: number | null;
  destino: Colheita['destino'];
  clienteId: string | null;
  metodoPagamento: string | null;
  pagamentoPara?: string | null;
  registradoPor: string | null;
  observacoes: string | null;
  dataVenda?: Date;
  pesoBruto?: number;
  pesoLiquido?: number;
  isFinalHarvest?: boolean;
};

type ColheitaSaveOptions = {
  allowBeforeCycleDays?: boolean;
  overrideAudit?: {
    byUid: string;
    byName?: string | null;
    reason?: string | null;
  } | null;
};

const normalizeUnidadeMedida = (unidade: string): Colheita['unidadeMedida'] => {
  const u = String(unidade || '').toLowerCase();
  if (u === 'kg') return 'kg';
  if (u === 'caixa' || u === 'caixas') return 'caixas';
  if (u === 'maço' || u === 'maços') return 'maços';
  if (u === 'unidade' || u === 'un') return 'un';
  return 'un';
};

const toIsoFromTsOrDate = (value?: any) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const mapSupabaseColheitaToDomain = (row: any): Colheita => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  plantioId: row.plantio_id,
  estufaId: row.estufa_id || undefined,
  safraId: row.safra_id || undefined,
  dataColheita: Timestamp.fromDate(new Date(row.data_colheita)),
  quantidade: Number(row.quantidade || 0),
  unidadeMedida: row.unidade_medida || undefined,
  unidade: row.unidade || undefined,
  qualidade: row.qualidade || undefined,
  loteColheita: row.lote_colheita || undefined,
  destino: row.destino,
  observacoes: row.observacoes || undefined,
  pesoBruto: row.peso_bruto != null ? Number(row.peso_bruto) : undefined,
  pesoLiquido: row.peso_liquido != null ? Number(row.peso_liquido) : undefined,
  precoUnitario: row.preco_unitario != null ? Number(row.preco_unitario) : undefined,
  clienteId: row.cliente_id || null,
  metodoPagamento: row.metodo_pagamento || null,
  statusPagamento: row.status_pagamento || undefined,
  dataPagamento: row.data_pagamento ? Timestamp.fromDate(new Date(row.data_pagamento)) : null,
  cicloDesbloqueadoPorAdmin: !!row.ciclo_desbloqueado_por_admin,
  desbloqueioAdminByUid: row.desbloqueio_admin_by_uid || null,
  desbloqueioAdminByName: row.desbloqueio_admin_by_name || null,
  desbloqueioAdminAt: row.desbloqueio_admin_at ? Timestamp.fromDate(new Date(row.desbloqueio_admin_at)) : null,
  desbloqueioAdminReason: row.desbloqueio_admin_reason || null,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
} as Colheita);

const findVendaByColheitaId = async (tenantId: string, colheitaId: string): Promise<Venda | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('tenant_id', tenantId)
    .eq('colheita_id', colheitaId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar venda da colheita. ${error.message}`);
  }
  if (!data) return null;
  const item = Array.isArray(data.venda_itens) ? data.venda_itens[0] : null;
  return {
    id: data.id,
    tenantId: data.tenant_id,
    userId: data.created_by || data.tenant_id,
    createdBy: data.created_by || data.tenant_id,
    plantioId: data.plantio_id || undefined,
    originType: data.origin_type || undefined,
    originId: data.origin_id || null,
    hydroLoteId: data.hydro_lote_id || null,
    estufaId: data.estufa_id || undefined,
    colheitaId: data.colheita_id || undefined,
    clienteId: data.cliente_id || null,
    dataVenda: Timestamp.fromDate(new Date(data.data_venda)),
    dataVencimento: data.data_vencimento ? Timestamp.fromDate(new Date(data.data_vencimento)) : null,
    itens: Array.isArray(data.venda_itens)
      ? data.venda_itens.map((vi: any) => ({
          colheitaId: vi.colheita_id || undefined,
          descricao: vi.descricao,
          quantidade: Number(vi.quantidade || 0),
          unidade: vi.unidade || undefined,
          valorUnitario: Number(vi.valor_unitario || 0),
        }))
      : [],
    valorTotal: Number(data.valor_total || 0),
    statusPagamento: data.status_pagamento,
    formaPagamento: data.forma_pagamento || undefined,
    metodoPagamento: data.metodo_pagamento || null,
    pagamentoPara: data.pagamento_para || null,
    observacoes: data.observacoes || undefined,
    quantidade: data.quantidade != null ? Number(data.quantidade) : Number(item?.quantidade || 0),
    unidade: item?.unidade || undefined,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
  } as Venda;
};

const getPlantioDate = (plantio: Plantio): Date | null => {
  const value = plantio.dataPlantio || plantio.dataInicio;
  if (!value) return null;
  if (typeof (value as any).toDate === 'function') return (value as any).toDate();
  return null;
};

const validateSaleDateByCycle = (plantio: Plantio, dataOperacao: Timestamp) => {
  const cicloDias = Number(plantio.cicloDias || 0);
  if (!cicloDias || cicloDias <= 0) return;

  const plantioDate = getPlantioDate(plantio);
  if (!plantioDate) return;

  const minSaleDate = new Date(plantioDate);
  minSaleDate.setDate(minSaleDate.getDate() + cicloDias);
  const minSaleTs = Timestamp.fromDate(minSaleDate);

  if (dataOperacao.toMillis() < minSaleTs.toMillis()) {
    throw new Error(
      `Venda bloqueada: este ciclo exige no mínimo ${cicloDias} dia(s) após o plantio. Data mínima: ${minSaleDate.toLocaleDateString('pt-BR')}.`
    );
  }
};

const isSaleBeforeMinimumCycleDate = (plantio: Plantio, dataOperacao: Timestamp) => {
  const cicloDias = Number(plantio.cicloDias || 0);
  if (!cicloDias || cicloDias <= 0) return false;

  const plantioDate = getPlantioDate(plantio);
  if (!plantioDate) return false;

  const minSaleDate = new Date(plantioDate);
  minSaleDate.setDate(minSaleDate.getDate() + cicloDias);
  const minSaleTs = Timestamp.fromDate(minSaleDate);

  return dataOperacao.toMillis() < minSaleTs.toMillis();
};

const buildOverrideAudit = (options: ColheitaSaveOptions, now: Timestamp) => {
  if (!options.allowBeforeCycleDays || !options.overrideAudit) return null;
  return {
    cicloDesbloqueadoPorAdmin: true,
    desbloqueioAdminByUid: options.overrideAudit.byUid,
    desbloqueioAdminByName: options.overrideAudit.byName || null,
    desbloqueioAdminAt: now,
    desbloqueioAdminReason: options.overrideAudit.reason || null,
  };
};

const buildPlantioUnlockAudit = (plantio: Plantio) => {
  if (!plantio.cicloDesbloqueadoPorAdmin) return null;
  return {
    cicloDesbloqueadoPorAdmin: true,
    desbloqueioAdminByUid: plantio.desbloqueioAdminByUid || null,
    desbloqueioAdminByName: plantio.desbloqueioAdminByName || null,
    desbloqueioAdminAt: plantio.desbloqueioAdminAt || null,
    desbloqueioAdminReason: plantio.desbloqueioAdminReason || null,
  };
};

export const createColheita = async (
  data: ColheitaFormData,
  userId: string,
  plantioId: string,
  estufaId: string,
  options: ColheitaSaveOptions = {},
  writeOptions?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createColheita',
    payload: { data, userId: tenantId, plantioId, estufaId, serviceOptions: options },
    options: writeOptions,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      const now = Timestamp.now();
      const dataOperacao = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : now;

      const plantio = await getPlantioById(plantioId, tenantId);
      if (!plantio) throw new Error('Plantio não encontrado.');
      const isEarlyCycleSale = data.destino === 'venda_direta' && isSaleBeforeMinimumCycleDate(plantio, dataOperacao);
      const hasCycleUnlock = options.allowBeforeCycleDays || !!plantio.cicloDesbloqueadoPorAdmin;
      if (isEarlyCycleSale && !hasCycleUnlock) {
        validateSaleDateByCycle(plantio, dataOperacao);
      }

      const supabase = getSupabaseClient();
      const overrideAudit = isEarlyCycleSale ? buildOverrideAudit(options, now) || buildPlantioUnlockAudit(plantio) : null;

      const { data: inserted, error } = await supabase
        .from('colheitas')
        .insert({
          tenant_id: tenantId,
          plantio_id: plantioId,
          estufa_id: estufaId || null,
          data_colheita: dataOperacao.toDate().toISOString(),
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade,
          unidade_medida: normalizeUnidadeMedida(data.unidade),
          qualidade: 'padrao',
          lote_colheita: `COL-${plantioId.slice(0, 6)}-${dataOperacao.toMillis()}`,
          destino: data.destino || 'venda_direta',
          observacoes: data.observacoes || '',
          peso_bruto: Number(data.pesoBruto || 0),
          peso_liquido: Number(data.pesoLiquido || 0),
          preco_unitario: Number(data.precoUnitario || 0),
          cliente_id: data.clienteId || null,
          metodo_pagamento: data.metodoPagamento || null,
          status_pagamento: data.metodoPagamento === 'prazo' ? 'pendente' : 'pago',
          ...(overrideAudit
            ? {
                ciclo_desbloqueado_por_admin: true,
                desbloqueio_admin_by_uid: overrideAudit.desbloqueioAdminByUid || null,
                desbloqueio_admin_by_name: overrideAudit.desbloqueioAdminByName || null,
                desbloqueio_admin_at: toIsoFromTsOrDate(overrideAudit.desbloqueioAdminAt),
                desbloqueio_admin_reason: overrideAudit.desbloqueioAdminReason || null,
              }
            : {}),
        })
        .select('id')
        .single();
      if (error || !inserted?.id) {
        throw new Error(`Erro ao criar colheita. ${error?.message || ''}`.trim());
      }

      const nextStatus = data.isFinalHarvest ? 'finalizado' : 'em_colheita';
      const { error: plantioUpdateError } = await supabase
        .from('plantios')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', plantioId)
        .eq('tenant_id', tenantId);
      if (plantioUpdateError) {
        throw new Error(`Erro ao atualizar status do plantio. ${plantioUpdateError.message}`);
      }

      const vSP = data.metodoPagamento === 'prazo' ? 'pendente' : 'pago';
      let vId: string | null = null;
      if (data.destino === 'venda_direta') {
        const vendaData: VendaFormData = {
          plantioId,
          originType: 'plantio',
          originId: plantioId,
          estufaId,
          colheitaId: inserted.id,
          clienteId: data.clienteId || null,
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade,
          precoUnitario: Number(data.precoUnitario || 0),
          metodoPagamento: data.metodoPagamento || 'pix',
          pagamentoPara: data.pagamentoPara || null,
          dataVenda: data.dataVenda,
          observacoes: data.observacoes || '',
          cycleOverrideAudit: overrideAudit
            ? {
                byUid: overrideAudit.desbloqueioAdminByUid || tenantId,
                byName: overrideAudit.desbloqueioAdminByName || null,
                at: now.toDate(),
                reason: overrideAudit.desbloqueioAdminReason || null,
              }
            : null,
        };
        vId = await createVenda(vendaData, tenantId);
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId,
        estufaId: estufaId || null,
        entidade: 'colheita',
        entidadeId: inserted.id,
        acao: overrideAudit ? 'desbloqueio_ciclo' : 'criado',
        descricao: overrideAudit
          ? 'Venda/colheita registrada com desbloqueio administrativo de ciclo.'
          : 'Colheita registrada.',
        motivo: overrideAudit?.desbloqueioAdminReason || null,
        actorUid: overrideAudit?.desbloqueioAdminByUid || tenantId,
        actorName: overrideAudit?.desbloqueioAdminByName || null,
        metadata: {
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade,
          destino: data.destino || 'venda_direta',
          loteColheita: `COL-${plantioId.slice(0, 6)}-${dataOperacao.toMillis()}`,
          precoUnitario: Number(data.precoUnitario || 0),
          clienteId: data.clienteId || null,
          metodoPagamento: data.metodoPagamento || null,
          pagamentoPara: data.pagamentoPara || null,
          cicloDesbloqueadoPorAdmin: !!overrideAudit,
        },
      });

      if (vId) {
        await createTraceabilityEventSafely(tenantId, {
          plantioId,
          estufaId: estufaId || null,
          entidade: 'venda',
          entidadeId: vId,
          acao: overrideAudit ? 'desbloqueio_ciclo' : 'criado',
          descricao: 'Venda criada a partir da colheita.',
          motivo: overrideAudit?.desbloqueioAdminReason || null,
          actorUid: overrideAudit?.desbloqueioAdminByUid || tenantId,
          actorName: overrideAudit?.desbloqueioAdminByName || null,
          metadata: {
            colheitaId: inserted.id,
            quantidade: Number(data.quantidade || 0),
            unidade: data.unidade,
            precoUnitario: Number(data.precoUnitario || 0),
            clienteId: data.clienteId || null,
            metodoPagamento: data.metodoPagamento || 'pix',
            pagamentoPara: data.pagamentoPara || null,
            statusPagamento: vSP,
          },
        });
      }

      return inserted.id as string;
    },
  });
};

export const listColheitasByPlantio = async (userId: string, plantioId: string): Promise<Colheita[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('colheitas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('plantio_id', plantioId)
    .order('data_colheita', { ascending: false });
  if (error) {
    throw new Error(`Erro ao listar colheitas do plantio. ${error.message}`);
  }
  return (data || []).map(mapSupabaseColheitaToDomain);
};

export const listAllColheitas = async (userId: string): Promise<Colheita[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('colheitas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('data_colheita', { ascending: false });
  if (error) {
    throw new Error(`Erro ao listar colheitas. ${error.message}`);
  }
  return (data || []).map(mapSupabaseColheitaToDomain);
};

export const getColheitaById = async (
  id: string,
  userId: string
): Promise<(Colheita & { precoUnitario?: number; clienteId?: string | null; statusPagamento?: string; pagamentoPara?: string | null }) | null> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('colheitas').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar colheita. ${error.message}`);
  }
  if (!data) return null;

  const row = mapSupabaseColheitaToDomain(data);
  const linkedVenda = await findVendaByColheitaId(tenantId, id);
  return {
    ...row,
    precoUnitario: linkedVenda?.itens?.[0]?.valorUnitario || row.precoUnitario || 0,
    clienteId: linkedVenda?.clienteId || row.clienteId || null,
    statusPagamento: linkedVenda?.statusPagamento || row.statusPagamento,
    pagamentoPara: (linkedVenda as any)?.pagamentoPara || null,
  };
};

export const deleteColheita = async (colheitaId: string, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteColheita',
    payload: { id: colheitaId, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const supabase = getSupabaseClient();
      const colheita = await getColheitaById(colheitaId, tenantId);
      if (!colheita) throw new Error('Colheita não encontrada.');

      const { data: linkedVendasData, error: vendasError } = await supabase
        .from('vendas')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('colheita_id', colheitaId);
      if (vendasError) {
        throw new Error(`Erro ao buscar vendas vinculadas. ${vendasError.message}`);
      }

      const linkedVendas = linkedVendasData || [];
      for (const venda of linkedVendas) {
        await deleteVenda(venda.id, tenantId);
      }

      const { error } = await supabase.from('colheitas').delete().eq('id', colheitaId).eq('tenant_id', tenantId);
      if (error) {
        throw new Error(`Erro ao excluir colheita. ${error.message}`);
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: colheita.plantioId,
        estufaId: colheita.estufaId || null,
        entidade: 'colheita',
        entidadeId: colheitaId,
        acao: 'excluido',
        descricao: 'Colheita excluída.',
        actorUid: tenantId,
        metadata: {
          linkedVendasDeleted: linkedVendas.length,
        },
      });
    },
  });
};

export const updateColheita = async (
  id: string,
  data: ColheitaFormData,
  userId: string,
  options: ColheitaSaveOptions = {},
  writeOptions?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updateColheita',
    payload: { id, data, userId: tenantId, serviceOptions: options },
    options: writeOptions,
    onQueuedValue: () => undefined,
    write: async () => {
      const colheita = await getColheitaById(id, tenantId);
      if (!colheita) throw new Error('Colheita não encontrada.');

      const now = Timestamp.now();
      const dataOperacao = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : now;
      const plantio = await getPlantioById(colheita.plantioId, tenantId);
      if (!plantio) throw new Error('Plantio não encontrado.');
      const isEarlyCycleSale = data.destino === 'venda_direta' && isSaleBeforeMinimumCycleDate(plantio, dataOperacao);
      const hasCycleUnlock = options.allowBeforeCycleDays || !!plantio.cicloDesbloqueadoPorAdmin;
      if (isEarlyCycleSale && !hasCycleUnlock) {
        validateSaleDateByCycle(plantio, dataOperacao);
      }
      const overrideAudit = isEarlyCycleSale ? buildOverrideAudit(options, now) || buildPlantioUnlockAudit(plantio) : null;

      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('colheitas')
        .update({
          data_colheita: dataOperacao.toDate().toISOString(),
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade,
          unidade_medida: normalizeUnidadeMedida(data.unidade),
          destino: data.destino || 'venda_direta',
          observacoes: data.observacoes || '',
          peso_bruto: Number(data.pesoBruto || 0),
          peso_liquido: Number(data.pesoLiquido || 0),
          preco_unitario: Number(data.precoUnitario || 0),
          cliente_id: data.clienteId || null,
          metodo_pagamento: data.metodoPagamento || null,
          status_pagamento: data.metodoPagamento === 'prazo' ? 'pendente' : 'pago',
          ...(overrideAudit
            ? {
                ciclo_desbloqueado_por_admin: true,
                desbloqueio_admin_by_uid: overrideAudit.desbloqueioAdminByUid || null,
                desbloqueio_admin_by_name: overrideAudit.desbloqueioAdminByName || null,
                desbloqueio_admin_at: toIsoFromTsOrDate(overrideAudit.desbloqueioAdminAt),
                desbloqueio_admin_reason: overrideAudit.desbloqueioAdminReason || null,
              }
            : {
                ciclo_desbloqueado_por_admin: false,
                desbloqueio_admin_by_uid: null,
                desbloqueio_admin_by_name: null,
                desbloqueio_admin_at: null,
                desbloqueio_admin_reason: null,
              }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (updateError) {
        throw new Error(`Erro ao atualizar colheita. ${updateError.message}`);
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: colheita.plantioId,
        estufaId: colheita.estufaId || null,
        entidade: 'colheita',
        entidadeId: id,
        acao: overrideAudit ? 'desbloqueio_ciclo' : 'atualizado',
        descricao: overrideAudit
          ? 'Colheita atualizada com desbloqueio administrativo de ciclo.'
          : 'Colheita atualizada.',
        motivo: overrideAudit?.desbloqueioAdminReason || null,
        actorUid: overrideAudit?.desbloqueioAdminByUid || tenantId,
        actorName: overrideAudit?.desbloqueioAdminByName || null,
        metadata: {
          previousQuantidade: Number(colheita.quantidade || 0),
          previousUnidade: colheita.unidade || null,
          previousDestino: colheita.destino || null,
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade,
          destino: data.destino || 'venda_direta',
          precoUnitario: Number(data.precoUnitario || 0),
          clienteId: data.clienteId || null,
          metodoPagamento: data.metodoPagamento || null,
          cicloDesbloqueadoPorAdmin: !!overrideAudit,
        },
      });

      const linkedVenda = await findVendaByColheitaId(tenantId, id);

      if (data.destino === 'venda_direta') {
        const vendaData: VendaFormData = {
          plantioId: colheita.plantioId,
          estufaId: colheita.estufaId,
          colheitaId: id,
          clienteId: data.clienteId || null,
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade,
          precoUnitario: Number(data.precoUnitario || 0),
          metodoPagamento: data.metodoPagamento || 'pix',
          pagamentoPara: data.pagamentoPara || null,
          dataVenda: data.dataVenda,
          observacoes: data.observacoes || '',
          cycleOverrideAudit: overrideAudit
            ? {
                byUid: overrideAudit.desbloqueioAdminByUid || tenantId,
                byName: overrideAudit.desbloqueioAdminByName || null,
                at: now.toDate(),
                reason: overrideAudit.desbloqueioAdminReason || null,
              }
            : null,
        };

        if (linkedVenda) {
          await updateVenda(linkedVenda.id, vendaData, tenantId);
        } else {
          await createVenda(vendaData, tenantId);
        }
        return;
      }

      if (linkedVenda) {
        await deleteVenda(linkedVenda.id, tenantId);
      }
    },
  });
};

export const listContasAReceber = async (userId: string) => listContasAReceberVendas(userId);
export const receberConta = async (
  vendaId: string,
  userId: string,
  metodoRecebimento?: string,
  pagamentoPara?: string | null
) => receberVenda(vendaId, userId, metodoRecebimento, pagamentoPara);
export const getTotalContasAReceber = async (userId: string) => getTotalContasAReceberVendas(userId);

