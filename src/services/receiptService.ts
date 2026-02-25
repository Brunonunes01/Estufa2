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
  
  // Cálculos de peso (novos)
  const pLiq = venda.pesoLiquido || 0;
  const precoPorKg = (venda.unidade === 'caixa' && pLiq > 0) ? (precoUnit / pLiq) : 0;

  // Pega iniciais do produtor para criar um "Logo"
  const iniciais = nomeProdutor.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Roboto', sans-serif; margin: 0; padding: 0; color: #333; background-color: #f4f4f4; }
          .container { max-width: 800px; margin: 20px auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { display: flex; align-items: center; }
          .logo-box { width: 50px; height: 50px; background-color: #4CAF50; color: #fff; font-size: 20px; font-weight: bold; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-right: 15px; }
          .company-name { font-size: 24px; font-weight: bold; color: #2E7D32; margin: 0; }
          .invoice-details { text-align: right; }
          .invoice-title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
          
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .section-title { font-size: 12px; color: #888; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
          .info-value { font-size: 16px; font-weight: 500; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #E8F5E9; color: #2E7D32; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          
          .weight-box { background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #E5E7EB; }
          .weight-row { display: flex; gap: 20px; }
          .weight-item { flex: 1; }
          .weight-label { font-size: 11px; color: #6B7280; text-transform: uppercase; font-weight: bold; }
          .weight-val { font-size: 15px; color: #111827; font-weight: bold; }

          .totals-box { display: flex; justify-content: flex-end; }
          .totals-table { width: 250px; }
          .grand-total { border-top: 2px solid #333; padding-top: 10px; font-size: 18px; font-weight: bold; color: #2E7D32; display: flex; justify-content: space-between; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px dashed #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">
              <div class="logo-box">${iniciais}</div>
              <div>
                <h1 class="company-name">${nomeProdutor}</h1>
                <div style="font-size: 12px; color: #666;">Gestão de Estufas</div>
              </div>
            </div>
            <div class="invoice-details">
              <div class="invoice-title">Recibo de Venda</div>
              <div style="font-size: 14px;">${dataVenda} às ${horaVenda}</div>
            </div>
          </div>

          <div class="info-grid">
            <div style="width: 48%;">
              <div class="section-title">Cliente</div>
              <div class="info-value">${nomeCliente}</div>
            </div>
            <div style="width: 48%; text-align: right;">
              <div class="section-title">Origem</div>
              <div class="info-value">${nomeEstufa}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="40%">Produto</th>
                <th width="20%" style="text-align: right;">Qtd</th>
                <th width="20%" style="text-align: right;">Preço Unit.</th>
                <th width="20%" style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${nomeProduto}</strong><br><small>Unidade: ${venda.unidade}</small></td>
                <td style="text-align: right;">${qtd}</td>
                <td style="text-align: right;">${fmtMoeda(precoUnit)}</td>
                <td style="text-align: right;"><strong>${fmtMoeda(total)}</strong></td>
              </tr>
            </tbody>
          </table>

          ${venda.unidade === 'caixa' ? `
          <div class="weight-box">
            <div class="section-title" style="border:none;">Detalhes de Pesagem</div>
            <div class="weight-row">
              <div class="weight-item">
                <div class="weight-label">Peso Bruto</div>
                <div class="weight-val">${venda.pesoBruto?.toFixed(2) || '0.00'} kg</div>
              </div>
              <div class="weight-item">
                <div class="weight-label">Peso Líquido</div>
                <div class="weight-val">${venda.pesoLiquido?.toFixed(2) || '0.00'} kg</div>
              </div>
              <div class="weight-item">
                <div class="weight-label">Preço Médio / Kg</div>
                <div class="weight-val">${fmtMoeda(precoPorKg)}</div>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="totals-box">
            <div class="totals-table">
              <div class="grand-total">
                <span>Total:</span>
                <span>${fmtMoeda(total)}</span>
              </div>
              <div style="text-align: right; font-size: 12px; color: #666; margin-top: 5px;">
                Forma de Pagamento: ${venda.metodoPagamento?.toUpperCase() || 'N/A'}
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Documento sem valor fiscal gerado pelo Sistema de Gestão de Estufas.</p>
            <p>Obrigado pela preferência!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error("Erro ao gerar recibo:", error);
    throw new Error("Não foi possível gerar o comprovante.");
  }
};