import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING, COLORS } from '../../constants/theme';
import MetricCard from '../ui/MetricCard';
import SectionHeading from '../ui/SectionHeading';

interface MoneyGridProps {
  totalReceber: number;
  totalRecebido: number;
  totalPagar: number;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const MoneyGrid = ({ totalReceber, totalRecebido, totalPagar }: MoneyGridProps) => (
  <View style={styles.container}>
    <SectionHeading title="Fluxo Financeiro" />
    <View style={styles.grid}>
      <MetricCard 
        tone="success" 
        label="Recebido" 
        value={currencyFormatter.format(totalRecebido)} 
        icon="cash-check"
      />
      <MetricCard 
        tone="warning" 
        label="A receber" 
        value={currencyFormatter.format(totalReceber)} 
        icon="cash-clock"
      />
      <MetricCard 
        tone="danger" 
        label="Saídas" 
        value={currencyFormatter.format(totalPagar)} 
        icon="cash-minus"
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
});

export default React.memo(MoneyGrid);
