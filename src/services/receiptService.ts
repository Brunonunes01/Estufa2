import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import { COLORS } from '../constants/theme';
import { Venda } from '../types/domain';

export interface SalesReportTotals {
  totalReceber: number;
  totalPagar: number;
  saldo: number;
  totalVendido: number;
  totalRecebido: number;
  ticketMedio: number;
  totalRegistros: number;
}

export interface SalesReportItem {
  codigo?: string;
  data: string;
  cliente: string;
  documentoCliente?: string;
  origem?: string;
  local?: string;
  estufa?: string;
  lote?: string;
  produto?: string;
  quantidade?: string;
  quantidadeValor?: number;
  quantidadeUnidade?: string;
  precoUnitario?: number;
  metodoPagamento: string;
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
  valor: number;
  recebidoPor?: string;
  observacoes?: string | null;
}

interface SalesReportPdfData {
  nomeProdutor: string;
  nomeEstufa: string;
  tituloRelatorio: string;
  periodo: string;
  nomeArquivo?: string;
  observacoes?: string | null;
  totais: SalesReportTotals;
  itens: SalesReportItem[];
}

interface ReceiptData {
  venda: Venda & Record<string, any>;
  nomeProdutor: string;
  nomeCliente: string;
  nomeProduto: string;
  nomeEstufa: string;
}

export interface SalesAccountingItem {
  codigo: string;
  data: string;
  cliente: string;
  documentoCliente?: string;
  origem?: string;
  estufa: string;
  lote?: string;
  produto: string;
  quantidade: string;
  quantidadeValor?: number;
  quantidadeUnidade?: string;
  precoUnitario: number;
  valorTotal: number;
  metodoPagamento: string;
  status: string;
  vencimento?: string;
  recebidoPor?: string;
  observacoes?: string;
}

export interface SalesAccountingPdfData {
  empresa: string;
  periodo: string;
  itens: SalesAccountingItem[];
}

export interface CycleProductionItem {
  ciclo: string;
  lote: string;
  status: string;
  inicio: string;
  ultimaColheita: string;
  totalColheitas: number;
  totalCaixas: number;
  pesoPorCaixaKg?: number;
  pesoCaixas: number;
  kiloLivre: number;
  pesoTotal: number;
  totalPlantado: number;
  caixasPorPlantado: number;
  criterioPeso?: string;
}

export interface CycleProductionReportData {
  empresa: string;
  periodo: string;
  itens: CycleProductionItem[];
}

export interface FinancialOverviewCategoryItem {
  categoria: string;
  valor: number;
  percentual: number;
}

export interface FinancialOverviewTopSaleItem {
  codigo?: string;
  data: string;
  cliente: string;
  documentoCliente?: string;
  ciclo?: string;
  origem?: string;
  local?: string;
  lote?: string;
  produto?: string;
  quantidade?: string;
  quantidadeValor?: number;
  quantidadeUnidade?: string;
  precoUnitario?: number;
  valor: number;
  status: string;
  metodoPagamento: string;
  recebidoPor?: string;
  observacoes?: string;
}

export interface FinancialOverviewReportData {
  empresa: string;
  periodo: string;
  receitaTotal: number;
  despesaTotal: number;
  lucroLiquido: number;
  margem: number;
  totalVendas: number;
  totalDespesas: number;
  categorias: FinancialOverviewCategoryItem[];
  topVendas: FinancialOverviewTopSaleItem[];
}

export interface OperationalCycleReportData {
  empresa: string;
  periodo: string;
  ciclo: string;
  cicloDescricao?: string;
  lote: string;
  estufa: string;
  status: string;
  inicio: string;
  fim: string;
  totalVolumeVendido: number;
  unidadeVolume?: string;
  receitaTotal: number;
  custoAcumulado: number;
  custoPorUnidade: number;
  produtividadeUnM2: number;
  cicloDias: number;
  lucro: number;
  vendas?: SalesAccountingItem[];
}

const SHARE_LOCK_KEY = '__sge_pdf_share_lock__';
const isShareLocked = () => Boolean((globalThis as any)[SHARE_LOCK_KEY]);
const setShareLocked = (value: boolean) => {
  (globalThis as any)[SHARE_LOCK_KEY] = value;
};

const reportNowLabel = () => new Date().toLocaleString('pt-BR');
const reportDateToken = () => new Date().toISOString().slice(0, 10);
const canUseStyledExcelJs = Platform.OS === 'web';

const sanitizeFilenameSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'arquivo';

const fmtMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtNumero = (valor: number, casas = 2) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

const toDateSafe = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
};

const escapeHtml = (value?: string | null) => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const downloadPdfOnWeb = async (uri: string, fileName: string) => {
  if (typeof document === 'undefined') return false;

  let href = uri;
  if (!href.startsWith('data:')) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      href = `data:application/pdf;base64,${base64}`;
    } catch {
      return false;
    }
  }

  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return true;
};

const applyColumnWidths = (worksheet: XLSX.WorkSheet, widths: number[]) => {
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
};

const applyNumberFormatToColumn = (
  worksheet: XLSX.WorkSheet,
  columnIndex: number,
  rowStart: number,
  rowEnd: number,
  format: string
) => {
  for (let row = rowStart; row <= rowEnd; row += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: columnIndex });
    const cell = worksheet[cellRef];
    if (cell) cell.z = format;
  }
};

const applyNumberFormats = (
  worksheet: XLSX.WorkSheet,
  config: Array<{ columnIndex: number; rowStart: number; rowEnd: number; format: string }>
) => {
  config.forEach(({ columnIndex, rowStart, rowEnd, format }) =>
    applyNumberFormatToColumn(worksheet, columnIndex, rowStart, rowEnd, format)
  );
};

const addAutoFilter = (worksheet: XLSX.WorkSheet, range: string) => {
  worksheet['!autofilter'] = { ref: range };
};

const addMerges = (worksheet: XLSX.WorkSheet, merges: XLSX.Range[]) => {
  worksheet['!merges'] = merges;
};

const buildMetadataSheet = (entries: Array<[string, string | number]>) => {
  const rows = entries.map(([campo, valor]) => ({ Campo: campo, Valor: valor }));
  const sheet = XLSX.utils.json_to_sheet(rows, { header: ['Campo', 'Valor'] });
  applyColumnWidths(sheet, [28, 42]);
  return sheet;
};

const buildSummarySheet = (entries: Array<[string, string | number]>) => {
  const rows = entries.map(([indicador, valor]) => ({ Indicador: indicador, Valor: valor }));
  const sheet = XLSX.utils.json_to_sheet(rows, { header: ['Indicador', 'Valor'] });
  applyColumnWidths(sheet, [34, 22]);
  return sheet;
};

const normalizeAccountingStatus = (status: string) => {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PAGO') return 'PAGO';
  if (normalized === 'CANCELADO') return 'CANCELADO';
  return 'PENDENTE';
};

const parseLooseNumber = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseReportDateValue = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateKeyPtBr = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const formatMonthKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

// --- EXCEL STYLING HELPERS ---
const EXCEL_PALETTE = {
  brand: '1F4E78',
  brandSoft: 'D9EAF7',
  success: '2E7D32',
  successSoft: 'E8F5E9',
  warning: 'B26A00',
  warningSoft: 'FFF4D6',
  danger: 'B42318',
  dangerSoft: 'FDECEC',
  neutral: '5F6B7A',
  neutralSoft: 'EEF2F6',
  border: 'C9D3DD',
  text: '1B1F24',
  white: 'FFFFFF',
} as const;

const CURRENCY_FMT = '"R$" #,##0.00';
const PERCENT_FMT = '0.00%';

const applyExcelCellBorder = (cell: any) => {
  cell.border = {
    top: { style: 'thin', color: { argb: EXCEL_PALETTE.border } },
    left: { style: 'thin', color: { argb: EXCEL_PALETTE.border } },
    bottom: { style: 'thin', color: { argb: EXCEL_PALETTE.border } },
    right: { style: 'thin', color: { argb: EXCEL_PALETTE.border } },
  };
};

const applyExcelFilledCell = (
  cell: any,
  options: {
    fill: string;
    color?: string;
    bold?: boolean;
    size?: number;
    alignment?: Record<string, any>;
    format?: string;
  }
) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fill } };
  cell.font = {
    name: 'Aptos',
    size: options.size ?? 11,
    bold: options.bold ?? false,
    color: { argb: options.color ?? EXCEL_PALETTE.text },
  };
  cell.alignment = options.alignment ?? { vertical: 'middle', horizontal: 'left' };
  if (options.format) cell.numFmt = options.format;
  applyExcelCellBorder(cell);
};

const decorateExcelTableHeader = (sheet: any, rowNumber: number) => {
  const row = sheet.getRow(rowNumber);
  row.eachCell((cell) => {
    applyExcelFilledCell(cell, {
      fill: EXCEL_PALETTE.brand,
      color: EXCEL_PALETTE.white,
      bold: true,
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    });
  });
  row.height = 22;
};

const applyExcelBodyStyle = (
  sheet: any,
  startRow: number,
  endRow: number,
  statusColumn?: number
) => {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const isEven = rowNumber % 2 === 0;
    row.eachCell((cell) => {
      applyExcelCellBorder(cell);
      cell.font = { name: 'Aptos', size: 10, color: { argb: EXCEL_PALETTE.text } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFCFE' } };
      }
    });

    if (statusColumn) {
      const statusCell = row.getCell(statusColumn);
      const statusValue = String(statusCell.value || '').toUpperCase();
      if (statusValue === 'PAGO' || statusValue === 'CONCLUIDO' || statusValue === 'ATIVO') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.successSoft } };
        statusCell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: EXCEL_PALETTE.success } };
      } else if (statusValue === 'PENDENTE' || statusValue === 'EM ANDAMENTO' || statusValue === 'ATRASADO') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.warningSoft } };
        statusCell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: EXCEL_PALETTE.warning } };
      } else if (statusValue === 'CANCELADO' || statusValue === 'SUSPENSO' || statusValue === 'ERRO') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.dangerSoft } };
        statusCell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: EXCEL_PALETTE.danger } };
      }
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }
};

