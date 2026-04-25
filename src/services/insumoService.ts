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
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Insumo } from '../types/domain';
import { assertTenantId } from './tenantGuard';

export type InsumoFormData = {
  nome: string;
  tipo: 'adubo' | 'defensivo' | 'semente' | 'outro';
  unidadePadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number | null;
  custoUnitario: number | null;
  fornecedorId: string | null;
  tamanhoEmbalagem: number | null;
  observacoes: string | null;
};

export type InsumoEntryData = {
  quantidadeComprada: number;
  custoUnitarioCompra: number;
  fornecedorId: string | null;
  observacoes: string | null;
};

export const createInsumo = async (data: InsumoFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();
  const novoInsumo = {
    ...data,
    tenantId,
    userId: tenantId,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, 'insumos'), novoInsumo);
  return docRef.id;
};

export const updateInsumo = async (insumoId: string, data: Partial<InsumoFormData>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const insumo = await getInsumoById(insumoId, tenantId);
  if (!insumo) throw new Error('Insumo não encontrado.');

  await updateDoc(doc(db, 'insumos', insumoId), { ...data, updatedAt: Timestamp.now() });
};

export const listInsumos = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(collection(db, 'insumos'), where('tenantId', '==', tenantId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Insumo));
};

export const listInsumosEmAlerta = async (userId: string): Promise<Insumo[]> => {
  const tenantId = assertTenantId(userId);
  const insumos = await listInsumos(tenantId);
  return insumos.filter((item) => item.estoqueMinimo && item.estoqueAtual <= item.estoqueMinimo);
};

export const getInsumoById = async (insumoId: string, userId: string): Promise<Insumo | null> => {
  const tenantId = assertTenantId(userId);
  const docRef = doc(db, 'insumos', insumoId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as Insumo;
    if (data.tenantId !== tenantId && data.userId !== tenantId) {
      throw new Error('Acesso negado.');
    }
    return { ...data, id: docSnap.id };
  }
  return null;
};

export const deleteInsumo = async (insumoId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const insumo = await getInsumoById(insumoId, tenantId);
  if (!insumo) throw new Error('Insumo não encontrado.');

  await deleteDoc(doc(db, 'insumos', insumoId));
};

export const addEstoqueToInsumo = async (
  insumoId: string,
  entryData: InsumoEntryData,
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const quantidadeComprada = Number(entryData.quantidadeComprada || 0);
  const custoUnitarioCompra = Number(entryData.custoUnitarioCompra || 0);

  if (quantidadeComprada <= 0) {
    throw new Error('Quantidade de entrada deve ser maior que zero.');
  }
  if (custoUnitarioCompra <= 0) {
    throw new Error('Custo unitário da compra deve ser maior que zero.');
  }

  return runTransaction(db, async (transaction) => {
    const insumoRef = doc(db, 'insumos', insumoId);
    const insumoSnap = await transaction.get(insumoRef);

    if (!insumoSnap.exists()) throw new Error('Insumo não encontrado.');
    const insumo = insumoSnap.data() as Insumo;
    if (insumo.tenantId !== tenantId && insumo.userId !== tenantId) {
      throw new Error('Acesso negado ao insumo selecionado.');
    }

    const estoqueAntigo = Number(insumo.estoqueAtual || 0);
    const custoAntigo = Number(insumo.custoUnitario || 0);

    const novoEstoque = estoqueAntigo + quantidadeComprada;
    let novoCusto = custoAntigo;
    if (novoEstoque > 0) {
      const valorEstoqueAntigo = estoqueAntigo * custoAntigo;
      const valorNovaCompra = quantidadeComprada * custoUnitarioCompra;
      novoCusto = (valorEstoqueAntigo + valorNovaCompra) / novoEstoque;
    }

    transaction.update(insumoRef, {
      estoqueAtual: novoEstoque,
      custoUnitario: novoCusto,
      updatedAt: Timestamp.now(),
    });

    const entradaRef = doc(collection(db, 'insumo_entradas'));
    transaction.set(entradaRef, {
      insumoId,
      nomeInsumo: insumo.nome,
      tenantId,
      userId: tenantId,
      ...entryData,
      quantidadeComprada,
      custoUnitarioCompra,
      dataEntrada: Timestamp.now(),
    });
  });
};
