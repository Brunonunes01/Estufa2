import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const readSource = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

test('servicos confirmam que Supabase realmente removeu a venda e a colheita', () => {
  const vendaService = readSource('../src/services/vendaService.ts');
  const colheitaService = readSource('../src/services/colheitaService.ts');

  assert.match(
    vendaService,
    /deleteVenda[\s\S]+\.delete\(\)[\s\S]+\.select\('id'\)[\s\S]+\.maybeSingle\(\)[\s\S]+if \(!deletedVenda\)/
  );
  assert.match(
    colheitaService,
    /deleteColheita[\s\S]+\.delete\(\)[\s\S]+\.select\('id'\)[\s\S]+\.maybeSingle\(\)[\s\S]+if \(!deletedColheita\)/
  );
});

test('cartao da venda oferece exclusao direta com estado de carregamento', () => {
  const card = readSource('../src/screens/Vendas/components/VendaItemCard.tsx');

  assert.match(card, /onDelete\?: \(\) => void/);
  assert.match(card, /isDeleting \? 'Excluindo\.\.\.' : 'Excluir'/);
});
