import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  style?: ViewStyle;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  icon?: string;
  iconColor?: string;
  onPress?: () => void;
}

const toneStyles = {
  default: { bg: COLORS.surface, value: COLORS.textPrimary, border: COLORS.border, hint: COLORS.textSecondary },
  success: { bg: COLORS.successSoft, value: COLORS.success, border: COLORS.c86EFAC, hint: COLORS.success },
  warning: { bg: COLORS.warningSoft, value: COLORS.warning, border: COLORS.cFED7AA, hint: COLORS.warning },
  danger: { bg: COLORS.dangerBg, value: COLORS.danger, border: COLORS.cFECACA, hint: COLORS.danger },
};

const MetricCard = ({ label, value, hint, style, tone = 'default', icon, iconColor, onPress }: MetricCardProps) => {
  const mode = useThemeMode();
  const palette = toneStyles[tone];
  const effectiveIconColor = iconColor || (tone === 'default' ? mode.textPrimary : palette.value);
  const cardStyle = [
    styles.card,
    {
      backgroundColor: tone === 'default' ? mode.surfaceBackground : palette.bg,
      borderColor: tone === 'default' ? mode.border : palette.border,
    },
    style,
  ];

  const content = (
    <>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: mode.textSecondary }]}>{label}</Text>
        {icon ? <MaterialCommunityIcons name={icon as any} size={18} color={effectiveIconColor} /> : null}
      </View>
      <Text style={[styles.value, { color: tone === 'default' ? mode.textPrimary : palette.value }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={[styles.hint, { color: tone === 'default' ? mode.textSecondary : palette.hint || COLORS.textSecondary }]}>{hint}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={cardStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
