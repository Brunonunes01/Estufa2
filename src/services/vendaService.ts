import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from '../compat/legacyDataApi';
import { db } from './removedBackend';
import { Venda } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';
import { triggerExternalDashboardSync } from './externalAutomationService';
import { getClienteById } from './clienteService';
import {
  buildPublicTraceabilityLookupUrl,
  createTraceabilityPublicTokenFromId,
} from './publicTraceabilityService';
import { syncHydroLoteStatus } from '../modules/hidroponia/services/hidroponiaLoteService';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

export interface VendaFormData {
  plantioId?: string;
  hydroLoteId?: string;
  originType?: Venda['originType'];
  originId?: string | null;
  itemDescricao?: string | null;
  cultura?: string | null;
  estufaId?: string;
  clienteId?: string | null;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  metodoPagamento?: string | null;
  pagamentoPara?: string | null;
  dataVenda?: Date;
  observacoes?: string | null;
  colheitaId?: string;
  cycleOverrideAudit?: {
    byUid: string;
    byName?: string | null;
    at?: Date;
    reason?: string | null;
  } | null;
}

const tsFromIso = (value?: string | null) => (value ? Timestamp.fromDate(new Date(value)) : undefined);

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
    originType: row.origin_type || undefined,
    originId: row.origin_id || null,
    hydroLoteId: row.hydro_lote_id || null,
    traceabilityPublicToken: row.traceability_public_token || null,
    traceabilityPublicUrl: row.traceability_public_url || null,
    estufaId: row.estufa_id || undefined,
    colheitaId: row.colheita_id || undefined,
    clienteId: row.cliente_id || null,
    dataVenda: Timestamp.fromDate(new Date(row.data_venda)),
    dataVencimento: tsFromIso(row.data_vencimento) || null,
    itens,
    valorTotal: Number(row.valor_total || 0),
    statusPagamento: row.status_pagamento,
    formaPagamento: row.forma_pagamento || undefined,
    metodoPagamento: row.metodo_pagamento || null,
    pagamentoPara: row.pagamento_para || null,
    observacoes: row.observacoes || undefined,
    quantidade: row.quantidade != null ? Number(row.quantidade) : fallbackItem?.quantidade,
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
  traceabilityPublicToken?: string
) => {
  const dataVenda = data.dataVenda ? data.dataVenda.toISOString() : new Date().toISOString();
  const statusPagamento = toStatusPagamento(data.metodoPagamento);
  const originType: Venda['originType'] =
    data.originType || (data.hydroLoteId ? 'hydro_lote' : 'plantio');
  const originId =
    data.originId !== undefined
      ? data.originId
      : originType === 'hydro_lote'
      ? data.hydroLoteId || null
      : data.plantioId || null;

  const vencimento =
    statusPagamento === 'pendente'
      ? new Date(new Date(dataVenda).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const valorTotal = Number(data.quantidade || 0) * Number(data.precoUnitario || 0);
  const token = traceabilityPublicToken || null;
  const traceabilityPublicUrl = token ? buildPublicTraceabilityLookupUrl(token) || null : null;

  return {
    venda: {
      tenant_id: tenantId,
      plantio_id: data.plantioId || null,
      hydro_lote_id: data.hydroLoteId || null,
      traceability_public_token: token,
      traceability_public_url: traceabilityPublicUrl,
      origin_type: originType,
      origin_id: originId,
      estufa_id: data.estufaId || null,
      colheita_id: data.colheitaId || null,
      cliente_id: data.clienteId || null,
      data_venda: dataVenda,
      data_vencimento: vencimento,
      valor_total: valorTotal,
      status_pagamento: statusPagamento,
      forma_pagamento: data.metodoPagamento || 'pix',
      metodo_pagamento: data.metodoPagamento || 'pix',
      pagamento_para: data.pagamentoPara || null,
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
      descricao:
        data.itemDescricao?.trim() ||
        (originType === 'hydro_lote' ? 'Produção hidropônica' : 'Produção agrícola'),
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

const resolveCompradorTrace = async (tenantId: string, clienteId?: string | null) => {
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

const toStatusPagamento = (metodoPagamento?: string | null): Venda['statusPagamento'] => {
  if (metodoPagamento === 'prazo') return 'pendente';
  return 'pago';
};

const isReceivableStatus = (status?: Venda['statusPagamento'] | null, metodoPagamento?: string | null) =>
  status === 'pendente' || status === 'atrasado' || (!status && metodoPagamento === 'prazo');

const isReceivedStatus = (status?: Venda['statusPagamento'] | null) => status === 'pago';

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
  if (!data.unidade?.trim()) {
    throw new Error('Informe a unidade da venda.');
  }
};

const buildVendaPayload = (
  data: VendaFormData,
  tenantId: string,
  traceabilityPublicToken?: string
) => {
  const dataVenda = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : Timestamp.now();
  const statusPagamento = toStatusPagamento(data.metodoPagamento);
  const originType: Venda['originType'] =
    data.originType || (data.hydroLoteId ? 'hydro_lote' : 'plantio');
  const originId =
    data.originId !== undefined
      ? data.originId
      : originType === 'hydro_lote'
      ? data.hydroLoteId || null
      : data.plantioId || null;
  const itemDescricao =
    data.itemDescricao?.trim() ||
    (originType === 'hydro_lote' ? 'Produção hidropônica' : 'Produção agrícola');

  const vencimento =
    statusPagamento === 'pendente'
      ? Timestamp.fromMillis(dataVenda.toMillis() + 15 * 24 * 60 * 60 * 1000)
      : null;

  const valorTotal = Number(data.quantidade || 0) * Number(data.precoUnitario || 0);
  const token = traceabilityPublicToken || null;
  const traceabilityPublicUrl = token ? buildPublicTraceabilityLookupUrl(token) || null : null;

  return {
    tenantId,
    userId: tenantId, // Mantido por retrocompatibilidade com regras antigas
    createdBy: tenantId,
    plantioId: data.plantioId || null,
    hydroLoteId: data.hydroLoteId || null,
    traceabilityPublicToken: token,
    traceabilityPublicUrl,
    originType,
    originId,
    estufaId: data.estufaId,
    colheitaId: data.colheitaId,
    clienteId: data.clienteId || null,
    dataVenda,
    dataVencimento: vencimento,
    itens: [
      {
        colheitaId: data.colheitaId,
        descricao: itemDescricao,
        quantidade: Number(data.quantidade || 0),
        unidade: data.unidade,
        valorUnitario: Number(data.precoUnitario || 0),
      },
    ],
    valorTotal,
    statusPagamento,
    formaPagamento: (data.metodoPagamento || 'pix') as Venda['formaPagamento'],
    metodoPagamento: data.metodoPagamento || 'pix',
    pagamentoPara: data.pagamentoPara || null,
    observacoes: data.observacoes || '',
    cultura: data.cultura || null,
    cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
    desbloqueioAdminByUid: data.cycleOverrideAudit?.byUid || null,
    desbloqueioAdminByName: data.cycleOverrideAudit?.byName || null,
    desbloqueioAdminAt: data.cycleOverrideAudit?.at ? Timestamp.fromDate(data.cycleOverrideAudit.at) : null,
    desbloqueioAdminReason: data.cycleOverrideAudit?.reason || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),

    // Campos auxiliares para compatibilidade de telas legadas
    quantidade: Number(data.quantidade || 0),
    unidade: data.unidade,
    precoUnitario: Number(data.precoUnitario || 0),
  };
};

const mergeVendaDocs = (snaps: Awaited<ReturnType<typeof getDocs>>[]): Venda[] => {
  const vendasMap = new Map<string, Venda>();
  snaps.forEach((snap) => {
    snap.docs.forEach((document) => {
      vendasMap.set(document.id, { ...(document.data() as Venda), id: document.id });
    });
  });
  return Array.from(vendasMap.values());
};

export const createVenda = async (data: VendaFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createVenda',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      validateVendaFormData(data);

      if (isSupabaseBackend()) {
        const supabase = getSupabaseClient();
        const traceabilityPublicToken = createTraceabilityPublicTokenFromId(`${Date.now()}_${Math.random()}`);
        const payload = buildSupabaseVendaPayload(data, tenantId, traceabilityPublicToken);

        const { data: inserted, error } = await supabase
          .from('vendas')
          .insert(payload.venda)
          .select('id')
          .single();
        if (error || !inserted?.id) {
          throw new Error(`Não foi possível criar venda. ${error?.message || ''}`.trim());
        }

        const { error: itemError } = await supabase.from('venda_itens').insert({
          tenant_id: tenantId,
          venda_id: inserted.id,
          ...payload.item,
        });
        if (itemError) throw new Error(`Erro ao salvar itens da venda. ${itemError.message}`);

        const tracePlantioId = data.plantioId || null;
        const traceHydroLoteId =
          data.hydroLoteId || (data.originType === 'hydro_lote' ? data.originId || null : null);
        const compradorTrace = await resolveCompradorTrace(tenantId, data.clienteId || null);

        await createTraceabilityEventSafely(tenantId, {
          plantioId: tracePlantioId,
          hydroLoteId: traceHydroLoteId,
          estufaId: data.estufaId || null,
          entidade: 'venda',
          entidadeId: inserted.id,
          acao: data.cycleOverrideAudit ? 'desbloqueio_ciclo' : 'criado',
          descricao: 'Venda registrada.',
          motivo: data.cycleOverrideAudit?.reason || null,
          actorUid: data.cycleOverrideAudit?.byUid || tenantId,
          actorName: data.cycleOverrideAudit?.byName || null,
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
            traceabilityPublicToken: payload.venda.traceability_public_token || null,
            traceabilityPublicUrl: payload.venda.traceability_public_url || null,
            cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
            produto: {
              descricao: payload.item.descricao || data.itemDescricao || null,
              quantidade: Number(payload.item.quantidade || data.quantidade || 0),
              unidade: payload.item.unidade || data.unidade || null,
              codigoRastreio: traceHydroLoteId || tracePlantioId || inserted.id,
            },
            enteAnterior: {
              nome: payload.venda.origin_type === 'hydro_lote' ? 'Produção hidropônica' : 'Produção agrícola',
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
      }

      const ref = doc(collection(db, 'vendas'));
      const traceabilityPublicToken = createTraceabilityPublicTokenFromId(ref.id);
      const payload = buildVendaPayload(data, tenantId, traceabilityPublicToken);
      await setDoc(ref, payload);
      const tracePlantioId = data.plantioId || null;
      const traceHydroLoteId =
        data.hydroLoteId || (data.originType === 'hydro_lote' ? data.originId || null : null);
      const compradorTrace = await resolveCompradorTrace(tenantId, data.clienteId || null);
      const item = payload.itens?.[0];

      await createTraceabilityEventSafely(tenantId, {
        plantioId: tracePlantioId,
        hydroLoteId: traceHydroLoteId,
        estufaId: data.estufaId || null,
        entidade: 'venda',
        entidadeId: ref.id,
        acao: data.cycleOverrideAudit ? 'desbloqueio_ciclo' : 'criado',
        descricao: 'Venda registrada.',
        motivo: data.cycleOverrideAudit?.reason || null,
        actorUid: data.cycleOverrideAudit?.byUid || tenantId,
        actorName: data.cycleOverrideAudit?.byName || null,
        metadata: {
          valorTotal: payload.valorTotal,
          statusPagamento: payload.statusPagamento,
          colheitaId: data.colheitaId || null,
          quantidade: Number(data.quantidade || 0),
          unidade: data.unidade || null,
          precoUnitario: Number(data.precoUnitario || 0),
          metodoPagamento: data.metodoPagamento || 'pix',
          pagamentoPara: data.pagamentoPara || null,
          clienteId: data.clienteId || null,
          originType: payload.originType || null,
          originId: payload.originId || null,
          traceabilityPublicToken: payload.traceabilityPublicToken || null,
          traceabilityPublicUrl: payload.traceabilityPublicUrl || null,
          cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
          produto: {
            descricao: item?.descricao || data.itemDescricao || null,
            quantidade: Number(item?.quantidade || data.quantidade || 0),
            unidade: item?.unidade || data.unidade || null,
            codigoRastreio: traceHydroLoteId || tracePlantioId || ref.id,
          },
          enteAnterior: {
            nome: payload.originType === 'hydro_lote' ? 'Produção hidropônica' : 'Produção agrícola',
            documento: payload.originId || null,
            tipo: payload.originType || null,
          },
          entePosterior: compradorTrace,
        },
      });

      await triggerExternalDashboardSync({
        tenantId,
        entity: 'venda',
        action: 'create',
        recordId: ref.id,
        metadata: {
          statusPagamento: payload.statusPagamento,
          originType: payload.originType || null,
          originId: payload.originId || null,
          valorTotal: payload.valorTotal,
        },
      });

      return ref.id;
    },
  });
};

export const getVendaById = async (id: string, userId: string): Promise<Venda | null> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('vendas')
      .select('*, venda_itens(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw new Error(`Erro ao buscar venda: ${error.message}`);
    return data ? mapSupabaseVendaToDomain(data) : null;
  }

  const ref = doc(db, 'vendas', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as Venda;
  if (data.tenantId !== tenantId && data.userId !== tenantId) throw new Error('Acesso negado.');
  return { ...data, id: snap.id };
};

export const updateVenda = async (id: string, data: VendaFormData, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'updateVenda',
    payload: { id, data, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      validateVendaFormData(data);

      if (isSupabaseBackend()) {
        const supabase = getSupabaseClient();
        const venda = await getVendaById(id, tenantId);
        if (!venda) throw new Error('Venda não encontrada.');
        const hydroAllocations = Array.isArray((venda as any).hydroAllocations)
          ? ((venda as any).hydroAllocations as unknown[])
          : [];
        if (hydroAllocations.length > 0) {
          const previousQuantidade = Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0);
          const previousUnidade = String((venda as any).unidade || venda.itens?.[0]?.unidade || '');
          const previousLoteId = String((venda as any).hydroLoteId || venda.originId || '');
          const nextLoteId = String(data.hydroLoteId || data.originId || previousLoteId);
          if (
            Number(data.quantidade || 0) !== previousQuantidade ||
            String(data.unidade || '') !== previousUnidade ||
            nextLoteId !== previousLoteId
          ) {
            throw new Error(
              'Venda hidropônica com baixa de saldo não pode alterar quantidade, unidade ou produção. Exclua a venda para estornar o saldo e registre novamente.'
            );
          }
        }

        const merged = {
          ...data,
          plantioId: data.plantioId ?? venda.plantioId ?? undefined,
          hydroLoteId: data.hydroLoteId ?? venda.hydroLoteId ?? undefined,
          originType: data.originType ?? venda.originType,
          originId: data.originId !== undefined ? data.originId : venda.originId ?? null,
          estufaId: data.estufaId ?? venda.estufaId,
          clienteId: data.clienteId !== undefined ? data.clienteId : venda.clienteId ?? null,
          pagamentoPara:
            data.pagamentoPara !== undefined ? data.pagamentoPara : (venda as any).pagamentoPara ?? null,
          colheitaId: data.colheitaId ?? venda.colheitaId ?? undefined,
        } as VendaFormData;
        const payload = buildSupabaseVendaPayload(merged, tenantId, venda.traceabilityPublicToken || undefined);

        const { error: updateError } = await supabase
          .from('vendas')
          .update({
            ...payload.venda,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (updateError) throw new Error(`Erro ao atualizar venda: ${updateError.message}`);

        const { error: deleteItensError } = await supabase.from('venda_itens').delete().eq('venda_id', id).eq('tenant_id', tenantId);
        if (deleteItensError) throw new Error(`Erro ao atualizar item da venda: ${deleteItensError.message}`);
        const { error: itemError } = await supabase.from('venda_itens').insert({
          tenant_id: tenantId,
          venda_id: id,
          ...payload.item,
        });
        if (itemError) throw new Error(`Erro ao atualizar item da venda: ${itemError.message}`);

        const plantioId = merged.plantioId || venda.plantioId || null;
        const hydroLoteId = merged.hydroLoteId || (venda as any).hydroLoteId || null;
        const compradorTrace = await resolveCompradorTrace(
          tenantId,
          merged.clienteId || venda.clienteId || null
        );

        await createTraceabilityEventSafely(tenantId, {
          plantioId,
          hydroLoteId,
          estufaId: merged.estufaId || venda.estufaId || null,
          entidade: 'venda',
          entidadeId: id,
          acao: data.cycleOverrideAudit ? 'desbloqueio_ciclo' : 'atualizado',
          descricao: 'Venda atualizada.',
          motivo: data.cycleOverrideAudit?.reason || null,
          actorUid: data.cycleOverrideAudit?.byUid || tenantId,
          actorName: data.cycleOverrideAudit?.byName || null,
          metadata: {
            previousStatusPagamento: venda.statusPagamento,
            valorTotal: payload.venda.valor_total,
            statusPagamento: payload.venda.status_pagamento,
            quantidade: Number(data.quantidade || 0),
            unidade: data.unidade || null,
            precoUnitario: Number(data.precoUnitario || 0),
            metodoPagamento: data.metodoPagamento || payload.venda.metodo_pagamento || 'pix',
            pagamentoPara: merged.pagamentoPara || null,
            clienteId: merged.clienteId || venda.clienteId || null,
            originType: payload.venda.origin_type || (venda as any).originType || null,
            originId: payload.venda.origin_id || (venda as any).originId || null,
            cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
            produto: {
              descricao: payload.item.descricao || data.itemDescricao || null,
              quantidade: Number(payload.item.quantidade || data.quantidade || 0),
              unidade: payload.item.unidade || data.unidade || null,
              codigoRastreio: hydroLoteId || plantioId || id,
            },
            enteAnterior: {
              nome:
                (payload.venda.origin_type || (venda as any).originType) === 'hydro_lote'
                  ? 'Produção hidropônica'
                  : 'Produção agrícola',
              documento: payload.venda.origin_id || (venda as any).originId || null,
              tipo: payload.venda.origin_type || (venda as any).originType || null,
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
        return;
      }

      const venda = await getVendaById(id, tenantId);
      if (!venda) throw new Error('Venda não encontrada.');
      const hydroAllocations = Array.isArray((venda as any).hydroAllocations)
        ? ((venda as any).hydroAllocations as unknown[])
        : [];

  if (hydroAllocations.length > 0) {
    const previousQuantidade = Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0);
    const previousUnidade = String((venda as any).unidade || venda.itens?.[0]?.unidade || '');
    const previousLoteId = String((venda as any).hydroLoteId || venda.originId || '');
    const nextLoteId = String(data.hydroLoteId || data.originId || previousLoteId);

    if (
      Number(data.quantidade || 0) !== previousQuantidade ||
      String(data.unidade || '') !== previousUnidade ||
      nextLoteId !== previousLoteId
    ) {
      throw new Error(
        'Venda hidropônica com baixa de saldo não pode alterar quantidade, unidade ou produção. Exclua a venda para estornar o saldo e registre novamente.'
      );
    }
  }

  const payload = buildVendaPayload(
    {
      ...data,
      plantioId: data.plantioId ?? venda.plantioId ?? undefined,
      hydroLoteId: data.hydroLoteId ?? venda.hydroLoteId ?? undefined,
      originType: data.originType ?? venda.originType,
      originId: data.originId !== undefined ? data.originId : venda.originId ?? null,
      estufaId: data.estufaId ?? venda.estufaId,
      clienteId: data.clienteId !== undefined ? data.clienteId : venda.clienteId ?? null,
      pagamentoPara:
        data.pagamentoPara !== undefined ? data.pagamentoPara : (venda as any).pagamentoPara ?? null,
      colheitaId: data.colheitaId ?? venda.colheitaId ?? undefined,
    },
    tenantId,
    venda.traceabilityPublicToken || undefined
  );
  await updateDoc(doc(db, 'vendas', id), {
    ...payload,
    createdAt: venda.createdAt,
    updatedAt: Timestamp.now(),
  });

  const plantioId = data.plantioId || venda.plantioId || null;
  const hydroLoteId = data.hydroLoteId || (venda as any).hydroLoteId || null;
  const compradorTrace = await resolveCompradorTrace(
    tenantId,
    data.clienteId || venda.clienteId || null
  );
  const item = payload.itens?.[0];
  await createTraceabilityEventSafely(tenantId, {
    plantioId,
    hydroLoteId,
    estufaId: data.estufaId || venda.estufaId || null,
    entidade: 'venda',
    entidadeId: id,
    acao: data.cycleOverrideAudit ? 'desbloqueio_ciclo' : 'atualizado',
    descricao: 'Venda atualizada.',
    motivo: data.cycleOverrideAudit?.reason || null,
    actorUid: data.cycleOverrideAudit?.byUid || tenantId,
    actorName: data.cycleOverrideAudit?.byName || null,
    metadata: {
      previousStatusPagamento: venda.statusPagamento,
      valorTotal: payload.valorTotal,
      statusPagamento: payload.statusPagamento,
      quantidade: Number(data.quantidade || 0),
      unidade: data.unidade || null,
      precoUnitario: Number(data.precoUnitario || 0),
      metodoPagamento: data.metodoPagamento || payload.metodoPagamento || 'pix',
      pagamentoPara: (payload as any).pagamentoPara || (venda as any).pagamentoPara || null,
      clienteId: data.clienteId || venda.clienteId || null,
      originType: payload.originType || (venda as any).originType || null,
      originId: payload.originId || (venda as any).originId || null,
      cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
      produto: {
        descricao: item?.descricao || data.itemDescricao || null,
        quantidade: Number(item?.quantidade || data.quantidade || 0),
        unidade: item?.unidade || data.unidade || null,
        codigoRastreio: hydroLoteId || plantioId || id,
      },
      enteAnterior: {
        nome:
          (payload.originType || (venda as any).originType) === 'hydro_lote'
            ? 'Produção hidropônica'
            : 'Produção agrícola',
        documento: payload.originId || (venda as any).originId || null,
        tipo: payload.originType || (venda as any).originType || null,
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
          statusPagamento: payload.statusPagamento,
          originType: payload.originType || null,
          originId: payload.originId || null,
          valorTotal: payload.valorTotal,
        },
      });
    },
  });
};

export const deleteVenda = async (id: string, userId: string, options?: OfflineWriteOptions) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'deleteVenda',
    payload: { id, userId: tenantId },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const venda = await getVendaById(id, tenantId);
      if (!venda) throw new Error('Venda não encontrada.');
      if (isSupabaseBackend()) {
        const hydroAllocations = Array.isArray((venda as any).hydroAllocations)
          ? ((venda as any).hydroAllocations as unknown[])
          : [];
        if (hydroAllocations.length > 0) {
          throw new Error(
            'Exclusão de venda hidropônica com estorno automático ainda não está habilitada no modo Supabase.'
          );
        }

        const supabase = getSupabaseClient();
        const { error: itemDeleteError } = await supabase
          .from('venda_itens')
          .delete()
          .eq('venda_id', id)
          .eq('tenant_id', tenantId);
        if (itemDeleteError) {
          if (isDeletePermissionError(itemDeleteError)) {
            throw new Error('Sem permissao para excluir itens da venda neste perfil.');
          }
          throw new Error(`Erro ao excluir itens da venda. ${itemDeleteError.message}`);
        }

        const { error: vendaDeleteError } = await supabase
          .from('vendas')
          .delete()
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (vendaDeleteError) {
          if (isDeletePermissionError(vendaDeleteError)) {
            throw new Error('Sem permissao para excluir venda neste perfil.');
          }
          throw new Error(`Erro ao excluir venda. ${vendaDeleteError.message}`);
        }

        await createTraceabilityEventSafely(tenantId, {
          plantioId: venda.plantioId || null,
          hydroLoteId: (venda as any).hydroLoteId || null,
          estufaId: venda.estufaId || null,
          entidade: 'venda',
          entidadeId: id,
          acao: 'excluido',
          descricao: 'Venda excluída.',
          actorUid: tenantId,
          metadata: {
            colheitaId: venda.colheitaId || null,
            clienteId: venda.clienteId || null,
            quantidade: Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0),
            unidade: (venda as any).unidade || null,
            precoUnitario: Number((venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || 0),
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
        return;
      }

      const hydroAllocations = Array.isArray((venda as any).hydroAllocations)
        ? ((venda as any).hydroAllocations as Array<{
            ocupacaoId?: string;
            estruturaId?: string;
            quantidade?: number;
          }>)
        : [];

  await runTransaction(db, async (transaction) => {
    const vendaRef = doc(db, 'vendas', id);
    const vendaSnap = await transaction.get(vendaRef);
    if (!vendaSnap.exists()) throw new Error('Venda não encontrada.');

    const currentVenda = vendaSnap.data() as Venda;
    if (currentVenda.tenantId !== tenantId && currentVenda.userId !== tenantId) {
      throw new Error('Acesso negado.');
    }

    if (hydroAllocations.length > 0) {
      const ocupacoes = [];
      for (const allocation of hydroAllocations) {
        if (!allocation.ocupacaoId) {
          throw new Error('Venda hidropônica sem ocupação de origem para estorno.');
        }
        const ocupacaoRef = doc(db, 'hidroponia_ocupacoes', allocation.ocupacaoId);
        const ocupacaoSnap = await transaction.get(ocupacaoRef);
        if (!ocupacaoSnap.exists()) {
          throw new Error('Não é possível estornar: ocupação original não encontrada.');
        }
        const ocupacao = ocupacaoSnap.data() as any;
        if (ocupacao.tenantId !== tenantId && ocupacao.userId !== tenantId) {
          throw new Error('Acesso negado à ocupação original.');
        }
        ocupacoes.push({ allocation, ocupacao, ocupacaoRef });
      }

      ocupacoes.forEach(({ allocation, ocupacao, ocupacaoRef }) => {
        const quantidadeEstorno = Number(allocation.quantidade || 0);
        if (!Number.isFinite(quantidadeEstorno) || quantidadeEstorno <= 0) {
          throw new Error('Quantidade de estorno inválida.');
        }
        transaction.update(ocupacaoRef, {
          status: 'ativa',
          quantidadeAlocada: Number(ocupacao.quantidadeAlocada || 0) + quantidadeEstorno,
          dataFim: null,
          updatedAt: Timestamp.now(),
        });

        if (allocation.estruturaId && (currentVenda as any).hydroLoteId) {
          transaction.set(doc(db, 'hidroponia_estrutura_locks', `${currentVenda.estufaId}_${allocation.estruturaId}`), {
            tenantId,
            estufaId: currentVenda.estufaId || null,
            estruturaId: allocation.estruturaId,
            loteId: (currentVenda as any).hydroLoteId,
            active: true,
            updatedAt: Timestamp.now(),
          }, { merge: true });
        }
      });
    }

    transaction.delete(vendaRef);
  });

  if (hydroAllocations.length > 0 && (venda as any).hydroLoteId) {
    await syncHydroLoteStatus((venda as any).hydroLoteId, tenantId);
  }

  await createTraceabilityEventSafely(tenantId, {
    plantioId: venda.plantioId || null,
    hydroLoteId: (venda as any).hydroLoteId || null,
    estufaId: venda.estufaId || null,
    entidade: 'venda',
    entidadeId: id,
    acao: 'excluido',
    descricao: 'Venda excluída.',
    actorUid: tenantId,
    metadata: {
      colheitaId: venda.colheitaId || null,
      clienteId: venda.clienteId || null,
      quantidade: Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0),
      unidade: (venda as any).unidade || null,
      precoUnitario: Number((venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || 0),
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
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('vendas')
      .select('*, venda_itens(*)')
      .eq('tenant_id', tenantId)
      .order('data_venda', { ascending: false });
    if (error) throw new Error(`Erro ao listar vendas. ${error.message}`);
    return (data || []).map(mapSupabaseVendaToDomain);
  }

  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(query(collection(db, 'vendas'), where('tenantId', '==', tenantId))),
    getDocs(query(collection(db, 'vendas'), where('userId', '==', tenantId))),
  ]);

  return mergeVendaDocs([tenantSnap, legacySnap])
    .sort((a, b) => (b.dataVenda?.seconds || 0) - (a.dataVenda?.seconds || 0));
};

export const listVendasByMonth = async (userId: string, year: number, month: number): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('vendas')
      .select('*, venda_itens(*)')
      .eq('tenant_id', tenantId)
      .gte('data_venda', startDate.toISOString())
      .lte('data_venda', endDate.toISOString())
      .order('data_venda', { ascending: false });
    if (error) throw new Error(`Erro ao listar vendas do mês. ${error.message}`);
    return (data || []).map(mapSupabaseVendaToDomain);
  }

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'vendas'), 
        where('tenantId', '==', tenantId),
        where('dataVenda', '>=', startTimestamp),
        where('dataVenda', '<=', endTimestamp)
      )
    ),
    getDocs(
      query(
        collection(db, 'vendas'), 
        where('userId', '==', tenantId),
        where('dataVenda', '>=', startTimestamp),
        where('dataVenda', '<=', endTimestamp)
      )
    ),
  ]);

  return mergeVendaDocs([tenantSnap, legacySnap])
    .sort((a, b) => (b.dataVenda?.seconds || 0) - (a.dataVenda?.seconds || 0));
};

export const listVendasByPlantio = async (userId: string, plantioId: string): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('vendas')
      .select('*, venda_itens(*)')
      .eq('tenant_id', tenantId)
      .eq('plantio_id', plantioId)
      .order('data_venda', { ascending: false });
    if (error) throw new Error(`Erro ao listar vendas por plantio. ${error.message}`);
    return (data || []).map(mapSupabaseVendaToDomain);
  }

  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(
      query(collection(db, 'vendas'), where('tenantId', '==', tenantId), where('plantioId', '==', plantioId))
    ),
    getDocs(query(collection(db, 'vendas'), where('userId', '==', tenantId), where('plantioId', '==', plantioId))),
  ]);

  return mergeVendaDocs([tenantSnap, legacySnap])
    .sort((a, b) => (b.dataVenda?.seconds || 0) - (a.dataVenda?.seconds || 0));
};

