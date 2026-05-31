import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { Venda } from '../types/domain';
import { COLORS } from '../constants/theme';

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
  estufa: string;
  metodoPagamento: string;
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
  valor: number;
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
  estufa: string;
  lote?: string;
  produto: string;
  quantidade: string;
  precoUnitario: number;
  valorTotal: number;
  metodoPagamento: string;
  status: string;
  vencimento?: string;
  recebidoPor?: string;
}

export interface SalesAccountingPdfData {
  empresa: string;
  periodo: string;
  itens: SalesAccountingItem[];
}

const SHARE_LOCK_KEY = '__sge_pdf_share_lock__';
const isShareLocked = () => Boolean((globalThis as any)[SHARE_LOCK_KEY]);
const setShareLocked = (value: boolean) => {
  (globalThis as any)[SHARE_LOCK_KEY] = value;
};

const sanitizeFilenameSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'arquivo';

const fmtMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
    .replace(/\"/g, '&quot;')
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

export const shareSalesReportPdf = async (data: SalesReportPdfData) => {
  if (isShareLocked()) return;
  setShareLocked(true);
  const geradoEm = new Date().toLocaleString('pt-BR');

  const linhasDetalhes = data.itens
    .map((item) => {
      const statusClass =
        item.status === 'PAGO'
          ? 'status-paid'
          : item.status === 'CANCELADO'
          ? 'status-cancelled'
          : 'status-open';
      return `
        <tr>
          <td>${escapeHtml(item.codigo || '-')}</td>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.estufa)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td>
            <span class="status ${statusClass}">${item.status}</span>
          </td>
          <td class="align-right">${fmtMoeda(item.valor)}</td>
        </tr>
      `;
    })
    .join('');

  const linhasObservacoes = data.itens
    .filter((item) => Boolean(item.observacoes && item.observacoes.trim()))
    .slice(0, 8)
    .map(
      (item) => `<li><strong>${escapeHtml(item.cliente)}:</strong> ${escapeHtml(item.observacoes)}</li>`
    )
    .join('');

  const observacoesHtml =
    data.observacoes || linhasObservacoes
      ? `
      <section class="section">
        <h2>Seção 3 - Observações</h2>
        ${
          data.observacoes
            ? `<p class="paragraph">${escapeHtml(data.observacoes)}</p>`
            : `<ul class="notes-list">${linhasObservacoes}</ul>`
        }
      </section>
    `
      : '';

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: ${COLORS.background};
            color: ${COLORS.textPrimary};
            padding: 22px;
          }
          .document {
            background: ${COLORS.surface};
            border: 1px solid ${COLORS.border};
            border-radius: 14px;
            overflow: hidden;
          }
          .header {
            background: ${COLORS.secondary};
            color: ${COLORS.textLight};
            padding: 20px 22px;
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 14px;
          }
          .brand {
            font-size: 20px;
            font-weight: 800;
            margin: 0;
          }
          .report-title {
            font-size: 15px;
            font-weight: 700;
            opacity: 0.92;
            margin-top: 4px;
          }
          .header-meta {
            text-align: right;
            font-size: 11px;
            opacity: 0.9;
            line-height: 1.5;
          }
          .header-period {
            margin-top: 12px;
            background: ${COLORS.whiteAlpha10};
            border: 1px solid ${COLORS.whiteAlpha20};
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 12px;
          }
          .content { padding: 18px 22px 22px; }
          .section { margin-top: 16px; }
          .section h2 {
            margin: 0 0 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: ${COLORS.secondary};
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          .summary-card {
            border: 1px solid ${COLORS.border};
            border-radius: 10px;
            background: ${COLORS.surfaceMuted};
            padding: 10px;
          }
          .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            color: ${COLORS.textSecondary};
            margin-bottom: 6px;
            font-weight: 700;
            letter-spacing: 0.3px;
          }
          .summary-value {
            font-size: 18px;
            font-weight: 800;
            color: ${COLORS.textPrimary};
          }
          .summary-value.success { color: ${COLORS.success}; }
          .summary-value.danger { color: ${COLORS.danger}; }
          .summary-value.info { color: ${COLORS.info}; }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid ${COLORS.border};
            border-radius: 10px;
            overflow: hidden;
          }
          thead { background: ${COLORS.surfaceMuted}; }
          th {
            text-align: left;
            padding: 9px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.35px;
            color: ${COLORS.textSecondary};
            border-bottom: 1px solid ${COLORS.border};
          }
          td {
            padding: 9px;
            border-bottom: 1px solid ${COLORS.divider};
            font-size: 11px;
            color: ${COLORS.textPrimary};
          }
          tbody tr:nth-child(even) { background: ${COLORS.surfaceMuted}; }
          .align-right { text-align: right; font-weight: 700; }
          .status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.2px;
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
          .paragraph {
            margin: 0;
            padding: 12px;
            border: 1px solid ${COLORS.border};
            border-radius: 10px;
            background: ${COLORS.surfaceMuted};
            font-size: 12px;
            line-height: 1.55;
          }
          .notes-list {
            margin: 0;
            padding: 12px 14px 12px 28px;
            border: 1px solid ${COLORS.border};
            border-radius: 10px;
            background: ${COLORS.surfaceMuted};
          }
          .notes-list li {
            margin-bottom: 7px;
            font-size: 11px;
            line-height: 1.4;
          }
          .footer {
            margin-top: 18px;
            padding-top: 10px;
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
                <p class="brand">${escapeHtml(data.nomeEstufa || data.nomeProdutor)}</p>
                <p class="report-title">${escapeHtml(data.tituloRelatorio)}</p>
              </div>
              <div class="header-meta">
                <div><strong>Data de geração:</strong> ${escapeHtml(geradoEm)}</div>
                <div><strong>Produtor:</strong> ${escapeHtml(data.nomeProdutor)}</div>
              </div>
            </div>
            <div class="header-period"><strong>Período:</strong> ${escapeHtml(data.periodo)}</div>
          </header>

          <main class="content">
            <section class="section">
              <h2>Seção 1 - Resumo</h2>
              <div class="summary-grid">
                <div class="summary-card">
                  <div class="summary-label">Total a Receber</div>
                  <div class="summary-value info">${fmtMoeda(data.totais.totalReceber)}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Total a Pagar</div>
                  <div class="summary-value danger">${fmtMoeda(data.totais.totalPagar)}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Saldo</div>
                  <div class="summary-value ${data.totais.saldo >= 0 ? 'success' : 'danger'}">${fmtMoeda(data.totais.saldo)}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Total Vendido</div>
                  <div class="summary-value">${fmtMoeda(data.totais.totalVendido)}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Total Recebido</div>
                  <div class="summary-value success">${fmtMoeda(data.totais.totalRecebido)}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Métricas</div>
                  <div class="summary-value">${data.totais.totalRegistros} vendas</div>
                  <div style="font-size:11px;color:${COLORS.textSecondary};margin-top:4px;">Ticket médio: ${fmtMoeda(data.totais.ticketMedio)}</div>
                </div>
              </div>
            </section>

            <section class="section">
              <h2>Seção 2 - Detalhes</h2>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Estufa</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th style="text-align:right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasDetalhes || '<tr><td colspan="7">Sem registros no período selecionado.</td></tr>'}
                </tbody>
              </table>
            </section>

            ${observacoesHtml}

            <div class="footer">
              Documento gerado pelo Sistema de Gestão de Estufas.
            </div>
          </main>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const fallbackDate = new Date().toISOString().slice(0, 10);
    const nomeBase =
      data.nomeArquivo ||
      `Relatorio_Vendas_${sanitizeFilenameSegment(data.nomeEstufa || data.nomeProdutor)}_${fallbackDate}.pdf`;
    const nomeArquivo = nomeBase.toLowerCase().endsWith('.pdf') ? nomeBase : `${nomeBase}.pdf`;
    const destinoUri = `${FileSystem.cacheDirectory}${nomeArquivo}`;

    const existing = await FileSystem.getInfoAsync(destinoUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(destinoUri, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: uri, to: destinoUri });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destinoUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: nomeArquivo,
      });
    } else {
      const downloaded = await downloadPdfOnWeb(destinoUri, nomeArquivo);
      if (!downloaded) {
        throw new Error('Nao foi possivel compartilhar ou baixar o PDF neste dispositivo.');
      }
    }
  } catch (error) {
    console.error('Erro ao gerar PDF do relatório:', error);
    throw new Error('Não foi possível gerar o PDF do relatório.');
  } finally {
    setShareLocked(false);
  }
};

