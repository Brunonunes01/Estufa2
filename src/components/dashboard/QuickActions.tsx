import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';

interface QuickAction {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  titleColor: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
}

const QuickActions = ({ actions, titleColor, cardBg, borderColor, textColor }: QuickActionsProps) => (
  <>
    <Text style={[styles.sectionTitle, { color: titleColor }]}>Ações Rápidas</Text>
    <View style={styles.grid}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          onPress={action.onPress}
        >
          <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
          <Text style={[styles.label, { color: textColor }]}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </>
);

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.lg },
  card: { width: '48%', borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  label: { marginTop: 8, fontSize: 13, fontWeight: '800' },
});

export default React.memo(QuickActions);
