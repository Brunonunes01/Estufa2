// src/services/colheitaService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Colheita } from '../types/domain';

// Dados que vêm do formulário
export type ColheitaFormData = {
  quantidade: number;
  unidade: string; // kg, caixa, maço
  precoUnitario: number | null;
  destino: string | null;
  observacoes: string | null;
};

// 1. CRIAR COLHEITA
export const createColheita = async (
  data: ColheitaFormData, 
  userId: string, 
  plantioId: string, 
  estufaId: string // Redundante, mas facilita filtros [cite: 161]
) => {

  const novaColheita = {
    ...data,
    userId: userId,
    plantioId: plantioId,
    estufaId: estufaId,
    dataColheita: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'colheitas'), novaColheita);
    console.log('Colheita criada com ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar colheita: ", error);
    throw new Error('Não foi possível registrar a colheita.');
  }
};

// 2. LISTAR COLHEITAS DE UM PLANTIO
export const listColheitasByPlantio = async (userId: string, plantioId: string): Promise<Colheita[]> => {
  const colheitas: Colheita[] = [];
  try {
    const q = query(
      collection(db, 'colheitas'), 
      where("userId", "==", userId),
      where("plantioId", "==", plantioId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      colheitas.push({ id: doc.id, ...doc.data() } as Colheita);
    });
    
    return colheitas;

  } catch (error) {
    console.error("Erro ao listar colheitas: ", error);
    throw new Error('Não foi possível buscar as colheitas.');
  }
};