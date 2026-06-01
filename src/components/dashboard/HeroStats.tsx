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
    { label: 'Estufas', value: estufas, icon: 'greenhouse' },
    { label: 'Plantios', value: plantios, icon: 'sprout' },
    { label: 'Tarefas', value: tarefasHoje, icon: 'calendar-check' },
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
  row: { marginTop: 16, flexDirection: 'row', gap: 12 },
  chip: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderRadius: 16, 
    paddingVertical: 14, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  value: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
});

export default React.memo(HeroStats);
