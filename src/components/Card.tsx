// src/components/Card.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

interface CardProps {
  /** Conteúdo que será envolvido pelo Card. */
  children: ReactNode;
  /** Estilos adicionais para customizar o Card (ex: padding, margin). */
  style?: StyleProp<ViewStyle>;
  /** Se deve ocupar 100% da largura do container pai (Padrão: true). */
  fullWidth?: boolean;
}

const Card = ({ children, style, fullWidth = true }: CardProps) => {
  return (
    <View style={[styles.card, fullWidth && styles.fullWidth, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  fullWidth: {
    width: '100%',
  }
});

export default Card;
