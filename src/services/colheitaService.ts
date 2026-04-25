import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  writeBatch,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Colheita, Plantio, Venda } from '../types/domain';
import { getPlantioById } from './plantioService';
import {
  createVenda,
  deleteVenda,
  getTotalContasAReceber as getTotalContasAReceberVendas,
  getVendaById,
  listAllVendas,
  listContasAReceber as listContasAReceberVendas,
  receberVenda,
  updateVenda,
  VendaFormData,
} from './vendaService';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

export type ColheitaFormData = {
  quantidade: number;
  unidade: string;
  precoUnitario: number | null;
  destino: Colheita['destino'];
  clienteId: string | null;
  metodoPagamento: string | null;
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

const findVendaByColheitaId = async (tenantId: string, colheitaId: string): Promise<Venda | null> => {
  const q = query(
    collection(db, 'vendas'),
    where('tenantId', '==', tenantId),
    where('colheitaId', '==', colheitaId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const item = snap.docs[0];
  return { ...(item.data() as Venda), id: item.id };
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
  options: ColheitaSaveOptions = {}
) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();
  const dataOperacao = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : now;
  let vendaCriadaId: string | null = null;
  let vendaStatusPagamento: Venda['statusPagamento'] | null = null;

  const plantio = await getPlantioById(plantioId, tenantId);
  if (!plantio) throw new Error('Plantio não encontrado.');
  const isEarlyCycleSale = data.destino === 'venda_direta' && isSaleBeforeMinimumCycleDate(plantio, dataOperacao);
  const hasCycleUnlock = options.allowBeforeCycleDays || !!plantio.cicloDesbloqueadoPorAdmin;
  if (isEarlyCycleSale && !hasCycleUnlock) {
    validateSaleDateByCycle(plantio, dataOperacao);
  }

  const batch = writeBatch(db);
  const overrideAudit = isEarlyCycleSale
    ? buildOverrideAudit(options, now) || buildPlantioUnlockAudit(plantio)
    : null;

  // 1. Criar a Colheita
  const colheitaRef = doc(collection(db, 'colheitas'));
  const novaColheita: Omit<Colheita, 'id'> = {
    tenantId,
    userId: tenantId,
    createdBy: tenantId,
    plantioId,
    estufaId,
    dataColheita: dataOperacao,
    quantidade: Number(data.quantidade || 0),
    unidade: data.unidade,
    unidadeMedida: data.unidade as Colheita['unidadeMedida'],
    qualidade: 'padrao',
    loteColheita: `COL-${plantioId.slice(0, 6)}-${dataOperacao.toMillis()}`,
    destino: data.destino || 'venda_direta',
    observacoes: data.observacoes || '',
    pesoBruto: Number(data.pesoBruto || 0),
    pesoLiquido: Number(data.pesoLiquido || 0),
    createdAt: now,
    updatedAt: now,
    ...(overrideAudit || {}),
  };

  batch.set(colheitaRef, novaColheita);

  // 2. Se o destino for venda, criar a Venda vinculada
  if (data.destino === 'venda_direta') {
    const vendaRef = doc(collection(db, 'vendas'));
    const valorTotal = Number(data.quantidade || 0) * Number(data.precoUnitario || 0);
    const statusPagamento = data.metodoPagamento === 'prazo' ? 'pendente' : 'pago';
    vendaCriadaId = vendaRef.id;
    vendaStatusPagamento = statusPagamento;

    const novaVenda: Omit<Venda, 'id'> = {
      tenantId,
      userId: tenantId,
      createdBy: tenantId,
      plantioId,
      estufaId,
      colheitaId: colheitaRef.id,
      clienteId: data.clienteId || null,
      dataVenda: dataOperacao,
      dataVencimento: statusPagamento === 'pendente'
        ? Timestamp.fromMillis(dataOperacao.toMillis() + 15 * 24 * 60 * 60 * 1000)
        : null,
      itens: [{
        colheitaId: colheitaRef.id,
        descricao: 'Produção agrícola',
        quantidade: Number(data.quantidade || 0),
        unidade: data.unidade,
        valorUnitario: Number(data.precoUnitario || 0),
      }],
      valorTotal,
      statusPagamento,
      formaPagamento: (data.metodoPagamento || 'pix') as Venda['formaPagamento'],
      metodoPagamento: data.metodoPagamento || 'pix',
      observacoes: data.observacoes || '',
      ...(overrideAudit || {}),
      createdAt: now,
      updatedAt: now,
    };

    batch.set(vendaRef, novaVenda);
  }

  // 3. Atualizar Status do Plantio
  const plantioRef = doc(db, 'plantios', plantioId);
  const nextStatus = data.isFinalHarvest ? 'finalizado' : 'em_colheita';
  batch.update(plantioRef, {
    status: nextStatus,
    updatedAt: now,
  });

  await batch.commit();

  await createTraceabilityEventSafely(tenantId, {
    plantioId,
    estufaId: estufaId || null,
    entidade: 'colheita',
    entidadeId: colheitaRef.id,
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
      loteColheita: novaColheita.loteColheita || null,
      precoUnitario: Number(data.precoUnitario || 0),
      clienteId: data.clienteId || null,
      metodoPagamento: data.metodoPagamento || null,
      cicloDesbloqueadoPorAdmin: !!overrideAudit,
    },
  });

  if (vendaCriadaId) {
    await createTraceabilityEventSafely(tenantId, {
      plantioId,
      estufaId: estufaId || null,
      entidade: 'venda',
      entidadeId: vendaCriadaId,
      acao: overrideAudit ? 'desbloqueio_ciclo' : 'criado',
      descricao: 'Venda criada a partir da colheita.',
      motivo: overrideAudit?.desbloqueioAdminReason || null,
      actorUid: overrideAudit?.desbloqueioAdminByUid || tenantId,
      actorName: overrideAudit?.desbloqueioAdminByName || null,
      metadata: {
        colheitaId: colheitaRef.id,
        quantidade: Number(data.quantidade || 0),
        unidade: data.unidade,
        precoUnitario: Number(data.precoUnitario || 0),
        clienteId: data.clienteId || null,
        metodoPagamento: data.metodoPagamento || 'pix',
        statusPagamento: vendaStatusPagamento,
      },
    });
  }

  return colheitaRef.id;
};

export const listColheitasByPlantio = async (userId: string, plantioId: string): Promise<Colheita[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'colheitas'),
    where('tenantId', '==', tenantId),
    where('plantioId', '==', plantioId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((item) => ({ ...(item.data() as Colheita), id: item.id }))
    .sort((a, b) => (b.dataColheita?.seconds || 0) - (a.dataColheita?.seconds || 0));
};

export const listAllColheitas = async (userId: string): Promise<Colheita[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(collection(db, 'colheitas'), where('tenantId', '==', tenantId));
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ ...(d.data() as Colheita), id: d.id }))
    .sort((a, b) => (b.dataColheita?.seconds || 0) - (a.dataColheita?.seconds || 0));
};

