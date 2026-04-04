import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colheita } from '../types/domain';
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
  data: string;
  cliente: string;
  estufa: string;
  metodoPagamento: string;
  status: 'PAGO' | 'PENDENTE';
  valor: number;
  observacoes?: string | null;
}

interface SalesReportPdfData {
  nomeProdutor: string;
  nomeEstufa: string;
  tituloRelatorio: string;
  periodo: string;
  observacoes?: string | null;
  totais: SalesReportTotals;
  itens: SalesReportItem[];
}

interface ReceiptData {
  venda: Colheita;
  nomeProdutor: string;
  nomeCliente: string;
  nomeProduto: string;
  nomeEstufa: string;
}

const fmtMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const escapeHtml = (value?: string | null) => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const shareSalesReportPdf = async (data: SalesReportPdfData) => {
  const geradoEm = new Date().toLocaleString('pt-BR');

  const linhasDetalhes = data.itens
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.data)}</td>
          <td>${escapeHtml(item.cliente)}</td>
          <td>${escapeHtml(item.estufa)}</td>
          <td>${escapeHtml(item.metodoPagamento)}</td>
          <td>
            <span class="status ${item.status === 'PAGO' ? 'status-paid' : 'status-open'}">${item.status}</span>
          </td>
          <td class="align-right">${fmtMoeda(item.valor)}</td>
        </tr>
      `
    )
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
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Estufa</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th style="text-align:right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasDetalhes || '<tr><td colspan="6">Sem registros no período selecionado.</td></tr>'}
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
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao gerar PDF do relatório:', error);
    throw new Error('Não foi possível gerar o PDF do relatório.');
  }
};

export const shareVendaReceipt = async (data: ReceiptData) => {
  const { venda, nomeProdutor, nomeCliente, nomeProduto, nomeEstufa } = data;

  if (!venda || !venda.id) {
    throw new Error('Venda inválida para geração do PDF individual.');
  }
  const valor = venda.quantidade * (venda.precoUnitario || 0);
  const status =
    venda.statusPagamento === 'pendente' || (!venda.statusPagamento && venda.metodoPagamento === 'prazo')
      ? 'PENDENTE'
      : 'PAGO';

  await shareSalesReportPdf({
    nomeProdutor,
    nomeEstufa,
    tituloRelatorio: 'Relatório de Venda Individual',
    periodo: venda.dataColheita.toDate().toLocaleDateString('pt-BR'),
    observacoes: venda.observacoes || `Produto: ${nomeProduto}`,
    totais: {
      totalReceber: status === 'PENDENTE' ? valor : 0,
      totalPagar: 0,
      saldo: valor,
      totalVendido: valor,
      totalRecebido: status === 'PAGO' ? valor : 0,
      ticketMedio: valor,
      totalRegistros: 1,
    },
    itens: [
      {
        data: venda.dataColheita.toDate().toLocaleDateString('pt-BR'),
        cliente: nomeCliente,
        estufa: nomeEstufa,
        metodoPagamento: venda.metodoPagamento ? venda.metodoPagamento.toUpperCase() : 'N/A',
        status,
        valor,
        observacoes: venda.observacoes,
      },
    ],
  });
};
