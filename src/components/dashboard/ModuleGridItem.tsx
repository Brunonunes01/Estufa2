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
    <TouchableOpacity 
      style={[styles.item, { backgroundColor: mode.surfaceBackground, borderColor: mode.border }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={26} color={color} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: mode.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: mode.textSecondary }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={mode.border} style={styles.chevron} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  texts: { flex: 1 },
  title: { fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  chevron: { marginLeft: 4 },
});

export default React.memo(ModuleGridItem);
