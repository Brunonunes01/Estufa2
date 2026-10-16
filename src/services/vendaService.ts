import { Timestamp } from '../lib/timestamp';
import { Venda } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';
import { triggerExternalDashboardSync } from './externalAutomationService';
import { getClienteById } from './clienteService';
import {
  buildPublicTraceabilityLookupUrl,
  createTraceabilityPublicTokenFromId,
} from './publicTraceabilityService';
import { OfflineWriteOptions } from './offline/offlineStorage';
import {
  buildOfflinePlaceholderId,
  runOfflineWrite,
} from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import {
  AuditActor,
  resolveAuditActorName,
  resolveAuditActorUid,
} from './auditActor';
import { assertProductionOriginNotMixed } from './productionOriginGuard';
import {
  CHEQUE_EM_MAOS_PAYMENT_MARKER,
  canConfirmVendaReceipt,
  resolveVendaPaymentStatusForWrite,
} from './paymentStatusHelpers';

export interface VendaFormData {
  plantioId?: string;
  talhaoId?: string | null;
  originType?: Venda['originType'];
  originId?: string | null;
  itemDescricao?: string | null;
  cultura?: string | null;
  estufaId?: string;
  clienteId?: string | null;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  valorRecebido?: number | null;
  statusPagamento?: Venda['statusPagamento'];
  metodoPagamento?: string | null;
  pagamentoPara?: string | null;
  dataVenda?: Date;
  dataRecebimento?: Date | null;
  dataCompensacaoCheque?: Date | null;
  observacoes?: string | null;
  colheitaId?: string;
  cycleOverrideAudit?: {
    byUid: string;
    byName?: string | null;
    at?: Date;
    reason?: string | null;
  } | null;
}

const tsFromIso = (value?: string | null) =>
  value ? Timestamp.fromDate(new Date(value)) : undefined;

const mapSupabaseVendaToDomain = (row: any): Venda => {
  const itens = Array.isArray(row.venda_itens)
    ? row.venda_itens.map((item: any) => ({
        colheitaId: item.colheita_id || undefined,
        descricao: item.descricao,
        quantidade: Number(item.quantidade || 0),
        unidade: item.unidade || undefined,
        valorUnitario: Number(item.valor_unitario || 0),
      }))
    : [];

  const fallbackItem = itens[0];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.created_by || row.tenant_id,
    createdBy: row.created_by || row.tenant_id,
    plantioId: row.plantio_id || undefined,
    talhaoId: row.talhao_id || undefined,
    originType: row.origin_type || undefined,
    originId: row.origin_id || null,
    traceabilityPublicToken: row.traceability_public_token || null,
    traceabilityPublicUrl: row.traceability_public_url || null,
    estufaId: row.estufa_id || undefined,
    colheitaId: row.colheita_id || undefined,
    clienteId: row.cliente_id || null,
    dataVenda: Timestamp.fromDate(new Date(row.data_venda)),
    dataVencimento: tsFromIso(row.data_vencimento) || null,
    dataRecebimento: tsFromIso(row.data_recebimento) || null,
    dataCompensacaoCheque: tsFromIso(row.data_compensacao_cheque) || null,
    itens,
    valorTotal: Number(row.valor_total || 0),
    valorRecebido:
      row.valor_recebido != null ? Number(row.valor_recebido) : null,
    statusPagamento: row.status_pagamento,
    formaPagamento: row.forma_pagamento || undefined,
    metodoPagamento: row.metodo_pagamento || null,
    pagamentoPara: row.pagamento_para || null,
    observacoes: row.observacoes || undefined,
    quantidade:
      row.quantidade != null
        ? Number(row.quantidade)
        : fallbackItem?.quantidade,
    unidade: fallbackItem?.unidade,
    precoUnitario: fallbackItem?.valorUnitario,
    cicloDesbloqueadoPorAdmin: !!row.ciclo_desbloqueado_por_admin,
    desbloqueioAdminByUid: row.desbloqueio_admin_by_uid || null,
    desbloqueioAdminByName: row.desbloqueio_admin_by_name || null,
    desbloqueioAdminAt: tsFromIso(row.desbloqueio_admin_at) || null,
    desbloqueioAdminReason: row.desbloqueio_admin_reason || null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  } as Venda;
};

