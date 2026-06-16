import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../../constants/theme';

interface DashboardWizardButtonProps {
  label: string;
  onPress: () => void;
}

const DashboardWizardButton = ({ label, onPress }: DashboardWizardButtonProps) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <MaterialCommunityIcons name="magic-staff" size={24} color="#FFFFFF" />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 12,
    marginBottom: 20,
    elevation: 4,
    ...SHADOWS.floating,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});

export default React.memo(DashboardWizardButton);
