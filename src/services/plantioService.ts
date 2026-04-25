import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Plantio } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

export const createPlantio = async (data: Partial<Plantio>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();

  const batch = writeBatch(db);
  const plantioRef = doc(collection(db, 'plantios'));
  const custoInicial = Number(data.custoEstimadoInicial || 0);

  const novoPlantio = {
    ...data,
    tenantId,
    userId: tenantId,
    createdAt: now,
    updatedAt: now,
    safraId: data.safraId || null,
    custoAcumulado: custoInicial,
  };

  batch.set(plantioRef, novoPlantio);

  if (custoInicial > 0) {
    const despesaRef = doc(collection(db, 'despesas'));
    batch.set(despesaRef, {
      tenantId,
      userId: tenantId,
      descricao: `Custo inicial: ${data.cultura} (${data.quantidadePlantada} ${data.unidadeQuantidade})`,
      categoria: 'outro',
      valor: custoInicial,
      dataDespesa: now,
      statusPagamento: 'pago',
      status: 'pago',
      plantioId: plantioRef.id,
      estufaId: data.estufaId || null,
      createdAt: now,
      updatedAt: now,
      tipoGasto: 'investimento_inicial'
    });
  }

  await batch.commit();

  await createTraceabilityEventSafely(tenantId, {
    plantioId: plantioRef.id,
    estufaId: data.estufaId || null,
    entidade: 'plantio',
    entidadeId: plantioRef.id,
    acao: 'criado',
    descricao: `Plantio criado (${data.cultura || 'cultura não informada'}).`,
    actorUid: tenantId,
    metadata: {
      cultura: data.cultura || null,
      status: data.status || null,
      codigoLote: data.codigoLote || null,
      variedade: data.variedade || null,
      safraId: data.safraId || null,
      quantidadePlantada: data.quantidadePlantada || 0,
      unidadeQuantidade: data.unidadeQuantidade || null,
      cicloDias: data.cicloDias || null,
    },
  });

  return plantioRef.id;
};

export const listPlantiosByEstufa = async (userId: string, estufaId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  if (!estufaId) return [];

  const q = query(
    collection(db, 'plantios'),
    where('tenantId', '==', tenantId),
    where('estufaId', '==', estufaId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Plantio));
};

export const getPlantioById = async (plantioId: string, userId: string): Promise<Plantio | null> => {
  const tenantId = assertTenantId(userId);
  const docRef = doc(db, 'plantios', plantioId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as Plantio;
    if (data.tenantId !== tenantId && data.userId !== tenantId) {
      throw new Error('Acesso negado.');
    }
    return { ...data, id: docSnap.id };
  }
  return null;
};