const buildSupabaseVendaPayload = (
  data: VendaFormData,
  tenantId: string,
  talhaoIdResolved?: string | null,
  traceabilityPublicToken?: string
) => {
  const dataVenda = data.dataVenda
    ? data.dataVenda.toISOString()
    : new Date().toISOString();
  const statusPagamento = resolveVendaPaymentStatusForWrite(
    data.metodoPagamento,
    data.statusPagamento
  );
  const dataCompensacaoCheque =
    data.metodoPagamento === 'cheque' && data.dataCompensacaoCheque
      ? data.dataCompensacaoCheque.toISOString()
      : null;
  const originType: Venda['originType'] = data.originType || 'plantio';
  const originId =
    data.originId !== undefined
      ? data.originId
      : data.plantioId || null;

  const vencimento =
    data.metodoPagamento === 'cheque'
      ? dataCompensacaoCheque
      : statusPagamento === 'pendente'
        ? new Date(
            new Date(dataVenda).getTime() + 15 * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

  const valorTotal =
    Number(data.quantidade || 0) * Number(data.precoUnitario || 0);
  const valorRecebido =
    statusPagamento === 'pago'
      ? data.valorRecebido != null
        ? Number(data.valorRecebido)
        : valorTotal
      : null;
  const token = traceabilityPublicToken || null;
  const traceabilityPublicUrl = token
    ? buildPublicTraceabilityLookupUrl(token) || null
    : null;

  return {
    venda: {
      tenant_id: tenantId,
      plantio_id: data.plantioId || null,
      talhao_id: talhaoIdResolved || data.talhaoId || null,
      traceability_public_token: token,
      traceability_public_url: traceabilityPublicUrl,
      origin_type: originType,
      origin_id: originId,
      estufa_id: data.estufaId || null,
      colheita_id: data.colheitaId || null,
      cliente_id: data.clienteId || null,
      data_venda: dataVenda,
      data_vencimento: vencimento,
      data_recebimento:
        statusPagamento === 'pago'
          ? data.dataRecebimento?.toISOString() || dataVenda
          : null,
      data_compensacao_cheque: dataCompensacaoCheque,
      valor_total: valorTotal,
      valor_recebido: valorRecebido,
      status_pagamento: statusPagamento,
      forma_pagamento: data.metodoPagamento || 'pix',
      metodo_pagamento: data.metodoPagamento || 'pix',
      pagamento_para:
        statusPagamento === 'pago' || data.metodoPagamento === 'cheque'
          ? data.pagamentoPara || null
          : null,
      observacoes: data.observacoes || '',
      quantidade: Number(data.quantidade || 0),
      ciclo_desbloqueado_por_admin: !!data.cycleOverrideAudit,
      desbloqueio_admin_by_uid: data.cycleOverrideAudit?.byUid || null,
      desbloqueio_admin_by_name: data.cycleOverrideAudit?.byName || null,
      desbloqueio_admin_at: data.cycleOverrideAudit?.at
        ? data.cycleOverrideAudit.at.toISOString()
        : null,
      desbloqueio_admin_reason: data.cycleOverrideAudit?.reason || null,
    },
    item: {
      colheita_id: data.colheitaId || null,
      descricao: data.itemDescricao?.trim() || 'Produção agrícola',
      quantidade: Number(data.quantidade || 0),
      unidade: data.unidade,
      valor_unitario: Number(data.precoUnitario || 0),
    },
  };
};

const buildClienteEndereco = (cliente: any) => {
  const parts = [
    cliente?.endereco,
    cliente?.numero,
    cliente?.bairro,
    cliente?.cidade,
    cliente?.estado,
    cliente?.cep,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const resolveCompradorTrace = async (
  tenantId: string,
  clienteId?: string | null
) => {
  if (!clienteId) {
    return {
      nome: 'Consumidor final',
      documento: null,
      endereco: null,
      tipo: 'consumidor_final',
    };
  }
  const cliente = await getClienteById(clienteId, tenantId);
  return {
    nome: cliente?.nome || 'Cliente não identificado',
    documento: cliente?.documento || null,
    endereco: cliente ? buildClienteEndereco(cliente) : null,
    tipo: 'comprador',
  };
};

const isReceivableStatus = (
  status?: Venda['statusPagamento'] | null,
  metodoPagamento?: string | null
) =>
  status === 'pendente' ||
  status === 'atrasado' ||
  (!status && (metodoPagamento === 'prazo' || metodoPagamento === 'cheque'));

const isReceivedStatus = (status?: Venda['statusPagamento'] | null) =>
  status === 'pago';

const isDeletePermissionError = (error: any): boolean => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('violates row-level security') ||
    message.includes('row level security')
  );
};

const validateVendaFormData = (data: VendaFormData) => {
  const quantidade = Number(data.quantidade || 0);
  const precoUnitario = Number(data.precoUnitario || 0);

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error('Quantidade da venda deve ser maior que zero.');
  }
  if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
    throw new Error('Preço unitário da venda não pode ser negativo.');
  }
  if (
    data.valorRecebido != null &&
    (!Number.isFinite(Number(data.valorRecebido)) ||
      Number(data.valorRecebido) < 0)
  ) {
    throw new Error('O valor recebido não pode ser negativo.');
  }
  if (!data.unidade?.trim()) {
    throw new Error('Informe a unidade da venda.');
  }
  assertProductionOriginNotMixed(data, 'Venda');
  if (data.metodoPagamento === 'cheque') {
    if (
      !data.dataCompensacaoCheque ||
      Number.isNaN(data.dataCompensacaoCheque.getTime())
    ) {
      throw new Error('Informe a data prevista para compensacao do cheque.');
    }
    const saleDate = new Date(data.dataVenda || new Date());
    saleDate.setHours(0, 0, 0, 0);
    const compensationDate = new Date(data.dataCompensacaoCheque);
    compensationDate.setHours(0, 0, 0, 0);
    if (compensationDate.getTime() < saleDate.getTime()) {
      throw new Error(
        'A compensacao do cheque nao pode ser anterior a data da venda.'
      );
    }
  }
};

