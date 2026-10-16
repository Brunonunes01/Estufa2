import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSalesAccountingWorkbook,
  SalesWorkbookXLSX,
} from '../src/services/salesExcelWorkbook.ts';

const sampleData = {
  empresa: 'Estufa Modelo',
  periodo: '01/08/2026 até 31/08/2026',
  itens: [
    {
      codigo: 'VEN-001',
      data: '10/08/2026',
      cliente: 'Mercado Central',
      documentoCliente: '12.345.678/0001-90',
      origem: 'Estufa',
      estufa: 'Estufa 01',
      lote: 'LOTE-10',
      produto: 'Tomate',
      quantidade: '20 kg',
      quantidadeValor: 20,
      quantidadeUnidade: 'kg',
      precoUnitario: 8.5,
      valorTotal: 170,
      valorRecebido: 165,
      metodoPagamento: 'PIX',
      status: 'PAGO',
      statusContabil: 'PAGO',
      dataRecebimento: '11/08/2026',
      recebidoPor: 'Caixa principal',
      observacoes: 'Desconto de R$ 5,00',
    },
    {
      codigo: 'VEN-002',
      data: '12/08/2026',
      cliente: 'Feira do Bairro',
      origem: 'Campo',
      estufa: 'Talhão Norte',
      lote: 'CAMPO-02',
      produto: 'Alface',
      quantidade: '30 un',
      quantidadeValor: 30,
      quantidadeUnidade: 'un',
      precoUnitario: 2,
      valorTotal: 60,
      valorChequeEmMaos: 60,
      metodoPagamento: 'CHEQUE',
      formaPagamento: 'cheque_em_maos',
      status: 'PENDENTE',
      statusContabil: 'CHEQUE EM MÃOS',
      dataCompensacaoCheque: '25/08/2026',
    },
  ],
};

test('gera Excel gerencial com consolidado, todas as vendas e abas por cliente', () => {
  const workbook = buildSalesAccountingWorkbook(sampleData);

  assert.deepEqual(workbook.SheetNames.slice(0, 3), [
    'Resumo Executivo',
    'Todas as Vendas',
    'Resumo por Cliente',
  ]);
  assert.equal(workbook.SheetNames.length, 5);
  assert.ok(
    workbook.SheetNames.some((name) => name.startsWith('Cliente - Feira'))
  );
  assert.ok(
    workbook.SheetNames.some((name) => name.startsWith('Cliente - Mercado'))
  );
  assert.match(
    workbook.Sheets['Resumo por Cliente'].I5.l?.Target || '',
    /^#'Cliente - Feira/
  );
});

test('mantém cabeçalhos corretos e tipos numéricos na aba de todas as vendas', () => {
  const workbook = buildSalesAccountingWorkbook(sampleData);
  const sheet = workbook.Sheets['Todas as Vendas'];
  const [headers] = SalesWorkbookXLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    range: 3,
  });

  assert.deepEqual(headers, [
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
  ]);
  assert.equal(sheet.A5.t, 'd');
  assert.equal(sheet.E5.v, 20);
  assert.equal(sheet.H5.t, 'n');
  assert.equal(sheet.H5.v, 170);
  assert.equal(sheet.I5.v, 165);
  assert.equal(sheet.J6.v, 60);
  assert.equal(sheet.K6.v, 60);
  assert.equal(sheet.N6.v, 'CHEQUE EM MÃOS');
  assert.equal(sheet.H7.v, 230);
  assert.notEqual(sheet.A1.v, '0');
  assert.ok(sheet['!autofilter']);
});

test('serializa um xlsx válido preservando estilos e formatos financeiros', () => {
  const workbook = buildSalesAccountingWorkbook(sampleData);
  const bytes = SalesWorkbookXLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    cellStyles: true,
  });
  const reopened = SalesWorkbookXLSX.read(bytes, {
    type: 'buffer',
    cellDates: true,
    cellStyles: true,
  });
  const sheet = reopened.Sheets['Todas as Vendas'];

  assert.ok(bytes.length > 10_000);
  assert.equal(sheet.A4.v, 'Data da venda');
  assert.equal(sheet.H5.z, '"R$" #,##0.00;[Red]-"R$" #,##0.00');
  assert.notEqual((sheet.A4.s as any)?.fgColor?.rgb, undefined);
});