export const getColheitaById = async (id: string, userId: string): Promise<Colheita & { precoUnitario?: number; clienteId?: string | null; statusPagamento?: string } | null> => {
  const tenantId = assertTenantId(userId);
  const docRef = doc(db, 'colheitas', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data() as Colheita;
  if (data.tenantId !== tenantId && data.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }

  const linkedVenda = await findVendaByColheitaId(tenantId, id);

  return {
    id: docSnap.id,
    ...data,
    precoUnitario: linkedVenda?.itens?.[0]?.valorUnitario || 0,
    clienteId: linkedVenda?.clienteId || null,
    statusPagamento: linkedVenda?.statusPagamento,
  };
};

export const deleteColheita = async (colheitaId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  let deletedColheitaPlantioId: string | null = null;
  let deletedColheitaEstufaId: string | null = null;
  const linkedVendasDeleted: Array<{
    id: string;
    valorTotal: number;
    statusPagamento: string | null;
  }> = [];

  return runTransaction(db, async (transaction) => {
    const colheitaRef = doc(db, 'colheitas', colheitaId);
    const colheitaSnap = await transaction.get(colheitaRef);
    if (!colheitaSnap.exists()) throw new Error('Colheita não encontrada.');
    const colheitaData = colheitaSnap.data() as Colheita;
    deletedColheitaPlantioId = colheitaData.plantioId;
    deletedColheitaEstufaId = colheitaData.estufaId || null;

    // Buscar venda vinculada
    const q = query(
      collection(db, 'vendas'),
      where('tenantId', '==', tenantId),
      where('colheitaId', '==', colheitaId)
    );
    const vendaSnap = await getDocs(q);

    vendaSnap.forEach((vDoc) => {
      const vendaData = vDoc.data() as Venda;
      linkedVendasDeleted.push({
        id: vDoc.id,
        valorTotal: Number(vendaData.valorTotal || 0),
        statusPagamento: vendaData.statusPagamento || null,
      });
      transaction.delete(vDoc.ref);
    });

    transaction.delete(colheitaRef);
  }).then(async () => {
    if (!deletedColheitaPlantioId) return;
    await createTraceabilityEventSafely(tenantId, {
      plantioId: deletedColheitaPlantioId,
      estufaId: deletedColheitaEstufaId,
      entidade: 'colheita',
      entidadeId: colheitaId,
      acao: 'excluido',
      descricao: 'Colheita excluída.',
      actorUid: tenantId,
      metadata: {
        linkedVendasDeleted: linkedVendasDeleted.length,
      },
    });

    await Promise.all(
      linkedVendasDeleted.map((venda) =>
        createTraceabilityEventSafely(tenantId, {
          plantioId: deletedColheitaPlantioId as string,
          estufaId: deletedColheitaEstufaId || null,
          entidade: 'venda',
          entidadeId: venda.id,
          acao: 'excluido',
          descricao: 'Venda excluída por remoção da colheita vinculada.',
          actorUid: tenantId,
          metadata: {
            colheitaId,
            valorTotal: venda.valorTotal,
            statusPagamento: venda.statusPagamento,
          },
        })
      )
    );
  });
};

export const updateColheita = async (
  id: string,
  data: ColheitaFormData,
  userId: string,
  options: ColheitaSaveOptions = {}
) => {
  const tenantId = assertTenantId(userId);
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
  const overrideAudit = isEarlyCycleSale
    ? buildOverrideAudit(options, now) || buildPlantioUnlockAudit(plantio)
    : null;

  await updateDoc(doc(db, 'colheitas', id), {
    dataColheita: dataOperacao,
    quantidade: Number(data.quantidade || 0),
    unidade: data.unidade,
    unidadeMedida: data.unidade as Colheita['unidadeMedida'],
    destino: data.destino || 'venda_direta',
    observacoes: data.observacoes || '',
    pesoBruto: Number(data.pesoBruto || 0),
    pesoLiquido: Number(data.pesoLiquido || 0),
    ...(overrideAudit || {
      cicloDesbloqueadoPorAdmin: false,
      desbloqueioAdminByUid: null,
      desbloqueioAdminByName: null,
      desbloqueioAdminAt: null,
      desbloqueioAdminReason: null,
    }),
    updatedAt: now,
  });

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
      dataVenda: data.dataVenda,
      observacoes: data.observacoes || '',
      cycleOverrideAudit: overrideAudit
        ? {
            byUid: overrideAudit.desbloqueioAdminByUid,
            byName: overrideAudit.desbloqueioAdminByName,
            at: now.toDate(),
            reason: overrideAudit.desbloqueioAdminReason,
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
};

// Wrappers financeiros para compatibilidade
export const listContasAReceber = async (userId: string) => listContasAReceberVendas(userId);
export const receberConta = async (vendaId: string, userId: string, metodoRecebimento?: string) =>
  receberVenda(vendaId, userId, metodoRecebimento);
export const getTotalContasAReceber = async (userId: string) => getTotalContasAReceberVendas(userId);
