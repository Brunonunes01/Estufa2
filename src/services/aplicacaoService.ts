import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Aplicacao, AplicacaoItem, Insumo, Plantio } from '../types/domain';
import { assertTenantId } from './tenantGuard';

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

export const createAplicacao = async (data: CreateAplicacaoData, userId: string) => {
  const tenantId = assertTenantId(userId);
  const now = Timestamp.now();

  if (!data.itens?.length) {
    throw new Error('A aplicação precisa de ao menos um item de insumo.');
  }

  return runTransaction(db, async (transaction) => {
    const plantioRef = doc(db, 'plantios', data.plantioId);
    const plantioSnap = await transaction.get(plantioRef);
    if (!plantioSnap.exists()) {
      throw new Error('Plantio não encontrado.');
    }

    const plantio = plantioSnap.data() as Plantio;

    const itensAplicacao: AplicacaoItem[] = [];
    let custoCalculadoTotal = 0;

    for (const item of data.itens) {
      const quantidade = Number(item.quantidadeAplicada || 0);
      if (quantidade <= 0) {
        throw new Error(`Quantidade inválida para ${item.nomeInsumo}.`);
      }

      const insumoRef = doc(db, 'insumos', item.insumoId);
      const insumoSnap = await transaction.get(insumoRef);

      if (!insumoSnap.exists()) {
        throw new Error(`Insumo não encontrado (${item.nomeInsumo}).`);
      }

      const insumo = insumoSnap.data() as Insumo;

      if ((insumo.estoqueAtual || 0) < quantidade) {
        throw new Error(
          `Estoque insuficiente para ${item.nomeInsumo}. Disponível: ${insumo.estoqueAtual ?? 0} ${item.unidade}`
        );
      }

      const custoUnitarioNaAplicacao = Number(insumo.custoUnitario || 0);
      const custoItem = quantidade * custoUnitarioNaAplicacao;
      custoCalculadoTotal += custoItem;

      transaction.update(insumoRef, {
        estoqueAtual: (insumo.estoqueAtual || 0) - quantidade,
        updatedAt: now,
      });

      itensAplicacao.push({
        insumoId: item.insumoId,
        nomeInsumo: item.nomeInsumo,
        dosePorTanque: item.dosePorTanque,
        quantidadeAplicada: quantidade,
        unidade: item.unidade,
        custoUnitarioNaAplicacao,
      });
    }

    const aplicacaoRef = doc(collection(db, 'aplicacoes'));
    const aplicacaoData: Omit<Aplicacao, 'id'> = {
      userId: tenantId,
      tenantId,
      createdBy: tenantId,
      plantioId: data.plantioId,
      estufaId: data.estufaId,
      dataAplicacao: now,
      tipoAplicacao: data.tipoAplicacao,
      volumeTanque: data.volumeTanque ?? 0,
      numeroTanques: data.numeroTanques ?? 1,
      observacoes: data.observacoes || '',
      itens: itensAplicacao,
      custoCalculado: custoCalculadoTotal,
      createdAt: now,
      updatedAt: now,
    };

    transaction.set(aplicacaoRef, {
      id: aplicacaoRef.id,
      ...aplicacaoData,
    });

    transaction.update(plantioRef, {
      custoAcumulado: (plantio.custoAcumulado || 0) + custoCalculadoTotal,
      updatedAt: now,
    });

    return aplicacaoRef.id;
  });
};

export const listAplicacoesByPlantio = async (userId: string, plantioId: string): Promise<Aplicacao[]> => {
  const tenantId = assertTenantId(userId);
  const q = query(
    collection(db, 'aplicacoes'),
    where('userId', '==', tenantId),
    where('plantioId', '==', plantioId)
  );

  const snap = await getDocs(q);
  const rows = snap.docs.map((item) => ({ ...(item.data() as Aplicacao) , id: item.id }));

  return rows.sort((a, b) => b.dataAplicacao.toMillis() - a.dataAplicacao.toMillis());
};

// Compatibilidade com chamada antiga
export const registrarAplicacaoInsumo = async (
  userId: string,
  data: Omit<Aplicacao, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const item: AplicacaoItemData = {
    insumoId: String(data.insumoId || ''),
    nomeInsumo: String(data.insumoId || 'Insumo'),
    dosePorTanque: Number(data.quantidadeAplicada || 0),
    quantidadeAplicada: Number(data.quantidadeAplicada || 0),
    unidade: 'un',
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
