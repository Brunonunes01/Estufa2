import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from '../../../compat/firestore';
import { db } from '../../../services/firebaseConfig';
import { listEstufas } from '../../../services/estufaService';
import { assertTenantId } from '../../../services/tenantGuard';
import { createTraceabilityEventSafely } from '../../../services/traceabilityService';
import { isSupabaseBackend } from '../../../services/backendConfig';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { Estufa } from '../../../types/domain';
import { HydroLote, HydroLoteFormData } from '../types';
import { createHydroLotCode } from '../utils';

const hydroLotCodeExists = async (tenantId: string, codigoLote: string) => {
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hidro_lotes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('codigo_lote', codigoLote)
      .limit(1);
    if (error) throw new Error(`Erro ao validar código de produção. ${error.message}`);
    return (data || []).length > 0;
  }

  const snap = await getDocs(
    query(
      collection(db, 'hidroponia_lotes'),
      where('tenantId', '==', tenantId),
      where('codigoLote', '==', codigoLote)
    )
  );
  return !snap.empty;
};

const createUniqueHydroLotCode = async (tenantId: string, label: string) => {
  const date = new Date();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createHydroLotCode(label, new Date(date.getTime() + attempt * 1000));
    if (!(await hydroLotCodeExists(tenantId, code))) return code;
  }
  throw new Error('Não foi possível gerar uma numeração única para a produção.');
};

const sanitizeNonNegative = (value: unknown) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
};

const normalizeText = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
};

const normalizeLote = (raw: HydroLote, id: string): HydroLote => ({
  ...raw,
  id,
  quantidadeInicial: sanitizeNonNegative((raw as any).quantidadeInicial),
  saldoDisponivel: sanitizeNonNegative((raw as any).saldoDisponivel),
  origemMaterialNome: String((raw as any).origemMaterialNome || '').trim(),
  origemMaterialDocumento: ((raw as any).origemMaterialDocumento || null) as string | null,
  verduraId: ((raw as any).verduraId || null) as string | null,
  culturaBase: ((raw as any).culturaBase || null) as string | null,
  variedadeBase: ((raw as any).variedadeBase || null) as string | null,
});

const mapSupabaseLoteToDomain = (row: any): HydroLote =>
  normalizeLote(
    {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.created_by || row.tenant_id,
      createdBy: row.created_by || row.tenant_id,
      codigoLote: row.codigo_lote,
      estufaId: row.estufa_id,
      setorId: row.setor_id,
      quantidadeInicial: Number(row.quantidade_inicial || 0),
      saldoDisponivel: Number(row.saldo_disponivel || 0),
      origemMaterialNome: row.origem_material_nome,
      origemMaterialDocumento: row.origem_material_documento || null,
      nomeOperacional: row.nome_operacional || null,
      verduraId: row.verdura_id || null,
      culturaBase: row.cultura_base || null,
      variedadeBase: row.variedade_base || null,
      status: row.status,
      createdAt: Timestamp.fromDate(new Date(row.created_at)),
      updatedAt: Timestamp.fromDate(new Date(row.updated_at)),
    } as HydroLote,
    row.id
  );

const resolveSetorContext = async (
  tenantId: string,
  setorId: string
): Promise<{ estufaId: string; setorId: string }> => {
  const trimmedSetorId = setorId?.trim();
  if (!trimmedSetorId) {
    throw new Error('Selecione um setor válido para iniciar a produção.');
  }

  const estufas = await listEstufas(tenantId);
  const estufaComSetor = estufas.find((estufa: Estufa) =>
    (estufa.setores || []).some((setor) => setor.id === trimmedSetorId)
  );
  if (!estufaComSetor?.id) {
    throw new Error('O setor selecionado não pertence a uma estufa válida.');
  }

  return { estufaId: estufaComSetor.id, setorId: trimmedSetorId };
};

