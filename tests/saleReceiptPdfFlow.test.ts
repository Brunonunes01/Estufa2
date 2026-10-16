import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const pdfSource = readFileSync(
  fileURLToPath(new URL('../src/services/pdfService.ts', import.meta.url)),
  'utf8'
);

test('comprovante web abre a janela antes de carregar recursos assincronos', () => {
  const shareStart = pdfSource.indexOf('export const compartilharPDF');
  const shareEnd = pdfSource.indexOf('export interface RelatorioCaixaInput');
  const shareFlow = pdfSource.slice(shareStart, shareEnd);

  const openWindowAt = shareFlow.indexOf(
    'const printWindow = openPrintWindowOnWeb()'
  );
  const loadLogoAt = shareFlow.indexOf('await resolveReceiptLogoBase64(input)');

  assert.ok(openWindowAt >= 0);
  assert.ok(loadLogoAt > openWindowAt);
});

test('falha ao carregar a logo nao impede a geracao do comprovante', () => {
  assert.match(
    pdfSource,
    /const resolveReceiptLogoBase64[\s\S]+catch \{[\s\S]+return '';/
  );
});

test('compartilhamento nativo separa as opcoes de Android e iOS', () => {
  assert.match(pdfSource, /mimeType:\s*'application\/pdf'/);
  assert.match(
    pdfSource,
    /Platform\.OS === 'ios' \? \{ UTI: 'com\.adobe\.pdf' \} : \{\}/
  );
  assert.match(pdfSource, /UTI:\s*'com\.adobe\.pdf'/);
});

test('Android usa o arquivo original e impressao como alternativas', () => {
  assert.match(
    pdfSource,
    /const preparePdfForNativeSharing[\s\S]+catch \{[\s\S]+return sourceUri;/
  );
  assert.match(
    pdfSource,
    /Platform\.OS === 'android'[\s\S]{0,120}Print\.printAsync\(\{ uri: destinoUri \}\)/
  );
});
