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
  telefone?: string | null;
  cidade?: string | null;
  tipo?: string | null;
  observacoes?: string | null;
  email?: string | null;
  documento?: string | null;
  contatoResponsavel?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  estado?: string | null;
  complemento?: string | null;
};

// 1. CRIAR
export const createCliente = async (data: ClienteFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();
  const novoCliente = {
    ...data,
    tenantId,
    userId: tenantId, // Compatibilidade
    createdAt: now,
    updatedAt: now,
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
      where("tenantId", "==", tenantId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      clientes.push({ ...doc.data() , id: doc.id } as Cliente);
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
      if (data.tenantId !== tenantId && data.userId !== tenantId) {
        throw new Error("Acesso negado.");
      }
      return { ...data , id: docSnap.id };
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
