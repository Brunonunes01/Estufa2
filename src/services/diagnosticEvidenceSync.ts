import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDiagnosticEvidenceBuffer, type DiagnosticScope } from './diagnosticEvidence.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';
import type { Json } from '../types/supabase.ts';

const buffer = createDiagnosticEvidenceBuffer(AsyncStorage);

export const syncDiagnosticEvidence = async (scope: DiagnosticScope) => {
  if (!isSupabaseConfigured()) return { synced: 0, pending: (await buffer.read(scope)).length };
  const events = await buffer.nextBatch(scope, 50);
  if (events.length === 0) return { synced: 0, pending: 0 };
  const rows = events.map((event) => ({
    id: event.id,
    tenant_id: scope.tenantId,
    actor_user_id: scope.authUserId,
    category: event.category,
    code: event.code,
    operation: event.operation,
    source: event.source,
    correlation_id: event.correlationId,
    safe_context: event.safeContext as Json,
    occurred_at: new Date(event.createdAt).toISOString(),
  }));
  const { error } = await getSupabaseClient().from('diagnostic_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
  await buffer.remove(scope, events.map((event) => event.id));
  return { synced: events.length, pending: (await buffer.read(scope)).length };
};
