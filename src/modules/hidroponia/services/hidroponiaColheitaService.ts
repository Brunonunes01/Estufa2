import { Timestamp } from '../../../lib/timestamp';
import { assertTenantId } from '../../../services/tenantGuard';
import { createTraceabilityEventSafely } from '../../../services/traceabilityService';
import { createVenda } from '../../../services/vendaService';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { getClienteById } from '../../../services/clienteService';
import { getHydroLoteById, syncHydroLoteStatus } from './hidroponiaLoteService';
import { getHydroOcupacaoById, listHydroOcupacoesByLote } from './hidroponiaOcupacaoService';
import { OfflineWriteOptions } from '../../../services/offline/offlineStorage';
import { buildOfflinePlaceholderId, runOfflineWrite } from '../../../services/offline/offlineWrite';

export interface HydroColheitaFormData {
  ocupacaoId: string;
  quantidadeColhida: number;
  unidade: string;
  precoUnitario: number;
  clienteId?: string | null;
  metodoPagamento?: string;
  pagamentoPara?: string | null;
  dataColheita?: Date;
  observacoes?: string;
}

export interface HydroVendaLoteFormData {
  loteId: string;
  quantidadeColhida: number;
  unidade: string;
  precoUnitario: number;
  clienteId?: string | null;
  metodoPagamento?: string;
  pagamentoPara?: string | null;
  dataColheita?: Date;
  observacoes?: string;
  itemDescricao?: string | null;
}

type Allocation = {
  ocupacaoId: string;
  estruturaId: string;
  cultura: string;
  quantidade: number;
};

type OccupancySnapshot = {
  id: string;
  status: string;
  quantidadeAlocada: number;
  dataFim?: Timestamp | null;
};