export const createHydroLote = async (data: HydroLoteFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const { estufaId, setorId } = await resolveSetorContext(tenantId, data.setorId);
  const now = Timestamp.now();
  const quantidadeInicial = sanitizeNonNegative(data.quantidadeInicial);
  const origemMaterialNome = data.origemMaterialNome?.trim();
  const origemMaterialDocumento = data.origemMaterialDocumento?.trim() || null;
  const nomeOperacional = data.nomeOperacional?.trim() || null;
  const verduraId = data.verduraId?.trim() || null;
  const culturaBase = data.culturaBase?.trim() || null;
  const variedadeBase = data.variedadeBase?.trim() || null;
  const codigoManual = data.codigoLote?.trim();
  if (!nomeOperacional) {
    throw new Error('Informe o nome da produção para rastreabilidade.');
  }
  if (quantidadeInicial <= 0) {
    throw new Error('A quantidade inicial deve ser maior que zero.');
  }
  if (!origemMaterialNome) {
    throw new Error('Informe a origem do material (ente anterior) para rastreabilidade.');
  }

  if (codigoManual && (await hydroLotCodeExists(tenantId, codigoManual))) {
    throw new Error('Já existe uma produção com essa numeração.');
  }

  const codigoLote = codigoManual || (await createUniqueHydroLotCode(tenantId, nomeOperacional || 'LOTE'));

  const payload: Omit<HydroLote, 'id'> = {
    tenantId,
    userId: tenantId,
    createdBy: tenantId,
    codigoLote,
    estufaId,
    setorId,
    quantidadeInicial,
    saldoDisponivel: quantidadeInicial,
    origemMaterialNome,
    origemMaterialDocumento,
    nomeOperacional,
    verduraId,
    culturaBase,
    variedadeBase,
    status: 'ativo',
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('hidro_lotes')
      .insert({
        tenant_id: tenantId,
        codigo_lote: payload.codigoLote,
        estufa_id: payload.estufaId,
        setor_id: payload.setorId,
        quantidade_inicial: payload.quantidadeInicial,
        saldo_disponivel: payload.saldoDisponivel,
        origem_material_nome: payload.origemMaterialNome,
        origem_material_documento: payload.origemMaterialDocumento || null,
        nome_operacional: payload.nomeOperacional || null,
        verdura_id: payload.verduraId || null,
        cultura_base: payload.culturaBase || null,
        variedade_base: payload.variedadeBase || null,
        status: payload.status,
      })
      .select('id')
      .single();
    if (error || !inserted?.id) throw new Error(`Erro ao criar produção hidropônica. ${error?.message || ''}`.trim());

    await createTraceabilityEventSafely(tenantId, {
      hydroLoteId: inserted.id,
      estufaId,
      entidade: 'hydro_lote',
      entidadeId: inserted.id,
      acao: 'criado',
      descricao: `Produção hidropônica iniciada no setor ${setorId}: ${codigoLote}.`,
      actorUid: tenantId,
      metadata: {
        codigoLote,
        nomeOperacional,
        setorId,
        quantidadeInicial,
        produto: {
          codigoRastreio: codigoLote,
          quantidade: quantidadeInicial,
          unidade: 'unidade',
          cultura: culturaBase,
          variedade: variedadeBase,
        },
        enteAnterior: {
          nome: origemMaterialNome,
          documento: origemMaterialDocumento,
          tipo: 'origem_material',
        },
        entePosterior: {
          nome: nomeOperacional,
          documento: inserted.id,
          tipo: 'producao_hidroponica',
        },
      },
    });

    return inserted.id as string;
  }

  const ref = await addDoc(collection(db, 'hidroponia_lotes'), payload);

  await createTraceabilityEventSafely(tenantId, {
    hydroLoteId: ref.id,
    estufaId,
    entidade: 'hydro_lote',
    entidadeId: ref.id,
    acao: 'criado',
    descricao: `Produção hidropônica iniciada no setor ${setorId}: ${codigoLote}.`,
    actorUid: tenantId,
    metadata: {
      codigoLote,
      nomeOperacional,
      setorId,
      quantidadeInicial,
      produto: {
        codigoRastreio: codigoLote,
        quantidade: quantidadeInicial,
        unidade: 'unidade',
        cultura: culturaBase,
        variedade: variedadeBase,
      },
      enteAnterior: {
        nome: origemMaterialNome,
        documento: origemMaterialDocumento,
        tipo: 'origem_material',
      },
      entePosterior: {
        nome: nomeOperacional,
        documento: ref.id,
        tipo: 'producao_hidroponica',
      },
    },
  });

  return ref.id;
};

export const getHydroLoteById = async (loteId: string, userId: string): Promise<HydroLote | null> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hidro_lotes')
      .select('*')
      .eq('id', loteId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw new Error(`Erro ao buscar produção hidropônica. ${error.message}`);
    return data ? mapSupabaseLoteToDomain(data) : null;
  }

  const snap = await getDoc(doc(db, 'hidroponia_lotes', loteId));
  if (!snap.exists()) return null;
  const data = snap.data() as HydroLote;
  if (data.tenantId !== tenantId) throw new Error('Acesso negado.');
  return normalizeLote(data, snap.id);
};

