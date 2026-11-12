export type OperationContext = { authUserId: string; tenantId: string };
export const captureOperationContext = (context: OperationContext): Readonly<OperationContext> => Object.freeze({ authUserId: context.authUserId.trim(), tenantId: context.tenantId.trim() });
export const isOperationContextCurrent = (captured: OperationContext, current: OperationContext | null | undefined) => !!current && captured.authUserId === current.authUserId.trim() && captured.tenantId === current.tenantId.trim();
export const acceptOperationResponse = <T>(captured: OperationContext, current: OperationContext | null | undefined, value: T): T | undefined => isOperationContextCurrent(captured, current) ? value : undefined;
