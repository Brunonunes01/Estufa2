import assert from 'node:assert/strict';
import test from 'node:test';

import { createTenantSelectionStorage } from '../src/services/tenantSelectionStorage.ts';

test('tenantSelectionStorage persiste e restaura tenant por usuario', async () => {
  const values = new Map<string, string>();
  const storage = createTenantSelectionStorage({
    getItem: async (key) => values.get(key) || null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  });

  await storage.persistTenantSelection('user-1', 'tenant-1');

  assert.equal(await storage.loadPersistedTenantSelection('user-1'), 'tenant-1');
  assert.equal(await storage.loadPersistedTenantSelection('user-2'), '');
});

test('tenantSelectionStorage ignora erro de storage sem quebrar fluxo', async () => {
  const storage = createTenantSelectionStorage({
    getItem: async () => {
      throw new Error('storage down');
    },
    setItem: async () => {
      throw new Error('storage down');
    },
  });

  await storage.persistTenantSelection('user-1', 'tenant-1');
  assert.equal(await storage.loadPersistedTenantSelection('user-1'), '');
});
