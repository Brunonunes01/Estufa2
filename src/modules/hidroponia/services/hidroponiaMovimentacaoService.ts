import { collection, doc, getDocs, query, runTransaction, Timestamp, where } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { createTraceabilityEventSafely } from '../../../services/traceabilityService';
import { getEstufaById } from '../../../services/estufaService';
import { getHydroLoteById, syncHydroLoteStatus } from './hidroponiaLoteService';
import { listHydroOcupacoesByEstufa } from './hidroponiaOcupacaoService';
import { HydroLoteStage, HydroMovimentacao, HydroOcupacao } from '../types';

const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase();

const isSameBercarioProfile = (
  ocupacao: HydroOcupacao,
  input: { cultura: string; variedade: string | null; verduraId: string | null }
) => {
  const ocupVerdura = normalizeText(ocupacao.verduraId);
  const inputVerdura = normalizeText(input.verduraId);

  if (ocupVerdura && inputVerdura) {
    return ocupVerdura === inputVerdura;
  }

  return (
    normalizeText(ocupacao.cultura) === normalizeText(input.cultura) &&
    normalizeText(ocupacao.variedade) === normalizeText(input.variedade)
  );
};

export interface HydroMovimentacaoFormData {
  toStage: HydroLoteStage;
  toSetorId?: string | null;
  toEstruturaId: string | null;
  fromOcupacaoId?: string | null; // Adicionado para desdobramento
  verduraId?: string | null;
  cultura?: string;
  variedade?: string;
  quantidadeMovida: number;
  perdaNoMovimento?: number;
  motivoPerda?: string;
  responsavel?: string;
  observacoes?: string;
  movedAt?: Date;
}

