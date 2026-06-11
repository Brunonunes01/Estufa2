export const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if (typeof value?.seconds === 'number') {
    const parsed = new Date(value.seconds * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateSafe = (value: any, locale = 'pt-BR') => {
  const parsed = toDateSafe(value);
  return parsed ? parsed.toLocaleDateString(locale) : '-';
};

export const formatDateTimeSafe = (value: any, locale = 'pt-BR') => {
  const parsed = toDateSafe(value);
  return parsed ? parsed.toLocaleString(locale) : '-';
};
