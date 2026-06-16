import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
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

const injectHtmlTitle = (html: string, title: string) => {
  const safeTitle = escapeHtml(title);
  if (/<title>.*<\/title>/i.test(html)) {
    return html.replace(/<title>.*<\/title>/i, `<title>${safeTitle}</title>`);
  }

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1><title>${safeTitle}</title>`);
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head><title>${safeTitle}</title></head><body>${html}</body></html>`;
};

const printHtmlOnWeb = async (html: string, title: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) {
    throw new Error('Nao foi possivel abrir a janela de impressao no navegador.');
  }

  const fullHtml = injectHtmlTitle(html, title);
  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    const finish = () => printWindow.setTimeout(resolve, 500);
    if (printWindow.document.readyState === 'complete' && printWindow.document.body?.children.length) {
      finish();
      return;
    }

    printWindow.onload = finish;
  });

  printWindow.focus();
  printWindow.print();
  printWindow.onafterprint = () => {
    printWindow.close();
  };
  return true;
};

const applyColumnWidths = (worksheet: XLSX.WorkSheet, widths: number[]) => {
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
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
    if (typeof document !== 'undefined') {
      await printHtmlOnWeb(html, fileName);
      return;
    }

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

const parseQuantidadeFromReportItem = (item: SalesReportItem) => {
  if (typeof item.quantidadeValor === 'number' && Number.isFinite(item.quantidadeValor)) {
    return Number(item.quantidadeValor);
  }

  const raw = String(item.quantidade || '')
    .replace(',', '.')
    .match(/-?\d+(\.\d+)?/);
  return raw ? Number(raw[0]) : 0;
};

const buildBrandedSalesReportHtml = (data: SalesReportPdfData) => {
  const paidItems = data.itens.filter((item) => item.status === 'PAGO');
  const pendingItems = data.itens.filter((item) => item.status === 'PENDENTE');
  const cancelledItems = data.itens.filter((item) => item.status === 'CANCELADO');
  const paidCount = paidItems.length;
  const pendingCount = pendingItems.length;
  const cancelledCount = cancelledItems.length;
  const paidValue = paidItems.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const pendingValue = pendingItems.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const soldBoxes = data.itens.reduce((acc, item) => acc + parseQuantidadeFromReportItem(item), 0);
  const paymentRatio = data.totais.totalVendido > 0 ? paidValue / data.totais.totalVendido : 0;
  const pendingRatio = Math.max(0, 1 - paymentRatio);
  const paymentDegrees = Math.round(paymentRatio * 360);
  const logoSvg = `
    <svg viewBox="0 0 86 86" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="none" stroke="#0f5a2e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M43 8c-15.9 0-28.8 12.9-28.8 28.8V63h57.6V36.8C71.8 20.9 58.9 8 43 8Z"/>
        <path d="M23 20.5h40"/>
        <path d="M43 8v55"/>
        <path d="M14.2 36.8h57.6"/>
        <path d="M24.5 63c0-10.2 8.3-18.5 18.5-18.5S61.5 52.8 61.5 63"/>
      </g>
      <path d="M34.5 55c0-6.7 3.8-12.8 8.5-12.8S51.5 48.3 51.5 55" fill="#2f7d32"/>
      <path d="M16 55.5c3.9-14.1 16.2-22.6 27-22.6-8.2 4.8-12.1 13.6-11.6 26.1-5.7-1.7-10.8-3.5-15.4-3.5Z" fill="#2f7d32"/>
      <path d="M70 55.5c-3.9-14.1-16.2-22.6-27-22.6 8.2 4.8 12.1 13.6 11.6 26.1 5.7-1.7 10.8-3.5 15.4-3.5Z" fill="#0f5a2e"/>
      <path d="M28.6 27.8c0-4.2 2.8-7.7 6.8-9.1-1.1 4.6 1 8.6 4.6 11.5-4.9 1.9-11.4 1.1-11.4-2.4Z" fill="#0f5a2e"/>
    </svg>
  `;
  const detailRows = data.itens
    .map((item) => {
      const pendingAmount = item.status === 'PENDENTE' ? Number(item.valor || 0) : 0;
      const paidAmount = item.status === 'PAGO' ? Number(item.valor || 0) : 0;
      const dueDate = item.status === 'PENDENTE' ? item.observacoes || '-' : item.data;
      const quantityLabel = item.quantidade || '-';

      return `
        <tr>
          <td>${escapeHtml(item.codigo || '-')}</td>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td class="align-center">${escapeHtml(quantityLabel)}</td>
          <td class="align-right">${fmtMoeda(item.valor)}</td>
          <td class="align-right">${fmtMoeda(paidAmount)}</td>
          <td class="align-right pending-text">${pendingAmount > 0 ? fmtMoeda(pendingAmount) : 'R$ 0,00'}</td>
          <td class="align-center ${item.status === 'PAGO' ? 'paid-text' : item.status === 'PENDENTE' ? 'pending-text' : ''}">${escapeHtml(item.status)}</td>
          <td class="align-center">${escapeHtml(dueDate)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td>${escapeHtml(item.recebidoPor || '-')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 landscape; margin: 10mm; }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1b1b1b;
            background: #ffffff;
          }
          .page {
            width: 100%;
            min-height: 100%;
            border: 1px solid #c8d8cc;
            background:
              radial-gradient(circle at 10% 20%, rgba(26, 92, 46, 0.06), transparent 22%),
              radial-gradient(circle at 90% 25%, rgba(26, 92, 46, 0.05), transparent 18%),
              linear-gradient(180deg, #ffffff 0%, #fcfdfc 100%);
            padding: 16px 18px 0;
          }
          .header {
            display: grid;
            grid-template-columns: 330px 1fr 340px;
            gap: 12px;
            align-items: start;
            margin-bottom: 14px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand-icon {
            width: 86px;
            height: 86px;
            flex-shrink: 0;
          }
          .brand-title {
            margin: 0;
            font-size: 31px;
            line-height: 0.9;
            font-weight: 900;
            color: #0f5a2e;
            text-transform: uppercase;
            letter-spacing: -0.8px;
          }
          .brand-subtitle {
            margin: 8px 0 0;
            font-size: 10px;
            line-height: 1.25;
            color: #194128;
            text-transform: uppercase;
          }
          .report-title-wrap {
            text-align: center;
            padding-top: 10px;
          }
          .report-title {
            margin: 0;
            font-size: 31px;
            line-height: 1;
            font-weight: 900;
            color: #0f5a2e;
            text-transform: uppercase;
            letter-spacing: -0.8px;
          }
          .report-subtitle {
            margin: 12px 0 0;
            font-size: 11px;
            font-weight: 800;
            color: #194128;
            text-transform: uppercase;
            letter-spacing: 0.2px;
          }
          .meta-box {
            border: 1px solid #1a5c2e;
            border-radius: 10px;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: inset 0 0 0 1px rgba(15, 90, 46, 0.06);
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 11px;
            padding: 7px 0;
          }
          .meta-label {
            font-weight: 800;
            color: #123923;
          }
          .cards {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 12px;
          }
          .card {
            border: 1px solid #2d6b46;
            border-radius: 8px;
            background: rgba(255,255,255,0.95);
            min-height: 84px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 12px;
            box-shadow: inset 0 0 0 1px rgba(15, 90, 46, 0.04);
          }
          .card-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(180deg, #0f5a2e 0%, #1f7d42 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 19px;
            font-weight: 900;
            flex-shrink: 0;
            border: 1px solid rgba(255,255,255,0.4);
          }
          .card-label {
            font-size: 10px;
            font-weight: 800;
            color: #194128;
            text-transform: uppercase;
            line-height: 1.12;
          }
          .card-value {
            margin-top: 4px;
            font-size: 16px;
            font-weight: 900;
            color: #123923;
          }
          .card-value.danger {
            color: #ff1d14;
          }
          .section {
            border: 1px solid #2d6b46;
            border-radius: 6px;
            overflow: hidden;
            background: rgba(255,255,255,0.97);
            margin-bottom: 10px;
            box-shadow: inset 0 0 0 1px rgba(15, 90, 46, 0.03);
          }
          .section-title {
            display: inline-block;
            background: linear-gradient(180deg, #0f5a2e 0%, #145a31 100%);
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 6px 18px 7px;
            border-bottom-right-radius: 6px;
            min-width: 155px;
            letter-spacing: 0.3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          thead th {
            background: linear-gradient(180deg, #0f5a2e 0%, #145a31 100%);
            color: #fff;
            font-size: 10px;
            font-weight: 800;
            padding: 7px 6px;
            border-right: 1px solid rgba(255,255,255,0.25);
            text-transform: uppercase;
          }
          tbody td {
            padding: 6px 8px;
            font-size: 10px;
            color: #222;
            border-right: 1px solid #dbe5dd;
            border-bottom: 1px solid #dbe5dd;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          tbody tr:last-child td {
            border-bottom: 0;
          }
          thead th:last-child,
          tbody td:last-child {
            border-right: 0;
          }
          .align-right { text-align: right; }
          .align-center { text-align: center; }
          .paid-text { color: #0f7a2f; font-weight: 800; }
          .pending-text { color: #ff1d14; font-weight: 800; }
          .summary-table tbody td,
          .summary-table thead th {
            text-align: center;
          }
          .summary-table .row-label {
            font-weight: 900;
          }
          .bottom-grid {
            display: grid;
            grid-template-columns: 1.1fr 1.35fr;
            gap: 14px;
            margin-bottom: 14px;
          }
          .notes-box,
          .finance-box {
            border: 1px solid #2d6b46;
            border-radius: 8px;
            background: rgba(255,255,255,0.97);
            padding: 10px 14px;
            min-height: 128px;
          }
          .box-title {
            margin: 0 0 8px;
            font-size: 12px;
            font-weight: 900;
            color: #1c1c1c;
            text-transform: uppercase;
          }
          .note-item {
            font-size: 11px;
            line-height: 1.7;
            margin: 8px 0;
          }
          .finance-content {
            display: grid;
            grid-template-columns: 1fr 155px 160px;
            gap: 12px;
            align-items: center;
          }
          .finance-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 11px;
            margin: 10px 0;
          }
          .finance-row strong {
            color: #111;
          }
          .donut {
            width: 106px;
            height: 106px;
            border-radius: 50%;
            margin: 0 auto;
            background: conic-gradient(#2f7d32 0deg ${paymentDegrees}deg, #ff1d14 ${paymentDegrees}deg 360deg);
            position: relative;
          }
          .donut::after {
            content: '';
            position: absolute;
            inset: 26px;
            border-radius: 50%;
            background: #fff;
          }
          .legend-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            margin: 8px 0;
          }
          .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <div class="brand-icon">${logoSvg}</div>
              <div>
                <h1 class="brand-title">ESTUFA<br/>VERDE VIVO</h1>
                <p class="brand-subtitle">PRODUTOS PARA ESTUFAS<br/>E AGRICULTURA PROTEGIDA</p>
              </div>
            </div>
            <div class="report-title-wrap">
              <h2 class="report-title">RELATÓRIO DE VENDAS</h2>
              <div class="report-subtitle">TODAS AS VENDAS (PAGAS E PENDENTES)</div>
            </div>
            <div class="meta-box">
              <div class="meta-row"><span class="meta-label">Período:</span><span>${escapeHtml(data.periodo)}</span></div>
              <div class="meta-row"><span class="meta-label">Data do Relatório:</span><span>${escapeHtml(new Date().toLocaleDateString('pt-BR'))}</span></div>
              <div class="meta-row"><span class="meta-label">Emitido por:</span><span>${escapeHtml(data.nomeEstufa || data.nomeProdutor)}</span></div>
            </div>
          </div>

          <div class="cards">
            <div class="card">
              <div class="card-icon">🛒</div>
              <div><div class="card-label">TOTAL DE VENDAS</div><div class="card-value">${data.itens.length} pedidos</div></div>
            </div>
            <div class="card">
              <div class="card-icon">$</div>
              <div><div class="card-label">VALOR TOTAL DAS VENDAS</div><div class="card-value">${fmtMoeda(data.totais.totalVendido)}</div></div>
            </div>
            <div class="card">
              <div class="card-icon">✓</div>
              <div><div class="card-label">VALOR TOTAL PAGO</div><div class="card-value">${fmtMoeda(paidValue)}</div></div>
            </div>
            <div class="card">
              <div class="card-icon">◔</div>
              <div><div class="card-label">VALOR TOTAL PENDENTE</div><div class="card-value danger">${fmtMoeda(pendingValue)}</div></div>
            </div>
            <div class="card">
              <div class="card-icon">▤</div>
              <div><div class="card-label">QUANTIDADE TOTAL DE CAIXAS VENDIDAS</div><div class="card-value">${fmtNumero(soldBoxes, soldBoxes % 1 === 0 ? 0 : 2)} CX</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">RESUMO GERAL</div>
            <table class="summary-table">
              <thead>
                <tr>
                  <th>STATUS</th>
                  <th>QTDE DE VENDAS</th>
                  <th>QTDE DE CAIXAS</th>
                  <th>VALOR TOTAL</th>
                  <th>VALOR PAGO</th>
                  <th>VALOR PENDENTE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="row-label paid-text">PAGAS</td>
                  <td>${paidCount}</td>
                  <td>${fmtNumero(paidItems.reduce((acc, item) => acc + parseQuantidadeFromReportItem(item), 0), 0)} CX</td>
                  <td>${fmtMoeda(paidValue)}</td>
                  <td>${fmtMoeda(paidValue)}</td>
                  <td>R$ 0,00</td>
                </tr>
                <tr>
                  <td class="row-label pending-text">PENDENTES</td>
                  <td>${pendingCount}</td>
                  <td>${fmtNumero(pendingItems.reduce((acc, item) => acc + parseQuantidadeFromReportItem(item), 0), 0)} CX</td>
                  <td>${fmtMoeda(pendingValue)}</td>
                  <td>R$ 0,00</td>
                  <td class="pending-text">${fmtMoeda(pendingValue)}</td>
                </tr>
                <tr>
                  <td class="row-label">TOTAL</td>
                  <td>${data.itens.length}</td>
                  <td>${fmtNumero(soldBoxes, 0)} CX</td>
                  <td><strong>${fmtMoeda(data.totais.totalVendido)}</strong></td>
                  <td><strong>${fmtMoeda(paidValue)}</strong></td>
                  <td class="pending-text">${fmtMoeda(pendingValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DETALHAMENTO DAS VENDAS</div>
            <table>
              <thead>
                <tr>
                  <th style="width:72px;">Nº VENDA</th>
                  <th style="width:86px;">DATA</th>
                  <th>CLIENTE</th>
                  <th style="width:86px;">QTD. CAIXAS</th>
                  <th style="width:94px;">VALOR TOTAL</th>
                  <th style="width:94px;">VALOR PAGO</th>
                  <th style="width:104px;">VALOR PENDENTE</th>
                  <th style="width:78px;">STATUS</th>
                  <th style="width:84px;">VENCIMENTO</th>
                  <th style="width:112px;">FORMA DE PAGAMENTO</th>
                  <th style="width:110px;">RECEBIDO POR</th>
                </tr>
              </thead>
              <tbody>
                ${detailRows || '<tr><td colspan="11">Sem vendas no período selecionado.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="bottom-grid">
            <div class="notes-box">
              <h3 class="box-title">OBSERVAÇÕES:</h3>
              <div class="note-item">• Valores expressos em Reais (R$).</div>
              <div class="note-item">• Relatório gerado de forma automática pelo sistema.</div>
              ${cancelledCount > 0 ? `<div class="note-item">• ${cancelledCount} venda(s) cancelada(s) não entram no valor pendente.</div>` : ''}
            </div>
            <div class="finance-box">
              <h3 class="box-title">RESUMO FINANCEIRO</h3>
              <div class="finance-content">
                <div>
                  <div class="finance-row"><strong>Valor Total das Vendas:</strong><span>${fmtMoeda(data.totais.totalVendido)}</span></div>
                  <div class="finance-row"><strong>Valor Total Pago:</strong><span>${fmtMoeda(paidValue)}</span></div>
                  <div class="finance-row"><strong>Valor Total Pendente:</strong><span class="pending-text">${fmtMoeda(pendingValue)}</span></div>
                </div>
                <div class="donut"></div>
                <div>
                  <div class="legend-row"><span class="legend-color" style="background:#2f7d32;"></span><span>Pago (${fmtNumero(paymentRatio * 100, 2)}%)</span></div>
                  <div class="legend-row" style="padding-left:20px;">${fmtMoeda(paidValue)}</div>
                  <div class="legend-row"><span class="legend-color" style="background:#ff1d14;"></span><span>Pendente (${fmtNumero(pendingRatio * 100, 2)}%)</span></div>
                  <div class="legend-row" style="padding-left:20px;">${fmtMoeda(pendingValue)}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </body>
    </html>
  `;
};

export const shareSalesReportPdf = async (data: SalesReportPdfData) => {
  const html = buildBrandedSalesReportHtml(data);

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
  const groupedByCliente = data.itens.reduce<Record<string, SalesAccountingItem[]>>((acc, item) => {
    const key = item.cliente || 'Cliente avulso';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const clientSections = Object.entries(groupedByCliente)
    .sort(([clienteA], [clienteB]) => clienteA.localeCompare(clienteB, 'pt-BR'))
    .map(([cliente, items]) => {
      const totalCliente = items.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
      const totalPagoCliente = items
        .filter((item) => normalizeAccountingStatus(item.status) === 'PAGO')
        .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
      const totalPendenteCliente = items
        .filter((item) => normalizeAccountingStatus(item.status) === 'PENDENTE')
        .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);

      return buildSection(
        `Cliente: ${cliente}`,
        `
          <div class="chip-grid">
            <div class="chip"><div class="chip-label">Pedidos</div><div class="chip-value">${items.length}</div></div>
            <div class="chip"><div class="chip-label">Total</div><div class="chip-value">${fmtMoeda(totalCliente)}</div></div>
            <div class="chip"><div class="chip-label">Pago</div><div class="chip-value">${fmtMoeda(totalPagoCliente)}</div></div>
            <div class="chip"><div class="chip-label">Pendente</div><div class="chip-value">${fmtMoeda(totalPendenteCliente)}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Codigo</th>
                <th>Estufa</th>
                <th>Lote</th>
                <th>Produto</th>
                <th class="align-right">Qtd</th>
                <th class="align-right">Total</th>
                <th>Metodo</th>
                <th>Status</th>
                <th>Recebido por</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (v) => `
                    <tr>
                      <td>${escapeHtml(v.data)}</td>
                      <td>${escapeHtml(v.codigo)}</td>
                      <td>${escapeHtml(v.estufa)}</td>
                      <td>${escapeHtml(v.lote)}</td>
                      <td>${escapeHtml(v.produto)}</td>
                      <td class="align-right">${escapeHtml(v.quantidade)}</td>
                      <td class="align-right">${fmtMoeda(v.valorTotal)}</td>
                      <td>${escapeHtml(v.metodoPagamento)}</td>
                      <td><span class="status ${getStatusClass(v.status)}">${escapeHtml(v.status)}</span></td>
                      <td>${escapeHtml(v.recebidoPor || '-')}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        `
      );
    });

  const html = wrapHtmlDocument({
    title: 'Relatorio contabil de vendas',
    subtitle: 'Analise detalhada agrupada por cliente',
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
    sections: clientSections.length > 0 ? clientSections : [buildSection('Clientes', '<div class="panel">Sem registros no periodo selecionado.</div>')],
  });

  const fileName = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${reportDateToken()}.pdf`;
  await sharePdfHtml(html, fileName);
};

export const shareCustomerSalesStatement = async (data: CustomerSalesStatementData) => {
  const paidOrders = data.vendas.filter((v) => normalizeAccountingStatus(v.status) === 'PAGO');
  const pendingOrders = data.vendas.filter((v) => normalizeAccountingStatus(v.status) === 'PENDENTE');
  const totalCaixas = data.vendas.reduce((acc, item) => acc + Number(item.quantidadeValor || 0), 0);
  const paymentRatio = data.totalVendido > 0 ? data.totalPago / data.totalVendido : 0;
  const pendingRatio = Math.max(0, 1 - paymentRatio);
  const paymentDegrees = Math.round(paymentRatio * 360);
  const logoSvg = `
    <svg viewBox="0 0 86 86" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="none" stroke="#0f5a2e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M43 8c-15.9 0-28.8 12.9-28.8 28.8V63h57.6V36.8C71.8 20.9 58.9 8 43 8Z"/>
        <path d="M23 20.5h40"/>
        <path d="M43 8v55"/>
        <path d="M14.2 36.8h57.6"/>
        <path d="M24.5 63c0-10.2 8.3-18.5 18.5-18.5S61.5 52.8 61.5 63"/>
      </g>
      <path d="M34.5 55c0-6.7 3.8-12.8 8.5-12.8S51.5 48.3 51.5 55" fill="#2f7d32"/>
      <path d="M16 55.5c3.9-14.1 16.2-22.6 27-22.6-8.2 4.8-12.1 13.6-11.6 26.1-5.7-1.7-10.8-3.5-15.4-3.5Z" fill="#2f7d32"/>
      <path d="M70 55.5c-3.9-14.1-16.2-22.6-27-22.6 8.2 4.8 12.1 13.6 11.6 26.1 5.7-1.7 10.8-3.5 15.4-3.5Z" fill="#0f5a2e"/>
      <path d="M28.6 27.8c0-4.2 2.8-7.7 6.8-9.1-1.1 4.6 1 8.6 4.6 11.5-4.9 1.9-11.4 1.1-11.4-2.4Z" fill="#0f5a2e"/>
    </svg>
  `;
  const rows = data.vendas
    .map(
      (v) => `
        <tr>
          <td>${escapeHtml(v.data)}</td>
          <td>${escapeHtml(v.codigo || '-')}</td>
          <td>${escapeHtml(v.estufa || '-')}</td>
          <td>${escapeHtml(v.produto || '-')}</td>
          <td class="align-center">${escapeHtml(v.quantidade || '-')}</td>
          <td class="align-right">${fmtMoeda(v.valorTotal)}</td>
          <td class="align-center ${normalizeAccountingStatus(v.status) === 'PAGO' ? 'paid-text' : 'pending-text'}">${escapeHtml(v.status)}</td>
          <td>${escapeHtml(v.metodoPagamento || '-')}</td>
          <td>${escapeHtml(v.recebidoPor || '-')}</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #1b1b1b; background: #ffffff; }
          .page {
            width: 100%;
            min-height: 100%;
            border: 1px solid #c8d8cc;
            background:
              radial-gradient(circle at 10% 20%, rgba(26, 92, 46, 0.06), transparent 22%),
              radial-gradient(circle at 90% 25%, rgba(26, 92, 46, 0.05), transparent 18%),
              linear-gradient(180deg, #ffffff 0%, #fcfdfc 100%);
            padding: 16px 18px 14px;
          }
          .header { display: grid; grid-template-columns: 330px 1fr 340px; gap: 12px; align-items: start; margin-bottom: 14px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand-icon { width: 86px; height: 86px; flex-shrink: 0; }
          .brand-title { margin: 0; font-size: 31px; line-height: 0.9; font-weight: 900; color: #0f5a2e; text-transform: uppercase; letter-spacing: -0.8px; }
          .brand-subtitle { margin: 8px 0 0; font-size: 10px; line-height: 1.25; color: #194128; text-transform: uppercase; }
          .report-title-wrap { text-align: center; padding-top: 10px; }
          .report-title { margin: 0; font-size: 31px; line-height: 1; font-weight: 900; color: #0f5a2e; text-transform: uppercase; letter-spacing: -0.8px; }
          .report-subtitle { margin: 12px 0 0; font-size: 11px; font-weight: 800; color: #194128; text-transform: uppercase; letter-spacing: 0.2px; }
          .meta-box { border: 1px solid #1a5c2e; border-radius: 10px; padding: 10px 14px; background: rgba(255, 255, 255, 0.95); box-shadow: inset 0 0 0 1px rgba(15, 90, 46, 0.06); }
          .meta-row { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; padding: 7px 0; }
          .meta-label { font-weight: 800; color: #123923; }
          .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 12px; }
          .card { border: 1px solid #2d6b46; border-radius: 8px; background: rgba(255,255,255,0.95); min-height: 84px; display: flex; align-items: center; gap: 12px; padding: 12px 12px; box-shadow: inset 0 0 0 1px rgba(15, 90, 46, 0.04); }
          .card-icon { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(180deg, #0f5a2e 0%, #1f7d42 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 900; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.4); }
          .card-label { font-size: 10px; font-weight: 800; color: #194128; text-transform: uppercase; line-height: 1.12; }
          .card-value { margin-top: 4px; font-size: 16px; font-weight: 900; color: #123923; }
          .card-value.danger { color: #ff1d14; }
          .section { border: 1px solid #2d6b46; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.97); margin-bottom: 10px; box-shadow: inset 0 0 0 1px rgba(15, 90, 46, 0.03); }
          .section-title { display: inline-block; background: linear-gradient(180deg, #0f5a2e 0%, #145a31 100%); color: #fff; font-size: 12px; font-weight: 800; text-transform: uppercase; padding: 6px 18px 7px; border-bottom-right-radius: 6px; min-width: 185px; letter-spacing: 0.3px; }
          .summary-table tbody td, .summary-table thead th { text-align: center; }
          .summary-table .row-label { font-weight: 900; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          thead th { background: linear-gradient(180deg, #0f5a2e 0%, #145a31 100%); color: #fff; font-size: 10px; font-weight: 800; padding: 7px 6px; border-right: 1px solid rgba(255,255,255,0.25); text-transform: uppercase; }
          tbody td { padding: 6px 8px; font-size: 10px; color: #222; border-right: 1px solid #dbe5dd; border-bottom: 1px solid #dbe5dd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          tbody tr:last-child td { border-bottom: 0; }
          thead th:last-child, tbody td:last-child { border-right: 0; }
          .align-right { text-align: right; }
          .align-center { text-align: center; }
          .paid-text { color: #0f7a2f; font-weight: 800; }
          .pending-text { color: #ff1d14; font-weight: 800; }
          .bottom-grid { display: grid; grid-template-columns: 1.05fr 1.35fr; gap: 14px; margin-top: 10px; }
          .notes-box, .finance-box { border: 1px solid #2d6b46; border-radius: 8px; background: rgba(255,255,255,0.97); padding: 10px 14px; min-height: 128px; }
          .box-title { margin: 0 0 8px; font-size: 12px; font-weight: 900; color: #1c1c1c; text-transform: uppercase; }
          .note-item { font-size: 11px; line-height: 1.7; margin: 8px 0; }
          .finance-content { display: grid; grid-template-columns: 1fr 155px 150px; gap: 12px; align-items: center; }
          .finance-row { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; margin: 10px 0; }
          .finance-row strong { color: #111; }
          .donut { width: 106px; height: 106px; border-radius: 50%; margin: 0 auto; background: conic-gradient(#2f7d32 0deg ${paymentDegrees}deg, #ff1d14 ${paymentDegrees}deg 360deg); position: relative; }
          .donut::after { content: ''; position: absolute; inset: 26px; border-radius: 50%; background: #fff; }
          .legend-row { display: flex; align-items: center; gap: 8px; font-size: 11px; margin: 8px 0; }
          .legend-color { width: 12px; height: 12px; border-radius: 2px; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <div class="brand-icon">${logoSvg}</div>
              <div>
                <h1 class="brand-title">ESTUFA<br/>VERDE VIVO</h1>
                <p class="brand-subtitle">PRODUTOS PARA ESTUFAS<br/>E AGRICULTURA PROTEGIDA</p>
              </div>
            </div>
            <div class="report-title-wrap">
              <h2 class="report-title">EXTRATO DE COMPRAS</h2>
              <div class="report-subtitle">TODAS AS COMPRAS DO CLIENTE</div>
            </div>
            <div class="meta-box">
              <div class="meta-row"><span class="meta-label">Cliente:</span><span>${escapeHtml(data.clienteNome)}</span></div>
              <div class="meta-row"><span class="meta-label">Período:</span><span>${escapeHtml(data.periodo)}</span></div>
              <div class="meta-row"><span class="meta-label">Emitido por:</span><span>${escapeHtml(data.empresa)}</span></div>
            </div>
          </div>

          <div class="cards">
            <div class="card"><div class="card-icon">🛒</div><div><div class="card-label">TOTAL DE COMPRAS</div><div class="card-value">${data.vendas.length} pedidos</div></div></div>
            <div class="card"><div class="card-icon">$</div><div><div class="card-label">TOTAL COMPRADO</div><div class="card-value">${fmtMoeda(data.totalVendido)}</div></div></div>
            <div class="card"><div class="card-icon">✓</div><div><div class="card-label">TOTAL PAGO</div><div class="card-value">${fmtMoeda(data.totalPago)}</div></div></div>
            <div class="card"><div class="card-icon">◔</div><div><div class="card-label">SALDO PENDENTE</div><div class="card-value danger">${fmtMoeda(data.totalPendente)}</div></div></div>
            <div class="card"><div class="card-icon">▤</div><div><div class="card-label">VOLUME COMPRADO</div><div class="card-value">${fmtNumero(totalCaixas, totalCaixas % 1 === 0 ? 0 : 2)} CX</div></div></div>
          </div>

          <div class="section">
            <div class="section-title">RESUMO GERAL</div>
            <table class="summary-table">
              <thead>
                <tr>
                  <th>STATUS</th>
                  <th>QTDE DE PEDIDOS</th>
                  <th>QTDE DE CAIXAS</th>
                  <th>VALOR TOTAL</th>
                  <th>VALOR PAGO</th>
                  <th>VALOR PENDENTE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="row-label paid-text">PAGAS</td>
                  <td>${paidOrders.length}</td>
                  <td>${fmtNumero(paidOrders.reduce((acc, item) => acc + Number(item.quantidadeValor || 0), 0), 0)} CX</td>
                  <td>${fmtMoeda(data.totalPago)}</td>
                  <td>${fmtMoeda(data.totalPago)}</td>
                  <td>R$ 0,00</td>
                </tr>
                <tr>
                  <td class="row-label pending-text">PENDENTES</td>
                  <td>${pendingOrders.length}</td>
                  <td>${fmtNumero(pendingOrders.reduce((acc, item) => acc + Number(item.quantidadeValor || 0), 0), 0)} CX</td>
                  <td>${fmtMoeda(data.totalPendente)}</td>
                  <td>R$ 0,00</td>
                  <td class="pending-text">${fmtMoeda(data.totalPendente)}</td>
                </tr>
                <tr>
                  <td class="row-label">TOTAL</td>
                  <td>${data.vendas.length}</td>
                  <td>${fmtNumero(totalCaixas, 0)} CX</td>
                  <td><strong>${fmtMoeda(data.totalVendido)}</strong></td>
                  <td><strong>${fmtMoeda(data.totalPago)}</strong></td>
                  <td class="pending-text">${fmtMoeda(data.totalPendente)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DETALHAMENTO DAS COMPRAS</div>
            <table>
              <thead>
                <tr>
                  <th style="width:84px;">DATA</th>
                  <th style="width:84px;">CÓDIGO</th>
                  <th style="width:110px;">LOCAL</th>
                  <th>PRODUTO</th>
                  <th style="width:92px;">QUANTIDADE</th>
                  <th style="width:94px;">VALOR</th>
                  <th style="width:80px;">STATUS</th>
                  <th style="width:110px;">PAGAMENTO</th>
                  <th style="width:110px;">RECEBIDO POR</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="9">Nenhuma compra registrada para este cliente.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="bottom-grid">
            <div class="notes-box">
              <h3 class="box-title">OBSERVAÇÕES:</h3>
              <div class="note-item">• Este extrato reúne todas as compras vinculadas ao cliente selecionado.</div>
              <div class="note-item">• Valores expressos em Reais (R$).</div>
              <div class="note-item">• Documento útil para conferência, cobrança e histórico comercial.</div>
            </div>
            <div class="finance-box">
              <h3 class="box-title">RESUMO FINANCEIRO</h3>
              <div class="finance-content">
                <div>
                  <div class="finance-row"><strong>Total Comprado:</strong><span>${fmtMoeda(data.totalVendido)}</span></div>
                  <div class="finance-row"><strong>Total Pago:</strong><span>${fmtMoeda(data.totalPago)}</span></div>
                  <div class="finance-row"><strong>Saldo Pendente:</strong><span class="pending-text">${fmtMoeda(data.totalPendente)}</span></div>
                  <div class="finance-row"><strong>Pedidos Pagos:</strong><span>${paidOrders.length}</span></div>
                  <div class="finance-row"><strong>Pedidos Pendentes:</strong><span>${pendingOrders.length}</span></div>
                </div>
                <div class="donut"></div>
                <div>
                  <div class="legend-row"><span class="legend-color" style="background:#2f7d32;"></span><span>Pago (${fmtNumero(paymentRatio * 100, 2)}%)</span></div>
                  <div class="legend-row" style="padding-left:20px;">${fmtMoeda(data.totalPago)}</div>
                  <div class="legend-row"><span class="legend-color" style="background:#ff1d14;"></span><span>Pendente (${fmtNumero(pendingRatio * 100, 2)}%)</span></div>
                  <div class="legend-row" style="padding-left:20px;">${fmtMoeda(data.totalPendente)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

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
