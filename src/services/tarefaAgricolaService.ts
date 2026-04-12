import { addDoc, collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { TarefaAgricola } from '../types/domain';
import { assertTenantId } from './tenantGuard';

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
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, 'tarefas_agricolas'), novaTarefa);
  return ref.id;
};

export const listTarefasByPlantio = async (userId: string, plantioId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'tarefas_agricolas'),
    where('userId', '==', tenantId),
    where('plantioId', '==', plantioId)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as TarefaAgricola) , id: d.id }));
};

export const listTodayPendingTasks = async (userId: string): Promise<TarefaAgricola[]> => {
  const tenantId = assertTenantId(userId);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, 'tarefas_agricolas'),
    where('userId', '==', tenantId),
    where('status', 'in', ['pendente', 'em_andamento']),
    where('dataPrevista', '>=', Timestamp.fromDate(start)),
    where('dataPrevista', '<=', Timestamp.fromDate(end))
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...(d.data() as TarefaAgricola) , id: d.id }))
    .sort((a, b) => a.dataPrevista.toMillis() - b.dataPrevista.toMillis());
};
