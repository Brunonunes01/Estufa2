import type { OfflineActionName, OfflineWriteOptions } from './offlineStorage';
import { createAplicacao } from '../aplicacaoService';
import { createCliente, deleteCliente, updateCliente } from '../clienteService';
import { createColheita, deleteColheita, updateColheita } from '../colheitaService';
import { createDespesa, deleteDespesa, updateDespesaStatus } from '../despesaService';
import { createEstufa, deleteEstufa, updateEstufa } from '../estufaService';
import { createFornecedor, deleteFornecedor, updateFornecedor } from '../fornecedorService';
import { addEstoqueToInsumo, createInsumo, deleteInsumo, updateInsumo } from '../insumoService';
import { createManejo } from '../manejoService';
import { createPlantio, updatePlantio, updatePlantioStatus } from '../plantioService';
import {
  createVenda,
  deleteVenda,
  markVendaChequeEmMaos,
  receberVenda,
  removeVendaReceipt,
  updateVenda,
  updateVendaReceipt,
} from '../vendaService';

type AnyPayload = Record<string, any>;
const ONLINE_ONLY_WRITE_OPTIONS: OfflineWriteOptions = {
  syncMode: 'online_only',
};

export const executeOfflineAction = async (
  action: OfflineActionName,
  payload: AnyPayload
) => {
  switch (action) {
    case 'createEstufa':
      await createEstufa(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'updateEstufa':
      await updateEstufa(
        payload.id,
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'deleteEstufa':
      await deleteEstufa(payload.id, payload.userId, ONLINE_ONLY_WRITE_OPTIONS);
      return;

    case 'createPlantio':
      await createPlantio(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'updatePlantio':
      await updatePlantio(
        payload.id,
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'updatePlantioStatus':
      await updatePlantioStatus(
        payload.id,
        payload.status,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;

    case 'createInsumo':
      await createInsumo(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'updateInsumo':
      await updateInsumo(
        payload.id,
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'deleteInsumo':
      await deleteInsumo(payload.id, payload.userId, ONLINE_ONLY_WRITE_OPTIONS);
      return;
    case 'addEstoqueToInsumo':
      await addEstoqueToInsumo(
        payload.id,
        payload.entryData,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;

    case 'createDespesa':
      await createDespesa(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'updateDespesaStatus':
      await updateDespesaStatus(
        payload.id,
        payload.status,
        payload.userId,
        payload.pagamentoPara || null,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.dataPagamento instanceof Date
          ? payload.dataPagamento
          : undefined
      );
      return;
    case 'deleteDespesa':
      await deleteDespesa(
        payload.id,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;

    case 'createCliente':
      await createCliente(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'updateCliente':
      await updateCliente(
        payload.id,
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'deleteCliente':
      await deleteCliente(
        payload.id,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;

    case 'createFornecedor':
      await createFornecedor(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'updateFornecedor':
      await updateFornecedor(
        payload.id,
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'deleteFornecedor':
      await deleteFornecedor(
        payload.id,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;

    case 'createManejo':
      await createManejo(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;
    case 'createAplicacao':
      await createAplicacao(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS
      );
      return;

    case 'createColheita':
      await createColheita(
        payload.data,
        payload.userId,
        payload.plantioId,
        payload.estufaId,
        payload.serviceOptions,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    case 'updateColheita':
      await updateColheita(
        payload.id,
        payload.data,
        payload.userId,
        payload.serviceOptions,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    case 'deleteColheita':
      await deleteColheita(
        payload.id,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;

    case 'createVenda':
      await createVenda(
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    case 'updateVenda':
      await updateVenda(
        payload.id,
        payload.data,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    case 'deleteVenda':
      await deleteVenda(
        payload.id,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    case 'receberVenda':
      await receberVenda(
        payload.id,
        payload.userId,
        payload.metodoRecebimento,
        payload.pagamentoPara || null,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor,
        payload.receivedAt instanceof Date ? payload.receivedAt : undefined,
        payload.valorRecebido != null
          ? Number(payload.valorRecebido)
          : undefined
      );
      return;
    case 'markVendaChequeEmMaos':
      await markVendaChequeEmMaos(
        payload.id,
        payload.userId,
        payload.receivedAt instanceof Date ? payload.receivedAt : undefined,
        payload.valorCheque != null ? Number(payload.valorCheque) : undefined,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    case 'updateVendaReceipt':
      await updateVendaReceipt(
        payload.id,
        payload.userId,
        {
          metodoRecebimento: payload.metodoRecebimento,
          pagamentoPara: payload.pagamentoPara || null,
          receivedAt:
            payload.receivedAt instanceof Date
              ? payload.receivedAt
              : new Date(payload.receivedAt),
          valorRecebido: Number(payload.valorRecebido),
        },
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    case 'removeVendaReceipt':
      await removeVendaReceipt(
        payload.id,
        payload.userId,
        ONLINE_ONLY_WRITE_OPTIONS,
        payload.actor
      );
      return;
    default:
      throw new Error(`Ação offline não suportada: ${action}`);
  }
};
