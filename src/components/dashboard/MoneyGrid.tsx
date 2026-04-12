import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface MoneyGridProps {
  totalReceber: number;
  totalPagar: number;
  textColor: string;
}

const MoneyGrid = ({ totalReceber, totalPagar, textColor }: MoneyGridProps) => (
  <View style={styles.grid}>
    <View style={[styles.card, { backgroundColor: COLORS.successSoft }]}> 
      <Text style={[styles.title, { color: textColor }]}>Entradas</Text>
      <Text style={[styles.value, { color: COLORS.success }]}>R$ {totalReceber.toFixed(0)}</Text>
    </View>
    <View style={[styles.card, { backgroundColor: COLORS.dangerBg }]}> 
      <Text style={[styles.title, { color: textColor }]}>Saídas</Text>
      <Text style={[styles.value, { color: COLORS.danger }]}>R$ {totalPagar.toFixed(0)}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  card: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 12, fontWeight: '700' },
  value: { marginTop: 4, fontSize: 20, fontWeight: '900' },
});

export default React.memo(MoneyGrid);
