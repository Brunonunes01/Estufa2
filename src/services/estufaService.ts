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
import { Estufa, HydroMotor, HydroSetor } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { cancelActivePlantiosByEstufa } from './plantioService';

const normalizeMotores = (motores?: HydroMotor[] | null) =>
  Array.isArray(motores) ? motores : [];

const normalizeSetores = (setores?: HydroSetor[] | null) =>
  Array.isArray(setores) ? setores : [];

const validateHydroMotorBindings = (setoresInput?: HydroSetor[] | null, motoresInput?: HydroMotor[] | null) => {
  const setores = normalizeSetores(setoresInput);
  const motores = normalizeMotores(motoresInput);

  const motorIds = new Set<string>();
  const motorCodes = new Set<string>();
  motores.forEach((motor) => {
    const motorId = String(motor?.id || '').trim();
    if (!motorId) {
      throw new Error('Todo motor precisa ter um identificador válido.');
    }
    if (motorIds.has(motorId)) {
      throw new Error('Existem motores duplicados na estufa.');
    }
    motorIds.add(motorId);

    const codigo = String(motor?.codigo || '').trim().toUpperCase();
    if (codigo) {
      if (motorCodes.has(codigo)) {
        throw new Error('Código de motor duplicado na estufa.');
      }
      motorCodes.add(codigo);
    }
  });

  setores.forEach((setor) => {
    const setorNome = String(setor?.nome || '').trim() || 'Setor sem nome';
    const motorId = String((setor as any)?.motorId || '').trim();
    if (!motorId) {
      throw new Error(`O setor "${setorNome}" precisa estar vinculado a um motor.`);
    }
    if (!motorIds.has(motorId)) {
      throw new Error(`O setor "${setorNome}" está vinculado a um motor inexistente.`);
    }
  });
};

export const createEstufa = async (data: Partial<Estufa>, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    validateHydroMotorBindings(data.setores, data.motores);
    const novaEstufa = {
      ...data,
      userId: tenantId,
      tenantId,
      createdBy: tenantId,
      status: data.status || 'ativa',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'estufas'), novaEstufa);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar estufa:", error);
    throw new Error("Erro ao salvar estufa no banco de dados.");
  }
};

export const listEstufas = async (userId: string): Promise<Estufa[]> => {
  const tenantId = assertTenantId(userId);
  try {
    const [byUserIdResult, byTenantIdResult] = await Promise.allSettled([
      getDocs(query(collection(db, 'estufas'), where("userId", "==", tenantId))),
      getDocs(query(collection(db, 'estufas'), where("tenantId", "==", tenantId))),
    ]);

    const estufasMap = new Map<string, Estufa>();

    if (byUserIdResult.status === 'fulfilled') {
      byUserIdResult.value.forEach((item) => {
        estufasMap.set(item.id, { ...(item.data() as Estufa), id: item.id });
      });
    }

    if (byTenantIdResult.status === 'fulfilled') {
      byTenantIdResult.value.forEach((item) => {
        estufasMap.set(item.id, { ...(item.data() as Estufa), id: item.id });
      });
    }

    if (estufasMap.size > 0) {
      return Array.from(estufasMap.values());
    }

    const firstError =
      byTenantIdResult.status === 'rejected'
        ? byTenantIdResult.reason
        : byUserIdResult.status === 'rejected'
          ? byUserIdResult.reason
          : null;

    if (firstError) throw firstError;

    return Array.from(estufasMap.values());
  } catch (error) {
    console.error("Erro ao listar estufas:", error);
    throw new Error("Erro ao buscar lista de estufas.");
  }
};

export const getEstufaById = async (id: string, userId: string): Promise<Estufa | null> => {
  const tenantId = assertTenantId(userId);
  try {
    const docRef = doc(db, 'estufas', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data() as Estufa;
    if (data.userId !== tenantId && data.tenantId !== tenantId) {
      throw new Error("Acesso negado: esta estufa não pertence ao seu tenant.");
    }
    
    return { ...data , id: docSnap.id };
  } catch (error) {
    console.error("Erro ao buscar estufa por ID:", error);
    throw error;
  }
};

export const updateEstufa = async (id: string, data: Partial<Estufa>, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    // Verifica propriedade antes de atualizar
    const estufa = await getEstufaById(id, tenantId);
    if (!estufa) throw new Error("Estufa não encontrada.");

    if (data.motores !== undefined || data.setores !== undefined) {
      const nextSetores = data.setores !== undefined ? data.setores : estufa.setores;
      const nextMotores = data.motores !== undefined ? data.motores : estufa.motores;
      validateHydroMotorBindings(nextSetores, nextMotores);
    }

    const docRef = doc(db, 'estufas', id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  } catch (error) {
    console.error("Erro ao atualizar estufa:", error);
    throw error instanceof Error ? error : new Error("Erro ao atualizar estufa.");
  }
};

export const deleteEstufa = async (id: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  try {
    // Verifica propriedade antes de excluir
    const estufa = await getEstufaById(id, tenantId);
    if (!estufa) throw new Error("Estufa não encontrada para exclusão.");

    await cancelActivePlantiosByEstufa(tenantId, id);

    const docRef = doc(db, 'estufas', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao eliminar estufa:", error);
    throw error instanceof Error ? error : new Error("Não foi possível excluir a estufa.");
  }
};
