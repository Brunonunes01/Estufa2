// src/services/fornecedorService.ts
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
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Fornecedor } from '../types/domain';
import { assertTenantId } from './tenantGuard';

// Dados que vêm do formulário
export type FornecedorFormData = {
  nome: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
};

// 1. CRIAR FORNECEDOR
export const createFornecedor = async (data: FornecedorFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const novoFornecedor = {
    ...data,
    tenantId,
    userId: tenantId,
    createdBy: tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'fornecedores'), novoFornecedor);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar fornecedor: ", error);
    throw new Error('Não foi possível criar o fornecedor.');
  }
};

// 2. LISTAR FORNECEDORES
export const listFornecedores = async (userId: string): Promise<Fornecedor[]> => {
  const tenantId = assertTenantId(userId);
  try {
    const [tenantSnap, legacySnap] = await Promise.all([
      getDocs(query(collection(db, 'fornecedores'), where("tenantId", "==", tenantId))),
      getDocs(query(collection(db, 'fornecedores'), where("userId", "==", tenantId))),
    ]);

    const fornecedoresMap = new Map<string, Fornecedor>();
    [tenantSnap, legacySnap].forEach((snap) => {
      snap.forEach((document) => {
        fornecedoresMap.set(document.id, { ...document.data(), id: document.id } as Fornecedor);
      });
    });

    const fornecedores = Array.from(fornecedoresMap.values()).sort((a, b) =>
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
    );
    
    return fornecedores;

  } catch (error) { 
    console.error("Erro ao listar fornecedores: ", error);
    throw new Error('Não foi possível buscar os fornecedores.');
  }
};

// 3. BUSCAR FORNECEDOR POR ID
export const getFornecedorById = async (fornecedorId: string, userId: string): Promise<Fornecedor | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'fornecedores', fornecedorId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Fornecedor;
      if (data.tenantId !== tenantId && data.userId !== tenantId) {
        throw new Error("Acesso negado: este fornecedor não pertence ao seu tenant.");
      }
      return { ...data , id: docSnap.id };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar fornecedor por ID: ", error);
    throw error;
  }
};

// 4. ATUALIZAR FORNECEDOR
export const updateFornecedor = async (fornecedorId: string, data: FornecedorFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const fornecedor = await getFornecedorById(fornecedorId, tenantId);
    if (!fornecedor) throw new Error("Fornecedor não encontrado.");

    const fornecedorRef = doc(db, 'fornecedores', fornecedorId);
    await updateDoc(fornecedorRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Erro ao atualizar fornecedor: ", error);
    throw error;
  }
};

export const deleteFornecedor = async (fornecedorId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const fornecedor = await getFornecedorById(fornecedorId, tenantId);
    if (!fornecedor) throw new Error("Fornecedor não encontrado para exclusão.");

    await deleteDoc(doc(db, 'fornecedores', fornecedorId));
  } catch (error) {
    console.error("Erro ao excluir fornecedor: ", error);
    throw error;
  }
};