const buildClienteEndereco = (cliente: any) => {
  const parts = [cliente?.endereco, cliente?.numero, cliente?.bairro, cliente?.cidade, cliente?.estado, cliente?.cep].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const resolveCompradorTrace = async (tenantId: string, clienteId?: string | null) => {
  if (!clienteId) {
    return {
      nome: 'Consumidor final',
      documento: null,
      endereco: null,
      tipo: 'consumidor_final',
    };
  }
  const cliente = await getClienteById(clienteId, tenantId);
  return {
    nome: cliente?.nome || 'Cliente não identificado',
    documento: cliente?.documento || null,
    endereco: cliente ? buildClienteEndereco(cliente) : null,
    tipo: 'comprador',
  };
};

const validateVendaValues = (quantidade: number, unidade: string, precoUnitario: number) => {
  if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida para venda.');
  if (!unidade?.trim()) throw new Error('Informe a unidade da venda.');
  if (!Number.isFinite(precoUnitario) || precoUnitario < 0) throw new Error('Preço unitário da venda não pode ser negativo.');
};

const restoreHydroOccupancies = async (
  snapshots: OccupancySnapshot[],
  tenantId: string
) => {
  if (snapshots.length === 0) return;

  const supabase = getSupabaseClient();
  const restoredAt = new Date().toISOString();

  for (const snapshot of snapshots) {
    const { error } = await supabase
      .from('hidro_ocupacoes')
      .update({
        status: snapshot.status,
        quantidade_alocada: Number(snapshot.quantidadeAlocada || 0),
        data_fim: snapshot.dataFim ? snapshot.dataFim.toDate().toISOString() : null,
        updated_at: restoredAt,
      })
      .eq('id', snapshot.id)
      .eq('tenant_id', tenantId);
    if (error) {
      throw new Error(`Falha ao restaurar saldo hidropônico. ${error.message}`);
    }
  }
};

const rollbackCreatedVenda = async (vendaId: string, tenantId: string) => {
  const supabase = getSupabaseClient();
  await supabase.from('venda_itens').delete().eq('venda_id', vendaId).eq('tenant_id', tenantId);
  await supabase.from('vendas').delete().eq('id', vendaId).eq('tenant_id', tenantId);
};

export const registrarColheitaHidroponica = async (
  data: HydroColheitaFormData,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'registrarColheitaHidroponica',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      const now = Timestamp.now();
      const dataOp = data.dataColheita ? Timestamp.fromDate(data.dataColheita) : now;

      const ocupacao = await getHydroOcupacaoById(data.ocupacaoId, tenantId);
      if (!ocupacao) throw new Error('Ocupação não encontrada.');
      if (ocupacao.status !== 'ativa') throw new Error('A ocupação selecionada já está encerrada.');

      const quantidade = Number(data.quantidadeColhida || 0);
      validateVendaValues(quantidade, data.unidade, Number(data.precoUnitario || 0));
      if (quantidade > Number(ocupacao.quantidadeAlocada || 0)) {
        throw new Error(`Quantidade acima do saldo da bancada (${Number(ocupacao.quantidadeAlocada || 0)} unidades).`);
      }

      const lote = await getHydroLoteById(ocupacao.loteId, tenantId);
      if (!lote) throw new Error('Produção hidropônica não encontrada.');
      const compradorTrace = await resolveCompradorTrace(tenantId, data.clienteId || null);

      const supabase = getSupabaseClient();
      const restante = Math.max(0, Number(ocupacao.quantidadeAlocada || 0) - quantidade);
      const snapshot: OccupancySnapshot = {
        id: ocupacao.id,
        status: ocupacao.status,
        quantidadeAlocada: Number(ocupacao.quantidadeAlocada || 0),
        dataFim: ocupacao.dataFim || null,
      };

      let vendaId: string | null = null;

      try {
        const { error: ocupError } = await supabase
          .from('hidro_ocupacoes')
          .update(
            restante <= 0
              ? {
                  status: 'encerrada',
                  quantidade_alocada: 0,
                  data_fim: dataOp.toDate().toISOString(),
                  updated_at: now.toDate().toISOString(),
                }
              : {
                  quantidade_alocada: restante,
                  updated_at: now.toDate().toISOString(),
                }
          )
          .eq('id', ocupacao.id)
          .eq('tenant_id', tenantId);
        if (ocupError) throw new Error(`Erro ao atualizar ocupação da colheita. ${ocupError.message}`);

        const descricaoItem = `${ocupacao.cultura || 'Produção hidropônica'} - Colheita Hidropônica`;
        const observacoesFinal = data.observacoes || `Bancada ${ocupacao.estruturaId}`;
        vendaId = await createVenda(
          {
            hydroLoteId: ocupacao.loteId,
            originType: 'hydro_lote',
            originId: ocupacao.loteId,
            estufaId: ocupacao.estufaId,
            clienteId: data.clienteId || null,
            quantidade,
            unidade: data.unidade,
            precoUnitario: Number(data.precoUnitario || 0),
            metodoPagamento: data.metodoPagamento || 'pix',
            pagamentoPara: data.pagamentoPara || null,
            dataVenda: data.dataColheita,
            observacoes: observacoesFinal,
            itemDescricao: descricaoItem,
            cultura: ocupacao.cultura || null,
          },
          tenantId
        );
        await syncHydroLoteStatus(ocupacao.loteId, tenantId);
      } catch (error) {
        if (vendaId) {
          await rollbackCreatedVenda(vendaId, tenantId);
        }
        await restoreHydroOccupancies([snapshot], tenantId);
        await syncHydroLoteStatus(ocupacao.loteId, tenantId);
        throw error;
      }

      await createTraceabilityEventSafely(tenantId, {
        hydroLoteId: ocupacao.loteId,
        estufaId: ocupacao.estufaId,
        entidade: 'venda',
        entidadeId: vendaId,
        acao: 'colhido',
        descricao: `Colheita e venda de ${quantidade} ${data.unidade} de ${ocupacao.cultura}.`,
        actorUid: tenantId,
        metadata: {
          ocupacaoId: ocupacao.id,
          quantidade,
          bancada: ocupacao.estruturaId,
          produto: {
            codigoRastreio: lote.codigoLote,
            descricao: `${ocupacao.cultura || 'Produção hidropônica'} - Colheita`,
            quantidade,
            unidade: data.unidade,
          },
          enteAnterior: {
            nome: lote.nomeOperacional || lote.codigoLote,
            documento: lote.id,
            tipo: 'producao_hidroponica',
          },
          entePosterior: compradorTrace,
        },
      });

      return vendaId;
    },
  });
};

