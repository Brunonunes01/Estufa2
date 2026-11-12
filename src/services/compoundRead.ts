import { ServiceError, toServiceError } from './serviceError.ts';

export type CompoundSourceKind = 'essential' | 'auxiliary' | 'optional';
export type CompoundSource<T> = { name: string; kind: CompoundSourceKind; read: () => Promise<T> };
export type CompoundReadResult<T> = { data: Partial<Record<string, T>>; errors: Record<string, ServiceError>; degradedSources: string[] };

export const readCompound = async <T>(sources: CompoundSource<T>[]): Promise<CompoundReadResult<T>> => {
  const settled = await Promise.all(sources.map(async (source) => ({ source, result: await source.read().then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  ) })));
  const data: Partial<Record<string, T>> = {};
  const errors: Record<string, ServiceError> = {};
  const degradedSources: string[] = [];
  for (const { source, result } of settled) {
    if (result.ok) data[source.name] = result.value;
    else {
      const sourceError = (result as { ok: false; error: unknown }).error;
      const normalized = toServiceError(sourceError);
      errors[source.name] = new ServiceError(normalized.category, normalized.message, { cause: sourceError, context: { source: source.name } });
      degradedSources.push(source.name);
      if (source.kind === 'essential') throw errors[source.name];
    }
  }
  return { data, errors, degradedSources };
};