export const updatePlantioStatus = async (
  plantioId: string,
  status: Plantio['status'],
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const plantio = await getPlantioById(plantioId, tenantId);
  if (!plantio) throw new Error('Plantio não encontrado.');

  await updateDoc(doc(db, 'plantios', plantioId), {
    status,
    updatedAt: Timestamp.now(),
  });

  await createTraceabilityEventSafely(tenantId, {
    plantioId,
    estufaId: plantio.estufaId || null,
    entidade: 'plantio',
    entidadeId: plantioId,
    acao: 'status_alterado',
    descricao: `Status do plantio alterado de ${plantio.status} para ${status}.`,
    actorUid: tenantId,
    metadata: {
      previousStatus: plantio.status,
      newStatus: status,
      cultura: plantio.cultura || null,
      codigoLote: plantio.codigoLote || null,
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
  const plantio = await getPlantioById(plantioId, tenantId);
  if (!plantio) throw new Error('Plantio não encontrado.');

  const now = Timestamp.now();
  const payload: Partial<Plantio> = {
    cicloDesbloqueadoPorAdmin: true,
    desbloqueioAdminByUid: audit.byUid,
    desbloqueioAdminByName: audit.byName || null,
    desbloqueioAdminAt: now,
    desbloqueioAdminReason: audit.reason || null,
    updatedAt: now,
  };

  await updateDoc(doc(db, 'plantios', plantioId), payload);

  await createTraceabilityEventSafely(tenantId, {
    plantioId,
    estufaId: plantio.estufaId || null,
    entidade: 'plantio',
    entidadeId: plantioId,
    acao: 'desbloqueio_ciclo',
    descricao: 'Ciclo desbloqueado permanentemente para venda antecipada.',
    motivo: audit.reason || null,
    actorUid: audit.byUid || tenantId,
    actorName: audit.byName || null,
    metadata: {
      cultura: plantio.cultura || null,
      codigoLote: plantio.codigoLote || null,
      cicloDias: plantio.cicloDias || null,
      desbloqueioPermanente: true,
    },
  });

  return payload;
};

export const updatePlantio = async (id: string, data: Partial<Plantio>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const plantio = await getPlantioById(id, tenantId);
  if (!plantio) throw new Error('Plantio não encontrado.');

  const now = Timestamp.now();
  const hasCustoInicialUpdate = Object.prototype.hasOwnProperty.call(data, 'custoEstimadoInicial');
  const nextCustoInicial = hasCustoInicialUpdate ? Number(data.custoEstimadoInicial || 0) : null;
  const prevCustoInicial = Number(plantio.custoEstimadoInicial || 0);

  const payload: Partial<Plantio> & { updatedAt: Timestamp } = {
    ...data,
    updatedAt: now,
  };

  if (hasCustoInicialUpdate) {
    const custoAcumuladoAtual = Number(plantio.custoAcumulado || 0);
    const delta = (nextCustoInicial || 0) - prevCustoInicial;
    payload.custoAcumulado = Math.max(0, custoAcumuladoAtual + delta);
    payload.custoEstimadoInicial = nextCustoInicial && nextCustoInicial > 0 ? nextCustoInicial : null;
  }

  await updateDoc(doc(db, 'plantios', id), payload);

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
        custoEstimadoInicial: Number(plantio.custoEstimadoInicial || 0),
      },
      after: {
        cultura: data.cultura ?? plantio.cultura ?? null,
        variedade: data.variedade ?? plantio.variedade ?? null,
        status: data.status ?? plantio.status ?? null,
        codigoLote: data.codigoLote ?? plantio.codigoLote ?? null,
        custoEstimadoInicial: Number(
          Object.prototype.hasOwnProperty.call(data, 'custoEstimadoInicial')
            ? data.custoEstimadoInicial || 0
            : plantio.custoEstimadoInicial || 0
        ),
      },
    },
  });

  if (!hasCustoInicialUpdate) return;

  const despesasSnap = await getDocs(
    query(collection(db, 'despesas'), where('tenantId', '==', tenantId), where('plantioId', '==', id))
  );
  const investimentoInicialDoc = despesasSnap.docs.find(
    (item) => (item.data() as any).tipoGasto === 'investimento_inicial'
  );

  const culturaLabel = data.cultura || plantio.cultura || 'Plantio';
  const quantidadeLabel = Number(data.quantidadePlantada ?? plantio.quantidadePlantada ?? 0);
  const unidadeLabel = data.unidadeQuantidade || plantio.unidadeQuantidade || 'un';
  const descricao = `Custo inicial: ${culturaLabel} (${quantidadeLabel} ${unidadeLabel})`;
  const estufaId = data.estufaId || plantio.estufaId || null;

  if ((nextCustoInicial || 0) > 0) {
    if (investimentoInicialDoc) {
      await updateDoc(doc(db, 'despesas', investimentoInicialDoc.id), {
        descricao,
        valor: nextCustoInicial,
        estufaId,
        statusPagamento: 'pago',
        status: 'pago',
        updatedAt: now,
        tipoGasto: 'investimento_inicial',
      });
    } else {
      await addDoc(collection(db, 'despesas'), {
        tenantId,
        userId: tenantId,
        descricao,
        categoria: 'outro',
        valor: nextCustoInicial,
        dataDespesa: now,
        statusPagamento: 'pago',
        status: 'pago',
        plantioId: id,
        estufaId,
        createdAt: now,
        updatedAt: now,
        tipoGasto: 'investimento_inicial',
      });
    }
    return;
  }

  if (investimentoInicialDoc) {
    await deleteDoc(doc(db, 'despesas', investimentoInicialDoc.id));
  }
};

