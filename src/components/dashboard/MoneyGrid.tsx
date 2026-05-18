import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../constants/theme';
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
  <>
    <SectionHeading title="Financeiro de Hoje" />
    <View style={styles.grid}>
      <MetricCard tone="success" label="Recebido" value={currencyFormatter.format(totalRecebido)} />
      <MetricCard tone="warning" label="A receber" value={currencyFormatter.format(totalReceber)} />
      <MetricCard tone="danger" label="Saídas" value={currencyFormatter.format(totalPagar)} />
    </View>
  </>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8, marginBottom: SPACING.lg },
});

export default React.memo(MoneyGrid);