export const listHydroLotes = async (userId: string, estufaId?: string): Promise<HydroLote[]> => {
  const tenantId = assertTenantId(userId);
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    let req = supabase
      .from('hidro_lotes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (estufaId) req = req.eq('estufa_id', estufaId);
    const { data, error } = await req;
    if (error) throw new Error(`Erro ao listar produções hidropônicas. ${error.message}`);
    return (data || []).map(mapSupabaseLoteToDomain);
  }

  const constraints = [where('tenantId', '==', tenantId)];
  if (estufaId) constraints.push(where('estufaId', '==', estufaId));
  const snap = await getDocs(query(collection(db, 'hidroponia_lotes'), ...constraints));
  return snap.docs
    .map((item) => normalizeLote(item.data() as HydroLote, item.id))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
};

export const updateHydroLote = async (loteId: string, data: Partial<HydroLoteFormData>, userId: string) => {
  const tenantId = assertTenantId(userId);
  const lote = await getHydroLoteById(loteId, tenantId);
  if (!lote) throw new Error('Produção não encontrada.');

  const nextSetorId = data.setorId?.trim();
  const setorContext = nextSetorId ? await resolveSetorContext(tenantId, nextSetorId) : null;
  const nextNomeOperacional = normalizeText(
    data.nomeOperacional !== undefined ? data.nomeOperacional : lote.nomeOperacional
  );
  const nextOrigemMaterialNome = normalizeText(
    data.origemMaterialNome !== undefined ? data.origemMaterialNome : lote.origemMaterialNome
  );
  const nextOrigemMaterialDocumento = normalizeText(
    data.origemMaterialDocumento !== undefined
      ? data.origemMaterialDocumento
      : lote.origemMaterialDocumento
  );
  const nextVerduraId = normalizeText(data.verduraId !== undefined ? data.verduraId : lote.verduraId);
  const nextCulturaBase = normalizeText(
    data.culturaBase !== undefined ? data.culturaBase : lote.culturaBase
  );
  const nextVariedadeBase = normalizeText(
    data.variedadeBase !== undefined ? data.variedadeBase : lote.variedadeBase
  );
  const nextEstufaId = setorContext?.estufaId || lote.estufaId;
  const nextFinalSetorId = setorContext?.setorId || lote.setorId;

  const payload: Record<string, unknown> = {
    nomeOperacional: nextNomeOperacional,
    origemMaterialNome: nextOrigemMaterialNome || '',
    origemMaterialDocumento: nextOrigemMaterialDocumento,
    verduraId: nextVerduraId,
    culturaBase: nextCulturaBase,
    variedadeBase: nextVariedadeBase,
    updatedAt: Timestamp.now(),
  };
  if (setorContext) {
    payload.estufaId = setorContext.estufaId;
    payload.setorId = setorContext.setorId;
  }

  const changedFields: string[] = [];
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const checkField = (field: string, prev: unknown, next: unknown) => {
    if (prev !== next) {
      changedFields.push(field);
      before[field] = prev;
      after[field] = next;
    }
  };

  checkField('nomeOperacional', normalizeText(lote.nomeOperacional), nextNomeOperacional);
  checkField('origemMaterialNome', normalizeText(lote.origemMaterialNome), nextOrigemMaterialNome);
  checkField(
    'origemMaterialDocumento',
    normalizeText(lote.origemMaterialDocumento),
    nextOrigemMaterialDocumento
  );
  checkField('verduraId', normalizeText(lote.verduraId), nextVerduraId);
  checkField('culturaBase', normalizeText(lote.culturaBase), nextCulturaBase);
  checkField('variedadeBase', normalizeText(lote.variedadeBase), nextVariedadeBase);
  checkField('setorId', normalizeText(lote.setorId), normalizeText(nextFinalSetorId));
  checkField('estufaId', normalizeText(lote.estufaId), normalizeText(nextEstufaId));

  if (changedFields.length === 0) return;

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const supabasePayload: Record<string, unknown> = {
      nome_operacional: nextNomeOperacional,
      origem_material_nome: nextOrigemMaterialNome || '',
      origem_material_documento: nextOrigemMaterialDocumento,
      verdura_id: nextVerduraId,
      cultura_base: nextCulturaBase,
      variedade_base: nextVariedadeBase,
      updated_at: new Date().toISOString(),
    };
    if (setorContext) {
      supabasePayload.estufa_id = setorContext.estufaId;
      supabasePayload.setor_id = setorContext.setorId;
    }
    const { error } = await supabase
      .from('hidro_lotes')
      .update(supabasePayload)
      .eq('id', loteId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`Erro ao atualizar produção hidropônica. ${error.message}`);

    await createTraceabilityEventSafely(tenantId, {
      hydroLoteId: loteId,
      estufaId: nextEstufaId,
      entidade: 'hydro_lote',
      entidadeId: loteId,
      acao: 'atualizado',
      descricao: `Produção ${lote.codigoLote} atualizada (${changedFields.join(', ')}).`,
      actorUid: tenantId,
      metadata: {
        codigoLote: lote.codigoLote,
        changedFields,
        before,
        after,
        produto: {
          codigoRastreio: lote.codigoLote,
          nome: nextNomeOperacional || lote.codigoLote,
        },
      },
    });
    return;
  }

  // codigoLote nunca muda
  await updateDoc(doc(db, 'hidroponia_lotes', loteId), payload);

  await createTraceabilityEventSafely(tenantId, {
    hydroLoteId: loteId,
    estufaId: nextEstufaId,
    entidade: 'hydro_lote',
    entidadeId: loteId,
    acao: 'atualizado',
    descricao: `Produção ${lote.codigoLote} atualizada (${changedFields.join(', ')}).`,
    actorUid: tenantId,
    metadata: {
      codigoLote: lote.codigoLote,
      changedFields,
      before,
      after,
      produto: {
        codigoRastreio: lote.codigoLote,
        nome: nextNomeOperacional || lote.codigoLote,
      },
    },
  });
};

