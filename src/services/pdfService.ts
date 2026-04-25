import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { Cliente, Colheita, Plantio } from '../types/domain';

type PaymentStatus = 'pago' | 'pendente' | 'atrasado' | 'cancelado';

export interface ComprovantePDFInput {
  colheita: Colheita & Record<string, any>;
  cliente?: Cliente | null;
  plantio?: Plantio | null;
  nomeEstufa: string;
  nomeFazenda: string;
  cultura: string;
  contatoFazenda?: string;
  logoAssetModule?: number;
  logoBase64?: string;
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

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const escapeHtml = (value?: string | null) => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
};

const toNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatQuantity = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

const normalizeUnitLabel = (value?: string | null) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'un';

  const units: Record<string, string> = {
    caixa: 'caixa',
    caixas: 'caixa',
    cx: 'caixa',
    kg: 'kg',
    quilo: 'kg',
    quilos: 'kg',
    unidade: 'un',
    unidades: 'un',
    un: 'un',
    maco: 'maço',
    macos: 'maço',
    'maço': 'maço',
    'maços': 'maço',
  };

  return units[raw] || raw;
};

const friendlyCode = (value: any, prefix: string) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Não informado';
  if (raw.length <= 18) return raw;
  return `${prefix}-${raw.slice(-6).toUpperCase()}`;
};

const formatDateTime = (value: any) => {
  const dt = toDate(value);
  return {
    date: dt.toLocaleDateString('pt-BR'),
    time: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    isoDay: dt.toISOString().slice(0, 10),
  };
};

const normalizeSaleItems = (sale: any, fallbackCultura: string) => {
  const unidadePadrao = normalizeUnitLabel(sale.unidade || sale.unidadeMedida || 'un');
  const rawItems = Array.isArray(sale.itens) ? sale.itens : [];

  if (rawItems.length > 0) {
    return rawItems.map((item: any) => {
      const quantidade = toNumber(item.quantidade, 0);
      const valorUnitario = toNumber(item.valorUnitario, 0);
      const subtotal = toNumber(item.valorTotal, quantidade * valorUnitario);
      const rawDescricao = String(item.descricao || '').trim();
      const descricao =
        !rawDescricao || rawDescricao.toLowerCase() === 'produção agrícola'
          ? fallbackCultura
          : rawDescricao;
      return {
        descricao: descricao || 'Produto agrícola',
        quantidade,
        unidade: normalizeUnitLabel(item.unidade || unidadePadrao),
        valorUnitario,
        subtotal,
      };
    });
  }

  const quantidade = toNumber(sale.quantidade, 0);
  const valorUnitario = toNumber(sale.precoUnitario, 0);
  return [
    {
      descricao: String(fallbackCultura || 'Produção agrícola'),
      quantidade,
      unidade: unidadePadrao,
      valorUnitario,
      subtotal: quantidade * valorUnitario,
    },
  ];
};

const blobToBase64 = async (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao converter logo para base64.'));
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(blob);
  });

const resolveLogoBase64 = async (logoAssetModule?: number, logoBase64?: string) => {
  if (logoBase64) {
    return logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
  }
  if (!logoAssetModule) return '';

  const source = Image.resolveAssetSource(logoAssetModule);
  if (!source?.uri) return '';

  const response = await fetch(source.uri);
  const blob = await response.blob();
  return blobToBase64(blob);
};

