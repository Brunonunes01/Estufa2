import XLSX from 'xlsx-js-style';
import type { CellObject, CellStyle, WorkSheet } from 'xlsx-js-style';

import {
  buildSalesAccountingClientSummaries,
  buildSalesAccountingInsights,
  normalizeAccountingStatus,
} from './salesAccountingReportHelpers.ts';

export interface SalesExcelItem {
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
  valorRecebido?: number;
  valorChequeEmMaos?: number;
  metodoPagamento: string;
  formaPagamento?: string | null;
  status: string;
  vencimento?: string;
  dataRecebimento?: string;
  dataCompensacaoCheque?: string;
  statusContabil?: string;
  recebidoPor?: string;
  observacoes?: string;
}

export interface SalesExcelData {
  empresa: string;
  periodo: string;
  itens: SalesExcelItem[];
}

const PALETTE = {
  primary: '245B36',
  primarySoft: 'E6F2E9',
  accent: 'D8A72D',
  accentSoft: 'FFF4D6',
  header: '2F6F44',
  white: 'FFFFFF',
  text: '26332B',
  muted: '66736B',
  border: 'C7D5CC',
  zebra: 'F5F9F6',
  success: '1B5E20',
  successSoft: 'E2F2E4',
  warning: '8A5A00',
  warningSoft: 'FFF0C2',
  danger: 'A12622',
  dangerSoft: 'FBE5E3',
};

const MONEY_FORMAT = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const NUMBER_FORMAT = '#,##0.00';
const PERCENT_FORMAT = '0.0%';
const DATE_FORMAT = 'dd/mm/yyyy';

type SheetCell = CellObject & { s?: CellStyle };

const thinBorder = {
  top: { style: 'thin' as const, color: { rgb: PALETTE.border } },
  bottom: { style: 'thin' as const, color: { rgb: PALETTE.border } },
  left: { style: 'thin' as const, color: { rgb: PALETTE.border } },
  right: { style: 'thin' as const, color: { rgb: PALETTE.border } },
};

const titleStyle: CellStyle = {
  font: {
    name: 'Aptos Display',
    sz: 18,
    bold: true,
    color: { rgb: PALETTE.white },
  },
  fill: { patternType: 'solid', fgColor: { rgb: PALETTE.primary } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const subtitleStyle: CellStyle = {
  font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: PALETTE.primary } },
  fill: { patternType: 'solid', fgColor: { rgb: PALETTE.primarySoft } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const headerStyle: CellStyle = {
  font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: PALETTE.white } },
  fill: { patternType: 'solid', fgColor: { rgb: PALETTE.header } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinBorder,
};

const bodyStyle = (zebra: boolean): CellStyle => ({
  font: { name: 'Aptos', sz: 10, color: { rgb: PALETTE.text } },
  fill: {
    patternType: 'solid',
    fgColor: { rgb: zebra ? PALETTE.zebra : PALETTE.white },
  },
  alignment: { vertical: 'center' },
  border: thinBorder,
});

const totalStyle: CellStyle = {
  font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: PALETTE.primary } },
  fill: { patternType: 'solid', fgColor: { rgb: PALETTE.primarySoft } },
  alignment: { vertical: 'center' },
  border: thinBorder,
};

const setCellStyle = (
  sheet: WorkSheet,
  address: string,
  style: CellStyle,
  numberFormat?: string
) => {
  const cell = sheet[address] as SheetCell | undefined;
  if (!cell) return;
  cell.s = style;
  if (numberFormat) cell.z = numberFormat;
};

const setInternalSheetLink = (
  sheet: WorkSheet,
  address: string,
  targetSheet: string,
  zebra: boolean
) => {
  const cell = sheet[address] as SheetCell | undefined;
  if (!cell || !targetSheet) return;
  cell.l = {
    Target: `#'${targetSheet.replace(/'/g, "''")}'!A1`,
    Tooltip: `Abrir detalhes de ${targetSheet}`,
  };
  cell.s = {
    ...bodyStyle(zebra),
    font: {
      name: 'Aptos',
      sz: 10,
      bold: true,
      underline: true,
      color: { rgb: PALETTE.header },
    },
  };
};