export const shareVendaReceipt = async (data: ReceiptData) => {
  const { venda, nomeProdutor, nomeCliente, nomeProduto, nomeEstufa } = data;

  if (!venda || !venda.id) {
    throw new Error('Venda inválida para geração do PDF individual.');
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
    tituloRelatorio: 'Relatório de Venda Individual',
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
        estufa: nomeEstufa,
        metodoPagamento: (venda.metodoPagamento || venda.formaPagamento || 'N/A').toUpperCase(),
        status,
        valor,
        observacoes: venda.observacoes,
      },
    ],
  });
};

export const shareSalesAccountingPdf = async (data: SalesAccountingPdfData) => {
  if (isShareLocked()) return;
  setShareLocked(true);
  try {
    const totalGeral = data.itens.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
    const totalPago = data.itens
      .filter((item) => String(item.status).toUpperCase() === 'PAGO')
      .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
    const totalPendente = data.itens
      .filter((item) => String(item.status).toUpperCase() !== 'PAGO')
      .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);

    const rows = data.itens
      .map(
        (item) => `
        <tr>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.documentoCliente || '-')}</td>
          <td>${escapeHtml(item.estufa)}</td>
          <td>${escapeHtml(item.lote || '-')}</td>
          <td>${escapeHtml(item.produto)}</td>
          <td>${escapeHtml(item.quantidade)}</td>
          <td style="text-align:right;">${fmtMoeda(item.precoUnitario)}</td>
          <td style="text-align:right;">${fmtMoeda(item.valorTotal)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(item.vencimento || '-')}</td>
          <td>${escapeHtml(item.recebidoPor || '-')}</td>
        </tr>
      `
      )
      .join('');

    const groupedByClient = new Map<string, SalesAccountingItem[]>();
    data.itens.forEach((item) => {
      const key = item.cliente || 'Cliente nao identificado';
      const prev = groupedByClient.get(key) || [];
      prev.push(item);
      groupedByClient.set(key, prev);
    });

    const clientSections = Array.from(groupedByClient.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([cliente, items]) => {
        const subtotal = items.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
        const subtotalPago = items
          .filter((item) => String(item.status).toUpperCase() === 'PAGO')
          .reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
        const subtotalPendente = subtotal - subtotalPago;

        const lines = items
          .sort((a, b) => a.data.localeCompare(b.data))
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.data)}</td>
                <td>${escapeHtml(item.produto)}</td>
                <td>${escapeHtml(item.quantidade)}</td>
                <td style="text-align:right;">${fmtMoeda(item.valorTotal)}</td>
                <td>${escapeHtml(item.metodoPagamento)}</td>
                <td>${escapeHtml(item.status)}</td>
                <td>${escapeHtml(item.recebidoPor || '-')}</td>
              </tr>
            `
          )
          .join('');

        return `
          <div class="client-block">
            <div class="client-header">
              <div>
                <div class="client-name">${escapeHtml(cliente)}</div>
                <div class="client-doc">Documento: ${escapeHtml(items[0]?.documentoCliente || '-')}</div>
              </div>
              <div class="client-totals">
                <span>Total: ${fmtMoeda(subtotal)}</span>
                <span>Pago: ${fmtMoeda(subtotalPago)}</span>
                <span>Pendente: ${fmtMoeda(subtotalPendente)}</span>
              </div>
            </div>
            <table class="mini-table">
              <thead>
                <tr>
                  <th>Data</th><th>Produto</th><th>Quantidade</th><th>Valor</th><th>Metodo</th><th>Status</th><th>Recebido por</th>
                </tr>
              </thead>
              <tbody>
                ${lines}
              </tbody>
            </table>
          </div>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          .meta { font-size: 12px; color: #4b5563; margin-bottom: 12px; }
          .totals { display: flex; gap: 10px; margin-bottom: 12px; }
          .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; }
          .card .k { font-size: 10px; color: #6b7280; text-transform: uppercase; }
          .card .v { font-size: 15px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 6px; }
          th { background: #f3f4f6; text-transform: uppercase; font-size: 9px; }
          .section-title { margin: 14px 0 8px; font-size: 13px; font-weight: 700; }
          .client-block { border: 1px solid #dbeafe; border-radius: 10px; margin-top: 10px; overflow: hidden; }
          .client-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; background: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 8px 10px; }
          .client-name { font-size: 13px; font-weight: 700; color: #1e3a8a; }
          .client-doc { font-size: 10px; color: #334155; margin-top: 2px; }
          .client-totals { display: flex; gap: 8px; flex-wrap: wrap; font-size: 10px; font-weight: 700; color: #1f2937; }
          .mini-table { font-size: 9px; }
          .footer { margin-top: 10px; font-size: 10px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>Relatorio Contabil de Vendas</h1>
        <div class="meta">Empresa: ${escapeHtml(data.empresa)} | Periodo: ${escapeHtml(data.periodo)} | Gerado em: ${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>
        <div class="totals">
          <div class="card"><div class="k">Total de vendas</div><div class="v">${data.itens.length}</div></div>
          <div class="card"><div class="k">Total geral</div><div class="v">${fmtMoeda(totalGeral)}</div></div>
          <div class="card"><div class="k">Total pago</div><div class="v">${fmtMoeda(totalPago)}</div></div>
          <div class="card"><div class="k">Total pendente</div><div class="v">${fmtMoeda(totalPendente)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Cliente</th><th>Doc.</th><th>Estufa</th><th>Lote</th><th>Produto</th><th>Qtd.</th><th>Vlr Unit.</th><th>Vlr Total</th><th>Metodo</th><th>Status</th><th>Venc.</th><th>Recebido por</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="13">Sem registros no periodo.</td></tr>'}
          </tbody>
        </table>
        <div class="section-title">Resumo por cliente</div>
        ${clientSections || '<div class="card">Sem clientes no periodo selecionado.</div>'}
        <div class="footer">Relatorio para uso contabil. Valores em BRL.</div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    const nomeArquivo = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const destinoUri = `${FileSystem.cacheDirectory}${nomeArquivo}`;
    const existing = await FileSystem.getInfoAsync(destinoUri);
    if (existing.exists) await FileSystem.deleteAsync(destinoUri, { idempotent: true });
    await FileSystem.copyAsync({ from: uri, to: destinoUri });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destinoUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: nomeArquivo });
    } else {
      const downloaded = await downloadPdfOnWeb(destinoUri, nomeArquivo);
      if (!downloaded) {
        throw new Error('Nao foi possivel compartilhar ou baixar o PDF neste dispositivo.');
      }
    }
  } finally {
    setShareLocked(false);
  }
};

export const exportSalesAccountingExcel = async (data: SalesAccountingPdfData) => {
  const fileName = `Relatorio_Contabil_Vendas_${sanitizeFilenameSegment(data.empresa)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const rows = data.itens.map((item) => ({
    Data: item.data,
    Cliente: item.cliente,
    Documento: item.documentoCliente || '',
    Estufa: item.estufa,
    Lote: item.lote || '',
    Produto: item.produto,
    Quantidade: item.quantidade,
    'Preco Unitario': Number(item.precoUnitario || 0),
    'Valor Total': Number(item.valorTotal || 0),
    'Metodo Pagamento': item.metodoPagamento,
    Status: item.status,
    Vencimento: item.vencimento || '',
    'Recebido Por': item.recebidoPor || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      'Data',
      'Cliente',
      'Documento',
      'Estufa',
      'Lote',
      'Produto',
      'Quantidade',
      'Preco Unitario',
      'Valor Total',
      'Metodo Pagamento',
      'Status',
      'Vencimento',
      'Recebido Por',
    ],
  });

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio');

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
