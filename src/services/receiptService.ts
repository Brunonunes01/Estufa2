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

export interface CustomerSalesStatementData {
  clienteNome: string;
  empresa: string;
  periodo: string;
  vendas: SalesAccountingItem[];
  totalVendido: number;
  totalPago: number;
  totalPendente: number;
}

const SHARE_LOCK_KEY = '__sge_pdf_share_lock__';
const isShareLocked = () => Boolean((globalThis as any)[SHARE_LOCK_KEY]);
const setShareLocked = (value: boolean) => {
  (globalThis as any)[SHARE_LOCK_KEY] = value;
};

const reportNowLabel = () => new Date().toLocaleString('pt-BR');
const reportDateToken = () => new Date().toISOString().slice(0, 10);

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
            padding: 40px;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: #fff;
            color: #1a1a1a;
            line-height: 1.5;
          }
          .document {
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 30px;
            border-bottom: 2px solid #f0f0f0;
            margin-bottom: 30px;
          }
          .brand-box h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: #111;
            letter-spacing: -0.5px;
          }
          .brand-box p {
            margin: 4px 0 0;
            font-size: 14px;
            color: #666;
            font-weight: 500;
          }
          .meta-box {
            text-align: right;
          }
          .report-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: ${COLORS.primary};
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .meta-text {
            font-size: 11px;
            color: #888;
            margin: 2px 0;
          }
          .period-strip {
            background: #f8f9fa;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 13px;
            color: #444;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
          }
          .period-strip strong { margin-right: 8px; color: #111; }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 40px;
          }
          .summary-card {
            padding: 16px;
            border: 1px solid #eee;
            border-radius: 10px;
            background: #fff;
          }
          .summary-label {
            font-size: 10px;
            font-weight: 700;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .summary-value {
            font-size: 18px;
            font-weight: 800;
            color: #111;
          }
          .summary-value.success { color: #2e7d32; }
          .summary-value.danger { color: #d32f2f; }
          .summary-value.info { color: #0288d1; }

          .section { margin-bottom: 35px; }
          .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #111;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section-line {
            flex: 1;
            height: 1px;
            background: #eee;
            margin-left: 15px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            text-align: left;
            padding: 12px 10px;
            background: #fcfcfc;
            color: #666;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 2px solid #eee;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #f0f0f0;
            color: #333;
          }
          tr:nth-child(even) { background: #fafafa; }
          
          .align-right { text-align: right; }
          .status {
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .status-paid { background: #e8f5e9; color: #2e7d32; }
          .status-open { background: #fff3e0; color: #ef6c00; }
          .status-cancelled { background: #f5f5f5; color: #757575; }

          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 10px;
            color: #aaa;
          }
        </style>
      </head>
      <body>
        <div class="document">
          <header class="header">
            <div class="brand-box">
              <p class="report-title">${escapeHtml(input.title)}</p>
              <h1>${escapeHtml(input.company)}</h1>
              <p>${escapeHtml(input.subtitle)}</p>
            </div>
            <div class="meta-box">
              <p class="meta-text"><strong>Data de emissão:</strong> ${escapeHtml(reportNowLabel())}</p>
              <p class="meta-text">SGE - Intelligence Platform</p>
            </div>
          </header>

          <div class="period-strip">
            <strong>Período de Referência:</strong> ${escapeHtml(input.period)}
          </div>

          <main>
            <div class="summary-grid">${summaryCardsHtml}</div>
            ${input.sections.join('')}
          </main>

          <footer class="footer">
            ${escapeHtml(input.footer || 'Este documento é um relatório oficial gerado pelo Sistema de Gestão de Estufas (SGE).')}
          </footer>
        </div>
      </body>
    </html>
  `;
};

const buildSection = (title: string, content: string) => `
  <section class="section">
    <div class="section-header">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="section-line"></div>
    </div>
    ${content}
  </section>
`;

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

const createWorkbook = () => XLSX.utils.book_new();

const appendSheet = (workbook: XLSX.WorkBook, name: string, sheet: XLSX.WorkSheet) => {
  XLSX.utils.book_append_sheet(workbook, sheet, name);
};

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
              ${rows || '<tr><td colspan="14">Sem registros no periodo selecionado.</td></tr>'}
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

  await shareSalesReportPdf({
    nomeProdutor,
    nomeEstufa,
    tituloRelatorio: 'Comprovante de venda',
    periodo: dataVendaLabel,
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
  const { totalGeral, totalPago, totalPendente, totalCancelado, ticketMedio, recorteLabel } =
    buildSalesAccountingInsights(data);

  const html = wrapHtmlDocument({
    title: 'Relatorio contabil de vendas',
    subtitle: 'Analise detalhada de recebimentos e pendencias',
    company: data.empresa,
    period: data.periodo,
    summaryCards: [
      { label: 'Total geral', value: fmtMoeda(totalGeral) },
      { label: 'Total recebido', value: fmtMoeda(totalPago), tone: 'success' },
      { label: 'Total pendente', value: fmtMoeda(totalPendente), tone: 'danger' },
      { label: 'Total cancelado', value: fmtMoeda(totalCancelado), tone: 'neutral' },
      { label: 'Ticket medio', value: fmtMoeda(ticketMedio) },
      { label: 'Registros', value: String(data.itens.length) },
      { label: 'Recorte', value: recorteLabel },
      { label: 'Periodo', value: data.periodo },
    ],
    sections: [
      buildSection(
        'Vendas detalhadas',
        `
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Codigo</th>
                <th>Cliente</th>
                <th>Origem</th>
                <th>Local</th>
                <th>Lote</th>
                <th>Produto</th>
                <th class="align-right">Qtd</th>
                <th class="align-right">Total</th>
                <th>Metodo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.itens
                .map(
                  (v) => `
                <tr>
                  <td>${escapeHtml(v.data)}</td>
                  <td>${escapeHtml(v.codigo)}</td>
                  <td>${escapeHtml(v.cliente)}</td>
                  <td>${escapeHtml(v.origem)}</td>
                  <td>${escapeHtml(v.estufa)}</td>
                  <td>${escapeHtml(v.lote)}</td>
                  <td>${escapeHtml(v.produto)}</td>
                  <td class="align-right">${escapeHtml(v.quantidade)}</td>
                  <td class="align-right">${fmtMoeda(v.valorTotal)}</td>
                  <td>${escapeHtml(v.metodoPagamento)}</td>
                  <td><span class="status ${getStatusClass(v.status)}">${escapeHtml(v.status)}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      ),
    ],
  });

  const fileName = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
};

export const shareCustomerSalesStatement = async (data: CustomerSalesStatementData) => {
  const rows = data.vendas
    .map(
      (v) => `
      <tr>
        <td>${escapeHtml(v.data)}</td>
        <td>${escapeHtml(v.produto)}</td>
        <td class="align-right">${escapeHtml(v.quantidade)}</td>
        <td class="align-right">${fmtMoeda(v.valorTotal)}</td>
        <td><span class="status ${getStatusClass(v.status)}">${escapeHtml(v.status)}</span></td>
      </tr>
    `
    )
    .join('');

  const html = wrapHtmlDocument({
    title: 'Extrato de Vendas por Cliente',
    subtitle: `Cliente: ${data.clienteNome}`,
    company: data.empresa,
    period: data.periodo,
    summaryCards: [
      { label: 'Total Comprado', value: fmtMoeda(data.totalVendido) },
      { label: 'Total Pago', value: fmtMoeda(data.totalPago), tone: 'success' },
      { label: 'Saldo Devedor', value: fmtMoeda(data.totalPendente), tone: 'danger' },
      { label: 'Qtd. Pedidos', value: String(data.vendas.length) },
    ],
    sections: [
      buildSection(
        'Historico de Lancamentos',
        `
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th class="align-right">Qtd</th>
                <th class="align-right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5">Nenhuma venda registrada para este cliente.</td></tr>'}
            </tbody>
          </table>
        `
      ),
    ],
    footer: 'Este documento e um extrato de conferencia simples para acerto de contas.',
  });

  const fileName = `Extrato_Vendas_${sanitizeFilenameSegment(data.clienteNome)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
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
                <th>Peso caixas</th>
                <th>Peso livre</th>
                <th>Peso total</th>
                <th>Plantado</th>
                <th>Cx/pe</th>
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

export const exportSalesAccountingExcelCompat = async (data: SalesAccountingPdfData) => {
  const fileName = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.xlsx`;
  const workbook = createWorkbook();

  const {
    totalGeral,
    totalPago,
    totalPendente,
    totalCancelado,
    quantidadePendentes,
    ticketMedio,
    recebimentoPercentual,
    maiorLancamento,
    recorteLabel,
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
  appendSheet(workbook, 'Resumo Executivo', resumoSheet);

  const detailRows = [
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
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  appendSheet(workbook, 'Lancamentos', detailSheet);

  await shareWorkbook(workbook, fileName);
};

export const exportSalesAccountingExcel = async (data: SalesAccountingPdfData) => {
  await exportSalesAccountingExcelCompat(data);
};

export const exportSalesAccountingExcelStyled = async (data: SalesAccountingPdfData) => {
  await exportSalesAccountingExcelCompat(data);
};

export const exportCycleProductionExcel = async (data: CycleProductionReportData) => {
  const fileName = `Relatorio_Caixas_Peso_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.xlsx`;
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
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  appendSheet(workbook, 'Ciclos', detailSheet);

  await shareWorkbook(workbook, fileName);
};

export const exportFinancialOverviewExcel = async (data: FinancialOverviewReportData) => {
  const fileName = `Relatorio_Financeiro_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.xlsx`;
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
    }))
  );
  appendSheet(workbook, 'Categorias', categoriasSheet);

  const topVendasSheet = XLSX.utils.json_to_sheet(
    data.topVendas.map((item) => ({
      Codigo: item.codigo || '',
      Data: item.data,
      Cliente: item.cliente,
      Produto: item.produto || '',
      Quantidade: item.quantidade || '',
      'Preco Unitario': Number(item.precoUnitario || 0),
      Metodo: item.metodoPagamento,
      Status: item.status,
      Valor: Number(item.valor || 0),
    }))
  );
  appendSheet(workbook, 'Top Vendas', topVendasSheet);

  await shareWorkbook(workbook, fileName);
};

export const exportOperationalCycleExcel = async (data: OperationalCycleReportData) => {
  const fileName = `Relatorio_Operacional_${sanitizeFilenameSegment(data.ciclo)}_${reportDateToken()}.xlsx`;
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

  const vendasSheet = XLSX.utils.json_to_sheet(
    (data.vendas || []).map((item) => ({
      Codigo: item.codigo,
      Data: item.data,
      Cliente: item.cliente,
      Produto: item.produto,
      Quantidade: Number(item.quantidadeValor || 0),
      'Preco Unitario': Number(item.precoUnitario || 0),
      Valor: Number(item.valorTotal || 0),
      Metodo: item.metodoPagamento,
      Status: item.status,
    }))
  );
  appendSheet(workbook, 'Vendas do Ciclo', vendasSheet);

  await shareWorkbook(workbook, fileName);
};
