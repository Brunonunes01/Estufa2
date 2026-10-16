import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Image, Platform } from 'react-native';
import { Cliente, Colheita, Plantio } from '../types/domain';
import {
  buildPublicTraceabilityLookupUrl,
  buildPublicTraceabilityQrUrl,
  buildTraceabilityTextPayload,
  resolveTraceabilityPublicToken,
} from './publicTraceabilityService';
import { summarizeCaixaReport } from './caixaReportHelpers';
import type {
  CaixaMovimento,
  CaixaMovimentosResumo,
} from './caixaServiceHelpers';

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
const SHARE_LOCK_TIMEOUT_MS = 15000;
const isShareLocked = () => {
  const lockedAt = (globalThis as any)[SHARE_LOCK_KEY];
  if (!lockedAt) return false;
  if (typeof lockedAt !== 'number') return true;
  const isLocked = Date.now() - lockedAt < SHARE_LOCK_TIMEOUT_MS;
  if (!isLocked) {
    (globalThis as any)[SHARE_LOCK_KEY] = false;
  }
  return isLocked;
};
const setShareLocked = (value: boolean) => {
  (globalThis as any)[SHARE_LOCK_KEY] = value ? Date.now() : false;
};
const RECEIPT_BRAND_NAME = 'ESTUFA VERDE VIVO';
const RECEIPT_BRAND_SUBTITLE = 'PRODUTOS PARA ESTUFAS E AGRICULTURA PROTEGIDA';

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

const formatReceiptNumber = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

const formatAddress = (entity: {
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}) => {
  const part1 = [entity.endereco, entity.numero, entity.complemento]
    .filter(Boolean)
    .join(', ');
  const part2 = [entity.bairro, entity.cidade, entity.estado, entity.cep]
    .filter(Boolean)
    .join(' - ');
  const full = [part1, part2].filter(Boolean).join(' | ');
  return full || 'Nao informado';
};

const normalizeUnitLabel = (value?: string | null) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
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
    maço: 'maço',
    maços: 'maço',
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
    time: dt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isoDay: dt.toISOString().slice(0, 10),
  };
};

const normalizeSaleItems = (sale: any, fallbackCultura: string) => {
  const unidadePadrao = normalizeUnitLabel(
    sale.unidade || sale.unidadeMedida || 'un'
  );
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
    reader.onerror = () =>
      reject(new Error('Falha ao converter logo para base64.'));
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(blob);
  });

