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
} from 'firebase/firestore';
import { db } from './firebaseConfig';
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

export const createVenda = async (data: VendaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  validateVendaFormData(data);
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
};

export const getVendaById = async (id: string, userId: string): Promise<Venda | null> => {
  const tenantId = assertTenantId(userId);
  const ref = doc(db, 'vendas', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as Venda;
  if (data.tenantId !== tenantId && data.userId !== tenantId) throw new Error('Acesso negado.');
  return { ...data, id: snap.id };
};

export const updateVenda = async (id: string, data: VendaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  validateVendaFormData(data);
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
};

export const deleteVenda = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const venda = await getVendaById(id, tenantId);
  if (!venda) throw new Error('Venda não encontrada.');
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
};

export const listAllVendas = async (userId: string): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
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
  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(
      query(collection(db, 'vendas'), where('tenantId', '==', tenantId), where('plantioId', '==', plantioId))
    ),
    getDocs(query(collection(db, 'vendas'), where('userId', '==', tenantId), where('plantioId', '==', plantioId))),
  ]);

  return mergeVendaDocs([tenantSnap, legacySnap])
    .sort((a, b) => (b.dataVenda?.seconds || 0) - (a.dataVenda?.seconds || 0));
};

export const receberVenda = async (vendaId: string, userId: string, metodoRecebimento?: string) => {
  const tenantId = assertTenantId(userId);
  const venda = await getVendaById(vendaId, tenantId);
  if (!venda) throw new Error('Registro não encontrado.');

  await updateDoc(doc(db, 'vendas', vendaId), {
    statusPagamento: 'pago',
    formaPagamento: (metodoRecebimento || venda.formaPagamento || 'pix') as Venda['formaPagamento'],
    metodoPagamento: metodoRecebimento || venda.metodoPagamento || 'pix',
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
};

export const listContasAReceber = async (userId: string): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
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