export const syncHydroLoteStatus = async (loteId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  const lote = await getHydroLoteById(loteId, tenantId);
  if (!lote) return;

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data: activeRows, error } = await supabase
      .from('hidro_ocupacoes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('lote_id', loteId)
      .eq('status', 'ativa');
    if (error) throw new Error(`Erro ao sincronizar status da produção. ${error.message}`);

    const activeByLote = (activeRows || []).length;
    const saldoDisponivel = sanitizeNonNegative(lote.saldoDisponivel);
    const nextStatus =
      lote.status === 'cancelado'
        ? 'cancelado'
        : activeByLote > 0 || saldoDisponivel > 0
        ? 'ativo'
        : 'concluido';

    if (nextStatus !== lote.status) {
      const { error: updateError } = await supabase
        .from('hidro_lotes')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loteId)
        .eq('tenant_id', tenantId);
      if (updateError) throw new Error(`Erro ao atualizar status da produção. ${updateError.message}`);

      await createTraceabilityEventSafely(tenantId, {
        hydroLoteId: loteId,
        estufaId: lote.estufaId,
        entidade: 'hydro_lote',
        entidadeId: loteId,
        acao: 'status_alterado',
        descricao: `Status da produção ${lote.codigoLote} alterado de ${lote.status} para ${nextStatus}.`,
        actorUid: tenantId,
        metadata: {
          codigoLote: lote.codigoLote,
          previousStatus: lote.status,
          nextStatus,
          activeOcupacoes: activeByLote,
          saldoDisponivel,
        },
      });
    }
    return;
  }

  const [byTenant, byUser] = await Promise.all([
    getDocs(
      query(
        collection(db, 'hidroponia_ocupacoes'),
        where('tenantId', '==', tenantId),
        where('status', '==', 'ativa')
      )
    ),
    getDocs(
      query(
        collection(db, 'hidroponia_ocupacoes'),
        where('userId', '==', tenantId),
        where('status', '==', 'ativa')
      )
    ),
  ]);

  const activeByLote = [...byTenant.docs, ...byUser.docs]
    .map((item) => item.data())
    .filter((item: any) => item?.loteId === loteId).length;

  const saldoDisponivel = sanitizeNonNegative(lote.saldoDisponivel);
  const nextStatus =
    lote.status === 'cancelado'
      ? 'cancelado'
      : activeByLote > 0 || saldoDisponivel > 0
      ? 'ativo'
      : 'concluido';

  if (nextStatus !== lote.status) {
    await updateDoc(doc(db, 'hidroponia_lotes', loteId), {
      status: nextStatus,
      updatedAt: Timestamp.now(),
    });

    await createTraceabilityEventSafely(tenantId, {
      hydroLoteId: loteId,
      estufaId: lote.estufaId,
      entidade: 'hydro_lote',
      entidadeId: loteId,
      acao: 'status_alterado',
      descricao: `Status da produção ${lote.codigoLote} alterado de ${lote.status} para ${nextStatus}.`,
      actorUid: tenantId,
      metadata: {
        codigoLote: lote.codigoLote,
        previousStatus: lote.status,
        nextStatus,
        activeOcupacoes: activeByLote,
        saldoDisponivel,
      },
    });
  }
};