export const buildHtmlTemplate = (input: ComprovantePDFInput, logoBase64: string) => {
  const { colheita, cliente, plantio, nomeEstufa, nomeFazenda, cultura, contatoFazenda } = input;
  const dataOperacao = formatDateTime(colheita.dataVenda || colheita.dataColheita);
  const dataEmissao = formatDateTime(new Date());
  const codigoVenda = friendlyCode(colheita.id, 'VENDA');
  const codigoPdf = `COMP-${dataOperacao.isoDay.replace(/-/g, '')}-${friendlyCode(colheita.id, 'VENDA')}`;
  const culturaNome = plantio?.cultura || cultura || colheita.cultura || 'Cultura não informada';
  const variedadeNome = plantio?.variedade || colheita.variedade || '';
  const produtoLabel = variedadeNome ? `${culturaNome} - ${variedadeNome}` : culturaNome;
  const itens = normalizeSaleItems(colheita, produtoLabel);
  const quantidadeTotal = itens.reduce((acc, item) => acc + toNumber(item.quantidade, 0), 0);
  const unidadeTotal = normalizeUnitLabel(itens[0]?.unidade || colheita.unidade || colheita.unidadeMedida || 'un');
  const valorTotalItens = itens.reduce((acc, item) => acc + toNumber(item.subtotal, 0), 0);
  const valorTotal = toNumber(colheita.valorTotal, valorTotalItens);
  const precoMedio = quantidadeTotal > 0 ? valorTotal / quantidadeTotal : toNumber(colheita.precoUnitario, 0);
  const statusPagamento = (colheita.statusPagamento || 'pago') as PaymentStatus;
  const statusClasse = statusPagamento === 'pago' ? 'status-paid' : 'status-pending';
  const statusLabel = statusPagamento.toUpperCase();
  const clienteNome = cliente?.nome || 'Cliente Avulso';
  const clienteTelefone = cliente?.telefone || 'Não informado';
  const clienteCidade = cliente?.cidade || 'Não informada';
  const metodoPagamento = colheita.metodoPagamento || colheita.formaPagamento || 'Não informado';
  const dataVencimento = colheita.dataVencimento ? formatDateTime(colheita.dataVencimento).date : '-';
  const lotePlantio = plantio?.codigoLote || colheita.codigoLote || friendlyCode(colheita.plantioId, 'PLANTIO');
  const loteColheita =
    colheita.loteColheita || colheita.lote || friendlyCode(colheita.colheitaId, 'COLHEITA');
  const observacoesVenda = String(colheita.observacoes || '').trim();
  const origem = nomeEstufa || nomeFazenda || 'Origem não informada';
  const itensRows = itens
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.descricao)}</td>
          <td>${escapeHtml(formatQuantity(item.quantidade))} ${escapeHtml(item.unidade)}</td>
          <td class="align-right">${formatCurrency(item.valorUnitario)}</td>
          <td class="align-right">${formatCurrency(item.subtotal)}</td>
        </tr>
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
            margin: 0; padding: 18px; font-family: Arial, sans-serif;
            color: #1f2937; background: #f3f4f6;
          }
          .doc {
            max-width: 820px; margin: 0 auto; background: #ffffff;
            border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden;
          }
          .header { padding: 16px 18px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; }
          .header-row { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
          .header-left { display: flex; align-items: center; gap: 12px; }
          .brand { display: flex; flex-direction: column; gap: 2px; }
          .estufa { font-size: 20px; font-weight: 800; margin: 0; color: #0f172a; }
          .produtor { font-size: 12px; margin: 0; color: #334155; }
          .title { font-size: 14px; font-weight: 700; margin: 4px 0 0; color: #0f172a; letter-spacing: 0.4px; }
          .header-right { text-align: right; font-size: 12px; color: #374151; line-height: 1.5; }
          .card { padding: 14px 16px; border-bottom: 1px solid #eef2f7; }
          .card h2 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.4px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .summary-strip {
            display: grid; grid-template-columns: 1.4fr 0.8fr 0.8fr; gap: 10px;
            margin-bottom: 10px;
          }
          .summary-item {
            border: 1px solid #dbeafe; background: #eff6ff; border-radius: 9px;
            padding: 9px 10px;
          }
          .summary-item span {
            display: block; font-size: 10px; text-transform: uppercase;
            color: #475569; letter-spacing: 0.35px; margin-bottom: 3px;
          }
          .summary-item strong { display: block; font-size: 14px; color: #0f172a; }
          .kv { font-size: 12px; margin-bottom: 6px; }
          .muted { color: #64748b; font-size: 10px; }
          .status {
            display: inline-block; padding: 4px 10px; border-radius: 999px;
            font-size: 11px; font-weight: 700;
          }
          .logo {
            width: 68px; height: 68px; object-fit: contain; display: block;
          }
          .status-paid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
          .status-pending { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          table {
            width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px;
          }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; }
          .align-right { text-align: right; }
          tfoot td {
            font-weight: 800; font-size: 14px; background: #f8fafc;
          }
          .totals-highlight {
            margin-top: 10px; display: flex; justify-content: flex-end;
            font-size: 20px; font-weight: 900; color: #0f172a;
          }
          .trace-box {
            border: 1px solid #86efac; background: #f0fdf4; border-radius: 10px;
            padding: 12px; display: flex; justify-content: space-between; gap: 12px;
          }
          .trace-left { font-size: 12px; flex: 1; }
          .trace-row { margin-bottom: 6px; }
          .qr-placeholder {
            width: 92px; height: 92px; border: 2px dashed #16a34a; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            color: #166534; font-size: 10px; text-align: center; padding: 6px; background: #ffffff;
          }
          .notes {
            border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px;
            font-size: 12px; background: #ffffff; min-height: 44px;
          }
          .footer {
            padding: 14px 16px; text-align: center; font-size: 11px;
            color: #475569; background: #f8fafc; border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="doc">
          <header class="header">
            <div class="header-row">
              <div class="header-left">
                ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" alt="Logo da fazenda" />` : ''}
                <div class="brand">
                  <p class="estufa">${escapeHtml(nomeEstufa || 'Estufa')}</p>
                  <p class="produtor">Produtor: ${escapeHtml(nomeFazenda || 'Não informado')}</p>
                  <p class="title">COMPROVANTE DE VENDA</p>
                </div>
              </div>
              <div class="header-right">
                <div><strong>Código da venda:</strong> ${escapeHtml(codigoVenda)}</div>
                <div><strong>Emissão:</strong> ${escapeHtml(dataEmissao.date)} ${escapeHtml(dataEmissao.time)}</div>
              </div>
            </div>
          </header>

          <section class="card">
            <h2>Dados da venda e do cliente</h2>
            <div class="grid-2">
              <div>
                <div class="kv"><strong>Cliente:</strong> ${escapeHtml(clienteNome)}</div>
                <div class="kv"><strong>Contato:</strong> ${escapeHtml(clienteTelefone)} • ${escapeHtml(clienteCidade)}</div>
                <div class="kv"><strong>Método de Pagamento:</strong> ${escapeHtml(String(metodoPagamento).toUpperCase())}</div>
              </div>
              <div>
                <div class="kv"><strong>Data da Venda:</strong> ${escapeHtml(dataOperacao.date)} às ${escapeHtml(dataOperacao.time)}</div>
                <div class="kv"><strong>Data de Vencimento:</strong> ${escapeHtml(dataVencimento)}</div>
                <div class="kv"><strong>Estado do Pagamento:</strong> <span class="status ${statusClasse}">${statusLabel}</span></div>
                <div class="kv"><strong>Código do Documento:</strong> ${escapeHtml(codigoPdf)}</div>
              </div>
            </div>
          </section>

          <section class="card">
            <h2>Produto vendido</h2>
            <div class="summary-strip">
              <div class="summary-item">
                <span>Cultura</span>
                <strong>${escapeHtml(produtoLabel)}</strong>
              </div>
              <div class="summary-item">
                <span>Quantidade total</span>
                <strong>${escapeHtml(formatQuantity(quantidadeTotal))} ${escapeHtml(String(unidadeTotal))}</strong>
              </div>
              <div class="summary-item">
                <span>Valor total</span>
                <strong>${formatCurrency(valorTotal)}</strong>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Produto / Cultura</th>
                  <th>Quantidade / Unidade</th>
                  <th class="align-right">Preço Unitário</th>
                  <th class="align-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itensRows}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="align-right">Valor Total da Venda</td>
                  <td class="align-right">${formatCurrency(valorTotal)}</td>
                </tr>
              </tfoot>
            </table>
            <div class="totals-highlight">Preço médio: ${formatCurrency(precoMedio)} / ${escapeHtml(String(unidadeTotal))}</div>
          </section>

          <section class="card">
            <h2>Origem e rastreabilidade</h2>
            <div class="trace-box">
              <div class="trace-left">
                <div class="trace-row"><strong>Origem:</strong> ${escapeHtml(origem)}</div>
                <div class="trace-row"><strong>Cultura:</strong> ${escapeHtml(produtoLabel)}</div>
                <div class="trace-row"><strong>Lote do plantio:</strong> ${escapeHtml(String(lotePlantio))}</div>
                <div class="trace-row"><strong>Lote da colheita:</strong> ${escapeHtml(String(loteColheita))}</div>
                <div class="trace-row muted">Código de auditoria: ${escapeHtml(codigoVenda)}</div>
              </div>
              <div class="qr-placeholder">Espaço reservado para QR Code</div>
            </div>
          </section>

          <section class="card">
            <h2>Observações</h2>
            <div class="notes">${escapeHtml(observacoesVenda || 'Sem observações adicionais para esta venda.')}</div>
          </section>

          <footer class="footer">
            Documento gerado automaticamente pelo Sistema de Gestão de Estufas.<br/>
            A rastreabilidade agrícola reforça a qualidade e a origem segura do produto.<br/>
            ${escapeHtml(contatoFazenda || 'Para dúvidas, contacte a equipa da propriedade.')}
          </footer>
        </div>
      </body>
    </html>
  `;
};

export const gerarComprovantePDF = async (input: ComprovantePDFInput) => {
  const logoBase64 = await resolveLogoBase64(
    input.logoAssetModule ?? require('../../assets/icon.png'),
    input.logoBase64
  );
  const htmlString = buildHtmlTemplate(input, logoBase64);
  const { uri } = await Print.printToFileAsync({ html: htmlString });
  return uri;
};

export const compartilharPDF = async (input: ComprovantePDFInput) => {
  if (isShareLocked()) return;
  setShareLocked(true);
  try {
    const uri = await gerarComprovantePDF(input);
    const dataOperacao = toDate(input.colheita.dataVenda || input.colheita.dataColheita);
    const dataToken = dataOperacao.toISOString().slice(0, 10);
    const clienteToken = sanitizeFilenameSegment(input.cliente?.nome || 'cliente-avulso');
    const codigoToken = sanitizeFilenameSegment(friendlyCode(input.colheita.id, 'VENDA'));
    const nomeArquivo = `Comprovante_${clienteToken}_${dataToken}_${codigoToken}.pdf`;
    const destinoUri = `${FileSystem.cacheDirectory}${nomeArquivo}`;

    const existing = await FileSystem.getInfoAsync(destinoUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(destinoUri, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: uri, to: destinoUri });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Compartilhamento não disponível neste dispositivo.');
    }
    await Sharing.shareAsync(destinoUri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: nomeArquivo,
    });
  } finally {
    setShareLocked(false);
  }
};
