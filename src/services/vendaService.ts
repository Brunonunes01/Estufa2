import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Venda } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

export interface VendaFormData {
  plantioId: string;
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

const toStatusPagamento = (metodoPagamento?: string | null): Venda['statusPagamento'] => {
  if (metodoPagamento === 'prazo') return 'pendente';
  return 'pago';
};

const buildVendaPayload = (data: VendaFormData, tenantId: string) => {
  const dataVenda = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : Timestamp.now();
  const statusPagamento = toStatusPagamento(data.metodoPagamento);

  const vencimento =
    statusPagamento === 'pendente'
      ? Timestamp.fromMillis(dataVenda.toMillis() + 15 * 24 * 60 * 60 * 1000)
      : null;

  const valorTotal = Number(data.quantidade || 0) * Number(data.precoUnitario || 0);

  return {
    tenantId,
    userId: tenantId, // Mantido por retrocompatibilidade com regras antigas
    createdBy: tenantId,
    plantioId: data.plantioId,
    estufaId: data.estufaId,
    colheitaId: data.colheitaId,
    clienteId: data.clienteId || null,
    dataVenda,
    dataVencimento: vencimento,
    itens: [
      {
        colheitaId: data.colheitaId,
        descricao: 'Produção agrícola',
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
  const payload = buildVendaPayload(data, tenantId);
  const ref = await addDoc(collection(db, 'vendas'), payload);

  await createTraceabilityEventSafely(tenantId, {
    plantioId: data.plantioId,
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
      cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
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
  const venda = await getVendaById(id, tenantId);
  if (!venda) throw new Error('Venda não encontrada.');

  const payload = buildVendaPayload(data, tenantId);
  await updateDoc(doc(db, 'vendas', id), {
    ...payload,
    createdAt: venda.createdAt,
    updatedAt: Timestamp.now(),
  });

  const plantioId = data.plantioId || venda.plantioId;
  if (plantioId) {
    await createTraceabilityEventSafely(tenantId, {
      plantioId,
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
        cicloDesbloqueadoPorAdmin: !!data.cycleOverrideAudit,
      },
    });
  }
};

export const deleteVenda = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const venda = await getVendaById(id, tenantId);
  if (!venda) throw new Error('Venda não encontrada.');
  await deleteDoc(doc(db, 'vendas', id));

  if (venda.plantioId) {
    await createTraceabilityEventSafely(tenantId, {
      plantioId: venda.plantioId,
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
      },
    });
  }
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

  if (venda.plantioId) {
    await createTraceabilityEventSafely(tenantId, {
      plantioId: venda.plantioId,
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
      },
    });
  }
};

export const listContasAReceber = async (userId: string): Promise<Venda[]> => {
  const tenantId = assertTenantId(userId);
  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(
      query(collection(db, 'vendas'), where('tenantId', '==', tenantId), where('statusPagamento', '==', 'pendente'))
    ),
    getDocs(
      query(collection(db, 'vendas'), where('userId', '==', tenantId), where('statusPagamento', '==', 'pendente'))
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
      const pendente =
        venda.statusPagamento === 'pendente' ||
        (!venda.statusPagamento && venda.metodoPagamento === 'prazo');

      acc.totalVendido += valor;
      acc.totalReceber += pendente ? valor : 0;
      acc.totalRecebido += pendente ? 0 : valor;
      return acc;
    },
    { totalVendido: 0, totalReceber: 0, totalRecebido: 0 }
  );
};
