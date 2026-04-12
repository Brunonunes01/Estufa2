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
import { Colheita, Venda } from '../types/domain';
import { updatePlantioStatus } from './plantioService';
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

export type ColheitaFormData = {
  quantidade: number;
  unidade: string;
  precoUnitario: number | null;
  destino: string | null;
  clienteId: string | null;
  metodoPagamento: string | null;
  registradoPor: string | null;
  observacoes: string | null;
  dataVenda?: Date;
  pesoBruto?: number;
  pesoLiquido?: number;
  isFinalHarvest?: boolean;
};

const findVendaByColheitaId = async (tenantId: string, colheitaId: string): Promise<(Venda & Record<string, any>) | null> => {
  const q = query(
    collection(db, 'vendas'),
    where('userId', '==', tenantId),
    where('colheitaId', '==', colheitaId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const item = snap.docs[0];
  return { ...(item.data() as Venda & Record<string, any>) , id: item.id };
};

export const createColheita = async (
  data: ColheitaFormData,
  userId: string,
  plantioId: string,
  estufaId: string
) => {
  const tenantId = assertTenantId(userId);
  const dataOperacao = data.dataVenda ? Timestamp.fromDate(data.dataVenda) : Timestamp.now();

  const novaColheita: Omit<Colheita, 'id'> = {
    userId: tenantId,
    tenantId,
    createdBy: tenantId,
    plantioId,
    estufaId,
    dataColheita: dataOperacao,
    quantidade: Number(data.quantidade || 0),
    unidade: data.unidade,
    unidadeMedida: data.unidade as Colheita['unidadeMedida'],
    qualidade: 'padrao',
    loteColheita: `COL-${plantioId.slice(0, 6)}-${dataOperacao.toMillis()}`,
    destino: (data.destino as Colheita['destino']) || 'venda_direta',
    observacoes: data.observacoes || '',
    pesoBruto: Number(data.pesoBruto || 0),
    pesoLiquido: Number(data.pesoLiquido || 0),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const colheitaRef = await addDoc(collection(db, 'colheitas'), novaColheita);

  const vendaData: VendaFormData = {
    plantioId,
    estufaId,
    clienteId: data.clienteId || null,
    quantidade: Number(data.quantidade || 0),
    unidade: data.unidade,
    precoUnitario: Number(data.precoUnitario || 0),
    metodoPagamento: data.metodoPagamento,
    dataVenda: data.dataVenda,
    observacoes: data.observacoes,
    colheitaId: colheitaRef.id,
  };

  await createVenda(vendaData, tenantId);

  if (plantioId) {
    const nextStatus = data.isFinalHarvest ? 'finalizado' : 'em_colheita';
    await updatePlantioStatus(plantioId, nextStatus, tenantId);
  }

  return colheitaRef.id;
};

export const listColheitasByPlantio = async (userId: string, plantioId: string): Promise<Colheita[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'colheitas'),
    where('userId', '==', tenantId),
    where('plantioId', '==', plantioId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((item) => ({ ...(item.data() as Colheita) , id: item.id }))
    .sort((a, b) => (b.dataColheita?.seconds || 0) - (a.dataColheita?.seconds || 0));
};

export const getColheitaById = async (id: string, userId: string): Promise<(Colheita & Record<string, any>) | null> => {
  const tenantId = assertTenantId(userId);
  const docRef = doc(db, 'colheitas', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    const vendaFallback = await getVendaById(id, tenantId);
    return vendaFallback as any;
  }

  const data = docSnap.data() as Colheita;
  if (data.userId !== tenantId) {
    throw new Error('Acesso negado: esta colheita não pertence ao tenant atual.');
  }

  const linkedVenda = await findVendaByColheitaId(tenantId, id);

  return {
    id: docSnap.id,
    ...data,
    precoUnitario: linkedVenda?.precoUnitario || linkedVenda?.itens?.[0]?.valorUnitario || 0,
    clienteId: linkedVenda?.clienteId || null,
    metodoPagamento: linkedVenda?.metodoPagamento || linkedVenda?.formaPagamento || 'pix',
    statusPagamento: linkedVenda?.statusPagamento || 'pago',
    dataPagamento:
      typeof linkedVenda?.updatedAt === 'number'
        ? Timestamp.fromMillis(linkedVenda.updatedAt)
        : linkedVenda?.updatedAt || null,
  };
};

export const updateColheita = async (id: string, data: ColheitaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const colheita = await getColheitaById(id, tenantId);
  if (!colheita) throw new Error('Colheita não encontrada.');

  await updateDoc(doc(db, 'colheitas', id), {
    quantidade: Number(data.quantidade || 0),
    unidade: data.unidade,
    unidadeMedida: data.unidade,
    observacoes: data.observacoes || '',
    dataColheita: data.dataVenda
      ? Timestamp.fromDate(data.dataVenda)
      : typeof colheita.dataColheita === 'number'
        ? Timestamp.fromMillis(colheita.dataColheita)
        : colheita.dataColheita,
    pesoBruto: Number(data.pesoBruto || 0),
    pesoLiquido: Number(data.pesoLiquido || 0),
    updatedAt: Timestamp.now(),
  });

  const linkedVenda = await findVendaByColheitaId(tenantId, id);
  if (linkedVenda?.id) {
    await updateVenda(
      linkedVenda.id,
      {
        plantioId: colheita.plantioId,
        estufaId: colheita.estufaId,
        clienteId: data.clienteId,
        quantidade: Number(data.quantidade || 0),
        unidade: data.unidade,
        precoUnitario: Number(data.precoUnitario || 0),
        metodoPagamento: data.metodoPagamento,
        dataVenda: data.dataVenda,
        observacoes: data.observacoes,
        colheitaId: id,
      },
      tenantId
    );
  }
};

export const deleteColheita = async (colheitaId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const colheita = await getColheitaById(colheitaId, tenantId);
  if (!colheita) throw new Error('Colheita não encontrada para exclusão.');

  const linkedVenda = await findVendaByColheitaId(tenantId, colheitaId);
  if (linkedVenda?.id) {
    await deleteVenda(linkedVenda.id, tenantId);
  }

  await deleteDoc(doc(db, 'colheitas', colheitaId));
};

// Wrappers financeiros para compatibilidade das telas existentes
export const listAllColheitas = async (userId: string) => listAllVendas(userId) as any;
export const listContasAReceber = async (userId: string) => listContasAReceberVendas(userId) as any;
export const receberConta = async (vendaId: string, userId: string, metodoRecebimento?: string) =>
  receberVenda(vendaId, userId, metodoRecebimento);
export const getTotalContasAReceber = async (userId: string) => getTotalContasAReceberVendas(userId);