const addExcelMetricCard = (
  sheet: any,
  row: number,
  labelCol: number,
  valueCol: number,
  label: string,
  value: string | number,
  tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral',
  format?: string
) => {
  const tones = {
    brand: { fill: EXCEL_PALETTE.brandSoft, accent: EXCEL_PALETTE.brand },
    success: { fill: EXCEL_PALETTE.successSoft, accent: EXCEL_PALETTE.success },
    warning: { fill: EXCEL_PALETTE.warningSoft, accent: EXCEL_PALETTE.warning },
    danger: { fill: EXCEL_PALETTE.dangerSoft, accent: EXCEL_PALETTE.danger },
    neutral: { fill: EXCEL_PALETTE.neutralSoft, accent: EXCEL_PALETTE.neutral },
  };
  const current = tones[tone];
  const labelCell = sheet.getCell(row, labelCol);
  const valueCell = sheet.getCell(row, valueCol);

  labelCell.value = label;
  valueCell.value = value;
  applyExcelFilledCell(labelCell, {
    fill: current.fill,
    color: current.accent,
    bold: true,
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  applyExcelFilledCell(valueCell, {
    fill: EXCEL_PALETTE.white,
    bold: true,
    size: 12,
    alignment: { vertical: 'middle', horizontal: typeof value === 'number' ? 'right' : 'left' },
    format,
  });
};

const createExcelCoverPage = (
  workbook: any,
  title: string,
  data: { empresa: string; periodo: string; geradoEm: string },
  metrics: Array<{ label: string; value: string | number; tone: any; format?: string }>
) => {
  const dashSheet = workbook.addWorksheet('Resumo Executivo', {
    views: [{ showGridLines: false }],
  });
  dashSheet.columns = [{ width: 25 }, { width: 20 }, { width: 5 }, { width: 25 }, { width: 20 }];
  dashSheet.mergeCells('A1:E1');
  dashSheet.getCell('A1').value = title.toUpperCase();
  applyExcelFilledCell(dashSheet.getCell('A1'), {
    fill: EXCEL_PALETTE.brand,
    color: EXCEL_PALETTE.white,
    bold: true,
    size: 16,
    alignment: { horizontal: 'center' },
  });
  dashSheet.getRow(1).height = 30;

  dashSheet.mergeCells('A2:E2');
  dashSheet.getCell('A2').value = data.empresa;
  applyExcelFilledCell(dashSheet.getCell('A2'), {
    fill: EXCEL_PALETTE.brandSoft,
    color: EXCEL_PALETTE.brand,
    bold: true,
    size: 12,
    alignment: { horizontal: 'center' },
  });

  addExcelMetricCard(dashSheet, 4, 1, 2, 'Periodo', data.periodo, 'brand');
  addExcelMetricCard(dashSheet, 4, 4, 5, 'Gerado em', data.geradoEm, 'neutral');

  let currentRow = 6;
  for (let i = 0; i < metrics.length; i += 2) {
    const m1 = metrics[i];
    const m2 = metrics[i + 1];
    if (m1) addExcelMetricCard(dashSheet, currentRow, 1, 2, m1.label, m1.value, m1.tone, m1.format);
    if (m2) addExcelMetricCard(dashSheet, currentRow, 4, 5, m2.label, m2.value, m2.tone, m2.format);
    currentRow++;
  }
  return dashSheet;
};

const createExcelMetadataSheet = (workbook: any, reportName: string, data: any) => {
  const metadataSheet = workbook.addWorksheet('Metadados');
  metadataSheet.columns = [{ width: 22 }, { width: 60 }];
  metadataSheet.getCell('A1').value = 'Metadados do arquivo';
  metadataSheet.mergeCells('A1:B1');
  applyExcelFilledCell(metadataSheet.getCell('A1'), {
    fill: EXCEL_PALETTE.neutral,
    color: EXCEL_PALETTE.white,
    bold: true,
    size: 13,
    alignment: { vertical: 'middle', horizontal: 'center' },
  });
  
  const entries = Object.entries(data);
  entries.forEach(([label, value], index) => {
    const rowNumber = index + 3;
    metadataSheet.getCell(`A${rowNumber}`).value = label;
    metadataSheet.getCell(`B${rowNumber}`).value = String(value);
    applyExcelFilledCell(metadataSheet.getCell(`A${rowNumber}`), {
      fill: EXCEL_PALETTE.neutralSoft,
      color: EXCEL_PALETTE.neutral,
      bold: true,
    });
    applyExcelFilledCell(metadataSheet.getCell(`B${rowNumber}`), {
      fill: EXCEL_PALETTE.white,
    });
  });
};

const buildSalesAccountingInsights = (data: SalesAccountingPdfData) => {
  const totalGeral = data.itens.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const totalPago = data.itens
    .filter((item) => normalizeAccountingStatus(item.status) === 'PAGO')
    .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const totalPendente = data.itens
    .filter((item) => normalizeAccountingStatus(item.status) === 'PENDENTE')
    .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const totalCancelado = data.itens
    .filter((item) => normalizeAccountingStatus(item.status) === 'CANCELADO')
    .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const somentePagos = data.itens.length > 0 && totalPendente === 0 && totalCancelado === 0;
  const quantidadePendentes = data.itens.filter((item) => normalizeAccountingStatus(item.status) === 'PENDENTE').length;
  const ticketMedio = data.itens.length > 0 ? totalGeral / data.itens.length : 0;
  const recebimentoPercentual = totalGeral > 0 ? totalPago / totalGeral : 0;
  const maiorLancamento = data.itens.reduce((acc, item) => Math.max(acc, Number(item.valorTotal || 0)), 0);
  const recorteLabel = somentePagos ? 'Somente vendas pagas' : 'Pagos, pendentes e cancelados';

  // Consolidação de quantidades por unidade
  const totalPorUnidade = data.itens.reduce((acc, item) => {
    const unit = (item.quantidadeUnidade || 'un').toLowerCase();
    const val = Number(item.quantidadeValor || 0);
    acc[unit] = (acc[unit] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  const clientRows = Array.from(
    data.itens.reduce((map, item) => {
      const key = item.cliente || 'Cliente nao identificado';
      const current = map.get(key) || {
        Cliente: key,
        Documento: item.documentoCliente || '',
        Vendas: 0,
        Quantidade: 0,
        Unidades: new Set<string>(),
        RecebidoPor: new Set<string>(),
        Total: 0,
        Pago: 0,
        Pendente: 0,
        Cancelado: 0,
      };
      const status = normalizeAccountingStatus(item.status);
      current.Vendas += 1;
      current.Quantidade += Number(item.quantidadeValor || parseLooseNumber(item.quantidade));
      if (item.quantidadeUnidade) current.Unidades.add(String(item.quantidadeUnidade).toLowerCase());
      current.Total += Number(item.valorTotal || 0);
      if (status === 'PAGO') {
        current.Pago += Number(item.valorTotal || 0);
        if (item.recebidoPor && item.recebidoPor !== '-') current.RecebidoPor.add(String(item.recebidoPor));
      }
      if (status === 'PENDENTE') current.Pendente += Number(item.valorTotal || 0);
      if (status === 'CANCELADO') current.Cancelado += Number(item.valorTotal || 0);
      map.set(key, current);
      return map;
    }, new Map<string, any>()).values()
  )
    .map((item) => ({
      ...item,
      QuantidadeLabel: `${fmtNumero(item.Quantidade)} ${Array.from(item.Unidades).join(', ') || 'un'}`.trim(),
      RecebidoPorLabel: Array.from(item.RecebidoPor).join(', ') || '-',
    }))
    .sort((a, b) => b.Total - a.Total);

  const clientDetailRows = [...data.itens]
    .map((item) => ({
      Cliente: item.cliente || 'Cliente nao identificado',
      Documento: item.documentoCliente || '',
      Data: item.data,
      Codigo: item.codigo,
      Origem: item.origem || '',
      Local: item.estufa,
      Lote: item.lote || '',
      Produto: item.produto || '',
      Quantidade: Number(item.quantidadeValor || parseLooseNumber(item.quantidade)),
      Unidade: item.quantidadeUnidade || '',
      'Preco Unitario': Number(item.precoUnitario || 0),
      'Valor Total': Number(item.valorTotal || 0),
      Metodo: item.metodoPagamento || '',
      Status: item.status || '',
      'Recebido Por': item.recebidoPor || '-',
      Observacoes: item.observacoes || '',
    }))
    .sort((a, b) => {
      const clientCompare = a.Cliente.localeCompare(b.Cliente, 'pt-BR');
      if (clientCompare !== 0) return clientCompare;
      const da = parseReportDateValue(a.Data)?.getTime() || 0;
      const db = parseReportDateValue(b.Data)?.getTime() || 0;
      return da - db;
    });

  const clientDetailGroups = Array.from(
    clientDetailRows.reduce((map, item) => {
      const key = item.Cliente || 'Cliente nao identificado';
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
      return map;
    }, new Map<string, typeof clientDetailRows>())
  )
    .map(([cliente, items]) => ({
      cliente,
      documento: items[0]?.Documento || '',
      items,
      total: items.reduce((acc, item) => acc + Number(item['Valor Total'] || 0), 0),
      pago: items
        .filter((item) => normalizeAccountingStatus(String(item.Status || '')) === 'PAGO')
        .reduce((acc, item) => acc + Number(item['Valor Total'] || 0), 0),
      pendente: items
        .filter((item) => normalizeAccountingStatus(String(item.Status || '')) === 'PENDENTE')
        .reduce((acc, item) => acc + Number(item['Valor Total'] || 0), 0),
      cancelado: items
        .filter((item) => normalizeAccountingStatus(String(item.Status || '')) === 'CANCELADO')
        .reduce((acc, item) => acc + Number(item['Valor Total'] || 0), 0),
    }))
    .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));

  const methodRows = Array.from(
    data.itens.reduce((map, item) => {
      const key = item.metodoPagamento || 'Nao informado';
      const current = map.get(key) || {
        Metodo: key,
        Vendas: 0,
        Total: 0,
        Pago: 0,
        Pendente: 0,
        Cancelado: 0,
      };
      const status = normalizeAccountingStatus(item.status);
      current.Vendas += 1;
      current.Total += Number(item.valorTotal || 0);
      if (status === 'PAGO') current.Pago += Number(item.valorTotal || 0);
      if (status === 'PENDENTE') current.Pendente += Number(item.valorTotal || 0);
      if (status === 'CANCELADO') current.Cancelado += Number(item.valorTotal || 0);
      map.set(key, current);
      return map;
    }, new Map<string, any>()).values()
  )
    .map((item) => ({
      ...item,
      Participacao: totalGeral > 0 ? item.Total / totalGeral : 0,
    }))
    .sort((a, b) => b.Total - a.Total);

  const productRows = Array.from(
    data.itens.reduce((map, item) => {
      const key = item.produto || 'Produto nao identificado';
      const current = map.get(key) || {
        Produto: key,
        Vendas: 0,
        Quantidade: 0,
        Total: 0,
      };
      current.Vendas += 1;
      current.Quantidade += Number(item.quantidadeValor || parseLooseNumber(item.quantidade));
      current.Total += Number(item.valorTotal || 0);
      map.set(key, current);
      return map;
    }, new Map<string, any>()).values()
  )
    .map((item) => ({
      ...item,
      TicketMedio: item.Vendas > 0 ? item.Total / item.Vendas : 0,
      Participacao: totalGeral > 0 ? item.Total / totalGeral : 0,
    }))
    .sort((a, b) => b.Total - a.Total);

  const dailyRows = Array.from(
    data.itens.reduce((map, item) => {
      const parsedDate = parseReportDateValue(item.data);
      const key = parsedDate ? formatDateKeyPtBr(parsedDate) : String(item.data || 'Sem data');
      const current = map.get(key) || {
        Data: key,
        AnoMes: parsedDate ? formatMonthKey(parsedDate) : '',
        Registros: 0,
        Total: 0,
        Pago: 0,
        Pendente: 0,
        Cancelado: 0,
      };
      const status = normalizeAccountingStatus(item.status);
      current.Registros += 1;
      current.Total += Number(item.valorTotal || 0);
      if (status === 'PAGO') current.Pago += Number(item.valorTotal || 0);
      if (status === 'PENDENTE') current.Pendente += Number(item.valorTotal || 0);
      if (status === 'CANCELADO') current.Cancelado += Number(item.valorTotal || 0);
      map.set(key, current);
      return map;
    }, new Map<string, any>()).values()
  ).sort((a, b) => {
    const da = parseReportDateValue(a.Data)?.getTime() || 0;
    const db = parseReportDateValue(b.Data)?.getTime() || 0;
    return da - db;
  });

  const statusRows = {
    pagos: data.itens.filter((item) => normalizeAccountingStatus(item.status) === 'PAGO'),
    pendentes: data.itens.filter((item) => normalizeAccountingStatus(item.status) === 'PENDENTE'),
    cancelados: data.itens.filter((item) => normalizeAccountingStatus(item.status) === 'CANCELADO'),
  };

  return {
    totalGeral,
    totalPago,
    totalPendente,
    totalCancelado,
    somentePagos,
    quantidadePendentes,
    ticketMedio,
    recebimentoPercentual,
    maiorLancamento,
    recorteLabel,
    totalPorUnidade,
    clientRows,
    clientDetailRows,
    clientDetailGroups,
    methodRows,
    productRows,
    dailyRows,
    statusRows,
  };
};

const getStatusClass = (status: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAGO') return 'status-paid';
  if (normalized === 'CANCELADO') return 'status-cancelled';
  return 'status-open';
};

const wrapHtmlDocument = (input: {
  title: string;
  subtitle: string;
  company: string;
  period: string;
  summaryCards: Array<{ label: string; value: string; tone?: 'neutral' | 'success' | 'danger' | 'info' }>;
  sections: string[];
  footer?: string;
}) => {
  const summaryCardsHtml = input.summaryCards
    .map(
      (card) => `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(card.label)}</div>
          <div class="summary-value ${card.tone || 'neutral'}">${escapeHtml(card.value)}</div>
        </div>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 22px;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #eef3f8;
            color: ${COLORS.textPrimary};
          }
          .document {
            background: ${COLORS.surface};
            border: 1px solid ${COLORS.border};
            border-radius: 18px;
            overflow: hidden;
          }
          .header {
            padding: 22px 24px;
            background: linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary});
            color: ${COLORS.textLight};
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
          }
          .brand {
            margin: 0;
            font-size: 22px;
            font-weight: 900;
          }
          .title {
            margin: 6px 0 0;
            font-size: 15px;
            font-weight: 700;
          }
          .subtitle {
            margin: 4px 0 0;
            font-size: 12px;
            opacity: 0.92;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            line-height: 1.6;
          }
          .period-box {
            margin-top: 14px;
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.18);
            font-size: 12px;
          }
          .content {
            padding: 20px 24px 24px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }
          .summary-card {
            background: ${COLORS.surfaceMuted};
            border: 1px solid ${COLORS.border};
            border-radius: 12px;
            padding: 12px;
          }
          .summary-label {
            font-size: 10px;
            font-weight: 800;
            color: ${COLORS.textSecondary};
            text-transform: uppercase;
            letter-spacing: 0.35px;
            margin-bottom: 6px;
          }
          .summary-value {
            font-size: 17px;
            font-weight: 900;
          }
          .summary-value.success { color: ${COLORS.success}; }
          .summary-value.danger { color: ${COLORS.danger}; }
          .summary-value.info { color: ${COLORS.info}; }
          .section {
            margin-top: 16px;
          }
          .section-title {
            margin: 0 0 10px;
            font-size: 13px;
            font-weight: 900;
            color: ${COLORS.secondary};
            text-transform: uppercase;
            letter-spacing: 0.35px;
          }
          .panel {
            border: 1px solid ${COLORS.border};
            border-radius: 12px;
            background: ${COLORS.surfaceMuted};
            padding: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid ${COLORS.border};
          }
          thead {
            background: ${COLORS.surfaceMuted};
          }
          th {
            padding: 9px;
            font-size: 10px;
            text-align: left;
            text-transform: uppercase;
            color: ${COLORS.textSecondary};
            border-bottom: 1px solid ${COLORS.border};
          }
          td {
            padding: 9px;
            font-size: 11px;
            color: ${COLORS.textPrimary};
            border-bottom: 1px solid ${COLORS.divider};
            vertical-align: top;
          }
          tbody tr:nth-child(even) {
            background: ${COLORS.surfaceMuted};
          }
          .align-right {
            text-align: right;
          }
          .muted {
            color: ${COLORS.textSecondary};
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 900;
          }
          .status-paid {
            color: ${COLORS.success};
            background: ${COLORS.successSoft};
            border: 1px solid ${COLORS.c86EFAC};
          }
          .status-open {
            color: ${COLORS.danger};
            background: ${COLORS.dangerBg};
            border: 1px solid ${COLORS.cFECACA};
          }
          .status-cancelled {
            color: ${COLORS.textSecondary};
            background: ${COLORS.surfaceMuted};
            border: 1px solid ${COLORS.border};
          }
          .chip-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .chip {
            border: 1px solid ${COLORS.border};
            border-radius: 12px;
            padding: 10px;
            background: ${COLORS.surfaceMuted};
          }
          .chip-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: ${COLORS.textSecondary};
          }
          .chip-value {
            margin-top: 5px;
            font-size: 14px;
            font-weight: 900;
            color: ${COLORS.textPrimary};
          }
          .footer {
            margin-top: 18px;
            padding-top: 12px;
            border-top: 1px dashed ${COLORS.border};
            font-size: 10px;
            color: ${COLORS.textSecondary};
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="document">
          <header class="header">
            <div class="header-top">
              <div>
                <p class="brand">${escapeHtml(input.company)}</p>
                <p class="title">${escapeHtml(input.title)}</p>
                <p class="subtitle">${escapeHtml(input.subtitle)}</p>
              </div>
              <div class="meta">
                <div><strong>Gerado em:</strong> ${escapeHtml(reportNowLabel())}</div>
                <div><strong>Arquivo:</strong> ${escapeHtml(input.title)}</div>
              </div>
            </div>
            <div class="period-box"><strong>Periodo:</strong> ${escapeHtml(input.period)}</div>
          </header>
          <main class="content">
            <section class="summary-grid">${summaryCardsHtml}</section>
            ${input.sections.join('')}
            <div class="footer">${escapeHtml(input.footer || 'Documento gerado automaticamente pelo Sistema de Gestao de Estufas.')}</div>
          </main>
        </div>
      </body>
    </html>
  `;
};

const sharePdfHtml = async (html: string, fileName: string) => {
  if (isShareLocked()) return;
  setShareLocked(true);

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const normalizedFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const destination = `${FileSystem.cacheDirectory}${normalizedFileName}`;
    const existing = await FileSystem.getInfoAsync(destination);
    if (existing.exists) {
      await FileSystem.deleteAsync(destination, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: uri, to: destination });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destination, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: normalizedFileName,
      });
      return;
    }

    const downloaded = await downloadPdfOnWeb(destination, normalizedFileName);
    if (!downloaded) {
      throw new Error('Nao foi possivel compartilhar ou baixar o PDF neste dispositivo.');
    }
  } finally {
    setShareLocked(false);
  }
};

