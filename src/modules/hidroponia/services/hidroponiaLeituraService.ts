import { addDoc, collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { createTraceabilityEventSafely } from '../../../services/traceabilityService';
import { getEstufaById } from '../../../services/estufaService';
import { HydroLeitura, HydroLeituraFormData } from '../types';

export const createHydroLeitura = async (data: HydroLeituraFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();
  const measuredAt = data.measuredAt ? Timestamp.fromDate(data.measuredAt) : now;
  const estufa = await getEstufaById(data.estufaId, tenantId);
  if (!estufa) throw new Error('Estufa não encontrada para registrar leitura.');

  const motorId = String(data.motorId || '').trim() || null;
  const requestedSetorIds = Array.isArray(data.setoresAplicadosIds)
    ? data.setoresAplicadosIds.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const aplicarEmTodosSetoresDoMotor = !!data.aplicarEmTodosSetoresDoMotor;

  let setoresAplicadosIds: string[] = [];
  let motorNome: string | null = null;

  if (motorId) {
    const motor = (estufa.motores || []).find((item) => item.id === motorId);
    if (!motor) throw new Error('O motor selecionado não pertence à estufa.');
    motorNome = motor.nome || null;

    const setoresDoMotor = (estufa.setores || []).filter((setor) => setor.motorId === motorId);
    if (setoresDoMotor.length === 0) {
      throw new Error('Este motor não possui setores vinculados.');
    }

    if (aplicarEmTodosSetoresDoMotor) {
      setoresAplicadosIds = setoresDoMotor.map((setor) => setor.id);
    } else if (requestedSetorIds.length > 0) {
      const allowedIds = new Set(setoresDoMotor.map((setor) => setor.id));
      const invalid = requestedSetorIds.find((setorId) => !allowedIds.has(setorId));
      if (invalid) {
        throw new Error('Existe setor selecionado que não pertence ao motor escolhido.');
      }
      setoresAplicadosIds = Array.from(new Set(requestedSetorIds));
    }
  } else if (requestedSetorIds.length > 0) {
    throw new Error('Selecione um motor antes de informar os setores de aplicação.');
  }

  const setorNameById = new Map((estufa.setores || []).map((setor) => [setor.id, setor.nome]));
  const setoresAplicados = setoresAplicadosIds.map((setorId) => ({
    id: setorId,
    nome: setorNameById.get(setorId) || setorId,
  }));

  const payload: Omit<HydroLeitura, 'id'> = {
    tenantId,
    userId: tenantId,
    estufaId: data.estufaId,
    motorId,
    setoresAplicadosIds,
    aplicarEmTodosSetoresDoMotor,
    reservatorioId: data.reservatorioId || null,
    estruturaId: data.estruturaId || null,
    loteId: data.loteId || null,
    pH: typeof data.pH === 'number' ? data.pH : null,
    condutividadeEletrica:
      typeof data.condutividadeEletrica === 'number' ? data.condutividadeEletrica : null,
    temperaturaSolucao: typeof data.temperaturaSolucao === 'number' ? data.temperaturaSolucao : null,
    temperaturaAmbiente: typeof data.temperaturaAmbiente === 'number' ? data.temperaturaAmbiente : null,
    umidadeAmbiente: typeof data.umidadeAmbiente === 'number' ? data.umidadeAmbiente : null,
    volumeLitros: typeof data.volumeLitros === 'number' ? data.volumeLitros : null,
    acao: data.acao,
    insumosAdicionados: [],
    observacoes: data.observacoes?.trim() || null,
    responsavel: data.responsavel?.trim() || null,
    measuredAt,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, 'hidroponia_leituras'), payload);

  const isNutriente = data.acao === 'adicionar_nutriente';
  const descricao = isNutriente
    ? motorId
      ? setoresAplicadosIds.length > 0
        ? `Nutriente aplicado via motor ${motorNome || motorId} em ${setoresAplicadosIds.length} setor(es).`
        : `Nutriente aplicado via motor ${motorNome || motorId}.`
      : 'Nutriente aplicado na operação hidropônica.'
    : 'Leitura hidropônica registrada.';

  await createTraceabilityEventSafely(tenantId, {
    hydroLoteId: data.loteId || null,
    estufaId: data.estufaId,
    entidade: 'hydro_leitura',
    entidadeId: ref.id,
    acao: isNutriente ? 'nutriente_adicionado' : 'leitura_registrada',
    descricao,
    actorUid: tenantId,
    actorName: data.responsavel || null,
    metadata: {
      acao: data.acao,
      pH: payload.pH,
      condutividadeEletrica: payload.condutividadeEletrica,
      temperaturaSolucao: payload.temperaturaSolucao,
      reservatorioId: payload.reservatorioId,
      estruturaId: payload.estruturaId,
      motorId,
      motorNome,
      setoresAplicados,
      aplicarEmTodosSetoresDoMotor,
    },
  });

  return ref.id;
};

export const listHydroLeituras = async (
  userId: string,
  filters: { loteId?: string | null; estufaId?: string | null } = {}
): Promise<HydroLeitura[]> => {
  const tenantId = assertTenantId(userId);
  const constraints = [where('tenantId', '==', tenantId)];
  if (filters.loteId) constraints.push(where('loteId', '==', filters.loteId));
  if (filters.estufaId) constraints.push(where('estufaId', '==', filters.estufaId));

  const snap = await getDocs(query(collection(db, 'hidroponia_leituras'), ...constraints));
  return snap.docs
    .map((item) => ({ ...(item.data() as HydroLeitura), id: item.id }))
    .sort((a, b) => (b.measuredAt?.toMillis?.() || 0) - (a.measuredAt?.toMillis?.() || 0));
};
