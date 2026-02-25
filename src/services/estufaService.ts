import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Estufa } from '../types/domain';

export const createEstufa = async (data: Partial<Estufa>, userId: string) => {
  try {
    const novaEstufa = {
      ...data,
      userId,
      status: data.status || 'ativa',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'estufas'), novaEstufa);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar estufa:", error);
    throw new Error("Erro ao salvar estufa.");
  }
};

export const listEstufas = async (userId: string): Promise<Estufa[]> => {
  try {
    const q = query(collection(db, 'estufas'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const estufas: Estufa[] = [];
    querySnapshot.forEach((doc) => {
      estufas.push({ id: doc.id, ...doc.data() } as Estufa);
    });
    return estufas;
  } catch (error) {
    console.error("Erro ao listar estufas:", error);
    return [];
  }
};

export const getEstufaById = async (id: string): Promise<Estufa | null> => {
  try {
    const docRef = doc(db, 'estufas', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Estufa : null;
  } catch (error) {
    return null;
  }
};

export const updateEstufa = async (id: string, data: Partial<Estufa>) => {
  try {
    const docRef = doc(db, 'estufas', id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  } catch (error) {
    throw new Error("Erro ao atualizar estufa.");
  }
};

export const deleteEstufa = async (id: string) => {
  try {
    const docRef = doc(db, 'estufas', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao eliminar estufa:", error);
    throw new Error("Não foi possível excluir a estufa.");
  }
};