const resolveLogoBase64 = async (
  logoAssetModule?: number,
  logoBase64?: string
) => {
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

const resolveReceiptLogoBase64 = async (input: ComprovantePDFInput) => {
  try {
    return await resolveLogoBase64(
      input.logoAssetModule ?? require('../../assets/icon.png'),
      input.logoBase64
    );
  } catch {
    return '';
  }
};

const downloadPdfOnWeb = async (uri: string, fileName: string) => {
  if (typeof document === 'undefined') return false;

  let href = uri;
  if (!href.startsWith('data:')) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
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

const preparePdfForNativeSharing = async (
  sourceUri: string,
  fileName: string
) => {
  if (!FileSystem.cacheDirectory) return sourceUri;

  const destination = `${FileSystem.cacheDirectory}${fileName}`;
  try {
    const existing = await FileSystem.getInfoAsync(destination);
    if (existing.exists) {
      await FileSystem.deleteAsync(destination, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: sourceUri, to: destination });
    return destination;
  } catch {
    return sourceUri;
  }
};

const injectHtmlTitle = (html: string, title: string) => {
  const safeTitle = escapeHtml(title);
  if (/<title>.*<\/title>/i.test(html)) {
    return html.replace(/<title>.*<\/title>/i, `<title>${safeTitle}</title>`);
  }

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(
      /<head([^>]*)>/i,
      `<head$1><title>${safeTitle}</title>`
    );
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head><title>${safeTitle}</title></head><body>${html}</body></html>`;
};

const openPrintWindowOnWeb = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) {
    throw new Error(
      'Nao foi possivel abrir a janela de impressao no navegador.'
    );
  }
  return printWindow;
};

const printHtmlOnWeb = async (
  html: string,
  title: string,
  existingWindow?: Window | null
) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const printWindow = existingWindow || openPrintWindowOnWeb();
  if (!printWindow) return false;

  const fullHtml = injectHtmlTitle(html, title);
  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      printWindow.setTimeout(resolve, 500);
    };
    const fallback = window.setTimeout(finishOnce, 1500);
    if (
      printWindow.document.readyState === 'complete' &&
      printWindow.document.body?.children.length
    ) {
      window.clearTimeout(fallback);
      finishOnce();
      return;
    }

    printWindow.onload = () => {
      window.clearTimeout(fallback);
      finishOnce();
    };
  });

  printWindow.focus();
  printWindow.print();
  printWindow.onafterprint = () => {
    printWindow.close();
  };
  return true;
};

export const buildHtmlTemplate = (
  input: ComprovantePDFInput,
  logoBase64: string
) => {
  const {
    colheita,
    cliente,
    plantio,
    nomeEstufa,
    nomeFazenda,
    cultura,
    contatoFazenda,
  } = input;
  const dataOperacao = formatDateTime(
    colheita.dataVenda || colheita.dataColheita
  );
  const dataEmissao = formatDateTime(new Date());
  const codigoVenda = friendlyCode(colheita.id, 'VENDA');
  const codigoPdf = `COMP-${dataOperacao.isoDay.replace(/-/g, '')}-${friendlyCode(colheita.id, 'VENDA')}`;
  const culturaNome =
    plantio?.cultura || cultura || colheita.cultura || 'Cultura não informada';
  const variedadeNome = plantio?.variedade || colheita.variedade || '';
  const produtoLabel = variedadeNome
    ? `${culturaNome} - ${variedadeNome}`
    : culturaNome;
  const itens = normalizeSaleItems(colheita, produtoLabel);
  const quantidadeTotal = itens.reduce(
    (acc, item) => acc + toNumber(item.quantidade, 0),
    0
  );
  const unidadeTotal = normalizeUnitLabel(
    itens[0]?.unidade || colheita.unidade || colheita.unidadeMedida || 'un'
  );
  const valorTotalItens = itens.reduce(
    (acc, item) => acc + toNumber(item.subtotal, 0),
    0
  );
  const valorTotal = toNumber(colheita.valorTotal, valorTotalItens);
  const precoMedio =
    quantidadeTotal > 0
      ? valorTotal / quantidadeTotal
      : toNumber(colheita.precoUnitario, 0);
  const statusPagamento = (colheita.statusPagamento || 'pago') as PaymentStatus;
  const statusClasse =
    statusPagamento === 'pago' ? 'status-paid' : 'status-pending';
  const statusLabel = statusPagamento.toUpperCase();
  const clienteNome = cliente?.nome || 'Cliente Avulso';
  const clienteDocumento = cliente?.documento || 'Nao informado';
  const clienteTelefone = cliente?.telefone || 'Não informado';
  const clienteCidade = cliente?.cidade || 'Não informada';
  const clienteEndereco = formatAddress(cliente || {});
  const metodoPagamento =
    colheita.metodoPagamento || colheita.formaPagamento || 'Não informado';
  const lotePlantio =
    plantio?.codigoLote ||
    colheita.codigoLote ||
    friendlyCode(colheita.plantioId, 'PLANTIO');
  const loteColheita =
    colheita.loteColheita ||
    colheita.lote ||
    friendlyCode(colheita.colheitaId, 'COLHEITA');
  const observacoesVenda = String(colheita.observacoes || '').trim();
  const origem = nomeEstufa || nomeFazenda || 'Origem não informada';
  const traceabilityToken = resolveTraceabilityPublicToken({
    id: colheita.id,
    traceabilityPublicToken: colheita.traceabilityPublicToken || null,
  });
  const traceabilityLink =
    String(colheita.traceabilityPublicUrl || '').trim() ||
    buildPublicTraceabilityLookupUrl(traceabilityToken);
  const traceabilityTextPayload = buildTraceabilityTextPayload({
    token: traceabilityToken || codigoVenda,
    produto: produtoLabel,
    origem,
    loteOrigem: String(lotePlantio || 'Não informado'),
    loteColheita: String(loteColheita || 'Não informado'),
    dataVenda: `${dataOperacao.date} ${dataOperacao.time}`,
    quantidade: `${formatQuantity(quantidadeTotal)} ${String(unidadeTotal)}`,
  });
  const traceabilityQrSource = traceabilityLink || traceabilityTextPayload;
  const traceabilityQrUrl = buildPublicTraceabilityQrUrl(traceabilityQrSource);
  const traceabilityLinkLabel = traceabilityLink || 'QR com dados offline';
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
          .qr-image {
            width: 92px; height: 92px; border: 1px solid #16a34a; border-radius: 8px;
            background: #ffffff;
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
                <div class="kv"><strong>Documento:</strong> ${escapeHtml(clienteDocumento)}</div>
                <div class="kv"><strong>Contato:</strong> ${escapeHtml(clienteTelefone)} • ${escapeHtml(clienteCidade)}</div>
                <div class="kv"><strong>Endereco:</strong> ${escapeHtml(clienteEndereco)}</div>
                <div class="kv"><strong>Método de Pagamento:</strong> ${escapeHtml(String(metodoPagamento).toUpperCase())}</div>
              </div>
              <div>
                <div class="kv"><strong>Data da Venda:</strong> ${escapeHtml(dataOperacao.date)} às ${escapeHtml(dataOperacao.time)}</div>
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
            <h2>Condições comerciais</h2>
            <div class="grid-2">
              <div>
                <div class="kv"><strong>Quantidade total:</strong> ${escapeHtml(formatQuantity(quantidadeTotal))} ${escapeHtml(String(unidadeTotal))}</div>
                <div class="kv"><strong>Preço médio por unidade:</strong> ${formatCurrency(precoMedio)}</div>
              </div>
              <div>
                <div class="kv"><strong>Valor final:</strong> ${formatCurrency(valorTotal)}</div>
                <div class="kv"><strong>Status do pagamento:</strong> ${escapeHtml(statusLabel)}</div>
              </div>
            </div>
          </section>

          <section class="card">
            <h2>Origem e rastreabilidade</h2>
            <div class="trace-box">
              <div class="trace-left">
                <div class="trace-row"><strong>Origem:</strong> ${escapeHtml(origem)}</div>
                <div class="trace-row"><strong>Cultura:</strong> ${escapeHtml(produtoLabel)}</div>
                <div class="trace-row"><strong>Lote do plantio:</strong> ${escapeHtml(String(lotePlantio))}</div>
                <div class="trace-row"><strong>Lote da colheita:</strong> ${escapeHtml(String(loteColheita))}</div>
                <div class="trace-row"><strong>Código de rastreio:</strong> ${escapeHtml(traceabilityToken || codigoVenda)}</div>
                <div class="trace-row"><strong>Consulta pública:</strong> ${escapeHtml(traceabilityLinkLabel)}</div>
                <div class="trace-row muted">Código de auditoria: ${escapeHtml(codigoVenda)}</div>
              </div>
              ${
                traceabilityQrUrl
                  ? `<img class="qr-image" src="${escapeHtml(traceabilityQrUrl)}" alt="QR Code de rastreabilidade" />`
                  : '<div class="qr-placeholder">QR indisponível</div>'
              }
            </div>
          </section>

          <section class="card">
            <h2>Observações</h2>
            <div class="notes">${escapeHtml(observacoesVenda || 'Sem observações adicionais para esta venda.')}</div>
          </section>

          <footer class="footer">
            Documento gerado automaticamente pelo Sistema de Gestão de Estufas.<br/>
            A rastreabilidade agrícola reforça a qualidade e a origem segura do produto.<br/>
            ${escapeHtml(contatoFazenda || 'Para duvidas, contate a equipe da propriedade.')}
            <br/><br/>
            ____________________________________________<br/>
            Assinatura do produtor / responsavel
            <br/><br/>
            ____________________________________________<br/>
            Assinatura do cliente / recebedor
          </footer>
        </div>
      </body>
    </html>
  `;
};

const _buildHtmlTemplateV2 = (
  input: ComprovantePDFInput,
  logoBase64: string
) => {
  const {
    colheita,
    cliente,
    plantio,
    nomeEstufa,
    nomeFazenda,
    cultura,
    contatoFazenda,
  } = input;
  const dataOperacao = formatDateTime(
    colheita.dataVenda || colheita.dataColheita
  );
  const dataEmissao = formatDateTime(new Date());
  const codigoVenda = friendlyCode(colheita.id, 'VENDA');
  const codigoPdf = `COMP-${dataOperacao.isoDay.replace(/-/g, '')}-${friendlyCode(colheita.id, 'VENDA')}`;
  const culturaNome =
    plantio?.cultura || cultura || colheita.cultura || 'Cultura nao informada';
  const variedadeNome = plantio?.variedade || colheita.variedade || '';
  const produtoLabel = variedadeNome
    ? `${culturaNome} - ${variedadeNome}`
    : culturaNome;
  const itens = normalizeSaleItems(colheita, produtoLabel);
  const quantidadeTotal = itens.reduce(
    (acc, item) => acc + toNumber(item.quantidade, 0),
    0
  );
  const unidadeTotal = normalizeUnitLabel(
    itens[0]?.unidade || colheita.unidade || colheita.unidadeMedida || 'un'
  );
  const valorTotalItens = itens.reduce(
    (acc, item) => acc + toNumber(item.subtotal, 0),
    0
  );
  const valorTotal = toNumber(colheita.valorTotal, valorTotalItens);
  const precoMedio =
    quantidadeTotal > 0
      ? valorTotal / quantidadeTotal
      : toNumber(colheita.precoUnitario, 0);
  const statusPagamento = (colheita.statusPagamento || 'pago') as PaymentStatus;
  const statusClasse =
    statusPagamento === 'pago' ? 'status-paid' : 'status-pending';
  const statusLabel = statusPagamento.toUpperCase();
  const clienteNome = cliente?.nome || 'Cliente avulso';
  const clienteDocumento = cliente?.documento || 'Nao informado';
  const clienteTelefone = cliente?.telefone || 'Nao informado';
  const clienteCidade = cliente?.cidade || 'Nao informada';
  const clienteEndereco = formatAddress(cliente || {});
  const metodoPagamento =
    colheita.metodoPagamento || colheita.formaPagamento || 'Nao informado';
  const lotePlantio =
    plantio?.codigoLote ||
    colheita.codigoLote ||
    friendlyCode(colheita.plantioId, 'PLANTIO');
  const loteColheita =
    colheita.loteColheita ||
    colheita.lote ||
    friendlyCode(colheita.colheitaId, 'COLHEITA');
  const observacoesVenda = String(colheita.observacoes || '').trim();
  const origem = nomeEstufa || nomeFazenda || 'Origem nao informada';
  const traceabilityToken = resolveTraceabilityPublicToken({
    id: colheita.id,
    traceabilityPublicToken: colheita.traceabilityPublicToken || null,
  });
  const traceabilityLink =
    String(colheita.traceabilityPublicUrl || '').trim() ||
    buildPublicTraceabilityLookupUrl(traceabilityToken);
  const traceabilityTextPayload = buildTraceabilityTextPayload({
    token: traceabilityToken || codigoVenda,
    produto: produtoLabel,
    origem,
    loteOrigem: String(lotePlantio || 'Nao informado'),
    loteColheita: String(loteColheita || 'Nao informado'),
    dataVenda: `${dataOperacao.date} ${dataOperacao.time}`,
    quantidade: `${formatQuantity(quantidadeTotal)} ${String(unidadeTotal)}`,
  });
  const traceabilityQrSource = traceabilityLink || traceabilityTextPayload;
  const traceabilityQrUrl = buildPublicTraceabilityQrUrl(traceabilityQrSource);
  const traceabilityLinkLabel = traceabilityLink || 'QR com dados offline';
  const pagamentoResumo =
    statusPagamento === 'pago'
      ? 'Pagamento liquidado.'
      : statusPagamento === 'cancelado'
        ? 'Venda cancelada.'
        : 'Pagamento pendente.';

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
          body { margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #eef2f7; }
          .doc { max-width: 860px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe4ef; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
          .hero { padding: 22px 24px 18px; background: linear-gradient(135deg, #0f766e 0%, #1d4ed8 100%); color: #ffffff; }
          .hero-top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
          .hero-left { display: flex; align-items: center; gap: 14px; }
          .brand { display: flex; flex-direction: column; gap: 4px; }
          .estufa { font-size: 24px; font-weight: 900; margin: 0; color: #ffffff; }
          .produtor { font-size: 12px; margin: 0; color: rgba(255,255,255,0.86); }
          .title { font-size: 14px; font-weight: 800; margin: 2px 0 0; letter-spacing: 0.5px; text-transform: uppercase; }
          .hero-right { text-align: right; font-size: 11px; line-height: 1.55; color: rgba(255,255,255,0.92); }
          .hero-tags { display: grid; grid-template-columns: 1.2fr 0.8fr 0.8fr; gap: 10px; margin-top: 16px; }
          .hero-card { border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.12); border-radius: 12px; padding: 10px 12px; }
          .hero-card span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.35px; color: rgba(255,255,255,0.75); margin-bottom: 4px; }
          .hero-card strong { display: block; font-size: 15px; color: #ffffff; }
          .logo { width: 70px; height: 70px; object-fit: contain; display: block; background: rgba(255,255,255,0.92); border-radius: 14px; padding: 6px; }
          .content { padding: 18px 22px 22px; }
          .card { padding: 16px; border: 1px solid #e5edf5; border-radius: 14px; margin-bottom: 14px; background: #fbfdff; }
          .card h2 { margin: 0 0 12px; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.45px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
          .summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
          .summary-item { border: 1px solid #dbe4ef; background: #ffffff; border-radius: 12px; padding: 10px 12px; }
          .summary-item span { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.35px; margin-bottom: 4px; }
          .summary-item strong { display: block; font-size: 15px; color: #0f172a; }
          .kv { font-size: 12px; margin-bottom: 8px; line-height: 1.45; }
          .status { display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; }
          .status-paid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
          .status-pending { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; border: 1px solid #dbe4ef; border-radius: 12px; overflow: hidden; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 9px; text-align: left; }
          th { background: #f8fafc; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.35px; color: #64748b; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          .align-right { text-align: right; }
          tfoot td { font-weight: 900; font-size: 13px; background: #f8fafc; }
          .totals-highlight { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe; }
          .totals-highlight strong { font-size: 22px; color: #0f172a; }
          .totals-caption { font-size: 12px; color: #334155; line-height: 1.45; }
          .trace-box { border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; gap: 14px; }
          .trace-left { font-size: 12px; flex: 1; }
          .trace-row { margin-bottom: 6px; line-height: 1.45; }
          .muted { color: #64748b; font-size: 10px; }
          .qr-placeholder { width: 92px; height: 92px; border: 2px dashed #16a34a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #166534; font-size: 10px; text-align: center; padding: 6px; background: #ffffff; }
          .qr-image { width: 92px; height: 92px; border: 1px solid #16a34a; border-radius: 8px; background: #ffffff; }
          .notes { border: 1px solid #dbe4ef; border-radius: 10px; padding: 12px; font-size: 12px; background: #ffffff; min-height: 52px; line-height: 1.5; }
          .signature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-top: 18px; }
          .signature-line { padding-top: 40px; border-top: 1px solid #94a3b8; text-align: center; font-size: 11px; color: #475569; }
          .footer { padding: 16px 22px 22px; font-size: 11px; color: #475569; background: #f8fafc; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="doc">
          <header class="hero">
            <div class="hero-top">
              <div class="hero-left">
                ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" alt="Logo da propriedade" />` : ''}
                <div class="brand">
                  <p class="estufa">${escapeHtml(nomeEstufa || 'Estufa')}</p>
                  <p class="produtor">Produtor: ${escapeHtml(nomeFazenda || 'Nao informado')}</p>
                  <p class="title">Comprovante de venda</p>
                </div>
              </div>
              <div class="hero-right">
                <div><strong>Venda:</strong> ${escapeHtml(codigoVenda)}</div>
                <div><strong>Documento:</strong> ${escapeHtml(codigoPdf)}</div>
                <div><strong>Emissao:</strong> ${escapeHtml(dataEmissao.date)} ${escapeHtml(dataEmissao.time)}</div>
              </div>
            </div>
            <div class="hero-tags">
              <div class="hero-card"><span>Cliente</span><strong>${escapeHtml(clienteNome)}</strong></div>
              <div class="hero-card"><span>Status</span><strong>${escapeHtml(statusLabel)}</strong></div>
              <div class="hero-card"><span>Valor final</span><strong>${formatCurrency(valorTotal)}</strong></div>
            </div>
          </header>
          <main class="content">
            <section class="card">
              <h2>Dados comerciais</h2>
              <div class="grid-2">
                <div>
                  <div class="kv"><strong>Cliente:</strong> ${escapeHtml(clienteNome)}</div>
                  <div class="kv"><strong>Documento:</strong> ${escapeHtml(clienteDocumento)}</div>
                  <div class="kv"><strong>Contato:</strong> ${escapeHtml(clienteTelefone)} • ${escapeHtml(clienteCidade)}</div>
                  <div class="kv"><strong>Endereco:</strong> ${escapeHtml(clienteEndereco)}</div>
                </div>
                <div>
                  <div class="kv"><strong>Data da venda:</strong> ${escapeHtml(dataOperacao.date)} as ${escapeHtml(dataOperacao.time)}</div>
                  <div class="kv"><strong>Metodo de pagamento:</strong> ${escapeHtml(String(metodoPagamento).toUpperCase())}</div>
                  <div class="kv"><strong>Pagamento:</strong> <span class="status ${statusClasse}">${escapeHtml(statusLabel)}</span></div>
                </div>
              </div>
            </section>
            <section class="card">
              <h2>Itens da venda</h2>
              <div class="summary-strip">
                <div class="summary-item"><span>Produto</span><strong>${escapeHtml(produtoLabel)}</strong></div>
                <div class="summary-item"><span>Quantidade</span><strong>${escapeHtml(formatQuantity(quantidadeTotal))} ${escapeHtml(String(unidadeTotal))}</strong></div>
                <div class="summary-item"><span>Preco medio</span><strong>${formatCurrency(precoMedio)}</strong></div>
                <div class="summary-item"><span>Valor total</span><strong>${formatCurrency(valorTotal)}</strong></div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th class="align-right">Preco unitario</th>
                    <th class="align-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${itensRows}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="align-right">Valor total da venda</td>
                    <td class="align-right">${formatCurrency(valorTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              <div class="totals-highlight">
                <div class="totals-caption">${escapeHtml(pagamentoResumo)}<br/>Lote do plantio: <strong>${escapeHtml(String(lotePlantio))}</strong></div>
                <strong>${formatCurrency(valorTotal)}</strong>
              </div>
            </section>
            <section class="card">
              <h2>Origem e rastreabilidade</h2>
              <div class="grid-2">
                <div>
                  <div class="kv"><strong>Origem:</strong> ${escapeHtml(origem)}</div>
                  <div class="kv"><strong>Lote do plantio:</strong> ${escapeHtml(String(lotePlantio))}</div>
                  <div class="kv"><strong>Lote da colheita:</strong> ${escapeHtml(String(loteColheita))}</div>
                  <div class="kv"><strong>Codigo de rastreio:</strong> ${escapeHtml(traceabilityToken || codigoVenda)}</div>
                </div>
                <div>
                  <div class="kv"><strong>Cultura:</strong> ${escapeHtml(produtoLabel)}</div>
                  <div class="kv"><strong>Consulta publica:</strong> ${escapeHtml(traceabilityLinkLabel)}</div>
                  <div class="kv"><strong>Codigo da venda:</strong> ${escapeHtml(codigoVenda)}</div>
                  <div class="kv"><strong>Observacao financeira:</strong> ${escapeHtml(pagamentoResumo)}</div>
                </div>
              </div>
              <div class="trace-box" style="margin-top:12px;">
                <div class="trace-left">
                  <div class="trace-row"><strong>Conferir origem:</strong> utilize o QR Code para acessar os dados da venda e do lote.</div>
                  <div class="trace-row"><strong>Consulta:</strong> ${escapeHtml(traceabilityLinkLabel)}</div>
                  <div class="trace-row muted">Codigo de auditoria: ${escapeHtml(codigoPdf)}</div>
                </div>
                ${traceabilityQrUrl ? `<img class="qr-image" src="${escapeHtml(traceabilityQrUrl)}" alt="QR Code de rastreabilidade" />` : '<div class="qr-placeholder">QR indisponivel</div>'}
              </div>
            </section>
            <section class="card">
              <h2>Observacoes</h2>
              <div class="notes">${escapeHtml(observacoesVenda || 'Sem observacoes adicionais para esta venda.')}</div>
            </section>
            <footer class="footer">
              <div>Documento gerado automaticamente pelo Sistema de Gestao de Estufas.<br/>${escapeHtml(contatoFazenda || 'Para duvidas, contate a equipe da propriedade.')}</div>
              <div class="signature-grid">
                <div class="signature-line">Assinatura do produtor / responsavel</div>
                <div class="signature-line">Assinatura do cliente / recebedor</div>
              </div>
            </footer>
          </main>
        </div>
      </body>
    </html>
  `;
};

const buildEstufaVerdeVivoReceiptHtml = (
  input: ComprovantePDFInput,
  logoBase64: string
) => {
  const {
    colheita,
    cliente,
    plantio,
    nomeEstufa,
    nomeFazenda,
    cultura,
    contatoFazenda,
  } = input;
  const dataOperacao = formatDateTime(
    colheita.dataVenda || colheita.dataColheita
  );
  const culturaNome =
    plantio?.cultura || cultura || colheita.cultura || 'Produto agrícola';
  const variedadeNome = plantio?.variedade || colheita.variedade || '';
  const produtoLabel = variedadeNome
    ? `${culturaNome} - ${variedadeNome}`
    : culturaNome;
  const itens = normalizeSaleItems(colheita, produtoLabel);
  const quantidadeTotal = itens.reduce(
    (acc, item) => acc + toNumber(item.quantidade, 0),
    0
  );
  const unidadeTotal = normalizeUnitLabel(
    itens[0]?.unidade || colheita.unidade || colheita.unidadeMedida || 'un'
  );
  const valorTotalItens = itens.reduce(
    (acc, item) => acc + toNumber(item.subtotal, 0),
    0
  );
  const valorTotal = toNumber(colheita.valorTotal, valorTotalItens);
  const clienteNome = cliente?.nome || 'Cliente avulso';
  const clienteDocumento = cliente?.documento || 'Nao informado';
  const clienteTelefone = cliente?.telefone || 'Nao informado';
  const clienteCidade = cliente?.cidade || 'Nao informada';
  const clienteEstado = cliente?.estado || '';
  const clienteCep = cliente?.cep || 'Nao informado';
  const clienteEndereco = formatAddress(cliente || {});
  const metodoPagamento =
    colheita.metodoPagamento || colheita.formaPagamento || 'Nao informado';
  const formaPagamentoLabel =
    String(metodoPagamento).toLowerCase() === 'prazo' ? '30 DIAS' : 'A VISTA';
  const vendedorLabel = nomeFazenda || 'Nao informado';
  const freteLabel = 'Por conta do cliente';
  const quantidadeLabel = `${formatQuantity(quantidadeTotal)} ${String(unidadeTotal).toUpperCase()}`;
  const statusPagamento = (colheita.statusPagamento || 'pago') as PaymentStatus;
  const valorPago =
    statusPagamento === 'pago'
      ? toNumber(colheita.valorRecebido, valorTotal)
      : 0;
  const valorPendente =
    statusPagamento === 'pago' || statusPagamento === 'cancelado'
      ? 0
      : valorTotal;
  const dataPagamentoLabel =
    statusPagamento === 'pago'
      ? formatDateTime(
          colheita.dataRecebimento ||
            colheita.dataVenda ||
            colheita.dataColheita
        ).date
      : '-';
  const vencimentoDate = colheita.dataVencimento
    ? toDate(colheita.dataVencimento)
    : new Date(
        toDate(colheita.dataVenda || colheita.dataColheita).getTime() +
          30 * 24 * 60 * 60 * 1000
      );
  const vencimentoLabel =
    statusPagamento === 'pago'
      ? '-'
      : vencimentoDate.toLocaleDateString('pt-BR');
  const codigoDocumento = String(colheita.id || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-6)
    .padStart(6, '0');
  const observacoesVenda = String(colheita.observacoes || '').trim();
  const contactEmail = contatoFazenda || 'contato@estufaverdevivo.com.br';
  const website =
    String(colheita.traceabilityPublicUrl || '').trim() ||
    'www.estufaverdevivo.com.br';
  const observacoesLista = observacoesVenda
    ? observacoesVenda
        .split(/\r?\n+/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [
        'Mercadorias entregues conforme pedido.',
        `Origem: ${nomeEstufa || nomeFazenda}.`,
      ];

  const itensRows = itens
    .map(
      (item, index) => `
        <tr>
          <td class="idx-cell">${index + 1}</td>
          <td class="desc-cell">${escapeHtml(item.descricao)}</td>
          <td class="center">${escapeHtml(formatQuantity(item.quantidade))}</td>
          <td class="center">${escapeHtml(String(item.unidade || unidadeTotal).toUpperCase())}</td>
          <td class="amount">${formatReceiptNumber(item.valorUnitario)}</td>
          <td class="amount">${formatReceiptNumber(item.subtotal)}</td>
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
          @page { size: A4 portrait; margin: 12mm; }
          body { margin: 0; padding: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #ffffff; }
          .sheet { width: 100%; max-width: 186mm; margin: 0 auto; background: #ffffff; padding: 0; }
          .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
          .brand-wrap { display: flex; align-items: center; gap: 10px; min-width: 0; }
          .logo { width: 54px; height: 54px; object-fit: contain; display: block; }
          .brand-name { margin: 0; font-size: 21px; line-height: 1.08; font-weight: 900; color: #1a5c2e; text-transform: uppercase; }
          .brand-sub { margin: 3px 0 0; font-size: 9px; line-height: 1.25; color: #4b5563; letter-spacing: 0.2px; text-transform: uppercase; }
          .doc-title-wrap { text-align: right; flex-shrink: 0; }
          .doc-title { margin: 0; font-size: 26px; line-height: 1; font-weight: 900; color: #1a5c2e; letter-spacing: -0.5px; }
          .doc-code { display: inline-block; border: 2px solid #1a5c2e; border-radius: 4px; padding: 4px 16px; margin-top: 8px; font-weight: 700; font-size: 15px; color: #1a5c2e; letter-spacing: 1px; }
          .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
          .card { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
          .section-header { background: #1a5c2e; color: #ffffff; font-weight: 700; font-size: 11px; letter-spacing: 1px; padding: 6px 14px; }
          .card-body { padding: 10px 14px; background: #f9fafb; }
          .info-row { display: flex; gap: 4px; font-size: 12px; line-height: 1.55; color: #374151; }
          .info-row-label { font-weight: 700; white-space: nowrap; }
          .sale-info { padding: 10px 14px; display: flex; flex-direction: column; gap: 10px; min-height: 100%; justify-content: center; }
          .sale-info-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #4b5563; }
          .sale-info-row strong { color: #374151; white-space: nowrap; }
          .table-card { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 14px; page-break-inside: avoid; }
          .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .items-table thead th { background: #1a5c2e; color: #ffffff; padding: 10px 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-align: center; }
          .items-table tbody tr:nth-child(even) { background: #f9fafb; }
          .items-table tbody td { padding: 10px 10px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
          .items-table tbody tr:last-child td { border-bottom: 0; }
          .idx-cell { text-align: center; font-weight: 700; width: 48px; }
          .desc-cell { white-space: pre-line; word-break: break-word; line-height: 1.45; }
          .center { text-align: center; }
          .amount { text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; }
          .summary-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
          .summary-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; page-break-inside: avoid; }
          .summary-title { margin: 0 0 12px; font-size: 13px; font-weight: 800; color: #1a5c2e; letter-spacing: 0.5px; }
          .summary-grid { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #374151; }
          .summary-grid-row { display: flex; justify-content: space-between; gap: 12px; }
          .summary-grid-row .value { font-weight: 700; white-space: nowrap; }
          .grand-total { background: #f9fafb; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
          .grand-total strong { display: block; font-size: 30px; line-height: 1.1; color: #1a5c2e; font-weight: 900; letter-spacing: -0.6px; }
          .payment-box { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 14px; page-break-inside: avoid; }
          .payment-grid { display: grid; grid-template-columns: 1fr 1fr; }
          .payment-cell { padding: 10px 14px; border-bottom: 1px solid #f3f4f6; display: flex; gap: 8px; align-items: center; font-size: 12px; }
          .payment-cell:nth-child(odd) { border-right: 1px solid #f3f4f6; }
          .payment-label { font-weight: 700; color: #374151; white-space: nowrap; }
          .payment-value { color: #374151; }
          .payment-value.negative { color: #dc2626; font-weight: 700; }
          .obs-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; margin-bottom: 18px; page-break-inside: avoid; }
          .obs-wrap { display: grid; grid-template-columns: 1fr 190px; gap: 20px; }
          .obs-title { margin: 0 0 8px; font-weight: 700; font-size: 12px; color: #111827; }
          .obs-line { font-size: 12px; color: #4b5563; line-height: 1.7; }
          .sign-box { text-align: center; min-width: 180px; }
          .sign-line { border-top: 1px solid #374151; padding-top: 6px; margin-top: 26px; font-size: 11px; color: #4b5563; }
          .sign-date { font-size: 11px; color: #4b5563; margin-top: 8px; }
          .footer-note { text-align: center; font-size: 13px; font-style: italic; color: #1a5c2e; font-weight: 600; margin-bottom: 12px; }
          .contact-bar { border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: center; gap: 26px; font-size: 11px; color: #4b5563; flex-wrap: wrap; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="topbar">
            <div class="brand-wrap">
              ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" alt="Logo" />` : ''}
              <div>
                <h1 class="brand-name">${escapeHtml(RECEIPT_BRAND_NAME)}</h1>
                <p class="brand-sub">${escapeHtml(RECEIPT_BRAND_SUBTITLE)}</p>
              </div>
            </div>
            <div class="doc-title-wrap">
              <div class="doc-title">COMPROVANTE DE VENDA</div>
              <div class="doc-code">Nº ${escapeHtml(codigoDocumento)}</div>
            </div>
          </div>

          <div class="row-2">
            <div class="card">
              <div class="section-header">DADOS DO CLIENTE</div>
              <div class="card-body">
                <div class="info-row"><span class="info-row-label">Nome / Razão Social:</span><span>${escapeHtml(clienteNome)}</span></div>
                <div class="info-row"><span class="info-row-label">CNPJ:</span><span>${escapeHtml(clienteDocumento)}</span></div>
                <div class="info-row"><span class="info-row-label">Endereço:</span><span>${escapeHtml(clienteEndereco)}</span></div>
                <div class="info-row"><span class="info-row-label">Cidade/UF:</span><span>${escapeHtml(`${clienteCidade}${clienteEstado ? ` - ${clienteEstado}` : ''}`)}</span></div>
                <div class="info-row"><span class="info-row-label">CEP:</span><span>${escapeHtml(clienteCep)}</span></div>
                <div class="info-row"><span class="info-row-label">Telefone:</span><span>${escapeHtml(clienteTelefone)}</span></div>
              </div>
            </div>
            <div class="card">
              <div class="sale-info">
                <div class="sale-info-row"><strong>DATA DA VENDA:</strong><span>${escapeHtml(dataOperacao.date)}</span></div>
                <div class="sale-info-row"><strong>CONDIÇÃO DE PAGAMENTO:</strong><span>${escapeHtml(formaPagamentoLabel)}</span></div>
                <div class="sale-info-row"><strong>VENDEDOR:</strong><span>${escapeHtml(vendedorLabel)}</span></div>
                <div class="sale-info-row"><strong>FRETE:</strong><span>${escapeHtml(freteLabel)}</span></div>
              </div>
            </div>
          </div>

          <div class="table-card">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:50px;">PRODUTO</th>
                  <th style="text-align:left;">DESCRIÇÃO</th>
                  <th style="width:78px;">QUANT.</th>
                  <th style="width:70px;">UNID.</th>
                  <th style="width:108px;">PREÇO CX (R$)</th>
                  <th style="width:118px;">VALOR TOTAL (R$)</th>
                </tr>
              </thead>
              <tbody>${itensRows}</tbody>
            </table>
          </div>

          <div class="summary-row">
            <div class="summary-box">
              <h3 class="summary-title">RESUMO DA VENDA</h3>
              <div class="summary-grid">
                <div class="summary-grid-row">
                  <span>QUANTIDADE TOTAL DE CAIXAS:</span>
                  <span class="value">${escapeHtml(quantidadeLabel)}</span>
                </div>
                <div class="summary-grid-row">
                  <span>VALOR TOTAL DA VENDA:</span>
                  <span class="value">${formatCurrency(valorTotal)}</span>
                </div>
              </div>
            </div>
            <div class="summary-box grand-total">
              <div class="summary-title">VALOR TOTAL DA VENDA</div>
              <strong>${formatCurrency(valorTotal)}</strong>
            </div>
          </div>

          <div class="payment-box">
            <div class="section-header">CONDIÇÕES DE PAGAMENTO</div>
            <div class="payment-grid">
              <div class="payment-cell"><span class="payment-label">VALOR PAGO:</span><span class="payment-value">${formatCurrency(valorPago)}</span></div>
              <div class="payment-cell"><span class="payment-label">DATA DO PAGAMENTO:</span><span class="payment-value">${escapeHtml(dataPagamentoLabel)}</span></div>
              <div class="payment-cell"><span class="payment-label">VALOR PENDENTE:</span><span class="payment-value ${valorPendente > 0 ? 'negative' : ''}">${formatCurrency(valorPendente)}</span></div>
              <div class="payment-cell"><span class="payment-label">QUANTIDADE A PAGAR:</span><span class="payment-value">${escapeHtml(quantidadeLabel)}</span></div>
              <div class="payment-cell"><span class="payment-label">VENCIMENTO:</span><span class="payment-value ${valorPendente > 0 ? 'negative' : ''}">${escapeHtml(valorPendente > 0 ? `${vencimentoLabel} (${formaPagamentoLabel})` : '-')}</span></div>
              <div class="payment-cell"><span class="payment-label">FORMA DE PAGAMENTO:</span><span class="payment-value">${escapeHtml(String(metodoPagamento).replace(/_/g, ' ').toUpperCase())}</span></div>
            </div>
          </div>

          <div class="obs-box">
            <div class="obs-wrap">
              <div>
                <div class="obs-title">OBSERVAÇÕES:</div>
                ${observacoesLista.map((obs) => `<div class="obs-line">${escapeHtml(obs)}</div>`).join('')}
              </div>
              <div class="sign-box">
                <div class="sign-line">Assinatura do Cliente</div>
                <div class="sign-date">Data: ______/______/______</div>
              </div>
            </div>
          </div>

          <div class="footer-note">Obrigado por escolher a ${escapeHtml(RECEIPT_BRAND_NAME)}!</div>
          <div class="contact-bar">
            <div>${escapeHtml(clienteTelefone)}</div>
            <div>${escapeHtml(contactEmail)}</div>
            <div>${escapeHtml(website)}</div>
            <div>${escapeHtml(`${clienteCidade}${clienteEstado ? ` - ${clienteEstado}` : ''}`)}</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const gerarComprovantePDF = async (input: ComprovantePDFInput) => {
  const logoBase64 = await resolveReceiptLogoBase64(input);
  const htmlString = buildEstufaVerdeVivoReceiptHtml(input, logoBase64);
  const { uri } = await Print.printToFileAsync({ html: htmlString });
  return uri;
};

export const compartilharPDF = async (input: ComprovantePDFInput) => {
  if (isShareLocked()) {
    throw new Error('Já existe um PDF sendo gerado. Aguarde alguns segundos.');
  }
  setShareLocked(true);
  try {
    if (typeof document !== 'undefined') {
      const printWindow = openPrintWindowOnWeb();
      try {
        const logoBase64 = await resolveReceiptLogoBase64(input);
        const htmlString = buildEstufaVerdeVivoReceiptHtml(input, logoBase64);
        await printHtmlOnWeb(htmlString, 'Comprovante de venda', printWindow);
      } catch (error) {
        printWindow?.close();
        throw error;
      }
      return;
    }

    const uri = await gerarComprovantePDF(input);
    const dataOperacao = toDate(
      input.colheita.dataVenda || input.colheita.dataColheita
    );
    const dataToken = dataOperacao.toISOString().slice(0, 10);
    const clienteToken = sanitizeFilenameSegment(
      input.cliente?.nome || 'cliente-avulso'
    );
    const codigoToken = sanitizeFilenameSegment(
      friendlyCode(input.colheita.id, 'VENDA')
    );
    const nomeArquivo = `Comprovante_${clienteToken}_${dataToken}_${codigoToken}.pdf`;
    const destinoUri = await preparePdfForNativeSharing(uri, nomeArquivo);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      try {
        await Sharing.shareAsync(destinoUri, {
          mimeType: 'application/pdf',
          dialogTitle: nomeArquivo,
          ...(Platform.OS === 'ios' ? { UTI: 'com.adobe.pdf' } : {}),
        });
      } catch (error) {
        if (Platform.OS !== 'android') throw error;
        await Print.printAsync({ uri: destinoUri });
      }
      return;
    }

    if (Platform.OS === 'android') {
      await Print.printAsync({ uri: destinoUri });
      return;
    }

    const downloaded = await downloadPdfOnWeb(destinoUri, nomeArquivo);
    if (!downloaded) {
      throw new Error(
        'Nao foi possivel compartilhar ou baixar o PDF neste dispositivo.'
      );
    }
  } finally {
    setShareLocked(false);
  }
};

export interface RelatorioCaixaInput {
  tenantNome: string;
  periodo: string;
  responsavel: string;
  tipoFiltro: string;
  busca?: string;
  resumo: CaixaMovimentosResumo;
  movimentos: CaixaMovimento[];
}

const formatOptionalReportDate = (value?: Date) =>
  value ? formatDateTime(value).date : '-';

const caixaMovementStatusLabel = (movimento: CaixaMovimento) => {
  if (movimento.status === 'previsto') return 'AGUARDANDO COMPENSAÇÃO';
  return movimento.tipo === 'entrada' ? 'RECEBIDO' : 'PAGO';
};

export const buildRelatorioCaixaHtml = (input: RelatorioCaixaInput) => {
  const stats = summarizeCaixaReport(input.movimentos);
  const quantitiesLabel = stats.quantidadesPorUnidade.length
    ? stats.quantidadesPorUnidade
        .map(
          (item) =>
            `${formatQuantity(item.quantidade)} ${item.unidade.toUpperCase()}`
        )
        .join(' • ')
    : 'Sem quantidades informadas';

  const paymentRows = stats.pagamentos
    .map(
      (item) => `
        <tr>
          <td><strong>${escapeHtml(item.metodo)}</strong></td>
          <td class="align-right">${item.quantidade}</td>
          <td class="align-right entrada">${formatCurrency(item.confirmado)}</td>
          <td class="align-right previsto">${formatCurrency(item.previsto)}</td>
        </tr>
      `
    )
    .join('');

  const movementRows = input.movimentos
    .map((movimento) => {
      const itemDetails = movimento.itens.length
        ? movimento.itens
            .map(
              (item) => `
                <div class="item-line">
                  <strong>${escapeHtml(item.descricao)}</strong><br />
                  ${escapeHtml(formatQuantity(item.quantidade))} ${escapeHtml(String(item.unidade || 'un').toUpperCase())}
                  × ${formatCurrency(item.valorUnitario)} = ${formatCurrency(item.valorTotal)}
                </div>
              `
            )
            .join('')
        : `<div class="item-line"><strong>${escapeHtml(movimento.descricao)}</strong></div>`;
      const statusLabel = caixaMovementStatusLabel(movimento);
      const statusClass =
        movimento.status === 'previsto'
          ? 'status-pending'
          : movimento.tipo === 'entrada'
            ? 'status-paid'
            : 'status-expense';
      const combinedValue = Number(
        movimento.valorCombinado ?? movimento.valor ?? 0
      );
      const receivedValue =
        movimento.valorRecebido != null
          ? formatCurrency(movimento.valorRecebido)
          : '-';
      const notes = [
        movimento.categoria ? `Categoria: ${movimento.categoria}` : '',
        movimento.observacoes || '',
      ]
        .filter(Boolean)
        .join(' • ');

      return `
        <tr>
          <td>
            <strong>Caixa:</strong> ${formatOptionalReportDate(movimento.data)}
            ${movimento.dataVenda ? `<div><strong>Venda:</strong> ${formatOptionalReportDate(movimento.dataVenda)}</div>` : ''}
            ${movimento.dataRecebimento ? `<div><strong>Baixa:</strong> ${formatOptionalReportDate(movimento.dataRecebimento)}</div>` : ''}
            ${movimento.dataCompensacaoCheque ? `<div><strong>Compensação:</strong> ${formatOptionalReportDate(movimento.dataCompensacaoCheque)}</div>` : ''}
            ${movimento.dataVencimento ? `<div><strong>Venc.:</strong> ${formatOptionalReportDate(movimento.dataVencimento)}</div>` : ''}
          </td>
          <td>
            <strong>${escapeHtml(movimento.clienteNome || (movimento.tipo === 'entrada' ? 'Cliente avulso' : '-'))}</strong>
            <div>Caixa: ${escapeHtml(movimento.caixaPessoaNome)}</div>
          </td>
          <td>
            <strong>${escapeHtml(movimento.origem === 'venda' ? movimento.origemProducao || 'Venda' : 'Despesa')}</strong>
            <div>${escapeHtml(movimento.descricao)}</div>
            <div class="reference">Ref.: ${escapeHtml(movimento.referenciaId)}</div>
          </td>
          <td>${itemDetails}</td>
          <td>
            <strong>${escapeHtml(
              String(movimento.metodoPagamento || '-')
                .replace(/_/g, ' ')
                .toUpperCase()
            )}</strong>
            <div><span class="status ${statusClass}">${escapeHtml(statusLabel)}</span></div>
          </td>
          <td class="values-cell">
            ${movimento.origem === 'venda' ? `<div>Combinado: <strong>${formatCurrency(combinedValue)}</strong></div>` : ''}
            ${movimento.origem === 'venda' ? `<div>Recebido: <strong>${receivedValue}</strong></div>` : ''}
            <div>Caixa: <strong class="${movimento.tipo === 'entrada' ? 'entrada' : 'saida'}">${movimento.tipo === 'entrada' ? '+' : '-'} ${formatCurrency(movimento.valor)}</strong></div>
          </td>
          <td>${escapeHtml(notes || '-')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #17231c; font-size: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; padding: 16px 18px; color: #fff; background: #0f5a2e; border-radius: 10px; }
          .header h1 { margin: 3px 0; font-size: 24px; }
          .header p { margin: 2px 0; }
          .eyebrow { text-transform: uppercase; letter-spacing: 1.2px; font-weight: bold; opacity: .75; }
          .header-meta { text-align: right; line-height: 1.5; }
          .filters { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1.5fr; gap: 8px; margin: 12px 0; }
          .filter { padding: 8px 10px; border: 1px solid #d9e5dc; border-radius: 7px; background: #f7faf8; }
          .filter span { display: block; color: #66736b; font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; }
          .summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 12px 0; }
          .summary-item { padding: 10px; border-radius: 8px; border: 1px solid #d9e5dc; background: #fff; }
          .summary-item label { display: block; color: #66736b; font-size: 8px; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
          .summary-item strong { font-size: 14px; }
          .section-title { margin: 16px 0 6px; padding-left: 8px; border-left: 4px solid #20a45a; font-size: 14px; }
          .quantity-line { padding: 8px 10px; border-radius: 7px; background: #edf7f0; color: #244c32; }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          th, td { border: 1px solid #dfe7e1; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #edf4ef; color: #284634; font-size: 8px; text-transform: uppercase; }
          .payment-table { width: 62%; margin-bottom: 10px; }
          .details { table-layout: fixed; }
          .details th:nth-child(1) { width: 13%; }
          .details th:nth-child(2) { width: 13%; }
          .details th:nth-child(3) { width: 12%; }
          .details th:nth-child(4) { width: 21%; }
          .details th:nth-child(5) { width: 12%; }
          .details th:nth-child(6) { width: 15%; }
          .details th:nth-child(7) { width: 14%; }
          .item-line + .item-line { border-top: 1px dotted #cbd7ce; margin-top: 4px; padding-top: 4px; }
          .reference { color: #7a857e; font-size: 8px; word-break: break-all; }
          .values-cell { line-height: 1.5; }
          .align-right { text-align: right; }
          .entrada { color: #14733b; font-weight: bold; }
          .saida { color: #a32a2a; font-weight: bold; }
          .previsto { color: #a36500; font-weight: bold; }
          .status { display: inline-block; margin-top: 4px; padding: 3px 5px; border-radius: 999px; font-size: 7px; font-weight: bold; }
          .status-paid { color: #126534; background: #dcf5e5; }
          .status-pending { color: #925a00; background: #fff0c7; }
          .status-expense { color: #8e2828; background: #fde3e3; }
          .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #dfe7e1; text-align: center; color: #748078; font-size: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="eyebrow">Financeiro • Caixa</div>
            <h1>Relatório detalhado do caixa</h1>
            <p>${escapeHtml(input.tenantNome)}</p>
          </div>
          <div class="header-meta">
            <div><strong>Período:</strong> ${escapeHtml(input.periodo)}</div>
            <div><strong>Emitido:</strong> ${formatDateTime(new Date()).date} ${formatDateTime(new Date()).time}</div>
          </div>
        </div>

        <div class="filters">
          <div class="filter"><span>Responsável do caixa</span>${escapeHtml(input.responsavel)}</div>
          <div class="filter"><span>Tipo de movimento</span>${escapeHtml(input.tipoFiltro)}</div>
          <div class="filter"><span>Registros encontrados</span>${input.movimentos.length}</div>
          <div class="filter"><span>Busca aplicada</span>${escapeHtml(input.busca || 'Nenhuma')}</div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <label>Entradas confirmadas</label>
            <strong class="entrada">${formatCurrency(input.resumo.entradas)}</strong>
          </div>
          <div class="summary-item">
            <label>Saídas confirmadas</label>
            <strong class="saida">${formatCurrency(input.resumo.saidas)}</strong>
          </div>
          <div class="summary-item">
            <label>Saldo confirmado</label>
            <strong>${formatCurrency(input.resumo.saldo)}</strong>
          </div>
          <div class="summary-item"><label>Cheques previstos</label><strong class="previsto">${formatCurrency(input.resumo.entradasPrevistas)}</strong></div>
          <div class="summary-item"><label>Vendas listadas</label><strong>${stats.vendasConfirmadas + stats.vendasPrevistas}</strong></div>
          <div class="summary-item"><label>Total de caixas</label><strong>${formatQuantity(stats.totalCaixas)}</strong></div>
        </div>

        <div class="quantity-line"><strong>Quantidades vendidas por unidade:</strong> ${escapeHtml(quantitiesLabel)}</div>

        ${
          paymentRows
            ? `
          <h2 class="section-title">Conferência por meio de pagamento</h2>
          <table class="payment-table">
            <thead><tr><th>Meio de pagamento</th><th class="align-right">Vendas</th><th class="align-right">Confirmado</th><th class="align-right">Previsto</th></tr></thead>
            <tbody>${paymentRows}</tbody>
          </table>
        `
            : ''
        }

        <h2 class="section-title">Movimentações conforme os filtros</h2>
        <table class="details">
          <thead>
            <tr>
              <th>Datas</th>
              <th>Cliente / responsável</th>
              <th>Origem / referência</th>
              <th>Produtos, caixas e valores unitários</th>
              <th>Pagamento / situação</th>
              <th>Valores</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>${movementRows}</tbody>
        </table>
        <div class="footer">
          Relatório gerado a partir de todos os registros encontrados pelos filtros do Extrato do Caixa. Entradas previstas não compõem o saldo confirmado.
        </div>
      </body>
    </html>
  `;
};

export const gerarRelatorioCaixaPDF = async (input: RelatorioCaixaInput) => {
  if (isShareLocked()) {
    throw new Error('Já existe uma exportação em andamento.');
  }

  setShareLocked(true);
  try {
    const html = buildRelatorioCaixaHtml(input);
    const { uri } = await Print.printToFileAsync({ html });

    const nomeArquivo = `Relatorio_Caixa_${sanitizeFilenameSegment(input.responsavel)}_${sanitizeFilenameSegment(input.periodo)}.pdf`;
    const destinoUri = await preparePdfForNativeSharing(uri, nomeArquivo);

    if (await Sharing.isAvailableAsync()) {
      try {
        await Sharing.shareAsync(destinoUri, {
          mimeType: 'application/pdf',
          dialogTitle: nomeArquivo,
          ...(Platform.OS === 'ios' ? { UTI: 'com.adobe.pdf' } : {}),
        });
      } catch (error) {
        if (Platform.OS !== 'android') throw error;
        await Print.printAsync({ uri: destinoUri });
      }
      return;
    }

    if (Platform.OS === 'android') {
      await Print.printAsync({ uri: destinoUri });
      return;
    }

    const downloaded = await downloadPdfOnWeb(destinoUri, nomeArquivo);
    if (!downloaded) {
      throw new Error('Não foi possível compartilhar ou baixar o PDF.');
    }
  } finally {
    setShareLocked(false);
  }
};