const resolveTalhaoIdFromPlantio = async (
  tenantId: string,
  plantioId?: string | null
) => {
  if (!plantioId) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('plantios')
    .select('talhao_id')
    .eq('tenant_id', tenantId)
    .eq('id', plantioId)
    .maybeSingle();
  if (error) return null;
  return (data as any)?.talhao_id || null;
};

const resolveTraceActor = (
  tenantId: string,
  actor?: AuditActor | null,
  cycleOverrideAudit?: VendaFormData['cycleOverrideAudit']
) => ({
  actorUid: cycleOverrideAudit?.byUid || resolveAuditActorUid(tenantId, actor),
  actorName: cycleOverrideAudit?.byName || resolveAuditActorName(actor),
});

export const createVenda = async (
  data: VendaFormData,
  userId: string,
  options?: OfflineWriteOptions,
  actor?: AuditActor | null
) => {
  const tenantId = assertTenantId(userId);
  const traceActor = resolveTraceActor(
    tenantId,
    actor,
    data.cycleOverrideAudit
  );
  return runOfflineWrite({
    action: 'createVenda',
    payload: { data, userId: tenantId, actor },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      validateVendaFormData(data);

      const supabase = getSupabaseClient();
      const traceabilityPublicToken = createTraceabilityPublicTokenFromId(
        `${Date.now()}_${Math.random()}`
      );
      const talhaoIdResolved =
        data.talhaoId !== undefined
          ? data.talhaoId
          : await resolveTalhaoIdFromPlantio(tenantId, data.plantioId);
      assertProductionOriginNotMixed(
        { estufaId: data.estufaId, talhaoId: talhaoIdResolved },
        'Venda'
      );
      const payload = buildSupabaseVendaPayload(
        data,
        tenantId,
        talhaoIdResolved,
        traceabilityPublicToken
      );

      const { data: inserted, error } = await supabase
        .from('vendas')
        .insert(payload.venda)
        .select('id')
        .single();
      if (error || !inserted?.id) {
        throw new Error(
          `Não foi possível criar venda. ${error?.message || ''}`.trim()
        );
      }

      const { error: itemError } = await supabase.from('venda_itens').insert({
        tenant_id: tenantId,
        venda_id: inserted.id,
        ...payload.item,
      });
      if (itemError) {
        throw new Error(`Erro ao salvar itens da venda. ${itemError.message}`);
      }

      const tracePlantioId = data.plantioId || null;
      const compradorTrace = await resolveCompradorTrace(
        tenantId,
        data.clienteId || null
      );

      await createTraceabilityEventSafely(tenantId, {
        plantioId: tracePlantioId,
        estufaId: data.estufaId || null,
        entidade: 'venda',
        entidadeId: inserted.id,
        acao: data.cycleOverrideAudit ? 'desbloqueio_ciclo' : 'criado',
        descricao: 'Venda registrada.',
        motivo: data.cycleOverrideAudit?.reason || null,
        actorUid: traceActor.actorUid,
        actorName: traceActor.actorName,
        metadata: {
          valorTotal: payload.venda.valor_total,
          statusPagamento: payload.venda.status_pagamento,
          colheitaId: data.colheitaId || null,
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade || null,
          precoUnitario: Number(data.precoUnitario || 0),
          metodoPagamento: data.metodoPagamento || 'pix',
          pagamentoPara: data.pagamentoPara || null,
          clienteId: data.clienteId || null,
          originType: payload.venda.origin_type || null,
          originId: payload.venda.origin_id || null,
          traceabilityPublicToken:
            payload.venda.traceability_public_token || null,
          traceabilityPublicUrl: payload.venda.traceability_public_url || null,
          cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
          produto: {
            descricao: payload.item.descricao || data.itemDescricao || null,
            quantidade: Number(payload.item.quantidade || data.quantidade || 0),
            unidade: payload.item.unidade || data.unidade || null,
            codigoRastreio: tracePlantioId || inserted.id,
          },
          enteAnterior: {
            nome: 'Produção agrícola',
            documento: payload.venda.origin_id || null,
            tipo: payload.venda.origin_type || null,
          },
          entePosterior: compradorTrace,
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'create',
        recordId: inserted.id,
        metadata: {
          statusPagamento: payload.venda.status_pagamento,
          originType: payload.venda.origin_type || null,
          originId: payload.venda.origin_id || null,
          valorTotal: payload.venda.valor_total,
        },
      });

      return inserted.id as string;
    },
  });
};