export const receberVenda = async (
  vendaId: string,
  userId: string,
  metodoRecebimento?: string,
  pagamentoPara?: string | null,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'receberVenda',
    payload: {
      id: vendaId,
      userId: tenantId,
      metodoRecebimento: metodoRecebimento || null,
      pagamentoPara: pagamentoPara || null,
    },
    options,
    onQueuedValue: () => undefined,
    write: async () => {
      const venda = await getVendaById(vendaId, tenantId);
      if (!venda) throw new Error('Registro não encontrado.');

      if (isSupabaseBackend()) {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('vendas')
          .update({
            status_pagamento: 'pago',
            forma_pagamento: (metodoRecebimento || venda.formaPagamento || 'pix') as Venda['formaPagamento'],
            metodo_pagamento: metodoRecebimento || venda.metodoPagamento || 'pix',
            pagamento_para: pagamentoPara || (venda as any).pagamentoPara || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vendaId)
          .eq('tenant_id', tenantId);
        if (error) throw new Error(`Erro ao confirmar recebimento. ${error.message}`);

        await createTraceabilityEventSafely(tenantId, {
          plantioId: venda.plantioId || null,
          hydroLoteId: (venda as any).hydroLoteId || null,
          estufaId: venda.estufaId || null,
          entidade: 'venda',
          entidadeId: vendaId,
          acao: 'recebimento_registrado',
          descricao: 'Recebimento da venda confirmado.',
          actorUid: tenantId,
          metadata: {
            metodoPagamento: metodoRecebimento || venda.metodoPagamento || venda.formaPagamento || 'pix',
            pagamentoPara: pagamentoPara || (venda as any).pagamentoPara || null,
            previousStatusPagamento: venda.statusPagamento,
            newStatusPagamento: 'pago',
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
          },
        });
        return;
      }

      await updateDoc(doc(db, 'vendas', vendaId), {
        statusPagamento: 'pago',
        formaPagamento: (metodoRecebimento || venda.formaPagamento || 'pix') as Venda['formaPagamento'],
        metodoPagamento: metodoRecebimento || venda.metodoPagamento || 'pix',
        pagamentoPara: pagamentoPara || (venda as any).pagamentoPara || null,
        updatedAt: Timestamp.now(),
      });

      await createTraceabilityEventSafely(tenantId, {
        plantioId: venda.plantioId || null,
        hydroLoteId: (venda as any).hydroLoteId || null,
        estufaId: venda.estufaId || null,
        entidade: 'venda',
        entidadeId: vendaId,
        acao: 'recebimento_registrado',
        descricao: 'Recebimento da venda confirmado.',
        actorUid: tenantId,
        metadata: {
          metodoPagamento: metodoRecebimento || venda.metodoPagamento || venda.formaPagamento || 'pix',
          pagamentoPara: pagamentoPara || (venda as any).pagamentoPara || null,
          previousStatusPagamento: venda.statusPagamento,
          newStatusPagamento: 'pago',
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
        },
      });
    },
  });
};

