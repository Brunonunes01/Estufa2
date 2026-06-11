import { Timestamp } from '../../lib/timestamp';

export const toNumber = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatHydroDate = (value?: Timestamp | null) => {
  if (!value || typeof (value as any).toDate !== 'function') return 'Não informado';
  return value.toDate().toLocaleDateString('pt-BR');
};

export const createHydroLotCode = (_label: string, date = new Date()) => {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();

  return `HYD-${y}${m}${d}-${h}${min}${s}-${suffix}`;
};

