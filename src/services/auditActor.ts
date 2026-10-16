export type AuditActor = {
  uid: string;
  name?: string | null;
};

export const normalizeAuditActor = (actor?: AuditActor | null): AuditActor | null => {
  const uid = String(actor?.uid || '').trim();
  if (!uid) return null;

  const name = String(actor?.name || '').trim();
  return {
    uid,
    name: name || null,
  };
};

export const resolveAuditActorUid = (tenantId: string, actor?: AuditActor | null) =>
  normalizeAuditActor(actor)?.uid || tenantId;

export const resolveAuditActorName = (actor?: AuditActor | null) =>
  normalizeAuditActor(actor)?.name || null;
