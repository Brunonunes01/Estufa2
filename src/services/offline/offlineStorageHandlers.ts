import type { OfflineActionName } from './offlineStorage';
import { createEstufa, deleteEstufa, updateEstufa } from '../estufaService';
import { createPlantio, updatePlantio, updatePlantioStatus } from '../plantioService';
import { addEstoqueToInsumo, createInsumo, updateInsumo } from '../insumoService';
import { createDespesa, deleteDespesa, updateDespesaStatus } from '../despesaService';
import { createCliente, deleteCliente, updateCliente } from '../clienteService';
import { createFornecedor, deleteFornecedor, updateFornecedor } from '../fornecedorService';
import { createManejo } from '../manejoService';
import { createAplicacao } from '../aplicacaoService';
import { createColheita, deleteColheita, updateColheita } from '../colheitaService';
import { createVenda, deleteVenda, receberVenda, updateVenda } from '../vendaService';

type AnyPayload = Record<string, any>;

export const executeOfflineAction = async (action: OfflineActionName, payload: AnyPayload) => {
  switch (action) {
    case 'createEstufa':
      await createEstufa(payload.data, payload.userId);
      return;
    case 'updateEstufa':
      await updateEstufa(payload.id, payload.data, payload.userId);
      return;
    case 'deleteEstufa':
      await deleteEstufa(payload.id, payload.userId);
      return;

    case 'createPlantio':
      await createPlantio(payload.data, payload.userId);
      return;
    case 'updatePlantio':
      await updatePlantio(payload.id, payload.data, payload.userId);
      return;
    case 'updatePlantioStatus':
      await updatePlantioStatus(payload.id, payload.status, payload.userId);
      return;

    case 'createInsumo':
      await createInsumo(payload.data, payload.userId);
      return;
    case 'updateInsumo':
      await updateInsumo(payload.id, payload.data, payload.userId);
      return;
    case 'addEstoqueToInsumo':
      await addEstoqueToInsumo(payload.id, payload.entryData, payload.userId);
      return;

    case 'createDespesa':
      await createDespesa(payload.data, payload.userId);
      return;
    case 'updateDespesaStatus':
      await updateDespesaStatus(payload.id, payload.status, payload.userId);
      return;
    case 'deleteDespesa':
      await deleteDespesa(payload.id, payload.userId);
      return;

    case 'createCliente':
      await createCliente(payload.data, payload.userId);
      return;
    case 'updateCliente':
      await updateCliente(payload.id, payload.data, payload.userId);
      return;
    case 'deleteCliente':
      await deleteCliente(payload.id, payload.userId);
      return;

    case 'createFornecedor':
      await createFornecedor(payload.data, payload.userId);
      return;
    case 'updateFornecedor':
      await updateFornecedor(payload.id, payload.data, payload.userId);
      return;
    case 'deleteFornecedor':
      await deleteFornecedor(payload.id, payload.userId);
      return;

    case 'createManejo':
      await createManejo(payload.data, payload.userId);
      return;
    case 'createAplicacao':
      await createAplicacao(payload.data, payload.userId);
      return;

    case 'createColheita':
      await createColheita(payload.data, payload.userId, payload.plantioId, payload.estufaId, payload.serviceOptions);
      return;
    case 'updateColheita':
      await updateColheita(payload.id, payload.data, payload.userId, payload.serviceOptions);
      return;
    case 'deleteColheita':
      await deleteColheita(payload.id, payload.userId);
      return;

    case 'createVenda':
      await createVenda(payload.data, payload.userId);
      return;
    case 'updateVenda':
      await updateVenda(payload.id, payload.data, payload.userId);
      return;
    case 'deleteVenda':
      await deleteVenda(payload.id, payload.userId);
      return;
    case 'receberVenda':
      await receberVenda(payload.id, payload.userId, payload.metodoRecebimento);
      return;
    default:
      throw new Error(`Ação offline não suportada: ${action}`);
  }
};
