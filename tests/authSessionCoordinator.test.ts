import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthSessionCoordinator } from '../src/services/authSessionCoordinator.ts';

test('auth session coordinator usa evento pendente antes da sessao inicial', async () => {
  let listener: ((sessionUser: unknown) => void) | null = null;
  const callbacks: Array<string | null> = [];

  const coordinator = createAuthSessionCoordinator({
    subscribe: (nextListener) => {
      listener = nextListener;
      return () => {
        listener = null;
      };
    },
    getSession: async () => {
      await Promise.resolve();
      return { session: { user: { id: 'session-user' } } };
    },
    mapSessionUser: (user) => (user && typeof user === 'object' ? ({ id: (user as { id: string }).id } as never) : null),
    clearInvalidLocalSession: async () => {},
    isInvalidRefreshTokenError: () => false,
  });

  const unsubscribe = coordinator.onAuthStateChanged((user) => {
    callbacks.push(user?.id ?? null);
  });

  listener?.({ id: 'event-user' });
  await Promise.resolve();
  await Promise.resolve();
  unsubscribe();

  assert.deepEqual(callbacks, ['event-user']);
});

test('auth session coordinator encerra loading com null quando getSession falha', async () => {
  const callbacks: Array<string | null> = [];
  const reportedErrors: unknown[] = [];

  const coordinator = createAuthSessionCoordinator({
    subscribe: () => () => {},
    getSession: async () => {
      throw new Error('network down');
    },
    mapSessionUser: (user) => (user && typeof user === 'object' ? ({ id: (user as { id: string }).id } as never) : null),
    clearInvalidLocalSession: async () => {},
    isInvalidRefreshTokenError: () => false,
    reportError: (error) => {
      reportedErrors.push(error);
    },
  });

  coordinator.onAuthStateChanged((user) => {
    callbacks.push(user?.id ?? null);
  });

  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(callbacks, [null]);
  assert.equal(reportedErrors.length, 1);
});
