// src/services/colheitaService.ts
import { 
  collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Colheita } from '../types/domain';
import { updatePlantioStatus } from './plantioService'; 

export type ColheitaFormData = {
  quantidade: number;
  unidade: string;
  precoUnitario: number | null;
  destino: string | null;
  clienteId: string | null;
  metodoPagamento: string | null;
  observacoes: string | null;
};

export const createColheita = async (data: ColheitaFormData, userId: string, plantioId: string, estufaId: string) => {
  const novaColheita = { ...data, userId, plantioId, estufaId, dataColheita: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  await addDoc(collection(db, 'colheitas'), novaColheita);
  await updatePlantioStatus(plantioId, "em_colheita");
};

export const listColheitasByPlantio = async (userId: string, plantioId: string): Promise<Colheita[]> => {
  const colheitas: Colheita[] = [];
  // Usa o userId passado
  const q = query(collection(db, 'colheitas'), where("userId", "==", userId), where("plantioId", "==", plantioId));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => colheitas.push({ id: doc.id, ...doc.data() } as Colheita));
  return colheitas;
};

// ATUALIZADO:
export const listAllColheitas = async (userId: string): Promise<Colheita[]> => {
  const colheitas: Colheita[] = [];
  // Usa o userId passado (dinâmico)
  const q = query(collection(db, 'colheitas'), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => colheitas.push({ id: doc.id, ...doc.data() } as Colheita));
  colheitas.sort((a, b) => b.dataColheita.seconds - a.dataColheita.seconds);
  return colheitas;
};

export const deleteColheita = async (colheitaId: string) => {
    await deleteDoc(doc(db, 'colheitas', colheitaId));
};