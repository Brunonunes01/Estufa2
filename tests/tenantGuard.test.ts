import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertSameTenantScope,
  assertTenantId,
  assertTenantOperation,
  isTenantIdValid,
} from '../src/services/tenantGuard.ts';

test('assertTenantId trims valid ids', () => {
  assert.equal(assertTenantId(' tenant-1 '), 'tenant-1');
});

test('assertTenantId rejects empty ids', () => {
  assert.throws(() => assertTenantId('  '), /Tenant inv/i);
});

test('isTenantIdValid reconhece tenant valido', () => {
  assert.equal(isTenantIdValid(' tenant-1 '), true);
  assert.equal(isTenantIdValid('  '), false);
});

test('assertSameTenantScope aceita ids equivalentes e rejeita divergencia', () => {
  assert.equal(assertSameTenantScope(' tenant-1 ', 'tenant-1'), 'tenant-1');
  assert.throws(() => assertSameTenantScope('tenant-1', 'tenant-2'), /Escopo de tenant divergente/i);
});

test('fluxos preservados usam o tenant selecionado sem fallback cruzado', () => {
  assert.equal(assertSameTenantScope('tenant-estufa-1', 'tenant-estufa-1'), 'tenant-estufa-1');
  assert.throws(
    () => assertSameTenantScope('tenant-estufa-1', 'tenant-outro'),
    /Escopo de tenant divergente/i
  );
});

test('protected greenhouse operation requires matching tenant and permission', () => {
  const access = {
    canRead: true,
    canWrite: true,
    canDelete: false,
    canManageSharing: false,
  };

  assert.equal(
    assertTenantOperation({
      expectedTenantId: 'tenant-estufa-1',
      receivedTenantId: ' tenant-estufa-1 ',
      access,
      operation: 'write',
    }),
    'tenant-estufa-1'
  );
  assert.throws(
    () =>
      assertTenantOperation({
        expectedTenantId: 'tenant-estufa-1',
        receivedTenantId: 'tenant-outro',
        access,
        operation: 'write',
      }),
    /Escopo de tenant divergente/i
  );
  assert.throws(
    () =>
      assertTenantOperation({
        expectedTenantId: 'tenant-estufa-1',
        receivedTenantId: 'tenant-estufa-1',
        access,
        operation: 'delete',
      }),
    /Permissao insuficiente/i
  );
});

test('protected operation rejects missing or unavailable tenant scope before permission', () => {
  const access = {
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManageSharing: true,
  };

  assert.throws(
    () =>
      assertTenantOperation({
        expectedTenantId: '',
        receivedTenantId: 'tenant-estufa-1',
        access,
        operation: 'read',
      }),
    /Tenant invalido/i
  );
  assert.throws(
    () =>
      assertTenantOperation({
        expectedTenantId: 'tenant-estufa-1',
        receivedTenantId: null,
        access,
        operation: 'read',
      }),
    /Tenant invalido/i
  );
});

test('active greenhouse services keep using the common tenant guard', () => {
  const source = [
    'src/services/estufaService.ts',
    'src/services/plantioService.ts',
    'src/services/colheitaService.ts',
    'src/services/vendaService.ts',
    'src/services/despesaService.ts',
  ].map((file) => readFileSync(file, 'utf8')).join('\n');

  assert.match(source, /assertTenantId/);
});
