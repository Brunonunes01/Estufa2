type DashboardSyncEntity = 'venda' | 'despesa' | 'plantio' | 'tarefa' | 'colheita';
type DashboardSyncAction = 'create' | 'update' | 'delete' | 'status_change';

export interface DashboardSyncTriggerInput {
  tenantId: string;
  entity: DashboardSyncEntity;
  action: DashboardSyncAction;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
}

const WEBHOOK_URL = (process.env.EXPO_PUBLIC_AUTOMATION_WEBHOOK_URL || '').trim();
const WEBHOOK_SECRET = (process.env.EXPO_PUBLIC_AUTOMATION_WEBHOOK_SECRET || '').trim();
const REQUEST_TIMEOUT_MS = 3500;

const shouldTriggerExternalSync = () =>
  WEBHOOK_URL.length > 0 && /^https?:\/\//i.test(WEBHOOK_URL);

export const triggerExternalDashboardSync = async (input: DashboardSyncTriggerInput) => {
  if (!shouldTriggerExternalSync()) return;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WEBHOOK_SECRET ? { 'x-automation-secret': WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({
        event: 'dashboard.sync.requested',
        tenantId: input.tenantId,
        entity: input.entity,
        action: input.action,
        recordId: input.recordId || null,
        metadata: input.metadata || null,
        requestedAt: new Date().toISOString(),
      }),
      signal: controller?.signal,
    });
  } catch (_error) {
    // Intencionalmente silencioso para não quebrar o fluxo principal da operação.
  } finally {
    clearTimeout(timeoutId);
  }
};

