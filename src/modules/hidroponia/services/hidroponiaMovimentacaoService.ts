import { collection, doc, getDocs, query, runTransaction, Timestamp, where } from '../../../compat/firestore';
import { db } from '../../../services/firebaseConfig';
import { assertTenantId } from '../../../services/tenantGuard';
import { createTraceabilityEventSafely } from '../../../services/traceabilityService';
import { getEstufaById } from '../../../services/estufaService';
import { isSupabaseBackend } from '../../../services/backendConfig';
import { getSupabaseClient } from '../../../services/supabaseClient';
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

  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const ocupacoesAtivasEstufa = await listHydroOcupacoesByEstufa(tenantId, lote.estufaId);
    const estruturas = (estufa.setores || []).flatMap((setor) => setor.estruturas || []);
    const estruturaDestino = data.toEstruturaId
      ? estruturas.find((item) => item.id === data.toEstruturaId)
      : null;
    if (data.toEstruturaId && !estruturaDestino) {
      throw new Error('A bancada de destino não pertence ao layout da estufa.');
    }

    const ocupacoesDestinoAtivas = data.toEstruturaId
      ? ocupacoesAtivasEstufa.filter(
          (item) => item.estruturaId === data.toEstruturaId && item.status === 'ativa'
        )
      : [];
    const possuiOutroLoteNoDestino = ocupacoesDestinoAtivas.some((item) => item.loteId !== loteId);
    if (!isExitStage && possuiOutroLoteNoDestino) {
      throw new Error('A bancada de destino já está ocupada por outra produção.');
    }

    let fromEstruturaId: string | null = null;
    let nextSaldoDisponivel = Number(lote.saldoDisponivel || 0);
    let currentFromOcupacao: HydroOcupacao | null = null;

    if (data.fromOcupacaoId) {
      currentFromOcupacao = ocupacoesAtivasEstufa.find((item) => item.id === data.fromOcupacaoId) || null;
      if (!currentFromOcupacao) throw new Error('Ocupação de origem não encontrada.');
      if (currentFromOcupacao.loteId !== loteId) {
        throw new Error('A ocupação de origem pertence a outra produção.');
      }
      if (currentFromOcupacao.status !== 'ativa') {
        throw new Error('A ocupação de origem já está encerrada.');
      }
      if (currentFromOcupacao.fase === 'pronto_colheita' && !isExitStage) {
        throw new Error('Produção em bancada final não pode ser movida. Realize a colheita nesta bancada.');
      }
      fromEstruturaId = currentFromOcupacao.estruturaId;
      if (data.toEstruturaId && data.toEstruturaId === fromEstruturaId) {
        throw new Error('A bancada de destino deve ser diferente da origem.');
      }
      if (quantidade > Number(currentFromOcupacao.quantidadeAlocada || 0)) {
        throw new Error(
          `Quantidade acima do saldo da origem (${Number(currentFromOcupacao.quantidadeAlocada || 0)} unidades).`
        );
      }
    } else {
      if (quantidade > nextSaldoDisponivel) {
        throw new Error(
          `Quantidade acima do saldo livre da produção (${nextSaldoDisponivel} unidades).`
        );
      }
      nextSaldoDisponivel = Math.max(0, nextSaldoDisponivel - quantidade);
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

    if (currentFromOcupacao) {
      const novaQtdOrigem = Math.max(0, Number(currentFromOcupacao.quantidadeAlocada || 0) - quantidade);
      const { error: fromError } = await supabase
        .from('hidro_ocupacoes')
        .update(
          novaQtdOrigem <= 0
            ? {
                status: 'encerrada',
                quantidade_alocada: 0,
                data_fim: now.toDate().toISOString(),
                updated_at: now.toDate().toISOString(),
              }
            : {
                quantidade_alocada: novaQtdOrigem,
                updated_at: now.toDate().toISOString(),
              }
        )
        .eq('id', currentFromOcupacao.id)
        .eq('tenant_id', tenantId);
      if (fromError) throw new Error(`Erro ao atualizar ocupação de origem. ${fromError.message}`);
    }

    if (!isExitStage && data.toEstruturaId && movedNet > 0) {
      const isBercarioDestino = estruturaDestino?.tipo === 'bercario';
      const ocupacaoDestino = isBercarioDestino
        ? ocupacoesDestinoAtivas.find(
            (item) =>
              item.loteId === loteId &&
              isSameBercarioProfile(item, { cultura, variedade, verduraId })
          ) || null
        : ocupacoesDestinoAtivas.find((item) => item.loteId === loteId) || null;

      if (ocupacaoDestino?.id) {
        const { error: occUpdateError } = await supabase
          .from('hidro_ocupacoes')
          .update({
            setor_id: data.toSetorId || ocupacaoDestino.setorId || lote.setorId || null,
            cultura: cultura || ocupacaoDestino.cultura || 'Não informada',
            variedade: variedade || ocupacaoDestino.variedade || null,
            verdura_id: verduraId || ocupacaoDestino.verduraId || null,
            fase: data.toStage,
            quantidade_alocada: Number(ocupacaoDestino.quantidadeAlocada || 0) + movedNet,
            quantidade_perdida: Number(ocupacaoDestino.quantidadePerdida || 0) + perda,
            updated_at: now.toDate().toISOString(),
          })
          .eq('id', ocupacaoDestino.id)
          .eq('tenant_id', tenantId);
        if (occUpdateError) throw new Error(`Erro ao atualizar ocupação de destino. ${occUpdateError.message}`);
      } else {
        const { error: occInsertError } = await supabase.from('hidro_ocupacoes').insert({
          tenant_id: tenantId,
          lote_id: loteId,
          estufa_id: lote.estufaId,
          setor_id: data.toSetorId || lote.setorId || null,
          estrutura_id: data.toEstruturaId,
          cultura: cultura || 'Não informada',
          variedade,
          verdura_id: verduraId,
          fase: data.toStage,
          quantidade_alocada: movedNet,
          quantidade_perdida: perda,
          data_inicio: movedAt.toDate().toISOString(),
          data_fim: null,
          status: 'ativa',
        });
        if (occInsertError) throw new Error(`Erro ao criar ocupação de destino. ${occInsertError.message}`);
      }
    }

    const { data: movimentacaoInserted, error: movError } = await supabase
      .from('hidro_movimentacoes')
      .insert({
        tenant_id: tenantId,
        lote_id: loteId,
        estufa_id: lote.estufaId,
        from_estrutura_id: fromEstruturaId,
        to_estrutura_id: data.toEstruturaId || null,
        tipo: data.toStage === 'colhido' ? 'saida' : data.toStage === 'cancelado' ? 'perda' : 'movimento',
        quantidade,
        cultura: cultura || null,
        variedade,
        verdura_id: verduraId,
        fase: data.toStage,
        moved_at: movedAt.toDate().toISOString(),
      })
      .select('id')
      .single();
    if (movError || !movimentacaoInserted?.id) {
      throw new Error(`Erro ao registrar movimentação hidropônica. ${movError?.message || ''}`.trim());
    }

    const { error: loteUpdateError } = await supabase
      .from('hidro_lotes')
      .update({
        saldo_disponivel: nextSaldoDisponivel,
        updated_at: now.toDate().toISOString(),
      })
      .eq('id', loteId)
      .eq('tenant_id', tenantId);
    if (loteUpdateError) throw new Error(`Erro ao atualizar saldo da produção. ${loteUpdateError.message}`);

    await syncHydroLoteStatus(loteId, tenantId);

    await createTraceabilityEventSafely(tenantId, {
      hydroLoteId: loteId,
      estufaId: lote.estufaId,
      entidade: 'hydro_movimentacao',
      entidadeId: movimentacaoInserted.id,
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

    return movimentacaoInserted.id as string;
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
  if (isSupabaseBackend()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hidro_movimentacoes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('lote_id', loteId)
      .order('moved_at', { ascending: false });
    if (error) throw new Error(`Erro ao listar movimentações hidropônicas. ${error.message}`);
    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      loteId: row.lote_id,
      estufaId: row.estufa_id,
      fromEstruturaId: row.from_estrutura_id || null,
      toEstruturaId: row.to_estrutura_id || null,
      tipo: row.tipo,
      quantidade: Number(row.quantidade || 0),
      cultura: row.cultura || null,
      variedade: row.variedade || null,
      verduraId: row.verdura_id || null,
      fase: row.fase,
      movedAt: Timestamp.fromDate(new Date(row.moved_at)),
      createdAt: Timestamp.fromDate(new Date(row.created_at)),
    } as HydroMovimentacao));
  }

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
