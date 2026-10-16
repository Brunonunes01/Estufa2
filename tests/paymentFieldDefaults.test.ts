import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const readSource = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

test('novas vendas iniciam sem forma de pagamento e sem caixa preselecionado', () => {
  const fieldSale = readSource(
    '../src/screens/Colheitas/ColheitaFormScreen.tsx'
  );

  assert.match(
    fieldSale,
    /useState<MetodoPagamento \| ''>\(\s*''\s*\)/,
    'a forma de pagamento deve iniciar vazia'
  );
  assert.match(
    fieldSale,
    /label="Selecione a forma de pagamento\.\.\."\s+value=""/,
    'o seletor deve exibir uma opcao vazia'
  );
  assert.doesNotMatch(
    fieldSale,
    /setPagamentoPara\(pessoasCaixa\[0\]\.id\)/,
    'o primeiro caixa nao deve ser escolhido automaticamente'
  );
});

test('novas baixas iniciam sem forma recebida e usam o responsável do cheque quando informado', () => {
  const salesList = readSource('../src/screens/Vendas/VendasListScreen.tsx');
  const accountsReceivable = readSource(
    '../src/screens/Financeiro/ContasReceberScreen.tsx'
  );

  assert.match(
    salesList,
    /openReceiptConfirmation[\s\S]{0,240}setMetodoRecebimento\(''\);[\s\S]{0,100}setPagamentoPara\(venda\.pagamentoPara \|\| null\)/
  );
  assert.match(
    accountsReceivable,
    /handleOpenReceber[\s\S]{0,200}setMetodoRecebimento\(''\);[\s\S]{0,100}setPagamentoPara\(item\.pagamentoPara \|\| null\)/
  );

  for (const source of [salesList, accountsReceivable]) {
    assert.match(
      source,
      /label="Selecione a forma de recebimento\.\.\."\s+value=""/
    );
    assert.match(
      source,
      /if \(!metodoRecebimento\)[\s\S]{0,180}Selecione como o pagamento foi recebido/
    );
  }
});

test('correcao de recebimento preserva os dados ja gravados', () => {
  const salesList = readSource('../src/screens/Vendas/VendasListScreen.tsx');

  assert.match(
    salesList,
    /openReceiptCorrection[\s\S]{0,300}venda\.metodoPagamento \|\| venda\.formaPagamento \|\| ''[\s\S]{0,100}setPagamentoPara\(venda\.pagamentoPara \|\| null\)/
  );
});
