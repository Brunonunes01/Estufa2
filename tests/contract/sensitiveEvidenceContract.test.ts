import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('versioned evidence does not contain sensitive field names or credential patterns', () => {
  const dir = path.join(process.cwd(), 'specs/006-auditoria-correcao-sistemica/evidence');
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.md'))) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.doesNotMatch(content, /(access_token|refresh_token|password\s*[:=]|secret\s*[:=])/i, file);
  }
});
