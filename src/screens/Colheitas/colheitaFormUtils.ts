import {
  CaixaPessoa,
  listCaixaPessoas,
} from '../../services/caixaPessoaService';
import { listClientes } from '../../services/clienteService';
import { getColheitaById } from '../../services/colheitaService';
import { listEstufas } from '../../services/estufaService';
import { listAllPlantios } from '../../services/plantioService';
import { getVendaById } from '../../services/vendaService';
import { Cliente, Plantio } from '../../types/domain';

export type UnidadeColheita =
  | 'kg'
  | 'caixas'
  | 'un'
  | 'maços'
  | 'sacas'
  | 'duzias'
  | 'ton';

export const VENDA_UNIDADE_OPTIONS: Array<{
  label: string;
  value: UnidadeColheita;
}> = [
  { label: 'CAIXA (CX)', value: 'caixas' },
  { label: 'QUILOGRAMA (KG)', value: 'kg' },
  { label: 'UNIDADE (UN)', value: 'un' },
  { label: 'MAÇO', value: 'maços' },
  { label: 'SACA', value: 'sacas' },
  { label: 'DÚZIA', value: 'duzias' },
  { label: 'TONELADA (TON)', value: 'ton' },
];
export type MetodoPagamento =
  | 'pix'
  | 'dinheiro'
  | 'boleto'
  | 'prazo'
  | 'cartao'
  | 'cheque'
  | 'outro';

export const buildColheitaEditSnapshot = (values: {
  selectedPlantioId: string;
  quantidade: string;
  unidade: UnidadeColheita;
  preco: string;
  pesoBruto: string;
  pesoLiquido: string;
  selectedClienteId: string | null;
  metodoPagamento: MetodoPagamento | '';
  pagamentoPara: string | null;
  dataVenda: Date;
  dataCompensacaoCheque?: Date | null;
  observacoes: string;
}) =>
  JSON.stringify({
    selectedPlantioId: values.selectedPlantioId || '',
    quantidade: Number(values.quantidade.replace(',', '.')) || 0,
    unidade: values.unidade,
    preco: Number(values.preco.replace(',', '.')) || 0,
    pesoBruto: Number(values.pesoBruto.replace(',', '.')) || 0,
    pesoLiquido: Number(values.pesoLiquido.replace(',', '.')) || 0,
    selectedClienteId: values.selectedClienteId || null,
    metodoPagamento: values.metodoPagamento,
    pagamentoPara: values.pagamentoPara || null,
    dataVenda: new Date(values.dataVenda).toISOString().slice(0, 10),
    dataCompensacaoCheque: values.dataCompensacaoCheque
      ? new Date(values.dataCompensacaoCheque).toISOString().slice(0, 10)
      : null,
    observacoes: values.observacoes || '',
  });

export type LoadedColheitaFormData = {
  clientes: Cliente[];
  caixaPessoas: CaixaPessoa[];
  plantiosDisponiveis: Plantio[];
  estufasMap: Record<string, string>;
  defaultPagamentoPara: string | null;
  selectedPlantioId: string;
  editingColheitaId: string | null;
  initialValues?: {
    quantidade: string;
    unidade: UnidadeColheita;
    preco: string;
    selectedClienteId: string | null;
    metodoPagamento: MetodoPagamento | '';
    pagamentoPara: string | null;
    pesoBruto: string;
    pesoLiquido: string;
    observacoes: string;
    dataVenda: Date;
    dataCompensacaoCheque: Date | null;
  };
  initialEditSnapshot?: string;
};

const resolveDate = (value: any) =>
  value?.toDate
    ? value.toDate()
    : typeof value?.seconds === 'number'
      ? new Date(value.seconds * 1000)
      : new Date();

export const loadColheitaFormBootstrap = async ({
  targetId,
  isEditMode,
  selectedPlantioId,
  vendaIdParam,
  colheitaIdParam,
  pagamentoPara,
}: {
  targetId: string;
  isEditMode: boolean;
  selectedPlantioId: string;
  vendaIdParam?: string;
  colheitaIdParam?: string;
  pagamentoPara?: string | null;
}): Promise<LoadedColheitaFormData> => {
  const [clientes, pessoasCaixa, plantios, estufas] = await Promise.all([
    listClientes(targetId),
    listCaixaPessoas(targetId),
    listAllPlantios(targetId),
    listEstufas(targetId),
  ]);

  const defaultPagamentoPara = pagamentoPara || null;
  const estufasMap = estufas.reduce<Record<string, string>>(
    (acc, estufa: any) => {
      acc[estufa.id] = estufa.nome;
      return acc;
    },
    {}
  );
  const plantiosDisponiveis = plantios.filter(
    (plantio: any) =>
      isEditMode ||
      (plantio.status !== 'finalizado' && plantio.status !== 'cancelado')
  );
  const nextSelectedPlantioId =
    selectedPlantioId ||
    (plantiosDisponiveis.length > 0 && !isEditMode
      ? plantiosDisponiveis[0].id
      : '');

  if (!isEditMode) {
    return {
      clientes,
      caixaPessoas: pessoasCaixa,
      plantiosDisponiveis,
      estufasMap,
      defaultPagamentoPara,
      selectedPlantioId: nextSelectedPlantioId,
      editingColheitaId: null,
    };
  }

  let resolvedColheitaId = colheitaIdParam || null;
  if (!resolvedColheitaId && vendaIdParam) {
    const vendaOrigem = await getVendaById(vendaIdParam, targetId);
    if (!vendaOrigem) {
      throw new Error('Venda não encontrada para edição.');
    }
    resolvedColheitaId = vendaOrigem.colheitaId || null;
  }
  if (!resolvedColheitaId) {
    throw new Error('Venda sem colheita vinculada para edição nesta tela.');
  }

  const venda = await getColheitaById(resolvedColheitaId, targetId);
  if (!venda) {
    throw new Error('Colheita vinculada à venda não encontrada.');
  }

  const metodoVenda: MetodoPagamento | '' =
    (venda.metodoPagamento as MetodoPagamento) || '';
  const resolvedPagamentoPara =
    metodoVenda === 'prazo' || metodoVenda === 'cheque'
      ? null
      : (venda.pagamentoPara as string) || null;
  const initialValues = {
    quantidade: String(venda.quantidade),
    unidade: venda.unidade as UnidadeColheita,
    preco: venda.precoUnitario ? String(venda.precoUnitario) : '',
    selectedClienteId: venda.clienteId || null,
    metodoPagamento: metodoVenda,
    pagamentoPara: resolvedPagamentoPara,
    pesoBruto: venda.pesoBruto ? String(venda.pesoBruto) : '',
    pesoLiquido: venda.pesoLiquido ? String(venda.pesoLiquido) : '',
    observacoes: venda.observacoes || '',
    dataVenda: venda.dataColheita
      ? resolveDate(venda.dataColheita)
      : new Date(),
    dataCompensacaoCheque: venda.dataCompensacaoCheque
      ? resolveDate(venda.dataCompensacaoCheque)
      : null,
  };

  return {
    clientes,
    caixaPessoas: pessoasCaixa,
    plantiosDisponiveis,
    estufasMap,
    defaultPagamentoPara,
    selectedPlantioId: venda.plantioId,
    editingColheitaId: resolvedColheitaId,
    initialValues,
    initialEditSnapshot: buildColheitaEditSnapshot({
      selectedPlantioId: venda.plantioId,
      ...initialValues,
    }),
  };
};
