type DateValue = string | number | { toDate?: () => Date } | null | undefined;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '';
};

const toDateValue = (value: DateValue) => {
  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
};

export const formatDateValue = (value: DateValue, fallback = 'Data desconhecida') => {
  const date = toDateValue(value);
  return date ? date.toLocaleDateString('pt-BR') : fallback;
};

export const formatDateTimeValue = (value: DateValue, fallback = 'Nao informado') => {
  const date = toDateValue(value);
  return date ? date.toLocaleString('pt-BR') : fallback;
};

export const normalizeInviteCodeInput = (value: string, maxLength: number) =>
  value.replace(/\s+/g, '').toUpperCase().slice(0, maxLength);

export const resolveShareScreenErrorMessage = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error).trim();
  return message || fallback;
};

export const getTenantMembersPermissionMessage = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes('somente administradores')) {
    return 'Apenas administradores deste tenant podem gerenciar parceiros.';
  }
  return null;
};