const shareWorkbook = async (workbook: XLSX.WorkBook, fileName: string) => {
  if (typeof document !== 'undefined') {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const destination = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destination, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: fileName,
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
    return;
  }

  throw new Error('Nao foi possivel compartilhar o arquivo Excel neste dispositivo.');
};

const uint8ArrayToBase64 = (bytes: Uint8Array) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;

    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(triplet >> 6) & 63] : '=';
    result += i + 2 < bytes.length ? chars[triplet & 63] : '=';
  }

  return result;
};

const shareExcelJsWorkbook = async (
  workbook: {
    xlsx: {
      writeBuffer: () => Promise<ArrayBuffer | Uint8Array>;
    };
  },
  fileName: string
) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (typeof document !== 'undefined') {
    const blobBytes = new Uint8Array(bytes.byteLength);
    blobBytes.set(bytes);
    const blob = new Blob([blobBytes.buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return;
  }

  const base64 = uint8ArrayToBase64(bytes);
  const destination = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destination, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: fileName,
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
    return;
  }

  throw new Error('Nao foi possivel compartilhar o arquivo Excel neste dispositivo.');
};

const createWorkbook = () => XLSX.utils.book_new();

const appendSheet = (workbook: XLSX.WorkBook, name: string, sheet: XLSX.WorkSheet) => {
  XLSX.utils.book_append_sheet(workbook, sheet, name);
};

const buildSection = (title: string, content: string) => `
  <section class="section">
    <h2 class="section-title">${escapeHtml(title)}</h2>
    ${content}
  </section>
`;

