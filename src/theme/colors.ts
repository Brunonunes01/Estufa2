export const colors = {
  // Brand Colors - More saturated and vibrant
  primary: '#10B981',      // Emerald 500 (Vibrant Green)
  primaryDark: '#059669',  // Emerald 600
  primaryLight: '#D1FAE5', // Emerald 100
  secondary: '#0F172A',    // Slate 900
  accent: '#F59E0B',       // Amber 500 (Energetic Orange/Yellow)
  
  // Backgrounds
  background: '#F8FAFC',   // Slate 50 (Cleaner white/blue)
  backgroundAlt: '#F1F5F9', // Slate 100
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  
  // Text
  textPrimary: '#0F172A',  // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8',    // Slate 400
  textLight: '#FFFFFF',
  textDark: '#020617',
  textPlaceholder: '#94A3B8',
  
  // Semantic
  success: '#10B981',      // Emerald 500
  successSoft: '#DCFCE7',
  warning: '#F59E0B',      // Amber 500
  warningSoft: '#FEF3C7',
  danger: '#EF4444',       // Red 500
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',         // Blue 500
  infoSoft: '#DBEAFE',
  
  // Specialized
  finance: '#F59E0B',      // Amber
  clients: '#06B6D4',      // Cyan
  expenses: '#F43F5E',     // Rose
  whatsapp: '#22C55E',     // Green 500
  
  // UI Elements
  border: '#E2E8F0',       // Slate 200
  borderDark: '#CBD5E1',   // Slate 300
  divider: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.65)',
  overlaySoft: 'rgba(15, 23, 42, 0.45)',
  
  // Alpha Helpers
  whiteAlpha10: 'rgba(255,255,255,0.1)',
  whiteAlpha12: 'rgba(255,255,255,0.12)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha18: 'rgba(255,255,255,0.18)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  whiteAlpha60: 'rgba(255,255,255,0.6)',
  whiteAlpha80: 'rgba(255,255,255,0.8)',
  
  rgba00005: 'rgba(0,0,0,0.5)',
  rgba00006: 'rgba(0,0,0,0.6)',
  rgba25525525501: 'rgba(255,255,255,0.1)',
  rgba255255255018: 'rgba(255,255,255,0.18)',
  rgba25525525502: 'rgba(255,255,255,0.2)',
  rgba25525525508: 'rgba(255,255,255,0.8)',

  // Legacy Compatibility (mapping to new vibrant palette)
  headerBackground: '#0F172A',
  cardBackground: '#FFFFFF',
  onPrimary: '#F0FDF4',
  dangerBg: '#FEE2E2',
  primarySoft: '#D1FAE5',
  orange: '#F59E0B',
  blue: '#3B82F6',
  textGray: '#64748B',
  alertText: '#B45309',
  alertSoft: '#FEF3C7',
  disabledBg: '#E2E8F0',

  // Literal tokens (mapping old specific colors to new ones or keeping them as stubs)
  c10B981: '#10B981',
  c1E293B: '#1E293B',
  c3B82F6: '#3B82F6',
  cEF4444: '#EF4444',
  cFFFFFF: '#FFFFFF',
  cBFDBFE: '#DBEAFE',
  cFECACA: '#FEE2E2',
  c86EFAC: '#10B981',
  cFAFAFA: '#F8FAFC',
  c333333: '#1E293B',
  c4CAF50: '#10B981',
  cFF9800: '#F59E0B',
  cEEEEEE: '#E2E8F0',
  c555555: '#475569',
  c6B7280: '#64748B',
  cFCA5A5: '#FCA5A5',
  c6EE7B7: '#10B981',
  c9CA3AF: '#94A3B8',
  cCBD5E1: '#CBD5E1',
  cFED7AA: '#F59E0B',
  cD1FAE5: '#D1FAE5',
  cE5E7EB: '#E2E8F0',
  c374151: '#334155',
  cD1D5DB: '#D1D5DB',
  cFDE047: '#FDE047',
  cFB923C: '#F59E0B',
  cFEF3C7: '#FEF3C7',
  c475569: '#475569',
  cA7F3D0: '#10B981',
  c334155: '#334155',
  cBBF7D0: '#10B981',
  c856404: '#9A3412',
  cF9F9F9: '#F8FAFC',
  c006400: '#065F46',
  cE3F2FD: '#DBEAFE',
  c007BFF: '#3B82F6',
  cDDDDDD: '#E2E8F0',
  c666666: '#475569',
  c15803D: '#065F46',
  cF0FDF4: '#F0FDF4',
};

export type AppColors = typeof colors;
