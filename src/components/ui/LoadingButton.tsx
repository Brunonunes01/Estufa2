import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemeMode } from '../../hooks/useThemeMode';

interface LoadingButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: 'primary' | 'danger' | 'neutral';
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
  } as const;

  const current = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: current.bg,
          opacity: isDisabled ? 0.75 : 1,
          borderColor: variant === 'neutral' ? theme.border : 'transparent',
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={current.text} />
      ) : (
        <Text style={[styles.label, { color: current.text }, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default React.memo(LoadingButton);
