import { addDoc, collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { createTraceabilityEventSafely } from '../../../services/traceabilityService';
import { getEstufaById } from '../../../services/estufaService';
import { isSupabaseBackend } from '../../../services/backendConfig';
import { getSupabaseClient } from '../../../services/supabaseClient';
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

  let leituraId = '';
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('hidro_leituras')
      .insert({
        tenant_id: tenantId,
        estufa_id: payload.estufaId,
        motor_id: payload.motorId || null,
        setores_aplicados_ids: payload.setoresAplicadosIds || [],
        aplicar_em_todos_setores_do_motor: !!payload.aplicarEmTodosSetoresDoMotor,
        reservatorio_id: payload.reservatorioId || null,
        estrutura_id: payload.estruturaId || null,
        lote_id: payload.loteId || null,
        ph: payload.pH,
        condutividade_eletrica: payload.condutividadeEletrica,
        temperatura_solucao: payload.temperaturaSolucao,
        temperatura_ambiente: payload.temperaturaAmbiente,
        umidade_ambiente: payload.umidadeAmbiente,
        volume_litros: payload.volumeLitros,
        acao: payload.acao,
        insumos_adicionados: payload.insumosAdicionados || [],
        observacoes: payload.observacoes || null,
        responsavel: payload.responsavel || null,
        measured_at: payload.measuredAt.toDate().toISOString(),
      })
      .select('id')
      .single();
    if (error || !inserted?.id) throw new Error(`Erro ao registrar leitura hidropônica. ${error?.message || ''}`.trim());
    leituraId = inserted.id as string;
  } else {
    const ref = await addDoc(collection(db, 'hidroponia_leituras'), payload);
    leituraId = ref.id;
  }

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
    entidadeId: leituraId,
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

  return leituraId;
};

export const listHydroLeituras = async (
  userId: string,
  filters: { loteId?: string | null; estufaId?: string | null } = {}
): Promise<HydroLeitura[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    let req = supabase.from('hidro_leituras').select('*').eq('tenant_id', tenantId);
    if (filters.loteId) req = req.eq('lote_id', filters.loteId);
    if (filters.estufaId) req = req.eq('estufa_id', filters.estufaId);
    const { data, error } = await req.order('measured_at', { ascending: false });
    if (error) throw new Error(`Erro ao listar leituras hidropônicas. ${error.message}`);
    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.created_by || row.tenant_id,
      estufaId: row.estufa_id,
      motorId: row.motor_id || null,
      setoresAplicadosIds: Array.isArray(row.setores_aplicados_ids) ? row.setores_aplicados_ids : [],
      aplicarEmTodosSetoresDoMotor: !!row.aplicar_em_todos_setores_do_motor,
      reservatorioId: row.reservatorio_id || null,
      estruturaId: row.estrutura_id || null,
      loteId: row.lote_id || null,
      pH: row.ph != null ? Number(row.ph) : null,
      condutividadeEletrica: row.condutividade_eletrica != null ? Number(row.condutividade_eletrica) : null,
      temperaturaSolucao: row.temperatura_solucao != null ? Number(row.temperatura_solucao) : null,
      temperaturaAmbiente: row.temperatura_ambiente != null ? Number(row.temperatura_ambiente) : null,
      umidadeAmbiente: row.umidade_ambiente != null ? Number(row.umidade_ambiente) : null,
      volumeLitros: row.volume_litros != null ? Number(row.volume_litros) : null,
      acao: row.acao,
      insumosAdicionados: Array.isArray(row.insumos_adicionados) ? row.insumos_adicionados : [],
      observacoes: row.observacoes || null,
      responsavel: row.responsavel || null,
      measuredAt: Timestamp.fromDate(new Date(row.measured_at)),
      createdAt: Timestamp.fromDate(new Date(row.created_at)),
      updatedAt: Timestamp.fromDate(new Date(row.updated_at)),
    } as HydroLeitura));
  }

  const constraints = [where('tenantId', '==', tenantId)];
  if (filters.loteId) constraints.push(where('loteId', '==', filters.loteId));
  if (filters.estufaId) constraints.push(where('estufaId', '==', filters.estufaId));

  const snap = await getDocs(query(collection(db, 'hidroponia_leituras'), ...constraints));
  return snap.docs
    .map((item) => ({ ...(item.data() as HydroLeitura), id: item.id }))
    .sort((a, b) => (b.measuredAt?.toMillis?.() || 0) - (a.measuredAt?.toMillis?.() || 0));
};
