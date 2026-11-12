import { ServiceError } from './serviceError.ts';
import { classifyServiceError } from './serviceErrorClassifier.ts';
export type CompoundSourceKind = 'essential' | 'auxiliary' | 'optional';
export type CompoundSource<T> = { name: string; kind: CompoundSourceKind; dependentActions?: string[]; read: () => Promise<T> };
export type CompoundSourceResult<T> = { kind: CompoundSourceKind; status: 'available' | 'failed'; data?: T; error?: ServiceError; dependentActions: string[] };
export type CompoundReadResult<T> = { sources: Record<string, CompoundSourceResult<T>>; blockedActions: string[]; degraded: boolean; data: Partial<Record<string, T>>; errors: Record<string, ServiceError>; degradedSources: string[] };
export const readCompound = async <T>(sources: CompoundSource<T>[]): Promise<CompoundReadResult<T>> => {
  const settled = await Promise.all(sources.map(async (source) => ({ source, result: await source.read().then((value) => ({ ok: true as const, value }), (error) => ({ ok: false as const, error })) })));
  const output: CompoundReadResult<T> = { sources: {}, blockedActions: [], degraded: false, data: {}, errors: {}, degradedSources: [] };
  for (const { source, result } of settled) {
    const dependentActions = source.dependentActions ?? [];
    if (result.ok) { output.data[source.name] = result.value; output.sources[source.name] = { kind: source.kind, status: 'available', data: result.value, dependentActions }; continue; }
    const failed = result as { ok: false; error: unknown };
    const error = classifyServiceError(failed.error, { operation: 'load', source: source.name, context: { source: source.name } });
    output.errors[source.name] = error; output.degradedSources.push(source.name); output.degraded = true;
    output.sources[source.name] = { kind: source.kind, status: 'failed', error, dependentActions };
    if (source.kind === 'essential') output.blockedActions.push(...dependentActions);
  }
  output.blockedActions = [...new Set(output.blockedActions)]; return output;
};
