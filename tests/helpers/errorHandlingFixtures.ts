import type { ServiceErrorContext } from '../../src/services/serviceError.ts';

export const FIXED_NOW = Date.parse('2026-11-12T12:00:00.000Z');
export const fixedClock = () => FIXED_NOW;

export const tenantFixtures = {
  alpha: { authUserId: 'user-alpha', tenantId: 'tenant-alpha' },
  beta: { authUserId: 'user-beta', tenantId: 'tenant-beta' },
} as const;

export const errorFixtures = {
  authExpired: { name: 'AuthSessionMissingError', status: 401, message: 'JWT expired' },
  rlsDenied: { code: '42501', status: 403, message: 'new row violates row-level security policy' },
  uniqueConflict: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint' },
  network: Object.assign(new TypeError('Failed to fetch'), { code: 'NETWORK_ERROR' }),
  unavailable: { status: 503, code: 'PGRST503', message: 'Service unavailable' },
  dataContract: { status: 400, code: 'PGRST204', message: 'Could not find the column' },
} as const;

export const sensitiveContextFixture: ServiceErrorContext = {
  operation: 'fixture',
  tenantId: tenantFixtures.alpha.tenantId,
  token: 'must-not-survive',
  nested: {
    password: 'must-not-survive',
    safe: 'retained',
    list: [{ authorization: 'must-not-survive', safe: true }],
  },
};