export const getVendaById = async (
  id: string,
  userId: string
): Promise<Venda | null> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar venda: ${error.message}`);
  }
  return data ? mapSupabaseVendaToDomain(data) : null;
};

export const getVendaByColheitaId = async (
  colheitaId: string,
  userId: string
): Promise<Venda | null> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('colheita_id', colheitaId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(`Erro ao buscar venda da colheita: ${error.message}`);
  }
  return data ? mapSupabaseVendaToDomain(data) : null;
};

export const updateVenda = async (
  id: string,
  data: VendaFormData,
  userId: string,
  options?: OfflineWriteOptions,
  actor?: AuditActor | null
) => {
  const tenantId = assertTenantId(userId);
  const traceActor = resolveTraceActor(
    tenantId,
    actor,
    data.cycleOverrideAudit
  );
  return runOfflineWrite({
    action: 'updateVenda',
    payload: { id, data, userId: tenantId, actor },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      validateVendaFormData(data);

      const supabase = getSupabaseClient();
      const venda = await getVendaById(id, tenantId);
      if (!venda) throw new Error('Venda não encontrada.');
      if (data.originId === '__disabled_sale_guard__') {
        const previousQuantidade = Number(
          (venda as any).quantidade || venda.itens?.[0]?.quantidade || 0
        );
        const previousLoteId = String(
          venda.originId || ''
        );
        const nextLoteId = String(
          data.originId || previousLoteId
        );
        if (
          Number(data.quantidade || 0) !== previousQuantidade ||
          nextLoteId !== previousLoteId
        ) {
          throw new Error(
            'Venda com baixa de saldo nao pode alterar quantidade ou producao.'
          );
        }
      }

      const merged = {
        ...data,
        plantioId: data.plantioId ?? venda.plantioId ?? undefined,
        originType: data.originType ?? venda.originType,
        originId:
          data.originId !== undefined
            ? data.originId
            : (venda.originId ?? null),
        estufaId: data.estufaId ?? venda.estufaId,
        clienteId:
          data.clienteId !== undefined
            ? data.clienteId
            : (venda.clienteId ?? null),
        pagamentoPara:
          data.pagamentoPara !== undefined
            ? data.pagamentoPara
            : ((venda as any).pagamentoPara ?? null),
        valorRecebido:
          data.valorRecebido !== undefined
            ? data.valorRecebido
            : (venda.valorRecebido ?? null),
        statusPagamento: venda.statusPagamento,
        dataRecebimento: venda.dataRecebimento?.toDate() || null,
        colheitaId: data.colheitaId ?? venda.colheitaId ?? undefined,
        talhaoId:
          data.talhaoId !== undefined
            ? data.talhaoId
            : ((venda as any).talhaoId ?? null),
      } as VendaFormData;
      const talhaoIdResolved =
        merged.talhaoId !== undefined && merged.talhaoId !== null
          ? merged.talhaoId
          : await resolveTalhaoIdFromPlantio(tenantId, merged.plantioId);
      assertProductionOriginNotMixed(
        { estufaId: merged.estufaId, talhaoId: talhaoIdResolved },
        'Venda'
      );
      const payload = buildSupabaseVendaPayload(
        merged,
        tenantId,
        talhaoIdResolved,
        venda.traceabilityPublicToken || undefined
      );

      const { error: updateError } = await supabase
        .from('vendas')
        .update({
          ...payload.venda,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (updateError) {
        throw new Error(`Erro ao atualizar venda: ${updateError.message}`);
      }

      const { error: deleteItensError } = await supabase
        .from('venda_itens')
        .delete()
        .eq('venda_id', id)
        .eq('tenant_id', tenantId);
      if (deleteItensError) {
        throw new Error(
          `Erro ao atualizar item da venda: ${deleteItensError.message}`
        );
      }
      const { error: itemError } = await supabase.from('venda_itens').insert({
        tenant_id: tenantId,
        venda_id: id,
        ...payload.item,
      });
      if (itemError) {
        throw new Error(
          `Erro ao atualizar item da venda: ${itemError.message}`
        );
      }

      const plantioId = merged.plantioId || venda.plantioId || null;
      const compradorTrace = await resolveCompradorTrace(
        tenantId,
        merged.clienteId || venda.clienteId || null
      );

      await createTraceabilityEventSafely(tenantId, {
        plantioId,
        estufaId: merged.estufaId || venda.estufaId || null,
        entidade: 'venda',
        entidadeId: id,
        acao: data.cycleOverrideAudit ? 'desbloqueio_ciclo' : 'atualizado',
        descricao: 'Venda atualizada.',
        motivo: data.cycleOverrideAudit?.reason || null,
        actorUid: traceActor.actorUid,
        actorName: traceActor.actorName,
        metadata: {
          previousStatusPagamento: venda.statusPagamento,
          valorTotal: payload.venda.valor_total,
          statusPagamento: payload.venda.status_pagamento,
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade || null,
          precoUnitario: Number(data.precoUnitario || 0),
          metodoPagamento:
            data.metodoPagamento || payload.venda.metodo_pagamento || 'pix',
          pagamentoPara: merged.pagamentoPara || null,
          clienteId: merged.clienteId || venda.clienteId || null,
          originType:
            payload.venda.origin_type || (venda as any).originType || null,
          originId: payload.venda.origin_id || (venda as any).originId || null,
          cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
          produto: {
            descricao: payload.item.descricao || data.itemDescricao || null,
            quantidade: Number(payload.item.quantidade || data.quantidade || 0),
            unidade: payload.item.unidade || data.unidade || null,
            codigoRastreio: plantioId || id,
          },
          enteAnterior: {
            nome: 'Produção agrícola',
            documento:
              payload.venda.origin_id || (venda as any).originId || null,
            tipo:
              payload.venda.origin_type || (venda as any).originType || null,
          },
          entePosterior: compradorTrace,
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'update',
        recordId: id,
        metadata: {
          statusPagamento: payload.venda.status_pagamento,
          originType: payload.venda.origin_type || null,
          originId: payload.venda.origin_id || null,
          valorTotal: payload.venda.valor_total,
        },
      });
    },
  });
};

export const deleteVenda = async (
  id: string,
  userId: string,
  options?: OfflineWriteOptions,
  actor?: AuditActor | null
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteVenda',
    payload: { id, userId: tenantId, actor },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const venda = await getVendaById(id, tenantId);
      if (!venda) throw new Error('Venda não encontrada.');

      const supabase = getSupabaseClient();
      const { error: itemDeleteError } = await supabase
        .from('venda_itens')
        .delete()
        .eq('venda_id', id)
        .eq('tenant_id', tenantId);
      if (itemDeleteError) {
        if (isDeletePermissionError(itemDeleteError)) {
          throw new Error(
            'Sem permissao para excluir itens da venda neste perfil.'
          );
        }
        throw new Error(
          `Erro ao excluir itens da venda. ${itemDeleteError.message}`
        );
      }

      const { data: deletedVenda, error: vendaDeleteError } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('id')
        .maybeSingle();
      if (vendaDeleteError) {
        if (isDeletePermissionError(vendaDeleteError)) {
          throw new Error('Sem permissao para excluir venda neste perfil.');
        }
        throw new Error(`Erro ao excluir venda. ${vendaDeleteError.message}`);
      }
      if (!deletedVenda) {
        throw new Error(
          'A venda não foi excluída. Verifique se este perfil possui permissão para excluir.'
        );
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: venda.plantioId || null,
        estufaId: venda.estufaId || null,
        entidade: 'venda',
        entidadeId: id,
        acao: 'excluido',
        descricao: 'Venda excluída.',
        actorUid: resolveAuditActorUid(tenantId, actor),
        actorName: resolveAuditActorName(actor),
        metadata: {
          colheitaId: venda.colheitaId || null,
          clienteId: venda.clienteId || null,
          quantidade: Number(
            (venda as any).quantidade || venda.itens?.[0]?.quantidade || 0
          ),
          unidade: (venda as any).unidade || null,
          precoUnitario: Number(
            (venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || 0
          ),
          valorTotal: venda.valorTotal || 0,
          statusPagamento: venda.statusPagamento,
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'delete',
        recordId: id,
        metadata: {
          statusPagamento: venda.statusPagamento || null,
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
          valorTotal: Number(venda.valorTotal || 0),
        },
      });
    },
  });
};

export const listAllVendas = async (userId: string): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('tenant_id', tenantId)
    .order('data_venda', { ascending: false });
  if (error) {
    throw new Error(`Erro ao listar vendas. ${error.message}`);
  }
  return (data || []).map(mapSupabaseVendaToDomain);
};

export const listVendasByMonth = async (
  userId: string,
  year: number,
  month: number
): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('tenant_id', tenantId)
    .gte('data_venda', startDate.toISOString())
    .lte('data_venda', endDate.toISOString())
    .order('data_venda', { ascending: false });
  if (error) {
    throw new Error(`Erro ao listar vendas do mês. ${error.message}`);
  }
  return (data || []).map(mapSupabaseVendaToDomain);
};

export const listVendasReceivedByMonth = async (
  userId: string,
  year: number,
  month: number
): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('tenant_id', tenantId)
    .eq('status_pagamento', 'pago')
    .gte('data_recebimento', startDate.toISOString())
    .lte('data_recebimento', endDate.toISOString())
    .order('data_recebimento', { ascending: false });
  if (error) {
    throw new Error(`Erro ao listar recebimentos do mês. ${error.message}`);
  }
  return (data || []).map(mapSupabaseVendaToDomain);
};

export const listVendasByPlantio = async (
  userId: string,
  plantioId: string
): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('tenant_id', tenantId)
    .eq('plantio_id', plantioId)
    .order('data_venda', { ascending: false });
  if (error) {
    throw new Error(`Erro ao listar vendas por plantio. ${error.message}`);
  }
  return (data || []).map(mapSupabaseVendaToDomain);
};

export const receberVenda = async (
  vendaId: string,
  userId: string,
  metodoRecebimento?: string,
  pagamentoPara?: string | null,
  options?: OfflineWriteOptions,
  actor?: AuditActor | null,
  receivedAt?: Date,
  valorRecebido?: number
) => {
  const tenantId = assertTenantId(userId);
  const receivedAtResolved = receivedAt || new Date();
  if (
    valorRecebido !== undefined &&
    (!Number.isFinite(valorRecebido) || valorRecebido < 0)
  ) {
    throw new Error('Informe um valor recebido válido.');
  }
  return runOfflineWrite({
    action: 'receberVenda',
    payload: {
      id: vendaId,
      userId: tenantId,
      metodoRecebimento: metodoRecebimento || null,
      pagamentoPara: pagamentoPara || null,
      actor,
      receivedAt: receivedAtResolved,
      valorRecebido,
    },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const venda = await getVendaById(vendaId, tenantId);
      if (!venda) throw new Error('Registro não encontrado.');

      if (!canConfirmVendaReceipt(venda.statusPagamento)) {
        throw new Error(
          venda.statusPagamento === 'pago'
            ? 'Esta venda já teve o recebimento confirmado.'
            : 'Somente vendas pendentes ou atrasadas podem receber baixa.'
        );
      }

      const saleDate = venda.dataVenda?.toDate?.();
      if (saleDate) {
        const saleDay = new Date(saleDate);
        const receiptDay = new Date(receivedAtResolved);
        saleDay.setHours(0, 0, 0, 0);
        receiptDay.setHours(0, 0, 0, 0);
        if (receiptDay.getTime() < saleDay.getTime()) {
          throw new Error(
            'A data do recebimento não pode ser anterior à data da venda.'
          );
        }
      }

      const supabase = getSupabaseClient();
      const dataRecebimento = receivedAtResolved.toISOString();
      const valorRecebidoResolved =
        valorRecebido !== undefined
          ? Number(valorRecebido.toFixed(2))
          : Number(venda.valorTotal || 0);
      const { data: updatedVenda, error } = await supabase
        .from('vendas')
        .update({
          status_pagamento: 'pago',
          forma_pagamento: (metodoRecebimento ||
            venda.formaPagamento ||
            'pix') as Venda['formaPagamento'],
          metodo_pagamento: metodoRecebimento || venda.metodoPagamento || 'pix',
          pagamento_para: pagamentoPara || (venda as any).pagamentoPara || null,
          data_recebimento: dataRecebimento,
          valor_recebido: valorRecebidoResolved,
          updated_at: dataRecebimento,
        })
        .eq('id', vendaId)
        .eq('tenant_id', tenantId)
        .in('status_pagamento', ['pendente', 'atrasado'])
        .select('id')
        .maybeSingle();
      if (error) {
        throw new Error(`Erro ao confirmar recebimento. ${error.message}`);
      }
      if (!updatedVenda?.id) {
        throw new Error(
          'O recebimento desta venda já foi confirmado por outro usuário. Atualize a lista.'
        );
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: venda.plantioId || null,
        estufaId: venda.estufaId || null,
        entidade: 'venda',
        entidadeId: vendaId,
        acao: 'recebimento_registrado',
        descricao: 'Recebimento da venda confirmado.',
        actorUid: resolveAuditActorUid(tenantId, actor),
        actorName: resolveAuditActorName(actor),
        metadata: {
          metodoPagamento:
            metodoRecebimento ||
            venda.metodoPagamento ||
            venda.formaPagamento ||
            'pix',
          pagamentoPara: pagamentoPara || (venda as any).pagamentoPara || null,
          previousStatusPagamento: venda.statusPagamento,
          newStatusPagamento: 'pago',
          dataRecebimento,
          valorCombinado: Number(venda.valorTotal || 0),
          valorRecebido: valorRecebidoResolved,
          diferencaRecebida:
            valorRecebidoResolved - Number(venda.valorTotal || 0),
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'status_change',
        recordId: vendaId,
        metadata: {
          previousStatusPagamento: venda.statusPagamento || null,
          newStatusPagamento: 'pago',
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
          valorTotal: Number(venda.valorTotal || 0),
          valorRecebido: valorRecebidoResolved,
        },
      });
    },
  });
};

export type VendaReceiptCorrectionData = {
  metodoRecebimento: string;
  pagamentoPara?: string | null;
  receivedAt: Date;
  valorRecebido: number;
};

export const updateVendaReceipt = async (
  vendaId: string,
  userId: string,
  correction: VendaReceiptCorrectionData,
  options?: OfflineWriteOptions,
  actor?: AuditActor | null
) => {
  const tenantId = assertTenantId(userId);
  const metodoRecebimento = String(correction.metodoRecebimento || '').trim();
  const receivedAt = correction.receivedAt;
  const valorRecebido = Number(correction.valorRecebido);

  if (!metodoRecebimento) {
    throw new Error('Informe a forma de recebimento.');
  }
  if (!(receivedAt instanceof Date) || Number.isNaN(receivedAt.getTime())) {
    throw new Error('Informe uma data de recebimento válida.');
  }
  if (!Number.isFinite(valorRecebido) || valorRecebido < 0) {
    throw new Error('Informe um valor recebido válido.');
  }

  return runOfflineWrite({
    action: 'updateVendaReceipt',
    payload: {
      id: vendaId,
      userId: tenantId,
      metodoRecebimento,
      pagamentoPara: correction.pagamentoPara || null,
      receivedAt,
      valorRecebido,
      actor,
    },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const venda = await getVendaById(vendaId, tenantId);
      if (!venda) throw new Error('Venda não encontrada.');
      if (venda.statusPagamento !== 'pago') {
        throw new Error(
          'Somente recebimentos já confirmados podem ser corrigidos por esta opção.'
        );
      }

      const saleDate = venda.dataVenda?.toDate?.();
      if (saleDate) {
        const saleDay = new Date(saleDate);
        const receiptDay = new Date(receivedAt);
        saleDay.setHours(0, 0, 0, 0);
        receiptDay.setHours(0, 0, 0, 0);
        if (receiptDay.getTime() < saleDay.getTime()) {
          throw new Error(
            'A data do recebimento não pode ser anterior à data da venda.'
          );
        }
      }

      const dataRecebimento = receivedAt.toISOString();
      const valorRecebidoResolved = Number(valorRecebido.toFixed(2));
      const previousReceipt = {
        metodoPagamento: venda.metodoPagamento || venda.formaPagamento || null,
        pagamentoPara: venda.pagamentoPara || null,
        dataRecebimento:
          venda.dataRecebimento?.toDate?.()?.toISOString() || null,
        valorRecebido:
          venda.valorRecebido != null
            ? Number(venda.valorRecebido)
            : Number(venda.valorTotal || 0),
      };
      const dataCompensacaoCheque =
        metodoRecebimento === 'cheque'
          ? venda.dataCompensacaoCheque?.toDate?.()?.toISOString() ||
            dataRecebimento
          : null;

      const supabase = getSupabaseClient();
      const { data: updatedVenda, error } = await supabase
        .from('vendas')
        .update({
          status_pagamento: 'pago',
          forma_pagamento: metodoRecebimento as Venda['formaPagamento'],
          metodo_pagamento: metodoRecebimento,
          pagamento_para: correction.pagamentoPara || null,
          data_recebimento: dataRecebimento,
          data_compensacao_cheque: dataCompensacaoCheque,
          valor_recebido: valorRecebidoResolved,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendaId)
        .eq('tenant_id', tenantId)
        .eq('status_pagamento', 'pago')
        .select('id')
        .maybeSingle();

      if (error) {
        throw new Error(`Erro ao corrigir recebimento. ${error.message}`);
      }
      if (!updatedVenda?.id) {
        throw new Error(
          'O estado desta venda mudou. Atualize a lista antes de corrigir o recebimento.'
        );
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: venda.plantioId || null,
        estufaId: venda.estufaId || null,
        entidade: 'venda',
        entidadeId: vendaId,
        acao: 'atualizado',
        descricao: 'Dados do recebimento corrigidos.',
        actorUid: resolveAuditActorUid(tenantId, actor),
        actorName: resolveAuditActorName(actor),
        metadata: {
          previousReceipt,
          correctedReceipt: {
            metodoPagamento: metodoRecebimento,
            pagamentoPara: correction.pagamentoPara || null,
            dataRecebimento,
            valorRecebido: valorRecebidoResolved,
          },
          valorCombinado: Number(venda.valorTotal || 0),
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'update',
        recordId: vendaId,
        metadata: {
          statusPagamento: 'pago',
          metodoPagamento: metodoRecebimento,
          dataRecebimento,
          valorRecebido: valorRecebidoResolved,
        },
      });
    },
  });
};

export const removeVendaReceipt = async (
  vendaId: string,
  userId: string,
  options?: OfflineWriteOptions,
  actor?: AuditActor | null
) => {
  const tenantId = assertTenantId(userId);

  return runOfflineWrite({
    action: 'removeVendaReceipt',
    payload: {
      id: vendaId,
      userId: tenantId,
      actor,
    },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const venda = await getVendaById(vendaId, tenantId);
      if (!venda) throw new Error('Venda não encontrada.');
      if (venda.statusPagamento !== 'pago') {
        throw new Error(
          'Somente vendas pagas podem ter o recebimento removido.'
        );
      }

      const previousReceipt = {
        metodoPagamento: venda.metodoPagamento || venda.formaPagamento || null,
        pagamentoPara: venda.pagamentoPara || null,
        dataRecebimento:
          venda.dataRecebimento?.toDate?.()?.toISOString() || null,
        valorRecebido:
          venda.valorRecebido != null
            ? Number(venda.valorRecebido)
            : Number(venda.valorTotal || 0),
      };

      const now = new Date().toISOString();
      const supabase = getSupabaseClient();
      const { data: updatedVenda, error } = await supabase
        .from('vendas')
        .update({
          status_pagamento: 'pendente',
          forma_pagamento: null,
          metodo_pagamento: null,
          pagamento_para: null,
          data_recebimento: null,
          data_compensacao_cheque: null,
          valor_recebido: null,
          updated_at: now,
        })
        .eq('id', vendaId)
        .eq('tenant_id', tenantId)
        .eq('status_pagamento', 'pago')
        .select('id')
        .maybeSingle();

      if (error) {
        throw new Error(`Erro ao remover recebimento. ${error.message}`);
      }
      if (!updatedVenda?.id) {
        throw new Error(
          'O estado desta venda mudou. Atualize a lista antes de remover o recebimento.'
        );
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: venda.plantioId || null,
        estufaId: venda.estufaId || null,
        entidade: 'venda',
        entidadeId: vendaId,
        acao: 'recebimento_removido',
        descricao: 'Recebimento da venda removido.',
        actorUid: resolveAuditActorUid(tenantId, actor),
        actorName: resolveAuditActorName(actor),
        metadata: {
          previousReceipt,
          previousStatusPagamento: 'pago',
          newStatusPagamento: 'pendente',
          valorCombinado: Number(venda.valorTotal || 0),
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'status_change',
        recordId: vendaId,
        metadata: {
          previousStatusPagamento: 'pago',
          newStatusPagamento: 'pendente',
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
          valorTotal: Number(venda.valorTotal || 0),
          valorRecebido: previousReceipt.valorRecebido,
        },
      });
    },
  });
};

export const markVendaChequeEmMaos = async (
  vendaId: string,
  userId: string,
  receivedAt?: Date,
  valorCheque?: number,
  options?: OfflineWriteOptions,
  actor?: AuditActor | null
) => {
  const tenantId = assertTenantId(userId);
  const receivedAtResolved = receivedAt || new Date();
  if (
    valorCheque !== undefined &&
    (!Number.isFinite(valorCheque) || valorCheque < 0)
  ) {
    throw new Error('Informe um valor válido para o cheque.');
  }

  return runOfflineWrite({
    action: 'markVendaChequeEmMaos',
    payload: {
      id: vendaId,
      userId: tenantId,
      receivedAt: receivedAtResolved,
      valorCheque,
      actor,
    },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const venda = await getVendaById(vendaId, tenantId);
      if (!venda) throw new Error('Venda não encontrada.');
      if (!canConfirmVendaReceipt(venda.statusPagamento)) {
        throw new Error(
          venda.statusPagamento === 'pago'
            ? 'Esta venda já teve o recebimento confirmado.'
            : 'Somente vendas pendentes ou atrasadas podem receber cheque em mãos.'
        );
      }

      const saleDate = venda.dataVenda?.toDate?.();
      if (saleDate) {
        const saleDay = new Date(saleDate);
        const receiptDay = new Date(receivedAtResolved);
        saleDay.setHours(0, 0, 0, 0);
        receiptDay.setHours(0, 0, 0, 0);
        if (receiptDay.getTime() < saleDay.getTime()) {
          throw new Error(
            'A data do cheque não pode ser anterior à data da venda.'
          );
        }
      }

      const now = new Date().toISOString();
      const dataRecebimento = receivedAtResolved.toISOString();
      const valorChequeResolved =
        valorCheque !== undefined
          ? Number(valorCheque.toFixed(2))
          : Number(venda.valorTotal || 0);
      const supabase = getSupabaseClient();
      const { data: updatedVenda, error } = await supabase
        .from('vendas')
        .update({
          status_pagamento: 'pendente',
          forma_pagamento: CHEQUE_EM_MAOS_PAYMENT_MARKER,
          metodo_pagamento: 'cheque',
          pagamento_para: null,
          data_recebimento: dataRecebimento,
          valor_recebido: valorChequeResolved,
          updated_at: now,
        })
        .eq('id', vendaId)
        .eq('tenant_id', tenantId)
        .in('status_pagamento', ['pendente', 'atrasado'])
        .select('id')
        .maybeSingle();

      if (error) {
        throw new Error(`Erro ao registrar cheque em mãos. ${error.message}`);
      }
      if (!updatedVenda?.id) {
        throw new Error(
          'O estado desta venda mudou. Atualize a lista antes de registrar o cheque.'
        );
      }

      await createTraceabilityEventSafely(tenantId, {
        plantioId: venda.plantioId || null,
        estufaId: venda.estufaId || null,
        entidade: 'venda',
        entidadeId: vendaId,
        acao: 'recebimento_registrado',
        descricao: 'Cheque físico recebido e mantido em mãos.',
        actorUid: resolveAuditActorUid(tenantId, actor),
        actorName: resolveAuditActorName(actor),
        metadata: {
          statusPagamento: 'pendente',
          formaPagamento: CHEQUE_EM_MAOS_PAYMENT_MARKER,
          metodoPagamento: 'cheque',
          dataRecebimento,
          valorCheque: valorChequeResolved,
          valorCombinado: Number(venda.valorTotal || 0),
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'status_change',
        recordId: vendaId,
        metadata: {
          statusPagamento: 'pendente',
          formaPagamento: CHEQUE_EM_MAOS_PAYMENT_MARKER,
          metodoPagamento: 'cheque',
          dataRecebimento,
          valorCheque: valorChequeResolved,
          valorTotal: Number(venda.valorTotal || 0),
          originType: (venda as any).originType || null,
          originId: (venda as any).originId || null,
        },
      });
    },
  });
};

export const listContasAReceber = async (userId: string): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendas')
    .select('*, venda_itens(*)')
    .eq('tenant_id', tenantId)
    .in('status_pagamento', ['pendente', 'atrasado'])
    .order('data_venda', { ascending: true });
  if (error) {
    throw new Error(`Erro ao listar contas a receber. ${error.message}`);
  }
  return (data || []).map(mapSupabaseVendaToDomain);
};

export const getTotalContasAReceber = async (
  userId: string
): Promise<number> => {
  const contas = await listContasAReceber(userId);
  return contas.reduce((acc, venda) => acc + Number(venda.valorTotal || 0), 0);
};

export const getVendasFinancialSummary = async (userId: string) => {
  const vendas = await listAllVendas(userId);

  return vendas.reduce(
    (acc, venda) => {
      const item = venda.itens?.[0];
      const fallbackTotal =
        Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
      const valor = Number(venda.valorTotal || fallbackTotal || 0);
      const statusPagamento = venda.statusPagamento;
      const pendente = isReceivableStatus(
        statusPagamento,
        venda.metodoPagamento
      );
      const recebido = isReceivedStatus(statusPagamento);
      const ignorarFinanceiro = statusPagamento === 'cancelado';

      if (!ignorarFinanceiro) {
        acc.totalVendido += valor;
      }
      acc.totalReceber += pendente ? valor : 0;
      acc.totalRecebido += recebido
        ? venda.valorRecebido != null
          ? Number(venda.valorRecebido)
          : valor
        : 0;
      return acc;
    },
    { totalVendido: 0, totalReceber: 0, totalRecebido: 0 }
  );
};