export const shareSalesReportPdf = async (data: SalesReportPdfData) => {
  const rows = data.itens
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo || '-')}</td>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.documentoCliente || '-')}</td>
          <td>${escapeHtml(item.origem || '-')}</td>
          <td>${escapeHtml(item.local || item.estufa || '-')}</td>
          <td>${escapeHtml(item.lote || '-')}</td>
          <td>${escapeHtml(item.produto || '-')}</td>
          <td class="align-right">${escapeHtml(item.quantidade || '-')}</td>
          <td class="align-right">${fmtMoeda(item.precoUnitario || 0)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td><span class="status ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td>${escapeHtml(item.recebidoPor || '-')}</td>
          <td class="align-right">${fmtMoeda(item.valor)}</td>
        </tr>
      `
    )
    .join('');

  const notesRows = data.itens
    .filter((item) => item.observacoes && item.observacoes.trim())
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo || '-')}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.observacoes)}</td>
        </tr>
      `
    )
    .join('');

  const html = wrapHtmlDocument({
    title: data.tituloRelatorio,
    subtitle: `Produtor: ${data.nomeProdutor}`,
    company: data.nomeEstufa || data.nomeProdutor,
    period: data.periodo,
    summaryCards: [
      { label: 'Total vendido', value: fmtMoeda(data.totais.totalVendido) },
      { label: 'Total recebido', value: fmtMoeda(data.totais.totalRecebido), tone: 'success' },
      { label: 'A receber', value: fmtMoeda(data.totais.totalReceber), tone: 'info' },
      { label: 'A pagar', value: fmtMoeda(data.totais.totalPagar), tone: 'danger' },
      { label: 'Saldo', value: fmtMoeda(data.totais.saldo), tone: data.totais.saldo >= 0 ? 'success' : 'danger' },
      { label: 'Registros', value: String(data.totais.totalRegistros) },
      { label: 'Ticket medio', value: fmtMoeda(data.totais.ticketMedio) },
      { label: 'Periodo', value: data.periodo },
    ],
    sections: [
      buildSection(
        'Detalhamento',
        `
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Origem</th>
                <th>Local</th>
                <th>Lote</th>
                <th>Produto</th>
                <th class="align-right">Quantidade</th>
                <th class="align-right">Vlr unit.</th>
                <th>Metodo</th>
                <th>Status</th>
                <th>Recebido por</th>
                <th class="align-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="12">Sem registros no periodo selecionado.</td></tr>'}
            </tbody>
          </table>
        `
      ),
      buildSection(
        'Observacoes',
        data.observacoes
          ? `<div class="panel">${escapeHtml(data.observacoes)}</div>`
          : `
            <table>
              <thead>
                <tr><th>Codigo</th><th>Cliente</th><th>Data</th><th>Observacao</th></tr>
              </thead>
              <tbody>
                ${notesRows || '<tr><td colspan="4">Sem observacoes registradas.</td></tr>'}
              </tbody>
            </table>
          `
      ),
    ],
  });

  const fileName =
    data.nomeArquivo ||
    `Relatorio_Vendas_${sanitizeFilenameSegment(data.nomeEstufa || data.nomeProdutor)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
};

export const shareVendaReceipt = async (data: ReceiptData) => {
  const { venda, nomeProdutor, nomeCliente, nomeProduto, nomeEstufa } = data;

  if (!venda || !venda.id) {
    throw new Error('Venda invalida para geracao do PDF individual.');
  }

  const quantidade = Number(venda.quantidade || venda.itens?.[0]?.quantidade || 0);
  const precoUnitario = Number(venda.precoUnitario || venda.itens?.[0]?.valorUnitario || 0);
  const valor = Number(venda.valorTotal || quantidade * precoUnitario);
  const status =
    venda.statusPagamento === 'pendente'
      ? 'PENDENTE'
      : venda.statusPagamento === 'cancelado'
      ? 'CANCELADO'
      : 'PAGO';
  const dataVenda = toDateSafe(venda.dataVenda || venda.dataColheita);
  const dataVendaLabel = dataVenda.toLocaleDateString('pt-BR');
  const dataToken = dataVenda.toISOString().slice(0, 10);
  const codigoToken = sanitizeFilenameSegment(String(venda.id));
  const clienteToken = sanitizeFilenameSegment(nomeCliente || 'cliente-avulso');

  await shareSalesReportPdf({
    nomeProdutor,
    nomeEstufa,
    tituloRelatorio: 'Comprovante de venda',
    periodo: dataVendaLabel,
    nomeArquivo: `Comprovante_${clienteToken}_${dataToken}_${codigoToken}.pdf`,
    observacoes: venda.observacoes || `Produto: ${nomeProduto}`,
    totais: {
      totalReceber: status === 'PENDENTE' ? valor : 0,
      totalPagar: 0,
      saldo: status === 'CANCELADO' ? 0 : valor,
      totalVendido: status === 'CANCELADO' ? 0 : valor,
      totalRecebido: status === 'PAGO' ? valor : 0,
      ticketMedio: status === 'CANCELADO' ? 0 : valor,
      totalRegistros: 1,
    },
    itens: [
      {
        codigo: venda.id,
        data: dataVendaLabel,
        cliente: nomeCliente,
        local: nomeEstufa,
        metodoPagamento: String(venda.metodoPagamento || venda.formaPagamento || 'N/A').toUpperCase(),
        status,
        valor,
        observacoes: venda.observacoes,
      },
    ],
  });
};

export const shareSalesAccountingPdf = async (data: SalesAccountingPdfData) => {
  const {
    totalGeral,
    totalPago,
    totalPendente,
    totalCancelado,
    quantidadePendentes,
    ticketMedio,
    maiorLancamento,
    somentePagos,
    recorteLabel,
    statusRows,
  } = buildSalesAccountingInsights(data);

  const renderAccountingRows = (items: SalesAccountingItem[]) =>
    items
      .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo)}</td>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.documentoCliente || '-')}</td>
          <td>${escapeHtml(item.origem || '-')}</td>
          <td>${escapeHtml(item.estufa)}</td>
          <td>${escapeHtml(item.lote || '-')}</td>
          <td>${escapeHtml(item.produto)}</td>
          <td>${escapeHtml(item.quantidade)}</td>
          <td class="align-right">${fmtMoeda(item.precoUnitario)}</td>
          <td class="align-right">${fmtMoeda(item.valorTotal)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td><span class="status ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td>${escapeHtml(item.recebidoPor || '-')}</td>
        </tr>
      `
    )
    .join('');

  const rowsPagos = renderAccountingRows(statusRows.pagos);
  const rowsPendentes = renderAccountingRows(statusRows.pendentes);
  const rowsCancelados = renderAccountingRows(statusRows.cancelados);

  const deadlineRows = data.itens
    .filter((item) => normalizeAccountingStatus(item.status) === 'PENDENTE')
    .sort((a, b) => String(a.cliente || '').localeCompare(String(b.cliente || ''), 'pt-BR'))
    .slice(0, 8)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.documentoCliente || '-')}</td>
          <td>${escapeHtml(item.produto)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td class="align-right">${fmtMoeda(item.valorTotal)}</td>
        </tr>
      `
    )
    .join('');

  const clientSummaryMap = new Map<
    string,
    { documento: string; total: number; pago: number; pendente: number; cancelado: number; quantidade: number }
  >();

  data.itens.forEach((item) => {
    const key = item.cliente || 'Cliente nao identificado';
    const current =
      clientSummaryMap.get(key) || {
        documento: item.documentoCliente || '-',
        total: 0,
        pago: 0,
        pendente: 0,
        cancelado: 0,
        quantidade: 0,
      };
    current.total += Number(item.valorTotal || 0);
    current.quantidade += 1;
    if (String(item.status).toUpperCase() === 'PAGO') current.pago += Number(item.valorTotal || 0);
    else if (String(item.status).toUpperCase() === 'CANCELADO') current.cancelado += Number(item.valorTotal || 0);
    else current.pendente += Number(item.valorTotal || 0);
    clientSummaryMap.set(key, current);
  });

  const clientRows = Array.from(clientSummaryMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(
      ([cliente, info]) => `
        <tr>
          <td>${escapeHtml(cliente)}</td>
          <td>${escapeHtml(info.documento)}</td>
          <td class="align-right">${info.quantidade}</td>
          <td class="align-right">${fmtMoeda(info.total)}</td>
          <td class="align-right">${fmtMoeda(info.pago)}</td>
          <td class="align-right">${fmtMoeda(info.pendente)}</td>
          <td class="align-right">${fmtMoeda(info.cancelado)}</td>
        </tr>
      `
    )
    .join('');

  const html = wrapHtmlDocument({
    title: somentePagos ? 'Relatorio contabil de vendas pagas' : 'Relatorio contabil de vendas',
    subtitle: somentePagos
      ? 'Documento para conferencia de faturamento ja recebido'
      : 'Documento para conferencia de faturamento, recebimento e pendencias',
    company: data.empresa,
    period: data.periodo,
    summaryCards: [
      { label: 'Vendas', value: String(data.itens.length) },
      { label: 'Total geral', value: fmtMoeda(totalGeral) },
      { label: 'Total pago', value: fmtMoeda(totalPago), tone: 'success' },
      { label: 'Pendente', value: fmtMoeda(totalPendente), tone: 'danger' },
      { label: 'Cancelado', value: fmtMoeda(totalCancelado), tone: 'neutral' },
      { label: 'Recorte', value: recorteLabel, tone: somentePagos ? 'success' : 'info' },
      { label: 'Titulos pendentes', value: String(quantidadePendentes), tone: 'danger' },
      { label: 'Ticket medio', value: fmtMoeda(ticketMedio) },
      { label: 'Maior lancamento', value: fmtMoeda(maiorLancamento) },
    ],
    sections: [
      buildSection(
        'Leitura contabil',
        `
          <div class="chip-grid">
            <div class="chip">
              <div class="chip-label">Empresa</div>
              <div class="chip-value">${escapeHtml(data.empresa)}</div>
            </div>
            <div class="chip">
              <div class="chip-label">Periodo apurado</div>
              <div class="chip-value">${escapeHtml(data.periodo)}</div>
            </div>
            <div class="chip">
              <div class="chip-label">Pendencia financeira</div>
              <div class="chip-value">${escapeHtml(fmtMoeda(totalPendente))}</div>
            </div>
            <div class="chip">
              <div class="chip-label">Recorte aplicado</div>
              <div class="chip-value">${escapeHtml(recorteLabel)}</div>
            </div>
            <div class="chip">
              <div class="chip-label">Cobertura de recebimento</div>
              <div class="chip-value">${escapeHtml(data.itens.length > 0 ? fmtNumero((totalPago / Math.max(totalGeral, 1)) * 100) : '0,00')}%</div>
            </div>
          </div>
        `
      ),
      buildSection(
        'Resumo por cliente',
        `
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th class="align-right">Qtd. vendas</th>
                <th class="align-right">Total</th>
                <th class="align-right">Pago</th>
                <th class="align-right">Pendente</th>
                <th class="align-right">Cancelado</th>
              </tr>
            </thead>
            <tbody>
              ${clientRows || '<tr><td colspan="7">Sem clientes no periodo selecionado.</td></tr>'}
            </tbody>
          </table>
        `
      ),
      buildSection(
        'Titulos em aberto',
        `
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Produto</th>
                <th>Metodo</th>
                <th class="align-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${deadlineRows || '<tr><td colspan="5">Sem titulos pendentes no periodo.</td></tr>'}
            </tbody>
          </table>
        `
      ),
      buildSection(
        'Lancamentos Recebidos',
        `
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Origem</th>
                <th>Estufa</th>
                <th>Lote</th>
                <th>Produto</th>
                  <th>Qtd.</th>
                  <th class="align-right">Vlr unit.</th>
                  <th class="align-right">Vlr total</th>
                  <th>Metodo</th>
                  <th>Status</th>
                  <th>Recebido por</th>
              </tr>
            </thead>
            <tbody>
                ${rowsPagos || '<tr><td colspan="14">Sem lancamentos recebidos no periodo.</td></tr>'}
              </tbody>
            </table>
          `
        ),
      buildSection(
        'Lancamentos Pendentes',
        `
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Origem</th>
                <th>Estufa</th>
                <th>Lote</th>
                <th>Produto</th>
                  <th>Qtd.</th>
                  <th class="align-right">Vlr unit.</th>
                  <th class="align-right">Vlr total</th>
                  <th>Metodo</th>
                  <th>Status</th>
                  <th>Recebido por</th>
                </tr>
              </thead>
              <tbody>
                ${rowsPendentes || '<tr><td colspan="14">Sem lancamentos pendentes no periodo.</td></tr>'}
              </tbody>
            </table>
          `
        ),
      buildSection(
        'Lancamentos Cancelados',
        `
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Origem</th>
                <th>Estufa</th>
                <th>Lote</th>
                <th>Produto</th>
                  <th>Qtd.</th>
                  <th class="align-right">Vlr unit.</th>
                  <th class="align-right">Vlr total</th>
                  <th>Metodo</th>
                  <th>Status</th>
                  <th>Recebido por</th>
                </tr>
              </thead>
              <tbody>
                ${rowsCancelados || '<tr><td colspan="14">Sem lancamentos cancelados no periodo.</td></tr>'}
              </tbody>
            </table>
          `
        ),
      ],
    footer: 'Relatorio contabil para conferencia de faturamento, recebimento, inadimplencia e repasse ao escritorio.',
  });

  const fileName = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
};

export const exportSalesAccountingExcelCompat = async (data: SalesAccountingPdfData) => {
  const fileName = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.xlsx`;
  const workbook = createWorkbook();

  const {
    totalGeral,
    totalPago,
    totalPendente,
    totalCancelado,
    somentePagos,
    quantidadePendentes,
    ticketMedio,
    recebimentoPercentual,
    maiorLancamento,
    recorteLabel,
    clientRows,
    clientDetailRows,
    clientDetailGroups,
    methodRows,
    productRows,
    dailyRows,
    statusRows,
  } = buildSalesAccountingInsights(data);

  const resumoRows = [
    ['RELATORIO CONTABIL DE VENDAS'],
    [data.empresa],
    [],
    ['Periodo', data.periodo, 'Recorte', recorteLabel],
    ['Gerado em', reportNowLabel(), 'Total de registros', data.itens.length],
    [],
    ['INDICADOR', 'VALOR', '', 'INDICADOR', 'VALOR'],
    ['Total geral', totalGeral, '', 'Total pago', totalPago],
    ['Total pendente', totalPendente, '', 'Total cancelado', totalCancelado],
    ['Ticket medio', ticketMedio, '', 'Cobertura de recebimento', recebimentoPercentual],
    ['Titulos pendentes', quantidadePendentes, '', 'Maior lancamento', maiorLancamento],
  ];
  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoRows);
  addMerges(resumoSheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ]);
  applyColumnWidths(resumoSheet, [24, 18, 4, 26, 18]);
  applyNumberFormats(resumoSheet, [
    { columnIndex: 1, rowStart: 7, rowEnd: 10, format: '"R$" #,##0.00' },
    { columnIndex: 4, rowStart: 7, rowEnd: 8, format: '"R$" #,##0.00' },
    { columnIndex: 4, rowStart: 9, rowEnd: 9, format: '0.00%' },
    { columnIndex: 4, rowStart: 10, rowEnd: 10, format: '"R$" #,##0.00' },
  ]);
  appendSheet(workbook, 'Resumo Executivo', resumoSheet);

  const detailHeaderRow = 5;
  const detailDataStart = detailHeaderRow + 1;
  const detailRows = [
    ['RELATORIO CONTABIL DE VENDAS'],
    [data.empresa],
    ['Periodo', data.periodo, '', 'Recorte', recorteLabel],
    [],
    ['Codigo', 'Data', 'Cliente', 'Documento', 'Estufa', 'Lote', 'Produto', 'Quantidade', 'Preco Unitario', 'Valor Total', 'Metodo', 'Status', 'Recebido Por'],
    ...data.itens.map((item) => [
      item.codigo,
      item.data,
      item.cliente,
      item.documentoCliente || '',
      item.estufa,
      item.lote || '',
      item.produto,
      item.quantidade,
      Number(item.precoUnitario || 0),
      Number(item.valorTotal || 0),
      item.metodoPagamento,
      item.status,
      item.recebidoPor || '',
    ]),
  ];
  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
  addMerges(detailSheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
  ]);
  applyColumnWidths(detailSheet, [18, 12, 28, 18, 18, 18, 30, 16, 14, 14, 16, 12, 20]);
  addAutoFilter(
    detailSheet,
    XLSX.utils.encode_range({
      s: { r: detailHeaderRow - 1, c: 0 },
      e: { r: Math.max(detailHeaderRow - 1, detailRows.length - 1), c: 12 },
    })
  );
  applyNumberFormats(detailSheet, [
    { columnIndex: 8, rowStart: detailDataStart - 1, rowEnd: detailRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 9, rowStart: detailDataStart - 1, rowEnd: detailRows.length - 1, format: '"R$" #,##0.00' },
  ]);

  const totalRowIndex = detailRows.length;
  XLSX.utils.sheet_add_aoa(
    detailSheet,
    [['', '', '', '', '', '', '', 'TOTAL', '', { f: `SUM(J${detailDataStart}:J${detailRows.length})` }, '', '', '']],
    { origin: `A${totalRowIndex + 1}` }
  );
  const totalCellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: 9 });
  if (detailSheet[totalCellRef]) detailSheet[totalCellRef].z = '"R$" #,##0.00';
  appendSheet(workbook, 'Lancamentos', detailSheet);

  const clientSheetRows: Array<Array<string | number>> = [
    ['COMPRAS POR CLIENTE'],
    [data.empresa],
    ['Periodo', data.periodo],
    [],
  ];

  clientDetailGroups.forEach((group) => {
    clientSheetRows.push([`CLIENTE: ${group.cliente}`]);
    clientSheetRows.push([`Documento: ${group.documento || '-'}`, '', '', '', '', '', '', '', '', '', 'Total do cliente', group.total]);
    clientSheetRows.push(['', '', '', '', '', '', '', '', '', '', 'Total pago', group.pago, 'Total pendente', group.pendente]);
    clientSheetRows.push(['', '', '', '', '', '', '', '', '', '', 'Total cancelado', group.cancelado]);
    clientSheetRows.push(['Data', 'Codigo', 'Origem', 'Local', 'Lote', 'Produto', 'Quantidade', 'Unidade', 'Preco Unitario', 'Valor Total', 'Metodo', 'Status', 'Recebido por', 'Observacoes']);
    group.items.forEach((item) => {
      clientSheetRows.push([
        item.Data,
        item.Codigo,
        item.Origem,
        item.Local,
        item.Lote,
        item.Produto,
        item.Quantidade,
        item.Unidade,
        item['Preco Unitario'],
        item['Valor Total'],
        item.Metodo,
        item.Status,
        item['Recebido Por'],
        item.Observacoes,
      ]);
    });
    clientSheetRows.push([]);
  });

  const clientSheet = XLSX.utils.aoa_to_sheet(clientSheetRows);
  addMerges(clientSheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
  ]);
  applyColumnWidths(clientSheet, [12, 16, 14, 18, 16, 24, 12, 10, 16, 16, 16, 14, 20, 28]);
  applyNumberFormats(clientSheet, [
    { columnIndex: 8, rowStart: 4, rowEnd: clientSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 9, rowStart: 4, rowEnd: clientSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 11, rowStart: 4, rowEnd: clientSheetRows.length - 1, format: '"R$" #,##0.00' },
  ]);
  appendSheet(workbook, 'Resumo Clientes', clientSheet);

  const pendingRows = statusRows.pendentes
    .map((item) => [
      item.data,
      item.cliente,
      item.documentoCliente || '',
      item.estufa,
      item.produto,
      item.metodoPagamento,
      Number(item.valorTotal || 0),
      item.status,
      item.recebidoPor || '',
    ]);
  const pendenciasSheetRows = [
    ['PENDENCIAS FINANCEIRAS'],
    [data.empresa],
    ['Periodo', data.periodo],
    [],
    ['Data', 'Cliente', 'Documento', 'Estufa', 'Produto', 'Metodo', 'Valor', 'Status', 'Recebido Por'],
    ...pendingRows,
  ];
  const pendenciasSheet = XLSX.utils.aoa_to_sheet(pendenciasSheetRows);
  addMerges(pendenciasSheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
  ]);
  applyColumnWidths(pendenciasSheet, [12, 28, 18, 18, 28, 16, 14, 12, 20]);
  addAutoFilter(
    pendenciasSheet,
    XLSX.utils.encode_range({
      s: { r: 4, c: 0 },
      e: { r: Math.max(4, pendenciasSheetRows.length - 1), c: 8 },
    })
  );
  applyNumberFormatToColumn(pendenciasSheet, 6, 5, pendenciasSheetRows.length - 1, '"R$" #,##0.00');
  appendSheet(workbook, 'Pendencias', pendenciasSheet);

  const methodSheetRows = [
    ['RESUMO POR METODO DE PAGAMENTO'],
    [data.empresa],
    ['Periodo', data.periodo, 'Recorte', recorteLabel],
    [],
    ['Metodo', 'Qtd. vendas', 'Total', 'Pago', 'Pendente', 'Cancelado', 'Participacao'],
    ...methodRows.map((item) => [item.Metodo, item.Vendas, item.Total, item.Pago, item.Pendente, item.Cancelado, item.Participacao]),
  ];
  const methodSheet = XLSX.utils.aoa_to_sheet(methodSheetRows);
  addMerges(methodSheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ]);
  applyColumnWidths(methodSheet, [24, 12, 14, 14, 14, 14, 14]);
  addAutoFilter(
    methodSheet,
    XLSX.utils.encode_range({
      s: { r: 4, c: 0 },
      e: { r: Math.max(4, methodSheetRows.length - 1), c: 6 },
    })
  );
  applyNumberFormats(methodSheet, [
    { columnIndex: 2, rowStart: 5, rowEnd: methodSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 3, rowStart: 5, rowEnd: methodSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 4, rowStart: 5, rowEnd: methodSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 5, rowStart: 5, rowEnd: methodSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 6, rowStart: 5, rowEnd: methodSheetRows.length - 1, format: '0.00%' },
  ]);
  appendSheet(workbook, 'Resumo Metodos', methodSheet);

  const dailySheetRows = [
    ['CONSOLIDADO DIARIO'],
    [data.empresa],
    ['Periodo', data.periodo, 'Recorte', recorteLabel],
    [],
    ['Data', 'Ano/Mes', 'Registros', 'Total', 'Pago', 'Pendente', 'Cancelado'],
    ...dailyRows.map((item) => [item.Data, item.AnoMes, item.Registros, item.Total, item.Pago, item.Pendente, item.Cancelado]),
  ];
  const dailySheet = XLSX.utils.aoa_to_sheet(dailySheetRows);
  addMerges(dailySheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ]);
  applyColumnWidths(dailySheet, [14, 12, 12, 14, 14, 14, 14]);
  addAutoFilter(
    dailySheet,
    XLSX.utils.encode_range({
      s: { r: 4, c: 0 },
      e: { r: Math.max(4, dailySheetRows.length - 1), c: 6 },
    })
  );
  applyNumberFormats(dailySheet, [
    { columnIndex: 3, rowStart: 5, rowEnd: dailySheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 4, rowStart: 5, rowEnd: dailySheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 5, rowStart: 5, rowEnd: dailySheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 6, rowStart: 5, rowEnd: dailySheetRows.length - 1, format: '"R$" #,##0.00' },
  ]);
  appendSheet(workbook, 'Consolidado Diario', dailySheet);

  const productSheetRows = [
    ['RANKING DE PRODUTOS'],
    [data.empresa],
    ['Periodo', data.periodo, 'Recorte', recorteLabel],
    [],
    ['Produto', 'Qtd. vendas', 'Quantidade', 'Total', 'Ticket medio', 'Participacao'],
    ...productRows.map((item) => [item.Produto, item.Vendas, item.Quantidade, item.Total, item.TicketMedio, item.Participacao]),
  ];
  const productSheet = XLSX.utils.aoa_to_sheet(productSheetRows);
  addMerges(productSheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ]);
  applyColumnWidths(productSheet, [30, 12, 14, 14, 14, 14]);
  addAutoFilter(
    productSheet,
    XLSX.utils.encode_range({
      s: { r: 4, c: 0 },
      e: { r: Math.max(4, productSheetRows.length - 1), c: 5 },
    })
  );
  applyNumberFormats(productSheet, [
    { columnIndex: 2, rowStart: 5, rowEnd: productSheetRows.length - 1, format: '#,##0.00' },
    { columnIndex: 3, rowStart: 5, rowEnd: productSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 4, rowStart: 5, rowEnd: productSheetRows.length - 1, format: '"R$" #,##0.00' },
    { columnIndex: 5, rowStart: 5, rowEnd: productSheetRows.length - 1, format: '0.00%' },
  ]);
  appendSheet(workbook, 'Ranking Produtos', productSheet);

  const buildStatusSheet = (name: string, title: string, items: SalesAccountingItem[]) => {
    const rows = [
      [title],
      [data.empresa],
      ['Periodo', data.periodo, 'Registros', items.length],
      [],
      ['Codigo', 'Data', 'Cliente', 'Documento', 'Estufa', 'Lote', 'Produto', 'Quantidade', 'Preco Unitario', 'Valor Total', 'Metodo', 'Recebido Por'],
      ...items.map((item) => [
        item.codigo,
        item.data,
        item.cliente,
        item.documentoCliente || '',
        item.estufa,
        item.lote || '',
        item.produto,
        item.quantidade,
        Number(item.precoUnitario || 0),
        Number(item.valorTotal || 0),
        item.metodoPagamento,
        item.recebidoPor || '',
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    addMerges(sheet, [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    ]);
    applyColumnWidths(sheet, [14, 12, 28, 18, 16, 16, 24, 12, 15, 16, 16, 20]);
    addAutoFilter(
      sheet,
      XLSX.utils.encode_range({
        s: { r: 4, c: 0 },
        e: { r: Math.max(4, rows.length - 1), c: 11 },
      })
    );
    applyNumberFormats(sheet, [
      { columnIndex: 8, rowStart: 5, rowEnd: rows.length - 1, format: '"R$" #,##0.00' },
      { columnIndex: 9, rowStart: 5, rowEnd: rows.length - 1, format: '"R$" #,##0.00' },
    ]);
    appendSheet(workbook, name, sheet);
  };

  buildStatusSheet('Recebidos', 'LANCAMENTOS RECEBIDOS', statusRows.pagos);
  buildStatusSheet('Pendentes Det', 'LANCAMENTOS PENDENTES', statusRows.pendentes);
  buildStatusSheet('Cancelados', 'LANCAMENTOS CANCELADOS', statusRows.cancelados);

  appendSheet(
    workbook,
    'Metadados',
    buildMetadataSheet([
      ['Relatorio', 'Contabil de vendas'],
      ['Empresa', data.empresa],
      ['Periodo', data.periodo],
      ['Recorte', recorteLabel],
      ['Total de registros', data.itens.length],
      ['Gerado em', reportNowLabel()],
    ])
  );

  await shareWorkbook(workbook, fileName);
};

export const exportSalesAccountingExcelStyled = async (data: SalesAccountingPdfData) => {
  const fileName = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.xlsx`;

  try {
    if (!canUseStyledExcelJs) {
      await exportSalesAccountingExcelCompat(data);
      return;
    }

    const excelJsModule = await import('exceljs');
    const ExcelJS = (excelJsModule as any).default ?? excelJsModule;
    const insights = buildSalesAccountingInsights(data);
    const {
      totalGeral,
      totalPago,
      totalPendente,
      totalCancelado,
      ticketMedio,
      recebimentoPercentual,
    totalPorUnidade,
    clientRows,
    clientDetailRows,
    clientDetailGroups,
    methodRows,
    productRows,
      dailyRows,
      statusRows,
    } = insights;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Estufa2';
    
    // Cover/Dashboard
    const dashSheet = createExcelCoverPage(workbook, 'Dashboard Financeiro - Vendas', {
      empresa: data.empresa,
      periodo: data.periodo,
      geradoEm: reportNowLabel(),
    }, [
      { label: 'Total Geral', value: totalGeral, tone: 'brand', format: CURRENCY_FMT },
      { label: 'Total Recebido', value: totalPago, tone: 'success', format: CURRENCY_FMT },
      { label: 'Total Pendente', value: totalPendente, tone: 'warning', format: CURRENCY_FMT },
      { label: 'Ticket Médio', value: ticketMedio, tone: 'neutral', format: CURRENCY_FMT },
      { label: 'Cobertura', value: recebimentoPercentual, tone: 'success', format: PERCENT_FMT },
      { label: 'Vendas', value: data.itens.length, tone: 'neutral' },
    ]);

    dashSheet.getCell('A7').value = 'PRODUTIVIDADE POR UNIDADE';
    applyExcelFilledCell(dashSheet.getCell('A7'), { fill: EXCEL_PALETTE.brandSoft, bold: true, color: EXCEL_PALETTE.brand });
    dashSheet.mergeCells('B7:E7');

    let dashRow = 8;
    Object.entries(totalPorUnidade).forEach(([unit, val]) => {
      dashSheet.getCell(dashRow, 1).value = unit.toUpperCase();
      dashSheet.getCell(dashRow, 2).value = val;
      applyExcelFilledCell(dashSheet.getCell(dashRow, 1), { fill: EXCEL_PALETTE.neutralSoft });
      applyExcelFilledCell(dashSheet.getCell(dashRow, 2), { fill: EXCEL_PALETTE.white, alignment: { horizontal: 'right' }, bold: true });
      dashRow++;
    });

    dashSheet.getCell(dashRow + 1, 1).value = 'TOP 5 CLIENTES (VALOR)';
    applyExcelFilledCell(dashSheet.getCell(dashRow + 1, 1), { fill: EXCEL_PALETTE.brandSoft, bold: true, color: EXCEL_PALETTE.brand });
    dashSheet.mergeCells(`B${dashRow + 1}:E${dashRow + 1}`);
    dashRow += 2;

    clientRows.slice(0, 5).forEach((c) => {
      dashSheet.getCell(dashRow, 1).value = c.Cliente;
      dashSheet.getCell(dashRow, 2).value = c.Total;
      applyExcelFilledCell(dashSheet.getCell(dashRow, 1), { fill: EXCEL_PALETTE.neutralSoft });
      applyExcelFilledCell(dashSheet.getCell(dashRow, 2), { fill: EXCEL_PALETTE.white, format: CURRENCY_FMT, alignment: { horizontal: 'right' } });
      const part = totalGeral > 0 ? c.Total / totalGeral : 0;
      const barCell = dashSheet.getCell(dashRow, 4);
      barCell.value = part;
      barCell.numFmt = '0%';
      applyExcelFilledCell(barCell, { fill: EXCEL_PALETTE.successSoft, color: EXCEL_PALETTE.success, alignment: { horizontal: 'center' } });
      dashSheet.mergeCells(`D${dashRow}:E${dashRow}`);
      dashRow++;
    });

    // Lancamentos
    const detailSheet = workbook.addWorksheet('Lancamentos', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });
    detailSheet.columns = [
      { width: 14 }, { width: 12 }, { width: 28 }, { width: 18 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 24 },
      { width: 10 }, { width: 8 }, { width: 15 }, { width: 16 }, { width: 16 }, { width: 13 }, { width: 20 }, { width: 40 }
    ];
    detailSheet.addTable({
      name: 'LancamentosTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: [
        { name: 'Codigo' }, { name: 'Data' }, { name: 'Cliente' }, { name: 'Documento' }, { name: 'Origem' }, { name: 'Local' }, { name: 'Lote' }, { name: 'Produto' },
        { name: 'Qtd' }, { name: 'Unid' }, { name: 'Preco Unitario' }, { name: 'Valor Total' }, { name: 'Metodo' }, { name: 'Status' }, { name: 'Recebido Por' }, { name: 'Observacoes' }
      ],
      rows: data.itens.map(item => [
        item.codigo, item.data, item.cliente, item.documentoCliente || '', item.origem || '', item.estufa, item.lote || '', item.produto,
        Number(item.quantidadeValor || 0), item.quantidadeUnidade || '', Number(item.precoUnitario || 0), Number(item.valorTotal || 0),
        item.metodoPagamento, item.status, item.recebidoPor || '', item.observacoes || ''
      ]),
    });
    decorateExcelTableHeader(detailSheet, 1);
    applyExcelBodyStyle(detailSheet, 2, data.itens.length + 1, 14);
    for (let r = 2; r <= data.itens.length + 1; r++) {
      detailSheet.getCell(`K${r}`).numFmt = CURRENCY_FMT;
      detailSheet.getCell(`L${r}`).numFmt = CURRENCY_FMT;
      detailSheet.getCell(`P${r}`).alignment = { wrapText: true };
    }

    const clientSheet = workbook.addWorksheet('Clientes', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    clientSheet.columns = [
      { width: 12 }, { width: 16 }, { width: 14 }, { width: 18 }, { width: 16 }, { width: 24 },
      { width: 12 }, { width: 10 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 20 }, { width: 28 }
    ];

    clientSheet.mergeCells('A1:N1');
    clientSheet.getCell('A1').value = 'COMPRAS POR CLIENTE';
    applyExcelFilledCell(clientSheet.getCell('A1'), {
      fill: EXCEL_PALETTE.brand,
      color: EXCEL_PALETTE.white,
      bold: true,
      size: 14,
      alignment: { vertical: 'middle', horizontal: 'center' },
    });

    clientSheet.mergeCells('A2:N2');
    clientSheet.getCell('A2').value = `${data.empresa} | ${data.periodo}`;
    applyExcelFilledCell(clientSheet.getCell('A2'), {
      fill: EXCEL_PALETTE.brandSoft,
      color: EXCEL_PALETTE.brand,
      bold: true,
      alignment: { vertical: 'middle', horizontal: 'center' },
    });

    let clientRow = 4;
    clientDetailGroups.forEach((group) => {
      clientSheet.mergeCells(`A${clientRow}:N${clientRow}`);
      clientSheet.getCell(`A${clientRow}`).value = `CLIENTE: ${group.cliente}`;
      applyExcelFilledCell(clientSheet.getCell(`A${clientRow}`), {
        fill: EXCEL_PALETTE.neutral,
        color: EXCEL_PALETTE.white,
        bold: true,
      });
      clientRow += 1;

      clientSheet.getCell(`A${clientRow}`).value = `Documento: ${group.documento || '-'}`;
      clientSheet.getCell(`J${clientRow}`).value = 'Total do cliente';
      clientSheet.getCell(`K${clientRow}`).value = group.total;
      applyExcelFilledCell(clientSheet.getCell(`A${clientRow}`), {
        fill: EXCEL_PALETTE.neutralSoft,
        color: EXCEL_PALETTE.neutral,
        bold: true,
      });
      for (const cellRef of [`B${clientRow}`, `C${clientRow}`, `D${clientRow}`, `E${clientRow}`, `F${clientRow}`, `G${clientRow}`, `H${clientRow}`, `I${clientRow}`]) {
        applyExcelFilledCell(clientSheet.getCell(cellRef), { fill: EXCEL_PALETTE.white });
      }
      applyExcelFilledCell(clientSheet.getCell(`J${clientRow}`), {
        fill: EXCEL_PALETTE.warningSoft,
        color: EXCEL_PALETTE.warning,
        bold: true,
      });
      applyExcelFilledCell(clientSheet.getCell(`K${clientRow}`), {
        fill: EXCEL_PALETTE.white,
        bold: true,
        format: CURRENCY_FMT,
        alignment: { vertical: 'middle', horizontal: 'right' },
      });
      for (const cellRef of [`L${clientRow}`, `M${clientRow}`, `N${clientRow}`]) {
        applyExcelFilledCell(clientSheet.getCell(cellRef), { fill: EXCEL_PALETTE.white });
      }
      clientRow += 1;

      clientSheet.getCell(`J${clientRow}`).value = 'Total pago';
      clientSheet.getCell(`K${clientRow}`).value = group.pago;
      clientSheet.getCell(`L${clientRow}`).value = 'Total pendente';
      clientSheet.getCell(`M${clientRow}`).value = group.pendente;
      for (const cellRef of [`A${clientRow}`, `B${clientRow}`, `C${clientRow}`, `D${clientRow}`, `E${clientRow}`, `F${clientRow}`, `G${clientRow}`, `H${clientRow}`, `I${clientRow}`, `N${clientRow}`]) {
        applyExcelFilledCell(clientSheet.getCell(cellRef), { fill: EXCEL_PALETTE.white });
      }
      for (const cellRef of [`J${clientRow}`, `L${clientRow}`]) {
        applyExcelFilledCell(clientSheet.getCell(cellRef), {
          fill: EXCEL_PALETTE.successSoft,
          color: EXCEL_PALETTE.success,
          bold: true,
        });
      }
      for (const cellRef of [`K${clientRow}`, `M${clientRow}`]) {
        applyExcelFilledCell(clientSheet.getCell(cellRef), {
          fill: EXCEL_PALETTE.white,
          bold: true,
          format: CURRENCY_FMT,
          alignment: { vertical: 'middle', horizontal: 'right' },
        });
      }
      clientRow += 1;

      clientSheet.getCell(`J${clientRow}`).value = 'Total cancelado';
      clientSheet.getCell(`K${clientRow}`).value = group.cancelado;
      for (const cellRef of [`A${clientRow}`, `B${clientRow}`, `C${clientRow}`, `D${clientRow}`, `E${clientRow}`, `F${clientRow}`, `G${clientRow}`, `H${clientRow}`, `I${clientRow}`, `L${clientRow}`, `M${clientRow}`, `N${clientRow}`]) {
        applyExcelFilledCell(clientSheet.getCell(cellRef), { fill: EXCEL_PALETTE.white });
      }
      applyExcelFilledCell(clientSheet.getCell(`J${clientRow}`), {
        fill: EXCEL_PALETTE.dangerSoft,
        color: EXCEL_PALETTE.danger,
        bold: true,
      });
      applyExcelFilledCell(clientSheet.getCell(`K${clientRow}`), {
        fill: EXCEL_PALETTE.white,
        bold: true,
        format: CURRENCY_FMT,
        alignment: { vertical: 'middle', horizontal: 'right' },
      });
      clientRow += 1;

      const headerRow = clientSheet.getRow(clientRow);
      ['Data', 'Codigo', 'Origem', 'Local', 'Lote', 'Produto', 'Quantidade', 'Unidade', 'Preco Unitario', 'Valor Total', 'Metodo', 'Status', 'Recebido Por', 'Observacoes'].forEach(
        (label, index) => {
          headerRow.getCell(index + 1).value = label;
        }
      );
      decorateExcelTableHeader(clientSheet, clientRow);
      clientRow += 1;

      const bodyStartRow = clientRow;
      group.items.forEach((item) => {
        const row = clientSheet.getRow(clientRow);
        row.getCell(1).value = item.Data;
        row.getCell(2).value = item.Codigo;
        row.getCell(3).value = item.Origem;
        row.getCell(4).value = item.Local;
        row.getCell(5).value = item.Lote;
        row.getCell(6).value = item.Produto;
        row.getCell(7).value = item.Quantidade;
        row.getCell(8).value = item.Unidade;
        row.getCell(9).value = item['Preco Unitario'];
        row.getCell(10).value = item['Valor Total'];
        row.getCell(11).value = item.Metodo;
        row.getCell(12).value = item.Status;
        row.getCell(13).value = item['Recebido Por'];
        row.getCell(14).value = item.Observacoes;
        clientRow += 1;
      });
      applyExcelBodyStyle(clientSheet, bodyStartRow, clientRow - 1, 12);
      for (let r = bodyStartRow; r <= clientRow - 1; r++) {
        clientSheet.getCell(`I${r}`).numFmt = CURRENCY_FMT;
        clientSheet.getCell(`J${r}`).numFmt = CURRENCY_FMT;
        clientSheet.getCell(`N${r}`).alignment = { wrapText: true };
      }
      clientRow += 1;
    });

    const methodSheet = workbook.addWorksheet('Metodos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    methodSheet.columns = [{ width: 24 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }];
    methodSheet.addTable({
      name: 'MetodosTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium4', showRowStripes: true },
      columns: [
        { name: 'Metodo' },
        { name: 'Vendas' },
        { name: 'Total' },
        { name: 'Pago' },
        { name: 'Pendente' },
        { name: 'Cancelado' },
        { name: 'Participacao' },
      ],
      rows: methodRows.map((item) => [item.Metodo, item.Vendas, item.Total, item.Pago, item.Pendente, item.Cancelado, item.Participacao]),
    });
    decorateExcelTableHeader(methodSheet, 1);
    applyExcelBodyStyle(methodSheet, 2, methodRows.length + 1);
    for (let r = 2; r <= methodRows.length + 1; r++) {
      methodSheet.getCell(`C${r}`).numFmt = CURRENCY_FMT;
      methodSheet.getCell(`D${r}`).numFmt = CURRENCY_FMT;
      methodSheet.getCell(`E${r}`).numFmt = CURRENCY_FMT;
      methodSheet.getCell(`F${r}`).numFmt = CURRENCY_FMT;
      methodSheet.getCell(`G${r}`).numFmt = PERCENT_FMT;
    }

    const productSheet = workbook.addWorksheet('Produtos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    productSheet.columns = [{ width: 32 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 14 }];
    productSheet.addTable({
      name: 'ProdutosTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium6', showRowStripes: true },
      columns: [
        { name: 'Produto' },
        { name: 'Vendas' },
        { name: 'Quantidade' },
        { name: 'Total' },
        { name: 'Ticket Medio' },
        { name: 'Participacao' },
      ],
      rows: productRows.map((item) => [item.Produto, item.Vendas, item.Quantidade, item.Total, item.TicketMedio, item.Participacao]),
    });
    decorateExcelTableHeader(productSheet, 1);
    applyExcelBodyStyle(productSheet, 2, productRows.length + 1);
    for (let r = 2; r <= productRows.length + 1; r++) {
      productSheet.getCell(`D${r}`).numFmt = CURRENCY_FMT;
      productSheet.getCell(`E${r}`).numFmt = CURRENCY_FMT;
      productSheet.getCell(`F${r}`).numFmt = PERCENT_FMT;
    }

    const pendingSheet = workbook.addWorksheet('Pendencias', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    pendingSheet.columns = [{ width: 12 }, { width: 28 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 24 }, { width: 16 }, { width: 18 }, { width: 32 }];
    pendingSheet.addTable({
      name: 'PendenciasTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium10', showRowStripes: true },
      columns: [
        { name: 'Data' },
        { name: 'Cliente' },
        { name: 'Documento' },
        { name: 'Origem' },
        { name: 'Local' },
        { name: 'Produto' },
        { name: 'Valor' },
        { name: 'Metodo' },
        { name: 'Observacoes' },
      ],
      rows: statusRows.pendentes.map((item) => [
        item.data,
        item.cliente,
        item.documentoCliente || '',
        item.origem || '',
        item.estufa,
        item.produto,
        Number(item.valorTotal || 0),
        item.metodoPagamento,
        item.observacoes || '',
      ]),
    });
    decorateExcelTableHeader(pendingSheet, 1);
    applyExcelBodyStyle(pendingSheet, 2, statusRows.pendentes.length + 1);
    for (let r = 2; r <= statusRows.pendentes.length + 1; r++) {
      pendingSheet.getCell(`G${r}`).numFmt = CURRENCY_FMT;
      pendingSheet.getCell(`I${r}`).alignment = { wrapText: true };
    }

    const dailySheet = workbook.addWorksheet('Consolidado Diario', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    dailySheet.columns = [{ width: 14 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
    dailySheet.addTable({
      name: 'ConsolidadoDiarioTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium3', showRowStripes: true },
      columns: [
        { name: 'Data' },
        { name: 'AnoMes' },
        { name: 'Registros' },
        { name: 'Total' },
        { name: 'Pago' },
        { name: 'Pendente' },
        { name: 'Cancelado' },
      ],
      rows: dailyRows.map((item) => [item.Data, item.AnoMes, item.Registros, item.Total, item.Pago, item.Pendente, item.Cancelado]),
    });
    decorateExcelTableHeader(dailySheet, 1);
    applyExcelBodyStyle(dailySheet, 2, dailyRows.length + 1);
    for (let r = 2; r <= dailyRows.length + 1; r++) {
      dailySheet.getCell(`D${r}`).numFmt = CURRENCY_FMT;
      dailySheet.getCell(`E${r}`).numFmt = CURRENCY_FMT;
      dailySheet.getCell(`F${r}`).numFmt = CURRENCY_FMT;
      dailySheet.getCell(`G${r}`).numFmt = CURRENCY_FMT;
    }

    const buildStatusWorkbookSheet = (
      name: string,
      rows: SalesAccountingItem[],
      tableName: string
    ) => {
      const sheet = workbook.addWorksheet(name, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      sheet.columns = [
        { width: 14 }, { width: 12 }, { width: 28 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 18 },
        { width: 28 }, { width: 10 }, { width: 8 }, { width: 16 }, { width: 16 }, { width: 20 }, { width: 32 }
      ];
      sheet.addTable({
        name: tableName,
        ref: 'A1',
        headerRow: true,
        style: { theme: 'TableStyleMedium1', showRowStripes: true },
        columns: [
          { name: 'Codigo' },
          { name: 'Data' },
          { name: 'Cliente' },
          { name: 'Documento' },
          { name: 'Origem' },
          { name: 'Local' },
          { name: 'Lote' },
          { name: 'Produto' },
          { name: 'Qtd' },
          { name: 'Unid' },
          { name: 'Valor' },
          { name: 'Metodo' },
          { name: 'Recebido Por' },
          { name: 'Observacoes' },
        ],
        rows: rows.map((item) => [
          item.codigo,
          item.data,
          item.cliente,
          item.documentoCliente || '',
          item.origem || '',
          item.estufa,
          item.lote || '',
          item.produto,
          Number(item.quantidadeValor || 0),
          item.quantidadeUnidade || '',
          Number(item.valorTotal || 0),
          item.metodoPagamento,
          item.recebidoPor || '',
          item.observacoes || '',
        ]),
      });
      decorateExcelTableHeader(sheet, 1);
      applyExcelBodyStyle(sheet, 2, rows.length + 1);
      for (let r = 2; r <= rows.length + 1; r++) {
        sheet.getCell(`K${r}`).numFmt = CURRENCY_FMT;
        sheet.getCell(`N${r}`).alignment = { wrapText: true };
      }
    };

    buildStatusWorkbookSheet('Recebidos', statusRows.pagos, 'RecebidosTable');
    buildStatusWorkbookSheet('Cancelados', statusRows.cancelados, 'CanceladosTable');
    
    createExcelMetadataSheet(workbook, 'Relatorio Contabil de Vendas', {
      'Empresa': data.empresa,
      'Periodo': data.periodo,
      'Gerado em': reportNowLabel(),
      'Registros': data.itens.length,
      'Total': totalGeral,
    });

    await shareExcelJsWorkbook(workbook, fileName);
  } catch (error) {
    console.error('ExcelJS failed, fallback to Compat', error);
    await exportSalesAccountingExcelCompat(data);
  }
};

export const exportSalesAccountingExcel = async (data: SalesAccountingPdfData) => {
  await exportSalesAccountingExcelStyled(data);
};

export const shareCycleProductionPdf = async (data: CycleProductionReportData) => {
  const totalCaixas = data.itens.reduce((acc, item) => acc + Number(item.totalCaixas || 0), 0);
  const totalPesoCaixas = data.itens.reduce((acc, item) => acc + Number(item.pesoCaixas || 0), 0);
  const totalKiloLivre = data.itens.reduce((acc, item) => acc + Number(item.kiloLivre || 0), 0);
  const totalPeso = data.itens.reduce((acc, item) => acc + Number(item.pesoTotal || 0), 0);
  const totalPlantado = data.itens.reduce((acc, item) => acc + Number(item.totalPlantado || 0), 0);
  const mediaCaixasPorPlantado = totalPlantado > 0 ? totalCaixas / totalPlantado : 0;

  const rows = data.itens
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.ciclo)}</td>
          <td>${escapeHtml(item.lote)}</td>
          <td><span class="status ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td>${escapeHtml(item.inicio)}</td>
          <td>${escapeHtml(item.ultimaColheita)}</td>
          <td class="align-right">${item.totalColheitas}</td>
          <td class="align-right">${fmtNumero(item.totalCaixas)}</td>
          <td class="align-right">${fmtNumero(item.pesoCaixas)} kg</td>
          <td class="align-right">${fmtNumero(item.kiloLivre)} kg</td>
          <td class="align-right">${fmtNumero(item.pesoTotal)} kg</td>
          <td class="align-right">${fmtNumero(item.totalPlantado, 0)}</td>
          <td class="align-right">${fmtNumero(item.caixasPorPlantado)}</td>
        </tr>
      `
    )
    .join('');

  const html = wrapHtmlDocument({
    title: 'Relatorio de caixas e peso por ciclo',
    subtitle: 'Acompanhamento produtivo por plantio',
    company: data.empresa,
    period: data.periodo,
    summaryCards: [
      { label: 'Ciclos', value: String(data.itens.length) },
      { label: 'Caixas', value: fmtNumero(totalCaixas) },
      { label: 'Peso caixas', value: `${fmtNumero(totalPesoCaixas)} kg` },
      { label: 'Peso livre', value: `${fmtNumero(totalKiloLivre)} kg`, tone: 'info' },
      { label: 'Peso total', value: `${fmtNumero(totalPeso)} kg` },
      { label: 'Total plantado', value: fmtNumero(totalPlantado, 0) },
      { label: 'Caixas por pe', value: fmtNumero(mediaCaixasPorPlantado) },
      { label: 'Periodo', value: data.periodo },
    ],
    sections: [
      buildSection(
        'Ciclos',
        `
          <table>
            <thead>
              <tr>
                <th>Ciclo</th>
                <th>Lote</th>
                <th>Status</th>
                <th>Inicio</th>
                <th>Ultima colheita</th>
                <th class="align-right">Colheitas</th>
                <th class="align-right">Caixas</th>
                <th class="align-right">Peso caixas</th>
                <th class="align-right">Peso livre</th>
                <th class="align-right">Peso total</th>
                <th class="align-right">Plantado</th>
                <th class="align-right">Cx/pe</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="12">Sem registros no periodo.</td></tr>'}
            </tbody>
          </table>
        `
      ),
    ],
    footer: 'Relatorio agrupado por ciclos de plantio com foco em caixas, peso total e eficiencia.',
  });

  const fileName = `Relatorio_Caixas_Peso_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
};

export const exportCycleProductionExcel = async (data: CycleProductionReportData) => {
  const fileName = `Relatorio_Caixas_Peso_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.xlsx`;

  if (canUseStyledExcelJs) {
    try {
      const excelJsModule = await import('exceljs');
      const ExcelJS = (excelJsModule as any).default ?? excelJsModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Estufa2';

      const totalCaixas = data.itens.reduce((acc, item) => acc + Number(item.totalCaixas || 0), 0);
      const totalPesoCaixas = data.itens.reduce((acc, item) => acc + Number(item.pesoCaixas || 0), 0);
      const totalKiloLivre = data.itens.reduce((acc, item) => acc + Number(item.kiloLivre || 0), 0);
      const totalPeso = data.itens.reduce((acc, item) => acc + Number(item.pesoTotal || 0), 0);
      const totalPlantado = data.itens.reduce((acc, item) => acc + Number(item.totalPlantado || 0), 0);
      const pesoPorCaixaBase = Number(data.itens[0]?.pesoPorCaixaKg || 22);
      const mediaCaixasPorPlantado = totalPlantado > 0 ? totalCaixas / totalPlantado : 0;

      createExcelCoverPage(
        workbook,
        'Caixas e Peso por Ciclo',
        {
          empresa: data.empresa,
          periodo: data.periodo,
          geradoEm: reportNowLabel(),
        },
        [
          { label: 'Ciclos com Movimento', value: data.itens.length, tone: 'brand' },
          { label: 'Total de Caixas', value: totalCaixas, tone: 'neutral' },
          { label: 'Peso das Caixas', value: totalPesoCaixas, tone: 'success', format: '#,##0.00 "kg"' },
          { label: 'Peso Livre', value: totalKiloLivre, tone: 'warning', format: '#,##0.00 "kg"' },
          { label: 'Peso Total', value: totalPeso, tone: 'success', format: '#,##0.00 "kg"' },
          { label: 'Base por Caixa', value: `${fmtNumero(pesoPorCaixaBase)} kg/cx`, tone: 'neutral' },
        ]
      );

      const cyclesSheet = workbook.addWorksheet('Ciclos', { views: [{ state: 'frozen', ySplit: 1 }] });
      cyclesSheet.columns = [
        { width: 26 }, { width: 18 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 12 },
        { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 44 }
      ];
      cyclesSheet.addTable({
        name: 'CiclosProducaoTable',
        ref: 'A1',
        headerRow: true,
        style: { theme: 'TableStyleMedium6', showRowStripes: true },
        columns: [
          { name: 'Nome do Ciclo' },
          { name: 'Lote' },
          { name: 'Status do Ciclo' },
          { name: 'Inicio do Ciclo' },
          { name: 'Ultima Colheita' },
          { name: 'Qtd. Colheitas' },
          { name: 'Total de Caixas' },
          { name: `Peso das Caixas (${fmtNumero(pesoPorCaixaBase)} kg/cx)` },
          { name: 'Peso Livre em Kg' },
          { name: 'Peso Total em Kg' },
          { name: 'Total Plantado' },
          { name: 'Caixas por Pe' },
          { name: 'Regra de Calculo' },
        ],
        rows: data.itens.map((item) => [
          item.ciclo,
          item.lote,
          item.status,
          item.inicio,
          item.ultimaColheita,
          Number(item.totalColheitas || 0),
          Number(item.totalCaixas || 0),
          Number(item.pesoCaixas || 0),
          Number(item.kiloLivre || 0),
          Number(item.pesoTotal || 0),
          Number(item.totalPlantado || 0),
          Number(item.caixasPorPlantado || 0),
          item.criterioPeso || '',
        ]),
      });
      decorateExcelTableHeader(cyclesSheet, 1);
      applyExcelBodyStyle(cyclesSheet, 2, data.itens.length + 1, 3);
      for (let r = 2; r <= data.itens.length + 1; r++) {
        cyclesSheet.getCell(`H${r}`).numFmt = '#,##0.00 "kg"';
        cyclesSheet.getCell(`I${r}`).numFmt = '#,##0.00 "kg"';
        cyclesSheet.getCell(`J${r}`).numFmt = '#,##0.00 "kg"';
        cyclesSheet.getCell(`M${r}`).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
      }

      const metodologiaSheet = workbook.addWorksheet('Metodologia');
      metodologiaSheet.columns = [{ width: 34 }, { width: 68 }];
      const metodologiaRows = [
        ['Indicador', 'Explicacao'],
        ['Nome do Ciclo', 'Nome da cultura/plantio associado ao movimento de colheita.'],
        ['Peso das Caixas', `Calculado automaticamente usando ${fmtNumero(pesoPorCaixaBase)} kg por caixa.`],
        ['Peso Livre em Kg', 'Considera somente colheitas registradas diretamente em kg.'],
        ['Peso Total em Kg', 'Soma do peso das caixas com o peso livre em kg.'],
        ['Caixas por Pe', 'Relacao entre total de caixas colhidas e total plantado do ciclo.'],
      ];
      metodologiaRows.forEach((row, index) => {
        const line = index + 1;
        metodologiaSheet.getCell(line, 1).value = row[0];
        metodologiaSheet.getCell(line, 2).value = row[1];
        applyExcelFilledCell(metodologiaSheet.getCell(line, 1), {
          fill: index === 0 ? EXCEL_PALETTE.brand : EXCEL_PALETTE.neutralSoft,
          color: index === 0 ? EXCEL_PALETTE.white : EXCEL_PALETTE.neutral,
          bold: true,
        });
        applyExcelFilledCell(metodologiaSheet.getCell(line, 2), {
          fill: index === 0 ? EXCEL_PALETTE.brand : EXCEL_PALETTE.white,
          color: index === 0 ? EXCEL_PALETTE.white : EXCEL_PALETTE.text,
          bold: index === 0,
          alignment: { wrapText: true, vertical: 'middle', horizontal: 'left' },
        });
      });

      createExcelMetadataSheet(workbook, 'Relatorio de Caixas e Peso por Ciclo', {
        Empresa: data.empresa,
        Periodo: data.periodo,
        'Base por caixa (kg)': pesoPorCaixaBase,
        'Gerado em': reportNowLabel(),
      });

      await shareExcelJsWorkbook(workbook, fileName);
      return;
    } catch (error) {
      console.error('ExcelJS Cycle failed, fallback to compat', error);
    }
  }

  const workbook = createWorkbook();

  const totalCaixas = data.itens.reduce((acc, item) => acc + Number(item.totalCaixas || 0), 0);
  const totalPesoCaixas = data.itens.reduce((acc, item) => acc + Number(item.pesoCaixas || 0), 0);
  const totalKiloLivre = data.itens.reduce((acc, item) => acc + Number(item.kiloLivre || 0), 0);
  const totalPeso = data.itens.reduce((acc, item) => acc + Number(item.pesoTotal || 0), 0);
  const totalPlantado = data.itens.reduce((acc, item) => acc + Number(item.totalPlantado || 0), 0);

  appendSheet(
    workbook,
    'Resumo',
    buildSummarySheet([
      ['Empresa', data.empresa],
      ['Periodo', data.periodo],
      ['Ciclos com movimento', data.itens.length],
      ['Total de caixas', totalCaixas],
      ['Peso das caixas (kg)', totalPesoCaixas],
      ['Peso livre (kg)', totalKiloLivre],
      ['Peso total (kg)', totalPeso],
      ['Total plantado', totalPlantado],
      ['Gerado em', reportNowLabel()],
    ])
  );

  const detailRows = data.itens.map((item) => ({
    Ciclo: item.ciclo,
    Lote: item.lote,
    Status: item.status,
    Inicio: item.inicio,
    'Ultima Colheita': item.ultimaColheita,
    Colheitas: Number(item.totalColheitas || 0),
    Caixas: Number(item.totalCaixas || 0),
    'Peso Caixas (kg)': Number(item.pesoCaixas || 0),
    'Peso Livre (kg)': Number(item.kiloLivre || 0),
    'Peso Total (kg)': Number(item.pesoTotal || 0),
    'Total Plantado': Number(item.totalPlantado || 0),
    'Caixas por Pe': Number(item.caixasPorPlantado || 0),
  }));
  const detailSheet = XLSX.utils.json_to_sheet(detailRows, {
    header: [
      'Ciclo',
      'Lote',
      'Status',
      'Inicio',
      'Ultima Colheita',
      'Colheitas',
      'Caixas',
      'Peso Caixas (kg)',
      'Peso Livre (kg)',
      'Peso Total (kg)',
      'Total Plantado',
      'Caixas por Pe',
    ],
  });
  applyColumnWidths(detailSheet, [26, 18, 16, 12, 16, 12, 12, 15, 15, 15, 14, 14]);
  appendSheet(workbook, 'Ciclos', detailSheet);

  appendSheet(
    workbook,
    'Metadados',
    buildMetadataSheet([
      ['Relatorio', 'Caixas e peso por ciclo'],
      ['Empresa', data.empresa],
      ['Periodo', data.periodo],
      ['Gerado em', reportNowLabel()],
    ])
  );

  await shareWorkbook(workbook, fileName);
};

export const shareFinancialOverviewPdf = async (data: FinancialOverviewReportData) => {
  const categoriesRows = data.categorias
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.categoria)}</td>
          <td class="align-right">${fmtMoeda(item.valor)}</td>
          <td class="align-right">${fmtNumero(item.percentual)}%</td>
        </tr>
      `
    )
    .join('');

  const salesRows = data.topVendas
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo || '-')}</td>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.origem || '-')}</td>
          <td>${escapeHtml(item.local || '-')}</td>
          <td>${escapeHtml(item.lote || '-')}</td>
          <td>${escapeHtml(item.produto || '-')}</td>
          <td class="align-right">${escapeHtml(item.quantidade || '-')}</td>
          <td class="align-right">${fmtMoeda(item.precoUnitario || 0)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td><span class="status ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td class="align-right">${fmtMoeda(item.valor)}</td>
        </tr>
      `
    )
    .join('');

  const html = wrapHtmlDocument({
    title: 'Relatorio financeiro mensal',
    subtitle: 'Visao executiva de receitas, despesas e margem',
    company: data.empresa,
    period: data.periodo,
    summaryCards: [
      { label: 'Receita total', value: fmtMoeda(data.receitaTotal), tone: 'success' },
      { label: 'Despesa total', value: fmtMoeda(data.despesaTotal), tone: 'danger' },
      { label: 'Lucro liquido', value: fmtMoeda(data.lucroLiquido), tone: data.lucroLiquido >= 0 ? 'success' : 'danger' },
      { label: 'Margem', value: `${fmtNumero(data.margem)}%`, tone: 'info' },
      { label: 'Vendas no periodo', value: String(data.totalVendas) },
      { label: 'Despesas no periodo', value: String(data.totalDespesas) },
      { label: 'Top categorias', value: String(data.categorias.length) },
      { label: 'Periodo', value: data.periodo },
    ],
    sections: [
      buildSection(
        'Distribuicao de custos',
        `
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th class="align-right">Valor</th>
                <th class="align-right">% da despesa</th>
              </tr>
            </thead>
            <tbody>
              ${categoriesRows || '<tr><td colspan="3">Sem despesas no periodo selecionado.</td></tr>'}
            </tbody>
          </table>
        `
      ),
      buildSection(
        'Principais vendas',
        `
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Origem</th>
                <th>Local</th>
                <th>Lote</th>
                <th>Produto</th>
                <th class="align-right">Quantidade</th>
                <th class="align-right">Vlr unit.</th>
                <th>Metodo</th>
                <th>Status</th>
                <th class="align-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${salesRows || '<tr><td colspan="12">Sem vendas relevantes no periodo.</td></tr>'}
            </tbody>
          </table>
        `
      ),
    ],
    footer: 'Relatorio executivo para acompanhamento mensal de desempenho financeiro.',
  });

  const fileName = `Relatorio_Financeiro_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
};

