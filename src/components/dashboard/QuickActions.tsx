import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SHADOWS, SPACING } from '../../constants/theme';
import SectionHeading from '../ui/SectionHeading';
import { useThemeMode } from '../../hooks/useThemeMode';

interface QuickAction {
  label: string;
  subtitle?: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

const QuickActions = ({ actions }: QuickActionsProps) => {
  const theme = useThemeMode();

  return (
    <>
      <SectionHeading title={'Ações rápidas'} />
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
            <View style={[styles.iconBadge, { backgroundColor: `${action.color}1A` }]}>
              <MaterialCommunityIcons name={action.icon as any} size={22} color={action.color} />
            </View>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{action.label}</Text>
            {action.subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{action.subtitle}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.lg },
  card: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 16,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default React.memo(QuickActions);
