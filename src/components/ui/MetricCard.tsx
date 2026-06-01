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
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
  iconColor?: string;
  onPress?: () => void;
}

const MetricCard = ({ label, value, hint, style, tone = 'default', icon, iconColor, onPress }: MetricCardProps) => {
  const mode = useThemeMode();
  
  const tonePalette = {
    default: { bg: mode.surfaceBackground, value: mode.textPrimary, border: mode.border, icon: mode.textSecondary },
    success: { bg: COLORS.successSoft, value: COLORS.success, border: COLORS.success, icon: COLORS.success },
    warning: { bg: COLORS.warningSoft, value: COLORS.warning, border: COLORS.warning, icon: COLORS.warning },
    danger: { bg: COLORS.dangerSoft, value: COLORS.danger, border: COLORS.danger, icon: COLORS.danger },
    info: { bg: COLORS.infoSoft, value: COLORS.info, border: COLORS.info, icon: COLORS.info },
  };

  const palette = tonePalette[tone];
  const effectiveIconColor = iconColor || palette.icon;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: palette.bg,
      borderColor: tone === 'default' ? mode.border : palette.bg, // Cleaner look with same-color border
    },
    style,
  ];

  const content = (
    <>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: tone === 'default' ? mode.textSecondary : palette.value, opacity: 0.8 }]}>{label}</Text>
        {icon ? <MaterialCommunityIcons name={icon as any} size={20} color={effectiveIconColor} /> : null}
      </View>
      <Text style={[styles.value, { color: palette.value }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={[styles.hint, { color: palette.value, opacity: 0.7 }]}>{hint}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={cardStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 100,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MetricCard;
