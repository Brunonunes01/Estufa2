import { theme } from '../theme/theme';

export const COLORS = {
  ...theme.colors,
  // Backward-compatible aliases
  card: theme.colors.cardBackground,
  modFinanceiro: theme.colors.finance,
  modClientes: theme.colors.clients,
  modDespesas: theme.colors.expenses,
  blue: theme.colors.info,
  orange: theme.colors.orange,
};

export const SPACING = theme.spacing;
export const RADIUS = theme.radius;
export const TYPOGRAPHY = theme.typography;
export const SHADOWS = theme.shadows;

export const APP_THEME = theme;