export const registrarVendaHidroponicaPorLote = async (
  data: HydroVendaLoteFormData,
  userId: string,
  options?: OfflineWriteOptions
) => {
  const tenantId = assertTenantId(userId);
  return runOfflineWrite({
    action: 'registrarVendaHidroponicaPorLote',
    payload: { data, userId: tenantId },
    options,
    onQueuedValue: () => buildOfflinePlaceholderId(),
    write: async () => {
      const lote = await getHydroLoteById(data.loteId, tenantId);
      if (!lote) throw new Error('Produção hidropônica não encontrada.');
      const compradorTrace = await resolveCompradorTrace(tenantId, data.clienteId || null);

      const quantidade = Number(data.quantidadeColhida || 0);
      validateVendaValues(quantidade, data.unidade, Number(data.precoUnitario || 0));

      const ocupacoesAtivas = (await listHydroOcupacoesByLote(tenantId, data.loteId)).sort((a, b) => {
        const msA = typeof a.dataInicio?.toMillis === 'function' ? a.dataInicio.toMillis() : 0;
        const msB = typeof b.dataInicio?.toMillis === 'function' ? b.dataInicio.toMillis() : 0;
        return msA - msB;
      });

      if (ocupacoesAtivas.length === 0) throw new Error('Esta produção não possui bancadas ativas para venda.');

      const totalDisponivel = ocupacoesAtivas.reduce((sum, item) => sum + Number(item.quantidadeAlocada || 0), 0);
      if (quantidade > totalDisponivel) {
        throw new Error(`Quantidade acima do saldo ativo da produção (${totalDisponivel} unidades).`);
      }

      let restante = quantidade;
      const allocations: Allocation[] = [];
      for (const ocupacao of ocupacoesAtivas) {
        if (restante <= 0) break;
        const saldo = Number(ocupacao.quantidadeAlocada || 0);
        if (saldo <= 0) continue;
        const abater = Math.min(restante, saldo);
        allocations.push({
          ocupacaoId: ocupacao.id,
          estruturaId: ocupacao.estruturaId,
          cultura: ocupacao.cultura || 'Produção hidropônica',
          quantidade: abater,
        });
        restante -= abater;
      }

      if (allocations.length === 0 || restante > 0) {
        throw new Error('Não foi possível distribuir a baixa de saldo nas bancadas ativas.');
      }

      const culturas = Array.from(new Set(allocations.map((item) => item.cultura))).filter(Boolean);
      const descricaoItem = data.itemDescricao?.trim() || (culturas.length > 0 ? culturas.join(' / ') : 'Produção hidropônica');
      const observacoesFinal = data.observacoes?.trim() || `Produção hidropônica: ${lote.codigoLote}`;

      const supabase = getSupabaseClient();
      const now = Timestamp.now();
      const dataOp = data.dataColheita ? Timestamp.fromDate(data.dataColheita) : now;
      const touchedSnapshots: OccupancySnapshot[] = allocations
        .map((allocation) => {
          const ocupacao = ocupacoesAtivas.find((item) => item.id === allocation.ocupacaoId);
          if (!ocupacao) return null;
          return {
            id: ocupacao.id,
            status: ocupacao.status,
            quantidadeAlocada: Number(ocupacao.quantidadeAlocada || 0),
            dataFim: ocupacao.dataFim || null,
          } as OccupancySnapshot;
        })
        .filter(Boolean) as OccupancySnapshot[];

      let vendaId: string | null = null;

      try {
        for (const allocation of allocations) {
          const ocupacao = ocupacoesAtivas.find((item) => item.id === allocation.ocupacaoId);
          if (!ocupacao) continue;
          const restanteAlocacao = Math.max(0, Number(ocupacao.quantidadeAlocada || 0) - allocation.quantidade);
          const { error } = await supabase
            .from('hidro_ocupacoes')
            .update(
              restanteAlocacao <= 0
                ? {
                    status: 'encerrada',
                    quantidade_alocada: 0,
                    data_fim: dataOp.toDate().toISOString(),
                    updated_at: now.toDate().toISOString(),
                  }
                : {
                    quantidade_alocada: restanteAlocacao,
                    updated_at: now.toDate().toISOString(),
                  }
            )
            .eq('id', allocation.ocupacaoId)
            .eq('tenant_id', tenantId);
          if (error) throw new Error(`Erro ao baixar saldo da bancada. ${error.message}`);
        }

        vendaId = await createVenda(
          {
            hydroLoteId: data.loteId,
            originType: 'hydro_lote',
            originId: data.loteId,
            estufaId: lote.estufaId,
            clienteId: data.clienteId || null,
            quantidade,
            unidade: data.unidade,
            precoUnitario: Number(data.precoUnitario || 0),
            metodoPagamento: data.metodoPagamento || 'pix',
            pagamentoPara: data.pagamentoPara || null,
            dataVenda: data.dataColheita,
            observacoes: observacoesFinal,
            itemDescricao: descricaoItem,
            cultura: culturas.join(' / ') || null,
          },
          tenantId
        );
        await syncHydroLoteStatus(data.loteId, tenantId);
      } catch (error) {
        if (vendaId) {
          await rollbackCreatedVenda(vendaId, tenantId);
        }
        await restoreHydroOccupancies(touchedSnapshots, tenantId);
        await syncHydroLoteStatus(data.loteId, tenantId);
        throw error;
      }

      await createTraceabilityEventSafely(tenantId, {
        hydroLoteId: data.loteId,
        estufaId: lote.estufaId,
        entidade: 'venda',
        entidadeId: vendaId,
        acao: 'colhido',
        descricao: `Venda hidropônica da produção ${lote.codigoLote} (${quantidade} ${data.unidade}).`,
        actorUid: tenantId,
        metadata: {
          quantidade,
          metodoPagamento: data.metodoPagamento || 'pix',
          pagamentoPara: data.pagamentoPara || null,
          allocations,
          produto: {
            codigoRastreio: lote.codigoLote,
            descricao: descricaoItem,
            quantidade,
            unidade: data.unidade,
          },
          enteAnterior: {
            nome: lote.nomeOperacional || lote.codigoLote,
            documento: lote.id,
            tipo: 'producao_hidroponica',
          },
          entePosterior: compradorTrace,
        },
      });

      return vendaId;
    },
  });
};
