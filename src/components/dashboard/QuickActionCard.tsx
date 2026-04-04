import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

interface QuickActionCardProps {
  label: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  onPress: () => void;
}

const QuickActionCard = ({ label, icon, iconColor, backgroundColor, onPress }: QuickActionCardProps) => {
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={28} color={iconColor} />
      <Text style={[styles.label, { color: iconColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '31%',
    minHeight: 92,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
});

export default React.memo(QuickActionCard);
