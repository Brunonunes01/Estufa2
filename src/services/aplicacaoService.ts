import { Timestamp } from '../lib/timestamp';
import { Aplicacao, AplicacaoItem, Insumo } from '../types/domain';
import { OfflineWriteOptions } from './offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from './offline/offlineWrite';
import { getSupabaseClient } from './supabaseClient';
import { assertTenantId } from './tenantGuard';
import { createTraceabilityEventSafely } from './traceabilityService';

export interface AplicacaoItemData {
  insumoId: string;
  nomeInsumo: string;
  dosePorTanque: number;
  quantidadeAplicada?: number;
  unidade: string;
}

export interface CreateAplicacaoData {
  plantioId: string;
  estufaId?: string;
  tipoAplicacao?: 'defensivo' | 'fertilizacao';
  volumeTanque?: number;
  numeroTanques?: number;
  observacoes?: string;
  itens: AplicacaoItemData[];
}

const mapSupabaseAplicacaoToDomain = (row: any): Aplicacao => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  plantioId: row.plantio_id,
  estufaId: row.estufa_id || undefined,
  dataAplicacao: Timestamp.fromDate(new Date(row.data_aplicacao)),
  tipoAplicacao: row.tipo_aplicacao || undefined,
  volumeTanque: row.volume_tanque != null ? Number(row.volume_tanque) : undefined,
  numeroTanques: row.numero_tanques != null ? Number(row.numero_tanques) : undefined,
  observacoes: row.observacoes || undefined,
  custoCalculado: Number(row.custo_calculado || 0),
  itens: Array.isArray(row.aplicacao_itens)
    ? row.aplicacao_itens.map(
        (item: any): AplicacaoItem => ({
          insumoId: item.insumo_id,
          nomeInsumo: item.nome_insumo,
          dosePorTanque: item.dose_por_tanque != null ? Number(item.dose_por_tanque) : undefined,
          quantidadeAplicada: Number(item.quantidade_aplicada || 0),
          unidade: item.unidade,
          custoUnitarioNaAplicacao:
            item.custo_unitario_na_aplicacao != null ? Number(item.custo_unitario_na_aplicacao) : undefined,
        })
      )
    : [],
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const createAplicacaoSupabase = async (data: CreateAplicacaoData, tenantId: string) => {
  const supabase = getSupabaseClient();

  if (!data.itens?.length) {
    throw new Error('A aplicação precisa de ao menos um item de insumo.');
  }

  const { data: plantio, error: plantioError } = await supabase
    .from('plantios')
    .select('id, tenant_id, custo_acumulado')
    .eq('id', data.plantioId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (plantioError) {
    throw new Error(`Erro ao validar plantio. ${plantioError.message}`);
  }
  if (!plantio) {
    throw new Error('Plantio não encontrado.');
  }

  const itensAplicacao: AplicacaoItem[] = [];
  let custoCalculadoTotal = 0;

  for (const item of data.itens) {
    const quantidade = Number(item.quantidadeAplicada || 0);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new Error(`Quantidade inválida para ${item.nomeInsumo}.`);
    }

    const { data: insumo, error: insumoError } = await supabase
      .from('insumos')
      .select('id, nome, estoque_atual, custo_unitario')
      .eq('id', item.insumoId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (insumoError) {
      throw new Error(`Erro ao validar insumo ${item.nomeInsumo}. ${insumoError.message}`);
    }
    if (!insumo) {
      throw new Error(`Insumo não encontrado (${item.nomeInsumo}).`);
    }

    const estoqueAtual = Number(insumo.estoque_atual || 0);
    if (estoqueAtual < quantidade) {
      throw new Error(`Estoque insuficiente para ${item.nomeInsumo}. Disponível: ${estoqueAtual} ${item.unidade}`);
    }

    const custoUnitarioNaAplicacao = Number(insumo.custo_unitario || 0);
    const custoItem = quantidade * custoUnitarioNaAplicacao;
    custoCalculadoTotal += custoItem;

    const { error: stockError } = await supabase
      .from('insumos')
      .update({
        estoque_atual: estoqueAtual - quantidade,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.insumoId)
      .eq('tenant_id', tenantId);
    if (stockError) {
      throw new Error(`Erro ao atualizar estoque de ${item.nomeInsumo}. ${stockError.message}`);
    }

    itensAplicacao.push({
      insumoId: item.insumoId,
      nomeInsumo: item.nomeInsumo,
      dosePorTanque: item.dosePorTanque,
      quantidadeAplicada: quantidade,
      unidade: item.unidade,
      custoUnitarioNaAplicacao,
    });
  }

  const { data: aplicacaoRow, error: aplicacaoError } = await supabase
    .from('aplicacoes')
    .insert({
      tenant_id: tenantId,
      plantio_id: data.plantioId,
      estufa_id: data.estufaId || null,
      tipo_aplicacao: data.tipoAplicacao || null,
      data_aplicacao: new Date().toISOString(),
      volume_tanque: data.volumeTanque ?? 0,
      numero_tanques: data.numeroTanques ?? 1,
      observacoes: data.observacoes || null,
      custo_calculado: custoCalculadoTotal,
    })
    .select('id')
    .single();
  if (aplicacaoError || !aplicacaoRow?.id) {
    throw new Error(`Erro ao salvar aplicação. ${aplicacaoError?.message || ''}`.trim());
  }

  const { error: itensError } = await supabase.from('aplicacao_itens').insert(
    itensAplicacao.map((item) => ({
      tenant_id: tenantId,
      aplicacao_id: aplicacaoRow.id,
      insumo_id: item.insumoId,
      nome_insumo: item.nomeInsumo,
      dose_por_tanque: item.dosePorTanque ?? null,
      quantidade_aplicada: item.quantidadeAplicada,
      unidade: item.unidade,
      custo_unitario_na_aplicacao: item.custoUnitarioNaAplicacao ?? null,
    }))
  );
  if (itensError) {
    throw new Error(`Erro ao salvar itens da aplicação. ${itensError.message}`);
  }

  const { error: plantioUpdateError } = await supabase
    .from('plantios')
    .update({
      custo_acumulado: Number(plantio.custo_acumulado || 0) + custoCalculadoTotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.plantioId)
    .eq('tenant_id', tenantId);
  if (plantioUpdateError) {
    throw new Error(`Erro ao atualizar custo acumulado do plantio. ${plantioUpdateError.message}`);
  }

  await createTraceabilityEventSafely(tenantId, {
    plantioId: data.plantioId,
    estufaId: data.estufaId || null,
    entidade: 'aplicacao',
    entidadeId: aplicacaoRow.id,
    acao: 'criado',
    descricao: 'Aplicação de insumos registrada.',
    actorUid: tenantId,
    metadata: {
      itensCount: itensAplicacao.length,
      custoCalculado: custoCalculadoTotal,
      tipoAplicacao: data.tipoAplicacao || null,
      itens: data.itens.map((item) => ({
        insumoId: item.insumoId,
        nomeInsumo: item.nomeInsumo,
        quantidadeAplicada: Number(item.quantidadeAplicada || 0),
        unidade: item.unidade,
        dosePorTanque: Number(item.dosePorTanque || 0),
      })),
    },
  });

  return aplicacaoRow.id as string;
};

export const createAplicacao = async (
  data: CreateAplicacaoData,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'createAplicacao',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => createAplicacaoSupabase(data, tenantId),
  });
};

export const listAplicacoesByPlantio = async (userId: string, plantioId: string): Promise<Aplicacao[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('aplicacoes')
    .select('*, aplicacao_itens(*)')
    .eq('tenant_id', tenantId)
    .eq('plantio_id', plantioId)
    .order('data_aplicacao', { ascending: false });
  if (error) {
    throw new Error(`Erro ao listar aplicações do plantio. ${error.message}`);
  }
  return (data || []).map(mapSupabaseAplicacaoToDomain);
};

export const registrarAplicacaoInsumo = async (
  userId: string,
  data: Omit<Aplicacao, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const tenantId = assertTenantId(userId);

  let insumoReal: Insumo | undefined;
  const supabase = getSupabaseClient();
  const { data: row } = await supabase
    .from('insumos')
    .select('id, nome, unidade_medida')
    .eq('tenant_id', tenantId)
    .eq('id', String(data.insumoId || ''))
    .maybeSingle();
  if (row) {
    insumoReal = {
      id: row.id,
      tenantId,
      userId: tenantId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nome: row.nome,
      unidadeMedida: row.unidade_medida || undefined,
      estoqueAtual: 0,
      custoUnitario: 0,
    } as Insumo;
  }

  const item: AplicacaoItemData = {
    insumoId: String(data.insumoId || ''),
    nomeInsumo: insumoReal?.nome || 'Insumo',
    dosePorTanque: Number(data.quantidadeAplicada || 0),
    quantidadeAplicada: Number(data.quantidadeAplicada || 0),
    unidade: insumoReal?.unidadeMedida || 'un',
  };

  return createAplicacao(
    {
      plantioId: data.plantioId,
      estufaId: data.estufaId,
      tipoAplicacao: data.tipoAplicacao,
      observacoes: data.observacoes,
      itens: [item],
    },
    userId
  );
};