export const exportFinancialOverviewExcel = async (data: FinancialOverviewReportData) => {
  const fileName = `Relatorio_Financeiro_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.xlsx`;

  if (!canUseStyledExcelJs) {
    const workbook = createWorkbook();

    appendSheet(
      workbook,
      'Resumo Executivo',
      buildSummarySheet([
        ['Empresa', data.empresa],
        ['Periodo', data.periodo],
        ['Receita Total', data.receitaTotal],
        ['Despesa Total', data.despesaTotal],
        ['Lucro Liquido', data.lucroLiquido],
        ['Margem (%)', data.margem],
        ['Total de Vendas', data.totalVendas],
        ['Total de Despesas', data.totalDespesas],
        ['Gerado em', reportNowLabel()],
      ])
    );

    const categoriasSheet = XLSX.utils.json_to_sheet(
      data.categorias.map((item) => ({
        Categoria: item.categoria,
        Valor: Number(item.valor || 0),
        'Participacao (%)': Number(item.percentual || 0),
      })),
      { header: ['Categoria', 'Valor', 'Participacao (%)'] }
    );
    applyColumnWidths(categoriasSheet, [32, 18, 18]);
    appendSheet(workbook, 'Categorias', categoriasSheet);

    const topVendasSheet = XLSX.utils.json_to_sheet(
      data.topVendas.map((item) => ({
        Codigo: item.codigo || '',
        Data: item.data,
        Cliente: item.cliente,
        Origem: item.origem || '',
        Local: item.local || '',
        Lote: item.lote || '',
        Produto: item.produto || '',
        Quantidade: item.quantidade || '',
        'Preco Unitario': Number(item.precoUnitario || 0),
        Metodo: item.metodoPagamento,
        Status: item.status,
        Valor: Number(item.valor || 0),
        Observacoes: item.observacoes || '',
      })),
      {
        header: ['Codigo', 'Data', 'Cliente', 'Origem', 'Local', 'Lote', 'Produto', 'Quantidade', 'Preco Unitario', 'Metodo', 'Status', 'Valor', 'Observacoes'],
      }
    );
    applyColumnWidths(topVendasSheet, [16, 12, 28, 14, 18, 16, 24, 14, 16, 16, 14, 16, 28]);
    appendSheet(workbook, 'Top Vendas', topVendasSheet);

    appendSheet(
      workbook,
      'Metadados',
      buildMetadataSheet([
        ['Relatorio', 'Financeiro mensal'],
        ['Empresa', data.empresa],
        ['Periodo', data.periodo],
        ['Gerado em', reportNowLabel()],
      ])
    );

    await shareWorkbook(workbook, fileName);
    return;
  }

  try {
    const excelJsModule = await import('exceljs');
    const ExcelJS = (excelJsModule as any).default ?? excelJsModule;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Estufa2';

    createExcelCoverPage(workbook, 'Resumo Financeiro Mensal', {
      empresa: data.empresa,
      periodo: data.periodo,
      geradoEm: reportNowLabel(),
    }, [
      { label: 'Receita Total', value: data.receitaTotal, tone: 'success', format: CURRENCY_FMT },
      { label: 'Despesa Total', value: data.despesaTotal, tone: 'danger', format: CURRENCY_FMT },
      { label: 'Lucro Líquido', value: data.lucroLiquido, tone: data.lucroLiquido >= 0 ? 'success' : 'danger', format: CURRENCY_FMT },
      { label: 'Margem (%)', value: data.margem / 100, tone: 'brand', format: PERCENT_FMT },
      { label: 'Vendas no Período', value: data.totalVendas, tone: 'neutral' },
      { label: 'Despesas no Período', value: data.totalDespesas, tone: 'neutral' },
    ]);

    const catSheet = workbook.addWorksheet('Categorias', { views: [{ state: 'frozen', ySplit: 1 }] });
    catSheet.columns = [{ width: 30 }, { width: 18 }, { width: 15 }];
    catSheet.addTable({
      name: 'CategoriasTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium9', showRowStripes: true },
      columns: [{ name: 'Categoria' }, { name: 'Valor' }, { name: 'Participacao' }],
      rows: data.categorias.map(c => [c.categoria, c.valor, c.percentual / 100]),
    });
    decorateExcelTableHeader(catSheet, 1);
    applyExcelBodyStyle(catSheet, 2, data.categorias.length + 1);
    for (let r = 2; r <= data.categorias.length + 1; r++) {
      catSheet.getCell(`B${r}`).numFmt = CURRENCY_FMT;
      catSheet.getCell(`C${r}`).numFmt = PERCENT_FMT;
    }

    const topSheet = workbook.addWorksheet('Top Vendas', { views: [{ state: 'frozen', ySplit: 1 }] });
    topSheet.columns = [
      { width: 14 }, { width: 14 }, { width: 30 }, { width: 22 }, { width: 14 }, { width: 20 }, { width: 18 },
      { width: 22 }, { width: 12 }, { width: 10 }, { width: 16 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 28 }
    ];
    topSheet.addTable({
      name: 'TopVendasTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: [
        { name: 'Codigo da Venda' },
        { name: 'Data da Venda' },
        { name: 'Cliente' },
        { name: 'Ciclo / Cultura' },
        { name: 'Origem' },
        { name: 'Local' },
        { name: 'Lote' },
        { name: 'Produto' },
        { name: 'Qtd.' },
        { name: 'Unid.' },
        { name: 'Preco Unitario' },
        { name: 'Metodo de Pagamento' },
        { name: 'Status' },
        { name: 'Valor Total' },
        { name: 'Recebido Por' },
        { name: 'Observacoes' },
      ],
      rows: data.topVendas.map(v => [
        v.codigo || '',
        v.data,
        v.cliente,
        v.ciclo || v.produto || '',
        v.origem || '',
        v.local || '',
        v.lote || '',
        v.produto || '',
        Number(v.quantidadeValor || 0),
        v.quantidadeUnidade || '',
        Number(v.precoUnitario || 0),
        v.metodoPagamento,
        v.status,
        v.valor,
        v.recebidoPor || '',
        v.observacoes || '',
      ]),
    });
    decorateExcelTableHeader(topSheet, 1);
    applyExcelBodyStyle(topSheet, 2, data.topVendas.length + 1, 13);
    for (let r = 2; r <= data.topVendas.length + 1; r++) {
      topSheet.getCell(`K${r}`).numFmt = CURRENCY_FMT;
      topSheet.getCell(`N${r}`).numFmt = CURRENCY_FMT;
      topSheet.getCell(`P${r}`).alignment = { wrapText: true };
    }

    createExcelMetadataSheet(workbook, 'Relatorio Financeiro Mensal', {
      'Empresa': data.empresa,
      'Periodo': data.periodo,
      'Gerado em': reportNowLabel(),
    });

    await shareExcelJsWorkbook(workbook, fileName);
  } catch (error) {
    console.error('ExcelJS Financial failed', error);
    // basic fallback
    const workbookFallback = createWorkbook();
    appendSheet(workbookFallback, 'Resumo', buildSummarySheet([['Empresa', data.empresa], ['Receita', data.receitaTotal], ['Despesa', data.despesaTotal]]));
    await shareWorkbook(workbookFallback, fileName);
  }
};

