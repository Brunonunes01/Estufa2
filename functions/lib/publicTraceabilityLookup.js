"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicTraceabilityLookup = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const db = (0, firestore_1.getFirestore)();
const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const normalizeToken = (value) => String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');
const toIsoString = (value) => {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    if (value instanceof firestore_1.Timestamp)
        return value.toDate().toISOString();
    const asAny = value;
    if (typeof asAny.toDate === 'function')
        return asAny.toDate().toISOString();
    if (typeof asAny.seconds === 'number')
        return new Date(asAny.seconds * 1000).toISOString();
    return null;
};
const toBrDateTime = (value) => {
    const iso = toIsoString(value);
    if (!iso)
        return 'Não informado';
    const dt = new Date(iso);
    return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
const labelOriginType = (originType) => {
    if (originType === 'hydro_lote')
        return 'Produção hidropônica';
    if (originType === 'plantio')
        return 'Produção agrícola';
    if (originType === 'seedling_lote')
        return 'Lote de mudas';
    if (originType === 'resale_lote')
        return 'Lote de revenda';
    return 'Origem não informada';
};
const renderErrorPage = (title, description, status = 400) => `
  <!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
        .wrap { max-width: 760px; margin: 36px auto; padding: 0 16px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
        h1 { margin: 0 0 12px; font-size: 20px; }
        p { margin: 0; font-size: 14px; color: #334155; line-height: 1.5; }
        .status { margin-top: 12px; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <main class="wrap">
        <section class="card">
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
          <p class="status">HTTP ${status}</p>
        </section>
      </main>
    </body>
  </html>
`;
const renderTraceabilityPage = (payload) => {
    const eventRows = payload.eventos.length > 0
        ? payload.eventos
            .map((event) => `
        <li class="timeline-item">
          <div class="timeline-title">${escapeHtml(event.acao)}</div>
          <div class="timeline-desc">${escapeHtml(event.descricao)}</div>
          <div class="timeline-time">${escapeHtml(event.momento)}</div>
        </li>
      `)
            .join('')
        : '<li class="timeline-item"><div class="timeline-desc">Sem eventos disponíveis.</div></li>';
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Rastreabilidade do Produto</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
          .wrap { max-width: 860px; margin: 24px auto; padding: 0 14px; }
          .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          .subtitle { margin: 0; color: #475569; font-size: 14px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 12px; }
          .kv { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
          .kv span { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.3px; }
          .kv strong { font-size: 14px; color: #0f172a; word-break: break-word; }
          .timeline { list-style: none; margin: 0; padding: 0; }
          .timeline-item { border-left: 3px solid #22c55e; padding: 8px 10px; margin: 0 0 8px 2px; background: #f8fafc; border-radius: 6px; }
          .timeline-title { font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; }
          .timeline-desc { font-size: 13px; color: #1f2937; margin-top: 2px; }
          .timeline-time { font-size: 12px; color: #64748b; margin-top: 4px; }
        </style>
      </head>
      <body>
        <main class="wrap">
          <section class="card">
            <h1>Rastreabilidade do Produto</h1>
            <p class="subtitle">Código público: ${escapeHtml(payload.token)}</p>
            <div class="grid">
              <div class="kv"><span>Produto</span><strong>${escapeHtml(payload.produtoNome)}</strong></div>
              <div class="kv"><span>Origem</span><strong>${escapeHtml(payload.origemLabel)}</strong></div>
              <div class="kv"><span>Código da origem</span><strong>${escapeHtml(payload.origemCodigo)}</strong></div>
              <div class="kv"><span>Cliente</span><strong>${escapeHtml(payload.clienteNome)}</strong></div>
              <div class="kv"><span>Documento do cliente</span><strong>${escapeHtml(payload.clienteDocumento)}</strong></div>
              <div class="kv"><span>Quantidade</span><strong>${escapeHtml(payload.quantidadeLabel)}</strong></div>
              <div class="kv"><span>Valor total</span><strong>${escapeHtml(payload.valorTotalLabel)}</strong></div>
              <div class="kv"><span>Status pagamento</span><strong>${escapeHtml(payload.statusPagamento)}</strong></div>
              <div class="kv"><span>Data da venda</span><strong>${escapeHtml(payload.dataVendaLabel)}</strong></div>
              <div class="kv"><span>Estufa</span><strong>${escapeHtml(payload.estufaNome)}</strong></div>
              <div class="kv"><span>ID interno da venda</span><strong>${escapeHtml(payload.vendaId)}</strong></div>
            </div>
          </section>

          <section class="card">
            <h1 style="font-size:18px">Linha do Tempo</h1>
            <ul class="timeline">${eventRows}</ul>
          </section>
        </main>
      </body>
    </html>
  `;
};
const lookupVendaByToken = async (token) => {
    const vendas = db.collection('vendas');
    const queryByToken = await vendas.where('traceabilityPublicToken', '==', token).limit(1).get();
    if (!queryByToken.empty) {
        const first = queryByToken.docs[0];
        return { id: first.id, data: first.data() };
    }
    if (token.startsWith('VENDA-')) {
        const saleId = token.replace(/^VENDA-/, '');
        if (saleId) {
            const sale = await vendas.doc(saleId).get();
            if (sale.exists) {
                return { id: sale.id, data: sale.data() };
            }
        }
    }
    return null;
};
const safeString = (value) => String(value || '').trim();
const safeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const labelStatusPagamento = (value) => {
    const status = safeString(value);
    if (status === 'pendente')
        return 'Pendente';
    if (status === 'pago')
        return 'Pago';
    if (status === 'atrasado')
        return 'Atrasado';
    if (status === 'cancelado')
        return 'Cancelado';
    return 'Não informado';
};
exports.publicTraceabilityLookup = (0, https_1.onRequest)(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).set('Content-Type', 'text/html; charset=utf-8').send(renderErrorPage('Método não permitido', 'Use apenas requisições GET para esta consulta.', 405));
        return;
    }
    const format = safeString(req.query.format).toLowerCase();
    const token = normalizeToken(req.query.token);
    if (!token) {
        const html = renderErrorPage('Código inválido', 'Informe um código de rastreabilidade válido.', 400);
        if (format === 'json') {
            res.status(400).json({ ok: false, error: 'invalid_token' });
            return;
        }
        res.status(400).set('Content-Type', 'text/html; charset=utf-8').send(html);
        return;
    }
    try {
        const venda = await lookupVendaByToken(token);
        if (!venda) {
            const html = renderErrorPage('Rastreio não encontrado', 'Não foi possível localizar o registro informado.');
            if (format === 'json') {
                res.status(404).json({ ok: false, error: 'not_found' });
                return;
            }
            res.status(404).set('Content-Type', 'text/html; charset=utf-8').send(html);
            return;
        }
        const vendaData = venda.data;
        const tenantId = safeString(vendaData.tenantId || vendaData.userId);
        const clienteId = safeString(vendaData.clienteId);
        const estufaId = safeString(vendaData.estufaId);
        const originType = safeString(vendaData.originType);
        const originId = safeString(vendaData.originId || vendaData.hydroLoteId || vendaData.plantioId);
        const [clienteSnap, estufaSnap, eventsSnap] = await Promise.all([
            clienteId ? db.collection('clientes').doc(clienteId).get() : Promise.resolve(null),
            estufaId ? db.collection('estufas').doc(estufaId).get() : Promise.resolve(null),
            db
                .collection('rastreabilidade_eventos')
                .where('tenantId', '==', tenantId)
                .where('entidadeId', '==', venda.id)
                .limit(30)
                .get(),
        ]);
        const item = Array.isArray(vendaData.itens) && vendaData.itens.length > 0 ? vendaData.itens[0] : null;
        const quantidade = safeNumber(item?.quantidade ?? vendaData.quantidade);
        const unidade = safeString(item?.unidade ?? vendaData.unidade) || 'un';
        const valorTotal = safeNumber(vendaData.valorTotal);
        const responsePayload = {
            ok: true,
            token,
            vendaId: venda.id,
            dataVenda: toIsoString(vendaData.dataVenda),
            statusPagamento: safeString(vendaData.statusPagamento),
            valorTotal,
            item: {
                descricao: safeString(item?.descricao) || 'Produto agrícola',
                quantidade,
                unidade,
            },
            origem: {
                tipo: originType || null,
                label: labelOriginType(originType),
                codigo: originId || null,
            },
            cliente: {
                nome: clienteSnap?.exists ? safeString(clienteSnap.data()?.nome) : 'Consumidor final',
                documento: clienteSnap?.exists ? safeString(clienteSnap.data()?.documento) : '',
            },
            estufa: {
                nome: estufaSnap?.exists ? safeString(estufaSnap.data()?.nome) : 'Não informada',
            },
            eventos: eventsSnap.docs
                .map((docSnap) => {
                const data = docSnap.data();
                return {
                    acao: safeString(data.acao) || 'evento',
                    descricao: safeString(data.descricao) || 'Evento registrado',
                    eventAt: toIsoString(data.eventAt || data.createdAt),
                };
            })
                .sort((a, b) => String(b.eventAt || '').localeCompare(String(a.eventAt || ''))),
        };
        if (format === 'json') {
            res.status(200).json(responsePayload);
            return;
        }
        const html = renderTraceabilityPage({
            token,
            vendaId: venda.id,
            origemLabel: responsePayload.origem.label,
            origemCodigo: responsePayload.origem.codigo || 'Não informado',
            clienteNome: responsePayload.cliente.nome || 'Consumidor final',
            clienteDocumento: responsePayload.cliente.documento || 'Não informado',
            produtoNome: responsePayload.item.descricao,
            quantidadeLabel: `${responsePayload.item.quantidade} ${responsePayload.item.unidade}`,
            valorTotalLabel: responsePayload.valorTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }),
            statusPagamento: labelStatusPagamento(responsePayload.statusPagamento),
            dataVendaLabel: toBrDateTime(vendaData.dataVenda),
            estufaNome: responsePayload.estufa.nome || 'Não informada',
            eventos: responsePayload.eventos.map((event) => ({
                acao: event.acao,
                descricao: event.descricao,
                momento: toBrDateTime(event.eventAt),
            })),
        });
        res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(html);
    }
    catch (error) {
        firebase_functions_1.logger.error('[publicTraceabilityLookup] erro inesperado', error);
        if (format === 'json') {
            res.status(500).json({ ok: false, error: 'internal_error' });
            return;
        }
        res
            .status(500)
            .set('Content-Type', 'text/html; charset=utf-8')
            .send(renderErrorPage('Erro interno', 'Falha ao consultar rastreabilidade.', 500));
    }
});
//# sourceMappingURL=publicTraceabilityLookup.js.map