import { collection, doc, runTransaction, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { createTraceabilityEventSafely } from '../../../services/traceabilityService';
import { getClienteById } from '../../../services/clienteService';
import {
  buildPublicTraceabilityLookupUrl,
  createTraceabilityPublicTokenFromId,
} from '../../../services/publicTraceabilityService';
import { Venda } from '../../../types/domain';
import { HydroOcupacao } from '../types';
import { getHydroLoteById, syncHydroLoteStatus } from './hidroponiaLoteService';
import { getHydroOcupacaoById, listHydroOcupacoesByLote } from './hidroponiaOcupacaoService';

export interface HydroColheitaFormData {
  ocupacaoId: string;
  quantidadeColhida: number;
  unidade: string;
  precoUnitario: number;
  clienteId?: string | null;
  metodoPagamento?: string;
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

const buildClienteEndereco = (cliente: any) => {
  const parts = [
    cliente?.endereco,
    cliente?.numero,
    cliente?.bairro,
    cliente?.cidade,
    cliente?.estado,
    cliente?.cep,
  ].filter(Boolean);
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

const applyAllocation = (
  batch: ReturnType<typeof writeBatch>,
  ocupacao: HydroOcupacao,
  quantidadeAbater: number,
  now: Timestamp,
  dataOp: Timestamp
) => {
  const restante = Math.max(0, Number(ocupacao.quantidadeAlocada || 0) - quantidadeAbater);
  const ref = doc(db, 'hidroponia_ocupacoes', ocupacao.id);
  if (restante <= 0) {
    batch.update(ref, {
      status: 'encerrada',
      quantidadeAlocada: 0,
      dataFim: dataOp,
      updatedAt: now,
    });
  } else {
    batch.update(ref, {
      quantidadeAlocada: restante,
      updatedAt: now,
    });
  }
};

const toStatusPagamento = (metodoPagamento?: string) =>
  metodoPagamento === 'prazo' ? 'pendente' : 'pago';

const validateVendaValues = (quantidade: number, unidade: string, precoUnitario: number) => {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error('Quantidade inválida para venda.');
  }
  if (!unidade?.trim()) {
    throw new Error('Informe a unidade da venda.');
  }
  if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
    throw new Error('Preço unitário da venda não pode ser negativo.');
  }
};

const createVendaPayload = (
  tenantId: string,
  loteId: string,
  estufaId: string,
  quantidade: number,
  unidade: string,
  precoUnitario: number,
  metodoPagamento: string,
  dataOp: Timestamp,
  descricaoItem: string,
  observacoes: string,
  clienteId?: string | null,
  traceabilityPublicToken?: string | null
): Omit<Venda, 'id'> & { quantidade: number; unidade: string; precoUnitario: number } => {
  const valorTotal = Number(quantidade || 0) * Number(precoUnitario || 0);
  const statusPagamento = toStatusPagamento(metodoPagamento);
  const token = String(traceabilityPublicToken || '').trim() || null;

  return {
    tenantId,
    userId: tenantId,
    createdBy: tenantId,
    hydroLoteId: loteId,
    traceabilityPublicToken: token,
    traceabilityPublicUrl: token ? buildPublicTraceabilityLookupUrl(token) || null : null,
    originType: 'hydro_lote',
    originId: loteId,
    estufaId,
    clienteId: clienteId || null,
    dataVenda: dataOp,
    dataVencimento:
      statusPagamento === 'pendente'
        ? Timestamp.fromMillis(dataOp.toMillis() + 15 * 24 * 60 * 60 * 1000)
        : null,
    itens: [
      {
        descricao: descricaoItem,
        quantidade: Number(quantidade || 0),
        unidade,
        valorUnitario: Number(precoUnitario || 0),
      },
    ],
    valorTotal,
    statusPagamento,
    formaPagamento: (metodoPagamento || 'pix') as Venda['formaPagamento'],
    metodoPagamento: metodoPagamento || 'pix',
    observacoes,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    quantidade: Number(quantidade || 0),
    unidade,
    precoUnitario: Number(precoUnitario || 0),
  };
};

export const registrarColheitaHidroponica = async (data: HydroColheitaFormData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();
  const dataOp = data.dataColheita ? Timestamp.fromDate(data.dataColheita) : now;

  const ocupacao = await getHydroOcupacaoById(data.ocupacaoId, tenantId);
  if (!ocupacao) throw new Error('Ocupação não encontrada.');
  if (ocupacao.status !== 'ativa') throw new Error('A ocupação selecionada já está encerrada.');

  const quantidade = Number(data.quantidadeColhida || 0);
  validateVendaValues(quantidade, data.unidade, Number(data.precoUnitario || 0));
  if (quantidade > Number(ocupacao.quantidadeAlocada || 0)) {
    throw new Error(
      `Quantidade acima do saldo da bancada (${Number(ocupacao.quantidadeAlocada || 0)} unidades).`
    );
  }

  const lote = await getHydroLoteById(ocupacao.loteId, tenantId);
  if (!lote) throw new Error('Produção hidropônica não encontrada.');
  const compradorTrace = await resolveCompradorTrace(tenantId, data.clienteId || null);

  const vendaRef = doc(collection(db, 'vendas'));
  const traceabilityPublicToken = createTraceabilityPublicTokenFromId(vendaRef.id);

  const descricaoItem = `${ocupacao.cultura || 'Produção hidropônica'} - Colheita Hidropônica`;
  const observacoesFinal = data.observacoes || `Bancada ${ocupacao.estruturaId}`;
  const payload = createVendaPayload(
    tenantId,
    ocupacao.loteId,
    ocupacao.estufaId,
    quantidade,
    data.unidade,
    Number(data.precoUnitario || 0),
    data.metodoPagamento || 'pix',
    dataOp,
    descricaoItem,
    observacoesFinal,
    data.clienteId,
    traceabilityPublicToken
  );

  await runTransaction(db, async (transaction) => {
    const ocupacaoRef = doc(db, 'hidroponia_ocupacoes', ocupacao.id);
    const ocupacaoSnap = await transaction.get(ocupacaoRef);
    if (!ocupacaoSnap.exists()) throw new Error('Ocupação não encontrada.');

    const currentOcupacao = { ...(ocupacaoSnap.data() as HydroOcupacao), id: ocupacaoSnap.id };
    if (currentOcupacao.tenantId !== tenantId && currentOcupacao.userId !== tenantId) {
      throw new Error('Acesso negado à ocupação selecionada.');
    }
    if (currentOcupacao.status !== 'ativa') {
      throw new Error('A ocupação selecionada já está encerrada.');
    }
    if (quantidade > Number(currentOcupacao.quantidadeAlocada || 0)) {
      throw new Error(
        `Quantidade acima do saldo da bancada (${Number(currentOcupacao.quantidadeAlocada || 0)} unidades).`
      );
    }

    transaction.set(vendaRef, {
      ...payload,
      hydroAllocations: [{ ocupacaoId: currentOcupacao.id, estruturaId: currentOcupacao.estruturaId, quantidade }],
    } as any);
    applyAllocation(transaction as unknown as ReturnType<typeof writeBatch>, currentOcupacao, quantidade, now, dataOp);
  });
  await syncHydroLoteStatus(ocupacao.loteId, tenantId);

  await createTraceabilityEventSafely(tenantId, {
    hydroLoteId: ocupacao.loteId,
    estufaId: ocupacao.estufaId,
    entidade: 'venda',
    entidadeId: vendaRef.id,
    acao: 'colhido',
    descricao: `Colheita e venda de ${quantidade} ${data.unidade} de ${ocupacao.cultura}.`,
    actorUid: tenantId,
    metadata: {
      ocupacaoId: ocupacao.id,
      quantidade,
      valorTotal: payload.valorTotal,
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
      traceabilityPublicToken: payload.traceabilityPublicToken || null,
      traceabilityPublicUrl: payload.traceabilityPublicUrl || null,
    },
  });

  return vendaRef.id;
};

export const registrarVendaHidroponicaPorLote = async (
  data: HydroVendaLoteFormData,
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();
  const dataOp = data.dataColheita ? Timestamp.fromDate(data.dataColheita) : now;
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

  if (ocupacoesAtivas.length === 0) {
    throw new Error('Esta produção não possui bancadas ativas para venda.');
  }

  const totalDisponivel = ocupacoesAtivas.reduce(
    (sum, item) => sum + Number(item.quantidadeAlocada || 0),
    0
  );
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
  const descricaoItem =
    data.itemDescricao?.trim() ||
    (culturas.length > 0 ? culturas.join(' / ') : 'Produção hidropônica');
  const observacoesFinal = data.observacoes?.trim() || `Produção hidropônica: ${lote.codigoLote}`;

  const vendaRef = doc(collection(db, 'vendas'));
  const traceabilityPublicToken = createTraceabilityPublicTokenFromId(vendaRef.id);
  const payload = createVendaPayload(
    tenantId,
    data.loteId,
    lote.estufaId,
    quantidade,
    data.unidade,
    Number(data.precoUnitario || 0),
    data.metodoPagamento || 'pix',
    dataOp,
    descricaoItem,
    observacoesFinal,
    data.clienteId,
    traceabilityPublicToken
  );

  await runTransaction(db, async (transaction) => {
    const currentOcupacoes: HydroOcupacao[] = [];
    for (const allocation of allocations) {
      const ocupacaoRef = doc(db, 'hidroponia_ocupacoes', allocation.ocupacaoId);
      const ocupacaoSnap = await transaction.get(ocupacaoRef);
      if (!ocupacaoSnap.exists()) throw new Error('Ocupação selecionada não encontrada.');

      const currentOcupacao = { ...(ocupacaoSnap.data() as HydroOcupacao), id: ocupacaoSnap.id };
      if (currentOcupacao.tenantId !== tenantId && currentOcupacao.userId !== tenantId) {
        throw new Error('Acesso negado à ocupação selecionada.');
      }
      if (currentOcupacao.status !== 'ativa') {
        throw new Error('Uma das bancadas selecionadas já foi encerrada.');
      }
      if (allocation.quantidade > Number(currentOcupacao.quantidadeAlocada || 0)) {
        throw new Error('Saldo da produção mudou. Revise a venda e tente novamente.');
      }
      currentOcupacoes.push(currentOcupacao);
    }

    transaction.set(vendaRef, {
      ...payload,
      hydroAllocations: allocations.map((item) => ({
        ocupacaoId: item.ocupacaoId,
        estruturaId: item.estruturaId,
        quantidade: item.quantidade,
      })),
    } as any);

    allocations.forEach((allocation) => {
      const ocupacao = currentOcupacoes.find((item) => item.id === allocation.ocupacaoId);
      if (!ocupacao) return;
      applyAllocation(transaction as unknown as ReturnType<typeof writeBatch>, ocupacao, allocation.quantidade, now, dataOp);
    });
  });
  await syncHydroLoteStatus(data.loteId, tenantId);

  await createTraceabilityEventSafely(tenantId, {
    hydroLoteId: data.loteId,
    estufaId: lote.estufaId,
    entidade: 'venda',
    entidadeId: vendaRef.id,
    acao: 'colhido',
    descricao: `Venda hidropônica da produção ${lote.codigoLote} (${quantidade} ${data.unidade}).`,
    actorUid: tenantId,
    metadata: {
      quantidade,
      valorTotal: payload.valorTotal,
      metodoPagamento: data.metodoPagamento || 'pix',
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
      traceabilityPublicToken: payload.traceabilityPublicToken || null,
      traceabilityPublicUrl: payload.traceabilityPublicUrl || null,
    },
  });

  return vendaRef.id;
};
