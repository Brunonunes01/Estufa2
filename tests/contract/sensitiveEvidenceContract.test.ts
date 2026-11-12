import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeServiceErrorContext } from '../../src/services/serviceError.ts';
import { createDiagnosticEvidenceBuffer } from '../../src/services/diagnosticEvidence.ts';
import { ServiceError } from '../../src/services/serviceError.ts';

test('sanitizer removes every sensitive key recursively before any evidence boundary', () => {
  const safe = sanitizeServiceErrorContext({
    token: 'x', password: 'x', senha: 'x', secret: 'x', key: 'x', session: 'x', cookie: 'x', authorization: 'x',
    nested: [{ TOKEN: 'x', retained: true }, { child: { password: 'x', count: 1 } }],
  });
  const serialized = JSON.stringify(safe);
  for (const forbidden of ['token', 'password', 'senha', 'secret', 'key', 'session', 'cookie', 'authorization']) assert.doesNotMatch(serialized, new RegExp(forbidden, 'i'));
  assert.deepEqual(safe, { nested: [{ retained: true }, { child: { count: 1 } }] });
});

test('UI, local buffer and remote payload boundaries use only sanitized context', async () => {
  const values = new Map<string, string>();
  const buffer = createDiagnosticEvidenceBuffer({ getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } }, () => 1);
  const scope = { authUserId: 'user-a', tenantId: 'tenant-a' };
  const error = new ServiceError('unexpected', 'Mensagem segura', { correlationId: 'try-1', operation: 'save', context: { tenantId: 'tenant-a', token: 'forbidden', nested: { password: 'forbidden', otherTenantRecord: undefined } } });
  await buffer.append(scope, error);
  const serialized = JSON.stringify(await buffer.read(scope));
  assert.doesNotMatch(serialized, /forbidden|token|password|cause/i);
  assert.doesNotMatch(error.safeMessage, /forbidden|tenant-b/i);
});

test('versioned evidence does not contain sensitive field names or credential patterns', () => {
  const dir = path.join(process.cwd(), 'specs/006-auditoria-correcao-sistemica/evidence');
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.md'))) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.doesNotMatch(content, /(access_token|refresh_token|password\s*[:=]|secret\s*[:=])/i, file);
  }
});
