import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface HeroStatsProps {
  estufas: number;
  plantios: number;
  tarefasHoje: number;
}

const HeroStats = ({ estufas, plantios, tarefasHoje }: HeroStatsProps) => {
  const items = [
    { label: 'Estufas', value: estufas },
    { label: 'Plantios', value: plantios },
    { label: 'Tarefas Hoje', value: tarefasHoje },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.chip}>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { marginTop: 12, flexDirection: 'row', gap: 8 },
  chip: { flex: 1, backgroundColor: COLORS.whiteAlpha12, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  value: { color: COLORS.textLight, fontSize: 16, fontWeight: '800' },
  label: { color: COLORS.whiteAlpha80, fontSize: 10, marginTop: 2 },
});

export default React.memo(HeroStats);