export const createHydroMovimentacao = async (
  loteId: string,
  data: HydroMovimentacaoFormData,
  userId: string
) => {
  const tenantId = assertTenantId(userId);
  const lote = await getHydroLoteById(loteId, tenantId);
  if (!lote) throw new Error('Produção não encontrada.');
  const estufa = await getEstufaById(lote.estufaId, tenantId);
  if (!estufa) throw new Error('Estufa da produção não encontrada.');

  const now = Timestamp.now();
  const movedAt = data.movedAt ? Timestamp.fromDate(data.movedAt) : now;
  const quantidade = Number(data.quantidadeMovida || 0);
  const perda = Number(data.perdaNoMovimento || 0);
  const movedNet = Math.max(0, quantidade - perda);
  const cultura = String(data.cultura || '').trim();
  const variedade = String(data.variedade || '').trim() || null;
  const verduraId = data.verduraId?.trim() || null;
  const isExitStage = data.toStage === 'colhido' || data.toStage === 'cancelado';
  const isTransfer = !!data.fromOcupacaoId;

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error('Quantidade movimentada inválida.');
  }
  if (!Number.isFinite(perda) || perda < 0 || perda > quantidade) {
    throw new Error('Perda inválida para esta movimentação.');
  }
  if (!data.responsavel?.trim()) {
    throw new Error('Informe o responsável pela movimentação para rastreabilidade.');
  }
  if (isExitStage && !isTransfer) {
    throw new Error('Para finalizar/cancelar, selecione a bancada de origem desta produção.');
  }
  if (!isExitStage && !data.toEstruturaId) {
    throw new Error('Selecione uma bancada de destino para continuar.');
  }
  if (!isExitStage && !cultura) {
    throw new Error('Informe a cultura/verdura da bancada de destino.');
  }

  const movimentacaoRef = doc(collection(db, 'hidroponia_movimentacoes'));
  const ocupacaoRef = data.toEstruturaId ? doc(collection(db, 'hidroponia_ocupacoes')) : null;
  const ocupacoesAtivasEstufa = await listHydroOcupacoesByEstufa(tenantId, lote.estufaId);

  const estruturas = (estufa.setores || []).flatMap((setor) => setor.estruturas || []);
  const estruturaDestino = data.toEstruturaId
    ? estruturas.find((item) => item.id === data.toEstruturaId)
    : null;

  if (data.toEstruturaId && !estruturaDestino) {
    throw new Error('A bancada de destino não pertence ao layout da estufa.');
  }

  const ocupacoesDestinoAtivasSnapshot = data.toEstruturaId
    ? ocupacoesAtivasEstufa.filter(
        (item) => item.estruturaId === data.toEstruturaId && item.status === 'ativa'
      )
    : [];
  let fromEstruturaId: string | null = null;
  let nextSaldoDisponivel = Number(lote.saldoDisponivel || 0);

  await runTransaction(db, async (transaction) => {
    const loteRef = doc(db, 'hidroponia_lotes', loteId);
    const loteSnap = await transaction.get(loteRef);
    if (!loteSnap.exists()) throw new Error('Produção não encontrada.');
    const loteAtual = loteSnap.data() as typeof lote;
    if (loteAtual.tenantId !== tenantId && loteAtual.userId !== tenantId) {
      throw new Error('Acesso negado à produção.');
    }

    const destinoLockRef = data.toEstruturaId
      ? doc(db, 'hidroponia_estrutura_locks', `${lote.estufaId}_${data.toEstruturaId}`)
      : null;
    const destinoLockSnap = destinoLockRef ? await transaction.get(destinoLockRef) : null;
    const destinoLock = destinoLockSnap?.exists() ? destinoLockSnap.data() : null;
    if (!isExitStage && destinoLock?.active === true && destinoLock.loteId !== loteId) {
      throw new Error('A bancada de destino já está ocupada por outra produção.');
    }

    let fromData: HydroOcupacao | null = null;
    let fromOcupRef = null as ReturnType<typeof doc> | null;
    let novaQtdOrigem: number | null = null;

    if (data.fromOcupacaoId) {
      fromOcupRef = doc(db, 'hidroponia_ocupacoes', data.fromOcupacaoId);
      const fromOcupSnap = await transaction.get(fromOcupRef);
      if (!fromOcupSnap.exists()) {
        throw new Error('Ocupação de origem não encontrada.');
      }
      fromData = { ...(fromOcupSnap.data() as HydroOcupacao), id: fromOcupSnap.id };
      if (fromData.tenantId !== tenantId && fromData.userId !== tenantId) {
        throw new Error('Acesso negado à ocupação de origem.');
      }
      if (fromData.loteId !== loteId) {
        throw new Error('A ocupação de origem pertence a outra produção.');
      }
      if (fromData.status !== 'ativa') {
        throw new Error('A ocupação de origem já está encerrada.');
      }
      if (fromData.fase === 'pronto_colheita' && !isExitStage) {
        throw new Error('Produção em bancada final não pode ser movida. Realize a colheita nesta bancada.');
      }
      fromEstruturaId = fromData.estruturaId;

      if (data.toEstruturaId && data.toEstruturaId === fromEstruturaId) {
        throw new Error('A bancada de destino deve ser diferente da origem.');
      }
      if (quantidade > Number(fromData.quantidadeAlocada || 0)) {
        throw new Error(
          `Quantidade acima do saldo da origem (${Number(fromData.quantidadeAlocada || 0)} unidades).`
        );
      }

      novaQtdOrigem = Math.max(0, Number(fromData.quantidadeAlocada || 0) - quantidade);
      transaction.update(fromOcupRef, novaQtdOrigem <= 0 ? {
        status: 'encerrada',
        quantidadeAlocada: 0,
        dataFim: now,
        updatedAt: now,
      } : {
        quantidadeAlocada: novaQtdOrigem,
        updatedAt: now,
      });
    } else {
      nextSaldoDisponivel = Number(loteAtual.saldoDisponivel || 0);
      if (quantidade > nextSaldoDisponivel) {
        throw new Error(
          `Quantidade acima do saldo livre da produção (${nextSaldoDisponivel} unidades).`
        );
      }
      nextSaldoDisponivel = Math.max(0, nextSaldoDisponivel - quantidade);
    }

    const ocupacoesDestinoAtivas: HydroOcupacao[] = [];
    for (const ocupacao of ocupacoesDestinoAtivasSnapshot) {
      const ocupacaoSnap = await transaction.get(doc(db, 'hidroponia_ocupacoes', ocupacao.id));
      if (!ocupacaoSnap.exists()) continue;
      const current = { ...(ocupacaoSnap.data() as HydroOcupacao), id: ocupacaoSnap.id };
      if (current.status === 'ativa' && current.estruturaId === data.toEstruturaId) {
        ocupacoesDestinoAtivas.push(current);
      }
    }

    const possuiOutroLoteNoDestino = ocupacoesDestinoAtivas.some((item) => item.loteId !== loteId);
    if (possuiOutroLoteNoDestino) {
      throw new Error('A bancada de destino já está ocupada por outra produção.');
    }

    if (estruturaDestino && movedNet > 0) {
      const capacidade = Number(
        estruturaDestino.capacidadePlantas || estruturaDestino.quantidadeFuros || 0
      );
      const ocupadoAtual = ocupacoesDestinoAtivas.reduce(
        (sum, item) => sum + Number(item.quantidadeAlocada || 0),
        0
      );

      if (capacidade > 0 && ocupadoAtual + movedNet > capacidade) {
        throw new Error(
          `Movimentação excede a capacidade da bancada (capacidade: ${capacidade}, ocupado: ${ocupadoAtual}).`
        );
      }
    }

    const payloadMov: Omit<HydroMovimentacao, 'id'> = {
      tenantId,
      loteId,
      estufaId: lote.estufaId,
      fromEstruturaId,
      toEstruturaId: data.toEstruturaId || null,
      tipo: data.toStage === 'colhido' ? 'saida' : data.toStage === 'cancelado' ? 'perda' : 'movimento',
      quantidade,
      cultura: cultura || null,
      variedade,
      verduraId,
      fase: data.toStage,
      movedAt,
      createdAt: now,
    };

    transaction.set(movimentacaoRef, payloadMov);

    if (!isExitStage && ocupacaoRef && data.toEstruturaId && movedNet > 0) {
      const isBercarioDestino = estruturaDestino?.tipo === 'bercario';
      const ocupacaoDestino = isBercarioDestino
        ? ocupacoesDestinoAtivas.find(
            (item) =>
              item.loteId === loteId &&
              isSameBercarioProfile(item, { cultura, variedade, verduraId })
          ) || null
        : ocupacoesDestinoAtivas.find((item) => item.loteId === loteId) || null;

      if (ocupacaoDestino?.id) {
        transaction.update(doc(db, 'hidroponia_ocupacoes', ocupacaoDestino.id), {
          setorId: data.toSetorId || ocupacaoDestino.setorId || lote.setorId || null,
          cultura: cultura || ocupacaoDestino.cultura || 'Não informada',
          variedade: variedade || ocupacaoDestino.variedade || null,
          verduraId: verduraId || ocupacaoDestino.verduraId || null,
          fase: data.toStage,
          quantidadeAlocada: Number(ocupacaoDestino.quantidadeAlocada || 0) + movedNet,
          quantidadePerdida: Number(ocupacaoDestino.quantidadePerdida || 0) + perda,
          updatedAt: now,
        });
      } else {
        const payloadOcup: Omit<HydroOcupacao, 'id'> = {
          tenantId,
          userId: tenantId,
          loteId,
          estufaId: lote.estufaId,
          setorId: data.toSetorId || lote.setorId || null,
          estruturaId: data.toEstruturaId,
          cultura: cultura || 'Não informada',
          variedade,
          verduraId,
          fase: data.toStage,
          quantidadeAlocada: movedNet,
          quantidadePerdida: perda,
          dataInicio: movedAt,
          dataFim: null,
          status: 'ativa',
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(ocupacaoRef, payloadOcup);
      }

      if (destinoLockRef) {
        transaction.set(destinoLockRef, {
          tenantId,
          estufaId: lote.estufaId,
          estruturaId: data.toEstruturaId,
          loteId,
          active: true,
          updatedAt: now,
        }, { merge: true });
      }
    }

    if (fromData && fromEstruturaId && novaQtdOrigem !== null && novaQtdOrigem <= 0) {
      const hasOtherActiveSameLoteInOrigin = ocupacoesAtivasEstufa.some(
        (item) =>
          item.id !== fromData?.id &&
          item.loteId === loteId &&
          item.estruturaId === fromEstruturaId &&
          item.status === 'ativa' &&
          Number(item.quantidadeAlocada || 0) > 0
      );
      if (!hasOtherActiveSameLoteInOrigin) {
        transaction.set(doc(db, 'hidroponia_estrutura_locks', `${lote.estufaId}_${fromEstruturaId}`), {
          tenantId,
          estufaId: lote.estufaId,
          estruturaId: fromEstruturaId,
          loteId,
          active: false,
          updatedAt: now,
        }, { merge: true });
      }
    }

    transaction.update(loteRef, {
      saldoDisponivel: nextSaldoDisponivel,
      updatedAt: now,
    });
  });
  await syncHydroLoteStatus(loteId, tenantId);

  await createTraceabilityEventSafely(tenantId, {
    hydroLoteId: loteId,
    estufaId: lote.estufaId,
    entidade: 'hydro_movimentacao',
    entidadeId: movimentacaoRef.id,
    acao: 'movido',
    descricao: isExitStage
      ? `Produção ${lote.codigoLote} finalizada na bancada ${fromEstruturaId || '-'} (${quantidade} plantas).`
      : isTransfer
      ? `Produção ${lote.codigoLote} transferida da bancada ${fromEstruturaId || '-'} para ${
          data.toEstruturaId || '-'
        } (${quantidade} plantas).`
      : `Produção ${lote.codigoLote} alocada do saldo para bancada ${data.toEstruturaId || '-'} (${quantidade} plantas).`,
    actorUid: tenantId,
    metadata: {
      toStage: data.toStage,
      quantidade,
      perda,
      cultura: data.cultura,
      verduraId,
      responsavel: data.responsavel?.trim() || null,
      observacoes: data.observacoes?.trim() || null,
      origemTipo: isTransfer ? 'bancada' : 'saldo_lote',
      saldoDisponivelAntes: Number(lote.saldoDisponivel || 0),
      saldoDisponivelDepois: nextSaldoDisponivel,
      produto: {
        codigoRastreio: lote.codigoLote,
        nome: lote.nomeOperacional || lote.codigoLote,
        cultura: cultura || null,
        variedade,
        quantidade,
        unidade: 'unidade',
      },
      enteAnterior: {
        nome: isTransfer
          ? `Bancada ${fromEstruturaId || 'desconhecida'}`
          : lote.origemMaterialNome || lote.nomeOperacional || lote.codigoLote,
        documento: isTransfer ? data.fromOcupacaoId || null : lote.origemMaterialDocumento || null,
        tipo: isTransfer ? 'bancada_origem' : 'origem_material',
      },
      entePosterior: {
        nome: data.toEstruturaId ? `Bancada ${data.toEstruturaId}` : 'Saída da produção',
        documento: data.toEstruturaId || null,
        tipo: data.toEstruturaId ? 'bancada_destino' : 'saida',
      },
    },
  });

  return movimentacaoRef.id;
};

export const listHydroMovimentacoesByLote = async (
  userId: string,
  loteId: string
): Promise<HydroMovimentacao[]> => {
  const tenantId = assertTenantId(userId);
  const snap = await getDocs(
    query(
      collection(db, 'hidroponia_movimentacoes'),
      where('tenantId', '==', tenantId),
      where('loteId', '==', loteId)
    )
  );

  return snap.docs
    .map((item) => ({ ...(item.data() as HydroMovimentacao), id: item.id }))
    .sort((a, b) => (b.movedAt?.toMillis?.() || 0) - (a.movedAt?.toMillis?.() || 0));
};
