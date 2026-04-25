import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { TarefaAgricola } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

export const createTarefaAgricola = async (
  data: Omit<TarefaAgricola, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'userId' | 'createdBy'>,
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();

  const novaTarefa = {
    ...data,
    userId: tenantId,
    tenantId,
    createdBy: tenantId,
    statusHistory: [
      {
        status: data.status,
        changedAt: now,
        changedBy: tenantId,
        reason: null,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, 'tarefas_agricolas'), novaTarefa);
  await createTraceabilityEventSafely(tenantId, {
    plantioId: data.plantioId,
    estufaId: data.estufaId || null,
    entidade: 'tarefa',
    entidadeId: ref.id,
    acao: 'criado',
    descricao: 'Tarefa agrícola criada.',
    actorUid: tenantId,
    metadata: {
      tipoTarefa: data.tipoTarefa,
      prioridade: data.prioridade,
      status: data.status,
      dataPrevista: data.dataPrevista || null,
    },
  });
  return ref.id;
};

export const listTarefasByPlantio = async (userId: string, plantioId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);
  const [byTenantId, byUserId] = await Promise.all([
    getDocs(query(collection(db, 'tarefas_agricolas'), where('tenantId', '==', tenantId), where('plantioId', '==', plantioId))),
    getDocs(query(collection(db, 'tarefas_agricolas'), where('userId', '==', tenantId), where('plantioId', '==', plantioId))),
  ]);

  const map = new Map<string, TarefaAgricola>();
  [...byTenantId.docs, ...byUserId.docs].forEach((item) => {
    map.set(item.id, { ...(item.data() as TarefaAgricola), id: item.id });
  });
  return Array.from(map.values());
};

export const listTodayPendingTasks = async (userId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  try {
    const q = query(
      collection(db, 'tarefas_agricolas'),
      where('tenantId', '==', tenantId),
      where('status', 'in', ['pendente', 'em_andamento']),
      where('dataPrevista', '>=', Timestamp.fromDate(start)),
      where('dataPrevista', '<=', Timestamp.fromDate(end))
    );

    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ ...(d.data() as TarefaAgricola), id: d.id }))
      .sort((a, b) => a.dataPrevista.toMillis() - b.dataPrevista.toMillis());
  } catch (error: any) {
    // Fallback para ambientes sem índice composto ou com dados legados em tenantId.
    if (error?.code !== 'failed-precondition' && error?.code !== 'unimplemented') {
      throw error;
    }

    const [byUserIdSnap, byTenantIdSnap] = await Promise.all([
      getDocs(query(collection(db, 'tarefas_agricolas'), where('userId', '==', tenantId))),
      getDocs(query(collection(db, 'tarefas_agricolas'), where('tenantId', '==', tenantId))),
    ]);

    const map = new Map<string, TarefaAgricola>();
    [...byUserIdSnap.docs, ...byTenantIdSnap.docs].forEach((item) => {
      map.set(item.id, { ...(item.data() as TarefaAgricola), id: item.id });
    });

    const startMs = start.getTime();
    const endMs = end.getTime();
    return Array.from(map.values())
      .filter((task) => task.status === 'pendente' || task.status === 'em_andamento')
      .filter((task) => {
        if (!task.dataPrevista) return false;
        const value = task.dataPrevista;
        const ms =
          typeof (value as any)?.toMillis === 'function'
            ? (value as any).toMillis()
            : typeof (value as any)?.seconds === 'number'
            ? (value as any).seconds * 1000
            : NaN;
        return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
      })
      .sort((a, b) => a.dataPrevista.toMillis() - b.dataPrevista.toMillis());
  }
};

export const listTarefasPendentes = async (userId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'tarefas_agricolas'),
    where('tenantId', '==', tenantId),
    where('status', 'in', ['pendente', 'em_andamento'])
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...(d.data() as TarefaAgricola), id: d.id }))
    .sort((a, b) => a.dataPrevista.toMillis() - b.dataPrevista.toMillis());
};

export const updateTarefaStatus = async (
  tarefaId: string,
  status: TarefaAgricola['status'],
  userId: string,
  options?: { reason?: string | null }
) => {
  const tenantId = assertTenantId(userId);
  const tarefaRef = doc(db, 'tarefas_agricolas', tarefaId);
  const tarefaSnap = await getDoc(tarefaRef);

  if (!tarefaSnap.exists()) throw new Error('Tarefa não encontrada.');
  const tarefa = tarefaSnap.data() as TarefaAgricola;
  if (tarefa.tenantId !== tenantId && tarefa.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }

  const history = Array.isArray(tarefa.statusHistory) ? tarefa.statusHistory : [];
  const reason = options?.reason?.trim() || null;

  await updateDoc(tarefaRef, {
    status,
    statusHistory: [
      ...history,
      {
        status,
        changedAt: Timestamp.now(),
        changedBy: tenantId,
        reason,
      },
    ],
    updatedAt: Timestamp.now(),
  });

  await createTraceabilityEventSafely(tenantId, {
    plantioId: tarefa.plantioId,
    estufaId: tarefa.estufaId || null,
    entidade: 'tarefa',
    entidadeId: tarefaId,
    acao: status === 'cancelada' ? 'cancelado' : 'status_alterado',
    descricao: `Status da tarefa alterado para ${status}.`,
    motivo: reason,
    actorUid: tenantId,
    metadata: {
      previousStatus: tarefa.status,
      newStatus: status,
      tipoTarefa: tarefa.tipoTarefa || null,
      prioridade: tarefa.prioridade || null,
    },
  });
};

export const cancelTarefaAgricola = async (tarefaId: string, motivo: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const reason = motivo.trim();
  if (!reason) throw new Error('Informe o motivo do cancelamento.');

  const tarefaRef = doc(db, 'tarefas_agricolas', tarefaId);
  const tarefaSnap = await getDoc(tarefaRef);
  if (!tarefaSnap.exists()) throw new Error('Tarefa não encontrada.');

  const tarefa = tarefaSnap.data() as TarefaAgricola;
  if (tarefa.tenantId !== tenantId && tarefa.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }

  const previousObs = (tarefa.observacoes || '').trim();
  const cancelNote = `Cancelada: ${reason}`;
  const mergedObs = previousObs ? `${previousObs}\n${cancelNote}` : cancelNote;

  await updateTarefaStatus(tarefaId, 'cancelada', tenantId, { reason });
  await updateDoc(tarefaRef, {
    observacoes: mergedObs,
    cancelReason: reason,
    updatedAt: Timestamp.now(),
  });
};

export const deleteTarefaAgricola = async (tarefaId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const tarefaRef = doc(db, 'tarefas_agricolas', tarefaId);
  const tarefaSnap = await getDoc(tarefaRef);
  if (!tarefaSnap.exists()) throw new Error('Tarefa não encontrada.');

  const tarefa = tarefaSnap.data() as TarefaAgricola;
  if (tarefa.tenantId !== tenantId && tarefa.userId !== tenantId) {
    throw new Error('Acesso negado.');
  }

  await deleteDoc(tarefaRef);
  await createTraceabilityEventSafely(tenantId, {
    plantioId: tarefa.plantioId,
    estufaId: tarefa.estufaId || null,
    entidade: 'tarefa',
    entidadeId: tarefaId,
    acao: 'excluido',
    descricao: 'Tarefa agrícola excluída.',
    actorUid: tenantId,
    metadata: {
      tipoTarefa: tarefa.tipoTarefa,
      status: tarefa.status,
      prioridade: tarefa.prioridade || null,
      cancelReason: tarefa.cancelReason || null,
    },
  });
};
