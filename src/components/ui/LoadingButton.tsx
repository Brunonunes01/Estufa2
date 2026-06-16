import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemeMode } from '../../hooks/useThemeMode';
import { SHADOWS } from '../../constants/theme';

interface LoadingButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: 'primary' | 'danger' | 'neutral' | 'success' | 'warning';
}

const LoadingButton = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  variant = 'primary',
}: LoadingButtonProps) => {
  const theme = useThemeMode();
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: { bg: theme.rawColors.primary, text: theme.rawColors.textLight },
    danger: { bg: theme.rawColors.danger, text: theme.rawColors.textLight },
    neutral: { bg: theme.surfaceMuted, text: theme.textPrimary },
    success: { bg: theme.rawColors.success, text: theme.rawColors.textLight },
    warning: { bg: theme.rawColors.warning, text: theme.rawColors.textLight },
  } as const;

  const current = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: current.bg,
          opacity: isDisabled ? 0.6 : 1,
          borderColor: variant === 'neutral' ? theme.border : current.bg,
          ...(variant !== 'neutral' && !isDisabled ? SHADOWS.card : {}),
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={current.text} size="small" />
      ) : (
        <Text style={[styles.label, { color: current.text }, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default React.memo(LoadingButton);

