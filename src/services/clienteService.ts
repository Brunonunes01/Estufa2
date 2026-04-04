// src/services/clienteService.ts
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
import { Cliente } from '../types/domain';
import { assertTenantId } from './tenantGuard';

export type ClienteFormData = {
  nome: string;
  telefone: string | null;
  cidade: string | null;
  tipo: "atacado" | "varejo" | "restaurante" | "outro";
  observacoes: string | null;
};

// 1. CRIAR
export const createCliente = async (data: ClienteFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const novoCliente = {
    ...data,
    userId: tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'clientes'), novoCliente);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar cliente: ", error);
    throw new Error('Não foi possível cadastrar o cliente.');
  }
};

// 2. LISTAR
export const listClientes = async (userId: string): Promise<Cliente[]> => {
  const tenantId = assertTenantId(userId);
  const clientes: Cliente[] = [];
  try {
    const q = query(
      collection(db, 'clientes'), 
      where("userId", "==", tenantId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() } as Cliente);
    });
    
    // Ordena alfabeticamente
    clientes.sort((a, b) => a.nome.localeCompare(b.nome));
    
    return clientes;
  } catch (error) { 
    console.error("Erro ao listar clientes: ", error);
    throw new Error('Não foi possível buscar os clientes.');
  }
};

// 3. BUSCAR POR ID
export const getClienteById = async (clienteId: string, userId: string): Promise<Cliente | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'clientes', clienteId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Cliente;
      if (data.userId !== tenantId) {
        throw new Error("Acesso negado: este cliente não pertence ao seu tenant.");
      }
      return { id: docSnap.id, ...data };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar cliente: ", error);
    throw error;
  }
};

// 4. ATUALIZAR
export const updateCliente = async (clienteId: string, data: ClienteFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const cliente = await getClienteById(clienteId, tenantId);
    if (!cliente) throw new Error("Cliente não encontrado.");

    const ref = doc(db, 'clientes', clienteId);
    await updateDoc(ref, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Erro ao atualizar cliente: ", error);
    throw error;
  }
};

export const deleteCliente = async (clienteId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    const cliente = await getClienteById(clienteId, tenantId);
    if (!cliente) throw new Error("Cliente não encontrado para exclusão.");

    await deleteDoc(doc(db, 'clientes', clienteId));
  } catch (error) {
    console.error("Erro ao excluir cliente: ", error);
    throw error;
  }
};