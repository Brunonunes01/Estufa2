// src/services/fornecedorService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Fornecedor } from '../types/domain';

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
  const novoFornecedor = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'fornecedores'), novoFornecedor);
    
    // AQUI ESTÁ A CORREÇÃO (console.g -> console.log)
    console.log('Fornecedor criado com ID: ', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar fornecedor: ", error);
    throw new Error('Não foi possível criar o fornecedor.');
  }
};

// 2. LISTAR FORNECEDORES
export const listFornecedores = async (userId: string): Promise<Fornecedor[]> => {
  const fornecedores: Fornecedor[] = [];
  try {
    const q = query(
      collection(db, 'fornecedores'), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      fornecedores.push({ id: doc.id, ...doc.data() } as Fornecedor);
    });
    
    return fornecedores;

  } catch (error) { // Correção do 'catch' anterior
    console.error("Erro ao listar fornecedores: ", error);
    throw new Error('Não foi possível buscar os fornecedores.');
  }
};