const mergeTitle = (
  sheet: WorkSheet,
  lastColumn: number,
  title: string,
  subtitle: string
) => {
  const lastColumnName = XLSX.utils.encode_col(lastColumn);
  sheet['!merges'] = [
    ...(sheet['!merges'] || []),
    XLSX.utils.decode_range(`A1:${lastColumnName}1`),
    XLSX.utils.decode_range(`A2:${lastColumnName}2`),
  ];
  sheet.A1 = { t: 's', v: title, s: titleStyle } as SheetCell;
  sheet.A2 = { t: 's', v: subtitle, s: subtitleStyle } as SheetCell;
  sheet['!rows'] = [{ hpt: 28 }, { hpt: 20 }];
};

const parseReportDate = (value?: string) => {
  const raw = String(value || '').trim();
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const parsed = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(parsed.getTime()) ? '' : parsed;
  }
  if (!raw || raw === '-') return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed;
};

const normalizeQuantity = (item: SalesExcelItem) => {
  if (
    typeof item.quantidadeValor === 'number' &&
    Number.isFinite(item.quantidadeValor)
  ) {
    return item.quantidadeValor;
  }
  const match = String(item.quantidade || '')
    .replace(',', '.')
    .match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const normalizeUnit = (item: SalesExcelItem) => {
  if (item.quantidadeUnidade) return item.quantidadeUnidade;
  return (
    String(item.quantidade || '')
      .replace(/-?\d+([.,]\d+)?/, '')
      .trim() || 'un'
  );
};

const getFinancialValues = (item: SalesExcelItem) => {
  const status = normalizeAccountingStatus(item.status);
  const agreed = Number(item.valorTotal || 0);
  const received =
    status === 'PAGO' ? Number(item.valorRecebido ?? item.valorTotal ?? 0) : 0;
  const chequeEmMaos =
    status === 'PENDENTE' ? Number(item.valorChequeEmMaos || 0) : 0;
  const pending = status === 'PENDENTE' ? agreed : 0;
  const difference = status === 'PAGO' ? received - agreed : 0;
  return { agreed, received, chequeEmMaos, pending, difference, status };
};

const DETAIL_HEADERS = [
  'Data da venda',
  'Cliente',
  'Documento',
  'Lote',
  'Quantidade',
  'Unidade',
  'Preço unitário',
  'Valor combinado',
  'Valor recebido',
  'Cheque em mãos',
  'Valor pendente',
  'Diferença',
  'Método',
  'Status',
  'Recebido por',
  'Observações',
];

const DETAIL_WIDTHS = [
  14, 28, 18, 18, 12, 11, 16, 17, 17, 17, 17, 15, 16, 13, 20, 36,
];

const toDetailRow = (item: SalesExcelItem) => {
  const values = getFinancialValues(item);
  const displayStatus = item.statusContabil || values.status;
  return [
    parseReportDate(item.data),
    item.cliente,
    item.documentoCliente || '',
    item.lote || '',
    normalizeQuantity(item),
    normalizeUnit(item),
    Number(item.precoUnitario || 0),
    values.agreed,
    values.received,
    values.chequeEmMaos,
    values.pending,
    values.difference,
    item.metodoPagamento,
    displayStatus,
    item.recebidoPor || '',
    item.observacoes || '',
  ];
};

const statusStyle = (status: string): CellStyle => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAGO' || normalized === 'COMPENSADO') {
    return {
      ...bodyStyle(false),
      font: {
        name: 'Aptos',
        sz: 10,
        bold: true,
        color: { rgb: PALETTE.success },
      },
      fill: { patternType: 'solid', fgColor: { rgb: PALETTE.successSoft } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  if (normalized === 'CANCELADO') {
    return {
      ...bodyStyle(false),
      font: {
        name: 'Aptos',
        sz: 10,
        bold: true,
        color: { rgb: PALETTE.danger },
      },
      fill: { patternType: 'solid', fgColor: { rgb: PALETTE.dangerSoft } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  return {
    ...bodyStyle(false),
    font: {
      name: 'Aptos',
      sz: 10,
      bold: true,
      color: { rgb: PALETTE.warning },
    },
    fill: { patternType: 'solid', fgColor: { rgb: PALETTE.warningSoft } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  };
};

const buildDetailSheet = (
  data: SalesExcelData,
  items: SalesExcelItem[],
  title: string
) => {
  const rows = [[], [], [], DETAIL_HEADERS, ...items.map(toDetailRow)];
  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  mergeTitle(
    sheet,
    DETAIL_HEADERS.length - 1,
    title,
    `${data.empresa}  •  ${data.periodo}  •  ${items.length} venda(s)`
  );

  DETAIL_HEADERS.forEach((_, column) => {
    setCellStyle(
      sheet,
      XLSX.utils.encode_cell({ r: 3, c: column }),
      headerStyle
    );
  });

  items.forEach((item, index) => {
    const row = index + 4;
    DETAIL_HEADERS.forEach((_, column) => {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const format =
        column === 0
          ? DATE_FORMAT
          : [6, 7, 8, 9, 10, 11].includes(column)
            ? MONEY_FORMAT
            : [4].includes(column)
              ? NUMBER_FORMAT
              : undefined;
      setCellStyle(sheet, address, bodyStyle(index % 2 === 1), format);
    });
    setCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: 13 }), statusStyle(item.statusContabil || item.status));
  });

  const totals = items.reduce(
    (acc, item) => {
      const values = getFinancialValues(item);
      acc.agreed += values.agreed;
      acc.received += values.received;
      acc.chequeEmMaos += values.chequeEmMaos;
      acc.pending += values.pending;
      acc.difference += values.difference;
      return acc;
    },
    { agreed: 0, received: 0, chequeEmMaos: 0, pending: 0, difference: 0 }
  );
  const totalRow = items.length + 4;
  XLSX.utils.sheet_add_aoa(
    sheet,
    [
      [
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        '',
        totals.agreed,
        totals.received,
        totals.chequeEmMaos,
        totals.pending,
        totals.difference,
      ],
    ],
    { origin: { r: totalRow, c: 0 } }
  );
  DETAIL_HEADERS.forEach((_, column) => {
    setCellStyle(
      sheet,
      XLSX.utils.encode_cell({ r: totalRow, c: column }),
      totalStyle,
      [7, 8, 9, 10, 11].includes(column) ? MONEY_FORMAT : undefined
    );
  });

  sheet['!cols'] = DETAIL_WIDTHS.map((wch) => ({ wch }));
  sheet['!rows'] = [
    { hpt: 28 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 32 },
    ...items.map(() => ({ hpt: 22 })),
    { hpt: 24 },
  ];
  sheet['!autofilter'] = {
    ref: `A4:${XLSX.utils.encode_col(DETAIL_HEADERS.length - 1)}${Math.max(items.length + 4, 4)}`,
  };
  return sheet;
};

const safeSheetName = (name: string, usedNames: Set<string>) => {
  const base =
    String(name || 'Cliente')
      .replace(/[\\/?*:]/g, ' ')
      .replace(/\[|\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Cliente';
  let candidate = `Cliente - ${base}`.slice(0, 31);
  let suffix = 2;
  while (usedNames.has(candidate.toLocaleLowerCase('pt-BR'))) {
    const tag = ` (${suffix})`;
    candidate = `${`Cliente - ${base}`.slice(0, 31 - tag.length)}${tag}`;
    suffix += 1;
  }
  usedNames.add(candidate.toLocaleLowerCase('pt-BR'));
  return candidate;
};

const buildSummarySheet = (
  data: SalesExcelData,
  clientSheetNames: Map<string, string>
) => {
  const insights = buildSalesAccountingInsights(data);
  const clientSummaries = buildSalesAccountingClientSummaries(data.itens);
  const summaryRows: any[][] = [
    [],
    [],
    [],
    ['INDICADOR', 'VALOR', '', 'INDICADOR', 'VALOR', ''],
    [
      'Total vendido',
      insights.totalGeral,
      '',
      'Total recebido',
      insights.totalPago,
      '',
    ],
    [
      'Total pendente',
      insights.totalPendente,
      '',
      'Total cancelado',
      insights.totalCancelado,
      '',
    ],
    [
      'Ticket médio',
      insights.ticketMedio,
      '',
      'Cobertura de recebimento',
      insights.recebimentoPercentual,
      '',
    ],
    ['Clientes', insights.totalClientes, '', 'Vendas', data.itens.length, ''],
    [
      'Diferença nos recebimentos',
      insights.ajusteRecebimentos,
      '',
      'Cheque em mãos',
      insights.totalChequeEmMaos,
      '',
    ],
    [],
    ['CLIENTE', 'VENDAS', 'VENDIDO', 'RECEBIDO', 'PENDENTE', 'ABA DE DETALHES'],
    ...clientSummaries.map((client) => [
      client.cliente,
      client.registros,
      client.totalVendido,
      client.totalRecebido,
      client.totalPendente,
      clientSheetNames.get(client.cliente) || '',
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(summaryRows);
  mergeTitle(
    sheet,
    5,
    'RELATÓRIO GERENCIAL DE VENDAS',
    `${data.empresa}  •  ${data.periodo}  •  Gerado em ${new Date().toLocaleString('pt-BR')}`
  );

  [0, 1, 3, 4].forEach((column) =>
    setCellStyle(
      sheet,
      XLSX.utils.encode_cell({ r: 3, c: column }),
      headerStyle
    )
  );
  for (let row = 4; row <= 8; row += 1) {
    [0, 3].forEach((column) => {
      const style: CellStyle = {
        ...bodyStyle(false),
        font: {
          name: 'Aptos',
          sz: 10,
          bold: true,
          color: { rgb: PALETTE.primary },
        },
        fill: { patternType: 'solid', fgColor: { rgb: PALETTE.primarySoft } },
      };
      setCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), style);
    });
    [1, 4].forEach((column) => {
      const isPercentage = row === 6 && column === 4;
      const isCount = row === 7;
      setCellStyle(
        sheet,
        XLSX.utils.encode_cell({ r: row, c: column }),
        totalStyle,
        isPercentage ? PERCENT_FORMAT : isCount ? '#,##0' : MONEY_FORMAT
      );
    });
  }

  for (let column = 0; column <= 5; column += 1) {
    setCellStyle(
      sheet,
      XLSX.utils.encode_cell({ r: 10, c: column }),
      headerStyle
    );
  }
  clientSummaries.forEach((_, index) => {
    const row = index + 11;
    for (let column = 0; column <= 5; column += 1) {
      setCellStyle(
        sheet,
        XLSX.utils.encode_cell({ r: row, c: column }),
        bodyStyle(index % 2 === 1),
        [2, 3, 4].includes(column) ? MONEY_FORMAT : undefined
      );
    }
    const targetSheet =
      clientSheetNames.get(clientSummaries[index].cliente) || '';
    setInternalSheetLink(
      sheet,
      XLSX.utils.encode_cell({ r: row, c: 5 }),
      targetSheet,
      index % 2 === 1
    );
  });
  sheet['!cols'] = [28, 12, 17, 17, 17, 28].map((wch) => ({ wch }));
  sheet['!autofilter'] = {
    ref: `A11:F${Math.max(clientSummaries.length + 11, 11)}`,
  };
  return sheet;
};

const buildClientSummarySheet = (
  data: SalesExcelData,
  clientSheetNames: Map<string, string>
) => {
  const insights = buildSalesAccountingInsights(data);
  const clients = buildSalesAccountingClientSummaries(data.itens);
  const headers = [
    'Cliente',
    'Quantidade de vendas',
    'Canceladas',
    'Total vendido',
    'Total recebido',
    'Total pendente',
    'Diferença',
    'Participação',
    'Aba de detalhes',
  ];
  const rows = [
    [],
    [],
    [],
    headers,
    ...clients.map((client) => [
      client.cliente,
      client.registros,
      client.cancelados,
      client.totalVendido,
      client.totalRecebido,
      client.totalPendente,
      client.ajusteRecebimentos,
      insights.totalGeral > 0 ? client.totalVendido / insights.totalGeral : 0,
      clientSheetNames.get(client.cliente) || '',
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  mergeTitle(
    sheet,
    headers.length - 1,
    'VENDAS POR CLIENTE',
    `${data.empresa}  •  Comparativo de faturamento e recebimentos`
  );
  headers.forEach((_, column) => {
    setCellStyle(
      sheet,
      XLSX.utils.encode_cell({ r: 3, c: column }),
      headerStyle
    );
  });
  clients.forEach((client, index) => {
    const row = index + 4;
    headers.forEach((_, column) => {
      setCellStyle(
        sheet,
        XLSX.utils.encode_cell({ r: row, c: column }),
        bodyStyle(index % 2 === 1),
        [3, 4, 5, 6].includes(column)
          ? MONEY_FORMAT
          : column === 7
            ? PERCENT_FORMAT
            : undefined
      );
    });
    if (client.totalPendente > 0) {
      setCellStyle(
        sheet,
        XLSX.utils.encode_cell({ r: row, c: 5 }),
        {
          ...bodyStyle(false),
          font: {
            name: 'Aptos',
            sz: 10,
            bold: true,
            color: { rgb: PALETTE.warning },
          },
          fill: { patternType: 'solid', fgColor: { rgb: PALETTE.warningSoft } },
        },
        MONEY_FORMAT
      );
    }
    const targetSheet = clientSheetNames.get(client.cliente) || '';
    setInternalSheetLink(
      sheet,
      XLSX.utils.encode_cell({ r: row, c: 8 }),
      targetSheet,
      index % 2 === 1
    );
  });
  sheet['!cols'] = [30, 18, 13, 17, 17, 17, 15, 15, 28].map((wch) => ({ wch }));
  sheet['!autofilter'] = { ref: `A4:I${Math.max(clients.length + 4, 4)}` };
  return sheet;
};

export const buildSalesAccountingWorkbook = (data: SalesExcelData) => {
  const workbook = XLSX.utils.book_new();
  const grouped = data.itens.reduce<Map<string, SalesExcelItem[]>>(
    (map, item) => {
      const client =
        String(item.cliente || 'Cliente avulso').trim() || 'Cliente avulso';
      const current = map.get(client) || [];
      current.push(item);
      map.set(client, current);
      return map;
    },
    new Map()
  );
  const sortedClients = [...grouped.entries()].sort(([a], [b]) =>
    a.localeCompare(b, 'pt-BR')
  );
  const usedNames = new Set([
    'resumo executivo',
    'todas as vendas',
    'resumo por cliente',
  ]);
  const clientSheetNames = new Map<string, string>();
  sortedClients.forEach(([client]) => {
    clientSheetNames.set(client, safeSheetName(client, usedNames));
  });

  XLSX.utils.book_append_sheet(
    workbook,
    buildSummarySheet(data, clientSheetNames),
    'Resumo Executivo'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildDetailSheet(data, data.itens, 'TODAS AS VENDAS'),
    'Todas as Vendas'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildClientSummarySheet(data, clientSheetNames),
    'Resumo por Cliente'
  );
  sortedClients.forEach(([client, items]) => {
    XLSX.utils.book_append_sheet(
      workbook,
      buildDetailSheet(
        data,
        items,
        `VENDAS — ${client.toLocaleUpperCase('pt-BR')}`
      ),
      clientSheetNames.get(client)
    );
  });
  workbook.Props = {
    Title: `Relatório gerencial de vendas - ${data.empresa}`,
    Subject: data.periodo,
    Author: data.empresa,
    Company: data.empresa,
    CreatedDate: new Date(),
  };
  return workbook;
};

export { XLSX as SalesWorkbookXLSX };