export const shareOperationalCyclePdf = async (data: OperationalCycleReportData) => {
  const metricCards = [
    { label: 'Receita total', value: fmtMoeda(data.receitaTotal), tone: 'success' as const },
    { label: 'Custo acumulado', value: fmtMoeda(data.custoAcumulado), tone: 'danger' as const },
    { label: 'Lucro do ciclo', value: fmtMoeda(data.lucro), tone: data.lucro >= 0 ? ('success' as const) : ('danger' as const) },
    { label: 'Duracao', value: `${data.cicloDias} dias`, tone: 'info' as const },
    { label: 'Volume vendido', value: fmtNumero(data.totalVolumeVendido) },
    { label: 'Custo por unidade', value: fmtMoeda(data.custoPorUnidade) },
    { label: 'Produtividade', value: `${fmtNumero(data.produtividadeUnM2)} unid/m2` },
    { label: 'Status', value: data.status },
  ];
  const vendaRows = (data.vendas || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo)}</td>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.produto)}</td>
          <td>${escapeHtml(item.quantidade)}</td>
          <td class="align-right">${fmtMoeda(item.precoUnitario)}</td>
          <td class="align-right">${fmtMoeda(item.valorTotal)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td><span class="status ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
        </tr>
      `
    )
    .join('');

  const html = wrapHtmlDocument({
    title: 'Relatorio operacional do ciclo',
    subtitle: 'Analise de desempenho por plantio',
    company: data.empresa,
    period: data.periodo,
    summaryCards: metricCards,
    sections: [
      buildSection(
        'Identificacao do ciclo',
        `
          <div class="chip-grid">
            <div class="chip"><div class="chip-label">Ciclo</div><div class="chip-value">${escapeHtml(data.ciclo)}</div></div>
            <div class="chip"><div class="chip-label">Lote</div><div class="chip-value">${escapeHtml(data.lote)}</div></div>
            <div class="chip"><div class="chip-label">Estufa</div><div class="chip-value">${escapeHtml(data.estufa)}</div></div>
            <div class="chip"><div class="chip-label">Status</div><div class="chip-value">${escapeHtml(data.status)}</div></div>
            <div class="chip"><div class="chip-label">Inicio</div><div class="chip-value">${escapeHtml(data.inicio)}</div></div>
            <div class="chip"><div class="chip-label">Fim considerado</div><div class="chip-value">${escapeHtml(data.fim)}</div></div>
          </div>
        `
      ),
      buildSection(
        'Leitura executiva',
        `
          <div class="panel">
            O ciclo ${escapeHtml(data.ciclo)} no lote ${escapeHtml(data.lote)} gerou receita de
            <strong> ${escapeHtml(fmtMoeda(data.receitaTotal))}</strong>, com custo acumulado de
            <strong> ${escapeHtml(fmtMoeda(data.custoAcumulado))}</strong> e resultado de
            <strong> ${escapeHtml(fmtMoeda(data.lucro))}</strong>.
            A produtividade observada foi de <strong>${escapeHtml(fmtNumero(data.produtividadeUnM2))} unid/m2</strong>
            ao longo de <strong>${data.cicloDias} dias</strong>.
          </div>
        `
      ),
      buildSection(
        'Vendas do ciclo',
        `
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th class="align-right">Vlr unit.</th>
                <th class="align-right">Valor</th>
                <th>Metodo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${vendaRows || '<tr><td colspan="9">Sem vendas registradas para este ciclo.</td></tr>'}
            </tbody>
          </table>
        `
      ),
    ],
    footer: 'Relatorio operacional gerado a partir do plantio selecionado.',
  });

  const fileName = `Relatorio_Operacional_${sanitizeFilenameSegment(data.ciclo)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
};

export const exportOperationalCycleExcel = async (data: OperationalCycleReportData) => {
  const fileName = `Relatorio_Operacional_${sanitizeFilenameSegment(data.ciclo)}_${reportDateToken()}.xlsx`;

  if (!canUseStyledExcelJs) {
    const workbook = createWorkbook();

    appendSheet(
      workbook,
      'Resumo Executivo',
      buildSummarySheet([
        ['Empresa', data.empresa],
        ['Periodo', data.periodo],
        ['Ciclo', data.ciclo],
        ['Lote', data.lote],
        ['Estufa', data.estufa],
        ['Status', data.status],
        ['Receita Total', data.receitaTotal],
        ['Custo Acumulado', data.custoAcumulado],
        ['Lucro', data.lucro],
        ['Volume Vendido', data.totalVolumeVendido],
        ['Custo por Unidade', data.custoPorUnidade],
        ['Produtividade unid/m2', data.produtividadeUnM2],
        ['Duracao (dias)', data.cicloDias],
        ['Gerado em', reportNowLabel()],
      ])
    );

    const detalhamentoSheet = XLSX.utils.aoa_to_sheet([
      ['Campo', 'Valor'],
      ['Ciclo', data.cicloDescricao || data.ciclo],
      ['Lote', data.lote],
      ['Estufa', data.estufa],
      ['Status', data.status],
      ['Inicio', data.inicio],
      ['Fim considerado', data.fim],
      ['Receita Total', data.receitaTotal],
      ['Custo Acumulado', data.custoAcumulado],
      ['Lucro', data.lucro],
      ['Volume Vendido', data.totalVolumeVendido],
      ['Custo por Unidade', data.custoPorUnidade],
      ['Produtividade unid/m2', data.produtividadeUnM2],
      ['Duracao (dias)', data.cicloDias],
    ]);
    applyColumnWidths(detalhamentoSheet, [24, 28]);
    appendSheet(workbook, 'Detalhamento', detalhamentoSheet);

    const vendasSheet = XLSX.utils.json_to_sheet(
      (data.vendas || []).map((item) => ({
        Codigo: item.codigo,
        Data: item.data,
        Cliente: item.cliente,
        Produto: item.produto,
        Quantidade: Number(item.quantidadeValor || 0),
        Unidade: item.quantidadeUnidade || '',
        'Preco Unitario': Number(item.precoUnitario || 0),
        Valor: Number(item.valorTotal || 0),
        Metodo: item.metodoPagamento,
        Status: item.status,
        'Recebido Por': item.recebidoPor || '',
        Observacoes: item.observacoes || '',
      })),
      {
        header: ['Codigo', 'Data', 'Cliente', 'Produto', 'Quantidade', 'Unidade', 'Preco Unitario', 'Valor', 'Metodo', 'Status', 'Recebido Por', 'Observacoes'],
      }
    );
    applyColumnWidths(vendasSheet, [16, 12, 28, 24, 12, 10, 16, 16, 16, 14, 18, 28]);
    appendSheet(workbook, 'Vendas do Ciclo', vendasSheet);

    appendSheet(
      workbook,
      'Metadados',
      buildMetadataSheet([
        ['Relatorio', 'Operacional do ciclo'],
        ['Empresa', data.empresa],
        ['Ciclo', data.ciclo],
        ['Periodo', data.periodo],
        ['Gerado em', reportNowLabel()],
      ])
    );

    await shareWorkbook(workbook, fileName);
    return;
  }

  try {
    const excelJsModule = await import('exceljs');
    const ExcelJS = (excelJsModule as any).default ?? excelJsModule;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Estufa2';

    createExcelCoverPage(workbook, 'Relatorio Operacional do Ciclo', {
      empresa: data.empresa,
      periodo: data.periodo,
      geradoEm: reportNowLabel(),
    }, [
      { label: 'Receita Total', value: data.receitaTotal, tone: 'success', format: CURRENCY_FMT },
      { label: 'Custo Acumulado', value: data.custoAcumulado, tone: 'danger', format: CURRENCY_FMT },
      { label: 'Lucro do Ciclo', value: data.lucro, tone: data.lucro >= 0 ? 'success' : 'danger', format: CURRENCY_FMT },
      { label: 'Duração', value: `${data.cicloDias} dias`, tone: 'brand' },
      { label: 'Volume Vendido', value: `${fmtNumero(data.totalVolumeVendido)} ${data.unidadeVolume || 'un'}`, tone: 'neutral' },
      { label: 'Produtividade', value: `${data.produtividadeUnM2} unid/m2`, tone: 'neutral' },
    ]);

    const infoSheet = workbook.addWorksheet('Detalhamento', { views: [{ state: 'frozen', xSplit: 1 }] });
    infoSheet.columns = [{ width: 25 }, { width: 40 }];
    const rows = [
      ['Ciclo', data.ciclo],
      ['Lote', data.lote],
      ['Estufa', data.estufa],
      ['Status', data.status],
      ['Início', data.inicio],
      ['Fim considerado', data.fim],
      ['Volume vendido (base)', `${fmtNumero(data.totalVolumeVendido)} ${data.unidadeVolume || 'un'}`],
      ['Custo por unidade', data.custoPorUnidade],
    ];
    rows.forEach(([label, val], idx) => {
      const r = idx + 1;
      infoSheet.getCell(r, 1).value = label;
      infoSheet.getCell(r, 2).value = val;
      applyExcelFilledCell(infoSheet.getCell(r, 1), { fill: EXCEL_PALETTE.neutralSoft, bold: true });
      applyExcelFilledCell(infoSheet.getCell(r, 2), { fill: EXCEL_PALETTE.white });
      if (label === 'Custo por unidade') infoSheet.getCell(r, 2).numFmt = CURRENCY_FMT;
    });

    const salesSheet = workbook.addWorksheet('Vendas do Ciclo', { views: [{ state: 'frozen', ySplit: 1 }] });
    salesSheet.columns = [
      { width: 14 }, { width: 12 }, { width: 28 }, { width: 24 }, { width: 12 }, { width: 10 }, { width: 16 }, { width: 16 }, { width: 20 }, { width: 16 }, { width: 18 }, { width: 32 }
    ];
    salesSheet.addTable({
      name: 'VendasCicloTable',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium7', showRowStripes: true },
      columns: [
        { name: 'Codigo da Venda' },
        { name: 'Data da Venda' },
        { name: 'Cliente' },
        { name: 'Produto' },
        { name: 'Quantidade' },
        { name: 'Unidade' },
        { name: 'Preco Unitario' },
        { name: 'Valor Total' },
        { name: 'Metodo de Pagamento' },
        { name: 'Status' },
        { name: 'Recebido Por' },
        { name: 'Observacoes' },
      ],
      rows: (data.vendas || []).map((item) => [
        item.codigo,
        item.data,
        item.cliente,
        item.produto,
        Number(item.quantidadeValor || 0),
        item.quantidadeUnidade || '',
        Number(item.precoUnitario || 0),
        Number(item.valorTotal || 0),
        item.metodoPagamento,
        item.status,
        item.recebidoPor || '',
        item.observacoes || '',
      ]),
    });
    decorateExcelTableHeader(salesSheet, 1);
    applyExcelBodyStyle(salesSheet, 2, (data.vendas || []).length + 1, 10);
    for (let r = 2; r <= (data.vendas || []).length + 1; r++) {
      salesSheet.getCell(`G${r}`).numFmt = CURRENCY_FMT;
      salesSheet.getCell(`H${r}`).numFmt = CURRENCY_FMT;
      salesSheet.getCell(`L${r}`).alignment = { wrapText: true };
    }

    createExcelMetadataSheet(workbook, 'Relatorio Operacional do Ciclo', {
      'Empresa': data.empresa,
      'Ciclo': data.ciclo,
      'Gerado em': reportNowLabel(),
    });

    await shareExcelJsWorkbook(workbook, fileName);
  } catch (error) {
    console.error('ExcelJS Operational failed', error);
    const workbookFallback = createWorkbook();
    appendSheet(workbookFallback, 'Resumo', buildSummarySheet([['Empresa', data.empresa], ['Ciclo', data.ciclo], ['Lucro', data.lucro]]));
    await shareWorkbook(workbookFallback, fileName);
  }
};
