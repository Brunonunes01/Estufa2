import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

interface AlertsListProps {
  titleColor: string;
  textColor: string;
  alerts: Array<{ estufa: { id: string; nome: string }; health: { level: 'ok' | 'warning' | 'critical'; reasons: string[] } }>;
  onOpenEstufa: (estufaId: string) => void;
}

const AlertsList = ({ titleColor, textColor, alerts, onOpenEstufa }: AlertsListProps) => {
  if (!alerts.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: titleColor }]}>Alertas Críticos</Text>
      {alerts.map(({ estufa, health }) => {
        const color = health.level === 'critical' ? COLORS.danger : COLORS.warning;
        const bg = health.level === 'critical' ? COLORS.dangerBg : COLORS.warningSoft;

        return (
          <TouchableOpacity
            key={estufa.id}
            style={[styles.alertBox, { backgroundColor: bg, borderColor: COLORS.border }]}
            onPress={() => onOpenEstufa(estufa.id)}
          >
            <MaterialCommunityIcons name="alert-circle" size={18} color={color} />
            <Text style={[styles.alertText, { color: textColor }]}>
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
  title: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  alertBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  alertText: { flex: 1, fontSize: 12, fontWeight: '600' },
});

export default React.memo(AlertsList);
