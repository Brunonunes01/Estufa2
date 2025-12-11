// src/services/receiptService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colheita } from '../types/domain';

interface ReceiptData {
  venda: Colheita;
  nomeProdutor: string;
  nomeCliente: string;
  nomeProduto: string; 
  nomeEstufa: string;
}

export const shareVendaReceipt = async (data: ReceiptData) => {
  const { venda, nomeProdutor, nomeCliente, nomeProduto, nomeEstufa } = data;

  const qtd = venda.quantidade;
  const precoUnit = (venda.precoUnitario || 0);
  const total = (qtd * precoUnit);
  
  // Formatadores
  const fmtMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataVenda = venda.dataColheita.toDate().toLocaleDateString('pt-BR');
  const horaVenda = venda.dataColheita.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  // Pega iniciais do produtor para criar um "Logo"
  const iniciais = nomeProdutor.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Roboto', Helvetica, Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
            color: #333;
          }
          .container {
            max-width: 800px;
            margin: 20px auto;
            background: #fff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          }
          
          /* HEADER */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand {
            display: flex;
            align-items: center;
          }
          .logo-box {
            width: 50px;
            height: 50px;
            background-color: #4CAF50;
            color: #fff;
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            margin-right: 15px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2E7D32;
            margin: 0;
          }
          .company-sub {
            font-size: 12px;
            color: #666;
            margin-top: 2px;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .date {
            font-size: 14px;
            color: #555;
            margin-top: 5px;
          }

          /* INFO GRID */
          .info-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .info-col {
            width: 48%;
          }
          .section-title {
            font-size: 12px;
            color: #888;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          .info-value {
            font-size: 16px;
            font-weight: 500;
            color: #333;
          }
          .info-sub {
            font-size: 13px;
            color: #666;
          }

          /* TABLE */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #E8F5E9;
            color: #2E7D32;
            text-align: left;
            padding: 12px 15px;
            font-size: 12px;
            text-transform: uppercase;
          }
          td {
            padding: 15px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }

          /* TOTALS */
          .totals-box {
            display: flex;
            justify-content: flex-end;
          }
          .totals-table {
            width: 250px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
            color: #666;
          }
          .grand-total {
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 18px;
            font-weight: bold;
            color: #2E7D32;
          }

          /* FOOTER */
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #aaa;
            border-top: 1px dashed #ddd;
            padding-top: 20px;
          }
          .badge {
            background-color: #E3F2FD;
            color: #1976D2;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        
        <div class="container">
          <div class="header">
            <div class="brand">
              <div class="logo-box">${iniciais}</div>
              <div>
                <h1 class="company-name">${nomeProdutor}</h1>
                <div class="company-sub">Gestão de Estufas</div>
              </div>
            </div>
            <div class="invoice-details">
              <div class="invoice-title">Recibo de Venda</div>
              <div class="date">${dataVenda} às ${horaVenda}</div>
              <div style="margin-top: 5px;">
                ${venda.metodoPagamento ? `<span class="badge">${venda.metodoPagamento}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <div class="section-title">Cliente</div>
              <div class="info-value">${nomeCliente}</div>
              <div class="info-sub">${venda.destino ? venda.destino : 'Venda Avulsa'}</div>
            </div>
            <div class="info-col" style="text-align: right;">
              <div class="section-title">Vendedor</div>
              <div class="info-value">${venda.registradoPor || 'Sistema'}</div>
              <div class="info-sub">Origem: ${nomeEstufa}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="50%">Descrição do Produto</th>
                <th width="15%" class="text-right">Qtd.</th>
                <th width="15%" class="text-right">Preço Unit.</th>
                <th width="20%" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span class="font-bold">${nomeProduto}</span><br>
                  <span style="color: #888; font-size: 12px;">Unidade: ${venda.unidade}</span>
                </td>
                <td class="text-right">${qtd}</td>
                <td class="text-right">${fmtMoeda(precoUnit)}</td>
                <td class="text-right font-bold">${fmtMoeda(total)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals-box">
            <div class="totals-table">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span>${fmtMoeda(total)}</span>
              </div>
              <div class="totals-row">
                <span>Descontos:</span>
                <span>R$ 0,00</span>
              </div>
              <div class="totals-row grand-total">
                <span>Total a Pagar:</span>
                <span>${fmtMoeda(total)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Este documento não possui valor fiscal.</p>
            <p>Obrigado pela preferência!</p>
          </div>
        </div>

      </body>
    </html>
  `;

  try {
    // Gera o PDF
    const { uri } = await Print.printToFileAsync({ html });
    
    // Abre opção de compartilhar
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error("Erro ao gerar recibo:", error);
    throw new Error("Não foi possível gerar o comprovante.");
  }
};