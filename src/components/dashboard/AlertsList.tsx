import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import SectionHeading from '../ui/SectionHeading';
import { useThemeMode } from '../../hooks/useThemeMode';

interface AlertsListProps {
  alerts: Array<{ estufa: { id: string; nome: string }; health: { level: 'ok' | 'warning' | 'critical'; reasons: string[] } }>;
  onOpenEstufa: (estufaId: string) => void;
}

const AlertsList = ({ alerts, onOpenEstufa }: AlertsListProps) => {
  const theme = useThemeMode();

  if (!alerts.length) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeading title="Alertas Críticos" />
      {alerts.map(({ estufa, health }) => {
        const color = health.level === 'critical' ? COLORS.danger : COLORS.warning;
        const bg = health.level === 'critical' ? COLORS.dangerBg : COLORS.warningSoft;

        return (
          <TouchableOpacity
            key={estufa.id}
            style={[styles.alertBox, { backgroundColor: bg, borderColor: theme.border }]}
            onPress={() => onOpenEstufa(estufa.id)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="alert-circle" size={18} color={color} />
            <Text style={[styles.alertText, { color: theme.textPrimary }]}>
              {estufa.nome}: {health.reasons[0]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.lg },
  alertBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  alertText: { flex: 1, fontSize: 12, fontWeight: '600' },
});

export default React.memo(AlertsList);
