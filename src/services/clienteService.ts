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
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Cliente } from '../types/domain';

export type ClienteFormData = {
  nome: string;
  telefone: string | null;
  cidade: string | null;
  tipo: "atacado" | "varejo" | "restaurante" | "outro";
  observacoes: string | null;
};

// 1. CRIAR
export const createCliente = async (data: ClienteFormData, userId: string) => {
  const novoCliente = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'clientes'), novoCliente);
    console.log('Cliente criado com ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar cliente: ", error);
    throw new Error('Não foi possível cadastrar o cliente.');
  }
};

// 2. LISTAR
export const listClientes = async (userId: string): Promise<Cliente[]> => {
  const clientes: Cliente[] = [];
  try {
    const q = query(
      collection(db, 'clientes'), 
      where("userId", "==", userId)
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
export const getClienteById = async (clienteId: string): Promise<Cliente | null> => {
  try {
    const docRef = doc(db, 'clientes', clienteId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Cliente;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar cliente: ", error);
    throw new Error('Erro ao buscar dados do cliente.');
  }
};

// 4. ATUALIZAR
export const updateCliente = async (clienteId: string, data: ClienteFormData) => {
  const ref = doc(db, 'clientes', clienteId);
  const dados = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  try {
    await updateDoc(ref, dados);
  } catch (error) {
    console.error("Erro ao atualizar cliente: ", error);
    throw new Error('Não foi possível atualizar o cliente.');
  }
};