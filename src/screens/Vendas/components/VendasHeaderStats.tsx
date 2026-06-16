import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { formatCurrencyBRL } from '../vendasListUtils';

interface VendasHeaderStatsProps {
  stats: any;
}

const VendasHeaderStats = ({ stats }: VendasHeaderStatsProps) => {
  return (
    <View style={styles.headerStatsRow}>
      <View style={styles.headerChip}>
        <Text style={styles.headerChipValue}>{stats.totalItens}</Text>
        <Text style={styles.headerChipLabel}>Vendas</Text>
      </View>
      <View style={styles.headerChip}>
        <Text style={styles.headerChipValue}>{stats.totalCaixas.toFixed(1)}</Text>
        <Text style={styles.headerChipLabel}>Caixas</Text>
      </View>
      <View style={styles.headerChip}>
        <Text style={styles.headerChipValue}>{formatCurrencyBRL(stats.totalValor)}</Text>
        <Text style={styles.headerChipLabel}>Total</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  headerChip: {
    flex: 1,
    backgroundColor: COLORS.whiteAlpha15,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerChipValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  headerChipLabel: {
    color: COLORS.whiteAlpha80,
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});

export default React.memo(VendasHeaderStats);