export const deletePlantio = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const plantio = await getPlantioById(id, tenantId);
  if (!plantio) throw new Error('Plantio não encontrado.');

  await deleteDoc(doc(db, 'plantios', id));

  await createTraceabilityEventSafely(tenantId, {
    plantioId: id,
    estufaId: plantio.estufaId || null,
    entidade: 'plantio',
    entidadeId: id,
    acao: 'excluido',
    descricao: 'Plantio excluído.',
    actorUid: tenantId,
    metadata: {
      codigoLote: plantio.codigoLote || null,
      cultura: plantio.cultura || null,
      status: plantio.status || null,
      custoAcumulado: Number(plantio.custoAcumulado || 0),
    },
  });
};

export const deletePlantioSafely = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const plantio = await getPlantioById(id, tenantId);
  if (!plantio) throw new Error('Plantio não encontrado.');

  const [vendasSnap, colheitasSnap, aplicacoesSnap, despesasSnap] = await Promise.all([
    getDocs(query(collection(db, 'vendas'), where('tenantId', '==', tenantId), where('plantioId', '==', id))),
    getDocs(query(collection(db, 'colheitas'), where('tenantId', '==', tenantId), where('plantioId', '==', id))),
    getDocs(query(collection(db, 'aplicacoes'), where('tenantId', '==', tenantId), where('plantioId', '==', id))),
    getDocs(query(collection(db, 'despesas'), where('tenantId', '==', tenantId), where('plantioId', '==', id))),
  ]);

  const hasSales = !vendasSnap.empty || !colheitasSnap.empty;
  const hasApplications = !aplicacoesSnap.empty;
  const nonInitialExpenses = despesasSnap.docs.filter(
    (item) => (item.data() as any).tipoGasto !== 'investimento_inicial'
  );

  if (hasSales || hasApplications || nonInitialExpenses.length > 0) {
    throw new Error(
      'Exclusão bloqueada: este ciclo possui movimentações (vendas, aplicações ou despesas operacionais). Use cancelamento para manter histórico.'
    );
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, 'plantios', id));
  despesasSnap.docs.forEach((d) => {
    batch.delete(doc(db, 'despesas', d.id));
  });
  await batch.commit();

  await createTraceabilityEventSafely(tenantId, {
    plantioId: id,
    estufaId: plantio.estufaId || null,
    entidade: 'plantio',
    entidadeId: id,
    acao: 'excluido',
    descricao: 'Plantio excluído em modo seguro sem movimentações operacionais.',
    actorUid: tenantId,
    metadata: {
      despesasRemovidas: despesasSnap.docs.length,
      codigoLote: plantio.codigoLote || null,
      cultura: plantio.cultura || null,
      status: plantio.status || null,
    },
  });
};

export const listAllPlantios = async (userId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(collection(db, 'plantios'), where('tenantId', '==', tenantId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Plantio));
};

export const listActivePlantiosByUser = async (userId: string): Promise<Plantio[]> => {
  const tenantId = assertTenantId(userId);
  const activeStatuses = ['em_desenvolvimento', 'em_colheita', 'em_crescimento', 'colheita_iniciada'];
  const q = query(
    collection(db, 'plantios'),
    where('tenantId', '==', tenantId),
    where('status', 'in', activeStatuses)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Plantio));
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

  const q = query(
    collection(db, 'plantios'),
    where('tenantId', '==', tenantId),
    where('estufaId', '==', estufaId),
    where('status', 'in', activeStatuses)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  const now = Timestamp.now();
  snap.docs.forEach((item) => {
    batch.update(item.ref, {
      status: 'cancelado',
      updatedAt: now,
    });
  });

  await batch.commit();

  await Promise.all(
    snap.docs.map((item) => {
      const plantio = item.data() as Plantio;
      return createTraceabilityEventSafely(tenantId, {
        plantioId: item.id,
        estufaId: estufaId || null,
        entidade: 'plantio',
        entidadeId: item.id,
        acao: 'cancelado',
        descricao: 'Plantio cancelado por desativação/manutenção da estufa.',
        actorUid: tenantId,
        metadata: {
          previousStatus: plantio.status || null,
          newStatus: 'cancelado',
          cultura: plantio.cultura || null,
          codigoLote: plantio.codigoLote || null,
        },
      });
    })
  );
};
