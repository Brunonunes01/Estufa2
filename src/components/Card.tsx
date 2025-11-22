// src/components/Card.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

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
    backgroundColor: '#fff',
    padding: 20, // Padding padrão de Material Design
    borderRadius: 12,
    marginBottom: 20,
    // Estilos de Sombra (Material Design Elevation)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  fullWidth: {
    width: '100%',
  }
});

export default Card;