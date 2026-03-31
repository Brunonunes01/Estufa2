import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  style?: ViewStyle;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneStyles = {
  default: { bg: COLORS.surface, value: COLORS.textPrimary, border: COLORS.border },
  success: { bg: COLORS.successSoft, value: COLORS.success, border: COLORS.c86EFAC },
  warning: { bg: COLORS.warningSoft, value: COLORS.warning, border: COLORS.cFED7AA },
  danger: { bg: COLORS.dangerBg, value: COLORS.danger, border: COLORS.cFECACA },
};

const MetricCard = ({ label, value, hint, style, tone = 'default' }: MetricCardProps) => {
  const palette = toneStyles[tone];

  return (
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: palette.value }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 92,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  value: {
    marginTop: 6,
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '800',
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default MetricCard;
