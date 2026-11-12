export type OperationIdentity = { logicalOperationId: string; correlationId: string };
const createUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const value = Math.floor(Math.random() * 16); return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16); });
const createId = (prefix: string, now = Date.now()) => `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export const createLogicalOperationId = (_now?: number) => createUuid();
export const createCorrelationId = (now?: number) => createId('try', now);
export const createOperationIdentity = (logicalOperationId?: string, now?: number): OperationIdentity => ({ logicalOperationId: logicalOperationId?.trim() || createLogicalOperationId(now), correlationId: createCorrelationId(now) });
export const retryOperationIdentity = (identity: Pick<OperationIdentity, 'logicalOperationId'>, now?: number) => createOperationIdentity(identity.logicalOperationId, now);
