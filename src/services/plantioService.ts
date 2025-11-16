// src/services/plantioService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  doc, // Importar
  getDoc // Importar
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Plantio } from '../types/domain';

// Dados que vêm do formulário
export type PlantioFormData = {
  estufaId: string;
  cultura: string;
  variedade: string | null;
  quantidadePlantada: number;
  unidadeQuantidade: string;
  dataPlantio: Timestamp;
  cicloDias: number | null;
  status: "em_desenvolvimento" | "em_colheita" | "finalizado";
};

// 1. CRIAR PLANTIO
export const createPlantio = async (data: PlantioFormData, userId: string) => {
  
  let previsaoColheita: Timestamp | null = null;
  if (data.cicloDias && data.cicloDias > 0) {
    const dataPlantioJS = data.dataPlantio.toDate();
    const dataClonada = new Date(dataPlantioJS.getTime());
    const dataPrevisaoJS = new Date(dataClonada.setDate(dataClonada.getDate() + data.cicloDias));
    previsaoColheita = Timestamp.fromDate(dataPrevisaoJS);
  }

  const novoPlantio = {
    ...data,
    userId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    previsaoColheita: previsaoColheita,
    safraId: null,
    precoEstimadoUnidade: null,
    observacoes: null,
  };

  try {
    const docRef = await addDoc(collection(db, 'plantios'), novoPlantio);
    console.log('Plantio criado com ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar plantio: ", error);
    throw new Error('Não foi possível criar o plantio.');
  }
};

// 2. LISTAR PLANTIOS DE UMA ESTUFA
export const listPlantiosByEstufa = async (userId: string, estufaId: string): Promise<Plantio[]> => {
  const plantios: Plantio[] = [];
  try {
    const q = query(
      collection(db, 'plantios'), 
      where("userId", "==", userId),
      where("estufaId", "==", estufaId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      plantios.push({ id: doc.id, ...doc.data() } as Plantio);
    });
    
    return plantios;

  } catch (error) {
    console.error("Erro ao listar plantios: ", error);
    throw new Error('Não foi possível buscar os plantios.');
  }
};

// 3. BUSCAR PLANTIO POR ID (Função Nova)
export const getPlantioById = async (plantioId: string): Promise<Plantio | null> => {
  try {
    const docRef = doc(db, 'plantios', plantioId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Plantio;
    } else {
      console.warn("Plantio não encontrado:", plantioId);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar plantio por ID: ", error);
    throw new Error('Não foi possível buscar o plantio.');
  }
};