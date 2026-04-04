import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';

interface ModuleGridItemProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
}

const ModuleGridItem = ({ title, subtitle, icon, color, onPress }: ModuleGridItemProps) => {
  const mode = useThemeMode();

  return (
    <TouchableOpacity style={[styles.item, { backgroundColor: mode.surfaceBackground, borderColor: mode.border }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconBox, { backgroundColor: color + '14' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: mode.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: mode.textSecondary }]}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    width: '48%',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  texts: { flex: 1 },
  title: { fontSize: TYPOGRAPHY.body, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
});

export default React.memo(ModuleGridItem);