export const listContasAReceber = async (userId: string): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('vendas')
      .select('*, venda_itens(*)')
      .eq('tenant_id', tenantId)
      .in('status_pagamento', ['pendente', 'atrasado'])
      .order('data_venda', { ascending: true });
    if (error) throw new Error(`Erro ao listar contas a receber. ${error.message}`);
    return (data || []).map(mapSupabaseVendaToDomain);
  }

  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'vendas'),
        where('tenantId', '==', tenantId),
        where('statusPagamento', 'in', ['pendente', 'atrasado'])
      )
    ),
    getDocs(
      query(
        collection(db, 'vendas'),
        where('userId', '==', tenantId),
        where('statusPagamento', 'in', ['pendente', 'atrasado'])
      )
    ),
  ]);

  return mergeVendaDocs([tenantSnap, legacySnap])
    .sort((a, b) => (a.dataVenda?.seconds || 0) - (b.dataVenda?.seconds || 0));
};

export const getTotalContasAReceber = async (userId: string): Promise<number> => {
  const contas = await listContasAReceber(userId);
  return contas.reduce((acc, venda) => acc + Number(venda.valorTotal || 0), 0);
};

export const getVendasFinancialSummary = async (userId: string) => {
  const vendas = await listAllVendas(userId);

  return vendas.reduce(
    (acc, venda) => {
      const item = venda.itens?.[0];
      const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
      const valor = Number(venda.valorTotal || fallbackTotal || 0);
      const statusPagamento = venda.statusPagamento;
      const pendente = isReceivableStatus(statusPagamento, venda.metodoPagamento);
      const recebido = isReceivedStatus(statusPagamento);
      const ignorarFinanceiro = statusPagamento === 'cancelado';

      if (!ignorarFinanceiro) {
        acc.totalVendido += valor;
      }
      acc.totalReceber += pendente ? valor : 0;
      acc.totalRecebido += recebido ? valor : 0;
      return acc;
    },
    { totalVendido: 0, totalReceber: 0, totalRecebido: 0 }
  );
};
